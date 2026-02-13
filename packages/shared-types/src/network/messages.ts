import { Player, PlayerPublic } from '../core/player';
import { Position } from '../core/position';

/**
 * Authentication request
 */
export interface AuthRequest {
  token: string;
  characterId: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  success: boolean;
  player?: Player;
  error?: string;
}

/**
 * Connection state
 */
export type ConnectionState = 'connecting' | 'connected' | 'authenticated' | 'disconnected' | 'error';

/**
 * Ping/Pong for latency measurement
 */
export interface PingMessage {
  timestamp: number;
  sequence: number;
}

/**
 * State sync message (delta updates)
 */
export interface StateSyncMessage {
  /** Sequence number for ordering */
  sequence: number;
  /** Timestamp of this update */
  timestamp: number;
  /** Player positions that changed */
  playerMoves?: Array<{ id: string; position: Position }>;
  /** Entities that spawned */
  spawns?: Array<{ id: string; type: string; data: unknown }>;
  /** Entity IDs that despawned */
  despawns?: string[];
  /** Entity updates (partial) */
  updates?: Array<{ id: string; changes: Record<string, unknown> }>;
}

/**
 * Initial zone load response
 */
export interface ZoneLoadResponse {
  /** Zone ID */
  zoneId: string;
  /** Adjacent zone IDs (for preloading) */
  adjacentZones: string[];
  /** Players in zone */
  players: PlayerPublic[];
  /** Entities in zone */
  entities: Array<{ id: string; type: string; data: unknown }>;
  /** Chunk data for rendering */
  chunkData: {
    tiles: number[][];
    collisions: boolean[][];
  };
}

/**
 * Error response
 */
export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Error codes
 */
export type ErrorCode =
  | 'AUTH_FAILED'
  | 'AUTH_EXPIRED'
  | 'INVALID_ACTION'
  | 'INVALID_TARGET'
  | 'MOVEMENT_BLOCKED'
  | 'NOT_IN_COMBAT'
  | 'NOT_YOUR_TURN'
  | 'INSUFFICIENT_RESOURCES'
  | 'INVENTORY_FULL'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';
