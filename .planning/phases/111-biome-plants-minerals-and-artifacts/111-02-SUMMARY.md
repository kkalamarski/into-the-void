---
phase: 111
plan: 02
status: complete
commit: 3aca603
tests_passed: 1939
entities_added: 19
---

# Plan 111-02 Summary: Tier II Biome Plants, Minerals, and Artifacts

## What was done

Populated five Tier II biomes (toxic_wastes, miasma_marshes, petrified_expanse, bioluminescent_depths, kelp_forests) with plants, minerals, and artifacts.

### Plants added (11)
- `plant_acid_bloom` + `plant_acid_bloom_rare` — toxic_wastes
- `plant_chemical_bloom` — toxic_wastes + miasma_marshes (shared)
- `plant_marsh_tendril` + `plant_gas_pod_rare` — miasma_marshes
- `plant_stone_moss` + `plant_calcite_fern` + `plant_mobile_vine_rare` — petrified_expanse
- `plant_reality_moss_rare` — bioluminescent_depths
- `plant_kelp_canopy` + `plant_pressure_fern_rare` — kelp_forests

### Minerals added (7)
- `mineral_acid_stone` + `mineral_corrosive_deposit_rare` — toxic_wastes
- `mineral_stone_heart` + `mineral_mineralized_log_rare` — petrified_expanse
- `mineral_depth_quartz` + `mineral_depth_quartz_rare` — bioluminescent_depths
- `mineral_pearl_node_rare` — kelp_forests

### Artifacts added (1)
- `artifact_marsh_filtration_unit` — miasma_marshes

## Files modified
- `packages/entities/src/definitions/plants.ts`
- `packages/entities/src/definitions/aquatic-plants.ts`
- `packages/entities/src/definitions/exotic-plants.ts`
- `packages/entities/src/definitions/minerals.ts`
- `packages/entities/src/definitions/aquatic-minerals.ts`
- `packages/entities/src/definitions/exotic-minerals.ts`
- `packages/entities/src/definitions/artifacts.ts`
- `packages/entities/src/definitions/index.ts`
- `packages/world-gen/src/generation/spawn.ts`
- `packages/world-gen/src/generation/rarity.ts`
- `packages/entities/src/__tests__/spawn-configs.test.ts`
