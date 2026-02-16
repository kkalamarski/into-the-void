import { TileDefinition } from '../types';

export const CRYSTAL_FLOOR: TileDefinition = {
  id: 'crystal_floor',
  displayName: 'Crystal Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_crystal_floor',
  defaultElevation: 0,
};

export const CRYSTAL_FORMATION: TileDefinition = {
  id: 'crystal_formation',
  displayName: 'Crystal Formation',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_crystal_formation',
  defaultElevation: 3,
};
