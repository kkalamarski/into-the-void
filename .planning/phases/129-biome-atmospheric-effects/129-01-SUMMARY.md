---
phase: 129-biome-atmospheric-effects
plan: 01
subsystem: ui
tags: [phaser, colormatrix, atmosphere, biome, day-night, postfx, tweens]

# Dependency graph
requires:
  - phase: 128-day-night-cycle
    provides: DayNightCycle class with camera postFX ColorMatrix, getCycleProgress(), applyVisuals()
provides:
  - AtmosphereSystem class with 16-biome config table and 6 effect types
  - Cooperative ColorMatrix sharing between DayNightCycle and AtmosphereSystem
  - Walk (3000ms) and teleport (750ms) biome atmosphere transitions
  - Per-effect-type day/night modulation (fog/glow/haze/murk/shimmer/clear)
  - setAtmosphereSystem() hook on DayNightCycle for WorldScene wiring
affects: [129-02-PLAN, WorldScene, biome-transitions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cooperative ColorMatrix: two systems share one postFX matrix by additive getData() mutations
    - Atmosphere effect strategy: 6 effect types dispatched via switch in getModulatedParams()
    - Tween-driven cross-fade with alphaProxy object (Phaser tweens cannot target class fields directly)

key-files:
  created:
    - apps/web/src/game/systems/AtmosphereSystem.ts
  modified:
    - apps/web/src/game/systems/DayNightCycle.ts

key-decisions:
  - "Cooperative ColorMatrix: AtmosphereSystem additively writes getData() after DayNightCycle's reset+write cycle — no separate postFX stage"
  - "import type used for AtmosphereSystem in DayNightCycle to prevent circular dependency"
  - "alphaProxy object pattern used for tween targets since Phaser tweens require object property references"
  - "Rapid crossing: always cancel transitionTween before starting new one — no queuing per CONTEXT.md"

patterns-established:
  - "ColorMatrix cooperative write: call getData(), add offsets directly to Float32Array indices m[4]/m[9]/m[14] for channel offsets, m[0]/m[6]/m[12] for brightness diagonal"
  - "Effect strategy pattern: switch on effectType in getModulatedParams() — add new effects by adding case"

requirements-completed: [ATMO-01, ATMO-02, ATMO-04]

# Metrics
duration: 4min
completed: 2026-03-17
---

# Phase 129 Plan 01: Biome Atmospheric Effects — Core System Summary

**AtmosphereSystem with 16-biome ATMOSPHERE_CONFIGS, 6 effect types (fog/glow/haze/murk/shimmer/clear), cooperative ColorMatrix sharing with DayNightCycle, and per-effect day/night modulation**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-17T14:16:23Z
- **Completed:** 2026-03-17T14:19:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created AtmosphereSystem (447 lines) with complete ATMOSPHERE_CONFIGS table covering all 16 BiomeType values mapped to 6 effect types per CONTEXT.md
- Walk cross-fade (3000ms Sine.easeInOut) and teleport fade-in (750ms Sine.easeOut) transitions with rapid-crossing cancel support
- Modified DayNightCycle to call `atmosphereSystem.applyToMatrix()` as the last step of `applyVisuals()` — atmospheric color offsets stack additively on top of day/night writes
- Per-effect-type day/night modulation: fog thickens at night, glow brightens at night, haze peaks at noon, murk darkens at night, shimmer shifts hue at dusk/dawn, clear is unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AtmosphereSystem** - `2a9682f` (feat)
2. **Task 2: Integrate AtmosphereSystem into DayNightCycle** - `9238c3a` (feat)

## Files Created/Modified
- `apps/web/src/game/systems/AtmosphereSystem.ts` - New file: AtmosphereSystem class, ATMOSPHERE_CONFIGS for all 16 biomes, 6 effect types, setBiome(), applyToMatrix(), destroy()
- `apps/web/src/game/systems/DayNightCycle.ts` - Modified: added atmosphereSystem field, setAtmosphereSystem() setter, applyToMatrix() call at end of applyVisuals(), atmosphereSystem null in destroy()

## Decisions Made
- Used `import type { AtmosphereSystem }` in DayNightCycle to avoid circular dependency issues between the two systems
- Used `alphaProxy: { value: number }` object pattern because Phaser tweens target object properties, not standalone variables
- Atmosphere writes are additive to getData() array — never calls reset() — so DayNightCycle's reset+write cycle runs first each frame, then atmosphere adds on top

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compiled cleanly on first attempt for both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- AtmosphereSystem and DayNightCycle integration complete — ready for Plan 02 (visual verification and tuning)
- Plan 02 will wire AtmosphereSystem into WorldScene and trigger setBiome() on zone transitions
- Color offset values in ATMOSPHERE_CONFIGS are starting estimates; Plan 02 verification will tune them
