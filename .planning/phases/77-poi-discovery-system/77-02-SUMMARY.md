---
phase: 77-poi-discovery-system
plan: 02
subsystem: database
tags: [schema, migration, poi, discovery]
dependency_graph:
  requires:
    - packages/database/src/schema/characters.ts (foreign key reference)
  provides:
    - discovered_pois table schema
    - DiscoveredPoi and NewDiscoveredPoi types
  affects:
    - Future POI discovery services will use this schema
decisions:
  - Composite primary key (characterId, poiId) prevents re-discovery exploits
  - poiId format: poi_${chunkX}_${chunkY}_${index} (100 char limit)
  - poiType varchar(20) supports: anomaly, cache, landmark
tech_stack:
  added:
    - discovered_pois table with Drizzle ORM
  patterns:
    - Composite primary key for uniqueness constraint
    - Cascade delete for data integrity
key_files:
  created:
    - packages/database/src/schema/discovered-pois.ts
    - packages/database/drizzle/0006_round_madelyne_pryor.sql
  modified:
    - packages/database/src/schema/index.ts
metrics:
  duration: 93
  completed_date: 2026-02-23
---

# Phase 77 Plan 02: POI Discovery Schema Summary

**One-liner:** Composite primary key discovery tracking table with cascade delete for POI persistence

## Objective

Create database schema for POI discovery tracking to prevent re-discovery exploits by enforcing one discovery per character per POI.

## Execution Summary

### Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Create discovered_pois table schema | ✓ Complete | 20a878d |
| 2 | Generate and push database migration | ✓ Complete | c22900d |

### What Was Built

**discovered_pois table schema:**
- Composite primary key on (characterId, poiId) prevents duplicate discoveries
- Foreign key reference to characters table with cascade delete
- Tracks poiType (anomaly, cache, landmark) and discoveredAt timestamp
- poiId format supports procedural generation: `poi_${chunkX}_${chunkY}_${index}`

**Database migration:**
- Migration 0006 created for discovered_pois table
- Primary key constraint: `discovered_pois_character_id_poi_id_pk`
- Foreign key constraint with ON DELETE cascade ensures cleanup

**Exported types:**
- `DiscoveredPoi` - Select type for queries
- `NewDiscoveredPoi` - Insert type for new discoveries

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

**1. Composite Primary Key Pattern**
- **Decision:** Use composite primary key (characterId, poiId) instead of separate unique constraint
- **Rationale:** More efficient index usage, prevents duplicate discoveries at database level
- **Pattern:** Follows existing `discoveredSpecies` table pattern from packages/database/src/schema/discoveries.ts

**2. poiId Format**
- **Decision:** varchar(100) to support format `poi_${chunkX}_${chunkY}_${index}`
- **Rationale:** Chunk coordinates can be large (-100k to +100k), index distinguishes multiple POIs per chunk
- **Example:** `poi_-12345_67890_2` fits within 100 chars with room for future expansion

**3. Cascade Delete**
- **Decision:** ON DELETE cascade from characters to discovered_pois
- **Rationale:** Discovery records are meaningless without character, automatic cleanup prevents orphaned data
- **Impact:** Character deletion removes all associated discovery records

## Verification Results

✓ TypeScript compilation passes for database package
✓ Schema file exports DiscoveredPoi and NewDiscoveredPoi types
✓ Table has composite primary key on (characterId, poiId)
✓ Foreign key references characters.id with cascade delete
✓ Migration file created: 0006_round_madelyne_pryor.sql

## Self-Check

Verifying all claimed files and commits exist:

```
FOUND: packages/database/src/schema/discovered-pois.ts
FOUND: packages/database/drizzle/0006_round_madelyne_pryor.sql
FOUND: commit 20a878d
FOUND: commit c22900d
```

**Result:** PASSED - All files and commits verified
