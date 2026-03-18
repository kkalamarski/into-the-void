import { ChunkData, BiomeType, FertilityType, ZONE_SIZE, HUB_ZONE_SIZE } from '@into-the-void/shared-types';
import { getHubMap } from '../maps/hub-loader';

const PORTAL_TILE_ID = 16; // TileId.PORTAL from terrain.ts (numeric value matches enum)

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
  // Canopy Station — bioluminescent organic architecture (128x128 map)
  // Rooms: Atrium (44,30 40x35), Trading Garden (12,15 24x22), Threshold/Docking (44,95 40x22), Nursery (92,15 24x22), Communion Hall (12,68 24x22)
  hub_verdant: {
    biome: 'canopy_station',
    floorTile: 30,                // CANOPY_FLOOR
    wallTile: 31,                 // CANOPY_WALL
    displayName: 'Canopy Station',
    fertilityType: 'Normal',
    npcSpawns: [
      // Trading Garden (NW room: 12,15 24x22) — trader + vendors clustered
      { npcId: 'npc_verdant_trader', x: 20, y: 22 },
      { npcId: 'npc_suit_vendor', x: 18, y: 28 },
      { npcId: 'npc_tool_vendor', x: 26, y: 28 },
      { npcId: 'npc_module_vendor', x: 22, y: 32 },
      // Atrium (center: 44,30 40x35) — faction rep + ambient botanist
      { npcId: 'npc_verdant_rep', x: 64, y: 42 },
      { npcId: 'npc_verdant_botanist', x: 56, y: 50 },
      { npcId: 'npc_verdant_ambient', x: 72, y: 38 },
      // Docking Bay / The Threshold (south: 44,95 40x22) — guards + expedition master
      { npcId: 'npc_verdant_guard', x: 58, y: 98 },
      { npcId: 'npc_verdant_patrol', x: 70, y: 98 },
      { npcId: 'npc_expedition_master', x: 64, y: 100 },
      // Nursery (NE: 92,15 24x22) — service + gardener
      { npcId: 'npc_verdant_service', x: 100, y: 22 },
      { npcId: 'npc_verdant_gardener', x: 106, y: 28 },
      // Communion Hall (SW: 12,68 24x22) — worker ambient
      { npcId: 'npc_verdant_worker', x: 20, y: 76 },
    ],
  },
  // Ironhold Station — industrial forges and metal corridors (128x128 map)
  // Rooms: Forge (40,12 48x30), Processing Bay 7 (44,96 40x22), Armory (10,12 24x20), Warren A-C (96,12-56 20x16), Engineering (10,52 24x20), Barracks (10,78 24x16)
  hub_helix: {
    biome: 'ironhold_station',
    floorTile: 38,                // IRONHOLD_FLOOR
    wallTile: 39,                 // IRONHOLD_WALL
    displayName: 'Ironhold Station',
    fertilityType: 'Normal',
    npcSpawns: [
      // Armory/Trading (NW: 10,12 24x20) — trader + vendors clustered
      { npcId: 'npc_helix_trader', x: 18, y: 18 },
      { npcId: 'npc_suit_vendor', x: 16, y: 24 },
      { npcId: 'npc_tool_vendor', x: 24, y: 24 },
      { npcId: 'npc_module_vendor', x: 20, y: 28 },
      // The Forge (north-center: 40,12 48x30) — faction rep + forgemaster
      { npcId: 'npc_helix_rep', x: 64, y: 22 },
      { npcId: 'npc_helix_forgemaster', x: 56, y: 30 },
      { npcId: 'npc_helix_ambient', x: 72, y: 26 },
      // Processing Bay 7 / Docking (south: 44,96 40x22) — guards + expedition
      { npcId: 'npc_helix_guard', x: 58, y: 100 },
      { npcId: 'npc_helix_patrol', x: 70, y: 100 },
      { npcId: 'npc_expedition_master', x: 64, y: 102 },
      // Warren B (east: 96,34 20x16) — patrol guard
      { npcId: 'npc_helix_miner', x: 102, y: 40 },
      // Engineering (SW: 10,52 24x20) — service + engineer
      { npcId: 'npc_helix_service', x: 18, y: 58 },
      { npcId: 'npc_helix_engineer', x: 26, y: 65 },
    ],
  },
  // Meridian Station — corporate trade hub (128x128 map)
  // Rooms: Exchange (30,20 36x28), Welcome Center Alpha (40,94 48x24), Archive (88,15 26x22), Port Meridian (12,15 22x20), Commons (80,48 30x24), Executive Suite (12,48 22x20)
  hub_nexus: {
    biome: 'meridian_station',
    floorTile: 46,                // MERIDIAN_FLOOR
    wallTile: 47,                 // MERIDIAN_WALL
    displayName: 'Meridian Station',
    fertilityType: 'Normal',
    npcSpawns: [
      // The Exchange (center-west: 30,20 36x28) — trader + vendors clustered
      { npcId: 'npc_nexus_trader', x: 44, y: 28 },
      { npcId: 'npc_suit_vendor', x: 38, y: 36 },
      { npcId: 'npc_tool_vendor', x: 50, y: 36 },
      { npcId: 'npc_module_vendor', x: 44, y: 40 },
      { npcId: 'npc_nexus_analyst', x: 56, y: 32 },
      // Welcome Center Alpha / Docking (south: 40,94 48x24) — guards + expedition
      { npcId: 'npc_nexus_guard', x: 58, y: 100 },
      { npcId: 'npc_nexus_patrol', x: 70, y: 100 },
      { npcId: 'npc_expedition_master', x: 64, y: 102 },
      // The Archive (NE: 88,15 26x22) — faction rep + archivist
      { npcId: 'npc_nexus_rep', x: 98, y: 22 },
      { npcId: 'npc_nexus_archivist', x: 104, y: 28 },
      // Port Meridian / Service (NW: 12,15 22x20) — service + clerk
      { npcId: 'npc_nexus_service', x: 20, y: 22 },
      { npcId: 'npc_nexus_clerk', x: 26, y: 28 },
      // The Commons (east: 80,48 30x24) — ambient
      { npcId: 'npc_nexus_ambient', x: 92, y: 56 },
    ],
  },
  // Salvage Station — patchwork scavenger hub (128x128 map)
  // Rooms: Cargo Bay (36,40 44x30), The Docks (38,96 36x22), Scrap Market (10,14 28x22), Workshop (86,14 26x20), The Den (10,56 20x18), Junk Storage (86,42 22x18)
  hub_neutral: {
    biome: 'salvage_station',
    floorTile: 54,                // SALVAGE_FLOOR
    wallTile: 55,                 // SALVAGE_WALL
    displayName: 'Salvage Station',
    fertilityType: 'Normal',
    npcSpawns: [
      // Scrap Market (NW: 10,14 28x22) — trader + vendors clustered
      { npcId: 'npc_neutral_trader', x: 20, y: 22 },
      { npcId: 'npc_suit_vendor', x: 16, y: 28 },
      { npcId: 'npc_tool_vendor', x: 28, y: 28 },
      { npcId: 'npc_module_vendor', x: 22, y: 32 },
      { npcId: 'npc_neutral_scrapper', x: 30, y: 22 },
      // Cargo Bay (center: 36,40 44x30) — ambient drifter + guard
      { npcId: 'npc_neutral_ambient', x: 56, y: 52 },
      { npcId: 'npc_neutral_drifter', x: 48, y: 58 },
      { npcId: 'npc_neutral_guard', x: 66, y: 48 },
      // The Docks / Docking (south: 38,96 36x22) — lookout + expedition
      { npcId: 'npc_neutral_lookout', x: 50, y: 100 },
      { npcId: 'npc_expedition_master', x: 56, y: 102 },
      // Workshop (NE: 86,14 26x20) — service + mechanic
      { npcId: 'npc_neutral_service', x: 96, y: 20 },
      { npcId: 'npc_neutral_mechanic', x: 102, y: 26 },
      // The Den (SW: 10,56 20x18) — faction rep + fixer
      { npcId: 'npc_neutral_rep', x: 16, y: 62 },
      { npcId: 'npc_neutral_fixer', x: 22, y: 68 },
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
 * Hubs are 128x128 tile areas (fallback procedural) with:
 * - Walkable floor in the center (roughly 112x112)
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
 * Generates a 128x128 tile map with walkable interior and wall perimeter.
 */
function generateProceduralHubChunk(hubZoneId: string): ChunkData {
  const config = HUB_CONFIGS[hubZoneId];
  if (!config) {
    throw new Error(`Unknown hub zone: ${hubZoneId}`);
  }

  const size = HUB_ZONE_SIZE;
  const tiles: number[][] = [];
  const heights: number[][] = [];
  const collisions: boolean[][] = [];

  for (let y = 0; y < size; y++) {
    const tileRow: number[] = [];
    const heightRow: number[] = [];
    const collisionRow: boolean[] = [];

    for (let x = 0; x < size; x++) {
      // Perimeter (8 tiles thick) is wall/blocked
      const isPerimeter =
        x < 8 || x >= size - 8 || y < 8 || y >= size - 8;

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

  // Place portal tile at hub center for exit (center of 128x128 = 64,64)
  const portalX = Math.floor(size / 2);
  const portalY = Math.floor(size / 2);
  tiles[portalY][portalX] = PORTAL_TILE_ID;
  // Portal is walkable (collision already false from floor tile generation)

  return {
    zoneId: hubZoneId,
    width: size,
    height: size,
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
