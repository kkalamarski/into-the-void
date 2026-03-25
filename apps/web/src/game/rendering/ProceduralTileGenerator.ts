import Phaser from 'phaser';
import {
  getStrategyForTile,
  initTileStrategies,
  BIOME_PALETTES,
  FLOOR_TILE_IDS,
  darkenColor,
  hashString,
} from './tile-strategies';
import type { TilePalette } from './tile-strategies';
import { TileRegistry } from '@into-the-void/tiles';

// Re-export TilePalette for external consumers
export type { TilePalette } from './tile-strategies';

// ─── Isometric Cube Geometry (256x256 canvas) ───────────────────
// Top diamond: (128,0) → (256,64) → (128,128) → (0,64)
// South face:  (0,64) → (128,128) → (128,256) → (0,192)
// East face:   (128,128) → (256,64) → (256,192) → (128,256)

const HW = 128; // half width
const HH = 64;  // half height
const SH = 64; // side height — thin slab (matches ELEVATION_HEIGHT_STEP for seamless stacking)

// ─── ProceduralTileGenerator ─────────────────────────────────────

export class ProceduralTileGenerator {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    initTileStrategies();
  }

  /**
   * Bake all procedural tile textures — call once during PreloadScene.create()
   * Generates ~75 textures (30 tile types x 1-3 variants)
   */
  bakeAllTextures(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    for (const [tileId, palette] of Object.entries(BIOME_PALETTES)) {
      const variantCount = FLOOR_TILE_IDS.has(tileId) ? 6 : 1;
      // Liquid tiles render as half-height slabs (32px sides instead of 64px)
      const isLiquid = TileRegistry.has(tileId) && TileRegistry.get(tileId).isLiquid;
      const sideHeight = isLiquid ? SH / 2 : SH;

      for (let v = 0; v < variantCount; v++) {
        this.bakeTile(graphics, tileId, palette, v, sideHeight);
      }
    }

    graphics.destroy();
  }

  /**
   * Get the procedural texture key for a tile
   * variant 0 = base, 1 = v2, 2 = v3
   */
  getProceduralKey(tileId: string, variant: number): string {
    if (variant === 0) return `proc_tile_${tileId}`;
    return `proc_tile_${tileId}_v${variant + 1}`;
  }

  /**
   * Draw a single isometric cube with accent details and bake to GPU texture
   */
  private bakeTile(
    graphics: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    variant: number,
    sideHeight: number = SH
  ): void {
    graphics.clear();

    // ── Draw south face (left side, lit) ──
    graphics.fillStyle(palette.south, 1);
    graphics.beginPath();
    graphics.moveTo(HW, HH * 2);              // bottom center (128, 128)
    graphics.lineTo(0, HH);                    // top-left (0, 64)
    graphics.lineTo(0, HH + sideHeight);       // bottom-left
    graphics.lineTo(HW, HH * 2 + sideHeight); // bottom center low
    graphics.closePath();
    graphics.fillPath();

    // ── Draw east face (right side, shadow) ──
    graphics.fillStyle(palette.east, 1);
    graphics.beginPath();
    graphics.moveTo(HW, HH * 2);                   // bottom center (128, 128)
    graphics.lineTo(HW * 2, HH);                   // top-right (256, 64)
    graphics.lineTo(HW * 2, HH + sideHeight);       // bottom-right
    graphics.lineTo(HW, HH * 2 + sideHeight);       // bottom center low
    graphics.closePath();
    graphics.fillPath();

    // ── Draw top face (diamond) ──
    graphics.fillStyle(palette.top, 1);
    graphics.beginPath();
    graphics.moveTo(HW, 0);                // top (128, 0)
    graphics.lineTo(HW * 2, HH);           // right (256, 64)
    graphics.lineTo(HW, HH * 2);           // bottom (128, 128)
    graphics.lineTo(0, HH);                // left (0, 64)
    graphics.closePath();
    graphics.fillPath();

    // ── Draw accent details on all faces via strategy ──
    const seed = hashString(tileId) + variant * 7919;
    const strategy = getStrategyForTile(tileId);

    if (strategy) {
      if (variant >= 3 && FLOOR_TILE_IDS.has(tileId)) {
        // Decoration variants (v4-v6) use distinct visual patterns
        strategy.drawDecorationAccents(graphics, tileId, palette, seed, variant - 3);
      } else {
        // Base variants (v1-v3) use standard accents
        strategy.drawTopAccents(graphics, tileId, palette, seed);
      }
      strategy.drawSouthAccents(graphics, tileId, palette, seed);
      strategy.drawEastAccents(graphics, tileId, palette, seed);
    }

    // ── Optional edge lines ──
    graphics.lineStyle(1, darkenColor(palette.top, 0.3), 0.3);
    // Top diamond outline
    graphics.beginPath();
    graphics.moveTo(HW, 0);
    graphics.lineTo(HW * 2, HH);
    graphics.lineTo(HW, HH * 2);
    graphics.lineTo(0, HH);
    graphics.closePath();
    graphics.strokePath();
    // South face bottom edge
    graphics.beginPath();
    graphics.moveTo(0, HH + sideHeight);
    graphics.lineTo(HW, HH * 2 + sideHeight);
    graphics.strokePath();
    // East face bottom edge
    graphics.beginPath();
    graphics.moveTo(HW, HH * 2 + sideHeight);
    graphics.lineTo(HW * 2, HH + sideHeight);
    graphics.strokePath();
    // Vertical edges
    graphics.beginPath();
    graphics.moveTo(0, HH);
    graphics.lineTo(0, HH + sideHeight);
    graphics.strokePath();
    graphics.beginPath();
    graphics.moveTo(HW * 2, HH);
    graphics.lineTo(HW * 2, HH + sideHeight);
    graphics.strokePath();
    graphics.beginPath();
    graphics.moveTo(HW, HH * 2);
    graphics.lineTo(HW, HH * 2 + sideHeight);
    graphics.strokePath();

    // ── Bake to GPU texture ──
    const key = this.getProceduralKey(tileId, variant);
    graphics.generateTexture(key, 256, 256);
  }
}
