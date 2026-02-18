# Roadmap: Into the Void

## Milestones

- ✅ **v1.0 Auth & Character Screens** - Phases 1-3 (shipped 2026-02-14)
- ✅ **v1.1 Post-Login Game Experience** - Phases 4-7 (shipped 2026-02-16)
- ✅ **v1.2 Isometric View** - Phases 8-12 (shipped 2026-02-16)
- ✅ **v1.3 Elevation & Structures** - Phases 13-16 (shipped 2026-02-16)
- ✅ **v1.4 Infinite World & Seamless Chunks** - Phases 17-20 (shipped 2026-02-17)
- ✅ **v1.5 Movement Overhaul** - Phases 21-24 (shipped 2026-02-17)
- ✅ **v1.6 Inventory & Items** - Phases 25-29 (shipped 2026-02-18)
- ✅ **v1.7 Character Stats** - Phases 30-32 (shipped 2026-02-18)
- 🚧 **v1.8 Entity System** - Phases 33-38 (in progress)

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

<details>
<summary>✅ v1.7 Character Stats (Phases 30-32) - SHIPPED 2026-02-18</summary>

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
- [x] 32-01-PLAN.md — Wire state foundations: statsStore level-up detection, gameStore stats toggle, P key handler, STAT_DISPLAY_ORDER constant
- [x] 32-02-PLAN.md — Build StatsPanel.tsx with draggable panel and stat breakdown; LevelUpNotification.tsx with auto-dismiss
- [x] 32-03-PLAN.md — Extend ItemTooltip with equippedItem prop for stat comparison; wire in InventoryPanel

See: `.planning/milestones/v1.7-ROADMAP.md`

</details>

### v1.8 Entity System (In Progress)

**Milestone Goal:** Implement entity definition system with spawning, interaction, and loot. Entities include creatures (idle wander), plants, minerals, and artifacts — all interactable via tools with range-based interaction, perception gating, and a respawn system. The world gains a fertility noise layer that shapes spawn density by tile.

**Phases:** 6 (33-38)
**Depth:** Quick (from config)
**Coverage:** 50/50 requirements mapped

#### Phase 33: Foundation Types and Entity Definitions

**Goal**: Lore-correct entity types and the `packages/entities` registry exist as the single source of truth — all downstream phases build against these definitions; no server or client logic is written until the type contract is locked and compiles cleanly
**Depends on**: Phase 32 (v1.7 complete)
**Requirements**: ENTD-01, ENTD-02, ENTD-03, ENTD-04, ENTD-05, ENTD-06, ENTD-07, ENTD-08, ENTD-09, ENTD-10, ENTD-11
**Success Criteria** (what must be TRUE):
  1. `EntityRegistry.get(entityId)` returns a fully typed `EntityDefinition` for all ~35 entities (creatures, plants, minerals, artifacts) without error
  2. `CreatureBehavior` type is `herbivore | omnivore | predator | maniac` — the old `passive | neutral | aggressive | defensive` shape no longer compiles anywhere in the codebase
  3. `BiomeType` enum includes all 10 lore biomes including `miasma_marshes` and `petrified_expanse` — entity definitions reference only valid biome keys
  4. Every entity definition carries a `lootTableId` reference and `BIOME_SPAWN_CONFIGS` references only entity IDs present in the registry — no ID mismatch at startup
**Plans**: 3 plans in 3 waves

Plans:
- [x] 33-01-PLAN.md — Update shared-types: BiomeType to 10 entries, CreatureBehavior to lore values, EntityType with plant/artifact; fix downstream compilation errors
- [x] 33-02-PLAN.md — Create packages/entities workspace package with EntityRegistry and type definitions
- [x] 33-03-PLAN.md — Define ~35 entity definitions (creatures, plants, minerals, artifacts); update BIOME_SPAWN_CONFIGS to use ENTITY_IDS

#### Phase 34: Entity Lifecycle Persistence and Enriched Spawning

**Goal**: Entities spawning in the world carry complete registry data (health, speciesId, behavior), block player movement, and their death/respawn state survives zone eviction and server restarts via the `entity_lifecycle` database table
**Depends on**: Phase 33 (entity registry and type definitions exist)
**Requirements**: SPWN-04, PERS-01, PERS-02, PERS-05, INTR-08, EBLK-01, EBLK-02
**Success Criteria** (what must be TRUE):
  1. Entities that spawn in a zone display health bars with correct max health derived from their entity definition — not a hardcoded default
  2. A killed entity does not reappear when the zone is re-entered — the `entity_lifecycle` record suppresses its materialization until `respawnAt` elapses
  3. After a server restart, killed entities that have not yet reached their `respawnAt` time remain absent from the zone — respawn timers survive process death
  4. The client `entityStore.ts` Zustand store updates correctly on `entity:spawn`, `entity:update`, and `entity:despawn` socket events — entity state does not require a page reload to refresh
  5. Player cannot move onto a tile occupied by an entity — server rejects the move and pathfinding routes around entities
**Plans**: 4 plans in 2 waves

Plans:
- [x] 34-01-PLAN.md — Create entity_lifecycle DB table; enrich createEntityFromSpawn() with EntityRegistry data
- [x] 34-02-PLAN.md — Create entityStore.ts Zustand store with socket event wiring
- [x] 34-03-PLAN.md — Update EntityRenderer: always-visible health/yield bars for all entity types
- [x] 34-04-PLAN.md — Add entity blocking to pathfinding and server movement validation

#### Phase 35: Loot Tables, Tool Interaction, and Respawn

**Goal**: Players can use tools on entities in range to harvest resources and trigger loot drops that persist on the ground; a respawn tick loop reactivates depleted entities at their original spawn points after a randomized delay
**Depends on**: Phase 34 (entity lifecycle persistence in place; enriched entities exist in zones)
**Requirements**: LOOT-01, LOOT-02, LOOT-03, LOOT-04, LOOT-05, INTR-01, INTR-02, INTR-03, INTR-04, INTR-05, RESP-01, RESP-02, RESP-03, RESP-04, PERS-03, PERS-04
**Success Criteria** (what must be TRUE):
  1. Player equips a tool and sends `entity:tool_use` — the server validates range via `canInteract()` before processing; interaction from beyond the tool's range stat is silently rejected
  2. Creature death or mineral/plant depletion spawns ground items at the entity's position matching the entity's weighted loot table — items are visible to all players in the zone
  3. Ground items persist across zone evictions and server restarts — a player who logs out and returns finds loot still on the ground until it despawns or is picked up
  4. Depleted minerals and plants reappear at their original spawn point after a randomized delay — the respawn tick loop fires correctly even after server restart
  5. Artifacts do not respawn after being collected — their spawn point is permanently marked with `respawnTime: -1` and never re-materializes
**Plans**: 4 plans in 2 waves

Plans:
- [x] 35-01-PLAN.md — Create ground_items DB table; add rollLootTable() pure function to game-logic
- [x] 35-02-PLAN.md — Add tool range property to ItemDefinition; update existing tools with range values
- [x] 35-03-PLAN.md — Create EntityService with handleToolUse(), resolveLoot(), entity:tool_use event handler
- [x] 35-04-PLAN.md — Implement respawn tick loop processing entity_lifecycle records; artifact permanent removal

#### Phase 36: Creature AI Wander and Behavior Tick

**Goal**: Creatures move autonomously through the world based on their behavior type — herbivores flee nearby players while all types wander idly — with AI updates broadcast efficiently per zone and never stalling the server event loop
**Depends on**: Phase 35 (loot and interaction proven correct; entity state is stable)
**Requirements**: CRAI-01, CRAI-02, CRAI-03, CRAI-04, CRAI-05, CRAI-06, CRAI-07, CRAI-08, EBLK-03
**Success Criteria** (what must be TRUE):
  1. Creatures in a zone with active players visibly wander to adjacent tiles — movement updates arrive via `entity:update` socket events and the client interpolates creatures to new positions
  2. A herbivore creature within 5 tiles of a player moves away from the player rather than wandering randomly — flee behavior is observable and consistent
  3. Zones with no active players have no AI tick running — the server does not process creature movement for empty zones
  4. The AI tick does not produce observable lag or stutter — tick duration is logged and a warning fires if processing exceeds the configured threshold
  5. If a creature moves into a tile on the player's click-to-move path, the path stops at that point — player does not walk through creatures
**Plans**: 4 plans in 2 waves

Plans:
- [ ] 36-01-PLAN.md — Create AiService with self-rescheduling setTimeout pattern scoped to activePlayerZones
- [ ] 36-02-PLAN.md — Implement tickCreatureAI() pure FSM in game-logic with herbivore/omnivore/predator/maniac states
- [ ] 36-03-PLAN.md — Wire batched entity:update broadcasts per zone per tick; integrate AiService with GameGateway lifecycle
- [ ] 36-04-PLAN.md — Client path interruption when creature moves into path; update blocked tiles on entity:update

#### Phase 37: Fertility Noise and Biome Spawn Quality

**Goal**: Spawn density across the world varies by a fertility noise layer — Lush tiles spawn more entities than Barren tiles — and the zone HUD shows the player what fertility tier they are standing in
**Depends on**: Phase 35 (spawning pipeline proven correct with enriched entities)
**Requirements**: SPWN-01, SPWN-02, SPWN-03, SPWN-05, UIHD-01
**Success Criteria** (what must be TRUE):
  1. The zone HUD displays fertility type as "Biome Name (Fertility)" — for example "Crystal Flats (Lush)" — and updates when the player crosses into a different fertility zone
  2. Lush areas visibly contain more entities per chunk than Barren areas — the density difference is observable by moving between fertility zones
  3. Entities spawning at biome-edge tiles come from the correct biome's spawn table — a creature appropriate to a Crystal Flats tile does not spawn on an adjacent Miasma Marshes tile
  4. No zone exceeds spawn density caps (15 creatures, 10 minerals, 5 plants, 2 artifacts per chunk) regardless of fertility tier
**Plans**: TBD

Plans:
- [ ] 37-01: Add getFertilityAt() to world-gen using second SimplexNoise instance; fertility multiplier per spawn position
- [ ] 37-02: Replace chunk-center biome sampling with per-tile sampling in generateSpawnPoints(); apply density caps
- [ ] 37-03: Add fertility type to zone state payload; update ZoneHUD to display "Biome (Fertility)" format

#### Phase 38: Perception Gating and Client Polish

**Goal**: Players cannot read entity information beyond their perception stat threshold, AI state is never exposed in server broadcasts, and spawning/depletion events have visual feedback that makes the world feel alive
**Depends on**: Phase 36 (AI broadcasts established) and Phase 37 (fertility and spawning complete)
**Requirements**: INTR-06, INTR-07, CRAI-09, UIHD-02, UIHD-03
**Success Criteria** (what must be TRUE):
  1. An entity whose level exceeds `player.perception * 3` displays as "???" for name and level in the client — the real values are in the payload but the renderer suppresses them
  2. A player whose level is more than 5 below an entity's level cannot interact with it — the server rejects the `entity:tool_use` event and the client shows a gating message
  3. AI internal state (FSM state, wander target, aggro flag) is absent from `entity:update` broadcasts — a client inspecting socket payloads sees only position and health
  4. Entities fade in smoothly when spawned or respawned — the spawn event triggers a client-side fade-in animation rather than instant appearance
  5. Minerals and plants show proportional visual depletion as yield decreases — a half-depleted mineral looks visually different from a full one
**Plans**: TBD

Plans:
- [ ] 38-01: Strip AI state from entity:update broadcasts in AiService before emission
- [ ] 38-02: Add perception gating and level gating rendering logic to EntityRenderer; level gating server-side check in EntityService
- [ ] 38-03: Entity fade-in animation on spawn/respawn; harvest depletion visual on minerals/plants

## Progress

**Execution Order:**
Phases execute in numeric order: 33 -> 34 -> 35 -> 36 -> 37 -> 38

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
| 32. Client Display | v1.7 | 3/3 | Complete | 2026-02-18 |
| 33. Foundation Types and Entity Definitions | v1.8 | 3/3 | Complete | 2026-02-18 |
| 34. Entity Lifecycle Persistence and Enriched Spawning | v1.8 | 4/4 | Complete | 2026-02-18 |
| 35. Loot Tables, Tool Interaction, and Respawn | v1.8 | 4/4 | Complete | 2026-02-18 |
| 36. Creature AI Wander and Behavior Tick | v1.8 | 0/4 | Planned | - |
| 37. Fertility Noise and Biome Spawn Quality | v1.8 | TBD | Not started | - |
| 38. Perception Gating and Client Polish | v1.8 | TBD | Not started | - |

**Total:** 38 phases (35 complete, 3 remaining)

---
*Last updated: 2026-02-18 after Phase 36 planned*
