---
phase: 159
plan: 1
title: "Fix coordinate pipeline — debug overlay, elevation lookup, and distance calculations"
status: complete
started: "2026-03-25"
completed: "2026-03-25"
---

# Summary: 159-01 — Fix Coordinate Pipeline

## What Changed

Hardened all tile data lookups (elevation, tile type) in the client to use world-aware cross-chunk resolution instead of direct array access for open-world zones. This prevents incorrect data when `currentHeights`/`currentTiles` arrays are stale or mismatched after zone transitions.

### Changes Made

1. **Debug overlay tile lookups** (`WorldScene.ts` lines 160-177): Changed `getElevation` and `getTileType` callbacks from direct `currentHeights[ty][tx]` / `currentTiles[ty][tx]` array access to world-aware lookups using `getWorldTileHeight()` and `resolveWorldToChunkLocal()` for open-world zones. Hub zones retain direct access.

2. **Player interpolated elevation** (`WorldScene.ts` `getInterpolatedElevation`): Changed from direct `currentHeights` access to `getWorldTileHeight()` calls for open-world zones. This is the function that determines the player's visual height (and whether they "sink").

3. **Entity tile elevation** (`WorldScene.ts` `getTileElevation`): Changed from direct array access to `getWorldTileHeight()` for open-world zones. This affects creature and NPC elevation positioning.

### Root Cause Analysis

After thorough code review of `resolvePixelCollision` in `pixel-validation.ts`, I confirmed that the elevation offset in `hitsWall()` does NOT leak into the resolved px/py coordinates. The offset is only used for tile lookup within the collision check — the returned position is always `px + vx` / `py + vy` without any elevation offset applied.

The actual issue is that tile data lookups (elevation, tile type) used direct `currentHeights`/`currentTiles` array access with zone-local indices. While the coordinate math is correct, this approach is fragile — if the arrays are null, stale from a previous zone, or not yet populated during a zone transition, all lookups return 0/default values. The world-aware cross-chunk resolution system (`getWorldTileHeight`, `resolveWorldToChunkLocal`) handles these edge cases correctly by resolving through the ChunkManager.

## key-files

### modified
- `apps/web/src/game/scenes/WorldScene.ts` — Debug overlay callbacks, getTileElevation, getInterpolatedElevation

## Self-Check: PASSED

- [x] Debug overlay uses world-aware lookups for open-world zones
- [x] Player elevation uses world-aware lookups (prevents sinking)
- [x] Entity elevation uses world-aware lookups
- [x] Hub zones still use direct array access (correct for single-chunk zones)
- [x] Build passes
