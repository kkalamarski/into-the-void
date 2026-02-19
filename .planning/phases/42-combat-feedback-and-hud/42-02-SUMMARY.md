---
phase: 42-combat-feedback-and-hud
plan: 02
subsystem: client-hud
tags: [combat, hud, zustand, socket-events, react]
dependency_graph:
  requires:
    - 39-01  # CombatService and combat:start event
    - 41-01  # player:death event
  provides:
    - useCombatStore (inCombat state for HUD and future features)
    - combat indicator HUD element
  affects:
    - apps/web/src/ui/hud/HUD.tsx
    - apps/web/src/network/socket.ts
tech_stack:
  added: []
  patterns:
    - Zustand store for combat state
    - Socket event listeners at module level
key_files:
  created:
    - apps/web/src/store/combatStore.ts
  modified:
    - apps/web/src/ui/hud/HUD.tsx
    - apps/web/src/ui/hud/HUD.css
    - apps/web/src/network/socket.ts
    - apps/web/src/store/gameStore.ts
decisions:
  - combat:start listener checks participants array for player involvement rather than attackerId/defenderId fields — aligns with actual CombatState payload shape from shared-types
  - combat:damage and player:death events added to socket.ts forwarded list as blocking prerequisite for combatStore to function
  - Creature import added to gameStore.ts with explicit Partial<Creature> cast to fix pre-existing type error exposed by forwarding combat:damage
metrics:
  duration: ~3 min
  completed: 2026-02-19
  tasks_completed: 3
  files_changed: 5
---

# Phase 42 Plan 02: In Combat HUD Indicator Summary

Zustand combat store with socket event listeners driving a pulsing red "In Combat" HUD indicator.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create combatStore with combat state tracking | 54ef13a | combatStore.ts, socket.ts, gameStore.ts |
| 2 | Add combat indicator styles to HUD.css | f5fc80a | HUD.css |
| 3 | Add combat indicator to HUD component | 47f24f1 | HUD.tsx |

## What Was Built

`useCombatStore` — a Zustand store that tracks `inCombat` boolean and `targetEntityId`. Listens on four socket events:

- `combat:start` — sets `inCombat=true`, finds opponent from `participants[]` array
- `player:death` — clears combat when local player dies
- `entity:update` — clears combat when tracked entity becomes inactive (leash/despawn)
- `combat:damage` — sets `targetEntityId` on first damage if unknown; clears combat on `killed=true`

The HUD renders a red pulsing badge in the top-right corner when `inCombat` is true, using `GiCrossedSwords` icon and "In Combat" text.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] combat:damage and player:death not forwarded in socket.ts**
- **Found during:** Task 1
- **Issue:** `socket.ts` forwarded event list was missing `combat:damage`, `player:death`, and `player:respawn`, making `combatStore` socket listeners no-ops
- **Fix:** Added three events to the forwarded list in `GameSocket.connect()`
- **Files modified:** `apps/web/src/network/socket.ts`
- **Commit:** 54ef13a

**2. [Rule 1 - Bug] TypeScript error in gameStore.ts combat:damage handler**
- **Found during:** Task 1 (build verification)
- **Issue:** Object literal `{ health, maxHealth }` passed as `Partial<Entity>` — these fields exist only on `Creature`, not base `Entity`
- **Fix:** Added `Creature` import to gameStore.ts; built explicit `Partial<Creature>` typed variable before passing to `updateEntity()`
- **Files modified:** `apps/web/src/store/gameStore.ts`
- **Commit:** 54ef13a

**3. [Rule 1 - Bug] combat:start listener used wrong payload field access**
- **Found during:** Task 1 planning
- **Issue:** Plan code used `data.attackerId`/`data.defenderId` — but actual `CombatState` payload uses `participants[]` array, not those fields
- **Fix:** Listener checks `data.currentActorId === currentPlayer.id` OR `data.participants.some(p => p.id === currentPlayer.id)` and finds opponent from `participants.find(p => p.id !== currentPlayer.id)`
- **Files modified:** `apps/web/src/store/combatStore.ts`
- **Commit:** 54ef13a

## Self-Check: PASSED

- FOUND: apps/web/src/store/combatStore.ts
- FOUND: apps/web/src/ui/hud/HUD.tsx
- FOUND: apps/web/src/ui/hud/HUD.css
- FOUND commit: 54ef13a (combatStore + socket fixes)
- FOUND commit: f5fc80a (HUD.css styles)
- FOUND commit: 47f24f1 (HUD component)
