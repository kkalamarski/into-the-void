import { TileDefinition } from '../types';

export const VOLCANIC_FLOOR: TileDefinition = {
  id: 'volcanic_floor',
  displayName: 'Volcanic Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_volcanic_floor',
  defaultElevation: 0,
  color: 0x3a2020, // Very dark red-brown volcanic rock
  description: 'Hardite volcanic rock. The ground radiates heat.',
};

export const LAVA: TileDefinition = {
  id: 'lava',
  displayName: 'Lava',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_lava',
  defaultElevation: 0,
  color: 0xff4422, // Bright orange-red lava
  description: 'Molten rock. Instantly lethal. Deals 20 damage per step.',
  hooks: {
    onStep: () => ({ type: 'damage', amount: 20 }),
  },
};
