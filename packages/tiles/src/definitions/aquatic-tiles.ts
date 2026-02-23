import { TileDefinition } from '../types';

// Tidal Pools (Tier I) - Shallow coastal biome

export const TIDAL_FLOOR: TileDefinition = {
  id: 'tidal_floor',
  displayName: 'Tidal Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_tidal_floor',
  defaultElevation: 0,
  color: 0xc2b280, // Sandy tan
  tileState: 'traversable',
  visibilityModifier: 0.85,
  description: 'Sandy and rocky coastal floor. Safe to walk on.',
};

export const TIDAL_SHALLOW: TileDefinition = {
  id: 'tidal_shallow',
  displayName: 'Shallow Water',
  isBlocking: false,
  movementSpeed: 0.7,
  textureKey: 'tile_tidal_shallow',
  defaultElevation: 0,
  color: 0x87ceeb, // Sky blue
  tileState: 'shallow_water',
  visibilityModifier: 0.85,
  description: 'Shallow tidal water. Movement is slightly slowed.',
};

// Kelp Forests (Tier II) - Dense underwater vegetation

export const KELP_FLOOR: TileDefinition = {
  id: 'kelp_floor',
  displayName: 'Kelp Floor',
  isBlocking: false,
  movementSpeed: 0.6,
  textureKey: 'tile_kelp_floor',
  defaultElevation: 0,
  color: 0x2e8b57, // Sea green
  tileState: 'shallow_water',
  visibilityModifier: 0.7,
  description: 'Seafloor corridor through kelp forests. Limited visibility.',
};

export const KELP_WALL: TileDefinition = {
  id: 'kelp_wall',
  displayName: 'Dense Kelp',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_kelp_wall',
  defaultElevation: 2,
  color: 0x006400, // Dark green
  tileState: 'solid',
  description: 'Dense kelp formation. Impassable.',
};

// Deep Trenches (Tier III) - High-pressure deep ocean

export const TRENCH_FLOOR: TileDefinition = {
  id: 'trench_floor',
  displayName: 'Trench Floor',
  isBlocking: false,
  movementSpeed: 0.3,
  textureKey: 'tile_trench_floor',
  defaultElevation: 0,
  color: 0x000080, // Navy
  tileState: 'deep_water',
  visibilityModifier: 0.6,
  description: 'Deep ocean floor. High pressure slows movement significantly.',
};

export const TRENCH_DEEP: TileDefinition = {
  id: 'trench_deep',
  displayName: 'Abyssal Depth',
  isBlocking: false,
  movementSpeed: 0.2,
  textureKey: 'tile_trench_deep',
  defaultElevation: 0,
  color: 0x00001a, // Near-black blue
  tileState: 'deep_water',
  visibilityModifier: 0.5,
  description: 'Abyssal depths. Extreme pressure severely limits movement.',
};

// Shore Transitions - Water/land boundaries

export const SHORE_TRANSITION: TileDefinition = {
  id: 'shore_transition',
  displayName: 'Shore',
  isBlocking: false,
  movementSpeed: 0.9,
  textureKey: 'tile_shore',
  defaultElevation: 0,
  color: 0xf5deb3, // Wheat/sand
  tileState: 'traversable',
  visibilityModifier: 1.0,
  description: 'Beach and shore. Slightly slowed movement.',
};
