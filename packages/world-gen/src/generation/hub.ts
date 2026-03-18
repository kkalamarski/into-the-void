import { ChunkData, BiomeType, FertilityType, ZONE_SIZE } from '@into-the-void/shared-types';
import { getHubMap } from '../maps/hub-loader';

const PORTAL_TILE_ID = 16; // TileId.PORTAL from terrain.ts

/** NPC spawn position within a hub */
export interface NpcSpawn {
  npcId: string;
  x: number;
  y: number;
}

/** Hub layout configuration per faction */
export interface HubConfig {
  biome: BiomeType;
  /** Floor tile ID (number matching existing tile IDs) */
  floorTile: number;
  /** Wall/boundary tile ID */
  wallTile: number;
  displayName: string;
  fertilityType: FertilityType;
  /** NPC spawn positions for this hub */
  npcSpawns: readonly NpcSpawn[];
}

const HUB_CONFIGS: Record<string, HubConfig> = {
  // Canopy Station — bioluminescent organic architecture
  hub_verdant: {
    biome: 'canopy_station',
    floorTile: 2,                 // CRYSTAL_FLOOR (has 256x256 sprite)
    wallTile: 3,                  // CRYSTAL_FORMATION (has 256x256 sprite)
    displayName: 'Canopy Station',
    fertilityType: 'Normal',
    npcSpawns: [
      { npcId: 'npc_verdant_trader', x: 20, y: 20 },   // NW area - trader
      { npcId: 'npc_verdant_guard', x: 32, y: 15 },    // N of center - guard
      { npcId: 'npc_verdant_rep', x: 44, y: 20 },      // NE area - faction rep
      { npcId: 'npc_verdant_ambient', x: 20, y: 44 },  // SW area - ambient
      { npcId: 'npc_verdant_service', x: 44, y: 44 },  // SE area - medical
      // Specialized vendors
      { npcId: 'npc_suit_vendor', x: 15, y: 32 },      // W area - suit vendor
      { npcId: 'npc_tool_vendor', x: 49, y: 32 },      // E area - tool vendor
      { npcId: 'npc_module_vendor', x: 32, y: 49 },    // S area - module vendor
      { npcId: 'npc_expedition_master', x: 32, y: 25 }, // N of portal - expedition coordinator
    ],
  },
  // Ironhold Station — industrial forges and metal corridors
  hub_helix: {
    biome: 'ironhold_station',
    floorTile: 8,                 // ICE_FLOOR (has 256x256 sprite - repurpose for industrial)
    wallTile: 1,                  // VOID_WALL (has 256x256 sprite)
    displayName: 'Ironhold Station',
    fertilityType: 'Normal',
    npcSpawns: [
      { npcId: 'npc_helix_trader', x: 20, y: 20 },
      { npcId: 'npc_helix_guard', x: 32, y: 15 },
      { npcId: 'npc_helix_rep', x: 44, y: 20 },
      { npcId: 'npc_helix_ambient', x: 20, y: 44 },
      { npcId: 'npc_helix_service', x: 44, y: 44 },
      // Specialized vendors
      { npcId: 'npc_suit_vendor', x: 15, y: 32 },
      { npcId: 'npc_tool_vendor', x: 49, y: 32 },
      { npcId: 'npc_module_vendor', x: 32, y: 49 },
      { npcId: 'npc_expedition_master', x: 32, y: 25 }, // N of portal - expedition coordinator
    ],
  },
  // Meridian Station — corporate trade hub
  hub_nexus: {
    biome: 'meridian_station',
    floorTile: 0,                 // VOID_FLOOR (has 256x256 sprite)
    wallTile: 1,                  // VOID_WALL (has 256x256 sprite)
    displayName: 'Meridian Station',
    fertilityType: 'Normal',
    npcSpawns: [
      { npcId: 'npc_nexus_trader', x: 20, y: 20 },
      { npcId: 'npc_nexus_guard', x: 32, y: 15 },
      { npcId: 'npc_nexus_rep', x: 44, y: 20 },
      { npcId: 'npc_nexus_ambient', x: 20, y: 44 },
      { npcId: 'npc_nexus_service', x: 44, y: 44 },
      // Specialized vendors
      { npcId: 'npc_suit_vendor', x: 15, y: 32 },
      { npcId: 'npc_tool_vendor', x: 49, y: 32 },
      { npcId: 'npc_module_vendor', x: 32, y: 49 },
      { npcId: 'npc_expedition_master', x: 32, y: 25 }, // N of portal - expedition coordinator
    ],
  },
  // Salvage Station — patchwork scavenger hub
  hub_neutral: {
    biome: 'salvage_station',
    floorTile: 0,                 // VOID_FLOOR (numeric placeholder — Phase 142 reworks)
    wallTile: 1,                  // VOID_WALL (numeric placeholder — Phase 142 reworks)
    displayName: 'Salvage Station',
    fertilityType: 'Normal',
    npcSpawns: [
      { npcId: 'npc_neutral_trader', x: 20, y: 20 },
      { npcId: 'npc_neutral_guard', x: 32, y: 15 },
      { npcId: 'npc_neutral_rep', x: 44, y: 20 },
      { npcId: 'npc_neutral_ambient', x: 20, y: 44 },
      { npcId: 'npc_neutral_service', x: 44, y: 44 },
      // Specialized vendors
      { npcId: 'npc_suit_vendor', x: 15, y: 32 },
      { npcId: 'npc_tool_vendor', x: 49, y: 32 },
      { npcId: 'npc_module_vendor', x: 32, y: 49 },
      { npcId: 'npc_expedition_master', x: 32, y: 25 }, // N of portal - expedition coordinator
    ],
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
 * Loads from pre-defined JSON map if available, otherwise falls back to procedural generation.
 *
 * Hubs are 64x64 tile areas with:
 * - Walkable floor in the center (roughly 48x48)
 * - Wall/boundary tiles around the perimeter (8 tiles thick)
 * - No spawn points (NPCs added separately in Phase 48)
 * - No entity spawns (safe zone)
 */
export function generateHubChunk(hubZoneId: string): ChunkData {
  // Try to load from JSON map first
  const mapData = getHubMap(hubZoneId);
  if (mapData) {
    // Deep clone to avoid mutation of the cached map
    return JSON.parse(JSON.stringify(mapData));
  }

  // Fallback to procedural generation for unknown hubs
  return generateProceduralHubChunk(hubZoneId);
}

/**
 * Generate a hub chunk procedurally (fallback for hubs without JSON maps).
 */
function generateProceduralHubChunk(hubZoneId: string): ChunkData {
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

  // Place portal tile at hub center for exit
  const portalX = 32;
  const portalY = 32;
  tiles[portalY][portalX] = PORTAL_TILE_ID;
  // Portal is walkable (collision already false from floor tile generation)

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
