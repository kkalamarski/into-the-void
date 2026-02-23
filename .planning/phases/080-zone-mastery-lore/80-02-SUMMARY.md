---
phase: 80-zone-mastery-lore
plan: 02
subsystem: database
tags:
  - database
  - schema
  - queries
  - migration
dependency_graph:
  requires:
    - packages/database/src/schema/characters.ts
    - packages/database/src/client.ts
  provides:
    - packages/database/src/schema/collected-lore.ts
    - packages/database/src/schema/zone-mastery.ts
    - packages/database/src/schema/character-rewards.ts
    - packages/database/src/queries/lore.ts
    - packages/database/src/queries/zone-mastery.ts
  affects:
    - packages/database/src/schema/index.ts
    - packages/database/drizzle/0007_mean_catseye.sql
tech_stack:
  added:
    - Drizzle ORM JSONB support for mastery objectives
    - Composite primary keys for lore collection
    - Unique constraints for mastery and rewards
  patterns:
    - Composite PK pattern from discovered-pois.ts
    - JSONB objectives pattern from quest-progress.ts
    - Query function pattern from quests.ts
key_files:
  created:
    - packages/database/src/schema/collected-lore.ts
    - packages/database/src/schema/zone-mastery.ts
    - packages/database/src/schema/character-rewards.ts
    - packages/database/src/queries/lore.ts
    - packages/database/src/queries/zone-mastery.ts
    - packages/database/src/queries/index.ts
    - packages/database/drizzle/0007_mean_catseye.sql
  modified:
    - packages/database/src/schema/index.ts
    - packages/database/drizzle/meta/_journal.json
decisions:
  - Composite PK (characterId, loreId) prevents duplicate lore collection
  - JSONB objectives column in zone_mastery for flexible objective storage
  - Unique constraint on (characterId, biome, tier) prevents duplicate mastery tracking
  - Unique constraint on (characterId, rewardId) prevents duplicate reward grants
  - grantCharacterReward returns null on duplicate (code 23505) instead of throwing
  - All tables cascade delete from characters for automatic cleanup
metrics:
  duration_seconds: 281
  tasks_completed: 2
  files_created: 7
  files_modified: 2
  commits: 2
completed_date: 2026-02-23
---

# Phase 80 Plan 02: Database Schema & Queries Summary

**One-liner:** Database persistence layer with composite-PK lore tracking, JSONB mastery objectives, and unique-constraint reward management

## What Was Built

Created complete database persistence layer for Zone Mastery and Lore Collection system:

### Task 1: Database Schemas (Commit: bfb1057)
- **collected_lore**: Composite PK on (characterId, loreId) prevents duplicate collection
- **zone_mastery**: JSONB objectives with unique constraint on (characterId, biome, tier)
- **character_rewards**: Unique constraint on (characterId, rewardId) prevents duplicate unlocks
- All schemas export proper TypeScript types via Drizzle ORM inference

### Task 2: Query Functions & Migration (Commit: 5d1efbd)
- **Lore queries**: getCollectedLore, hasCollectedLore, collectLore, markLoreRead, getCollectedLoreIds
- **Mastery queries**: getActiveZoneMastery, getAllZoneMastery, createZoneMastery, updateMasteryObjectives, completeMastery
- **Reward queries**: getCharacterRewards, grantCharacterReward (null on duplicate), hasCharacterReward
- **Migration**: 0007_mean_catseye.sql creates 3 new tables with foreign keys and constraints

## Technical Implementation

### Schema Design Patterns
```typescript
// Composite PK prevents duplicate collection (from discovered-pois pattern)
collectedLore: primaryKey({ columns: [table.characterId, table.loreId] })

// JSONB objectives for flexible mastery tracking (from quest-progress pattern)
export interface MasteryObjectiveJson {
  objectiveType: 'discover_pois' | 'gather_resources' | 'kill_creatures';
  current: number;
  required: number;
  complete: boolean;
}

// Unique constraint prevents duplicate mastery per tier
uniqueCharacterBiomeTier: unique().on(characterId, biome, tier)
```

### Query Error Handling
```typescript
// grantCharacterReward gracefully handles duplicates
try {
  return await db.insert(characterRewards).values(data).returning();
} catch (error: any) {
  if (error.code === '23505') return null; // Already granted
  throw error;
}
```

### Migration Coverage
- 3 new tables: collected_lore, zone_mastery, character_rewards
- Foreign keys with CASCADE DELETE for orphan cleanup
- Composite and unique constraints enforced at DB level
- JSONB columns for flexible objective storage

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

### Required By
- Phase 80-03: Game-server lore collection service
- Phase 80-04: Game-server zone mastery tracking service
- Phase 80-05: Client lore codex UI
- Phase 80-06: Client mastery progress UI

### Provides
- Type-safe database access for lore collection
- Type-safe database access for zone mastery tracking
- Type-safe database access for character reward management
- Migration for production deployment

### Affects
- All future lore and mastery features depend on these schemas
- Character deletion will cascade to lore/mastery/rewards

## Verification Results

### Build Verification
```bash
npx nx run database:build  # ✓ Passed
pnpm build --filter=database  # ✓ Passed
```

### Schema Exports
```bash
grep -E "collected-lore|zone-mastery|character-rewards" packages/database/src/schema/index.ts
# ✓ All three schemas exported
```

### Migration Generation
```bash
pnpm db:generate
# ✓ 0007_mean_catseye.sql created
# ✓ 21 tables detected (18 existing + 3 new)
```

### Query Exports
```bash
cat packages/database/src/queries/index.ts
# ✓ export * from './lore';
# ✓ export * from './zone-mastery';
```

## Files Modified

### Created (7 files)
1. `packages/database/src/schema/collected-lore.ts` - Lore collection schema
2. `packages/database/src/schema/zone-mastery.ts` - Mastery tracking schema
3. `packages/database/src/schema/character-rewards.ts` - Reward management schema
4. `packages/database/src/queries/lore.ts` - Lore query functions
5. `packages/database/src/queries/zone-mastery.ts` - Mastery/reward query functions
6. `packages/database/src/queries/index.ts` - Query module exports
7. `packages/database/drizzle/0007_mean_catseye.sql` - Database migration

### Modified (2 files)
1. `packages/database/src/schema/index.ts` - Added new schema exports
2. `packages/database/drizzle/meta/_journal.json` - Migration tracking

## Performance & Quality

### Metrics
- **Duration**: 281 seconds (~4.7 minutes)
- **Tasks**: 2/2 completed
- **Files**: 7 created, 2 modified
- **Commits**: 2 atomic commits
- **Build**: No errors, warnings acceptable (lockfile pruning)

### Type Safety
- All schemas use Drizzle ORM type inference
- Query functions use DbClient type from database package
- JSONB types explicitly defined via TypeScript interfaces

### Database Constraints
- Composite primary keys prevent duplicate collection
- Unique constraints prevent duplicate mastery/rewards
- Foreign keys ensure referential integrity
- Cascade deletes prevent orphaned records

## Next Steps

1. **Phase 80-03**: Implement game-server lore collection service
2. **Phase 80-04**: Implement game-server zone mastery tracking service
3. **Apply migration**: Run `pnpm db:push` when PostgreSQL is ready
4. **Integration testing**: Verify queries work with real database

## Self-Check: PASSED

### Files Created
```bash
[ -f "packages/database/src/schema/collected-lore.ts" ] && echo "FOUND"  # ✓ FOUND
[ -f "packages/database/src/schema/zone-mastery.ts" ] && echo "FOUND"    # ✓ FOUND
[ -f "packages/database/src/schema/character-rewards.ts" ] && echo "FOUND" # ✓ FOUND
[ -f "packages/database/src/queries/lore.ts" ] && echo "FOUND"           # ✓ FOUND
[ -f "packages/database/src/queries/zone-mastery.ts" ] && echo "FOUND"   # ✓ FOUND
[ -f "packages/database/drizzle/0007_mean_catseye.sql" ] && echo "FOUND" # ✓ FOUND
```

### Commits Exist
```bash
git log --oneline | grep "bfb1057"  # ✓ FOUND: feat(80-02): add database schemas
git log --oneline | grep "5d1efbd"  # ✓ FOUND: feat(80-02): add query functions
```

All files created and commits verified. Plan execution complete.
