import Phaser from 'phaser';
import type { TilePalette } from './types';
import { AbstractTileRenderStrategy } from './AbstractTileRenderStrategy';
import { detailRandom } from './tile-palettes';

/**
 * Handles rendering accents for water/liquid surface tiles.
 * Currently handles tidal_shallow with concentric ripple arcs.
 */
export class WaterTileStrategy extends AbstractTileRenderStrategy {
  readonly handledTileIds = [
    'tidal_shallow',
  ] as const;

  drawTopAccents(
    g: Phaser.GameObjects.Graphics,
    _tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    const accentColor = palette.accent;

    // Water surface ripples (concentric arcs)
    g.lineStyle(1, accentColor, 0.2);
    for (let i = 0; i < 3; i++) {
      const pos = this.topDiamondPoint(seed, i + 185);
      const r = 8 + detailRandom(seed, i + 190) * 6;
      g.beginPath();
      g.arc(pos.x, pos.y, r, 0, Math.PI, false);
      g.strokePath();
    }
  }
}
