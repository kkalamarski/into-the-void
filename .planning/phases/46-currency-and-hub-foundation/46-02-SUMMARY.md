---
phase: 46-currency-and-hub-foundation
plan: 02
subsystem: zones
tags: [hub, zones, world-gen, biome, respawn, faction]

# Dependency graph
requires:
  - phase: 46-01
    provides: currency foundation (credits) needed before hub trading is wired

provides:
  - Four faction hub zones (hub_verdant, hub_helix, hub_nexus, hub_neutral)
  - ZoneType discriminator and isHubZone() helper in shared-types
  - generateHubChunk() and getHubConfig() in world-gen
  - ZonesService loads hub_ zones via static generation
  - GameService.getZoneState handles hub zones without NaN coordinate parsing

affects:
  - phase 47 (portal/recall travel to hub zones)
  - phase 48 (NPC spawns at fixed hub positions)
  - phase 49 (trading system wired to hub zones)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hub zones use 'hub_' ID prefix to distinguish from open-world 'z_X_Y' zones"
    - "ZonesService early-returns on isHubZone() before procedural world-gen path"
    - "GameService.getZoneState early-returns on isHubZone() before coordinate parsing"
    - "Hub zones are safe (no entity spawns); NPCs added separately in Phase 48"

key-files:
  created:
    - packages/world-gen/src/generation/hub.ts
  modified:
    - packages/shared-types/src/core/zone.ts
    - packages/game-logic/src/combat/respawn.ts
    - packages/world-gen/src/index.ts
    - apps/game-server/src/zones/zones.service.ts
    - apps/game-server/src/game/game.service.ts

key-decisions:
  - "Hub zones use existing valid BiomeType values: fungal_forest (Verdant), volcanic_ridge (Helix), void_plains (Nexus/Neutral) — plan used non-existent biome names"
  - "Hub perimeter is 8 tiles thick with collision=true, center 48x48 is walkable"
  - "hub_neutral maps to hub_nexus for respawn (unaffiliated players go to Meridian Station)"

patterns-established:
  - "isHubZone(zoneId: string): boolean — any zone starting with 'hub_' is a hub"
  - "ZonesService.loadHubZone: static generation, empty entity map, LRU cached"

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 46 Plan 02: Hub Zone Infrastructure Summary

**Four faction hub zones (hub_verdant, hub_helix, hub_nexus, hub_neutral) as 64x64 instanced safe areas with isHubZone() routing in ZonesService and NaN-safe getZoneState() handling in GameService**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-19T20:44:38Z
- **Completed:** 2026-02-19T20:48:07Z
- **Tasks:** 4
- **Files modified:** 6

## Accomplishments

- ZoneType discriminator, HUB_ZONE_IDS constant, HubZoneId type, and isHubZone() helper added to shared-types
- Hub chunk generator creates 64x64 zones with 48x48 walkable center, blocked 8-tile perimeter, no spawn points
- ZonesService routes hub_ prefixed zone IDs to generateHubChunk() before any DB queries
- GameService.getZoneState early-returns for hub zones preventing NaN coordinate parsing errors
- FACTION_RESPAWN_COORDS updated to use hub zone IDs (x:32,y:32 center position)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ZoneType discriminator and hub zone constants** - `e3c2ec3` (feat)
2. **Task 2: Create hub chunk generator** - `1b4f2d2` (feat)
3. **Task 3: Wire hub generation into ZonesService** - `a98f16a` (feat)
4. **Task 4: Handle hub zones in GameService.getZoneState** - `3b6ba90` (feat)

## Files Created/Modified

- `packages/shared-types/src/core/zone.ts` - Added ZoneType, HUB_ZONE_IDS, HubZoneId, isHubZone(), zoneType? on ZoneState
- `packages/game-logic/src/combat/respawn.ts` - Updated FACTION_RESPAWN_COORDS to hub_ zone IDs at x:32,y:32
- `packages/world-gen/src/generation/hub.ts` - New: HubConfig interface, generateHubChunk(), getHubConfig(), isKnownHub()
- `packages/world-gen/src/index.ts` - Added hub.ts exports
- `apps/game-server/src/zones/zones.service.ts` - Hub zone routing in loadZone(), new loadHubZone() method
- `apps/game-server/src/game/game.service.ts` - Hub zone early return in getZoneState() before coordinate parsing

## Decisions Made

- Used valid `BiomeType` values instead of plan's non-existent biome names (`luminous_canopy`, `volcanic_reaches`, `coastal_shallows`): mapped to `fungal_forest` (Verdant/Canopy), `volcanic_ridge` (Helix/Ironhold), `void_plains` (Nexus+Neutral/Meridian)
- Hub neutral zone (`hub_neutral`) respawns players to `hub_nexus` (Meridian Station, as per lore: neutral welcome)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced non-existent BiomeType values with valid ones**
- **Found during:** Task 2 (hub.ts creation)
- **Issue:** Plan specified `luminous_canopy`, `volcanic_reaches`, `coastal_shallows` as biome values — none exist in `BiomeType` union; would cause TypeScript compilation errors
- **Fix:** Mapped to nearest valid biomes: `fungal_forest` (forest/living architecture), `volcanic_ridge` (volcanic mountain), `void_plains` (neutral/clean)
- **Files modified:** packages/world-gen/src/generation/hub.ts
- **Verification:** `npx nx run world-gen:build --skip-nx-cache` passes
- **Committed in:** 1b4f2d2 (Task 2 commit)

**2. [Rule 1 - Bug] Removed reference to non-existent TileId type**
- **Found during:** Task 2 (hub.ts creation)
- **Issue:** Plan imported `TileId` from `'../tiles/types'` — this file doesn't exist; `ChunkData.tiles` is `number[][]`
- **Fix:** Used `number` directly for floorTile/wallTile fields in HubConfig
- **Files modified:** packages/world-gen/src/generation/hub.ts
- **Verification:** Build passes, types consistent with ChunkData interface
- **Committed in:** 1b4f2d2 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bug fixes)
**Impact on plan:** Both fixes necessary for compilation. No scope change.

## Issues Encountered

None — pnpm lock file pruning warnings are pre-existing NX workspace issues unrelated to this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Hub zones loadable via ZonesService with valid biome/fertility data
- isHubZone() helper available for Phase 47 portal/recall system to detect hub destinations
- FACTION_RESPAWN_COORDS now point to hub zones, ready for death respawn routing
- Phase 48 can add NPCs at fixed positions within the 48x48 walkable hub interior

## Self-Check: PASSED

All claimed files exist and all task commits verified:
- FOUND: packages/shared-types/src/core/zone.ts
- FOUND: packages/game-logic/src/combat/respawn.ts
- FOUND: packages/world-gen/src/generation/hub.ts
- FOUND: packages/world-gen/src/index.ts
- FOUND: apps/game-server/src/zones/zones.service.ts
- FOUND: apps/game-server/src/game/game.service.ts
- FOUND: .planning/phases/46-currency-and-hub-foundation/46-02-SUMMARY.md
- COMMIT e3c2ec3: FOUND
- COMMIT 1b4f2d2: FOUND
- COMMIT a98f16a: FOUND
- COMMIT 3b6ba90: FOUND

---
*Phase: 46-currency-and-hub-foundation*
*Completed: 2026-02-19*
