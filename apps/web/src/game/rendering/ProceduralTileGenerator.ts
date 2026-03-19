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

  // ── Hub Station: Canopy (Verdant) — metallic steel + green accents ──
  canopy_floor:       buildPalette(0x484e4a, 0x3a9966, 0x506058),
  canopy_wall:        buildPalette(0x353a37, 0x2a7744),
  canopy_door:        buildPalette(0x505854, 0x44aa77, 0x48604e),
  canopy_corridor:    buildPalette(0x464c48, 0x338855, 0x4e5850),
  canopy_decoration:  buildPalette(0x3a6a4a, 0x55cc88),
  canopy_accent:      buildPalette(0x3e5a48, 0x44bb77, 0x4a6a52),
  canopy_window:      buildPalette(0x3a403c, 0x44ddaa),
  canopy_hazard:      buildPalette(0x484e4a, 0x88ff44, 0x44bb66),

  // ── Hub Station: Ironhold (Helix) — metallic steel + rust/amber accents ──
  ironhold_floor:       buildPalette(0x4e4c48, 0x996633, 0x585650),
  ironhold_wall:        buildPalette(0x3a3835, 0x774422),
  ironhold_door:        buildPalette(0x585550, 0xbb7733, 0x504e48),
  ironhold_corridor:    buildPalette(0x4c4a46, 0x885522, 0x56544e),
  ironhold_decoration:  buildPalette(0x5a5a52, 0xcc7733),
  ironhold_accent:      buildPalette(0x504a42, 0xaa6633, 0x5a5448),
  ironhold_window:      buildPalette(0x403e3a, 0xee7733),
  ironhold_hazard:      buildPalette(0x4e4c48, 0xff4422, 0xffaa22),

  // ── Hub Station: Meridian (Nexus) — polished steel + blue accents ──
  meridian_floor:       buildPalette(0xb0b4ba, 0x4488cc, 0xbcc0c8),
  meridian_wall:        buildPalette(0x888c94, 0x3366aa),
  meridian_door:        buildPalette(0xa0a4ac, 0x55aadd, 0xaeb2ba),
  meridian_corridor:    buildPalette(0xaab0b6, 0x4488bb, 0xb4bac0),
  meridian_decoration:  buildPalette(0xc0c4cc, 0x5599dd),
  meridian_accent:      buildPalette(0xa8b0b8, 0x5599cc, 0xb0b8c0),
  meridian_window:      buildPalette(0x90949c, 0x55bbee),
  meridian_hazard:      buildPalette(0xb0b4ba, 0x2266ff, 0x88bbff),

  // ── Hub Station: Salvage (Unaffiliated) — worn steel + warm scrap accents ──
  salvage_floor:       buildPalette(0x504e4a, 0x997744, 0x585650),
  salvage_wall:        buildPalette(0x3e3c38, 0x776644),
  salvage_door:        buildPalette(0x5a5854, 0xaa8855, 0x525048),
  salvage_corridor:    buildPalette(0x4c4a46, 0x886644, 0x56544e),
  salvage_decoration:  buildPalette(0x605a50, 0xbb9944),
  salvage_accent:      buildPalette(0x545248, 0x998844, 0x5e5c52),
  salvage_window:      buildPalette(0x44423e, 0xccaa55),
  salvage_hazard:      buildPalette(0x504e4a, 0xff6622, 0xffaa44),
};

// Floor tiles get 6 variants (3 base + 3 decoration); wall/feature tiles get 1
const FLOOR_TILE_IDS = new Set([
  'void_floor', 'crystal_floor', 'toxic_floor', 'ruins_floor',
  'ice_floor', 'volcanic_floor', 'fungal_floor', 'crater_floor',
  'tidal_floor', 'kelp_floor', 'trench_floor', 'shore_transition',
  'void_rift_floor', 'crystalline_floor', 'bioluminescent_floor',
  // Hub station floor tiles (get 6 variants for visual variety)
  'canopy_floor', 'canopy_corridor', 'canopy_accent',
  'ironhold_floor', 'ironhold_corridor', 'ironhold_accent',
  'meridian_floor', 'meridian_corridor', 'meridian_accent',
  'salvage_floor', 'salvage_corridor', 'salvage_accent',
]);

// ─── Isometric Cube Geometry (256x256 canvas) ───────────────────
// Top diamond: (128,0) → (256,64) → (128,128) → (0,64)
// South face:  (0,64) → (128,128) → (128,256) → (0,192)
// East face:   (128,128) → (256,64) → (256,192) → (128,256)

const HW = 128; // half width
const HH = 64;  // half height
const SH = 128; // side height (matches ELEVATION_HEIGHT_STEP for seamless stacking)

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
      const variantCount = FLOOR_TILE_IDS.has(tileId) ? 6 : 1;

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

    if (variant >= 3 && FLOOR_TILE_IDS.has(tileId)) {
      // Decoration variants (v4-v6) use distinct visual patterns
      this.drawDecorationAccents(graphics, tileId, palette, seed, variant - 3);
    } else {
      // Base variants (v1-v3) use standard accents
      this.drawTopAccents(graphics, tileId, palette, seed);
    }
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

      // ── Hub tile accents: pattern by tile type suffix ──
      // Faction identity comes from palette colors; patterns are consistent across hubs

      default: {
        // Hub tile type accent patterns (matched by suffix)
        if (tileId.endsWith('_wall') && this.isHubTile(tileId)) {
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
        } else if (tileId.endsWith('_door') && this.isHubTile(tileId)) {
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
        } else if (tileId.endsWith('_corridor') && this.isHubTile(tileId)) {
          // Corridor tiles: grating lines across top face (parallel diagonal lines)
          g.lineStyle(1, accentColor, 0.2);
          for (let i = 0; i < 6; i++) {
            const offset = 25 + i * 18;
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
        } else if (tileId.endsWith('_decoration') && this.isHubTile(tileId)) {
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
        } else if (tileId.endsWith('_accent') && this.isHubTile(tileId)) {
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
        } else if (tileId.endsWith('_window') && this.isHubTile(tileId)) {
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
        } else if (tileId.endsWith('_hazard') && this.isHubTile(tileId)) {
          // Hazard tiles: diagonal caution stripes + glowing edge dots
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

  // ─── Decoration Accents (variants 3-5) ─────────────────────────────
  // Visually distinct patterns per biome for decoration tile variants.
  // decoIndex: 0 = structural shapes, 1 = network/lines, 2 = area patches

  private drawDecorationAccents(
    g: Phaser.GameObjects.Graphics,
    tileId: string,
    palette: TilePalette,
    seed: number,
    decoIndex: number
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
        g.fillStyle(accent, 0.3);
        for (let i = 0; i < 5; i++) {
          const p = this.topDiamondPoint(seed, i + 1400 + decoIndex * 20);
          g.fillCircle(p.x, p.y, 2 + detailRandom(seed, i + 1405) * 2);
        }
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

    // Hub-specific south face accents
    if (this.isHubTile(tileId)) {
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
      } else if (tileId.endsWith('_hazard')) {
        // Hazard: vertical caution marks on side face
        g.lineStyle(1, southAccent, 0.35);
        for (let i = 0; i < 3; i++) {
          const x = 20 + i * 30;
          g.beginPath();
          g.moveTo(x, HH + 10);
          g.lineTo(x + 5, HH + SH - 10);
          g.strokePath();
        }
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
      return;
    }

    // Sparser details than top face — horizontal strata lines
    if (this.isFloorTile(tileId)) {
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

    // Hub-specific east face accents
    if (this.isHubTile(tileId)) {
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
      return;
    }

    // Sparser details — horizontal strata
    if (this.isFloorTile(tileId)) {
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

  /** Check if a tileId is a hub station tile */
  private isHubTile(tileId: string): boolean {
    return tileId.startsWith('canopy_') || tileId.startsWith('ironhold_') ||
           tileId.startsWith('meridian_') || tileId.startsWith('salvage_');
  }
}
