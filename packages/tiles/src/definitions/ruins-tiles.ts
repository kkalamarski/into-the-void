import { TileDefinition } from '../types';

export const RUINS_FLOOR: TileDefinition = {
  id: 'ruins_floor',
  displayName: 'Ruins Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_ruins_floor',
  defaultElevation: 0,
  color: 0x555544, // Gray-tan ancient stone
  description: 'Cracked stone floor of an ancient structure.',
};

export const RUINS_WALL: TileDefinition = {
  id: 'ruins_wall',
  displayName: 'Ruins Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_ruins_wall',
  defaultElevation: 4,
  color: 0xaa8866, // Warm tan ancient wall
  description: 'Weathered remains of an ancient wall. Still standing after millennia.',
};
