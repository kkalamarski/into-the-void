---
phase: 88-content-gaps-discovery
plan: 03
subsystem: world-gen
tags: [spawn-integration, gap-closure, biome-completion]
dependency_graph:
  requires: [88-01, 88-02]
  provides: ["All Phase 88 entities spawn in appropriate biomes"]
  affects: ["World generation", "Player discovery experience"]
tech_stack:
  added: []
  patterns: ["Weighted spawn tables", "Biome-specific entity distribution"]
key_files:
  created: []
  modified:
    - path: packages/world-gen/src/generation/spawn.ts
      summary: "Added 10 Phase 88 entities to BIOME_SPAWN_CONFIGS"
decisions:
  - summary: "Maintained weight/rarity patterns consistent with existing biome spawns"
    rationale: "PLANT_RARE_FUNGI weight 2 matches PLANT_LUMINOUS_VINE_RARE; epic variants weight 1"
  - summary: "Added contaminated relic to toxic_wastes (previously empty artifacts array)"
    rationale: "Matches ARTIFACT_THERMAL_CORE pattern in volcanic_ridge (weight 6, epic)"
  - summary: "Frozen archive as secondary epic artifact in frozen_expanse"
    rationale: "Lower weight (5) than primary rare artifact (10) for progression balance"
  - summary: "Starfall grazer higher weight than crater stalker (herbivore vs predator)"
    rationale: "Weight 6 vs 4 reflects ecosystem balance (grazers more common than predators)"
metrics:
  duration: 154
  tasks_completed: 4
  files_modified: 1
  commits: 4
  completed_at: "2026-02-24"
---

# Phase 88 Plan 03: Biome Spawn Integration Summary

Integrated all 10 Phase 88 entities into biome spawn tables, enabling in-game discovery.

## What Was Done

### Task 1: Fungal Forest Plant Variants (fbbcebd)
**Added rare/epic plant variants to fungal_forest spawn config**

Added two new plant spawns:
- `PLANT_RARE_FUNGI`: weight 2, rarity 'rare' (matches existing rare vine pattern)
- `PLANT_EPIC_SPORES`: weight 1, rarity 'epic' (lower weight for epic tier)

**Files modified:**
- `packages/world-gen/src/generation/spawn.ts` (lines 164-168)

### Task 2: Miasma Marshes Mineral Variants (9c1ad16)
**Added rare/epic mineral variants to miasma_marshes spawn config**

Added two new mineral spawns:
- `MINERAL_TOXIC_CRYSTAL`: weight 5, rarity 2 (rare tier)
- `MINERAL_MARSH_GAS_NODE`: weight 3, rarity 3 (epic tier, harder to find)

**Files modified:**
- `packages/world-gen/src/generation/spawn.ts` (lines 198-200)

### Task 3: Artifact Integration (ffc021e)
**Added artifacts to toxic_wastes and frozen_expanse spawn configs**

**toxic_wastes:**
- Replaced empty artifacts array with `ARTIFACT_CONTAMINATED_RELIC` (weight 6, epic)
- Pattern matches `ARTIFACT_THERMAL_CORE` in volcanic_ridge

**frozen_expanse:**
- Added `ARTIFACT_FROZEN_ARCHIVE` (weight 5, epic) as secondary artifact
- Lower weight than primary `ARTIFACT_PRESERVED_SPECIMEN` (weight 10, rare)

**Files modified:**
- `packages/world-gen/src/generation/spawn.ts` (lines 91, 129-131)

### Task 4: Creature Population (2991735)
**Added new creatures to starfall_crater and ancient_ruins spawn configs**

**starfall_crater:**
- `CREATURE_STARFALL_GRAZER`: weight 6, levels 12-22 (herbivore, more common)
- `CREATURE_CRATER_STALKER`: weight 4, levels 15-25 (predator, rarer)

**ancient_ruins:**
- `CREATURE_GUARDIAN_CONSTRUCT`: weight 4, levels 14-24 (predator)
- `CREATURE_RELIC_BEAST`: weight 5, levels 10-20 (omnivore)

**Files modified:**
- `packages/world-gen/src/generation/spawn.ts` (lines 175-178, 98-101)

## Verification Results

**TypeScript compilation:** ✅ PASSED
```bash
npx nx run world-gen:build
# Successfully ran target build for project world-gen
```

**Entity ID validation:** ✅ PASSED
```bash
grep -E "ENTITY_IDS\.(PLANT_RARE_FUNGI|...)" spawn.ts | wc -l
# 10 (all Phase 88 entities present)
```

**Test suite:** ⚠️ SKIPPED (known infrastructure issue)
- vitest configuration error in nx (documented in STATE.md)
- Not a regression from this plan - pre-existing issue
- TypeScript compilation validates entity references

## Deviations from Plan

None - plan executed exactly as written.

## Gap Closure Status

**Before Plan 88-03:**
- All 10 Phase 88 entities defined in `packages/entities/src/definitions/`
- Entities registered in LoreRegistry (Plan 88-02)
- Entities NOT referenced in `BIOME_SPAWN_CONFIGS` → **cannot spawn in game**

**After Plan 88-03:**
- ✅ fungal_forest plants: PLANT_RARE_FUNGI, PLANT_EPIC_SPORES
- ✅ miasma_marshes minerals: MINERAL_TOXIC_CRYSTAL, MINERAL_MARSH_GAS_NODE
- ✅ toxic_wastes artifacts: ARTIFACT_CONTAMINATED_RELIC (no longer empty)
- ✅ frozen_expanse artifacts: ARTIFACT_FROZEN_ARCHIVE (secondary epic)
- ✅ starfall_crater creatures: CREATURE_STARFALL_GRAZER, CREATURE_CRATER_STALKER
- ✅ ancient_ruins creatures: CREATURE_GUARDIAN_CONSTRUCT, CREATURE_RELIC_BEAST

**Gap closed:** All Phase 88 entities can now spawn in their intended biomes.

## Impact Assessment

**Player experience changes:**
- Players can now gather rare fungi and epic spores in fungal forests
- Toxic crystals and marsh gas nodes available in miasma marshes
- Contaminated relics discoverable in toxic wastes
- Frozen archives findable in frozen expanse
- Starfall grazers and crater stalkers encountered in starfall craters
- Guardian constructs and relic beasts populate ancient ruins

**Spawn distribution:**
- Weight values maintain existing biome balance patterns
- Rare/epic rarities ensure progression value (not oversaturated)
- Creature level ranges match biome tier (starfall_crater: 12-25, ancient_ruins: 10-30)

**Dependencies satisfied:**
- Plan 88-01: Entity definitions (plants, minerals, artifacts, creatures)
- Plan 88-02: Lore fragments registered in LoreRegistry
- Plan 88-03: Entities integrated into spawn tables ← **THIS PLAN**

## Self-Check: PASSED

**Created files exist:**
- `.planning/phases/088-content-gaps-discovery/88-03-SUMMARY.md` ✅

**Modified files exist:**
```bash
[ -f "packages/world-gen/src/generation/spawn.ts" ] && echo "FOUND"
# FOUND: packages/world-gen/src/generation/spawn.ts
```

**Commits exist:**
```bash
git log --oneline --all | grep -E "(fbbcebd|9c1ad16|ffc021e|2991735)"
# fbbcebd feat(88-03): add rare/epic plant variants to fungal_forest
# 9c1ad16 feat(88-03): add rare/epic mineral variants to miasma_marshes
# ffc021e feat(88-03): add artifacts to toxic_wastes and frozen_expanse
# 2991735 feat(88-03): add new creatures to starfall_crater and ancient_ruins
```

All verification checks passed.

---

**Plan complete.** All 10 Phase 88 entities integrated into biome spawn configurations. Gap closure requirement satisfied - entities can now spawn in game.
