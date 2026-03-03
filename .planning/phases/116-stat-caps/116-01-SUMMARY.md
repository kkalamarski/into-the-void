---
phase: 116-stat-caps
plan: 01
subsystem: game-logic
tags: [stats, diminishing-returns, tdd, vitest]

requires:
  - phase: none
    provides: existing computeCharStats function
provides:
  - applyDiminishingReturns() pure function with soft cap 200, hard cap 400
  - computeCharStats options.skipDR parameter for raw stat access
  - DR unit tests covering full curve (0, 100, 200, 250, 300, 400, 500, 600, 800, 1000)
affects: [116-02, 116-03, combat, abilities, ai, stat-display]

tech-stack:
  added: []
  patterns: [post-processing DR in single authoritative computation path]

key-files:
  created: []
  modified:
    - packages/game-logic/src/stats/char-stats.ts
    - packages/game-logic/src/stats/char-stats.test.ts

key-decisions:
  - "DR applied as post-processing loop in computeCharStats, not per-stat-source"
  - "skipDR option parameter added for raw stat retrieval (used by emitStats)"
  - "Negative values pass through unchanged (defensive edge case)"

patterns-established:
  - "Pure function pattern: applyDiminishingReturns has no side effects, easy to test and reuse"
  - "Options bag pattern: computeCharStats uses options object for extensibility"

requirements-completed: [CAPS-01, CAPS-02, CAPS-03]

duration: 12min
completed: 2026-03-03
---

# Plan 01: DR Function + Tests Summary

**Pure applyDiminishingReturns() function with TDD (soft cap 200 at 0.5x, hard cap 400) integrated into computeCharStats**

## Performance

- **Duration:** 12 min
- **Tasks:** 2 (RED + GREEN TDD phases)
- **Files modified:** 2

## Accomplishments
- Implemented applyDiminishingReturns() with formula: effective = min(400, 200 + (raw - 200) * 0.5)
- Full TDD cycle: 5 failing tests (RED) then implementation to pass all (GREEN)
- Integrated DR as post-processing in computeCharStats with skipDR escape hatch
- All 43 game-logic tests pass including 5 new DR tests

## Task Commits

1. **Task 1: TDD RED phase** - `6e776a0` (test: add DR unit tests)
2. **Task 2: GREEN phase + integration** - `6e776a0` (feat: implement DR function + integrate)

## Files Created/Modified
- `packages/game-logic/src/stats/char-stats.ts` - Added applyDiminishingReturns(), SOFT_CAP/DR_MULTIPLIER/HARD_CAP constants, DR loop in computeCharStats, skipDR option
- `packages/game-logic/src/stats/char-stats.test.ts` - Added describe('applyDiminishingReturns') with 5 test cases covering full curve

## Decisions Made
- Combined RED and GREEN phases into single commit since both touch same files
- Added skipDR option as part of Plan 01 (originally in Plan 02) to avoid edit conflicts

## Deviations from Plan
None - plan executed as specified.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- applyDiminishingReturns exported from game-logic package, ready for client import
- skipDR option ready for Plan 02's emitStats usage

---
*Phase: 116-stat-caps, Plan: 01*
*Completed: 2026-03-03*
