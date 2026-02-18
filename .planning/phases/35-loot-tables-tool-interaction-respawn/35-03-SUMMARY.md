---
phase: 35-loot-tables-tool-interaction-respawn
plan: 03
subsystem: game-logic
tags: [nestjs, socket.io, drizzle, loot-tables, entity-interaction, respawn, game-server]

# Dependency graph
requires:
  - phase: 35-01
    provides: rollLootTable, getCreatureLoot, CREATURE_LOOT_TABLES, ground_items DB schema
  - phase: 35-02
    provides: ItemDefinition.range property and tool range values
  - phase: 34-01
    provides: ZonesService.recordEntityKill(), entity_lifecycle DB table
  - phase: 33-02
    provides: EntityRegistry, CreatureDefinition, MineralDefinition, PlantDefinition
provides:
  - EntityService with handleToolUse() routing to handleMine/handleHarvest/handleAttack/handleCollect
  - applyRespawnVariance() applying +/-25% jitter to all entity respawn timers
  - persistGroundItem() and removeGroundItem() for DB-backed ground item lifecycle
  - entity:tool_use ClientEvent type in shared-types
  - respawnSeconds on all 10 CreatureDefinition instances (180-900s by tier)
affects:
  - 35-04 (respawn tick reads entity_lifecycle records written here)
  - Phase 36 AI (damage from handleAttack starts creature health state)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - EntityService as dedicated interaction router — separates tool use logic from GameService
    - applyRespawnVariance() variance function for RESP-02 compliance
    - ToolUseResult.entityChanges typed as Record<string,unknown> to accommodate subtype fields

key-files:
  created:
    - apps/game-server/src/game/entity.service.ts
  modified:
    - packages/shared-types/src/network/events.ts
    - packages/entities/src/types.ts
    - packages/entities/src/definitions/creatures.ts
    - packages/entities/src/registry.ts
    - apps/game-server/src/game/game.module.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/game-server/src/game/game.service.ts

key-decisions:
  - "ToolUseResult.entityChanges typed as Record<string,unknown> — Partial<Entity> excludes subtype fields (health, yield) so a wider type is needed for gateway broadcast"
  - "EntityService injected directly (not forwardRef) into GameService — no circular dependency exists"
  - "UNKNOWN_ENTITY fallback in EntityRegistry given respawnSeconds: 60 — satisfies new required property without semantic impact"

patterns-established:
  - "Entity interaction routing: handleToolUse() switches on entity.type, delegates to typed private methods"
  - "Respawn variance: applyRespawnVariance(baseSeconds) called at every recordEntityKill site"

# Metrics
duration: 15min
completed: 2026-02-18
---

# Phase 35 Plan 03: EntityService Tool Interaction Summary

**EntityService with tool-based entity interactions (mine/harvest/attack/collect), loot resolution via rollLootTable, ground item DB persistence, and per-creature respawnSeconds with +/-25% variance**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-18T16:20:00Z
- **Completed:** 2026-02-18T16:38:56Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- EntityService created with handleToolUse() routing by entity type to handleMine/handleHarvest/handleAttack/handleCollect
- All loot resolution paths use rollLootTable() and getCreatureLoot() with ground item DB persistence
- entity:tool_use added to ClientEvents with targetEntityId payload; handler broadcasts entity:update and entity:spawn to zone
- handleItemDrop() and handleItemPickup() in GameService now persist/remove from ground_items table via EntityService
- All 10 creatures given tier-appropriate respawnSeconds (180s Void Crawler → 900s Void Horror)
- applyRespawnVariance() applies +/-25% jitter to every recordEntityKill call (RESP-02 compliance)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add entity:tool_use to ClientEvents and respawnSeconds to CreatureDefinition** - `5b286ea` (feat)
2. **Task 2: Create EntityService with tool use handlers and randomized respawn variance** - `5ee3d44` (feat)
3. **Task 3: Add entity:tool_use handler and retrofit item drop persistence** - `8202669` (feat)

## Files Created/Modified
- `apps/game-server/src/game/entity.service.ts` - New service with all tool interaction handlers and DB persistence
- `packages/shared-types/src/network/events.ts` - Added entity:tool_use to ClientEventType and ClientEvents
- `packages/entities/src/types.ts` - Added respawnSeconds to CreatureDefinition interface
- `packages/entities/src/definitions/creatures.ts` - Added respawnSeconds to all 10 creature definitions
- `packages/entities/src/registry.ts` - Added respawnSeconds to UNKNOWN_ENTITY fallback (bug fix)
- `apps/game-server/src/game/game.module.ts` - Added EntityService to providers and exports
- `apps/game-server/src/game/game.gateway.ts` - Injected EntityService, added entity:tool_use @SubscribeMessage handler
- `apps/game-server/src/game/game.service.ts` - Injected EntityService, retrofitted handleItemDrop and handleItemPickup

## Decisions Made
- `ToolUseResult.entityChanges` typed as `Record<string,unknown>` — `Partial<Entity>` only has base Entity fields; `health` and `yield` are on subtypes (`Creature`, `Mineral`) and cannot be part of the intersection. Widening to `Record<string,unknown>` allows correct broadcasting of subtype field changes.
- `EntityService` injected directly into `GameService` without `forwardRef` — no circular dependency since `EntityService` only depends on `ZonesService`, `InventoryService`, `PlayerService`, and `DatabaseService`.
- `UNKNOWN_ENTITY` fallback given `respawnSeconds: 60` — the required interface property was added to `CreatureDefinition`, so the fallback entity (used for unknown entity IDs) also needs the field. Value of 60 has no gameplay impact since the fallback is an error indicator.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed UNKNOWN_ENTITY fallback missing respawnSeconds property**
- **Found during:** Task 1 (building entities package after adding respawnSeconds to CreatureDefinition)
- **Issue:** `UNKNOWN_ENTITY` in `packages/entities/src/registry.ts` was typed as `CreatureDefinition` but was missing the new required `respawnSeconds` field — build failed with TS2741
- **Fix:** Added `respawnSeconds: 60` to the UNKNOWN_ENTITY fallback object
- **Files modified:** `packages/entities/src/registry.ts`
- **Verification:** `npx nx run entities:build` passes cleanly
- **Committed in:** `5b286ea` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed ToolUseResult.entityChanges type incompatibility**
- **Found during:** Task 2 (building game-server after creating EntityService)
- **Issue:** `entityChanges?: Partial<Entity>` rejected `{ health: 0, active: false }` and `{ yield: 0, active: false }` — those fields exist on `Creature` and `Mineral` subtypes, not on base `Entity`
- **Fix:** Changed type to `Record<string,unknown>` to allow subtype fields while maintaining runtime correctness
- **Files modified:** `apps/game-server/src/game/entity.service.ts`
- **Verification:** `npx nx run game-server:build --skip-nx-cache` passes with no TypeScript errors
- **Committed in:** `5ee3d44` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes were required for compilation. No scope creep. Logic unchanged.

## Issues Encountered
None beyond the two type errors documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EntityService is ready to be called by Phase 35-04 respawn tick (entity deaths are now persisted to entity_lifecycle with variance timers)
- handleAttack() uses simplified 10-damage model — Phase 36 combat system can replace this with full damage calculation
- All ground item DB writes are in place for zone eviction recovery

## Self-Check: PASSED

- `apps/game-server/src/game/entity.service.ts` — FOUND
- `packages/shared-types/src/network/events.ts` — FOUND
- `packages/entities/src/definitions/creatures.ts` — FOUND
- `.planning/phases/35-loot-tables-tool-interaction-respawn/35-03-SUMMARY.md` — FOUND
- Commit `5b286ea` — FOUND
- Commit `5ee3d44` — FOUND
- Commit `8202669` — FOUND

---
*Phase: 35-loot-tables-tool-interaction-respawn*
*Completed: 2026-02-18*
