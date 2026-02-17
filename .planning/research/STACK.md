# Stack Research: Inventory & Item System

**Domain:** Multiplayer 2D sci-fi MMO — item definitions, inventory UI, equipment slots, drag-drop
**Researched:** 2026-02-17
**Confidence:** HIGH

## Executive Summary

The existing stack handles approximately 80% of what this milestone requires. The database schema
(`inventories` table with jsonb), shared types (`ItemDef`, `Inventory`, `InventoryItem`,
`EquipmentSlot`), WebSocket events (`inventory:use`, `inventory:drop`, `inventory:pickup`,
`inventory:update`), and Zustand state (`showInventory`, `toggleInventory`) are **already in place**.

Three genuine gaps exist that require new packages: drag-drop within the inventory grid (no native
React or Phaser capability), tooltip positioning for item hover cards (CSS alone fails at viewport
edges), and immutable nested state updates for inventory mutations (Zustand's spread syntax becomes
unmanageable at inventory-item-slot depth). The item definition registry (strategy pattern, like
TileRegistry) and item caching are code patterns, not new packages.

The item data model needs one Drizzle schema addition: an `items` lookup table for the 100 item
definitions (currently only stored client-side as static data). All inventory *instances* stay in
the existing `inventories.items` jsonb column.

---

## Recommended Stack

### Core Technologies (All Present — NO NEW PACKAGES)

| Technology | Version | Purpose | Why Sufficient |
|------------|---------|---------|----------------|
| Phaser 3 | 3.90.0 (installed) | Game canvas rendering | No inventory UI goes inside Phaser canvas. Inventory panel is React HTML overlay, consistent with `ChatPanel.tsx` and `HUD.tsx` patterns. Phaser handles world items (ground drops) as sprites. |
| React 18 | ^18.2.0 (installed) | Inventory panel, equipment UI, action bar | React renders the HUD layer. Inventory UI follows same pattern as `ChatPanel` — conditional render in `GameUI.tsx` based on `showInventory` store state. |
| Zustand | ^4.5.0 (installed) | Inventory state management | Already has `showInventory` / `toggleInventory`. Needs inventory slice added for item data and current inventory state. |
| Socket.IO | ^4.7.0 (installed) | Real-time inventory sync | `inventory:update`, `inventory:use`, `inventory:drop`, `inventory:pickup` events already typed in `ServerEvents` / `ClientEvents`. |
| Drizzle ORM | ^0.30.0 (installed) | Inventory persistence | `inventories` table with jsonb already exists and has query helpers. Only addition: `items` definition table for server-side lookup. |
| `@into-the-void/shared-types` | workspace | Item type contracts | `ItemDef`, `Inventory`, `InventoryItem`, `EquipmentSlot`, `ItemRarity`, `ItemCategory` already defined. Needs `itemLevel` (ilvl) and faction restriction fields added. |

### New Packages Required

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | ^6.3.1 | Drag-drop engine for inventory grid | Modular, no physics engine required (critical: project has no Arcade Physics). Provides `DndContext`, `useDraggable`, `useDroppable` primitives. Headless — no imposed styles that conflict with game aesthetic. |
| `@dnd-kit/sortable` | ^8.0.0 | Sortable preset for inventory slots | `SortableContext` + `useSortable` handles slot reordering without reimplementing collision detection. `rectSortingStrategy` works for fixed-size inventory grids. |
| `@dnd-kit/utilities` | ^3.2.2 | CSS transform utilities for drag overlays | `CSS.Transform.toString()` eliminates manual drag offset math. Small utility layer from the same kit. |
| `@floating-ui/react` | ^0.27.17 | Item tooltip positioning | Pure CSS tooltips clip at viewport edges. `@floating-ui/react` computes flip/shift automatically. Used for item hover cards showing stats, rarity, ilvl. Headless — renders into a portal, composable with game's CSS variables. |
| `immer` | ^11.1.4 | Immutable nested state updates in Zustand | Moving item from slot 3 to slot 7 requires mutating `items[]` array inside `Inventory` inside Zustand. Without Immer, this is 4-level spread syntax. With Immer middleware, it's draft mutation. Zustand has native Immer middleware (`zustand/middleware/immer`). |

### Development Tools (No New Additions)

The existing NX + TypeScript + ESLint + Prettier setup handles everything. No new dev tooling needed.

---

## Installation

```bash
# In the repo root (pnpm workspace)
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @floating-ui/react immer

# All packages are runtime dependencies (not dev) — they ship in the web bundle
```

---

## Architecture Decisions

### Item Definitions: Static Package, Not Database Table

Item definitions (the 100 `ItemDef` records) should live in a new `packages/items` package
mirroring the `packages/tiles` pattern exactly:

```
packages/items/src/
  types.ts          — ItemDefinition interface (extends shared-types ItemDef)
  registry.ts       — ItemRegistry singleton (mirrors TileRegistry)
  definitions/
    exo-suits.ts
    modules.ts
    tools.ts
    consumables.ts
    world-items.ts
    reagents.ts
  index.ts
```

**Why not a database table:** Item *definitions* are static game data (authored, not player-generated).
Storing them in PostgreSQL adds a read on every item lookup, requires migration on every balance
change, and gains nothing — they never vary per-player. The `TileRegistry` pattern is already
validated for this purpose. The database `inventories` table stores *instances* (which item, how
many, in which slot) using `itemId` foreign keys back to the static registry.

**Server-side:** `game-server` imports `@into-the-void/items` and validates item operations against
registry (e.g., `ItemRegistry.get(itemId).requiredLevel <= character.level`).

**Client-side:** Same import. No network request for item definitions — they're bundled.

### Inventory State: New Zustand Slice

Add a dedicated inventory slice to `gameStore.ts` (or extract to `inventoryStore.ts`):

```typescript
// New fields in GameState:
inventory: Inventory | null;
setInventory: (inventory: Inventory) => void;
updateInventoryItem: (instanceId: string, changes: Partial<InventoryItem>) => void;
moveItemToSlot: (instanceId: string, newSlot: number) => void;
equipItem: (instanceId: string, slot: EquipmentSlot) => void;
unequipItem: (slot: EquipmentSlot) => void;
```

The `inventory:update` socket event handler populates `inventory` in the store (same pattern as
`zone:state` populating `zoneState`).

### Drag-Drop: dnd-kit with Custom Collision

Use `@dnd-kit/core` (not `@dnd-kit/sortable`) for the inventory grid because slots are positional
(fixed grid positions), not list-ordered. `useSortable` is for reorderable lists. For inventory:

- Each inventory slot is a `useDroppable` with `id = slotIndex`
- Each inventory item is a `useDraggable` with `id = instanceId`
- `DragOverlay` renders the dragged item preview (prevents drag ghost artifacts)
- Collision detection: `closestCenter` — most forgiving for grid slots

```typescript
// Collision strategy for inventory grid:
<DndContext
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  {/* DragOverlay prevents ghost images from flickering */}
  <DragOverlay>
    {activeItem ? <ItemSlot item={activeItem} isDragging /> : null}
  </DragOverlay>
```

### Tooltip: @floating-ui/react with React Portal

Item stat cards render in a `FloatingPortal` (appended to `document.body`), positioned relative to
the hovered slot. This prevents z-index conflicts with the game canvas:

```typescript
const { refs, floatingStyles } = useFloating({
  middleware: [offset(10), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
});
```

### Immer Middleware for Zustand

Apply Immer only to the inventory-related store state, not the entire `gameStore`. Extract inventory
to its own store (`inventoryStore.ts`) to keep Immer scope narrow:

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useInventoryStore = create(immer<InventoryState>((set) => ({
  // Moving item: draft mutation instead of 4-level spread
  moveItemToSlot: (instanceId, newSlot) => set((draft) => {
    const item = draft.inventory?.items.find(i => i.instanceId === instanceId);
    if (item) item.slot = newSlot;
  }),
})));
```

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-dnd` | Legacy HTML5 drag API with known mobile issues. Requires `HTML5Backend`. Touch support requires separate `TouchBackend`. Two backends can't coexist without workarounds. | `@dnd-kit/core` — unified sensor model, pointer/touch/keyboard all work out of the box |
| `react-beautiful-dnd` (hello-pangea/dnd) | Designed for lists (Kanban boards), not positional grids. Cannot handle swapping items between arbitrary grid slots. Atlassian deprecated the original, `hello-pangea` is a maintenance fork. | `@dnd-kit/core` with `useDroppable` per slot |
| `react-tooltip` (v5) | Adds 33KB gzipped for what is a layout positioning problem. Tooltip *content* is custom (item stats, rarity color, ilvl) — a styling library doesn't help with content. | `@floating-ui/react` — only the positioning math, content is custom JSX |
| `redux-toolkit` / `normalizr` for item state | Already have Zustand. Adding Redux creates two state management systems. Item state is local to a session — not complex enough to warrant RTK Query or normalization infrastructure. | Zustand `immer` middleware slice for inventory state |
| `@nestjs/cache-manager` with Redis for item defs | Item definitions are static files bundled at build time. Caching static data in Redis adds latency (Redis round-trip) vs. zero latency (in-process Map). Redis is already available for session data — overkill for read-only definition lookup. | In-process `ItemRegistry` Map (same as `TileRegistry`) |
| `phaser3-rex-plugins` item tooltip | Phaser canvas tooltips render inside the canvas. The HUD layer is React HTML. Canvas tooltips would require a z-index workaround and conflict with the established canvas/HUD separation. | `@floating-ui/react` in the React HUD layer |
| `react-virtuoso` / `react-window` for inventory | Inventory is 20 slots (extendable to ~60). Virtualization is for 1000+ row lists. Zero benefit, added complexity. | Standard React render of `Array(maxSlots)` |

---

## Schema Addition (Drizzle)

The existing `inventories` table stores item instances correctly. No changes needed there.

The `ItemDef` definitions do NOT need a database table (static package pattern above). However, if
the game server needs to validate item effects server-side (consumable triggers, equipment stat
boosts), the `packages/items` registry serves that role.

One optional table addition: personal storage (bank/stash). If this milestone includes it:

```typescript
// packages/database/src/schema/storage.ts
export const characterStorage = pgTable('character_storage', {
  characterId: uuid('character_id').primaryKey().references(() => characters.id),
  items: jsonb('items').$type<InventoryItemJson[]>().notNull().default([]),
  maxSlots: integer('max_slots').notNull().default(60),
});
```

Pattern matches `inventories` table exactly. Drizzle query helpers follow same shape as
`queries/inventory.ts`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@dnd-kit/core` | `react-dnd` | Never for this project — HTML5 backend has ghost image issues on Retina displays and no pointer event model |
| `@floating-ui/react` | Custom CSS tooltip with `position: absolute` | Only if items always appear in the center of the screen (never near edges). Not the case for edge inventory slots. |
| Static `ItemRegistry` package | PostgreSQL `item_definitions` table | Only if items are player-craftable/server-authoritative data that varies at runtime (not true here — items are authored game content) |
| Separate `inventoryStore.ts` with Immer | Adding Immer middleware to entire `gameStore.ts` | Use entire-store Immer only if most of `gameStore` also has nested mutation patterns. Currently it doesn't. |
| `@dnd-kit/core` with `useDroppable` per slot | `@dnd-kit/sortable` with `SortableContext` | Use `@dnd-kit/sortable` only if the inventory is a reorderable list (items shift position). For fixed grid slots where items *swap*, `useDroppable` per slot is correct. |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `@dnd-kit/core` ^6.3.1 | React ^18.2.0 | Compatible | Peer dep is React 16+. No breaking changes expected through React 18. |
| `@dnd-kit/sortable` ^8.0.0 | `@dnd-kit/core` ^6.3.1 | Compatible | Must use matching major versions within the dnd-kit suite. |
| `@floating-ui/react` ^0.27.17 | React ^18.2.0 | Compatible | Fully supports React 18 concurrent mode. No StrictMode issues. |
| `immer` ^11.1.4 | `zustand` ^4.5.0 | Compatible | Zustand ships its own `zustand/middleware/immer` adapter. Install `immer` separately as Zustand declares it as a peer dep, not a bundled dep. |
| `immer` ^11.1.4 | TypeScript ^5.4.0 | Compatible | Immer 10+ requires TypeScript 4.7+ for `enableMapSet()` types. No issues at 5.4. |

---

## Sources

### HIGH Confidence (Verified in Codebase)

- **Installed package.json** — `/Users/krzysztof.kalamarski/Projects/into-the-void/package.json` — Confirmed: Phaser 3.90.0, React 18.2.0, Zustand 4.5.0, Drizzle ORM 0.30.0, Socket.IO 4.7.0 installed. No dnd-kit, floating-ui, or immer present.
- **inventories.ts schema** — `packages/database/src/schema/inventories.ts` — `inventories` table exists with `items jsonb`, `equipment jsonb`, `maxSlots integer`.
- **inventory.ts (shared-types)** — `packages/shared-types/src/game/inventory.ts` — `ItemDef`, `InventoryItem`, `Inventory`, `EquipmentSlot`, `ItemRarity`, `ItemCategory` types confirmed.
- **events.ts (shared-types)** — `packages/shared-types/src/network/events.ts` — `inventory:update`, `inventory:use`, `inventory:drop`, `inventory:pickup` events confirmed in `ClientEvents` and `ServerEvents`.
- **gameStore.ts** — `apps/web/src/store/gameStore.ts` — `showInventory: false`, `toggleInventory` action confirmed. No inventory data slice yet.
- **tiles pattern** — `packages/tiles/src/registry.ts`, `packages/tiles/src/types.ts` — `TileRegistry` singleton Map pattern is the template for `ItemRegistry`.

### MEDIUM Confidence (Official Docs + WebSearch)

- **@dnd-kit/core** — [dndkit.com](https://dndkit.com/) + [docs.dndkit.com](https://docs.dndkit.com/) — Version 6.3.1. `useDraggable`, `useDroppable`, `closestCenter` collision detection. No physics engine required confirmed.
- **@floating-ui/react** — [floating-ui.com/docs/react](https://floating-ui.com/docs/react) — Version 0.27.17. `useFloating`, `flip`, `shift`, `offset` middleware. `FloatingPortal` for game overlay use.
- **immer** — [immerjs.github.io](https://immerjs.github.io/immer/) + [zustand.docs.pmnd.rs/integrations/immer-middleware](https://zustand.docs.pmnd.rs/integrations/immer-middleware) — Version 11.1.4. Native Zustand middleware adapter confirmed.
- **NestJS Redis cache (NOT recommended for item defs)** — [docs.nestjs.com/techniques/caching](https://docs.nestjs.com/techniques/caching) — `CacheModule` exists but in-process Map is correct for static read-only definitions.

### LOW Confidence (Informational)

- **@dnd-kit/react v0.3.0** — Newer API package published alongside `@dnd-kit/core`. Still experimental/beta as of research date. `@dnd-kit/core` 6.3.1 is the stable choice.

---

*Stack research for: Inventory & Item System — Into the Void*
*Researched: 2026-02-17*
*Confidence: HIGH — All existing packages verified in installed codebase. New packages verified via official docs.*
