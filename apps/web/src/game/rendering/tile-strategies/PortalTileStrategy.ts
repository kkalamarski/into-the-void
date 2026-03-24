import Phaser from 'phaser';
import type { TilePalette } from './types';
import { AbstractTileRenderStrategy, HW, HH } from './AbstractTileRenderStrategy';

/**
 * Handles rendering accents for portal/teleport tiles.
 * Features concentric rings with a glowing center.
 */
export class PortalTileStrategy extends AbstractTileRenderStrategy {
  readonly handledTileIds = [
    'portal',
  ] as const;

  drawTopAccents(
    g: Phaser.GameObjects.Graphics,
    _tileId: string,
    palette: TilePalette,
    _seed: number,
  ): void {
    const accentColor = palette.accent;

    // Concentric rings with glow
    g.lineStyle(1, accentColor, 0.5);
    for (let i = 0; i < 3; i++) {
      g.strokeCircle(HW, HH, 15 + i * 15);
    }
    g.fillStyle(accentColor, 0.3);
    g.fillCircle(HW, HH, 8);
  }
}
