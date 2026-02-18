---
phase: 37-fertility-noise-biome-spawn
plan: 03
subsystem: ui
tags: [hud, zone-state, fertility, biome, world-gen, shared-types]

# Dependency graph
requires:
  - phase: 37-01
    provides: FertilityType type and BiomeGenerator.getFertilityAt() implementation
provides:
  - fertilityType field on ZoneState interface (shared-types)
  - getZoneState() computes and returns fertilityType via BiomeGenerator
  - HUD biome indicator shows "Biome Name (Fertility)" format
affects:
  - Any consumer of ZoneState must now supply fertilityType
  - Any future HUD work referencing biome display

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - packages/shared-types/src/core/zone.ts
    - apps/game-server/src/game/game.service.ts
    - apps/web/src/ui/hud/HUD.tsx

key-decisions:
  - "BiomeGenerator instantiated per getZoneState() call (not cached) — acceptable since getZoneState is called once per zone transition, not per frame"
  - "Fertility displayed inline without separate hysteresis — fertility boundaries change less frequently than biome boundaries, so existing biome hysteresis gate is sufficient"
  - "zoneState.fertilityType read directly (not via displayedBiome gate) — fertility uses optional chaining so missing data degrades gracefully with no parentheses shown"

patterns-established:
  - "ZoneState enrichment pattern: parse zone coords from zoneId, compute derived values (biome, fertilityType), return enriched object"

# Metrics
duration: 5min
completed: 2026-02-18
---

# Phase 37 Plan 03: Fertility HUD Display Summary

**ZoneState.fertilityType field wired end-to-end: shared-types interface → game-server BiomeGenerator computation → HUD "Crystal Flats (Lush)" display format**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T21:14:32Z
- **Completed:** 2026-02-18T21:19:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added required `fertilityType: FertilityType` field to ZoneState interface in shared-types
- GameService.getZoneState() now computes fertility at chunk center via BiomeGenerator.getFertilityAt()
- HUD biome indicator updated to show "Biome Name (Fertility)" format (e.g., "Crystal Flats (Lush)")

## Task Commits

Each task was committed atomically:

1. **Task 1: Add fertilityType to ZoneState interface** - `7a407d1` (feat)
2. **Task 2: Compute fertilityType in GameService.getZoneState()** - `223608c` (feat)
3. **Task 3: Display fertility in HUD biome indicator** - `e04d93e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/shared-types/src/core/zone.ts` - Added `fertilityType: FertilityType` required field to ZoneState interface with JSDoc
- `apps/game-server/src/game/game.service.ts` - Imported BiomeGenerator, compute fertilityType at zone chunk center in getZoneState()
- `apps/web/src/ui/hud/HUD.tsx` - Updated biome indicator to append `(fertilityType)` after biome name

## Decisions Made
- BiomeGenerator instantiated per getZoneState() call rather than cached — acceptable performance since zone transitions are infrequent, not per-frame events
- Fertility displayed inline without separate hysteresis — biome hysteresis gates already handle the transition cadence; fertility changes are gradual and won't flicker at biome boundaries
- Direct optional chaining `zoneState?.fertilityType` — gracefully degrades to no parentheses if field absent (backward compat during rolling deploys)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. The intermediate build failure after Task 1 (game-server reporting missing fertilityType) was expected and intentional — TypeScript correctly enforced the new required field before Task 2 provided it.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 37-03 complete — fertility display chain fully wired
- ZoneState.fertilityType is a required field; all callers that construct ZoneState must supply it
- Phase 37 complete: FertilityType + getFertilityAt (37-01), spawn density modulation (37-02), HUD display (37-03)

---
*Phase: 37-fertility-noise-biome-spawn*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: packages/shared-types/src/core/zone.ts
- FOUND: apps/game-server/src/game/game.service.ts
- FOUND: apps/web/src/ui/hud/HUD.tsx
- FOUND: .planning/phases/37-fertility-noise-biome-spawn/37-03-SUMMARY.md
- COMMIT 7a407d1: feat(37-03): add fertilityType field to ZoneState interface
- COMMIT 223608c: feat(37-03): compute fertilityType in GameService.getZoneState()
- COMMIT e04d93e: feat(37-03): display fertility tier in HUD biome indicator
