# Architecture Research

**Domain:** In-game chat system for multiplayer 2D MMO (v1.22 milestone)
**Researched:** 2026-02-26
**Confidence:** HIGH — based on direct codebase analysis of existing game-server, shared-types, and web client

---

## Current Chat State (Pre-Milestone)

The codebase already has **partial chat infrastructure** in place. This research documents what exists, what is missing, and how to complete the system cleanly.

### What Already Exists

**shared-types (`packages/shared-types/src/network/events.ts`):**
- `ChatChannel` type: `'zone' | 'faction' | 'whisper' | 'global' | 'system'`
- `ChatMessage` interface: `{ id, senderId, senderName, message, channel, timestamp }`
- `ChatMessageRequest` interface: `{ message, channel, targetId? }`
- `ClientEvents['chat:send']` — typed socket event
- `ServerEvents['chat:message']` — typed server broadcast

**game-server (`apps/game-server/src/game/game.gateway.ts`, lines 403-437):**
- `handleChat()` handler already implemented for `zone`, `global`, `whisper`
- Routes zone messages via `server.to(zoneId).emit()`
- Routes global via `server.emit()`
- Routes whispers via `server.to(targetSocket).emit()` + echo to sender

**Frontend (`apps/web/src/ui/panels/ChatPanel.tsx`):**
- Panel component exists, draggable, renders messages, sends to zone channel only
- `chatMessages` stored in `gameStore` with 100-message rolling window
- Channel color-coding in CSS already defined for all 5 channels

**What is Missing:**
- `local` channel (proximity, ~15 tile radius) — not in `ChatChannel` type, no server routing
- `faction` channel — server routing not implemented in gateway (falls through switch without a case)
- Channel tab switching in UI — hardcoded to `zone` only
- Mute list — no implementation anywhere
- Block list — no implementation anywhere
- Mute/block persistence (DB schema + queries)
- Whisper UI (target selection, conversation threading)
- `chat:message` not registered in `socket.ts` server event list (silent bug — messages never dispatched)

---

## System Overview

```
+-----------------------------------------------------------------+
|                    React Web Client                             |
|  +-----------------------------------------------------------+  |
|  |  ChatPanel (always-visible, bottom-left)                  |  |
|  |  +--------+ +------+ +-------+ +-------+ +----------+   |  |
|  |  | Local  | | Zone | |Faction| |Global | | Whispers |   |  |
|  |  +--------+ +------+ +-------+ +-------+ +----------+   |  |
|  |  [Filtered message list] [Input] [Send]                  |  |
|  +-----------------------------------------------------------+  |
|  +---------------------------+                                  |
|  |  chatStore (Zustand)      |  <- receives chat:message       |
|  |  - messages[]             |                                  |
|  |  - activeChannel          |                                  |
|  |  - mutedPlayerIds[]       |  <- filters messages client-side |
|  |  - blockedPlayerIds[]     |  <- persisted via REST API       |
|  |  - whisperTarget          |                                  |
|  +---------------------------+                                  |
|  +------------+                                                 |
|  | socket.ts  | <- emit chat:send / on chat:message            |
|  +------------+                                                 |
+--------------------------------+--------------------------------+
                                 | Socket.IO (WSS)
+--------------------------------v--------------------------------+
|                    NestJS Game Server                           |
|  +----------------------------------------------------------+  |
|  |  GameGateway                                             |  |
|  |  @SubscribeMessage('chat:send')  handleChat()            |  |
|  |    -> validates auth (existing guard pattern)            |  |
|  |    -> delegates to ChatService                           |  |
|  +-------------------+--------------------------------------+  |
|                      |                                         |
|  +-------------------v--------------------------------------+  |
|  |  ChatService (NEW)                                       |  |
|  |  - routeMessage(sender, request) -> void                 |  |
|  |  - routeLocal(sender, msg) -> void                       |  |
|  |  - routeWhisper(client, sender, request, msg) -> void    |  |
|  |  - isBlocked(senderId, receiverId) -> Promise<boolean>   |  |
|  +-------------------+--------------------------------------+  |
|                      |                                         |
|  +-------------------v--------------------------------------+  |
|  |  PlayerService (EXISTING -- read-only by ChatService)    |  |
|  |  - getPlayerById()                                       |  |
|  |  - getPlayerBySocket()                                   |  |
|  |  - getAllOnlinePlayers()                                  |  |
|  |  - getSocketByPlayerId()                                  |  |
|  |  - getPlayersInZone()         <- already exists           |  |
|  +----------------------------------------------------------+  |
|                                                                 |
|  +----------------------------------------------------------+  |
|  |  Socket.IO Rooms (existing infrastructure)               |  |
|  |  - zoneId rooms (e.g., "z_1_2") -- players auto-join    |  |
|  |  - factionId rooms (NEW: "faction:verdant") -- on auth   |  |
|  +----------------------------------------------------------+  |
+--------------------------------+--------------------------------+
                                 |
+--------------------------------v--------------------------------+
|                    PostgreSQL (via Drizzle)                      |
|  +----------------------------------------------------------+  |
|  |  chat_mute_list (NEW)                                    |  |
|  |  - id, character_id, muted_character_id, created_at     |  |
|  +----------------------------------------------------------+  |
|  +----------------------------------------------------------+  |
|  |  chat_block_list (NEW)                                   |  |
|  |  - id, character_id, blocked_character_id, created_at   |  |
|  +----------------------------------------------------------+  |
+-----------------------------------------------------------------+
```

---

## Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|---------------|-----------------|
| `ChatService` | Route messages by channel, enforce block lists, look up targets | **NEW** |
| `GameGateway.handleChat()` | Receive `chat:send`, delegate to `ChatService` | **MODIFIED** (minor refactor) |
| `GameGateway.handleAuth()` | Join player into faction Socket.IO room | **MODIFIED** (add room join) |
| `GameGateway.handleDisconnect()` | Leave faction room on disconnect | **MODIFIED** (socket leaves automatically, optional defensive leave) |
| `chatStore` | Hold messages, active channel, mute/block lists, whisper state | **NEW** (extracted from `gameStore`) |
| `ChatPanel` | Tabbed UI, channel switching, whisper target input | **MODIFIED** (major rewrite) |
| `chat_mute_list` schema | Persist mute relationships | **NEW** |
| `chat_block_list` schema | Persist block relationships | **NEW** |
| `shared-types ChatChannel` | Add `'local'` to union | **MODIFIED** |
| `socket.ts` serverEvents | Register `chat:message` in event list | **MODIFIED** (bug fix) |

---

## Recommended Project Structure

```
apps/game-server/src/game/
+-- chat.service.ts          # NEW -- all routing + mute/block logic
+-- game.gateway.ts          # MODIFIED -- delegates to ChatService, joins faction rooms
+-- game.module.ts           # MODIFIED -- add ChatService to providers

packages/database/src/
+-- schema/
|   +-- chat-mute-list.ts    # NEW -- mute_list table
|   +-- chat-block-list.ts   # NEW -- block_list table
+-- queries/
|   +-- chat.ts              # NEW -- getMuteList, getBlockList, addMute, removeMute, addBlock, removeBlock
+-- index.ts                 # MODIFIED -- re-export new schema and queries

packages/shared-types/src/network/
+-- events.ts                # MODIFIED -- add 'local' to ChatChannel

apps/web/src/
+-- store/
|   +-- chatStore.ts         # NEW -- extracted from gameStore, adds channel/mute/block state
+-- ui/panels/
|   +-- ChatPanel.tsx        # MODIFIED -- tabbed channels, whisper UI, mute controls
|   +-- ChatPanel.css        # MODIFIED -- tab styles
+-- network/
    +-- socket.ts            # MODIFIED -- register chat:message in serverEvents array
```

### Structure Rationale

- **`chat.service.ts` separate from `game.gateway.ts`:** Follows established pattern (combat.service, quest.service, etc.). Gateway handles only transport; service owns business logic.
- **`chatStore.ts` extracted from `gameStore.ts`:** `gameStore` is already large. Chat state (messages, channel, mute list) is a distinct domain. Same side-effect registration pattern used by `questStore.ts`, `statsStore.ts`, etc.
- **Database in `packages/database/`:** Consistent with all other persistence (quests, lore, zone-mastery). Drizzle schema + query functions follow existing patterns exactly.

---

## Architectural Patterns

### Pattern 1: Socket.IO Room-Based Channel Routing

**What:** Use Socket.IO named rooms as broadcast targets. Zone rooms already exist (`zoneId` string). Faction rooms need to be added (`"faction:verdant"`, `"faction:helix"`, etc.).

**When to use:** Zone, faction, and global channels. Avoids iterating all players on every message.

**Trade-offs:** Rooms are invisible to application logic — correctness depends on join/leave being called at the right lifecycle points. Missing a leave call leaks a player into the wrong room.

**Example:**
```typescript
// In GameGateway.handleAuth() -- after successful authentication
client.join(player.position.zoneId);         // already done implicitly via server.to()
client.join(`faction:${player.faction}`);    // NEW -- join faction room

// Socket.IO automatically leaves all rooms on disconnect.
// No explicit leave needed in handleDisconnect().

// In ChatService.routeMessage() -- faction channel
this.server.to(`faction:${sender.faction}`).emit('chat:message', message);
```

### Pattern 2: ChatService as Pure Router

**What:** `ChatService` receives the validated `sender` (already looked up from `PlayerService`) and the `ChatMessageRequest`, then decides which sockets receive the message. It does not validate auth — that happens in the gateway before delegation.

**When to use:** All channel types flow through a single `routeMessage()` method. Add a channel case without touching the gateway.

**Trade-offs:** Slightly more indirection than inline routing (as current gateway does). Worth it for testability and future channel additions.

**Example:**
```typescript
@Injectable()
export class ChatService {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  async routeMessage(
    client: Socket,
    sender: Player,
    request: ChatMessageRequest,
  ): Promise<void> {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: sender.id,
      senderName: sender.name,
      message: this.sanitize(request.message),
      channel: request.channel,
      timestamp: Date.now(),
    };

    switch (request.channel) {
      case 'local':
        await this.routeLocal(sender, message);
        break;
      case 'zone':
        this.server!.to(sender.position.zoneId).emit('chat:message', message);
        break;
      case 'faction':
        this.server!.to(`faction:${sender.faction}`).emit('chat:message', message);
        break;
      case 'global':
        this.server!.emit('chat:message', message);
        break;
      case 'whisper':
        await this.routeWhisper(client, sender, request, message);
        break;
    }
  }

  private async routeLocal(sender: Player, message: ChatMessage): Promise<void> {
    const LOCAL_RADIUS = 15;
    const playersInZone = this.playerService.getPlayersInZone(sender.position.zoneId);
    for (const p of playersInZone) {
      const dx = Math.abs(p.position.x - sender.position.x);
      const dy = Math.abs(p.position.y - sender.position.y);
      if (dx <= LOCAL_RADIUS && dy <= LOCAL_RADIUS) {
        const socket = this.playerService.getSocketByPlayerId(p.id);
        if (socket) {
          this.server!.to(socket).emit('chat:message', message);
        }
      }
    }
  }

  private async routeWhisper(
    client: Socket,
    sender: Player,
    request: ChatMessageRequest,
    message: ChatMessage,
  ): Promise<void> {
    if (!request.targetId) return;

    const isBlocked = await this.isBlocked(sender.id, request.targetId);
    if (isBlocked) {
      client.emit('chat:message', {
        ...message,
        senderId: 'system',
        senderName: 'System',
        message: 'That player is not accepting messages from you.',
        channel: 'system',
      } as ChatMessage);
      return;
    }

    const targetSocket = this.playerService.getSocketByPlayerId(request.targetId);
    if (targetSocket) {
      this.server!.to(targetSocket).emit('chat:message', message);
      client.emit('chat:message', message); // Echo to sender
    } else {
      client.emit('chat:message', {
        ...message,
        senderId: 'system',
        senderName: 'System',
        message: 'That player is not online.',
        channel: 'system',
      } as ChatMessage);
    }
  }

  private sanitize(text: string): string {
    return text.trim().slice(0, 200);
  }
}
```

### Pattern 3: Client-Side Mute Filtering

**What:** The server sends all broadcast messages (zone, faction, global) without filtering. The client's `chatStore` holds the mute list and filters messages before adding them to the display list.

**When to use:** Zone, faction, global channels where recipients are many and muting is soft ("I don't want to see this person's messages").

**Trade-offs:** Muted players can still see the muter's messages. This is intentional — mute is one-directional, block is bidirectional. Server-side filtering for broadcasts would require iterating all recipients per message, which is costly.

**Block vs Mute distinction:**
- **Mute:** Client-side only. Receiver filters `chatStore`. Sender's messages still reach the server and other players.
- **Block:** Server-side enforced for whispers (`routeWhisper` checks block list before delivering). For broadcasts, same as mute — client filters. Both persist to DB.

```typescript
// chatStore.ts -- filter on incoming message
gameSocket.on('chat:message', (msg: ChatMessage) => {
  const { mutedPlayerIds } = useChatStore.getState();
  if (mutedPlayerIds.includes(msg.senderId)) return; // silently drop
  useChatStore.getState().addMessage(msg);
});
```

### Pattern 4: Dedicated chatStore (Side-Effect Registration)

**What:** Follow the established pattern of `questStore.ts`, `statsStore.ts`, `loreStore.ts` — a Zustand store file that also registers its own `gameSocket.on()` listeners as a module side-effect. `GameUI.tsx` imports it to trigger registration.

**When to use:** Any domain with both state and socket event handling. Keeps `gameStore.ts` from growing further.

**Example:**
```typescript
// apps/web/src/store/chatStore.ts
import { create } from 'zustand';
import { ChatMessage, ChatChannel } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

interface ChatState {
  messages: ChatMessage[];
  activeChannel: ChatChannel;
  mutedPlayerIds: string[];
  blockedPlayerIds: string[];
  whisperTarget: { id: string; name: string } | null;
  addMessage: (msg: ChatMessage) => void;
  setActiveChannel: (channel: ChatChannel) => void;
  setWhisperTarget: (target: { id: string; name: string } | null) => void;
  addMute: (playerId: string) => void;
  removeMute: (playerId: string) => void;
  addBlock: (playerId: string) => void;
  removeBlock: (playerId: string) => void;
  loadModeration: (mutedIds: string[], blockedIds: string[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  activeChannel: 'zone',
  mutedPlayerIds: [],
  blockedPlayerIds: [],
  whisperTarget: null,
  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages.slice(-199), msg],
    })),
  setActiveChannel: (channel) => set({ activeChannel: channel }),
  setWhisperTarget: (target) => set({ whisperTarget: target }),
  addMute: (id) => set((state) => ({ mutedPlayerIds: [...state.mutedPlayerIds, id] })),
  removeMute: (id) => set((state) => ({ mutedPlayerIds: state.mutedPlayerIds.filter(x => x !== id) })),
  addBlock: (id) => set((state) => ({ blockedPlayerIds: [...state.blockedPlayerIds, id] })),
  removeBlock: (id) => set((state) => ({ blockedPlayerIds: state.blockedPlayerIds.filter(x => x !== id) })),
  loadModeration: (mutedIds, blockedIds) =>
    set({ mutedPlayerIds: mutedIds, blockedPlayerIds: blockedIds }),
}));

// Side-effect: register socket listener (activated when GameUI.tsx imports this module)
gameSocket.on('chat:message', (msg: ChatMessage) => {
  const { mutedPlayerIds, addMessage } = useChatStore.getState();
  if (mutedPlayerIds.includes(msg.senderId)) return;
  addMessage(msg);
});
```

---

## Data Flow

### Channel Routing (Server)

```
Client emits 'chat:send' { message, channel, targetId? }
    |
    v
GameGateway.handleChat()
    | playerService.getPlayerBySocket(client.id)
    | validates player is authenticated
    |
    v
ChatService.routeMessage(client, player, request)
    |
    +-- channel = 'local'   -> iterate zone players, distance check, emit per-socket
    +-- channel = 'zone'    -> server.to(zoneId).emit('chat:message', msg)
    +-- channel = 'faction' -> server.to('faction:verdant').emit('chat:message', msg)
    +-- channel = 'global'  -> server.emit('chat:message', msg)
    +-- channel = 'whisper' -> check block list -> server.to(targetSocket).emit() + echo
```

### Message Display (Client)

```
Server emits 'chat:message'
    |
    v
socket.ts dispatch()
    |
    v
chatStore listener (gameSocket.on 'chat:message')
    | check mutedPlayerIds -- drop if muted
    | addMessage()
    |
    v
ChatPanel re-renders
    | filter messages by activeChannel tab
    | display formatted with channel color
```

### Mute/Block Persistence Flow

```
Player right-clicks name -> "Mute [Name]"
    |
    v
chatStore.addMute(playerId)  <- immediate UI effect
    |
    v
REST API call: POST /api/characters/:id/chat/mute { targetId }
    |
    v
API controller -> DB insert into chat_mute_list

On login (auth:success):
    |
    v
REST API call: GET /api/characters/:id/chat/moderation
    | returns { mutedIds: [], blockedIds: [] }
    |
    v
chatStore.loadModeration(mutedIds, blockedIds)
```

**Note on transport for mute/block:** These are persisted via the REST API (`apps/api`), not WebSocket. Mute/block operations are infrequent, not latency-sensitive, and benefit from standard HTTP error handling.

### Faction Room Lifecycle

```
Client connects -> handleConnection() (no room join yet)
    |
    v
Client authenticates -> handleAuth()
    | playerService.authenticate()
    | client.join(player.position.zoneId)          <- existing
    | client.join(`faction:${player.faction}`)     <- NEW
    | emit zone:state, auth:success

Client disconnects -> handleDisconnect()
    | Socket.IO automatically leaves all rooms on disconnect
    | (no explicit leave needed)
```

---

## Integration Points

### Existing Components That Require Modification

| Component | Change | Why |
|-----------|--------|-----|
| `GameGateway.handleAuth()` | Add `client.join('faction:' + player.faction)` | Enable faction room routing |
| `GameGateway.handleChat()` | Replace inline switch with `chatService.routeMessage()` | Delegate to ChatService |
| `GameGateway` constructor + `afterInit()` | Inject and set server on ChatService | Follow established pattern |
| `GameModule` providers + exports | Add `ChatService` | NestJS DI registration |
| `socket.ts` serverEvents array | Add `'chat:message'` | Currently missing -- messages never dispatched to handlers |
| `gameStore.ts` chat socket handler | Remove inline `chat:message` listener | Moved to chatStore |
| `shared-types/events.ts` ChatChannel | Add `'local'` to union | New channel type |
| `GameUI.tsx` imports | Add `import '../store/chatStore'` as side-effect | Register socket listener |

### New Components

| Component | Integrates With | Notes |
|-----------|----------------|-------|
| `ChatService` | `PlayerService` (read-only), `Server` (Socket.IO) | Must call `setServer()` in `afterInit()` |
| `chatStore` | `gameSocket`, existing `ChatPanel` | Replace `gameStore.chatMessages` usage in panel |
| `chat_mute_list` schema | `packages/database` | Drizzle table, follow `quest-progress.ts` as template |
| `chat_block_list` schema | `packages/database` | Same pattern |
| REST endpoints (moderation) | `apps/api` CharactersController | GET moderation data, POST/DELETE mute, POST/DELETE block |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `ChatService` <-> `PlayerService` | Direct method calls | No circular dep -- ChatService depends on PlayerService only |
| `ChatService` <-> `Socket.IO Server` | Direct `server.to().emit()` | Same pattern as ZonesService, CombatService |
| `chatStore` <-> `ChatPanel` | Zustand subscribe | ChatPanel reads `messages`, `activeChannel`, `mutedPlayerIds` |
| `chatStore` <-> `apps/api` | REST fetch calls | Mute/block loaded on auth:success, persisted on change |
| `gameStore` <-> `chatStore` | None after migration | System messages written to chatStore going forward |

---

## Database Schema

### `chat_mute_list`

```typescript
// packages/database/src/schema/chat-mute-list.ts
import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { characters } from './characters';

export const chatMuteList = pgTable('chat_mute_list', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  mutedCharacterId: uuid('muted_character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueMute: unique().on(table.characterId, table.mutedCharacterId),
}));
```

### `chat_block_list`

```typescript
// packages/database/src/schema/chat-block-list.ts
import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { characters } from './characters';

export const chatBlockList = pgTable('chat_block_list', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  blockedCharacterId: uuid('blocked_character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueBlock: unique().on(table.characterId, table.blockedCharacterId),
}));
```

---

## Anti-Patterns

### Anti-Pattern 1: Server-Side Mute Filtering for Broadcasts

**What people do:** Check every recipient's mute list server-side before broadcasting zone/faction/global messages.

**Why it's wrong:** O(players x mute_list_size) database or cache lookups per message. For zone chat with 20 players each having a 50-entry mute list, that is 1000 checks per message. This becomes the hot path.

**Do this instead:** Server broadcasts to all recipients; client filters using its loaded mute list. Mute is a soft social feature -- occasional display of a muted message (e.g., when list is loading) is acceptable.

### Anti-Pattern 2: Routing Faction Chat by Iterating All Players

**What people do:** Loop through `playerService.getAllOnlinePlayers()`, filter by `player.faction`, and emit per-socket.

**Why it's wrong:** O(n) iteration every message. With 200 online players, this is 200 Map lookups and potential socket emits per faction message.

**Do this instead:** Use Socket.IO rooms. `server.to('faction:verdant')` uses Socket.IO's internal room index, which is O(room_size) without the full-player iteration.

### Anti-Pattern 3: Storing Chat History in Database

**What people do:** Persist chat messages to a messages table for history/replay.

**Why it's wrong:** The milestone spec explicitly requires ephemeral messages. Even setting that aside, chat volume would rapidly bloat the database with low-value data.

**Do this instead:** Messages exist only in-memory on the server (in-flight) and in the client's `chatStore` ring buffer (200 messages max). On reconnect, no history is replayed.

### Anti-Pattern 4: Adding Whisper Target as Global State

**What people do:** Store "current whisper recipient" as a top-level global or route parameter.

**Why it's wrong:** Whisper conversations are UI-local to the chat panel. Making them global state creates unnecessary coupling.

**Do this instead:** `whisperTarget: { id, name } | null` lives in `chatStore` only. `ChatPanel` reads it to pre-fill the channel tab and target field. Nothing else needs it.

### Anti-Pattern 5: Skipping the chat:message Socket Registration Bug Fix

**What people do:** Build new chat features on top of the existing `socket.ts` without noticing that `chat:message` is missing from the `serverEvents` array.

**Why it's wrong:** Server emits `chat:message` but the client never registered a listener for it. The `dispatch()` function is never called for chat events. All existing chat is silently broken at the client level. This is the first fix needed before any other chat work.

**Do this instead:** Add `'chat:message'` to the `serverEvents` array in `socket.ts` as the very first task.

---

## Build Order (Dependency-Considered)

The order below ensures each step is testable before the next builds on it.

```
Step 1: Foundation -- fix the silent bug + extend types
  - Add 'local' to ChatChannel in shared-types/events.ts
  - Add 'chat:message' to serverEvents array in socket.ts
  - Verify zone chat works end-to-end before proceeding

Step 2: Database -- mute/block persistence schema
  - Create chat_mute_list schema + Drizzle migration
  - Create chat_block_list schema + Drizzle migration
  - Create chat queries (getMuteList, getBlockList, addMute, removeMute, addBlock, removeBlock)
  - Export from packages/database index

Step 3: REST API endpoints -- moderation data access
  - GET /characters/:id/chat/moderation (returns mutedIds + blockedIds)
  - POST /characters/:id/chat/mute + DELETE /:targetId
  - POST /characters/:id/chat/block + DELETE /:targetId

Step 4: ChatService -- server routing
  - Create ChatService with routeMessage(), routeLocal(), routeWhisper()
  - Inject PlayerService and DatabaseService
  - Add to GameModule providers
  - Refactor GameGateway.handleChat() to delegate
  - Add faction room join in handleAuth()
  - Wire setServer() in afterInit()
  - Implement faction channel routing (currently missing from gateway switch)

Step 5: chatStore -- client state
  - Create chatStore.ts with messages, activeChannel, mute/block state
  - Register chat:message socket listener with client-side mute filtering
  - Load moderation data via REST on auth:success
  - Import in GameUI.tsx as side-effect
  - Migrate ChatPanel to use chatStore instead of gameStore.chatMessages

Step 6: ChatPanel UI -- tabbed interface + whisper + moderation controls
  - Add channel tabs (Local, Zone, Faction, Global, Whispers)
  - Filter displayed messages by activeChannel
  - Whisper tab: target name input, conversation view
  - Right-click context menu on sender name: Mute / Block / Whisper
  - Mute/block actions call REST API + update chatStore immediately
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-500 concurrent | Current architecture sufficient. In-memory player map handles routing. |
| 500-5000 concurrent | Global channel becomes noisy. Rate-limit per player (1 msg/sec). Zone and faction rooms scale well with Socket.IO. |
| 5000+ concurrent | Multiple game-server instances break faction rooms (rooms are per-process). Add Redis adapter for Socket.IO room distribution. |

**First bottleneck:** Global channel at high concurrency. Rate-limit `global` more aggressively (e.g., 1 msg/2sec) compared to zone (1 msg/sec).

**Second bottleneck:** Local channel proximity calculation (`routeLocal`) is O(zone_players) per message. Acceptable for current scale (zones hold at most ~50 players by zone cap design).

---

## Sources

- Direct codebase analysis: `apps/game-server/src/game/game.gateway.ts` (lines 403-437, existing handleChat)
- Direct codebase analysis: `packages/shared-types/src/network/events.ts` (ChatMessage, ChatChannel, ClientEvents, ServerEvents)
- Direct codebase analysis: `apps/web/src/network/socket.ts` (serverEvents array -- confirmed `chat:message` is absent)
- Direct codebase analysis: `apps/web/src/ui/panels/ChatPanel.tsx` (current UI state, hardcoded zone channel)
- Direct codebase analysis: `apps/web/src/store/gameStore.ts` (chatMessages location, system message patterns)
- Direct codebase analysis: `packages/database/src/schema/characters.ts` (Drizzle schema patterns)
- Direct codebase analysis: `apps/game-server/src/game/game.module.ts` (NestJS module structure)
- Existing service patterns: `combat.service.ts`, `quest.service.ts`, `lore.service.ts` (setServer pattern, injection pattern)
- Socket.IO: room-based broadcasting is O(room_size), automatic room leave on socket disconnect

---

*Architecture research for: In-game chat system (v1.22 milestone)*
*Researched: 2026-02-26*
