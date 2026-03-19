import { TileDefinition } from '../types';

// Canopy Station (Verdant Dynamics) — metallic space station with green accents

export const CANOPY_FLOOR: TileDefinition = {
  id: 'canopy_floor',
  displayName: 'Canopy Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_canopy_floor',
  defaultElevation: 0,
  color: 0x484e4a,
  description: 'Steel floor panels with a faint green tint from Verdant bio-coating.',
};

export const CANOPY_WALL: TileDefinition = {
  id: 'canopy_wall',
  displayName: 'Canopy Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_canopy_wall',
  defaultElevation: 2,
  color: 0x353a37,
  description: 'Steel wall plating with Verdant Dynamics bio-resin coating. Impassable.',
};

export const CANOPY_DOOR: TileDefinition = {
  id: 'canopy_door',
  displayName: 'Canopy Door',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_canopy_door',
  defaultElevation: 0,
  color: 0x505854,
  description: 'A metallic door with green accent lighting. Opens on approach.',
};

export const CANOPY_CORRIDOR: TileDefinition = {
  id: 'canopy_corridor',
  displayName: 'Canopy Corridor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_canopy_corridor',
  defaultElevation: 0,
  color: 0x464c48,
  description: 'Station corridor floor with embedded green guide-strip lighting.',
};

export const CANOPY_DECORATION: TileDefinition = {
  id: 'canopy_decoration',
  displayName: 'Canopy Console',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_canopy_decoration',
  defaultElevation: 1,
  color: 0x3a6a4a,
  description: 'A bio-organic console with living green interface elements.',
};

export const CANOPY_ACCENT: TileDefinition = {
  id: 'canopy_accent',
  displayName: 'Canopy Accent Panel',
  isBlocking: false,
  movementSpeed: 0.9,
  textureKey: 'tile_canopy_accent',
  defaultElevation: 0,
  color: 0x2a5a3a,
  description: 'Floor panel with Verdant green accent stripe. Slightly slower.',
};

export const CANOPY_WINDOW: TileDefinition = {
  id: 'canopy_window',
  displayName: 'Canopy Viewport',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_canopy_window',
  defaultElevation: 2,
  color: 0x3a403c,
  description: 'A station viewport with green-tinted reinforced glass.',
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
