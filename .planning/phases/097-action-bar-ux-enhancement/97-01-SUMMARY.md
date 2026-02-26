---
phase: 97-action-bar-ux-enhancement
plan: 01
subsystem: ui/action-bar
tags: [click-to-trigger, shift-drag, user-interaction]
dependency_graph:
  requires:
    - "@dnd-kit/core useSortable hook"
    - "actionBarStore abilityOrder state"
  provides:
    - "Click-to-trigger ability functionality"
    - "Shift+drag slot relocation"
    - "assignAbility/removeAbilityFromSlot store methods"
  affects:
    - "apps/web/src/ui/hud/ActionBar.tsx"
    - "apps/web/src/ui/hud/ActionBar.css"
    - "apps/web/src/store/actionBarStore.ts"
tech_stack:
  added: []
  patterns:
    - "Event modifier detection via activatorEvent"
    - "isDragging guard for click/drag disambiguation"
    - "Visual feedback via conditional CSS classes"
key_files:
  created: []
  modified:
    - path: "apps/web/src/ui/hud/ActionBar.tsx"
      changes: "Added isDragging guard, Shift detection, drop target highlighting"
    - path: "apps/web/src/ui/hud/ActionBar.css"
      changes: "Added .ability-slot--drop-target styles"
    - path: "apps/web/src/store/actionBarStore.ts"
      changes: "Added assignAbility and removeAbilityFromSlot methods"
decisions:
  - decision: "Use activatorEvent.shiftKey for modifier detection"
    rationale: "Captures Shift state at drag initiation, not during drag"
    alternatives: "Global keydown listener would miss timing"
  - decision: "isDragging guard in handleClick"
    rationale: "Prevents ability triggering on drag release edge case"
    alternatives: "Could increase activation distance, but 8px already standard"
  - decision: "Drop target highlight only when shiftHeld"
    rationale: "Visual feedback matches functional state (swap only with Shift)"
    alternatives: "Always highlight would confuse users when swaps don't occur"
metrics:
  duration: 193s
  tasks_completed: 3
  files_modified: 3
  commits: 3
  completed_at: "2026-02-26"
---

# Phase 97 Plan 01: Action Bar Click & Shift-Drag Summary

**One-liner:** Click-to-trigger abilities and Shift+drag slot relocation with visual feedback for action bar UX

## Implementation Overview

Enabled two core action bar interactions: (1) clicking ability icons triggers abilities via socket emission, with isDragging guard to prevent edge case triggering during drag release; (2) Shift+drag relocates abilities within the action bar by swapping slots, with drop target highlighting for visual feedback. Non-Shift drags are intentionally ignored, reserved for Phase 98 cross-bar drag functionality.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add click-to-trigger with isDragging guard | 907d80a |
| 2 | Add Shift key detection for conditional relocation | a36c6f4 |
| 3 | Add store methods for ability assignment and removal | 7e565d8 |

### Task 1: Click-to-trigger with isDragging guard
- Added `isDragging` guard at top of `handleClick` to prevent ability triggering on drag release
- Added `data` property to `useSortable` options with type/slotIndex/abilityId (needed for Plan 02)
- Existing click handler already emits `ability:use` socket event
- @dnd-kit's 8px activation distance prevents small clicks from triggering drag

**Files modified:** `apps/web/src/ui/hud/ActionBar.tsx`

### Task 2: Shift key detection for conditional relocation
- Added `shiftHeld` state to ActionBar component
- Updated `handleDragStart` to detect Shift via `activatorEvent.shiftKey`
- Modified `handleDragEnd` to only swap slots when `shiftHeld` is true
- Added `isOver` from useSortable and conditional CSS class for drop target highlighting
- Passed `shiftHeld` prop to SortableAbilitySlot components
- Added `.ability-slot--drop-target` CSS with accent border, background, and glow

**Files modified:** `apps/web/src/ui/hud/ActionBar.tsx`, `apps/web/src/ui/hud/ActionBar.css`

### Task 3: Store methods for ability assignment and removal
- Added `assignAbility(slotIndex, abilityId)` method to ActionBarState interface
- Added `removeAbilityFromSlot(slotIndex)` method to ActionBarState interface
- Both methods manipulate `abilityOrder` array and persist via `saveAbilityOrderToStorage`
- Methods ready for Plan 02 (drag from abilities panel to action bar)

**Files modified:** `apps/web/src/store/actionBarStore.ts`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compilation: PASSED (web project has no type errors)
- Click-to-trigger: Ability click emits `ability:use` socket event
- isDragging guard: Prevents click during drag release edge case
- Shift detection: Only swaps slots when Shift held during drag initiation
- Visual feedback: Drop targets show accent border/glow during Shift+drag
- Store methods: TypeScript recognizes new methods, ready for Plan 02

## Dependencies & Integration

**Requires:**
- @dnd-kit/core for drag detection and state (useSortable hook)
- actionBarStore for abilityOrder state and swapAbilitySlots action

**Provides for Plan 02:**
- `assignAbility(slotIndex, abilityId)` for cross-bar drag drops
- `removeAbilityFromSlot(slotIndex)` for clearing slots
- `data.type: 'action-bar-ability'` for drop-outside detection

**Integration points:**
- Socket emission: `gameSocket.emit('ability:use', { abilityId, targetEntityId })`
- Store access: `useActionBarStore()` hook in ActionBar component
- Visual feedback: CSS variables `--color-accent` for consistent theming

## Known Issues & Follow-ups

**Pre-existing issue:**
- map-editor build fails with TileId type error (unrelated to action bar changes)

**Plan 02 requirements:**
- Abilities panel drag source implementation
- Drop handler for cross-bar drags (ability panel → action bar)
- Remove ability on drop-outside (action bar → outside)

## Self-Check

Verifying key artifacts exist and claims are accurate.

### Files Modified
```bash
# Check modified files exist
[ -f "apps/web/src/ui/hud/ActionBar.tsx" ] && echo "FOUND: apps/web/src/ui/hud/ActionBar.tsx" || echo "MISSING: apps/web/src/ui/hud/ActionBar.tsx"
[ -f "apps/web/src/ui/hud/ActionBar.css" ] && echo "FOUND: apps/web/src/ui/hud/ActionBar.css" || echo "MISSING: apps/web/src/ui/hud/ActionBar.css"
[ -f "apps/web/src/store/actionBarStore.ts" ] && echo "FOUND: apps/web/src/store/actionBarStore.ts" || echo "MISSING: apps/web/src/store/actionBarStore.ts"
```

### Commits
```bash
# Check commits exist
git log --oneline --all | grep -q "907d80a" && echo "FOUND: 907d80a" || echo "MISSING: 907d80a"
git log --oneline --all | grep -q "a36c6f4" && echo "FOUND: a36c6f4" || echo "MISSING: a36c6f4"
git log --oneline --all | grep -q "7e565d8" && echo "FOUND: 7e565d8" || echo "MISSING: 7e565d8"
```

### Verification Results

**Files:**
- FOUND: apps/web/src/ui/hud/ActionBar.tsx (modified 2026-02-26 10:24)
- FOUND: apps/web/src/ui/hud/ActionBar.css (modified 2026-02-26 10:24)
- FOUND: apps/web/src/store/actionBarStore.ts (modified 2026-02-26 10:25)

**Commits:**
- FOUND: 907d80a (Task 1: click-to-trigger with isDragging guard)
- FOUND: a36c6f4 (Task 2: Shift key detection for conditional relocation)
- FOUND: 7e565d8 (Task 3: store methods for ability assignment and removal)

## Self-Check: PASSED
