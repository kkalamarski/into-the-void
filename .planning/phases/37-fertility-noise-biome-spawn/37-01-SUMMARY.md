---
phase: 37-fertility-noise-biome-spawn
plan: 01
subsystem: world-gen
tags: [simplex-noise, fertility, biome, spawn, world-gen, shared-types]

# Dependency graph
requires:
  - phase: 36-ai-behavior-tick
    provides: stable AI system; world-gen is consumed but not modified by AI
  - phase: 33-entity-types-registry
    provides: BiomeType definition that fertility noise layers onto

provides:
  - FertilityType union type ('Barren' | 'Normal' | 'Lush') in shared-types/core/zone.ts
  - BiomeGenerator.getFertilityAt(worldX, worldY) returns FertilityType using 4th seeded SimplexNoise layer
  - generateSpawnPoints accepts BiomeGenerator instead of BiomeType (prepared for Plan 37-02 density modulation)
affects: [37-02-spawn-density-modulation, future-zone-rendering, minimap]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "4th SimplexNoise layer pattern: independent seeded noise for each world property (temp, moisture, elevation, fertility)"
    - "BiomeGenerator passed into spawn system — enables per-tile sampling in future plans without signature changes"

key-files:
  created: []
  modified:
    - packages/shared-types/src/core/zone.ts
    - packages/world-gen/src/generation/biome.ts
    - packages/world-gen/src/generation/spawn.ts
    - packages/world-gen/src/generation/chunk.ts

key-decisions:
  - "FERTILITY_SCALE = 0.0012 as private readonly class property (between temperatureScale 0.001 and moistureScale 0.0015)"
  - "3 octaves for fertility fbm — more variation than elevation (6 octaves) prevents tiny patches"
  - "Thresholds: Barren <0.33, Normal 0.33-0.66, Lush >=0.66 — equal thirds for balanced distribution"
  - "BiomeGenerator passed to generateSpawnPoints instead of BiomeType — enables Plan 37-02 to call getFertilityAt per spawn point without another signature change"
  - "biome still derived from getChunkBiome() inside generateSpawnPoints — spawn behavior unchanged from pre-plan state"

patterns-established:
  - "Fertility as static noise layer: seeded deterministically at world-gen time, reproducible per seed"
  - "Unused centerX/centerY removed from spawn.ts (not needed since getChunkBiome computes center internally)"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 37 Plan 01: Fertility Noise and BiomeGenerator Signature Summary

**FertilityType union type added to shared-types and BiomeGenerator gains a 4th SimplexNoise layer (getFertilityAt) with generateSpawnPoints refactored to accept BiomeGenerator instead of BiomeType**

## Performance

- **Duration:** 3 min 4s
- **Started:** 2026-02-18T08:28:51Z
- **Completed:** 2026-02-18T08:31:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `FertilityType = 'Barren' | 'Normal' | 'Lush'` to shared-types, automatically exported via existing `export * from './core/zone'`
- Added `fertilityNoise: SimplexNoise` as 4th private noise layer in BiomeGenerator using seed `${worldSeed}_fertility`
- `getFertilityAt(worldX, worldY)` uses 3-octave fbm normalized to [0,1] with equal-thirds thresholds
- `generateSpawnPoints` signature changed from `biome: BiomeType` to `biomeGenerator: BiomeGenerator`; biome still derived from chunk center for identical spawn behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Add FertilityType and getFertilityAt to BiomeGenerator** - `de2b73c` (feat)
2. **Task 2: Update generateSpawnPoints signature to accept BiomeGenerator** - `863f61a` (feat)

## Files Created/Modified
- `packages/shared-types/src/core/zone.ts` - Added `FertilityType` union type export
- `packages/world-gen/src/generation/biome.ts` - Added `fertilityNoise`, `FERTILITY_SCALE`, and `getFertilityAt()` method
- `packages/world-gen/src/generation/spawn.ts` - Imported `BiomeGenerator`, updated signature, derive biome via `biomeGenerator.getChunkBiome()`
- `packages/world-gen/src/generation/chunk.ts` - Pass `this.biomeGenerator` to `generateSpawnPoints` instead of `biome`

## Decisions Made
- FERTILITY_SCALE = 0.0012 sits between temperatureScale (0.001) and moistureScale (0.0015) for medium-scale fertility blobs
- 3 octaves for fertility fbm — balances variation against tiny-patch noise artifacts
- Equal-thirds thresholds (0.33/0.66) for roughly balanced Barren/Normal/Lush distribution across the world
- BiomeGenerator passed into spawn function now so Plan 37-02 can add `getFertilityAt` calls without another signature change
- Removed unused centerX/centerY locals from spawn.ts (getChunkBiome already computes chunk center internally)

## Deviations from Plan

None - plan executed exactly as written. Minor cleanup: removed redundant centerX/centerY variables that plan spec included but were unnecessary since `getChunkBiome` already computes the center point internally.

## Issues Encountered
- `pnpm test` reports pre-existing failures for world-gen, game-server, api, and items due to missing vitest config ("Unable to load test config from config file undefined") — these failures predate this plan and are unrelated to our changes. Build succeeds across all 10 projects.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `FertilityType` is importable from `@into-the-void/shared-types` — Plan 37-02 can use it immediately
- `BiomeGenerator.getFertilityAt()` is callable — Plan 37-02 can call it per spawn point to apply density multipliers
- `generateSpawnPoints` already accepts `BiomeGenerator` — Plan 37-02 only needs to add fertility multiplier logic inside the function body

---
*Phase: 37-fertility-noise-biome-spawn*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: packages/shared-types/src/core/zone.ts
- FOUND: packages/world-gen/src/generation/biome.ts
- FOUND: packages/world-gen/src/generation/spawn.ts
- FOUND: packages/world-gen/src/generation/chunk.ts
- FOUND: .planning/phases/37-fertility-noise-biome-spawn/37-01-SUMMARY.md
- FOUND commit: de2b73c (feat(37-01): add FertilityType and getFertilityAt to BiomeGenerator)
- FOUND commit: 863f61a (feat(37-01): update generateSpawnPoints signature to accept BiomeGenerator)
