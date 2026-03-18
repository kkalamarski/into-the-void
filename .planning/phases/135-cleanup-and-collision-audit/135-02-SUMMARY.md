# Plan 135-02 Summary: Server-side legacy removal, shared-types cleanup, and collision audit

## What was done

Removed all server-side tile-step movement code, cleaned shared package event contracts, removed unused pathfinding/speed/validation functions from game-logic, removed dead code from world-gen, and verified collision flags across all biomes.

### Server-side changes (2 files)
- **game.gateway.ts** -- Removed `@SubscribeMessage('player:move')` handler (93 lines). Added cast interrupt to `handlePixelMove` (migrated from legacy handler to ensure casts still cancel on WASD movement). Removed unused `Direction` import.
- **game.service.ts** -- Removed `MoveResult` interface, `getMovementDelay()` method, and `movePlayer()` method. Cleaned unused imports: `Direction`, `PlayerPublic`, `calculateNewPosition`, `validateMovement`, `isZoneTransition`, `getMovementSpeedModifier`, `calculateMovementDelay`, `tileIdToString`.

### Shared-types changes (2 files)
- **events.ts** -- Removed `player:move` from `ClientEventType` union and `ClientEvents` interface. Removed `player:moved` from `ServerEventType` union and `ServerEvents` interface.
- **constants.ts** -- Removed `MOVE_DELAY_MS = 500` (no active consumers remain). Updated module doc comment.

### Game-logic changes (3 files)
- **pathfinding.ts** -- Stripped to `manhattanDistance` only (used by `interaction.ts`). Removed `chebyshevDistance`, `findPath`, `findPathWithElevation`, `hasLineOfSight`, `getReachablePositions`, `reconstructPath`, `PathNode` interface, and A* constants.
- **validation.ts** -- Stripped to `DIRECTION_VECTORS` only (used by `creature-ai.ts` `tickWander()`). Removed `calculateNewPosition`, `isWithinZoneBounds`, `getAdjacentZoneId`, `validateMovement`, `validateMovementWithElevation`, `isZoneTransition`, `getAdjacentPositions`, `TerrainType`.
- **speed.ts** -- Deleted entirely (no consumers after game.service.ts cleanup). Contained `BIOME_SPEED_MODIFIERS`, `getTileSpeedModifier`, `getMovementSpeedModifier`, `calculateMovementDelay`.
- **index.ts** -- Updated barrel exports: removed `speed` re-export, removed `validateMovementWithElevation` and `findPathWithElevation` named exports.

### World-gen changes (1 file)
- **terrain.ts** -- Removed dead `isFeatureBlocking()` function (replaced by TileRegistry since Phase 13). Removed deprecated `isWalkable()` and `getTileSpeedModifier()` functions.

### Collision audit result
All 9 blocking tiles verified correct:
- `kelp_wall`, `crater_debris`, `crystal_formation`, `void_rift_distortion`, `crystal_formation_large`, `ice_wall`, `ruins_wall`, `void_wall`, `lava`
- All represent elevated geometry (walls, formations, debris, distortion, lava)
- No flat/decorative tiles are incorrectly marked as blocking

### Cast interrupt migration
- Verified that the legacy `player:move` handler interrupted casts via `abilityService.isPlayerCasting()` + `abilityService.interruptCast()`
- Verified that `handlePixelMove` and `MovementService` did NOT have this check
- Added cast interrupt to `handlePixelMove` before queueing input, preserving the behavior

## Net result
- **885 lines deleted**, 11 lines added
- No tile-step movement code remains in the codebase (except DIRECTION_VECTORS for creature AI)
- All 6 key projects build successfully (shared-types, game-logic, world-gen, api, game-server, web)
- Pre-existing failures in map-editor (unrelated missing TileId entries) and creature-ai tests (6 failures) confirmed unchanged
