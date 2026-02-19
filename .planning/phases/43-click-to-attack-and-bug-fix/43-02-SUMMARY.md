---
phase: 43-click-to-attack-and-bug-fix
plan: 02
subsystem: game-server/ai
tags: [bug-fix, aggro, combat, creature-ai]
dependency_graph:
  requires: []
  provides: [immediate-aggro-on-zone-activation, immediate-aggro-on-player-join, immediate-aggro-on-respawn]
  affects: [ai.service.ts, game.gateway.ts, zones.service.ts]
tech_stack:
  added: []
  patterns: [setter-injection-for-circular-dep-avoidance, optional-interface-pattern]
key_files:
  created: []
  modified:
    - apps/game-server/src/game/ai.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/game-server/src/zones/zones.service.ts
decisions:
  - "Used AggroChecker interface + setter in ZonesService to call AiService.checkCreatureAggro without circular module dependency"
  - "checkImmediateAggro called synchronously (fire-and-forget) on activateZone to not delay tick scheduling"
  - "checkImmediateAggroForPlayer is player-scoped scan for efficiency when zone is already active"
metrics:
  duration: 3min
  completed_date: 2026-02-19
  tasks: 3
  files: 3
---

# Phase 43 Plan 02: Predator/Maniac Aggro Bug Fix Summary

Immediate aggro for predator/maniac creatures on zone load, player join, and creature respawn — eliminating the 1-second delay before first aggro check.

## Objective

Fix FIX-01: predators and maniacs within 5 tiles of a player were not aggroing until the first 1-second AI tick fired. This created a visible delay window where creatures appeared passive on zone entry.

## What Was Built

### Task 1: Immediate Aggro on Zone Activation

Added `checkImmediateAggro(zoneId)` to `AiService`:
- Scans all predator/maniac creatures in the zone not already in combat
- For each creature, finds the closest player within AGGRO_RADIUS (5 tiles, Chebyshev distance)
- Calls `combatService.startCreatureCombat()` and sets `combatTarget` immediately
- `activateZone()` now calls this before scheduling the first tick

Also added `isZoneActive(zoneId)` as a public helper.

### Task 2: Aggro for Player Joining Active Zone

Updated `GameGateway.handleAuth()` and `handleMove()`:
- Before calling `activateZone()`, check if zone is already active via `isZoneActive()`
- If zone was already active, call `checkImmediateAggroForPlayer(zoneId, playerId)` for the new player
- `checkImmediateAggroForPlayer` is a player-scoped scan — more efficient than a full zone scan when only one player joined

### Task 3: Aggro on Creature Respawn

Added `checkCreatureAggro(creature, zoneId)` to `AiService` — per-creature check for respawning entities.

Wired into `ZonesService.processRespawnTick()`:
- Defined `AggroChecker` interface in ZonesService to avoid circular dependency (ZonesModule cannot import GameModule)
- Added `aggroChecker: AggroChecker | null` field and `setAggroChecker()` setter on ZonesService
- `GameGateway.afterInit()` wires `this.zonesService.setAggroChecker(this.aiService)`
- After entity materializes in respawn tick, calls `aggroChecker.checkCreatureAggro(entity, zoneId)` for creature entities

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type error: result.playerId is string | undefined**
- **Found during:** Task 2 implementation, first build
- **Issue:** `result.playerId` in `handleMove` zone-transition branch is typed as `string | undefined` in `MoveResult` interface
- **Fix:** Added `&& result.playerId` guard to the `checkImmediateAggroForPlayer` call
- **Files modified:** `apps/game-server/src/game/game.gateway.ts`
- **Commit:** 3b3a8ee

**2. [Rule 2 - Enhancement] Zone transition in handleMove also needs immediate aggro**
- **Found during:** Task 2 analysis
- **Issue:** Plan only mentioned `handleAuth`, but `handleMove` handles zone-to-zone transitions where same scenario applies
- **Fix:** Added the same `isZoneActive` + `checkImmediateAggroForPlayer` logic to the zone-transition branch of `handleMove`
- **Files modified:** `apps/game-server/src/game/game.gateway.ts`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 6e783fa | feat(43-02): add immediate aggro check on zone activation |
| 2 | 3b3a8ee | feat(43-02): trigger aggro check when player joins active zone |
| 3 | be3b915 | feat(43-02): trigger aggro on creature respawn |

## Self-Check: PASSED

- `apps/game-server/src/game/ai.service.ts` — FOUND (modified)
- `apps/game-server/src/game/game.gateway.ts` — FOUND (modified)
- `apps/game-server/src/zones/zones.service.ts` — FOUND (modified)
- Commit 6e783fa — FOUND
- Commit 3b3a8ee — FOUND
- Commit be3b915 — FOUND
- `pnpm build` — PASSED (TypeScript compilation clean)
