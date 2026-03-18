/**
 * Movement and zone transition constants shared between client and server.
 */

/**
 * Number of tiles the player must be inside a new zone before the zone transition commits.
 * Prevents chunk loading/unloading thrashing when walking back and forth across zone boundaries.
 * Matches the HUD's HYSTERESIS_FRAMES = 3 pattern.
 */
export const HYSTERESIS_TILES = 3;
