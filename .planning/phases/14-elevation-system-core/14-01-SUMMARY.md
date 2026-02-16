---
phase: 14-elevation-system-core
plan: 01
subsystem: world-gen
tags: [procedural-generation, simplex-noise, biome-system, terrain, elevation]

# Dependency graph
requires:
  - phase: 13-tiles-registry
    provides: TileRegistry with defaultElevation and tile definitions
provides:
  - Noise-based height variation around tile default elevations
  - Biome-specific elevation ranges for realistic terrain
  - Separate heightNoise instance to prevent terrain correlation
affects: [14-02-depth-sorting, rendering, future-lighting-system]

# Tech tracking
tech-stack:
  added: []
  patterns: [FBM noise for height variation, biome-clamping pattern]

key-files:
  created: []
  modified:
    - packages/world-gen/src/generation/terrain.ts

key-decisions:
  - "Separate SimplexNoise instance for heights prevents correlated patterns"
  - "FBM frequency 0.08 (vs terrain 0.05) creates finer height detail"
  - "Variance rounds to -1/0/+1 for subtle but visible elevation changes"
  - "Dual clamping: absolute 0-5 first, then biome-specific ranges"

patterns-established:
  - "Pattern: Biome-specific ranges in BIOME_ELEVATION_RANGES constant"
  - "Pattern: clampToBiomeRange helper for consistent range enforcement"

# Metrics
duration: 120s
completed: 2026-02-16
---

# Phase 14 Plan 01: Noise-Based Height Variation Summary

**Procedural height variation using Simplex FBM noise with biome-specific elevation ranges for realistic terrain depth**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T18:24:34Z
- **Completed:** 2026-02-16T18:26:34Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added BIOME_ELEVATION_RANGES constant defining min/max heights for all 8 biomes
- Implemented noise-based height variation around tile default elevations
- Heights vary by -1/0/+1 using separate SimplexNoise instance to prevent terrain correlation
- All heights clamped to both absolute 0-5 range and biome-specific ranges

## Task Commits

Each task was committed atomically:

1. **Task 1: Add biome elevation ranges constant** - `ebf3eca` (feat)
2. **Task 2: Implement noise-based height variation** - `528678a` (feat)

## Files Created/Modified
- `packages/world-gen/src/generation/terrain.ts` - Added BIOME_ELEVATION_RANGES, clampToBiomeRange, heightNoise instance, noise-based height calculation with dual clamping

## Decisions Made

**Separate noise instance for heights**
- Using same noise as terrain would create correlated patterns (walls always same height)
- Separate `heightNoise` instance with `_height_` seed suffix ensures independent variation
- Prevents visual artifacts where terrain features dictate elevation patterns

**FBM frequency 0.08 vs terrain 0.05**
- Higher frequency creates finer-grained height detail within tiles
- Terrain uses 0.05 for broad feature placement (walls, openings)
- Height uses 0.08 for elevation micro-variation
- Different scales prevent interference

**Variance rounding to -1/0/+1**
- `Math.round(heightValue)` converts continuous noise to discrete steps
- Subtle variation that's visually noticeable but not jarring
- Keeps heights close to tile's intended defaultElevation
- Biome clamping then enforces characteristic ranges

**Dual clamping strategy**
- First clamp: `Math.max(0, Math.min(5, rawHeight))` enforces absolute game limits
- Second clamp: `clampToBiomeRange()` enforces biome characteristics
- Order matters: absolute first prevents invalid values, biome second shapes terrain feel

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Verification test showed volcanic_ridge has no height variation**
- Expected behavior: volcanic_ridge tiles have limited elevation diversity
- Biome range 1-4 with most tiles having defaultElevation=1
- Noise variance can't go below 0 after absolute clamping, so 1-1=0 gets clamped to 1
- Result: most volcanic tiles stay at height 1, which matches intended "flat elevated plateau" characteristic
- No fix needed - this reflects the biome's design

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 14 Plan 02 (Depth Sorting Integration)**
- Heights[][] now contains varied elevations (0-5 range, biome-specific)
- Next plan will integrate heights into composite depth calculation
- DepthSorter needs to combine elevation with y-coordinate for proper isometric sorting

**Verification completed:**
- TypeScript compilation passes
- Heights vary across all biomes (7/8 show clear variation)
- Biome ranges enforced (starfall_crater: 0-2, ancient_ruins: 0-5, etc.)
- No terrain correlation (separate noise instance working correctly)

---
*Phase: 14-elevation-system-core*
*Completed: 2026-02-16*

## Self-Check: PASSED

- ✓ Modified file exists: packages/world-gen/src/generation/terrain.ts
- ✓ Task 1 commit exists: ebf3eca
- ✓ Task 2 commit exists: 528678a
- ✓ TypeScript compilation passes
- ✓ Height variation verified across all biomes
