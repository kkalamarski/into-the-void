---
phase: 085-gathering-as-ability-system
plan: 03
subsystem: game-client
tags: [phaser, collision-detection, pathfinding, entity-system, gathering]

# Dependency graph
requires:
  - phase: 082-aquatic-foundation
    provides: TileState system and collision detection patterns
  - phase: 085-01
    provides: GatherEffect and gathering ability definitions
provides:
  - Entity-type-based collision filtering (minerals/plants block, items/NPCs don't)
  - Target selection for gathering entities (instead of auto-start)
  - Pathfinding compatibility with ability-based gathering
affects: [085-02, gathering-ui, ability-system, pathfinding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Entity type filtering for collision detection
    - Target selection pattern for gathering entities
    - Separation of click-to-select vs auto-start interaction

key-files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/systems/PathfindingController.ts
    - apps/web/src/store/entityStore.ts

key-decisions:
  - "Only static gatherable entities (minerals, plants) block movement"
  - "Items, NPCs, and creatures do not block pathfinding"
  - "Minerals/plants use target selection instead of auto-start gathering"
  - "PathfindingController inherits collision logic via accessor pattern"

patterns-established:
  - "Entity type filtering: Check entity.type before blocking movement"
  - "Target selection UI: Show highlight and set combat target for gathering"
  - "Collision delegation: PathfindingController uses WorldScene accessor"

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 85 Plan 03: Entity Collision Fix on Client Summary

**Entity collision filtering ensures only static gatherable resources block movement while items, NPCs, and creatures remain passable**

## Performance

- **Duration:** 3 min 54 sec
- **Started:** 2026-02-24T01:08:27Z
- **Completed:** 2026-02-24T01:12:21Z
- **Tasks:** 5 (includes debug logging add/remove)
- **Files modified:** 3

## Accomplishments
- Fixed entity collision to filter by type (minerals/plants block, items/NPCs/creatures don't)
- Changed mineral/plant click interaction from auto-start to target selection
- Verified coordinate system alignment with debug logging (then removed)
- PathfindingController automatically inherits new collision logic via accessor

## Task Commits

Each task was committed atomically:

1. **Task 1: Add blocking entity type check** - `7645762` (fix)
2. **Tasks 3-4: Verify coordinate system alignment** - `6971ea1` (chore - debug logging)
3. **Task 5: Remove gathering click handler redirect** - `1fa4b7d` (feat)
4. **Cleanup: Remove debug logging** - `eca4e67` (chore)

_Note: Task 2 required no changes - PathfindingController correctly delegates to isWorldTileBlocked accessor_

## Files Created/Modified
- `apps/web/src/game/scenes/WorldScene.ts` - Added entity type filtering to isTileBlocked; changed mineral/plant click to target selection with highlight
- `apps/web/src/store/entityStore.ts` - Added then removed debug logging for position verification
- `apps/web/src/game/systems/PathfindingController.ts` - No changes needed (inherits via accessor pattern)

## Decisions Made
- **Entity blocking logic:** Only minerals and plants block movement - items/NPCs/creatures are passable
- **Interaction pattern:** Minerals/plants are selected as targets (with highlight) instead of auto-starting gathering
- **Architecture:** PathfindingController correctly delegates collision checks to WorldScene accessor, avoiding duplication

## Deviations from Plan

None - plan executed exactly as written. Task 2 verified that PathfindingController didn't need changes due to proper abstraction.

## Issues Encountered

None - implementation was straightforward. The existing accessor pattern (isBlocked function passed to PathfindingController) meant Task 2 required only verification, not code changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Entity collision system now compatible with ability-based gathering
- Target selection pattern established for gathering entities
- Ready for 85-02 (gather effect implementation on server)
- Pathfinding correctly avoids static resources while allowing player to navigate around dynamic entities

---
*Phase: 085-gathering-as-ability-system*
*Completed: 2026-02-24*

## Self-Check: PASSED

All claims verified:
- ✓ All 3 modified files exist
- ✓ All 4 commit hashes exist in git history
- ✓ Task commits properly tagged with (85-03)
- ✓ Files modified as documented
