/**
 * FogManager - Manages fog of war reveal radius and tile tracking
 *
 * Tracks which tiles have been revealed and calculates reveal radius around player position.
 * Uses FogPersistence for localStorage save/load with bitset encoding.
 */

import { FogPersistence } from './FogPersistence';
import { TileRegistry } from '@into-the-void/tiles';

interface QueueItem {
  x: number;
  y: number;
  dist: number;
}

/**
 * Per-biome visibility modifiers for fog of war reveal radius
 * Values < 1.0 reduce visibility in that biome
 */
const BIOME_VISIBILITY_MODIFIERS: Record<string, number> = {
  tidal_pools: 0.85, // Slight visibility reduction (water refraction)
  kelp_forests: 0.7, // Significant reduction (dense vegetation)
  deep_trenches: 0.6, // Major reduction (darkness of the depths)
  // Exotic biomes
  void_rift: 0.7,               // Reduced visibility (reality distortion)
  bioluminescent_depths: 0.75,  // Moderate reduction (uneven glow)
  // Note: crystalline_wastes uses tile-level modifier (1.2) for INCREASED visibility
  // No biome-level entry needed - tiles handle it
  // All other biomes default to 1.0
};

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
   * Get the effective reveal radius for a position based on biome
   * @param biome - The biome type at the player's position
   * @param tileId - Optional tile ID for additional visibility modifier
   * @returns Effective reveal radius (integer)
   */
  getEffectiveRevealRadius(biome?: string, tileId?: string): number {
    let modifier = 1.0;

    // Apply biome modifier
    if (biome && BIOME_VISIBILITY_MODIFIERS[biome]) {
      modifier *= BIOME_VISIBILITY_MODIFIERS[biome];
    }

    // Apply tile-specific modifier if available
    if (tileId) {
      const tileDef = TileRegistry.get(tileId);
      if (tileDef.visibilityModifier !== undefined) {
        modifier *= tileDef.visibilityModifier;
      }
    }

    // Return adjusted radius (minimum 3 tiles for playability)
    return Math.max(3, Math.floor(this.revealRadius * modifier));
  }

  /**
   * Reveal tiles in a radius around the given position
   * Uses iterative BFS to avoid stack overflow with large radii
   * Returns Set of newly revealed tile keys (delta only, not already revealed)
   */
  revealAtPosition(worldX: number, worldY: number, biome?: string, tileId?: string): Set<string> {
    const effectiveRadius = this.getEffectiveRevealRadius(biome, tileId);

    const queue: QueueItem[] = [{ x: worldX, y: worldY, dist: 0 }];
    const visited = new Set<string>();
    const newlyRevealed = new Set<string>();

    while (queue.length > 0) {
      const item = queue.shift()!;
      const { x, y, dist } = item;
      const key = `${x},${y}`;

      // Skip if already visited or beyond radius
      if (visited.has(key) || dist > effectiveRadius) {
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
