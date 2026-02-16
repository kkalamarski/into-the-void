---
phase: 19
plan: 01
subsystem: world-generation
tags: [biome-sampling, terrain-generation, seamless-chunks]
dependency_graph:
  requires: []
  provides:
    - per-tile-biome-sampling
    - seamless-biome-transitions
  affects:
    - chunk-generation
    - terrain-generation
tech_stack:
  added: []
  patterns:
    - Per-tile biome sampling using world coordinates
    - BiomeGenerator injection for terrain generation
key_files:
  created: []
  modified:
    - packages/world-gen/src/generation/terrain.ts
    - packages/world-gen/src/generation/chunk.ts
decisions:
  - decision: "Pass BiomeGenerator to generateTerrain instead of BiomeType"
    rationale: "Enables per-tile biome sampling based on world coordinates, eliminating chunk boundary artifacts"
  - decision: "Use dominant biome at chunk center for path tile selection"
    rationale: "Ensures connectivity paths use consistent biome tiles"
  - decision: "Keep structure and spawn generation using chunk-level dominant biome"
    rationale: "Maintains consistent loot tables and spawn pools per chunk while allowing terrain to transition"
metrics:
  duration_seconds: 159
  completed_date: 2026-02-16
---

# Phase 19 Plan 01: Per-Tile Biome Sampling

**One-liner:** Switch terrain generation from per-chunk biome assignment to per-tile biome sampling, eliminating boundary artifacts by sampling biome based on each tile's world coordinates.

## What Changed

### Core Implementation

**1. Modified `generateTerrain` signature**
- Changed from `biome: BiomeType` parameter to `biomeGenerator: BiomeGenerator`
- Added import for BiomeGenerator from './biome'
- Each tile now samples its biome using `biomeGenerator.getBiome(worldX, worldY)`

**2. Per-tile biome sampling loop**
```typescript
for (let y = 0; y < ZONE_SIZE; y++) {
  for (let x = 0; x < ZONE_SIZE; x++) {
    const worldX = chunkX * ZONE_SIZE + x;
    const worldY = chunkY * ZONE_SIZE + y;

    // Sample biome for this specific tile
    const biome = biomeGenerator.getBiome(worldX, worldY);
    const biomeTileIds = BIOME_TILE_IDS[biome];
    const biomeTiles = BIOME_TILES[biome];
    const wallThreshold = getWallThreshold(biome);

    // Generate tile based on per-tile biome
    // ...

    // Clamp height to per-tile biome range
    heights[y][x] = clampToBiomeRange(rawHeight, biome);
  }
}
```

**3. Updated WorldGenerator.generateChunk**
- Continues to calculate dominant biome: `this.biomeGenerator.getChunkBiome(chunkX, chunkY, ZONE_SIZE)`
- Passes `this.biomeGenerator` to `generateTerrain()` instead of `biome`
- Dominant biome still used for structures and spawn points (correct behavior)

**4. Path connectivity using chunk-center biome**
```typescript
const centerX = chunkX * ZONE_SIZE + ZONE_SIZE / 2;
const centerY = chunkY * ZONE_SIZE + ZONE_SIZE / 2;
const dominantBiome = biomeGenerator.getBiome(centerX, centerY);
const pathTiles = BIOME_TILES[dominantBiome];
const pathTileIds = BIOME_TILE_IDS[dominantBiome];
ensureZoneConnectivity(tiles, heights, collisions, pathTiles.floor, pathTileIds.floor, dominantBiome);
```

### Verification Tasks

**Task 3: Structure generation**
- Verified `generateStructures` already receives `biome: BiomeType` parameter
- Call site in chunk.ts correctly passes dominant biome
- No changes needed - structures correctly use chunk-level biome for consistency

**Task 4: Server-side ZoneState biome**
- Verified `getZoneState()` in game.service.ts populates `biome` field
- Uses `getBiome(worldSeed, chunkX, chunkY)` to determine chunk's dominant biome
- This provides biome data for client HUD display (Plan 19-02 dependency)
- No changes needed - wiring already correct

## Deviations from Plan

None - plan executed exactly as written.

## Key Behaviors

**Before this change:**
- Each chunk had a single biome for all tiles
- Adjacent chunks could have different biomes, creating hard boundaries
- Tiles at chunk edges (x=31 in chunk 0, x=0 in chunk 1) had different biomes even if noise values were similar

**After this change:**
- Each tile samples its biome independently based on world coordinates
- Adjacent tiles at chunk boundaries have continuous biomes if noise values align
- Seamless biome transitions across chunk boundaries
- Height clamping uses per-tile biome for accurate elevation ranges

**Why structures still use dominant biome:**
- Loot tables are biome-specific
- Spawn pools are biome-specific
- Using per-tile biome for structures would cause inconsistent rewards/enemies within a chunk
- Research confirmed: chunk-level biome for structures/spawns is correct design

## Files Modified

### `/packages/world-gen/src/generation/terrain.ts`
- Added BiomeGenerator import
- Changed signature: `biome: BiomeType` → `biomeGenerator: BiomeGenerator`
- Moved biome sampling inside tile loop (per-tile instead of per-chunk)
- Added chunk-center biome calculation for path connectivity

### `/packages/world-gen/src/generation/chunk.ts`
- Updated `generateChunk` to pass `this.biomeGenerator` to terrain generation
- Added clarifying comments about dominant biome usage for structures/spawns
- No changes to ChunkData interface (biome field is part of ZoneState, not ChunkData)

## Testing Evidence

**Build verification:**
```
pnpm build
✓ Successfully ran target build for 8 projects
```

**TypeScript compilation:**
- No type errors in world-gen package
- No type errors in dependent packages (game-server, api, web)
- All imports resolve correctly

**Expected runtime behavior:**
- Tiles at chunk boundaries will now have continuous biomes based on noise values
- Biome transitions will be gradual rather than abrupt at chunk edges
- Server continues to report dominant biome in ZoneState for HUD display

## Dependencies

**Provides for Plan 19-02:**
- Per-tile biome sampling ensures seamless terrain
- Server-side `ZoneState.biome` field populated with dominant biome
- Client can display biome information in HUD

**No breaking changes:**
- ChunkData interface unchanged
- Server-side zone state wiring unchanged
- Client-side rendering expects same data structure

## Self-Check: PASSED

**Created files:** None (as expected)

**Modified files:**
```bash
✓ FOUND: packages/world-gen/src/generation/terrain.ts
✓ FOUND: packages/world-gen/src/generation/chunk.ts
```

**Commits:**
```bash
✓ FOUND: d688901 (feat(19-01): implement per-tile biome sampling)
```

**Build verification:**
```bash
✓ All packages build successfully
✓ No TypeScript errors
```

## Next Steps

Plan 19-02 will add biome display to the client HUD, consuming the `ZoneState.biome` field that is now correctly populated by the server.
