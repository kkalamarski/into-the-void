import Phaser from 'phaser';
import { TileId, tileIdToString } from '@into-the-void/world-gen';
import { TileRegistry } from '@into-the-void/tiles';
import { IsometricTransform } from '../utils/IsometricTransform';
import { ELEVATION_HEIGHT_STEP } from '../constants/elevation';

// Visual wall height — blocking tiles render taller without changing game data.
// Base multiplier + seed-based variation for natural look.
const WALL_BASE_MULTIPLIER = 2;
const WALL_HEIGHT_VARIATION = 1; // ±1 extra elevation levels based on seed

// Height-based tinting: lower elevations appear darker for visual depth
// Brightness = 0.55 + (elevation * 0.15), capped at 1.0
const ELEVATION_TINT_BASE = 0.55;
const ELEVATION_TINT_STEP = 0.15;

// Elevation edge highlight for visual depth cues
const EDGE_HIGHLIGHT_COLOR = 0x000000; // Dark edge (shadow line)
const EDGE_HIGHLIGHT_ALPHA = 0.4;      // 40% opacity
const EDGE_HIGHLIGHT_WIDTH = 2;        // 2px line width
const MIN_ELEVATION_FOR_EDGE = 1;      // Only highlight elevation >= 1

// Elevation shadow for tiles below elevated neighbors
const SHADOW_TINT_FACTOR = 0.85; // Darken by 15% when adjacent to higher elevation

// Sprite dimensions for the new isometric cube sprites
const SPRITE_SIZE = 256;
// The top diamond's center is at (128, 64) in a 256x256 cube sprite
// Origin (0.5, 0.25) aligns the diamond center with container position
const SPRITE_ORIGIN_X = 0.5;
const SPRITE_ORIGIN_Y = 0.25;

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
 * Smoothed value noise for organic clustering of tile variants.
 * Uses bilinear interpolation of seeded random values at grid points
 * scaled by `scale` to create smooth patches of similar values.
 * @param offsetSeed separates independent noise channels
 */
function valueNoise(x: number, y: number, scale: number, offsetSeed: number): number {
  const sx = x / scale;
  const sy = y / scale;
  const gx = Math.floor(sx);
  const gy = Math.floor(sy);
  const fx = sx - gx;
  const fy = sy - gy;
  // Smoothstep for organic transitions
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  // Sample grid corners with offset to separate channels
  const ox = offsetSeed * 137;
  const oy = offsetSeed * 251;
  const n00 = seededRandom(gx + ox, gy + oy);
  const n10 = seededRandom(gx + 1 + ox, gy + oy);
  const n01 = seededRandom(gx + ox, gy + 1 + oy);
  const n11 = seededRandom(gx + 1 + ox, gy + 1 + oy);
  return n00 * (1 - u) * (1 - v) + n10 * u * (1 - v) + n01 * (1 - u) * v + n11 * u * v;
}

// Decoration zone threshold — tiles above this noise value get decoration variants
const DECO_NOISE_THRESHOLD = 0.62;

/**
 * Mapping from TileId enum to procedural texture keys
 * All tiles now use proc_tile_* keys baked by ProceduralTileGenerator
 */
export const TILE_TEXTURE_MAP: Record<TileId, string> = {
  [TileId.VOID_FLOOR]: 'proc_tile_void_floor',
  [TileId.VOID_WALL]: 'proc_tile_void_wall',
  [TileId.CRYSTAL_FLOOR]: 'proc_tile_crystal_floor',
  [TileId.CRYSTAL_FORMATION]: 'proc_tile_crystal_formation',
  [TileId.TOXIC_FLOOR]: 'proc_tile_toxic_floor',
  [TileId.TOXIC_POOL]: 'proc_tile_toxic_pool',
  [TileId.RUINS_FLOOR]: 'proc_tile_ruins_floor',
  [TileId.RUINS_WALL]: 'proc_tile_ruins_wall',
  [TileId.ICE_FLOOR]: 'proc_tile_ice_floor',
  [TileId.ICE_WALL]: 'proc_tile_ice_wall',
  [TileId.VOLCANIC_FLOOR]: 'proc_tile_volcanic_floor',
  [TileId.LAVA]: 'proc_tile_lava',
  [TileId.FUNGAL_FLOOR]: 'proc_tile_fungal_floor',
  [TileId.FUNGAL_GROWTH]: 'proc_tile_fungal_growth',
  [TileId.CRATER_FLOOR]: 'proc_tile_crater_floor',
  [TileId.CRATER_DEBRIS]: 'proc_tile_crater_debris',
  [TileId.PORTAL]: 'proc_tile_portal',
  [TileId.TIDAL_FLOOR]: 'proc_tile_tidal_floor',
  [TileId.TIDAL_SHALLOW]: 'proc_tile_tidal_shallow',
  [TileId.KELP_FLOOR]: 'proc_tile_kelp_floor',
  [TileId.KELP_WALL]: 'proc_tile_kelp_wall',
  [TileId.TRENCH_FLOOR]: 'proc_tile_trench_floor',
  [TileId.TRENCH_DEEP]: 'proc_tile_trench_deep',
  [TileId.SHORE_TRANSITION]: 'proc_tile_shore_transition',
  [TileId.VOID_RIFT_FLOOR]: 'proc_tile_void_rift_floor',
  [TileId.VOID_RIFT_DISTORTION]: 'proc_tile_void_rift_distortion',
  [TileId.CRYSTALLINE_FLOOR]: 'proc_tile_crystalline_floor',
  [TileId.CRYSTAL_FORMATION_LARGE]: 'proc_tile_crystal_formation_large',
  [TileId.BIOLUMINESCENT_FLOOR]: 'proc_tile_bioluminescent_floor',
  [TileId.BIOLUMINESCENT_FLORA]: 'proc_tile_bioluminescent_flora',
  // Hub Stations — Canopy (Verdant)
  [TileId.CANOPY_FLOOR]: 'proc_tile_canopy_floor',
  [TileId.CANOPY_WALL]: 'proc_tile_canopy_wall',
  [TileId.CANOPY_DOOR]: 'proc_tile_canopy_door',
  [TileId.CANOPY_CORRIDOR]: 'proc_tile_canopy_corridor',
  [TileId.CANOPY_DECORATION]: 'proc_tile_canopy_decoration',
  [TileId.CANOPY_ACCENT]: 'proc_tile_canopy_accent',
  [TileId.CANOPY_WINDOW]: 'proc_tile_canopy_window',
  [TileId.CANOPY_HAZARD]: 'proc_tile_canopy_hazard',
  // Hub Stations — Ironhold (Helix)
  [TileId.IRONHOLD_FLOOR]: 'proc_tile_ironhold_floor',
  [TileId.IRONHOLD_WALL]: 'proc_tile_ironhold_wall',
  [TileId.IRONHOLD_DOOR]: 'proc_tile_ironhold_door',
  [TileId.IRONHOLD_CORRIDOR]: 'proc_tile_ironhold_corridor',
  [TileId.IRONHOLD_DECORATION]: 'proc_tile_ironhold_decoration',
  [TileId.IRONHOLD_ACCENT]: 'proc_tile_ironhold_accent',
  [TileId.IRONHOLD_WINDOW]: 'proc_tile_ironhold_window',
  [TileId.IRONHOLD_HAZARD]: 'proc_tile_ironhold_hazard',
  // Hub Stations — Meridian (Nexus)
  [TileId.MERIDIAN_FLOOR]: 'proc_tile_meridian_floor',
  [TileId.MERIDIAN_WALL]: 'proc_tile_meridian_wall',
  [TileId.MERIDIAN_DOOR]: 'proc_tile_meridian_door',
  [TileId.MERIDIAN_CORRIDOR]: 'proc_tile_meridian_corridor',
  [TileId.MERIDIAN_DECORATION]: 'proc_tile_meridian_decoration',
  [TileId.MERIDIAN_ACCENT]: 'proc_tile_meridian_accent',
  [TileId.MERIDIAN_WINDOW]: 'proc_tile_meridian_window',
  [TileId.MERIDIAN_HAZARD]: 'proc_tile_meridian_hazard',
  // Hub Stations — Salvage (Unaffiliated)
  [TileId.SALVAGE_FLOOR]: 'proc_tile_salvage_floor',
  [TileId.SALVAGE_WALL]: 'proc_tile_salvage_wall',
  [TileId.SALVAGE_DOOR]: 'proc_tile_salvage_door',
  [TileId.SALVAGE_CORRIDOR]: 'proc_tile_salvage_corridor',
  [TileId.SALVAGE_DECORATION]: 'proc_tile_salvage_decoration',
  [TileId.SALVAGE_ACCENT]: 'proc_tile_salvage_accent',
  [TileId.SALVAGE_WINDOW]: 'proc_tile_salvage_window',
  [TileId.SALVAGE_HAZARD]: 'proc_tile_salvage_hazard',
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
    return TILE_TEXTURE_MAP[tileId] ?? 'proc_tile_void_floor';
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

    // Visual elevation: blocking tiles render taller for towering effect (client-only, doesn't affect game data)
    // Uses isBlocking from tile registry — covers walls, formations, debris, decorations etc.
    const tileStr = tileIdToString(tileId);
    const tileDef = tileStr ? TileRegistry.get(tileStr) : null;
    const isBlockingTile = tileDef?.isBlocking && elevation >= 1;
    // Seed-based height variation: hash worldX+worldY for deterministic per-tile variation
    const heightSeed = ((worldX * 73856093) ^ (worldY * 19349663)) >>> 0;
    const variation = isBlockingTile ? (heightSeed % (WALL_HEIGHT_VARIATION * 2 + 1)) - WALL_HEIGHT_VARIATION : 0;
    const visualElevation = isBlockingTile
      ? Math.max(elevation + 1, elevation * WALL_BASE_MULTIPLIER + variation)
      : elevation;

    const elevationOffset = visualElevation * ELEVATION_HEIGHT_STEP;

    // Create container at world screen position (top cube position)
    const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset);
    container.setData('gridX', worldX);
    container.setData('gridY', worldY);
    container.setData('elevation', elevation);

    // Stack cubes from ground level up to visual elevation to fill the wall
    // Each lower cube is offset downward by ELEVATION_HEIGHT_STEP relative to the top
    for (let level = 0; level <= visualElevation; level++) {
      const cubeSprite = this.createCubeSprite(tileId, worldX, worldY);
      // Offset relative to container: level 0 is at the bottom, elevation is at top (y=0)
      const yOffset = (visualElevation - level) * ELEVATION_HEIGHT_STEP;
      if (cubeSprite instanceof Phaser.GameObjects.Image) {
        cubeSprite.setY(yOffset);
      }
      container.add(cubeSprite);

      // Apply height-based tinting — lower levels appear darker
      this.applyElevationTint(cubeSprite, level);
    }

    // Get the top cube for shadow calculations
    const topCube = container.list[container.list.length - 1];

    // Apply additional shadow darkening if adjacent to higher elevation
    if (topCube instanceof Phaser.GameObjects.Image) {
      if (this.isAdjacentToHigherElevation(localX, localY, elevation, heights)) {
        // Further darken the tile to simulate shadow from adjacent cliff
        const currentTint = topCube.tintTopLeft;
        const r = ((currentTint >> 16) & 0xff) * SHADOW_TINT_FACTOR;
        const g = ((currentTint >> 8) & 0xff) * SHADOW_TINT_FACTOR;
        const b = (currentTint & 0xff) * SHADOW_TINT_FACTOR;
        const shadowTint = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
        topCube.setTint(shadowTint);
      }
    }

    // Add edge highlight at elevation transitions (cliffs only)
    this.drawElevationEdge(container, elevation, localX, localY, heights);

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
   * Draw edge highlight to mark INVISIBLE cliff backs (north/west facing).
   * In isometric view, south/east cliff faces are visible (brown sprite sides).
   * But north/west cliff faces are hidden - terrain drops away invisibly.
   * This draws a line on the TOP edges of elevated tiles to mark hidden cliffs.
   * - Top-left edge: drawn if west neighbor (x-1) is lower (cliff faces west)
   * - Top-right edge: drawn if north neighbor (y-1) is lower (cliff faces north)
   * Skip chunk boundaries (neighbor outside heights array) to avoid false edges.
   */
  private drawElevationEdge(
    container: Phaser.GameObjects.Container,
    elevation: number,
    localX: number,
    localY: number,
    heights: number[][]
  ): void {
    if (elevation < MIN_ELEVATION_FOR_EDGE) return;

    // Check bounds - skip chunk edges where neighbor data is unavailable
    const westInBounds = localX > 0 && heights[localY] !== undefined;
    const northInBounds = localY > 0 && heights[localY - 1] !== undefined;

    // Check if this tile is higher than north/west neighbors (invisible cliff backs)
    // Only check if neighbor is within chunk bounds
    const westElevation = westInBounds ? (heights[localY][localX - 1] ?? elevation) : elevation;
    const northElevation = northInBounds ? (heights[localY - 1][localX] ?? elevation) : elevation;

    const hasWestCliff = westInBounds && elevation > westElevation;
    const hasNorthCliff = northInBounds && elevation > northElevation;

    // Only draw if there's at least one invisible cliff edge
    if (!hasWestCliff && !hasNorthCliff) return;

    const halfWidth = this.isoTransform.tileWidth / 2;  // 128
    const halfHeight = this.isoTransform.tileHeight / 2; // 64

    const graphics = this.scene.add.graphics();
    graphics.lineStyle(EDGE_HIGHLIGHT_WIDTH, EDGE_HIGHLIGHT_COLOR, EDGE_HIGHLIGHT_ALPHA);

    // Draw top-left edge if west neighbor is lower (cliff back faces west)
    if (hasWestCliff) {
      graphics.beginPath();
      graphics.moveTo(0, -halfHeight);        // Top point
      graphics.lineTo(-halfWidth, 0);         // Left point
      graphics.strokePath();
    }

    // Draw top-right edge if north neighbor is lower (cliff back faces north)
    if (hasNorthCliff) {
      graphics.beginPath();
      graphics.moveTo(0, -halfHeight);        // Top point
      graphics.lineTo(halfWidth, 0);          // Right point
      graphics.strokePath();
    }

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
   * Create cube sprite using procedural isometric cube texture (proc_tile_*).
   * Includes top face + south/east side faces all in one sprite.
   * Tiles with _floor suffix have 6 variants (v1-v6) selected via noise-based
   * clustering for organic patches of base (v1-v3) and decoration (v4-v6) tiles.
   */
  private createCubeSprite(tileId: TileId, x: number, y: number): Phaser.GameObjects.GameObject {
    const baseTextureKey = this.getTextureKey(tileId);
    // Procedural floor tiles have _v2/_v3 variants
    const hasVariants = baseTextureKey.endsWith('_floor');

    // Select variant using noise-based clustering for organic placement.
    // Low-frequency noise creates patches: base zones (~62%) vs decoration zones (~38%).
    // Within each zone, variants are picked by secondary noise/random for sub-patches.
    let textureKey = baseTextureKey;
    if (hasVariants) {
      const decoNoise = valueNoise(x, y, 5, 0);  // medium patches
      const detail = seededRandom(x, y);           // fine per-tile variation

      let variant: number;
      if (decoNoise > DECO_NOISE_THRESHOLD) {
        // Decoration zone — pick from v4/v5/v6 using separate noise channel
        const subNoise = valueNoise(x, y, 3, 1);
        if (subNoise > 0.66) variant = 5;      // v6 — rarest deco
        else if (subNoise > 0.33) variant = 4; // v5
        else variant = 3;                       // v4 — most common deco
      } else {
        // Base zone — pick from v1/v2/v3
        if (detail > 0.85) variant = 2;      // v3 — 15% of base area
        else if (detail > 0.60) variant = 1; // v2 — 25% of base area
        else variant = 0;                    // base — 60% of base area
      }

      if (variant > 0) {
        textureKey = `${baseTextureKey}_v${variant + 1}`;
      }

      // Fallback to base if variant doesn't exist
      if (!this.scene.textures.exists(textureKey)) {
        textureKey = baseTextureKey;
      }
    }

    // Use procedural cube texture at native 256x256 size
    if (this.scene.textures.exists(textureKey)) {
      const sprite = this.scene.add.image(0, 0, textureKey);
      // Set origin to align top diamond center with container position
      // Top diamond center is at (128, 64) in a 256x256 cube sprite
      sprite.setOrigin(SPRITE_ORIGIN_X, SPRITE_ORIGIN_Y);
      // Render at native size (no scaling)
      sprite.setDisplaySize(SPRITE_SIZE, SPRITE_SIZE);
      return sprite;
    }

    // Fallback: draw colored isometric cube if procedural texture missing (should not happen)
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
