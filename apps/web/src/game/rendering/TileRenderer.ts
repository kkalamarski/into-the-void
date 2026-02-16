import Phaser from 'phaser';
import { TileId } from '@into-the-void/world-gen';
import { IsometricTransform } from '../utils/IsometricTransform';

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
}
