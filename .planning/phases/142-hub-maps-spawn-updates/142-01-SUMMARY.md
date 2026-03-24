---
phase: 142-hub-maps-spawn-updates
plan: 01
subsystem: world-gen
tags: [maps, hub, json, tiles, world-gen, collision]

requires:
  - phase: world-gen tile system
    provides: TileId enum with faction tile ranges (30-61) and PORTAL=16

provides:
  - 128x128 Canopy Station hub map (hub_verdant.json) with organic rooms and atrium
  - 128x128 Ironhold Station hub map (hub_helix.json) with forge halls and warren sub-rooms
  - 128x128 Meridian Station hub map (hub_nexus.json) with trading floor and archive
  - 128x128 Salvage Station hub map (hub_neutral.json) with cargo bay and market, more hazards
  - Hub-loader schema enforcing 128x128 minimum dimensions

affects: [142-02, 142-03, hub-service, spawn-system, npc-placement]

tech-stack:
  added: []
  patterns:
    - "Hub maps as static JSON files with tiles/heights/collisions/entryPoint/structures/spawnPoints"
    - "Programmatic map generation via TypeScript script then committed as static JSON"
    - "Faction tile ranges: Canopy 30-37, Ironhold 38-45, Meridian 46-53, Salvage 54-61, Portal=16"

key-files:
  created:
    - packages/world-gen/src/maps/hubs/hub_verdant.json
    - packages/world-gen/src/maps/hubs/hub_helix.json
    - packages/world-gen/src/maps/hubs/hub_nexus.json
    - packages/world-gen/src/maps/hubs/hub_neutral.json
  modified:
    - packages/world-gen/src/maps/hub-loader.ts

key-decisions:
  - "128x128 maps replace 64x64 placeholders — 4x more interior space for faction hubs"
  - "Docking bay at south edge (~y=100-120), portal at south center, entryPoint a few tiles north"
  - "Programmatic generator script (generate-hub-maps.ts) used to produce JSON then deleted after use"
  - "Collision consistency: wall/window/decoration=true, floor/corridor/door/accent/hazard/portal=false"
  - "Salvage Station (hub_neutral) intentionally rougher with more hazard tiles (tile 61)"

patterns-established:
  - "Hub map JSON schema: {zoneId, width, height, tiles[][], heights[][], collisions[][], structures:[], spawnPoints:[], entryPoint:{x,y}}"
  - "Portal tile (16) placed exactly once per hub at docking bay center"

requirements-completed: [MAP-01, MAP-02, MAP-03, MAP-04, MAP-06]

duration: 30min
completed: 2026-03-18
---

# Phase 142 Plan 01: Hub Maps Creation Summary

**Four 128x128 faction hub station maps with themed rooms, organic/industrial/corporate/patchwork layouts, portal tiles in south docking bays, and faction-specific tile IDs (30-61)**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-18T15:56:00Z
- **Completed:** 2026-03-18T16:26:10Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced 64x64 placeholder hub maps with 128x128 hand-designed interiors for all 4 factions
- Each hub uses faction-specific tile IDs: Canopy (30-37), Ironhold (38-45), Meridian (46-53), Salvage (54-61)
- Each map has exactly one portal tile (16) in the south docking bay with entryPoint north of it
- Collision arrays fully consistent with tile blocking properties across all 16,384 tiles per map
- Hub-loader zod schema updated to require minimum 128x128 dimensions

## Task Commits

1. **Task 1 + 2: Generate and validate 128x128 hub station maps** - `2c119f9` (feat)

**Plan metadata:** committed as part of task execution

## Files Created/Modified

- `packages/world-gen/src/maps/hubs/hub_verdant.json` - 128x128 Canopy Station: The Atrium (central), Trading Garden (NW), Nursery/Service (NE), Communion Hall (SW), Docking Bay south
- `packages/world-gen/src/maps/hubs/hub_helix.json` - 128x128 Ironhold Station: The Forge (north), Armory/Trading (NW), Warren rooms (east), Engineering (SW), Processing Bay 7 south
- `packages/world-gen/src/maps/hubs/hub_nexus.json` - 128x128 Meridian Station: The Exchange (center-west), The Archive (NE), Port Meridian (NW), The Commons (east), Welcome Center Alpha south
- `packages/world-gen/src/maps/hubs/hub_neutral.json` - 128x128 Salvage Station: Cargo Bay (center), Scrap Market (NW), Workshop (NE), The Den (SW), The Docks south — extra hazard tiles
- `packages/world-gen/src/maps/hub-loader.ts` - Schema updated to require 128 minimum width/height

## Decisions Made

- Portal tile (16) integrated into docking bay structure at south edge; entryPoint placed a few tiles north so players face the hub interior
- Salvage Station uses more tile 61 (SALVAGE_HAZARD) than other hubs to reflect "wrong side of the tracks" aesthetic
- Generator script (generate-hub-maps.ts) was used to produce deterministic JSON outputs then deleted — maps exist as static committed JSON

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four 128x128 hub maps ready for NPC placement (Plan 142-02)
- Portal tiles in place for zone travel integration
- Hub-loader validated and enforces 128x128 minimum

---
*Phase: 142-hub-maps-spawn-updates*
*Completed: 2026-03-18*
