---
phase: 13-tile-definition-architecture
plan: 03
subsystem: world-gen
tags: [tiles, registry, world-gen, elevation, terrain, heights]

# Dependency graph
requires:
  - phase: 13-01
    provides: TileRegistry and TileDefinition types
  - phase: 13-02
    provides: Complete tile registry with all 16 biome tiles and ChunkData schema
provides:
  - world-gen package integrated with @into-the-void/tiles
  - generateTerrain returns heights[][] alongside tiles[][] and collisions[][]
  - Heights initialized from TileRegistry defaultElevation
  - Backward-compatible enum-to-string migration shim
  - ChunkData output includes heights and structures fields
affects: [14-depth-system, 15-renderer-integration, game-server]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Enum-to-string migration pattern (tileIdToString shim for backward compatibility)"
    - "Registry-based collision/speed lookups instead of hardcoded functions"
    - "Heights placeholder using tile defaultElevation (noise-based variation in Phase 14)"

key-files:
  created: []
  modified:
    - packages/world-gen/package.json
    - packages/world-gen/src/generation/terrain.ts
    - packages/world-gen/src/generation/chunk.ts
    - pnpm-lock.yaml

key-decisions:
  - "Keep deprecated TileId enum and hardcoded BIOME_TILES for backward compatibility"
  - "Add BIOME_TILE_IDS for string-based tile lookups alongside numeric enum"
  - "Heights initialized from TileRegistry.get(tileId).defaultElevation (Phase 14 adds noise variation)"
  - "Deprecated isWalkable and getTileSpeedModifier delegate to TileRegistry for migration path"

patterns-established:
  - "Dual mapping pattern: BIOME_TILES (numeric enum) and BIOME_TILE_IDS (string) for gradual migration"
  - "Heights generation placeholder: default elevations now, noise-based variation in Phase 14"
  - "Structures initialized as empty array in ChunkData (populated in Phase 14+)"

# Metrics
duration: 217s
completed: 2026-02-16
---

# Phase 13 Plan 03: World-Gen Integration Summary

**world-gen now uses TileRegistry for collision/speed lookups with heights[][] output, backward-compatible enum shim for migration**

## Performance

- **Duration:** 3 min 37 sec (217 seconds)
- **Started:** 2026-02-16T16:27:16Z
- **Completed:** 2026-02-16T16:30:53Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Integrated @into-the-void/tiles package into world-gen with workspace dependency
- Added heights[][] generation to generateTerrain using TileRegistry.get(tileId).defaultElevation
- Updated WorldGenerator.generateChunk to output complete ChunkData with heights and structures
- Created tileIdToString migration shim for enum-to-string conversion (all 16 tile mappings)
- Refactored isWalkable and getTileSpeedModifier to delegate to TileRegistry instead of hardcoded logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tiles package dependency to world-gen** - `fc32d6c` (chore)
   - Added @into-the-void/tiles as workspace dependency in package.json
   - Updated pnpm-lock.yaml with pnpm install

2. **Task 2: Integrate TileRegistry and add heights generation** - `9b7939b` (feat)
   - Imported TileRegistry and TILE_IDS from @into-the-void/tiles
   - Created tileIdToString migration function (maps all 16 enum values to string IDs)
   - Added BIOME_TILE_IDS mapping alongside existing BIOME_TILES (dual mapping pattern)
   - Updated generateTerrain to return { tiles, heights, collisions } with heights from TileRegistry
   - Changed collision detection from hardcoded isFeatureBlocking to TileRegistry.get(tileId).isBlocking
   - Updated ensureZoneConnectivity to set heights on edge paths using TileRegistry
   - Deprecated isWalkable and getTileSpeedModifier with TileRegistry delegation

3. **Task 3: Update WorldGenerator to include heights and structures** - `11920ba` (feat)
   - Captured heights from generateTerrain destructured return
   - Added heights and structures to ChunkData return object
   - Initialized structures as empty array (Phase 14+ will populate)

## Files Created/Modified
- `packages/world-gen/package.json` - Added @into-the-void/tiles workspace dependency
- `pnpm-lock.yaml` - Updated with tiles package linkage
- `packages/world-gen/src/generation/terrain.ts` - TileRegistry integration, heights generation, migration shim
- `packages/world-gen/src/generation/chunk.ts` - Added heights and structures to ChunkData output

## Decisions Made

**1. Maintain backward compatibility with TileId enum**
- Decision: Keep existing TileId enum with @deprecated annotation instead of removing it
- Rationale: Other code may still reference the enum; gradual migration is safer than breaking change
- Impact: Allows incremental migration, prevents breaking existing consumers

**2. Dual mapping pattern (BIOME_TILES + BIOME_TILE_IDS)**
- Decision: Add BIOME_TILE_IDS alongside existing BIOME_TILES instead of replacing
- Rationale: Internal generation still uses numeric TileId for tiles[][], but TileRegistry lookups need string IDs
- Impact: Enables string-based registry lookups while maintaining numeric output format

**3. Heights from default elevation (Phase 14 adds noise)**
- Decision: Initialize heights from tileDef.defaultElevation without noise variation
- Rationale: Plan explicitly states "Phase 14 will add noise-based height variation" - this is placeholder
- Impact: Heights array populated correctly for ChunkData schema, ready for noise enhancement in Phase 14

**4. Deprecate but delegate isWalkable/getTileSpeedModifier**
- Decision: Mark functions as @deprecated but implement via TileRegistry delegation
- Rationale: Provides migration path for existing code while centralizing logic in registry
- Impact: Existing code continues to work, new code can use TileRegistry directly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. Build errors on missing heights/structures in ChunkData (expected)**
- Issue: After Task 2, world-gen:build failed with "Type '{ zoneId, tiles, collisions, spawnPoints }' missing heights, structures"
- Resolution: This was expected and resolved by Task 3 (updating chunk.ts to include heights and structures)
- Impact: None - normal task dependency flow

**2. NX pruned lockfile warnings (non-blocking)**
- Issue: NX build outputs warnings about pruned lockfile creation failing
- Resolution: These are NX internal warnings that don't affect build success - output shows "Successfully ran target build"
- Impact: None - builds complete successfully despite warnings

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 14 (Depth System)**
- Heights array populated in ChunkData with default elevations (ready for noise-based variation)
- TileRegistry provides defaultElevation for all 16 tiles
- Structures array initialized as empty (ready for multi-tile structure definitions)

**Ready for Phase 15 (Renderer Integration)**
- TileRegistry accessible from world-gen for rendering logic
- Heights data available for depth calculations
- All tiles have isBlocking and movementSpeed properties

**Ready for game-server integration**
- ChunkData now complete with all required fields (tiles, heights, structures, collisions, spawnPoints)
- Migration shim (tileIdToString) available for gradual enum-to-string conversion
- Backward compatibility maintained with existing TileId enum

**No blockers or concerns**

## Verification Results

All verification criteria met:

1. **world-gen depends on @into-the-void/tiles:** grep shows workspace dependency ✓
2. **generateTerrain returns heights[][]:** Function signature includes heights in return type ✓
3. **Heights initialized from TileRegistry:** heights[y][x] = tileDef.defaultElevation ✓
4. **tileIdToString provides enum-to-string migration:** All 16 enum values mapped to TILE_IDS ✓
5. **isWalkable and getTileSpeedModifier delegate to TileRegistry:** Both use tileIdToString + TileRegistry.get() ✓
6. **WorldGenerator.generateChunk outputs complete ChunkData:** Return includes heights and structures ✓
7. **Full build passes:** pnpm build succeeded for all 8 projects ✓

## Self-Check: PASSED

All files verified modified:
- packages/world-gen/package.json ✓
- pnpm-lock.yaml ✓
- packages/world-gen/src/generation/terrain.ts ✓
- packages/world-gen/src/generation/chunk.ts ✓

All commits verified:
- fc32d6c (Task 1 - tiles dependency) ✓
- 9b7939b (Task 2 - TileRegistry integration) ✓
- 11920ba (Task 3 - heights and structures in ChunkData) ✓

Runtime verification:
- generateTerrain return type includes heights ✓
- WorldGenerator.generateChunk returns complete ChunkData ✓
- Full build passes all packages ✓
- TileRegistry imports work correctly ✓

---
*Phase: 13-tile-definition-architecture*
*Completed: 2026-02-16*
