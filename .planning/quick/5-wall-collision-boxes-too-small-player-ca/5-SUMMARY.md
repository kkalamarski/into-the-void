---
phase: quick-5
plan: 1
subsystem: movement-collision
tags: [collision, isometric, pixel-movement, wall-transparency]
key-files:
  created: []
  modified:
    - packages/game-logic/src/movement/pixel-validation.ts
    - packages/game-logic/src/movement/pixel-validation.test.ts
    - apps/game-server/src/game/movement.service.ts
    - apps/game-server/src/zones/zones.service.ts
    - apps/web/src/game/scenes/WorldScene.ts
decisions:
  - "Only check south neighbor (y+1) for isometric visual overlap — east face overlap is lateral and much less pronounced; expand if needed"
  - "Added getWorldTileHeight to ZonesService as a new public method mirroring isWorldTileBlocked pattern"
metrics:
  duration: 18
  completed: 2026-03-19
---

# Quick Task 5: Wall Collision Boxes Too Small — Isometric Visual Collision Fix Summary

**One-liner:** Added `createIsometricCollisionCheck` wrapper that blocks the tile north of any elevated wall tile, preventing players from visually entering isometric cube walls from behind.

## What Was Built

### createIsometricCollisionCheck (packages/game-logic/src/movement/pixel-validation.ts)

New exported pure function that wraps any `isSolid` callback with an isometric visual height check. For each queried tile `(x, y)`, it also checks tile `(x, y+1)` — the tile to the south. If that southern tile is both blocking AND has `height >= 1`, the current tile is also treated as solid. This prevents the player from walking into the space that the wall cube's south face visually occupies on screen.

```typescript
export function createIsometricCollisionCheck(
  baseSolid: (tileX: number, tileY: number) => boolean,
  getHeight: (tileX: number, tileY: number) => number,
): (tileX: number, tileY: number) => boolean
```

### ZonesService.getWorldTileHeight (apps/game-server/src/zones/zones.service.ts)

New public method mirroring `isWorldTileBlocked` but reading `heights[][]` instead of `collisions[][]`. Returns `0` (floor level) when zone not loaded — conservative fallback that avoids false wall extension.

### MovementService tick() (apps/game-server/src/game/movement.service.ts)

Both hub and open-world `isSolid` callbacks are now wrapped with `createIsometricCollisionCheck` after construction. Hub zones use `chunk.heights` directly; open-world zones use the new `ZonesService.getWorldTileHeight` cross-zone lookup.

### WorldScene.setCollisionMap + getWorldTileHeight (apps/web/src/game/scenes/WorldScene.ts)

Client-side collision callback is now built with `createIsometricCollisionCheck`. A new private `getWorldTileHeight(worldX, worldY)` method mirrors `isWorldTileBlocked` but reads height data — handles both hub and open-world chunk lookup patterns.

## Tests Added (7 new tests in pixel-validation.test.ts)

All pass:
1. Tile with no elevated neighbor is not blocked when base says false
2. Tile directly north of elevated wall (y+1 blocking, height >= 1) IS blocked
3. Tile north of floor-level blocking tile (height = 0) is NOT additionally blocked
4. Tile north of non-blocking elevated tile is NOT blocked
5. Base solid check still works through wrapper (directly solid tile returns true)
6. Elevated wall at height 2 also blocks tile to its north
7. Tiles two rows north of wall remain unblocked

## Deviations from Plan

### Auto-added: getWorldTileHeight to ZonesService

**Found during:** Task 1 (server open-world zone getHeight implementation)
**Issue:** Plan specified inline cross-zone height lookup in MovementService, but the pattern was already established in ZonesService for `isWorldTileBlocked`. Extracting to a public method keeps MovementService thin and matches the existing service architecture.
**Fix:** Added `getWorldTileHeight(worldX, worldY)` to ZonesService as a public method.
**Files modified:** `apps/game-server/src/zones/zones.service.ts`
**Rule:** Rule 2 (missing critical functionality — clean separation of concerns)

## Pre-existing Test Failures (Out of Scope)

`creature-ai.test.ts` has 6 failing tests (pre-existing, not caused by this change). Logged as out-of-scope — no fix attempted.

## Self-Check: PASSED

Files confirmed present:
- packages/game-logic/src/movement/pixel-validation.ts — FOUND
- packages/game-logic/src/movement/pixel-validation.test.ts — FOUND
- apps/game-server/src/game/movement.service.ts — FOUND
- apps/game-server/src/zones/zones.service.ts — FOUND
- apps/web/src/game/scenes/WorldScene.ts — FOUND

Commit confirmed: ee264e1 — FOUND
