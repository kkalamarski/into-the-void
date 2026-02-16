import { TileDefinition } from '../types';

export const ICE_FLOOR: TileDefinition = {
  id: 'ice_floor',
  displayName: 'Ice Floor',
  isBlocking: false,
  movementSpeed: 1.2,
  textureKey: 'tile_ice_floor',
  defaultElevation: 0,
  color: 0x8ac8e8, // Light icy blue
  description: 'Slippery frozen surface. Movement is faster here.',
};

export const ICE_WALL: TileDefinition = {
  id: 'ice_wall',
  displayName: 'Ice Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_ice_wall',
  defaultElevation: 2,
  color: 0xcceeff, // Bright white-blue ice
  description: 'A wall of solid ice. Impassable and cold to the touch.',
};
