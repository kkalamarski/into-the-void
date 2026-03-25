---
phase: quick-14
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/game-logic/src/movement/pixel-validation.ts
  - packages/game-logic/src/movement/pixel-validation.test.ts
  - apps/web/src/game/scenes/WorldScene.ts
  - apps/game-server/src/game/movement.service.ts
autonomous: true
requirements: [QUICK-14]

must_haves:
  truths:
    - "Player can walk up to within ~0.5 tile-heights (screen space) of wall and entity sprites, not 2 tile-heights away"
    - "Player renders in front of wall south-faces via depth sorting when standing near wall boundary"
    - "Entity collision (plants/minerals) triggers at the entity tile boundary, not 1-2 tiles before"
    - "Server and client collision behavior remain synchronized (no rubber-banding)"
  artifacts:
    - path: "packages/game-logic/src/movement/pixel-validation.ts"
      provides: "Reduced PLAYER_HITBOX.height and removed isometric collision extension"
      exports: ["PLAYER_HITBOX", "resolvePixelCollision", "createIsometricCollisionCheck"]
    - path: "packages/game-logic/src/movement/pixel-validation.test.ts"
      provides: "Updated tests for new hitbox height"
    - path: "apps/web/src/game/scenes/WorldScene.ts"
      provides: "Simplified collision callback without isometric extension wrapper"
    - path: "apps/game-server/src/game/movement.service.ts"
      provides: "Server collision without isometric extension wrapper"
  key_links:
    - from: "apps/web/src/game/scenes/WorldScene.ts"
      to: "packages/game-logic/src/movement/pixel-validation.ts"
      via: "setCollisionMap uses resolvePixelCollision with isSolid callback"
      pattern: "setCollisionCallback"
    - from: "apps/game-server/src/game/movement.service.ts"
      to: "packages/game-logic/src/movement/pixel-validation.ts"
      via: "tick() uses resolvePixelCollision with isSolid callback"
      pattern: "resolvePixelCollision"
---

<objective>
Fix the collision position offset where collisions trigger approximately 2 tile-heights
above the visual base of wall/entity sprites. The root cause is a compound offset from:

1. `PLAYER_HITBOX.height = 64` (0.5 tiles in grid-Y) causes the hitbox top corners to
   enter solid tiles 0.5 grid tiles before the player's feet reach the tile boundary.
2. `createIsometricCollisionCheck` extends collision 0.5-1 tile northward in grid space
   for elevated walls, pushing the stop-point an additional tile away.
3. The cube sprite (256x256 with origin 0.5, 0.25) has south/east faces extending 192px
   below the grid-to-screen anchor, creating a large visual gap between where the player
   stops and where the wall sprite visually ends.

The fix: (a) reduce PLAYER_HITBOX.height from 64 to 16 so the hitbox barely extends above
the feet, and (b) remove the isometric collision extension wrapper from both client and
server. Depth sorting (entity offset of 65 in calculateDepth) already ensures correct
visual layering -- the player renders in front of wall south-faces when standing near the
wall boundary. The base tile collision (baseSolid) is sufficient to prevent entering wall
tiles.

Purpose: Eliminate the 2-tile visual gap between where the player stops and the obstacle's
visual base, making collision feel natural and responsive.

Output: Updated pixel-validation.ts, WorldScene.ts, movement.service.ts, and tests.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/game-logic/src/movement/pixel-validation.ts
@packages/game-logic/src/movement/pixel-validation.test.ts
@apps/web/src/game/scenes/WorldScene.ts (lines 2576-2608 — setCollisionMap method)
@apps/game-server/src/game/movement.service.ts (lines 147-181 — tick collision section)

<interfaces>
From packages/game-logic/src/movement/pixel-validation.ts:
```typescript
export const PLAYER_HITBOX = {
  width: Math.round(TILE_SIZE_PX * 0.5),  // 64 px — KEEP
  height: Math.round(TILE_SIZE_PX * 0.5), // 64 px — CHANGE to 16
} as const;

// resolvePixelCollision uses hh = PLAYER_HITBOX.height for hitbox corners:
//   top corners:    (cpx +/- hw, cpy - hh)
//   bottom corners: (cpx +/- hw, cpy - 1)

export function createIsometricCollisionCheck(
  baseSolid: (tileX: number, tileY: number) => boolean,
  getHeight: (tileX: number, tileY: number) => number,
): (tileX: number, tileY: number, pixelY?: number) => boolean;
// Currently checks south neighbor (y+1) — will be simplified to pass-through
```

From apps/web/src/game/scenes/WorldScene.ts setCollisionMap():
```typescript
// Current: wraps terrainSolid with createIsometricCollisionCheck
const isoCheck = createIsometricCollisionCheck(terrainSolid, getHeight);
this.pixelMovement.setCollisionCallback(
  (tx, ty, pixelY) => entitySolid(tx, ty, pixelY) || isoCheck(tx, ty, pixelY),
);
// After fix: use terrainSolid directly (no iso extension wrapper)
```

From apps/game-server/src/game/movement.service.ts tick():
```typescript
// Current: wraps isSolid with createIsometricCollisionCheck
isSolid = createIsometricCollisionCheck(isSolid, getHeight);
const resolved = resolvePixelCollision(player.px, player.py, vx, vy, isSolid);
// After fix: use isSolid directly (no iso extension wrapper)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Reduce hitbox height and deprecate isometric collision extension</name>
  <files>
    packages/game-logic/src/movement/pixel-validation.ts
    packages/game-logic/src/movement/pixel-validation.test.ts
  </files>
  <action>
In `packages/game-logic/src/movement/pixel-validation.ts`:

1. Change `PLAYER_HITBOX.height` from `Math.round(TILE_SIZE_PX * 0.5)` (64) to `16`.
   Keep `PLAYER_HITBOX.width` at 64 unchanged. Update the JSDoc comment to explain
   the reduced height: "Height reduced to 16px (0.125 tiles) to minimize the collision
   trigger distance above feet level. In isometric rendering, depth sorting handles
   visual layering of wall south-faces, so a tall hitbox is unnecessary and creates
   a visible gap between the collision stop point and the wall's visual base."

2. Modify `createIsometricCollisionCheck` to be a pass-through that ONLY delegates to
   `baseSolid`. Remove the south-neighbor extension logic entirely. Update the JSDoc to
   note: "Deprecated: south-neighbor extension removed. Depth sorting (entity offset 65
   in calculateDepth) handles visual layering of wall cube south-faces. The base collision
   check is sufficient." Keep the function signature unchanged for backward compatibility
   (still accepts `getHeight` parameter, just doesn't use it). The function body should
   simply be:
   ```typescript
   return (tileX: number, tileY: number, _pixelY?: number): boolean => {
     return baseSolid(tileX, tileY);
   };
   ```

In `packages/game-logic/src/movement/pixel-validation.test.ts`:

3. Update the PLAYER_HITBOX.height test: change expected value from 64 to 16.

4. Update `createIsometricCollisionCheck` tests:
   - Keep test "tile with no elevated neighbor is not blocked when base says false" — still passes (returns false).
   - Keep test "base solid check still works through the wrapper" — still passes (returns true for directly solid tile).
   - Update test "tile directly north of an elevated wall — full-tile block" — now expect FALSE (extension removed, north tile is no longer blocked by south neighbor).
   - Update test "tile north of a floor-level blocking tile is NOT additionally blocked" — still passes (returns false).
   - Update test "tile north of a non-blocking elevated tile is NOT blocked" — still passes (returns false).
   - Update test "elevated wall at height 2 also blocks the tile to its north" — now expect FALSE.
   - Keep test "tiles not adjacent to any wall remain unblocked" — still passes.
   - Update sub-tile precision tests: both "IS blocked when pixelY in southern half" and "NOT blocked when pixelY in northern half" now both expect FALSE (extension removed).
   - Update "backward compat: no pixelY provided still blocks entire north tile" — now expect FALSE.
   - Add a new test: "pass-through delegates to baseSolid and ignores getHeight" — verify that the function returns baseSolid(x,y) regardless of getHeight values.
  </action>
  <verify>
    npx nx run game-logic:test -- --testPathPattern=pixel-validation 2>&1 | tail -20
  </verify>
  <done>
    PLAYER_HITBOX.height is 16. createIsometricCollisionCheck is a pass-through to baseSolid.
    All pixel-validation tests pass with updated expectations.
  </done>
</task>

<task type="auto">
  <name>Task 2: Remove isometric extension wrapper from client and server collision callbacks</name>
  <files>
    apps/web/src/game/scenes/WorldScene.ts
    apps/game-server/src/game/movement.service.ts
  </files>
  <action>
In `apps/web/src/game/scenes/WorldScene.ts`, in the `setCollisionMap` method (around line 2576):

1. Remove the `getHeight` lambda and `createIsometricCollisionCheck` wrapper. The
   collision callback should combine `entitySolid` and `terrainSolid` directly:
   ```typescript
   this.pixelMovement.setCollisionCallback(
     (tx: number, ty: number, pixelY?: number) =>
       entitySolid(tx, ty, pixelY) || terrainSolid(tx, ty),
   );
   ```

2. Remove the unused `getHeight` lambda (was: `const getHeight = (tx, ty) => this.getWorldTileHeight(offsetX + tx, offsetY + ty)`).

3. Remove the `createIsometricCollisionCheck` import from the top of the file (line 3):
   ```typescript
   import { TILE_SIZE_PX, MELEE_RANGE_PX, GATHER_RANGE_PX, NPC_INTERACT_RANGE_PX, pixelDistanceTo, tileToPixelCenter, createIsometricCollisionCheck } from '@into-the-void/game-logic';
   ```
   becomes:
   ```typescript
   import { TILE_SIZE_PX, MELEE_RANGE_PX, GATHER_RANGE_PX, NPC_INTERACT_RANGE_PX, pixelDistanceTo, tileToPixelCenter } from '@into-the-void/game-logic';
   ```

In `apps/game-server/src/game/movement.service.ts`, in the `tick()` method (around line 147):

4. Remove the `createIsometricCollisionCheck` wrapper around `isSolid` (line 179).
   Delete or comment out:
   ```typescript
   isSolid = createIsometricCollisionCheck(isSolid, getHeight);
   ```
   The `isSolid` variable is already set correctly by the hub/open-world branch above.

5. Remove the `getHeight` lambdas from both the hub and open-world branches since they
   are no longer needed. Specifically:
   - Delete `let getHeight: (tx: number, ty: number) => number;` declaration (if present)
   - Delete the hub branch `getHeight = ...` assignment (line 172-173)
   - Delete the open-world branch `getHeight = ...` assignment (line 164-165)

6. Remove the `createIsometricCollisionCheck` import from the top of the file (line 10):
   ```typescript
   import { bitmaskToKeyState, velocityFromKeys, resolvePixelCollision, validatePixelSpeed, createIsometricCollisionCheck } from '@into-the-void/game-logic';
   ```
   becomes:
   ```typescript
   import { bitmaskToKeyState, velocityFromKeys, resolvePixelCollision, validatePixelSpeed } from '@into-the-void/game-logic';
   ```

Note: The `getWorldTileHeight` private method in WorldScene.ts should be kept (not deleted)
since it may be used elsewhere. Only remove the local lambda references within setCollisionMap.
  </action>
  <verify>
    npx nx run web:build 2>&1 | tail -5 && npx nx run game-server:build 2>&1 | tail -5
  </verify>
  <done>
    Client collision callback uses terrainSolid directly without isometric extension wrapper.
    Server collision callback uses isSolid directly without isometric extension wrapper.
    Both apps compile without TypeScript errors.
    createIsometricCollisionCheck is no longer imported or used in either app.
  </done>
</task>

</tasks>

<verification>
1. `npx nx run game-logic:test -- --testPathPattern=pixel-validation` — all tests pass
2. `npx nx run web:build` — compiles without errors
3. `npx nx run game-server:build` — compiles without errors
4. Verify PLAYER_HITBOX.height is 16: `grep "height:" packages/game-logic/src/movement/pixel-validation.ts`
5. Verify no createIsometricCollisionCheck usage in apps: `grep -r "createIsometricCollisionCheck" apps/`
</verification>

<success_criteria>
- PLAYER_HITBOX.height reduced from 64 to 16 (0.125 tiles above feet instead of 0.5)
- createIsometricCollisionCheck is a pass-through (no south-neighbor extension)
- Client WorldScene.setCollisionMap uses terrainSolid directly
- Server MovementService.tick() uses isSolid directly
- All pixel-validation tests pass
- Both web and game-server apps build successfully
- Net effect: player collision boundary moves from ~2 tile-heights above visual wall base
  to ~0-0.5 tile-heights, with depth sorting handling the visual layering correctly
</success_criteria>

<output>
After completion, create `.planning/quick/14-fix-collision-position-collisions-are-2-/14-SUMMARY.md`
</output>
