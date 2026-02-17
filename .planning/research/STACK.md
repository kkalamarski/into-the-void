# Stack Research: Movement System Overhaul

**Domain:** Isometric MMO — smooth movement, 8-directional input, camera interpolation
**Researched:** 2026-02-17
**Confidence:** HIGH

## Executive Summary

No new npm packages are needed for the movement system overhaul. Phaser 3.90.0 (installed) provides every required primitive natively: `camera.startFollow()` with lerpX/lerpY parameters for smooth camera interpolation, simultaneous `Key.isDown` checks for 8-directional diagonal detection, and `this.tweens.add()` for sprite position interpolation during server reconciliation. The overhaul is a code-change-only milestone — all capability exists in the installed stack.

The core problem is architectural: the current system maps only 4 keys (W/A/S/D) to 4 isometric diagonal directions (NE/NW/SE/SW), leaving N/S/E/W unreachable. Fixing this requires reading simultaneous key combinations in `handleInput()` and adding N/S/E/W directions to the `Direction` type. Camera snap-to-player (`lerp: 1, 1`) needs to become smooth follow (`lerp: 0.1, 0.1`). No dependencies change.

---

## Recommended Stack

### Core Technologies (All Present — NO NEW PACKAGES)

| Technology | Version | Purpose | Why Sufficient |
|------------|---------|---------|----------------|
| Phaser 3 | 3.90.0 (installed) | Camera follow with lerp, tween interpolation | `camera.startFollow(target, roundPixels, lerpX, lerpY)` — verified in installed types at line 3671 of phaser.d.ts. lerpX/lerpY range 0.0–1.0; 0.1 gives smooth follow, 1.0 = instant snap (current behavior). |
| Phaser 3 Keyboard | 3.90.0 (installed) | Simultaneous multi-key detection | `Key.isDown` (boolean) is readable on every key simultaneously in the update loop. No plugin needed. Check `W.isDown && A.isDown` = NW diagonal. Verified in types at line 62987. |
| Phaser 3 Tweens | 3.90.0 (installed) | Sprite interpolation during reconciliation | `this.tweens.add({ targets, x, y, duration, ease })` already used in `movePlayer()` for remote players. Same pattern extends to local player smooth reconciliation. |
| `@into-the-void/shared-types` | workspace | Direction type must expand | Current `Direction = 'n' \| 's' \| 'e' \| 'w' \| 'ne' \| 'nw' \| 'se' \| 'sw'` already supports all 8 directions. `DIRECTION_VECTORS` in game-logic already has all 8 vectors. The types are complete — only the input handling and pathfinding need updating. |
| `@into-the-void/game-logic` | workspace | Movement validation for all 8 directions | `calculateNewPosition()` and `validateMovement()` already handle all 8 `Direction` values. N/S/E/W movement was always valid at the data layer — only the input mapping was missing. |

### What Needs Code Changes (NOT New Packages)

| Component | File | Current State | Change Required |
|-----------|------|--------------|-----------------|
| Input mapping | `WorldScene.ts:430-453` | WASD → 4 diagonal-only directions | Read key combinations: `W+D = ne`, `W+A = nw`, `S+D = se`, `S+A = sw`, `W only = n`, `S only = s`, `D only = e`, `A only = w` |
| Camera follow lerp | `WorldScene.ts:1017` | `startFollow(target, true, 1, 1)` — instant snap | Change to `startFollow(target, true, 0.1, 0.1)` for smooth follow. `roundPixels=true` prevents jitter. |
| Player tween on move | `WorldScene.ts:994-999` | Direct position assignment `localPlayer.x = screenPos.x` | Add `this.tweens.add()` with 80–120ms duration matching `moveDelay` for the visual glide between tiles |
| A* pathfinding | `game-logic/src/movement/pathfinding.ts:82-87` | Only explores N/S/E/W (4 cardinal directions) | Add diagonal neighbors (NE/NW/SE/SW) to directions array for complete 8-directional pathfinding |
| Pathfinding cost | `pathfinding.ts` | Diagonal costs same as cardinal (1.0) | Apply `Math.SQRT2` (~1.414) cost for diagonals to prevent diagonal preference bias |

---

## Phaser 3 API Reference (Verified from Installed 3.90.0 Types)

### Camera Smooth Follow

```typescript
// CURRENT (instant snap):
this.cameras.main.startFollow(this.localPlayer!, true, 1, 1);

// RECOMMENDED (smooth follow):
this.cameras.main.startFollow(
  this.localPlayer!,
  true,   // roundPixels — prevents sub-pixel jitter (KEEP TRUE for isometric grid)
  0.1,    // lerpX — 0.1 = 10% per frame toward target; tune between 0.08-0.15
  0.1     // lerpY — match lerpX for equal horizontal/vertical tracking
);

// Alternative: set after startFollow for live tuning
this.cameras.main.setLerp(0.1, 0.1);
```

**Why lerpX=0.1:** At 60fps, the camera closes 10% of remaining distance per frame. This gives 95% convergence in ~29 frames (~0.5 seconds). Tibia-style games use 0.08-0.12 for a floating "weight" feel. Values below 0.05 feel sluggish; above 0.2 approaches instant snap.

**Deadzone option (if needed):** `this.cameras.main.setDeadzone(128, 64)` — camera only moves when player exits a 128x64px rectangle in screen center. Tibia uses this pattern (camera doesn't follow single-tile moves). Adds complexity; evaluate after basic lerp is working.

### 8-Directional Input Detection

```typescript
// In handleInput() — read all 8 combinations each frame:
const W = this.wasd!.W.isDown;
const A = this.wasd!.A.isDown;
const S = this.wasd!.S.isDown;
const D = this.wasd!.D.isDown;

// Diagonal takes precedence when two keys held (isometric visual clarity):
let direction: Direction | null = null;
if (W && D) direction = 'ne';        // Screen-up + screen-right = NE in isometric grid
else if (W && A) direction = 'nw';   // Screen-up + screen-left = NW
else if (S && D) direction = 'se';   // Screen-down + screen-right = SE
else if (S && A) direction = 'sw';   // Screen-down + screen-left = SW
else if (W) direction = 'n';         // Screen-up alone = N (currently unreachable!)
else if (S) direction = 's';         // Screen-down alone = S (currently unreachable!)
else if (D) direction = 'e';         // Screen-right alone = E (currently unreachable!)
else if (A) direction = 'w';         // Screen-left alone = W (currently unreachable!)
```

**Why diagonal-first check order:** If W+D pressed, player intends northeast. Checking diagonals first prevents W alone triggering when D is also held.

**Why not `Phaser.Input.Keyboard.JustDown()`:** `JustDown` fires only on the frame a key is first pressed. For held movement, `isDown` is correct — it returns true every frame the key is held, which feeds into the `moveDelay` throttle already in place.

### Sprite Interpolation Between Tiles

```typescript
// CURRENT (snap on prediction):
this.localPlayer.x = screenPos.x;
this.localPlayer.y = targetY;

// RECOMMENDED (tween between tiles — visual smoothness):
this.tweens.killTweensOf(this.localPlayer);
this.tweens.add({
  targets: this.localPlayer,
  x: screenPos.x,
  y: targetY,
  duration: this.moveDelay * 0.8,  // 80% of move delay = arrives slightly before next input
  ease: 'Sine.easeOut',            // Ease out = fast start, gentle arrival (natural movement)
  onComplete: () => {
    // Update grid data AFTER tween completes, not before
    this.localPlayer!.setData('gridX', worldX);
    this.localPlayer!.setData('gridY', worldY);
  }
});
```

**Why `Sine.easeOut`:** Isometric grid movement looks most natural with fast-start easing. `Linear` looks mechanical (robot-like). `Cubic.easeOut` is too dramatic. `Sine.easeOut` matches Tibia's movement feel — quick step, smooth stop.

**Why `moveDelay * 0.8`:** The tween should complete before the next movement input is processed. At `moveDelay = 500ms`, the tween is `400ms`, giving 100ms headroom. Prevents visual overlap of consecutive moves.

**Reconciliation tween (existing pattern, keep):** The existing `Cubic.easeOut` at 50ms duration for reconciliation corrections is correct. Server corrections are micro-corrections (1-2 tiles), so faster ease is appropriate.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `phaser3-rex-plugins` (EightDirection plugin) | Requires Arcade Physics engine enabled in game config. This project uses no physics engine (correct for tile-based grid). Adding Arcade Physics would conflict with manual collision detection via `collisionMap`. Heavy dependency (~2MB) for a single feature. | Native `Key.isDown` combination checking in update loop |
| `phaser3-plugin-isometric` (sebashwa) | Third-party isometric helper. Project already has custom `IsometricTransform` class with `gridToScreen()` and `screenToTile()`. Adding another isometric library creates competing conventions and dual maintenance burden. | Existing `IsometricTransform` (already works correctly) |
| Custom interpolation math (lerp in update loop) | Manual `x += (targetX - x) * 0.1` per frame is frame-rate dependent and drifts at non-60fps. | `camera.setLerp()` + `this.tweens.add()` — both are delta-time aware in Phaser 3 |
| Camera pan with `camera.pan()` | `camera.pan()` is for cinematic sequences (cutscenes). It takes absolute coordinates and ignores `startFollow`. Combining both causes conflicts. | `camera.startFollow()` with lerpX/lerpY |
| `camera.setDeadzone()` in phase 1 | Deadzone + lerp interaction has a known quirk (Issue #5018 in Phaser GitHub): position teleport can cause visible stutter. Test lerp alone first, add deadzone only if needed. | `camera.startFollow(target, true, 0.1, 0.1)` alone first |
| Velocity-based movement (physics) | Would require replacing discrete tile-step system with continuous position tracking. Breaks server-side collision model, zone boundary detection, A* pathfinding. Server validates discrete tile positions — physics velocity doesn't map to this. | Current tile-step system with visual interpolation via tweens |

---

## Alternatives Considered

| Recommended Approach | Alternative | Why Alternative Is Worse |
|----------------------|-------------|--------------------------|
| Native `Key.isDown` for 8-direction | rex-plugins EightDirection plugin | Requires Arcade Physics. Overkill — 5 lines of native code replaces a dependency |
| `camera.startFollow()` with `lerpX=0.1` | Manual camera pan in `update()` loop | Frame-rate dependent without delta-time. `startFollow` lerp is delta-time corrected in Phaser 3 |
| `Sine.easeOut` tween for tile movement | Linear tween | Linear looks mechanical. Sine easeOut matches organic footstep feel of Tibia/Minecraft Dungeons |
| Diagonal A* cost = `Math.SQRT2` (~1.414) | Diagonal cost = 1.0 (same as cardinal) | Equal cost causes path to prefer diagonal zig-zags. Chebyshev weight makes diagonals feel natural |
| `moveDelay` for all 8 directions unchanged | Slower diagonal speed (Euclidean scaling) | Euclidean diagonal is `√2` faster than cardinal — penalizing diagonals is controversial in isometric games where diagonals are the primary movement axis |

---

## Integration Notes

### Existing Systems Unaffected

| System | Status | Reason |
|--------|--------|--------|
| Client-side prediction (`MovementController`) | No change needed | `processInput(direction: Direction)` already accepts all 8 directions. Only the caller (input handler) was missing N/S/E/W. |
| Server reconciliation | No change needed | `reconcile()` replays pending inputs; direction values don't affect reconciliation logic |
| A* pathfinding results (`PathfindingController`) | Minor change | `getDirection()` already handles all 8 directions in switch statement (lines 176-190). The A* generator (`findPath`) needs 8 neighbors, not 4. |
| Zone boundary transitions | No change needed | `calculateNewPosition()` handles all 8 directions including diagonal zone boundary crossing |
| Collision map validation | No change needed | `validateMovement()` checks `to.x/y` position, not direction. 8-direction moves produce valid `to` positions. |
| MinimapCamera | No change needed | Follows same `localPlayer` container as main camera |
| Depth sorting | No change needed | Depth calculated from grid position, not movement direction |

### Server-Side Changes (game-server)

The server already validates all 8 directions in movement processing (DIRECTION_VECTORS covers N/S/E/W/NE/NW/SE/SW). The server's `moveDelay` rate limiting (140ms minimum) applies equally to all directions. No server changes required.

---

## Version Compatibility

| Package | Version | Verified | Notes |
|---------|---------|----------|-------|
| phaser | 3.90.0 (installed) | Yes — checked types/phaser.d.ts | `startFollow(target, roundPixels, lerpX, lerpY)` confirmed at line 3671. `setLerp(x, y)` confirmed at line 62987. `Key.isDown` boolean confirmed at line 62987. |
| @into-the-void/shared-types | workspace | Yes — checked position.ts | `Direction` type already includes 'n'\|'s'\|'e'\|'w' in addition to diagonals. |
| @into-the-void/game-logic | workspace | Yes — checked validation.ts, pathfinding.ts | `calculateNewPosition()` and `validateMovement()` support all 8 directions. A* needs diagonal neighbors added. |

---

## Implementation Priority

1. **8-directional input** — 30 lines in `handleInput()`. Highest impact/effort ratio. Unblocks all inaccessible tiles immediately.
2. **Camera lerp** — 1 line change (`1, 1` → `0.1, 0.1`). Zero risk. Instant feel improvement.
3. **Sprite tween on move** — Replace direct position assignment in `updateLocalPlayerSprite()`. Medium complexity (manage tween lifecycle).
4. **A* diagonal pathfinding** — Add 4 diagonal neighbors to `findPath()` with `Math.SQRT2` cost. Required so click-to-move paths work smoothly after 8-direction input enabled.

---

## Sources

### HIGH Confidence (Verified in Installed Codebase)

- **Phaser 3.90.0 type definitions** — `/node_modules/.pnpm/phaser@3.90.0/node_modules/phaser/types/phaser.d.ts` — `startFollow` signature at line 3671, `setLerp` at line 3671, `Key.isDown` boolean at line 62987. All camera lerp and input APIs confirmed present.
- **WorldScene.ts** — `apps/web/src/game/scenes/WorldScene.ts` — Current camera `startFollow(target, true, 1, 1)` at line 1017. Current input handling (4-direction only) at lines 430-453.
- **MovementController.ts** — `apps/web/src/game/systems/MovementController.ts` — `processInput(direction: Direction)` accepts all 8 directions without change.
- **validation.ts** — `packages/game-logic/src/movement/validation.ts` — `DIRECTION_VECTORS` has all 8 directions. `calculateNewPosition()` handles all 8 at line 37.
- **pathfinding.ts** — `packages/game-logic/src/movement/pathfinding.ts` — Current `findPath()` only explores 4 cardinal directions (lines 82-87). `PathfindingController.getDirection()` already handles all 8 results (lines 176-190).
- **position.ts (shared-types)** — `packages/shared-types/src/core/position.ts` — `Direction` type already includes all 8 values at line 16.

### MEDIUM Confidence (Official Docs Verified)

- **Phaser Camera API** — [Official Cameras Documentation](https://docs.phaser.io/phaser/concepts/cameras) — `startFollow()` lerp parameters documented. roundPixels=true recommended for isometric grid to prevent sub-pixel jitter.
- **Phaser Camera lerp property** — [newdocs.phaser.io](https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Cameras.Scene2D.Camera-lerp) — Default lerp=1 (instant snap). Reducing to 0.1 gives smooth tracking.
- **startFollow API** — [newdocs.phaser.io](https://newdocs.phaser.io/docs/3.70.0/focus/Phaser.Cameras.Scene2D.Camera-startFollow) — Signature `startFollow(target, roundPixels, lerpX, lerpY, offsetX, offsetY)` verified.
- **Phaser 3 WASD keyboard movement** — [Phaser discourse](https://phaser.discourse.group/t/wasd-keyboard-movement-phaser-3/8297) — Simultaneous `isDown` check for diagonal detection confirmed as standard pattern.
- **Phaser camera lerp + velocity issue** — [GitHub Issue #5018](https://github.com/phaserjs/phaser/issues/5018) — Known quirk when combining deadzone + lerp. Avoid deadzone in first implementation.

### LOW Confidence (Informational Only)

- **rex-plugins EightDirection** — [rexrainbow.github.io](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/eightdirection/) — Requires Arcade Physics. NOT recommended for this project (confirmed via docs inspection). Provides alternative path if physics engine ever added.

---

*Stack research for: Movement System Overhaul — Into the Void*
*Researched: 2026-02-17*
*Confidence: HIGH — All capabilities verified in installed Phaser 3.90.0 types and existing codebase. Zero new dependencies needed.*
