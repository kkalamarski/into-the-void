# Pitfalls Research

**Domain:** Pixel movement rewrite — tile-based to free sub-tile WASD in a live multiplayer MMO
**Researched:** 2026-03-17
**Confidence:** HIGH (codebase fully read, patterns verified against known architecture)

---

## Critical Pitfalls

### Pitfall 1: Position Type Stays Integer — Floating-Point Drift Accumulates

**What goes wrong:**
The `Position` interface (`packages/shared-types/src/core/position.ts`) has `x: number` and `y: number` — integers today. If pixel movement is introduced but the type is not explicitly documented as "pixels, floats OK," callers round before writing to the store, or the server truncates before broadcasting. This creates tile-snapping jitter: the player visually moves smoothly on the local machine, but server broadcasts snap to whole integers, so remote players see stuttering and range checks use wrong values.

**Why it happens:**
JavaScript `number` silently accepts floats, but every existing caller computes `from.x + vector.dx` where `dx` is `1` or `-1`. When pixel speed is fractional (e.g. `0.08` px/ms), coordinates become floats. Any guard written as `if (dx > 1)` (see `validateMovement`) reads integer intent and will flag valid pixel-step moves as "too far."

**How to avoid:**
Decide the coordinate unit at the start: **tile units with sub-tile decimal fraction** (e.g. x=3.4 means 3.4 tiles from zone origin) or **pure pixel units** (x=326 px). Document it in the type. Remove all integer-distance checks (`dx > 1`) from `validateMovement` before any movement code touches them. Add a `@unit` JSDoc tag to `Position.x` and `Position.y`.

**Warning signs:**
- Remote players jump by full tiles instead of smoothly
- Range check in `CombatService.creatureAttackTick` (`dist > 1`) fires and drops attacks while player and creature are visually adjacent
- `canInteract` range check starts rejecting valid gather attempts
- `Math.abs(to.x - from.x)` yields values like `0.08` and hits the `> 1` rejection path

**Phase to address:**
Phase 1 (Position Type Refactor). Must be the first commit in the milestone, before any movement loop changes.

---

### Pitfall 2: Client Prediction Diverges From Server Because Physics Step Differs

**What goes wrong:**
`MovementController.processInput` calls `calculateNewPosition` — a direction-vector add. With discrete tile steps this is deterministic. With pixel movement, the client runs at 60 fps frame-delta and the server runs a fixed game loop (or processes on receipt). If the client integrates `velocity * deltaTime` and the server integrates `velocity * serverTickDt`, accumulated positions diverge every frame. Reconciliation then becomes constant corrections, causing rubber-banding.

**Why it happens:**
The current prediction model works because one `player:move` event = exactly one tile step. Both sides do the same integer math. Pixel movement breaks this: the client sends a continuous velocity or a small delta, but the server may run at a different timestamp when it applies the move. Any floating-point integration that depends on elapsed time will produce different results unless both sides use the same fixed timestep.

**How to avoid:**
Send discrete input events (key-down / key-up / velocity vector) and let the server apply them against its own fixed timestep. The server is authoritative on resulting position. Reconciliation smooths client to server, rather than trying to match arithmetic exactly. Alternatively, keep the client sending "intent packets" at a fixed 20 Hz and interpolate position locally between confirmed states. Do not share integration code between client and server unless both run the same fixed dt.

**Warning signs:**
- Position divergence grows over time even with no collision
- `reconcile()` always has `positionMismatch = true`
- Pending input queue (`pendingInputs`) never drains
- Rubber-banding visible even on LAN with no packet loss

**Phase to address:**
Phase 2 (Server Movement Loop). Design the server tick and client update contract before writing either side.

---

### Pitfall 3: Tile-Indexed Collision Map Used for Sub-Tile Positions

**What goes wrong:**
`validateMovement` looks up `collisionMap[to.y]?.[to.x]` where `x` and `y` are tile indices. With pixel positions, `to.x` is something like `3.72`. JavaScript coerces this to `3` for array access (via floor), so the lookup silently succeeds or fails on the wrong tile. The player can walk into the right half of a blocked tile without being stopped, because `collisionMap[3][3]` is checked but the player's actual footprint occupies tile (3,3) and (4,3).

**Why it happens:**
Array indexing in JavaScript truncates floats silently. Nobody gets an error — the game just works incorrectly at sub-tile boundaries.

**How to avoid:**
When doing tile-grid collision lookup from a pixel position, floor AND check all tiles the hitbox overlaps. For a circular or rectangular hitbox, sample all tile-grid cells covered by the bounding box, not just the center. Add an explicit `assertInteger` guard in `validateMovement` or migrate it to a separate `validatePixelMovement` that takes a hitbox.

**Warning signs:**
- Players can walk partially into walls before being pushed back
- Collision only triggers when player center crosses tile boundary, not earlier
- "Flat blocking tiles" (the known issue listed in PROJECT.md) continue to feel passable near their edge
- Unit tests for `validateMovement` still pass integer inputs and never exercise fractional ones

**Phase to address:**
Phase 2 (Pixel Collision). New collision function must replace — not extend — tile-index lookup.

---

### Pitfall 4: Combat Range Still Uses Chebyshev/Manhattan Tile Distance

**What goes wrong:**
`CombatService.creatureAttackTick` checks:
```ts
const dist = Math.max(Math.abs(creature.position.x - player.position.x), Math.abs(creature.position.y - player.position.y));
if (dist > 1) { return null; }
```
With pixel positions this check becomes `Math.abs(3.4 - 3.2) = 0.2`, which passes even when the creature is actually far away — or `Math.abs(3.4 - 1.1) = 2.3`, which blocks attacks between visually adjacent combatants at sub-tile positions. Similarly, `canInteract` in `interaction.ts` uses `manhattanDistance` with a `+ 1.0` buffer tuned for tile integers.

**Why it happens:**
All range checks were designed with the assumption `position.x` and `position.y` are integer tile indices. No calibration was done for fractional units.

**How to avoid:**
Replace all range checks with pixel-aware Euclidean distance or, if sticking to tile-unit coordinates, convert range thresholds by multiplying by tile pixel size. Define range constants in the same unit as `Position`. Introduce `TILE_SIZE_PX = 96` (already in CLAUDE.md) and `MELEE_RANGE_PX = 1.5 * TILE_SIZE_PX` for clarity. Update `canInteract`, `getEntitiesInRange`, `creatureAttackTick`, and Pack Call / Stampede range checks in `ai.service.ts`.

**Warning signs:**
- Players can attack creatures across the zone (infinite range)
- OR melee attacks stop working even when visually adjacent
- Gathering range check rejects attempts at the expected distance
- Pack Call summoning range (10 tiles) inadvertently pulls creatures from across the zone

**Phase to address:**
Phase 3 (System Conversions). Must be done before any combat or gathering QA.

---

### Pitfall 5: Zone Transition Triggers at Wrong Pixel Boundary

**What goes wrong:**
`calculateNewPosition` wraps `x` at `ZONE_SIZE` (64 tile units). With pixel movement, if `Position.x` is stored as tile-unit floats, wrapping at exactly `64.0` still works. But if `Position.x` is stored as raw pixels and `ZONE_SIZE` is still 64, the comparison `newX >= ZONE_SIZE` becomes `newX >= 64` when the coordinate could be `6144` (64 tiles * 96 px). The zone transition either never fires, fires 96x too early, or fires repeatedly as the player oscillates near the boundary.

**Why it happens:**
`ZONE_SIZE = 64` is declared in `constants.ts` as a tile count. Any code that mixes this constant with pixel coordinates silently produces wrong zone IDs.

**How to avoid:**
Pick one coordinate unit and use it everywhere. If using pixel coordinates, derive a `ZONE_SIZE_PX = ZONE_SIZE * TILE_SIZE_PX` constant and use that in all boundary checks. If using tile-unit floats, ZONE_SIZE stays 64. The hysteresis logic (`HYSTERESIS_TILES = 3`) must also be converted: `3 tiles = 3.0 tile-units` or `288 px` depending on the chosen unit.

**Warning signs:**
- Zone transition fires repeatedly as player walks near zone edge (thrashing)
- Adjacent zone chunks never load (transition never fires)
- `zoneId` changes to wrong value (off-by-zone errors)
- Zone HUD flickers rapidly between two zone names

**Phase to address:**
Phase 1 (Position Type Refactor). Document coordinate unit before any movement code is written.

---

### Pitfall 6: Fog of War Reveal Uses Tile-Index, Not Pixel Position

**What goes wrong:**
`FogManager.revealTiles` takes a tile position and iterates a radius in tile steps. With pixel positions, calling `fogManager.revealAt(player.position.x, player.position.y)` passes pixel values, causing the reveal to happen at the wrong tile (position `326, 247` reveals tile `(326, 247)` instead of tile `(3, 2)`).

**Why it happens:**
`FogManager` was designed assuming `position.x` is a tile index. There is no conversion layer between the movement system and the fog system.

**How to avoid:**
Add a `pixelsToTile(px: number): number` conversion step in the WorldScene before calling `fogManager.revealTiles`. Or give FogManager a conversion-aware overload. The fog save/load format (bitset encoding via `FogPersistence`) uses tile coordinates, so the storage format does not need to change — only the call site needs to convert from whatever unit `Position` uses to tile integers.

**Warning signs:**
- Fog reveals at wrong location on map
- Fog remains black even after walking through an area
- Or fog is fully revealed from the start (coordinates overflow into large tile index that wraps)

**Phase to address:**
Phase 3 (System Conversions). Fog reveal is called from WorldScene's movement callback — update it when the position unit changes.

---

### Pitfall 7: Server-Side Rate Limiting Breaks Under Continuous Position Stream

**What goes wrong:**
`PlayerService.lastMoveTimes` currently enforces a per-player move interval (alluded to in PROJECT.md: "140ms server rate limit"). For discrete tile movement this is one event per tile step. For continuous pixel movement, the client sends position updates at 20–30 Hz. If the rate limiter rejects too many packets, the server position lags behind the client, making reconciliation constantly fire corrections. If the rate limiter is removed entirely, a fast-moving player or malicious client can spam 1000 updates/second.

**Why it happens:**
The rate limiter was tuned for 2 moves/second (one per 500ms, with 140ms tolerance). Pixel movement at 20 Hz means one packet every 50ms — 10x the expected frequency.

**How to avoid:**
Replace the per-move rate limiter with a velocity/distance validator. Instead of "max 1 move per N ms," check "max X pixels travelled per second." Accept all position updates but reject any that imply a speed faster than `maxSpeed * cheatingTolerance`. The server applies the last accepted position, not a queued stream. A reasonable cheating tolerance is 1.5–2x max player speed to absorb network jitter.

**Warning signs:**
- Players visually lag 2–3 tiles behind where they pressed keys
- High disconnect rate due to reconciliation corrections
- Server logs show many "move rejected: too fast" for legitimate movement
- No rate limit at all: CPU spikes when stress-testing with many players

**Phase to address:**
Phase 2 (Server Movement Loop). Rate limiter redesign must be part of the server movement handler rewrite.

---

### Pitfall 8: Gathering Is Broken When Player Moves Away During Mini-Game

**What goes wrong:**
`GatheringService.startGathering` locks the entity and starts a challenge. If the player moves during the challenge, the entity lock is still held. With tile movement, position checking was coarse-grained. With pixel movement and no interruption on motion, a player can walk to the other end of the zone while holding a gathering lock — or the range check in `canInteract` might now fail immediately after the challenge starts because position is fractional and the range threshold hasn't been updated.

Currently the gathering result runs `canInteract(player, entity, toolRange)` at the start but not when completing. If the player has moved far away between `startGathering` and `completeGathering`, there is no re-validation. With pixel movement, exploiting this is easier: start gather at range limit, walk away, complete the gather.

**How to avoid:**
Validate range at both `startGathering` and `completeGathering`. Store the player's position at challenge start and verify the player has not moved more than 1.5 tile-units away by completion. The entity lock timeout already handles abandoned sessions, but re-checking range on completion closes the exploit. Update `DEFAULT_INTERACTION_RANGE` to reflect the new pixel-aware unit.

**Warning signs:**
- Players complete gathers from across the zone
- Entity lock never releases (player moved away without completing)
- Range check throws "entity too far" immediately on gather start even when adjacent

**Phase to address:**
Phase 3 (System Conversions). Gathering is a distance-dependent system and must be updated in the same phase as other range conversions.

---

### Pitfall 9: Creature AI Chase Logic Uses Integer Tile Steps

**What goes wrong:**
`tickCreatureAI` in `game-logic` moves creatures by whole tile steps toward target positions. Once players move freely in sub-tile increments, the creature still moves in full tile jumps. The visual result is that creatures teleport one tile at a time toward a smoothly-moving player — jarring and mismatched. Additionally, the leash range and aggro radius in `AiService` are tile counts; these must be converted or creatures will either have infinite range or never aggro.

**Why it happens:**
Creature movement was implemented to mirror player tile-step movement. The AI tick (1000ms, half player speed) fires once per second and advances by one tile. There is no interpolation for creature positions on the client.

**How to avoid:**
Creature movement can remain tile-step initially (Phase 1 delivery) — but the client must interpolate creature position between AI ticks to avoid visual teleporting. The server broadcasts creature position after each AI tick; the client tweens from old to new position over the tick interval. Only in a later phase does creature movement need true pixel granularity. Document this scope explicitly to avoid over-engineering in the first phase.

**Warning signs:**
- Creatures visually teleport one tile per second
- Creatures stop chasing when player is 0.5 tiles outside aggro range (threshold in tile integers)
- Pack Call triggers at wrong distance after position unit change

**Phase to address:**
Phase 2 (Server Movement Loop) for defining creature tick/position broadcasting; Phase 4 (Creature Smoothing) for client interpolation.

---

### Pitfall 10: DB Position Persistence Schema Doesn't Support Fractional Coordinates

**What goes wrong:**
`updateCharacterPosition` saves `player.position` to the database. If the Drizzle schema defines position as `integer` columns (or a JSONB field that the query layer typed as integers), saving a float like `x: 3.72` will either truncate to `3` or throw a constraint error on disconnect. Player position then snaps to a tile boundary on every login.

**How to avoid:**
Check the Drizzle schema column types for character position. If they are integer, change to `numeric` or `real`. If position is stored as JSONB, it will round-trip as-is but verify the TypeScript type for the retrieved value is not coerced to integer anywhere in `findCharacterById` or `getLastWorldPosition`. Test reconnect-at-fractional-position before declaring the migration done.

**Warning signs:**
- Player position snaps to tile grid on login
- Drizzle runtime error on disconnect: `invalid input syntax for type integer: "3.72"`
- Character appears at a different position after reconnect than when they disconnected

**Phase to address:**
Phase 1 (Position Type Refactor). Schema change is a migration — safest to ship alongside the type change, before any float positions are written.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep creature movement as integer tile steps initially | Avoids rewriting AI in Phase 1 | Creatures visually teleport; player/creature parity gap grows | Acceptable in Phase 1 if client interpolates; revisit in Phase 4 |
| Reuse `Position` type (add float semantics, no new type) | No type-wide refactor | Comment-only guarantee; callers may still floor | Acceptable with strong JSDoc and lint rule; never if no documentation |
| Use tile-unit floats instead of pure pixels | Most existing math stays valid (ranges stay 1–3) | Collision lookup still needs floor+multi-tile sampling | Acceptable and recommended — this project should use tile-unit floats |
| Send velocity vector instead of per-frame position delta | Simple protocol | Server must integrate; divergence if timestep differs | Only acceptable if server has a fixed update loop |
| Skip fog reveal conversion (floor pixel to tile manually at call site) | Quick fix | Repeated floor conversions scattered; easy to miss one | Never — centralize in a single `toTileCoord()` helper |
| Skip DB schema update, hope JSONB round-trips OK | Saves a migration | Breaks on any code path that re-casts to integer | Never — verify schema before writing float positions |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `canInteract` (game-logic) | Passing pixel coordinates to a function expecting tile-unit range | Convert position to tile units before calling, or update `DEFAULT_INTERACTION_RANGE` to match chosen unit |
| `collisionMap[y][x]` lookup | Float array index silently floors | Floor explicitly before lookup AND sample all tiles the hitbox overlaps |
| `FogManager.revealTiles` | Passing raw pixel position as tile index | Convert to tile integer before calling fog reveal |
| Combat range check in `creatureAttackTick` | Chebyshev distance `> 1` rejects all pixel-era attacks | Replace with pixel-aware range constant |
| Zone boundary logic in `calculateNewPosition` | `ZONE_SIZE` mixed with pixel coordinates | Use a single coordinate unit; derive `ZONE_SIZE_PX` if needed |
| `PlayerService.lastMoveTimes` rate limiter | 140ms window blocks 20 Hz position stream | Replace with velocity/distance validation |
| `HazardService.onPlayerEnteredZone` | Zone transition event fires repeatedly at pixel boundary | Hysteresis logic must use same coordinate unit as boundary check |
| `AutomationService` deployable positions | Deployment positions stored as tile integers; range checks for collect/interact | Convert interaction range checks after position unit is settled |
| NPC interaction range in `npc:interact` handler | NPC positions are tile-integer; player position is now float | Apply same range conversion as gathering/combat |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sending full `ZoneState` on every position update | Server CPU spikes, client GC pressure | Send delta position only (`player:moved` event, already designed) | >10 players in zone moving simultaneously |
| Collision map checked for all 8 movement directions on each input | CPU cost 8x higher than before (continuous input vs. discrete) | Check only the direction of current movement vector; use hitbox AABB | >20 concurrent players in same zone |
| Per-frame DB writes for position (if connected to save logic) | DB write amplification at 20 Hz | Position saves only on disconnect or zone transition (current pattern, preserve it) | Any continuous save path at tick rate |
| Broadcasting every player position to every zone member at 20 Hz | Bandwidth blowup: 5 players * 20 Hz * 50 bytes = 5 KB/s * zone count | Rate-limit outbound position broadcasts at server (send at 10–20 Hz max, interpolate on client) | >5 players in same zone |
| Re-computing zone biome on every move event | `getBiome()` does noise calculations; called in `getMovementDelay` | Cache biome per player on zone entry; invalidate on zone transition only | Any continuous movement loop that calls `getMovementDelay` |
| Fog reveal called per-frame | FogManager BFS runs 8*radius^2 times per second | Throttle reveal to once per tile boundary crossing, or once per 100ms | Continuous WASD held down |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Remove rate limiter without replacement | Trivial speed-hacking: client sends bogus high-velocity updates; player teleports across zone | Replace with speed/distance validation on every accepted position |
| Trust client-reported position directly | Teleport exploits; gathering at any range; combat hits from anywhere | Server is authoritative: server applies movement from input, not from reported position |
| Remove `validateMovement` before writing replacement | No wall collision on server during transition | Keep old validator running in parallel until pixel validator passes the same test suite |
| Range checks in interaction handlers bypassed because float > tile-int | Players gather/attack/loot from arbitrary range | All distance comparisons must use the same coordinate unit as `Position` |
| `lastPortalEmitKey` (WorldScene) keyed on integer tile position | With float positions the key changes every sub-pixel; portal triggers once per movement frame | Re-key portal deduplication on a tile-snapped position, not the raw float |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Instant reconciliation snap (rubber-band) | Player visually teleports backward on minor corrections | Interpolate reconciliation correction over 100–200ms; only hard-snap on large mismatch (>2 tiles) |
| Entity blocking prevents passing through entities during movement | Player gets stuck on any creature in the path, especially herds | With pixel movement, AABB-based blocking may need a "push-out" response rather than hard reject |
| Click-to-move pathfinder left in codebase as dead code | Confusing: right-click still shows path visualization but does nothing | Remove `PathfindingController` entirely in the same phase as dropping click-to-move |
| Speed modifiers (BIOME_SPEED_MODIFIERS, tile movementSpeed) feel subtle at pixel scale | Player barely notices entering slow tile if transition is smooth | Retain speed modifiers but apply them as continuous velocity multipliers, not tick-rate changes |
| Gathering range "feels smaller" after rewrite | Players must stand closer than before to gather | Tune `DEFAULT_INTERACTION_RANGE` to be visually generous (1.5 tile-units) rather than strictly 1 |

---

## "Looks Done But Isn't" Checklist

- [ ] **Position type**: Verify `Position.x` and `Position.y` are documented as tile-unit floats and no caller floors before writing to store or DB
- [ ] **Collision map lookup**: Verify multi-tile hitbox sampling for all 8 directions, not just center-point tile floor
- [ ] **Range checks**: Verify all distance comparisons (`creatureAttackTick`, `canInteract`, `getEntitiesInRange`, pack-call range, stampede range) use the new coordinate unit
- [ ] **Zone transition**: Verify `calculateNewPosition` wraps at the correct boundary for the chosen unit, and hysteresis is converted
- [ ] **DB schema**: Verify character position columns accept fractional values; test reconnect-at-float-position
- [ ] **Fog of war**: Verify reveal uses tile-integer conversion at call site; check bitset keys are still integers
- [ ] **Rate limiting**: Verify server accepts 20 Hz position stream without rejecting legitimate moves
- [ ] **NPC range**: Verify NPC interaction range check uses same unit as position (NPCs are spawned at tile-integer positions; player is now float)
- [ ] **Portal deduplication**: Verify `lastPortalEmitKey` is keyed on tile-snapped position, not raw float
- [ ] **Hazard zone entry**: Verify `zone.entered` event fires once on zone transition, not on every position update
- [ ] **Click-to-move removed**: Verify `PathfindingController` is deleted or disabled, not silently broken

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Position type integer-snap shipping to prod | HIGH | DB migration to numeric, redeploy server, flush all connected sessions |
| Combat range broken (too wide or zero) | MEDIUM | Hot-patch range constants in `game-logic`; no DB change needed |
| Rubber-banding on every move | MEDIUM | Revert to old discrete movement as fallback; isolate prediction divergence in test |
| Zone transition thrashing | MEDIUM | Restore integer hysteresis comparison; add explicit tile-floor before boundary check |
| Fog reveal at wrong coordinates | LOW | Single-line fix at WorldScene call site; no server change needed |
| Server rate limiter blocking legitimate moves | LOW | Relax velocity threshold constant; redeploy server |
| DB schema rejects float positions (disconnect crash) | HIGH | Hotfix migration to `real` columns; temporary: floor position before save as stop-gap |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Position type ambiguity / integer-coercion | Phase 1 — Position Type Refactor | Unit tests for `Position` with float values; JSDoc review |
| DB schema truncates floats | Phase 1 — Position Type Refactor | Integration test: connect, move to fractional position, disconnect, reconnect; assert same position |
| Client prediction diverges from server | Phase 2 — Server Movement Loop | Latency simulation test: add 200ms lag, assert reconciliation correction < 0.5 tiles |
| Tile-index collision map with float positions | Phase 2 — Pixel Collision | Unit test: player at x=2.9 cannot enter a blocked tile at x=3 |
| Zone transition at wrong boundary | Phase 2 — Server Movement Loop | Walk across zone boundary in straight line; verify exactly one `zone.entered` event |
| Combat range broken | Phase 3 — System Conversions | Combat test: melee attack at range 1.0 tile units connects; at range 1.6 tile units does not |
| Gathering range broken | Phase 3 — System Conversions | Gather test: entity at 1.5 tile units succeeds; entity at 2.5 tile units rejected |
| Fog reveal wrong coordinates | Phase 3 — System Conversions | Walk a known path; compare revealed tiles to expected tiles |
| Creature AI visual teleporting | Phase 2 broadcast + Phase 4 smoothing | Observe creature movement; assert no instant position change > 0.1 tile units per frame |
| Server rate limiter rejecting valid moves | Phase 2 — Server Movement Loop | Stress test: hold WASD for 30 seconds; assert no false "move rejected" errors in log |
| Click-to-move left as dead code | Phase 2 — Remove Pathfinding | Grep for `PathfindingController` and `pathfinding:` event handlers; assert zero references |
| Portal deduplication using raw float key | Phase 3 — System Conversions | Walk over portal repeatedly; assert `portal:use` emitted exactly once |

---

## Sources

- Codebase read: `packages/game-logic/src/movement/validation.ts` — tile integer assumptions in `validateMovement`
- Codebase read: `packages/game-logic/src/interaction/interaction.ts` — `DEFAULT_INTERACTION_RANGE = 1` (tile units)
- Codebase read: `apps/game-server/src/game/combat.service.ts` — `dist > 1` Chebyshev check
- Codebase read: `apps/game-server/src/game/gathering.service.ts` — single-point range check at start only
- Codebase read: `apps/web/src/game/systems/MovementController.ts` — client prediction using `calculateNewPosition`
- Codebase read: `packages/shared-types/src/constants.ts` — `MOVE_DELAY_MS = 500`, `HYSTERESIS_TILES = 3`
- Codebase read: `packages/shared-types/src/core/position.ts` — `Position.x: number`, no unit annotation
- Codebase read: `apps/web/src/game/fog/FogManager.ts` — reveal radius in tile integers
- [Gabriel Gambetta: Client-Side Prediction and Server Reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) — reconciliation mechanics and rubber-banding
- [Valve Developer Community: Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking) — 20-30 Hz update rate, delta compression
- [Valve Developer Community: Latency Compensating Methods](https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization) — server-authoritative movement design
- [GameDev.net: Swept AABB Collision Detection](https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/swept-aabb-collision-detection-and-response-r3084/) — multi-tile hitbox sampling requirement
- [Clint Bellanger: Isometric Tiles Math](https://clintbellanger.net/articles/isometric_math/) — pixel-to-tile coordinate conversion in isometric grids
- [Gaffer On Games: Floating Point Determinism](https://gafferongames.com/post/floating_point_determinism/) — float determinism in multiplayer simulations

---

*Pitfalls research for: Pixel movement rewrite (tile-to-pixel migration, live multiplayer MMO)*
*Researched: 2026-03-17*
