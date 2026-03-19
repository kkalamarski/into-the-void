import { TileDefinition } from '../types';

// Ironhold Station (Helix Extraction) — metallic space station with rust/amber accents

export const IRONHOLD_FLOOR: TileDefinition = {
  id: 'ironhold_floor',
  displayName: 'Ironhold Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_ironhold_floor',
  defaultElevation: 0,
  color: 0x4e4c48,
  description: 'Heavy steel floor plates with warm amber wear marks. Scarred from machinery.',
};

export const IRONHOLD_WALL: TileDefinition = {
  id: 'ironhold_wall',
  displayName: 'Ironhold Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_ironhold_wall',
  defaultElevation: 2,
  color: 0x3a3835,
  description: 'Thick warm-steel wall plating. Riveted and reinforced.',
};

export const IRONHOLD_DOOR: TileDefinition = {
  id: 'ironhold_door',
  displayName: 'Blast Door',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_ironhold_door',
  defaultElevation: 0,
  color: 0x585550,
  description: 'A heavy blast door with amber warning stripe. Opens with a hydraulic hiss.',
};

export const IRONHOLD_CORRIDOR: TileDefinition = {
  id: 'ironhold_corridor',
  displayName: 'Ironhold Corridor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_ironhold_corridor',
  defaultElevation: 0,
  color: 0x4c4a46,
  description: 'Metal corridor floor with welded seams and amber hazard lighting.',
};

export const IRONHOLD_DECORATION: TileDefinition = {
  id: 'ironhold_decoration',
  displayName: 'Heavy Machinery',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_ironhold_decoration',
  defaultElevation: 1,
  color: 0x6a5a3a,
  description: 'Industrial machinery with rust patina. Bolted to the floor and rumbling with power.',
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
  color: 0x403e3a,
  description: 'A reinforced viewport with thick warm-tinted blast glass.',
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
