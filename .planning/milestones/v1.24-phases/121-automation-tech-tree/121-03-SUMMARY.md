---
phase: 121-automation-tech-tree
plan: 03
status: complete
commit: 1f5e657
---

## What was done

1. **Created AutomationService** (`apps/game-server/src/game/automation.service.ts`):
   - `OnModuleInit`: loads all active/depleted deployables from DB into `Map<string, DeployableState>`
   - 60-second tick interval: consumes fuel, accumulates resources, applies degradation, checks expiry
   - 5-minute DB flush: writes dirty state to deployables table
   - `processTick()` is fully synchronous (no async calls, all data from in-memory Map)
   - Deploy handler: validates level, enforces maxPerPlayer, consumes item, creates DB record, spawns zone entity
   - Collect handler: ANY player can collect (PvP looting), transfers accumulated resources to inventory
   - Refuel handler: OWNER only, validates fuel type matches config, adds fuel units, reactivates depleted
   - Dismantle handler: OWNER only, recovers 50% base value as reagents, deletes from DB and Map
   - Interact handler: builds LootWindowData with isOwner check, recipe progress for refineries
   - Panel handler: filters owned deployables, maps to AutomationPanelEntry format

2. **Registered AutomationService** in `apps/game-server/src/game/game.module.ts` (providers + exports)

3. **Wired 6 automation socket events** in `apps/game-server/src/game/game.gateway.ts`:
   - `automation:deploy`, `automation:interact`, `automation:collect`
   - `automation:refuel`, `automation:dismantle`, `automation:panel_request`
   - Each handler: validates player, delegates to AutomationService, emits inventory:update after changes
   - `setServer()` called in `afterInit()`, `onPlayerDisconnect()` called in `handleDisconnect()`

## Verification

- `npx tsc --noEmit` passes in apps/game-server
- AutomationService registered in GameModule providers and exports
- 60s tick interval and 5-min flush interval set up in onModuleInit
- All 6 @SubscribeMessage handlers present
- Deploy enforces maxPerPlayer limits
- Collect allows any player (PvP looting)
- Refuel and dismantle restricted to owner only

## Files modified

- `apps/game-server/src/game/automation.service.ts` (created)
- `apps/game-server/src/game/game.module.ts` (registered AutomationService)
- `apps/game-server/src/game/game.gateway.ts` (added 6 handlers + constructor + afterInit + disconnect)
