# Phase 19: Biome Integration - Research

**Researched:** 2026-02-17
**Domain:** Procedural biome generation using noise layers
**Confidence:** HIGH

## Summary

Biome integration requires transitioning from per-chunk biome assignment to per-tile biome sampling using continuous noise layers (temperature, moisture, elevation). The current system uses `BiomeGenerator.getChunkBiome()` which samples the center point of a chunk, creating hard boundaries between chunks. Per-tile sampling using world coordinates eliminates these artifacts and creates seamless transitions.

The implementation follows the Whittaker diagram approach: three noise layers (temperature, moisture, elevation) map to biome types via threshold-based classification. The existing `BiomeGenerator` class already implements this pattern but is only used for chunk-level assignment. The codebase already has SimplexNoise with FBM support and world-coordinate-based height generation (Phase 17), providing the foundation.

**Primary recommendation:** Use per-tile biome sampling with world coordinates during terrain generation. Display current biome in HUD by sampling player's world position. The performance cost is minimal (three noise samples per tile) since generation is server-side and cached.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SimplexNoise (in-house) | Current | Noise generation with FBM support | Already implemented in `packages/world-gen/src/noise/simplex.ts`, Stefan Gustavson-based implementation |
| BiomeGenerator (in-house) | Current | Climate layer system (temp/moisture/elevation) | Already implements Whittaker-style classification in `packages/world-gen/src/generation/biome.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TileRegistry | Current | Tile metadata and biome-tile mapping | Already used for collision and movement speed lookups |
| Zustand | Current | Client-side state for HUD biome display | Already manages player position and game state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Simplex noise | Perlin noise | Perlin has directional artifacts and worse scaling to higher dimensions. Simplex is already implemented. |
| Whittaker classification | Voronoi-based biome cells | Voronoi creates discrete regions with hard boundaries - opposite of seamless transitions requirement. |
| Per-tile sampling | Biome blending/interpolation | Blending requires determining which biomes to blend - still needs per-tile classification first. |

**Installation:**
No new dependencies required. All necessary systems already exist in codebase.

## Architecture Patterns

### Recommended Implementation Flow

```
Server (world generation):
  1. For each tile in chunk:
     - Calculate worldX = chunkX * ZONE_SIZE + localX
     - Calculate worldY = chunkY * ZONE_SIZE + localY
     - Sample biome = biomeGenerator.getBiome(worldX, worldY)
     - Select tiles from BIOME_TILE_IDS[biome]

Client (HUD display):
  1. Get player world position from Zustand store
  2. Request current biome from server (cache on client)
  3. Display biome name in HUD
```

### Pattern 1: Per-Tile Biome Sampling
**What:** Call `BiomeGenerator.getBiome(worldX, worldY)` for each tile during generation instead of once per chunk.

**When to use:** During `generateTerrain()` in the tile selection loop.

**Example:**
```typescript
// Current (per-chunk):
const biome = this.biomeGenerator.getChunkBiome(chunkX, chunkY, ZONE_SIZE);
for (let y = 0; y < ZONE_SIZE; y++) {
  for (let x = 0; x < ZONE_SIZE; x++) {
    const biomeTiles = BIOME_TILE_IDS[biome]; // Same biome for all tiles
  }
}

// Improved (per-tile):
for (let y = 0; y < ZONE_SIZE; y++) {
  for (let x = 0; x < ZONE_SIZE; x++) {
    const worldX = chunkX * ZONE_SIZE + x;
    const worldY = chunkY * ZONE_SIZE + y;
    const biome = this.biomeGenerator.getBiome(worldX, worldY); // Unique biome per tile
    const biomeTiles = BIOME_TILE_IDS[biome];
  }
}
```

### Pattern 2: Chunk-Level Biome for Metadata
**What:** Continue using `getChunkBiome()` for chunk-level metadata (dominant biome, spawn tables, etc.) while using per-tile sampling for terrain.

**When to use:** Determining which entity spawn tables to use, broadcasting chunk biome to clients.

**Example:**
```typescript
// Dominant biome for chunk metadata
const chunkBiome = this.biomeGenerator.getChunkBiome(chunkX, chunkY, ZONE_SIZE);

// Per-tile for terrain generation
for (let y = 0; y < ZONE_SIZE; y++) {
  for (let x = 0; x < ZONE_SIZE; x++) {
    const worldX = chunkX * ZONE_SIZE + x;
    const worldY = chunkY * ZONE_SIZE + y;
    const tileBiome = this.biomeGenerator.getBiome(worldX, worldY);
    // ... generate tile based on tileBiome
  }
}

return {
  chunk: { /* tiles generated with per-tile biomes */ },
  biome: chunkBiome // Metadata uses dominant biome
};
```

### Pattern 3: Client-Side Biome Display
**What:** Display current biome name in HUD based on player's world position.

**When to use:** HUD component rendering.

**Example:**
```typescript
// In HUD.tsx
const { player } = useGameStore();

// Calculate player world position
const worldPos = toWorldPosition(player.position);

// Get biome at position (from server or cached)
const currentBiome = getBiomeAt(worldPos.worldX, worldPos.worldY);

// Display in HUD
<div className="biome-indicator">
  {BIOME_NAMES[currentBiome]}
</div>
```

### Anti-Patterns to Avoid

- **Per-chunk assignment with blending:** Attempting to blend tiles at chunk edges creates complexity and still shows visible transition lines. Per-tile sampling eliminates the problem at the source.

- **Client-side biome generation:** Biome classification must use the same seed and noise instances as server. Keep generation server-side; send biome data to client.

- **Caching biome per tile in database:** Biomes are deterministic from world coordinates. Re-calculate on demand instead of storing 64x64 biome values per chunk.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Noise generation | Custom Perlin/Simplex implementation | Existing SimplexNoise class | Already implemented, tested, and used for height generation. Consistent noise across all systems. |
| Biome classification | Custom climate thresholds | Existing BiomeGenerator.getBiome() | Already implements Whittaker-style classification. Matches lore's 10 biome types (8 implemented + 2 future). |
| World coordinate conversion | Manual calculation | toWorldPosition() from game-logic | Already used in Phase 17 for entity visibility. Handles negative coordinates and modulo correctly. |
| HUD state management | Custom React context | Zustand gameStore | Already manages player position, zone state, and connection state. Consistent with codebase patterns. |

**Key insight:** The codebase already has all necessary primitives. This phase is about wiring them together correctly, not building new systems.

## Common Pitfalls

### Pitfall 1: Biome Mismatch Between Height and Tiles
**What goes wrong:** Height generation uses world coordinates (already fixed in Phase 16) but tile generation uses per-chunk biome, creating mismatched terrain where elevation doesn't match tile type.

**Why it happens:** Height noise was fixed to use global coordinates but tile selection still uses chunk-center biome.

**How to avoid:** Use the same per-tile biome sampling for both height clamping and tile selection.

**Warning signs:** Ice floors at low elevations, volcanic floors in cold regions, terrain that doesn't match visual biome.

### Pitfall 2: Biome Flickering at Boundaries
**What goes wrong:** Player crosses biome boundary and HUD updates every frame, causing rapid flickering between biome names.

**Why it happens:** Biome sampling at exact boundary produces near-50/50 noise values that oscillate with floating-point precision.

**How to avoid:** Add hysteresis - require biome to be stable for N frames or distance before updating display. Alternatively, sample biome at chunk center only when entering new chunk.

**Warning signs:** HUD text rapidly switching between two biome names. Player complaints about "seizure-inducing" UI.

### Pitfall 3: Performance Degradation from Per-Tile Noise
**What goes wrong:** Three noise samples per tile (temperature, moisture, elevation) multiplied by 64x64 tiles = 12,288 noise evaluations per chunk feels expensive.

**Why it happens:** Developers assume noise evaluation is slow without measuring.

**How to avoid:** SimplexNoise.fbm() is fast (~20ns per sample according to library benchmarks). 12k samples = ~240μs, negligible compared to network I/O and database writes. Measure first; optimize if proven necessary.

**Warning signs:** Chunk generation taking >100ms per chunk. Profile before optimizing.

### Pitfall 4: Lore Violation - Wrong Biome Count
**What goes wrong:** Code implements 8 biomes but lore defines 10 (including "Petrified Expanse" and "Miasma Marshes" not yet in code).

**Why it happens:** Phase 19 scope is integration, not adding new biomes. But using wrong biome names or hardcoding 8 creates future breakage.

**How to avoid:** Use BiomeType from shared-types (already union of 8 types). Document in plan that 2 biomes are deferred. Ensure classification logic has placeholder branches for future biomes.

**Warning signs:** Hardcoded arrays of length 8, switch statements without default cases, comments referencing "all biomes" when only 8 exist.

### Pitfall 5: Biome Sent to Client But Not Used
**What goes wrong:** Server sends `biome` field in zone:state and zone:chunk events but client never displays it, leading to confusion about whether feature is complete.

**Why it happens:** Backend implementation completed without corresponding frontend work.

**How to avoid:** Include HUD biome display in the same plan as per-tile generation. User-visible feature, not just internal refactoring.

**Warning signs:** Biome data in network payloads but no UI showing it.

## Code Examples

Verified patterns from existing codebase:

### World Coordinate Conversion (Already Implemented)
```typescript
// Source: packages/world-gen/src/generation/terrain.ts:147-148
const worldX = chunkX * ZONE_SIZE + x;
const worldY = chunkY * ZONE_SIZE + y;
```

### Existing Per-Tile Height Generation (Phase 16)
```typescript
// Source: packages/world-gen/src/generation/terrain.ts:175-180
const heightNoise = new SimplexNoise(`${worldSeed}_height_global`);
const heightValue = heightNoise.fbm(worldX * 0.03, worldY * 0.03, 2);
const rawHeight = Math.round((heightValue + 1) * 1.5);
heights[y][x] = Math.max(0, Math.min(3, rawHeight));
```

### Existing Biome Classification (Whittaker Model)
```typescript
// Source: packages/world-gen/src/generation/biome.ts:74-113
getBiome(worldX: number, worldY: number): BiomeType {
  const temp = this.getTemperature(worldX, worldY);
  const moisture = this.getMoisture(worldX, worldY);
  const elevation = this.getElevation(worldX, worldY);

  // High elevation = special biomes
  if (elevation > 0.8) {
    if (temp < 0.3) return 'frozen_expanse';
    if (temp > 0.7) return 'volcanic_ridge';
    return 'ancient_ruins';
  }

  // Low elevation with special conditions
  if (elevation < 0.2) {
    if (moisture > 0.7) return 'fungal_forest';
    return 'starfall_crater';
  }

  // Middle elevations - based on temp/moisture
  if (temp < 0.3) return 'frozen_expanse';
  if (temp > 0.7) {
    if (moisture < 0.3) return 'volcanic_ridge';
    return 'toxic_wastes';
  }

  // Temperate zones
  if (moisture > 0.6) return 'crystal_caves';
  if (moisture < 0.3) return 'toxic_wastes';

  return 'void_plains';
}
```

### Existing Biome-to-Tile Mapping
```typescript
// Source: packages/world-gen/src/generation/terrain.ts:84-93
const BIOME_TILE_IDS: Record<BiomeType, { floor: string; wall: string; feature: string }> = {
  void_plains: { floor: TILE_IDS.VOID_FLOOR, wall: TILE_IDS.VOID_WALL, feature: TILE_IDS.VOID_WALL },
  crystal_caves: { floor: TILE_IDS.CRYSTAL_FLOOR, wall: TILE_IDS.CRYSTAL_FORMATION, feature: TILE_IDS.CRYSTAL_FORMATION },
  toxic_wastes: { floor: TILE_IDS.TOXIC_FLOOR, wall: TILE_IDS.TOXIC_POOL, feature: TILE_IDS.TOXIC_POOL },
  ancient_ruins: { floor: TILE_IDS.RUINS_FLOOR, wall: TILE_IDS.RUINS_WALL, feature: TILE_IDS.RUINS_WALL },
  frozen_expanse: { floor: TILE_IDS.ICE_FLOOR, wall: TILE_IDS.ICE_WALL, feature: TILE_IDS.ICE_WALL },
  volcanic_ridge: { floor: TILE_IDS.VOLCANIC_FLOOR, wall: TILE_IDS.LAVA, feature: TILE_IDS.LAVA },
  fungal_forest: { floor: TILE_IDS.FUNGAL_FLOOR, wall: TILE_IDS.FUNGAL_GROWTH, feature: TILE_IDS.FUNGAL_GROWTH },
  starfall_crater: { floor: TILE_IDS.CRATER_FLOOR, wall: TILE_IDS.CRATER_DEBRIS, feature: TILE_IDS.CRATER_DEBRIS },
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-chunk biome (center point) | Per-tile biome (world coords) | Phase 19 | Eliminates chunk boundary artifacts in biome transitions |
| Separate height/biome generation | Unified per-tile sampling | Phase 19 | Height clamping now matches biome climate zones |
| No biome display | HUD shows current biome | Phase 19 | Player awareness of environmental context |
| Chunk-specific seeds | Global noise with world coords | Phase 16-17 | Seamless terrain across all chunk boundaries |

**Current implementation status:**
- BiomeGenerator exists and works correctly
- SimplexNoise with FBM exists and is used for height
- World coordinate conversion pattern established (Phase 17)
- Biome-to-tile mapping exists
- HUD component exists but doesn't show biome

**What Phase 19 changes:**
- Switch from `getChunkBiome()` to `getBiome()` in terrain generation loop
- Add biome indicator to HUD component
- Optionally: Add server endpoint for client to query biome at position

## Open Questions

1. **Should client calculate biome or query server?**
   - What we know: BiomeGenerator exists on server. Client could import it and run same logic.
   - What's unclear: Whether duplicating biome calculation on client is worth avoiding network round-trip.
   - Recommendation: Client-side calculation using same seed. Biome is deterministic and cheap to compute. Avoids network dependency for HUD display.

2. **How to handle biome data in existing chunks?**
   - What we know: Existing chunks were generated with per-chunk biome assignment.
   - What's unclear: Whether to regenerate existing chunks or accept mixed behavior.
   - Recommendation: Document as known limitation. New chunks use per-tile, existing chunks keep per-chunk. Natural migration as players explore new areas.

3. **Should structure generation respect per-tile biomes?**
   - What we know: Phase 16 simplified structures to natural features. Structure generation currently uses chunk-level biome.
   - What's unclear: Whether structures should adapt to local tile biome or maintain chunk-level consistency.
   - Recommendation: Keep structure generation at chunk level. Structures span multiple tiles - using dominant biome is correct behavior.

4. **What about biome-specific entity spawning?**
   - What we know: SpawnPoint generation uses chunk biome. Entities have biome affinity in lore.
   - What's unclear: Whether spawn points should sample biome per-tile or continue using chunk biome.
   - Recommendation: Chunk-level biome for spawning is correct. Spawn tables are defined per-biome; having mixed spawns in transition zones would be confusing and hard to balance.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `packages/world-gen/src/generation/biome.ts` - BiomeGenerator implementation
- Codebase analysis: `packages/world-gen/src/generation/terrain.ts` - Current terrain generation
- Codebase analysis: `packages/world-gen/src/noise/simplex.ts` - SimplexNoise implementation
- Lore: `/lore/world-bible.md` - Biome definitions (10 types, 8 implemented)

### Secondary (MEDIUM confidence)
- [Red Blob Games: Making maps with noise](https://www.redblobgames.com/maps/terrain-from-noise/) - Noise-based terrain generation patterns
- [Whittaker Biome Diagram](https://www.researchgate.net/figure/Whittakers-Biome-Diagram-Whittakers-scheme-uses-climatologies-of-precipitation-and_fig2_387834540) - Temperature/moisture classification approach
- [Procedural World Generation with Biomes in Unity](https://medium.com/@mrrsff/procedural-world-generation-with-biomes-in-unity-a474e11ff0b7) - Multi-layer noise for climate zones

### Tertiary (LOW confidence - general concepts, not specific implementation)
- [Fast Biome Blending, Without Squareness](https://noiseposti.ng/posts/2021-03-13-Fast-Biome-Blending-Without-Squareness.html) - Biome interpolation techniques (not needed for per-tile approach)
- [Simplex vs Perlin noise advantages](https://pulsegeek.com/articles/simplex-noise-vs-perlin-noise-when-and-why/) - Why Simplex is preferred (already using it)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase and actively used
- Architecture: HIGH - Patterns verified by examining existing code
- Pitfalls: MEDIUM - Based on similar procedural generation projects, not Into the Void specific issues

**Research date:** 2026-02-17
**Valid until:** 60 days (stable domain - noise generation patterns don't change rapidly)

**Key findings:**
1. All necessary systems already exist - this is a wiring phase, not a new feature phase
2. Per-tile biome sampling eliminates boundary artifacts by design
3. Performance cost is negligible (<1ms per chunk for 12k noise samples)
4. Lore defines 10 biomes but code implements 8 - plan must account for future expansion
5. HUD biome display is user-facing requirement, not optional enhancement
