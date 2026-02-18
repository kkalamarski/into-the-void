---
phase: 31-server-wiring-socket-delivery
plan: 01
subsystem: api
tags: [websocket, socket.io, stats, shared-types, game-server, nestjs]

# Dependency graph
requires:
  - phase: 30-type-foundation-pure-computation
    provides: computeCharStats pure function and CharacterStats 8-stat type
  - phase: 25-item-data-model-foundation
    provides: EquipmentJson and InventoryItemJson database types

provides:
  - CharStatsPayload interface (total/base/equipment breakdown) in shared-types
  - stats:update added to ServerEventType and ServerEvents in shared-types
  - emitStats private helper in GameGateway calling computeCharStats
  - stats:update socket emission after auth and all equipment mutations

affects: [web client stats HUD, 31-02-plan, 32-client-stats-display]

# Tech tracking
tech-stack:
  added: []
  patterns: [server-authoritative stats delivery, private socket emissions, emitStats helper pattern]

key-files:
  created:
    - packages/shared-types/src/game/stats.ts
  modified:
    - packages/shared-types/src/network/events.ts
    - packages/shared-types/src/index.ts
    - apps/game-server/src/game/game.gateway.ts

key-decisions:
  - "stats:update is private (client.emit not server.to(room).emit) — only the requesting client receives stats"
  - "emitStats computes base with empty equipment for clean delta calculation"
  - "handleInteract uses getPlayerBySocket because player variable is out of scope in that handler"

patterns-established:
  - "emitStats pattern: always call after inventory:update when equipment could change"
  - "Base stats computed from emptyEquipment = { modules: [] } to isolate level scaling from equipment bonuses"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 31 Plan 01: Server Wiring & Socket Delivery Summary

**CharStatsPayload type wired through shared-types and stats:update emitted from GameGateway at 5 call sites after auth and every equipment mutation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T10:14:18Z
- **Completed:** 2026-02-18T10:16:36Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `CharStatsPayload` interface with total/base/equipment breakdown in shared-types
- Added `stats:update` to `ServerEventType` union and `ServerEvents` interface
- Added `emitStats` private helper to `GameGateway` that calls `computeCharStats` twice (base with empty equipment, total with real equipment) and emits the diff
- Wired `emitStats` at 5 call sites: handleAuth, handleEquipmentChange, handleInventoryUnequip, handleToolSwap, handleInteract

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CharStatsPayload interface and wire into ServerEvents** - `8870825` (feat)
2. **Task 2: Add emitStats helper and wire into GameGateway handlers** - `6efe7d0` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/shared-types/src/game/stats.ts` - New CharStatsPayload interface with total/base/equipment fields
- `packages/shared-types/src/network/events.ts` - Added 'stats:update' to ServerEventType and ServerEvents
- `packages/shared-types/src/index.ts` - Added export for ./game/stats
- `apps/game-server/src/game/game.gateway.ts` - Added emitStats helper, 5 call sites, and 3 new imports

## Decisions Made
- `stats:update` is private (`client.emit`) not zone-wide — only the requesting client should see their own stats
- Base stats computed with `emptyEquipment = { modules: [] }` to ensure a clean separation between level scaling and equipment bonuses
- In `handleInteract`, used `getPlayerBySocket(client.id)` (not the outer `player` variable) because `player` is not in scope at the emit site

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - full monorepo build passed cleanly for all 9 projects.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server now emits `stats:update` to clients after auth and all equipment changes
- Client-side stats store (statsStore.ts) and HUD panel can be built in the next plan
- `CharStatsPayload` type is ready to be consumed by the web client

---
*Phase: 31-server-wiring-socket-delivery*
*Completed: 2026-02-18*
