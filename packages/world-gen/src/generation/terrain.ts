import { BiomeType, ZONE_SIZE } from '@into-the-void/shared-types';
import { TileRegistry, TILE_IDS, BIOME_LIQUID_MAP } from '@into-the-void/tiles';
import { SimplexNoise } from '../noise/simplex';
import { SeededRandom } from '../random/seeded-random';
import { BiomeGenerator } from './biome';

/**
 * Tile types for terrain
 * @deprecated Use TILE_IDS from @into-the-void/tiles instead
 */
export enum TileId {
  VOID_FLOOR = 0,
  VOID_WALL = 1,
  CRYSTAL_FLOOR = 2,
  CRYSTAL_FORMATION = 3,
  TOXIC_FLOOR = 4,
  TOXIC_POOL = 5,
  RUINS_FLOOR = 6,
  RUINS_WALL = 7,
  ICE_FLOOR = 8,
  ICE_WALL = 9,
  VOLCANIC_FLOOR = 10,
  LAVA = 11,
  FUNGAL_FLOOR = 12,
  FUNGAL_GROWTH = 13,
  CRATER_FLOOR = 14,
  CRATER_DEBRIS = 15,
  PORTAL = 16,
  TIDAL_FLOOR = 17,
  TIDAL_SHALLOW = 18,
  KELP_FLOOR = 19,
  KELP_WALL = 20,
  TRENCH_FLOOR = 21,
  TRENCH_DEEP = 22,
  SHORE_TRANSITION = 23,
  VOID_RIFT_FLOOR = 24,
  VOID_RIFT_DISTORTION = 25,
  CRYSTALLINE_FLOOR = 26,
  CRYSTAL_FORMATION_LARGE = 27,
  BIOLUMINESCENT_FLOOR = 28,
  BIOLUMINESCENT_FLORA = 29,
  // Hub Stations — Canopy (Verdant)
  CANOPY_FLOOR = 30,
  CANOPY_WALL = 31,
  CANOPY_DOOR = 32,
  CANOPY_CORRIDOR = 33,
  CANOPY_DECORATION = 34,
  CANOPY_ACCENT = 35,
  CANOPY_WINDOW = 36,
  CANOPY_HAZARD = 37,
  // Hub Stations — Ironhold (Helix)
  IRONHOLD_FLOOR = 38,
  IRONHOLD_WALL = 39,
  IRONHOLD_DOOR = 40,
  IRONHOLD_CORRIDOR = 41,
  IRONHOLD_DECORATION = 42,
  IRONHOLD_ACCENT = 43,
  IRONHOLD_WINDOW = 44,
  IRONHOLD_HAZARD = 45,
  // Hub Stations — Meridian (Nexus)
  MERIDIAN_FLOOR = 46,
  MERIDIAN_WALL = 47,
  MERIDIAN_DOOR = 48,
  MERIDIAN_CORRIDOR = 49,
  MERIDIAN_DECORATION = 50,
  MERIDIAN_ACCENT = 51,
  MERIDIAN_WINDOW = 52,
  MERIDIAN_HAZARD = 53,
  // Hub Stations — Salvage (Unaffiliated)
  SALVAGE_FLOOR = 54,
  SALVAGE_WALL = 55,
  SALVAGE_DOOR = 56,
  SALVAGE_CORRIDOR = 57,
  SALVAGE_DECORATION = 58,
  SALVAGE_ACCENT = 59,
  SALVAGE_WINDOW = 60,
  SALVAGE_HAZARD = 61,
}

/**
 * Convert numeric TileId to string tile ID
 * Used for migration from enum-based to string-based tile system
 */
export function tileIdToString(id: TileId): string {
  const mapping: Record<TileId, string> = {
    [TileId.VOID_FLOOR]: TILE_IDS.VOID_FLOOR,
    [TileId.VOID_WALL]: TILE_IDS.VOID_WALL,
    [TileId.CRYSTAL_FLOOR]: TILE_IDS.CRYSTAL_FLOOR,
    [TileId.CRYSTAL_FORMATION]: TILE_IDS.CRYSTAL_FORMATION,
    [TileId.TOXIC_FLOOR]: TILE_IDS.TOXIC_FLOOR,
    [TileId.TOXIC_POOL]: TILE_IDS.TOXIC_POOL,
    [TileId.RUINS_FLOOR]: TILE_IDS.RUINS_FLOOR,
    [TileId.RUINS_WALL]: TILE_IDS.RUINS_WALL,
    [TileId.ICE_FLOOR]: TILE_IDS.ICE_FLOOR,
    [TileId.ICE_WALL]: TILE_IDS.ICE_WALL,
    [TileId.VOLCANIC_FLOOR]: TILE_IDS.VOLCANIC_FLOOR,
    [TileId.LAVA]: TILE_IDS.LAVA,
    [TileId.FUNGAL_FLOOR]: TILE_IDS.FUNGAL_FLOOR,
    [TileId.FUNGAL_GROWTH]: TILE_IDS.FUNGAL_GROWTH,
    [TileId.CRATER_FLOOR]: TILE_IDS.CRATER_FLOOR,
    [TileId.CRATER_DEBRIS]: TILE_IDS.CRATER_DEBRIS,
    [TileId.PORTAL]: TILE_IDS.PORTAL,
    [TileId.TIDAL_FLOOR]: TILE_IDS.TIDAL_FLOOR,
    [TileId.TIDAL_SHALLOW]: TILE_IDS.TIDAL_SHALLOW,
    [TileId.KELP_FLOOR]: TILE_IDS.KELP_FLOOR,
    [TileId.KELP_WALL]: TILE_IDS.KELP_WALL,
    [TileId.TRENCH_FLOOR]: TILE_IDS.TRENCH_FLOOR,
    [TileId.TRENCH_DEEP]: TILE_IDS.TRENCH_DEEP,
    [TileId.SHORE_TRANSITION]: TILE_IDS.SHORE_TRANSITION,
    [TileId.VOID_RIFT_FLOOR]: TILE_IDS.VOID_RIFT_FLOOR,
    [TileId.VOID_RIFT_DISTORTION]: TILE_IDS.VOID_RIFT_DISTORTION,
    [TileId.CRYSTALLINE_FLOOR]: TILE_IDS.CRYSTALLINE_FLOOR,
    [TileId.CRYSTAL_FORMATION_LARGE]: TILE_IDS.CRYSTAL_FORMATION_LARGE,
    [TileId.BIOLUMINESCENT_FLOOR]: TILE_IDS.BIOLUMINESCENT_FLOOR,
    [TileId.BIOLUMINESCENT_FLORA]: TILE_IDS.BIOLUMINESCENT_FLORA,
    // Hub Stations — Canopy (Verdant)
    [TileId.CANOPY_FLOOR]: TILE_IDS.CANOPY_FLOOR,
    [TileId.CANOPY_WALL]: TILE_IDS.CANOPY_WALL,
    [TileId.CANOPY_DOOR]: TILE_IDS.CANOPY_DOOR,
    [TileId.CANOPY_CORRIDOR]: TILE_IDS.CANOPY_CORRIDOR,
    [TileId.CANOPY_DECORATION]: TILE_IDS.CANOPY_DECORATION,
    [TileId.CANOPY_ACCENT]: TILE_IDS.CANOPY_ACCENT,
    [TileId.CANOPY_WINDOW]: TILE_IDS.CANOPY_WINDOW,
    [TileId.CANOPY_HAZARD]: TILE_IDS.CANOPY_HAZARD,
    // Hub Stations — Ironhold (Helix)
    [TileId.IRONHOLD_FLOOR]: TILE_IDS.IRONHOLD_FLOOR,
    [TileId.IRONHOLD_WALL]: TILE_IDS.IRONHOLD_WALL,
    [TileId.IRONHOLD_DOOR]: TILE_IDS.IRONHOLD_DOOR,
    [TileId.IRONHOLD_CORRIDOR]: TILE_IDS.IRONHOLD_CORRIDOR,
    [TileId.IRONHOLD_DECORATION]: TILE_IDS.IRONHOLD_DECORATION,
    [TileId.IRONHOLD_ACCENT]: TILE_IDS.IRONHOLD_ACCENT,
    [TileId.IRONHOLD_WINDOW]: TILE_IDS.IRONHOLD_WINDOW,
    [TileId.IRONHOLD_HAZARD]: TILE_IDS.IRONHOLD_HAZARD,
    // Hub Stations — Meridian (Nexus)
    [TileId.MERIDIAN_FLOOR]: TILE_IDS.MERIDIAN_FLOOR,
    [TileId.MERIDIAN_WALL]: TILE_IDS.MERIDIAN_WALL,
    [TileId.MERIDIAN_DOOR]: TILE_IDS.MERIDIAN_DOOR,
    [TileId.MERIDIAN_CORRIDOR]: TILE_IDS.MERIDIAN_CORRIDOR,
    [TileId.MERIDIAN_DECORATION]: TILE_IDS.MERIDIAN_DECORATION,
    [TileId.MERIDIAN_ACCENT]: TILE_IDS.MERIDIAN_ACCENT,
    [TileId.MERIDIAN_WINDOW]: TILE_IDS.MERIDIAN_WINDOW,
    [TileId.MERIDIAN_HAZARD]: TILE_IDS.MERIDIAN_HAZARD,
    // Hub Stations — Salvage (Unaffiliated)
    [TileId.SALVAGE_FLOOR]: TILE_IDS.SALVAGE_FLOOR,
    [TileId.SALVAGE_WALL]: TILE_IDS.SALVAGE_WALL,
    [TileId.SALVAGE_DOOR]: TILE_IDS.SALVAGE_DOOR,
    [TileId.SALVAGE_CORRIDOR]: TILE_IDS.SALVAGE_CORRIDOR,
    [TileId.SALVAGE_DECORATION]: TILE_IDS.SALVAGE_DECORATION,
    [TileId.SALVAGE_ACCENT]: TILE_IDS.SALVAGE_ACCENT,
    [TileId.SALVAGE_WINDOW]: TILE_IDS.SALVAGE_WINDOW,
    [TileId.SALVAGE_HAZARD]: TILE_IDS.SALVAGE_HAZARD,
  };
  return mapping[id] ?? TILE_IDS.VOID_FLOOR;
}

/**
 * Biome to tile mapping
 */
const BIOME_TILES: Record<BiomeType, { floor: TileId; wall: TileId; feature: TileId }> = {
  void_plains: { floor: TileId.VOID_FLOOR, wall: TileId.VOID_WALL, feature: TileId.VOID_WALL },
  crystal_caves: {
    floor: TileId.CRYSTAL_FLOOR,
    wall: TileId.CRYSTAL_FORMATION,
    feature: TileId.CRYSTAL_FORMATION,
  },
  toxic_wastes: { floor: TileId.TOXIC_FLOOR, wall: TileId.TOXIC_POOL, feature: TileId.TOXIC_POOL },
  ancient_ruins: { floor: TileId.RUINS_FLOOR, wall: TileId.RUINS_WALL, feature: TileId.RUINS_WALL },
  frozen_expanse: { floor: TileId.ICE_FLOOR, wall: TileId.ICE_WALL, feature: TileId.ICE_WALL },
  volcanic_ridge: { floor: TileId.VOLCANIC_FLOOR, wall: TileId.LAVA, feature: TileId.LAVA },
  fungal_forest: {
    floor: TileId.FUNGAL_FLOOR,
    wall: TileId.FUNGAL_GROWTH,
    feature: TileId.FUNGAL_GROWTH,
  },
  starfall_crater: {
    floor: TileId.CRATER_FLOOR,
    wall: TileId.CRATER_DEBRIS,
    feature: TileId.CRATER_DEBRIS,
  },
  miasma_marshes: { floor: TileId.FUNGAL_FLOOR, wall: TileId.TOXIC_POOL, feature: TileId.TOXIC_POOL },
  petrified_expanse: { floor: TileId.VOID_FLOOR, wall: TileId.VOID_WALL, feature: TileId.VOID_WALL },
  tidal_pools: { floor: TileId.TIDAL_FLOOR, wall: TileId.TIDAL_SHALLOW, feature: TileId.TIDAL_SHALLOW },
  kelp_forests: { floor: TileId.KELP_FLOOR, wall: TileId.KELP_WALL, feature: TileId.KELP_WALL },
  deep_trenches: { floor: TileId.TRENCH_FLOOR, wall: TileId.TRENCH_DEEP, feature: TileId.TRENCH_DEEP },
  void_rift: { floor: TileId.VOID_RIFT_FLOOR, wall: TileId.VOID_RIFT_DISTORTION, feature: TileId.VOID_RIFT_DISTORTION },
  crystalline_wastes: { floor: TileId.CRYSTALLINE_FLOOR, wall: TileId.CRYSTAL_FORMATION_LARGE, feature: TileId.CRYSTAL_FORMATION_LARGE },
  bioluminescent_depths: { floor: TileId.BIOLUMINESCENT_FLOOR, wall: TileId.BIOLUMINESCENT_FLORA, feature: TileId.BIOLUMINESCENT_FLORA },
  // Hub Station Biomes — faction-specific tile types
  canopy_station: { floor: TileId.CANOPY_FLOOR, wall: TileId.CANOPY_WALL, feature: TileId.CANOPY_DECORATION },
  ironhold_station: { floor: TileId.IRONHOLD_FLOOR, wall: TileId.IRONHOLD_WALL, feature: TileId.IRONHOLD_DECORATION },
  meridian_station: { floor: TileId.MERIDIAN_FLOOR, wall: TileId.MERIDIAN_WALL, feature: TileId.MERIDIAN_DECORATION },
  salvage_station: { floor: TileId.SALVAGE_FLOOR, wall: TileId.SALVAGE_WALL, feature: TileId.SALVAGE_DECORATION },
};

/**
 * Biome to tile mapping (string IDs)
 */
const BIOME_TILE_IDS: Record<BiomeType, { floor: string; wall: string; feature: string }> = {
  void_plains: { floor: TILE_IDS.VOID_FLOOR, wall: TILE_IDS.VOID_WALL, feature: TILE_IDS.VOID_WALL },
  crystal_caves: { floor: TILE_IDS.CRYSTAL_FLOOR, wall: TILE_IDS.CRYSTAL_FORMATION, feature: TILE_IDS.CRYSTAL_FORMATION },
  toxic_wastes: { floor: TILE_IDS.TOXIC_FLOOR, wall: TILE_IDS.TOXIC_POOL, feature: TILE_IDS.TOXIC_POOL },
  ancient_ruins: { floor: TILE_IDS.RUINS_FLOOR, wall: TILE_IDS.RUINS_WALL, feature: TILE_IDS.RUINS_WALL },
  frozen_expanse: { floor: TILE_IDS.ICE_FLOOR, wall: TILE_IDS.ICE_WALL, feature: TILE_IDS.ICE_WALL },
  volcanic_ridge: { floor: TILE_IDS.VOLCANIC_FLOOR, wall: TILE_IDS.LAVA, feature: TILE_IDS.LAVA },
  fungal_forest: { floor: TILE_IDS.FUNGAL_FLOOR, wall: TILE_IDS.FUNGAL_GROWTH, feature: TILE_IDS.FUNGAL_GROWTH },
  starfall_crater: { floor: TILE_IDS.CRATER_FLOOR, wall: TILE_IDS.CRATER_DEBRIS, feature: TILE_IDS.CRATER_DEBRIS },
  miasma_marshes: { floor: TILE_IDS.FUNGAL_FLOOR, wall: TILE_IDS.TOXIC_POOL, feature: TILE_IDS.TOXIC_POOL },
  petrified_expanse: { floor: TILE_IDS.VOID_FLOOR, wall: TILE_IDS.VOID_WALL, feature: TILE_IDS.VOID_WALL },
  tidal_pools: { floor: TILE_IDS.TIDAL_FLOOR, wall: TILE_IDS.TIDAL_SHALLOW, feature: TILE_IDS.TIDAL_SHALLOW },
  kelp_forests: { floor: TILE_IDS.KELP_FLOOR, wall: TILE_IDS.KELP_WALL, feature: TILE_IDS.KELP_WALL },
  deep_trenches: { floor: TILE_IDS.TRENCH_FLOOR, wall: TILE_IDS.TRENCH_DEEP, feature: TILE_IDS.TRENCH_DEEP },
  void_rift: { floor: TILE_IDS.VOID_RIFT_FLOOR, wall: TILE_IDS.VOID_RIFT_DISTORTION, feature: TILE_IDS.VOID_RIFT_DISTORTION },
  crystalline_wastes: { floor: TILE_IDS.CRYSTALLINE_FLOOR, wall: TILE_IDS.CRYSTAL_FORMATION_LARGE, feature: TILE_IDS.CRYSTAL_FORMATION_LARGE },
  bioluminescent_depths: { floor: TILE_IDS.BIOLUMINESCENT_FLOOR, wall: TILE_IDS.BIOLUMINESCENT_FLORA, feature: TILE_IDS.BIOLUMINESCENT_FLORA },
  // Hub Station Biomes
  canopy_station: { floor: TILE_IDS.CANOPY_FLOOR, wall: TILE_IDS.CANOPY_WALL, feature: TILE_IDS.CANOPY_DECORATION },
  ironhold_station: { floor: TILE_IDS.IRONHOLD_FLOOR, wall: TILE_IDS.IRONHOLD_WALL, feature: TILE_IDS.IRONHOLD_DECORATION },
  meridian_station: { floor: TILE_IDS.MERIDIAN_FLOOR, wall: TILE_IDS.MERIDIAN_WALL, feature: TILE_IDS.MERIDIAN_DECORATION },
  salvage_station: { floor: TILE_IDS.SALVAGE_FLOOR, wall: TILE_IDS.SALVAGE_WALL, feature: TILE_IDS.SALVAGE_DECORATION },
};

/**
 * Biome-specific elevation ranges
 * Heights are clamped to these ranges to maintain biome characteristics
 */
const BIOME_ELEVATION_RANGES: Record<BiomeType, { min: number; max: number }> = {
  starfall_crater: { min: -1, max: 2 }, // Impact zone with liquid-filled craters
  ancient_ruins: { min: -1, max: 5 }, // Flooded lower ruins
  volcanic_ridge: { min: 0, max: 4 }, // Lava pools at base level
  frozen_expanse: { min: 0, max: 5 }, // Glacial melt pools
  crystal_caves: { min: -1, max: 4 }, // Resonant fluid pools in caverns
  toxic_wastes: { min: -1, max: 2 }, // Toxic sludge pools
  fungal_forest: { min: -1, max: 3 }, // Spore sludge in hollows
  void_plains: { min: -1, max: 3 }, // Void ether pools
  miasma_marshes: { min: -1, max: 2 },      // Marsh is mostly liquid
  petrified_expanse: { min: 0, max: 4 },   // Some pools at base
  tidal_pools: { min: -1, max: 1 },         // Lots of seawater
  kelp_forests: { min: -1, max: 1 },        // Submerged areas
  deep_trenches: { min: -1, max: 0 },       // Mostly underwater
  void_rift: { min: -1, max: 3 },          // Rift plasma pools
  crystalline_wastes: { min: 0, max: 5 }, // Silicon pools at ground level
  bioluminescent_depths: { min: -1, max: 2 }, // Luminous nectar pools
  // Hub Station Biomes (flat interiors)
  canopy_station: { min: 0, max: 1 },
  ironhold_station: { min: 0, max: 1 },
  meridian_station: { min: 0, max: 1 },
  salvage_station: { min: 0, max: 1 },
};

/**
 * Clamp height to biome-specific range
 */
function clampToBiomeRange(height: number, biome: BiomeType): number {
  const range = BIOME_ELEVATION_RANGES[biome];
  return Math.max(range.min, Math.min(range.max, height));
}

/**
 * Generate terrain data for a chunk
 */
export function generateTerrain(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biomeGenerator: BiomeGenerator
): { tiles: number[][]; heights: number[][]; collisions: boolean[][]; liquidTiles: (string | null)[][] } {
  const noise = new SimplexNoise(`${worldSeed}_terrain_${chunkX}_${chunkY}`);
  // IMPORTANT: Height noise uses GLOBAL seed (not chunk-specific) for seamless elevation across chunks
  const heightNoise = new SimplexNoise(`${worldSeed}_height_global`);
  const random = new SeededRandom(`${worldSeed}_terrain_${chunkX}_${chunkY}`);

  const tiles: number[][] = [];
  const heights: number[][] = [];
  const collisions: boolean[][] = [];
  const liquidTiles: (string | null)[][] = [];

  for (let y = 0; y < ZONE_SIZE; y++) {
    tiles[y] = [];
    heights[y] = [];
    collisions[y] = [];
    liquidTiles[y] = [];

    for (let x = 0; x < ZONE_SIZE; x++) {
      const worldX = chunkX * ZONE_SIZE + x;
      const worldY = chunkY * ZONE_SIZE + y;

      // Sample biome for this specific tile based on world coordinates
      const biome = biomeGenerator.getBiome(worldX, worldY);
      const biomeTileIds = BIOME_TILE_IDS[biome];
      const biomeTiles = BIOME_TILES[biome];
      const wallThreshold = getWallThreshold(biome);

      // Multi-octave noise for terrain
      const terrainValue = noise.fbm(worldX * 0.05, worldY * 0.05, 4);

      // Determine if this is a wall/obstacle
      const isWall = terrainValue > wallThreshold;

      // Add some random features
      const hasFeature = !isWall && random.nextBool(0.02);

      let tileId: string;
      if (isWall) {
        tiles[y][x] = biomeTiles.wall;
        tileId = biomeTileIds.wall;
      } else if (hasFeature) {
        tiles[y][x] = biomeTiles.feature;
        tileId = biomeTileIds.feature;
      } else {
        tiles[y][x] = biomeTiles.floor;
        tileId = biomeTileIds.floor;
      }

      // Get collision from registry instead of hardcoded function
      const tileDef = TileRegistry.get(tileId);
      collisions[y][x] = tileDef.isBlocking;

      // Add noise-based height variation using WORLD coordinates for seamless cross-chunk elevation
      // Use smoother noise with lower frequency for gradual elevation changes
      const heightValue = heightNoise.fbm(worldX * 0.03, worldY * 0.03, 2);
      // Map noise (-1 to 1) to height (-1 to 3) for terrain with valleys
      // Negative heights = below sea level = liquid fills these areas
      const rawHeight = Math.round((heightValue + 1) * 2 - 1);
      // Clamp to biome-specific range
      heights[y][x] = clampToBiomeRange(Math.max(-1, Math.min(3, rawHeight)), biome);

      // No blocking tiles at elevation 0 or below — they cause rendering/collision issues underwater
      if (collisions[y][x] && heights[y][x] <= 0) {
        tiles[y][x] = biomeTiles.floor;
        tileId = biomeTileIds.floor;
        collisions[y][x] = false;
      }

      // Liquid overlay: tiles at elevation <= 0 in non-hub biomes get the biome's liquid
      const liquidId = BIOME_LIQUID_MAP[biome];
      if (heights[y][x] <= 0 && liquidId && !biome.endsWith('_station')) {
        liquidTiles[y][x] = liquidId;
      } else {
        liquidTiles[y][x] = null;
      }
    }
  }

  // Unify liquid type across zone — at biome borders, the majority liquid wins
  const liquidCounts = new Map<string, number>();
  for (let y = 0; y < ZONE_SIZE; y++) {
    for (let x = 0; x < ZONE_SIZE; x++) {
      const lid = liquidTiles[y][x];
      if (lid) liquidCounts.set(lid, (liquidCounts.get(lid) ?? 0) + 1);
    }
  }
  if (liquidCounts.size > 1) {
    let dominantLiquid = '';
    let maxCount = 0;
    for (const [lid, count] of liquidCounts) {
      if (count > maxCount) { dominantLiquid = lid; maxCount = count; }
    }
    for (let y = 0; y < ZONE_SIZE; y++) {
      for (let x = 0; x < ZONE_SIZE; x++) {
        if (liquidTiles[y][x]) liquidTiles[y][x] = dominantLiquid;
      }
    }
  }

  // Ensure edges have some openings for zone transitions
  // Use dominant biome at chunk center for path tile selection
  const centerX = chunkX * ZONE_SIZE + ZONE_SIZE / 2;
  const centerY = chunkY * ZONE_SIZE + ZONE_SIZE / 2;
  const dominantBiome = biomeGenerator.getBiome(centerX, centerY);
  const pathTiles = BIOME_TILES[dominantBiome];
  const pathTileIds = BIOME_TILE_IDS[dominantBiome];
  ensureZoneConnectivity(tiles, heights, collisions, pathTiles.floor, pathTileIds.floor, dominantBiome);

  return { tiles, heights, collisions, liquidTiles };
}

/**
 * Get wall density threshold for biome
 */
function getWallThreshold(biome: BiomeType): number {
  const thresholds: Record<BiomeType, number> = {
    void_plains: 0.6,
    crystal_caves: 0.4,
    toxic_wastes: 0.5,
    ancient_ruins: 0.45,
    frozen_expanse: 0.55,
    volcanic_ridge: 0.5,
    fungal_forest: 0.35,
    starfall_crater: 0.5,
    miasma_marshes: 0.45,      // Moderate wall density
    petrified_expanse: 0.5,    // Standard wall density
    tidal_pools: 0.7,          // Few obstacles
    kelp_forests: 0.3,         // Dense kelp walls (will be carved by corridors)
    deep_trenches: 0.8,        // Open trenches
    void_rift: 0.55,              // Moderate wall density (distortion pockets)
    crystalline_wastes: 0.4,       // Dense crystal formations
    bioluminescent_depths: 0.45,   // Moderate undergrowth (traversable flora)
    // Hub Station Biomes (no procedural wall generation — hand-designed maps)
    canopy_station: 1.0,
    ironhold_station: 1.0,
    meridian_station: 1.0,
    salvage_station: 1.0,
  };
  return thresholds[biome];
}

/**
 * Ensure zone edges have pathways for transitions
 */
function ensureZoneConnectivity(
  tiles: number[][],
  heights: number[][],
  collisions: boolean[][],
  floorTile: TileId,
  floorTileId: string,
  biome: BiomeType
): void {
  const size = ZONE_SIZE;
  const pathWidth = 3;
  const pathPositions = [
    Math.floor(size * 0.25),
    Math.floor(size * 0.5),
    Math.floor(size * 0.75),
  ];

  // Use height 1 for paths (middle ground that connects well across biomes)
  const pathHeight = 1;

  // Clear paths on edges
  for (const pos of pathPositions) {
    for (let i = 0; i < pathWidth; i++) {
      // Top edge
      tiles[0][pos + i] = floorTile;
      heights[0][pos + i] = pathHeight;
      collisions[0][pos + i] = false;

      // Bottom edge
      tiles[size - 1][pos + i] = floorTile;
      heights[size - 1][pos + i] = pathHeight;
      collisions[size - 1][pos + i] = false;

      // Left edge
      tiles[pos + i][0] = floorTile;
      heights[pos + i][0] = pathHeight;
      collisions[pos + i][0] = false;

      // Right edge
      tiles[pos + i][size - 1] = floorTile;
      heights[pos + i][size - 1] = pathHeight;
      collisions[pos + i][size - 1] = false;
    }
  }
}
