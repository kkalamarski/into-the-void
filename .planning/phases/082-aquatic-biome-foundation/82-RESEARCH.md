# Phase 82: Aquatic Biome Foundation - Research

**Researched:** 2026-02-23
**Domain:** Aquatic biome implementation in 2D isometric procedural MMO
**Confidence:** HIGH

## Summary

Phase 82 adds three aquatic biomes (Tidal Pools Tier I, Kelp Forests Tier II, Deep Trenches Tier III) to the existing procedural generation system. The architecture is fully prepared for this expansion — biomes extend existing type unions, tiles use registry pattern, and spawn configurations follow proven patterns from Phases 19-20 (Miasma Marshes, Petrified Expanse).

**Critical finding from milestone research:** The existing `TileType.blocking` boolean must be extended to support water states. Current collision model cannot represent "traversable but slow" tiles required for shallow water. This is the primary technical challenge.

**Primary recommendation:** Implement water as distinct `TileState` enum ('solid' | 'traversable' | 'shallow_water' | 'deep_water') rather than boolean blocking. Use post-processing on biome maps to enforce minimum contiguous water areas (prevents 1-tile puddle artifacts). Extend fog of war system to support per-biome visibility modifiers.

## Standard Stack

### Core (Already in Place)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Existing BiomeGenerator | Current | Noise-based procedural biome assignment | Proven in 10 biomes, uses domain warping for organic boundaries |
| Existing EntityRegistry | Current | Strategy pattern for entity definitions | Handles 42 entities, designed for extensibility |
| Existing TileRegistry | Current | Registry pattern for tile definitions | Supports per-biome tile sets, hooks for interactions |
| Existing SpawnGenerator | Current | Biome-based spawn point generation | Uses `BIOME_SPAWN_CONFIGS` lookup pattern |
| Existing FogManager | Current | Fog of war reveal and persistence | Uses BFS flood-fill with configurable radius |
| SimplexNoise | Current | Multi-octave noise for terrain | Already used for temperature/moisture/elevation |

### Supporting (No New Dependencies)
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| TileHooks system | Tile interaction effects (onStep) | Optional environmental effects for water hazards |
| Phaser TileSprite | Animated water rendering | Supports water animation without shader complexity |
| Domain warping | Organic biome boundaries | Already in BiomeGenerator, needs shore transition post-processing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TileState enum | Add `isWater: boolean` to TileDefinition | Doesn't scale to future terrain types (lava, acid, ice) |
| Post-processing shore transitions | Generate shore tiles during terrain gen | More complex, harder to debug, couples biome logic to tile selection |
| Per-biome fog radius | Global fog radius with vision debuffs | Doesn't feel different underwater, less immersive |

**Installation:**
No new dependencies required. All implementation uses existing packages.

## Architecture Patterns

### Recommended Project Structure
```
packages/
├── shared-types/src/game/
│   └── biome.ts                    # Add aquatic BiomeType literals
├── tiles/src/definitions/
│   └── aquatic-tiles.ts            # NEW: Water tile definitions
├── world-gen/src/generation/
│   ├── biome.ts                    # Extend getBiome() decision tree
│   ├── terrain.ts                  # Add BIOME_TILES mappings
│   └── spawn.ts                    # Add BIOME_SPAWN_CONFIGS
└── game-logic/src/
    └── movement/                   # MAY NEED: Water state validation
```

### Pattern 1: Biome Type Extension (Proven)
**What:** Add new BiomeType literals to union type
**When to use:** Adding any new biome
**Example:**
```typescript
// packages/shared-types/src/game/biome.ts
export type BiomeType =
  | 'void_plains'
  | 'crystal_caves'
  // ... existing 10 biomes
  | 'tidal_pools'      // NEW: Tier I aquatic
  | 'kelp_forests'     // NEW: Tier II aquatic
  | 'deep_trenches';   // NEW: Tier III aquatic

// Add display names and colors
export const BIOME_DISPLAY_NAMES: Record<BiomeType, string> = {
  // ... existing
  tidal_pools: 'Tidal Pools',
  kelp_forests: 'Kelp Forests',
  deep_trenches: 'Deep Trenches',
};

export const BIOME_COLORS: Record<BiomeType, string> = {
  // ... existing
  tidal_pools: '#5f9ea0',      // Cadet blue
  kelp_forests: '#2e8b57',     // Sea green
  deep_trenches: '#191970',    // Midnight blue
};
```

**Source:** Existing codebase patterns (Phase 19 added miasma_marshes, petrified_expanse same way)

### Pattern 2: TileState Extension (Critical New Pattern)
**What:** Replace `TileDefinition.isBlocking: boolean` with richer state model
**When to use:** Tiles that allow movement with modifiers (water, ice, mud)
**Example:**
```typescript
// packages/tiles/src/types.ts
// BEFORE (current):
export interface TileDefinition {
  readonly isBlocking: boolean;       // Binary: can enter or not
  readonly movementSpeed: number;     // Only applies if isBlocking = false
}

// AFTER (proposed for Phase 82):
export type TileState =
  | 'solid'          // Cannot enter (walls, cliffs)
  | 'traversable'    // Normal movement (floors, ground)
  | 'shallow_water'  // Slow movement, no oxygen penalty
  | 'deep_water';    // Very slow, oxygen required (future: suits)

export interface TileDefinition {
  readonly tileState: TileState;      // Replaces isBlocking
  readonly movementSpeed: number;     // Multiplier when traversable/water
  // ... other properties unchanged
}
```

**Migration path:**
```typescript
// Conversion helper for existing tiles
function legacyBlockingToTileState(blocking: boolean): TileState {
  return blocking ? 'solid' : 'traversable';
}
```

**Source:** Prior milestone research (ARCHITECTURE-BIOME-EXPANSION.md lines 51-78), validated against Subnautica water mechanics (partial traversability)

### Pattern 3: Water Tile Definitions
**What:** Define aquatic tiles with speed modifiers and optional hazards
**When to use:** Creating water terrain for new biomes
**Example:**
```typescript
// packages/tiles/src/definitions/aquatic-tiles.ts
import { TileDefinition } from '../types';

export const TIDAL_SHALLOW_WATER: TileDefinition = {
  id: 'tidal_shallow_water',
  displayName: 'Shallow Water',
  tileState: 'shallow_water',
  movementSpeed: 0.7,           // 30% slower than land
  textureKey: 'tile_tidal_shallow',
  defaultElevation: 0,
  color: 0x5f9ea0,              // Cadet blue
  description: 'Ankle-deep tidal pool water. Safe to traverse.',
};

export const KELP_CORRIDOR: TileDefinition = {
  id: 'kelp_corridor',
  displayName: 'Kelp Corridor',
  tileState: 'shallow_water',
  movementSpeed: 0.6,           // Dense kelp slows movement
  textureKey: 'tile_kelp_corridor',
  defaultElevation: 0,
  color: 0x2e8b57,              // Sea green
  description: 'Navigable passage between dense kelp forests.',
};

export const DEEP_TRENCH_WATER: TileDefinition = {
  id: 'deep_trench_water',
  displayName: 'Deep Water',
  tileState: 'deep_water',
  movementSpeed: 0.5,           // Significantly slower
  textureKey: 'tile_deep_trench',
  defaultElevation: 0,
  color: 0x191970,              // Midnight blue
  description: 'Crushing depths. Extreme pressure hazard.',
  hooks: {
    onStep: (ctx) => {
      // Future: Pressure damage if no specialized suit
      // For Phase 82: Just movement penalty
      return null;
    },
  },
};

export const TIDAL_SHORE: TileDefinition = {
  id: 'tidal_shore',
  displayName: 'Shore',
  tileState: 'traversable',
  movementSpeed: 1.0,           // Normal movement
  textureKey: 'tile_tidal_shore',
  defaultElevation: 0,
  color: 0xf4a460,              // Sandy brown
  description: 'Transition zone between land and water.',
};

export const ALL_AQUATIC_TILES = [
  TIDAL_SHALLOW_WATER,
  KELP_CORRIDOR,
  DEEP_TRENCH_WATER,
  TIDAL_SHORE,
  // Add kelp wall, coral floor, trench edge, etc.
];
```

**Source:** Existing tile definition pattern (void-tiles.ts, toxic-tiles.ts), extended with TileState

### Pattern 4: Biome Decision Tree for Aquatic Zones
**What:** Extend BiomeGenerator.getBiome() with aquatic conditions
**When to use:** Determining where aquatic biomes spawn in world
**Example:**
```typescript
// packages/world-gen/src/generation/biome.ts
getBiome(worldX: number, worldY: number): BiomeType {
  // Apply domain warping for organic boundaries
  const warp = this.getWarpOffset(worldX, worldY);
  const warpedX = worldX + warp.x;
  const warpedY = worldY + warp.y;
  const center = this.getRegionCenter(warpedX, warpedY);

  const temp = this.getTemperature(center.x, center.y);
  const moisture = this.getMoisture(center.x, center.y);
  const elevation = this.getElevation(center.x, center.y);

  // NEW: Very low elevation + high moisture = aquatic biomes
  if (elevation < 0.1) {
    // Tidal Pools: Warm, moderate moisture
    if (temp > 0.5 && moisture > 0.6 && moisture < 0.8) {
      return 'tidal_pools';
    }
    // Kelp Forests: Temperate, high moisture
    if (temp > 0.4 && temp < 0.7 && moisture > 0.75) {
      return 'kelp_forests';
    }
    // Deep Trenches: Cold, very high moisture
    if (temp < 0.4 && moisture > 0.85) {
      return 'deep_trenches';
    }
  }

  // Existing biome logic for elevation > 0.1...
  // (unchanged)
}
```

**Reasoning:** Very low elevation (< 0.1) indicates basins/depressions where water would pool. High moisture reinforces aquatic presence. Temperature differentiates biome tiers (warm = shallow/Tier I, cold = deep/Tier III).

**Source:** Existing biome.ts decision tree (lines 112-168), milestone research guidance

### Pattern 5: Shore Transition Post-Processing
**What:** Generate shore tiles at water/land boundaries to prevent 1-tile artifacts
**When to use:** After biome assignment, before tile selection
**Example:**
```typescript
// packages/world-gen/src/generation/terrain.ts
function generateShoreTransitions(
  biomeMap: BiomeType[][],
  chunkSize: number
): TileId[][] {
  const tileMap: TileId[][] = Array(chunkSize).fill(null).map(() => Array(chunkSize).fill('void_floor'));
  const aquaticBiomes: BiomeType[] = ['tidal_pools', 'kelp_forests', 'deep_trenches'];

  for (let y = 0; y < chunkSize; y++) {
    for (let x = 0; x < chunkSize; x++) {
      const biome = biomeMap[y][x];
      const isWater = aquaticBiomes.includes(biome);

      // Check neighbors
      const neighbors = [
        biomeMap[y-1]?.[x],   // North
        biomeMap[y+1]?.[x],   // South
        biomeMap[y]?.[x-1],   // West
        biomeMap[y]?.[x+1],   // East
      ];

      const hasLandNeighbor = neighbors.some(n => n && !aquaticBiomes.includes(n));

      // Water tile adjacent to land = shore tile
      if (isWater && hasLandNeighbor) {
        tileMap[y][x] = 'tidal_shore'; // Or biome-specific shore tile
      } else {
        // Use standard biome tile mapping
        tileMap[y][x] = BIOME_TILES[biome][/* noise-based selection */];
      }
    }
  }

  return tileMap;
}
```

**Why necessary:** Domain warping creates organic boundaries but can produce single-tile water/land pixels. Shore tiles ensure smooth transitions and prevent "puddle" artifacts.

**Source:** Prior research PITFALLS.md lines 89-150 (Biome Transition Artifacts)

### Pattern 6: Per-Biome Fog of War Radius
**What:** Extend FogManager to support biome-specific visibility modifiers
**When to use:** Creating immersive underwater experience with reduced vision
**Example:**
```typescript
// apps/web/src/game/fog/FogManager.ts
export class FogManager {
  private revealRadius: number;
  private biomeModifiers: Record<BiomeType, number> = {
    void_plains: 1.0,
    // ... existing biomes at 1.0
    tidal_pools: 0.85,       // 15% reduced vision (murky water)
    kelp_forests: 0.7,       // 30% reduced (dense kelp)
    deep_trenches: 0.6,      // 40% reduced (darkness)
  };

  constructor(characterId: string, baseRevealRadius: number = 8) {
    this.characterId = characterId;
    this.revealRadius = baseRevealRadius;
    // ...
  }

  /**
   * Reveal tiles with biome-aware radius
   */
  revealAtPosition(worldX: number, worldY: number, biome: BiomeType): Set<string> {
    const modifier = this.biomeModifiers[biome] ?? 1.0;
    const effectiveRadius = Math.floor(this.revealRadius * modifier);

    // Existing BFS logic with effectiveRadius instead of this.revealRadius
    const queue: QueueItem[] = [{ x: worldX, y: worldY, dist: 0 }];
    const visited = new Set<string>();
    const newlyRevealed = new Set<string>();

    while (queue.length > 0) {
      const item = queue.shift()!;
      const { x, y, dist } = item;
      const key = `${x},${y}`;

      if (visited.has(key) || dist > effectiveRadius) {
        continue;
      }

      // ... existing reveal logic
    }

    return newlyRevealed;
  }
}
```

**Integration point:** WorldScene must pass current biome to FogManager.revealAtPosition() based on player position.

**Source:** Existing FogManager implementation (apps/web/src/game/fog/FogManager.ts), extended with biome awareness

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shore tile generation | Manual neighbor checking with hardcoded rules | Post-processing pass with configurable edge detection | Edge cases (diagonal neighbors, multi-biome borders) are complex; reusable system prevents bugs |
| Water animation | Custom frame-by-frame sprite animation | Phaser TileSprite with tilePositionX offset | Phaser handles animation smoothly, GPU-accelerated, no manual frame management |
| Biome-based spawn filtering | if/else chains in spawn generation | BIOME_SPAWN_CONFIGS lookup with array filtering | Existing pattern proven for 10 biomes; scales to 15+ biomes without complexity growth |
| Minimum contiguous area enforcement | Recursive flood-fill during generation | Post-processing with iterative flood-fill and replacement | Recursive approaches stack overflow on large contiguous regions; iterative is safer |
| Fog of war radius calculation | Distance checks per tile | BFS with radius-based termination (existing) | BFS naturally handles irregular reveal shapes; per-tile distance is O(n²) |

**Key insight:** The existing architecture anticipated content expansion. Do not reinvent patterns that already work (entity registry, tile registry, spawn configs, fog of war). Only extend where necessary (TileState, shore transitions, biome modifiers).

## Common Pitfalls

### Pitfall 1: TileState as Boolean Extension
**What goes wrong:** Adding `isWater: boolean` to TileDefinition instead of replacing `isBlocking` with TileState enum.
**Why it happens:** Seems like smaller change, preserves backward compatibility.
**How to avoid:** Bite the bullet and migrate all tile definitions to TileState. Future terrain types (lava, ice, mud) will need the same extension. Do it once.
**Warning signs:**
- Multiple boolean flags on TileDefinition (isWater, isLava, isIce)
- Collision checks with nested if statements
- Movement validation code with 5+ branches

**Migration strategy:**
```typescript
// 1. Add TileState alongside isBlocking (both exist temporarily)
// 2. Migrate all tile definitions to use tileState
// 3. Update collision/movement validation to use tileState
// 4. Remove isBlocking (TypeScript will catch all usages)
// 5. Verify pathfinding and movement tests pass
```

### Pitfall 2: Ignoring 1-Tile Water Artifacts
**What goes wrong:** Domain warping produces isolated single-tile water pixels that spawn aquatic creatures in impossible locations (fish in 1-tile puddles in desert).
**Why it happens:** BiomeGenerator assigns biomes per-tile based on noise. Some noise combinations produce tiny isolated regions.
**How to avoid:** Post-process biome maps to enforce minimum contiguous area (e.g., 16 tiles minimum for water biomes).
**Warning signs:**
- Players report fish spawning in impossible locations
- Visual "pixel noise" at biome boundaries
- Shore tiles surrounded entirely by water or entirely by land

**Detection code:**
```typescript
// After biome generation, before spawn generation
function detectIsolatedWater(biomeMap: BiomeType[][]): number {
  let isolated = 0;
  const aquatic = ['tidal_pools', 'kelp_forests', 'deep_trenches'];

  for (let y = 0; y < biomeMap.length; y++) {
    for (let x = 0; x < biomeMap[y].length; x++) {
      if (!aquatic.includes(biomeMap[y][x])) continue;

      const neighbors = [
        biomeMap[y-1]?.[x],
        biomeMap[y+1]?.[x],
        biomeMap[y]?.[x-1],
        biomeMap[y]?.[x+1],
      ];

      const waterNeighbors = neighbors.filter(n => aquatic.includes(n)).length;
      if (waterNeighbors === 0) isolated++;
    }
  }

  return isolated;
}
```

### Pitfall 3: Fog of War Doesn't Update with Biome Changes
**What goes wrong:** Player moves from land to water, but fog reveal radius doesn't change because WorldScene isn't passing biome to FogManager.
**Why it happens:** FogManager was designed before per-biome modifiers existed.
**How to avoid:** Update WorldScene.updateFogOfWar() to pass current biome based on player position.
**Warning signs:**
- Fog radius feels the same in all biomes
- Players report being able to see as far underwater as on land

**Fix:**
```typescript
// apps/web/src/game/scenes/WorldScene.ts
updateFogOfWar() {
  const { x, y } = this.playerEntity.position;
  const biome = this.getBiomeAt(x, y); // NEW: Lookup biome at player position
  const newlyRevealed = this.fogManager.revealAtPosition(x, y, biome);
  // ...
}

getBiomeAt(worldX: number, worldY: number): BiomeType {
  const chunkX = Math.floor(worldX / ZONE_SIZE);
  const chunkY = Math.floor(worldY / ZONE_SIZE);
  const chunk = this.chunkCache.get(`${chunkX},${chunkY}`);
  return chunk?.biome ?? 'void_plains'; // Fallback
}
```

### Pitfall 4: Deep Water Blocks Pathfinding Without Feedback
**What goes wrong:** Players click on land beyond deep water. Pathfinding treats deep_water as blocking (requires diving equipment), finds no path, and player doesn't move. No error message shown.
**Why it happens:** Pathfinding treats all non-traversable tiles as impassable. Deep water requires equipment check, but PathfindingController doesn't know about equipment.
**How to avoid:**
- Option A: Deep water is traversable but very slow (0.3x speed). Players CAN cross but it's inefficient. (Recommended for Phase 82)
- Option B: Add equipment-aware pathfinding (check for aquatic suit). (Defer to Phase 83+)
**Warning signs:**
- Players report "stuck" on one side of water
- Pathfinding silently fails without UI feedback
- Click-to-move doesn't work near aquatic biomes

**Phase 82 approach:**
```typescript
// Make all water traversable, use speed modifiers as deterrent
export const DEEP_TRENCH_WATER: TileDefinition = {
  // ...
  tileState: 'deep_water',
  movementSpeed: 0.3,  // Very slow but not blocking
};

// Future (Phase 83+): Add pressure damage via tile hooks
// Players can cross but take damage without proper suit
```

### Pitfall 5: Spawn Density Not Adjusted for Aquatic Biomes
**What goes wrong:** Aquatic biomes use same spawn density as terrestrial biomes. Oceans feel empty because creatures are spread out at land-biome density.
**Why it happens:** BIOME_SPAWN_CONFIGS copied from existing biomes without adjustment.
**How to avoid:** Aquatic biomes should have higher creature density (ocean life is denser than terrestrial).
**Warning signs:**
- Players report aquatic zones feeling "dead" or "boring"
- Long gaps between creature encounters underwater
- Comparing fish count to creature count in similar-tier land biomes shows imbalance

**Recommended values:**
```typescript
const BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig> = {
  // Terrestrial baseline
  void_plains: {
    creatureDensity: 3,
    mineralDensity: 2,
    // ...
  },

  // Aquatic: 50% higher density
  tidal_pools: {
    creatureDensity: 5,   // vs 3 for land
    mineralDensity: 3,    // vs 2 for land
    // ...
  },
};
```

## Code Examples

Verified patterns from existing codebase:

### Biome Type Extension
```typescript
// Source: packages/shared-types/src/game/biome.ts
export type BiomeType =
  | 'void_plains'
  | 'crystal_caves'
  | 'toxic_wastes'
  | 'ancient_ruins'
  | 'frozen_expanse'
  | 'volcanic_ridge'
  | 'fungal_forest'
  | 'starfall_crater'
  | 'miasma_marshes'
  | 'petrified_expanse'
  // NEW for Phase 82:
  | 'tidal_pools'
  | 'kelp_forests'
  | 'deep_trenches';
```

### Tile Registration
```typescript
// Source: packages/tiles/src/index.ts (extended)
import { ALL_AQUATIC_TILES } from './definitions/aquatic-tiles';

export class TileRegistry {
  private static tiles = new Map<string, TileDefinition>();

  static initialize() {
    // Existing tiles
    for (const tile of ALL_VOID_TILES) this.register(tile);
    for (const tile of ALL_CRYSTAL_TILES) this.register(tile);
    // ... other biomes

    // NEW: Aquatic tiles
    for (const tile of ALL_AQUATIC_TILES) this.register(tile);
  }
}
```

### Spawn Configuration
```typescript
// Source: packages/world-gen/src/generation/spawn.ts (extended)
const BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig> = {
  // ... existing configs

  tidal_pools: {
    creatures: [
      // Phase 83 will populate with aquatic creature IDs
      // { id: 'creature_tidal_crab', weight: 10, minLevel: 1, maxLevel: 8 },
    ],
    minerals: [
      // { id: 'mineral_tidal_salt', weight: 8, rarity: 1 },
    ],
    plants: [
      // { id: 'plant_shallow_kelp', weight: 12, rarity: 1 },
    ],
    creatureDensity: 5,
    mineralDensity: 3,
    plantDensity: 6,
  },

  kelp_forests: {
    creatures: [],
    minerals: [],
    plants: [],
    creatureDensity: 6,   // Dense kelp = more creatures
    mineralDensity: 2,
    plantDensity: 10,     // Very high plant density
  },

  deep_trenches: {
    creatures: [],
    minerals: [],
    plants: [],
    creatureDensity: 4,
    mineralDensity: 5,    // Deep minerals more common
    plantDensity: 2,      // Fewer plants in darkness
  },
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Binary collision (blocking: true/false) | TileState enum (solid/traversable/water types) | Phase 82 | Enables terrain with movement modifiers (water, future ice/mud) |
| Global fog radius | Per-biome fog modifiers | Phase 82 | Aquatic zones feel distinct (reduced visibility) |
| Noise-only biome boundaries | Domain warping + post-processing | Phase 19-20 | Prevents 1-tile biome artifacts, now extended for shore transitions |
| Manual tile selection | Registry pattern with BIOME_TILES lookup | Phase 13 | Scales to any number of biomes without code changes |

**Deprecated/outdated:**
- `TileType.blocking: boolean` — Will be replaced by `TileDefinition.tileState: TileState` in Phase 82
- Global fog radius without biome awareness — FogManager.revealAtPosition() will accept biome parameter

## Open Questions

1. **Should deep water block movement entirely or just slow it severely?**
   - What we know: Lore mentions "Coastal Shallows" as Tier I (accessible). Deep Trenches are Tier III (dangerous).
   - What's unclear: Does Tier III mean "requires equipment" (blocking) or "very dangerous but traversable" (slow + damage)?
   - Recommendation: Make deep water traversable but very slow (0.3x) for Phase 82. Add pressure damage via tile hooks in Phase 83 when aquatic suits exist.

2. **How should kelp forests restrict movement?**
   - What we know: Phase description says "limited pathfinding corridors" suggesting kelp blocks some tiles.
   - What's unclear: Fixed corridors during generation, or dynamic pathfinding preference?
   - Recommendation: Generate kelp forests with pre-defined corridor tiles (movementSpeed 0.6) and kelp wall tiles (blocking). Use noise to create organic corridor shapes.

3. **Should fog of war radius change be immediate or gradual?**
   - What we know: Players move between biomes frequently (no loading screens).
   - What's unclear: Instant radius change vs smooth transition feels better?
   - Recommendation: Instant change on biome transition. Smooth transitions require per-frame interpolation (complexity not justified).

4. **Are shore tiles biome-specific or shared?**
   - What we know: Tidal pools, kelp forests, deep trenches may have different shore visuals.
   - What's unclear: Single shore tile or three variants?
   - Recommendation: Single shared shore tile (`tidal_shore`) for Phase 82. Add biome-specific variants in Phase 83+ if visuals need distinction.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis:
  - `/packages/shared-types/src/game/biome.ts` - BiomeType union, 10 existing biomes
  - `/packages/world-gen/src/generation/biome.ts` - BiomeGenerator with domain warping
  - `/packages/tiles/src/types.ts` - TileDefinition interface
  - `/apps/web/src/game/fog/FogManager.ts` - Fog of war BFS implementation
- `.planning/research/ARCHITECTURE-BIOME-EXPANSION.md` - Milestone research (2026-02-23)
- `.planning/research/PITFALLS.md` - Biome expansion pitfalls (2026-02-23)

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` - Aquatic biome expected features from genre research
- Lore constraints: `lore/world-bible.md` lines 165-185 (Coastal Shallows Tier I biome, dual moons creating complex tidal patterns)

### Tertiary (LOW confidence)
- Prior phase research mentions (Phase 19-20 added Miasma Marshes and Petrified Expanse using same patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already exist, zero new dependencies verified
- Architecture: HIGH - Patterns proven in existing biomes (miasma, petrified), direct code inspection confirms extensibility
- Pitfalls: HIGH - Prior milestone research identified TileState extension as critical (PITFALLS.md lines 26-86)

**Research date:** 2026-02-23
**Valid until:** ~60 days (stable system, slow-moving architecture)

**Key validation points:**
- TileDefinition.isBlocking is indeed boolean (confirmed: tiles/src/types.ts line 13)
- BiomeGenerator uses domain warping (confirmed: world-gen/src/generation/biome.ts lines 82-106)
- FogManager uses BFS with configurable radius (confirmed: apps/web/src/game/fog/FogManager.ts lines 42-90)
- Existing biomes added via union type extension (confirmed: miasma_marshes, petrified_expanse in biome.ts lines 13-14)
