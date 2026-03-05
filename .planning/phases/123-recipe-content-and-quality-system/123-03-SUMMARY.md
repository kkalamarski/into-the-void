---
phase: 123-recipe-content-and-quality-system
plan: 03
subsystem: game-server
tags: [crafting, quality-rolls, xp-decay, nestjs, socket-events, recipe-registration]

requires:
  - phase: 123-01
    provides: rollQualityTier, calculateEffectiveXP, getQualityStatMultiplier
  - phase: 123-02
    provides: ALL_RECIPES array for registration
provides:
  - Quality roll integration in collectCraft (replaces hardcoded 'standard')
  - XP decay applied before awarding proficiency XP
  - Auto-registration of all recipes via onModuleInit
  - Recipe list query with per-character unlock status
  - Masterwork broadcast to nearby players
affects: [crafting-ui, recipe-browser]

tech-stack:
  added: []
  patterns: [onModuleInit-registration, event-driven-broadcast]

key-files:
  created: []
  modified:
    - apps/game-server/src/game/crafting.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - packages/shared-types/src/network/events.ts

key-decisions:
  - "Quality stored in item properties only for non-standard tiers (cleaner data)"
  - "Masterwork broadcast uses EventEmitter2 pattern with OnEvent handler in gateway"
  - "Recipe list query does not check ingredient availability (too expensive for full list)"

patterns-established:
  - "onModuleInit for recipe registration: CraftingService auto-registers ALL_RECIPES on startup"
  - "Quality tier in properties: qualityTier field only present for refined/masterwork items"

requirements-completed: [RCPE-04, PROF-01, PROF-02, PROF-03, PROF-04]

duration: 10min
completed: 2026-03-05
---

# Phase 123 Plan 03: Wire Quality Rolls, XP Decay, and Recipe Registration Summary

**CraftingService now rolls quality tiers on craft completion, applies XP decay, auto-registers 39 recipes on startup, and broadcasts masterwork achievements**

## Performance

- **Duration:** 10 min
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced hardcoded 'standard' quality with rollQualityTier probability rolls
- Quality tier stored in crafted item properties for stat computation
- XP decay prevents grinding: high-proficiency crafters get reduced XP from low-tier recipes
- 39 recipes auto-registered on server startup via onModuleInit
- Masterwork crafts broadcast to all players in same zone
- Recipe list query endpoint with per-character unlock status

## Task Commits

1. **Task 1: Recipe registration + recipe list query** - `565f8cf` (feat)
2. **Task 2: Quality rolls + XP decay** - `565f8cf` (feat)

## Files Created/Modified
- `apps/game-server/src/game/crafting.service.ts` - Added onModuleInit, quality rolls, XP decay, getRecipeList
- `apps/game-server/src/game/game.gateway.ts` - Added crafting:recipes handler, masterwork broadcast handler
- `packages/shared-types/src/network/events.ts` - Added crafting:recipes, crafting:recipe-list event types

## Decisions Made
- Standard quality items get no qualityTier property (cleaner data, only non-standard items tagged)
- Recipe list query omits ingredient availability check to keep response fast
- Masterwork broadcast uses existing Socket.IO room pattern (player.position.zoneId)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Crafting system fully functional with quality, XP decay, and recipe content
- Client can request recipe list and receive unlock status per character

---
*Phase: 123-recipe-content-and-quality-system*
*Completed: 2026-03-05*
