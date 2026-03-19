---
phase: quick-5
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/game-logic/src/movement/pixel-validation.ts
  - packages/game-logic/src/movement/pixel-validation.test.ts
  - apps/game-server/src/game/movement.service.ts
  - apps/web/src/game/scenes/WorldScene.ts
autonomous: true
requirements: ["QUICK-5"]
must_haves:
  truths:
    - "Player cannot visually enter wall tiles from behind (north/west side)"
    - "Player can still walk along walls without being pushed away at wrong distance"
    - "Collision is consistent between client and server (no constant corrections)"
  artifacts:
    - path: "packages/game-logic/src/movement/pixel-validation.ts"
      provides: "Updated resolvePixelCollision accepting extended collision callback"
    - path: "packages/game-logic/src/movement/pixel-validation.test.ts"
      provides: "Tests for isometric visual collision"
    - path: "apps/game-server/src/game/movement.service.ts"
      provides: "Server isSolid callback with isometric visual check"
    - path: "apps/web/src/game/scenes/WorldScene.ts"
      provides: "Client isSolid callback with isometric visual check"
  key_links:
    - from: "movement.service.ts"
      to: "resolvePixelCollision"
      via: "isSolid callback with visual height check"
    - from: "WorldScene.ts"
      to: "resolvePixelCollision"
      via: "isSolid callback with visual height check"
---

<objective>
Fix wall collision boxes being too small for isometric visual footprint. Currently, wall tiles only block at their own grid position, but their isometric cube visual extends northward and westward into adjacent tiles. Players can walk "behind" walls and visually overlap with them. The collision check must account for the isometric visual height of neighboring elevated blocking tiles.

Purpose: Prevent players from visually entering wall cubes by expanding the collision check to account for the isometric projection offset of elevated tiles.
Output: Updated collision callbacks on both client and server that treat tiles adjacent to elevated walls as solid.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/game-logic/src/movement/pixel-validation.ts
@packages/game-logic/src/movement/pixel-validation.test.ts
@apps/game-server/src/game/movement.service.ts
@apps/web/src/game/scenes/WorldScene.ts (setCollisionMap, isWorldTileBlocked methods)
@packages/shared-types/src/core/zone.ts (ChunkData interface with heights[][])

<interfaces>
From packages/game-logic/src/movement/pixel-validation.ts:
```typescript
export const TILE_SIZE_PX = 128;
export const PLAYER_HITBOX = { width: 64, height: 64 } as const;

export function resolvePixelCollision(
  px: number, py: number,
  vx: number, vy: number,
  isSolid: (tileX: number, tileY: number) => boolean,
): PixelPos;
```

From packages/shared-types/src/core/zone.ts:
```typescript
export interface ChunkData {
  tiles: number[][];
  heights: number[][];
  collisions: boolean[][];
  // ...
}
```

Server isSolid callback (movement.service.ts lines 152-164):
```typescript
// Hub zones:
const collisions = chunk.collisions;
isSolid = (tx, ty) => collisions?.[ty]?.[tx] ?? true;

// Open-world zones:
isSolid = (tx, ty) => this.zonesService.isWorldTileBlocked(offsetX + tx, offsetY + ty);
```

Client isSolid callback (WorldScene.ts lines 2556-2567):
```typescript
setCollisionMap(collisionMap: boolean[][]): void {
  this.collisionMap = collisionMap;
  if (this.pixelMovement) {
    const offsetX = zoneCoords.x * currentSize;
    const offsetY = zoneCoords.y * currentSize;
    this.pixelMovement.setCollisionCallback((tx, ty) => {
      return this.isWorldTileBlocked(offsetX + tx, offsetY + ty);
    });
  }
}
```

Client isWorldTileBlocked (WorldScene.ts lines 2508-2553):
```typescript
isWorldTileBlocked(worldX: number, worldY: number): boolean {
  // Hub zones: chunk.data.collisions[worldY]?.[worldX] ?? true
  // Open-world: chunk.data.collisions[localY]?.[localX] ?? true
  // Also checks entity blocking (mineral, plant)
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add isometric visual collision helper and update isSolid callbacks</name>
  <files>
    packages/game-logic/src/movement/pixel-validation.ts
    packages/game-logic/src/movement/pixel-validation.test.ts
    apps/game-server/src/game/movement.service.ts
    apps/web/src/game/scenes/WorldScene.ts
  </files>
  <action>
The core problem: in isometric projection, an elevated blocking tile at grid (x, y) has a cube visual that extends upward on screen, which corresponds to the grid cell at (x, y-1) in world space. The south face of the cube at (x, y) visually covers the space where grid row y-1 is rendered. A player standing at grid row y-1 visually overlaps with that wall cube.

**Step 1: Create a helper in pixel-validation.ts**

Add a new exported function `createIsometricCollisionCheck` that wraps a base `isSolid` callback with isometric visual height awareness:

```typescript
/**
 * Wraps a base collision callback with isometric visual height checking.
 * In isometric projection, an elevated blocking tile at (x, y) visually
 * extends into the tile at (x, y-1) due to the cube's south face height.
 * This wrapper also blocks tile (x, y) if tile (x, y+1) is an elevated
 * blocking tile — preventing the player from visually entering wall cubes
 * from behind.
 *
 * @param baseSolid  The original collision check (returns true if blocked).
 * @param getHeight  Returns the height/elevation of a tile (0 = floor, 1+ = elevated).
 * @returns Enhanced collision check accounting for isometric visual overlap.
 */
export function createIsometricCollisionCheck(
  baseSolid: (tileX: number, tileY: number) => boolean,
  getHeight: (tileX: number, tileY: number) => number,
): (tileX: number, tileY: number) => boolean {
  return (tileX: number, tileY: number): boolean => {
    // Standard collision check
    if (baseSolid(tileX, tileY)) return true;

    // Check if the tile to the south (y+1) is an elevated blocking tile.
    // Its isometric cube visual extends northward into this tile's screen space.
    const southY = tileY + 1;
    if (baseSolid(tileX, southY) && getHeight(tileX, southY) >= 1) {
      return true;
    }

    return false;
  };
}
```

Why only check south (y+1) and not east (x+1): The east face of a cube extends to the right on screen, which is the direction of lower grid-Y (northeast in isometric). But the visual overlap is predominantly from the south face extending upward into the tile row above. The east face overlap is much less pronounced because it extends sideways, not vertically. Start with south-only and expand if needed.

**Step 2: Update server-side isSolid callback in movement.service.ts**

In the `tick()` method, after building the base `isSolid` callback (lines 152-164), wrap it with `createIsometricCollisionCheck`. This requires also building a `getHeight` callback from the chunk data.

For hub zones:
```typescript
import { createIsometricCollisionCheck } from '@into-the-void/game-logic';

// After existing isSolid construction...
const heights = chunk.heights;
const getHeight = (tx: number, ty: number): number => heights?.[ty]?.[tx] ?? 0;
isSolid = createIsometricCollisionCheck(isSolid, getHeight);
```

For open-world zones: The height data needs cross-zone lookup similar to `isWorldTileBlocked`. Add a new method `getWorldTileHeight(worldX, worldY)` to `ZonesService` (or inline the logic):
```typescript
// For open-world zones, build getHeight using chunk lookup:
const getHeight = (tx: number, ty: number): number => {
  const worldTx = offsetX + tx;
  const worldTy = offsetY + ty;
  // Look up height from the correct zone's chunk
  const zoneX = Math.floor(worldTx / ZONE_SIZE);
  const zoneY = Math.floor(worldTy / ZONE_SIZE);
  const zoneId = `z_${zoneX}_${zoneY}`;
  const c = this.zonesService.getChunkSync(zoneId);
  if (!c?.heights) return 0;
  const localX = ((worldTx % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;
  const localY = ((worldTy % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;
  return c.heights[localY]?.[localX] ?? 0;
};
isSolid = createIsometricCollisionCheck(isSolid, getHeight);
```

**Step 3: Update client-side isSolid callback in WorldScene.ts**

In `setCollisionMap()`, after the existing `this.pixelMovement.setCollisionCallback(...)`, wrap the callback with `createIsometricCollisionCheck`. Import the helper from `@into-the-void/game-logic`.

For the `getHeight` callback on the client: use the same pattern as `isWorldTileBlocked` but reading `heights` instead of `collisions`:
```typescript
import { createIsometricCollisionCheck } from '@into-the-void/game-logic';

// In setCollisionMap():
const baseIsSolid = (tx: number, ty: number) => this.isWorldTileBlocked(offsetX + tx, offsetY + ty);
const getHeight = (tx: number, ty: number): number => {
  const worldX = offsetX + tx;
  const worldY = offsetY + ty;
  return this.getWorldTileHeight(worldX, worldY);
};
this.pixelMovement.setCollisionCallback(
  createIsometricCollisionCheck(baseIsSolid, getHeight)
);
```

Add a new private method `getWorldTileHeight(worldX, worldY)` to WorldScene that mirrors the logic of `isWorldTileBlocked` but returns the height value from `chunk.data.heights`:
```typescript
private getWorldTileHeight(worldX: number, worldY: number): number {
  if (!this.chunkManager) return 0;
  if (isHubZone(this.currentZoneId)) {
    const chunk = this.chunkManager.getChunk(this.currentZoneId);
    return chunk?.data.heights?.[worldY]?.[worldX] ?? 0;
  }
  const chunkX = Math.floor(worldX / ZONE_SIZE);
  const chunkY = Math.floor(worldY / ZONE_SIZE);
  const zoneId = `z_${chunkX}_${chunkY}`;
  const chunk = this.chunkManager.getChunk(zoneId);
  if (!chunk?.data.heights) return 0;
  const localX = ((worldX % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;
  const localY = ((worldY % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;
  return chunk.data.heights[localY]?.[localX] ?? 0;
}
```

**Step 4: Add tests in pixel-validation.test.ts**

Add a new `describe('createIsometricCollisionCheck')` block:

1. Test: tile with no elevated neighbor is not blocked when base says false.
2. Test: tile directly north of an elevated wall (y+1 is blocking, height >= 1) IS blocked.
3. Test: tile north of a floor-level blocking tile (height = 0) is NOT additionally blocked (no visual overlap for flat tiles).
4. Test: tile north of a non-blocking elevated tile (floor with height > 0 but not blocking) is NOT blocked.
5. Test: the base solid check still works through the wrapper (a tile that is directly solid returns true).

**Important: Export `createIsometricCollisionCheck` from the game-logic package index.**

Check `packages/game-logic/src/index.ts` or `packages/game-logic/src/movement/` index and ensure the new function is exported so it can be imported by both `apps/game-server` and `apps/web`.
  </action>
  <verify>
    npx nx run game-logic:test -- --grep "createIsometricCollisionCheck" passes all new tests.
    npx nx run game-logic:test passes all existing tests (no regressions).
    npx nx run game-server:build compiles without errors.
    npx nx run web:build compiles without errors.
  </verify>
  <done>
    - `createIsometricCollisionCheck` exists in pixel-validation.ts and is exported from game-logic package
    - Server movement.service.ts wraps isSolid with isometric visual check for both hub and open-world zones
    - Client WorldScene.ts wraps isSolid with isometric visual check for both hub and open-world zones
    - New tests pass confirming: elevated walls block the tile to their north, flat tiles do not, non-blocking elevated tiles do not
    - All existing tests pass (no regressions)
    - Both server and client builds compile successfully
  </done>
</task>

</tasks>

<verification>
1. `npx nx run game-logic:test` -- all tests pass including new isometric collision tests
2. `npx nx run game-server:build` -- compiles without errors
3. `npx nx run web:build` -- compiles without errors
4. Manual verification: start dev server, walk toward a wall from the north side. Player should stop one tile earlier than before, preventing visual overlap with the wall cube.
</verification>

<success_criteria>
- Player cannot visually enter wall tiles from behind (approaching from north/northwest)
- Collision is consistent between client and server (no position corrections on wall approach)
- All existing movement tests pass without regression
- Both apps build successfully
</success_criteria>

<output>
After completion, create `.planning/quick/5-wall-collision-boxes-too-small-player-ca/5-SUMMARY.md`
</output>
