/**
 * FogRenderer - Manages fog of war visual overlay using RenderTexture
 *
 * Creates a dark overlay that covers unexplored tiles. As tiles are revealed,
 * erases fog using Graphics shapes. Uses RenderTexture for efficient WebGL rendering.
 */

import Phaser from 'phaser';
import { IsometricTransform } from '../utils/IsometricTransform';
import { FogManager } from './FogManager';

export class FogRenderer {
  private scene: Phaser.Scene;
  private isoTransform: IsometricTransform;
  private fogTexture: Phaser.GameObjects.RenderTexture | null = null;
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private lastCameraX: number = 0;
  private lastCameraY: number = 0;

  constructor(scene: Phaser.Scene, isoTransform: IsometricTransform) {
    this.scene = scene;
    this.isoTransform = isoTransform;
  }

  /**
   * Initialize fog rendering system
   * Creates RenderTexture and Graphics objects for fog overlay
   */
  create(): void {
    const camera = this.scene.cameras.main;
    const width = camera.width;
    const height = camera.height;

    // Create RenderTexture sized to viewport (not full world)
    this.fogTexture = this.scene.add.renderTexture(0, 0, width, height);

    // Fill with dark overlay (60% opacity for dim visibility of terrain)
    this.fogTexture.fill(0x000000, 0.6);

    // Set blend mode to MULTIPLY for darkening effect
    this.fogTexture.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Set depth to 1000 (above terrain ~100-200, below UI ~2000)
    this.fogTexture.setDepth(1000);

    // Set scroll factor to follow camera
    this.fogTexture.setScrollFactor(1, 1);

    // Create Graphics object for drawing erase shapes
    this.graphics = this.scene.add.graphics();

    // Store initial camera position
    this.lastCameraX = camera.scrollX;
    this.lastCameraY = camera.scrollY;

    // Position fog texture at camera position
    this.fogTexture.setPosition(camera.scrollX, camera.scrollY);
  }

  /**
   * Reveal multiple tiles in a batch (optimized for performance)
   * Batches all erases into single WebGL draw call
   */
  revealTiles(tiles: Set<string>): void {
    if (!this.fogTexture || !this.graphics || tiles.size === 0) return;

    const camera = this.scene.cameras.main;
    this.graphics.clear();
    this.graphics.fillStyle(0xffffff, 1.0);

    // Batch draw all circles
    for (const tileKey of tiles) {
      const [worldXStr, worldYStr] = tileKey.split(',');
      const worldX = parseInt(worldXStr, 10);
      const worldY = parseInt(worldYStr, 10);

      // Convert world coords to screen coords
      const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

      // Account for camera scroll and fog texture position
      const localX = screenPos.x - camera.scrollX;
      const localY = screenPos.y - camera.scrollY;

      // Draw white circle at screen position (radius = half tile width for good coverage)
      const radius = this.isoTransform.tileWidth / 2;
      this.graphics.fillCircle(localX, localY, radius);
    }

    // Single erase call for all circles (batched WebGL operation)
    this.fogTexture.erase(this.graphics);
  }

  /**
   * Reveal a single tile at world coordinates
   */
  revealTile(worldX: number, worldY: number): void {
    if (!this.fogTexture || !this.graphics) return;

    const camera = this.scene.cameras.main;
    this.graphics.clear();
    this.graphics.fillStyle(0xffffff, 1.0);

    // Convert world coords to screen coords
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

    // Account for camera scroll and fog texture position
    const localX = screenPos.x - camera.scrollX;
    const localY = screenPos.y - camera.scrollY;

    // Draw white circle and erase from RenderTexture
    const radius = this.isoTransform.tileWidth / 2;
    this.graphics.fillCircle(localX, localY, radius);
    this.fogTexture.erase(this.graphics);
  }

  /**
   * Rebuild fog from saved state (called on game load)
   * Clears fog and reveals all previously explored tiles
   */
  redrawFromState(fogManager: FogManager): void {
    if (!this.fogTexture) return;

    // Clear and refill with dark overlay
    this.fogTexture.clear();
    this.fogTexture.fill(0x000000, 0.6);

    // Get all revealed tiles from FogManager
    const revealedTiles = fogManager.getAllRevealedTiles();

    // Batch reveal all previously explored tiles
    if (revealedTiles.size > 0) {
      this.revealTiles(revealedTiles);
    }
  }

  /**
   * Update fog position to follow camera
   * Only updates if camera has moved (optimization)
   */
  updatePosition(camera: Phaser.Cameras.Scene2D.Camera): void {
    if (!this.fogTexture) return;

    // Only update if camera moved
    if (camera.scrollX !== this.lastCameraX || camera.scrollY !== this.lastCameraY) {
      this.fogTexture.setPosition(camera.scrollX, camera.scrollY);
      this.lastCameraX = camera.scrollX;
      this.lastCameraY = camera.scrollY;
    }
  }

  /**
   * Cleanup RenderTexture and Graphics objects
   */
  destroy(): void {
    if (this.fogTexture) {
      this.fogTexture.destroy();
      this.fogTexture = null;
    }
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
