---
phase: 33-foundation-types-and-entity-definitions
plan: 02
subsystem: entity-registry
tags: [typescript, discriminated-union, singleton-registry, nx, esbuild, workspace-package]

# Dependency graph
requires:
  - phase: 33-01
    provides: "BiomeType (with miasma_marshes/petrified_expanse) and CreatureBehavior (herbivore|omnivore|predator|maniac) in shared-types"
provides:
  - "@into-the-void/entities workspace package with NX build config"
  - "EntityDefinition discriminated union (CreatureDefinition, PlantDefinition, MineralDefinition, ArtifactDefinition)"
  - "EntityRegistry singleton with get, has, getByBiome, getByClass methods"
  - "Path alias @into-the-void/entities in tsconfig.base.json"
affects:
  - "33-03 (entity definitions consume EntityRegistry.registerAll)"
  - "34 (ZonesService imports EntityRegistry for createEntityFromSpawn)"
  - "35 (loot tables reference lootTableId convention from EntityDefinition)"
  - "36-38 (all downstream phases that import @into-the-void/entities)"

# Tech tracking
tech-stack:
  added: ["@into-the-void/entities workspace package"]
  patterns:
    - "Discriminated union via entityClass literal field (mirrors ItemDefinition category pattern)"
    - "Singleton registry pattern (EntityRegistryImpl mirrors ItemRegistryImpl exactly)"
    - "Fallback entity on unknown ID (prevents runtime crashes in downstream consumers)"
    - "HarvestYield interface shared between plant and mineral yield arrays"
    - "lootTableId convention: format loot_<entity_id> for Phase 35 compatibility"

key-files:
  created:
    - packages/entities/package.json
    - packages/entities/project.json
    - packages/entities/tsconfig.lib.json
    - packages/entities/src/types.ts
    - packages/entities/src/registry.ts
    - packages/entities/src/index.ts
  modified:
    - tsconfig.base.json

key-decisions:
  - "packages/entities mirrors packages/items exactly - same package.json shape, project.json executor, tsconfig.lib.json, and registry singleton pattern"
  - "ArtifactDefinition.respawns is typed as literal false (not boolean) - enforces one-time discovery at the type level"
  - "src/definitions/ directory created but intentionally empty - populated in Plan 33-03"
  - "index.ts registration code commented out - will be uncommented in 33-03 when ALL_ENTITIES constant exists"

patterns-established:
  - "EntityClass discriminator: 'creature' | 'plant' | 'mineral' | 'artifact' (string literal union for runtime narrowing)"
  - "BaseEntityDefinition: all entities share id, displayName, description, entityClass, biomes, textureKey, color, lootTableId"
  - "color field is hex number (e.g., 0xff00ff) for Phaser color fallback when sprite missing"

# Metrics
duration: 5min
completed: 2026-02-18
---

# Phase 33 Plan 02: entities Package — Entity Types and Registry Summary

**@into-the-void/entities workspace package with EntityDefinition discriminated union (creature/plant/mineral/artifact) and EntityRegistry singleton using get/getByBiome/getByClass query methods**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T13:14:27Z
- **Completed:** 2026-02-18T13:19:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created packages/entities workspace package mirroring packages/items structure exactly
- Implemented EntityDefinition discriminated union with four subtypes (CreatureDefinition, PlantDefinition, MineralDefinition, ArtifactDefinition)
- Implemented EntityRegistryImpl singleton with register, registerAll, get, has, getAllIds, getByBiome, getByClass, size
- Added @into-the-void/entities path alias to tsconfig.base.json
- NX build passes: pnpm exec nx run entities:build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Create packages/entities directory structure and config files** - `34a98e1` (chore)
2. **Task 2: Create entity types and registry implementation** - `607a1f2` (feat)

**Plan metadata:** (to be committed with SUMMARY.md and STATE.md)

## Files Created/Modified
- `packages/entities/package.json` - Workspace package manifest for @into-the-void/entities
- `packages/entities/project.json` - NX project with esbuild/lint/test targets
- `packages/entities/tsconfig.lib.json` - TypeScript config extending tsconfig.base.json
- `packages/entities/src/types.ts` - EntityDefinition discriminated union and all subtypes
- `packages/entities/src/registry.ts` - EntityRegistryImpl singleton class and exported instance
- `packages/entities/src/index.ts` - Barrel exports for types and EntityRegistry
- `tsconfig.base.json` - Added @into-the-void/entities path alias

## Decisions Made
- packages/entities mirrors packages/items exactly for consistency across workspace packages
- ArtifactDefinition.respawns typed as literal `false` (not boolean) - type-level enforcement of one-time discovery rule
- src/definitions/ directory created empty - definitions population deferred to Plan 33-03
- Index registration code commented out pending 33-03 ALL_ENTITIES constant

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- NX build emits a lockfile pruning warning (workspace package not found in root lock file) and a generatePackageJson deprecation warning - both are pre-existing issues present in the items package build as well. Build completes successfully.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- @into-the-void/entities is importable from all workspace packages via path alias
- EntityRegistry singleton ready for registerAll() call in Plan 33-03
- src/definitions/ directory ready to receive entity definition files in Plan 33-03
- Plan 33-03 must: create creature/plant/mineral/artifact definition files, export ALL_ENTITIES, and uncomment registration in index.ts

---
*Phase: 33-foundation-types-and-entity-definitions*
*Completed: 2026-02-18*

## Self-Check: PASSED

All 7 files verified present. Both task commits (34a98e1, 607a1f2) confirmed in git log.
