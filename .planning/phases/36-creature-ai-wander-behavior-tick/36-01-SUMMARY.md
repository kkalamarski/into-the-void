---
phase: 36-creature-ai-wander-behavior-tick
plan: 01
subsystem: api
tags: [nestjs, socket.io, ai, game-server]

# Dependency graph
requires:
  - phase: 35-loot-tables-tool-interaction-respawn
    provides: ZonesService with getZoneEntities and updateEntity
  - phase: 34-entity-lifecycle-enriched-spawning
    provides: Entity and Creature types, PlayerService.getPlayersInZone
provides:
  - AiService NestJS injectable with zone-scoped self-rescheduling setTimeout tick loop
  - activateZone/deactivateZone lifecycle for player-presence-driven AI
  - GameModule registration of AiService in providers and exports
affects:
  - 36-02 (FSM wander logic runs inside runZoneTick stub)
  - 36-03 (GameGateway calls activateZone/deactivateZone on player join/leave)

# Tech tracking
tech-stack:
  added: []
  patterns: [self-rescheduling setTimeout (not setInterval) for zone-scoped AI ticks]

key-files:
  created:
    - apps/game-server/src/game/ai.service.ts
  modified:
    - apps/game-server/src/game/game.module.ts

key-decisions:
  - "AiService uses self-rescheduling setTimeout (not setInterval) — prevents event loop stalls when tick processing exceeds interval"
  - "Zones are inactive at startup — activateZone called on first player join, deactivateZone on last player leave"
  - "AI_TICK_INTERVAL_MS=1000 — creatures move at half player speed; AI_TICK_WARN_MS=200 for performance monitoring"

patterns-established:
  - "Zone activation guard: if (activeZones.has(zoneId)) return — prevents duplicate timer creation"
  - "Timer cleanup: tickTimers.delete(zoneId) inside callback before awaiting runZoneTick"

# Metrics
duration: 5min
completed: 2026-02-18
---

# Phase 36 Plan 01: AiService Zone-Scoped Tick Loop Summary

**NestJS AiService with per-zone self-rescheduling setTimeout pattern, activating only when players are present in a zone**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T20:20:41Z
- **Completed:** 2026-02-18T20:25:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created AiService with zone activation/deactivation lifecycle (activeZones Set, tickTimers Map)
- Implemented self-rescheduling setTimeout pattern with AI_TICK_WARN_MS performance threshold logging
- Registered AiService in GameModule providers and exports for injection by GameGateway (Plan 36-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AiService with zone-scoped setTimeout tick loop** - `b8f238c` (feat)
2. **Task 2: Register AiService in GameModule** - `73f858e` (feat)

## Files Created/Modified
- `apps/game-server/src/game/ai.service.ts` - NestJS injectable with activateZone, deactivateZone, setServer, scheduleNextTick, and stub runZoneTick
- `apps/game-server/src/game/game.module.ts` - AiService added to providers and exports

## Decisions Made
- Self-rescheduling setTimeout chosen over setInterval — prevents event loop stalls when tick logic exceeds interval duration (consistent with v1.8 research decision)
- runZoneTick remains a stub logging creature count — FSM wander logic is Plan 36-02's responsibility
- PlayerService injected into AiService even though stub does not use it — ready for Plan 36-02 perception gating

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AiService is ready for Plan 36-02 to replace runZoneTick stub with FSM wander logic
- GameModule exports AiService so Plan 36-03 GameGateway can inject and call activateZone/deactivateZone on connect/disconnect
- setServer() method ready for GameGateway.afterInit() wiring in Plan 36-03

---
*Phase: 36-creature-ai-wander-behavior-tick*
*Completed: 2026-02-18*
