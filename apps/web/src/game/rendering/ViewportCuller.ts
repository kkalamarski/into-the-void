/**
 * Calculates which tiles are visible within camera viewport.
 * Used for performance optimization - only visible tiles are rendered.
 */
export class ViewportCuller {
  private tileSize: number;
  private cullPaddingX: number;
  private cullPaddingY: number;

  constructor(tileSize: number, padding: number = 2) {
    this.tileSize = tileSize;
    this.cullPaddingX = padding;
    this.cullPaddingY = padding;
  }

  /**
   * Calculate which tiles are visible in camera viewport.
   * Returns min/max tile coordinates that should be rendered.
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

    // Convert to tile coordinates with padding
    const minTileX = Math.max(0, Math.floor(camLeft / this.tileSize) - this.cullPaddingX);
    const maxTileX = Math.ceil(camRight / this.tileSize) + this.cullPaddingX;
    const minTileY = Math.max(0, Math.floor(camTop / this.tileSize) - this.cullPaddingY);
    const maxTileY = Math.ceil(camBottom / this.tileSize) + this.cullPaddingY;

    return { minTileX, maxTileX, minTileY, maxTileY };
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
