# Stack Research

**Domain:** In-game chat system (multi-channel, whispers, mute/block moderation)
**Researched:** 2026-02-26
**Confidence:** HIGH

---

## Context: What Already Exists

This is a stack *addendum*, not a greenfield stack. The game already has:

- `socket.io@^4.7.0` + `@nestjs/platform-socket.io@^10.3.0` — existing WebSocket transport
- `socket.io-client@^4.7.0` — existing client connection
- `ioredis@^5.4.0` + Redis on Docker port 6379 — already running, unused by game logic
- `drizzle-orm@^0.30.0` + PostgreSQL — existing persistence layer
- `zustand@^4.5.0` — existing client-side state management
- Chat types already stubbed in `shared-types`: `ChatMessage`, `ChatMessageRequest`, `ChatChannel`, `chat:send` client event, `chat:message` server event
- `chat:send` handler already in `GameGateway` — handles `zone` and `global` channels

**Conclusion: Chat requires zero new runtime infrastructure.** It piggybacks on the existing Socket.IO connection and extends existing patterns.

---

## Recommended Stack

### Core Technologies (ALL already installed)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `socket.io` | `^4.7.0` | Chat message transport | Already the real-time backbone; rooms handle channel scoping natively; no separate chat server needed |
| `@nestjs/websockets` + `@nestjs/platform-socket.io` | `^10.3.0` | NestJS gateway handles `chat:send` | `@SubscribeMessage('chat:send')` pattern is already implemented in `GameGateway` |
| `zustand` | `^4.5.0` | Client chat state (`chatStore`) | Matches `combatLogStore` pattern exactly — socket event wired at module load, capped array of messages |
| `drizzle-orm` | `^0.30.0` | Mute/block list persistence | Existing ORM; a new `player_moderation` table with Drizzle schema is all that is needed |

### New Library: Rate Limiting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/throttler` | `^6.x` (latest: 6.4.0) | Per-socket rate limiting on `chat:send` | Apply a `WsThrottlerGuard` to the `handleChat` handler — prevents chat spam without Redis dependency at this scale |

Install command:

```bash
pnpm add @nestjs/throttler
```

No other new npm packages are needed.

### Development Tools (no changes)

| Tool | Purpose | Notes |
|------|---------|-------|
| NX | Build/test orchestration | No changes needed |
| Drizzle Kit | Schema migration (`pnpm db:generate && pnpm db:migrate`) | Run after adding `player_moderation` table |

---

## Installation

```bash
# Only one new package needed
pnpm add @nestjs/throttler
```

No changes to `docker-compose.yml` or infrastructure.

---

## Integration: How Chat Fits Into Existing Socket.IO

### The existing room system covers 4 of 5 channels with no new concepts

The gateway already uses Socket.IO rooms for zone broadcasting (`z_X_Y` rooms). The same mechanism handles all chat scopes:

| Chat Channel | Socket.IO Mechanism | Status |
|-------------|--------------------|----|
| **Global** | `this.server.emit('chat:message', msg)` | Already implemented in gateway |
| **Zone** | `this.server.to(player.position.zoneId).emit(...)` | Already implemented in gateway |
| **Faction** | `this.server.to('faction:' + player.faction).emit(...)` | Not yet implemented — player joins `faction:verdant`/`faction:helix`/`faction:nexus`/`faction:neutral` room on auth |
| **Whisper** | Direct `server.to(targetSocketId).emit(...)` | Already implemented in gateway; needs block list check added |
| **Local** | Filter players in-memory by Euclidean distance <= local range (e.g. 15 tiles) | Not yet implemented — iterate `playerService.getPlayersInZone(zoneId)`, compute distance, emit per socket |

### Faction room management

Players join their faction room at auth time (alongside zone rooms). No new room infrastructure — just one `client.join('faction:' + player.faction)` call in `handleAuth`. Players never change faction, so no room-leave logic needed.

### Local chat does NOT need a separate room

Local chat is proximity-filtered server-side: iterate `playerService.getPlayersInZone(zoneId)`, compute tile distance, emit `chat:message` individually to sockets within range. No new room. No new concept. Matches how the AI service queries zone players today.

### Mute/block persistence

A new Drizzle table is needed. No external service:

```typescript
// packages/database/src/schema/player-moderation.ts
export const playerModeration = pgTable('player_moderation', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  targetId: uuid('target_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 10 }).notNull(), // 'mute' | 'block'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  unique: uniqueIndex('player_moderation_actor_target_type').on(t.actorId, t.targetId, t.type),
}));
```

Mute/block lists are loaded into memory per player on auth (like ability cooldowns are loaded in `abilityService.restoreCooldowns`) and checked server-side before dispatching chat messages. A muted player's messages are simply not sent to the muting player's socket. A blocked player's whispers are rejected at the gateway with an error reply.

### Client-side chat store

Copy `combatLogStore.ts` pattern exactly:

```typescript
// apps/web/src/store/chatStore.ts
import { create } from 'zustand';
import { ChatMessage, ChatChannel } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

interface ChatState {
  messages: ChatMessage[];
  activeChannel: ChatChannel;
  mutedPlayerIds: Set<string>;
  addMessage: (msg: ChatMessage) => void;
  setChannel: (channel: ChatChannel) => void;
  mutePlayer: (id: string) => void;
  unmutePlayer: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  activeChannel: 'zone',
  mutedPlayerIds: new Set(),
  addMessage: (msg) => set((state) => ({
    messages: [...state.messages.slice(-199), msg],
  })),
  // ...
}));

// Wire socket at module load (same pattern as combatLogStore)
gameSocket.on('chat:message', (msg: ChatMessage) => {
  const { mutedPlayerIds } = useChatStore.getState();
  if (mutedPlayerIds.has(msg.senderId)) return;
  useChatStore.getState().addMessage(msg);
});
```

Note: `mutedPlayerIds` here is client-side fast-path filtering for immediate UI response. The authoritative mute enforcement is server-side.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Existing Socket.IO connection for all channels | Separate WebSocket server for chat | Unnecessary operational complexity; single connection is standard for games at this scale; faction/zone rooms already work |
| In-memory mute/block checked server-side | Client-side filtering only | Security issue — clients could bypass; server-side is authoritative |
| `@nestjs/throttler` WsThrottlerGuard | Manual timestamp tracking per socket | Throttler is maintained, tested, and integrates with NestJS decorator system cleanly |
| Drizzle table for mute/block | Redis SET per player | Redis adds infrastructure dependency for data that is low-volume and session-persistent; Postgres is already authoritative for all player data |
| `@socket.io/redis-adapter` for multi-server | Not needed currently | Single-server deployment; the in-memory adapter is already in use and sufficient; add redis-adapter if horizontal scaling is required later |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| A separate chat microservice / third-party chat API | Adds operational cost, breaks shared auth context, requires API bridging | Existing Socket.IO in `game-server`; chat is a feature, not a separate service |
| `socket.io-redis` (v5 era package name) | Deprecated; superseded | If scaling is ever needed, use `@socket.io/redis-adapter@^8.x` with the existing `ioredis` client |
| Persisting all chat messages to PostgreSQL | Project explicitly states ephemeral messages (no DB persistence) | In-memory in `chatStore` with a capped array (200 messages); messages are lost on page refresh — intentional per PROJECT.md |
| Broadcasting to entire server for faction chat | Global `server.emit()` hits all sockets | Socket.IO room `faction:<id>` — player joins at auth, never leaves (faction is immutable) |
| Socket.IO rooms for local chat | Room membership changes on every tile move — O(n) join/leave per step | Euclidean distance filter server-side: iterate zone players, filter by range, emit individually |

---

## Stack Patterns by Variant

**If single-server (current, Docker Swarm single node):**
- Use in-memory Socket.IO adapter (already the default — no config needed)
- Mute/block lists loaded on auth from DB, stored in a `ChatService` Map keyed by `playerId`
- No Redis involvement for chat

**If multi-server horizontal scaling is added later:**
- Add `@socket.io/redis-adapter@^8.x` using the existing `ioredis` client
- This is a ~10-line change to `main.ts` in `game-server`
- Faction rooms automatically work cross-server via the adapter

**If chat moderation tooling is added (future milestone):**
- Add a `chat_logs` table at that point (not now — explicitly out of scope per PROJECT.md)
- Add profanity filter as a pure function in the `game-logic` package (strategy pattern fits)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@nestjs/throttler@^6.x` | `@nestjs/common@^10.x` | v6.x supports NestJS 10; v6.4.0 is latest as of Feb 2026 |
| `socket.io@^4.7.0` | `@nestjs/platform-socket.io@^10.3.0` | Already in use and working — no version concern |
| `drizzle-orm@^0.30.0` | New `player_moderation` table schema | Additive schema change; no breaking migration |

---

## Sources

- Codebase audit: `/packages/shared-types/src/network/events.ts` — `ChatMessage`, `ChatChannel`, `chat:send`/`chat:message` already defined; `ChatMessageRequest` includes `targetId` for whispers
- Codebase audit: `/apps/game-server/src/game/game.gateway.ts` lines 403-437 — `handleChat` already handles `zone` and `global` channels; whisper uses `playerService.getSocketByPlayerId`
- Codebase audit: `/apps/game-server/src/game/game.gateway.ts` lines 1675-1705 — `updatePlayerRooms` shows Socket.IO room join/leave pattern; faction room follows same model
- Codebase audit: `/apps/web/src/store/combatLogStore.ts` — exact template for `chatStore`; socket wired at module load, capped array, player-id filtering
- Codebase audit: `package.json` root — confirms `socket.io@^4.7.0`, `ioredis@^5.4.0`, `drizzle-orm@^0.30.0`, `zustand@^4.5.0`
- [NestJS Throttler GitHub](https://github.com/nestjs/throttler) — WebSocket support confirmed, v6.4.0 latest for NestJS 10
- [Socket.IO Rooms documentation](https://socket.io/docs/v3/rooms/) — room broadcast API confirmed
- [NestJS WebSocket Rate Limiting guide](https://www.delightfulengineering.com/blog/nest-websockets/rate-limiting-acknowledgements) — WsThrottlerGuard pattern, MEDIUM confidence (WebSearch, consistent with official throttler docs)

---

*Stack research for: In-game chat system (v1.22)*
*Researched: 2026-02-26*
