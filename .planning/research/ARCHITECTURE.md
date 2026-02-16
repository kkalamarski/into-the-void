# Architecture Research: Infinite World Chunk Streaming

**Domain:** Multiplayer 2D Infinite World Game with Chunk Streaming
**Researched:** 2026-02-16
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Phaser)                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ ChunkManager │  │ TileRenderer │  │ ViewportCuller│              │
│  │  - tracks    │  │  - renders   │  │  - culls     │              │
│  │  - requests  │  │  - caches    │  │  - optimizes │              │
│  │  - unloads   │  │  sprites     │  │  rendering   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                       │
│         └─────────────────┴──────────────────┘                       │
│                           │                                          │
├───────────────────────────┼──────────────────────────────────────────┤
│                     WebSocket (Socket.IO)                            │
├───────────────────────────┼──────────────────────────────────────────┤
│                         SERVER (NestJS)                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ GameGateway  │  │ ZonesService │  │ WorldGenerator│              │
│  │  - handles   │  │  - caches    │  │  - biome     │              │
│  │  - routes    │  │  - unloads   │  │  - terrain   │              │
│  │  chunk reqs  │  │  old zones   │  │  - structures│              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
├─────────────────────────────────────────────────────────────────────┤
│                    WORLD GENERATION (packages)                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  BiomeGenerator → TerrainGenerator → StructureGenerator     │    │
│  │  (noise layers)    (tiles+heights)    (features)            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **ChunkManager (client)** | Track viewport, request chunks from server, cache loaded chunks, unload distant chunks | Map-based cache with state tracking (loading/loaded/failed) |
| **ViewportCuller (client)** | Calculate visible tiles based on camera, hide/show tiles dynamically | Frustum culling using camera bounds + padding |
| **TileRenderer (client)** | Create Phaser sprites/graphics for tiles, apply elevations, handle isometric projection | Container-based rendering with depth sorting |
| **GameGateway (server)** | Handle WebSocket events for chunk requests, route to ZonesService | NestJS WebSocket gateway with event handlers |
| **ZonesService (server)** | Cache generated chunks, lazy-load on demand, cleanup old zones | Map-based cache with LRU cleanup (5min TTL) |
| **WorldGenerator (server)** | Generate chunks deterministically from seed, apply biome noise layers | Simplex noise with multiple octaves (fbm) |
| **BiomeGenerator (server)** | Generate temperature/moisture/elevation noise fields | 3 separate noise instances with different scales |

## Recommended Project Structure

### EXISTING Structure (No Changes)
```
packages/
├── world-gen/              # Already contains biome + chunk generation
│   ├── noise/simplex.ts    # Simplex noise implementation (existing)
│   ├── generation/
│   │   ├── biome.ts        # BiomeGenerator (existing) ✓
│   │   ├── chunk.ts        # WorldGenerator (existing) ✓
│   │   ├── terrain.ts      # Terrain generation (existing)
│   │   └── structures.ts   # Structure generation (existing)
│
├── tiles/                  # Tile definitions (existing)
│   ├── registry.ts         # TileRegistry singleton (existing) ✓
│   └── definitions/        # Biome-specific tiles (existing)
│
apps/
├── web/                    # Client (existing)
│   └── game/
│       ├── rendering/
│       │   ├── ChunkManager.ts       # Chunk lifecycle (existing) ✓
│       │   ├── TileRenderer.ts       # Tile rendering (existing) ✓
│       │   └── ViewportCuller.ts     # Culling (existing) ✓
│       └── scenes/
│           └── WorldScene.ts         # Main scene (existing) ✓
│
└── game-server/            # Server (existing)
    ├── game/
    │   └── game.gateway.ts          # WebSocket handler (existing) ✓
    └── zones/
        └── zones.service.ts         # Zone caching (existing) ✓
```

### NEW Components Required

**NONE** - All required architecture already exists. The milestone only requires:
1. **Biome noise integration** - Already implemented in BiomeGenerator
2. **Chunk streaming** - Already implemented in ChunkManager + GameGateway
3. **Viewport-based loading** - Already implemented with zone:request event

### Integration Points to Activate

The architecture is **already built**, but currently operates in **single-zone mode**. To enable infinite world:

| Location | Current State | Needs Activation |
|----------|---------------|------------------|
| `ChunkManager.updateChunks()` | Loads 3x3 grid around player | ✓ Already correct |
| `zone:request` event | Implemented in GameGateway | ✓ Already correct |
| `BiomeGenerator` | Generates biomes from noise | ✓ Already correct |
| `WorldGenerator.generateChunk()` | Deterministic generation | ✓ Already correct |
| `ZonesService` | Caches + cleans up old zones | ✓ Already correct |

**The system is fully architected** - it just needs the initial zone to be treated as chunk (0,0) instead of a standalone zone.

## Architectural Patterns

### Pattern 1: Viewport-Based Chunk Loading

**What:** Load only chunks within N tiles of player viewport, unload when player moves away

**When to use:** Any infinite world game where entire world can't fit in memory

**Trade-offs:**
- **Pros:** Constant memory usage regardless of world size, seamless exploration
- **Cons:** Network latency when crossing chunk boundaries, need chunk caching strategy

**Example:**
```typescript
// ChunkManager.updateChunks() - ALREADY IMPLEMENTED
updateChunks(playerZoneId: string): void {
  const { x: playerX, y: playerY } = this.parseZoneId(playerZoneId);

  // Calculate required chunks (3x3 grid)
  const requiredChunks = new Set<string>();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const zoneId = this.createZoneId(playerX + dx, playerY + dy);
      requiredChunks.add(zoneId);
    }
  }

  // Request new chunks
  requiredChunks.forEach(zoneId => {
    if (!this.chunkStates.has(zoneId)) {
      this.requestChunk(zoneId); // Triggers zone:request event
    }
  });

  // Unload distant chunks
  this.loadedChunks.forEach((_, zoneId) => {
    if (!requiredChunks.has(zoneId)) {
      this.unloadChunk(zoneId);
    }
  });
}
```

### Pattern 2: Deterministic Chunk Generation

**What:** Generate same chunk data every time from world seed + coordinates, no database needed

**When to use:** Procedural worlds where terrain is mathematically defined, infinite storage impossible

**Trade-offs:**
- **Pros:** Zero storage cost, infinite world size, instant "regeneration" of same chunk
- **Cons:** Can't modify terrain permanently (unless you store deltas), CPU cost on first generation

**Example:**
```typescript
// WorldGenerator - ALREADY IMPLEMENTED
class WorldGenerator {
  private biomeGenerator: BiomeGenerator;

  constructor(worldSeed: string) {
    this.biomeGenerator = new BiomeGenerator(worldSeed);
  }

  generateChunk(chunkX: number, chunkY: number): ChunkData {
    // Same seed + coords = same result always
    const biome = this.biomeGenerator.getChunkBiome(chunkX, chunkY, ZONE_SIZE);
    const { tiles, heights, collisions } = generateTerrain(
      this.worldSeed,
      chunkX,
      chunkY,
      biome
    );
    // ... structures, spawns
    return { zoneId: `z_${chunkX}_${chunkY}`, tiles, heights, ... };
  }
}
```

### Pattern 3: Multi-Layer Noise Biome System

**What:** Combine multiple noise functions (temperature, moisture, elevation) to determine biome at each point

**When to use:** Realistic biome transitions, avoid hard boundaries, support smooth gradients

**Trade-offs:**
- **Pros:** Natural-looking world, smooth transitions, realistic climate zones
- **Cons:** More computation than simple random biomes, harder to guarantee specific biome placement

**Example:**
```typescript
// BiomeGenerator - ALREADY IMPLEMENTED
class BiomeGenerator {
  private temperatureNoise: SimplexNoise;
  private moistureNoise: SimplexNoise;
  private elevationNoise: SimplexNoise;

  getBiome(worldX: number, worldY: number): BiomeType {
    const temp = this.getTemperature(worldX, worldY);      // 0-1
    const moisture = this.getMoisture(worldX, worldY);     // 0-1
    const elevation = this.getElevation(worldX, worldY);   // 0-1

    // High elevation = special biomes
    if (elevation > 0.8) {
      if (temp < 0.3) return 'frozen_expanse';
      if (temp > 0.7) return 'volcanic_ridge';
      return 'ancient_ruins';
    }

    // Temperate zones based on temp/moisture
    if (temp < 0.3) return 'frozen_expanse';
    if (temp > 0.7 && moisture < 0.3) return 'volcanic_ridge';
    // ... more biome rules
  }
}
```

### Pattern 4: Server-Side Chunk Cache with LRU Cleanup

**What:** Cache generated chunks on server to avoid regenerating every request, clean up old unused chunks

**When to use:** Multiplayer games where chunk generation is expensive, multiple players may need same chunk

**Trade-offs:**
- **Pros:** Faster chunk delivery to clients, reduced CPU usage, consistent entity state
- **Cons:** Memory usage grows with active area, need cleanup strategy, cache invalidation complexity

**Example:**
```typescript
// ZonesService - ALREADY IMPLEMENTED
@Injectable()
export class ZonesService {
  private zones: Map<string, ZoneState> = new Map();

  async getChunk(zoneId: string): Promise<ChunkData> {
    let zoneState = this.zones.get(zoneId);

    if (!zoneState) {
      zoneState = this.loadZone(zoneId); // Generate + cache
    }

    zoneState.lastAccessed = Date.now();
    return zoneState.chunk;
  }

  private cleanupUnusedZones(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [zoneId, state] of this.zones.entries()) {
      if (now - state.lastAccessed > maxAge) {
        if (zoneId !== 'z_0_0') { // Keep spawn zone
          this.zones.delete(zoneId);
        }
      }
    }
  }
}
```

### Pattern 5: WebSocket Chunk Streaming

**What:** Use persistent WebSocket connection to stream chunks on demand as player moves

**When to use:** Real-time multiplayer games where HTTP request overhead is too high

**Trade-offs:**
- **Pros:** Low latency, bidirectional communication, server can push updates
- **Cons:** Maintain connection state, need reconnection logic, harder to scale than HTTP

**Example:**
```typescript
// GameGateway - ALREADY IMPLEMENTED
@SubscribeMessage('zone:request')
async handleZoneRequest(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { zoneId: string }
) {
  const player = this.playerService.getPlayerBySocket(client.id);
  if (!player) return;

  // Get chunk data (cached or generate)
  const zoneState = await this.gameService.getZoneState(data.zoneId);

  // Send only chunk + biome (not players/entities for adjacent zones)
  client.emit('zone:chunk', {
    chunk: zoneState.chunk,
    biome: zoneState.biome,
  });
}
```

## Data Flow

### Chunk Request Flow

```
Player moves to edge of loaded area
    ↓
ChunkManager.updateChunks() detects missing chunk
    ↓
requestChunk() → emit('zone:request', { zoneId: 'z_1_2' })
    ↓
[WebSocket] → GameGateway.handleZoneRequest()
    ↓
GameService.getZoneState() → ZonesService.getChunk()
    ↓
ZonesService checks cache → MISS → loadZone()
    ↓
loadZone() → generateChunk() → WorldGenerator
    ↓
WorldGenerator:
  - BiomeGenerator.getChunkBiome() (noise layers)
  - generateTerrain() (tiles + heights + collisions)
  - generateStructures() (features)
  - generateSpawnPoints() (entities)
    ↓
Return ChunkData to ZonesService (cache it)
    ↓
ZonesService returns to GameService
    ↓
GameGateway emits 'zone:chunk' event
    ↓
[WebSocket] → Client receives zone:chunk
    ↓
ChunkManager.receiveChunk() → store + render
    ↓
renderChunk() → TileRenderer creates sprites
    ↓
ViewportCuller optimizes visibility
```

### Biome Noise Generation Flow

```
WorldGenerator.generateChunk(x, y)
    ↓
BiomeGenerator.getChunkBiome(x, y, ZONE_SIZE)
    ↓
Calculate chunk center: centerX = x * 32 + 16, centerY = y * 32 + 16
    ↓
BiomeGenerator.getBiome(centerX, centerY)
    ↓
Parallel noise sampling:
  - temperatureNoise.fbm(x * 0.005, y * 0.005, 4 octaves)
  - moistureNoise.fbm(x * 0.007, y * 0.007, 4 octaves)
  - elevationNoise.fbm(x * 0.003, y * 0.003, 6 octaves)
    ↓
Normalize to 0-1 range
    ↓
Apply biome rules:
  - elevation > 0.8 → high altitude biomes
  - elevation < 0.2 → low altitude biomes
  - else: temp/moisture matrix
    ↓
Return BiomeType (e.g., 'volcanic_ridge')
```

### Client Chunk Cache Management

```
ChunkManager maintains:
  - loadedChunks: Map<zoneId, LoadedChunk>
  - chunkStates: Map<zoneId, 'loading' | 'loaded' | 'failed'>

On player movement:
  1. Calculate required chunks (3x3 grid around player)
  2. Request missing chunks (set state = 'loading')
  3. Unload distant chunks (remove from maps, destroy sprites)

On chunk received:
  1. Update state to 'loaded'
  2. Store chunk data
  3. Call onChunkLoaded callback → renderChunk()

Timeout handling:
  - 10 second timeout per chunk
  - On timeout: mark 'failed', log warning
  - Client can retry by moving away and back
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-100 players** | Current architecture is perfect. Single NestJS server, in-memory chunk cache, 3x3 chunk loading (9 chunks per player = ~900 chunks max). Memory: ~10KB per chunk = 9MB for all players. |
| **100-1000 players** | Add Redis for chunk cache sharing across server instances. Use Socket.IO Redis adapter for multi-server WebSocket support. Horizontal scaling: 1 server per ~200 players. Memory becomes stateless (Redis holds it). |
| **1000-10000 players** | Shard world by regions (e.g., x coordinate ranges). Each server handles specific world regions. Redis Cluster for distributed cache. Consider chunk pre-generation for popular areas. Add CDN for static chunk data if chunks rarely change. |
| **10000+ players** | Dedicated chunk generation service (microservice). Separate WebSocket gateway servers from game logic servers. Message queue (Kafka/RabbitMQ) for chunk requests. Database persistence for modified chunks (player edits). Consider read replicas for chunk data. |

### Scaling Priorities

1. **First bottleneck:** Memory usage from chunk cache (100-500 players)
   - **Fix:** Move chunk cache to Redis, share across servers
   - **Cost:** Add Redis server (~$20/mo for managed service)
   - **Benefit:** Near-infinite cache capacity, shared state

2. **Second bottleneck:** CPU for chunk generation (500-2000 players)
   - **Fix:** Pre-generate popular areas during off-peak hours
   - **Alternative:** Dedicated chunk generation worker service
   - **Benefit:** Reduce real-time generation load by 60-80%

3. **Third bottleneck:** WebSocket connection limits (2000-5000 players)
   - **Fix:** Horizontal scaling with Socket.IO Redis adapter
   - **Setup:** Multiple game-server instances behind load balancer
   - **Benefit:** Each server handles ~500-1000 connections

## Anti-Patterns

### Anti-Pattern 1: Loading Entire World at Once

**What people do:** Generate all chunks on server startup, send full world to client

**Why it's wrong:**
- Infinite world = infinite memory usage (impossible)
- Client can't render millions of tiles (browser crashes)
- Load times grow linearly with world size

**Do this instead:** Load 3x3 chunk grid around player (9 chunks), lazy-generate on demand

### Anti-Pattern 2: Regenerating Same Chunk Every Time

**What people do:** No server-side cache, generate chunk from seed on every request

**Why it's wrong:**
- Wastes CPU (noise generation is expensive)
- Entities spawn/despawn incorrectly (regeneration creates new entities)
- Can't support world modifications (mining, building)

**Do this instead:** Cache generated chunks on server with LRU cleanup, treat chunks as stateful

### Anti-Pattern 3: Sending Full Chunk Data for Adjacent Zones

**What people do:** When loading adjacent chunks, send players/entities for all 9 chunks

**Why it's wrong:**
- Massive network payload (players see ~100+ entities at once)
- Client renders entities outside viewport
- Entity updates flood network (100 entities × 10 updates/sec = 1000 events/sec)

**Do this instead:** Send only tiles/biome for adjacent chunks, send entities only for current chunk

### Anti-Pattern 4: Hard-Coded Biome Boundaries

**What people do:** Assign biomes to chunks randomly or in grid pattern

**Why it's wrong:**
- Ugly hard borders (volcanic next to frozen)
- No natural climate zones (temperature should be continuous)
- Can't have gradual transitions

**Do this instead:** Use noise layers (temperature/moisture/elevation) for smooth biome distribution

### Anti-Pattern 5: No Chunk Unloading

**What people do:** Load chunks as player explores, never unload old chunks

**Why it's wrong:**
- Memory leak (grows unbounded as player explores)
- Eventually crashes client/server
- Rendering performance degrades (culling thousands of sprites)

**Do this instead:** Unload chunks outside viewport radius, clean up old server-side chunks (5min TTL)

### Anti-Pattern 6: Synchronous Chunk Generation

**What people do:** Block WebSocket event handler until chunk generates

**Why it's wrong:**
- Freezes entire server (async I/O blocked)
- Other players experience lag
- Can't handle concurrent chunk requests

**Do this instead:** Use async/await, allow Node.js event loop to process other requests during generation

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Socket.IO** | WebSocket gateway for chunk streaming | Already integrated in GameGateway |
| **SimplexNoise** | Deterministic noise generation from seed | Already integrated in BiomeGenerator |
| **Phaser** | Client-side rendering engine | Already integrated in WorldScene |
| **NestJS** | Server-side framework for WebSocket handlers | Already integrated across game-server |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Client ↔ Server** | WebSocket (Socket.IO) events: `zone:request` / `zone:chunk` | Already implemented, bidirectional |
| **GameGateway ↔ ZonesService** | Direct method calls (same process) | Standard NestJS dependency injection |
| **ZonesService ↔ WorldGenerator** | Function call to `generateChunk()` | Stateless generation, thread-safe |
| **WorldGenerator ↔ BiomeGenerator** | Method calls on instance | Generator created once per chunk generation |
| **ChunkManager ↔ TileRenderer** | Callback pattern: `onChunkLoaded(chunk, biome)` | Clean separation of concerns |
| **WorldScene ↔ ChunkManager** | WorldScene provides callbacks to ChunkManager constructor | Inversion of control pattern |

## Build Order Recommendation

The architecture is **already complete**. No new components needed. The milestone can proceed directly to implementation:

### Phase 1: Coordinate System Migration (Foundation)
- Treat zones as chunks with coordinates
- Update position.zoneId format (`z_x_y`)
- Ensure all coordinate parsing is consistent

### Phase 2: Enable Multi-Chunk Loading (Activation)
- ChunkManager already loads 3x3 grid
- Just ensure it's called on player movement
- Test chunk request/receive flow

### Phase 3: Biome Visualization (Polish)
- BiomeGenerator already generates biomes
- Display biome in HUD
- Visual transitions between chunks

### Phase 4: Testing & Optimization (Validation)
- Test cross-chunk movement
- Verify chunk cleanup works
- Performance profiling (memory, CPU)

**No new architectural components required.** The system is fully designed and implemented.

## Sources

- [GitHub - ToberoCat/InfiniteWorld: This repo shows how to create a infinite chunk based world](https://github.com/ToberoCat/InfiniteWorld)
- [Godot 4+ Multiplayer Seamless Open-World Chunks](https://github.com/godotengine/godot-docs/issues/8981)
- [Hytale is finally here! – Hytale](https://hytale.com/news/2026/1/hytale-is-finally-here)
- [AutoBiomes: procedural generation of multi-biome landscapes](https://cgvr.cs.uni-bremen.de/papers/cgi20/AutoBiomes.pdf)
- [Making of OPCraft (Part 2): On-chain procedural terrain generation](https://lattice.xyz/blog/making-of-opcraft-part-2-on-chain-procedural-terrain-generation)
- [Procedural World Generation with Biomes in Unity](https://medium.com/@mrrsff/procedural-world-generation-with-biomes-in-unity-a474e11ff0b7)
- [Fractal-based terrain generation for infinite planetary worlds](https://www.daydreamsoft.com/blog/fractal-based-terrain-generation-for-infinite-planetary-worlds)
- [How Minecraft Terrain Generation Works](https://cybrancee.com/blog/how-minecraft-terrain-generation-works/)
- [Red Blob Games: Making maps with noise](https://www.redblobgames.com/maps/terrain-from-noise/)
- [Generating complex, multi-biome procedural terrain with Simplex noise](https://parzivail.com/procedural-terrain-generaion/)
- [Let's Make a Voxel Engine - Chunk Management](https://sites.google.com/site/letsmakeavoxelengine/home/chunk-management)
- [Unity: Terrain chunk loading and unloading](https://discussions.unity.com/t/terrain-chunk-loading-and-unloading/245160)
- [Chunk Loading System - Roblox Developer Forum](https://devforum.roblox.com/t/chunk-loading-system/3256694)
- [Level Streaming in Open-World Games](https://medium.com/@business.sebastian1524/level-streaming-in-open-world-games-revolutionizing-immersive-experiences-0afdd8ffed88)
- [Making a multiplayer web game with websocket that can be scalable](https://medium.com/@dragonblade9x/making-a-multiplayer-web-game-with-websocket-that-can-be-scalable-to-millions-of-users-923cc8bd4d3b)
- [Scalable WebSocket Architecture](https://blog.hathora.dev/scalable-websocket-architecture/)
- [Designing a Layered WebSocket Architecture for Scalable Real-Time Systems](https://medium.com/@jamala.zawia/designing-a-layered-websocket-architecture-for-scalable-real-time-systems-1ba3591e3ffb)
- [Streaming at Scale: SSE, WebSockets & Designing Real-Time AI APIs](https://learnwithparam.com/blog/streaming-at-scale-sse-websockets-real-time-ai-apis)
- [Chunking WebSocket Transmission](https://www.xjavascript.com/blog/chunking-websocket-transmission/)
- [WebSocket architecture best practices](https://ably.com/topic/websocket-architecture-best-practices)
- [A description of the new Client Cache for server developers](https://gist.github.com/Tomcc/4be79d3eafcd158c5059abd4ab2e8d35)
- [Data Locality · Optimization Patterns · Game Programming Patterns](https://gameprogrammingpatterns.com/data-locality.html)
- [Architecture Patterns: Caching](https://kislayverma.com/software-architecture/architecture-patterns-caching-part-1)
- [Client-Server Game Architecture - Gabriel Gambetta](https://www.gabrielgambetta.com/client-server-game-architecture.html)
- [Mastering Multiplayer Game Architecture - Getgud.io](https://www.getgud.io/blog/mastering-multiplayer-game-architecture-choosing-the-right-approach/)

---
*Architecture research for: Into the Void - Infinite World Chunk Streaming*
*Researched: 2026-02-16*
