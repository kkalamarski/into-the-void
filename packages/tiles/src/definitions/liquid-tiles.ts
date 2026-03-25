import { TileDefinition } from '../types';

// ─── Tier I Biome Liquids ────────────────────────────────────────────────────

/** Void Plains liquid — dark shimmering void energy */
export const VOID_ETHER: TileDefinition = {
  id: 'void_ether',
  displayName: 'Void Ether',
  isBlocking: false,
  movementSpeed: 0.6,
  textureKey: 'tile_void_ether',
  defaultElevation: 0,
  color: 0x2a1a4a,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'translucent',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.6,
    damagePerTick: 0,
    healPerTick: 0,
    effectDescription: 'Slow movement through eerie void energy.',
  },
  description: 'A pool of dark, shimmering void energy. Movement is slowed.',
};

/** Fungal Forest liquid — thick bioluminescent sap */
export const LUMINOUS_SAP: TileDefinition = {
  id: 'luminous_sap',
  displayName: 'Luminous Sap',
  isBlocking: false,
  movementSpeed: 0.6,
  textureKey: 'tile_luminous_sap',
  defaultElevation: 0,
  color: 0x44cc88,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'semi-opaque',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.6,
    damagePerTick: 0,
    healPerTick: 0,
    effectDescription: 'Thick bioluminescent sap slows movement.',
  },
  description: 'Thick, glowing sap oozes from fungal roots. Movement is slowed.',
};

/** Tidal Pools liquid — shallow coastal seawater */
export const SEAWATER: TileDefinition = {
  id: 'seawater',
  displayName: 'Seawater',
  isBlocking: false,
  movementSpeed: 0.7,
  textureKey: 'tile_seawater',
  defaultElevation: 0,
  color: 0x4a90b0,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'translucent',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.7,
    damagePerTick: 0,
    healPerTick: 0,
    effectDescription: 'Shallow tidal water slows movement slightly.',
  },
  description: 'Shallow tidal seawater laps at the shore. Slightly slowed movement.',
};

/** Ancient Ruins liquid — stagnant grey runoff */
export const ANCIENT_RUNOFF: TileDefinition = {
  id: 'ancient_runoff',
  displayName: 'Ancient Runoff',
  isBlocking: false,
  movementSpeed: 0.7,
  textureKey: 'tile_ancient_runoff',
  defaultElevation: 0,
  color: 0x6a6a7a,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'translucent',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.7,
    damagePerTick: 0,
    healPerTick: 0,
    effectDescription: 'Stagnant water pools in the ruins.',
  },
  description: 'Grey, stagnant water collected in ancient channels. Movement is slowed.',
};

// ─── Tier II Biome Liquids ───────────────────────────────────────────────────

/** Toxic Wastes liquid — spore-laden toxic sludge */
export const SPORE_SLUDGE: TileDefinition = {
  id: 'spore_sludge',
  displayName: 'Spore Sludge',
  isBlocking: false,
  movementSpeed: 0.5,
  textureKey: 'tile_spore_sludge',
  defaultElevation: 0,
  color: 0x88aa22,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'semi-opaque',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.5,
    damagePerTick: 2,
    healPerTick: 0,
    effectDescription: 'Toxic spore sludge slows and poisons.',
  },
  description: 'Bubbling toxic sludge thick with spores. Slows and deals poison damage.',
};

/** Miasma Marshes liquid — fetid swamp bile */
export const MIASMA_BILE: TileDefinition = {
  id: 'miasma_bile',
  displayName: 'Miasma Bile',
  isBlocking: false,
  movementSpeed: 0.5,
  textureKey: 'tile_miasma_bile',
  defaultElevation: 0,
  color: 0x6a8a33,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'semi-opaque',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.5,
    damagePerTick: 2,
    healPerTick: 0,
    effectDescription: 'Fetid swamp bile corrodes and slows.',
  },
  description: 'Fetid, olive-green bile pools in the marshes. Slows and deals damage.',
};

/** Petrified Expanse liquid — mineral-rich petrified runoff */
export const MINERAL_SLURRY: TileDefinition = {
  id: 'mineral_slurry',
  displayName: 'Mineral Slurry',
  isBlocking: false,
  movementSpeed: 0.6,
  textureKey: 'tile_mineral_slurry',
  defaultElevation: 0,
  color: 0x9a9a8a,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'semi-opaque',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.6,
    damagePerTick: 0,
    healPerTick: 0,
    effectDescription: 'Thick mineral slurry slows movement.',
  },
  description: 'Grey, mineral-rich slurry seeps from petrified stone. Movement is slowed.',
};

/** Kelp Forests liquid — deep teal seawater */
export const DEEP_SEAWATER: TileDefinition = {
  id: 'deep_seawater',
  displayName: 'Deep Seawater',
  isBlocking: false,
  movementSpeed: 0.5,
  textureKey: 'tile_deep_seawater',
  defaultElevation: 0,
  color: 0x1a6a5a,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'translucent',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.5,
    damagePerTick: 0,
    healPerTick: 0,
    effectDescription: 'Deep kelp forest waters slow movement significantly.',
  },
  description: 'Dark teal waters of the kelp forests. Movement is significantly slowed.',
};

/** Bioluminescent Depths liquid — healing luminous nectar */
export const LUMINOUS_NECTAR: TileDefinition = {
  id: 'luminous_nectar',
  displayName: 'Luminous Nectar',
  isBlocking: false,
  movementSpeed: 0.6,
  textureKey: 'tile_luminous_nectar',
  defaultElevation: 0,
  color: 0x00ee77,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'translucent',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.6,
    damagePerTick: 0,
    healPerTick: 1,
    effectDescription: 'Healing bioluminescent nectar restores health.',
  },
  description: 'Warm, glowing nectar pools. Slows movement but gradually heals wounds.',
};

// ─── Tier III Biome Liquids ──────────────────────────────────────────────────

/** Volcanic Ridge liquid — molten magma river */
export const MAGMA: TileDefinition = {
  id: 'magma',
  displayName: 'Magma',
  isBlocking: false,
  movementSpeed: 0.3,
  textureKey: 'tile_magma',
  defaultElevation: 0,
  color: 0xff4422,
  tileState: 'deep_water',
  isLiquid: true,
  liquidOpacity: 'opaque',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.3,
    damagePerTick: 5,
    healPerTick: 0,
    effectDescription: 'Molten magma burns and severely slows movement.',
  },
  description: 'Flowing molten magma. Severely slows movement and burns on contact.',
};

/** Crystal Caves liquid — prismatic resonating fluid */
export const RESONANT_FLUID: TileDefinition = {
  id: 'resonant_fluid',
  displayName: 'Resonant Fluid',
  isBlocking: false,
  movementSpeed: 0.6,
  textureKey: 'tile_resonant_fluid',
  defaultElevation: 0,
  color: 0x6688ee,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'translucent',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.6,
    damagePerTick: 0,
    healPerTick: 0,
    effectDescription: 'Prismatic resonating fluid slows movement.',
  },
  description: 'Shimmering blue fluid that hums with crystal resonance. Movement is slowed.',
};

/** Frozen Expanse liquid — freezing glacial meltwater */
export const GLACIAL_MELT: TileDefinition = {
  id: 'glacial_melt',
  displayName: 'Glacial Melt',
  isBlocking: false,
  movementSpeed: 0.5,
  textureKey: 'tile_glacial_melt',
  defaultElevation: 0,
  color: 0x88ddee,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'translucent',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.5,
    damagePerTick: 1,
    healPerTick: 0,
    effectDescription: 'Freezing glacial meltwater chills and slows.',
  },
  description: 'Near-freezing meltwater from ancient glaciers. Chills and slows movement.',
};

/** Starfall Crater liquid — mineral-rich impact brine */
export const IMPACT_BRINE: TileDefinition = {
  id: 'impact_brine',
  displayName: 'Impact Brine',
  isBlocking: false,
  movementSpeed: 0.5,
  textureKey: 'tile_impact_brine',
  defaultElevation: 0,
  color: 0x8a7a5a,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'semi-opaque',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.5,
    damagePerTick: 2,
    healPerTick: 0,
    effectDescription: 'Caustic impact brine burns and slows.',
  },
  description: 'Caustic brine pooled in impact craters. Corrodes and slows movement.',
};

/** Deep Trenches liquid — crushing abyssal water */
export const ABYSSAL_WATER: TileDefinition = {
  id: 'abyssal_water',
  displayName: 'Abyssal Water',
  isBlocking: false,
  movementSpeed: 0.3,
  textureKey: 'tile_abyssal_water',
  defaultElevation: 0,
  color: 0x0a0a3a,
  tileState: 'deep_water',
  isLiquid: true,
  liquidOpacity: 'semi-opaque',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.3,
    damagePerTick: 1,
    healPerTick: 0,
    effectDescription: 'Crushing abyssal pressure slows and damages.',
  },
  description: 'Near-black abyssal water under extreme pressure. Severely limits movement.',
};

/** Crystalline Wastes liquid — dissolved silicon solution */
export const SILICON_SOLUTION: TileDefinition = {
  id: 'silicon_solution',
  displayName: 'Silicon Solution',
  isBlocking: false,
  movementSpeed: 0.5,
  textureKey: 'tile_silicon_solution',
  defaultElevation: 0,
  color: 0xccddee,
  tileState: 'shallow_water',
  isLiquid: true,
  liquidOpacity: 'translucent',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.5,
    damagePerTick: 0,
    healPerTick: 0,
    effectDescription: 'Dissolved silicon clouds vision and slows.',
  },
  description: 'Pale, milky solution of dissolved silicon. Slows movement and reduces visibility.',
  visibilityModifier: 0.6,
};

// ─── Tier IV Biome Liquids ───────────────────────────────────────────────────

/** Void Rift liquid — reality-warping void plasma */
export const RIFT_PLASMA: TileDefinition = {
  id: 'rift_plasma',
  displayName: 'Rift Plasma',
  isBlocking: false,
  movementSpeed: 0.3,
  textureKey: 'tile_rift_plasma',
  defaultElevation: 0,
  color: 0x6a00aa,
  tileState: 'deep_water',
  isLiquid: true,
  liquidOpacity: 'opaque',
  renderHeightMultiplier: 0.5,
  liquidEffect: {
    speedMultiplier: 0.3,
    damagePerTick: 5,
    healPerTick: 0,
    effectDescription: 'Reality-warping plasma burns and severely slows.',
  },
  description: 'Dark, crackling void plasma warps reality itself. Extremely dangerous.',
};

// ─── Aggregates ──────────────────────────────────────────────────────────────

/** All liquid tile definitions (16 total — one per non-hub biome) */
export const ALL_LIQUID_TILES: readonly TileDefinition[] = [
  // Tier I
  VOID_ETHER, LUMINOUS_SAP, SEAWATER, ANCIENT_RUNOFF,
  // Tier II
  SPORE_SLUDGE, MIASMA_BILE, MINERAL_SLURRY, DEEP_SEAWATER, LUMINOUS_NECTAR,
  // Tier III
  MAGMA, RESONANT_FLUID, GLACIAL_MELT, IMPACT_BRINE, ABYSSAL_WATER, SILICON_SOLUTION,
  // Tier IV
  RIFT_PLASMA,
];

/** Maps BiomeType to liquid tile ID for world generation (Phase 157) */
export const BIOME_LIQUID_MAP: Record<string, string> = {
  // Tier I
  void_plains: 'void_ether',
  fungal_forest: 'luminous_sap',
  tidal_pools: 'seawater',
  ancient_ruins: 'ancient_runoff',
  // Tier II
  toxic_wastes: 'spore_sludge',
  miasma_marshes: 'miasma_bile',
  petrified_expanse: 'mineral_slurry',
  kelp_forests: 'deep_seawater',
  bioluminescent_depths: 'luminous_nectar',
  // Tier III
  volcanic_ridge: 'magma',
  crystal_caves: 'resonant_fluid',
  frozen_expanse: 'glacial_melt',
  starfall_crater: 'impact_brine',
  deep_trenches: 'abyssal_water',
  crystalline_wastes: 'silicon_solution',
  // Tier IV
  void_rift: 'rift_plasma',
};
