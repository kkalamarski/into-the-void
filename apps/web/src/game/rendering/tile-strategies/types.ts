import Phaser from 'phaser';

/**
 * Color palette for a single tile type — defines the 3 cube faces + accent color
 */
export interface TilePalette {
  /** Top face base color (brightest face) */
  top: number;
  /** South face — lit side (~65% of top brightness) */
  south: number;
  /** East face — shadow side (~40% of top brightness) */
  east: number;
  /** Primary accent detail color (contrasting hue) */
  accent: number;
  /** Optional secondary accent for variety */
  accentAlt?: number;
}

/**
 * Behavioral category for tile rendering strategies.
 * Each category handles a group of tile types with similar rendering patterns.
 */
export type TileCategory = 'floor' | 'wall' | 'hazard' | 'water' | 'portal' | 'decorative';

/**
 * Strategy interface for tile accent rendering.
 * Each strategy handles drawing accent details on the 3 faces of an isometric cube.
 */
export interface TileRenderStrategy {
  /** Tile IDs this strategy handles. Used for registry auto-registration. */
  readonly handledTileIds: readonly string[];

  /** Draw accent details on the top diamond face */
  drawTopAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void;

  /** Draw decoration accents for floor tile variants 3-5 (decoIndex 0-2) */
  drawDecorationAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
    decoIndex: number,
  ): void;

  /** Draw accent details on the south (left, lit) face */
  drawSouthAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void;

  /** Draw accent details on the east (right, shadow) face */
  drawEastAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void;
}
