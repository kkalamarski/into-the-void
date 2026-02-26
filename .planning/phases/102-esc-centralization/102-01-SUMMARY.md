---
phase: 102-esc-centralization
plan: 01
subsystem: ui/input
tags: [modal-stack, esc-handler, zustand, hooks, game-menu]
dependency_graph:
  requires: []
  provides: [modalStackStore, useModalStack, centralized-esc-dispatcher]
  affects: [GameUI.tsx, GameMenu.tsx]
tech_stack:
  added: []
  patterns: [modal-stack-lifo, getState-snapshot-in-event-handlers, onCloseRef-stale-closure-prevention]
key_files:
  created:
    - apps/web/src/store/modalStackStore.ts
    - apps/web/src/hooks/useModalStack.ts
  modified:
    - apps/web/src/ui/GameUI.tsx
    - apps/web/src/ui/modals/GameMenu.tsx
decisions:
  - "Idempotent push guard in modalStackStore prevents duplicate registrations for the same modal id"
  - "ESC priority chain: modal stack pop > cast cancel > path cancel > target clear > open menu"
  - "getState() snapshot pattern used in ESC event handler for all store reads — event handlers read current state at invocation time"
  - "onCloseRef in useModalStack prevents stale closures without re-registering the effect"
  - "cast:cancel socket event emitted for cast cancellation (matching server event name)"
metrics:
  duration: ~5 min
  completed: "2026-02-26"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 102 Plan 01: ESC Centralization — Modal Stack Infrastructure Summary

**One-liner:** Zustand LIFO modal stack store + auto-register hook wired to a single capture-phase ESC dispatcher in GameUI with GameMenu as first participant.

## What Was Built

Created the modal stack infrastructure that all subsequent modal ESC migrations depend on. The centralized dispatcher in GameUI.tsx now handles all ESC keypresses with a clear priority chain, replacing the previous simple toggle.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create modalStackStore and useModalStack hook | de32837 | apps/web/src/store/modalStackStore.ts, apps/web/src/hooks/useModalStack.ts |
| 2 | Wire centralized ESC dispatcher and register GameMenu | a10c0d3 | apps/web/src/ui/GameUI.tsx, apps/web/src/ui/modals/GameMenu.tsx |

## Architecture

### modalStackStore.ts
Zustand store (no immer, no persistence) with:
- `stack: ModalEntry[]` — LIFO array of `{ id, onClose }` entries
- `push(id, onClose)` — appends entry, idempotent guard on duplicate ids
- `pop()` — removes last entry (shallow copy with `slice(0, -1)`)
- `popById(id)` — filters out entry by id (no-op if already removed)
- `peek()` — returns `stack[stack.length - 1]` using `get()` snapshot

### useModalStack.ts hook
Custom hook that auto-registers a modal on mount and unregisters on unmount:
- `push(id, () => onCloseRef.current())` on mount
- `popById(id)` on unmount (cleanup)
- `onCloseRef` pattern prevents stale closures without re-triggering the effect

### GameUI.tsx ESC dispatcher
Replaced the old `setIsMenuOpen(prev => !prev)` toggle with a priority-chain handler:
1. **Modal stack non-empty** → `pop()` + call `topModal.onClose()`
2. **Active cast** → `gameSocket.emit('cast:cancel')`
3. **Active pathfinding** → `pathfindingController.cancelPath()`
4. **Selected combat target** → `useCombatStore.getState().selectTarget(null)`
5. **Nothing to clear** → `setIsMenuOpen(true)` (opens game menu)

Handler remains on `window` in `{ capture: true }` mode with `stopPropagation()` + `preventDefault()`.

### GameMenu.tsx
Added `useModalStack('game-menu', onClose)` call at the top of the component body (after `useNavigate`). GameMenu now auto-registers on mount and unregisters on unmount, participating in the ESC stack correctly.

## ESC Behavior Verified

- ESC with no modals open: opens game menu (step 5 in chain)
- ESC with game menu open: pops stack → calls `onClose` → `setIsMenuOpen(false)` → unmounts GameMenu → `popById` (no-op)
- Backdrop click on GameMenu calls `onClose` directly, correctly mirrors ESC behavior
- No duplicate ESC listeners: exactly ONE `window.addEventListener('keydown', ..., { capture: true })` in GameUI.tsx, zero in GameMenu.tsx

## Decisions Made

1. **Idempotent push guard**: `modalStackStore.push` checks for existing id before appending — prevents duplicate registrations if a component re-mounts with the same id.
2. **Priority chain order**: modal stack first (closes UI) > cast cancel > path cancel > target clear > open menu. This matches the principle of "most recent user action is undone first."
3. **getState() snapshot in handler**: All store reads inside the ESC event handler use `.getState()` — correct pattern for event handlers that need current state at invocation time.
4. **onCloseRef pattern**: Prevents stale closure bug where the `onClose` prop could change after mount without re-registering the effect.
5. **cast:cancel event name**: Used `gameSocket.emit('cast:cancel')` consistent with the server event `cast:interrupt` — server cancels and emits back `cast:interrupt` which triggers `clearCast()`.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: apps/web/src/store/modalStackStore.ts
- FOUND: apps/web/src/hooks/useModalStack.ts
- FOUND: apps/web/src/ui/GameUI.tsx (modified)
- FOUND: apps/web/src/ui/modals/GameMenu.tsx (modified)
- FOUND commit: de32837 (modalStackStore + useModalStack)
- FOUND commit: a10c0d3 (ESC dispatcher + GameMenu registration)
- TypeScript compilation: PASSED (no errors)
