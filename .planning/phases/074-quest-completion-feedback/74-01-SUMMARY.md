---
phase: 74-quest-completion-feedback
plan: 01
subsystem: quest-ui
tags: [quest-completion, ui-polish, queue-management, click-to-dismiss]
completed: 2026-02-23
duration: 206s

dependency_graph:
  requires:
    - "Phase 67: Quest system core (QuestReward interface)"
    - "Phase 44: QuestCompleteModal base implementation"
  provides:
    - "Array-based quest completion reward queue (max 3 items)"
    - "Click-to-dismiss banner functionality with event stopping"
    - "Stacked banner positioning for multiple simultaneous completions"
  affects:
    - "apps/web/src/store/questStore.ts"
    - "apps/web/src/ui/modals/QuestCompleteModal.tsx"
    - "apps/web/src/ui/modals/QuestCompleteModal.css"

tech_stack:
  added: []
  patterns:
    - "Array queue with slice-based max limit (alertStore pattern)"
    - "Store-managed auto-dismiss timers (5 seconds per item)"
    - "Click-to-dismiss with stopPropagation pattern"
    - "Stacked absolute positioning with percentage-based offsets"

key_files:
  created: []
  modified:
    - path: "apps/web/src/store/questStore.ts"
      changes: "Replaced single completedQuestReward with completedRewards array queue, added addCompletedReward/removeCompletedReward methods"
      loc_delta: +14
    - path: "apps/web/src/ui/modals/QuestCompleteModal.tsx"
      changes: "Removed useEffect timer, added click handler with stopPropagation, map over reward array with stacked rendering"
      loc_delta: +9
    - path: "apps/web/src/ui/modals/QuestCompleteModal.css"
      changes: "Added absolute positioning, pointer-events: auto, cursor: pointer; removed flexbox centering"
      loc_delta: +4

decisions:
  - context: "Queue size limit"
    decision: "Max 3 active banners using slice(-2) + new pattern from alertStore"
    rationale: "Prevents UI spam during rapid multi-quest completions, matches alertStore queue strategy"
    alternatives: ["Unlimited queue (could overflow screen)", "Single banner (original race condition)"]

  - context: "Auto-dismiss timing"
    decision: "5 seconds per banner, managed in store's addCompletedReward"
    rationale: "Moved timer from component useEffect to store for centralized lifecycle management"
    alternatives: ["Component-based timers (harder to track)", "No auto-dismiss (requires manual click)"]

  - context: "Banner stacking"
    decision: "Top positions at 30%, 42%, 54% using inline styles"
    rationale: "12% vertical spacing prevents overlap while keeping banners visible in viewport"
    alternatives: ["Fixed pixel spacing (less responsive)", "Transform stacking (more complex)"]

  - context: "Click behavior"
    decision: "stopPropagation on banner click to prevent game canvas interaction"
    rationale: "Critical for modal click isolation pattern (Phase 72 established practice)"
    alternatives: ["Global click blocker (breaks intentional pass-through)", "No propagation stopping (breaks gameplay)"]
---

# Phase 74 Plan 01: Quest Completion Queue and Click-to-Dismiss

Queue-based quest completion banners with click-to-dismiss functionality to handle rapid multi-quest completions without race conditions.

## Objective

Enable multiple quest completions to display simultaneously as stacked banners, each dismissible by click, preventing the previous single-reward race condition where rapid completions would overwrite each other.

## Implementation Summary

**Task 1: Convert questStore to array-based queue**
- Replaced `completedQuestReward: QuestReward | null` with `completedRewards: QuestReward[]`
- Added `addCompletedReward` with max 3 item queue limit (slice-based pattern from alertStore)
- Added `removeCompletedReward` for targeted removal by questId
- Integrated 5-second auto-dismiss timer per reward in store (moved from component)
- Updated `quest:completed` socket handler to call `addCompletedReward(data)`

**Task 2: Update QuestCompleteModal for queue rendering and click-to-dismiss**
- Changed selector from single `completedQuestReward` to `completedRewards` array
- Removed useEffect-based auto-dismiss (now handled in store)
- Added `handleDismiss` click handler with `e.stopPropagation()` to prevent canvas clicks
- Mapped over `completedRewards` array with stacked positioning: `top: 30% + index * 12%`
- CSS changes: added `position: absolute`, `pointer-events: auto`, `cursor: pointer`
- Removed flexbox centering from overlay (now uses absolute positioning per banner)

## Technical Details

**Queue Management Pattern:**
```typescript
addCompletedReward: (reward) => {
  set((state) => ({
    completedRewards: [...state.completedRewards.slice(-2), reward]  // Max 3
  }));
  setTimeout(() => get().removeCompletedReward(reward.questId), 5000);
}
```

**Click-to-Dismiss with Event Isolation:**
```typescript
const handleDismiss = (e: React.MouseEvent, questId: string) => {
  e.stopPropagation();  // Critical: prevents click from reaching game canvas
  removeCompletedReward(questId);
};
```

**Stacked Positioning:**
- Banner 1: `top: 30%`
- Banner 2: `top: 42%` (30 + 12)
- Banner 3: `top: 54%` (30 + 24)

Each banner horizontally centered with `left: 50%; transform: translateX(-50%)`.

## Deviations from Plan

None. Plan executed exactly as written.

## Testing Performed

**Build Verification:**
- TypeScript compilation: PASS (npx nx run web:build)
- All type signatures correct (completedRewards array, stopPropagation handler)

**Code Verification:**
- `completedRewards: QuestReward[]` present in questStore.ts: CONFIRMED
- `stopPropagation` present in QuestCompleteModal.tsx: CONFIRMED
- `cursor: pointer` present in QuestCompleteModal.css: CONFIRMED

**Known Issue:**
- `npx nx run web:lint` fails with "All files matching ... are ignored" - pre-existing ESLint configuration issue unrelated to this plan's changes. Build-time TypeScript checking provides equivalent validation.

## Files Changed

| File | Type | Changes |
|------|------|---------|
| `apps/web/src/store/questStore.ts` | Modified | +14 lines: array queue, addCompletedReward, removeCompletedReward |
| `apps/web/src/ui/modals/QuestCompleteModal.tsx` | Modified | +9 lines: array mapping, click handler, stacked rendering |
| `apps/web/src/ui/modals/QuestCompleteModal.css` | Modified | +4 lines: absolute positioning, pointer styling |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `506253a` | Convert questStore to array-based reward queue |
| 2 | `03f62c4` | Add queue rendering and click-to-dismiss to QuestCompleteModal |

## Integration Points

**Upstream Dependencies:**
- Phase 67: `QuestReward` interface definition
- Phase 44: Base `QuestCompleteModal` component structure

**Downstream Impact:**
- Quest completion flow now supports rapid multi-quest turn-ins
- Banner stacking pattern established for future notification systems
- Click-to-dismiss UX matches modal interaction patterns from Phase 72

## Self-Check: PASSED

**Created files:**
None expected.

**Modified files:**
```bash
✓ apps/web/src/store/questStore.ts - exists and contains completedRewards array
✓ apps/web/src/ui/modals/QuestCompleteModal.tsx - exists and contains stopPropagation
✓ apps/web/src/ui/modals/QuestCompleteModal.css - exists and contains cursor: pointer
```

**Commits:**
```bash
✓ 506253a - feat(74-01): convert questStore to array-based reward queue
✓ 03f62c4 - feat(74-01): add queue rendering and click-to-dismiss to QuestCompleteModal
```

All artifacts verified present on disk and in git history.

## Success Criteria Met

- [x] questStore uses array queue with max 3 items and 5-second auto-dismiss per item
- [x] QuestCompleteModal renders all queued banners with stacked positioning (30%, 42%, 54%)
- [x] Clicking a banner dismisses it without propagating to game canvas (stopPropagation)
- [x] Multiple rapid completions display as stacked banners (not overwriting each other)

## Next Steps

Phase 74 Plan 02 (if exists): Continue quest feedback enhancements.
Otherwise: Proceed to Phase 75 per roadmap.
