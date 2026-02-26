# Roadmap: Into the Void

## Milestones

- ✅ **v1.0 Auth & Character Screens** - Phases 1-3 (shipped 2026-02-14)
- ✅ **v1.1 Post-Login Game Experience** - Phases 4-7 (shipped 2026-02-16)
- ✅ **v1.2 Isometric View** - Phases 8-12 (shipped 2026-02-16)
- ✅ **v1.3 Elevation & Structures** - Phases 13-16 (shipped 2026-02-16)
- ✅ **v1.4 Infinite World & Seamless Chunks** - Phases 17-20 (shipped 2026-02-17)
- ✅ **v1.5 Movement Overhaul** - Phases 21-24 (shipped 2026-02-17)
- ✅ **v1.6 Inventory & Items** - Phases 25-29 (shipped 2026-02-18)
- ✅ **v1.7 Character Stats** - Phases 30-32 (shipped 2026-02-18)
- ✅ **v1.8 Entity System** - Phases 33-38 (shipped 2026-02-19)
- ✅ **v1.9 Combat System** - Phases 39-42 (shipped 2026-02-19)
- ✅ **v1.10 Combat UX** - Phases 43-45 (shipped 2026-02-19)
- ✅ **v1.11 NPCs & Trading** - Phases 46-50 (shipped 2026-02-20)
- ✅ **v1.12 Bug Fixes & Content Polish** - Phases 51-55 (shipped 2026-02-20)
- ✅ **v1.13 Active Combat Abilities** - Phases 56-58 (shipped 2026-02-21)
- ✅ **v1.14 Equipment Stats Overhaul** - Phases 59-63 (shipped 2026-02-21)
- ✅ **v1.15 Quest System** - Phases 64-69 (shipped 2026-02-22)
- ✅ **v1.16 UI Polish** - Phases 70-75 (shipped 2026-02-23)
- ✅ **v1.17 Core Gameplay Loop** - Phases 76-81 (shipped 2026-02-23)
- ✅ **v1.18 Content Expansion** - Phases 82-88 (shipped 2026-02-24)
- ✅ **v1.19 Deployment & CI/CD** - Phases 89-93 (shipped 2026-02-24)
- ✅ **v1.20 World Scale & Action Bar** - Phases 94-98 (shipped 2026-02-26)
- ✅ **v1.21 UI Polish & Audio** - Phases 99-102 (shipped 2026-02-26)
- 🚧 **v1.22 In-Game Chat** - Phases 103-107 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.21 (Phases 1-102) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

### 🚧 v1.22 In-Game Chat (In Progress)

**Milestone Goal:** Add a full in-game chat system with five channel types (Local, Zone, Faction, Global, Whisper), ephemeral message delivery, and DB-persisted player mute/block moderation.

- [x] **Phase 103: Chat Foundation** - Fix the socket dispatch bug, add keyboard isolation, and harden server validation so the full pipeline is testable end-to-end (completed 2026-02-26)
- [x] **Phase 104: Moderation Persistence** - Add mute/block DB tables, query functions, and REST endpoints so cross-session moderation state exists before the server needs to enforce it (completed 2026-02-26)
- [x] **Phase 105: ChatService & Channel Routing** - Implement the server-side ChatService with all five channel routing cases, rate limiting, block enforcement, and faction room management (completed 2026-02-26)
- [x] **Phase 106: Chat Panel UI** - Rewrite ChatPanel with tabbed channels, whisper target input, timestamp rendering, and unread indicators wired to the new chatStore (completed 2026-02-26)
- [x] **Phase 107: Moderation Controls** - Add mute/unmute and block/unblock actions with right-click context menu on sender names, completing the full moderation loop (completed 2026-02-26)

## Phase Details

### Phase 103: Chat Foundation
**Goal**: The end-to-end chat pipeline is unbroken — messages dispatched by the server actually arrive at clients, the shared type system covers all five channels, typing in chat does not move the player, and every incoming message is validated server-side before routing
**Depends on**: Phase 102 (ESC Centralization)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. A message sent on zone chat from one client is visibly received by another client in the same zone (the socket dispatch bug is fixed)
  2. A player typing WASD letters into the chat input does not move their character
  3. A message exceeding 280 characters or an empty message is rejected by the server with no delivery to any client
  4. Sending more than 5 messages in rapid succession results in subsequent messages being silently dropped by the rate limiter
**Plans**: 2 plans
  - [ ] 103-01-PLAN.md -- Client-side chat delivery fix and keyboard isolation (INFRA-01, INFRA-02)
  - [ ] 103-02-PLAN.md -- Server-side message validation and rate limiting (INFRA-03, INFRA-04)

### Phase 104: Moderation Persistence
**Goal**: The database has mute and block tables and the REST API exposes CRUD endpoints for them, so moderation state can be loaded on login and enforced server-side before any moderation UI is built
**Depends on**: Phase 103
**Requirements**: MOD-04
**Success Criteria** (what must be TRUE):
  1. A mute entry created via the REST API is present in the database and returned by the GET moderation endpoint on a subsequent request
  2. A block entry survives a full browser refresh and is returned correctly when the client loads moderation state after re-authentication
  3. Deleting a mute or block entry via the REST API removes it from the DB and subsequent GET responses no longer include it
**Plans**: 2 plans
  - [ ] 104-01-PLAN.md -- DB schema tables (player_mutes, player_blocks) + query functions (MOD-04)
  - [ ] 104-02-PLAN.md -- NestJS REST moderation module with CRUD endpoints (MOD-04)

### Phase 105: ChatService & Channel Routing
**Goal**: All five chat channels route correctly from a single server-side ChatService — zone and global via Socket.IO rooms, faction via faction rooms joined at auth (and preserved across zone transitions), local via proximity distance check, and whispers via target lookup with server-enforced block
**Depends on**: Phase 104
**Requirements**: CHAN-01, CHAN-02, CHAN-03, CHAN-04, CHAN-05
**Success Criteria** (what must be TRUE):
  1. A zone chat message is received only by players in the same zone, not by players in other zones
  2. A global chat message is received by all authenticated players on the server
  3. A faction chat message is received only by players of the same faction, including after one of them transitions to a different zone
  4. A local chat message is received only by players within ~15 tiles of the sender, not by players outside that radius
  5. A whisper sent to Player B is received only by Player B; if Player B has blocked the sender, the whisper is silently refused and the sender receives a system notice
**Plans**: TBD

### Phase 106: Chat Panel UI
**Goal**: Players have a always-visible tabbed chat panel in the bottom-left of the HUD with per-channel message views, a text input that sends on Enter, unread indicators on inactive tabs, and formatted messages showing sender, timestamp, and channel color
**Depends on**: Phase 105
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. The chat panel is visible in the bottom-left of the game HUD at all times without overlapping the minimap or action bars
  2. Clicking a channel tab switches the visible message list to that channel and clears its unread badge
  3. Typing a message and pressing Enter sends it on the active channel and clears the input field
  4. An unread message indicator (badge or dot) appears on inactive channel tabs when a new message arrives on that channel
  5. Each message displays the sender's name, a timestamp, and text rendered in the color associated with that channel
**Plans**: TBD

### Phase 107: Moderation Controls
**Goal**: Players can mute any sender to hide their messages and block any sender to prevent whispers, with right-click access from the chat panel, unmute/unblock capability, and state persisted across sessions via the REST API
**Depends on**: Phase 106
**Requirements**: MOD-01, MOD-02, MOD-03, MOD-05
**Success Criteria** (what must be TRUE):
  1. After muting a player, their messages no longer appear in the chat panel on any channel tab for the remainder of the session and after a browser refresh
  2. After blocking a player, whispers from that player are refused server-side and do not appear in the blocked player's Whisper tab
  3. Right-clicking a sender name in the chat panel shows a context menu with Mute, Block, and Whisper options
  4. A previously muted player can be unmuted and their messages become visible again immediately
  5. A previously blocked player can be unblocked and whispers from them are delivered again
**Plans**: 2 plans
  - [ ] 107-01-PLAN.md -- moderationStore with mute/block sets, REST API integration, and chatStore mute filter (MOD-01, MOD-02, MOD-03)
  - [ ] 107-02-PLAN.md -- Right-click context menu on ChatPanel sender names with Mute/Block/Whisper actions (MOD-05)

## Progress

**Execution Order:** 103 → 104 → 105 → 106 → 107

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 103. Chat Foundation | 2/2 | Complete    | 2026-02-26 |
| 104. Moderation Persistence | 0/TBD | Complete    | 2026-02-26 |
| 105. ChatService & Channel Routing | 2/2 | Complete    | 2026-02-26 |
| 106. Chat Panel UI | 2/2 | Complete    | 2026-02-26 |
| 107. Moderation Controls | 2/2 | Complete   | 2026-02-26 |

---

*Last updated: 2026-02-26 - v1.22 roadmap created (5 phases, 103-107)*
