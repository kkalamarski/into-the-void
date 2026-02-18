---
phase: 38-perception-gating-and-client-polish
plan: 03
subsystem: ui
tags: [phaser, tweens, animation, entity-renderer, world-scene, visual-feedback]

# Dependency graph
requires:
  - phase: 38-01
    provides: entity:batch handler in gameStore.ts + PublicCreatureUpdate type enforcement
  - phase: 38-02
    provides: perception gating (INTR-06) + level gating (INTR-07) + behavior icon branching
  - phase: 34-03
    provides: createHealthBar() reused for yield bars; EntityRenderer with mineral/plant yield bar creation

provides:
  - Fade-in tween on entity:spawn events (400ms Linear alpha 0->1)
  - Proportional yield bar updates when entity:update contains yield change
  - maxYield, yieldBar, and elevationOffset stored on container for direct lookup
affects: [any future plan adding entity animations, any plan extending updateEntity with new visual feedback]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Container.setData() for renderer state — maxYield, yieldBar reference, elevationOffset stored on container to avoid fragile Y-position search in update handlers"
    - "zoneId presence convention — zoneId passed = initial zone load (no fade), zoneId absent = entity:spawn runtime event (fade in)"

key-files:
  created: []
  modified:
    - apps/web/src/game/rendering/EntityRenderer.ts
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "container.setData('yieldBar') stores Graphics reference directly — avoids fragile Y-position instanceof search that could fail on floating-point or layout changes"
  - "zoneId presence distinguishes entity:spawn from zone:state — initial load entities appear immediately, respawn events fade in over 400ms"
  - "elevationOffset stored as this.elevationOffset constant (12px hover) not elevation*ELEVATION_HEIGHT_STEP — yield bar Y uses the hover offset, not the terrain height offset"

patterns-established:
  - "Tween pattern: container.setAlpha(0) then tweens.add with alpha:1, duration:400, ease:'Linear' for entity respawn fade-in"
  - "Yield bar update pattern: getData('yieldBar').destroy() -> createHealthBar(yieldValue, maxYield) -> container.add() -> setData('yieldBar', newBar)"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 38 Plan 03: Entity Spawn Fade-in and Yield Bar Depletion Summary

**Phaser tween fade-in on entity:spawn events and proportional yield bar updates via direct container reference lookups for UIHD-02 and UIHD-03**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-18T23:24:13Z
- **Completed:** 2026-02-18T23:26:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Mineral and plant containers now store maxYield and yieldBar Graphics reference via setData() for direct lookup
- All entity containers store elevationOffset constant for consistent Y-position calculation in update handlers
- Entities spawned via entity:spawn event (respawns) fade in smoothly over 400ms; initial zone:state load entities appear immediately
- Yield bar updates proportionally on each harvest action using stored reference — no visual stacking of Graphics objects

## Task Commits

Each task was committed atomically:

1. **Task 1: Store maxYield, elevationOffset, and yieldBar reference on container at spawn** - `d8a069b` (feat)
2. **Task 2: Add fade-in animation to spawnEntity** - `1d43a2e` (feat)
3. **Task 3: Add yield bar update in updateEntity using direct reference** - `7bdc89e` (feat)

## Files Created/Modified
- `apps/web/src/game/rendering/EntityRenderer.ts` - Added setData('maxYield'), setData('yieldBar'), and setData('elevationOffset') calls in createEntityContainer() for mineral, plant, and all entity containers respectively
- `apps/web/src/game/scenes/WorldScene.ts` - Added fade-in tween in spawnEntity() gated by !zoneId; added yield bar update block in updateEntity() using getData('yieldBar') direct reference

## Decisions Made
- `container.setData('yieldBar')` stores Graphics reference directly rather than searching container.list by Y position — avoids fragile Y-position instanceof matching that could fail due to floating-point precision
- zoneId presence on spawnEntity() call distinguishes zone:state (initial load, no fade) from entity:spawn (runtime respawn, 400ms fade) — convention already existed in calling code
- `this.elevationOffset` (the 12px hover constant) stored as 'elevationOffset' data key — yield bar Y is `-(hover) - 24`, not affected by tile elevation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UIHD-02 (entity spawn fade-in) and UIHD-03 (proportional yield bar depletion) requirements satisfied
- Phase 38 visual polish complete — v1.8 milestone implementation done
- Future yield bar extensions can rely on getData('yieldBar') pattern established here

---
*Phase: 38-perception-gating-and-client-polish*
*Completed: 2026-02-18*
