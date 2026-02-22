---
phase: 68
plan: 01
subsystem: quest-ui
tags: [state-management, websocket, ui-foundation]

dependency_graph:
  requires: []
  provides:
    - questStore with WebSocket event handlers
    - gameStore.isQuestLogOpen toggle
  affects:
    - apps/web/src/store/questStore.ts (created)
    - apps/web/src/store/gameStore.ts (quest log toggle)
    - apps/web/src/network/socket.ts (quest events registered)

tech_stack:
  added:
    - Zustand questStore with localStorage persistence
    - Module-level socket handlers for quest:progress/completed/abandoned
  patterns:
    - Single source of truth for quest state
    - localStorage persistence for tracked quest IDs
    - Module-level event handlers following buffStore/combatLogStore pattern

key_files:
  created:
    - apps/web/src/store/questStore.ts: "Quest state management with activeQuests, completedQuests, trackedQuests, and socket event handlers"
  modified:
    - apps/web/src/store/gameStore.ts: "Added isQuestLogOpen toggle state following existing UI panel patterns"
    - apps/web/src/network/socket.ts: "Registered quest:progress, quest:completed, quest:abandoned in serverEvents array"

decisions:
  - key: "Quest store follows buffStore/combatLogStore pattern"
    why: "Consistent module-level socket handler pattern across all specialized stores"
    impact: "All quest UI components can consume from single source of truth"

  - key: "trackedQuests uses Set<string> with localStorage persistence"
    why: "HUD quest tracker needs to persist across page refresh, Set provides O(1) toggle"
    impact: "Players won't lose tracked quests on refresh, efficient add/remove operations"

  - key: "completedQuestReward field for modal display"
    why: "Quest completion modal needs reward data before clearing from activeQuests"
    impact: "Enables completion modal with auto-dismiss pattern (set → display → clear)"

metrics:
  duration: 124
  tasks_completed: 2
  files_created: 1
  files_modified: 2
  commits: 2
  completed_at: 2026-02-22
---

# Phase 68 Plan 01: Quest Store Foundation Summary

**One-liner:** Created questStore as single source of truth for quest state with WebSocket event handlers and localStorage persistence for tracked quests.

## What Was Built

**questStore.ts** - Dedicated Zustand store for quest state management:
- **State fields:**
  - `activeQuests: QuestProgressPayload[]` - All active quests being worked on
  - `completedQuests: CompletedQuest[]` - Historical record of completed quests
  - `trackedQuests: Set<string>` - Quest IDs tracked in HUD (persisted to localStorage)
  - `completedQuestReward: QuestReward | null` - Reward data for completion modal display

- **Actions:**
  - `addActiveQuest(quest)` - Add new quest to active list
  - `updateQuestProgress(data)` - Update existing quest progress from server
  - `removeActiveQuest(questId)` - Remove from active quests (on complete/abandon)
  - `addCompletedQuest(questId, displayName)` - Add to completion history
  - `toggleTracked(questId)` - Toggle HUD tracking with localStorage sync
  - `setCompletedReward(reward)` / `clearCompletedReward()` - Manage completion modal state

- **Module-level socket handlers:**
  - `quest:progress` - Updates existing quest or adds new quest to activeQuests
  - `quest:completed` - Removes from active, adds to completed, sets reward for modal
  - `quest:abandoned` - Removes from active quests

**gameStore.ts updates:**
- Added `isQuestLogOpen: boolean` state field
- Added `toggleQuestLog()` action following existing UI panel patterns
- Placed near other UI state fields for consistency

**socket.ts updates:**
- Registered `quest:progress`, `quest:completed`, `quest:abandoned` in serverEvents array
- Enables automatic dispatch to questStore handlers

## Implementation Details

**localStorage Persistence:**
```typescript
// Load tracked quests on store creation
function loadTrackedQuests(): Set<string> {
  const stored = localStorage.getItem('quest-tracked');
  return stored ? new Set(JSON.parse(stored)) : new Set();
}

// Save on every toggle
function saveTrackedQuests(trackedQuests: Set<string>): void {
  localStorage.setItem('quest-tracked', JSON.stringify([...trackedQuests]));
}
```

**Smart Quest Progress Handling:**
```typescript
gameSocket.on('quest:progress', (data: QuestProgressPayload) => {
  const store = useQuestStore.getState();
  const exists = store.activeQuests.some(q => q.questId === data.questId);
  if (exists) {
    store.updateQuestProgress(data);  // Update existing
  } else {
    store.addActiveQuest(data);       // Add new quest
  }
});
```

This pattern handles both initial quest acceptance (server sends progress for new quest) and ongoing progress updates (server sends progress for existing quest).

## Architecture Decisions

**Pattern Consistency:**
Followed exact pattern from `buffStore.ts` and `combatLogStore.ts`:
- Zustand create() with typed interface
- Module-level socket handlers (outside create())
- Import gameSocket from '../network/socket'
- Use getState() to access store in handlers

**Separation of Concerns:**
- questStore owns ALL quest state - no quest socket handlers in gameStore
- gameStore only has isQuestLogOpen toggle (UI chrome, not quest data)
- Clean separation enables components to subscribe to specific stores

**Completion Modal Pattern:**
`completedQuestReward` field enables this flow:
1. Server emits `quest:completed` with reward data
2. questStore sets reward in state
3. UI component sees non-null reward, shows modal
4. Modal auto-dismisses after 5s, calls `clearCompletedReward()`

This avoids race conditions where modal needs data but quest is already removed from activeQuests.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification steps passed:
- ✅ TypeScript compiles without errors
- ✅ questStore.ts exists with exported useQuestStore
- ✅ gameStore.ts has isQuestLogOpen in state interface
- ✅ No duplicate socket handlers between questStore and gameStore
- ✅ Quest events registered in socket.ts serverEvents array

## Self-Check: PASSED

**Created files exist:**
- ✅ FOUND: apps/web/src/store/questStore.ts

**Commits exist:**
- ✅ FOUND: f2e3ce8 (Task 1: questStore with socket handlers)
- ✅ FOUND: 0f542ef (Task 2: gameStore quest log toggle)

**Modified files verified:**
- ✅ isQuestLogOpen appears in gameStore.ts interface and implementation
- ✅ quest:progress, quest:completed, quest:abandoned handlers in questStore.ts
- ✅ quest events registered in socket.ts serverEvents array

## Next Steps

This plan provides the foundation for:
- **68-02**: Quest log panel UI (consumes activeQuests from questStore)
- **68-03**: Quest tracker HUD widget (consumes trackedQuests from questStore)
- **68-04**: Quest completion modal (consumes completedQuestReward from questStore)

All future quest UI components will import `useQuestStore` and subscribe to specific state slices.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | f2e3ce8 | feat(68-01): create questStore with WebSocket event handlers |
| 2 | 0f542ef | feat(68-01): add isQuestLogOpen toggle to gameStore |

---
*Generated: 2026-02-22*
*Duration: 124 seconds*
