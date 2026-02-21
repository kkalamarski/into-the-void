---
phase: 64-quest-foundations
plan: 01
subsystem: quest-system
tags: [packages, quest-definitions, state-machine, registry]
dependency_graph:
  requires: [packages/npcs-pattern, packages/entities, packages/items]
  provides: [packages/quests, quest-types, quest-validation]
  affects: []
tech_stack:
  added: [packages/quests]
  patterns: [singleton-registry, discriminated-unions, pure-validation]
key_files:
  created:
    - packages/quests/src/types.ts
    - packages/quests/src/registry.ts
    - packages/quests/src/definitions/tutorial.ts
    - packages/quests/src/definitions/verdant.ts
    - packages/quests/src/definitions/helix.ts
    - packages/quests/src/definitions/nexus.ts
    - packages/shared-types/src/game/quest.ts
    - packages/game-logic/src/quest/validation.ts
  modified:
    - packages/shared-types/src/index.ts
    - packages/game-logic/src/index.ts
decisions: []
metrics:
  duration_seconds: 196
  tasks_completed: 3
  files_created: 12
  commits: 2
  completed_at: 2026-02-21T23:37:56Z
---

# Phase 64 Plan 01: Quest Foundations Summary

**One-liner:** Created quest system foundation with TypeScript definitions, singleton registry, and state machine validation following proven packages/npcs pattern.

## What Was Built

### packages/quests Package
- **QuestDefinition discriminated union** with typed objectives (kill/gather/explore)
- **QuestRegistry singleton** with Map storage and getByFaction filtering
- **8 starter quest definitions**: 2 tutorial (all factions), 2 Verdant, 2 Helix, 2 Nexus
- Auto-registration on module load matching packages/npcs pattern exactly

### Quest Types (shared-types)
- **QuestState**: `'available' | 'active' | 'completed' | 'failed'`
- **ObjectiveProgress**: Client/server contract for objective tracking
- **QuestProgressPayload**: Complete quest state sent to client
- **QuestStateUpdate**: Quest state change events

### Quest Validation (game-logic)
- **validateQuestTransition**: Pure function validating state machine transitions
- **areAllObjectivesComplete**: Helper for objective completion checks
- Valid transitions:
  - `available -> active` (quest acceptance)
  - `active -> completed` (all objectives met)
  - `active -> failed` (abandonment)
- Terminal states (`completed`, `failed`) cannot transition

## Technical Decisions

### Pattern Replication
Exactly mirrored packages/npcs architecture:
- Singleton registry with Map storage
- Discriminated unions for type safety
- UNKNOWN_QUEST fallback (prevents crashes)
- Auto-registration on module load
- Separate definitions files per faction

### Quest Objectives Design
Used discriminated union for objectives:
- `KillObjective`: targetEntityId + targetCount
- `GatherObjective`: itemId + quantity
- `ExploreObjective`: biome identifier

This allows type-safe handling in TypeScript while remaining flexible for future objective types.

### State Machine
Simple 4-state model:
1. **available**: Quest can be accepted
2. **active**: Player pursuing objectives
3. **completed**: All objectives done (terminal)
4. **failed**: Quest abandoned (terminal)

Terminal states prevent re-completion exploits.

## Verification Results

All verification tests passed:

```
✓ QuestRegistry.size = 8
✓ QuestRegistry.get('quest_tutorial_first_steps') returns correct quest
✓ QuestRegistry.getByFaction('verdant') returns 4 quests (2 tutorial + 2 verdant)
✓ validateQuestTransition('available', 'active', false) = true
✓ validateQuestTransition('active', 'completed', true) = true
✓ validateQuestTransition('active', 'completed', false) = false (Not all objectives completed)
✓ validateQuestTransition('completed', 'active', true) = false (Quest already completed)
✓ pnpm build succeeds - all packages compile
```

## Quest Definitions Created

### Tutorial Quests (All Factions)
1. **First Steps**: Kill 3 void crawlers → 100 credits, 50 XP
2. **Resource Gathering**: Collect 5 fungal spore clusters → 75 credits, 40 XP

### Verdant Dynamics Quests
1. **Biodiversity Survey**: Kill 5 crystal hunters + explore crystal caves → 200 credits, 100 XP
2. **Luminous Specimen Collection**: Collect 3 luminous extracts → 150 credits, 75 XP

### Helix Extraction Quests
1. **Excavation Site Clearance**: Kill 4 void crawlers → 250 credits, 125 XP
2. **Crater Dust Collection**: Collect 5 crater dust samples → 175 credits, 85 XP

### Nexus Frontiers Quests
1. **Volcanic Reconnaissance**: Explore volcanic reaches → 300 credits, 150 XP
2. **Crystal Salvage Operation**: Collect 4 crystal fragments → 200 credits, 100 XP

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

Ready for Phase 64 Plan 02:
- Database schema for quest_progress tracking
- Character quest state persistence
- Server-side quest management service

## Self-Check: PASSED

### Created Files Verification
```
✓ packages/quests/package.json
✓ packages/quests/tsconfig.json
✓ packages/quests/src/types.ts
✓ packages/quests/src/registry.ts
✓ packages/quests/src/index.ts
✓ packages/quests/src/definitions/tutorial.ts
✓ packages/quests/src/definitions/verdant.ts
✓ packages/quests/src/definitions/helix.ts
✓ packages/quests/src/definitions/nexus.ts
✓ packages/quests/src/definitions/index.ts
✓ packages/shared-types/src/game/quest.ts
✓ packages/game-logic/src/quest/validation.ts
✓ packages/game-logic/src/quest/index.ts
```

### Commits Verification
```
✓ ababd41: feat(64-01): create packages/quests with 8 starter quests
✓ 363f9e8: feat(64-01): add quest types to shared-types and validation to game-logic
```

All files created and all commits present in repository.
