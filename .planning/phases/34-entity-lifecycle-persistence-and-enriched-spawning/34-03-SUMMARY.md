---
phase: 34-entity-lifecycle-persistence-and-enriched-spawning
plan: 03
subsystem: ui
tags: [phaser, entity-renderer, health-bar, yield-bar, type-guards]

# Dependency graph
requires:
  - phase: 34-01
    provides: enriched entity types (Mineral.yield, Mineral.maxYield, Plant.yield, Plant.maxYield, Creature.speciesId)
  - phase: 33-01
    provides: Plant and Artifact EntityType variants with full interfaces in shared-types
provides:
  - EntityRenderer with always-visible health bars for creatures (INTR-08)
  - Yield bars for minerals and plants using same createHealthBar visual
  - Species/resource-specific texture lookup for enriched entities
  - isMineral and isPlant type guards alongside existing isCreature
affects: [phase-36-ai-tick, phase-38-per-species-sprites]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Type guard pattern extended to Mineral and Plant alongside Creature"
    - "createHealthBar() reused for yield bars — same visual, different semantic values"
    - "getEntityTexture() accepts Entity not EntityType — enables species-specific lookup"

key-files:
  created: []
  modified:
    - apps/web/src/game/rendering/EntityRenderer.ts

key-decisions:
  - "createHealthBar() reused for yield bars — no new visual component needed, parameter semantics (current/max) are identical"
  - "speciesId/resourceId textures returned even if Phaser texture is missing — Phaser handles missing texture gracefully; Phase 38 will add sprites"
  - "EntityType import removed — entity.type is typed via Entity interface, no need for explicit import"

patterns-established:
  - "Always-visible bars: remove conditional health < maxHealth; bars show full state at all times per INTR-08"
  - "Type-safe entity narrowing: private isX() type guards before accessing subtype-specific fields"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 34 Plan 03: EntityRenderer Always-Visible Health/Yield Bars Summary

**EntityRenderer updated with always-visible health bars for creatures and yield bars for minerals/plants, plus species-specific texture lookup for enriched entities**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-18T00:10:29Z
- **Completed:** 2026-02-18T00:11:44Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Creatures now always display health bar (INTR-08 requirement) — removed the `health < maxHealth` conditional
- Minerals display yield bar using `createHealthBar(entity.yield, entity.maxYield)` — same green/yellow/red visual
- Plants display yield bar using `createHealthBar(entity.yield, entity.maxYield)` — same visual pattern
- `getEntityTexture()` refactored to accept `Entity` — now tries `speciesId`/`resourceId` first, falls back to type string
- Added `isMineral()` and `isPlant()` private type guards alongside existing `isCreature()`

## Task Commits

Each task was committed atomically:

1. **Task 1: Update EntityRenderer for always-visible health/yield bars** - `958af19` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/web/src/game/rendering/EntityRenderer.ts` - Added Mineral/Plant imports, isMineral/isPlant type guards, always-visible health bars for creatures, yield bars for minerals and plants, refactored getEntityTexture() to accept Entity and try species-specific textures

## Decisions Made
- `createHealthBar()` reused for yield bars — parameter semantics (currentValue/maxValue) are identical, no new visual component needed
- Species-specific texture keys returned even when Phaser texture doesn't exist yet — Phaser handles missing textures gracefully; Phase 38 will add per-species sprites
- Removed `EntityType` import since it's only used implicitly through `entity.type` (typed via Entity interface)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EntityRenderer now displays health/yield bars for all entity types (creatures, minerals, plants)
- Species-specific texture resolution is in place, ready for Phase 38 sprite additions
- No blockers for subsequent phases

---
*Phase: 34-entity-lifecycle-persistence-and-enriched-spawning*
*Completed: 2026-02-18*
