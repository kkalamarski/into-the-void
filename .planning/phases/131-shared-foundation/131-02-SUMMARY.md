---
phase: 131-shared-foundation
plan: 02
subsystem: game-logic
tags: [vitest, pixel-movement, shared-types, distance-calculation, range-constants]

# Dependency graph
requires:
  - phase: 131-01
    provides: TILE_SIZE_PX=128 constant and pixel-validation module
provides:
  - PixelPosition {px, py, zoneId} interface in shared-types
  - pixelDistanceTo Euclidean distance function
  - tileToPixelCenter tile-to-pixel conversion (center convention)
  - pixelToTile pixel-to-tile conversion (floor integer)
  - MELEE_RANGE_PX=64, GATHER_RANGE_PX=192, NPC_INTERACT_RANGE_PX=192 range constants
  - AGGRO_RADIUS_PX=512, LEASH_RADIUS_PX=1024 creature AI range constants
  - pixel-validation and pixel-distance re-exported from @into-the-void/game-logic barrel
affects: [132-client-movement, 133-pixel-distance, 134-server-validation, 135-creature-movement]

# Tech tracking
tech-stack:
  added: []
  patterns: [Range constants as TILE_SIZE_PX multiples for auto-scaling, (tileIndex + 0.5) * TILE_SIZE_PX tile center convention]

key-files:
  created:
    - packages/game-logic/src/movement/pixel-distance.ts
    - packages/game-logic/src/movement/pixel-distance.test.ts
  modified:
    - packages/shared-types/src/core/position.ts
    - packages/game-logic/src/index.ts

key-decisions:
  - "PixelPosition uses px/py (not x/y) to prevent type confusion with existing tile-based Position interface"
  - "tileToPixelCenter uses (tileX + 0.5) * TILE_SIZE_PX convention — tile (0,0) center at (64,64)"
  - "Range constants defined as TILE_SIZE_PX multiples so they auto-scale if tile size changes"
  - "NPC_INTERACT_RANGE_PX = GATHER_RANGE_PX (192px) — consistent 'close enough' across interaction types"
  - "AGGRO_RADIUS_PX=4 tiles (512px), LEASH_RADIUS_PX=8 tiles (1024px) — gives creatures 2x leash vs aggro radius"

patterns-established:
  - "px/py naming convention distinguishes pixel coords from tile-based x/y coords throughout codebase"
  - "All range checks use exported constants, never magic numbers — downstream phases import from @into-the-void/game-logic"

requirements-completed: [MOVE-02]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 131 Plan 02: Shared Foundation Summary

**PixelPosition interface in shared-types plus pixel-distance module with range constants (MELEE/GATHER/AGGRO/LEASH) as TILE_SIZE_PX multiples — 27 tests passing, full barrel export wired, TypeScript build green**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-17T22:01:36Z
- **Completed:** 2026-03-17T22:04:XX Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added PixelPosition {px, py, zoneId} interface to shared-types without breaking any existing types
- Created pixel-distance.ts with pixelDistanceTo, tileToPixelCenter, pixelToTile, and 5 range constants all defined as TILE_SIZE_PX multiples
- 27 vitest unit tests covering all exports including roundtrips and range constant value checks
- Wired pixel-validation and pixel-distance into game-logic barrel index — both importable from @into-the-void/game-logic
- TypeScript builds for both shared-types and game-logic pass with zero errors
- All 193 game-logic tests pass (no regressions from barrel export additions)
- Verified no unintended integer coercion of px/py — only Math.floor inside pixelToTile (intentional)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PixelPosition interface and create pixel-distance module with tests** - `2f7bb71` (feat)
2. **Task 2: Wire barrel exports and verify full TypeScript build** - `16a6023` (feat)

## Files Created/Modified
- `packages/shared-types/src/core/position.ts` - Added PixelPosition interface (px, py, zoneId) after ZoneCoords
- `packages/game-logic/src/movement/pixel-distance.ts` - Range constants and conversion functions, imports TILE_SIZE_PX from pixel-validation
- `packages/game-logic/src/movement/pixel-distance.test.ts` - 27 unit tests covering pixelDistanceTo, tileToPixelCenter, pixelToTile, range constants, and roundtrips
- `packages/game-logic/src/index.ts` - Added barrel exports for pixel-validation and pixel-distance

## Decisions Made
- PixelPosition uses `px`/`py` field names instead of `x`/`y` to prevent accidental confusion with the existing tile-based `Position` interface — avoids silent type mismatches at compile time
- tileToPixelCenter returns tile center `(index + 0.5) * TILE_SIZE_PX` — tile (0,0) has center at (64,64), matching RESEARCH.md Open Question #1 recommendation
- Range constants expressed as `N * TILE_SIZE_PX` (not hardcoded px values) — if TILE_SIZE_PX ever changes, all ranges auto-scale proportionally
- NPC_INTERACT_RANGE_PX is aliased to GATHER_RANGE_PX (same 192px value) — consistent interaction distance across gathering and dialogue

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all steps executed cleanly on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PixelPosition is importable from @into-the-void/shared-types
- pixelDistanceTo, tileToPixelCenter, pixelToTile, and all range constants importable from @into-the-void/game-logic
- pixel-validation module also now properly barrel-exported
- All 193 existing tests still pass — foundation is stable
- Downstream phases 132-135 can import all shared foundation exports without further work
- STATE.md blocker "integer coercion of px/py floats" verified as NOT present in new code

---
*Phase: 131-shared-foundation*
*Completed: 2026-03-17*
