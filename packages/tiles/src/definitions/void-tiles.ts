import { TileDefinition } from '../types';

export const VOID_FLOOR: TileDefinition = {
  id: 'void_floor',
  displayName: 'Void Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_void_floor',
  defaultElevation: 0,
};

export const VOID_WALL: TileDefinition = {
  id: 'void_wall',
  displayName: 'Void Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_void_wall',
  defaultElevation: 2,
};
