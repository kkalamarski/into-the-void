---
phase: 39-combat-core-and-damage-calculation
plan: 02
subsystem: api
tags: [websocket, combat, nestjs, socket.io, game-logic, damage, auto-attack]

# Dependency graph
requires:
  - phase: 39-01
    provides: CombatService with session tracking, combat:start handler
  - phase: 38-perception-gating-and-client-polish
    provides: canInteract, canInteractLevel from game-logic; EntityService for creature access
  - phase: 35-loot-and-interaction
    provides: InventoryService.getInventory(), ItemRegistry, tool type definitions

provides:
  - CombatService.attackTick(): per-session damage calculation and application
  - CombatService.processCombatTick(): zone-level combat batch processor
  - CombatService.handleCreatureDeath(): loot drop + respawn scheduling on kill
  - CombatService.setServer(): server reference for future broadcast use
  - EntityService.spawnGroundItemsForCombat(): public wrapper for combat loot spawning
  - AiService: processCombatTick() called in runZoneTick() with combat:damage emit
  - combat:damage server event type with full damage payload
  - entity:update (health: 0, active: false) emitted on creature death
  - entity:spawn emitted for each loot item dropped on kill

affects:
  - 39-03-creature-aggro-fsm
  - 39-04-player-death-respawn

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Combat tick: processCombatTick() called inside runZoneTick() — piggybacks on AI zone tick loop
    - Damage formula: calculateDamage() from game-logic with Power vs Toughness via computeCharStats()
    - Creature death: handleCreatureDeath() -> spawnGroundItemsForCombat() + recordEntityKill()
    - Range check on every tick: attackTick() re-validates canInteract() — combat stops if player moves

key-files:
  created: []
  modified:
    - apps/game-server/src/game/combat.service.ts
    - apps/game-server/src/game/ai.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/game-server/src/game/entity.service.ts
    - packages/shared-types/src/network/events.ts

key-decisions:
  - "attackTick() re-validates canInteract() on every tick — combat stops automatically if player moves out of range without explicit stop-combat event"
  - "combatResults emitted inline in runZoneTick() after creature AI batch — no separate combat emit loop or additional tick timer"
  - "CombatService.setServer() wired in GameGateway.afterInit() alongside AiService and ZonesService — consistent server-reference injection pattern"

patterns-established:
  - "Combat tick piggybacks on AI zone tick: processCombatTick() called at end of runZoneTick(), after creature movement batch"
  - "Damage events (combat:damage) are zone-broadcast so all players see floating numbers on creatures"
  - "Creature death emits three events: combat:damage (killed: true), entity:update (health:0 active:false), entity:spawn (for each loot item)"

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 39 Plan 02: Auto-Attack Loop Summary

**Auto-attack loop integrated into AI zone tick: every tick processes all active CombatSessions, deals Power-vs-Toughness damage, stops on kill or range break, emits combat:damage + entity:update + entity:spawn events zone-wide**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-19T11:31:05Z
- **Completed:** 2026-02-19T11:35:02Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `combat:damage` to `ServerEventType` union and `ServerEvents` interface with full damage payload (attackerId, defenderId, damage, defenderHealth, defenderMaxHealth, critical, killed)
- Added `attackTick()` to CombatService: validates range per-tick, computes player stats via `computeCharStats`, computes creature stats, calls `calculateDamage`, applies health change, handles kill
- Added `handleCreatureDeath()` to CombatService: spawns loot via `EntityService.spawnGroundItemsForCombat()`, schedules respawn via `ZonesService.recordEntityKill()` with ±25% variance
- Added `processCombatTick()` to CombatService: filters sessions by zoneId, calls `attackTick()` per session, returns results for broadcasting
- Added `CombatService.setServer()` field and setter for future direct-emit use
- Added `EntityService.spawnGroundItemsForCombat()` public method wrapping private `spawnGroundItems()`
- Updated `AiService.runZoneTick()` to call `combatService.processCombatTick(zoneId)` and emit `combat:damage`, `entity:update`, and `entity:spawn` events per result
- Updated `GameGateway.afterInit()` to call `combatService.setServer(server)`
- Injected `EntityService` into `CombatService` via NestJS DI (already exported from `GameModule`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add combat:damage server event type** - `a1e5bb5` (feat)
2. **Task 2: Add attackTick(), processCombatTick(), and handleCreatureDeath() to CombatService** - `0106742` (feat)
3. **Task 3: Integrate combat tick into AiService and wire server reference in GameGateway** - `432e8ce` (feat)

## Files Created/Modified

- `apps/game-server/src/game/combat.service.ts` - Added EntityService injection, server reference, CombatDamageResult interface, handleCreatureDeath(), attackTick(), processCombatTick()
- `apps/game-server/src/game/ai.service.ts` - Added CombatService injection, processCombatTick() call in runZoneTick(), combat event emission
- `apps/game-server/src/game/game.gateway.ts` - Added combatService.setServer(server) in afterInit()
- `apps/game-server/src/game/entity.service.ts` - Added public spawnGroundItemsForCombat() method
- `packages/shared-types/src/network/events.ts` - Added 'combat:damage' to ServerEventType union and ServerEvents interface

## Decisions Made

- `attackTick()` re-validates `canInteract()` on every tick: combat stops automatically if player moves out of range without explicit stop-combat event — no client-side stop needed for range breaks
- `combatResults` emitted inline in `runZoneTick()` after creature AI batch: no separate combat emit loop or additional tick timer — simplest integration
- `CombatService.setServer()` wired in `GameGateway.afterInit()` alongside `AiService` and `ZonesService`: consistent server-reference injection pattern across all services that emit

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auto-attack loop active: players in CombatSessions will deal damage each tick and see `combat:damage` events
- CombatService ready for Plan 03 (creature aggro FSM): `stopCombat()` and session management unchanged; aggro can create sessions server-side
- Creature death broadcasts `entity:update` with `active: false` — client can hide/despawn creature sprite on receipt

## Self-Check: PASSED

- apps/game-server/src/game/combat.service.ts: FOUND
- apps/game-server/src/game/ai.service.ts: FOUND
- apps/game-server/src/game/game.gateway.ts: FOUND
- apps/game-server/src/game/entity.service.ts: FOUND
- packages/shared-types/src/network/events.ts: FOUND
- .planning/phases/39-combat-core-and-damage-calculation/39-02-SUMMARY.md: FOUND (this file)
- Commit a1e5bb5 (Task 1): FOUND
- Commit 0106742 (Task 2): FOUND
- Commit 432e8ce (Task 3): FOUND

---
*Phase: 39-combat-core-and-damage-calculation*
*Completed: 2026-02-19*
