# Feature Research: In-Game Chat System

**Domain:** MMO in-game chat — multi-channel text communication with moderation
**Researched:** 2026-02-26
**Confidence:** HIGH (design patterns verified against established MMOs, Socket.IO room patterns from official docs, codebase deeply analysed)

---

## Codebase State at Research Time

The codebase already has partial chat scaffolding. Understanding this prevents re-inventing what exists:

**Already exists (partial):**
- `ChatMessage` and `ChatChannel` types in `shared-types` — channels: `'zone' | 'faction' | 'whisper' | 'global' | 'system'`
- `chat:send` client event + `chat:message` server event — both typed in `ClientEvents`/`ServerEvents`
- `handleChat` in `game.gateway.ts` — handles `zone`, `global`, and `whisper` routing (no `faction` or `local`)
- `ChatPanel.tsx` — basic draggable panel, zone-only send, renders all messages flat, no tabs
- `chatMessages: ChatMessage[]` + `addChatMessage` in `gameStore.ts` — keeps last 100 messages
- `system` channel used internally (death, respawn, level-up, errors inject system messages)
- Zone rooms already exist: `server.to(player.position.zoneId)` — the infrastructure is there

**Not yet exists:**
- Local (proximity) channel — not in `ChatChannel` type, no server routing
- Faction channel routing (type exists, gateway has no case for it)
- Mute/block system — no type, no store, no DB table, no server enforcement
- Tabbed channel UI — panel is flat single-channel
- Whisper target selection UI — client has no way to specify targetId in current ChatPanel
- Per-channel unread badges / notifications
- Message timestamps displayed

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features players expect in any MMO chat. Missing these makes the product feel incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Zone-wide channel | Any MMO has a zone channel; players coordinate hunts and trading here | LOW | Already 80% done in gateway + type system. ChatPanel only needs tab UI wired |
| Global channel | Server-wide channel for announcements, LFG, trade; all live MMOs have it | LOW | Already working in gateway (`server.emit`). Just needs tab in UI |
| Faction channel | Factions are core to Into the Void identity; players expect private faction comms | MEDIUM | Type exists, gateway has no `case 'faction'`. Needs Socket.IO room per faction (e.g. `faction:verdant`), joined on auth |
| Local (proximity) channel | In sci-fi/survival MMOs players expect nearby-only chat for immersive RP/coordination | MEDIUM | Not in `ChatChannel` type yet. Server needs distance check (Manhattan distance <= 15 tiles is reasonable) against all players in same zone |
| Whisper / private message | Direct 1-on-1 messages are a baseline expectation in any social game | MEDIUM | Server routing exists. Client needs: target selection (player name input or click), and conversation-style display (show both sides) |
| Tabbed channel UI | WoW, FFXIV, RuneScape — all use tabs. Flat list is confusing with multiple channels | MEDIUM | Current `ChatPanel.tsx` is flat. Needs channel tabs (Local / Zone / Faction / Global / Whisper). Active tab filters messages |
| Message persistence across reconnect (in-memory only) | Players expect to see recent history when they reconnect within a session | LOW | `gameStore` keeps last 100 per session already. No DB persistence needed (ephemeral per PROJECT.md) |
| Sender name + timestamp | Every chat UI shows who said what and when | LOW | `senderName` already in `ChatMessage`. Timestamp exists but not rendered in `ChatPanel.tsx` |
| Faction-gated channel enforcement (server-side) | Players must not be able to send/receive rival faction chat | LOW | Server reads `player.faction` from authenticated session — already known at gateway level |
| Player mute (hide messages locally) | Standard player safety. Any multiplayer game missing this gets complaints | MEDIUM | Client-side is sufficient for MVP (filter messages before render). Persist list per character in DB for cross-session carry |
| Player block (prevent whispers) | Prevents harassment. Table stakes for any social game | MEDIUM | Server-side enforcement needed (gateway checks block list before routing whisper) |

### Differentiators (Competitive Advantage)

Features that improve the experience beyond baseline. Not required for launch, but notable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Unread badge per channel tab | Players know which channel has new messages without switching; reduces missed faction comms | LOW | Track `unreadCounts: Record<ChatChannel, number>` in a `chatStore`. Reset on tab activation |
| System messages integrated into chat | Death, respawn, level-up, errors already appear in system channel. Keeping them discoverable | LOW | Already implemented in `gameStore.ts`. Just needs System tab or folded into Global tab display |
| Faction color-coded names | Verdant/Helix/Nexus/Neutral each have distinct colors (matches existing faction color conventions) | LOW | Each `ChatMessage` carries `senderId` — faction lookup from player list or add `senderFaction` to `ChatMessage` |
| Whisper reply shortcut | Pressing R (or /r) after receiving a whisper auto-targets sender for reply | MEDIUM | Common UX in WoW-style chat. Track `lastWhisperSender` in store, bind R key when chat input is focused |
| Channel-specific message cap | Zone messages scroll fast during busy events; capping per-channel prevents buffer bloat | LOW | Currently all 100 messages share one array. Per-channel arrays (e.g. 50 per channel) gives cleaner UX |
| Click-to-whisper from player name | Click a sender's name in any channel to open a whisper to them | LOW | Wrap `chat-sender` span in a button that opens whisper tab and sets target |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good on the surface but create disproportionate cost or risk.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Chat history persistence in database | "I want to see what was said while I was offline" | DB writes on every chat message would be constant; history queries expensive; privacy implications for whispers; PROJECT.md explicitly marked out-of-scope | Keep ephemeral (last 100 in memory). Acceptable for a survival MMO where chat is transient |
| Speech bubbles above character sprites | Immersive, used in FFXIV and other MMOs | Adds Phaser rendering complexity; occludes gameplay; PROJECT.md explicitly marked out-of-scope for v1.22; panel-based chat is sufficient | Panel chat with channel tabs handles comms. Speech bubbles are a visual polish milestone |
| Profanity filter / auto-moderation | Safer community | Requires curated word list or external API call on every message; false positives damage UX; not a validated user need for current scale | Player mute/block tools are sufficient self-moderation at current scale |
| Group / party channel | "My group needs a private space" | Groups/parties are not yet a system in Into the Void. Building group chat requires building groups first | Whisper covers small group needs. Party system is a future milestone; group chat follows naturally |
| Chat bubbles with volume ranges (whisper/shout) | Realistic proximity ranges | Three distinct local range tiers adds state complexity for minimal benefit at current player density | Single local range (15-tile radius) is sufficient. "Local" vs "Zone" covers the use case |
| Cross-server global chat | "I want to play with friends on other servers" | Not applicable — single-server architecture currently. Would require Redis pub/sub across server instances | N/A at current scale |
| Read receipts on whispers | Confirmation sender was seen | Privacy concern; adds round-trip events; not expected in MMO chat genre | Delivery confirmation (message appears on both sides) is sufficient |

---

## Feature Dependencies

```
[Faction Channel]
    └──requires──> [Socket.IO faction rooms joined on auth]
                       └──requires──> [Player faction known at auth time] (already true — player.faction available in PlayerService)

[Whisper UI]
    └──requires──> [Online player lookup] (need list of online players for target selection)
                       └──requires──> [PlayerService.getOnlinePlayers() method]

[Player Block (server-side)]
    └──requires──> [Block list storage] (DB table: character_blocks with blocker_id, blocked_id)
                       └──requires──> [Drizzle schema addition]
    └──requires──> [Block list loaded at auth time] (checked in gateway before whisper routing)

[Player Mute (client-side)]
    └──requires──> [Mute list storage] (DB table: character_mutes with muter_id, muted_id, OR stored as JSONB on character row)
    └──requires──> [Mute list loaded at connect time] (carried in session store or sent as server event)

[Unread Channel Badges]
    └──requires──> [Per-channel message tracking] (chatStore split by channel)
    └──requires──> [Tabbed UI] (no point in badges without tabs)

[Tabbed Channel UI]
    └──requires──> [Local channel type added to ChatChannel] (type system change)
    └──enhances──> [All channels] (provides navigation between zone/faction/global/whisper/local)

[Whisper Reply Shortcut]
    └──requires──> [Whisper UI working]
    └──requires──> [lastWhisperSender tracked in chatStore]

[Faction Color-Coded Names]
    └──requires──> [senderFaction field on ChatMessage OR online player lookup]
```

### Dependency Notes

- **Faction channel requires Socket.IO rooms:** The server must join each socket to a room named `faction:{factionId}` (e.g. `faction:verdant`) at auth time. This room persists for the session. Broadcasting to `faction:{player.faction}` routes correctly. This is a 5-line change in `PlayerService.authenticate()`.
- **Local channel requires no new rooms:** Local is computed per-message. Server iterates players in the same zone and filters by Manhattan distance. No persistent Socket.IO room needed.
- **Block requires server-side enforcement:** Unlike mute (client filters render), block must be enforced at the gateway level for whispers, or a blocked player can still reach the recipient via whisper.
- **Mute is client-side only:** Muted player messages still arrive at the client; the client filters them before rendering. This is simpler to implement and sufficient for most cases.
- **Whisper target selection conflicts with current ChatPanel:** The current panel has no concept of "who to whisper." Either a `/whisper PlayerName message` command pattern or a player-name input field in the Whisper tab is needed.

---

## MVP Definition

### Launch With (v1 — v1.22)

The stated milestone goal: chat panel with 5 channels + mute/block.

- [x] **Tabbed chat panel (Local / Zone / Faction / Global / Whisper)** — primary UX structure; everything else hangs off this
- [x] **Local channel (proximity, ~15-tile radius)** — adds immersive nearby chat; requires server-side distance check
- [x] **Zone channel** — already routing server-side; needs tab wired in UI
- [x] **Faction channel** — needs Socket.IO faction room join at auth; needs gateway case; enforced by server
- [x] **Global channel** — already routing server-side; needs tab wired in UI
- [x] **Whisper channel** — server routing exists; needs whisper target input in UI (name-based)
- [x] **Message timestamps displayed** — already in the data, just not rendered
- [x] **Player mute (client-side, session-persistent via DB)** — hides muted player messages; persists across sessions
- [x] **Player block (server-side for whispers, DB-persisted)** — prevents whispers from blocked players reaching recipient

### Add After Validation (v1.x)

- [ ] **Unread channel badge counts** — add once tabs are confirmed working; low effort, high UX value
- [ ] **Faction color-coded sender names** — requires adding `senderFaction` to `ChatMessage` type; visual polish
- [ ] **Click sender name to whisper** — QoL after whisper tab is confirmed stable
- [ ] **Whisper reply shortcut (R key)** — add after whisper UX is validated

### Future Consideration (v2+)

- [ ] **Group / party channel** — requires party system which is a future milestone
- [ ] **Speech bubbles** — visual polish phase, explicitly out-of-scope for v1.22
- [ ] **Profanity filter** — only if moderation becomes a validated problem at scale

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Tabbed panel UI | HIGH | MEDIUM | P1 |
| Zone channel (tab-wired) | HIGH | LOW | P1 |
| Global channel (tab-wired) | HIGH | LOW | P1 |
| Faction channel (server + UI) | HIGH | MEDIUM | P1 |
| Local channel (server distance check) | MEDIUM | MEDIUM | P1 |
| Whisper (target UI + server) | HIGH | MEDIUM | P1 |
| Message timestamps rendered | MEDIUM | LOW | P1 |
| Player mute | HIGH | MEDIUM | P1 |
| Player block | HIGH | MEDIUM | P1 |
| Unread badges per tab | MEDIUM | LOW | P2 |
| Faction color-coded names | LOW | LOW | P2 |
| Click-to-whisper from name | MEDIUM | LOW | P2 |
| Whisper reply shortcut | MEDIUM | LOW | P2 |
| Speech bubbles | LOW | HIGH | P3 |
| Profanity filter | LOW | HIGH | P3 |
| Party/group channel | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (v1.22 milestone)
- P2: Should have, add when P1 is stable
- P3: Nice to have, future milestone

---

## Competitor Feature Analysis

| Feature | WoW / FFXIV | RuneScape | Into the Void approach |
|---------|-------------|-----------|----------------------|
| Channel tabs | Yes — customisable tab system | Yes — fixed channel tabs | Fixed tabs matching the 5 channel types; no tab customisation for v1 |
| Local proximity chat | Yes (Say channel, ~25 yd radius) | Yes (default chat range) | ~15-tile radius; determined server-side per message send |
| Faction/Alliance channel | Yes (faction-gated) | Yes (clan/group chat) | Faction channel gated by `player.faction`; 4 factions map cleanly to 4 Socket.IO rooms |
| Whisper | Yes (click name or /w name) | Yes (/pm name) | Name-based input or /w command in Whisper tab |
| Mute / Ignore | Yes — server-enforced ignore list | Yes — ignore list | Client-side mute (filter render); server-side block (prevent whispers) |
| System messages | Yes — in dedicated tab or blended | Yes — blended | Blended into channel tabs (system messages shown in active channel, or always in Global) |
| Message history | Yes — scrollable buffer | Yes — scrollable buffer | Last 100 total in-session; ephemeral (no DB per design decision) |

---

## Implementation Notes by Feature

### Local Channel
- Server iterates `playerService.getPlayersInZone(zoneId)` and filters by `Math.abs(sender.x - p.x) + Math.abs(sender.y - p.y) <= 15`
- Emits directly to each qualifying socket ID (`server.to(socketId).emit(...)`)
- No Socket.IO room needed — computed per message
- `'local'` must be added to `ChatChannel` type in shared-types

### Faction Channel
- On auth: `client.join(`faction:${player.faction}`)` in `PlayerService.authenticate()`
- Gateway case: `this.server.to(`faction:${player.faction}`).emit('chat:message', message)`
- Server verifies sender's faction matches requested channel before routing (prevents cross-faction spoofing)

### Mute System
- New DB table: `character_mutes (muter_id UUID, muted_id UUID, muted_name VARCHAR, created_at TIMESTAMP)`
- Loaded on session start, sent to client as part of auth response or initial state
- Client stores as `Set<string>` (muted player IDs) in `chatStore`
- Messages from muted players are filtered before rendering (never shown in any channel)
- Muting via right-click on player name or `/mute PlayerName` command

### Block System
- New DB table: `character_blocks (blocker_id UUID, blocked_id UUID, blocked_name VARCHAR, created_at TIMESTAMP)`
- Loaded into `PlayerService` in-memory on player connect
- Gateway checks block list before routing whisper: if `sender.id in target.blockList`, drop the message silently
- Block adds to mute as well (blocked player messages not shown)

### ChatPanel Redesign
- Current panel is draggable with close button — keep draggable pattern
- Add tabs row: `[Local] [Zone] [Faction] [Global] [Whisper]`
- `activeChannel` state in component
- Message list filtered by `activeChannel` (or show "all" in a special All tab — deferred to v1.x)
- Whisper tab shows conversation view (messages to/from specific player; needs target input)
- Input area dynamically changes placeholder text per active channel

---

## Dependencies on Existing Systems

| Existing System | How Chat Depends On It |
|-----------------|----------------------|
| Socket.IO `server.to(zoneId)` rooms | Zone channel already uses this; local and zone routing depend on zone membership |
| `PlayerService.getPlayerBySocket()` | Auth lookup for all channel routing |
| `PlayerService.getSocketByPlayerId()` | Whisper routing to target |
| `player.faction` in `ConnectedPlayer` | Faction channel room join + enforcement |
| `player.position` (x, y, zoneId) | Local channel distance calculation |
| `gameStore.addChatMessage()` | All incoming `chat:message` events feed this |
| `modalStackStore` | Chat panel ESC behaviour — existing pattern |
| `useDraggablePanel` hook | ChatPanel already uses; keep for redesigned panel |
| Drizzle ORM + PostgreSQL schema | Mute/block DB tables follow existing Drizzle patterns |

---

## Sources

- [Socket.IO Rooms — Official Documentation](https://socket.io/docs/v4/rooms/) — HIGH confidence
- [In-Game Chat: Eight Key Features — Ably](https://ably.com/blog/in-game-chat-features) — MEDIUM confidence
- [Life is Feudal Chat — Fandom Wiki](https://lifeisfeudal.fandom.com/wiki/Chat) (local range reference: ~25 tiles) — MEDIUM confidence
- [Multilayered Communications in an MMORPG — AVATARIC Blog](https://avataric.blog/2016/01/multilayered-communications-in-an-mmorpg/) — site unreachable at research time; referenced for pattern awareness only — LOW confidence
- Into the Void codebase analysis — `packages/shared-types/src/network/events.ts`, `apps/game-server/src/game/game.gateway.ts`, `apps/web/src/ui/panels/ChatPanel.tsx`, `apps/web/src/store/gameStore.ts` — HIGH confidence

---

*Feature research for: In-game chat system (v1.22 milestone)*
*Researched: 2026-02-26*
