import { TileDefinition } from '../types';

export const RUINS_FLOOR: TileDefinition = {
  id: 'ruins_floor',
  displayName: 'Ruins Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_ruins_floor',
  defaultElevation: 0,
};

export const RUINS_WALL: TileDefinition = {
  id: 'ruins_wall',
  displayName: 'Ruins Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_ruins_wall',
  defaultElevation: 4,
};
