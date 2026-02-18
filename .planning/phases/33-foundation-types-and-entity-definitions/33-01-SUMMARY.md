---
phase: 33-foundation-types-and-entity-definitions
plan: 01
subsystem: shared-types
tags: [typescript, entity-types, biome-types, world-gen, creature-behavior]

# Dependency graph
requires: []
provides:
  - "CreatureBehavior type: herbivore|omnivore|predator|maniac (lore-correct)"
  - "BiomeType with 10 entries including miasma_marshes and petrified_expanse"
  - "EntityType with plant and artifact variants + corresponding interfaces"
  - "All 12 Record<BiomeType,...> objects updated in world-gen (biome, spawn, terrain, structures)"
  - "Legacy EntityRegistry marked @deprecated with updated behavior values"
  - "Species seed data using lore-correct behavior strings"
  - "EntityRenderer.createBehaviorIcon() using lore-correct case labels"
affects: [34-entity-lifecycle, 35-loot-interaction-respawn, 36-ai-tick, 37-fertility, 38-client-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CreatureBehavior lore taxonomy: herbivore (non-aggressive) | omnivore (opportunistic) | predator (hunting) | maniac (chaotic)"
    - "BiomeType is source of truth in shared-types; all Record<BiomeType,...> in world-gen must have all 10 keys"

key-files:
  created: []
  modified:
    - packages/shared-types/src/core/entity.ts
    - packages/shared-types/src/game/biome.ts
    - packages/shared-types/src/game/entity-registry.ts
    - packages/world-gen/src/generation/biome.ts
    - packages/world-gen/src/generation/spawn.ts
    - packages/world-gen/src/generation/terrain.ts
    - packages/world-gen/src/generation/structures.ts
    - packages/database/src/schema/species.ts
    - apps/web/src/game/rendering/EntityRenderer.ts

key-decisions:
  - "CreatureBehavior renamed from passive|neutral|aggressive|defensive to herbivore|omnivore|predator|maniac — lore mandate from v1.8 research, breaking change applied first in Phase 33"
  - "miasma_marshes and petrified_expanse added as Tier II biomes — mid-moisture/moderate-temp and low-moisture/stone conditions respectively"
  - "Plant and Artifact entity types added to EntityType union with full interfaces — foundation for entity lifecycle system in Phase 34+"
  - "Legacy EntityRegistry in shared-types marked @deprecated — to be replaced by @into-the-void/entities"

patterns-established:
  - "Behavior taxonomy pattern: all creature behavior references must use herbivore|omnivore|predator|maniac — old values passive|neutral|aggressive|defensive are invalid"
  - "BiomeType exhaustiveness: every Record<BiomeType,...> must include all 10 biomes or TypeScript compilation fails"

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 33 Plan 01: Foundation Types and Entity Definitions Summary

**Renamed CreatureBehavior to lore-correct herbivore|omnivore|predator|maniac taxonomy, expanded BiomeType to 10 entries with miasma_marshes and petrified_expanse, added plant and artifact EntityType variants with interfaces, and propagated all changes to 9 callsite files**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-18T13:08:56Z
- **Completed:** 2026-02-18T13:12:04Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- CreatureBehavior type corrected from old passive|neutral|aggressive|defensive to lore-mandated herbivore|omnivore|predator|maniac
- BiomeType expanded from 8 to 10 entries; all 12 Record<BiomeType,...> objects in world-gen updated with zero TypeScript errors
- EntityType union gained 'plant' and 'artifact' with full Plant and Artifact interfaces for Phase 34+ entity lifecycle work

## Task Commits

Each task was committed atomically:

1. **Task 1: Update shared-types entity and biome definitions** - `f0f39e0` (feat)
2. **Task 2: Fix downstream compilation errors in world-gen, web, database, and shared-types** - `892f1cb` (feat)

## Files Created/Modified

- `packages/shared-types/src/core/entity.ts` - CreatureBehavior renamed, EntityType expanded, Plant and Artifact interfaces added
- `packages/shared-types/src/game/biome.ts` - BiomeType expanded to 10 entries, BIOME_DISPLAY_NAMES and BIOME_COLORS updated
- `packages/shared-types/src/game/entity-registry.ts` - @deprecated annotation added, behavior values updated to new taxonomy
- `packages/world-gen/src/generation/biome.ts` - getBiomeDangerLevel and getBiomeColor records updated; BiomeGenerator.getBiome() returns new biome types
- `packages/world-gen/src/generation/spawn.ts` - BIOME_SPAWN_CONFIGS updated with miasma_marshes and petrified_expanse entries
- `packages/world-gen/src/generation/terrain.ts` - BIOME_TILES, BIOME_TILE_IDS, BIOME_ELEVATION_RANGES, getWallThreshold, isFeatureBlocking all updated
- `packages/world-gen/src/generation/structures.ts` - BIOME_FEATURE_TILE_IDS and getFeatureTileIdForBiome updated
- `packages/database/src/schema/species.ts` - Column comment updated; seed data behavior values changed to omnivore/predator/maniac
- `apps/web/src/game/rendering/EntityRenderer.ts` - createBehaviorIcon() switch cases changed to lore-correct herbivore|omnivore|predator|maniac

## Decisions Made

- CreatureBehavior lore correction is a breaking change applied in Phase 33 before any entity definitions are written in subsequent phases
- miasma_marshes and petrified_expanse use closest visual tile matches from existing tile set (fungal/void/toxic) — no new sprites required
- Legacy EntityRegistry deprecated rather than removed — downstream may still reference it; removal deferred to cleanup phase

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The `pnpm build` "pruned lockfile" warnings are pre-existing nx infrastructure issues (not TypeScript errors) and the build reports "Successfully ran target build for 9 projects".

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All type foundations in place — Phase 34 (entity-lifecycle) can safely import and use CreatureBehavior, Plant, Artifact, BiomeType
- 12 Record<BiomeType,...> objects all compile cleanly with 10 keys — zero exhaustiveness errors
- Old behavior string values completely absent from codebase (verified by grep)

---
*Phase: 33-foundation-types-and-entity-definitions*
*Completed: 2026-02-18*

## Self-Check: PASSED

- All 9 modified files: FOUND
- Commit f0f39e0: FOUND
- Commit 892f1cb: FOUND
