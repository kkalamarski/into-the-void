---
phase: 128-day-night-cycle
plan: 01
subsystem: rendering
tags: [phaser, colormatrix, postfx, day-night, websocket]

requires:
  - phase: 127
    provides: WeatherSystem pattern for game system lifecycle
provides:
  - DayNightCycle system class with camera postFX ColorMatrix
  - Shared types for day/night phases and cycle constants
  - Server time sync in auth:success and zone:state payloads
affects: [128-03, 129-biome-atmosphere]

tech-stack:
  added: []
  patterns: [camera postFX ColorMatrix for full-screen visual effects, server epoch offset for client-side sync]

key-files:
  created:
    - packages/shared-types/src/game/day-night.ts
    - apps/web/src/game/systems/DayNightCycle.ts
  modified:
    - packages/shared-types/src/core/zone.ts
    - packages/shared-types/src/index.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/game-server/src/game/player.service.ts

key-decisions:
  - "ColorMatrix getData() used for direct matrix manipulation to achieve blue/warm color shifts"
  - "Smoothstep interpolation with 20% transition zones at phase boundaries"
  - "serverTime added as optional field on ZoneState to avoid breaking existing consumers"

patterns-established:
  - "Camera postFX ColorMatrix: apply to cameras.main only, never minimap"
  - "Server time offset: serverOffset = serverTime - Date.now(), derive cycle from Date.now() + offset"

requirements-completed: [DNTC-01, DNTC-02, DNTC-03, DNTC-05]

duration: 8min
completed: 2026-03-17
---

# Phase 128-01: Day/Night Cycle Core Summary

**DayNightCycle system with camera-level ColorMatrix postFX, shared types, and server time synchronization**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-17
- **Completed:** 2026-03-17
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created DayNightCycle class with four-phase visual presets (Dawn warm, Day neutral, Dusk warm, Night cool blue)
- Defined shared types (DayNightPhase, CYCLE_DURATION_MS, PHASE_BOUNDARIES) for server/client use
- Added serverTime to auth:success and all zone:state emissions across game-server

## Task Commits

1. **Task 1: Shared types + server time** - `9f7fe60` (feat)
2. **Task 2: DayNightCycle system class** - `ec9460e` (feat)

## Files Created/Modified
- `packages/shared-types/src/game/day-night.ts` - DayNightPhase type and cycle constants
- `apps/web/src/game/systems/DayNightCycle.ts` - Core cycle system with ColorMatrix postFX
- `packages/shared-types/src/core/zone.ts` - Added optional serverTime field to ZoneState
- `packages/shared-types/src/index.ts` - Re-export day-night types
- `apps/game-server/src/game/game.gateway.ts` - Send serverTime in auth:success and zone:state
- `apps/game-server/src/game/player.service.ts` - Send serverTime in respawn zone:state

## Decisions Made
- Used `multiply: true` parameter on `saturate()` to chain with brightness (not overwrite)
- Brightness method called with `multiply: false` first (sets base), then saturate chains on top
- Direct Float32Array manipulation via `getData()` for blue/warm color channel shifts

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DayNightCycle class ready to wire into WorldScene (Plan 03)
- serverTime flowing from server to client on connect
- Shared types available for HUD component (Plan 02)

---
*Phase: 128-day-night-cycle*
*Completed: 2026-03-17*
