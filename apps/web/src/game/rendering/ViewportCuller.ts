import { IsometricTransform } from '../utils/IsometricTransform';
import { ELEVATION_HEIGHT_STEP, MAX_ELEVATION } from '../constants/elevation';

const MAX_STRUCTURE_HEIGHT = MAX_ELEVATION * ELEVATION_HEIGHT_STEP;

/**
 * Calculates which tiles are visible within camera viewport.
 * Used for performance optimization - only visible tiles are rendered.
 */
export class ViewportCuller {
  private tileSize: number;
  private cullPaddingX: number;
  private cullPaddingY: number;
  private isoTransform: IsometricTransform;

  constructor(tileWidth: number = 256, tileHeight: number = 128, padding: number = 4) {
    this.tileSize = tileWidth; // Keep for backwards compat
    this.isoTransform = new IsometricTransform(tileWidth, tileHeight);
    this.cullPaddingX = padding;
    this.cullPaddingY = padding;
  }

  /**
   * Calculate which tiles are visible in camera viewport.
   * For isometric, we convert screen corners to grid space and expand bounds.
   * Uses expanded padding (4 tiles) to account for diamond projection.
   */
  getCullBounds(camera: Phaser.Cameras.Scene2D.Camera): {
    minTileX: number;
    maxTileX: number;
    minTileY: number;
    maxTileY: number;
  } {
    // Get camera world view bounds
    const camLeft = camera.worldView.x;
    const camRight = camLeft + camera.worldView.width;
    const camTop = camera.worldView.y;
    const camBottom = camTop + camera.worldView.height;

    // Expand bounds upward by maximum structure height
    // Tall structures at elevation 5 extend 80px above their grid position
    const expandedCamTop = camTop - MAX_STRUCTURE_HEIGHT;

    // Convert all four corners to grid space
    const topLeft = this.isoTransform.screenToGrid(camLeft, expandedCamTop);
    const topRight = this.isoTransform.screenToGrid(camRight, expandedCamTop);
    const bottomLeft = this.isoTransform.screenToGrid(camLeft, camBottom);
    const bottomRight = this.isoTransform.screenToGrid(camRight, camBottom);

    // Find min/max across all corners
    const minGridX = Math.floor(Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x));
    const maxGridX = Math.ceil(Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x));
    const minGridY = Math.floor(Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y));
    const maxGridY = Math.ceil(Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y));

    // Apply padding (expanded for isometric - 4 tiles per research)
    return {
      minTileX: minGridX - this.cullPaddingX,
      maxTileX: maxGridX + this.cullPaddingX,
      minTileY: minGridY - this.cullPaddingY,
      maxTileY: maxGridY + this.cullPaddingY,
    };
  }

  /**
   * Check if a tile coordinate is within bounds
   */
  isTileVisible(
    x: number,
    y: number,
    bounds: { minTileX: number; maxTileX: number; minTileY: number; maxTileY: number }
  ): boolean {
    return (
      x >= bounds.minTileX &&
      x <= bounds.maxTileX &&
      y >= bounds.minTileY &&
      y <= bounds.maxTileY
    );
  }

  /**
   * Set culling padding (tiles beyond viewport edge)
   */
  setCullPadding(x: number, y: number): void {
    this.cullPaddingX = x;
    this.cullPaddingY = y;
  }
}
