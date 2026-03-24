import Phaser from 'phaser';
import type { TilePalette } from './types';
import { AbstractTileRenderStrategy, HW, HH, SH } from './AbstractTileRenderStrategy';
import { brightenColor, darkenColor, detailRandom } from './tile-palettes';

const HUB_PREFIXES = ['canopy', 'ironhold', 'meridian', 'salvage'] as const;
const HUB_SUFFIXES = ['floor', 'wall', 'door', 'corridor', 'decoration', 'accent', 'window'] as const;

// Build all hub tile IDs (excluding hazard — handled by HazardTileStrategy)
const HUB_TILE_IDS: string[] = [];
for (const prefix of HUB_PREFIXES) {
  for (const suffix of HUB_SUFFIXES) {
    HUB_TILE_IDS.push(`${prefix}_${suffix}`);
  }
}

/**
 * Handles rendering accents for hub station tiles (4 factions x 7 tile types).
 * Pattern matching by suffix — faction identity comes from palette colors.
 */
export class DecorativeTileStrategy extends AbstractTileRenderStrategy {
  readonly handledTileIds = HUB_TILE_IDS;

  drawTopAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    const accentColor = palette.accent;
    const altColor = palette.accentAlt ?? brightenColor(accentColor, 30);

    if (tileId.endsWith('_wall')) {
      // Wall tiles: heavy vertical panel lines — imposing, tall feel
      g.lineStyle(2, accentColor, 0.3);
      for (let i = 0; i < 4; i++) {
        const x = 60 + i * 40 + detailRandom(seed, i + 1500) * 10;
        g.beginPath();
        g.moveTo(x, 20);
        g.lineTo(x + 2, 108);
        g.strokePath();
      }
      // Thick border lines at top edges
      g.lineStyle(2, darkenColor(accentColor, 0.7), 0.25);
      g.beginPath();
      g.moveTo(HW, 4);
      g.lineTo(HW * 2 - 10, HH);
      g.strokePath();
      g.beginPath();
      g.moveTo(HW, 4);
      g.lineTo(10, HH);
      g.strokePath();
    } else if (tileId.endsWith('_door')) {
      // Door tiles: thin frame outline around top face edges, directional marks
      g.lineStyle(1, accentColor, 0.4);
      // Frame outline (inset from diamond edges)
      const inset = 20;
      g.beginPath();
      g.moveTo(HW, inset);
      g.lineTo(HW * 2 - inset * 2, HH);
      g.lineTo(HW, HH * 2 - inset);
      g.lineTo(inset * 2, HH);
      g.closePath();
      g.strokePath();
      // Small directional arrow marks
      g.fillStyle(accentColor, 0.3);
      g.fillTriangle(HW, 30, HW - 6, 42, HW + 6, 42);
      g.fillTriangle(HW, HH * 2 - 30, HW - 6, HH * 2 - 42, HW + 6, HH * 2 - 42);
    } else if (tileId.endsWith('_corridor')) {
      // Corridor tiles: grating lines across top face (parallel diagonal lines)
      g.lineStyle(1, accentColor, 0.2);
      for (let i = 0; i < 6; i++) {
        const p1 = { x: HW + (0.3 - i * 0.1) * HW, y: i * 12 + 10 };
        const p2 = { x: HW - (0.3 - i * 0.1) * HW, y: i * 12 + 10 + HH * 0.6 };
        g.beginPath();
        g.moveTo(p1.x, p1.y);
        g.lineTo(p2.x, p2.y);
        g.strokePath();
      }
      // Subtle edge detail on sides
      g.lineStyle(1, altColor, 0.15);
      g.beginPath();
      g.moveTo(30, HH - 5);
      g.lineTo(50, HH + 10);
      g.strokePath();
    } else if (tileId.endsWith('_decoration')) {
      // Decoration tiles: small raised rectangular console/machinery bump
      g.fillStyle(accentColor, 0.35);
      // Main console rectangle (slightly offset for 3D feel)
      const cx = HW, cy = HH - 5;
      g.fillRect(cx - 18, cy - 10, 36, 20);
      // Shadow below for depth
      g.fillStyle(darkenColor(accentColor, 0.5), 0.2);
      g.fillRect(cx - 16, cy + 10, 32, 4);
      // Button/light dots
      g.fillStyle(brightenColor(accentColor, 40), 0.5);
      for (let i = 0; i < 4; i++) {
        g.fillCircle(cx - 12 + i * 8, cy - 3, 1.5);
      }
    } else if (tileId.endsWith('_accent')) {
      // Accent tiles: scattered accent color dots/patches
      g.fillStyle(accentColor, 0.3);
      for (let i = 0; i < 10; i++) {
        const pos = this.topDiamondPoint(seed, i + 1550);
        const r = 2 + detailRandom(seed, i + 1555) * 3;
        g.fillCircle(pos.x, pos.y, r);
      }
      if (altColor) {
        g.fillStyle(altColor, 0.2);
        for (let i = 0; i < 4; i++) {
          const pos = this.topDiamondPoint(seed, i + 1560);
          g.fillCircle(pos.x, pos.y, 4 + detailRandom(seed, i + 1565) * 3);
        }
      }
    } else if (tileId.endsWith('_window')) {
      // Window tiles: top face has subtle frame marks (main glass is on side faces)
      g.lineStyle(1, accentColor, 0.3);
      // Frame border marks
      g.beginPath();
      g.moveTo(HW - 20, HH - 15);
      g.lineTo(HW + 20, HH - 15);
      g.lineTo(HW + 20, HH + 15);
      g.lineTo(HW - 20, HH + 15);
      g.closePath();
      g.strokePath();
      // Subtle glow inside
      g.fillStyle(accentColor, 0.1);
      g.fillRect(HW - 18, HH - 13, 36, 26);
    } else if (tileId.endsWith('_floor')) {
      // Hub floor tiles: use default (floor strata from AbstractTileRenderStrategy south/east)
      // Top accents: scattered subtle dots
      g.fillStyle(accentColor, 0.2);
      for (let i = 0; i < 6; i++) {
        const pos = this.topDiamondPoint(seed, i + 1550);
        g.fillCircle(pos.x, pos.y, 1.5 + detailRandom(seed, i + 1555) * 1.5);
      }
    }
  }

  drawSouthAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    const southAccent = darkenColor(palette.accent, 0.75);

    if (tileId.endsWith('_wall')) {
      // Wall: heavy bolted panel lines
      g.lineStyle(2, southAccent, 0.3);
      for (let i = 0; i < 4; i++) {
        const x = 10 + i * 30 + detailRandom(seed, i + 1600) * 8;
        g.beginPath();
        g.moveTo(x, HH + 8);
        g.lineTo(x + 3, HH + SH - 8);
        g.strokePath();
      }
      // Rivet dots
      g.fillStyle(southAccent, 0.35);
      for (let i = 0; i < 3; i++) {
        g.fillCircle(20 + i * 35, HH + 20 + detailRandom(seed, i + 1610) * 10, 2);
        g.fillCircle(20 + i * 35, HH + SH - 25 + detailRandom(seed, i + 1615) * 10, 2);
      }
    } else if (tileId.endsWith('_window')) {
      // Window: semi-transparent panel glow on south face
      g.fillStyle(palette.accent, 0.2);
      // Glass panel area
      const panelX = 15, panelY = HH + 15;
      const panelW = 90, panelH = SH - 30;
      g.fillRect(panelX, panelY, panelW, panelH);
      // Glow line at panel edges
      g.lineStyle(1, palette.accent, 0.5);
      g.strokeRect(panelX, panelY, panelW, panelH);
      // Inner highlight
      g.fillStyle(brightenColor(palette.accent, 30), 0.1);
      g.fillRect(panelX + 5, panelY + 5, panelW - 10, panelH - 10);
    } else {
      // Default hub south face: subtle horizontal strata
      g.lineStyle(1, southAccent, 0.15);
      for (let i = 0; i < 2; i++) {
        const y = HH + 20 + i * 40 + detailRandom(seed, i + 1620) * 10;
        g.beginPath();
        g.moveTo(10, y);
        g.lineTo(80, y + 5);
        g.strokePath();
      }
    }
  }

  drawEastAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    const eastAccent = darkenColor(palette.accent, 0.5);

    if (tileId.endsWith('_wall')) {
      // Wall: vertical panel lines (dimmer on shadow side)
      g.lineStyle(1, eastAccent, 0.2);
      for (let i = 0; i < 3; i++) {
        const x = 150 + i * 35 + detailRandom(seed, i + 1650) * 8;
        g.beginPath();
        g.moveTo(x, HH + 8);
        g.lineTo(x - 2, HH + SH - 8);
        g.strokePath();
      }
    } else if (tileId.endsWith('_window')) {
      // Window: semi-transparent panel glow on east face
      g.fillStyle(palette.accent, 0.15);
      const panelX = 145, panelY = HH + 15;
      const panelW = 90, panelH = SH - 30;
      g.fillRect(panelX, panelY, panelW, panelH);
      // Glow line at panel edges
      g.lineStyle(1, palette.accent, 0.4);
      g.strokeRect(panelX, panelY, panelW, panelH);
      // Inner highlight (dimmer on shadow side)
      g.fillStyle(brightenColor(palette.accent, 20), 0.08);
      g.fillRect(panelX + 5, panelY + 5, panelW - 10, panelH - 10);
    } else {
      // Default hub east face: minimal strata
      g.lineStyle(1, eastAccent, 0.1);
      for (let i = 0; i < 2; i++) {
        const y = HH + 25 + i * 45 + detailRandom(seed, i + 1660) * 10;
        g.beginPath();
        g.moveTo(145, y);
        g.lineTo(235, y - 5);
        g.strokePath();
      }
    }
  }
}
