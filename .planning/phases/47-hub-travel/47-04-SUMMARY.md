---
phase: 47-hub-travel
plan: 04
subsystem: client-rendering
tags: [portal, world-scene, phaser, movement, tile-detection, websocket]

# Dependency graph
requires:
  - phase: 47-03
    provides: handlePortalUse and handleHubLeave handlers on game server
  - phase: 47-01
    provides: TileId.PORTAL = 16 in terrain.ts, portal tiles in open-world chunks
provides:
  - Client-side portal tile detection in WorldScene on movement completion
  - checkPortalTile() emits portal:use when player lands on tile ID 16
  - lastPortalEmitKey debounce prevents duplicate emissions on same tile
affects: [47-hub-travel, 48-npc-dialogue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Portal detection runs after each client-predicted movement step (reconciling=false only)"
    - "Debounce by position key (x,y,zoneId): clears when player moves off portal, persists while standing on it"
    - "Server validates portal:use independently — client just emits, server rejects if not on portal"

key-files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "Portal check runs on reconciling=false (prediction) not reconciling=true (server correction) to avoid spam"
  - "Use currentTiles fast path for current zone; fall back to ChunkManager.getChunk() for cross-zone lookups"
  - "lastPortalEmitKey resets to null on non-portal tiles, enabling re-entry after leaving a portal"

patterns-established:
  - "Tile-triggered actions: check tile ID in updateLocalPlayerSprite after position updates, debounce by posKey"

# Metrics
duration: 1min
completed: 2026-02-19
---

# Phase 47 Plan 04: Portal Tile Detection Summary

**WorldScene detects player arrival on TileId 16 (portal) after each movement step and emits portal:use to trigger server-side hub teleport in both directions**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-19T22:43:57Z
- **Completed:** 2026-02-19T22:45:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `checkPortalTile(position)` added to `WorldScene` — looks up the tile at the player's position using `currentTiles` (fast path) or `ChunkManager.getChunk()` (cross-zone fallback)
- Emits `gameSocket.emit('portal:use', {})` when tile numeric ID equals 16 (TileId.PORTAL)
- `lastPortalEmitKey` private field tracks the last position where portal was emitted, preventing duplicate emissions on the same tile position
- Debounce resets to `null` when player moves to a non-portal tile, so the portal can be re-triggered if the player returns
- Called from `updateLocalPlayerSprite()` only when `reconciling = false` (client predictions, not server corrections)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add portal tile detection on movement completion** - `39def83` (feat)

## Files Created/Modified

- `apps/web/src/game/scenes/WorldScene.ts` - Added `lastPortalEmitKey` field, `checkPortalTile()` method, and call site in `updateLocalPlayerSprite()`

## Decisions Made

- Portal check on `reconciling=false` only — server-correction calls (`reconciling=true`) don't re-check portal to avoid spurious re-emission during position corrections
- Debounce resets to `null` on non-portal moves rather than on any move — this allows standing on adjacent portal after leaving one, and ensures exact same position re-entry works after walking away
- `currentTiles` fast path used when `position.zoneId === currentZoneId`, falls back to `ChunkManager.getChunk()` for hub zones and cross-chunk edge cases

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Portal travel is now fully wired end-to-end:
  - Open world: player walks on tile 16 → client emits `portal:use` → server `handlePortalUse` → teleports to faction hub
  - Hub: player walks on tile 16 → client emits `portal:use` → server delegates to `handleHubLeave` → restores open-world position
  - H key: client emits `hub:recall` → server `handleHubRecall` → teleports to hub (saves position)
- All three hub travel interactions are complete (Phase 47-01 through 47-04)
- Ready for Phase 48: NPC dialogue and hub interactions

## Self-Check: PASSED

- FOUND: apps/web/src/game/scenes/WorldScene.ts (checkPortalTile method, lastPortalEmitKey field)
- FOUND: apps/web/src/game/scenes/WorldScene.ts (gameSocket.emit('portal:use', {}) at line ~542)
- FOUND: commit 39def83 (Task 1)
- FOUND: .planning/phases/47-hub-travel/47-04-SUMMARY.md

---
*Phase: 47-hub-travel*
*Completed: 2026-02-19*
