# Phase 27: Client State & Inventory Panel UI - Research

**Researched:** 2026-02-17
**Domain:** React UI, Zustand state management, dnd-kit drag-and-drop, @floating-ui/react tooltips, Phaser keyboard integration
**Confidence:** HIGH (core stack), MEDIUM (dnd-kit new vs old API), HIGH (codebase patterns)

---

## Summary

Phase 27 builds the inventory UI on top of Phase 26's `inventory:update` socket event. The codebase already has `showInventory` state in `gameStore` and a toggle button in HUD, but no `InventoryPanel` component or `inventoryStore` exists. The server side has `inventory:drop` and `inventory:use` endpoints but **no slot-reorder endpoint** — this must be added.

The standard stack is: Zustand 4.5.7 (already installed, needs `immer` peer dependency added) + `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` + `@floating-ui/react@~0.27.18`. Note: `@dnd-kit/react` (version 0.3.0) is a new experimental package in active development — the phase plan uses `dnd-kit` generically and the stable `@dnd-kit/core` + `@dnd-kit/sortable` combination is the correct choice given the experimental status of `@dnd-kit/react`.

The most critical architectural decision: **drag-reorder must NOT be optimistic** (per success criteria SC-3). The client emits `inventory:reorder` and only re-renders after `inventory:update` comes back from the server. This requires: (1) adding a new `inventory:reorder` event to shared-types ClientEvents and ServerEvents, (2) implementing the handler in the game gateway and inventory service, (3) the client store holding a "pending reorder" flag to block further drags during round-trip.

**Primary recommendation:** Use `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` with a separate `inventoryStore.ts` (Zustand + immer), `@floating-ui/react` for tooltips, and disable Phaser keyboard via `this.input.keyboard.enabled = false` when inventory opens.

---

## User Constraints

No CONTEXT.md exists. All decisions below are research-derived from the phase plan and prior decisions stated in the phase context.

### Locked Decisions (from Phase Context)
- `inventoryStore.ts` MUST be a separate Zustand store from `gameStore` — inventory changes must not trigger Phaser canvas re-renders (v1.6 research decision)
- Action bar uses instance-ID references, not slot-position references; stale references auto-invalidate on every `inventory:update` (v1.6 research decision)
- Use `dnd-kit` for drag-drop (phase plan specifies)
- Use `@floating-ui/react` for tooltips (phase plan specifies)
- Use Zustand + Immer middleware for `inventoryStore` (phase plan specifies)
- No optimistic reorder — wait for server confirmation before updating UI (success criterion SC-3)

### Rarity Color System (UI-06, locked from requirements)
- Common = gray
- Rare = blue
- Epic = purple
- Exotic = orange
- Legendary = gold

### Deferred (OUT OF SCOPE)
- Equipment panel / exosuit UI
- Module slot UI
- Accessory slot UI
- Action bar slot assignment

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 4.5.7 (installed) | Inventory state management | Already used for gameStore, authStore, characterStore |
| immer | ^10.0.0 (needs install) | Mutable-style updates in Zustand | Zustand middleware/immer.js is present but peer dependency `immer` package is not installed |
| @dnd-kit/core | ^6.3.1 | Drag-and-drop context, sensors | Stable package, well-documented, React 18 compatible |
| @dnd-kit/sortable | ^10.0.0 | Sortable grid preset (SortableContext, useSortable) | Built on @dnd-kit/core, handles grid reordering |
| @dnd-kit/utilities | ^3.2.2 | CSS.Transform.toString utility | Required for transform-to-CSS conversion |
| @floating-ui/react | ^0.27.18 | Tooltip positioning with FloatingPortal | Active maintenance (published 12h ago as of research date), flip/shift middleware |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @into-the-void/items | workspace | ItemRegistry.get(itemId) for ItemDefinition | Resolving displayName, description, rarity, ilvl, requiredLevel from InventoryItem.itemId |
| @into-the-void/shared-types | workspace | InventoryItem, Inventory, ItemRarity, ClientEvents | All shared types for inventory state |
| react | ^18.2.0 (installed) | UI framework | Already used |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core + @dnd-kit/sortable | @dnd-kit/react@0.3.0 | @dnd-kit/react is experimental (closed as "workaround found"), API not stable, no production guidance |
| @floating-ui/react | custom tooltip | Custom tooltips break on panel edges, require manual positioning math — solved by floating-ui's flip+shift middleware |
| immer middleware | plain Zustand set | Immer simplifies array mutations (splice, push) for inventory items; particularly useful for slot reorder operations |

**Installation:**
```bash
pnpm add immer @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @floating-ui/react
```

---

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── store/
│   ├── gameStore.ts          # Existing - showInventory toggle lives here
│   └── inventoryStore.ts     # NEW - inventory state, socket wiring
├── ui/
│   ├── panels/
│   │   ├── ChatPanel.tsx     # Existing pattern to follow
│   │   ├── ChatPanel.css
│   │   ├── InventoryPanel.tsx  # NEW - 20-slot dnd-kit grid
│   │   └── InventoryPanel.css  # NEW
│   └── hud/
│       └── HUD.tsx           # Existing - inventory button already here
├── components/
│   └── ItemTooltip.tsx       # NEW - floating-ui tooltip component
```

For server side (new event required):
```
packages/shared-types/src/network/events.ts  # Add inventory:reorder to ClientEvents + ServerEvents
apps/game-server/src/game/
├── game.gateway.ts    # Add @SubscribeMessage('inventory:reorder') handler
└── inventory.service.ts  # Add moveSlot(fromSlot, toSlot) method
```

### Pattern 1: Separate Zustand Store (avoid gameStore re-renders)

**What:** `inventoryStore.ts` holds `Inventory | null` and socket wiring. It never subscribes to `gameStore`.
**When to use:** Always for inventory state — mixing into `gameStore` would cause the Phaser canvas (`useGameStore` subscriber) to re-render on every item pickup.

```typescript
// Source: zustand docs + immer middleware docs
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Inventory, InventoryItem } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

interface InventoryState {
  inventory: Inventory | null;
  pendingReorder: boolean;  // blocks drag while awaiting server
  setInventory: (inventory: Inventory) => void;
  setPendingReorder: (pending: boolean) => void;
}

export const useInventoryStore = create<InventoryState>()(
  immer((set) => ({
    inventory: null,
    pendingReorder: false,
    setInventory: (inventory) => set((state) => {
      state.inventory = inventory;
      state.pendingReorder = false;  // reset on every server update
    }),
    setPendingReorder: (pending) => set((state) => {
      state.pendingReorder = pending;
    }),
  }))
);

// Wire socket event outside store
gameSocket.on('inventory:update', (inventory: Inventory) => {
  useInventoryStore.getState().setInventory(inventory);
});
```

### Pattern 2: dnd-kit Sortable Grid (non-optimistic)

**What:** DndContext wraps the 20-slot grid; SortableContext with `rectSortingStrategy`; `useSortable` per slot; `onDragEnd` emits `inventory:reorder` to server and sets `pendingReorder = true`.
**When to use:** Inventory drag-drop reorder

```typescript
// Source: dndkit.com/presets/sortable/sortable-context + useSortable docs
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// SortableItem component
function SortableSlot({ instanceId, children }: { instanceId: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instanceId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// InventoryPanel onDragEnd - NON-OPTIMISTIC
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const { inventory, pendingReorder, setPendingReorder } = useInventoryStore.getState();
  if (!inventory || pendingReorder) return;  // block during pending

  const fromItem = inventory.items.find(i => i.instanceId === active.id);
  const toItem = inventory.items.find(i => i.instanceId === over.id);
  if (!fromItem || !toItem) return;

  // Emit to server — do NOT update local state yet (non-optimistic)
  setPendingReorder(true);
  gameSocket.emit('inventory:reorder', {
    fromSlot: fromItem.slot,
    toSlot: toItem.slot,
  });
  // Server will respond with inventory:update which clears pendingReorder
}
```

### Pattern 3: @floating-ui/react Tooltip

**What:** `useFloating` + `useHover` + `useFocus` + `useDismiss` + `FloatingPortal`; `flip()` + `shift()` middleware handle edge repositioning.
**When to use:** Item tooltip on hover

```typescript
// Source: floating-ui.com/docs/tooltip
import { useState } from 'react';
import {
  useFloating, autoUpdate, offset, flip, shift,
  useHover, useFocus, useDismiss, useRole, useInteractions, FloatingPortal,
} from '@floating-ui/react';

function ItemTooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(10), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>{children}</div>
      {isOpen && (
        <FloatingPortal>
          <div ref={refs.setFloating} style={floatingStyles} className="item-tooltip" {...getFloatingProps()}>
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
```

### Pattern 4: Phaser Keyboard Disable When Inventory Open

**What:** When inventory panel opens, disable Phaser keyboard input to prevent W/A/S/D and arrow keys from moving the player.
**When to use:** Any time a React UI panel with keyboard input is open

```typescript
// Source: docs.phaser.io/api-documentation/class/input-keyboard-keyboardplugin
// Method: enabled = false disables ALL keyboard input for the scene

// In inventoryStore or useEffect in InventoryPanel:
import { useGameStore } from '../store/gameStore';

// When opening:
const game = useGameStore.getState().game;
const worldScene = game?.getWorldScene();
if (worldScene) {
  (worldScene as any).input?.keyboard && ((worldScene as any).input.keyboard.enabled = false);
}

// When closing:
if (worldScene) {
  (worldScene as any).input?.keyboard && ((worldScene as any).input.keyboard.enabled = true);
}
```

Better approach: expose a `setKeyboardEnabled(enabled: boolean)` method on `WorldScene` and call it from the React component via `game.getWorldScene()?.setKeyboardEnabled(false)`.

### Pattern 5: Context Menu (Right-Click Drop)

**What:** Custom context menu using React `onContextMenu` + `event.preventDefault()` + positioned absolutely at cursor.
**When to use:** Right-click on inventory item slot

```typescript
// Source: standard React onContextMenu pattern
const [contextMenu, setContextMenu] = useState<{ x: number; y: number; instanceId: string } | null>(null);

const handleContextMenu = (e: React.MouseEvent, instanceId: string) => {
  e.preventDefault();
  setContextMenu({ x: e.clientX, y: e.clientY, instanceId });
};

// Click outside dismissal
useEffect(() => {
  const handler = () => setContextMenu(null);
  document.addEventListener('click', handler);
  return () => document.removeEventListener('click', handler);
}, []);
```

### Pattern 6: ItemRegistry Lookup for Tooltip Data

**What:** `InventoryItem` only has `instanceId`, `itemId`, `quantity`, `slot`. To display tooltip data, resolve full `ItemDefinition` from `@into-the-void/items` `ItemRegistry`.
**When to use:** Rendering tooltip content

```typescript
import { ItemRegistry } from '@into-the-void/items';

function ItemTooltipContent({ item }: { item: InventoryItem }) {
  const def = ItemRegistry.get(item.itemId);
  // def has: displayName, description, category, rarity, ilvl, requiredLevel
}
```

### Anti-Patterns to Avoid
- **Optimistic reorder:** Do NOT update `inventory.items` local state before `inventory:update` arrives — success criterion SC-3 explicitly forbids this
- **Putting inventory in gameStore:** Will cause Phaser WorldScene to re-render on every item change — use separate `inventoryStore.ts`
- **Using @dnd-kit/react (new):** This is experimental/unstable, uses `DragDropProvider` not `DndContext`; stick with `@dnd-kit/core` + `@dnd-kit/sortable`
- **Tooltip outside FloatingPortal:** Tooltip will be clipped by panel overflow:hidden; always use `FloatingPortal` to render at document body
- **Slot index mismatch:** The actual `InventoryItem` type uses `slot: number` (not `slotIndex`); the phase context incorrectly says `slotIndex`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reordering | Custom mouse event tracking | @dnd-kit/core + @dnd-kit/sortable | Touch support, keyboard accessibility, sensor abstraction, overlap detection — all solved |
| Tooltip edge repositioning | Manual viewport bounds calculation | @floating-ui/react with flip()+shift() | Handles all edge cases: right edge, bottom edge, scrolled containers |
| Tooltip scroll update | requestAnimationFrame loop | `whileElementsMounted: autoUpdate` | Handles resize and scroll automatically via ResizeObserver and IntersectionObserver |
| Mutable array updates | Spread-based splice clone | immer middleware | Prevents mistakes with array mutation patterns in sort/move operations |
| Context menu outside click | Custom event tracking | document.addEventListener('click') in useEffect | Standard pattern, one-liner cleanup |

**Key insight:** The drag-and-drop system has significant accessibility and touch complexity that dnd-kit solves. The tooltip repositioning math at viewport edges requires middleware abstractions that floating-ui has already solved.

---

## Common Pitfalls

### Pitfall 1: InventoryItem Type Field Name
**What goes wrong:** Code uses `item.slotIndex` and TypeScript error occurs.
**Why it happens:** Phase context document referenced `slotIndex` but the actual `InventoryItem` type in `packages/shared-types/src/game/inventory.ts` has `slot: number`.
**How to avoid:** Always import from `@into-the-void/shared-types` and use `item.slot`.
**Warning signs:** TypeScript error "Property 'slotIndex' does not exist on type 'InventoryItem'"

### Pitfall 2: Missing inventory:reorder Server Endpoint
**What goes wrong:** Drag-drop sends socket event that the server never handles, inventory state never updates, `pendingReorder` stays true forever.
**Why it happens:** `inventory:reorder` does NOT exist in `ClientEvents`, game gateway, or inventory service as of Phase 26.
**How to avoid:** Plan 27-01 MUST include adding `inventory:reorder` to `shared-types/network/events.ts` ClientEvents AND ServerEvents, plus the game gateway handler and inventory service method.
**Warning signs:** No server response to `inventory:reorder` emit; `pendingReorder` never resets

### Pitfall 3: Immer Peer Dependency Not Installed
**What goes wrong:** `import { immer } from 'zustand/middleware/immer'` compiles but throws at runtime: "Cannot find module 'immer'"
**Why it happens:** Zustand 4.5.7 ships `middleware/immer.js` but requires `immer` as a peer dependency — `immer` is NOT in the root `package.json` and is NOT in node_modules.
**How to avoid:** `pnpm add immer` before writing any store code that uses the immer middleware.
**Warning signs:** Runtime error about missing `immer` module despite TypeScript compiling fine

### Pitfall 4: Phaser Keyboard Not Disabled During Inventory
**What goes wrong:** Player walks while inventory is open (W/A/S/D still fires movement events).
**Why it happens:** Phaser listens to all keyboard events at the window level; React input focus doesn't stop Phaser from reading those keys.
**How to avoid:** Call `worldScene.input.keyboard.enabled = false` when inventory opens and `true` when it closes. Expose via `WorldScene.setKeyboardEnabled(enabled: boolean)` public method.
**Warning signs:** Movement events fire when pressing inventory shortcut keys while panel is open

### Pitfall 5: DndContext onDragEnd and Disabled Dragging Conflict
**What goes wrong:** A second drag starts while `pendingReorder = true` and two concurrent reorder requests reach the server.
**Why it happens:** dnd-kit doesn't have a built-in "disabled" mode for the whole context.
**How to avoid:** Use a `useMemo`-derived disabled sensor list or check `pendingReorder` at the start of `handleDragEnd` and early-return. Apply `pointer-events: none` on the grid during pending.
**Warning signs:** Multiple `inventory:reorder` events emitted before any `inventory:update` arrives

### Pitfall 6: SortableContext items Array Must Be Sorted
**What goes wrong:** Items appear to jump or animate to wrong positions during drag.
**Why it happens:** `SortableContext` requires the `items` array to contain IDs in the **same order they are rendered**. If you sort by `slot` but pass `items` in a different order, the strategy miscalculates positions.
**How to avoid:** Sort `inventory.items` by `slot` before passing to `SortableContext` AND render in the same order. `items={[...inventory.items].sort((a, b) => a.slot - b.slot).map(i => i.instanceId)}`
**Warning signs:** Drag animation goes to wrong slot; items appear to "snap back" incorrectly

### Pitfall 7: @dnd-kit/react vs @dnd-kit/core Confusion
**What goes wrong:** Developer imports `DragDropProvider` (from @dnd-kit/react) and finds no `onDragEnd` with expected shape, sortable hooks behave differently.
**Why it happens:** `@dnd-kit/react` (version 0.3.0) is a NEW experimental package with a different API from the stable `@dnd-kit/core` packages. Both exist on npm.
**How to avoid:** Install ONLY `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`. Import `DndContext` from `@dnd-kit/core` (NOT `DragDropProvider`).
**Warning signs:** `DragDropProvider` import errors, different `onDragEnd` event shape

---

## Code Examples

Verified patterns from official sources:

### inventoryStore.ts — Complete Pattern
```typescript
// Pattern from existing store files (gameStore.ts, authStore.ts) + immer middleware docs
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Inventory } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

interface InventoryState {
  inventory: Inventory | null;
  pendingReorder: boolean;
  setInventory: (inv: Inventory) => void;
  clearInventory: () => void;
  setPendingReorder: (pending: boolean) => void;
}

export const useInventoryStore = create<InventoryState>()(
  immer((set) => ({
    inventory: null,
    pendingReorder: false,
    setInventory: (inv) => set((state) => {
      state.inventory = inv;
      state.pendingReorder = false;
    }),
    clearInventory: () => set((state) => {
      state.inventory = null;
    }),
    setPendingReorder: (pending) => set((state) => {
      state.pendingReorder = pending;
    }),
  }))
);

// Socket wiring — runs once on module load (same pattern as gameStore.ts bottom)
gameSocket.on('inventory:update', (inventory: Inventory) => {
  useInventoryStore.getState().setInventory(inventory);
});
```

### InventoryPanel Slot Grid with DndContext + SortableContext
```typescript
// Source: dndkit.com/presets/sortable/sortable-context
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useInventoryStore } from '../../store/inventoryStore';

export const InventoryPanel: React.FC = () => {
  const { inventory, pendingReorder } = useInventoryStore();
  const { toggleInventory } = useGameStore();

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },  // prevents accidental drag on click
  }));

  if (!inventory) return null;

  const sortedItems = [...inventory.items].sort((a, b) => a.slot - b.slot);
  const slots = Array.from({ length: inventory.maxSlots }, (_, i) => {
    return sortedItems.find(item => item.slot === i) ?? null;
  });

  const sortableIds = sortedItems.map(i => i.instanceId);

  const handleDragEnd = (event: DragEndEvent) => {
    if (pendingReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromItem = inventory.items.find(i => i.instanceId === active.id);
    const toItem = inventory.items.find(i => i.instanceId === over.id);
    if (!fromItem || !toItem) return;
    useInventoryStore.getState().setPendingReorder(true);
    gameSocket.emit('inventory:reorder', { fromSlot: fromItem.slot, toSlot: toItem.slot });
  };

  return (
    <div className="inventory-panel ui-panel">
      <div className="inventory-header">
        <span>Inventory ({inventory.items.length}/{inventory.maxSlots})</span>
        <button onClick={toggleInventory}>&times;</button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div className="inventory-grid" style={{ pointerEvents: pendingReorder ? 'none' : 'auto' }}>
            {slots.map((item, i) =>
              item ? (
                <SortableSlot key={item.instanceId} item={item} />
              ) : (
                <div key={`empty-${i}`} className="inventory-slot inventory-slot--empty" />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
```

### Rarity Color Mapping (UI-06)
```typescript
// No existing RARITY_COLORS constant — must be defined in inventoryStore or a constants file
// Colors match UI-06 requirements
import type { ItemRarity } from '@into-the-void/shared-types';

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9d9d9d',    // gray
  rare: '#0070dd',      // blue
  epic: '#a335ee',      // purple
  exotic: '#ff8000',    // orange
  legendary: '#ff8000', // NOTE: exotic and legendary share orange? Plan says legendary=gold
  // Correct per UI-06:
  // legendary: '#e6cc80',  // gold
};

// Recommended final mapping (UI-06 compliant):
export const RARITY_COLORS_FINAL: Record<ItemRarity, string> = {
  common: '#9d9d9d',    // gray
  rare: '#0070dd',      // blue
  epic: '#a335ee',      // purple
  exotic: '#ff8000',    // orange
  legendary: '#e6cc80', // gold
};
```

### Server-Side inventory:reorder (needs to be added to Phase 27-01)
```typescript
// In packages/shared-types/src/network/events.ts — add to ClientEvents:
'inventory:reorder': { fromSlot: number; toSlot: number };

// In packages/shared-types/src/network/events.ts — add to ServerEvents:
// (server responds via inventory:update, no dedicated response event needed)

// In apps/game-server/src/game/game.gateway.ts:
@SubscribeMessage('inventory:reorder')
async handleInventoryReorder(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: ClientEvents['inventory:reorder']
) {
  const player = this.playerService.getPlayerBySocket(client.id);
  if (!player) return;
  const result = await this.inventoryService.moveSlot(
    player.characterId, data.fromSlot, data.toSlot
  );
  if (result.success && result.inventory) {
    client.emit('inventory:update', result.inventory);
  } else {
    // Reorder failed — still emit current inventory to reset client pendingReorder
    const inventory = await this.inventoryService.getInventory(player.characterId);
    if (inventory) client.emit('inventory:update', inventory);
  }
}

// In apps/game-server/src/game/inventory.service.ts:
async moveSlot(characterId: string, fromSlot: number, toSlot: number) {
  // Load, swap slot values between two items, save
  const inventory = await this.inventoryRepository.loadInventory(characterId);
  const fromItem = inventory.items.find(i => i.slot === fromSlot);
  const toItem = inventory.items.find(i => i.slot === toSlot);
  if (!fromItem) return { success: false, reason: 'fromSlot empty' };
  // Allow moving to empty slot (toItem may be undefined)
  fromItem.slot = toSlot;
  if (toItem) toItem.slot = fromSlot;
  await this.inventoryRepository.saveInventory(inventory);
  return { success: true, inventory };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd (deprecated) | @dnd-kit/core + @dnd-kit/sortable | 2021-2022 | react-beautiful-dnd is unmaintained; dnd-kit is the ecosystem standard |
| @dnd-kit/core + @dnd-kit/sortable | @dnd-kit/react (new experimental) | Late 2024 | @dnd-kit/react is 0.3.0 and experimental — do NOT use yet |
| popper.js | @floating-ui | 2021 | floating-ui is the spiritual successor, actively maintained |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Archived, do not use
- `@dnd-kit/react@0.3.0`: Experimental, not production-ready as of Feb 2026

---

## Open Questions

1. **inventory:reorder — does server need a dedicated response event or reuse inventory:update?**
   - What we know: The existing `inventory:drop` and `inventory:use` endpoints both respond with `client.emit('inventory:update', result.inventory)` — private emission
   - What's unclear: Whether the gateway should also emit `inventory:update` on reorder failure to reset `pendingReorder` (yes it should)
   - Recommendation: On both success and failure of reorder, emit `inventory:update` so client always clears `pendingReorder`. On failure, emit the current (unchanged) inventory state.

2. **Empty slot representation in the 20-slot grid**
   - What we know: `Inventory.maxSlots` is in the type, items use `slot: number` (0-indexed), items can be sparse (slot 0, slot 5, slot 12 filled with nothing in between)
   - What's unclear: Whether slots 0-19 are always rendered or only filled slots
   - Recommendation: Render all `maxSlots` positions. Map by slot index, show empty styled slot divs for unfilled positions. Empty slots should NOT be in the `SortableContext items` array (only occupied slots are sortable).

3. **Keyboard shortcut for inventory open/close**
   - What we know: HUD has a toggle button calling `toggleInventory()`. Success criterion SC-1 says "Player presses the inventory key"
   - What's unclear: Which key to use (I key? Tab? No specification in the plan)
   - Recommendation: Register `I` key in a `useEffect` on InventoryPanel's parent or in `GameUI.tsx`. Must also ensure Phaser doesn't consume the `I` key. Add `I` key to `WorldScene` keyboard ignore list.

4. **Drag handles vs full-slot dragging**
   - What we know: `useSortable` supports both full-element drag and a separate drag handle via `setActivatorNodeRef`
   - What's unclear: Whether tooltip should still show when hovering during a drag operation
   - Recommendation: Use full-slot drag (entire slot div is the drag activator). Disable tooltip during active drag by checking `isDragging` from `useSortable`.

---

## Sources

### Primary (HIGH confidence)
- `apps/web/src/store/gameStore.ts` — Existing Zustand store pattern (no immer, no create<T>()() wrapper until now)
- `apps/web/src/store/authStore.ts` — Existing persist middleware pattern
- `apps/web/src/ui/panels/ChatPanel.tsx` — Panel component pattern to follow
- `apps/web/src/ui/GameUI.tsx` — Panel mounting point
- `apps/web/src/ui/hud/HUD.tsx` — `toggleInventory` already wired
- `packages/shared-types/src/game/inventory.ts` — `InventoryItem` uses `slot` not `slotIndex`
- `packages/shared-types/src/network/events.ts` — No `inventory:reorder` in ClientEvents confirmed
- `apps/game-server/src/game/game.gateway.ts` — Handler pattern; `inventory:reorder` confirmed absent
- `apps/game-server/src/game/inventory.service.ts` — No moveSlot method confirmed
- `node_modules/zustand/package.json` — Version 4.5.7, immer peer dependency required
- `node_modules/zustand/middleware/immer.d.ts` — Import path: `import { immer } from 'zustand/middleware/immer'`
- floating-ui.com/docs/tooltip — Complete tooltip implementation with FloatingPortal (HIGH)
- dndkit.com/presets/sortable/usesortable — useSortable API, CSS.Transform.toString (HIGH)
- dndkit.com/presets/sortable/sortable-context — rectSortingStrategy for grid (HIGH)
- docs.phaser.io/api-documentation/class/input-keyboard-keyboardplugin — `keyboard.enabled = false` (HIGH)

### Secondary (MEDIUM confidence)
- WebSearch: @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0 versions confirmed via npm search results
- WebSearch: @floating-ui/react@0.27.18 latest version confirmed

### Tertiary (LOW confidence)
- WebSearch: @dnd-kit/react@0.3.0 is experimental/not stable — confirmed via github issue #1695 showing "workaround" resolution

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — library versions verified via WebSearch, immer peer dep verified via node_modules inspection
- Architecture: HIGH — patterns derived from existing codebase (gameStore, ChatPanel, WorldScene) + official docs
- Pitfalls: HIGH for codebase-specific pitfalls (slot vs slotIndex, missing server endpoint, immer peer dep); MEDIUM for dnd-kit behavioral pitfalls (verified via official docs)
- Missing server endpoint: HIGH confidence this gap exists (grep confirmed no `inventory:reorder` anywhere)

**Research date:** 2026-02-17
**Valid until:** 2026-03-19 (30 days) — floating-ui is very actively maintained (published 12h before research); check for API changes if planning is delayed
