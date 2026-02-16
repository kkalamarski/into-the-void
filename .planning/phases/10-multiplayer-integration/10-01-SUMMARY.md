---
phase: 10-multiplayer-integration
plan: 01
subsystem: multiplayer-rendering
tags: [depth-sorting, remote-players, multiplayer, rendering]
dependency_graph:
  requires: [phase-09-rendering-optimization]
  provides: [remote-player-depth-sorting]
  affects: [WorldScene, DepthSorter, gameStore]
tech_stack:
  added: []
  patterns: [throttled-depth-updates, unified-container-map]
key_files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
decisions:
  - Remote players included in depth sorting via unified container map
  - Plain player IDs used (no prefix) to match markDirty calls
  - Container type cast used for compatibility (playerSprites stored as Sprite for legacy reasons)
metrics:
  duration_seconds: 81
  tasks_completed: 2
  files_modified: 1
  commits: 1
completed: 2026-02-16
---

# Phase 10 Plan 01: Remote Player Depth Sorting Integration Summary

Remote players now integrate with throttled depth sorting system for correct isometric rendering alongside entities.

## What Was Built

### Core Changes

**WorldScene.movePlayer() Integration (Line 540)**
- Added `depthSorter.markDirty(playerId)` call before tween creation
- Ensures remote players marked for depth recalculation on position updates
- Works alongside existing tween onComplete depth update for redundancy

**WorldScene.update() Unified Container Map (Lines 239-254)**
- Created combined `allContainers` map merging entities + remote players
- Entities use entity IDs, remote players use plain player IDs
- Type cast `playerSprites` to Container for DepthSorter.update() compatibility
- No ID collision risk (entities and players both use UUIDs with different prefixes)

**Event Flow Verified**
- `gameSocket.on('player:moved')` → `worldScene.movePlayer()` (line 199)
- `gameSocket.on('zone:state')` → `worldScene.addPlayer()` (line 164)
- Both methods use consistent `isoTransform.gridToScreen()` transformations
- Both store gridX/gridY via `setData()` for depth calculations

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

**Why Unified Container Map:**
The DepthSorter expects a Map<string, Container> of all depth-sortable objects. Previously it only received entities. Remote players are now included by casting their Sprite references (stored as `playerSprites: Map<string, Sprite>` for legacy compatibility) to Containers.

**ID Strategy:**
- Entities: `entity_uuid` or `creature_uuid` format
- Players: Plain UUID format
- No collision risk: Different UUID namespaces, different prefixes
- markDirty(playerId) uses plain ID, matches unified map

**Depth Update Flow:**
1. Server emits `player:moved` event
2. gameStore handler calls `worldScene.movePlayer(playerId, position)`
3. movePlayer marks player dirty: `depthSorter.markDirty(playerId)`
4. movePlayer creates tween to new position
5. Tween onComplete updates gridX/gridY and calculates depth (immediate fallback)
6. Next DepthSorter.update() cycle (throttled 100ms) includes player in unified map
7. DepthSorter recalculates depth from gridX/gridY for all dirty entities

**Redundancy Pattern:**
Both tween onComplete AND DepthSorter handle depth. This provides:
- Immediate depth update on movement completion (tween callback)
- Consistent throttled updates during movement (DepthSorter)
- Graceful handling if either system is temporarily unavailable

## Verification Results

**TypeScript Compilation:**
```
✓ nx run web:build
✓ 159 modules transformed
✓ built in 2.69s
```

**Event Flow Verification:**
```
✓ gameSocket.on('player:moved', ...) at line 175
✓ worldScene.movePlayer() call at line 199
✓ gameSocket.on('zone:state', ...) at line 96
✓ worldScene.addPlayer() calls at lines 164, 251
```

**Coordinate Transformation Consistency:**
```
✓ addPlayer: isoTransform.gridToScreen(player.position.x, player.position.y)
✓ movePlayer: isoTransform.gridToScreen(position.x, position.y)
✓ Both store gridX/gridY via setData()
✓ Both calculate depth via isoTransform.calculateDepth()
```

**Depth Sorting Integration:**
```
✓ markDirty calls: lines 190, 425, 466, 540
✓ Unified container map: entities + remote players
✓ DepthSorter.update() receives combined map
```

## Success Criteria Met

- [x] TypeScript builds successfully (no compilation errors)
- [x] movePlayer() includes depthSorter.markDirty() call
- [x] update() passes combined entity+player map to DepthSorter
- [x] All coordinate transformations use IsometricTransform consistently
- [x] grep verification confirms event handlers wired to WorldScene methods

## Files Modified

### apps/web/src/game/scenes/WorldScene.ts
**Changes:**
- Line 540: Added `depthSorter.markDirty(playerId)` in movePlayer()
- Lines 239-254: Created unified container map for depth sorting
- Combined entities and remote players for DepthSorter.update()

**Commit:** e27bb49

## Expected Runtime Behavior

**Remote Player Joins:**
1. Server emits `player:joined` event
2. `worldScene.addPlayer()` creates container at correct isometric position
3. Player added to `playerSprites` map
4. On next update cycle, player included in depth sorting

**Remote Player Moves:**
1. Server emits `player:moved` event
2. `movePlayer()` marks player dirty for depth sorting
3. Tween animates player to new screen position (100ms linear)
4. During movement: DepthSorter updates depth every 100ms
5. On completion: Tween callback updates gridX/gridY and depth
6. Result: Smooth movement with correct depth ordering throughout

**Depth Sorting Benefits:**
- Remote players correctly render behind/in-front of entities
- No z-fighting during rapid movement
- Throttled updates (100ms) maintain performance
- Local player priority boost ensures visibility

## Self-Check

Verifying claims made in summary:

**File modifications:**
```bash
$ ls -la apps/web/src/game/scenes/WorldScene.ts
-rw-r--r--  1 user  staff  22639 Feb 16 14:33 apps/web/src/game/scenes/WorldScene.ts
```
FOUND: apps/web/src/game/scenes/WorldScene.ts

**Commit verification:**
```bash
$ git log --oneline -1
e27bb49 feat(10-01): integrate remote players into depth sorting
```
FOUND: e27bb49

**Code verification:**
```bash
$ grep -n "depthSorter.markDirty(playerId)" apps/web/src/game/scenes/WorldScene.ts
540:      this.depthSorter.markDirty(playerId);
```
FOUND: markDirty call in movePlayer()

```bash
$ grep -n "allContainers" apps/web/src/game/scenes/WorldScene.ts
243:      const allContainers = new Map<string, Phaser.GameObjects.Container>();
246:      this.entitySprites.forEach((container, id) => {
247:        allContainers.set(id, container);
251:      this.playerSprites.forEach((sprite, id) => {
252:        allContainers.set(id, sprite as unknown as Phaser.GameObjects.Container);
255:      this.depthSorter.update(time, allContainers, this.isoTransform);
```
FOUND: Unified container map implementation

## Self-Check: PASSED

All claims verified:
- ✓ File exists and modified
- ✓ Commit exists with correct hash
- ✓ markDirty call present in movePlayer()
- ✓ Unified container map implementation present
- ✓ Build succeeds without errors
