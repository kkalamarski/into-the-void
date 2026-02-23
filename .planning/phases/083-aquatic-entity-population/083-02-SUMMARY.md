---
phase: 83-aquatic-entity-population
plan: 02
subsystem: world-gen, game-logic
tags: [spawn-config, loot-tables, aquatic, biome-population]
dependency_graph:
  requires:
    - 083-01 (aquatic entity definitions)
  provides:
    - Aquatic biome spawn configurations (tidal_pools, kelp_forests, deep_trenches)
    - 10 aquatic creature loot tables
    - Cross-package integration (entities -> world-gen -> game-logic)
  affects:
    - packages/world-gen/src/generation/spawn.ts
    - packages/game-logic/src/loot/creature-loot.ts
tech_stack:
  added: []
  patterns:
    - Biome spawn configuration with density multipliers
    - Weighted spawn pools per biome tier
    - Loot table progression (common -> rare -> epic)
key_files:
  created: []
  modified:
    - packages/world-gen/src/generation/spawn.ts
    - packages/game-logic/src/loot/creature-loot.ts
decisions:
  - title: "1.5x aquatic density multiplier"
    rationale: "Ocean environments are naturally denser than terrestrial biomes. Applied 1.5x multiplier to void_plains baseline (4 -> 6 for tidal/kelp)."
    alternatives: ["Match terrestrial density", "Use 2x multiplier"]
    impact: "Aquatic zones feel more populated without overwhelming players. Deep trenches remain sparse (3) for danger signaling."
  - title: "Maniac spawn weight of 1"
    rationale: "Abyssal Leviathan uses same rare spawn weight as Void Horror in other dangerous biomes for consistency."
    alternatives: ["Higher weight for frequent encounters", "Zero weight (boss-only)"]
    impact: "Creates rare but memorable encounters in deep trenches, maintaining maniac threat level."
  - title: "Use existing items for loot tables"
    rationale: "Aquatic-specific items (kelp extracts, pearl fragments) will be added in Phase 86. Generic materials work for now."
    alternatives: ["Block on Phase 86", "Create placeholder items"]
    impact: "Allows testing of aquatic spawns immediately without blocking on item definitions."
metrics:
  duration: 327s
  task_count: 4
  file_count: 2
  completed_at: 2026-02-23
---

# Phase 83 Plan 02: Aquatic Spawn & Loot Configuration Summary

**One-liner:** Wire aquatic entities into spawn tables and loot systems with tier-appropriate densities and drop rates using existing items.

## Objective

Configure spawn tables and loot for aquatic biomes to complete entity population. This enables aquatic creatures/minerals to actually appear in-game and drop appropriate rewards when harvested/defeated.

## Execution

### Task 1: Verify Plan 01 Artifacts Exist
**Status:** ✅ Complete (verification only, no commit)
**Files:** packages/entities/src/definitions/index.ts

Verified that Plan 01 completed successfully:
- All 4 aquatic entity files exist (aquatic-creatures.ts, aquatic-plants.ts, aquatic-minerals.ts, aquatic-artifacts.ts)
- ENTITY_IDS.CREATURE_TIDE_CRAB is defined in index.ts
- Entities package builds successfully

### Task 2: Update Aquatic Biome Spawn Configurations
**Status:** ✅ Complete
**Commit:** e5d09e2
**Files:** packages/world-gen/src/generation/spawn.ts

Updated spawn configurations for 3 aquatic biomes:

**Tidal Pools (Tier I):**
- Creatures: Tide Crab, Coastal Urchin, Reef Scavenger (all herbivores/omnivores)
- Minerals: Coral Deposit, Sea Crystal, Tidal Stone
- Density: 6 creatures (1.5x void_plains baseline of 4), 5 minerals

**Kelp Forests (Tier II):**
- Creatures: Kelp Grazer, Tangle Stalker (predator), Current Rider
- Minerals: Sea Crystal, Pearl Node (rarity 2)
- Density: 6 creatures (dense cover), 4 minerals

**Deep Trenches (Tier III/IV):**
- Creatures: Pressure Feeder, Trench Hunter, Abyssal Scavenger, Abyssal Leviathan (weight: 1)
- Minerals: Abyssal Ore (rarity 3)
- Density: 3 creatures (sparse but dangerous), 5 minerals

Baseline reference: void_plains creatureDensity = 4 (Tier I terrestrial baseline).

### Task 3: Add Aquatic Creature Loot Tables
**Status:** ✅ Complete
**Commit:** 30f5160
**Files:** packages/game-logic/src/loot/creature-loot.ts

Added loot tables for all 10 aquatic creatures (baseline count: 17 -> final count: 27):

**Tier I (Tidal Pools):**
- Tide Crab: common organics (80%), crater dust (40%)
- Coastal Urchin: common organics (75%), crystal fragment (10%)
- Reef Scavenger: common organics (85%), crater dust (30%), rare organics (5%)

**Tier II (Kelp Forests):**
- Kelp Grazer: common organics (85%), mycelial fiber (35%), rare organics (10%)
- Tangle Stalker: rare organics (75%), crystal fragments (40%), biogenic catalyst (20%)
- Current Rider: common organics (80%), rare organics (12%), crystalline dust (15%)

**Tier III (Deep Trenches):**
- Pressure Feeder: rare organics (80%), thermal compound (30%), void crystal (15%)
- Trench Hunter: rare organics (85%), void crystals (40%), void essence (25%), epic organics (8%)
- Abyssal Scavenger: rare organics (75%), geothermal compound (30%), epic organics (6%)

**Tier IV (Maniac):**
- Abyssal Leviathan: epic organics (90%, 2-3), void crystals (50%, 2-4), void essence (40%, 2-3), ancient fragment (15%), thermal compound (30%), quantum residue (10%)

All itemId values verified to exist in packages/items. No placeholders or non-existent items used.

### Task 4: Verify Cross-Package Integration
**Status:** ✅ Complete (verification only, no commit)
**Files:** packages/world-gen/src/generation/spawn.ts

Verified cross-package integration:
- ENTITY_IDS import in spawn.ts resolves aquatic entities from @into-the-void/entities
- Full build of entities, world-gen, game-logic succeeded (all from cache)
- TypeScript compilation confirms ENTITY_IDS.CREATURE_TIDE_CRAB resolves correctly
- Loot system has matching lootTableId for all creatures

Lint failed due to unrelated ESLint configuration issue (ignores pattern too broad), not related to entity ID references.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

**Build verification:**
```bash
npx nx run world-gen:build
# Result: SUCCESS (from cache)

npx nx run game-logic:build
# Result: SUCCESS

npx nx run game-logic:test
# Result: 38 tests passed
```

**Spawn config verification:**
```bash
grep "CREATURE_TIDE_CRAB" packages/world-gen/src/generation/spawn.ts
# Result: Found in tidal_pools config

grep -E "(CREATURE_VOID_CRAWLER|CREATURE_COASTAL_SCUTTLER|CREATURE_VOID_HORROR)" packages/world-gen/src/generation/spawn.ts | grep -E "(tidal_pools|kelp_forests|deep_trenches)"
# Result: No placeholder references in aquatic biomes
```

**Loot table verification:**
```bash
grep -c "^\s*\['loot_creature_" packages/game-logic/src/loot/creature-loot.ts
# Before: 17
# After: 27 (+10 aquatic creatures)

grep "loot_creature_tide_crab" packages/game-logic/src/loot/creature-loot.ts
# Result: Found
```

**Cross-package verification:**
```bash
npx nx run-many --target=build --projects=entities,world-gen,game-logic
# Result: All 3 projects built successfully
```

## Research Flags

None - straightforward configuration using established spawn and loot patterns.

## Next Steps

**Phase 84:** Exotic Biome Foundation
- Implement exotic biome generators (temporal_rift, void_anomaly, psionic_field)
- Add exotic-specific environmental effects
- Configure exotic zone generation parameters

**Phase 86:** Aquatic-Specific Items
- Add kelp extracts, pearl fragments, bioluminescent samples
- Update aquatic plant/mineral harvest yields to use new items
- Create aquatic-themed crafting recipes

**Integration Testing (manual):**
- Generate world with aquatic biomes
- Verify creatures spawn at expected densities
- Test creature loot drops match configured tables
- Verify mineral nodes spawn with correct items

## Self-Check: PASSED

**File existence:**
```bash
[ -f "packages/world-gen/src/generation/spawn.ts" ] && echo "FOUND: spawn.ts" || echo "MISSING: spawn.ts"
# Result: FOUND: spawn.ts

[ -f "packages/game-logic/src/loot/creature-loot.ts" ] && echo "FOUND: creature-loot.ts" || echo "MISSING: creature-loot.ts"
# Result: FOUND: creature-loot.ts
```

**Commit existence:**
```bash
git log --oneline --all | grep -q "e5d09e2" && echo "FOUND: e5d09e2" || echo "MISSING: e5d09e2"
# Result: FOUND: e5d09e2

git log --oneline --all | grep -q "30f5160" && echo "FOUND: 30f5160" || echo "MISSING: 30f5160"
# Result: FOUND: 30f5160
```

All files modified and all commits verified.

---

**Phase 83 Plan 02 complete.** Aquatic entity population finished. Ready to proceed to Phase 84 (Exotic Biome Foundation).
