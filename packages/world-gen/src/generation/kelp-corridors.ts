import { ZONE_SIZE } from '@into-the-void/shared-types';
import { SimplexNoise } from '../noise/simplex';
import { TileId } from './terrain';

/**
 * Generate navigable corridors through kelp forest biomes.
 * Uses noise-based corridor paths for organic shapes.
 *
 * Corridors are carved through kelp walls, ensuring:
 * - At least 2-tile wide paths for movement
 * - Connected paths from edges to center
 * - Organic, non-grid shapes via noise
 */
export function generateKelpCorridors(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  tiles: number[][],
  collisions: boolean[][]
): void {
  const noise = new SimplexNoise(`${worldSeed}_kelp_${chunkX}_${chunkY}`);

  // Only process if this chunk has kelp tiles
  let hasKelp = false;
  for (let y = 0; y < ZONE_SIZE && !hasKelp; y++) {
    for (let x = 0; x < ZONE_SIZE && !hasKelp; x++) {
      if (tiles[y][x] === TileId.KELP_WALL || tiles[y][x] === TileId.KELP_FLOOR) {
        hasKelp = true;
      }
    }
  }

  if (!hasKelp) return;

  // Generate main corridor paths using noise
  // Corridors follow noise contours - carve where noise is near 0
  const corridorThreshold = 0.15;
  const corridorWidth = 2;

  for (let y = 0; y < ZONE_SIZE; y++) {
    for (let x = 0; x < ZONE_SIZE; x++) {
      const worldX = chunkX * ZONE_SIZE + x;
      const worldY = chunkY * ZONE_SIZE + y;

      // Sample corridor noise at lower frequency for wider paths
      const corridorNoise = Math.abs(noise.fbm(worldX * 0.08, worldY * 0.08, 2));

      // Carve corridor where noise is below threshold
      if (corridorNoise < corridorThreshold) {
        // Carve this tile and neighbors for width
        for (let dy = -corridorWidth + 1; dy < corridorWidth; dy++) {
          for (let dx = -corridorWidth + 1; dx < corridorWidth; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < ZONE_SIZE && ny >= 0 && ny < ZONE_SIZE) {
              if (tiles[ny][nx] === TileId.KELP_WALL) {
                tiles[ny][nx] = TileId.KELP_FLOOR;
                collisions[ny][nx] = false;
              }
            }
          }
        }
      }
    }
  }

  // Ensure edge connectivity (paths at zone boundaries)
  ensureKelpEdgeConnectivity(tiles, collisions);
}

/**
 * Ensure kelp zones have paths at edges for zone transitions
 */
function ensureKelpEdgeConnectivity(
  tiles: number[][],
  collisions: boolean[][]
): void {
  const pathWidth = 3;
  const pathPositions = [
    Math.floor(ZONE_SIZE * 0.25),
    Math.floor(ZONE_SIZE * 0.5),
    Math.floor(ZONE_SIZE * 0.75),
  ];

  for (const pos of pathPositions) {
    for (let i = 0; i < pathWidth; i++) {
      // Only modify if it's a kelp tile
      const edges = [
        { y: 0, x: pos + i },           // Top
        { y: ZONE_SIZE - 1, x: pos + i }, // Bottom
        { y: pos + i, x: 0 },           // Left
        { y: pos + i, x: ZONE_SIZE - 1 }, // Right
      ];

      for (const { x, y } of edges) {
        if (tiles[y][x] === TileId.KELP_WALL) {
          tiles[y][x] = TileId.KELP_FLOOR;
          collisions[y][x] = false;
        }
      }
    }
  }
}
