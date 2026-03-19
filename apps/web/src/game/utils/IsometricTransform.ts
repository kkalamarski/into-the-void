export class IsometricTransform {
  private tileWidthHalf: number;
  private tileHeightHalf: number;
  private elevationWeight = 0.1; // Conservative weight for elevation in depth calculation

  constructor(
    public readonly tileWidth: number = 256,
    public readonly tileHeight: number = 128
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
   * Convert screen position to tile coordinates with elevation correction.
   * Uses iterative approach: initial guess -> get elevation -> adjust -> re-calculate.
   * Max 2 iterations to ensure convergence.
   *
   * @param screenX - Screen X coordinate
   * @param screenY - Screen Y coordinate
   * @param getElevation - Function to get elevation at grid coordinates
   * @param elevationHeightStep - Pixels per elevation level (default: 32 for 256x256 sprites)
   */
  screenToTileWithElevation(
    screenX: number,
    screenY: number,
    getElevation: (x: number, y: number) => number,
    elevationHeightStep: number = 128
  ): { x: number; y: number } {
    // First pass: get initial tile guess
    let tile = this.screenToTile(screenX, screenY);

    // Second pass: adjust for elevation at that tile
    const elevation = getElevation(tile.x, tile.y);
    if (elevation > 0) {
      const adjustedScreenY = screenY + elevation * elevationHeightStep;
      tile = this.screenToTile(screenX, adjustedScreenY);
    }

    return tile;
  }

  /**
   * Calculate depth value for Y-based sorting.
   *
   * Depth model (all values in same space, no layer separation):
   *   Primary sort:    screen.y = (gridX + gridY) * tileHeightHalf
   *                    Adjacent isometric rows differ by tileHeightHalf (64) depth units.
   *   Entity offset:   tileHeightHalf + 1 (65) so entities render in front of their own
   *                    tile AND the south-row tile walls. In cube-tile rendering, south-row
   *                    tile sprites extend upward into the current diamond, visually
   *                    overlapping entities at the diamond center. An offset of 65 places
   *                    entities just above the south tile depth (64), ensuring they render
   *                    in front of walls (which go below the surface) but still behind
   *                    tiles 2+ rows south (depth 128+).
   *   Elevation:       small weight (0.1) for slight correction on elevated terrain.
   *   Priority boost:  tiny tiebreaker to sort the local player above peer entities at
   *                    the exact same position; must stay << 64 to avoid skipping rows.
   */
  calculateDepth(gridX: number, gridY: number, elevation: number = 0, priorityBoost: number = 0, isEntity: boolean = false): number {
    const screen = this.gridToScreen(gridX, gridY);
    const entityOffset = isEntity ? 99999 : 0; // DEBUG: huge offset to test if depth sorting is the issue
    return screen.y + (gridX * 0.0001) + (elevation * this.elevationWeight) + priorityBoost + entityOffset;
  }

  /**
   * Set elevation weight for runtime tuning of depth calculation.
   * Default: 0.1 (conservative). Research suggests 0.05-0.2 is safe range.
   */
  setElevationWeight(weight: number): void {
    this.elevationWeight = weight;
  }
}
