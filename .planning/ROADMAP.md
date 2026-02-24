# Roadmap: Into the Void

## Milestones

- v1.0 Auth & Character Screens - Phases 1-3 (shipped 2026-02-14)
- v1.1 Post-Login Game Experience - Phases 4-7 (shipped 2026-02-16)
- v1.2 Isometric View - Phases 8-12 (shipped 2026-02-16)
- v1.3 Elevation & Structures - Phases 13-16 (shipped 2026-02-16)
- v1.4 Infinite World & Seamless Chunks - Phases 17-20 (shipped 2026-02-17)
- v1.5 Movement Overhaul - Phases 21-24 (shipped 2026-02-17)
- v1.6 Inventory & Items - Phases 25-29 (shipped 2026-02-18)
- v1.7 Character Stats - Phases 30-32 (shipped 2026-02-18)
- v1.8 Entity System - Phases 33-38 (shipped 2026-02-19)
- v1.9 Combat System - Phases 39-42 (shipped 2026-02-19)
- v1.10 Combat UX - Phases 43-45 (shipped 2026-02-19)
- v1.11 NPCs & Trading - Phases 46-50 (shipped 2026-02-20)
- v1.12 Bug Fixes & Content Polish - Phases 51-55 (shipped 2026-02-20)
- v1.13 Active Combat Abilities - Phases 56-58 (shipped 2026-02-21)
- v1.14 Equipment Stats Overhaul - Phases 59-63 (shipped 2026-02-21)
- v1.15 Quest System - Phases 64-69 (shipped 2026-02-22)
- v1.16 UI Polish - Phases 70-75 (shipped 2026-02-23)
- v1.17 Core Gameplay Loop - Phases 76-81 (shipped 2026-02-23)
- **v1.18 Content Expansion** - Phases 82-88 (in progress)

## Phases

<details>
<summary>v1.0 Auth & Character Screens (Phases 1-3) - SHIPPED 2026-02-14</summary>

- [x] Phase 1: Authentication & Navigation (3/3 plans) - completed 2026-02-13
- [x] Phase 2: Character Selection (2/2 plans) - completed 2026-02-14
- [x] Phase 3: Character Creation (2/2 plans) - completed 2026-02-14

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>v1.1 Post-Login Game Experience (Phases 4-7) - SHIPPED 2026-02-16</summary>

- [x] Phase 4: WebSocket Connection & Auth Handshake (5/5 plans) - completed 2026-02-14
- [x] Phase 5: Phaser Integration & World Rendering (5/5 plans) - completed 2026-02-14
- [x] Phase 6: Movement System (5/5 plans) - completed 2026-02-15
- [x] Phase 7: Entities & HUD (5/5 plans) - completed 2026-02-16

See: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>v1.2 Isometric View (Phases 8-12) - SHIPPED 2026-02-16</summary>

- [x] Phase 8: Core Isometric Transformation (3/3 plans) - completed 2026-02-16
- [x] Phase 9: Rendering Optimization & Interaction (2/2 plans) - completed 2026-02-16
- [x] Phase 10: Multiplayer Integration (1/1 plans) - completed 2026-02-16
- [x] Phase 11: UI Integration (1/1 plans) - completed 2026-02-16
- [x] Phase 12: Polish (1/1 plans) - completed 2026-02-16

See: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>v1.3 Elevation & Structures (Phases 13-16) - SHIPPED 2026-02-16</summary>

**Milestone Goal:** Add vertical dimension to the world with terrain elevation, structure walls, and a scalable tile definition system.

- [x] Phase 13: Tile Definition Architecture (3/3 plans) - completed 2026-02-16
- [x] Phase 14: Elevation System Core (2/2 plans) - completed 2026-02-16
- [x] Phase 15: Elevation Rendering (2/2 plans) - completed 2026-02-16
- [x] Phase 16: Structure Walls & Pathfinding (5/5 plans) - completed 2026-02-16

See: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>v1.4 Infinite World & Seamless Chunks (Phases 17-20) - SHIPPED 2026-02-17</summary>

**Milestone Goal:** Transform the world from chunk-locked biomes to a truly infinite, seamlessly streaming world where biomes flow naturally across boundaries.

- [x] Phase 17: World Coordinate Foundation (2/2 plans) - completed 2026-02-16
- [x] Phase 18: Multi-Chunk Streaming (5/5 plans) - completed 2026-02-16
- [x] Phase 19: Biome Integration (2/2 plans) - completed 2026-02-17
- [x] Phase 20: Testing & Polish (2/2 plans) - completed 2026-02-17

See: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>v1.5 Movement Overhaul (Phases 21-24) - SHIPPED 2026-02-17</summary>

**Milestone Goal:** Fix movement accessibility (all tiles reachable via keyboard), unify keyboard and click-to-move speed, and polish movement feel with tile-to-tile animation and smooth camera follow.

- [x] Phase 21: Server Rate Limit & Speed Unification (2/2 plans) - completed 2026-02-17
- [x] Phase 22: 8-Directional Input & Pathfinding (2/2 plans) - completed 2026-02-17
- [x] Phase 23: Movement Animation & Camera Polish (4/4 plans) - completed 2026-02-17
- [x] Phase 24: Zone Boundary Hysteresis (1/1 plans) - completed 2026-02-17

See: `.planning/milestones/v1.5-ROADMAP.md`

</details>

<details>
<summary>v1.6 Inventory & Items (Phases 25-29) - SHIPPED 2026-02-18</summary>

**Milestone Goal:** Implement the item system with a strategy-pattern registry, 100 lore-accurate items across 6 categories, exo-suit equipment with module slots, server-authoritative stat calculation, a drag-drop inventory UI, and an action bar with hotkeys.

- [x] Phase 25: Item Data Model & Foundation (4/4 plans) - completed 2026-02-17
- [x] Phase 26: Server InventoryService & WebSocket Handlers (4/4 plans) - completed 2026-02-17
- [x] Phase 27: Client State & Inventory Panel UI (3/3 plans) - completed 2026-02-17
- [x] Phase 28: Equipment System (3/3 plans) - completed 2026-02-18
- [x] Phase 29: Action Bar & Personal Storage (2/2 plans) - completed 2026-02-18

See: `.planning/milestones/v1.6-ROADMAP.md`

</details>

<details>
<summary>v1.7 Character Stats (Phases 30-32) - SHIPPED 2026-02-18</summary>

**Milestone Goal:** Implement the 8-stat character stats system (Durability, Toughness, Power, Haste, Vigor, Recovery, Perception, Resilience) with linear level scaling, equipment bonuses, server-authoritative computation, and a stat panel HUD with breakdown display.

- [x] Phase 30: Type Foundation & Pure Computation (2/2 plans) - completed 2026-02-18
- [x] Phase 31: Server Wiring & Socket Delivery (3/3 plans) - completed 2026-02-18
- [x] Phase 32: Client Display (3/3 plans) - completed 2026-02-18

See: `.planning/milestones/v1.7-ROADMAP.md`

</details>

<details>
<summary>v1.8 Entity System (Phases 33-38) - SHIPPED 2026-02-19</summary>

**Milestone Goal:** Implement entity definition system with spawning, interaction, and loot. Entities include creatures (idle wander), plants, minerals, and artifacts — all interactable via tools with range-based interaction, perception gating, and a respawn system.

- [x] Phase 33: Foundation Types and Entity Definitions (3/3 plans) - completed 2026-02-18
- [x] Phase 34: Entity Lifecycle Persistence and Enriched Spawning (4/4 plans) - completed 2026-02-18
- [x] Phase 35: Loot Tables, Tool Interaction, and Respawn (4/4 plans) - completed 2026-02-18
- [x] Phase 36: Creature AI Wander and Behavior Tick (4/4 plans) - completed 2026-02-18
- [x] Phase 37: Fertility Noise and Biome Spawn Quality (3/3 plans) - completed 2026-02-18
- [x] Phase 38: Perception Gating and Client Polish (4/4 plans) - completed 2026-02-19

</details>

<details>
<summary>v1.9 Combat System (Phases 39-42) - SHIPPED 2026-02-19</summary>

**Milestone Goal:** Implement PvE auto-attack combat with creature aggro, damage calculation using Power/Toughness stats, creature chase/leash behavior, player death with safe respawn, and combat HUD feedback.

- [x] Phase 39: Combat Core and Damage Calculation (4/4 plans) - completed 2026-02-19
- [x] Phase 40: Creature Combat AI and Aggro (3/3 plans) - completed 2026-02-19
- [x] Phase 41: Player Death and Respawn (3/3 plans) - completed 2026-02-19
- [x] Phase 42: Combat Feedback and HUD (2/2 plans) - completed 2026-02-19

</details>

<details>
<summary>v1.10 Combat UX (Phases 43-45) - SHIPPED 2026-02-19</summary>

**Milestone Goal:** Complete the combat user experience with click-to-attack targeting, visual target selection, and combat log feedback.

- [x] Phase 43: Click-to-Attack and Bug Fix (2/2 plans) - completed 2026-02-19
- [x] Phase 44: Target Selection UI (2/2 plans) - completed 2026-02-19
- [x] Phase 45: Combat Log (1/1 plans) - completed 2026-02-19

</details>

<details>
<summary>v1.11 NPCs & Trading (Phases 46-50) - SHIPPED 2026-02-20</summary>

**Milestone Goal:** Implement faction orbital hubs as instanced safe zones, a credits currency system, hub travel via portals and recall, an NPC definition system with 5 types, and a trading system.

- [x] Phase 46: Currency and Hub Foundation (3/3 plans) - completed 2026-02-19
- [x] Phase 47: Hub Travel (5/5 plans) - completed 2026-02-20
- [x] Phase 48: NPC Definition System and Hub Spawns (3/3 plans) - completed 2026-02-20
- [x] Phase 49: NPC Interaction Window (3/3 plans) - completed 2026-02-20
- [x] Phase 50: Trading System (4/4 plans) - completed 2026-02-20

</details>

<details>
<summary>v1.12 Bug Fixes & Content Polish (Phases 51-55) - SHIPPED 2026-02-20</summary>

**Milestone Goal:** Fix persistence, spawning, and rendering bugs, improve new player experience with starter kit, and expand content variety with new creatures and items.

- [x] Phase 51: Player Position Persistence (1/1 plans) - completed 2026-02-20
- [x] Phase 52: Hub NPC Spawning Fix (1/1 plans) - completed 2026-02-20
- [x] Phase 53: Rendering & Depth Fixes (2/2 plans) - completed 2026-02-20
- [x] Phase 54: New Player Starter Kit (1/1 plans) - completed 2026-02-20
- [x] Phase 55: Content Expansion (3/3 plans) - completed 2026-02-20

</details>

<details>
<summary>v1.13 Active Combat Abilities (Phases 56-58) - SHIPPED 2026-02-21</summary>

**Milestone Goal:** Replace auto-attack with manual ability system where items grant abilities used via action bar hotkeys.

- [x] Phase 56: Core Ability System (3/3 plans) - completed 2026-02-20
- [x] Phase 57: Buff System (3/3 plans) - completed 2026-02-20
- [x] Phase 58: Ability Content & Polish (3/3 plans) - completed 2026-02-21

</details>

<details>
<summary>v1.14 Equipment Stats Overhaul (Phases 59-63) - SHIPPED 2026-02-21</summary>

**Milestone Goal:** Fix the disconnected equipment stats system so items actually provide meaningful stat bonuses, with clear build identity and rarity progression.

- [x] Phase 59: Type Foundation (1/1 plans) - completed 2026-02-21
- [x] Phase 60: Migration (2/2 plans) - completed 2026-02-21
- [x] Phase 61: Aggregation Rules (1/1 plans) - completed 2026-02-21
- [x] Phase 62: Calculation Parity (1/1 plans) - completed 2026-02-21
- [x] Phase 63: Content Normalization (3/3 plans) - completed 2026-02-21

</details>

<details>
<summary>v1.15 Quest System (Phases 64-69) - SHIPPED 2026-02-22</summary>

**Milestone Goal:** NPCs give quests with objectives, tracking, and rewards — creating purpose-driven gameplay.

- [x] Phase 64: Quest Foundations (2/2 plans) - completed 2026-02-22
- [x] Phase 65: Objective Tracking (2/2 plans) - completed 2026-02-22
- [x] Phase 66: Quest Completion & Rewards (3/3 plans) - completed 2026-02-22
- [x] Phase 67: NPC Quest Givers (3/3 plans) - completed 2026-02-22
- [x] Phase 68: Quest UI (4/4 plans) - completed 2026-02-22
- [x] Phase 69: Quest Chains & Bounties (2/2 plans) - completed 2026-02-22

See: `.planning/milestones/v1.15-ROADMAP.md`

</details>

<details>
<summary>v1.16 UI Polish (Phases 70-75) - SHIPPED 2026-02-23</summary>

**Milestone Goal:** Clean, WoW-style NPC interaction with unified window and general HUD improvements.

- [x] Phase 70: Modal Unification (2/2 plans) - completed 2026-02-23
- [x] Phase 71: Quest Objective Tracker HUD (1/1 plans) - completed 2026-02-23
- [x] Phase 72: Visual Polish (3/3 plans) - completed 2026-02-23
- [x] Phase 73: Quest Markers in World (1/1 plans) - completed 2026-02-23
- [x] Phase 74: Quest Completion Feedback (2/2 plans) - completed 2026-02-23
- [x] Phase 75: Error Handling (2/2 plans) - completed 2026-02-23

See: `.planning/milestones/v1.16-ROADMAP.md`

</details>

<details>
<summary>v1.17 Core Gameplay Loop (Phases 76-81) - SHIPPED 2026-02-23</summary>

**Milestone Goal:** Complete the gameplay loop with engaging gathering, exploration discovery, and balanced combat.

- [x] Phase 76: Fog of War Foundation (2/2 plans) - completed 2026-02-23
- [x] Phase 77: POI Discovery System (4/4 plans) - completed 2026-02-23
- [x] Phase 78: Gathering Mini-Game (4/4 plans) - completed 2026-02-23
- [x] Phase 79: Resource Risk/Reward (4/4 plans) - completed 2026-02-23
- [x] Phase 80: Zone Mastery & Lore (5/5 plans) - completed 2026-02-23
- [x] Phase 81: Combat Balancing & Quest Audit (3/3 plans) - completed 2026-02-23

</details>

---

## Milestone v1.18: Content Expansion

**Goal:** Massively expand world content with 6 new biomes (3 aquatic, 3 exotic), ~30 new gatherable entities, ~20 new creatures, and ~40 new items. Build order follows research: aquatic foundation first (mechanically simpler), then exotic biomes, with item integration and balance after all content exists.

### Phase 82: Aquatic Biome Foundation — COMPLETE (2026-02-23)

**Goal**: Players can explore three distinct aquatic biomes with appropriate movement and visibility constraints
**Depends on**: Phase 81 (v1.17 complete)
**Requirements**: BIOME-01, BIOME-02, BIOME-03, BIOME-07, BIOME-08, BIOME-09
**Plans:** 3/3 complete

**Success Criteria** (what must be TRUE):
  1. ✓ Player can enter Tidal Pools (Tier I) and move at reduced speed through shallow water tiles
  2. ✓ Player can navigate Kelp Forests (Tier II) through defined corridors between dense flora
  3. ✓ Player can access Deep Trenches (Tier III) with pressure hazard awareness
  4. ✓ Water/land boundaries render with smooth shore transition tiles (no 1-tile artifacts)
  5. ✓ Fog of war reveals reduced radius in aquatic zones based on biome visibility modifiers

Plans:
- [x] 82-01-PLAN.md — Type foundation and aquatic tile definitions
- [x] 82-02-PLAN.md — Biome generation with shore transitions and kelp corridors
- [x] 82-03-PLAN.md — Movement speed and fog of war visibility modifiers

---

### Phase 83: Aquatic Entity Population — COMPLETE (2026-02-23)

**Goal**: Aquatic biomes are populated with unique resources and creatures appropriate to each tier
**Depends on**: Phase 82
**Requirements**: ENT-01, ENT-02, ENT-03, CREA-01, CREA-02, CREA-03, CREA-04
**Plans:** 3/3 complete

**Success Criteria** (what must be TRUE):
  1. ✓ Player can gather 5 distinct aquatic minerals (coral, sea crystals, abyssal ore, tidal stones, pearl nodes)
  2. ✓ Player can gather 5 distinct aquatic plants (kelp, bioluminescent algae, pressure ferns, void kelp, thermal vents)
  3. ✓ Player can discover 3 aquatic artifacts (sunken tech, ancient shells, drowned relics)
  4. ✓ Player encounters herbivore, omnivore, predator, and maniac aquatic creatures across tiers
  5. ✓ Creature spawn density and behavior matches biome tier (passive in Tier I, dangerous in Tier III)

Plans:
- [x] 83-01-PLAN.md — Aquatic entity definitions (10 creatures, 5 plants, 5 minerals, 3 artifacts)
- [x] 83-02-PLAN.md — Spawn tables and loot configuration
- [x] 83-03-PLAN.md — Gap closure: plant and artifact spawn system (systemic fix for ALL biomes)

---

### Phase 84: Exotic Biome Foundation — COMPLETE (2026-02-24)

**Goal**: Players can explore three exotic/anomaly biomes with unique visual identity and environmental effects
**Depends on**: Phase 83
**Requirements**: BIOME-04, BIOME-05, BIOME-06
**Plans:** 2/2 complete

**Success Criteria** (what must be TRUE):
  1. ✓ Player can enter Void Rift (Tier IV) with distinct visual palette and reality distortion awareness
  2. ✓ Player can explore Crystalline Wastes (Tier III) with crystal formations visible on terrain
  3. ✓ Player can navigate Bioluminescent Depths (Tier II) with glowing flora and reduced base visibility
  4. ✓ Each exotic biome has distinct tile types and color schemes distinguishable from aquatic biomes

Plans:
- [x] 84-01-PLAN.md — Type foundation and exotic tile definitions
- [x] 84-02-PLAN.md — Biome generation and configuration

---

### Phase 85: Gathering as Ability System — COMPLETE (2026-02-24)

**Goal**: Replace broken mini-game gathering with ability-based system where tools grant gathering abilities with cooldowns and tool stats affect yield/speed
**Depends on**: Phase 84
**Requirements**: Bugfix (gathering broken), Bugfix (entity collisions not set on client)
**Plans:** 4/4 complete

**Success Criteria** (what must be TRUE):
  1. ✓ Player can use Harvest ability (granted by botany tools) on plants with cooldown
  2. ✓ Player can use Mine ability (granted by extraction tools) on minerals with cooldown
  3. ✓ Tool stats (yield bonus, gather speed) affect gathering outcomes
  4. ✓ Entity collisions are properly set on client (minerals/plants block movement)
  5. ✓ Gathering produces items in inventory and updates entity state/respawn

Plans:
- [x] 85-01-PLAN.md — Gather ability types and definitions
- [x] 85-02-PLAN.md — AbilityService gather effect handling
- [x] 85-03-PLAN.md — Entity collision fix on client
- [x] 85-04-PLAN.md — Gap closure: Fix yieldBonus parameter passing
---

### Phase 86: Exotic Entity Population

**Goal**: Exotic biomes are populated with unique resources and creatures appropriate to dimensional/anomaly themes
**Depends on**: Phase 85
**Requirements**: ENT-04, ENT-05, ENT-06, CREA-05, CREA-06, CREA-07, CREA-08
**Plans:** 2 plans

**Success Criteria** (what must be TRUE):
  1. Player can gather 5 distinct exotic minerals (void crystals, anomaly shards, dimensional ore, null stones, phase minerals)
  2. Player can gather 5 distinct exotic plants (reality moss, echo blooms, temporal fungi, void vines, null grass)
  3. Player can discover 4 exotic artifacts (anomaly cores, dimensional fragments, echo records, void relics)
  4. Player encounters exotic creatures with appropriate dimensional behaviors (phase grazers, void stalkers)
  5. Tier IV maniac creature (dimensional aberration) presents significant challenge requiring Tier III gear

Plans:
- [ ] 086-01-PLAN.md - Entity definitions (10 creatures, 5 plants, 5 minerals, 4 artifacts)
- [ ] 086-02-PLAN.md - Spawn tables and loot configuration

---

### Phase 87: Item Integration & Balance

**Goal**: New content yields useful equipment and materials with balanced progression across all tiers
**Depends on**: Phase 86
**Requirements**: ITEM-01, ITEM-02, ITEM-03, ITEM-04, ITEM-05, ITEM-06, ITEM-07, ITEM-08, ITEM-09, ITEM-10, PROG-01, PROG-02, PROG-03
**Plans:** TBD

**Success Criteria** (what must be TRUE):
  1. Player can craft/obtain 3 aquatic suits (diving, pressure, abyssal) and 3 aquatic tools (harpoon, diving pick, net)
  2. Player can craft/obtain 3 exotic suits (void-touched, anomaly, null) and 3 exotic tools (phase extractor, void pick, reality anchor)
  3. Player can use 10 new consumables (5 aquatic, 5 exotic) with meaningful effects
  4. Tier I-II aquatic items are accessible without high-tier prerequisites (comparable to Frontier zones)
  5. High-tier exotic items require existing Tier I-II materials (horizontal progression, no power creep)

Plans:
- [ ] 87-01: TBD
- [ ] 87-02: TBD
- [ ] 87-03: TBD

---

### Phase 88: Content Gaps & Discovery

**Goal**: Existing biomes have complete resource coverage and all new content integrates with discovery systems
**Depends on**: Phase 87
**Requirements**: ENT-07, ENT-08, ENT-09, CREA-09, CREA-10, PROG-04, PROG-05, PROG-06
**Plans:** TBD

**Success Criteria** (what must be TRUE):
  1. Player can gather rare/epic variants in fungal_forest (rare fungi, epic spores)
  2. Player can gather rare/epic variants in miasma_marshes (toxic crystals, marsh gas nodes)
  3. Player can find artifacts in toxic_wastes, volcanic_reaches, and glacial_expanse
  4. Player encounters additional creatures in starfall_crater (2) and ancient_ruins (2)
  5. All new biomes have zone mastery objectives, lore fragments (6-10 total), and POI types

Plans:
- [ ] 88-01: TBD
- [ ] 88-02: TBD

---

## Progress

**Execution Order:**
Phases execute in numeric order: 82 -> 83 -> 84 -> 85 -> 86 -> 87 -> 88

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
| 50. Trading System | v1.11 | 4/4 | Complete | 2026-02-20 |
| 51. Player Position Persistence | v1.12 | 1/1 | Complete | 2026-02-20 |
| 52. Hub NPC Spawning Fix | v1.12 | 1/1 | Complete | 2026-02-20 |
| 53. Rendering & Depth Fixes | v1.12 | 2/2 | Complete | 2026-02-20 |
| 54. New Player Starter Kit | v1.12 | 1/1 | Complete | 2026-02-20 |
| 55. Content Expansion | v1.12 | 3/3 | Complete | 2026-02-20 |
| 56. Core Ability System | v1.13 | 3/3 | Complete | 2026-02-20 |
| 57. Buff System | v1.13 | 3/3 | Complete | 2026-02-20 |
| 58. Ability Content & Polish | v1.13 | 3/3 | Complete | 2026-02-21 |
| 59. Type Foundation | v1.14 | 1/1 | Complete | 2026-02-21 |
| 60. Migration | v1.14 | 2/2 | Complete | 2026-02-21 |
| 61. Aggregation Rules | v1.14 | 1/1 | Complete | 2026-02-21 |
| 62. Calculation Parity | v1.14 | 1/1 | Complete | 2026-02-21 |
| 63. Content Normalization | v1.14 | 3/3 | Complete | 2026-02-21 |
| 64. Quest Foundations | v1.15 | 2/2 | Complete | 2026-02-22 |
| 65. Objective Tracking | v1.15 | 2/2 | Complete | 2026-02-22 |
| 66. Quest Completion & Rewards | v1.15 | 3/3 | Complete | 2026-02-22 |
| 67. NPC Quest Givers | v1.15 | 3/3 | Complete | 2026-02-22 |
| 68. Quest UI | v1.15 | 4/4 | Complete | 2026-02-22 |
| 69. Quest Chains & Bounties | v1.15 | 2/2 | Complete | 2026-02-22 |
| 70. Modal Unification | v1.16 | 2/2 | Complete | 2026-02-23 |
| 71. Quest Objective Tracker HUD | v1.16 | 1/1 | Complete | 2026-02-23 |
| 72. Visual Polish | v1.16 | 3/3 | Complete | 2026-02-23 |
| 73. Quest Markers in World | v1.16 | 1/1 | Complete | 2026-02-23 |
| 74. Quest Completion Feedback | v1.16 | 2/2 | Complete | 2026-02-23 |
| 75. Error Handling | v1.16 | 2/2 | Complete | 2026-02-23 |
| 76. Fog of War Foundation | v1.17 | 2/2 | Complete | 2026-02-23 |
| 77. POI Discovery System | v1.17 | 4/4 | Complete | 2026-02-23 |
| 78. Gathering Mini-Game | v1.17 | 4/4 | Complete | 2026-02-23 |
| 79. Resource Risk/Reward | v1.17 | 4/4 | Complete | 2026-02-23 |
| 80. Zone Mastery & Lore | v1.17 | 5/5 | Complete | 2026-02-23 |
| 81. Combat Balancing & Quest Audit | v1.17 | 3/3 | Complete | 2026-02-23 |
| 82. Aquatic Biome Foundation | v1.18 | 3/3 | Complete | 2026-02-23 |
| 83. Aquatic Entity Population | v1.18 | 3/3 | Complete | 2026-02-23 |
| 84. Exotic Biome Foundation | v1.18 | 2/2 | Complete | 2026-02-24 |
| 85. Gathering as Ability System | v1.18 | 4/4 | Complete | 2026-02-24 |
| 86. Exotic Entity Population | v1.18 | 0/2 | Planned | - |
| 87. Item Integration & Balance | v1.18 | 0/3 | Not started | - |
| 88. Content Gaps & Discovery | v1.18 | 0/2 | Not started | - |

**Total:** 88 phases (85 complete, 3 pending)

---
*Last updated: 2026-02-24 - Phase 85 complete (Gathering as Ability System)*
