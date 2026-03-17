---
phase: 130
plan: 1
title: "Remove PNG tile loading and dead code"
status: complete
started: 2026-03-17
completed: 2026-03-17
---

# Plan 130-01 Summary: Remove PNG Tile Loading and Dead Code

## What was built

Surgically removed all dead PNG tile loading code and archived the tile PNG files:

1. **PreloadScene cleanup**: Deleted `loadFloorTileSprites()` method and its commented-out call. Moved quest marker PNG loading to `loadAssets()` (these are UI elements, not tile PNGs). Removed tile spritesheet extraction from `extractSpritesheetFrames()` while preserving feature spritesheet extraction.

2. **TileRenderer cleanup**: Fixed `getTextureKey()` fallback to use `proc_tile_void_floor` instead of stale `tile_void_floor`. Deleted `isValidCubeTexture()`, `createTile()` (flat diamond), and `createTileWithElevation()` (non-world variant) dead methods.

3. **WorldScene cleanup**: Deleted `loadZone()` legacy method and `tileSprites` property — both unused since chunk-based rendering replaced the old zone loading path.

4. **PNG archival**: Moved 12 tile PNG files (10 individual tiles + 2 spritesheets) from `sprites/` to `archive/tiles/`.

## Key files

### Modified
- `apps/web/src/game/scenes/PreloadScene.ts` — removed 75 lines of dead tile loading code
- `apps/web/src/game/rendering/TileRenderer.ts` — removed 3 dead methods, fixed fallback key
- `apps/web/src/game/scenes/WorldScene.ts` — removed legacy loadZone method

### Moved
- 12 files from `apps/web/public/assets/sprites/` to `apps/web/public/assets/archive/tiles/`

## Deviations

None — implemented as planned.

## Self-Check: PASSED

- [x] `loadFloorTileSprites` deleted from PreloadScene
- [x] No `this.load.image('tile_` calls remain
- [x] Quest marker loading preserved in `loadAssets()`
- [x] Feature spritesheet extraction preserved
- [x] Dead methods removed from TileRenderer
- [x] `getTextureKey()` fallback uses procedural key
- [x] `loadZone()` removed from WorldScene
- [x] Tile PNGs archived to `assets/archive/tiles/`
