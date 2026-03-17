# Phase 132: Server Movement Handler - Research

**Researched:** 2026-03-17
**Domain:** NestJS WebSocket server, game-loop tick design, pixel movement validation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Rejection behavior**
- On invalid move (speed cap exceeded or collision): snap player back to last valid position — do not clamp to max valid
- Send explicit `positionCorrection` event back to the offending client with sequence number for clean reconciliation
- 10% speed tolerance before rejecting (matches `validatePixelSpeed` from Phase 131)
- No escalation on repeated violations — just keep correcting. Anti-cheat escalation is a future concern

**Tick rate & broadcast**
- Proximity-based broadcasting — only send position updates to players within a certain range (not all players in zone)
- Batched per tick — one `positionBatch` event per 50ms tick containing all nearby player positions that changed
- Only include players whose position changed since last tick — skip stationary players
- Accept client input at any rate, process the latest key state each server tick — no enforcement of 1-input-per-tick

**Position storage**
- DB tile only on disconnect — floor px/py to tile ints, store in DB. On reconnect, spawn at tile center. No Redis for position
- New player joins appear in the next broadcast tick (at most 50ms delay), no dedicated `playerJoined` position event
- Zone transfers snap to tile center in the new zone — no pixel offset preservation across zones
- No last-updated timestamp on in-memory position — keep storage minimal (px, py, zoneId)

**Input format**
- Client sends key bitmask (which WASD keys are held), not direction vector — server computes velocity via `velocityFromKeys`
- Payload: `{ keys: number, predictedPx: number, predictedPy: number, sequence: number }` — server compares its calculation to client prediction
- Sequence number is a simple auto-incrementing counter per client — no timestamp
- Server echoes sequence number only in `positionCorrection` events, not in regular broadcasts

### Claude's Discretion
- Proximity radius for broadcasting (how far away players need to be to receive updates)
- Spatial partitioning strategy for proximity checks (grid cells, quadtree, etc.)
- Exact tick loop implementation (setInterval, NestJS scheduler, etc.)
- How to integrate with existing zone/room Socket.IO structure
- Speed multiplier passing through from equipment stats to server validation

### Deferred Ideas (OUT OF SCOPE)
- Anti-cheat escalation (kick/warn after N violations) — future phase
- Redis-cached pixel positions for fast reconnection — evaluate if needed later
- Lag compensation for combat hit detection — separate from movement validation
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYNC-01 | Server validates player position at tick rate (speed-cap + collision check, rejects teleportation) | `validatePixelSpeed` + `resolvePixelCollision` from Phase 131 game-logic; existing `collisions: boolean[][]` in `ChunkData` via `ZonesService.getChunk()`; `ConnectedPlayer` in-memory state gains `px/py/lastPxTime` |
| SYNC-02 | Server broadcasts player positions at ~20Hz to nearby players | `setInterval`-based 50ms tick in new `MovementService`; dirty-flag pattern to filter stationary players; proximity radius check against all players in zone |
</phase_requirements>

---

## Summary

Phase 132 replaces the old 140ms tile-step rate limiter (`lastMoveTimes` + `minDelay` gate in `GameGateway.handleMove()`) with a continuous, velocity-based pixel movement handler. The server maintains floating-point `(px, py)` per connected player in-memory, validates incoming `PixelMovePayload` events using the already-shipped `validatePixelSpeed` and `resolvePixelCollision` from `@into-the-void/game-logic`, and broadcasts deltas at 20Hz (50ms `setInterval`).

The main work splits into three parts: (1) extend `ConnectedPlayer` in `PlayerService` with `px`, `py`, and `lastPxInputTime` fields, initialised from tile-center on connect and flushed to tile integers on disconnect; (2) add a new `player:pixelMove` Socket.IO handler in `GameGateway` that stores the latest payload per player but does not process it directly; and (3) create a `MovementService` that drives the 50ms tick loop, processes the queued input, validates and corrects positions, then emits a `positionBatch` event to all players within the broadcast radius.

The existing infrastructure is well-suited: `ChunkData.collisions` is a `boolean[][]` that `resolvePixelCollision`'s `isSolid` callback can index directly. Zone-rooms are already managed by `Socket.IO` rooms (e.g. `z_0_0`), so targeted broadcasts are straightforward. No DB schema changes are required.

**Primary recommendation:** Add a `MovementService` (`OnModuleInit`) that owns the 50ms tick and holds the per-player pixel state and pending-input queues. The gateway remains a thin router.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/websockets` + `socket.io` | Already in project | WebSocket gateway, emit/room APIs | Existing infrastructure — no new dependency |
| `@into-the-void/game-logic` | Workspace package (Phase 131) | `velocityFromKeys`, `resolvePixelCollision`, `validatePixelSpeed`, `PLAYER_SPEED_PX`, `tileToPixelCenter`, `pixelToTile` | All the pixel math is already implemented and tested |
| Node.js `setInterval` | Built-in | 50ms tick loop | Used by `ZonesService.processRespawnTick()` and `AiService.scheduleNextTick()` — identical pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lru-cache` | Already in project (ZonesService) | Zone collision map caching if `getChunk()` is too slow | Only if profiling shows tick budget exceeded |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `setInterval` | `@nestjs/schedule` `@Interval()` | NestJS scheduler is cleaner but requires importing `ScheduleModule` — `setInterval` in `onModuleInit()` is the existing project pattern and avoids a new module import |
| Zone-room broadcast | Proximity-filtered loop | Decided: proximity filter is required. Cannot use simple `server.to(zoneId).emit()` for `positionBatch` — must manually iterate players in zone and compute distance |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/game-server/src/game/
├── movement.service.ts    # NEW — pixel tick loop, pending-input map, 20Hz broadcast
├── player.service.ts      # MODIFY — add px/py/lastPxInputTime to ConnectedPlayer
├── game.gateway.ts        # MODIFY — add player:pixelMove handler, remove old rate limiter
└── game.module.ts         # MODIFY — register MovementService

packages/shared-types/src/
├── network/events.ts      # MODIFY — add PixelMovePayload to ClientEvents, positionBatch to ServerEvents
└── core/position.ts       # ALREADY HAS PixelPosition — use as-is
```

### Pattern 1: Pending-Input Queue Per Player

**What:** `GameGateway.handlePixelMove()` stores only the *latest* payload per player in a `Map<playerId, PixelMovePayload>`. On each 50ms tick, `MovementService` drains the map, validates and updates positions, then broadcasts.

**When to use:** Client sends at variable rate (e.g., 60Hz animation frames); server processes at fixed 20Hz. Storing only the latest key state (not a queue) prevents input pile-up and matches the decision "process the latest key state each server tick."

**Example:**
```typescript
// apps/game-server/src/game/movement.service.ts
@Injectable()
export class MovementService implements OnModuleInit {
  private pendingInputs: Map<string, PixelMovePayload> = new Map(); // playerId -> latest input
  private server: Server | null = null;
  private readonly TICK_MS = 50;   // 20Hz
  private readonly BROADCAST_RADIUS_PX = 1500; // ~12 tiles — Claude's discretion

  onModuleInit(): void {
    setInterval(() => this.tick(), this.TICK_MS);
  }

  queueInput(playerId: string, payload: PixelMovePayload): void {
    this.pendingInputs.set(playerId, payload);
  }

  private tick(): void {
    const dirty: Array<{ playerId: string; px: number; py: number }> = [];

    for (const [playerId, input] of this.pendingInputs) {
      this.pendingInputs.delete(playerId);
      const player = this.playerService.getPlayerById(playerId);
      if (!player) continue;

      // dt for this tick
      const now = Date.now();
      const dt = Math.min((now - player.lastPxInputTime) / 1000, 0.2); // cap at 200ms
      player.lastPxInputTime = now;

      // Velocity from key bitmask
      const keyState = bitmaskToKeyState(input.keys);
      const { vx, vy } = velocityFromKeys(keyState, dt);

      // Speed validation against client-predicted position
      const valid = validatePixelSpeed(player.px, player.py, input.predictedPx, input.predictedPy, dt);
      if (!valid) {
        // Snap back — send correction
        this.server?.to(player.socketId).emit('positionCorrection', {
          px: player.px, py: player.py, sequence: input.sequence,
        });
        continue;
      }

      // Server-authoritative collision resolution
      const chunk = this.zonesService.getCachedChunk(player.position.zoneId);
      const isSolid = (tx: number, ty: number) => chunk?.collisions[ty]?.[tx] ?? false;
      const resolved = resolvePixelCollision(player.px, player.py, vx, vy, isSolid);

      player.px = resolved.px;
      player.py = resolved.py;
      dirty.push({ playerId, px: resolved.px, py: resolved.py });
    }

    if (dirty.length === 0) return;
    this.broadcastBatch(dirty);
  }
}
```

### Pattern 2: ConnectedPlayer Pixel State Extension

**What:** Add `px`, `py`, and `lastPxInputTime` to the `ConnectedPlayer` interface inside `PlayerService`. Initialise from tile-center on connect using `tileToPixelCenter`. Flush to tile integers using `pixelToTile` on disconnect before calling `updateCharacterPosition`.

**When to use:** Zero DB schema changes — the existing `characters.position` column stores tile `{x, y, zoneId}`. Conversion is one-way: tile → pixel on connect, pixel → tile on disconnect.

**Example:**
```typescript
// apps/game-server/src/game/player.service.ts
interface ConnectedPlayer extends Player {
  socketId: string;
  lastWorldPosition?: Position;
  // Phase 132: pixel movement state
  px: number;          // current pixel X in zone
  py: number;          // current pixel Y in zone
  lastPxInputTime: number;  // ms timestamp of last processed input
}

// On authenticate (after player is created):
const { px, py } = tileToPixelCenter(character.position.x, character.position.y);
player.px = px;
player.py = py;
player.lastPxInputTime = Date.now();

// On handleDisconnect (before updateCharacterPosition):
const { tileX, tileY } = pixelToTile(player.px, player.py);
await updateCharacterPosition(db, playerId, { x: tileX, y: tileY, zoneId: player.position.zoneId });
```

### Pattern 3: Proximity-Filtered Batch Broadcast

**What:** After each tick, for each dirty (moved) player, find all other players in the same zone whose pixel distance is within `BROADCAST_RADIUS_PX`, and include them in a single `positionBatch` event.

**When to use:** Scales better than zone-room broadcast because distant players don't receive irrelevant updates. Matches the locked decision.

**Example:**
```typescript
private broadcastBatch(dirty: Array<{ playerId: string; px: number; py: number }>): void {
  // Group dirty players by zone
  const byZone = new Map<string, typeof dirty>();
  for (const entry of dirty) {
    const player = this.playerService.getPlayerById(entry.playerId);
    if (!player) continue;
    const zoneId = player.position.zoneId;
    if (!byZone.has(zoneId)) byZone.set(zoneId, []);
    byZone.get(zoneId)!.push(entry);
  }

  // For each zone, for each online player, send them the subset within radius
  for (const [zoneId, movers] of byZone) {
    const observers = this.playerService.getPlayersInZone(zoneId);
    for (const observer of observers) {
      const observerPlayer = this.playerService.getPlayerById(observer.id);
      if (!observerPlayer) continue;

      const nearby = movers.filter(m => {
        if (m.playerId === observer.id) return false; // skip self (client uses own prediction)
        const moverPlayer = this.playerService.getPlayerById(m.playerId);
        if (!moverPlayer) return false;
        const dist = Math.hypot(m.px - observerPlayer.px, m.py - observerPlayer.py);
        return dist <= this.BROADCAST_RADIUS_PX;
      });

      if (nearby.length > 0) {
        this.server?.to(observerPlayer.socketId).emit('positionBatch', {
          updates: nearby.map(m => ({ playerId: m.playerId, px: m.px, py: m.py })),
        });
      }
    }
  }
}
```

### Pattern 4: bitmask to KeyState Adapter

**What:** The existing `velocityFromKeys(keys: KeyState, dt: number)` in `pixel-validation.ts` uses a struct `{ up, down, left, right }`. The payload uses a number bitmask. A small adapter function converts between them.

**When to use:** Required bridge between wire format and existing game-logic API.

**Example:**
```typescript
// Defined in movement.service.ts (or in pixel-validation.ts as an addition)
// Bitmask convention: W=1, A=2, S=4, D=8 (matches WASD)
export function bitmaskToKeyState(keys: number): KeyState {
  return {
    up:    !!(keys & 1),  // W
    left:  !!(keys & 2),  // A
    down:  !!(keys & 4),  // S
    right: !!(keys & 8),  // D
  };
}
```

### Anti-Patterns to Avoid

- **Processing input directly in the gateway handler:** The gateway should only queue inputs. Validation and physics in a WebSocket callback makes the tick irregular and couples throughput to client send rate.
- **Zone-room broadcast for positionBatch:** `server.to(zoneId).emit(...)` sends to all ~100+ players. The locked decision requires proximity filtering — individual socket emits are required.
- **Running `getChunk()` (async DB query) inside the tick loop:** The tick runs every 50ms; async I/O in the hot path will cause drift. Cache the collision map on first access (`zonesService.getCachedChunk()` or similar synchronous accessor) and reuse it. `ZonesService` already has an LRU cache; adding a synchronous `getZoneSync()` that returns the cached value without loading is safe.
- **Deleting `lastMoveTimes` too early:** The old `lastMoveTimes` map in `PlayerService` is read by `getLastMoveTime()` and written by `setLastMoveTime()` in the gateway. Both the old handler code and the old `minDelay` gate must be removed together or the old path silently short-circuits.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Speed validation | Custom distance formula | `validatePixelSpeed` from `@into-the-void/game-logic` | Already implemented, tested (Phase 131, 27 tests passing), includes 10% tolerance |
| Wall collision | Custom AABB | `resolvePixelCollision` from `@into-the-void/game-logic` | Already implemented with feet-anchor convention and wall-sliding |
| Tile ↔ pixel conversion | Inline math | `tileToPixelCenter` / `pixelToTile` from `@into-the-void/game-logic` | Canonical, tested, avoids off-by-half-tile bugs |
| Key-state to velocity | Custom velocity math | `velocityFromKeys` from `@into-the-void/game-logic` | Diagonal normalisation (MOVE-02) already correct |
| Tick loop | NestJS scheduler | `setInterval` in `onModuleInit()` | Project-wide convention (ZonesService, AiService use this exact pattern) |

**Key insight:** All the math was shipped in Phase 131 specifically for this phase to consume. Zero math needs to be re-implemented here.

---

## Common Pitfalls

### Pitfall 1: Async getChunk inside the 50ms tick

**What goes wrong:** `ZonesService.getChunk()` is an `async` method that may hit the DB on first load. Awaiting it inside `tick()` creates unpredictable latency and can make the tick loop drift far beyond 50ms.

**Why it happens:** The hot-path assumption that the chunk is always cached holds most of the time, but not for newly entered zones.

**How to avoid:** Add a synchronous `getZoneSync(zoneId: string): ZoneState | undefined` accessor to `ZonesService` that returns from the LRU cache without triggering a load. If the zone is not loaded, skip validation for that player this tick (treat as no-op). The zone will be loaded by the normal flow (zone enter event) before the next tick.

**Warning signs:** Tick processing time exceeds 50ms; `console.time('tick')` output is variable.

### Pitfall 2: dt clamping — large dt on first input after reconnect

**What goes wrong:** If a player was idle for several seconds, `dt = (now - lastPxInputTime) / 1000` could be 5+ seconds, making `validatePixelSpeed`'s `maxAllowed = PLAYER_SPEED_PX * dt * 1.1` enormous and effectively permitting teleportation.

**Why it happens:** `lastPxInputTime` is set at connect time but may be stale if the client was idle.

**How to avoid:** Cap `dt` to a maximum (e.g., `Math.min(dt, 0.2)` = 200ms). This limits the single-frame movement budget regardless of idle time. Already shown in the code example above.

**Warning signs:** Players can teleport large distances after reconnect or when first pressing a key.

### Pitfall 3: Old rate-limiter gate not fully removed

**What goes wrong:** The old `handleMove()` handler in `GameGateway` uses `lastMoveTimes` with a `minDelay` check. If this is not fully removed, the old and new handlers co-exist and the old gate may silently reject pixel move events, producing confusing partial behavior.

**Why it happens:** The old `@SubscribeMessage('player:move')` and the new `@SubscribeMessage('player:pixelMove')` are different event names, so they do not collide. However, the old event may still be subscribed to if not deleted, and the old move processing (tile-based) may still fire if the client still sends `player:move`.

**How to avoid:** Remove `handleMove()` entirely and delete the `lastMoveTimes` map from `PlayerService`. The new handler is on `player:pixelMove` (a distinct event). The client will be updated in Phase 134 to emit the new event.

**Warning signs:** Tile-based move broadcasts (`player:moved`) still fire; dual position state in logs.

### Pitfall 4: Self-loop in positionBatch broadcast

**What goes wrong:** The observer iterates dirty movers; if a player moved and is also checking their own update, they receive their own position back. This is at best wasteful and at worst confuses client-side prediction.

**Why it happens:** The dirty list includes all movers in the zone.

**How to avoid:** Filter `m.playerId === observer.id` from the nearby list (already shown in the code example). Client uses its own local prediction for self; server corrections come via `positionCorrection`, not `positionBatch`.

### Pitfall 5: ConnectedPlayer type pollution into shared-types

**What goes wrong:** Adding `px/py/lastPxInputTime` to the `Player` interface in `shared-types` (which the client also imports) leaks server-only state into the client bundle.

**Why it happens:** The `ConnectedPlayer` interface lives in `player.service.ts`, but a developer may be tempted to modify `Player` in `shared-types` instead.

**How to avoid:** `ConnectedPlayer` is a server-only interface that extends `Player` (from shared-types). Only `ConnectedPlayer` gains `px/py/lastPxInputTime`. `Player` and `PlayerPublic` in shared-types are not modified. The `PixelMovePayload` type is added to `ClientEvents` in shared-types (client needs it for type safety), but `PixelPosition` is already in shared-types from Phase 131.

---

## Code Examples

### PixelMovePayload type (shared-types addition)

```typescript
// packages/shared-types/src/network/events.ts
// Add to ClientEvents interface:
'player:pixelMove': {
  keys: number;           // bitmask: W=1, A=2, S=4, D=8
  predictedPx: number;    // client-predicted X after applying input
  predictedPy: number;    // client-predicted Y after applying input
  sequence: number;       // monotonically increasing counter per client
};

// Add to ServerEvents interface:
'positionBatch': {
  updates: Array<{ playerId: string; px: number; py: number }>;
};
'positionCorrection': {
  px: number;
  py: number;
  sequence: number;  // echoes the client's sequence for reconciliation
};
```

### Gateway handler (thin router)

```typescript
// apps/game-server/src/game/game.gateway.ts
@SubscribeMessage('player:pixelMove')
handlePixelMove(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { keys: number; predictedPx: number; predictedPy: number; sequence: number }
) {
  const player = this.playerService.getPlayerBySocket(client.id);
  if (!player) return;
  this.movementService.queueInput(player.id, data);
}
```

### ConnectedPlayer extension

```typescript
// apps/game-server/src/game/player.service.ts
interface ConnectedPlayer extends Player {
  socketId: string;
  lastWorldPosition?: Position;
  // Phase 132: pixel position (server-authoritative, in-memory only)
  px: number;
  py: number;
  lastPxInputTime: number;
}

// In authenticate(), after player object creation:
import { tileToPixelCenter } from '@into-the-void/game-logic';
const { px, py } = tileToPixelCenter(character.position.x, character.position.y);
player.px = px;
player.py = py;
player.lastPxInputTime = Date.now();

// In handleDisconnect(), replacing updateCharacterPosition call:
import { pixelToTile } from '@into-the-void/game-logic';
const { tileX, tileY } = pixelToTile(player.px, player.py);
await updateCharacterPosition(db, playerId, { x: tileX, y: tileY, zoneId: player.position.zoneId });
```

### Synchronous chunk accessor for tick loop

```typescript
// apps/game-server/src/zones/zones.service.ts  (ADD — does not replace getChunk)
/**
 * Returns the cached chunk synchronously, or undefined if not loaded.
 * Used by MovementService tick loop to avoid async in hot path.
 */
getChunkSync(zoneId: string): ChunkData | undefined {
  return this.zones.get(zoneId)?.chunk;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 140ms move-count rate limiter (`lastMoveTimes` + `minDelay`) | Velocity/distance validation via `validatePixelSpeed` + `resolvePixelCollision` | Phase 132 | Enables continuous pixel movement; eliminates game-feel penalty from tile-step delays |
| `player:move` with `{ direction: Direction }` | `player:pixelMove` with `PixelMovePayload` | Phase 132 | Wire format changes; old `player:move` handler removed |
| `player:moved` broadcast (immediate, per-move) | `positionBatch` at 20Hz (deferred, batched) | Phase 132 | Reduces per-player broadcast count from ~7 to 20 fixed tick rate |
| Tile-integer position in memory | Float px/py in memory, tile on disconnect | Phase 132 | Sub-tile precision; no DB schema change |

**Deprecated/outdated:**
- `PlayerService.lastMoveTimes` map: replaced by `lastPxInputTime` on `ConnectedPlayer`
- `PlayerService.getLastMoveTime()` / `setLastMoveTime()`: no longer needed
- `GameService.getMovementDelay()`: tile-based delay logic; not used by pixel movement
- `GameGateway.handleMove()` (`@SubscribeMessage('player:move')`): replaced by `handlePixelMove`

---

## Open Questions

1. **Proximity radius value (Claude's Discretion)**
   - What we know: ZONE_SIZE = 64 tiles × TILE_SIZE_PX 128 = 8192px per zone. Most zones have players spread across the zone.
   - What's unclear: The right balance between "too many updates" (high radius) and "pop-in" (low radius)
   - Recommendation: 1500px (~12 tiles) as starting value. This covers most tactical engagement ranges (AGGRO_RADIUS_PX = 512px, LEASH_RADIUS_PX = 1024px) with comfortable margin. Can be tuned post-Phase 134 when client rendering is in place.

2. **Speed multiplier for equipment stats (Claude's Discretion)**
   - What we know: `velocityFromKeys` and `validatePixelSpeed` both accept an optional `speedMultiplier` parameter.
   - What's unclear: How to read the equipped-item speed modifier in `MovementService` without adding heavy inventory dependency.
   - Recommendation: Default `speedMultiplier = 1.0` for Phase 132 (no equipment effects). Add a `getSpeedMultiplier(playerId)` method on `PlayerService` that reads from `InventoryService` in Phase 134 or later. This keeps Phase 132 scope tight.

3. **Spatial partitioning (Claude's Discretion)**
   - What we know: Zone capacity is moderate (soft limit ~10–50 players per zone at current scale).
   - What's unclear: Whether O(n²) proximity check per tick is a problem at current player counts.
   - Recommendation: Simple O(n²) nested loop for Phase 132. ZONE_SIZE = 64 tiles, realistically ≤50 players per zone → ≤2500 comparisons per tick. Negligible. Grid-cell partitioning (128px cells) deferred unless profiling reveals a problem.

---

## Sources

### Primary (HIGH confidence)

- Codebase — `packages/game-logic/src/movement/pixel-validation.ts` — `velocityFromKeys`, `resolvePixelCollision`, `validatePixelSpeed`, constants (`TILE_SIZE_PX=128`, `PLAYER_SPEED_PX=128`, `PLAYER_HITBOX=64x64`)
- Codebase — `packages/game-logic/src/movement/pixel-distance.ts` — `tileToPixelCenter`, `pixelToTile`, range constants
- Codebase — `apps/game-server/src/game/player.service.ts` — `ConnectedPlayer` interface, `handleDisconnect`, `updateCharacterPosition`, `lastMoveTimes` (to be removed)
- Codebase — `apps/game-server/src/game/game.gateway.ts` — `handleMove` (to be replaced), `@SubscribeMessage` pattern, zone-room broadcasting pattern
- Codebase — `apps/game-server/src/game/ai.service.ts` — `setInterval`-in-`onModuleInit` tick pattern (the project standard)
- Codebase — `apps/game-server/src/zones/zones.service.ts` — LRU chunk cache, `getChunk()`, `setInterval` in `onModuleInit`
- Codebase — `packages/shared-types/src/core/zone.ts` — `ChunkData.collisions: boolean[][]`, `ZONE_SIZE = 64`
- Codebase — `packages/shared-types/src/core/position.ts` — `PixelPosition` interface (already exists from Phase 131)
- Codebase — `packages/shared-types/src/network/events.ts` — `ClientEvents`, `ServerEvents` (to be extended)

### Secondary (MEDIUM confidence)

- `.planning/research/ARCHITECTURE.md` — prior architecture research with `PixelMovePayload` design and server authority pattern. Confirms payload field names and bitmask convention.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — everything is already in the codebase; no new libraries
- Architecture: HIGH — direct inspection of `PlayerService`, `GameGateway`, `AiService`, and `ZonesService` source
- Pitfalls: HIGH — identified from direct code reading (existing `lastMoveTimes`, async `getChunk`, `player.move` vs new event name)

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable project — no fast-moving external dependencies)
