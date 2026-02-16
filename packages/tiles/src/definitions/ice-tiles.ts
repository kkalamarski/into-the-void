import { TileDefinition } from '../types';

export const ICE_FLOOR: TileDefinition = {
  id: 'ice_floor',
  displayName: 'Ice Floor',
  isBlocking: false,
  movementSpeed: 1.2, // From getTileSpeedModifier - fast on ice
  textureKey: 'tile_ice_floor',
  defaultElevation: 0,
};

export const ICE_WALL: TileDefinition = {
  id: 'ice_wall',
  displayName: 'Ice Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_ice_wall',
  defaultElevation: 2,
};
