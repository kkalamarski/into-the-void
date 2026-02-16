# Phase 14: Elevation System Core - Research

**Researched:** 2026-02-16
**Domain:** Procedural terrain generation, height fields, isometric depth sorting
**Confidence:** HIGH

## Summary

Phase 14 implements elevation data flow from noise-based generation through server ChunkData to client rendering with composite depth sorting. The existing architecture already has elevation infrastructure in place (TileDefinition.defaultElevation, ChunkData.heights[][], IsometricTransform.calculateDepth). This phase adds noise variation to static defaults and updates depth sorting to incorporate elevation.

**Primary recommendation:** Use Simplex noise (already available) with biome-specific parameters to vary tile heights around their defaultElevation values. Update IsometricTransform.calculateDepth to add elevation as a weighted component: `depth = screenY + (gridX * 0.0001) + (elevation * elevationWeight)`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SimplexNoise | In-repo | Terrain height generation | Already used for biome generation, provides FBM/ridged noise |
| TileRegistry | In-repo | Tile elevation defaults | Phase 13 established defaultElevation per tile type |
| ChunkData.heights[][] | In-repo | Server-to-client elevation data | Phase 13 added parallel array to tiles[][] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| IsometricTransform | In-repo | Depth calculation | Already calculates depth from screenY + gridX tiebreaker |
| DepthSorter | In-repo | Throttled depth updates | Existing system for entity depth recalculation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Simplex FBM | Pure random | Noise creates smooth, realistic terrain; random is harsh/unrealistic |
| Parallel heights[][] | Store in tiles[][] | Parallel array allows 0-5 range independent of tile ID range |
| Composite depth | Separate elevation layer | Composite depth integrates naturally with Phaser's depth system |

**Installation:**
No new dependencies required - all components exist in codebase.

## Architecture Patterns

### Recommended Project Structure
```
packages/world-gen/src/generation/
├── terrain.ts            # Extends generateTerrain to add noise-based heights
├── biome.ts              # BiomeGenerator already has getElevation
└── chunk.ts              # WorldGenerator.generateChunk already flows heights

apps/web/src/game/
├── utils/IsometricTransform.ts    # Extend calculateDepth with elevation param
└── rendering/DepthSorter.ts       # Update to pass elevation to calculateDepth
```

### Pattern 1: Biome-Specific Elevation Ranges
**What:** Each biome has min/max elevation constraints that override tile defaults
**When to use:** In terrain.ts generateTerrain function after noise generation
**Example:**
```typescript
// Source: Existing codebase pattern + research findings
const BIOME_ELEVATION_RANGES: Record<BiomeType, { min: number; max: number }> = {
  starfall_crater: { min: 0, max: 2 },    // Flat, low-lying impact zone
  ancient_ruins: { min: 0, max: 5 },      // Full range - multi-story structures
  volcanic_ridge: { min: 1, max: 4 },     // Elevated terrain, no deep valleys
  frozen_expanse: { min: 2, max: 5 },     // High-altitude ice sheets
  // ...remaining biomes
};

// Apply after noise generation
const biomeRange = BIOME_ELEVATION_RANGES[biome];
const clampedHeight = Math.floor(
  biomeRange.min + noiseValue * (biomeRange.max - biomeRange.min)
);
```

### Pattern 2: Noise-Based Height Variation
**What:** Use Simplex FBM at different frequency/octaves than terrain tiles to create height variation
**When to use:** In terrain.ts after tile type determination but before collision
**Example:**
```typescript
// Source: Red Blob Games terrain-from-noise + existing SimplexNoise usage
const heightNoise = new SimplexNoise(`${worldSeed}_height_${chunkX}_${chunkY}`);

for (let y = 0; y < ZONE_SIZE; y++) {
  for (let x = 0; x < ZONE_SIZE; x++) {
    const worldX = chunkX * ZONE_SIZE + x;
    const worldY = chunkY * ZONE_SIZE + y;

    // Higher frequency noise for local height variation
    const heightValue = heightNoise.fbm(worldX * 0.08, worldY * 0.08, 3);

    // Get tile's default and vary around it
    const tileId = tiles[y][x];
    const tileDef = TileRegistry.get(tileIdToString(tileId));
    const baseHeight = tileDef.defaultElevation;

    // Vary ±1 level from default, clamped to 0-5 and biome range
    const variance = Math.round(heightValue); // -1, 0, or 1
    heights[y][x] = clampToBiomeRange(baseHeight + variance, biome);
  }
}
```

### Pattern 3: Composite Depth Sorting
**What:** Calculate depth as `screenY + gridX_tiebreaker + elevation_component`
**When to use:** In IsometricTransform.calculateDepth and all callers
**Example:**
```typescript
// Source: Phaser isometric examples + existing calculateDepth method
calculateDepth(
  gridX: number,
  gridY: number,
  elevation: number = 0,
  priorityBoost: number = 0
): number {
  const screen = this.gridToScreen(gridX, gridY);
  const elevationWeight = 0.1; // Tunable: how much elevation affects depth

  return screen.y + (gridX * 0.0001) + (elevation * elevationWeight) + priorityBoost;
}
```

### Anti-Patterns to Avoid
- **Don't mix elevation scales**: Heights are 0-5, don't multiply by large constants or convert to pixels
- **Don't ignore biome ranges**: Craters shouldn't have elevation 5 tiles, ruins shouldn't be all flat
- **Don't use elevation for collision**: Use ChunkData.collisions[][] which already exists; elevation is visual only

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth terrain noise | Custom noise algorithm | SimplexNoise.fbm() | Already exists, tested, supports octaves/lacunarity |
| Biome-specific clamps | Per-tile logic | BIOME_ELEVATION_RANGES map | Centralized, maintainable, easy to balance |
| Depth sorting | Manual z-index management | Phaser setDepth() | Phaser handles sorting internally, integrates with scene graph |
| Height data flow | Custom serialization | Existing ChunkData schema | Schema already includes heights[][], just needs population |

**Key insight:** The infrastructure for elevation already exists from Phase 13. Don't rebuild what's there; extend generateTerrain and calculateDepth to utilize existing data structures.

## Common Pitfalls

### Pitfall 1: Elevation Frequency Mismatch
**What goes wrong:** Using same noise frequency for both tile types and heights creates correlation - walls always high, floors always low
**Why it happens:** Reusing terrain noise feels efficient but creates predictable patterns
**How to avoid:** Use separate SimplexNoise instance with different frequency (0.08 vs 0.05 for terrain)
**Warning signs:** All walls have same height, elevation feels "lumpy" matching wall placement

### Pitfall 2: Elevation Weight Too High
**What goes wrong:** Depth sorting breaks - entities "above" on screen render behind ones "below"
**Why it happens:** Elevation component dominates screenY in depth calculation
**How to avoid:** Start with low weight (0.1) and tune empirically; screenY should be primary
**Warning signs:** Entities on high ground render behind low ground, depth sorting looks broken

### Pitfall 3: Ignoring Tile Blocking Status
**What goes wrong:** Height variation makes non-blocking tiles (floors) blocking or vice versa
**Why it happens:** Changing height without considering tile's isBlocking property
**How to avoid:** Height is visual only; collision comes from TileRegistry.get(tileId).isBlocking
**Warning signs:** Movement pathfinding breaks, players stuck on visible floors

### Pitfall 4: Biome Range Violations
**What goes wrong:** Crater tiles at elevation 5, ruins all flat at 0
**Why it happens:** Applying noise before clamping to biome-specific ranges
**How to avoid:** Apply BIOME_ELEVATION_RANGES after noise but before assigning heights[y][x]
**Warning signs:** Visual inconsistency with lore (craters not flat, ruins not varied)

## Code Examples

Verified patterns from existing codebase and research:

### Height Generation with Biome Clamping
```typescript
// Source: packages/world-gen/src/generation/terrain.ts pattern
const BIOME_ELEVATION_RANGES: Record<BiomeType, { min: number; max: number }> = {
  starfall_crater: { min: 0, max: 2 },
  ancient_ruins: { min: 0, max: 5 },
  volcanic_ridge: { min: 1, max: 4 },
  frozen_expanse: { min: 2, max: 5 },
  crystal_caves: { min: 0, max: 4 },
  toxic_wastes: { min: 0, max: 2 },
  fungal_forest: { min: 0, max: 3 },
  void_plains: { min: 0, max: 3 },
};

function clampToBiomeRange(height: number, biome: BiomeType): number {
  const range = BIOME_ELEVATION_RANGES[biome];
  return Math.max(range.min, Math.min(range.max, height));
}

// In generateTerrain, after tile assignment:
const heightNoise = new SimplexNoise(`${worldSeed}_height_${chunkX}_${chunkY}`);

for (let y = 0; y < ZONE_SIZE; y++) {
  for (let x = 0; x < ZONE_SIZE; x++) {
    const worldX = chunkX * ZONE_SIZE + x;
    const worldY = chunkY * ZONE_SIZE + y;

    const tileId = biomeTileIds[tiles[y][x]]; // Get string ID
    const tileDef = TileRegistry.get(tileId);

    // Noise-based variation around default
    const heightValue = heightNoise.fbm(worldX * 0.08, worldY * 0.08, 3);
    const variance = Math.round(heightValue); // -1, 0, or +1
    const rawHeight = tileDef.defaultElevation + variance;

    // Clamp to biome range and 0-5 absolute
    heights[y][x] = clampToBiomeRange(Math.max(0, Math.min(5, rawHeight)), biome);
  }
}
```

### Composite Depth Calculation
```typescript
// Source: apps/web/src/game/utils/IsometricTransform.ts
export class IsometricTransform {
  private elevationWeight = 0.1; // Tunable constant

  calculateDepth(
    gridX: number,
    gridY: number,
    elevation: number = 0,
    priorityBoost: number = 0
  ): number {
    const screen = this.gridToScreen(gridX, gridY);

    // Composite: screenY (primary) + gridX tiebreaker + elevation + priority
    return screen.y + (gridX * 0.0001) + (elevation * this.elevationWeight) + priorityBoost;
  }

  setElevationWeight(weight: number): void {
    this.elevationWeight = weight;
  }
}
```

### Entity Depth Update with Elevation
```typescript
// Source: apps/web/src/game/rendering/EntityRenderer.ts pattern
updateEntityPosition(
  container: Phaser.GameObjects.Container,
  gridX: number,
  gridY: number,
  elevation: number = 0 // NEW: from ChunkData.heights[y][x]
): void {
  const screenPos = this.isoTransform.gridToScreen(gridX, gridY);
  container.setPosition(screenPos.x, screenPos.y);

  container.setData('gridX', gridX);
  container.setData('gridY', gridY);
  container.setData('elevation', elevation); // NEW

  const depth = this.isoTransform.calculateDepth(gridX, gridY, elevation);
  container.setDepth(depth);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static tile elevations | Noise-based variation | Phase 14 | Visual depth, terrain realism |
| Depth = screenY only | Composite depth (screenY + elevation) | Phase 14 | Entities render correctly on slopes |
| Uniform biome heights | Biome-specific ranges | Phase 14 | Lore-consistent (flat craters, varied ruins) |

**Deprecated/outdated:**
- Setting heights to defaultElevation without noise: Phase 13 placeholder, replaced by noise generation
- Ignoring elevation in depth calculation: Phase 14 adds elevation component to calculateDepth

## Open Questions

1. **Elevation weight tuning**
   - What we know: Weight should be small (screenY dominates), likely 0.05-0.2 range
   - What's unclear: Exact value requires visual testing with sprites at different elevations
   - Recommendation: Start with 0.1, expose as tunable constant for iteration

2. **Multi-tile structures and elevation**
   - What we know: ChunkData.structures[] exists for walls/buildings spanning multiple tiles
   - What's unclear: Should structures have uniform elevation or follow underlying terrain?
   - Recommendation: Phase 14 generates simple terrain; Phase 15+ handles structure placement rules

3. **Elevation rendering (visual slopes)**
   - What we know: Elevation affects depth sorting only, not visual appearance yet
   - What's unclear: Future phases may render elevation visually (raised tiles, slopes)
   - Recommendation: Current phase: data flow only; visual elevation is separate feature

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `/packages/world-gen/src/noise/simplex.ts` - SimplexNoise with FBM support
  - `/packages/world-gen/src/generation/terrain.ts` - Current terrain generation
  - `/packages/tiles/src/types.ts` - TileDefinition with defaultElevation
  - `/packages/shared-types/src/core/zone.ts` - ChunkData with heights[][]
  - `/apps/web/src/game/utils/IsometricTransform.ts` - Depth calculation
  - `/lore/world-bible.md` - Biome descriptions (craters flat, ruins varied, etc.)

### Secondary (MEDIUM confidence)
- [Red Blob Games: Making maps with noise](https://www.redblobgames.com/maps/terrain-from-noise/) - Authoritative guide on noise-based terrain
- [Phaser Examples: Isometric Map Depth Sorting](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-map) - Official Phaser depth sorting example
- [Handling Height in Isometric Tile Maps](https://erikonarheim.com/posts/handling-height-in-isometric/) - Height field techniques

### Tertiary (LOW confidence)
- [Procedural 2D Island Generation — Noise Functions](https://medium.com/@travall/procedural-2d-island-generation-noise-functions-13976bddeaf9) - Community implementation (not verified for this codebase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components exist in codebase, verified by reading source
- Architecture: HIGH - Patterns follow existing codebase conventions (SimplexNoise usage, TileRegistry, IsometricTransform)
- Pitfalls: MEDIUM - Elevation weight tuning requires empirical testing; biome ranges are lore-derived

**Research date:** 2026-02-16
**Valid until:** 60 days (stable domain - noise generation and depth sorting are well-established techniques)
