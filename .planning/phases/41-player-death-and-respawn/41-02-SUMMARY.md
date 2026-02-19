---
phase: 41-player-death-and-respawn
plan: "02"
subsystem: combat
tags: [combat, death, respawn, player, socket, events, timer, faction-hub]

# Dependency graph
requires:
  - phase: 41-01-player-death-and-respawn
    provides: Player.isDead field, player:death/player:respawn event types, setDead() and getFactionRespawnPosition()
provides:
  - PlayerService.scheduleRespawn() with 3-second timer and faction hub teleport
  - PlayerService.setServer() and respawnPlayer() private method
  - CombatService wired to call scheduleRespawn() on player death
  - Client player:death handler (death message + movement disable + sprite removal)
  - Client player:respawn handler (respawn message + position update + WorldScene re-enable)
  - WorldScene handlePlayerDeath() and handlePlayerRespawn() methods
  - isDead movement guard in WorldScene.handleInput()
affects:
  - 41-03 (if any follow-on: full death-respawn cycle is now complete)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Respawn timer stored in Map<string, ReturnType<typeof setTimeout>> — prevents duplicate timers per player
    - Server reference injected into PlayerService via setServer() pattern consistent with AiService and CombatService
    - Respawn emits to both player.socketId (private) and respawnPos.zoneId room (zone broadcast)
    - Client isDead guard in handleInput() blocks keyboard/click movement while dead

key-files:
  created: []
  modified:
    - apps/game-server/src/game/player.service.ts
    - apps/game-server/src/game/combat.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/web/src/store/gameStore.ts
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "scheduleRespawn clears existing timer before setting new one — prevents duplicate respawn if called twice for same player"
  - "handleDisconnect clears pending respawn timer — dead-while-disconnecting players don't respawn into void"
  - "respawnPlayer emits player:left to old zone only when zone differs from respawn zone — avoids spurious left event on same-zone respawn"
  - "handlePlayerRespawn calls updateLocalPlayer() which handles missing-sprite edge case (re-creates if destroyed)"

patterns-established:
  - "Server injection pattern: PlayerService.setServer() wired in GameGateway.afterInit() alongside AiService and CombatService"
  - "Respawn timer lifecycle: scheduleRespawn() → setTimeout → respawnPlayer() → emit; cleared on disconnect"

# Metrics
duration: 6min
completed: 2026-02-19
---

# Phase 41 Plan 02: Player Respawn Logic Summary

**3-second respawn timer in PlayerService teleports dead players to faction hub, restores full health, and emits player:respawn to both the player socket and zone room; client shows death/respawn messages and gates movement on isDead flag**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-19T00:32:51Z
- **Completed:** 2026-02-19T00:38:51Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- PlayerService gained `scheduleRespawn()` (3-second timer with duplicate guard), `respawnPlayer()` (restores health, clears isDead, teleports to faction hub, emits events), and `setServer()` injection point
- CombatService calls `scheduleRespawn()` after player death events; GameGateway wires `playerService.setServer()` in `afterInit()`
- Client handles `player:death` (marks local player dead, shows system message, disables movement) and `player:respawn` (restores state, updates position, shows message); WorldScene gains `handlePlayerDeath()` and `handlePlayerRespawn()` with isDead movement guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement respawnPlayer in PlayerService** - `ec2ea2c` (feat)
2. **Task 2: Wire respawn scheduling in CombatService** - `92d2a70` (feat)
3. **Task 3: Handle death and respawn events on client** - `14c3c7a` (feat)

## Files Created/Modified

- `apps/game-server/src/game/player.service.ts` - Added RESPAWN_DELAY_MS constant, Server import, getFactionRespawnPosition import, respawnTimers map, setServer(), scheduleRespawn(), respawnPlayer(), and disconnect timer cleanup
- `apps/game-server/src/game/combat.service.ts` - Added scheduleRespawn() call after player death in creatureAttackTick()
- `apps/game-server/src/game/game.gateway.ts` - Added playerService.setServer(server) in afterInit()
- `apps/web/src/store/gameStore.ts` - Added player:death and player:respawn socket handlers with system chat messages
- `apps/web/src/game/scenes/WorldScene.ts` - Added handlePlayerDeath(), handlePlayerRespawn(), and isDead movement guard in handleInput()

## Decisions Made

- `scheduleRespawn()` clears existing timer before scheduling new one — prevents double-respawn if called twice
- `handleDisconnect()` in PlayerService now clears any pending respawn timer — player disconnecting while dead won't respawn into an empty session
- `respawnPlayer()` emits `player:left` to old zone only when zones differ — avoids spurious left notification on same-zone respawn (unlikely but correct)
- `handlePlayerRespawn()` calls `updateLocalPlayer()` which handles the missing-sprite edge case by re-creating the sprite if it doesn't exist

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Complete player death-respawn cycle is now wired end-to-end: creature kills player → 3s timer → faction hub teleport → client UI updates
- Items and XP are untouched during respawn (no inventory/stats modification in respawn code)
- Phase 41 is feature-complete for the core death-respawn loop

---
*Phase: 41-player-death-and-respawn*
*Completed: 2026-02-19*

## Self-Check: PASSED

- All 5 modified files confirmed present on disk
- SUMMARY.md confirmed created on disk
- All 3 task commits (ec2ea2c, 92d2a70, 14c3c7a) confirmed in git log
- scheduleRespawn method confirmed in player.service.ts
- handlePlayerDeath method confirmed in WorldScene.ts
- player:death handler confirmed in gameStore.ts
- Full build passes for all 10 projects
