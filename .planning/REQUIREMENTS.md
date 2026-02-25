# Requirements: Into the Void

**Defined:** 2026-02-25
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.20 Requirements

Requirements for World Scale & Action Bar milestone. Each maps to roadmap phases.

### World Scale

- [ ] **WORLD-01**: Biomes are small enough that players can reach neighboring biomes in 2-3 minutes of walking
- [ ] **WORLD-02**: Biome transitions remain natural and gradual (no jarring edges)

### Travel

- [ ] **TRAV-01**: Expedition NPC exists in each faction hub
- [ ] **TRAV-02**: Player can teleport to random world location via expedition NPC
- [ ] **TRAV-03**: High-tier expedition destinations are locked until player reaches required level
- [ ] **TRAV-04**: Universal home recall ability available to all players (not gear-dependent)
- [ ] **TRAV-05**: Home recall has 5 minute cooldown

### Action Bar

- [ ] **ABAR-01**: Clicking ability icon triggers the ability
- [ ] **ABAR-02**: SHIFT + drag allows relocating ability within action bar
- [ ] **ABAR-03**: Abilities can be dragged from abilities panel to action bar
- [ ] **ABAR-04**: Dropping ability outside action bar removes it
- [ ] **ABAR-05**: Second action bar with 8 slots exists below/beside first bar
- [ ] **ABAR-06**: Second bar uses Shift+1-8 keybindings

### HUD

- [ ] **HUD-01**: Game shortcuts are smaller
- [ ] **HUD-02**: Game shortcuts moved to bottom-right next to minimap
- [ ] **HUD-03**: Freed space accommodates second action bar

## v1.19 Requirements (Complete)

All requirements shipped 2026-02-24.

### Docker Images

- [x] **DOCKER-01**: Web app builds as production static files served by nginx
- [x] **DOCKER-02**: API builds as production NestJS container with health check
- [x] **DOCKER-03**: Game server builds as production NestJS container with health check
- [x] **DOCKER-04**: All images use multi-stage builds for minimal size

### Swarm Stack

- [x] **SWARM-01**: Docker Compose file configured for Swarm mode deployment
- [x] **SWARM-02**: PostgreSQL service with persistent volume
- [x] **SWARM-03**: Redis service with persistent volume
- [x] **SWARM-04**: Service dependencies ensure correct startup order
- [x] **SWARM-05**: Resource limits defined for each service

### Reverse Proxy

- [x] **PROXY-01**: Traefik configured as ingress with Docker provider
- [x] **PROXY-02**: Let's Encrypt ACME for automatic SSL certificates
- [x] **PROXY-03**: Route play.intothevoid.online to web service
- [x] **PROXY-04**: Route api.intothevoid.online to API service (or /api path)
- [x] **PROXY-05**: WebSocket routing for game server with sticky sessions

### CI/CD

- [x] **CICD-01**: GitHub Actions workflow triggers on version tags
- [x] **CICD-02**: Build all Docker images in parallel
- [x] **CICD-03**: Push images to container registry (GHCR or Docker Hub)
- [x] **CICD-04**: Deploy to Swarm via SSH with stack update
- [x] **CICD-05**: Database migrations run before deployment completes

### Documentation

- [x] **DOCS-01**: VM setup guide (Docker, Swarm init, firewall)
- [x] **DOCS-02**: DNS configuration guide (GoDaddy A records)
- [x] **DOCS-03**: Secrets configuration (GitHub Secrets list)
- [x] **DOCS-04**: First deployment checklist

## v1.18 Requirements (Complete)

All requirements shipped 2026-02-24.

### Biomes (BIOME)

- [x] **BIOME-01**: Coral Reef biome (Tier I) with shallow water tiles, reduced visibility, speed modifiers
- [x] **BIOME-02**: Kelp Forests biome (Tier II) with dense flora, limited pathfinding corridors
- [x] **BIOME-03**: Abyssal Trench biome (Tier III) with pressure hazard, rare resource nodes
- [x] **BIOME-04**: Void Rift biome (Tier IV) with reality distortion effects, unique visual palette
- [x] **BIOME-05**: Crystalline Wastes biome (Tier III) with crystal formations, reflective surfaces
- [x] **BIOME-06**: Bioluminescent Depths biome (Tier II) with glowing flora, limited base visibility
- [x] **BIOME-07**: Shore transition tiles for water/land boundaries (no 1-tile artifacts)
- [x] **BIOME-08**: Per-biome visibility modifiers in fog of war system
- [x] **BIOME-09**: Biome-specific speed modifiers for aquatic zones

### Entities (ENT)

- [x] **ENT-01**: 5 aquatic minerals (coral formations, sea crystals, abyssal ore, tidal stones, pearl nodes)
- [x] **ENT-02**: 5 aquatic plants (kelp, bioluminescent algae, pressure ferns, void kelp, thermal vents)
- [x] **ENT-03**: 3 aquatic artifacts (sunken tech, ancient shells, drowned relics)
- [x] **ENT-04**: 5 exotic minerals (void crystals, anomaly shards, dimensional ore, null stones, phase minerals)
- [x] **ENT-05**: 5 exotic plants (reality moss, echo blooms, temporal fungi, void vines, null grass)
- [x] **ENT-06**: 4 exotic artifacts (anomaly cores, dimensional fragments, echo records, void relics)
- [x] **ENT-07**: Fill rare/epic variants for fungal_forest (rare fungi, epic spores)
- [x] **ENT-08**: Fill rare/epic variants for miasma_marshes (toxic crystals, marsh gas nodes)
- [x] **ENT-09**: Fill artifact gaps in toxic_wastes, volcanic_reaches, glacial_expanse

### Creatures (CREA)

- [x] **CREA-01**: 3 herbivore aquatic creatures (filter feeders, grazers, schooling fish)
- [x] **CREA-02**: 3 omnivore aquatic creatures (scavengers, opportunistic hunters)
- [x] **CREA-03**: 3 predator aquatic creatures (deep hunters, ambush predators, territorial)
- [x] **CREA-04**: 1 maniac aquatic creature (abyssal terror, Tier IV)
- [x] **CREA-05**: 3 exotic herbivores (phase grazers, echo drifters, null feeders)
- [x] **CREA-06**: 3 exotic omnivores (reality scavengers, dimensional hunters)
- [x] **CREA-07**: 3 exotic predators (void stalkers, anomaly horrors, rift hunters)
- [x] **CREA-08**: 1 exotic maniac creature (dimensional aberration, Tier IV)
- [x] **CREA-09**: 2 additional creatures for starfall_crater (alien fauna variety)
- [x] **CREA-10**: 2 additional creatures for ancient_ruins (guardian constructs, relic beasts)

### Items (ITEM)

- [x] **ITEM-01**: 3 aquatic suit variants (diving suit, pressure suit, abyssal suit)
- [x] **ITEM-02**: 3 aquatic tools (harpoon, diving pick, net)
- [x] **ITEM-03**: 5 aquatic consumables (pressure pills, gill extract, depth charges)
- [x] **ITEM-04**: 3 exotic suit variants (void-touched suit, anomaly suit, null suit)
- [x] **ITEM-05**: 3 exotic tools (phase extractor, void pick, reality anchor)
- [x] **ITEM-06**: 5 exotic consumables (stability tonics, void essence, phase capsules)
- [x] **ITEM-07**: 10 aquatic materials from new minerals/plants (crafting ingredients)
- [x] **ITEM-08**: 10 exotic materials from new minerals/plants (crafting ingredients)
- [x] **ITEM-09**: Tier I-II aquatic items accessible without high-tier prerequisites
- [x] **ITEM-10**: Tier III-IV items require existing Tier I-II materials (horizontal progression)

### Progression (PROG)

- [x] **PROG-01**: Aquatic Tier I (Tidal Pools) comparable to existing Frontier zones
- [x] **PROG-02**: Exotic Tier IV (Void Rift) requires Tier III equipment to survive
- [x] **PROG-03**: No power creep: new high-tier items are sidegrades, not upgrades
- [x] **PROG-04**: Zone mastery objectives for all new biomes
- [x] **PROG-05**: Lore fragments for aquatic and exotic zones (6-10 fragments)
- [x] **PROG-06**: POI types for new biomes (underwater ruins, anomaly nexuses)

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

### Monitoring (Deferred from v1.19)

- **MON-01**: Container health dashboard
- **MON-02**: Application metrics (Prometheus)
- **MON-03**: Log aggregation
- **MON-04**: Alerting for service failures

### Scaling (Deferred from v1.19)

- **SCALE-01**: Multi-node Swarm configuration
- **SCALE-02**: Load balancing across nodes
- **SCALE-03**: Horizontal scaling policies

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

### Advanced Biome Features

- **BIOME-10**: Depth-based vertical layers (shallow/mid/deep sub-zones)
- **BIOME-11**: Tidal cycle mechanics (day/night resource availability)
- **BIOME-12**: Dynamic Anomaly instability (shifting geography)
- **BIOME-13**: Temporal resource mechanics (phase states)
- **BIOME-14**: Advanced water shaders (beyond TileSprite animation)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Faction outpost spawns | Future enhancement for expeditions - random location sufficient for v1.20 |
| Expedition cost (credits) | Keeping expeditions free for now - can add economy later |
| Expedition cooldown | No cooldown needed - tier-lock provides gating |
| Third action bar | Two bars sufficient - reassess if needed |
| Kubernetes | Docker Swarm simpler for single-node, can migrate later |
| Managed database | Self-hosted sufficient for initial deployment |
| CDN | Direct serving fine for initial traffic |
| Blue-green deployment | Simple rolling updates sufficient |
| Staging environment | Single production environment initially |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.20 Requirements

| Requirement | Phase | Status |
|-------------|-------|--------|
| WORLD-01 | TBD | Pending |
| WORLD-02 | TBD | Pending |
| TRAV-01 | TBD | Pending |
| TRAV-02 | TBD | Pending |
| TRAV-03 | TBD | Pending |
| TRAV-04 | TBD | Pending |
| TRAV-05 | TBD | Pending |
| ABAR-01 | TBD | Pending |
| ABAR-02 | TBD | Pending |
| ABAR-03 | TBD | Pending |
| ABAR-04 | TBD | Pending |
| ABAR-05 | TBD | Pending |
| ABAR-06 | TBD | Pending |
| HUD-01 | TBD | Pending |
| HUD-02 | TBD | Pending |
| HUD-03 | TBD | Pending |

**Coverage:**
- v1.20 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16

### v1.19 Requirements (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| DOCKER-01 | Phase 89 | Complete |
| DOCKER-02 | Phase 89 | Complete |
| DOCKER-03 | Phase 89 | Complete |
| DOCKER-04 | Phase 89 | Complete |
| SWARM-01 | Phase 90 | Complete |
| SWARM-02 | Phase 90 | Complete |
| SWARM-03 | Phase 90 | Complete |
| SWARM-04 | Phase 90 | Complete |
| SWARM-05 | Phase 90 | Complete |
| PROXY-01 | Phase 91 | Complete |
| PROXY-02 | Phase 91 | Complete |
| PROXY-03 | Phase 91 | Complete |
| PROXY-04 | Phase 91 | Complete |
| PROXY-05 | Phase 91 | Complete |
| CICD-01 | Phase 92 | Complete |
| CICD-02 | Phase 92 | Complete |
| CICD-03 | Phase 92 | Complete |
| CICD-04 | Phase 92 | Complete |
| CICD-05 | Phase 92 | Complete |
| DOCS-01 | Phase 93 | Complete |
| DOCS-02 | Phase 93 | Complete |
| DOCS-03 | Phase 93 | Complete |
| DOCS-04 | Phase 93 | Complete |

### v1.18 Requirements (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| BIOME-01 | Phase 82 | Complete |
| BIOME-02 | Phase 82 | Complete |
| BIOME-03 | Phase 82 | Complete |
| BIOME-04 | Phase 84 | Complete |
| BIOME-05 | Phase 84 | Complete |
| BIOME-06 | Phase 84 | Complete |
| BIOME-07 | Phase 82 | Complete |
| BIOME-08 | Phase 82 | Complete |
| BIOME-09 | Phase 82 | Complete |
| ENT-01 | Phase 83 | Complete |
| ENT-02 | Phase 83 | Complete |
| ENT-03 | Phase 83 | Complete |
| ENT-04 | Phase 86 | Complete |
| ENT-05 | Phase 86 | Complete |
| ENT-06 | Phase 86 | Complete |
| ENT-07 | Phase 88 | Complete |
| ENT-08 | Phase 88 | Complete |
| ENT-09 | Phase 88 | Complete |
| CREA-01 | Phase 83 | Complete |
| CREA-02 | Phase 83 | Complete |
| CREA-03 | Phase 83 | Complete |
| CREA-04 | Phase 83 | Complete |
| CREA-05 | Phase 86 | Complete |
| CREA-06 | Phase 86 | Complete |
| CREA-07 | Phase 86 | Complete |
| CREA-08 | Phase 86 | Complete |
| CREA-09 | Phase 88 | Complete |
| CREA-10 | Phase 88 | Complete |
| ITEM-01 | Phase 87 | Complete |
| ITEM-02 | Phase 87 | Complete |
| ITEM-03 | Phase 87 | Complete |
| ITEM-04 | Phase 87 | Complete |
| ITEM-05 | Phase 87 | Complete |
| ITEM-06 | Phase 87 | Complete |
| ITEM-07 | Phase 87 | Complete |
| ITEM-08 | Phase 87 | Complete |
| ITEM-09 | Phase 87 | Complete |
| ITEM-10 | Phase 87 | Complete |
| PROG-01 | Phase 87 | Complete |
| PROG-02 | Phase 87 | Complete |
| PROG-03 | Phase 87 | Complete |
| PROG-04 | Phase 88 | Complete |
| PROG-05 | Phase 88 | Complete |
| PROG-06 | Phase 88 | Complete |

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
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after v1.20 requirements definition*
