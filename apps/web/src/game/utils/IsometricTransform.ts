export class IsometricTransform {
  private tileWidthHalf: number;
  private tileHeightHalf: number;
  private elevationWeight = 0.1; // Conservative weight for elevation in depth calculation

  constructor(
    public readonly tileWidth: number = 128,
    public readonly tileHeight: number = 64
  ) {
    this.tileWidthHalf = tileWidth / 2;
    this.tileHeightHalf = tileHeight / 2;
  }

  /**
   * Convert grid coordinates to screen position (isometric diamond center).
   * Formula: x_iso = (gridX - gridY) * tileWidthHalf
   *          y_iso = (gridX + gridY) * tileHeightHalf
   */
  gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: (gridX - gridY) * this.tileWidthHalf,
      y: (gridX + gridY) * this.tileHeightHalf
    };
  }

  /**
   * Convert screen position to grid coordinates (floating-point).
   * Inverse of gridToScreen formula.
   */
  screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this.tileWidth + screenY / this.tileHeight,
      y: screenY / this.tileHeight - screenX / this.tileWidth
    };
  }

  /**
   * Convert screen position to tile coordinates (integer grid).
   * Floors the floating-point grid coordinates.
   */
  screenToTile(screenX: number, screenY: number): { x: number; y: number } {
    const grid = this.screenToGrid(screenX, screenY);
    return {
      x: Math.floor(grid.x),
      y: Math.floor(grid.y)
    };
  }

  /**
   * Calculate depth value for Y-based sorting.
   * Uses screen Y position with grid X as tiebreaker (rightmost in front).
   * Elevation component ensures entities on higher terrain render in front.
   */
  calculateDepth(gridX: number, gridY: number, elevation: number = 0, priorityBoost: number = 0): number {
    const screen = this.gridToScreen(gridX, gridY);
    return screen.y + (gridX * 0.0001) + (elevation * this.elevationWeight) + priorityBoost;
  }

  /**
   * Set elevation weight for runtime tuning of depth calculation.
   * Default: 0.1 (conservative). Research suggests 0.05-0.2 is safe range.
   */
  setElevationWeight(weight: number): void {
    this.elevationWeight = weight;
  }
}
