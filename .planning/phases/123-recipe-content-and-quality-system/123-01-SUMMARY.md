---
phase: 123-recipe-content-and-quality-system
plan: 01
subsystem: game-logic
tags: [crafting, quality, xp-decay, vitest, pure-functions]

requires:
  - phase: 122
    provides: CraftingService foundation, RecipeDefinition types, QualityTier type
provides:
  - Quality tier probability roll function (rollQualityTier)
  - Quality stat multiplier function (getQualityStatMultiplier)
  - XP decay calculation for proficiency-based diminishing returns
  - Barrel exports from game-logic/crafting
affects: [123-03, crafting-service-integration]

tech-stack:
  added: []
  patterns: [injectable-rng-for-testing, exponential-decay-with-floor]

key-files:
  created:
    - packages/game-logic/src/crafting/quality.ts
    - packages/game-logic/src/crafting/quality.test.ts
    - packages/game-logic/src/crafting/xp-decay.ts
    - packages/game-logic/src/crafting/xp-decay.test.ts
    - packages/game-logic/src/crafting/index.ts
  modified:
    - packages/game-logic/src/index.ts

key-decisions:
  - "Quality scaling uses power curve with exponent 1.3 for non-linear level progression"
  - "Tier penalty uses 0.7 geometric decay per tier level"
  - "XP decay uses exponential decay 2^(-diff/3) with 2-level grace zone and 10% floor"
  - "Injectable RNG parameter in rollQualityTier for deterministic testing"

patterns-established:
  - "Pure function pattern: quality/XP calculations as stateless pure functions in game-logic package"
  - "Injectable RNG: rng parameter defaults to Math.random, overridden in tests"

requirements-completed: [PROF-01, PROF-03, PROF-04]

duration: 12min
completed: 2026-03-05
---

# Phase 123 Plan 01: Quality Tier Calculation and XP Decay Summary

**Pure functions for quality tier probability rolls (Standard/Refined/Masterwork) and XP decay with exponential curve, grace zone, and 10% floor**

## Performance

- **Duration:** 12 min
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Quality roll system with level-scaled masterwork/refined probabilities and tier penalty
- XP decay preventing low-tier grinding (exponential curve, 2-level grace, 10% floor)
- 24 tests (13 quality + 11 XP decay) all passing
- Barrel exports from game-logic for clean integration

## Task Commits

1. **Task 1: Quality tier functions + tests** - `1eac427` (feat)
2. **Task 2: XP decay functions + tests** - `1eac427` (feat)
3. **Task 3: Barrel exports** - `1eac427` (feat)

## Files Created/Modified
- `packages/game-logic/src/crafting/quality.ts` - rollQualityTier, getQualityThresholds, getQualityStatMultiplier
- `packages/game-logic/src/crafting/quality.test.ts` - 13 tests for quality probability system
- `packages/game-logic/src/crafting/xp-decay.ts` - calculateXPDecay, calculateEffectiveXP
- `packages/game-logic/src/crafting/xp-decay.test.ts` - 11 tests for XP decay
- `packages/game-logic/src/crafting/index.ts` - Barrel export
- `packages/game-logic/src/index.ts` - Added crafting re-export

## Decisions Made
- Used injectable RNG for deterministic quality roll testing
- Calibrated XP decay: ~50% at 5 levels above recipe, ~16% at 10 levels, floor at 10%

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Initial XP decay test had incorrect assertion for level 50/tier 5 case (diff=10 is not within grace zone). Fixed by adjusting test expectations.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Pure functions ready for Plan 03 integration into CraftingService

---
*Phase: 123-recipe-content-and-quality-system*
*Completed: 2026-03-05*
