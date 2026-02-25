---
phase: 95-expedition-travel
plan: 01
subsystem: npcs
tags: [npc, expedition, biome-tiers, world-gen, hub]

# Dependency graph
requires:
  - phase: 48-npc-system
    provides: NPC definition types and hub spawn system
provides:
  - Expedition NPC type with 'expedition' serviceType
  - EXPEDITION_MASTER NPC definition in neutral NPCs
  - Expedition NPC spawns in all 4 faction hubs
  - BiomeTier type and BIOME_TIERS/TIER_LEVEL_REQUIREMENTS constants
affects: [95-02-expedition-interaction, 95-03-expedition-teleport]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Biome tier classification for expedition level-gating

key-files:
  created: []
  modified:
    - packages/npcs/src/types.ts
    - packages/npcs/src/definitions/neutral.ts
    - packages/world-gen/src/generation/hub.ts
    - packages/shared-types/src/game/biome.ts

key-decisions:
  - "Expedition NPC positioned at (32, 25) - north of central portal for easy access"
  - "Biome tiers based on world-bible.md lore classification (Tier I-IV)"
  - "Level requirements: Tier I = 1, Tier II = 10, Tier III = 25, Tier IV = 40"

patterns-established:
  - "Service NPCs with new serviceTypes extend ServiceDefinition.serviceType union"
  - "Biome tier constants in shared-types for cross-package consumption"

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 95 Plan 01: Expedition NPC Foundation Summary

**Expedition NPC type, definition, and hub spawns with biome tier classification for level-gated travel**

## Performance

- **Duration:** 2 min 18 sec
- **Started:** 2026-02-25T23:56:00Z
- **Completed:** 2026-02-25T23:58:18Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Extended ServiceDefinition with 'expedition' serviceType for expedition coordinators
- Created EXPEDITION_MASTER NPC definition with appropriate dialogue
- Added expedition NPC spawns to all four faction hubs (verdant, helix, nexus, neutral)
- Defined BiomeTier type and BIOME_TIERS/TIER_LEVEL_REQUIREMENTS constants per lore

## Task Commits

Each task was committed atomically:

1. **Task 1: Add expedition serviceType and biome tier constants** - `e1d3022` (feat)
2. **Task 2: Create expedition NPC definition** - `ce9c851` (feat)
3. **Task 3: Add expedition NPC spawns to all hubs** - `a40af70` (feat)

## Files Created/Modified
- `packages/npcs/src/types.ts` - Extended ServiceDefinition.serviceType with 'expedition'
- `packages/npcs/src/definitions/neutral.ts` - Added EXPEDITION_MASTER NPC definition
- `packages/world-gen/src/generation/hub.ts` - Added expedition NPC spawn to all 4 hub configs
- `packages/shared-types/src/game/biome.ts` - Added BiomeTier, BIOME_TIERS, TIER_LEVEL_REQUIREMENTS

## Decisions Made
- **NPC Position:** (32, 25) - north of central portal at (32, 32) for easy discovery
- **Biome Tier Mapping:** Based on world-bible.md survival classification:
  - Tier I: void_plains, fungal_forest, tidal_pools, ancient_ruins
  - Tier II: toxic_wastes, miasma_marshes, petrified_expanse, bioluminescent_depths, kelp_forests
  - Tier III: volcanic_ridge, crystal_caves, crystalline_wastes, frozen_expanse, deep_trenches, starfall_crater
  - Tier IV: void_rift
- **Level Requirements:** Progressive gating (1/10/25/40) for balanced exploration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Expedition NPC visible in all hubs, ready for interaction implementation in 95-02
- BiomeTier constants exported for use in expedition destination selection
- serviceType: 'expedition' available for NPC interaction system detection

## Self-Check: PASSED

- All 4 modified files exist
- All 3 task commits verified (e1d3022, ce9c851, a40af70)
- SUMMARY.md created

---
*Phase: 95-expedition-travel*
*Completed: 2026-02-26*
