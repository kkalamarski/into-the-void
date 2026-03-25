/**
 * Liquid effect types for the liquid tile effect system (Phase 158).
 *
 * These types define the runtime state and socket event payloads for
 * liquid effects (movement slow, periodic damage, periodic healing)
 * applied to players and creatures standing in liquid tiles.
 */

/**
 * Per-entity runtime liquid effect state — maintained in-memory by LiquidEffectService.
 * Tracks which liquid tile an entity is standing in and when effects were last applied.
 */
export interface LiquidEffectState {
  /** Entity ID (player or creature) */
  readonly entityId: string;
  /** Liquid tile definition ID (e.g., 'magma', 'luminous_nectar') */
  readonly liquidTileId: string;
  /** Display name of the liquid (e.g., 'Magma', 'Luminous Nectar') */
  readonly displayName: string;
  /** Movement speed multiplier while in liquid (e.g., 0.3 for magma) */
  readonly speedMultiplier: number;
  /** Flat damage dealt per tick (0 = no damage) */
  readonly damagePerTick: number;
  /** Flat healing per tick (0 = no healing) */
  readonly healPerTick: number;
  /** Timestamp when entity entered the liquid */
  readonly enteredAt: number;
  /** Timestamp of last damage/heal tick applied */
  readonly lastTickAt: number;
  /** Hex color of the liquid tile (for client display) */
  readonly color: number;
}

/**
 * Socket event payload: liquid:damage
 * Emitted to a player when they take damage from a liquid tile.
 */
export interface LiquidDamagePayload {
  readonly playerId: string;
  readonly damage: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly liquidTileId: string;
}

/**
 * Socket event payload: liquid:heal
 * Emitted to a player when they receive healing from a liquid tile.
 */
export interface LiquidHealPayload {
  readonly playerId: string;
  readonly heal: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly liquidTileId: string;
}

/**
 * Socket event payload: liquid:update
 * Emitted to a player when they enter or leave a liquid tile.
 */
export interface LiquidUpdatePayload {
  readonly active: boolean;
  readonly liquidTileId?: string;
  readonly displayName?: string;
  /** Hex color number (e.g., 0xff4422) */
  readonly color?: number;
  readonly speedMultiplier?: number;
  readonly damagePerTick?: number;
  readonly healPerTick?: number;
}
