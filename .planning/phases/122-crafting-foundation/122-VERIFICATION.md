---
phase: 122-crafting-foundation
status: passed
verified: 2026-03-05
---

# Phase 122: Crafting Foundation - Verification

## Phase Goal
The crafting service exists on the server with all correctness guarantees -- atomic ingredient consumption, server-side timer enforcement, faction gating, one-active-craft enforcement, and recipe unlock persistence.

## Success Criteria Verification

### SC1: crafting:start + timer enforcement
**Status:** PASSED
- `crafting:start` handler in GameGateway delegates to `CraftingService.startCraft()`
- `startCraft()` calls `inventoryService.consumeItems()` which validates all, then mutates atomically
- Timer tracked in `activeCrafts` Map with `startedAt` + `durationMs`
- `collectCraft()` rejects with `CRAFT_NOT_READY` if `Date.now() < active.startedAt + active.durationMs`

### SC2: Error events for invalid requests
**Status:** PASSED
- Insufficient ingredients: `MISSING_INGREDIENTS` error, consumeItems validates before mutation (no inventory change)
- Unowned recipe: `RECIPE_LOCKED` error with descriptive reason (level/quest/POI)
- Wrong faction: `WRONG_FACTION` error with faction name in message
- All errors emitted as `crafting:error` with `{ code, message }` shape

### SC3: One active craft at a time
**Status:** PASSED
- `startCraft()` checks `this.activeCrafts.has(characterId)` before proceeding
- Returns `CRAFT_ACTIVE` error code if craft already in progress

### SC4: Disconnect cancels active craft
**Status:** PASSED
- `GameGateway.handleDisconnect` calls `craftingService.unloadPlayer(player.id)`
- `unloadPlayer()` calls `clearTimeout(active.timerId)` and deletes from `activeCrafts` Map
- No orphaned timers or inventory corruption (ingredients already consumed on start, not refunded)

### SC5: Recipe unlocks persist in DB
**Status:** PASSED
- `recipe_unlocks` table created with `pgTable('recipe_unlocks', ...)` in `packages/database/src/schema/recipe-unlocks.ts`
- Unique constraint on `(characterId, recipeId)` prevents duplicates
- `crafting_proficiency` table persists proficiency XP/level across sessions
- Both tables use `ON DELETE CASCADE` referencing `characters.id`
- Drizzle migration generated: `0009_milky_the_executioner.sql`

## Requirement Coverage

| Req ID | Description | Implementation | Verified |
|--------|-------------|----------------|----------|
| RCPE-07 | Recipe definitions as static data in shared package | `RecipeDefinition` type in `packages/shared-types/src/game/crafting.ts`, exported from barrel | PASSED |
| CRFT-03 | Server validates crafting requests | 7-step validation in `CraftingService.startCraft()` | PASSED |
| CRFT-04 | Atomic ingredient consumption | `InventoryService.consumeItems()` — validate-all-then-mutate pattern | PASSED |
| CRFT-05 | Server-side timer enforcement | `activeCrafts` Map with `startedAt + durationMs`, reject early collect | PASSED |
| CRFT-06 | One active craft at a time | `activeCrafts.has(characterId)` check before start | PASSED |
| CRFT-07 | Cancel on disconnect | `unloadPlayer()` clears timeout and Map entry in handleDisconnect | PASSED |
| PROF-05 | Proficiency persists in DB | `crafting_proficiency` table with JSONB, load on join, persist on update | PASSED |

## Must-Haves Check

| Truth | Status |
|-------|--------|
| CraftingDiscipline, RecipeDefinition, CraftingProficiencyData importable from shared-types | PASSED |
| crafting_proficiency table exists with JSONB proficiency | PASSED |
| recipe_unlocks table exists with unique (characterId, recipeId) | PASSED |
| InventoryService.consumeItems validates atomically | PASSED |
| Crafting WebSocket events defined in ClientEvents/ServerEvents | PASSED |
| CraftingService enforces all 5 success criteria | PASSED |
| Disconnect cleanup cancels craft, clears timer | PASSED |
| Nearby broadcast on craft start | PASSED |
| Proficiency loads from DB on join, persists XP gains | PASSED |

## Compilation Check
- `packages/shared-types`: PASSED
- `packages/database`: PASSED
- `apps/game-server`: PASSED

## Score: 7/7 requirements, 5/5 success criteria, 9/9 must-haves

**Verification: PASSED**
