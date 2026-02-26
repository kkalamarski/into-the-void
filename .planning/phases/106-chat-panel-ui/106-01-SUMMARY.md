---
phase: 106-chat-panel-ui
plan: "01"
subsystem: ui
tags: [zustand, chat, socket.io, react, typescript]

# Dependency graph
requires:
  - phase: 105-chatservice-channel-routing
    provides: ChatService with five-channel routing and socket.io rooms
  - phase: 103-chat-foundation
    provides: chat:message socket event, module-level store registration pattern

provides:
  - Dedicated chatStore Zustand store with per-channel message arrays
  - activeChannel state (local/zone/faction/global/whisper)
  - unreadCounts per channel incremented on non-active incoming messages
  - switchChannel action clears unread for target channel
  - System messages distributed to all channel tabs
  - sendMessage emits chat:send with active channel and optional whisper targetId
  - formatChatTimestamp helper for UI display
  - gameStore cleaned of chatMessages, addChatMessage, clearChat

affects: [106-02, chat UI components, ChatPanel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module-level socket registration in store files (established 103, continued here)
    - Per-channel message buffer with 100-message cap per tab

key-files:
  created:
    - apps/web/src/store/chatStore.ts
  modified:
    - apps/web/src/store/gameStore.ts

key-decisions:
  - "System messages (channel: 'system') distributed to all five channel tabs simultaneously"
  - "activeChannel defaults to 'zone' — most active channel for new players"
  - "chat:message socket listener moved from gameStore to chatStore module level"

patterns-established:
  - "ChatTab type = (typeof CHAT_CHANNELS)[number] — inferred from const array"
  - "CHANNEL_CONFIG provides label/color metadata for UI tab rendering"

requirements-completed: [UI-01, UI-02, UI-03, UI-04, UI-05]

# Metrics
duration: 8min
completed: 2026-02-26
---

# Phase 106 Plan 01: Chat Store Foundation Summary

**Dedicated chatStore Zustand store with per-channel message arrays, unread tracking, and socket rewiring away from gameStore**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-26T20:50:00Z
- **Completed:** 2026-02-26T20:58:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `chatStore.ts` with per-channel message arrays (local/zone/faction/global/whisper), unread counts, and module-level socket wiring
- System messages (channel: 'system') distributed to all five channel tabs so they appear everywhere
- Removed chat state (chatMessages, addChatMessage, clearChat) from gameStore and rewired four system message call sites to chatStore

## Task Commits

Each task was committed atomically:

1. **Task 1: Create chatStore with per-channel messages, unread tracking, and socket wiring** - `7e83d81` (feat)
2. **Task 2: Remove chat state from gameStore and rewire system message callers** - `8c6b440` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `apps/web/src/store/chatStore.ts` - New dedicated chat store with useChatStore, CHAT_CHANNELS, CHANNEL_CONFIG, formatChatTimestamp exports and module-level socket listener
- `apps/web/src/store/gameStore.ts` - Chat state removed; four addChatMessage call sites rewired to useChatStore.getState().addMessage()

## Decisions Made
- System messages distributed to all channel tabs (not just a virtual 'system' tab) so players always see system events regardless of active channel
- activeChannel defaults to 'zone' — most relevant for newly spawned players
- Module-level chat:message registration follows existing pattern from combatLogStore (Phase 103 decision)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- chatStore is ready for Plan 02 to build the tabbed ChatPanel UI component on top of
- CHANNEL_CONFIG provides all label/color metadata needed for tab rendering
- formatChatTimestamp helper ready for message display (UI-05)
- showChat/toggleChat preserved in gameStore for UI visibility control

## Self-Check: PASSED

- apps/web/src/store/chatStore.ts: FOUND
- apps/web/src/store/gameStore.ts: FOUND
- Commit 7e83d81: FOUND
- Commit 8c6b440: FOUND

---
*Phase: 106-chat-panel-ui*
*Completed: 2026-02-26*
