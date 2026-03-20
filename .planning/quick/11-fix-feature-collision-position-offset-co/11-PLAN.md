---
phase: quick-11
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/game/scenes/WorldScene.ts
  - apps/web/src/game/systems/PixelMovementController.ts
autonomous: true
requirements: [QUICK-11]

must_haves:
  truths:
    - "Feature collision triggers at the visual base (roots/ground) of the feature, not at the trunk middle"
    - "Player can walk up to a tree and be stopped at its base, not half a tile before"
    - "Terrain/wall collisions remain unchanged (full hitbox check)"
    - "Entity collision still prevents walking through features entirely"
  artifacts:
    - path: "apps/web/src/game/scenes/WorldScene.ts"
      provides: "Feet-only entity collision filtering via pixelY threshold"
      contains: "entitySolid"
    - path: "apps/web/src/game/systems/PixelMovementController.ts"
      provides: "Updated type signature for collision callback with pixelY"
      contains: "pixelY"
  key_links:
    - from: "apps/web/src/game/scenes/WorldScene.ts"
      to: "packages/game-logic/src/movement/pixel-validation.ts"
      via: "resolvePixelCollision passes pixelY to isSolid callback"
      pattern: "isSolid.*pixelY"
    - from: "apps/web/src/game/scenes/WorldScene.ts"
      to: "apps/web/src/game/systems/PixelMovementController.ts"
      via: "setCollisionCallback passes callback with pixelY support"
      pattern: "setCollisionCallback"
---

<objective>
Fix feature (tree/plant/mineral) collision position so it triggers at the visual base of the feature instead of at the trunk middle.

Purpose: The player's AABB hitbox (64px tall, extending upward from feet) causes the TOP corners of the hitbox to enter the feature's tile before the feet do. This triggers entity collision ~half a tile too early, making the collision appear visually offset (at trunk middle instead of base/roots). Terrain/wall collisions must remain unchanged since walls extend vertically and need full-hitbox checking.

Output: Updated collision callback that filters entity blocking to only trigger when the bottom portion of the player hitbox overlaps the feature tile (feet-level check), while keeping terrain collision at full hitbox.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/src/game/scenes/WorldScene.ts (lines 2542-2566 — setCollisionMap method)
@apps/web/src/game/systems/PixelMovementController.ts (lines 95-119 — class fields + setCollisionCallback)
@packages/game-logic/src/movement/pixel-validation.ts (lines 151-192 — resolvePixelCollision: AABB hitbox corners call isSolid(tx, ty, pixelY))

<interfaces>
From packages/game-logic/src/movement/pixel-validation.ts:
```typescript
export const TILE_SIZE_PX = 128;
export const PLAYER_HITBOX = {
  width: Math.round(TILE_SIZE_PX * 0.5),  // 64 px
  height: Math.round(TILE_SIZE_PX * 0.5), // 64 px
};

// resolvePixelCollision checks 4 hitbox corners:
//   top-left:     (cpx - hw, cpy - hh)     // head level
//   top-right:    (cpx + hw - 1, cpy - hh) // head level
//   bottom-left:  (cpx - hw, cpy - 1)      // feet level
//   bottom-right: (cpx + hw - 1, cpy - 1)  // feet level
// Each corner calls: isSolid(toTile(c.x), toTile(c.y), c.y)
//                                                       ^^^ pixelY passed
```

From apps/web/src/game/scenes/WorldScene.ts:
```typescript
// setCollisionMap builds the combined collision callback:
// entitySolid(tx, ty) — checks useEntityStore for plant/mineral at tile
// isoCheck(tx, ty, pixelY) — terrain + isometric wall extension
// Combined: (tx, ty, pixelY?) => entitySolid(tx, ty) || isoCheck(tx, ty, pixelY)
```

From apps/web/src/game/systems/PixelMovementController.ts:
```typescript
private isSolid: ((tileX: number, tileY: number) => boolean) | null = null;
setCollisionCallback(isSolid: (tx: number, ty: number) => boolean): void;
```
</interfaces>

**Root Cause Analysis:**
`resolvePixelCollision` checks all 4 hitbox corners against `isSolid`. The hitbox extends 64px above the player's feet. When the player approaches a feature from the south (walking north), the TOP corners of the hitbox enter the feature's tile 64px before the feet do. Since `entitySolid(tx, ty)` is a simple tile-level check that ignores `pixelY`, it triggers collision for ALL corners equally. This makes the invisible wall appear ~half a tile above the feature's visual base.

**Fix Strategy:**
1. Update `entitySolid` to accept `pixelY` and only return true when `pixelY >= tileMidY` (bottom half of tile). This ensures entity collision only triggers when a hitbox corner is at feet level relative to the tile, not head level.
2. Update `PixelMovementController` type signature to properly declare `pixelY` support.
3. Terrain/wall collision (`isoCheck`) remains unchanged — walls need full-hitbox checking.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add pixelY filtering to entity collision and update callback types</name>
  <files>
    apps/web/src/game/scenes/WorldScene.ts
    apps/web/src/game/systems/PixelMovementController.ts
  </files>
  <action>
**PixelMovementController.ts** — Update the collision callback type signature to include `pixelY`:

1. Line 102: Change `private isSolid: ((tileX: number, tileY: number) => boolean) | null = null;` to `private isSolid: ((tileX: number, tileY: number, pixelY?: number) => boolean) | null = null;`
2. Line 117: Change `setCollisionCallback(isSolid: (tx: number, ty: number) => boolean): void` to `setCollisionCallback(isSolid: (tx: number, ty: number, pixelY?: number) => boolean): void`

These are type-only changes. The runtime behavior is already correct (resolvePixelCollision passes pixelY as the 3rd arg, and JavaScript ignores extra args). This just makes the types honest.

**WorldScene.ts** — In `setCollisionMap()` method (around line 2542-2566), modify the `entitySolid` lambda to accept `pixelY` and filter out head-level collisions:

Change the `entitySolid` definition from:
```typescript
const entitySolid = (tx: number, ty: number) =>
  this.isEntityBlocked(offsetX + tx, offsetY + ty);
```

To:
```typescript
// Entity collision: only block when pixel is at feet level (bottom half of tile).
// This prevents the top of the player's hitbox (head) from triggering feature
// collision before the feet reach the feature's base.
// TILE_SIZE_PX is already imported from @into-the-void/game-logic.
const entitySolid = (tx: number, ty: number, pixelY?: number) => {
  if (pixelY !== undefined) {
    const tileMidY = ty * TILE_SIZE_PX + TILE_SIZE_PX * 0.5;
    if (pixelY < tileMidY) return false;
  }
  return this.isEntityBlocked(offsetX + tx, offsetY + ty);
};
```

Then update the combined callback to pass `pixelY` through to `entitySolid`:
```typescript
this.pixelMovement.setCollisionCallback(
  (tx: number, ty: number, pixelY?: number) =>
    entitySolid(tx, ty, pixelY) || isoCheck(tx, ty, pixelY),
);
```

The previous version was `entitySolid(tx, ty)` — pixelY was NOT passed. Now it IS passed.

**Why this works:**
- `resolvePixelCollision` checks 4 hitbox corners. Each corner calls `isSolid(toTile(c.x), toTile(c.y), c.y)`.
- Top corners have `c.y = cpy - 64` (head). When the head barely enters a tile from the south, `pixelY` is near the tile's top edge, which is `< tileMidY` — so entity collision returns false.
- Bottom corners have `c.y = cpy - 1` (feet). When feet are on the feature's tile, `pixelY` is typically `>= tileMidY` — so entity collision returns true.
- Terrain collision (`isoCheck`) is unchanged — walls still use full hitbox checking.
- When `pixelY` is undefined (fallback/legacy calls), entity collision works as before (full blocking).
  </action>
  <verify>
    <automated>cd /Users/krzysztof.kalamarski/Projects/into-the-void && npx nx run game-logic:test 2>&1 | tail -20 && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Entity collision callback accepts and filters by pixelY
    - PixelMovementController type includes pixelY in callback signature
    - Feature collision triggers at visual base (bottom half of tile) instead of at trunk middle (top half)
    - Terrain/wall collisions remain unchanged (isoCheck path unmodified)
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
1. TypeScript compilation passes for both web app and game-logic package
2. Game-logic tests pass (resolvePixelCollision, createIsometricCollisionCheck unchanged)
3. Visual verification: walk toward a tree from all 4 cardinal directions — collision should trigger at the tree's base/roots, not at trunk middle
4. Terrain wall collision unchanged: walking into walls still blocks at the correct position
</verification>

<success_criteria>
- Feature collision position matches the visual base of features (green circle from screenshot, not red)
- Player can walk closer to features before being blocked (~half a tile closer than before)
- Wall/terrain collision behavior is completely unchanged
- No TypeScript compilation errors
- All existing game-logic tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/11-fix-feature-collision-position-offset-co/11-SUMMARY.md`
</output>
