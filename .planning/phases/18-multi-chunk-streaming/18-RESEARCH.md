# Phase 18: Multi-Chunk Streaming - Research

**Researched:** 2026-02-16
**Domain:** Chunk streaming, viewport-based loading, WebSocket room management, memory management
**Confidence:** HIGH

## Summary

Phase 18 implements seamless multi-chunk streaming to enable infinite world exploration. The codebase already has foundational infrastructure: `ChunkManager` handles 3x3 grid loading/unloading, `zone:request` WebSocket event exists for chunk requests, and server-side chunk generation with time-based cleanup (5-minute TTL). The challenge is integrating these pieces and addressing memory leaks from Phaser containers and WebSocket room subscriptions.

The system needs to coordinate three layers: client-side chunk loading (ChunkManager triggers requests), server-side generation with LRU caching (replace time-based cleanup), and WebSocket room subscriptions (player needs to join 9 rooms for 3x3 grid). Phase 17 established world coordinates, enabling cross-chunk depth sorting and entity visibility—this phase builds on that foundation.

**Primary recommendation:** Implement proper LRU cache on server (max 500 chunks), fix WebSocket room subscription management (leave old rooms on player movement), ensure Phaser container cleanup on unload (verify `container.destroy(true)` is sufficient), and add priority queue for chunk requests (visible chunks before edge chunks).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.85.0 | Game engine with container management | Already integrated, proven container lifecycle |
| Socket.IO | 4.x | WebSocket chunk streaming | Already integrated for real-time events |
| TypeScript Map | ES6 | Client-side chunk tracking | Native, performant, already used in ChunkManager |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lru-cache | 11.x | Server-side chunk cache with automatic eviction | Industry standard, 0-dependency, high performance |
| heap-js | 2.x | Priority queue for chunk requests | Efficient O(log n) operations, TypeScript types |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| lru-cache | Manual Map + doubly-linked list | lru-cache is battle-tested, handles edge cases (concurrent access, max size enforcement) |
| heap-js | @datastructures-js/priority-queue | heap-js has broader API (heapq-style, Java PriorityQueue), more active maintenance |
| Socket.IO rooms | Custom pub/sub with Redis | Rooms auto-cleanup on disconnect, simpler for single-server deployment |

**Installation:**
```bash
# Server-side
pnpm add lru-cache --filter @into-the-void/game-server

# Client-side (priority queue)
pnpm add heap-js --filter @into-the-void/web
```

## Architecture Patterns

### Recommended Project Structure
```
apps/game-server/src/
├── zones/
│   ├── zones.service.ts          # Add LRU cache for chunks
│   └── chunk-cache.ts            # Extract cache logic (optional)
├── game/
│   └── game.gateway.ts           # Add 3x3 room subscription logic

apps/web/src/game/
├── rendering/
│   ├── ChunkManager.ts           # Add priority queue for requests
│   └── TileRenderer.ts           # Already handles world coords (no change)
└── scenes/
    └── WorldScene.ts             # Verify container cleanup on unload
```

### Pattern 1: LRU Cache for Server-Side Chunks
**What:** Replace time-based cleanup with LRU eviction (max 500 chunks)
**When to use:** Server-side chunk storage with bounded memory
**Example:**
```typescript
// Source: lru-cache npm documentation
import { LRUCache } from 'lru-cache';

interface ZoneState {
  chunk: ChunkData;
  entities: Map<string, Entity>;
}

// zones.service.ts
private zones: LRUCache<string, ZoneState> = new LRUCache({
  max: 500, // Max 500 chunks (500 * 64x64 = 2M tiles)
  ttl: 5 * 60 * 1000, // 5 minute TTL for inactive chunks
  updateAgeOnGet: true, // Refresh TTL on access
  dispose: (value, key) => {
    console.log(`Evicting chunk ${key}`);
    // Optional: persist modified chunks to database
  },
});

// No manual cleanup needed - LRU handles eviction automatically
```

**Why LRU over time-based:** With 100 players, each in 3x3 grid = 900 chunks loaded. Time-based cleanup doesn't bound memory—LRU guarantees max 500 chunks regardless of player distribution.

### Pattern 2: WebSocket Room Subscription for 3x3 Grid
**What:** Player joins 9 rooms (current + 8 adjacent chunks) and leaves old rooms on movement
**When to use:** Multiplayer entity streaming across chunk boundaries
**Example:**
```typescript
// Source: Socket.IO rooms documentation
// game.gateway.ts - add after zone:request handler

private updatePlayerRooms(client: Socket, playerZoneId: string): void {
  // Get current rooms (exclude socket ID default room)
  const currentRooms = Array.from(client.rooms).filter(r => r !== client.id);

  // Calculate 3x3 grid of zone IDs
  const [, x, y] = playerZoneId.split('_').map(Number);
  const requiredRooms = new Set<string>();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      requiredRooms.add(`z_${x + dx}_${y + dy}`);
    }
  }

  // Leave old rooms
  for (const room of currentRooms) {
    if (!requiredRooms.has(room)) {
      client.leave(room);
    }
  }

  // Join new rooms
  for (const room of requiredRooms) {
    if (!currentRooms.includes(room)) {
      client.join(room);
    }
  }
}

// Call on auth and after movement
@SubscribeMessage('player:move')
async handleMove(...) {
  // ... existing move logic ...
  if (result.success) {
    this.updatePlayerRooms(client, result.position.zoneId);
    // ... broadcast logic ...
  }
}
```

**Why 3x3 grid:** Phase 17 established 48-tile visibility radius (1.5 chunks). Player at center of chunk can see 24 tiles into adjacent chunks. 3x3 grid ensures all visible entities are streamed via WebSocket rooms.

### Pattern 3: Priority Queue for Chunk Requests
**What:** Request visible chunks before edge chunks for faster perceived loading
**When to use:** Client-side chunk streaming with limited network bandwidth
**Example:**
```typescript
// Source: heap-js documentation
import { Heap } from 'heap-js';

interface ChunkRequest {
  zoneId: string;
  priority: number; // Lower = higher priority (min-heap)
  requestTime: number;
}

// ChunkManager.ts
private requestQueue: Heap<ChunkRequest> = new Heap((a, b) => a.priority - b.priority);
private pendingRequests: Set<string> = new Set();
private processingRequest = false;

private requestChunk(zoneId: string): void {
  if (this.chunkStates.has(zoneId) || this.pendingRequests.has(zoneId)) return;

  // Calculate priority based on distance to player
  const playerCoords = this.parseZoneId(this.playerZoneId);
  const chunkCoords = this.parseZoneId(zoneId);
  const dx = Math.abs(chunkCoords.x - playerCoords.x);
  const dy = Math.abs(chunkCoords.y - playerCoords.y);
  const priority = dx + dy; // Manhattan distance (0 = current chunk, 1 = adjacent, 2 = corner)

  this.requestQueue.push({
    zoneId,
    priority,
    requestTime: Date.now(),
  });

  this.pendingRequests.add(zoneId);
  this.processNextRequest();
}

private processNextRequest(): void {
  if (this.processingRequest || this.requestQueue.size() === 0) return;

  this.processingRequest = true;
  const request = this.requestQueue.pop()!;

  this.chunkStates.set(request.zoneId, 'loading');
  this.onChunkNeeded(request.zoneId);

  // Timeout handled per-chunk (existing pattern)
  setTimeout(() => {
    this.processingRequest = false;
    this.processNextRequest(); // Process next in queue
  }, 100); // Small delay to avoid flooding server
}
```

**Why priority queue:** With 8 adjacent chunks requested simultaneously, player sees current chunk instantly while edge chunks load in background. Reduces perceived loading time.

### Pattern 4: Phaser Container Cleanup
**What:** Ensure `container.destroy(true)` releases all children and memory
**When to use:** Chunk unload, entity despawn, player disconnect
**Example:**
```typescript
// Source: Current codebase (WorldScene.ts:634-640) - already correct!
private unloadChunkContainer(zoneId: string): void {
  const container = this.chunkContainers.get(zoneId);
  if (container) {
    container.destroy(true); // true = destroy all children recursively
    this.chunkContainers.delete(zoneId);
  }
}

// DepthSorter also needs cleanup when chunks unload
private unloadChunk(zoneId: string): void {
  this.unloadChunkContainer(zoneId);

  // Remove all containers for this chunk from DepthSorter
  if (this.depthSorter) {
    // DepthSorter.removeByZone() - may need to add if not exists
    // Alternative: DepthSorter clears dirty list on update, stale IDs harmless
  }
}
```

**Verification needed:** Phaser community reports suggest `destroy(true)` should be sufficient, but manual testing required. See [Phaser memory leak discussions](https://phaser.discourse.group/t/memory-leak-in-my-game/5839).

### Anti-Patterns to Avoid
- **Not leaving WebSocket rooms on movement:** Causes room subscription leaks (player in 100 rooms after moving 50 chunks). Socket.IO auto-cleans on disconnect but NOT on room changes.
- **Time-based cache without max size:** Unbounded memory growth. With 1000 players, 9000+ chunks loaded without LRU eviction.
- **Requesting all 8 adjacent chunks immediately:** Network congestion. Use priority queue to stagger requests.
- **Storing chunk containers in ChunkManager:** Tight coupling. ChunkManager tracks state, WorldScene owns Phaser containers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LRU eviction algorithm | Custom doubly-linked list + Map | lru-cache npm package | Handles edge cases (dispose callbacks, TTL, max size enforcement), zero dependencies, 11M weekly downloads |
| Priority queue | Array with sort() on each insert | heap-js or @datastructures-js/priority-queue | O(log n) insert/delete vs O(n log n) for array sort, proven implementation |
| WebSocket room cleanup | Manual tracking of room subscriptions | Socket.IO built-in rooms API | Auto-cleanup on disconnect, atomic join/leave operations |
| Chunk coordinate parsing | Regex or manual string split | Centralized parseZoneId in game-logic | Already exists, prevents inconsistent parsing bugs |

**Key insight:** Chunk streaming has subtle race conditions (request timeout, duplicate requests, out-of-order responses). Use battle-tested libraries that handle these edge cases instead of reimplementing.

## Common Pitfalls

### Pitfall 1: WebSocket Room Subscription Leaks
**What goes wrong:** Player joins new rooms on chunk requests but never leaves old rooms. After exploring 100 chunks, player is in 900 rooms (9 per chunk position). Socket.IO broadcasts to all rooms, causing network overhead.
**Why it happens:** Socket.IO rooms are automatically cleaned on disconnect, NOT on room changes. `client.join()` is additive—it doesn't replace existing subscriptions.
**How to avoid:** Track current player zone, calculate 3x3 grid, explicitly `client.leave()` rooms not in new grid before joining new ones. Pattern 2 example shows complete implementation.
**Warning signs:** Increasing `player:moved` event count per action (broadcasted to old rooms), memory growth in Socket.IO adapter.

### Pitfall 2: Phaser Container Memory Leaks
**What goes wrong:** Destroying container doesn't release graphics memory (textures, render objects). Memory usage grows as player explores, eventually causing tab crash.
**Why it happens:** Phaser 3 has documented issues with RenderTextures and canvas pooling. `container.destroy()` removes from scene tree but may not garbage collect GPU resources. See [Phaser Issue #5456](https://github.com/photonstorm/phaser/issues/5456).
**How to avoid:** Use `container.destroy(true)` to recursively destroy children. Consider Phaser's `pauseOnBlur` (already enabled in PROJECT.md) to prevent leaks on tab switch. Monitor Chrome DevTools memory profiler during playtesting.
**Warning signs:** Memory usage increases without plateau, detached DOM nodes in heap snapshot, graphics glitches after loading/unloading many chunks.

### Pitfall 3: Duplicate Chunk Requests
**What goes wrong:** ChunkManager requests chunk A, doesn't hear response within timeout, requests again. Server generates chunk twice, sends twice, client renders twice (memory leak from duplicate containers).
**Why it happens:** Network latency or server backlog. Current ChunkManager guards against re-requesting with `chunkStates` Map, but timeout handler sets state to 'failed', allowing retry.
**How to avoid:** ChunkManager already has guard (`if (this.chunkStates.has(zoneId)) return`). Ensure timeout handler keeps state as 'loading' or 'failed' and never resets to undefined. receiveChunk guards against duplicates (line 112-114).
**Warning signs:** Console warnings "Chunk z_X_Y load timeout" followed by successful load, multiple containers for same zoneId in chunkContainers Map.

### Pitfall 4: Entity Streaming vs Chunk Streaming Mismatch
**What goes wrong:** Client loads chunks for 3x3 grid but server only sends entities for player's current zone (1/9 chunks). Entities in adjacent chunks invisible despite being within VISIBILITY_RADIUS (48 tiles).
**Why it happens:** Server currently broadcasts `entity:spawn` to single zone room (`client.to(zoneId).emit`). With 3x3 room subscriptions, entities need to broadcast to all 9 rooms.
**How to avoid:** Server entity spawn should emit to player's 3x3 grid rooms, not just entity's zone room. Alternative: client-side filtering with Phase 17's distance-based visibility (`isEntityVisible`).
**Warning signs:** Entities pop in abruptly when player crosses chunk boundary, instead of smoothly appearing at 48-tile radius.

### Pitfall 5: Server Chunk Cache Overflow
**What goes wrong:** With 500-chunk LRU cache and 1000 players, cache thrashes (constant eviction/regeneration). Average 2 players per chunk * 9 chunks = 18 chunks per player * 1000 players = 18,000 chunks needed, but only 500 cached.
**Why it happens:** LRU max size too low for player count. Chunk regeneration is fast (deterministic seed) but not free—noise calculation and structure placement take CPU time.
**How to avoid:** Set max size based on expected concurrent players. Formula: `max = expectedPlayers * 2` (gives 2x headroom). For 1000 players, use max: 2000. Monitor cache hit rate, adjust if eviction rate > 10%.
**Warning signs:** High CPU usage in server, slow chunk load times (> 1 second), console logs showing frequent evictions.

## Code Examples

Verified patterns from research and current codebase:

### LRU Cache Setup (Server-Side)
```typescript
// Source: lru-cache npm v11 documentation
// Location: apps/game-server/src/zones/zones.service.ts

import { LRUCache } from 'lru-cache';

@Injectable()
export class ZonesService implements OnModuleInit {
  private zones: LRUCache<string, ZoneState>;
  private worldSeed: string;

  constructor(private readonly configService: ConfigService) {
    this.worldSeed = configService.get<string>('WORLD_SEED', 'into-the-void-alpha-1');

    // Replace Map with LRU cache
    this.zones = new LRUCache({
      max: 500, // Max chunks in memory
      ttl: 5 * 60 * 1000, // 5 min TTL for inactive chunks
      updateAgeOnGet: true, // Refresh TTL on access
      updateAgeOnHas: false, // Don't refresh on existence check
      dispose: (value, key) => {
        console.log(`[ZonesService] Evicted chunk ${key}`);
        // Future: persist modified chunks to database
      },
    });
  }

  onModuleInit() {
    // Preload spawn zone
    this.loadZone('z_0_0');
    // No more cleanup interval - LRU handles eviction automatically
  }

  // getChunk, getZoneEntities remain the same - LRU API matches Map
}
```

### WebSocket 3x3 Room Subscription (Server-Side)
```typescript
// Source: Socket.IO rooms documentation + Pattern 2
// Location: apps/game-server/src/game/game.gateway.ts

/**
 * Update player's WebSocket room subscriptions to match 3x3 chunk grid.
 * Leaves old rooms and joins new rooms based on current position.
 */
private updatePlayerRooms(client: Socket, playerZoneId: string): void {
  const currentRooms = Array.from(client.rooms).filter(r => r !== client.id);

  // Parse player zone coordinates
  const parts = playerZoneId.split('_');
  const centerX = parseInt(parts[1], 10);
  const centerY = parseInt(parts[2], 10);

  // Calculate 3x3 grid (current + 8 adjacent)
  const requiredRooms = new Set<string>();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      requiredRooms.add(`z_${centerX + dx}_${centerY + dy}`);
    }
  }

  // Leave rooms not in new grid
  for (const room of currentRooms) {
    if (!requiredRooms.has(room)) {
      client.leave(room);
      console.log(`[Room] Player left ${room}`);
    }
  }

  // Join rooms in new grid
  for (const room of requiredRooms) {
    if (!currentRooms.includes(room)) {
      client.join(room);
      console.log(`[Room] Player joined ${room}`);
    }
  }
}

// Call after auth
@SubscribeMessage('auth')
async handleAuth(...) {
  if (result.success && result.player) {
    this.updatePlayerRooms(client, result.player.position.zoneId);
    // ... rest of auth logic ...
  }
}

// Call after successful movement
@SubscribeMessage('player:move')
async handleMove(...) {
  if (result.success) {
    this.updatePlayerRooms(client, result.position.zoneId);
    // ... broadcast logic ...
  }
}
```

### Priority Queue for Chunk Requests (Client-Side)
```typescript
// Source: heap-js documentation
// Location: apps/web/src/game/rendering/ChunkManager.ts

import { Heap } from 'heap-js';

interface ChunkRequest {
  zoneId: string;
  priority: number; // Lower = higher priority
}

export class ChunkManager {
  private requestQueue: Heap<ChunkRequest>;
  private pendingRequests: Set<string> = new Set();
  private currentPlayerZone: string = 'z_0_0';

  constructor(...) {
    // Min-heap: lower priority number processed first
    this.requestQueue = new Heap((a, b) => a.priority - b.priority);
    // ... existing constructor code ...
  }

  updateChunks(playerZoneId: string): void {
    this.currentPlayerZone = playerZoneId;
    const { x: playerX, y: playerY } = this.parseZoneId(playerZoneId);

    // Calculate required chunks (3x3 grid)
    const requiredChunks = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const zoneId = this.createZoneId(playerX + dx, playerY + dy);
        requiredChunks.add(zoneId);
      }
    }

    // Request new chunks with priority
    requiredChunks.forEach(zoneId => {
      if (!this.chunkStates.has(zoneId) && !this.pendingRequests.has(zoneId)) {
        this.queueChunkRequest(zoneId);
      }
    });

    // Unload distant chunks (unchanged)
    const chunksToUnload: string[] = [];
    this.loadedChunks.forEach((_, zoneId) => {
      if (!requiredChunks.has(zoneId)) {
        chunksToUnload.push(zoneId);
      }
    });
    chunksToUnload.forEach(zoneId => this.unloadChunk(zoneId));

    // Process queue
    this.processRequestQueue();
  }

  private queueChunkRequest(zoneId: string): void {
    const { x, y } = this.parseZoneId(zoneId);
    const { x: px, y: py } = this.parseZoneId(this.currentPlayerZone);

    // Manhattan distance: 0 = current, 1 = adjacent, 2 = corner
    const priority = Math.abs(x - px) + Math.abs(y - py);

    this.requestQueue.push({ zoneId, priority });
    this.pendingRequests.add(zoneId);
  }

  private processRequestQueue(): void {
    // Process up to 3 concurrent requests (tune based on network bandwidth)
    const maxConcurrent = 3;
    let inFlight = 0;
    this.chunkStates.forEach(state => {
      if (state === 'loading') inFlight++;
    });

    while (inFlight < maxConcurrent && this.requestQueue.size() > 0) {
      const request = this.requestQueue.pop()!;
      this.chunkStates.set(request.zoneId, 'loading');
      this.onChunkNeeded(request.zoneId);
      inFlight++;

      // Timeout handling (existing pattern)
      setTimeout(() => {
        if (this.chunkStates.get(request.zoneId) === 'loading') {
          console.warn(`Chunk ${request.zoneId} load timeout`);
          this.chunkStates.set(request.zoneId, 'failed');
          this.pendingRequests.delete(request.zoneId);
        }
      }, this.loadTimeout);
    }
  }

  receiveChunk(chunkData: ChunkData, biome: BiomeType): void {
    const { zoneId } = chunkData;

    // Guard: prevent duplicate processing (existing - keep this!)
    if (this.chunkStates.get(zoneId) === 'loaded') {
      return;
    }

    this.chunkStates.set(zoneId, 'loaded');
    this.pendingRequests.delete(zoneId);

    // ... rest of existing receiveChunk logic ...

    // Process next queued request
    this.processRequestQueue();
  }
}
```

### Container Cleanup Verification (Client-Side)
```typescript
// Source: Current codebase WorldScene.ts:634-640 - already correct!
// Location: apps/web/src/game/scenes/WorldScene.ts

private unloadChunkContainer(zoneId: string): void {
  const container = this.chunkContainers.get(zoneId);
  if (container) {
    // Destroy container and all children recursively
    // true parameter = destroy children, releases references for GC
    container.destroy(true);
    this.chunkContainers.delete(zoneId);

    console.log(`[Cleanup] Unloaded chunk ${zoneId}`);
  }
}

// Verify this is called from ChunkManager callback
// ChunkManager constructor already has:
// onChunkUnloaded: (zoneId: string) => { this.unloadChunkContainer(zoneId); }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single zone loading | Multi-chunk streaming with ChunkManager | Phase 18 (current) | Enables infinite world, seamless exploration |
| Time-based cache cleanup | LRU cache with max size | Phase 18 (planned) | Bounded memory, predictable performance |
| Zone ID room subscriptions (1 room) | 3x3 grid room subscriptions (9 rooms) | Phase 18 (planned) | Entity streaming across chunk boundaries |
| Synchronous chunk requests | Priority queue with concurrent processing | Phase 18 (planned) | Faster perceived loading, network efficiency |
| Manual container cleanup | Automatic cleanup on chunk unload | Already implemented (verify) | Prevents memory leaks |

**Current state:** Foundation exists (ChunkManager, zone:request event, container cleanup) but pieces not integrated. Server uses simple Map + time-based cleanup (unbounded growth risk). Client requests chunks but no prioritization (all adjacent chunks equal priority).

**Industry patterns:** Games like Minecraft use region files (persistent chunks) + memory cache. For Into the Void's procedural generation, in-memory LRU cache is sufficient until player counts exceed 1000 (then add Redis for cross-server caching).

## Open Questions

1. **What is the optimal LRU cache size for expected player counts?**
   - What we know: Each player loads 3x3 grid = 9 chunks. With overlap, average is ~2 chunks per player.
   - What's unclear: Expected concurrent player count at launch (100? 500? 1000?).
   - Recommendation: Start with max: 500 chunks (supports ~250 players). Monitor eviction rate in production, scale to max: 2000 if needed (1000 players).

2. **Should chunk requests use HTTP REST instead of WebSocket events?**
   - What we know: zone:request already implemented as WebSocket event. HTTP would enable CDN caching.
   - What's unclear: Performance difference, CDN cost vs server CPU cost.
   - Recommendation: Keep WebSocket for now. Chunks are generated per-seed, not cacheable across worlds. HTTP useful if adding chunk persistence to database (future optimization).

3. **How should priority queue handle chunk request cancellation?**
   - What we know: Player can move faster than chunks load (teleportation, fast travel). Queue may contain requests for chunks no longer needed.
   - What's unclear: Should priority queue support removal, or let stale requests timeout?
   - Recommendation: Let stale requests timeout. heap-js removal is O(n) (no index tracking). Timeout is 10 seconds, stale requests harmless. Alternative: clear entire queue on chunk grid change (aggressive but simple).

4. **Should entity streaming use 3x3 room broadcasts or client-side filtering?**
   - What we know: Phase 17 added `isEntityVisible` using 48-tile radius. Server broadcasts to zone rooms.
   - What's unclear: Better to broadcast to 9 rooms (server-side filtering) or 1 room with client filtering (Phase 17 pattern)?
   - Recommendation: Use 3x3 room broadcasts for consistency with player movement. Client already has isEntityVisible for edge case (entity at chunk boundary). Server-side reduces client processing.

5. **How to handle chunk loading indicators in UI?**
   - What we know: Requirement CHUNK-06 specifies loading indicator. Current UI has ConnectionIndicator but no chunk-specific loading.
   - What's unclear: Show loading for all 8 adjacent chunks, or only when player approaches boundary?
   - Recommendation: Add subtle loading spinner when `ChunkManager.chunkStates` has any 'loading' state. Don't block movement—player can continue exploring while edge chunks load.

## Sources

### Primary (HIGH confidence)
- **Current codebase** (verified via Read tool):
  - ChunkManager.ts: 3x3 grid logic, request/unload pattern
  - zones.service.ts: Time-based cleanup, chunk generation
  - game.gateway.ts: zone:request handler (lines 262-277)
  - WorldScene.ts: Container cleanup (lines 634-640)
- **[lru-cache npm](https://www.npmjs.com/package/lru-cache)** - v11.x API documentation, performance characteristics
- **[heap-js GitHub](https://github.com/ignlg/heap-js)** - Priority queue implementation with heapq-style API
- **[Socket.IO Rooms Documentation](https://socket.io/docs/v3/rooms/)** - Room subscription patterns, auto-cleanup behavior

### Secondary (MEDIUM confidence)
- **[Phaser Memory Leak Discussions](https://phaser.discourse.group/t/memory-leak-in-my-game/5839)** - Community reports on container cleanup
- **[Phaser Issue #5456](https://github.com/photonstorm/phaser/issues/5456)** - Documented memory leak with RenderTextures
- **[Server Chunk Loading Article](https://001.arktimes.com/server-chunk-loading-how-games-handle-vast-worlds/)** - Viewport-based streaming patterns in open-world games
- **[VideoSDK Socket.IO Rooms Guide](https://www.videosdk.live/developer-hub/socketio/socketio-rooms)** - 2025 best practices for room management

### Tertiary (LOW confidence, verification needed)
- **Chunk streaming performance:** Articles reference Unity/Unreal implementations, patterns transferable but not directly applicable to Phaser 3 + Socket.IO stack.
- **Optimal cache sizes:** Generic formulas (players * 9 chunks) need validation against actual memory usage and eviction rates.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - lru-cache and heap-js are industry standards with extensive usage (11M+ and 100k+ weekly downloads respectively)
- Architecture: HIGH - Patterns verified in current codebase (ChunkManager structure, zone:request flow, container cleanup)
- Pitfalls: HIGH - Room subscription leaks and container memory leaks are well-documented issues with clear solutions
- Code examples: HIGH - Derived from official documentation (lru-cache, heap-js, Socket.IO) and verified current codebase patterns

**Research date:** 2026-02-16
**Valid until:** 60 days (libraries stable, patterns proven, but player count assumptions may need revision)

**Key risks:**
- LOW: Technical feasibility (infrastructure exists, just needs integration)
- MEDIUM: Memory leak validation (requires manual testing with Chrome DevTools)
- LOW: Performance impact (LRU cache and priority queue are O(log n), minimal overhead)
- MEDIUM: Entity streaming design (3x3 rooms vs client filtering - both viable, need to choose)

**Validation needed during planning:**
- Confirm LRU cache max size (500 for MVP, scale based on player count)
- Decide entity streaming approach (recommend 3x3 room broadcasts)
- Add chunk loading indicator to UI requirements (CHUNK-06 coverage)
- Test container cleanup with Chrome memory profiler (verify no leaks)
