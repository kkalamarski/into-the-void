---
phase: 121-automation-tech-tree
plan: 01
status: complete
commit: 83ee54b
---

## What was done

1. **Created BALANCE-SHEET.md design artifact** documenting income/sink balance for all automation tiers (T2-T5). Every tier maintains >= 60% maintenance cost ratio as required by AUTO-05/AUTO-06.

2. **Created 4 fuel items** in `packages/items/src/definitions/fuel-items.ts`:
   - `fuel_cell_basic` (common, T2 extractors, 120cr)
   - `fuel_cell_advanced` (rare, T3 beacons, 400cr)
   - `power_core` (epic, T4 planetary extractors, 500cr)
   - `refinery_core` (exotic, T5 refineries, 600cr)
   All use `reagent` category to prevent direct inventory:use consumption.

3. **Created 4 deployable structure items** in `packages/items/src/definitions/deployable-items.ts`:
   - `deployable_extractor` (common, L10, 500cr)
   - `deployable_survey_beacon` (rare, L20, 1500cr)
   - `deployable_planetary_extractor` (epic, L30, 5000cr)
   - `deployable_refinery` (exotic, L40, 10000cr)
   All use `consumable` category with `deploy` effect trigger.

4. **Added `deploy` effect type** to `ItemEffect` union in `packages/items/src/types.ts`.

5. **Registered all 8 items** in `packages/items/src/definitions/index.ts` with ITEM_IDS constants and re-exports.

## Verification

- `npx tsc --noEmit` passes in packages/items
- All 8 items registered in ItemRegistry (verified via runtime check)
- Fuel items use 'reagent' category (not 'consumable')
- Deployable items have deploy effect with correct deployableType
- BALANCE-SHEET.md documents maintenance >= 60% for all tiers

## Files modified

- `.planning/phases/121-automation-tech-tree/BALANCE-SHEET.md` (created)
- `packages/items/src/definitions/fuel-items.ts` (created)
- `packages/items/src/definitions/deployable-items.ts` (created)
- `packages/items/src/types.ts` (added deploy effect type)
- `packages/items/src/definitions/index.ts` (registered new items)
