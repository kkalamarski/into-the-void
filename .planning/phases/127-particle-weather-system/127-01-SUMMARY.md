---
phase: 127-particle-weather-system
plan: 01
subsystem: rendering
tags: [phaser, particles, weather, biomes, procedural]

requires:
  - phase: 126-procedural-terrain-cubes
    provides: Procedural tile textures and PreloadScene generateTexture pattern
provides:
  - WeatherSystem class with viewport-fixed biome particle emitters
  - weather-pixel texture in PreloadScene
affects: [127-02, 128-day-night-cycle, 129-biome-atmospheric-effects]

tech-stack:
  added: []
  patterns:
    - "Strategy pattern for weather types (rain/snow/ash/spores/mist/void_energy)"
    - "Deterministic seed-based intensity cycling via time-window hash"
    - "Crossfade transition pattern with outgoing/active emitter management"

key-files:
  created:
    - apps/web/src/game/systems/WeatherSystem.ts
  modified:
    - apps/web/src/game/scenes/PreloadScene.ts

key-decisions:
  - "4x4 white base pixel tinted at emitter level (not per-particle) for simplicity"
  - "Intensity cycling uses 5-minute time windows for deterministic sync across players"
  - "Tier-based quantity scaling: Tier I 1/2/4, Tier II 2/4/8, Tier III 3/6/12, Tier IV 4/8/16"

patterns-established:
  - "WeatherSystem as standalone class with setBiome()/destroy() lifecycle"
  - "Viewport-fixed particles via setScrollFactor(0) at depth 9500"

requirements-completed: [WTHR-01, WTHR-02, WTHR-04]

duration: 5min
completed: 2026-03-17
---

# Phase 127 Plan 01: WeatherSystem Core + Weather Pixel Texture Summary

**Viewport-fixed particle weather engine with 6 weather types across all 16 biomes, deterministic intensity cycling, and crossfade transitions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-17
- **Completed:** 2026-03-17
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created WeatherSystem class (436 lines) with full biome-to-weather mapping for all 16 biomes
- Implemented 6 weather types (rain, snow, ash, spores, mist, void_energy) with per-type particle behavior
- Built deterministic intensity cycling that syncs across players without network traffic
- Baked weather-pixel texture in PreloadScene following existing generateTexture pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Bake weather-pixel texture in PreloadScene** - `2f4578d` (feat)
2. **Task 2: Create WeatherSystem class with biome configs** - `4416ecf` (feat)

## Files Created/Modified
- `apps/web/src/game/systems/WeatherSystem.ts` - Complete weather particle system with biome configs, crossfade transitions, intensity cycling
- `apps/web/src/game/scenes/PreloadScene.ts` - Added weather-pixel 4x4 white texture generation

## Decisions Made
- Used white base pixel with emitter-level tinting for simplicity (no per-particle color variation needed)
- Intensity cycling uses 5-minute time windows hashed with biome name for deterministic sync
- Tier-based quantity scaling matches research table exactly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- WeatherSystem is ready for WorldScene integration (Plan 127-02)
- setBiome(biome, instant) API matches the integration points documented in Plan 02

---
*Phase: 127-particle-weather-system*
*Completed: 2026-03-17*
