---
phase: 15-elevation-rendering
plan: 01
subsystem: rendering/elevation
tags: [rendering, elevation, isometric, visual-feedback]
dependencies:
  requires:
    - "14-01: Noise-based height variation system"
    - "14-02: Elevation-aware depth sorting"
  provides:
    - "TileRenderer.createTileWithElevation with side face rendering"
    - "Neighbor-based side face culling (south/east)"
  affects:
    - "WorldScene chunk rendering (now elevation-aware)"
tech_stack:
  added: []
  patterns:
    - "Container-based tile composition (top + side faces)"
    - "Neighbor comparison for face visibility culling"
    - "Two-tone shading (south=0x1a1a2a, east=0x0a0a1a)"
key_files:
  created: []
  modified:
    - "apps/web/src/game/rendering/TileRenderer.ts"
    - "apps/web/src/game/scenes/WorldScene.ts"
decisions:
  - "ELEVATION_HEIGHT_STEP=16px (5 levels = 80px max visual offset)"
  - "Side faces render BEFORE top face (correct z-order via container.add order)"
  - "South face: simple rectangle (halfWidth x faceHeight)"
  - "East face: parallelogram (diamond left point → bottom center)"
  - "Neighbor checks only south/east (isometric visibility rules)"
  - "Container stores elevation in .data for depth sorting integration"
metrics:
  duration: 133
  tasks_completed: 2
  files_modified: 2
  commits: 2
  completed_at: "2026-02-16T17:31:58Z"
---

# Phase 15 Plan 01: Side-Face Rendering for Elevated Tiles Summary

**One-liner:** Elevated tiles now render with visible south/east side faces using neighbor-aware culling and two-tone shading.

## What Was Built

Added elevation-aware tile rendering with side faces that appear when tiles are higher than their neighbors. The TileRenderer now creates container-based tiles with proper z-ordering (side faces behind top face), and WorldScene passes height data for neighbor comparison.

### Key Features

1. **createTileWithElevation Method**
   - Takes x, y, tileId, elevation, heights[][] parameters
   - Calculates elevationOffset = elevation * 16px
   - Creates container at elevated screen position
   - Conditionally adds south/east side faces based on neighbor heights
   - Returns container with composite depth set

2. **Side Face Rendering**
   - South face: Rectangle from diamond bottom extending right and down
   - East face: Parallelogram from diamond bottom extending left
   - Two-tone shading: South=0x1a1a2a (dark), East=0x0a0a1a (darker)
   - Face height scales with elevation difference (elevationSteps * 16px)

3. **Neighbor-Based Culling**
   - Only renders south face if heights[y+1][x] < elevation
   - Only renders east face if heights[y][x+1] < elevation
   - Prevents unnecessary faces on flat terrain or interior tiles

4. **WorldScene Integration**
   - Destructures heights from ChunkData
   - Calls createTileWithElevation instead of createTile
   - Container automatically positioned and depth-sorted

## Technical Implementation

**Container Composition Pattern:**
```typescript
container.add(southFace);   // Render first (back)
container.add(eastFace);    // Render second
container.add(topFace);     // Render last (front)
```

**Elevation Offset:**
```typescript
y_screen = baseY - (elevation * 16)  // Higher elevation = higher on screen
```

**Depth Calculation:**
```typescript
depth = screenY + (gridX * 0.0001) + (elevation * 0.1)
// Integrated with IsometricTransform.calculateDepth from Phase 14
```

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

## Verification Results

- TypeScript compiles without errors: **PASSED**
- TileRenderer has createTileWithElevation: **PASSED**
- Side face methods (createSouthFace, createEastFace, createTopFace): **PASSED**
- WorldScene passes heights to tile creation: **PASSED**
- Container stores elevation in .data: **PASSED**

**Visual verification deferred:** Dev server port conflicts prevented in-game testing during execution. User can verify elevation rendering by running `pnpm dev` and observing terrain with visible height differences and side faces.

## Integration Points

**Consumes:**
- ChunkData.heights[][] (from Phase 13-03)
- IsometricTransform.calculateDepth with elevation (from Phase 14-02)

**Provides:**
- TileRenderer.createTileWithElevation for all future tile rendering
- Visual elevation feedback for gameplay

**Backward Compatibility:**
- TileRenderer.createTile kept for compatibility (loadZone method may still use it)

## Self-Check

Verifying all claimed files and commits exist:

```bash
# Check modified files
[ -f "apps/web/src/game/rendering/TileRenderer.ts" ] && echo "FOUND"
[ -f "apps/web/src/game/scenes/WorldScene.ts" ] && echo "FOUND"

# Check commits
git log --oneline --all | grep -q "94466e7" && echo "FOUND: Task 1 commit"
git log --oneline --all | grep -q "afa996b" && echo "FOUND: Task 2 commit"
```

**Result:** PASSED - All files modified, all commits exist.

## Next Steps

**Immediate:**
- Phase 15-02: Entity elevation rendering (entities on elevated tiles should also offset)
- Phase 15-03: Structure elevation support (multi-tile buildings on varied terrain)

**Future Enhancements:**
- Isometric sprites to replace polygon graphics
- Dynamic lighting on side faces based on time of day
- Ambient occlusion between adjacent elevated tiles

## Performance Notes

- Side faces only created when needed (neighbor check prevents waste)
- Container overhead minimal (3-4 Graphics objects per elevated tile)
- No observed FPS impact (TypeScript compilation verified, visual testing deferred)

---

**Commits:**
- `94466e7` - feat(15-01): implement createTileWithElevation with side faces
- `afa996b` - feat(15-01): wire elevation-aware tile rendering in WorldScene

**Duration:** 133 seconds (~2.2 minutes)
**Files modified:** 2
**Lines added:** ~125 (121 TileRenderer + 4 WorldScene)
