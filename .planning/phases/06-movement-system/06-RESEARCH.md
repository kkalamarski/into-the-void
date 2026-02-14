# Phase 6: Movement System - Research

**Researched:** 2026-02-14
**Domain:** Client-side prediction, server reconciliation, real-time multiplayer movement
**Confidence:** HIGH

## Summary

This phase implements responsive player movement for a grid-based multiplayer game using Phaser 3 and Socket.IO. The core challenge is providing instant visual feedback (client-side prediction) while maintaining server authority for validation (server reconciliation). The codebase already has essential foundations: movement validation logic in `@into-the-void/game-logic`, A* pathfinding implementation, Socket.IO event infrastructure, and Phaser 3 WorldScene with WASD input handling.

The research confirms the standard approach is input sequence numbers + client prediction + server reconciliation. The client immediately applies movement locally, sends the input to the server with a sequence number, and when the server responds with authoritative state, the client reconciles by replaying unacknowledged inputs.

**Primary recommendation:** Use Gabriel Gambetta's client-side prediction pattern with sequence numbers, apply movement locally in Phaser update loop, validate on server using existing `game-logic` package, and reconcile mismatches by replaying pending inputs.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | Already installed | Client-side game rendering and input | Industry standard for 2D HTML5 games, built-in tweening for smooth movement |
| Socket.IO | Already installed | Real-time client-server communication | Established pattern for game networking, connection recovery built-in |
| @into-the-void/game-logic | Internal package | Movement validation, pathfinding (A*) | Already contains `validateMovement`, `calculateNewPosition`, `findPath` |
| @into-the-void/shared-types | Internal package | Type-safe event contracts | Already defines `ClientEvents['player:move']` and `ServerEvents['player:moved']` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | N/A | No additional libraries needed | Existing stack covers all requirements |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Socket.IO | WebRTC DataChannels | Lower latency but more complex, no automatic reconnection |
| Custom prediction | Physics engine (Matter.js) | Overkill for grid-based movement, adds complexity |
| Client prediction | Server-only movement | Simpler but 100-200ms input lag makes game unresponsive |

**Installation:**
No new packages required. All dependencies already in place.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── game/
│   ├── scenes/
│   │   └── WorldScene.ts           # WASD input, local prediction, tween animations
│   ├── systems/
│   │   ├── MovementController.ts   # Client prediction + reconciliation logic
│   │   └── PathfindingController.ts # Click-to-move A* path execution
│   └── rendering/
│       └── TileRenderer.ts         # (exists) Tile rendering
├── network/
│   └── socket.ts                    # (exists) Socket event emission/handling
└── store/
    └── gameStore.ts                 # (exists) Zustand state for player position

apps/game-server/src/
├── game/
│   ├── game.gateway.ts              # (exists) 'player:move' handler with rate limiting
│   ├── game.service.ts              # (exists) Movement validation with game-logic
│   └── player.service.ts            # Add input sequence tracking per player
```

### Pattern 1: Client-Side Prediction with Sequence Numbers
**What:** Client immediately applies input locally and assigns sequence number, sends to server, stores pending inputs
**When to use:** Every movement action (WASD, click-to-move)
**Example:**
```typescript
// Client-side (MovementController.ts)
// Source: Gabriel Gambetta - https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html
class MovementController {
  private pendingInputs: Array<{ sequence: number; direction: Direction; timestamp: number }> = [];
  private inputSequence = 0;

  processInput(direction: Direction) {
    // Increment sequence for this input
    this.inputSequence++;

    // Apply input locally (client prediction)
    const input = {
      sequence: this.inputSequence,
      direction,
      timestamp: Date.now()
    };
    this.applyInput(input);

    // Store for potential reconciliation
    this.pendingInputs.push(input);

    // Send to server
    gameSocket.emit('player:move', {
      direction,
      sequence: this.inputSequence
    });
  }

  applyInput(input: { direction: Direction }) {
    // Use existing game-logic to calculate new position
    const currentPos = useGameStore.getState().player?.position;
    if (!currentPos) return;

    const newPos = calculateNewPosition(currentPos, input.direction);

    // Update local state immediately (prediction)
    useGameStore.getState().setPlayer({
      ...useGameStore.getState().player!,
      position: newPos
    });

    // Update Phaser sprite
    worldScene.updateLocalPlayer(newPos);
  }
}
```

### Pattern 2: Server Reconciliation
**What:** Server sends authoritative position + last processed sequence number, client replays unacknowledged inputs
**When to use:** When receiving `player:moved` or `zone:state` from server
**Example:**
```typescript
// Client-side reconciliation
gameSocket.on('player:moved', (data: { playerId: string; position: Position; lastProcessedInput: number }) => {
  if (data.playerId !== myPlayerId) {
    // Other player moved - just update their sprite
    worldScene.movePlayer(data.playerId, data.position);
    return;
  }

  // Server processed our movement
  // 1. Discard acknowledged inputs
  this.pendingInputs = this.pendingInputs.filter(
    input => input.sequence > data.lastProcessedInput
  );

  // 2. Set position to server's authoritative state
  let reconciledPosition = data.position;

  // 3. Replay pending inputs
  for (const input of this.pendingInputs) {
    reconciledPosition = calculateNewPosition(reconciledPosition, input.direction);
  }

  // 4. Update client state to reconciled position
  useGameStore.getState().setPlayer({
    ...useGameStore.getState().player!,
    position: reconciledPosition
  });
  worldScene.updateLocalPlayer(reconciledPosition);
});
```

### Pattern 3: WASD Input Handling (Polling in Update Loop)
**What:** Poll keyboard state in Phaser update loop, debounce movement with timer
**When to use:** Continuous WASD movement
**Example:**
```typescript
// WorldScene.ts - already partially implemented
private handleInput(time: number): void {
  if (!this.localPlayer || time - this.lastMoveTime < this.moveDelay) return;

  let direction: Direction | null = null;

  // Poll keyboard state (existing pattern in WorldScene)
  if (this.cursors?.up.isDown || this.wasd?.W.isDown) direction = 'n';
  else if (this.cursors?.down.isDown || this.wasd?.S.isDown) direction = 's';
  else if (this.cursors?.left.isDown || this.wasd?.A.isDown) direction = 'w';
  else if (this.cursors?.right.isDown || this.wasd?.D.isDown) direction = 'e';

  if (direction) {
    this.lastMoveTime = time;
    this.movementController.processInput(direction); // Client prediction
  }
}
```

### Pattern 4: Click-to-Move with A* Pathfinding
**What:** Calculate path using existing A* algorithm, execute step-by-step with client prediction
**When to use:** When player clicks on a tile
**Example:**
```typescript
// PathfindingController.ts
class PathfindingController {
  private currentPath: Array<{ x: number; y: number }> = [];
  private pathIndex = 0;

  startPathfinding(targetX: number, targetY: number, collisionMap: boolean[][]) {
    const currentPos = useGameStore.getState().player?.position;
    if (!currentPos) return;

    // Use existing A* from game-logic
    const path = findPath(
      currentPos.x, currentPos.y,
      targetX, targetY,
      collisionMap
    );

    if (path) {
      this.currentPath = path;
      this.pathIndex = 1; // Skip current position
      this.executeNextStep();
    }
  }

  executeNextStep() {
    if (this.pathIndex >= this.currentPath.length) {
      this.currentPath = [];
      return;
    }

    const next = this.currentPath[this.pathIndex];
    const current = useGameStore.getState().player?.position;
    if (!current) return;

    // Calculate direction to next tile
    const direction = this.getDirectionTo(current, next);

    // Use same prediction system as WASD
    this.movementController.processInput(direction);

    this.pathIndex++;

    // Continue path after movement delay
    setTimeout(() => this.executeNextStep(), 150);
  }
}
```

### Pattern 5: Smooth Movement with Phaser Tweens
**What:** Interpolate sprite position between tiles for smooth visual movement
**When to use:** When updating player sprite position (both local and remote players)
**Example:**
```typescript
// WorldScene.ts - already has tween for other players (line 347-353)
movePlayer(playerId: string, position: Position): void {
  const sprite = this.playerSprites.get(playerId);
  if (sprite) {
    this.tweens.add({
      targets: sprite,
      x: position.x * TILE_SIZE + TILE_SIZE / 2,
      y: position.y * TILE_SIZE + TILE_SIZE / 2,
      duration: 100, // Short duration for grid movement
      ease: 'Linear',
    });
  }
}

// For local player prediction, use immediate update (no tween)
// to avoid lag feel, but tween when reconciling server corrections
updateLocalPlayer(position: Position, reconciling = false): void {
  if (!this.localPlayer) return;

  const targetX = position.x * TILE_SIZE + TILE_SIZE / 2;
  const targetY = position.y * TILE_SIZE + TILE_SIZE / 2;

  if (reconciling && (this.localPlayer.x !== targetX || this.localPlayer.y !== targetY)) {
    // Server correction - tween to correct position
    this.tweens.add({
      targets: this.localPlayer,
      x: targetX,
      y: targetY,
      duration: 50, // Fast correction
      ease: 'Cubic.easeOut',
    });
  } else {
    // Prediction - instant update for responsiveness
    this.localPlayer.x = targetX;
    this.localPlayer.y = targetY;
  }
}
```

### Anti-Patterns to Avoid
- **Waiting for server response before moving sprite:** Creates 100-200ms input lag, makes game feel unresponsive
- **No sequence numbers:** Cannot reconcile - client and server drift apart, teleporting corrections
- **Replaying ALL inputs on reconciliation:** Only replay inputs the server hasn't processed yet
- **Using physics engine for grid movement:** Adds complexity, collision bugs, unnecessary for tile-based game
- **Event-driven keyboard input:** Holding key doesn't produce continuous movement, use polling in update loop
- **Sending movement on every frame:** Rate limit to movement speed (e.g., 150ms between moves)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| A* pathfinding | Custom pathfinding algorithm | `@into-the-void/game-logic/pathfinding` (already exists) | Edge cases: diagonal movement, obstacles, performance, already has Manhattan distance heuristic |
| Movement validation | Custom collision checks | `@into-the-void/game-logic/movement/validation` (already exists) | Handles zone transitions, bounds checking, collision map lookup |
| Position calculation | Manual x/y arithmetic with zone wrapping | `calculateNewPosition()` from game-logic | Zone boundary transitions are complex, already handles 8 directions |
| Smooth sprite movement | Manual lerp in update loop | Phaser Tweens API | Frame-rate independent, easing functions, automatic cleanup |
| Rate limiting | Custom debounce/throttle | Movement delay timer (150ms) + server-side rate limiter | Client-side timer for UX, server validates timing to prevent speedhacks |

**Key insight:** Grid-based movement has many edge cases (zone transitions, diagonal movement, collision detection). The existing `game-logic` package handles these correctly. Reimplementing introduces bugs and wastes time.

## Common Pitfalls

### Pitfall 1: Prediction Without Reconciliation
**What goes wrong:** Client predicts movement but never reconciles with server → client and server positions diverge, player teleports when server correction arrives
**Why it happens:** Implementing half of the pattern, forgetting to handle server responses
**How to avoid:** Always pair client prediction with reconciliation logic that handles `player:moved` events
**Warning signs:** Player position jumps/teleports occasionally, especially with packet loss or high latency

### Pitfall 2: No Input Sequence Numbers
**What goes wrong:** Server sends authoritative position, client sets it directly → loses all pending inputs the server hasn't processed yet → stuttering movement
**Why it happens:** Not understanding that server is always "behind" the client by RTT latency
**How to avoid:** Attach sequence numbers to every input, server echoes last processed sequence, client replays newer inputs
**Warning signs:** Movement stutters when receiving server updates, feels like "rubber banding"

### Pitfall 3: Zone Transitions Break Prediction
**What goes wrong:** Client predicts movement to adjacent zone, server hasn't sent new zone state yet → client tries to reconcile with wrong zone data → position errors
**Why it happens:** Zone transitions require server to send `zone:state` event, which takes longer than `player:moved`
**How to avoid:** When prediction crosses zone boundary, wait for server's `zone:state` before allowing more movement, or handle zone transition as special case
**Warning signs:** Player gets stuck at zone edges, position resets when entering new zone

### Pitfall 4: Click-to-Move Conflicts with WASD
**What goes wrong:** Player clicks to pathfind while also pressing WASD → inputs interfere, path execution interrupted mid-step
**Why it happens:** Two input sources modifying same movement state
**How to avoid:** Cancel active pathfinding when WASD input detected, or lock WASD during pathfinding
**Warning signs:** Path execution stops randomly, player moves in unexpected directions

### Pitfall 5: No Server-Side Rate Limiting
**What goes wrong:** Malicious/buggy client spams movement events → server DoS, other players lag
**Why it happens:** Trusting client to enforce movement speed
**How to avoid:** Server tracks last move timestamp per player, rejects moves faster than allowed speed (150ms), use Socket.IO rate limiter
**Warning signs:** Server CPU spikes with many players, movement events saturate bandwidth

### Pitfall 6: Collision Map Out of Sync
**What goes wrong:** Client uses stale collision map for prediction → predicts valid move, server rejects → constant reconciliation corrections
**Why it happens:** Zone state updates don't refresh client's collision map, or chunk loading timing issues
**How to avoid:** Update client collision map whenever receiving `zone:state` or `zone:chunk` events, ensure collision map loaded before allowing movement
**Warning signs:** Player movement frequently corrected by server, feels like walking into invisible walls

### Pitfall 7: Tweening Predicted Movement
**What goes wrong:** Client tweens local player sprite over 100ms per move → smooth but feels laggy, not instant response
**Why it happens:** Applying same tween logic to local player as remote players
**How to avoid:** Instant position update for local player prediction, only tween when reconciling server corrections or for other players
**Warning signs:** Input feels delayed despite client prediction, movement not responsive

### Pitfall 8: Forgetting to Update Camera
**What goes wrong:** Player sprite moves but camera doesn't follow → player walks off screen
**Why it happens:** Camera follow not set up, or disabled during testing
**How to avoid:** Ensure `cameras.main.startFollow(localPlayer)` called when player created, verify in WorldScene.create()
**Warning signs:** Player sprite visible in corner, scrolling doesn't work

## Code Examples

Verified patterns from official sources and existing codebase:

### Input Handling with Sequence Numbers
```typescript
// Client-side: apps/web/src/game/systems/MovementController.ts
// Source: Gabriel Gambetta (https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)

interface PendingInput {
  sequence: number;
  direction: Direction;
  timestamp: number;
}

export class MovementController {
  private pendingInputs: PendingInput[] = [];
  private inputSequence = 0;

  processInput(direction: Direction) {
    this.inputSequence++;

    const input: PendingInput = {
      sequence: this.inputSequence,
      direction,
      timestamp: Date.now()
    };

    // Step 1: Apply locally (prediction)
    this.applyInput(input);

    // Step 2: Store for reconciliation
    this.pendingInputs.push(input);

    // Step 3: Send to server
    gameSocket.emit('player:move', {
      direction: input.direction,
      sequence: input.sequence
    });
  }

  applyInput(input: PendingInput) {
    const player = useGameStore.getState().player;
    if (!player) return;

    // Use existing validation logic
    const newPosition = calculateNewPosition(player.position, input.direction);

    // Update state
    useGameStore.getState().setPlayer({
      ...player,
      position: newPosition
    });
  }

  reconcile(serverPosition: Position, lastProcessedInput: number) {
    // Discard acknowledged inputs
    this.pendingInputs = this.pendingInputs.filter(
      input => input.sequence > lastProcessedInput
    );

    // Start from server's authoritative position
    let reconciledPosition = serverPosition;

    // Replay unacknowledged inputs
    for (const input of this.pendingInputs) {
      reconciledPosition = calculateNewPosition(
        reconciledPosition,
        input.direction
      );
    }

    // Update to reconciled position
    const player = useGameStore.getState().player;
    if (player) {
      useGameStore.getState().setPlayer({
        ...player,
        position: reconciledPosition
      });
    }

    return reconciledPosition;
  }
}
```

### Server-Side Movement with Sequence Echo
```typescript
// Server-side: apps/game-server/src/game/game.gateway.ts
// Modify existing 'player:move' handler to include sequence numbers

@SubscribeMessage('player:move')
async handleMove(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { direction: Direction; sequence: number }
) {
  // Rate limiting check
  const player = this.playerService.getPlayerBySocket(client.id);
  if (!player) return;

  const now = Date.now();
  const lastMoveTime = this.playerService.getLastMoveTime(player.id);

  if (now - lastMoveTime < 150) {
    // Too fast - reject
    client.emit('error', {
      code: 'RATE_LIMITED',
      message: 'Movement too fast'
    });
    return;
  }

  this.playerService.setLastMoveTime(player.id, now);

  // Validate and process movement (existing logic)
  const result = await this.gameService.movePlayer(client.id, data.direction);

  if (result.success) {
    // Echo sequence number back to client
    this.server.to(result.zoneId!).emit('player:moved', {
      playerId: result.playerId,
      position: result.position,
      lastProcessedInput: data.sequence // CRITICAL: client needs this for reconciliation
    });
  } else {
    client.emit('error', {
      code: 'MOVEMENT_BLOCKED',
      message: result.error || 'Movement blocked',
      lastProcessedInput: data.sequence // Even on failure, acknowledge sequence
    });
  }
}
```

### A* Click-to-Move Integration
```typescript
// Client-side: apps/web/src/game/systems/PathfindingController.ts
// Source: Existing A* from @into-the-void/game-logic

import { findPath } from '@into-the-void/game-logic';

export class PathfindingController {
  private currentPath: Array<{ x: number; y: number }> = [];
  private pathIndex = 0;
  private executionTimer: number | null = null;
  private movementController: MovementController;

  constructor(movementController: MovementController) {
    this.movementController = movementController;
  }

  startPath(targetX: number, targetY: number, collisionMap: boolean[][]) {
    this.cancelPath(); // Cancel any existing path

    const player = useGameStore.getState().player;
    if (!player) return;

    // Use existing A* pathfinding
    const path = findPath(
      player.position.x,
      player.position.y,
      targetX,
      targetY,
      collisionMap
    );

    if (!path) {
      console.warn('No path found to target');
      return;
    }

    this.currentPath = path;
    this.pathIndex = 1; // Skip current position
    this.executeNextStep();
  }

  private executeNextStep() {
    if (this.pathIndex >= this.currentPath.length) {
      this.currentPath = [];
      return;
    }

    const current = useGameStore.getState().player?.position;
    const next = this.currentPath[this.pathIndex];

    if (!current) {
      this.cancelPath();
      return;
    }

    // Calculate direction
    const direction = this.getDirection(current, next);

    if (direction) {
      // Use same client prediction as WASD
      this.movementController.processInput(direction);
      this.pathIndex++;

      // Schedule next step
      this.executionTimer = window.setTimeout(
        () => this.executeNextStep(),
        150 // Match movement delay
      );
    } else {
      this.cancelPath();
    }
  }

  cancelPath() {
    if (this.executionTimer !== null) {
      clearTimeout(this.executionTimer);
      this.executionTimer = null;
    }
    this.currentPath = [];
    this.pathIndex = 0;
  }

  private getDirection(from: Position, to: Position): Direction | null {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Cardinal and diagonal directions
    if (dx === 0 && dy === -1) return 'n';
    if (dx === 0 && dy === 1) return 's';
    if (dx === 1 && dy === 0) return 'e';
    if (dx === -1 && dy === 0) return 'w';
    if (dx === 1 && dy === -1) return 'ne';
    if (dx === -1 && dy === -1) return 'nw';
    if (dx === 1 && dy === 1) return 'se';
    if (dx === -1 && dy === 1) return 'sw';

    return null; // Invalid step
  }

  isPathActive(): boolean {
    return this.currentPath.length > 0;
  }
}
```

### Collision Map Synchronization
```typescript
// Client-side: Update collision map when receiving zone data
// apps/web/src/store/gameStore.ts (extend existing zone:state handler)

gameSocket.on('zone:state', (data: ZoneState) => {
  const { zoneId, entities, players, chunk } = data;

  // Store zone data
  useGameStore.getState().setZoneState(data);

  // CRITICAL: Update collision map for client-side prediction
  if (chunk?.collisions) {
    // Store collision map in game store or pass to MovementController
    useGameStore.getState().setCollisionMap(chunk.collisions);
  }

  // Update player position from zone data
  const currentPlayer = useGameStore.getState().player;
  if (currentPlayer) {
    const playerInZone = players.find(p => p.id === currentPlayer.id);
    if (playerInZone) {
      useGameStore.getState().setPlayer({
        ...currentPlayer,
        position: playerInZone.position,
      });
    }
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-only movement | Client-side prediction + reconciliation | ~1996 (Duke Nukem 3D, QuakeWorld) | Eliminated input lag, made networked games feel responsive |
| Custom pathfinding | A* algorithm with optimizations (JPS) | ~2000s | Standard solution, well-understood, Jump Point Search for grids |
| Event-driven keyboard | Polling keyboard state in update loop | Phaser 1+ | Natural continuous movement, simpler for action games |
| Long polling / AJAX | WebSocket (Socket.IO) | ~2011 | Real-time bidirectional communication, lower latency |
| JSON for network | Binary formats (MessagePack, Protobuf) | 2010s+ | 50% smaller payload, but JSON sufficient for this project |

**Deprecated/outdated:**
- **Phaser 2 keyboard API:** Use Phaser 3's `this.input.keyboard.createCursorKeys()` and `addKey()`
- **Socket.IO v2:** Use v4+ for better TypeScript support, connection state recovery
- **Client-authoritative movement:** Server must validate, clients can cheat otherwise
- **Pure event-driven WASD:** Doesn't support hold-to-move, use polling in update loop

## Open Questions

1. **Should diagonal movement cost the same as cardinal movement?**
   - What we know: Current `validateMovement` allows diagonals (8 directions), A* uses Manhattan distance (cardinal-only heuristic)
   - What's unclear: Game design decision - should diagonal be sqrt(2) cost or same as cardinal?
   - Recommendation: Start with same cost (simpler), can add diagonal cost multiplier later if needed

2. **How to handle zone transitions during active pathfinding?**
   - What we know: Zone transitions trigger `zone:state` event, collision map changes
   - What's unclear: Should pathfinding pause during transition, or recalculate path in new zone?
   - Recommendation: Cancel pathfinding on zone transition, require new click in new zone (safer, simpler)

3. **Should movement speed be configurable per character?**
   - What we know: Currently hardcoded 150ms delay in WorldScene
   - What's unclear: Future requirements for sprint, slow effects, character stats
   - Recommendation: Keep 150ms constant for Phase 6, add speed modifiers in later phase (Phase 7+ if needed)

4. **Rate limiting threshold on server?**
   - What we know: Client uses 150ms delay, server should validate timing
   - What's unclear: Should server allow slight variance (lag tolerance) or strict 150ms enforcement?
   - Recommendation: Server allows moves every 140ms (10ms tolerance) to account for network jitter, stricter = more false rejections

5. **How to handle latency spikes during reconciliation?**
   - What we know: Reconciliation replays pending inputs when server update arrives
   - What's unclear: If RTT is 500ms, player might have 3+ pending inputs - visual corrections could be jarring
   - Recommendation: Limit replay to last 5 inputs max, discard older (prevents spiral), add latency indicator to UI

## Sources

### Primary (HIGH confidence)
- [Gabriel Gambetta - Client-Side Prediction and Server Reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) - Authoritative guide on sequence numbers, reconciliation algorithm
- Existing codebase:
  - `/apps/game-server/src/game/game.gateway.ts` - Socket.IO event handlers for movement
  - `/packages/game-logic/src/movement/validation.ts` - Movement validation logic
  - `/packages/game-logic/src/movement/pathfinding.ts` - A* pathfinding implementation
  - `/packages/shared-types/src/network/events.ts` - Event type definitions
  - `/apps/web/src/game/scenes/WorldScene.ts` - Phaser input handling, tweens

### Secondary (MEDIUM confidence)
- [Phaser - WASD keyboard movement](https://phaser.discourse.group/t/wasd-keyboard-movement-phaser-3/8297) - Input polling pattern
- [Phaser Tweens Documentation](https://docs.phaser.io/phaser/concepts/tweens) - Smooth sprite interpolation
- [Red Blob Games - Grid pathfinding optimizations](https://www.redblobgames.com/pathfinding/grids/algorithms.html) - A* best practices
- [Socket.IO Performance Tuning](https://socket.io/docs/v4/performance-tuning/) - Event batching, throttling
- [Socket.IO Rate Limiter packages](https://www.npmjs.com/package/@d3vision/socket.io-rate-limiter) - Server-side spam prevention

### Tertiary (LOW confidence - community discussions)
- [Colyseus - Client Predicted Input with Phaser](https://learn.colyseus.io/phaser/3-client-predicted-input) - Alternative framework approach (not using Colyseus but pattern is similar)
- [GameDev.net - Client Side Prediction and Server Reconciliation](https://www.gamedev.net/forums/topic/697159-client-side-prediction-and-server-reconciliation/) - Community discussion on implementation
- [Godot Grid-based movement](https://kidscancode.org/godot_recipes/4.x/2d/grid_movement/index.html) - Different engine but similar pattern for smooth grid movement

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified in package.json and codebase
- Architecture: HIGH - Gabriel Gambetta articles are industry standard, existing code follows similar patterns
- Pitfalls: HIGH - Derived from authoritative sources and analysis of existing codebase structure
- Code examples: HIGH - Based on official documentation and verified existing code patterns

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days - stable domain, networking patterns don't change rapidly)

**Blockers identified from previous phases:**
- **Phase 6 concern:** "Client prediction without server reconciliation (sequence numbers, rollback)" - ADDRESSED in this research with sequence number pattern and reconciliation algorithm

**Key constraints from lore:**
- Game is "2d isomorphic view, similar to Tibia / minecraft dungeons" (lore/overview.md) - confirms grid-based tile movement, top-down perspective
- No contradiction with movement system requirements
