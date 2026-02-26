---
phase: 101-game-menu-settings
plan: "02"
subsystem: web-ui
tags: [game-menu, hud, esc-key, action-bar, settings]
dependency_graph:
  requires: [101-01]
  provides: [game-menu-integration, esc-toggle, secondary-bar-gating]
  affects: [apps/web/src/ui/GameUI.tsx, apps/web/src/ui/hud/HUD.tsx, apps/web/src/ui/hud/GameShortcuts.tsx, apps/web/src/ui/hud/ActionBar.tsx]
tech_stack:
  added: []
  patterns: [capture-phase-keydown, zustand-store-gating, optional-prop-forwarding]
key_files:
  created: []
  modified:
    - apps/web/src/ui/GameUI.tsx
    - apps/web/src/ui/hud/HUD.tsx
    - apps/web/src/ui/hud/GameShortcuts.tsx
    - apps/web/src/ui/hud/ActionBar.tsx
decisions:
  - "ESC handler uses { capture: true } + stopPropagation() to prevent Phaser dual-fire"
  - "useUiSettingsStore called unconditionally in ActionBar before early return (React hooks rules)"
  - "onMenuOpen prop is optional on HUD and GameShortcuts to avoid breaking existing call sites"
metrics:
  duration: "~5 min"
  completed: "2026-02-26T14:26:56Z"
  tasks_completed: 3
  files_modified: 4
---

# Phase 101 Plan 02: GameMenu Integration Summary

**One-liner:** ESC capture-phase toggle and HUD Menu button wired to GameMenu; secondary ActionBar gated by uiSettingsStore.showSecondaryBar.

## What Was Built

- **GameUI.tsx**: Added `isMenuOpen` state, capture-phase ESC keydown listener (stopPropagation + preventDefault to block Phaser), conditional `<GameMenu onClose=...>` render outside DndContext, forwarded `onMenuOpen` to HUD.
- **HUD.tsx**: Updated to accept optional `onMenuOpen?: () => void` prop and forward it to `<GameShortcuts>`.
- **GameShortcuts.tsx**: Added `GameShortcutsProps` interface with optional `onMenuOpen`; added hamburger Menu button (`&#9776;`) as last shortcut button.
- **ActionBar.tsx**: Imported `useUiSettingsStore`; reads `showSecondaryBar` unconditionally; returns `null` early when `barIndex === 1 && !showSecondaryBar`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 9cd4b10 | feat(101-02): wire ESC listener and GameMenu rendering, add gear button to GameShortcuts |
| 2    | 884fcb6 | feat(101-02): gate secondary ActionBar on useUiSettingsStore.showSecondaryBar |
| 3    | (tsc clean, no separate commit) | Zero TypeScript errors confirmed |

## Verification

- `grep -q "isMenuOpen" GameUI.tsx` — PASS
- `grep -q "GameMenu" GameUI.tsx` — PASS
- `grep -q "onMenuOpen" GameShortcuts.tsx` — PASS
- `grep -q "onMenuOpen" HUD.tsx` — PASS
- `grep -q "useUiSettingsStore" ActionBar.tsx` — PASS
- `grep -q "showSecondaryBar" ActionBar.tsx` — PASS
- `npx tsc --noEmit --project apps/web/tsconfig.json` — 0 errors

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- apps/web/src/ui/GameUI.tsx — modified and committed (9cd4b10)
- apps/web/src/ui/hud/HUD.tsx — modified and committed (9cd4b10)
- apps/web/src/ui/hud/GameShortcuts.tsx — modified and committed (9cd4b10)
- apps/web/src/ui/hud/ActionBar.tsx — modified and committed (884fcb6)
