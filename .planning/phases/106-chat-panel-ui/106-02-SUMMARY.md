---
phase: 106-chat-panel-ui
plan: 02
subsystem: ui
tags: [react, zustand, chatStore, chat-panel, hud, css]

# Dependency graph
requires:
  - phase: 106-01
    provides: chatStore with per-channel messages, unreadCounts, switchChannel, sendMessage, formatChatTimestamp
  - phase: 105-chatservice-channel-routing
    provides: server-side chat:message socket events for all five channels

provides:
  - Tabbed ChatPanel with five channels (Local, Zone, Faction, Global, Whisper)
  - Per-channel unread badges (red indicator when unreadCounts > 0)
  - Messages with HH:MM timestamps and channel-colored sender names
  - Whisper tab "To:" target input field
  - Always-visible bottom-left panel (no toggle required)
  - showChat/toggleChat fully removed from gameStore
  - Chat shortcut button removed from GameShortcuts

affects:
  - GameUI
  - gameStore
  - GameShortcuts
  - ChatPanel

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ChatPanel always visible — no toggle state in gameStore"
    - "useChatStore for per-channel state; useGameStore only for keyboard isolation via game scene"
    - "Side-effect import pattern: chatStore imported in GameUI to register chat:message socket handler"

key-files:
  created: []
  modified:
    - apps/web/src/ui/panels/ChatPanel.tsx
    - apps/web/src/ui/panels/ChatPanel.css
    - apps/web/src/ui/GameUI.tsx
    - apps/web/src/store/gameStore.ts
    - apps/web/src/ui/hud/GameShortcuts.tsx

key-decisions:
  - "ChatPanel is always visible — no showChat/toggleChat state needed in gameStore"
  - "chatStore side-effect import in GameUI ensures chat:message listener registered when UI mounts"
  - "Keyboard isolation preserved via onFocus/onBlur on chat inputs (not useEffect) — matches Phase 103 decision"

patterns-established:
  - "Always-visible HUD panels own their position via absolute CSS; no toggle state in gameStore"
  - "Per-channel message rendering uses messages[activeChannel] — direct Zustand slice subscription"

requirements-completed: [UI-01, UI-02, UI-03, UI-04, UI-05]

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 106 Plan 02: Chat Panel UI Summary

**Tabbed ChatPanel with five channel tabs, red unread badges, HH:MM timestamps, channel-colored senders, and always-visible bottom-left positioning — showChat/toggleChat fully removed from gameStore**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-26T21:10:00Z
- **Completed:** 2026-02-26T21:13:43Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- ChatPanel completely rewritten with five tabbed channels (Local, Zone, Faction, Global, Whisper) using chatStore from Plan 01
- Unread badges (red, capped at 99+) appear on inactive tabs when unreadCounts > 0; clicking tab clears unread
- Messages display HH:MM timestamp, channel-colored sender name, and message text; auto-scroll on new messages
- Whisper tab shows a "To:" target input field wired to chatStore.setWhisperTarget
- Panel is always visible at bottom-left (380x280px); showChat/toggleChat removed from gameStore; Chat button removed from GameShortcuts

## Task Commits

1. **Task 1: Rewrite ChatPanel with tabbed channels, unread badges, timestamps, and channel colors** - `261fc22` (feat)
2. **Task 2: Make ChatPanel always visible and remove toggle state** - `5343245` (feat)

## Files Created/Modified

- `apps/web/src/ui/panels/ChatPanel.tsx` - Rewritten: tabbed channels, unread badges, timestamps, whisper target input, keyboard isolation
- `apps/web/src/ui/panels/ChatPanel.css` - Rewritten: always-visible panel at bottom-left, tab styles, badge styles, per-channel sender colors
- `apps/web/src/ui/GameUI.tsx` - Removed showChat conditional; always renders ChatPanel; added chatStore side-effect import
- `apps/web/src/store/gameStore.ts` - Removed showChat and toggleChat from interface and implementation
- `apps/web/src/ui/hud/GameShortcuts.tsx` - Removed toggleChat destructuring and Chat shortcut button

## Decisions Made

- Chat panel is always visible — no toggle state needed. This matches the Phase 106 design decision that the chat panel is a persistent HUD element like the minimap.
- Side-effect import of chatStore in GameUI ensures the chat:message socket handler is registered when the game UI mounts, following the established pattern from statsStore/questStore.
- Keyboard isolation via onFocus/onBlur preserved (not useEffect) to match Phase 103 decision for always-visible panels.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 106 is now complete: chatStore (Plan 01) + ChatPanel UI (Plan 02) deliver the full in-game chat panel
- Requirements UI-01 through UI-05 all satisfied
- Ready to proceed to the next milestone phase

---
*Phase: 106-chat-panel-ui*
*Completed: 2026-02-26*
