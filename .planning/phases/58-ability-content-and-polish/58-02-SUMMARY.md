---
phase: 58-ability-content-and-polish
plan: 02
subsystem: ui
tags: [abilities, action-bar, dnd, ux, persistence]

# Dependency graph
requires:
  - phase: 56-ability-system-foundation
    provides: Action bar with abilities from equipment
  - phase: 58-ability-content-and-polish
    plan: 01
    provides: 21 abilities across all items

provides:
  - Drag-to-rearrange action bar slots using @dnd-kit
  - Slot swapping persists to localStorage
  - Visual feedback during drag operations
  - Click-to-use preserved via dnd-kit movement threshold

affects: [action-bar-ux, ability-ui, player-customization]

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core": "6.3.1"
    - "@dnd-kit/sortable": "10.0.0"
    - "@dnd-kit/utilities": "3.2.2"
  patterns:
    - "DndContext wraps sortable containers for drag-and-drop"
    - "SortableContext + useSortable hook for individual draggable items"
    - "rectSwappingStrategy for slot swapping behavior"
    - "DragOverlay for visual feedback during drag"
    - "Ability order stored separately from item assignments in localStorage"
    - "useEffect with JSON comparison to sync slots with stored order"

key-files:
  created: []
  modified:
    - apps/web/src/store/actionBarStore.ts
    - apps/web/src/ui/hud/ActionBar.tsx
    - apps/web/src/ui/hud/ActionBar.css

key-decisions:
  - "Store ability order separately from item assignments (different localStorage key)"
  - "Use abilityOrder array to track player's preferred slot arrangement"
  - "Auto-sync: when equipment changes, preserve order for existing abilities, append new ones"
  - "Use rectSwappingStrategy for slot swapping (not reordering)"
  - "Extract AbilitySlotContent component for reuse in DragOverlay"
  - "Apply drag listeners to entire slot for easy drag initiation"
  - "dnd-kit movement threshold (5px) automatically distinguishes drag from click"

patterns-established:
  - "Separate storage keys for different concerns (item assignments vs ability order)"
  - "Component extraction for content vs wrapper (AbilitySlotContent vs SortableAbilitySlot)"
  - "useMemo for expensive slot ordering computation"
  - "JSON comparison to prevent useEffect loops when syncing state"

# Metrics
duration: 3min
completed: 2026-02-20
---

# Phase 58 Plan 02: Action Bar Drag-to-Rearrange Summary

**Drag-to-rearrange action bar slots with @dnd-kit, slot swapping persists to localStorage for custom hotkey layouts**

## Performance

- **Duration:** 3 min 21s
- **Started:** 2026-02-20T19:43:13Z
- **Completed:** 2026-02-20T19:46:34Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added abilityOrder state to actionBarStore for tracking custom slot assignments
- Implemented DndContext and SortableContext wrapper for ActionBar
- Created SortableAbilitySlot component using useSortable hook
- Added swapAbilitySlots action for persisting drag operations
- Implemented auto-sync logic: preserve order for existing abilities, append new ones
- Added drag state styles (grab cursor, dragging opacity, overlay shadow)
- Verified TypeScript compilation success

## Task Commits

Each task was committed atomically:

1. **Task 1: Add reorderSlots Action to actionBarStore** - `7e510d2` (feat)
2. **Task 2: Implement Drag-to-Rearrange in ActionBar** - `4e6b7dc` (feat)
3. **Task 3: Add Drag State Styles** - `b4eacdf` (feat)

## Files Created/Modified
- `apps/web/src/store/actionBarStore.ts` - Added abilityOrder state array, setAbilityOrder and swapAbilitySlots actions, separate localStorage persistence
- `apps/web/src/ui/hud/ActionBar.tsx` - Wrapped in DndContext/SortableContext, extracted AbilitySlotContent component, created SortableAbilitySlot wrapper, implemented slot ordering logic with auto-sync
- `apps/web/src/ui/hud/ActionBar.css` - Added drag state styles (grab/grabbing cursor, dragging opacity, drag overlay scaling and shadow)

## Technical Implementation

**State management:**
- `abilityOrder: (string | null)[]` - Tracks player's preferred slot order by ability ID
- Separate localStorage key `action_bar_ability_order` for persistence
- `swapAbilitySlots(fromIndex, toIndex)` - Performs array swap and saves to storage
- `setAbilityOrder(order)` - Updates entire order array (used for auto-sync)

**Slot ordering logic:**
1. Build ordered array from abilityOrder state
2. Place abilities in their stored positions
3. Fill remaining slots with unplaced abilities
4. Auto-sync: useEffect compares current slots with stored order, updates if different

**Drag implementation:**
- DndContext with closestCenter collision detection
- SortableContext with rectSwappingStrategy for slot swapping
- useSortable hook provides drag attributes, listeners, transform, isDragging
- DragOverlay shows floating ghost element during drag
- Movement threshold (5px) distinguishes drag from click automatically

**Visual feedback:**
- Source slot: 50% opacity, accent border, grabbing cursor
- Drag overlay: 90% opacity, 1.05x scale, shadow, accent border
- Smooth 150ms transitions for transform and opacity
- Cursor hints: grab (idle), grabbing (dragging), default (empty), not-allowed (disabled)

## Decisions Made

**Architecture:**
- Store ability order separately from item assignments to support different use cases
- Use ability IDs (not instance IDs) for ordering since abilities come from equipment
- Auto-sync on equipment changes to handle new/removed abilities gracefully

**UX:**
- Swap strategy (not reorder) matches common action bar patterns
- Click-to-use preserved via dnd-kit's built-in movement threshold
- Visual feedback via opacity and overlay instead of complex animations

**Implementation:**
- Component extraction (AbilitySlotContent) for reuse in DragOverlay
- useMemo for slot ordering to prevent unnecessary recomputation
- JSON comparison in useEffect to prevent infinite loops when syncing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. @dnd-kit was already installed at root level. TypeScript compilation successful.

## Next Phase Readiness

- Action bar supports drag-to-rearrange for custom layouts
- Slot order persists across sessions via localStorage
- Click-to-use functionality preserved
- Visual feedback provides clear drag state indication
- Ready for player testing and feedback

## Self-Check

Verifying plan outputs:

**actionBarStore modifications:**
- Expected: abilityOrder state, setAbilityOrder and swapAbilitySlots actions
- Actual: Lines 67-127 in actionBarStore.ts
- Status: PASSED

**ActionBar dnd-kit integration:**
- Expected: DndContext, SortableContext, useSortable usage
- Actual: Lines 9-11 (imports), 247-272 (render) in ActionBar.tsx
- Status: PASSED

**Drag state styles:**
- Expected: .ability-slot--dragging and .ability-slot--drag-overlay styles
- Actual: Lines 35-49 in ActionBar.css
- Status: PASSED

**Commits verification:**
- Task 1 commit: 7e510d2 (feat: add ability ordering state to actionBarStore)
- Task 2 commit: 4e6b7dc (feat: implement drag-to-rearrange in ActionBar)
- Task 3 commit: b4eacdf (feat: add drag state styles to ActionBar)
- Status: PASSED

**Build verification:**
- TypeScript compilation: SUCCESS
- Web app built successfully
- Status: PASSED

## Self-Check: PASSED

All success criteria met. Plan execution complete.

---
*Phase: 58-ability-content-and-polish*
*Completed: 2026-02-20*
