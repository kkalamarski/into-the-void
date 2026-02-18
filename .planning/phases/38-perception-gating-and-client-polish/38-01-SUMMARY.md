---
phase: 38-perception-gating-and-client-polish
plan: 01
subsystem: game-server, ui
tags: [socket.io, phaser, zustand, typescript, ai, creature]

# Dependency graph
requires:
  - phase: 36-ai-tick-and-zone-broadcast
    provides: AI tick loop emitting entity:batch events per zone

provides:
  - PublicCreatureUpdate compile-time whitelist in ai.service.ts (CRAI-09)
  - entity:batch -> WorldScene wiring in gameStore.ts for visual creature movement

affects:
  - future AI state fields (blocked by PublicCreatureUpdate type)
  - WorldScene rendering pipeline (now receives batch creature movements)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PublicCreatureUpdate interface as type-level broadcast whitelist (CRAI-09 pattern)"
    - "entity:batch dual-handler pattern: entityStore for React/pathfinding, gameStore for Phaser rendering"

key-files:
  created: []
  modified:
    - apps/game-server/src/game/ai.service.ts
    - apps/web/src/store/gameStore.ts

key-decisions:
  - "PublicCreatureUpdate interface placed at file level (not inline) so TypeScript rejects any future attempt to add AI state to the broadcast array"
  - "entity:batch handler in gameStore mirrors entity:update handler pattern exactly — same gameStore.getState().game?.getWorldScene() access, same worldScene.updateEntity() call"

patterns-established:
  - "Broadcast whitelist pattern: define named interface for socket payload type, use it on the array, TypeScript enforces at compile time"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 38 Plan 01: Perception Gating and Client Polish Summary

**Type-enforced AI broadcast whitelist (CRAI-09) and entity:batch -> WorldScene wiring so creature AI movements render visually on client**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T23:17:16Z
- **Completed:** 2026-02-18T23:18:23Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `PublicCreatureUpdate` interface to `ai.service.ts` — TypeScript now rejects any attempt to broadcast AI internal state (FSM state, wander target, aggro flag) in `entity:batch` events
- Wired `entity:batch` socket event in `gameStore.ts` to forward each update to `worldScene.updateEntity()`, completing the creature AI movement -> Phaser rendering pipeline
- Build passes cleanly with both changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PublicCreatureUpdate type and enforce at emit site** - `f4c3da6` (feat)
2. **Task 2: Wire entity:batch to WorldScene for visual creature updates** - `ac93e32` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/game-server/src/game/ai.service.ts` - Added `PublicCreatureUpdate` interface, replaced inline anonymous array type with `PublicCreatureUpdate[]` for `movedCreatures`
- `apps/web/src/store/gameStore.ts` - Added `entity:batch` socket handler forwarding to `worldScene.updateEntity()` for each batched creature movement

## Decisions Made

- `PublicCreatureUpdate` interface placed at module level (after imports, before class) so its scope is file-wide and visible to TypeScript for the `movedCreatures` array type annotation
- `entity:batch` handler in `gameStore.ts` deliberately does NOT update the `entities` array in the Zustand store (unlike `entity:update`) — `entityStore` already handles that for React/pathfinding; `gameStore` handler is Phaser-only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CRAI-09 security requirement satisfied: AI internal state absent from `entity:batch` broadcasts
- Creature visual movement pipeline complete: AI tick -> `entity:batch` emit -> `gameStore` handler -> `worldScene.updateEntity()` -> Phaser sprite position update
- Ready for remaining Phase 38 plans (sprite polish, tile fallbacks, etc.)

---
*Phase: 38-perception-gating-and-client-polish*
*Completed: 2026-02-18*
