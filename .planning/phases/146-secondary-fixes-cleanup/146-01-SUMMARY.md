---
phase: 146-secondary-fixes-cleanup
plan: 01
subsystem: ui
tags: [phaser, portal, npc, proximity, debounce]

requires:
  - phase: 144-chunk-listener-cleanup
    provides: chunk management and zone transition framework
provides:
  - portal debounce key includes zoneId to prevent cross-zone suppression
  - NPC proximity uses real pixel position in tile-based movement path
affects: [portal-system, npc-interaction, zone-transitions]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "Read player px/py from game store with fallback to tileToPixelCenter for defensive null handling"

patterns-established: []

requirements-completed: [MISC-01, MISC-02]

duration: 3min
completed: 2026-03-19
---

# Plan 146-01: Fix portal debounce key and NPC proximity pixel position

**Portal debounce key now includes zoneId to prevent cross-zone suppression; NPC proximity uses real pixel coordinates instead of tile-center approximation**

## Performance

- **Duration:** 3 min
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Portal debounce key in checkPortalTileAtPixels includes currentZoneId so portals at same tile coords in different zones are not suppressed
- Zone transitions (commitZoneTransition, fullZoneReset) clear lastPortalEmitKey so destination zone portals can trigger immediately
- NPC proximity in updateLocalPlayerSprite reads actual pixel position from game store instead of tile-center approximation

## Task Commits

1. **Task 1: Fix portal debounce key to include zoneId** - `0c839f1` (fix)
2. **Task 2: Fix NPC proximity to use actual pixel position** - `4389cc6` (fix)

## Files Created/Modified
- `apps/web/src/game/scenes/WorldScene.ts` - Portal debounce key includes zoneId, zone transitions clear debounce, NPC proximity reads real px/py

## Decisions Made
- Used `useGameStore.getState().player?.px` with nullish coalescing fallback to tileToPixelCenter for defensive handling when px/py are not yet set

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Portal and NPC proximity fixes are complete and ready for integration testing
- No blockers

---
*Phase: 146-secondary-fixes-cleanup*
*Completed: 2026-03-19*
