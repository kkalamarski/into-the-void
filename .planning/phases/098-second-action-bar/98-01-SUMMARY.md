---
phase: 98
plan: 01
subsystem: hud
tags: [action-bar, keybindings, drag-and-drop, persistence, zustand]
dependency_graph:
  requires: [97-01, 97-02]
  provides: [secondary-action-bar, shift-keybindings]
  affects: [apps/web/src/ui/hud/ActionBar.tsx, apps/web/src/ui/GameUI.tsx, apps/web/src/store/actionBarStore.ts]
tech_stack:
  added: []
  patterns: [barIndex prop pattern, bar-prefixed DnD IDs, global DndContext delegation]
key_files:
  created: []
  modified:
    - apps/web/src/store/actionBarStore.ts
    - apps/web/src/ui/hud/ActionBar.tsx
    - apps/web/src/ui/hud/HUD.tsx
    - apps/web/src/ui/GameUI.tsx
decisions:
  - "Secondary bar does not auto-fill from equipped abilities - only explicit drag assignments"
  - "ActionBar removed its own local DndContext - all drag handling delegated to GameUI's global DndContext"
  - "bar-N-slot-N ID scheme prevents DnD ID collisions between the two bars"
  - "Key labels show S1-S8 for secondary bar to distinguish from primary"
metrics:
  duration: 3 minutes
  completed: 2026-02-26
  tasks: 3
  files_modified: 4
---

# Phase 98 Plan 01: Second Action Bar Summary

Second action bar with 8 slots using Shift+1-8 keybindings, full Phase 97 drag-and-drop support, and independent localStorage persistence.

## What Was Built

Added a complete second action bar giving players 16 total hotbar slots for abilities, matching standard MMO conventions.

### Task 1: Extend actionBarStore with secondary ability order (ab88fc7)

Added secondary bar state to `actionBarStore.ts` mirroring the primary bar pattern:

- `SECONDARY_ABILITY_ORDER_STORAGE_KEY = 'action_bar_secondary_ability_order'`
- `loadSecondaryAbilityOrderFromStorage()` and `saveSecondaryAbilityOrderToStorage()` helpers
- `secondaryAbilityOrder` state in `ActionBarState` interface
- `setSecondaryAbilityOrder`, `swapSecondaryAbilitySlots`, `assignSecondaryAbility`, `removeSecondaryAbilityFromSlot` actions
- All secondary state persists under a distinct localStorage key, independent from primary bar

### Task 2: Add barIndex prop to ActionBar component (174cc50)

Modified `ActionBar.tsx` to support both bars with a single component:

- Added `barIndex: 0 | 1` prop to `ActionBarProps` interface
- Selects `abilityOrder` vs `secondaryAbilityOrder` based on `barIndex`
- Uses `bar-${barIndex}-slot-${i}` slot IDs to prevent DnD ID collisions
- Keyboard handler checks `e.shiftKey` and only responds when `targetBarIndex === barIndex`
- Key labels: `1`-`8` for primary, `S1`-`S8` for secondary bar
- Secondary bar does not auto-fill from equipped abilities (manual only)
- Removed local `DndContext` and `DragOverlay` - delegated to GameUI's global context
- `barIndex` flows through `SortableAbilitySlot` into drag data for GameUI cross-component handling

### Task 3: Update HUD and GameUI for two action bars (c1e7a41)

**HUD.tsx:** Replaced single `<ActionBar />` with two instances stacked vertically:
```tsx
<ActionBar barIndex={0} />
<ActionBar barIndex={1} />
```

**GameUI.tsx:** Extended global drag handler to support both bars:
- Added `handleDragStart` tracking `shiftHeld` state from `activatorEvent.shiftKey`
- Drop-outside-to-remove: parses `bar-N-slot-` from active ID, routes to correct bar's `removeAbilityFromSlot`/`removeSecondaryAbilityFromSlot`
- Shift+drag slot swapping: parses both `fromId` and `toId`, only swaps within same bar (matching `barIndex`)
- Ability panel drag-to-assign: updated from `overId.startsWith('slot-')` to `overId.match(/bar-(\d+)-slot-(\d+)/)` pattern
- `DragStartEvent` imported from `@dnd-kit/core`

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **Secondary bar does not auto-fill** - Unlike the primary bar which automatically places newly equipped abilities into empty slots, the secondary bar only shows explicitly assigned abilities. This gives players full control over their Shift+1-8 bindings.

2. **ActionBar delegates all drag logic to GameUI** - Removed the local `DndContext` from `ActionBar`. Since `GameUI` already owns the global `DndContext` for cross-component drag (ability panel -> action bar), having a nested context would conflict. The `barIndex` is embedded in slot IDs and drag data to let `GameUI.handleDragEnd` route correctly.

3. **bar-N-slot-N ID scheme** - Both bars use `bar-0-slot-0..7` and `bar-1-slot-0..7` format. This prevents `@dnd-kit` from confusing slots across bars (same index, different bar) and allows bar identification from slot ID alone.

4. **S1-S8 key labels** - Secondary bar shows `S1` through `S8` on slot corners (vs `1`-`8` on primary) to visually distinguish the two bars and indicate Shift modifier requirement.

## Self-Check: PASSED

All created/modified files exist:
- FOUND: apps/web/src/store/actionBarStore.ts
- FOUND: apps/web/src/ui/hud/ActionBar.tsx
- FOUND: apps/web/src/ui/hud/HUD.tsx
- FOUND: apps/web/src/ui/GameUI.tsx

All commits exist:
- FOUND: ab88fc7 (Task 1 - actionBarStore secondary bar)
- FOUND: 174cc50 (Task 2 - ActionBar barIndex prop)
- FOUND: c1e7a41 (Task 3 - HUD and GameUI updates)

Key artifact verification:
- `secondaryAbilityOrder` present in actionBarStore.ts
- `barIndex={1}` present in HUD.tsx
- `barIndex` prop present in ActionBar.tsx
