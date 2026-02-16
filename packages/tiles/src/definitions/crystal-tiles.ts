import { TileDefinition } from '../types';

export const CRYSTAL_FLOOR: TileDefinition = {
  id: 'crystal_floor',
  displayName: 'Crystal Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_crystal_floor',
  defaultElevation: 0,
  color: 0x2a3a4a, // Dark blue-gray crystal ground
  description: 'Smooth crystalline ground. Reflects faint light.',
};

export const CRYSTAL_FORMATION: TileDefinition = {
  id: 'crystal_formation',
  displayName: 'Crystal Formation',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_crystal_formation',
  defaultElevation: 3,
  color: 0x6abaee, // Bright cyan crystal
  description: 'A towering cluster of crystals. Cannot pass through.',
};
