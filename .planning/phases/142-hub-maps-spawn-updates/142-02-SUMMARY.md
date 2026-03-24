---
phase: 142-hub-maps-spawn-updates
plan: 02
subsystem: world-gen
tags: [npcs, hub, tile-ids, respawn, ambient-npcs, faction]

# Dependency graph
requires:
  - phase: 142-hub-maps-spawn-updates
    provides: 128x128 hand-designed JSON hub maps with room layouts and entryPoints
provides:
  - HUB_CONFIGS with correct faction tile IDs (30/31, 38/39, 46/47, 54/55)
  - NPC spawn positions repositioned for 128x128 map layouts
  - 4-5 ambient NPCs per hub adding visual life
  - FACTION_RESPAWN_COORDS with neutral -> hub_neutral (Salvage Station) fix
affects: [game-server, zones-service, npc-spawning, player-respawn]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - packages/world-gen/src/generation/hub.ts
    - packages/game-logic/src/combat/respawn.ts
    - packages/npcs/src/definitions/verdant.ts
    - packages/npcs/src/definitions/helix.ts
    - packages/npcs/src/definitions/nexus.ts
    - packages/npcs/src/definitions/neutral.ts

key-decisions:
  - "Vendors duplicated near docking bay entrance for quick access when players first spawn in"
  - "Faction-specific patrol guards added alongside main guards giving 2+ guards per hub"
  - "All hubs exceed 12-15 NPC target (16-17 each) from plan requirement due to docking bay vendor duplication added in quick-15"

patterns-established:
  - "NPC placement pattern: guards at docking entrance, vendors clustered in trading area, faction rep in dedicated room"

requirements-completed: [MAP-05, SYS-04, SYS-05]

# Metrics
duration: 0min
completed: 2026-03-18
---

# Phase 142 Plan 02: Hub Configs, Ambient NPCs, Respawn Fix Summary

**Faction-specific tile IDs (CANOPY/IRONHOLD/MERIDIAN/SALVAGE), lore-correct NPC placement in 128x128 rooms, 4-5 ambient NPCs per hub, and unaffiliated spawn fixed to Salvage Station**

## Performance

- **Duration:** 0 min (pre-executed in prior session)
- **Started:** 2026-03-18
- **Completed:** 2026-03-18
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Updated all 4 HUB_CONFIGS to use correct faction tile IDs: CANOPY (30/31), IRONHOLD (38/39), MERIDIAN (46/47), SALVAGE (54/55)
- Repositioned all NPC spawns for 128x128 map layouts with lore-correct room assignments: traders in trading areas, guards at docking entrances, vendors clustered together
- Added 4-5 ambient NPCs per hub (botanist, gardener, patrol, worker for verdant; forgemaster, engineer, patrol, miner for helix; analyst, archivist, patrol, clerk for nexus; scrapper, mechanic, drifter, lookout, fixer for neutral)
- Fixed unaffiliated respawn bug: neutral faction now correctly spawns at hub_neutral (Salvage Station) instead of hub_nexus (Meridian Station)
- Updated all FACTION_RESPAWN_COORDS x,y to match entryPoints from 128x128 JSON maps

## Task Commits

All tasks committed atomically:

1. **Task 1: Add ambient NPC definitions to each faction's NPC file** - part of `b4f7185` (feat)
2. **Task 2: Update HUB_CONFIGS with correct tile IDs and NPC positions** - part of `b4f7185` (feat)
3. **Task 3: Fix unaffiliated spawn and update all respawn coordinates** - part of `b4f7185` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `packages/world-gen/src/generation/hub.ts` - Updated HUB_CONFIGS: faction tile IDs + repositioned NPCs for 128x128 layouts + ambient NPC spawns
- `packages/game-logic/src/combat/respawn.ts` - Fixed neutral -> hub_neutral, updated all respawn x,y to 128x128 entryPoints
- `packages/npcs/src/definitions/verdant.ts` - Added VERDANT_BOTANIST, VERDANT_GARDENER, VERDANT_PATROL, VERDANT_WORKER
- `packages/npcs/src/definitions/helix.ts` - Added HELIX_FORGEMASTER, HELIX_ENGINEER, HELIX_PATROL, HELIX_MINER
- `packages/npcs/src/definitions/nexus.ts` - Added NEXUS_ANALYST, NEXUS_ARCHIVIST, NEXUS_PATROL, NEXUS_CLERK
- `packages/npcs/src/definitions/neutral.ts` - Added NEUTRAL_SCRAPPER, NEUTRAL_MECHANIC, NEUTRAL_DRIFTER2, NEUTRAL_LOOKOUT, NEUTRAL_FIXER

## Decisions Made
- Vendors duplicated near docking bay entrance for quick access when players first spawn in (added in quick-15)
- Faction-specific patrol guards added alongside main guards giving 2+ guards per hub
- Hub NPC count is 16-17 per hub (exceeds 12-15 plan target due to docking bay vendor duplication)

## Deviations from Plan

None - plan executed exactly as written prior to this session.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 hub configs use correct faction tile IDs and 128x128 NPC positions
- Ambient NPCs add visual life to each faction hub
- Unaffiliated players now correctly spawn at Salvage Station
- Ready for Phase 142-03 or testing hub NPC placement in-game

---
*Phase: 142-hub-maps-spawn-updates*
*Completed: 2026-03-18*
