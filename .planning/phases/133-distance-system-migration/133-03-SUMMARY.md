---
phase: 133-distance-system-migration
plan: 03
subsystem: ai
tags: [creature-ai, pixel-distance, aggro-delay, leash-heal, fsm, game-server]

# Dependency graph
requires:
  - phase: 133-01
    provides: "pixelDistanceTo, tileToPixelCenter, AGGRO_RADIUS_PX, LEASH_RADIUS_PX, FLEE_RADIUS_PX, MELEE_RANGE_PX; PlayerPublic px/py fields"

provides:
  - "creature-ai.ts: pure FSM using pixel Euclidean distance for aggro/flee/leash detection"
  - "ai.service.ts: 0.5s aggro delay with creature:aggro_detected '!' emission"
  - "ai.service.ts: full HP heal on leash with entity:update broadcast"
  - "ai.service.ts: pixel distance for all aggro/flee/stampede range checks"
  - "ai.service.ts: pendingAggro map with zoneId tracking and targeted cleanup"

affects: [combat, movement, game-server, game-logic]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "creatureToPlayerDist helper: creature tile coords converted to pixel center before Euclidean distance"
    - "moveToward accepts PlayerPublic | {x,y} — uses px/py when available for sub-tile accuracy"
    - "Aggro delay pattern: pendingAggro Map tracks first-detection timestamp; committed after AGGRO_DELAY_MS"
    - "Leash heal: shouldReturn triggers health=maxHealth update + entity:update broadcast"

key-files:
  created: []
  modified:
    - packages/game-logic/src/ai/creature-ai.ts
    - apps/game-server/src/game/ai.service.ts

key-decisions:
  - "0.5s aggro delay (AGGRO_DELAY_MS=500): first detection stores pendingAggro + emits creature:aggro_detected with '!' icon; combat committed on second tick"
  - "Immediate aggro (zone join/respawn) bypasses delay for responsiveness — only tick-based aggro uses delay"
  - "Full HP heal on leash: prevents kiting exploits where players lead creature away and back to chip health"
  - "pendingAggro stores zoneId for targeted cleanup in deactivateZone (not clearing all zones)"
  - "DIST-05 (fog of war) skipped per user decision — no code written"

patterns-established:
  - "Tile-snapped creatures use tileToPixelCenter for Euclidean distance but still move ±1 tile per tick"
  - "Aggro delay pattern: detect → emit visual indicator → wait → commit (standard for turn-based feel with visual feedback)"

requirements-completed: [DIST-04, DIST-05]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 133 Plan 03: Creature AI Pixel Distance Migration Summary

**Creature FSM and AI service migrated from Chebyshev tile distance to Euclidean pixel distance, with 0.5s aggro delay, "!" detection indicator, and full HP leash heal**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-17T23:21:20Z
- **Completed:** 2026-03-17T23:24:58Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced `chebyshevDistance` in `creature-ai.ts` with `pixelDistanceTo` + `tileToPixelCenter` for all aggro, leash, flee, and melee detection
- Removed tile-integer constants `AGGRO_RADIUS=5`, `FLEE_RADIUS=5`, `LEASH_DISTANCE=10` — now uses `AGGRO_RADIUS_PX`, `FLEE_RADIUS_PX`, `LEASH_RADIUS_PX`, `MELEE_RANGE_PX`
- Migrated `flee()` and `moveToward()` to use pixel coords for direction calculation (creature still moves tile-by-tile but tracks sub-tile player positions)
- Replaced all inline `AGGRO_RADIUS=5` constants and Chebyshev `Math.max(Math.abs(...))` calls in `ai.service.ts` with pixel distance
- Added `pendingAggro` map with 0.5s delay: first aggro detection emits `creature:aggro_detected` with "!" indicator; combat committed after `AGGRO_DELAY_MS=500`
- Added full HP heal on leash: `shouldReturn` now sets `health: creature.maxHealth` and broadcasts `entity:update` to refresh client health bars

## Task Commits

1. **Task 1: Migrate creature-ai.ts FSM to pixel distance** - `ec4f436` (feat)
2. **Task 2: Migrate ai.service.ts — aggro delay, "!" emission, leash HP heal, pixel distance** - `e32730b` (feat)

## Files Created/Modified

- `packages/game-logic/src/ai/creature-ai.ts` — Pure FSM now uses pixelDistanceTo + tileToPixelCenter; added creatureToPlayerDist helper; flee/moveToward use pixel coords for direction
- `apps/game-server/src/game/ai.service.ts` — All Chebyshev replaced with pixel distance; pendingAggro delay map added; leash HP heal + broadcast added; deactivateZone clears pending aggro by zoneId

## Decisions Made

- 0.5s aggro delay gives visual feedback (client sees "!" before combat starts) and prevents instant-aggro feel
- Immediate aggro on zone join bypasses the delay — responsiveness on zone entry is critical
- Full HP heal on leash: per user request, prevents kiting exploits where players chip health by leading creatures to leash boundary
- `pendingAggro` stores `zoneId` for targeted cleanup — `deactivateZone` only clears entries for the deactivated zone, not all pending aggro globally
- DIST-05 (fog of war) explicitly skipped per user decision — fog of war system is being deleted, no code written

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Creature AI fully migrated to pixel distance system — consistent with player movement (Phase 132) and combat (Phase 133-02)
- `creature:aggro_detected` event is new — frontend may want to render "!" indicator above creature when received
- Phase 133-04 and remaining plans can proceed

---
*Phase: 133-distance-system-migration*
*Completed: 2026-03-18*
