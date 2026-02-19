---
phase: 41-player-death-and-respawn
plan: "01"
subsystem: combat
tags: [combat, death, respawn, player, socket, events]

# Dependency graph
requires:
  - phase: 40-creature-attack-and-combat-loop
    provides: CombatService.creatureAttackTick() with health reduction and kill detection
provides:
  - Player.isDead optional field in shared-types
  - player:death and player:respawn ServerEvent types
  - FACTION_RESPAWN_COORDS and getFactionRespawnPosition in game-logic
  - PlayerService.setDead() and isDead() methods
  - player:death emission to player socket and zone room on kill
affects:
  - 41-02-PLAN (respawn implementation reads isDead and uses getFactionRespawnPosition)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Death state stored as isDead on in-memory ConnectedPlayer, cleared on respawn
    - player:death emitted to both direct player socket AND zone room for broadcast visibility
    - stopCombat() called on both player-initiated and creature-initiated sessions at death

key-files:
  created:
    - packages/game-logic/src/combat/respawn.ts
  modified:
    - packages/shared-types/src/core/player.ts
    - packages/shared-types/src/network/events.ts
    - packages/game-logic/src/index.ts
    - apps/game-server/src/game/player.service.ts
    - apps/game-server/src/game/combat.service.ts

key-decisions:
  - "isDead stored as optional field on Player interface — falsy by default, no migration needed"
  - "Emit player:death to both direct socket AND zone room — player gets notification, zone sees death"
  - "stopCombat() called on player's own combat session at death — prevents dead player from continuing to deal damage"
  - "Faction respawn coords: verdant=zone_-2_0 (Canopy), helix=zone_2_0 (Ironhold), nexus+neutral=zone_0_2 (Meridian)"

patterns-established:
  - "Death handler pattern: setDead() → stopCombat() → stopCreatureCombat() → emit player:death × 2"

# Metrics
duration: 5min
completed: 2026-02-19
---

# Phase 41 Plan 01: Player Death Detection and State Tracking Summary

**Player death detection wired into CombatService: isDead flag set, all combat sessions stopped, and player:death Socket.IO event emitted to player and zone on kill, with faction hub respawn coordinates defined for all 4 factions**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-19T00:15:31Z
- **Completed:** 2026-02-19T00:20:00Z
- **Tasks:** 3
- **Files modified:** 5 (1 created)

## Accomplishments

- Player interface extended with `isDead?: boolean` field and `player:death`/`player:respawn` events added to ServerEventType and ServerEvents
- Faction respawn coordinate map (`FACTION_RESPAWN_COORDS`) and `getFactionRespawnPosition()` exported from game-logic package
- PlayerService gained `setDead()` and `isDead()` methods; CombatService marks player dead, stops all combat sessions, and emits `player:death` to both the player's socket and the zone room when creature kills player

## Task Commits

Each task was committed atomically:

1. **Task 1: Add isDead field and socket event types** - `3b9690c` (feat)
2. **Task 2: Create faction respawn coordinates** - `c321e62` (feat)
3. **Task 3: Add death state tracking and emit player:death event** - `e2eedb7` (feat)

## Files Created/Modified

- `packages/shared-types/src/core/player.ts` - Added `isDead?: boolean` to Player interface
- `packages/shared-types/src/network/events.ts` - Added `player:death` and `player:respawn` to ServerEventType and ServerEvents
- `packages/game-logic/src/combat/respawn.ts` - New file: FACTION_RESPAWN_COORDS and getFactionRespawnPosition()
- `packages/game-logic/src/index.ts` - Export respawn functions from combat/respawn
- `apps/game-server/src/game/player.service.ts` - Added setDead() and isDead() methods
- `apps/game-server/src/game/combat.service.ts` - Added death handling block in creatureAttackTick()

## Decisions Made

- `isDead` stored as optional boolean on the in-memory Player/ConnectedPlayer — falsy by default, no schema migration needed
- `player:death` emitted to both the player's own socket AND the zone room — player receives their own death notification, all zone members observe the event
- `stopCombat()` called on the dead player's own combat session in addition to `stopCreatureCombat()` — prevents dead player from continuing to deal damage mid-tick
- Faction hub positions aligned with lore: verdant = zone_-2_0 (Canopy, western forest), helix = zone_2_0 (Ironhold, eastern volcanic), nexus = zone_0_2 (Meridian, southern coast), neutral = zone_0_2 (Meridian, neutral welcome)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Player death detection complete; Plan 02 can read `isDead` to gate movement/actions and call `getFactionRespawnPosition()` for respawn location
- `player:respawn` event type is defined in shared-types, ready for Plan 02 to emit
- `setDead(playerId, false)` is available on PlayerService to clear death state after respawn

---
*Phase: 41-player-death-and-respawn*
*Completed: 2026-02-19*

## Self-Check: PASSED

- All 6 files confirmed present on disk
- All 3 task commits (3b9690c, c321e62, e2eedb7) confirmed in git log
- Build passes for shared-types, game-logic, and game-server
