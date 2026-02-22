---
phase: 65-objective-tracking
plan: 02
subsystem: game-server
tags: [nestjs, event-emitter, websocket, quests, domain-events]

# Dependency graph
requires:
  - phase: 65-01
    provides: QuestService with @OnEvent listeners for entity.killed, item.collected, zone.entered events
provides:
  - entity.killed event emission from AbilityService on creature death
  - item.collected event emission from InventoryService on item pickup
  - zone.entered event emission from GameGateway on login and zone transition
affects: [65-03, quest-completion, combat-events, inventory-events, zone-events]

# Tech tracking
tech-stack:
  added: []
  patterns: [domain event emission from game services, biome resolution for zone.entered]

key-files:
  created: []
  modified: [apps/game-server/src/game/ability.service.ts, apps/game-server/src/game/inventory.service.ts, apps/game-server/src/game/game.gateway.ts]

key-decisions:
  - "Use target.speciesId (e.g., 'creature_void_crawler') not instance id for kill objective matching"
  - "Emit item.collected for BOTH stacking and new slot scenarios"
  - "Emit zone.entered on BOTH login/auth AND zone transition for explore objectives"
  - "Create BiomeGenerator per call for biome resolution (stateless, seed-based)"

patterns-established:
  - "Domain event emission: emit after database write for consistency"
  - "Biome resolution helper: resolveZoneBiome() for hub vs world zones"
  - "Quest events use speciesId/itemId/biome for matching, not instance UUIDs"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 65 Plan 02: Game Event Instrumentation Summary

**AbilityService, InventoryService, and GameGateway instrumented to emit domain events for quest objective tracking**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T00:10:47Z
- **Completed:** 2026-02-22T00:13:56Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Instrumented AbilityService to emit entity.killed event with speciesId on creature death
- Instrumented InventoryService to emit item.collected event on successful item pickup
- Instrumented GameGateway to emit zone.entered event on login and zone transition with biome resolution

## Task Commits

Each task was committed atomically:

1. **Task 1: Emit entity.killed event from AbilityService** - `6918819` (feat)
2. **Task 2: Emit item.collected event from InventoryService** - `08922cd` (feat)
3. **Task 3: Emit zone.entered event from GameGateway** - `38c2091` (feat)

## Files Created/Modified
- `apps/game-server/src/game/ability.service.ts` - Injected EventEmitter2, emit entity.killed after creature death with speciesId
- `apps/game-server/src/game/inventory.service.ts` - Injected EventEmitter2, emit item.collected on stacking and new slot scenarios
- `apps/game-server/src/game/game.gateway.ts` - Injected EventEmitter2, added resolveZoneBiome() helper, emit zone.entered on auth and zone transition

## Decisions Made
- **speciesId over instance id:** Quests track kills by species (e.g., 'creature_void_crawler') not individual creature UUIDs
- **Double emission for zone.entered:** Fire on both login and zone transition so explore objectives work correctly
- **BiomeGenerator per-call:** Create new instance with world seed for biome lookup (stateless, deterministic)
- **Emit after database write:** For item.collected, emit after updateInventoryItems() to ensure consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues. Build succeeded with benign Nx lockfile pruning warnings (pre-existing issue documented in 65-01-SUMMARY).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three domain events are now emitted and QuestService listeners (from 65-01) will receive them
- entity.killed fires when player kills a creature, with speciesId for objective matching
- item.collected fires when player picks up an item, with itemId and quantity
- zone.entered fires on login and zone transition, with biome for explore objectives
- Ready for Plan 65-03 (quest completion and rewards)

## Self-Check: PASSED

All files modified:
- apps/game-server/src/game/ability.service.ts - EventEmitter2 injection and entity.killed emit
- apps/game-server/src/game/inventory.service.ts - EventEmitter2 injection and item.collected emit (2 locations)
- apps/game-server/src/game/game.gateway.ts - EventEmitter2 injection, resolveZoneBiome helper, zone.entered emit (2 locations)

All commits verified:
- 6918819: feat(65-02) - entity.killed event
- 08922cd: feat(65-02) - item.collected event
- 38c2091: feat(65-02) - zone.entered event

---
*Phase: 65-objective-tracking*
*Completed: 2026-02-22*
