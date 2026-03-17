---
phase: 133-distance-system-migration
plan: 02
subsystem: game-server
tags: [pixel-distance, combat, gathering, npc, interaction, range-check]

# Dependency graph
requires:
  - phase: 133-01
    provides: canInteractPixel, pixelDistanceTo, tileToPixelCenter, MELEE_RANGE_PX, GATHER_RANGE_PX, NPC_INTERACT_RANGE_PX, TILE_SIZE_PX constants and functions
provides:
  - Pixel-distance combat range checks in ability.service.ts (gather + attack)
  - Pixel-distance AoE spread in getNearbyCreatures (ability.service.ts)
  - Pixel-distance creature melee adjacency in combat.service.ts
  - Pixel-distance gather start range in gathering.service.ts
  - cancelIfOutOfRange method for continuous gather cancel on player movement
  - NPC_INTERACT_RANGE_PX range guard in game.gateway.ts handleNpcInteract
  - Gather cancel wired into player:pixelMove handler in game.gateway.ts
affects:
  - 133-03
  - 133-04
  - ai-system
  - combat-system
  - gathering-system
  - npc-system

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pixel distance migration: canInteract(player, entity, tileRange) replaced with canInteractPixel(player.px, player.py, entity, RANGE_PX)"
    - "Tile-range to pixel conversion at callsite: rangePx = ability.range * TILE_SIZE_PX (preserves ability definition compatibility)"
    - "cancelIfOutOfRange pattern: public method on GatheringService called from movement path for continuous range validation"

key-files:
  created: []
  modified:
    - apps/game-server/src/game/ability.service.ts
    - apps/game-server/src/game/combat.service.ts
    - apps/game-server/src/game/gathering.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/game-server/src/game/game.service.ts

key-decisions:
  - "Ability tile range converted to pixels at callsite (ability.range * TILE_SIZE_PX) to preserve ability definition compatibility without changing AbilityDefinition schema"
  - "cancelIfOutOfRange uses client-predicted position for responsiveness — authoritative position validated by MovementService.tick() separately"
  - "Failed combat range check returns hardcoded 'Out of range' string to match canInteractPixel reason string (per must_haves truth)"
  - "getNearbyCreatures migrated from Chebyshev tile distance to pixelDistanceTo with TILE_SIZE_PX radius scaling"

patterns-established:
  - "Pattern: All player-to-entity range checks now use canInteractPixel(player.px, player.py, entity, RANGE_PX_CONSTANT)"
  - "Pattern: Creature tile position converted with tileToPixelCenter before any pixel distance calculation"

requirements-completed: [DIST-01, DIST-02, DIST-03]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 133 Plan 02: Distance System Migration — Combat/Gathering/NPC Summary

**Pixel-distance range checks across ability, combat, gathering, and NPC interaction subsystems — tile Manhattan/Chebyshev distances fully replaced with canInteractPixel and pixelDistanceTo**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-17T23:19:33Z
- **Completed:** 2026-03-17T23:24:33Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- ability.service.ts: gather and combat range checks use canInteractPixel(player.px, player.py) + pixel constants; getNearbyCreatures uses pixelDistanceTo + TILE_SIZE_PX scaling
- combat.service.ts: creature melee attack adjacency uses pixelDistanceTo + MELEE_RANGE_PX instead of Chebyshev tile distance > 1
- gathering.service.ts: startGathering range check uses canInteractPixel with GATHER_RANGE_PX; new cancelIfOutOfRange method for movement-driven gather cancellation
- game.gateway.ts: handleNpcInteract rejects requests beyond NPC_INTERACT_RANGE_PX; handlePixelMove wires cancelIfOutOfRange for responsive gather cancel

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate ability.service.ts and combat.service.ts to pixel distance** - `0ea596d` (feat)
2. **Task 2: Migrate gathering.service.ts and game.gateway.ts — gather cancel + NPC range guard** - `7d79892` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `apps/game-server/src/game/ability.service.ts` - canInteractPixel for gather/combat range; getNearbyCreatures uses pixelDistanceTo
- `apps/game-server/src/game/combat.service.ts` - creature melee adjacency uses pixelDistanceTo + MELEE_RANGE_PX
- `apps/game-server/src/game/gathering.service.ts` - canInteractPixel for startGathering range; cancelIfOutOfRange method added
- `apps/game-server/src/game/game.gateway.ts` - NPC range guard with NPC_INTERACT_RANGE_PX; gather cancel wired to handlePixelMove
- `apps/game-server/src/game/game.service.ts` - Auto-fix: added missing px/py fields to PlayerPublic object in movePlayer

## Decisions Made
- Ability tile range converted to pixels at callsite (`ability.range * TILE_SIZE_PX`) so AbilityDefinition schema remains unchanged
- cancelIfOutOfRange uses client-predicted position (`data.predictedPx/Py`) for immediate responsiveness rather than waiting for MovementService tick
- Combat range failure returns `'Out of range'` string explicitly to satisfy the must_haves truth about error message

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed PlayerPublic object missing px/py fields in game.service.ts**
- **Found during:** Task 1 (build verification after ability.service.ts changes)
- **Issue:** game.service.ts movePlayer() constructed a PlayerPublic literal without px/py fields, which became required in Phase 133-01 when PlayerPublic interface was updated. Build error TS2739.
- **Fix:** Added `px: player.px, py: player.py` to the playerPublic object in the zoneChanged branch
- **Files modified:** `apps/game-server/src/game/game.service.ts`
- **Verification:** `npx nx run game-server:build` passes with no errors
- **Committed in:** `0ea596d` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — missing required interface fields)
**Impact on plan:** Auto-fix was essential for build correctness. The bug was introduced by Phase 133-01 adding px/py to PlayerPublic but not updating all construction sites.

## Issues Encountered
None beyond the auto-fixed bug above.

## Next Phase Readiness
- All player-to-entity pixel range migrations complete for combat, gathering, and NPC interaction
- Phase 133-03 (AI/creature flee radius pixel migration) can proceed — FLEE_RADIUS_PX is available from Phase 133-01
- Phase 133-04 (cleanup of legacy canInteract references) can proceed once all callsites are migrated

---
*Phase: 133-distance-system-migration*
*Completed: 2026-03-18*
