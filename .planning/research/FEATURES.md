# Feature Research: Movement System Overhaul

**Domain:** Isometric grid-based MMO movement (Into the Void)
**Researched:** 2026-02-17
**Confidence:** HIGH (codebase direct inspection + Tibia official docs + Phaser API docs; MEDIUM for competitor behavior patterns via community sources)

---

## Existing System Baseline

What already exists — research does not re-propose these.

| Component | Current State | Problem |
|-----------|---------------|---------|
| WASD keyboard | W→NW, A→SW, S→SE, D→NE (4 diagonal-only) | Tiles directly N/S/E/W of player are unreachable via keyboard |
| Click-to-move | A* pathfinding, cardinal-only neighbors, 150ms step delay | Works correctly; path visualization at destination diamond only |
| Client-side prediction | Sequence-replay reconciliation in `MovementController.ts` | Correct; architecture must not break |
| Camera follow | `startFollow(player, true, 1, 1)` — lerp = 1,1 = instant snap | Camera jumps on each tile step; visible jitter |
| Tile hover highlight | `HoverController` calls `isoTransform.screenToTile()` | Ignores elevation; highlight is visually offset on raised tiles |
| Sprite movement | Normal movement snaps sprite directly; reconciliation uses 50ms tween | No visible sliding between tiles during normal movement |
| Movement speed | WASD `moveDelay = 500ms`, pathfinding `moveDelay = 150ms` | Inconsistent — character speed differs depending on input method |
| Tile speed multiplier | `movementSpeed` field exists on tile definitions, shown in tile info popup | Field is never applied to movement delay |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features players in this genre (Tibia, Albion Online, PoE2, Minecraft Dungeons) assume exist.
Missing these makes the game feel broken or unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full 8-direction WASD (cardinal + diagonal) | Tibia supports 8 directions (numpad 7/9/1/3 for diagonals, hotkey-bindable). PoE2 full WASD has 8 directions. Any isometric grid game needs all 8 to reach every tile without click-to-move. Current 4-diagonal WASD fails to reach N/S/E/W tiles. | LOW | Map W→N, S→S, A→W, D→E as cardinal. Add dual-key pairs: WA→NW, WD→NE, SA→SW, SD→SE. Requires detecting two keys simultaneously in same `handleInput()` frame. `Direction` type already supports all 8. `DIRECTION_VECTORS` already has correct dx/dy for all 8. No type or logic changes needed in shared packages. |
| Consistent movement speed (WASD = click-to-move) | Players who switch input modes expect the same character speed. 500ms vs 150ms delay is jarring — character visibly moves 3x slower on keyboard vs mouse. | LOW | Unify `moveDelay` to a single constant. Both `WorldScene.handleInput()` and `PathfindingController` constructor must use the same value. Recommend 150ms (current pathfinding rate) as the unified baseline — fast enough to feel responsive without overwhelming server at sustained input. |
| Smooth camera follow (lerp, not snap) | Every reference game has smooth camera tracking. Snap makes the game look low-quality. Tibia has a snap-follow (notoriously criticized), but even Tibia's successor Open Tibia clients implement smooth follow. | LOW | Phaser `startFollow` already called with `(player, true, 1, 1)`. Change lerp from `1` to `0.08–0.12`. Value 0.1 is a safe starting point — camera lags slightly behind player, reducing jitter. No structural change; only parameter values change. |
| Accurate tile hover with elevation | Players expect the cursor highlight to match the tile visually under the mouse, not a flat projection behind a raised surface. Already partially solved: click-to-move uses `screenToTileWithElevation()`. Hover uses flat `screenToTile()`. | LOW | `HoverController.update()` calls `isoTransform.screenToTile()`. Replace this one call with `isoTransform.screenToTileWithElevation()` using the elevation callback pattern from `WorldScene`. The method already exists and is correct. This is a bug fix, not a new feature. |
| Tile-to-tile movement animation (walk tween) | Smooth sprite sliding between tiles is standard. Tibia slides sprites between grid positions. Minecraft Dungeons lerps movement. Without it, the character teleports each step, which looks broken and makes grid-movement feel worse than it is. | MEDIUM | Add a tween in `updateLocalPlayerSprite()` for normal (non-reconciliation) movement: tween from current sprite position to new tile screen position over `moveDelay` duration. Currently the reconciliation path uses a 50ms tween; the normal path snaps directly (line 997-999 in WorldScene). Tween duration should equal `moveDelay`. Key risk: tween must complete before next input is processed, or queue must be managed. |

### Differentiators (Competitive Advantage)

Features that set Into the Void apart. Build after table stakes are solid.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Terrain-speed movement (tile movementSpeed) | Slow tiles (swamp, debris, sand) feel tactically meaningful. Fast tiles reward exploration. `movementSpeed` field already exists on tile definitions and displays in the tile info popup — it just is not applied to movement. | MEDIUM | Apply `tileDef.movementSpeed` multiplier to `moveDelay` when stepping onto a tile: `effectiveDelay = moveDelay / movementSpeed`. A tile with `movementSpeed: 0.5` doubles the delay (slower); `movementSpeed: 2.0` halves it (faster). Client applies on prediction; server must apply same multiplier in game-logic or prediction diverges. Requires server-side change. |
| Path visualization with step dots | Showing the full route (not just destination diamond) helps players understand navigation around obstacles. Currently only the destination tile is highlighted in green. | LOW | In `PathfindingController.drawPath()`, iterate `currentPath` and draw a small dot at each waypoint using `isoTransform.gridToScreen()`. All infrastructure is in place. Pure client-side visual; no server changes. |
| Keyboard facing-without-moving (Ctrl+direction) | Tibia supports "face direction without moving" via Ctrl+arrow. Useful when directional combat or emotes are added. Adds tactical depth without movement complexity. | LOW | Intercept Ctrl+WASD in `handleInput()`. Send a `player:face` event instead of `player:move`. No position change. Server updates facing field. Only worthwhile once the roadmap adds directional combat or emotes — defer until then. |
| Run/walk toggle (sprint mode) | A second speed tier adds tactical texture and is common in survival MMOs. | HIGH | Requires stamina system, server-side dual-rate validation, and different animation frames. Do not build in this milestone. High coupling across systems not yet built. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Free-movement (non-grid) WASD | Players from Diablo/PoE want analog feel | Breaks the client-side prediction model. Server validates per-tile steps using discrete positions. Free movement requires physics-based position sync (continuous coordinates), fundamentally changing the networking architecture. The grid is load-bearing for this game. | Tile-to-tile tweens give the visual feel of free movement while keeping grid positions authoritative. This is the correct answer. |
| Camera rotation (rotating isometric view) | Players may want to see behind structures | Sprites are drawn for one fixed angle (isometric oblique projection). Rotating the camera would show wrong sprite faces. All 96x96 sprites would need 4 rotations. Structure tiles would need side-face variants for each direction. Art budget is prohibitive. | Fixed camera is correct for this game. Tibia and Minecraft Dungeons both use fixed isometric angle — it is part of visual identity. |
| Pathfinding across zone boundaries | Players expect click-to-move to work across zone borders | Zone transitions require a server-side zone handoff and loading the adjacent zone's collision map client-side before pathfinding. A* runs within a single `ZONE_SIZE` grid. Cross-zone pathfinding needs a multi-zone graph with high network and memory cost for a feature players rarely need. | Cancel pathfinding at zone edge (current behavior). Add a "cannot path across zones" cursor or message. This is Tibia's model — click in adjacent zone, character walks to border and stops. |
| Diagonal A* pathfinding (8-neighbor A*) | Shorter, more natural-looking paths | The current A* uses cardinal-only neighbors (4-directional). Adding diagonals produces mixed cardinal+diagonal step paths. Server validation and reconciliation treat diagonal steps (NE/NW/SE/SW) differently — a diagonal move is still one tile per step but diagonal. Mixing diagonal steps into pathfinding requires server validation to accept diagonal moves mid-path, which is untested. Do not combine with the WASD diagonal fix in the same phase — the WASD fix adds diagonal steps for keyboard only; pathfinding is a separate system. | Keep pathfinding cardinal-only for now. Investigate diagonal A* as a separate tracked item after movement overhaul is stable. |
| Scroll zoom | Players may want to zoom in/out | Already commented out in WorldScene (scroll wheel zoom was disabled). Zoom changes break the viewport culler bounds and tile visibility calculations. Isometric tile alignment at non-1.5x zoom creates visual glitches. | Fixed 1.5x zoom is correct. If zoom is needed, it is a separate milestone that requires auditing viewport culling. |

---

## Feature Dependencies

```
[Full 8-direction WASD]
    └──requires──> [Consistent movement speed]
                   (cannot unify delays if WASD is still wrong; fix mapping first, then unify)

[Tile-to-tile movement animation]
    └──requires──> [Consistent movement speed]
                   (tween duration = moveDelay; must be unified or tween duration is ambiguous)
    └──enhances──> [Smooth camera follow]
                   (sprite tween + camera lerp work together; without tween, camera lerp alone looks odd)

[Accurate tile hover with elevation]
    └──uses──> [IsometricTransform.screenToTileWithElevation]
               (already built and tested in click-to-move; hover just needs to call it)

[Terrain-speed movement]
    └──requires──> [Consistent movement speed]
                   (baseline moveDelay must be unified before applying multipliers)
    └──requires──> [Server-side tile speed validation]
                   (client prediction and server must apply same multiplier or diverge)

[Path visualization with step dots]
    └──requires──> nothing new
                   (PathfindingController.drawPath() is the right place; isoTransform already available)

[Keyboard facing-without-moving]
    └──requires──> [Directional facing field on player entity]
                   (facing is not currently tracked separately from movement direction)
    └──requires──> [Directional combat or emotes in roadmap]
                   (feature has no value without a consumer)

[Run/walk toggle]
    └──requires──> [Terrain-speed movement]
                   (shares delay modification infrastructure)
    └──requires──> [Stamina system] (not yet built)
```

### Dependency Notes

- **8-direction WASD requires consistent speed first:** Adding NE/NW/SE/SW keys via dual-key detection is trivial, but the unification of moveDelay is a prerequisite so the player doesn't experience different speeds on diagonal vs cardinal WASD keys (if the server throttles differently).
- **Tile animation requires unified moveDelay:** The tween `duration` must equal `moveDelay`. If the two systems have different delays, one of them will show the sprite arriving before the next input is accepted (visual stutter) or after (sprite overshoots).
- **Camera lerp + sprite tween are complementary:** Camera lerp alone causes noticeable lag between logical position and camera center. Sprite tween alone with snap camera creates a "rubber band" effect. Both together create the smooth feel seen in reference games.
- **Terrain speed requires server changes:** This is the only table-stakes-adjacent feature that touches the server. All other P1 features are pure client changes.

---

## MVP Definition

This is a movement system overhaul milestone. Scope is narrow — five P1 features, all client-side.

### Launch With (this milestone)

- [ ] **Full 8-direction WASD** — The stated problem is unsolved without this. Keyboard players cannot reach all tiles.
- [ ] **Consistent movement speed** — Required alongside the WASD fix. 500ms vs 150ms is perceptibly broken.
- [ ] **Smooth camera follow** — One parameter change. High visual impact, zero risk.
- [ ] **Accurate tile hover with elevation** — Bug fix. Hover is visually wrong today on elevated terrain.
- [ ] **Tile-to-tile movement animation** — The highest-impact "feel" improvement. Makes movement look intentional.

### Add After Validation (v1.x, same milestone if time permits)

- [ ] **Terrain-speed movement** — Add when server team can coordinate. Client-side: read `movementSpeed` from tile. Server-side: apply same multiplier in game-logic.
- [ ] **Path visualization with step dots** — Pure visual polish. Improves pathfinding UX with no risk.

### Future Consideration (v2+)

- [ ] **Keyboard facing-without-moving** — Only useful once directional combat or emotes exist in the roadmap.
- [ ] **Run/walk toggle** — Requires stamina system. Defer until survival mechanics milestone.
- [ ] **Diagonal A* pathfinding** — Requires server validation changes. Coordinate separately after movement milestone is stable.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Full 8-direction WASD | HIGH | LOW | P1 |
| Consistent movement speed | HIGH | LOW | P1 |
| Smooth camera follow | HIGH | LOW (one param change) | P1 |
| Accurate tile hover with elevation | MEDIUM (bug fix) | LOW (one method swap) | P1 |
| Tile-to-tile movement animation | HIGH | MEDIUM | P1 |
| Terrain-speed movement | MEDIUM | MEDIUM + server | P2 |
| Path visualization with step dots | LOW | LOW | P2 |
| Keyboard facing-without-moving | LOW | LOW | P3 |
| Diagonal A* pathfinding | MEDIUM | MEDIUM + server | P3 |
| Run/walk toggle | MEDIUM | HIGH + new systems | P3 |

**Priority key:**
- P1: Must have for this milestone — the stated movement problem is not solved without them
- P2: Should add if time permits within this milestone
- P3: Future milestone — do not start in this sprint

---

## Competitor Feature Analysis

| Feature | Tibia | Albion Online | Path of Exile 2 | Our Current | Our Target |
|---------|-------|---------------|-----------------|-------------|------------|
| WASD directions | 8-direction (rebindable to WASD); diagonals via dual-key or numpad | No native WASD; 8-way key binding "not smooth" per community | Full 8-direction WASD natively | 4 diagonal-only | 8-direction dual-key WASD |
| Click-to-move | Yes, auto-routes obstacles | Yes, primary input | Yes (also WASD) | Yes (A*, 150ms) | Keep as-is |
| Camera follow | Snap (historically criticized) | Smooth follow | Smooth follow | Snap (lerp=1) | Lerp ~0.1 |
| Walk animation | Sprite slides between tiles | Smooth sprite animation | Smooth animation | Snap (no tween) | Tween over moveDelay |
| Movement speed consistency | Keyboard = click speed | Keyboard = click speed | Keyboard = click speed | 500ms vs 150ms inconsistent | Unified 150ms |
| Terrain speed modifiers | Yes (mud, floors slow) | Yes (terrain effects speed) | Yes (ground effects) | Field exists, unused | Apply movementSpeed field |
| Hover highlight | Shows tile/item name | Cursor changes | Cursor changes | Diamond, elevation-wrong | Elevation-corrected diamond |
| Path visualization | No path shown | No path shown | Subtle dotted for some skills | Destination diamond | Destination diamond + step dots (P2) |

---

## Existing System Integration Constraints

These existing systems constrain what can change without breaking reconciliation or networking.

| System | File | Constraint |
|--------|------|------------|
| Client-side prediction | `MovementController.ts` | All input must go through `processInput(direction: Direction)`. Do not bypass. Sequence numbers must stay intact. |
| Server reconciliation | `MovementController.reconcile()` | `lastProcessedInput` sequence replay must not break. Do not add new input pathways outside this flow. |
| PathfindingController | `PathfindingController.ts` | `moveDelay` is passed in constructor from WorldScene. Changing the constant means updating the WorldScene constructor call, not the class. |
| IsometricTransform | `IsometricTransform.ts` | `screenToTileWithElevation()` is correct and tested by click-to-move. HoverController just needs to call it. |
| Camera API | `WorldScene.ts` line 1017 | `startFollow(player, true, 1, 1)` — change the trailing `1, 1` (lerpX, lerpY) only. |
| Direction type | `shared-types/position.ts` | Already: `'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'`. No type changes needed. |
| DIRECTION_VECTORS | `game-logic/validation.ts` | All 8 directions already have correct dx/dy vectors. No game-logic changes for WASD fix. |
| A* pathfinding | `game-logic/pathfinding.ts` | Cardinal-only neighbors for pathfinding. Do not change in this milestone — WASD diagonal fix is independent of pathfinding diagonal support. |

---

## Sources

- Tibia official controls documentation (8-direction movement, all directions): https://www.tibia.com/gameguides/?subtopic=manual&section=controls
- Phaser 3 Camera API — setLerp, startFollow, setDeadzone: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/camera/
- "Fix Your Isometric Controls" — 45-degree rotation pattern for WASD in isometric: https://www.tumblr.com/blubberquark/621835025877499904/this-is-a-pet-peeve-of-mine-i-push-the-right
- Handling height in isometric tilemaps (elevation correction in tile picking): https://erikonarheim.com/posts/handling-height-in-isometric/
- WASD + Isometric diagonal problem (gamedev.net community thread): https://www.gamedev.net/forums/topic/446061-wasd-isometric-2-keys-to-move-forward/
- Albion Online WASD community debate (click-to-move vs WASD for isometric): https://steamcommunity.com/app/761890/discussions/0/3046104336680783318/
- Path of Exile 2 WASD implementation feedback: https://steamcommunity.com/app/2694490/discussions/0/594008890765478462/
- Direct codebase inspection: `apps/web/src/game/scenes/WorldScene.ts`, `systems/MovementController.ts`, `systems/PathfindingController.ts`, `systems/HoverController.ts`, `utils/IsometricTransform.ts`, `packages/game-logic/src/movement/validation.ts`, `packages/game-logic/src/movement/pathfinding.ts`

---
*Feature research for: Isometric MMO movement system overhaul*
*Researched: 2026-02-17*
*Confidence: HIGH for P1 features (codebase-confirmed); MEDIUM for P2/P3 features (competitor patterns)*
