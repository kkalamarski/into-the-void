# Architecture Research

**Domain:** Pixel movement rewrite — tile-based to free sub-tile WASD movement
**Researched:** 2026-03-17
**Confidence:** HIGH (based on direct codebase inspection + verified patterns from authoritative sources)

## Current Architecture (What Exists Today)

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Phaser + React)                            │
├────────────────────────────┬────────────────────────────────────────────────┤
│  WorldScene (update loop)  │           MovementController                   │
│  - handleInput() @60fps    │  - pendingInputs: PendingInput[]               │
│  - lastMoveTime gate       │  - processInput(direction: Direction)          │
│  - MOVE_DELAY_MS = 500ms   │  - applyInput() -> calculateNewPosition()      │
│  - PathfindingController   │  - reconcile(serverPos, lastProcessedInput)    │
│  - chord detection (2ms)   │                                                 │
├────────────────────────────┴────────────────────────────────────────────────┤
│  Socket.IO -> player:move { direction, sequence }                            │
│  Socket.IO <- player:moved { playerId, position, lastProcessedInput }       │
├─────────────────────────────────────────────────────────────────────────────┤
│                      SERVER (NestJS game-server)                             │
├────────────────────────────┬────────────────────────────────────────────────┤
│  GameGateway               │  GameService / PlayerService                   │
│  - handleMove()            │  - movePlayer() -> validateMovementWithElevation│
│  - rate limit: 500ms-50ms  │  - calculateNewPosition()                      │
│  - getMovementDelay()      │  - getTileSpeedModifier()                      │
│  - zone transition logic   │  - updateCharacterPosition() -> DB             │
├────────────────────────────┴────────────────────────────────────────────────┤
│                     SHARED (packages/game-logic)                             │
│  - calculateNewPosition(from: Position, direction: Direction): Position      │
│  - validateMovement(from, to, collisionMap: boolean[][]): result             │
│  - validateMovementWithElevation(from, to, collisionMap, heights): result   │
│  - DIRECTION_VECTORS: Record<Direction, {dx, dy}>                            │
│  - collisionMap: boolean[][] (one per zone, 0=walkable, 1=blocked)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Current Position Model

`Position` is integer tile coordinates: `{ x: number, y: number, zoneId: string }`.

Movement is discrete: one tile per server acknowledgment, gated by `MOVE_DELAY_MS = 500ms`.
Input model: client sends a `Direction` enum ('n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw').
Server validates via boolean `collisionMap[y][x]` and elevation delta.
Sprite movement uses Phaser tweens between tile screen positions (~500ms tween).

All downstream systems (combat, gathering, NPC interaction, AI aggro) use integer tile coordinates and Manhattan/Chebyshev tile distance.

---

## Target Architecture (After Pixel Movement Rewrite)

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Phaser + React)                            │
├────────────────────────────┬────────────────────────────────────────────────┤
│  WorldScene (update loop)  │        PixelMovementController (NEW)           │
│  - handleInput() @60fps    │  - px, py: number (sub-tile floats)            │
│  - NO move delay gate      │  - pendingInputs: InputSnapshot[]              │
│  - apply velocity per frame│  - handleInput(dt, keys) -> collide -> move    │
│  - pixel collision check   │  - emit player:move at ~20Hz (throttled)       │
│  - sprite follows px/py    │  - reconcile(serverPx, serverPy, lastSeq)      │
├────────────────────────────┴────────────────────────────────────────────────┤
│  Socket.IO -> player:move { keys, px, py, sequence, timestamp }             │
│  Socket.IO <- player:moved { playerId, px, py, sequence }                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                      SERVER (NestJS game-server)                             │
├────────────────────────────┬────────────────────────────────────────────────┤
│  GameGateway               │  PlayerService / GameService                   │
│  - handleMove()            │  - validatePixelMovement() (speed cap)        │
│  - rate limit: ~50ms        │  - resolvePixelCollision() (AABB)             │
│  - speed cap check          │  - zone crossing from tile(px, py)            │
│  - position accumulator    │  - DB save: tile coords only on disconnect     │
├────────────────────────────┴────────────────────────────────────────────────┤
│                     SHARED (packages/game-logic)                             │
│  - resolvePixelCollision(px, py, dx, dy, collisionMap): {px, py} (NEW)     │
│  - pixelDistanceTo(ax, ay, bx, by): number (NEW)                            │
│  - tileToPixelCenter(tx, ty, tileSize): {px, py} (NEW)                      │
│  - pixelToTile(px, py, tileSize): {tx, ty} (NEW)                            │
│  - PLAYER_SPEED_PX: 192 (2 tiles/sec * 96px/tile) (NEW)                    │
│  - PLAYER_HITBOX: {w: 32, h: 32} (NEW)                                      │
│  - Range constants: MELEE_RANGE_PX, GATHER_RANGE_PX, etc. (NEW)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `PixelMovementController` | Client-side pixel prediction, velocity from key bitmask, per-frame AABB collision, 20Hz emit, reconciliation | NEW |
| `resolvePixelCollision()` | Shared: AABB sweep against tile grid, axis-separated resolution | NEW |
| `pixelDistanceTo()` | Shared: Euclidean pixel distance for all range checks | NEW |
| `tileToPixelCenter()` / `pixelToTile()` | Shared: coordinate conversion bridge | NEW |
| `WorldScene.handleInput()` | Read WASD keys, call PixelMovementController per frame — remove delay gate, remove pathfinding branch | MODIFY |
| `WorldScene.update()` | Drive sprite to pixel position directly (no tweens) | MODIFY |
| `WorldScene.create()` | Remove PathfindingController init, remove click-to-move handler, init PixelMovementController | MODIFY |
| `GameGateway.handleMove()` | Accept `{keys, px, py, sequence}` instead of `{direction}`, rate limit to ~50ms | MODIFY |
| `PlayerService` | Add `px, py` to `ConnectedPlayer` in memory; convert to tile coords only for DB persist | MODIFY |
| `GameService.movePlayer()` | Replace direction-based tile move with pixel position validation | MODIFY |
| `CombatService` range checks | Replace Chebyshev `dist > 1` with `pixelDistanceTo() > MELEE_RANGE_PX` | MODIFY |
| `GatheringService` range check | Replace Manhattan tile distance in `canInteract()` with pixel distance | MODIFY |
| `AiService` aggro/leash | Replace tile Chebyshev in aggro detection with pixel distance | MODIFY |
| `ClientEvents['player:move']` | Change payload from `{direction, sequence?}` to `{keys, px, py, sequence, timestamp}` | MODIFY |
| `ServerEvents['player:moved']` | Change payload from `{position: Position, lastProcessedInput?}` to `{px, py, sequence}` | MODIFY |
| `constants.ts` | Remove `MOVE_DELAY_MS` gate usage; add `PLAYER_SPEED_PX`, `PLAYER_HITBOX` | MODIFY |
| `MovementController` | Replaced by PixelMovementController | REMOVE |
| `PathfindingController` | Click-to-move dropped per milestone spec | REMOVE |

---

## Recommended Project Structure

```
packages/game-logic/src/
├── movement/
│   ├── validation.ts          # keep — calculateNewPosition, zone boundary math
│   ├── pixel-validation.ts    # NEW — resolvePixelCollision, validatePixelSpeed
│   ├── pixel-distance.ts      # NEW — pixelDistanceTo, tileToPixelCenter, pixelToTile, range constants
│   ├── speed.ts               # keep — tile speed modifier reference
│   └── pathfinding.ts         # keep for manhattanDistance utility only

packages/shared-types/src/
├── core/
│   └── position.ts            # MODIFY — add PixelPosition interface alongside Position
├── network/
│   └── events.ts              # MODIFY — update ClientEvents/ServerEvents player:move payloads
├── constants.ts               # MODIFY — add PLAYER_SPEED_PX, PLAYER_HITBOX

apps/web/src/game/systems/
├── PixelMovementController.ts # NEW — replaces MovementController.ts
├── MovementController.ts      # DELETE
├── PathfindingController.ts   # DELETE

apps/game-server/src/game/
├── game.gateway.ts            # MODIFY — handleMove accepts pixel coords
├── game.service.ts            # MODIFY — movePlayer uses pixel validation
├── player.service.ts          # MODIFY — store px/py in memory, tile in DB
├── combat.service.ts          # MODIFY — pixel distance for melee range
├── gathering.service.ts       # MODIFY — pixel distance for interaction range
├── ai.service.ts              # MODIFY — pixel distance for aggro/leash
```

---

## Architectural Patterns

### Pattern 1: Input-as-Key-Bitmask (not Input-as-Vector)

**What:** Client sends a key bitmask (W=1, A=2, S=4, D=8) with each position update. Server reconstructs the velocity from the key state using the same shared `PLAYER_SPEED_PX` constant.

**When to use:** Prevents velocity manipulation exploits. A modified client cannot claim to move at arbitrary speed by sending a custom velocity vector. Server recomputes deterministically from key bits.

**Trade-offs:** Requires `PLAYER_SPEED_PX` constant shared between client and server packages. Simple to implement; key state to velocity is a few comparisons.

**Example:**
```typescript
// packages/shared-types/src/network/events.ts
export interface PixelMovePayload {
  keys: number;         // bitmask: W=1, A=2, S=4, D=8
  px: number;           // client's predicted position
  py: number;
  sequence: number;
  timestamp: number;
}

// packages/game-logic/src/movement/pixel-validation.ts
export const KEY_W = 1, KEY_A = 2, KEY_S = 4, KEY_D = 8;
export function velocityFromKeys(
  keys: number,
  speedPx: number
): { vx: number; vy: number } {
  const w = !!(keys & KEY_W), a = !!(keys & KEY_A);
  const s = !!(keys & KEY_S), d = !!(keys & KEY_D);
  let vx = 0, vy = 0;
  if (d) vx += speedPx; if (a) vx -= speedPx;
  if (s) vy += speedPx; if (w) vy -= speedPx;
  // Normalize diagonal to prevent 41% speed boost
  if (vx !== 0 && vy !== 0) {
    const norm = 1 / Math.SQRT2;
    vx *= norm; vy *= norm;
  }
  return { vx, vy };
}
```

### Pattern 2: AABB Sweep Against Tile Grid

**What:** Player has a small rectangular hitbox (32x32px, centered on px/py). Each frame, test the AABB at the new position against the existing boolean `collisionMap[][]`. Resolve axis-by-axis to allow wall sliding.

**When to use:** Standard 2D free-movement collision. Works directly with the existing per-zone `collisionMap: boolean[][]` that world-gen already produces. No physics engine required.

**Trade-offs:** Simple and predictable. Allows sliding along walls (natural feel). Cannot handle tiles smaller than the hitbox — at 96px tiles and 32px hitbox this is not an issue. Must run on both client (prediction) and server (validation) using identical shared logic.

**Example:**
```typescript
// packages/game-logic/src/movement/pixel-validation.ts
export const TILE_SIZE = 96;
export const PLAYER_HITBOX = { w: 32, h: 32 };

export function resolvePixelCollision(
  px: number, py: number,
  dx: number, dy: number,
  collisionMap: boolean[][]
): { px: number; py: number } {
  // Test X movement separately
  let newPx = px + dx;
  if (isAABBBlocked(newPx, py, collisionMap)) {
    newPx = px; // blocked on X axis
  }
  // Test Y movement separately (allows sliding along walls)
  let newPy = py + dy;
  if (isAABBBlocked(newPx, newPy, collisionMap)) {
    newPy = py; // blocked on Y axis
  }
  return { px: newPx, py: newPy };
}

function isAABBBlocked(px: number, py: number, map: boolean[][]): boolean {
  const hw = PLAYER_HITBOX.w / 2, hh = PLAYER_HITBOX.h / 2;
  const corners: [number, number][] = [
    [px - hw, py - hh], [px + hw - 1, py - hh],
    [px - hw, py + hh - 1], [px + hw - 1, py + hh - 1],
  ];
  return corners.some(([cx, cy]) => {
    const tx = Math.floor(cx / TILE_SIZE);
    const ty = Math.floor(cy / TILE_SIZE);
    return map[ty]?.[tx] === true;
  });
}
```

### Pattern 3: Server as Soft Authority (Speed Cap + Correction Threshold)

**What:** Server validates speed (no teleporting), applies its own collision check, and sends corrections only when client position diverges beyond a threshold (e.g., >16px). Under normal conditions server echoes the client's position back with the sequence number.

**When to use:** Industry standard for MMOs with authoritative servers. Full server-side simulation at 60Hz per player is impractical in NestJS Node.js. The goal is anti-cheat and eventual consistency, not frame-perfect determinism.

**Trade-offs:** A position-hacking client could drift within the speed tolerance window. Acceptable for this PvE-focused MMO. The 50ms rate limit means at most 20 authoritative snapshots/second — sufficient for visible correction without flooding.

**Example:**
```typescript
// apps/game-server/src/game/game.gateway.ts
@SubscribeMessage('player:move')
async handleMove(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: PixelMovePayload
) {
  const player = this.playerService.getPlayerBySocket(client.id);
  if (!player) return;

  const now = Date.now();
  const dt = (now - player.lastPixelMoveTime) / 1000;

  // Rate limit: reject more than 20 updates/sec
  if (dt < 0.04) return;

  // Speed cap: max distance is PLAYER_SPEED_PX * dt * 1.2 (20% tolerance)
  const maxDist = PLAYER_SPEED_PX * dt * 1.2;
  const actualDist = Math.hypot(data.px - player.px, data.py - player.py);
  if (actualDist > maxDist) {
    // Reject teleport attempt, send authoritative position
    client.emit('player:moved', { playerId: player.id, px: player.px, py: player.py, sequence: data.sequence });
    return;
  }

  // Run server-side collision to catch wall clipping
  const collisionMap = this.zonesService.getCollisionMap(player.position.zoneId);
  const validated = resolvePixelCollision(
    player.px, player.py,
    data.px - player.px, data.py - player.py,
    collisionMap
  );

  player.px = validated.px;
  player.py = validated.py;
  player.lastPixelMoveTime = now;

  // Broadcast to zone
  this.server.to(player.position.zoneId).emit('player:moved', {
    playerId: player.id, px: player.px, py: player.py, sequence: data.sequence,
  });
}
```

### Pattern 4: Pixel-to-Tile Bridging for Zone Transitions and DB Persistence

**What:** Internal position memory uses pixel floats. Zone boundary detection converts pixel to tile (`tileX = floor(px / TILE_SIZE)`) and checks tile against zone size. DB persistence converts pixel to tile on disconnect. No DB schema change required.

**When to use:** Minimize migration risk. The `position: {x, y, zoneId}` column keeps tile integers. Pixel state lives only in `PlayerService` memory. On reconnect, player spawns at the tile center (sub-tile precision lost between sessions — acceptable).

**Example:**
```typescript
// On connect: initialize pixel pos from tile position
player.px = (character.position.x + 0.5) * TILE_SIZE;
player.py = (character.position.y + 0.5) * TILE_SIZE;

// On disconnect: convert to tile for DB
const tileX = Math.floor(player.px / TILE_SIZE);
const tileY = Math.floor(player.py / TILE_SIZE);
await updateCharacterPosition(db, playerId, { x: tileX, y: tileY, zoneId });

// Zone crossing detection (same logic as before, now derived from pixels)
const newTileX = Math.floor(player.px / TILE_SIZE);
const newTileY = Math.floor(player.py / TILE_SIZE);
if (newTileX < 0 || newTileX >= ZONE_SIZE) {
  // Handle zone X boundary crossing
}
```

---

## Data Flow

### Pixel Movement Flow (New)

```
WASD keys held (each frame ~16ms at 60fps)
    |
    v
PixelMovementController.handleInput(dt, keys)
    -> velocityFromKeys(keys, PLAYER_SPEED_PX)  // e.g. vx=192, vy=0
    -> dx = vx * dt, dy = vy * dt              // e.g. dx=3.2 at 60fps
    -> resolvePixelCollision(px, py, dx, dy, localCollisionMap)
    -> update local px, py
    -> move Phaser sprite to isoTransform.gridToScreen(px/TILE_SIZE, py/TILE_SIZE)
    -> IF elapsed > 50ms: emit player:move { keys, px, py, sequence }
    |
    v
Server GameGateway.handleMove()
    -> rate limit: reject if < 40ms since last
    -> speed cap: reject if distance > PLAYER_SPEED_PX * dt * 1.2
    -> resolvePixelCollision() on server with authoritative collisionMap
    -> update player.px, player.py in PlayerService
    -> derive tile coords for zone boundary check
    -> broadcast player:moved { playerId, px, py, sequence } to zone room
    |
    v
Other clients receive player:moved
    -> lerp remote player sprite toward px, py over next frame(s)
    |
    v
Originating client receives own player:moved
    -> reconcile: if server px/py differs from local predicted by > 16px, snap to server
    -> replay unacknowledged inputs from pendingInputs buffer
```

### Range Check Flow (Modified)

```
Before (tile distance):
  CombatService melee:    Math.max(|cx-px|, |cy-py|) <= 1  (Chebyshev tiles)
  GatheringService:       manhattanDistance(...) <= range + 1.0  (Manhattan tiles)
  AiService aggro:        Math.max(|cx-px|, |cy-py|) <= AGGRO_RADIUS  (tiles)

After (pixel distance):
  pixelDistanceTo(ax, ay, bx, by) = Math.hypot(bx-ax, by-ay)

  MELEE_RANGE_PX   = 144   // 1.5 * TILE_SIZE — melee weapons
  RANGED_3T_PX     = 336   // 3.5 * TILE_SIZE — 3-tile ranged tools
  RANGED_5T_PX     = 528   // 5.5 * TILE_SIZE — 5-tile ranged tools
  GATHER_RANGE_PX  = 192   // 2.0 * TILE_SIZE — gathering interaction
  NPC_RANGE_PX     = 192   // 2.0 * TILE_SIZE — NPC interaction
  AGGRO_RADIUS_PX  = 480   // 5.0 * TILE_SIZE — creature detect range
  LEASH_RADIUS_PX  = 960   // 10.0 * TILE_SIZE — creature leash distance
```

### DB Persistence Flow (No Schema Change)

```
Player disconnects
    -> tileX = floor(player.px / TILE_SIZE)
    -> tileY = floor(player.py / TILE_SIZE)
    -> updateCharacterPosition(db, id, {x: tileX, y: tileY, zoneId})
       (same DB column, same function call — no migration needed)

Player connects
    -> load {x, y, zoneId} from DB
    -> player.px = (x + 0.5) * TILE_SIZE  // center of tile
    -> player.py = (y + 0.5) * TILE_SIZE
```

---

## Integration Points: New vs Modified vs Removed

### New Components

| Component | Location | What It Does |
|-----------|----------|-------------|
| `PixelMovementController` | `apps/web/src/game/systems/PixelMovementController.ts` | Client prediction: velocity from keys, AABB collision, 20Hz network emit, reconciliation with server |
| `pixel-validation.ts` | `packages/game-logic/src/movement/pixel-validation.ts` | `resolvePixelCollision()`, `velocityFromKeys()`, `validatePixelSpeed()`, hitbox + speed constants |
| `pixel-distance.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | `pixelDistanceTo()`, `tileToPixelCenter()`, `pixelToTile()`, all pixel range constants |
| `PixelPosition` interface | `packages/shared-types/src/core/position.ts` | `{px: number, py: number, zoneId: string}` — used for network protocol and in-memory server state |
| `PixelMovePayload` type | `packages/shared-types/src/network/events.ts` | Client-to-server: `{keys, px, py, sequence, timestamp}` |

### Modified Components

| Component | Location | Required Change |
|-----------|----------|----------------|
| `WorldScene.handleInput()` | `WorldScene.ts` | Remove `MOVE_DELAY_MS` gate and chord detection; call `PixelMovementController.handleInput(dt, keys)` per frame |
| `WorldScene.update()` | same | Drive sprite position from pixel floats; remove tween-based movement; add remote player lerp |
| `WorldScene.create()` | same | Remove `PathfindingController` init; remove click-to-move `pointerup` handler; init `PixelMovementController` |
| `WorldScene.updateLocalPlayerSprite()` | same | Accept pixel coords instead of tile `Position`; position sprite directly |
| `GameGateway.handleMove()` | `game.gateway.ts` | Accept `PixelMovePayload`; validate speed cap; call pixel collision; derive tile for zone logic |
| `PlayerService` (`ConnectedPlayer`) | `player.service.ts` | Add `px: number, py: number, lastPixelMoveTime: number`; init on auth; strip to tile on disconnect |
| `GameService.movePlayer()` | `game.service.ts` | Replace `calculateNewPosition(direction)` with pixel validation path |
| `CombatService.creatureAttackTick()` | `combat.service.ts` | Line ~220: replace `Math.max(|dx|, |dy|) > 1` with `pixelDistanceTo(...) > MELEE_RANGE_PX` |
| `CombatService.triggerPackCall()` | same | Replace Chebyshev tile distance with pixel distance for Pack Call radius |
| `GatheringService` / `interaction.ts canInteract()` | both files | Replace Manhattan tile distance with `pixelDistanceTo()` and `GATHER_RANGE_PX` |
| `AiService` aggro radius | `ai.service.ts` | Replace tile Chebyshev for creature aggro/leash with pixel distance constants |
| `ClientEvents['player:move']` | `network/events.ts` | Change type from `{direction: Direction; sequence?: number}` to `PixelMovePayload` |
| `ServerEvents['player:moved']` | same | Change from `{playerId, position: Position, lastProcessedInput?}` to `{playerId, px, py, sequence}` |
| `constants.ts` | `shared-types` | Add `PLAYER_SPEED_PX`, `PLAYER_HITBOX`; keep `MOVE_DELAY_MS` as dead export (or remove) |

### Removed Components

| Component | Location | Why |
|-----------|----------|-----|
| `MovementController.ts` | `apps/web/src/game/systems/` | Entirely replaced by `PixelMovementController.ts` |
| `PathfindingController.ts` | `apps/web/src/game/systems/` | Click-to-move dropped per milestone spec |
| `pathfinding.ts` findPath function | `packages/game-logic/src/movement/` | A* no longer used; keep `manhattanDistance` and `chebyshevDistance` as utilities |
| Click-to-move `pointerup` handler | `WorldScene.ts` lines 376-413 | Dropped per milestone spec |
| Chord detection (`chordStartTime`) | `WorldScene.handleInput()` | No longer needed in continuous pixel movement |
| `MOVE_DELAY_MS` gate in handleInput | same | Free movement has no tile delay |
| Tween-based player sprite movement | `updateLocalPlayerSprite()` | Sprite position set directly from px/py each frame |

---

## Suggested Build Order

The order respects compile-time and runtime dependencies: shared types must exist before game-logic uses them; game-logic must exist before server/client use it; server and client can be built in parallel after that.

### Phase 1: Shared Foundation (no runtime breakage)

New types and functions added alongside existing code. Old code compiles unchanged.

1. Add `PixelPosition`, `PixelMovePayload` to `packages/shared-types/src/core/position.ts` and `network/events.ts`
2. Add `PLAYER_SPEED_PX`, `PLAYER_HITBOX` to `packages/shared-types/src/constants.ts`
3. Write `pixel-distance.ts` in `packages/game-logic/src/movement/` — `pixelDistanceTo`, `tileToPixelCenter`, `pixelToTile`, all pixel range constants
4. Write `pixel-validation.ts` in same folder — `resolvePixelCollision`, `velocityFromKeys`, `validatePixelSpeed`
5. Unit test `resolvePixelCollision` against a simple 5x5 boolean map

**Gate:** All packages compile. New functions tested in isolation.

### Phase 2: Server Movement Handler

Rewrite server movement to accept pixel coordinates. The old `direction`-based client event still exists in types temporarily — development will be in a feature branch.

1. Extend `ConnectedPlayer` with `px, py, lastPixelMoveTime` in `PlayerService`
2. Initialize `px, py` from tile center on `authenticate()`
3. Convert `px, py` to tile on `handleDisconnect()` (same DB call)
4. Rewrite `GameGateway.handleMove()` to accept `PixelMovePayload`, validate speed cap, run `resolvePixelCollision`
5. Rewrite `GameService.movePlayer()` for pixel validation (or inline into gateway)
6. Update `ServerEvents['player:moved']` broadcast to emit `px, py`

**Gate:** Server processes pixel move payloads and broadcasts correctly. DB schema unchanged. A manual WebSocket test (e.g., Postman/wscat) confirms pixel moves accepted.

### Phase 3: Distance System Migration

All range checks updated to pixel distance. Requires `px, py` available on server entities.

1. Add `px, py` to server-side player objects (done in Phase 2)
2. Creature entities: derive `px, py` from tile position when needed (use `tileToPixelCenter`)
3. Update `CombatService.creatureAttackTick()` melee range check
4. Update `CombatService.triggerPackCall()` Pack Call radius
5. Update `GatheringService` interaction range (replace `canInteract` tile check)
6. Update `AiService` aggro radius and leash radius

**Gate:** Combat, gathering, and AI all work. Range feels the same to the player (constants are calibrated to old tile ranges).

### Phase 4: Client Movement Rewrite

Replace `MovementController` and `PathfindingController`. Update WorldScene.

1. Write `PixelMovementController.ts` — velocity integration, per-frame AABB collision, 20Hz emit, reconcile
2. Update `WorldScene.handleInput()` — remove delay gate, remove chord detection, call `PixelMovementController`
3. Update `WorldScene.update()` — sprite follows `px/py` floats directly, no tweens
4. Update `WorldScene.create()` — remove `PathfindingController` init, remove click-to-move handler
5. Update `updateLocalPlayerSprite()` to position sprite from pixel coords via `isoTransform`
6. Delete `MovementController.ts` and `PathfindingController.ts`

**Gate:** Local player moves freely without the 500ms gate. Movement feels responsive.

### Phase 5: Remote Player Interpolation

Other players' sprites interpolate smoothly to received `px, py` positions.

1. Update the `player:joined` / `player:moved` handler in `WorldScene` to store remote `px, py`
2. Add lerp loop toward authoritative pixel position in `WorldScene.update()` per remote player
3. Adjust lerp speed (start with ~10x per second, tune based on feel)

**Gate:** Multiplayer test shows smooth remote player movement at normal latency.

### Phase 6: Flat Blocking Tile Fix

Collision map audit — fix tiles that appear walkable but block movement.

1. Audit `world-gen` collision map generation against `TileRegistry.walkable` property
2. Identify tile IDs where `walkable: true` but collision map sets them blocked (generator logic mismatch)
3. Fix the world-gen collision generation for affected tile types
4. Validate in dev zone for all 16 biomes using the collision debug overlay

**Gate:** No invisible walls in normal play across all biomes.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client Sends Velocity Vector

**What people do:** Client computes `vx = speed * cos(angle)` and sends that to the server.

**Why it's wrong:** Client can send arbitrary velocity. A modified client sends `vx = 9999` to teleport.

**Do this instead:** Client sends key bitmask. Server reconstructs velocity from keys using the shared `PLAYER_SPEED_PX` constant. Client and server reach the same velocity deterministically.

### Anti-Pattern 2: Full Physics Tick on Server Per Client Update

**What people do:** Run a full fixed-timestep physics loop on the server every time a client sends a position update.

**Why it's wrong:** This game does not need frame-perfect physics consistency. At 20 updates/second per player in a NestJS Node.js event loop, a full simulation loop per event wastes CPU and adds complexity that is unwarranted.

**Do this instead:** Server performs a single collision sweep per update: take client's claimed delta, check speed cap, call `resolvePixelCollision()` once, store result. No simulation loop needed.

### Anti-Pattern 3: Storing Sub-Tile Position in the Database

**What people do:** Add `px float, py float` columns to the `characters` DB table.

**Why it's wrong:** DB migrations are risky. Sub-tile precision is not meaningful across sessions — players do not notice a 48px spawn offset on login. Adds migration complexity and DB query overhead for no player-visible benefit.

**Do this instead:** Keep `position: {x, y, zoneId}` as tile integers in the DB. Convert pixel to tile on disconnect. Initialize pixel position from tile center on connect.

### Anti-Pattern 4: Tweening Between Tile Positions Client-Side

**What people do:** Keep the tween-between-tiles system and just run it faster.

**Why it's wrong:** Tweens introduce a fixed artificial delay — you cannot change direction mid-tween without stuttering. The tween is the root cause of the "not responsive enough" feel the rewrite aims to fix.

**Do this instead:** Set the sprite position directly from `px/py` floats each frame. Camera follows with a lerp. No tweens.

### Anti-Pattern 5: Using Pixel Distance for Zone Boundary Detection

**What people do:** Use pixel distance (e.g., from zone center) to detect when a player enters a new zone.

**Why it's wrong:** Zone boundaries are defined by the tile grid. Using pixel distance introduces floating-point ambiguity and does not align with how zones are stored (`zoneId = 'z_X_Y'`).

**Do this instead:** Derive tile coordinates from pixel position (`tileX = floor(px / TILE_SIZE)`) and compare against `ZONE_SIZE` (64) to detect boundary crossing. Use zone tile offsets for the new zone ID.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 players | Server validates each update individually, broadcasts to zone room. 20 updates/sec per player is fine. |
| 100-1,000 players | Batch position broadcasts (accumulate within 50ms window, send all at once). Delta compression on `px, py` (send int16 delta instead of float). |
| 1,000+ players | Spatial interest management (only send updates for players within visibility radius). Spatial hash for collision queries if per-player CPU becomes a concern. |

The existing zone room architecture handles 0-1,000 range without significant change. Zone rooms already naturally scope broadcasts.

---

## Sources

- [Client-Side Prediction and Server Reconciliation — Gabriel Gambetta](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) — authoritative reference on the prediction/reconciliation pattern
- [Source Multiplayer Networking — Valve Developer Community](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking) — 20Hz update rate, interpolation period reference
- [2D Tilemap Collision — Jonathan Whiting](https://jonathanwhiting.com/tutorial/collision/) — AABB sweep against tile grid, axis-separated resolution
- [The guide to implementing 2D platformers — Higher-Order Fun](http://higherorderfun.com/blog/2012/05/20/the-guide-to-implementing-2d-platformers/) — canonical free-movement collision model
- [Server Authoritative Movement — GameDev.net](https://gamedev.net/forums/topic/706590-server-authoritative-movement-questions/) — speed cap and soft authority pattern
- Codebase inspection (authoritative):
  - `apps/web/src/game/systems/MovementController.ts` — existing client prediction
  - `apps/game-server/src/game/game.gateway.ts` — handleMove, rate limit, zone transition
  - `packages/game-logic/src/movement/validation.ts` — calculateNewPosition, validateMovement
  - `packages/game-logic/src/visibility/range.ts` — tile distance, Chebyshev
  - `packages/game-logic/src/interaction/interaction.ts` — canInteract, Manhattan distance
  - `packages/shared-types/src/core/position.ts` — Position interface (tile integers)
  - `packages/shared-types/src/constants.ts` — MOVE_DELAY_MS = 500ms
  - `packages/database/src/schema/characters.ts` — PositionJson stored as tile coords
  - `apps/game-server/src/game/combat.service.ts` — Chebyshev melee range check line ~220

---

*Architecture research for: v1.27 Pixel Movement Rewrite*
*Researched: 2026-03-17*
