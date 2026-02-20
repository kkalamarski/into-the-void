# Pitfalls Research

**Domain:** Multiplayer 2D Isometric MMO — Movement System Overhaul
**Researched:** 2026-02-17
**Confidence:** HIGH

---

> This file covers four milestone areas: (1) Movement System Overhaul pitfalls, (2) Infinite World Chunk Streaming pitfalls, (3) Inventory & Items System pitfalls (added 2026-02-17), and (4) Entity System pitfalls — entity definitions, spawning, loot tables, creature AI, interaction range, perception gating, respawn timers, and fertility noise (added 2026-02-18). All are relevant to Into the Void's active development.

---

# Part 1: Movement System Overhaul Pitfalls

**Scope:** Adding smooth movement, 8-directional controls, and free movement to an existing tile-based multiplayer game with client-side prediction and server reconciliation.

**Current system (from codebase analysis):**
- Direction-based movement protocol: client sends `{ direction: Direction; sequence?: number }`
- Server rate limits at 140ms minimum between moves
- `MovementController` does client-side prediction, stores `PendingInput[]`, replays on reconciliation
- `PathfindingController` uses cardinal-only A* and translates nodes to Direction enum
- `validateMovement` enforces `dx <= 1, dy <= 1` (exactly 1 tile per move)
- Isometric screen mapping: W=NW, D=NE, S=SE, A=SW (visually correct, grid diagonal)
- `moveDelay = 500ms` in WorldScene (2 tiles/sec), `150ms` in PathfindingController

---

## Critical Pitfalls

### Pitfall 1: Diagonal Speed Advantage Breaks Fairness and Server Validation

**What goes wrong:**
When adding 8-directional or free movement, diagonal moves travel sqrt(2) (~1.414x) more screen distance than cardinal moves in the same time. A player holding NE moves 41% faster than holding N. Server rate-limit (140ms) applies equally, so diagonal players cover more ground. PvP balance, loot acquisition range, and anti-cheat tolerances all break at the same rate-limit threshold.

**Why it happens:**
Current system moves exactly 1 tile per direction, so all 8 directions are treated as equal-cost. This is grid-correct for tile movement but wrong for perceived world distance. The existing `DIRECTION_VECTORS` in `validation.ts` assigns `{ dx: 1, dy: -1 }` to NE — a unit-grid move, not a unit-world move.

**How to avoid:**
- For tile-based 8-directional (current model): Apply a diagonal cooldown multiplier. Diagonal moves should cost ~1.414x the rate-limit (197ms instead of 140ms), or reduce diagonal tile movement distance when moving diagonally.
- For free movement (pixel/sub-tile): Normalize velocity vectors before applying speed. `velocity.normalize().scale(speed)` before sending or applying movement.
- Keep server validation consistent: if diagonal is allowed at 1-tile distance, server must check `Math.sqrt(dx*dx + dy*dy) <= 1.0` (Euclidean), not `dx <= 1 && dy <= 1` (Chebyshev).
- Update `validateMovement` in `packages/game-logic/src/movement/validation.ts` to use Euclidean distance, not separate dx/dy checks.

**Warning signs:**
- Diagonal players consistently outrace cardinal players in timed tests
- Anti-cheat false-positives for diagonal fast-movers
- PvP reports of "unfair" kiting or escape advantage
- Server `MOVEMENT_BLOCKED` errors for valid diagonal moves (dx=1, dy=1 rejected when Chebyshev check fails)

**Phase to address:**
Movement Foundation phase — Must define movement model (tile-step vs continuous) and update both server validation AND client prediction simultaneously.

---

### Pitfall 2: Server Rate Limit (140ms) Incompatible with Smooth Visual Movement

**What goes wrong:**
The current `moveDelay = 500ms` in `WorldScene` and `140ms` server rate limit were designed for deliberate tile-stepping. Adding smooth movement requires sending direction input every frame (~16ms at 60fps) or on keydown, but the server will reject 90% of packets as rate-limited (`MOVEMENT_BLOCKED: Movement too fast`). Client prediction shows smooth movement; server reconciliation snaps player back repeatedly.

**Why it happens:**
The 140ms minimum was set relative to the 500ms client move delay as a safety margin. It's not designed for continuous streaming input. The `setLastMoveTime` / `getLastMoveTime` pattern in `game.gateway.ts` compares wall-clock timestamps, which is correct but tuned for the old system.

**How to avoid:**
- For smooth tile movement (still tile-based but visually smooth): Keep one move per tile, but lower client move delay and match server tolerance. At 200ms/tile: server minimum ~170ms.
- For continuous movement: Switch to velocity-based protocol. Client sends `{ velocityX, velocityY, sequence }` on change (keydown/keyup), not every frame. Server maintains authoritative position updated at its own fixed tick rate (e.g., 100ms).
- Do not simply lower the rate limit without also updating client timing — they must match to avoid flood.

**Warning signs:**
- Frequent `MOVEMENT_BLOCKED: Movement too fast` errors in normal play
- Visual rubber-banding on client despite "valid" movement
- Client event queue growing without draining

**Phase to address:**
Movement Foundation phase — Rate limit and client input protocol must be redesigned together before any visual polish.

---

### Pitfall 3: Client Prediction Replay Logic Not Updated for New Movement Model

**What goes wrong:**
The `MovementController.reconcile()` method replays `PendingInput[]` from the last server-acknowledged sequence. If the movement model changes (new directions, sub-tile positions, or velocity-based), but the replay logic still uses the old `applyInput()` internally, predictions will drift. The client will show the player at a different position than the server computes, causing constant visible snapping after every server update.

**Why it happens:**
`applyInput()` and server-side `calculateNewPosition()` in `movement/validation.ts` must stay in sync. They're separate code paths (client/server split by package boundary) that are easy to update independently. A common mistake is updating `calculateNewPosition` for diagonal/continuous movement but forgetting to update the client's local `applyInput` mirror.

**How to avoid:**
- Extract the core position-update math into `@into-the-void/game-logic` as a shared pure function.
- Both `calculateNewPosition` (server) and `applyInput` (client) must call the same function or be identical implementations.
- Write an integration test that runs server and client logic on the same input sequence and asserts identical final positions.

**Warning signs:**
- Visible snap/correction on every server acknowledgment, even with valid moves
- Client and server positions diverge by more than 1 tile after 5 inputs
- `reconcile()` always replaying more inputs than expected

**Phase to address:**
Movement Foundation phase — Shared movement math must be established before client prediction is implemented.

---

### Pitfall 4: Zone Transition Edge Cases Cause Position Teleports

**What goes wrong:**
When a player moves from tile (63, 32) in zone `z_0_0` to tile (0, 32) in zone `z_1_0`, the zone transition logic (`isZoneTransition`) emits `player:left` + `player:joined` events. If the client and server disagree about which tile triggers the zone boundary, or if prediction crosses the boundary before the server confirms, the player's position can teleport. Cross-zone entity visibility (the 3x3 room subscription) also temporarily misses updates during the transition gap.

**Why it happens:**
`ZONE_SIZE` defines the boundary, but the exact boundary tile (is `x = ZONE_SIZE` in the new zone or still the old zone?) must be consistently defined in both `calculateNewPosition` and `isZoneTransition`. Any off-by-one here means client and server disagree on which zone the player is in.

**How to avoid:**
- Define a canonical boundary rule in `@into-the-void/game-logic`: `x >= ZONE_SIZE` means new zone.
- Test: move a player from tile `ZONE_SIZE - 1` to tile `ZONE_SIZE`. Assert `isZoneTransition` returns true. Assert new position has `x = 0, zoneId = z_1_0`.
- During transition, server must update room subscriptions BEFORE emitting `player:joined` to prevent missed updates.
- Client prediction must not cross zone boundary — hold at boundary tile until server confirms the transition.

**Warning signs:**
- Players "missing" in adjacent zone just after entering it
- Zone transition broadcasts arriving in wrong order (joined before left)
- Entities in adjacent zone not visible briefly after crossing

**Phase to address:**
Movement Foundation phase (if redesigning transitions) or World Streaming phase (if chunk loading is involved).

---

### Pitfall 5: Smooth Movement Breaks Existing Collision Detection

**What goes wrong:**
Current `validateMovement` checks collision at the exact destination tile. For smooth/continuous movement at speeds greater than 1 tile per frame, this allows "tunneling" — passing through a 1-tile-wide wall if the player moves fast enough to skip from one side to the other in a single step.

**Why it happens:**
Discrete tile collision checking assumes the player moves ≤1 tile per step. If move speed increases beyond 1 tile per server tick, the destination can be on the other side of a wall.

**How to avoid:**
- Keep maximum speed at ≤1 tile per server tick for tile-based movement. This is safe with the existing check.
- If continuous movement is added later: use swept collision (check all tiles along the movement vector, not just destination).
- For the entity system milestone specifically: creature wander AI must also validate collision via `validateMovement` or the same tile collision function — do not implement separate "passthrough" movement for creatures.

**Warning signs:**
- Players or creatures appear on the other side of walls without a zone transition
- Collision map shows wall at position, but entity is standing in it

**Phase to address:**
Movement Foundation phase — Must be verified before speed is ever increased.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping diagonal rate-limit multiplier | Simpler rate-limit code | 41% speed exploit for diagonal movement | Never |
| Keeping `applyInput` on client separate from server `calculateNewPosition` | Easier to deploy independently | Prediction drift on any movement change | Never — always share math |
| Lowering server rate limit only (not updating client delay) | Quick "fix" for smooth feel | Server flood, rate-limit errors in normal play | Never |
| Zone boundary check in two places (client + server) | Avoids shared code | Off-by-one bugs at zone edges | Never |
| Single-point destination collision for high-speed movement | Simple code | Tunneling through walls at high speed | Only if max speed stays ≤ 1 tile/tick |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-----------------|
| `game-logic` shared package | Updating server movement without updating package export | Run `pnpm build` after every change to `game-logic`; both api and game-server consume the compiled output |
| Socket.IO room subscriptions | Updating rooms after emitting transition events | Update `updatePlayerRooms` BEFORE emitting `player:joined` on zone transition |
| Client prediction + server reconciliation | Storing pending inputs with wrong sequence numbers | Sequence number must match `lastProcessedInput` field in server's `player:moved` response |
| Rate limiter timestamp | Using `Date.now()` on client to pre-validate | Client clock can be manipulated; only the server's comparison in `game.gateway.ts` is authoritative |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Broadcasting `player:moved` to entire server instead of zone room | Every move event goes to all connected clients | Always use `this.server.to(result.zoneId)` not `this.server.emit` | At 10+ concurrent players |
| Storing all pending inputs indefinitely | `PendingInput[]` grows unboundedly | Prune inputs older than last acknowledged sequence | After ~30 seconds of play |
| Regenerating `WorldGenerator` per move for zone biome lookup | Expensive noise sampling on every move | Cache `WorldGenerator` or `BiomeGenerator` instance in `ZonesService` (already uses `LRUCache`) | At 5+ players moving simultaneously |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-provided `sequence` without validation | Client sends fake high sequence to skip reconciliation | Server only echoes `lastProcessedInput`; never uses client sequence to update server state |
| Not rate-limiting `zone:request` events | Client floods server with zone requests, triggering expensive chunk generation | Apply same rate-limit pattern as `player:move` |
| Accepting `direction` values not in the `Direction` enum | Invalid directions crash `calculateNewPosition` | Validate against enum whitelist before processing in gateway |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing server-reconciled position directly (no interpolation) | Visible snapping/teleporting on every authoritative update | Interpolate visually to reconciled position over 1-2 frames |
| Move delay visible as input lag at higher tick rates | Game feels unresponsive even though technically correct | Tune `moveDelay` and visual animation duration to match tick rate; use client prediction to mask latency |
| Zone transition pause (waiting for `zone:state` before rendering) | Black screen or freeze at zone edge | Pre-load adjacent zone data before player reaches edge (already partially handled by 3x3 room subscriptions) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Diagonal speed**: Diagonal move rate is ~1.414x slower than cardinal move rate — verify with stopwatch test
- [ ] **Prediction sync**: `applyInput` on client and `calculateNewPosition` on server produce identical results on same input — verify with unit test
- [ ] **Zone boundary**: Crossing zone at `x = ZONE_SIZE - 1 → ZONE_SIZE` correctly triggers transition — verify with integration test
- [ ] **Collision consistency**: Moving at maximum speed never allows tunneling through 1-tile wall — verify at tile rate ≤ 1/tick
- [ ] **Room subscription timing**: `updatePlayerRooms` called before `player:joined` emitted — verify by checking event ordering in gateway

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Diagonal speed exploit shipped | MEDIUM | Add diagonal rate-limit multiplier; force reconnect all clients to flush cached move timings |
| Prediction/server math diverged | HIGH | Audit every call site of both functions; extract to shared package; test all 8 directions + zone transitions |
| Zone transition race condition causing missed entities | LOW | Re-request zone state on reconnect; `zone:request` event already supported |
| Rate limit set too low, flooding logs | LOW | Increase `MIN_MOVE_INTERVAL` constant; no client changes needed |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Diagonal speed advantage | Movement Foundation | Stopwatch test: diagonal vs cardinal race |
| Rate limit incompatibility | Movement Foundation | No `MOVEMENT_BLOCKED` errors in normal diagonal play |
| Prediction/server math drift | Movement Foundation | Unit test: same input sequence, identical output position |
| Zone transition teleport | Movement Foundation or World Streaming | Integration test: zone boundary crossing |
| Collision tunneling | Movement Foundation | Collision test at max speed |

---

## Sources

- Gabriel Gambetta: [Client-Server Game Architecture](https://www.gabrielgambetta.com/client-server-game-architecture.html)
- Codebase analysis: `packages/game-logic/src/movement/validation.ts`, `apps/game-server/src/game/game.gateway.ts`
- Codebase analysis: `apps/web/src/game/controllers/MovementController.ts`

---
*Pitfalls research for: Multiplayer 2D MMO — Movement System*
*Researched: 2026-02-17*

---

# Part 2: Infinite World Chunk Streaming Pitfalls

**Scope:** Adding infinite procedural world with chunk-based loading, LRU cache management, and cross-chunk visibility.

**Current system (from codebase analysis):**
- `ZonesService` uses `LRUCache<string, ZoneState>` with `max: 500`, `ttl: 5 minutes`
- `generateChunk()` called on cache miss — synchronous CPU work
- Players subscribe to 3x3 zone rooms via `updatePlayerRooms()`
- `zone:request` event allows client to pull adjacent chunk data
- Chunk ID format: `z_X_Y` (parsed with `split('_')`)

---

## Critical Pitfalls

### Pitfall 1: Chunk Generation on the Hot Path Blocks the Event Loop

**What goes wrong:**
`loadZone()` calls `generateChunk()` synchronously inside `getChunk()`, which is called inside `movePlayer()`, which is called inside a WebSocket message handler. Node.js is single-threaded. A chunk with complex biome sampling and structure generation can take 10-50ms. During that time, all other player events queue. With 10 concurrent players triggering new chunks, the server becomes unresponsive.

**Why it happens:**
`@into-the-void/world-gen` is pure synchronous computation (noise functions, loops). There is no async wrapper. The `ZonesService` uses `async getChunk()` but the actual work is synchronous — the `async` keyword is misleading.

**How to avoid:**
- Pre-generate chunks adjacent to all active players during idle time (background tick).
- Use a `Set<string>` of "being generated" chunks to prevent parallel duplicate generation.
- If generation time exceeds ~5ms measured, offload to a Worker thread using `worker_threads`.
- Never trigger first-time generation inside a player move handler.

**Warning signs:**
- Server tick lag spikes when multiple players explore simultaneously
- `console.log('[ZonesService] Evicted chunk ...')` followed immediately by re-generation of the same chunk
- Move handler latency > 50ms measured via Socket.IO middleware timing

**Phase to address:**
Chunk Streaming foundation phase — Before concurrent exploration is possible.

---

### Pitfall 2: LRU Eviction Destroys Live Entity State

**What goes wrong:**
When a zone is evicted from the LRU cache (after 5 minutes of inactivity), all entity state in that zone — current positions, health, respawn timers, active/inactive flags — is lost. If a player re-enters the zone, `loadZone()` regenerates it from seed, creating all entities fresh. Creatures that were killed respawn instantly. Items that were dropped vanish. Respawn timers reset.

**Why it happens:**
`ZoneState` stores `entities: Map<string, Entity>` purely in memory. The LRU `dispose` callback only logs eviction — it does not persist state. The `generateChunk()` + `createEntityFromSpawn()` path always starts fresh.

**How to avoid:**
- Persist "dirty" entity state (killed entities, respawn timers, dropped items) to database before eviction.
- On zone load, apply persisted mutations on top of freshly generated baseline.
- The LRU `dispose` callback is the correct hook — write entity deltas to DB there.
- For the entity system milestone specifically: respawn timer state MUST survive LRU eviction or the respawn system is meaningless for zones that cycle in and out of cache.

**Warning signs:**
- Players report "infinite respawn" — killing a creature and immediately seeing it alive again after re-entering the zone
- Dropped items disappear when a zone is unloaded and reloaded
- `ZonesService` log shows eviction of a zone that is still being navigated

**Phase to address:**
Entity System phase — Must be addressed before respawn timers are implemented.

---

### Pitfall 3: Cross-Chunk Visibility Creates Entity Data Leakage

**What goes wrong:**
The 3x3 room subscription model sends entity updates for 9 zones to every player. A player at zone center receives entities from 8 adjacent zones. If entities in those zones contain private or sensitive state (inventory loot drops, rare resource locations), all nearby players receive the full entity data regardless of whether they can actually see them. In a stealth or fog-of-war design, this is a cheat vector.

**Why it happens:**
`zone:chunk` emits the full `zoneState.entities` array. `getZoneState()` returns all active entities without per-player filtering. The client receives complete entity objects and filters visually via `isEntityVisible()` — but the raw data is still in the client's memory.

**How to avoid:**
- For the entity system milestone: strip private entity fields (loot contents, exact respawn timer) before sending to clients.
- If perception gating is required: filter entities server-side by `getVisibleEntities(player, entities, perceptionRange)` before including in `zone:chunk` response.
- Never trust client-side visibility filtering as the only privacy mechanism.

**Warning signs:**
- Client can read entity IDs / positions of entities it shouldn't see (inspectable via browser DevTools network tab)
- Rare resource nodes visible on client map before player approaches them

**Phase to address:**
Entity System phase — Perception gating must be server-side from the start.

---

### Pitfall 4: Entity ID Collisions Between Zones

**What goes wrong:**
`createEntityFromSpawn()` generates entity IDs as `${zoneId}_${spawn.spawnId}_${spawn.x}_${spawn.y}`. If the same `spawnId` appears at the same relative coordinates in two different zones, and the zone ID parsing ever truncates or collides, entity lookups return wrong zone's entity. More critically, if a spawned entity is stored by ID in a global map (e.g., a future claim map), ID collisions cause cross-zone state corruption.

**Why it happens:**
The current ID scheme includes `zoneId` as prefix, which should be unique if zone IDs are unique. However, `zoneId` format `z_X_Y` uses numbers that could theoretically create string collisions if zone coordinates are not carefully bounded (e.g., `z_1_10` vs `z_11_0` do not collide here, but `z_-1_0` vs `z_1_0` depends on separator interpretation).

**How to avoid:**
- Keep the `${zoneId}_${spawnId}_${x}_${y}` scheme — it is correct as long as `zoneId` is always unique.
- Add a test: generate entities for `z_1_10` and `z_11_0` and assert no ID collision.
- For dynamically spawned entities (AI movement, loot drops): use `crypto.randomUUID()` not coordinate-based IDs.

**Warning signs:**
- `getEntity()` returning the wrong entity type for a given ID
- Entity claim map (`claimedEntities`) showing stale claims for entities in different zones

**Phase to address:**
Entity System phase — Verify ID scheme before adding dynamic entity spawning.

---

### Pitfall 5: Chunk Generation Uses Dominant Biome, Missing Transition Tiles

**What goes wrong:**
`generateChunk()` samples a single "dominant biome" for the entire chunk for structures and spawns, even though per-tile biome sampling in `generateTerrain()` produces biome transitions mid-chunk. A chunk that is 70% crystal_caves / 30% void_plains at the tile level gets spawned as pure crystal_caves creatures with no void_plains creatures, despite having void_plains tiles. Players in the transition area see creature types mismatched with the terrain they're standing on.

**Why it happens:**
`getChunkBiome()` returns the biome at the chunk's center coordinate. `generateSpawnPoints()` uses this single biome for all spawn table lookups. The per-tile biome generator is only used inside `generateTerrain()`.

**How to avoid:**
- For the entity system milestone: use per-tile biome sampling when placing spawn points, not chunk-center sampling.
- Sample biome at the chosen spawn position (not chunk center) before selecting the spawn table.
- This is especially important for fertility noise — spawn density should vary by actual tile biome, not chunk biome.

**Warning signs:**
- Players in clearly void_plains-colored terrain fighting crystal_caves creatures
- Spawn clusters all of the same type even at biome edges

**Phase to address:**
Entity System phase (spawning) — Fix spawn placement to use per-tile biome before implementing fertility noise.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| No persistence before LRU eviction | Simpler code | Entity state lost on zone cycle — respawn/loot bugs | Never for persistent entity state |
| Dominant-biome spawning | Simpler spawn lookup | Terrain/creature mismatch at biome transitions | Only if no biome transitions exist (they do) |
| Synchronous chunk generation | Simple code path | Event loop blocking with multiple concurrent explorers | Only in single-player or very low concurrency |
| Full entity data in zone:chunk (no filtering) | Simple broadcast | Loot/rare node locations visible to all nearby players | Only if no perception gating is designed |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-----------------|
| LRU cache `dispose` callback | Assuming dispose fires synchronously at eviction | It fires synchronously, but only on the eviction that removes the entry — not on TTL expiry in background; use `fetchMethod` or manual cleanup for TTL |
| `zone:request` event | Sending full chunk including all entity positions to any connected client | Validate player is authenticated and in an adjacent zone before serving chunk data |
| `generateChunk()` from world-gen | Calling multiple times for the same chunk (race condition on cache miss) | Add a `generating: Set<string>` guard to prevent parallel generation of the same zone |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 500 LRU slots for zones | Seems generous | Each ZoneState holds a `Map<string, Entity>` — at 10 entities/zone, 500 zones = 5000 entity objects minimum | At 500 loaded zones with large entity counts (minerals + creatures) |
| Broadcasting entity:update to all 9 zone rooms | Every entity movement notifies players in 9 zones | Filter to zones where the entity is actually visible (radius check) | At 10+ entities moving per tick |
| Parsing zone ID with `split('_').map(Number)` on every event | Readable code | Creates a new array on every call — minor but accumulates at high event rates | At 1000+ events/sec |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Serving `zone:chunk` without verifying player is in adjacent zone | Any authenticated player can pull any zone's entity data | Check that requested `zoneId` is within player's 3x3 subscription grid before serving |
| Entity IDs that encode coordinates | Position of rare resource nodes deducible from entity IDs | Use opaque IDs (UUID) for sensitive entities like rare mineral nodes |
| Allowing `zone:request` without rate limiting | Client floods zone generation, exhausting CPU | Apply per-socket rate limit to `zone:request` events |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Zone transition pause waiting for chunk data | Freeze/stutter at zone boundaries | Pre-load adjacent chunk in background when player is within N tiles of edge |
| Entity pop-in as player crosses zone edge | Jarring appearance of creatures/minerals | Stream adjacent zone entities with the 3x3 subscription — already handled by `zone:request` pattern |
| Respawn entity appearing at same position as killed entity | Feels like broken death animation | Randomize respawn position within spawn radius, not exact spawn point |

---

## "Looks Done But Isn't" Checklist

- [ ] **LRU eviction persistence**: Killed entities and dropped items survive zone eviction/reload — verify by killing entity, triggering eviction, re-entering zone
- [ ] **Concurrent chunk generation**: Two players entering same unloaded zone simultaneously does not create duplicate entity sets — verify with race condition test
- [ ] **Per-tile biome spawn placement**: Spawn point biome is sampled at spawn position, not chunk center — verify by inspecting entities at biome edge tiles
- [ ] **Zone:request authentication**: Unauthenticated sockets cannot pull chunk data — verify with unauthorized zone:request
- [ ] **Entity ID uniqueness**: No ID collision between adjacent zones — verify by generating entities for z_0_0, z_0_1, z_1_0 and asserting all IDs are unique

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| LRU eviction losing entity state | HIGH | Add DB persistence layer; migrate: load zone → apply DB mutations → merge |
| Chunk generation blocking event loop | MEDIUM | Add generation queue; move to worker thread; requires refactoring ZonesService |
| Entity ID collision discovered in production | HIGH | Migrate to UUID-based IDs; requires database migration and client update |
| Full entity data leakage | LOW-MEDIUM | Add server-side visibility filter before `zone:chunk` emit |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| LRU eviction entity state loss | Entity System (respawn) | Kill entity, evict zone, re-enter — entity should be dead/on timer |
| Chunk generation blocking | Chunk Streaming or Entity AI | Measure handler latency with concurrent chunk loads |
| Entity data leakage | Entity System (perception gating) | DevTools: verify entity data is filtered by server before emit |
| ID collisions | Entity System (spawning) | Unit test: adjacent zone entity IDs are all unique |
| Dominant biome mismatch | Entity System (spawning + fertility) | Visual inspection: creatures match terrain biome at spawn position |

---

## Sources

- Codebase analysis: `apps/game-server/src/zones/zones.service.ts`
- Codebase analysis: `packages/world-gen/src/generation/chunk.ts`, `spawn.ts`, `biome.ts`
- `lru-cache` npm documentation (TTL and dispose behavior)
- Node.js `worker_threads` documentation

---
*Pitfalls research for: Infinite World Chunk Streaming*
*Researched: 2026-02-17*

---

# Part 3: Inventory & Items System Pitfalls

**Scope:** Adding inventory management, item pickup/drop, equipment, and item use to an existing multiplayer game.

**Current system (from codebase analysis):**
- `InventoryService` manages in-memory inventory per player, persisted to DB
- `ItemRegistry` is a static map of item definitions
- Equipment slots: exosuit, tool, accessory1, accessory2, modules[]
- `claimEntity` / `releaseClaim` pattern prevents simultaneous pickup race conditions
- `inventory:pickup`, `inventory:drop`, `inventory:use`, `equipment:change` events

---

## Critical Pitfalls

### Pitfall 1: Item Pickup Race Condition Without Synchronous Claim

**What goes wrong:**
Two players standing on the same item entity both send `inventory:pickup` within the same event loop tick. Without synchronous claim, both `getEntity()` calls return the item as active, both write to inventory, both call `despawnEntity()`. Result: item duplicated — both players receive it.

**Why it happens:**
Node.js processes WebSocket events one at a time within a tick, but `await` yields control. Between `claimEntity()` and `despawnEntity()`, any number of other events can process. If claim check is done after an `await` (e.g., after `getEntity()`), the window for races is open.

**How to avoid:**
Current codebase correctly calls `claimEntity()` BEFORE any `await`. This is the right pattern — verify it is maintained for every new interaction type (harvest, loot).

**Warning signs:**
- Two players both receive the same item after simultaneous pickup
- Item entity never despawns (claim never released due to uncaught exception — claim leak)

**Phase to address:**
Item Pickup phase — The synchronous claim-before-await pattern must be established as a code convention and enforced in review.

---

### Pitfall 2: Inventory Slot Assignment is Client-Side

**What goes wrong:**
`slot: -1` placeholder in `newItem` during pickup means the slot is assigned client-side. If the client is malicious or buggy, it can overwrite existing items by claiming their slot number. On the server, `addItem()` must assign the slot authoritatively.

**Why it happens:**
The current implementation has `slot: -1` as a placeholder: "Will be assigned on client." This is a trust boundary violation if slot numbers are used for any game logic decisions server-side.

**How to avoid:**
- Assign slots server-side in `InventoryService.addItem()` — find the first empty slot, assign it.
- Never accept a client-provided slot index for placement.

**Warning signs:**
- Client sends pickup with explicit slot number and it overwrites an existing item
- Inventory slot state drifts between client and server

**Phase to address:**
Inventory Foundation phase — Slot assignment must be server-authoritative before any inventory manipulation is exposed.

---

### Pitfall 3: Equipment Slot Validation Doesn't Guard Against Concurrent Equip

**What goes wrong:**
Two `equipment:change` events arrive in quick succession for the same item. First equip succeeds; second equip finds the item already in equipment slot but still "in inventory" due to async DB lag. Result: item exists in both equipment and inventory simultaneously.

**Why it happens:**
`InventoryService.equipItem()` reads in-memory state, which may not reflect a DB write that hasn't completed yet.

**How to avoid:**
- Apply the same synchronous claim pattern as item pickup to equipment changes.
- Alternatively, use optimistic in-memory locking: mark item as "being equipped" synchronously before any await.

**Warning signs:**
- Item appears in both inventory panel and equipment slot simultaneously
- Stats show double equipment bonus

**Phase to address:**
Inventory Foundation phase — Before equipment system is exposed to concurrent users.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `slot: -1` client-assigned slots | Simpler server code | Slot manipulation exploits | Never |
| Claim pattern skipped for "harmless" interactions (examine) | Less code | Sets precedent for skipping claim in future pickup-adjacent actions | Only for truly read-only interactions |

---

## Sources

- Codebase analysis: `apps/game-server/src/game/game.service.ts` (handleItemPickup)
- Codebase analysis: `apps/game-server/src/game/inventory.service.ts`

---
*Pitfalls research for: Inventory & Items System*
*Researched: 2026-02-17*

---

# Part 4: Entity System Pitfalls

**Scope:** Adding entity definitions and spawning to existing chunk-based world, loot tables with weighted random drops, creature AI (idle wander) in multiplayer context, tool interaction range checking, perception gating (hiding entities from players), respawn system with timers, and fertility noise layer for spawn density.

**Current system (from codebase analysis):**
- `ZonesService` loads entities from `SpawnPoint[]` generated by `world-gen`
- `EntityRegistry` in shared-types has static creature/mineral configs
- `spawn.ts` has per-biome spawn configs with creature/mineral weights and densities
- `interaction.ts` in game-logic has `canInteract()`, `canHarvest()`, `canPickup()` functions
- `range.ts` in game-logic has `getVisibleEntities()`, `MAX_VISIBLE_ENTITIES = 20`, `DEFAULT_VISIBILITY_RANGE = 15`
- `game.gateway.ts` broadcasts `entity:update` to zone room on interaction
- Creatures currently lack: health stats, AI state, loot tables, respawn tracking
- Minerals currently lack: link to `ItemRegistry` for what they drop

---

## Critical Pitfalls

### Pitfall 1: Chunk Reload Spawns Duplicate Entities for Already-Live Spawn Points

**What goes wrong:**
When `ZonesService` evicts a zone and a player re-enters, `loadZone()` calls `generateChunk()` and `createEntityFromSpawn()` for every spawn point — including spawn points whose creatures are still alive in the player's client state. The result is two copies of the same entity: the server resets the zone to pristine state while the client still has the old entity with whatever health/position changes occurred. Clients then show the entity alive in two places simultaneously, or the entity teleports back to spawn position on the client's next zone:state refresh.

**Why it happens:**
`loadZone()` has no concept of "this spawn point already had a live entity — skip it." The spawn point list comes from world-gen deterministically, but entity lifecycle state (alive/dead/on-timer) is only tracked in the in-memory `ZoneState.entities` map, which is lost on eviction.

**How to avoid:**
- Before entity system launch: persist `EntityLifecycleRecord` to database: `{ spawnId, zoneId, state: 'alive' | 'dead', respawnAt: timestamp, position }`.
- On zone load, apply lifecycle records: if a spawn point's entity is `dead` and `respawnAt > now`, skip spawning it. If `respawnAt <= now`, mark as spawnable.
- The spawn-point-to-entity-ID mapping (`${zoneId}_${spawnId}_${x}_${y}`) already provides a stable key for this lookup.

**Warning signs:**
- Players see killed creature reappear immediately after leaving and re-entering a zone
- Zone state shows entity count higher than expected (duplicate IDs)
- Client receives `entity:spawn` for an entity ID it already has in local state

**Phase to address:**
Entity Spawning phase — Must be the first thing addressed. Respawn system is meaningless without this foundation.

---

### Pitfall 2: AI Tick Loop Accumulates Entities and Stalls Node.js Event Loop

**What goes wrong:**
A global `setInterval()` runs creature AI every N milliseconds. As players explore, more zones load, and the entity registry grows. The AI tick iterates over ALL active entities across ALL loaded zones. With 500 LRU zones * 4-6 creatures per zone = 2000-3000 entities updated every tick. Each wander step involves collision checking, position validation, and a broadcast. The tick duration exceeds the tick interval. Node.js falls behind, queued AI ticks pile up, and the server bogs down.

**Why it happens:**
It is natural to implement AI as a single global loop: "for every entity, update AI." This works in development with 5 zones loaded. It fails silently in production as zone count grows. There is no built-in backpressure — `setInterval` queues the next invocation regardless of whether the previous one completed.

**How to avoid:**
- Only tick AI for zones that have at least one player in them or in the 3x3 neighborhood. Track `activePlayerZones: Set<string>` updated on player join/leave.
- Use a "dirty zones" list — only zones with active players need creature AI.
- Cap the number of entities updated per tick. Use a work queue: process up to N entities per tick, rotate through all active-zone entities over multiple ticks.
- Measure tick duration and log a warning when it exceeds interval duration.
- Never use `setInterval` directly — use a self-rescheduling pattern: `const tick = () => { doWork(); setTimeout(tick, INTERVAL); }`. This ensures ticks do not pile up.

**Warning signs:**
- `setInterval` callback duration exceeds configured interval (measure with `performance.now()`)
- Node.js event loop lag increasing over time (`--inspect` + Chrome DevTools perf timeline)
- Creature AI updates arriving at clients with increasing latency as more zones are explored
- Memory growing steadily as zones accumulate (entities not garbage collected)

**Phase to address:**
Creature AI phase — Define AI tick scope and loop strategy before implementing any wander behavior.

---

### Pitfall 3: Loot Table Rolls on Server, Items Spawned Before Persistence

**What goes wrong:**
Player kills a creature. Server rolls loot table and calls `zonesService.spawnEntity()` to place ground items. Before the DB write for the loot items completes, the zone is evicted (e.g., all players leave). On reload, the freshly generated zone has no record of those ground items. The player's loot disappears.

**Why it happens:**
`spawnEntity()` writes to the in-memory `ZoneState.entities` map only. Ground items have `despawnAt` timers, but those timers exist only in memory. If the zone is evicted before `despawnAt`, the item is gone.

**How to avoid:**
- Write ground items to a `ground_items` table in the database immediately on spawn, not just in memory.
- On zone load, restore unexpired ground items from the database.
- Delete ground items from DB on pickup or on `despawnAt` expiry (run a periodic cleanup).
- This integrates directly with the existing `handleItemPickup` flow: despawn entity in memory AND delete from DB.

**Warning signs:**
- Players report loot disappearing "instantly" after killing a creature
- Loot present when killing creature, gone on zone re-entry
- `entity:spawn` broadcast for loot items works in single-session testing but fails across session boundaries

**Phase to address:**
Loot Tables phase — Ground item persistence must be implemented alongside loot table logic, not deferred.

---

### Pitfall 4: Interaction Range Checked Client-Side Only

**What goes wrong:**
The client UI enables/disables the "harvest" or "interact" button based on distance. A modified client or network packet replay skips this check and sends `player:interact` for an entity 20 tiles away. The server processes the interaction without checking range because the current `handleInteraction()` in `game.service.ts` does not call `canInteract()` before processing.

**Why it happens:**
`canInteract()` already exists in `packages/game-logic/src/interaction/interaction.ts` and is correct. It just is not being called in the server gateway handler. Client-side range checks are UX, not security.

**How to avoid:**
- In `game.service.ts` `handleInteraction()`: call `canInteract(player, entity, range)` BEFORE any interaction processing.
- The `range` parameter should come from the entity type's definition (harvesting tool range, attack range) — not a magic number.
- Tool range should factor in the player's equipped tool tier: higher-tier tools have longer reach.

**Warning signs:**
- Player interactions succeed when player is clearly not adjacent to entity in game world
- Server logs showing interactions for entities in different zones than the player

**Phase to address:**
Interaction Range phase — Must be the first check in any interaction handler. Never defer to client-side range checks.

---

### Pitfall 5: Perception Gating Applied Only to Initial Zone Load, Not to Updates

**What goes wrong:**
Server filters entities by perception range when sending `zone:state` on player entry. But when a creature moves (AI wander), server broadcasts `entity:update` to the entire zone room. A player outside perception range still receives the update. The player's client receives position data for entities it should not know about, enabling minimap hacks or bot targeting.

**Why it happens:**
Broadcasting `entity:update` to `this.server.to(zoneId)` is the simplest implementation. Per-player filtering on every AI update would require iterating all players in the zone and sending individual messages — much more expensive.

**How to avoid:**
- For the initial implementation: accept zone-room broadcasts for creature movement but strip sensitive data (loot contents, exact health). Perception gating for position data can be added later.
- If strict perception gating is required from the start: maintain a per-player `visibleEntities: Set<string>` updated each tick. Only send `entity:update` to players for whom the entity is in their visible set.
- The `getVisibilityChanges()` function in `range.ts` already provides the enter/leave sets — use this to send `entity:spawn` / `entity:despawn` events to individual players as entities enter/leave perception range.

**Warning signs:**
- Client receives `entity:update` for entities it never received `entity:spawn` for (orphan updates)
- Players can target entities that should be invisible to them
- Network traffic analysis shows entity position data for all zone entities regardless of player position

**Phase to address:**
Perception Gating phase — Must specify the perception model (strict or relaxed) before implementing creature movement broadcasts.

---

### Pitfall 6: Respawn Timers Use Wall Clock but Server Restarts Reset Them

**What goes wrong:**
Respawn timer is stored as `respawnAt: Date.now() + 60000`. Server restarts. All in-memory timers are gone. All creatures respawn immediately on next zone load. High-value resource nodes that should take 5 minutes to respawn are instantly available after every deployment.

**Why it happens:**
`spawn.ts` generates `respawnTime: 60 + random.nextInt(0, 60)` for each spawn point. But this is the initial respawn time from world-gen, not a live timer. Live respawn state is intended to live in `ZoneState` in memory — which resets on restart.

**How to avoid:**
- Store `{ spawnId, zoneId, killedAt, respawnAt }` in the database when an entity is killed/depleted.
- On zone load, check DB for records where `respawnAt > now`. Do not spawn those entities.
- Cron job or zone-load check: remove records where `respawnAt <= now` — those entities should respawn.
- This is the same persistence pattern needed for Pitfall 1 (duplicate spawns on reload). Design them together as a single `EntityLifecycle` table.

**Warning signs:**
- After server restart, all previously-killed creatures are alive again instantly
- High-value minerals respawn immediately after server deployment
- Respawn time is inconsistent between sessions

**Phase to address:**
Respawn System phase — Database schema for entity lifecycle must be designed before any respawn logic is implemented.

---

### Pitfall 7: Fertility Noise Applied at World-Gen Time, Not at Spawn Time

**What goes wrong:**
Fertility noise is computed during chunk generation and baked into `SpawnPoint` density. If fertility should represent dynamic world state (player activity depletes fertility, zones recover over time), the static world-gen approach does not support this. Conversely, if fertility noise is applied at spawn time using the creature's actual position, biome transitions are handled correctly — but if it is only applied at chunk center, dense spawns appear in the wrong areas.

**Why it happens:**
The natural place to add fertility is inside `generateSpawnPoints()` in `spawn.ts`, modifying `creatureDensity` by a fertility multiplier. But if fertility is sampled at chunk center (`getChunkBiome()` pattern), zones near biome edges get uniform density instead of position-adjusted density.

**How to avoid:**
- Sample fertility noise at each candidate spawn position, not at chunk center.
- Fertility noise and biome noise should use different seeds to avoid correlation (fertile areas should not always align with high-density biomes).
- If fertility represents static world layout, bake at generation time. If fertility represents dynamic world state (e.g., overhunted zones), it must be a separate layer from world-gen and updated at runtime — this significantly increases complexity and should be a separate milestone.

**Warning signs:**
- All creatures in a zone are clustered at biome center, not distributed across terrain
- Fertility multiplier has no visible effect on creature density at biome edges
- Zones near biome boundaries have sharply different creature counts despite smooth noise expected

**Phase to address:**
Fertility Noise phase — Clarify static vs dynamic fertility model before implementation. Static (world-gen baked) is far simpler; dynamic (runtime) requires its own persistence story.

---

### Pitfall 8: Creature Wander Moves Into Occupied Tiles Without Player-Awareness

**What goes wrong:**
Creature wander AI picks a random adjacent tile and moves there. If a player is standing on that tile, the creature overlaps the player. In a server-authoritative system, both the creature and the player occupy the same tile. The game renders them stacked on top of each other. If interaction range is 1 tile (Manhattan distance), a creature that wanders into the player triggers instant interaction.

**Why it happens:**
`validateMovement()` checks collision against the `collisionMap` (static tiles), not against dynamic entities (players, other creatures). Player positions are not in the collision map.

**How to avoid:**
- Creature wander should check dynamic occupancy in addition to static collision.
- Maintain a `tileOccupancy: Map<string, EntityId>` in ZoneState updated on every creature/player move.
- Alternatively: creatures use a "flee from player" behavior (as specified in milestone context) — they actively avoid player-occupied tiles, making overlap far less likely.
- Creatures fleeing players is the intended behavior anyway. Implement flee as the primary behavior, making accidental overlap a non-issue.

**Warning signs:**
- Creatures visually overlap players
- Interaction events firing without player explicitly requesting interaction (creature walked into player's tile)
- Multiple creatures all pathfinding to the same tile simultaneously

**Phase to address:**
Creature AI phase — Dynamic occupancy check must be part of the AI movement validation from the start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| In-memory-only respawn timers | Zero DB overhead | All timers reset on server restart | Never for a persistent world |
| Global AI tick over all loaded zones | Simple code | Server stall as zone count grows | Only in single-player or dev/testing |
| Loot items in memory only (no DB) | Fast implementation | Items lost on zone eviction | Never — this is core gameplay |
| Client-side interaction range check | Responsive UI | Exploitable by modified clients | Only as UX supplement, never as sole check |
| Zone-room broadcast for all entity updates (no per-player filter) | Simple code | Position data leakage for perception-gated entities | Acceptable if no fog-of-war requirement; not acceptable if perception is a game mechanic |
| Single `EntityRegistry` object with `creatures` / `minerals` / `items` sub-objects | Readable | Does not follow the strategy/repository pattern already used for items/tiles | Only for MVP; should be refactored to per-type registries with a common interface |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-----------------|
| `EntityRegistry` vs `ItemRegistry` | Adding creature loot IDs that don't exist in `ItemRegistry` | Validate all loot table item IDs against `ItemRegistry` at server startup (fail fast) |
| `canHarvest()` tool tier check | Checking equipped item tier against `mineral.requiredTier` at client | Server must resolve equipped tool from `InventoryService`, not trust client-sent tier |
| `game-logic` `canInteract()` | Not calling it before processing interaction in `game.service.ts` | Add as the first call in `handleInteraction()`, `handleItemPickup()`, and all future interaction handlers |
| `world-gen` spawn density | `creatureDensity` is an average, not a hard cap — actual count is `Math.round(density * (0.5 + random.next()))` | Account for variance: density 4 can produce 2-6 creatures. Set max entity cap per zone to prevent outlier over-spawning |
| AI tick and Socket.IO room broadcasts | Emitting `entity:update` per creature per tick to a room with many players | Batch entity updates: collect all creature moves in a tick, emit one `entities:batch_update` event per zone per tick |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Global AI tick over all LRU zones | Event loop lag grows with zone count | Only tick zones with active players | With 50+ loaded zones and 2+ creatures each |
| Per-entity `entity:update` broadcasts | N entities * M players events per tick | Batch per zone, one event per tick | At 5+ entities moving per tick in a populated zone |
| `getVisibleEntities()` called on every player for every AI update | O(entities * players) per tick | Cache visibility sets, invalidate on entity/player move | At 10+ players per zone with active AI |
| `Math.round(density * (0.5 + random.next()))` called with `new SeededRandom` per zone per call | Creates new RNG instance on each zone load | Already uses per-zone seeded RNG — acceptable, but verify no duplicate instantiation |
| Respawn timer checked by iterating all entity lifecycle DB records every second | DB query cost grows with game age | Index `respawnAt`, use a priority queue in memory for due timers | After 10K entity death records accumulated |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-provided `targetId` without zone-membership check | Player interacts with entity in a zone they're not in | Verify `entity.position.zoneId === player.position.zoneId` before any interaction |
| Loot table rolls on client | Client can choose which loot to receive | Loot table rolls must be on server only; client receives `entity:spawn` for generated items |
| Sending full `Creature` type to client including internal AI state | AI path, aggro target, internal timers visible to client | Strip AI state fields before broadcasting creature data |
| Entity despawn broadcast without authorship check | Any player can claim they despawned an entity they didn't interact with | `entity:despawn` is a server event only — never accept it from clients |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Creature teleports to new position on wander step (no interpolation) | Jarring visual jump every AI tick | Broadcast target position; client interpolates over tick duration |
| Respawn entity appears instantly at exact spawn point | Breaks immersion — creature "pops in" | Fade-in animation; use `entity:spawn` event with a brief delay after `respawnAt` |
| Player can't harvest because tool tier check fails silently | Frustrating — no feedback | `canHarvest()` returns `reason` string; always send this to client in error event |
| Perception range visual is a hard circle (entities pop in/out) | Distracting | Fade entities near perception boundary over 0.5s |

---

## "Looks Done But Isn't" Checklist

- [ ] **Entity lifecycle persistence**: Killed entities do not respawn immediately on zone re-entry — verify by killing, leaving, re-entering zone
- [ ] **Respawn survives restart**: Entity killed before server restart is still dead after restart until timer expires — verify by kill + restart + re-enter
- [ ] **Loot items survive zone eviction**: Ground items from creature kills persist across zone eviction/reload — verify by drop loot, trigger eviction, re-enter
- [ ] **Server-side range check**: Interaction from 10 tiles away is rejected by server — verify by sending crafted WebSocket packet
- [ ] **AI only ticks active zones**: Zones with no nearby players do not run AI ticks — verify by checking CPU at rest with no players near a populated zone
- [ ] **Loot item IDs validated at startup**: Starting server with an invalid loot table item ID throws at startup, not at runtime — verify by adding bogus item ID to loot table
- [ ] **Biome spawn matching**: Creatures spawned at biome-edge tiles match the tile's biome, not the chunk center biome — verify at biome boundary tiles
- [ ] **Creature does not overlap player**: Wander AI avoids player-occupied tiles — verify by standing still and watching creature pathfinding

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate entities on zone reload | MEDIUM | Add EntityLifecycle DB table; backfill with "alive" for all current zone entities; apply on load |
| AI tick stalling server | MEDIUM | Add active-zone filter to AI service; no schema changes needed |
| Loot item loss on zone eviction | HIGH | Add ground_items DB table; requires migration + backfill (items already lost cannot be recovered) |
| Interaction range exploited in production | LOW | Add server-side range check; deploy server-only; no client update needed |
| Respawn timers lost on restart | MEDIUM | Add EntityLifecycle DB table; all entities that were killed before restart will respawn fresh on next restart (acceptable one-time recovery) |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Duplicate entities on zone reload | Entity Spawning phase | Kill entity, evict zone, re-enter — no duplicate |
| AI tick accumulation | Creature AI phase | CPU/event-loop measurement with 50+ zones loaded |
| Loot item loss on eviction | Loot Tables phase | Kill creature, force eviction, re-enter — items persist |
| Interaction range not server-validated | Interaction Range phase | Crafted packet test: interact from 10 tiles away |
| Perception update leakage | Perception Gating phase | Network trace: entity update not received outside perception range |
| Respawn timer reset on restart | Respawn System phase | Kill + restart + re-enter: entity still on timer |
| Fertility noise at chunk center | Fertility Noise phase | Visual: creature density gradient follows biome tile map, not chunk center |
| Creature overlap with player | Creature AI phase | Manual test: stand still, observe creature wander pattern |

---

## Sources

- Codebase analysis: `apps/game-server/src/zones/zones.service.ts` (LRU eviction, entity lifecycle)
- Codebase analysis: `apps/game-server/src/game/game.service.ts` (handleInteraction — missing canInteract call)
- Codebase analysis: `packages/game-logic/src/interaction/interaction.ts` (canInteract, canHarvest)
- Codebase analysis: `packages/game-logic/src/visibility/range.ts` (getVisibleEntities, getVisibilityChanges)
- Codebase analysis: `packages/world-gen/src/generation/spawn.ts` (biome-dominant spawn, not per-tile)
- Codebase analysis: `packages/shared-types/src/game/entity-registry.ts` (EntityRegistry structure)
- [Gabriel Gambetta: Client-Server Game Architecture](https://www.gabrielgambetta.com/client-server-game-architecture.html)
- [MMO Architecture: Source of Truth and I/O Bottlenecks (HackerNews)](https://news.ycombinator.com/item?id=37702632)
- [Why setInterval() Is Bad — x5ff Blog](https://blog.x5ff.xyz/blog/typescript-interval-iot/) — self-rescheduling pattern
- [Node.js Memory Leaks with setInterval — LogRocket](https://blog.logrocket.com/escape-memory-leaks-javascript/)

---
*Pitfalls research for: Entity System — spawning, loot, AI, interaction, perception, respawn, fertility*
*Researched: 2026-02-18*

---

# Part 5: Active Combat Ability System Pitfalls

**Scope:** Adding active combat abilities to existing auto-attack combat system in a server-authoritative 2D multiplayer MMO.

**Current system (from codebase analysis):**
- `CombatService` manages player-to-creature combat sessions with auto-attack
- `attackTick()` uses `calculateAttackInterval()` based on haste stat
- `energy` and `maxEnergy` exist in Player type but currently hardcoded (100/100)
- Items grant passive stat bonuses via `on_equip` and `passive` effect triggers
- Server-authoritative movement with client prediction and reconciliation
- Socket.IO events: `combat:start`, `combat:damage`, `combat:end`

---

## Critical Pitfalls

### Pitfall 1: Client Prediction vs Server Authority Mismatch
**What goes wrong:** Players with low cooldown abilities experience different rates of fire based on their latency. Players with 300ms ping can fire 20-30% slower than players with 20ms ping because cooldown prediction isn't synchronized.

**Why it happens:** Server is authoritative for ability execution, but client predicts cooldown locally. When server rejects an ability activation (still on cooldown server-side), the client has already shown the ability as available.

**Consequences:**
- Unplayable experience for high-latency players
- Competitive imbalance in PvP
- Frequent rollbacks causing visual glitches (abilities appear to fire, then undo)
- Player frustration and churn

**Prevention:**
- Implement cooldown prediction with server-sent cooldown start times
- Use server timestamps for all cooldown calculations
- Add latency compensation: `effectiveCooldownEnd = serverCooldownEnd + estimatedLatency`
- Display cooldown state with visual buffer zone (90% = "almost ready" vs 100% = "can cast")
- Server should send `abilityReady` confirmations for critical abilities

**Detection:**
- Monitor ability activation rejection rates per player
- Track correlation between player latency and ability usage frequency
- Log desync events where client predicted success but server rejected

**Phase assignment:** Phase 1 (Network Foundation) - must be architected from day one

**Sources:**
- [Gameplay Abilities and You | UE4: Guidebook](https://unreal.gg-labs.com/wiki-archives/networking/gameplay-abilities-and-you) - GameplayEffect latency reconciliation issues

---

### Pitfall 2: Rollback Re-simulation Overhead
**What goes wrong:** With 300ms connection, the server must re-simulate approximately 22 frames of game state every time a correction happens. With 20+ abilities, each with different effects, buffs, and debuffs, re-simulation becomes computationally expensive and causes server lag spikes.

**Why it happens:** Rollback netcode requires saving every predicted frame and replaying from confirmed state. Ability systems with complex effects (DoT, buffs, stat modifications) multiply the computational cost of each frame replay.

**Consequences:**
- Server performance degrades with player count
- Ability spam causes server lag affecting all players in zone
- Increased hosting costs or forced player count limits
- Cascading delays as server falls behind

**Prevention:**
- Limit prediction depth (only predict 10-15 frames, not full RTT)
- Use simplified simulation for rollback (stat snapshots vs full recalculation)
- Implement ability rate limiting per player (global cooldown + per-ability cooldown)
- Cache frequently used stat calculations rather than recomputing
- Consider snapshot interpolation instead of full rollback for non-critical abilities

**Detection:**
- Monitor server tick processing time
- Track re-simulation frequency per zone
- Alert when tick processing exceeds budget (16ms for 60Hz)

**Phase assignment:** Phase 2 (Core Ability Execution) - architecture decision affects all abilities

**Sources:**
- [Prediction | Netcode for Entities](https://docs.unity3d.com/Packages/com.unity.netcode@1.0/manual/prediction.html) - Prediction errors and rollback overhead
- [Determinism, Prediction and Rollback | coherence Documentation](https://docs.coherence.io/manual/advanced-topics/competitive-games/determinism-prediction-rollback) - Re-simulation costs

---

### Pitfall 3: Buff/Debuff Duration Desync
**What goes wrong:** Buff timer shows 2.3s remaining on client, but server expired it at 2.0s. Player casts ability expecting buff bonus, server calculates damage without buff, client shows wrong damage numbers. Or worse: player dies because server calculated incoming damage with debuff they thought expired.

**Why it happens:** Client and server clocks drift over time (50ms drift over 10 minutes is common). Buffs applied mid-frame have different timestamps. Network packet delays mean buff application arrives late. Duration rounding differences between client/server.

**Consequences:**
- Player sees wrong damage numbers (kills trust)
- Tactical decisions based on false information (thought they were buffed)
- Exploits: players manipulate local clock to extend buff durations
- Death feels unfair ("I wasn't poisoned anymore!")

**Prevention:**
- All buff durations are server timestamps, not client-relative
- Server sends buff state with every relevant event (not just on change)
- Client displays buffs with safety margin: show "expiring soon" at 90% duration
- Server sends explicit buff expiration events (don't rely on client timers)
- Periodic full buff state sync (every 5-10 seconds)
- Use server tick counts instead of milliseconds for duration tracking

**Detection:**
- Log buff state mismatches between client predictions and server corrections
- Monitor player reports of "buff expired early" or "debuff lasted too long"
- Compare client-predicted damage vs server-calculated damage

**Phase assignment:** Phase 3 (Buff System) - architectural decision before implementing buffs

**Sources:**
- [Timers on buffs - server or client timer? - GameDev.net](https://gamedev.net/forums/topic/496780-timers-on-buffs---server-or-client-timer/) - Duration tracking approaches
- [Client/server clock sync issue - GameDev.net](https://www.gamedev.net/forums/topic/707830-clientserver-clock-sync-issue-confirmation-and-solutions/) - Clock drift and synchronization
- [Arena Breakout Desync Fix 2026](https://news.bittopup.com/news/arena-breakout-desync-fix-2026-audio-network-guide) - Server tick rates and desync (2026 example)

---

### Pitfall 4: Equipment Swap Ability Loss/Duplication
**What goes wrong:** Player swaps from Tool A (grants Ability X) to Tool B (grants Ability Y). Ability X remains usable. Player fires Ability X while Tool B equipped, causing either: server crash (ability not found), ability executing with wrong stats, or ability executing with Tool A stats despite not equipped.

**Why it happens:** Abilities are granted by items but not properly removed when item is unequipped. Client caches ability list and doesn't update on equipment change. Server doesn't validate that player still has item granting the ability.

**Consequences:**
- Players can exploit to use all abilities they've ever equipped
- Balance completely breaks (use 10 different weapon abilities simultaneously)
- Item swap exploits in PvP (instant weapon swap for burst damage)
- Server crashes or undefined behavior when ability references non-existent item

**Prevention:**
- Recalculate full ability list on every equipment change (server authoritative)
- Server validates item ownership AND equipment state before ability execution
- Abilities store reference to granting item, checked on cast
- Clear client ability bar and rebuild from server state on equipment change
- Add cooldown penalty for equipment swaps (prevent rapid switching)
- Emit `abilities:update` event after equipment changes

**Detection:**
- Server logs ability casts with item validation checks
- Monitor for abilities used without corresponding equipped item
- Track rapid equipment swap patterns (exploit detection)
- Log client-server ability list mismatches

**Phase assignment:** Phase 2 (Ability Execution) - validation required before item-granted abilities

**Sources:**
- [Attribute swapping not fully prevented · Issue #13588 · PaperMC/Paper](https://github.com/PaperMC/Paper/issues/13588) - Equipment swap exploits in PvP (2026)
- [Major Equipment bug - Larian Studios](https://forums.larian.com/ubbthreads.php?ubb=showflat&Number=929387) - Equipment swap ability bugs

---

### Pitfall 5: Energy Regeneration Host/Non-Host Desync
**What goes wrong:** In multiplayer sessions, non-host players experience energy regeneration bugs where regen rate drops dramatically over time (from 42.9/sec to 16/sec) and never recovers. Players can't use abilities because energy doesn't regenerate fast enough.

**Why it happens:** Energy regeneration uses delta time that accumulates rounding errors differently on host vs non-host. Network updates to energy state conflict with local regeneration. Server and client both try to manage energy, causing interference.

**Consequences:**
- Non-host players feel sluggish and underpowered
- Ability-based gameplay becomes impossible for non-host
- Players refuse to join games unless they're host
- Multiplayer becomes effectively unplayable

**Prevention:**
- Server is single source of truth for energy regeneration (client only displays)
- Send energy updates with regeneration rate, not absolute values
- Client predicts energy locally but corrects to server state on sync
- Use server-authoritative tick for regeneration (not delta time)
- Send full energy state every N seconds to correct drift
- Avoid fractional energy accumulation - work in integer ticks

**Detection:**
- Monitor energy regeneration rate over time per player
- Log energy state corrections (server overriding client)
- Track player complaints about "slow energy regen"
- Automated tests comparing host vs non-host energy over 10 minutes

**Phase assignment:** Phase 1 (Resource System Foundation) - energy system must be server-authoritative from start

**Sources:**
- [Mana Regen Bug for Non-Host Players - Titan Quest II](https://steamcommunity.com/app/1154030/discussions/2/591779267908571790/) - Mana regeneration desync in multiplayer (2026)

---

### Pitfall 6: Animation Lock Exploits
**What goes wrong:** Players discover they can animation cancel abilities by rapidly swapping equipment, moving, or triggering other actions. This lets them fire abilities 2-3x faster than intended, breaking combat balance. Or conversely: players get locked in animations and can't move despite ability finishing server-side.

**Why it happens:** Client animation duration doesn't match server ability execution time. Player can queue new actions before server finishes processing ability. Movement interrupts abilities client-side but server still executes them. No movement lockout period after ability cast.

**Consequences:**
- PvP becomes dominated by animation canceling techniques
- Casual players can't compete with exploiters
- Balance designed around 1s cast time becomes 0.3s with canceling
- Or: players stuck unable to move while ability is "casting" (already finished server-side)

**Prevention:**
- Server enforces movement lockout period: `movementBlockedUntil = now + abilityLockDuration`
- Client cannot send movement commands during server-side lockout
- Ability animations match server timing exactly
- Equipment swap triggers ability cast interruption (if desired) or is blocked during cast
- Server rejects movement/action commands during cast lock period
- Make animation canceling a deliberate feature or explicitly prevent it

**Detection:**
- Monitor ability cast rates vs expected rates per ability
- Track movement commands rejected due to lockout
- Log rapid action sequences (ability -> move -> ability in <100ms)
- PvP analytics: abilities per minute comparison

**Phase assignment:** Phase 2 (Ability Execution) - lockout system required before abilities go live

**Sources:**
- [Animation Lock | XIV Dev Wiki](https://xiv.dev/game-internals/actions/animation-lock) - Animation lock mechanics
- [Animation canceling and how it's exploited in pvp - Homecoming](https://forums.homecomingservers.com/topic/21727-animation-canceling-and-how-its-exploited-in-pvp/) - Animation cancel exploits

---

## Moderate Pitfalls

### Pitfall 7: No Input Buffering/Queueing
**What goes wrong:** Player presses Ability B while Ability A is still executing. Input is lost. Player must wait for animation to finish, then press again. Feels unresponsive and clunky.

**Why it happens:** Game only processes inputs when player is in "idle" state. Inputs during cast/lockout are ignored rather than queued.

**Prevention:**
- Implement ability queue (buffer next ability during current cast)
- Queue depth of 1 is sufficient (queue next action only)
- Display queued ability visually (highlight next ability icon)
- Clear queue on movement or manual cancel
- Server validates queued ability is still valid when it executes

**Detection:**
- Player feedback about "abilities not responding"
- High rate of duplicate ability activations (player mashing key)

**Phase assignment:** Phase 4 (UX Polish) - quality of life improvement after core works

**Sources:**
- [Ability Queue System - GAS Companion](https://gascompanion.github.io/ability-queue-system/) - Input buffering implementation

---

### Pitfall 8: Visual Feedback Clarity in Multiplayer
**What goes wrong:** Player doesn't see ability telegraph from enemy player. Gets hit by abilities that were "invisible". Can't tell which abilities are being cast or which buffs are active on enemies.

**Why it happens:** Visual effects not networked properly. Client prioritizes local player VFX over remote players. Render culling removes VFX too aggressively. No standardized visual language for ability states.

**Prevention:**
- Network ability cast events with target position/direction
- Standardized telegraph system: ground circles for AoE, directional cones, etc.
- Enemy cast bars visible to all players in range
- Buff/debuff icons above character nameplate
- Visual priority system: don't cull combat-critical VFX

**Detection:**
- Player reports of "unfair" deaths (didn't see attack coming)
- Spectator mode reveals abilities not visible to victims
- A/B test with enhanced telegraphs

**Phase assignment:** Phase 5 (Visual Polish) - after core abilities work

**Sources:**
- [How Dominate Multiplayer FPS Games in 2026](https://www.solutiontipster.com/2025/12/fps-games-in-2026/) - Visual clarity and readability in competitive games (2026)

---

### Pitfall 9: Ability Spam Griefing
**What goes wrong:** Players spam abilities continuously to create visual noise, cause server lag, or harass other players. Low-cooldown abilities become grief tools.

**Why it happens:** No global cooldown between abilities. No resource cost limits spam. No detection of repeated identical actions.

**Prevention:**
- Global cooldown (0.5-1s) after any ability
- Energy cost prevents infinite spam
- Rate limiting: max N abilities per M seconds server-side
- Diminishing returns: repeated ability use increases energy cost or cooldown
- AoE abilities can't affect friendly players (prevent team griefing)

**Detection:**
- Monitor ability usage patterns (10+ activations in 1 second = suspicious)
- Player reports for ability spam
- Server performance correlation with specific players' ability usage

**Phase assignment:** Phase 2 (Ability Execution) - rate limiting built into execution system

**Sources:**
- [How Anti-Spam Works - Grief Prevention](https://dev.bukkit.org/projects/grief-prevention/pages/how-anti-spam-works) - Rate limiting and spam prevention

---

### Pitfall 10: Target Validation Exploits
**What goes wrong:** Players cast abilities at targets out of range by exploiting latency, prediction, or packet manipulation. Abilities hit enemies through walls or across the map.

**Why it happens:** Client sends ability with target ID, server doesn't re-validate range/LoS at execution time. Server trusts client-provided target position. Lag compensation overcompensates.

**Prevention:**
- Server re-validates range at ability execution time (not just when requested)
- Line-of-sight checks for targeted abilities (raycast on server)
- Max range hard-coded server-side, not client-configurable
- Reject ability if target moved out of range between request and execution
- Log suspicious activations (target was never in range based on server state)

**Detection:**
- Automated detection: ability hit at distance > max_range + latency_buffer
- Player reports of being hit "through walls" or "from downtown"
- Server logs of rejected abilities due to range validation

**Phase assignment:** Phase 2 (Ability Execution) - validation required for every targeted ability

**Sources:**
- [Cheating in online games - Wikipedia](https://en.wikipedia.org/wiki/Cheating_in_online_games) - Server validation importance
- [Exploits, Cheats, and the Fragile Balance of Online Gaming](https://www.designthegame.com/learning/tutorial/exploits-cheats-fragile-balance-online-gaming) - Game mechanics exploits

---

## Minor Pitfalls

### Pitfall 11: Buff Stacking Precedence Bugs
**What goes wrong:** Player has +20% power buff from Ability A and +15% power buff from Ability B. What's the actual power bonus? 35%? 38% (multiplicative)? Which buff applies first? Buff expires but stats don't update.

**Why it happens:** No defined stacking rules. Multiple systems modify same stats without coordination. Stat recalculation doesn't happen on buff expiry.

**Prevention:**
- Define stacking rules: additive vs multiplicative, unique vs stacking
- Buffs with same name don't stack (refresh duration instead)
- Stat recalculation triggered on buff add/remove/expire
- Server maintains buff stack and recalculates stats atomically
- Document stacking rules in buff definitions

**Detection:**
- Player reports of "stats not updating"
- Automated testing: apply buffs, verify stat values, remove buffs, verify revert

**Phase assignment:** Phase 3 (Buff System) - rules defined when buff system created

**Sources:**
- [Complete list of buffs and debuffs with stacking issues · Issue #7667 · TrinityCore](https://github.com/TrinityCore/TrinityCore/issues/7667) - Buff stacking bugs
- [Buffs And Debuffs Explained – Destiny 2](https://www.thegamer.com/destiny-2-buffs-debuffs-stacking-explained/) - Stacking mechanics

---

### Pitfall 12: Learning Curve Too Steep
**What goes wrong:** Existing players using auto-attack suddenly have 20 abilities. Don't know which to use when. Overwhelmed, stop playing.

**Why it happens:** All abilities unlocked at once. No gradual introduction. No tutorial explaining new system.

**Prevention:**
- Phase rollout: start with 3-5 core abilities, unlock more over time
- Tutorial quest: "learn to use abilities" with guided practice
- Ability tooltips with usage hints ("use when enemy at low health")
- Default keybinds that make sense (1-5 for main rotation)
- Visual prompts: "Ability X is ready!" when situation is right

**Detection:**
- Player retention drops after ability system launches
- Support tickets asking "how do I use abilities?"
- Analytics: % players who never use abilities

**Phase assignment:** Phase 6 (Onboarding) - after abilities work, before wide release

**Sources:**
- [Game Progression and Progression Systems](https://gamedesignskills.com/game-design/game-progression/) - Managing learning curve complexity
- [Mobile Retention Trends for 2026](https://blog.playio.co/mobile-retention-trends-2026) - Player retention and learning curves

---

### Pitfall 13: Cooldown Display Ambiguity
**What goes wrong:** Ability icon shows "2.3s" but player doesn't know if that's "ready in 2.3s" or "2.3s duration remaining". Or cooldown looks ready (circular fill complete) but clicking does nothing because server-side it's still locked.

**Why it happens:** UI doesn't distinguish between client prediction and server state. Visual representation ambiguous.

**Prevention:**
- Clear visual states: grayed = on cooldown, glowing = ready, pulsing = queued
- Numeric display: "2.3s" with context (cooldown vs duration)
- Visual buffer: show "almost ready" state 100ms before server confirms
- Error feedback: "Not ready yet" message if clicked too early

**Detection:**
- Player reports of "button not working"
- High rate of rejected ability activations due to cooldown

**Phase assignment:** Phase 5 (UI Polish) - after core functionality works

---

### Pitfall 14: Computational Cost at Scale
**What goes wrong:** Server handles 50 players in a zone, each casting 2-3 abilities per second, each ability checking targets, calculating damage, applying buffs, triggering effects. Server tick time spikes from 16ms to 200ms. Game becomes slideshow.

**Why it happens:** Ability system not optimized for scale. Every ability does expensive lookups (find targets, compute stats, validate conditions). No batching or caching.

**Prevention:**
- Spatial partitioning for target acquisition (quadtree/grid)
- Cache stat calculations per tick (don't recalculate 50x per frame)
- Batch similar abilities (all projectiles calculated together)
- Ability budgeting: limit total abilities per zone per tick
- Async processing for non-critical effects (buffs can be eventual)
- Profile and optimize hot paths before launch

**Detection:**
- Server tick time monitoring per zone
- Correlate tick time spikes with ability usage
- Load testing: simulate 50 players spamming abilities

**Phase assignment:** Phase 7 (Performance Optimization) - after system works, before scaling up

**Sources:**
- [Game Server Optimization - FasterCapital](https://fastercapital.com/services/Game-Server-Optimization.html) - Resource allocation optimization
- [Running your game servers at scale - AWS](https://aws.amazon.com/blogs/compute/running-your-game-servers-at-scale-for-up-to-90-lower-compute-cost/) - Compute efficiency

---

### Pitfall 15: Energy Display Lag
**What goes wrong:** Player casts ability costing 30 energy. Energy bar doesn't update for 200ms. Player thinks cast failed, tries again, now has -10 energy and second cast rejected. Confusing and frustrating.

**Why it happens:** Energy cost applied server-side, client waits for confirmation. No optimistic update client-side.

**Prevention:**
- Optimistic energy update: client predicts energy cost immediately
- Server confirmation corrects if needed
- Visual feedback: flash energy bar on cost
- Energy cost displayed on ability tooltip
- Disable abilities if energy too low (don't wait for server rejection)

**Detection:**
- Player reports of "abilities not working"
- High rate of rejected abilities due to insufficient energy
- Analytics: duplicate ability activations

**Phase assignment:** Phase 4 (UX Polish) - optimization after core works

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Network Protocol Design | Client prediction vs server authority (#1) | Architect cooldown sync from day one, use server timestamps |
| Ability Execution Core | Rollback overhead (#2), Equipment swap exploits (#4) | Limit prediction depth, validate item ownership on cast |
| Resource System (Energy) | Energy regen desync (#5) | Server-authoritative regeneration with periodic sync |
| Buff/Debuff System | Duration desync (#3), Stacking bugs (#11) | Server timestamps for all durations, define stacking rules up front |
| Animation System | Animation lock exploits (#6) | Server enforces movement lockout, match animation to server timing |
| Targeting System | Range validation exploits (#10) | Server re-validates range and LoS at execution time |
| Visual Effects | Multiplayer VFX clarity (#8) | Network ability casts, standardized telegraphs |
| Anti-Cheat | Rate limiting (#9), Ability spam | Global cooldown + energy cost + server-side rate limiting |
| Player Onboarding | Learning curve (#12) | Gradual unlock, tutorial, contextual prompts |
| UI/UX Polish | Input buffering (#7), Cooldown display (#13), Energy lag (#15) | Queue system, clear visual states, optimistic updates |
| Performance Optimization | Computational cost at scale (#14) | Spatial partitioning, caching, batching, profiling |

---

## Integration-Specific Warnings

Since this is adding abilities to an existing game:

### Existing Auto-Attack System
**Risk:** Auto-attack and ability system run simultaneously, causing double damage or conflicting state.
**Mitigation:** Disable auto-attack when ability system activates. Add migration flag in database: `usesAbilitySystem: boolean`. Provide opt-in testing period.

### Existing Combat Session Management
**Risk:** Current `CombatSession` tracks `lastAttackAt` for auto-attack intervals. Abilities need per-ability cooldowns.
**Mitigation:** Extend session to include `activeAbilities: Map<abilityId, { lastUsed, onCooldownUntil }>`. Keep auto-attack logic for fallback.

### Existing Equipment System
**Risk:** Items currently grant passive stats. Adding active abilities changes item power budget and balance.
**Mitigation:** New item property `grantsAbilities: string[]`. Recalculate available abilities on equipment change. Phase rollout: start with new items only.

### Existing Health/Energy Stats
**Risk:** Current code has `energy: 100, maxEnergy: 100` as hardcoded defaults. Abilities need real energy consumption.
**Mitigation:** Add energy regeneration to AI tick loop (mirrors health regen). Energy cost in ability definitions. Server validates energy before cast.

### Existing Network Events
**Risk:** Current events are `combat:start`, `combat:damage`. Abilities need `ability:cast`, `ability:hit`, `ability:cooldown`, `buff:apply`, `buff:expire`.
**Mitigation:** Add new event types incrementally. Keep combat events for auto-attack fallback during migration.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Client-side cooldown tracking only | Simpler server code | Prediction desync, latency advantage exploits | Never |
| No global cooldown between abilities | Easier implementation | Ability spam griefing, server overload | Never |
| Buff durations use client timestamps | Simpler client code | Clock manipulation exploits, desync on lag | Never |
| Equipment change doesn't rebuild ability list | Simpler event handler | Ability duplication/loss exploits | Never |
| Energy regen on client with server sync | Responsive UI | Host/non-host desync bugs | Never |
| No animation lockout period | Simpler state machine | Animation cancel exploits | Never |
| Full rollback prediction for all abilities | Most responsive feel | Server performance degradation | Only for very low player counts (<10) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Cooldown latency compensation**: High-ping players can use abilities at same rate as low-ping players — verify with 300ms artificial lag
- [ ] **Equipment swap validation**: Using ability from unequipped item is rejected — verify by swapping tools mid-combat
- [ ] **Energy regen consistency**: Non-host players regenerate energy at same rate as host over 10 minutes — verify in multiplayer session
- [ ] **Buff duration sync**: Buff expiry matches between client display and server calculation — verify by monitoring buff state corrections
- [ ] **Animation lockout**: Player cannot move during ability cast lockout period — verify with movement input during cast
- [ ] **Ability rate limiting**: Spamming abilities triggers server-side rate limit — verify by rapid ability activation
- [ ] **Target range validation**: Ability cast at out-of-range target is rejected by server — verify with crafted packet
- [ ] **Buff stacking rules**: Multiple buffs of same type behave according to defined rules — verify with overlapping buff applications
- [ ] **Energy display optimistic**: Energy bar updates immediately on ability use, corrects on server response — verify with network throttling
- [ ] **Input buffering**: Queuing ability during current cast executes it after cast completes — verify with rapid key presses

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cooldown prediction desync shipped | MEDIUM | Add server-timestamp cooldown sync; force client update; add latency compensation |
| Energy regen desync in production | HIGH | Refactor to server-authoritative regen; requires client + server deploy; existing save data unaffected |
| Animation cancel exploit discovered | LOW-MEDIUM | Add server-side lockout validation; server-only deploy; log existing exploiters |
| Equipment swap ability duplication | HIGH | Add item validation on ability cast; audit player inventories for impossible ability counts; ban exploiters |
| Buff duration desync causing wrong damage | MEDIUM | Switch to server-tick-based duration; force buff state resync on next login |
| No input buffering causing poor UX | LOW | Add queue system; client-only update; no server changes needed |
| Ability spam causing server lag | LOW | Add global cooldown + rate limiting; server-only deploy |

---

## Sources

**Multiplayer Ability Systems:**
- [Understanding the Unreal Engine Gameplay Ability System](https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-the-unreal-engine-gameplay-ability-system) - GAS networking challenges
- [Unreal Engine 5 - The truth of the Gameplay Ability System](https://vorixo.github.io/devtricks/gas/) - Learning curve and setup complexity
- [GitHub - tranek/GASDocumentation](https://github.com/tranek/GASDocumentation) - Multiplayer ability system implementation guide

**Server Authority & Synchronization:**
- [Synchronize Skills & Abilities between Server and Client - GameDev.net](https://www.gamedev.net/forums/topic/706727-synchronize-skills-amp-abilities-between-server-and-client/) - State mutation sync issues
- [How do Multiplayer Game sync their state? Part 2](https://medium.com/@qingweilim/how-do-multiplayer-game-sync-their-state-part-2-d746fa303950) - Server authority patterns

**Client Prediction & Rollback:**
- [Prediction | Netcode for Entities](https://docs.unity3d.com/Packages/com.unity.netcode@1.0/manual/prediction.html) - Prediction accuracy degradation
- [Determinism, Prediction and Rollback | coherence Documentation](https://docs.coherence.io/manual/advanced-topics/competitive-games/determinism-prediction-rollback) - Rollback overhead and visual glitches

**Animation & Input Systems:**
- [Animation Lock | XIV Dev Wiki](https://xiv.dev/game-internals/actions/animation-lock) - Animation lock mechanics
- [Animation canceling in pvp - Homecoming](https://forums.homecomingservers.com/topic/21727-animation-canceling-and-how-its-exploited-in-pvp/) - Animation cancel exploits
- [Ability Queue System - GAS Companion](https://gascompanion.github.io/ability-queue-system/) - Input buffering implementation

**Equipment & Resource Systems:**
- [Attribute swapping · Issue #13588 · PaperMC/Paper](https://github.com/PaperMC/Paper/issues/13588) - Equipment swap exploits (2026)
- [Mana Regen Bug - Titan Quest II](https://steamcommunity.com/app/1154030/discussions/2/591779267908571790/) - Energy regen desync (2026)

**Buff/Debuff Systems:**
- [Timers on buffs - GameDev.net](https://gamedev.net/forums/topic/496780-timers-on-buffs---server-or-client-timer/) - Duration tracking
- [Client/server clock sync - GameDev.net](https://www.gamedev.net/forums/topic/707830-clientserver-clock-sync-issue-confirmation-and-solutions/) - Clock drift
- [Arena Breakout Desync Fix 2026](https://news.bittopup.com/news/arena-breakout-desync-fix-2026-audio-network-guide) - Server tick desync (2026)
- [Buffs and debuffs stacking · Issue #7667 · TrinityCore](https://github.com/TrinityCore/TrinityCore/issues/7667) - Stacking bugs

**Player Experience:**
- [Action Mode feedback - Ashes of Creation](https://forums.ashesofcreation.com/discussion/63204/feedback-action-mode-auto-attack-vs-manual-click-and-more) - Auto-attack vs manual
- [Game Progression Systems](https://gamedesignskills.com/game-design/game-progression/) - Learning curve management
- [Mobile Retention Trends 2026](https://blog.playio.co/mobile-retention-trends-2026) - Player retention

**Performance & Anti-Cheat:**
- [Game Server Optimization - FasterCapital](https://fastercapital.com/services/Game-Server-Optimization.html) - Resource optimization
- [Anti-Spam - Grief Prevention](https://dev.bukkit.org/projects/grief-prevention/pages/how-anti-spam-works) - Rate limiting
- [Cheating in online games - Wikipedia](https://en.wikipedia.org/wiki/Cheating_in_online_games) - Server validation

---

## Confidence Assessment

**Overall confidence:** MEDIUM

| Area | Confidence | Rationale |
|------|------------|-----------|
| Client prediction pitfalls | HIGH | Well-documented in GAS documentation and Unity netcode guides |
| Equipment swap issues | HIGH | Recent 2026 Minecraft bug report provides concrete example |
| Energy regen desync | HIGH | Titan Quest II 2026 bug report documents exact issue |
| Buff duration sync | MEDIUM | Gamedev forums + theoretical knowledge, sparse 2026 data |
| Animation exploits | MEDIUM | Historical evidence from multiple games, ongoing issue |
| Rollback overhead | MEDIUM | Technical documentation available, game-specific impact varies |
| Target validation | MEDIUM | General anti-cheat knowledge, not ability-system-specific |
| Learning curve | MEDIUM | Mobile gaming research + game design theory, not ability-specific |
| Performance at scale | LOW | General optimization knowledge, no 2D MMO ability benchmarks |

**Methodology:** Searched for 2026-specific examples, cross-referenced multiple sources for critical pitfalls, prioritized multiplayer-specific issues, emphasized server-authoritative patterns.

**Gaps:** Limited 2D-specific ability system case studies, few post-mortems about ability system migrations, performance benchmarks cloud gaming focused not MMO focused, no direct Socket.IO + ability system references.

---
*Pitfalls research for: Active Combat Ability System (replacing auto-attack in 2D MMO)*
*Researched: 2026-02-20*
