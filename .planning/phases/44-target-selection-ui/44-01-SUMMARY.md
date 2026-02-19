---
phase: 44-target-selection-ui
plan: "01"
subsystem: target-highlight
tags: [combat, ux, phaser, rendering]
dependency_graph:
  requires: [43-01, 43-02]
  provides: [target-highlight-visual]
  affects: [WorldScene, combatStore]
tech_stack:
  added: []
  patterns: [class-encapsulation, zustand-subscribe, phaser-graphics-tween]
key_files:
  created:
    - apps/web/src/game/rendering/TargetHighlight.ts
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
decisions:
  - "Isometric ellipse ring (50x25px) chosen over circle for proper perspective in iso view"
  - "Behavior-to-rarity color mapping: herbivore=common, omnivore=rare, predator=epic, maniac=legendary"
  - "Tween drives a dummy object {t:0->1} to avoid getValue() returning NaN on graphics objects"
  - "Fade-out on despawn uses separate tween after clearing tween reference to avoid null race"
  - "combatStore.subscribe used in WorldScene.create() to bridge store state and Phaser rendering"
  - "Pre-existing lint infrastructure failure (no ESLint config) - not related to plan changes"
metrics:
  duration: "~2.5 min"
  completed: "2026-02-19"
  tasks: 2
  files: 2
---

# Phase 44 Plan 01: Target Highlight Visual Summary

**One-liner:** Pulsing isometric ellipse highlight colored by creature behavior-to-rarity tier mapping, with fade-out on death and auto-target on aggro.

## What Was Built

A `TargetHighlight` class manages the visual feedback for targeted entities:
- Draws a pulsing isometric ellipse ring beneath the target creature
- Color matches rarity tier: common (gray), rare (blue), epic (purple), legendary (gold)
- Mapped from creature behavior: herbivore → common, omnivore → rare, predator → epic, maniac → legendary
- Pulse animation: 800ms sine cycle, scale 1.0-1.2, alpha 0.8-0.4
- Instant switch when clicking a different target
- Fade-out over 500ms on creature despawn/death
- Immediate clear on ground click or combat end

Integration in `WorldScene.ts`:
- Replaces old `showSelectionIndicator`/`hideSelectionIndicator`/`updateSelectionIndicator` system
- Subscribes to `combatStore` to auto-target first creature that aggros the player
- Updates highlight position during entity movement tweens
- Clears on ground click via pointerup handler
- Properly destroyed in `shutdown()`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 5a749f4 | feat(44-01): create TargetHighlight class |
| Task 2 | f688b93 | feat(44-01): integrate TargetHighlight with WorldScene and combatStore |

## Deviations from Plan

### Pre-existing Issue (Not Fixed)

**[Pre-existing] Lint infrastructure failure**
- **Found during:** Task 2 verification
- **Issue:** No ESLint configuration found anywhere in the project - `pnpm lint` was already failing before these changes
- **Decision:** Not a deviation caused by this plan; documented but not fixed (would require Rule 4 architectural decision about ESLint setup)

None related to plan tasks — plan executed as written.

## Success Criteria Verification

- TARG-01: Targeted entity shows visual highlight (pulsing ring) - YES
- TARG-02: Highlight persists while in combat - YES (combatStore subscription)
- TARG-03: Highlight clears when combat ends - YES (subscribe handler clears on null targetEntityId)
- TARG-04: Clicking different creature switches target instantly - YES (show() calls hide() first)
- Color matches behavior->rarity tier - YES
- Slow pulse animation - YES (800ms cycle)
- ~0.5s fade on death - YES (fadeOut=true in despawnEntity)
- Click ground clears target - YES (pointerup handler)
- Auto-target first aggressor - YES (combatStore subscribe in create())

## Self-Check: PASSED

- FOUND: apps/web/src/game/rendering/TargetHighlight.ts
- FOUND: commit 5a749f4 (TargetHighlight class)
- FOUND: commit f688b93 (WorldScene integration)
- TypeScript: 0 errors (npx tsc --noEmit passed)
