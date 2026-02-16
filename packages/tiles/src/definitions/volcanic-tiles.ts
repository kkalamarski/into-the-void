import { TileDefinition } from '../types';

export const VOLCANIC_FLOOR: TileDefinition = {
  id: 'volcanic_floor',
  displayName: 'Volcanic Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_volcanic_floor',
  defaultElevation: 0,
};

export const LAVA: TileDefinition = {
  id: 'lava',
  displayName: 'Lava',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_lava',
  defaultElevation: 0, // Lava is low/at ground level
  hooks: {
    onStep: () => ({ type: 'damage', amount: 20 }), // High damage for stepping in lava
  },
};
