---
phase: 121-automation-tech-tree
plan: 02
status: complete
commit: d90925d
---

## What was done

1. **Created deployables database schema** in `packages/database/src/schema/deployables.ts`:
   - pgTable with columns: id, deployable_type, name, position (jsonb), owner_id (FK cascade), durability, max_durability, fuel_remaining, max_fuel, accumulated_resources (jsonb), status, deployed_at, expires_at, last_tick_at, properties (jsonb)
   - Exports: `deployables`, `Deployable`, `NewDeployable`

2. **Created 7 CRUD query functions** in `packages/database/src/queries/deployables.ts`:
   - `createDeployable`, `getDeployableById`, `getDeployablesByOwner`, `getAllActiveDeployables`, `updateDeployable`, `updateDeployableAccumulated`, `deleteDeployable`

3. **Created automation types** in `packages/shared-types/src/game/automation.ts`:
   - `AutomationStructureType` union (4 values)
   - `AutomationConfig` interface + `AUTOMATION_CONFIGS` record (4 entries matching BALANCE-SHEET.md)
   - `RefineryRecipe` interface + `REFINERY_RECIPES` array (3 recipes)
   - `AutomationPanelEntry` and `LootWindowData` interfaces

4. **Added socket events** to `packages/shared-types/src/network/events.ts`:
   - 6 client events: deploy, interact, collect, refuel, dismantle, panel_request
   - 7 server events: deployed, loot_window, collected, refueled, dismantled, panel_state, status_update

5. **Updated exports** in schema/index.ts, queries/index.ts, database index.ts, and shared-types index.ts.

## Verification

- `npx tsc --noEmit` passes in both packages/database and packages/shared-types
- deployables table has all required columns
- 7 query functions exported from @into-the-void/database
- AUTOMATION_CONFIGS has 4 entries, REFINERY_RECIPES has 3 entries
- 6 client and 7 server events typed in events.ts

## Files modified

- `packages/database/src/schema/deployables.ts` (created)
- `packages/database/src/queries/deployables.ts` (created)
- `packages/database/src/schema/index.ts` (added deployables export)
- `packages/database/src/queries/index.ts` (added deployables export)
- `packages/database/src/index.ts` (added deployables query export)
- `packages/shared-types/src/game/automation.ts` (created)
- `packages/shared-types/src/network/events.ts` (added automation events)
- `packages/shared-types/src/index.ts` (added automation export)
