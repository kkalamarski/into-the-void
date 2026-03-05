---
phase: 122-crafting-foundation
plan: 01
status: complete
duration: ~3min
---

# Plan 122-01 Summary: Crafting Types, DB Schema, and Atomic Ingredient Consumption

## What Was Built

Foundational types, database tables, and inventory method for the crafting system.

### Task 1: Crafting Types and WebSocket Events
- Created `packages/shared-types/src/game/crafting.ts` with `CraftingDiscipline`, `RecipeIngredient`, `RecipeUnlockCondition`, `RecipeDefinition`, `CraftingProficiencyData`, and `QualityTier` types
- Extended `ClientEvents` with `crafting:start` and `crafting:collect`
- Extended `ServerEvents` with `crafting:started`, `crafting:completed`, `crafting:error`, and `crafting:nearby`
- Re-exported from barrel `packages/shared-types/src/index.ts`

### Task 2: DB Schema and consumeItems
- Created `packages/database/src/schema/crafting-proficiency.ts` — JSONB proficiency table for 3 disciplines (mirrors gathering pattern)
- Created `packages/database/src/schema/recipe-unlocks.ts` — append-only join table with unique (characterId, recipeId) constraint
- Added `InventoryService.consumeItems()` — validate-all-then-mutate pattern for atomic ingredient consumption
- Generated Drizzle migration `0009_milky_the_executioner.sql`

## Key Files

<key-files>
created:
  - packages/shared-types/src/game/crafting.ts
  - packages/database/src/schema/crafting-proficiency.ts
  - packages/database/src/schema/recipe-unlocks.ts
  - packages/database/drizzle/0009_milky_the_executioner.sql
modified:
  - packages/shared-types/src/index.ts
  - packages/shared-types/src/network/events.ts
  - packages/database/src/schema/index.ts
  - apps/game-server/src/game/inventory.service.ts
</key-files>

## Decisions Made
- Used diminishing returns curve for proficiency speed (defined in types, implemented in Plan 02)
- `consumeItems` iterates inventory items in reverse to consume from last stacks first (preserves earlier slots)
- Recipe unlock conditions typed as discriminated union for extensibility

## Self-Check: PASSED
- [x] All crafting types importable from @into-the-void/shared-types
- [x] Two new DB tables with proper schema and exports
- [x] WebSocket event types for crafting flow defined
- [x] InventoryService.consumeItems validates atomically
- [x] Drizzle migration generated
- [x] All packages compile cleanly (shared-types, database, game-server)
