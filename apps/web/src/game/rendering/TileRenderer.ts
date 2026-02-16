import Phaser from 'phaser';
import { TileId } from '@into-the-void/world-gen';
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
   * Get color for a tile ID (placeholder colors until sprites are ready)
   */
  private getTileColor(tileId: TileId): number {
    switch (tileId) {
      case TileId.VOID_FLOOR: return 0x2a2a3a;
      case TileId.VOID_WALL: return 0x1a1a2a;
      case TileId.CRYSTAL_FLOOR: return 0x3a4a5a;
      case TileId.CRYSTAL_FORMATION: return 0x5a7a9a;
      case TileId.TOXIC_FLOOR: return 0x3a4a2a;
      case TileId.TOXIC_POOL: return 0x5a8a3a;
      case TileId.RUINS_FLOOR: return 0x4a4a4a;
      case TileId.RUINS_WALL: return 0x3a3a3a;
      case TileId.ICE_FLOOR: return 0x6a8aaa;
      case TileId.ICE_WALL: return 0x4a6a8a;
      case TileId.VOLCANIC_FLOOR: return 0x5a3a2a;
      case TileId.LAVA: return 0xaa4a2a;
      case TileId.FUNGAL_FLOOR: return 0x4a3a4a;
      case TileId.FUNGAL_GROWTH: return 0x6a4a6a;
      case TileId.CRATER_FLOOR: return 0x5a5a5a;
      case TileId.CRATER_DEBRIS: return 0x4a4a4a;
      default: return 0x3a3a4a;
    }
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
   * Create south-facing side face for elevated tiles.
   * Renders as a rectangle extending down from diamond bottom point.
   */
  private createSouthFace(elevationSteps: number): Phaser.GameObjects.Graphics {
    const halfWidth = this.isoTransform.tileWidth / 2;
    const halfHeight = this.isoTransform.tileHeight / 2;
    const faceHeight = elevationSteps * ELEVATION_HEIGHT_STEP;

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x1a1a2a, 1); // Dark shading
    graphics.fillRect(0, halfHeight, halfWidth, faceHeight);

    return graphics;
  }

  /**
   * Create east-facing side face for elevated tiles.
   * Renders as a parallelogram extending left from diamond bottom point.
   */
  private createEastFace(elevationSteps: number): Phaser.GameObjects.Graphics {
    const halfWidth = this.isoTransform.tileWidth / 2;
    const halfHeight = this.isoTransform.tileHeight / 2;
    const faceHeight = elevationSteps * ELEVATION_HEIGHT_STEP;

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x0a0a1a, 1); // Even darker for two-tone shading

    graphics.beginPath();
    graphics.moveTo(0, halfHeight); // Diamond bottom center
    graphics.lineTo(-halfWidth, 0); // Diamond left point
    graphics.lineTo(-halfWidth, faceHeight); // Left face bottom
    graphics.lineTo(0, halfHeight + faceHeight); // Right face bottom
    graphics.closePath();
    graphics.fillPath();

    return graphics;
  }

  /**
   * Create top face (diamond shape) relative to container origin.
   */
  private createTopFace(tileId: TileId): Phaser.GameObjects.Graphics {
    const color = this.getTileColor(tileId);
    const halfWidth = this.isoTransform.tileWidth / 2;
    const halfHeight = this.isoTransform.tileHeight / 2;

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(color, 1);

    // Draw diamond relative to (0, 0)
    graphics.beginPath();
    graphics.moveTo(0, -halfHeight);      // Top
    graphics.lineTo(halfWidth, 0);        // Right
    graphics.lineTo(0, halfHeight);       // Bottom
    graphics.lineTo(-halfWidth, 0);       // Left
    graphics.closePath();
    graphics.fillPath();

    // Add subtle border
    graphics.lineStyle(1, 0x000000, 0.2);
    graphics.beginPath();
    graphics.moveTo(0, -halfHeight);
    graphics.lineTo(halfWidth, 0);
    graphics.lineTo(0, halfHeight);
    graphics.lineTo(-halfWidth, 0);
    graphics.closePath();
    graphics.strokePath();

    return graphics;
  }
}
