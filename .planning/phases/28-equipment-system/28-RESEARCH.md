# Phase 28: Equipment System - Research

**Researched:** 2026-02-18
**Domain:** React UI (EquipmentPanel), NestJS WebSocket handlers, game-logic stat propagation
**Confidence:** HIGH — all findings drawn from codebase inspection of existing files

---

## Summary

Phase 28 builds on a fully-implemented foundation. The server already has `handleEquip`, `handleUnequip`, `equipItem`, `equipModule`, `unequipItem`, `unequipModule` in `InventoryService` and `GameService`. The gateway already handles `equipment:change` and `inventory:unequip` events. The `effectiveStats` function in `game-logic` already computes all 6 module type effects. The `InventoryEquipment` type in shared-types already models `exosuit/modules[]/tool/accessory1/accessory2`.

What does NOT exist yet: (1) The `EquipmentPanel.tsx` UI component showing the suit silhouette, module slots, and tool slots; (2) `effectiveStats` being emitted to the client alongside `inventory:update` so the HUD can display computed stats; (3) A tool-swap handler for the `Q` hotkey (swap `tool` and `accessory1` per EQUIP-09); (4) `showEquipment`/`toggleEquipment` in `gameStore`; (5) Level-requirement UI feedback (grey-out items below `requiredLevel`).

**Primary recommendation:** The three plans map cleanly: Plan 28-01 = EquipmentPanel UI + gameStore toggle + DnD drop-to-equip; Plan 28-02 = server tool-swap handler + stats emission on every equip/unequip; Plan 28-03 = HUD stats section reading emitted stats + level-gating UI.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@dnd-kit/core` | 6.3.1 | Drag-and-drop (existing in InventoryPanel) | INSTALLED |
| `@dnd-kit/sortable` | 10.0.0 | Sortable context (existing) | INSTALLED |
| `@dnd-kit/utilities` | 3.2.2 | CSS transform helpers | INSTALLED |
| `@floating-ui/react` | 0.27.18 | ItemTooltip (existing) | INSTALLED |
| `zustand` | 4.5.0 | State management (inventoryStore + gameStore) | INSTALLED |
| `immer` | 11.1.4 | Immutable state updates in inventoryStore | INSTALLED |

No new packages required. Equipment Panel re-uses all existing infrastructure.

### Key Internal Modules (already built)
| Module | Path | What it provides |
|--------|------|-----------------|
| `InventoryService` | `apps/game-server/src/game/inventory.service.ts` | `equipItem`, `equipModule`, `unequipItem`, `unequipModule`, `moveSlot` |
| `GameService.handleEquip` | `apps/game-server/src/game/game.service.ts:343` | Validates level + slot + calls service |
| `GameService.handleUnequip` | `apps/game-server/src/game/game.service.ts:388` | Validates inventory space + calls service |
| `effectiveStats` | `packages/game-logic/src/inventory/stats.ts` | Returns `ComputedStats` from equipment |
| `validateEquip` | `packages/game-logic/src/inventory/validation.ts` | Level check + module slot check |
| `validateUnequip` | `packages/game-logic/src/inventory/validation.ts` | Inventory-full check |
| `ItemRegistry` | `packages/items/src/registry.ts` | `ItemRegistry.get(itemId)` returns `ItemDefinition` |
| `RARITY_COLORS` | `apps/web/src/ui/constants.ts` | Color map for rarity borders |

---

## Architecture Patterns

### Recommended Project Structure Additions
```
apps/web/src/
├── ui/
│   └── panels/
│       ├── EquipmentPanel.tsx     # NEW - exo-suit silhouette + module slots + tool slots
│       └── EquipmentPanel.css     # NEW
├── store/
│   └── gameStore.ts              # ADD: showEquipment/toggleEquipment + effectiveStats
packages/shared-types/src/
├── network/
│   └── events.ts                 # ADD: equipment:tool_swap to ClientEvents
│                                 # ADD: ComputedStats to ServerEvents inventory:update payload
apps/game-server/src/game/
└── game.gateway.ts               # ADD: @SubscribeMessage('equipment:tool_swap') handler
```

### Pattern 1: Equipment Panel as Droppable Target (DnD Kit)

**What:** Use `@dnd-kit/core` `useDroppable` to make each equipment slot a drop target. Dragging an item from the inventory grid and dropping it on an equipment slot emits `equipment:change`.

**When to use:** The inventory already uses `@dnd-kit/core` DndContext. The EquipmentPanel should live inside the same DndContext so drag operations can span both panels.

**Critical:** InventoryPanel currently owns the `DndContext`. For cross-panel drag-to-equip, the DndContext must be lifted to the parent (`GameUI.tsx`) or EquipmentPanel must be rendered inside InventoryPanel's DndContext. The simpler approach is rendering EquipmentPanel inside the same modal as InventoryPanel, sharing the DndContext.

**Example — equipment slot as drop target:**
```typescript
// Source: @dnd-kit/core useDroppable pattern
import { useDroppable } from '@dnd-kit/core';

function EquipSlot({ slotId, label, item }: EquipSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `equip-slot-${slotId}` });
  return (
    <div
      ref={setNodeRef}
      className={`equip-slot ${isOver ? 'equip-slot--hover' : ''} ${item ? 'equip-slot--filled' : ''}`}
    >
      {item ? <SlotItem item={item} /> : <span className="slot-label">{label}</span>}
    </div>
  );
}
```

**Handling drop in DragEndEvent:**
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over) return;

  const overId = String(over.id);
  if (overId.startsWith('equip-slot-')) {
    // Dropped on equipment slot — emit equip
    gameSocket.emit('equipment:change', { instanceId: String(active.id) });
    return;
  }
  // Otherwise: normal inventory reorder
};
```

### Pattern 2: Tool Swap via Hotkey

**What:** A `Q` keypress (when EquipmentPanel is open OR as a global shortcut) emits `equipment:tool_swap` to the server. The server swaps `tool` and `accessory1` atomically.

**EQUIP-09 says:** "Main + Secondary tool slots with hotkey swap." The current `InventoryEquipment` has `tool` (main) and `accessory1`/`accessory2` (accessories). The requirement refers to swapping these.

**Design decision needed:** The `InventoryEquipment` type has `tool`, `accessory1`, `accessory2`. The lore says "main + secondary tool slots". The planner must decide whether `accessory1` is the "secondary tool slot" for swapping purposes or whether a new dedicated `tool2` field is added. **Recommendation: treat `accessory1` as secondary tool slot for EQUIP-09 swap**, since adding a new DB field is out of scope and the schema comment notes accessories. This avoids a DB migration.

**Server implementation:**
```typescript
// In game.gateway.ts
@SubscribeMessage('equipment:tool_swap')
async handleToolSwap(@ConnectedSocket() client: Socket) {
  const player = this.playerService.getPlayerBySocket(client.id);
  if (!player) return;
  const result = await this.gameService.handleToolSwap(client.id);
  if (result.success && result.inventory) {
    client.emit('inventory:update', result.inventory);
  } else {
    client.emit('error', { code: 'INVALID_ACTION', message: result.error });
  }
}
```

**GameService.handleToolSwap:**
```typescript
async handleToolSwap(socketId: string): Promise<EquipResult> {
  const player = this.playerService.getPlayerBySocket(socketId);
  if (!player) return { success: false, error: 'Player not found' };
  const inventory = this.inventoryService.getInventory(player.id);
  if (!inventory) return { success: false, error: 'Inventory not loaded' };

  // Swap tool <-> accessory1
  const mainTool = inventory.equipment.tool;
  const secondaryTool = inventory.equipment.accessory1;

  inventory.equipment.tool = secondaryTool;
  inventory.equipment.accessory1 = mainTool;

  const db = this.databaseService.getClient();
  await updateInventoryFull(db, player.id, {
    items: inventory.items,
    equipment: inventory.equipment,
  });

  return { success: true, inventory: this.inventoryService.getInventory(player.id) };
}
```

### Pattern 3: Stats Propagation to HUD

**What:** After every equip/unequip, the server calls `effectiveStats(equipment)` and includes the result in `inventory:update`. The client stores it in `inventoryStore` and the HUD reads from it.

**Current state:** `inventory:update` emits a plain `Inventory` object (items + equipment, no computed stats). The `effectiveStats` function exists but is never called during equip flows.

**Two integration options:**

Option A — Include `effectiveStats` result embedded in `inventory:update` payload by extending the `Inventory` type with an optional `stats?: ComputedStats` field. This keeps a single event.

Option B — Emit a separate `player:stats` event alongside `inventory:update`.

**Recommendation: Option A.** Add `stats?: ComputedStats` to the `Inventory` shared type. Compute and attach after every equip/unequip in `GameService.handleEquip` and `handleUnequip`. The HUD reads `inventoryStore.inventory.stats`.

```typescript
// In shared-types/src/game/inventory.ts — add to Inventory interface:
// stats?: ComputedStats; // populated server-side after equip operations

// In game-logic stats.ts — ComputedStats is already exported
// In game.service.ts — after successful equip:
const updatedInventory = this.inventoryService.getInventory(player.id);
const stats = effectiveStats(updatedInventory.equipment);
return { success: true, inventory: { ...updatedInventory, stats } };
```

**WARNING:** `ComputedStats` is defined in `game-logic`, not in `shared-types`. It must be either moved to `shared-types` or re-declared there. The cleaner approach is to move/re-export it from `shared-types` so the client can import it without depending on `game-logic`.

### Pattern 4: Level Gating UI

**What:** Items below the player's `requiredLevel` are visually greyed out (opacity: 0.5, cursor: not-allowed) in the inventory grid. Context menu "Equip" option is disabled. Dropping such items on equipment slots emits `equipment:change` but the server rejects it and emits `error` back — the client should display the error message.

**Player level source:** `useGameStore().player.level` — already present in `gameStore.ts`.

**Pattern:**
```typescript
// In InventoryPanel's SortableSlot or EquipmentPanel drag handler:
const playerLevel = useGameStore(state => state.player?.level ?? 1);
const isLevelLocked = itemDef.requiredLevel > playerLevel;

// Apply class:
className={`inventory-slot ${isLevelLocked ? 'inventory-slot--locked' : ''}`}
// CSS: .inventory-slot--locked { opacity: 0.5; cursor: not-allowed; }
```

The server also rejects — `validateEquip` already checks `playerLevel < item.requiredLevel`. The client UI is decorative (for feedback), the server is authoritative.

### Anti-Patterns to Avoid

- **Optimistic equip:** Do not update `inventoryStore.equipment` before server confirms. Non-optimistic pattern (established in Phase 27 for reorder) is the project standard. The `pendingEquip` flag blocks further interactions until `inventory:update` arrives.
- **Zone-wide inventory:update:** `client.emit()` only — confirmed in STATE.md and established in all existing handlers.
- **Two-call DB writes:** All equip/unequip MUST use `updateInventoryFull` (items + equipment in one SQL UPDATE). Never chain `updateInventoryItems` + `updateEquipment` calls.
- **gameStore for equipment state:** Equipment state lives in `inventoryStore`, not `gameStore`. Adding equipment to `gameStore` would trigger Phaser re-renders — confirmed anti-pattern from Phase 27.
- **Sharing DndContext incorrectly:** If EquipmentPanel and InventoryPanel are separate React trees with separate DndContexts, cross-panel drag will not work. Both panels must share a single DndContext (lift it to GameUI.tsx or render EquipmentPanel inside InventoryPanel's modal).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop inventory-to-equipment | Custom mouse event handlers | `@dnd-kit/core` useDroppable | Edge cases: touch, keyboard, accessibility, scroll |
| Item tooltips in equipment slots | Custom hover state + portal | `ItemTooltip` component (existing, uses @floating-ui/react) | Already handles positioning, portal, keyboard dismiss |
| Stat computation | Custom stat loop | `effectiveStats()` from `game-logic/src/inventory/stats.ts` | Already handles all 6 effect types + multiplicative speed stacking |
| Level check | Inline comparison | `validateEquip()` from `game-logic/src/inventory/validation.ts` | Pure function, shared between server and tests |
| Inventory-full check | Inline count | `validateUnequip()` from `game-logic/src/inventory/validation.ts` | Same — pure function |
| Atomic equip DB write | Sequential awaits | `updateInventoryFull()` from `database/src/queries/inventory.ts` | Two-write race is a confirmed duplication exploit |

---

## Common Pitfalls

### Pitfall 1: DndContext Boundary — Cross-Panel Drag Fails
**What goes wrong:** EquipmentPanel renders outside InventoryPanel's `DndContext`. Drag from inventory slot lands in a different React DnD tree. `over` is null in `onDragEnd`. Nothing happens.
**Why it happens:** Each `DndContext` is isolated. Drop targets only register with their nearest ancestor DndContext.
**How to avoid:** Lift `DndContext` to `GameUI.tsx`. Both `InventoryPanel` and `EquipmentPanel` render as children. Single `onDragEnd` handler in `GameUI` routes to reorder or equip based on `over.id` prefix.
**Warning signs:** `over` is always null when dragging to equipment slots.

### Pitfall 2: Module Slot Count Stale on Suit Swap
**What goes wrong:** Player equips a new suit (e.g., Legendary = 6 slots), but the `EquipmentPanel` still renders the old slot count (e.g., 3 for Common suit). Modules appear to be in non-existent slots.
**Why it happens:** Panel derives slot count from stale `itemDef.moduleSlots` before the `inventory:update` round trip completes.
**How to avoid:** Derive slot count reactively from `inventoryStore.inventory.equipment.exosuit?.itemId` → `ItemRegistry.get(itemId)?.moduleSlots ?? 0`. This re-derives on every `inventory:update`.
**Warning signs:** Slot grid does not update when suit changes.

### Pitfall 3: Unequipping Suit with Modules Orphans Modules
**What goes wrong:** Player unequips the exo-suit. The modules array still has 3 items but `suitModuleSlots` is now 0. The server's `effectiveStats` still counts them. Visually, module slots disappear but modules remain equipped.
**What to decide:** Should unequipping a suit automatically unequip all modules? Or should modules remain equipped (invisible) until the player manually removes them?
**Recommendation:** Server should reject suit unequip if modules are still equipped (return error: "Remove all modules before unequipping suit"). This is the simplest safe behavior. The planner must pick one approach and encode it in `handleUnequip`.
**Warning signs:** `effectiveStats` returns non-zero armor/speed even with no suit visible.

### Pitfall 4: Tool Swap with Empty Slots
**What goes wrong:** Player has a tool in `tool` but nothing in `accessory1`. Swap makes `tool = undefined`, `accessory1 = the old tool`. Now `accessory1` holds a tool-category item, but the validation logic and display code may not expect this.
**Why it happens:** `accessory1` field accepts any `InventoryItem`. No category enforcement at the DB level.
**How to avoid:** The swap handler should treat undefined as a valid swap target (main tool moves to secondary, secondary is empty). The EquipmentPanel should display secondary tool slot as a tool slot (not accessory) and label it accordingly.
**Warning signs:** After swap with empty secondary, item disappears from HUD display.

### Pitfall 5: ComputedStats Type Not Available on Client
**What goes wrong:** `ComputedStats` is defined in `packages/game-logic/src/inventory/stats.ts`. The web client does not import `@into-the-void/game-logic` (only the server does). HUD component cannot type-check `inventory.stats`.
**How to avoid:** Either: (a) move `ComputedStats` interface to `packages/shared-types/src/game/inventory.ts` and re-export it, or (b) re-declare it inline in the web package. Option (a) is the clean approach — shared-types is the contract package.
**Warning signs:** TypeScript error: "Cannot find module '@into-the-void/game-logic'" in web package.

### Pitfall 6: `equipment:change` Event Missing from ClientEvents Type
**What goes wrong:** Gateway handles `equipment:change` but it is not declared in `ClientEvents` interface in `shared-types/src/network/events.ts`. TypeScript does not enforce payload shape. A refactor may break the contract silently.
**How to avoid:** Add `'equipment:change': { instanceId: string }` and `'equipment:tool_swap': Record<string, never>` to `ClientEvents`. Add `'inventory:unequip': { instanceId: string }` too (same gap exists).
**Warning signs:** `gameSocket.emit('equipment:change', ...)` has no TypeScript type checking.

---

## Code Examples

Verified patterns from existing codebase:

### Module Slot Count from Suit Definition
```typescript
// Source: apps/game-server/src/game/game.service.ts:357-359
const suitModuleSlots = inventory.equipment.exosuit
  ? ItemRegistry.get(inventory.equipment.exosuit.itemId)?.moduleSlots || 0
  : 0;
```

### Suit Rarity to Module Slot Count (ItemDefinition)
```typescript
// Source: packages/items/src/definitions/suits.ts
// common suits:   moduleSlots: 3
// rare suits:     moduleSlots: 4
// epic suits:     moduleSlots: 4  (NOTE: epic and rare are both 4, not 5)
// exotic suits:   moduleSlots: 5
// legendary suits: moduleSlots: 6
// NOTE: requirements say Common=3, Legendary=6 — the middle tiers (epic=4, exotic=5) are confirmed in suit definitions
```

### effectiveStats Call Pattern (server-side)
```typescript
// Source: packages/game-logic/src/inventory/stats.ts
import { effectiveStats } from '@into-the-void/game-logic';
import type { EquipmentJson } from '@into-the-void/database';

const stats = effectiveStats(inventory.equipment as EquipmentJson);
// Returns: { armor, speedMultiplier, hazardResistance, detectionRange, energyCapacity, rechargeRate, jumpHeight, bonuses }
```

### updateInventoryFull Atomic Write (confirmed pattern)
```typescript
// Source: packages/database/src/queries/inventory.ts:64-73
// Single SQL UPDATE — always use for equip/unequip operations
await updateInventoryFull(db, playerId, {
  items: inventory.items,
  equipment: inventory.equipment,
});
```

### Existing Gateway Pattern for Private Events
```typescript
// Source: apps/game-server/src/game/game.gateway.ts:416-419
// ALWAYS client.emit() for inventory updates — never server.to(zoneId).emit()
if (result.inventory) {
  client.emit('inventory:update', result.inventory);
}
```

### InventoryPanel DnD Handler Pattern
```typescript
// Source: apps/web/src/ui/panels/InventoryPanel.tsx:114-125
const handleDragEnd = (event: DragEndEvent) => {
  if (pendingReorder) return;
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  // Route by over.id prefix to distinguish equip vs reorder
};
```

### setKeyboardEnabled Pattern (disable Phaser keys when panel open)
```typescript
// Source: apps/web/src/ui/panels/InventoryPanel.tsx:87-101
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

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `head/chest/legs/feet` equipment slots | `exosuit/modules[]/tool/accessory1/accessory2` | Migration complete in 25-03 |
| Two-write equip (items then equipment) | `updateInventoryFull` single atomic write | Eliminates duplication exploit window |
| Speed stacking additive | Speed stacking multiplicative | Implemented in `effectiveStats` (confirmed 26-04) |
| Timed stat_buff tracked in equipment | Timed stat_buff excluded from effectiveStats | Consumable buffs tracked separately in player state |

---

## Open Questions

1. **DndContext lift scope**
   - What we know: InventoryPanel owns DndContext. EquipmentPanel needs to be a drop target in the same context.
   - What's unclear: Should DndContext be lifted to GameUI.tsx or should EquipmentPanel render inside InventoryPanel's modal?
   - Recommendation: Lift to GameUI.tsx. Both panels render as children of a shared DndContext. The `onDragEnd` in GameUI routes by `over.id` prefix.

2. **Suit unequip behavior when modules are equipped**
   - What we know: Unequipping a suit while modules are present creates an orphaned modules state (modules equipped, no suit to hold them).
   - What's unclear: Should the server (a) reject suit unequip if modules are equipped, (b) auto-unequip all modules, or (c) allow orphaned modules?
   - Recommendation: Reject with error "Remove all modules before unequipping suit." Simple, safe, no cascade complexity.

3. **Secondary tool slot identity**
   - What we know: EQUIP-09 says "Main + Secondary tool slots". `InventoryEquipment` has `tool`, `accessory1`, `accessory2`. No dedicated `tool2` field.
   - What's unclear: Is `accessory1` the secondary tool slot for hotkey swap purposes?
   - Recommendation: Yes — treat `accessory1` as secondary tool slot. No DB migration needed. Label it "Tool (Secondary)" in the UI.

4. **ComputedStats location**
   - What we know: Defined in `game-logic`, not accessible from web client.
   - What's unclear: Move to `shared-types` or inline in web package?
   - Recommendation: Move interface definition to `shared-types/src/game/inventory.ts`. Import in `game-logic/src/inventory/stats.ts` from shared-types (or keep local and cast). Client imports from shared-types.

5. **Module type compatibility rules (open design question from STATE.md)**
   - What we know: Lore does not specify a cap on duplicate module types.
   - What's unclear: Can a player equip 6 Speed modules in a Legendary suit?
   - Recommendation: No cap on duplicate module types for Phase 28. Keep the existing `validateEquip` which only checks total slot count. Compatibility rules can be added in a future phase. This is the minimum viable approach and avoids a design decision that requires lore sign-off.

---

## Sources

### PRIMARY (HIGH confidence — direct codebase inspection)
- `packages/game-logic/src/inventory/stats.ts` — `effectiveStats`, `ComputedStats`
- `packages/game-logic/src/inventory/validation.ts` — `validateEquip`, `validateUnequip`
- `packages/game-logic/src/inventory/effects.ts` — `resolveEffect`, `resolveEffectsForTrigger`
- `packages/items/src/types.ts` — `ItemDefinition`, `EquipSlot`, `ItemEffect` discriminated union
- `packages/items/src/definitions/suits.ts` — `moduleSlots` values per rarity
- `packages/items/src/definitions/modules.ts` — All 30 module definitions (6 types x 5 rarities)
- `packages/items/src/definitions/tools.ts` — All 15 tool definitions (3 types x 5 rarities)
- `packages/shared-types/src/game/inventory.ts` — `Inventory`, `InventoryEquipment`, slot count comments
- `packages/shared-types/src/network/events.ts` — `ClientEvents`, `ServerEvents`
- `packages/database/src/queries/inventory.ts` — `updateInventoryFull`, atomic write guarantee
- `apps/game-server/src/game/inventory.service.ts` — All equip/unequip service methods
- `apps/game-server/src/game/game.service.ts:343-429` — `handleEquip`, `handleUnequip`
- `apps/game-server/src/game/game.gateway.ts` — `equipment:change`, `inventory:unequip` handlers
- `apps/web/src/ui/panels/InventoryPanel.tsx` — DnD pattern, keyboard disable pattern
- `apps/web/src/store/inventoryStore.ts` — Separate Zustand store, socket wiring
- `apps/web/src/store/gameStore.ts` — `showInventory`, `toggleInventory` pattern to replicate
- `apps/web/src/ui/GameUI.tsx` — Panel rendering pattern
- `apps/web/src/ui/hud/HUD.tsx` — HUD structure, player stats access
- `apps/web/src/ui/constants.ts` — `RARITY_COLORS` map
- `apps/web/src/components/ItemTooltip.tsx` — Tooltip usage pattern
- `.planning/STATE.md` — All v1.6 locked decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed installed, versions verified in package.json
- Architecture patterns: HIGH — all patterns derived from existing codebase, no speculation
- Pitfalls: HIGH — derived from code inspection, confirmed design decisions in STATE.md
- Open questions: MEDIUM — design decisions not yet locked; recommendations are reasoned but not authoritative

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (stable domain, no external dependencies changing)
