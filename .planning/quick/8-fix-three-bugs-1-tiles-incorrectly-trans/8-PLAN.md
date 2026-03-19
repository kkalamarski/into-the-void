---
phase: quick-8
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/game/scenes/WorldScene.ts
  - apps/web/src/game/rendering/EntityRenderer.ts
  - packages/game-logic/src/movement/pixel-validation.ts
  - packages/game-logic/src/movement/pixel-validation.test.ts
  - apps/game-server/src/game/movement.service.ts
autonomous: true
requirements: ["QUICK-8"]
must_haves:
  truths:
    - "Tiles at the same elevation as the player do not become transparent when the player stands on them"
    - "Clicking on an NPC triggers npc:interact and opens the NPC dialog"
    - "Hovering over an interactable NPC shows a chat bubble cursor"
    - "Y-axis collision extension near walls is reduced to 1.5x"
  artifacts:
    - path: "apps/web/src/game/scenes/WorldScene.ts"
      provides: "Fixed tile transparency logic accounting for player elevation"
    - path: "apps/web/src/game/rendering/EntityRenderer.ts"
      provides: "NPC and item click handling with chat bubble cursor for NPCs"
    - path: "packages/game-logic/src/movement/pixel-validation.ts"
      provides: "Reduced isometric collision Y-axis extension"
  key_links:
    - from: "WorldScene.ts updateTileTransparency"
      to: "localPlayer.getData('elevation')"
      via: "player elevation comparison against tile elevation"
    - from: "EntityRenderer.ts isClickable"
      to: "WorldScene.ts gameobjectdown handler"
      via: "setInteractive with hitArea enables click events for NPCs"
    - from: "pixel-validation.ts createIsometricCollisionCheck"
      to: "movement.service.ts + WorldScene.ts"
      via: "shared collision check used by both client and server"
---

<objective>
Fix three bugs in one plan: (1) tile transparency incorrectly triggers on tiles at the same elevation as the player, (2) NPC click interaction is broken and needs a chat bubble cursor on hover, (3) Y-axis isometric collision multiplier is too large and should be reduced from 2x to 1.5x.

Purpose: Improve gameplay quality by fixing visual occlusion, restoring NPC interaction, and refining collision feel.
Output: Three targeted fixes across client rendering and shared game-logic.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/src/game/scenes/WorldScene.ts
@apps/web/src/game/rendering/EntityRenderer.ts
@packages/game-logic/src/movement/pixel-validation.ts
@packages/game-logic/src/movement/pixel-validation.test.ts
@apps/game-server/src/game/movement.service.ts

<interfaces>
From WorldScene.ts — updateTileTransparency (lines 1013-1068):
```typescript
private updateTileTransparency(): void {
  // Gets playerGridX, playerGridY from localPlayer.getData
  // Calculates playerRow = gridX + gridY (isometric depth)
  // For each elevated tile (elevation > 0):
  //   - Checks tileRow > playerRow (tile is "in front")
  //   - Checks rowDiff <= elevation + 2 and colDiff <= 2
  //   - If both: sets tile alpha to 0.35
  // BUG: Does NOT check player elevation. Tiles at same elevation
  //       as player become transparent even though they don't occlude.
}
```

From EntityRenderer.ts — interactive setup (lines 554-641):
```typescript
// Line 555: isClickable only includes creature, plant, mineral
const isClickable = entity.type === 'creature' || entity.type === 'plant' || entity.type === 'mineral';
if (isClickable) {
  // Full interactive setup: hitArea, cursor: 'pointer', hover glow
  sprite.setInteractive(hitRect, Phaser.Geom.Rectangle.Contains);
  sprite.input!.cursor = 'pointer';
  // ... hover outline glow ...
} else {
  // NPCs and items fall through to this basic setInteractive
  sprite.setInteractive(); // No hitArea, no cursor, no hover glow
}
```

From WorldScene.ts — gameobjectdown handler (lines 414-498):
```typescript
// Handles: npc (emit npc:interact), item (emit inventory:pickup),
// mineral/plant (gathering), artifact (tool_use), creature (combat)
// Requires: gameObject.parentContainer.getData('entityId') and ('entityType')
// The handler WORKS for NPCs IF the gameobjectdown event fires, but NPCs
// need proper hitArea + cursor styling to be reliably clickable.
```

From pixel-validation.ts — createIsometricCollisionCheck (lines 209-226):
```typescript
export function createIsometricCollisionCheck(
  baseSolid: (tileX: number, tileY: number) => boolean,
  getHeight: (tileX: number, tileY: number) => number,
): (tileX: number, tileY: number) => boolean {
  return (tileX: number, tileY: number): boolean => {
    if (baseSolid(tileX, tileY)) return true;
    // Checks south neighbor (y+1) — if elevated and blocking, blocks this tile too
    // This extends wall collision by 1 full tile (128px) = 2x multiplier
    const southY = tileY + 1;
    if (baseSolid(tileX, southY) && getHeight(tileX, southY) >= 1) {
      return true;
    }
    return false;
  };
}
```

From pixel-validation.ts — resolvePixelCollision hitbox (lines 158-176):
```typescript
const hw = PLAYER_HITBOX.width  / 2; // 32
const hh = PLAYER_HITBOX.height;     // 64 (full height from feet up)
// Corners checked:
//   top-left:     (px - hw,     py - hh)     = (px-32, py-64)
//   top-right:    (px + hw - 1, py - hh)     = (px+31, py-64)
//   bottom-left:  (px - hw,     py - 1)      = (px-32, py-1)
//   bottom-right: (px + hw - 1, py - 1)      = (px+31, py-1)
```

NPC sprite scale (EntityRenderer.ts lines 174-176):
```typescript
const NPC_SPRITE_SCALE_X = 6;
const NPC_SPRITE_SCALE_Y = 4.5;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix tile transparency to account for player elevation</name>
  <files>apps/web/src/game/scenes/WorldScene.ts</files>
  <action>
In `updateTileTransparency()` (around line 1013), the current logic makes any elevated tile transparent if it is "in front" of the player (higher iso row) and within range. The bug is that it does NOT consider the player's own elevation. When a player stands on a tile at elevation 2, surrounding tiles at elevation 2 should NOT be transparent because they are at the same level and do not visually occlude the player.

**Fix:** After reading `playerGridX` and `playerGridY` (lines 1019-1020), also read the player's current elevation:

```typescript
const playerElevation = (this.localPlayer.getData('elevation') as number) ?? 0;
```

Then, inside the tile loop (after the `elevation === 0` check on line 1032), add an elevation comparison. Only make a tile transparent if the tile's elevation is GREATER than the player's elevation. Tiles at the same or lower elevation do not occlude the player:

```typescript
// Skip tiles at same or lower elevation than player — they don't occlude
if (elevation <= playerElevation) continue;
```

Place this right after the existing `if (!elevation || elevation === 0) continue;` check on line 1032.

The full condition flow becomes:
1. Skip tiles with no elevation (floor tiles)
2. Skip tiles at same or lower elevation than the player (player is on top of or level with them)
3. Skip tiles outside the 5-tile bounding box
4. Skip tiles behind the player (lower iso row)
5. Skip tiles too far in front (rowDiff > elevation + 2)
6. Skip tiles not in the same iso column band (colDiff > 2)
7. If all checks pass, make tile transparent (0.35 alpha)

This ensures tiles the player is standing ON (same elevation) stay fully opaque, while only tiles that are taller than the player's current position and in front of them get transparency.
  </action>
  <verify>npx nx run web:build compiles without errors</verify>
  <done>Elevated tiles at the same level as the player remain fully opaque. Only tiles with elevation strictly greater than the player's current elevation that are positioned in front of the player become transparent.</done>
</task>

<task type="auto">
  <name>Task 2: Fix NPC click interaction and add chat bubble cursor</name>
  <files>apps/web/src/game/rendering/EntityRenderer.ts</files>
  <action>
The NPC click handler in WorldScene.ts (line 432) works correctly — it emits `npc:interact` when an NPC entity is clicked. The problem is in EntityRenderer.ts where the `isClickable` guard on line 555 only includes `creature`, `plant`, and `mineral`. NPCs and items fall through to a bare `sprite.setInteractive()` (line 640) which creates a default hit area covering the whole texture. This can be unreliable for NPCs with large transparent regions in their sprite textures — Phaser uses the full texture rectangle as the hit area, but many pixels are transparent and won't register clicks properly with some Phaser configurations.

**Step 1:** Expand the `isClickable` check on line 555 to include `npc` and `item`:

```typescript
const isClickable = entity.type === 'creature' || entity.type === 'plant' || entity.type === 'mineral' || entity.type === 'npc' || entity.type === 'item';
```

This gives NPCs and items proper hit areas, cursor styling, and hover glow effects — matching the treatment creatures/plants/minerals already get.

**Step 2:** Inside the `if (isClickable)` block, after `sprite.setInteractive(hitRect, ...)` (line 581) and the `sprite.input!.cursor = 'pointer'` line (582), add a cursor override specifically for NPCs to show a chat bubble cursor:

```typescript
// NPCs get a chat-bubble cursor to indicate they are interactable
if (entity.type === 'npc') {
  sprite.input!.cursor = 'url(/assets/cursors/chat-bubble.png) 16 16, pointer';
}
```

**Step 3:** Create the chat bubble cursor image. Generate a 32x32 PNG cursor at `apps/web/public/assets/cursors/chat-bubble.png`. Use a simple white speech bubble outline on transparent background. The cursor hotspot is at (16, 16) center.

To create the cursor, add a minimal SVG-based approach: create the file using a base64-encoded PNG data URI in the CSS fallback. Alternatively, since this is a game with Phaser, use a programmatic approach:

Create the cursor as a small PNG file. If creating a PNG is not straightforward in the CLI, use an inline SVG data URI as the cursor instead:

```typescript
if (entity.type === 'npc') {
  const chatSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M6 4h20c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H14l-6 6v-6H6c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' fill='white' stroke='%23333' stroke-width='2'/></svg>`;
  sprite.input!.cursor = `url("${chatSvg}") 16 16, pointer`;
}
```

**Step 4:** For items, keep the default `pointer` cursor (already set on line 582).

**Step 5:** The hover glow effect (lines 589-638) already works generically for any `isClickable` entity. NPCs will get the outline glow on hover via the existing code. The `featureBounds` variable will be null for NPCs (they're not features), so the else branch (lines 610-614) runs — drawing the outline around the full sprite bounds. This is correct for NPCs.

**Step 6:** Remove the bare `sprite.setInteractive()` fallback in the else block (line 640). Since all interactive entity types are now in `isClickable`, the else branch should not call `setInteractive()` at all — only unknown/non-interactive entity types fall through, and they should not be interactive. Replace line 640 with nothing (remove the else block, or keep it empty for clarity):

```typescript
} // close the if (isClickable) block — no else needed
```

Wait — actually, reviewing the WorldScene.ts gameobjectdown handler, it also handles `artifact` type entities. Artifacts should remain clickable. Add `artifact` to isClickable as well if not already there. Check: artifact IS handled on line 482 of WorldScene.ts. So:

```typescript
const isClickable = entity.type === 'creature' || entity.type === 'plant' || entity.type === 'mineral' || entity.type === 'npc' || entity.type === 'item' || entity.type === 'artifact';
```

With all entity types that have click handlers now in `isClickable`, the else branch on line 639-641 is dead code for interactive entities. Remove the `sprite.setInteractive()` from the else branch. If there are other entity types that should not be interactive, the else branch should simply not set them interactive.
  </action>
  <verify>npx nx run web:build compiles without errors</verify>
  <done>
    - NPCs have proper hit areas and respond to clicks (gameobjectdown fires, npc:interact emits)
    - Hovering over NPCs shows a chat bubble cursor icon (SVG data URI)
    - Hovering over NPCs shows a white outline glow (reuses existing hover glow logic)
    - Items and artifacts are also properly interactive with pointer cursor
    - The else branch no longer calls setInteractive on unknown entity types
  </done>
</task>

<task type="auto">
  <name>Task 3: Reduce Y-axis isometric collision multiplier from 2x to 1.5x</name>
  <files>
    packages/game-logic/src/movement/pixel-validation.ts
    packages/game-logic/src/movement/pixel-validation.test.ts
    apps/game-server/src/game/movement.service.ts
    apps/web/src/game/scenes/WorldScene.ts
  </files>
  <action>
Currently, `createIsometricCollisionCheck` blocks the entire tile north of an elevated wall (tile at y when y+1 is an elevated wall). This effectively extends the wall collision by 1 full tile (128px) in the Y direction, giving a 2x multiplier (wall tile + 1 full extension tile = 2 tiles). The user wants 1.5x: the wall tile + 0.5 tile extension = 1.5 tiles = 192px total collision zone.

Since `isSolid(tileX, tileY)` is a binary tile-level check, we cannot do fractional tile blocking at this level. The fix needs to happen at the pixel level inside `resolvePixelCollision`.

**Approach:** Modify `createIsometricCollisionCheck` to accept a pixel Y position parameter so it can do sub-tile checks. Since the existing `isSolid` interface is `(tileX, tileY) => boolean` and is used throughout the collision resolution, the cleanest approach is to reduce the PLAYER_HITBOX height for the isometric extension check only.

Actually, the simplest effective approach: reduce `PLAYER_HITBOX.height` from `TILE_SIZE_PX * 0.5` (64px) to `TILE_SIZE_PX * 0.375` (48px). This shrinks the vertical collision extent, allowing the player to get 16px closer to walls before the top hitbox corners cross into a blocked tile. Combined with the south-neighbor extension in `createIsometricCollisionCheck`, this gives an effective collision zone of about 1.625 tiles instead of 2.0 tiles.

However, this changes ALL collision behavior, not just the isometric extension. A better approach:

**Better approach — reduce the isometric extension from 1 full tile to 0.5 tiles using a pixel-aware check:**

Modify `createIsometricCollisionCheck` to accept an optional `playerPy` parameter (player Y position in pixels) so it can do a sub-tile check. When the south neighbor is an elevated wall, instead of blocking the entire tile, only block if the player's foot position is in the southern half of the current tile (within 0.5 tiles = 64px of the wall boundary).

BUT, `isSolid` doesn't receive `playerPy` — it only gets `tileX, tileY`. The fix needs to be in `resolvePixelCollision` itself.

**Simplest correct approach:** Keep `createIsometricCollisionCheck` as a binary tile check BUT change it to NOT block the north tile. Instead, add a new boundary-check in `resolvePixelCollision` that specifically handles the isometric extension at the pixel level. This is too invasive.

**Pragmatic approach — adjust the hitbox height for the south-neighbor check only:**

Modify `createIsometricCollisionCheck` to return metadata about whether a collision is from the isometric extension vs. base collision. Then in `resolvePixelCollision`, apply a tighter tolerance for isometric-extended tiles.

This is getting complex. The **simplest effective change** that achieves approximately 1.5x:

Change `PLAYER_HITBOX.height` from `Math.round(TILE_SIZE_PX * 0.5)` (64px) to `Math.round(TILE_SIZE_PX * 0.375)` (48px). This reduces the hitbox height from 64px to 48px. The total effective collision zone for the isometric check becomes: the wall tile blocks via base collision. The north tile is fully marked solid by `createIsometricCollisionCheck`. But the player's hitbox top edge is now only 48px above feet instead of 64px. The player can walk further into the "blocked" north tile before the top corners trigger. Effective wall zone = 128px (tile) + 48px (hitbox reach into north tile) = 176px = 1.375 tiles. Close to 1.5x.

To get closer to 1.5x (192px): keep PLAYER_HITBOX.height at 64px but adjust the south-neighbor check. Instead of blocking the ENTIRE north tile (128px), only block the southern HALF of it. This can be achieved by a pixel-position-aware version of the check.

**Final approach — simplest and cleanest:**

In `resolvePixelCollision`, when `hitsWall` returns true for a candidate position, check if the collision was caused by the isometric extension (south-neighbor check). If so, allow the player to be in the northern half of that tile. This requires `isSolid` to convey which type of collision it was.

Since that's complex, use this simpler approach: **remove** the south-neighbor full-tile block from `createIsometricCollisionCheck` and instead add a half-tile Y-boundary check directly in the isometric wrapper.

Modify `createIsometricCollisionCheck` to take a new parameter `extensionFraction` (default 0.5, meaning 0.5 tiles = 64px extension instead of 1.0 tiles = 128px). The function needs access to the pixel position to do sub-tile checks, so change the return type from `(tileX, tileY) => boolean` to `(tileX: number, tileY: number, pixelY?: number) => boolean`.

In `resolvePixelCollision`, update the `hitsWall` calls to pass `cpy` as the pixelY:

```typescript
function hitsWall(cpx: number, cpy: number): boolean {
  const corners = [
    { x: cpx - hw, y: cpy - hh },
    { x: cpx + hw - 1, y: cpy - hh },
    { x: cpx - hw, y: cpy - 1 },
    { x: cpx + hw - 1, y: cpy - 1 },
  ];
  return corners.some(c => isSolid(toTile(c.x), toTile(c.y), c.y));
}
```

Then in `createIsometricCollisionCheck`:

```typescript
export function createIsometricCollisionCheck(
  baseSolid: (tileX: number, tileY: number) => boolean,
  getHeight: (tileX: number, tileY: number) => number,
): (tileX: number, tileY: number, pixelY?: number) => boolean {
  return (tileX: number, tileY: number, pixelY?: number): boolean => {
    if (baseSolid(tileX, tileY)) return true;

    const southY = tileY + 1;
    if (baseSolid(tileX, southY) && getHeight(tileX, southY) >= 1) {
      // Only block the southern portion of this tile (1.5x total instead of 2x)
      // If pixelY is provided, check if we're in the southern half of the tile
      if (pixelY !== undefined) {
        const TILE_PX = 128; // TILE_SIZE_PX
        const tileTopY = tileY * TILE_PX;
        const tileMidY = tileTopY + TILE_PX * 0.5; // midpoint of tile
        // Only block if pixel position is in the southern half (closer to the wall)
        return pixelY >= tileMidY;
      }
      // Fallback: full tile block if no pixelY provided (backward compat)
      return true;
    }

    return false;
  };
}
```

This ensures that the isometric extension only blocks the bottom half (64px) of the north tile instead of the full 128px. Total collision zone: wall tile (128px) + half extension (64px) = 192px = 1.5 tiles = 1.5x.

**IMPORTANT:** The `isSolid` callback signature changes to include an optional `pixelY` parameter. This is backward compatible since the parameter is optional. Update both places that call `isSolid` in `resolvePixelCollision`'s `hitsWall`:

Pass `c.y` (the corner's pixel Y position) as the third argument to `isSolid`.

Also update the `resolvePixelCollision` function signature's `isSolid` parameter type:

```typescript
isSolid: (tileX: number, tileY: number, pixelY?: number) => boolean,
```

**Update tests in pixel-validation.test.ts:**

1. Update existing `createIsometricCollisionCheck` tests to pass pixelY values.
2. Add new test: tile north of elevated wall is NOT blocked when pixelY is in the northern half of the tile (pixelY < tileMidY).
3. Add new test: tile north of elevated wall IS blocked when pixelY is in the southern half (pixelY >= tileMidY).
4. Add new test: backward compatibility — when pixelY is omitted, full tile block still applies.
5. Update any existing tests that call `createIsometricCollisionCheck` result without pixelY — they should still pass since the fallback is full-tile blocking.

**Server-side (movement.service.ts):** The `createIsometricCollisionCheck` call on line 179 doesn't need changes — the returned function now accepts optional pixelY. The server's `resolvePixelCollision` call will pass pixelY through corners automatically once pixel-validation.ts is updated.

**Client-side (WorldScene.ts):** Same — the `createIsometricCollisionCheck` call on line 2572-2574 doesn't need changes. The PixelMovementController calls `resolvePixelCollision` which will handle the pixelY parameter internally.
  </action>
  <verify>
npx nx run game-logic:test -- --grep "createIsometricCollisionCheck" passes all tests (old + new).
npx nx run game-logic:test passes overall (excluding pre-existing creature-ai failures).
npx nx run game-server:build compiles without errors.
npx nx run web:build compiles without errors.
  </verify>
  <done>
    - createIsometricCollisionCheck now takes pixelY and only blocks the southern half of the north tile (0.5 tiles extension instead of 1.0)
    - resolvePixelCollision passes corner pixelY to isSolid for sub-tile isometric checks
    - Effective collision zone near walls: 1.5x (wall + 0.5 tile) instead of 2.0x (wall + 1.0 tile)
    - Both client and server use the updated check without code changes (backward compatible signature)
    - All existing tests pass, new sub-tile tests added
  </done>
</task>

</tasks>

<verification>
1. `npx nx run web:build` — compiles without errors (Tasks 1, 2, 3)
2. `npx nx run game-server:build` — compiles without errors (Task 3)
3. `npx nx run game-logic:test` — all tests pass including new isometric collision tests (Task 3)
4. Manual: Stand on an elevated floor (elevation 2+) — surrounding tiles at same elevation remain fully opaque (Task 1)
5. Manual: Click on an NPC — dialog opens (Task 2)
6. Manual: Hover over an NPC — chat bubble cursor appears and white outline glow shows (Task 2)
7. Manual: Walk toward a wall — collision zone feels tighter, player can get 0.5 tiles closer than before (Task 3)
</verification>

<success_criteria>
- Tiles at player's elevation stay fully opaque (no incorrect transparency)
- NPC clicks work reliably with proper cursor and hover feedback
- Wall collision Y-axis extension reduced from 1.0 tile to 0.5 tile (1.5x total)
- All builds compile, all game-logic tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/8-fix-three-bugs-1-tiles-incorrectly-trans/8-SUMMARY.md`
</output>
