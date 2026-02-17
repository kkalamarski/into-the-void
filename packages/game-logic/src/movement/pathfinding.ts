import { ZONE_SIZE } from '@into-the-void/shared-types';

const ELEVATION_CLIMB_COST = 0.5; // Additional cost per elevation level climbed
const DIAGONAL_COST = Math.SQRT2; // ~1.414

interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic (estimated cost to goal)
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

/**
 * Calculate Manhattan distance between two points
 */
export function manhattanDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Calculate Chebyshev distance (allows diagonals)
 */
export function chebyshevDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

/**
 * Find path using A* algorithm (within a single zone)
 */
export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  collisionMap: boolean[][],
  maxIterations = 1000
): Array<{ x: number; y: number }> | null {
  // Validate start and end positions
  if (
    startX < 0 ||
    startX >= ZONE_SIZE ||
    startY < 0 ||
    startY >= ZONE_SIZE ||
    endX < 0 ||
    endX >= ZONE_SIZE ||
    endY < 0 ||
    endY >= ZONE_SIZE
  ) {
    return null;
  }

  // Check if start or end is blocked
  if (collisionMap[startY]?.[startX] || collisionMap[endY]?.[endX]) {
    return null;
  }

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: startX,
    y: startY,
    g: 0,
    h: chebyshevDistance(startX, startY, endX, endY),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  const directions = [
    { dx: 0, dy: -1, cost: 1.0 },   // N
    { dx: 0, dy: 1, cost: 1.0 },    // S
    { dx: 1, dy: 0, cost: 1.0 },    // E
    { dx: -1, dy: 0, cost: 1.0 },   // W
    { dx: 1, dy: -1, cost: DIAGONAL_COST },  // NE
    { dx: -1, dy: -1, cost: DIAGONAL_COST }, // NW
    { dx: 1, dy: 1, cost: DIAGONAL_COST },   // SE
    { dx: -1, dy: 1, cost: DIAGONAL_COST },  // SW
  ];

  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    // Check if we reached the goal
    if (current.x === endX && current.y === endY) {
      return reconstructPath(current);
    }

    closedSet.add(`${current.x},${current.y}`);

    // Check neighbors
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const key = `${nx},${ny}`;

      // Skip if out of bounds
      if (nx < 0 || nx >= ZONE_SIZE || ny < 0 || ny >= ZONE_SIZE) {
        continue;
      }

      // Prevent corner-cutting for diagonal moves
      if (Math.abs(dir.dx) === 1 && Math.abs(dir.dy) === 1) {
        // Both adjacent cardinal tiles must be passable
        const cardinalX = current.x + dir.dx;
        const cardinalY = current.y + dir.dy;
        if (collisionMap[current.y]?.[cardinalX] || collisionMap[cardinalY]?.[current.x]) {
          continue; // Skip this diagonal - would cut through corner
        }
      }

      // Skip if blocked or already visited
      if (collisionMap[ny]?.[nx] || closedSet.has(key)) {
        continue;
      }

      const g = current.g + dir.cost;
      const h = chebyshevDistance(nx, ny, endX, endY);
      const f = g + h;

      // Check if this path is better
      const existingNode = openSet.find((n) => n.x === nx && n.y === ny);
      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openSet.push({ x: nx, y: ny, g, h, f, parent: current });
      }
    }
  }

  return null; // No path found
}

/**
 * Reconstruct path from goal node to start
 */
function reconstructPath(node: PathNode): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];
  let current: PathNode | null = node;

  while (current) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }

  return path;
}

/**
 * Check if there is a clear line of sight between two points
 */
export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  collisionMap: boolean[][]
): boolean {
  // Bresenham's line algorithm
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;

  let x = x1;
  let y = y1;

  while (x !== x2 || y !== y2) {
    if (collisionMap[y]?.[x]) {
      return false;
    }

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return !collisionMap[y2]?.[x2];
}

/**
 * Get positions within a certain range that are reachable
 */
export function getReachablePositions(
  startX: number,
  startY: number,
  range: number,
  collisionMap: boolean[][]
): Array<{ x: number; y: number; distance: number }> {
  const reachable: Array<{ x: number; y: number; distance: number }> = [];
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number; distance: number }> = [
    { x: startX, y: startY, distance: 0 },
  ];

  visited.add(`${startX},${startY}`);

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.distance > 0) {
      reachable.push(current);
    }

    if (current.distance >= range) {
      continue;
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const key = `${nx},${ny}`;

      if (
        nx >= 0 &&
        nx < ZONE_SIZE &&
        ny >= 0 &&
        ny < ZONE_SIZE &&
        !visited.has(key) &&
        !collisionMap[ny]?.[nx]
      ) {
        visited.add(key);
        queue.push({ x: nx, y: ny, distance: current.distance + 1 });
      }
    }
  }

  return reachable;
}

/**
 * Find path using A* algorithm with elevation costs (within a single zone)
 * Blocks movement when elevation difference > 1, adds cost penalty for uphill movement
 */
export function findPathWithElevation(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  collisionMap: boolean[][],
  heights: number[][],
  maxIterations = 1000
): Array<{ x: number; y: number }> | null {
  // Validate start and end positions
  if (
    startX < 0 ||
    startX >= ZONE_SIZE ||
    startY < 0 ||
    startY >= ZONE_SIZE ||
    endX < 0 ||
    endX >= ZONE_SIZE ||
    endY < 0 ||
    endY >= ZONE_SIZE
  ) {
    return null;
  }

  // Check if start or end is blocked
  if (collisionMap[startY]?.[startX] || collisionMap[endY]?.[endX]) {
    return null;
  }

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: startX,
    y: startY,
    g: 0,
    h: manhattanDistance(startX, startY, endX, endY),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  const directions = [
    { dx: 0, dy: -1 }, // N
    { dx: 0, dy: 1 }, // S
    { dx: 1, dy: 0 }, // E
    { dx: -1, dy: 0 }, // W
  ];

  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    // Check if we reached the goal
    if (current.x === endX && current.y === endY) {
      return reconstructPath(current);
    }

    closedSet.add(`${current.x},${current.y}`);

    // Get current height for elevation checks
    const currentHeight = heights[current.y]?.[current.x] ?? 0;

    // Check neighbors
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const key = `${nx},${ny}`;

      // Skip if out of bounds
      if (nx < 0 || nx >= ZONE_SIZE || ny < 0 || ny >= ZONE_SIZE) {
        continue;
      }

      // Skip if blocked or already visited
      if (collisionMap[ny]?.[nx] || closedSet.has(key)) {
        continue;
      }

      // Calculate elevation-based movement cost
      const neighborHeight = heights[ny]?.[nx] ?? 0;
      const elevationDelta = neighborHeight - currentHeight;

      // Block if too steep (same rule as movement validation)
      if (Math.abs(elevationDelta) > 1) {
        continue; // Skip this neighbor
      }

      // Base cost = 1 for flat/downhill, add penalty for uphill
      let moveCost = 1.0;
      if (elevationDelta > 0) {
        moveCost += elevationDelta * ELEVATION_CLIMB_COST;
      }

      const g = current.g + moveCost;
      const h = manhattanDistance(nx, ny, endX, endY);
      const f = g + h;

      // Check if this path is better
      const existingNode = openSet.find((n) => n.x === nx && n.y === ny);
      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openSet.push({ x: nx, y: ny, g, h, f, parent: current });
      }
    }
  }

  return null; // No path found
}
