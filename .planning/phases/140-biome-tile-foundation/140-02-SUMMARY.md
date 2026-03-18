---
phase: 140-biome-tile-foundation
plan: 02
subsystem: tiles
tags: [tiles, tile-definition, tile-registry, hub-stations]

requires:
  - phase: none
    provides: none (parallel with Plan 01)
provides:
  - "32 TileDefinition objects (8 per hub) with faction-correct palettes"
  - "TILE_IDS constants for all 32 hub tiles"
  - "ALL_TILES includes all hub tile definitions for TileRegistry auto-registration"
affects: [140-03, 141, 142]

tech-stack:
  added: []
  patterns: ["Hub tile naming: {HUB}_{TYPE} exports, {hub}_{type} string IDs"]

key-files:
  created:
    - "packages/tiles/src/definitions/hub-canopy-tiles.ts"
    - "packages/tiles/src/definitions/hub-ironhold-tiles.ts"
    - "packages/tiles/src/definitions/hub-meridian-tiles.ts"
    - "packages/tiles/src/definitions/hub-salvage-tiles.ts"
  modified:
    - "packages/tiles/src/definitions/index.ts"

key-decisions:
  - "8 tile types per hub: floor, wall, door, corridor, decoration, accent, window, hazard"
  - "Hazard tiles have onStep hooks: damage for Canopy/Ironhold/Salvage, slow for Meridian"
  - "Accent floors have 0.9 speed modifier, hazard floors have 0.7"

patterns-established:
  - "Hub tile file pattern: hub-{name}-tiles.ts exports 8 constants + ALL_{HUB}_TILES array"
  - "Hub tile hooks: inline arrow functions returning TileEffect"

requirements-completed: [TILE-01, TILE-02, TILE-03, TILE-04, TILE-05, TILE-06, TILE-07, TILE-08]

duration: 6min
completed: 2026-03-18
---

# Plan 140-02: Define 32 Hub Tile Types Summary

**32 hub tile definitions created across 4 faction files with faction palettes, blocking properties, speed modifiers, and hazard hooks — registered in TileRegistry**

## Performance

- **Duration:** 6 min
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created 4 hub tile definition files with 8 TileDefinition exports each
- Canopy: bioluminescent green/blue, spore vent hazard (2 damage)
- Ironhold: industrial gray/rust/orange, steam vent hazard (3 damage)
- Meridian: corporate silver/white/blue, data stream hazard (slow effect)
- Salvage: patchwork/mixed, exposed wiring hazard (2 damage)
- All 32 tiles registered in ALL_TILES and TILE_IDS

## Task Commits

1. **Task 1: Create hub tile definition files** - `996dfb5` (feat)
2. **Task 2: Register hub tiles in index** - `691728e` (feat)

## Files Created/Modified
- `packages/tiles/src/definitions/hub-canopy-tiles.ts` - 8 Canopy Station tile definitions
- `packages/tiles/src/definitions/hub-ironhold-tiles.ts` - 8 Ironhold Station tile definitions
- `packages/tiles/src/definitions/hub-meridian-tiles.ts` - 8 Meridian Station tile definitions
- `packages/tiles/src/definitions/hub-salvage-tiles.ts` - 8 Salvage Station tile definitions
- `packages/tiles/src/definitions/index.ts` - Imports, ALL_TILES, TILE_IDS, re-exports

## Decisions Made
None - followed plan as specified

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 32 hub tile definitions exist and are registered in TileRegistry
- Plan 03 can wire biome-to-tile-set mappings using TILE_IDS constants
- Phase 141 can implement procedural rendering for these tile types

---
*Phase: 140-biome-tile-foundation*
*Completed: 2026-03-18*
