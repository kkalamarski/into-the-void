/**
 * Movement timing constants shared between client and server.
 */

/**
 * Delay between player movement inputs in milliseconds.
 * Both keyboard (WASD) and click-to-move pathfinding use this value.
 * Base speed is 2 tiles/second (500ms). Players can increase speed via gear/leveling.
 * Server rate limit should be slightly lower (450ms) to allow network jitter.
 */
export const MOVE_DELAY_MS = 500;

/**
 * Number of tiles the player must be inside a new zone before the zone transition commits.
 * Prevents chunk loading/unloading thrashing when walking back and forth across zone boundaries.
 * Matches the HUD's HYSTERESIS_FRAMES = 3 pattern.
 */
export const HYSTERESIS_TILES = 3;
