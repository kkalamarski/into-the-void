---
phase: 40-creature-combat-ai-and-aggro
plan: "03"
subsystem: ai
tags: [creature-ai, leash, return-to-spawn, combat, fsm]
dependency_graph:
  requires: [40-01, 40-02]
  provides: [leash-return-behavior, combat-zone-guard, creature-combat-state-cleanup]
  affects: [game-logic/creature-ai, game-server/ai-service, game-server/combat-service]
tech_stack:
  added: []
  patterns: [fsm-state-machine, leash-system, chebyshev-distance]
key_files:
  created: []
  modified:
    - packages/game-logic/src/ai/creature-ai.ts
    - apps/game-server/src/game/combat.service.ts
decisions:
  - "Returning state split into two sub-cases: active-combat leash exceeded (shouldReturn + newPosition) and post-combat return (shouldReturn + newPosition until within 1 tile)"
  - "isCreatureInCombat() uses Map.has() check — O(1) lookup, no iteration needed"
  - "Zone change guard placed before timing check in creatureAttackTick — avoids zone/stat computation for stale sessions"
metrics:
  duration: "~3.3 minutes"
  completed: "2026-02-19"
  tasks: 3
  files: 2
---

# Phase 40 Plan 03: Leash System and Combat End Conditions Summary

Full creature leash behavior: FSM returns-to-spawn after leash exceeded, combat ends when player changes zones, and isCreatureInCombat helper added for state inspection.

## What Was Built

### Task 1: Refined returning state in tickPredator FSM (f86d68e)

Updated `packages/game-logic/src/ai/creature-ai.ts` to handle the returning state properly:

- **Spawn arrival check:** When creature is within 1 tile of spawn AND has no combatTarget, resume normal wander behavior instead of perpetually returning
- **Active-combat leash exceeded:** When creature has `combatTarget` AND `distFromSpawn >= LEASH_DISTANCE`, return `shouldReturn: true` with movement toward spawn — AiService clears combat on this signal
- **Post-combat return continuation:** When creature has no `combatTarget` but is more than 1 tile from spawn, continue moving toward spawn — ensures creature walks all the way home after combat ends

The reordering ensures the three cases are evaluated in priority order: arrival check, active-combat leash, post-combat return.

### Task 2: AiService FSM result handling (already complete via 40-02)

The `aggroTarget` and `shouldReturn` handling in `runZoneTick` was implemented in Phase 40-02 (commits `4b529bd`, `321ba52`). No additional changes needed — plan was already satisfied.

### Task 3: Zone change guard and isCreatureInCombat (dcd7dc2)

Updated `apps/game-server/src/game/combat.service.ts`:

- **Zone change guard in `creatureAttackTick`:** After player-not-found check, verify `player.position.zoneId === session.zoneId`. If player changed zones, call `stopCreatureCombat` and return null — prevents ghost attacks across zone boundaries
- **`isCreatureInCombat(creatureId)`:** Simple `Map.has()` helper for O(1) lookup of creature combat state. Useful for state inspection without exposing the full session

## Verification

- `pnpm build` passes for game-logic and game-server
- FSM handles all three returning sub-cases: arrival, active-combat leash, post-combat return
- Combat session stops when player changes zones
- Creature combatTarget and provoked flags are cleared on shouldReturn
- Creature resumes wander behavior after reaching spawn area

## Deviations from Plan

### Auto-noted: Task 2 already implemented by Phase 40-02

**Found during:** Task 2 execution
**Issue:** AiService aggro/leash wiring (`aggroTarget`, `shouldReturn` handling) was already fully implemented in Phase 40-02 commits (`321ba52`) with identical code to what Plan 03 Task 2 specified.
**Resolution:** No changes needed — verified Task 2 requirements already satisfied, proceeded to Task 3.
**Impact:** None — plan's intent fully realized, just via Plan 02 execution.

## Self-Check: PASSED

Files confirmed present:
- packages/game-logic/src/ai/creature-ai.ts — FOUND, contains shouldReturn and spawn arrival check
- apps/game-server/src/game/combat.service.ts — FOUND, contains isCreatureInCombat and zone check

Commits confirmed:
- f86d68e — feat(40-03): refine tickPredator FSM to handle returning state properly
- dcd7dc2 — feat(40-03): add zone change guard and isCreatureInCombat to CombatService
</content>
</invoke>