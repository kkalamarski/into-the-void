---
phase: 132-server-movement-handler
plan: 01
subsystem: api
tags: [websocket, shared-types, game-logic, pixel-movement, bitmask, events]

# Dependency graph
requires:
  - phase: 131-shared-foundation
    provides: KeyState interface and pixel-validation module that bitmaskToKeyState extends

provides:
  - "'player:pixelMove' event in ClientEvents with keys/predictedPx/predictedPy/sequence payload"
  - "'positionBatch' and 'positionCorrection' events in ServerEvents for 20Hz movement loop"
  - "bitmaskToKeyState adapter function converting wire bitmask to KeyState struct"
  - "KEY_BIT_W/A/S/D bitmask constants (W=1, A=2, S=4, D=8)"

affects:
  - 132-02
  - 132-03
  - 133-client-prediction
  - 135-cleanup

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wire bitmask W=1/A=2/S=4/D=8 for compact key state transport over WebSocket"
    - "bitmaskToKeyState adapter bridges wire format to KeyState struct consumed by velocityFromKeys"

key-files:
  created: []
  modified:
    - packages/shared-types/src/network/events.ts
    - packages/game-logic/src/movement/pixel-validation.ts
    - packages/game-logic/src/movement/pixel-validation.test.ts

key-decisions:
  - "bitmask W=1/A=2/S=4/D=8 matches client-side convention defined in Phase 133 plan — consistent wire format"
  - "bitmaskToKeyState placed in pixel-validation.ts (not a separate file) since it directly bridges wire bitmask to KeyState used by velocityFromKeys"
  - "Opposing keys (e.g. W+S both set) both map to true in KeyState — velocityFromKeys cancels them, not the adapter"
  - "Old 'player:move' event kept alongside 'player:pixelMove' until Phase 135 cleanup"

patterns-established:
  - "Pattern 1: Bitmask adapter — bitmaskToKeyState converts compact wire format to typed struct before game logic consumption"
  - "Pattern 2: Event coexistence — old and new movement events coexist during migration, cleaned up in designated phase"

requirements-completed: [SYNC-01, SYNC-02]

# Metrics
duration: 9min
completed: 2026-03-17
---

# Phase 132 Plan 01: Server Movement Handler — Wire Types Summary

**Pixel movement wire-format types added: 'player:pixelMove' in ClientEvents, 'positionBatch'/'positionCorrection' in ServerEvents, plus bitmaskToKeyState adapter (W=1/A=2/S=4/D=8) with 10 new tests**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-03-17T22:31:08Z
- **Completed:** 2026-03-17T22:40:17Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `ClientEvents` with `'player:pixelMove'` payload (keys bitmask, predictedPx, predictedPy, sequence)
- Extended `ServerEvents` with `'positionBatch'` (updates array) and `'positionCorrection'` (px, py, sequence echo)
- Added `bitmaskToKeyState` function and `KEY_BIT_W/A/S/D` constants to `pixel-validation.ts`
- Added 10 new test cases covering all bitmask combinations, all 203 game-logic tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add pixel movement event types to shared-types** - `b656a26` (feat)
2. **Task 2: Add bitmaskToKeyState adapter with tests** - `70627d0` (feat)

## Files Created/Modified

- `packages/shared-types/src/network/events.ts` - Added `'player:pixelMove'` to ClientEvents, `'positionBatch'`/`'positionCorrection'` to ServerEvents, and both to their respective union types
- `packages/game-logic/src/movement/pixel-validation.ts` - Added `KEY_BIT_W/A/S/D` constants and `bitmaskToKeyState` function
- `packages/game-logic/src/movement/pixel-validation.test.ts` - Added 10 test cases for `bitmaskToKeyState` and constants

## Decisions Made

- Bitmask convention W=1/A=2/S=4/D=8 matches client-side definition in Phase 133 plans to ensure consistent wire format
- `bitmaskToKeyState` placed in `pixel-validation.ts` (not a new file) because it directly bridges wire format to the `KeyState` interface already defined there
- The adapter faithfully passes through opposing keys (both `up: true, down: true`); cancellation is `velocityFromKeys`'s responsibility, not the adapter's
- Old `player:move` event is preserved alongside `player:pixelMove` — cleanup deferred to Phase 135

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Wire types and adapter are ready for Phase 132-02 (server tick loop) and 132-03 (rate limiter replacement)
- `bitmaskToKeyState` is exported from `pixel-validation.ts` and available to `@into-the-void/game-logic` consumers
- Both `shared-types:build` and `game-logic:build` pass; all 203 game-logic tests pass

---
*Phase: 132-server-movement-handler*
*Completed: 2026-03-17*

## Self-Check: PASSED

- FOUND: `.planning/phases/132-server-movement-handler/132-01-SUMMARY.md`
- FOUND: `packages/shared-types/src/network/events.ts`
- FOUND: `packages/game-logic/src/movement/pixel-validation.ts`
- FOUND commit: b656a26 (Task 1)
- FOUND commit: 70627d0 (Task 2)
