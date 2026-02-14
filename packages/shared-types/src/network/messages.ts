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
  | 'AUTH_TIMEOUT'
  | 'INVALID_CHARACTER'
  | 'SERVER_UNAVAILABLE'
  | 'CONNECTION_LOST'
  | 'INVALID_ACTION'
  | 'INVALID_TARGET'
  | 'MOVEMENT_BLOCKED'
  | 'NOT_IN_COMBAT'
  | 'NOT_YOUR_TURN'
  | 'INSUFFICIENT_RESOURCES'
  | 'INVENTORY_FULL'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

/**
 * User-facing error code mapping (E-XXXX format)
 */
export interface ErrorCodeMap {
  AUTH_FAILED: 'E-1001';
  AUTH_EXPIRED: 'E-1002';
  AUTH_TIMEOUT: 'E-1003';
  INVALID_CHARACTER: 'E-1004';
  SERVER_UNAVAILABLE: 'E-2001';
  CONNECTION_LOST: 'E-2002';
  INVALID_ACTION: 'E-3001';
  INVALID_TARGET: 'E-3002';
  MOVEMENT_BLOCKED: 'E-3003';
  NOT_IN_COMBAT: 'E-3004';
  NOT_YOUR_TURN: 'E-3005';
  INSUFFICIENT_RESOURCES: 'E-3006';
  INVENTORY_FULL: 'E-3007';
  RATE_LIMITED: 'E-3008';
  SERVER_ERROR: 'E-9999';
}

/**
 * Error code with user-friendly information
 */
export interface ErrorCodeInfo {
  /** User-facing error code (E-XXXX format) */
  code: string;
  /** Internal error code */
  internalCode: ErrorCode;
  /** User-friendly error message */
  message: string;
  /** Suggested action for client to take */
  action: 'redirect-login' | 'redirect-characters' | 'retry' | 'none';
}

/**
 * Error code to E-XXXX mapping
 */
const errorCodeMap: ErrorCodeMap = {
  AUTH_FAILED: 'E-1001',
  AUTH_EXPIRED: 'E-1002',
  AUTH_TIMEOUT: 'E-1003',
  INVALID_CHARACTER: 'E-1004',
  SERVER_UNAVAILABLE: 'E-2001',
  CONNECTION_LOST: 'E-2002',
  INVALID_ACTION: 'E-3001',
  INVALID_TARGET: 'E-3002',
  MOVEMENT_BLOCKED: 'E-3003',
  NOT_IN_COMBAT: 'E-3004',
  NOT_YOUR_TURN: 'E-3005',
  INSUFFICIENT_RESOURCES: 'E-3006',
  INVENTORY_FULL: 'E-3007',
  RATE_LIMITED: 'E-3008',
  SERVER_ERROR: 'E-9999',
};

/**
 * Get user-friendly error information for an error code
 */
export function getErrorInfo(errorCode: ErrorCode, customMessage?: string): ErrorCodeInfo {
  const code = errorCodeMap[errorCode];

  const errorMessages: Record<ErrorCode, { message: string; action: ErrorCodeInfo['action'] }> = {
    AUTH_FAILED: {
      message: 'Authentication failed. Please log in again.',
      action: 'redirect-login',
    },
    AUTH_EXPIRED: {
      message: 'Your session has expired. Please log in again.',
      action: 'redirect-login',
    },
    AUTH_TIMEOUT: {
      message: 'Authentication timeout. Please reconnect and try again.',
      action: 'redirect-characters',
    },
    INVALID_CHARACTER: {
      message: 'Character not found or not owned by your account.',
      action: 'redirect-characters',
    },
    SERVER_UNAVAILABLE: {
      message: 'Server is temporarily unavailable. Please try again later.',
      action: 'retry',
    },
    CONNECTION_LOST: {
      message: 'Connection to server lost. Attempting to reconnect...',
      action: 'retry',
    },
    INVALID_ACTION: {
      message: 'Invalid action. Please try again.',
      action: 'none',
    },
    INVALID_TARGET: {
      message: 'Invalid target for this action.',
      action: 'none',
    },
    MOVEMENT_BLOCKED: {
      message: 'Movement blocked. Cannot move to that location.',
      action: 'none',
    },
    NOT_IN_COMBAT: {
      message: 'You are not in combat.',
      action: 'none',
    },
    NOT_YOUR_TURN: {
      message: 'Not your turn in combat.',
      action: 'none',
    },
    INSUFFICIENT_RESOURCES: {
      message: 'Insufficient resources to perform this action.',
      action: 'none',
    },
    INVENTORY_FULL: {
      message: 'Your inventory is full.',
      action: 'none',
    },
    RATE_LIMITED: {
      message: 'Too many requests. Please slow down.',
      action: 'none',
    },
    SERVER_ERROR: {
      message: 'An unexpected error occurred. Please try again.',
      action: 'retry',
    },
  };

  const errorInfo = errorMessages[errorCode];

  return {
    code,
    internalCode: errorCode,
    message: customMessage || errorInfo.message,
    action: errorInfo.action,
  };
}
