import { TileDefinition } from '../types';

// Salvage Station (Unaffiliated) — worn steel with warm scrap accents

export const SALVAGE_FLOOR: TileDefinition = {
  id: 'salvage_floor',
  displayName: 'Salvage Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_salvage_floor',
  defaultElevation: 0,
  color: 0x504e4a,
  description: 'Patched steel floor panels with a faint warm hue. Mismatched but functional.',
};

export const SALVAGE_WALL: TileDefinition = {
  id: 'salvage_wall',
  displayName: 'Salvage Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_salvage_wall',
  defaultElevation: 2,
  color: 0x3e3c38,
  description: 'A scrap wall welded from warm-toned hull fragments. Rough but solid.',
};

export const SALVAGE_DOOR: TileDefinition = {
  id: 'salvage_door',
  displayName: 'Cobbled Door',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_salvage_door',
  defaultElevation: 0,
  color: 0x5a5854,
  description: 'A door cobbled together from salvaged parts. Groans when opened.',
};

export const SALVAGE_CORRIDOR: TileDefinition = {
  id: 'salvage_corridor',
  displayName: 'Salvage Corridor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_salvage_corridor',
  defaultElevation: 0,
  color: 0x4c4a46,
  description: 'Duct-taped corridor floor. Cable bundles run along the warm-lit edges.',
};

export const SALVAGE_DECORATION: TileDefinition = {
  id: 'salvage_decoration',
  displayName: 'Cargo Pile',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_salvage_decoration',
  defaultElevation: 1,
  color: 0x7a6a4a,
  description: 'A precarious pile of salvaged cargo and spare parts.',
};

export const SALVAGE_ACCENT: TileDefinition = {
  id: 'salvage_accent',
  displayName: 'Mismatched Grating',
  isBlocking: false,
  movementSpeed: 0.9,
  textureKey: 'tile_salvage_accent',
  defaultElevation: 0,
  color: 0x6a5a3a,
  description: 'Mismatched grating from different ship classes. Slightly uneven.',
};

export const SALVAGE_WINDOW: TileDefinition = {
  id: 'salvage_window',
  displayName: 'Salvaged Porthole',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_salvage_window',
  defaultElevation: 2,
  color: 0x44423e,
  description: 'A salvaged porthole. Scratched glass but still holds vacuum.',
};

export const SALVAGE_HAZARD: TileDefinition = {
  id: 'salvage_hazard',
  displayName: 'Exposed Wiring',
  isBlocking: false,
  movementSpeed: 0.7,
  textureKey: 'tile_salvage_hazard',
  defaultElevation: 0,
  color: 0xaa4422,
  description: 'Exposed wiring sparking dangerously. Watch your step.',
  hooks: {
    onStep: () => ({ type: 'damage', amount: 2 }),
  },
};

/**
 * All Salvage Station tile definitions
 */
export const ALL_SALVAGE_TILES: readonly TileDefinition[] = [
  SALVAGE_FLOOR,
  SALVAGE_WALL,
  SALVAGE_DOOR,
  SALVAGE_CORRIDOR,
  SALVAGE_DECORATION,
  SALVAGE_ACCENT,
  SALVAGE_WINDOW,
  SALVAGE_HAZARD,
];
