# Codebase Concerns

**Analysis Date:** 2026-02-13

## Tech Debt

**Client-side movement validation missing:**
- Issue: `apps/web/src/game/scenes/WorldScene.ts` (lines 111-119) moves the local player optimistically without server validation. Client receives immediate visual feedback before server confirms the move is valid.
- Files: `apps/web/src/game/scenes/WorldScene.ts`
- Impact: If server rejects movement, visual state becomes desynchronized from server truth. Can lead to confused player state during lag or if movement rules change.
- Fix approach: Implement rollback on server rejection. Track pending moves and revert client position if server returns error. Consider adding server-authoritative movement as single source of truth.

**Pathfinding performance issue:**
- Issue: `packages/game-logic/src/movement/pathfinding.ts` (line 93) sorts entire openSet array on every iteration, causing O(n log n) per step.
- Files: `packages/game-logic/src/movement/pathfinding.ts`
- Impact: A* algorithm degrades to O(n² log n) worst case. High iteration counts (default 1000) will cause noticeable lag when computing long paths or many concurrent pathfinds.
- Fix approach: Replace array sorting with a priority queue (MinHeap). Would reduce per-iteration cost to O(log n) and overall to O(n log n). Consider caching paths or using coarser navigation mesh.

**Mutable entity state in memory:**
- Issue: `apps/game-server/src/zones/zones.service.ts` (line 129) uses `Object.assign(entity, changes)` which mutates entities directly. Combined with in-memory storage (Map), any reference to an entity reflects changes immediately.
- Files: `apps/game-server/src/zones/zones.service.ts`
- Impact: No change history or rollback capability. If updates are applied out of order or concurrently, state can become inconsistent. Difficult to debug state changes after the fact.
- Fix approach: Implement immutable updates (spread operators or copy entities before mutation). Add change log. Consider event sourcing for critical entities like players.

**Memory leak potential in zone cleanup:**
- Issue: `apps/game-server/src/zones/zones.service.ts` (line 26) uses setInterval without cleanup on module destroy. If module is hot-reloaded or destroyed, interval continues running.
- Files: `apps/game-server/src/zones/zones.service.ts`
- Impact: Memory usage increases unbounded after hot reloads. Multiple intervals accumulate, each trying to clean zones simultaneously.
- Fix approach: Store interval ID and clear on `OnModuleDestroy`. Implement timer cancellation on module shutdown.

**Mock player data in production code:**
- Issue: `apps/game-server/src/game/player.service.ts` (lines 38-54) creates hardcoded mock player data instead of fetching from database. Comment on line 38 acknowledges this is temporary.
- Files: `apps/game-server/src/game/player.service.ts`
- Impact: All players share same faction ('neutral') and spawning position (32, 32). Cannot persist character data between sessions. Prevents real gameplay.
- Fix approach: Implement proper character database lookup using characterId. Fetch actual character stats, position, and faction from database.

**Hardcoded JWT secret:**
- Issue: `apps/game-server/src/game/player.service.ts` (line 25) and `apps/api/src/auth/auth.service.ts` (line 34) use fallback JWT secrets that should never be used in production.
- Files: `apps/game-server/src/game/player.service.ts`, `apps/api/src/auth/auth.service.ts`
- Impact: If environment variables are missing, authentication silently falls back to weak defaults. Secrets in source control.
- Fix approach: Throw errors if secrets are not configured via environment. Add startup validation. Use secrets management tool (Vault, AWS Secrets Manager).

---

## Known Bugs

**Zone boundary coordinate parsing assumes consistent format:**
- Symptoms: Zone transitions fail if zoneId format changes. calculateNewPosition calls split('_').map(Number) which assumes exactly 3 parts.
- Files: `packages/game-logic/src/movement/validation.ts` (line 73), `apps/game-server/src/zones/zones.service.ts` (line 31)
- Trigger: Create zone with different naming scheme (e.g., 'zone_a_b' instead of 'z_0_0')
- Workaround: Enforce strict zone naming in validation layer. Add regex check before parsing.

**Pathfinding allows zone transitions:**
- Symptoms: A* pathfinding in `packages/game-logic/src/movement/pathfinding.ts` (lines 46-108) operates only within a single zone's collision map. It never checks if crossing zone boundary is desired or valid.
- Files: `packages/game-logic/src/movement/pathfinding.ts`, `apps/game-server/src/game/game.service.ts`
- Trigger: Request path from position near zone edge - algorithm may include moves that cross zone boundaries without validation
- Workaround: Add collision map bounds checking before adding neighbors to openSet. Validate movement result against isZoneTransition rules.

**Chat message vulnerability:**
- Symptoms: Chat handler `apps/game-server/src/game/game.gateway.ts` (lines 164-198) uses player socket directly without validating socket ID matches authenticated player.
- Files: `apps/game-server/src/game/game.gateway.ts`
- Trigger: Craft WebSocket connection with spoofed player ID to send messages as another player
- Workaround: Add assertion that player exists and is authenticated before reading its properties.

---

## Security Considerations

**JWT token validation incomplete:**
- Risk: `apps/game-server/src/game/player.service.ts` (lines 35-36) verifies JWT but never checks expiration or issuer. Just checks that payload has `accountId`.
- Files: `apps/game-server/src/game/player.service.ts`
- Current mitigation: JwtService default behavior may include expiration validation, but not explicit.
- Recommendations: Add explicit `expiresIn` when signing tokens. Add token blacklist/refresh mechanism. Validate issuer and audience claims.

**Authentication via token only:**
- Risk: Game gateway `apps/game-server/src/game/game.gateway.ts` (lines 43-82) accepts auth just once at connection time. No re-validation on each message.
- Files: `apps/game-server/src/game/game.gateway.ts`
- Current mitigation: WebSocket connection re-authentication would require disconnection
- Recommendations: Implement heartbeat with token re-validation. Consider JWT expiration of 5-15 minutes with refresh tokens.

**No rate limiting on messages:**
- Risk: Game gateway accepts unlimited messages from connected clients. Chat, interactions, movement all unthrottled.
- Files: `apps/game-server/src/game/game.gateway.ts`
- Current mitigation: None
- Recommendations: Implement per-socket rate limits. Throttle movement to max frequency (e.g., 1 move per 100ms). Queue chat messages.

**No input validation on entity interaction:**
- Risk: `apps/game-server/src/game/game.service.ts` (lines 110-156) trusts targetId from client without range/ownership checks.
- Files: `apps/game-server/src/game/game.service.ts`, `packages/game-logic/src/interaction/interaction.ts`
- Current mitigation: `canInteract` checks range and zone, but only if called. Not enforced.
- Recommendations: Mandatory validation before interaction. Add permission checks (e.g., only owner can use structures).

**World seed public:**
- Risk: `apps/game-server/src/zones/zones.service.ts` (line 157) exposes world seed via getter. Clients could predict world generation.
- Files: `apps/game-server/src/zones/zones.service.ts`
- Current mitigation: Seed not exposed to client via API yet
- Recommendations: Never expose seed to client. Keep seed server-only secret for anti-cheat.

**No CORS validation for WebSocket:**
- Risk: `apps/game-server/src/game/game.gateway.ts` (lines 19-23) CORS origin configurable via env but defaults to localhost:5173. Production could have permissive origins.
- Files: `apps/game-server/src/game/game.gateway.ts`
- Current mitigation: Env-based configuration exists
- Recommendations: Explicitly whitelist allowed origins. Reject requests from unknown origins. Add origin validation middleware.

---

## Performance Bottlenecks

**Pathfinding O(n²) on large open maps:**
- Problem: Line 93 of `packages/game-logic/src/movement/pathfinding.ts` sorts entire openSet every iteration.
- Files: `packages/game-logic/src/movement/pathfinding.ts`
- Cause: Array.sort() is O(n log n) per iteration. For maze-solving, openSet can grow large (hundreds of nodes).
- Improvement path: Implement binary heap for open set. Use Dijkstra instead if weights uniform. Cache frequently used paths.

**Zone entities unindexed:**
- Problem: `apps/game-server/src/zones/zones.service.ts` (lines 100-109, 187-206) filters all entities to find those in range or by type.
- Files: `apps/game-server/src/zones/zones.service.ts`
- Cause: `getEntitiesInRange`, `getReachablePositions` iterate entire entity array.
- Improvement path: Spatial indexing (quadtree). Index entities by position grid. Maintain secondary index by type.

**In-memory player state not persisted:**
- Problem: `apps/game-server/src/game/player.service.ts` (line 18-19) stores players only in memory. No saves to database between disconnections.
- Files: `apps/game-server/src/game/player.service.ts`
- Cause: Server restart loses all player positions, inventory, progress.
- Improvement path: Async save to database on position change. Implement change batching.

**setInterval for zone cleanup in high-concurrency:**
- Problem: `apps/game-server/src/zones/zones.service.ts` (line 26) runs cleanup every 60 seconds across all zones.
- Files: `apps/game-server/src/zones/zones.service.ts`
- Cause: Single thread iteration through potentially hundreds of zones. Can block event loop.
- Improvement path: Implement paginated cleanup. Use background worker queue. Track access time more efficiently.

---

## Fragile Areas

**Interaction type dispatch is incomplete:**
- Files: `apps/game-server/src/game/game.service.ts` (lines 128-155)
- Why fragile: Switch statement on entity.type has no exhaustive check. Adding new entity type requires finding this switch. `packages/game-logic/src/interaction/interaction.ts` has separate switch (lines 80-96) that must be kept in sync.
- Safe modification: Use discriminated unions. Create registry of interaction handlers. Add TypeScript exhaustiveness checking.
- Test coverage: No tests. Adding new entity type will silently miss logic in either file.

**WorldScene state tied to Phaser internals:**
- Files: `apps/web/src/game/scenes/WorldScene.ts`
- Why fragile: Maps store sprite references (`entitySprites`, `playerSprites`). If Phaser garbage collects sprites or destroys scene, references become stale. No lifecycle hooks.
- Safe modification: Implement cleanup on scene shutdown. Use Phaser lifecycle events. Add null checks before sprite operations.
- Test coverage: No unit tests. Integration only through Phaser. Hard to mock or test sprite interactions.

**Zone ID parsing assumes format:**
- Files: `packages/game-logic/src/movement/validation.ts` (line 73), `apps/game-server/src/zones/zones.service.ts` (line 31)
- Why fragile: `zoneId.split('_').map(Number)` assumes exactly 3 parts separated by underscore. No validation. Breaking format string changes coordinates silently (NaN).
- Safe modification: Create ZoneId branded type. Use parser function. Add format validation.
- Test coverage: No tests for zone parsing. Edge cases untested.

**Combat logic references undefined variables:**
- Files: `packages/game-logic/src/interaction/interaction.ts` (line 177)
- Why fragile: `canAttack` checks `player.inCombat` but logic is incomplete (line 177 comment "would need combat state"). Assumes state exists but doesn't enforce it.
- Safe modification: Add combat state interface. Validate combat state before use. Make dependencies explicit.
- Test coverage: No tests.

---

## Scaling Limits

**In-memory zone storage unbounded:**
- Current capacity: Limited by RAM. Each zone stores full ChunkData + entity map. 5-minute TTL cleanup runs once per server.
- Limit: With 64x64 zones (ZONE_SIZE=64), assuming 100 bytes/entity, ~6400 entity slots per zone. If 1000 zones loaded, ~640KB per zone = 640MB. Reasonable for development but scales poorly with player count.
- Scaling path: Implement zone offloading to persistent store (Redis). Lazy load chunks on demand. Implement LRU eviction with configurable limits.

**Player service holds all players in memory:**
- Current capacity: Linear with connected players. Each ConnectedPlayer ~500 bytes. 1000 players = 500KB. Reasonable.
- Limit: Breaks if scaling to multiple servers. Needs session store. Single point of failure.
- Scaling path: Move player state to Redis or database. Implement player session store. Design for horizontal scaling with load balancing.

**WebSocket gateway not clustered:**
- Current capacity: Single NestJS server can handle ~1000 concurrent WebSockets (OS/network dependent).
- Limit: One server failure disconnects all players. No redundancy.
- Scaling path: Use Socket.IO Redis adapter for clustering. Implement health checks and failover. Use load balancer with sticky sessions.

**World generation not memoized or cached:**
- Current capacity: `generateChunk` called on every new zone access. Simplex noise generation is CPU-intensive.
- Limit: If players explore widely, chunk generation becomes bottleneck.
- Scaling path: Pre-generate and cache chunks. Use background generation queue. Implement LOD (level of detail) system.

---

## Dependencies at Risk

**Phaser 3.80:**
- Risk: Phaser is heavy dependency (100+ KB) for rendering. Only used for visualization. Tight coupling to game logic.
- Impact: Difficult to port to different renderer. Hard to run headless tests.
- Migration plan: Extract rendering layer. Use abstract scene interface. Consider lightweight alternatives (Babylon.js, Three.js) if scalability requires.

**Drizzle ORM 0.30:**
- Risk: Relatively young ORM. Not as battle-tested as Sequelize/TypeORM. API may change significantly.
- Impact: Future migrations could be expensive if library diverges from needs.
- Migration plan: Keep database queries in thin abstraction layer. Don't scatter Drizzle throughout codebase.

**NestJS 10.3:**
- Risk: Stable but opinionated. If requirements drift from monolith, extracting microservices will be difficult.
- Impact: Heavy runtime overhead for simple game server.
- Migration plan: Consider Express + dependency injection for lighter runtime. Keep domain logic framework-agnostic.

---

## Missing Critical Features

**Persistence layer incomplete:**
- Problem: Player data not saved to database. Mock players created on auth. Character creation not implemented. Inventory not persisted.
- Blocks: Multiplayer progression, character management, economy features.

**Combat system stubbed:**
- Problem: `apps/game-server/src/game/game.service.ts` (lines 145-151) initiates combat but no actual combat loop. `packages/game-logic/src/combat/turn-order.ts` exists but unused.
- Blocks: PvP, PvE, monster hunting, raid content.

**No quest/NPC system:**
- Problem: NPCs not implemented. Interaction types include 'talk' but no dialogue system.
- Blocks: Storyline, progression, content pacing.

**No inventory/equipment system:**
- Problem: Items mentioned in types but no pickup logic, no inventory limits, no equipment slots.
- Blocks: Gear progression, loot systems, crafting.

**No death/respawn system:**
- Problem: Player health exists but no death handling. No respawn points.
- Blocks: PvP stakes, consequence system.

---

## Test Coverage Gaps

**No unit tests in codebase:**
- What's not tested: Game logic, validation, pathfinding, combat calculations, zone management.
- Files: All `.ts` files. 0/77 have corresponding `.test.ts` or `.spec.ts` files.
- Risk: Refactoring pathfinding (performance bottleneck) without test coverage could break movement validation. Changing zone naming convention silently breaks parsing. Adding new combat effects could break balance.
- Priority: High. Recommend starting with game-logic package (most critical).

**No integration tests:**
- What's not tested: Player movement end-to-end. Authentication flow. Zone transitions. Entity spawning.
- Files: Server handlers `apps/game-server/src/game/game.gateway.ts` and services.
- Risk: Subtle bugs in message ordering. Socket connection/disconnection edge cases. Race conditions with zone transitions.
- Priority: Medium. Add after unit tests.

**No E2E tests:**
- What's not tested: Full gameplay loop. Client-server communication. Asset loading.
- Files: `apps/web/src` entire client.
- Risk: Deployment breaks web client. Network deserialization issues. UI rendering bugs.
- Priority: Medium. Use Playwright after server is stable.

**Scene lifecycle untested:**
- What's not tested: Phaser scene setup, cleanup, transitions. Sprite creation/destruction.
- Files: `apps/web/src/game/scenes/*.ts`
- Risk: Memory leaks in long play sessions. Scene state corruption on rapid transitions.
- Priority: Low for MVP, critical for release.

---

*Concerns audit: 2026-02-13*
