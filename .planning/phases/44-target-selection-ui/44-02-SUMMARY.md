---
phase: 44-target-selection-ui
plan: "02"
subsystem: ui/hud
tags: [react, hud, combat, target-frame, perception-gating]
dependency_graph:
  requires:
    - combatStore.targetEntityId
    - entityStore.entities (Creature type)
    - statsStore.stats.total.perception
    - gameSocket combat:damage event
  provides:
    - TargetFrame component (top-center target info HUD)
  affects:
    - apps/web/src/ui/hud/HUD.tsx
tech_stack:
  added: []
  patterns:
    - Socket event listener in useEffect with cleanup
    - Zustand store selectors for reactive entity/stats data
    - Perception gating via stats.total.perception * 3 threshold
key_files:
  created:
    - apps/web/src/ui/hud/TargetFrame.tsx
    - apps/web/src/ui/hud/TargetFrame.css
  modified:
    - apps/web/src/ui/hud/HUD.tsx
decisions:
  - "Top-center fixed position (user decision, classic MMO style)"
  - "Health bar shows numeric values (health / maxHealth) per user decision"
  - "Perception gating: creature.level > perception*3 shows '???' for name and '??' for level"
  - "Damage flash: 200ms red glow via box-shadow on combat:damage socket event"
  - "Behavior-to-color mapping reuses RARITY_COLORS: herbivore=common, omnivore=rare, predator=epic, maniac=legendary"
metrics:
  duration: "1min 10sec"
  completed: "2026-02-19"
  tasks: 2
  files: 3
---

# Phase 44 Plan 02: Target Frame HUD Component Summary

**One-liner:** Classic MMO top-center target frame with behavior-colored name, numeric health bar, level badge, perception gating, and 200ms red damage flash.

## What Was Built

Created `TargetFrame.tsx` and `TargetFrame.css` for the target information HUD panel, then integrated it into `HUD.tsx`.

The component reads `targetEntityId` from `combatStore`. When set and pointing to a creature entity, it renders at the top-center of the screen with:

- **Header:** Level badge (background = behavior color) + creature name (text = behavior color), separated by a colored border
- **Health bar:** Green gradient bar with `health / maxHealth` text overlay, smooth 0.2s width transition
- **Damage flash:** Listens to `combat:damage` socket events; if `data.defenderId === targetEntityId`, applies a 200ms red glow via `box-shadow`
- **Perception gating:** If `creature.level > stats.total.perception * 3`, replaces name with `???` and level with `??`
- **Auto-hides:** Returns null when `targetEntityId` is null or entity is not a creature

Behavior-to-rarity color mapping:
- `herbivore` → `#9d9d9d` (common/gray)
- `omnivore` → `#0070dd` (rare/blue)
- `predator` → `#a335ee` (epic/purple)
- `maniac` → `#e6cc80` (legendary/gold)

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create TargetFrame component | 32afc75 | TargetFrame.tsx, TargetFrame.css |
| 2 | Integrate TargetFrame into HUD | 07494dc | HUD.tsx |

## Verification

- TypeScript: `npx tsc --noEmit -p apps/web/tsconfig.json` passed with no errors
- All required files created and committed
- HUD.tsx imports `{ TargetFrame }` and renders `<TargetFrame />` before minimap

## Deviations from Plan

None - plan executed exactly as written.

Minor improvement over plan spec: added `Math.max(0, Math.min(100, ...))` clamp on `healthPercent` to prevent rendering artifacts if health values are out of bounds.

## Self-Check: PASSED

- FOUND: apps/web/src/ui/hud/TargetFrame.tsx
- FOUND: apps/web/src/ui/hud/TargetFrame.css
- FOUND: apps/web/src/ui/hud/HUD.tsx
- FOUND: commit 32afc75 (TargetFrame component)
- FOUND: commit 07494dc (HUD integration)
