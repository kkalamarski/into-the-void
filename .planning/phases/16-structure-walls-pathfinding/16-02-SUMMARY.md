---
phase: 16-structure-walls-pathfinding
plan: 02
subsystem: rendering
tags: [elevation, click-detection, isometric, input]
dependency_graph:
  requires: [IsometricTransform, WorldScene, TileRenderer elevation system]
  provides: [elevation-aware click detection]
  affects: [click-to-move, pathfinding, user input]
tech_stack:
  added: [screenToTileWithElevation method]
  patterns: [callback-based elevation lookup, iterative coordinate adjustment]
key_files:
  created: []
  modified:
    - apps/web/src/game/utils/IsometricTransform.ts
    - apps/web/src/game/scenes/WorldScene.ts
decisions:
  - "Single-pass elevation adjustment (not iterative) - sufficient for small elevations"
  - "Default elevationHeightStep=16 matches ELEVATION_HEIGHT_STEP constant"
  - "Callback pattern for elevation lookup maintains decoupling"
metrics:
  duration: 122
  tasks_completed: 2
  files_modified: 2
  completed_date: 2026-02-16
---

# Phase 16 Plan 02: Elevation-Aware Click Detection Summary

**One-liner:** Clicking on elevated tiles now resolves to correct grid coordinates by adjusting for visual elevation offset

## Objective Achieved

Implemented elevation-aware screenToTile transformation so clicks on elevated terrain register on the visually correct tile instead of being displaced by the elevation offset.

## Tasks Completed

### Task 1: Add elevation-aware screenToTile to IsometricTransform
**Commit:** 207b751
**Files:** `apps/web/src/game/utils/IsometricTransform.ts`

Added `screenToTileWithElevation` method that:
- Accepts callback to get elevation at any grid coordinate
- Performs initial tile guess
- Adjusts screenY by elevation * heightStep
- Re-calculates tile coordinates with adjustment

**Key implementation:**
- Single adjustment pass (research showed iterative convergence not needed)
- Default elevationHeightStep=16 matches TileRenderer constant
- Callback pattern keeps IsometricTransform decoupled from scene

### Task 2: Use elevation-aware click detection in WorldScene
**Commit:** 1c56ea8
**Files:** `apps/web/src/game/scenes/WorldScene.ts`

Updated click handler to use elevation-aware detection:
- Replaced `screenToTile` with `screenToTileWithElevation`
- Passed `getTileElevation` callback for height lookup
- Clicks now account for visual elevation offset

**Integration points:**
- getTileElevation already exists in WorldScene (line 373)
- Click marker and pathfinding use corrected coordinates
- Backward compatible - flat terrain (elevation 0) works unchanged

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 3 - Blocking] Fixed incorrect SimplexNoise method name**
- **Found during:** Task 2 verification build
- **Issue:** `packages/world-gen/src/generation/structures.ts` line 65 called `noise.noise()` instead of `noise.noise2D()`
- **Fix:** Changed method call to use correct SimplexNoise API
- **Files modified:** packages/world-gen/src/generation/structures.ts
- **Commit:** Included in Task 2 commit (1c56ea8)
- **Reason:** TypeScript compilation blocked - prevented verification of plan tasks

## Verification Results

1. **TypeScript compilation:** PASSED - `pnpm nx build web` succeeds
2. **Integration test:** PASSED - Click handler properly calls new method with elevation callback
3. **Backward compatibility:** PASSED - Flat terrain (elevation 0) uses same code path

## Technical Notes

**Elevation adjustment formula:**
```typescript
adjustedScreenY = screenY + elevation * elevationHeightStep
```

Reasoning: Elevated tiles appear higher on screen (smaller Y value), so we add to screenY to compensate before coordinate conversion.

**Callback pattern benefits:**
- IsometricTransform stays pure (no scene dependencies)
- Flexible elevation sources (could use server data, local cache, etc.)
- Easy to test in isolation

## Integration Status

**Integrated with:**
- Click-to-move system (pathfinding uses corrected coordinates)
- Hover system (click marker appears on correct tile)
- Elevation rendering (Phase 15 getTileElevation helper)

**Dependencies satisfied:**
- Requires getTileElevation from WorldScene (existed from Phase 15)
- Requires heights[][] data in ChunkData (existed from Phase 13)

## Self-Check

**Checking created files:**
No new files created (modifications only).

**Checking commits:**
```
207b751 - feat(16-02): add elevation-aware screenToTile method
1c56ea8 - feat(16-02): use elevation-aware click detection
```

## Self-Check: PASSED

All commits verified, all modified files exist, build passes.
