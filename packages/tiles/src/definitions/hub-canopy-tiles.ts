import { TileDefinition } from '../types';

// Canopy Station (Verdant Dynamics) — bioluminescent green/blue, organic architecture

export const CANOPY_FLOOR: TileDefinition = {
  id: 'canopy_floor',
  displayName: 'Canopy Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_canopy_floor',
  defaultElevation: 0,
  color: 0x1a3a2a,
  description: 'Living floor panels grown from bio-engineered wood. Faintly warm underfoot.',
};

export const CANOPY_WALL: TileDefinition = {
  id: 'canopy_wall',
  displayName: 'Canopy Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_canopy_wall',
  defaultElevation: 2,
  color: 0x0a2a1a,
  description: 'Dense wall of interwoven vines and hardened sap. Impassable.',
};

export const CANOPY_DOOR: TileDefinition = {
  id: 'canopy_door',
  displayName: 'Canopy Door',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_canopy_door',
  defaultElevation: 0,
  color: 0x2a6a4a,
  description: 'A glowing archway of bioluminescent vines. Parts when approached.',
};

export const CANOPY_CORRIDOR: TileDefinition = {
  id: 'canopy_corridor',
  displayName: 'Canopy Corridor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_canopy_corridor',
  defaultElevation: 0,
  color: 0x1a3528,
  description: 'Mossy corridor floor with faint bioluminescent veins.',
};

export const CANOPY_DECORATION: TileDefinition = {
  id: 'canopy_decoration',
  displayName: 'Canopy Console',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_canopy_decoration',
  defaultElevation: 1,
  color: 0x3a8a5a,
  description: 'A glowing bio-organic console intertwined with vegetation.',
};

export const CANOPY_ACCENT: TileDefinition = {
  id: 'canopy_accent',
  displayName: 'Canopy Moss Floor',
  isBlocking: false,
  movementSpeed: 0.9,
  textureKey: 'tile_canopy_accent',
  defaultElevation: 0,
  color: 0x2a5a3a,
  description: 'Floor covered in a thick layer of soft, luminescent moss. Slightly slower.',
};

export const CANOPY_WINDOW: TileDefinition = {
  id: 'canopy_window',
  displayName: 'Canopy Viewport',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_canopy_window',
  defaultElevation: 2,
  color: 0x1a4a3a,
  description: 'A vine-covered viewport revealing the canopy exterior.',
};

export const CANOPY_HAZARD: TileDefinition = {
  id: 'canopy_hazard',
  displayName: 'Spore Vent',
  isBlocking: false,
  movementSpeed: 0.7,
  textureKey: 'tile_canopy_hazard',
  defaultElevation: 0,
  color: 0x44bb66,
  description: 'A toxic spore vent. Releases harmful spores periodically.',
  hooks: {
    onStep: () => ({ type: 'damage', amount: 2 }),
  },
};

/**
 * All Canopy Station tile definitions
 */
export const ALL_CANOPY_TILES: readonly TileDefinition[] = [
  CANOPY_FLOOR,
  CANOPY_WALL,
  CANOPY_DOOR,
  CANOPY_CORRIDOR,
  CANOPY_DECORATION,
  CANOPY_ACCENT,
  CANOPY_WINDOW,
  CANOPY_HAZARD,
];
