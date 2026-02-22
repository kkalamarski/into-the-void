import { Entity } from './entity';
import { PlayerPublic } from './player';
import { BiomeType } from '../game/biome';

/**
 * Fertility zone type — determines spawn density modulation
 * Barren = sparse spawns, Normal = standard density, Lush = dense spawns
 */
export type FertilityType = 'Barren' | 'Normal' | 'Lush';

/**
 * Zone type discriminator — distinguishes hub instanced areas from the open world
 */
export type ZoneType = 'open_world' | 'hub';

/** Hub zone IDs for faction orbital stations */
export const HUB_ZONE_IDS = ['hub_verdant', 'hub_helix', 'hub_nexus', 'hub_neutral'] as const;

export type HubZoneId = typeof HUB_ZONE_IDS[number];

/**
 * Returns true if the given zoneId refers to a hub zone.
 */
export function isHubZone(zoneId: string): boolean {
  return zoneId.startsWith('hub_');
}

/**
 * Zone size in tiles
 */
export const ZONE_SIZE = 64;

/**
 * Zone data
 */
export interface Zone {
  /** Zone identifier (e.g., "z_1_2") */
  id: string;
  /** Zone X coordinate */
  x: number;
  /** Zone Y coordinate */
  y: number;
  /** Primary biome of this zone */
  biome: BiomeType;
  /** Whether zone has been generated */
  generated: boolean;
}

/**
 * Tile structure definition for blocking terrain features
 */
export interface TileStructure {
  /** Structure type: feature (natural blocking), wall (linear), building (multi-tile) */
  type: 'feature' | 'wall' | 'building';
  /** Tiles comprising this structure */
  tiles: Array<{
    x: number;
    y: number;
    tileId: string;
    height: number;
  }>;
}

/** Tile position within a zone (local coordinates without zoneId) */
export interface TilePosition {
  x: number;
  y: number;
}

/** Portal exit point defining zone transitions */
export interface ExitPoint {
  /** Position of the portal in this zone */
  position: TilePosition;
  /** Target zone ID to teleport to */
  targetZone: string;
}

/**
 * Chunk data (generated terrain for a zone)
 */
export interface ChunkData {
  /** Zone ID this chunk belongs to */
  zoneId: string;
  /** Explicit width in tiles (inferred from tiles[0].length if omitted) */
  width?: number;
  /** Explicit height in tiles (inferred from tiles.length if omitted) */
  height?: number;
  /** Tile data (2D array of tile IDs) */
  tiles: number[][]; // Keep as number[][] for now - Phase 13-03 adds migration
  /** Height data (2D array of elevation levels 0-5) - parallel to tiles[][] */
  heights: number[][];
  /** Structure data (walls, buildings) */
  structures: TileStructure[];
  /** Collision map (true = blocked) */
  collisions: boolean[][];
  /** Spawn points for entities */
  spawnPoints: SpawnPoint[];
  /** Default spawn location for players entering this zone */
  entryPoint?: TilePosition;
  /** Portal destinations for zone transitions */
  exitPoints?: ExitPoint[];
}

/**
 * Spawn point for entities
 */
export interface SpawnPoint {
  /** X position within zone */
  x: number;
  /** Y position within zone */
  y: number;
  /** Type of entity to spawn */
  entityType: 'creature' | 'mineral';
  /** Specific entity ID to spawn */
  spawnId: string;
  /** Respawn time in seconds */
  respawnTime: number;
}

/**
 * Zone state (runtime data)
 */
export interface ZoneState {
  /** Zone ID */
  zoneId: string;
  /** Active entities in zone */
  entities: Entity[];
  /** Players currently in zone */
  players: PlayerPublic[];
  /** Last update timestamp */
  lastUpdate: number;
  /** Chunk terrain data for this zone */
  chunk: ChunkData;
  /** Primary biome of this zone */
  biome: BiomeType;
  /** Fertility tier of this zone (Barren/Normal/Lush) */
  fertilityType: FertilityType;
  /** Zone type discriminator — 'hub' for faction stations, 'open_world' for procedural zones */
  zoneType?: ZoneType;
}

/**
 * Zone subscription info
 */
export interface ZoneSubscription {
  /** Subscribed zone IDs (current + adjacent) */
  zoneIds: string[];
  /** Player ID */
  playerId: string;
}
