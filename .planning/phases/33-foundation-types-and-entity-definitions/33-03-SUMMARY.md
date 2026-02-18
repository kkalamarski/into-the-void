---
phase: 33-foundation-types-and-entity-definitions
plan: 03
subsystem: entity-system
tags: [entities, registry, spawn, world-gen, biomes, loot-tables]

# Dependency graph
requires:
  - phase: 33-02
    provides: "@into-the-void/entities package with EntityRegistry singleton and EntityDefinition discriminated union types"
provides:
  - "35 entity definitions registered in EntityRegistry at module load time"
  - "ENTITY_IDS const object for type-safe entity ID references"
  - "BIOME_SPAWN_CONFIGS using ENTITY_IDS constants (no hardcoded strings)"
  - "ALL_ENTITIES array combining creatures, plants, minerals, artifacts"
affects:
  - "Phase 34: entity lifecycle (createEntityFromSpawn uses ENTITY_IDS and EntityRegistry.get)"
  - "Phase 35: loot tables (lootTableId references follow loot_<entity_id> convention)"
  - "Phase 36: AI tick (creature behavior types drive AI state machine)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "entity-ids-const: ENTITY_IDS as const object prevents typos, enables autocomplete"
    - "auto-registration: EntityRegistry.registerAll(ALL_ENTITIES) on module import"
    - "loot-table-convention: lootTableId = 'loot_' + entity_id for Phase 35 forward-reference"

key-files:
  created:
    - packages/entities/src/definitions/creatures.ts
    - packages/entities/src/definitions/plants.ts
    - packages/entities/src/definitions/minerals.ts
    - packages/entities/src/definitions/artifacts.ts
    - packages/entities/src/definitions/index.ts
  modified:
    - packages/entities/src/index.ts
    - packages/world-gen/src/generation/spawn.ts
    - packages/world-gen/package.json

key-decisions:
  - "BIOME_SPAWN_CONFIGS reduced to one primary creature and mineral per biome (from two) - reduces scope creep, Phase 34 can add richer configs with real entity IDs"
  - "CREATURE_VOID_HORROR spans ancient_ruins + starfall_crater - single maniac-class entity covers two Tier IV biomes as per lore"
  - "ARTIFACT_PRESERVED_SPECIMEN spans petrified_expanse + frozen_expanse - both biomes share preservation theme"

patterns-established:
  - "Entity files pattern: one entity class per file (creatures.ts, plants.ts, minerals.ts, artifacts.ts)"
  - "Export pattern: each file exports named constants + ALL_<TYPE> readonly array"
  - "ID convention: entity id = entity_<species_name>, lootTableId = loot_<entity_id>"

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 33 Plan 03: Entity Definitions Summary

**35 entity definitions (10 creatures, 10 plants, 10 minerals, 5 artifacts) registered in EntityRegistry with ENTITY_IDS constants replacing hardcoded strings in BIOME_SPAWN_CONFIGS**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-18T13:18:53Z
- **Completed:** 2026-02-18T13:26:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Created 35 entity definitions covering all 10 biomes with lore-correct behavior types, biome assignments, and lootTableId forward-references
- Established ENTITY_IDS const object providing type-safe, autocomplete-friendly entity ID access for all 35 entities
- Updated BIOME_SPAWN_CONFIGS in world-gen/spawn.ts to use ENTITY_IDS constants eliminating all hardcoded strings
- Enabled auto-registration: importing `@into-the-void/entities` now registers all entities in EntityRegistry at module load

## Task Commits

Each task was committed atomically:

1. **Task 1: Creature definitions (10 creatures, all biomes)** - `32b903c` (feat)
2. **Task 2: Plant and mineral definitions (10 each, all biomes)** - `effb673` (feat)
3. **Task 3: Artifacts, definitions index, entity index, spawn configs** - `01bc6a5` (feat)

**Plan metadata:** (final commit after SUMMARY/STATE)

## Files Created/Modified
- `packages/entities/src/definitions/creatures.ts` - 10 creature definitions with behavior, health, levelRange, baseXp
- `packages/entities/src/definitions/plants.ts` - 10 plant definitions with harvestYield arrays and respawnSeconds
- `packages/entities/src/definitions/minerals.ts` - 10 mineral definitions with miningYield, requiredTier, respawnSeconds
- `packages/entities/src/definitions/artifacts.ts` - 5 artifact definitions with rarity and respawns: false
- `packages/entities/src/definitions/index.ts` - ALL_ENTITIES array, ENTITY_IDS const, re-exports
- `packages/entities/src/index.ts` - uncommented auto-registration via EntityRegistry.registerAll(ALL_ENTITIES)
- `packages/world-gen/src/generation/spawn.ts` - BIOME_SPAWN_CONFIGS now uses ENTITY_IDS.* constants
- `packages/world-gen/package.json` - added @into-the-void/entities workspace dependency

## Decisions Made
- BIOME_SPAWN_CONFIGS reduced from two entries per category to one primary entry per biome. The old hardcoded IDs (void_stalker, crystal_sentinel, etc.) did not correspond to real entity definitions. Keeping only the new ENTITY_IDS-backed entries ensures BIOME_SPAWN_CONFIGS references only IDs present in the registry.
- CREATURE_VOID_HORROR covers both ancient_ruins and starfall_crater biomes as a single maniac-class entity, consistent with lore (anomaly-corrupted abomination, no regard for self-preservation).
- ARTIFACT_PRESERVED_SPECIMEN spans petrified_expanse and frozen_expanse — both biomes share natural preservation characteristics and the lore requirement for artifacts in those biomes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BIOME_SPAWN_CONFIGS reduced to one entry per biome instead of two**
- **Found during:** Task 3 (spawn.ts update)
- **Issue:** The plan showed keeping some old hardcoded IDs (void_stalker, crystal_shard, etc.) alongside new ENTITY_IDS entries. However those old IDs have no corresponding entity definitions in the registry — EntityRegistry.get() would return the fallback unknown entity for them.
- **Fix:** Removed all entries referencing undefined entity IDs. Each biome now has one creature and one mineral from ENTITY_IDS.
- **Files modified:** packages/world-gen/src/generation/spawn.ts
- **Verification:** All IDs in BIOME_SPAWN_CONFIGS correspond to entries in ENTITY_IDS
- **Committed in:** 01bc6a5 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: spawn configs referencing undefined entity IDs)
**Impact on plan:** Fix was necessary for must_have truth "BIOME_SPAWN_CONFIGS references only entity IDs present in the registry". No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EntityRegistry.get(entityId) works for all 35 entities — Phase 34 (entity lifecycle) can immediately use this
- ENTITY_IDS const available for Phase 34 createEntityFromSpawn() to construct entity instances
- lootTableId convention established (loot_<entity_id>) — Phase 35 loot tables can use these references
- BIOME_SPAWN_CONFIGS correctly references only valid entity IDs — Phase 34 spawn system is unblocked

---
*Phase: 33-foundation-types-and-entity-definitions*
*Completed: 2026-02-18*

## Self-Check: PASSED

Files verified:
- FOUND: packages/entities/src/definitions/creatures.ts
- FOUND: packages/entities/src/definitions/plants.ts
- FOUND: packages/entities/src/definitions/minerals.ts
- FOUND: packages/entities/src/definitions/artifacts.ts
- FOUND: packages/entities/src/definitions/index.ts

Commits verified:
- FOUND: 01bc6a5 (feat: artifacts, index, auto-registration, spawn configs)
- FOUND: effb673 (feat: plants and minerals)
- FOUND: 32b903c (feat: creatures)

Build verified: `pnpm build` and `pnpm exec nx run entities:build` both succeeded.
