# Phase 29: Action Bar & Personal Storage - Research

**Researched:** 2026-02-18
**Domain:** React HUD, Zustand, dnd-kit drag-to-hotbar, NestJS storage service, localStorage persistence
**Confidence:** HIGH

---

## Summary

Phase 29 adds two features on top of the fully-built Phase 28 equipment system: (1) an 8-slot consumable hotbar embedded in the HUD that uses number-key shortcuts to fire `inventory:use` events, and (2) a personal storage panel backed by the `player_storage` DB table which already exists in schema and has Drizzle query helpers.

The codebase is mature and well-patterned. The inventory event pipeline (`inventory:update` → `inventoryStore` → React render) is clean and private to the client socket. Drag-and-drop is already wired in `GameUI.tsx` via `@dnd-kit/core` `DndContext`. The hotbar must be added as an additional droppable target inside that existing context — no new DnD library needed. All socket emit patterns, CSS variables, keyboard-disable integration with Phaser, and the `ui-panel` CSS class are established and must be followed exactly.

The personal storage panel requires one new `StorageService` on the game-server, two new WebSocket events (`storage:open` / `storage:update`), and a client-side `storageStore.ts` (separate from `inventoryStore` so it does not trigger Phaser re-renders). The `player_storage` DB table and all Drizzle query helpers (`getOrCreatePlayerStorage`, `updatePlayerStorage`) are already exported from `@into-the-void/database`.

**Primary recommendation:** Extend the existing `DndContext` in `GameUI.tsx` to accept drops onto hotbar slots, store slot assignments in `localStorage`, and add a new `StorageService` on the server that mirrors the `InventoryService` pattern exactly.

---

## Standard Stack

### Core (all already installed in the monorepo)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.2.0 | Component rendering | Project standard |
| Zustand | ^4.5.0 | Client state stores | Project standard; `inventoryStore` already uses it |
| zustand/middleware/immer | bundled | Immer integration | Already used in `inventoryStore.ts` |
| `@dnd-kit/core` | ^6.3.1 | Drag-and-drop context | Already installed; `DndContext` already in `GameUI.tsx` |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable items | Already used in `InventoryPanel.tsx` |
| `@floating-ui/react` | ^0.27.18 | Item tooltips | Already used in `ItemTooltip.tsx` |
| socket.io-client | ^4.7.0 | WebSocket events | Singleton `gameSocket` already handles all events |
| NestJS | ^10.3.0 | Game server services | `InventoryService` pattern to mirror |
| Drizzle ORM | ^0.30.0 | DB queries | `getOrCreatePlayerStorage`, `updatePlayerStorage` already exported |
| Plain CSS + CSS variables | — | Styling | Project standard; no Tailwind, no CSS-in-JS |

### No New Dependencies Needed

All required libraries are already in the monorepo `package.json`. No `pnpm install` step is required for Phase 29.

---

## Architecture Patterns

### Recommended File Layout for Phase 29

```
apps/web/src/
├── store/
│   ├── inventoryStore.ts       # EXISTING — do not modify action bar logic into this
│   ├── actionBarStore.ts       # NEW — hotbar slot assignments (localStorage-backed)
│   └── storageStore.ts         # NEW — personal storage state (socket-backed)
├── ui/
│   ├── hud/
│   │   ├── HUD.tsx             # MODIFY — embed ActionBar component
│   │   ├── HUD.css             # MODIFY — add hotbar slot CSS
│   │   ├── ActionBar.tsx       # NEW — 8-slot hotbar with keydown handler
│   │   └── ActionBar.css       # NEW
│   └── panels/
│       ├── PersonalStoragePanel.tsx  # NEW
│       └── PersonalStoragePanel.css  # NEW
├── GameUI.tsx                  # MODIFY — add PersonalStoragePanel mount point, extend handleDragEnd

apps/game-server/src/
├── game/
│   ├── game.gateway.ts         # MODIFY — add storage:open handler
│   ├── game.module.ts          # MODIFY — register StorageService
│   ├── storage.service.ts      # NEW — mirrors InventoryService pattern
│   └── game.service.ts         # no change needed
```

### Pattern 1: Separate Zustand Store for Action Bar (localStorage-backed)

The hotbar stores instance-ID references to inventory items, NOT slot-position references. References become stale when `inventory:update` arrives and the referenced `instanceId` is no longer in `inventory.items`. The store must self-invalidate on every `inventory:update`.

```typescript
// Source: codebase pattern from inventoryStore.ts + localStorage persistence
// apps/web/src/store/actionBarStore.ts

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useInventoryStore } from './inventoryStore';

const STORAGE_KEY = 'action_bar_assignments';
const SLOT_COUNT = 8;

type Slots = (string | null)[]; // instanceId or null

interface ActionBarState {
  slots: Slots;                                       // length always 8
  assign: (slotIndex: number, instanceId: string) => void;
  unassign: (slotIndex: number) => void;
  invalidateOrphans: (activeInstanceIds: Set<string>) => void;
}

function loadFromStorage(): Slots {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return Array(SLOT_COUNT).fill(null);
    const parsed = JSON.parse(raw) as (string | null)[];
    // Normalize length
    const result: Slots = Array(SLOT_COUNT).fill(null);
    for (let i = 0; i < SLOT_COUNT; i++) {
      result[i] = parsed[i] ?? null;
    }
    return result;
  } catch {
    return Array(SLOT_COUNT).fill(null);
  }
}

function saveToStorage(slots: Slots): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}

export const useActionBarStore = create<ActionBarState>()(
  immer((set) => ({
    slots: loadFromStorage(),

    assign: (slotIndex, instanceId) =>
      set((state) => {
        state.slots[slotIndex] = instanceId;
        saveToStorage(state.slots);
      }),

    unassign: (slotIndex) =>
      set((state) => {
        state.slots[slotIndex] = null;
        saveToStorage(state.slots);
      }),

    invalidateOrphans: (activeInstanceIds) =>
      set((state) => {
        let changed = false;
        for (let i = 0; i < SLOT_COUNT; i++) {
          const id = state.slots[i];
          if (id !== null && !activeInstanceIds.has(id)) {
            state.slots[i] = null;
            changed = true;
          }
        }
        if (changed) saveToStorage(state.slots);
      }),
  }))
);

// Wire to inventory:update — invalidate stale references every time inventory changes
// This listener runs AFTER inventoryStore.setInventory so it reads fresh state
useInventoryStore.subscribe((inventoryState) => {
  const inv = inventoryState.inventory;
  if (!inv) return;
  const activeIds = new Set(inv.items.map((item) => item.instanceId));
  useActionBarStore.getState().invalidateOrphans(activeIds);
});
```

**Critical:** The `useInventoryStore.subscribe` call at module level guarantees orphan invalidation on every `inventory:update` without any component mount dependency.

### Pattern 2: ActionBar Component with document-level keydown Guard

The keydown listener must be attached to `document` (not a React element) so it fires regardless of focus. It must NOT fire when the chat input is focused (the user is typing in chat). Use `document.activeElement` tag name check as the chat-focus guard.

```typescript
// apps/web/src/ui/hud/ActionBar.tsx
// Source: established codebase pattern (InventoryPanel.tsx keyboard disable + ChatPanel.tsx input pattern)

import React, { useEffect } from 'react';
import { useActionBarStore } from '../../store/actionBarStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { gameSocket } from '../../network/socket';
import { ItemRegistry } from '@into-the-void/items';
import { ItemTooltip } from '../../components/ItemTooltip';
import { RARITY_COLORS } from '../constants';
import './ActionBar.css';

export const ActionBar: React.FC = () => {
  const { slots } = useActionBarStore();
  const { inventory } = useInventoryStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Chat-focus guard: do not fire if user is typing in an input or textarea
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const slotIndex = parseInt(e.key, 10) - 1; // key '1' → index 0
      if (slotIndex < 0 || slotIndex > 7) return;
      if (e.repeat) return; // Ignore held key

      const instanceId = slots[slotIndex];
      if (!instanceId) return;

      // Verify item is still in inventory before emitting
      const item = inventory?.items.find((i) => i.instanceId === instanceId);
      if (!item) return;

      gameSocket.emit('inventory:use', { instanceId });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [slots, inventory]);

  // Build display items
  const slotItems = slots.map((instanceId) => {
    if (!instanceId || !inventory) return null;
    const invItem = inventory.items.find((i) => i.instanceId === instanceId);
    if (!invItem) return null;
    const itemDef = ItemRegistry.get(invItem.itemId);
    return { invItem, itemDef };
  });

  return (
    <div className="hotbar">
      {slots.map((instanceId, i) => {
        const data = slotItems[i];
        const isEmpty = !data;
        const keyLabel = String(i + 1);

        return (
          <div
            key={i}
            className={`hotbar-slot ${isEmpty ? 'hotbar-slot--empty' : 'hotbar-slot--filled'}`}
            data-slot={i} // Used by DndContext droppable id resolution in GameUI
          >
            <span className="hotbar-key">{keyLabel}</span>
            {data && (
              <ItemTooltip item={data.itemDef}>
                <div
                  className="hotbar-item-icon"
                  style={{
                    backgroundColor: `#${data.itemDef.color.toString(16).padStart(6, '0')}`,
                    borderColor: RARITY_COLORS[data.itemDef.rarity],
                  }}
                />
              </ItemTooltip>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

### Pattern 3: Extending GameUI DndContext for Hotbar Drop

The existing `DndContext` in `GameUI.tsx` must handle drops onto hotbar slots. Hotbar droppable IDs use `hotbar-N` prefix (analogous to `equip-` prefix for equipment slots).

```typescript
// MODIFY apps/web/src/ui/GameUI.tsx — extend handleDragEnd

const handleDragEnd = (event: DragEndEvent) => {
  const pendingReorder = useInventoryStore.getState().pendingReorder;
  if (pendingReorder) return;
  const { active, over } = event;
  if (!over) return;

  const overId = String(over.id);
  const activeId = String(active.id);  // instanceId being dragged

  // Dropped on equipment slot
  if (overId.startsWith('equip-')) {
    gameSocket.emit('equipment:change', { instanceId: activeId });
    return;
  }

  // Dropped on hotbar slot
  if (overId.startsWith('hotbar-')) {
    const slotIndex = parseInt(overId.replace('hotbar-', ''), 10);
    if (!isNaN(slotIndex) && slotIndex >= 0 && slotIndex < 8) {
      useActionBarStore.getState().assign(slotIndex, activeId);
    }
    return;
  }

  // Inventory reorder (existing logic)
  const inventory = useInventoryStore.getState().inventory;
  if (!inventory) return;
  const fromItem = inventory.items.find(i => i.instanceId === activeId);
  const toItem = inventory.items.find(i => i.instanceId === overId);
  if (fromItem && toItem && activeId !== overId) {
    useInventoryStore.getState().setPendingReorder(true);
    gameSocket.emit('inventory:reorder', { fromSlot: fromItem.slot, toSlot: toItem.slot });
  }
};
```

Each hotbar slot must be a `useDroppable` target with `id="hotbar-{index}"` matching the prefix above.

### Pattern 4: Personal Storage Store (separate from inventoryStore)

```typescript
// apps/web/src/store/storageStore.ts
// Source: inventoryStore.ts pattern

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { gameSocket } from '../network/socket';

export interface StorageItem {
  instanceId: string;
  itemId: string;
  quantity: number;
  slot: number;
  properties: Record<string, unknown>;
}

export interface PersonalStorage {
  characterId: string;
  items: StorageItem[];
  maxSlots: number;
}

interface StorageState {
  storage: PersonalStorage | null;
  setStorage: (s: PersonalStorage) => void;
  clearStorage: () => void;
}

export const useStorageStore = create<StorageState>()(
  immer((set) => ({
    storage: null,
    setStorage: (s) => set((state) => { state.storage = s; }),
    clearStorage: () => set((state) => { state.storage = null; }),
  }))
);

// Wire socket event
gameSocket.on('storage:update', (storage: PersonalStorage) => {
  useStorageStore.getState().setStorage(storage);
});
```

### Pattern 5: StorageService on game-server (mirrors InventoryService)

```typescript
// apps/game-server/src/game/storage.service.ts
// Source: inventory.service.ts pattern

import { Injectable } from '@nestjs/common';
import {
  getOrCreatePlayerStorage,
  updatePlayerStorage,
} from '@into-the-void/database';
import type { PlayerStorage, InventoryItemJson } from '@into-the-void/database';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class StorageService {
  // In-memory cache: characterId → PlayerStorage
  private cache: Map<string, PlayerStorage> = new Map();

  constructor(private readonly databaseService: DatabaseService) {}

  async loadForPlayer(characterId: string): Promise<PlayerStorage> {
    const db = this.databaseService.getClient();
    const storage = await getOrCreatePlayerStorage(db, characterId);
    this.cache.set(characterId, storage);
    return storage;
  }

  getStorage(characterId: string): PlayerStorage | undefined {
    return this.cache.get(characterId);
  }

  async flushAndUnload(characterId: string): Promise<void> {
    const storage = this.cache.get(characterId);
    if (!storage) return;
    const db = this.databaseService.getClient();
    await updatePlayerStorage(db, characterId, storage.items);
    this.cache.delete(characterId);
  }

  async moveItem(
    characterId: string,
    instanceId: string,
    toSlot: number
  ): Promise<{ success: boolean; reason?: string }> {
    const storage = this.cache.get(characterId);
    if (!storage) return { success: false, reason: 'Storage not loaded' };
    const item = storage.items.find((i) => i.instanceId === instanceId);
    if (!item) return { success: false, reason: 'Item not found' };
    item.slot = toSlot;
    const db = this.databaseService.getClient();
    await updatePlayerStorage(db, characterId, storage.items);
    return { success: true };
  }
}
```

### Pattern 6: New WebSocket Events for Storage

Two new events must be added to the shared-types event maps:

```typescript
// MODIFY packages/shared-types/src/network/events.ts

// Add to ClientEventType:
| 'storage:open'

// Add to ServerEventType:
| 'storage:update'

// Add to ClientEvents interface:
'storage:open': Record<string, never>;

// Add to ServerEvents interface:
'storage:update': PersonalStorage;  // where PersonalStorage matches storageStore shape
```

And register `storage:update` in the `gameSocket.ts` server events list.

### Pattern 7: GameUI Toggle Wiring for Personal Storage

Follow the exact pattern used by `showInventory` and `showEquipment` in `gameStore.ts`:

```typescript
// MODIFY apps/web/src/store/gameStore.ts — add:
showStorage: boolean;
toggleStorage: () => void;

// In create():
showStorage: false,
toggleStorage: () => set((state) => ({ showStorage: !state.showStorage })),
```

In `GameUI.tsx`, add `{showStorage && <PersonalStoragePanel />}` alongside existing panels.

### Anti-Patterns to Avoid

- **Storing slot-position references in hotbar:** Use `instanceId` only. Inventory reorders change slot numbers; instance IDs are stable.
- **Putting hotbar state in `gameStore`:** This causes Phaser canvas re-renders on every hotbar assignment. Use a dedicated `actionBarStore`.
- **Putting storage state in `inventoryStore`:** They are separate stores with separate socket events.
- **Broadcasting `storage:update` to zone room:** Use `client.emit()` exclusively — storage is private per player.
- **Attaching keydown to a React element:** Must be on `document` for global capture before the game canvas consumes it.
- **Emitting `inventory:use` without verifying item is in inventory:** The key handler must confirm the `instanceId` is still present before emitting.
- **Loading storage eagerly on login:** Load storage lazily on first `storage:open` event only (keeps startup cost low for players who never open storage).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-to-hotbar | Custom mouse event tracking | `@dnd-kit/core` `useDroppable` in existing `DndContext` | DnD already wired; droppable `id` prefix convention is sufficient |
| Item tooltip in hotbar slot | Custom hover tooltip | Existing `ItemTooltip` component (`@floating-ui/react`) | Already built with portal, flip, shift middleware |
| Storage DB queries | Custom SQL or ORM calls | `getOrCreatePlayerStorage`, `updatePlayerStorage` from `@into-the-void/database` | Already exported, tested via Phase 28 pattern |
| Hotbar CSS theming | Custom color vars | Existing CSS variables (`--color-bg-secondary`, `--color-accent`, etc.) | Design system already established |
| Chat-focus guard | Focus state tracking | `document.activeElement.tagName` check | Simplest reliable approach; no state needed |
| Keyboard disable for storage panel | Custom key capture | `worldScene.setKeyboardEnabled(false)` in `useEffect` | Exact pattern used by `InventoryPanel` and `EquipmentPanel` |

**Key insight:** Every non-trivial piece of infrastructure (DnD context, socket singleton, DB query helpers, tooltip, CSS variables, keyboard disable) already exists. Phase 29 is entirely wiring new components into established patterns.

---

## Common Pitfalls

### Pitfall 1: Keydown Fires While Typing in Chat

**What goes wrong:** Player types "1" in chat input; game uses hotbar slot 1 simultaneously.
**Why it happens:** `document`-level listener fires for all keydown events regardless of focus.
**How to avoid:** Check `document.activeElement?.tagName` before processing — skip if `INPUT` or `TEXTAREA`.
**Warning signs:** Accidental item use when chat panel is open and player types numbers.

### Pitfall 2: Stale hotbar Reference After Inventory Mutation

**What goes wrong:** Hotbar slot still shows item after it was consumed or dropped. Pressing the key silently fails (or worse, uses a different item if slot IDs were recycled).
**Why it happens:** Hotbar stores `instanceId`; if store doesn't self-invalidate on `inventory:update`, the reference is orphaned.
**How to avoid:** `useInventoryStore.subscribe` at module level in `actionBarStore.ts` calls `invalidateOrphans` on every inventory update.
**Warning signs:** Slot shows item icon but key press has no effect.

### Pitfall 3: Phaser Canvas Re-renders from Wrong Store Placement

**What goes wrong:** Every hotbar assignment triggers a canvas repaint cycle because Phaser game instance is stored in `gameStore`.
**Why it happens:** Any state change in `gameStore` triggers all subscribers, including Phaser-aware ones.
**How to avoid:** `actionBarStore` and `storageStore` must be completely separate from `gameStore`. The `Game` instance must never be touched from these stores.
**Warning signs:** Frame drop or canvas flicker when dragging to hotbar.

### Pitfall 4: Drag-to-hotbar Conflict with Inventory Reorder

**What goes wrong:** Dragging an inventory item and releasing over a hotbar slot triggers both the hotbar assignment AND an inventory reorder attempt.
**Why it happens:** `handleDragEnd` checks `over.id` in order; if hotbar check comes after reorder check, both paths execute.
**How to avoid:** Use early `return` after the `hotbar-` prefix match in `handleDragEnd`. Check hotbar BEFORE inventory reorder.
**Warning signs:** Item moves position in inventory unexpectedly after hotbar drag.

### Pitfall 5: Storage Loaded Too Early (Before Auth)

**What goes wrong:** `storage:open` handler fires before player is authenticated; `player` is null; service lookup fails.
**Why it happens:** Client emits events before auth completes.
**How to avoid:** Server handler must call `playerService.getPlayerBySocket(client.id)` and return early if player is null — same guard used in all other gateway handlers.
**Warning signs:** `NullPointerException` or silent failure on first storage open.

### Pitfall 6: `gameSocket.on` Handler Not Registered for `storage:update`

**What goes wrong:** Server sends `storage:update` but client silently drops it; storage panel stays empty.
**Why it happens:** `socket.ts` only dispatches events in its explicit `serverEvents` array.
**How to avoid:** Add `'storage:update'` to the `serverEvents` array in `socket.ts`. Also add `'storage:update'` to `ServerEventType` and `ServerEvents` in shared-types.
**Warning signs:** `storageStore.storage` remains `null` after server sends data.

---

## Code Examples

### Existing: How Inventory Update Wiring Works
```typescript
// Source: apps/web/src/store/inventoryStore.ts (lines 38-40)
// Wire socket event: update inventory state on server push
gameSocket.on('inventory:update', (inventory: Inventory) => {
  useInventoryStore.getState().setInventory(inventory);
});
```
Follow this exact pattern for `storage:update` in `storageStore.ts`.

### Existing: How InventoryPanel Disables Phaser Keyboard
```typescript
// Source: apps/web/src/ui/panels/InventoryPanel.tsx (lines 77-91)
useEffect(() => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    worldScene.setKeyboardEnabled(false);
  }
  return () => {
    const game = useGameStore.getState().game;
    const worldScene = game?.getWorldScene();
    if (worldScene) {
      worldScene.setKeyboardEnabled(true);
    }
  };
}, []);
```
Copy this into `PersonalStoragePanel.tsx` verbatim.

### Existing: How Equipment Droppable Prefix Works in DndContext
```typescript
// Source: apps/web/src/ui/GameUI.tsx (lines 39-43)
// Dropped on equipment slot — emit equip
if (overId.startsWith('equip-')) {
  gameSocket.emit('equipment:change', { instanceId: activeId });
  return;
}
```
Follow this prefix pattern for `hotbar-` droppable IDs.

### Existing: How GameGateway Guards Against Unauthenticated Requests
```typescript
// Source: apps/game-server/src/game/game.gateway.ts (lines 379-382)
const player = this.playerService.getPlayerBySocket(client.id);
if (!player) return;
```
Every new `@SubscribeMessage` handler in the gateway must start with this guard.

### Existing: How InventoryService Caches and Persists
```typescript
// Source: apps/game-server/src/game/inventory.service.ts (lines 23-38)
async loadForPlayer(playerId: string): Promise<Inventory> {
  const db = this.databaseService.getClient();
  let inventory = await getInventory(db, playerId);
  if (!inventory) {
    inventory = await createInventory(db, { characterId: playerId, ... });
  }
  this.inventories.set(playerId, inventory);
  return inventory;
}
```
`StorageService.loadForPlayer` uses `getOrCreatePlayerStorage` instead, same caching shape.

### Existing: DB Queries for Personal Storage (already exported)
```typescript
// Source: packages/database/src/queries/storage.ts + packages/database/src/index.ts
import {
  getOrCreatePlayerStorage,
  updatePlayerStorage,
  getPlayerStorage,
} from '@into-the-void/database';
```
No new DB query functions needed.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Hotbar tied to slot positions | Hotbar uses instance IDs only | Survives inventory reorders; auto-invalidates on `inventory:update` |
| Storage state in gameStore | Dedicated storageStore | Prevents Phaser re-renders on storage changes |
| Global keydown without guard | Chat-focus guard via `document.activeElement` | Prevents accidental item use while typing |
| Storage DB table separate from Phase 28 | `player_storage` table already migrated in Phase 25-ish research | No new migration needed |

---

## Open Questions

1. **Does `player_storage` table exist in the actual DB migration files?**
   - What we know: Schema file `packages/database/src/schema/storage.ts` exists and defines `playerStorage` table. Queries are exported. But migration files were not verified.
   - What's unclear: Whether `pnpm db:migrate` has been run with the storage schema included, or if storage was added in schema only.
   - Recommendation: Planner should include a task step to verify/run `pnpm db:push` or check migration state before server-side work begins.

2. **Should `storage:move` (rearranging items within storage) be in scope for Phase 29?**
   - What we know: Phase description mentions "separate personal storage panel" and success criterion is "items stored there persist across sessions." The plans mention only `PersonalStoragePanel.tsx`.
   - What's unclear: Whether items can be dragged within the storage grid (reorder) or just viewed.
   - Recommendation: Treat storage as read-only grid in Phase 29 (no intra-storage reorder). Reordering can be deferred. This matches the success criteria strictly.

3. **Should items be transferable between inventory and personal storage via drag?**
   - What we know: Success criterion says "items stored there are separate from inventory." No transfer event is mentioned in the phase requirements.
   - What's unclear: Whether the storage is view-only or allows deposit/withdrawal in Phase 29.
   - Recommendation: Phase 29 scope is view-only for the panel (player can see stored items); full deposit/withdrawal requires new `storage:deposit` and `storage:withdraw` events and can be planned as Phase 30 work. Confirm with planner.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `apps/web/src/store/inventoryStore.ts` — Zustand store pattern, `inventory:update` wiring
- `apps/web/src/store/gameStore.ts` — `showInventory`/`showEquipment` toggle pattern, `game` instance placement
- `apps/web/src/ui/GameUI.tsx` — Existing `DndContext`, `handleDragEnd`, droppable prefix convention
- `apps/web/src/ui/hud/HUD.tsx` — Current HUD structure, `.hud-bottom` placement
- `apps/web/src/ui/panels/InventoryPanel.tsx` — Keyboard disable pattern, sortable slot pattern
- `apps/web/src/ui/panels/EquipmentPanel.tsx` — `useDroppable` pattern, keyboard disable
- `apps/web/src/ui/panels/ChatPanel.tsx` — Chat input structure (confirms `INPUT` tag for guard)
- `apps/web/src/network/socket.ts` — `serverEvents` array, `emit` and `on` patterns
- `apps/game-server/src/game/game.gateway.ts` — All existing handlers, player null guard pattern
- `apps/game-server/src/game/inventory.service.ts` — Cache+persist pattern to mirror
- `apps/game-server/src/game/game.module.ts` — Module provider registration pattern
- `packages/database/src/schema/storage.ts` — `playerStorage` table definition
- `packages/database/src/queries/storage.ts` — `getOrCreatePlayerStorage`, `updatePlayerStorage`
- `packages/database/src/index.ts` — Storage queries confirmed exported
- `packages/shared-types/src/network/events.ts` — Current event maps
- `package.json` (root) — All dependency versions confirmed

### Secondary (MEDIUM confidence)

- `apps/web/src/styles/global.css` — CSS variable names and `.ui-panel` class confirmed
- `apps/web/src/ui/constants.ts` — `RARITY_COLORS` confirmed
- `apps/web/src/components/ItemTooltip.tsx` — `ItemTooltip` component API confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries verified in root `package.json`
- Architecture patterns: HIGH — All patterns derived from direct codebase inspection; no guesswork
- Pitfalls: HIGH — Derived from existing code constraints (keyboard guard confirmed by ChatPanel, orphan invalidation confirmed by Phase 28 prior decisions)
- Open questions: LOW confidence on storage migration state — needs runtime verification

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (30 days; stable codebase, no fast-moving dependencies)
