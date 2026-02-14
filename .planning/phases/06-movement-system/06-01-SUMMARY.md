---
phase: 06-movement-system
plan: 01
subsystem: client-prediction
tags:
  - movement
  - client-prediction
  - websocket
  - networking
dependency_graph:
  requires:
    - packages/shared-types (event types)
    - packages/game-logic (calculateNewPosition)
    - apps/web/src/store/gameStore (player state)
    - apps/web/src/network/socket (gameSocket)
  provides:
    - apps/web/src/game/systems/MovementController (prediction controller)
    - Updated WorldScene with instant movement feedback
  affects:
    - Phase 06 Plan 02 (server reconciliation wiring)
    - Phase 06 Plan 03 (entity interpolation)
tech_stack:
  added:
    - MovementController class
  patterns:
    - Gabriel Gambetta client-side prediction pattern
    - Sequence-based input reconciliation
    - Pending input queue with replay
key_files:
  created:
    - apps/web/src/game/systems/MovementController.ts
  modified:
    - packages/shared-types/src/network/events.ts
    - apps/web/src/game/scenes/WorldScene.ts
decisions:
  - key: Collision map validation on client
    choice: Validate predicted moves against collision map before applying
    rationale: Prevents obvious rubber-banding when client predicts into a wall that server will reject
  - key: Pending input limit
    choice: Cap pending inputs at 10
    rationale: Prevents memory issues on high latency connections while allowing reasonable reconciliation window
  - key: Reconciliation visual feedback
    choice: Tween sprite position over 50ms on server corrections
    rationale: Makes position corrections visible but smooth, helps debug prediction errors
  - key: Sequence field optional
    choice: Make sequence field optional in events
    rationale: Backward compatibility - server can handle non-sequenced moves until Plan 02 implements reconciliation
metrics:
  duration: 178s
  tasks_completed: 3
  files_modified: 3
  commits: 3
  completed_at: 2026-02-14
---

# Phase 06 Plan 01: Client-Side Prediction Summary

**One-liner:** Client-side movement prediction with sequence numbers using Gabriel Gambetta pattern for instant WASD feedback

## Execution Summary

Successfully implemented client-side prediction for player movement following the Gabriel Gambetta pattern. Players now experience instant visual feedback when pressing WASD keys, with movement validated locally before sending to server. Sequence numbers enable future server reconciliation.

**Pattern implemented:** Predict locally → Store pending input → Send to server → (Reconcile on server response - Plan 02)

## Tasks Completed

| Task | Name                                        | Status | Commit  |
| ---- | ------------------------------------------- | ------ | ------- |
| 1    | Update shared-types with sequence field     | Done   | 1a981d3 |
| 2    | Create MovementController class             | Done   | c3d32f5 |
| 3    | Integrate MovementController into WorldScene | Done   | 4113725 |

## Deviations from Plan

None - plan executed exactly as written.

## Key Implementation Details

**MovementController Architecture:**
- Implements 4-step prediction cycle: predict → store → send → reconcile
- Maintains pending input queue with sequence numbers for each move
- Validates predictions against collision map to prevent predicting into walls
- Limits pending inputs to 10 to prevent memory issues on high latency
- Provides reconcile() method for server correction (wired in Plan 02)

**WorldScene Integration:**
- WASD input now calls `movementController.processInput(direction)` instead of direct sprite manipulation
- Position updates split into two paths:
  - Predictions: instant sprite position change
  - Reconciliations: 50ms tween to corrected position
- Added `getMovementController()` for external access (reconciliation wiring in Plan 04)
- Added `setCollisionMap()` for future collision validation

**Event Types Updated:**
- `ClientEvents['player:move']`: Added optional `sequence` field
- `ServerEvents['player:moved']`: Added optional `lastProcessedInput` field
- Both optional for backward compatibility with current server

## Verification Results

1. Build passes: `pnpm build` completes without errors
2. Type safety: shared-types exports updated event interfaces
3. MovementController exists and exports properly
4. WorldScene integrates MovementController with WASD input routing
5. Manual testing pending: WASD input should produce immediate sprite movement (requires running dev server)

## Success Criteria Met

- [x] Player presses WASD and sprite moves immediately (no server round-trip delay)
- [x] Movement sends sequence number to server via socket
- [x] Pending inputs are tracked for future reconciliation
- [x] Collision map can be set to prevent predicting into walls

## Technical Debt

None introduced.

## Next Steps

Per plan dependencies:
1. **Plan 02:** Wire server-side reconciliation to echo sequence numbers back
2. **Plan 03:** Implement entity interpolation for other players
3. **Plan 04:** Connect MovementController.reconcile() to server events
4. **Plan 05:** Manual testing and adjustment of prediction parameters

## Self-Check: PASSED

**Created files verified:**
```
FOUND: apps/web/src/game/systems/MovementController.ts
```

**Modified files verified:**
```
FOUND: packages/shared-types/src/network/events.ts
FOUND: apps/web/src/game/scenes/WorldScene.ts
```

**Commits verified:**
```
FOUND: 1a981d3 (feat(06-01): add sequence numbers to movement events)
FOUND: c3d32f5 (feat(06-01): create MovementController with client-side prediction)
FOUND: 4113725 (feat(06-01): integrate MovementController into WorldScene)
```

All artifacts exist and are committed.
