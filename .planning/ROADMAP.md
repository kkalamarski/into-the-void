# Roadmap: Into the Void

## Milestones

- ✅ **v1.0 Auth & Character Screens** - Phases 1-3 (shipped 2026-02-14)
- ✅ **v1.1 Post-Login Game Experience** - Phases 4-7 (shipped 2026-02-16)
- ✅ **v1.2 Isometric View** - Phases 8-12 (shipped 2026-02-16)
- ✅ **v1.3 Elevation & Structures** - Phases 13-16 (shipped 2026-02-16)
- ✅ **v1.4 Infinite World & Seamless Chunks** - Phases 17-20 (shipped 2026-02-17)
- ✅ **v1.5 Movement Overhaul** - Phases 21-24 (shipped 2026-02-17)
- ✅ **v1.6 Inventory & Items** - Phases 25-29 (shipped 2026-02-18)
- 🚧 **v1.7 Character Stats** - Phases 30-32 (in progress)

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

<details>
<summary>✅ v1.6 Inventory & Items (Phases 25-29) - SHIPPED 2026-02-18</summary>

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
**Plans**: 4 plans in 3 waves

Plans:
- [x] 26-01-PLAN.md — Create InventoryService and update shared-types Inventory to exo-suit model
- [x] 26-02-PLAN.md — Add 5 @SubscribeMessage handlers and claim map for atomic pickup
- [x] 26-03-PLAN.md — Wire handleInteraction for pickup and emit inventory:update on auth
- [x] 26-04-PLAN.md — Add effectiveStats pure function to game-logic

#### Phase 27: Client State & Inventory Panel UI

**Goal**: Players can open their inventory, see all items in a grid with rarity colors, drag items to rearrange, hover for tooltips, and use or drop items via context menu
**Depends on**: Phase 26 (server emits `inventory:update` correctly)
**Requirements**: UI-01, UI-04, UI-06
**Success Criteria** (what must be TRUE):
  1. Player presses the inventory key — a 20-slot grid panel opens showing all carried items with icons colored by rarity tier
  2. Player hovers an item — a tooltip appears showing name (rarity-colored), description, category, rarity, ilvl, and required level; tooltip repositions correctly at panel edges
  3. Player drags an item from one slot to another — inventory reorders after server confirms; optimistic reorder does not occur before server response
  4. Player right-clicks an item and selects "Drop" — item disappears from inventory and a ground entity appears at the player's world position
**Plans**: 3 plans in 3 waves

Plans:
- [x] 27-01-PLAN.md — Create inventoryStore.ts with Zustand+immer; wire inventory:update; add inventory:reorder server endpoint
- [x] 27-02-PLAN.md — Build InventoryPanel.tsx with 20-slot dnd-kit grid, rarity colors, context menu drop
- [x] 27-03-PLAN.md — Build ItemTooltip with floating-ui; disable Phaser keyboard when inventory open

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
**Plans**: 3 plans in 2 waves

Plans:
- [x] 28-01-PLAN.md — Build EquipmentPanel.tsx with exo-suit slot, dynamic module slots, tool slots; lift DndContext to GameUI for cross-panel drag
- [x] 28-02-PLAN.md — Add ComputedStats to shared-types; include stats in inventory:update; add equipment:tool_swap handler; exo-suit unequip guard
- [x] 28-03-PLAN.md — Add stats display to HUD; level-gating visual feedback on items; Q hotkey for tool swap

#### Phase 29: Action Bar & Personal Storage

**Goal**: Players have an 8-slot hotbar with number-key shortcuts for quick consumable use, and a separate personal storage panel for extended item management
**Depends on**: Phase 28 (inventory and equipment systems stable)
**Requirements**: UI-03, UI-05
**Success Criteria** (what must be TRUE):
  1. Player drags a consumable from inventory to an action bar slot — pressing the corresponding number key (1-8) uses the item via the server without typing in chat input
  2. Action bar slot auto-greys when the referenced item is no longer in inventory (used, dropped, or moved) — confirmed after every `inventory:update`
  3. Player opens the personal storage panel — items stored there are separate from inventory and persist across sessions
**Plans**: 2 plans in 2 waves

Plans:
- [x] 29-01-PLAN.md — Build ActionBar.tsx with 8 slots, document keydown listener with chat-focus guard, localStorage persistence, orphan invalidation on inventory:update
- [x] 29-02-PLAN.md — Build PersonalStoragePanel.tsx with storage:open/update events, StorageService on server, grid view backed by player_storage DB table

See: `.planning/milestones/v1.6-ROADMAP.md`

</details>

### 🚧 v1.7 Character Stats (In Progress)

**Milestone Goal:** Implement the 8-stat character stats system (Durability, Toughness, Power, Haste, Vigor, Recovery, Perception, Resilience) with linear level scaling, equipment bonuses, server-authoritative computation, and a stat panel HUD with breakdown display. Stats system is designed for reuse by the future combat milestone.

**Phases:** 3 (30-32)
**Depth:** Quick (from config)
**Coverage:** 18/18 requirements mapped

#### Phase 30: Type Foundation & Pure Computation

**Goal**: The canonical `CharacterStats` type and `computeCharStats()` pure function exist in shared packages so every downstream layer can import them — no server or UI code is written until these compile and pass unit tests
**Depends on**: Phase 29 (v1.6 complete)
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04
**Success Criteria** (what must be TRUE):
  1. `CharacterStats` type is importable from `@into-the-void/shared-types` with all 8 primary stats; `PlayerStats` is replaced and the old 5-stat shape no longer compiles anywhere in the codebase
  2. `computeCharStats(level, equipment)` called with a level-10 character and no equipment returns base stats that are higher than the same call at level 1 — linear scaling is verifiable by unit test
  3. `computeCharStats(level, equipment)` called with a module that adds a Durability bonus returns a final Durability value greater than the base alone — equipment bonuses aggregate correctly
  4. `computeCharStats(level, equipment, 'creature')` returns stats using creature-specific scaling constants — same function, different scale factor, no separate code path
**Plans**: 2 plans in 2 waves

Plans:
- [x] 30-01-PLAN.md — Replace PlayerStats with CharacterStats in shared-types; update combat files and StatsJson
- [x] 30-02-PLAN.md — Create computeCharStats pure function with unit tests

#### Phase 31: Server Wiring & Socket Delivery

**Goal**: The server computes authoritative character stats after auth and every equip change, wires all 8 stats into existing gameplay systems, and emits them to the client via `stats:update`
**Depends on**: Phase 30 (CharacterStats type and computeCharStats() exist)
**Requirements**: STAT-05, STAT-06, STAT-07, STAT-08, STAT-09, STAT-10, STAT-11, STAT-12, STAT-13, STAT-14
**Success Criteria** (what must be TRUE):
  1. After login, the client receives a `stats:update` event containing all 8 computed stats including the breakdown of base vs equipment contribution — server never waits for client to request stats
  2. After equipping or unequipping any item, a new `stats:update` event is emitted within the same round trip as `inventory:update` — stats are never stale relative to equipment
  3. Existing character rows in the database carry the new 8-stat shape after the migration script runs — no character returns `undefined` for any of the 8 stat fields
  4. `calculateDamage()` in game-logic uses `power` and `toughness` stat names; `turn-order` uses `haste` — the old `strength`, `endurance`, `agility` references are gone and the codebase compiles cleanly
**Plans**: 3 plans in 2 waves

Plans:
- [x] 31-01-PLAN.md — Wire CharStatsPayload type and emitStats helper into GameGateway
- [x] 31-02-PLAN.md — Create statsStore.ts client store and migration script for characters.stats
- [x] 31-03-PLAN.md — Gap closure: Wire statsStore.ts import into GameUI.tsx

#### Phase 32: Client Display

**Goal**: Players can open a stats panel showing all 8 stats with a base vs equipment breakdown, receive a level-up notification with stat deltas, and see item tooltips compare stats against their currently equipped item
**Depends on**: Phase 31 (stats:update socket event delivers CharStatsPayload)
**Requirements**: STAT-15, STAT-16, STAT-17, STAT-18
**Success Criteria** (what must be TRUE):
  1. Player presses the stats toggle key — a panel opens showing all 8 stats by lore name (Durability, Toughness, Power, Haste, Vigor, Recovery, Perception, Resilience) with current values
  2. Each stat row in the panel shows the breakdown: base value, equipment bonus, and total — for example "Durability 115 (100 base + 15 from modules)"
  3. When a character levels up, an overlay notification appears for 3 seconds listing the stat deltas — for example "+5 Durability, +3 Power" — and then dismisses automatically
  4. Player hovers an unequipped item — the tooltip shows each stat bonus with a green or red delta indicator comparing it to the currently equipped item in the same slot
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 32-01-PLAN.md — Wire state foundations: statsStore level-up detection, gameStore stats toggle, P key handler, STAT_DISPLAY_ORDER constant
- [ ] 32-02-PLAN.md — Build StatsPanel.tsx with draggable panel and stat breakdown; LevelUpNotification.tsx with auto-dismiss
- [ ] 32-03-PLAN.md — Extend ItemTooltip with equippedItem prop for stat comparison; wire in InventoryPanel

## Progress

**Execution Order:**
Phases execute in numeric order: 30 → 31 → 32

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
| 26. Server InventoryService & WebSocket Handlers | v1.6 | 4/4 | Complete | 2026-02-17 |
| 27. Client State & Inventory Panel UI | v1.6 | 3/3 | Complete | 2026-02-17 |
| 28. Equipment System | v1.6 | 3/3 | Complete | 2026-02-18 |
| 29. Action Bar & Personal Storage | v1.6 | 2/2 | Complete | 2026-02-18 |
| 30. Type Foundation & Pure Computation | v1.7 | 2/2 | Complete | 2026-02-18 |
| 31. Server Wiring & Socket Delivery | v1.7 | 3/3 | Complete | 2026-02-18 |
| 32. Client Display | v1.7 | 3 | Planned | - |

**Total:** 32 phases (31 complete, 1 planned)

---
*Last updated: 2026-02-18 after Phase 32 planning complete*
