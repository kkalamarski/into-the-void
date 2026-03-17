---
phase: 133-distance-system-migration
plan: 5
subsystem: game-server
tags: [distance-migration, pixel-distance, artifact-collection, ability-system, combat-system, gap-closure]
dependency_graph:
  requires: [133-01, 133-02, 133-03, 133-04]
  provides: [DIST-01, DIST-02, DIST-04]
  affects: [entity.service.ts, ability.service.ts, combat.service.ts]
tech_stack:
  added: []
  patterns: [pixel-distance, tileToPixelCenter, canInteractPixel, GATHER_RANGE_PX, PACK_CALL_RANGE_PX]
key_files:
  created: []
  modified:
    - apps/game-server/src/game/entity.service.ts
    - apps/game-server/src/game/ability.service.ts
    - apps/game-server/src/game/combat.service.ts
decisions:
  - "canInteractPixel uses GATHER_RANGE_PX (192px) instead of tool-based toolRange for uniform artifact/gather interaction radius"
  - "PACK_CALL_RANGE_PX = 10 * TILE_SIZE_PX (1280px) preserves old 10-tile radius semantically in pixel space"
  - "Provoker pixel center pre-computed once above both filter and sort to avoid redundant tileToPixelCenter calls"
  - "Precision Shot reveal uses player.px/player.py directly (ConnectedPlayer) rather than tileToPixelCenter for player"
metrics:
  duration: ~5min
  completed: "2026-03-17T23:40:19Z"
  tasks: 2
  files_modified: 3
---

# Phase 133 Plan 05: Gap Closure — Pixel Distance Migration for Artifact, Precision Shot, and Pack Call Summary

Gap closure replacing all three surviving tile-integer Chebyshev distance checks (artifact collection, Precision Shot predator reveal, Pack Call reinforcement range) with Euclidean pixel distance using `pixelDistanceTo` and `tileToPixelCenter`.

## What Was Built

Three files patched to eliminate the final legacy tile-distance checks in active gameplay server code. Zero `Math.max(Math.abs(...position...))` Chebyshev patterns now remain in entity.service.ts, ability.service.ts, or combat.service.ts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace legacy distance checks in entity.service and ability.service | 224241c | entity.service.ts, ability.service.ts |
| 2 | Replace legacy Chebyshev distance in combat.service.ts triggerPackCall | 17c73dc | combat.service.ts |

## Changes Per File

### apps/game-server/src/game/entity.service.ts (DIST-02)

- Added `canInteractPixel` and `GATHER_RANGE_PX` to `@into-the-void/game-logic` imports
- Replaced `canInteract(player, entity, toolRange)` with `canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX)` — uses pixel-accurate Euclidean distance and the standard 192px gather range constant
- Legacy `canInteract` import retained (used by other callers; Phase 135 cleanup will remove it)

### apps/game-server/src/game/ability.service.ts (DIST-01)

- Replaced Chebyshev filter in Precision Shot reveal effect:
  - Before: `Math.max(Math.abs(e.position.x - player.position.x), Math.abs(e.position.y - player.position.y)) <= effect.radiusTiles`
  - After: IIFE computing `tileToPixelCenter(e.position.x, e.position.y)` and comparing `pixelDistanceTo(ePx, ePy, player.px, player.py) <= effect.radiusTiles * TILE_SIZE_PX`
  - Used `player.px/player.py` directly as `player` is a `ConnectedPlayer` with real-time pixel position

### apps/game-server/src/game/combat.service.ts (DIST-04)

- Added `TILE_SIZE_PX` to `@into-the-void/game-logic` imports
- Replaced `const PACK_CALL_RANGE = 10` with `const PACK_CALL_RANGE_PX = 10 * TILE_SIZE_PX` (1280px)
- Pre-computed provoker pixel center once (`{ px: provPx, py: provPy } = tileToPixelCenter(...)`) above both filter and sort to avoid redundant calls
- Replaced Chebyshev filter with pixel Euclidean IIFE: `pixelDistanceTo(ePx, ePy, provPx, provPy) <= PACK_CALL_RANGE_PX`
- Replaced Chebyshev sort comparator with: `pixelDistanceTo(aPx, aPy, provPx, provPy) - pixelDistanceTo(bPx, bPy, provPx, provPy)`

## Decisions Made

1. `canInteractPixel` uses `GATHER_RANGE_PX` (192px) instead of tool-based `toolRange` (tile-based) — standardizes interaction radius to pixel constant, dropping the per-tool tile range concept in favor of uniform artifact/gather distance
2. `PACK_CALL_RANGE_PX = 10 * TILE_SIZE_PX` (1280px) preserves the original 10-tile radius semantically in pixel space
3. Provoker pixel center pre-computed once above both filter and sort to avoid redundant `tileToPixelCenter` calls in the hot path
4. Precision Shot reveal uses `player.px`/`player.py` directly (ConnectedPlayer real-time position) rather than `tileToPixelCenter` for the player — more accurate since player can be between tiles

## Deviations from Plan

None — plan executed exactly as written. The `player.px`/`player.py` branch described as the preferred path in the plan was confirmed type-safe and used.

## Verification Results

- PASS: No legacy `canInteract(` calls remain in entity.service.ts (excluding pixel variant and imports)
- PASS: No Chebyshev `Math.abs.*position.x.*position.x` patterns in ability.service.ts
- PASS: No Chebyshev `Math.abs.*position.x.*position.x` patterns in combat.service.ts
- PASS: `npx nx run game-server:build` succeeds with no type errors

## Self-Check: PASSED

Files exist:
- FOUND: apps/game-server/src/game/entity.service.ts
- FOUND: apps/game-server/src/game/ability.service.ts
- FOUND: apps/game-server/src/game/combat.service.ts

Commits exist:
- FOUND: 224241c (entity.service + ability.service)
- FOUND: 17c73dc (combat.service)
