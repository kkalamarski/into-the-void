---
phase: 123-recipe-content-and-quality-system
plan: 02
subsystem: items
tags: [crafting, recipes, processed-reagents, economic-balance, crafting-chains]

requires:
  - phase: 122
    provides: RecipeDefinition type, CraftingDiscipline type
provides:
  - 5 processed reagent items as crafting chain intermediates
  - 30 recipe definitions across 3 disciplines (equipment, consumables, reagents)
  - RECIPE_IDS constant for type-safe recipe references
  - ALL_RECIPES array for bulk registration
affects: [123-03, 123-04, crafting-service-registration]

tech-stack:
  added: []
  patterns: [economic-balance-comments, two-step-crafting-chains]

key-files:
  created:
    - packages/items/src/definitions/processed-reagents.ts
    - packages/items/src/definitions/recipes.ts
  modified:
    - packages/items/src/definitions/index.ts

key-decisions:
  - "5 processed reagents: bioweave_fiber(120), thermal_alloy(400), crystal_lens(90), synth_compound(250), circuit_matrix(800)"
  - "XP by tier: T1=10, T2=25, T3=50"
  - "Timer ranges: equipment 15-30s, consumables 3-8s, reagents 5-15s"
  - "Some recipes intentionally exceed 80-120% balance for utility items (stims, sensor modules)"

patterns-established:
  - "Balance comments: every recipe includes ingredient cost, output value, and ratio in comments"
  - "Two-step chains: Reagents discipline processes raw -> processed, Equipment/Consumables consume processed"

requirements-completed: [RCPE-01, RCPE-02, RCPE-03, RCPE-05, CONT-01, CONT-02, CONT-04]

duration: 15min
completed: 2026-03-05
---

# Phase 123 Plan 02: Processed Reagents and Recipe Definitions Summary

**30 economically-balanced recipes across 3 disciplines with 5 processed reagent intermediates forming two-step crafting chains**

## Performance

- **Duration:** 15 min
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- 5 new processed reagent items registered in ItemRegistry (247 total items)
- 30 recipes: 10 reagents + 10 consumables + 10 equipment discipline
- Two-step chains: raw materials -> processed reagents -> final items
- All recipes have at least one unlock condition (no auto-unlocked)
- Economic balance documented with ratio comments

## Task Commits

1. **Task 1: Processed reagent items** - `40b7d5e` (feat)
2. **Task 2: Recipe definitions** - `40b7d5e` (feat)

## Files Created/Modified
- `packages/items/src/definitions/processed-reagents.ts` - 5 processed reagent ItemDefinitions
- `packages/items/src/definitions/recipes.ts` - 30 recipe definitions + RECIPE_IDS constant
- `packages/items/src/definitions/index.ts` - Added imports, ALL_ITEMS spread, ITEM_IDS entries, re-exports

## Decisions Made
- Some utility recipes (stims, sensor modules) have ingredient costs exceeding output baseValue to reflect their gameplay impact
- Frost distillation and volatile processing are raw-to-rare conversion recipes with premium ingredient costs

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ALL_RECIPES ready for Plan 03 CraftingService registration
- Faction recipes (Plan 04) can extend ALL_RECIPES

---
*Phase: 123-recipe-content-and-quality-system*
*Completed: 2026-03-05*
