---
phase: 108-entity-validation-infrastructure
plan: 02
status: complete
started: 2026-03-02
completed: 2026-03-02
---

## Summary

Implemented ID constant drift validation and harvest yield item reference validation tests, completing the Entity Validation Infrastructure phase.

## Tasks Completed

### Task 1: Create id-constants.test.ts
- 441 tests across 5 validation groups, all passing
- Group 1: Every ENTITY_IDS constant maps to a registered entity (forward direction)
- Group 2: Every registered entity has a matching ENTITY_IDS constant (reverse direction)
- Group 3: All entity ID values follow snake_case naming convention
- Group 4: ENTITY_IDS constant names match entity ID values (UPPER matches lower)
- Group 5: No duplicate entity IDs in ALL_ENTITIES

### Task 2: Create harvest-yields.test.ts
- 220 tests across 7 validation groups, all passing after violation fix
- Group 1: Every plant harvestYield itemId exists in ItemRegistry
- Group 2: Every mineral miningYield itemId exists in ItemRegistry
- Group 3: Plant harvest yields don't reference equipment items (type correctness)
- Group 4: Mineral mining yields don't reference equipment items (type correctness)
- Group 5: Plant harvest yield value ranges are valid (chance, min/max amounts)
- Group 6: Mineral mining yield value ranges are valid
- Group 7: Every plant/mineral has at least one yield entry

## Issues Encountered

1. **Missing `reagent_volatile_extract` item**: `mineral_marsh_gas_node` referenced `reagent_volatile_extract` in its miningYield but the item didn't exist in ItemRegistry. Fixed by adding the item definition to `packages/items/src/definitions/reagents.ts` (rare reagent, volatile compound from marsh gas vents) and its constant to `packages/items/src/definitions/index.ts`.

## Artifacts

| File | Status |
|------|--------|
| `packages/entities/src/__tests__/id-constants.test.ts` | Created |
| `packages/entities/src/__tests__/harvest-yields.test.ts` | Created |
| `packages/items/src/definitions/reagents.ts` | Modified (added REAGENT_VOLATILE_EXTRACT) |
| `packages/items/src/definitions/index.ts` | Modified (added ITEM_IDS constant) |

## Test Results

```
✓ src/__tests__/id-constants.test.ts (441 tests) 9ms
✓ src/__tests__/harvest-yields.test.ts (220 tests) 8ms
✓ src/__tests__/loot-tables.test.ts (164 tests) 5ms
✓ src/__tests__/spawn-configs.test.ts (385 tests) 12ms

 Test Files  4 passed (4)
      Tests  1210 passed (1210)
```
