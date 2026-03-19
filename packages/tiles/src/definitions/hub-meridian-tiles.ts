import { TileDefinition } from '../types';

// Meridian Station (Nexus Frontiers) — polished steel with blue accents

export const MERIDIAN_FLOOR: TileDefinition = {
  id: 'meridian_floor',
  displayName: 'Meridian Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_meridian_floor',
  defaultElevation: 0,
  color: 0xb0b4ba,
  description: 'Polished light steel floor tiles with a faint blue sheen. Immaculately maintained.',
};

export const MERIDIAN_WALL: TileDefinition = {
  id: 'meridian_wall',
  displayName: 'Meridian Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_meridian_wall',
  defaultElevation: 2,
  color: 0x888c94,
  description: 'Brushed steel wall panel with subtle blue tint. Clean and corporate.',
};

export const MERIDIAN_DOOR: TileDefinition = {
  id: 'meridian_door',
  displayName: 'Sliding Glass Door',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_meridian_door',
  defaultElevation: 0,
  color: 0xa0a4ac,
  description: 'A metallic sliding door with blue accent lighting. Opens silently on approach.',
};

export const MERIDIAN_CORRIDOR: TileDefinition = {
  id: 'meridian_corridor',
  displayName: 'Meridian Corridor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_meridian_corridor',
  defaultElevation: 0,
  color: 0xaab0b6,
  description: 'Spotless corridor floor with embedded blue guide lighting.',
};

export const MERIDIAN_DECORATION: TileDefinition = {
  id: 'meridian_decoration',
  displayName: 'Holographic Terminal',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_meridian_decoration',
  defaultElevation: 1,
  color: 0x6688aa,
  description: 'A holographic data terminal. Streams of data cascade across its surface.',
};

export const MERIDIAN_ACCENT: TileDefinition = {
  id: 'meridian_accent',
  displayName: 'Glass Panel Floor',
  isBlocking: false,
  movementSpeed: 0.9,
  textureKey: 'tile_meridian_accent',
  defaultElevation: 0,
  color: 0x88a0bb,
  description: 'Transparent glass panel floor revealing circuitry beneath. Slightly slower.',
};

export const MERIDIAN_WINDOW: TileDefinition = {
  id: 'meridian_window',
  displayName: 'Panoramic Viewport',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_meridian_window',
  defaultElevation: 2,
  color: 0x90949c,
  description: 'A panoramic viewport with steel-blue reinforced frame.',
};

export const MERIDIAN_HAZARD: TileDefinition = {
  id: 'meridian_hazard',
  displayName: 'Data Stream',
  isBlocking: false,
  movementSpeed: 0.7,
  textureKey: 'tile_meridian_hazard',
  defaultElevation: 0,
  color: 0x4488ff,
  description: 'An exposed data stream conduit. Electromagnetic interference slows movement.',
  hooks: {
    onStep: () => ({ type: 'slow', duration: 3000, multiplier: 0.5 }),
  },
};

/**
 * All Meridian Station tile definitions
 */
export const ALL_MERIDIAN_TILES: readonly TileDefinition[] = [
  MERIDIAN_FLOOR,
  MERIDIAN_WALL,
  MERIDIAN_DOOR,
  MERIDIAN_CORRIDOR,
  MERIDIAN_DECORATION,
  MERIDIAN_ACCENT,
  MERIDIAN_WINDOW,
  MERIDIAN_HAZARD,
];
