---
phase: 23-movement-animation-camera-polish
plan: 03
subsystem: ui
tags: [phaser, movement, pathfinding, tile-speed, client]

# Dependency graph
requires:
  - phase: 23-01
    provides: server rate limit at 125ms enabling client timing changes
  - phase: 23-02
    provides: MOVE_DELAY_MS=150 in shared-types/constants.ts
  - phase: 22-02
    provides: PathfindingController with cross-chunk A* pathfinding
provides:
  - Tile-based moveDelay calculation in WorldScene.handleInput
  - PathfindingController.setMoveDelay for dynamic delay propagation
  - Effective movement speed variance per tile type on client
affects: [future combat systems that depend on movement timing, any system reading moveDelay]

# Tech tracking
tech-stack:
  added: []
  patterns: [tile-speed-influences-delay, propagate-delay-to-pathfinding]

key-files:
  created: []
  modified:
    - apps/web/src/game/systems/PathfindingController.ts
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "effectiveMoveDelay = Math.round(MOVE_DELAY_MS / tileDef.movementSpeed) — dividing base delay by speed multiplier gives correct inverse relationship"
  - "setMoveDelay propagates keyboard-move tile delay to PathfindingController ensuring click-to-move also respects tile speed"
  - "Guard against movementSpeed <= 0 — walls are already blocked by collision, fallback to MOVE_DELAY_MS avoids division by zero"
  - "Tile lookup uses player.position post-prediction (after processInput) so delay applies for the tile just stepped onto"

patterns-established:
  - "Tile-speed-to-delay pattern: MOVE_DELAY_MS / movementSpeed converts tile property to timing delta"
  - "Delay propagation: WorldScene updates both this.moveDelay and pathfindingController.setMoveDelay after each move"

# Metrics
duration: 1min
completed: 2026-02-17
---

# Phase 23 Plan 03: Tile Movement Speed Summary

**Tile movementSpeed property drives effective moveDelay on client — toxic_pool (0.5x) = 300ms, ice_floor (1.2x) = 125ms, click-to-move pathfinding inherits the same delay**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-17T13:06:08Z
- **Completed:** 2026-02-17T13:07:36Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `setMoveDelay(delay: number)` public method to PathfindingController for external delay updates
- Updated WorldScene.handleInput to look up destination tile movementSpeed and compute effective moveDelay
- Propagated dynamic moveDelay to PathfindingController so click-to-move respects tile speed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add setMoveDelay method to PathfindingController** - `713aea0` (feat)
2. **Task 2: Update moveDelay based on destination tile after movement** - `2f2416a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/web/src/game/systems/PathfindingController.ts` - Added public `setMoveDelay(delay: number)` method after `destroy()`
- `apps/web/src/game/scenes/WorldScene.ts` - Updated `handleInput()` to read tile movementSpeed and update `this.moveDelay` and propagate via `pathfindingController.setMoveDelay()`

## Decisions Made
- `effectiveMoveDelay = Math.round(MOVE_DELAY_MS / tileDef.movementSpeed)` — dividing base delay by speed multiplier gives the correct inverse relationship (higher speed = lower delay)
- Guard against `movementSpeed <= 0` with fallback to `MOVE_DELAY_MS` to avoid division by zero (walls are already collision-blocked)
- Delay is read from `player.position` after `processInput()` to reflect the tile just stepped onto (prediction already applied)
- `setMoveDelay` propagates keyboard-move computed delay to PathfindingController ensuring click-to-move also respects tile terrain speed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. All needed imports (TileRegistry, tileIdToString, MOVE_DELAY_MS, ZONE_SIZE) were already present in WorldScene.ts.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Tile speed system fully operational for both WASD and click-to-move
- Phase 23 Plan 04 can proceed (camera lerp / walk tween polish)

---
*Phase: 23-movement-animation-camera-polish*
*Completed: 2026-02-17*

## Self-Check: PASSED

- FOUND: apps/web/src/game/systems/PathfindingController.ts
- FOUND: apps/web/src/game/scenes/WorldScene.ts
- FOUND: .planning/phases/23-movement-animation-camera-polish/23-03-SUMMARY.md
- FOUND commit: 713aea0 (Task 1)
- FOUND commit: 2f2416a (Task 2)
