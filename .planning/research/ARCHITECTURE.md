# Architecture Research: Post-Login Game Experience Integration

**Domain:** Multiplayer 2D MMO - Post-login game integration
**Researched:** 2026-02-14
**Confidence:** HIGH

## Integration Overview

This research focuses on how NEW post-login game features integrate with existing Into the Void architecture. The foundation is solid: NestJS game-server with Socket.IO, React client with Zustand, Phaser 3 canvas, and shared packages for types and logic.

### Existing Infrastructure (DO NOT MODIFY)

```
┌─────────────────────────────────────────────────────────────────┐
│                      EXISTING FOUNDATION                         │
├─────────────────────────────────────────────────────────────────┤
│  apps/api (NestJS)          │  JWT auth, character CRUD         │
│  apps/game-server (NestJS)  │  Socket.IO gateway + services     │
│  apps/web (React+Phaser)    │  Auth flow, character selection   │
│  packages/shared-types       │  Event interfaces, entities       │
│  packages/database          │  Drizzle schemas, queries         │
│  packages/game-logic        │  Movement validation, combat      │
│  packages/world-gen         │  Procedural chunk generation      │
└─────────────────────────────────────────────────────────────────┘
```

## Recommended Integration Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         WEB CLIENT (apps/web)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐           ┌─────────────────────────┐    │
│  │   React Layer     │ ◄────────►│    Phaser Layer         │    │
│  │                   │  EventBus │                         │    │
│  │  - HUD (UI)       │           │  - WorldScene (canvas)  │    │
│  │  - Panels         │           │  - Entity rendering     │    │
│  │  - Overlays       │           │  - Input handling       │    │
│  └─────────┬─────────┘           └───────────┬─────────────┘    │
│            │                                  │                  │
│            └────────┬─────────────────────────┘                  │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Zustand Store (gameStore.ts)                   │   │
│  │  - connection state    - player data    - UI toggles     │   │
│  │  - entity registry     - chat messages  - zone state     │   │
│  └────────────────────────────┬────────────────────────────┘    │
│                                ▼                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Socket Client (network/socket.ts)                │   │
│  │  - connection mgmt     - event handlers  - emit wrapper  │   │
│  └────────────────────────────┬────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────┘
                                  │ WebSocket (Socket.IO)
┌─────────────────────────────────┼───────────────────────────────┐
│                   GAME SERVER (apps/game-server)                 │
├─────────────────────────────────┼───────────────────────────────┤
│  ┌──────────────────────────────▼────────────────────────────┐  │
│  │         GameGateway (game/game.gateway.ts)                │  │
│  │  - auth handshake     - event routing    - room mgmt      │  │
│  └────┬────────────────────────────────────────────┬─────────┘  │
│       │                                             │            │
│       ▼                                             ▼            │
│  ┌─────────────────┐                    ┌──────────────────┐    │
│  │  PlayerService  │                    │  GameService     │    │
│  │  (in-memory)    │◄───────────────────│  (orchestrates)  │    │
│  │                 │                    │                  │    │
│  │  - auth tokens  │                    │  - movement      │    │
│  │  - socket map   │                    │  - interactions  │    │
│  │  - zone lookup  │                    │  - validation    │    │
│  └─────────┬───────┘                    └────────┬─────────┘    │
│            │                                     │              │
│            │            ┌────────────────────────┘              │
│            ▼            ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │          ZonesService (zones/zones.service.ts)          │   │
│  │  - chunk loading (lazy)   - entity registry (in-memory) │   │
│  │  - zone cleanup (5min)    - spawn point conversion      │   │
│  └───────────────────────┬─────────────────────────────────┘   │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Shared Packages (validation, generation)          │  │
│  │  @into-the-void/game-logic  - validateMovement()         │  │
│  │  @into-the-void/world-gen   - generateChunk()            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location | NEW or MODIFIED |
|-----------|----------------|----------|-----------------|
| **GameSocket** | Singleton WebSocket client, connection lifecycle, event registration | `apps/web/src/network/socket.ts` | EXISTS (extend handlers) |
| **gameStore** | Zustand store for connection state, player data, UI toggles | `apps/web/src/store/gameStore.ts` | EXISTS (add entity registry) |
| **GameGateway** | Socket.IO gateway for auth, movement, interaction events | `apps/game-server/src/game/game.gateway.ts` | EXISTS (working) |
| **WorldScene** | Phaser scene for rendering tiles, entities, players | `apps/web/src/game/scenes/WorldScene.ts` | EXISTS (placeholder, needs full impl) |
| **HUD** | React component for health, inventory, minimap | `apps/web/src/ui/hud/HUD.tsx` | EXISTS (stub, needs impl) |
| **EventBus** | Communication bridge between React and Phaser | `apps/web/src/game/EventBus.ts` | NEW |
| **NetworkSync** | Service coordinating socket events → store → scene updates | `apps/web/src/network/NetworkSync.ts` | NEW |
| **EntityRegistry** | Client-side entity management (spawn, update, despawn) | Zustand store slice or separate class | NEW |
| **InputHandler** | Keyboard/mouse → client prediction → server emit | Inside WorldScene or separate service | NEW |

## Integration Patterns

### Pattern 1: WebSocket Connection Flow

**What:** Three-phase connection handshake for authenticated game sessions.

**Implementation:**
```typescript
// Phase 1: Connect to Socket.IO server
// apps/web/src/screens/CharacterSelectScreen.tsx (after character selection)
const handleCharacterSelect = async (characterId: string) => {
  gameSocket.connect('http://localhost:3001');

  gameSocket.onConnectionStateChange((state) => {
    gameStore.setConnectionState(state);
  });

  // Wait for 'connected' state
};

// Phase 2: Send auth with JWT + characterId
// Trigger after connection established
gameSocket.on('connect', () => {
  const token = authStore.token;
  const characterId = selectedCharacter.id;

  gameSocket.authenticate(token, characterId);
});

// Phase 3: Receive initial zone state
// apps/web/src/network/NetworkSync.ts (NEW file)
gameSocket.on('auth:success', (data) => {
  gameStore.setPlayer(data.player);
  gameStore.setConnectionState('authenticated');
});

gameSocket.on('zone:state', (zoneState) => {
  // Update entity registry
  entityRegistry.loadZone(zoneState);

  // Tell Phaser scene to render
  EventBus.emit('zone:loaded', zoneState);
});
```

**When to use:** On character selection → game transition.

**Trade-offs:**
- **Pro:** Secure, validates character ownership server-side
- **Pro:** Phased state prevents rendering before data ready
- **Con:** Adds ~200-500ms to transition (acceptable)

### Pattern 2: EventBus Bridge (React ↔ Phaser)

**What:** Singleton event emitter for bidirectional communication between React components and Phaser scenes.

**Implementation:**
```typescript
// apps/web/src/game/EventBus.ts (NEW)
import { EventEmitter } from 'events';

class GameEventBus extends EventEmitter {
  private static instance: GameEventBus;

  static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  // Typed emit helpers
  emitZoneLoaded(zoneState: ZoneState) {
    this.emit('zone:loaded', zoneState);
  }

  emitPlayerMoved(position: Position) {
    this.emit('player:moved', position);
  }

  // ... other typed emitters
}

export const EventBus = GameEventBus.getInstance();

// Usage in Phaser scene
// apps/web/src/game/scenes/WorldScene.ts
create() {
  EventBus.on('zone:loaded', (zoneState) => {
    this.loadZone(zoneState.tiles, zoneState.collisions);
    zoneState.entities.forEach(e => this.spawnEntity(e));
  });
}

// Usage in React
// apps/web/src/ui/hud/HUD.tsx
useEffect(() => {
  const handlePlayerMoved = (position: Position) => {
    // Update minimap, etc.
  };

  EventBus.on('player:moved', handlePlayerMoved);
  return () => EventBus.off('player:moved', handlePlayerMoved);
}, []);
```

**When to use:** Any cross-boundary communication (React UI needs game data, Phaser needs UI events).

**Trade-offs:**
- **Pro:** Decoupled, testable, follows official Phaser-React template pattern
- **Pro:** Type-safe with helper methods
- **Con:** Global singleton (acceptable for single game instance)
- **Con:** Requires cleanup in useEffect returns

**Source:** [Official Phaser-React Template EventBus pattern](https://github.com/phaserjs/template-react)

### Pattern 3: Client-Side Prediction with Server Reconciliation

**What:** Optimistic local movement that gets validated/corrected by server.

**Implementation:**
```typescript
// apps/web/src/game/scenes/WorldScene.ts
private handleInput(time: number): void {
  if (time - this.lastMoveTime < this.moveDelay) return;

  let direction: Direction | null = null;
  if (this.cursors?.up.isDown) direction = 'n';
  // ... other directions

  if (direction) {
    // CLIENT PREDICTION: Move immediately for responsiveness
    const currentPos = gameStore.player.position;
    const predictedPos = calculateNewPosition(currentPos, direction);

    // Validate locally (collision check with known map)
    const valid = validateMovement(currentPos, predictedPos, this.collisionMap);

    if (valid.valid) {
      // Update local sprite immediately
      this.updateLocalPlayer(predictedPos);

      // Send to server for validation
      gameSocket.emit('player:move', { direction });

      this.lastMoveTime = time;
    }
  }
}

// SERVER RECONCILIATION: Correct if server disagrees
// apps/web/src/network/NetworkSync.ts
gameSocket.on('player:moved', ({ playerId, position }) => {
  if (playerId === gameStore.player.id) {
    // Server confirmed our move, or corrected it
    gameStore.updatePlayerPosition(position);
    EventBus.emit('player:position-confirmed', position);
  } else {
    // Other player moved
    EventBus.emit('remote-player:moved', { playerId, position });
  }
});

gameSocket.on('error', ({ code, message }) => {
  if (code === 'MOVEMENT_BLOCKED') {
    // Server rejected movement, revert to last confirmed position
    const confirmedPos = gameStore.player.position;
    EventBus.emit('player:position-corrected', confirmedPos);
  }
});
```

**When to use:** All player movement (critical for responsive feel).

**Trade-offs:**
- **Pro:** Feels instant (no network lag perceived)
- **Pro:** Server authority prevents cheating
- **Con:** Occasional "rubber-banding" on lag spikes (unavoidable in authoritative server)
- **Con:** Requires collision map on client (already available from zone:state)

**Source:** [Client-Side Prediction and Server Reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)

### Pattern 4: Entity Registry with Object Pooling

**What:** Centralized entity management with reusable sprite pools for performance.

**Implementation:**
```typescript
// apps/web/src/game/EntityRegistry.ts (NEW)
import { Entity } from '@into-the-void/shared-types';
import Phaser from 'phaser';

export class EntityRegistry {
  private entities: Map<string, Entity> = new Map();
  private sprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private pools: Map<string, Phaser.GameObjects.Sprite[]> = new Map();
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  spawn(entity: Entity): void {
    this.entities.set(entity.id, entity);

    // Try to get from pool first
    const poolKey = entity.type;
    let sprite = this.pools.get(poolKey)?.pop();

    if (!sprite) {
      // Create new if pool empty
      sprite = this.scene.add.sprite(0, 0, this.getTexture(entity.type));
    }

    // Position and activate
    sprite.setPosition(entity.position.x * 32 + 16, entity.position.y * 32 + 16);
    sprite.setActive(true);
    sprite.setVisible(true);

    this.sprites.set(entity.id, sprite);
  }

  despawn(entityId: string): void {
    const sprite = this.sprites.get(entityId);
    const entity = this.entities.get(entityId);

    if (sprite && entity) {
      // Deactivate and return to pool
      sprite.setActive(false);
      sprite.setVisible(false);

      const poolKey = entity.type;
      if (!this.pools.has(poolKey)) {
        this.pools.set(poolKey, []);
      }
      this.pools.get(poolKey)!.push(sprite);

      this.sprites.delete(entityId);
      this.entities.delete(entityId);
    }
  }

  update(entityId: string, changes: Partial<Entity>): void {
    const entity = this.entities.get(entityId);
    const sprite = this.sprites.get(entityId);

    if (entity && sprite && changes.position) {
      Object.assign(entity, changes);

      // Smooth movement with tween
      this.scene.tweens.add({
        targets: sprite,
        x: changes.position.x * 32 + 16,
        y: changes.position.y * 32 + 16,
        duration: 100,
        ease: 'Linear',
      });
    }
  }

  getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId);
  }

  private getTexture(type: string): string {
    // Map entity type to sprite texture
    return type; // Assumes texture keys match entity types
  }
}

// Usage in WorldScene
// apps/web/src/game/scenes/WorldScene.ts
create() {
  this.entityRegistry = new EntityRegistry(this);

  // Network events
  EventBus.on('entity:spawn', (entity) => this.entityRegistry.spawn(entity));
  EventBus.on('entity:despawn', ({ entityId }) => this.entityRegistry.despawn(entityId));
  EventBus.on('entity:update', ({ entityId, changes }) =>
    this.entityRegistry.update(entityId, changes)
  );
}
```

**When to use:** Managing all non-player entities (creatures, minerals, items).

**Trade-offs:**
- **Pro:** Object pooling prevents FPS drops (35-40 FPS → stable 60 FPS with 3x entities per benchmarks)
- **Pro:** Centralized entity state, easier debugging
- **Con:** Slight memory overhead for pool (negligible)
- **Con:** Extra abstraction layer (worth it for performance)

**Source:** [Phaser 3 Object Pooling Performance](https://blog.ourcade.co/posts/2020/phaser-3-optimization-object-pool-basic/)

### Pattern 5: Zone-Based Socket.IO Rooms

**What:** Players auto-subscribe to zone rooms for efficient broadcast of position updates.

**Implementation:**
```typescript
// apps/game-server/src/game/game.gateway.ts (EXISTING, already implemented)
@SubscribeMessage('auth')
async handleAuth(client: Socket, data: AuthRequest) {
  const result = await this.playerService.authenticate(/*...*/);

  if (result.success && result.player) {
    // JOIN ZONE ROOM (already implemented)
    client.join(result.player.position.zoneId);

    // Send zone state
    const zoneState = await this.gameService.getZoneState(
      result.player.position.zoneId
    );
    client.emit('zone:state', zoneState);

    // Notify other players in zone
    client.to(result.player.position.zoneId).emit('player:joined', {/*...*/});
  }
}

@SubscribeMessage('player:move')
async handleMove(client: Socket, data: ClientEvents['player:move']) {
  const result = await this.gameService.movePlayer(/*...*/);

  if (result.success) {
    if (result.oldZoneId && result.newZoneId) {
      // ZONE TRANSITION (already implemented)
      client.leave(result.oldZoneId);
      client.join(result.newZoneId);

      // Different broadcasts to old/new zone
      this.server.to(result.oldZoneId).emit('player:left', {/*...*/});
      this.server.to(result.newZoneId).emit('player:joined', {/*...*/});
    } else {
      // SAME ZONE (already implemented)
      this.server.to(result.zoneId!).emit('player:moved', {/*...*/});
    }
  }
}
```

**When to use:** All zone-scoped broadcasts (movement, chat:zone, combat).

**Trade-offs:**
- **Pro:** Scalable (players only receive updates for nearby entities)
- **Pro:** Built into Socket.IO, no custom filtering
- **Con:** Zone transitions require room switch (handled automatically)

**Already implemented in existing code.**

**Source:** [Socket.IO Rooms Documentation](https://socket.io/docs/v4/rooms/)

## Data Flow

### Connection Flow

```
[Character Select Screen]
    │
    ├─ 1. User clicks character
    │
    ▼
[gameSocket.connect('ws://localhost:3001')]
    │
    ├─ 2. Engine.IO handshake (HTTP long-polling → WebSocket upgrade)
    │
    ▼
[gameSocket.on('connect')]
    │
    ├─ 3. Emit 'auth' event with { token, characterId }
    │
    ▼
[GameGateway.handleAuth()]
    │
    ├─ 4a. Verify JWT token
    ├─ 4b. Check character ownership in database
    ├─ 4c. Load character data
    ├─ 4d. Create ConnectedPlayer in PlayerService (in-memory)
    ├─ 4e. Join zone room: client.join(zoneId)
    │
    ▼
[Client receives 'auth:success' + 'zone:state']
    │
    ├─ 5a. gameStore.setPlayer(player)
    ├─ 5b. gameStore.setConnectionState('authenticated')
    ├─ 5c. Navigate to /game route
    │
    ▼
[GameContainer mounts, initializes Phaser]
    │
    ├─ 6a. NetworkSync.initialize() registers all event handlers
    ├─ 6b. WorldScene.create() sets up entity registry
    ├─ 6c. EventBus emits 'zone:loaded' → WorldScene renders tiles/entities
    │
    ▼
[GAME READY]
```

### Movement Flow (with Client Prediction)

```
[User presses WASD]
    │
    ▼
[WorldScene.handleInput()]
    │
    ├─ 1. Calculate new position (game-logic/calculateNewPosition)
    ├─ 2. Validate locally (game-logic/validateMovement with client collision map)
    │
    ▼
[IF VALID]
    │
    ├─ 3a. Update local sprite immediately (optimistic)
    ├─ 3b. Emit 'player:move' with direction
    │
    ▼
[GameGateway.handleMove()]
    │
    ├─ 4a. Get player from PlayerService (socket → playerId lookup)
    ├─ 4b. Calculate new position (server-side)
    ├─ 4c. Get collision map from ZonesService
    ├─ 4d. Validate movement (authoritative)
    │
    ▼
[IF SERVER VALID]
    │
    ├─ 5a. Update PlayerService in-memory position
    ├─ 5b. Broadcast to zone: 'player:moved' { playerId, position }
    │
    ▼
[Client receives 'player:moved']
    │
    ├─ 6a. If own player: confirm position (or correct if different)
    ├─ 6b. If other player: update remote player sprite via EventBus
    │
    ▼
[Phaser renders smooth movement]

[IF SERVER INVALID]
    │
    ├─ 5. Emit 'error' { code: 'MOVEMENT_BLOCKED', message }
    │
    ▼
[Client receives 'error']
    │
    ├─ 6. Revert local sprite to last confirmed position
    ├─ 7. Optional: Show error feedback to user
```

### Entity Sync Flow

```
[Zone loaded or entity spawned]
    │
    ▼
[Server emits 'entity:spawn' to zone room]
    │
    ├─ Contains: Entity { id, type, position, ... }
    │
    ▼
[NetworkSync handles 'entity:spawn']
    │
    ├─ 1. Add to client-side entity registry (Zustand or EntityRegistry class)
    ├─ 2. EventBus.emit('entity:spawn', entity)
    │
    ▼
[WorldScene receives 'entity:spawn' via EventBus]
    │
    ├─ 3. entityRegistry.spawn(entity)
    │   ├─ Get sprite from pool or create new
    │   ├─ Position sprite at entity.position
    │   ├─ Set texture based on entity.type
    │
    ▼
[Entity rendered on canvas]

[Entity updated/interacted with]
    │
    ▼
[Server emits 'entity:update' { entityId, changes }]
    │
    ▼
[NetworkSync + EventBus → entityRegistry.update()]
    │
    ├─ Tween sprite to new position (smooth animation)
    │
    ▼
[Entity despawned (harvested/picked up)]
    │
    ▼
[Server emits 'entity:despawn' { entityId }]
    │
    ▼
[entityRegistry.despawn(entityId)]
    │
    ├─ Hide sprite, return to pool
    ├─ Remove from registry
```

## Recommended Project Structure (NEW Files)

```
apps/web/src/
├── network/
│   ├── socket.ts              # EXISTS - extend event handlers
│   └── NetworkSync.ts         # NEW - coordinates socket → store → EventBus
│
├── game/
│   ├── Game.ts                # EXISTS - Phaser game instance
│   ├── EventBus.ts            # NEW - React ↔ Phaser bridge
│   ├── EntityRegistry.ts      # NEW - client entity management with pooling
│   │
│   └── scenes/
│       ├── BootScene.ts       # EXISTS - initial boot
│       ├── PreloadScene.ts    # EXISTS - asset loading
│       └── WorldScene.ts      # EXISTS - expand with full impl
│
├── store/
│   ├── gameStore.ts           # EXISTS - add entity registry slice
│   ├── authStore.ts           # EXISTS - no changes needed
│   └── characterStore.ts      # EXISTS - no changes needed
│
├── screens/
│   ├── CharacterSelectScreen.tsx  # MODIFY - add socket connection on select
│   └── GameScreen.tsx             # NEW - container for game + HUD
│
├── ui/
│   └── hud/
│       ├── HUD.tsx            # EXISTS - implement health, inventory, minimap
│       ├── HealthBar.tsx      # NEW - player health display
│       ├── Minimap.tsx        # NEW - zone overview
│       └── QuickSlots.tsx     # NEW - hotbar for items/abilities

apps/game-server/src/
├── game/
│   ├── game.gateway.ts        # EXISTS - working, may add more event handlers
│   ├── game.service.ts        # EXISTS - working, may add more interactions
│   ├── player.service.ts      # EXISTS - working, in-memory player map
│   └── game.module.ts         # EXISTS - NestJS module wiring
│
└── zones/
    ├── zones.service.ts       # EXISTS - working, lazy chunk loading
    └── zones.module.ts        # EXISTS - NestJS module wiring

packages/
├── shared-types/src/
│   └── network/
│       └── events.ts          # EXISTS - may add more event types as needed
│
├── game-logic/src/
│   └── movement/
│       └── validation.ts      # EXISTS - already used by server
│
└── world-gen/src/
    └── generation/
        └── chunk.ts           # EXISTS - already used by ZonesService
```

### Structure Rationale

- **network/NetworkSync.ts:** Centralized event handler registration prevents scattered socket.on() calls across components. Single source of truth for socket → store → EventBus coordination.

- **game/EventBus.ts:** Official Phaser-React template pattern. Decouples React from Phaser internals, allows HUD to react to game events without direct references.

- **game/EntityRegistry.ts:** Separation of concerns - entity data management separate from rendering logic. Makes testing easier, enables object pooling without polluting WorldScene.

- **screens/GameScreen.tsx:** Container component that renders both Phaser canvas and React HUD overlay. Manages mount/unmount lifecycle.

## Scaling Considerations

| Concurrent Players | Architecture Adjustments |
|-------------------|--------------------------|
| 0-100 players | **Current architecture sufficient.** Single game-server instance, in-memory state, zones cleanup after 5min inactivity. |
| 100-500 players | **Add Redis for pub/sub.** Player state still in-memory per server, but zone broadcasts via Redis pub/sub allow horizontal scaling (multiple game-server instances). LoadBalancer distributes WebSocket connections. |
| 500-2000 players | **Add zone-to-server affinity.** Each game-server instance owns specific zones. Players routed to correct server on auth. Reduces memory (each server only loads active zones). |
| 2000+ players | **Dedicated zone servers.** Separate services: auth-server, zone-server cluster, matchmaking. Database writes queued. Consider spatial hashing within zones for very dense areas. |

### Scaling Priorities

1. **First bottleneck (200-300 players):** Memory exhaustion from loading all zones. **Fix:** Already addressed with ZonesService cleanup (5min TTL), can reduce to 2min if needed.

2. **Second bottleneck (500+ players):** Single Socket.IO server CPU limit. **Fix:** Horizontal scaling with Redis adapter (minimal code change, mostly config).

## Anti-Patterns

### Anti-Pattern 1: Direct Phaser Scene Access from React

**What people do:** Store Phaser scene reference in React state, call scene methods directly from components.

```typescript
// BAD - React tightly coupled to Phaser internals
const [scene, setScene] = useState<WorldScene | null>(null);

const handleInventoryOpen = () => {
  scene?.pauseGame(); // Direct method call
  setShowInventory(true);
};
```

**Why it's wrong:** Violates separation of concerns, makes React components untestable without Phaser instance, prevents hot-reload.

**Do this instead:** Use EventBus for all cross-boundary communication.

```typescript
// GOOD - Decoupled via EventBus
const handleInventoryOpen = () => {
  EventBus.emit('game:pause');
  setShowInventory(true);
};

// WorldScene listens
EventBus.on('game:pause', () => {
  this.scene.pause();
});
```

### Anti-Pattern 2: Storing Entire Game State in Zustand

**What people do:** Put collision maps, full entity objects, sprite references in Zustand store.

```typescript
// BAD - Zustand bloated with render data
interface GameState {
  collisionMaps: Map<string, boolean[][]>; // Huge memory
  entitySprites: Map<string, Phaser.GameObjects.Sprite>; // Not serializable
  allEntities: Entity[]; // Duplicate of server data
}
```

**Why it's wrong:** Zustand is for React state, not game engine data. Phaser sprite references break serialization, cause memory leaks. Full collision maps waste memory.

**Do this instead:** Store only what React needs, keep game data in Phaser/EntityRegistry.

```typescript
// GOOD - Minimal store, data ownership clear
interface GameState {
  player: Player | null; // React needs this for HUD
  connectionState: ConnectionState; // React needs this for UI
  showInventory: boolean; // UI toggle
  chatMessages: ChatMessage[]; // React renders chat
  // NOT: collision maps, sprites, full entity list
}

// EntityRegistry (in Phaser layer) owns entity sprites and data
// WorldScene owns collision map
```

### Anti-Pattern 3: No Client Prediction (Wait for Server)

**What people do:** Wait for server confirmation before moving player sprite.

```typescript
// BAD - Feels laggy (100-200ms perceived delay)
handleInput() {
  if (this.cursors.up.isDown) {
    gameSocket.emit('player:move', { direction: 'n' });
    // Wait for 'player:moved' event to update sprite
  }
}
```

**Why it's wrong:** User perceives 100-200ms input lag (network RTT). Feels unresponsive, especially noticeable in movement-heavy gameplay.

**Do this instead:** Move immediately (optimistic), let server correct if needed.

```typescript
// GOOD - Instant feedback
handleInput() {
  if (this.cursors.up.isDown) {
    const newPos = calculateNewPosition(this.player.position, 'n');

    if (validateMovement(this.player.position, newPos, this.collisionMap).valid) {
      this.updateLocalPlayer(newPos); // Immediate
      gameSocket.emit('player:move', { direction: 'n' }); // Parallel
    }
  }
}

// Server will confirm or correct via 'player:moved' or 'error'
```

### Anti-Pattern 4: Creating/Destroying Sprites Every Frame

**What people do:** Create new sprite on entity spawn, destroy on despawn without pooling.

```typescript
// BAD - FPS drops from garbage collection
spawnEntity(entity: Entity) {
  const sprite = this.add.sprite(x, y, texture); // New allocation
  this.entitySprites.set(entity.id, sprite);
}

despawnEntity(entityId: string) {
  this.entitySprites.get(entityId)?.destroy(); // Memory freed, but GC spike
  this.entitySprites.delete(entityId);
}
```

**Why it's wrong:** Frequent allocation/deallocation triggers garbage collection, causing FPS drops (35-40 FPS in benchmarks). Noticeable with 50+ entities respawning.

**Do this instead:** Object pooling (reuse sprites).

```typescript
// GOOD - Stable 60 FPS with 3x more entities
despawnEntity(entityId: string) {
  const sprite = this.entitySprites.get(entityId);
  sprite.setActive(false).setVisible(false); // Hide, don't destroy
  this.pool.get(entity.type)!.push(sprite); // Return to pool
}

spawnEntity(entity: Entity) {
  let sprite = this.pool.get(entity.type)?.pop(); // Reuse
  if (!sprite) sprite = this.add.sprite(0, 0, texture); // Create if pool empty
  sprite.setActive(true).setVisible(true).setPosition(x, y);
}
```

**Source:** [Phaser 3 Object Pooling Performance](https://blog.ourcade.co/posts/2020/phaser-3-optimization-object-pool-basic/)

## Integration Points

### External Services

| Service | Integration Pattern | Already Configured? |
|---------|---------------------|---------------------|
| **Socket.IO (game-server)** | WebSocket at `ws://localhost:3001`, auth via JWT in `auth` event | YES - GameGateway exists |
| **REST API (auth/characters)** | HTTP at `http://localhost:3000`, JWT in Authorization header | YES - used in character select |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **React ↔ Phaser** | EventBus (event emitter) | NEW - need to create EventBus.ts |
| **NetworkSync ↔ Zustand** | Direct store mutations (NetworkSync imports gameStore) | NEW - NetworkSync.ts will coordinate |
| **NetworkSync ↔ EventBus** | EventBus.emit() after store updates | NEW - passes data to Phaser layer |
| **Phaser ↔ Socket** | Via NetworkSync (no direct socket import in scenes) | NEW - keeps scenes decoupled from network |
| **GameGateway ↔ Services** | NestJS dependency injection | EXISTS - already wired |
| **GameService ↔ ZonesService** | Direct service calls (DI) | EXISTS - already working |
| **Client ↔ game-logic package** | Import functions (validateMovement, calculateNewPosition) | EXISTS - client needs to add import |
| **Client ↔ shared-types package** | Import types (Entity, ZoneState, Events) | EXISTS - already used |

## Build Order for Implementation

Based on dependency graph, recommended order:

### Phase 1: Foundation (Can build in parallel)
1. **EventBus.ts** - No dependencies, needed by all other components
2. **EntityRegistry.ts** - Only depends on Phaser + shared-types
3. **Extend gameStore** - Add entity registry slice, zone state

### Phase 2: Network Layer (Depends on Phase 1)
4. **NetworkSync.ts** - Depends on EventBus, gameStore, socket
5. **Extend socket.ts** - Register new event handlers (entity:spawn, etc.)

### Phase 3: Scenes (Depends on Phase 1 & 2)
6. **WorldScene full implementation** - Depends on EventBus, EntityRegistry, NetworkSync
7. **GameScreen.tsx** - Container for Phaser + HUD, triggers NetworkSync.initialize()

### Phase 4: UI (Depends on Phase 3)
8. **HUD implementation** - Health, minimap, hotbar - depends on EventBus for game state
9. **Modify CharacterSelectScreen** - Add socket.connect() on character select

### Phase 5: Server Enhancements (As needed)
10. **Add event handlers to GameGateway** - If new interactions need server events

**Critical path:** EventBus → NetworkSync → WorldScene → GameScreen

**Parallel work:** EntityRegistry can be built alongside NetworkSync, HUD components can be stubbed early.

## Sources

**Architecture Patterns:**
- [Phaser-React Official Template](https://github.com/phaserjs/template-react) - EventBus pattern, React-Phaser bridge
- [Building an MMO browser game with Socket.IO](https://medium.com/@folkertjanvanderpol/building-an-mmo-browser-game-with-socket-io-part-1-foundation-44676f2a7177) - Zone-based room pattern

**Client-Side Prediction:**
- [Client-Side Prediction and Server Reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) - Authoritative server with optimistic client
- [Fast-Paced Multiplayer: Entity Interpolation](https://www.gabrielgambetta.com/entity-interpolation.html) - Smooth remote entity movement

**Performance Optimization:**
- [Phaser 3 Object Pooling](https://blog.ourcade.co/posts/2020/phaser-3-optimization-object-pool-basic/) - Entity sprite pooling, FPS benchmarks
- [How I optimized my Phaser 3 action game (2025)](https://phaser.io/news/2025/03/how-i-optimized-my-phaser-3-action-game-in-2025) - Recent optimization patterns

**Socket.IO Patterns:**
- [Socket.IO Rooms Documentation](https://socket.io/docs/v3/rooms/) - Zone subscription via rooms
- [How to use authentication in Web PubSub for Socket.IO](https://learn.microsoft.com/en-us/azure/azure-web-pubsub/socketio-authentication) - JWT auth flow

**State Management:**
- [Phaser Data Manager](https://docs.phaser.io/phaser/concepts/data-manager) - Phaser registry vs scene data
- [How to use Phaser with React and Redux](https://morethancodingwithdario.hashnode.dev/how-to-use-phaser-with-react-and-redux) - State bridge patterns

---
*Architecture research for: Into the Void - Post-Login Game Integration*
*Researched: 2026-02-14*
*Confidence: HIGH (existing codebase examined + current best practices verified)*
