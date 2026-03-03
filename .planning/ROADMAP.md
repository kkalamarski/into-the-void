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
- 🚧 **v1.23 Content Expansion & Faction Gear** - Phases 108-114 (in progress)

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

### 🚧 v1.23 Content Expansion & Faction Gear (In Progress)

**Milestone Goal:** Major content expansion filling all biome entity gaps and adding faction-specific equipment across all tiers — every biome reaches minimum population targets, and Verdant, Helix, Nexus, and Unaffiliated each have a distinct gear line.

- [x] **Phase 108: Entity Validation Infrastructure** - Test suite gating all subsequent content authoring, preventing silent spawn and loot failures
- [x] **Phase 109: Faction Identity Design Gate** - Locked design artifact defining stat archetypes, ability matrices, naming conventions, and color anchors per faction before any item definition is written (completed 2026-03-02)
- [x] **Phase 110: Biome Creature Population** - All 16 biomes reach 4-6 creatures with behavioral variety, loot tables, and spawn configs fully wired (completed 2026-03-02)
- [x] **Phase 111: Biome Plants, Minerals, and Artifacts** - All 16 biomes reach 3-4 plants, 2-3 minerals with rarity variants, and 1-2 artifacts; crystalline_wastes hotspot resolved (completed 2026-03-03)
- [ ] **Phase 112: Faction Suits** - Verdant, Helix, Nexus, and Unaffiliated suit lines across all tiers (Common through Legendary) using generateSuitStats() throughout
- [ ] **Phase 113: Faction Modules and Tools** - Bio/sensor/armor module lines and faction-specialized tool lines completing the gear set for all four factions
- [ ] **Phase 114: Integration and Lore Verification** - All new entities and items verified in definition indexes with ENTITY_IDS/ITEM_IDS constants and cross-checked against lore

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
**Plans**: TBD

## Progress

**Execution Order:** 108 → 109 → 110 → 111 → 112 → 113 → 114
(Phases 110 and 111 are logically independent and can run in parallel once Phase 108 is complete)

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
| 112. Faction Suits | 0/TBD | Not started | - |
| 113. Faction Modules and Tools | 0/TBD | Not started | - |
| 114. Integration and Lore Verification | 0/TBD | Not started | - |

---

*Last updated: 2026-03-03 - Phase 111 complete (all 16 biomes at 3-4 plants, 2-3 minerals with rarity variants, 1-2 artifacts; crystalline_wastes Singing Fields spotlight; void_rift exotic completion)*
