import { ZONE_SIZE } from '@into-the-void/shared-types';
import { TileRegistry, TILE_IDS } from '@into-the-void/tiles';
import { TileId, tileIdToString } from './terrain';

/**
 * Check if a tile is an aquatic tile (shallow or deep water)
 */
function isAquaticTile(tileId: number): boolean {
  const aquaticTiles = [
    TileId.TIDAL_FLOOR, TileId.TIDAL_SHALLOW,
    TileId.KELP_FLOOR, TileId.KELP_WALL,
    TileId.TRENCH_FLOOR, TileId.TRENCH_DEEP,
  ];
  return aquaticTiles.includes(tileId);
}

/**
 * Check if a tile is a land tile (non-aquatic, non-blocking)
 */
function isLandTile(tileId: number): boolean {
  const stringId = tileIdToString(tileId);
  const tileDef = TileRegistry.get(stringId);
  return !tileDef.isBlocking && !isAquaticTile(tileId);
}

/**
 * Generate shore transition tiles at water/land boundaries.
 * Post-processes the terrain to smooth transitions and prevent 1-tile artifacts.
 *
 * Rules:
 * 1. Any land tile adjacent to 2+ water tiles becomes shore
 * 2. Any isolated water tile (surrounded by 3+ land) becomes shore
 * 3. Shore tiles use SHORE_TRANSITION tile ID
 */
export function generateShoreTransitions(
  tiles: number[][],
  collisions: boolean[][]
): void {
  const changes: Array<{ x: number; y: number; tileId: number }> = [];

  for (let y = 0; y < ZONE_SIZE; y++) {
    for (let x = 0; x < ZONE_SIZE; x++) {
      const currentTile = tiles[y][x];

      // Count adjacent water and land tiles
      let adjacentWater = 0;
      let adjacentLand = 0;

      const neighbors = [
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      ];

      for (const { dx, dy } of neighbors) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < ZONE_SIZE && ny >= 0 && ny < ZONE_SIZE) {
          if (isAquaticTile(tiles[ny][nx])) {
            adjacentWater++;
          } else if (isLandTile(tiles[ny][nx])) {
            adjacentLand++;
          }
        }
      }

      // Land tile adjacent to 2+ water tiles -> shore
      if (isLandTile(currentTile) && adjacentWater >= 2) {
        changes.push({ x, y, tileId: TileId.SHORE_TRANSITION });
      }

      // Isolated water tile (3+ land neighbors) -> shore (prevents 1-tile water artifacts)
      if (isAquaticTile(currentTile) && adjacentLand >= 3) {
        changes.push({ x, y, tileId: TileId.SHORE_TRANSITION });
      }
    }
  }

  // Apply changes
  for (const { x, y, tileId } of changes) {
    tiles[y][x] = tileId;
    collisions[y][x] = false; // Shore tiles are always traversable
  }
}
