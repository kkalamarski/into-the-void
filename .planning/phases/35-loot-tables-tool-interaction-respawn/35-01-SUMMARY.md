---
phase: 35-loot-tables-tool-interaction-respawn
plan: 01
subsystem: database
tags: [drizzle, postgresql, loot-tables, game-logic, ground-items]

# Dependency graph
requires:
  - phase: 34-entity-lifecycle-persistence
    provides: entity_lifecycle DB table and createEntityFromSpawn() enrichment
  - phase: 33-entity-types-and-registry
    provides: HarvestYield type and creature definitions with lootTableId fields

provides:
  - ground_items Drizzle table with migration (zone-scoped, persists across restarts)
  - loot_tables Drizzle table with migration (LOOT-01 requirement satisfied)
  - loot_table_entries Drizzle table with migration (composite PK on tableId+itemId)
  - rollLootTable(HarvestYield[]) pure function in game-logic
  - CREATURE_LOOT_TABLES static map (all 10 creatures, Tier I-IV)
  - getCreatureLoot(lootTableId) helper function
  - seedLootTables(Map) seed script in database package

affects:
  - 35-02 (tool interaction — uses rollLootTable for harvest yields)
  - 35-03 (respawn — uses ground_items for loot persistence)
  - any future phase implementing creature kill handling

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Code-first loot: CREATURE_LOOT_TABLES is runtime source of truth, DB mirrors for admin tooling"
    - "Parameterized seed functions: avoids circular package dependencies"
    - "rollLootTable as pure function: deterministic given fixed RNG, fully testable"

key-files:
  created:
    - packages/database/src/schema/ground-items.ts
    - packages/database/src/schema/loot-tables.ts
    - packages/database/src/seed/seed-loot-tables.ts
    - packages/game-logic/src/loot/loot-table.ts
    - packages/game-logic/src/loot/creature-loot.ts
    - packages/database/drizzle/0002_fair_viper.sql
    - packages/database/drizzle/0003_cuddly_phantom_reporter.sql
  modified:
    - packages/database/src/schema/index.ts
    - packages/game-logic/src/index.ts

key-decisions:
  - "Seed script accepts Map parameter instead of importing CREATURE_LOOT_TABLES directly — avoids circular dependency: database -> game-logic -> database"
  - "CREATURE_LOOT_TABLES is runtime source of truth (in-memory, no DB query per kill); DB tables exist for admin tooling and future dynamic config"
  - "rollLootTable is a pure function — each HarvestYield entry evaluated independently, multiple items can drop per roll"

patterns-established:
  - "Loot tables: code-defined Map<string, readonly HarvestYield[]> keyed by 'loot_<entity_id>' pattern"
  - "Ground items: id format 'item_<uuid>', zoneId column for zone-scoped queries"

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 35 Plan 01: Loot Tables and Ground Items Persistence Summary

**Drizzle ground_items, loot_tables, and loot_table_entries tables with migrations plus rollLootTable() pure function and 10-creature CREATURE_LOOT_TABLES static map**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-18T10:16:43Z
- **Completed:** 2026-02-18T10:24:31Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Created ground_items DB table (id, zoneId, itemId, quantity, x, y, despawnAt, createdAt) — loot survives zone eviction and server restarts
- Created loot_tables and loot_table_entries DB tables satisfying LOOT-01 requirement; composite PK on (tableId, itemId)
- Implemented rollLootTable() pure function accepting HarvestYield[] and returning InventoryItemJson[] with weighted random drops
- Defined CREATURE_LOOT_TABLES covering all 10 creatures (Tier I-IV) with biome-appropriate item drops from the items registry
- Added getCreatureLoot(lootTableId) helper for safe lookup with empty-array fallback
- Created parameterized seedLootTables() that accepts Map data to avoid circular dependency

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ground_items Drizzle table schema** - `fcfb140` (feat)
2. **Task 2: Create rollLootTable pure function and creature loot maps** - `0d6ab90` (feat)
3. **Task 3: Create loot_tables and loot_table_entries DB schema with seed** - `2d38038` (feat)

## Files Created/Modified

- `packages/database/src/schema/ground-items.ts` - ground_items table with GroundItem/NewGroundItem types
- `packages/database/src/schema/loot-tables.ts` - loot_tables and loot_table_entries tables with all four types
- `packages/database/src/schema/index.ts` - Added exports for ground-items and loot-tables
- `packages/database/src/seed/seed-loot-tables.ts` - Parameterized seed function for loot table population
- `packages/database/drizzle/0002_fair_viper.sql` - Migration for ground_items
- `packages/database/drizzle/0003_cuddly_phantom_reporter.sql` - Migration for loot_tables and loot_table_entries
- `packages/game-logic/src/loot/loot-table.ts` - rollLootTable() pure function
- `packages/game-logic/src/loot/creature-loot.ts` - CREATURE_LOOT_TABLES and getCreatureLoot()
- `packages/game-logic/src/index.ts` - Added exports for loot submodules

## Decisions Made

- **Parameterized seed script:** The original plan had seedLootTables() import CREATURE_LOOT_TABLES directly from @into-the-void/game-logic. This creates a circular dependency (database -> game-logic -> database). Fixed by making seedLootTables() accept a Map parameter; callers (e.g., game-server) pass CREATURE_LOOT_TABLES at call time.
- **CREATURE_LOOT_TABLES as runtime source of truth:** DB tables mirror the code for admin tooling only. Runtime loot resolution always uses the in-memory Map (no DB query per creature kill).
- **rollLootTable independence:** Each HarvestYield entry is evaluated independently — multiple items can drop in a single roll, matching the HarvestYield semantics established in Phase 33.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed circular dependency in seed script**
- **Found during:** Task 3 (Create loot_tables and loot_table_entries DB schema with seed)
- **Issue:** Plan specified `seedLootTables()` importing CREATURE_LOOT_TABLES from @into-the-void/game-logic. Running `nx run database:build` failed with "circular dependency: database:build --> game-logic:build --> database:build"
- **Fix:** Changed seedLootTables() to accept `Map<string, readonly SeedLootEntry[]>` as parameter; callers pass the data. SeedLootEntry interface defined inline to avoid cross-package import.
- **Files modified:** packages/database/src/seed/seed-loot-tables.ts
- **Verification:** `tsc --noEmit` in database package passes; full `pnpm build` succeeds without circular dep error
- **Committed in:** `2d38038` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — circular package dependency)
**Impact on plan:** Fix preserves full API surface; callers provide the data instead of the seed importing it. No functionality lost, seeding still possible from any caller that has CREATURE_LOOT_TABLES in scope.

## Issues Encountered

- NX lockfile pruning warnings on build ("Pruned lock file creation failed... @into-the-void/shared-types@workspace:*") — these are pre-existing NX workspace configuration warnings, not TypeScript errors. Builds complete successfully.

## User Setup Required

None - no external service configuration required. Migrations run via `pnpm db:migrate`.

## Next Phase Readiness

- ground_items table ready for Phase 35 Plan 02 (tool interaction) to persist dropped loot
- loot_tables/loot_table_entries ready for admin tooling (future feature)
- rollLootTable() and getCreatureLoot() ready for use in combat/harvest handlers
- CREATURE_LOOT_TABLES ready to pass to seedLootTables() for DB population

---
*Phase: 35-loot-tables-tool-interaction-respawn*
*Completed: 2026-02-18*

## Self-Check: PASSED

All artifacts verified:
- FOUND: packages/database/src/schema/ground-items.ts
- FOUND: packages/database/src/schema/loot-tables.ts
- FOUND: packages/game-logic/src/loot/loot-table.ts
- FOUND: packages/game-logic/src/loot/creature-loot.ts
- FOUND: packages/database/src/seed/seed-loot-tables.ts
- FOUND: 35-01-SUMMARY.md
- FOUND: fcfb140 (Task 1 commit)
- FOUND: 0d6ab90 (Task 2 commit)
- FOUND: 2d38038 (Task 3 commit)
