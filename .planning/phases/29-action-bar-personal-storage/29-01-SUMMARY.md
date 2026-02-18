---
phase: 29-action-bar-personal-storage
plan: "01"
subsystem: ui

tags: [zustand, dnd-kit, hotbar, action-bar, localStorage, keyboard-shortcuts]

requires:
  - phase: 27-inventory-panel-dnd
    provides: inventoryStore with inventory:update socket wiring and DnD infrastructure
  - phase: 28-equipment-system
    provides: DndContext lifted to GameUI.tsx with equip- prefix routing pattern

provides:
  - 8-slot action bar hotbar with number-key 1-8 shortcuts for quick item use
  - actionBarStore Zustand store with localStorage persistence and orphan invalidation
  - Drag-to-assign from inventory via hotbar- droppable slot IDs

affects: [personal-storage, future-combat, consumable-use-flow]

tech-stack:
  added: []
  patterns:
    - "Module-level useInventoryStore.subscribe for cross-store orphan invalidation without component coupling"
    - "hotbar-{N} droppable ID prefix routes drag drops to action bar assignment in GameUI handleDragEnd"
    - "chat-focus guard (tagName INPUT/TEXTAREA check) prevents hotkey conflicts with chat input"

key-files:
  created:
    - apps/web/src/store/actionBarStore.ts
    - apps/web/src/ui/hud/ActionBar.tsx
    - apps/web/src/ui/hud/ActionBar.css
  modified:
    - apps/web/src/ui/hud/HUD.tsx
    - apps/web/src/ui/hud/HUD.css
    - apps/web/src/ui/GameUI.tsx

key-decisions:
  - "actionBarStore is a separate Zustand store from inventoryStore — keeps action bar concerns isolated, no inventory re-render coupling"
  - "Module-level subscribe (not component useEffect) ensures orphan invalidation runs even when ActionBar is unmounted"
  - "hotbar- prefix routing added before equip- check in handleDragEnd — allows future slot type extensions without conflicts"
  - "e.repeat guard in keydown handler prevents held-key item spam"

patterns-established:
  - "Cross-store invalidation: useInventoryStore.subscribe at module level in dependent store file"
  - "Droppable slot ID prefix routing: GameUI handleDragEnd checks startsWith to route drag targets"

duration: 3min
completed: 2026-02-18
---

# Phase 29 Plan 01: Action Bar (Hotbar) Summary

**8-slot action bar hotbar with 1-8 keyboard shortcuts, drag-to-assign from inventory, localStorage persistence, and automatic orphan invalidation on inventory:update**

## Performance

- **Duration:** 163s (~3 min)
- **Started:** 2026-02-18T11:01:22Z
- **Completed:** 2026-02-18T11:04:05Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Created actionBarStore with immer, localStorage persistence (key: `action_bar_assignments`), and module-level orphan invalidation wired via `useInventoryStore.subscribe`
- Created ActionBar component with 8 droppable slots (`hotbar-{0..7}`), document-level keydown listener with chat-focus guard and e.repeat guard, item icon display and ItemTooltip integration
- Integrated ActionBar into HUD below I/E/C buttons; extended GameUI.tsx handleDragEnd to route `hotbar-` prefixed drops to `useActionBarStore.getState().assign()`

## Task Commits

1. **Task 1: Create actionBarStore** - `678ba99` (feat)
2. **Task 2: Create ActionBar component** - `ac45398` (feat)
3. **Task 3: Integrate ActionBar into HUD and GameUI** - `637032c` (feat)

## Files Created/Modified

- `apps/web/src/store/actionBarStore.ts` - Zustand store with 8 slots, assign/unassign/invalidateOrphans, localStorage persistence, module-level subscribe for orphan cleanup
- `apps/web/src/ui/hud/ActionBar.tsx` - 8-slot hotbar component with useDroppable per slot, document keydown listener, ItemTooltip on filled slots
- `apps/web/src/ui/hud/ActionBar.css` - Hotbar slot styling (48x48px, rarity border, key label, over-highlight)
- `apps/web/src/ui/hud/HUD.tsx` - Added ActionBar import and render below action buttons
- `apps/web/src/ui/hud/HUD.css` - hud-bottom updated to flex column to stack action-bar and hotbar
- `apps/web/src/ui/GameUI.tsx` - Added useActionBarStore import and hotbar- prefix routing in handleDragEnd

## Decisions Made

- actionBarStore is a separate Zustand store — isolates action bar state from inventory changes, matches v1.6 research decision that inventoryStore must be separate from gameStore
- Module-level subscribe pattern ensures orphan invalidation fires regardless of ActionBar component mount state — more robust than useEffect-based subscription
- hotbar- prefix routing checked before equip- in handleDragEnd — explicit ordering prevents any ambiguity with future slot types

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Action bar is fully functional: drag-to-assign, 1-8 key shortcuts, chat-focus guard, orphan auto-invalidation, localStorage persistence
- Phase 29 Plan 02 (Personal Storage) can proceed — shares inventoryStore and DndContext patterns established here

---
*Phase: 29-action-bar-personal-storage*
*Completed: 2026-02-18*
