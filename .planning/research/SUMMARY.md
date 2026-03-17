# Project Research Summary

**Project:** Into the Void — v1.27 Pixel Movement Rewrite
**Domain:** Multiplayer 2D isometric MMO — tile-step to continuous pixel movement migration
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

The v1.27 milestone is a surgical architectural rewrite, not a feature addition. The existing stack (Phaser 3 Arcade Physics, Socket.IO, NestJS, shared-types) is fully capable of continuous pixel movement — no new packages are required. The work replaces discrete tile-step mechanics with velocity-based movement: the client predicts position each frame via `setVelocity()`, sends key-bitmask input at 20Hz, and the server validates speed + collision then broadcasts authoritative positions at the same rate. Remote players are interpolated between server snapshots using a 2-snapshot linear lerp. The entire milestone is a controlled replacement of existing systems with zero external dependency additions.

The recommended approach is bottom-up, dependency-ordered: establish the coordinate contract in shared-types first (pixel floats as tile-unit floats, not arbitrary raw pixels), then build the server movement handler around that contract, then migrate all distance-dependent game systems (combat, gathering, AI, fog, zone boundaries, portals) to pixel Euclidean distance, and finally rewrite the client movement loop and remote player interpolation. This ordering ensures every build gate is testable in isolation and eliminates the most catastrophic class of failure: coordinate-unit mismatches that cascade silently through the codebase.

The three highest risks are: (1) coordinate-unit ambiguity causing integer-coercion in existing validation and range checks (silent failures, wrong distances, broken combat), (2) client-server prediction divergence from different timestep integration producing constant rubber-banding, and (3) the existing rate-limiter tuned for 2 moves/second being completely incompatible with the required 20Hz position stream. All three have well-understood mitigations: an explicit `PixelPosition` interface with documented float semantics, a soft-authority server design (speed-cap + one collision sweep per update, not full physics simulation), and replacing the move-interval gate with a velocity/distance validator.

## Key Findings

### Recommended Stack

No new package installations are required. Phaser 3's built-in Arcade Physics provides `setVelocity`, `setBodySize`, AABB body collision, and `StaticGroup` tile blockers — everything needed for client-side continuous movement and pixel-accurate collision. Socket.IO v4 handles the 20Hz position stream without configuration changes. NestJS `setInterval` in `PlayerService.onModuleInit()` runs the server broadcast loop, consistent with the pattern already used by `AutomationService`. The only structural change is adding float pixel fields to the `Position` type in `shared-types` and providing a new `PixelPosition` interface for network events. No version bumps, no new dependencies, no infrastructure changes.

**See:** `.planning/research/STACK.md`

**Core technologies:**
- **Phaser 3 Arcade Physics (built-in, existing):** velocity-based local player movement + AABB tile collision via `StaticGroup` — no upgrade or new engine required; `setVelocity`, `setBodySize`, `physics.add.existing` all present in current 3.80+
- **Socket.IO v4 (existing):** 20Hz bi-directional position stream — same infrastructure, new event shape (`player:input` with key-bitmask replaces `player:move` with direction enum)
- **NestJS + `setInterval` (existing):** server-side 50ms broadcast loop for zone-room position snapshots — consistent with existing automation pattern in `AutomationService`
- **`@into-the-void/shared-types` (internal):** add `PixelPosition {px, py, zoneId}` alongside `Position`; update `ClientEvents`/`ServerEvents` payloads; `PLAYER_SPEED_PX` and `PLAYER_HITBOX` constants
- **`@into-the-void/game-logic` (internal):** new `pixel-validation.ts` and `pixel-distance.ts` modules; existing `collisionMap: boolean[][]` reused as AABB collision data source

### Expected Features

This milestone is a full rewrite. Every item below is required for the game to function correctly after the rewrite. There are no optional features at MVP.

**See:** `.planning/research/FEATURES-PIXEL-MOVEMENT.md`

**Must have (table stakes — game is broken without these):**
- Continuous pixel position type (`{px, py, zoneId}` tile-unit floats) with derived tile x/y for legacy consumers
- Velocity-based WASD movement in Phaser update loop via `body.setVelocity()` — no move delay, no direction queue
- Pixel AABB hitbox collision against `StaticGroup` of blocked tiles built from `collisionMap`
- Diagonal normalization (multiply by `1/√2` when both axes active to prevent 41% diagonal speed bonus)
- Server-authoritative position sync at 20Hz with sequence-numbered reconciliation
- Client-side prediction + server reconciliation for local player pixel position
- Entity interpolation (2-snapshot linear lerp) for remote players
- Pixel Euclidean distance for all range checks (combat melee/ranged, gathering, NPC, AI aggro/leash)
- Tile speed modifiers applied as continuous velocity multipliers per frame from `getMovementSpeedModifier()`
- Remove `PathfindingController` and A* click-to-move entirely
- Fix flat blocking tiles — audit `world-gen` collision map against `TileRegistry.walkable`
- DB position columns verified to accept float values (convert pixel to tile on disconnect, tile-center to pixel on connect — no schema migration required)

**Should have (post-ship refinement):**
- Smooth zone boundary crossing at pixel granularity (requires world-coordinate system — deferred P2)
- Inertia / drag on key release (50–100ms fade-out — low complexity, nice feel)
- Collision sliding polish for corner edge cases

**Defer (v1.28+):**
- Click-to-move return (requires pixel-space navmesh)
- Full server-side physics simulation (only warranted if cheating becomes a real problem at scale)

### Architecture Approach

The architecture follows a "client predicts, server validates with soft authority" pattern — the industry standard for MMOs at this scale. The client runs continuous movement every frame via `PixelMovementController` (new), emits key-bitmask + predicted position at 20Hz, and reconciles against server-confirmed positions using sequence replay. The server receives input packets, checks a speed cap (`PLAYER_SPEED_PX * dt * 1.2`), runs one `resolvePixelCollision()` sweep using the authoritative `collisionMap`, updates `ConnectedPlayer.px/py` in memory, and broadcasts position to the zone room. DB persistence is unchanged: pixel-to-tile conversion on disconnect, tile-to-pixel-center initialization on connect. No DB schema migration is required.

**See:** `.planning/research/ARCHITECTURE.md`

**Major components:**

1. **`PixelMovementController` (NEW — `apps/web/src/game/systems/`):** Client prediction: velocity from key bitmask, per-frame AABB collision against local collision map, 20Hz emit throttle, reconciliation with server-confirmed position + sequence replay. Replaces `MovementController.ts` entirely.
2. **`pixel-validation.ts` (NEW — `packages/game-logic/src/movement/`):** Shared `resolvePixelCollision()`, `velocityFromKeys()`, `validatePixelSpeed()`, `PLAYER_SPEED_PX`, `PLAYER_HITBOX` constants — runs identically on client and server. Key bitmask prevents velocity-manipulation exploits.
3. **`pixel-distance.ts` (NEW — `packages/game-logic/src/movement/`):** `pixelDistanceTo()`, `tileToPixelCenter()`, `pixelToTile()`, all pixel range constants (`MELEE_RANGE_PX = 144`, `GATHER_RANGE_PX = 192`, `AGGRO_RADIUS_PX = 480`, `LEASH_RADIUS_PX = 960`, etc.)
4. **`PixelPosition` + `PixelMovePayload` (NEW — `packages/shared-types/`):** Float pixel coordinate interface for network protocol and in-memory server state; `{keys, px, py, sequence, timestamp}` client payload
5. **`GameGateway.handleMove()` (MODIFY):** Accept `PixelMovePayload`, enforce speed cap, call `resolvePixelCollision`, broadcast `{playerId, px, py, sequence}` to zone room at 20Hz
6. **`WorldScene` (MODIFY):** Remove delay gate, chord detection, pathfinding init, click-to-move handler, tween-based sprite movement; drive sprite directly from `px/py` floats; add remote player lerp loop
7. **`MovementController.ts` + `PathfindingController.ts` (DELETE)**

### Critical Pitfalls

**See:** `.planning/research/PITFALLS.md`

1. **Position type integer-coercion** — JavaScript silently floors float array indices; existing `validateMovement` checks `dx > 1` assuming tile integers. Without an explicit `PixelPosition` type, callers will round before writing to store, causing tile-snapping jitter and broken range checks. Prevention: declare coordinate unit as tile-unit floats at the start with JSDoc annotation; remove all integer-distance guards in `validateMovement` before any movement code touches them. Must be the first commit. (Phase 1)

2. **Client-server prediction divergence** — client integrates `velocity * deltaTime` at 60fps; server processes on receipt at irregular intervals. Different timesteps produce different float accumulations, causing constant reconciliation corrections and visible rubber-banding even on LAN. Prevention: server is soft-authority — it performs one speed-cap check and one collision sweep per update, not a full physics simulation. Accept the client's claimed position if plausible; correct only when it diverges beyond threshold. (Phase 2)

3. **Rate limiter incompatible with 20Hz stream** — existing `lastMoveTimes` enforces 140ms intervals (7Hz max). Pixel movement requires 20Hz (50ms). Prevention: replace per-move time gate with a speed/distance validator: reject updates implying `distance > PLAYER_SPEED_PX * dt * 1.5`. (Phase 2)

4. **Cascade of tile-unit range checks** — `CombatService.creatureAttackTick` (`dist > 1` Chebyshev), `GatheringService.canInteract` (Manhattan tiles), `AiService` aggro/leash radius, `FogManager.revealTiles`, zone boundary detection (`ZONE_SIZE` vs pixel), and portal deduplication (keyed on integer tile position) all assume tile-integer coordinates. Any one silently missed will either break gameplay or create an exploit. Prevention: migrate all in a single coordinated Phase 3 pass with per-system verification tests. (Phase 3)

5. **Gathering exploit via single range check** — `GatheringService` validates `canInteract` at start but not at completion. With continuous movement, a player can walk away mid-gather. Prevention: validate range again at `completeGathering` using the pixel distance threshold. (Phase 3)

## Implications for Roadmap

Based on research, the dependency chain is clear and unambiguous. All four research files converged on the same bottom-up build order. Six phases are suggested.

### Phase 1: Shared Foundation — Position Type + Pixel Math
**Rationale:** Everything downstream depends on a settled coordinate contract. Adding `PixelPosition`, `PixelMovePayload`, and both game-logic modules alongside existing code causes zero breakage — nothing existing is modified. This phase is the compile-time prerequisite for all other phases and must land first to eliminate coordinate-unit ambiguity before any movement code is written.
**Delivers:** `PixelPosition` interface, `PixelMovePayload` type, `PLAYER_SPEED_PX`/`PLAYER_HITBOX` constants, `pixel-validation.ts` (`resolvePixelCollision`, `velocityFromKeys`, `validatePixelSpeed`), `pixel-distance.ts` (all range constants + conversion helpers `tileToPixelCenter`, `pixelToTile`), unit tests for pixel collision and pixel distance functions.
**Addresses:** Enables all downstream phases; pitfall: position type ambiguity and integer-coercion cascade.
**Avoids:** The situation where every subsequent phase discovers coordinate-unit mismatch bugs independently.

### Phase 2: Server Movement Handler
**Rationale:** Server is authoritative; the client-side prediction written in Phase 4 must target the actual server API, not a speculative one. Building server before client reduces round-trip iteration. The rate-limiter redesign and soft-authority pattern must be locked in here — they directly influence how the client sends input and handles reconciliation.
**Delivers:** `ConnectedPlayer.px/py/lastPixelMoveTime` in-memory state, `handleMove()` accepting `PixelMovePayload` with speed-cap + `resolvePixelCollision` validation, 20Hz position broadcast to zone room, pixel-to-tile conversion on disconnect, tile-to-pixel-center init on connect (no DB schema change), rate limiter replaced with velocity/distance validator.
**Uses:** `pixel-validation.ts` from Phase 1; `resolvePixelCollision` shared between client and server.
**Implements:** "Server as Soft Authority" architecture pattern (speed cap 1.2x, one collision sweep, broadcast dirty positions at 50ms tick).
**Avoids:** Rate-limiter incompatibility pitfall; prediction-divergence pitfall (server design drives client contract).

### Phase 3: Distance System Migration
**Rationale:** All game systems that check range must be migrated before any gameplay QA. These are independent of the client physics rewrite and can be validated in isolation. A single coordinated phase is safer than incremental migration — all range constants change together, minimizing the window for mixed-unit bugs producing exploits or broken gameplay.
**Delivers:** `CombatService` melee + pack-call range using `pixelDistanceTo()`, `GatheringService` interaction range in pixels with re-validation at completion, `AiService` aggro and leash radius using pixel constants, `FogManager` tile-conversion at call site (`pixelToTile()` before fog reveal), zone boundary detection using `ZONE_SIZE_PX = ZONE_SIZE * TILE_SIZE`, portal deduplication keyed on tile-snapped position (not raw float), NPC interaction range in pixels, `AutomationService` deployable range in pixels.
**Addresses:** Table-stakes "Pixel-distance interaction checks"; PITFALLS.md pitfalls 3, 4, 5, 6, 8.
**Avoids:** Gameplay exploits from range checks using wrong coordinate units; "looks done but isn't" failures that only surface during QA.

### Phase 4: Client Movement Rewrite
**Rationale:** Client rewrite comes after server and game-logic are stable, so `PixelMovementController` is written to target the confirmed API. `MovementController` and `PathfindingController` are deleted in this phase — not deprecated, deleted — to eliminate dead code confusion. The `WorldScene` update loop changes from tween-based tile movement to direct sprite positioning from `px/py` floats.
**Delivers:** `PixelMovementController.ts` (velocity from keys via `velocityFromKeys()`, per-frame AABB collision, 20Hz emit, sequence-based reconciliation), `WorldScene` rewritten (no delay gate, no chord detection, no tweens, Arcade Physics `StaticGroup` tile blockers built from `collisionMap`, direct pixel sprite positioning via `isoTransform`), `MovementController.ts` and `PathfindingController.ts` deleted, click-to-move `pointerup` handler removed.
**Uses:** Phaser 3 Arcade Physics `setVelocity`, `StaticGroup` for tile blockers, `physics.add.existing()` on player sprite, hitbox `setBodySize(48, 24)` / `setOffset(24, 72)` for isometric footprint.
**Implements:** `PixelMovementController` architecture; Arcade Physics AABB collision via `StaticGroup` (not Tilemap — project uses procedural rendering).
**Avoids:** Tween anti-pattern (root cause of current unresponsive feel); keeping dead click-to-move code; using Matter.js (overkill) or server-side physics simulation.

### Phase 5: Remote Player Interpolation
**Rationale:** Multiplayer correctness requires smooth remote player rendering. This is architecturally separate from local player movement — prediction for local, interpolation for remote. Separated into its own phase so it can be validated with multiple connected clients in the same zone, distinct from single-player movement testing.
**Delivers:** 2-snapshot linear lerp for remote player sprites from `player:moved` events (`{playerId, px, py, sequence}`), snap-on-large-delta logic (>192px / ~2 tiles to handle teleports), remote player facing direction inferred from position delta, lerp factor tunable (start at ~10x/sec smoothing speed).
**Implements:** Gabriel Gambetta entity interpolation pattern — render at `now - bufferDelay`, interpolate between two most-recent snapshots, never extrapolate past last known position.
**Avoids:** Conflating local prediction and remote interpolation code paths; teleport smear (long-distance lerp over 100ms of lag).

### Phase 6: Flat Blocking Tile Fix + Collision Audit
**Rationale:** Known issue from the project backlog — elevated tiles appear walkable but block movement. With pixel AABB collision now in place via `StaticGroup`, the `world-gen` collision map generation can be audited against `TileRegistry.walkable` per biome. This phase validates the complete collision system against the full game world, not just the test zone.
**Delivers:** Corrected `world-gen` collision map for all affected elevated tile types, collision debug overlay validation across all 16 biomes, no invisible walls in normal play anywhere, `StaticGroup` rebuild verified on chunk load/unload cycle.
**Addresses:** Table-stakes "Flat tile visual fix" from FEATURES.md; known player-reported movement issue.
**Avoids:** Shipping improved physics infrastructure on top of incorrect walkability data.

### Phase Ordering Rationale

- **Types-first:** `PixelPosition` and pixel math modules in Phase 1 are the compile-time dependency for all other phases. Everything else imports from them.
- **Server before client:** Phase 2 (server) before Phase 4 (client) ensures `PixelMovementController` is written to target the actual validated API shape, not a speculative contract. Eliminates round-trips where client assumptions diverge from server implementation.
- **Game systems before integration QA:** Phase 3 (distance migration) before Phase 5 (remote interpolation) ensures that when full-system multiplayer testing begins in Phase 5, combat and gathering are already pixel-correct. Prevents false-positive QA failures from mixed-unit bugs.
- **Collision audit last:** Phase 6 requires Phase 4's `StaticGroup` collision to be in place. Auditing collision data against a working physics system produces meaningful results; auditing against the old tile-step system does not.
- **No DB schema migration required:** ARCHITECTURE.md Pattern 4 (pixel-to-tile bridging on disconnect) keeps tile integers in the DB, avoiding migration risk entirely. Sub-tile precision is not meaningful across sessions.

### Research Flags

Phases with well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1:** Shared type additions are standard TypeScript; all pixel math is pre-specified in ARCHITECTURE.md with working code examples. No unknowns.
- **Phase 3:** Range constant migration is mechanical; all target pixel values pre-calculated in ARCHITECTURE.md range constants section.
- **Phase 5:** Gabriel Gambetta entity interpolation is the canonical reference; 2-snapshot lerp is ~10 lines of well-understood math.
- **Phase 6:** Collision audit is an inspection task, not a research task; methodology is defined (compare `TileRegistry.walkable` vs `collisionMap` output per biome).

Phases that warrant a detailed implementation plan before coding:
- **Phase 2:** The velocity/distance validator threshold (`1.2x` speed tolerance) and soft-authority correction threshold (currently suggested at `16px`) need empirical tuning. Start with conservative values and tighten after observing real network conditions. Design the server game loop structure before writing — `setInterval` in `onModuleInit` vs a dedicated `GameLoopService`.
- **Phase 4:** `PixelMovementController` reconciliation logic is the most complex single component in the milestone. The decision logic (snap vs smooth interpolate reconciliation correction, pending inputs buffer ring-buffer vs array, when to trim stale inputs) warrants a written plan before any code is written. Rubber-banding risk is highest here.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new packages; all Phaser Arcade Physics APIs verified against official 3.80+ docs; existing codebase confirmed to use Socket.IO v4 and NestJS v10 at the required versions; direct codebase inspection of all callsites |
| Features | HIGH | Feature list derived from direct codebase analysis of every affected system (`MovementController.ts`, `WorldScene.ts`, `combat.service.ts`, `gathering.service.ts`, `ai.service.ts`, `interaction.ts`). No speculative features. |
| Architecture | HIGH | Patterns verified against Gabriel Gambetta (canonical netcode reference), Valve Source Networking docs, and direct codebase inspection. Soft-authority server pattern is industry standard for this scale (0-1000 players per zone). |
| Pitfalls | HIGH | All 10 pitfalls identified from direct codebase reading — specific function names and line references cited. Not speculative warnings. Each pitfall has a specific phase assignment and a concrete prevention strategy. |

**Overall confidence:** HIGH

### Gaps to Address

- **`PLAYER_SPEED_PX` tuning:** Research recommends 192px/s (2 tiles/sec at 96px/tile). Actual feel depends on the isometric transform applied before rendering. Expect 1–2 tuning iterations after Phase 4 ships. Make it a runtime-accessible constant so it can be adjusted without a deploy.
- **Reconciliation snap threshold:** 16px suggested in ARCHITECTURE.md, but this may need adjustment based on observed network conditions during testing. Start conservative (larger threshold = fewer visible snaps) and tighten only if speed-hack tolerance becomes visible.
- **Creature AI pixel movement:** Research explicitly defers true pixel-granularity creature movement to a later milestone (v1.28+). Creature tile-step movement remains in v1.27; client interpolation between AI ticks is the mitigation for visual teleporting. This is a deliberate scope decision, not an oversight.
- **Zone boundary seam crossing:** Smooth pixel-granularity zone crossing is deferred to post-ship (P2). The v1.27 target is functional zone transitions derived from pixel position (derive tile, check against `ZONE_SIZE`) — not seamless seam crossing, which requires a world-coordinate system.

## Sources

### Primary (HIGH confidence)
- Phaser 3 official docs — Arcade Physics `setVelocity`, `setBodySize`, `setOffset`, `StaticGroup`, `physics.add.existing`, Arcade Body velocity API
- Codebase direct inspection — `MovementController.ts`, `WorldScene.ts`, `game.gateway.ts`, `player.service.ts`, `position.ts`, `constants.ts`, `combat.service.ts`, `gathering.service.ts`, `ai.service.ts`, `FogManager.ts`, `validation.ts`, `interaction.ts`, `range.ts`, `speed.ts`, `characters.ts` (DB schema)
- [Gabriel Gambetta: Client-Side Prediction and Server Reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) — prediction/reconciliation pattern, sequence number design
- [Gabriel Gambetta: Entity Interpolation](https://www.gabrielgambetta.com/entity-interpolation.html) — 2-snapshot lerp, render-at-delay principle, no-extrapolation rule

### Secondary (MEDIUM confidence)
- [Valve Developer Community: Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking) — 20Hz update rate, interpolation period, delta compression patterns
- [Valve Developer Community: Latency Compensating Methods](https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization) — server-authoritative movement design
- [GameDev.net: Swept AABB Collision Detection](https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/swept-aabb-collision-detection-and-response-r3084/) — multi-tile hitbox sampling requirement, axis-separated resolution
- [GameDev.net: Server Authoritative Movement](https://gamedev.net/forums/topic/706590-server-authoritative-movement-questions/) — speed cap threshold and soft authority pattern
- Phaser GitHub discussion #6312 — manual StaticGroup confirmed as community standard for non-Tilemap collision in procedurally-rendered scenes

### Tertiary (LOW confidence — context only)
- [Gaffer On Games: Floating Point Determinism](https://gafferongames.com/post/floating_point_determinism/) — float determinism in multiplayer; noted but not critical given soft-authority design
- [Jonathan Whiting: 2D Tilemap Collision](https://jonathanwhiting.com/tutorial/collision/) — AABB sweep axis-separated resolution background reference
- [Clint Bellanger: Isometric Tiles Math](https://clintbellanger.net/articles/isometric_math/) — pixel-to-tile coordinate conversion in isometric grids

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
