# Pitfalls Research: v1.22 In-Game Chat System

**Domain:** Adding multi-channel chat with moderation to an existing NestJS + Socket.IO + React/Phaser multiplayer game
**Researched:** 2026-02-26
**Confidence:** HIGH

---

## Executive Summary

Adding chat to an existing real-time multiplayer game is deceptively risky. The game already works: movement is smooth, combat is responsive, and the Socket.IO event loop is finely tuned. Chat is a high-frequency addition that shares the same connection and the same Node.js event loop. The pitfalls are not about chat being hard — they are about chat breaking the game around it.

The five failure modes most specific to this codebase:

1. **WASD captured by Phaser while chat input is focused** — player types "was" and their character walks west-south. This is the most immediately obvious and worst user-experience bug possible, and the existing `KeyboardPlugin` pattern makes it happen by default.
2. **Global channel broadcasts to every connected socket** — the existing handler uses `this.server.emit('chat:message', message)` for global. At scale this is a full server fan-out on every global message. This is already written wrong.
3. **No rate limiting on chat:send** — the existing gateway handler has none. Movement has a 140ms throttle; chat has nothing. A script can flood the server.
4. **Faction channel leaks to wrong faction** — the existing handler has no `faction` case at all. The `ChatChannel` type includes `'faction'` but the switch statement does not handle it, meaning a faction message silently drops (or falls through to the default no-op).
5. **Mute/block enforced only on client** — if mute state lives in React state but not validated server-side, any player can receive messages from muted players by inspecting socket traffic, and blocked users can still whisper by connecting with a second client.

This document covers pitfalls **specific to adding chat to the existing Into the Void codebase**, informed by direct codebase analysis of `game.gateway.ts`, `player.service.ts`, `events.ts`, and the shared-types chat interfaces.

---

## Critical Pitfalls

### Pitfall 1: Phaser WASD Capture Breaks Chat Input — Keys Type AND Move

**What goes wrong:**
A player clicks into the chat input field and types a message. Every keystroke that matches a movement key (W, A, S, D, arrow keys) is simultaneously processed by Phaser's `KeyboardPlugin`, which runs on `window`. The player's character moves while they type. Pressing Enter to send a message may also trigger a Phaser binding if Enter is mapped to anything in-game. The chat panel is unusable.

This is not a theoretical risk. The `WorldScene` adds key bindings on `window` via NestJS's Phaser `KeyboardPlugin`. When a `<textarea>` or `<input>` inside a React component receives focus, Phaser still processes the same keydown events unless explicitly disabled.

**Why it happens:**
Phaser 3's `KeyboardPlugin` listens on the `window` object, not on the canvas element. Keyboard events from input fields bubble up to `window` and are processed by Phaser. The existing codebase already has this problem recognized for ESC (addressed with `escKeyManager.ts` in v1.21), but chat introduces text input — a case that is categorically different from modal key handling.

From Phaser discourse: "Phaser's keyboard events are global. If you have a text input, the WASD keys will be captured by the game regardless of focus."

**How to avoid:**
Two defenses in combination:

1. When the chat input is focused, disable Phaser keyboard processing:
```typescript
// In WorldScene.ts — call from chat input focus event
disableKeyboard(): void {
  this.input.keyboard?.enableGlobalCapture();  // stop capturing key events
  // OR: this.input.keyboard!.enabled = false;
}

enableKeyboard(): void {
  this.input.keyboard?.disableGlobalCapture();
  // OR: this.input.keyboard!.enabled = true;
}
```

2. In the React chat input component, emit Phaser enable/disable signals via the existing game event system (EventEmitter2 or a shared ref):
```typescript
// ChatPanel.tsx
<input
  onFocus={() => gameEvents.emit('chat:input:focus')}
  onBlur={() => gameEvents.emit('chat:input:blur')}
/>
```

The `WorldScene` subscribes to these events and toggles `this.input.keyboard!.enabled`. This is the cleanest pattern because it keeps Phaser knowledge inside the Phaser scene and UI knowledge inside React.

**Warning signs:**
- Character moves while player is typing in chat
- Enter key unexpectedly triggers an in-game action when chat field is focused
- Arrow keys scroll the chat window AND move the character simultaneously
- Player must click outside chat to stop character movement

**Phase to address:** Chat Panel UI phase — this must be solved at the moment the input field is added. It cannot be deferred. A chat input without keyboard isolation is immediately broken.

---

### Pitfall 2: Global Channel Fan-Out Degrades Gameplay Events Under Load

**What goes wrong:**
The current `chat:send` handler for global channel uses `this.server.emit('chat:message', message)`. This broadcasts to **every connected socket on the server**, including players in different zones, players who are mid-combat, and players who are not subscribed to global. Socket.IO's `server.emit()` iterates over every connected socket in the main adapter and serializes the payload for each one. At 100 concurrent players, a single global chat message causes 100 serializations + 100 writes. At 500 concurrent players, it is 500. Movement events go to zone rooms (typically 5–30 players). Global chat messages go to everyone.

The problem compounds when multiple players type in global simultaneously. Ten players chatting in global at 1 message/second generates 10 × N serialization + write operations per second on the event loop shared with combat ticks, movement processing, and AI loops.

**Why it happens:**
`server.emit()` is the shortcut everyone reaches for when "broadcast to all" is the intent. The existing handler was written this way:
```typescript
case 'global':
  this.server.emit('chat:message', message);  // BAD: full fan-out
  break;
```
It works at zero load. It degrades gracefully at tens of players. It becomes a latency problem at hundreds.

**How to avoid:**
Use a dedicated Socket.IO room for global chat that all authenticated players join on connect. Players join this room at auth time, in addition to their zone rooms:

```typescript
// In handleAuth, after successful auth:
client.join('chat:global');       // Global chat room
client.join(`chat:faction:${player.faction}`); // Faction chat room
```

Then broadcast to the room rather than the server:
```typescript
case 'global':
  this.server.to('chat:global').emit('chat:message', message);
  break;
case 'faction':
  this.server.to(`chat:faction:${player.faction}`).emit('chat:message', message);
  break;
```

The functional difference: `server.emit()` sends to sockets even if they disconnected mid-frame; `server.to(room).emit()` is scoped and handled by the adapter with much lower overhead.

**Warning signs:**
- Movement latency increases measurably when chat is active (use DevTools Network WebSocket timing)
- Combat damage events arrive late when players are actively chatting globally
- Server CPU spikes correlate with global chat activity, not with player count
- Game feels "laggy" but only when chat is in use

**Phase to address:** Core chat socket events phase — fix the room architecture before a single channel goes live. Retro-fitting rooms later requires touching auth, disconnect, and every broadcast site.

---

### Pitfall 3: No Rate Limiting on chat:send — Spam Floods the Event Loop

**What goes wrong:**
The current `chat:send` handler in `game.gateway.ts` performs no rate limiting. A player (or script) can emit `chat:send` events as fast as the TCP stack allows — potentially thousands per second. Each event is processed synchronously in the NestJS gateway, constructs a message object, and fans it out to the target room. At high volume, this:
- Saturates the event loop (blocking movement and combat processing)
- Floods other players' UI with unusable chat
- Can be used as a denial-of-service vector against a specific zone or the global channel

Movement has a 140ms server-side throttle (`lastMoveTimes` map in `PlayerService`). Chat has none.

**Why it happens:**
Chat feels lightweight — it is just a string. Rate limiting is added as an afterthought after spam is observed in production. The existing gateway pattern is: receive event → validate auth → process. There is no per-player per-event-type throttle infrastructure for chat.

**How to avoid:**
Apply the same pattern as movement throttling. Add a `lastChatTimes` map to `PlayerService` (or create a dedicated `ChatService`):

```typescript
// PlayerService addition
private lastChatTimes: Map<string, number> = new Map();
private readonly CHAT_COOLDOWN_MS = 1000; // 1 message per second
private readonly CHAT_BURST_LIMIT = 5;    // Allow burst of 5 before throttle
private chatBurstCounts: Map<string, number> = new Map();

canSendChat(playerId: string): boolean {
  const now = Date.now();
  const last = this.lastChatTimes.get(playerId) || 0;
  const burst = this.chatBurstCounts.get(playerId) || 0;

  if (now - last > this.CHAT_COOLDOWN_MS * this.CHAT_BURST_LIMIT) {
    // Window expired — reset burst count
    this.chatBurstCounts.set(playerId, 1);
    this.lastChatTimes.set(playerId, now);
    return true;
  }

  if (burst < this.CHAT_BURST_LIMIT) {
    this.chatBurstCounts.set(playerId, burst + 1);
    this.lastChatTimes.set(playerId, now);
    return true;
  }

  return false; // Rate limited
}
```

In the gateway handler, check before processing:
```typescript
if (!this.playerService.canSendChat(player.id)) {
  client.emit('error', { code: 'RATE_LIMITED', message: 'Slow down, pilot.' });
  return;
}
```

**Warning signs:**
- Chat panel floods with messages from one player on any test
- Server CPU spikes when a player pastes long text rapidly
- A player can send 50 messages and they all appear simultaneously (no client-side debounce)
- Game becomes unresponsive when chat spam is active

**Phase to address:** Core chat socket events phase — rate limiting must be in the first handler implementation. It is a security feature, not a polish feature.

---

### Pitfall 4: Faction Channel Not Implemented — Messages Silently Drop

**What goes wrong:**
The `ChatChannel` type includes `'faction'`. Players can select faction chat in the UI, type a message, and emit `chat:send` with `channel: 'faction'`. The existing gateway `switch` statement has cases for `'zone'`, `'global'`, and `'whisper'` only. The `'faction'` case hits the implicit `default` (no-op). The message is received by the server, validated for auth, and silently discarded. The sender sees their own message appear if the client optimistically renders it, but no one else receives it. There is no error sent back.

**Why it happens:**
`ChatChannel` type was defined with `'faction'` included as a future-ready type, but the gateway handler was not implemented in full. It is easy to miss because TypeScript does not enforce exhaustive switch coverage on union types by default.

**How to avoid:**
Implement the faction case using faction rooms (see Pitfall 2):
```typescript
case 'faction':
  this.server.to(`chat:faction:${player.faction}`).emit('chat:message', message);
  break;
```

Add a TypeScript exhaustiveness check to the switch:
```typescript
default: {
  const _exhaustive: never = data.channel;
  client.emit('error', { code: 'INVALID_ACTION', message: `Unknown chat channel: ${data.channel}` });
}
```

This causes a compile error if a new channel is added to `ChatChannel` without updating the handler.

Also note: the `'local'` channel (proximity-based) is in the PROJECT.md requirements but not in the `ChatChannel` type (`events.ts` line 399: `'zone' | 'faction' | 'whisper' | 'global' | 'system'`). There is no `'local'`. The type and the requirements are misaligned. This needs resolution before implementation — either add `'local'` to the type, or confirm that "Local" in the UI maps to `'zone'`.

**Warning signs:**
- Faction chat tab in UI appears to work (optimistic UI shows own messages) but others never see them
- No error in client console, no error emitted from server
- Zone chat works, global works, faction silently drops
- TypeScript does not flag the missing case

**Phase to address:** Core chat socket events phase — all five channels must be implemented together. A partial implementation with silent drops is worse than no implementation (it appears to work).

---

### Pitfall 5: Mute/Block Enforced Client-Side Only — Trivially Bypassed

**What goes wrong:**
The straightforward implementation of mute and block is: store muted player IDs in React state (or Zustand), and filter incoming `chat:message` events before rendering. This feels complete — the muted player's messages no longer appear. But:

1. The server still sends all messages to the muting player. A muted player spamming 10 messages/second still puts 10 socket events in the muting player's receive queue — they are just filtered before display. Under high volume this is wasted bandwidth and event processing.
2. Block (preventing whispers) cannot be enforced client-side at all. A blocked player's whisper `chat:send` event arrives at the server, the server looks up the target's socketId, and emits to them. The server has no knowledge of the block relationship.
3. A player who knows they are blocked can connect a second client instance and whisper freely — the block state exists only in the React component of the first client.

**Why it happens:**
Mute feels like a UI filter. Block feels like an extension of mute. Both are instinctively implemented as client-side filtering because that is the simplest path. Server-side enforcement requires a database table, a lookup on every incoming message, and persistence across sessions.

**How to avoid:**
Two-tier enforcement:

**Client-side (for mute — UX filtering):**
Muted player IDs stored in Zustand (persisted to localStorage). Incoming `chat:message` events with `senderId` in the mute list are filtered before render. This is acceptable because mute is a soft preference — the server still delivers the message (bandwidth acceptable at small scale), but the player does not see it.

**Server-side (mandatory for block — prevents whispers):**
Block list must be persisted in the database (new table: `chat_blocks`) and checked on every whisper:

```typescript
// ChatService.ts
async isBlocked(senderId: string, recipientId: string): Promise<boolean> {
  return this.db.query.chatBlocks.findFirst({
    where: and(
      eq(chatBlocks.blockerId, recipientId),
      eq(chatBlocks.blockedId, senderId)
    )
  }) !== undefined;
}
```

In the `chat:send` handler for whispers:
```typescript
case 'whisper':
  if (data.targetId) {
    const blocked = await this.chatService.isBlocked(player.id, data.targetId);
    if (blocked) {
      // Silently discard (do not inform sender that they are blocked)
      return;
    }
    // ... send whisper
  }
```

Do not tell the sender they are blocked — that reveals the block relationship and enables harassment by other means.

**Warning signs:**
- Blocked player opens browser devtools, inspects socket traffic, sees whispers arriving at socket level
- Testing block by connecting two browser tabs — muted player's second tab can still whisper freely
- Mute list resets on page reload (not persisted)
- Block does not survive logout (block list only in React state)

**Phase to address:** Mute/block phase — block must be server-enforced from day one. Mute can be client-side with localStorage persistence. Do not merge block as client-only.

---

### Pitfall 6: Whisper Target Lookup by Player ID Fails if Target is Offline

**What goes wrong:**
The existing whisper implementation (already in `game.gateway.ts`) looks up the target by player ID via `this.playerService.getSocketByPlayerId(data.targetId)`. If the target player is offline, `getSocketByPlayerId` returns `undefined`. The whisper is silently discarded. The sender receives no feedback — no error, no "player is offline" message.

This creates confusion: `/whisper PlayerName Hey!` appears to send (no error) but the recipient never receives it.

**Why it happens:**
`getSocketByPlayerId` is a fast in-memory lookup of currently connected players. It correctly returns `undefined` for offline players. The existing handler checks `if (targetSocket)` and does nothing if it is `undefined` — an empty branch with no response to the sender.

**How to avoid:**
Add explicit feedback when the whisper target cannot be reached:

```typescript
case 'whisper':
  if (!data.targetId) {
    client.emit('error', { code: 'INVALID_ACTION', message: 'Whisper requires a target player ID.' });
    return;
  }

  const targetSocket = this.playerService.getSocketByPlayerId(data.targetId);
  if (!targetSocket) {
    // Send system message back to sender
    client.emit('chat:message', {
      id: crypto.randomUUID(),
      senderId: 'system',
      senderName: 'System',
      message: `Player is not online or does not exist.`,
      channel: 'system',
      timestamp: Date.now(),
    });
    return;
  }
  // ... send whisper
```

Note: Do not reveal whether the player exists at all vs. is offline — this leaks account information. A generic "Player is not online" is sufficient.

**Warning signs:**
- Typing a whisper to an offline player produces no visible response — the message appears to vanish
- Whisper test only succeeds when both players are logged in during testing
- Players report "whispers not working" because they tested with offline characters

**Phase to address:** Whisper implementation phase — error feedback is part of the feature specification, not a polish item.

---

### Pitfall 7: Zone Chat Uses Zone Room but 'Local' Proximity Chat Requires Distance Calculation

**What goes wrong:**
The PROJECT.md v1.22 requirements list "Local chat (proximity-based, nearby players)" as a distinct channel from zone chat. Zone chat uses a Socket.IO room for the entire zone (64x64 tiles). Local chat should only reach players within a proximity radius (e.g., 10 tiles). Implementing local chat the same way as zone chat — broadcasting to the zone room — silently delivers messages to the entire zone, defeating the proximity-local design.

**Why it happens:**
Socket.IO rooms are the natural broadcast primitive. There is no native "proximity" room — rooms are static memberships. Proximity requires server-side distance calculation per message: iterate over players in the sender's zone, compute distance, emit individually to those within range. This is an O(N) operation per message where N is players in the zone.

**How to avoid:**
For local chat, do NOT use a room broadcast. Instead iterate over players in the zone and emit per-socket:

```typescript
case 'local': {
  const LOCAL_RANGE_TILES = 10;
  const playersInZone = this.playerService.getPlayersInZone(player.position.zoneId);

  for (const nearbyPlayer of playersInZone) {
    const distance = Math.hypot(
      nearbyPlayer.position.x - player.position.x,
      nearbyPlayer.position.y - player.position.y
    );
    if (distance <= LOCAL_RANGE_TILES) {
      const targetSocket = this.playerService.getSocketByPlayerId(nearbyPlayer.id);
      if (targetSocket) {
        this.server.to(targetSocket).emit('chat:message', message);
      }
    }
  }
  break;
}
```

This is correct but note the performance implication: at 50 players in a zone, a local chat message requires 50 distance calculations per message. At 1 message/second from 10 players chatting locally, that is 500 distance calculations/second in the gateway. This is acceptable for current scale but should be documented as a known scaling consideration.

Also clarify with the PROJECT.md type mismatch: `ChatChannel` has `'zone'` but not `'local'`. Either the type needs `'local'` added, or local chat maps to `'zone'` with proximity filtering. This ambiguity must be resolved before implementation.

**Warning signs:**
- Local chat messages appear in the UI of players across the entire zone, not just nearby ones
- "Local" and "Zone" tabs feel identical — no behavioral difference
- Performance testing shows O(N) cost per local message with N = zone population

**Phase to address:** Local channel implementation — must clarify the `ChatChannel` type before coding starts. If `'local'` needs to be added, update `events.ts` first.

---

### Pitfall 8: Message Length Not Validated Server-Side — Long Messages Break UI Layout

**What goes wrong:**
A player sends a chat message that is 5,000 characters long. The server accepts it, constructs the `ChatMessage` object, and broadcasts it to the zone room. Every client receiving it renders the message in the chat panel. The message breaks the CSS layout of the chat panel (text overflows container, wraps thousands of lines, potentially causing browser-side layout thrashing). At the extreme, a player sends a message with 10MB of text data, which the server serializes and broadcasts to every player in the zone.

The existing handler reads `data.message` without validation:
```typescript
const message = {
  message: data.message,  // No length check
  ...
};
```

**Why it happens:**
Message length validation feels obvious in retrospect but is frequently omitted in early implementations because testing uses short messages. The `ChatMessageRequest` interface in shared-types has no length constraint.

**How to avoid:**
Server-side validation in the handler (client-side validation is a UX hint, not enforcement):

```typescript
const MAX_MESSAGE_LENGTH = 280; // Twitter-length for game chat

if (!data.message || typeof data.message !== 'string') {
  client.emit('error', { code: 'INVALID_ACTION', message: 'Message is required.' });
  return;
}

const trimmed = data.message.trim();
if (trimmed.length === 0) {
  return; // Silently discard empty messages
}

if (trimmed.length > MAX_MESSAGE_LENGTH) {
  client.emit('error', { code: 'INVALID_ACTION', message: `Message too long (max ${MAX_MESSAGE_LENGTH} characters).` });
  return;
}
```

Also validate the `channel` field is a known value:
```typescript
const VALID_CHANNELS: ChatChannel[] = ['local', 'zone', 'faction', 'global', 'whisper'];
if (!VALID_CHANNELS.includes(data.channel)) {
  return; // Silently discard invalid channel
}
```

**Warning signs:**
- Pasting a wall of text into chat crashes another player's browser tab
- Chat panel layout breaks when a long message appears
- Server logs show multi-KB payloads on chat events
- No maximum is enforced in the UI `<input>` (should have `maxLength`)

**Phase to address:** Core chat socket events phase — validation is part of the handler implementation, not a separate phase.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `server.emit()` for global chat | One line of code | Full fan-out to all sockets, degrades under load | Never — use `server.to('chat:global').emit()` from the start |
| Client-side-only mute filtering | No DB schema needed | Muted players' messages still consume bandwidth; does not survive page reload | Acceptable for mute (soft pref); never for block (whisper enforcement) |
| No rate limiting on chat:send | Simpler handler | Spam floods event loop; DoS vector | Never — rate limit must be in the first implementation |
| Storing mute list in component state | Fast to implement | Resets on unmount; not shared across tabs | Only as a placeholder during development; ship with Zustand + localStorage |
| Using character name as whisper target | User-friendly | Names are not unique by design; multiple players could share a name | Never — always use `playerId` as the lookup key; display name is UI only |
| Optimistic UI for chat (render before server ack) | Zero latency feel | Message appears but server may have rejected it (rate limited, message too long) | Acceptable if error path removes the optimistic message on rejection |

---

## Integration Gotchas

Common mistakes when connecting chat to the existing system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Phaser KeyboardPlugin + chat `<input>` | WASD triggers movement while typing | `this.input.keyboard!.enabled = false` on input focus; re-enable on blur |
| Zone rooms + chat:zone | Sending to zone room works, but faction room does not exist yet | Create faction rooms at auth time; all channels need rooms before any handler is implemented |
| `updatePlayerRooms()` + faction room | `updatePlayerRooms` replaces all rooms on zone transition; faction room gets left | Faction room join must survive `updatePlayerRooms` — either add faction rooms to the "required" set or rejoin them after `updatePlayerRooms` runs |
| Whisper `targetId` + player names | UI shows player names; tempting to use name as target lookup | Always use `playerId` for server lookup; `getSocketByPlayerId` is the correct path |
| Block list + database schema | No `chat_blocks` table exists; implementing block without schema | Requires a new Drizzle migration before block feature can be tested |
| ESC key + chat input | ESC closes the chat panel or dismisses focus; same `escKeyManager` handles it | Add chat blur as an ESC handler at the lowest priority (fires last, before "open game menu") |
| chat:message event + combat log | Both `chat:message` and `combat:damage` events arrive on same socket | Chat messages must not pollute the combat log panel; filter by channel in the store handler |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `server.emit()` for global | Gameplay latency increases with chat activity | Use `server.to('chat:global')` room | Noticeable at ~50 concurrent chatting players |
| No chat rate limiting | Spam makes the server unresponsive | 1 message/second per player with burst allowance of 5 | Immediately with a single determined spammer |
| Local chat O(N) per message with no rate limit | Server CPU spikes during busy local chat in crowded zones | Rate-limit local chat more aggressively (1.5s cooldown) | At ~30 players in one zone all chatting |
| Unlimited message history in React state | Chat panel UI becomes sluggish after a long session | Cap stored messages at 200 per channel; discard oldest | After ~2 hours of active chatting (hundreds of messages) |
| Rendering chat messages without `key` prop | React re-renders all messages on any new message | Each message needs a stable `id` key (already in `ChatMessage` type — use `message.id`) | After ~50 messages in a busy channel |
| chat:message handler is async with DB calls | Handler blocks event loop waiting for DB (mute check, block check) | Cache mute/block lists in memory; refresh on change event | Immediately if DB check is in every message path |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No server-side message length validation | 10MB message payload transmitted to all zone players; DoS vector | Hard cap at 280 characters server-side before processing |
| Block enforced client-side only | Blocked players can send whispers by opening devtools or second client | Server checks block relationship before delivering whisper |
| Revealing "player offline" vs "player does not exist" in whisper error | Leaks account existence to potential stalkers | Use single message: "Player is not online" for both cases |
| Trusting `senderName` from client in `ChatMessageRequest` | Client sends a spoofed sender name impersonating another player | Server constructs `senderName` from `player.name` in `PlayerService`; never use `data.senderName` — already done correctly in existing handler |
| XSS via chat message rendered as innerHTML | Malicious player sends `<script>` tag; other players' sessions compromised | Render all chat messages as text content, not HTML; React's JSX default rendering is safe as long as `dangerouslySetInnerHTML` is not used |
| Faction chat without membership verification | Player switches faction client-side and sends to `chat:faction:verdant` | Server derives faction from `player.faction` on the server object, not from client-provided data — already correct in design |

---

## UX Pitfalls

Common user experience mistakes when adding chat to a game.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Chat input captures all keys (including ESC, Tab) | ESC to open menu instead closes/blurs chat input; Tab moves browser focus off the panel | Handle ESC in the input's `onKeyDown` to blur the field; trap Tab within the panel if needed |
| Auto-scroll triggers while player is reading history | Player scrolls up to read old messages; new message arrives and jumps them to bottom | Only auto-scroll when the player is already at the bottom (scroll position check before scrolling) |
| No unread indicator when player is on a different channel tab | Player misses whispers while on Zone tab | Show badge count or tab highlight for unread messages on inactive channels |
| Sending empty messages (just whitespace) | Server accepts it; other players see blank messages | Trim and validate on server; discard empty trimmed messages silently |
| Chat panel positioned at bottom-left always visible | Panel overlaps game content on small screens; cannot dismiss | Make panel resizable or collapsible; minimum height config |
| Whisper tab does not show who the conversation is with | Player receives a whisper, switches to Whisper tab — no indication of which player sent it | Whisper tab should show conversation thread per player, or at minimum the senderName prominently |
| "Player not found" for whisper does not name the target | Error says "player not online" but player typed a name — was it spelled wrong? | Echo back: "Player 'XYZ' is not online." |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Keyboard isolation:** Chat input renders and accepts text — verify WASD does NOT simultaneously move the character while typing
- [ ] **Faction channel delivery:** Faction chat appears to send — verify a player from a DIFFERENT faction does NOT receive the message
- [ ] **Block enforcement:** Blocked player is blocked — verify the block survives page reload, and verify a second browser tab from the blocked player cannot whisper
- [ ] **Rate limiting:** Rate limit is implemented — verify sending 10 messages in rapid succession triggers the throttle and returns an error, not silently drops
- [ ] **Whisper error feedback:** Whispering an offline player — verify the sender receives a system message, not silence
- [ ] **Mute persistence:** Mute list is saved — verify muted players remain muted after page reload (Zustand localStorage persist)
- [ ] **Global room membership:** Global chat works for all players — verify a player who joined after server start receives global messages (room join at auth time)
- [ ] **Faction room on zone transition:** Faction chat works after crossing a zone boundary — verify `updatePlayerRooms` does not remove the faction room
- [ ] **Chat does not pollute combat log:** Sending a chat message — verify it does NOT appear in the combat log panel (filtered by channel in the store)
- [ ] **Message length enforcement:** Pasting 500 characters — verify server returns error and does NOT broadcast the full message to the zone

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Keyboard capture breaking WASD | LOW | Add `onFocus`/`onBlur` handlers to chat input; disable/enable Phaser keyboard; one afternoon of work |
| Global fan-out causing latency | MEDIUM | Refactor gateway to use chat rooms; requires touching auth, disconnect, and all broadcast sites; no DB changes needed |
| Rate limiting missing | LOW | Add `lastChatTimes` map to `PlayerService`; check in handler; ~50 lines of code |
| Block enforced client-side discovered post-ship | HIGH | Requires new DB migration, new `chat_blocks` table, query on every whisper path, migration of existing user block lists; plan for 1–2 days |
| Faction room removed on zone transition | LOW | Add `chat:faction:${faction}` to the required rooms set in `updatePlayerRooms`; 3-line fix |
| XSS discovered in chat rendering | LOW (if React JSX used correctly) | If `dangerouslySetInnerHTML` was used, replace with text content; 1-line fix per component |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Phaser keyboard + chat input conflict | Chat Panel UI | Type "wasd" in chat input; character must not move |
| Global fan-out performance | Core chat socket events | Add chat rooms at auth time; use `server.to(room)` not `server.emit()` |
| No rate limiting on chat:send | Core chat socket events | Send 10 messages in 1 second; verify server returns rate-limit error |
| Faction channel silent drop | Core chat socket events | Send faction message; player in same faction receives it; player in other faction does not |
| Mute/block client-only | Mute/block persistence phase | Block a player; log out and back in; blocked player cannot whisper |
| Whisper offline target silent failure | Whisper system phase | Whisper offline player; verify system error message returned to sender |
| Local proximity vs zone chat confusion | Local channel phase | Send local message; player 15 tiles away does NOT receive it |
| Message length unbounded | Core chat socket events | Send 500-character message; verify server error, no broadcast |
| Faction room lost on zone transition | Core chat socket events | Cross zone boundary; send faction message; verify it still delivers |
| Chat history memory leak in React | Chat Panel UI | Chat for 2+ hours; verify panel does not degrade; cap at 200 messages per channel |

---

## Sources

- Codebase analysis: `apps/game-server/src/game/game.gateway.ts` (lines 403–437, 1675–1705), `apps/game-server/src/game/player.service.ts`, `packages/shared-types/src/network/events.ts` (lines 378–399)
- [Change keyboard event target — Phaser Discourse](https://phaser.discourse.group/t/change-keyboard-event-target/12144) — Keyboard target scoping to canvas vs window
- [Help with Phaser stealing keypress focus — HTML5 Game Devs](https://www.html5gamedevs.com/topic/11715-help-with-phaser-stealing-keypress-focus/) — WASD captured by Phaser when input fields are focused
- [Rooms — Socket.IO Documentation](https://socket.io/docs/v3/rooms/) — Room broadcast scoping and membership semantics
- [Performance tuning — Socket.IO Documentation v4](https://socket.io/docs/v4/performance-tuning/) — `server.emit()` cost vs room broadcast cost
- [Mastering Socket.IO Rooms for Real-Time Apps in 2025 — VideoSDK](https://www.videosdk.live/developer-hub/socketio/socketio-rooms) — Room patterns, broadcast scoping, adapter behavior
- [NestJS WebSockets: Rate Limiting and Acknowledgements — DEV Community](https://dev.to/delightfulengineering/nest-js-websockets-rate-limiting-and-acknowledgements-57oa) — WsThrottlerGuard, per-event rate limiting in NestJS gateway
- [In-game chat: Eight key features and how to deliver them — Ably](https://ably.com/blog/in-game-chat-features) — Mute/block enforcement, moderation patterns for games
- [VirtualizedMessageList — Stream Chat React Docs](https://getstream.io/chat/docs/sdk/react/components/core-components/virtualized_list/) — Chat history virtualization, auto-scroll behavior
- [Cross Site Scripting Prevention — OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — Output encoding, never use innerHTML for user content
- [Token Bucket Rate Limiting — DEV Community](https://dev.to/fahimahammed/protect-your-api-with-token-bucket-rate-limiting-1g9a) — Token bucket implementation pattern for burst tolerance
- [In-Game Chat: Key Features and Implementation Guide — Watchers.io](https://watchers.io/post/in-game-chat) — Channel types, moderation requirements, whisper edge cases

---

*Pitfalls research for: In-Game Chat System (v1.22) — adding multi-channel chat to existing real-time multiplayer game*
*Researched: 2026-02-26*
