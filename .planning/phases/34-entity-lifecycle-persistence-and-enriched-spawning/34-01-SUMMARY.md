---
phase: 34-entity-lifecycle-persistence-and-enriched-spawning
plan: 01
subsystem: database
tags: [drizzle, postgres, entity-lifecycle, zones, entity-registry, nestjs]

# Dependency graph
requires:
  - phase: 33-entity-types-definitions-and-registry
    provides: EntityRegistry singleton with CreatureDefinition, MineralDefinition, PlantDefinition, ArtifactDefinition
provides:
  - entity_lifecycle Drizzle table (entityId PK, zoneId, killedAt, respawnAt)
  - enriched createEntityFromSpawn() using EntityRegistry.get()
  - lifecycle-aware async loadZone() that suppresses dead entities
  - recordEntityKill() method for Phase 35 integration
  - getEntitiesAtPosition() helper for entity blocking
affects:
  - 35-loot-interaction-and-respawn
  - 36-ai-tick-and-creature-behavior

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "entity_lifecycle table uses entityId (globally unique compound key) as PK — no composite key needed"
    - "FAR_FUTURE sentinel date (2100-01-01) for artifact respawnAt — type-level one-time discovery enforcement"
    - "deterministic level derivation via djb2-style hash of worldSeed + entityId — reproducible without RNG state"
    - "loadZone() queries lifecycle DB first, builds suppressed Set, skips dead entities before spawn creation"

key-files:
  created:
    - packages/database/src/schema/entity-lifecycle.ts
    - packages/database/drizzle/0001_useful_the_call.sql
    - packages/database/drizzle/meta/0001_snapshot.json
  modified:
    - packages/database/src/schema/index.ts
    - apps/game-server/src/zones/zones.module.ts
    - apps/game-server/src/zones/zones.service.ts

key-decisions:
  - "entity_lifecycle uses entityId (zoneId_spawnId_x_y format) as PK — globally unique, eliminates composite key"
  - "FAR_FUTURE (2100-01-01) used as artifact respawnAt sentinel rather than nullable column — simpler queries"
  - "Deterministic level from hash(worldSeed + entityId) — no RNG state needed, reproducible per seed"
  - "Plant and Artifact branches in createEntityFromSpawn() are forward-compatibility stubs — world-gen not yet producing those entityTypes"
  - "DatabaseModule is @Global() so explicit import in ZonesModule is belt-and-suspenders but harmless"

patterns-established:
  - "Entity enrichment pattern: EntityRegistry.get(spawn.spawnId) returns definition, cast by entityClass discriminant"
  - "Lifecycle suppression pattern: query DB on zone load, build Set<entityId>, skip suppressed spawns"

# Metrics
duration: 12min
completed: 2026-02-18
---

# Phase 34 Plan 01: Entity Lifecycle Persistence and Enriched Spawning Summary

**entity_lifecycle DB table with Drizzle migration, EntityRegistry-driven createEntityFromSpawn() returning typed Creature/Mineral/Plant/Artifact with health, speciesId, and behavior, plus async lifecycle-aware loadZone() that suppresses dead-but-not-yet-respawned entities**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-18T15:05:34Z
- **Completed:** 2026-02-18T15:17:00Z
- **Tasks:** 1
- **Files modified:** 7

## Accomplishments

- Created `entity_lifecycle` Drizzle table with entityId PK (varchar 200), zoneId, killedAt, respawnAt (both timestamptz) and exported EntityLifecycle/NewEntityLifecycle types
- Rewrote `createEntityFromSpawn()` to call `EntityRegistry.get(spawn.spawnId)` and return fully typed Creature/Mineral/Plant/Artifact entities with registry-derived fields (health, speciesId, behavior, requiredTier, rarity)
- Made `loadZone()` async with DB query to suppress entities whose `respawnAt > now`, ensuring killed entities do not reappear until their timer elapses — survives server restarts via DB persistence
- Added `recordEntityKill()` method (upsert via onConflictDoUpdate) for Phase 35 to call after combat/harvest
- Added `getEntitiesAtPosition()` helper and deterministic level derivation for creatures

## Task Commits

Each task was committed atomically:

1. **Task 1: Create entity_lifecycle DB table and enrich createEntityFromSpawn** - `316adc5` (feat)

**Plan metadata:** [pending]

## Files Created/Modified

- `packages/database/src/schema/entity-lifecycle.ts` - Drizzle pgTable definition for entity kill/respawn persistence
- `packages/database/src/schema/index.ts` - Added `export * from './entity-lifecycle'`
- `packages/database/drizzle/0001_useful_the_call.sql` - Migration creating entity_lifecycle table
- `apps/game-server/src/zones/zones.module.ts` - Added DatabaseModule to imports array
- `apps/game-server/src/zones/zones.service.ts` - Full rewrite with async loadZone(), enriched createEntityFromSpawn(), recordEntityKill(), getEntitiesAtPosition()

## Decisions Made

- entityId as varchar(200) PK covers the `zoneId_spawnId_x_y` format with room to spare — no composite key needed
- FAR_FUTURE (2100-01-01) used as artifact respawnAt sentinel — cleaner than nullable, simpler suppression queries
- Deterministic level derived via djb2-style hash of worldSeed + entityId — reproducible levels without RNG state, consistent across zone evictions and server restarts
- Plant and Artifact branches in createEntityFromSpawn() are stubbed for forward compatibility — world-gen does not yet produce those entityTypes; no runtime path exercises them yet

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The Nx "pruned lockfile" warning for @into-the-void/entities is a pre-existing non-fatal Nx internal issue (it returns the root lock file as fallback and builds succeed regardless).

## User Setup Required

None - no external service configuration required. Migration applied automatically via `pnpm db:migrate`.

## Next Phase Readiness

- Phase 35 (loot, interaction, respawn) can now call `ZonesService.recordEntityKill(entityId, zoneId, respawnSeconds)` directly after kill/harvest events
- `entity_lifecycle` table is live in the database and ready for writes
- Creature entities now carry maxHealth from registry — combat damage calculation in Phase 35 can use this field
- Plant and Artifact spawning stubs are in place for when world-gen adds those entityTypes

---
*Phase: 34-entity-lifecycle-persistence-and-enriched-spawning*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: packages/database/src/schema/entity-lifecycle.ts
- FOUND: packages/database/drizzle/0001_useful_the_call.sql
- FOUND: apps/game-server/src/zones/zones.service.ts
- FOUND: .planning/phases/34-entity-lifecycle-persistence-and-enriched-spawning/34-01-SUMMARY.md
- FOUND: commit 316adc5
