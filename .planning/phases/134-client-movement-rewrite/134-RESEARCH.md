# Phase 134: Client Movement Rewrite - Research

**Researched:** 2026-03-18
**Status:** Complete

## Phase Objective

Replace the tile-step movement system on the client with continuous pixel-based WASD movement. The server infrastructure (Phase 132) and distance systems (Phase 133) are already complete. This phase rewrites the client-side movement controller, integrates with the existing server protocol, adds camera following, 8-directional animations, client-side prediction with server reconciliation, and remote player interpolation.

## Requirements Coverage

| Req ID | Description | Implementation Area |
|--------|-------------|-------------------|
| MOVE-01 | Sub-tile pixel movement via WASD | PixelMovementController — velocity-based, emits pixelMove events |
| MOVE-03 | Pixel hitbox collision (AABB) | Client-side resolvePixelCollision (already exists in game-logic) |
| MOVE-04 | Smooth camera following | Camera center-locked on local player pixel position |
| MOVE-05 | 8-directional walk/idle animations | Direction from velocity vector, sprite swap in update loop |
| SYNC-03 | Client prediction + server reconciliation | Input buffer + positionCorrection listener + replay |
| SYNC-04 | Smooth remote player interpolation | positionBatch listener + interpolation buffer |

## Existing Infrastructure (What's Already Built)

### Shared game-logic (Phase 131)
- `pixel-validation.ts`: `velocityFromKeys()`, `resolvePixelCollision()`, `validatePixelSpeed()`, `bitmaskToKeyState()`
- Constants: `TILE_SIZE_PX=128`, `PLAYER_SPEED_PX=128`, `PLAYER_HITBOX={64×64}`, `DIAGONAL_NORMALIZATION=1/√2`
- Key bitmask convention: W=1, A=2, S=4, D=8

### Server handler (Phase 132)
- `MovementService` at `apps/game-server/src/game/movement.service.ts`: 20Hz tick loop, drains pending inputs, validates speed, resolves collision, broadcasts positions
- `GameGateway.handlePixelMove()`: accepts `player:pixelMove` event, queues to MovementService
- Server events: `positionBatch` (nearby observer positions), `positionCorrection` (authoritative snap-back with sequence echo)

### Wire-format contracts (shared-types)
- `ClientEvents['player:pixelMove']`: `{ keys: number, predictedPx: number, predictedPy: number, sequence: number }`
- `ServerEvents['positionBatch']`: `{ updates: Array<{ playerId: string, px: number, py: number }> }`
- `ServerEvents['positionCorrection']`: `{ px: number, py: number, sequence: number }`
- `PlayerPublic`: already has `px: number` and `py: number` fields

### Distance system (Phase 133)
- All range checks (melee, gather, NPC, aggro, leash) already use pixel distance
- `tileToPixelCenter()` and `pixelToTile()` available in game-logic
- Client WorldScene uses `tileToPixelCenter` as bridge until real pixel positions are available (line 2088 comment)

## Current Client Architecture (What Must Change)

### WorldScene (`apps/web/src/game/scenes/WorldScene.ts` — ~2200 lines)
**Movement:** Uses `MovementController` (tile-step) with `processInput(direction)` → calculates tile position via `calculateNewPosition()` → tween to new isometric screen position over `MOVE_DELAY_MS` (~150ms).
**Input:** `handleInput(time)` reads WASD keys, applies chord window (2ms), respects `moveDelay` rate-limit, resolves 8-directional Direction string, calls `movementController.processInput(direction)`.
**Animation:** `startPlayerAnimation(direction)` plays `character-run-{direction}`, `stopPlayerAnimation()` sets idle texture. Uses `movementTweenEndTime` + `lastMovementTime` + `IDLE_THRESHOLD_MS(50)` to detect idle.
**Camera:** `cameras.main.startFollow(localPlayer, true, 0.1, 0.1)` — lerp-based following. CONTEXT says center-locked with no lerp.
**Remote players:** `movePlayer(playerId, position)` tweens container to new screen position over 100ms, then stops animation on complete. Uses `player:moved` event (tile-based).

### MovementController (`apps/web/src/game/systems/MovementController.ts`)
Tile-step prediction: stores pending inputs as Direction+sequence, applies via `calculateNewPosition()`, reconciles by replaying unacknowledged Direction inputs against server position. Emits `player:move` (tile-based event).

### PathfindingController (`apps/web/src/game/systems/PathfindingController.ts`)
Click-to-move A* pathfinding — scheduled for removal in Phase 135 but must still function during 134 (or be disabled).

### Key observations:
1. **No pixel move emission on client yet** — client emits `player:move` (tile), not `player:pixelMove`. Server handler for `player:pixelMove` exists but is unused.
2. **No positionBatch/positionCorrection listeners** — client doesn't subscribe to these events.
3. **Camera uses lerp (0.1)** — CONTEXT says center-locked (no lerp/dead zone).
4. **Tween-based movement** — current system creates a Phaser tween per tile step. Pixel movement must update position every frame in `update()`.
5. **Isometric projection** — all screen positions go through `IsometricTransform.gridToScreen()`. Pixel positions (px, py) are in world grid space; must convert to isometric screen coords.
6. **Elevation** — tiles have height values; screen Y is offset by `elevation * 128`. Must handle in pixel rendering.
7. **Depth sorting** — uses `DepthSorter` based on grid position. Must update for sub-tile positions.
8. **resolveDirection()** — maps WASD to grid Direction strings (w, nw, n, ne, e, se, s, sw). For pixel movement, we need raw axis values (up/down/left/right) for `velocityFromKeys()`.
9. **Zone transitions** — currently tile-based with hysteresis (HYSTERESIS_TILES). Must work with pixel positions.

## Architecture Decisions

### New PixelMovementController
Replaces `MovementController`. Responsibilities:
- Read WASD key state → build bitmask → call `velocityFromKeys(keyState, dt)` each frame
- Apply `resolvePixelCollision()` locally for client prediction
- Maintain input sequence counter
- Emit `player:pixelMove` to server with bitmask + predicted px/py + sequence
- Buffer pending inputs for reconciliation
- Handle `positionCorrection` events: discard acknowledged inputs, snap to server position, replay unacknowledged

### Input Mapping Change
Current `resolveDirection()` produces a `Direction` string. New system needs `KeyState { up, down, left, right }` for `velocityFromKeys()`. The WASD→axis mapping:
- W = up, S = down, A = left, D = right (straight grid axes)
- This matches the bitmask convention: W=1(up), A=2(left), S=4(down), D=8(right)

### Direction for Animations
Derive Direction string from velocity vector for sprite selection:
- `atan2(vy, vx)` → snap to nearest of 8 directions
- Or use key combination: W+D=NE, W=N, etc.
- Must match existing `character-run-{direction}` and `character-idle-{direction}` texture keys

### Isometric Position Conversion
Pixel (px, py) in world grid space → tile coordinates → `gridToScreen()` → screen position.
Formula: `screenX = isoTransform.gridToScreen(px / TILE_SIZE_PX, py / TILE_SIZE_PX)`
This gives sub-tile screen positions for smooth movement.

### Camera Center-Lock
Replace `startFollow(player, true, 0.1, 0.1)` with `startFollow(player, true, 1.0, 1.0)` — lerp=1.0 means instant tracking (center-locked).

### Remote Player Interpolation
New `RemotePlayerInterpolator` class or inline logic:
- On `positionBatch` event: store `{ px, py, timestamp }` in per-player buffer
- In `update()`: interpolate between buffered positions using elapsed time
- Buffer holds ~2 ticks (100ms) of data for smooth playback
- Convert interpolated px/py to screen position via isometric transform
- Derive facing direction from interpolation vector for walk animation

### Reconciliation Threshold
CONTEXT says "ignore corrections under ~2-3px to prevent micro-jitter". After replaying unacknowledged inputs, if the distance between predicted and reconciled position is < 3px, keep predicted position.

### Server Emission Rate
The server emits `positionBatch` at 20Hz (50ms). Client should emit `player:pixelMove` at a similar rate — not every frame (60fps would flood the server). Use a timer: emit every ~50ms if keys are held.

## File Change Map

### New files
- `apps/web/src/game/systems/PixelMovementController.ts` — core pixel movement + prediction + reconciliation
- `apps/web/src/game/systems/RemotePlayerInterpolator.ts` — buffered interpolation for other players

### Modified files
- `apps/web/src/game/scenes/WorldScene.ts` — replace tile-step logic with pixel movement in update loop, wire up new controllers, update camera, add positionBatch/positionCorrection listeners
- `apps/web/src/store/gameStore.ts` — add positionBatch + positionCorrection socket listeners, update player px/py in store
- `apps/web/src/network/socket.ts` — (may not need changes if listeners are in gameStore)

### Untouched files
- Server code (Phase 132 complete — no changes needed)
- `packages/game-logic/src/movement/*` — all math functions already exist
- `packages/shared-types/src/network/events.ts` — all event types already defined

## Risk Areas

1. **Isometric coordinate conversion at sub-tile granularity** — `gridToScreen()` currently takes integer tile coords. Must verify it works with float inputs (e.g., `gridToScreen(1.5, 2.3)`).
2. **Elevation handling** — current elevation lookup uses integer tile coords. With pixel positions, must `Math.floor(px / TILE_SIZE_PX)` to get tile for elevation.
3. **Zone transition at pixel granularity** — current hysteresis uses tile distance. Must adapt to check pixel position against zone boundaries.
4. **Depth sorting with sub-tile positions** — DepthSorter and `calculateDepth()` may need float-precision grid coords.
5. **PathfindingController coexistence** — Phase 135 removes it. During Phase 134, click-to-move should be disabled or ignored when pixel movement is active.
6. **Side effects in WorldScene.updateLocalPlayerSprite()** — this method does fog reveal, POI discovery, portal detection, NPC proximity checks. All currently use tile-based Position. Must bridge to pixel positions or update these systems.
7. **Animation frame rate** — CONTEXT says "fixed animation rate — walk cycle speed does not scale with movement speed". Existing animation system should work as-is.

## Sequencing Strategy

**Wave 1 (can run in parallel):**
1. **PixelMovementController** — new controller with prediction, collision, reconciliation, and server emission
2. **RemotePlayerInterpolator** — buffered interpolation system for other players

**Wave 2 (depends on Wave 1):**
3. **WorldScene Integration** — wire PixelMovementController into update loop, replace tile-step handleInput, update camera, add network listeners, handle animations, bridge side-effects

---

## RESEARCH COMPLETE

*Phase: 134-client-movement-rewrite*
*Researched: 2026-03-18*
