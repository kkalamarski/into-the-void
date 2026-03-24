import Phaser from 'phaser';
import type { TilePalette } from './types';
import { AbstractTileRenderStrategy, HW, HH } from './AbstractTileRenderStrategy';
import { brightenColor, darkenColor, detailRandom } from './tile-palettes';

/**
 * Handles rendering accents for natural floor tiles.
 * Floor tiles feature surface details like pebbles, cracks, stains, ripples, etc.
 */
export class FloorTileStrategy extends AbstractTileRenderStrategy {
  readonly handledTileIds = [
    'void_floor', 'crystal_floor', 'toxic_floor', 'ruins_floor',
    'ice_floor', 'volcanic_floor', 'fungal_floor', 'crater_floor',
    'tidal_floor', 'kelp_floor', 'trench_floor', 'shore_transition',
    'void_rift_floor', 'crystalline_floor', 'bioluminescent_floor',
  ] as const;

  drawTopAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    const accentColor = palette.accent;
    const altColor = palette.accentAlt ?? brightenColor(accentColor, 30);

    switch (tileId) {
      case 'void_floor': {
        // Scattered pebbles + thin cracks
        g.fillStyle(accentColor, 0.5);
        for (let i = 0; i < 8; i++) {
          const pos = this.topDiamondPoint(seed, i);
          g.fillCircle(pos.x, pos.y, 2 + detailRandom(seed, i + 100) * 2);
        }
        g.lineStyle(1, altColor, 0.3);
        for (let i = 0; i < 3; i++) {
          const a = this.topDiamondPoint(seed, i + 20);
          const b = this.topDiamondPoint(seed, i + 25);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        break;
      }

      case 'crystal_floor': {
        // Reflective facet lines + bright crystal dots
        g.lineStyle(1, accentColor, 0.4);
        for (let i = 0; i < 5; i++) {
          const a = this.topDiamondPoint(seed, i + 30);
          const b = this.topDiamondPoint(seed, i + 35);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        g.fillStyle(accentColor, 0.6);
        for (let i = 0; i < 4; i++) {
          const pos = this.topDiamondPoint(seed, i + 40);
          g.fillCircle(pos.x, pos.y, 1.5);
        }
        break;
      }

      case 'toxic_floor': {
        // Irregular stain patches
        g.fillStyle(accentColor, 0.25);
        for (let i = 0; i < 4; i++) {
          const pos = this.topDiamondPoint(seed, i + 50);
          const r = 6 + detailRandom(seed, i + 55) * 8;
          g.fillCircle(pos.x, pos.y, r);
        }
        break;
      }

      case 'ruins_floor': {
        // Grid-like crack pattern (old tile floor)
        g.lineStyle(1, altColor, 0.25);
        for (let i = 0; i < 4; i++) {
          const y = 30 + i * 25;
          g.beginPath();
          g.moveTo(40 + detailRandom(seed, i + 60) * 20, y);
          g.lineTo(200 + detailRandom(seed, i + 65) * 20, y + 10);
          g.strokePath();
        }
        for (let i = 0; i < 3; i++) {
          const x = 60 + i * 55;
          g.beginPath();
          g.moveTo(x, 20 + detailRandom(seed, i + 70) * 10);
          g.lineTo(x + 10, 110 + detailRandom(seed, i + 75) * 10);
          g.strokePath();
        }
        break;
      }

      case 'ice_floor': {
        // Long scratch lines + frozen bubble dots
        g.lineStyle(1, accentColor, 0.3);
        for (let i = 0; i < 4; i++) {
          const a = this.topDiamondPoint(seed, i + 80);
          const b = this.topDiamondPoint(seed, i + 85);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        g.fillStyle(accentColor, 0.2);
        for (let i = 0; i < 5; i++) {
          const pos = this.topDiamondPoint(seed, i + 90);
          g.fillCircle(pos.x, pos.y, 1 + detailRandom(seed, i + 95) * 1.5);
        }
        break;
      }

      case 'volcanic_floor': {
        // Crack lines with orange glow + ember dots
        g.lineStyle(1, accentColor, 0.5);
        for (let i = 0; i < 3; i++) {
          const a = this.topDiamondPoint(seed, i + 100);
          const b = this.topDiamondPoint(seed, i + 105);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        g.fillStyle(accentColor, 0.6);
        for (let i = 0; i < 6; i++) {
          const pos = this.topDiamondPoint(seed, i + 110);
          g.fillCircle(pos.x, pos.y, 1 + detailRandom(seed, i + 115) * 1.5);
        }
        break;
      }

      case 'fungal_floor': {
        // Circular spore dots + curved tendrils
        g.fillStyle(accentColor, 0.4);
        for (let i = 0; i < 7; i++) {
          const pos = this.topDiamondPoint(seed, i + 120);
          g.fillCircle(pos.x, pos.y, 1.5 + detailRandom(seed, i + 125) * 2);
        }
        g.lineStyle(1, accentColor, 0.3);
        for (let i = 0; i < 3; i++) {
          const a = this.topDiamondPoint(seed, i + 130);
          const cx = a.x + (detailRandom(seed, i + 135) - 0.5) * 30;
          const cy = a.y + (detailRandom(seed, i + 136) - 0.5) * 20;
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(cx, cy);
          g.strokePath();
        }
        break;
      }

      case 'crater_floor': {
        // Metallic flecks + radiating impact lines
        g.fillStyle(accentColor, 0.4);
        for (let i = 0; i < 8; i++) {
          const pos = this.topDiamondPoint(seed, i + 140);
          g.fillCircle(pos.x, pos.y, 1 + detailRandom(seed, i + 145) * 1);
        }
        g.lineStyle(1, accentColor, 0.2);
        const center = { x: HW, y: HH };
        for (let i = 0; i < 4; i++) {
          const angle = detailRandom(seed, i + 150) * Math.PI * 2;
          const len = 15 + detailRandom(seed, i + 155) * 25;
          g.beginPath();
          g.moveTo(center.x, center.y);
          g.lineTo(center.x + Math.cos(angle) * len, center.y + Math.sin(angle) * len * 0.5);
          g.strokePath();
        }
        break;
      }

      case 'tidal_floor': {
        // Wavy sand ripple lines + shell dots
        g.lineStyle(1, accentColor, 0.2);
        for (let i = 0; i < 5; i++) {
          const baseY = 20 + i * 22;
          g.beginPath();
          g.moveTo(40, baseY + detailRandom(seed, i + 160) * 10);
          g.lineTo(100, baseY + 5 + detailRandom(seed, i + 165) * 10);
          g.lineTo(170, baseY + detailRandom(seed, i + 170) * 10);
          g.lineTo(220, baseY + 5 + detailRandom(seed, i + 175) * 10);
          g.strokePath();
        }
        g.fillStyle(altColor, 0.3);
        for (let i = 0; i < 4; i++) {
          const pos = this.topDiamondPoint(seed, i + 180);
          g.fillCircle(pos.x, pos.y, 1.5);
        }
        break;
      }

      case 'kelp_floor': {
        // Organic curved lines + bubble circles
        g.lineStyle(1, accentColor, 0.3);
        for (let i = 0; i < 4; i++) {
          const a = this.topDiamondPoint(seed, i + 195);
          const b = this.topDiamondPoint(seed, i + 200);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        g.fillStyle(brightenColor(palette.top, 20), 0.25);
        for (let i = 0; i < 5; i++) {
          const pos = this.topDiamondPoint(seed, i + 205);
          g.fillCircle(pos.x, pos.y, 1.5 + detailRandom(seed, i + 210) * 1);
        }
        break;
      }

      case 'trench_floor': {
        // Subtle pressure lines + rare bioluminescent dots
        g.lineStyle(1, accentColor, 0.15);
        for (let i = 0; i < 3; i++) {
          const a = this.topDiamondPoint(seed, i + 215);
          const b = this.topDiamondPoint(seed, i + 220);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        g.fillStyle(accentColor, 0.5);
        for (let i = 0; i < 2; i++) {
          const pos = this.topDiamondPoint(seed, i + 225);
          g.fillCircle(pos.x, pos.y, 1.5);
        }
        break;
      }

      case 'shore_transition': {
        // Parallel wave lines + scattered pebbles
        g.lineStyle(1, accentColor, 0.2);
        for (let i = 0; i < 4; i++) {
          const baseY = 25 + i * 25;
          g.beginPath();
          g.moveTo(50, baseY);
          g.lineTo(128, baseY + 5 + detailRandom(seed, i + 245) * 8);
          g.lineTo(210, baseY);
          g.strokePath();
        }
        g.fillStyle(darkenColor(palette.top, 0.7), 0.3);
        for (let i = 0; i < 5; i++) {
          const p = this.topDiamondPoint(seed, i + 250);
          g.fillCircle(p.x, p.y, 1.5);
        }
        break;
      }

      // ── Exotic biomes: abstract patterns ──

      case 'void_rift_floor': {
        // Glitchy pixel blocks + energy vein lines
        g.fillStyle(accentColor, 0.4);
        for (let i = 0; i < 6; i++) {
          const pos = this.topDiamondPoint(seed, i + 260);
          const size = 3 + detailRandom(seed, i + 265) * 5;
          g.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
        }
        g.lineStyle(1, accentColor, 0.5);
        for (let i = 0; i < 3; i++) {
          const a = this.topDiamondPoint(seed, i + 270);
          const b = this.topDiamondPoint(seed, i + 275);
          const mid = { x: (a.x + b.x) / 2 + (detailRandom(seed, i + 280) - 0.5) * 20, y: (a.y + b.y) / 2 };
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(mid.x, mid.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        break;
      }

      case 'crystalline_floor': {
        // Prismatic facet lines in multiple colors + bright points
        const prismColors = [accentColor, 0xffccee, 0xccffee, 0xeeccff];
        for (let i = 0; i < 6; i++) {
          g.lineStyle(1, prismColors[i % prismColors.length], 0.3);
          const a = this.topDiamondPoint(seed, i + 285);
          const b = this.topDiamondPoint(seed, i + 290);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        g.fillStyle(0xffffff, 0.5);
        for (let i = 0; i < 4; i++) {
          const pos = this.topDiamondPoint(seed, i + 295);
          g.fillCircle(pos.x, pos.y, 1.5);
        }
        break;
      }

      case 'bioluminescent_floor': {
        // Scattered glow dots + organic vein lines
        g.fillStyle(accentColor, 0.5);
        for (let i = 0; i < 8; i++) {
          const pos = this.topDiamondPoint(seed, i + 300);
          const r = 1.5 + detailRandom(seed, i + 305) * 2.5;
          g.fillCircle(pos.x, pos.y, r);
        }
        g.lineStyle(1, brightenColor(palette.top, 40), 0.3);
        for (let i = 0; i < 3; i++) {
          const a = this.topDiamondPoint(seed, i + 310);
          const b = this.topDiamondPoint(seed, i + 315);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.strokePath();
        }
        break;
      }
    }
  }

  drawDecorationAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
    decoIndex: number,
  ): void {
    const accent = palette.accent;
    const alt = palette.accentAlt ?? brightenColor(accent, 30);

    switch (tileId) {
      case 'void_floor': {
        if (decoIndex === 0) {
          // Void crystals — small diamond shapes
          g.fillStyle(brightenColor(accent, 40), 0.45);
          for (let i = 0; i < 5; i++) {
            const p = this.topDiamondPoint(seed, i + 700);
            const s = 3 + detailRandom(seed, i + 705) * 3;
            g.fillTriangle(p.x, p.y - s, p.x - s * 0.6, p.y, p.x + s * 0.6, p.y);
            g.fillTriangle(p.x, p.y + s * 0.7, p.x - s * 0.6, p.y, p.x + s * 0.6, p.y);
          }
        } else if (decoIndex === 1) {
          // Runic etchings — angular connected segments
          g.lineStyle(1, alt, 0.4);
          for (let i = 0; i < 4; i++) {
            const a = this.topDiamondPoint(seed, i + 710);
            const b = this.topDiamondPoint(seed, i + 711);
            const c = this.topDiamondPoint(seed, i + 712);
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
            g.lineTo(c.x, c.y);
            g.strokePath();
          }
        } else {
          // Dark moss patches — large dim irregular circles
          g.fillStyle(darkenColor(palette.top, 0.8), 0.3);
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 720);
            g.fillCircle(p.x, p.y, 8 + detailRandom(seed, i + 725) * 6);
          }
          g.fillStyle(accent, 0.15);
          for (let i = 0; i < 4; i++) {
            const p = this.topDiamondPoint(seed, i + 730);
            g.fillCircle(p.x, p.y, 3 + detailRandom(seed, i + 735) * 3);
          }
        }
        break;
      }

      case 'crystal_floor': {
        if (decoIndex === 0) {
          // Crystal shards — small triangular fragments
          g.fillStyle(accent, 0.5);
          for (let i = 0; i < 6; i++) {
            const p = this.topDiamondPoint(seed, i + 740);
            const s = 3 + detailRandom(seed, i + 745) * 4;
            const angle = detailRandom(seed, i + 746) * Math.PI * 2;
            g.fillTriangle(
              p.x, p.y - s,
              p.x - Math.cos(angle) * s, p.y + Math.sin(angle) * s * 0.5,
              p.x + Math.cos(angle) * s * 0.6, p.y + s * 0.4
            );
          }
        } else if (decoIndex === 1) {
          // Crystal veins — branching lines from anchor points
          g.lineStyle(1, accent, 0.5);
          for (let i = 0; i < 3; i++) {
            const root = this.topDiamondPoint(seed, i + 750);
            for (let j = 0; j < 3; j++) {
              const angle = detailRandom(seed, i * 3 + j + 755) * Math.PI * 2;
              const len = 10 + detailRandom(seed, i * 3 + j + 760) * 15;
              g.beginPath();
              g.moveTo(root.x, root.y);
              g.lineTo(root.x + Math.cos(angle) * len, root.y + Math.sin(angle) * len * 0.5);
              g.strokePath();
            }
          }
        } else {
          // Refraction spots — overlapping translucent circles
          const colors = [accent, 0xeeffff, alt];
          for (let i = 0; i < 5; i++) {
            g.fillStyle(colors[i % 3], 0.2);
            const p = this.topDiamondPoint(seed, i + 770);
            g.fillCircle(p.x, p.y, 5 + detailRandom(seed, i + 775) * 5);
          }
        }
        break;
      }

      case 'toxic_floor': {
        if (decoIndex === 0) {
          // Acid bubbles — ring circles
          g.lineStyle(1, accent, 0.4);
          for (let i = 0; i < 5; i++) {
            const p = this.topDiamondPoint(seed, i + 780);
            const r = 3 + detailRandom(seed, i + 785) * 5;
            g.strokeCircle(p.x, p.y, r);
          }
          g.fillStyle(accent, 0.3);
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 790);
            g.fillCircle(p.x, p.y, 1.5);
          }
        } else if (decoIndex === 1) {
          // Corrosion zigzag marks
          g.lineStyle(1, alt, 0.35);
          for (let i = 0; i < 4; i++) {
            const start = this.topDiamondPoint(seed, i + 795);
            g.beginPath();
            g.moveTo(start.x, start.y);
            let cx = start.x, cy = start.y;
            for (let s = 0; s < 4; s++) {
              cx += (detailRandom(seed, i * 4 + s + 800) - 0.5) * 12;
              cy += (detailRandom(seed, i * 4 + s + 801) - 0.3) * 8;
              g.lineTo(cx, cy);
            }
            g.strokePath();
          }
        } else {
          // Contamination splotches — large irregular stains
          g.fillStyle(accent, 0.15);
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 820);
            const r = 10 + detailRandom(seed, i + 825) * 8;
            g.fillCircle(p.x, p.y, r);
          }
          g.fillStyle(darkenColor(accent, 0.7), 0.2);
          for (let i = 0; i < 4; i++) {
            const p = this.topDiamondPoint(seed, i + 830);
            g.fillCircle(p.x, p.y, 4 + detailRandom(seed, i + 835) * 4);
          }
        }
        break;
      }

      case 'ruins_floor': {
        if (decoIndex === 0) {
          // Rubble scatter — small rotated rectangles
          g.fillStyle(accent, 0.3);
          for (let i = 0; i < 7; i++) {
            const p = this.topDiamondPoint(seed, i + 840);
            const w = 2 + detailRandom(seed, i + 845) * 4;
            const h = 2 + detailRandom(seed, i + 846) * 3;
            g.fillRect(p.x - w / 2, p.y - h / 2, w, h);
          }
        } else if (decoIndex === 1) {
          // Mosaic fragments — small colored squares in clusters
          const colors = [accent, alt, darkenColor(accent, 0.7)];
          for (let i = 0; i < 8; i++) {
            g.fillStyle(colors[i % 3], 0.35);
            const p = this.topDiamondPoint(seed, i + 850);
            g.fillRect(p.x - 2, p.y - 2, 4, 4);
          }
        } else {
          // Vine tendrils — curved lines with leaf dots
          g.lineStyle(1, 0x4a6a30, 0.35);
          for (let i = 0; i < 3; i++) {
            const a = this.topDiamondPoint(seed, i + 860);
            const b = this.topDiamondPoint(seed, i + 865);
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo((a.x + b.x) / 2 + (detailRandom(seed, i + 870) - 0.5) * 20, (a.y + b.y) / 2);
            g.lineTo(b.x, b.y);
            g.strokePath();
          }
          g.fillStyle(0x5a8a3a, 0.3);
          for (let i = 0; i < 5; i++) {
            const p = this.topDiamondPoint(seed, i + 875);
            g.fillCircle(p.x, p.y, 2);
          }
        }
        break;
      }

      case 'ice_floor': {
        if (decoIndex === 0) {
          // Snowdrift — soft overlapping bright circles
          g.fillStyle(accent, 0.2);
          for (let i = 0; i < 4; i++) {
            const p = this.topDiamondPoint(seed, i + 880);
            g.fillCircle(p.x, p.y, 8 + detailRandom(seed, i + 885) * 6);
          }
          g.fillStyle(brightenColor(palette.top, 30), 0.15);
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 890);
            g.fillCircle(p.x, p.y, 5 + detailRandom(seed, i + 895) * 4);
          }
        } else if (decoIndex === 1) {
          // Frost burst — star lines from center points
          g.lineStyle(1, accent, 0.35);
          for (let i = 0; i < 2; i++) {
            const center = this.topDiamondPoint(seed, i + 900);
            for (let r = 0; r < 6; r++) {
              const angle = (r / 6) * Math.PI * 2 + detailRandom(seed, i + r + 905) * 0.3;
              const len = 8 + detailRandom(seed, i + r + 910) * 10;
              g.beginPath();
              g.moveTo(center.x, center.y);
              g.lineTo(center.x + Math.cos(angle) * len, center.y + Math.sin(angle) * len * 0.5);
              g.strokePath();
            }
          }
        } else {
          // Ice crystal hexagons — hexagonal outlines
          g.lineStyle(1, accent, 0.3);
          for (let i = 0; i < 3; i++) {
            const c = this.topDiamondPoint(seed, i + 920);
            const r = 5 + detailRandom(seed, i + 925) * 4;
            g.beginPath();
            for (let v = 0; v <= 6; v++) {
              const angle = (v / 6) * Math.PI * 2;
              const px = c.x + Math.cos(angle) * r;
              const py = c.y + Math.sin(angle) * r * 0.5;
              if (v === 0) g.moveTo(px, py);
              else g.lineTo(px, py);
            }
            g.closePath();
            g.strokePath();
          }
        }
        break;
      }

      case 'volcanic_floor': {
        if (decoIndex === 0) {
          // Cooled lava chunks — dark irregular shapes
          g.fillStyle(darkenColor(palette.top, 0.6), 0.5);
          for (let i = 0; i < 5; i++) {
            const p = this.topDiamondPoint(seed, i + 930);
            const s = 3 + detailRandom(seed, i + 935) * 4;
            g.fillRect(p.x - s / 2, p.y - s / 2, s, s * 0.7);
          }
          g.fillStyle(accent, 0.3);
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 940);
            g.fillCircle(p.x, p.y, 1.5);
          }
        } else if (decoIndex === 1) {
          // Scorch marks — radial lines from multiple burn points
          g.lineStyle(1, accent, 0.45);
          for (let i = 0; i < 3; i++) {
            const center = this.topDiamondPoint(seed, i + 945);
            for (let r = 0; r < 4; r++) {
              const angle = detailRandom(seed, i * 4 + r + 950) * Math.PI * 2;
              const len = 6 + detailRandom(seed, i * 4 + r + 955) * 12;
              g.beginPath();
              g.moveTo(center.x, center.y);
              g.lineTo(center.x + Math.cos(angle) * len, center.y + Math.sin(angle) * len * 0.5);
              g.strokePath();
            }
          }
        } else {
          // Ash scatter — many tiny dots at varying alpha
          for (let i = 0; i < 15; i++) {
            const alpha = 0.15 + detailRandom(seed, i + 965) * 0.25;
            g.fillStyle(darkenColor(palette.top, 0.5), alpha);
            const p = this.topDiamondPoint(seed, i + 970);
            g.fillCircle(p.x, p.y, 1 + detailRandom(seed, i + 975) * 1.5);
          }
        }
        break;
      }

      case 'fungal_floor': {
        if (decoIndex === 0) {
          // Mycelium network — thin branching connected lines
          g.lineStyle(1, brightenColor(palette.top, 25), 0.3);
          for (let i = 0; i < 4; i++) {
            const root = this.topDiamondPoint(seed, i + 980);
            let cx = root.x, cy = root.y;
            g.beginPath();
            g.moveTo(cx, cy);
            for (let s = 0; s < 5; s++) {
              cx += (detailRandom(seed, i * 5 + s + 985) - 0.5) * 16;
              cy += (detailRandom(seed, i * 5 + s + 986) - 0.5) * 10;
              g.lineTo(cx, cy);
            }
            g.strokePath();
          }
        } else if (decoIndex === 1) {
          // Mini mushroom clusters — cap circles + stem lines
          g.fillStyle(accent, 0.4);
          for (let i = 0; i < 5; i++) {
            const p = this.topDiamondPoint(seed, i + 1010);
            const capR = 2 + detailRandom(seed, i + 1015) * 2;
            g.fillCircle(p.x, p.y, capR);
            g.lineStyle(1, darkenColor(accent, 0.6), 0.3);
            g.beginPath();
            g.moveTo(p.x, p.y + capR * 0.5);
            g.lineTo(p.x + (detailRandom(seed, i + 1016) - 0.5) * 2, p.y + capR + 3);
            g.strokePath();
          }
        } else {
          // Spore clouds — large very faint circles
          g.fillStyle(accent, 0.1);
          for (let i = 0; i < 4; i++) {
            const p = this.topDiamondPoint(seed, i + 1020);
            g.fillCircle(p.x, p.y, 10 + detailRandom(seed, i + 1025) * 8);
          }
          g.fillStyle(accent, 0.25);
          for (let i = 0; i < 6; i++) {
            const p = this.topDiamondPoint(seed, i + 1030);
            g.fillCircle(p.x, p.y, 1 + detailRandom(seed, i + 1035) * 1);
          }
        }
        break;
      }

      case 'crater_floor': {
        if (decoIndex === 0) {
          // Impact rings — concentric circle outlines
          g.lineStyle(1, accent, 0.3);
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 1040);
            const baseR = 4 + detailRandom(seed, i + 1045) * 4;
            g.strokeCircle(p.x, p.y, baseR);
            g.strokeCircle(p.x, p.y, baseR + 3);
          }
        } else if (decoIndex === 1) {
          // Meteorite fragments — small angular filled shapes
          g.fillStyle(alt, 0.4);
          for (let i = 0; i < 6; i++) {
            const p = this.topDiamondPoint(seed, i + 1050);
            const s = 2 + detailRandom(seed, i + 1055) * 3;
            const angle = detailRandom(seed, i + 1056) * Math.PI;
            g.fillTriangle(
              p.x, p.y - s,
              p.x - Math.cos(angle) * s, p.y + s * 0.5,
              p.x + Math.cos(angle) * s * 0.8, p.y + s * 0.3
            );
          }
        } else {
          // Dust swirls — curved arc groups
          g.lineStyle(1, accent, 0.2);
          for (let i = 0; i < 4; i++) {
            const p = this.topDiamondPoint(seed, i + 1060);
            const r = 6 + detailRandom(seed, i + 1065) * 8;
            const startAngle = detailRandom(seed, i + 1066) * Math.PI;
            g.beginPath();
            g.arc(p.x, p.y, r, startAngle, startAngle + Math.PI * 0.7, false);
            g.strokePath();
          }
        }
        break;
      }

      case 'tidal_floor': {
        if (decoIndex === 0) {
          // Tide pools — small circles with water color fill
          g.fillStyle(accent, 0.25);
          for (let i = 0; i < 4; i++) {
            const p = this.topDiamondPoint(seed, i + 1070);
            const r = 4 + detailRandom(seed, i + 1075) * 5;
            g.fillCircle(p.x, p.y, r);
          }
          g.lineStyle(1, accent, 0.3);
          for (let i = 0; i < 4; i++) {
            const p = this.topDiamondPoint(seed, i + 1070);
            const r = 4 + detailRandom(seed, i + 1075) * 5;
            g.strokeCircle(p.x, p.y, r);
          }
        } else if (decoIndex === 1) {
          // Seaweed bits — short curved colored lines
          g.lineStyle(1, 0x3a7a3a, 0.35);
          for (let i = 0; i < 6; i++) {
            const a = this.topDiamondPoint(seed, i + 1080);
            const len = 6 + detailRandom(seed, i + 1085) * 8;
            const angle = detailRandom(seed, i + 1086) * Math.PI;
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo(a.x + Math.cos(angle) * len, a.y + Math.sin(angle) * len * 0.5);
            g.strokePath();
          }
        } else {
          // Shell scatter — mixed small shapes
          g.fillStyle(alt, 0.3);
          for (let i = 0; i < 6; i++) {
            const p = this.topDiamondPoint(seed, i + 1090);
            if (i % 2 === 0) {
              g.fillCircle(p.x, p.y, 1.5 + detailRandom(seed, i + 1095) * 1);
            } else {
              const s = 2 + detailRandom(seed, i + 1096) * 1.5;
              g.fillTriangle(p.x, p.y - s, p.x - s, p.y + s * 0.5, p.x + s, p.y + s * 0.5);
            }
          }
        }
        break;
      }

      case 'kelp_floor': {
        if (decoIndex === 0) {
          // Kelp frond patches — wider curved strokes
          g.lineStyle(2, accent, 0.3);
          for (let i = 0; i < 4; i++) {
            const a = this.topDiamondPoint(seed, i + 1100);
            const b = this.topDiamondPoint(seed, i + 1105);
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo((a.x + b.x) / 2 + (detailRandom(seed, i + 1110) - 0.5) * 15, (a.y + b.y) / 2);
            g.lineTo(b.x, b.y);
            g.strokePath();
          }
        } else if (decoIndex === 1) {
          // Sediment swirls — curved arcs
          g.lineStyle(1, darkenColor(palette.top, 0.8), 0.25);
          for (let i = 0; i < 5; i++) {
            const p = this.topDiamondPoint(seed, i + 1115);
            const r = 6 + detailRandom(seed, i + 1120) * 8;
            g.beginPath();
            g.arc(p.x, p.y, r, 0, Math.PI * 0.8, false);
            g.strokePath();
          }
        } else {
          // Sea anemone — small circles with radiating lines
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 1125);
            g.fillStyle(brightenColor(accent, 30), 0.3);
            g.fillCircle(p.x, p.y, 3);
            g.lineStyle(1, accent, 0.25);
            for (let r = 0; r < 5; r++) {
              const angle = (r / 5) * Math.PI * 2 + detailRandom(seed, i + r + 1130) * 0.5;
              g.beginPath();
              g.moveTo(p.x, p.y);
              g.lineTo(p.x + Math.cos(angle) * 6, p.y + Math.sin(angle) * 4);
              g.strokePath();
            }
          }
        }
        break;
      }

      case 'trench_floor': {
        if (decoIndex === 0) {
          // Pressure fractures — deep angular intersecting lines
          g.lineStyle(1, accent, 0.25);
          for (let i = 0; i < 4; i++) {
            const a = this.topDiamondPoint(seed, i + 1140);
            const b = this.topDiamondPoint(seed, i + 1145);
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
            g.strokePath();
          }
        } else if (decoIndex === 1) {
          // Vent glow spots — small bright circles
          g.fillStyle(accent, 0.5);
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 1150);
            g.fillCircle(p.x, p.y, 2 + detailRandom(seed, i + 1155) * 2);
          }
          g.fillStyle(accent, 0.15);
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 1150);
            g.fillCircle(p.x, p.y, 6 + detailRandom(seed, i + 1160) * 4);
          }
        } else {
          // Sediment layers — wavy parallel lines
          g.lineStyle(1, accent, 0.15);
          for (let i = 0; i < 4; i++) {
            const baseY = 25 + i * 22;
            g.beginPath();
            g.moveTo(50, baseY + detailRandom(seed, i + 1165) * 8);
            g.lineTo(128, baseY + 4 + detailRandom(seed, i + 1170) * 8);
            g.lineTo(210, baseY + detailRandom(seed, i + 1175) * 8);
            g.strokePath();
          }
        }
        break;
      }

      case 'shore_transition': {
        if (decoIndex === 0) {
          // Shell scatter — small varied shapes
          g.fillStyle(darkenColor(palette.top, 0.7), 0.35);
          for (let i = 0; i < 6; i++) {
            const p = this.topDiamondPoint(seed, i + 1180);
            if (i % 3 === 0) g.fillCircle(p.x, p.y, 2);
            else if (i % 3 === 1) {
              const s = 2;
              g.fillTriangle(p.x, p.y - s, p.x - s, p.y + s, p.x + s, p.y + s);
            } else g.fillRect(p.x - 1, p.y - 1, 3, 2);
          }
        } else if (decoIndex === 1) {
          // Driftwood — short thick angled lines
          g.lineStyle(2, darkenColor(palette.top, 0.6), 0.3);
          for (let i = 0; i < 4; i++) {
            const a = this.topDiamondPoint(seed, i + 1190);
            const angle = detailRandom(seed, i + 1195) * Math.PI;
            const len = 8 + detailRandom(seed, i + 1196) * 8;
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo(a.x + Math.cos(angle) * len, a.y + Math.sin(angle) * len * 0.4);
            g.strokePath();
          }
        } else {
          // Wet sand patches — darker circles
          g.fillStyle(darkenColor(palette.top, 0.85), 0.25);
          for (let i = 0; i < 4; i++) {
            const p = this.topDiamondPoint(seed, i + 1200);
            g.fillCircle(p.x, p.y, 7 + detailRandom(seed, i + 1205) * 6);
          }
        }
        break;
      }

      case 'void_rift_floor': {
        if (decoIndex === 0) {
          // Dimensional tears — bright zigzag lines
          g.lineStyle(1, accent, 0.6);
          for (let i = 0; i < 3; i++) {
            const start = this.topDiamondPoint(seed, i + 1210);
            g.beginPath();
            g.moveTo(start.x, start.y);
            let cx = start.x, cy = start.y;
            for (let s = 0; s < 4; s++) {
              cx += (detailRandom(seed, i * 4 + s + 1215) - 0.5) * 18;
              cy += (detailRandom(seed, i * 4 + s + 1216) - 0.5) * 10;
              g.lineTo(cx, cy);
            }
            g.strokePath();
          }
        } else if (decoIndex === 1) {
          // Reality fragments — offset rectangles with gaps
          g.fillStyle(accent, 0.35);
          for (let i = 0; i < 5; i++) {
            const p = this.topDiamondPoint(seed, i + 1230);
            const w = 3 + detailRandom(seed, i + 1235) * 5;
            const h = 2 + detailRandom(seed, i + 1236) * 4;
            g.fillRect(p.x - w / 2, p.y - h / 2, w, h);
          }
          g.lineStyle(1, brightenColor(accent, 40), 0.3);
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 1240);
            g.strokeRect(p.x - 3, p.y - 2, 6, 4);
          }
        } else {
          // Energy sparks — bright dots with line tails
          g.fillStyle(brightenColor(accent, 50), 0.5);
          for (let i = 0; i < 6; i++) {
            const p = this.topDiamondPoint(seed, i + 1250);
            g.fillCircle(p.x, p.y, 1.5);
            g.lineStyle(1, accent, 0.3);
            const angle = detailRandom(seed, i + 1255) * Math.PI * 2;
            g.beginPath();
            g.moveTo(p.x, p.y);
            g.lineTo(p.x + Math.cos(angle) * 8, p.y + Math.sin(angle) * 5);
            g.strokePath();
          }
        }
        break;
      }

      case 'crystalline_floor': {
        if (decoIndex === 0) {
          // Rainbow shards — multi-colored triangles
          const colors = [0xffccee, 0xccffee, 0xeeccff, accent];
          for (let i = 0; i < 5; i++) {
            g.fillStyle(colors[i % 4], 0.35);
            const p = this.topDiamondPoint(seed, i + 1260);
            const s = 3 + detailRandom(seed, i + 1265) * 3;
            g.fillTriangle(p.x, p.y - s, p.x - s * 0.7, p.y + s * 0.3, p.x + s * 0.7, p.y + s * 0.3);
          }
        } else if (decoIndex === 1) {
          // Crystal dust — many tiny bright dots
          g.fillStyle(0xffffff, 0.4);
          for (let i = 0; i < 12; i++) {
            const p = this.topDiamondPoint(seed, i + 1270);
            g.fillCircle(p.x, p.y, 0.8 + detailRandom(seed, i + 1275) * 0.8);
          }
        } else {
          // Prismatic fractures — colored line segments
          const colors = [0xffccee, 0xccffee, 0xeeccff, 0xffeebb];
          for (let i = 0; i < 5; i++) {
            g.lineStyle(1, colors[i % 4], 0.35);
            const a = this.topDiamondPoint(seed, i + 1280);
            const b = this.topDiamondPoint(seed, i + 1285);
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
            g.strokePath();
          }
        }
        break;
      }

      case 'bioluminescent_floor': {
        if (decoIndex === 0) {
          // Glow tendrils — curved lines with bright endpoints
          g.lineStyle(1, accent, 0.35);
          for (let i = 0; i < 4; i++) {
            const a = this.topDiamondPoint(seed, i + 1290);
            const b = this.topDiamondPoint(seed, i + 1295);
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo((a.x + b.x) / 2 + (detailRandom(seed, i + 1300) - 0.5) * 15, (a.y + b.y) / 2);
            g.lineTo(b.x, b.y);
            g.strokePath();
            g.fillStyle(brightenColor(accent, 40), 0.5);
            g.fillCircle(b.x, b.y, 2);
          }
        } else if (decoIndex === 1) {
          // Light clusters — grouped bright dots
          for (let i = 0; i < 3; i++) {
            const center = this.topDiamondPoint(seed, i + 1305);
            for (let j = 0; j < 4; j++) {
              const dx = (detailRandom(seed, i * 4 + j + 1310) - 0.5) * 10;
              const dy = (detailRandom(seed, i * 4 + j + 1311) - 0.5) * 6;
              g.fillStyle(accent, 0.3 + detailRandom(seed, i * 4 + j + 1312) * 0.3);
              g.fillCircle(center.x + dx, center.y + dy, 1.5 + detailRandom(seed, i * 4 + j + 1313) * 1.5);
            }
          }
        } else {
          // Phosphorescent patches — large soft glowing circles
          g.fillStyle(accent, 0.1);
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 1320);
            g.fillCircle(p.x, p.y, 10 + detailRandom(seed, i + 1325) * 8);
          }
          g.fillStyle(brightenColor(accent, 30), 0.2);
          for (let i = 0; i < 3; i++) {
            const p = this.topDiamondPoint(seed, i + 1320);
            g.fillCircle(p.x, p.y, 4 + detailRandom(seed, i + 1330) * 3);
          }
        }
        break;
      }

      default:
        // Fallback: generic decoration dots
        super.drawDecorationAccents(g, tileId, palette, seed, decoIndex);
        break;
    }
  }
}
