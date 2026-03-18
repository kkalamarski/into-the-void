---
phase: 140-biome-tile-foundation
plan: 01
subsystem: world-gen
tags: [biome, shared-types, world-gen, typescript-records]

requires:
  - phase: none
    provides: none (first phase of v1.29)
provides:
  - "BiomeType union with 4 hub station literals (canopy_station, ironhold_station, meridian_station, salvage_station)"
  - "All Record<BiomeType, ...> maps across shared-types, world-gen, entities, and web updated with hub biome entries"
affects: [140-02, 140-03, 141, 142]

tech-stack:
  added: []
  patterns: ["Hub biomes use Tier 1 (safe zone), 0 danger, 0 density, neutral resistances"]

key-files:
  created: []
  modified:
    - "packages/shared-types/src/game/biome.ts"
    - "packages/world-gen/src/generation/biome.ts"
    - "packages/world-gen/src/generation/terrain.ts"
    - "packages/entities/src/biome-resistance-profiles.ts"
    - "packages/world-gen/src/generation/pois.ts"
    - "packages/world-gen/src/generation/spawn.ts"
    - "packages/world-gen/src/generation/structures.ts"
    - "apps/web/src/game/systems/WeatherSystem.ts"
    - "apps/web/src/game/systems/AtmosphereSystem.ts"

key-decisions:
  - "Hub biomes are safe zones: danger 0, no spawns, neutral resistances"
  - "Hub weather uses faction-themed indoor particles (spores for Canopy, mist for others)"
  - "Hub atmosphere uses faction-themed effects (glow for Canopy, haze for Ironhold/Salvage, clear for Meridian)"

patterns-established:
  - "Hub biome pattern: zero-density spawn configs for safe zones"
  - "Placeholder tile IDs in BIOME_TILES (numeric) since hubs use string-based JSON maps"

requirements-completed: [BIOME-01, BIOME-02, BIOME-03, BIOME-04]

duration: 8min
completed: 2026-03-18
---

# Plan 140-01: Register Hub Biome Types Summary

**Four hub station biome types (canopy/ironhold/meridian/salvage_station) registered in BiomeType union and all 11+ Record<BiomeType, ...> maps across 9 files**

## Performance

- **Duration:** 8 min
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Added 4 hub station biome type literals to BiomeType union in shared-types
- Updated all Record<BiomeType, ...> maps across shared-types, world-gen, entities, and web packages
- Hub biomes configured as safe zones (Tier 1, danger 0, no spawns, neutral resistances)

## Task Commits

1. **Task 1: Add hub biome types to shared-types** - `11a6cf8` (feat)
2. **Task 2: Add hub biome entries to all world-gen records** - `37eb37d` (feat)

## Files Created/Modified
- `packages/shared-types/src/game/biome.ts` - BiomeType union, display names, colors, tiers
- `packages/world-gen/src/generation/biome.ts` - Danger levels, minimap colors
- `packages/world-gen/src/generation/terrain.ts` - Tile maps, elevation ranges, wall thresholds
- `packages/entities/src/biome-resistance-profiles.ts` - Neutral resistance profiles
- `packages/world-gen/src/generation/pois.ts` - Zero POI weights
- `packages/world-gen/src/generation/spawn.ts` - Zero-density spawn configs
- `packages/world-gen/src/generation/structures.ts` - Feature tile IDs
- `apps/web/src/game/systems/WeatherSystem.ts` - Indoor weather configs
- `apps/web/src/game/systems/AtmosphereSystem.ts` - Indoor atmosphere configs

## Decisions Made
- Hub biomes use Tier 1, danger level 0, zero spawn density (safe zones)
- Placeholder void tiles in numeric BIOME_TILES (hubs use string-based BIOME_TILE_IDS)
- Indoor weather/atmosphere configs themed per faction

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Additional Record<BiomeType, ...> maps needed updates**
- **Found during:** Task 2 (Build verification)
- **Issue:** Plan only listed biome.ts and terrain.ts in world-gen, but 6 more files have Record<BiomeType, ...> that need exhaustive keys
- **Fix:** Added hub biome entries to entities/biome-resistance-profiles.ts, pois.ts, spawn.ts, structures.ts, WeatherSystem.ts, AtmosphereSystem.ts
- **Verification:** `npx nx run-many --target=build --projects=shared-types,tiles,entities,world-gen` succeeds
- **Committed in:** 37eb37d

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for TypeScript compilation. All Record<BiomeType, ...> must be exhaustive.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 hub biome types exist and compile across entire codebase
- Plan 02 can define tile definitions; Plan 03 can wire biomes to tile sets

---
*Phase: 140-biome-tile-foundation*
*Completed: 2026-03-18*
