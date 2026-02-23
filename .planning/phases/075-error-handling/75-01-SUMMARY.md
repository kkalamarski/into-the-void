---
phase: 75-error-handling
plan: 01
subsystem: client-stores
tags: [pending-state, error-routing, ui-infrastructure]
dependency_graph:
  requires: [alertStore, npcStore, gameSocket]
  provides: [pending-state-flags, 5s-toast-duration, inline-spinner-css]
  affects: [npcStore, alertStore, global.css]
tech_stack:
  added: [quest:accepted event, quest:error event]
  patterns: [pending-before-emit, error-routing-to-toast]
key_files:
  created: []
  modified:
    - apps/web/src/store/npcStore.ts
    - apps/web/src/store/alertStore.ts
    - apps/web/src/styles/global.css
    - packages/shared-types/src/network/events.ts
decisions:
  - Socket event types centralized in shared-types ServerEvents interface
  - Errors routed from inline tradeError to alertStore for consistency
  - Pending state set before emit to prevent race conditions
  - Spinner uses currentColor for button color inheritance
metrics:
  duration: 173s
  completed: 2026-02-23
---

# Phase 75 Plan 01: Error Handling Infrastructure Summary

**One-liner:** Pending state flags in npcStore, 5-second toast duration, and 16px inline spinner CSS for async operation feedback

## What Was Built

Added foundation for async operation feedback in Phase 75:

1. **npcStore pending state management**
   - `tradePending` and `questPending` boolean flags
   - `setTradePending` and `setQuestPending` actions
   - Set pending true before `quest:accept` and `quest:complete` emits
   - Reset pending in `closeInteraction` and socket listeners

2. **Error routing to alertStore**
   - Trade errors route to `alertStore.addAlert` instead of inline `tradeError`
   - Quest errors handled via `quest:error` socket listener
   - Both reset pending state on success/failure

3. **UI building blocks**
   - Alert duration changed from 3s to 5s per ERR-02 spec
   - `.spinner-small` CSS class for 16px inline spinners
   - Spinner inherits button color via `currentColor`

## Tasks Completed

| Task | Name                                    | Commit  | Files                  |
| ---- | --------------------------------------- | ------- | ---------------------- |
| 1    | Add pending state and error routing    | f7710f4 | npcStore.ts            |
| 2    | Update alert duration and spinner CSS  | 1ca347e | alertStore.ts, global.css |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing socket event types**
- **Found during:** Task 1 verification (TypeScript compilation)
- **Issue:** ServerEvents interface missing `quest:accepted` and `quest:error` event types
- **Fix:** Added both event types to ServerEventType union and ServerEvents interface in shared-types
- **Files modified:** packages/shared-types/src/network/events.ts
- **Commit:** 91417d1

Event definitions added:
```typescript
'quest:accepted': { questId: string };
'quest:error': { message: string };
```

## Technical Details

**Socket listener flow:**
1. Client emits quest action (accept/complete) with pending set to true
2. Server processes and responds with success or error event
3. Client listener resets pending to false and routes errors to alertStore

**Pending state pattern:**
```typescript
acceptQuest: (questId: string) => {
  set({ questPending: true });  // BEFORE emit prevents race
  gameSocket.emit('quest:accept', { questId });
}
```

**Socket listeners added:**
- `quest:accepted` → reset questPending
- `quest:completed` → reset questPending
- `quest:error` → route to alertStore + reset questPending
- `trade:result` → route errors to alertStore + reset tradePending

## Verification

All success criteria met:
- [x] npcStore exposes tradePending, questPending boolean state
- [x] npcStore provides setTradePending, setQuestPending actions
- [x] acceptQuest and completeQuestAtNpc set pending true before emit
- [x] Socket listeners reset pending state on success/error
- [x] Trade/quest errors route to alertStore.addAlert
- [x] alertStore auto-dismisses after 5 seconds (was 3)
- [x] spinner-small CSS class renders 16px spinner

**Build verification:**
- TypeScript compilation: PASSED
- Web build: PASSED (2.67 MB bundle, 644 KB gzipped)
- All grep checks: PASSED

## Next Steps

Plan 02 will wire these building blocks to actual UI:
- Disable buttons during pending state
- Render spinner-small in pending buttons
- Wire close handlers to reset pending
- Add error boundary for uncaught exceptions

## Self-Check

Verifying all created files and commits exist.

**Created files:**
None (only modifications)

**Modified files:**
- apps/web/src/store/npcStore.ts: EXISTS
- apps/web/src/store/alertStore.ts: EXISTS
- apps/web/src/styles/global.css: EXISTS
- packages/shared-types/src/network/events.ts: EXISTS

**Commits:**
- f7710f4: EXISTS (feat: pending state and error routing)
- 1ca347e: EXISTS (feat: alert duration and spinner CSS)
- 91417d1: EXISTS (fix: missing socket event types)

## Self-Check: PASSED

All files exist, all commits verified in git history.
