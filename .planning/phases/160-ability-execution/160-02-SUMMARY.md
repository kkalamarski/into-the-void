# Phase 160 Plan 02 Summary: Client-side Error Feedback + Combat Log

**Status:** Complete
**Commit:** 8507409

## What Changed

### apps/web/src/game/rendering/EntityRenderer.ts
- Added `createFloatingError(scene, x, y, message)` — red (#ff4444) floating text, 48px font, 1200ms fade animation, modeled on createFloatingDamage

### apps/web/src/game/scenes/controllers/EntityManager.ts
- Added `showErrorText(message)` — positions error text at local player's location

### apps/web/src/game/scenes/WorldScene.ts
- Added `showErrorText(message)` — delegates to EntityManager

### apps/web/src/store/abilityStore.ts
- ability:result error handler now shows floating error text via WorldScene (was console.warn only)
- ability:result success with damage records combat log entry with target name from entity store
- Added imports: useGameStore, useCombatLogStore, useEntityStore
- useCombatStore accessed via lazy require() to avoid circular dependency

### apps/web/src/ui/hud/ActionBar.tsx
- Click handler: shows "On cooldown" / "No energy" floating text before returning early
- Keydown handler: same client-side pre-validation with instant floating text

## Decisions
- Error text uses 48px font (smaller than 64px damage numbers) to avoid overpowering
- Error text duration 1200ms (slightly longer than 1000ms damage) for readability
- Circular dependency combatStore<->abilityStore resolved with lazy require()

---
*Phase: 160-ability-execution*
*Plan: 02*
