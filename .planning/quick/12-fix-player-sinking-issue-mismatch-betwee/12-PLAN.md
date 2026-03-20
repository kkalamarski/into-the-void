---
phase: quick-12
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/game/scenes/WorldScene.ts
autonomous: true
requirements: [QUICK-12]

must_haves:
  truths:
    - "Player sprite transitions smoothly between tiles of different elevation without sudden vertical jumps"
    - "Player never visually sinks into a tile they are walking on"
    - "Remote players also get smooth elevation transitions"
    - "Elevation rendering of tiles themselves is unchanged"
  artifacts:
    - path: "apps/web/src/game/scenes/WorldScene.ts"
      provides: "Bilinear elevation interpolation for player and remote player rendering"
      contains: "getInterpolatedElevation"
  key_links:
    - from: "WorldScene.updateLocalPlayerFromPixels"
      to: "WorldScene.getInterpolatedElevation"
      via: "replaces getTileElevation for visual position"
      pattern: "getInterpolatedElevation"
    - from: "WorldScene.updateRemotePlayerInterpolation"
      to: "WorldScene.getInterpolatedElevation"
      via: "replaces getTileElevation for visual position"
      pattern: "getInterpolatedElevation"
---

<objective>
Fix player sinking issue caused by abrupt elevation changes when crossing tile boundaries.

Purpose: When the player walks between two adjacent tiles with different elevation values (e.g., elevation 2 to elevation 0), the player sprite jumps vertically by up to 256px (2 * 128px ELEVATION_HEIGHT_STEP) because the elevation lookup uses `Math.floor(gridX/Y)` which changes instantaneously at tile boundaries. This makes the player appear to "sink" into the ground or "pop" up when crossing certain tile edges, even though the map shows no visible elevation change (the noise-based height generation creates integer elevation steps between adjacent walkable tiles).

Output: Smooth bilinear interpolation of elevation for player sprite positioning, eliminating visual sinking/popping.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/src/game/scenes/WorldScene.ts
@apps/web/src/game/rendering/TileRenderer.ts
@apps/web/src/game/utils/IsometricTransform.ts
@packages/game-logic/src/movement/pixel-validation.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add bilinear elevation interpolation and apply to player rendering</name>
  <files>apps/web/src/game/scenes/WorldScene.ts</files>
  <action>
The root cause: `updateLocalPlayerFromPixels()` and `updateRemotePlayerInterpolation()` both compute elevation using integer tile coordinates (`Math.floor(gridX)`, `Math.floor(gridY)`), then apply `elevation * 128` as a vertical offset. When the player crosses a tile boundary where adjacent tiles have different elevation values (common with noise-based height generation that produces values 0-3), the visual offset changes by 128px per elevation level instantaneously, causing a sudden vertical jump (sinking or popping).

**Fix: Add a `getInterpolatedElevation` method** that uses bilinear interpolation of the 4 surrounding tile elevations based on the player's fractional position within the tile.

1. Add a new private method `getInterpolatedElevation(gridX: number, gridY: number, zoneId?: string): number` to `WorldScene`:
   - Compute `tileX = Math.floor(gridX)`, `tileY = Math.floor(gridY)` (the tile the player is on)
   - Compute fractional offsets `fracX = gridX - tileX`, `fracY = gridY - tileY`
   - Look up elevation at 4 corners using `getTileElevation`:
     - `e00 = getTileElevation(tileX, tileY, zoneId)` (current tile)
     - `e10 = getTileElevation(tileX + 1, tileY, zoneId)` (right neighbor)
     - `e01 = getTileElevation(tileX, tileY + 1, zoneId)` (bottom neighbor)
     - `e11 = getTileElevation(tileX + 1, tileY + 1, zoneId)` (diagonal neighbor)
   - Bilinear interpolation: `elevation = e00 * (1-fracX) * (1-fracY) + e10 * fracX * (1-fracY) + e01 * (1-fracX) * fracY + e11 * fracX * fracY`
   - Return the interpolated (floating-point) elevation value

2. Update `updateLocalPlayerFromPixels(px, py)` (around line 2136):
   - Replace `const elevation = this.getTileElevation(tileX, tileY);` with `const elevation = this.getInterpolatedElevation(gridX, gridY);`
   - The `elevationOffset = elevation * 128` now produces smooth fractional offsets
   - Keep the integer `tileX`/`tileY` for `setData('elevation', ...)` since depth sorting still uses discrete tiles. Use `Math.round(elevation)` for the stored elevation data value to keep depth sorting working correctly.

3. Update `updateRemotePlayerInterpolation()` (around line 2260):
   - Same change: replace `const elevation = this.getTileElevation(tileX, tileY);` with `const elevation = this.getInterpolatedElevation(gridX, gridY);`
   - Use `Math.round(elevation)` for `setData('elevation', ...)` and depth calculation

4. **Do NOT change** `updateLocalPlayerSprite`, `updateRemotePlayer`, or entity rendering methods. Those use server-authoritative tile-level positions and should keep using integer elevation. Only pixel-movement rendering paths need interpolation.

5. **Do NOT change** `createTileWithElevationWorld` or any tile rendering. Tiles must keep their discrete integer elevation for visual stacking.

Important: The `getTileElevation` method already handles clamping and cross-zone lookups. The new `getInterpolatedElevation` simply calls it 4 times and blends the results. No changes to `getTileElevation` itself.
  </action>
  <verify>
Run `npx nx run web:build` to confirm no TypeScript errors. Verify the new method exists and is called from both pixel-movement update paths by searching for `getInterpolatedElevation` in the file.
  </verify>
  <done>
Player sprite uses bilinear elevation interpolation during pixel movement, producing smooth vertical transitions between tiles of different elevation. Remote player sprites also interpolate. No sinking or popping when crossing tile boundaries. Tile rendering is unaffected. Build passes without errors.
  </done>
</task>

</tasks>

<verification>
- `npx nx run web:build` completes without errors
- `grep -n "getInterpolatedElevation" apps/web/src/game/scenes/WorldScene.ts` returns the method definition and both call sites (updateLocalPlayerFromPixels, updateRemotePlayerInterpolation)
- The bilinear interpolation formula is correctly implemented (4-corner sampling with fractional weights)
- `getTileElevation` is NOT modified (still used by entity rendering, tile info display, etc.)
- Tile rendering (`TileRenderer.createTileWithElevationWorld`) is NOT modified
</verification>

<success_criteria>
- Build passes (`npx nx run web:build`)
- Player elevation is interpolated smoothly between adjacent tiles
- No sudden 128px vertical jumps when crossing tile boundaries
- Remote players also get smooth interpolation
- Tile visual rendering unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/12-fix-player-sinking-issue-mismatch-betwee/12-SUMMARY.md`
</output>
