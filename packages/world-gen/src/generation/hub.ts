import { ChunkData, BiomeType, FertilityType, ZONE_SIZE } from '@into-the-void/shared-types';

/** Hub layout configuration per faction */
export interface HubConfig {
  biome: BiomeType;
  /** Floor tile ID (number matching existing tile IDs) */
  floorTile: number;
  /** Wall/boundary tile ID */
  wallTile: number;
  displayName: string;
  fertilityType: FertilityType;
}

const HUB_CONFIGS: Record<string, HubConfig> = {
  hub_verdant: {
    biome: 'fungal_forest',       // Canopy Station - living architecture, forest biome
    floorTile: 2,                 // Forest floor tile
    wallTile: 3,                  // Vegetation/tree wall tile
    displayName: 'Canopy Station',
    fertilityType: 'Normal',
  },
  hub_helix: {
    biome: 'volcanic_ridge',      // Ironhold Station - industrial, volcanic mountain
    floorTile: 4,                 // Metal/industrial floor
    wallTile: 5,                  // Industrial wall
    displayName: 'Ironhold Station',
    fertilityType: 'Normal',
  },
  hub_nexus: {
    biome: 'void_plains',         // Meridian Station - neutral, transactional
    floorTile: 6,                 // Clean floor
    wallTile: 7,                  // Glass/neutral wall
    displayName: 'Meridian Station',
    fertilityType: 'Normal',
  },
  hub_neutral: {
    biome: 'void_plains',         // Unaffiliated go to Meridian (neutral welcome)
    floorTile: 6,
    wallTile: 7,
    displayName: 'Meridian Station',
    fertilityType: 'Normal',
  },
};

/**
 * Get hub configuration for a hub zone ID.
 * Returns undefined if zoneId is not a known hub.
 */
export function getHubConfig(zoneId: string): HubConfig | undefined {
  return HUB_CONFIGS[zoneId];
}

/**
 * Generate a hub zone chunk.
 * Hubs are 64x64 tile areas with:
 * - Walkable floor in the center (roughly 48x48)
 * - Wall/boundary tiles around the perimeter (8 tiles thick)
 * - No spawn points (NPCs added separately in Phase 48)
 * - No entity spawns (safe zone)
 */
export function generateHubChunk(hubZoneId: string): ChunkData {
  const config = HUB_CONFIGS[hubZoneId];
  if (!config) {
    throw new Error(`Unknown hub zone: ${hubZoneId}`);
  }

  const tiles: number[][] = [];
  const heights: number[][] = [];
  const collisions: boolean[][] = [];

  for (let y = 0; y < ZONE_SIZE; y++) {
    const tileRow: number[] = [];
    const heightRow: number[] = [];
    const collisionRow: boolean[] = [];

    for (let x = 0; x < ZONE_SIZE; x++) {
      // Perimeter (8 tiles thick) is wall/blocked
      const isPerimeter =
        x < 8 || x >= ZONE_SIZE - 8 || y < 8 || y >= ZONE_SIZE - 8;

      if (isPerimeter) {
        tileRow.push(config.wallTile);
        heightRow.push(1);      // Slightly elevated walls
        collisionRow.push(true); // Blocked
      } else {
        tileRow.push(config.floorTile);
        heightRow.push(0);
        collisionRow.push(false); // Walkable
      }
    }

    tiles.push(tileRow);
    heights.push(heightRow);
    collisions.push(collisionRow);
  }

  return {
    zoneId: hubZoneId,
    tiles,
    heights,
    structures: [],      // No procedural structures in hubs
    collisions,
    spawnPoints: [],     // No entity spawns in hubs (safe zone)
  };
}

/**
 * Check if a zone ID is a known hub zone.
 */
export function isKnownHub(zoneId: string): boolean {
  return zoneId in HUB_CONFIGS;
}
