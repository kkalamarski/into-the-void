---
phase: 47-hub-travel
plan: 03
subsystem: game-server
tags: [hub-travel, recall, hotkey, websocket, zone-transition, player-service]

# Dependency graph
requires:
  - phase: 47-02
    provides: teleportToHub, portal:use handler, lastWorldPosition infrastructure
provides:
  - hub:recall and hub:leave in ClientEventType union and ClientEvents interface
  - teleportFromHub() method in PlayerService (restores open-world position from memory or DB)
  - handleHubRecall() WebSocket handler in GameGateway (H key -> hub teleport)
  - handleHubLeave() WebSocket handler in GameGateway (leave hub -> open world)
  - portal:use in hub delegates to handleHubLeave (portal as exit)
  - H key in WorldScene emits hub:recall
affects: [47-hub-travel, 48-npc-dialogue, client-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "H key recall: client emits hub:recall, server validates zone, teleports to hub, saves position"
    - "hub:leave restores lastWorldPosition from in-memory first, DB fallback, then z_0_0 default"
    - "portal:use in hub delegates to handleHubLeave (isHubZone guard at top of handler)"
    - "teleportFromHub clears lastWorldPosition after use (set to undefined + DB null)"
    - "AI activated on return to open world; immediate aggro triggered if zone already active"

key-files:
  created: []
  modified:
    - packages/shared-types/src/network/events.ts
    - apps/game-server/src/game/player.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "H key recall delegates to teleportToHub (same as portal:use) — saves position and teleports to faction hub"
  - "teleportFromHub clears saved position after use — one-way trip, returning to hub requires re-saving"
  - "portal:use in hub delegates to handleHubLeave via method call (no code duplication)"
  - "No dedicated L key for hub leave — portal:use handles it, aligned with Phase 47 plan decision"

patterns-established:
  - "Hub transition sequence: update rooms -> notify old zone -> deactivate/activate AI -> send zone:state -> notify new zone"
  - "Server-side zone guard: isHubZone check at top of handlers blocks invalid operations"

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 47 Plan 03: Hub Recall and Leave Summary

**H key emits hub:recall to teleport to faction hub from open world; hub:leave (and portal:use in hub) returns player to saved open-world position via teleportFromHub()**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-19T22:27:10Z
- **Completed:** 2026-02-19T22:29:34Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- `hub:recall` and `hub:leave` added to `ClientEventType` union and `ClientEvents` interface (empty payload)
- `getLastWorldPosition` imported in `player.service.ts` alongside existing `saveLastWorldPosition`
- `teleportFromHub()` method added to `PlayerService`: validates player is in hub, restores `lastWorldPosition` from in-memory cache or DB fallback, clears saved position after use, defaults to `z_0_0` for first-time hub visitors
- `handleHubRecall()` handler: rejects if player already in hub with `ALREADY_IN_HUB` error, calls `teleportToHub()`, emits full zone transition (old zone notification, AI activation, `zone:state`, `player:joined`)
- `handleHubLeave()` handler: calls `teleportFromHub()`, activates AI for return zone, triggers immediate aggro if zone was already active, emits zone transition events
- `handlePortalUse()` updated: `isHubZone` guard at top delegates to `handleHubLeave` when in hub — portal works as exit
- H key registered in `WorldScene.create()` after existing hotkeys — emits `hub:recall` when keyboard is enabled

## Task Commits

Each task was committed atomically:

1. **Task 1: Add hub:recall/hub:leave events and teleportFromHub method** - `96c9770` (feat)
2. **Task 2: Wire hub:recall and hub:leave handlers in GameGateway** - `4857113` (feat)
3. **Task 3: Add H key recall hotkey in WorldScene** - `95f82fa` (feat)

## Files Created/Modified

- `packages/shared-types/src/network/events.ts` - Added `hub:recall` and `hub:leave` to `ClientEventType` union and `ClientEvents` interface
- `apps/game-server/src/game/player.service.ts` - Added `getLastWorldPosition` import and `teleportFromHub()` method
- `apps/game-server/src/game/game.gateway.ts` - Added `isHubZone` import, `handleHubRecall()` and `handleHubLeave()` handlers, updated `handlePortalUse()` with hub delegation
- `apps/web/src/game/scenes/WorldScene.ts` - Added H key handler emitting `hub:recall`

## Decisions Made

- `teleportFromHub()` clears `lastWorldPosition` after use (in-memory set to `undefined`, DB set to `null`) — consuming the saved position ensures correct state on next hub visit
- `portal:use` in hub delegates to `handleHubLeave` via a direct method call — no code duplication, consistent zone transition logic
- No dedicated client key for leaving hub — portal:use (server-side delegation) handles it; a future HUD button could be added in Phase 49+

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- H key recall is fully wired end-to-end: client emits `hub:recall`, server validates, saves position, teleports to faction hub
- Hub leave is fully wired: `portal:use` in hub delegates to `handleHubLeave`, returning player to saved open-world position
- AI correctly activates on open-world return (immediate aggro if zone was already active)
- Saved position lifecycle is complete: save on entry (Phase 47-02), restore and clear on exit (Phase 47-03)
- Ready for Phase 48: NPC dialogue and hub interactions

## Self-Check: PASSED

- FOUND: packages/shared-types/src/network/events.ts (hub:recall in ClientEventType, ClientEvents)
- FOUND: packages/shared-types/src/network/events.ts (hub:leave in ClientEventType, ClientEvents)
- FOUND: apps/game-server/src/game/player.service.ts (teleportFromHub method)
- FOUND: apps/game-server/src/game/game.gateway.ts (handleHubRecall, handleHubLeave handlers)
- FOUND: apps/web/src/game/scenes/WorldScene.ts (KeyCodes.H, hub:recall emit)
- FOUND: commit 96c9770 (Task 1)
- FOUND: commit 4857113 (Task 2)
- FOUND: commit 95f82fa (Task 3)

---
*Phase: 47-hub-travel*
*Completed: 2026-02-19*
