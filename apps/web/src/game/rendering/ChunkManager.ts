import { ChunkData, BiomeType } from '@into-the-void/shared-types';

type ChunkState = 'loading' | 'loaded' | 'failed';

interface LoadedChunk {
  data: ChunkData;
  biome: BiomeType;
  container: Phaser.GameObjects.Container | null;
}

/**
 * Manages chunk loading/unloading as player moves through world.
 * Loads 3x3 grid around player (current + 8 adjacent).
 */
export class ChunkManager {
  private loadedChunks: Map<string, LoadedChunk> = new Map();
  private chunkStates: Map<string, ChunkState> = new Map();
  private onChunkNeeded: (zoneId: string) => void;
  private onChunkLoaded: (chunkData: ChunkData, biome: BiomeType) => void;
  private onChunkUnloaded: (zoneId: string) => void;
  private loadTimeout: number = 10000; // 10 seconds

  constructor(
    onChunkNeeded: (zoneId: string) => void,
    onChunkLoaded: (chunkData: ChunkData, biome: BiomeType) => void,
    onChunkUnloaded: (zoneId: string) => void
  ) {
    this.onChunkNeeded = onChunkNeeded;
    this.onChunkLoaded = onChunkLoaded;
    this.onChunkUnloaded = onChunkUnloaded;
  }

  /**
   * Parse zone ID to coordinates (z_1_2 -> {x: 1, y: 2})
   */
  private parseZoneId(zoneId: string): { x: number; y: number } {
    const parts = zoneId.split('_');
    return {
      x: parseInt(parts[1], 10),
      y: parseInt(parts[2], 10),
    };
  }

  /**
   * Create zone ID from coordinates
   */
  private createZoneId(x: number, y: number): string {
    return `z_${x}_${y}`;
  }

  /**
   * Update loaded chunks based on player's current zone.
   * Loads 3x3 grid (current + adjacent), unloads distant.
   */
  updateChunks(playerZoneId: string): void {
    const { x: playerX, y: playerY } = this.parseZoneId(playerZoneId);

    // Calculate required chunks (3x3 grid)
    const requiredChunks = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const zoneId = this.createZoneId(playerX + dx, playerY + dy);
        requiredChunks.add(zoneId);
      }
    }

    // Request new chunks
    requiredChunks.forEach(zoneId => {
      if (!this.chunkStates.has(zoneId)) {
        this.requestChunk(zoneId);
      }
    });

    // Unload distant chunks
    const chunksToUnload: string[] = [];
    this.loadedChunks.forEach((_, zoneId) => {
      if (!requiredChunks.has(zoneId)) {
        chunksToUnload.push(zoneId);
      }
    });

    chunksToUnload.forEach(zoneId => {
      this.unloadChunk(zoneId);
    });
  }

  /**
   * Request a chunk from server
   */
  private requestChunk(zoneId: string): void {
    if (this.chunkStates.has(zoneId)) return;

    this.chunkStates.set(zoneId, 'loading');
    this.onChunkNeeded(zoneId);

    // Timeout fallback
    setTimeout(() => {
      if (this.chunkStates.get(zoneId) === 'loading') {
        console.warn(`Chunk ${zoneId} load timeout`);
        this.chunkStates.set(zoneId, 'failed');
      }
    }, this.loadTimeout);
  }

  /**
   * Called when chunk data received from server
   */
  receiveChunk(chunkData: ChunkData, biome: BiomeType): void {
    const { zoneId } = chunkData;

    // Update state
    this.chunkStates.set(zoneId, 'loaded');

    // Store chunk
    this.loadedChunks.set(zoneId, {
      data: chunkData,
      biome,
      container: null,
    });

    // Notify renderer
    this.onChunkLoaded(chunkData, biome);
  }

  /**
   * Unload a chunk
   */
  private unloadChunk(zoneId: string): void {
    const chunk = this.loadedChunks.get(zoneId);
    if (chunk) {
      // Notify renderer to cleanup
      this.onChunkUnloaded(zoneId);

      // Remove from tracking
      this.loadedChunks.delete(zoneId);
      this.chunkStates.delete(zoneId);
    }
  }

  /**
   * Get loaded chunk data
   */
  getChunk(zoneId: string): LoadedChunk | undefined {
    return this.loadedChunks.get(zoneId);
  }

  /**
   * Check if chunk is loaded
   */
  isChunkLoaded(zoneId: string): boolean {
    return this.chunkStates.get(zoneId) === 'loaded';
  }

  /**
   * Get all loaded zone IDs
   */
  getLoadedZoneIds(): string[] {
    return Array.from(this.loadedChunks.keys());
  }

  /**
   * Clear all chunks (for cleanup)
   */
  clear(): void {
    this.loadedChunks.forEach((_, zoneId) => {
      this.onChunkUnloaded(zoneId);
    });
    this.loadedChunks.clear();
    this.chunkStates.clear();
  }
}
