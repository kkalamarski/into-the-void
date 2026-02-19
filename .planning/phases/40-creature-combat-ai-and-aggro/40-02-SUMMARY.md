---
phase: 40-creature-combat-ai-and-aggro
plan: "02"
subsystem: combat
tags: [creature-combat, aggro, player-damage, combat-session, ai-wiring]
dependency_graph:
  requires: [creature-combat-foundation, fsm-combat-states, aggro-detection]
  provides: [creature-player-combat, creature-attack-tick, omnivore-provocation]
  affects: [game-server/combat-service, game-server/ai-service, game-server/player-service]
tech_stack:
  added: []
  patterns: [creature-combat-session, haste-gated-attack, zone-broadcast]
key_files:
  created: []
  modified:
    - apps/game-server/src/game/combat.service.ts
    - apps/game-server/src/game/player.service.ts
    - apps/game-server/src/game/ai.service.ts
decisions:
  - "creatureAttackTick skips (returns null) when player is out of range rather than stopping combat — creature will continue chasing via FSM"
  - "processCreatureCombatTick emits combat:damage to both player socket and zone — player gets direct notification; others see the attack"
  - "provokeCreature called before creating player combat session in startCombat — ensures omnivore provoked flag is set even if session creation fails"
metrics:
  duration: "~2.5 minutes"
  completed: "2026-02-19"
  tasks: 3
  files: 3
---

# Phase 40 Plan 02: Creature Attack Logic and AiService Wiring Summary

Added creature->player combat to CombatService with Haste-gated attack ticks, omnivore provocation on player attack, and wired AiService to start/stop creature combat sessions and emit combat:damage events.

## What Was Built

### Task 1: Creature combat session tracking and attack logic in CombatService (4b529bd)

Added to `apps/game-server/src/game/combat.service.ts`:

- `CreatureCombatSession` interface: `creatureId`, `targetPlayerId`, `zoneId`, `startedAt`, `lastAttackAt`
- `creatureSessions: Map<string, CreatureCombatSession>` indexed by creatureId
- `startCreatureCombat(creatureId, targetPlayerId, zoneId)`: creates session with `lastAttackAt=0` for immediate first attack, emits `combat:start` to target player socket
- `stopCreatureCombat(creatureId)` and `getCreatureSession(creatureId)` helpers
- `creatureAttackTick(session, creature)`: computes creature stats from level, gates on Haste-derived interval, checks Chebyshev range <= 1, calculates damage (creature Power vs player Toughness), calls `playerService.updateHealth()`, stops session on player death
- `processCreatureCombatTick(zoneId, creatures)`: batch processes all creature sessions in zone
- `provokeCreature(zoneId, creatureId)`: sets `provoked=true` via ZonesService
- Updated `startCombat`: calls `provokeCreature` when player attacks omnivore (AGGR-02)
- Updated `handleDisconnect`: cleans up creature sessions targeting disconnected player

### Task 2: updateHealth method in PlayerService (a7ae197)

Added to `apps/game-server/src/game/player.service.ts`:

- `updateHealth(playerId, health)`: updates in-memory player health, called by `creatureAttackTick` when creature deals damage to player

### Task 3: Wire AiService to FSM aggro and attack intents (321ba52)

Updated `apps/game-server/src/game/ai.service.ts` `runZoneTick`:

- On `result.aggroTarget`: calls `combatService.startCreatureCombat()` and updates `combatTarget` on creature entity
- On `result.shouldReturn` with `combatTarget`: calls `combatService.stopCreatureCombat()` and clears `combatTarget`/`provoked` on creature entity
- Added `processCreatureCombatTick(zoneId, creatures)` call after player combat tick
- Emits `combat:damage` to targeted player socket directly + broadcasts to zone room

## Verification

1. `pnpm build` passes for all 10 projects
2. CombatService has `creatureSessions` Map and full creature combat API
3. `startCreatureCombat` creates session and emits `combat:start` to player
4. `creatureAttackTick` calculates damage using creature stats, updates player health
5. Omnivores have `provoked=true` set when player attacks them
6. AiService acts on `aggroTarget` by calling `startCreatureCombat`
7. AiService acts on `shouldReturn` by calling `stopCreatureCombat` and clearing creature state
8. Creature combat damage events emitted to player and zone

## Deviations from Plan

None - plan executed exactly as written.

Note: The AiService already contained partial aggro wiring for `aggroTarget` and `shouldReturn` (added in a prior execution attempt), so Task 3 only needed to add the missing `processCreatureCombatTick` call and creature damage emission loop. The existing partial wiring was correct per the plan spec.

## Self-Check: PASSED

Files confirmed present:
- apps/game-server/src/game/combat.service.ts — FOUND, contains startCreatureCombat, creatureAttackTick, processCreatureCombatTick
- apps/game-server/src/game/player.service.ts — FOUND, contains updateHealth
- apps/game-server/src/game/ai.service.ts — FOUND, contains processCreatureCombatTick call

Commits confirmed:
- 4b529bd — feat(40-02): add creature combat session tracking and attack logic to CombatService
- a7ae197 — feat(40-02): add updateHealth method to PlayerService
- 321ba52 — feat(40-02): wire AiService to handle FSM aggro and attack intents
