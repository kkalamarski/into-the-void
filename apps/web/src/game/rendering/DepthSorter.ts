import Phaser from 'phaser';
import { IsometricTransform } from '../utils/IsometricTransform';

/**
 * Manages depth sorting for entities with throttled updates.
 * Entities marked dirty have their depth recalculated on next update cycle.
 * Update frequency: 100ms (Claude's discretion for performance vs visual quality).
 */
export class DepthSorter {
  private lastUpdateTime = 0;
  private updateInterval = 100; // ms between depth updates
  private dirtyEntities = new Set<string>();
  private localPlayerId: string | null = null;
  private localPlayerPriority = 0.001; // Small boost to ensure local player visible

  /**
   * Mark an entity as needing depth recalculation.
   * Called when entity position changes.
   */
  markDirty(entityId: string): void {
    this.dirtyEntities.add(entityId);
  }

  /**
   * Set local player ID for priority boost.
   */
  setLocalPlayer(playerId: string): void {
    this.localPlayerId = playerId;
  }

  /**
   * Update depths for dirty entities.
   * Throttled to updateInterval (100ms).
   *
   * @param time - Current game time in ms
   * @param entities - Map of entity ID to Phaser container
   * @param isoTransform - IsometricTransform for depth calculation
   */
  update(
    time: number,
    entities: Map<string, Phaser.GameObjects.Container>,
    isoTransform: IsometricTransform
  ): void {
    // Throttle updates
    if (time - this.lastUpdateTime < this.updateInterval) return;
    if (this.dirtyEntities.size === 0) return;

    this.dirtyEntities.forEach(id => {
      const container = entities.get(id);
      if (!container) return;

      const gridX = container.getData('gridX') as number;
      const gridY = container.getData('gridY') as number;
      const elevation = (container.getData('elevation') as number) ?? 0;

      if (gridX === undefined || gridY === undefined) return;

      // Apply priority boost for local player
      const priorityBoost = id === this.localPlayerId ? this.localPlayerPriority : 0;
      const depth = isoTransform.calculateDepth(gridX, gridY, elevation, priorityBoost, true);
      container.setDepth(depth);
    });

    this.dirtyEntities.clear();
    this.lastUpdateTime = time;
  }

  /**
   * Force immediate depth update for an entity.
   * Use sparingly - bypasses throttling.
   */
  updateImmediate(
    entityId: string,
    container: Phaser.GameObjects.Container,
    isoTransform: IsometricTransform
  ): void {
    const gridX = container.getData('gridX') as number;
    const gridY = container.getData('gridY') as number;
    const elevation = (container.getData('elevation') as number) ?? 0;

    if (gridX === undefined || gridY === undefined) return;

    const priorityBoost = entityId === this.localPlayerId ? this.localPlayerPriority : 0;
    const depth = isoTransform.calculateDepth(gridX, gridY, elevation, priorityBoost, true);
    container.setDepth(depth);

    // Remove from dirty set since we just updated
    this.dirtyEntities.delete(entityId);
  }

  /**
   * Set update interval in milliseconds.
   * Lower = smoother but more CPU, higher = choppier but lighter.
   */
  setUpdateInterval(ms: number): void {
    this.updateInterval = Math.max(16, ms); // Minimum ~60fps
  }

  /**
   * Clear all dirty entities.
   */
  clear(): void {
    this.dirtyEntities.clear();
  }
}
