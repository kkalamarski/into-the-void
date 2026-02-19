---
phase: 47-hub-travel
plan: 05
subsystem: world-gen
tags: [hub, portal, tile-id, world-gen, hub-exit]

# Dependency graph
requires:
  - phase: 47-04
    provides: Client-side checkPortalTile() detects tile ID 16 and emits portal:use
  - phase: 47-03
    provides: Server handlePortalUse delegates to handleHubLeave when in hub zone
  - phase: 47-01
    provides: TileId.PORTAL = 16 defined in terrain.ts
provides:
  - Portal tile (ID 16) at position (32, 32) in every hub zone chunk
  - Hub exit mechanic fully closed: tile 16 in hub -> checkPortalTile -> portal:use -> handleHubLeave -> open world
affects: [48-npc-dialogue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hub portal placement: add portal tile after tile generation loop, before return statement"
    - "Portal position (32,32) is inside walkable area (perimeter is 0-7 and 56-63), collision false from floor generation"

key-files:
  created: []
  modified:
    - packages/world-gen/src/generation/hub.ts

key-decisions:
  - "Portal placed at (32,32) — center of walkable area, easy to find on hub entry, matches getFactionRespawnPosition"
  - "No collision override needed — tile (32,32) is in walkable area so collision is already false"

patterns-established:
  - "Post-loop tile override: place special tiles by index after generation loop completes"

# Metrics
duration: 1min
completed: 2026-02-19
---

# Phase 47 Plan 05: Hub Portal Tile Placement Summary

**Portal tile (ID 16) placed at hub center (32,32) in generateHubChunk(), closing the final hub-exit gap so players can leave via the existing portal:use -> handleHubLeave pipeline**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-19T23:03:46Z
- **Completed:** 2026-02-19T23:04:29Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `PORTAL_TILE_ID = 16` constant defined at top of hub.ts (matches TileId.PORTAL from terrain.ts)
- Portal tile placed at position (32, 32) after the tile generation loop in `generateHubChunk()`
- Position is inside the walkable area (perimeter walls are 0-7 and 56-63 thick), collision already false
- Hub exit chain is now complete: hub tile 16 -> client `checkPortalTile()` -> `portal:use` event -> server `handlePortalUse` -> `handleHubLeave` -> player returns to `lastWorldPosition`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add portal tile at hub center** - `2c8ed20` (feat)

## Files Created/Modified

- `packages/world-gen/src/generation/hub.ts` - Added `PORTAL_TILE_ID` constant and portal tile placement at (32,32) after generation loop

## Decisions Made

- Portal at center (32,32) — center of the 64x64 hub, inside walkable zone, easy to discover when entering the hub
- No separate collision override needed since tile at (32,32) is initialized as walkable floor tile before the portal override

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Hub travel is now fully implemented end-to-end (phases 47-01 through 47-05):
  - Open world: player walks on tile 16 -> client emits `portal:use` -> server `handlePortalUse` -> teleports to faction hub
  - Hub: player walks on tile 16 at (32,32) -> client emits `portal:use` -> server `handleHubLeave` -> restores open-world position
  - H key recall: client emits `hub:recall` -> server `handleHubRecall` -> teleports to hub (saves position)
- Phase 47 gap closure verified: `must_haves.truths` both satisfied
- Ready for Phase 48: NPC dialogue and hub interactions

## Self-Check: PASSED

- FOUND: packages/world-gen/src/generation/hub.ts (PORTAL_TILE_ID constant at line 3)
- FOUND: packages/world-gen/src/generation/hub.ts (tiles[portalY][portalX] = PORTAL_TILE_ID at line 102)
- FOUND: commit 2c8ed20 (Task 1)
- FOUND: .planning/phases/47-hub-travel/47-05-SUMMARY.md

---
*Phase: 47-hub-travel*
*Completed: 2026-02-19*
