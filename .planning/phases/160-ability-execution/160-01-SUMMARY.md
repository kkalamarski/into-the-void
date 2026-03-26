# Phase 160 Plan 01 Summary: Server-side Cross-zone Entity Resolution + Auto-targeting

**Status:** Complete
**Commit:** 8507409

## What Changed

### apps/game-server/src/zones/zones.service.ts
- Added `findEntityAcrossZones(playerZoneId, entityId)` — searches player's zone first, then 8 adjacent zones in the 3x3 grid
- Added `getEntitiesAcrossZones(playerZoneId)` — returns all active entities across 3x3 grid for auto-targeting

### apps/game-server/src/game/ability.service.ts
- Replaced single-zone `getEntity()` with `findEntityAcrossZones()` in `useAbility()`, `completeCast()`, and `buildEffectServices()`
- Added `findNearestTarget(player, ability)` — auto-selects nearest creature for combat abilities, nearest resource for gather abilities, within range
- Auto-targeting activates when `ability.requiresTarget` is true but no targetEntityId provided
- Updated error messages: "On cooldown" (was "Ability on cooldown"/"Global cooldown active"), "No energy" (was "Not enough energy"), "Can't attack that" (was "Invalid target type"), "No target" (was "Ability requires a target")
- Added `Entity` import from shared-types

## Decisions
- Cross-zone lookup checks player's own zone first for efficiency
- Auto-target uses pixel distance with ability range as limit
- Entity pixel position computed as tile center: `position.x * TILE_SIZE_PX + TILE_SIZE_PX / 2`

---
*Phase: 160-ability-execution*
*Plan: 01*
