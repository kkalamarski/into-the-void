# Requirements: Into the Void

**Defined:** 2026-02-27
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.23 Requirements

Requirements for Content Expansion & Faction Gear milestone. Each maps to roadmap phases.

### Creatures

- [x] **CREA-01**: Tier I biomes (void_plains, fungal_forest, tidal_pools, ancient_ruins) each have 4-6 creatures with varied behavior types
- [ ] **CREA-02**: Tier II biomes (toxic_wastes, miasma_marshes, petrified_expanse, bioluminescent_depths, kelp_forests) each have 4-6 creatures with tier-appropriate stats
- [ ] **CREA-03**: Tier III biomes (crystal_caves, volcanic_ridge, frozen_expanse, deep_trenches, starfall_crater, crystalline_wastes) each have 4-6 creatures with endgame-viable stats
- [ ] **CREA-04**: Tier IV void_rift has 6 creatures representing max-tier challenge
- [x] **CREA-05**: Every new creature has a loot table entry in CREATURE_LOOT_TABLES
- [x] **CREA-06**: Every new creature is registered in BIOME_SPAWN_CONFIGS with appropriate spawn weights

### Plants

- [ ] **PLNT-01**: Tier I biomes each have 3-4 plants including at least one rare variant
- [ ] **PLNT-02**: Tier II biomes each have 3-4 plants including rare variants
- [ ] **PLNT-03**: Tier III biomes each have 3-4 plants including rare and epic variants
- [ ] **PLNT-04**: Tier IV void_rift has 4 plants including exotic variants

### Minerals

- [ ] **MINR-01**: Tier I biomes each have 2-3 minerals
- [ ] **MINR-02**: Tier II biomes each have 2-3 minerals with rare variants
- [ ] **MINR-03**: Tier III biomes each have 2-3 minerals with rare/epic variants
- [ ] **MINR-04**: Tier IV void_rift has 3 minerals including exotic variants
- [ ] **MINR-05**: All rare/epic mineral variants registered in rarity.ts functions

### Artifacts

- [ ] **ARTF-01**: Tier I biomes each have 1-2 artifacts (void_plains, fungal_forest, tidal_pools currently have zero)
- [ ] **ARTF-02**: Tier II biomes each have 1-2 artifacts
- [ ] **ARTF-03**: Tier III biomes each have 1-2 artifacts
- [ ] **ARTF-04**: Tier IV void_rift has 3 artifacts
- [ ] **ARTF-05**: Crystalline wastes has 2 artifacts (lore: "ancient artifact hotspot")

### Faction Suits

- [ ] **SUIT-01**: Faction identity pillars defined from lore (Verdant=resilience/biotech, Helix=power/industrial, Nexus=perception/surveillance)
- [ ] **SUIT-02**: Verdant Dynamics suit line across tiers (Common through Legendary) using hazmat/scout archetypes
- [ ] **SUIT-03**: Helix Extraction suit line across tiers (Common through Legendary) using tank/assault archetypes
- [ ] **SUIT-04**: Nexus Frontiers suit line across tiers (Common through Legendary) using recon/balanced archetypes
- [ ] **SUIT-05**: All faction suits use generateSuitStats() utility (no hand-coded stats)
- [ ] **SUIT-06**: Unaffiliated salvaged suit line across tiers with improvised/scavenged aesthetic

### Faction Modules

- [ ] **MODU-01**: Verdant Dynamics modules across rarity tiers with bio/life-support focus
- [ ] **MODU-02**: Helix Extraction modules across rarity tiers with armor/power-core focus
- [ ] **MODU-03**: Nexus Frontiers modules across rarity tiers with sensor/speed focus
- [ ] **MODU-04**: Unaffiliated salvaged modules across rarity tiers with jury-rigged focus

### Faction Tools

- [ ] **TOOL-01**: Verdant Dynamics tools with bio/research specialization
- [ ] **TOOL-02**: Helix Extraction tools with mining/combat specialization
- [ ] **TOOL-03**: Nexus Frontiers tools with recon/anomaly specialization
- [ ] **TOOL-04**: Unaffiliated salvaged tools with multi-purpose specialization

### Validation

- [ ] **CINF-01**: Entity validation test suite matching item-validation.test.ts pattern

### Integration

- [ ] **INTG-01**: All new entities have ENTITY_IDS constants and are exported from definition indexes
- [ ] **INTG-02**: All new items have ITEM_IDS constants and are exported from definition indexes
- [ ] **INTG-03**: All new entity and item definitions are lore-compatible per /lore directory

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Content Infrastructure

- **CINF-02**: BIOME_SPAWN_CONFIGS coverage check (all entities with biomes field are in spawn configs)
- **CINF-03**: Loot table completeness check (all creatures have loot entries)

### Faction Progression

- **FPRO-01**: Faction reputation system gating faction gear purchases
- **FPRO-02**: Faction-exclusive abilities (new ability definitions per faction)
- **FPRO-03**: Faction trader inventory updated with faction gear

### Environmental Equipment

- **ENVR-01**: Biome-specific hazard resistance (thermal, pressure, radiation, toxin)
- **ENVR-02**: Aquatic-specific modules (pressure adaptation, current resistance)

## Out of Scope

| Feature | Reason |
|---------|--------|
| New entity mechanics/behaviors | Pure content expansion — uses existing systems only |
| Crafting system | Future milestone — separate mechanic |
| Faction reputation gating | No reputation system yet — faction gear available to all for now |
| New ability definitions | Existing 21 abilities sufficient for faction gear grants |
| Sprite art for new entities | Color tile fallbacks per CLAUDE.md — art pipeline separate |
| PvP balance implications | PvE-only currently |
| NPC trader inventory updates | Separate phase after gear exists |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CREA-01 | Phase 110 | Complete |
| CREA-02 | Phase 110 | Pending |
| CREA-03 | Phase 110 | Pending |
| CREA-04 | Phase 110 | Pending |
| CREA-05 | Phase 110 | Complete |
| CREA-06 | Phase 110 | Complete |
| PLNT-01 | Phase 111 | Pending |
| PLNT-02 | Phase 111 | Pending |
| PLNT-03 | Phase 111 | Pending |
| PLNT-04 | Phase 111 | Pending |
| MINR-01 | Phase 111 | Pending |
| MINR-02 | Phase 111 | Pending |
| MINR-03 | Phase 111 | Pending |
| MINR-04 | Phase 111 | Pending |
| MINR-05 | Phase 111 | Pending |
| ARTF-01 | Phase 111 | Pending |
| ARTF-02 | Phase 111 | Pending |
| ARTF-03 | Phase 111 | Pending |
| ARTF-04 | Phase 111 | Pending |
| ARTF-05 | Phase 111 | Pending |
| SUIT-01 | Phase 109 | Pending |
| SUIT-02 | Phase 112 | Pending |
| SUIT-03 | Phase 112 | Pending |
| SUIT-04 | Phase 112 | Pending |
| SUIT-05 | Phase 112 | Pending |
| SUIT-06 | Phase 112 | Pending |
| MODU-01 | Phase 113 | Pending |
| MODU-02 | Phase 113 | Pending |
| MODU-03 | Phase 113 | Pending |
| MODU-04 | Phase 113 | Pending |
| TOOL-01 | Phase 113 | Pending |
| TOOL-02 | Phase 113 | Pending |
| TOOL-03 | Phase 113 | Pending |
| TOOL-04 | Phase 113 | Pending |
| CINF-01 | Phase 108 | Complete |
| INTG-01 | Phase 114 | Pending |
| INTG-02 | Phase 114 | Pending |
| INTG-03 | Phase 114 | Pending |

**Coverage:**
- v1.23 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-03-02 — traceability complete, all 38 requirements mapped to phases 108-114*
