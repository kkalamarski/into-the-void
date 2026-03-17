---
phase: 131-shared-foundation
plan: 01
subsystem: game-logic
tags: [vitest, tdd, pixel-movement, movement-validation, game-logic]

# Dependency graph
requires: []
provides:
  - TILE_SIZE_PX=128 constant (1 grid tile = 128 logical pixels)
  - PLAYER_SPEED_PX=128 px/s constant (crosses 1 tile per second)
  - DIAGONAL_NORMALIZATION=1/sqrt(2) for MOVE-02 compliance
  - PLAYER_HITBOX={width:64,height:64} AABB anchored at feet
  - KeyState interface for input abstraction
  - velocityFromKeys pure function with diagonal normalization and dt scaling
  - resolvePixelCollision pure function with X/Y wall sliding passes
  - validatePixelSpeed pure function for server-side anti-cheat (10% jitter tolerance)
affects: [132-client-movement, 133-pixel-distance, 134-server-validation, 135-creature-movement]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD red-green-refactor, pure functions with no side effects, AABB collision with wall sliding]

key-files:
  created:
    - packages/game-logic/src/movement/pixel-validation.ts
    - packages/game-logic/src/movement/pixel-validation.test.ts
  modified: []

key-decisions:
  - "TILE_SIZE_PX=128 matches ISO_TILE_WIDTH/2 = tileWidthHalf from IsometricTransform"
  - "PLAYER_SPEED_PX=TILE_SIZE_PX so player crosses 1 tile in 1.0s (deliberate survival MMO pace)"
  - "PLAYER_HITBOX 0.5*TILE_SIZE_PX square, anchored at feet (bottom-center of sprite)"
  - "Wall sliding via separate X/Y collision passes — player slides along walls, not dead-stops"
  - "10% jitter tolerance in validatePixelSpeed to handle network latency without enabling cheating"
  - "vitest globals (describe/it/expect) work only when running from within the package directory, not from project root"

patterns-established:
  - "Pixel movement pure functions: no class instances, no browser APIs, no side effects"
  - "AABB collision: 4-corner check with -1 on right/bottom edges to prevent tile boundary bleed"
  - "Run vitest from package directory (packages/game-logic) not project root for globals support"

requirements-completed: [MOVE-02]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 131 Plan 01: Shared Foundation Summary

**Pixel movement foundation module with diagonal normalization (1/sqrt(2)), AABB wall-sliding collision, and server-side speed validation — 30 tests passing via TDD**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-17T21:56:55Z
- **Completed:** 2026-03-17T21:59:01Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 2

## Accomplishments
- TDD RED phase: 30 failing tests covering all exports of pixel-validation module
- TDD GREEN phase: pixel-validation.ts implementing all exports, all 30 tests passing
- MOVE-02 verified: diagonal velocity magnitude equals cardinal magnitude (PLAYER_SPEED_PX) via 1/sqrt(2) normalization
- Wall sliding: separate X/Y collision passes so player slides along walls rather than dead-stopping
- Server-side anti-cheat: validatePixelSpeed with 10% jitter tolerance rejects teleportation (2x speed = false)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests for pixel-validation (RED)** - `176e6de` (test)
2. **Task 2: Implement pixel-validation module to pass all tests (GREEN + REFACTOR)** - `c38c6dd` (feat)

_Note: TDD tasks have two commits (test then feat)_

## Files Created/Modified
- `packages/game-logic/src/movement/pixel-validation.ts` - Core constants (TILE_SIZE_PX, PLAYER_SPEED_PX, DIAGONAL_NORMALIZATION, PLAYER_HITBOX), KeyState interface, velocityFromKeys, resolvePixelCollision, validatePixelSpeed
- `packages/game-logic/src/movement/pixel-validation.test.ts` - 30 unit tests covering all exports and edge cases

## Decisions Made
- TILE_SIZE_PX=128 selected to match the existing IsometricTransform tileWidthHalf value used in the renderer
- PLAYER_SPEED_PX=TILE_SIZE_PX (128 px/s) gives exactly 1.0s per tile — deliberately deliberate survival MMO pace
- PLAYER_HITBOX is 64x64 (half-tile) anchored at feet, matching isometric ground-level collision
- validatePixelSpeed uses 10% tolerance (1.1 multiplier) — enough slack for 50ms network jitter at 20Hz without enabling speed hacks

## Deviations from Plan

None - plan executed exactly as written.

One environmental note (not a deviation): `npx vitest run` from project root does not pick up the package-level `vitest.config.ts` with `globals: true`, causing "describe is not defined". This is expected vitest behavior — tests must be run from within `packages/game-logic/`. The plan's verification commands already specified the correct path pattern.

## Issues Encountered
- Running vitest from project root fails with "describe is not defined" because root-level vitest run ignores the package-specific vitest.config.ts. Running from `packages/game-logic/` directory resolves this — all 30 tests pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- pixel-validation module is ready as a dependency for all downstream phases (132–135)
- All exports are stable: TILE_SIZE_PX, PLAYER_SPEED_PX, DIAGONAL_NORMALIZATION, PLAYER_HITBOX, KeyState, velocityFromKeys, resolvePixelCollision, validatePixelSpeed
- MOVE-02 (diagonal normalization) is verified by tests
- No blockers for 131-02 (pixel-distance module)

---
*Phase: 131-shared-foundation*
*Completed: 2026-03-17*
