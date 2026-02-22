---
phase: 69-quest-chains-bounties
plan: 01
subsystem: database
tags: [quest-system, repeatable-quests, daily-reset, bounties]
requires: [phase-64-quest-foundation, phase-66-quest-completion]
provides: [quest-completion-tracking, daily-reset-logic, bounty-repeatability]
affects: []
tech-stack:
  added: []
  patterns: [UTC-day-boundary-reset, date_trunc-queries, completion-counter]
key-files:
  created: [packages/database/drizzle/0005_conscious_joseph.sql]
  modified:
    - packages/database/src/schema/quest-progress.ts
    - packages/database/src/queries/quests.ts
decisions:
  - "lastCompletedAt tracks UTC timestamp of most recent completion for daily reset"
  - "completedCount tracks total number of completions (analytics + future achievements)"
  - "date_trunc('day', ... AT TIME ZONE 'UTC') ensures consistent daily reset across timezones"
  - "Daily reset uses UTC day boundary, not 24-hour cooldown from completion time"
metrics:
  duration: 345
  completed_date: 2026-02-22
---

# Phase 69 Plan 01: Quest Completion Tracking & Daily Reset Summary

**One-liner:** Quest completion tracking with UTC daily reset logic for bounty quest repeatability.

## What Was Built

Extended the `quest_progress` database schema with two new tracking columns and created UTC-based daily reset query logic to enable repeatable bounty quests.

### Schema Changes

**Added to `quest_progress` table:**
- `lastCompletedAt` (timestamptz, nullable) - Tracks when quest was last completed for daily reset calculations
- `completedCount` (integer, default 0) - Tracks total number of times quest has been completed

### Query Function

**`canRepeatBountyQuest(db, characterId, questId): Promise<boolean>`**
- Returns true if quest has never been completed OR last completion was on a different UTC day
- Uses PostgreSQL `date_trunc('day', now() AT TIME ZONE 'UTC')` to compare UTC day boundaries
- Ensures consistent daily reset across all timezones (not 24-hour cooldown)

## Technical Implementation

### Migration Applied
```sql
-- Migration 0005_conscious_joseph.sql
ALTER TABLE "quest_progress" ADD COLUMN "last_completed_at" timestamp with time zone;
ALTER TABLE "quest_progress" ADD COLUMN "completed_count" integer DEFAULT 0 NOT NULL;
```

### Daily Reset Logic
The reset logic compares UTC days using PostgreSQL's `date_trunc` function:
```typescript
// Check if current UTC day is after completion UTC day
const resetCheck = await db.execute(sql`
  SELECT
    date_trunc('day', now() AT TIME ZONE 'UTC') >
    date_trunc('day', ${result[0].lastCompletedAt} AT TIME ZONE 'UTC')
    AS can_reset
`);
```

**Why date_trunc and not 24-hour cooldown:**
- Quest completed at 11:59 PM UTC resets at 12:00 AM UTC (1 minute later)
- Quest completed at 12:01 AM UTC resets at 12:00 AM UTC next day (23 hours 59 minutes later)
- This matches industry standard MMO daily quest behavior

## Deviations from Plan

None - plan executed exactly as written. All three tasks completed successfully.

## Verification Results

- [x] `quest_progress` schema has `lastCompletedAt` and `completedCount` columns
- [x] `canRepeatBountyQuest` function exported from `packages/database/src/queries/quests.ts`
- [x] Function uses `date_trunc('day', now() AT TIME ZONE 'UTC')` for UTC day comparison
- [x] Database migration applied with no errors (verified via podman exec psql)
- [x] TypeScript compilation passes for packages/database

**Database verification:**
```
Table "public.quest_progress"
      Column       |           Type           | Nullable |  Default
-------------------+--------------------------+----------+-----------
 last_completed_at | timestamp with time zone |          |
 completed_count   | integer                  | not null | 0
```

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 033d201 | Add lastCompletedAt and completedCount columns to quest_progress schema |
| 2 | 8e85127 | Add canRepeatBountyQuest query with UTC daily reset logic |
| 3 | 590c5e2 | Apply database migration for quest completion tracking |

## Files Changed

**Created:**
- `packages/database/drizzle/0005_conscious_joseph.sql` - Migration adding completion tracking columns

**Modified:**
- `packages/database/src/schema/quest-progress.ts` - Added 2 columns (lastCompletedAt, completedCount), imported `integer` from drizzle-orm
- `packages/database/src/queries/quests.ts` - Added `canRepeatBountyQuest` function with date_trunc daily reset logic, imported `sql` from drizzle-orm

## Next Steps

Plan 69-02 will implement quest chain prerequisites and bounty quest definitions, leveraging this completion tracking infrastructure to enforce daily limits and chain progression requirements.

## Self-Check: PASSED

**Files exist:**
- FOUND: packages/database/drizzle/0005_conscious_joseph.sql
- FOUND: packages/database/src/schema/quest-progress.ts
- FOUND: packages/database/src/queries/quests.ts

**Commits exist:**
- FOUND: 033d201
- FOUND: 8e85127
- FOUND: 590c5e2

**Database verification:**
- VERIFIED: last_completed_at column exists in quest_progress table
- VERIFIED: completed_count column exists in quest_progress table
