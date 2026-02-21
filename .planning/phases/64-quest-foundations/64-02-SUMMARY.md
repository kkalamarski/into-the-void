---
phase: 64-quest-foundations
plan: 02
subsystem: database
tags: [quest-system, database, schema, queries, JSONB]
dependency_graph:
  requires:
    - packages/database/src/schema/characters.ts (foreign key reference)
    - packages/database/src/schema/inventories.ts (JSONB pattern reference)
  provides:
    - quest_progress table with JSONB objectives storage
    - Quest query functions for CRUD operations
  affects:
    - Future quest tracking services (Phase 65)
    - Quest reward system (Phase 66)
tech_stack:
  added: []
  patterns:
    - JSONB for flexible objective storage
    - UNIQUE constraint for duplicate prevention
    - CASCADE delete on foreign key
key_files:
  created:
    - packages/database/src/schema/quest-progress.ts
    - packages/database/src/queries/quests.ts
    - packages/database/drizzle/0004_magenta_mephisto.sql
  modified:
    - packages/database/src/schema/index.ts
    - packages/database/src/index.ts
decisions:
  - choice: "Use JSONB for objectives storage"
    rationale: "Allows flexible objective types (kill/gather/explore) without schema changes"
  - choice: "UNIQUE constraint on (characterId, questId)"
    rationale: "Prevents duplicate quest entries and reward farming"
  - choice: "CASCADE delete on character foreign key"
    rationale: "Automatically clean up quest progress when character is deleted"
metrics:
  duration_seconds: 251
  tasks_completed: 2
  files_created: 3
  files_modified: 2
  commits: 2
  completed_date: "2026-02-22"
---

# Phase 64 Plan 02: Quest Progress Database Summary

**One-liner:** Quest progress table with JSONB objectives and UNIQUE constraint preventing duplicate completions.

## What Was Built

Created the database foundation for quest tracking:

1. **quest_progress table** - Stores player quest state with:
   - JSONB `objectives` column for flexible objective types (kill/gather/explore)
   - UNIQUE constraint on (characterId, questId) to prevent duplicate completions
   - Foreign key to characters with CASCADE delete
   - State tracking: available → active → completed/failed
   - Timestamps: startedAt, completedAt

2. **Quest query functions** - CRUD operations:
   - `getQuestProgressForCharacter` - All quests for a character
   - `getActiveQuests` - Active quests only
   - `getQuestProgress` - Specific quest by characterId + questId
   - `createQuestProgress` - Start new quest (throws on duplicate)
   - `updateQuestObjectives` - Track objective progress
   - `updateQuestState` - Transition quest states
   - `hasCompletedQuest` - Check completion status

## Technical Approach

**Schema Design:**
- Followed existing JSONB pattern from `inventories.ts` for objectives storage
- `ObjectiveProgressJson` interface mirrors the shape needed for tracking kill/gather/explore objectives
- VARCHAR quest_id (100) allows human-readable quest identifiers from TypeScript definitions
- State enum: 'available' | 'active' | 'completed' | 'failed'

**UNIQUE Constraint:**
- Composite constraint on (character_id, quest_id) prevents:
  - Duplicate active quests
  - Re-completing the same quest for duplicate rewards
  - Data integrity issues from race conditions
- Database-level enforcement (not just application logic)

**Query Functions:**
- Consistent with existing database query patterns (`inventory.ts`, `characters.ts`)
- Return types use Drizzle-inferred types for type safety
- `createQuestProgress` will throw on duplicate due to UNIQUE constraint (expected behavior)
- `updateQuestState` auto-sets completedAt timestamp when transitioning to completed/failed

## Deviations from Plan

None - plan executed exactly as written. All must_haves satisfied:
- ✅ Quest progress rows exist with JSONB objectives
- ✅ UNIQUE constraint on (characterId, questId)
- ✅ Query functions exported and verified

## Integration Points

**Upstream Dependencies:**
- `packages/database/src/schema/characters.ts` - Foreign key reference
- `packages/database/src/schema/inventories.ts` - JSONB pattern reference

**Downstream Consumers:**
- Phase 65 (Quest Tracking Service) - Will use query functions to track objective progress
- Phase 66 (Quest Rewards) - Will check completion status before granting rewards
- Future quest UI - Will display active/completed quests via query functions

## Verification Results

✅ All verification criteria passed:

1. **Database schema:**
   - `quest_progress` table created with 7 columns
   - UNIQUE constraint `unique_character_quest` exists
   - Foreign key `quest_progress_character_id_characters_id_fk` with CASCADE delete

2. **Build verification:**
   - `pnpm build` succeeds across all packages
   - TypeScript compilation passes with no errors

3. **Export verification:**
   - `packages/database/src/index.ts` exports all quest query functions
   - Functions available to game-server and API

## Database Schema

```sql
CREATE TABLE "quest_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "character_id" uuid NOT NULL,
  "quest_id" varchar(100) NOT NULL,
  "state" varchar(20) DEFAULT 'active' NOT NULL,
  "objectives" jsonb NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "unique_character_quest" UNIQUE("character_id","quest_id")
);

ALTER TABLE "quest_progress"
  ADD CONSTRAINT "quest_progress_character_id_characters_id_fk"
  FOREIGN KEY ("character_id")
  REFERENCES "characters"("id")
  ON DELETE CASCADE;
```

## Example ObjectiveProgressJson

```typescript
{
  objectiveType: 'kill',
  description: 'Defeat 5 Void Crawlers',
  current: 2,
  required: 5,
  targetId: 'void_crawler',
  complete: false
}
```

## Commits

- `8bb4ffd` - feat(64-02): create quest_progress schema with JSONB objectives
- `fa414b8` - feat(64-02): create quest query functions for CRUD operations

## Next Steps

Ready for Phase 64 Plan 03 (Quest Definitions Package):
- TypeScript quest definitions will reference these database types
- Quest tracking service (Phase 65) will use these query functions
- Ensure quest IDs in TypeScript definitions match the VARCHAR(100) constraint

---

## Self-Check: PASSED

**Created files verified:**
- ✅ packages/database/src/schema/quest-progress.ts exists
- ✅ packages/database/src/queries/quests.ts exists
- ✅ packages/database/drizzle/0004_magenta_mephisto.sql exists

**Commits verified:**
- ✅ 8bb4ffd: feat(64-02): create quest_progress schema with JSONB objectives
- ✅ fa414b8: feat(64-02): create quest query functions for CRUD operations

**Database verified:**
- ✅ quest_progress table exists with correct structure
- ✅ UNIQUE constraint unique_character_quest exists
- ✅ Foreign key quest_progress_character_id_characters_id_fk exists

All claims in summary verified against actual implementation.
