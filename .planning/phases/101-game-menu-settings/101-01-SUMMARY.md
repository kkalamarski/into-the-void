---
phase: 101-game-menu-settings
plan: "01"
subsystem: web-ui
tags: [game-menu, zustand, audio, settings, react-portal, css]
dependency_graph:
  requires: []
  provides: [useUiSettingsStore, GameMenu]
  affects: [apps/web/src/store, apps/web/src/ui/modals]
tech_stack:
  added: []
  patterns: [zustand-persist, react-portal, compound-state-toggle]
key_files:
  created:
    - apps/web/src/store/uiSettingsStore.ts
    - apps/web/src/ui/modals/GameMenu.tsx
    - apps/web/src/ui/modals/GameMenu.css
  modified: []
decisions:
  - "Mute toggle uses useRef to persist pre-mute values across renders without re-persisting to localStorage"
  - "GameMenu renders via createPortal to document.body to escape .game-ui stacking context"
  - "Leave Game does not call logout — only disconnects WebSocket and navigates to /character-select"
  - "Toggle switch implemented as styled checkbox input for accessibility"
metrics:
  duration: "~8 min"
  completed_date: "2026-02-26"
  tasks_completed: 2
  files_changed: 3
---

# Phase 101 Plan 01: UI Settings Store and GameMenu Component Summary

GameMenu Portal overlay and Zustand UI settings store with audio sliders, mute toggles, secondary-bar toggle, tab navigation, and Leave Game confirmation.

## What Was Built

### useUiSettingsStore (`apps/web/src/store/uiSettingsStore.ts`)
Zustand store using `persist` middleware with `partialize` to store only `showSecondaryBar` boolean to localStorage under key `'ui-settings'`. Defaults to `true`. Follows exact pattern of `useAudioStore`.

### GameMenu component (`apps/web/src/ui/modals/GameMenu.tsx`)
Full overlay component rendered via `createPortal` to `document.body`:
- **Dark backdrop** at z-index 10000 with `pointer-events: all` — blocks game canvas interaction
- **Tab navigation** between Settings and About using `useState<'settings' | 'about'>`
- **Audio section:** 4 sliders (Master, Music, Effects, Ambient) — each wired to `useAudioStore` getter/setter with live `onChange` updates; per-channel mute button using `useRef<Record>` to save and restore pre-mute values
- **Interface section:** Secondary Action Bar toggle wired to `useUiSettingsStore.setShowSecondaryBar`
- **About tab:** Game title, version v1.21, description, faction list
- **Leave Game flow:** `useState(false)` for `confirming`; on confirm calls `gameSocket.disconnect()` then `navigate('/character-select')`; no auth store logout
- **Close:** X button and backdrop click both call `onClose` prop

### GameMenu.css (`apps/web/src/ui/modals/GameMenu.css`)
Dark-themed styles using existing CSS variables (`--color-bg-panel`, `--color-border`, `--color-text`, `--color-accent`, etc.):
- Range slider styled with accent-color thumb and animated scale hover
- Pill toggle switch with animated slider for Secondary Action Bar
- Mute button with active/muted state visual distinction
- Responsive: 60% width (max 700px) → 90% on screens under 768px

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `apps/web/src/store/uiSettingsStore.ts` exists — FOUND
- [x] `apps/web/src/ui/modals/GameMenu.tsx` exists — FOUND
- [x] `apps/web/src/ui/modals/GameMenu.css` exists — FOUND
- [x] TypeScript: `npx tsc --noEmit` — no errors
- [x] Commit 80250d4: feat(101-01): create useUiSettingsStore
- [x] Commit e21dd07: feat(101-01): build GameMenu component and CSS

## Self-Check: PASSED
