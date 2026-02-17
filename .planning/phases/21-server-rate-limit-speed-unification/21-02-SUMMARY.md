---
phase: 21-server-rate-limit-speed-unification
plan: 02
subsystem: ui
tags: [phaser, movement, constants, shared-types, pathfinding]

# Dependency graph
requires:
  - phase: 21-01
    provides: Server rate limit at 125ms allowing 150ms client timing
provides:
  - MOVE_DELAY_MS = 150 constant in shared-types
  - WorldScene keyboard movement at 150ms (was 500ms)
  - PathfindingController default delay using shared constant
affects: [22-walk-tween, 23-camera-lerp]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared-constants-pattern, single-source-of-truth]

key-files:
  created:
    - packages/shared-types/src/constants.ts
  modified:
    - packages/shared-types/src/index.ts
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/systems/PathfindingController.ts

key-decisions:
  - "MOVE_DELAY_MS = 150 placed in shared-types/constants.ts for access by any package"
  - "WorldScene moveDelay changed from 500ms to MOVE_DELAY_MS (150ms) unifying WASD with pathfinding speed"

patterns-established:
  - "Shared constants pattern: timing values live in shared-types/constants.ts, imported by all consumers"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 21 Plan 02: Speed Unification Summary

**MOVE_DELAY_MS = 150 shared constant unifying WASD keyboard (was 500ms) and click-to-move pathfinding under a single source of truth in shared-types**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T11:42:10Z
- **Completed:** 2026-02-17T11:44:10Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created `packages/shared-types/src/constants.ts` with `MOVE_DELAY_MS = 150`
- Exported constant from shared-types package index for all consumers
- Fixed 500ms vs 150ms speed mismatch: WASD movement now matches pathfinding at 150ms
- Both movement systems reference the same constant — changing one value updates both

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MOVE_DELAY_MS constant in shared-types** - `ab5739e` (feat)
2. **Task 2: Update WorldScene to use MOVE_DELAY_MS** - `a650191` (feat)
3. **Task 3: Update PathfindingController to use MOVE_DELAY_MS default** - `0c572b5` (feat)

## Files Created/Modified
- `packages/shared-types/src/constants.ts` - New file with MOVE_DELAY_MS = 150 constant
- `packages/shared-types/src/index.ts` - Added `export * from './constants'`
- `apps/web/src/game/scenes/WorldScene.ts` - Import MOVE_DELAY_MS, replace `moveDelay = 500` with `moveDelay = MOVE_DELAY_MS`
- `apps/web/src/game/systems/PathfindingController.ts` - Import MOVE_DELAY_MS, replace `moveDelay = 150` default with `moveDelay = MOVE_DELAY_MS`

## Decisions Made
- MOVE_DELAY_MS placed in `shared-types/constants.ts` (not game-logic or web-local) so server-side code can also reference it if needed
- WorldScene `moveDelay = 500` was the root cause of the speed mismatch — now corrected to 150ms

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build passed cleanly on first attempt. No TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 21 complete: server rate limit (21-01) and client speed unification (21-02) done
- Phase 22 (walk tween: tween duration = MOVE_DELAY_MS - 20ms = 130ms) can now begin
- Both movement systems reference MOVE_DELAY_MS, so Phase 22 tween work integrates cleanly

---
*Phase: 21-server-rate-limit-speed-unification*
*Completed: 2026-02-17*

## Self-Check: PASSED

- FOUND: packages/shared-types/src/constants.ts
- FOUND: 21-02-SUMMARY.md
- FOUND commit ab5739e: feat(21-02): add MOVE_DELAY_MS constant to shared-types
- FOUND commit a650191: feat(21-02): update WorldScene to use MOVE_DELAY_MS constant
- FOUND commit 0c572b5: feat(21-02): update PathfindingController to use MOVE_DELAY_MS default
