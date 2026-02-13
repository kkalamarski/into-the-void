/**
 * Mulberry32 - Simple seeded PRNG
 * Fast and sufficient for procedural generation
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === 'string' ? this.hashString(seed) : seed;
  }

  /**
   * Hash a string to a number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get next random number (0-1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Get random integer in range [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Get random float in range [min, max]
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Get random boolean with given probability
   */
  nextBool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffle array in place
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Create a derived random with additional seed
   */
  derive(additionalSeed: number | string): SeededRandom {
    const combined =
      typeof additionalSeed === 'string'
        ? this.state ^ this.hashString(additionalSeed)
        : this.state ^ additionalSeed;
    return new SeededRandom(combined);
  }
}

/**
 * Create a seeded random from world seed and coordinates
 */
export function createChunkRandom(
  worldSeed: string,
  chunkX: number,
  chunkY: number
): SeededRandom {
  const combinedSeed = `${worldSeed}_${chunkX}_${chunkY}`;
  return new SeededRandom(combinedSeed);
}
