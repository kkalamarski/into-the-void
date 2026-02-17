# Roadmap: Into the Void

## Milestones

- ✅ **v1.0 Auth & Character Screens** - Phases 1-3 (shipped 2026-02-14)
- ✅ **v1.1 Post-Login Game Experience** - Phases 4-7 (shipped 2026-02-16)
- ✅ **v1.2 Isometric View** - Phases 8-12 (shipped 2026-02-16)
- ✅ **v1.3 Elevation & Structures** - Phases 13-16 (shipped 2026-02-16)
- ✅ **v1.4 Infinite World & Seamless Chunks** - Phases 17-20 (shipped 2026-02-17)
- ✅ **v1.5 Movement Overhaul** - Phases 21-24 (shipped 2026-02-17)
- 🚧 **v1.6 Inventory & Items** - Phases 25-29 (in progress)

## Phases

<details>
<summary>✅ v1.0 Auth & Character Screens (Phases 1-3) - SHIPPED 2026-02-14</summary>

- [x] Phase 1: Authentication & Navigation (3/3 plans) - completed 2026-02-13
- [x] Phase 2: Character Selection (2/2 plans) - completed 2026-02-14
- [x] Phase 3: Character Creation (2/2 plans) - completed 2026-02-14

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Post-Login Game Experience (Phases 4-7) - SHIPPED 2026-02-16</summary>

- [x] Phase 4: WebSocket Connection & Auth Handshake (5/5 plans) - completed 2026-02-14
- [x] Phase 5: Phaser Integration & World Rendering (5/5 plans) - completed 2026-02-14
- [x] Phase 6: Movement System (5/5 plans) - completed 2026-02-15
- [x] Phase 7: Entities & HUD (5/5 plans) - completed 2026-02-16

See: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Isometric View (Phases 8-12) - SHIPPED 2026-02-16</summary>

- [x] Phase 8: Core Isometric Transformation (3/3 plans) - completed 2026-02-16
- [x] Phase 9: Rendering Optimization & Interaction (2/2 plans) - completed 2026-02-16
- [x] Phase 10: Multiplayer Integration (1/1 plans) - completed 2026-02-16
- [x] Phase 11: UI Integration (1/1 plans) - completed 2026-02-16
- [x] Phase 12: Polish (1/1 plans) - completed 2026-02-16

See: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.3 Elevation & Structures (Phases 13-16) - SHIPPED 2026-02-16</summary>

**Milestone Goal:** Add vertical dimension to the world with terrain elevation, structure walls, and a scalable tile definition system.

- [x] Phase 13: Tile Definition Architecture (3/3 plans) - completed 2026-02-16
- [x] Phase 14: Elevation System Core (2/2 plans) - completed 2026-02-16
- [x] Phase 15: Elevation Rendering (2/2 plans) - completed 2026-02-16
- [x] Phase 16: Structure Walls & Pathfinding (5/5 plans) - completed 2026-02-16

See: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v1.4 Infinite World & Seamless Chunks (Phases 17-20) - SHIPPED 2026-02-17</summary>

**Milestone Goal:** Transform the world from chunk-locked biomes to a truly infinite, seamlessly streaming world where biomes flow naturally across boundaries.

- [x] Phase 17: World Coordinate Foundation (2/2 plans) - completed 2026-02-16
- [x] Phase 18: Multi-Chunk Streaming (5/5 plans) - completed 2026-02-16
- [x] Phase 19: Biome Integration (2/2 plans) - completed 2026-02-17
- [x] Phase 20: Testing & Polish (2/2 plans) - completed 2026-02-17

See: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>✅ v1.5 Movement Overhaul (Phases 21-24) - SHIPPED 2026-02-17</summary>

**Milestone Goal:** Fix movement accessibility (all tiles reachable via keyboard), unify keyboard and click-to-move speed, and polish movement feel with tile-to-tile animation and smooth camera follow.

- [x] Phase 21: Server Rate Limit & Speed Unification (2/2 plans) - completed 2026-02-17
- [x] Phase 22: 8-Directional Input & Pathfinding (2/2 plans) - completed 2026-02-17
- [x] Phase 23: Movement Animation & Camera Polish (4/4 plans) - completed 2026-02-17
- [x] Phase 24: Zone Boundary Hysteresis (1/1 plans) - completed 2026-02-17

See: `.planning/milestones/v1.5-ROADMAP.md`

</details>

### 🚧 v1.6 Inventory & Items (In Progress)

**Milestone Goal:** Implement the item system with a strategy-pattern registry, 100 lore-accurate items across 6 categories, exo-suit equipment with module slots, server-authoritative stat calculation, a drag-drop inventory UI, and an action bar with hotkeys.

**Phases:** 5 (25-29)
**Depth:** Quick (from config)
**Coverage:** 33/33 requirements mapped

#### Phase 25: Item Data Model & Foundation

**Goal**: The shared item registry and correct database schema exist so every subsequent phase builds on validated, lore-accurate item definitions and an atomic inventory DB layer
**Depends on**: Phase 24 (v1.5 complete)
**Requirements**: ITEM-01, ITEM-02, ITEM-03, ITEM-04, ITEM-05, ITEM-06, DB-01, DB-02, DB-03, DB-04
**Success Criteria** (what must be TRUE):
  1. `ItemRegistry.get(itemId)` returns a typed `ItemDefinition` for all 100 items without error
  2. Items are distributed across 6 categories (suits, modules, tools, consumables, world items, reagents) and 5 rarity tiers (Common, Rare, Epic, Exotic, Legendary) as confirmed by unit tests
  3. The `inventories.equipment` JSONB column stores `{ exosuit, modules[], tool, accessory1, accessory2 }` — the old `head/chest/legs/feet` shape is gone
  4. A single `updateInventoryFull(characterId, { items, equipment })` DB call updates both inventory and equipment atomically — two-call pattern no longer exists
  5. Item definitions include `ilvl`, `requiredLevel`, and `maxStack` fields and pure validation functions (`validateItemUse`, `validateEquip`) exist in `game-logic`
**Plans**: 4 plans in 3 waves

Plans:
- [x] 25-01-PLAN.md — Create packages/items workspace package with ItemRegistry and ItemDefinition
- [x] 25-02-PLAN.md — Define all 100 items across 6 categories and 5 rarity tiers
- [x] 25-03-PLAN.md — Migrate DB equipment schema to exo-suit model; add updateInventoryFull
- [x] 25-04-PLAN.md — Add pure validation functions to packages/game-logic

#### Phase 26: Server InventoryService & WebSocket Handlers

**Goal**: The server is the authoritative source for inventory state — pickup, drop, use, and equip operations are validated, persisted atomically, and emitted only to the owning player
**Depends on**: Phase 25 (item registry and DB schema in place)
**Requirements**: INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, EQUIP-11
**Success Criteria** (what must be TRUE):
  1. Player walks over a world item and presses interact — item appears in their inventory, the world entity despawns, and no other player receives an `inventory:update` event
  2. Two players simultaneously interact with the same world item — exactly one receives it; the other receives an error; no item duplication occurs
  3. Player uses a consumable via `inventory:use` — effect is applied server-side, item is removed from inventory, and updated inventory state is sent back to the player
  4. Player drops an item via `inventory:drop` — a ground item entity spawns at the player's position with a 5-minute despawn timer broadcast zone-wide
  5. Server stat calculation (`effectiveStats`) derives all stats from `InventoryService` authoritative state — client-provided stat values are never trusted
**Plans**: TBD

Plans:
- [ ] 26-01: Create `InventoryService` NestJS service with in-memory `Map<playerId, Inventory>`, DB load on auth, flush on mutation, flush on disconnect
- [ ] 26-02: Add 5 `@SubscribeMessage` handlers to `GameGateway` (`inventory:pickup`, `inventory:drop`, `inventory:use`, `equipment:change`, `inventory:unequip`); add in-memory claim map to `ZonesService`
- [ ] 26-03: Wire `handleInteraction` in `game.service.ts` to write to inventory before broadcasting `entity:despawn`; emit `inventory:update` on auth success
- [ ] 26-04: Add `effectiveStats(player, equipment): ComputedStats` pure function to `game-logic`; call it from all combat and interaction validations

#### Phase 27: Client State & Inventory Panel UI

**Goal**: Players can open their inventory, see all items in a grid with rarity colors, drag items to rearrange, hover for tooltips, and use or drop items via context menu
**Depends on**: Phase 26 (server emits `inventory:update` correctly)
**Requirements**: UI-01, UI-04, UI-06
**Success Criteria** (what must be TRUE):
  1. Player presses the inventory key — a 20-slot grid panel opens showing all carried items with icons colored by rarity tier
  2. Player hovers an item — a tooltip appears showing name (rarity-colored), description, category, rarity, ilvl, and required level; tooltip repositions correctly at panel edges
  3. Player drags an item from one slot to another — inventory reorders after server confirms; optimistic reorder does not occur before server response
  4. Player right-clicks an item and selects "Drop" — item disappears from inventory and a ground entity appears at the player's world position
**Plans**: TBD

Plans:
- [ ] 27-01: Create `inventoryStore.ts` Zustand store with Immer middleware; wire `inventory:update` socket event; install `dnd-kit` and `@floating-ui/react`
- [ ] 27-02: Build `InventoryPanel.tsx` with 20-slot dnd-kit grid, rarity-colored item icons, context menu (use/drop/equip), and slot count display
- [ ] 27-03: Build item tooltip component using `@floating-ui/react` with `FloatingPortal`; disable Phaser keyboard input when inventory is open

#### Phase 28: Equipment System

**Goal**: Players can equip an exo-suit with module slots that scale by rarity, swap tools with hotkeys, and see their effective stats update in the HUD after every equipment change
**Depends on**: Phase 27 (inventory panel exists; players have items to equip)
**Requirements**: EQUIP-01, EQUIP-02, EQUIP-03, EQUIP-04, EQUIP-05, EQUIP-06, EQUIP-07, EQUIP-08, EQUIP-09, EQUIP-10, UI-02
**Success Criteria** (what must be TRUE):
  1. Equipment panel shows the exo-suit slot, the correct number of module slots for the equipped suit's rarity (Common=3, Legendary=6), and two tool slots
  2. Player drags a module from inventory to a module slot — module equips, server recalculates stats, HUD stats update within one `inventory:update` round trip
  3. Player presses the tool swap hotkey — main and secondary tool slots swap; server validates both slots before confirming
  4. Server rejects equipping an item if the player's level is below `requiredLevel` — client reflects the rejection by greying out the item in the UI
  5. Unequipping a module when inventory is full is rejected by the server — the player sees an error and the item remains equipped
**Plans**: TBD

Plans:
- [ ] 28-01: Build `EquipmentPanel.tsx` with exo-suit silhouette, variable module slot count, and tool slots; wire drag-from-inventory equip via `equipment:change` event
- [ ] 28-02: Implement server equip handler with required-level check, inventory-full pre-validation, and stat recalculation on every equip/unequip
- [ ] 28-03: Apply all 6 module type stat effects (armor, speed, life support, sensor array, power core, mobility) server-side; propagate recalculated stats to HUD via `inventory:update`

#### Phase 29: Action Bar & Personal Storage

**Goal**: Players have an 8-slot hotbar with number-key shortcuts for quick consumable use, and a separate personal storage panel for extended item management
**Depends on**: Phase 28 (inventory and equipment systems stable)
**Requirements**: UI-03, UI-05
**Success Criteria** (what must be TRUE):
  1. Player drags a consumable from inventory to an action bar slot — pressing the corresponding number key (1-8) uses the item via the server without typing in chat input
  2. Action bar slot auto-greys when the referenced item is no longer in inventory (used, dropped, or moved) — confirmed after every `inventory:update`
  3. Player opens the personal storage panel — items stored there are separate from inventory and persist across sessions
**Plans**: TBD

Plans:
- [ ] 29-01: Build `ActionBar.tsx` in the React HUD layer with 8 slots, `document`-level keydown listener with chat-focus guard, instance-ID references, and orphan invalidation on `inventory:update`
- [ ] 29-02: Build `PersonalStoragePanel.tsx` with its own grid view backed by the `player_storage` DB table

## Progress

**Execution Order:**
Phases execute in numeric order: 25 → 26 → 27 → 28 → 29

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Authentication & Navigation | v1.0 | 3/3 | Complete | 2026-02-13 |
| 2. Character Selection | v1.0 | 2/2 | Complete | 2026-02-14 |
| 3. Character Creation | v1.0 | 2/2 | Complete | 2026-02-14 |
| 4. WebSocket Connection | v1.1 | 5/5 | Complete | 2026-02-14 |
| 5. World Rendering | v1.1 | 5/5 | Complete | 2026-02-14 |
| 6. Movement System | v1.1 | 5/5 | Complete | 2026-02-15 |
| 7. Entities & HUD | v1.1 | 5/5 | Complete | 2026-02-16 |
| 8. Core Isometric Transformation | v1.2 | 3/3 | Complete | 2026-02-16 |
| 9. Rendering Optimization & Interaction | v1.2 | 2/2 | Complete | 2026-02-16 |
| 10. Multiplayer Integration | v1.2 | 1/1 | Complete | 2026-02-16 |
| 11. UI Integration | v1.2 | 1/1 | Complete | 2026-02-16 |
| 12. Polish | v1.2 | 1/1 | Complete | 2026-02-16 |
| 13. Tile Definition Architecture | v1.3 | 3/3 | Complete | 2026-02-16 |
| 14. Elevation System Core | v1.3 | 2/2 | Complete | 2026-02-16 |
| 15. Elevation Rendering | v1.3 | 2/2 | Complete | 2026-02-16 |
| 16. Structure Walls & Pathfinding | v1.3 | 5/5 | Complete | 2026-02-16 |
| 17. World Coordinate Foundation | v1.4 | 2/2 | Complete | 2026-02-16 |
| 18. Multi-Chunk Streaming | v1.4 | 5/5 | Complete | 2026-02-16 |
| 19. Biome Integration | v1.4 | 2/2 | Complete | 2026-02-17 |
| 20. Testing & Polish | v1.4 | 2/2 | Complete | 2026-02-17 |
| 21. Server Rate Limit & Speed Unification | v1.5 | 2/2 | Complete | 2026-02-17 |
| 22. 8-Directional Input & Pathfinding | v1.5 | 2/2 | Complete | 2026-02-17 |
| 23. Movement Animation & Camera Polish | v1.5 | 4/4 | Complete | 2026-02-17 |
| 24. Zone Boundary Hysteresis | v1.5 | 1/1 | Complete | 2026-02-17 |
| 25. Item Data Model & Foundation | v1.6 | 4/4 | Complete | 2026-02-17 |
| 26. Server InventoryService & WebSocket Handlers | v1.6 | 0/4 | Not started | - |
| 27. Client State & Inventory Panel UI | v1.6 | 0/3 | Not started | - |
| 28. Equipment System | v1.6 | 0/3 | Not started | - |
| 29. Action Bar & Personal Storage | v1.6 | 0/2 | Not started | - |

**Total:** 29 phases (25 complete, 4 planned)

---
*Last updated: 2026-02-17 after Phase 25 execution*
