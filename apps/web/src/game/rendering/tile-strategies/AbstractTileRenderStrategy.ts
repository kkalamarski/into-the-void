import Phaser from 'phaser';
import type { TileRenderStrategy, TilePalette } from './types';
import { darkenColor, detailRandom, isFloorTile } from './tile-palettes';

// ─── Isometric Cube Geometry (256x256 canvas) ───────────────────
// Top diamond: (128,0) → (256,64) → (128,128) → (0,64)
// South face:  (0,64) → (128,128) → (128,256) → (0,192)
// East face:   (128,128) → (256,64) → (256,192) → (128,256)

export const HW = 128; // half width
export const HH = 64;  // half height
export const SH = 128; // side height (matches ELEVATION_HEIGHT_STEP for seamless stacking)

export abstract class AbstractTileRenderStrategy implements TileRenderStrategy {
  abstract readonly handledTileIds: readonly string[];

  abstract drawTopAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void;

  /** Default: generic decoration dots. Override per-category for specific patterns. */
  drawDecorationAccents(
    g: Phaser.GameObjects.Graphics,
    _tileId: string,
    palette: TilePalette,
    seed: number,
    decoIndex: number,
  ): void {
    g.fillStyle(palette.accent, 0.3);
    for (let i = 0; i < 5; i++) {
      const p = this.topDiamondPoint(seed, i + 1400 + decoIndex * 20);
      g.fillCircle(p.x, p.y, 2 + detailRandom(seed, i + 1405) * 2);
    }
  }

  /** Default south face accents — floor tiles get horizontal strata, others get vertical texture */
  drawSouthAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    const southAccent = darkenColor(palette.accent, 0.75);

    if (isFloorTile(tileId)) {
      // Sparser details than top face — horizontal strata lines
      g.lineStyle(1, southAccent, 0.2);
      for (let i = 0; i < 3; i++) {
        const y = HH + 12 + i * 36 + detailRandom(seed, i + 500) * 10;
        const x1 = 10 + detailRandom(seed, i + 505) * 20;
        const x2 = 90 + detailRandom(seed, i + 510) * 30;
        g.beginPath();
        g.moveTo(x1, y);
        g.lineTo(x2, y + (128 - 64) * (x2 - x1) / 128 * 0.5); // Follow face slope
        g.strokePath();
      }
    } else {
      // Wall/feature tiles: vertical texture lines
      g.lineStyle(1, southAccent, 0.2);
      for (let i = 0; i < 3; i++) {
        const x = 15 + i * 35 + detailRandom(seed, i + 515) * 15;
        g.beginPath();
        g.moveTo(x, HH + 5);
        g.lineTo(x + 5, HH + SH - 5);
        g.strokePath();
      }
    }
  }

  /** Default east face accents — floor tiles get horizontal strata, others get vertical texture */
  drawEastAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    const eastAccent = darkenColor(palette.accent, 0.5); // Dimmer on shadow side

    if (isFloorTile(tileId)) {
      // Sparser details — horizontal strata
      g.lineStyle(1, eastAccent, 0.15);
      for (let i = 0; i < 2; i++) {
        const y = HH + 15 + i * 50 + detailRandom(seed, i + 600) * 10;
        const x1 = 140 + detailRandom(seed, i + 605) * 20;
        const x2 = 230 + detailRandom(seed, i + 610) * 20;
        g.beginPath();
        g.moveTo(x1, y);
        g.lineTo(x2, y - (x2 - x1) * 0.3); // Follow face slope
        g.strokePath();
      }
    } else {
      // Wall/feature: vertical texture
      g.lineStyle(1, eastAccent, 0.15);
      for (let i = 0; i < 2; i++) {
        const x = 155 + i * 40 + detailRandom(seed, i + 615) * 15;
        g.beginPath();
        g.moveTo(x, HH + 5);
        g.lineTo(x - 3, HH + SH - 5);
        g.strokePath();
      }
    }
  }

  // ─── Shared Drawing Primitives ─────────────────────────────────

  /** Get a random point within the top diamond, biased inward by margin */
  protected topDiamondPoint(seed: number, index: number): { x: number; y: number } {
    const margin = 0.15; // 15% inset from edges
    const u = margin + detailRandom(seed, index * 2) * (1 - 2 * margin);
    const v = margin + detailRandom(seed, index * 2 + 1) * (1 - 2 * margin);

    // Map (u, v) in [0,1]^2 to diamond coords
    // Diamond: top=(128,0), right=(256,64), bottom=(128,128), left=(0,64)
    const x = HW + (u - v) * HW;
    const y = (u + v) * HH;
    return { x, y };
  }
}
