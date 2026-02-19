---
phase: 38-perception-gating-and-client-polish
plan: 04
subsystem: ui
tags: [socket.io, zustand, chat, error-handling]

# Dependency graph
requires:
  - phase: 38-perception-gating-and-client-polish
    provides: Level-gated interaction rejection via server error event emission (38-02)
provides:
  - gameSocket.on('error') handler in gameStore.ts that displays server errors as system chat messages
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [Socket.IO error event wired to chat panel for all server-side error propagation]

key-files:
  created: []
  modified:
    - apps/web/src/store/gameStore.ts

key-decisions:
  - "Error handler added after player:left at line 296 — consistent placement with existing event handlers"
  - "channel: 'system' used for server error messages — matches existing system message convention"

patterns-established:
  - "gameSocket.on('error') as the single catch-all for server-emitted errors displayed to players"

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 38 Plan 04: Error Event Handler for Level-Gated Rejections Summary

**gameSocket.on('error') handler in gameStore.ts displays TOOL_USE_FAILED and all server errors in the chat panel as system messages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T10:42:34Z
- **Completed:** 2026-02-19T10:44:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `gameSocket.on('error', ...)` handler to gameStore.ts after the `player:left` handler
- Server error messages (code + message payload) are now routed to the chat panel as system messages
- INTR-07 gap fully closed: level-gated interaction rejections are now visible to the player

## Task Commits

Each task was committed atomically:

1. **Task 1: Register error event handler in gameStore.ts** - `fe7bf50` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/web/src/store/gameStore.ts` - Added gameSocket.on('error') handler that creates a ChatMessage with channel: 'system' and calls addChatMessage()

## Decisions Made
- Error handler follows the same ChatMessage structure as existing system messages (senderId: 'system', senderName: 'System', channel: 'system') — consistent with established pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 38 is now complete — all 4 plans done (including this gap-closure plan)
- v1.8 milestone fully satisfied
- INTR-07 (level-gated interaction feedback) now end-to-end: server rejects + emits error event; client displays message in chat panel

---
*Phase: 38-perception-gating-and-client-polish*
*Completed: 2026-02-19*
