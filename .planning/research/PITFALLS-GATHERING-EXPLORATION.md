# Pitfalls Research

**Domain:** Multiplayer 2D Sci-Fi Survival MMO - Gathering, Exploration, Combat Balancing
**Researched:** 2026-02-23
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Gathering Node Race Conditions in Multiplayer

**What goes wrong:**
Multiple players simultaneously interact with the same gathering node, leading to duplicate claims, lost progress, or one player "stealing" a resource after another player started the interaction. The client sees the player was there first (already chopping/mining), but the server awarded it to someone else.

**Why it happens:**
Network latency creates a time window where multiple clients send gather requests before the server marks the node as "claimed." Without proper locking, the server processes both requests. Even with server-side validation, the time between "start gathering" and "finish gathering" creates a window for race conditions.

**How to avoid:**
- Implement atomic "claim-on-start" logic: when a player initiates gathering, server immediately locks the node to that player
- Send `gathering:started` event to zone with `{ nodeId, playerId, estimatedCompletionTime }` so other clients show node as "in use"
- On mini-game completion, validate the lock still belongs to the requesting player (prevents cheating via injected completion events)
- Use gathering instance IDs that tie together start/progress/complete events: reject completion if instance ID doesn't match active gathering session
- Add server-side timeout: if player disconnects or abandons mid-gather, release lock after 5-10 seconds

**Warning signs:**
- Players complain about resources "disappearing" mid-gather
- Multiple players report getting the same resource drop
- Database shows duplicate loot entries for single-use nodes
- Gathering progress bars reset unexpectedly when another player approaches

**Phase to address:**
Phase 1 (Gathering System Foundation) - implement locking before mini-games to prevent compounding issues

---

### Pitfall 2: Client-Side Prediction for Gathering Mini-Games Creates Desync

**What goes wrong:**
Player completes gathering mini-game on client (progress bar fills, success animation plays), but server rejects the completion due to latency/reconciliation. Player sees success locally, then inventory doesn't update, creating confusion and perceived bugs. Worse: player predicts failure, stops trying, but server actually succeeded.

**Why it happens:**
Movement uses client-side prediction + server reconciliation successfully, so developers assume gathering should work the same way. However, gathering mini-games are time-based skill checks with binary outcomes (success/fail), not continuous state that can be replayed like movement. Predicting the outcome before server validation breaks the feedback loop.

**How to avoid:**
- Do NOT predict gathering outcomes - wait for server authoritative response
- Predict only the "in progress" state: show progress bar, animations, mini-game UI immediately on start
- Use optimistic UI patterns: fade out gathered node immediately, but keep a "phantom" marker server-side until confirmation
- If server rejects (timeout, interrupt, failure), rollback: respawn node visually, show error feedback
- Implement lag compensation for mini-game timing: send client timestamps with completion events, server validates within latency threshold (e.g., ±200ms)
- For skill-check mini-games (button timing), calculate success on client but require server validation before awarding loot

**Warning signs:**
- Players report "phantom resources" (node disappears but no loot received)
- Gathering success/failure feedback is inconsistent across players with different ping
- High-latency players never succeed at timing-based mini-games
- Players exploit client-side prediction by manipulating latency

**Phase to address:**
Phase 1 (Gathering Mini-Games) - establish authoritative model before complex mechanics added

---

### Pitfall 3: Fog of War Entity Visibility Creates Bandwidth Explosion

**What goes wrong:**
Server sends entity updates for ALL entities in a 3x3 chunk grid to all players, including entities behind fog of war that players shouldn't see yet. As entity count grows (players, creatures, resources, drops), bandwidth per player scales O(n) with total entities, causing lag spikes when many players cluster in zones.

**Why it happens:**
The existing architecture sends full zone state to players (chunks + entities) via 3x3 room subscriptions (current implementation in ChunkManager and GameGateway). Adding fog of war without refactoring visibility filtering means players still receive updates for hidden entities, wasting bandwidth and exposing hidden information (potential cheating).

**How to avoid:**
- Implement **server-side visibility culling** before sending entity updates: filter entities by fog-of-war state before broadcasting
- Separate "structural visibility" (chunk loaded) from "explored visibility" (fog revealed): only send entities for explored tiles
- Use delta updates: track which entities each player knows about, only send spawn/despawn/update events for visibility changes
- Batch visibility updates: when fog reveals a new area, send single `fog:revealed` event with array of newly visible entities, not individual spawn events
- Set maximum entities per visibility update (already implemented: `MAX_VISIBLE_ENTITIES = 20` in range.ts) - extend this to fog-of-war filtering
- Consider "interest management": reduce update frequency for distant entities (e.g., 1Hz for entities >10 tiles away vs 10Hz for nearby)

**Warning signs:**
- Network profiler shows massive spikes in outbound data when players enter new zones
- WebSocket message queues back up during high player density
- Players report lag when multiple players gather in same area
- Bandwidth usage scales linearly with entity count rather than visible entity count

**Phase to address:**
Phase 2 (Fog of War) - implement BEFORE exploration features to prevent bandwidth issues from Day 1

---

### Pitfall 4: POI Discovery State Divergence Between Client and Server

**What goes wrong:**
Player discovers a POI locally (client marks it revealed, shows UI celebration), but server doesn't persist the discovery (disconnect before save, database write fails, race condition). On reconnect, POI is "undiscovered" again. Worse: player discovers POI, gets discovery XP/rewards, then on reload discovers it AGAIN and gets duplicate rewards.

**Why it happens:**
Discovery events are treated as "fire and forget" rather than transactional. Client optimistically updates local state before server confirms persistence. No idempotency checks on discovery rewards - server doesn't track "already rewarded" state separately from "discovered" state.

**How to avoid:**
- Use three-state discovery model: `undiscovered → discovering → discovered`
- Client sends `poi:discover` request but keeps state as "discovering" until server confirms with `poi:discovered`
- Server validates discovery (proximity check, not already discovered), persists to database, THEN responds
- Implement idempotent discovery: track `discovered_at` timestamp in database, reject duplicate discover requests for same POI+player
- Separate discovery persistence from reward distribution: `discoveries` table + `discovery_rewards` table with foreign key
- On reconnect, sync full discovery state during zone load (include in `zone:state` payload)
- Add discovery event sourcing: log all discovery events with timestamps for debugging/auditing

**Warning signs:**
- Players report "lost discoveries" after disconnect
- Same POI appears in discoveries table multiple times for single player
- Discovery XP grants are duplicated in logs
- Zone mastery percentage jumps backward after reload

**Phase to address:**
Phase 3 (POI Discovery) - implement during discovery foundation, before zone mastery to prevent cascading issues

---

### Pitfall 5: Combat Balancing Changes Break Without Damage Formula Testing

**What goes wrong:**
Developers adjust base damage values or stat scaling coefficients to fix one-shot kills, but changes have unintended consequences: low-level combat becomes a slog (bullet sponges), high-level players still one-shot each other, or PvE balance breaks when fixing PvP. Each "fix" requires another fix, creating balance whack-a-mole.

**Why it happens:**
Damage formulas are opaque without tooling. Developers adjust numbers in isolation (`power: 50 → 40`) without seeing the output across level ranges. The game has multiple damage sources (base weapon damage, stats, equipment bonuses, abilities) that multiply together non-linearly. No automated testing validates "time to kill" remains in acceptable range.

**How to avoid:**
- Build **damage calculator tool** FIRST: input level, equipment, stats → output damage ranges and time-to-kill
- Create reference scenarios as automated tests:
  - "Level 5 player with starter weapon vs level 5 creature: 3-5 hits to kill"
  - "Equal-level players: 8-12 hits to kill (TTK: 10-15 seconds)"
  - "Level 10 player vs level 5 creature: max 3 hits"
  - "Level 5 player vs level 10 creature: survives at least 4 hits"
- Implement **damage scaling curves** with diminishing returns: `damage = baseDamage * (1 + (power - 10) * 0.1) / (1 + (power - 10) * 0.01)` prevents stat stacking from becoming exponential
- Add damage variance (±10%) to prevent deterministic outcomes
- Log combat interactions to database for analytics: track actual TTK distributions, outlier damage events
- Consider separate PvE and PvP damage modifiers if balancing both simultaneously proves impossible

**Warning signs:**
- One-shot kills still occur after "balance pass"
- Combat at different level ranges feels dramatically different (fun at 5-10, tedious at 15-20)
- Players discover "broken" stat builds that trivialize content
- Forum complaints about "no build diversity - everyone uses same stats"

**Phase to address:**
Phase 4 (Combat Balancing) - build testing infrastructure BEFORE adjusting formulas

---

### Pitfall 6: Zone Mastery Progress Resets Due to POI Tracking Bugs

**What goes wrong:**
Player completes 90% of POIs in a zone, logs out, returns to find progress at 0% or lower percentage. Some POIs show as "discovered" but don't count toward mastery percentage. Mastery rewards granted multiple times or never granted.

**Why it happens:**
Zone mastery is a derived metric (count of discovered POIs / total POIs in zone), but POI totals are procedurally generated per zone and not cached. Zone seed changes or POI generation logic updates cause POI count mismatches. Discovery tracking uses POI coordinates instead of stable IDs, so regenerating a zone creates "new" POIs at same locations.

**How to avoid:**
- Assign **stable POI IDs** during zone generation: `poi_{zoneId}_{index}` based on deterministic seed-based ordering
- Cache POI count per zone in database on first generation: `zone_metadata` table with `total_pois` column
- Calculate mastery from cached total, not live regeneration: `discovered_pois / cached_total_pois`
- If POI generation logic changes, implement migration: recalculate totals, mark old discoveries as "legacy" but still count them
- Store POI hash with each discovery: if POI definition changes (moved location, changed type), discovery remains valid via hash
- Add mastery audit endpoint: `GET /zones/{zoneId}/mastery-audit` returns `{ expected_pois, discovered_pois, missing_discoveries }` for debugging
- Implement mastery checkpoints: grant rewards at 25%/50%/75%/100%, track which checkpoints already rewarded separately

**Warning signs:**
- Mastery percentages fluctuate between sessions without discovering/losing POIs
- Different players see different POI counts for same zone
- Mastery rewards granted more than once
- Database shows orphaned discoveries (POI ID doesn't match any generated POI)

**Phase to address:**
Phase 5 (Zone Mastery) - implement stable POI IDs in Phase 3, validate in Phase 5

---

### Pitfall 7: Gathering Progress Interruption Lacks Rollback Logic

**What goes wrong:**
Player starts gathering (node locked, mini-game running), then gets attacked, moves, disconnects, or server restarts. Node remains locked forever, preventing other players from gathering. Or: player disconnects mid-gather, reconnects, and auto-completes the gathering without finishing the mini-game (exploit).

**Why it happens:**
Gathering state is stored in server memory without persistence. Disconnect wipes the state, but node lock remains. No cleanup logic for abandoned gathering sessions. No validation that player is still present/eligible when completing gathering.

**How to avoid:**
- Track gathering sessions in memory with TTL: `{ playerId, nodeId, startedAt, expiresAt, instanceId }`
- On disconnect, immediately expire all gathering sessions for that player: unlock nodes, broadcast `gathering:cancelled`
- On combat initiation, check if player is gathering: auto-cancel gathering, unlock node, send `gathering:interrupted` with reason
- Validate on gather completion:
  - Player is still in range of node (within 2 tiles)
  - Player is not in combat
  - Session instanceId matches active session
  - Time since start is within expected range (mini-game duration ± latency threshold)
- Add movement interruption: if player moves >1 tile during gathering, cancel session
- Persist gathering state to Redis for mid-session recovery: if server restarts, restore gathering sessions from Redis with remaining time

**Warning signs:**
- Gathering nodes stuck in "locked" state permanently
- Players can move while gathering without cancellation
- Gathering completes after player died/disconnected
- Exploit reports: players force-disconnect to skip mini-game

**Phase to address:**
Phase 1 (Gathering System) - implement interruption logic alongside mini-game mechanics

---

### Pitfall 8: Fog of War Reveals Exploitable via Memory Inspection

**What goes wrong:**
Client receives entity data for fog-obscured areas (entities not filtered server-side), players use memory editors or modified clients to reveal hidden entities, resources, or other players through fog of war. This breaks game balance and enables griefing (camping hidden resource spawns, tracking players).

**Why it happens:**
Server sends all entities in 3x3 chunk grid to client, assuming client will render fog of war overlay correctly. Client-side fog of war is purely cosmetic. Entity data exists in client memory regardless of visibility state.

**How to avoid:**
- Implement **authoritative server-side fog filtering**: do NOT send entity data for unexplored areas
- Track per-player exploration state on server: `explored_tiles` table with `player_id, zone_id, tile_x, tile_y, explored_at`
- Before broadcasting entity updates, check if entity position is in player's explored set
- Send fog state with zone data: `zone:state` includes `exploredTiles: Array<{x, y}>` so client knows what to render
- Use separate channels for revealed vs hidden data:
  - `entity:spawn` only for visible entities
  - `fog:revealed` event when new area explored, includes newly visible entities
- Consider grid-based exploration (8x8 tile sectors) instead of per-tile for performance
- For anti-cheat: server validates actions against fog state (can't interact with entities in fog)

**Warning signs:**
- Players consistently find hidden resources immediately after entering zone
- Players navigate directly to POIs without exploring fog
- Community reports of "map hacks" or "ESP cheats"
- Players intercept other players in unexplored areas (shouldn't know they're there)

**Phase to address:**
Phase 2 (Fog of War) - implement authoritative filtering from day 1, don't add later as retrofit

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Client-side only fog rendering (no server filtering) | Fast to implement, low server CPU | Enables cheating, must be rewritten for anti-cheat | **Never** - multiplayer games must validate visibility server-side |
| Storing gathering progress only in memory | Simpler state management | Lost progress on disconnect/restart, exploit risks | Only in early prototype before multiplayer testing |
| Using POI coordinates instead of stable IDs | Don't need ID generation logic | Progress breaks when regenerating zones, migration nightmares | Only if zones NEVER regenerate (hub zones only) |
| Linear damage scaling (damage = base + power * 0.5) | Easy to understand and tune | Creates exponential power creep at high stats | Acceptable for early testing, must add diminishing returns before level 20+ content |
| Broadcasting all entity updates to zone (no visibility filtering) | Simpler network code, no per-player filtering | Bandwidth explosion with many entities, cheating potential | Only in single-player or LAN games with trusted clients |
| Polling-based fog of war updates (check explored tiles every frame) | Straightforward implementation | Performance degrades with large explored areas | Acceptable if explored tile count < 1000, event-based better |
| Optimistic discovery rewards (award before server confirms persistence) | Feels responsive, instant gratification | Duplicate rewards on reconnect, rollback complexity | Never - rewards must be transactional |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Phaser + WebSocket (gathering) | Sending gather completion event on animation end without lag compensation | Send event when mini-game completes, include client timestamp, server validates timing within latency threshold |
| ChunkManager + Fog of War | Assuming chunk loaded = visible, rendering all entities in loaded chunks | Separate chunk data (terrain) from entity visibility (fog-filtered), check both before rendering |
| Client-Side Prediction + Gathering | Predicting gathering success/failure before server validates | Only predict "in progress" state, wait for server for outcome |
| WebSocket Rooms (3x3 grid) + POI Discovery | Broadcasting POI discovery to entire 3x3 grid | Only broadcast to players in same zone OR who have explored that POI's area |
| Zustand Store + Fog State | Storing full fog grid in single state object, triggers re-render on every tile explore | Use chunked fog state, only re-render affected sectors |
| Database + Discovery Tracking | Querying all POIs for zone on every mastery calculation | Cache total POI count per zone, only query discoveries table |
| Entity Sync + Gathering Nodes | Treating gathering nodes as static entities (no state changes) | Nodes are stateful (available/locked/depleted), broadcast state changes to zone |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sending fog grid updates per tile explored | WebSocket message flood, client lag on exploration bursts | Batch fog updates into 100ms windows, send single `fog:batch_revealed` event | Breaks with >10 tiles/second exploration (sprinting through new area) |
| Querying database for every discovery check | 50-100ms latency on discovery, database connection pool exhaustion | Cache discoveries in Redis with TTL, only query on cache miss | Breaks with >100 concurrent players discovering POIs |
| Broadcasting POI discovery to all online players | Message queue backup, client UI spam | Only broadcast to players in same zone or who have that zone explored | Breaks with >50 concurrent discoveries (launch day, events) |
| Recalculating zone mastery on every discovery | Unnecessary computation, UI stutters | Increment counter, only recalculate mastery on zone load | Breaks with >10 discoveries/second (not a realistic scenario) |
| Rendering full fog of war grid every frame | FPS drops below 30 in large zones | Render fog as tilemap layer, only redraw changed sectors | Breaks with grid >100x100 tiles |
| Storing gathering instance state in PostgreSQL | 10-50ms writes on gather start/complete, connection pool exhaustion | Use Redis for transient gathering state, only persist completion to DB | Breaks with >20 concurrent gathering sessions per server |
| Filtering visible entities per player on every tick | O(players * entities) server CPU cost | Calculate visibility on movement/spawn only, cache until position changes | Breaks with >50 players and >500 entities in zone |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-reported mini-game success | Players auto-complete gathering without playing mini-game | Server validates timing (start→complete time matches expected duration ± latency) |
| Sending hidden entity positions to client | ESP hacks reveal enemies, resources through fog of war | Server-side fog filtering: don't send entity data for unexplored areas |
| Not validating gathering node proximity on completion | Players gather from anywhere in zone (teleport hack, desync exploit) | Server checks player within 2 tiles of node on completion |
| Client-determined discovery rewards | Modified clients grant max rewards, duplicate discovery events | Server calculates rewards, validates discovery is new before granting |
| No rate limiting on discovery events | Spam discovery events to DOS server or duplicate rewards | Rate limit: max 1 discovery per player per second, max 10 per minute |
| Exposing total POI count before exploration | Players know when they've found "all" POIs, removes exploration mystery | Only send discovered count, hide total until 100% mastery achieved |
| Allowing gathering during combat | Exploit: gather while immune/invulnerable, bypass combat mechanics | Server cancels gathering on combat initiation, validates not in combat on start |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback when gathering interrupted | Player confused why progress disappeared | Show interrupt reason: "Gathering cancelled - you moved too far" / "Interrupted by combat" |
| Fog of war "snap" reveals (instant transition) | Disorienting, hard to track what just appeared | Animated fog fade (300ms), highlight newly revealed POIs for 2 seconds |
| Discovery markers spam screen when entering new zone | UI clutter, can't see important markers (quest, enemy) | Batch reveal: "5 new discoveries!" with collapsible list, not 5 separate toasts |
| No progress indication on gathering mini-games | Frustrating, feels unresponsive, player repeats input | Show immediate progress bar, client-side feedback (visual pulse), wait for server result |
| Zone mastery percentage updates only on relog | Hidden progress, no sense of advancement | Update mastery live on each discovery, show "X% → Y%" animation |
| POIs all look identical until discovered | No reason to explore one direction vs another | Show POI category icons through fog (building, resource, landmark) but hide name/details until discovered |
| Gathering nodes respawn with no indication | Player wastes time checking depleted nodes | Show respawn timer on hover (even while depleted), or fade out depleted nodes |

---

## "Looks Done But Isn't" Checklist

- [ ] **Gathering System:** Often missing interruption on combat - verify gathering cancels when player enters combat
- [ ] **Fog of War:** Often missing server-side filtering - verify client doesn't receive entity data for fog-obscured areas
- [ ] **POI Discovery:** Often missing idempotency checks - verify same POI can't be discovered twice, rewards not duplicated
- [ ] **Zone Mastery:** Often missing POI total caching - verify mastery percentage stable across zone regeneration
- [ ] **Combat Balancing:** Often missing TTK testing across level ranges - verify time-to-kill is consistent for levels 1-20
- [ ] **Gathering Nodes:** Often missing lock release on disconnect - verify node unlocks when player disconnects mid-gather
- [ ] **Discovery State:** Often missing reconnect sync - verify discoveries persist and sync correctly on reconnect
- [ ] **Fog Rendering:** Often missing chunked updates - verify fog updates don't trigger full grid re-render
- [ ] **Gathering Mini-Games:** Often missing lag compensation - verify high-latency players can succeed at timing-based checks
- [ ] **POI IDs:** Often missing stable ID generation - verify POI IDs remain constant across zone regeneration

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| No server-side fog filtering (client has all entity data) | **HIGH** - requires protocol refactor + migration | 1. Add `exploredTiles` tracking to database 2. Implement server-side visibility filter 3. Update client to handle partial entity data 4. Deploy with backward compatibility flag 5. Migrate existing players (mark current zone as fully explored) |
| Gathering node locks stuck forever | **LOW** - add cleanup cron job | 1. Add TTL to gathering sessions (5 min) 2. Run hourly cleanup: remove locks older than TTL 3. Add monitoring for stuck locks 4. Fix root cause (disconnect handling) in next sprint |
| POI discoveries lost on disconnect | **MEDIUM** - add transaction handling | 1. Wrap discovery in database transaction 2. Add retry logic for failed writes 3. Implement discovery sync on reconnect 4. Audit existing discoveries, mark suspicious duplicates |
| Client-side predicted gathering outcomes | **MEDIUM** - refactor UI state management | 1. Add "completing" state between "in progress" and "complete" 2. Update UI to wait for server before celebration 3. Add rollback animation for rejected completions 4. Test with simulated latency (200-500ms) |
| Zone mastery uses live POI regeneration | **MEDIUM** - add caching layer | 1. Create `zone_metadata` table with `total_pois` 2. Backfill totals for existing zones (regenerate once, cache result) 3. Update mastery calculation to use cached total 4. Add migration for POI generation changes |
| Linear damage scaling causes one-shots at high level | **MEDIUM** - add diminishing returns formula | 1. Model new damage curve in spreadsheet 2. Implement scaling formula with tests 3. Deploy with gradual rollout (A/B test) 4. Monitor TTK analytics, adjust coefficients 5. Communicate changes to players |
| No gathering interruption on movement | **LOW** - add position check | 1. Track gathering start position 2. On player:moved, check distance from start 3. If >2 tiles, cancel gathering 4. Broadcast gathering:cancelled 5. Add unit test for interrupt scenarios |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Gathering node race conditions | Phase 1 (Foundation) | Test: 2 players simultaneously gather same node - only 1 succeeds, other gets "already claimed" error |
| Client prediction desync in mini-games | Phase 1 (Mini-Games) | Test: Complete mini-game with 200ms simulated latency - outcome matches server, no visual rollback |
| Fog bandwidth explosion | Phase 2 (Fog of War) | Test: Load zone with 100 entities - client only receives visible entities (<20), network usage <10KB/s |
| POI discovery state divergence | Phase 3 (Discovery) | Test: Discover POI, force disconnect, reconnect - discovery persists, reward granted once |
| Combat balance breaks | Phase 4 (Balancing) | Test: Run damage formula tests for levels 1/5/10/15/20 - all within TTK range (8-15 hits) |
| Zone mastery progress resets | Phase 5 (Mastery) | Test: Complete 50% mastery, regenerate zone with same seed - mastery still 50%, POI count unchanged |
| Gathering progress interruption | Phase 1 (Foundation) | Test: Start gathering, enter combat - gathering cancels, node unlocks |
| Fog of war ESP exploit | Phase 2 (Fog of War) | Security test: Inspect client memory - no entity data for fog-obscured areas |

---

## Sources

### Official Documentation & Technical References
- [Client-Side Prediction and Server Reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) - Gabriel Gambetta's authoritative guide on multiplayer networking
- [Client side prediction and server reconciliation with Node.js + Socket.IO + Phaser](https://alankydd.wordpress.com/2017/07/31/client-side-prediction-and-server-reconciliation-with-node-js-socket-io-phaser/) - Phaser-specific implementation patterns
- [Lag Compensation - Gabriel Gambetta](https://www.gabrielgambetta.com/lag-compensation.html) - Timing validation for skill-based mechanics
- [Replication in network games: Bandwidth (Part 4)](https://0fps.net/2014/03/09/replication-in-network-games-bandwidth-part-4/) - Bandwidth optimization and state partitioning
- [Server In-game Protocol Design and Optimization - Valve Developer Community](https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization) - Industry-standard lag compensation techniques

### Community Discussions & Post-Mortems
- [Fog of war implementation in multiplayer and its difficulties - Unity Discussions](https://answers.unity.com/questions/1478174/fog-of-war-implementation-in-multiplayer-and-its-d.html) - Common fog of war pitfalls
- [Why can someone steal a resource after you're already engaging with it? - Elder Scrolls Online](https://forums.elderscrollsonline.com/en/discussion/572261/why-can-someone-steal-a-resource-after-youre-already-engaging-with-it) - Gathering race condition frustrations
- [Time to Kill and Action Combat MMOs - MMORPG.com Forums](https://forums.mmorpg.com/discussion/498765/time-to-kill-and-action-combat-mmos-where-the-balance-here) - TTK balancing challenges
- [Gathering profession node spawns/respawns/locations are incorrect - AzerothCore](https://github.com/azerothcore/azerothcore-wotlk/issues/4518) - Resource node synchronization issues
- [Multiplayer Damage Scaling BORKED? - Lords of the Fallen](https://steamcommunity.com/app/1501750/discussions/0/3880472899733036670/) - Damage scaling pitfalls

### Game-Specific Research
- [RTS Fog of War - jdxdev](https://www.jdxdev.com/blog/2022/06/08/rts-fog-of-war/) - Performance optimization for visibility systems
- [How balance can affect difficulty - GameDeveloper.com](https://www.gamedeveloper.com/design/how-balance-can-affect-difficulty) - Balance testing methodology
- Project codebase analysis:
  - `apps/game-server/src/game/game.gateway.ts` - Current WebSocket event handling patterns
  - `apps/web/src/game/systems/MovementController.ts` - Existing client-side prediction implementation
  - `apps/web/src/game/rendering/ChunkManager.ts` - Current 3x3 chunk streaming architecture
  - `packages/game-logic/src/visibility/range.ts` - Visibility range calculations and entity filtering

---

*Pitfalls research for: Into the Void - Gathering, Exploration, Combat Balancing*
*Researched: 2026-02-23*
