# Phase 23: Movement Animation & Camera Polish - Research

**Researched:** 2026-02-17
**Domain:** Phaser 3 tweens, camera follow, tile movement speed, hover removal
**Confidence:** HIGH

## Summary

Phase 23 adds movement polish to four specific areas: tile-to-tile sprite tweens (prediction path), camera smooth follow, tile movementSpeed applied to move delay, and HoverController removal. The codebase already has all infrastructure in place — this phase is surgical modification of existing code, not new systems.

The current `updateLocalPlayerSprite` method already runs a reconciliation tween (`duration: 50, ease: 'Cubic.easeOut'`) but teleports on prediction (`else` branch sets position directly). The camera `startFollow` uses `(1, 1)` lerp (instant snap). The `moveDelay` is hardcoded to `MOVE_DELAY_MS = 150` without consulting tile speed. `HoverController` exists as a class but is NOT currently imported or instantiated in WorldScene — it was already removed from the scene's active code path but the file still exists.

The critical implementation constraint from prior decisions is that tween duration must be `moveDelay - 20ms` to prevent drift, and `killTweensOf` must be called before each new tween to prevent queuing. The minimap camera must NOT receive lerp (it already uses instant follow via `startFollow(target, true)` with no lerp args, which defaults to `(1,1)` — this is correct and must not change).

**Primary recommendation:** Treat all four plans as small, targeted edits to `WorldScene.ts` (tweens, camera lerp), `MovementController.ts` / `PathfindingController.ts` (movementSpeed delay), and file deletion (HoverController.ts).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| phaser | 3.90.0 (installed) | Tween manager, camera follow | Already in use — this is the game engine |

### No New Dependencies
No new libraries are needed. All four plans use APIs already available in Phaser 3.90.0 and the existing tile registry.

### Installation
```bash
# No new packages required
```

## Architecture Patterns

### Relevant File Map
```
apps/web/src/game/
├── scenes/WorldScene.ts         # Camera follow (updateLocalPlayer), prediction tween (updateLocalPlayerSprite)
├── systems/MovementController.ts  # moveDelay application point
├── systems/PathfindingController.ts  # moveDelay application point (pathfinding step timer)
├── systems/HoverController.ts     # DELETE this file entirely (23-04)
└── rendering/MinimapCamera.ts    # DO NOT CHANGE — already instant-follow

packages/
└── tiles/src/
    ├── registry.ts              # TileRegistry.get(tileId) → TileDefinition
    └── types.ts                 # TileDefinition.movementSpeed: number

packages/shared-types/src/
└── constants.ts                 # MOVE_DELAY_MS = 150
```

### Pattern 1: Prediction Tween (Plan 23-01)

**What:** Every time the local player predicts a move (non-reconciling), add a tween from current position to target position instead of instant teleport.
**When to use:** Inside `updateLocalPlayerSprite()` in the `else` branch (currently sets `x` / `y` directly).

**Current code (WorldScene.ts lines 1030-1050):**
```typescript
if (reconciling && (this.localPlayer.x !== screenPos.x || this.localPlayer.y !== targetY)) {
  this.tweens.killTweensOf(this.localPlayer);
  this.tweens.add({
    targets: this.localPlayer,
    x: screenPos.x,
    y: targetY,
    duration: 50,           // <-- reconciliation tween: increase to 80
    ease: 'Cubic.easeOut',
  });
} else {
  this.localPlayer.x = screenPos.x;  // <-- prediction: replace with tween at 130ms Linear
  this.localPlayer.y = targetY;
}
```

**Target code pattern:**
```typescript
// Source: Phaser 3.90 TweenManager docs + existing codebase pattern
if (reconciling) {
  // Server correction: short snap tween
  this.tweens.killTweensOf(this.localPlayer);
  this.tweens.add({
    targets: this.localPlayer,
    x: screenPos.x,
    y: targetY,
    duration: 80,           // increased from 50 to 80
    ease: 'Cubic.easeOut',
  });
} else {
  // Prediction: slide to next tile
  this.tweens.killTweensOf(this.localPlayer);
  this.tweens.add({
    targets: this.localPlayer,
    x: screenPos.x,
    y: targetY,
    duration: 130,          // moveDelay(150) - 20ms = 130ms
    ease: 'Linear',
  });
}
// NOTE: depth update after tween completes must move to onComplete callback
// OR update depth immediately (depth is based on grid pos, not pixel pos)
```

**Critical:** The current code updates `this.localPlayer.setData('gridX', ...)` and `setDepth()` synchronously AFTER the tween block. This is correct — depth is based on grid position, not screen position, so it can be set immediately before the tween starts.

### Pattern 2: Camera Smooth Follow (Plan 23-02)

**What:** Change main camera lerp from `(1, 1)` to `(0.1, 0.1)`.
**Where:** `updateLocalPlayer()` in WorldScene.ts — the `startFollow` call.

**Current code (WorldScene.ts lines 1058-1061):**
```typescript
this.cameras.main.startFollow(this.localPlayer!, true, 1, 1);
```

**Target:**
```typescript
// Source: Phaser 3 Camera.startFollow(target, roundPixels, lerpX, lerpY)
// lerpX/lerpY: 1 = instant snap, 0.1 = smooth follow
this.cameras.main.startFollow(this.localPlayer!, true, 0.1, 0.1);
```

**Minimap MUST NOT change:**
```typescript
// MinimapCamera.ts — LEAVE ALONE
this.minimapCam.startFollow(target, true); // no lerp args = defaults to (1,1) = instant follow
```

### Pattern 3: Tile movementSpeed Applied to moveDelay (Plan 23-03)

**What:** After each move (prediction), look up the tile just landed on and compute `effectiveMoveDelay = MOVE_DELAY_MS / movementSpeed`. Apply this as the `lastMoveTime` gate in `WorldScene.handleInput()` and as the step delay in `PathfindingController.executeNextStep()`.

**movementSpeed values in the tile registry:**
- `1.0` — most tiles (void_floor, crater_floor, crystal_floor, etc.) → 150ms delay
- `1.2` — ice_floor → 125ms delay (faster)
- `0.8` — fungal_floor → 187ms delay (slower)
- `0.6` — fungal_wall → 250ms delay (slower)
- `0.5` — toxic_pool → 300ms delay (slower)
- `0` — all wall tiles → blocked (isBlocking: true), so never walked on

**Formula:** `effectiveMoveDelay = Math.round(MOVE_DELAY_MS / movementSpeed)`

**Where to apply:**
1. `WorldScene.handleInput()` — the `time - this.lastMoveTime < this.moveDelay` check. `this.moveDelay` must become dynamic per-tile.
2. `PathfindingController.executeNextStep()` — the `window.setTimeout(() => ..., this.moveDelay)` call.

**Approach options:**

Option A: WorldScene reads current tile after each prediction and updates `this.moveDelay`:
```typescript
// After movementController.processInput(direction) in handleInput():
const player = useGameStore.getState().player;
if (player && this.currentTiles && this.chunkManager) {
  const tileNumericId = this.getCurrentTileAt(player.position);
  const tileDef = TileRegistry.get(tileIdToString(tileNumericId));
  this.moveDelay = tileDef.movementSpeed > 0
    ? Math.round(MOVE_DELAY_MS / tileDef.movementSpeed)
    : MOVE_DELAY_MS;
  // Propagate to PathfindingController
  this.pathfindingController?.setMoveDelay(this.moveDelay);
}
```

Option B: `MovementController` returns the effective delay and WorldScene uses it. This requires `MovementController` to know about tiles, which adds coupling.

**Recommended: Option A** — WorldScene already has access to tile data and already has `this.moveDelay` as a mutable field. PathfindingController already accepts `moveDelay` in constructor and uses `this.moveDelay` — add a `setMoveDelay(delay: number)` method.

**Server-side:** The server does NOT currently apply movementSpeed — it only rate-limits at 125ms. For MOVE-03, the plan description says to "apply tile movementSpeed property to compute effective moveDelay on client and server." However, the server rate limit (125ms) is lower than the slowest tile's delay (300ms for toxic_pool), so the server won't incorrectly reject slow-tile moves. The server moving slower is acceptable for phase 23 — server-side movementSpeed application can be deferred unless MOVE-03 explicitly requires it. **Investigate this during planning.**

**Tile lookup in WorldScene:** Already available through `this.currentTiles` and `this.chunkManager`. The pattern from `showTileInfo()` (line 270-275) shows the lookup:
```typescript
const tileNumericId = this.currentTiles[gridPos.y]?.[gridPos.x];
const tileId = tileIdToString(tileNumericId as TileId);
const tileDef = TileRegistry.get(tileId);
// tileDef.movementSpeed is the value we need
```

### Pattern 4: HoverController Removal (Plan 23-04)

**Confirmed: HoverController is already NOT referenced in WorldScene.ts.** The file `/apps/web/src/game/systems/HoverController.ts` exists but is not imported anywhere.

**Action:** Delete the file. No code changes needed in any other file — there are no references to remove.

```bash
# Verify no remaining imports before deleting:
grep -r "HoverController" apps/web/src/
# Expected: only the file itself
rm apps/web/src/game/systems/HoverController.ts
```

### Anti-Patterns to Avoid

- **Tween queuing:** Never call `tweens.add()` without `tweens.killTweensOf(target)` first. Queued tweens cause the sprite to slide to old positions after new moves are predicted.
- **Tween duration >= moveDelay:** If the tween duration equals or exceeds moveDelay, the next tween starts before the previous completes. `killTweensOf` handles this but the visual will still stutter because position jumps. Keep duration at `moveDelay - 20ms`.
- **Lerp on minimap:** Applying lerp to the minimap camera makes it lag behind the player position, which is disorienting for a minimap. The minimap's `startFollow(target, true)` (no lerp args) defaults to `(1,1)` = instant — leave it.
- **Applying movementSpeed = 0 tiles:** Wall tiles have `movementSpeed: 0`. Division by zero. Guard: `if (movementSpeed <= 0) use MOVE_DELAY_MS`.
- **Setting moveDelay from destination tile vs. current tile:** The convention should be: the delay used AFTER landing on a tile is determined by THAT tile. So read the tile AFTER the move is applied (from the new position in the store). This is what the current player position in the store reflects after `processInput()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth sprite movement | Custom interpolation in update() loop | `this.tweens.add()` | Phaser tweens handle frame-rate-independent interpolation, pause/resume, cleanup |
| Camera smoothing | Manual lerp in update() loop | `camera.startFollow(target, roundPixels, lerpX, lerpY)` | Built-in, handles edge cases, works with Phaser's update cycle |
| Tile speed lookup | Custom tile speed map | `TileRegistry.get(tileId).movementSpeed` | Already exists in the tiles package |

**Key insight:** This entire phase is configuration changes and small edits to existing Phaser API calls. No custom interpolation systems needed.

## Common Pitfalls

### Pitfall 1: Tween Targets Container vs Sprite
**What goes wrong:** `this.localPlayer` is typed as `Phaser.GameObjects.Sprite` but actually holds a `Container` (see WorldScene.ts line 398: "Type hack for compatibility"). `this.tweens.killTweensOf()` and `this.tweens.add()` work on the actual object reference — the type cast does not affect runtime behavior.
**Why it happens:** Container was introduced without updating the type.
**How to avoid:** Pass `this.localPlayer` (the Container reference) directly to tween APIs. Already done in the reconciliation tween — the prediction tween must do the same.
**Warning signs:** Tween animates but sprite does not move visually.

### Pitfall 2: Depth Update After Tween
**What goes wrong:** If depth is updated inside `onComplete`, there is a single-frame flash where depth is wrong during the tween.
**Why it happens:** Grid-based depth is computed from the tile position, not pixel position. The sprite is on tile N+1 logically but still visually sliding from tile N.
**How to avoid:** Update `setData('gridX', ...)` and `setDepth()` immediately (synchronously), before the tween starts. The current code already does this correctly after the tween block — keep this behavior.
**Warning signs:** Z-fighting or sprites briefly rendering under tiles during movement.

### Pitfall 3: moveDelay Propagation to PathfindingController
**What goes wrong:** WorldScene updates `this.moveDelay` from the tile, but PathfindingController's step timer still uses its own copy.
**Why it happens:** PathfindingController stores `this.moveDelay` set in constructor and used in `window.setTimeout()` call.
**How to avoid:** Add `setMoveDelay(delay: number): void { this.moveDelay = delay; }` to PathfindingController. WorldScene calls it after each tile-based delay update.
**Warning signs:** Click-to-move paths execute at wrong speed on slow/fast tiles.

### Pitfall 4: Camera Lerp Causing Minimap Drift
**What goes wrong:** Minimap camera shows player off-center because it has lerp applied.
**Why it happens:** If `cameras.main.setLerp()` is called globally or if minimap's `startFollow` is called with low lerp values.
**How to avoid:** Only change `cameras.main.startFollow()`. `MinimapCamera.startFollow()` uses its own camera instance and must keep `(1,1)` lerp (no args = default).
**Warning signs:** Minimap player indicator is always at center but the minimap view lags behind — or the minimap view is off-center.

### Pitfall 5: server movementSpeed Validation Mismatch
**What goes wrong:** Client sends moves faster than server expects when on ice (1.2x speed → 125ms intervals). Server rate limit is 125ms. This is right at the threshold — rounding could cause false rejections.
**Why it happens:** `Math.round(150 / 1.2) = 125` — exactly the server limit.
**How to avoid:** When computing ice tile delay on client: `Math.round(150 / 1.2) = 125`. Server rate limit is also 125ms. This is fine — ice tiles will be accepted. If any tile results in a delay below 125ms, the server will reject moves. For phase 23 tiles: min is 125ms (ice). This is safe.
**Warning signs:** Console logs showing "Movement too fast" errors from server on ice tiles.

### Pitfall 6: HoverController Import Removal
**What goes wrong:** Deleting `HoverController.ts` breaks TypeScript compilation if any file imports it.
**Why it happens:** File may still be imported somewhere even if not used functionally.
**How to avoid:** Run `grep -r "HoverController"` before deleting. Confirmed: WorldScene.ts does NOT import HoverController (verified in research). The class exists but is dead code.
**Warning signs:** TypeScript compilation error: "Cannot find module './HoverController'".

## Code Examples

Verified patterns from official sources:

### Phaser 3 Tween: Prediction Move
```typescript
// Source: Phaser 3.90 TweenManager API + existing codebase (WorldScene.ts lines 1031-1034)
// Call BEFORE setting any new target position
this.tweens.killTweensOf(this.localPlayer);
this.tweens.add({
  targets: this.localPlayer,
  x: screenPos.x,
  y: targetY,
  duration: 130,     // MOVE_DELAY_MS(150) - 20 = 130
  ease: 'Linear',
});
// Set grid data and depth synchronously (tile position, not pixel):
this.localPlayer.setData('gridX', worldX);
this.localPlayer.setData('gridY', worldY);
this.localPlayer.setData('elevation', elevation);
const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation, 10);
this.localPlayer.setDepth(depth);
```

### Phaser 3 Camera: Smooth Follow
```typescript
// Source: Phaser 3 Camera.startFollow API, docs.phaser.io
// Signature: startFollow(target, roundPixels, lerpX, lerpY, offsetX, offsetY)
// lerpX/lerpY: 1 = instant, 0.1 = smooth
this.cameras.main.startFollow(this.localPlayer!, true, 0.1, 0.1);

// Minimap MUST stay instant:
this.minimapCam.startFollow(target, true); // defaults to lerpX=1, lerpY=1
```

### Tile movementSpeed to moveDelay
```typescript
// Source: TileRegistry (packages/tiles/src/registry.ts) + tiles/src/types.ts
import { TileRegistry } from '@into-the-void/tiles';
import { tileIdToString, TileId } from '@into-the-void/world-gen';

function getEffectiveMoveDelay(
  tileNumericId: number,
  baseMoveDelay: number
): number {
  const tileId = tileIdToString(tileNumericId as TileId);
  const tileDef = TileRegistry.get(tileId);
  if (tileDef.movementSpeed <= 0) return baseMoveDelay; // wall guard
  return Math.round(baseMoveDelay / tileDef.movementSpeed);
}
// Examples (baseMoveDelay = 150):
// void_floor (1.0)   → 150ms
// ice_floor  (1.2)   → 125ms  (matches server rate limit exactly — safe)
// fungal_floor (0.8) → 188ms
// toxic_pool (0.5)   → 300ms
```

### PathfindingController setMoveDelay (new method)
```typescript
// Add to PathfindingController class:
setMoveDelay(delay: number): void {
  this.moveDelay = delay;
}
```

### Reconciliation Tween (increased from 50 to 80ms)
```typescript
// Source: existing WorldScene.ts lines 1031-1034 — increase duration only
this.tweens.killTweensOf(this.localPlayer);
this.tweens.add({
  targets: this.localPlayer,
  x: screenPos.x,
  y: targetY,
  duration: 80,          // was 50, now 80
  ease: 'Cubic.easeOut',
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Instant sprite teleport on prediction | Tween at 130ms Linear | Phase 23 (this work) | Sprite glides visually |
| Camera instant snap (lerp 1,1) | Camera smooth follow (lerp 0.1,0.1) | Phase 23 (this work) | Camera glides after player |
| Fixed 150ms moveDelay for all tiles | Tile-speed-adjusted delay | Phase 23 (this work) | Slow tiles feel slower |
| HoverController.ts dead code present | File deleted | Phase 23 (this work) | No effect on runtime |
| Reconciliation tween 50ms | Reconciliation tween 80ms | Phase 23 (this work) | Smoother server correction |

**Deprecated/outdated:**
- HoverController.ts: Dead code. Not imported in WorldScene. History: was removed from WorldScene in a prior phase per git history. The file itself remains and should be deleted.

## Open Questions

1. **Should server also apply movementSpeed for MOVE-03?**
   - What we know: MOVE-03 says "Server rate limit reduced..." and "apply tile movementSpeed property to compute effective moveDelay on client and server." The server rate limit (125ms) is a fixed floor. Server-side movementSpeed would mean the server rejects moves that come too fast for that tile type.
   - What's unclear: Does plan 23-03 intend server-side validation, or just client-side delay?
   - Recommendation: Plan 23-03 should address client-side only. Server-side movementSpeed validation adds complexity (server needs tile data at the player's current position) and is a separate concern. Note in the plan that server validation is deferred.

2. **What exact position do we read the tile from for movementSpeed?**
   - What we know: After `movementController.processInput(direction)`, the Zustand store is updated to the new position. WorldScene can read `useGameStore.getState().player.position` immediately.
   - What's unclear: Whether to use the tile at the source or destination for delay.
   - Recommendation: Use the **destination tile** (the tile just moved onto). This is more intuitive: stepping onto ice feels fast, stepping into toxic pool feels slow. Read position from store after `processInput()` returns.

3. **Where exactly does moveDelay get read for the handleInput() gate?**
   - What we know: `WorldScene.handleInput()` checks `time - this.lastMoveTime < this.moveDelay`. `this.moveDelay` is initialized to `MOVE_DELAY_MS` and never updated.
   - What's unclear: The tile lookup for the destination tile requires knowing the direction, which requires knowing the current position — both available at input time.
   - Recommendation: Update `this.moveDelay` AFTER a successful move (after the `processInput` call), not before. The next move will use the delay from the tile just landed on. For the very first move on a new tile type, the previous tile's delay gates it — this is correct behavior (you're leaving the slow tile at slow speed).

## Sources

### Primary (HIGH confidence)
- Phaser 3.90.0 (installed, verified: `node_modules/.pnpm/phaser@3.90.0`) — tween manager, camera APIs
- `apps/web/src/game/scenes/WorldScene.ts` — current implementation, verified directly
- `apps/web/src/game/systems/MovementController.ts` — reconciliation flow, verified directly
- `apps/web/src/game/systems/PathfindingController.ts` — moveDelay usage, verified directly
- `apps/web/src/game/rendering/MinimapCamera.ts` — instant follow confirmed, verified directly
- `apps/web/src/game/systems/HoverController.ts` — dead code confirmed, verified directly
- `packages/tiles/src/types.ts` — TileDefinition.movementSpeed field, verified directly
- `packages/tiles/src/definitions/*.ts` — movementSpeed values across all tiles, verified directly
- `packages/shared-types/src/constants.ts` — MOVE_DELAY_MS = 150, verified directly

### Secondary (MEDIUM confidence)
- [Phaser 3 Camera startFollow API](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) — signature `startFollow(target, roundPixels, lerpX, lerpY)` confirmed, default lerpX/lerpY = 1
- [Rex Rainbow Phaser 3 Notes — Tween](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/tween/) — `tweens.add()` config parameters, `tweens.killTweensOf()` confirmed

### Tertiary (LOW confidence)
- WebSearch result re: Phaser 3.80+ lerp behavior consistent with 3.90 — no breaking changes found in this API area

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Phaser 3.90.0 installed, APIs verified via official docs and codebase
- Architecture: HIGH — actual code read directly, all touch points identified
- Pitfalls: HIGH for tween/camera (verified by reading code), MEDIUM for movementSpeed (logical reasoning from values)
- movementSpeed tile values: HIGH — all tile files read directly

**Research date:** 2026-02-17
**Valid until:** 2026-03-19 (30 days — stable Phaser APIs)
