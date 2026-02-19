---
phase: 48-npc-definition-system-and-hub-spawns
plan: 02
subsystem: npc
tags: [typescript, npc-definitions, hub-config, world-gen, lore]

requires:
  - phase: 48-01
    provides: NpcDefinition discriminated union, NpcRegistry singleton, @into-the-void/npcs package

provides:
  - 20 NPC definitions (5 types x 4 faction hubs) registered in NpcRegistry
  - VERDANT_NPCS, HELIX_NPCS, NEXUS_NPCS, NEUTRAL_NPCS exported arrays
  - ALL_NPCS barrel combining all 20 definitions
  - NpcSpawn interface { npcId, x, y } in world-gen
  - npcSpawns: readonly NpcSpawn[] on HubConfig (5 positions per hub)
  - NpcSpawn exported from @into-the-void/world-gen

affects:
  - 48-03-hub-spawns (uses HubConfig.npcSpawns to place NPCs in game world)

tech-stack:
  added: []
  patterns: [5-NPC layout per hub: NW trader / N guard / NE rep / SW ambient / SE service]

key-files:
  created:
    - packages/npcs/src/definitions/verdant.ts
    - packages/npcs/src/definitions/helix.ts
    - packages/npcs/src/definitions/nexus.ts
    - packages/npcs/src/definitions/neutral.ts
    - packages/npcs/src/definitions/index.ts
  modified:
    - packages/npcs/src/index.ts
    - packages/world-gen/src/generation/hub.ts
    - packages/world-gen/src/index.ts

key-decisions:
  - "5-NPC hub layout: trader NW (20,20), guard N (32,15), rep NE (44,20), ambient SW (20,44), service SE (44,44)"
  - "NpcRegistry.registerAll(ALL_NPCS) called on module load in packages/npcs/src/index.ts"
  - "NpcSpawn exported from world-gen (not npcs) since it describes world position, not NPC identity"

duration: 3min
completed: 2026-02-19
---

# Phase 48 Plan 02: NPC Definitions for Hub Zones Summary

**20 lore-accurate NPC definitions for all 4 faction hubs registered in NpcRegistry, with fixed spawn positions added to hub configuration**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-19T23:30:00Z
- **Completed:** 2026-02-19T23:33:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created 5 NPC definitions for Canopy Station (Verdant): Sylva Greenleaf (Trader), Canopy Sentinel (Guard), Liaison Moss (Rep), Bio-Technician (Ambient), Dr. Fernwood (Service)
- Created 5 NPC definitions for Ironhold Station (Helix): Forge Master Kron (Trader), Ironhold Enforcer (Guard), Coordinator Thane (Rep), Ore Processor (Ambient), Gear Smith Volt (Service)
- Created 5 NPC definitions for Meridian Station (Nexus): Merchant Kira (Trader), Station Security (Guard), Broker Chen (Rep), Data Analyst (Ambient), Storage Manager (Service)
- Created 5 NPC definitions for neutral/unaffiliated: Freelance Vendor (Trader), Mercenary Guard (Guard), Independent Liaison (Rep), Drifter (Ambient), Field Medic (Service)
- Wired ALL_NPCS barrel and NpcRegistry.registerAll() in packages/npcs/src/index.ts
- Added NpcSpawn interface and 5 fixed spawn positions per hub to HubConfig in world-gen
- Both npcs and world-gen packages build without errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create NPC definitions for all 4 faction hubs** - `7b0e4ee` (feat)
2. **Task 2: Add NPC spawn positions to hub configuration** - `aeb7077` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/npcs/src/definitions/verdant.ts` - 5 Verdant NPC definitions for Canopy Station
- `packages/npcs/src/definitions/helix.ts` - 5 Helix NPC definitions for Ironhold Station
- `packages/npcs/src/definitions/nexus.ts` - 5 Nexus NPC definitions for Meridian Station
- `packages/npcs/src/definitions/neutral.ts` - 5 neutral NPC definitions (unaffiliated, also uses Meridian)
- `packages/npcs/src/definitions/index.ts` - ALL_NPCS barrel and per-faction re-exports
- `packages/npcs/src/index.ts` - Uncommented definitions import + NpcRegistry.registerAll(ALL_NPCS) on module load
- `packages/world-gen/src/generation/hub.ts` - Added NpcSpawn interface, npcSpawns field on HubConfig, 5 spawns per hub config
- `packages/world-gen/src/index.ts` - Export NpcSpawn type from world-gen package

## Decisions Made

- 5-NPC spatial layout per hub: trader NW (20,20), guard N of center (32,15), faction rep NE (44,20), ambient SW (20,44), service SE (44,44). All positions within walkable area (x/y: 8-55), none at portal (32,32).
- NpcSpawn placed in world-gen (not npcs) — it's a world position descriptor, not part of NPC identity
- Neutral hub has distinct NPCs from Nexus even though both use Meridian Station (lore: unaffiliated have independent contacts)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The cosmetic lockfile pruning warnings are pre-existing infrastructure issues (documented in 48-01 summary) that do not affect build success.

## Next Phase Readiness

- NpcRegistry now contains 20 registered NPCs accessible via NpcRegistry.get(npcId)
- HubConfig.npcSpawns provides fixed tile positions for each NPC in each hub
- Plan 48-03 (hub spawns) can now iterate npcSpawns to place NPCs in the game world

---
*Phase: 48-npc-definition-system-and-hub-spawns*
*Completed: 2026-02-19*

## Self-Check: PASSED

All files verified present:
- packages/npcs/src/definitions/verdant.ts - FOUND
- packages/npcs/src/definitions/helix.ts - FOUND
- packages/npcs/src/definitions/nexus.ts - FOUND
- packages/npcs/src/definitions/neutral.ts - FOUND
- packages/npcs/src/definitions/index.ts - FOUND
- packages/npcs/src/index.ts - FOUND (modified)
- packages/world-gen/src/generation/hub.ts - FOUND (modified)
- packages/world-gen/src/index.ts - FOUND (modified)

All commits verified:
- 7b0e4ee - FOUND (feat: add 20 NPC definitions for all 4 faction hubs)
- aeb7077 - FOUND (feat: add NpcSpawn interface and npcSpawns to hub configurations)
