# Phase 135: Cleanup and Collision Audit - Research

**Researched:** 2026-03-18
**Status:** Complete

## Overview

Phase 135 removes all legacy tile-step movement code and audits collision flags across all biomes. Three requirements: CLEAN-01 (remove click-to-move/A*), CLEAN-02 (audit flat blocking tiles), CLEAN-03 (remove old tile-to-tile movement code).

## Codebase Findings

### Files to Delete

1. **`apps/web/src/game/systems/MovementController.ts`** — Legacy tile-step client-side prediction controller. Uses `calculateNewPosition`, `player:move` event, tile-based collision checks. Entirely replaced by `PixelMovementController.ts`.

2. **`apps/web/src/game/systems/PathfindingController.ts`** — A* click-to-move with path visualization (green diamond destination marker). Uses `chebyshevDistance`, `findPathWorld`, `MOVE_DELAY_MS`. No pixel-movement equivalent needed (click-to-move removed by design).

### Client-Side References to Remove

**`apps/web/src/game/scenes/WorldScene.ts`:**
- Lines 14-15: import of `MovementController` and `PathfindingController`
- Lines 102-103: `movementController` and `pathfindingController` member fields
- Lines 220-234: initialization of both controllers, `setPositionUpdateHandler`
- Lines 318-323: blur event cancel pathfinding handler
- Lines 390-425: `pointerup` click-to-move handler — the A* click handler that converts screen coordinates to grid and calls `pathfindingController.startPath()`
- Lines 508: `lastClickedEntity` suppress-pathfinding guard on entity click
- Lines 926-929: keyboard cancel pathfinding block
- Lines 967-968: `isPathfinding` check in idle detection
- Lines 2005-2062: `updateLocalPlayerSprite` method — legacy tile-step tween/animation logic (contains pathfinding animation start, tile movement delay, `moveDelay` calculation)
- Line 2461: `pathfindingController.cancelPath()` in `handlePlayerDeath`
- Lines 2475-2481: `getMovementController()` and `getPathfindingController()` accessor methods
- Lines 2567-2604: cleanup destroy logic for pathfinding/movement controllers
- `getZoneBoundaryDepth` (tile-based) at line 1313 — `getZoneBoundaryDepthPx` is the replacement (per Phase 133 decision)
- `moveDelay`, `movementTweenEndTime` fields

**`apps/web/src/store/gameStore.ts`:**
- Lines 220-231: zone transition code that calls `worldScene.getMovementController()` / `worldScene.getPathfindingController()`
- Lines 297-320: `player:moved` event handler (tile-based movement fallback) — calls `movementController.reconcile()`

**`apps/web/src/ui/GameUI.tsx`:**
- Lines 75-81: Escape key handler that calls `pathfindingController?.cancelPath()`

**`apps/web/src/components/GameContainer.tsx`:**
- Lines 157-158: comment referencing `MovementController`
- Lines 219: comment about initial player spawn and MovementController

**`apps/web/src/store/entityStore.ts`:**
- Line 58: comment about pathfinding queries

### Server-Side Legacy Code

**`apps/game-server/src/game/game.gateway.ts`:**
- Lines 295-382: `@SubscribeMessage('player:move')` handler `handleMove()` — the entire old tile-step movement handler. Calls `gameService.movePlayer()`, emits `player:moved`. Note: calls `abilityService.isPlayerCasting()` to interrupt cast on movement — this interruption should be preserved, just moved to the pixel move handler if not already there.

**`apps/game-server/src/game/game.service.ts`:**
- Lines 32-52: `MoveResult` interface
- Lines 150-177: `getMovementDelay()` method (tile-based delay calculation)
- Lines 179-246: `movePlayer()` method — calls `calculateNewPosition`, `validateMovement`, entity blocking check, zone transition handling

**IMPORTANT: Check before removing:** The `handleMove` in game.gateway.ts also handles zone transitions and ability interrupt. Verify that `handlePixelMove` already handles these. Looking at the gateway:
- `handlePixelMove` (line 288-293) only queues input via `movementService.queueInput()` — zone transitions are handled by `MovementService.tick()`. Ability interrupt: `gatheringService.cancelIfOutOfRange` is called, but `abilityService.isPlayerCasting` interrupt is NOT present on pixel move. This needs attention during cleanup — either add cast interrupt to pixel move or verify it's handled elsewhere.

### Shared Package Legacy Code

**`packages/shared-types/src/constants.ts`:**
- `MOVE_DELAY_MS = 500` — only used by `PathfindingController` and old server rate limiting. Check if anything else imports it.

**`packages/shared-types/src/network/events.ts`:**
- `'player:move'` in ClientEventType union and ClientEvents interface
- `'player:moved'` in ServerEventType union and ServerEvents interface

**`packages/game-logic/src/movement/validation.ts`:**
- `calculateNewPosition`, `validateMovement`, `validateMovementWithElevation`, `isZoneTransition`, `getAdjacentPositions`, `getAdjacentZoneId`, `isWithinZoneBounds`, `DIRECTION_VECTORS`, `TerrainType`
- **CAUTION:** `DIRECTION_VECTORS` is imported by `creature-ai.ts` for creature wandering. `isZoneTransition` is used by game.service.ts. These are still active for tile-based creature movement which remains in v1.27.

**`packages/game-logic/src/movement/pathfinding.ts`:**
- `findPath`, `findPathWithElevation`, `chebyshevDistance`, `manhattanDistance`, `hasLineOfSight`, `getReachablePositions`
- **CAUTION:** `chebyshevDistance` is used by `PathfindingController.ts` only (client-side). Once that's deleted, no active consumer remains. But check: creature-ai.ts may use it for tile distance — verify before removing.

**`packages/game-logic/src/movement/speed.ts`:**
- `getTileSpeedModifier`, `getMovementSpeedModifier`, `calculateMovementDelay`, `BIOME_SPEED_MODIFIERS`
- Used by `game.service.ts` `getMovementDelay()` method. Once server-side `movePlayer()` is removed, check if speed.ts has any other consumers.

**`packages/game-logic/src/index.ts`:**
- Re-exports from `./movement/validation`, `./movement/pathfinding`, `./movement/speed`

### Functions to KEEP (still used by active code)

- `DIRECTION_VECTORS` — used by `creature-ai.ts` `tickWander()` for creature tile-step wandering
- `isZoneTransition` — may be used by active code for zone transition detection
- `isWithinZoneBounds` — may be used by creature-ai or other game logic
- `getAdjacentZoneId` — check usage before removing

### Collision Audit Findings

**Tile Definitions (packages/tiles/src/definitions/):**

Current blocking tiles (isBlocking: true):
- `void_wall`, `crystal_formation`, `ruins_wall`, `ice_wall`, `lava`, `crater_debris`, `kelp_wall`, `void_rift_distortion`, `crystal_formation_large`

Current non-blocking tiles with special properties:
- `fungal_growth` — isBlocking: false, movementSpeed: 0.6 (correctly non-blocking, flat decorative)
- `toxic_pool` — isBlocking: false, movementSpeed: 0.5 (correctly non-blocking, shallow hazard)
- `tidal_shallow` — isBlocking: false, movementSpeed: 0.7 (correctly non-blocking, shallow water)
- `bioluminescent_flora` — isBlocking: false, movementSpeed: 0.7 (correctly non-blocking, undergrowth)

**Analysis:** The current tile definitions in `packages/tiles/src/definitions/` all have correct blocking flags. Tiles named `*_wall`, `*_formation`, `lava`, and `crater_debris` are blocking (they represent elevated/solid obstacles). Tiles named `*_floor`, `*_pool`, `*_shallow`, `*_growth`, `*_flora` are non-blocking (they are flat/traversable).

**However:** The collision map is generated at runtime in `terrain.ts` using `TileRegistry.get(tileId).isBlocking`. Additionally:
- `structures.ts` applies `TileRegistry.get(featureTileId).isBlocking` for structure features
- `shore.ts` and `kelp-corridors.ts` modify collision maps post-generation

The audit should verify that structures don't incorrectly apply blocking flags to flat decorative tiles. The feature tile mapping in `BIOME_TILES` maps `feature` to the same tile as `wall` for many biomes — meaning a 2% random feature spawn gets the wall tile AND the wall's blocking status. This is correct for biomes where features ARE walls (crystal_formation in crystal_caves), but could be surprising for biomes where the feature is visually flat.

**Key finding:** For all biomes, the `feature` tile in `BIOME_TILES` is the same as the `wall` tile. The `isFeatureBlocking()` function exists but is never called (dead code since Phase 13 migrated to TileRegistry). Features get their blocking from `TileRegistry.get(featureTileId).isBlocking` which checks the actual tile definition. Since feature tiles ARE wall tiles, they correctly inherit the wall's blocking status. No false positives detected — if a tile looks like a wall, it blocks; if it looks flat, it doesn't.

**Conclusion:** No collision flag corrections needed in tile definitions. The `isFeatureBlocking()` function in terrain.ts is dead code and should be removed.

### Network Events Cleanup

The `player:move` (client event) and `player:moved` (server event) should be removed from shared-types since they're no longer used once the server handler is removed. The client `player:moved` listener in gameStore.ts must be removed too.

The `positionBatch` and `positionCorrection` events are the active replacements and must be kept.

## Dependency Analysis

### Safe to Delete (no active consumers after cleanup)
1. `MovementController.ts` (client)
2. `PathfindingController.ts` (client)
3. `movePlayer()` in game.service.ts
4. `getMovementDelay()` in game.service.ts
5. `handleMove()` handler in game.gateway.ts
6. `player:moved` listener in gameStore.ts
7. `isFeatureBlocking()` in terrain.ts

### Must Keep (still used by active systems)
1. `DIRECTION_VECTORS` — creature-ai.ts `tickWander()`
2. `calculateNewPosition` — creature-ai wandering uses dx/dy from DIRECTION_VECTORS directly, not calculateNewPosition. Check if game.service.ts is the only caller.
3. `isZoneTransition` — check if used outside of movePlayer
4. `validation.ts` module — partial removal only; keep what creature-ai needs
5. `pathfinding.ts` module — check if creature-ai uses any pathfinding functions

### Needs Investigation During Execution
1. Cast interrupt on movement — `handleMove` interrupts casting via `abilityService.isPlayerCasting()`. Verify `handlePixelMove` or `movementService.tick()` does the same.
2. `MOVE_DELAY_MS` — verify no active consumers after PathfindingController removal
3. `MoveResult` interface — only used by movePlayer, safe to remove with it

## Risk Assessment

**Low risk:** Deleting MovementController.ts and PathfindingController.ts — clearly replaced by pixel equivalents.

**Medium risk:** Removing server-side `player:move` handler — must verify ability interrupt is handled by pixel movement path. Must verify zone transition handling is covered by MovementService tick loop.

**Low risk:** Collision audit — tile definitions are correctly configured; no structural changes needed.

---

## RESEARCH COMPLETE

All three requirements (CLEAN-01, CLEAN-02, CLEAN-03) are well-scoped. The codebase has clear legacy/new boundaries. Main risks are around server-side handler removal and ensuring no active game features depend on the old tile-step event pipeline.

---
*Phase: 135-cleanup-and-collision-audit*
*Research completed: 2026-03-18*
