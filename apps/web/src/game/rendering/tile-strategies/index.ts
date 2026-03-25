import type { TileRenderStrategy } from './types';
import { FloorTileStrategy } from './FloorTileStrategy';
import { WallTileStrategy } from './WallTileStrategy';
import { HazardTileStrategy } from './HazardTileStrategy';
import { WaterTileStrategy } from './WaterTileStrategy';
import { PortalTileStrategy } from './PortalTileStrategy';
import { DecorativeTileStrategy } from './DecorativeTileStrategy';
import { LiquidTileStrategy } from './LiquidTileStrategy';

export type { TileRenderStrategy } from './types';
export type { TilePalette, TileCategory } from './types';
export { AbstractTileRenderStrategy, HW, HH, SH } from './AbstractTileRenderStrategy';
export {
  BIOME_PALETTES,
  FLOOR_TILE_IDS,
  darkenColor,
  brightenColor,
  buildPalette,
  detailRandom,
  hashString,
  isHubTile,
  isFloorTile,
} from './tile-palettes';

const tileStrategyMap = new Map<string, TileRenderStrategy>();

/** Get the tile render strategy for a specific tileId. Returns undefined for unregistered tiles. */
export function getStrategyForTile(tileId: string): TileRenderStrategy | undefined {
  return tileStrategyMap.get(tileId);
}

/** Register a strategy for a specific tileId. */
export function registerTileStrategy(tileId: string, strategy: TileRenderStrategy): void {
  tileStrategyMap.set(tileId, strategy);
}

/** Register a strategy for all tile IDs it handles (reads handledTileIds). */
export function registerStrategy(strategy: TileRenderStrategy): void {
  for (const tileId of strategy.handledTileIds) {
    tileStrategyMap.set(tileId, strategy);
  }
}

/** Initialize all tile strategies. Call once before baking textures. Idempotent. */
export function initTileStrategies(): void {
  if (tileStrategyMap.size > 0) return; // Already initialized
  registerStrategy(new FloorTileStrategy());
  registerStrategy(new WallTileStrategy());
  registerStrategy(new HazardTileStrategy());
  registerStrategy(new WaterTileStrategy());
  registerStrategy(new PortalTileStrategy());
  registerStrategy(new DecorativeTileStrategy());
  registerStrategy(new LiquidTileStrategy());
}
