---
phase: 40-creature-combat-ai-and-aggro
plan: "01"
subsystem: ai
tags: [creature-ai, fsm, aggro, combat, types]
dependency_graph:
  requires: []
  provides: [creature-combat-foundation, fsm-combat-states, aggro-detection]
  affects: [game-logic/creature-ai, shared-types/entity, game-server/zones-service]
tech_stack:
  added: []
  patterns: [fsm-state-machine, pure-function-ai, chebyshev-distance]
key_files:
  created: []
  modified:
    - packages/shared-types/src/core/entity.ts
    - packages/game-logic/src/ai/creature-ai.ts
    - apps/game-server/src/zones/zones.service.ts
decisions:
  - "AGGRO_RADIUS=5 and LEASH_DISTANCE=10 as top-level constants in creature-ai.ts — matches plan spec, consistent with FLEE_RADIUS=5 for herbivores"
  - "moveToward() uses 3-attempt fallback (diagonal, x-only, y-only) — simpler than flee's 5-attempt; chasing does not need backtrack fallback"
  - "tickOmnivore() delegates entirely to tickPredator() when provoked — avoids duplicating predator logic"
metrics:
  duration: "~2.5 minutes"
  completed: "2026-02-19"
  tasks: 3
  files: 3
---

# Phase 40 Plan 01: Creature Combat AI Foundation Summary

Extended Creature type with spawn tracking fields and upgraded tickCreatureAI FSM to include combat states with AGGRO_RADIUS=5 aggro detection and LEASH_DISTANCE=10 leash logic for predator/maniac behaviors.

## What Was Built

### Task 1: Creature interface extension (3db8547)

Added three optional fields to the `Creature` interface in `packages/shared-types/src/core/entity.ts`:

- `spawnPosition?: { x: number; y: number }` — original spawn coordinates for leash distance calculation
- `combatTarget?: string` — playerId this creature is currently targeting in combat
- `provoked?: boolean` — for omnivores: set to true when attacked, triggering retaliation

### Task 2: spawnPosition initialization (f88858a)

In `apps/game-server/src/zones/zones.service.ts`, `createEntityFromSpawn()` now sets `spawnPosition: { x: spawn.x, y: spawn.y }` on every created Creature entity, ensuring all spawned creatures have their spawn point recorded for leash calculation.

### Task 3: Extended FSM with combat states (ac82cf6)

Rewrote `packages/game-logic/src/ai/creature-ai.ts` with:

- `AiTickResult` extended with `aggroTarget?`, `shouldAttack?`, `shouldReturn?` fields
- `AGGRO_RADIUS = 5` and `LEASH_DISTANCE = 10` constants
- `tickPredator()`: checks leash first (returns `shouldReturn`), chases `combatTarget` (returns `shouldAttack` when adjacent), scans for players within AGGRO_RADIUS (returns `aggroTarget`), wanders when idle
- `tickOmnivore()`: delegates to `tickPredator()` when `provoked`, otherwise wanders
- `moveToward()`: directional movement helper with 3-attempt collision fallbacks
- Predator/maniac cases wired to `tickPredator()`, omnivore to `tickOmnivore()`
- Herbivore behavior unchanged

## Verification

- `pnpm build` passes for all 10 projects
- 12 existing game-logic tests pass (damage + char-stats)
- Creature interface includes all three new optional fields
- ZonesService.createEntityFromSpawn sets spawnPosition on creatures
- FSM returns aggroTarget for predators within 5 tiles, shouldAttack when adjacent, shouldReturn when exceeding leash

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files confirmed present:
- packages/shared-types/src/core/entity.ts — FOUND, contains spawnPosition
- packages/game-logic/src/ai/creature-ai.ts — FOUND, exports tickCreatureAI and AiTickResult
- apps/game-server/src/zones/zones.service.ts — FOUND, contains spawnPosition

Commits confirmed:
- 3db8547 — feat(40-01): add spawnPosition, combatTarget, provoked to Creature interface
- f88858a — feat(40-01): set spawnPosition in createEntityFromSpawn
- ac82cf6 — feat(40-01): extend tickCreatureAI FSM with combat states and aggro detection
