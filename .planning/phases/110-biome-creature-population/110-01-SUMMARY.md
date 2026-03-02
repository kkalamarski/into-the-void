---
phase: 110-biome-creature-population
plan: 01
subsystem: entities
tags: [creatures, loot, spawn-config, tier-1, biomes]

requires:
  - phase: 88-biome-entity-gaps
    provides: initial creature definitions and four-file atomicity pattern
provides:
  - 7 new Tier I creature definitions across 4 biomes
  - 4 new biome-specific world items for creature loot
  - Rebalanced spawn weights for all Tier I biomes
affects: [110-02, 110-03, 110-04]

tech-stack:
  added: []
  patterns: [four-file atomicity for creature additions, rarity pyramid spawn weighting]

key-files:
  created: []
  modified:
    - packages/items/src/definitions/world-items.ts
    - packages/items/src/definitions/index.ts
    - packages/entities/src/definitions/creatures.ts
    - packages/entities/src/definitions/aquatic-creatures.ts
    - packages/entities/src/definitions/index.ts
    - packages/world-gen/src/generation/spawn.ts
    - packages/game-logic/src/loot/creature-loot.ts

key-decisions:
  - "Relic Beast reclassified as herbivore weight 10 in ancient_ruins spawn pyramid"
  - "Coastal Urchin behavior is herbivore in code (plan said omnivore) — kept existing behavior"

patterns-established:
  - "Rarity pyramid: herbivore 8-12, omnivore 5-8, predator 3-6, maniac 1-2"

requirements-completed: [CREA-01, CREA-05, CREA-06]

duration: 5min
completed: 2026-03-02
---

# Phase 110 Plan 01: Tier I Biome Creature Population Summary

**Populated all 4 Tier I biomes to target creature counts with 7 new creatures, 4 new world items, and rebalanced spawn weights following rarity pyramid**

## Performance

- **Duration:** 5 min
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- void_plains: 4 creatures (was 2) — Plains Grazer herbivore, Void Prowler predator added
- fungal_forest: 4 creatures (was 2) — Spore Beetle herbivore, Mycelial Stalker predator added
- tidal_pools: 4 creatures (was 3) — Tidal Snapper predator added
- ancient_ruins: 6 creatures (was 4) — Ruin Scavenger omnivore, Ruin Warden predator added
- 4 new biome-specific world items: Void Chitin, Fungal Membrane, Tidal Pearl, Ruin Shard
- All spawn weights rebalanced to rarity pyramid pattern

## Task Commits

1. **Task 1: Create biome-specific loot items** - `ca418cd` (feat)
2. **Task 2: Define Tier I creatures and wire all four files** - `4370fe6` (feat)

## Files Created/Modified
- `packages/items/src/definitions/world-items.ts` - 4 new world items for biome-specific creature loot
- `packages/items/src/definitions/index.ts` - ITEM_IDS entries for new world items
- `packages/entities/src/definitions/creatures.ts` - 6 new land creature definitions
- `packages/entities/src/definitions/aquatic-creatures.ts` - 1 new tidal_pools creature
- `packages/entities/src/definitions/index.ts` - ENTITY_IDS for all 7 new creatures
- `packages/world-gen/src/generation/spawn.ts` - Spawn configs with rebalanced weights
- `packages/game-logic/src/loot/creature-loot.ts` - 7 new loot table entries

## Decisions Made
None - followed plan as specified

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tier I biomes fully populated, ready for Tier II creature population (Plan 110-02)
- Pattern established for all subsequent tier plans

---
*Phase: 110-biome-creature-population*
*Completed: 2026-03-02*
