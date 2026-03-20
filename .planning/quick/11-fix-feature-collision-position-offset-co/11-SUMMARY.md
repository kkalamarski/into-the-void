---
phase: quick-11
plan: 01
subsystem: collision
tags: [collision, entity, pixel-movement, feature, worldscene]
dependency_graph:
  requires: []
  provides: [feet-level-entity-collision]
  affects: [apps/web/src/game/scenes/WorldScene.ts, apps/web/src/game/systems/PixelMovementController.ts]
tech_stack:
  added: []
  patterns: [pixelY-threshold filtering for AABB sub-tile collision discrimination]
key_files:
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/systems/PixelMovementController.ts
decisions:
  - "Filter entity collision using pixelY threshold (tileMidY) so only feet-level hitbox corners trigger feature blocking, not head-level corners"
metrics:
  duration: "5min"
  completed: "2026-03-20"
---

# Quick Task 11: Fix Feature Collision Position Offset Summary

**One-liner:** Feet-only entity collision filter using pixelY threshold eliminates half-tile early collision on trees/plants/minerals.

## What Was Done

Fixed the feature (tree/plant/mineral) collision position so it triggers at the visual base of features instead of at the trunk middle. The root cause was that `entitySolid` ignored the `pixelY` parameter already passed by `resolvePixelCollision`, meaning the TOP corners of the player's 64px-tall hitbox triggered entity blocking before the feet reached the feature's tile base.

## Changes Made

### `apps/web/src/game/scenes/WorldScene.ts`

Updated `entitySolid` in `setCollisionMap()` to accept `pixelY` and apply a mid-tile threshold filter:

```typescript
const entitySolid = (tx: number, ty: number, pixelY?: number) => {
  if (pixelY !== undefined) {
    const tileMidY = ty * TILE_SIZE_PX + TILE_SIZE_PX * 0.5;
    if (pixelY < tileMidY) return false;
  }
  return this.isEntityBlocked(offsetX + tx, offsetY + ty);
};
```

Updated the combined callback to pass `pixelY` through to `entitySolid`:

```typescript
this.pixelMovement.setCollisionCallback(
  (tx: number, ty: number, pixelY?: number) =>
    entitySolid(tx, ty, pixelY) || isoCheck(tx, ty, pixelY),
);
```

### `apps/web/src/game/systems/PixelMovementController.ts`

Updated the `isSolid` field and `setCollisionCallback` method type signatures to declare `pixelY?` parameter:

```typescript
private isSolid: ((tileX: number, tileY: number, pixelY?: number) => boolean) | null = null;

setCollisionCallback(isSolid: (tx: number, ty: number, pixelY?: number) => boolean): void {
```

## How It Works

`resolvePixelCollision` checks 4 hitbox corners per candidate position. Each corner calls `isSolid(toTile(c.x), toTile(c.y), c.y)`:

- **Top corners** (head level): `c.y = py - 64`. These are near the top edge of the feature tile, `pixelY < tileMidY` — `entitySolid` returns `false`, no early collision.
- **Bottom corners** (feet level): `c.y = py - 1`. When feet enter the feature's tile, `pixelY >= tileMidY` — `entitySolid` returns `true`, collision triggers at visual base.

Terrain/wall collision via `isoCheck` is completely unchanged — walls still use full hitbox checking as required.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript compilation: passed (0 errors)
- `game-logic:test` movement tests: passed (52 pixel-validation tests, 27 pixel-distance tests)
- Pre-existing `creature-ai.test.ts` failures: 6 tests failing, unrelated to this change (AI combat logic)

## Self-Check: PASSED

- File `apps/web/src/game/scenes/WorldScene.ts` modified: confirmed
- File `apps/web/src/game/systems/PixelMovementController.ts` modified: confirmed
- Commit `e2adfe1` exists: confirmed
