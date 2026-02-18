---
phase: 34-entity-lifecycle-persistence-and-enriched-spawning
plan: "02"
subsystem: ui
tags: [zustand, immer, socket.io, entity, react]

requires:
  - phase: 34-entity-lifecycle-persistence-and-enriched-spawning
    provides: Entity type in shared-types with active/position/id fields

provides:
  - useEntityStore Zustand hook with Map<string, Entity> storage
  - getEntityAtPosition(x, y, zoneId) query helper for pathfinding entity blocking
  - socket event wiring for entity:spawn, entity:update, entity:despawn
  - Multi-handler GameSocket.on() supporting concurrent gameStore + entityStore listeners

affects: [pathfinding, react-entity-display, phase-35-loot, phase-36-ai-tick]

tech-stack:
  added: []
  patterns:
    - "enableMapSet() before immer store creation for Map/Set support"
    - "Array-based handler dispatch in GameSocket for multi-listener events"
    - "Module-level socket.on() wiring in store files (same as inventoryStore pattern)"

key-files:
  created:
    - apps/web/src/store/entityStore.ts
  modified:
    - apps/web/src/network/socket.ts

key-decisions:
  - "GameSocket.on() upgraded to array-based multi-handler dispatch so both gameStore (Phaser) and entityStore (React/pathfinding) can independently handle entity events without silent handler replacement"
  - "enableMapSet() from immer called at module top — required for immer v11 Map mutation support in draft producers"

patterns-established:
  - "Multi-handler socket pattern: GameSocket.on() accumulates handlers in arrays; off() with handler arg removes specific listener; dispatch() calls all"

duration: 8min
completed: 2026-02-18
---

# Phase 34 Plan 02: Entity Client Store Summary

**Zustand entityStore with Map<string, Entity> storage, immer Map support, and multi-handler socket dispatch enabling concurrent Phaser + React entity event handling**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-18T15:05:40Z
- **Completed:** 2026-02-18T15:13:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created `entityStore.ts` following the `inventoryStore.ts` pattern with immer middleware and Map-based O(1) entity storage
- Implemented `getEntityAtPosition(x, y, zoneId)` query helper for pathfinding entity collision checks
- Fixed `GameSocket.on()` to support multiple handlers per event so both `gameStore` (Phaser rendering) and `entityStore` (React/pathfinding) can handle entity events simultaneously

## Task Commits

Each task was committed atomically:

1. **Task 1: Create entityStore.ts Zustand store with socket wiring** - `e9e319d` (feat)

**Plan metadata:** (see final commit)

## Files Created/Modified

- `apps/web/src/store/entityStore.ts` - Zustand entity store with Map<string, Entity>, immer middleware, socket event wiring, and getEntityAtPosition helper
- `apps/web/src/network/socket.ts` - Upgraded GameSocket.on() from single-handler to array-based multi-handler dispatch

## Decisions Made

- **Multi-handler socket dispatch:** The plan assumed "both listeners fire" but the existing `GameSocket.on()` was a single-handler map (each `.on()` call overwrote the previous handler). Fixed by upgrading to array-based handlers so both `gameStore` and `entityStore` can independently register for the same entity events.
- **enableMapSet() placement:** Called at module top (before store creation) as required by immer v11 for Map/Set support in draft producers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Upgraded GameSocket to multi-handler array dispatch**
- **Found during:** Task 1 (Create entityStore.ts)
- **Issue:** `GameSocket.on()` used `this.handlers[event] = handler` (single-handler map). Registering `entity:spawn` from `entityStore.ts` would silently replace the existing `gameStore.ts` handler, breaking Phaser rendering for all entity events.
- **Fix:** Changed `handlers` from `{ [K]: handler }` to `{ [K]: handler[] }`, updated `on()` to push to array, added `dispatch()` private method to iterate handlers, updated `off()` to support optional handler argument for specific removal.
- **Files modified:** `apps/web/src/network/socket.ts`
- **Verification:** Build passes; both handler arrays coexist without overwriting.
- **Committed in:** `e9e319d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** The fix is essential for correctness — without it, adding entityStore would have silently broken Phaser entity rendering. No scope creep.

## Issues Encountered

None beyond the multi-handler deviation.

## User Setup Required

None - no external service configuration required.

## Self-Check

## Self-Check: PASSED

Verified:
- `apps/web/src/store/entityStore.ts` exists with `useEntityStore`, `enableMapSet()`, and socket wiring
- `apps/web/src/network/socket.ts` updated with array-based multi-handler dispatch
- Commit `e9e319d` exists in git log
- `pnpm build` succeeded with all 10 projects built

## Next Phase Readiness

- `useEntityStore` is importable for React components displaying nearby entities
- `getEntityAtPosition(x, y, zoneId)` ready for pathfinding entity-blocking integration
- `clearEntities()` ready for zone transition cleanup
- `GameSocket` now supports multi-listener pattern — other future stores can safely register for the same events

---
*Phase: 34-entity-lifecycle-persistence-and-enriched-spawning*
*Completed: 2026-02-18*
