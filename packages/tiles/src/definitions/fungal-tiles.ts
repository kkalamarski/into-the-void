import { TileDefinition } from '../types';

export const FUNGAL_FLOOR: TileDefinition = {
  id: 'fungal_floor',
  displayName: 'Fungal Floor',
  isBlocking: false,
  movementSpeed: 0.8,
  textureKey: 'tile_fungal_floor',
  defaultElevation: 0,
  color: 0x2a3a2a, // Dark green-gray fungal ground
  description: 'Spongy fungal matter. Movement is slightly slower.',
};

export const FUNGAL_GROWTH: TileDefinition = {
  id: 'fungal_growth',
  displayName: 'Fungal Growth',
  isBlocking: false,
  movementSpeed: 0.6,
  textureKey: 'tile_fungal_growth',
  defaultElevation: 1,
  color: 0xaa55cc, // Bright magenta mushrooms
  description: 'Dense cluster of bioluminescent fungi. Slows movement significantly.',
};
