import Phaser from 'phaser';
import { TileId, tileIdToString } from '@into-the-void/world-gen';
import { TileRegistry } from '@into-the-void/tiles';
import { IsometricTransform } from '../utils/IsometricTransform';

const ELEVATION_HEIGHT_STEP = 128; // Pixels per elevation level (1.0 × diamond height for 256x256 cubes)

// Height-based tinting: lower elevations appear darker for visual depth
// Brightness = 0.55 + (elevation * 0.15), capped at 1.0
const ELEVATION_TINT_BASE = 0.55;
const ELEVATION_TINT_STEP = 0.15;

// Elevation edge highlight for visual depth cues
const EDGE_HIGHLIGHT_COLOR = 0xffffff; // White highlight
const EDGE_HIGHLIGHT_ALPHA = 0.3;      // 30% opacity
const EDGE_HIGHLIGHT_WIDTH = 3;        // 3px line width
const MIN_ELEVATION_FOR_EDGE = 1;      // Only highlight elevation >= 1

// Elevation shadow for tiles below elevated neighbors
const SHADOW_TINT_FACTOR = 0.85; // Darken by 15% when adjacent to higher elevation

// Sprite dimensions for the new isometric cube sprites
const SPRITE_SIZE = 256;
// The top diamond's center is at (128, 64) in a 256x256 cube sprite
// Origin (0.5, 0.25) aligns the diamond center with container position
const SPRITE_ORIGIN_X = 0.5;
const SPRITE_ORIGIN_Y = 0.25;

// Variant weights: base (70%), v2 (20%), v3 (10%)
const VARIANT_WEIGHTS = [0.7, 0.2, 0.1];

/**
 * Simple seeded random number generator based on position.
 * Returns deterministic value 0-1 for any (x, y) coordinate.
 */
function seededRandom(x: number, y: number): number {
  const seed = x * 374761393 + y * 668265263;
  const hash = (seed ^ (seed >> 13)) * 1274126177;
  return ((hash ^ (hash >> 16)) & 0x7fffffff) / 0x7fffffff;
}

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
  [TileId.PORTAL]: 'tile_portal',
};

/**
 * Utility class for rendering tiles in the game world
 */
export class TileRenderer {
  private scene: Phaser.Scene;
  private tileSize: number;
  private isoTransform: IsometricTransform;

  constructor(scene: Phaser.Scene, tileWidth: number = 256, tileHeight: number = 128) {
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
   * Check if a texture exists and is the correct 256x256 cube format.
   * Returns false for missing textures or old small-format sprites.
   */
  private isValidCubeTexture(textureKey: string): boolean {
    if (!this.scene.textures.exists(textureKey)) {
      return false;
    }
    const texture = this.scene.textures.get(textureKey);
    const source = texture.getSourceImage();
    // Valid cube sprites are 256x256
    return source.width === SPRITE_SIZE && source.height === SPRITE_SIZE;
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
   * Create a tile with elevation support.
   * New 256x256 sprites include all 3 faces (top + sides) pre-rendered.
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

    // Add the cube sprite (includes top + side faces pre-rendered)
    const cubeSprite = this.createCubeSprite(tileId, x, y);
    container.add(cubeSprite);

    // Apply height-based tinting for visual depth
    this.applyElevationTint(cubeSprite, elevation);

    // Apply additional shadow darkening if adjacent to higher elevation
    if (cubeSprite instanceof Phaser.GameObjects.Image && heights) {
      if (this.isAdjacentToHigherElevation(x, y, elevation, heights)) {
        const currentTint = cubeSprite.tintTopLeft;
        const r = ((currentTint >> 16) & 0xff) * SHADOW_TINT_FACTOR;
        const g = ((currentTint >> 8) & 0xff) * SHADOW_TINT_FACTOR;
        const b = (currentTint & 0xff) * SHADOW_TINT_FACTOR;
        const shadowTint = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
        cubeSprite.setTint(shadowTint);
      }
    }

    // Add edge highlight for elevated tiles
    this.drawElevationEdge(container, elevation);

    // Set depth using composite depth calculation
    const depth = this.isoTransform.calculateDepth(x, y, elevation);
    container.setDepth(depth);

    return container;
  }

  /**
   * Create a tile using WORLD coordinates for position and depth.
   * This ensures tiles participate in global depth sorting with players/entities.
   * New 256x256 sprites include all 3 faces (top + sides) pre-rendered.
   * @param worldX World grid X coordinate (chunkX * ZONE_SIZE + localX)
   * @param worldY World grid Y coordinate (chunkY * ZONE_SIZE + localY)
   * @param tileId The tile type
   * @param elevation Tile elevation
   * @param heights Local heights array for shadow calculation
   * @param localX Local X within chunk for shadow calculation
   * @param localY Local Y within chunk for shadow calculation
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

    // Add the cube sprite (includes top + side faces pre-rendered)
    const cubeSprite = this.createCubeSprite(tileId, worldX, worldY);
    container.add(cubeSprite);

    // Apply height-based tinting for visual depth
    // Lower elevations appear darker, higher elevations appear normal/brighter
    this.applyElevationTint(cubeSprite, elevation);

    // Apply additional shadow darkening if adjacent to higher elevation
    if (cubeSprite instanceof Phaser.GameObjects.Image) {
      if (this.isAdjacentToHigherElevation(localX, localY, elevation, heights)) {
        // Further darken the tile to simulate shadow from adjacent cliff
        const currentTint = cubeSprite.tintTopLeft;
        const r = ((currentTint >> 16) & 0xff) * SHADOW_TINT_FACTOR;
        const g = ((currentTint >> 8) & 0xff) * SHADOW_TINT_FACTOR;
        const b = (currentTint & 0xff) * SHADOW_TINT_FACTOR;
        const shadowTint = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
        cubeSprite.setTint(shadowTint);
      }
    }

    // Add edge highlight for elevated tiles
    this.drawElevationEdge(container, elevation);

    // Set depth using WORLD coordinates for global sorting
    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation);
    container.setDepth(depth);

    return container;
  }

  /**
   * Apply brightness tint based on elevation for visual depth.
   * Lower tiles appear darker, higher tiles appear normal/brighter.
   */
  private applyElevationTint(sprite: Phaser.GameObjects.GameObject, elevation: number): void {
    // Only Image sprites support tinting; Graphics fallbacks already have baked colors
    if (!(sprite instanceof Phaser.GameObjects.Image)) {
      return;
    }

    // Calculate brightness: 0.7 at elevation 0, +0.1 per level, max 1.0
    const brightness = Math.min(1.0, ELEVATION_TINT_BASE + elevation * ELEVATION_TINT_STEP);
    const tintValue = Math.floor(brightness * 255);
    const tint = (tintValue << 16) | (tintValue << 8) | tintValue;
    sprite.setTint(tint);
  }

  /**
   * Draw edge highlight on elevated tiles for visual depth cues.
   * Draws a semi-transparent white line along the top-left and top-right edges
   * of the diamond to indicate elevation. Only draws for elevation >= 1.
   */
  private drawElevationEdge(container: Phaser.GameObjects.Container, elevation: number): void {
    if (elevation < MIN_ELEVATION_FOR_EDGE) return;

    const halfWidth = this.isoTransform.tileWidth / 2;  // 128
    const halfHeight = this.isoTransform.tileHeight / 2; // 64

    const graphics = this.scene.add.graphics();
    graphics.lineStyle(EDGE_HIGHLIGHT_WIDTH, EDGE_HIGHLIGHT_COLOR, EDGE_HIGHLIGHT_ALPHA);

    // Draw top-left edge (from top point to left point of diamond)
    graphics.beginPath();
    graphics.moveTo(0, -halfHeight);        // Top point
    graphics.lineTo(-halfWidth, 0);         // Left point
    graphics.strokePath();

    // Draw top-right edge (from top point to right point of diamond)
    graphics.beginPath();
    graphics.moveTo(0, -halfHeight);        // Top point
    graphics.lineTo(halfWidth, 0);          // Right point
    graphics.strokePath();

    container.add(graphics);
  }

  /**
   * Check if a tile is adjacent to any higher elevation tile.
   * Used to apply shadow darkening for visual depth cues.
   */
  private isAdjacentToHigherElevation(
    localX: number,
    localY: number,
    elevation: number,
    heights: number[][]
  ): boolean {
    // Check north (y-1) and west (x-1) neighbors (where light comes from in isometric)
    const northY = localY - 1;
    const westX = localX - 1;

    const northElevation = heights[northY]?.[localX] ?? 0;
    const westElevation = heights[localY]?.[westX] ?? 0;

    return northElevation > elevation || westElevation > elevation;
  }

  /**
   * Create cube sprite using 256x256 pre-rendered isometric cube texture.
   * Includes top face + south/east side faces all in one sprite.
   * Floor tiles have variants (_v2, _v3) selected deterministically by position seed.
   * Probability: base 70%, v2 20%, v3 10%
   */
  private createCubeSprite(tileId: TileId, x: number, y: number): Phaser.GameObjects.GameObject {
    const baseTextureKey = this.getTextureKey(tileId);
    const isFloorTile = baseTextureKey.endsWith('_floor');

    // Select variant for floor tiles based on position
    let textureKey = baseTextureKey;
    if (isFloorTile) {
      const rand = seededRandom(x, y);
      if (rand > VARIANT_WEIGHTS[0] + VARIANT_WEIGHTS[1]) {
        // 10% chance for v3
        textureKey = `${baseTextureKey}_v3`;
      } else if (rand > VARIANT_WEIGHTS[0]) {
        // 20% chance for v2
        textureKey = `${baseTextureKey}_v2`;
      }
      // else 70% chance for base (no suffix)

      // Fallback to base if variant doesn't exist or isn't 256x256 cube format
      if (!this.isValidCubeTexture(textureKey)) {
        textureKey = baseTextureKey;
      }
    }

    // Use cube sprite at native 256x256 size
    if (this.scene.textures.exists(textureKey)) {
      const sprite = this.scene.add.image(0, 0, textureKey);
      // Set origin to align top diamond center with container position
      // Top diamond center is at (128, 64) in a 256x256 cube sprite
      sprite.setOrigin(SPRITE_ORIGIN_X, SPRITE_ORIGIN_Y);
      // Render at native size (no scaling)
      sprite.setDisplaySize(SPRITE_SIZE, SPRITE_SIZE);
      return sprite;
    }

    // Fallback: draw colored isometric cube if texture missing
    return this.createFallbackCube(tileId);
  }

  /**
   * Create a fallback procedural isometric cube when sprite is missing.
   * Draws top diamond + south face + east face programmatically.
   */
  private createFallbackCube(tileId: TileId): Phaser.GameObjects.Graphics {
    const halfWidth = this.isoTransform.tileWidth / 2;  // 128
    const halfHeight = this.isoTransform.tileHeight / 2; // 64
    const sideHeight = halfHeight; // Side faces extend down by half the diamond height
    const color = this.getTileColor(tileId);

    const graphics = this.scene.add.graphics();

    // Calculate darker shades for side faces
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const southColor = ((r * 0.6) << 16) | ((g * 0.6) << 8) | (b * 0.6);
    const eastColor = ((r * 0.4) << 16) | ((g * 0.4) << 8) | (b * 0.4);

    // Draw south face (left side) - behind top
    graphics.fillStyle(southColor, 1);
    graphics.beginPath();
    graphics.moveTo(0, halfHeight);                      // Diamond bottom
    graphics.lineTo(-halfWidth, 0);                      // Diamond left
    graphics.lineTo(-halfWidth, sideHeight);             // Below left
    graphics.lineTo(0, halfHeight + sideHeight);         // Below bottom
    graphics.closePath();
    graphics.fillPath();

    // Draw east face (right side) - behind top
    graphics.fillStyle(eastColor, 1);
    graphics.beginPath();
    graphics.moveTo(0, halfHeight);                      // Diamond bottom
    graphics.lineTo(halfWidth, 0);                       // Diamond right
    graphics.lineTo(halfWidth, sideHeight);              // Below right
    graphics.lineTo(0, halfHeight + sideHeight);         // Below bottom
    graphics.closePath();
    graphics.fillPath();

    // Draw top face (diamond) - in front
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(0, -halfHeight);                     // Top
    graphics.lineTo(halfWidth, 0);                       // Right
    graphics.lineTo(0, halfHeight);                      // Bottom
    graphics.lineTo(-halfWidth, 0);                      // Left
    graphics.closePath();
    graphics.fillPath();

    return graphics;
  }
}
