# Requirements: Into the Void

**Defined:** 2026-02-23
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.18 Requirements

Requirements for Content Expansion milestone. Each maps to roadmap phases.

### Biomes (BIOME)

#### Aquatic Biomes
- [ ] **BIOME-01**: Tidal Pools biome (Tier I) with shallow water tiles, reduced visibility, speed modifiers
- [ ] **BIOME-02**: Kelp Forests biome (Tier II) with dense flora, limited pathfinding corridors
- [ ] **BIOME-03**: Deep Trenches biome (Tier III) with pressure hazard, rare resource nodes

#### Exotic/Anomaly Biomes
- [ ] **BIOME-04**: Void Rift biome (Tier IV) with reality distortion effects, unique visual palette
- [ ] **BIOME-05**: Crystalline Wastes biome (Tier III) with crystal formations, reflective surfaces
- [ ] **BIOME-06**: Bioluminescent Depths biome (Tier II) with glowing flora, limited base visibility

#### Biome Infrastructure
- [ ] **BIOME-07**: Shore transition tiles for water/land boundaries (no 1-tile artifacts)
- [ ] **BIOME-08**: Per-biome visibility modifiers in fog of war system
- [ ] **BIOME-09**: Biome-specific speed modifiers for aquatic zones

### Entities (ENT)

#### Aquatic Resources
- [ ] **ENT-01**: 5 aquatic minerals (coral formations, sea crystals, abyssal ore, tidal stones, pearl nodes)
- [ ] **ENT-02**: 5 aquatic plants (kelp, bioluminescent algae, pressure ferns, void kelp, thermal vents)
- [ ] **ENT-03**: 3 aquatic artifacts (sunken tech, ancient shells, drowned relics)

#### Exotic Resources
- [ ] **ENT-04**: 5 exotic minerals (void crystals, anomaly shards, dimensional ore, null stones, phase minerals)
- [ ] **ENT-05**: 5 exotic plants (reality moss, echo blooms, temporal fungi, void vines, null grass)
- [ ] **ENT-06**: 4 exotic artifacts (anomaly cores, dimensional fragments, echo records, void relics)

#### Existing Biome Gaps
- [ ] **ENT-07**: Fill rare/epic variants for fungal_forest (rare fungi, epic spores)
- [ ] **ENT-08**: Fill rare/epic variants for miasma_marshes (toxic crystals, marsh gas nodes)
- [ ] **ENT-09**: Fill artifact gaps in toxic_wastes, volcanic_reaches, glacial_expanse

### Creatures (CREA)

#### Aquatic Creatures
- [ ] **CREA-01**: 3 herbivore aquatic creatures (filter feeders, grazers, schooling fish)
- [ ] **CREA-02**: 3 omnivore aquatic creatures (scavengers, opportunistic hunters)
- [ ] **CREA-03**: 3 predator aquatic creatures (deep hunters, ambush predators, territorial)
- [ ] **CREA-04**: 1 maniac aquatic creature (abyssal terror, Tier IV)

#### Exotic Creatures
- [ ] **CREA-05**: 3 exotic herbivores (phase grazers, echo drifters, null feeders)
- [ ] **CREA-06**: 3 exotic omnivores (reality scavengers, dimensional hunters)
- [ ] **CREA-07**: 3 exotic predators (void stalkers, anomaly horrors, rift hunters)
- [ ] **CREA-08**: 1 exotic maniac creature (dimensional aberration, Tier IV)

#### Existing Biome Creatures
- [ ] **CREA-09**: 2 additional creatures for starfall_crater (alien fauna variety)
- [ ] **CREA-10**: 2 additional creatures for ancient_ruins (guardian constructs, relic beasts)

### Items (ITEM)

#### Aquatic Equipment
- [ ] **ITEM-01**: 3 aquatic suit variants (diving suit, pressure suit, abyssal suit)
- [ ] **ITEM-02**: 3 aquatic tools (harpoon, diving pick, net)
- [ ] **ITEM-03**: 5 aquatic consumables (pressure pills, gill extract, depth charges)

#### Exotic Equipment
- [ ] **ITEM-04**: 3 exotic suit variants (void-touched suit, anomaly suit, null suit)
- [ ] **ITEM-05**: 3 exotic tools (phase extractor, void pick, reality anchor)
- [ ] **ITEM-06**: 5 exotic consumables (stability tonics, void essence, phase capsules)

#### Materials
- [ ] **ITEM-07**: 10 aquatic materials from new minerals/plants (crafting ingredients)
- [ ] **ITEM-08**: 10 exotic materials from new minerals/plants (crafting ingredients)

#### Progression Integration
- [ ] **ITEM-09**: Tier I-II aquatic items accessible without high-tier prerequisites
- [ ] **ITEM-10**: Tier III-IV items require existing Tier I-II materials (horizontal progression)

### Progression (PROG)

#### Tier Balance
- [ ] **PROG-01**: Aquatic Tier I (Tidal Pools) comparable to existing Frontier zones
- [ ] **PROG-02**: Exotic Tier IV (Void Rift) requires Tier III equipment to survive
- [ ] **PROG-03**: No power creep: new high-tier items are sidegrades, not upgrades

#### Discovery Integration
- [ ] **PROG-04**: Zone mastery objectives for all new biomes
- [ ] **PROG-05**: Lore fragments for aquatic and exotic zones (6-10 fragments)
- [ ] **PROG-06**: POI types for new biomes (underwater ruins, anomaly nexuses)

## v1.17 Requirements (Complete)

All requirements shipped 2026-02-23.

### Gathering

- [x] **GATH-01**: Player can gather resources from entities using equipped tool
- [x] **GATH-02**: Gathering displays timing mini-game with success zone
- [x] **GATH-03**: Mini-game timing accuracy affects yield (0.5x poor, 1.0x good, 1.5x perfect)
- [x] **GATH-04**: Player has gathering proficiency per resource type that improves with use
- [x] **GATH-05**: Higher proficiency increases success zone size and base yield
- [x] **GATH-06**: Better resource nodes spawn in dangerous areas (near aggressive creatures)
- [x] **GATH-07**: Rare nodes spawn with visual distinction and higher tier resources
- [x] **GATH-08**: Player can track discovered rare node locations

### Exploration

- [x] **EXPL-01**: World displays fog of war hiding unexplored tiles
- [x] **EXPL-02**: Fog reveals in radius around player as they move
- [x] **EXPL-03**: Explored tiles persist per character across sessions
- [x] **EXPL-04**: POIs (anomalies, caches, landmarks) exist in world
- [x] **EXPL-05**: Player discovers POI when entering its tile with fog revealed
- [x] **EXPL-06**: POI discovery grants rewards (XP, items, credits)
- [x] **EXPL-07**: Lore fragments exist as collectible data logs
- [x] **EXPL-08**: Lore fragments reveal world/faction history when collected
- [x] **EXPL-09**: Lore collection tracked in codex UI
- [x] **EXPL-10**: Zones have mastery objectives (discover POIs, gather resources, defeat creatures)
- [x] **EXPL-11**: Zone mastery progress displays in HUD
- [x] **EXPL-12**: Zone mastery completion unlocks zone-specific rewards

### Combat Balancing

- [x] **COMB-01**: Combat follows gradual fight pattern (4-8 hits to kill typical creature)
- [x] **COMB-02**: Damage scales predictably based on level gap
- [x] **COMB-03**: Level-gap multiplier prevents one-shots except extreme differences (10+ levels)
- [x] **COMB-04**: Creature stats rebalanced to match new damage formula
- [x] **COMB-05**: Abilities remain impactful (not just auto-attack spam)

### Quest Items

- [x] **QUEST-07**: All quest-required items have obtainable source in world
- [x] **QUEST-08**: Missing item sources added via new entity drops or POI rewards

## v1.16 Requirements (Complete)

All requirements shipped 2026-02-23.

### NPC Interaction

- [x] **NPC-01**: Fix double-modal bug where two windows appear for same NPC
- [x] **NPC-02**: Single unified NPC window with tab navigation (Dialogue/Trade/Quests)
- [x] **NPC-03**: ESC key properly closes unified window without cascade bugs
- [x] **NPC-04**: Tab state defaults intelligently (quests tab if NPC has ready quests)

### Quest UI

- [x] **QUEST-01**: Quest objective tracker HUD widget showing active quest progress
- [x] **QUEST-02**: Quest tracker positioned near minimap with collapsible objectives
- [x] **QUEST-03**: Quest markers (yellow !) displayed above NPCs with available quests
- [x] **QUEST-04**: Quest markers (yellow ?) displayed above NPCs with turn-in ready quests
- [x] **QUEST-05**: "Quest Complete" banner with visual feedback on completion
- [x] **QUEST-06**: Quest completion audio cue

### Visual Polish

- [x] **VIS-01**: Design token expansion (animation timing, shadows, glassmorphism)
- [x] **VIS-02**: GPU-accelerated hover states on all buttons and tabs
- [x] **VIS-03**: Smooth transitions on modal open/close (150ms fade)
- [x] **VIS-04**: Glassmorphism effect on NPC modal (backdrop-filter blur)
- [x] **VIS-05**: Consistent spacing and typography across all panels
- [x] **VIS-06**: Active/focus states on interactive elements
- [x] **VIS-07**: Micro-interactions on button press (scale feedback)

### Error Handling

- [x] **ERR-01**: Loading spinner on async action buttons during pending state
- [x] **ERR-02**: Toast notifications for trade/quest errors outside modal
- [x] **ERR-03**: Prevent modal close while async operation pending

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Gathering Expansion

- **GATH-09**: Crafting system using gathered resources
- **GATH-10**: Gathering tool quality affects success rate

### Exploration Expansion

- **EXPL-13**: Achievement system for exploration milestones
- **EXPL-14**: Shared world map with party members

### Advanced Quest Features

- **QUEST-10**: Quest reward selection UI (choose between multiple rewards)
- **QUEST-11**: Quest chain visualization ("Part 3 of 5")
- **QUEST-12**: Smart quest tracker sorting by proximity

### Trading Enhancements

- **TRADE-01**: Vendor buyback tab (last 12 sold items)
- **TRADE-02**: Stock visualization for limited items

### UI Theming

- **THEME-01**: Faction-specific UI theming (colors based on player faction)

### Advanced Biome Features (Deferred from v1.18)

- **BIOME-10**: Depth-based vertical layers (shallow/mid/deep sub-zones)
- **BIOME-11**: Tidal cycle mechanics (day/night resource availability)
- **BIOME-12**: Dynamic Anomaly instability (shifting geography)
- **BIOME-13**: Temporal resource mechanics (phase states)
- **BIOME-14**: Advanced water shaders (beyond TileSprite animation)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time mini-game PvP | Complexity, focus on PvE gathering first |
| Full crafting system | Defer to v1.19+, needs separate design |
| Procedural quest generation | Current hand-crafted quests sufficient |
| Dynamic weather affecting gathering | Polish feature, not core |
| Auto-accept/auto-complete quests | Removes player agency, breaks immersion |
| Quest mini-map markers with GPS | Removes exploration, use zone hints instead |
| Submarines/vehicles | Players use exo-suits, no vehicle system |
| Anomaly zone puzzles | Anomalies are danger zones, not dungeons |
| Water physics simulation | Tile-based approach only |
| Continuous depth tracking | Discrete tier zones instead |
| Procedural Anomaly generation | Fixed spawn locations during world gen |
| Swimming skill progression | Suit equipment enables underwater zones |
| Underwater oxygen mechanics | 2D top-down doesn't convey breath urgency |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.18 Requirements

| Requirement | Phase | Status |
|-------------|-------|--------|
| BIOME-01 | Phase 82 | Pending |
| BIOME-02 | Phase 82 | Pending |
| BIOME-03 | Phase 82 | Pending |
| BIOME-04 | Phase 84 | Pending |
| BIOME-05 | Phase 84 | Pending |
| BIOME-06 | Phase 84 | Pending |
| BIOME-07 | Phase 82 | Pending |
| BIOME-08 | Phase 82 | Pending |
| BIOME-09 | Phase 82 | Pending |
| ENT-01 | Phase 83 | Pending |
| ENT-02 | Phase 83 | Pending |
| ENT-03 | Phase 83 | Pending |
| ENT-04 | Phase 85 | Pending |
| ENT-05 | Phase 85 | Pending |
| ENT-06 | Phase 85 | Pending |
| ENT-07 | Phase 87 | Pending |
| ENT-08 | Phase 87 | Pending |
| ENT-09 | Phase 87 | Pending |
| CREA-01 | Phase 83 | Pending |
| CREA-02 | Phase 83 | Pending |
| CREA-03 | Phase 83 | Pending |
| CREA-04 | Phase 83 | Pending |
| CREA-05 | Phase 85 | Pending |
| CREA-06 | Phase 85 | Pending |
| CREA-07 | Phase 85 | Pending |
| CREA-08 | Phase 85 | Pending |
| CREA-09 | Phase 87 | Pending |
| CREA-10 | Phase 87 | Pending |
| ITEM-01 | Phase 86 | Pending |
| ITEM-02 | Phase 86 | Pending |
| ITEM-03 | Phase 86 | Pending |
| ITEM-04 | Phase 86 | Pending |
| ITEM-05 | Phase 86 | Pending |
| ITEM-06 | Phase 86 | Pending |
| ITEM-07 | Phase 86 | Pending |
| ITEM-08 | Phase 86 | Pending |
| ITEM-09 | Phase 86 | Pending |
| ITEM-10 | Phase 86 | Pending |
| PROG-01 | Phase 86 | Pending |
| PROG-02 | Phase 86 | Pending |
| PROG-03 | Phase 86 | Pending |
| PROG-04 | Phase 87 | Pending |
| PROG-05 | Phase 87 | Pending |
| PROG-06 | Phase 87 | Pending |

**Coverage:**
- v1.18 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0

### v1.17 Requirements (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| GATH-01 | Phase 78 | Complete |
| GATH-02 | Phase 78 | Complete |
| GATH-03 | Phase 78 | Complete |
| GATH-04 | Phase 78 | Complete |
| GATH-05 | Phase 78 | Complete |
| GATH-06 | Phase 79 | Complete |
| GATH-07 | Phase 79 | Complete |
| GATH-08 | Phase 79 | Complete |
| EXPL-01 | Phase 76 | Complete |
| EXPL-02 | Phase 76 | Complete |
| EXPL-03 | Phase 76 | Complete |
| EXPL-04 | Phase 77 | Complete |
| EXPL-05 | Phase 77 | Complete |
| EXPL-06 | Phase 77 | Complete |
| EXPL-07 | Phase 80 | Complete |
| EXPL-08 | Phase 80 | Complete |
| EXPL-09 | Phase 80 | Complete |
| EXPL-10 | Phase 80 | Complete |
| EXPL-11 | Phase 80 | Complete |
| EXPL-12 | Phase 80 | Complete |
| COMB-01 | Phase 81 | Complete |
| COMB-02 | Phase 81 | Complete |
| COMB-03 | Phase 81 | Complete |
| COMB-04 | Phase 81 | Complete |
| COMB-05 | Phase 81 | Complete |
| QUEST-07 | Phase 81 | Complete |
| QUEST-08 | Phase 81 | Complete |

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 after v1.18 roadmap creation - 44/44 requirements mapped*
