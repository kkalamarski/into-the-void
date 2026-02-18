---
phase: 32-client-display
plan: 02
subsystem: web-ui
tags: [stats-panel, level-up, ui, phaser, zustand]
dependency_graph:
  requires: ["32-01"]
  provides: ["StatsPanel UI", "LevelUpNotification overlay"]
  affects: ["apps/web/src/ui/GameUI.tsx"]
tech_stack:
  added: []
  patterns: ["draggable panel", "self-managing overlay", "react-icons stat icons"]
key_files:
  created:
    - apps/web/src/ui/panels/StatsPanel.tsx
    - apps/web/src/ui/panels/StatsPanel.css
    - apps/web/src/components/LevelUpNotification.tsx
    - apps/web/src/components/LevelUpNotification.css
  modified:
    - apps/web/src/ui/GameUI.tsx
decisions:
  - "StatsPanel follows EquipmentPanel draggable pattern exactly — same useDraggablePanel hook and Phaser keyboard disable/enable on mount/unmount"
  - "LevelUpNotification manages own visibility via levelUpDeltas from statsStore — mounts unconditionally in GameUI"
  - "breakdown shows (base + equipment) format when equipment != 0, (base) only when equipment is 0"
metrics:
  duration: "2 minutes"
  completed: "2026-02-18"
  tasks: 3
  files: 5
---

# Phase 32 Plan 02: StatsPanel UI and LevelUpNotification Summary

StatsPanel draggable panel with 8 lore-stat rows plus base/equipment breakdown, and self-dismissing LevelUpNotification overlay with CSS fade animation wired into GameUI.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create StatsPanel component with draggable header and stat breakdown | 70a1291 | StatsPanel.tsx, StatsPanel.css |
| 2 | Create LevelUpNotification component with auto-dismiss | 13c8050 | LevelUpNotification.tsx, LevelUpNotification.css |
| 3 | Wire StatsPanel and LevelUpNotification into GameUI | ad936d1 | GameUI.tsx |

## What Was Built

### StatsPanel (apps/web/src/ui/panels/StatsPanel.tsx)
- Draggable panel centered via CSS `top: 50%; left: 50%; translateY(-50%)` and `useDraggablePanel` hook
- Renders all 8 CharacterStats in STAT_DISPLAY_ORDER: Durability, Toughness, Power, Haste, Vigor, Recovery, Perception, Resilience
- Each StatRow shows: react-icons/gi icon, stat label, total value, breakdown `(base + equipment)` or `(base)` when equipment is 0
- Phaser keyboard disabled on mount, re-enabled on unmount — prevents arrow key conflict with panel open
- Close button calls `toggleStats` from gameStore
- Returns null when `stats` is null (before server push)

### LevelUpNotification (apps/web/src/components/LevelUpNotification.tsx)
- Renders only when `levelUpDeltas` is non-null in statsStore
- 3-second auto-dismiss via `setTimeout(() => clearLevelUpDeltas(), 3000)` in useEffect
- Clears timer on cleanup to avoid stale callbacks
- Shows only stats that actually changed (filters `STAT_DISPLAY_ORDER` by `levelUpDeltas[key] !== undefined`)
- CSS `levelup-fade` keyframe: 0% invisible → 15% visible → 75% hold → 100% fade out

### GameUI wiring (apps/web/src/ui/GameUI.tsx)
- Added `showStats` to useGameStore destructure
- `{showStats && <StatsPanel />}` after EquipmentPanel
- `<LevelUpNotification />` unconditionally mounted (self-managing visibility)

## Verification

- Full monorepo build passes (230 modules, up from 226)
- `export const StatsPanel` found at line 52 in StatsPanel.tsx
- `.stats-panel` class found in StatsPanel.css
- `export const LevelUpNotification` found at line 6 in LevelUpNotification.tsx
- `@keyframes levelup-fade` found in LevelUpNotification.css
- `showStats` found in GameUI.tsx destructure (line 24) and conditional render (line 88)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
