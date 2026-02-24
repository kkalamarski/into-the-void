---
phase: 86-exotic-entity-population
plan: 01
subsystem: entities
tags: [content-expansion, exotic-biomes, entity-definitions]
dependency-graph:
  requires: [phase-84-exotic-foundation, phase-81-health-balance]
  provides: [exotic-entity-definitions, exotic-biome-population]
  affects: [entity-registry, spawn-configuration]
tech-stack:
  added: []
  patterns: [entity-definition-pattern, harvest-yield-pattern]
key-files:
  created:
    - packages/entities/src/definitions/exotic-creatures.ts
    - packages/entities/src/definitions/exotic-plants.ts
    - packages/entities/src/definitions/exotic-minerals.ts
    - packages/entities/src/definitions/exotic-artifacts.ts
  modified:
    - packages/entities/src/definitions/index.ts
decisions:
  - Changed MINERAL_VOID_CRYSTAL_NODE rarity from 'exotic' to 'epic' (NodeRarity only supports 'common'|'rare'|'epic')
  - All exotic entities use ONLY verified-existing item IDs for harvest/mining yields
  - Phase 81 health balance targets applied to all exotic creatures
metrics:
  duration: 252s
  completed: 2026-02-24
---

# Phase 86 Plan 01: Exotic Entity Population - Definitions Summary

Created all 24 exotic entity definitions for bioluminescent_depths, crystalline_wastes, and void_rift biomes using Phase 81 health targets and verified-existing item yields.

## Overview

**Objective:** Define exotic entities (creatures, plants, minerals, artifacts) for Tier II-IV exotic biomes.

**Result:** 24 new entity definitions registered in entity registry, following established patterns from Phase 83 aquatic entities.

**One-liner:** 24 exotic entities across 3 dimensional biomes with Phase 81-compliant health values and verified item yields (reagent_quantum_residue, reagent_void_essence, world_void_crystal, etc.)

## Entities Created

### Exotic Creatures (10)

**Tier II - Bioluminescent Depths:**
- Echo Drifter (herbivore, 125 HP, levels 6-14)
- Phase Grazer (herbivore, 130 HP, levels 7-15)
- Reality Scavenger (omnivore, 135 HP, levels 8-16)

**Tier III - Crystalline Wastes:**
- Null Feeder (herbivore, 180 HP, levels 12-20)
- Dimensional Hunter (omnivore, 190 HP, levels 13-22)
- Rift Hunter (predator, 210 HP, levels 14-24)

**Tier IV - Void Rift:**
- Void Grazer (predator, 240 HP, levels 18-28)
- Anomaly Scavenger (omnivore, 260 HP, levels 20-30)
- Void Stalker (predator, 280 HP, levels 22-32)
- Dimensional Aberration (maniac, 320 HP, levels 24-35) - Endgame threat

### Exotic Plants (5)

- Reality Moss (bioluminescent_depths): Yields world_organic_material_common, reagent_biogenic_catalyst
- Echo Bloom (bioluminescent_depths, void_rift): Yields world_organic_material_rare, reagent_quantum_residue
- Temporal Fungus (bioluminescent_depths): Yields world_fungal_spore_cluster, reagent_quantum_residue
- Void Vine (void_rift): Yields world_organic_material_rare, reagent_void_essence
- Null Grass (crystalline_wastes, void_rift): Yields world_organic_material_rare, reagent_crystalline_dust

### Exotic Minerals (5)

- Void Crystal Node (void_rift, T4): Yields world_void_crystal, reagent_void_essence, rarity: epic
- Anomaly Shard (void_rift, bioluminescent_depths, T3): Yields world_crystal_fragment, reagent_quantum_residue, rarity: rare
- Dimensional Ore (void_rift, T4): Yields world_void_crystal, world_organic_material_rare
- Null Stone (crystalline_wastes, T3): Yields world_crystal_fragment, reagent_crystalline_dust
- Phase Mineral (bioluminescent_depths, crystalline_wastes, T2): Yields world_crystal_fragment, reagent_quantum_residue

### Exotic Artifacts (4)

- Anomaly Core (void_rift): Legendary, non-respawning
- Dimensional Fragment (void_rift, crystalline_wastes): Exotic, non-respawning
- Echo Record (bioluminescent_depths, crystalline_wastes): Rare, non-respawning
- Void Relic (void_rift): Legendary, non-respawning

## Implementation Details

**Pattern Followed:** Replicated Phase 83 aquatic entity patterns exactly:
- CreatureDefinition with baseHealth, levelRange, baseXp, respawnSeconds
- PlantDefinition with harvestYield array (itemId, minAmount, maxAmount, chance)
- MineralDefinition with miningYield array and requiredTier (2-4)
- ArtifactDefinition with respawns: false and rarity tier

**Health Balance:** All creatures follow Phase 81 health targets:
- Tier II: 125-135 HP (4-5 hits with Tier II weapons)
- Tier III: 180-210 HP (5-6 hits with Tier III weapons)
- Tier IV: 240-280 HP (7-8 hits with Tier IV weapons)
- Tier IV Maniac: 320 HP (designed for group combat)

**Item Verification:** Pre-verified all harvest/mining yield itemIds exist:
- world_organic_material_common, world_organic_material_rare
- world_fungal_spore_cluster, world_void_crystal, world_crystal_fragment
- reagent_biogenic_catalyst, reagent_quantum_residue, reagent_void_essence
- reagent_crystalline_dust

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Type Error] Changed MINERAL_VOID_CRYSTAL_NODE rarity**
- **Found during:** Task 2 build verification
- **Issue:** Plan specified rarity: 'exotic', but NodeRarity type only supports 'common' | 'rare' | 'epic'
- **Fix:** Changed to rarity: 'epic' (highest valid tier)
- **Files modified:** packages/entities/src/definitions/exotic-minerals.ts
- **Commit:** 1b11144 (included in Task 2 commit)

## Registry Integration

**Updated packages/entities/src/definitions/index.ts:**
- Added imports for ALL_EXOTIC_CREATURES, ALL_EXOTIC_PLANTS, ALL_EXOTIC_MINERALS, ALL_EXOTIC_ARTIFACTS
- Spread all exotic arrays into ALL_ENTITIES
- Added 24 ENTITY_IDS constants for exotic entities
- Added re-exports for all exotic modules
- Updated entity count documentation: ~58 → ~82 entities

## Verification Results

```bash
# Build verification
npx nx run entities:build
# ✓ Build succeeded (warnings about lockfile generation are non-blocking)

# Export verification
grep -r "CREATURE_ECHO_DRIFTER" packages/entities/src/definitions/
# ✓ Found in exotic-creatures.ts (definition) and index.ts (ENTITY_IDS)

# Array verification
grep -r "ALL_EXOTIC" packages/entities/src/definitions/ | grep -c "export const"
# ✓ Returns 4 (creatures, plants, minerals, artifacts)

# Item ID verification
for item in world_organic_material_common world_organic_material_rare world_fungal_spore_cluster world_void_crystal world_crystal_fragment reagent_biogenic_catalyst reagent_quantum_residue reagent_void_essence reagent_crystalline_dust; do
  grep -q "id: '$item'" packages/items/src/definitions/*.ts && echo "✓ $item" || echo "✗ MISSING: $item"
done
# ✓ All 9 unique item IDs verified present in packages/items
```

## Tasks Completed

| Task | Name                                      | Commit  | Files                                   |
| ---- | ----------------------------------------- | ------- | --------------------------------------- |
| 1    | Create Exotic Creature Definitions        | e46cdd9 | exotic-creatures.ts (10 creatures)      |
| 2    | Create Exotic Plant and Mineral Defs      | 1b11144 | exotic-plants.ts (5), exotic-minerals.ts (5) |
| 3    | Create Exotic Artifacts and Register All  | fd23bbf | exotic-artifacts.ts (4), index.ts       |

## Next Steps

1. **Phase 86 Plan 02:** Configure spawn tables for exotic entities
2. Assign spawn weights based on biome tier and entity rarity
3. Configure loot tables for all exotic creatures (referenced via lootTableId)

## Success Criteria

- [x] 10 exotic creatures defined with Phase 81-compliant health values
- [x] 5 exotic plants defined with harvest yields referencing VERIFIED EXISTING items
- [x] 5 exotic minerals defined with mining yields referencing VERIFIED EXISTING items and tier requirements
- [x] 4 exotic artifacts defined as non-respawning discoveries
- [x] All 24 entities registered in ALL_ENTITIES array
- [x] All 24 entities have ENTITY_IDS constants
- [x] packages/entities builds without errors
- [x] NO references to non-existent items

## Self-Check: PASSED

**Files Created:**
```bash
[ -f "packages/entities/src/definitions/exotic-creatures.ts" ] && echo "FOUND: exotic-creatures.ts" || echo "MISSING"
# FOUND: exotic-creatures.ts

[ -f "packages/entities/src/definitions/exotic-plants.ts" ] && echo "FOUND: exotic-plants.ts" || echo "MISSING"
# FOUND: exotic-plants.ts

[ -f "packages/entities/src/definitions/exotic-minerals.ts" ] && echo "FOUND: exotic-minerals.ts" || echo "MISSING"
# FOUND: exotic-minerals.ts

[ -f "packages/entities/src/definitions/exotic-artifacts.ts" ] && echo "FOUND: exotic-artifacts.ts" || echo "MISSING"
# FOUND: exotic-artifacts.ts
```

**Commits Exist:**
```bash
git log --oneline --all | grep -E "e46cdd9|1b11144|fd23bbf"
# e46cdd9 feat(86-01): create exotic creature definitions
# 1b11144 feat(86-01): create exotic plant and mineral definitions
# fd23bbf feat(86-01): create exotic artifacts and register all exotic entities
```

**Exports Verified:**
```bash
grep -c "ALL_EXOTIC_CREATURES" packages/entities/src/definitions/index.ts
# 2 (import + spread in ALL_ENTITIES)

grep -c "CREATURE_DIMENSIONAL_ABERRATION" packages/entities/src/definitions/index.ts
# 1 (ENTITY_IDS constant)
```

All verification checks passed.
