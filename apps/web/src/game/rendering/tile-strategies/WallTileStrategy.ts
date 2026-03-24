import Phaser from 'phaser';
import type { TilePalette } from './types';
import { AbstractTileRenderStrategy, HW, HH } from './AbstractTileRenderStrategy';
import { brightenColor, darkenColor, detailRandom } from './tile-palettes';

/**
 * Handles rendering accents for wall/feature tiles.
 * Wall tiles feature structural details like strata, facets, brick patterns, etc.
 */
export class WallTileStrategy extends AbstractTileRenderStrategy {
  readonly handledTileIds = [
    'void_wall', 'crystal_formation', 'ruins_wall', 'ice_wall',
    'fungal_growth', 'crater_debris', 'kelp_wall',
    'void_rift_distortion', 'crystal_formation_large', 'bioluminescent_flora',
    'trench_deep',
  ] as const;

  drawTopAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    const accentColor = palette.accent;

    switch (tileId) {
      case 'void_wall': {
        // Stacked horizontal layers (stone strata)
        g.lineStyle(1, accentColor, 0.25);
        for (let i = 0; i < 5; i++) {
          const y = 15 + i * 22;
          const offset = (detailRandom(seed, i + 320) - 0.5) * 15;
          g.beginPath();
          g.moveTo(40 + offset, y);
          g.lineTo(220 + offset, y + 3);
          g.strokePath();
        }
        break;
      }

      case 'crystal_formation': {
        // Diagonal facet lines converging upward
        g.lineStyle(1, accentColor, 0.4);
        for (let i = 0; i < 4; i++) {
          const baseX = 60 + i * 40;
          g.beginPath();
          g.moveTo(baseX, 110);
          g.lineTo(128 + (detailRandom(seed, i + 325) - 0.5) * 30, 15);
          g.strokePath();
        }
        break;
      }

      case 'ruins_wall': {
        // Brick pattern lines
        g.lineStyle(1, accentColor, 0.2);
        for (let row = 0; row < 5; row++) {
          const y = 12 + row * 22;
          g.beginPath();
          g.moveTo(30, y);
          g.lineTo(230, y);
          g.strokePath();
          const offset = row % 2 === 0 ? 0 : 30;
          for (let col = 0; col < 4; col++) {
            const x = 50 + offset + col * 50;
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x, y + 22);
            g.strokePath();
          }
        }
        break;
      }

      case 'ice_wall': {
        // Vertical crack lines + horizontal shelf lines
        g.lineStyle(1, accentColor, 0.3);
        for (let i = 0; i < 3; i++) {
          const x = 70 + i * 50 + detailRandom(seed, i + 340) * 20;
          g.beginPath();
          g.moveTo(x, 10);
          g.lineTo(x + detailRandom(seed, i + 345) * 15, 120);
          g.strokePath();
        }
        g.lineStyle(1, brightenColor(palette.top, 20), 0.15);
        for (let i = 0; i < 2; i++) {
          const y = 40 + i * 40;
          g.beginPath();
          g.moveTo(30, y);
          g.lineTo(230, y + 3);
          g.strokePath();
        }
        break;
      }

      case 'fungal_growth': {
        // Large mushroom cap circles with stem lines
        g.fillStyle(accentColor, 0.3);
        for (let i = 0; i < 3; i++) {
          const pos = this.topDiamondPoint(seed, i + 370);
          g.fillCircle(pos.x, pos.y, 6 + detailRandom(seed, i + 375) * 5);
        }
        g.lineStyle(1, darkenColor(accentColor, 0.6), 0.3);
        for (let i = 0; i < 3; i++) {
          const pos = this.topDiamondPoint(seed, i + 370);
          g.beginPath();
          g.moveTo(pos.x, pos.y);
          g.lineTo(pos.x + (detailRandom(seed, i + 380) - 0.5) * 6, pos.y + 10);
          g.strokePath();
        }
        break;
      }

      case 'crater_debris': {
        // Angular shard shapes (triangles)
        g.fillStyle(accentColor, 0.3);
        for (let i = 0; i < 4; i++) {
          const pos = this.topDiamondPoint(seed, i + 385);
          const size = 5 + detailRandom(seed, i + 390) * 6;
          const angle = detailRandom(seed, i + 395) * Math.PI * 2;
          g.fillTriangle(
            pos.x, pos.y - size,
            pos.x - Math.cos(angle) * size, pos.y + Math.sin(angle) * size * 0.5,
            pos.x + Math.cos(angle) * size, pos.y + Math.sin(angle) * size * 0.5
          );
        }
        break;
      }

      case 'kelp_wall': {
        // Dense vertical kelp strands
        g.lineStyle(2, accentColor, 0.3);
        for (let i = 0; i < 5; i++) {
          const x = 50 + i * 35 + detailRandom(seed, i + 400) * 15;
          g.beginPath();
          g.moveTo(x, 15);
          g.lineTo(x + (detailRandom(seed, i + 405) - 0.5) * 10, 65);
          g.lineTo(x + (detailRandom(seed, i + 410) - 0.5) * 15, 115);
          g.strokePath();
        }
        break;
      }

      case 'void_rift_distortion': {
        // Spatial anomaly — concentric distortion rings
        g.lineStyle(1, accentColor, 0.4);
        for (let i = 0; i < 4; i++) {
          const r = 10 + i * 12;
          g.strokeCircle(HW, HH, r);
        }
        // Glitch rects
        g.fillStyle(accentColor, 0.3);
        for (let i = 0; i < 3; i++) {
          const pos = this.topDiamondPoint(seed, i + 415);
          g.fillRect(pos.x - 3, pos.y - 2, 6, 4);
        }
        break;
      }

      case 'crystal_formation_large': {
        // Large crystal spire lines
        g.lineStyle(1, accentColor, 0.4);
        for (let i = 0; i < 5; i++) {
          const baseX = 50 + i * 35;
          g.beginPath();
          g.moveTo(baseX, 115);
          g.lineTo(128 + (detailRandom(seed, i + 420) - 0.5) * 20, 10);
          g.strokePath();
        }
        g.fillStyle(0xffffff, 0.3);
        g.fillCircle(110, 30, 3);
        g.fillCircle(145, 25, 2);
        break;
      }

      case 'bioluminescent_flora': {
        // Dense glow undergrowth
        g.fillStyle(accentColor, 0.4);
        for (let i = 0; i < 10; i++) {
          const pos = this.topDiamondPoint(seed, i + 425);
          g.fillCircle(pos.x, pos.y, 2 + detailRandom(seed, i + 430) * 3);
        }
        g.lineStyle(1, brightenColor(palette.top, 30), 0.25);
        for (let i = 0; i < 4; i++) {
          const a = this.topDiamondPoint(seed, i + 435);
          const b = this.topDiamondPoint(seed, i + 440);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        break;
      }

      case 'trench_deep': {
        // Nearly invisible pressure lines, single glow dot
        g.lineStyle(1, accentColor, 0.1);
        for (let i = 0; i < 2; i++) {
          const a = this.topDiamondPoint(seed, i + 230);
          const b = this.topDiamondPoint(seed, i + 235);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        g.fillStyle(accentColor, 0.6);
        const pos = this.topDiamondPoint(seed, 240);
        g.fillCircle(pos.x, pos.y, 2);
        break;
      }
    }
  }
}
