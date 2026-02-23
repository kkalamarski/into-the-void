---
phase: 77-poi-discovery-system
plan: 01
subsystem: world-gen
tags: [poi, procedural-generation, exploration]
completed: 2026-02-23

# Dependency graph
requires:
  - world-gen (chunk generation)
  - shared-types (BiomeType, ChunkData)
provides:
  - POI type definitions (anomaly, cache, landmark)
  - Procedural POI generation
  - ChunkData.pois field
affects:
  - All chunk generation (30% of chunks get 1-2 POIs)

# Tech stack
added:
  - PoiSpawn interface with deterministic IDs
  - POI_BASE_REWARDS with hasItemRoll flags
  - BIOME_TIER_MULTIPLIERS for reward scaling
  - Noise-based sparse POI placement
patterns:
  - Biome-weighted POI type selection
  - Collision-aware placement with fallback
  - Deterministic generation via seeded random

# Key files
created:
  - packages/shared-types/src/game/poi.ts (POI types and rewards)
  - packages/world-gen/src/generation/pois.ts (POI generation logic)
modified:
  - packages/shared-types/src/core/zone.ts (added ChunkData.pois field)
  - packages/world-gen/src/generation/chunk.ts (integrated POI generation)
  - packages/shared-types/src/index.ts (exported poi types)
  - packages/world-gen/src/index.ts (exported POI functions)

# Key decisions
decisions:
  - POI density threshold 0.3 (30% of chunks eligible) for sparse discovery feel
  - Noise frequency 0.03 (low) creates POI clusters rather than uniform distribution
  - Biome-specific weights (ancient_ruins prefers anomalies, toxic_wastes prefers caches)
  - Deterministic poiId format: poi_{chunkX}_{chunkY}_{index}
  - Edge margin 5-6 tiles prevents POIs spawning at chunk boundaries
  - Max 2 POIs per chunk (1 if density < 0.7, 2 if >= 0.7)

# Metrics
duration: 148
tasks_completed: 2
files_created: 2
files_modified: 4
---

# Phase 77 Plan 01: POI Type Definitions and Generation Summary

**One-liner:** Procedural POI generation with biome-weighted type selection and noise-based sparse placement (30% density threshold)

## Implementation Overview

Established the foundation for Points of Interest (POI) discovery system by creating type definitions, reward schemas, and procedural generation integrated into chunk creation.

### What Was Built

**1. POI Type System (packages/shared-types/src/game/poi.ts):**
- Three POI types: anomaly (exploration), cache (loot), landmark (scenic)
- PoiSpawn interface with coordinates, type, deterministic poiId, biome
- DiscoveryReward with xp, credits, optional item arrays
- POI_BASE_REWARDS config (anomaly: 100 xp/50c, cache: 50 xp/100c + items, landmark: 150 xp/25c)
- BIOME_TIER_MULTIPLIERS (1.0 for starter biomes, 4.0 for starfall_crater)

**2. Procedural POI Generation (packages/world-gen/src/generation/pois.ts):**
- Noise-based sparse placement (simplex noise at 0.03 frequency)
- 30% density threshold - only eligible chunks spawn POIs
- Biome-specific type weights (ancient_ruins: anomaly 10/cache 5/landmark 8)
- 0-2 POIs per eligible chunk (density > 0.7 spawns 2, else 1)
- Collision avoidance with 20-attempt fallback
- Deterministic poiId: `poi_{chunkX}_{chunkY}_{index}`

**3. Chunk Integration:**
- Extended ChunkData interface with optional `pois?: PoiSpawn[]` field
- Integrated generatePOIs() into WorldGenerator.generateChunk()
- Exported generatePOIs and selectPoiTypeForBiome from world-gen

### Technical Approach

**Sparse Placement Strategy:**
- Uses shared SimplexNoise instance (`${worldSeed}_poi_density`) for global distribution pattern
- Samples noise at chunk center, normalizes from [-1,1] to [0,1]
- Threshold 0.3 means 30% of chunks eligible (sparse, exploration-focused)
- Low frequency (0.03) creates natural POI clusters

**Biome-Weighted Selection:**
- Each biome has custom weights (ancient_ruins: anomaly-heavy, toxic_wastes: cache-heavy)
- Weighted random selection uses cumulative distribution
- Fallback weights (5/5/5) for unknown biomes

**Deterministic Generation:**
- Seeded random: `${worldSeed}_pois_${chunkX}_${chunkY}`
- Same seed + coordinates always produce same POIs
- Enables server/client agreement without network sync

### Verification Results

**TypeScript Compilation:**
- packages/shared-types/tsconfig.json: PASS
- packages/world-gen/tsconfig.json: PASS

**Integration Check:**
- generatePOIs() imported in chunk.ts: VERIFIED
- ChunkData.pois field added: VERIFIED
- Exports from world-gen index: VERIFIED

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

Plan 02 will implement:
- Server-side POI discovery tracking (character_discovered_pois table)
- Discovery validation and reward calculation
- Socket.IO event handlers (poi:discover, poi:discovered)
- Discovery radius check (3 tiles)

## Self-Check: PASSED

**Files Created:**
- FOUND: packages/shared-types/src/game/poi.ts
- FOUND: packages/world-gen/src/generation/pois.ts

**Commits Exist:**
- FOUND: c043d94 (Task 1: POI type definitions)
- FOUND: 2b42831 (Task 2: POI generation integration)

**Integration Points:**
- FOUND: generatePOIs call in chunk.ts
- FOUND: ChunkData.pois field in zone.ts
- FOUND: POI exports in world-gen index
