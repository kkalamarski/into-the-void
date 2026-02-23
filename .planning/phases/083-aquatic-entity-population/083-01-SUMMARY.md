---
phase: 83-aquatic-entity-population
plan: 01
subsystem: entities
tags: [content, aquatic, creatures, plants, minerals, artifacts]
dependency_graph:
  requires: []
  provides:
    - 23 aquatic entity definitions (10 creatures, 5 plants, 5 minerals, 3 artifacts)
    - ENTITY_IDS constants for all aquatic entities
    - ALL_ENTITIES registry integration
  affects:
    - packages/entities/src/definitions/*.ts
    - Entity spawn systems (Phase 83-02)
tech_stack:
  added: []
  patterns:
    - Entity definition patterns (creatures, plants, minerals, artifacts)
    - HarvestYield configuration with existing items
    - Phase 81 health balance targets
key_files:
  created:
    - packages/entities/src/definitions/aquatic-creatures.ts
    - packages/entities/src/definitions/aquatic-plants.ts
    - packages/entities/src/definitions/aquatic-minerals.ts
    - packages/entities/src/definitions/aquatic-artifacts.ts
  modified:
    - packages/entities/src/definitions/index.ts
decisions:
  - title: "Use existing items for harvest yields"
    rationale: "Aquatic-specific items will be added in Phase 86. For now, use generic organic materials, crystals, and reagents that already exist in packages/items."
    alternatives: ["Create placeholder aquatic items", "Skip harvest yields"]
    impact: "Allows spawn configuration to proceed in Plan 02 without blocking on new item definitions."
  - title: "Phase 81 health balance targets"
    rationale: "Apply Phase 81 balance targets (Tier I: 70-100 HP, Tier II: 120-160 HP, Tier III: 180-220 HP, Tier IV: 260-320 HP) to aquatic creatures for consistency."
    alternatives: ["Use different balance curve", "Defer balance to later phase"]
    impact: "Ensures aquatic combat difficulty matches land-based biomes at equivalent tiers."
  - title: "Maniac-tier Abyssal Leviathan"
    rationale: "Deep trenches need a high-threat endgame creature similar to Void Horror in ruins/crater."
    alternatives: ["Use predator behavior", "Add multiple high-tier creatures"]
    impact: "Creates clear risk/reward signal for deep trench exploration."
metrics:
  duration: 211s
  task_count: 4
  file_count: 5
  completed_at: 2026-02-23
---

# Phase 83 Plan 01: Aquatic Entity Population Summary

**One-liner:** Define 23 aquatic entities (10 creatures, 5 plants, 5 minerals, 3 artifacts) using existing item yields and Phase 81 health balance.

## Objective

Populate aquatic biomes (tidal_pools, kelp_forests, deep_trenches) with harvestable resources and fauna. This phase uses proven entity definition patterns from Phase 33-38 and references only verified-existing items from packages/items. Aquatic-specific items (kelp extracts, pearl fragments, etc.) will be added in Phase 86.

## Execution

### Task 1: Create Aquatic Creature Definitions
**Status:** ✅ Complete
**Commit:** 9dc7210
**Files:** packages/entities/src/definitions/aquatic-creatures.ts

Created 10 aquatic creatures across 4 tiers:
- **Tier I (Tidal Pools):** Tide Crab (75 HP), Coastal Urchin (70 HP), Reef Scavenger (85 HP)
- **Tier II (Kelp Forests):** Kelp Grazer (125 HP), Tangle Stalker (155 HP), Current Rider (135 HP)
- **Tier III (Deep Trenches):** Pressure Feeder (180 HP), Trench Hunter (210 HP), Abyssal Scavenger (190 HP)
- **Tier IV (Maniac):** Abyssal Leviathan (300 HP, deep trenches only, 900s respawn)

All health values follow Phase 81 balance targets. Respawn times scale by tier: Tier I (180-240s), Tier II (280-360s), Tier III (400-480s), Tier IV (900s).

### Task 2: Create Aquatic Plant Definitions
**Status:** ✅ Complete
**Commit:** e8605e7
**Files:** packages/entities/src/definitions/aquatic-plants.ts

Created 5 aquatic plants with harvest yields:
1. **Tidal Kelp** (tidal_pools) - world_organic_material_common (1-2)
2. **Bioluminescent Algae** (tidal_pools, kelp_forests) - organic common + reagent_biogenic_catalyst (15%)
3. **Pressure Fern** (kelp_forests, deep_trenches) - world_organic_material_rare (1-2) + reagent_thermal_compound (25%)
4. **Void Kelp** (deep_trenches) - world_organic_material_rare (2-3)
5. **Thermal Vent Colony** (deep_trenches) - world_geothermal_compound (1-2) + reagent_thermal_compound (25%)

All itemId values verified to exist in packages/items/src/definitions/index.ts. No placeholder or non-existent items used.

### Task 3: Create Aquatic Mineral and Artifact Definitions
**Status:** ✅ Complete
**Commit:** c2ff9ce
**Files:** packages/entities/src/definitions/aquatic-minerals.ts, packages/entities/src/definitions/aquatic-artifacts.ts

**Minerals (5):**
1. **Coral Deposit** (T1, tidal_pools) - organic common (2-4) + catalyst (20%)
2. **Sea Crystal** (T1, tidal/kelp) - crystal_fragment (1-2) + crystalline_dust (20%)
3. **Abyssal Ore** (T3, deep_trenches) - void_crystal (1-2) + void_essence (15%)
4. **Tidal Stone** (T1, tidal_pools) - crater_dust (2-3)
5. **Pearl Node** (T2, kelp_forests) - organic rare (1-2) + catalyst (40%)

**Artifacts (3):**
1. **Sunken Tech** (kelp/trenches, epic) - Prior Inhabitant tech
2. **Ancient Shell** (trenches, rare) - Fossilized fauna
3. **Drowned Relic** (trenches, legendary) - Prior artifact

All mining yields use verified existing items. Artifacts follow non-respawning pattern (respawns: false).

### Task 4: Register Aquatic Entities in Index
**Status:** ✅ Complete
**Commit:** 7c37cf8
**Files:** packages/entities/src/definitions/index.ts

- Added imports for 4 aquatic entity arrays
- Spread aquatic arrays into ALL_ENTITIES (now 58 total entities, up from 35)
- Added 23 ENTITY_IDS constants following naming convention
- Added barrel re-exports for aquatic definition files
- Updated documentation comment to reflect new entity count

## Deviations from Plan

None - plan executed exactly as written.

## Verification

**Build verification:**
```bash
npx nx run entities:build
# Result: SUCCESS
```

**Entity registry verification:**
```bash
grep -r "CREATURE_TIDE_CRAB" packages/entities/src/definitions/
# Result: Found in aquatic-creatures.ts and index.ts (ENTITY_IDS)
```

**Array exports verification:**
```bash
grep -r "ALL_AQUATIC" packages/entities/src/definitions/ | grep "export const"
# Result: 4 arrays (creatures, plants, minerals, artifacts)
```

**Item ID verification:**
All harvest/mining yield itemIds verified to exist in packages/items/src/definitions/index.ts:
- world_organic_material_common ✓
- world_organic_material_rare ✓
- world_geothermal_compound ✓
- world_crystal_fragment ✓
- world_crater_dust ✓
- world_void_crystal ✓
- reagent_biogenic_catalyst ✓
- reagent_thermal_compound ✓
- reagent_crystalline_dust ✓
- reagent_void_essence ✓

## Research Flags

None - straightforward content expansion using established patterns.

## Next Steps

**Phase 83 Plan 02:** Configure aquatic entity spawns
- Assign spawn densities per biome tier
- Configure spawn points in ZonesService
- Test aquatic entity interactions (movement, combat, harvesting)

**Phase 86:** Add aquatic-specific items
- Kelp extracts, pearl fragments, bioluminescent samples
- Update aquatic plant/mineral yields to use new items
- Create aquatic-themed crafting recipes

## Self-Check: PASSED

**File existence:**
```bash
[ -f "packages/entities/src/definitions/aquatic-creatures.ts" ] && echo "FOUND: aquatic-creatures.ts" || echo "MISSING: aquatic-creatures.ts"
# Result: FOUND: aquatic-creatures.ts

[ -f "packages/entities/src/definitions/aquatic-plants.ts" ] && echo "FOUND: aquatic-plants.ts" || echo "MISSING: aquatic-plants.ts"
# Result: FOUND: aquatic-plants.ts

[ -f "packages/entities/src/definitions/aquatic-minerals.ts" ] && echo "FOUND: aquatic-minerals.ts" || echo "MISSING: aquatic-minerals.ts"
# Result: FOUND: aquatic-minerals.ts

[ -f "packages/entities/src/definitions/aquatic-artifacts.ts" ] && echo "FOUND: aquatic-artifacts.ts" || echo "MISSING: aquatic-artifacts.ts"
# Result: FOUND: aquatic-artifacts.ts
```

**Commit existence:**
```bash
git log --oneline --all | grep -q "9dc7210" && echo "FOUND: 9dc7210" || echo "MISSING: 9dc7210"
# Result: FOUND: 9dc7210

git log --oneline --all | grep -q "e8605e7" && echo "FOUND: e8605e7" || echo "MISSING: e8605e7"
# Result: FOUND: e8605e7

git log --oneline --all | grep -q "c2ff9ce" && echo "FOUND: c2ff9ce" || echo "MISSING: c2ff9ce"
# Result: FOUND: c2ff9ce

git log --oneline --all | grep -q "7c37cf8" && echo "FOUND: 7c37cf8" || echo "MISSING: 7c37cf8"
# Result: FOUND: 7c37cf8
```

All files created and all commits verified.

---

**Phase 83 Plan 01 complete.** Ready to proceed to Plan 02 (aquatic spawn configuration).
