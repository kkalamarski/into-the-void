import { TileDefinition } from '../types';

// Ironhold Station (Helix Extraction) — industrial gray/rust/orange

export const IRONHOLD_FLOOR: TileDefinition = {
  id: 'ironhold_floor',
  displayName: 'Ironhold Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_ironhold_floor',
  defaultElevation: 0,
  color: 0x3a3a3a,
  description: 'Heavy metal floor plates. Scarred from decades of heavy machinery.',
};

export const IRONHOLD_WALL: TileDefinition = {
  id: 'ironhold_wall',
  displayName: 'Ironhold Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_ironhold_wall',
  defaultElevation: 2,
  color: 0x2a2a2a,
  description: 'Thick steel wall plating. Riveted and reinforced.',
};

export const IRONHOLD_DOOR: TileDefinition = {
  id: 'ironhold_door',
  displayName: 'Blast Door',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_ironhold_door',
  defaultElevation: 0,
  color: 0x5a4a3a,
  description: 'A heavy blast door. Opens with a hydraulic hiss.',
};

export const IRONHOLD_CORRIDOR: TileDefinition = {
  id: 'ironhold_corridor',
  displayName: 'Ironhold Corridor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_ironhold_corridor',
  defaultElevation: 0,
  color: 0x353535,
  description: 'Metal corridor floor with welded seams and cable conduits.',
};

export const IRONHOLD_DECORATION: TileDefinition = {
  id: 'ironhold_decoration',
  displayName: 'Heavy Machinery',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_ironhold_decoration',
  defaultElevation: 1,
  color: 0x6a5a3a,
  description: 'Industrial machinery. Bolted to the floor and rumbling with power.',
};

export const IRONHOLD_ACCENT: TileDefinition = {
  id: 'ironhold_accent',
  displayName: 'Rust Grating',
  isBlocking: false,
  movementSpeed: 0.9,
  textureKey: 'tile_ironhold_accent',
  defaultElevation: 0,
  color: 0x4a3a2a,
  description: 'Rust-stained metal grating. Creaks underfoot.',
};

export const IRONHOLD_WINDOW: TileDefinition = {
  id: 'ironhold_window',
  displayName: 'Reinforced Viewport',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_ironhold_window',
  defaultElevation: 2,
  color: 0x4a4a4a,
  description: 'A reinforced viewport with thick blast glass.',
};

export const IRONHOLD_HAZARD: TileDefinition = {
  id: 'ironhold_hazard',
  displayName: 'Steam Vent',
  isBlocking: false,
  movementSpeed: 0.7,
  textureKey: 'tile_ironhold_hazard',
  defaultElevation: 0,
  color: 0xcc6622,
  description: 'A scalding steam vent. Periodically blasts superheated vapor.',
  hooks: {
    onStep: () => ({ type: 'damage', amount: 3 }),
  },
};

/**
 * All Ironhold Station tile definitions
 */
export const ALL_IRONHOLD_TILES: readonly TileDefinition[] = [
  IRONHOLD_FLOOR,
  IRONHOLD_WALL,
  IRONHOLD_DOOR,
  IRONHOLD_CORRIDOR,
  IRONHOLD_DECORATION,
  IRONHOLD_ACCENT,
  IRONHOLD_WINDOW,
  IRONHOLD_HAZARD,
];
