# Phase 69: Quest Chains & Bounties - Research

**Researched:** 2026-02-22
**Domain:** Quest prerequisite validation, repeatable quest systems, daily reset tracking, per-character cooldowns
**Confidence:** HIGH

## Summary

Phase 69 extends the quest foundation (Phases 64-68) with two interconnected systems: quest chains with prerequisite validation, and repeatable bounty quests with per-character daily reset tracking. The implementation builds on existing patterns: QuestDefinition already has `prerequisiteQuestIds` and `isRepeatable` fields (Phase 64), database has UNIQUE constraint preventing duplicate completions (Phase 64), and QuestService has event-driven validation (Phase 65).

The core technical challenge is daily reset tracking. Industry research shows two approaches: server-wide daily reset (WoW, Lost Ark) vs. individual 20-24 hour cooldowns (Elder Scrolls Online, Hypixel). For this phase, per-character daily reset using PostgreSQL timestamptz and date_trunc provides a clean solution that respects character-local time without timezone complexity.

**Primary recommendation:** Add `lastCompletedAt` and `completedCount` fields to quest_progress table, implement prerequisite validation in QuestService.acceptQuest() using hasCompletedQuest() queries, and create daily reset logic using date_trunc('day', now() AT TIME ZONE 'UTC') to determine if bounty quest can be re-accepted.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL timestamptz | 14+ | Daily reset tracking | Already used throughout database, stores UTC internally, AT TIME ZONE for conversions |
| Drizzle ORM | current | Database queries | Already used for all database operations, supports date functions via sql`` helper |
| @nestjs/event-emitter | 3.0.1 | Quest acceptance validation | Already integrated in Phase 65 for objective tracking |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript discriminated unions | 5+ | Quest type differentiation | Distinguish story vs bounty quests at type level |
| PostgreSQL date_trunc | Built-in | Daily boundary calculation | Determine if current day != last completion day |

**Installation:**
No new dependencies required - all libraries already in use.

## Architecture Patterns

### Recommended Database Schema Extensions
```
quest_progress table additions:
├── lastCompletedAt: timestamp with timezone (when quest last completed)
├── completedCount: integer (how many times completed)
└── No new tables needed - reuse quest_progress with state transitions
```

### Pattern 1: Quest Definition with Prerequisite Chain
**What:** QuestDefinition with prerequisiteQuestIds array validated before acceptance
**When to use:** Story quests that must be completed in order (e.g., faction intro chain)
**Example:**
```typescript
// Source: packages/quests/src/types.ts (field already exists from Phase 64)
export const QUEST_VERDANT_INTRO_PART_2: QuestDefinition = {
  id: 'quest_verdant_intro_part_2',
  displayName: 'Establishing Contact',
  description: 'Now that you\'ve proven yourself, deliver the research data to the Verdant outpost.',
  prerequisiteQuestIds: ['quest_verdant_intro_part_1'],  // Must complete part 1 first
  objectives: [
    {
      objectiveType: 'explore',
      description: 'Reach the Verdant outpost',
      biome: 'verdant_outpost',
    },
  ],
  rewards: { credits: 200, xp: 100 },
  faction: 'verdant',
  isRepeatable: false,  // Story quest - one-time only
};
```

### Pattern 2: Bounty Quest with Daily Reset
**What:** Repeatable quest that checks daily boundary using date_trunc
**When to use:** Daily bounties for credits/XP farming
**Example:**
```typescript
// Source: Industry patterns (WoW, Lost Ark) + PostgreSQL date functions
export const BOUNTY_VOID_CRAWLER_HUNT: QuestDefinition = {
  id: 'bounty_void_crawler_hunt',
  displayName: 'Void Crawler Bounty',
  description: 'The void crawler population needs culling. Kill 10 void crawlers for a reward.',
  objectives: [
    {
      objectiveType: 'kill',
      description: 'Kill 10 void crawlers',
      targetEntityId: 'creature_void_crawler',
      targetCount: 10,
    },
  ],
  rewards: { credits: 150, xp: 75 },
  isRepeatable: true,  // Bounty - repeatable daily
};
```

### Pattern 3: Prerequisite Validation Before Quest Acceptance
**What:** Server-side validation that checks all prerequisite quests are completed
**When to use:** Before allowing quest:accept for quests with prerequisiteQuestIds
**Example:**
```typescript
// Source: Adapted from QuestService patterns (Phase 65)
async canAcceptQuest(
  characterId: string,
  questId: string
): Promise<{ canAccept: boolean; reason?: string }> {
  const questDef = QuestRegistry.get(questId);
  if (!questDef) {
    return { canAccept: false, reason: 'Quest not found' };
  }

  // Check prerequisites
  if (questDef.prerequisiteQuestIds && questDef.prerequisiteQuestIds.length > 0) {
    const db = this.databaseService.getClient();
    for (const prereqId of questDef.prerequisiteQuestIds) {
      const hasCompleted = await hasCompletedQuest(db, characterId, prereqId);
      if (!hasCompleted) {
        const prereqDef = QuestRegistry.get(prereqId);
        return {
          canAccept: false,
          reason: `You must complete "${prereqDef?.displayName || prereqId}" first`,
        };
      }
    }
  }

  // Check if story quest already completed
  if (!questDef.isRepeatable) {
    const db = this.databaseService.getClient();
    const alreadyCompleted = await hasCompletedQuest(db, characterId, questId);
    if (alreadyCompleted) {
      return { canAccept: false, reason: 'Quest already completed' };
    }
  }

  // Check daily reset for bounties
  if (questDef.isRepeatable) {
    const db = this.databaseService.getClient();
    const canRepeat = await canRepeatBountyQuest(db, characterId, questId);
    if (!canRepeat) {
      return { canAccept: false, reason: 'Wait until daily reset to repeat this quest' };
    }
  }

  return { canAccept: true };
}
```

### Pattern 4: Daily Reset Check Using date_trunc
**What:** Query that checks if last completion was on a different UTC day
**When to use:** Determine if bounty quest is available for re-acceptance
**Example:**
```typescript
// Source: PostgreSQL date_trunc documentation + industry patterns
import { sql } from 'drizzle-orm';

export async function canRepeatBountyQuest(
  db: DbClient,
  characterId: string,
  questId: string
): Promise<boolean> {
  const result = await db
    .select({
      lastCompletedAt: questProgress.lastCompletedAt,
    })
    .from(questProgress)
    .where(
      and(
        eq(questProgress.characterId, characterId),
        eq(questProgress.questId, questId),
        eq(questProgress.state, 'completed')
      )
    )
    .limit(1);

  if (result.length === 0) {
    // Never completed - can accept
    return true;
  }

  const lastCompleted = result[0].lastCompletedAt;
  if (!lastCompleted) {
    // Edge case: completed but no timestamp (shouldn't happen)
    return true;
  }

  // Check if current day (UTC) is different from completion day (UTC)
  // Using raw SQL because Drizzle doesn't have date_trunc helper yet
  const resetCheck = await db.execute(sql`
    SELECT
      date_trunc('day', now() AT TIME ZONE 'UTC') >
      date_trunc('day', ${lastCompleted} AT TIME ZONE 'UTC')
      AS can_reset
  `);

  return resetCheck.rows[0]?.can_reset === true;
}
```

### Pattern 5: State Transition for Repeatable Quests
**What:** Delete old quest_progress row and create new one for bounty re-acceptance
**When to use:** Player accepts bounty quest that was previously completed
**Example:**
```typescript
// Source: Existing quest_progress UNIQUE constraint prevents duplicate rows
async acceptRepeatableQuest(
  characterId: string,
  questId: string
): Promise<void> {
  const db = this.databaseService.getClient();
  const questDef = QuestRegistry.get(questId);

  // Delete previous completion record to allow new row
  // UNIQUE constraint (characterId, questId) prevents duplicates
  await db
    .delete(questProgress)
    .where(
      and(
        eq(questProgress.characterId, characterId),
        eq(questProgress.questId, questId)
      )
    );

  // Create fresh quest_progress row with initial objectives
  const initialObjectives = questDef.objectives.map(obj => ({
    objectiveType: obj.objectiveType,
    description: obj.description,
    current: 0,
    required: obj.objectiveType === 'kill' ? obj.targetCount :
              obj.objectiveType === 'gather' ? obj.quantity : 1,
    targetId: obj.objectiveType === 'kill' ? obj.targetEntityId :
              obj.objectiveType === 'gather' ? obj.itemId :
              obj.objectiveType === 'explore' ? obj.biome : undefined,
    complete: false,
  }));

  await createQuestProgress(db, {
    characterId,
    questId,
    state: 'active',
    objectives: initialObjectives,
  });
}
```

### Pattern 6: Update Completion Tracking on Quest Complete
**What:** Set lastCompletedAt and increment completedCount when quest finishes
**When to use:** In QuestService.completeQuest() after rewards granted
**Example:**
```typescript
// Source: Adapted from Phase 66 completion logic
async completeQuest(characterId: string, questId: string): Promise<void> {
  const db = this.databaseService.getClient();

  // ... existing validation and reward logic from Phase 66 ...

  // Update completion tracking for repeatability logic
  await db
    .update(questProgress)
    .set({
      state: 'completed',
      completedAt: new Date(),
      lastCompletedAt: new Date(),  // NEW: Track when completed for daily reset
      completedCount: sql`COALESCE(${questProgress.completedCount}, 0) + 1`,  // NEW: Increment counter
    })
    .where(
      and(
        eq(questProgress.characterId, characterId),
        eq(questProgress.questId, questId)
      )
    );
}
```

### Anti-Patterns to Avoid
- **Per-character timezone storage:** UTC-based daily reset is simpler; avoid storing individual player timezones
- **24-hour cooldown instead of daily reset:** Fixed daily reset time is more player-friendly (research: Villagers & Heroes forums)
- **Soft-delete completed quests:** Delete and recreate for bounties is cleaner than state='available' on completed rows
- **Application-level prerequisite graph traversal:** Iterate prerequisiteQuestIds array; DAG validation is overkill for linear chains
- **Caching hasCompletedQuest results:** Database queries are fast enough; caching adds stale data risk

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Daily reset calculation | Custom date math (days since epoch, millisecond arithmetic) | PostgreSQL date_trunc('day', ...) | Handles leap years, daylight saving, timezone conversions automatically |
| Prerequisite DAG validation | Graph traversal with cycle detection | Simple loop over prerequisiteQuestIds array | Game quests are linear/tree structures, not complex graphs; KISS principle |
| Bounty quest reset scheduler | Cron job to mark quests available | On-demand canRepeatBountyQuest() check | Scales better, no background process, works across server restarts |
| Timezone-aware daily reset | Store player timezone, convert to local midnight | UTC-based date_trunc with AT TIME ZONE | Simpler, avoids timezone database updates, consistent for all players |
| Completion count tracking | Separate quest_completions table | Add completedCount column to quest_progress | One table, atomic updates, no JOIN needed |

**Key insight:** Daily reset systems have deceptive complexity in timezone handling and calendar edge cases (daylight saving, leap years). PostgreSQL date_trunc handles this correctly; custom date math is error-prone. Prerequisite chains are simpler than they appear - linear quest chains don't need graph algorithms.

## Common Pitfalls

### Pitfall 1: Accepting Bounty Quest Before Daily Reset Check
**What goes wrong:** Player completes bounty at 11:59 PM, immediately re-accepts at 12:00 AM same session
**Why it happens:** Validation checks lastCompletedAt after quest accepted, not before
**How to avoid:** Run canRepeatBountyQuest() in acceptQuest() BEFORE creating quest_progress row
**Warning signs:** Bounty completed multiple times per day in logs

### Pitfall 2: UNIQUE Constraint Violation on Bounty Re-Acceptance
**What goes wrong:** INSERT fails with "duplicate key value violates unique constraint" when accepting bounty
**Why it happens:** Trying to create new quest_progress row while old 'completed' row still exists
**How to avoid:** DELETE old quest_progress row BEFORE INSERT for repeatable quests
**Warning signs:** PostgreSQL error 23505 (unique_violation) on quest acceptance

### Pitfall 3: Prerequisite Quest Chain Circular Dependencies
**What goes wrong:** Quest A requires Quest B, Quest B requires Quest A - infinite loop
**Why it happens:** No validation preventing circular references in prerequisiteQuestIds
**How to avoid:** Detect cycles during quest definition registration (Phase 64 registry) or reject quests with depth > 10
**Warning signs:** Stack overflow or infinite loop in canAcceptQuest()

### Pitfall 4: Timezone Confusion in Daily Reset
**What goes wrong:** Player in timezone UTC+8 sees "wait until reset" even though it's a new day locally
**Why it happens:** Using server local time instead of UTC for date_trunc
**How to avoid:** ALWAYS use `now() AT TIME ZONE 'UTC'` and `timestamp AT TIME ZONE 'UTC'` in date_trunc calls
**Warning signs:** Players in different timezones report different reset times

### Pitfall 5: Story Quest Marked as Repeatable by Mistake
**What goes wrong:** Main story quest can be completed infinitely, breaking narrative progression
**Why it happens:** isRepeatable: true set on quest definition that should be one-time
**How to avoid:** Code review checklist: story quests have isRepeatable: false, bounties have isRepeatable: true
**Warning signs:** Multiple completions of quest_tutorial_first_steps in database

### Pitfall 6: Prerequisite Check After Quest Progress Created
**What goes wrong:** Quest progress row created even though prerequisites not met, player gets "stuck" quest
**Why it happens:** Validation order: create quest_progress → check prerequisites (should be reversed)
**How to avoid:** Run ALL validation (prerequisites, repeatability, level) BEFORE database INSERT
**Warning signs:** quest_progress rows exist for quests with unmet prerequisites

### Pitfall 7: completedCount Not Incremented on Story Quest Completion
**What goes wrong:** Story quest has completedCount = 0 even when state = 'completed'
**Why it happens:** Forgot to increment completedCount for non-repeatable quests
**How to avoid:** Increment completedCount for ALL quest completions (story and bounty), not just bounties
**Warning signs:** completedCount column always NULL or 0

### Pitfall 8: Daily Reset Using Local Server Time
**What goes wrong:** Daily reset time changes when server timezone changes (e.g., daylight saving)
**Why it happens:** Using now() without AT TIME ZONE 'UTC' in date_trunc
**How to avoid:** Use UTC for all daily reset calculations; convert to display timezone only in UI
**Warning signs:** Reset time shifts by 1 hour twice per year

## Code Examples

Verified patterns from codebase and official sources:

### Quest Definition with Prerequisites (Phase 64 types.ts)
```typescript
export const QUEST_VERDANT_CHAIN_PART_3: QuestDefinition = {
  id: 'quest_verdant_chain_part_3',
  displayName: 'Final Analysis',
  description: 'Complete the research by analyzing collected specimens.',
  prerequisiteQuestIds: ['quest_verdant_chain_part_1', 'quest_verdant_chain_part_2'],
  objectives: [
    {
      objectiveType: 'gather',
      description: 'Collect 3 crystalline samples',
      itemId: 'world_crystal_shard',
      quantity: 3,
    },
  ],
  rewards: { credits: 500, xp: 250, items: [{ itemId: 'module_scanner_advanced', quantity: 1 }] },
  faction: 'verdant',
  isRepeatable: false,  // Story quest
};

export const BOUNTY_DAILY_HARVEST: QuestDefinition = {
  id: 'bounty_daily_harvest',
  displayName: 'Daily Harvest',
  description: 'Gather fungal spores for the research team. Repeats daily.',
  objectives: [
    {
      objectiveType: 'gather',
      description: 'Collect 10 fungal spore clusters',
      itemId: 'world_fungal_spore_cluster',
      quantity: 10,
    },
  ],
  rewards: { credits: 200, xp: 100 },
  isRepeatable: true,  // Bounty - repeatable daily
};
```

### Database Schema Migration for Reset Tracking
```typescript
// Migration file: add lastCompletedAt and completedCount to quest_progress
import { pgTable, timestamp, integer } from 'drizzle-orm/pg-core';

export const questProgress = pgTable('quest_progress', {
  // ... existing columns from Phase 64 ...
  lastCompletedAt: timestamp('last_completed_at', { withTimezone: true }),
  completedCount: integer('completed_count').notNull().default(0),
});
```

### Prerequisite Validation Query
```typescript
// packages/database/src/queries/quests.ts (new function)
import { and, eq } from 'drizzle-orm';

export async function hasCompletedQuest(
  db: DbClient,
  characterId: string,
  questId: string
): Promise<boolean> {
  const result = await db
    .select({ id: questProgress.id })
    .from(questProgress)
    .where(
      and(
        eq(questProgress.characterId, characterId),
        eq(questProgress.questId, questId),
        eq(questProgress.state, 'completed')
      )
    )
    .limit(1);

  return result.length > 0;
}
```

### Daily Reset Check (UTC-based)
```typescript
// packages/database/src/queries/quests.ts (new function)
import { sql } from 'drizzle-orm';

export async function canRepeatBountyQuest(
  db: DbClient,
  characterId: string,
  questId: string
): Promise<boolean> {
  const result = await db
    .select({ lastCompletedAt: questProgress.lastCompletedAt })
    .from(questProgress)
    .where(
      and(
        eq(questProgress.characterId, characterId),
        eq(questProgress.questId, questId),
        eq(questProgress.state, 'completed')
      )
    )
    .limit(1);

  if (result.length === 0 || !result[0].lastCompletedAt) {
    return true;  // Never completed or no timestamp
  }

  // Check if current UTC day is after completion UTC day
  const resetCheck = await db.execute(sql`
    SELECT
      date_trunc('day', now() AT TIME ZONE 'UTC') >
      date_trunc('day', ${result[0].lastCompletedAt} AT TIME ZONE 'UTC')
      AS can_reset
  `);

  return resetCheck.rows[0]?.can_reset === true;
}
```

### QuestService.acceptQuest() with Validation
```typescript
// apps/game-server/src/game/quest.service.ts (extend existing method)
async acceptQuest(characterId: string, questId: string): Promise<void> {
  const questDef = QuestRegistry.get(questId);
  if (!questDef) {
    throw new Error('Quest not found');
  }

  // CRITICAL: Validate BEFORE creating quest_progress row
  const validation = await this.canAcceptQuest(characterId, questId);
  if (!validation.canAccept) {
    throw new Error(validation.reason || 'Cannot accept quest');
  }

  const db = this.databaseService.getClient();

  // For repeatable quests: delete old completion record
  if (questDef.isRepeatable) {
    await db
      .delete(questProgress)
      .where(
        and(
          eq(questProgress.characterId, characterId),
          eq(questProgress.questId, questId)
        )
      );
  }

  // Create fresh quest_progress row
  const initialObjectives = this.buildInitialObjectives(questDef);
  await createQuestProgress(db, {
    characterId,
    questId,
    state: 'active',
    objectives: initialObjectives,
  });

  // Emit quest:accepted event to client
  this.emitQuestAccepted(characterId, questId, questDef);
}
```

### Update Completion Tracking
```typescript
// apps/game-server/src/game/quest.service.ts (extend completeQuest from Phase 66)
async completeQuest(characterId: string, questId: string): Promise<void> {
  const db = this.databaseService.getClient();

  // ... existing validation and reward logic from Phase 66 ...

  // Update quest_progress with completion tracking
  await db
    .update(questProgress)
    .set({
      state: 'completed',
      completedAt: new Date(),
      lastCompletedAt: new Date(),  // NEW: for daily reset check
      completedCount: sql`COALESCE(${questProgress.completedCount}, 0) + 1`,  // NEW: increment
    })
    .where(
      and(
        eq(questProgress.characterId, characterId),
        eq(questProgress.questId, questId)
      )
    );

  // Emit quest:completed event to client
  this.emitQuestCompleted(characterId, questId, questDef);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Individual 24-hour cooldowns | Server-wide daily reset time | WoW (2004), Lost Ark (2022) | More player-friendly, no "cooldown creep" over weeks |
| Store player timezone in database | UTC-based date_trunc with AT TIME ZONE | PostgreSQL 9.0+ (2010) | Simpler, no timezone database, consistent for all players |
| Soft-delete completed quests (state='completed') | Delete and recreate for bounties | Industry standard (2015+) | Cleaner state machine, UNIQUE constraint works correctly |
| Separate quest_completions table | Single quest_progress with lastCompletedAt | Modern MMO architecture (2020+) | Fewer JOINs, atomic updates, simpler schema |
| Graph algorithms for prerequisite validation | Simple loop over prerequisiteQuestIds | KISS principle | Quests are linear/tree structures; graph overkill adds complexity |

**Deprecated/outdated:**
- **Individual cooldown timers:** Modern MMOs use daily reset times for predictability
- **Manual date arithmetic:** PostgreSQL date_trunc handles calendar edge cases correctly
- **Quest state flags (isCompleted, isRepeatable, isAvailable):** Explicit state enum is clearer
- **Client-side prerequisite checks:** Server-authoritative validation prevents exploits

## Open Questions

1. **Should prerequisite validation support OR logic (any of X quests) or only AND (all of X)?**
   - What we know: prerequisiteQuestIds is array, implies AND logic (all must be completed)
   - What's unclear: Do we need "complete quest A OR quest B" branching?
   - Recommendation: Start with AND-only (simpler), add OR support if game design requires it

2. **What happens if prerequisite quest is abandoned/failed?**
   - What we know: Quest state can be 'failed', prerequisite check only looks for state='completed'
   - What's unclear: Should failed prerequisite quest block acceptance?
   - Recommendation: Only state='completed' counts; failed quests can be re-attempted

3. **Should bounty quests have weekly/monthly variants?**
   - What we know: Requirements only specify daily bounties (QUEST-51)
   - What's unclear: Future need for weekly reset bounties?
   - Recommendation: Implement daily only for Phase 69; add weeklyResetDay field if needed later

4. **How many times can a bounty quest be completed total?**
   - What we know: completedCount tracks total completions
   - What's unclear: Should there be a cap (e.g., max 30 completions)?
   - Recommendation: No cap for Phase 69; add maxCompletions field to QuestDefinition if needed

5. **Should daily reset use character creation timezone or server UTC?**
   - What we know: Requirements say "character-local time" (QUEST-52)
   - What's unclear: Does "character-local" mean timezone stored per character?
   - Recommendation: Interpret as "per-character tracking" not "per-character timezone"; use UTC for all

## Sources

### Primary (HIGH confidence)
- Codebase: packages/quests/src/types.ts (QuestDefinition with prerequisiteQuestIds, isRepeatable)
- Codebase: packages/database/src/schema/quest-progress.ts (UNIQUE constraint, timestamptz columns)
- Codebase: apps/game-server/src/game/quest.service.ts (event-driven validation patterns)
- v1.15 Requirements: .planning/milestones/v1.15/REQUIREMENTS.md (QUEST-13, QUEST-50, QUEST-51, QUEST-52)
- Phase 64 Research: .planning/phases/64-quest-foundations/64-RESEARCH.md (state machine, UNIQUE constraint rationale)

### Secondary (MEDIUM confidence)
- [PostgreSQL Date/Time Types Documentation](https://www.postgresql.org/docs/current/datatype-datetime.html) - timestamptz storage and AT TIME ZONE
- [PostgreSQL Date/Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html) - date_trunc function reference
- [Working with Time in Postgres | Crunchy Data Blog](https://www.crunchydata.com/blog/working-with-time-in-postgres) - Timezone best practices
- [Time Zone Management in PostgreSQL | CYBERTEC](https://www.cybertec-postgresql.com/en/time-zone-management-in-postgresql/) - UTC storage patterns
- [Lost Ark Quests Guide](https://www.playlostark.com/en-us/game/guide/quests-guide) - Daily quest reset per-character (3 quests/day)
- [WoW Weekly Reset Timer](https://wowvendor.com/media/wow/weekly-reset-timer/) - Daily reset at fixed server time (7 AM local)

### Tertiary (LOW confidence)
- [Repeatable Quest - TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/RepeatableQuest) - Game design patterns for repeatables
- [Quest chain - Wowpedia](https://wowpedia.fandom.com/wiki/Quest_chain) - Prerequisite and followup quest terminology
- [Implementing a Scalable Quest System | Better Programming](https://betterprogramming.pub/implementing-a-scalable-quest-system-7f36ea4cfe22) - Quest state machine patterns
- [Daily quest cooldown discussion | Villagers & Heroes](https://villagersandheroes.com/forums/threads/daily-reset-instead-of-22-24-hours-cooldowns.4093/) - Player preference for fixed daily reset
- [OSRS Quest Requirements Checker](https://www.osrstools.net/tools/quest-requirements) - Prerequisite validation UI patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use (PostgreSQL, Drizzle, TypeScript)
- Architecture patterns: HIGH - Built on existing Phase 64-68 quest foundation, minimal new complexity
- Daily reset logic: HIGH - PostgreSQL date_trunc documented and proven in production MMOs
- Prerequisite validation: HIGH - Simple iteration over array, hasCompletedQuest() query already exists pattern
- Timezone handling: MEDIUM - Recommendation is UTC-based but requirements mention "character-local time"

**Research date:** 2026-02-22
**Valid until:** 2026-03-24 (30 days - stable domain with established database patterns)
