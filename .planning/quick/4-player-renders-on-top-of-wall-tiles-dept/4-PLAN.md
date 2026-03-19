---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/game/utils/IsometricTransform.ts
  - apps/web/src/game/scenes/WorldScene.ts
autonomous: true
requirements: ["QUICK-4"]

must_haves:
  truths:
    - "Player walking behind a wall tile is visually occluded (renders behind the wall)"
    - "Player walking in front of a wall tile renders on top of it"
    - "Floor tiles still render correctly below the player at the same position"
    - "Tile-to-tile depth sorting is not broken (walls still render above floors correctly)"
    - "Wall transparency still fades walls that occlude the player for visibility"
  artifacts:
    - path: "apps/web/src/game/utils/IsometricTransform.ts"
      provides: "Unified depth calculation for tiles and entities in same depth space"
    - path: "apps/web/src/game/scenes/WorldScene.ts"
      provides: "Updated player depth calls without entity layer offset"
  key_links:
    - from: "IsometricTransform.calculateDepth"
      to: "WorldScene player depth + TileRenderer tile depth"
      via: "shared depth formula"
      pattern: "calculateDepth.*gridX.*gridY"
---

<objective>
Fix depth sorting so players render behind wall tiles when walking behind them.

Purpose: Currently the player always renders on top of wall tiles due to a blanket
`ENTITY_LAYER_OFFSET = 1000` added to all entity depths. This makes the player
visually float above walls instead of being occluded by them. The fix removes this
blanket offset and uses isometric row position as the primary depth axis so that
entities and tiles in the same depth band sort correctly relative to each other.

Output: Updated IsometricTransform.calculateDepth and WorldScene player depth calls
that place entities in the same depth space as tiles, with a small per-row offset
so entities render above floor tiles at their position but behind wall tiles that
are closer to the camera.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/src/game/utils/IsometricTransform.ts
@apps/web/src/game/scenes/WorldScene.ts
@apps/web/src/game/rendering/TileRenderer.ts
@apps/web/src/game/rendering/DepthSorter.ts
@apps/web/src/game/rendering/EntityRenderer.ts

<interfaces>
From apps/web/src/game/utils/IsometricTransform.ts:
```typescript
const ENTITY_LAYER_OFFSET = 1000; // <-- THIS IS THE PROBLEM

export class IsometricTransform {
  // elevationWeight = 0.1
  calculateDepth(gridX: number, gridY: number, elevation: number = 0, priorityBoost: number = 0, isEntity: boolean = false): number {
    const screen = this.gridToScreen(gridX, gridY);
    // Entities get +1000 depth, making them ALWAYS render above ALL tiles
    return screen.y + (gridX * 0.0001) + (elevation * this.elevationWeight) + priorityBoost + (isEntity ? ENTITY_LAYER_OFFSET : 0);
  }
}
```

Key callers:
- TileRenderer line 251: `calculateDepth(worldX, worldY, elevation)` -- isEntity=false, no boost
- WorldScene lines 816,2094,2190: `calculateDepth(worldX, worldY, elevation, 10, true)` -- player, boost=10
- DepthSorter lines 60,84: `calculateDepth(gridX, gridY, elevation, priorityBoost, true)` -- entities
- EntityRenderer lines 742,1239: `calculateDepth(..., featureDepthBoost, true)` -- world entities
</interfaces>

### Root Cause Analysis

The depth formula uses `screen.y` (= `(gridX+gridY) * tileHeightHalf`) as the primary sort.
For tileHeight=128, tileHeightHalf=64, adjacent rows differ by 64 depth units.

Tiles (isEntity=false): `depth = screen.y + gridX*0.0001 + elevation*0.1`
Entities (isEntity=true): `depth = screen.y + gridX*0.0001 + elevation*0.1 + boost + 1000`

The +1000 offset means an entity at row N has depth ~(N*64 + 1000), while a tile at row
N+15 has depth ~((N+15)*64) = (N*64 + 960). The entity at row N renders ABOVE a tile
15 rows in front of it! This is fundamentally wrong.

### Fix Strategy

Remove `ENTITY_LAYER_OFFSET`. Instead, give entities a small offset (e.g., +0.5) so they
render above floor tiles at the SAME grid position but below tiles at higher iso rows.
Adjacent rows differ by 64 depth units, so a +0.5 offset keeps entities above their own
floor tile without jumping to a different row's depth band.

The existing `updateTileTransparency()` in WorldScene already handles making walls
semi-transparent when they occlude the player, which provides visual feedback even when
the player is correctly hidden behind walls.

### Prior Attempt History (IMPORTANT)

Commit 30adba5 tried giving elevated tiles the entity offset -- broke tile-to-tile sorting.
Commit 79eeeb1 reverted that and used transparency instead.
This plan takes the CORRECT approach: remove the entity offset entirely rather than adding
it to tiles. Both tiles and entities use the same depth space, differentiated only by a
sub-row offset.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove ENTITY_LAYER_OFFSET and unify depth calculation</name>
  <files>
    apps/web/src/game/utils/IsometricTransform.ts
  </files>
  <action>
In `IsometricTransform.ts`:

1. Remove the `ENTITY_LAYER_OFFSET = 1000` constant entirely.

2. Update `calculateDepth` to use a small entity offset instead of the massive layer offset.
   The new formula should be:

   ```typescript
   calculateDepth(gridX: number, gridY: number, elevation: number = 0, priorityBoost: number = 0, isEntity: boolean = false): number {
     const screen = this.gridToScreen(gridX, gridY);
     // Entity offset: small bump so entities render above floor tiles at same position
     // but stay below tiles at higher iso rows (adjacent row diff = 64 units)
     const entityOffset = isEntity ? 0.5 : 0;
     return screen.y + (gridX * 0.0001) + (elevation * this.elevationWeight) + priorityBoost + entityOffset;
   }
   ```

   Key insight: adjacent isometric rows differ by `tileHeightHalf = 64` depth units.
   An entityOffset of 0.5 is large enough to sort above floor tiles at the same position
   (which have 0 offset) but nowhere near enough to jump to the next row's depth band.

3. Update the JSDoc comment to explain the new depth model:
   - Primary sort: screen.y (isometric row = gridX+gridY)
   - Entity offset: +0.5 to render above floor at same position, below walls in front
   - Elevation: small weight for slight visual correction on elevated terrain
   - Priority boost: for local player visibility among peer entities

Do NOT change the method signature -- `isEntity` parameter is still used, just with a
much smaller offset.
  </action>
  <verify>
    Run `npx nx run web:build` -- build succeeds with no type errors.
  </verify>
  <done>
    ENTITY_LAYER_OFFSET removed. calculateDepth uses +0.5 entity offset instead of +1000.
    All existing callers work without changes since the signature is unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 2: Reduce player priority boost and verify depth sorting</name>
  <files>
    apps/web/src/game/scenes/WorldScene.ts
  </files>
  <action>
In `WorldScene.ts`, find all calls to `calculateDepth` for the local player where
`priorityBoost` is set to `10`. These are on lines ~816, ~2094, and ~2190.

The priority boost of 10 was previously needed to ensure the player stood out when
the +1000 offset already guaranteed the player was above terrain. Now that entities
share the same depth band as tiles, a boost of 10 would push the player 10 depth
units above its natural position, which could cause it to render above walls that
are within ~0.15 rows in front (10/64 = 0.15 rows). This would partially defeat
the fix.

Change the `priorityBoost` from `10` to `0.1` in all three locations for the local
player depth calculation. The 0.1 boost is enough to ensure the local player renders
slightly above other entities at the exact same position (tiebreaker) but not enough
to jump above a wall tile even 1 row ahead (which is 64 depth units away).

Search for pattern `calculateDepth(worldX, worldY, elevation, 10, true)` in WorldScene.ts
and replace each `10` with `0.1`.

Also update the `localPlayerPriority` in `DepthSorter.ts` -- it's currently `0.001`
which is fine (even smaller than our 0.1), so it does not need changing. But verify
the DepthSorter `markDirty('local')` flow still works: the DepthSorter calls
`calculateDepth(gridX, gridY, elevation, priorityBoost, true)` where priorityBoost
is 0.001 for the local player. This is correct and compatible.

Do NOT change `updateTileTransparency()` -- it still serves a useful purpose by
fading walls that block the player's view, making the player visible (at 35% alpha)
even when correctly rendered behind the wall. This is good UX.

Do NOT change the `OCCLUSION_*` constants in EntityRenderer.ts -- those handle a
different concern (tall structure occlusion for entities, checking `isStructure` data).
  </action>
  <verify>
    Run `npx nx run web:build` -- build succeeds with no type errors.
  </verify>
  <done>
    Player priority boost reduced from 10 to 0.1 in all WorldScene calculateDepth calls.
    Player now correctly sorts behind wall tiles that are in front of it (higher iso row)
    and above floor tiles at its own position. Wall transparency still fades occluding
    walls for visibility.
  </done>
</task>

</tasks>

<verification>
1. `npx nx run web:build` passes with no errors
2. Manual verification (start dev server, walk a character behind a wall in a hub zone):
   - Player should disappear behind wall tiles when walking behind them
   - Wall tiles in front of the player should fade to 35% alpha (existing transparency)
   - Player should render on top of floor tiles normally
   - Other entities (creatures, NPCs) should also sort correctly behind walls
   - No visual glitches with tile-to-tile sorting (walls above floors, etc.)
</verification>

<success_criteria>
- Player renders behind wall tiles when walking behind them (lower iso row)
- Player renders above floor tiles at the same position
- Wall tiles that occlude the player fade to 35% alpha for visibility
- No regression in tile-to-tile depth sorting
- Build passes cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/4-player-renders-on-top-of-wall-tiles-dept/4-SUMMARY.md`
</output>
