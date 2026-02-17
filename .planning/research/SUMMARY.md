# Project Research Summary

**Project:** Into the Void — Movement System Overhaul
**Domain:** Multiplayer isometric MMO — smooth movement, 8-directional input, camera interpolation
**Researched:** 2026-02-17
**Confidence:** HIGH

## Executive Summary

The movement system overhaul is a focused, low-risk milestone. All required capabilities already exist in the installed stack (Phaser 3.90.0, shared-types, game-logic) — this is a code-change-only effort with zero new dependencies. The core problem is architectural: the client input handler uses a sequential `else-if` chain that only maps 4 isometric diagonals (W=NW, D=NE, S=SE, A=SW), leaving cardinal directions N/S/E/W unreachable via keyboard. The Direction type, DIRECTION_VECTORS, MovementController, and server-side validation already support all 8 directions fully. The fix is approximately 30 lines in `WorldScene.handleInput()`, one parameter change for camera lerp, and a tween added to prediction sprite updates.

The recommended approach is an incremental, dependency-ordered build: adjust the server rate limit first (prevents false rejections once client cadence tightens), extract a unified `MOVE_DELAY_MS = 150` constant (eliminates the 500ms vs 150ms inconsistency that makes WASD feel 3x slower than click-to-move), add 8-directional input resolution, add tile-to-tile sprite tweening, then smooth camera follow. Each step is independently testable and does not touch the prediction/reconciliation architecture, which is correct and must not be modified. Only the visual layer changes (sprite position, camera follow parameters).

The primary risks are timing-related rather than architectural. Tween duration must be 20ms shorter than moveDelay to prevent visual drift during sustained input. The server rate limit must be reduced from 140ms to 125ms before the client delay is reduced, or normal network jitter will trigger false rejections. The minimap camera must retain instant-follow (lerp=1) while only the main camera receives smooth follow. The pitfalls research also documents a second body of knowledge on infinite world chunk streaming — that material applies to a future milestone, not this sprint.

---

## Key Findings

### Recommended Stack

No new packages are needed. Phaser 3.90.0 provides all required primitives: `camera.startFollow()` with lerpX/lerpY for smooth camera interpolation, `Key.isDown` boolean checks readable simultaneously for 8-directional input, and `this.tweens.add()` for sprite interpolation. The `Direction` type in `@into-the-void/shared-types` already includes all 8 values. `DIRECTION_VECTORS` in `@into-the-void/game-logic` already has correct dx/dy for all 8 directions. The full stack is present and verified against installed Phaser 3.90.0 type definitions.

**Core technologies:**
- **Phaser 3.90.0** (camera lerp) — `camera.startFollow(target, true, 0.1, 0.1)` confirmed at line 3671 of installed phaser.d.ts; `roundPixels: true` prevents sub-pixel jitter on isometric grid
- **Phaser 3.90.0** (keyboard input) — Simultaneous `Key.isDown` checks per frame; replaces sequential `else-if` chain with combination detection; no plugin required
- **Phaser 3.90.0** (tweens) — `this.tweens.add({ duration: 130, ease: 'Linear' })` for prediction path; same pattern already used for remote players in `movePlayer()`
- **@into-the-void/shared-types** — `Direction` type already has all 8 values at `packages/shared-types/src/core/position.ts` line 16; no type changes needed
- **@into-the-void/game-logic** — `calculateNewPosition()` and `validateMovement()` already handle all 8 directions; A* pathfinding is the only component needing later diagonal support (P3, future milestone)

### Expected Features

Research cross-referenced against Tibia (official docs), Albion Online (community), and Path of Exile 2 movement conventions. All P1 features are pure client-side changes. Only terrain-speed movement (P2) requires server-side coordination.

**Must have (table stakes):**
- **Full 8-direction WASD** — tiles directly N/S/E/W are currently unreachable; this is the stated problem. Map single keys to isometric diagonals (existing behavior preserved), dual-key combos to cardinals (W+D=N, D+S=E, S+A=S, W+A=W)
- **Consistent movement speed** — 500ms WASD vs 150ms click-to-move is perceptibly broken; character visibly moves 3x slower on keyboard vs mouse. Unify to 150ms via `MOVE_DELAY_MS` constant passed to both `WorldScene.moveDelay` and `PathfindingController` constructor
- **Smooth camera follow** — Change `startFollow` lerp from `(1, 1)` to `(0.1, 0.1)`. One parameter change. Every reference game has smooth camera tracking.
- **Accurate tile hover with elevation** — `HoverController.update()` calls flat `screenToTile()`; replace with `screenToTileWithElevation()` which is already implemented and tested by click-to-move. Pure bug fix.
- **Tile-to-tile movement animation** — Tween local player sprite over 130ms (Linear ease) during prediction. Currently only the reconciliation path tweens (50ms); the normal prediction path snaps directly.

**Should have (competitive):**
- **Terrain-speed movement** — `movementSpeed` field already exists on tile definitions and displays in the UI but is never applied. `effectiveDelay = moveDelay / tile.movementSpeed`. Requires server-side coordination; client and server must apply the same multiplier or prediction diverges.
- **Path visualization with step dots** — Draw waypoint dots along full click-to-move path in `PathfindingController.drawPath()`. Pure client-side visual; no server changes.

**Defer (v2+):**
- **Keyboard facing-without-moving** — Only useful once directional combat or emotes exist in the roadmap
- **Diagonal A* pathfinding** — Requires server validation changes; separate investigation after movement milestone is stable
- **Run/walk toggle** — Requires stamina system not yet designed; high coupling across systems not yet built

### Architecture Approach

The architecture stays almost entirely unchanged. The client prediction/reconciliation loop in `MovementController` is correct and already handles all 8 directions. The server WebSocket protocol shape (`{ direction: Direction; sequence?: number }`) does not change. What changes is confined to five narrow locations: `WorldScene.handleInput()` (key resolution logic), `WorldScene.moveDelay` (constant value 500 to 150), `WorldScene.updateLocalPlayer()` (camera lerp parameters), `WorldScene.updateLocalPlayerSprite()` (prediction path adds tween; reconciliation tween increases from 50ms to 80ms), and `GameGateway.handleMove()` (rate limit tolerance 140ms to 125ms). A new `SpriteAnimationController` is scaffolded as a no-op stub, establishing the correct integration point for future directional sprite animations.

**Major components:**

1. **WorldScene** (MODIFY) — Replace `else-if` input chain with `resolveDirection()`, extract `MOVE_DELAY_MS = 150`, change camera lerp to `(0.1, 0.1)`, add prediction tween
2. **MovementController** (NO CHANGE) — Prediction and reconciliation algorithm is correct; accepts all 8 directions; sequence replay logic is unaffected
3. **PathfindingController** (NO CHANGE) — Uses `moveDelay` from constructor injection; automatically syncs when `WorldScene.moveDelay` changes; `getDirection()` already returns all 8 directions
4. **GameGateway** (MODIFY) — Rate limit `< 140` to `< 125`; provides 25ms jitter tolerance at 150ms client cadence
5. **SpriteAnimationController** (NEW STUB) — Maps Direction to sprite frames; starts as no-op; owned and called by WorldScene; does not change any game logic

### Critical Pitfalls

1. **Server rate limit becomes incompatible the moment client cadence tightens** — At 150ms client delay against 140ms server limit, only 10ms tolerance remains. Normal network jitter of 10-15ms triggers false rejections every few tiles, causing `reconcile()` to fire on correct predictions. Prevention: adjust server limit to 125ms first, as a standalone change, before any client work begins.

2. **Tween duration at or above moveDelay causes visual drift** — At 150ms delay, a 150ms tween completes exactly when the next move fires. Due to `setTimeout`/`requestAnimationFrame` timing imprecision, tweens overlap by 5-10ms and sprite never fully reaches target before being redirected. Prevention: set tween duration to `moveDelay - 20ms` (130ms); always call `tweens.killTweensOf(target)` before starting each new tween.

3. **PathfindingController and WorldScene using different moveDelay values** — `PathfindingController` receives `moveDelay` at construction time. If a hardcoded value is used in either location, WASD and click-to-move operate at different speeds. One will violate the server rate limit, triggering reconciliation on every third step. Prevention: define `const MOVE_DELAY_MS = 150` in WorldScene and pass it to both `this.moveDelay` and the `PathfindingController` constructor.

4. **Camera lerp applied to minimap** — Minimap is a spatial orientation tool. Lerp on minimap creates "looking at where I was 100ms ago" disorientation and makes the position dot misleading. `MinimapCamera.startFollow(target, true)` already has no lerp parameter — do not add one.

5. **Diagonal speed advantage if diagonal A* is added in a future phase** — In the tile-step model, diagonal moves cover sqrt(2) more world distance at the same rate limit as cardinal moves, producing a 41% speed advantage in PvP. For this milestone (visual improvement only), equal rate limits are acceptable. Must be addressed before any PvP distance-based mechanic: server applies `cardinalDelay = 140ms`, `diagonalDelay = round(140 * sqrt(2)) = 197ms`.

---

## Implications for Roadmap

Build order is dictated by dependency chains and multiplayer sync risk. Server changes land first (lowest risk, no user-visible change). Constant extraction second (structural prerequisite). User-visible changes last, in order of visual dependency.

### Phase 1: Server Rate Limit Alignment

**Rationale:** Any reduction in client `moveDelay` will immediately cause false rejections against the existing 140ms server rate limit. This change is isolated to one line in `game.gateway.ts` with no client impact. It must land before Phase 2, and it can be deployed and verified independently.
**Delivers:** Server accepts moves at 150ms cadence with 25ms jitter tolerance (down from 360ms tolerance at 500ms cadence).
**Addresses:** PITFALLS.md Pitfall 2 (rate limit incompatible with smooth movement)
**Avoids:** Reconciliation thrashing that would appear immediately in Phase 2 if this is skipped
**Research flag:** SKIP — exact values calculated and verified in ARCHITECTURE.md (Pattern 4, rate limit calculation).

### Phase 2: Movement Speed Unification

**Rationale:** A single `MOVE_DELAY_MS` constant must be established before any other changes, because tween duration, pathfinding step interval, and input throttle all depend on it. Doing this before input changes means speed is unified even before diagonals are added.
**Delivers:** WASD and click-to-move run at identical 150ms cadence. `const MOVE_DELAY_MS = 150` defined and passed to both systems. First observable improvement: click-to-move is unchanged, WASD is visibly faster.
**Addresses:** FEATURES.md "Consistent movement speed" (table stakes); PITFALLS.md Anti-Pattern 4 (split moveDelay)
**Avoids:** Speed divergence that would appear under sustained input once tweens are added in Phase 4
**Research flag:** SKIP — confirmed in ARCHITECTURE.md (PathfindingController sync detail).

### Phase 3: 8-Directional Input Resolution

**Rationale:** The stated core problem. Safe to implement after server rate limit and client delay are aligned. The `resolveDirection()` function replaces the `else-if` chain. Single-key behavior is preserved (W still maps to 'nw', matching existing isometric screen convention). Dual-key combos add cardinal directions (W+D=N, meaning up-left + up-right = straight up in isometric view).
**Delivers:** All 8 directions reachable via keyboard. N/S/E/W tiles accessible without click-to-move. No type or game-logic changes required anywhere.
**Addresses:** FEATURES.md "Full 8-direction WASD" (P1 table stakes)
**Avoids:** PITFALLS.md Pitfall 6 (isometric keyboard mapping confusion) — diagonal-first check order ensures no flickering when two keys are held
**Research flag:** SKIP — exact implementation specified in STACK.md (8-directional input section) and ARCHITECTURE.md (Pattern 1).

### Phase 4: Tile-to-Tile Movement Animation

**Rationale:** Requires unified moveDelay (Phase 2) to set tween duration correctly. Sprite tweening transforms the visual quality of all movement — both WASD and click-to-move benefit. This is the highest user-impact change in the milestone, and it follows 8-directional input so all 8 directions animate correctly from the start.
**Delivers:** Sprite glides smoothly between tiles (130ms Linear tween on prediction path). Reconciliation tween increased from 50ms to 80ms `Cubic.easeOut` for less abrupt corrections. Remote player interpolation (100ms Linear) unchanged.
**Addresses:** FEATURES.md "Tile-to-tile movement animation" (table stakes); improves feel across all 8 directions simultaneously
**Avoids:** PITFALLS.md Anti-Pattern 5 (tween duration >= moveDelay) — 130ms < 150ms with 20ms buffer; PITFALLS.md Integration Gotcha (tweens + prediction) — `killTweensOf` called before each tween
**Research flag:** SKIP — exact implementation mirrors existing `movePlayer()` for remote players at `WorldScene.ts:944`. Pattern is proven in the codebase.

### Phase 5: Smooth Camera Follow

**Rationale:** Camera lerp interacts with sprite tweening — both together produce the organic follow feel. Camera lerp alone (without sprite tween) creates a "rubber band" look where the camera moves but the sprite snaps. Phase 5 after Phase 4 ensures the full combined effect is visible and testable.
**Delivers:** Main camera lerp `(0.1, 0.1)`. Minimap camera unchanged at instant-follow. Camera glides with the sprite tween organically — no special coordination between tween and camera is needed because `startFollow` tracks live sprite position.
**Addresses:** FEATURES.md "Smooth camera follow" (table stakes)
**Avoids:** PITFALLS.md Anti-Pattern 3 (applying lerp to minimap); Phaser Issue #5018 interaction (deadzone + lerp quirk) by omitting deadzone from this phase
**Research flag:** SKIP — one parameter change verified in STACK.md and ARCHITECTURE.md (Pattern 3). Phaser docs confirm 0.1 is the documented smooth-follow value.

### Phase 6: Hover Elevation Bug Fix

**Rationale:** Isolated change that does not interact with movement timing or tweens. Placed after all movement changes are validated to keep test surface clean. This is a pure bug fix — `screenToTileWithElevation()` already exists and is confirmed correct by click-to-move usage.
**Delivers:** Tile hover highlight correctly tracks elevated tiles. The green hover diamond no longer appears behind raised surfaces.
**Addresses:** FEATURES.md "Accurate tile hover with elevation" (table stakes, bug fix)
**Avoids:** Visual mismatch between hover diamond and actual tile under cursor on elevated terrain
**Research flag:** SKIP — method already exists, tested, and used by click-to-move. One method call swap in `HoverController.update()`.

### Phase 7: SpriteAnimationController Scaffold

**Rationale:** Establishes the integration point for future directional sprite animations without requiring sprite art to exist. Creates the class as a no-op, wires the call site into `WorldScene.handleInput()` after direction resolution. Future directional animation frames plug in without touching WorldScene.
**Delivers:** `SpriteAnimationController` class stub, call site integrated, no visible game change. Directional facing state tracked internally but not yet applied.
**Addresses:** ARCHITECTURE.md "SpriteAnimationController (NEW)" component; future-proofs for directional combat without premature implementation
**Avoids:** PITFALLS.md Pitfall 7 (animation tracks wrong direction) — establishes input-driven direction tracking from the start rather than deriving from position delta later
**Research flag:** SKIP for stub. Research needed when directional sprite assets are created (how isometric screen directions map to 96x96 sprite frame indices).

### Phase Ordering Rationale

- Phases 1-2 are purely backend/constant changes with zero user-visible impact — they de-risk the remaining phases completely
- Phases 3-5 are ordered by visual dependency: input must work across all 8 directions before animation is meaningful; animation must exist before camera lerp shows its full effect
- Phase 6 is isolated and cannot affect movement timing — placed after all movement-related work is validated
- Phase 7 is infrastructure scaffolding with no visible change — placed last so it does not interfere with visual QA of Phases 4-6
- Terrain-speed movement (P2 feature) and path visualization (P2 feature) are excluded from this milestone. Terrain speed requires server-side coordination; path step dots are polish. Neither blocks the core movement feel improvement.

### Research Flags

All phases in this milestone use standard, well-verified patterns. No phase requires `/gsd:research-phase`.

**Future milestones that will need research before starting:**
- **Diagonal A* pathfinding** — Server validation changes, rate-limit split for cardinal vs diagonal (197ms vs 140ms), interaction with reconciliation. Research needed before starting; do not combine with any movement polish sprint.
- **Terrain-speed movement** — Server-side tick validation, client/server multiplier parity, edge cases for near-zero movementSpeed tiles. Research needed when server team is available to coordinate.
- **Infinite world chunk streaming** — Extensive pitfalls documented in PITFALLS.md Part 2 (Pitfalls 1-10 for chunk streaming). That entire section forms the research base for the next major milestone.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All APIs verified in installed Phaser 3.90.0 type definitions at specific line numbers. Zero version unknowns. Zero new packages. |
| Features | HIGH | P1 features confirmed via direct codebase inspection. P2/P3 features via competitor analysis (Tibia official docs, PoE2 community, Albion Online discussions). |
| Architecture | HIGH | All components, file locations, and line numbers verified by direct codebase audit. Target architecture derived from patterns already proven in remote player handling (`movePlayer()`). |
| Pitfalls | HIGH | Movement pitfalls confirmed against Gabriel Gambetta's authoritative prediction/reconciliation model and Valve networking docs. Codebase-specific pitfalls confirmed by direct inspection of `game.gateway.ts`, `MovementController.ts`, `WorldScene.ts`. |

**Overall confidence:** HIGH

### Gaps to Address

- **Diagonal move speed fairness in tile-step model:** All 8 directions use the same 150ms rate limit. Diagonal moves cover sqrt(2) more world distance, producing a 41% speed advantage. For this milestone (visual smoothness improvement), equal rate limits are acceptable. Document as a known tradeoff to address before any PvP distance-based mechanic.

- **Reconciliation tween tuning:** The increase from 50ms to 80ms is a recommended value based on movement feel analysis, not a hard threshold. The correct value depends on server round-trip time in production. This is a low-stakes calibration tunable after deployment without architectural changes.

- **SpriteAnimationController direction semantics:** The stub is straightforward, but when directional sprite frames are created for the 96x96 sprites, the mapping of isometric screen directions to frame indices requires art/lore team alignment. Not a blocker for this milestone; flag for when directional sprites are commissioned.

---

## Sources

### Primary (HIGH confidence — verified in installed codebase)

- `apps/web/src/game/scenes/WorldScene.ts` — Camera `startFollow(target, true, 1, 1)` at line 1017; input handling (4-direction only) at lines 430-453; `moveDelay = 500`; remote player `movePlayer()` tween at lines 944-974
- `apps/web/src/game/systems/MovementController.ts` — `processInput(direction: Direction)` accepts all 8 directions; reconciliation algorithm correct and unchanged
- `apps/web/src/game/systems/PathfindingController.ts` — `moveDelay` injected via constructor at `WorldScene.ts:103`; `getDirection()` returns all 8 directions at lines 176-190
- `apps/game-server/src/game/game.gateway.ts` — Rate limit `< 140ms` at line 133
- `packages/game-logic/src/movement/validation.ts` — `DIRECTION_VECTORS` has all 8 directions; `calculateNewPosition()` and `validateMovement()` handle all 8
- `packages/game-logic/src/movement/pathfinding.ts` — Cardinal-only A* neighbors at lines 82-87; `getDirection()` handles all 8 results at lines 176-190
- `packages/shared-types/src/core/position.ts` — `Direction` type includes all 8 values at line 16
- `node_modules/.pnpm/phaser@3.90.0/.../phaser.d.ts` — `startFollow` signature confirmed at line 3671; `setLerp` confirmed at line 3671; `Key.isDown` boolean confirmed at line 62987

### Secondary (MEDIUM confidence — official documentation)

- Phaser 3 Official Camera Docs — `startFollow()` lerp parameters; `roundPixels: true` recommendation: https://docs.phaser.io/phaser/concepts/cameras
- Phaser 3 API camera.lerp — Default 1 (instant snap), 0.1 = smooth: https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Cameras.Scene2D.Camera-lerp
- Phaser 3 API startFollow — Signature `startFollow(target, roundPixels, lerpX, lerpY, offsetX, offsetY)`: https://newdocs.phaser.io/docs/3.70.0/focus/Phaser.Cameras.Scene2D.Camera-startFollow
- Tibia official controls documentation — 8-direction movement confirmation: https://www.tibia.com/gameguides/?subtopic=manual&section=controls
- Client-side prediction / server reconciliation — Gabriel Gambetta (canonical source): https://www.gabrielgambetta.com/client-side-prediction-live-demo.html
- Source Multiplayer Networking — Valve Developer Community: https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
- Handling height in isometric tilemaps (elevation correction): https://erikonarheim.com/posts/handling-height-in-isometric/

### Tertiary (MEDIUM confidence — community consensus)

- Phaser 3 WASD simultaneous `isDown` pattern: https://phaser.discourse.group/t/wasd-keyboard-movement-phaser-3/8297
- Path of Exile 2 WASD 8-direction implementation feedback: https://steamcommunity.com/app/2694490/discussions/0/594008890765478462/
- Albion Online WASD vs click-to-move community discussion: https://steamcommunity.com/app/761890/discussions/0/3046104336680783318/
- Phaser Camera lerp + deadzone interaction Issue #5018 (avoid deadzone in initial implementation): https://github.com/phaserjs/phaser/issues/5018
- Diagonal movement fix in 2D top-down games: https://jslegenddev.substack.com/p/how-to-fix-diagonal-movement-in-2d

---

*Research completed: 2026-02-17*
*Ready for roadmap: yes*
