import { Entity } from '@into-the-void/shared-types';

/**
 * Tile definition - static properties for a tile type
 * This is the single source of truth for all tile data including rendering
 */
export interface TileDefinition {
  /** Unique tile identifier (e.g., 'void_floor', 'toxic_pool') */
  readonly id: string;
  /** Human-readable display name */
  readonly displayName: string;
  /** Whether this tile blocks movement */
  readonly isBlocking: boolean;
  /** Movement speed multiplier (1.0 = normal, 0.5 = slow, 0 = impassable) */
  readonly movementSpeed: number;
  /** Texture key hint for renderer (renderer decides final visuals) */
  readonly textureKey: string;
  /** Default elevation level (0-5) */
  readonly defaultElevation: number;
  /** Render color (hex number, e.g., 0x2a2a3a) - used until sprites are available */
  readonly color: number;
  /** Optional description for tile inspection */
  readonly description?: string;
  /** Optional hooks for tile interactions */
  readonly hooks?: TileHooks;
}

/**
 * Hook functions for tile interactions
 * Each hook receives context and returns an effect or null
 */
export interface TileHooks {
  /** Called when entity steps on this tile */
  onStep?: TileHookFn;
  // Future: onClick, onEnter, onExit, onTick
}

/**
 * Context passed to tile hooks
 */
export interface TileHookContext {
  /** Entity triggering the hook */
  readonly entity: Entity;
  /** Tile position */
  readonly position: { readonly x: number; readonly y: number };
}

/**
 * Hook function signature
 */
export type TileHookFn = (context: TileHookContext) => TileEffect | null;

/**
 * Effect returned by hooks - caller applies these
 * Discriminated union for type-safe handling
 */
export type TileEffect =
  | { readonly type: 'damage'; readonly amount: number }
  | { readonly type: 'slow'; readonly duration: number; readonly multiplier: number }
  | { readonly type: 'heal'; readonly amount: number };
