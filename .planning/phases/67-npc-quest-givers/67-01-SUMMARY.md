---
phase: 67-npc-quest-givers
plan: 01
subsystem: quest-system
tags: [npc-integration, quest-acceptance, auto-discovery]
dependency-graph:
  requires: [phase-66-quest-completion, phase-64-quest-registry]
  provides: [npc-quest-interaction, quest-accept-flow, auto-discover-quests]
  affects: [game-gateway, quest-service, shared-types]
tech-stack:
  added: []
  patterns: [quest-categorization, prerequisite-validation, auto-discovery-on-zone-entry]
key-files:
  created: []
  modified:
    - apps/game-server/src/game/quest.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - packages/shared-types/src/network/events.ts
decisions: []
metrics:
  duration: 245s
  completed: 2026-02-22
---

# Phase 67 Plan 01: NPC Quest Giver Integration Summary

**One-liner:** NPCs now show available/active/ready quest lists and players can accept quests via quest:accept event

## What Was Built

Extended NPC interaction system to surface quest state and added quest acceptance flow via WebSocket events.

### Quest Categorization (getQuestsForNpc)

Created `QuestService.getQuestsForNpc(characterId, npcId, playerFaction)` that categorizes quests into three arrays:

- **Available quests**: Not started (or failed if repeatable), prerequisites met, filtered by NPC's questGiverId
- **Active quests**: In progress with objectives not all complete, showing current/required progress
- **Ready quests**: Active with all objectives complete, ready for turn-in

Validates prerequisites using existing `hasCompletedQuest` database query. Only includes quests matching player's faction (or faction-agnostic quests).

### Quest Acceptance (acceptQuest)

Created `QuestService.acceptQuest(characterId, questId)` that:

1. Validates quest exists in QuestRegistry
2. Checks quest not already active via `getQuestProgress`
3. Validates all prerequisite quests completed
4. Validates player faction matches quest faction (if quest is faction-specific)
5. Initializes objectives with current=0, required=targetCount, complete=false
6. Creates `quest_progress` row with state='active'
7. Emits `quest:progress` event to player socket

Returns `{ success: boolean; error?: string }` for error handling.

### Auto-Discovery Logic

Extended `handleZoneEntered` event handler to auto-discover quests without `questGiverId`:

- After updating active quest explore objectives, filters `QuestRegistry.getByFaction` for quests where:
  - `questGiverId` is undefined (auto-discover quest)
  - Quest has explore objective targeting current biome
- Checks player doesn't already have quest (any state) via `getQuestProgressForCharacter`
- Auto-accepts matching quests via internal `acceptQuest` call
- Logs auto-discovery events for debugging

This allows quests like "Explore the Fungal Forest" to appear automatically when entering the biome, without requiring NPC interaction.

### NPC Interaction Extension

Updated `handleNpcInteract` in game.gateway.ts to:

- Call `questService.getQuestsForNpc` after building NPC response
- Add `availableQuests`, `activeQuests`, `readyQuests` arrays to response (only if non-empty)
- Each array includes appropriate fields (objectives with progress for active, just IDs for ready)

Extended `npc:interact:response` ServerEvent type with optional quest arrays.

### Quest Accept Handler

Added `handleQuestAccept` WebSocket handler:

- Accepts `{ questId: string }` from client
- Calls `questService.acceptQuest(player.id, data.questId)`
- Emits error event if acceptance fails (prerequisites not met, faction mismatch, already active)
- Success case handled by QuestService (emits quest:progress)

Added `quest:accept` to ClientEventType union and ClientEvents interface.

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### Quest Categorization Algorithm

```typescript
// For each quest from QuestRegistry filtered by NPC and faction:
const progress = allProgress.find(p => p.questId === questDef.id);

if (!progress || (progress.state === 'failed' && questDef.isRepeatable)) {
  // Check prerequisites using hasCompletedQuest
  // Add to availableQuests if prerequisites met
} else if (progress.state === 'active') {
  const allComplete = progress.objectives.every(obj => obj.complete);
  if (allComplete) {
    // Add to readyQuests (ready for turn-in)
  } else {
    // Add to activeQuests (in progress)
  }
}
```

### Objective Initialization

Helper methods extract objective parameters from discriminated union:

- `getObjectiveRequired(obj)`: Returns `targetCount` for kill, `quantity` for gather, `1` for explore
- `getObjectiveTargetId(obj)`: Returns `targetEntityId` for kill, `itemId` for gather, `biome` for explore

Initialized objectives stored as JSONB in quest_progress table:

```typescript
{
  objectiveType: 'kill' | 'gather' | 'explore',
  description: string,
  current: 0,
  required: number,
  targetId: string,
  complete: false
}
```

### Auto-Discovery Pattern

Auto-discover quests have `questGiverId: undefined` in QuestDefinition. When player enters a zone:

1. Zone entry emits `zone.entered` event with `{ characterId, zoneId, biome }`
2. QuestService handles event, updates active quest explore objectives
3. Filters registry for auto-discover quests targeting this biome
4. Auto-accepts any not already in player's quest_progress
5. Player receives quest:progress event with newly discovered quest

This supports environmental discovery (e.g., faction distress beacon quests).

## Files Modified

### apps/game-server/src/game/quest.service.ts (+246 lines)

- Added imports: `getQuestProgressForCharacter`, `hasCompletedQuest`, `createQuestProgress`
- Added `getQuestsForNpc` method (categorizes quests by state)
- Added `acceptQuest` method (validates and creates quest_progress)
- Added `getObjectiveRequired` helper
- Added `getObjectiveTargetId` helper
- Extended `handleZoneEntered` with auto-discovery logic

### apps/game-server/src/game/game.gateway.ts (+68 lines)

- Extended `handleNpcInteract` to call `questService.getQuestsForNpc`
- Added quest arrays to npc:interact:response payload (only if non-empty)
- Added `handleQuestAccept` handler for quest:accept event

### packages/shared-types/src/network/events.ts (+3 types)

- Added `'quest:accept'` to ClientEventType union
- Added `'quest:accept': { questId: string }` to ClientEvents
- Extended `npc:interact:response` with `availableQuests`, `activeQuests`, `readyQuests` optional arrays

## Validation

Build completed successfully with no TypeScript errors:

```bash
pnpm build
# NX Successfully ran target build for 12 projects
```

All quest state communication is PRIVATE (client.emit, not broadcast), as required.

## Self-Check

Verifying plan must-haves against implementation:

**Truths:**

- ✅ `npc:interact:response` includes `availableQuests`, `activeQuests`, `readyQuests` arrays filtered by faction
- ✅ Player can accept quest via `quest:accept` WebSocket event
- ✅ Quests without `questGiverId` auto-discover on zone entry (explore objective biome match)

**Artifacts:**

- ✅ `packages/shared-types/src/network/events.ts` provides extended npc:interact:response type with quest arrays, contains "availableQuests"
- ✅ `apps/game-server/src/game/quest.service.ts` provides getQuestsForNpc and acceptQuest methods, contains "getQuestsForNpc"
- ✅ `apps/game-server/src/game/game.gateway.ts` provides quest:accept handler and extended npc:interact response, contains "quest:accept"

**Key Links:**

- ✅ `game.gateway.ts` calls `questService.getQuestsForNpc` in handleNpcInteract (line 1062)
- ✅ `quest.service.ts` uses `QuestRegistry.getByFaction` filter (line 315, 372)

## Self-Check: PASSED

All required files exist and contain expected patterns. Commits verified:

- 8a0f281: feat(67-01): add QuestService methods for NPC quest integration
- 100cc2b: feat(67-01): extend npc:interact and add quest:accept handler
