import { TileDefinition } from '../types';

export const FUNGAL_FLOOR: TileDefinition = {
  id: 'fungal_floor',
  displayName: 'Fungal Floor',
  isBlocking: false,
  movementSpeed: 0.8, // From getTileSpeedModifier - slightly slow
  textureKey: 'tile_fungal_floor',
  defaultElevation: 0,
};

export const FUNGAL_GROWTH: TileDefinition = {
  id: 'fungal_growth',
  displayName: 'Fungal Growth',
  isBlocking: false, // Features in fungal_forest don't block per isFeatureBlocking
  movementSpeed: 0.6,
  textureKey: 'tile_fungal_growth',
  defaultElevation: 1,
};
