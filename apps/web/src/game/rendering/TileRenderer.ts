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
   * Create a tile sprite at grid position
   */
  createTile(x: number, y: number, tileId: TileId): Phaser.GameObjects.Sprite {
    const texture = this.getTextureKey(tileId);
    const screenPos = this.isoTransform.gridToScreen(x, y);

    const sprite = this.scene.add.sprite(screenPos.x, screenPos.y, texture);
    sprite.setOrigin(0.5, 0.5);  // Center origin for isometric diamond
    sprite.setDepth(screenPos.y); // Static depth for tiles (never move)

    return sprite;
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
