import { Entity } from '@into-the-void/shared-types';

/**
 * Tile traversability state - extends beyond simple blocking
 * Used for water tiles that are traversable but with special rules
 */
export type TileState = 'solid' | 'traversable' | 'shallow_water' | 'deep_water';

/** Liquid transparency level — affects whether terrain below is visible */
export type LiquidOpacity = 'translucent' | 'semi-opaque' | 'opaque';

/**
 * Liquid gameplay effect metadata — consumed by Phase 158 liquid effects system
 */
export interface LiquidEffect {
  /** Movement speed multiplier when in liquid (stacks with movementSpeed) */
  readonly speedMultiplier: number;
  /** Damage dealt per tick while in liquid (0 = no damage) */
  readonly damagePerTick: number;
  /** Healing per tick while in liquid (0 = no healing) */
  readonly healPerTick: number;
  /** Human-readable effect description for tooltip */
  readonly effectDescription: string;
}

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
  /** Tile state for special traversal rules (water, etc). Defaults to 'traversable' if not blocking, 'solid' if blocking */
  readonly tileState?: TileState;
  /** Visibility radius modifier (1.0 = normal, 0.7 = reduced). Affects fog of war reveal. */
  readonly visibilityModifier?: number;
  /** Whether this tile is a liquid (used by generation and rendering) */
  readonly isLiquid?: boolean;
  /** Liquid opacity — translucent shows terrain below, opaque covers it */
  readonly liquidOpacity?: LiquidOpacity;
  /** Render height multiplier — 0.5 for liquid half-height slabs (32px at ELEVATION_HEIGHT_STEP=64) */
  readonly renderHeightMultiplier?: number;
  /** Liquid effect metadata for gameplay (Phase 158 will consume this) */
  readonly liquidEffect?: LiquidEffect;
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
