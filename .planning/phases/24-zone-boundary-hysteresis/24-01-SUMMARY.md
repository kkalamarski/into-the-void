---
phase: 24-zone-boundary-hysteresis
plan: 01
subsystem: ui
tags: [phaser, worldscene, chunk-loading, zone-transition, hysteresis]

# Dependency graph
requires:
  - phase: 23-smooth-movement
    provides: WorldScene with updateLocalPlayerSprite position update hooks
  - phase: 22-8-directional-input-pathfinding
    provides: ChunkManager 3x3 adjacent chunk pre-loading strategy
provides:
  - HYSTERESIS_TILES = 3 constant in shared-types/constants.ts
  - WorldScene.commitZoneTransition() for deferred zone state updates
  - WorldScene.checkPendingZoneTransition() for per-position-update depth check
  - WorldScene.getZoneBoundaryDepth() for tile-distance-from-boundary calculation
  - Hysteresis in onPlayerZoneChanged() preventing chunk thrashing at boundaries
affects:
  - any future phase touching WorldScene zone transitions or ChunkManager

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tile-depth hysteresis: defer zone state commit until N tiles inside new zone"
    - "Immediate chunk pre-load + delayed state commit: updateChunks fires immediately, commitZoneTransition fires at depth >= HYSTERESIS_TILES"
    - "Position update hook: checkPendingZoneTransition called at end of updateLocalPlayerSprite on every position tick"

key-files:
  created: []
  modified:
    - packages/shared-types/src/constants.ts
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "HYSTERESIS_TILES = 3: matches HUD HYSTERESIS_FRAMES = 3 pattern; 3 tiles = 450ms lag at 150ms/move, acceptable UX tradeoff"
  - "updateChunks() fires immediately on zone:state (no hysteresis) to maintain 3x3 pre-load; only commitZoneTransition() is delayed"
  - "Fall back to immediate commit when player position unavailable (defensive coding)"
  - "Pending zone cancelled if player returns to committed zone before depth threshold"

patterns-established:
  - "Hysteresis pattern: pendingZoneId + pendingBiome state fields + depth check on each position update"
  - "commitZoneTransition() separates pre-load trigger (updateChunks) from state commit (currentZoneId, heights, HUD) for clean hysteresis"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 24 Plan 01: Zone Boundary Hysteresis Summary

**Tile-depth hysteresis (3-tile threshold) in WorldScene prevents chunk loading/unloading thrashing when walking along zone boundaries, eliminating "Loading terrain..." indicator flashing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T14:00:46Z
- **Completed:** 2026-02-17T14:02:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `HYSTERESIS_TILES = 3` constant exported from `shared-types/constants.ts`
- Refactored `onPlayerZoneChanged()` into `commitZoneTransition()` (state update) + hysteresis gate logic
- Added `checkPendingZoneTransition()` called on every position update to detect when depth threshold is met or transition should be cancelled
- Added `getZoneBoundaryDepth()` helper returning minimum tile distance from any zone edge

## Task Commits

Each task was committed atomically:

1. **Task 1: Add HYSTERESIS_TILES constant and zone boundary depth calculation** - `8aa49a2` (feat)
2. **Task 2: Implement hysteresis logic in onPlayerZoneChanged and updateLocalPlayerSprite** - `88d0929` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/shared-types/src/constants.ts` - Added `HYSTERESIS_TILES = 3` export
- `apps/web/src/game/scenes/WorldScene.ts` - Added pendingZoneId/pendingBiome fields, getZoneBoundaryDepth(), commitZoneTransition(), checkPendingZoneTransition(), and refactored onPlayerZoneChanged(); added checkPendingZoneTransition() call at end of updateLocalPlayerSprite()

## Decisions Made
- HYSTERESIS_TILES = 3: matches the HUD's existing HYSTERESIS_FRAMES = 3 biome pattern; 3 tiles at 150ms/move = 450ms max lag before zone commits, which is imperceptible at normal play speed
- `updateChunks()` always fires immediately (no delay) so the 3x3 adjacent chunk pre-loading strategy continues working; only state commit is delayed — this prevents visible pop-in when hysteresis expires
- Used `useGameStore.getState().player?.position` inside `onPlayerZoneChanged()` to access server-authoritative position (same position that triggered the zone transition), avoiding position source confusion
- If no position available (defensive fallback), commit immediately to avoid broken state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 24 plan 01 complete — zone boundary hysteresis is implemented
- Walking back and forth across zone boundaries (y=63 to y=64) no longer triggers constant chunk loading/unloading
- "Loading terrain..." indicator stays hidden when walking at boundaries
- Chunks for adjacent zones remain pre-loaded (3x3 grid maintained, no pop-in)
- Zone HUD and collision map update correctly once player commits to new zone (3+ tiles in)
- No blockers - this was the final planned phase for v1.5 milestone

---
*Phase: 24-zone-boundary-hysteresis*
*Completed: 2026-02-17*
