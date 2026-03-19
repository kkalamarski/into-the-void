---
phase: quick-10
plan: 01
subsystem: rendering
tags: [phaser, isometric, depth-sorting, entity-rendering]

requires:
  - phase: v1.30-entity-y-fix
    provides: "ENTITY_GROUND_OFFSET visual shift for entity containers"
provides:
  - "Entity depth sorting aligned with visual position via ENTITY_GROUND_OFFSET"
affects: [rendering, depth-sorting, entity-rendering]

tech-stack:
  added: []
  patterns: ["Entity depth includes visual offset for correct sorting"]

key-files:
  created: []
  modified:
    - "apps/web/src/game/utils/IsometricTransform.ts"

key-decisions:
  - "Used same ENTITY_GROUND_OFFSET constant (64) as EntityRenderer/WorldScene for consistency"

patterns-established:
  - "Depth calculation must match visual position: any visual Y offset applied to containers must also be added to depth"

requirements-completed: [QUICK-10]

duration: 1min
completed: 2026-03-19
---

# Quick Task 10: Fix Entity Rendering - Sinking Behind Tiles

**Entity depth now includes ENTITY_GROUND_OFFSET (64) so entities sort at their visual Y position instead of grid position, preventing them from sinking behind tiles**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-19T12:27:45Z
- **Completed:** 2026-03-19T12:28:49Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Fixed entity depth calculation to add ENTITY_GROUND_OFFSET (64) when isEntity is true
- Entities no longer hidden behind tiles on their upper half
- Updated depth model documentation to explain the visual-position-aligned sorting

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ENTITY_GROUND_OFFSET to entity depth calculation** - `ee183c6` (fix)

## Files Created/Modified
- `apps/web/src/game/utils/IsometricTransform.ts` - Added ENTITY_GROUND_OFFSET constant (64); changed entityOffset from 0.5 to ENTITY_GROUND_OFFSET for entities; updated depth model comment block

## Decisions Made
- Defined a local `ENTITY_GROUND_OFFSET = 64` constant in IsometricTransform.ts rather than importing from EntityRenderer.ts, keeping the utility module self-contained while matching the value used in EntityRenderer and WorldScene

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Entity depth sorting is now correct; visual verification recommended in-game
- No blockers for subsequent work

## Self-Check: PASSED

- FOUND: apps/web/src/game/utils/IsometricTransform.ts
- FOUND: commit ee183c6
- FOUND: 10-SUMMARY.md

---
*Quick Task: 10-fix-entity-rendering-features-sinking-pl*
*Completed: 2026-03-19*
