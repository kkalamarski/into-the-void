import { Direction, Position } from '@into-the-void/shared-types';
import { findPath } from '@into-the-void/game-logic';
import { useGameStore } from '../../store/gameStore';
import { MovementController } from './MovementController';
import Phaser from 'phaser';
import { IsometricTransform } from '../utils/IsometricTransform';

export class PathfindingController {
  private currentPath: Array<{ x: number; y: number }> = [];
  private pathIndex = 0;
  private executionTimer: number | null = null;
  private movementController: MovementController;
  private moveDelay: number;
  private pathGraphics: Phaser.GameObjects.Graphics | null = null;
  private scene: Phaser.Scene | null = null;
  private isoTransform: IsometricTransform | null = null;

  constructor(
    movementController: MovementController,
    moveDelay = 150,
    scene?: Phaser.Scene,
    isoTransform?: IsometricTransform
  ) {
    this.movementController = movementController;
    this.moveDelay = moveDelay;
    this.scene = scene ?? null;
    this.isoTransform = isoTransform ?? null;
  }

  startPath(targetX: number, targetY: number, collisionMap: boolean[][]): boolean {
    this.cancelPath(); // Cancel any existing path

    const player = useGameStore.getState().player;
    if (!player) return false;

    const startX = player.position.x;
    const startY = player.position.y;

    // Don't pathfind to current position
    if (startX === targetX && startY === targetY) return false;

    // Use existing A* pathfinding from game-logic
    const path = findPath(startX, startY, targetX, targetY, collisionMap);

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

    // Draw path as connected line segments
    this.pathGraphics.lineStyle(2, 0x00ff00, 0.6); // Green, semi-transparent

    const firstTile = this.currentPath[0];
    const firstScreen = this.isoTransform.gridToScreen(firstTile.x, firstTile.y);

    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(firstScreen.x, firstScreen.y);

    for (let i = 1; i < this.currentPath.length; i++) {
      const tile = this.currentPath[i];
      const screen = this.isoTransform.gridToScreen(tile.x, tile.y);
      this.pathGraphics.lineTo(screen.x, screen.y);
    }

    this.pathGraphics.strokePath();

    // Draw waypoint dots
    this.pathGraphics.fillStyle(0x00ff00, 0.8);
    for (const tile of this.currentPath) {
      const screen = this.isoTransform.gridToScreen(tile.x, tile.y);
      this.pathGraphics.fillCircle(screen.x, screen.y, 3);
    }
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

  private getDirection(from: Position, to: { x: number; y: number }): Direction | null {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Cardinal directions only (A* uses cardinal neighbors)
    if (dx === 0 && dy === -1) return 'n';
    if (dx === 0 && dy === 1) return 's';
    if (dx === 1 && dy === 0) return 'e';
    if (dx === -1 && dy === 0) return 'w';

    // Diagonal directions (if pathfinding supports them)
    if (dx === 1 && dy === -1) return 'ne';
    if (dx === -1 && dy === -1) return 'nw';
    if (dx === 1 && dy === 1) return 'se';
    if (dx === -1 && dy === 1) return 'sw';

    return null;
  }
}
