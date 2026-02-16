---
phase: 13-tile-definition-architecture
plan: 01
subsystem: game-logic
tags: [tiles, registry, hooks, type-system, world-gen]

# Dependency graph
requires:
  - phase: none
    provides: foundational architecture
provides:
  - @into-the-void/tiles package with TileDefinition interface
  - TileRegistry singleton for tile lookups with fallback behavior
  - Hook system types (TileHooks, TileHookContext, TileEffect)
  - Type-safe tile effect discriminated union
affects: [13-02, 13-03, 14-depth-system, 15-renderer-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton registry pattern for static game data"
    - "Discriminated union for type-safe effects"
    - "Fallback tile pattern with console warnings"

key-files:
  created:
    - packages/tiles/src/types.ts
    - packages/tiles/src/registry.ts
    - packages/tiles/src/hooks.ts
    - packages/tiles/src/index.ts
    - packages/tiles/package.json
    - packages/tiles/project.json
    - packages/tiles/tsconfig.lib.json
  modified:
    - tsconfig.base.json

key-decisions:
  - "TileRegistry returns fallback 'unknown' tile instead of throwing on invalid IDs"
  - "Hook effects use discriminated union for type-safe caller handling"
  - "Registry is singleton with private constructor pattern"
  - "Tile elevation defaults to 0-5 range"

patterns-established:
  - "Registry pattern: Map-based lookup with public get/has, internal register methods"
  - "Hook pattern: Context object with entity and position, returns nullable effect"
  - "Effect pattern: Discriminated union with 'type' field for type narrowing"

# Metrics
duration: 2m 16s
completed: 2026-02-16
---

# Phase 13 Plan 01: Tile Definition Architecture Summary

**TileDefinition interface with hook system and TileRegistry singleton providing fallback tile lookups**

## Performance

- **Duration:** 2 min 16 sec
- **Started:** 2026-02-16T16:16:41Z
- **Completed:** 2026-02-16T16:18:57Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created @into-the-void/tiles package as NX library with workspace integration
- Defined TileDefinition interface with movement, blocking, elevation, and hook properties
- Implemented TileRegistry singleton with get/has/getAllIds/getBlockingTiles methods
- Established hook system architecture with TileHookContext and discriminated union TileEffect types

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tiles package structure** - `a8b0869` (feat)
   - Created NX package with package.json, project.json, tsconfig.lib.json
   - Registered @into-the-void/tiles path in root tsconfig
   - Configured build and lint targets following shared-types pattern

2. **Task 2: Define TileDefinition interface and registry** - `2eafc15` (feat)
   - Implemented TileDefinition with id, displayName, isBlocking, movementSpeed, textureKey, defaultElevation, hooks
   - Created TileRegistry with fallback 'unknown' tile and console warnings
   - Defined hook types: TileHooks, TileHookContext, TileHookFn, TileEffect

## Files Created/Modified
- `packages/tiles/package.json` - Package metadata with shared-types dependency
- `packages/tiles/project.json` - NX project config with build/lint targets
- `packages/tiles/tsconfig.lib.json` - TypeScript compilation config
- `packages/tiles/src/types.ts` - TileDefinition interface and hook type definitions
- `packages/tiles/src/registry.ts` - TileRegistry singleton with Map-based storage
- `packages/tiles/src/hooks.ts` - Hook type re-exports for convenience
- `packages/tiles/src/index.ts` - Public API exports
- `tsconfig.base.json` - Added @into-the-void/tiles path mapping

## Decisions Made

**1. Fallback tile strategy**
- TileRegistry.get() returns 'unknown' fallback tile with console.warn instead of throwing
- Rationale: Prevents crashes from invalid tile IDs during development and makes renderer more resilient

**2. Discriminated union for effects**
- TileEffect uses type: 'damage' | 'slow' | 'heal' pattern
- Rationale: Enables TypeScript type narrowing in effect handlers, prevents runtime errors

**3. Readonly properties**
- All TileDefinition and effect fields are readonly
- Rationale: Tiles are static data, immutability prevents accidental mutations

**4. Hook context design**
- Context includes entity and position, not full game state
- Rationale: Keeps hooks focused, prevents tight coupling to game state structure

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**ESLint configuration missing**
- Issue: NX lint target fails with "No ESLint configuration found"
- Context: Pre-existing issue affecting all packages (shared-types also fails)
- Impact: None - TypeScript compilation succeeded, which validates type correctness
- Resolution: Deferred ESLint setup as infrastructure concern outside plan scope

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 13 Plan 02 (Static Tile Definitions)**
- TileDefinition interface stable and ready for concrete tile implementations
- TileRegistry ready to receive tile registrations
- Hook system types ready for onStep implementations (toxic pools, slow terrain)

**Ready for Phase 13 Plan 03 (World-Gen Integration)**
- Package structure supports import from world-gen package
- TileRegistry.get() fallback behavior handles missing tiles gracefully

**Foundation for Phase 14 (Depth System)**
- defaultElevation field ready for depth calculation integration
- TileDefinition extensible for future depth-related properties

**No blockers or concerns**

## Self-Check: PASSED

All files verified present:
- packages/tiles/package.json ✓
- packages/tiles/project.json ✓
- packages/tiles/tsconfig.lib.json ✓
- packages/tiles/src/types.ts ✓
- packages/tiles/src/registry.ts ✓
- packages/tiles/src/hooks.ts ✓
- packages/tiles/src/index.ts ✓

All commits verified:
- a8b0869 (Task 1) ✓
- 2eafc15 (Task 2) ✓

---
*Phase: 13-tile-definition-architecture*
*Completed: 2026-02-16*
