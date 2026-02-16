import { TileDefinition } from '../types';

export const TOXIC_FLOOR: TileDefinition = {
  id: 'toxic_floor',
  displayName: 'Toxic Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_toxic_floor',
  defaultElevation: 0,
  color: 0x5c4033, // Dark brown muddy ground
  description: 'Contaminated ground. The air smells acrid.',
};

export const TOXIC_POOL: TileDefinition = {
  id: 'toxic_pool',
  displayName: 'Toxic Pool',
  isBlocking: false,
  movementSpeed: 0.5,
  textureKey: 'tile_toxic_pool',
  defaultElevation: 0,
  color: 0xaacc22, // Yellow-green hazard color - clearly different from floor
  description: 'Bubbling toxic waste. Deals 5 damage per step. Slows movement.',
  hooks: {
    onStep: () => ({ type: 'damage', amount: 5 }),
  },
};
