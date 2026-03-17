# Phase 130: Rendering Cleanup & Verification - Research

**Researched:** 2026-03-17
**Status:** Complete

## Summary

Phase 130 is a cleanup and verification phase to remove all PNG tile sprite loading from the runtime, delete dead code, and verify the complete visual system works end-to-end. The codebase is already 95% transitioned — PNG tile loading was commented out in Phase 126 and procedural cubes are the active rendering path. This phase finalizes that transition.

## Current State Analysis

### PNG Tile Loading (Already Disabled)

**PreloadScene.ts** (`apps/web/src/game/scenes/PreloadScene.ts`):
- Line 56: `loadFloorTileSprites()` is already commented out: `// this.loadFloorTileSprites();`
- The entire `loadFloorTileSprites()` method (lines 309-361) is dead code — it loads:
  - Floor tiles: `tile_toxic_floor`, `tile_ruins_floor`, `tile_ice_floor`, `tile_volcanic_floor`, `tile_fungal_floor`, `tile_crater_floor` (with `_v2` and `_v3` variants each)
  - Void tile spritesheet: `void-tiles-sheet` from `sprites/void-tiles.png`
  - Crystal tile spritesheet: `crystal-tiles-sheet` from `sprites/crystal-tiles.png`
  - Void floor variants: `tile_void_floor_v2`, `tile_void_floor_v3`
  - Feature tiles: `tile_toxic_pool`, `tile_ruins_wall`, `tile_ice_wall`, `tile_lava`, `tile_fungal_growth`, `tile_crater_debris`
  - Quest markers: `ui_quest_marker_available`, `ui_quest_marker_ready` (NOTE: these are NOT tile PNGs — keep them!)

**extractSpritesheetFrames()** (lines 551-597):
- Extracts frames from `void-tiles-sheet` and `crystal-tiles-sheet` into named textures like `tile_void_floor`, `tile_void_wall`, `tile_crystal_floor`, etc.
- These extracted textures are NEVER used at runtime anymore (all tiles use `proc_tile_*` keys)
- However, the method ALSO extracts feature spritesheets (void-biome-features, crystal-biome-features, acid-biome-features) — those ARE still used and must be kept

### TileRenderer Dead Code

**TileRenderer.ts** (`apps/web/src/game/rendering/TileRenderer.ts`):

1. **`getTextureKey()` fallback** (line 97): Falls back to `'tile_void_floor'` (PNG key) instead of `'proc_tile_void_floor'`. This is dead code because TILE_TEXTURE_MAP has all TileId values mapped, but the fallback should reference the procedural key.

2. **`isValidCubeTexture()` method** (lines 104-112): Validates if a texture is 256x256. Only called internally but not actually used in the rendering pipeline — it was a validation helper from the PNG era.

3. **`createTile()` method** (lines 118-150): Creates a flat diamond polygon (no elevation). Still called by `WorldScene.loadZone()` which is an old method used only for placeholder generation. The primary rendering path is `createTileWithElevationWorld()` via `renderChunk()`.

4. **WorldScene.loadZone()** (lines 1462-1479): Uses `createTile()` — appears to be legacy code for non-chunked zone loading. The active path is `renderChunk()` which uses `createTileWithElevationWorld()`.

### PNG Tile Files on Disk

**Source tile PNGs** in `apps/web/public/assets/sprites/`:
- `tile_crystal_floor.png`, `tile_crystal_formation.png`
- `tile_fungal_floor.png`, `tile_fungal_growth.png`
- `tile_grass.png` (legacy), `tile_water.png` (legacy)
- `tile_ice_floor.png`, `tile_lava.png`
- `tile_void_floor.png`, `tile_void_wall.png`
- `void-tiles.png` (spritesheet), `crystal-tiles.png` (spritesheet)

**Variant PNGs** exist only in `dist/` and `.nx/cache/` (build artifacts):
- `tile_*_v2.png`, `tile_*_v3.png` variants for multiple biomes
- These are build outputs, not source files

### Active Rendering Pipeline

**ProceduralTileGenerator** (`apps/web/src/game/rendering/ProceduralTileGenerator.ts`):
- Called in `PreloadScene.create()` — bakes ~75 textures with `proc_tile_*` keys
- Registered in Phaser texture manager via `graphics.generateTexture()`
- All 30 biome tile types covered with 3 variants for floors, 1 for walls/features

**TileRenderer.createCubeSprite()** (line 389):
- Uses `proc_tile_*` keys from TILE_TEXTURE_MAP
- Falls back to `createFallbackCube()` if texture missing (gray cube — this is the desired behavior per CONTEXT.md)

**WorldScene.renderChunk()** (line 1373):
- The active rendering path — calls `createTileWithElevationWorld()` for every tile
- This is the only place tiles are rendered in the game

### Visual Systems Integration

All four visual systems are already wired in from prior phases:

1. **Terrain Cubes** (Phase 126): `ProceduralTileGenerator` in PreloadScene + `TileRenderer` in WorldScene
2. **Weather System** (Phase 127): `WeatherSystem` in `apps/web/src/game/systems/WeatherSystem.ts`, wired into WorldScene
3. **Day/Night Cycle** (Phase 128): `DayNightCycle` in `apps/web/src/game/systems/DayNightCycle.ts`, uses camera postFX ColorMatrix
4. **Atmosphere System** (Phase 129): `AtmosphereSystem` in `apps/web/src/game/systems/AtmosphereSystem.ts`, cooperative ColorMatrix sharing with DayNightCycle

### Quest Markers — Do NOT Remove

The `loadFloorTileSprites()` method includes quest marker loading (lines 359-360):
```typescript
this.load.image('ui_quest_marker_available', 'sprites/ui_quest_marker_available.png');
this.load.image('ui_quest_marker_ready', 'sprites/ui_quest_marker_ready.png');
```
These are NOT tile PNGs — they're UI elements. However, these two lines will be deleted with the method. The `generateTileTextures()` method already generates fallback textures (`ui_quest_marker_available_fallback`, `ui_quest_marker_ready_fallback`), so quest markers will still work.

Check if quest markers reference the non-fallback keys anywhere. If so, the loading should be moved to a different method or the references updated to use fallback keys.

## Cleanup Inventory

### Must Delete (Dead Code)

| Item | File | Lines | Reason |
|------|------|-------|--------|
| `loadFloorTileSprites()` method | PreloadScene.ts | 309-361 | Commented-out caller, never invoked |
| Commented-out call | PreloadScene.ts | 55-56 | Dead comment referencing removed function |
| Tile sheet extraction | PreloadScene.ts | 552-566 | Extracts `tile_*` keys from tile sheets no longer loaded |
| `isValidCubeTexture()` method | TileRenderer.ts | 104-112 | Unused validation helper |
| `createTile()` method | TileRenderer.ts | 118-150 | Used only by legacy `loadZone()` |
| `loadZone()` method | WorldScene.ts | 1462-1479 | Legacy non-chunked path, not called by active code |
| `'tile_void_floor'` fallback | TileRenderer.ts | 97 | Should reference `proc_tile_void_floor` |

### Must Preserve

| Item | File | Reason |
|------|------|--------|
| `extractSpritesheetFrames()` | PreloadScene.ts | Feature spritesheet extraction (void/crystal/acid features) still active |
| Feature spritesheet loading | PreloadScene.ts | `void-biome-features-sheet`, `crystal-biome-features-sheet`, `acid-biome-features-sheet` still used |
| `createFallbackCube()` | TileRenderer.ts | Fallback for missing procedural textures (gray cube per CONTEXT.md) |
| `createTileWithElevation()` | TileRenderer.ts | May be used elsewhere; `createTileWithElevationWorld()` is primary |
| Quest marker PNG loading | PreloadScene.ts | Move to appropriate method if references exist |

### PNG Files to Archive

Move from `apps/web/public/assets/sprites/` to `apps/web/public/assets/archive/tiles/`:
- All `tile_*.png` files (10 files)
- `void-tiles.png`, `crystal-tiles.png` spritesheets

## Risk Assessment

**Low risk** — This is surgical cleanup of already-disabled code paths:
- PNG loading was disabled in Phase 126 (commented out)
- The game has been running on procedural cubes since Phase 126
- No runtime code references the old `tile_*` texture keys anymore
- The only risk is accidentally removing feature spritesheet extraction

## Requirement Coverage

| Requirement | How Addressed |
|-------------|---------------|
| CLNP-01: PNG tile sprite loading disabled | Delete `loadFloorTileSprites()` and its commented call |
| CLNP-02: Dead tile sprite code removed from TileRenderer | Remove `isValidCubeTexture()`, `createTile()`, fix fallback key |
| CLNP-03: PreloadScene no longer loads tile PNGs | Delete the method + remove tile sheet extraction from `extractSpritesheetFrames()` |
| CLNP-04: Old tile PNGs kept in repo but not loaded | Move to `assets/archive/tiles/` directory |

---

## RESEARCH COMPLETE

*Phase: 130-rendering-cleanup-verification*
*Research completed: 2026-03-17*
