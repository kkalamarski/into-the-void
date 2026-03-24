---
phase: quick
plan: 18
subsystem: rendering
tags: [occlusion, depth-sorting, transparency, isometric]
key-files:
  modified:
    - apps/web/src/game/rendering/EntityRenderer.ts
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/scenes/controllers/EntityManager.ts
decisions:
  - "Removed alpha-based occlusion entirely — depth sorting via calculateDepth(elevation) is the correct isometric approach"
metrics:
  duration: "5 minutes"
  completed: "2026-03-24"
  tasks: 2
  files: 3
---

# Quick Task 18: Remove Player Occlusion Transparency — Summary

**One-liner:** Removed tile and entity alpha-based occlusion, relying solely on Phaser depth sorting with elevation weight for correct isometric occlusion.

## What Was Done

Removed two separate occlusion transparency systems:

1. **Tile transparency** (`updateTileTransparency` in WorldScene.ts): Made nearby elevated tiles go to alpha 0.35 when the player walked behind them so the player remained visible. Removed entirely.

2. **Entity occlusion fade** (`applyOcclusion` in EntityRenderer.ts): Made entities/players fade to alpha 0.3 (OCCLUDED_ALPHA) when a structure tile with height >= 3 had greater depth. Removed entirely.

Both systems were called from a throttled update block in `WorldScene.update()` every 100ms. That block and its associated fields (`transparentTiles`, `lastOcclusionTime`, `occlusionInterval`) were also removed.

## Depth Sorting Verification

The existing `calculateDepth` formula already handles correct isometric occlusion:

```
depth = screenY + (gridX * 0.0001) + (elevation * elevationWeight) + priorityBoost + entityOffset
```

- Tiles call `calculateDepth(x, y, elevation, 0, false)` — no entity offset
- Entities call `calculateDepth(x, y, elevation, boost, true)` — adds tileHeightHalf+1 offset

An elevated tile (elevation > 0) at a position in front of the player will have higher depth and render on top, naturally occluding the player — this is the correct isometric behavior. No transparency hacks needed.

## Files Modified

| File | Change |
|------|--------|
| `apps/web/src/game/scenes/WorldScene.ts` | Removed `updateTileTransparency()`, `transparentTiles` field, `lastOcclusionTime`, `occlusionInterval`, and throttled occlusion block in `update()` |
| `apps/web/src/game/rendering/EntityRenderer.ts` | Removed `applyOcclusion()` method, `OCCLUSION_DEPTH_THRESHOLD`, `OCCLUSION_MIN_HEIGHT`, `OCCLUDED_ALPHA` constants, and `Occluder` interface |
| `apps/web/src/game/scenes/controllers/EntityManager.ts` | Removed `updateEntityOcclusion()` method |

## Commits

| Hash | Description |
|------|-------------|
| 6112eaa | fix(quick-18): remove player/entity occlusion transparency |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `apps/web/src/game/rendering/EntityRenderer.ts` — confirmed modified
- `apps/web/src/game/scenes/WorldScene.ts` — confirmed modified
- `apps/web/src/game/scenes/controllers/EntityManager.ts` — confirmed modified
- Commit 6112eaa — confirmed present
- TypeScript build — passes with no errors
