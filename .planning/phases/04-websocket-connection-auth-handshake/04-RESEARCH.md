# Phase 4: WebSocket Connection & Auth Handshake - Research

**Researched:** 2026-02-14
**Domain:** Real-time multiplayer networking with WebSocket authentication
**Confidence:** HIGH

## Summary

This phase implements secure WebSocket connection between the React/Phaser client and NestJS game-server, with JWT-based authentication and real-time game state synchronization. The codebase already has foundational Socket.IO infrastructure (v4.7) in place with basic authentication flow, but requires enhancement for production-ready reconnection, latency monitoring, client-side prediction, and comprehensive error handling.

The existing implementation uses Socket.IO v4.7 with @nestjs/websockets v10.3.0, already handling auth handshakes via `auth` event with JWT validation against character ownership. The client uses a singleton GameSocket class with typed event handlers. Research confirms this stack is industry-standard for real-time multiplayer games.

**Primary recommendation:** Enhance existing Socket.IO implementation with connection state recovery (Socket.IO v4+ feature), implement application-layer ping/pong for latency measurement, add client-side prediction with server reconciliation for movement, and create comprehensive UI feedback for all connection states and errors.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Connection Status UI:**
- Corner indicator (small icon/dot), always visible
- Green when connected, yellow/red for issues — player always knows state
- Show latency/ping indicator alongside connection status (ms or colored bars)

**Initial State Delivery:**
- Loading screen with progress bar + rotating gameplay tips/lore snippets
- World appears fully loaded after loading completes (not progressive)
- Everything at once: terrain, entities, other players all arrive together before showing world
- Player appears at exact last position regardless of safety

**Error Handling & Feedback:**
- Auth failure (invalid/expired token): redirect immediately to login screen with error message
- Server unavailable: modal overlay over current screen with retry option
- Error messages: player-friendly with error code for support reference (e.g., "Connection lost (E-1042)")
- Invalid character (deleted/locked): redirect to character selection screen with explanation

### Claude's Discretion

- Reconnection UI approach (modal overlay vs non-blocking indicator)
- Exact reconnection timing and retry strategy
- Loading screen layout and tip rotation logic
- Error code numbering scheme
- Reconnection behavior: blocking vs non-blocking during reconnect (pick best approach for this game type)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| socket.io | ^4.7.0 | Server-side WebSocket library | Industry standard for real-time apps, automatic reconnection, room management, broadcast capabilities |
| socket.io-client | ^4.7.0 | Client-side WebSocket library | Matches server version, typed events, built-in reconnection logic |
| @nestjs/websockets | ^10.3.0 | NestJS WebSocket module | Official NestJS integration, decorator-based event handlers |
| @nestjs/platform-socket.io | ^10.3.0 | Socket.IO adapter for NestJS | Bridges NestJS and Socket.IO, enables dependency injection in gateways |
| @nestjs/jwt | ^10.2.0 | JWT token verification | Already used for REST API auth, reused for WebSocket validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | (existing) | Client-side state management | Store connection state, latency, player data — already in use |
| Phaser | (existing) | Game rendering engine | Client-side prediction, sprite interpolation, scene management |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Socket.IO | Native WebSocket API | Socket.IO provides automatic reconnection, rooms, fallback transports — worth the abstraction layer for multiplayer games |
| Socket.IO | ws library | Lower-level control but lose automatic reconnection, broadcasting, namespace features — only worthwhile for massive scale (10k+ concurrent) |
| Application-layer ping | WebSocket Ping/Pong frames | Browser WebSocket API doesn't expose native ping/pong — must implement at application layer |

**Installation:**
Already installed in package.json. No additional dependencies required.

## Architecture Patterns

### Recommended Project Structure
```
apps/game-server/src/
├── game/
│   ├── game.gateway.ts       # Socket.IO event handlers (EXISTING)
│   ├── player.service.ts     # Player state, auth (EXISTING)
│   └── game.service.ts       # Game logic orchestration (EXISTING)
apps/web/src/
├── network/
│   ├── socket.ts             # GameSocket singleton (EXISTING)
│   └── reconnection.ts       # Reconnection strategy (NEW)
├── components/
│   ├── ConnectionIndicator.tsx  # Corner status + latency (NEW)
│   └── LoadingScreen.tsx        # Progress + tips (NEW)
├── store/
│   └── gameStore.ts          # Zustand store (EXISTING)
```

### Pattern 1: WebSocket Authentication with Middleware (NestJS)

**What:** Validate JWT tokens in WebSocket handshake before allowing connection, rather than using Guards which only fire on events.

**When to use:** Always for WebSocket authentication in NestJS — Guards don't validate on initial connection, only on event emission.

**Why middleware over guards:** NestJS Guards don't validate socket connections on initial connect, only when events are emitted from the client, and don't automatically disconnect the socket when authentication fails. Middleware or custom adapters are recommended.

**Example:**
```typescript
// Source: https://preetmishra.com/blog/the-best-way-to-authenticate-websockets-in-nestjs
// Existing approach in game.gateway.ts - uses @SubscribeMessage('auth') event

// Current implementation (works but allows unauthenticated connection briefly):
@SubscribeMessage('auth')
async handleAuth(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: AuthRequest
) {
  const result = await this.playerService.authenticate(
    client.id,
    data.token,
    data.characterId
  );
  if (result.success && result.player) {
    client.join(result.player.position.zoneId);
    client.emit('auth:success', { player: result.player });
    client.emit('zone:state', zoneState);
  } else {
    client.emit('auth:error', { error: result.error });
    client.disconnect(); // ADD THIS - force disconnect on auth failure
  }
}

// Enhanced approach: Add to handleConnection lifecycle
async handleConnection(client: Socket) {
  console.log(`Client connected: ${client.id}`);

  // Set authentication timeout - disconnect if no auth within 5s
  const authTimeout = setTimeout(() => {
    if (!this.playerService.getPlayerBySocket(client.id)) {
      client.emit('auth:error', { error: 'Authentication timeout' });
      client.disconnect();
    }
  }, 5000);

  // Store timeout to clear on successful auth
  client.data.authTimeout = authTimeout;
}

// In handleAuth, clear timeout:
clearTimeout(client.data.authTimeout);
```

### Pattern 2: Client-Side Prediction with Server Reconciliation

**What:** Client immediately applies player input locally (movement), then reconciles with authoritative server state when it arrives.

**When to use:** For player movement in real-time multiplayer games to eliminate perceived input lag.

**How it works (2025 standard approach):**
1. Client sends input with sequence number to server
2. Client immediately applies movement locally (prediction)
3. Client stores pending inputs in buffer
4. Server processes input, sends back authoritative state with last-processed sequence number
5. Client rewinds to server state, reapplies unacknowledged inputs

**Example:**
```typescript
// Source: https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html
// Client-side (apps/web/src/network/socket.ts enhancement)

class GameSocket {
  private inputSequence = 0;
  private pendingInputs: Array<{ seq: number; direction: Direction; time: number }> = [];

  sendMove(direction: Direction) {
    this.inputSequence++;
    const input = { seq: this.inputSequence, direction, time: Date.now() };

    // Store for reconciliation
    this.pendingInputs.push(input);

    // Send to server
    this.emit('player:move', { direction, sequence: this.inputSequence });

    // Predict immediately (call Phaser scene method)
    const worldScene = this.gameInstance?.scene.getScene('WorldScene');
    worldScene?.predictMove(direction);
  }

  // Called when server sends position update
  reconcilePosition(serverPos: Position, lastProcessedSeq: number) {
    // Remove acknowledged inputs
    this.pendingInputs = this.pendingInputs.filter(i => i.seq > lastProcessedSeq);

    // Rewind to server position
    const worldScene = this.gameInstance?.scene.getScene('WorldScene');
    worldScene?.setPlayerPosition(serverPos);

    // Reapply pending inputs
    for (const input of this.pendingInputs) {
      worldScene?.predictMove(input.direction);
    }
  }
}

// Server-side (game.gateway.ts enhancement)
@SubscribeMessage('player:move')
async handleMove(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { direction: Direction; sequence: number }
) {
  const result = await this.gameService.movePlayer(client.id, data.direction);

  if (result.success) {
    // Include last processed sequence in response
    this.server.to(result.zoneId).emit('player:moved', {
      playerId: result.playerId,
      position: result.position,
      sequence: data.sequence, // Client uses this for reconciliation
    });
  }
}
```

### Pattern 3: Connection State Recovery (Socket.IO v4+)

**What:** Socket.IO v4+ feature that restores session state (id, rooms, data, missed packets) after temporary disconnection.

**When to use:** For multiplayer games where brief disconnections (network switch, tunnel) shouldn't force full reconnection flow.

**Configuration:**
```typescript
// Source: https://socket.io/docs/v4/connection-state-recovery

// Server (game.gateway.ts - add to @WebSocketGateway decorator)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true, // Don't re-run auth on recovery
  },
})

// Client (socket.ts)
connect(url: string) {
  this.socket = io(url, {
    transports: ['websocket'],
    autoConnect: true,
  });

  this.socket.on('connect', () => {
    if (this.socket.recovered) {
      // State was recovered - no need to re-auth or reload zone
      console.log('Connection recovered');
      this.setConnectionState('authenticated');
    } else {
      // New connection - need to authenticate
      console.log('New connection - authenticating');
      this.setConnectionState('connected');
    }
  });
}
```

**Limitations:** Best-effort mechanism, doesn't work across server restarts, network type switches (WiFi to 4G) may fail recovery.

### Pattern 4: Application-Layer Latency Measurement

**What:** Ping/pong pattern with timestamps to measure round-trip time, as browser WebSocket API doesn't expose native ping/pong frames.

**When to use:** Always for multiplayer games — latency indicator is critical player feedback.

**Example:**
```typescript
// Source: https://gist.github.com/sahat/8364120
// Client (socket.ts)
class GameSocket {
  private latency = 0;
  private pingInterval?: NodeJS.Timeout;

  startPingMonitoring() {
    this.pingInterval = setInterval(() => {
      const startTime = Date.now();
      this.socket?.emit('ping', startTime, (serverTime: number) => {
        this.latency = Date.now() - startTime;
        // Update UI via store
        useGameStore.getState().setLatency(this.latency);
      });
    }, 5000); // Every 5 seconds
  }
}

// Server (game.gateway.ts)
@SubscribeMessage('ping')
handlePing(
  @ConnectedSocket() client: Socket,
  @MessageBody() startTime: number
) {
  // Acknowledge immediately - callback sends back to client
  return startTime;
}
```

**Best practice (2026):** Ping every 5-30 seconds. Load balancer timeout must exceed pingInterval + response timeout (e.g., 25s ping + 20s timeout = 60s minimum load balancer timeout).

### Pattern 5: Reconnection Strategy for Multiplayer Games

**What:** Exponential backoff with connection state UI, message queuing during disconnection.

**When to use:** Always for Socket.IO multiplayer — automatic reconnection is built-in but needs UX and action buffering.

**Socket.IO defaults:**
- Reconnection enabled by default
- Reconnection delay: 1s initially, increases exponentially
- Max reconnection attempts: Infinity
- Randomization factor to prevent thundering herd

**Example:**
```typescript
// Source: https://www.videosdk.live/developer-hub/socketio/socketio-client
// Client (reconnection.ts)
export class ReconnectionManager {
  private actionQueue: Array<{ event: string; data: unknown }> = [];
  private isReconnecting = false;

  constructor(private socket: GameSocket) {
    this.socket.on('disconnect', () => {
      this.isReconnecting = true;
      useGameStore.getState().setConnectionState('disconnected');
      // UI shows "Reconnecting..." based on connection state
    });

    this.socket.on('connect', () => {
      if (this.isReconnecting) {
        this.isReconnecting = false;
        // Flush queued actions after re-auth
        this.flushQueue();
      }
    });
  }

  queueAction(event: string, data: unknown) {
    if (this.socket.getConnectionState() !== 'authenticated') {
      this.actionQueue.push({ event, data });
      return false; // Not sent
    }
    return true; // Can send immediately
  }

  private flushQueue() {
    while (this.actionQueue.length > 0) {
      const action = this.actionQueue.shift();
      if (action) {
        this.socket.emit(action.event as any, action.data);
      }
    }
  }
}

// Custom reconnection config (if needed)
io(url, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
});
```

**Recommendation for this game:** Non-blocking reconnection (modal overlay) is better than blocking — player can still see game world during reconnection, reducing frustration. Show "Reconnecting..." overlay with retry button.

### Anti-Patterns to Avoid

- **Broadcasting with acknowledgment callbacks across multiple servers:** Only works in Socket.IO 4.5+, requires Redis adapter for multi-server setup. This game likely runs single-server initially, but plan for it.
- **Trusting client timestamps:** Server must validate all positions, use server timestamps for authoritative state.
- **Using Guards for WebSocket auth in NestJS:** Guards fire on events, not on connection — use middleware or handleConnection lifecycle.
- **Implementing custom WebSocket protocol:** Socket.IO provides rooms, namespaces, acknowledgments out-of-box — don't reinvent.
- **Sending full world state on every update:** Use delta updates (StateSyncMessage pattern in shared-types already exists).
- **No error handling in Socket.IO listeners:** Socket.IO doesn't catch errors automatically — wrap all event handlers in try-catch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection logic | Custom exponential backoff, retry logic | Socket.IO built-in reconnection | Socket.IO handles it automatically with configurable delays, attempts, randomization |
| Room/channel management | Custom player zone tracking | Socket.IO rooms (already used: `client.join(zoneId)`) | Automatic cleanup on disconnect, efficient broadcasting to subsets |
| Message acknowledgments | Custom request/response tracking | Socket.IO acknowledgment callbacks | Built-in timeout support, works with async/await via `emitWithAck()` |
| Client-side prediction | Custom input buffering + replay | Established patterns (Gabriel Gambetta) | Well-understood algorithms, avoid desyncs and visual artifacts |
| WebSocket handshake auth | Custom token exchange protocol | JWT in handshake query/headers, validate in middleware | Industry standard, compatible with existing REST auth |
| Latency measurement | Custom timing protocol | Application-layer ping/pong with timestamps | Browser doesn't expose native ping/pong, app-layer is only option |

**Key insight:** Socket.IO abstracts away the hardest parts of real-time networking (reconnection, rooms, fallback transports). The complexity in this phase is in authentication timing, client-side prediction, and UX feedback — not in the transport layer.

## Common Pitfalls

### Pitfall 1: Auth-Then-Disconnect Race Condition

**What goes wrong:** Client connects, sends `auth` event, but network drops before server responds. Client is stuck in "connecting" state, never shows error.

**Why it happens:** No timeout on authentication handshake.

**How to avoid:**
- Server: Disconnect clients that don't auth within 5 seconds (see Pattern 1)
- Client: Set 10-second timeout on auth response, show error and retry if no response

**Warning signs:** Players report "stuck on loading screen" intermittently.

### Pitfall 2: Connection State Recovery Doesn't Work for Network Type Changes

**What goes wrong:** Player switches from WiFi to mobile data, connection state recovery fails, but client thinks it's recovering.

**Why it happens:** Socket.IO connection state recovery is best-effort, doesn't work across all disconnect scenarios (especially network interface changes).

**How to avoid:**
- Always check `socket.recovered` flag on reconnect
- If `!socket.recovered`, perform full re-authentication and zone reload
- Show appropriate UI: "Reconnecting..." vs "Loading world..."

**Warning signs:** Players report "frozen game" after network switch, server shows duplicate connections.

### Pitfall 3: Latency Spikes from Unbounded Input Replay

**What goes wrong:** Player disconnects for 30 seconds with 100 pending inputs, reconnection replays all inputs instantly, causes visual teleporting or server rejection.

**Why it happens:** No bounds on pending input buffer in client-side prediction.

**How to avoid:**
- Limit pending input buffer to last 1-2 seconds of inputs (~20 inputs at 100ms tick)
- On reconnection, discard very old inputs, trust server position
- Use smooth interpolation for large corrections instead of instant snap

**Warning signs:** Players report "teleporting" after lag, server logs show rapid-fire input spam on reconnect.

### Pitfall 4: Auth Token Expiration During Gameplay

**What goes wrong:** JWT expires after 7 days, player in long session suddenly can't reconnect after brief disconnect.

**Why it happens:** No token refresh mechanism for WebSocket connections.

**How to avoid:**
- Implement token refresh endpoint in REST API
- Client checks token expiry on reconnect, refreshes if < 1 hour remaining
- Server accepts slightly expired tokens (e.g., 5 min grace period) on reconnect to avoid disconnecting active players

**Warning signs:** Players report "kicked out" after long sessions, error code is AUTH_EXPIRED.

### Pitfall 5: No Error Handling in Socket.IO Event Listeners

**What goes wrong:** Unhandled exception in event handler crashes the handler, client never receives response, connection state gets stuck.

**Why it happens:** Socket.IO doesn't catch errors in listeners automatically.

**How to avoid:**
- Wrap all `@SubscribeMessage` handlers in try-catch
- Always emit error response to client on exception
- Log errors with context (playerId, event type, timestamp)

**Warning signs:** Server logs show unhandled exceptions, clients timeout waiting for responses.

### Pitfall 6: Loading Screen Shows 100% Before Data Arrives

**What goes wrong:** Progress bar reaches 100%, then hangs while waiting for zone data. Looks like freeze.

**Why it happens:** Progress tracking based on events sent, not data received and processed.

**How to avoid:**
- Track loading stages: "Connecting" (0-20%), "Authenticating" (20-40%), "Loading world" (40-90%), "Spawning entities" (90-100%)
- Only show 100% and transition to game when ALL data is in Phaser scene
- Show sub-status text: "Receiving terrain data..." / "Spawning players..." / "Ready!"

**Warning signs:** Players report "loading screen stuck at 100%", actually data is still loading.

## Code Examples

Verified patterns from official sources and existing codebase:

### WebSocket Connection with Auth (Client)
```typescript
// Source: Existing apps/web/src/network/socket.ts
// Enhancement: Add timeout, state tracking

class GameSocket {
  private authTimeout?: NodeJS.Timeout;

  connect(url: string): void {
    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      if (this.socket.recovered) {
        this.setConnectionState('authenticated');
      } else {
        this.setConnectionState('connected');
      }
    });
  }

  authenticate(token: string, characterId: string): Promise<Player> {
    return new Promise((resolve, reject) => {
      this.authTimeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 10000);

      this.socket?.emit('auth', { token, characterId });

      // Listen for response (one-time listeners)
      this.socket?.once('auth:success', (data) => {
        clearTimeout(this.authTimeout);
        this.setConnectionState('authenticated');
        resolve(data.player);
      });

      this.socket?.once('auth:error', (data) => {
        clearTimeout(this.authTimeout);
        this.setConnectionState('error');
        reject(new Error(data.error));
      });
    });
  }
}
```

### Server-Side Auth Handler with Disconnect
```typescript
// Source: Existing apps/game-server/src/game/game.gateway.ts
// Enhancement: Force disconnect on failure, add timeout

@SubscribeMessage('auth')
async handleAuth(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: AuthRequest
) {
  try {
    const result = await this.playerService.authenticate(
      client.id,
      data.token,
      data.characterId
    );

    if (result.success && result.player) {
      client.join(result.player.position.zoneId);

      const zoneState = await this.gameService.getZoneState(
        result.player.position.zoneId
      );

      client.emit('auth:success', { player: result.player });
      client.emit('zone:state', zoneState);

      client.to(result.player.position.zoneId).emit('player:joined', {
        id: result.player.id,
        name: result.player.name,
        faction: result.player.faction,
        position: result.player.position,
        level: result.player.level,
        inCombat: result.player.inCombat,
      });
    } else {
      // Enhancement: Send error and disconnect
      client.emit('auth:error', {
        code: 'AUTH_FAILED',
        error: result.error || 'Authentication failed'
      });
      client.disconnect();
    }
  } catch (error) {
    client.emit('auth:error', {
      code: 'AUTH_FAILED',
      error: 'Authentication failed'
    });
    client.disconnect();
  }
}
```

### Connection Indicator Component (React)
```typescript
// Source: UI patterns from research
// New component: apps/web/src/components/ConnectionIndicator.tsx

interface ConnectionIndicatorProps {
  connectionState: ConnectionState;
  latency: number;
}

export function ConnectionIndicator({ connectionState, latency }: ConnectionIndicatorProps) {
  const getStatusColor = () => {
    switch (connectionState) {
      case 'authenticated': return latency < 100 ? '#44cc44' : '#ffcc00';
      case 'connected': return '#ffcc00';
      case 'connecting': return '#ffcc00';
      case 'disconnected': return '#ff4444';
      case 'error': return '#ff4444';
    }
  };

  const getLatencyBars = () => {
    if (connectionState !== 'authenticated') return 0;
    if (latency < 50) return 4;  // Excellent
    if (latency < 100) return 3; // Good
    if (latency < 200) return 2; // Fair
    return 1; // Poor
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(0, 0, 0, 0.5)',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '14px',
      color: '#fff'
    }}>
      {/* Status dot */}
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: getStatusColor()
      }} />

      {/* Latency bars */}
      {connectionState === 'authenticated' && (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                width: '4px',
                height: `${i * 3 + 4}px`,
                background: i <= getLatencyBars() ? getStatusColor() : '#444',
                borderRadius: '1px'
              }}
            />
          ))}
        </div>
      )}

      {/* Latency text */}
      {connectionState === 'authenticated' && (
        <span style={{ fontSize: '12px', opacity: 0.8 }}>
          {latency}ms
        </span>
      )}

      {/* Status text for non-connected states */}
      {connectionState !== 'authenticated' && (
        <span style={{ fontSize: '12px' }}>
          {connectionState === 'connecting' && 'Connecting...'}
          {connectionState === 'disconnected' && 'Disconnected'}
          {connectionState === 'error' && 'Connection Error'}
        </span>
      )}
    </div>
  );
}
```

### Loading Screen with Progress Tracking
```typescript
// Source: UX best practices research
// New component: apps/web/src/components/LoadingScreen.tsx

interface LoadingScreenProps {
  stage: 'connecting' | 'authenticating' | 'loading-world' | 'spawning' | 'ready';
  progress: number; // 0-100
}

const LOADING_TIPS = [
  "The Verdant Dynamics corporation focuses on sustainable resource extraction.",
  "Helix Extraction prioritizes rapid mineral acquisition and profit.",
  "Nexus Frontiers seeks to uncover ancient artifacts and study alien life.",
  "Each zone contains unique biomes and resources to discover.",
  "You can interact with minerals, creatures, and other players to gain XP.",
  "Build bases to establish your faction's influence in new territories.",
];

export function LoadingScreen({ stage, progress }: LoadingScreenProps) {
  const [currentTip, setCurrentTip] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % LOADING_TIPS.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getStageText = () => {
    switch (stage) {
      case 'connecting': return 'Connecting to server...';
      case 'authenticating': return 'Authenticating character...';
      case 'loading-world': return 'Loading world data...';
      case 'spawning': return 'Spawning entities...';
      case 'ready': return 'Ready!';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      gap: '32px'
    }}>
      {/* Stage text */}
      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
        {getStageText()}
      </div>

      {/* Progress bar */}
      <div style={{
        width: '400px',
        height: '24px',
        background: '#222',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '2px solid #444'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #00bfff, #44cc44)',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Percentage */}
      <div style={{ fontSize: '18px', opacity: 0.7 }}>
        {Math.round(progress)}%
      </div>

      {/* Lore tip */}
      <div style={{
        maxWidth: '500px',
        textAlign: 'center',
        fontSize: '16px',
        opacity: 0.8,
        fontStyle: 'italic',
        marginTop: '32px',
        minHeight: '50px' // Prevent layout shift
      }}>
        {LOADING_TIPS[currentTip]}
      </div>
    </div>
  );
}
```

### Error Code System
```typescript
// Source: Existing shared-types/src/network/messages.ts
// Enhancement: Add E-code prefix for user-facing codes

// Server emits:
client.emit('error', {
  code: 'E-1001', // User-facing code for support
  internalCode: 'AUTH_FAILED', // Internal enum for client handling
  message: 'Authentication failed. Please log in again.',
});

// Client handles:
socket.on('error', (data) => {
  // Show modal with message and code
  showErrorModal({
    message: data.message,
    supportCode: data.code, // "Connection lost (E-1042)"
  });

  // Handle by internal code
  switch (data.internalCode) {
    case 'AUTH_FAILED':
    case 'AUTH_EXPIRED':
      // Redirect to login
      navigate('/login', {
        state: { error: 'Session expired. Please log in again.' }
      });
      break;
    case 'INVALID_CHARACTER':
      // Redirect to character selection
      navigate('/characters', {
        state: { error: 'Character not found. Please select a character.' }
      });
      break;
    case 'SERVER_ERROR':
      // Show retry option
      showRetryModal();
      break;
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom WebSocket auth protocols | JWT in handshake with middleware validation | ~2020 | Unified auth between REST and WebSocket, simpler client |
| Full state sync every tick | Delta updates (StateSyncMessage) | Always preferred | 10-100x bandwidth reduction for MMOs |
| Snap correction on desync | Smooth reconciliation with input replay | ~2018 (Gabriel Gambetta) | Eliminates visible "rubber-banding" |
| Native WebSocket API | Socket.IO abstraction | Socket.IO v1 (2014) | Automatic reconnection, rooms, fallback transports |
| Manual session recovery | Socket.IO connection state recovery | Socket.IO v4.0 (2023) | Reduces re-auth overhead on brief disconnects |
| Server-side only latency | Application-layer ping/pong | Always (browser limitation) | Players can see their latency, crucial feedback |

**Deprecated/outdated:**
- **Socket.IO polling transport as default:** Modern browsers support WebSocket natively, polling adds overhead — set `transports: ['websocket']` to force WebSocket-only.
- **Broadcasting with callbacks before Socket.IO 4.5:** Required custom implementation, now built-in with acknowledgment support.
- **Using @UseGuards on WebSocket gateways:** Fires on events not connection, use middleware pattern instead.

## Open Questions

1. **Should we implement token refresh for WebSocket connections?**
   - What we know: JWT expires in 7 days, long sessions could hit expiry
   - What's unclear: How often do players have multi-hour sessions? Is 7 days enough?
   - Recommendation: Start without refresh, monitor for AUTH_EXPIRED errors in first month. Add if >1% of sessions hit it.

2. **How aggressive should reconnection backoff be?**
   - What we know: Socket.IO defaults (1s → 5s max with randomization)
   - What's unclear: Server capacity during mass disconnect/reconnect (server restart, network outage)
   - Recommendation: Use Socket.IO defaults initially, add rate limiting on server if thundering herd occurs.

3. **Do we need multi-server Socket.IO (Redis adapter) now?**
   - What we know: Single server likely sufficient for alpha/beta (100-500 concurrent)
   - What's unclear: Growth timeline and player distribution
   - Recommendation: Plan architecture for it (rooms work cross-server), but don't implement until >500 concurrent. Adds complexity and Redis dependency.

4. **Should we show detailed error codes to players or just support reference?**
   - What we know: User wants "E-1042" style codes for support tickets
   - What's unclear: Do players benefit from knowing "AUTH_FAILED" vs "Connection lost"?
   - Recommendation: Show friendly message ("Connection lost") + support code ("E-1042"). Don't show technical enum names to end users.

5. **Client-side prediction: predict only local player, or other players too?**
   - What we know: Predicting remote players reduces visual latency but can cause desyncs
   - What's unclear: How tolerant is player base to slight desyncs vs visual lag?
   - Recommendation: Start with local player prediction only. Add interpolation (smooth movement between server updates) for remote players, not prediction. Simpler and avoids desyncs.

## Sources

### Primary (HIGH confidence)
- Socket.IO Official Docs v4 - Connection State Recovery: https://socket.io/docs/v4/connection-state-recovery
- Socket.IO Official Docs v4 - Listening to Events: https://socket.io/docs/v4/listening-to-events/
- Socket.IO Official Docs v4 - Client API: https://socket.io/docs/v4/client-api/
- NestJS Official Docs - WebSocket Guards: https://docs.nestjs.com/websockets/guards
- WebSocket Close Codes Reference: https://websocket.org/reference/close-codes/
- WebSocket API Reference: https://websocket.org/reference/websocket-api/
- Existing codebase: apps/game-server/src/game/game.gateway.ts, apps/web/src/network/socket.ts, packages/shared-types/src/network/

### Secondary (MEDIUM confidence)
- Gabriel Gambetta - Client-Side Prediction and Server Reconciliation: https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html (authoritative source for CSP, referenced widely)
- The Best Way to Authenticate WebSockets in NestJS: https://preetmishra.com/blog/the-best-way-to-authenticate-websockets-in-nestjs (practitioner guide, verified against NestJS docs)
- Socket.IO Games Guide: https://medium.com/swlh/socket-io-games-the-right-way-using-nodejs-and-react-not-a-chat-app-part-1-e7a49d2f3f51
- WebSocket Heartbeat Guide (2026): https://oneuptime.com/blog/post/2026-01-27-websocket-heartbeat/view
- Progress Bar UX Best Practices: https://uxplanet.org/progress-bar-design-best-practices-526f4d0a3c30
- NN/G Progress Indicators Research: https://www.nngroup.com/articles/progress-indicators/
- Carbon Design System - Status Indicators: https://carbondesignsystem.com/patterns/status-indicator-pattern/

### Tertiary (LOW confidence - general patterns, not version-specific)
- Real Time Multiplayer in HTML5 (buildnewgames): http://buildnewgames.com/real-time-multiplayer/ (older but foundational concepts remain valid)
- Ably Socket.IO Overview: https://ably.com/topic/socketio (third-party analysis)
- Game UI Database: https://www.gameuidatabase.com/ (UI reference examples)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Versions confirmed in package.json, official docs verified
- Architecture patterns: HIGH - Existing codebase already uses core patterns (Socket.IO rooms, JWT auth), enhancements based on official Socket.IO v4 docs and established CSP algorithms
- Pitfalls: MEDIUM-HIGH - Auth timeout and token expiry issues are common across WebSocket implementations, connection state recovery limitations documented in official GitHub issues
- UX patterns: MEDIUM - Loading screen and connection indicator patterns based on established UX research (NN/G, Carbon Design System), not game-specific testing

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days - Socket.IO and NestJS are stable, no major version changes expected)
