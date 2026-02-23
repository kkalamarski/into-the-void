---
phase: 78-gathering-mini-game
plan: 02
subsystem: database
tags: [schema, persistence, gathering]
dependency_graph:
  requires: [characters schema, drizzle-orm]
  provides: [gatheringProficiency table, ProficiencyJson interface, DEFAULT_PROFICIENCY]
  affects: [proficiency-service (future), gathering-service (future)]
tech_stack:
  added: []
  patterns: [JSONB storage, cascade delete, unique constraints]
key_files:
  created:
    - packages/database/src/schema/gathering-proficiency.ts
  modified:
    - packages/database/src/schema/index.ts
decisions: []
metrics:
  duration: 130
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  commits: 1
  completed_at: 2026-02-23T13:55:12Z
---

# Phase 78 Plan 02: Database Schema for Gathering Proficiency Summary

**One-liner:** JSONB-backed gathering_proficiency table with per-character proficiency tracking for mining/herbalism/archaeology

## What Was Built

Created persistent storage layer for gathering proficiency system:

1. **gathering_proficiency table** with JSONB proficiency column
2. **ProficiencyJson interface** defining mining/herbalism/archaeology structure
3. **DEFAULT_PROFICIENCY constant** for service initialization (all categories start at level 1, XP 0)
4. **Cascade delete** from characters ensures no orphaned proficiency records
5. **Unique constraint** on characterId prevents duplicate proficiency rows

## Task Breakdown

| Task | Name | Status | Commit | Files |
|------|------|--------|--------|-------|
| 1 | Create gathering_proficiency schema | ✅ Complete | 5db54b4 | gathering-proficiency.ts, index.ts |
| 2 | Push schema to database | ✅ Complete | N/A | N/A (DB unavailable - schema verified via TypeScript) |

## Deviations from Plan

**Database unavailable during execution:**
- **Found during:** Task 2
- **Issue:** PostgreSQL not running (ECONNREFUSED on port 5432)
- **Resolution:** Applied Task 2 fallback per plan instructions - verified schema compiles via `npx tsc --noEmit`
- **Impact:** None - schema will be pushed automatically when database is available or during deployment
- **Rule Applied:** Rule 3 (blocking issue) - handled per plan's explicit instructions

No code deviations - plan executed exactly as written with documented fallback applied.

## Technical Details

### Schema Structure

```typescript
export const gatheringProficiency = pgTable('gathering_proficiency', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' })
    .unique(),
  proficiency: jsonb('proficiency').$type<ProficiencyJson>().notNull().default(DEFAULT_PROFICIENCY),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Key constraints:**
- `characterId` unique → one proficiency row per character
- `onDelete: 'cascade'` → auto-cleanup when character deleted
- JSONB default value → new characters get level 1, XP 0 for all categories

### Type Safety

```typescript
export interface ProficiencyJson {
  mining: { xp: number; level: number };
  herbalism: { xp: number; level: number };
  archaeology: { xp: number; level: number };
}
```

Matches shared-types ProficiencyData interface (created in Phase 78-01).

## Verification Results

✅ All success criteria met:

1. ✅ Database package compiles without errors
2. ✅ `gatheringProficiency` table exports from database package
3. ✅ Schema includes unique constraint on characterId
4. ✅ DEFAULT_PROFICIENCY exported for service use
5. ✅ JSONB proficiency column with ProficiencyJson type
6. ✅ Cascade delete configured for character removal
7. ✅ Export added to index.ts

## Integration Points

**Upstream dependencies:**
- `packages/database/src/schema/characters.ts` - foreign key reference
- `drizzle-orm/pg-core` - schema builder

**Downstream consumers (future):**
- Proficiency service (Phase 78-03) will query/update this table
- Gathering service will award XP and trigger level-ups
- Client proficiency UI will display data from this table

## Self-Check: PASSED

✅ **File exists:**
```bash
[ -f "packages/database/src/schema/gathering-proficiency.ts" ] && echo "FOUND"
```
Result: FOUND

✅ **Export added:**
```bash
grep "export \* from './gathering-proficiency'" packages/database/src/schema/index.ts
```
Result: Found

✅ **Commit exists:**
```bash
git log --oneline --all | grep "5db54b4"
```
Result: 5db54b4 feat(78-02): create gathering_proficiency schema

✅ **Schema compiles:**
```bash
npx tsc --noEmit -p packages/database/tsconfig.json
```
Result: No errors

All files created, export added, commit recorded, schema compiles successfully.
