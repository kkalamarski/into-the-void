---
phase: 13-tile-definition-architecture
plan: 02
subsystem: game-logic
tags: [tiles, registry, world-gen, elevation, structures]

# Dependency graph
requires:
  - phase: 13-01
    provides: TileRegistry and TileDefinition types
provides:
  - Complete tile registry with all 16 biome tiles
  - ChunkData schema extended for elevation and structures
  - Tile hook implementations (toxic_pool, lava damage)
  - TILE_IDS constants for type-safe tile references
affects: [13-03, 14-depth-system, 15-renderer-integration, world-gen]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hook pattern implementation (onStep with damage effects)"
    - "Biome-based tile organization (8 modules, 2 tiles each)"
    - "TileStructure for multi-tile building definitions"

key-files:
  created:
    - packages/tiles/src/definitions/void-tiles.ts
    - packages/tiles/src/definitions/crystal-tiles.ts
    - packages/tiles/src/definitions/toxic-tiles.ts
    - packages/tiles/src/definitions/ruins-tiles.ts
    - packages/tiles/src/definitions/ice-tiles.ts
    - packages/tiles/src/definitions/volcanic-tiles.ts
    - packages/tiles/src/definitions/fungal-tiles.ts
    - packages/tiles/src/definitions/crater-tiles.ts
    - packages/tiles/src/definitions/index.ts
  modified:
    - packages/tiles/src/index.ts
    - packages/shared-types/src/core/zone.ts

key-decisions:
  - "Renamed Structure to TileStructure to avoid conflict with entity.Structure"
  - "Kept tiles as number[][] in ChunkData for backward compatibility (migration in Plan 03)"
  - "Used discriminated union for tile effects (type: 'damage' | 'slow' | 'heal')"
  - "Auto-register tiles on module import for convenience"

patterns-established:
  - "Biome-specific tile modules: Each biome has a dedicated module with floor/wall/feature tiles"
  - "Movement speed modifiers match old values: ICE_FLOOR=1.2, TOXIC_POOL=0.5, FUNGAL_FLOOR=0.8"
  - "Default elevation values: floors=0, walls=2-4, features vary by biome"

# Metrics
duration: 187s
completed: 2026-02-16
---

# Phase 13 Plan 02: Static Tile Definitions Summary

**Complete tile registry with all 16 biome tiles and extended ChunkData schema for elevation support**

## Performance

- **Duration:** 3 min 7 sec (187 seconds)
- **Started:** 2026-02-16T16:21:42Z
- **Completed:** 2026-02-16T16:24:49Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Defined all 16 tile types across 8 biome modules with accurate movement speeds and blocking states
- Implemented onStep hooks for TOXIC_POOL (5 damage) and LAVA (20 damage)
- Created ALL_TILES array and TILE_IDS constants for registry initialization
- Extended ChunkData interface with heights: number[][] and structures: TileStructure[]
- Added TileStructure interface for multi-tile wall and building definitions

## Task Commits

Each task was committed atomically:

1. **Task 1: Define all 16 tile types in registry** - `253702a` (feat)
   - Created 8 biome-specific tile modules (void, crystal, toxic, ruins, ice, volcanic, fungal, crater)
   - Defined 16 tiles: VOID_FLOOR/WALL, CRYSTAL_FLOOR/FORMATION, TOXIC_FLOOR/POOL, RUINS_FLOOR/WALL, ICE_FLOOR/WALL, VOLCANIC_FLOOR/LAVA, FUNGAL_FLOOR/GROWTH, CRATER_FLOOR/DEBRIS
   - Implemented damage hooks on TOXIC_POOL and LAVA
   - Created definitions/index.ts aggregator with ALL_TILES and TILE_IDS exports
   - Updated main index.ts to auto-register tiles via TileRegistry.registerAll()

2. **Task 2: Extend ChunkData with heights and structures** - `df880e4` (feat)
   - Added TileStructure interface for multi-tile wall/building definitions
   - Extended ChunkData with heights: number[][] (elevation levels 0-5)
   - Extended ChunkData with structures: TileStructure[] (wall/building data)
   - Maintained backward compatibility (tiles remains number[][] until Plan 03)

## Files Created/Modified
- `packages/tiles/src/definitions/void-tiles.ts` - Void Plains tiles (VOID_FLOOR, VOID_WALL)
- `packages/tiles/src/definitions/crystal-tiles.ts` - Crystal Caves tiles (CRYSTAL_FLOOR, CRYSTAL_FORMATION)
- `packages/tiles/src/definitions/toxic-tiles.ts` - Toxic Wastes tiles with onStep hook (TOXIC_FLOOR, TOXIC_POOL)
- `packages/tiles/src/definitions/ruins-tiles.ts` - Ancient Ruins tiles (RUINS_FLOOR, RUINS_WALL)
- `packages/tiles/src/definitions/ice-tiles.ts` - Frozen Expanse tiles with speed boost (ICE_FLOOR, ICE_WALL)
- `packages/tiles/src/definitions/volcanic-tiles.ts` - Volcanic Ridge tiles with lava damage (VOLCANIC_FLOOR, LAVA)
- `packages/tiles/src/definitions/fungal-tiles.ts` - Fungal Forest tiles with slow movement (FUNGAL_FLOOR, FUNGAL_GROWTH)
- `packages/tiles/src/definitions/crater-tiles.ts` - Starfall Crater tiles (CRATER_FLOOR, CRATER_DEBRIS)
- `packages/tiles/src/definitions/index.ts` - Aggregates all tiles, exports ALL_TILES and TILE_IDS
- `packages/tiles/src/index.ts` - Updated to import and auto-register all tiles
- `packages/shared-types/src/core/zone.ts` - Extended ChunkData with heights and structures

## Decisions Made

**1. Renamed Structure to TileStructure**
- Rationale: Avoided naming conflict with existing entity.Structure interface in shared-types
- Impact: Clear distinction between entity structures and tile-based structures

**2. Maintained backward compatibility for ChunkData.tiles**
- Decision: Kept tiles as number[][] instead of string[][]
- Rationale: Migration to string-based tile IDs happens in Plan 03 when world-gen is updated
- Impact: Allows incremental migration, prevents breaking existing world generation code

**3. Movement speed values match terrain.ts**
- ICE_FLOOR: 1.2 (fast on ice)
- TOXIC_POOL: 0.5 (slow in toxic)
- FUNGAL_FLOOR: 0.8 (slightly slow)
- Rationale: Ensures consistency with existing gameplay behavior

**4. Default elevation mapping**
- Floor tiles: 0 (ground level)
- Walls: 2-4 (varying heights by biome)
- Features: 0-3 (varies by type)
- Rationale: Provides reasonable defaults for depth system, overridable by world-gen

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Naming conflict with Structure interface**
- **Found during:** Task 2 - ChunkData extension
- **Issue:** TypeScript error "Module './core/zone' has already exported a member named 'Structure'"
- **Root cause:** entity.ts already exports Structure interface for entity types
- **Fix:** Renamed to TileStructure to disambiguate tile-based structures from entity structures
- **Files modified:** packages/shared-types/src/core/zone.ts
- **Commit:** df880e4 (included in Task 2 commit)
- **Verification:** Build succeeded after rename, no type conflicts

## Issues Encountered

None - plan executed smoothly after resolving naming conflict.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 13 Plan 03 (World-Gen Integration)**
- All 16 tiles registered and available via TileRegistry
- TILE_IDS constants provide type-safe string references
- ChunkData schema includes heights and structures fields (world-gen can start populating)
- Hooks implemented and ready for game-server integration

**Ready for Phase 14 (Depth System)**
- defaultElevation field on all tiles provides baseline elevation data
- ChunkData.heights array ready for depth calculations
- TileStructure enables multi-tile depth coordination

**Ready for Phase 15 (Renderer Integration)**
- All tiles have textureKey hints for renderer
- isBlocking and movementSpeed properties ready for gameplay logic
- Hooks provide damage/slow effects for visual feedback

**No blockers or concerns**

## Verification Results

All verification criteria met:

1. **Tile definitions complete:** TileRegistry.getAllIds().length === 16 ✓
2. **Blocking tiles correct:** VOID_WALL, CRYSTAL_FORMATION, RUINS_WALL, ICE_WALL, LAVA, CRATER_DEBRIS all have isBlocking: true ✓
3. **Movement speeds match old values:** ICE_FLOOR=1.2, TOXIC_POOL=0.5, FUNGAL_FLOOR=0.8 ✓
4. **Hooks defined:** TOXIC_POOL and LAVA both have onStep hooks returning damage effects ✓
5. **ChunkData extended:** heights[][] and structures[] fields exist ✓
6. **Packages build successfully:** Both tiles and shared-types build clean ✓

## Self-Check: PASSED

All files verified present:
- packages/tiles/src/definitions/void-tiles.ts ✓
- packages/tiles/src/definitions/crystal-tiles.ts ✓
- packages/tiles/src/definitions/toxic-tiles.ts ✓
- packages/tiles/src/definitions/ruins-tiles.ts ✓
- packages/tiles/src/definitions/ice-tiles.ts ✓
- packages/tiles/src/definitions/volcanic-tiles.ts ✓
- packages/tiles/src/definitions/fungal-tiles.ts ✓
- packages/tiles/src/definitions/crater-tiles.ts ✓
- packages/tiles/src/definitions/index.ts ✓
- packages/tiles/src/index.ts (modified) ✓
- packages/shared-types/src/core/zone.ts (modified) ✓

All commits verified:
- 253702a (Task 1 - tile definitions) ✓
- df880e4 (Task 2 - ChunkData extension) ✓

Runtime verification:
- ALL_TILES.length === 16 ✓
- TileRegistry.getAllIds().length === 16 ✓
- TILE_IDS keys count === 16 ✓
- Tiles with hooks: ['toxic_pool', 'lava'] ✓

---
*Phase: 13-tile-definition-architecture*
*Completed: 2026-02-16*
