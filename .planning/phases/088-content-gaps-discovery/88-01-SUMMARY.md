---
phase: 088-content-gaps-discovery
plan: 01
subsystem: entities
tags: [content, gap-closure, biomes, gatherable, creatures]
dependency_graph:
  requires: [Phase 82 aquatic biomes, Phase 83 aquatic entities, Phase 86 exotic entities]
  provides: [Complete biome entity coverage for fungal_forest, miasma_marshes, toxic_wastes, frozen_expanse, starfall_crater, ancient_ruins]
  affects: [ZonesService spawn distribution, loot tables, player progression]
tech_stack:
  added: []
  patterns: [Entity definition extension, rarity scaling]
key_files:
  created: []
  modified:
    - packages/entities/src/definitions/plants.ts
    - packages/entities/src/definitions/minerals.ts
    - packages/entities/src/definitions/artifacts.ts
    - packages/entities/src/definitions/creatures.ts
    - packages/entities/src/definitions/index.ts
decisions:
  - Reuse existing textures for rare/epic variants (plant_luminous_vine, mineral_chemical_sump)
  - Rare fungi yields biogenic catalysts (aligns with Verdant Dynamics lore)
  - Epic spores include ancient_fragment drop (0.15 chance) for progression value
  - Toxic crystal combines toxic_residue + thermal_compound + crystal_fragment yields
  - Marsh gas node yields reagent_volatile_extract (epic-tier reagent)
  - Contaminated relic reuses void_touched_relic texture (thematic consistency)
  - Frozen archive reuses ancient_data_core texture (data storage device theme)
  - Starfall grazer is herbivore (feeds on mutated vegetation)
  - Crater stalker is predator using dimensional instability (anomaly zone adaptation)
  - Guardian construct is predator (ancient defense automaton)
  - Relic beast is omnivore (intelligent territorial creature)
metrics:
  duration: 266s
  completed: 2026-02-24T12:58:39Z
---

# Phase 88 Plan 01: Content Gap Closure Summary

Entity definitions added to fill biome content gaps across 7 underserved biomes (fungal_forest, miasma_marshes, toxic_wastes, frozen_expanse, starfall_crater, ancient_ruins).

## What Was Built

Added 10 new entity definitions to close content gaps:

**Plants (2):**
- PLANT_RARE_FUNGI (rare, fungal_forest) - Bioluminescent fungi with concentrated biogenic compounds
- PLANT_EPIC_SPORES (epic, fungal_forest) - Ancient spores with rare fragment drops

**Minerals (2):**
- MINERAL_TOXIC_CRYSTAL (rare, miasma_marshes) - Crystallized toxins with chemical properties
- MINERAL_MARSH_GAS_NODE (epic, miasma_marshes) - Pressurized gas vent with volatile extracts

**Artifacts (2):**
- ARTIFACT_CONTAMINATED_RELIC (rare, toxic_wastes) - Prior Inhabitant tech saturated with toxins
- ARTIFACT_FROZEN_ARCHIVE (epic, frozen_expanse) - Ice-locked data storage device

**Creatures (4):**
- CREATURE_STARFALL_GRAZER (herbivore, starfall_crater) - Docile anomaly-adapted herbivore
- CREATURE_CRATER_STALKER (predator, starfall_crater) - Dimensional ambush predator
- CREATURE_GUARDIAN_CONSTRUCT (predator, ancient_ruins) - Ancient defense automaton
- CREATURE_RELIC_BEAST (omnivore, ancient_ruins) - Intelligent territorial mutant

## Key Implementation Details

**Rarity Distribution:**
- Rare variants (4): Rare fungi, toxic crystal, contaminated relic, plus existing patterns
- Epic variants (2): Epic spores, marsh gas node, frozen archive

**Yield Design:**
- Fungal entities yield biogenic catalysts and fungal extracts (Verdant Dynamics research materials)
- Marsh entities yield thermal compounds and volatile extracts (hazardous materials theme)
- Epic spores include ancient_fragment drop (0.15 chance) for progression hooks
- Toxic crystal combines 3 material types (toxic_residue, thermal_compound, crystal_fragment)

**Creature Behavior Balance:**
- Herbivore (1): Starfall grazer (docile, level 12-22)
- Omnivore (1): Relic beast (territorial, level 10-20)
- Predator (2): Crater stalker (level 15-25), Guardian construct (level 14-24)

**Entity Registry Integration:**
- All 10 entities added to ENTITY_IDS constants
- ALL_* arrays updated with Phase 88 additions
- Entity count: 82 → 92 (+10)

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

**Manual verification needed:**
1. ZonesService spawn distribution includes new entities in respective biomes
2. Loot tables created for all 10 new entities (loot_plant_rare_fungi, etc.)
3. Texture fallbacks render correctly for reused textures
4. Rarity scaling applies to render size for rare/epic variants

**TypeScript compilation:** Passed (npx tsc --noEmit)

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| packages/entities/src/definitions/plants.ts | +2 plant definitions (rare fungi, epic spores) | +43 |
| packages/entities/src/definitions/minerals.ts | +2 mineral definitions (toxic crystal, marsh gas node) | +40 |
| packages/entities/src/definitions/artifacts.ts | +2 artifact definitions (contaminated relic, frozen archive) | +32 |
| packages/entities/src/definitions/creatures.ts | +4 creature definitions (starfall/crater/construct/relic) | +70 |
| packages/entities/src/definitions/index.ts | +10 ENTITY_IDS constants, update comment | +15 |

## Commits

| Commit | Message |
|--------|---------|
| 91d5884 | feat(88-01): add rare/epic plants and minerals for fungal_forest and miasma_marshes |
| 24e4fd4 | feat(88-01): add artifacts for toxic_wastes and frozen_expanse, creatures for starfall_crater and ancient_ruins |
| a0884ff | feat(88-01): register new Phase 88 entities in ENTITY_IDS |

## Next Steps

**Immediate:**
1. Complete Phase 88-02 (create loot tables for new entities)
2. Verify spawn distribution in ZonesService includes new entities
3. Test rare/epic spawn rates in respective biomes

**Future Considerations:**
- Texture assets needed: 10 new entity sprites (currently using fallback textures)
- Loot tables for all 10 entities (loot_plant_rare_fungi through loot_creature_relic_beast)
- Biome population density adjustments if needed after testing

## Research Flags

None - straightforward entity definition additions.

## Self-Check: PASSED

All created entities verified present in definition files:
- PLANT_RARE_FUNGI: Found in plants.ts line 247
- PLANT_EPIC_SPORES: Found in plants.ts line 264
- MINERAL_TOXIC_CRYSTAL: Found in minerals.ts line 271
- MINERAL_MARSH_GAS_NODE: Found in minerals.ts line 290
- ARTIFACT_CONTAMINATED_RELIC: Found in artifacts.ts line 70
- ARTIFACT_FROZEN_ARCHIVE: Found in artifacts.ts line 83
- CREATURE_STARFALL_GRAZER: Found in creatures.ts line 277
- CREATURE_CRATER_STALKER: Found in creatures.ts line 293
- CREATURE_GUARDIAN_CONSTRUCT: Found in creatures.ts line 309
- CREATURE_RELIC_BEAST: Found in creatures.ts line 325

All commits verified:
- 91d5884: Found in git log
- 24e4fd4: Found in git log
- a0884ff: Found in git log

TypeScript compilation: Passed
