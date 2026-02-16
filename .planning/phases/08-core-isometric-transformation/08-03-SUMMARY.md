---
phase: 08-core-isometric-transformation
plan: 03
subsystem: rendering
tags: [isometric, viewport-culling, scene-integration, chunk-alignment, depth-sorting]

dependency_graph:
  requires:
    - 08-01-IsometricTransform
    - 08-02-DepthSorter
  provides:
    - complete-isometric-rendering
    - isometric-viewport-culling
    - seamless-chunk-alignment
  affects:
    - All rendering components now use isometric coordinates
    - Camera follows player in isometric space
    - Input handling uses screen-to-grid conversion

tech_stack:
  added: []
  patterns:
    - Diamond-shaped viewport culling (4-corner conversion)
    - Isometric chunk offset calculation (gridToScreen for chunk origins)
    - Container-based player/entity rendering with shadows
    - Polygon-based tile rendering (placeholder until sprite assets available)

key_files:
  created: []
  modified:
    - apps/web/src/game/rendering/ViewportCuller.ts
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/rendering/TileRenderer.ts

decisions:
  - decision: 4-tile culling padding (up from 2)
    rationale: Isometric diamond projection requires more padding to prevent edge popping
    alternatives: [2-tile (too tight), 6-tile (wasteful)]
  - decision: Polygon-based tile rendering instead of sprites
    rationale: Square 96x96 sprites don't tile with 128x64 isometric positioning
    alternatives: [Wait for isometric sprites (blocks progress), Use sprites anyway (visual bugs)]
  - decision: Container-based player rendering (not direct sprite)
    rationale: Allows composition of shadow + elevated sprite with proper depth
    alternatives: [Separate sprites (harder depth management), Single sprite (no shadow)]

metrics:
  duration: 468s
  tasks_completed: 3
  files_modified: 3
  commits: 3
  completed_date: 2026-02-16
---

# Phase 08 Plan 03: Viewport Culling & Scene Integration Summary

**One-liner:** Isometric viewport culling with 4-corner conversion and complete WorldScene integration (diamond tiles, containers, chunk alignment, depth sorting).

## What Was Built

Completed the isometric transformation by updating ViewportCuller for diamond-shaped culling and integrating all isometric components into WorldScene. The rendering system now operates entirely in isometric coordinate space with proper chunk alignment, depth sorting, and visual feedback.

## Key Implementation Details

### ViewportCuller Isometric Update
- **Import IsometricTransform**: Access to coordinate conversion methods
- **Constructor signature**: Now accepts `tileWidth`, `tileHeight`, and `padding` (defaults: 128, 64, 4)
- **getCullBounds algorithm**: Converts all four camera viewport corners to grid space, finds min/max across corners, applies 4-tile padding
- **Padding expansion**: Increased from 2 to 4 tiles to account for diamond projection area

### WorldScene Isometric Integration
- **Constants updated**: `ISO_TILE_WIDTH = 128`, `ISO_TILE_HEIGHT = 64` (replaced `TILE_SIZE = 96`)
- **New properties**: `isoTransform: IsometricTransform`, `depthSorter: DepthSorter`
- **Initialization**: All renderers (TileRenderer, EntityRenderer, ViewportCuller) now use isometric dimensions
- **Player rendering**: Container with blob shadow (40x20 ellipse) + elevated sprite (-12px) + depth calculation with 0.001 priority boost
- **Chunk positioning**: Uses `gridToScreen(chunkGridX, chunkGridY)` for chunk container offsets, ensuring seamless alignment
- **Depth sorting**: Integrated in update loop with throttled updates (100ms)
- **Position conversions**: All player/entity positioning uses `gridToScreen()`, all input uses `screenToTile()`

### TileRenderer Diamond Fix (Human Verification Deviation)
- **Problem**: Square 96x96 sprites rendered as T-shapes with 128x64 isometric positioning
- **Solution**: Render tiles as diamond polygon graphics with fill colors based on tile type
- **Implementation**: 4-point polygon (top, right, bottom, left) with subtle border, depth based on screen Y
- **Color mapping**: 16 placeholder colors for different tile types (VOID_FLOOR, CRYSTAL_FLOOR, etc.)
- **Future path**: Replace with proper isometric sprite assets when available

## Task Breakdown

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Update ViewportCuller for isometric space | 03978db | apps/web/src/game/rendering/ViewportCuller.ts |
| 2 | Integrate isometric rendering in WorldScene | 6779102 | apps/web/src/game/scenes/WorldScene.ts |
| 3 | Verify isometric rendering (human-verify checkpoint) | e7c80a9 | apps/web/src/game/rendering/TileRenderer.ts, apps/web/src/game/scenes/WorldScene.ts |

## Technical Decisions

1. **4-tile culling padding**: Expanded from 2 to account for isometric diamond area
   - Rationale: Diamond tiles project wider than their grid coordinates suggest
   - Impact: Prevents edge popping, slight increase in rendered tiles

2. **Container-based player rendering**: Replaced direct sprites with containers
   - Rationale: Allows composition of shadow + elevated sprite with unified depth management
   - Impact: Consistent with entity rendering pattern, proper visual layering

3. **Polygon tile rendering**: Use colored diamonds instead of sprites
   - Rationale: 96px square sprites don't tile correctly with 128x64 isometric coordinates
   - Impact: Placeholder solution until isometric sprite assets are created
   - Trade-off: Reduced visual fidelity but correct geometry

4. **Isometric chunk offsets**: Calculate chunk container position via `gridToScreen()`
   - Rationale: Ensures chunk boundaries align seamlessly in isometric space
   - Impact: No visual seams between chunks, correct world layout

## Deviations from Plan

### Auto-fixed Issues (Rule 3 - Blocking)

**1. Click-to-move handler coordinate conversion**
- **Found during:** Task 2 (WorldScene integration)
- **Issue:** Click-to-move used `Math.floor(worldPoint / TILE_SIZE)` but TILE_SIZE constant no longer exists
- **Fix:** Updated to use `isoTransform.screenToTile(worldPoint.x, worldPoint.y)`
- **Files modified:** apps/web/src/game/scenes/WorldScene.ts
- **Commit:** 6779102 (part of Task 2)

**2. updateEntity position conversion**
- **Found during:** Task 2 (WorldScene integration)
- **Issue:** updateEntity used `TILE_SIZE` multiplication for positioning
- **Fix:** Updated to use `gridToScreen()` and mark dirty for depth sorting
- **Files modified:** apps/web/src/game/scenes/WorldScene.ts
- **Commit:** 6779102 (part of Task 2)

### Human Verification Fix (Rule 1 - Bug)

**3. Tile rendering visual bug**
- **Found during:** Task 3 (Human verification checkpoint)
- **Issue:** Square 96x96 sprites rendered as T-shapes with 128x64 isometric positioning - tiles didn't tile correctly
- **Fix:** Replaced sprite rendering with diamond polygon graphics using color fills based on tile type
- **Files modified:** apps/web/src/game/rendering/TileRenderer.ts
- **Commit:** e7c80a9
- **Note:** Placeholder solution until proper isometric sprite assets are created

## Verification Results

**TypeScript compilation:** PASSED (no errors in apps/web)

**Human verification checklist:**
- [x] Tiles render as diamonds (2:1 ratio, not squares) - After polygon fix
- [x] Player sprite is centered on tile
- [x] Player has blob shadow beneath
- [x] Moving player updates position smoothly
- [x] Camera follows player (player always centered)
- [x] Adjacent chunk tiles align seamlessly (no gaps)
- [x] No visual seams at chunk edges
- [x] Entities have blob shadows (if entities exist)
- [x] Depth sorting works correctly
- [x] No z-fighting/flickering between overlapping sprites

**Verification outcome:** APPROVED after applying TileRenderer polygon fix

## Success Criteria Met

- [x] Tiles render as isometric diamonds (128x64)
- [x] Player sprite positions correctly on tile center
- [x] Entities sort by depth with no flickering
- [x] Adjacent chunk tiles align seamlessly at boundaries
- [x] Camera follows player at exact center (lerp=1)
- [x] Viewport culling works correctly for isometric space
- [x] All Phase 8 core transformation complete

## Known Issues & Limitations

1. **Placeholder tile graphics**: Using colored diamond polygons instead of sprite assets
   - **Impact**: Reduced visual fidelity, all tile types distinguishable by color only
   - **Resolution**: Replace with proper isometric sprite assets in future art pass

2. **Entity sprite compatibility**: Entities still use square placeholder sprites
   - **Impact**: Visual mismatch between diamond tiles and square entity sprites
   - **Resolution**: Replace with isometric entity sprites when available

3. **Minimap needs isometric support**: MinimapCamera still renders in old coordinate space
   - **Impact**: Minimap may show incorrect positions or scale
   - **Resolution**: Update MinimapCamera to use isometric transform (future plan)

## Next Steps

Phase 8 complete. Subsequent phases will:
1. **Phase 9**: Update input handling for isometric click-to-move accuracy
2. **Phase 10**: Create isometric sprite assets for tiles and entities
3. **Phase 11**: Update minimap for isometric rendering
4. **Phase 12**: Performance profiling and optimization of isometric rendering

## Self-Check: PASSED

**Files modified:**
- FOUND: apps/web/src/game/rendering/ViewportCuller.ts
- FOUND: apps/web/src/game/scenes/WorldScene.ts
- FOUND: apps/web/src/game/rendering/TileRenderer.ts

**Commits exist:**
- FOUND: 03978db (Task 1 - ViewportCuller isometric update)
- FOUND: 6779102 (Task 2 - WorldScene integration)
- FOUND: e7c80a9 (Task 3 - TileRenderer polygon fix)

**TypeScript compilation:**
- PASSED: No compilation errors in apps/web

**Isometric integration verified:**
- VERIFIED: ViewportCuller uses 4-corner grid conversion
- VERIFIED: WorldScene uses ISO_TILE_WIDTH/HEIGHT constants
- VERIFIED: All position conversions use gridToScreen/screenToTile
- VERIFIED: Chunk offsets calculated via isometric transform
- VERIFIED: Depth sorting integrated in update loop
- VERIFIED: Players and entities use container pattern with shadows
- VERIFIED: TileRenderer creates diamond polygons with correct geometry

**Human verification:**
- APPROVED: Isometric rendering displays correctly after polygon fix
- APPROVED: Chunk boundaries align seamlessly
- APPROVED: Depth sorting works without z-fighting
