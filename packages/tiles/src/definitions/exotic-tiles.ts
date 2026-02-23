import { TileDefinition } from '../types';

// Void Rift (Tier IV) - Reality distortion biome

export const VOID_RIFT_FLOOR: TileDefinition = {
  id: 'void_rift_floor',
  displayName: 'Void Rift Floor',
  isBlocking: false,
  movementSpeed: 0.8,
  textureKey: 'tile_void_rift_floor',
  defaultElevation: 0,
  color: 0x4a0080, // Deep purple
  tileState: 'traversable',
  visibilityModifier: 0.7,
  description: 'Warped terrain where reality feels thin.',
};

export const VOID_RIFT_DISTORTION: TileDefinition = {
  id: 'void_rift_distortion',
  displayName: 'Spatial Anomaly',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_void_rift_distortion',
  defaultElevation: 3,
  color: 0x6a00a0, // Brighter purple
  tileState: 'solid',
  description: 'Impassable spatial anomaly.',
};

// Crystalline Wastes (Tier III) - High-elevation crystal formations

export const CRYSTALLINE_FLOOR: TileDefinition = {
  id: 'crystalline_floor',
  displayName: 'Crystal Surface',
  isBlocking: false,
  movementSpeed: 0.9,
  textureKey: 'tile_crystalline_floor',
  defaultElevation: 0,
  color: 0xadd8e6, // Light blue
  tileState: 'traversable',
  visibilityModifier: 1.2, // INCREASED - crystal reflections enhance visibility
  description: 'Smooth crystal surface. Slippery but beautiful.',
};

export const CRYSTAL_FORMATION_LARGE: TileDefinition = {
  id: 'crystal_formation_large',
  displayName: 'Crystal Spire',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_crystal_formation_large',
  defaultElevation: 4,
  color: 0x87ceeb, // Sky blue
  tileState: 'solid',
  description: 'Towering crystal spire. Razor-sharp.',
};

// Bioluminescent Depths (Tier II) - Glowing flora caverns

export const BIOLUMINESCENT_FLOOR: TileDefinition = {
  id: 'bioluminescent_floor',
  displayName: 'Glowing Ground',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_bioluminescent_floor',
  defaultElevation: 0,
  color: 0x00ff88, // Bright cyan-green
  tileState: 'traversable',
  visibilityModifier: 0.75,
  description: 'Softly glowing ground covered in luminescent moss.',
};

export const BIOLUMINESCENT_FLORA: TileDefinition = {
  id: 'bioluminescent_flora',
  displayName: 'Glowing Undergrowth',
  isBlocking: false,
  movementSpeed: 0.7,
  textureKey: 'tile_bioluminescent_flora',
  defaultElevation: 2,
  color: 0x00cc66, // Darker green
  tileState: 'traversable',
  visibilityModifier: 0.6,
  description: 'Dense bioluminescent undergrowth. Navigable but slow.',
};

/**
 * All exotic tile definitions
 */
export const ALL_EXOTIC_TILES: readonly TileDefinition[] = [
  VOID_RIFT_FLOOR,
  VOID_RIFT_DISTORTION,
  CRYSTALLINE_FLOOR,
  CRYSTAL_FORMATION_LARGE,
  BIOLUMINESCENT_FLOOR,
  BIOLUMINESCENT_FLORA,
];
