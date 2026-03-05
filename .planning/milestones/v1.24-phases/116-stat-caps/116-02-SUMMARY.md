---
phase: 116-stat-caps
plan: 02
subsystem: shared-types, game-server
tags: [stats, websocket, payload, diminishing-returns]

requires:
  - phase: 116-01
    provides: computeCharStats with skipDR option
provides:
  - CharStatsPayload.raw field with uncapped stat totals
  - Server emitStats computing and sending both raw and effective stats
  - Equipment delta computed from raw values (uncapped)
affects: [116-03, stats-display, item-tooltips]

tech-stack:
  added: []
  patterns: [dual computation for raw/effective in stat emit]

key-files:
  created: []
  modified:
    - packages/shared-types/src/game/stats.ts
    - apps/game-server/src/game/game.gateway.ts

key-decisions:
  - "Equipment delta computed from raw - base (not total - base) to avoid DR distortion"
  - "raw field is required in CharStatsPayload (not optional) since server always provides it"

patterns-established:
  - "Dual stat computation: total (DR-capped) for gameplay, raw (uncapped) for display"

requirements-completed: [CAPS-03]

duration: 8min
completed: 2026-03-03
---

# Plan 02: CharStatsPayload + Server emitStats Summary

**Extended CharStatsPayload with raw (uncapped) stats and updated server emitStats for dual computation**

## Performance

- **Duration:** 8 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added raw: CharacterStats field to CharStatsPayload interface
- Updated emitStats to compute both DR-capped (total) and uncapped (raw) stats
- Equipment delta now derived from raw values for accurate breakdown display
- TypeScript compilation verified for both shared-types and game-server

## Task Commits

1. **Task 1: Extend CharStatsPayload** - `80ec857` (feat: add raw field)
2. **Task 2: Update emitStats** - `80ec857` (feat: compute and emit raw stats)

## Files Created/Modified
- `packages/shared-types/src/game/stats.ts` - Added raw: CharacterStats to CharStatsPayload, updated JSDoc
- `apps/game-server/src/game/game.gateway.ts` - emitStats computes raw via skipDR: true, equipment delta from raw - base

## Decisions Made
- Used skipDR: true option (from Plan 01) rather than manual stat summation for raw computation
- Equipment delta = raw - base (not total - base) for accurate uncapped breakdown

## Deviations from Plan
None - plan executed as specified.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Client now receives raw stats in stats:update events
- CharStatsPayload.raw available for Plan 03's UI DR indicators

---
*Phase: 116-stat-caps, Plan: 02*
*Completed: 2026-03-03*
