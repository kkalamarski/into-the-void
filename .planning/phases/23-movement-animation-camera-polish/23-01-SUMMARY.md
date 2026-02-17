---
phase: 23-movement-animation-camera-polish
plan: 01
subsystem: ui
tags: [phaser, tweens, animation, movement, player]

# Dependency graph
requires:
  - phase: 21-server-rate-limit
    provides: MOVE_DELAY_MS=150ms server rate limit enabling timed client tweens
  - phase: 22-8-directional-input-pathfinding
    provides: Pathfinding and 8-directional WASD input as movement foundation
provides:
  - Prediction tween (130ms Linear) for smooth tile-to-tile sliding on WASD input
  - Reconciliation tween increased to 80ms Cubic.easeOut for smoother server corrections
  - killTweensOf guard in both branches to prevent tween queuing
affects: [23-02-camera-lerp, 23-03-pathfinding-speed, 23-04-hover-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns: [Phaser tween-based prediction with killTweensOf guard before each new tween]

key-files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "Prediction tween duration = MOVE_DELAY_MS (150) - 20ms = 130ms to prevent positional drift; Linear ease maintains consistent velocity"
  - "Reconciliation tween increased from 50ms to 80ms for smoother server position corrections"
  - "killTweensOf required before each tween.add to prevent stacking multiple in-flight tweens"

patterns-established:
  - "Guard pattern: always killTweensOf before tweens.add for player sprite to prevent queuing"
  - "Prediction branch uses Linear ease; reconciliation uses Cubic.easeOut for distinct visual feel"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 23 Plan 01: Prediction Tween & Reconciliation Smoothing Summary

**Player sprite now glides between tiles via 130ms Linear tween on WASD input, with 80ms Cubic.easeOut for smooth server reconciliation corrections**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-17T13:05:55Z
- **Completed:** 2026-02-17T13:07:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added 130ms Linear prediction tween to else branch of `updateLocalPlayerSprite()`, replacing direct position assignment
- Increased reconciliation tween from 50ms to 80ms for smoother server correction feel
- Added `killTweensOf` guard in prediction branch (reconciliation branch already had it) to prevent tween stacking
- Grid data updates (`setData`, `setDepth`) remain after tween blocks — correct since they use grid coords not pixel coords

## Task Commits

The 23-01 changes were incorporated into the `d69ceee` commit (23-02 camera lerp) as both tasks modified the same `updateLocalPlayerSprite()` method and were committed together.

1. **Task 1: Add prediction tween and increase reconciliation tween duration** - `d69ceee` (feat)

**Plan metadata:** `(docs commit follows)`

## Files Created/Modified
- `apps/web/src/game/scenes/WorldScene.ts` - `updateLocalPlayerSprite()` modified to use tweens in both prediction and reconciliation branches

## Decisions Made
- Prediction tween duration = 130ms (MOVE_DELAY_MS 150 - 20ms) to stay just under movement cadence and prevent pixel drift
- Linear ease for prediction (constant speed matches grid-locked movement rhythm)
- Cubic.easeOut for reconciliation (decelerates into final position, feels like correction not teleport)
- `killTweensOf` before every `tweens.add` to prevent stacking multiple simultaneous tweens on the same sprite

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build passed clean on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Prediction tween ready; combined with camera lerp (23-02, already committed) for full smooth movement feel
- Pathfinding speed adjustment (23-03, already committed) synchronizes NPC/click-to-move with MOVE_DELAY_MS
- HoverController dead code (23-04, already committed) cleaned up

---
*Phase: 23-movement-animation-camera-polish*
*Completed: 2026-02-17*

## Self-Check: PASSED

- FOUND: apps/web/src/game/scenes/WorldScene.ts
- FOUND: .planning/phases/23-movement-animation-camera-polish/23-01-SUMMARY.md
- FOUND: duration: 130 in WorldScene.ts (prediction tween)
- FOUND: duration: 80 in WorldScene.ts (reconciliation tween)
- FOUND: ease: 'Linear' in WorldScene.ts (prediction branch)
- FOUND: ease: 'Cubic.easeOut' in WorldScene.ts (reconciliation branch)
- FOUND: commit d69ceee (feat(23-02) containing 23-01 changes)
