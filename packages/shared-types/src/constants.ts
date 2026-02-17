/**
 * Movement timing constants shared between client and server.
 */

/**
 * Delay between player movement inputs in milliseconds.
 * Both keyboard (WASD) and click-to-move pathfinding use this value.
 * Server rate limit should be slightly lower (125ms) to allow network jitter.
 */
export const MOVE_DELAY_MS = 150;
