---
phase: 69-quest-chains-bounties
verified: 2026-02-22T12:00:00Z
status: passed
score: 6/6
---

# Phase 69: Quest Chains & Bounties Verification Report

**Phase Goal:** Quests support prerequisites for chained storylines and daily repeatable bounties
**Verified:** 2026-02-22T12:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Story quest with prerequisite cannot be accepted until prerequisite completed | ✓ VERIFIED | prerequisiteQuestIds validation in acceptQuest (lines 488-495), returns "Prerequisites not met" error |
| 2 | Story quest shows 'Prerequisites not met' error when acceptance blocked | ✓ VERIFIED | Error message in acceptQuest line 492 |
| 3 | Quest chain part 2 can be accepted only after completing part 1 | ✓ VERIFIED | QUEST_VERDANT_CHAIN_PART_2 has prerequisiteQuestIds: ['quest_verdant_chain_part_1'] (line 93, verdant.ts) |
| 4 | Bounty quest deletes old completion record before creating new quest_progress row | ✓ VERIFIED | Delete operation in acceptQuest (lines 523-532) when isRepeatable && state === 'completed' |
| 5 | Quest completion increments completedCount and sets lastCompletedAt for both story and bounty quests | ✓ VERIFIED | completeQuest sets both fields (lines 632-633) using COALESCE and new Date() |
| 6 | Bounty quest completed today shows 'Wait until daily reset' error on re-acceptance attempt | ✓ VERIFIED | canRepeatBountyQuest validation (lines 506-511) returns error when daily reset not reached |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/game-server/src/game/quest.service.ts` | Bounty re-acceptance logic with canRepeatBountyQuest validation | ✓ VERIFIED | Import line 18, usage line 507, error message line 509 |
| `apps/game-server/src/game/quest.service.ts` | Completion tracking updates in completeQuest | ✓ VERIFIED | Lines 632-633: lastCompletedAt and completedCount set atomically |
| `packages/quests/src/definitions/verdant.ts` | Example bounty quest with isRepeatable: true | ✓ VERIFIED | BOUNTY_VERDANT_FUNGAL_HARVEST (line 61), registered in VERDANT_QUESTS array (line 99) |
| `packages/quests/src/definitions/verdant.ts` | Example quest chain with prerequisiteQuestIds | ✓ VERIFIED | QUEST_VERDANT_CHAIN_PART_2 has prerequisiteQuestIds (line 93), registered in array (line 101) |
| `packages/quests/src/definitions/tutorial.ts` | Universal bounty quest with isRepeatable: true | ✓ VERIFIED | BOUNTY_VOID_CRAWLER_HUNT (line 53), registered in TUTORIAL_QUESTS array (line 59) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| quest.service.ts | canRepeatBountyQuest() | acceptQuest validation | ✓ WIRED | Import line 18, call line 507 with (db, characterId, questId) |
| quest.service.ts | questProgress.lastCompletedAt | completeQuest database update | ✓ WIRED | Line 632 sets lastCompletedAt: new Date() in atomic UPDATE |
| quest.service.ts | questProgress.completedCount | completeQuest database update | ✓ WIRED | Line 633 increments using COALESCE pattern in atomic UPDATE |
| acceptQuest | questProgress DELETE | repeatable quest cleanup | ✓ WIRED | Lines 524-531 delete old record before INSERT when isRepeatable |
| canRepeatBountyQuest | hasCompletedQuest | prerequisite checking | ✓ WIRED | Both imported from database package (lines 16, 18), used in acceptQuest |

### Requirements Coverage

| Requirement | Status | Supporting Evidence |
|-------------|--------|---------------------|
| QUEST-13: Multi-step quest chains with prerequisite system | ✓ SATISFIED | prerequisiteQuestIds validation (lines 488-495), example chain in verdant.ts (lines 64-94) |
| QUEST-50: Story quests (one-time, non-repeatable) | ✓ SATISFIED | Non-repeatable check (lines 498-503), returns "Quest already completed" error |
| QUEST-51: Bounty quests (daily repeatable with time-based reset) | ✓ SATISFIED | canRepeatBountyQuest validation (lines 506-511), isRepeatable flag in quest definitions |
| QUEST-52: Daily reset tracking per character | ✓ SATISFIED | lastCompletedAt field set on completion (line 632), used by canRepeatBountyQuest for UTC day boundary check |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| quest.service.ts | 607 | TODO: NPC proximity validation | ℹ️ Info | Documented future enhancement for Phase 67 questGiverId population, not a blocker for current phase |

**No blocking anti-patterns found.** The single TODO is a documented future enhancement.

### Human Verification Required

None. All must-haves are programmatically verifiable through code inspection.

**Automated verification is sufficient** because:
- Prerequisites are enforced server-side with deterministic validation
- Bounty repeatability uses UTC day boundary math (testable)
- Completion tracking is atomic database operations (verifiable in code)
- Quest definitions are static TypeScript objects (inspectable)

### Gap Analysis

**No gaps found.** All truths verified, all artifacts substantive and wired, all key links connected.

## Detailed Verification

### Truth 1: Prerequisite Validation

**Code location:** `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/game-server/src/game/quest.service.ts` (lines 488-495)

```typescript
// Validate prerequisites
if (questDef.prerequisiteQuestIds && questDef.prerequisiteQuestIds.length > 0) {
  for (const prereqId of questDef.prerequisiteQuestIds) {
    const hasCompleted = await hasCompletedQuest(db, characterId, prereqId);
    if (!hasCompleted) {
      return { success: false, error: 'Prerequisites not met' };
    }
  }
}
```

**Verification:** Loop validates ALL prerequisites, early return blocks acceptance.

### Truth 2: Error Message

**Code location:** Same as Truth 1, line 492

**Verification:** Error message exact match: "Prerequisites not met"

### Truth 3: Quest Chain Example

**Code location:** `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/quests/src/definitions/verdant.ts` (lines 79-94)

```typescript
export const QUEST_VERDANT_CHAIN_PART_2: QuestDefinition = {
  id: 'quest_verdant_chain_part_2',
  displayName: 'Verdant Initiative: Specimen Collection',
  description: 'Continue research collaboration by gathering biological samples.',
  objectives: [
    {
      objectiveType: 'gather',
      description: 'Collect 5 void flora samples',
      itemId: 'world_void_flora_sample',
      quantity: 5,
    },
  ],
  rewards: { credits: 250, xp: 150 },
  faction: 'verdant',
  prerequisiteQuestIds: ['quest_verdant_chain_part_1'],  // CHAIN: requires part 1
};
```

**Verification:** Part 2 cannot be accepted until part 1 (quest_verdant_chain_part_1) is completed.

### Truth 4: Bounty Cleanup

**Code location:** `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/game-server/src/game/quest.service.ts` (lines 521-532)

```typescript
// For repeatable quests: delete old completion record to allow new quest_progress row
// UNIQUE constraint (characterId, questId) prevents duplicates, so we must delete first
if (questDef.isRepeatable && existingProgress && existingProgress.state === 'completed') {
  await db
    .delete(questProgress)
    .where(
      and(
        eq(questProgress.characterId, characterId),
        eq(questProgress.questId, questId)
      )
    );
}
```

**Verification:** DELETE runs BEFORE quest_progress INSERT (line 546), satisfies UNIQUE constraint.

### Truth 5: Completion Tracking

**Code location:** `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/game-server/src/game/quest.service.ts` (lines 627-641)

```typescript
// 2. Atomically mark quest complete with completion tracking
const completed = await tx
  .update(questProgress)
  .set({
    state: 'completed',
    completedAt: new Date(),
    lastCompletedAt: new Date(),  // NEW: for daily reset check
    completedCount: sql`COALESCE(${questProgress.completedCount}, 0) + 1`,  // NEW: increment counter
  })
  .where(
    and(
      eq(questProgress.id, questProgressRow.id),
      eq(questProgress.state, 'active')
    )
  )
  .returning();
```

**Verification:** Both fields set in single atomic UPDATE, applies to ALL quests (no isRepeatable check).

### Truth 6: Daily Reset Error

**Code location:** `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/game-server/src/game/quest.service.ts` (lines 505-511)

```typescript
// Check daily reset for bounty quests (repeatable)
if (questDef.isRepeatable) {
  const canRepeat = await canRepeatBountyQuest(db, characterId, questId);
  if (!canRepeat) {
    return { success: false, error: 'Wait until daily reset to repeat this quest' };
  }
}
```

**Verification:** Error message matches requirement, validation runs BEFORE quest_progress creation.

### Artifact Substantiveness

**quest.service.ts:**
- Lines 18, 507-509: canRepeatBountyQuest imported and called with correct parameters
- Lines 632-633: Completion metrics set with COALESCE for NULL safety
- Lines 523-532: DELETE with proper WHERE clause for repeatable cleanup
- **Substantive:** 150+ lines of logic, not placeholder

**verdant.ts:**
- Lines 47-62: BOUNTY_VERDANT_FUNGAL_HARVEST with isRepeatable: true, 10 fungal spores, faction: verdant
- Lines 64-77: QUEST_VERDANT_CHAIN_PART_1 (explore fungal_forest)
- Lines 79-94: QUEST_VERDANT_CHAIN_PART_2 with prerequisiteQuestIds
- Lines 96-102: All quests registered in VERDANT_QUESTS array
- **Substantive:** Complete definitions with objectives, rewards, faction

**tutorial.ts:**
- Lines 40-54: BOUNTY_VOID_CRAWLER_HUNT with isRepeatable: true, no faction restriction
- Lines 56-60: Registered in TUTORIAL_QUESTS array
- **Substantive:** Complete definition with kill objective

### Wiring Verification

**canRepeatBountyQuest → quest.service.ts:**
```bash
# Import check
grep -n "canRepeatBountyQuest" apps/game-server/src/game/quest.service.ts
# Output: 18:  canRepeatBountyQuest,
#         507:      const canRepeat = await canRepeatBountyQuest(db, characterId, questId);
```
✓ WIRED: Imported line 18, called line 507

**lastCompletedAt field → database schema:**
```bash
# Schema definition check
grep "lastCompletedAt" packages/database/src/schema/quest-progress.ts
# Output: 38:  lastCompletedAt: timestamp('last_completed_at', { withTimezone: true }),
```
✓ WIRED: Field exists in schema, set in completeQuest

**completedCount field → database schema:**
```bash
# Schema definition check
grep "completedCount" packages/database/src/schema/quest-progress.ts
# Output: 39:  completedCount: integer('completed_count').notNull().default(0),
```
✓ WIRED: Field exists in schema with default(0), incremented in completeQuest

**Quest definitions → registry:**
```bash
# Verdant quests
grep "BOUNTY_VERDANT_FUNGAL_HARVEST\|QUEST_VERDANT_CHAIN" packages/quests/src/definitions/verdant.ts
# Output: Lines 47, 64, 79, 99, 100, 101 (all registered)

# Tutorial quests
grep "BOUNTY_VOID_CRAWLER_HUNT" packages/quests/src/definitions/tutorial.ts
# Output: Lines 40, 59 (registered)
```
✓ WIRED: All quests exported and registered in arrays

## Commits Verification

All commits from SUMMARY.md exist in repository:

```bash
git log --oneline --all | grep -E "(0671825|e109538|263f7bd)"
# Output:
# 263f7bd feat(69-02): add example bounty and quest chain definitions
# e109538 feat(69-02): update completeQuest to track completion metrics
# 0671825 feat(69-02): enhance acceptQuest with repeatable quest validation
```

**Commit traceability:** 3/3 verified

## Database Integration

### Schema Verification

Quest progress schema includes new fields (Plan 01):

```typescript
// packages/database/src/schema/quest-progress.ts
lastCompletedAt: timestamp('last_completed_at', { withTimezone: true }),
completedCount: integer('completed_count').notNull().default(0),
```

### Query Functions

Both required queries exist and are used:

1. **hasCompletedQuest** (`packages/database/src/queries/quests.ts` line 138)
   - Used for non-repeatable story quest check (line 499)
   - Used for prerequisite validation (line 490)

2. **canRepeatBountyQuest** (`packages/database/src/queries/quests.ts` line 164)
   - Used for bounty daily reset validation (line 507)
   - Checks lastCompletedAt against UTC day boundary

## Success Criteria Validation

From PLAN success_criteria section:

- ✅ Player attempting to accept already-completed story quest sees "Quest already completed" error
  - **Evidence:** Lines 498-503, exact error message match
  
- ✅ Player attempting to re-accept bounty quest completed today sees "Wait until daily reset" error
  - **Evidence:** Lines 506-511, exact error message match
  
- ✅ Player can re-accept bounty quest completed on a previous UTC day
  - **Evidence:** canRepeatBountyQuest returns true when lastCompletedAt is previous UTC day
  
- ✅ Player cannot accept quest chain part 2 until part 1 is completed
  - **Evidence:** prerequisiteQuestIds validation blocks acceptance, example in verdant.ts
  
- ✅ Quest completion updates lastCompletedAt to current timestamp
  - **Evidence:** Line 632, new Date() assigned
  
- ✅ Quest completion increments completedCount for all quests (story and bounty)
  - **Evidence:** Line 633, COALESCE pattern, no isRepeatable conditional
  
- ✅ Bounty quest definitions exist in quest registry with isRepeatable: true
  - **Evidence:** BOUNTY_VERDANT_FUNGAL_HARVEST, BOUNTY_VOID_CRAWLER_HUNT both registered
  
- ✅ Quest chain definitions exist with prerequisiteQuestIds demonstrating chained storylines
  - **Evidence:** QUEST_VERDANT_CHAIN_PART_2 → QUEST_VERDANT_CHAIN_PART_1

**All 8 success criteria met.**

## Summary

Phase 69 goal **ACHIEVED**. Quests now support:

1. **Prerequisites for chains:** Multi-step storylines with prerequisiteQuestIds validation
2. **Daily repeatable bounties:** isRepeatable flag with UTC day boundary tracking
3. **Completion metrics:** lastCompletedAt and completedCount for analytics/achievements
4. **Example content:** 2 bounty quests (Verdant, universal) + 2-part quest chain

**No gaps, no blockers, no human verification needed.** All must-haves verified through code inspection and commit history.

---

_Verified: 2026-02-22T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
