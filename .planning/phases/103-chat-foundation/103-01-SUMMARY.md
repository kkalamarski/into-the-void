---
phase: 103-chat-foundation
plan: 01
subsystem: chat
tags: [chat, websocket, keyboard-isolation, phaser, zustand]
dependency_graph:
  requires: []
  provides: [chat-message-delivery, keyboard-isolation]
  affects: [apps/web/src/store/gameStore.ts, apps/web/src/ui/panels/ChatPanel.tsx]
tech_stack:
  added: []
  patterns: [module-level socket listener, onFocus/onBlur keyboard isolation]
key_files:
  created: []
  modified:
    - apps/web/src/store/gameStore.ts
    - apps/web/src/ui/panels/ChatPanel.tsx
decisions:
  - "Socket listeners registered at module level in store files, not in React components"
  - "onFocus/onBlur used for keyboard isolation (not useEffect mount) because ChatPanel is always-visible"
metrics:
  duration: 51s
  completed: 2026-02-26
  tasks_completed: 2
  files_modified: 2
---

# Phase 103 Plan 01: Chat Foundation Infrastructure Summary

**One-liner:** Added server chat:message socket listener in gameStore and WASD keyboard isolation via onFocus/onBlur on the ChatPanel input, fixing both client message delivery and key capture bugs.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Register chat:message socket listener in gameStore | 86f0ca0 | apps/web/src/store/gameStore.ts |
| 2 | Add keyboard isolation to ChatPanel input via onFocus/onBlur | 60653b9 | apps/web/src/ui/panels/ChatPanel.tsx |

## What Was Built

**Task 1 — INFRA-01 fix:** Added a module-level `gameSocket.on('chat:message', ...)` listener in `apps/web/src/store/gameStore.ts` immediately after the existing `gameSocket.on('error', ...)` handler. The listener accepts a `ChatMessage` parameter and routes it to `useGameStore.getState().addChatMessage(message)`. This matches the established project pattern for socket event registration (module-level in store files, not inside React components).

**Task 2 — INFRA-02 fix:** Added `handleInputFocus` and `handleInputBlur` handlers inside `ChatPanel.tsx` that call `worldScene?.setKeyboardEnabled(false)` and `worldScene?.setKeyboardEnabled(true)` respectively. These handlers are wired to the chat input element via `onFocus` and `onBlur` attributes. Also updated `maxLength` from `200` to `280` per REQUIREMENTS.md specification.

## Key Decisions Made

1. **Module-level socket listener placement:** The `chat:message` listener was placed at module level in `gameStore.ts` (after line 532 alongside `error`, `credits:update`, etc.) rather than inside ChatPanel or a React hook. This is the established project pattern — all socket listeners live in store files, not components.

2. **onFocus/onBlur vs useEffect for keyboard isolation:** Used `onFocus`/`onBlur` event handlers instead of `useEffect` mount/unmount because `ChatPanel` is always mounted when visible. A `useEffect` approach would permanently disable keyboard input the moment the panel is visible, preventing WASD movement even when the user is not typing.

## Verification Results

All four verification checks from the plan pass:
1. `grep "gameSocket.on('chat:message'" apps/web/src/store/gameStore.ts` — found at line 535
2. `grep "setKeyboardEnabled" apps/web/src/ui/panels/ChatPanel.tsx` — found at lines 22 and 27
3. `grep "maxLength={280}" apps/web/src/ui/panels/ChatPanel.tsx` — found at line 73
4. `npx nx run web:build` — builds successfully (2,797 kB bundle, no TypeScript errors)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- FOUND: apps/web/src/store/gameStore.ts
- FOUND: apps/web/src/ui/panels/ChatPanel.tsx

Commits exist:
- FOUND: 86f0ca0 (feat(103-01): register chat:message socket listener in gameStore)
- FOUND: 60653b9 (feat(103-01): add keyboard isolation to ChatPanel input via onFocus/onBlur)
