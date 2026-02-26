# Project Research Summary

**Project:** Into the Void — v1.22 In-Game Chat System
**Domain:** Multi-channel MMO chat with proximity, faction, and whisper routing, plus mute/block moderation
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

The v1.22 chat milestone is an extension of existing infrastructure, not a greenfield feature. The game already has Socket.IO rooms, a `handleChat` gateway handler, partial type definitions for all channels, a basic `ChatPanel.tsx`, and 100-message in-memory history in `gameStore`. The research reveals that roughly 40% of the required chat system already exists in stub or partial form — the strategic question is not "what to build" but "what to complete correctly and in what order." The recommended approach is to treat the existing stubs as the foundation, fix the known silent bug first (`chat:message` missing from the `serverEvents` array means no chat messages are currently dispatched client-side), then extend each layer methodically: shared types, DB schema, server routing, client store, and UI.

The most important architectural decision is using Socket.IO rooms for all broadcast channels (zone, faction, global) rather than iterating players or using `server.emit()`. Room-based routing is already how zone broadcasting works; extending it to faction rooms at auth time is a minimal change with significant performance benefits. Local (proximity) chat is the single exception: it requires per-message server-side distance calculation against zone players, not a room. This O(N) cost is acceptable at current zone population caps but should be rate-limited more aggressively than other channels.

The highest-risk element of this milestone is the Phaser keyboard conflict: when a player focuses the chat input, Phaser's global `KeyboardPlugin` continues to process WASD keystrokes, causing simultaneous character movement. This is the most visible UX defect possible and must be resolved at the moment the text input is added to `ChatPanel.tsx` — it cannot be deferred. Beyond that, mute/block enforcement has a security distinction that matters: mute is a client-side display filter (acceptable), but block must be server-enforced for whispers or a blocked player can trivially bypass it via a second browser tab. These two risks, addressed from the start, make the rest of the implementation straightforward.

## Key Findings

### Recommended Stack

No new runtime infrastructure is required. The entire chat system rides on Socket.IO 4.7, NestJS 10 WebSockets, Drizzle ORM, and Zustand — all already installed and in use. The only new package is `@nestjs/throttler@^6.4.0` for per-socket rate limiting on `chat:send`. Two new Drizzle tables (`chat_mute_list`, `chat_block_list`) require a migration but no schema design risk. Redis (already running on port 6379) is not needed for chat at current scale; it remains reserved for future horizontal scaling.

**Core technologies:**
- `socket.io@^4.7.0`: Chat message transport — Socket.IO rooms handle all broadcast scoping natively; the existing zone room pattern directly extends to faction and global rooms
- `@nestjs/websockets` + `@nestjs/platform-socket.io@^10.3.0`: Gateway receives `chat:send`, delegates to `ChatService` — matches every other game service pattern
- `zustand@^4.5.0`: New `chatStore.ts` extracted from `gameStore` — mirrors `combatLogStore` and `questStore` patterns exactly
- `drizzle-orm@^0.30.0`: Two new tables for mute/block persistence — additive migration, no breaking changes
- `@nestjs/throttler@^6.4.0` (NEW, single install): Rate limiting on `chat:send` — `WsThrottlerGuard` applied at handler level; prevents spam without Redis dependency

**See:** `.planning/research/STACK.md`

### Expected Features

The milestone requirement is a chat panel with five channels (Local, Zone, Faction, Global, Whisper) plus mute and block. Three channels (Zone, Global, Whisper) already route server-side. Two channels (Local, Faction) need implementation. The tabbed UI and moderation system are net new.

**Must have (table stakes — v1.22):**
- Tabbed chat panel (Local / Zone / Faction / Global / Whisper) — the primary UX structure; everything else depends on it
- Local proximity channel (~15-tile radius) — immersive nearby chat; requires server-side distance check per message; no Socket.IO room needed
- Faction channel routing with server enforcement — type exists, gateway has no case; join faction Socket.IO room at auth time
- Global channel tab — already routing server-side; needs tab wired in UI and `chat:global` room used instead of `server.emit()`
- Zone channel tab — already routing server-side; needs tab wired in UI
- Whisper with target selection UI — server routing exists; client needs name-based target input
- Message timestamps rendered — data exists in `ChatMessage`, not displayed in current `ChatPanel.tsx`
- Player mute (client-side filter, DB-persisted across sessions via REST API)
- Player block (server-side whisper enforcement, DB-persisted — cannot be client-only)

**Should have (post-validation, v1.x):**
- Unread badge counts per channel tab — low effort, high UX value; add once tabs are stable
- Faction color-coded sender names — requires `senderFaction` field on `ChatMessage`
- Click-to-whisper from sender name — QoL after whisper tab is confirmed stable
- Whisper reply shortcut (R key) — common MMO UX pattern

**Defer (v2+):**
- Group/party channel — requires party system which does not yet exist
- Speech bubbles above sprites — explicitly out of scope for v1.22 per PROJECT.md
- Profanity filter — only warranted if moderation becomes a validated problem at scale

**See:** `.planning/research/FEATURES-CHAT.md`

### Architecture Approach

The architecture introduces one new server service (`ChatService`) that owns all routing logic, extracted from the existing `GameGateway.handleChat()` inline switch. This follows the pattern already established by `CombatService`, `QuestService`, and `LoreService`. The client gets a dedicated `chatStore.ts` extracted from `gameStore.ts`, following the `combatLogStore`/`questStore` pattern of registering socket listeners as a module side-effect. Mute/block persistence uses the REST API (`apps/api`), not WebSocket, because these are infrequent operations that benefit from HTTP semantics. All five channel types flow through a single `ChatService.routeMessage()` switch, making future channel additions a one-case change with TypeScript exhaustiveness enforcement.

**Major components:**
1. `ChatService` (NEW, `apps/game-server/src/game/`) — routes messages by channel, enforces block lists on whispers, computes proximity for local, constructs `ChatMessage` objects, enforces rate limiting and message length
2. `chatStore.ts` (NEW, `apps/web/src/store/`) — holds messages, active channel, mute/block state, whisper target; registers `chat:message` socket listener with client-side mute filtering as module side-effect
3. `chat_mute_list` + `chat_block_list` tables (NEW, `packages/database/src/schema/`) — Drizzle schemas following `quest-progress.ts` pattern; queried via REST API in `apps/api`
4. `ChatPanel.tsx` (MODIFIED, major rewrite) — tabbed UI replacing flat panel; whisper target input; right-click moderation context menu; keyboard isolation via Phaser disable/enable on focus/blur
5. `GameGateway` (MODIFIED, minor) — delegates to `ChatService`; joins `chat:global` and `faction:${player.faction}` rooms at auth; applies rate limiting guard

**Build order (dependency-driven):**
1. Foundation: fix `chat:message` socket dispatch bug + add `'local'` to `ChatChannel` type
2. Database: mute/block Drizzle schemas + migrations + query functions + REST endpoints
3. `ChatService`: all five channel routing + rate limiting + block enforcement + message validation
4. `chatStore`: client state + socket listener + moderation load on auth:success
5. `ChatPanel` UI: tabs + whisper + mute/block controls + keyboard isolation

**See:** `.planning/research/ARCHITECTURE.md`

### Critical Pitfalls

1. **Phaser WASD capture breaks chat input** — When any React `<input>` is focused, Phaser's global `KeyboardPlugin` still processes movement keys. Fix: emit `chat:input:focus`/`chat:input:blur` game events; `WorldScene` subscribes and toggles `this.input.keyboard!.enabled`. Must be solved when the input field is first added — cannot be deferred.

2. **`server.emit()` for global channel fans out to every socket** — The existing `global` case uses `this.server.emit()`, which serializes and writes to every connected socket including players mid-combat. Fix: join all authenticated players to a `'chat:global'` Socket.IO room at auth time and use `server.to('chat:global').emit()`. This is an architectural choice, not a patch — do it before any channel goes live.

3. **No rate limiting on `chat:send`** — Movement has a 140ms throttle; chat has none. A script can flood the event loop. Fix: add burst-tolerant rate limiting (5 messages burst, then 1/second) to `ChatService` or via `WsThrottlerGuard`. Rate limiting is a security feature, not polish — it must be in the first handler implementation.

4. **Faction channel silently drops messages** — `ChatChannel` type includes `'faction'` but the gateway switch has no case for it. Messages are accepted, pass auth validation, and are silently discarded with no error. Fix: implement faction routing using Socket.IO rooms; add TypeScript exhaustiveness check to the switch so future channels cannot be silently omitted.

5. **Block enforced client-side only** — A player who knows they are blocked can connect a second browser tab and whisper freely. Fix: block must be server-enforced in `ChatService.routeWhisper()` via a DB lookup before delivering. Mute (broadcast filtering) is acceptable as client-side only; block is not.

**Additional pitfalls to watch:**
- `updatePlayerRooms()` on zone transition removes all rooms — faction room must be preserved or rejoined after zone change
- Whisper to offline player produces silent failure in existing code — return a system message to the sender
- Message length is not validated server-side — cap at 280 characters before processing or broadcasting; existing code reads `data.message` with no check
- `chat:message` missing from `socket.ts` `serverEvents` array — existing silent bug; first task of any implementation

**See:** `.planning/research/PITFALLS-CHAT-SYSTEM.md`

## Implications for Roadmap

The build order is driven by two constraints: (1) each layer depends on the one below it, and (2) several pitfalls are "fix before anything else or it propagates everywhere" problems. The suggested phase structure follows the architecture's recommended build order closely.

### Phase 1: Foundation and Type System

**Rationale:** Two known bugs and one type gap must be resolved before any channel implementation is testable. The `chat:message` socket dispatch bug means no chat messages reach the client at all. The missing `'local'` in `ChatChannel` means the type system and requirements are misaligned. Resolving these first ensures every subsequent phase can verify end-to-end behavior.

**Delivers:** Working end-to-end pipeline for existing zone and global channels; correct type system covering all five channels

**Addresses:** Zone and Global channels (already routed server-side, just need to reach the client)

**Avoids:** Building on a broken dispatch path; type misalignment forcing rework later

**Key tasks:**
- Add `'local'` to `ChatChannel` union in `packages/shared-types/src/network/events.ts`
- Add `'chat:message'` to `serverEvents` array in `apps/web/src/network/socket.ts`
- Verify zone chat works end-to-end before proceeding

### Phase 2: Database Schema and REST API

**Rationale:** Mute and block data must exist in the database before the server can enforce block on whispers. REST endpoints must exist before the client store can load moderation state on auth. Building this layer second ensures Phase 3 (ChatService) and Phase 4 (chatStore) can reference real persistence without shortcuts.

**Delivers:** `chat_mute_list` and `chat_block_list` tables; Drizzle migrations; REST endpoints for moderation CRUD in `apps/api`

**Addresses:** Mute persistence, block persistence, cross-session moderation state

**Avoids:** Block being implemented as client-side only (security pitfall) by making the DB layer available before the feature is built

**Key tasks:**
- Create `chat_mute_list` Drizzle schema + migration (`packages/database/src/schema/chat-mute-list.ts`)
- Create `chat_block_list` Drizzle schema + migration (`packages/database/src/schema/chat-block-list.ts`)
- Create query functions: `getMuteList`, `getBlockList`, `addMute`, `removeMute`, `addBlock`, `removeBlock`
- Add REST endpoints to `apps/api` CharactersController: `GET /characters/:id/chat/moderation`, `POST/DELETE /characters/:id/chat/mute`, `POST/DELETE /characters/:id/chat/block`
- Export new schemas from `packages/database/src/index.ts`

### Phase 3: ChatService — Server Routing and Rate Limiting

**Rationale:** All five channel routing cases, rate limiting, and block enforcement live here. This is the largest server-side change. It must be built before the client store (which listens for the routed messages) and before the UI (which triggers sends). Implementing all channels in one phase prevents the "looks done but silently broken" problem of partial implementations.

**Delivers:** `ChatService` with complete five-channel routing; faction Socket.IO room joins at auth; `chat:global` room join at auth; rate limiting; block enforcement on whispers; message length validation; TypeScript exhaustiveness check on channel switch

**Addresses:** All five channels; faction routing; local proximity; whisper target validation and offline feedback; rate limiting; block enforcement; faction room persistence across zone transitions

**Avoids:** Faction channel silent drop; global fan-out performance problem; no rate limiting; whisper silent failure; message length DoS; faction room lost on zone transition

**Key tasks:**
- Create `apps/game-server/src/game/chat.service.ts` with `routeMessage()`, `routeLocal()`, `routeWhisper()`, `isBlocked()`
- Add `client.join('chat:global')` and `client.join('faction:${player.faction}')` in `handleAuth()`
- Preserve faction and global rooms in `updatePlayerRooms()` on zone transition
- Refactor `GameGateway.handleChat()` to delegate to `ChatService`
- Add rate limiting (manual token bucket or `WsThrottlerGuard`) to `handleChat()`
- Add message length (280 char max) and channel membership validation
- Add exhaustiveness check (`default: const _exhaustive: never = data.channel`) to channel switch
- Register `ChatService` in `GameModule` providers

### Phase 4: chatStore — Client State and Socket Integration

**Rationale:** The client store is the bridge between the socket layer and the UI. Extracting chat state from `gameStore` and building `chatStore` with proper mute filtering, moderation loading, and whisper target tracking sets up the UI phase for clean consumption via Zustand selectors.

**Delivers:** `chatStore.ts` with full state (messages, activeChannel, mutedPlayerIds, blockedPlayerIds, whisperTarget); socket listener with client-side mute filtering; moderation data loaded on auth:success via REST API

**Addresses:** Mute display filtering; moderation persistence across sessions; whisper conversation state; chat/combat log separation

**Avoids:** Chat messages polluting the combat log; mute list resetting on page reload; whisper target as global state; `gameStore` growing further

**Key tasks:**
- Create `apps/web/src/store/chatStore.ts` following `combatLogStore` pattern
- Register `chat:message` socket listener with mute filtering as module side-effect
- Load moderation data via REST on `auth:success` event; call `chatStore.loadModeration()`
- Import in `GameUI.tsx` as side-effect to trigger registration
- Remove inline `chat:message` listener from `gameStore.ts`; migrate `chatMessages` + `addChatMessage` to `chatStore`

### Phase 5: ChatPanel UI — Tabs, Whisper, and Moderation Controls

**Rationale:** The UI phase is last because it depends on all prior layers. By this point, the server routes correctly, the store holds correct state, and the keyboard isolation pattern can be wired to a working Phaser scene. This is also where the Phaser WASD conflict must be resolved — it cannot be deferred further.

**Delivers:** Tabbed `ChatPanel.tsx` with Local/Zone/Faction/Global/Whisper tabs; whisper target name input; right-click moderation menu (Mute/Block/Whisper); keyboard isolation via Phaser disable/enable; per-channel message filtering; timestamp rendering; 200-message per-channel cap

**Addresses:** All table-stakes UI features; whisper UX; mute/block UI controls; message timestamps; channel navigation

**Avoids:** Phaser WASD capture; chat panel memory growth; auto-scroll disrupting history reading; ESC key conflicts with modal stack

**Key tasks:**
- Rewrite `ChatPanel.tsx` with channel tab row (Local / Zone / Faction / Global / Whisper)
- Add `onFocus`/`onBlur` handlers emitting `chat:input:focus`/`chat:input:blur` game events
- Subscribe `WorldScene` to disable/enable `this.input.keyboard!.enabled` on those events
- Implement whisper tab with target name input and conversation display
- Add right-click context menu on sender names (Mute, Block, Whisper)
- Render timestamps; use existing CSS channel color-coding (already defined for all channels)
- Implement auto-scroll only when already at bottom of message list

### Phase Ordering Rationale

- Foundation first because two existing bugs would corrupt all testing if left unaddressed
- Database before ChatService because server block enforcement needs the query layer to exist
- ChatService before chatStore because the store listens for messages the service routes
- chatStore before UI because the panel reads store state via Zustand selectors
- All five channels implemented in a single ChatService phase to prevent partial implementations with silent drops, which are harder to debug than no implementation
- Mute/block built in the DB phase so the server can enforce block from day one — not retrofitted after a client-only implementation ships

### Research Flags

Phases with standard patterns (skip `/gsd:research-phase` during planning):
- **Phase 1 (Foundation):** Trivial type union addition and array addition; well-understood codebase patterns; no research needed
- **Phase 2 (Database):** Follows established Drizzle schema pattern exactly; query functions follow `quest.ts` template; REST endpoint pattern matches existing CharactersController
- **Phase 4 (chatStore):** Follows `combatLogStore` pattern exactly; all decisions already made by existing store architecture

Phases that benefit from careful task breakdown during planning (not additional external research):
- **Phase 3 (ChatService):** Most server-side complexity; `updatePlayerRooms` interaction with faction rooms requires careful implementation; rate limiting approach (manual vs `WsThrottlerGuard`) should be confirmed before starting
- **Phase 5 (ChatPanel UI):** Phaser keyboard isolation integration requires care; whisper conversation UX has design decisions not fully specified in PROJECT.md; right-click context menu requires layout decisions

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Full codebase audit confirmed existing packages; `@nestjs/throttler` v6.4.0 verified compatible with NestJS 10; all other technologies already in use |
| Features | HIGH | Codebase deeply analyzed; existing stubs confirmed; MMO chat patterns verified against WoW, FFXIV, RuneScape, and multiple industry sources |
| Architecture | HIGH | Based on direct codebase analysis of gateway (lines 403–437, 1675–1705), shared-types, socket.ts, and all existing service patterns; no inference required |
| Pitfalls | HIGH | Phaser keyboard issue confirmed via community sources + codebase audit; socket dispatch bug confirmed by inspecting `serverEvents` array directly; all pitfalls are grounded in code-level analysis |

**Overall confidence:** HIGH

### Gaps to Address

- **Local channel range value:** Research uses 15 tiles (Manhattan/Euclidean) as a reasonable default based on MMO conventions (Life is Feudal uses ~25 tiles; 15 is conservative). Should be defined as a named constant `LOCAL_RADIUS = 15` in `ChatService` and easy to adjust. Confirm value is acceptable before Phase 3 implementation.

- **Whisper target input UX:** Research recommends a name-based input field in the Whisper tab, but `/whisper PlayerName message` command syntax is also common in MMOs. The specific UX (text field vs. slash command vs. click-to-whisper) is not specified in PROJECT.md — confirm before Phase 5 begins.

- **Mute persistence mechanism:** Research recommends REST API + DB (for cross-session persistence consistent with all other player data). An alternative is Zustand `persist` middleware with `localStorage`. The DB approach is more robust and consistent but adds REST endpoints. Confirm this decision before Phase 2 begins.

- **`updatePlayerRooms` faction room interaction:** Whether the existing `updatePlayerRooms` function on zone transition removes the faction room depends on its exact implementation. This is identified as a pitfall but the specific fix (add to required rooms set vs. rejoin after the call) needs to be confirmed when Phase 3 code is being written.

## Sources

### Primary (HIGH confidence)
- Into the Void codebase: `packages/shared-types/src/network/events.ts` — `ChatMessage`, `ChatChannel`, `ClientEvents`, `ServerEvents`
- Into the Void codebase: `apps/game-server/src/game/game.gateway.ts` (lines 403–437, 1675–1705) — existing `handleChat`, `updatePlayerRooms`
- Into the Void codebase: `apps/web/src/network/socket.ts` — confirmed `chat:message` absent from `serverEvents` array
- Into the Void codebase: `apps/web/src/ui/panels/ChatPanel.tsx` — current UI state (flat, zone-only, draggable)
- Into the Void codebase: `apps/web/src/store/gameStore.ts` + `combatLogStore.ts` — store patterns and socket side-effect registration
- Into the Void codebase: `packages/database/src/schema/characters.ts` — Drizzle schema patterns
- Into the Void codebase: `apps/game-server/src/game/game.module.ts` — NestJS module structure and DI patterns
- [Socket.IO Rooms — Official Documentation v4](https://socket.io/docs/v4/rooms/) — room broadcast API, automatic room leave on disconnect confirmed
- [NestJS Throttler GitHub](https://github.com/nestjs/throttler) — WebSocket support confirmed, v6.4.0 latest for NestJS 10

### Secondary (MEDIUM confidence)
- [NestJS WebSocket Rate Limiting — DEV Community](https://dev.to/delightfulengineering/nest-js-websockets-rate-limiting-and-acknowledgements-57oa) — `WsThrottlerGuard` pattern; consistent with official throttler docs
- [In-game chat: Eight key features — Ably](https://ably.com/blog/in-game-chat-features) — mute/block moderation patterns for games
- [Mastering Socket.IO Rooms — VideoSDK](https://www.videosdk.live/developer-hub/socketio/socketio-rooms) — room broadcast scoping, adapter behavior
- [Socket.IO Performance Tuning — Official v4](https://socket.io/docs/v4/performance-tuning/) — `server.emit()` cost vs room broadcast cost
- [Life is Feudal Chat — Fandom Wiki](https://lifeisfeudal.fandom.com/wiki/Chat) — local chat range reference (~25 tiles)
- [Phaser Discourse: Keyboard event target](https://phaser.discourse.group/t/change-keyboard-event-target/12144) — keyboard target scoping to canvas vs window
- [HTML5 Game Devs: Phaser stealing keypress focus](https://www.html5gamedevs.com/topic/11715-help-with-phaser-stealing-keypress-focus/) — WASD captured by Phaser when input fields are focused

### Tertiary (LOW confidence)
- [AVATARIC Blog — Multilayered Communications in MMORPG](https://avataric.blog/2016/01/multilayered-communications-in-an-mmorpg/) — site unreachable at research time; referenced for channel pattern awareness only

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
