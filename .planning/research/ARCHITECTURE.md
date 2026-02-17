# Architecture Research

**Domain:** Multiplayer isometric MMO — movement system overhaul (Phaser 3 + NestJS WebSocket)
**Researched:** 2026-02-17
**Confidence:** HIGH (direct codebase audit + official Phaser docs + verified networking patterns)

## Standard Architecture

### System Overview (Current State)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Phaser 3)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────────┐   │
│  │  WorldScene  │  │  MovementCtrl   │  │ PathfindingCtrl   │   │
│  │  update()    │  │  processInput() │  │  startPath()      │   │
│  │  handleInput │  │  reconcile()    │  │  executeNextStep  │   │
│  └──────┬───────┘  └───────┬─────────┘  └─────────┬─────────┘   │
│         │                  │                       │             │
│  ┌──────▼───────────────────▼───────────────────────▼─────────┐  │
│  │                    gameStore (Zustand)                       │  │
│  │  player.position  |  collisionMap  |  zoneState             │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │ socket.emit('player:move')         │
├─────────────────────────────┼───────────────────────────────────┤
│                     NETWORK LAYER                                │
│                Socket.IO (WebSocket)                             │
├─────────────────────────────┼───────────────────────────────────┤
│                        SERVER (NestJS)                           │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │                   GameGateway                               │  │
│  │  handleMove() -> rate limit (140ms) -> GameService          │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │  GameService / PlayerService                               │  │
│  │  validateMovement() -> updatePosition() -> broadcast()     │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities (Existing — Verified by Codebase Audit)

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `WorldScene.handleInput()` | Poll keyboard each frame, throttle by `moveDelay` (500ms), emit direction | `WorldScene.ts:430` |
| `MovementController.processInput()` | Apply input locally (prediction), store pending, emit socket | `MovementController.ts:26` |
| `MovementController.reconcile()` | Discard acked inputs, replay unacked from server position | `MovementController.ts:85` |
| `PathfindingController` | A* click-to-move, dispatches to `MovementController.processInput()` | `PathfindingController.ts` |
| `WorldScene.updateLocalPlayerSprite()` | Snap sprite to predicted position; 50ms tween on reconciliation | `WorldScene.ts:977` |
| `WorldScene.movePlayer()` | Tween remote players to server position at 100ms Linear | `WorldScene.ts:944` |
| `MinimapCamera` | Second Phaser camera at zoom 0.075, follows `localPlayer` sprite | `MinimapCamera.ts` |
| `GameGateway.handleMove()` | Rate limit 140ms, validate, broadcast `player:moved` with sequence | `game.gateway.ts:120` |
| `gameStore` listeners | Route `player:moved` to `MovementController.reconcile()` or tween | `gameStore.ts:185` |

### Key Facts Established by Codebase Audit

- **Current move delay:** 500ms client (`WorldScene.moveDelay`), 140ms server rate limit. The client throttle is the effective bottleneck — server is permissive relative to that.
- **Current input:** 4-directional keyboard mapped to isometric diagonals (W=nw, D=ne, S=se, A=sw). An `else-if` chain breaks simultaneous key detection.
- **8-directional already partially wired:** `PathfindingController.getDirection()` returns all 8 directions. `DIRECTION_VECTORS` defines all 8. `calculateNewPosition()` handles all 8. `Direction` type has all 8 values. The gap is `handleInput()` using sequential `else-if` instead of key combination logic.
- **Camera:** `cameras.main.startFollow(localPlayer, true, 1, 1)` — lerp values of 1 = instant snap. No smoothing exists.
- **Prediction movement:** Sprite snaps instantly to predicted tile. No tween on the happy path.
- **Reconciliation tween:** 50ms `Cubic.easeOut` on mismatch, instant on correct prediction. The algorithm is correct but duration may be visually abrupt.
- **Remote player interpolation:** 100ms Linear tween on `movePlayer()`. Appropriate for 150ms cadence.
- **Position type:** Integer tile coordinates + `zoneId` string. No fractional sub-tile position exists anywhere.

---

## Recommended Architecture for Movement Overhaul

### What Changes vs. What Stays

```
STAYS UNCHANGED                    CHANGES
────────────────────               ────────────────────────────────
Socket event shape ('player:move') WorldScene.moveDelay: 500ms -> 150ms
Direction type (all 8 exist)       handleInput: else-if -> resolveDirection()
Reconcile algorithm                camera lerp: (1,1) -> (0.1, 0.1)
Position type (integer tile)       prediction: snap -> 130ms Linear tween
Server rate limit logic            reconcile tween: 50ms -> 80ms
gameStore shape                    PathfindingController moveDelay (sync via constant)
MinimapCamera structure            SpriteAnimationController (NEW component)
ChunkManager / zoneId system
A* pathfinding
```

### System Overview (Target Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Phaser 3)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WorldScene.handleInput()  [per frame, with 150ms guard] │   │
│  │  resolveDirection(keys) -> 8-dir                         │   │
│  └────────────────┬──────────────────────────────┬──────────┘   │
│                   │                              │              │
│  ┌────────────────▼───────────┐  ┌───────────────▼──────────┐   │
│  │  MovementController        │  │  SpriteAnimController     │   │
│  │  processInput(dir)         │  │  setFacing(dir)           │   │
│  │  reconcile(pos, seq)       │  │  (directional sprite anim)│   │
│  └────────────────┬───────────┘  └──────────────────────────┘   │
│                   │                                              │
│  ┌────────────────▼───────────────────────────────────────────┐  │
│  │  WorldScene.updateLocalPlayerSprite()                       │  │
│  │  prediction: 130ms Linear tween to target tile             │  │
│  │  reconcile:  80ms Cubic.easeOut tween on mismatch          │  │
│  │  camera: startFollow(target, true, 0.1, 0.1)               │  │
│  └────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Socket.IO (shape unchanged)                   │
├─────────────────────────────────────────────────────────────────┤
│                     SERVER (NestJS)                               │
│  GameGateway.handleMove() rate limit: 140ms -> 125ms             │
│  (adjusted for tighter client cadence tolerance)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architectural Patterns

### Pattern 1: 8-Directional Key Combination Resolution

**What:** Read all 8 keys simultaneously and resolve to a single `Direction` by checking key pairs before single keys. The existing `else-if` chain in `handleInput()` silently prevents diagonal+diagonal combos (e.g., W+D = north).

**When to use:** When moving from 4-key to 8-key directional input in an isometric game.

**Trade-offs:** Slightly more code than an `else-if` chain but eliminates "stuck between diagonals" feel. Must define priority for 3+ simultaneous keys (first matching pair wins).

**Example:**

```typescript
// Replace the else-if chain in WorldScene.handleInput():
private resolveDirection(): Direction | null {
  const up = this.cursors?.up.isDown || this.wasd?.W.isDown;
  const down = this.cursors?.down.isDown || this.wasd?.S.isDown;
  const left = this.cursors?.left.isDown || this.wasd?.A.isDown;
  const right = this.cursors?.right.isDown || this.wasd?.D.isDown;

  // Isometric screen-space mapping (existing single-key behavior preserved):
  // W->nw, D->ne, S->se, A->sw
  // Combos: W+D->n (NE+NW=North), D+S->e (NE+SE=East), S+A->s, W+A->w
  if (up && right) return 'n';
  if (down && right) return 'e';
  if (down && left) return 's';
  if (up && left) return 'w';
  if (up) return 'nw';
  if (right) return 'ne';
  if (down) return 'se';
  if (left) return 'sw';
  return null;
}
```

**Important:** The existing isometric screen-space mapping is correct. W maps to 'nw' (up-left in isometric view). W+D (up-left + up-right) = 'n' (straight up in isometric). This completes the 8-direction set without changing single-key behavior.

### Pattern 2: Tweened Tile-to-Tile Movement (Visual Smoothing)

**What:** Tween the sprite from its current screen position to the predicted target tile position over `moveDelay - buffer` milliseconds. The logical position in gameStore updates instantly; only the visual representation tweens.

**When to use:** Any tile-based game where move rate is fast enough that instant snap is jarring (under ~300ms/tile). At 150ms/tile, instant snap is visibly jerky.

**Trade-offs:** The sprite is always slightly behind the logical tile position by `tween_duration`. At 150ms this is imperceptible. Risk: if tween duration exceeds moveDelay, tweens stack and sprite lags far behind. Must kill existing tween before starting next (`tweens.killTweensOf`).

**Example:**

```typescript
// In WorldScene.updateLocalPlayerSprite() prediction branch:
if (!reconciling) {
  this.tweens.killTweensOf(this.localPlayer);
  this.tweens.add({
    targets: this.localPlayer,
    x: screenPos.x,
    y: targetY,
    duration: 130,  // moveDelay (150ms) minus 20ms buffer
    ease: 'Linear',
  });
} else {
  // Reconciliation: smooth correction
  this.tweens.killTweensOf(this.localPlayer);
  this.tweens.add({
    targets: this.localPlayer,
    x: screenPos.x,
    y: targetY,
    duration: 80,   // increased from 50ms for less abruptness
    ease: 'Cubic.easeOut',
  });
}
```

**Confidence:** HIGH. The exact same pattern is already used for remote players in `WorldScene.movePlayer()` at line 960-974. This extends it consistently to local player prediction.

### Pattern 3: Camera Lerp Smoothing

**What:** Change `startFollow` lerp values from 1 (instant snap) to ~0.1 (smooth interpolation). Each frame Phaser moves the camera a fraction of the distance to the target, producing a fluid trailing effect.

**When to use:** When the player sprite tweens between tiles rather than snapping. Without camera lerp, the camera still snaps even though the sprite glides — negating the visual smoothness.

**Trade-offs:** Values below 0.08 feel "floaty" and visually disconnect the camera from the player. Values above 0.15 don't add perceptible smoothing beyond what the tween achieves. Official Phaser docs cite 0.1 as the smooth-follow sweet spot.

**Example:**

```typescript
// In WorldScene.updateLocalPlayer(), change:
// this.cameras.main.startFollow(this.localPlayer!, true, 1, 1);
// To:
this.cameras.main.startFollow(
  this.localPlayer!,
  true,   // roundPixels: prevents sub-pixel jitter (Phaser docs recommendation)
  0.1,    // lerpX
  0.1     // lerpY
);
```

**Minimap impact:** `MinimapCamera.startFollow(target, true)` has no lerp parameter — it correctly defaults to lerp=1 (instant). The minimap is a spatial orientation tool and should track exact position. No change needed.

**Source:** Phaser 3 official camera docs confirm lerp range 0-1, default 1 = instant, 0.1 = smooth. `roundPixels: true` prevents the sub-pixel jitter noted in Phaser GitHub issue #3738.

### Pattern 4: Server Rate Limit Alignment with Client Cadence

**What:** The server rate limit and client `moveDelay` must maintain adequate tolerance for network jitter. When the client sends moves every 150ms, the server must accept events that arrive up to ~20-25ms early due to timing variance.

**When to use:** Any time client move cadence changes.

**Trade-offs:** Too tight a server limit causes false rejections under normal latency (visible as position corrections every few tiles). Too loose allows speed-hack clients to move faster.

**Calculation:**
```
Current:  client=500ms, server=140ms, tolerance=360ms (generous)
Target:   client=150ms, server=125ms, tolerance=25ms (acceptable for typical jitter)
Rule:     server_limit = client_delay * 0.85, floor at 100ms
          150 * 0.85 = 127.5, rounded to 125ms
```

The current 140ms server limit is borderline adequate for 150ms client delay (10ms tolerance), but reducing to 125ms provides a safer 25ms buffer.

---

## Data Flow

### Local Player Input Flow (Target)

```
WorldScene.update(time)
    |
    v
handleInput(time)
    |
    +-- time - lastMoveTime < 150ms? --> return (throttle)
    |
    +-- resolveDirection(keys) --> Direction | null
    |       W+D->'n', W->'nw', D->'ne', etc.
    |
    +-- pathfindingController.cancelPath() (if active)
    |
    +-- MovementController.processInput(dir)
    |       +-- client-side collision check
    |       +-- calculateNewPosition(player.pos, dir) --> newPos
    |       +-- gameStore.setPlayer({ position: newPos })
    |       +-- onPositionUpdate(newPos, reconciling=false)
    |       |       --> WorldScene.updateLocalPlayerSprite
    |       |           tweens.killTweensOf(localPlayer)
    |       |           tweens.add({ x, y, duration: 130, ease: 'Linear' })
    |       |           camera follows sprite via lerp=0.1
    |       +-- socket.emit('player:move', { direction, sequence })
    |
    +-- SpriteAnimationController.setFacing(dir)  [NEW]
```

### Server Reconciliation Flow (Unchanged Algorithm, Adjusted Timing)

```
server emits 'player:moved' { playerId, position, lastProcessedInput }
    |
gameStore.ts listener (line 185)
    |
    +-- data.playerId === currentPlayer.id?
    |       YES --> MovementController.reconcile(position, lastProcessedInput)
    |               +-- pendingInputs = filter(seq > lastProcessedInput)
    |               +-- reconciledPos = replay pending from serverPosition
    |               +-- mismatch from currentClientPosition?
    |               |       YES --> gameStore.setPlayer({ position: reconciledPos })
    |               |               onPositionUpdate(reconciledPos, reconciling=true)
    |               |                --> tween 80ms Cubic.easeOut  [was 50ms]
    |               +-- NO mismatch --> no-op (prediction was correct, common case)
    |
    +-- other player --> WorldScene.movePlayer(playerId, position)
            --> tween 100ms Linear [unchanged]
```

### PathfindingController Sync (Critical Detail)

`PathfindingController` is constructed with `moveDelay` from `WorldScene`:

```typescript
// WorldScene.ts line 103:
this.pathfindingController = new PathfindingController(
  this.movementController,
  this.moveDelay,   // <-- this.moveDelay is what changes (500 -> 150)
  this,
  this.isoTransform!
);
```

When `WorldScene.moveDelay` changes, `PathfindingController`'s internal delay changes automatically because it uses the value at construction time. No separate change to `PathfindingController` is needed — but the constant must be defined at the `WorldScene` level and passed consistently.

---

## New vs. Modified Components

| Component | Status | Change |
|-----------|--------|--------|
| `WorldScene.handleInput()` | MODIFY | Replace `else-if` chain with `resolveDirection()` for 8-key combo support |
| `WorldScene.moveDelay` | MODIFY | 500ms -> 150ms; extract to `MOVE_DELAY_MS` constant |
| `WorldScene.updateLocalPlayer()` | MODIFY | `startFollow` lerp from `(1, 1)` to `(0.1, 0.1)` |
| `WorldScene.updateLocalPlayerSprite()` | MODIFY | Prediction: snap -> 130ms Linear tween; reconcile: keep pattern, increase 50ms -> 80ms |
| `MovementController` | NO CHANGE | Already handles all 8 directions; reconcile algorithm is correct |
| `PathfindingController` | NO CHANGE | Already uses full 8-direction `getDirection()`; uses `moveDelay` from constructor |
| `SpriteAnimationController` | NEW | Maps `Direction` to sprite frame/animation; stateful (tracks last facing); owned by `WorldScene` |
| `GameGateway.handleMove()` | MODIFY | Rate limit: `< 140` -> `< 125` to match tighter client cadence |
| `game-logic/movement/validation.ts` | NO CHANGE | All 8 directions already in `DIRECTION_VECTORS` |
| `shared-types/position.ts` | NO CHANGE | `Direction` type already has all 8 values |
| `MinimapCamera` | NO CHANGE | Correctly at lerp=1 (instant); should stay that way |

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `WorldScene` <-> `MovementController` | Direct method call + `onPositionUpdate` callback | The callback is the seam for sprite updates; reconciling=true/false flag drives tween vs snap behavior |
| `MovementController` <-> `gameStore` | `useGameStore.getState()` called synchronously | No subscription; reads/writes state directly |
| `gameStore` socket listeners <-> `WorldScene` | `worldScene.getMovementController()` | gameStore calls into WorldScene on `player:moved`; this coupling is existing and intentional |
| `WorldScene` <-> `PathfindingController` | Constructor injection of `MovementController` + `moveDelay` | PathfindingController calls `movementController.processInput()` — unchanged at runtime |
| `WorldScene` <-> `SpriteAnimationController` | Owned and called by WorldScene each frame after direction resolution | WorldScene calls `setFacing(dir)` and (eventually) `playWalkCycle()` |
| `MovementController` <-> `gameSocket` | Direct `gameSocket.emit` inside controller | Socket is a module-level singleton; no injection needed |

### Critical Interaction: Prediction Tween + Camera Lerp

When `startFollow` lerp=0.1 is active, Phaser's camera tracks the `localPlayer` container's **live position** (updated continuously by the active tween), not the logical tile center. This means:

1. Prediction fires -> tween starts moving `localPlayer` container toward target tile
2. Camera lerps toward `localPlayer.x/y` each frame, tracking the tween's intermediate positions
3. Result: camera appears to glide with the player organically

No special coordination is required between the tween and camera systems — `startFollow` uses the live position automatically.

**Timing math:** At 150ms moveDelay with 130ms tween duration, there is a 20ms idle window between tween completion and next move. If the player holds a key continuously, the next `processInput` fires after 150ms, killing the just-completed tween and starting the next one. Stack risk is minimal.

---

## Recommended Project Structure

```
apps/web/src/game/
├── systems/
│   ├── MovementController.ts       [NO CHANGE]
│   ├── PathfindingController.ts    [NO CHANGE]
│   ├── HoverController.ts          [NO CHANGE]
│   └── SpriteAnimationController.ts  [NEW]
├── scenes/
│   └── WorldScene.ts               [MODIFY: handleInput, moveDelay, lerp, tween]
└── rendering/
    └── MinimapCamera.ts            [NO CHANGE]

apps/game-server/src/game/
└── game.gateway.ts                 [MODIFY: rate limit 140ms -> 125ms]
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (small playerbase) | Tween approach is fine; Phaser tween manager is efficient at 6-7 tweens/sec per player |
| ~100 concurrent players/zone | moveDelay reduction (500->150ms) triples `player:moved` broadcast frequency; at 100 players: 100 * 6.67 = 667 events/sec. Well within Socket.IO capacity |
| ~500+ concurrent players | Consider delta-compression on `player:moved`; currently sends full position each time |
| 1000+ players/zone | Zone sharding or position update batching; outside scope of this milestone |

### Performance Impact of Tween Approach

Phaser's tween manager is designed for frequent tween creation/destruction. Killing and restarting tweens at 6.67hz per moving player is trivial. The previous remote player implementation (`movePlayer`) already does this and has not shown performance issues.

---

## Anti-Patterns

### Anti-Pattern 1: Changing Position Type to Sub-Tile

**What people do:** Add `subX: number, subY: number` to `Position` to enable fluid, pixel-level movement alongside tile-based logic.

**Why it's wrong:** The entire server validation, reconciliation, pathfinding, and collision system is built on integer tile coordinates. Sub-tile position requires rewriting `validateMovement`, `calculateNewPosition`, A* pathfinding, and zone boundary detection (which relies on integer overflow). It also invalidates the existing sequence-number reconciliation model which assumes discrete tile steps.

**Do this instead:** Keep positions as integer tile coordinates. Visual smoothness is achieved by tweening the sprite between integer positions on the client. The server's authoritative model stays tile-based.

### Anti-Pattern 2: Reducing moveDelay Without Adjusting Server Rate Limit

**What people do:** Change `WorldScene.moveDelay` to 150ms but leave server rate limit at 140ms.

**Why it's wrong:** Current tolerance buffer = 500ms - 140ms = 360ms. At 150ms client delay: 150ms - 140ms = 10ms. Normal network jitter of 10-15ms will cause the server to reject valid moves as "too fast", triggering `reconcile()` every few tiles, visible as stuttering even when prediction was correct.

**Do this instead:** Lower server rate limit to 125ms when client `moveDelay` is 150ms. This provides a 25ms tolerance which absorbs typical jitter while detecting clients moving at under 125ms (clear speed hacking).

### Anti-Pattern 3: Applying Camera Lerp to the Minimap

**What people do:** Apply `lerp=0.1` to `MinimapCamera.startFollow()` for consistency.

**Why it's wrong:** The minimap is a spatial orientation tool. Players use it to gauge proximity to zone edges and entities. Camera lag on the minimap creates an "I'm looking at where I was 100ms ago" disorientation and makes the position dot misleading.

**Do this instead:** Keep `MinimapCamera.startFollow(target, true)` with no lerp. Minimap = instant. Main camera = lerp 0.1.

### Anti-Pattern 4: PathfindingController Using a Different moveDelay Than WorldScene

**What people do:** Update `WorldScene.moveDelay` but construct `PathfindingController` with a hardcoded value or forget to update the constructor argument.

**Why it's wrong:** `PathfindingController` uses `this.moveDelay` internally to schedule `setTimeout(executeNextStep, this.moveDelay)`. If this value differs from `WorldScene.moveDelay`, WASD and click-to-move operate at different speeds. One will violate the server rate limit, triggering reconciliation.

**Do this instead:** Define `const MOVE_DELAY_MS = 150` as a named constant in `WorldScene.ts` and pass it to both `this.moveDelay = MOVE_DELAY_MS` and `new PathfindingController(controller, MOVE_DELAY_MS, ...)`.

### Anti-Pattern 5: Tween Duration >= moveDelay

**What people do:** Set prediction tween duration to 150ms (same as moveDelay).

**Why it's wrong:** If the player holds a key and moves continuously, the new move fires exactly when the previous tween completes. Due to `setTimeout` and `requestAnimationFrame` timing imprecision, tweens may overlap by 5-10ms. `tweens.killTweensOf` handles this, but if duration equals delay exactly, the sprite may never reach the target position before being redirected — creating a "rubber band" drift toward target tiles.

**Do this instead:** Set tween duration to `moveDelay - 20ms` (e.g., 130ms for 150ms delay). The 20ms buffer ensures each tween completes cleanly before the next begins.

---

## Build Order for Movement Refactor

Based on dependency order and multiplayer sync risk (lowest risk first):

1. **Server rate limit adjustment** — `game.gateway.ts` line 133: `< 140` -> `< 125`. No client changes. Prevents false rejections once client cadence changes.

2. **Extract `MOVE_DELAY_MS` constant and reduce it** — Define `const MOVE_DELAY_MS = 150` in `WorldScene.ts`. Update `this.moveDelay = MOVE_DELAY_MS`. Pass to `PathfindingController` constructor. Verify both WASD and click-to-move fire at same cadence.

3. **8-directional input resolution** — Replace `else-if` chain in `handleInput()` with `resolveDirection()`. Manually test W+D=n, D+S=e, S+A=s, W+A=w plus all 4 single-key diagonals.

4. **Prediction sprite tween** — Modify `updateLocalPlayerSprite()` prediction branch: instant snap -> 130ms Linear tween. Add `tweens.killTweensOf` before each. Verify tween completes before next move fires.

5. **Camera lerp** — Change `startFollow` lerp from `(1, 1)` to `(0.1, 0.1)` after confirming step 4 looks smooth. Verify minimap camera is untouched.

6. **Reconciliation tween tuning** — Increase reconciliation tween from 50ms -> 80ms `Cubic.easeOut`. Test by deliberately causing prediction mismatches (move into collision near boundary).

7. **SpriteAnimationController scaffold** — Create the class, integrate call site in `handleInput()` after direction resolution. Start as a no-op stub. Implement directional frames only when sprite assets have directional variants.

---

## Sources

- Phaser 3 Official Docs — Camera concepts: https://docs.phaser.io/phaser/concepts/cameras
- Phaser 3 API — camera.startFollow: https://newdocs.phaser.io/docs/3.60.0/focus/Phaser.Cameras.Scene2D.Camera-startFollow
- Phaser 3 API — camera.lerp: https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Cameras.Scene2D.Camera-lerp
- Client-side prediction smoothing pattern: https://www.gamedev.net/forums/topic/658931-smoothing-corrections-to-client-side-prediction/5168001/
- Tile-based MMO movement networking tradeoffs: https://gamedev.net/forums/topic/604243-mmomultiplayer-movement/4824164
- Client-side prediction algorithm: https://en.wikipedia.org/wiki/Client-side_prediction
- Colyseus + Phaser 3 interpolation tutorial: https://learn.colyseus.io/phaser/3-client-predicted-input.html
- Codebase: `apps/web/src/game/scenes/WorldScene.ts` (direct audit)
- Codebase: `apps/web/src/game/systems/MovementController.ts` (direct audit)
- Codebase: `apps/web/src/game/systems/PathfindingController.ts` (direct audit)
- Codebase: `apps/game-server/src/game/game.gateway.ts` (direct audit)
- Codebase: `packages/game-logic/src/movement/validation.ts` (direct audit)
- Codebase: `packages/shared-types/src/core/position.ts` (direct audit)

---
*Architecture research for: Into the Void — movement system overhaul (smooth movement, 8-directional input, camera interpolation)*
*Researched: 2026-02-17*
