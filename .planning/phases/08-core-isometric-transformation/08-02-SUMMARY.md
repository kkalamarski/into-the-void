---
phase: 08-core-isometric-transformation
plan: 02
subsystem: rendering
tags: [isometric, entity-rendering, depth-sorting, shadows, visual-feedback]

dependency_graph:
  requires:
    - 08-01-IsometricTransform
  provides:
    - isometric-entity-containers
    - blob-shadow-rendering
    - throttled-depth-sorting
  affects:
    - GameScene (will need to integrate DepthSorter)
    - entity-movement (updateEntityPosition available)

tech_stack:
  added:
    - DepthSorter class for throttled depth management
  patterns:
    - Mark-dirty pattern for efficient depth updates
    - Priority boost for local player visibility
    - Blob shadow for ground-level visual cues

key_files:
  created:
    - apps/web/src/game/rendering/DepthSorter.ts
  modified:
    - apps/web/src/game/rendering/EntityRenderer.ts

decisions:
  - decision: Elevation offset set to 12px
    rationale: Provides visible hover effect without excessive separation
    alternatives: [8px (too subtle), 16px (too floaty)]
  - decision: Blob shadow as 40x20 ellipse
    rationale: Matches isometric angle, non-directional per user decision
    alternatives: [circular shadow, directional shadow]
  - decision: Depth update throttle at 100ms
    rationale: Balance between smoothness and CPU usage
    alternatives: [60ms (smoother, heavier), 200ms (lighter, choppier)]
  - decision: Local player priority boost 0.001
    rationale: Ensures player always visible without affecting sort order visibly
    alternatives: [0.01 (too strong), 0.0001 (too weak)]

metrics:
  duration: 4m 44s
  tasks_completed: 2
  files_modified: 2
  commits: 2
  lines_added: 161
  lines_removed: 11
  completed_at: 2026-02-16T11:30:52Z
---

# Phase 08 Plan 02: Isometric Entity Rendering with Depth Summary

**One-liner:** Isometric entity containers with blob shadows (ellipse at ground), 12px elevation, and throttled Y-based depth sorting (100ms).

## Objective Achievement

Updated EntityRenderer for isometric positioning with blob shadows and created DepthSorter for efficient depth management. Entities now render at correct isometric coordinates with proper layering and visual depth cues.

## Tasks Completed

### Task 1: Update EntityRenderer for isometric with shadows
**Commit:** eec4152

Updated EntityRenderer to use IsometricTransform for coordinate conversion:
- Added `isoTransform` property and updated constructor to accept tileWidth/tileHeight
- Modified `createEntityContainer` to use `gridToScreen()` for positioning
- Added blob shadow (40x20 ellipse, 0.3 alpha) at ground level (container origin)
- Elevated entity sprite 12px above ground with bottom-center origin
- Store grid position in container data for depth sorting
- Calculate depth using `calculateDepth()` with Y + X tiebreaker
- Added `updateEntityPosition()` method for movement updates
- Added `getTransform()` getter for external access

**Files modified:** apps/web/src/game/rendering/EntityRenderer.ts

### Task 2: Create DepthSorter for throttled updates
**Commit:** 1f7e4e8

Created DepthSorter class for efficient depth management:
- Mark-dirty pattern: `markDirty()` tracks entities needing depth recalculation
- Throttled `update()` method (100ms default interval)
- Priority boost for local player (0.001) to ensure visibility
- `updateImmediate()` method for critical cases (bypasses throttling)
- `setUpdateInterval()` for performance tuning
- `clear()` method to reset tracking

**Files created:** apps/web/src/game/rendering/DepthSorter.ts

## Verification Results

All verification checks passed:
- TypeScript compiles without errors
- EntityRenderer creates containers with blob shadow ellipse at ground level
- EntityRenderer uses isometric positioning via isoTransform
- DepthSorter exists with markDirty/update methods
- Depth sorting uses Y + X*0.0001 formula with local player priority boost
- DepthSorter throttles updates to 100ms intervals

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Notes

**Blob Shadow Design:**
- Used ellipse (40x20) to match isometric angle
- Positioned at container origin (ground level)
- Black with 0.3 alpha for soft shadow effect
- Non-directional per user decision (not sun-based)

**Entity Elevation:**
- 12px offset provides visible hover without excessive separation
- Sprite uses bottom-center origin for proper ground alignment
- Health bar and behavior icon positioned relative to elevated sprite

**Depth Sorting:**
- Container stores grid position in Phaser data for sorting
- Initial depth calculated in createEntityContainer
- DepthSorter handles ongoing updates via mark-dirty pattern
- 100ms throttle balances visual smoothness with CPU usage

**Integration Path:**
- GameScene will need to instantiate DepthSorter
- Call `depthSorter.markDirty(entityId)` on entity movement
- Call `depthSorter.update(time, entities, transform)` in scene update loop
- EntityRenderer.updateEntityPosition() updates position and depth inline

## Success Criteria Met

- [x] Entities position at isometric screen coordinates
- [x] Blob shadow (ellipse) renders at ground level beneath entity
- [x] Entity sprites elevated 12px above ground
- [x] Depth sorting uses Y + X*0.0001 formula with local player priority boost
- [x] DepthSorter throttles updates to 100ms intervals
- [x] Code compiles without TypeScript errors

## Next Steps

Recommended follow-up work (not in current plan):
1. Integrate DepthSorter into GameScene
2. Wire up markDirty calls on entity movement
3. Test depth sorting with multiple entities at same Y coordinate
4. Verify blob shadow appearance with various tile colors
5. Performance profiling with 200+ entities

## Self-Check

**Files created:**
- apps/web/src/game/rendering/DepthSorter.ts: FOUND

**Files modified:**
- apps/web/src/game/rendering/EntityRenderer.ts: FOUND

**Commits:**
- eec4152: FOUND
- 1f7e4e8: FOUND

**Self-Check: PASSED**
