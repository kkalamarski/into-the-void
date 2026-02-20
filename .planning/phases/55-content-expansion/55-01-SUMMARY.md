---
phase: 55-content-expansion
plan: 01
subsystem: entities
tags: [creatures, loot-tables, game-content, biomes]

# Dependency graph
requires:
  - phase: 35-entity-spawning
    provides: CreatureDefinition type system and loot table integration
  - phase: 34-zone-management
    provides: Entity spawning system and biome-based spawn logic
provides:
  - 7 new creature definitions filling biome gaps in content roster
  - Loot tables for all new creatures with tier-appropriate drops
  - Expanded creature pool from 10 to 17 unique creatures
affects: [world-generation, spawning, loot-system, content-expansion]

# Tech tracking
tech-stack:
  added: []
  patterns: [biome-creature assignment, tier-based stat scaling, loot table conventions]

key-files:
  created: []
  modified:
    - packages/entities/src/definitions/creatures.ts
    - packages/entities/src/definitions/index.ts
    - packages/game-logic/src/loot/creature-loot.ts

key-decisions:
  - "7 creatures selected to fill biome gaps: void_plains, volcanic_ridge, miasma_marshes, frozen_expanse, crystal_caves, ancient_ruins, petrified_expanse"
  - "Stats scaled by biome tier: Tier I (40-50 HP, 12-15 XP), Tier II (65-110 HP, 22-42 XP), Tier III (100-160 HP, 45-60 XP), Tier IV (200 HP, 90 XP)"
  - "Loot follows existing pattern: common drops + tier-appropriate materials + rare specialty items"

patterns-established:
  - "Creature naming convention: biome characteristic + creature type (e.g., Ice Burrower, Ash Skimmer)"
  - "Loot table ID format: 'loot_creature_<name>' matching entity lootTableId field"
  - "Behavior assignment based on role: herbivore (passive), omnivore (opportunistic), predator (aggressive)"

# Metrics
duration: 143s
completed: 2026-02-20
---

# Phase 55 Plan 01: New Creature Definitions Summary

**17 total creatures across all biomes with 7 new additions filling content gaps: Coastal Scuttler, Ash Skimmer, Miasma Drifter, Ice Burrower, Crystal Crawler, Ruin Seeker, and Petrified Lurker**

## Performance

- **Duration:** 2min 23s
- **Started:** 2026-02-20T10:58:09Z
- **Completed:** 2026-02-20T11:00:32Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added 7 new CreatureDefinition exports with lore-appropriate names, behaviors, and biome assignments
- Created loot tables for all new creatures with tier-appropriate drop rates and materials
- Expanded creature roster by 70% (10 → 17 creatures) to improve world variety
- ALL_CREATURES array and ENTITY_IDS constants updated for complete registry coverage

## Task Commits

Each task was committed atomically:

1. **Task 1: Define 7 new creature definitions** - `a3469f1` (feat)
2. **Task 2: Add loot tables for new creatures** - `62b0a07` (feat)

## Files Created/Modified
- `packages/entities/src/definitions/creatures.ts` - Added 7 new CreatureDefinition exports and updated ALL_CREATURES array
- `packages/entities/src/definitions/index.ts` - Added 7 new creature ID constants to ENTITY_IDS
- `packages/game-logic/src/loot/creature-loot.ts` - Added 7 new loot table entries to CREATURE_LOOT_TABLES Map

## Decisions Made

**Creature selection strategy:**
- Analyzed existing creature-biome coverage to identify gaps
- Prioritized biomes with 0-1 creatures: void_plains (1→2), volcanic_ridge (1→2), crystal_caves (1→2), ancient_ruins (1→2), petrified_expanse (1→2)
- Added diversity to miasma_marshes (1→2 with herbivore vs existing predator)
- Added tier variety to frozen_expanse (1→2 with ambush predator vs marathon hunter)

**Stat balancing:**
- Tier I creatures (levels 1-4): 40-50 HP, 12-15 XP, 180s respawn
- Tier II creatures (levels 3-18): 65-110 HP, 22-42 XP, 240-360s respawn
- Tier III creatures (levels 10-24): 100-160 HP, 45-60 XP, 360-480s respawn
- Tier IV creatures (levels 18-30): 200 HP, 90 XP, 600s respawn

**Loot design philosophy:**
- Every creature drops organic material as base currency (common/rare/epic by tier)
- Secondary drops match biome materials (crater dust, volcanic glass, frozen shards, etc.)
- Rare drops use reagents or epic materials appropriate to creature level/tier
- Drop chances scale with creature difficulty: herbivores favor quantity, predators favor quality

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation passed for both packages, all creature IDs verified in exports.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next phase:** New creatures are registered in entity system and will spawn via existing biome spawning logic in world-gen package.

**No blockers:** All creatures have complete definitions (stats, biomes, loot tables) and follow established patterns.

**Creature roster by biome:**
- void_plains: 2 creatures (Void Crawler, Coastal Scuttler)
- fungal_forest: 2 creatures (Canopy Grazer, Spore Carrier)
- crystal_caves: 2 creatures (Crystal Hunter, Crystal Crawler)
- miasma_marshes: 2 creatures (Marsh Lurker, Miasma Drifter)
- petrified_expanse: 2 creatures (Dart Runner, Petrified Lurker)
- frozen_expanse: 2 creatures (Frost Stalker, Ice Burrower)
- volcanic_ridge: 2 creatures (Magma Beast, Ash Skimmer)
- toxic_wastes: 1 creature (Toxic Lurker)
- ancient_ruins: 2 creatures (Void Horror, Ruin Seeker)
- starfall_crater: 1 creature (Void Horror)

**Future enhancement:** Consider adding 1-2 more creatures to toxic_wastes and starfall_crater for complete coverage.

## Self-Check: PASSED

**Files verified:**
- ✓ packages/entities/src/definitions/creatures.ts exists
- ✓ packages/entities/src/definitions/index.ts exists
- ✓ packages/game-logic/src/loot/creature-loot.ts exists

**Commits verified:**
- ✓ a3469f1 exists (Task 1: creature definitions)
- ✓ 62b0a07 exists (Task 2: loot tables)

**Content verified:**
- ✓ ALL_CREATURES array contains 17 entries
- ✓ ENTITY_IDS contains all 7 new creature constants
- ✓ CREATURE_LOOT_TABLES contains all 7 new loot entries
- ✓ TypeScript compilation passes for both packages

---
*Phase: 55-content-expansion*
*Completed: 2026-02-20*
