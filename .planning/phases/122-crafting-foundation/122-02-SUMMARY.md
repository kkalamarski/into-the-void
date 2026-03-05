---
phase: 122-crafting-foundation
plan: 02
status: complete
duration: ~4min
---

# Plan 122-02 Summary: CraftingService with All Validation Guards

## What Was Built

Complete CraftingService with all server-side correctness guarantees, wired into GameGateway and GameModule.

### Task 1: CraftingService Implementation
- Created `apps/game-server/src/game/crafting.service.ts` (~290 lines)
- **startCraft**: 7-step validation pipeline (player, one-active-craft, recipe lookup, faction, unlock conditions, atomic ingredient consumption, timer start)
- **collectCraft**: Timer enforcement (rejects early collection), output item production, proficiency XP award
- **unloadPlayer**: Disconnect cleanup — clearTimeout, delete active craft, evict proficiency cache
- **loadProficiency**: Load from DB on join, create default if missing, cache in Map
- All 7 error codes: CRAFT_ACTIVE, MISSING_INGREDIENTS, RECIPE_LOCKED, WRONG_FACTION, CRAFT_NOT_READY, NO_ACTIVE_CRAFT, RECIPE_NOT_FOUND
- Recipe registry (Map<string, RecipeDefinition>) with registerRecipe/getRecipe/getAllRecipes exports
- Proficiency speed curve: diminishing returns `1 - 0.5 * (level/maxLevel)^0.7`, capped at 50% reduction
- Level calculation: `floor(sqrt(xp / 100)) + 1`, capped at level 50

### Task 2: Gateway and Module Wiring
- **GameGateway**: Added `@SubscribeMessage('crafting:start')` and `@SubscribeMessage('crafting:collect')` handlers
- **GameGateway**: Crafting:nearby broadcast to zone room on craft start (social indicator)
- **GameGateway handleDisconnect**: Added `craftingService.unloadPlayer(player.id)` cleanup
- **GameGateway auth handler**: Added `craftingService.loadProficiency(result.player.id)` on join
- **GameModule**: CraftingService in providers and exports arrays

## Key Files

<key-files>
created:
  - apps/game-server/src/game/crafting.service.ts
modified:
  - apps/game-server/src/game/game.gateway.ts
  - apps/game-server/src/game/game.module.ts
</key-files>

## Decisions Made
- Ingredients consumed on start, NOT refunded on disconnect (per STATE.md design decision)
- Quality tier hardcoded to 'standard' for Phase 122 (Phase 123 implements quality calculation)
- Level formula mirrors gathering: `floor(sqrt(xp/100)) + 1` capped at 50
- Unlock conditions check recipe_unlocks table (quest/POI entries written by event listeners in Phase 123)
- setTimeout grace period: +1s beyond adjusted duration for network latency tolerance

## Self-Check: PASSED
- [x] CraftingService exists with startCraft, collectCraft, unloadPlayer, loadProficiency, getActiveCraft
- [x] All 7 error codes present
- [x] Gateway has @SubscribeMessage for crafting:start and crafting:collect
- [x] GameModule registers CraftingService
- [x] Disconnect handler calls craftingService.unloadPlayer
- [x] Player join flow calls craftingService.loadProficiency
- [x] TypeScript compiles cleanly
