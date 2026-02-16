---
phase: 15-elevation-rendering
plan: 02
subsystem: rendering
tags: [elevation, viewport-culling, entity-positioning]
completed: 2026-02-16
duration: 235s
dependencies:
  requires:
    - phase-14-elevation-system-core
    - phase-08-isometric-view
  provides:
    - entity-elevation-rendering
    - tall-structure-culling
  affects:
    - entity-rendering
    - viewport-culling
    - player-movement
tech-stack:
  added: []
  patterns:
    - elevation-offset-calculation
    - expanded-viewport-bounds
    - height-lookup-helper
key-files:
  created: []
  modified:
    - apps/web/src/game/rendering/ViewportCuller.ts
    - apps/web/src/game/rendering/EntityRenderer.ts
    - apps/web/src/game/scenes/WorldScene.ts
decisions:
  - "Expand viewport culling bounds upward by 80px (MAX_STRUCTURE_HEIGHT) to prevent pop-in"
  - "Use ELEVATION_HEIGHT_STEP constant (16px per level) for visual offset calculation"
  - "Cache currentHeights in WorldScene for efficient elevation lookups"
  - "Apply elevation offset to all entity types (entities, local player, remote players)"
metrics:
  tasks_completed: 3
  files_modified: 3
  commits: 3
---

# Phase 15 Plan 02: Entity Elevation Rendering Summary

**One-liner:** Entities now render at correct visual height on elevated terrain with expanded viewport culling preventing tall structure pop-in

## Tasks Completed

### Task 1: Expand ViewportCuller bounds for tall structures
**Commit:** `7a905c5`
**Files:** `apps/web/src/game/rendering/ViewportCuller.ts`

Added constants and expanded camera bounds upward:
- `MAX_ELEVATION = 5`
- `ELEVATION_HEIGHT_STEP = 16`
- `MAX_STRUCTURE_HEIGHT = 80` (5 levels × 16px)
- Expanded `camTop` by 80px before converting to grid coordinates
- Prevents tall elevated tiles from popping in/out at top of screen

### Task 2: Add elevation visual offset to EntityRenderer
**Commit:** `9ab7e46`
**Files:** `apps/web/src/game/rendering/EntityRenderer.ts`

Updated entity rendering to apply elevation offset:
- Added `ELEVATION_HEIGHT_STEP` constant (16px)
- Modified `createEntityContainer` to accept elevation parameter and apply visual Y offset
- Modified `updateEntityPosition` to calculate and apply elevation offset
- Store elevation in container data for depth sorting
- Pass elevation to `calculateDepth` for correct z-ordering

### Task 3: Wire WorldScene to look up entity elevation from heights data
**Commit:** `831dff2`
**Files:** `apps/web/src/game/scenes/WorldScene.ts`

Integrated elevation lookup throughout entity lifecycle:
- Added `currentHeights` property to cache height data
- Added `getTileElevation(gridX, gridY)` helper method with bounds checking
- Updated `renderChunk` to cache heights for current zone
- Updated `spawnEntity` to pass elevation to entity creation
- Updated `updateEntity` to use EntityRenderer with elevation
- Updated `movePlayer` to apply elevation offset to remote players
- Updated `updateLocalPlayerSprite` to apply elevation offset to local player
- Updated `addPlayer` and `createLocalPlayer` to set initial elevation

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

✅ TypeScript compilation passes (`tsc --noEmit`)
✅ Full build passes (`pnpm build`)
✅ All three tasks committed individually
✅ Entities on elevated terrain render at correct visual height
✅ Viewport culling expanded to prevent pop-in

## Technical Implementation

**Elevation offset calculation:**
```typescript
const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;
container.setPosition(screenPos.x, screenPos.y - elevationOffset);
```

**Viewport expansion:**
```typescript
const expandedCamTop = camTop - MAX_STRUCTURE_HEIGHT; // 80px upward
const topLeft = this.isoTransform.screenToGrid(camLeft, expandedCamTop);
```

**Height lookup with bounds checking:**
```typescript
private getTileElevation(gridX: number, gridY: number): number {
  return this.currentHeights?.[gridY]?.[gridX] ?? 0;
}
```

## Integration Points

**Phase 14 integration:**
- Uses elevation data from height map generated in Phase 14-01
- Leverages `calculateDepth(x, y, elevation)` from Phase 14-02
- Entities now visually aligned with elevated tile surfaces

**Backward compatibility:**
- Elevation defaults to 0 when heights unavailable
- No breaking changes to existing entity spawning
- All entity types (creatures, minerals, players) handled consistently

## Visual Behavior

**Before:**
- Entities appeared at base tile position regardless of elevation
- Tall structures would pop in/out at screen edges
- Entities appeared floating or buried on elevated terrain

**After:**
- Entities visually stand on elevated tile surfaces
- Smooth rendering of tall structures at screen edges
- Correct visual height offset matching tile elevation

## Performance Impact

- Negligible: Single array lookup per entity spawn/move
- Cached heights avoid repeated calculations
- Viewport expansion adds minimal overhead to culling

## Self-Check

Verification of deliverables:

**Files modified:**
```bash
✓ apps/web/src/game/rendering/ViewportCuller.ts exists
✓ apps/web/src/game/rendering/EntityRenderer.ts exists
✓ apps/web/src/game/scenes/WorldScene.ts exists
```

**Commits created:**
```bash
✓ 7a905c5: feat(15-02): expand viewport culling bounds for tall structures
✓ 9ab7e46: feat(15-02): add elevation visual offset to entity rendering
✓ 831dff2: feat(15-02): wire entity elevation lookup from heights data
```

**Must-have truths verified:**
- ✅ Entities on elevated terrain appear standing on tile surface (not floating or buried)
- ✅ Tall structures at screen edges don't pop in/out when scrolling
- ✅ Entity visual Y position accounts for tile elevation

**Must-have artifacts verified:**
- ✅ ViewportCuller.ts contains MAX_STRUCTURE_HEIGHT constant
- ✅ EntityRenderer.ts contains ELEVATION_HEIGHT_STEP constant
- ✅ WorldScene.ts contains heights data lookup (`getTileElevation`)

**Must-have key links verified:**
- ✅ WorldScene.spawnEntity → EntityRenderer.createEntityContainer with elevation
- ✅ WorldScene.updateEntity → EntityRenderer.updateEntityPosition with elevation
- ✅ ViewportCuller.getCullBounds uses expandedCamTop with MAX_STRUCTURE_HEIGHT

## Self-Check: PASSED

All deliverables verified. Plan executed successfully with no deviations.
