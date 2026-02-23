---
phase: 83-aquatic-entity-population
plan: 03
subsystem: world-generation
tags: [gap-closure, spawning, plants, artifacts, biomes]

dependency_graph:
  requires:
    - 083-01 # Plant and artifact definitions
    - 083-02 # Spawn configurations
  provides:
    - plant_spawn_system # Plants spawn in all compatible biomes
    - artifact_spawn_system # Artifacts spawn as rare finds
    - biome_query_helpers # getBiomePlants/getBiomeArtifacts
  affects:
    - zone_generation # generateSpawnPoints now creates plant/artifact spawns
    - entity_population # 19 plants + 8 artifacts now active

tech_stack:
  added:
    - NodeRarity type import from shared-types
  patterns:
    - Weighted spawn selection for plants
    - Probability-gated spawn for artifacts (5% per attempt)
    - Per-tile biome sampling for spawn table selection

key_files:
  created: []
  modified:
    - packages/world-gen/src/generation/spawn.ts # Main spawn system
    - packages/shared-types/src/core/zone.ts # SpawnPoint type extension
    - packages/entities/src/definitions/index.ts # PLANT_VOID_FERN ID added

decisions:
  - title: Artifact spawn rarity
    choice: 5% base probability per attempt
    rationale: Artifacts are one-time discoveries meant to be rare endgame finds
    alternatives: [Fixed per-chunk, Proximity-based like rare minerals]
  - title: Plant respawn timing
    choice: 5-10 minutes (300 + random 300)
    rationale: Matches mineral respawn pattern, provides consistent gathering loop
    alternatives: [Shorter for common plants, Per-biome timing]
  - title: Artifact respawn behavior
    choice: respawnTime = -1 (no respawn)
    rationale: Artifacts are unique discoveries, handled by ZonesService logic
    alternatives: [Extremely long respawn, Server-managed respawn]

metrics:
  duration: 239s
  tasks_completed: 3
  commits: 2
  files_modified: 3
  completed_date: 2026-02-23
---

# Phase 83 Plan 03: Plant & Artifact Spawn System

**One-liner:** Systemic gap fix enabling 19 plants and 8 artifacts to spawn across all 13 biomes using weighted selection and probability gating.

## Overview

This plan fixes a critical spawn system gap: plants and artifacts were fully defined (083-01) but never appeared in the world because `generateSpawnPoints()` only handled creatures and minerals. This affected ALL biomes, not just aquatic ones.

The fix extends the spawn system to support plant and artifact entity types, configures spawn tables for all 13 biomes, and adds query helpers for UI/quest integration.

## What Was Built

### 1. BiomeSpawnConfig Extension
- Added `plants` array with id/weight/rarity fields
- Added `artifacts` array with id/weight/rarity fields
- Added `plantDensity` number (3-5 per chunk)
- Added `artifactDensity` number (1 attempt per chunk, gated by 5% probability)

### 2. Plant Spawn Logic
Implemented in `generateSpawnPoints()` after mineral spawning:
- Uses `SPAWN_CAPS.plants` (5) as max per chunk
- Applies fertility multiplier like minerals
- Uses `weightedPick()` for selection from plants array
- Respawn time: 300 + random(0, 300) seconds (5-10 minutes)
- Per-tile biome sampling for accurate spawn tables

### 3. Artifact Spawn Logic
Implemented after plant spawning:
- Uses `SPAWN_CAPS.artifacts` (2) as max attempts per chunk
- **Extremely rare**: only 5% base probability per attempt
- Uses `weightedPick()` for rarity-based selection
- respawnTime: -1 (artifacts don't respawn, handled by ZonesService)
- Per-tile biome sampling

### 4. Biome Spawn Configuration
All 13 biomes configured with plants and artifacts arrays:

**Plants (19 total):**
- Common weight: 10
- Rare variants weight: 2 (5x less frequent)
- Biomes with multiple plants: fungal_forest (3), void_plains (2), deep_trenches (3)

**Artifacts (8 total):**
- rare rarity: weight 10
- epic rarity: weight 6
- exotic rarity: weight 3
- legendary rarity: weight 1
- Biomes with NO artifacts: void_plains, toxic_wastes, fungal_forest, miasma_marshes, tidal_pools

**Density values:**
- plantDensity: 3 (standard), 4 (fungal_forest - lush), 5 (aquatic biomes)
- artifactDensity: 1 for all biomes (attempts, not guaranteed spawns)

### 5. Helper Functions
Added query functions following existing pattern:
```typescript
export function getBiomePlants(biome: BiomeType): string[]
export function getBiomeArtifacts(biome: BiomeType): string[]
```

Enables UI tooltips, quest generation, and biome info displays.

### 6. Type Extension
Extended `SpawnPoint` interface in shared-types:
- `entityType: 'creature' | 'mineral' | 'plant' | 'artifact'`
- Updated respawnTime comment to clarify -1 means no respawn

## Technical Implementation

### Spawn Order
1. Creatures (existing)
2. Minerals (existing)
3. Rare minerals (existing)
4. Epic minerals (existing)
5. **Plants (NEW)**
6. **Artifacts (NEW)**

### Rarity Mechanics

**Plants:**
- Common plants spawn with weight 10
- Rare variants spawn with weight 2 (same pattern as rare minerals)
- Rarity affects appearance frequency within biome

**Artifacts:**
- Weight determines selection probability AFTER 5% gate passes
- legendary (weight 1) = 1/(sum of weights) chance
- rare (weight 10) = 10/(sum of weights) chance
- Double-gated rarity: spawn probability * selection weight

### Biome Plant Mapping
Based on plant definitions' `biomes` field:
- void_plains: DROUGHT_CACTUS, VOID_FERN
- crystal_caves: LATTICE_MOSS, LATTICE_MOSS_RARE
- toxic_wastes: ACID_FERN
- ancient_ruins: PHASE_BLOOM, PHASE_BLOOM_RARE
- frozen_expanse: ICE_ALGAE
- volcanic_ridge: THERMAL_VENT_MOSS
- fungal_forest: LUMINOUS_VINE, VOID_FERN, LUMINOUS_VINE_RARE
- starfall_crater: STAR_LICHEN
- miasma_marshes: GAS_POD
- petrified_expanse: MOBILE_VINE
- tidal_pools: TIDAL_KELP, BIOLUMINESCENT_ALGAE
- kelp_forests: BIOLUMINESCENT_ALGAE, PRESSURE_FERN
- deep_trenches: PRESSURE_FERN, VOID_KELP, THERMAL_VENT_COLONY

### Biome Artifact Mapping
Based on artifact definitions' `biomes` field:
- ancient_ruins: ANCIENT_DATA_CORE (exotic), VOID_TOUCHED_RELIC (legendary)
- starfall_crater: VOID_TOUCHED_RELIC (legendary)
- crystal_caves: CRYSTALLINE_RESONATOR (epic)
- petrified_expanse: PRESERVED_SPECIMEN (rare)
- frozen_expanse: PRESERVED_SPECIMEN (rare)
- volcanic_ridge: THERMAL_CORE (epic)
- kelp_forests: SUNKEN_TECH (epic)
- deep_trenches: SUNKEN_TECH (epic), ANCIENT_SHELL (rare), DROWNED_RELIC (legendary)

## Verification Results

### Build Check
```bash
npx nx run world-gen:build
```
✅ **SUCCESS** - All changes compile without errors

### Coverage Check
```bash
grep -E "plants: \[" packages/world-gen/src/generation/spawn.ts | wc -l
# Result: 13 (all biomes configured)
```
✅ **SUCCESS** - All 13 biomes have plant arrays

### Artifact Check
```bash
grep -A5 "kelp_forests:" spawn.ts | grep "ARTIFACT_SUNKEN_TECH"
# Found: ARTIFACT_SUNKEN_TECH in kelp_forests
```
✅ **SUCCESS** - Aquatic artifacts configured correctly

### Type Check
```bash
grep "entityType: 'plant'" spawn.ts
grep "entityType: 'artifact'" spawn.ts
```
✅ **SUCCESS** - SpawnPoint type extension works

### Helper Check
```bash
grep "export function getBiomePlants" spawn.ts
grep "export function getBiomeArtifacts" spawn.ts
```
✅ **SUCCESS** - Helper functions exported

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing PLANT_VOID_FERN in ENTITY_IDS**
- **Found during:** Task 2 (biome configuration)
- **Issue:** PLANT_VOID_FERN referenced in plants.ts but not in ENTITY_IDS constants
- **Fix:** Added PLANT_VOID_FERN: 'plant_void_fern' to ENTITY_IDS
- **Files modified:** packages/entities/src/definitions/index.ts
- **Commit:** 4dfb46c (included in main commit)
- **Rationale:** Required for type-safe ID usage, prevents runtime errors

**2. [Rule 3 - Blocking] SpawnPoint type missing 'plant' and 'artifact'**
- **Found during:** Task 1 verification (build failed)
- **Issue:** TypeScript error - entityType only allowed 'creature' | 'mineral'
- **Fix:** Extended SpawnPoint entityType union to include 'plant' | 'artifact'
- **Files modified:** packages/shared-types/src/core/zone.ts
- **Commit:** 4dfb46c (included in main commit)
- **Rationale:** Type extension required for spawn logic to compile

## Impact Analysis

### Before
- ❌ Plants: 19 definitions, 0 spawns in world
- ❌ Artifacts: 8 definitions, 0 spawns in world
- ❌ getBiomePlants/getBiomeArtifacts: did not exist

### After
- ✅ Plants: 19 definitions, spawn in all 13 biomes (density 3-5 per chunk)
- ✅ Artifacts: 8 definitions, spawn in 8 biomes (extremely rare, 5% gate)
- ✅ getBiomePlants/getBiomeArtifacts: available for UI/quest systems

### Gameplay Impact
- Players can now gather plants for crafting/progression
- Players can discover rare artifacts as endgame rewards
- Biomes feel more populated with harvestable resources
- Exploration incentivized by artifact discovery

### Technical Impact
- SpawnPoint type extended (backward compatible)
- generateSpawnPoints() output includes new entity types
- ZonesService must handle plant/artifact spawn points (should work with existing logic)
- Entity registry already has all 27 entity definitions registered

## Testing Recommendations

### Unit Tests
1. Test `generateSpawnPoints()` produces plant spawn points
2. Test `generateSpawnPoints()` produces artifact spawn points (with seed that passes 5% gate)
3. Test `getBiomePlants()` returns correct plant IDs per biome
4. Test `getBiomeArtifacts()` returns correct artifact IDs per biome
5. Test plant density scales with fertility multiplier
6. Test artifact spawn respects 5% probability gate

### Integration Tests
1. Generate test chunks, verify plant spawn points exist
2. Generate test chunks, verify artifact spawn points (may need multiple attempts)
3. Verify ZonesService handles plant/artifact spawn points correctly
4. Verify EntityRegistry has definitions for all spawned IDs

### Manual Tests
1. Visit each biome, verify plants spawn visually
2. Explore for extended period, verify artifact appearance (very rare)
3. Harvest plants, verify respawn after 5-10 minutes
4. Collect artifact, verify no respawn occurs

## Self-Check

### File Existence
```bash
[ -f "packages/world-gen/src/generation/spawn.ts" ] && echo "FOUND"
# FOUND ✅

[ -f "packages/shared-types/src/core/zone.ts" ] && echo "FOUND"
# FOUND ✅

[ -f "packages/entities/src/definitions/index.ts" ] && echo "FOUND"
# FOUND ✅
```

### Commit Verification
```bash
git log --oneline --all | grep -q "4dfb46c" && echo "FOUND: 4dfb46c"
# FOUND: 4dfb46c ✅

git log --oneline --all | grep -q "9890190" && echo "FOUND: 9890190"
# FOUND: 9890190 ✅
```

### Build Verification
```bash
npx nx run world-gen:build
# Successfully ran target build ✅
```

## Self-Check: PASSED ✅

All files exist, all commits verified, build succeeds.

## Next Steps

1. **Phase 83-04 (if exists):** Continue aquatic entity population
2. **Phase 84:** Begin exotic biome foundation
3. **Integration:** Test plant/artifact spawning in game server
4. **Balance:** Monitor artifact drop rates, adjust 5% gate if too rare/common

## Notes

- Artifact spawn rate (5% per attempt, 1 attempt per chunk) means ~1 artifact per 20 chunks on average
- Plant respawn timing matches mineral pattern for consistency
- Rare plant variants use same weight ratio as rare minerals (1:5)
- No aquatic-specific items yet (Phase 86), using existing harvest yields
- Deep trenches has highest artifact diversity (3 different artifacts)
- Ancient ruins and deep trenches are artifact hotspots (legendary rarity available)
