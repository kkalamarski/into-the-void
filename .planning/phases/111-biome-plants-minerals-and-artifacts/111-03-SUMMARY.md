---
phase: 111
plan: 03
status: complete
commit: 6f2bff8
tests_passed: 2240
entities_added: 28
---

# Plan 111-03 Summary: Tier III Biome Plants and Minerals

## What was done

Populated five Tier III biomes (crystal_caves, volcanic_ridge, frozen_expanse, deep_trenches, starfall_crater) with plants and minerals including rare and epic variants.

### Plants added (16)
- `plant_crystal_lichen` + `plant_prism_bloom` — crystal_caves (2 base)
- `plant_magma_bloom` + `plant_ash_vine` + `plant_thermal_vent_moss_rare` + `plant_magma_bloom_epic` — volcanic_ridge (2 base + rare + epic)
- `plant_frost_lichen` + `plant_cryo_bloom` + `plant_ice_algae_rare` + `plant_cryo_bloom_epic` — frozen_expanse (2 base + rare + epic)
- `plant_void_moss` + `plant_crater_fern` + `plant_star_lichen_rare` + `plant_void_moss_epic` — starfall_crater (2 base + rare + epic)
- `plant_void_kelp_rare` + `plant_thermal_vent_colony_epic` — deep_trenches (rare + epic)

### Minerals added (12)
- `mineral_cave_geode` + `mineral_prismatic_crystal_epic` — crystal_caves
- `mineral_obsidian_vein` + `mineral_volcanic_ore_epic` — volcanic_ridge
- `mineral_glacial_core` + `mineral_permafrost_shard_rare` + `mineral_glacial_core_epic` — frozen_expanse
- `mineral_trench_crystal` + `mineral_abyssal_ore_rare` + `mineral_abyssal_ore_epic` — deep_trenches
- `mineral_impact_glass` + `mineral_cosmic_fragment_epic` — starfall_crater

### Rarity system updates
- getRareBiomeMinerals(): added frozen_expanse, deep_trenches
- getEpicBiomeMinerals(): added crystal_caves, volcanic_ridge, frozen_expanse, deep_trenches, starfall_crater (replaced starfall_crater fallback with real epic)

## Files modified
- `packages/entities/src/definitions/plants.ts`
- `packages/entities/src/definitions/aquatic-plants.ts`
- `packages/entities/src/definitions/minerals.ts`
- `packages/entities/src/definitions/aquatic-minerals.ts`
- `packages/entities/src/definitions/index.ts`
- `packages/world-gen/src/generation/spawn.ts`
- `packages/world-gen/src/generation/rarity.ts`
- `packages/entities/src/__tests__/spawn-configs.test.ts`
