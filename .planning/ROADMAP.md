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
- ✅ **v1.8 Entity System** - Phases 33-38 (shipped 2026-02-19)
- ✅ **v1.9 Combat System** - Phases 39-42 (shipped 2026-02-19)
- ✅ **v1.10 Combat UX** - Phases 43-45 (shipped 2026-02-19)
- 🚧 **v1.11 NPCs & Trading** - Phases 46-50 (in progress)

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

<details>
<summary>✅ v1.8 Entity System (Phases 33-38) - SHIPPED 2026-02-19</summary>

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
- [x] 36-01-PLAN.md — Create AiService with self-rescheduling setTimeout pattern scoped to activePlayerZones
- [x] 36-02-PLAN.md — Implement tickCreatureAI() pure FSM in game-logic with herbivore/omnivore/predator/maniac states
- [x] 36-03-PLAN.md — Wire batched entity:batch broadcasts per zone per tick; integrate AiService with GameGateway lifecycle
- [x] 36-04-PLAN.md — Client path interruption when creature moves into path; update blocked tiles on entity:update

#### Phase 37: Fertility Noise and Biome Spawn Quality

**Goal**: Spawn density across the world varies by a fertility noise layer — Lush tiles spawn more entities than Barren tiles — and the zone HUD shows the player what fertility tier they are standing in
**Depends on**: Phase 35 (spawning pipeline proven correct with enriched entities)
**Requirements**: SPWN-01, SPWN-02, SPWN-03, SPWN-05, UIHD-01
**Success Criteria** (what must be TRUE):
  1. The zone HUD displays fertility type as "Biome Name (Fertility)" — for example "Crystal Flats (Lush)" — and updates when the player crosses into a different fertility zone
  2. Lush areas visibly contain more entities per chunk than Barren areas — the density difference is observable by moving between fertility zones
  3. Entities spawning at biome-edge tiles come from the correct biome's spawn table — a creature appropriate to a Crystal Flats tile does not spawn on an adjacent Miasma Marshes tile
  4. No zone exceeds spawn density caps (15 creatures, 10 minerals, 5 plants, 2 artifacts per chunk) regardless of fertility tier
**Plans**: 3 plans in 2 waves

Plans:
- [x] 37-01-PLAN.md — Add getFertilityAt() to BiomeGenerator; update generateSpawnPoints signature to accept BiomeGenerator
- [x] 37-02-PLAN.md — Implement fertility multiplier, per-tile biome sampling, and density caps in spawn.ts
- [x] 37-03-PLAN.md — Add fertilityType to ZoneState; display "Biome (Fertility)" in HUD

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
**Plans**: 4 plans in 2 waves

Plans:
- [x] 38-01-PLAN.md — Strip AI state from entity:batch broadcasts; wire entity:batch to WorldScene
- [x] 38-02-PLAN.md — Add perception gating to EntityRenderer; level gating server-side check in EntityService
- [x] 38-03-PLAN.md — Entity fade-in animation on spawn/respawn; yield bar depletion visual update
- [x] 38-04-PLAN.md — Gap closure: Wire error event handler for level-gating rejection messages

</details>

<details>
<summary>✅ v1.9 Combat System (Phases 39-42) - SHIPPED 2026-02-19</summary>

**Milestone Goal:** Implement PvE auto-attack combat with creature aggro, damage calculation using Power/Toughness stats, creature chase/leash behavior, player death with safe respawn, and combat HUD feedback including damage numbers and combat state indicators.

**Phases:** 4 (39-42)
**Depth:** Quick (from config)
**Coverage:** 17/17 requirements mapped

#### Phase 39: Combat Core and Damage Calculation

**Goal**: Players can engage creatures in combat by clicking with a combat tool equipped — the auto-attack loop deals damage every tick using Power vs Toughness calculation, with Haste affecting attack speed
**Depends on**: Phase 38 (v1.8 complete — entity system, AI tick loop, tool interaction)
**Requirements**: COMB-01, COMB-02, COMB-03, COMB-04
**Success Criteria** (what must be TRUE):
  1. Player clicks a creature while holding a combat tool — the player enters combat and begins auto-attacking every tick (base ~1 second)
  2. Damage dealt equals attacker Power minus a Toughness-based reduction — observable by comparing damage numbers across creatures with different Toughness values
  3. A player with higher Haste stat attacks more frequently than a player with base Haste — attack interval visibly decreases
  4. Creature health decreases with each attack and creature dies when health reaches zero — death triggers existing loot drop from v1.8
**Plans**: 4 plans in 3 waves (completed 2026-02-19)

Plans:
- [x] 39-01-PLAN.md — Create CombatService with startCombat(), stopCombat(), getSession(); wire combat:start client event
- [x] 39-02-PLAN.md — Add attackTick() and processCombatTick() to CombatService; integrate with AiService tick loop; emit combat:damage
- [x] 39-03-PLAN.md — Add calculateAttackInterval() pure function; wire Haste stat to per-player attack timing
- [x] 39-04-PLAN.md — Gap closure: Fix Toughness damage reduction (armorReduction derivation)

#### Phase 40: Creature Combat AI and Aggro

**Goal**: Creatures with aggressive behaviors (predators, maniacs) automatically attack nearby players, omnivores retaliate when attacked, and all combat creatures have a state machine for attacking, chasing, and returning to spawn
**Depends on**: Phase 39 (combat core — creatures can take and deal damage)
**Requirements**: AGGR-01, AGGR-02, AGGR-03, CSTA-01, CSTA-02, CSTA-03, CSTA-04
**Success Criteria** (what must be TRUE):
  1. A predator or maniac creature within ~5 tiles of a player automatically targets and attacks the player — no player action required to trigger aggro
  2. An omnivore creature ignores players until the player attacks it — then the omnivore retaliates
  3. Herbivores continue to flee from players without change from v1.8 — no combat behavior added
  4. A player who moves away from a creature is chased up to ~10 tiles from the creature's spawn point — beyond that distance the creature returns to spawn
  5. Combat ends when either combatant dies, the player leaves range, or the creature exceeds leash distance — both sides exit combat state
**Plans**: 3 plans in 2 waves (completed 2026-02-19)

Plans:
- [x] 40-01-PLAN.md — Add spawnPosition and combatTarget to Creature interface; extend tickCreatureAI FSM with combat states and aggro detection
- [x] 40-02-PLAN.md — Add creature combat session tracking to CombatService; wire AiService to handle FSM aggro/attack intents
- [x] 40-03-PLAN.md — Complete leash system with return-to-spawn behavior and combat termination

#### Phase 41: Player Death and Respawn

**Goal**: Players who reach zero health die and respawn at their faction's safe point with no item or XP loss — death is forgiving but meaningful
**Depends on**: Phase 40 (creatures can deal damage to players)
**Requirements**: DEAT-01, DEAT-02, DEAT-03
**Success Criteria** (what must be TRUE):
  1. When player health reaches zero, the player dies — character is removed from combat and cannot move or act
  2. Dead player automatically respawns at their faction hub / safe point after a short delay (~3 seconds) — position is faction-specific
  3. Player retains all items and XP after death — inventory and stats are unchanged post-respawn
  4. Other players see the death (player disappears) and respawn (player reappears at hub) — multiplayer visibility maintained
**Plans**: 3 plans in 2 waves

Plans:
- [x] 41-01-PLAN.md — Add player death detection in combat tick; emit player:death event; define faction respawn coordinates
- [x] 41-02-PLAN.md — Implement respawn logic in PlayerService; teleport to faction hub; emit player:respawn event
- [x] 41-03-PLAN.md — Emit zone:state to respawning player so client loads correct zone tiles (gap closure)

#### Phase 42: Combat Feedback and HUD

**Goal**: Players receive clear visual feedback during combat — damage numbers float above targets, an "In Combat" indicator appears in the HUD, and health bars update in real-time
**Depends on**: Phase 41 (full combat loop complete — player can die and respawn)
**Requirements**: FEED-01, FEED-02, FEED-03
**Success Criteria** (what must be TRUE):
  1. When a creature or player takes damage, a floating number appears above them showing the damage amount — numbers fade out after ~1 second
  2. The HUD displays "In Combat" indicator when the player is in active combat — indicator disappears when combat ends
  3. Health bars update immediately when damage is dealt — no delay between combat:damage event and visual update
  4. Damage numbers use appropriate colors — red for damage dealt to player, white for damage dealt to creatures
**Plans**: 2 plans in 1 wave

Plans:
- [x] 42-01-PLAN.md — Add FloatingDamage component to EntityRenderer; animate damage numbers on combat:damage event
- [x] 42-02-PLAN.md — Add combat state indicator to HUD; wire combatStore to track in-combat status

</details>

<details>
<summary>✅ v1.10 Combat UX (Phases 43-45) - SHIPPED 2026-02-19</summary>

**Milestone Goal:** Complete the combat user experience with click-to-attack targeting, visual target selection, and combat log feedback. Closes the aggro bug from v1.9 and adds all missing player-facing combat interactions.

**Phases:** 3 (43-45)
**Depth:** Quick (from config)
**Coverage:** 14/14 requirements mapped

#### Phase 43: Click-to-Attack and Bug Fix

**Goal**: Players can initiate combat by clicking a creature with a combat tool equipped, with attack range enforced per-tool, and predator/maniac creatures correctly aggro on nearby players
**Depends on**: Phase 42 (v1.9 complete — combat loop, damage numbers, HUD indicator)
**Requirements**: FIX-01, CATK-01, CATK-02, CATK-03, CATK-04
**Success Criteria** (what must be TRUE):
  1. Player equips a melee combat tool and clicks a creature within 1 tile — auto-attack begins immediately; clicking the same creature with a ranged tool from beyond 1 tile and within 3-5 tiles also starts combat
  2. Player clicks a creature that is outside the equipped tool's attack range — no combat starts and no error appears; the click is silently ignored
  3. A predator or maniac creature that spawns within ~5 tiles of a player automatically begins chasing and attacking without any player interaction — aggro triggers consistently on zone load and respawn
  4. Entity sprites in the Phaser canvas respond to pointer-down events — clicking on a creature's visual area registers as a creature click, not a tile click
  5. Combat tool attack ranges are defined per tool (melee=1 tile, ranged tools between 3 and 5 tiles based on item definition) — range is not a global constant
**Plans**: 2 plans in 1 wave

Plans:
- [x] 43-01-PLAN.md — Make entity sprites interactive; add entity click handler; emit combat:start on creature click
- [x] 43-02-PLAN.md — Fix predator/maniac aggro bug; add immediate aggro check on zone activation and player join

#### Phase 44: Target Selection UI

**Goal**: Players can see which entity they are targeting during combat — a visible highlight persists on the target, switches when the player clicks a different creature, and clears automatically when combat ends
**Depends on**: Phase 43 (click-to-attack working — player can enter combat via creature click)
**Requirements**: TARG-01, TARG-02, TARG-03, TARG-04
**Success Criteria** (what must be TRUE):
  1. Player clicks a creature to start combat — a visual highlight (glow, outline, or marker) appears on that creature immediately; the highlight is visible over the creature's sprite
  2. The target highlight persists on the creature throughout the combat session — it does not flicker or disappear while the auto-attack loop is running
  3. Player clicks a different creature while already in combat — the highlight moves to the new creature and auto-attack retargets
  4. Combat ends (creature dies, player dies, creature leashes, or player moves out of range) — the target highlight disappears and no entity appears highlighted
**Plans**: 2 plans in 1 wave

Plans:
- [x] 44-01-PLAN.md — Create TargetHighlight class with pulsing ring; wire to WorldScene and combatStore
- [x] 44-02-PLAN.md — Create TargetFrame HUD component with health bar, name, level, damage flash

#### Phase 45: Combat Log

**Goal**: Players can see a scrollable log of combat events — damage dealt and received with timestamps — and toggle the log panel visible or hidden
**Depends on**: Phase 44 (target selection UI complete — combat interactions are fully established)
**Requirements**: CLOG-01, CLOG-02, CLOG-03, CLOG-04, CLOG-05
**Success Criteria** (what must be TRUE):
  1. When the player deals damage to a creature, a timestamped entry appears in the combat log panel showing the damage amount — for example "[00:42] Hit Voidcrawler for 34 damage"
  2. When the player receives damage from a creature, a timestamped entry appears showing the damage amount — entries for incoming and outgoing damage are visually distinct
  3. The combat log is scrollable — older entries remain accessible by scrolling up; newest entries appear at the bottom
  4. Player presses the combat log toggle key (or clicks a toggle button) — the panel hides completely and re-appears on second press; hidden state persists until toggled again
**Plans**: 1 plan in 1 wave

Plans:
- [x] 45-01-PLAN.md — Create combatLogStore, CombatLog component, and L key toggle

</details>

### v1.11 NPCs & Trading (In Progress)

**Milestone Goal:** Implement faction orbital hubs as instanced safe zones, a credits currency system, hub travel via portals and recall, an NPC definition system with 5 types and fixed hub spawns, an interaction window with portrait and linear dialogue, and a trading system for buy/sell commerce with credit price spreads.

**Phases:** 5 (46-50)
**Depth:** Quick (from config)
**Coverage:** 28/28 requirements mapped

#### Phase 46: Currency and Hub Foundation

**Goal**: The credits currency type exists in the database and HUD, and the four faction orbital hubs exist as discrete, safe, instanced zones that players can walk around using the existing movement system
**Depends on**: Phase 45 (v1.10 complete)
**Requirements**: CURR-01, CURR-02, HUB-01, HUB-02, HUB-03, HUB-05
**Success Criteria** (what must be TRUE):
  1. Player HUD shows a credits balance (e.g., "1,000 cr") that is non-zero for a new character seeded with starting credits and persists after logging out and back in
  2. The four faction hub zones exist as server-side instanced areas separate from open-world coordinates — loading into a hub does not replace or corrupt open-world zone state
  3. A hub zone returns no combat events and no hostile creature spawns — attempting to start combat in a hub is rejected by the server
  4. Player can move freely inside a hub using WASD and click-to-move — the existing movement system works without modification
**Plans**: 3 plans in 2 waves

Plans:
- [x] 46-01-PLAN.md — Credits DB column and HUD display
- [x] 46-02-PLAN.md — Hub zone definitions and instancing (4 faction hubs)
- [x] 46-03-PLAN.md — Hub safe zone enforcement (no combat, no hostile spawns)

#### Phase 47: Hub Travel

**Goal**: Players can travel to their faction hub from the open world via portal structures, return instantly from anywhere via a recall ability, and leave the hub back to their last open-world position
**Depends on**: Phase 46 (hub zones exist and are loadable)
**Requirements**: TRVL-01, TRVL-02, TRVL-03, TRVL-04
**Success Criteria** (what must be TRUE):
  1. Portal structures appear in open-world zones — walking up to and interacting with a portal teleports the player into their faction's hub zone
  2. Player presses the recall hotkey from anywhere in the open world — they are immediately teleported to their faction hub; the last open-world position is saved for return
  3. Player uses the "Leave Hub" action or portal within the hub — they are teleported back to the exact open-world position they left from
  4. Hub arrival and departure are visible to other players in both zones — players appear and disappear correctly on zone transitions
**Plans**: 5 plans in 3 waves (completed 2026-02-20)

Plans:
- [x] 47-01-PLAN.md — Portal structure tile type and open-world placement
- [x] 47-02-PLAN.md — Portal interaction handler and hub teleport (save/restore world position)
- [x] 47-03-PLAN.md — Recall hotkey (H key) and leave-hub mechanic
- [x] 47-04-PLAN.md — Client-side portal tile detection (gap closure)
- [x] 47-05-PLAN.md — Hub portal tile placement (gap closure)

#### Phase 48: NPC Definition System and Hub Spawns

**Goal**: The NPC definition registry exists with all 5 NPC types, NPCs have a visual representation in the hub, are fixed at designated spawn positions, and are non-hostile
**Depends on**: Phase 46 (hub zones exist with tile layouts to place NPCs in)
**Requirements**: HUB-04, NPCD-01, NPCD-02, NPCD-03, NPCD-04
**Success Criteria** (what must be TRUE):
  1. `NpcRegistry.get(npcId)` returns a typed `NpcDefinition` with type, name, dialogue lines, and inventory for all defined NPCs without error
  2. Each hub contains at least one NPC of each of the 5 types (Trader, Guard, Faction Rep, Ambient, Service) — they appear at fixed tile positions within the hub
  3. NPCs have a visible representation in the Phaser canvas — either a sprite or a distinct colored placeholder tile with a nameplate
  4. Clicking an NPC does not initiate combat — the server rejects any combat:start event targeting an NPC, and the NPC cannot be targeted by combat tools
**Plans**: 3 plans in 3 waves

Plans:
- [x] 48-01-PLAN.md — Create @into-the-void/npcs package with NpcDefinition types and NpcRegistry singleton
- [x] 48-02-PLAN.md — Define 20 NPCs for all 4 faction hubs (5 types each) with spawn positions
- [x] 48-03-PLAN.md — NPC spawning in hub zones, rendering with nameplates, combat targeting rejection

#### Phase 49: NPC Interaction Window

**Goal**: Players can click any NPC to open an interaction modal showing the NPC's portrait, name, type, and dialogue text, with action buttons appropriate to the NPC type, and close the window to resume gameplay
**Depends on**: Phase 48 (NPCs are visible and clickable in hubs)
**Requirements**: NPCI-01, NPCI-02, NPCI-03, NPCI-04, NPCI-05
**Success Criteria** (what must be TRUE):
  1. Player clicks an NPC in the hub — an interaction modal opens showing the NPC's portrait (or colored placeholder), name, and type label
  2. The modal displays the NPC's dialogue text — for a Trader it reads something like "Looking to trade? I've got supplies for your expeditions." and the text is drawn from the NPC definition
  3. Action buttons appear based on NPC type — the Trader NPC shows a "Trade" button; a Guard shows no action buttons; a Service NPC shows a relevant service button
  4. Player clicks the close button or presses Escape — the interaction modal closes and the player can move and interact with the world again; Phaser input is re-enabled
**Plans**: 3 plans in 2 waves

Plans:
- [x] 49-01-PLAN.md — npcStore Zustand store; npc:interact socket event; server handler returns NPC definition
- [x] 49-02-PLAN.md — NpcInteractionModal.tsx with portrait, name, type label, dialogue text
- [x] 49-03-PLAN.md — Action buttons per NPC type; Escape key dismissal; Phaser input guard

#### Phase 50: Trading System

**Goal**: Players can open a trader's inventory, buy items with credits deducted, sell items from their inventory with credits added, with a price spread between buy and sell, and all transactions validated for sufficient credits and inventory space
**Depends on**: Phase 49 (interaction window exists — Trade button opens trader UI) and Phase 46 (credits exist in DB)
**Requirements**: CURR-03, CURR-04, TRAD-01, TRAD-02, TRAD-03, TRAD-04, TRAD-05, TRAD-06
**Success Criteria** (what must be TRUE):
  1. Player opens a Trader NPC and sees a panel listing the trader's available items with buy prices in credits — each item shows name, quantity, and credit cost
  2. Player clicks "Buy" on an item they can afford — credits are deducted from their balance, the item appears in their inventory, and the HUD credit balance updates immediately
  3. Player selects an item from their inventory in the trade panel and clicks "Sell" — the item is removed from inventory, credits are added to balance, and the HUD updates
  4. Sell price displayed is lower than buy price for the same item — the spread is consistent and drawn from the NPC definition or item definition
  5. Player attempts to buy an item without sufficient credits — the transaction is rejected by the server, credits are unchanged, and the client shows an insufficient funds message
  6. Player attempts to buy an item when inventory is full — the transaction is rejected by the server and the client shows an inventory full message
**Plans**: 4 plans in 3 waves

Plans:
- [ ] 50-01-PLAN.md — Trade DB operations (deductCredits, addCredits) and socket event types
- [ ] 50-02-PLAN.md — TradeService with buy/sell handlers; trade:buy and trade:sell socket events
- [ ] 50-03-PLAN.md — TradingPanel.tsx with trader inventory, buy interface, and sell interface
- [ ] 50-04-PLAN.md — Credit balance sync to client via credits:update socket event

## Progress

**Execution Order:**
Phases execute in numeric order: 46 -> 47 -> 48 -> 49 -> 50

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
| 36. Creature AI Wander and Behavior Tick | v1.8 | 4/4 | Complete | 2026-02-18 |
| 37. Fertility Noise and Biome Spawn Quality | v1.8 | 3/3 | Complete | 2026-02-18 |
| 38. Perception Gating and Client Polish | v1.8 | 4/4 | Complete | 2026-02-19 |
| 39. Combat Core and Damage Calculation | v1.9 | 4/4 | Complete | 2026-02-19 |
| 40. Creature Combat AI and Aggro | v1.9 | 3/3 | Complete | 2026-02-19 |
| 41. Player Death and Respawn | v1.9 | 3/3 | Complete | 2026-02-19 |
| 42. Combat Feedback and HUD | v1.9 | 2/2 | Complete | 2026-02-19 |
| 43. Click-to-Attack and Bug Fix | v1.10 | 2/2 | Complete | 2026-02-19 |
| 44. Target Selection UI | v1.10 | 2/2 | Complete | 2026-02-19 |
| 45. Combat Log | v1.10 | 1/1 | Complete | 2026-02-19 |
| 46. Currency and Hub Foundation | v1.11 | 3/3 | Complete | 2026-02-19 |
| 47. Hub Travel | v1.11 | 5/5 | Complete | 2026-02-20 |
| 48. NPC Definition System and Hub Spawns | v1.11 | 3/3 | Complete | 2026-02-20 |
| 49. NPC Interaction Window | v1.11 | 3/3 | Complete | 2026-02-20 |
| 50. Trading System | v1.11 | 4/4 | Not started | - |

**Total:** 50 phases (49 complete, 1 remaining)

---
*Last updated: 2026-02-20 after Phase 50 planning complete*
