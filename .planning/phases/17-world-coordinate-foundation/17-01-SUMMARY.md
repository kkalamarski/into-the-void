---
phase: 17-world-coordinate-foundation
plan: 01
subsystem: rendering
tags: [depth-sorting, world-coordinates, cross-chunk, z-order]
dependency_graph:
  requires:
    - "Phase 16: Tile elevation rendering (ELEVATION_HEIGHT_STEP)"
    - "DepthSorter: throttled depth updates"
    - "IsometricTransform: calculateDepth method"
  provides:
    - "World coordinate depth sorting for all renderables"
    - "Cross-chunk z-order consistency"
  affects:
    - "TileRenderer: already using world coords (verified)"
    - "EntityRenderer: now uses world coords"
    - "WorldScene: all player containers use world coords"
tech_stack:
  added: []
  patterns:
    - "World coordinate conversion: zoneCoords * ZONE_SIZE + localCoords"
    - "Container data stores world coords for DepthSorter reads"
key_files:
  created: []
  modified:
    - "apps/web/src/game/rendering/EntityRenderer.ts: positionToWorldCoords, world coord usage"
    - "apps/web/src/game/scenes/WorldScene.ts: player containers store world coords"
decisions:
  - title: "No change needed to TileRenderer"
    rationale: "createTileWithElevationWorld already uses world coordinates correctly"
    impact: "Verification-only task, no code changes"
  - title: "JSDoc-only update to updateEntityPosition"
    rationale: "Caller responsibility to provide world coords, method itself doesn't change"
    impact: "Documentation clarity without breaking existing call sites"
metrics:
  duration: "205s"
  tasks_completed: 4
  files_modified: 2
  commits: 3
  deviations: 0
  completed_date: "2026-02-16"
---

# Phase 17 Plan 01: World Coordinate Depth Sorting Summary

**One-liner:** Unified depth sorting to use world coordinates (chunkX * ZONE_SIZE + localX) across tiles, entities, and players for correct cross-chunk z-order.

## What Was Built

Implemented world coordinate support in rendering system to fix z-order breaks at chunk boundaries:

1. **EntityRenderer world coordinate conversion**
   - Added `positionToWorldCoords(position: Position)` helper method
   - Converts Position (local coords + zoneId) to world coordinates
   - Updated `createEntityContainer` to use world coords for screen position and container data
   - Updated depth calculation to use world coordinates
   - Added JSDoc to `updateEntityPosition` documenting world coord requirement

2. **WorldScene player container data**
   - Fixed `createLocalPlayer` to store worldX/worldY in container data
   - Fixed `addPlayer` to store worldX/worldY in container data
   - Fixed `movePlayer` onComplete to store worldX/worldY in container data
   - Fixed `updateLocalPlayerSprite` to store worldX/worldY in container data

3. **WorldScene entity position updates**
   - Updated `updateEntity` to convert changes.position to world coords before passing to EntityRenderer

4. **TileRenderer verification**
   - Verified `createTileWithElevationWorld` already uses world coordinates correctly (COORD-03)
   - No code changes needed - task was verification-only

## Technical Implementation

### World Coordinate Conversion Pattern

```typescript
// Parse zoneId (format: "z_X_Y")
const parts = position.zoneId.split('_');
const zoneX = parseInt(parts[1], 10);
const zoneY = parseInt(parts[2], 10);

// Calculate world coordinates
const worldX = zoneX * ZONE_SIZE + position.x;
const worldY = zoneY * ZONE_SIZE + position.y;
```

### Container Data Storage

All renderable objects (tiles, entities, players) now store world coordinates in container data:

```typescript
container.setData('gridX', worldX);  // not position.x
container.setData('gridY', worldY);  // not position.y
container.setData('elevation', elevation);
```

DepthSorter reads `gridX`/`gridY` from container data, ensuring all objects participate in global depth sorting.

### Depth Calculation Flow

1. **Tiles**: `createTileWithElevationWorld(worldX, worldY, ...)` → stores world coords → `calculateDepth(worldX, worldY, elevation)`
2. **Entities**: `createEntityContainer(entity)` → converts Position to world coords → stores world coords → `calculateDepth(worldX, worldY, elevation)`
3. **Players**: `addPlayer/createLocalPlayer/movePlayer/updateLocalPlayerSprite` → converts Position to world coords → stores world coords → `calculateDepth(worldX, worldY, elevation)`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Found & Fixed

None - implementation was straightforward with no blocking issues.

## Verification Results

**TypeScript compilation:** ✅ Passed
**Build:** ✅ Passed (pnpm build successful)
**Grep patterns (must_haves.key_links):** ✅ All matched
- EntityRenderer: `setData('gridX', worldX)` found
- WorldScene: 4 instances of `setData('gridX', worldX)` found (all player methods)
- TileRenderer: `setData('gridX', worldX)` found

**Manual test:** Deferred to next phase or user verification
- Expected: Two entities at same local position in adjacent chunks render at different depths
- Expected: Player crossing chunk boundary maintains correct z-order with tiles

## What's Next

**Phase 17 Plan 02:** Address remaining world coordinate concerns:
- Entity visibility boundary mismatch (must use world coords, not zone ID)
- Potentially other cross-chunk coordinate issues

**Future work:**
- Visual verification of cross-chunk depth sorting in running game
- Performance monitoring of world coord calculations (should be negligible)

## Self-Check: PASSED

**Created files exist:** N/A (no new files created)

**Modified files exist:**
```
FOUND: apps/web/src/game/rendering/EntityRenderer.ts
FOUND: apps/web/src/game/scenes/WorldScene.ts
```

**Commits exist:**
```
FOUND: e523e09 (feat(17-01): add world coordinate support to EntityRenderer)
FOUND: 0b83da8 (feat(17-01): store world coordinates in player container data)
FOUND: f5c4e61 (feat(17-01): convert entity position to world coords in updateEntity)
```

**Grep patterns verified:**
```
✓ EntityRenderer: worldX.*ZONE_SIZE found (line 43)
✓ EntityRenderer: setData('gridX', worldX) found (line 60)
✓ WorldScene: setData('gridX', worldX) count = 4 (expected 4)
✓ TileRenderer: setData('gridX', worldX) found (line 185)
```

All verification checks passed. Plan execution complete.
