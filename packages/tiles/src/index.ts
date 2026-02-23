// Types
export type {
  TileDefinition,
  TileState,
  TileHooks,
  TileHookContext,
  TileHookFn,
  TileEffect,
} from './types';

// Registry
export { TileRegistry } from './registry';

// Definitions
export { ALL_TILES, TILE_IDS } from './definitions';
export * from './definitions';

// Register all tiles on module load
import { TileRegistry } from './registry';
import { ALL_TILES } from './definitions';
TileRegistry.registerAll(ALL_TILES);
