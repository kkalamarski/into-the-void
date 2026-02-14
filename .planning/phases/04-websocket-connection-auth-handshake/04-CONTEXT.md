# Phase 4: WebSocket Connection & Auth Handshake - Context

**Gathered:** 2026-02-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Secure WebSocket connection with authenticated character in game world. Player connects after character selection, receives initial game state, and can send/receive real-time updates. Connection state is visible and handles reconnection gracefully.

</domain>

<decisions>
## Implementation Decisions

### Connection Status UI
- Corner indicator (small icon/dot), always visible
- Green when connected, yellow/red for issues — player always knows state
- Show latency/ping indicator alongside connection status (ms or colored bars)

### Reconnection Behavior
- Claude's discretion: blocking vs non-blocking during reconnect (pick best approach for this game type)

### Initial State Delivery
- Loading screen with progress bar + rotating gameplay tips/lore snippets
- World appears fully loaded after loading completes (not progressive)
- Everything at once: terrain, entities, other players all arrive together before showing world
- Player appears at exact last position regardless of safety

### Error Handling & Feedback
- Auth failure (invalid/expired token): redirect immediately to login screen with error message
- Server unavailable: modal overlay over current screen with retry option
- Error messages: player-friendly with error code for support reference (e.g., "Connection lost (E-1042)")
- Invalid character (deleted/locked): redirect to character selection screen with explanation

### Claude's Discretion
- Reconnection UI approach (modal overlay vs non-blocking indicator)
- Exact reconnection timing and retry strategy
- Loading screen layout and tip rotation logic
- Error code numbering scheme

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-websocket-connection-auth-handshake*
*Context gathered: 2026-02-14*
