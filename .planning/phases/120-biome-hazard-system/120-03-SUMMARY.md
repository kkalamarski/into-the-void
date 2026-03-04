# Plan 120-03 Summary: HazardService Server Implementation

**Status:** Complete
**Commits:** afcf38c

## What Was Built

Implemented the server-side HazardService that manages per-player hazard state using a synchronous Map for tick-budget-safe reads. The service integrates with the AI tick loop to apply HP drain in hazardous biomes, handles hub zone exemption (HAZD-09), 3-second grace period (HAZD-10), Tier IV stacking escalation (HAZD-04), and emits hazard state events to clients for HUD display.

## Key Files

### Created
- `apps/game-server/src/game/hazard.service.ts` -- HazardService with per-player state management: onPlayerEnteredZone (@OnEvent), onPlayerEquipmentChanged, processHazardTick (synchronous), clearHazardState, getPlayerProtection, emitHazardUpdate, onPlayerDisconnect

### Modified
- `packages/shared-types/src/network/events.ts` -- Added hazard:update, hazard:damage, hazard:clear to ServerEventType and ServerEvents
- `apps/game-server/src/game/game.module.ts` -- Registered HazardService in providers and exports
- `apps/game-server/src/game/ai.service.ts` -- Injected HazardService, calls processHazardTick after processPlayerRegeneration in runZoneTick
- `apps/game-server/src/game/game.gateway.ts` -- Wired HazardService: setServer in afterInit, onPlayerDisconnect in handleDisconnect, onPlayerEquipmentChanged in equipment:change and inventory:unequip handlers, added zone.entered emissions to portal:use and hub:leave handlers

## Decisions Made
- Used @OnEvent('zone.entered') decorator pattern (matching QuestService) for zone transition tracking instead of manual wiring
- processHazardTick is fully synchronous -- all reads from Map, no async calls, tick-budget safe per STATE.md mandate
- Player health mutations modify player.health directly on ConnectedPlayer (same pattern as combat damage in AiService)
- Added missing zone.entered event emissions to portal:use and hub:leave handlers (they were not emitting them)
- Hazard damage also emits player:health event for HUD health bar updates
- Protection combines equipment stats (effectiveStats.hazardProtection) and consumable buffs (stats.bonuses[hazardProtection_{type}]), capped at 100%

## Self-Check: PASSED
- [x] HazardService registered in GameModule providers
- [x] processHazardTick called in runZoneTick after regen processing
- [x] hazard:update, hazard:damage, hazard:clear events defined in ServerEvents
- [x] Hub zone check present in onPlayerEnteredZone (HAZD-09)
- [x] Grace period check present -- 3000ms (HAZD-10)
- [x] No async calls in processHazardTick (tick-budget safe)
- [x] Tier IV stacking escalation via shouldIncreaseStack (HAZD-04)
- [x] apps/game-server and packages/shared-types compile clean

---
*Plan: 120-03 | Phase: 120-biome-hazard-system*
