/**
 * pixel-distance.ts
 *
 * Range constants and utility functions for pixel-space distance calculations.
 * All range constants are expressed as multiples of TILE_SIZE_PX so they
 * auto-scale if the tile size ever changes.
 *
 * Coordinate convention:
 *   - (px, py) are absolute world-space pixel coordinates within the zone
 *   - Positive X = right, positive Y = down (standard 2D grid)
 *   - px/py are floating-point; tile coords are derived via Math.floor(px / TILE_SIZE_PX)
 */

import { TILE_SIZE_PX } from './pixel-validation';

// ============================================================
// Range constants (as tile multiples)
// ============================================================

/**
 * Melee attack reach in pixels.
 * 0.5 tiles = 64 px — close-range melee engagement.
 */
export const MELEE_RANGE_PX = 0.5 * TILE_SIZE_PX; // 64 px

/**
 * Gathering and interactive object reach in pixels.
 * 2.0 tiles = 256 px — allows interaction from adjacent tile including diagonals.
 */
export const GATHER_RANGE_PX = 2.0 * TILE_SIZE_PX; // 256 px

/**
 * NPC dialogue / interaction range in pixels.
 * Same as GATHER_RANGE_PX — "close enough" consistent across interaction types.
 */
export const NPC_INTERACT_RANGE_PX = GATHER_RANGE_PX; // 192 px

/**
 * Creature aggro detection radius in pixels.
 * 4.0 tiles = 512 px — creature notices the player and starts pursuing.
 */
export const AGGRO_RADIUS_PX = 4.0 * TILE_SIZE_PX; // 512 px

/**
 * Creature leash radius in pixels.
 * 8.0 tiles = 1024 px — creature gives up chase and returns home when exceeded.
 */
export const LEASH_RADIUS_PX = 8.0 * TILE_SIZE_PX; // 1024 px

/**
 * Herbivore flee detection radius in pixels.
 * 5.0 tiles = 640 px — same as the old FLEE_RADIUS = 5 tiles constant.
 */
export const FLEE_RADIUS_PX = 5.0 * TILE_SIZE_PX; // 640 px

// ============================================================
// Distance functions
// ============================================================

/**
 * Computes the Euclidean distance between two pixel-space positions.
 *
 * @param ax  Source X in pixels.
 * @param ay  Source Y in pixels.
 * @param bx  Target X in pixels.
 * @param by  Target Y in pixels.
 * @returns   Distance in pixels (always >= 0).
 */
export function pixelDistanceTo(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

// ============================================================
// Coordinate conversion functions
// ============================================================

/**
 * Returns the pixel-space center of a grid tile.
 * Uses the `(tileIndex + 0.5) * TILE_SIZE_PX` convention so that
 * tile (0,0) has its center at (64, 64), tile (1,0) at (192, 64), etc.
 *
 * This is the canonical spawn point for any entity that starts at a given tile.
 *
 * @param tileX  Integer tile X index.
 * @param tileY  Integer tile Y index.
 * @returns      Pixel-space center { px, py } of the tile.
 */
export function tileToPixelCenter(tileX: number, tileY: number): { px: number; py: number } {
  return {
    px: (tileX + 0.5) * TILE_SIZE_PX,
    py: (tileY + 0.5) * TILE_SIZE_PX,
  };
}

/**
 * Converts a pixel-space position to integer tile grid coordinates.
 * Uses Math.floor so the result is always the tile that contains the pixel.
 *
 * Examples:
 *   pixelToTile(64, 64)   → { tileX: 0, tileY: 0 }   (center of tile 0,0)
 *   pixelToTile(128, 0)   → { tileX: 1, tileY: 0 }   (exactly on tile boundary)
 *   pixelToTile(127, 127) → { tileX: 0, tileY: 0 }   (just before boundary)
 *
 * @param px  Absolute X pixel coordinate.
 * @param py  Absolute Y pixel coordinate.
 * @returns   Integer tile coordinates { tileX, tileY }.
 */
export function pixelToTile(px: number, py: number): { tileX: number; tileY: number } {
  return {
    tileX: Math.floor(px / TILE_SIZE_PX),
    tileY: Math.floor(py / TILE_SIZE_PX),
  };
}
