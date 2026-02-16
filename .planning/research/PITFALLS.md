# Pitfalls Research

**Domain:** Infinite World Chunk Streaming for Multiplayer 2D Tile-Based Game
**Researched:** 2026-02-16
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Entity Visibility Boundary Mismatch

**What goes wrong:**
Entity visibility is hardcoded to chunk boundaries (`zoneId !== player.zoneId` returns false), causing entities to disappear at chunk edges even when visually close. Players near chunk boundaries see nearby entities vanish despite being within render distance.

**Why it happens:**
Visibility logic uses zone/chunk ID matching rather than distance-based calculations. The current code at `packages/game-logic/src/visibility/range.ts` line 30-32 rejects cross-chunk visibility entirely. When chunks load in 3x3 grids but visibility checks only same-zone, the system contradicts itself.

**How to avoid:**
- Replace zone ID matching with world coordinate distance checks
- Use `getSubscribedZones()` pattern for visibility (already exists lines 117-128)
- Calculate entity position in world coordinates: `worldX = chunkX * ZONE_SIZE + localX`
- Visibility check should use world coordinates, not chunk-local coordinates

**Warning signs:**
- Bug reports: "enemies disappear when I get near chunk edge"
- Entities pop in/out when crossing chunk boundaries
- Minimap shows entities that aren't rendered
- Combat breaks near chunk boundaries

**Phase to address:**
Phase 1 (Infinite World Foundation) — Must fix before cross-chunk movement works correctly.

---

### Pitfall 2: Depth Sorting Breaks at Chunk Boundaries

**What goes wrong:**
Depth calculation uses local chunk coordinates instead of world coordinates, causing entities and tiles in different chunks to sort incorrectly. Tiles in chunk (0,0) at position (15,15) have same depth as tiles in chunk (1,0) at position (0,0), creating z-fighting and incorrect layering.

**Why it happens:**
TileRenderer (line 153, 211) and IsometricTransform calculate depth from grid coordinates without chunk offset. Each chunk's tiles use coordinates 0-31, so depth values overlap between chunks. The system works within a single chunk but fails when multiple chunks render simultaneously.

**How to avoid:**
- Pass world coordinates to depth calculation: `worldX = chunkX * ZONE_SIZE + localX`
- Already partially implemented in `createTileWithElevationWorld()` (line 170-215)
- Extend this pattern to ALL chunk rendering
- Entity depth sorting must use world coordinates too
- Verify DepthSorter uses world coords from container.getData('gridX')

**Warning signs:**
- Tiles from different chunks render in wrong order
- Entities appear behind tiles they should be in front of
- Visual glitches near chunk boundaries
- "Flickering" objects where depth changes per frame

**Phase to address:**
Phase 1 (Infinite World Foundation) — Rendering foundation must use world coordinates from start.

---

### Pitfall 3: WebSocket Room Subscription Leak During Zone Transitions

**What goes wrong:**
Players transition from zone A to zone B, join room B, but never leave room A. Player receives duplicate events for entities that exist in both zones. Memory leaks on server as room subscriptions accumulate without cleanup. After 10 zone transitions, player is subscribed to 10 rooms and receives 10x traffic.

**Why it happens:**
Zone transition code in `game.gateway.ts` (lines 148-163) calls `client.leave()` and `client.join()`, but this only happens during successful player movement. Failed movements, disconnects during transition, or edge cases leave subscriptions orphaned. Socket.IO doesn't auto-cleanup rooms when clients don't explicitly leave.

**How to avoid:**
- Always `client.leaveAll()` before joining new room
- Track active subscriptions per client in PlayerService
- Add disconnect handler that explicitly leaves all rooms
- For 3x3 chunk loading: subscribe to 9 rooms, unsubscribe from old 9
- Use Set to track current subscriptions, diff against required subscriptions
- Clean up on auth, movement, and disconnect

**Warning signs:**
- Server memory grows over time without obvious cause
- Players report receiving duplicate chat messages
- Entity updates trigger multiple times
- WebSocket bandwidth increases with session duration
- Player count doesn't match active room subscriptions

**Phase to address:**
Phase 2 (Multi-Chunk Streaming) — When 3x3 loading is implemented, room management becomes critical.

---

### Pitfall 4: Procedural Generation Seed Desync Between Server/Client

**What goes wrong:**
Server generates chunk with seed + algorithm version 1, client caches chunk. Server updates generation algorithm (bug fix, new feature), regenerates same chunk with same seed but different algorithm, produces different terrain. Client has cached old version, server sends entities positioned on new terrain, positions don't match collision. Players walk through "walls" or get stuck on "empty" tiles.

**Why it happens:**
Seed-based generation ensures consistency for *same algorithm*, not across algorithm versions. Current `WorldGenerator` uses seed but has no version tracking. Client ChunkManager caches chunks indefinitely with no invalidation mechanism. Server can restart with new code, but client cache persists.

**How to avoid:**
- Add generation algorithm version to ChunkData schema
- Include version in cache key: `${zoneId}:${generationVersion}`
- Server sends generation version with chunk data
- Client compares cached version with server version
- Invalidate cache if mismatch
- For development: include git commit hash in version
- For production: use semantic versioning

**Warning signs:**
- Collision detection breaks after server update
- Players report "invisible walls" after patch
- Entity positions don't match terrain
- Pathfinding routes go through obstacles
- Client console errors about missing tile IDs
- Hash mismatches between client/server terrain

**Phase to address:**
Phase 1 (Infinite World Foundation) — Add versioning before caching is implemented.

---

### Pitfall 5: Memory Leak from Phaser Container Accumulation

**What goes wrong:**
ChunkManager tracks loaded chunks in Map, calls `onChunkUnloaded()` to cleanup, but Phaser containers aren't destroyed—only removed from tracking. Each chunk creates 1024 tile containers (32x32 grid). After loading 100 chunks, client has 102,400 undestroyed containers consuming ~500MB RAM. Game slows down, eventually crashes.

**Why it happens:**
JavaScript `Map.delete()` removes reference but doesn't destroy Phaser objects. Phaser's garbage collection requires explicit `.destroy()` calls. Current `unloadChunkContainer()` implementation likely does `chunkContainers.delete(zoneId)` without destroying container contents. Each container holds Graphics objects that hold texture references.

**How to avoid:**
- In `unloadChunkContainer()`: iterate all children, call `.destroy(true)` recursively
- Destroy container itself: `container.destroy(true)` (true = destroy children)
- Before destroying, remove from all layers/groups
- Clear entity sprites from entitySprites Map before destroying
- Add memory profiling to detect leaks early
- Test: load 50 chunks, unload all, check memory returns to baseline

**Warning signs:**
- Client memory usage grows linearly with exploration
- Frame rate degrades over long sessions
- Browser "out of memory" crashes after 30+ minutes
- Performance profiler shows growing number of display objects
- Memory usage doesn't decrease when returning to previously visited chunks

**Phase to address:**
Phase 2 (Multi-Chunk Streaming) — Must fix when chunk unloading is implemented.

---

### Pitfall 6: Biome Transition Artifacts at Chunk Boundaries

**What goes wrong:**
Chunk (0,0) has biome A, chunk (1,0) has biome B. Boundary tiles at x=31 (chunk 0) and x=0 (chunk 1) have harsh visual discontinuity. Players see hard line between "ice" and "toxic" biomes. No gradual blending, breaks immersion.

**Why it happens:**
Current BiomeGenerator determines biome per chunk using chunk center coordinates. Chunk generation is atomic—each chunk generates independently without considering neighbors. Edge tiles don't sample neighboring chunk's biome values. The system was designed for single-biome-per-chunk, not cross-chunk biome transitions.

**How to avoid:**
- Don't generate biome per-chunk, generate biome per-tile using world coordinates
- Sample biome noise at world position: `biome = getBiomeAt(worldX, worldY)`
- Already exists in WorldGenerator line 77: `getBiomeAt(worldX, worldY)`
- Use interpolation zones: tiles within 3 tiles of biome boundary blend terrain
- Generate transition tiles that mix both biomes
- Requires: biome value to be continuous function, not discrete per-chunk
- Pre-calculate biome edges using noise threshold detection

**Warning signs:**
- Hard lines visible between chunks of different biomes
- Screenshots showing "checkerboard" biome patterns
- Player feedback: "world looks artificial, not natural"
- Minimap shows grid-aligned biome boundaries
- Temperature/moisture values discontinuous at chunk edges

**Phase to address:**
Phase 3 (Biome Blending) — Separate phase after core streaming works, as it requires terrain generation refactor.

---

### Pitfall 7: Client-Side Prediction Rollback Destroys Chunk State

**What goes wrong:**
Player predicts movement from chunk A to chunk B, client loads chunk B optimistically. Server rejects movement (collision, lag, validation failure), sends rollback. Client rollback logic only rewinds player position, doesn't unload chunk B. Client now has chunk B loaded but player is in chunk A. Future chunk loading logic sees B already loaded, doesn't request it again. If server state differs (dynamic entities, time-based changes), client has stale chunk B forever.

**Why it happens:**
MovementController handles prediction/rollback but doesn't communicate with ChunkManager. Rollback only affects player position, not world state. ChunkManager tracks "loaded" state but has no concept of "speculatively loaded" vs "confirmed loaded". WebSocket race conditions: client predicts B, requests chunk B, receives "movement denied", but chunk B response already in flight.

**How to avoid:**
- Mark chunks as "predicted" vs "confirmed" in ChunkManager
- Rollback handler must notify ChunkManager of failed predictions
- ChunkManager unloads "predicted" chunks if not confirmed within timeout
- Alternative: only load chunks on confirmed server position, no optimistic loading
- Track client's authoritative zone ID separately from predicted zone ID
- Zone change only committed after server confirms new zone

**Warning signs:**
- Chunks loaded but entities don't spawn
- Collision detection breaks after denied movement
- Client logs show "chunk already loaded" but different data
- Server denies movement but client has wrong visible chunks
- Entity positions desync after rollback events

**Phase to address:**
Phase 2 (Multi-Chunk Streaming) — When prediction + chunk loading interact.

---

### Pitfall 8: Structure/Entity Generation Non-Determinism Creates Server-Client Mismatch

**What goes wrong:**
Server generates chunk with structures at positions [5,10], [12,20]. Client generates same chunk with seed, gets structures at different positions. Collision maps don't match. Player walks into server-side structure, client shows empty space, movement denied. Or client shows structure, player tries to walk around, server allows movement through, desync.

**Why it happens:**
Structure generation uses randomness that isn't fully deterministic. Current `generateStructures()` might use `Math.random()` instead of seeded RNG. Floating point precision differences between server (Node.js) and client (browser). Array iteration order differs between environments. Date.now() calls during generation create non-determinism. Even with same seed, different RNG implementations produce different sequences.

**How to avoid:**
- Use SeededRandom for ALL randomness (already exists at `world-gen/src/random/seeded-random.ts`)
- Never use Math.random(), Date.now(), or environment-dependent values
- Test: generate same chunk 1000 times, verify bit-identical output
- Add unit tests comparing server vs client generation
- Hash chunk contents (tiles, structures, collisions), compare hashes
- If mismatch detected: client always trusts server version
- Include structure positions in ChunkData sent from server

**Warning signs:**
- Collision mismatches reported by players
- Pathfinding routes fail validation
- Client prediction frequently rolled back for no apparent reason
- Different players see slightly different terrain
- Hash mismatches in debug logs
- Structures appear/disappear on reconnect

**Phase to address:**
Phase 1 (Infinite World Foundation) — Must verify determinism before relying on client-side generation.

---

### Pitfall 9: Chunk Loading Priority Causes Navigation Deadlock

**What goes wrong:**
Player at chunk boundary between A and B tries to pathfind into chunk C (not loaded). Client requests chunk C, waits for load. Meanwhile, player moves slightly, triggers new chunk request for D. C arrives, but player has moved, pathfinding to C fails. System cancels path and requests E. Chunk loading and pathfinding compete, neither completes successfully.

**Why it happens:**
No priority system for chunk loading. All chunks requested equally. Pathfinding system doesn't know which chunks are loading vs loaded. Player movement cancels active pathfinding without checking if destination chunk is pending. Race condition: player moves faster than chunks load, continuously invalidating paths.

**How to avoid:**
- Priority queue for chunk loading: current chunk > adjacent chunks > pathfinding destination > distant chunks
- Pathfinding waits for destination chunk if loading (show "loading..." feedback)
- Don't cancel pathfinding on minor position changes, only if path becomes invalid
- Pre-load chunks in movement direction (predict player trajectory)
- Debounce chunk requests: 100ms cooldown per chunk to prevent spam
- Cache: "chunk X requested at time T, ignore duplicate requests for 500ms"

**Warning signs:**
- Pathfinding frequently fails with "destination not loaded"
- Chunk request logs show same chunk requested 10+ times
- Player movement feels "sticky" near chunk boundaries
- Network tab shows burst of chunk requests on every move
- Chunks load but in wrong order (distant before adjacent)

**Phase to address:**
Phase 2 (Multi-Chunk Streaming) — When implementing viewport-based pre-loading.

---

### Pitfall 10: Server Chunk Cache Grows Unbounded

**What goes wrong:**
Server generates chunks on-demand, caches them in memory (ZonesService line 14: `zones: Map<string, ZoneState>`). Cleanup runs every 60s (line 26), removes chunks not accessed in 5 minutes (line 77). With 100 active players exploring, server accumulates 1000+ chunks (32KB each = 32MB). Cleanup doesn't remove chunks if any player is near them. Eventually server runs out of memory, crashes.

**Why it happens:**
Cleanup uses `lastAccessed` timestamp, but doesn't account for chunk distribution. If players cluster in one area, nearby chunks stay "accessed" forever. No maximum cache size limit. No LRU eviction policy. Server assumes players will spread out, but dungeons/cities create hotspots. Cleanup interval (60s) too slow for high player density.

**How to avoid:**
- Implement LRU cache with maximum size (e.g., 500 chunks max)
- When cache full, evict least-recently-used chunk even if recent
- For hotspot zones (spawn, cities): mark as "persistent", never evict
- Track chunk access frequency, not just last access time
- More aggressive cleanup: 30s interval, 2 minute timeout (not 5)
- Monitor cache size, log warning at 80% capacity
- Consider Redis for distributed chunk cache across server instances

**Warning signs:**
- Server memory usage grows linearly with uptime
- Memory doesn't decrease when players log off
- Server crashes with "out of memory" after 2-4 hours
- Chunk cache size metric shows 10,000+ chunks
- Different servers have vastly different memory usage (no cache sharing)

**Phase to address:**
Phase 2 (Multi-Chunk Streaming) — When implementing server-side chunk management at scale.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Client generates chunks instead of server sending all data | Massive bandwidth savings, instant chunk loads | Desync bugs, version mismatch issues, requires deterministic generation | Only if generation is provably deterministic and versioned |
| 3x3 chunk loading instead of viewport-based | Simple implementation, predictable memory usage | Loads chunks player can't see, wastes memory on corner chunks | MVP phase, replace with distance-based loading in Phase 4 |
| Single entity visibility range for all entity types | Simple code, consistent behavior | Can't have "large creatures visible from far" or "stealth mechanics" | Until gameplay requires varied visibility (Phase 5+) |
| Chunk-local collision maps instead of world-space collision | Each chunk self-contained, easy to cache | Cross-chunk collision checks fail, entities can't path across boundaries | Never acceptable for infinite world |
| Cache chunks client-side without expiration | Fast revisits, no re-download | Stale data after server updates, growing storage usage | Only with version-based invalidation |
| Broadcast all entity updates to all zone subscribers | Simple pub/sub, no targeting logic | Wastes bandwidth on entities outside player visibility | Until player count per zone exceeds ~20 |
| Synchronous chunk generation on main thread | Simple code, no threading complexity | 100-500ms freeze per chunk, visible stutter | Never for production, only early prototype |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| WebSocket room subscriptions | Assuming leave/join are atomic, not handling mid-transition disconnects | Track subscriptions in PlayerService, reconcile on reconnect, explicit cleanup |
| Phaser container depth | Setting depth per-chunk instead of world coordinates | Calculate depth from world position (chunkX * SIZE + localX) |
| Client-side prediction | Predicting world state changes (chunk loads), not just player state | Only predict player position, load chunks on confirmed server state |
| Visibility calculations | Using chunk/zone ID matching instead of distance | Use world coordinate distance: sqrt((worldX1-worldX2)² + (worldY1-worldY2)²) |
| Biome generation | Generating biome per chunk center | Sample biome function at each tile's world coordinates |
| Procedural generation caching | Caching without version/invalidation | Include generation version in cache key, validate on load |
| Chunk unloading | Removing from Map without destroying Phaser objects | Explicitly call .destroy(true) on all containers and children |
| Chunk boundaries | Assuming entities stop at chunk edge | Visibility and collision must work across chunk boundaries |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Never unloading distant chunks | Memory grows linearly with exploration distance, eventual crash | Unload chunks >2 zone distance from player, destroy Phaser objects explicitly | ~100 chunks loaded (~500MB RAM) |
| Recalculating visibility every frame for all entities | Frame rate drops with entity count, spikes to 30fps with 50 entities | Cache visible entities, recalculate only on movement or every 500ms | >50 entities in 3x3 chunk area |
| Generating chunks on main thread | Frame freeze during generation (100-500ms), visible stutter | Use Web Workers for generation, async/await, or pre-generate neighboring chunks | Always noticeable to players |
| Broadcasting entity updates to all zone players | Bandwidth scales O(n²) with players per zone | Filter updates by visibility range, use spatial indexing | >10 players in same zone |
| Loading all 9 chunks synchronously | Multi-second freeze on zone transition | Priority queue: load current chunk first, then adjacent, async/batched | Always with 3x3 loading |
| No chunk request debouncing | Server floods with duplicate requests | Debounce requests: ignore duplicates within 500ms window | Rapid player movement near boundaries |
| Unbounded server chunk cache | Server memory grows until crash | LRU cache with max size (500 chunks), aggressive cleanup policy | >100 concurrent players exploring |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Client controls chunk load requests without rate limiting | Malicious client floods server with chunk requests, DoS attack | Rate limit to 10 chunks/second per client, track request patterns |
| Trusting client-generated collision data | Cheating: client generates "no collision" chunks, walks through walls | Server is source of truth for collision, validates all movement |
| No validation of chunk coordinates | Client requests chunk at extreme coords (999999, 999999), integer overflow, crash | Validate coords are within bounds (-10000 to 10000), reject invalid |
| Exposing world seed to client | Player reverse-engineers generation, predicts resource locations, unfair advantage | Only if generation is public knowledge; otherwise keep seed server-side |
| No chunk data size limits | Malicious mod generates chunks with 1M entities, crashes other clients | Validate chunk size before broadcast, limit entities to 100 per chunk |
| Client can request any chunk | Map revelation exploit: client requests all chunks, reveals entire map | Only allow requests for chunks within N distance of player position |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading indicator for chunks | Player walks to chunk edge, sees void, doesn't know if loading or bug | Show "Loading..." overlay on pending chunks, gray-out tiles |
| Chunks pop in instantly | Jarring visual, breaks immersion | Fade-in animation (300ms), or fog-of-war reveal |
| Hard edges on biome transitions | World looks artificial, grid structure obvious | 3-5 tile transition zone with blended terrain, noise-based boundaries |
| Entities disappear at chunk boundaries | Feels like bug, breaks combat immersion | Extend visibility across chunk boundaries, fade-out instead of instant removal |
| No feedback when movement denied at chunk edge | Player presses move, nothing happens, frustrating | Show collision indicator, play "bump" sound, visual feedback |
| Minimap shows unloaded chunks as black | Looks broken, player thinks game is buggy | Show as fog/unexplored, different from void biome |
| Chunk loading during combat | Enemy disappears mid-fight, feels unfair | Pre-load chunks in combat zones, increase load radius during combat |

## "Looks Done But Isn't" Checklist

- [ ] **Chunk Loading:** Visual rendering works, but did you verify depth sorting uses world coords? Test entities at chunk boundaries.
- [ ] **Biome Transitions:** Chunks generate different biomes, but are boundaries seamless? Stand at boundary and verify no hard line.
- [ ] **Entity Visibility:** Entities render in adjacent chunks, but do they receive updates? Test entity moving across boundary while player watches.
- [ ] **Memory Cleanup:** Chunks unload from tracking, but are Phaser containers destroyed? Check memory profiler after loading/unloading 50 chunks.
- [ ] **Procedural Determinism:** Same seed generates same chunk once, but did you test 1000 times? Same result on server vs client?
- [ ] **WebSocket Rooms:** Zone transitions work once, but test 20 rapid transitions—any subscription leaks?
- [ ] **Collision Across Chunks:** Pathfinding works within chunk, but can entity path from chunk A to chunk B? Test cross-boundary paths.
- [ ] **Client Prediction Rollback:** Rollback works for same-zone movement, but test rollback during zone transition—chunk state correct?
- [ ] **Generation Versioning:** Chunk caching works, but what happens when server updates generation algorithm? Does client invalidate cache?
- [ ] **Minimap with Multiple Chunks:** Minimap renders, but does it show entities from all 9 loaded chunks, not just current zone?
- [ ] **Server Cache Bounds:** Cache cleanup runs, but does server memory stay bounded under 100 concurrent players exploring?
- [ ] **Chunk Request Spam:** Player movement smooth, but check network logs—any duplicate chunk requests within 1 second?

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Entity visibility boundary mismatch | MEDIUM | Refactor visibility to use world coords, update all entity sync code, test cross-chunk scenarios |
| Depth sorting breaks at boundaries | HIGH | Convert all depth calcs to world coords, regenerate all cached chunks, may need to wipe client cache |
| WebSocket room subscription leak | LOW | Add subscription tracking, implement cleanup on disconnect, existing sessions self-heal on next movement |
| Procedural generation desync | HIGH | Add versioning to schema (DB migration), invalidate all client caches, redistribute chunks from server if needed |
| Memory leak from containers | LOW | Add `.destroy(true)` to cleanup, test with profiler, existing issue self-heals when player revisits chunks |
| Biome transition artifacts | MEDIUM | Refactor terrain generation to per-tile biome sampling, regenerate all chunks, noticeable visual change for players |
| Client prediction rollback issue | MEDIUM | Add chunk load states (predicted/confirmed), update rollback logic, test extensively with artificial lag |
| Structure generation non-determinism | HIGH | Replace all Math.random with SeededRandom, add validation hashes, may require server-authoritative structures |
| Chunk loading priority deadlock | LOW | Add priority queue, debounce requests, update pathfinding wait logic |
| Server chunk cache unbounded | MEDIUM | Implement LRU cache, add size limits, tune cleanup parameters, may require Redis for multi-server |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Entity visibility boundary mismatch | Phase 1: Infinite World Foundation | Player at (31, 15) in chunk (0,0) sees entity at (0, 15) in chunk (1,0) |
| Depth sorting breaks at boundaries | Phase 1: Infinite World Foundation | Entity in chunk (0,0) behind tile in chunk (1,0) renders correctly |
| WebSocket room subscription leak | Phase 2: Multi-Chunk Streaming | Memory profiler shows room count equals expected (9 per player) |
| Procedural generation seed desync | Phase 1: Infinite World Foundation | Unit test: server chunk hash === client chunk hash for 100 seeds |
| Memory leak from Phaser containers | Phase 2: Multi-Chunk Streaming | Load 50 chunks, unload all, memory returns within 10% of baseline |
| Biome transition artifacts | Phase 3: Biome Blending | Visual inspection: no hard lines visible at chunk boundaries |
| Client prediction rollback destroys chunk state | Phase 2: Multi-Chunk Streaming | Induce rollback during zone transition, verify chunk state matches server |
| Structure generation non-determinism | Phase 1: Infinite World Foundation | Generate chunk 1000x, all structure positions identical |
| Chunk loading priority deadlock | Phase 2: Multi-Chunk Streaming | Pathfind across 3 chunks, verify smooth loading with no cancellations |
| Server chunk cache unbounded | Phase 2: Multi-Chunk Streaming | 100 players explore for 1 hour, server memory stays under 200MB |

## Sources

### Research Sources

**Multiplayer Synchronization:**
- [How to Handle Real-Time Synchronization in a Large Multiplayer World](https://vocal.media/gamers/how-to-handle-real-time-synchronization-in-a-large-multiplayer-world)
- [Multiplayer Game Development Basics: Networking, Matchmaking, and Sync](https://medium.com/coinmonks/multiplayer-game-development-basics-networking-matchmaking-and-sync-6b4b8b117dde)
- [Modding:Synchronization - Vintage Story Wiki](https://wiki.vintagestory.at/Modding:Synchronization)

**Chunk Loading Performance:**
- [Lag Spikes - Procedural Chunk-based 2D Tilemap World Generation](https://discussions.unity.com/t/lag-spikes-procedural-chunk-based-2d-tilemap-world-generation-w-advanced-rule-tiles-on-the-fly/900130)
- [Chunk Loading system for tile-based procedural generation](https://devforum.roblox.com/t/chunk-loading-system-for-tile-based-procedural-generation/3809926)
- [Minecraft Server Chunk Loading: Performance Impact](https://gameteam.io/blog/minecraft-server-chunk-loading-performance-impact/)

**Biome Transitions:**
- [The Future of World Generation – Hytale](https://hytale.com/news/2026/1/the-future-of-world-generation)
- [Procedural World Generation with Biomes in Unity](https://medium.com/@mrrsff/procedural-world-generation-with-biomes-in-unity-a474e11ff0b7)
- [AutoBiomes: procedural generation of multi-biome landscapes](https://link.springer.com/article/10.1007/s00371-020-01920-7)

**Depth Sorting & Rendering:**
- [Isometric depth sorting - GameDev.net](https://www.gamedev.net/forums/topic/470599-isometric-depth-sorting/)
- [Unity - Manual: Tilemap Renderer isometric modes](https://docs.unity3d.com/Manual/Tilemap-Isometric-RenderModes.html)
- [Chunk batch drawing an isometric map?](https://www.gamedev.net/forums/topic/698662-chunk-batch-drawing-an-isometric-map/)

**Client-Side Prediction:**
- [Client-Side Prediction and Server Reconciliation - Gabriel Gambetta](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)
- [Predicting Chaos: Implementing Physics-Based Multiplayer Games](https://medium.com/@yaman_15640/predicting-chaos-implementing-physics-based-multiplayer-games-with-client-side-prediction-and-d82571316d5f)

**Memory Management:**
- [The Unity Memory Leak Detective: How I Learned to Hunt Down Memory Issues](https://outscal.com/blog/unity-memory-leak-investigation)
- [Address the Point of Interest system memory leak in vanilla](https://github.com/neoforged/NeoForge/issues/398)
- [Memory Leak In a Voxel Game](https://devforum.roblox.com/t/memory-leak-in-a-voxel-game/3030897)

**WebSocket Room Management:**
- [How to Handle WebSocket Room/Channel Management](https://oneuptime.com/blog/post/2026-01-24-websocket-room-channel-management/view)
- [Rooms | Socket.IO](https://socket.io/docs/v3/rooms/)
- [WebSocket architecture best practices](https://ably.com/topic/websocket-architecture-best-practices)

**Deterministic Generation:**
- [Procedural generation - Wikipedia](https://en.wikipedia.org/wiki/Procedural_generation)
- [Map seed - Grokipedia](https://grokipedia.com/page/Map_seed)
- [Deterministic simulation for lockstep multiplayer engines](https://www.daydreamsoft.com/blog/deterministic-simulation-for-lockstep-multiplayer-engines)

### Codebase Analysis
- `packages/world-gen/src/generation/chunk.ts` - Chunk generation, biome per-chunk
- `apps/web/src/game/rendering/ChunkManager.ts` - 3x3 chunk loading, unload logic
- `apps/game-server/src/zones/zones.service.ts` - Server-side chunk caching, cleanup
- `apps/web/src/game/rendering/ViewportCuller.ts` - Viewport culling with padding
- `packages/game-logic/src/visibility/range.ts` - Entity visibility using zone ID matching
- `apps/game-server/src/game/game.gateway.ts` - WebSocket room join/leave on zone transition
- `apps/web/src/game/rendering/TileRenderer.ts` - World vs local coordinate rendering
- `apps/web/src/game/rendering/DepthSorter.ts` - Depth calculation from grid coordinates

---
*Pitfalls research for: Infinite World Chunk Streaming (Multiplayer 2D Tile-Based Game)*
*Researched: 2026-02-16*
