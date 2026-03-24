import Phaser from 'phaser';
import type { TilePalette } from './types';
import { AbstractTileRenderStrategy, HW, HH, SH } from './AbstractTileRenderStrategy';
import { darkenColor, detailRandom, isHubTile } from './tile-palettes';

/**
 * Handles rendering accents for hazard tiles (damage/slow zones).
 * Includes toxic_pool, lava, and hub hazard tiles.
 */
export class HazardTileStrategy extends AbstractTileRenderStrategy {
  readonly handledTileIds = [
    'toxic_pool', 'lava',
    'canopy_hazard', 'ironhold_hazard', 'meridian_hazard', 'salvage_hazard',
  ] as const;

  drawTopAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    const accentColor = palette.accent;
    const altColor = palette.accentAlt;

    switch (tileId) {
      case 'toxic_pool': {
        // Bubble circles of varying size
        g.fillStyle(accentColor, 0.3);
        for (let i = 0; i < 6; i++) {
          const pos = this.topDiamondPoint(seed, i + 330);
          const r = 3 + detailRandom(seed, i + 335) * 6;
          g.strokeCircle(pos.x, pos.y, r);
        }
        break;
      }

      case 'lava': {
        // Flowing curved lines in yellow on orange
        g.lineStyle(2, accentColor, 0.5);
        for (let i = 0; i < 4; i++) {
          const a = this.topDiamondPoint(seed, i + 350);
          const b = this.topDiamondPoint(seed, i + 355);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        g.fillStyle(accentColor, 0.4);
        for (let i = 0; i < 5; i++) {
          const pos = this.topDiamondPoint(seed, i + 360);
          g.fillCircle(pos.x, pos.y, 2 + detailRandom(seed, i + 365) * 2);
        }
        break;
      }

      default: {
        // Hub hazard tiles: diagonal caution stripes + glowing edge dots
        if (isHubTile(tileId) && tileId.endsWith('_hazard')) {
          g.lineStyle(2, accentColor, 0.4);
          for (let i = 0; i < 6; i++) {
            const offset = i * 22 - 10;
            g.beginPath();
            g.moveTo(50 + offset, 15);
            g.lineTo(80 + offset, 115);
            g.strokePath();
          }
          if (altColor) {
            g.lineStyle(2, altColor, 0.3);
            for (let i = 0; i < 5; i++) {
              const offset = i * 22 + 1;
              g.beginPath();
              g.moveTo(50 + offset, 15);
              g.lineTo(80 + offset, 115);
              g.strokePath();
            }
          }
          // Glowing edge dots around perimeter
          g.fillStyle(accentColor, 0.5);
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const px = HW + Math.cos(angle) * 45;
            const py = HH + Math.sin(angle) * 25;
            g.fillCircle(px, py, 2);
          }
        }
        break;
      }
    }
  }

  drawSouthAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    if (isHubTile(tileId)) {
      // Hazard: vertical caution marks on side face
      const southAccent = darkenColor(palette.accent, 0.75);
      g.lineStyle(1, southAccent, 0.35);
      for (let i = 0; i < 3; i++) {
        const x = 20 + i * 30;
        g.beginPath();
        g.moveTo(x, HH + 10);
        g.lineTo(x + 5, HH + SH - 10);
        g.strokePath();
      }
    } else {
      // Non-hub hazards (toxic_pool, lava): use default wall vertical texture
      super.drawSouthAccents(g, tileId, palette, seed);
    }
  }

  drawEastAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    if (isHubTile(tileId)) {
      // Default hub east face: minimal strata
      const eastAccent = darkenColor(palette.accent, 0.5);
      g.lineStyle(1, eastAccent, 0.1);
      for (let i = 0; i < 2; i++) {
        const y = HH + 25 + i * 45 + detailRandom(seed, i + 1660) * 10;
        g.beginPath();
        g.moveTo(145, y);
        g.lineTo(235, y - 5);
        g.strokePath();
      }
    } else {
      // Non-hub hazards: use default
      super.drawEastAccents(g, tileId, palette, seed);
    }
  }
}
