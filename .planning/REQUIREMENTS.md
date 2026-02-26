# Requirements: Into the Void

**Defined:** 2026-02-26
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.22 Requirements

Requirements for In-Game Chat milestone. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Chat messages are delivered from server to client (fix socket dispatch bug)
- [x] **INFRA-02**: Chat input does not trigger Phaser keyboard movement while typing
- [x] **INFRA-03**: Chat messages are rate-limited to prevent spam
- [x] **INFRA-04**: Chat messages are validated server-side (non-empty, max length)

### Channels

- [ ] **CHAN-01**: User can send and receive messages in zone-wide chat
- [ ] **CHAN-02**: User can send and receive messages in global (server-wide) chat
- [ ] **CHAN-03**: User can send and receive messages in faction-only chat
- [ ] **CHAN-04**: User can send and receive messages in local (proximity) chat to nearby players
- [ ] **CHAN-05**: User can send and receive private whisper messages to/from a specific player

### Chat UI

- [ ] **UI-01**: Chat panel is visible in bottom-left of game HUD
- [ ] **UI-02**: User can switch between channel tabs (Local, Zone, Faction, Global, Whispers)
- [ ] **UI-03**: User can type and send messages via text input with Enter key
- [ ] **UI-04**: Unread message indicators shown on inactive channel tabs
- [ ] **UI-05**: Messages display sender name, timestamp, and channel-colored text

### Moderation

- [ ] **MOD-01**: User can mute a player to hide their messages in chat
- [ ] **MOD-02**: User can block a player to prevent receiving whispers from them
- [ ] **MOD-03**: User can unmute/unblock previously muted/blocked players
- [ ] **MOD-04**: Mute and block lists persist across sessions (DB-backed)
- [ ] **MOD-05**: Right-click on a player name in chat shows mute/block context menu

## Future Requirements

### Party System
- **PARTY-01**: User can invite another player to a party
- **PARTY-02**: Party members see each other on minimap
- **PARTY-03**: Party chat channel for group communication
- **PARTY-04**: Shared XP for party members in proximity

### Chat Enhancements
- **CHATENH-01**: Speech bubbles above characters for local chat
- **CHATENH-02**: Chat message history persistence (DB-backed)
- **CHATENH-03**: Slash commands (/whisper, /zone, etc.)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Speech bubbles above characters | Panel-only for this milestone; defer to future |
| Chat message persistence (DB) | Ephemeral messages — clean slate each login |
| Profanity filter | Moderation via mute/block sufficient for now |
| Group/party chat channel | No party system yet; separate milestone |
| Slash commands | Tab switching sufficient for channel selection |
| Emotes/stickers | Text-only for v1 chat |
| Chat message editing/deletion | Ephemeral messages; not needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 103 | Complete |
| INFRA-02 | Phase 103 | Complete |
| INFRA-03 | Phase 103 | Complete |
| INFRA-04 | Phase 103 | Complete |
| CHAN-01 | Phase 105 | Pending |
| CHAN-02 | Phase 105 | Pending |
| CHAN-03 | Phase 105 | Pending |
| CHAN-04 | Phase 105 | Pending |
| CHAN-05 | Phase 105 | Pending |
| UI-01 | Phase 106 | Pending |
| UI-02 | Phase 106 | Pending |
| UI-03 | Phase 106 | Pending |
| UI-04 | Phase 106 | Pending |
| UI-05 | Phase 106 | Pending |
| MOD-01 | Phase 107 | Pending |
| MOD-02 | Phase 107 | Pending |
| MOD-03 | Phase 107 | Pending |
| MOD-04 | Phase 104 | Pending |
| MOD-05 | Phase 107 | Pending |

**Coverage:**
- v1.22 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation (all 19 requirements mapped)*
