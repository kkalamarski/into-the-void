# Phase 10: Multiplayer Integration - Research

**Researched:** 2026-02-16
**Domain:** Phaser 3 multiplayer rendering, Socket.IO synchronization, isometric coordinate systems
**Confidence:** HIGH

## Summary

Phase 10 integrates remote players and entities into the isometric rendering system established in Phases 8-9. The game already has client-side prediction with server reconciliation for local player movement (Phase 6), isometric coordinate transformation (Phase 8), and depth sorting (Phase 8). This phase extends that foundation to render remote players at correct isometric positions with smooth movement interpolation.

The codebase already has the essential infrastructure: `addPlayer()`, `movePlayer()`, and `removePlayer()` methods in WorldScene.ts that handle remote player sprites; Socket.IO event handlers for `player:joined`, `player:left`, and `player:moved`; and isometric coordinate transformation utilities. The challenge is ensuring remote player positions synchronize accurately across clients despite network latency (100ms+), and that movement tweens use grid coordinates (not screen pixel deltas) to maintain isometric alignment.

**Primary recommendation:** Use existing Phaser tween system with isometric grid-to-screen transformation for remote player movement. Apply linear interpolation over 100-150ms duration matching server tick rate. Ensure depth sorting includes remote players using the same Y + X tiebreaker pattern as entities. Leverage existing Socket.IO room-based broadcasting for position sync.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.85+ (already installed) | Remote player rendering, tween-based movement interpolation | Industry standard for multiplayer HTML5 games, built-in tweening handles smooth position sync |
| Socket.IO | v4.8+ (already installed) | Real-time position synchronization, room-based zone broadcasting | Established pattern for MMO networking, connection recovery handles disconnections gracefully |
| IsometricTransform | Internal utility (Phase 8) | Grid-to-screen coordinate conversion for remote players | Already implemented, ensures consistent positioning across all clients |
| DepthSorter | Internal utility (Phase 8) | Remote player depth sorting with local entities | Throttled depth updates prevent performance issues with many players |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | - | No additional libraries needed—existing stack covers all requirements |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Phaser tweens | Manual lerp in update loop | Tweens provide easing, automatic cleanup, frame-rate independence. Manual lerp adds complexity. |
| Socket.IO rooms | Broadcast to all clients | Rooms enable zone-based filtering (only broadcast to players in same zone), reduces network traffic dramatically in MMO. |
| Linear interpolation | Dead reckoning (predict movement) | Dead reckoning adds complexity, requires velocity data. Grid-based movement is discrete, simple interpolation sufficient. |
| 100ms tween duration | Match RTT latency | Tweens should match server tick rate (150ms movement delay), not RTT. Longer tweens smooth out jitter, shorter feel snappy. |

**Installation:**
```bash
# No new dependencies—use existing Phaser 3 + Socket.IO
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/game/
├── scenes/
│   └── WorldScene.ts                # (exists) addPlayer(), movePlayer(), removePlayer() methods
├── rendering/
│   ├── EntityRenderer.ts            # (exists) Remote players use similar container pattern as entities
│   └── DepthSorter.ts               # (exists) Include remote players in depth sorting
└── utils/
    └── IsometricTransform.ts        # (exists) Grid-to-screen conversion for remote positions

apps/game-server/src/game/
├── game.gateway.ts                  # (exists) 'player:joined', 'player:left', 'player:moved' events
└── game.service.ts                  # (exists) Zone room management, position broadcasting
```

### Pattern 1: Remote Player Rendering with Isometric Coordinates

**What:** Create remote player sprite containers using same isometric transformation as local player and entities
**When to use:** When receiving `player:joined` event from server

**Example:**
```typescript
// Source: Existing WorldScene.addPlayer() method + Phase 8 isometric patterns
// apps/web/src/game/scenes/WorldScene.ts (already implemented, verified pattern)

addPlayer(player: PlayerPublic): void {
  if (this.playerSprites.has(player.id) || !this.isoTransform) return;

  // Convert grid position to isometric screen position
  const screenPos = this.isoTransform.gridToScreen(player.position.x, player.position.y);

  // Create container (same pattern as entities for depth sorting)
  const container = this.add.container(screenPos.x, screenPos.y);
  container.setData('gridX', player.position.x);
  container.setData('gridY', player.position.y);

  // Blob shadow at ground level
  const shadow = this.add.ellipse(0, 0, 40, 20, 0x000000, 0.3);
  container.add(shadow);

  // Player sprite elevated above ground (matches local player)
  const sprite = this.add.sprite(0, -12, 'player');
  sprite.setOrigin(0.5, 1.0);
  sprite.setScale(0.5);
  sprite.setTint(this.getFactionColor(player.faction)); // Visual differentiation
  container.add(sprite);

  // Depth sorting: Y-position + X tiebreaker (same as entities)
  const depth = this.isoTransform.calculateDepth(player.position.x, player.position.y);
  container.setDepth(depth);

  // Store container (typed as Sprite for compatibility)
  this.playerSprites.set(player.id, container as unknown as Phaser.GameObjects.Sprite);
}
```

### Pattern 2: Remote Player Movement with Grid-Based Tweens

**What:** Animate remote player movement using isometric coordinate transformation and Phaser tweens
**When to use:** When receiving `player:moved` event from server

**Example:**
```typescript
// Source: Existing WorldScene.movePlayer() + Phaser tween best practices
// Critical: Use grid coordinates for target, not pixel deltas

movePlayer(playerId: string, position: Position): void {
  const sprite = this.playerSprites.get(playerId);
  if (!sprite || !this.isoTransform) return;

  // Convert new grid position to isometric screen coordinates
  const screenPos = this.isoTransform.gridToScreen(position.x, position.y);

  // Kill existing tweens to prevent conflicts (important for rapid updates)
  this.tweens.killTweensOf(sprite);

  // Tween to new position with linear easing
  this.tweens.add({
    targets: sprite,
    x: screenPos.x,
    y: screenPos.y,
    duration: 100, // Match server movement speed (150ms - small tolerance)
    ease: 'Linear', // No easing for grid movement (looks more natural)
    onComplete: () => {
      // Update grid data for depth sorting
      sprite.setData('gridX', position.x);
      sprite.setData('gridY', position.y);

      // Recalculate depth (Y-position changed in isometric space)
      const depth = this.isoTransform!.calculateDepth(position.x, position.y);
      sprite.setDepth(depth);
    }
  });
}
```

### Pattern 3: Zone-Based Position Broadcasting with Socket.IO Rooms

**What:** Server broadcasts position updates only to clients in same zone using Socket.IO rooms
**When to use:** On server-side when processing player movement

**Example:**
```typescript
// Source: Existing game.gateway.ts + Socket.IO rooms documentation
// apps/game-server/src/game/game.gateway.ts (pattern already implemented)

@SubscribeMessage('player:move')
async handleMove(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { direction: Direction; sequence?: number }
) {
  const result = await this.gameService.movePlayer(client.id, data.direction);

  if (result.success) {
    if (result.oldZoneId && result.newZoneId) {
      // Zone transition: update room membership
      client.leave(result.oldZoneId);
      client.join(result.newZoneId);

      // Notify old zone player left
      this.server.to(result.oldZoneId).emit('player:left', {
        playerId: result.playerId,
      });

      // Send new zone state to transitioning player
      const zoneState = await this.gameService.getZoneState(result.newZoneId);
      client.emit('zone:state', zoneState);

      // Notify new zone player joined (other clients render remote player)
      client.to(result.newZoneId).emit('player:joined', result.playerPublic);
    } else {
      // Same zone movement: broadcast to everyone in zone (including sender)
      this.server.to(result.zoneId!).emit('player:moved', {
        playerId: result.playerId,
        position: result.position,
        lastProcessedInput: data.sequence, // For local player reconciliation
      });
    }
  }
}
```

### Pattern 4: Remote Player Depth Sorting with Entities

**What:** Include remote players in throttled depth sorting system alongside entities
**When to use:** In WorldScene.update() loop when DepthSorter runs

**Example:**
```typescript
// Source: Phase 8 DepthSorter + extending for remote players
// apps/web/src/game/rendering/DepthSorter.ts

export class DepthSorter {
  private lastUpdateTime = 0;
  private updateInterval = 100; // ms
  private dirtyEntities = new Set<string>();

  // Mark remote player as needing depth update
  markDirty(entityOrPlayerId: string): void {
    this.dirtyEntities.add(entityOrPlayerId);
  }

  update(
    time: number,
    entities: Map<string, Phaser.GameObjects.Container>,
    isoTransform: IsometricTransform
  ): void {
    if (time - this.lastUpdateTime < this.updateInterval) return;

    this.dirtyEntities.forEach(id => {
      const container = entities.get(id);
      if (!container) return;

      const gridX = container.getData('gridX') as number;
      const gridY = container.getData('gridY') as number;

      // Calculate depth using Y + X tiebreaker
      const depth = isoTransform.calculateDepth(gridX, gridY);
      container.setDepth(depth);
    });

    this.dirtyEntities.clear();
    this.lastUpdateTime = time;
  }
}

// In WorldScene.update():
update(time: number): void {
  // ... existing input handling ...

  // Throttled depth sorting for entities AND remote players
  if (this.depthSorter && this.isoTransform) {
    // Combine entities and player sprites for depth sorting
    const allSprites = new Map<string, Phaser.GameObjects.Container>();

    this.entitySprites.forEach((sprite, id) => allSprites.set(id, sprite));
    this.playerSprites.forEach((sprite, id) => {
      // Player sprites stored as Sprite but are actually Containers
      allSprites.set(id, sprite as unknown as Phaser.GameObjects.Container);
    });

    this.depthSorter.update(time, allSprites, this.isoTransform);
  }
}
```

### Pattern 5: Handling Remote Player Disconnections

**What:** Remove remote player sprite when player leaves zone or disconnects
**When to use:** When receiving `player:left` event from server

**Example:**
```typescript
// Source: Existing WorldScene.removePlayer() method
// apps/web/src/game/scenes/WorldScene.ts

removePlayer(playerId: string): void {
  const sprite = this.playerSprites.get(playerId);
  if (sprite) {
    sprite.destroy(); // Phaser automatically removes from scene
    this.playerSprites.delete(playerId);
  }
}

// Client-side event handler (in socket setup or game store)
gameSocket.on('player:left', (data: { playerId: string }) => {
  worldScene.removePlayer(data.playerId);
});
```

### Pattern 6: Position Sync on Zone Transition

**What:** When player transitions to new zone, render all existing players in that zone
**When to use:** When receiving `zone:state` event containing PlayerPublic[] array

**Example:**
```typescript
// Source: Existing zone:state handler pattern
// apps/web/src/store/gameStore.ts or WorldScene initialization

gameSocket.on('zone:state', (zoneState: ZoneState) => {
  const { zoneId, players, entities, chunk } = zoneState;

  // Clear previous zone's remote players (zone transition)
  worldScene.clearOtherPlayers();

  // Render all players in new zone (except local player)
  const localPlayerId = useGameStore.getState().player?.id;
  players.forEach(player => {
    if (player.id !== localPlayerId) {
      worldScene.addPlayer(player);
    }
  });

  // ... handle entities, tiles, etc ...
});
```

### Anti-Patterns to Avoid

- **Using screen pixel deltas for tweens:** Always convert grid coordinates to screen coordinates using IsometricTransform, never interpolate screen pixels directly (breaks with isometric projection)
- **Broadcasting to all clients:** Use Socket.IO rooms for zone-based filtering—broadcasting globally creates bandwidth/CPU issues with 100+ players
- **Not killing previous tweens:** If player moves rapidly, multiple tweens overlap causing jittery movement. Always `killTweensOf()` before creating new tween
- **Forgetting depth updates after movement:** Remote players must recalculate depth when position changes, or they render behind/in-front incorrectly
- **Extrapolating remote positions:** Don't predict remote player movement—grid-based discrete movement makes prediction unreliable, just interpolate to last known position
- **Synchronous sprite creation:** Creating many remote players at once (zone:state with 20+ players) can cause frame drops. Consider async batching if needed

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Position interpolation | Custom lerp/easing functions | Phaser Tweens API | Frame-rate independence, automatic cleanup, easing support, cancelation handling |
| Coordinate transformation | Recalculate isometric formulas per player | IsometricTransform utility (Phase 8) | Already implemented, tested, handles edge cases (chunk boundaries) |
| Network broadcasting | Send updates to all clients | Socket.IO rooms (zone-based) | Automatically filters by zone, reduces bandwidth by ~90% in large worlds |
| Player sprite management | Manual Map manipulation | WorldScene addPlayer/movePlayer/removePlayer methods | Already handles container creation, depth sorting, faction colors |
| Zone membership tracking | Client-side zone tracking | Server-authoritative rooms (socket.join/leave) | Server is source of truth, prevents cheating/desyncs |

**Key insight:** Multiplayer rendering is 90% applying existing patterns (isometric transform, depth sorting, tweens) to remote players instead of just local player. The hard problems (coordinate systems, depth sorting, network sync) are already solved in Phases 6-9. This phase is about integration, not new algorithms.

## Common Pitfalls

### Pitfall 1: Rubber-Banding from Incorrect Tween Duration

**What goes wrong:** Remote players appear to "rubber-band" or snap between positions instead of smooth movement.

**Why it happens:** Tween duration doesn't match server's movement tick rate. If server sends updates every 150ms but tween duration is 500ms, old tween still playing when new update arrives, causing conflicting animations.

**How to avoid:**
- Match tween duration to server movement delay (100-150ms)
- Always `killTweensOf(sprite)` before creating new tween
- Use linear easing for grid movement (no acceleration/deceleration)
- Consider slight tolerance: server 150ms, client tween 100ms prevents queue buildup

**Warning signs:** Remote players stutter, movement looks "bouncy," position corrections visible during fast movement

### Pitfall 2: Remote Players Rendering at Wrong Depth

**What goes wrong:** Remote players appear behind tiles/entities they should be in front of, or vice versa.

**Why it happens:** Depth not updated after movement, or remote players excluded from DepthSorter. Isometric depth depends on Y-position (and X tiebreaker), which changes with every move.

**How to avoid:**
- Update depth in tween `onComplete` callback using new grid position
- Include remote player sprites in DepthSorter.update() alongside entities
- Use same depth calculation formula as entities: `calculateDepth(gridX, gridY)`
- Mark remote player "dirty" when receiving `player:moved` event

**Warning signs:** Remote players disappear behind objects, z-fighting with entities, depth correct until player moves

### Pitfall 3: Position Desync from Grid Coordinate Loss

**What goes wrong:** Remote players gradually drift from correct tile positions, appearing offset from grid.

**Why it happens:** Using screen pixel positions instead of grid coordinates for interpolation. Floating-point errors accumulate, especially with isometric coordinate conversion.

**How to avoid:**
- Always store grid coordinates in container data: `setData('gridX', x)`, `setData('gridY', y)`
- Convert grid → screen for every position update using IsometricTransform
- Never interpolate screen pixels directly (e.g., `sprite.x += deltaX`)
- Recalculate screen position from grid coords in tween setup

**Warning signs:** Remote players appear between tiles, gradual drift over time, positions differ between clients

### Pitfall 4: Memory Leak from Undestroyed Sprites

**What goes wrong:** Game performance degrades over time, especially after many zone transitions or player disconnects.

**Why it happens:** Remote player sprites/containers not properly destroyed when player leaves. Phaser keeps references in scene, causing memory leak.

**How to avoid:**
- Always call `sprite.destroy()` in `removePlayer()` method
- Clear all remote players on zone transition: `clearOtherPlayers()`
- Verify `playerSprites.delete(id)` called after destroy
- Use `container.destroy(true)` to recursively destroy children (shadow, sprite)

**Warning signs:** FPS drops over long play sessions, memory usage grows continuously, garbage collection pauses

### Pitfall 5: Zone Transition Race Conditions

**What goes wrong:** Remote player appears in wrong zone, or same player rendered twice briefly during zone transition.

**Why it happens:** Timing between `player:left` (old zone) and `player:joined` (new zone) events. Client might receive out-of-order, or zone:state arrives before player:left.

**How to avoid:**
- Clear all remote players when receiving `zone:state` (authoritative reset)
- Check if player already exists before creating in `addPlayer()` (has guard check)
- Zone transitions should send `zone:state` to transitioning player (includes all players in new zone)
- Old zone receives `player:left`, new zone receives `player:joined`

**Warning signs:** Duplicate player sprites briefly visible, players from old zone linger after transition, missing players in new zone

### Pitfall 6: Jitter from Network Latency Variance

**What goes wrong:** Remote players move smoothly most of the time but occasionally "jump" forward or stutter.

**Why it happens:** Network jitter causes variable arrival time of `player:moved` events. Some arrive early (100ms), some late (200ms), creating inconsistent animation timing.

**How to avoid:**
- Use fixed tween duration regardless of packet arrival time (don't try to compensate)
- Consider lightweight interpolation buffer: store last 2-3 positions, interpolate between them
- For grid movement, simple tweens sufficient—interpolation buffers more complex
- Monitor latency indicator in UI, warn player if jitter > 50ms

**Warning signs:** Remote players occasionally skip tiles, movement speed appears inconsistent, stuttering during high server load

### Pitfall 7: Faction Colors Not Applied to Remote Players

**What goes wrong:** All remote players look identical, can't distinguish factions visually.

**Why it happens:** Forgetting to apply faction-based tint in `addPlayer()` method.

**How to avoid:**
- Apply tint based on faction in sprite creation: `sprite.setTint(this.getFactionColor(player.faction))`
- Existing `getFactionColor()` method already implemented in WorldScene
- Verify faction included in `PlayerPublic` type (already is: `faction: FactionId`)

**Warning signs:** All players same color, can't tell friend from foe, visual feedback missing

### Pitfall 8: Not Handling Zone Chunk Boundaries for Remote Players

**What goes wrong:** Remote players disappear when standing on tiles near chunk boundaries.

**Why it happens:** Viewport culling or chunk loading doesn't account for remote player positions, only local player.

**How to avoid:**
- Remote players are sprites, not tied to chunks—don't cull based on chunk loading
- Viewport culling should only apply to tiles, not player sprites
- Remote player visibility independent of chunk system (players can be visible across chunk boundaries)

**Warning signs:** Remote players vanish at screen edges, reappear when camera moves, culling too aggressive

## Code Examples

Verified patterns from existing codebase and official sources:

### Remote Player Creation with Isometric Coordinates

```typescript
// Source: apps/web/src/game/scenes/WorldScene.ts (lines 480-504, already implemented)
// Verified pattern matching Phase 8 entity rendering

addPlayer(player: PlayerPublic): void {
  if (this.playerSprites.has(player.id) || !this.isoTransform) return;

  const screenPos = this.isoTransform.gridToScreen(player.position.x, player.position.y);

  const container = this.add.container(screenPos.x, screenPos.y);
  container.setData('gridX', player.position.x);
  container.setData('gridY', player.position.y);

  // Blob shadow (40x20 ellipse from Phase 8 entity standard)
  const shadow = this.add.ellipse(0, 0, 40, 20, 0x000000, 0.3);
  container.add(shadow);

  // Player sprite elevated 12px (matches local player and entities)
  const sprite = this.add.sprite(0, -12, 'player');
  sprite.setOrigin(0.5, 1.0); // Bottom-center for ground alignment
  sprite.setScale(0.5); // 2x resolution texture scaled down
  sprite.setTint(this.getFactionColor(player.faction)); // Visual differentiation

  container.add(sprite);

  // Depth calculation using same formula as entities
  const depth = this.isoTransform.calculateDepth(player.position.x, player.position.y);
  container.setDepth(depth);

  this.playerSprites.set(player.id, container as unknown as Phaser.GameObjects.Sprite);
}
```

### Smooth Remote Player Movement with Grid-Based Tweens

```typescript
// Source: apps/web/src/game/scenes/WorldScene.ts (lines 514-534, already implemented)
// Critical: Grid coords → isometric screen coords conversion

movePlayer(playerId: string, position: Position): void {
  const sprite = this.playerSprites.get(playerId);
  if (!sprite || !this.isoTransform) return;

  // Convert grid position to isometric screen coordinates
  const screenPos = this.isoTransform.gridToScreen(position.x, position.y);

  // Kill existing tweens (prevents overlap conflicts)
  this.tweens.killTweensOf(sprite);

  // Tween to new position
  this.tweens.add({
    targets: sprite,
    x: screenPos.x,
    y: screenPos.y,
    duration: 100, // Slightly faster than server tick (150ms) to prevent queue buildup
    ease: 'Linear', // No easing for grid movement
    onComplete: () => {
      // Update stored grid coordinates
      sprite.setData('gridX', position.x);
      sprite.setData('gridY', position.y);

      // Recalculate depth (Y changed in isometric space)
      const depth = this.isoTransform!.calculateDepth(position.x, position.y);
      sprite.setDepth(depth);
    }
  });
}
```

### Socket.IO Event Handlers for Remote Players

```typescript
// Source: Pattern derived from existing socket.on handlers in web app
// apps/web/src/store/gameStore.ts or network setup

// Remote player joins zone
gameSocket.on('player:joined', (player: PlayerPublic) => {
  const worldScene = getActiveWorldScene(); // Helper to access Phaser scene
  if (worldScene) {
    worldScene.addPlayer(player);
  }
});

// Remote player moves
gameSocket.on('player:moved', (data: { playerId: string; position: Position; lastProcessedInput?: number }) => {
  const worldScene = getActiveWorldScene();
  const localPlayerId = useGameStore.getState().player?.id;

  if (data.playerId === localPlayerId) {
    // This is our movement being acknowledged—trigger reconciliation
    if (data.lastProcessedInput !== undefined) {
      worldScene?.getMovementController()?.reconcile(data.position, data.lastProcessedInput);
    }
  } else {
    // Remote player moved—update their sprite
    worldScene?.movePlayer(data.playerId, data.position);
  }
});

// Remote player leaves zone
gameSocket.on('player:left', (data: { playerId: string }) => {
  const worldScene = getActiveWorldScene();
  if (worldScene) {
    worldScene.removePlayer(data.playerId);
  }
});

// Zone state includes all players (initial load + zone transitions)
gameSocket.on('zone:state', (zoneState: ZoneState) => {
  const worldScene = getActiveWorldScene();
  const localPlayerId = useGameStore.getState().player?.id;

  // Clear previous zone's remote players
  worldScene?.clearOtherPlayers();

  // Add all players in new zone (except local player)
  zoneState.players.forEach(player => {
    if (player.id !== localPlayerId && worldScene) {
      worldScene.addPlayer(player);
    }
  });
});
```

### Server-Side Zone Broadcasting

```typescript
// Source: apps/game-server/src/game/game.gateway.ts (lines 120-178, already implemented)
// Verified Socket.IO rooms pattern for zone-based broadcasting

@SubscribeMessage('player:move')
async handleMove(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { direction: Direction; sequence?: number }
) {
  const result = await this.gameService.movePlayer(client.id, data.direction);

  if (result.success) {
    if (result.oldZoneId && result.newZoneId) {
      // Zone transition
      client.leave(result.oldZoneId);
      client.join(result.newZoneId);

      // Notify old zone player left
      this.server.to(result.oldZoneId).emit('player:left', {
        playerId: result.playerId,
      });

      // Send new zone state to transitioning player
      const zoneState = await this.gameService.getZoneState(result.newZoneId);
      client.emit('zone:state', zoneState);

      // Notify new zone player joined
      client.to(result.newZoneId).emit('player:joined', result.playerPublic);
    } else {
      // Same zone movement—broadcast to all clients in zone
      this.server.to(result.zoneId!).emit('player:moved', {
        playerId: result.playerId,
        position: result.position,
        lastProcessedInput: data.sequence, // For local player reconciliation
      });
    }
  }
}
```

### Depth Sorting Remote Players with Entities

```typescript
// Source: apps/web/src/game/scenes/WorldScene.ts update() + DepthSorter pattern
// Extend existing throttled depth sorting to include remote players

update(time: number): void {
  this.handleInput(time);

  // Throttled viewport culling (tiles only, not players)
  if (time - this.lastCullTime >= this.cullInterval) {
    this.lastCullTime = time;
    this.updateVisibleTiles();
  }

  // Throttled depth sorting (entities + remote players)
  if (this.depthSorter && this.isoTransform) {
    // Combine entity sprites and player sprites
    const allSprites = new Map<string, Phaser.GameObjects.Container>();

    // Add entities
    this.entitySprites.forEach((container, id) => {
      allSprites.set(id, container);
    });

    // Add remote players (stored as Sprite type but actually Containers)
    this.playerSprites.forEach((sprite, id) => {
      allSprites.set(id, sprite as unknown as Phaser.GameObjects.Container);
    });

    // Update depth for all marked-dirty sprites
    this.depthSorter.update(time, allSprites, this.isoTransform);
  }
}

// Mark remote player dirty when they move
movePlayer(playerId: string, position: Position): void {
  // ... existing tween logic ...

  // Mark for depth update
  if (this.depthSorter) {
    this.depthSorter.markDirty(playerId);
  }
}
```

### Clearing Remote Players on Zone Transition

```typescript
// Source: Pattern from existing clearEntities() method in WorldScene
// apps/web/src/game/scenes/WorldScene.ts

/**
 * Clear all other players (for zone transitions)
 * Matches existing clearEntities() pattern
 */
clearOtherPlayers(): void {
  this.playerSprites.forEach((sprite) => sprite.destroy());
  this.playerSprites.clear();
}

// Call when transitioning zones (in zone:state handler)
onPlayerZoneChanged(newZoneId: string, biome: BiomeType): void {
  this.currentZoneId = newZoneId;

  // Clear remote players from old zone
  this.clearOtherPlayers();

  // Clear entities from old zone (existing pattern)
  this.clearEntities();

  // ChunkManager will load new zone's data
  if (this.chunkManager) {
    this.chunkManager.updateChunks(newZoneId);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full position sync every frame | Event-driven position updates (only on movement) | 2010s (bandwidth optimization) | Reduced network traffic by 90%+, scales to hundreds of players |
| Linear interpolation over RTT | Fixed-duration tweens matching game tick rate | Gaming standard since 2000s | Smoother movement, hides latency variance, simpler implementation |
| Global broadcasting | Zone/area-based filtering (Socket.IO rooms) | MMO standard since ~2005 | Essential for scalability—only broadcast to nearby players |
| Dead reckoning for all entities | Dead reckoning for physics, simple interpolation for grid | Hybrid approach ~2010s | Grid movement is discrete, prediction unreliable. Physics games still use dead reckoning. |
| Custom serialization (binary) | JSON over WebSocket for small games | WebSocket era (2011+) | Binary still better for high-frequency updates (FPS games), JSON sufficient for grid MMO |

**Deprecated/outdated:**
- **Long polling for position sync:** WebSocket/Socket.IO replaced AJAX polling in 2011+
- **Client-authoritative position:** Server must validate to prevent cheating—standard since 1990s multiplayer games
- **Extrapolating remote player movement:** Works for physics-based games, breaks for discrete grid movement
- **Per-frame position broadcasting:** Only send on actual movement events, not every frame

## Open Questions

1. **How many remote players before performance degrades?**
   - What we know: Phaser tweens and depth sorting are well-optimized. Existing DepthSorter throttles to 100ms updates.
   - What's unclear: Exact player count threshold on typical hardware (50 players? 200 players?)
   - Recommendation: Start with current implementation. If FPS drops with 50+ players in zone, optimize depth sorting (skip players outside viewport, increase throttle interval to 150ms).

2. **Should remote players use higher-resolution sprites than entities?**
   - What we know: Local player uses 2x resolution scaled down (0.5 scale). Remote players use same pattern.
   - What's unclear: Whether remote players need same visual quality as local player, or can use lower-res sprites for performance.
   - Recommendation: Keep same quality initially (consistency). If memory/bandwidth issues arise with many players, create lower-res remote player sprite variant.

3. **How to handle remote players moving during viewport culling?**
   - What we know: Viewport culling applies to tiles, not player sprites (sprites always visible).
   - What's unclear: Should remote players outside viewport still update tweens? (Performance vs correctness tradeoff)
   - Recommendation: Always update remote player tweens regardless of viewport—they might move into view mid-tween. Culling player tweens risks desyncs.

4. **Interpolation buffer for smoothing network jitter?**
   - What we know: Some games buffer 2-3 position updates and interpolate between them to smooth jitter.
   - What's unclear: Whether grid-based discrete movement benefits from buffering, or if simple tweens sufficient.
   - Recommendation: Start without buffering (simpler). If jitter noticeable during playtesting (>50ms variance), implement lightweight 2-position buffer.

5. **Should remote players show movement intent (target tile highlight)?**
   - What we know: Local player has pathfinding visualization (Phase 9). Remote players don't show their target.
   - What's unclear: Whether showing remote player paths/targets improves gameplay (tactical info) or creates visual clutter.
   - Recommendation: Defer to Phase 11 or 12 (polish). Core sync is Phase 10, visual enhancements later.

## Sources

### Primary (HIGH confidence)

- Existing codebase:
  - `/apps/web/src/game/scenes/WorldScene.ts` (lines 480-534) - Remote player rendering methods already implemented
  - `/apps/game-server/src/game/game.gateway.ts` (lines 120-178) - Zone-based broadcasting with Socket.IO rooms
  - `/apps/web/src/game/utils/IsometricTransform.ts` - Grid-to-screen coordinate conversion
  - `/apps/web/src/game/rendering/DepthSorter.ts` - Throttled depth sorting system
- [Gabriel Gambetta - Client-Side Prediction and Server Reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) - Industry standard multiplayer pattern
- [Socket.IO Rooms Documentation](https://socket.io/docs/v3/rooms/) - Zone-based broadcasting pattern
- [Phaser 3 Tweens Documentation](https://docs.phaser.io/phaser/concepts/tweens) - Position interpolation

### Secondary (MEDIUM confidence)

- [Colyseus - Linear Interpolation Tutorial](https://learn.colyseus.io/phaser/2-linear-interpolation.html) - Phaser.Math.Linear() for smooth remote player movement
- [Socket.IO Room Management Guide](https://www.tutorialspoint.com/socket.io/socket.io_rooms.htm) - Best practices for zone-based filtering
- [Multiplayer Game Development Basics - Medium (Feb 2026)](https://medium.com/coinmonks/multiplayer-game-development-basics-networking-matchmaking-and-sync-6b4b8b117dde) - Current state of position sync techniques
- [Phaser Discourse - Isometric Depth Sorting](https://phaser.discourse.group/t/automatic-isometric-depth-sorting-and-collisions-help/9656) - Community patterns for multiplayer isometric games
- [Valve - Latency Compensating Methods](https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization) - Fundamental concepts for network compensation

### Tertiary (LOW confidence - requires validation)

- WebSearch results on rubber-banding causes/solutions (generic, not Phaser-specific)
- WebSearch results on network jitter handling (2026 articles lack technical depth)
- Community forum discussions on remote player interpolation (anecdotal, not official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All libraries already integrated, verified in codebase
- Architecture patterns: **HIGH** - Core methods already implemented in WorldScene, just need integration
- Remote player rendering: **HIGH** - Existing code follows correct isometric + depth sorting patterns
- Position synchronization: **HIGH** - Socket.IO rooms + event broadcasting already working
- Common pitfalls: **MEDIUM-HIGH** - Derived from multiplayer game dev best practices and isometric-specific concerns
- Performance under load: **MEDIUM** - Theoretical analysis based on Phaser/Socket.IO characteristics, needs empirical testing

**Research date:** 2026-02-16
**Valid until:** ~60 days (Phase 10 builds on stable Phases 6-9, multiplayer patterns are well-established)

**Key findings:**
- **Infrastructure already 90% complete:** WorldScene has addPlayer/movePlayer/removePlayer methods, Socket.IO events wired up, isometric transformation working
- **Primary work is integration:** Connect existing pieces—event handlers call WorldScene methods, ensure depth sorting includes remote players
- **No new algorithms needed:** Remote player sync uses same patterns as Phase 6 (local player) and Phase 8 (entity rendering)
- **Biggest risk:** Performance with 50+ players (depth sorting, tween overhead)—needs empirical testing, optimizations available if needed

**Blockers from previous phases:**
- ✅ Phase 8: Isometric coordinate transformation—solved with IsometricTransform utility
- ✅ Phase 8: Depth sorting—solved with DepthSorter (throttled updates)
- ✅ Phase 9: Screen-relative input—not blocking remote player rendering
- ✅ Phase 6: Client prediction + reconciliation—already implemented for local player, remote players just interpolate

**Success criteria alignment:**
- **MULT-01** (Remote players render at correct isometric positions): Use IsometricTransform.gridToScreen() in addPlayer/movePlayer
- **MULT-02** (Remote player movement tweens use grid coordinates): Tween target calculated from grid coords, not pixel deltas
- **MULT-03** (Position sync maintains accuracy with 100ms+ latency): Fixed tween duration + linear easing hides latency variance
- **MULT-04** (Entity positions match between all connected clients): Server-authoritative positions + Socket.IO rooms ensure consistency
