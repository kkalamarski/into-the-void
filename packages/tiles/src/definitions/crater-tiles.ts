import { TileDefinition } from '../types';

export const CRATER_FLOOR: TileDefinition = {
  id: 'crater_floor',
  displayName: 'Crater Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_crater_floor',
  defaultElevation: 0,
};

export const CRATER_DEBRIS: TileDefinition = {
  id: 'crater_debris',
  displayName: 'Crater Debris',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_crater_debris',
  defaultElevation: 1,
};
