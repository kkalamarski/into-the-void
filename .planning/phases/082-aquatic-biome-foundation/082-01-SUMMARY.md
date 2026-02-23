---
phase: 82-aquatic-biome-foundation
plan: 01
subsystem: tiles, shared-types
tags: [aquatic, biomes, foundation, tiles, types]
completed: 2026-02-23
duration: 176s

dependencies:
  requires: []
  provides:
    - aquatic_biome_types
    - tile_state_enum
    - aquatic_tile_definitions
  affects:
    - packages/shared-types/src/game/biome.ts
    - packages/tiles/src/types.ts
    - packages/tiles/src/definitions/aquatic-tiles.ts

tech_stack:
  added: []
  patterns:
    - TileState enum for water classification
    - Optional tileState and visibilityModifier on TileDefinition

key_files:
  created:
    - packages/tiles/src/definitions/aquatic-tiles.ts
  modified:
    - packages/shared-types/src/game/biome.ts
    - packages/tiles/src/types.ts
    - packages/tiles/src/definitions/index.ts
    - packages/tiles/src/index.ts

decisions:
  - decision: "Use TileState enum instead of boolean flags"
    rationale: "Extensible type system allows future states (e.g., 'magma', 'void_rift') without breaking changes"
    alternatives: ["Boolean flags (isWater, isDeepWater)", "String literals on each tile"]
    impact: "Cleaner validation logic in movement and pathfinding systems"
  - decision: "Make tileState and visibilityModifier optional"
    rationale: "Existing tiles don't need updates - defaults to solid/traversable based on isBlocking"
    alternatives: ["Required properties with migration", "Separate tile interface for aquatic"]
    impact: "Zero breaking changes to existing tile definitions"
  - decision: "Seven tile types across three biome tiers"
    rationale: "Each tier needs floor + variant (shallow/wall/deep) plus shared shore transition"
    alternatives: ["Single water tile with properties", "More granular tiles per depth"]
    impact: "Balanced variety without overwhelming the generator with choices"

metrics:
  tasks_completed: 3
  commits: 3
  files_created: 1
  files_modified: 4
  lines_added: ~160
---

# Phase 82 Plan 01: Aquatic Biome Foundation Summary

**One-liner:** Extended BiomeType with three aquatic biomes (tidal pools, kelp forests, deep trenches) and created TileState-aware tile definitions with water-specific movement/visibility properties.

## What Was Built

### 1. BiomeType Extension (Task 1)
Extended the BiomeType union in shared-types to include three aquatic biome types:

- **tidal_pools** (Tier I): Shallow coastal biome with cadet blue color (#5f9ea0)
- **kelp_forests** (Tier II): Dense underwater vegetation with forest green color (#228b22)
- **deep_trenches** (Tier III): High-pressure deep ocean with midnight blue color (#191970)

Also added:
- Display names for all three biomes in BIOME_DISPLAY_NAMES
- UI colors for minimap/indicators in BIOME_COLORS
- New 'pressure' hazard type for deep_trenches environmental effects

**Commit:** 30f8258

### 2. TileState Type System (Task 2)
Added extensible tile classification beyond simple blocking:

- **TileState enum:** `'solid' | 'traversable' | 'shallow_water' | 'deep_water'`
- **tileState property:** Optional on TileDefinition (defaults based on isBlocking)
- **visibilityModifier property:** Optional number for fog of war effects (1.0 = normal, 0.7 = reduced)

This is fully backward-compatible - existing tiles use defaults without modification.

**Commit:** 94665cd

### 3. Aquatic Tile Definitions (Task 3)
Created seven tile definitions across three aquatic biome tiers:

**Tidal Pools (Tier I):**
- TIDAL_FLOOR: Sandy coastal floor, speed 1.0, visibility 0.85
- TIDAL_SHALLOW: Shallow water, speed 0.7, tileState 'shallow_water', visibility 0.85

**Kelp Forests (Tier II):**
- KELP_FLOOR: Seafloor corridor, speed 0.6, tileState 'shallow_water', visibility 0.7
- KELP_WALL: Dense kelp formation, blocking, used for walls

**Deep Trenches (Tier III):**
- TRENCH_FLOOR: Deep ocean floor, speed 0.3, tileState 'deep_water', visibility 0.6
- TRENCH_DEEP: Abyssal depth, speed 0.2, tileState 'deep_water', visibility 0.5

**Shore Transitions:**
- SHORE_TRANSITION: Beach/shore tile, speed 0.9, used at water/land boundaries

All tiles registered in ALL_TILES array and exported with TILE_IDS constants.

**Commit:** 89086b9

## Deviations from Plan

None - plan executed exactly as written. All tasks completed without issues.

## Verification Results

All success criteria met:

- ✅ BiomeType union includes 'tidal_pools' | 'kelp_forests' | 'deep_trenches'
- ✅ TileState type exists with 4 states: solid, traversable, shallow_water, deep_water
- ✅ 7 aquatic tiles defined with appropriate speed/visibility modifiers
- ✅ All tiles registered in TileRegistry via ALL_TILES
- ✅ Both packages (shared-types, tiles) build without errors

Verification commands:
```bash
npx nx run shared-types:build  # SUCCESS
npx nx run tiles:build          # SUCCESS
grep "tidal_pools" packages/shared-types/src/game/biome.ts  # 3 matches
grep "TIDAL_FLOOR" packages/tiles/src/  # 5 matches (definition, imports, exports)
```

## Integration Points

**Downstream dependencies (next plans will integrate):**
1. **World generation:** BiomeType changes enable aquatic zone selection in world-gen
2. **Tile placement:** TileState will be used by PathfindingController for water movement validation
3. **Zone generator:** Aquatic tile definitions ready for procedural placement in BiomeConfigs
4. **Movement system:** movementSpeed and tileState will affect player/creature traversal
5. **Fog of war:** visibilityModifier affects reveal radius in vision system

**No breaking changes:** All additions are backward-compatible with existing systems.

## Technical Notes

### TileState Design
The TileState enum follows an extensibility pattern:
- Current states: solid, traversable, shallow_water, deep_water
- Future expansion: could add 'magma', 'void_rift', 'quicksand', etc.
- Validation: Movement systems can check `tileState === 'deep_water'` for special rules

### Color Choices
Aquatic colors chosen for visual clarity and tier distinction:
- Tidal Pools (Tier I): Light/bright blues/tans (shallow, safe)
- Kelp Forests (Tier II): Green tones (vegetation)
- Deep Trenches (Tier III): Dark navy/black blues (danger, depth)

### Speed Progression
Movement speed decreases with depth/tier:
- Tidal: 1.0 (floor), 0.7 (shallow) - minimal impact
- Kelp: 0.6 (floor) - moderate slowing
- Trench: 0.3 (floor), 0.2 (deep) - severe slowing

This creates natural difficulty scaling and encourages tier-appropriate exploration.

## Research Flags

**TileState Compatibility:**
The PathfindingController currently uses only `isBlocking` for movement validation. When aquatic zones are generated, the pathfinding system will need updates to respect tileState for water-specific rules (e.g., swimming requirement, pressure resistance).

**Suggested for Phase 83 (Aquatic Entities):**
- Add creature aquatic affinity (some creatures can swim in shallow_water, others need deep_water)
- Update movement validation to check tileState
- Consider breath/pressure mechanic for non-aquatic entities

## Next Steps

1. **Phase 82-02:** Add aquatic BiomeConfigs for world-gen integration
2. **Phase 82-03:** Implement aquatic zone generation with tile placement
3. **Phase 83:** Create aquatic creatures with water-appropriate movement

The foundation is complete - types and tiles are ready for procedural generation.

## Self-Check: PASSED

All claimed files and commits verified:

**Created files:**
```bash
[ -f "packages/tiles/src/definitions/aquatic-tiles.ts" ] && echo "FOUND"
# FOUND: packages/tiles/src/definitions/aquatic-tiles.ts
```

**Modified files:**
```bash
[ -f "packages/shared-types/src/game/biome.ts" ] && echo "FOUND"
[ -f "packages/tiles/src/types.ts" ] && echo "FOUND"
[ -f "packages/tiles/src/definitions/index.ts" ] && echo "FOUND"
[ -f "packages/tiles/src/index.ts" ] && echo "FOUND"
# All FOUND
```

**Commits:**
```bash
git log --oneline --all | grep -E "(30f8258|94665cd|89086b9)"
# 89086b9 feat(82-01): add aquatic tile definitions for three biome tiers
# 94665cd feat(82-01): add TileState enum and water-specific tile properties
# 30f8258 feat(82-01): add aquatic biome types to BiomeType union
```

All artifacts exist as documented.
