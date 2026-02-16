import { Entity } from './entity';
import { PlayerPublic } from './player';
import { BiomeType } from '../game/biome';

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
 * Tile structure definition for multi-tile walls and buildings
 */
export interface TileStructure {
  /** Structure type */
  type: 'wall' | 'building';
  /** Tiles comprising this structure */
  tiles: Array<{
    x: number;
    y: number;
    tileId: string;
    height: number;
  }>;
}

/**
 * Chunk data (generated terrain for a zone)
 */
export interface ChunkData {
  /** Zone ID this chunk belongs to */
  zoneId: string;
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
