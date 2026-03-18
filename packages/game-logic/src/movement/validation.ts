import { Direction } from '@into-the-void/shared-types';

/**
 * Direction vectors for tile-based movement.
 * Used by creature AI wander behavior (tickWander).
 */
export const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  n: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  e: { dx: 1, dy: 0 },
  w: { dx: -1, dy: 0 },
  ne: { dx: 1, dy: -1 },
  nw: { dx: -1, dy: -1 },
  se: { dx: 1, dy: 1 },
  sw: { dx: -1, dy: 1 },
};
