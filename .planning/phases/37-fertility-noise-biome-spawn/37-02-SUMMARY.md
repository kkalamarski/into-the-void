---
phase: 37-fertility-noise-biome-spawn
plan: 02
subsystem: world-gen
tags: [spawn, fertility, biome, noise, density, world-gen]

# Dependency graph
requires:
  - phase: 37-01
    provides: FertilityType type + BiomeGenerator.getFertilityAt() + BiomeGenerator passed to generateSpawnPoints

provides:
  - FERTILITY_MULTIPLIERS constant mapping FertilityType to density scale factors (0.5/1.0/1.5)
  - SPAWN_CAPS constant with hard limits per entity category (creatures/minerals/plants/artifacts)
  - Fertility-modulated spawn density using chunk-center getFertilityAt sampling
  - Per-tile biome sampling via getBiome(worldX, worldY) for correct spawn table selection at biome edges

affects:
  - 37-03
  - game-server (ZonesService, generateSpawnPoints callers)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Split density decision (chunk-center fertility) from spawn table decision (per-tile biome) — SPWN-03"
    - "Math.min(rawCount, cap) pattern for hard density limits"
    - "Record<FertilityType, number> lookup for multiplier application"

key-files:
  created: []
  modified:
    - packages/world-gen/src/generation/spawn.ts

key-decisions:
  - "Density decision uses chunk-center fertility; spawn table uses per-tile biome — intentional split per SPWN-03 and research pitfall 4"
  - "Plants and artifacts omitted from cap enforcement for now — forward-compatibility stubs noted in code comment for Phase 38"

patterns-established:
  - "Fertility multiplier applied before randomization: rawCount = density * multiplier * (0.5 + random.next())"
  - "Cap enforced after multiplier: count = Math.min(raw, cap)"

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 37 Plan 02: Spawn Density Modulation Summary

**Fertility-modulated spawn density with per-tile biome table selection: Lush areas spawn 3x more entities than Barren; biome-edge tiles use their own spawn tables via per-tile getBiome() sampling**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-18T21:14:36Z
- **Completed:** 2026-02-18T21:22:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added `FERTILITY_MULTIPLIERS` (Barren=0.5, Normal=1.0, Lush=1.5) creating 3x density difference between extremes
- Added `SPAWN_CAPS` (creatures=15, minerals=10, plants=5, artifacts=2) preventing overcrowding regardless of fertility
- Implemented fertility sampling at chunk center and multiplier application to creature and mineral density
- Implemented per-tile biome sampling in spawn loops so biome-edge entities come from their tile's actual spawn table

## Task Commits

Each task was committed atomically:

1. **Tasks 1 + 2: Fertility multiplier, density caps, and per-tile biome sampling** - `a307555` (feat)

**Plan metadata:** (docs commit below)

_Note: Tasks 1 and 2 both modify the same function body in spawn.ts and were implemented as a single coherent edit. Combined into one commit per atomic unit principle._

## Files Created/Modified

- `packages/world-gen/src/generation/spawn.ts` - Added FERTILITY_MULTIPLIERS + SPAWN_CAPS constants; fertility sampling at chunk center with multiplier; per-tile getBiome() in creature/mineral spawn loops

## Decisions Made

- Density decision uses chunk-center fertility; spawn table uses per-tile biome — intentional split per SPWN-03 and research pitfall 4 (chunk-center biome for count ensures stable density across a chunk; per-tile biome for table ensures correct species at edge tiles)
- Plants and artifacts not yet in scope for spawn caps enforcement — forward-compatibility stubs noted; will activate in Phase 38

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation passed on first attempt. Pre-existing NX lockfile warnings (unrelated to this plan) are present in the build output but do not affect compilation or runtime.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Fertility-modulated spawn system complete, ready for Plan 37-03 (integration testing or spawn quality verification)
- `generateSpawnPoints` now correctly produces variable density based on fertility noise and correct biome entities at edges
- All success criteria from plan met: FERTILITY_MULTIPLIERS, SPAWN_CAPS, chunk-center fertility sampling, per-tile getBiome, Math.min caps

---
*Phase: 37-fertility-noise-biome-spawn*
*Completed: 2026-02-18*
