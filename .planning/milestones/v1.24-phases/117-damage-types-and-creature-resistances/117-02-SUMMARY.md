---
phase: 117-damage-types-and-creature-resistances
plan: "02"
subsystem: entities
tags: [creatures, combat, resistances, biomes, data-layer]
dependency_graph:
  requires: [117-01]
  provides: [biome-resistance-profiles, creature-resistances]
  affects: [game-logic/combat, world-gen/spawns]
tech_stack:
  added: []
  patterns: [lookup-table, strategy-pattern]
key_files:
  created:
    - packages/entities/src/biome-resistance-profiles.ts
  modified:
    - packages/entities/src/definitions/creatures.ts
    - packages/entities/src/definitions/aquatic-creatures.ts
    - packages/entities/src/definitions/exotic-creatures.ts
    - packages/entities/src/index.ts
decisions:
  - "All creatures use their primary biome (first entry in biomes array) for resistance lookup — no per-creature overrides"
  - "BIOME_RESISTANCE_PROFILES is a Record<BiomeType, DamageResistances> — covers all 16 BiomeType values exactly"
  - "Values are percentage points matching Phase 117 research spec (60 = 60% reduction, -40 = 40% vulnerability)"
metrics:
  duration: 12m
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_changed: 5
---

# Phase 117 Plan 02: Biome Resistance Profiles and Creature Resistances Summary

**One-liner:** BIOME_RESISTANCE_PROFILES lookup table covering all 16 BiomeType values populated across 77 creature definitions replacing NEUTRAL_RESISTANCES.

## What Was Built

### Task 1: BIOME_RESISTANCE_PROFILES Lookup Table

New file `packages/entities/src/biome-resistance-profiles.ts` provides a typed `Record<BiomeType, DamageResistances>` with thematic resistance values for all 16 biomes:

- **Tier I (Frontier):** void_plains neutral, fungal_forest bio+40, ancient_ruins kinetic+20, tidal_pools cryo+30
- **Tier II (Hazardous):** toxic_wastes bio+60, miasma_marshes bio+50, petrified_expanse kinetic+40, bioluminescent_depths mixed, kelp_forests cryo+20/bio+20
- **Tier III (Hostile):** frozen_expanse thermal-40/cryo+60, volcanic_ridge thermal+60/cryo-40, crystal_caves cryo+20/kinetic+50, crystalline_wastes cryo+30/kinetic+50, starfall_crater thermal+20/bio-20, deep_trenches thermal+20/cryo+40/bio+30/kinetic-20
- **Tier IV (Extreme):** void_rift kinetic-30 (reality-distorted)

Exported from entities package `index.ts` as `BIOME_RESISTANCE_PROFILES`.

### Task 2: Creature Definitions Updated

All 77 creatures across three files updated from `NEUTRAL_RESISTANCES` to `BIOME_RESISTANCE_PROFILES[biome]`:

| File | Creatures Updated |
|------|-------------------|
| `creatures.ts` | 48 (void_plains, fungal_forest, crystal_caves, miasma_marshes, petrified_expanse, frozen_expanse, volcanic_ridge, toxic_wastes, ancient_ruins, starfall_crater) |
| `aquatic-creatures.ts` | 14 (tidal_pools, kelp_forests, deep_trenches) |
| `exotic-creatures.ts` | 15 (bioluminescent_depths, crystalline_wastes, void_rift) |

`NEUTRAL_RESISTANCES` import removed from all three files. Multi-biome creatures (e.g. `CREATURE_CRYSTAL_GRAZER` with `biomes: ['crystal_caves', 'crystalline_wastes']`) use their first biome.

## Verification

- TypeScript type check: PASSED (`npx tsc --noEmit -p packages/entities/tsconfig.json`)
- Entity tests: 2350/2350 PASSED (id-constants, harvest-yields, loot-tables, spawn-configs)
- BIOME_RESISTANCE_PROFILES references: 80 total (1 import + creature count per file)
- NEUTRAL_RESISTANCES references: 0 in all creature definition files

## Success Criteria Verification

- [x] BIOME_RESISTANCE_PROFILES covers all 16 BiomeType values
- [x] Frozen Expanse profile is { thermal: -40, cryo: 60, bio: 0, kinetic: 10 }
- [x] Volcanic Ridge profile is { thermal: 60, cryo: -40, bio: 0, kinetic: 10 }
- [x] Void Rift profile is { thermal: 0, cryo: 0, bio: 0, kinetic: -30 }
- [x] Every creature definition references BIOME_RESISTANCE_PROFILES[biome] not NEUTRAL_RESISTANCES
- [x] Entity validation tests pass

## Decisions Made

1. **Primary biome rule:** Creatures with multiple biomes use the first entry in their `biomes` array for resistance lookup. This prevents ambiguity and ensures consistency.

2. **Lookup table over magic numbers:** BIOME_RESISTANCE_PROFILES enforces biome consistency — all creatures in a biome share identical resistances without per-creature overrides. Future biome additions only require one profile change.

3. **No resistance for non-creature entities:** Plants, minerals, and artifacts do not have resistance fields — only creatures. This is correct per the `CreatureDefinition` interface.

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| c6c7f80 | feat(117-02): create BIOME_RESISTANCE_PROFILES lookup table |
| b1a4986 | feat(117-02): populate all 77 creature definitions with biome resistance profiles |

## Self-Check: PASSED

- biome-resistance-profiles.ts: FOUND
- creatures.ts: FOUND
- aquatic-creatures.ts: FOUND
- exotic-creatures.ts: FOUND
- Commit c6c7f80: FOUND
- Commit b1a4986: FOUND
