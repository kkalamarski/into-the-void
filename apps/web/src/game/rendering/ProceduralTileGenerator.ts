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

// ─── Color Helpers ───────────────────────────────────────────────

/** Multiply R/G/B channels by factor, clamp to 0-255 */
function darkenColor(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.floor(((color >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.floor(((color >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.floor((color & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

/** Add amount to each channel, clamp to 0-255 */
function brightenColor(color: number, amount: number): number {
  const r = Math.min(255, Math.max(0, ((color >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((color >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (color & 0xff) + amount));
  return (r << 16) | (g << 8) | b;
}

/** Build full palette from top color + accent. South = 65%, East = 40% */
function buildPalette(top: number, accent: number, accentAlt?: number): TilePalette {
  return {
    top,
    south: darkenColor(top, 0.65),
    east: darkenColor(top, 0.40),
    accent,
    accentAlt,
  };
}

/** Simple seeded PRNG for detail placement — deterministic per (tileId, variant, index) */
function detailRandom(seed: number, index: number): number {
  let h = seed + index * 7919;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  h = ((h ^ (h >> 16)) * 834653209) | 0;
  return ((h & 0x7fffffff) / 0x7fffffff);
}

/** Hash a string to a number */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ─── Biome Palettes ──────────────────────────────────────────────
//
// Designed for Hyper Light Drifter aesthetic:
// - Natural biomes: recognizable tones pushed slightly surreal
// - Exotic biomes: full alien / neon / glow
//

const BIOME_PALETTES: Record<string, TilePalette> = {
  // ── Void Plains ──
  void_floor:        buildPalette(0x2a2a4e, 0x5a4a7a, 0x3a3a5e),
  void_wall:         buildPalette(0x5a3a7a, 0x8a6aaa),

  // ── Crystal Caves ──
  crystal_floor:     buildPalette(0x3a4a5e, 0x6ac8ee, 0x4a6a8e),
  crystal_formation: buildPalette(0x5abaee, 0xeeffff),

  // ── Toxic Wastes ──
  toxic_floor:       buildPalette(0x5a4a30, 0x88aa22, 0x6a5a38),
  toxic_pool:        buildPalette(0xaacc22, 0x336622),

  // ── Ancient Ruins ──
  ruins_floor:       buildPalette(0x6a6050, 0xccbb88, 0x7a7060),
  ruins_wall:        buildPalette(0xba9070, 0x6a4a30),

  // ── Frozen Expanse ──
  ice_floor:         buildPalette(0x8ac8e8, 0xeef8ff, 0x9ad8f8),
  ice_wall:          buildPalette(0xcceeff, 0x4488cc),

  // ── Volcanic Ridge ──
  volcanic_floor:    buildPalette(0x4a2020, 0xff6622, 0x5a2a28),
  lava:              buildPalette(0xff5522, 0xffcc22),

  // ── Fungal Forest ──
  fungal_floor:      buildPalette(0x2a4a2a, 0x9966cc, 0x3a5a3a),
  fungal_growth:     buildPalette(0xaa55cc, 0xff88dd),

  // ── Starfall Crater ──
  crater_floor:      buildPalette(0x1a1a33, 0x5577aa, 0x2a2a44),
  crater_debris:     buildPalette(0x4a5566, 0xaa6633),

  // ── Tidal Pools ──
  tidal_floor:       buildPalette(0xc2b280, 0x7abeeb, 0xd2c290),
  tidal_shallow:     buildPalette(0x7aceeb, 0xeeffff),

  // ── Kelp Forests ──
  kelp_floor:        buildPalette(0x2e7b47, 0x1a5a2a, 0x3e8b57),
  kelp_wall:         buildPalette(0x006a20, 0x88cc44),

  // ── Deep Trenches ──
  trench_floor:      buildPalette(0x000a60, 0x2244aa, 0x001a70),
  trench_deep:       buildPalette(0x00001a, 0x0044aa),

  // ── Shore Transition ──
  shore_transition:  buildPalette(0xe5d8b3, 0x88bbdd, 0xd5c8a3),

  // ── Portal ──
  portal:            buildPalette(0x6644aa, 0xcc88ff, 0x8866cc),

  // ── Exotic: Void Rift (Tier IV) ──
  void_rift_floor:      buildPalette(0x5a00a0, 0xff00ff, 0x7a22bb),
  void_rift_distortion: buildPalette(0x7a00d0, 0xddaaff),

  // ── Exotic: Crystalline Wastes (Tier III) ──
  crystalline_floor:         buildPalette(0xb0e8f6, 0xffffff, 0xc0f0ff),
  crystal_formation_large:   buildPalette(0x87ceeb, 0xffffff),

  // ── Exotic: Bioluminescent Depths (Tier II) ──
  bioluminescent_floor:  buildPalette(0x00ee78, 0x00aaff, 0x22ff88),
  bioluminescent_flora:  buildPalette(0x00bb55, 0xaaff44),
};

// Floor tiles get 3 variants; wall/feature tiles get 1
const FLOOR_TILE_IDS = new Set([
  'void_floor', 'crystal_floor', 'toxic_floor', 'ruins_floor',
  'ice_floor', 'volcanic_floor', 'fungal_floor', 'crater_floor',
  'tidal_floor', 'kelp_floor', 'trench_floor', 'shore_transition',
  'void_rift_floor', 'crystalline_floor', 'bioluminescent_floor',
]);

// ─── Isometric Cube Geometry (256x256 canvas) ───────────────────
// Top diamond: (128,0) → (256,64) → (128,128) → (0,64)
// South face:  (0,64) → (128,128) → (128,192) → (0,128)
// East face:   (128,128) → (256,64) → (256,128) → (128,192)

const HW = 128; // half width
const HH = 64;  // half height
const SH = 64;  // side height

// ─── ProceduralTileGenerator ─────────────────────────────────────

export class ProceduralTileGenerator {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Bake all procedural tile textures — call once during PreloadScene.create()
   * Generates ~75 textures (30 tile types x 1-3 variants)
   */
  bakeAllTextures(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    for (const [tileId, palette] of Object.entries(BIOME_PALETTES)) {
      const variantCount = FLOOR_TILE_IDS.has(tileId) ? 3 : 1;

      for (let v = 0; v < variantCount; v++) {
        this.bakeTile(graphics, tileId, palette, v);
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
    variant: number
  ): void {
    graphics.clear();

    // ── Draw south face (left side, lit) ──
    graphics.fillStyle(palette.south, 1);
    graphics.beginPath();
    graphics.moveTo(HW, HH * 2);      // bottom center (128, 128)
    graphics.lineTo(0, HH);            // top-left (0, 64)
    graphics.lineTo(0, HH + SH);      // bottom-left (0, 128)
    graphics.lineTo(HW, HH * 2 + SH); // bottom center low (128, 192)
    graphics.closePath();
    graphics.fillPath();

    // ── Draw east face (right side, shadow) ──
    graphics.fillStyle(palette.east, 1);
    graphics.beginPath();
    graphics.moveTo(HW, HH * 2);           // bottom center (128, 128)
    graphics.lineTo(HW * 2, HH);           // top-right (256, 64)
    graphics.lineTo(HW * 2, HH + SH);      // bottom-right (256, 128)
    graphics.lineTo(HW, HH * 2 + SH);      // bottom center low (128, 192)
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

    // ── Draw accent details on all faces ──
    const seed = hashString(tileId) + variant * 7919;

    this.drawTopAccents(graphics, tileId, palette, seed);
    this.drawSouthAccents(graphics, tileId, palette, seed);
    this.drawEastAccents(graphics, tileId, palette, seed);

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
    graphics.moveTo(0, HH + SH);
    graphics.lineTo(HW, HH * 2 + SH);
    graphics.strokePath();
    // East face bottom edge
    graphics.beginPath();
    graphics.moveTo(HW, HH * 2 + SH);
    graphics.lineTo(HW * 2, HH + SH);
    graphics.strokePath();
    // Vertical edges
    graphics.beginPath();
    graphics.moveTo(0, HH);
    graphics.lineTo(0, HH + SH);
    graphics.strokePath();
    graphics.beginPath();
    graphics.moveTo(HW * 2, HH);
    graphics.lineTo(HW * 2, HH + SH);
    graphics.strokePath();
    graphics.beginPath();
    graphics.moveTo(HW, HH * 2);
    graphics.lineTo(HW, HH * 2 + SH);
    graphics.strokePath();

    // ── Bake to GPU texture ──
    const key = this.getProceduralKey(tileId, variant);
    graphics.generateTexture(key, 256, 256);
  }

  // ─── Top Face Accents ────────────────────────────────────────────
  // Surface features drawn on the top diamond
  // Coordinates are relative to the diamond: (128,0) → (256,64) → (128,128) → (0,64)

  private drawTopAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number
  ): void {
    const accentColor = palette.accent;
    const altColor = palette.accentAlt ?? brightenColor(accentColor, 30);

    switch (tileId) {
      // ── Natural biomes: recognizable shapes ──

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

      case 'tidal_shallow': {
        // Water surface ripples (concentric arcs)
        g.lineStyle(1, accentColor, 0.2);
        for (let i = 0; i < 3; i++) {
          const pos = this.topDiamondPoint(seed, i + 185);
          const r = 8 + detailRandom(seed, i + 190) * 6;
          g.beginPath();
          g.arc(pos.x, pos.y, r, 0, Math.PI, false);
          g.strokePath();
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

      // ── Wall / Feature tiles: structural details ──

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

      case 'portal': {
        // Concentric rings with glow
        g.lineStyle(1, accentColor, 0.5);
        for (let i = 0; i < 3; i++) {
          g.strokeCircle(HW, HH, 15 + i * 15);
        }
        g.fillStyle(accentColor, 0.3);
        g.fillCircle(HW, HH, 8);
        break;
      }

      default:
        break;
    }
  }

  // ─── South Face Accents ──────────────────────────────────────────
  // Cross-section details on the south (left, lit) face
  // Face bounds: (0,64) → (128,128) → (128,192) → (0,128)

  private drawSouthAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number
  ): void {
    const southAccent = darkenColor(palette.accent, 0.75);

    // Sparser details than top face — horizontal strata lines
    if (this.isFloorTile(tileId)) {
      g.lineStyle(1, southAccent, 0.2);
      for (let i = 0; i < 3; i++) {
        const y = HH + 8 + i * 20 + detailRandom(seed, i + 500) * 8;
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

  // ─── East Face Accents ───────────────────────────────────────────
  // Cross-section details on the east (right, shadow) face
  // Face bounds: (128,128) → (256,64) → (256,128) → (128,192)

  private drawEastAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number
  ): void {
    const eastAccent = darkenColor(palette.accent, 0.5); // Dimmer on shadow side

    // Sparser details — horizontal strata
    if (this.isFloorTile(tileId)) {
      g.lineStyle(1, eastAccent, 0.15);
      for (let i = 0; i < 2; i++) {
        const y = HH + 10 + i * 25 + detailRandom(seed, i + 600) * 8;
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

  // ─── Utility ─────────────────────────────────────────────────────

  /** Get a random point within the top diamond, biased inward by margin */
  private topDiamondPoint(seed: number, index: number): { x: number; y: number } {
    const margin = 0.15; // 15% inset from edges
    const u = margin + detailRandom(seed, index * 2) * (1 - 2 * margin);
    const v = margin + detailRandom(seed, index * 2 + 1) * (1 - 2 * margin);

    // Map (u, v) in [0,1]^2 to diamond coords
    // Diamond: top=(128,0), right=(256,64), bottom=(128,128), left=(0,64)
    const x = HW + (u - v) * HW;
    const y = (u + v) * HH;
    return { x, y };
  }

  /** Check if a tileId is a floor tile (gets 3 variants) */
  private isFloorTile(tileId: string): boolean {
    return FLOOR_TILE_IDS.has(tileId);
  }
}
