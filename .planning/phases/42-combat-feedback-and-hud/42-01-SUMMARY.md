---
phase: 42-combat-feedback-and-hud
plan: 01
subsystem: client-rendering
tags: [combat, ui, phaser, damage-numbers, animation]
dependency_graph:
  requires: [39-02-SUMMARY]
  provides: [combat:damage visual feedback, floating damage numbers]
  affects: [EntityRenderer, WorldScene, gameStore]
tech_stack:
  added: []
  patterns: [phaser-tween-animation, socket-event-handler, static-utility-method]
key_files:
  created: []
  modified:
    - apps/web/src/game/rendering/EntityRenderer.ts
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/store/gameStore.ts
decisions:
  - "createFloatingDamage is a static method on EntityRenderer — no instance state needed, callable from WorldScene without a reference"
  - "Type cast to Partial<Entity> in gameStore combat:damage handler — health/maxHealth live on Creature subtype, not Entity base; cast is safe because server only sends this event for creatures"
metrics:
  duration: ~2min
  completed: 2026-02-19
---

# Phase 42 Plan 01: Floating Damage Numbers Summary

Added client-side floating damage number animations triggered by the `combat:damage` socket event.

## What Was Built

**EntityRenderer.createFloatingDamage** — Static Phaser method that spawns animated text above an entity. Red (#ff4444) for local player damage, white (#ffffff) for all other targets. Text floats 80px upward with cubic ease-out while fading to 0 alpha over 1000ms, then self-destructs. Depth 3000 ensures visibility above health bars and UI.

**WorldScene.showDamageNumber** — Public method that resolves a defender ID to a screen position by checking `localPlayer`, `entitySprites`, and `playerSprites` in that order. Falls back gracefully (returns early) if the entity has despawned. Delegates to `EntityRenderer.createFloatingDamage`.

**gameStore combat:damage handler** — Socket listener that receives `{ attackerId, defenderId, damage, defenderHealth, defenderMaxHealth, critical, killed }` events. Determines if the local player was hit, calls `showDamageNumber` with the correct color flag, updates local player health in Zustand store, and updates creature health bars via `worldScene.updateEntity` for NPC targets.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add createFloatingDamage to EntityRenderer | 64edb43 | EntityRenderer.ts |
| 2 | Add showDamageNumber to WorldScene | 3664041 | WorldScene.ts |
| 3 | Add combat:damage handler to gameStore | e9174b8 | gameStore.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type mismatch on updateEntity call**
- **Found during:** Task 3 build verification
- **Issue:** `worldScene.updateEntity(id, { health, maxHealth })` failed with TS2353 — `health` and `maxHealth` exist on `Creature` (which extends `Entity`), but `updateEntity` accepts `Partial<Entity>` and the base `Entity` interface does not declare these fields
- **Fix:** Cast the changes object to `Partial<Entity>` — the cast is safe because the server only emits this for creature defenders; WorldScene's own `updateEntity` implementation already handles the `Creature` subtype internally via its own cast
- **Files modified:** `apps/web/src/store/gameStore.ts`
- **Commit:** e9174b8

## Self-Check: PASSED

Files exist:
- FOUND: apps/web/src/game/rendering/EntityRenderer.ts (createFloatingDamage at line 461)
- FOUND: apps/web/src/game/scenes/WorldScene.ts (showDamageNumber at line 1378)
- FOUND: apps/web/src/store/gameStore.ts (combat:damage at line 374)

Commits exist: 64edb43, 3664041, e9174b8 — all confirmed in git log.
