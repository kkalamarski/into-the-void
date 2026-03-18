---
phase: 136-combat-gathering-fix
plan: 01
subsystem: api
tags: [game-server, pixel-distance, canInteract, cleanup]

requires:
  - phase: 133-distance-system-migration
    provides: canInteractPixel function and pixel distance utilities
provides:
  - Clean server-side service files with no dead tile-based canInteract imports
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/game-server/src/game/entity.service.ts
    - apps/game-server/src/game/gathering.service.ts
    - apps/game-server/src/game/ability.service.ts

key-decisions:
  - "combat.service.ts already clean — no canInteract import present, no changes needed"
  - "player.position.x/y usage in ability.service.ts confirmed as AoE center lookup (converted via tileToPixelCenter), not direct distance check"

patterns-established: []

requirements-completed: [INTERACT-03]

duration: 3min
completed: 2026-03-18
---

# Phase 136-01: Server-Side Distance Audit Summary

**Removed stale tile-based canInteract() imports from entity, gathering, and ability services — all range checks verified using pixel coordinates**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18
- **Completed:** 2026-03-18
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Removed unused `canInteract` import from entity.service.ts (already uses canInteractPixel at line 79)
- Removed unused `canInteract` import from gathering.service.ts (already uses canInteractPixel at line 177)
- Removed unused `canInteract` import from ability.service.ts (already uses canInteractPixel at lines 341/357)
- Confirmed combat.service.ts was already clean — uses pixelDistanceTo with tileToPixelCenter conversion
- Verified no tile-integer distance fallbacks remain in any service file

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove stale tile-based canInteract imports and verify pixel usage** - `e949562` (fix)

## Files Created/Modified
- `apps/game-server/src/game/entity.service.ts` - Removed unused canInteract import
- `apps/game-server/src/game/gathering.service.ts` - Removed unused canInteract import
- `apps/game-server/src/game/ability.service.ts` - Removed unused canInteract import

## Decisions Made
- combat.service.ts was already clean (no canInteract import), so no changes were needed
- player.position.x/y in ability.service.ts is used for AoE center (goes through tileToPixelCenter), not for direct distance checks — confirmed correct

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server-side distance checks are clean and exclusively use pixel coordinates
- Ready for client-side click-to-interact wiring (136-02)

---
*Phase: 136-combat-gathering-fix*
*Completed: 2026-03-18*
