---
phase: 36-creature-ai-wander-behavior-tick
plan: 03
subsystem: game-server + shared-types + web
tags: [socket.io, ai, creature, batch-broadcast, nestjs, zustand]

# Dependency graph
requires:
  - phase: 36-creature-ai-wander-behavior-tick
    plan: 01
    provides: AiService with activateZone/deactivateZone/setServer/runZoneTick stub
  - phase: 36-creature-ai-wander-behavior-tick
    plan: 02
    provides: tickCreatureAI pure FSM from @into-the-void/game-logic
provides:
  - Full runZoneTick implementation with FSM dispatch and single entity:batch broadcast per tick
  - AiService wired into GameGateway lifecycle (connect/disconnect/zone-transition)
  - entity:batch ServerEventType and ServerEvents entry in shared-types
  - Client entityStore handler for entity:batch event
affects:
  - 36-04 (client pathfinding can now receive real creature position updates via entity:batch)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Batch broadcast pattern: collect all movements per tick, emit one entity:batch event per zone
    - Zone lifecycle: activateZone on auth/zone-in, deactivateZone on disconnect/last-player-leaves

key-files:
  created: []
  modified:
    - packages/shared-types/src/network/events.ts
    - apps/game-server/src/game/ai.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/web/src/store/entityStore.ts

key-decisions:
  - "entity:batch emitted once per zone per tick (not N individual entity:update events) — consistent with v1.8 research decision on relaxed zone-room broadcast"
  - "AiService.activateZone called in handleAuth (first player) and handleMove zone-transition (subsequent players) — idempotency guard in activateZone makes double-call safe"
  - "AiService.deactivateZone called in handleDisconnect and handleMove zone-out — checked after playerService removes player so getPlayersInZone returns accurate count"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 36 Plan 03: AiService Integration and Batched Broadcasts Summary

**AiService wired to GameGateway lifecycle with batched entity:batch broadcasts: one Socket.IO event per zone per tick replaces N individual entity:update emissions**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-18T20:25:06Z
- **Completed:** 2026-02-18T20:27:44Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `entity:batch` to `ServerEventType` union and `ServerEvents` interface in shared-types
- Replaced stub `runZoneTick` in AiService with full implementation: filters creatures, calls `tickCreatureAI` FSM, collects moved creatures, emits one `entity:batch` event per tick per zone
- Wired `AiService` into `GameGateway` constructor, `afterInit`, `handleAuth`, `handleDisconnect`, and `handleMove` zone-transition block
- Added `entity:batch` socket handler to client `entityStore` — processes all position updates in the batch sequentially via existing `updateEntity` action

## Task Commits

Each task was committed atomically:

1. **Task 1: Add entity:batch event type and implement batched runZoneTick** - `c971a35` (feat)
2. **Task 2: Wire AiService into GameGateway lifecycle** - `82fef47` (feat)
3. **Task 3: Add entity:batch handler to client entityStore** - `ed4ce7c` (feat)

## Files Created/Modified

- `packages/shared-types/src/network/events.ts` — `entity:batch` added to ServerEventType union and ServerEvents interface
- `apps/game-server/src/game/ai.service.ts` — `tickCreatureAI` import added; stub `runZoneTick` replaced with FSM+batch implementation
- `apps/game-server/src/game/game.gateway.ts` — `AiService` injected; server wired in `afterInit`; zone activate/deactivate on auth, disconnect, zone-transition
- `apps/web/src/store/entityStore.ts` — `entity:batch` handler added alongside existing `entity:update` handler

## Decisions Made

- `entity:batch` is emitted once per zone per tick (not per creature) — consistent with the v1.8 research decision to use relaxed zone-room broadcast rather than per-player filtering.
- `activateZone` is safe to call multiple times (idempotency guard in AiService returns immediately if zone is already active), so calling it on every player join and zone transition is correct.
- `deactivateZone` is called after `playerService.handleDisconnect()` so `getPlayersInZone()` returns the post-disconnect count — zone stops ticking only when the last player has truly left.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The pnpm lockfile pruning warnings in nx build output are pre-existing (workspace package resolution issue in nx's pruner, not a TypeScript error). All three build targets reported "Successfully ran target build."

## Next Phase Readiness

- Creatures now wander and broadcast position updates via `entity:batch` to all players in zone rooms
- Plan 36-04 (client pathfinding interruption) can use entity positions from entityStore which is now kept current by both `entity:update` and `entity:batch` handlers
- No blockers

---
*Phase: 36-creature-ai-wander-behavior-tick*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: packages/shared-types/src/network/events.ts
- FOUND: apps/game-server/src/game/ai.service.ts
- FOUND: apps/game-server/src/game/game.gateway.ts
- FOUND: apps/web/src/store/entityStore.ts
- FOUND: .planning/phases/36-creature-ai-wander-behavior-tick/36-03-SUMMARY.md
- FOUND: commit c971a35 (feat(36-03): add entity:batch event type and implement batched runZoneTick)
- FOUND: commit 82fef47 (feat(36-03): wire AiService into GameGateway lifecycle)
- FOUND: commit ed4ce7c (feat(36-03): add entity:batch handler to client entityStore)
