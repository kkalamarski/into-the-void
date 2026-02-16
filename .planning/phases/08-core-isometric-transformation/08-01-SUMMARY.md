---
phase: 08-core-isometric-transformation
plan: 01
subsystem: rendering
tags: [isometric, coordinates, tile-rendering, depth-sorting]

dependency_graph:
  requires: []
  provides:
    - IsometricTransform utility (bidirectional coordinate conversion)
    - Isometric tile positioning in TileRenderer
  affects:
    - All future rendering components (EntityRenderer, ViewportCuller)
    - Camera tracking (will need isometric coordinates)
    - Input handling (click-to-move needs screen-to-grid conversion)

tech_stack:
  added:
    - IsometricTransform utility class (custom coordinate math)
  patterns:
    - Coordinate transformation at rendering boundaries only
    - Y-based depth sorting with X-tiebreaker
    - Centered sprite origin (0.5, 0.5) for isometric diamonds

key_files:
  created:
    - apps/web/src/game/utils/IsometricTransform.ts
  modified:
    - apps/web/src/game/rendering/TileRenderer.ts

decisions:
  - Use 128x64 tile size (2:1 isometric ratio) instead of 32px square
  - Center tile origin at (0.5, 0.5) for proper diamond alignment
  - Static depth assignment for tiles (calculated once, never updated)
  - Expose IsometricTransform via TileRenderer.getTransform() for other components

metrics:
  duration: 73s
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  commits: 2
  completed_date: 2026-02-16
---

# Phase 08 Plan 01: Core Isometric Transformation Summary

**One-liner:** Bidirectional isometric coordinate transformation (128x64 tiles) with centered diamond positioning and Y-based depth sorting.

## What Was Built

Created the foundation for isometric rendering by implementing coordinate transformation utilities and updating the tile renderer to position tiles as isometric diamonds. The IsometricTransform class provides mathematical conversion between cartesian grid coordinates and isometric screen space, while TileRenderer now renders tiles with proper diamond positioning, centered origins, and Y-based depth values.

## Key Implementation Details

### IsometricTransform Utility
- **gridToScreen**: Converts grid (x,y) to screen position using formula: `x_iso = (gridX - gridY) * tileWidthHalf`, `y_iso = (gridX + gridY) * tileHeightHalf`
- **screenToGrid**: Inverse transformation for converting screen clicks to grid coordinates (floating-point)
- **screenToTile**: Integer grid coordinates via Math.floor (for tile-based operations)
- **calculateDepth**: Y-based depth with X-tiebreaker (`depth = screenY + gridX * 0.0001 + priorityBoost`)
- **Default dimensions**: 128x64 pixels (2:1 isometric ratio)

### TileRenderer Updates
- **Isometric positioning**: Uses `isoTransform.gridToScreen()` instead of direct multiplication
- **Origin change**: From (0,0) to (0.5, 0.5) for centered diamond alignment
- **Depth assignment**: Static depth value based on screen Y position
- **Constructor signature**: Now accepts `tileWidth` and `tileHeight` (defaults 128x64)
- **Transform exposure**: `getTransform()` method for other components to access coordinate conversion

## Task Breakdown

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create IsometricTransform utility | b102520 | apps/web/src/game/utils/IsometricTransform.ts |
| 2 | Update TileRenderer for isometric positioning | bdbd15a | apps/web/src/game/rendering/TileRenderer.ts |

## Technical Decisions

1. **Tile size upgrade**: Changed from 32px square to 128x64 isometric (per user specification)
   - Rationale: Matches 2:1 isometric ratio standard, provides more visual detail
   - Impact: Requires sprite assets at new size, affects viewport calculations

2. **Origin at (0.5, 0.5)**: Center anchor point for tiles
   - Rationale: Coordinate formula calculates diamond center, not top-left
   - Impact: Prevents offset drift at chunk boundaries

3. **Static tile depth**: Depth calculated once at creation
   - Rationale: Tiles never move, no need for dynamic updates
   - Impact: Performance optimization (no per-frame depth recalculation for tiles)

4. **Transform exposure**: Public getter for IsometricTransform instance
   - Rationale: Other components (EntityRenderer, input handlers) need same coordinate conversion
   - Impact: Single source of truth for coordinate math, ensures consistency

## Deviations from Plan

None - plan executed exactly as written.

## Testing & Verification

- TypeScript compilation: PASSED (no errors in apps/web)
- IsometricTransform exports all 4 methods: gridToScreen, screenToGrid, screenToTile, calculateDepth
- TileRenderer uses isometric positioning with centered origin
- Both commits verified via git log

## Known Issues & Limitations

None at this stage. Foundation established for next components:
- EntityRenderer will need similar isometric positioning
- ViewportCuller needs expansion for diamond-shaped culling
- Input handlers need screen-to-grid conversion for click-to-move

## Next Steps

This plan provides the coordinate transformation foundation. Subsequent plans will:
1. Update EntityRenderer for isometric entity positioning with shadows
2. Implement depth sorting manager for dynamic entities
3. Adapt ViewportCuller for diamond-shaped culling
4. Update camera tracking and input handling for isometric coordinates

## Self-Check: PASSED

**Files created:**
- FOUND: apps/web/src/game/utils/IsometricTransform.ts

**Commits exist:**
- FOUND: b102520 (Task 1 - IsometricTransform utility)
- FOUND: bdbd15a (Task 2 - TileRenderer update)

**TypeScript compilation:**
- PASSED: No compilation errors in apps/web

**Isometric integration:**
- VERIFIED: TileRenderer imports and uses IsometricTransform
- VERIFIED: Tiles positioned via gridToScreen()
- VERIFIED: Origin set to (0.5, 0.5)
- VERIFIED: Depth assigned based on screen Y position
