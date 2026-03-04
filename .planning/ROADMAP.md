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
- ✅ **v1.11 NPCs & Trading** - Phases 46-50 (shipped 2026-02-20)
- ✅ **v1.12 Bug Fixes & Content Polish** - Phases 51-55 (shipped 2026-02-20)
- ✅ **v1.13 Active Combat Abilities** - Phases 56-58 (shipped 2026-02-21)
- ✅ **v1.14 Equipment Stats Overhaul** - Phases 59-63 (shipped 2026-02-21)
- ✅ **v1.15 Quest System** - Phases 64-69 (shipped 2026-02-22)
- ✅ **v1.16 UI Polish** - Phases 70-75 (shipped 2026-02-23)
- ✅ **v1.17 Core Gameplay Loop** - Phases 76-81 (shipped 2026-02-23)
- ✅ **v1.18 Content Expansion** - Phases 82-88 (shipped 2026-02-24)
- ✅ **v1.19 Deployment & CI/CD** - Phases 89-93 (shipped 2026-02-24)
- ✅ **v1.20 World Scale & Action Bar** - Phases 94-98 (shipped 2026-02-26)
- ✅ **v1.21 UI Polish & Audio** - Phases 99-102 (shipped 2026-02-26)
- ✅ **v1.22 In-Game Chat** - Phases 103-107 (shipped 2026-02-26)
- ✅ **v1.23 Content Expansion & Faction Gear** - Phases 108-114 (shipped 2026-03-03)
- 🚧 **v1.24 Balance & Automation** - Phases 115-121 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.21 (Phases 1-102) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

<details>
<summary>✅ v1.22 In-Game Chat (Phases 103-107) - SHIPPED 2026-02-26</summary>

- [x] **Phase 103: Chat Foundation** - Fix socket dispatch, keyboard isolation, server validation (completed 2026-02-26)
- [x] **Phase 104: Moderation Persistence** - Mute/block DB tables and REST endpoints (completed 2026-02-26)
- [x] **Phase 105: ChatService & Channel Routing** - Server-side routing for all five channels (completed 2026-02-26)
- [x] **Phase 106: Chat Panel UI** - Tabbed panel, unread indicators, per-channel message views (completed 2026-02-26)
- [x] **Phase 107: Moderation Controls** - Right-click mute/block/whisper context menu (completed 2026-02-26)

</details>

<details>
<summary>✅ v1.23 Content Expansion & Faction Gear (Phases 108-114) - SHIPPED 2026-03-03</summary>

- [x] **Phase 108: Entity Validation Infrastructure** - Test suite gating all subsequent content authoring (completed 2026-03-02)
- [x] **Phase 109: Faction Identity Design Gate** - Design artifact locking stat archetypes, ability matrices, naming conventions (completed 2026-03-02)
- [x] **Phase 110: Biome Creature Population** - All 16 biomes reach 4-6 creatures with behavioral variety (completed 2026-03-02)
- [x] **Phase 111: Biome Plants, Minerals, and Artifacts** - All 16 biomes reach 3-4 plants, 2-3 minerals, 1-2 artifacts (completed 2026-03-03)
- [x] **Phase 112: Faction Suits** - Verdant, Helix, Nexus, Unaffiliated suit lines across all tiers (completed 2026-03-03)
- [x] **Phase 113: Faction Modules and Tools** - Bio/sensor/armor module lines and faction-specialized tool lines (completed 2026-03-03)
- [x] **Phase 114: Integration and Lore Verification** - All new content verified in registries and cross-checked against lore (completed 2026-03-03)

</details>

### 🚧 v1.24 Balance & Automation (In Progress)

**Milestone Goal:** Introduce situational combat depth (damage types, biome hazards, creature AI upgrades), rebalance abilities so defensive/utility skills have purpose, and build the automation progression arc from manual gathering to planetary extractors.

- [x] **Phase 115: Shared Type Foundation** - DamageType union, DamageResistances, shield/damage_reduction AbilityEffect variants, DeployableEntity interface, AiTickResult behavior signals (completed 2026-03-03)
- [x] **Phase 116: Stat Caps** - Soft cap at 200 with diminishing returns, hard cap at 400, stats panel indicator (completed 2026-03-03)
- [x] **Phase 117: Damage Types and Creature Resistances** - DamageType threaded through calculateDamage(), resistances on all 83+ creatures, color-coded floating numbers (completed 2026-03-03)
- [ ] **Phase 118: Ability Rebalance** - Plasma Burst nerfed, defensive abilities overhauled with real shield/DR mechanics, all 13 rebalanced abilities live
- [ ] **Phase 119: Creature AI Upgrades** - Stampede, Pack Call, Ambush, Frenzy behaviors with zone-level pre-processing
- [ ] **Phase 120: Biome Hazard System** - HazardService with per-player state cache, HP drain, stat debuffs, gear counters, HUD indicator
- [ ] **Phase 121: Automation Tech Tree** - T2 extractors through T5 refinery, AutomationService, deployables DB table, automation panel HUD

## Phase Details

### Phase 103: Chat Foundation
**Goal**: The end-to-end chat pipeline is unbroken — messages dispatched by the server actually arrive at clients, the shared type system covers all five channels, typing in chat does not move the player, and every incoming message is validated server-side before routing
**Depends on**: Phase 102 (ESC Centralization)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. A message sent on zone chat from one client is visibly received by another client in the same zone (the socket dispatch bug is fixed)
  2. A player typing WASD letters into the chat input does not move their character
  3. A message exceeding 280 characters or an empty message is rejected by the server with no delivery to any client
  4. Sending more than 5 messages in rapid succession results in subsequent messages being silently dropped by the rate limiter
**Plans**: 2 plans
  - [x] 103-01-PLAN.md -- Client-side chat delivery fix and keyboard isolation (INFRA-01, INFRA-02)
  - [x] 103-02-PLAN.md -- Server-side message validation and rate limiting (INFRA-03, INFRA-04)

### Phase 104: Moderation Persistence
**Goal**: The database has mute and block tables and the REST API exposes CRUD endpoints for them, so moderation state can be loaded on login and enforced server-side before any moderation UI is built
**Depends on**: Phase 103
**Requirements**: MOD-04
**Success Criteria** (what must be TRUE):
  1. A mute entry created via the REST API is present in the database and returned by the GET moderation endpoint on a subsequent request
  2. A block entry survives a full browser refresh and is returned correctly when the client loads moderation state after re-authentication
  3. Deleting a mute or block entry via the REST API removes it from the DB and subsequent GET responses no longer include it
**Plans**: 2 plans
  - [x] 104-01-PLAN.md -- DB schema tables (player_mutes, player_blocks) + query functions (MOD-04)
  - [x] 104-02-PLAN.md -- NestJS REST moderation module with CRUD endpoints (MOD-04)

### Phase 105: ChatService & Channel Routing
**Goal**: All five chat channels route correctly from a single server-side ChatService — zone and global via Socket.IO rooms, faction via faction rooms joined at auth (and preserved across zone transitions), local via proximity distance check, and whispers via target lookup with server-enforced block
**Depends on**: Phase 104
**Requirements**: CHAN-01, CHAN-02, CHAN-03, CHAN-04, CHAN-05
**Success Criteria** (what must be TRUE):
  1. A zone chat message is received only by players in the same zone, not by players in other zones
  2. A global chat message is received by all authenticated players on the server
  3. A faction chat message is received only by players of the same faction, including after one of them transitions to a different zone
  4. A local chat message is received only by players within ~15 tiles of the sender, not by players outside that radius
  5. A whisper sent to Player B is received only by Player B; if Player B has blocked the sender, the whisper is silently refused and the sender receives a system notice
**Plans**: 2 plans

### Phase 106: Chat Panel UI
**Goal**: Players have a always-visible tabbed chat panel in the bottom-left of the HUD with per-channel message views, a text input that sends on Enter, unread indicators on inactive tabs, and formatted messages showing sender, timestamp, and channel color
**Depends on**: Phase 105
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. The chat panel is visible in the bottom-left of the game HUD at all times without overlapping the minimap or action bars
  2. Clicking a channel tab switches the visible message list to that channel and clears its unread badge
  3. Typing a message and pressing Enter sends it on the active channel and clears the input field
  4. An unread message indicator (badge or dot) appears on inactive channel tabs when a new message arrives on that channel
  5. Each message displays the sender's name, a timestamp, and text rendered in the color associated with that channel
**Plans**: 2 plans

### Phase 107: Moderation Controls
**Goal**: Players can mute any sender to hide their messages and block any sender to prevent whispers, with right-click access from the chat panel, unmute/unblock capability, and state persisted across sessions via the REST API
**Depends on**: Phase 106
**Requirements**: MOD-01, MOD-02, MOD-03, MOD-05
**Success Criteria** (what must be TRUE):
  1. After muting a player, their messages no longer appear in the chat panel on any channel tab for the remainder of the session and after a browser refresh
  2. After blocking a player, whispers from that player are refused server-side and do not appear in the blocked player's Whisper tab
  3. Right-clicking a sender name in the chat panel shows a context menu with Mute, Block, and Whisper options
  4. A previously muted player can be unmuted and their messages become visible again immediately
  5. A previously blocked player can be unblocked and whispers from them are delivered again
**Plans**: 2 plans
  - [x] 107-01-PLAN.md -- moderationStore with mute/block sets, REST API integration, and chatStore mute filter (MOD-01, MOD-02, MOD-03)
  - [x] 107-02-PLAN.md -- Right-click context menu on ChatPanel sender names with Mute/Block/Whisper actions (MOD-05)

### Phase 108: Entity Validation Infrastructure
**Goal**: The packages/entities package has a Vitest test suite that catches all four categories of silent content failure before any new entity definition reaches main — orphaned loot tables, spawn config desync, ID constant drift, and invalid harvest yield item references
**Depends on**: Phase 107
**Requirements**: CINF-01
**Success Criteria** (what must be TRUE):
  1. Running `nx run entities:test` passes green on the current codebase with zero false positives — the baseline is established
  2. Adding a CreatureDefinition without a matching CREATURE_LOOT_TABLES entry causes the test suite to fail with a specific error naming the offending entity
  3. Adding a spawnable entity without a BIOME_SPAWN_CONFIGS entry causes a test failure identifying the missing spawn config
  4. Adding an ENTITY_IDS constant that does not match a registered entity (or vice versa) causes a test failure identifying the drift
  5. Adding a plant or mineral with a harvestYield itemId that does not exist in ItemRegistry causes a test failure naming the bad reference
**Plans**:
  - [x] 108-01-PLAN.md -- Vitest config, export BIOME_SPAWN_CONFIGS, loot-tables.test.ts, spawn-configs.test.ts (CINF-01)
  - [x] 108-02-PLAN.md -- id-constants.test.ts, harvest-yields.test.ts (CINF-01)

### Phase 109: Faction Identity Design Gate
**Goal**: A committed design artifact documents the per-faction stat archetype, ability assignment matrix, naming conventions, color palette anchors, and module/tool character descriptions — locked before any faction item definition is authored
**Depends on**: Phase 108
**Requirements**: SUIT-01
**Success Criteria** (what must be TRUE):
  1. A written design document exists specifying which of the 21 existing abilities are in-faction for each of Verdant, Helix, Nexus, and Unaffiliated (no ability gaps or overlaps that would cause faction identity collapse)
  2. Each faction has a documented stat archetype (primary/secondary stat emphasis per tier) that is distinct from the other three factions
  3. Naming conventions for faction item IDs and display names are documented and follow a consistent pattern per faction (e.g., verdant_ prefix, Verdant brand name format)
  4. The design artifact is referenced in the item definition files so future contributors have a single source of truth
**Plans**: 2 plans
  - [x] 109-01-PLAN.md -- FACTION-IDENTITY.md design document (SUIT-01)
  - [x] 109-02-PLAN.md -- Scavenger archetype + design reference comments (SUIT-01)

### Phase 110: Biome Creature Population
**Goal**: Every biome reaches 4-6 creatures with behavioral variety (at least herbivore, omnivore, and predator archetypes represented), toxic_wastes brought from 1 to 5 creatures as the most critical gap, and every new creature atomically wired across definition, ENTITY_IDS, BIOME_SPAWN_CONFIGS, and CREATURE_LOOT_TABLES
**Depends on**: Phase 108
**Requirements**: CREA-01, CREA-02, CREA-03, CREA-04, CREA-05, CREA-06
**Success Criteria** (what must be TRUE):
  1. Entering toxic_wastes zone in-game reveals 4-5 distinct creature types visible across the biome, up from 1
  2. Every biome (all 16) shows at least 3 behaviorally distinct creature archetypes when explored — the world feels ecologically varied, not procedurally uniform
  3. Killing a newly added creature always produces a loot drop (the loot table is wired) — no creature kills silently drop nothing
  4. Running `nx run entities:test` passes after all new creature definitions are committed — no orphaned IDs or missing spawn configs
  5. void_rift has 6 creatures representing clear max-tier threat — a player entering void_rift encounters meaningfully harder enemies than Tier III zones
**Plans**: 4 plans
  - [x] 110-01-PLAN.md -- Tier I biomes: void_plains, fungal_forest, tidal_pools, ancient_ruins (CREA-01, CREA-05, CREA-06)
  - [x] 110-02-PLAN.md -- Tier II biomes: toxic_wastes critical gap, miasma_marshes, petrified_expanse, kelp_forests, bioluminescent_depths (CREA-02, CREA-05, CREA-06)
  - [x] 110-03-PLAN.md -- Tier III biomes: crystal_caves, volcanic_ridge, frozen_expanse, deep_trenches, starfall_crater, crystalline_wastes with maniac mini-bosses (CREA-03, CREA-05, CREA-06)
  - [x] 110-04-PLAN.md -- Tier IV void_rift: corrupted apex creatures with legendary loot (CREA-04, CREA-05, CREA-06)

### Phase 111: Biome Plants, Minerals, and Artifacts
**Goal**: Every biome reaches 3-4 plants with rarity variants, 2-3 minerals including rare/epic variants registered in rarity.ts, and 1-2 artifacts — the crystalline_wastes artifact hotspot (documented in lore as such, currently zero artifacts) is resolved with 2 artifacts
**Depends on**: Phase 108
**Requirements**: PLNT-01, PLNT-02, PLNT-03, PLNT-04, MINR-01, MINR-02, MINR-03, MINR-04, MINR-05, ARTF-01, ARTF-02, ARTF-03, ARTF-04, ARTF-05
**Success Criteria** (what must be TRUE):
  1. Gathering in any biome produces at least 3 different plant resource types — players have meaningful gathering variety without needing to switch zones
  2. Rare and epic mineral nodes appear in Tier II+ biomes when gathering — the rarity.ts functions return the new variants and the nodes visibly appear in world
  3. crystalline_wastes has 2 discoverable artifact entities — a player exploring that biome can find and interact with artifacts where previously there were none
  4. All Tier I biomes (void_plains, fungal_forest, tidal_pools, ancient_ruins) have at least 1 artifact each — the zero-artifact gap across all four Tier I biomes is closed
  5. Running `nx run entities:test` passes after all new plant/mineral/artifact definitions are committed — no invalid harvest yield item references
**Plans**: 4 plans
  - [x] 111-01-PLAN.md -- Tier I biomes: plants, minerals, artifacts for void_plains, fungal_forest, tidal_pools, ancient_ruins (PLNT-01, MINR-01, MINR-05, ARTF-01)
  - [x] 111-02-PLAN.md -- Tier II biomes: plants, minerals, artifacts for toxic_wastes, miasma_marshes, petrified_expanse, bioluminescent_depths, kelp_forests (PLNT-02, MINR-02, MINR-05, ARTF-02)
  - [x] 111-03-PLAN.md -- Tier III biomes (excl. crystalline_wastes): plants, minerals for crystal_caves, volcanic_ridge, frozen_expanse, deep_trenches, starfall_crater (PLNT-03, MINR-03, MINR-05, ARTF-03)
  - [x] 111-04-PLAN.md -- crystalline_wastes Singing Fields spotlight + void_rift exotic completion (PLNT-03, PLNT-04, MINR-03, MINR-04, MINR-05, ARTF-03, ARTF-04, ARTF-05)

### Phase 112: Faction Suits
**Goal**: Verdant Dynamics, Helix Extraction, Nexus Frontiers, and Unaffiliated each have a complete suit line from Common through Legendary using generateSuitStats() for all stat generation — no hand-coded stats — with distinct faction identity expressed through grantedAbilities, textureKey, and display name conventions established in Phase 109
**Depends on**: Phase 109
**Requirements**: SUIT-02, SUIT-03, SUIT-04, SUIT-05, SUIT-06
**Success Criteria** (what must be TRUE):
  1. Equipping a Verdant Legendary suit grants abilities from the Verdant ability matrix (regeneration_protocol, energy_barrier, nano_repair) — the suit feels mechanically Verdant, not generic
  2. Equipping a Helix Legendary suit grants abilities distinct from Verdant's set (fortify_systems, power_surge, magnetic_field) — two factions' endgame suits are observably mechanically different
  3. A new player can equip a Common-tier faction suit appropriate to their faction at character creation level — the gear ladder starts at Tier I for all four factions
  4. Running `nx run items:test` (existing item validation suite) passes after all new suit definitions are committed — generateSuitStats() is used universally with no hand-coded stat numbers
  5. Each faction suit displays a distinct visual identifier in the equipment panel — textureKey values do not collide across factions even where placeholder color tiles are used
**Plans**: TBD

### Phase 113: Faction Modules and Tools
**Goal**: Each of the four factions has 1-2 modules and 1-2 tools completing the faction gear identity — a player committing to a faction can equip faction-appropriate gear in all three equipment categories (suit, module, tool) with stat emphasis that reinforces the faction's mechanical identity from Phase 109
**Depends on**: Phase 112
**Requirements**: MODU-01, MODU-02, MODU-03, MODU-04, TOOL-01, TOOL-02, TOOL-03, TOOL-04
**Success Criteria** (what must be TRUE):
  1. A player wearing a full Verdant suit can also equip a Verdant module and Verdant tool — all three gear slots have faction options available
  2. Helix modules provide armor/power-core stat emphasis that is mechanically distinct from Nexus sensor/speed modules — switching factions' modules changes the character's playstyle
  3. Verdant tools have bio/research tool type, Helix tools have mining/demolition, Nexus tools have research/stealth — toolType values match the faction's documented identity
  4. Unaffiliated modules and tools are available for players who chose no faction and represent the jury-rigged aesthetic from Phase 109's design
  5. All new modules and tools pass the existing item validation suite without introducing any hand-coded stat patterns
**Plans**: TBD

### Phase 114: Integration and Lore Verification
**Goal**: Every entity and item definition added in Phases 110-113 is exported from its package's definition index, has a corresponding constant in ENTITY_IDS or ITEM_IDS, and has been cross-checked against lore/world-bible.md — the milestone is verifiably complete with no registry orphans or lore conflicts
**Depends on**: Phase 113
**Requirements**: INTG-01, INTG-02, INTG-03
**Success Criteria** (what must be TRUE):
  1. Every new creature, plant, mineral, and artifact can be retrieved by ID via EntityRegistry.get() — no definition exists outside the registry index
  2. Every new suit, module, and tool can be retrieved by ID via ItemRegistry.get() — no faction item is a dead reference in ITEM_IDS
  3. Running both `nx run entities:test` and `nx run items:test` passes clean — the validation infrastructure from Phase 108 confirms zero orphans across all new content
  4. A manual lore review against lore/world-bible.md finds no entity name, faction ability, or item description that contradicts established faction identity or biome ecology
**Plans**: 3 plans
  - [x] 114-01-PLAN.md -- Item ID constants test + full validation suite run (INTG-01, INTG-02)
  - [x] 114-02-PLAN.md -- Entity lore audit and world-bible bestiary expansion (INTG-03)
  - [x] 114-03-PLAN.md -- Faction gear lore audit and world-bible equipment catalog (INTG-03)

### Phase 115: Shared Type Foundation
**Goal**: All type contracts required by v1.24 systems are in place across shared-types and game-logic — DamageType union, DamageResistances on CreatureDefinition, shield/damage_reduction AbilityEffect variants, DeployableEntity interface, and AiTickResult behavior signal fields — with no behavioral changes yet but TypeScript compile confirming all new interfaces are wired as required fields
**Depends on**: Phase 114
**Requirements**: FNDN-01, FNDN-02, FNDN-03, FNDN-04, FNDN-05
**Success Criteria** (what must be TRUE):
  1. `DamageType` union (Thermal/Cryo/Bio/Kinetic) is exported from shared-types and importable in game-logic without TypeScript errors
  2. A CreatureDefinition without a `resistances` field causes a TypeScript compile error — the field is required, not optional
  3. `shield` and `damage_reduction` variants exist in the AbilityEffect discriminated union and can be authored in ability definitions without type errors
  4. A DeployableEntity interface is exported from shared-types and a `DeployableEntity` value can be constructed in a test file without type errors
  5. AiTickResult has stampede, packCall, ambush, and frenzied signal fields and a complete AiTickResult value can be constructed referencing all four fields
**Plans**: TBD

### Phase 116: Stat Caps
**Goal**: Stat diminishing returns are enforced in computeCharStats() — every stat above 200 counts as 0.5 points toward the effective value, no stat can exceed 400 effective points, and players can see when a stat has crossed the soft cap threshold in the stats panel
**Depends on**: Phase 115
**Requirements**: CAPS-01, CAPS-02, CAPS-03, CAPS-04
**Success Criteria** (what must be TRUE):
  1. A character with 250 raw Power (from gear + buffs) has an effective Power of 225 — the diminishing returns curve is applied and verifiable in the stats panel
  2. No stat can be driven above 400 effective value regardless of gear or buffs — equipping additional stat-boosting items past the hard cap produces no change in the stats panel
  3. The stats panel shows a visual indicator (color change or label) on any stat that has exceeded 200 — a player can tell at a glance which stats are in diminishing returns territory
  4. applyDiminishingReturns() is a pure function in packages/game-logic and a unit test verifies the DR curve at values 100, 200, 250, 300, 400, and 500 raw input
**Plans**: TBD

### Phase 117: Damage Types and Creature Resistances
**Goal**: The damage pipeline applies resistance multipliers — every auto-attack and ability-triggered hit uses the target creature's resistance profile for its damage type, all 83+ creatures have explicit resistance values matching their biome theme, and players can see damage type information in the combat log and floating numbers
**Depends on**: Phase 115
**Requirements**: DMGT-01, DMGT-02, DMGT-03, DMGT-04, DMGT-05, DMGT-06, DMGT-07
**Success Criteria** (what must be TRUE):
  1. Attacking a Frozen Expanse creature with a Thermal-typed hit deals visibly more damage than an identical Kinetic-typed hit — the resistance multiplier is applied in calculateDamage() and observable in floating numbers
  2. No creature takes less than 30% of base damage from any damage type — the 70% resistance cap prevents hard counters and the floor is enforceable in unit tests
  3. Combat log entries show the damage type label (e.g., "[Thermal] 34") alongside the numeric value
  4. Floating damage numbers are colored by type — Thermal=orange, Cryo=cyan, Bio=green, Kinetic=white — distinguishable without reading the combat log
  5. At least one gear item per damage type exists that boosts that type's output via a damage_type_bonus effect — players have an itemization path to specialize
**Plans**: 3 plans
  - [ ] 117-01-PLAN.md -- Resistance calculation in game-logic, damageType on AbilityEffect, damage_type_bonus ItemEffect (DMGT-01, DMGT-03, DMGT-06)
  - [ ] 117-02-PLAN.md -- BIOME_RESISTANCE_PROFILES lookup + all creature resistances populated (DMGT-02, DMGT-07)
  - [ ] 117-03-PLAN.md -- Server/client wiring: socket payload, combat log, floating colors, amplifier modules (DMGT-01, DMGT-04, DMGT-05, DMGT-06)

### Phase 118: Ability Rebalance
**Goal**: Plasma Burst no longer dominates the offensive meta, defensive abilities have real HP shield absorb and flat damage reduction effects that players can observe in combat, and each rebalanced offensive ability has a situational niche tied to creature type, behavior state, or damage type
**Depends on**: Phase 116, Phase 117
**Requirements**: ABIL-01, ABIL-02, ABIL-03, ABIL-04, ABIL-05, ABIL-06, ABIL-07, ABIL-08, ABIL-09, ABIL-10, ABIL-11, ABIL-12, ABIL-13
**Success Criteria** (what must be TRUE):
  1. Plasma Burst deals 28 base damage with a +50% bonus only against targets above 80% HP — the tooltip reflects this, and a player testing on a low-HP target sees the reduced effective damage
  2. Emergency Shield absorbs up to 80 incoming damage within 8 seconds then expires — a player can take hits during the window and observe the shield bar depleting rather than their HP dropping
  3. Fortify Systems grants 15% flat damage reduction for 10 seconds — a player with Fortify active takes visibly fewer HP per hit than without it, and the math is verifiable in the combat log
  4. Thermal Lance hitting a Frozen Expanse creature deals more damage than hitting a Volcanic Ridge creature — the damage type bonus from Phase 117 is observable when using a type-specialized ability
  5. Energy Barrier grants immunity to biome hazard effects for 20 seconds — a player in a hazardous biome who activates Energy Barrier does not receive HP drain or stat debuffs during the duration
**Plans**: 4 plans in 3 waves
  - [ ] 118-01-PLAN.md -- AbilityEffect union types + all 13 ability definition updates (ABIL-01 through ABIL-13)
  - [ ] 118-02-PLAN.md -- Server defensive mechanics: shield, DR, stun, hazard immunity, conditional bonus (ABIL-01, ABIL-08, ABIL-09, ABIL-12, ABIL-13)
  - [ ] 118-03-PLAN.md -- Server offensive mechanics: AoE spread, AoE pulse, reveal, reflect (ABIL-04, ABIL-05, ABIL-06, ABIL-11)
  - [ ] 118-04-PLAN.md -- Client shield bar, ServerEvents, combat log mitigation display (ABIL-09, ABIL-12)

### Phase 119: Creature AI Upgrades
**Goal**: Each creature behavior archetype has one new meaningful behavior — herbivores trigger Stampede when 3+ flee simultaneously, omnivores have a 30% chance to Pack Call nearby allies when provoked, predators deal 2x damage on first Ambush strike, and maniacs enter Frenzy below 30% HP doubling attack speed
**Depends on**: Phase 118
**Requirements**: CRAI-01, CRAI-02, CRAI-03, CRAI-04, CRAI-05, CRAI-06, CRAI-07
**Success Criteria** (what must be TRUE):
  1. Provoking 3+ herbivores simultaneously causes a Stampede — nearby players in the path receive kinetic damage and see the herd movement, not individual flee animations
  2. Attacking an omnivore in a zone with other nearby omnivores triggers Pack Call in approximately 1 in 3 encounters — additional creatures join the fight without being newly spawned
  3. A predator that aggros from stealth deals 2x damage on its first attack — a player with Perception above 150 sees the predator before aggro and avoids the doubled first hit
  4. A maniac below 30% HP visibly changes color (Frenzy overlay) and attacks noticeably faster — the behavior change is observable without reading tooltips
  5. A creature that dies while in Frenzy state does not leave orphaned state data — running for 10 minutes in a zone with maniacs does not cause server memory growth from Frenzy Map leaks
**Plans**: TBD

### Phase 120: Biome Hazard System
**Goal**: Hazardous biomes drain HP and apply stat debuffs to players without the correct protective gear, hazard protection gear is available in faction trader inventories before any hazard tick is enabled, and players have a HUD indicator showing what hazard is active and how protected they are
**Depends on**: Phase 117
**Requirements**: HAZD-01, HAZD-02, HAZD-03, HAZD-04, HAZD-05, HAZD-06, HAZD-07, HAZD-08, HAZD-09, HAZD-10
**Success Criteria** (what must be TRUE):
  1. Entering a Tier III hazardous biome without protection gear causes the player's HP to visibly drop at a rate consistent with 8% base HP per tick — a player with no protection survives approximately 30-45 seconds
  2. Equipping the biome-appropriate protective gear stops the HP drain entirely — a player with correct gear can remain in the hazard zone indefinitely without losing HP
  3. The HUD shows an active hazard warning icon and a progress bar indicating current protection level — players know what hazard is active without consulting external documentation
  4. Entering a faction hub zone while in a hazardous state immediately removes all hazard debuffs — hub zones are completely exempt from hazard processing
  5. A player entering a hazardous biome for the first time has a 3-second grace period before the first HP drain tick — they are not instantly punished upon zone entry
**Plans**: TBD

### Phase 121: Automation Tech Tree
**Goal**: Players can deploy T2 extractors through T4 planetary extractors and T5 refineries, all automation structures have recurring maintenance costs that prevent runaway credit inflation, and the client has an automation panel for deploying, collecting, and refueling structures
**Depends on**: Phase 115
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05, AUTO-06, AUTO-07, AUTO-08, AUTO-09
**Success Criteria** (what must be TRUE):
  1. A player places a T2 extractor on a resource node and returns 5 minutes later to find accumulated resources available for collection — passive gathering worked without the player being present
  2. An extractor with no fuel/maintenance credits remaining stops accumulating resources — the maintenance cost sink is enforced and a depleted extractor produces nothing
  3. The automation panel in the HUD shows all deployed structures with their status (active, depleted, degraded) and a Collect button that transfers accumulated items to inventory
  4. A T5 refinery accepts 10 common resources and produces 1 rare resource after 30 minutes — the transmutation recipe completes and the output is collectable
  5. The income/sink balance sheet documenting maintenance cost >= 60% of hourly output value per tier exists as a committed design artifact before any automation server code is written
**Plans**: TBD

## Progress

**Execution Order:** 115 → 116 → 117 → 118 → 119 → 120 → 121
(Phases 119 and 120 can run in parallel after Phase 118 is complete. Phase 121 can run in parallel with Phases 119-120 after Phase 115 is complete.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 103. Chat Foundation | 2/2 | Complete | 2026-02-26 |
| 104. Moderation Persistence | 2/2 | Complete | 2026-02-26 |
| 105. ChatService & Channel Routing | 2/2 | Complete | 2026-02-26 |
| 106. Chat Panel UI | 2/2 | Complete | 2026-02-26 |
| 107. Moderation Controls | 2/2 | Complete | 2026-02-26 |
| 108. Entity Validation Infrastructure | 2/2 | Complete | 2026-03-02 |
| 109. Faction Identity Design Gate | 2/2 | Complete | 2026-03-02 |
| 110. Biome Creature Population | 4/4 | Complete | 2026-03-02 |
| 111. Biome Plants, Minerals, and Artifacts | 4/4 | Complete | 2026-03-03 |
| 112. Faction Suits | 2/2 | Complete | 2026-03-03 |
| 113. Faction Modules and Tools | 0/TBD | Complete | 2026-03-03 |
| 114. Integration and Lore Verification | 3/3 | Complete | 2026-03-03 |
| 115. Shared Type Foundation | 2/2 | Complete    | 2026-03-03 |
| 116. Stat Caps | 0/TBD | Complete    | 2026-03-03 |
| 117. Damage Types and Creature Resistances | 3/3 | Complete    | 2026-03-03 |
| 118. Ability Rebalance | 1/4 | In Progress|  |
| 119. Creature AI Upgrades | 0/TBD | Not started | - |
| 120. Biome Hazard System | 0/TBD | Not started | - |
| 121. Automation Tech Tree | 0/TBD | Not started | - |

---

*Last updated: 2026-03-04 - Phase 118 plans created (4 plans in 3 waves)*
