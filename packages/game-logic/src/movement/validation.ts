import {
  Position,
  Direction,
  CardinalDirection,
  ZONE_SIZE,
} from '@into-the-void/shared-types';

/**
 * Direction vectors for movement
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

/**
 * Terrain types that affect movement
 */
export type TerrainType = 'ground' | 'water' | 'blocked' | 'slow';

/**
 * Check if a position is within zone bounds
 */
export function isWithinZoneBounds(x: number, y: number): boolean {
  return x >= 0 && x < ZONE_SIZE && y >= 0 && y < ZONE_SIZE;
}

/**
 * Calculate new position after movement
 */
export function calculateNewPosition(
  from: Position,
  direction: Direction
): Position {
  const vector = DIRECTION_VECTORS[direction];
  let newX = from.x + vector.dx;
  let newY = from.y + vector.dy;
  let newZoneId = from.zoneId;

  // Handle zone transitions
  if (newX < 0) {
    newX = ZONE_SIZE - 1;
    newZoneId = getAdjacentZoneId(from.zoneId, 'w');
  } else if (newX >= ZONE_SIZE) {
    newX = 0;
    newZoneId = getAdjacentZoneId(from.zoneId, 'e');
  }

  if (newY < 0) {
    newY = ZONE_SIZE - 1;
    newZoneId = getAdjacentZoneId(from.zoneId, 'n');
  } else if (newY >= ZONE_SIZE) {
    newY = 0;
    newZoneId = getAdjacentZoneId(from.zoneId, 's');
  }

  return { x: newX, y: newY, zoneId: newZoneId };
}

/**
 * Get adjacent zone ID based on direction
 */
export function getAdjacentZoneId(
  zoneId: string,
  direction: CardinalDirection
): string {
  const [, x, y] = zoneId.split('_').map(Number);
  const vector = DIRECTION_VECTORS[direction];
  return `z_${x + vector.dx}_${y + vector.dy}`;
}

/**
 * Validate movement from one position to another
 */
export function validateMovement(
  from: Position,
  to: Position,
  collisionMap: boolean[][]
): { valid: boolean; reason?: string } {
  // Check if destination is within bounds
  if (!isWithinZoneBounds(to.x, to.y)) {
    return { valid: false, reason: 'Out of bounds' };
  }

  // Check collision map
  if (collisionMap[to.y]?.[to.x]) {
    return { valid: false, reason: 'Blocked terrain' };
  }

  // Check movement distance (should be 1 tile for grid movement)
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);

  // Allow same-zone movement of 1 tile
  if (from.zoneId === to.zoneId) {
    if (dx > 1 || dy > 1) {
      return { valid: false, reason: 'Movement too far' };
    }
  }

  return { valid: true };
}

/**
 * Validate movement with elevation checks
 * Blocks movement when elevation difference is greater than 1 level
 */
export function validateMovementWithElevation(
  from: Position,
  to: Position,
  collisionMap: boolean[][],
  heights: number[][]
): { valid: boolean; reason?: string } {
  // Check elevation delta BEFORE other checks (terrain steepness is primary blocker)
  const fromHeight = heights[from.y]?.[from.x] ?? 0;
  const toHeight = heights[to.y]?.[to.x] ?? 0;
  const elevationDelta = Math.abs(toHeight - fromHeight);

  if (elevationDelta > 1) {
    return { valid: false, reason: 'Terrain too steep' };
  }

  // Delegate remaining checks to original validateMovement
  return validateMovement(from, to, collisionMap);
}

/**
 * Check if movement would cause a zone transition
 */
export function isZoneTransition(from: Position, to: Position): boolean {
  return from.zoneId !== to.zoneId;
}

/**
 * Get all positions adjacent to a given position
 */
export function getAdjacentPositions(
  position: Position,
  includeDiagonals = false
): Position[] {
  const directions: Direction[] = includeDiagonals
    ? ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
    : ['n', 's', 'e', 'w'];

  return directions.map((dir) => calculateNewPosition(position, dir));
}
