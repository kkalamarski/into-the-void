import { TileDefinition } from '../types';

export const TOXIC_FLOOR: TileDefinition = {
  id: 'toxic_floor',
  displayName: 'Toxic Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_toxic_floor',
  defaultElevation: 0,
};

export const TOXIC_POOL: TileDefinition = {
  id: 'toxic_pool',
  displayName: 'Toxic Pool',
  isBlocking: false,
  movementSpeed: 0.5, // From getTileSpeedModifier
  textureKey: 'tile_toxic_pool',
  defaultElevation: 0,
  hooks: {
    onStep: () => ({ type: 'damage', amount: 5 }),
  },
};
