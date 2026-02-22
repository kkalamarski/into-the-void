---
phase: 69-quest-chains-bounties
plan: 02
subsystem: quest-system
tags: [quest-chains, bounty-quests, daily-reset, prerequisites]
dependency_graph:
  requires:
    - 69-01-PLAN.md (completion tracking database fields)
  provides:
    - Bounty quest repeatability validation
    - Quest chain prerequisite enforcement
    - Example bounty and chain quest definitions
  affects:
    - QuestService.acceptQuest (validation logic)
    - QuestService.completeQuest (completion metrics)
tech_stack:
  added: []
  patterns:
    - Daily reset validation using canRepeatBountyQuest query
    - Atomic quest_progress cleanup for repeatable quests
    - COALESCE pattern for NULL-safe counter increment
    - Prerequisite chaining via prerequisiteQuestIds array
key_files:
  created: []
  modified:
    - apps/game-server/src/game/quest.service.ts
    - packages/quests/src/definitions/verdant.ts
    - packages/quests/src/definitions/tutorial.ts
decisions:
  - "Non-repeatable quests check hasCompletedQuest before acceptance"
  - "Bounty quests validate daily reset using canRepeatBountyQuest"
  - "Delete old completion record before INSERT for repeatable quests (UNIQUE constraint)"
  - "completeQuest sets lastCompletedAt and increments completedCount for all quests"
  - "Example bounty quests added to both faction-specific and universal registries"
metrics:
  duration: 283
  tasks: 3
  commits: 3
  files_modified: 3
  completed_date: 2026-02-22
---

# Phase 69 Plan 02: Quest Chains & Bounties Implementation Summary

**One-liner:** Integrated prerequisite validation and bounty repeatability into QuestService with daily reset tracking and example quest definitions.

## What Was Built

### 1. Bounty Quest Repeatability (Task 1)
Enhanced `QuestService.acceptQuest` with comprehensive validation:
- **Non-repeatable check:** Story quests return "Quest already completed" error if previously finished
- **Daily reset validation:** Bounty quests check `canRepeatBountyQuest` before acceptance, returning "Wait until daily reset" error if completed today
- **Completion cleanup:** Delete old quest_progress row for repeatable quests before INSERT to satisfy UNIQUE constraint
- **Descriptive errors:** Each validation failure returns specific error message for client feedback

**Pattern:** Validation runs BEFORE quest_progress creation to prevent invalid state.

### 2. Completion Tracking Integration (Task 2)
Replaced `completeQuestAtomic` with direct update that sets completion metrics:
- **lastCompletedAt:** Set to current timestamp for daily reset calculations (UTC day boundary)
- **completedCount:** Incremented using `COALESCE(completedCount, 0) + 1` for NULL safety
- **Atomicity:** Maintained WHERE `state = 'active'` constraint to prevent double completion
- **Applied to all quests:** Both story and bounty quests track completion metrics

**Pattern:** Single atomic UPDATE statement sets multiple fields, removing need for separate helper function.

### 3. Example Quest Definitions (Task 3)
Added demonstration quests showing both bounty and chain patterns:

**Bounty Quests (isRepeatable: true):**
- `bounty_verdant_fungal_harvest` - Faction-specific daily bounty (Verdant)
- `bounty_void_crawler_hunt` - Universal daily bounty (no faction restriction)

**Quest Chain (prerequisiteQuestIds):**
- `quest_verdant_chain_part_1` - Explore fungal forest (no prerequisites)
- `quest_verdant_chain_part_2` - Gather void flora samples (requires part 1 completion)

**Pattern:** Bounty quests use `isRepeatable: true`, quest chains use `prerequisiteQuestIds: [...]` array.

## Technical Implementation

### QuestService.acceptQuest Validation Flow
```
1. Check quest exists in registry
2. Check not already active
3. Validate prerequisites (if any) ← ALREADY EXISTED
4. Check non-repeatable quest not completed ← NEW (Task 1)
5. Check bounty quest daily reset ← NEW (Task 1)
6. Validate faction requirement
7. Delete old completion record if repeatable ← NEW (Task 1)
8. Initialize objectives and create quest_progress
```

### QuestService.completeQuest Update
```typescript
await tx.update(questProgress).set({
  state: 'completed',
  completedAt: new Date(),
  lastCompletedAt: new Date(),  // For daily reset
  completedCount: sql`COALESCE(${questProgress.completedCount}, 0) + 1`,
}).where(and(
  eq(questProgress.id, questProgressRow.id),
  eq(questProgress.state, 'active')  // Atomic constraint
))
```

### Quest Definition Examples
```typescript
// Bounty (repeatable)
{
  id: 'bounty_verdant_fungal_harvest',
  isRepeatable: true,  // Daily reset enabled
  faction: 'verdant',
  objectives: [{ objectiveType: 'gather', ... }],
  rewards: { credits: 200, xp: 100 }
}

// Quest Chain Part 2 (prerequisite)
{
  id: 'quest_verdant_chain_part_2',
  prerequisiteQuestIds: ['quest_verdant_chain_part_1'],  // Blocks acceptance
  objectives: [{ objectiveType: 'gather', ... }],
  rewards: { credits: 250, xp: 150 }
}
```

## Deviations from Plan

None - plan executed exactly as written. All validations, metrics, and examples implemented per specification.

## Integration Points

### Database Queries (from Plan 01)
- `hasCompletedQuest(db, characterId, questId)` - Checks for any completed quest
- `canRepeatBountyQuest(db, characterId, questId)` - Validates daily reset using UTC day boundary

### QuestRegistry
- Example bounty quests registered in `VERDANT_QUESTS` and `TUTORIAL_QUESTS` arrays
- Quest chain demonstrates prerequisite linking pattern

### Client Feedback
- Error messages returned in `{ success: false, error: string }` format
- Errors displayed in quest acceptance flow (NPC interaction modal)

## Validation Results

All verification criteria met:
- ✅ QuestService.acceptQuest validates daily reset for bounty quests before creating quest_progress
- ✅ QuestService.acceptQuest deletes old completion records for repeatable quests
- ✅ QuestService.acceptQuest returns descriptive error messages for repeatability checks
- ✅ QuestService.completeQuest sets lastCompletedAt and increments completedCount
- ✅ Two example bounty quests defined with isRepeatable: true
- ✅ Example quest chain defined with prerequisiteQuestIds linking part 2 to part 1
- ✅ All TypeScript compilation passes for game-server and quests packages

## What's Next

Phase 69 complete. Quest system now supports:
- Story quests (one-time)
- Bounty quests (daily repeatable)
- Quest chains (prerequisite dependencies)
- Completion tracking (metrics for analytics/achievements)

Future phases may add:
- Multi-step quest chains (3+ parts)
- Weekly/monthly bounty cycles
- Achievement system using completedCount metrics
- Quest reputation tracking

## Files Modified

### apps/game-server/src/game/quest.service.ts
**Lines changed:** ~50 insertions
**Key changes:**
- Added imports: `canRepeatBountyQuest`, `questProgress`, drizzle-orm operators
- Added non-repeatable and bounty validation in `acceptQuest`
- Added completion record cleanup for repeatable quests
- Replaced `completeQuestAtomic` with direct update setting metrics
- Removed unused `completeQuestAtomic` import

### packages/quests/src/definitions/verdant.ts
**Lines changed:** ~60 insertions
**Key additions:**
- `BOUNTY_VERDANT_FUNGAL_HARVEST` - Daily bounty (10 fungal spores)
- `QUEST_VERDANT_CHAIN_PART_1` - Explore fungal forest
- `QUEST_VERDANT_CHAIN_PART_2` - Gather void flora (requires part 1)
- Updated `VERDANT_QUESTS` array with 3 new quests

### packages/quests/src/definitions/tutorial.ts
**Lines changed:** ~20 insertions
**Key additions:**
- `BOUNTY_VOID_CRAWLER_HUNT` - Universal daily bounty (kill 10 crawlers)
- Updated `TUTORIAL_QUESTS` array with new bounty

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| 0671825 | feat(69-02): enhance acceptQuest with repeatable quest validation | quest.service.ts |
| e109538 | feat(69-02): update completeQuest to track completion metrics | quest.service.ts |
| 263f7bd | feat(69-02): add example bounty and quest chain definitions | verdant.ts, tutorial.ts |

## Self-Check

Verifying all claims in this summary:

**File existence checks:**

```bash
# Verify modified files exist
[ -f "apps/game-server/src/game/quest.service.ts" ] && echo "✓ quest.service.ts exists" || echo "✗ MISSING: quest.service.ts"
[ -f "packages/quests/src/definitions/verdant.ts" ] && echo "✓ verdant.ts exists" || echo "✗ MISSING: verdant.ts"
[ -f "packages/quests/src/definitions/tutorial.ts" ] && echo "✓ tutorial.ts exists" || echo "✗ MISSING: tutorial.ts"

# Verify commits exist
git log --oneline --all | grep -q "0671825" && echo "✓ Commit 0671825 exists" || echo "✗ MISSING: 0671825"
git log --oneline --all | grep -q "e109538" && echo "✓ Commit e109538 exists" || echo "✗ MISSING: e109538"
git log --oneline --all | grep -q "263f7bd" && echo "✓ Commit 263f7bd exists" || echo "✗ MISSING: 263f7bd"
```

Output:
```
✓ quest.service.ts exists
✓ verdant.ts exists
✓ tutorial.ts exists
✓ Commit 0671825 exists
✓ Commit e109538 exists
✓ Commit 263f7bd exists
```

## Self-Check: PASSED

All files verified, all commits exist, no missing artifacts.
