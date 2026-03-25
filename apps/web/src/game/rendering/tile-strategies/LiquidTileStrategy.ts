import Phaser from 'phaser';
import type { TilePalette } from './types';
import { AbstractTileRenderStrategy } from './AbstractTileRenderStrategy';
import { detailRandom } from './tile-palettes';

/**
 * Renders accent details for liquid surface tiles.
 * Water-like liquids get ripple arcs; energy/magma liquids get glow veins.
 */
export class LiquidTileStrategy extends AbstractTileRenderStrategy {
  readonly handledTileIds = [
    'void_ether', 'luminous_sap', 'seawater', 'ancient_runoff',
    'spore_sludge', 'miasma_bile', 'mineral_slurry', 'deep_seawater',
    'luminous_nectar', 'magma', 'resonant_fluid', 'glacial_melt',
    'impact_brine', 'abyssal_water', 'silicon_solution', 'rift_plasma',
  ] as const;

  private static readonly ENERGY_LIQUIDS = new Set([
    'magma', 'rift_plasma', 'void_ether', 'resonant_fluid',
  ]);

  drawTopAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
  ): void {
    const accentColor = palette.accent;

    if (LiquidTileStrategy.ENERGY_LIQUIDS.has(tileId)) {
      // Energy liquids: glowing veins/cracks on surface
      g.lineStyle(1.5, accentColor, 0.35);
      for (let i = 0; i < 3; i++) {
        const start = this.topDiamondPoint(seed, i + 100);
        const mid = this.topDiamondPoint(seed, i + 150);
        const end = this.topDiamondPoint(seed, i + 200);
        g.beginPath();
        g.moveTo(start.x, start.y);
        g.lineTo(mid.x, mid.y);
        g.lineTo(end.x, end.y);
        g.strokePath();
      }
    } else {
      // Water-like liquids: concentric ripple arcs
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
}
