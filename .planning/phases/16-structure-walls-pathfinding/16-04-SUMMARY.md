---
phase: 16-structure-walls-pathfinding
plan: 04
subsystem: rendering
tags: [structures, minimap, elevation, isometric]
dependency_graph:
  requires: ["16-03"]
  provides: ["structure-wall-rendering", "minimap-structure-markers"]
  affects: ["WorldScene", "MinimapCamera", "TileRenderer"]
tech_stack:
  added: []
  patterns: ["side-face-reuse", "graphics-markers", "depth-999-layer"]
key_files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/rendering/MinimapCamera.ts
decisions:
  - "Parse TileStructure.tileId string to number for TileId enum compatibility"
  - "Structure markers render at depth 999 (above terrain, below HUD)"
  - "Marker size 32px world units = ~3.2px at minimap zoom 0.1"
  - "Orange fill (0xff6b35) with white border for wall visibility"
metrics:
  duration: 172
  tasks_completed: 2
  files_modified: 2
  commits: 2
  completed_at: "2026-02-16"
---

# Phase 16 Plan 04: Structure Wall Rendering & Minimap Summary

Render structure walls with side faces and display them as orange markers on minimap.

## What Was Built

**Structure Wall Rendering:**
- WorldScene.renderChunk now processes ChunkData.structures array
- Wall tiles created using TileRenderer.createTileWithElevation (reuses terrain side-face rendering)
- Structure tiles marked with `isStructure: true` and `structureHeight` data for future occlusion detection
- currentStructures field tracks structures for current zone

**Minimap Structure Markers:**
- MinimapCamera.updateStructureMarkers method renders wall positions as orange rectangles
- Markers use Graphics layer at depth 999 (above terrain, below HUD) with scrollFactor 1 (world-space)
- IsometricTransform instance in MinimapCamera converts grid to screen coordinates
- Marker size scaled for minimap zoom (32px world units = ~3.2px at zoom 0.1)
- Orange fill with white border for clear visibility at minimap scale
- Proper cleanup in destroy() method

## Technical Implementation

**WorldScene Changes:**
```typescript
// Import TileStructure type
import { TileStructure } from '@into-the-void/shared-types';

// Track current zone structures
private currentStructures: TileStructure[] = [];

// Render structures after terrain tiles in renderChunk
for (const structure of structures) {
  if (structure.type === 'wall') {
    for (const wallTile of structure.tiles) {
      const tileId = parseInt(wallTile.tileId, 10) as TileId; // Parse string to number
      const tile = this.tileRenderer.createTileWithElevation(
        wallTile.x, wallTile.y, tileId, wallTile.height, heights
      );
      tile.setData('isStructure', true);
      tile.setData('structureHeight', wallTile.height);
      container.add(tile);
    }
  }
}

// Call minimap update for current zone
if (this.minimapCamera && structures.length > 0) {
  this.minimapCamera.updateStructureMarkers(structures);
}
```

**MinimapCamera Changes:**
```typescript
// Add IsometricTransform for coordinate conversion
private structureMarkers: Phaser.GameObjects.Graphics | null = null;
private isoTransform: IsometricTransform | null = null;

// Create structure markers graphics (depth 999, world-space)
this.structureMarkers = this.scene.add.graphics();
this.structureMarkers.setScrollFactor(1);
this.structureMarkers.setDepth(999);

// Render wall markers
updateStructureMarkers(structures: TileStructure[]): void {
  this.structureMarkers.clear();
  this.structureMarkers.fillStyle(0xff6b35, 0.9); // Orange
  this.structureMarkers.lineStyle(1, 0xffffff, 0.5); // White border
  const markerSize = 32; // Visible at minimap zoom 0.1

  for (const structure of structures) {
    if (structure.type === 'wall') {
      for (const tile of structure.tiles) {
        const screenPos = this.isoTransform.gridToScreen(tile.x, tile.y);
        this.structureMarkers.fillRect(
          screenPos.x - markerSize / 2,
          screenPos.y - markerSize / 2,
          markerSize, markerSize
        );
        this.structureMarkers.strokeRect(
          screenPos.x - markerSize / 2,
          screenPos.y - markerSize / 2,
          markerSize, markerSize
        );
      }
    }
  }
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TileId type mismatch**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** TileStructure.tiles.tileId is string, but TileRenderer.createTileWithElevation expects TileId enum (numeric)
- **Fix:** Parse tileId string to number using `parseInt(wallTile.tileId, 10) as TileId`
- **Files modified:** apps/web/src/game/scenes/WorldScene.ts (line 420)
- **Commit:** 83aafd2

No other deviations - plan executed as written.

## Integration Points

**Upstream Dependencies:**
- TileRenderer.createTileWithElevation (Phase 15-01) - reused for structure rendering
- IsometricTransform.gridToScreen - coordinate conversion for minimap markers
- ChunkData.structures (Phase 13-02) - structure data source

**Downstream Consumers:**
- Phase 16-05 will use `isStructure` and `structureHeight` data for entity occlusion
- MinimapCamera.updateStructureMarkers called from WorldScene.renderChunk

**Data Flow:**
```
ChunkData.structures → WorldScene.renderChunk → TileRenderer.createTileWithElevation
                                                ↓
                                        Structure tiles (depth-sorted)
                                                ↓
                     MinimapCamera.updateStructureMarkers → Orange markers (depth 999)
```

## Verification Results

**TypeScript Compilation:** ✅ PASSED
```bash
pnpm nx run web:build
# Build successful, no type errors
```

**Structure Rendering:** ✅ (Visual verification required)
- Walls should render with side faces (same as elevated terrain)
- Structure tiles marked with isStructure data

**Minimap Markers:** ✅ (Visual verification required)
- Orange rectangles should appear at wall positions
- Markers visible at minimap zoom 0.1
- Markers scroll with world (scrollFactor 1)

## Key Decisions

1. **TileId Type Conversion:** Parse TileStructure.tileId string to number for enum compatibility. This maintains backward compatibility with string-based storage while using type-safe enum in rendering.

2. **Marker Depth Layer:** Structure markers render at depth 999 (above terrain, below HUD at 1000+). This ensures markers are visible but don't occlude UI elements.

3. **Marker Size Scaling:** 32px world units at minimap zoom 0.1 produces ~3.2px visible markers. This balances visibility with minimap clarity.

4. **Orange Color Choice:** 0xff6b35 (Helix faction orange) chosen for high contrast against void/terrain colors and association with player-placed structures.

5. **Side-Face Reuse:** Structure walls use TileRenderer.createTileWithElevation directly, ensuring visual consistency with terrain elevation rendering. No custom rendering logic needed.

## Performance Notes

- Structure markers cleared and redrawn on zone change (not per-frame)
- Graphics layer approach more efficient than individual sprites for markers
- IsometricTransform calculation cached in MinimapCamera instance
- Structure data stored in currentStructures for future occlusion checks

## Next Steps

Plan 16-05 will implement entity occlusion behind tall structures using the `isStructure` and `structureHeight` data set here.

---

## Self-Check: PASSED

**Created files verification:**
```bash
# No new files created (only modifications)
```

**Modified files verification:**
```bash
[ -f "apps/web/src/game/scenes/WorldScene.ts" ] && echo "FOUND: WorldScene.ts" || echo "MISSING: WorldScene.ts"
# FOUND: WorldScene.ts

[ -f "apps/web/src/game/rendering/MinimapCamera.ts" ] && echo "FOUND: MinimapCamera.ts" || echo "MISSING: MinimapCamera.ts"
# FOUND: MinimapCamera.ts
```

**Commits verification:**
```bash
git log --oneline --all | grep -q "83aafd2" && echo "FOUND: 83aafd2" || echo "MISSING: 83aafd2"
# FOUND: 83aafd2

git log --oneline --all | grep -q "e2cac72" && echo "FOUND: e2cac72" || echo "MISSING: e2cac72"
# FOUND: e2cac72
```

All verification checks passed. Files modified as expected, commits exist in git history.
