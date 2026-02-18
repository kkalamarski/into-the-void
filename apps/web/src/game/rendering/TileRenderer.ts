import Phaser from 'phaser';
import { TileId, tileIdToString } from '@into-the-void/world-gen';
import { TileRegistry } from '@into-the-void/tiles';
import { IsometricTransform } from '../utils/IsometricTransform';

const ELEVATION_HEIGHT_STEP = 16; // Pixels per elevation level (5 levels = 80px max)

/**
 * Mapping from TileId enum to Phaser texture keys
 */
export const TILE_TEXTURE_MAP: Record<TileId, string> = {
  [TileId.VOID_FLOOR]: 'tile_void_floor',
  [TileId.VOID_WALL]: 'tile_void_wall',
  [TileId.CRYSTAL_FLOOR]: 'tile_crystal_floor',
  [TileId.CRYSTAL_FORMATION]: 'tile_crystal_formation',
  [TileId.TOXIC_FLOOR]: 'tile_toxic_floor',
  [TileId.TOXIC_POOL]: 'tile_toxic_pool',
  [TileId.RUINS_FLOOR]: 'tile_ruins_floor',
  [TileId.RUINS_WALL]: 'tile_ruins_wall',
  [TileId.ICE_FLOOR]: 'tile_ice_floor',
  [TileId.ICE_WALL]: 'tile_ice_wall',
  [TileId.VOLCANIC_FLOOR]: 'tile_volcanic_floor',
  [TileId.LAVA]: 'tile_lava',
  [TileId.FUNGAL_FLOOR]: 'tile_fungal_floor',
  [TileId.FUNGAL_GROWTH]: 'tile_fungal_growth',
  [TileId.CRATER_FLOOR]: 'tile_crater_floor',
  [TileId.CRATER_DEBRIS]: 'tile_crater_debris',
};

/**
 * Utility class for rendering tiles in the game world
 */
export class TileRenderer {
  private scene: Phaser.Scene;
  private tileSize: number;
  private isoTransform: IsometricTransform;

  constructor(scene: Phaser.Scene, tileWidth: number = 128, tileHeight: number = 64) {
    this.scene = scene;
    this.tileSize = tileWidth; // Keep for backwards compat, but tileWidth is primary
    this.isoTransform = new IsometricTransform(tileWidth, tileHeight);
  }

  /**
   * Get texture key for a tile ID
   */
  getTextureKey(tileId: TileId): string {
    return TILE_TEXTURE_MAP[tileId] ?? 'tile_void_floor';
  }

  /**
   * Create a tile at grid position.
   * Returns a diamond-shaped polygon graphic (placeholder until isometric sprites are available).
   */
  createTile(x: number, y: number, tileId: TileId): Phaser.GameObjects.GameObject {
    const screenPos = this.isoTransform.gridToScreen(x, y);
    const color = this.getTileColor(tileId);

    // Create isometric diamond polygon
    // Diamond points: top, right, bottom, left (relative to center)
    const halfWidth = this.isoTransform.tileWidth / 2;
    const halfHeight = this.isoTransform.tileHeight / 2;

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(screenPos.x, screenPos.y - halfHeight);      // Top
    graphics.lineTo(screenPos.x + halfWidth, screenPos.y);       // Right
    graphics.lineTo(screenPos.x, screenPos.y + halfHeight);      // Bottom
    graphics.lineTo(screenPos.x - halfWidth, screenPos.y);       // Left
    graphics.closePath();
    graphics.fillPath();

    // Add subtle border for visibility
    graphics.lineStyle(1, 0x000000, 0.2);
    graphics.beginPath();
    graphics.moveTo(screenPos.x, screenPos.y - halfHeight);
    graphics.lineTo(screenPos.x + halfWidth, screenPos.y);
    graphics.lineTo(screenPos.x, screenPos.y + halfHeight);
    graphics.lineTo(screenPos.x - halfWidth, screenPos.y);
    graphics.closePath();
    graphics.strokePath();

    graphics.setDepth(screenPos.y);

    return graphics;
  }

  /**
   * Get color for a tile ID from TileRegistry (single source of truth)
   */
  private getTileColor(tileId: TileId): number {
    const stringId = tileIdToString(tileId);
    const tileDef = TileRegistry.get(stringId);
    return tileDef.color;
  }

  /**
   * Get tile size
   */
  getTileSize(): number {
    return this.tileSize;
  }

  /**
   * Get the isometric transform instance
   */
  getTransform(): IsometricTransform {
    return this.isoTransform;
  }

  /**
   * Create a tile with elevation support, including side faces for height differences.
   * Returns a container with proper depth and elevation offset.
   */
  createTileWithElevation(
    x: number,
    y: number,
    tileId: TileId,
    elevation: number,
    heights: number[][]
  ): Phaser.GameObjects.Container {
    const screenPos = this.isoTransform.gridToScreen(x, y);
    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;

    // Create container at elevated position
    const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset);
    container.setData('gridX', x);
    container.setData('gridY', y);
    container.setData('elevation', elevation);

    // Add side faces FIRST (render behind top face)

    // South face (if south neighbor is lower)
    if (y < heights.length - 1 && heights[y + 1][x] < elevation) {
      const elevationSteps = elevation - heights[y + 1][x];
      const southFace = this.createSouthFace(elevationSteps);
      container.add(southFace);
    }

    // East face (if east neighbor is lower)
    if (x < heights[0].length - 1 && heights[y][x + 1] < elevation) {
      const elevationSteps = elevation - heights[y][x + 1];
      const eastFace = this.createEastFace(elevationSteps);
      container.add(eastFace);
    }

    // Add top face (renders in front of side faces)
    const topFace = this.createTopFace(tileId);
    container.add(topFace);

    // Set depth using composite depth calculation
    const depth = this.isoTransform.calculateDepth(x, y, elevation);
    container.setDepth(depth);

    return container;
  }

  /**
   * Create a tile using WORLD coordinates for position and depth.
   * This ensures tiles participate in global depth sorting with players/entities.
   * @param worldX World grid X coordinate (chunkX * ZONE_SIZE + localX)
   * @param worldY World grid Y coordinate (chunkY * ZONE_SIZE + localY)
   * @param tileId The tile type
   * @param elevation Tile elevation
   * @param heights Local heights array for side face calculation
   * @param localX Local X within chunk (for heights array lookup)
   * @param localY Local Y within chunk (for heights array lookup)
   */
  createTileWithElevationWorld(
    worldX: number,
    worldY: number,
    tileId: TileId,
    elevation: number,
    heights: number[][],
    localX: number,
    localY: number
  ): Phaser.GameObjects.Container {
    // Use world coordinates for screen position
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);
    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;

    // Create container at world screen position
    const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset);
    container.setData('gridX', worldX);
    container.setData('gridY', worldY);
    container.setData('elevation', elevation);

    // Add side faces FIRST (render behind top face)
    // Use local coordinates for heights array lookup

    // South face (if south neighbor is lower)
    if (localY < heights.length - 1 && heights[localY + 1][localX] < elevation) {
      const elevationSteps = elevation - heights[localY + 1][localX];
      const southFace = this.createSouthFace(elevationSteps);
      container.add(southFace);
    }

    // East face (if east neighbor is lower)
    if (localX < heights[0].length - 1 && heights[localY][localX + 1] < elevation) {
      const elevationSteps = elevation - heights[localY][localX + 1];
      const eastFace = this.createEastFace(elevationSteps);
      container.add(eastFace);
    }

    // Add top face (renders in front of side faces)
    const topFace = this.createTopFace(tileId);
    container.add(topFace);

    // Set depth using WORLD coordinates for global sorting
    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation);
    container.setDepth(depth);

    return container;
  }

  /**
   * Create south-facing side face for elevated tiles.
   * Grid-south (y+1) is screen bottom-LEFT, so this face extends from bottom to left edge.
   * Renders as a parallelogram on the left side of the tile.
   */
  private createSouthFace(elevationSteps: number): Phaser.GameObjects.Graphics {
    const halfWidth = this.isoTransform.tileWidth / 2;
    const halfHeight = this.isoTransform.tileHeight / 2;
    const faceHeight = elevationSteps * ELEVATION_HEIGHT_STEP;

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x1a1a2a, 1); // Dark shading

    // Left-side parallelogram (for grid-south neighbor)
    graphics.beginPath();
    graphics.moveTo(0, halfHeight);                    // Diamond bottom
    graphics.lineTo(-halfWidth, 0);                    // Diamond left
    graphics.lineTo(-halfWidth, faceHeight);           // Below left point
    graphics.lineTo(0, halfHeight + faceHeight);       // Below bottom
    graphics.closePath();
    graphics.fillPath();

    return graphics;
  }

  /**
   * Create east-facing side face for elevated tiles.
   * Grid-east (x+1) is screen bottom-RIGHT, so this face extends from bottom to right edge.
   * Renders as a parallelogram on the right side of the tile.
   */
  private createEastFace(elevationSteps: number): Phaser.GameObjects.Graphics {
    const halfWidth = this.isoTransform.tileWidth / 2;
    const halfHeight = this.isoTransform.tileHeight / 2;
    const faceHeight = elevationSteps * ELEVATION_HEIGHT_STEP;

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x0a0a1a, 1); // Even darker for two-tone shading

    // Right-side parallelogram (for grid-east neighbor)
    graphics.beginPath();
    graphics.moveTo(0, halfHeight);                    // Diamond bottom
    graphics.lineTo(halfWidth, 0);                     // Diamond right
    graphics.lineTo(halfWidth, faceHeight);            // Below right point
    graphics.lineTo(0, halfHeight + faceHeight);       // Below bottom
    graphics.closePath();
    graphics.fillPath();

    return graphics;
  }

  /**
   * Create top face using sprite texture. All 16 tile types now have isometric sprites.
   */
  private createTopFace(tileId: TileId): Phaser.GameObjects.GameObject {
    const textureKey = this.getTextureKey(tileId);

    // All tiles now use sprite images (128x64 isometric diamonds)
    if (this.scene.textures.exists(textureKey)) {
      const sprite = this.scene.add.image(0, 0, textureKey);
      return sprite;
    }

    // Fallback: draw colored diamond if texture somehow missing
    const halfWidth = this.isoTransform.tileWidth / 2;
    const halfHeight = this.isoTransform.tileHeight / 2;
    const color = this.getTileColor(tileId);
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(0, -halfHeight);
    graphics.lineTo(halfWidth, 0);
    graphics.lineTo(0, halfHeight);
    graphics.lineTo(-halfWidth, 0);
    graphics.closePath();
    graphics.fillPath();
    return graphics;
  }
}
