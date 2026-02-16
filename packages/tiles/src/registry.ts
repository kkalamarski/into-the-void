import { TileDefinition } from './types';

/**
 * Fallback tile for unknown IDs - prevents crashes
 */
const UNKNOWN_TILE: TileDefinition = {
  id: 'unknown',
  displayName: 'Unknown Tile',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_unknown',
  defaultElevation: 0,
  color: 0xff00ff, // Magenta - obvious error color
  description: 'Unknown tile type. This should not appear in normal gameplay.',
};

/**
 * Tile registry - singleton for tile lookups
 */
class TileRegistryImpl {
  private readonly tiles: Map<string, TileDefinition> = new Map();

  /**
   * Register a tile definition
   * @internal Used during static initialization
   */
  register(tile: TileDefinition): void {
    if (this.tiles.has(tile.id)) {
      console.warn(`Tile ID "${tile.id}" already registered, overwriting`);
    }
    this.tiles.set(tile.id, tile);
  }

  /**
   * Register multiple tile definitions
   * @internal Used during static initialization
   */
  registerAll(tiles: readonly TileDefinition[]): void {
    for (const tile of tiles) {
      this.register(tile);
    }
  }

  /**
   * Get tile definition by ID
   * Returns fallback 'unknown' tile with console warning if not found
   */
  get(id: string): TileDefinition {
    const tile = this.tiles.get(id);
    if (!tile) {
      console.warn(`Unknown tile ID: "${id}", using fallback`);
      return UNKNOWN_TILE;
    }
    return tile;
  }

  /**
   * Check if tile ID exists without triggering fallback
   */
  has(id: string): boolean {
    return this.tiles.has(id);
  }

  /**
   * Get all registered tile IDs
   */
  getAllIds(): string[] {
    return Array.from(this.tiles.keys());
  }

  /**
   * Get all blocking tiles
   */
  getBlockingTiles(): TileDefinition[] {
    return Array.from(this.tiles.values()).filter(t => t.isBlocking);
  }

  /**
   * Get count of registered tiles
   */
  get size(): number {
    return this.tiles.size;
  }
}

/** Singleton registry instance */
export const TileRegistry = new TileRegistryImpl();
