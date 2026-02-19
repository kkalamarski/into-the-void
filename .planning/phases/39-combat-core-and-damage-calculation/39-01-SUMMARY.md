---
phase: 39-combat-core-and-damage-calculation
plan: 01
subsystem: api
tags: [websocket, combat, nestjs, socket.io, game-logic]

# Dependency graph
requires:
  - phase: 38-perception-gating-and-client-polish
    provides: canInteract, canInteractLevel from game-logic; EntityService for creature access
  - phase: 35-loot-and-interaction
    provides: InventoryService.getInventory(), ItemRegistry, tool type definitions

provides:
  - CombatService with startCombat(), stopCombat(), getSession(), getAllSessions(), handleDisconnect()
  - combat:start client event type with { targetEntityId: string } payload
  - combat:start WebSocket handler in GameGateway with full validation chain
  - In-memory CombatSession tracking per player (sessions Map)

affects:
  - 39-02-auto-attack-loop
  - 39-03-creature-aggro-fsm
  - 39-04-player-death-respawn

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CombatSession: in-memory Map indexed by playerId, managed by CombatService
    - Combat validation chain: tool type check -> creature target check -> range check -> level gate (INTR-07)
    - Disconnect cleanup: combatService.handleDisconnect() called before playerService.handleDisconnect()

key-files:
  created:
    - apps/game-server/src/game/combat.service.ts
  modified:
    - packages/shared-types/src/network/events.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/game-server/src/game/game.module.ts

key-decisions:
  - "CombatSession stored in-memory Map (not DB) — sessions do not survive server restart; acceptable for real-time combat loop"
  - "combat:start emits CombatState shape with empty participants[] — participants populated in Plan 02 when auto-attack loop runs"
  - "stopCombat() calls setInCombat(false) — single source of truth for inCombat flag; gateway disconnect path calls combatService first"

patterns-established:
  - "Combat validation order: tool equipped -> tool is combat type -> entity exists -> entity is creature -> creature alive -> range -> level gate"
  - "CombatService exported from GameModule for AiService and future damage tick to consume"

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 39 Plan 01: Combat State Infrastructure Summary

**CombatService with in-memory session tracking and combat:start socket event handler validating tool type, range, and level gating before creating CombatSession**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-19T00:06:05Z
- **Completed:** 2026-02-19T00:08:26Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created CombatService (126 lines) with full combat state lifecycle: startCombat(), stopCombat(), getSession(), getAllSessions(), handleDisconnect()
- Added 'combat:start' to ClientEventType and ClientEvents with typed { targetEntityId: string } payload
- Wired @SubscribeMessage('combat:start') handler in GameGateway with validation chain and combat:start emit back to player
- Combat cleanup on player disconnect via combatService.handleDisconnect() before playerService cleanup

## Task Commits

Each task was committed atomically:

1. **Task 1: Add combat:start client event type and CombatStartRequest** - `491d3bb` (feat)
2. **Task 2: Create CombatService with combat state tracking** - `696ddff` (feat)
3. **Task 3: Add combat:start handler to GameGateway** - `aa1f23c` (feat)

## Files Created/Modified
- `apps/game-server/src/game/combat.service.ts` - New service: CombatSession tracking, startCombat validation chain, stopCombat, disconnect cleanup
- `packages/shared-types/src/network/events.ts` - Added 'combat:start' to ClientEventType union and ClientEvents interface
- `apps/game-server/src/game/game.gateway.ts` - Injected CombatService, added @SubscribeMessage handler, added disconnect cleanup
- `apps/game-server/src/game/game.module.ts` - Registered and exported CombatService

## Decisions Made
- CombatSession stored in-memory Map (not DB): sessions do not survive server restart; acceptable for v1.9 real-time combat loop where reconnect starts fresh
- combat:start emit uses CombatState shape with empty participants[]: participants will be populated by auto-attack loop in Plan 02
- combatService.handleDisconnect() called before playerService.handleDisconnect(): ensures combat state cleaned before player is removed from memory

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CombatService ready for Plan 02 (auto-attack loop): getAllSessions() provides active sessions for tick loop, getSession() for per-player lookup
- stopCombat() call point established for Plan 02 to invoke on creature death or range break
- CombatService exported from GameModule, available for AiService injection in Plan 03 (creature aggro FSM)

## Self-Check: PASSED

- apps/game-server/src/game/combat.service.ts: FOUND
- .planning/phases/39-combat-core-and-damage-calculation/39-01-SUMMARY.md: FOUND
- Commit 491d3bb (Task 1): FOUND
- Commit 696ddff (Task 2): FOUND
- Commit aa1f23c (Task 3): FOUND

---
*Phase: 39-combat-core-and-damage-calculation*
*Completed: 2026-02-19*
