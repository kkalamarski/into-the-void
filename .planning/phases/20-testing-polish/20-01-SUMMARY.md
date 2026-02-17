---
phase: 20-testing-polish
plan: 01
subsystem: ui
tags: [phaser, css, cleanup, memory-leaks, chunk-loading]

# Dependency graph
requires:
  - phase: 18-chunk-streaming
    provides: ChunkManager, chunk loading indicator, socket-based chunk loading
  - phase: 17-infinite-world
    provides: PathfindingController, WorldScene, IsometricTransform
affects: [20-02-PLAN.md, future phases using ChunkManager or WorldScene]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS class toggle pattern for conditional visibility (always in DOM, toggle 'visible' class)"
    - "Zustand connectionState watcher for socket disconnect side effects"
    - "Public accessor methods on WorldScene for external cleanup calls"

key-files:
  created: []
  modified:
    - apps/web/src/styles/loading.css
    - apps/web/src/game/systems/PathfindingController.ts
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/components/GameContainer.tsx

key-decisions:
  - "Use Zustand connectionState watcher instead of raw socket 'disconnect' event for type safety with typed GameSocket class"
  - "CSS class toggle (always in DOM) instead of conditional render for smooth opacity transitions on chunk loading indicator"
  - "bottom: 210px positions indicator above 180px minimap with buffer"

patterns-established:
  - "CSS opacity transition pattern: element always in DOM, .visible class controls opacity with delay"
  - "Phaser graphics cleanup: destroy() method pattern for controllers holding Phaser objects"

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 20 Plan 01: Pre-Test Baseline Fixes Summary

**CSS opacity transition for chunk loading indicator above minimap, PathfindingController.destroy() for Graphics cleanup, and disconnect-triggered ChunkManager clearing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T09:32:15Z
- **Completed:** 2026-02-17T09:35:15Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments
- Chunk loading indicator repositioned to `bottom: 210px` (above 180px minimap) with 0.3s fade-in transition and 0.2s appearance delay to prevent flashing
- PathfindingController gains a `destroy()` method that properly destroys Phaser Graphics object and nulls references, preventing memory leaks during scene shutdown
- WorldScene.shutdown() now calls `pathfindingController.destroy()` instead of `cancelPath()`, and exposes a `getChunkManager()` accessor
- ChunkManager state cleared on socket disconnect via Zustand `connectionState` watcher in GameContainer

## Task Commits

Each task was committed atomically:

1. **Task 1: Reposition chunk loading indicator above minimap** - `0a7f54d` (fix)
2. **Task 2: Add destroy method to PathfindingController** - `33f09ce` (fix)
3. **Task 3: Wire cleanup calls to WorldScene shutdown and socket disconnect** - `dc0f656` (fix)
4. **Task 4: Update GameContainer to use visible class for loading indicator** - `c183880` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/web/src/styles/loading.css` - Chunk loading indicator: bottom 20px→210px, opacity transition, .visible class
- `apps/web/src/game/systems/PathfindingController.ts` - Added public destroy() method for proper Phaser Graphics cleanup
- `apps/web/src/game/scenes/WorldScene.ts` - Added getChunkManager() accessor, shutdown now calls destroy() on pathfindingController
- `apps/web/src/components/GameContainer.tsx` - Added connectionState useEffect for disconnect cleanup, loading indicator class toggle

## Decisions Made
- **Zustand connectionState watcher vs raw socket event:** The `GameSocket` class has a typed `on()` method restricted to `keyof ServerEvents`, which does not include `'disconnect'`. Instead of modifying the GameSocket API (architectural change), used the existing Zustand `connectionState` store which already reflects disconnects - functionally equivalent and type-safe.
- **CSS class toggle vs conditional render:** Always keeping the indicator in the DOM enables CSS `opacity` transitions to animate on both show and hide. Conditional render would cause the element to be removed before the fade-out could complete.
- **pointer-events: none on indicator:** Added to prevent the always-in-DOM (but invisible) indicator from blocking clicks during non-loading state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used Zustand connectionState instead of raw gameSocket.on('disconnect')**
- **Found during:** Task 3 (Wire cleanup calls to WorldScene shutdown and socket disconnect)
- **Issue:** The `GameSocket.on()` method is typed to only accept `keyof ServerEvents`. The `'disconnect'` event is an internal socket lifecycle event not included in `ServerEvents`, causing TypeScript errors TS2339, TS2345, and TS2554.
- **Fix:** Replaced `gameSocket.on('disconnect', ...)` with a `useEffect` that watches `connectionState` from Zustand store. When `connectionState === 'disconnected'`, calls `worldScene.getChunkManager()?.clear()`. Also removed the unnecessary `WorldScene` import added for the type cast.
- **Files modified:** apps/web/src/components/GameContainer.tsx
- **Verification:** TypeScript build passes without errors
- **Committed in:** dc0f656 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug/type error)
**Impact on plan:** Required to fix type errors from mismatched socket API usage. Functionally equivalent outcome. No scope creep.

## Issues Encountered
- TypeScript errors during Task 3 when attempting to use `gameSocket.on('disconnect', ...)` - the GameSocket wrapper class restricts events to ServerEvents only. Resolved by using Zustand connectionState watcher which is the idiomatic pattern already used in the codebase.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Clean baseline established: chunk loading indicator properly positioned, no PathfindingController memory leaks, ChunkManager cleared on disconnect
- All known pre-test issues from Phase 20 research are resolved
- Ready for Phase 20 Plan 02: validation test scenarios

---
*Phase: 20-testing-polish*
*Completed: 2026-02-17*

## Self-Check: PASSED

All files verified present:
- FOUND: apps/web/src/styles/loading.css
- FOUND: apps/web/src/game/systems/PathfindingController.ts
- FOUND: apps/web/src/game/scenes/WorldScene.ts
- FOUND: apps/web/src/components/GameContainer.tsx
- FOUND: .planning/phases/20-testing-polish/20-01-SUMMARY.md

All commits verified:
- FOUND: 0a7f54d (fix: reposition chunk loading indicator)
- FOUND: 33f09ce (fix: add destroy method to PathfindingController)
- FOUND: dc0f656 (fix: wire cleanup calls)
- FOUND: c183880 (fix: CSS class toggle for loading indicator)
