import { Direction, Position, MOVE_DELAY_MS, ZONE_SIZE } from '@into-the-void/shared-types';
import { chebyshevDistance } from '@into-the-void/game-logic';
import { useGameStore } from '../../store/gameStore';
import { MovementController } from './MovementController';
import Phaser from 'phaser';
import { IsometricTransform } from '../utils/IsometricTransform';

const DIAGONAL_COST = Math.SQRT2; // ~1.414
const MAX_PATH_ITERATIONS = 10000; // Safety limit for cross-chunk paths

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

// Collision accessor function type - returns true if tile is blocked
export type CollisionAccessor = (worldX: number, worldY: number) => boolean;

// Elevation accessor function type - returns elevation at world coordinate
export type ElevationAccessor = (worldX: number, worldY: number) => number;

/**
 * Reconstruct path from goal node back to start
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
 * World-coordinate A* pathfinding that works across chunk boundaries.
 * Uses a collision accessor function to check tiles in any chunk.
 */
function findPathWorld(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  isBlocked: CollisionAccessor
): Array<{ x: number; y: number }> | null {
  // Check if start or end is blocked
  if (isBlocked(startX, startY) || isBlocked(endX, endY)) {
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

  while (openSet.length > 0 && iterations < MAX_PATH_ITERATIONS) {
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

      // Skip if already visited
      if (closedSet.has(key)) {
        continue;
      }

      // Prevent corner-cutting for diagonal moves
      if (Math.abs(dir.dx) === 1 && Math.abs(dir.dy) === 1) {
        // Both adjacent cardinal tiles must be passable
        if (isBlocked(current.x + dir.dx, current.y) || isBlocked(current.x, current.y + dir.dy)) {
          continue;
        }
      }

      // Skip if blocked
      if (isBlocked(nx, ny)) {
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

export class PathfindingController {
  private currentPath: Array<{ x: number; y: number }> = [];
  private pathIndex = 0;
  private executionTimer: number | null = null;
  private movementController: MovementController;
  private moveDelay: number;
  private pathGraphics: Phaser.GameObjects.Graphics | null = null;
  private scene: Phaser.Scene | null = null;
  private isoTransform: IsometricTransform | null = null;
  private elevationAccessor: ElevationAccessor | null = null;

  constructor(
    movementController: MovementController,
    moveDelay = MOVE_DELAY_MS,
    scene?: Phaser.Scene,
    isoTransform?: IsometricTransform
  ) {
    this.movementController = movementController;
    this.moveDelay = moveDelay;
    this.scene = scene ?? null;
    this.isoTransform = isoTransform ?? null;
  }

  /**
   * Start pathfinding to target using world coordinates.
   * @param targetX World X coordinate
   * @param targetY World Y coordinate
   * @param isBlocked Collision accessor function that checks any world coordinate
   * @param getElevation Optional elevation accessor for proper marker rendering
   */
  startPath(
    targetX: number,
    targetY: number,
    isBlocked: CollisionAccessor,
    getElevation?: ElevationAccessor
  ): boolean {
    this.cancelPath(); // Cancel any existing path
    this.elevationAccessor = getElevation ?? null;

    const player = useGameStore.getState().player;
    if (!player) return false;

    const startX = player.position.x;
    const startY = player.position.y;

    // Don't pathfind to current position
    if (startX === targetX && startY === targetY) return false;

    // Use world-coordinate A* that works across chunks
    const path = findPathWorld(startX, startY, targetX, targetY, isBlocked);

    if (!path || path.length < 2) {
      console.warn('PathfindingController: No path found to target');
      return false;
    }

    this.currentPath = path;
    this.pathIndex = 1; // Skip current position (index 0)

    // Draw path visualization
    this.drawPath();

    this.executeNextStep();
    return true;
  }

  private drawPath(): void {
    // Skip if no scene/transform (backward compatibility)
    if (!this.scene || !this.isoTransform) return;

    // Create or clear graphics
    if (this.pathGraphics) {
      this.pathGraphics.clear();
    } else {
      this.pathGraphics = this.scene.add.graphics();
      this.pathGraphics.setDepth(10000); // Above all game objects
    }

    if (this.currentPath.length < 2) return;

    // Only draw destination marker (full path will use sprites later)
    const destination = this.currentPath[this.currentPath.length - 1];
    const destScreen = this.isoTransform.gridToScreen(destination.x, destination.y);

    // Get elevation offset for destination tile
    const elevation = this.elevationAccessor?.(destination.x, destination.y) ?? 0;
    const elevationOffset = elevation * 16; // ELEVATION_HEIGHT_STEP

    // Apply elevation offset to Y coordinate (higher = visually higher)
    const destY = destScreen.y - elevationOffset;

    // Draw isometric diamond outline at destination
    const hw = 64; // Half tile width (128/2)
    const hh = 32; // Half tile height (64/2)

    this.pathGraphics.lineStyle(2, 0x00ff00, 0.8);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(destScreen.x, destY - hh); // Top
    this.pathGraphics.lineTo(destScreen.x + hw, destY); // Right
    this.pathGraphics.lineTo(destScreen.x, destY + hh); // Bottom
    this.pathGraphics.lineTo(destScreen.x - hw, destY); // Left
    this.pathGraphics.closePath();
    this.pathGraphics.strokePath();

    // Fill with semi-transparent green
    this.pathGraphics.fillStyle(0x00ff00, 0.2);
    this.pathGraphics.fillPoints([
      { x: destScreen.x, y: destY - hh },
      { x: destScreen.x + hw, y: destY },
      { x: destScreen.x, y: destY + hh },
      { x: destScreen.x - hw, y: destY },
    ], true);
  }

  private clearPathGraphics(): void {
    if (this.pathGraphics) {
      this.pathGraphics.clear();
    }
  }

  private executeNextStep(): void {
    if (this.pathIndex >= this.currentPath.length) {
      // Path complete
      this.clearPathGraphics();
      this.currentPath = [];
      this.pathIndex = 0;
      return;
    }

    const player = useGameStore.getState().player;
    if (!player) {
      this.cancelPath();
      return;
    }

    const current = player.position;
    const next = this.currentPath[this.pathIndex];

    // Calculate direction to next tile
    const direction = this.getDirection(current, next);

    if (direction) {
      // Use same client prediction as WASD
      this.movementController.processInput(direction);
      this.pathIndex++;

      // Schedule next step after movement delay
      this.executionTimer = window.setTimeout(
        () => this.executeNextStep(),
        this.moveDelay
      );
    } else {
      // Invalid step (shouldn't happen with valid path)
      console.warn('PathfindingController: Invalid step in path');
      this.cancelPath();
    }
  }

  cancelPath(): void {
    if (this.executionTimer !== null) {
      clearTimeout(this.executionTimer);
      this.executionTimer = null;
    }
    this.currentPath = [];
    this.pathIndex = 0;

    // Clear path visualization
    this.clearPathGraphics();
  }

  isPathActive(): boolean {
    return this.currentPath.length > 0;
  }

  getRemainingSteps(): number {
    return Math.max(0, this.currentPath.length - this.pathIndex);
  }

  destroy(): void {
    this.cancelPath();
    if (this.pathGraphics) {
      this.pathGraphics.destroy();
      this.pathGraphics = null;
    }
    this.scene = null;
    this.isoTransform = null;
  }

  private getDirection(from: Position, to: { x: number; y: number }): Direction | null {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Cardinal directions
    if (dx === 0 && dy === -1) return 'n';
    if (dx === 0 && dy === 1) return 's';
    if (dx === 1 && dy === 0) return 'e';
    if (dx === -1 && dy === 0) return 'w';

    // Diagonal directions
    if (dx === 1 && dy === -1) return 'ne';
    if (dx === -1 && dy === -1) return 'nw';
    if (dx === 1 && dy === 1) return 'se';
    if (dx === -1 && dy === 1) return 'sw';

    return null;
  }
}
