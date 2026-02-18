# Phase 36: Creature AI Wander and Behavior Tick - Research

**Researched:** 2026-02-18
**Domain:** Game server feature — creature AI tick loop, behavior FSM, zone-scoped scheduling, client path blocking
**Confidence:** HIGH

## Summary

Phase 36 implements autonomous creature movement on the game server. Creatures wander idly each tick; herbivores additionally flee players who step within 5 tiles. The core design is already locked by prior research decisions: a self-rescheduling `setTimeout` pattern (setInterval rejected), scoped to zones with active players only, with a pure FSM function `tickCreatureAI()` living in `game-logic`. Creature position updates are batched per zone per tick and broadcast via the existing `entity:update` socket event. The client pathfinding controller already checks `entityStore` for entity-occupied tiles via `isWorldTileBlocked()`, so EBLK-03 (path stops when entity moves into path) is already functionally satisfied at path-start time; the remaining gap is mid-execution entity-move-onto-path detection.

The codebase entering Phase 36 is in excellent shape. `Creature` has `behavior: CreatureBehavior`, `position`, `active`, `health`, and `zoneId`. `ZonesService` already has `zones` LRU cache, `getZoneEntities()`, `updateEntity()`, and a respawn `setInterval` loop showing the tick pattern to emulate. `PlayerService.getPlayersInZone()` returns all active players for a given zone. `ZonesService` holds the chunk collision map inside each `ZoneState`, making walkability checking straightforward. No new npm packages are needed.

The main implementation work is: (1) a new `AiService` in `apps/game-server/src/game/` with the zone-scoped setTimeout loop, (2) a pure `tickCreatureAI()` function in `packages/game-logic/src/ai/`, (3) wiring `AiService` into `GameModule` with access to `PlayerService`, `ZonesService`, and the Socket.IO server, and (4) adding mid-execution entity blocking to `PathfindingController.executeNextStep()` on the client (EBLK-03 gap).

**Primary recommendation:** Build `AiService` as a NestJS `@Injectable()` that holds an `activeZones: Set<string>` updated when players join/leave zones. Each zone gets its own self-rescheduling setTimeout. The AI FSM is a pure function in game-logic that takes creature state + player positions + collision map and returns an optional new position. Batch all position changes per zone into one `server.to(zoneId).emit('entity:update', ...)` per moved creature (not one broadcast per zone since each creature needs its own entityId). EBLK-03 mid-execution gap is fixed by checking `isWorldTileBlocked` at each `executeNextStep` call, not only at path start.

## Standard Stack

### Core (all already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/common` | 10.4.22 | `@Injectable()`, `OnModuleInit`, DI | Project standard for all services |
| `socket.io` (via `Server`) | 4.x | Broadcasting `entity:update` to zone rooms | Already used in ZonesService for respawn broadcast |
| `@into-the-void/shared-types` | workspace | `Creature`, `Entity`, `Position`, `CreatureBehavior`, `ZONE_SIZE` | Project standard |
| `@into-the-void/game-logic` | workspace | Pure FSM function home; existing `validateMovement`, `DIRECTION_VECTORS` | Project standard |
| `lru-cache` | (already in ZonesService) | Zone state cache — no new dependency | Already installed |

### No New Dependencies Required
No npm packages need to be added. The AI tick uses native `setTimeout`. Socket.IO Server is injected from `GameGateway.afterInit()` the same way it is for `ZonesService`.

**Installation:** None required.

## Architecture Patterns

### Recommended Project Structure
```
apps/game-server/src/game/
├── ai.service.ts          # NEW: zone-scoped AI tick loop
├── entity.service.ts      # Existing: tool use / interaction
├── game.gateway.ts        # Existing: add notifyPlayerZoneChange() calls
├── game.module.ts         # Existing: add AiService to providers
└── player.service.ts      # Existing: expose zone-aware connect/disconnect hooks

packages/game-logic/src/
├── ai/
│   └── creature-ai.ts     # NEW: tickCreatureAI() pure FSM
└── index.ts               # Existing: add export for tickCreatureAI
```

### Pattern 1: Zone-Scoped Self-Rescheduling setTimeout (CRAI-01, CRAI-02)

**What:** Each active zone gets its own independent setTimeout loop. When the timer fires, the tick runs, duration is measured, and a new setTimeout is scheduled for `tickInterval - elapsed` (minimum 0) to prevent pile-up. When all players leave a zone, the zone is removed from `activeZones` and no further setTimeout is scheduled.

**When to use:** Any time a periodic server-side operation must be scoped per-zone, not global. Global setInterval blocks event loop when many zones are active.

**Why not setInterval:** setInterval fires at fixed wall-clock intervals regardless of how long the previous tick took. If a tick takes 400ms and the interval is 500ms, the next tick fires 100ms later — overlap risk. Self-rescheduling setTimeout guarantees at minimum `tickInterval` gap between ticks.

**Example:**
```typescript
// Source: pattern derived from ZonesService.onModuleInit() respawn loop (zones.service.ts:68)
// and locked v1.8 research decision (STATE.md)

@Injectable()
export class AiService implements OnModuleInit {
  private readonly AI_TICK_INTERVAL_MS = 1000; // 1 second between AI ticks
  private readonly AI_TICK_WARN_MS = 200;      // warn if tick takes > 200ms
  private activeZones = new Set<string>();
  private tickTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private server: Server | null = null;

  constructor(
    private readonly zonesService: ZonesService,
    private readonly playerService: PlayerService,
  ) {}

  onModuleInit(): void {
    // AiService starts with no active zones.
    // Zones are activated when players join (called from GameGateway).
  }

  setServer(server: Server): void {
    this.server = server;
  }

  /** Called by GameGateway when a player authenticates into a zone */
  activateZone(zoneId: string): void {
    if (this.activeZones.has(zoneId)) return; // already ticking
    this.activeZones.add(zoneId);
    this.scheduleNextTick(zoneId);
  }

  /** Called by GameGateway when last player leaves a zone */
  deactivateZone(zoneId: string): void {
    this.activeZones.delete(zoneId);
    const timer = this.tickTimers.get(zoneId);
    if (timer) {
      clearTimeout(timer);
      this.tickTimers.delete(zoneId);
    }
  }

  private scheduleNextTick(zoneId: string): void {
    const timer = setTimeout(async () => {
      this.tickTimers.delete(zoneId);
      if (!this.activeZones.has(zoneId)) return; // deactivated while waiting
      const start = Date.now();
      await this.runZoneTick(zoneId);
      const elapsed = Date.now() - start;
      if (elapsed > this.AI_TICK_WARN_MS) {
        console.warn(`[AiService] Zone ${zoneId} tick took ${elapsed}ms`);
      }
      // Re-schedule only if still active
      if (this.activeZones.has(zoneId)) {
        this.scheduleNextTick(zoneId);
      }
    }, this.AI_TICK_INTERVAL_MS);
    this.tickTimers.set(zoneId, timer);
  }

  private async runZoneTick(zoneId: string): Promise<void> {
    const entities = await this.zonesService.getZoneEntities(zoneId);
    const creatures = entities.filter(
      (e): e is Creature => e.type === 'creature' && e.active && e.health > 0
    );
    if (creatures.length === 0) return;

    const players = this.playerService.getPlayersInZone(zoneId);
    const chunk = await this.zonesService.getChunk(zoneId);
    const collisions = chunk.collisions;

    for (const creature of creatures) {
      const result = tickCreatureAI(creature, players, collisions);
      if (result.newPosition) {
        creature.position = result.newPosition;
        // zonesService.updateEntity updates in-memory state
        await this.zonesService.updateEntity(zoneId, creature.id, {
          position: result.newPosition,
        });
        // Broadcast to zone room
        this.server?.to(zoneId).emit('entity:update', {
          entityId: creature.id,
          changes: { position: result.newPosition },
        });
      }
    }
  }
}
```

### Pattern 2: Pure FSM in game-logic (CRAI-03, CRAI-04 through CRAI-07)

**What:** `tickCreatureAI()` takes immutable inputs (creature snapshot, player list, collision map) and returns `{ newPosition: Position | null }`. No side effects, fully unit-testable.

**Behavior states by type:**
- **herbivore**: If any player is within 5 tiles (Chebyshev distance), flee (move 1 tile away from nearest player). Otherwise, idle wander (25% chance to move to a random adjacent passable tile).
- **omnivore**: Idle wander only. Flee/aggro deferred to combat system.
- **predator**: Idle wander only. Aggro deferred.
- **maniac**: Idle wander only. Aggro deferred.

**Flee direction algorithm for herbivores:** Find nearest player. Compute dx = creature.x - player.x, dy = creature.y - player.y. Normalize to ±1 per axis. Try that tile; if blocked, try adjacent cardinal directions; if all blocked, skip movement. This is deterministic and event-loop-safe.

**Wander algorithm:** Pick a random cardinal or diagonal direction. Check the target tile against the collision map. If passable and within zone bounds (0..ZONE_SIZE-1), move there. If blocked, stay.

**Example:**
```typescript
// Source: pattern derived from DIRECTION_VECTORS in movement/validation.ts
// and game-logic pure function conventions (all functions in this package are pure)

export interface AiTickResult {
  newPosition: Position | null; // null = creature did not move
}

export function tickCreatureAI(
  creature: Creature,
  players: PlayerPublic[],
  collisionMap: boolean[][],
): AiTickResult {
  if (!creature.active || creature.health <= 0) {
    return { newPosition: null };
  }

  switch (creature.behavior) {
    case 'herbivore':
      return tickHerbivore(creature, players, collisionMap);
    case 'omnivore':
    case 'predator':
    case 'maniac':
      return tickWander(creature, collisionMap);
  }
}

function tickHerbivore(
  creature: Creature,
  players: PlayerPublic[],
  collisionMap: boolean[][],
): AiTickResult {
  const FLEE_RADIUS = 5;
  const nearestPlayer = players
    .map(p => ({
      player: p,
      dist: chebyshevDistance(creature.position.x, creature.position.y, p.position.x, p.position.y),
    }))
    .filter(({ dist }) => dist <= FLEE_RADIUS)
    .sort((a, b) => a.dist - b.dist)[0];

  if (nearestPlayer) {
    return flee(creature, nearestPlayer.player, collisionMap);
  }
  return tickWander(creature, collisionMap);
}

function flee(creature: Creature, player: PlayerPublic, collisionMap: boolean[][]): AiTickResult {
  // Move away from player
  const rawDx = creature.position.x - player.position.x;
  const rawDy = creature.position.y - player.position.y;
  const dx = rawDx === 0 ? 0 : rawDx > 0 ? 1 : -1;
  const dy = rawDy === 0 ? 0 : rawDy > 0 ? 1 : -1;

  // Attempt flee direction, then fallback cardinal axes
  const attempts = [
    { dx, dy },
    { dx, dy: 0 },
    { dx: 0, dy },
    { dx: -dx, dy: 0 }, // last-resort reversals
    { dx: 0, dy: -dy },
  ];

  for (const { dx: fdx, dy: fdy } of attempts) {
    if (fdx === 0 && fdy === 0) continue;
    const nx = creature.position.x + fdx;
    const ny = creature.position.y + fdy;
    if (
      nx >= 0 && nx < ZONE_SIZE &&
      ny >= 0 && ny < ZONE_SIZE &&
      !collisionMap[ny]?.[nx]
    ) {
      return { newPosition: { ...creature.position, x: nx, y: ny } };
    }
  }
  return { newPosition: null }; // cornered, stay
}

function tickWander(creature: Creature, collisionMap: boolean[][]): AiTickResult {
  const WANDER_CHANCE = 0.25; // 25% chance to move per tick
  if (Math.random() > WANDER_CHANCE) return { newPosition: null };

  // 8 directions: use existing DIRECTION_VECTORS
  const dirs = Object.values(DIRECTION_VECTORS);
  const shuffled = dirs.sort(() => Math.random() - 0.5);

  for (const { dx, dy } of shuffled) {
    const nx = creature.position.x + dx;
    const ny = creature.position.y + dy;
    if (
      nx >= 0 && nx < ZONE_SIZE &&
      ny >= 0 && ny < ZONE_SIZE &&
      !collisionMap[ny]?.[nx]
    ) {
      return { newPosition: { ...creature.position, x: nx, y: ny } };
    }
  }
  return { newPosition: null };
}
```

### Pattern 3: Zone Activation Tracking

**What:** `AiService.activeZones` must be updated when players connect/disconnect. This requires hooking into `GameGateway` connect and disconnect handlers. The gateway already calls `playerService.authenticate()` and `playerService.handleDisconnect()`. Add `aiService.activateZone(zoneId)` after auth success and `aiService.deactivateZone(zoneId)` after last player leaves.

**Critical:** "Last player leaves" means the zone should only be deactivated when `playerService.getPlayersInZone(zoneId).length === 0`. A player leaving a zone but remaining in an adjacent zone still needs AI ticking in the first zone if another player is there.

**How to count active zones:** After each disconnect, check if `getPlayersInZone(zoneId).length === 0`; if so, call `aiService.deactivateZone(zoneId)`. After zone transition, check both old and new zones.

### Pattern 4: EBLK-03 Mid-Execution Entity Blocking

**What:** When `PathfindingController.executeNextStep()` fires for the next tile, it must check whether that tile is now occupied by a creature (which may have moved since path was computed). If blocked, cancel the path.

**Current state:** `isWorldTileBlocked()` in `WorldScene` already queries `entityStore.getEntityAtPosition()`. The pathfinding controller uses it at path-start time (`startPath`). The gap is `executeNextStep` does not re-check before each step.

**Fix:** In `executeNextStep()`, before calling `this.movementController.processInput(direction)`, call `this.collisionAccessor?.(next.x, next.y)`. If blocked, `cancelPath()` and return. The collision accessor is already stored as a field after `startPath`.

**Example:**
```typescript
// Source: PathfindingController.ts (apps/web/src/game/systems/PathfindingController.ts)
// Addition to executeNextStep() before processInput

private executeNextStep(): void {
  if (this.pathIndex >= this.currentPath.length) {
    this.clearPathGraphics();
    this.currentPath = [];
    this.pathIndex = 0;
    return;
  }

  const player = useGameStore.getState().player;
  if (!player) {
    this.cancelPath();
    return;
  }

  const currentWorld = positionToWorld(player.position);
  const next = this.currentPath[this.pathIndex];

  // EBLK-03: Re-check if next tile is now blocked (entity may have moved into it)
  if (this.isBlocked && this.isBlocked(next.x, next.y)) {
    this.cancelPath();
    return;
  }

  const direction = this.getDirection(currentWorld, next);
  // ... rest of method unchanged
}
```

This requires storing the `isBlocked` accessor as a class field when `startPath` is called.

### Anti-Patterns to Avoid

- **Global setInterval for all zones:** One `setInterval` that loops over all zones blocks the event loop if any zone has many creatures. One timer per zone (self-rescheduling setTimeout) lets each tick complete before scheduling the next.
- **Async-inside-setInterval:** If AI tick is async (awaits DB/zone operations), using setInterval can cause concurrent tick execution. Self-rescheduling setTimeout prevents this — next tick is scheduled only after the current tick resolves.
- **Modifying creature position in game-logic:** The FSM must be pure. Only `AiService.runZoneTick()` should mutate state and emit socket events. `tickCreatureAI()` must only compute and return.
- **Spawning creatures at zone-boundary tiles for wander:** Zone-boundary wander (creature moves from z_0_0 to z_1_0) is NOT required. Phase 36 wander is intra-zone only. Cross-zone creature movement deferred.
- **Emitting one batched array per zone instead of per-creature updates:** `entity:update` event signature is `{ entityId, changes }` — one entity per event. Batching all creatures into one event would require a new event type. Use individual `entity:update` per moved creature.
- **Running AI tick in zones with no creatures:** Short-circuit `runZoneTick()` immediately if no active creatures exist (guard at top of method).
- **Blocking AiService on DB calls:** `ZonesService.getZoneEntities()` and `getChunk()` are async but hit the in-memory LRU cache if zone is loaded (which it will be since players are present). Still await them; just know they're fast for active zones.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chebyshev distance for flee radius | Custom distance function | `chebyshevDistance` from `@into-the-void/game-logic` | Already exported, tested, used in PathfindingController |
| Zone coordinate parsing | String split boilerplate | Follow `ZonesService` pattern: `const [, x, y] = zoneId.split('_').map(Number)` | Consistent with rest of codebase |
| Collision map lookup | Re-implement blocked check | `collisionMap[ny]?.[nx]` optional-chain pattern from validation.ts | Handles boundary gracefully |
| Direction vectors | New dx/dy table | `DIRECTION_VECTORS` from `@into-the-void/game-logic` (movement/validation.ts) | Already exported and accurate |
| Zone-to-player mapping | Custom registry | `playerService.getPlayersInZone(zoneId)` | Already implemented with correct filtering |
| Socket.IO server reference | New injection pattern | Follow `ZonesService.setServer(server)` pattern, called from `GameGateway.afterInit()` | Already established pattern |

**Key insight:** The codebase already provides every utility needed for creature AI computation. The only genuinely new logic is the behavior FSM and the zone activation/deactivation lifecycle.

## Common Pitfalls

### Pitfall 1: Zone Deactivation Race Condition
**What goes wrong:** A zone is deactivated while the async tick is mid-execution. The tick completes and schedules another setTimeout even though the zone is no longer active.
**Why it happens:** `deactivateZone()` removes from `activeZones` but the in-flight async tick already captured a reference and will re-schedule.
**How to avoid:** Guard in `scheduleNextTick`: check `this.activeZones.has(zoneId)` AFTER the tick completes, before calling `scheduleNextTick()` again (already shown in Pattern 1 example). The `if (this.activeZones.has(zoneId))` check before re-scheduling is critical.
**Warning signs:** Zone AI keeps ticking after all players disconnected; server emitting `entity:update` to empty rooms.

### Pitfall 2: Creature Wander Into Wall
**What goes wrong:** Creature teleports into a blocked tile due to incorrect collision map indexing.
**Why it happens:** Collision map is indexed `[y][x]` (row-major). Using `collisionMap[x][y]` silently works for square zones but returns wrong tile.
**How to avoid:** Always use `collisionMap[ny]?.[nx]` with optional chaining. Write a unit test that places a creature adjacent to a wall and verifies it never moves there.
**Warning signs:** Creatures appearing on wall tiles; client rendering entity at unexpected positions.

### Pitfall 3: Multiple AiService Timer Registrations
**What goes wrong:** `activateZone(zoneId)` is called multiple times (e.g., second player joins already-active zone), creating two parallel timer loops for the same zone.
**Why it happens:** Missing early-return guard in `activateZone`.
**How to avoid:** Guard: `if (this.activeZones.has(zoneId)) return;` at top of `activateZone`. Already shown in Pattern 1.
**Warning signs:** AI tick fires twice per interval; double entity:update emissions.

### Pitfall 4: AiService Not Receiving Server Reference Before First Tick
**What goes wrong:** `AiService` tries to call `this.server?.to(...)` but server is null because `GameGateway.afterInit()` hasn't run yet when the first player authenticates.
**Why it happens:** If a player connects before `afterInit()` completes (unlikely but possible in test), `activateZone` runs and the tick fires before `setServer()` is called.
**How to avoid:** Use optional chaining `this.server?.to(...)` so null server is a no-op. In practice, `afterInit()` fires synchronously during WebSocket server bootstrap, before any connection is possible.
**Warning signs:** No entity:update events on first zone load despite creatures being active.

### Pitfall 5: Creature Wanders Across Zone Boundary
**What goes wrong:** Creature at tile x=0 chooses direction `w` (dx=-1), producing x=-1, which fails bounds check and creature stays. OR: the bounds check is missing and creature gets negative coordinates.
**Why it happens:** DIRECTION_VECTORS includes diagonal moves. A creature at x=0 trying to go nw (dx=-1, dy=-1) should be rejected.
**How to avoid:** Bounds check `nx >= 0 && nx < ZONE_SIZE && ny >= 0 && ny < ZONE_SIZE` in both `tickWander` and `flee`. Cross-zone creature movement is explicitly deferred.
**Warning signs:** Creatures with negative or ZONE_SIZE+ position values appearing in entity:update events.

### Pitfall 6: EBLK-03 Not Cancelling Mid-Path When Creature Moves In
**What goes wrong:** Player starts path to tile (10, 5). A creature wanders to (7, 5) at tick T. Player's path continues walking through (7, 5) because `executeNextStep` doesn't re-check blocked state.
**Why it happens:** Blocking check only happens at path creation (`startPath`), not at each step execution.
**How to avoid:** Store `isBlocked` accessor as `PathfindingController` class field (assigned in `startPath`). Check it in `executeNextStep` before each step. See Pattern 4.
**Warning signs:** Player walks "through" creature visually; creature and player share same tile.

### Pitfall 7: Tick Duration Measurement Missing
**What goes wrong:** The requirement CRAI-02 requires tick duration logging with a warning threshold. If not added, performance regressions are invisible.
**How to avoid:** Always wrap `runZoneTick()` in `const start = Date.now(); await ...; const elapsed = Date.now() - start; if (elapsed > threshold) console.warn(...)`. Already shown in Pattern 1.

## Code Examples

### Registering AiService in GameModule
```typescript
// Source: apps/game-server/src/game/game.module.ts (pattern)
// Add AiService to providers and exports

import { AiService } from './ai.service';

@Module({
  imports: [ConfigModule, JwtModule.registerAsync(...), ZonesModule],
  providers: [GameGateway, GameService, PlayerService, InventoryService, StorageService, EntityService, AiService],
  exports: [GameService, PlayerService, InventoryService, StorageService, EntityService, AiService],
})
export class GameModule {}
```

### Hooking into GameGateway.afterInit()
```typescript
// Source: apps/game-server/src/game/game.gateway.ts — afterInit() pattern
// Add AiService injection and server wiring

afterInit(server: Server) {
  this.zonesService.setServer(server);
  this.aiService.setServer(server);  // NEW: wire server to AiService
  console.log('[GameGateway] WebSocket server initialized');
}
```

### Hooking into Player Connect/Disconnect
```typescript
// In handleAuth() after auth success:
this.aiService.activateZone(result.player.position.zoneId);

// In handleDisconnect():
const player = this.playerService.getPlayerBySocket(client.id);
const zoneId = player?.position.zoneId;
await this.playerService.handleDisconnect(client.id);
// Deactivate zone if no players remain
if (zoneId && this.playerService.getPlayersInZone(zoneId).length === 0) {
  this.aiService.deactivateZone(zoneId);
}

// On zone transition in handleMove():
// Deactivate old zone if empty, activate new zone
if (result.oldZoneId && this.playerService.getPlayersInZone(result.oldZoneId).length === 0) {
  this.aiService.deactivateZone(result.oldZoneId);
}
this.aiService.activateZone(result.newZoneId);
```

### Exporting tickCreatureAI from game-logic
```typescript
// Source: packages/game-logic/src/index.ts
// Add to exports:
export * from './ai/creature-ai';
```

### Client: Storing isBlocked in PathfindingController
```typescript
// Source: apps/web/src/game/systems/PathfindingController.ts
// Add class field:
private isBlocked: CollisionAccessor | null = null;

// In startPath():
this.isBlocked = isBlocked;

// In cancelPath():
// (isBlocked stays valid — it's a pure function reference, no cleanup needed)
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Global setInterval for all zones | Self-rescheduling setTimeout per zone | Each zone tick completes before next schedules; no pile-up across many active zones |
| Behavior logic in service layer | Pure FSM in game-logic package | Fully unit-testable; game-logic is the single source of behavioral truth |
| Entity position encoded in entity ID | Entity position as mutable `position` field on Creature | AI can update creature.position without re-spawning; entity:update carries new position |

**Not applicable in this codebase:**
- `@nestjs/schedule` (CronJob, Interval decorator) — rejected per prior research; it uses setInterval internally and doesn't give per-zone granularity without custom wrapper.

## Open Questions

1. **Herbivore flee at zone boundary: what happens when flee direction points cross-zone?**
   - What we know: Zone-boundary creature movement is explicitly deferred.
   - What's unclear: Should flee clip to zone bounds (creature bumps into invisible wall) or pick a non-crossing flee direction?
   - Recommendation: Clip to zone bounds — the `nx >= 0 && nx < ZONE_SIZE` bounds check naturally prevents cross-zone movement. The creature simply can't flee that direction and tries adjacent options.

2. **AI tick interval: how fast should creatures move?**
   - What we know: Player movement is 500ms per tile (MOVE_DELAY_MS). An AI tick of 1000ms means creatures move at most every 1 second (half player speed).
   - What's unclear: The requirements don't specify exact interval.
   - Recommendation: Start with 1000ms interval, which makes creatures clearly slower than players. Configurable via environment variable for future tuning.

3. **Should creatures be blocked from tiles occupied by other creatures?**
   - What we know: `entityStore.getEntityAtPosition()` is used by player pathfinding to block creature tiles. Server collision map does not include creature positions.
   - What's unclear: When a creature tries to wander, should it also check other creature positions on the server?
   - Recommendation: No — v1.8 scope only adds terrain blocking. Creature-to-creature collision would require server-side entity position lookup per wander attempt. Defer until creature combat in a future phase. Two creatures sharing a tile is visually unusual but not game-breaking.

4. **Perception gating (CRAI-09 / STATE.md broadcast model decision)?**
   - What we know: The finalization of the perception gating model (relaxed zone-room broadcast vs. strict per-player filtering) is listed as needing finalization before Phase 36 implementation.
   - What's unclear: The STATE.md says "finalize before Phase 36 AI broadcast implementation" but CRAI-09 is mapped to Phase 38, not Phase 36.
   - Recommendation: Use relaxed zone-room broadcast for Phase 36 (all players in zone receive all entity:update events, including creature positions). Per-player filtering is Phase 38 work. This matches the existing broadcast model for all other events (`server.to(zoneId).emit(...)`).

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `apps/game-server/src/zones/zones.service.ts` — respawn setInterval pattern, ZoneState structure, getZoneEntities(), getChunk(), updateEntity(), setServer() pattern
- Codebase inspection — `apps/game-server/src/game/player.service.ts` — getPlayersInZone(), getAllOnlinePlayers(), player position tracking
- Codebase inspection — `apps/game-server/src/game/game.gateway.ts` — afterInit() server wiring, handleDisconnect() pattern, player zone change in handleMove()
- Codebase inspection — `packages/shared-types/src/core/entity.ts` — Creature interface with behavior, position, health, active fields
- Codebase inspection — `packages/shared-types/src/network/events.ts` — entity:update event signature `{ entityId, changes: Partial<Entity> }`
- Codebase inspection — `packages/game-logic/src/movement/validation.ts` — DIRECTION_VECTORS, validateMovement, ZONE_SIZE usage
- Codebase inspection — `packages/game-logic/src/movement/pathfinding.ts` — chebyshevDistance export
- Codebase inspection — `apps/web/src/game/systems/PathfindingController.ts` — executeNextStep, isWorldTileBlocked accessor, startPath, cancelPath
- Codebase inspection — `apps/web/src/game/scenes/WorldScene.ts:1330-1355` — isWorldTileBlocked checks entityStore, entity blocking already in path accessor
- Codebase inspection — `apps/web/src/store/entityStore.ts` — updateEntity handler for entity:update, getEntityAtPosition
- Codebase inspection — `.planning/STATE.md` — locked decisions: setTimeout not setInterval, activePlayerZones scoping, relaxed zone-room broadcast model
- Codebase inspection — `.planning/REQUIREMENTS.md` — CRAI-01 through CRAI-08, EBLK-03 requirements

### Secondary (MEDIUM confidence)
- Lore: `lore/world-bible.md` — creature behavior descriptions confirm: herbivores flee, omnivores are conditional, predators calculated, maniacs unrestricted (but all aggro deferred in v1.8)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed present in lockfile and imports; no new dependencies needed
- Architecture: HIGH — AiService pattern derived directly from ZonesService respawn loop and STATE.md locked decisions; no speculation
- Pitfalls: HIGH — each pitfall identified from code inspection (concrete code paths that would fail) not from general knowledge
- EBLK-03 gap: HIGH — confirmed by reading PathfindingController.executeNextStep() and isWorldTileBlocked(); the gap is real and the fix is minimal

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable domain — NestJS, Socket.IO, game logic patterns do not change rapidly; codebase is the primary dependency)
