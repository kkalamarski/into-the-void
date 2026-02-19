---
phase: 41-player-death-and-respawn
plan: "03"
subsystem: game-server
tags: [websocket, respawn, zone-state, socket.io, nestjs]

# Dependency graph
requires:
  - phase: 41-02
    provides: respawnPlayer implementation and scheduleRespawn in PlayerService
provides:
  - zone:state emission to respawning player when zone changes
  - setZoneStateProvider callback pattern in PlayerService
affects: [41-player-death-and-respawn]

# Tech tracking
tech-stack:
  added: []
  patterns: [callback injection via setter method (setZoneStateProvider mirrors setServer pattern)]

key-files:
  created: []
  modified:
    - apps/game-server/src/game/player.service.ts
    - apps/game-server/src/game/game.gateway.ts

key-decisions:
  - "zoneStateProvider injected via setter callback rather than direct GameService dependency — avoids circular injection and follows existing setServer() pattern"
  - "zone:state emitted before player:left to old zone — client receives zone data before zone membership changes"
  - "respawnPlayer made async to support awaiting zoneStateProvider — scheduleRespawn setTimeout callback handles unawaited promise correctly"

patterns-established:
  - "Callback injection pattern: services that need cross-service data use setXxxProvider(fn) in afterInit rather than constructor injection"

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 41 Plan 03: Player Death and Respawn — Zone State on Respawn Summary

**zone:state emitted to respawning player via setZoneStateProvider callback, ensuring client loads correct faction hub tiles and entities after cross-zone respawn**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-19T14:28:57Z
- **Completed:** 2026-02-19T14:32:57Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- PlayerService gains `setZoneStateProvider` setter accepting async callback `(zoneId) => Promise<ZoneState>`
- `respawnPlayer` converted to async; emits `zone:state` to respawning player socket when zone differs from death zone
- GameGateway wires provider in `afterInit` using `gameService.getZoneState` — no direct GameService injection into PlayerService

## Task Commits

Each task was committed atomically:

1. **Task 1: Add zone state provider callback to PlayerService and emit zone:state on respawn** - `5b65455` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/game-server/src/game/player.service.ts` - Added ZoneState import, zoneStateProvider field, setZoneStateProvider setter, made respawnPlayer async with zone:state emission
- `apps/game-server/src/game/game.gateway.ts` - Added setZoneStateProvider call in afterInit

## Decisions Made
- `zoneStateProvider` injected via setter callback rather than direct GameService dependency — follows existing `setServer()` pattern, avoids circular injection
- `zone:state` emitted to player socket before `player:left` to old zone — client gets new zone data first, ordering matches `handleAuth` pattern
- `respawnPlayer` signature changed from `void` to `Promise<void>` — `scheduleRespawn` uses setTimeout callback which does not await, unawaited promise is acceptable here

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Full player death-respawn cycle now complete: die → 3s timer → respawn at faction hub → client receives new zone state
- Phase 41 Plan 03 closes the verification gap identified in 41-VERIFICATION.md
- Ready for Phase 41 Plan 04 or next milestone phase

## Self-Check

- [x] `apps/game-server/src/game/player.service.ts` exists and contains `setZoneStateProvider`
- [x] `apps/game-server/src/game/game.gateway.ts` exists and contains `setZoneStateProvider` call in afterInit
- [x] Commit `5b65455` exists in git log
- [x] `pnpm nx run game-server:build` passes

## Self-Check: PASSED

---
*Phase: 41-player-death-and-respawn*
*Completed: 2026-02-19*
