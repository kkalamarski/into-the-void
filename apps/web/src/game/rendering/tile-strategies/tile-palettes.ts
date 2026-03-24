import type { TilePalette } from './types';

// ─── Color Helpers ───────────────────────────────────────────────

/** Multiply R/G/B channels by factor, clamp to 0-255 */
export function darkenColor(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.floor(((color >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.floor(((color >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.floor((color & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

/** Add amount to each channel, clamp to 0-255 */
export function brightenColor(color: number, amount: number): number {
  const r = Math.min(255, Math.max(0, ((color >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((color >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (color & 0xff) + amount));
  return (r << 16) | (g << 8) | b;
}

/** Build full palette from top color + accent. South = 65%, East = 40% */
export function buildPalette(top: number, accent: number, accentAlt?: number): TilePalette {
  return {
    top,
    south: darkenColor(top, 0.65),
    east: darkenColor(top, 0.40),
    accent,
    accentAlt,
  };
}

/** Simple seeded PRNG for detail placement — deterministic per (tileId, variant, index) */
export function detailRandom(seed: number, index: number): number {
  let h = seed + index * 7919;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  h = ((h ^ (h >> 16)) * 834653209) | 0;
  return ((h & 0x7fffffff) / 0x7fffffff);
}

/** Hash a string to a number */
export function hashString(s: string): number {
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

export const BIOME_PALETTES: Record<string, TilePalette> = {
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
export const FLOOR_TILE_IDS = new Set([
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

/** Check if a tileId is a floor tile (gets 6 variants) */
export function isFloorTile(tileId: string): boolean {
  return FLOOR_TILE_IDS.has(tileId);
}

/** Check if a tileId is a hub station tile */
export function isHubTile(tileId: string): boolean {
  return tileId.startsWith('canopy_') || tileId.startsWith('ironhold_') ||
         tileId.startsWith('meridian_') || tileId.startsWith('salvage_');
}
