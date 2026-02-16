import { TileDefinition } from '../types';

export const VOID_FLOOR: TileDefinition = {
  id: 'void_floor',
  displayName: 'Void Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_void_floor',
  defaultElevation: 0,
  color: 0x1a1a2e, // Deep dark blue-purple
  description: 'Dark stone floor of the void plains. Safe to walk on.',
};

export const VOID_WALL: TileDefinition = {
  id: 'void_wall',
  displayName: 'Void Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_void_wall',
  defaultElevation: 2,
  color: 0x4a2a6a, // Purple
  description: 'A solid wall of void stone. Impassable.',
};
