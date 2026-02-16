# Project Research Summary

**Project:** Into the Void - Infinite World with Seamless Chunk Streaming
**Domain:** Multiplayer 2D Sci-Fi Survival MMO with Procedural World Generation
**Researched:** 2026-02-16
**Confidence:** HIGH

## Executive Summary

The existing codebase is already architected for infinite world chunk streaming. All required components exist: SimplexNoise for seamless terrain, BiomeGenerator with multi-layer noise (temperature/moisture/elevation), ChunkManager handling 3x3 pre-loading, and Socket.IO room-based zone subscriptions. Zero new dependencies needed. The milestone requires activating existing patterns, not building new systems.

The recommended approach is to treat zones as chunks with coordinates, enable the existing 3x3 chunk loading that already works, and integrate the BiomeGenerator that's already generating seamless biomes. The architecture uses deterministic server-side generation with client-side caching, WebSocket streaming for chunk delivery, and viewport-based loading with automatic unloading of distant chunks.

Key risks are entity visibility across chunk boundaries (must use world coordinates, not zone ID matching), depth sorting breaks without world coordinates, and memory leaks from Phaser containers if not explicitly destroyed. All risks are preventable with existing code patterns - the research identified that critical systems like BiomeGenerator and SimplexNoise already use world coordinates correctly.

## Key Findings

### Recommended Stack

The stack is complete. No new packages needed. Research verified that all capabilities for infinite world streaming exist in current dependencies. SimplexNoise (custom implementation) uses world coordinates for seamless terrain across chunks. BiomeGenerator uses three noise layers (temperature 0.005, moisture 0.007, elevation 0.003 scales) for natural biome transitions. ChunkManager loads 3x3 grids and tracks chunk states. Socket.IO 4.7 handles room-based broadcasting. Phaser 3.80 provides native Container destruction for memory cleanup.

**Core technologies (all present):**
- SimplexNoise (custom) — Multi-octave procedural noise with fbm() and ridged(), already uses world coordinates for seamless generation
- BiomeGenerator (custom) — Three noise layers (temperature/moisture/elevation) generate seamless biomes, already correct for infinite world
- Socket.IO ^4.7.0 — Room-based broadcasting for zone subscriptions, proven scalable for chunk streaming
- Phaser ^3.80.0 — Client rendering with native Container destruction for memory cleanup
- ChunkManager (custom) — 3x3 chunk loading with state tracking (loading/loaded/failed), already correct for infinite world
- WorldGenerator (custom) — Deterministic chunk generation from world seed, perfect for infinite world (no storage needed)

### Expected Features

Research reveals this milestone focuses on infrastructure (chunk streaming, biome integration) not visual features. The elevation and structure features referenced in other documentation are already implemented. This milestone activates infinite world capabilities that exist but currently operate in single-zone mode.

**Must have (table stakes - infrastructure):**
- 3x3 chunk pre-loading around player position
- Seamless biome transitions using noise layers
- Deterministic chunk generation from world seed
- Chunk unloading when player moves away
- Viewport-based chunk requests via WebSocket
- Server-side chunk caching with cleanup

**Should have (competitive - UX):**
- Loading indicators for pending chunks
- Biome display in HUD
- Smooth chunk fade-in (not instant pop)
- Minimap updates for multi-chunk view

**Defer (v2+):**
- Redis-based chunk cache (only needed at 100+ players)
- Multi-server scaling with Pub/Sub (only at 1000+ players)
- Player-modified chunks (building/terrain editing)
- Predictive pre-loading based on movement direction

### Architecture Approach

The architecture uses a viewport-based chunk loading pattern with deterministic server-side generation. Client ChunkManager tracks loaded chunks and requests missing ones via WebSocket. Server ZonesService caches generated chunks with LRU cleanup (5min TTL). WorldGenerator produces deterministic chunks from seed, using BiomeGenerator for noise-based biome assignment. All generation uses world coordinates (not chunk-local) for seamless boundaries.

**Major components (all existing):**
1. ChunkManager (client) — Tracks viewport, requests chunks from server, caches loaded chunks, unloads distant chunks (Map-based cache with state tracking)
2. ViewportCuller (client) — Calculates visible tiles based on camera bounds, hides/shows tiles dynamically (frustum culling with padding)
3. TileRenderer (client) — Creates Phaser sprites/graphics for tiles, handles isometric projection with elevation (Container-based rendering with depth sorting)
4. GameGateway (server) — Handles WebSocket events for chunk requests, routes to ZonesService (NestJS WebSocket gateway with event handlers)
5. ZonesService (server) — Caches generated chunks, lazy-loads on demand, cleanup old zones (Map-based cache with LRU cleanup)
6. WorldGenerator (server) — Generates chunks deterministically from seed, applies biome noise layers (Simplex noise with multiple octaves)
7. BiomeGenerator (server) — Generates temperature/moisture/elevation noise fields using world coordinates (3 separate noise instances with different scales)

### Critical Pitfalls

1. **Entity Visibility Boundary Mismatch** — Visibility logic uses zone ID matching (`zoneId !== player.zoneId`) instead of world coordinate distance. This causes entities to disappear at chunk edges. Fix: Replace zone ID matching with world coordinate distance checks using `getSubscribedZones()` pattern (already exists in codebase lines 117-128). Must address in Phase 1 before cross-chunk movement.

2. **Depth Sorting Breaks at Chunk Boundaries** — Depth calculation uses local chunk coordinates (0-31) instead of world coordinates, causing z-fighting between chunks. Each chunk's tiles have overlapping depth values. Fix: Pass world coordinates to depth calculation (`worldX = chunkX * ZONE_SIZE + localX`). Pattern already exists in `createTileWithElevationWorld()`. Must address in Phase 1 for correct rendering.

3. **WebSocket Room Subscription Leak** — Players join new zone rooms but don't leave old rooms during transitions. After 10 zone transitions, player is subscribed to 10 rooms receiving 10x traffic. Memory leaks on server. Fix: Always `client.leaveAll()` before joining new room, track subscriptions in PlayerService, explicit cleanup on disconnect. Critical for Phase 2 when 3x3 loading (9 rooms per player) is active.

4. **Phaser Container Memory Leak** — ChunkManager unloads chunks by deleting from Map but doesn't destroy Phaser containers. Each chunk has 1024 tile containers (32x32 grid). After 100 chunks, client has 102,400 undestroyed containers (~500MB RAM). Fix: Call `container.destroy(true)` recursively on all children before Map.delete(). Must address in Phase 2 when chunk unloading is active.

5. **Biome Transition Artifacts** — BiomeGenerator determines biome per-chunk using chunk center, creating hard boundaries between chunks. Fix: Sample biome at each tile's world coordinates (pattern already exists as `getBiomeAt(worldX, worldY)` in codebase line 77). Requires terrain generation refactor for Phase 3.

## Implications for Roadmap

Based on research, the milestone should be structured around activating existing capabilities rather than building new systems. The architecture is complete but operates in single-zone mode. Phasing should focus on coordinate system migration first (foundation), then multi-chunk activation (core feature), then polish (biome blending, UX).

### Phase 1: Infinite World Foundation (Coordinate System & World Coordinates)
**Rationale:** All rendering, visibility, and depth calculations must use world coordinates before multi-chunk loading works. Current code uses chunk-local coordinates (0-31) which causes depth sorting and entity visibility to break at chunk boundaries. This phase establishes the coordinate foundation that all subsequent phases depend on.

**Delivers:**
- Coordinate system treating zones as chunks (`z_x_y` format)
- Depth sorting using world coordinates (not chunk-local)
- Entity visibility using world coordinate distance (not zone ID matching)
- Deterministic chunk generation with versioning
- Foundation for seamless cross-chunk gameplay

**Addresses features:**
- Deterministic chunk generation from world seed (table stakes)
- Seamless biome transitions (infrastructure for Phase 2)

**Avoids pitfalls:**
- Pitfall 1: Entity visibility boundary mismatch (use world coords)
- Pitfall 2: Depth sorting breaks at boundaries (world coord depth)
- Pitfall 4: Procedural generation seed desync (add versioning)
- Pitfall 8: Structure generation non-determinism (verify SeededRandom usage)

**Research flag:** SKIP RESEARCH - patterns already verified in codebase, official docs sufficient.

### Phase 2: Multi-Chunk Streaming (3x3 Loading & Unloading)
**Rationale:** With world coordinates established, activate the existing 3x3 chunk loading system. ChunkManager already implements this pattern but needs WebSocket integration for chunk requests and cleanup logic for Phaser containers. This is the core feature that enables infinite exploration.

**Delivers:**
- 3x3 chunk pre-loading around player position
- Viewport-based chunk requests via WebSocket
- Chunk unloading when player moves away
- Server-side chunk caching with LRU cleanup
- Cross-chunk movement without visual breaks

**Uses stack:**
- Socket.IO 4.7 (room-based chunk streaming)
- ChunkManager (3x3 grid loading, already implemented)
- ZonesService (server-side chunk cache with 5min TTL)
- Phaser Container destruction (memory cleanup)

**Implements architecture:**
- Pattern 1: Viewport-Based Chunk Loading (3x3 grid)
- Pattern 4: Server-Side Chunk Cache with LRU Cleanup
- Pattern 5: WebSocket Chunk Streaming (zone:request / zone:chunk events)

**Avoids pitfalls:**
- Pitfall 3: WebSocket room subscription leak (explicit leave/join for 9 rooms)
- Pitfall 5: Phaser container memory leak (destroy containers on unload)
- Pitfall 7: Client prediction rollback (mark chunks as predicted vs confirmed)
- Pitfall 9: Chunk loading priority deadlock (priority queue for requests)
- Pitfall 10: Server chunk cache unbounded (LRU with max size 500 chunks)

**Research flag:** SKIP RESEARCH - architecture documented, WebSocket patterns established in game-server.

### Phase 3: Biome Integration & Visualization (Seamless Biome Transitions)
**Rationale:** With multi-chunk loading working, integrate BiomeGenerator for natural biome distribution. This is primarily a world generation enhancement - the noise system already exists and uses world coordinates correctly. Main work is terrain generation refactor to sample biome per-tile instead of per-chunk.

**Delivers:**
- Seamless biome transitions using noise layers
- Per-tile biome sampling (not per-chunk)
- Biome display in HUD
- Natural climate zones (temperature/moisture gradients)
- No visible grid artifacts at chunk boundaries

**Uses stack:**
- BiomeGenerator (already uses world coords, correct for infinite world)
- SimplexNoise (multi-octave fbm with temperature/moisture/elevation)
- TerrainGenerator (refactor to use per-tile biome sampling)

**Implements architecture:**
- Pattern 3: Multi-Layer Noise Biome System (temperature/moisture/elevation)
- Integration with WorldGenerator for per-tile biome lookup

**Avoids pitfalls:**
- Pitfall 6: Biome transition artifacts (use `getBiomeAt(worldX, worldY)` per tile)

**Research flag:** SKIP RESEARCH - BiomeGenerator already implemented and researched, pattern is clear.

### Phase 4: Testing, Optimization & Polish (Validation)
**Rationale:** With core systems active, this phase validates performance, fixes edge cases discovered in testing, and adds UX polish. Research shows pre-loading (3x3 grid) masks network latency well, so optimization focuses on memory usage and chunk request patterns.

**Delivers:**
- Cross-chunk movement testing (collision, pathfinding, visibility)
- Memory profiling (verify cleanup works, no leaks)
- Performance optimization (chunk request debouncing, priority queue)
- UX polish (loading indicators, fade-in animations, minimap updates)
- Edge case fixes discovered in integration testing

**Uses stack:**
- Chrome DevTools (network profiling, memory profiler)
- Phaser Dev Tools (runtime chunk inspection)

**Addresses features:**
- Loading indicators for pending chunks (UX polish)
- Smooth chunk fade-in (UX polish)
- Minimap updates for multi-chunk view (UX polish)

**Avoids pitfalls:**
- Pitfall 12: Chunk loading priority deadlock (debounce requests, priority queue)
- Validate all Phase 1-3 pitfall fixes with integration testing

**Research flag:** SKIP RESEARCH - testing and optimization, no new patterns.

### Phase Ordering Rationale

- **Phase 1 first** because depth sorting and visibility MUST use world coordinates before multi-chunk rendering works. Without this foundation, chunks render incorrectly and entities disappear at boundaries. Research confirms existing code has world coordinate patterns (BiomeGenerator, SimplexNoise) but rendering/visibility doesn't use them yet.

- **Phase 2 depends on Phase 1** because 3x3 chunk loading only works if depth sorting uses world coordinates. Loading 9 chunks with chunk-local depth causes z-fighting. Room subscription management (9 rooms per player) also requires careful leak prevention.

- **Phase 3 after Phase 2** because biome transitions are visual polish, not functional blocker. Multi-chunk streaming must work first. BiomeGenerator already uses world coordinates, so this is primarily a terrain generation refactor (per-tile sampling instead of per-chunk).

- **Phase 4 is validation** of all previous phases working together. Research shows performance bottleneck is network latency (50-200ms), not generation (5-15ms) or rendering (0.1ms), so pre-loading masks latency. Optimization focuses on memory cleanup and request patterns.

**Dependency chain:** World coordinates → Multi-chunk loading → Biome integration → Testing/polish

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase 1:** World coordinate conversion is established pattern, SimplexNoise and BiomeGenerator already demonstrate correct usage
- **Phase 2:** WebSocket chunk streaming pattern documented in Socket.IO official docs, ChunkManager already implements 3x3 loading
- **Phase 3:** BiomeGenerator already researched and implemented, pattern is clear (per-tile sampling using world coords)
- **Phase 4:** Testing and optimization phase, no new domain-specific patterns

**No phases need `/gsd:research-phase`** - all patterns verified in existing codebase and official documentation. Research completed at project level is sufficient.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All required capabilities verified in existing codebase. Zero new dependencies needed. SimplexNoise, BiomeGenerator, ChunkManager, Socket.IO all confirmed working with world coordinates. |
| Features | HIGH | Feature scope clear - activate existing infrastructure, not build new visual features. Elevation/structures already implemented. This milestone is about infinite world, not terrain features. |
| Architecture | HIGH | Architecture is complete and verified. All components exist (ChunkManager, WorldGenerator, BiomeGenerator, ZonesService). Patterns documented with examples from codebase. Integration points identified. |
| Pitfalls | HIGH | All 10 critical pitfalls identified with specific codebase line numbers, warning signs, prevention strategies, and phase assignments. Recovery costs assessed. Common mistakes well-documented. |

**Overall confidence:** HIGH

### Gaps to Address

**Minor gaps requiring validation during implementation:**

- **Generation version schema** — ChunkData needs generation version field for cache invalidation. Research identified the requirement (Pitfall 4) but implementation details depend on schema design decisions. Add version field to ChunkData, include in cache key.

- **Chunk request rate limiting** — Research recommends 10 chunks/second per client (Security Mistakes section) but optimal limit depends on server capacity. Start with 10/sec, tune based on load testing in Phase 4.

- **Biome transition zone width** — Research suggests 3-5 tile transition zone for blending, but visual quality depends on tile artwork and biome combinations. Test different widths in Phase 3, may need artist input.

- **Server chunk cache size** — Research recommends max 500 chunks for LRU cache, but optimal size depends on player distribution and server memory. Start with 500, monitor memory usage in Phase 4, adjust based on data.

**All gaps are minor and can be resolved during implementation.** No gaps block milestone planning or execution. Research provided sufficient guidance for all critical decisions.

## Sources

### Primary (HIGH confidence)

**Current Codebase (verified implementation):**
- `/packages/world-gen/src/generation/biome.ts` — BiomeGenerator using world coordinates (lines 74+)
- `/packages/world-gen/src/generation/terrain.ts` — SimplexNoise with world coords (line 129)
- `/packages/world-gen/src/generation/chunk.ts` — WorldGenerator deterministic generation
- `/apps/web/src/game/rendering/ChunkManager.ts` — 3x3 chunk loading (line 55)
- `/apps/web/src/game/rendering/TileRenderer.ts` — World vs local coordinate rendering (lines 170-215)
- `/apps/game-server/src/game/game.gateway.ts` — WebSocket room join/leave (line 82)
- `/packages/game-logic/src/visibility/range.ts` — Entity visibility patterns (lines 117-128)

**Official Documentation:**
- Socket.IO Rooms — https://socket.io/docs/v3/rooms/ — Room-based broadcasting patterns verified
- Socket.IO Broadcasting — https://socket.io/docs/v3/broadcasting-events/ — Event emission to specific clients/rooms
- Phaser 3.80 Performance Optimization — https://phaser.io/news/2025/03/how-i-optimized-my-phaser-3-action-game-in-2025 — Object pooling case study (container destruction)

### Secondary (MEDIUM confidence)

**Architecture Patterns:**
- Minecraft Terrain Generation — https://cybrancee.com/blog/how-minecraft-terrain-generation-works/ — Chunk-based world generation patterns
- Red Blob Games: Making Maps with Noise — https://www.redblobgames.com/maps/terrain-from-noise/ — Multi-octave noise patterns, persistence and lacunarity
- Procedural World Generation with Biomes — https://medium.com/@mrrsff/procedural-world-generation-with-biomes-in-unity-a474e11ff0b7 — Multi-biome landscape generation
- Client-Server Game Architecture — https://www.gabrielgambetta.com/client-server-game-architecture.html — Multiplayer synchronization patterns

**Multiplayer & Synchronization:**
- WebSocket Architecture Best Practices — https://ably.com/topic/websocket-architecture-best-practices — Scalable WebSocket patterns
- How to Handle Real-Time Synchronization in Large Multiplayer World — https://vocal.media/gamers/how-to-handle-real-time-synchronization-in-a-large-multiplayer-world — Synchronization strategies

**Performance & Memory:**
- Phaser Object Pooling Tutorial — https://www.thepolyglotdeveloper.com/2020/09/object-pooling-sprites-phaser-game-performance-gains/ — Container management for performance
- Chunk Loading Performance Impact — https://gameteam.io/blog/minecraft-server-chunk-loading-performance-impact/ — Server-side chunk caching strategies

### Tertiary (LOW confidence - informational context)

- AutoBiomes Research — https://link.springer.com/article/10.1007/s00371-020-01920-7 — Academic multi-biome approach (potentially over-engineering for 2D grid)
- WebSocket Chunking — https://www.xjavascript.com/blog/chunking-websocket-transmission/ — File transfer chunking (different use case, useful context)

---
*Research completed: 2026-02-16*
*Ready for roadmap: yes*
