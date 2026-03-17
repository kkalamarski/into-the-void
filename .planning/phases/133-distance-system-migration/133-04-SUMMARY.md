---
phase: 133-distance-system-migration
plan: 04
subsystem: ui
tags: [phaser, pixel-distance, zone-boundary, target-highlight, npc-proximity, game-logic]

# Dependency graph
requires:
  - phase: 133-01
    provides: TILE_SIZE_PX, tileToPixelCenter, pixelDistanceTo, MELEE/GATHER/NPC_INTERACT range constants from game-logic
provides:
  - Pixel-granularity zone boundary detection (getZoneBoundaryDepthPx) in WorldScene
  - HYSTERESIS_PX constant (384px) for zone transition threshold
  - TargetHighlight.setInRange method with alpha-dimming for out-of-range targets
  - updateRangeIndicator that dims/brightens target ring based on pixel distance
  - updateNpcProximity tracking nearestNpcInRange with NPC_INTERACT_RANGE_PX
affects: [134-client-movement-rewrite, 135-cleanup, TargetHighlight, WorldScene, phase-133]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tile→pixel conversion at call site using tileToPixelCenter until Phase 134 provides real-time px/py"
    - "Target highlight alpha dimming: OUT_OF_RANGE_ALPHA=0.3 applied in drawRing when inRange=false"
    - "NPC proximity gating: nearestNpcInRange field updated each position tick via updateNpcProximity"

key-files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/rendering/TargetHighlight.ts
    - apps/web/src/store/gameStore.ts

key-decisions:
  - "getZoneBoundaryDepth (tile-based) kept alongside getZoneBoundaryDepthPx — Phase 135 cleanup will remove old method"
  - "HYSTERESIS_PX = HYSTERESIS_TILES * TILE_SIZE_PX = 384px replaces HYSTERESIS_TILES=3 as threshold"
  - "Target ring alpha-dimming approach (0.3 multiplier) preserves behavior tier color while conveying out-of-range"
  - "nearestNpcInRange field set to closest NPC in range (or null) — gates npc:interact clicks, no full prompt UI yet"

patterns-established:
  - "Phase 133→134 handoff: tileToPixelCenter used as stopgap; Phase 134 provides real px/py from client prediction"
  - "Range check in drawRing: effectiveAlpha = inRange ? alpha : alpha * OUT_OF_RANGE_ALPHA"

requirements-completed: [DIST-06, DIST-01, DIST-02, DIST-03]

# Metrics
duration: 8min
completed: 2026-03-18
---

# Phase 133 Plan 04: Client Pixel Distance Migration Summary

**Pixel-granularity zone boundary detection via getZoneBoundaryDepthPx + target ring alpha-dimming at MELEE/GATHER range boundaries with NPC proximity gating**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-18T08:00:00Z
- **Completed:** 2026-03-18T08:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Zone boundary hysteresis now uses pixel depth (HYSTERESIS_PX=384px) instead of tile integers
- TargetHighlight ring dims to 30% alpha when player is out of melee/gather range, pulses at full brightness when in range
- NPC proximity detection tracks nearest NPC within 192px (NPC_INTERACT_RANGE_PX), gates interaction
- Both zone callers (checkPendingZoneTransition + onPlayerZoneChanged) updated to pixel granularity

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate zone boundary detection to pixel granularity** - `aa1195a` (feat)
2. **Task 2: Add range highlight indicator to TargetHighlight and NPC proximity to WorldScene** - `689dd2e` (feat)

## Files Created/Modified
- `apps/web/src/game/scenes/WorldScene.ts` - TILE_SIZE_PX import, HYSTERESIS_PX constant, getZoneBoundaryDepthPx, updateRangeIndicator, updateNpcProximity, nearestNpcInRange field; both zone callers updated
- `apps/web/src/game/rendering/TargetHighlight.ts` - inRange field, OUT_OF_RANGE_ALPHA constant, setInRange method, drawRing alpha dimming
- `apps/web/src/store/gameStore.ts` - Fixed pre-existing missing px/py fields on PlayerPublic in respawn handler

## Decisions Made
- Kept old `getZoneBoundaryDepth` alongside new `getZoneBoundaryDepthPx` — Phase 135 cleanup will remove deprecated method
- HYSTERESIS_PX = 3 * 128 = 384px is the canonical commit threshold for zone transitions
- Target ring uses alpha dimming (0.3 multiplier) not color change to preserve behavior-tier color communication
- NPC proximity stores nearestNpcInRange field (null if none) as simple gate — full prompt UI deferred

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing PlayerPublic px/py missing fields in gameStore**
- **Found during:** Task 1 (build verification)
- **Issue:** Plan 133-01 added px/py as required fields on PlayerPublic; gameStore.ts had a respawn handler constructing a PlayerPublic literal without px/py — build was broken
- **Fix:** Added `px: (position.x + 0.5) * 128` and `py: (position.y + 0.5) * 128` as tile-center defaults (same convention as tileToPixelCenter) with comment explaining full PlayerPublic will follow via player:joined
- **Files modified:** apps/web/src/store/gameStore.ts
- **Verification:** Build passed after fix
- **Committed in:** aa1195a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required fix — PlayerPublic type contract established in 133-01 was breaking the build. Fix is minimal and correct.

## Issues Encountered
None beyond the auto-fixed type error above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Client-side pixel distance system complete: zone transitions, target highlighting, NPC proximity all use pixel granularity
- Phase 134 (client movement rewrite) can replace tileToPixelCenter stopgaps with real px/py from client prediction
- nearestNpcInRange is populated but the interaction click handler still emits npc:interact unconditionally — Phase 134/135 can add the gate check using this field

---
*Phase: 133-distance-system-migration*
*Completed: 2026-03-18*
