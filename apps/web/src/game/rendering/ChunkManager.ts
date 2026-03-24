import { ChunkData, BiomeType, isHubZone } from '@into-the-void/shared-types';
import { Heap } from 'heap-js';

type ChunkState = 'loading' | 'loaded' | 'failed';

interface ChunkRequest {
  zoneId: string;
  priority: number; // Lower = higher priority (0=current, 1=adjacent, 2=corner)
}

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
  private onLoadingStateChange: (loadingCount: number) => void;
  private loadTimeout: number = 10000; // 10 seconds
  private requestQueue: Heap<ChunkRequest>;
  private pendingRequests: Set<string> = new Set();
  private currentPlayerZone: string = 'z_0_0';
  private maxConcurrentRequests: number = 3;

  constructor(
    onChunkNeeded: (zoneId: string) => void,
    onChunkLoaded: (chunkData: ChunkData, biome: BiomeType) => void,
    onChunkUnloaded: (zoneId: string) => void,
    onLoadingStateChange?: (loadingCount: number) => void
  ) {
    this.onChunkNeeded = onChunkNeeded;
    this.onChunkLoaded = onChunkLoaded;
    this.onChunkUnloaded = onChunkUnloaded;
    this.onLoadingStateChange = onLoadingStateChange ?? (() => {});

    // Min-heap: lower priority number processed first
    this.requestQueue = new Heap((a: ChunkRequest, b: ChunkRequest) => a.priority - b.priority);
  }

  /**
   * Parse zone ID to coordinates (z_1_2 -> {x: 1, y: 2})
   * Hub zones return {x: 0, y: 0} since they're isolated instances.
   */
  private parseZoneId(zoneId: string): { x: number; y: number } {
    // Hub zones are instanced at origin (no coordinate-based neighbors)
    if (isHubZone(zoneId)) {
      return { x: 0, y: 0 };
    }
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
   * Loads 3x3 grid (current + adjacent) for open-world zones.
   * Hub zones only load themselves (they're isolated instances).
   */
  updateChunks(playerZoneId: string): void {
    this.currentPlayerZone = playerZoneId;

    // Hub zones are isolated - only load the hub itself, no adjacent chunks
    if (isHubZone(playerZoneId)) {
      const requiredChunks = new Set<string>([playerZoneId]);

      // Queue hub chunk if not loaded
      if (!this.chunkStates.has(playerZoneId)) {
        this.queueChunkRequest(playerZoneId);
      }

      // Retry failed hub chunk
      if (this.chunkStates.get(playerZoneId) === 'failed') {
        this.chunkStates.delete(playerZoneId);
        this.queueChunkRequest(playerZoneId);
      }

      // Unload any non-hub chunks (player teleported from open world)
      const chunksToUnload: string[] = [];
      this.loadedChunks.forEach((_, zoneId) => {
        if (!requiredChunks.has(zoneId)) {
          chunksToUnload.push(zoneId);
        }
      });
      chunksToUnload.forEach(zoneId => this.unloadChunk(zoneId));

      this.processNextRequest();
      return;
    }

    const { x: playerX, y: playerY } = this.parseZoneId(playerZoneId);

    // Calculate required chunks (3x3 grid) for open-world zones
    const requiredChunks = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const zoneId = this.createZoneId(playerX + dx, playerY + dy);
        requiredChunks.add(zoneId);
      }
    }

    // Queue missing chunks with priority
    requiredChunks.forEach(zoneId => {
      if (!this.chunkStates.has(zoneId)) {
        this.queueChunkRequest(zoneId);
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

    // Cancel loading requests for chunks no longer needed
    let cancelledCount = 0;
    this.chunkStates.forEach((state, zoneId) => {
      if (state === 'loading' && !requiredChunks.has(zoneId)) {
        this.chunkStates.delete(zoneId);
        this.pendingRequests.delete(zoneId);
        cancelledCount++;
      }
    });
    if (cancelledCount > 0) {
      this.notifyLoadingStateChange();
    }

    // Retry failed chunks that are still needed
    requiredChunks.forEach(zoneId => {
      if (this.chunkStates.get(zoneId) === 'failed') {
        this.chunkStates.delete(zoneId);
        this.queueChunkRequest(zoneId);
      }
    });

    // Process queued requests
    this.processNextRequest();
  }

  /**
   * Process next chunk from priority queue
   */
  private processNextRequest(): void {
    // Count in-flight requests
    let inFlight = 0;
    this.chunkStates.forEach(state => {
      if (state === 'loading') inFlight++;
    });

    // Process up to maxConcurrentRequests
    while (inFlight < this.maxConcurrentRequests && this.requestQueue.size() > 0) {
      const request = this.requestQueue.pop()!;

      // Skip if already processed (stale queue entry)
      if (this.chunkStates.has(request.zoneId)) {
        continue;
      }

      this.chunkStates.set(request.zoneId, 'loading');
      this.onChunkNeeded(request.zoneId);
      inFlight++;
      this.notifyLoadingStateChange();

      // Timeout handling
      const zoneId = request.zoneId;
      setTimeout(() => {
        if (this.chunkStates.get(zoneId) === 'loading') {
          console.warn(`Chunk ${zoneId} load timeout`);
          this.chunkStates.set(zoneId, 'failed');
          this.pendingRequests.delete(zoneId);
          this.notifyLoadingStateChange();
          // Try next in queue
          this.processNextRequest();
        }
      }, this.loadTimeout);
    }
  }

  /**
   * Queue a chunk request with priority based on distance to player
   */
  private queueChunkRequest(zoneId: string): void {
    // Already queued or loaded
    if (this.chunkStates.has(zoneId) || this.pendingRequests.has(zoneId)) {
      return;
    }

    // Hub zones always get highest priority (0)
    let priority = 0;
    if (!isHubZone(zoneId) && !isHubZone(this.currentPlayerZone)) {
      // Calculate priority (Manhattan distance from player zone) for open-world zones
      const { x, y } = this.parseZoneId(zoneId);
      const { x: px, y: py } = this.parseZoneId(this.currentPlayerZone);
      priority = Math.abs(x - px) + Math.abs(y - py);
    }

    this.requestQueue.push({ zoneId, priority });
    this.pendingRequests.add(zoneId);
  }

  /**
   * Called when chunk data received from server
   */
  receiveChunk(chunkData: ChunkData, biome: BiomeType): void {
    const { zoneId } = chunkData;

    // Guard: Don't reprocess chunk if already loaded (prevents memory leak from duplicate calls)
    if (this.chunkStates.get(zoneId) === 'loaded') {
      return;
    }

    // Clear pending request tracking
    this.pendingRequests.delete(zoneId);

    // Hub zones are always needed if the player is in a hub (no adjacent chunk logic)
    const playerInHub = isHubZone(this.currentPlayerZone);
    const chunkIsHub = isHubZone(zoneId);

    // Hub chunk received while player in hub - always accept
    // Non-hub chunk received while player in hub - discard (shouldn't happen)
    // Hub chunk received while player not in hub - discard (player left hub)
    if (chunkIsHub || playerInHub) {
      if (chunkIsHub && playerInHub && zoneId === this.currentPlayerZone) {
        // Accept: player is in this hub
      } else if (chunkIsHub !== playerInHub || zoneId !== this.currentPlayerZone) {
        // Discard: mismatch between hub states
        this.chunkStates.delete(zoneId);
        this.notifyLoadingStateChange();
        this.processNextRequest();
        return;
      }
    } else {
      // Open-world chunk: check if chunk is still needed (player may have moved)
      const { x: px, y: py } = this.parseZoneId(this.currentPlayerZone);
      const { x, y } = this.parseZoneId(zoneId);
      const distance = Math.max(Math.abs(x - px), Math.abs(y - py)); // Chebyshev distance

      if (distance > 1) {
        // Chunk no longer needed (player moved away), discard without rendering
        this.chunkStates.delete(zoneId);
        this.notifyLoadingStateChange();
        this.processNextRequest();
        return;
      }
    }

    // Update state to loaded
    this.chunkStates.set(zoneId, 'loaded');
    this.notifyLoadingStateChange(); // Notify AFTER state change

    // Store chunk
    this.loadedChunks.set(zoneId, {
      data: chunkData,
      biome,
      container: null,
    });

    // Notify renderer
    this.onChunkLoaded(chunkData, biome);

    // Process next queued request (slot freed up)
    this.processNextRequest();
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
   * Get count of chunks currently loading
   */
  getLoadingChunkCount(): number {
    let count = 0;
    this.chunkStates.forEach(state => {
      if (state === 'loading') count++;
    });
    return count;
  }

  /**
   * Get chunk loading statistics for debug overlay.
   */
  getChunkStats(): { loaded: number; pending: number; failed: number } {
    let pending = 0;
    let failed = 0;
    this.chunkStates.forEach(state => {
      if (state === 'loading') pending++;
      else if (state === 'failed') failed++;
    });
    return { loaded: this.loadedChunks.size, pending, failed };
  }

  /**
   * Notify callback of loading state change
   */
  private notifyLoadingStateChange(): void {
    this.onLoadingStateChange(this.getLoadingChunkCount());
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
    this.pendingRequests.clear();
    this.requestQueue.clear();
  }
}
