# Pitfalls Research

**Domain:** Multiplayer 2D Isometric MMO — Movement System Overhaul
**Researched:** 2026-02-17
**Confidence:** HIGH

---

> This file covers three milestone areas: (1) Movement System Overhaul pitfalls, (2) Infinite World Chunk Streaming pitfalls, and (3) Inventory & Items System pitfalls (added 2026-02-17). All are relevant to Into the Void's active development.

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
The 140ms rate limit (`game.gateway.ts:133`) was calibrated to prevent speed hacking in tile mode. Smooth movement requires either: (a) a much shorter rate limit with continuous position updates, or (b) a velocity/intent-based protocol where client sends "I started moving NE" and "I stopped moving" rather than per-tile events. The existing protocol has no concept of "movement intent" — only discrete tile steps.

**How to avoid:**
- Switch to velocity/intent protocol: `{ intent: 'start' | 'stop', direction: Direction, timestamp: number }` with server simulating movement continuously at a tick rate.
- OR keep tile protocol but increase tick rate: 8 tiles/sec requires 125ms interval (not 500ms in client, 140ms server tolerance).
- Do NOT reduce server rate limit below network round-trip time (typically 50-200ms) — this causes reconciliation thrashing.
- The server must run its own movement simulation loop (e.g., 20 ticks/sec) separate from WebSocket message handling.
- Update `PathfindingController.moveDelay` to match new server tick rate.

**Warning signs:**
- Console flooding with `MOVEMENT_BLOCKED` errors during WASD hold
- Player sprite visibly "rubber-bands" every 140ms during smooth movement
- `pendingInputs` array grows unbounded (hitting the `> 10` safety check constantly)
- Network tab shows many rejected 400-level game events

**Phase to address:**
Movement Foundation phase — Server tick architecture must be decided before any client movement changes.

---

### Pitfall 3: Client Prediction and Server Reconciliation Desync with Variable-Distance Moves

**What goes wrong:**
The current reconciliation in `MovementController.reconcile()` replays `PendingInput` list by re-calling `calculateNewPosition(position, direction)` for each unacknowledged input. This works correctly when every input moves exactly 1 tile. If smooth movement introduces variable-distance moves (e.g., movement that takes 0.5 tiles/frame), replaying by direction enum becomes wrong — the same direction input on replay produces 1-tile moves even if the original produced fractional moves.

**Why it happens:**
`calculateNewPosition` in `game-logic/validation.ts` always moves exactly 1 tile in the direction. There is no concept of "movement duration" or "movement speed" in the pending input. If the transition is to continuous movement where position is a float coordinate, the entire prediction/reconciliation loop must change — inputs must store velocity and duration, not just direction.

**How to avoid:**
- If staying with tile model: Keep direction-only inputs. Prediction/reconciliation is already correct for this model.
- If moving to continuous model: `PendingInput` must store `{ velocity: Vector2, duration: number, sequence: number }`, not just direction.
- Server acknowledgment must include `{ serverPosition: { x: float, y: float }, lastProcessedInput: number }`.
- Client reconciliation must integrate velocity * duration for unacknowledged inputs, not just call `calculateNewPosition`.
- Consider: Gabriel Gambetta's reconciliation model requires server simulation to exactly match client simulation — any difference in physics step size, floating point precision, or order of operations causes permanent drift.

**Warning signs:**
- After any server correction, player position drifts progressively further from server
- `positionMismatch` fires on every server update even when player is stationary
- Players report "teleporting" during heavy input or lag spikes
- Reconciled position differs from expected by more than 1 tile

**Phase to address:**
Movement Foundation phase — Define movement model first. Prediction/reconciliation refactor is a single atomic unit that must not be done piecemeal.

---

### Pitfall 4: Pathfinding System Breaks Silently with New Movement Model

**What goes wrong:**
`PathfindingController` uses `findPath()` from `game-logic/pathfinding.ts`, which generates cardinal-only A* paths (N/S/E/W directions only — the `directions` array excludes diagonals). `getDirection()` can return diagonal directions (NE/NW/SE/SW) but the A* never produces paths requiring them. If movement model changes to 8-directional, A* paths are suboptimal (longer routes). If movement changes to free/continuous, A* produces tile-center waypoints that the movement system must lerp between — the `executeNextStep` setTimeout pattern will break for continuous physics.

Additionally, `PathfindingController.startPath()` calls `useGameStore.getState().player.position` at the time of the click — if player position has a pending unreconciled prediction, pathfinding starts from wrong position.

**Why it happens:**
Pathfinding is decoupled from movement protocol. It generates a list of `{x, y}` tile coordinates and relies on `movementController.processInput(direction)` at fixed intervals. This coupling assumes: (a) movement is always tile-to-tile, (b) each step completes in exactly `moveDelay` ms, (c) player position at step N is always the predicted position from step N-1.

**How to avoid:**
- Enable diagonal pathfinding in `findPath()` if 8-directional movement is added (add `{dx:1,dy:-1}` etc. to `directions` array with proper cost: `Math.SQRT2` not `1`).
- If switching to continuous movement: Replace step-by-step pathfinding with a waypoint system. Movement controller lerps toward next waypoint, pathfinding controller feeds next waypoint when player arrives within threshold distance.
- Always read player position from server-confirmed state (not predicted) when starting a path. Add `confirmedPosition` field to player state separate from `predictedPosition`.
- Pathfinding must be recalculated when server rejects movement (reconciliation correction > 0.5 tiles should cancel active path).

**Warning signs:**
- Click-to-move paths are longer than expected for diagonal travel
- Pathfinding starts from wrong position after lag spike
- Player "oscillates" at the end of a path (missing final tile, re-pathing repeatedly)
- `executeNextStep` fires but player hasn't reached the previous waypoint yet

**Phase to address:**
Movement Polish phase — After core movement model is stable. Pathfinding update must wait for confirmed movement model.

---

### Pitfall 5: Zone Transition Prediction Creates Collision Map Desync

**What goes wrong:**
`MovementController.processInput()` skips collision checks for zone transitions (`if (newPos.zoneId === player.position.zoneId)` condition). This was intentional: the client doesn't have collision data for adjacent zones at prediction time. When smooth/8-directional movement is added, players near zone boundaries will predict movement into the adjacent zone without local collision validation. Server may reject (blocked terrain in adjacent zone), causing rubber-band at every zone edge crossing.

Additionally, `setCollisionMap()` in `WorldScene` only sets collision for the current zone. When player crosses into a new zone, the collision map isn't updated until `onPlayerZoneChanged` is called — a server round-trip. During this window, all client collision checks use stale data.

**Why it happens:**
The tile-step system hides this bug: players rarely cross zone boundaries mid-animation because movement is discrete. Smooth movement makes the zone boundary a continuous region where the player's visual position is in zone B while the game state is still in zone A, creating a wide desync window.

**How to avoid:**
- Pre-load adjacent zone collision maps when player is within 3 tiles of zone boundary. ChunkManager already pre-loads adjacent zone geometry — add collision map extraction.
- `MovementController` should validate cross-zone moves against the pre-loaded adjacent collision map.
- Zone transition should be committed on server confirmation, not on client prediction.
- Add a `borderBuffer` zone concept: tiles 0-3 and 61-63 (near zone edge for ZONE_SIZE=64) trigger adjacent zone collision pre-fetch.

**Warning signs:**
- Players rubber-band specifically at zone boundary edges, not in zone interior
- Console shows `setCollisionMap` called after player has already moved several tiles into new zone
- Server returns `MOVEMENT_BLOCKED` for positions that appear empty on client minimap

**Phase to address:**
Movement Foundation phase — Zone transition logic is tightly coupled with collision validation and must be addressed as part of the movement model change.

---

### Pitfall 6: Isometric Keyboard Mapping Confusion When Adding Diagonal Movement

**What goes wrong:**
The current keyboard map (W=NW, D=NE, S=SE, A=SW) is a visual-screen mapping: pressing "up" moves the player visually upward on screen (NW in grid). This is the correct isometric convention. However, if 8-directional movement is added and developers map diagonal keys (Q/E/Z/C or W+D combinations) without maintaining this visual convention, the movement feels inconsistent: some directions are "screen-relative", others are "grid-relative".

Additionally, simultaneous key combinations (W+D = NE in screen coords = N in grid coords) must be detected and their grid equivalents calculated. The current implementation reads single keys only (line 440-443 in WorldScene).

**Why it happens:**
Adding diagonal keys seems simple — just add `if (W && D) direction = 'n'` — but the mapping becomes non-obvious to players. The existing single-key visual mapping is intuitive; the 8-directional extension requires careful thought about which combinations map to which visual directions.

**How to avoid:**
- Maintain visual-screen convention for ALL 8 directions: W+D = visual NE = grid N, A+W = visual NW = grid W.
- Read simultaneous key state in `update()`, not `keydown` events. The current `handleInput()` approach reads `isDown` which correctly handles simultaneous keys.
- Priority order for diagonal: diagonal key combos take precedence over single keys, to avoid "flickering" between NW and W when player taps W while A is held.
- Test: press W, then add D while W is held — player should smoothly transition to combined direction without losing W direction first.
- In isometric, diagonal movement maps to cardinal directions — verify `DIRECTION_VECTORS` comment in `validation.ts` is updated to reflect the new visual/grid relationship.

**Warning signs:**
- Players report "wrong direction" for certain key combinations
- Diagonal movement feels slower/different from expected
- Path visualization (green diamond) appears in wrong tile when moving diagonally

**Phase to address:**
Input Handling phase — Isolated to client only, but must be consistent with server-side direction enum from the start.

---

### Pitfall 7: Animation System Must Track Direction State Separately from Position

**What goes wrong:**
Adding directional movement requires directional sprite animations (player faces NE when moving NE). The current system has a single `player` sprite with no direction state. If movement direction is derived from position delta (current position minus previous position) rather than from input, the sprite direction will lag by one frame, and "slide-to-stop" animations will show wrong facing direction on final frame.

For remote players, `movePlayer()` in WorldScene only receives `{ playerId, position }` — no direction. Remote players can never show correct facing direction without a protocol change to send direction alongside position.

**Why it happens:**
The current protocol (`player:moved: { playerId, position, lastProcessedInput? }`) was designed for position-only reconciliation. Direction state was never part of the contract because tile movement's direction was implicit from previous/current position delta. When multiple animations exist per direction (idle-N, walk-N, idle-NE, walk-NE...), the position delta approach produces visible glitches during reconciliation corrections.

**How to avoid:**
- Add `direction: Direction` to the `player:moved` server event in `ServerEvents` interface.
- Store last movement direction in `MovementController` and include it in position updates.
- Animate based on input direction, not position delta. Input direction is known before position changes.
- Use a separate "facing direction" that updates on input but doesn't reset to idle until movement stops for N frames (prevents rapid idle→walk flicker during slow moves).
- Keep a separate `idleDirection` state: when movement stops, hold the last movement direction for idle animation.

**Warning signs:**
- Remote players always face the same direction regardless of movement
- Player sprite shows brief "wrong direction" frame during reconciliation corrections
- Direction resets to default (south) when any server correction occurs
- Smooth camera follow causes player to appear to slide forward after stopping

**Phase to address:**
Animation & Polish phase — After movement protocol is stable. Do NOT add direction to protocol before confirming final movement model.

---

### Pitfall 8: Speed Hack Surface Area Increases Significantly with Smooth Movement

**What goes wrong:**
The current anti-cheat is simple: `if (now - lastMoveTime < 140) reject`. For continuous movement, there is no simple "minimum time between moves" — instead, position drift must be validated. The server must check: "is this position reachable from the last confirmed position in the elapsed time, given the player's speed?" This is significantly harder and has well-known edge cases.

Tolerance windows (10-15% speed tolerance to handle network jitter) create a cheat surface: players can exploit the tolerance to gain 10-15% movement speed advantage by manipulating timestamps or sending inputs slightly faster than allowed.

**Why it happens:**
Tile movement has a binary anti-cheat: correct distance (1 tile) or not. Continuous movement requires a range check. The range must account for: network latency (player moved during in-flight time), server tick jitter, and legitimate lag spikes. Any range-based check has a threshold that determined cheaters will probe.

**How to avoid:**
- Validate using server-simulated position, not client-reported position. Server runs its own movement simulation; client input just changes velocity direction.
- Never trust client-provided position for authoritative state. The server's simulation IS the position.
- Rate limit direction changes (not position updates): e.g., max 10 direction changes per second, not 60.
- For tile-based 8-directional (staying in current model): keep binary anti-cheat. Minimum 197ms for diagonal moves (140ms * sqrt(2)), 140ms for cardinal moves.
- Log anomalous movement patterns server-side: > 5 consecutive max-speed moves in a straight line warrants scrutiny.

**Warning signs:**
- Players report others moving noticeably faster than themselves
- Server logs show many moves at exactly the minimum tolerance threshold (140ms or 197ms)
- Teleportation hacks: player position jumps > 2 tiles per server tick (easy to detect with absolute position validation)

**Phase to address:**
Movement Foundation phase — Anti-cheat must be re-evaluated whenever the movement model changes. Do not ship new movement model without updated server validation.

---

## Technical Debt Patterns (Movement-Specific)

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep direction-enum protocol for smooth movement | No server-side changes | Latency visible as stutter at network-limited fps | Only if target move speed is <= 4 tiles/sec |
| Derive animation direction from position delta | No protocol changes | 1-frame lag on direction change, wrong direction on corrections | Never for responsive action games |
| Single collision map for current zone only | No adjacent zone pre-fetch | Rubber-band at every zone boundary with smooth movement | Only if zone boundaries are rare/explicit |
| Same rate limit for cardinal and diagonal | Simpler server logic | 41% speed advantage for diagonal movement | Never in competitive or PvP contexts |
| Client-authoritative position for smooth display | Zero latency feel | Speed hacks trivially effective | Single-player only, never multiplayer |
| Pathfinding without diagonal support | Simpler A* code | Suboptimal paths, unnatural-looking movement | MVP only, replace before any PvP feature |
| Hard-code `moveDelay` as constant | Easy to tune | Cannot vary speed by terrain, status effects, faction | Until speed modifiers are needed |

---

## Integration Gotchas (Movement-Specific)

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Phaser tweens + prediction | Tweens complete asynchronously; new prediction fires before tween finishes, causing double-move visual | Kill tween before applying new prediction position; use `tweens.killTweensOf(target)` |
| Camera follow + reconciliation | Camera follows predicted position; server correction causes camera snap, not smooth correction | Camera follows server-confirmed position with lerp; predicted position is sprite-only offset |
| Socket.IO + high-frequency moves | TCP nagle algorithm batches small packets; creates burst delivery of 3-5 queued moves at once | Enable `socket.setNoDelay(true)` (already done via Socket.IO defaults), but also buffer server-side |
| PathfindingController + reconciliation | Pathfinding reads `player.position` from Zustand (predicted); reconciliation corrects position; pathfinding re-reads stale position | Cancel active path whenever server reconciliation fires a position correction |
| Rate limiter + diagonal | Single rate limit applied to all 8 directions causes 41% diagonal speed advantage | Two rate limits: `cardinalDelay = 140ms`, `diagonalDelay = Math.round(140 * Math.SQRT2)ms` |
| `DIRECTION_VECTORS` + world distance | Vectors `(1,1)` for diagonal are grid-unit, not world-unit | Normalize diagonal vectors before applying world-distance checks |

---

## Performance Traps (Movement-Specific)

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Pending inputs array grows unbounded at high latency | Memory creep, reconciliation replays wrong inputs | Hard cap at 10-20 inputs (already implemented), but also discard inputs older than 2s | 200ms+ latency with rapid input |
| `useGameStore.getState()` called every input frame | Zustand store subscription overhead under rapid input | Batch position updates, only update store when position actually changes | >30 inputs/sec |
| Full collision map scan per movement validation | O(n) scan on 64x64 grid = 4096 checks per move | Already uses direct index lookup `collisionMap[y][x]` — maintain this pattern | Not a current issue, maintain pattern |
| Tween queue buildup for remote players | Remote players teleport when tweens cannot keep up with server update rate | Kill previous tween before starting new one (already in `movePlayer()`) | >5 position updates/sec for remote player |
| Path visualization redraws every pathfind step | Graphics object clear+redraw causes frame spike | Current implementation only draws destination marker — maintain this | Only draw final destination, not full path |

---

## Security Mistakes (Movement-Specific)

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client position for adjacency checks (interaction, combat) | Player warps to interact with entity 50 tiles away | Server validates `distance(player.position, target.position) <= interactionRange` using server position |
| Rate limit based on server receive time, not client timestamp | Network jitter allows burst of 3 moves in 50ms then none for 300ms | Use server-side move timestamps with rolling window, not last-receive-time delta |
| No upper bound on movement distance per message | Malicious client sends `{direction:'ne'}` 100 times in 1 packet (if batching added) | Validate: max 1 direction per `player:move` message; reject arrays |
| Logging player positions to console in production | Information leak about zone structure, collision positions | Remove `console.log` from movement handlers before production |
| No validation that `direction` is a valid `Direction` enum value | Client sends `direction: 'hack'`, crashes server-side `DIRECTION_VECTORS['hack']` | Use `if (!DIRECTION_VECTORS[data.direction]) reject` before processing |

---

## UX Pitfalls (Movement-Specific)

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Player sprite doesn't face movement direction | Feels unresponsive, "gliding" movement | Add directional sprites/animations; update facing on input, not on position |
| Reconciliation correction causes camera jerk | Motion sickness, disorientation | Camera follows confirmed position with 0.1-0.2 lerp factor; sprite snaps |
| Pathfinding cancels on any server move event | Click-to-move feels broken during lag | Only cancel path if reconciliation moves player > 1 tile from predicted |
| No visual feedback when movement is blocked | Pressing keys does nothing, players think game is frozen | Show "bump" animation on blocked move; red flash on collision tile |
| Diagonal movement feels faster to the player | Exploitation of speed advantage; immersion break | Ensure diagonal visual speed matches cardinal speed (normalize) |
| Click-to-move path disappears on pathfind failure | No indication path failed | Show brief "X" marker at destination if pathfind fails |
| Zone transition stutters player movement | Teleport-like effect at every chunk border | Pre-load adjacent chunk data; smooth zone transition with position continuity |

---

## "Looks Done But Isn't" Checklist (Movement-Specific)

- [ ] **8-directional movement works**: But did you verify diagonal speed equals cardinal speed? Measure tiles/second for N vs NE over 10 seconds.
- [ ] **Smooth movement renders**: But does server reconciliation produce rubber-band under 150ms simulated latency? Test with `Chrome DevTools -> Network -> Add latency`.
- [ ] **Pathfinding produces valid paths**: But does pathfinding use diagonal-capable A*? Count path steps for NE destination — should be ~sqrt(2)x fewer steps than cardinal path.
- [ ] **Zone transition works**: But does it work for diagonal zone transitions (corner crossings)? Move NE through zone corner, verify both zone offsets update correctly in `calculateNewPosition`.
- [ ] **Direction-based animation plays**: But does it play correct direction when movement is stopped by collision? Bump north wall, verify player faces north.
- [ ] **Anti-cheat validates correctly**: But does the rate limit account for diagonal cost? Test: hold NE at maximum speed for 10 seconds, verify server does not reject any valid moves.
- [ ] **Remote players move smoothly**: But do they show correct facing direction? Ask another client to move SE while you watch — their sprite should face SE.
- [ ] **Pathfinding + prediction coexist**: Cancel active path, move with WASD — does pathfinding correctly cancel and not resume on next WASD release?

---

## Recovery Strategies (Movement-Specific)

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Diagonal speed advantage shipped | MEDIUM | Server-side hotfix: add diagonal rate limit (197ms), clients see smooth fix on next server restart |
| Protocol changed without updating pathfinding | HIGH | Revert movement protocol, update pathfinding, re-test before re-releasing |
| Animation direction from position delta | LOW | Add direction field to move events, update `player:moved` and `ServerEvents` types |
| Zone boundary collision desync | MEDIUM | Pre-load adjacent collision maps (ChunkManager already loads adjacent chunks — extract collisions) |
| Rate limit too strict for smooth movement | LOW | Adjust server constant, redeploy; no client changes needed |
| Reconciliation loop produces drift | HIGH | Usually requires full prediction/reconciliation rewrite; cannot be patched incrementally |

---

## Pitfall-to-Phase Mapping (Movement-Specific)

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Diagonal speed advantage | Movement Foundation | Measure tiles/sec: cardinal vs diagonal must be within 5% |
| Rate limit incompatible with smooth movement | Movement Foundation | Hold WASD for 5s: zero MOVEMENT_BLOCKED errors in console |
| Prediction/reconciliation desync with variable moves | Movement Foundation | Simulate 300ms latency: position error < 0.5 tiles after correction |
| Pathfinding breaks with new model | Movement Polish | Click-to-move across full zone: path completes without cancellation |
| Zone transition collision desync | Movement Foundation | Cross zone boundary diagonally: no rubber-band, movement continues |
| Isometric keyboard mapping confusion | Input Handling | Blind playtest: 5 players, 0 direction confusion reports |
| Animation tracks wrong direction | Animation & Polish | Server correction: sprite faces correct direction 100% of the time |
| Speed hack surface area increases | Movement Foundation | Server validates: no client can exceed max speed by > 5% |

---

## Sources (Movement Research)

- [Fast-Paced Multiplayer: Client-Side Prediction - Gabriel Gambetta](https://www.gabrielgambetta.com/client-side-prediction-live-demo.html) — HIGH confidence, canonical source on prediction/reconciliation
- [Source Multiplayer Networking - Valve Developer Community](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking) — HIGH confidence, production-proven techniques
- [How to Fix Diagonal Movement in 2D Top-Down Games](https://jslegenddev.substack.com/p/how-to-fix-diagonal-movement-in-2d) — MEDIUM confidence, community source verified against math
- [Server Authoritative Movement Questions - GameDev.net](https://gamedev.net/forums/topic/706590-server-authoritative-movement-questions/) — MEDIUM confidence, practitioner discussion
- [MMO Movement System - GameDev.net](https://www.gamedev.net/forums/topic/710824-mmo-movement-system/) — MEDIUM confidence, MMO-specific context
- [UDP Multiplayer Movement Jitter - GameDev.net](https://gamedev.net/forums/topic/661334-udp-multiplayer-movement-jitter/) — MEDIUM confidence
- [Mirror Networking: Client-Side Prediction](https://mirror-networking.gitbook.io/docs/manual/general/client-side-prediction) — MEDIUM confidence
- [Server-side Movement Anti-Cheat - Roblox Forum](https://devforum.roblox.com/t/server-side-movement-is-it-a-viable-anti-cheat-option/2685020) — MEDIUM confidence

**Codebase analysis (HIGH confidence — direct inspection):**
- `apps/web/src/game/systems/MovementController.ts` — prediction/reconciliation loop
- `apps/web/src/game/systems/PathfindingController.ts` — A* execution, cardinal-only
- `apps/web/src/game/scenes/WorldScene.ts` — input handling, keyboard mapping, `moveDelay`
- `apps/game-server/src/game/game.gateway.ts` — rate limiting, `player:move` handler
- `packages/game-logic/src/movement/validation.ts` — `validateMovement`, `DIRECTION_VECTORS`
- `packages/game-logic/src/movement/pathfinding.ts` — A* algorithm, cardinal-only directions
- `packages/shared-types/src/network/events.ts` — protocol: `direction-only` move events

---

# Part 2: Infinite World Chunk Streaming Pitfalls

**Domain:** Infinite World Chunk Streaming for Multiplayer 2D Tile-Based Game
**Researched:** 2026-02-16
**Confidence:** HIGH

---

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

## Technical Debt Patterns (Chunk Streaming)

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Client generates chunks instead of server sending all data | Massive bandwidth savings, instant chunk loads | Desync bugs, version mismatch issues, requires deterministic generation | Only if generation is provably deterministic and versioned |
| 3x3 chunk loading instead of viewport-based | Simple implementation, predictable memory usage | Loads chunks player can't see, wastes memory on corner chunks | MVP phase, replace with distance-based loading in Phase 4 |
| Single entity visibility range for all entity types | Simple code, consistent behavior | Can't have "large creatures visible from far" or "stealth mechanics" | Until gameplay requires varied visibility (Phase 5+) |
| Chunk-local collision maps instead of world-space collision | Each chunk self-contained, easy to cache | Cross-chunk collision checks fail, entities can't path across boundaries | Never acceptable for infinite world |
| Cache chunks client-side without expiration | Fast revisits, no re-download | Stale data after server updates, growing storage usage | Only with version-based invalidation |
| Broadcast all entity updates to all zone subscribers | Simple pub/sub, no targeting logic | Wastes bandwidth on entities outside player visibility | Until player count per zone exceeds ~20 |
| Synchronous chunk generation on main thread | Simple code, no threading complexity | 100-500ms freeze per chunk, visible stutter | Never for production, only early prototype |

## Integration Gotchas (Chunk Streaming)

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

## Performance Traps (Chunk Streaming)

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Never unloading distant chunks | Memory grows linearly with exploration distance, eventual crash | Unload chunks >2 zone distance from player, destroy Phaser objects explicitly | ~100 chunks loaded (~500MB RAM) |
| Recalculating visibility every frame for all entities | Frame rate drops with entity count, spikes to 30fps with 50 entities | Cache visible entities, recalculate only on movement or every 500ms | >50 entities in 3x3 chunk area |
| Generating chunks on main thread | Frame freeze during generation (100-500ms), visible stutter | Use Web Workers for generation, async/await, or pre-generate neighboring chunks | Always noticeable to players |
| Broadcasting entity updates to all zone players | Bandwidth scales O(n²) with players per zone | Filter updates by visibility range, use spatial indexing | >10 players in same zone |
| Loading all 9 chunks synchronously | Multi-second freeze on zone transition | Priority queue: load current chunk first, then adjacent, async/batched | Always with 3x3 loading |
| No chunk request debouncing | Server floods with duplicate requests | Debounce requests: ignore duplicates within 500ms window | Rapid player movement near boundaries |
| Unbounded server chunk cache | Server memory grows until crash | LRU cache with max size (500 chunks), aggressive cleanup policy | >100 concurrent players exploring |

## Security Mistakes (Chunk Streaming)

| Mistake | Risk | Prevention |
|---------|------|------------|
| Client controls chunk load requests without rate limiting | Malicious client floods server with chunk requests, DoS attack | Rate limit to 10 chunks/second per client, track request patterns |
| Trusting client-generated collision data | Cheating: client generates "no collision" chunks, walks through walls | Server is source of truth for collision, validates all movement |
| No validation of chunk coordinates | Client requests chunk at extreme coords (999999, 999999), integer overflow, crash | Validate coords are within bounds (-10000 to 10000), reject invalid |
| Exposing world seed to client | Player reverse-engineers generation, predicts resource locations, unfair advantage | Only if generation is public knowledge; otherwise keep seed server-side |
| No chunk data size limits | Malicious mod generates chunks with 1M entities, crashes other clients | Validate chunk size before broadcast, limit entities to 100 per chunk |
| Client can request any chunk | Map revelation exploit: client requests all chunks, reveals entire map | Only allow requests for chunks within N distance of player position |

## UX Pitfalls (Chunk Streaming)

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading indicator for chunks | Player walks to chunk edge, sees void, doesn't know if loading or bug | Show "Loading..." overlay on pending chunks, gray-out tiles |
| Chunks pop in instantly | Jarring visual, breaks immersion | Fade-in animation (300ms), or fog-of-war reveal |
| Hard edges on biome transitions | World looks artificial, grid structure obvious | 3-5 tile transition zone with blended terrain, noise-based boundaries |
| Entities disappear at chunk boundaries | Feels like bug, breaks combat immersion | Extend visibility across chunk boundaries, fade-out instead of instant removal |
| No feedback when movement denied at chunk edge | Player presses move, nothing happens, frustrating | Show collision indicator, play "bump" sound, visual feedback |
| Minimap shows unloaded chunks as black | Looks broken, player thinks game is buggy | Show as fog/unexplored, different from void biome |
| Chunk loading during combat | Enemy disappears mid-fight, feels unfair | Pre-load chunks in combat zones, increase load radius during combat |

## "Looks Done But Isn't" Checklist (Chunk Streaming)

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

## Recovery Strategies (Chunk Streaming)

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

## Pitfall-to-Phase Mapping (Chunk Streaming)

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

## Sources (Chunk Streaming Research)

- [How to Handle Real-Time Synchronization in a Large Multiplayer World](https://vocal.media/gamers/how-to-handle-real-time-synchronization-in-a-large-multiplayer-world)
- [Multiplayer Game Development Basics: Networking, Matchmaking, and Sync](https://medium.com/coinmonks/multiplayer-game-development-basics-networking-matchmaking-and-sync-6b4b8b117dde)
- [Lag Spikes - Procedural Chunk-based 2D Tilemap World Generation](https://discussions.unity.com/t/lag-spikes-procedural-chunk-based-2d-tilemap-world-generation-w-advanced-rule-tiles-on-the-fly/900130)
- [Client-Side Prediction and Server Reconciliation - Gabriel Gambetta](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)
- [Rooms | Socket.IO](https://socket.io/docs/v3/rooms/)

---

# Part 3: Inventory & Items System Pitfalls

**Domain:** Multiplayer 2D Isometric MMO — Inventory & Items System
**Researched:** 2026-02-17
**Confidence:** HIGH

**Scope:** Adding 100 items, inventory management, equipment slots, and action bar hotkeys to an existing multiplayer game with client-side prediction, WebSocket real-time sync, PostgreSQL persistence, and React/Phaser UI.

**Current system (from codebase analysis):**
- Schema: `inventories` table with single character as PK, `items` stored as JSONB array, `equipment` as JSONB object — no row-level locking on inventory operations
- Query pattern: `updateInventoryItems` and `updateEquipment` are separate functions — two DB writes for equip operations, not atomic
- Network: `inventory:update` event sends full `Inventory` object to client; `inventory:use`, `inventory:drop`, `inventory:pickup` are defined in `ClientEvents` but not yet implemented in `game.gateway.ts`
- State: `gameStore.ts` has no inventory state; `showInventory` toggle exists but no inventory data in store
- Item pickup: `handleInteraction` in `game.service.ts` sets `entity.active = false` with no actual inventory insertion — item is lost to the void
- Entity: `ItemEntity` type exists with `itemId`, `quantity`, `despawnAt` but no claim/lock mechanism

---

## Critical Pitfalls

### Pitfall 1: Item Duplication via Non-Atomic Equip Operation

**What goes wrong:**
The current `updateInventoryItems` and `updateEquipment` are separate database calls, not wrapped in a transaction. When a player equips an item, the operation should atomically: (1) remove item from inventory slots, (2) add item to equipment slot, (3) move previously equipped item to inventory. If the server crashes or the connection drops between these two DB writes, the item exists in both the inventory array AND the equipment slot simultaneously. On reconnect, the client receives the full inventory state with the duplicated item.

This is the most common class of MMO duplication exploit — the "pack then cancel" pattern documented across many shipped MMOs. Arc Raiders shipped with exactly this bug in February 2026.

**Why it happens:**
JSONB storage stores inventory and equipment as separate columns on the same row. Drizzle ORM's `update` calls are not automatically transactional. Developers write `await updateInventoryItems(...)` followed by `await updateEquipment(...)` assuming Node.js single-thread protects against interleaving — it does not, because `await` yields to the event loop between writes.

**How to avoid:**
- Wrap ALL inventory mutation operations in a single PostgreSQL transaction using Drizzle's `db.transaction(async (tx) => { ... })` API.
- Equip operations must update BOTH `items` and `equipment` columns in a single `UPDATE inventories SET items = $1, equipment = $2 WHERE character_id = $3` call.
- Never call `updateInventoryItems` and `updateEquipment` as separate awaited operations. Create a single `updateInventoryFull(characterId, { items, equipment })` function that performs one atomic DB write.
- Verify: after equip, `SELECT items, equipment FROM inventories WHERE character_id = $1` — the item must appear in exactly one of the two columns, never both.

**Warning signs:**
- Player reports having the same item in both inventory and equipment simultaneously
- Item count in inventory row doesn't match expected count after equip operation
- Console shows two sequential `UPDATE inventories` queries for a single equip action
- On reconnect after crash, inventory has items that should have been consumed

**Phase to address:**
Phase 1: Item Data Model & Basic Inventory — Atomic writes must be established before any inventory operations are implemented.

---

### Pitfall 2: Simultaneous Pickup Race Condition Duplicates World Items

**What goes wrong:**
Two players stand adjacent to a ground item (an `ItemEntity` in the zone). Both press interact at the same time. Both clients send `inventory:pickup { entityId }` to the server within the same event loop tick. The server processes both messages: the first player picks up the item (sets `entity.active = false`, inserts into inventory). The second player's message arrives, checks `entity.active` — but the check and the update are not in a transaction. The entity was set inactive in the first player's handler, but the second player's handler already read the entity before the first write committed. Both players receive the item.

**Why it happens:**
Node.js event loop is single-threaded but `await` yields. The sequence is: (1) Player A sends pickup, (2) Player B sends pickup, (3) Handler A reads entity (active=true), (4) Handler A `await`s DB update, (5) Handler B reads entity (still active=true, A's write hasn't committed), (6) Handler A DB write completes, (7) Handler B DB write completes. Both handlers saw `active=true`.

**How to avoid:**
- Use PostgreSQL `FOR UPDATE` row locking on the entity row: `SELECT * FROM entities WHERE id = $1 FOR UPDATE NOWAIT`.
- Or use an in-memory claim map in `ZonesService`: `Map<entityId, playerId>` that is set synchronously (not async) before awaiting the DB write. Check the claim map before the DB lock.
- The claim map approach works because Node.js is single-threaded — the synchronous check+set cannot be interleaved. Pattern: `if (this.claimedItems.has(entityId)) return { success: false, error: 'Already taken' }; this.claimedItems.set(entityId, playerId); await db.update(...)`.
- Remove the claim after DB write completes (success or failure).
- Verify: simulate two simultaneous pickup requests in a test — only one player should receive the item.

**Warning signs:**
- Two players both receive "item picked up" notification for the same entity
- Item entity count in zone doesn't match expected (entity active=false but item in two inventories)
- DB logs show two `UPDATE entities SET active = false` for the same entity ID within the same millisecond
- Players report "item appeared in my inventory and also in my party member's inventory"

**Phase to address:**
Phase 2: Item Pickup & World Items — The claim mechanism must be designed before world item entities are implemented.

---

### Pitfall 3: Full Inventory State Broadcast Leaks Other Players' Inventories

**What goes wrong:**
The `inventory:update` server event sends the full `Inventory` object. If a developer accidentally broadcasts this to the zone room instead of emitting to only the owning player's socket, every player in the zone sees every other player's complete inventory. This is a privacy/security breach and an information exploit (knowing enemy equipment before a fight).

The current `ClientEvents` has `inventory:pickup` which triggers `player:interact`, which calls `this.server.to(result.zoneId).emit('entity:update', ...)` — a zone-wide broadcast. If inventory update gets attached to this broadcast path by mistake, it goes to everyone.

**Why it happens:**
The `game.gateway.ts` uses both `this.server.to(zoneId).emit(...)` (zone broadcast) and `client.emit(...)` (private). All existing non-inventory events use zone broadcast. When a developer adds inventory handling by copy-pasting existing patterns, they will reach for `this.server.to(zoneId).emit('inventory:update', ...)` — which sends to everyone.

**How to avoid:**
- Inventory events MUST only use `client.emit('inventory:update', inventory)` — never `server.to(room).emit`.
- Add a lint rule or code review checklist: "inventory:update must only appear in `client.emit` calls."
- Separate the entity update (zone-wide: entity despawned) from the inventory update (private: item added to your bag). These are two different events: `server.to(zoneId).emit('entity:despawn', { entityId })` AND `client.emit('inventory:update', newInventory)`.
- In testing, connect two clients to the same zone. Perform a pickup on client A. Verify client B receives `entity:despawn` but does NOT receive `inventory:update`.

**Warning signs:**
- Other players' inventory UI populates when you pick up an item
- Network tab on client B shows `inventory:update` events that originated from client A's actions
- Console logs show inventory data for characters other than the logged-in character
- Players report knowing enemy equipment they shouldn't have visibility of

**Phase to address:**
Phase 2: Item Pickup & World Items — This pattern must be correct from the first inventory event implementation.

---

### Pitfall 4: Optimistic Inventory UI Desync Without Rollback

**What goes wrong:**
The client immediately updates the inventory UI when a player drags an item to a new slot (optimistic update), before the server confirms the operation. The server rejects the move (inventory full, item quest-locked, server validation fails). The client has already shown the item in the new slot. Without a rollback mechanism, the UI remains in the "optimistic" state — showing the item in the wrong slot — while the server has the item in the original slot. The next server `inventory:update` event snaps the UI back, causing a visible flash and confusion.

**Why it happens:**
The `gameStore.ts` currently has no inventory state. When inventory state is added, the temptation is to update the Zustand store immediately on user action (for responsiveness) and trust that the server will confirm. Without explicit rollback handling for the rejection case, the state remains wrong until the next full sync.

**How to avoid:**
- Use a two-state pattern: `pendingInventory` (optimistic) and `confirmedInventory` (server-confirmed). UI renders from `pendingInventory`; server `inventory:update` updates `confirmedInventory` and resolves or rejects the pending state.
- On server rejection (`error` event with inventory-related code), revert `pendingInventory` to `confirmedInventory`.
- Alternatively: don't optimistically update inventory UI for slow operations (equip, drop, move). Only optimistically update for fast operations where server rejection is extremely rare (consuming a consumable in combat).
- Never optimistically remove a unique/rare item from inventory — always wait for server confirmation before removing from UI.
- Test: simulate 300ms latency, drag item to new slot, immediately receive rejection. Verify item visually returns to original slot without flash.

**Warning signs:**
- Item appears in two slots simultaneously for a brief moment
- Item briefly disappears then reappears during lag spikes
- Player reports "I used my health kit but it came back" (pending state not resolved)
- Inventory count shows wrong number of items after rapid operations during lag

**Phase to address:**
Phase 3: Inventory UI & HUD — The state management pattern must be defined before any inventory UI is built.

---

### Pitfall 5: JSONB Inventory Array Grows Beyond TOAST Threshold

**What goes wrong:**
The `items` column is `jsonb` storing an array of `InventoryItem` objects. At 20 items with `properties: Record<string, unknown>` (potentially large for enchants, stats, history), the JSONB value easily exceeds PostgreSQL's TOAST threshold of ~2KB. Once a row's variable-length data exceeds this threshold, PostgreSQL silently moves it to the TOAST table. Every inventory read then requires an additional I/O operation to fetch the TOAST data. At high concurrency (many players saving inventory simultaneously), this causes a 2-10x query slowdown that is invisible until production load.

With 100 items defined and players collecting multiple copies of stackable materials, a full 20-slot inventory with per-item properties can easily reach 4-8KB — well above the TOAST cliff.

**Why it happens:**
JSONB's TOAST behavior is invisible during development (single developer, small data). The performance cliff only appears under production conditions: many concurrent reads/writes to the `inventories` table, all hitting the TOAST table for secondary lookups. pganalyze's 2025 analysis confirms the 2KB threshold is the critical breakpoint.

**How to avoid:**
- Keep `properties` objects minimal — store only deltas from item definition, not the full item data. An item with full durability needs no `durability` property at all; only record `properties: { durability: 45 }` if durability is below max.
- Consider normalizing frequently-updated fields: add `max_slots integer` as a direct column (already done) — extend this pattern to any inventory-level stats.
- Set a practical JSON size budget: target < 1.5KB total for the `items` column. At 20 slots x 75 bytes/item = 1.5KB.
- Monitor TOAST hits in production: `SELECT * FROM pg_stat_user_tables WHERE relname = 'inventories'` and watch `n_tup_fetch` vs `heap_blks_read`.
- For items with large variable properties (fully customizable weapons): consider a separate `item_instances` table with foreign key instead of embedding in JSONB.

**Warning signs:**
- Inventory load time increases disproportionately as players acquire more items
- `pg_stat_user_tables` shows high `heap_blks_read` ratio on `inventories` table
- Query time for `SELECT items FROM inventories WHERE character_id = $1` exceeds 5ms under load
- Server memory usage spikes when many players log in simultaneously (TOAST cache pressure)

**Phase to address:**
Phase 1: Item Data Model & Basic Inventory — JSONB size discipline must be enforced in the schema design, not retrofitted after data accumulates.

---

### Pitfall 6: Equipment Stat Calculation Applied on Client Causes Exploit Surface

**What goes wrong:**
When a player equips armor, their defense stat should increase. If the defense calculation (base stats + equipment bonuses) runs on the client and the result is sent to the server, a malicious client can claim arbitrary stat values. In an MMO with 100 items and equipment slots, the attack surface is every equippable item's stat bonus.

Even a "soft" exploit is possible: the client calculates stats correctly but delays reporting the unequip, so the server continues applying bonuses from a no-longer-equipped item.

**Why it happens:**
The `PlayerStats` interface exists in `shared-types/src/core/player.ts` but stats are stored on the player, not recalculated from equipment on demand. If stats are cached on the player object and the client sends stat updates, the server must trust them. The path of least resistance is "client calculates stats, sends to server" — which looks correct in single-player testing.

**How to avoid:**
- ALL stat calculations must run server-side, derived from the server's authoritative inventory state. Never trust client-provided stat values.
- The server calculates `effectiveStats(player, equipment)` on every relevant action (combat, interaction, movement speed). Never store derived stats — always derive them from source data.
- `PlayerStats` in the player object should be base stats only, unaffected by equipment. A separate `effectiveStats` function in `game-logic` computes the combined value.
- When `inventory:update` fires after equip, the server broadcasts updated `player` object with recalculated effective stats (or a separate `stats:update` event).
- Test: equip an item that grants +50 defense, verify server's combat resolution uses +50, not whatever the client claimed.

**Warning signs:**
- Players report dealing or receiving incorrect damage amounts after equipment changes
- Server-side combat results don't match client-side predictions by more than equipment delta
- Suspicious players with damage output exceeding max possible for their level/gear
- Stats don't change when equipment is swapped (server never recalculates)

**Phase to address:**
Phase 4: Equipment System — Before any stat-affecting equipment is implemented. Must establish the calculation pattern before the first stat item is added.

---

### Pitfall 7: Action Bar Hotkey State Diverges from Inventory State

**What goes wrong:**
A player assigns item slot 3 (a health kit) to hotkey 1 on the action bar. They then drop the health kit from slot 3. The action bar still shows hotkey 1 → slot 3. The player presses hotkey 1 in combat, the action bar sends `inventory:use { instanceId: 'kit-123' }`. The server rejects: item not found in inventory. The action bar UI still shows the item as if available. Player dies thinking they had a health kit.

**Why it happens:**
Action bar state is derived from inventory state but not synchronized when inventory changes. If the action bar tracks `{ hotkey: 1, slot: 3 }` (position-based) and inventory operations shift slot numbers or remove items, the mapping becomes stale. If the action bar tracks `{ hotkey: 1, instanceId: 'kit-123' }` (instance-based) and the instance is dropped, the action bar has a dangling reference.

**How to avoid:**
- Action bar should store `instanceId` references, not slot positions. Slot positions can change during rearrange operations; instance IDs are stable until item destruction.
- Inventory mutations must invalidate action bar references: when `inventory:update` fires with new inventory state, recompute which action bar slots are valid by checking if their referenced `instanceId` exists in the new inventory.
- Server-side: validate that the `instanceId` in `inventory:use` exists in the player's current inventory before processing. Never trust the action bar's reference as proof of ownership.
- Client-side: show action bar slots as "empty" (greyed out) when their `instanceId` is not found in current inventory state.
- Test: assign item to hotkey, drop item, press hotkey. Verify: server rejects use, client shows slot as empty, no crash.

**Warning signs:**
- Player presses hotkey and nothing happens but no error shown (action bar has stale reference)
- Server logs show `inventory:use` for instanceIds that don't exist in inventory
- Action bar shows items that the inventory panel doesn't show
- Using an item via hotkey succeeds but inventory count doesn't decrease (item lookup bug)

**Phase to address:**
Phase 5: Action Bar & Hotkeys — The instanceId-based reference model must be established in Phase 3's data model before the action bar is built.

---

### Pitfall 8: Inventory Update Event Flooding on Rapid Operations

**What goes wrong:**
Each inventory operation (use, drop, pickup, equip) emits a full `Inventory` object via `inventory:update`. At 20 slots with JSONB properties, a full inventory is ~2-4KB per message. In fast-paced play — a player rapidly consuming materials during crafting, or an action bar that triggers multiple items per second — the server emits a 3KB WebSocket message for each operation. At 10 operations/second, this is 30KB/s of inventory data to a single client, on top of all other game events.

The problem compounds if developers debounce on the client side but the server still generates full-state events for each operation — wasted server serialization work.

**Why it happens:**
Full-state sync (`inventory:update` sends entire inventory) is the simplest correct approach and works fine at low operation frequency. The pathological case is high-frequency inventory operations (crafting loops, auto-harvest systems) that developers add later without revisiting the sync strategy.

**How to avoid:**
- For high-frequency operations, use delta updates: `inventory:delta { added: [...], removed: [...instanceIds], modified: [...] }` instead of full state.
- Server-side: debounce inventory updates with a 100ms window. Multiple operations within 100ms are batched into a single `inventory:update` emit.
- Or use optimistic client updates for the happy path: client updates state locally, server sends `inventory:update` only on reject or as periodic re-sync (every 5s).
- Rate-limit `inventory:use` events server-side: maximum 5 inventory operations per second per player.
- Measure: log inventory event payload sizes in development. Alert if any single `inventory:update` exceeds 5KB.

**Warning signs:**
- Network tab shows repeated `inventory:update` messages within milliseconds of each other
- Server CPU spikes during crafting operations (JSON serialization of full inventory on each operation)
- Client inventory UI flickers rapidly during fast operations (re-render on each event)
- WebSocket backpressure warning in Socket.IO logs during bulk operations

**Phase to address:**
Phase 3: Inventory UI & HUD — The sync strategy must be chosen before the first inventory event is implemented.

---

## Technical Debt Patterns (Inventory-Specific)

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Separate `updateInventoryItems` and `updateEquipment` calls | Simple code, easy to test individually | Item duplication on crash between calls; not atomic | Never — always use a single transaction |
| Full inventory state on every event | Simple to implement, always consistent | 30KB/s at high operation frequency, client re-render thrashing | MVP only, replace with delta events before crafting systems |
| Client calculates equipment stat bonuses | Responsive UI, easy to preview | Exploit surface for stat manipulation; every new item adds attack surface | Never in multiplayer — always server-authoritative |
| Position-based action bar references | Simple slot tracking | Breaks on inventory sort/rearrange operations | Never — use instanceId references from day one |
| No claim mechanism for world items | Simpler pickup handler | Duplicate item exploits when two players pick up simultaneously | Never for multiplayer — claim map costs ~5 lines of code |
| Store full item definition in inventory | No item registry lookup on read | JSONB bloat, TOAST threshold exceeded, slow inventory loads | Never — store only instanceId + quantity + properties delta |
| Broadcast inventory updates to zone room | Reuse existing broadcast pattern | Every player sees every other player's inventory (privacy/exploit) | Never — inventory is always private |

---

## Integration Gotchas (Inventory-Specific)

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Socket.IO + inventory events | Using `server.to(zoneId).emit('inventory:update', ...)` (copy-paste from entity events) | Always use `client.emit('inventory:update', ...)` — inventory is per-player private |
| Phaser + React inventory UI | Phaser canvas captures keyboard input; pressing I to open inventory also fires in-game | Use `scene.input.keyboard.enabled = false` when inventory is open; re-enable on close |
| Zustand + inventory state | Adding `inventory` to gameStore alongside `player` and `entities` causes full re-render of game canvas on every item change | Separate inventory into `useInventoryStore` — game canvas doesn't subscribe to inventory changes |
| PostgreSQL JSONB + Drizzle | Drizzle `update` with JSONB requires `JSON.stringify` in some versions; omitting causes silent null writes | Always test actual DB values after write, not just the response from Drizzle ORM |
| Item definition lookup | Looking up item definition (`ItemDef`) inside the hot path of every inventory render | Cache item registry as a `Map<itemId, ItemDef>` at module load, never fetch inside render |
| Entity despawn + inventory pickup | Calling `entity:despawn` before inventory write succeeds — entity gone but item never added | Write inventory first, broadcast `entity:despawn` only after DB confirms item was added |
| Equipment unequip + inventory full | Equipping a new item tries to move old item to inventory — fails silently if inventory is full | Pre-validate inventory capacity before any equip operation; return explicit "inventory full" error |

---

## Performance Traps (Inventory-Specific)

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full inventory read on every operation | Latency spikes during crafting loops | Cache inventory in memory per-character in game-server; persist async | >5 inventory ops/second per player |
| JSONB items array exceeds 2KB TOAST threshold | Inventory load 2-10x slower under load | Keep items lean: only store delta properties, not full item data | >8 items with complex properties |
| No DB transaction on equip operations | Occasional item duplication after server restart | Always use `db.transaction()` for multi-step inventory mutations | Any crash between the two separate DB writes |
| Inventory re-render on every WebSocket event | React renders the full 20-slot grid on every entity update | Separate inventory Zustand store; only subscribe to `inventory:update` events | First entity update after inventory opens |
| Item registry lookup in render loop | Frame drops when inventory opens or refreshes | Pre-build `Map<itemId, ItemDef>` at startup; O(1) lookup in render | >50 item definitions, any re-render |
| Unbounded despawn timer queue | Memory leak if players never return to claim world items | Clear despawn queue on server restart; persist despawn times to DB | >1000 active world items across all zones |

---

## Security Mistakes (Inventory-Specific)

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-provided `instanceId` ownership | Player sends another character's instanceId, steals item | Server validates `instanceId` exists in the requesting player's inventory before processing |
| No rate limit on `inventory:use` | Rapid-fire health kit spam exploits timing windows | Rate limit: max 5 inventory events per second per player |
| Client-side stat calculation accepted by server | Players modify client to claim impossible stats | All effective stats derived server-side from authoritative inventory state |
| No server validation of item level requirements | Client equips level 50 weapon on level 1 character | Server checks `item.requiredLevel <= player.level` before allowing equip |
| Allowing negative quantity in `inventory:drop` | Client sends `{ instanceId, quantity: -99 }`, duplicates item | Validate `quantity > 0` and `quantity <= stack.quantity` server-side |
| No duplicate instanceId check on pickup | Client sends pickup for already-owned item | Validate instanceId is not already in player inventory before inserting |
| World item accessible from any zone | Client requests pickup for item in zone they're not in | Server validates player is in the same zone as the ItemEntity being picked up |

---

## UX Pitfalls (Inventory-Specific)

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Inventory opens during combat (Phaser input not blocked) | Player opens inventory mid-fight, game canvas stops receiving WASD input, character freezes | Disable inventory open keybind during combat; or pause input to game canvas when inventory open |
| No feedback when inventory is full | Player picks up item, item disappears from world, nothing in inventory — confusing | Show "Inventory Full" toast notification before pickup attempt; grey out ground items if inventory full |
| Hotkey activates item when typing in chat | Pressing 1 in chat sends message but also uses action bar item 1 | Chat input captures keydown, prevents propagation to game input system |
| Item tooltip shows stat diffs against currently equipped | Missing comparison info — player doesn't know if upgrade | Show green/red delta values against currently equipped item in same slot |
| Drag-drop from inventory to action bar loses item if drop target invalid | Item being dragged disappears during lag (optimistic removal) | Never remove item from inventory display during drag — only show "ghost" being dragged |
| Equipment stat change not reflected immediately in player HUD | Player equips armor, health bar doesn't update — looks broken | `inventory:update` response must include recalculated stats, update HUD immediately |

---

## "Looks Done But Isn't" Checklist (Inventory-Specific)

- [ ] **Item pickup works**: But are two simultaneous pickups handled? Simulate two clients picking up the same item at the same time — only one should succeed.
- [ ] **Equip works**: But is it atomic? Kill the server between `updateInventoryItems` and `updateEquipment` calls — verify no duplication on reconnect.
- [ ] **Action bar hotkeys activate items**: But do they handle stale references? Drop an item, press its hotkey — server should reject, UI should show slot as empty.
- [ ] **Inventory UI renders correctly**: But does it re-render on unrelated events (entity spawn, player moved)? Check React DevTools profiler — inventory component should not render on movement events.
- [ ] **Equipment grants stat bonuses**: But are stats calculated server-side? Verify by manually sending an `inventory:use` event via WebSocket inspector — the server must not trust client-provided stat claims.
- [ ] **Items drop to world correctly**: But are they persisted across server restart? Restart the game-server and verify world items are still present.
- [ ] **Inventory update is private**: Connect two clients to the same zone. Pick up an item on client A. Verify client B receives `entity:despawn` but NOT `inventory:update`.
- [ ] **Full inventory prevents pickup**: With 20/20 items, attempt pickup — verify server rejects, entity remains active, clear error shown to player.
- [ ] **Item properties persist**: Store an item with custom `properties` (e.g., `{ durability: 45 }`), relog — verify properties survived the round-trip through JSONB serialization.
- [ ] **Faction-restricted items are enforced server-side**: Attempt to equip a faction-locked item on a character of the wrong faction via WebSocket inspector — server must reject.

---

## Recovery Strategies (Inventory-Specific)

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Item duplication discovered in production | HIGH | Roll back item quantities using item history logs; issue server ban for egregious exploiters; hotfix equip to use single atomic UPDATE |
| Simultaneous pickup duplication | MEDIUM | Add in-memory claim map to ZonesService; retroactively audit item count discrepancies via item logs |
| Inventory update broadcast to zone (privacy breach) | LOW | Hotfix: change `server.to(zoneId).emit` to `client.emit`; no data migration needed |
| Optimistic UI desync | LOW | Add `confirmedInventory` state and rollback handler; no server changes needed |
| JSONB TOAST performance cliff | MEDIUM | Normalize large property objects to separate table; requires DB migration and query updates |
| Action bar stale references | LOW | Add inventory-change listener that clears dangling action bar slots; deploy without DB changes |
| Client-authoritative stats shipped | HIGH | Server-side stat recalculation on every equip/unequip; audit all combat results for the window where client stats were trusted |

---

## Pitfall-to-Phase Mapping (Inventory-Specific)

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Non-atomic equip duplication | Phase 1: Item Data Model | Kill server between equip writes; no duplication on reconnect |
| Simultaneous pickup race condition | Phase 2: Item Pickup & World Items | Two clients pick same item simultaneously; exactly one receives it |
| Inventory broadcast to zone | Phase 2: Item Pickup & World Items | Two clients in zone; client B receives zero `inventory:update` events for client A's actions |
| Optimistic UI desync | Phase 3: Inventory UI & HUD | 300ms simulated latency, server rejects move; item returns to original slot without flash |
| JSONB TOAST threshold | Phase 1: Item Data Model | 20 items with full properties; `items` column < 2KB; no TOAST in `pg_stat_user_tables` |
| Equipment stat exploit surface | Phase 4: Equipment System | WebSocket inspector equip with forged stats; server ignores client stats, uses own calculation |
| Action bar stale references | Phase 5: Action Bar & Hotkeys | Drop action bar item, press hotkey; server rejects, UI shows empty slot |
| Inventory flooding | Phase 3: Inventory UI & HUD | Rapid 10 ops/second; verify batching, no client flicker, server CPU stable |

---

## Sources (Inventory Research)

- [On item duplication exploits and how to prevent them - munique.net](https://munique.net/item-duplication-exploits/) — MEDIUM confidence, practitioner analysis of real MMO duplication patterns
- [Arc Raiders Hotfix Slams Duplication Glitch - February 2026](https://www.rosenberryrooms.com/arc-raiders-hotfix-slams-duplication-glitch/) — HIGH confidence, real shipped incident demonstrating inventory slot validation failure
- [MMO Architecture: Source of truth, Dataflows, I/O bottlenecks - PRDeving](https://prdeving.wordpress.com/2023/09/29/mmo-architecture-source-of-truth-dataflows-i-o-bottlenecks-and-how-to-solve-them/) — MEDIUM confidence, practitioner MMO architecture discussion
- [PostgreSQL JSONB Toast Performance - pganalyze 2025](https://pganalyze.com/blog/5mins-postgres-jsonb-toast) — HIGH confidence, official analysis of TOAST threshold and performance impact
- [PostgreSQL Explicit Locking: FOR UPDATE - Official Docs](https://www.postgresql.org/docs/current/explicit-locking.html) — HIGH confidence, official PostgreSQL documentation
- [WebSocket Race Condition PoC - GitHub](https://github.com/redrays-io/WS_RaceCondition_PoC) — MEDIUM confidence, demonstrates WebSocket concurrent operation race conditions
- [What to Sync for Multiplayer Inventory - Unity Forums](https://forum.unity.com/threads/what-to-sync-for-multiplayer-inventory.424511/) — MEDIUM confidence, community practitioner discussion
- [Optimistic Updates - TanStack Query Docs](https://tanstack.com/query/v4/docs/framework/react/guides/optimistic-updates) — HIGH confidence, official documentation on optimistic update rollback patterns

**Codebase analysis (HIGH confidence — direct inspection):**
- `packages/database/src/schema/inventories.ts` — JSONB storage model, separate items/equipment columns
- `packages/database/src/queries/inventory.ts` — non-atomic `updateInventoryItems` + `updateEquipment`
- `packages/shared-types/src/game/inventory.ts` — `Inventory`, `InventoryItem`, `ItemDef` interfaces
- `packages/shared-types/src/network/events.ts` — `inventory:update`, `inventory:pickup`, `inventory:use`, `inventory:drop` events
- `apps/game-server/src/game/game.service.ts` — `handleInteraction` sets entity inactive but doesn't add to inventory
- `apps/game-server/src/game/game.gateway.ts` — zone broadcast vs client emit patterns
- `apps/web/src/store/gameStore.ts` — no current inventory state, `showInventory` toggle only
- `packages/shared-types/src/core/entity.ts` — `ItemEntity` with `despawnAt` but no claim/lock mechanism

---

*Pitfalls research for: Movement System Overhaul + Infinite World Chunk Streaming + Inventory & Items System (Multiplayer 2D Isometric MMO)*
*Updated: 2026-02-17*
