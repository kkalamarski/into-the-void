---
phase: quick
plan: "17"
subsystem: movement, rendering, debug
tags: [bug-fix, collision, elevation, debug-overlay, zone-transition]
key-files:
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/scenes/controllers/EntityManager.ts
    - packages/game-logic/src/movement/pixel-validation.ts
    - apps/web/src/game/systems/DebugCollisionRenderer.ts
decisions:
  - zone:request deduplication uses lastRequestedZoneId property, reset on every committed transition
  - player Y offset uses Math.round(elevation) so position snaps to discrete elevation steps
  - isometric wall collision threshold changed from TILE_SIZE_PX * 0.5 to 0 (full tile blocked)
  - debug iso-extension uses green filled diamond to distinguish invisible walls from solid colliders
metrics:
  duration: "~10 minutes"
  completed: "2026-03-24T15:25:00Z"
  tasks_completed: 4
  files_modified: 4
---

# Quick Task 17: Fix 4 Bugs — Chunk Spam, Sinking, Collision, Debug View

One-liner: Fixed zone:request spam, float-elevation sinking, wall collision threshold, and added iso-extension debug visualization.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Fix chunk request spam — deduplicate zone:request per boundary crossing | 8422949 |
| 2 | Fix player sinking — round elevation before computing Y offset | d027845 |
| 3 | Fix wall collision — block full tile above elevated south neighbor | 1396b96 |
| 4 | Fix debug collision view — expanded culling + iso-extension green diamonds | cb7456a |

## What Was Done

### Task 1 — Chunk Request Spam (WorldScene.ts)

Added `lastRequestedZoneId: string | null` property to `WorldScene`. In `checkPixelZoneTransition()`, the `zone:request` emit is now guarded by `newZoneId !== this.lastRequestedZoneId`. The property is set on emit and reset to `null` in both `commitZoneTransition()` and `fullZoneReset()`, ensuring future transitions to different zones still fire.

### Task 2 — Player Sinking (EntityManager.ts)

In `updateLocalPlayerFromPixels()`, `Math.round(elevation)` was previously applied after the `elevationOffset` calculation (line 684 used the raw float). Moved the rounding before offset calculation so `elevationOffset = Math.round(elevation) * ELEVATION_HEIGHT_STEP` — the player's Y position now snaps to discrete 64px steps, eliminating intermediate sinking positions when crossing elevation boundaries.

### Task 3 — Wall Collision (pixel-validation.ts)

In `createIsometricCollisionCheck()`, the sub-tile precision threshold for south-neighbor blocking was `TILE_SIZE_PX * 0.5` (64px into the tile). Changed to `0` (tile start), so the entire tile north of an elevated wall is blocked. With 64px elevation step, walls visually occupy the full tile above — the threshold now matches the visual.

### Task 4 — Debug Collision Visualization (DebugCollisionRenderer.ts)

Four improvements:
- `CollisionDataSource` interface gains `getHeights: () => number[][] | null`
- Camera culling bounds expanded from 1x to 2x tile dimensions in each direction
- New `drawIsoExtensionBlocking()` method: iterates non-blocking tiles, checks if south neighbor (y+1) is blocking and elevated >= 1, draws a semi-transparent green filled diamond for each match
- New `fillIsoDiamond()` helper for filled polygon rendering
- WorldScene wires `getHeights: () => this.currentHeights` in the DataSource object

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `lastRequestedZoneId` added to WorldScene zone state block
- [x] `zone:request` guard in `checkPixelZoneTransition()`
- [x] `lastRequestedZoneId = null` in both `commitZoneTransition` and `fullZoneReset`
- [x] `elevationRounded` computed before `elevationOffset` in `updateLocalPlayerFromPixels`
- [x] Collision threshold changed to 0 in `createIsometricCollisionCheck`
- [x] `getHeights` in CollisionDataSource interface
- [x] `drawIsoExtensionBlocking` added with correct south-neighbor check
- [x] Camera bounds 2x tile dimensions
- [x] Build passes (vite production build, 4 commits)
