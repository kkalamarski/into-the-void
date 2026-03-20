---
phase: quick-12
plan: 01
subsystem: web-rendering
tags: [player-rendering, elevation, interpolation, isometric, quick-fix]
dependency_graph:
  requires: []
  provides: [smooth-elevation-transitions-for-player-sprites]
  affects: [WorldScene.updateLocalPlayerFromPixels, WorldScene.updateRemotePlayerInterpolation]
tech_stack:
  added: []
  patterns: [bilinear-interpolation]
key_files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
decisions:
  - "Use bilinear interpolation (4-corner sample) rather than linear (2-corner) to handle diagonal movement across elevation steps correctly"
  - "Keep Math.round(elevation) for setData('elevation') and calculateDepth so depth sorting remains on discrete integer tile levels"
  - "Do not pass zoneId to getInterpolatedElevation at the two call sites — local and remote pixel rendering always operates within currentZoneId"
metrics:
  duration: 8min
  completed: "2026-03-20"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 12: Fix Player Sinking Issue Summary

**One-liner:** Bilinear elevation interpolation for player sprite Y-offset eliminates 128 px snap when crossing tile boundaries with differing elevation.

## What Was Done

Added `getInterpolatedElevation(gridX, gridY, zoneId?)` to `WorldScene` and switched both pixel-movement rendering paths to use it instead of `getTileElevation`.

### Root Cause

`updateLocalPlayerFromPixels` and `updateRemotePlayerInterpolation` computed elevation via `getTileElevation(Math.floor(gridX), Math.floor(gridY))`.  When the player crossed a tile boundary the integer tile coordinate changed instantaneously, causing the `elevation * 128` Y-offset to jump by 128 px per elevation level.  With noise-based height generation producing elevation values 0-3, this produced visible "sinking" or "popping" artefacts even on tiles that appear flat on screen.

### Fix

```typescript
private getInterpolatedElevation(gridX: number, gridY: number, zoneId?: string): number {
  const tileX = Math.floor(gridX);
  const tileY = Math.floor(gridY);
  const fracX = gridX - tileX;
  const fracY = gridY - tileY;

  const e00 = this.getTileElevation(tileX,     tileY,     zoneId);
  const e10 = this.getTileElevation(tileX + 1, tileY,     zoneId);
  const e01 = this.getTileElevation(tileX,     tileY + 1, zoneId);
  const e11 = this.getTileElevation(tileX + 1, tileY + 1, zoneId);

  return e00 * (1 - fracX) * (1 - fracY)
       + e10 * fracX       * (1 - fracY)
       + e01 * (1 - fracX) * fracY
       + e11 * fracX       * fracY;
}
```

`Math.round(elevation)` is passed to `setData('elevation')` and `calculateDepth` so the depth-sorting system continues to use integer tile levels.

`getTileElevation` and all tile rendering paths (`TileRenderer`, `createTileWithElevationWorld`) are unchanged.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `getInterpolatedElevation` method exists at line 1490
- [x] Called from `updateLocalPlayerFromPixels` at line 2182
- [x] Called from `updateRemotePlayerInterpolation` at line 2315
- [x] `getTileElevation` unmodified
- [x] Build passes (`npx nx run web:build`) — 0 TypeScript errors
- [x] Commit b190848 exists
