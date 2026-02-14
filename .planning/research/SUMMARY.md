# Project Research Summary

**Project:** Into the Void - Post-Login Game Experience
**Domain:** Multiplayer 2D Sci-Fi Survival MMO (WebSocket-based real-time gameplay)
**Researched:** 2026-02-14
**Confidence:** HIGH

## Executive Summary

Into the Void is a multiplayer 2D sci-fi survival MMO with solid existing infrastructure. The current stack (React + Phaser 3, NestJS + Socket.IO, Zustand, shared packages for game-logic/world-gen) is production-ready and requires minimal new dependencies. The core challenge is integrating three distinct layers—React UI (HUD), Phaser canvas (game rendering), and WebSocket networking (real-time state sync)—while avoiding common pitfalls that cause memory leaks, desync, and poor network feel.

The recommended approach follows proven patterns from established multiplayer games: EventBus bridge for React-Phaser communication, client-side prediction with server reconciliation for responsive movement, entity interpolation for smooth rendering, and zone-based Socket.IO rooms for scalable broadcasts. The existing architecture already implements WebSocket authentication, zone state sync, and movement validation—new work focuses on completing the client-side game loop and wiring HUD components.

Key risks center around integration boundaries and timing: Phaser memory leaks on React unmount, race conditions between async auth and socket room joins, missing client-side prediction causing laggy feel, and Zustand updates from game loop causing React render thrashing. These are well-documented problems with established solutions that must be implemented correctly from the start rather than retrofitted later.

## Key Findings

### Recommended Stack

The existing stack is sufficient—no major library additions needed. Focus is on minor version updates and integration patterns rather than new technology adoption.

**Core technologies:**
- Phaser 3.90+ (from 3.80): Stability improvements for EXPAND scale mode, better DynamicTexture rendering, camera matrix fixes
- Socket.IO 4.8.3 (from 4.7): Improved transport fallback, binary data fixes, better cookie handling with credentials
- Immer 10.0 (NEW): Immutable state updates for nested Zustand state, prevents accidental mutations in entity/zone registries
- TypeScript 5.9 (from 5.4): Latest stable release with improved type inference and performance

**Integration patterns (critical success factors):**
- EventBus pattern: Official Phaser-React template approach for decoupled cross-boundary communication
- Client prediction + server reconciliation: Industry standard from QuakeWorld, now universal for responsive multiplayer feel
- Object pooling for entities: Prevents FPS drops from garbage collection (35-40 FPS → stable 60 FPS with 3x entities)
- Socket.IO zone-based rooms: Already implemented in existing gateway, provides efficient broadcast isolation

### Expected Features

**Must have (table stakes for post-login MVP):**
- WASD/arrow key movement with client-side prediction (PC game baseline, prevents laggy feel)
- Tile-based world rendering with color-coded biomes (no sprites, color tiles as stated requirement)
- Viewport culling for performance (essential for worlds larger than single screen)
- Network state synchronization via Socket.IO (multiplayer core, already partially implemented)
- Player health/energy display in HUD (survival mechanic feedback)
- Current zone/biome indicator (critical per lore: entering wrong tier = death)
- Other player entities visible with smooth interpolation (multiplayer awareness)
- Click-to-move with A* pathfinding (genre expectation for isometric/top-down games)
- Static entity registry in code (fast spawns, lore-consistent "species catalog")

**Should have (competitive differentiators):**
- Dual movement system: WASD + click simultaneous (tactical flexibility, rare in MMOs)
- Faction-specific HUD theming via CSS variables (immersion in corporate identity)
- Entity behavioral classification icons (Herbivore/Predator/Maniac per lore)
- Client-side prediction with visible rollback (network transparency, builds trust vs teleporting)
- Minimap with biome color-coding (strategic planning, MMORPG standard placement)

**Defer (v2+ until MVP validated):**
- Procedural chunk streaming (premature optimization until world size demonstrates need)
- Advanced interpolation for all entities (start simple, optimize after profiling)
- Biome tier visual indicators (defer until multiple tiers accessible)
- Disconnect/reconnect action queue (add after network stability issues identified)

**Anti-features (avoid):**
- Real-time interpolation for all entities: CPU cost at MMO scale, use viewport culling instead
- Minimap with full entity tracking: Information overload, removes survival tension
- Pixel-perfect pathfinding: Overkill for tile-based movement, use grid-resolution A*
- Global entity registry shared across clients: Bandwidth explosion, use zone-based interest management

### Architecture Approach

The integration architecture connects three layers through clear boundaries: React (UI state in Zustand), Phaser (game rendering/input), and Socket.IO (network sync). EventBus acts as the decoupling layer between React and Phaser, NetworkSync coordinates socket events to store updates and EventBus emissions, and EntityRegistry manages client-side entity lifecycle with object pooling.

**Major components:**
1. **EventBus (NEW)** — React ↔ Phaser bridge using Phaser EventEmitter, official template pattern for decoupled communication
2. **NetworkSync (NEW)** — Centralized socket event handler registration, coordinates socket → Zustand → EventBus flow
3. **EntityRegistry (NEW)** — Client-side entity management with object pooling, prevents garbage collection FPS drops
4. **WorldScene (EXTEND)** — Phaser scene for tile rendering, entity sprites, input handling with client prediction
5. **GameGateway (EXISTS)** — NestJS WebSocket gateway with auth handshake, zone room management, movement validation
6. **ZonesService (EXISTS)** — Lazy chunk loading with 5-minute cleanup, in-memory entity registry
7. **gameStore (EXTEND)** — Add entity registry slice and zone state, use Immer middleware for nested updates

**Data flow patterns:**
- Connection: CharacterSelect → socket.connect() → auth event with JWT → server validates → join zone room → client receives zone:state → Phaser renders
- Movement: User input → client predicts position → update local sprite immediately → emit to server → server validates → broadcast to zone → client reconciles if mismatch
- Entity sync: Server emits entity:spawn to zone room → NetworkSync updates store → EventBus bridges to Phaser → EntityRegistry spawns sprite from pool

### Critical Pitfalls

1. **WebSocket auth without handshake validation** — Token validation in auth handler doesn't prevent unauthenticated clients from calling other message handlers. Add guards to ALL handlers except 'auth', use NestJS execution order (Middleware → Guards → Handler), store authenticated state in socket.data. Address in Phase 1 (Connection & Auth).

2. **Race condition between socket join and async database queries** — Socket disconnects while DB query in-flight, then client.join(roomId) executes AFTER disconnect, creating ghost players in rooms. Check client.connected status BEFORE every join() call, perform all async operations before socket mutations. Address in Phase 1.

3. **Phaser memory leaks on React unmount** — game.destroy() doesn't fully clean up cache, world, event listeners. Use useLayoutEffect (not useEffect), manual cleanup sequence (cache.destroy(), world.destroy(), events.removeAllListeners(), window event cleanup), ref to prevent double-init in StrictMode. Address in Phase 2 (Phaser Integration).

4. **Client prediction without server reconciliation** — Client predicts movement for responsiveness but never reconciles with server state, causing position desync, wall clipping, impossible positions. Implement sequence numbers, input buffering, state rollback/fast-forward pattern. Address in Phase 3 (Movement Validation).

5. **Entity interpolation missing or misconfigured** — Rendering entities directly from server updates (10-20Hz) looks choppy at 60fps. Maintain buffer of 2-3 server states, render 100ms in past, interpolate between snapshots. Address in Phase 4 (Entity Rendering).

6. **Zustand store updates inside Phaser game loop** — Calling Zustand setters from update() (60fps) triggers React re-renders every frame, UI sluggish, FPS tanks. Keep Phaser state in Phaser (game.data/scene.data), Zustand only for UI-relevant state, event-driven updates only. Address in Phase 2 & 5 (Integration + State Bridge).

7. **Missing reconnection state recovery** — Player disconnects/reconnects with new socket ID, server treats as new connection, loses position/zone/combat state. Store session by characterId (not socket ID), implement 30-60 second grace period, transfer state from old socket to new. Address in Phase 1.

8. **NestJS guard/middleware execution order confusion** — Guards run in unexpected order, allowing auth bypass or performance issues from premature DB queries. Understand execution order (Middleware → Global Guards → Controller Guards → Route Guards), use @UseGuards array in correct order, document dependencies. Address in Phase 1.

## Implications for Roadmap

Based on research, suggested phase structure follows dependency order and pitfall prevention:

### Phase 1: WebSocket Connection & Auth Handshake
**Rationale:** Foundation for all multiplayer features. Auth race conditions and guard issues must be solved before building complex state sync. Existing gateway has partial implementation but missing guard protection and reconnection handling.

**Delivers:** Secure WebSocket connection with JWT validation, character authentication, zone room subscription, session restoration on reconnect

**Addresses:**
- Must-have: Network state synchronization (foundation)
- Critical pitfalls: Auth without guards (#1), room join race conditions (#2), missing reconnection (#7), guard execution order (#8)

**Implementation notes:**
- Add WsAuthGuard to all @SubscribeMessage handlers except 'auth'
- Implement IoAdapter middleware for handshake-level JWT validation
- Store session by characterId in PlayerService with 60-second grace period
- Check client.connected before all client.join() calls
- Test: send 'player:move' before 'auth' → should reject with 401

### Phase 2: Phaser Integration & Canvas Setup
**Rationale:** Game rendering foundation. Memory leak and state management patterns must be correct before adding entities/movement. EventBus pattern establishes React-Phaser boundary.

**Delivers:** Phaser game instance with proper lifecycle, EventBus for React-Phaser communication, tile-based world rendering with viewport culling, HUD shell

**Addresses:**
- Must-have: Tile-based world rendering, viewport culling
- Should-have: Faction-specific HUD theming
- Critical pitfalls: Phaser memory leaks (#3), Zustand in game loop (#6)

**Implementation notes:**
- Create EventBus.ts following official Phaser-React template pattern
- Use useLayoutEffect (not useEffect) for Phaser initialization
- Comprehensive cleanup: cache.destroy(), world.destroy(), event listener removal
- Test: mount/unmount 10 times → heap size stable in DevTools profiler

### Phase 3: Movement Validation & Sync
**Rationale:** Core gameplay interaction. Client prediction pattern is complex and must be implemented correctly from start, not retrofitted. Builds on Phase 1 (auth/connection) and Phase 2 (rendering).

**Delivers:** WASD/arrow key input, client-side prediction with immediate visual feedback, server-authoritative validation, smooth correction on mismatch, click-to-move with A* pathfinding

**Addresses:**
- Must-have: WASD movement, click-to-move, network state sync (movement)
- Should-have: Dual movement system (WASD + click simultaneous)
- Critical pitfall: Client prediction without reconciliation (#4)

**Implementation notes:**
- Implement sequence numbers for inputs sent to server
- Client buffer stores last 100ms of inputs
- Server includes last processed sequence in player:moved events
- Client rewinds to sequence, applies unacknowledged inputs, fast-forwards to present
- Use game-logic package for both client and server validation
- Test: 200ms artificial latency → movement feels instant locally

### Phase 4: Entity Rendering & Registry
**Rationale:** Multiplayer awareness. Requires movement sync (Phase 3) working first. Object pooling and interpolation prevent performance issues that are hard to fix later.

**Delivers:** Other player entities visible, entity spawn/despawn/update sync, object pooling for sprite reuse, smooth interpolation for remote entities, entity behavioral icons

**Addresses:**
- Must-have: Other player entities, static entity registry
- Should-have: Entity behavioral classification icons
- Critical pitfall: Entity interpolation missing (#5)

**Implementation notes:**
- Create EntityRegistry.ts with object pooling
- Maintain buffer of 2-3 server states per entity
- Render entities 100ms in past (interpolation delay)
- Linear interpolation between snapshots for smooth 60fps rendering
- Phaser tweens for position updates (duration: 100ms, ease: Linear)
- Test: Remote player moves smoothly at 60fps with 20Hz server updates

### Phase 5: HUD Implementation & State Bridge
**Rationale:** UI layer completes the post-login experience. Depends on game state from Phases 3-4. EventBus pattern from Phase 2 makes this integration clean.

**Delivers:** Health/energy display, zone/biome indicator, minimap with biome colors, quick slots/hotbar, connection state indicators

**Addresses:**
- Must-have: Player health/energy display, current zone indicator
- Should-have: Minimap with biome color-coding

**Implementation notes:**
- HUD components subscribe to EventBus events (player:health-changed, zone:changed)
- Zustand store only holds UI-relevant state (showInventory, chatMessages)
- No Zustand updates from Phaser update() loop
- Debounce any game-state-to-UI updates to max 10/second
- Test: FPS stable with all HUD components mounted

### Phase Ordering Rationale

- **Phase 1 first:** Auth race conditions and guard issues create security holes and ghost player bugs. Session restoration prevents user frustration from network hiccups. All subsequent phases depend on reliable connection.

- **Phase 2 before 3:** Memory leaks from Phaser destroy issues compound with entity spawning. EventBus pattern must exist before movement/entities need to communicate with React. State management boundaries prevent later refactoring.

- **Phase 3 before 4:** Entity interpolation requires understanding movement sync first. Client prediction pattern for player movement applies to remote entities. Click-to-move pathfinding validates A* implementation before entity AI pathfinding.

- **Phase 4 before 5:** HUD displays entity/player state, so entities must exist first. Object pooling benefits from early implementation before entity types proliferate. Interpolation smoothness is user-facing quality metric.

- **Phase 5 last:** UI is consumer of game state, not producer. HUD can be stubbed during earlier phases. EventBus established in Phase 2 makes final wiring straightforward.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3:** Click-to-move A* pathfinding implementation — while pattern is standard, grid-based A* for Phaser 3 has nuances around tile coordinate conversion and performance optimization. May need research-phase for pathfinding library selection (custom vs library).

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** WebSocket auth patterns well-documented in NestJS + Socket.IO docs, guard execution order is official framework behavior
- **Phase 2:** Phaser-React integration using official template pattern, memory cleanup is documented
- **Phase 4:** Object pooling and interpolation are established patterns with clear implementation guides
- **Phase 5:** React component → EventBus subscription is straightforward once EventBus established

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack validated, version updates minor, integration patterns from official sources |
| Features | MEDIUM-HIGH | Table stakes identified from competitor analysis, differentiators from lore alignment, anti-features from performance research |
| Architecture | HIGH | Existing codebase examined, integration patterns verified against official Phaser-React template and NestJS docs |
| Pitfalls | HIGH | All pitfalls sourced from official GitHub issues, established multiplayer game dev resources (Valve, Gabriel Gambetta), and NestJS documentation |

**Overall confidence:** HIGH

### Gaps to Address

- **A* pathfinding library selection:** Research identified grid-based A* as the pattern but didn't evaluate specific Phaser 3 pathfinding libraries (custom vs easystarjs vs Phaser plugins). Address during Phase 3 planning with targeted research-phase if needed.

- **Chunk streaming implementation details:** Deferred to v2+ but will eventually need research on Phaser tilemap chunking patterns, off-main-thread generation, and cache strategies. Flag for future milestone research.

- **Specific collision map data structure:** Research established client needs collision map for prediction validation but didn't specify optimal format (2D array vs tilemap vs spatial hash). Validate during Phase 3 implementation based on world-gen package output.

- **Minimap rendering approach:** Should-have feature with standard placement (top-right) identified but implementation approach (separate Phaser scene vs Canvas 2D vs pre-rendered) needs validation during Phase 5 based on performance profiling.

## Sources

### Primary (HIGH confidence)
- [Phaser 3.90 Changelog](https://phaser.io/news/2025/05/phaser-v390-released) — Version updates and features
- [Socket.IO 4.8.0 Changelog](https://socket.io/docs/v4/changelog/4.8.0) — Transport improvements
- [Socket.IO Rooms Documentation](https://socket.io/docs/v3/rooms/) — Zone isolation pattern
- [Official Phaser-React Template](https://github.com/phaserjs/template-react) — EventBus pattern
- [NestJS WebSocket Guards Documentation](https://docs.nestjs.com/websockets/guards) — Auth patterns
- [Client-Side Prediction and Server Reconciliation - Gabriel Gambetta](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) — Movement sync pattern
- [Fast-Paced Multiplayer: Entity Interpolation - Gabriel Gambetta](https://www.gabrielgambetta.com/entity-interpolation.html) — Rendering pattern
- [Source Multiplayer Networking - Valve](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking) — Industry best practices

### Secondary (MEDIUM confidence)
- [Phaser 3 Object Pooling](https://blog.ourcade.co/posts/2020/phaser-3-optimization-object-pool-basic/) — Performance benchmarks
- [Building Multiplayer Games Using Phaser 3 and Socket.IO](https://blog.yudiz.com/how-to-build-multiplayer-games-using-phaser3-and-socket-io/) — Integration patterns
- [The Wrong Way to Integrate Phaser With React](https://medium.com/@larry.sassainsworth/the-wrong-way-to-integrate-phaser-with-react-d85e3b226cf9) — Anti-patterns
- [Zustand WebSocket Discussion #1651](https://github.com/pmndrs/zustand/discussions/1651) — State sync patterns
- [NestJS Guards Execution Order Issue #1567](https://github.com/nestjs/docs.nestjs.com/issues/1567) — Framework behavior

### Tertiary (LOW confidence, needs validation)
- Competitor feature analysis (Tibia, Minecraft Dungeons) — Used for feature prioritization but implementation details differ
- Unity/Godot optimization guides — 2D patterns transferable but engine-specific optimizations don't apply

---
*Research completed: 2026-02-14*
*Ready for roadmap: yes*
