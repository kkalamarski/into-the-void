# Technology Stack: Post-Login Game Experience

**Domain:** Multiplayer 2D sci-fi survival MMO (WebSocket game state, HUD, rendering, movement)
**Researched:** 2026-02-14
**Confidence:** HIGH

## Executive Summary

The existing stack (React, Phaser 3.80, NestJS, Socket.IO 4.7, Zustand 4.5) is solid for post-login game features. **NO major library additions needed.** Focus on integration patterns and minor version updates. The architecture already has WebSocket infrastructure, Phaser scene system, and state management in place.

**Key recommendation:** Update Phaser to 3.90+ for stability improvements, add EventBus pattern for React-Phaser communication, use Socket.IO rooms for zone isolation (already implemented in gateway), leverage existing Zustand store for UI state sync.

## Validated Existing Stack (DO NOT Re-Add)

These are ALREADY installed and working:

| Technology | Current | Purpose |
|------------|---------|---------|
| phaser | ^3.80.0 | Game rendering, scenes, sprites, input |
| socket.io-client | ^4.7.0 | WebSocket client for real-time game state |
| socket.io | ^4.7.0 | Server-side WebSocket handling |
| @nestjs/platform-socket.io | ^10.3.0 | NestJS Socket.IO integration |
| @nestjs/websockets | ^10.3.0 | WebSocket gateway framework |
| zustand | ^4.5.0 | React state management |
| react | ^18.2.0 | UI framework for HUD |

## Recommended Stack Updates

### Core Updates (Version Bumps)

| Technology | Current | Recommended | Purpose | Why Update |
|------------|---------|-------------|---------|------------|
| phaser | ^3.80.0 | ^3.90.0 | Game engine | Stability fixes for EXPAND scale mode on ultra-wide, improved DynamicTexture#capture for rendering, better Mask filter with scaleFactor for memory optimization, camera matrix improvements |
| socket.io | ^4.7.0 | ^4.8.3 | WebSocket server | Support for tryAllTransports option, production bundle binary data fix, improved transport fallback |
| socket.io-client | ^4.7.0 | ^4.8.3 | WebSocket client | Matches server version, improved cookie handling with withCredentials, better transport selection |
| typescript | ^5.4.0 | ^5.9.0 | Type safety | Latest stable before TypeScript 6.0 beta, improved type inference and performance |

### NEW Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| immer | ^10.0.0 | Immutable state updates | When updating nested Zustand state (zone data, entity registries), prevents accidental mutations |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Redux / Redux Toolkit | Over-engineered for this use case, Zustand already handles state | Zustand (already installed) |
| MobX | Different paradigm, adds complexity | Zustand (already installed) |
| bitECS / phaser-ecs plugins | Premature optimization, adds architectural complexity | Simple Map-based entity registry (see patterns below) |
| @liveblocks/zustand | Third-party service dependency, Socket.IO already handles sync | Direct Socket.IO integration (already implemented) |
| react-phaser-fiber | Declarative Phaser through React, conflicts with imperative game logic | EventBus pattern for React-Phaser communication |
| Colyseus / Photon | Replaces existing Socket.IO architecture, major refactor | Socket.IO with rooms (already implemented) |

## Installation

```bash
# Version updates
pnpm add phaser@^3.90.0 socket.io@^4.8.3 socket.io-client@^4.8.3 typescript@^5.9.0

# New library for state management
pnpm add immer@^10.0.0
```

## Stack Integration Patterns

### Pattern 1: React-Phaser Communication (EventBus)

**What:** Bidirectional event-based communication between React HUD and Phaser game scenes.

**Implementation:**
```typescript
// apps/web/src/game/EventBus.ts
import { Events } from 'phaser';

export const EventBus = new Events.EventEmitter();

// Usage in Phaser scene
EventBus.emit('player:health-changed', { health: 80, maxHealth: 100 });

// Usage in React
useEffect(() => {
  const handler = (data) => setHealth(data);
  EventBus.on('player:health-changed', handler);
  return () => EventBus.off('player:health-changed', handler);
}, []);
```

**Why:** Official Phaser template pattern, maintains separation between game logic and UI, avoids tight coupling.

**Source:** [Phaser React Template](https://github.com/phaserjs/template-react)

### Pattern 2: Socket.IO State Sync with Zustand

**What:** WebSocket events update Zustand store, which React components observe.

**Implementation:**
```typescript
// apps/web/src/store/gameStore.ts (existing file)
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useGameStore = create(
  immer((set) => ({
    entities: new Map(),
    players: new Map(),

    // Called by socket handlers
    addEntity: (entity) => set((state) => {
      state.entities.set(entity.id, entity);
    }),

    updateEntity: (id, changes) => set((state) => {
      const entity = state.entities.get(id);
      if (entity) {
        Object.assign(entity, changes);
      }
    }),
  }))
);

// apps/web/src/network/socket.ts (existing file)
gameSocket.on('entity:spawn', (entity) => {
  useGameStore.getState().addEntity(entity);
  EventBus.emit('entity:spawn', entity); // Bridge to Phaser
});
```

**Why:** Immer middleware prevents accidental mutations, Zustand provides reactive updates to React components, EventBus bridges to Phaser for rendering.

**Source:** [Zustand Discussion #1651](https://github.com/pmndrs/zustand/discussions/1651), [Immer Documentation](https://immerjs.github.io/immer/)

### Pattern 3: Entity Registry (Map-Based)

**What:** Simple Map-based entity tracking in both Phaser scene and Zustand store.

**Implementation:**
```typescript
// In WorldScene (existing pattern)
private entitySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

spawnEntity(entity: Entity): void {
  if (this.entitySprites.has(entity.id)) return;

  const sprite = this.add.sprite(/* ... */);
  this.entitySprites.set(entity.id, sprite);
}

// Object pooling for performance
private spritePool: Phaser.GameObjects.Sprite[] = [];

despawnEntity(entityId: string): void {
  const sprite = this.entitySprites.get(entityId);
  if (sprite) {
    sprite.setVisible(false).setActive(false);
    this.spritePool.push(sprite); // Reuse instead of destroy
    this.entitySprites.delete(entityId);
  }
}
```

**Why:** Simple, performant, sufficient for MMO entity counts, avoids ECS complexity until needed. Object pooling reduces garbage collection.

**Source:** [Ourcade Object Pooling Tutorial](https://blog.ourcade.co/posts/2020/phaser-3-optimization-object-pool-class/)

### Pattern 4: Socket.IO Zone-Based Rooms (Already Implemented)

**What:** Each zone is a Socket.IO room for isolated game state broadcasts.

**Implementation:** (Already in game.gateway.ts)
```typescript
// Join zone room on auth
client.join(result.player.position.zoneId);

// Zone-specific broadcasts
this.server.to(player.position.zoneId).emit('chat:message', message);

// Zone transitions
client.leave(result.oldZoneId);
client.join(result.newZoneId);
```

**Why:** Built-in Socket.IO feature, efficient server-side filtering, prevents unnecessary network traffic, isolates game state per zone.

**Source:** [Socket.IO Rooms Documentation](https://socket.io/docs/v3/rooms/), [NestJS WebSocket Guide](https://oneuptime.com/blog/post/2026-02-02-nestjs-websockets/view)

### Pattern 5: Tile Rendering with Sprite Fallbacks

**What:** Use colored rectangles as fallback when sprites missing, tile-based grid rendering.

**Implementation:**
```typescript
// In WorldScene
private createTileSprite(x: number, y: number, textureKey: string, fallbackColor: number): Phaser.GameObjects.GameObject {
  if (this.textures.exists(textureKey)) {
    return this.add.sprite(x, y, textureKey).setOrigin(0, 0);
  } else {
    // Fallback to colored rectangle
    const graphics = this.add.graphics();
    graphics.fillStyle(fallbackColor, 1);
    graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    return graphics;
  }
}
```

**Why:** Graceful degradation, allows development before art assets ready, maintains game functionality.

**Source:** [Phaser Tilemap Documentation](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/tilemap/)

### Pattern 6: Movement Validation (Client Prediction + Server Authority)

**What:** Client moves immediately for responsiveness, server validates and corrects if needed.

**Implementation:**
```typescript
// Client (apps/web/src/game/scenes/WorldScene.ts)
handleInput(dx, dy) {
  // Optimistic local update
  this.localPlayer.x += dx * TILE_SIZE;
  this.localPlayer.y += dy * TILE_SIZE;

  // Send to server for validation
  gameSocket.emit('player:move', { direction });
}

// Server corrects if validation fails
gameSocket.on('player:moved', (data) => {
  if (data.playerId === myPlayerId) {
    // Server-authoritative position
    scene.updateLocalPlayer(data.position);
  }
});
```

**Why:** Responsive feel (no input lag), prevents cheating (server validates), handles network issues gracefully.

**Source:** Existing implementation in WorldScene.ts and game.gateway.ts

## Version Compatibility Matrix

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| phaser | ^3.90.0 | react@^18.2.0 | Use EventBus for communication, avoid direct DOM manipulation conflicts |
| socket.io | ^4.8.3 | socket.io-client@^4.8.3 | MUST match client version for protocol compatibility |
| @nestjs/platform-socket.io | ^10.3.0 | socket.io@^4.7.0-4.8.x | Works with Socket.IO 4.x series |
| zustand | ^4.5.0 | react@^18.2.0, immer@^10.0.0 | Use immer middleware for nested state updates |
| typescript | ^5.9.0 | All @nestjs@^10.x, react@^18.x | Latest stable, avoid 6.0 beta until stable |

## Architecture Decision Records

### ADR-1: Use Zustand with Immer Instead of Redux

**Decision:** Stick with Zustand, add Immer middleware for nested state updates.

**Rationale:**
- Zustand already integrated, simpler API than Redux
- Immer prevents accidental mutations in entity/zone state
- No need for Redux's time-travel debugging in game context
- Less boilerplate (no actions, reducers, dispatch)

**Confidence:** HIGH (Zustand GitHub discussion, established pattern)

### ADR-2: EventBus Over Direct Scene References

**Decision:** Use Phaser EventEmitter as bridge between React and Phaser.

**Rationale:**
- Official Phaser template pattern
- Decouples React components from Phaser scene lifecycle
- Allows multiple React components to listen to same game events
- Simplifies testing (mock EventBus)

**Confidence:** HIGH (Official Phaser template)

### ADR-3: Simple Map Registry Over ECS Plugins

**Decision:** Use Map-based entity registry, defer ECS until performance issues.

**Rationale:**
- Current entity counts don't justify ECS complexity
- Phaser 4 will use bitECS natively (future migration path)
- Simpler debugging and onboarding
- Can migrate to ECS incrementally if needed

**Confidence:** MEDIUM (WebSearch, community discussions)

### ADR-4: No Separate Networking Library (Keep Socket.IO)

**Decision:** Use Socket.IO directly, no Colyseus/Photon/Liveblocks.

**Rationale:**
- Already implemented and working
- Socket.IO rooms provide zone isolation
- NestJS integration mature (@nestjs/platform-socket.io)
- Adding third-party service creates vendor lock-in

**Confidence:** HIGH (Already implemented successfully)

## What's Already Working (Don't Touch)

Based on code review of existing files:

1. **WebSocket Authentication Flow** (`game.gateway.ts`, `socket.ts`)
   - JWT token validation on connection
   - Character authentication
   - Zone room joining

2. **Zone State Sync** (`game.gateway.ts`)
   - Initial zone state on auth
   - Zone transitions with room switching
   - Player join/leave broadcasts

3. **Movement System** (`WorldScene.ts`, `game.gateway.ts`)
   - Client-side input handling
   - Server-side validation
   - Tween-based smooth movement for other players

4. **Entity Rendering** (`WorldScene.ts`)
   - Sprite-based entity system
   - Faction-based player tinting
   - Depth sorting (players at depth 10)

5. **Chat System** (`game.gateway.ts`)
   - Zone, global, whisper channels
   - Socket.IO room-based routing

## Integration Checklist

To wire post-login game experience:

- [ ] Update package versions (Phaser 3.90, Socket.IO 4.8.3, TypeScript 5.9)
- [ ] Install immer for Zustand nested state
- [ ] Create EventBus.ts in `apps/web/src/game/`
- [ ] Add immer middleware to existing gameStore.ts
- [ ] Connect socket event handlers to Zustand store updates
- [ ] Bridge Zustand updates to Phaser via EventBus
- [ ] Add sprite fallback helpers to WorldScene
- [ ] Implement object pooling for entities (optional optimization)
- [ ] Wire HUD components to EventBus for game state
- [ ] Connect character selection to gameSocket.authenticate()

## Sources

### High Confidence (Official Documentation)
- [Phaser 3.90 Changelog](https://phaser.io/news/2025/05/phaser-v390-released) — Version updates and features
- [Socket.IO 4.8.0 Changelog](https://socket.io/docs/v4/changelog/4.8.0) — Transport improvements
- [Socket.IO Rooms](https://socket.io/docs/v3/rooms/) — Zone isolation pattern
- [Phaser React Template](https://github.com/phaserjs/template-react) — EventBus pattern
- [Immer Documentation](https://immerjs.github.io/immer/) — Immutable state updates
- [NestJS WebSockets Guide](https://oneuptime.com/blog/post/2026-02-02-nestjs-websockets/view) — Gateway patterns

### Medium Confidence (Community Resources)
- [Ourcade Object Pooling](https://blog.ourcade.co/posts/2020/phaser-3-optimization-object-pool-class/) — Performance patterns
- [Zustand WebSocket Discussion](https://github.com/pmndrs/zustand/discussions/1651) — Integration patterns
- [Phaser Tilemap Notes](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/tilemap/) — Rendering patterns

### Low Confidence (Requires Validation)
- ECS patterns — Community discussions suggest deferring until Phaser 4
- Advanced rendering techniques — Need to verify Phaser 3.90 capabilities

---

**Stack research for:** Into the Void - Post-Login Game Experience
**Researched:** 2026-02-14
**Next Steps:** Phase-specific research for world generation, combat systems, crafting (if needed)
