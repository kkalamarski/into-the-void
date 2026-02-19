---
phase: 47-hub-travel
plan: 01
subsystem: world-gen
tags: [tiles, world-gen, portal, structures, procedural]

# Dependency graph
requires:
  - phase: 46-hub-zones
    provides: hub zone infrastructure and safe zone pattern
provides:
  - PORTAL tile ID constant (TILE_IDS.PORTAL = 'portal') in tiles package
  - Portal tile definition registered in TileRegistry (walkable, color 0x6a00ff)
  - TileId.PORTAL = 16 in terrain.ts enum with tileIdToString mapping
  - Portal spawned deterministically in every open-world chunk via generateStructures()
affects: [47-hub-travel, 48-npc-dialogue, client-rendering, chunk-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Portal tiles use isBlocking=false so players can walk onto them (trigger zone)"
    - "Portal placement uses dedicated seed (worldSeed_portals_chunkX_chunkY) independent of biome features"
    - "Graceful degradation: if no open tile found in 20 attempts, portal is skipped (no crash)"
    - "PORTAL_NUMERIC_ID constant in structures.ts stays in sync with TileId.PORTAL enum (both = 16)"

key-files:
  created:
    - packages/tiles/src/definitions/portal-tile.ts
  modified:
    - packages/tiles/src/definitions/index.ts
    - packages/world-gen/src/generation/structures.ts
    - packages/world-gen/src/generation/terrain.ts

key-decisions:
  - "Portal numeric ID = 16 (next after CRATER_DEBRIS = 15) in TileId enum"
  - "1 portal per open-world chunk guaranteed; hub chunks unaffected (use generateHubChunk)"
  - "Portal placement range x/y 20-44 (center region) avoids walls and edges"
  - "Portal uses tile_void_floor as fallback texture until Phase 48+ sprite is added"

patterns-established:
  - "New tile type = new file in packages/tiles/src/definitions/, register in index.ts ALL_TILES and TILE_IDS"
  - "New numeric TileId = add to enum in terrain.ts + entry in tileIdToString() mapping"

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 47 Plan 01: Portal Tile and Placement Summary

**PORTAL tile type registered in TileRegistry with walkable definition, spawned once per open-world chunk at deterministic center-region position via SeededRandom**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-19T22:12:45Z
- **Completed:** 2026-02-19T22:15:00Z
- **Tasks:** 3
- **Files modified:** 4 (1 created)

## Accomplishments
- Portal tile definition created with `isBlocking=false`, `movementSpeed=1.0`, and distinct violet color `0x6a00ff`
- `TILE_IDS.PORTAL = 'portal'` added to the tiles package constant and registered in `ALL_TILES` via `TileRegistry`
- `TileId.PORTAL = 16` added to the deprecated numeric enum in `terrain.ts` with `tileIdToString()` mapping
- `placePortals()` function added to `structures.ts` — places 1 portal per open-world chunk at a deterministic position in the center region (tiles 20-44)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PORTAL tile ID to tiles package** - `2a6c34b` (feat)
2. **Task 2: Place portal structures in open-world chunks** - `0a7bd01` (feat)
3. **Task 3: Add portal tile to terrain.ts mapping** - `420f1b5` (feat)

## Files Created/Modified
- `packages/tiles/src/definitions/portal-tile.ts` - New portal tile definition (walkable, color=0x6a00ff, textureKey='tile_portal')
- `packages/tiles/src/definitions/index.ts` - Added PORTAL import, to ALL_TILES array, to TILE_IDS constant, and re-exports
- `packages/world-gen/src/generation/structures.ts` - Added placePortals() function and SeededRandom import; called from generateStructures()
- `packages/world-gen/src/generation/terrain.ts` - Added PORTAL = 16 to TileId enum and mapping to tileIdToString()

## Decisions Made
- Portal numeric ID = 16 (CRATER_DEBRIS = 15 was last; PORTAL is next sequential value)
- Portal placement range 20-44 chosen to stay in the center third of the 64x64 chunk, avoiding the edge-buffer (4 tiles) and wall-dense perimeter areas
- Hub chunks are unaffected: `generateHubChunk()` returns `structures: []` directly; portals only spawn in open-world `generateStructures()` flow
- Sprite key `tile_portal` set for future Phase 48+ sprite; `tile_void_floor` fallback handled by renderer's unknown texture logic

## Deviations from Plan

**1. [Rule 3 - Structural Adaptation] TILE_IDS and tile definitions live in definitions/index.ts, not ids.ts/registry.ts**
- **Found during:** Task 1 (reading actual file structure)
- **Issue:** Plan referenced `packages/tiles/src/ids.ts` and `packages/tiles/src/registry.ts` as the files to modify. The actual project has `definitions/index.ts` for TILE_IDS and individual definition files (e.g., `void-tiles.ts`) for tile data. The registry.ts is the singleton class, not the place for tile definitions.
- **Fix:** Created `portal-tile.ts` in `definitions/` following the established pattern, updated `definitions/index.ts` (the real TILE_IDS location). Plan intent was fully satisfied.
- **Files modified:** packages/tiles/src/definitions/portal-tile.ts (created), packages/tiles/src/definitions/index.ts
- **Committed in:** 2a6c34b (Task 1 commit)

---

**Total deviations:** 1 auto-adapted (Rule 3 - file structure mismatch)
**Impact on plan:** All three success criteria satisfied. Deviation was naming only — same outcome, correct files.

## Issues Encountered
None beyond the file structure adaptation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Portal tile type is fully defined, registered, and spawning in every open-world chunk
- Chunk generation is deterministic: same seed + coordinates = same portal position
- Portal tiles appear as walkable tiles with numeric ID 16 in the tiles[][] array
- Ready for Phase 47-02: portal interaction logic (player steps on portal → travel to hub)
- Future: `tile_portal` sprite asset needed (Phase 48+); renderer falls back gracefully

## Self-Check: PASSED

- FOUND: packages/tiles/src/definitions/portal-tile.ts
- FOUND: packages/tiles/src/definitions/index.ts (PORTAL in TILE_IDS, ALL_TILES, re-exports)
- FOUND: packages/world-gen/src/generation/structures.ts (placePortals function)
- FOUND: packages/world-gen/src/generation/terrain.ts (TileId.PORTAL = 16, tileIdToString mapping)
- FOUND: .planning/phases/47-hub-travel/47-01-SUMMARY.md
- FOUND: commit 2a6c34b (Task 1)
- FOUND: commit 0a7bd01 (Task 2)
- FOUND: commit 420f1b5 (Task 3)

---
*Phase: 47-hub-travel*
*Completed: 2026-02-19*
