# Pitfalls Research

**Domain:** Multiplayer 2D MMO - Post-Login Game Experience Integration
**Researched:** 2026-02-14
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: WebSocket Auth Without Handshake Validation

**What goes wrong:**
Token validation happens AFTER auth event is emitted, allowing unauthenticated clients to send game events (move, interact, chat) before authentication completes. The current implementation authenticates via `@SubscribeMessage('auth')` but doesn't prevent clients from calling other message handlers before auth succeeds.

**Why it happens:**
NestJS WebSocket guards must be explicitly added to prevent this. Socket.IO middleware runs on connection, but NestJS @SubscribeMessage handlers are independently accessible without guards. Developers assume the auth event alone secures the gateway.

**How to avoid:**
- Add WebSocket guards to ALL message handlers except 'auth'
- Implement middleware that validates JWT during initial handshake, not just in auth handler
- Store authenticated state in socket data (`socket.data.authenticated = true`) after successful auth
- Reject all non-auth events if `socket.data.authenticated !== true`
- Use NestJS execution order: Middleware → Guards → Interceptors → Pipes → Handler

**Warning signs:**
- Players can send movement commands before auth:success response
- Server logs show "player not found" errors for valid socket IDs
- handleDisconnect() runs before handleAuth() completes
- Race conditions where player joins zone before authentication finishes

**Phase to address:**
Phase 1 (WebSocket Connection & Auth Handshake) - Must be bulletproof before any game state syncing

---

### Pitfall 2: Race Condition Between Socket Join and Async Database Queries

**What goes wrong:**
Socket disconnects while database query is in-flight, then `socket.join(roomId)` executes AFTER disconnect. This creates ghost players in rooms who can never leave, causing permanent memory leaks and incorrect player counts. The current gateway implementation has async database calls between auth validation and room joining.

**Why it happens:**
Socket.IO allows joining rooms even after socket is destroyed if the async operation started before disconnect. Database latency (even 50ms) creates a window where disconnect can happen. `handleAuth()` has multiple await points before `client.join(zoneId)` executes.

**How to avoid:**
- Check `client.connected` status BEFORE every `client.join()` call
- Perform all async operations (DB queries) before starting socket mutations
- Use atomic pattern: validate → fetch data → check still connected → mutate socket state
- Add timeout to auth handler (5 seconds max) to prevent hanging connections
- Implement cleanup verification in handleDisconnect that force-removes from all rooms

**Warning signs:**
- Zone player counts don't match actual connected players
- Players see themselves duplicated in player lists
- Server memory grows over time (room leaks)
- "player:left" events never fire for some disconnects
- Error logs showing "Cannot join room on destroyed socket"

**Phase to address:**
Phase 1 (WebSocket Connection & Auth Handshake) - Race conditions must be eliminated before phase 2

---

### Pitfall 3: Phaser Game Instance Memory Leaks on React Unmount

**What goes wrong:**
Calling `game.destroy()` in useEffect cleanup doesn't fully clean up Phaser. The "world" group and "cache" remain in memory. Event listeners on window/document persist. Multiple re-mounts (like navigating away and back) create multiple Phaser instances, causing 500MB+ memory bloat and eventual browser crashes.

**Why it happens:**
Phaser's destroy() method has known incomplete cleanup. React's frequent re-rendering conflicts with canvas-based libraries. Developers assume destroy() handles everything. WebGL contexts, texture atlases, and event listeners require manual cleanup.

**How to avoid:**
- Use `useLayoutEffect` (not useEffect) for Phaser initialization to ensure sync timing
- Manual cleanup sequence in unmount:
  ```typescript
  game.cache.destroy();
  game.world.destroy();
  game.events.removeAllListeners();
  window.removeEventListener('resize', resizeHandler);
  game.destroy(true); // true = remove canvas
  ```
- Store cleanup functions in ref to ensure they execute even on abrupt unmounts
- Only initialize Phaser once - use ref to prevent double initialization in StrictMode
- Consider iframe isolation for complete sandbox if memory issues persist

**Warning signs:**
- Browser DevTools memory profiler shows increasing heap size
- Multiple canvas elements in DOM after navigation
- "Maximum call stack exceeded" errors after several mounts/unmounts
- Texture loading errors on second game initialization
- FPS degradation after returning to game screen multiple times

**Phase to address:**
Phase 2 (Phaser Integration & Canvas Setup) - Must be solved before entity rendering to prevent cascading issues

---

### Pitfall 4: Client Prediction Without Server Reconciliation

**What goes wrong:**
Client predicts movement immediately for responsiveness but never reconciles with server state. Players can walk through walls client-side, appear in impossible positions to other players, or desync permanently after packet loss. Position divergence grows over time.

**Why it happens:**
Implementing instant client response is easy. Adding reconciliation is complex. Developers ship "feels responsive" without "stays in sync." The pattern requires sequence numbers, input buffering, and state rollback that aren't obvious requirements.

**How to avoid:**
- Every client input must have sequence number sent to server
- Client stores last N inputs (buffer ~100ms worth)
- Server includes last processed sequence number in every state update
- Client rewinds to that sequence, applies unacknowledged inputs, fast-forwards to present
- Use authoritative server pattern - server position is ALWAYS truth
- Implement smoothing (linear interpolation over 100-200ms) for corrections, not instant snapping
- Add visual feedback when prediction was wrong (particle effect, sound cue)

**Warning signs:**
- Player positions differ between clients viewing same zone
- Players teleport backward occasionally (server correction without smoothing)
- Movement feels great on localhost but terrible on high latency
- Players report "walking through walls" or "getting stuck in terrain"
- Combat hits/misses disagree between attacker and target perspectives

**Phase to address:**
Phase 3 (Movement Validation & Sync) - Core pattern must be established here, not retrofitted later

---

### Pitfall 5: Entity Interpolation Missing or Misconfigured

**What goes wrong:**
Remote players/entities render exactly at positions from server updates (10-20Hz). Movement looks choppy and jittery. Players complain about "laggy" visuals even though network latency is fine. Attempting to fix by increasing update frequency overloads network.

**Why it happens:**
Rendering entities directly from server snapshots without interpolation. Developer assumes 20 updates/second is enough (it's not for smooth 60fps rendering). Lack of understanding that rendering should be time-delayed by ~100ms to always have "future" state to interpolate toward.

**How to avoid:**
- Client maintains buffer of 2-3 most recent server states per entity
- Render entities 100ms in the past (configurable, called "interpolation delay")
- For each frame, find two snapshots that bracket the render time
- Linearly interpolate position/rotation between those snapshots
- Handle buffer starvation (packet loss): extrapolate using last known velocity for max 200ms, then freeze
- Never snap positions - always smooth transitions even during catch-up

**Warning signs:**
- Remote players move in visible "steps" not smooth motion
- Animation frames don't match movement speed (sliding/skating)
- High FPS but still looks choppy for remote entities
- Extrapolation causing players to "overshoot" then rubber-band back
- Movement appears smooth for local player, jittery for everyone else

**Phase to address:**
Phase 4 (Entity Rendering & Registry) - Must be implemented when first entity rendering happens

---

### Pitfall 6: Zustand Store Updates Inside Phaser Game Loop

**What goes wrong:**
Calling Zustand setters from Phaser's update() loop (60 times/second) triggers React re-renders on every frame. UI becomes sluggish, FPS tanks, browser becomes unresponsive. The "Maximum update depth exceeded" error appears from infinite update loops.

**Why it happens:**
Phaser update loop runs at frame rate. Each Zustand update triggers subscriber notifications. React components re-render synchronously. Developers treat Zustand like a game state store when it's a React state manager. Mixing render loops (Phaser @ 60fps, React @ UI events) causes thrashing.

**How to avoid:**
- Phaser game state lives in Phaser (game.data, scene.data, or custom manager)
- Zustand only holds UI-relevant state (menus, chat, inventory open/closed)
- Use event-driven updates to Zustand, not continuous polling
- Debounce/throttle any Zustand updates from game loop (max 10/second)
- Prefer Phaser events → Socket events → Server → Zustand flow
- Use shallow equality checks and specific selectors to minimize re-renders

**Warning signs:**
- FPS drops to 10-20 when UI components are mounted
- React DevTools profiler shows components re-rendering every frame
- Chat/inventory UI lags when opening/typing
- Browser DevTools shows warning about "Maximum update depth"
- State updates work fine for 1 minute then freeze browser

**Phase to address:**
Phase 2 (Phaser Integration) and Phase 5 (State Management Bridge) - Architectural boundary must be clear from start

---

### Pitfall 7: Missing Reconnection State Recovery

**What goes wrong:**
Player disconnects (network hiccup, mobile switching WiFi to cellular), reconnects with new socket ID, but game server treats them as brand new connection. Player loses position, zone state, combat status. Server sees "ghost" player from old session still in game.

**Why it happens:**
Socket.IO assigns new socket ID on reconnection. Server keys everything by socket ID not player/character ID. No reconnection window grace period. No session restoration logic. `handleDisconnect` immediately purges all player state.

**How to avoid:**
- Store session data by characterId + userId, not socket ID
- Implement grace period (30-60 seconds) before purging disconnected player state
- On auth, check if characterId is already "in-game" with different socket
- Gracefully transfer state from old socket to new socket
- Re-subscribe to zones, restore combat state, resend missed events
- Provide UI feedback: "Reconnecting..." → "Restoring session..." → "Connected"
- Client maintains queue of sent-but-unacknowledged events to replay on reconnect

**Warning signs:**
- Players lose progress when network blips occur
- Duplicate players appear briefly (old session + new session)
- Combat state lost mid-fight after reconnect
- "Already in zone" errors preventing rejoining
- Players complain about being "kicked" during mobile gameplay

**Phase to address:**
Phase 1 (WebSocket Connection) - Recovery pattern must exist before complex state is introduced

---

### Pitfall 8: NestJS Guard/Middleware Execution Order Confusion

**What goes wrong:**
WebSocket guards are added but auth still fails unexpectedly. JWT validation runs BEFORE character ownership check, allowing players to authenticate with valid JWT but control other players' characters. Or guards run in wrong order causing database queries to happen before auth.

**Why it happens:**
NestJS execution order is non-obvious: Middleware → Global Guards → Controller Guards → Route Guards → Interceptors → Pipes. Multiple guards execute in binding order. WebSocket gateways can't use middleware directly - need custom adapter. Developers assume guards are "auth" but they're generic CanActivate checks.

**How to avoid:**
- Understand execution order: Middleware → Guards (global, controller, route) → Handler
- For WebSockets, create IoAdapter to add middleware for handshake-level checks
- Guards should check `socket.data` set by earlier middleware/guards
- Order matters: AuthGuard before CharacterOwnershipGuard before ZoneAccessGuard
- Use @UseGuards() with array in correct order: `@UseGuards([AuthGuard, OwnershipGuard])`
- Document guard dependencies and required socket.data fields

**Warning signs:**
- Guards pass sometimes, fail other times for same conditions
- Database queries in guards causing performance issues
- "Unauthorized" errors even with valid tokens
- Player can control characters they don't own
- Guard execution logs show unexpected order

**Phase to address:**
Phase 1 (WebSocket Auth) - Guard architecture must be correct before building on it

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| No client-side prediction (wait for server) | Simple to implement, no sync issues | Feels sluggish (RTT latency visible), poor UX on high ping | MVP only - must fix by beta |
| Direct position snapping (no interpolation) | Easy rendering logic | Choppy visuals, looks unprofessional | Prototype phase, replace in Phase 4 |
| Store Phaser instance in Zustand | Convenient access from React | Memory leaks, coupling issues, re-render problems | Never - architecturally wrong |
| Socket ID as player identifier | Matches Socket.IO model | Reconnection impossible, session recovery broken | Never - use characterId |
| Global event listeners without cleanup | Quick prototyping | Memory leaks, duplicate handlers | Prototype only |
| Auth via query params instead of handshake | Easier debugging | Security risk (logged URLs), timing issues | Local dev only |
| Single-threaded game loop and networking | Simpler architecture | Poor performance at scale | Acceptable until 50+ concurrent players/zone |
| Manual room management without abstraction | Direct Socket.IO usage | Hard to debug, race conditions | Never for production |

## Integration Gotchas

Common mistakes when connecting components.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| React → Phaser | Creating Phaser game in useEffect without cleanup | Use useLayoutEffect + comprehensive cleanup (cache, world, events) + ref to prevent double-init |
| Phaser → React | Calling Zustand from Phaser update loop | Event-driven updates only, debounce to max 10/sec |
| Socket.IO → NestJS | Assuming @SubscribeMessage provides auth | Add guards to every handler, validate socket.data.authenticated |
| JWT → WebSocket | Validating token in message handler instead of handshake | Use IoAdapter middleware for handshake auth |
| Client Events → Server | Sending events before auth:success response | Queue events client-side until authenticated flag is true |
| Server State → Client Rendering | Rendering server updates at exact timestamps | Maintain 2-3 state buffer, render 100ms in past, interpolate |
| Zone Transitions | Leaving old room before new room state is ready | Fetch new zone state BEFORE leaving old room, atomic swap |
| Character Selection → Game | Starting WebSocket connection before character selected | Wait for character selection, pass characterId to connection |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Broadcasting all entity updates to all zone players | Works fine initially | Send only visible entities based on view distance | 20+ players in one zone |
| Storing entire zone state in client memory | Convenient full access | Use viewport-based culling, load entities on-demand | Zones with 1000+ entities |
| Sending zone:state on every player movement | Seems responsive | Send incremental updates (entity:update), full state only on join/zone change | 10+ players moving simultaneously |
| Validating every input with database query | Ensures correctness | Cache player state in memory, sync to DB periodically | 100+ actions/second server-wide |
| No spatial partitioning for collision/visibility | Simple O(n²) checks | Use quadtree or grid-based spatial hash | 50+ entities in visibility range |
| Texture atlases loaded per-entity | Easy asset management | Preload shared atlases on scene start | 20+ unique entity types |
| Unthrottled chat messages | Real-time feel | Rate limit (5 msg/sec per player) + cooldown | First spam attack |
| WebSocket events without message size limit | Flexible payloads | Enforce max message size (10KB), reject over-limit | First malicious client |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client position updates | Teleportation hacks, wall clipping | Server validates all movement with game-logic package, reject impossible moves |
| No rate limiting on WebSocket events | DDoS via spam events, server overload | Rate limit per event type (move: 60/sec, interact: 10/sec, chat: 5/sec) |
| Sending other players' JWT/characterIds to client | Account takeover, impersonation | Strip sensitive fields, only send PlayerPublic type |
| Using predictable entity/room IDs | Zone/player enumeration attacks | Use UUIDs for all IDs, validate access rights |
| No input sanitization on chat | XSS if displayed in web UI, injection | Sanitize + length limit all text inputs before broadcast |
| Allowing unauthenticated socket connections | Resource exhaustion | Disconnect unauthenticated sockets after 5 second timeout |
| Exposing internal game state in error messages | Information leakage | Generic error messages to client, detailed logs server-side only |
| No validation of characterId ownership | Player can control any character | Verify JWT userId matches character owner in database |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback during authentication | User doesn't know if login worked | Show "Connecting..." → "Authenticating..." → "Loading zone..." states |
| No reconnection UI | User assumes game crashed | Display "Connection lost, reconnecting..." with retry countdown |
| Instant position corrections (snapping) | Jarring teleportation, feels broken | Smooth interpolation over 100-200ms with easing |
| No indication when server rejects action | Silent failures frustrate users | Visual feedback (red flash, error message) on rejection |
| Missing transition when changing zones | Disorienting instant switch | Fade out → load → fade in with loading indicator |
| No offline mode or graceful degradation | Total failure on disconnect | Queue actions locally, sync when reconnected |
| Entities pop in/out without animation | Unprofessional, jarring | Spawn/despawn animations (fade, scale) |
| No indication of other players' network state | Can't tell if they're lagging | Show latency indicator, gray out laggy players |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **WebSocket Auth:** Often missing guard on non-auth handlers — verify every @SubscribeMessage has @UseGuards except 'auth'
- [ ] **Phaser Cleanup:** Often missing cache/world destroy — check useEffect return has full cleanup sequence
- [ ] **Movement Sync:** Often missing server reconciliation — verify client rewinds state when server update arrives
- [ ] **Entity Interpolation:** Often missing interpolation delay — check entities render in past, not at exact server time
- [ ] **Reconnection:** Often missing session restoration — verify characterId can reconnect and resume state
- [ ] **Zone Transitions:** Often missing atomic room swap — verify new zone loaded before leaving old zone room
- [ ] **Error Handling:** Often missing client-side error display — verify 'error' event shows user-facing message
- [ ] **Input Validation:** Often missing impossible move rejection — verify server uses game-logic package for validation
- [ ] **Memory Cleanup:** Often missing event listener removal — verify window/document listeners cleaned up on unmount
- [ ] **Race Conditions:** Often missing socket.connected check — verify client.join() checks connection status first

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Auth without guards | MEDIUM | Add WsAuthGuard, create IoAdapter middleware, migrate handlers incrementally |
| Room join race condition | LOW | Add socket.connected check before joins, force cleanup on disconnect |
| Phaser memory leaks | LOW | Add comprehensive cleanup in useLayoutEffect return, test with mount/unmount cycles |
| No client prediction | HIGH | Requires refactor - add sequence numbers, input buffer, reconciliation logic |
| Missing interpolation | MEDIUM | Add state buffer to entity manager, implement lerp in render loop |
| Zustand in game loop | MEDIUM | Extract Phaser state to separate manager, refactor to event-driven updates |
| No reconnection | HIGH | Requires session system - store by characterId, add grace period, restoration logic |
| Wrong guard order | LOW | Reorder @UseGuards array, document dependencies, add integration test |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| WebSocket auth without guards | Phase 1: Connection & Auth | Test: Send 'player:move' before 'auth' → should reject |
| Room join race condition | Phase 1: Connection & Auth | Test: Disconnect during auth → no ghost player in room |
| Phaser memory leaks | Phase 2: Phaser Integration | Test: Mount/unmount 10 times → heap size stable |
| Missing client prediction | Phase 3: Movement Validation | Test: 200ms latency → movement feels instant locally |
| Missing interpolation | Phase 4: Entity Rendering | Test: Remote player moves smoothly at 60fps with 20Hz updates |
| Zustand in game loop | Phase 2 & 5: Integration & State Bridge | Test: FPS stable with UI components mounted |
| No reconnection | Phase 1: Connection & Auth | Test: Close WebSocket → reconnect → session restored |
| Guard execution order | Phase 1: Connection & Auth | Test: Guards run in documented order, auth before ownership |

## Sources

**WebSocket & Socket.IO:**
- [Socket.IO Middlewares Documentation](https://socket.io/docs/v4/middlewares/)
- [Socket.IO JWT Authentication Guide](https://socket.io/how-to/use-with-json-web-tokens)
- [GitHub Issue: socket.join room leak #4380](https://github.com/socketio/socket.io/issues/4380)
- [WebSocket Reconnection Best Practices](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view)
- [Socket.IO Room Management for Character Selection](https://blog.yarsalabs.com/real-time-character-selection-for-multiplayer-game-using-socket/)

**Phaser & React Integration:**
- [The Wrong Way to Integrate Phaser With React](https://medium.com/@larry.sassainsworth/the-wrong-way-to-integrate-phaser-with-react-d85e3b226cf9)
- [GitHub Issue: Game.destroy() throws error in React #4305](https://github.com/phaserjs/phaser/issues/4305)
- [GitHub Issue: Phaser memory leak #2138](https://github.com/photonstorm/phaser/issues/2138)
- [Phaser React Integration Tutorial by Leo Kuo](https://leokuo0724.medium.com/how-to-integrate-phaser-into-react-a7119e428228)
- [Official Phaser React Template](https://github.com/phaserjs/template-react)

**Multiplayer Networking:**
- [Client-Side Prediction and Server Reconciliation - Gabriel Gambetta](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)
- [Source Multiplayer Networking - Valve](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)
- [Lag Compensation Methods - Valve](https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization)
- [Entity Interpolation and Prediction](https://www.oreilly.com/library/view/unity-multiplayer-games/9781849692328/ch06.html)
- [How Multiplayer Games Sync State - Medium](https://medium.com/@qingweilim/how-do-multiplayer-games-sync-their-state-part-1-ab72d6a54043)

**NestJS Architecture:**
- [NestJS Guards Execution Order Issue #1567](https://github.com/nestjs/docs.nestjs.com/issues/1567)
- [Guards vs Middlewares vs Interceptors in NestJS](https://medium.com/@kevinpatelcse/guards-vs-middlewares-vs-interceptors-vs-pipes-in-nestjs-a-comprehensive-guide-37841a7873f1)
- [NestJS WebSocket Guards Documentation](https://docs.nestjs.com/websockets/guards)
- [Understanding Guards in NestJS - LogRocket](https://blog.logrocket.com/understanding-guards-nestjs/)

**State Management:**
- [Zustand Performance Pitfalls](https://philipp-raab.medium.com/zustand-state-management-a-performance-booster-with-some-pitfalls-071c4cbee17a)
- [Taming Infinite Loop with Zustand](https://medium.com/@oladejoboluwatife10/taming-the-infinite-loop-how-we-fixed-a-react-native-state-management-bug-with-zustand-20c8664ebb90)
- [React State Management Performance Issues](https://medium.com/@bloodturtle/react-state-management-why-context-api-might-be-causing-performance-issues-and-how-zustand-can-ec7718103a71)

**Graphics & Rendering:**
- [Phaser Texture Atlas Bleeding Issues](https://docs.phaser.io/phaser/concepts/textures)
- [Input Buffering in Games - Wayline](https://www.wayline.io/blog/art-of-input-buffering)
- [Dealing with Network Latency - Unity](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/learn/dealing-with-latency.html)

---
*Pitfalls research for: Multiplayer 2D MMO Post-Login Game Experience*
*Researched: 2026-02-14*
*Overall Confidence: HIGH (combination of official docs, established patterns, and validated against existing codebase)*
