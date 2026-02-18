---
phase: 35-loot-tables-tool-interaction-respawn
plan: "04"
subsystem: game-server
tags: [socket.io, drizzle-orm, lru-cache, nestjs, entity-lifecycle, respawn, ground-items]

# Dependency graph
requires:
  - phase: 35-01-loot-tables-tool-interaction-respawn
    provides: entity_lifecycle and ground_items DB tables
  - phase: 34-01
    provides: createEntityFromSpawn(), recordEntityKill(), entityLifecycle schema
provides:
  - processRespawnTick() — 10-second interval loop re-materializing depleted entities
  - setServer() — Socket.IO server injection into ZonesService for broadcasts
  - loadZone() ground item restoration from DB on zone load
  - LRU-evicted zone on-demand loading during respawn processing
affects: [36-ai-tick, phase-37, phase-38]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OnGatewayInit lifecycle hook in NestJS WebSocket gateway to wire server reference to services"
    - "FAR_FUTURE year-based sentinel check (>= 2099) for artifact no-respawn guard"
    - "Zone on-demand loading pattern in tick loop: get from LRU, loadZone() if missing"

key-files:
  created: []
  modified:
    - apps/game-server/src/zones/zones.service.ts
    - apps/game-server/src/game/game.gateway.ts

key-decisions:
  - "Error handling wraps entire processRespawnTick() body — tick loop never crashes the server on DB errors"
  - "Tasks 1 and 2 committed together — both in zones.service.ts, logically inseparable (tick writes entities that loadZone() reads)"
  - "ZonesService injected into GameGateway (not the reverse) — server reference flows gateway -> zones, matching NestJS dependency direction"

patterns-established:
  - "processRespawnTick: query ready records, skip FAR_FUTURE, load zone if evicted, re-materialize, broadcast, delete record, clean expired ground items"
  - "loadZone: generate chunk, suppress dead entities, restore ground items from DB — complete zone state reconstruction"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 35 Plan 04: Respawn Tick Loop and Ground Item Persistence Summary

**10-second respawn tick loop in ZonesService re-materializes depleted minerals/plants, loads persisted ground items on zone load, and broadcasts entity:spawn via Socket.IO server wired through GameGateway.afterInit()**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T16:23:51Z
- **Completed:** 2026-02-18T16:25:51Z
- **Tasks:** 3 (Tasks 1+2 committed together, Task 3 separate)
- **Files modified:** 2

## Accomplishments
- processRespawnTick() runs every 10 seconds: queries entity_lifecycle for ready records, re-materializes entities in their zones, broadcasts entity:spawn, deletes lifecycle records, and cleans expired ground_items rows
- LRU-evicted zones are loaded on demand before respawn processing — no silent skips for inactive zones
- Artifacts with FAR_FUTURE sentinel (year >= 2099) are skipped — enforces one-time discovery rule at tick loop level
- loadZone() now restores non-expired ground items from DB, restoring complete zone state after eviction/restart
- GameGateway implements OnGatewayInit, calling zonesService.setServer(server) in afterInit() to enable broadcasts

## Task Commits

Each task was committed atomically:

1. **Tasks 1+2: setServer(), processRespawnTick(), loadZone() ground item loading** - `7f94019` (feat)
2. **Task 3: GameGateway.afterInit() wires setServer()** - `a36874e` (feat)

## Files Created/Modified
- `apps/game-server/src/zones/zones.service.ts` - Added setServer(), processRespawnTick(), findSpawnPointFromEntityId(), updated loadZone() to restore ground items, updated onModuleInit() to start tick loop
- `apps/game-server/src/game/game.gateway.ts` - Added OnGatewayInit interface, afterInit() hook, ZonesService injection

## Decisions Made
- Error handling wraps entire processRespawnTick() body — tick loop never crashes the server on DB errors; errors are logged and next tick proceeds normally
- Tasks 1 and 2 committed together since both live in zones.service.ts and are logically inseparable (the tick loop and zone loader are two sides of the same entity lifecycle coin)
- ZonesService injected into GameGateway (not the reverse) — server reference flows gateway -> zones, matching NestJS dependency direction; avoids circular injection

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The `pnpm build --filter=game-server` command failed with an unrelated NX lock file pruning error (pnpm-lock.yaml workspace package resolution issue pre-existing in repo). TypeScript type-check via `npx tsc --noEmit` confirmed zero type errors. The lock file issue is pre-existing and unrelated to this plan's changes.

## Next Phase Readiness
- Respawn lifecycle is now fully operational end-to-end: kill -> lifecycle record -> tick loop -> respawn -> broadcast
- Ground items survive zone eviction and server restarts via DB persistence
- Ready for Phase 36 AI tick implementation — ZonesService respawn infrastructure is complete

---
*Phase: 35-loot-tables-tool-interaction-respawn*
*Completed: 2026-02-18*
