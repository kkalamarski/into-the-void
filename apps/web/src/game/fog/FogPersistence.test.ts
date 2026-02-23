import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FogPersistence } from './FogPersistence';

describe('FogPersistence', () => {
  let persistence: FogPersistence;

  beforeEach(() => {
    persistence = new FogPersistence();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('setRevealed/isRevealed', () => {
    it('should roundtrip for positive coordinates', () => {
      persistence.setRevealed(100, 200);
      expect(persistence.isRevealed(100, 200)).toBe(true);
      expect(persistence.isRevealed(100, 201)).toBe(false);
      expect(persistence.isRevealed(101, 200)).toBe(false);
    });

    it('should roundtrip for negative coordinates', () => {
      persistence.setRevealed(-500, -1000);
      expect(persistence.isRevealed(-500, -1000)).toBe(true);
      expect(persistence.isRevealed(-500, -1001)).toBe(false);
      expect(persistence.isRevealed(-501, -1000)).toBe(false);
    });

    it('should handle zero coordinates', () => {
      persistence.setRevealed(0, 0);
      expect(persistence.isRevealed(0, 0)).toBe(true);
    });

    it('should handle mixed positive/negative coordinates', () => {
      persistence.setRevealed(50, -75);
      persistence.setRevealed(-25, 100);

      expect(persistence.isRevealed(50, -75)).toBe(true);
      expect(persistence.isRevealed(-25, 100)).toBe(true);
      expect(persistence.isRevealed(50, 100)).toBe(false);
    });

    it('should return false for out of bounds coordinates', () => {
      // Beyond supported range (-100k to +100k)
      expect(persistence.isRevealed(150000, 0)).toBe(false);
      expect(persistence.isRevealed(0, -150000)).toBe(false);
    });
  });

  describe('coordinate hashing', () => {
    it('should produce unique indices for distinct coordinates', () => {
      const coords = [
        [0, 0],
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
        [100, 200],
        [-100, -200],
        [50, -50],
      ];

      for (const [x, y] of coords) {
        persistence.setRevealed(x, y);
      }

      // All should be revealed independently
      for (const [x, y] of coords) {
        expect(persistence.isRevealed(x, y)).toBe(true);
      }

      // Count should match
      expect(persistence.getRevealedCount()).toBe(coords.length);
    });
  });

  describe('getRevealedCount', () => {
    it('should count revealed tiles correctly', () => {
      expect(persistence.getRevealedCount()).toBe(0);

      persistence.setRevealed(0, 0);
      expect(persistence.getRevealedCount()).toBe(1);

      persistence.setRevealed(1, 1);
      expect(persistence.getRevealedCount()).toBe(2);

      persistence.setRevealed(2, 2);
      expect(persistence.getRevealedCount()).toBe(3);
    });

    it('should not double-count if same tile revealed twice', () => {
      persistence.setRevealed(5, 5);
      persistence.setRevealed(5, 5);
      persistence.setRevealed(5, 5);

      expect(persistence.getRevealedCount()).toBe(1);
    });
  });

  describe('getAllRevealedTiles', () => {
    it('should return empty set when no tiles revealed', () => {
      const revealed = persistence.getAllRevealedTiles();
      expect(revealed.size).toBe(0);
    });

    it('should return all revealed tiles', () => {
      const coords: Array<[number, number]> = [
        [0, 0],
        [10, 20],
        [-5, -10],
        [100, -200],
      ];

      for (const [x, y] of coords) {
        persistence.setRevealed(x, y);
      }

      const revealed = persistence.getAllRevealedTiles();
      expect(revealed.size).toBe(coords.length);

      for (const [x, y] of coords) {
        expect(revealed.has(`${x},${y}`)).toBe(true);
      }
    });

    it('should use cached result on subsequent calls', () => {
      persistence.setRevealed(1, 2);
      persistence.setRevealed(3, 4);

      const first = persistence.getAllRevealedTiles();
      const second = persistence.getAllRevealedTiles();

      // Should return same cached Set instance
      expect(first).toBe(second);
    });

    it('should invalidate cache when tiles revealed', () => {
      persistence.setRevealed(1, 2);
      const first = persistence.getAllRevealedTiles();

      persistence.setRevealed(3, 4);
      const second = persistence.getAllRevealedTiles();

      // Cache should be invalidated, new Set returned
      expect(first).not.toBe(second);
      expect(second.size).toBe(2);
    });
  });

  describe('save/load', () => {
    it('should save and load fog state correctly', () => {
      const characterId = 'test-char-123';

      // Reveal some tiles
      persistence.setRevealed(10, 20);
      persistence.setRevealed(-15, -25);
      persistence.setRevealed(0, 0);

      // Save
      const saveSuccess = persistence.save(characterId);
      expect(saveSuccess).toBe(true);

      // Create new persistence instance and load
      const loaded = new FogPersistence();
      const loadSuccess = loaded.load(characterId);
      expect(loadSuccess).toBe(true);

      // Verify all tiles are restored
      expect(loaded.isRevealed(10, 20)).toBe(true);
      expect(loaded.isRevealed(-15, -25)).toBe(true);
      expect(loaded.isRevealed(0, 0)).toBe(true);
      expect(loaded.isRevealed(99, 99)).toBe(false);

      expect(loaded.getRevealedCount()).toBe(3);
    });

    it('should return false when loading non-existent character', () => {
      const loaded = new FogPersistence();
      const loadSuccess = loaded.load('non-existent-char');
      expect(loadSuccess).toBe(false);
    });

    it('should preserve large fog state', () => {
      const characterId = 'large-fog-test';

      // Reveal 100 tiles in a grid pattern
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          persistence.setRevealed(x, y);
        }
      }

      expect(persistence.getRevealedCount()).toBe(100);

      // Save
      persistence.save(characterId);

      // Load in new instance
      const loaded = new FogPersistence();
      loaded.load(characterId);

      expect(loaded.getRevealedCount()).toBe(100);

      // Spot check some tiles
      expect(loaded.isRevealed(0, 0)).toBe(true);
      expect(loaded.isRevealed(5, 5)).toBe(true);
      expect(loaded.isRevealed(9, 9)).toBe(true);
      expect(loaded.isRevealed(10, 10)).toBe(false);
    });

    it('should use characterId-specific storage keys', () => {
      const char1 = 'character-1';
      const char2 = 'character-2';

      // Reveal different tiles for each character
      persistence.setRevealed(1, 1);
      persistence.save(char1);

      const persistence2 = new FogPersistence();
      persistence2.setRevealed(2, 2);
      persistence2.save(char2);

      // Load char1 state
      const loaded1 = new FogPersistence();
      loaded1.load(char1);
      expect(loaded1.isRevealed(1, 1)).toBe(true);
      expect(loaded1.isRevealed(2, 2)).toBe(false);

      // Load char2 state
      const loaded2 = new FogPersistence();
      loaded2.load(char2);
      expect(loaded2.isRevealed(2, 2)).toBe(true);
      expect(loaded2.isRevealed(1, 1)).toBe(false);
    });
  });

  describe('bitset encoding efficiency', () => {
    it('should use ~13 bytes for 100 revealed tiles', () => {
      const characterId = 'efficiency-test';

      // Reveal 100 tiles
      for (let i = 0; i < 100; i++) {
        persistence.setRevealed(i, 0);
      }

      persistence.save(characterId);

      // Get base64 string from localStorage
      const base64 = localStorage.getItem('fog-revealed-efficiency-test');
      expect(base64).toBeTruthy();

      // Base64 encoding inflates size by ~33%, so raw bytes ≈ base64.length * 0.75
      const estimatedBytes = base64!.length * 0.75;

      // 100 tiles / 8 bits per byte = 12.5 bytes minimum
      // Allow some overhead for rounding and encoding
      expect(estimatedBytes).toBeLessThan(50); // Should be way less than if we stored strings
    });
  });
});
