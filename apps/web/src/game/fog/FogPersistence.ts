/**
 * FogPersistence - Bitset encoding for fog of war state
 *
 * Encodes explored tiles as a bitset (8 tiles per byte) to minimize localStorage usage.
 * Maps world coordinates (-100k to +100k) to 1D indices using coordinate hashing.
 * Persists to localStorage keyed by characterId.
 */

const OFFSET = 100000; // Supports coords from -100k to +100k
const RANGE = 200000; // Total range (200k x 200k = 4 billion tiles)
const STORAGE_PREFIX = 'fog-revealed-';

export class FogPersistence {
  private bitset: Uint8Array;
  private maxTiles: number;
  private revealedCache: Set<string> | null = null;

  constructor(maxTiles: number = RANGE * RANGE) {
    this.maxTiles = maxTiles;
    // Each byte stores 8 tiles, so we need maxTiles / 8 bytes
    const byteCount = Math.ceil(maxTiles / 8);
    this.bitset = new Uint8Array(byteCount);
  }

  /**
   * Convert world coordinates to 1D index
   * Formula: (worldX + OFFSET) * RANGE + (worldY + OFFSET)
   * This maps (-100000,-100000) to (99999,99999) into positive indices 0 to 39,999,999,999
   */
  private coordToIndex(worldX: number, worldY: number): number {
    const x = worldX + OFFSET;
    const y = worldY + OFFSET;

    // Bounds check
    if (x < 0 || x >= RANGE || y < 0 || y >= RANGE) {
      throw new Error(
        `Coordinates out of bounds: (${worldX}, ${worldY}). Range is -${OFFSET} to ${OFFSET - 1}`
      );
    }

    return x * RANGE + y;
  }

  /**
   * Reverse 1D index to world coordinates
   * Used by getAllRevealedTiles() to enumerate revealed tiles
   */
  private indexToCoord(index: number): { worldX: number; worldY: number } {
    const y = index % RANGE;
    const x = Math.floor(index / RANGE);
    return {
      worldX: x - OFFSET,
      worldY: y - OFFSET,
    };
  }

  /**
   * Mark a tile as revealed
   */
  setRevealed(worldX: number, worldY: number): void {
    const index = this.coordToIndex(worldX, worldY);
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;

    // Set the bit
    this.bitset[byteIndex] |= 1 << bitIndex;

    // Invalidate cache since state changed
    this.revealedCache = null;
  }

  /**
   * Check if a tile is revealed
   */
  isRevealed(worldX: number, worldY: number): boolean {
    try {
      const index = this.coordToIndex(worldX, worldY);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;

      // Check the bit
      return (this.bitset[byteIndex] & (1 << bitIndex)) !== 0;
    } catch (error) {
      // Out of bounds coordinates are considered not revealed
      return false;
    }
  }

  /**
   * Count total revealed tiles
   */
  getRevealedCount(): number {
    let count = 0;
    for (let i = 0; i < this.bitset.length; i++) {
      let byte = this.bitset[i];
      // Brian Kernighan's algorithm for counting set bits
      while (byte) {
        byte &= byte - 1; // Clear the lowest set bit
        count++;
      }
    }
    return count;
  }

  /**
   * Get all revealed tile coordinates as Set<"worldX,worldY">
   * Used by FogRenderer to restore fog overlay on game load
   */
  getAllRevealedTiles(): Set<string> {
    // Use cached result if available
    if (this.revealedCache !== null) {
      return this.revealedCache;
    }

    const revealed = new Set<string>();

    // Iterate through all bytes
    for (let byteIndex = 0; byteIndex < this.bitset.length; byteIndex++) {
      const byte = this.bitset[byteIndex];
      if (byte === 0) continue; // Skip empty bytes

      // Check each bit in this byte
      for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
        if (byte & (1 << bitIndex)) {
          const index = byteIndex * 8 + bitIndex;
          if (index >= this.maxTiles) break; // Don't go beyond bounds

          const { worldX, worldY } = this.indexToCoord(index);
          revealed.add(`${worldX},${worldY}`);
        }
      }
    }

    // Cache the result
    this.revealedCache = revealed;
    return revealed;
  }

  /**
   * Save fog state to localStorage
   * Returns true on success, false on error
   */
  save(characterId: string): boolean {
    try {
      const base64 = this.encodeToBase64(this.bitset);
      const key = `${STORAGE_PREFIX}${characterId}`;
      localStorage.setItem(key, base64);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[FogPersistence] localStorage quota exceeded, fog state not saved');
      } else {
        console.error('[FogPersistence] Failed to save fog state:', error);
      }
      return false;
    }
  }

  /**
   * Load fog state from localStorage
   * Returns true if data was loaded, false if no saved data exists
   */
  load(characterId: string): boolean {
    try {
      const key = `${STORAGE_PREFIX}${characterId}`;
      const base64 = localStorage.getItem(key);

      if (!base64) {
        return false; // No saved data
      }

      this.bitset = this.decodeFromBase64(base64);
      // Invalidate cache since state changed
      this.revealedCache = null;
      return true;
    } catch (error) {
      console.error('[FogPersistence] Failed to load fog state:', error);
      return false;
    }
  }

  /**
   * Encode Uint8Array to base64
   * Uses native ES2026 method if available, fallback to btoa
   */
  private encodeToBase64(data: Uint8Array): string {
    // Check for native ES2026 method
    if ('toBase64' in Uint8Array.prototype) {
      return (data as any).toBase64();
    }

    // Fallback for older browsers
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }

  /**
   * Decode base64 to Uint8Array
   * Uses native ES2026 method if available, fallback to atob
   */
  private decodeFromBase64(base64: string): Uint8Array {
    // Check for native ES2026 method
    if ('fromBase64' in Uint8Array) {
      return (Uint8Array as any).fromBase64(base64);
    }

    // Fallback for older browsers
    const binary = atob(base64);
    const data = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      data[i] = binary.charCodeAt(i);
    }
    return data;
  }
}
