---
phase: 48-npc-definition-system-and-hub-spawns
plan: 03
subsystem: npc
tags: [typescript, npc-spawning, combat-guard, entity-renderer, hub-zones, phaser]

requires:
  - phase: 48-02
    provides: 20 NPC definitions registered in NpcRegistry, NpcSpawn positions in HubConfig

provides:
  - Npc interface in @into-the-void/shared-types extending Entity with npcId, npcType, faction
  - ZonesService.spawnHubNpcs() method populating hub entity map from HubConfig.npcSpawns
  - CombatService.startCombat() rejects NPC targeting with explicit 'Cannot attack NPCs' error
  - EntityRenderer NPC rendering: isNpc() type guard, createNpcNameplate() with type-colored borders
  - WorldScene NPC click handler suppresses pathfinding without triggering combat

affects:
  - 48-04 (NPC interaction window — Phase 49 will replace console.log click with dialogue UI)
  - future combat system changes

tech-stack:
  added: []
  patterns:
    - "NPC entity spawned inline in loadHubZone via private spawnHubNpcs() method"
    - "Explicit type check order: npc check before creature check in startCombat"
    - "NpcNameplate uses colored border (not fill) to distinguish from creature health bars"
    - "NPC click handler suppresses pathfinding via lastClickedEntity without emitting combat:start"

key-files:
  created: []
  modified:
    - packages/shared-types/src/core/entity.ts
    - apps/game-server/src/zones/zones.service.ts
    - apps/game-server/src/game/combat.service.ts
    - apps/web/src/game/rendering/EntityRenderer.ts
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "NPC fallback texture is 'player' sprite — reuses existing asset until NPC sprites are created"
  - "NPC scale set to 2.2 (slightly smaller than creatures at 2.5) to visually distinguish type"
  - "spawnHubNpcs uses NpcRegistry.get() which returns UNKNOWN_NPC fallback — no null guard needed"
  - "NPC entities stored in hub zone entity map so they appear in zone:state sent to clients on hub entry"

duration: 3min
completed: 2026-02-19
---

# Phase 48 Plan 03: Hub NPC Spawning and Client Rendering Summary

**NPCs spawned at fixed hub positions using HubConfig, rendered in Phaser canvas with type-colored nameplates, and guarded from combat targeting both server-side and client-side**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-19T23:35:17Z
- **Completed:** 2026-02-19T23:38:10Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `Npc` interface to shared-types as a proper discriminated union member with npcId, npcType, faction fields
- Wired `spawnHubNpcs()` in ZonesService — iterates `HubConfig.npcSpawns`, resolves definitions via NpcRegistry, creates Npc entities placed in hub zone entity map so clients receive them via `zone:state`
- CombatService now explicitly rejects NPC targeting before the creature check, returning "Cannot attack NPCs" error for clear UX
- EntityRenderer renders NPCs with a distinct nameplate (colored border by type: gold=trader, steel=guard, blue=faction_rep, gray=ambient, green=service) using a 300x50 rounded panel
- WorldScene NPC click handler: suppresses pathfinding, logs click, returns without emitting `combat:start`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Npc interface and spawn NPCs in ZonesService** - `a36ec18` (feat)
2. **Task 2: Reject NPC combat targeting and render NPCs in client** - `c5b6eee` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/shared-types/src/core/entity.ts` - Added `Npc` interface extending Entity with npcId, npcType, faction
- `apps/game-server/src/zones/zones.service.ts` - Added NpcRegistry + getHubConfig imports, spawnHubNpcs() private method, hub NPC entity initialization in loadHubZone
- `apps/game-server/src/game/combat.service.ts` - Explicit NPC targeting rejection before creature type check
- `apps/web/src/game/rendering/EntityRenderer.ts` - Npc import, isNpc() type guard, npc scale (2.2), createNpcNameplate() method, NPC container rendering in createEntityContainer, npc fallback texture
- `apps/web/src/game/scenes/WorldScene.ts` - NPC click handler: suppresses pathfinding, logs click, no combat emission

## Decisions Made

- NPC fallback texture reuses `'player'` sprite until dedicated NPC sprites are designed and added. This is consistent with the CLAUDE.md guidance: "If there is no sprite, add a fallback color tile."
- NPC scale (2.2) chosen between creature (2.5) and artifact (1.5) to give NPCs a visible-but-distinct presence
- `spawnHubNpcs()` uses `NpcRegistry.get()` which has an UNKNOWN_NPC fallback — no extra null checks needed (registry always returns a definition)
- NPC entities are included in zone entity map from zone load time, so they appear in the initial `zone:state` event on hub entry without additional network events

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The lockfile pruning warnings are pre-existing infrastructure issues (NX workspace packages not in pruned lockfile), documented in 48-01 and 48-02 summaries. All builds succeed.

## Next Phase Readiness

- NPCs spawn at fixed positions (20,20), (32,15), (44,20), (20,44), (44,44) in each hub
- NPCs render in Phaser with type-colored nameplates and `'player'` fallback sprite
- Server rejects combat targeting NPCs; client does not emit `combat:start` on NPC click
- Phase 49 (NPC interaction window) can replace the `console.log('NPC clicked')` placeholder in WorldScene with a dialogue/trade UI trigger

---
*Phase: 48-npc-definition-system-and-hub-spawns*
*Completed: 2026-02-19*

## Self-Check: PASSED

All files verified present:
- packages/shared-types/src/core/entity.ts - FOUND
- apps/game-server/src/zones/zones.service.ts - FOUND
- apps/game-server/src/game/combat.service.ts - FOUND
- apps/web/src/game/rendering/EntityRenderer.ts - FOUND
- apps/web/src/game/scenes/WorldScene.ts - FOUND

All commits verified:
- a36ec18 - FOUND (feat: add Npc interface and spawn NPCs in hub zones)
- c5b6eee - FOUND (feat: reject NPC combat targeting and render NPCs with distinct nameplates)
