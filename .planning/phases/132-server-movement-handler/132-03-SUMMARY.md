---
phase: 132-server-movement-handler
plan: 03
subsystem: game-server
tags: [nestjs, socket.io, pixel-movement, collision, tick-loop, velocity, validation]

# Dependency graph
requires:
  - phase: 132-01
    provides: player:pixelMove/positionBatch/positionCorrection events, bitmaskToKeyState in shared-types and game-logic
  - phase: 132-02
    provides: ConnectedPlayer px/py/lastPxInputTime fields, getChunkSync in ZonesService, pixelToTile on disconnect
provides:
  - MovementService with 20Hz tick loop that drains pendingInputs every 50ms
  - Speed validation via validatePixelSpeed with positionCorrection event on failure
  - Synchronous collision resolution via getChunkSync + resolvePixelCollision
  - positionBatch broadcast to observers within 1536px (self excluded from broadcast)
  - player:pixelMove handler in GameGateway routing to MovementService.queueInput()
  - Old 140ms rate limiter (lastMoveTimes, minDelay) fully removed from PlayerService and GameGateway
affects: [132-04, 133-client-prediction, 134-zone-transitions, 135-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - OnModuleInit setInterval tick loop (same convention as AiService)
    - setServer() injection pattern for Socket.IO server reference
    - Drain-and-clear Map pattern for pending input processing (thread-safe within Node.js event loop)
    - Zone-grouped proximity broadcast (byZone map then per-observer radius filter)

key-files:
  created:
    - apps/game-server/src/game/movement.service.ts
  modified:
    - apps/game-server/src/game/game.gateway.ts
    - apps/game-server/src/game/game.module.ts
    - apps/game-server/src/game/player.service.ts

key-decisions:
  - "TICK_MS=50 (20Hz) matches plan spec — 50ms gives responsive movement while keeping server load bounded"
  - "BROADCAST_RADIUS_PX=1536 (12 tiles) covers aggro+leash range with margin; same constant as plan spec"
  - "MAX_DT=0.2s cap prevents teleportation exploit when player has stale/backlogged input"
  - "queueInput overwrites previous unprocessed input — only latest key state per tick, no backlog"
  - "vx===0 && vy===0 case: update lastPxInputTime but skip dirty list (player did not move)"
  - "getChunkSync returns undefined if zone not cached — player skipped that tick rather than blocking"
  - "isSolid defaults to true for out-of-bounds tile coords (solid border)"

patterns-established:
  - "Tick loop pattern: setInterval in onModuleInit, drain Map to local snapshot, clear Map, process snapshot"
  - "Proximity broadcast pattern: group by zone, then per-observer radius filter, exclude self"
  - "positionCorrection sent to socketId directly (not zone room broadcast)"

requirements-completed: [SYNC-01, SYNC-02]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 132 Plan 03: Server Movement Handler Summary

**20Hz server-authoritative pixel movement tick loop with speed validation, collision resolution, and proximity-filtered positionBatch broadcast, replacing the old 140ms tile-step rate limiter**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T22:43:11Z
- **Completed:** 2026-03-17T22:45:13Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created MovementService implementing the 20Hz tick loop as the core of Phase 132 server-authoritative movement
- Wired player:pixelMove gateway handler routing directly to MovementService.queueInput() (thin router)
- Removed the old 140ms rate limiter (lastMoveTimes map, getLastMoveTime(), setLastMoveTime(), minDelay block) entirely from PlayerService and GameGateway

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MovementService with 50ms tick loop, validation, and proximity broadcast** - `ccab5f7` (feat)
2. **Task 2: Wire gateway handler, register service, remove old rate limiter** - `7536bd4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/game-server/src/game/movement.service.ts` - New service: 20Hz tick loop, queueInput, speed validation, collision resolution, positionBatch broadcast
- `apps/game-server/src/game/game.gateway.ts` - Added player:pixelMove handler, movementService.setServer() in afterInit, removed old rate limiter block
- `apps/game-server/src/game/game.module.ts` - Registered MovementService in providers and exports
- `apps/game-server/src/game/player.service.ts` - Removed lastMoveTimes map, getLastMoveTime(), setLastMoveTime(), lastMoveTimes.delete() in handleDisconnect

## Decisions Made

- `TICK_MS=50` (20Hz): matches plan spec; 50ms provides responsive movement while bounding server CPU
- `BROADCAST_RADIUS_PX=1536` (12 tiles): covers aggro+leash range with margin per plan spec
- `MAX_DT=0.2s`: caps delta-time to prevent teleport exploit on stale input
- `queueInput` overwrites — only latest key state per tick, no backlog accumulation
- `vx===0 && vy===0` with no keys: update `lastPxInputTime` but do NOT add to dirty list
- Zone not in cache (`getChunkSync` returns undefined): skip player this tick, process next tick
- `isSolid` defaults to `true` for out-of-bounds coords (solid impassable border)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MovementService fully operational; game-server builds clean
- Client-side prediction integration ready (Phase 133): client can now consume positionBatch and positionCorrection events
- Zone transitions still handled by old player:move handler until Phase 134
- Phase 135 cleanup: remove old player:move handler and remaining tile-step code

---
*Phase: 132-server-movement-handler*
*Completed: 2026-03-17*
