import { TileRegistry } from '@into-the-void/tiles';

/**
 * Biome-specific base speed modifiers (on top of tile modifiers)
 */
export const BIOME_SPEED_MODIFIERS: Record<string, number> = {
  tidal_pools: 0.9, // Slight slowdown in coastal areas
  kelp_forests: 0.8, // Moderate slowdown in dense underwater vegetation
  deep_trenches: 0.7, // Significant slowdown from pressure
  // All other biomes default to 1.0
};

/**
 * Get the speed modifier for a specific tile ID
 * Returns the tile's movementSpeed property (0.0-1.0)
 */
export function getTileSpeedModifier(tileId: string): number {
  const tileDef = TileRegistry.get(tileId);
  return tileDef.movementSpeed;
}

/**
 * Get the effective movement speed modifier for a position
 * Combines tile-specific and biome-specific modifiers
 *
 * @param tileId - The tile ID at the position
 * @param biome - Optional biome type for additional modifier
 * @returns Combined speed modifier (0.0-1.0)
 */
export function getMovementSpeedModifier(tileId: string, biome?: string): number {
  const tileModifier = getTileSpeedModifier(tileId);

  // Apply biome modifier if applicable
  const biomeModifier = biome ? (BIOME_SPEED_MODIFIERS[biome] ?? 1.0) : 1.0;

  // Combine modifiers multiplicatively
  return tileModifier * biomeModifier;
}

/**
 * Calculate movement delay based on base tick rate and speed modifier
 * Higher modifier = faster movement = lower delay
 *
 * @param baseTick - Base movement tick in ms (e.g., 150ms)
 * @param speedModifier - Speed modifier (0.0-1.0)
 * @returns Adjusted movement delay in ms
 */
export function calculateMovementDelay(baseTick: number, speedModifier: number): number {
  if (speedModifier <= 0) return Infinity; // Cannot move
  return Math.round(baseTick / speedModifier);
}
