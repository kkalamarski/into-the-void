/**
 * FogManager - Manages fog of war reveal radius and tile tracking
 *
 * Tracks which tiles have been revealed and calculates reveal radius around player position.
 * Uses FogPersistence for localStorage save/load with bitset encoding.
 */

import { FogPersistence } from './FogPersistence';

interface QueueItem {
  x: number;
  y: number;
  dist: number;
}

export class FogManager {
  private persistence: FogPersistence;
  private characterId: string;
  private revealRadius: number;
  private lastSaveTime: number = 0;
  private readonly SAVE_THROTTLE_MS = 5000; // Max once per 5 seconds

  constructor(characterId: string, revealRadius: number = 8) {
    this.characterId = characterId;
    this.revealRadius = revealRadius;
    this.persistence = new FogPersistence();
  }

  /**
   * Initialize fog state from localStorage
   * Returns true if existing state was loaded, false if starting fresh
   */
  initialize(): boolean {
    return this.persistence.load(this.characterId);
  }

  /**
   * Reveal tiles in a radius around the given position
   * Uses iterative BFS to avoid stack overflow with large radii
   * Returns Set of newly revealed tile keys (delta only, not already revealed)
   */
  revealAtPosition(worldX: number, worldY: number): Set<string> {
    const queue: QueueItem[] = [{ x: worldX, y: worldY, dist: 0 }];
    const visited = new Set<string>();
    const newlyRevealed = new Set<string>();

    while (queue.length > 0) {
      const item = queue.shift()!;
      const { x, y, dist } = item;
      const key = `${x},${y}`;

      // Skip if already visited or beyond radius
      if (visited.has(key) || dist > this.revealRadius) {
        continue;
      }

      visited.add(key);

      // Only mark as newly revealed if it wasn't already revealed
      if (!this.persistence.isRevealed(x, y)) {
        this.persistence.setRevealed(x, y);
        newlyRevealed.add(key);
      }

      // Expand in 4 directions (manhattan distance-based radius)
      const directions: Array<[number, number]> = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        const nextKey = `${nx},${ny}`;

        if (!visited.has(nextKey)) {
          queue.push({ x: nx, y: ny, dist: dist + 1 });
        }
      }
    }

    // Auto-save if new tiles were revealed (throttled)
    if (newlyRevealed.size > 0) {
      this.throttledSave();
    }

    return newlyRevealed;
  }

  /**
   * Check if a specific tile is revealed
   */
  isRevealed(worldX: number, worldY: number): boolean {
    return this.persistence.isRevealed(worldX, worldY);
  }

  /**
   * Persist current fog state to localStorage
   * Returns true on success, false on error
   */
  save(): boolean {
    this.lastSaveTime = Date.now();
    return this.persistence.save(this.characterId);
  }

  /**
   * Save with throttling to prevent localStorage spam
   * Only saves if at least SAVE_THROTTLE_MS has elapsed since last save
   */
  private throttledSave(): void {
    const now = Date.now();
    if (now - this.lastSaveTime >= this.SAVE_THROTTLE_MS) {
      this.save();
    }
  }

  /**
   * Get total count of revealed tiles
   */
  getRevealedCount(): number {
    return this.persistence.getRevealedCount();
  }

  /**
   * Get all revealed tile coordinates as Set<"worldX,worldY">
   * Used by FogRenderer.redrawFromState() to restore fog overlay on game load
   */
  getAllRevealedTiles(): Set<string> {
    return this.persistence.getAllRevealedTiles();
  }

  /**
   * Force immediate save (call on game exit/unmount)
   */
  flush(): boolean {
    return this.save();
  }
}
