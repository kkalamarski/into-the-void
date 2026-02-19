---
phase: 45-combat-log
plan: 01
subsystem: hud/combat-log
tags: [hud, combat, zustand, react, socket]
dependency_graph:
  requires: [combatStore, entityStore, gameSocket, gameStore]
  provides: [combatLogStore, CombatLog component, L-key toggle]
  affects: [HUD, gameStore]
tech_stack:
  added: []
  patterns: [zustand-store, socket-event-wiring, useEffect-key-handler, auto-scroll]
key_files:
  created:
    - apps/web/src/store/combatLogStore.ts
    - apps/web/src/ui/hud/CombatLog.tsx
    - apps/web/src/ui/hud/CombatLog.css
  modified:
    - apps/web/src/store/gameStore.ts
    - apps/web/src/ui/hud/HUD.tsx
decisions:
  - HUD hooks restructured to appear before early return (if !player) to comply with React Rules of Hooks
  - combatLogStore.visible synced from gameStore.showCombatLog via useEffect in HUD rather than directly toggling combatLogStore — single source of truth in gameStore
  - lint pre-existing infrastructure failure (no ESLint config found) — not introduced by this plan
metrics:
  duration: 3min
  completed: 2026-02-19
  tasks_completed: 3
  files_created: 3
  files_modified: 2
---

# Phase 45 Plan 01: Combat Log Summary

Scrollable combat log HUD panel with timestamped damage dealt/received entries, yellow critical hit highlights, green kill indicators, and L-key toggle visibility.

## What Was Built

### combatLogStore.ts
- `CombatLogEntry` interface: `id`, `timestamp`, `type` (dealt/received), `damage`, `targetName`, `critical`, `killed`
- `useCombatLogStore` with `entries[]`, `visible`, `maxEntries=100`, `addEntry`, `toggleVisible`, `clearLog`
- `formatCombatTimestamp(timestamp)` helper: formats Unix ms as `[MM:SS]`
- Socket wiring: `gameSocket.on('combat:damage')` classifies events as dealt (attackerId === player) or received (defenderId === player), looks up entity name from entityStore

### CombatLog.tsx
- Renders scrollable panel; returns null when `visible=false`
- Auto-scroll to bottom via `useEffect` on `entries.length` change
- Empty state: "No combat activity" (italic)
- Dealt entries: white text — "Hit [Target] for [X] damage (killed)"
- Received entries: red-tinted — "[Target] hit you for [X] damage"
- Critical hits: damage value in yellow with glow (`#ffcc00`, `text-shadow`)
- Kill indicator: "(killed)" in green (`#44ff44`)

### CombatLog.css
- Positioned `bottom: 220px; left: 20px` (above action bar)
- `width: 320px; max-height: 200px`, dark semi-transparent background
- Custom webkit scrollbar (6px, accent color on hover)
- Header with "COMBAT LOG" title and `[L] to toggle` hint

### gameStore.ts changes
- Added `showCombatLog: boolean` (default `true`) and `toggleCombatLog` action

### HUD.tsx changes
- All hooks moved before `if (!player) return null` (React Rules of Hooks compliance)
- `useEffect` syncs `showCombatLog` -> `combatLogStore.setState({ visible })`
- `useEffect` listens for `keydown` L key (guards against input/textarea focus)
- `<CombatLog />` rendered between player info block and action bar

## Success Criteria Verification

- CLOG-01: Damage dealt by player appears with timestamp and amount — combatLogStore wires `combat:damage` for `attackerId === player.id`
- CLOG-02: Damage received appears with timestamp and amount — wired for `defenderId === player.id`
- CLOG-03: `[MM:SS]` format via `formatCombatTimestamp`
- CLOG-04: Scrollable with auto-scroll; `maxEntries=100` cap
- CLOG-05: L key toggles `showCombatLog` in gameStore, synced to combatLogStore.visible

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] React Rules of Hooks violation in HUD.tsx**
- **Found during:** Task 3
- **Issue:** Plan placed `useEffect` calls after `if (!player) return null` early return. React requires hooks to always be called in the same order before any conditional returns.
- **Fix:** Restructured HUD.tsx so all hooks (biome state, biome useEffect, combatLog sync useEffect, L key useEffect) appear before the `if (!player) return null` guard.
- **Files modified:** `apps/web/src/ui/hud/HUD.tsx`
- **Commit:** 005e206

## Self-Check: PASSED

All created files verified on disk:
- FOUND: apps/web/src/store/combatLogStore.ts
- FOUND: apps/web/src/ui/hud/CombatLog.tsx
- FOUND: apps/web/src/ui/hud/CombatLog.css
- FOUND: apps/web/src/store/gameStore.ts (modified)
- FOUND: apps/web/src/ui/hud/HUD.tsx (modified)

All commits verified:
- FOUND: 6e544bd — feat(45-01): create combatLogStore with damage event wiring
- FOUND: 8694539 — feat(45-01): create CombatLog component with auto-scroll and styling
- FOUND: 005e206 — feat(45-01): wire L key toggle and integrate CombatLog into HUD
