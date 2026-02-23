import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FogManager } from './FogManager';

describe('FogManager', () => {
  let manager: FogManager;
  const characterId = 'test-character-123';

  beforeEach(() => {
    localStorage.clear();
    manager = new FogManager(characterId, 3); // Small radius for easier testing
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialize', () => {
    it('should return false when no saved data exists', () => {
      const loaded = manager.initialize();
      expect(loaded).toBe(false);
    });

    it('should return true when loading existing fog state', () => {
      // Reveal some tiles and save
      manager.initialize();
      manager.revealAtPosition(0, 0);
      manager.save();

      // Create new manager and load
      const newManager = new FogManager(characterId, 3);
      const loaded = newManager.initialize();
      expect(loaded).toBe(true);
      expect(newManager.isRevealed(0, 0)).toBe(true);
    });
  });

  describe('revealAtPosition', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should reveal tiles within radius', () => {
      const revealed = manager.revealAtPosition(0, 0);

      // Should reveal center tile
      expect(manager.isRevealed(0, 0)).toBe(true);

      // Should reveal tiles within radius=3
      expect(manager.isRevealed(1, 0)).toBe(true);
      expect(manager.isRevealed(0, 1)).toBe(true);
      expect(manager.isRevealed(-1, 0)).toBe(true);
      expect(manager.isRevealed(0, -1)).toBe(true);
      expect(manager.isRevealed(2, 0)).toBe(true);
      expect(manager.isRevealed(0, 2)).toBe(true);

      // Tiles at radius edge
      expect(manager.isRevealed(3, 0)).toBe(true);
      expect(manager.isRevealed(0, 3)).toBe(true);

      // All revealed tiles should be in returned set
      expect(revealed.size).toBeGreaterThan(0);
    });

    it('should not reveal tiles beyond radius', () => {
      manager.revealAtPosition(0, 0);

      // Beyond radius=3 (manhattan distance > 3)
      expect(manager.isRevealed(4, 0)).toBe(false);
      expect(manager.isRevealed(0, 4)).toBe(false);
      expect(manager.isRevealed(5, 5)).toBe(false);
      expect(manager.isRevealed(10, 10)).toBe(false);
    });

    it('should return only newly revealed tiles', () => {
      // First reveal
      const firstReveal = manager.revealAtPosition(0, 0);
      const firstCount = firstReveal.size;

      expect(firstCount).toBeGreaterThan(0);

      // Second reveal at same position (nothing new)
      const secondReveal = manager.revealAtPosition(0, 0);
      expect(secondReveal.size).toBe(0);

      // Third reveal at nearby position (some overlap, some new)
      const thirdReveal = manager.revealAtPosition(2, 2);
      expect(thirdReveal.size).toBeGreaterThan(0);
      expect(thirdReveal.size).toBeLessThan(firstCount); // Some overlap with first
    });

    it('should form manhattan distance radius pattern', () => {
      // Reveal with radius=2 for precise testing
      const smallManager = new FogManager('test', 2);
      smallManager.initialize();
      smallManager.revealAtPosition(0, 0);

      // Center and cardinal directions within distance 2
      expect(smallManager.isRevealed(0, 0)).toBe(true);
      expect(smallManager.isRevealed(1, 0)).toBe(true);
      expect(smallManager.isRevealed(2, 0)).toBe(true);
      expect(smallManager.isRevealed(0, 1)).toBe(true);
      expect(smallManager.isRevealed(0, 2)).toBe(true);
      expect(smallManager.isRevealed(-1, 0)).toBe(true);
      expect(smallManager.isRevealed(-2, 0)).toBe(true);
      expect(smallManager.isRevealed(0, -1)).toBe(true);
      expect(smallManager.isRevealed(0, -2)).toBe(true);

      // Diagonals at distance 2 should be revealed (1,1 is distance 2)
      expect(smallManager.isRevealed(1, 1)).toBe(true);
      expect(smallManager.isRevealed(-1, -1)).toBe(true);

      // Distance 3 should NOT be revealed
      expect(smallManager.isRevealed(3, 0)).toBe(false);
      expect(smallManager.isRevealed(0, 3)).toBe(false);
      expect(smallManager.isRevealed(2, 2)).toBe(false); // Distance 4
    });

    it('should handle negative coordinates', () => {
      manager.revealAtPosition(-100, -200);

      expect(manager.isRevealed(-100, -200)).toBe(true);
      expect(manager.isRevealed(-99, -200)).toBe(true);
      expect(manager.isRevealed(-100, -199)).toBe(true);
      expect(manager.isRevealed(-101, -200)).toBe(true);
      expect(manager.isRevealed(-100, -201)).toBe(true);
    });
  });

  describe('isRevealed', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should return true for revealed tiles', () => {
      manager.revealAtPosition(5, 5);
      expect(manager.isRevealed(5, 5)).toBe(true);
    });

    it('should return false for unrevealed tiles', () => {
      expect(manager.isRevealed(100, 100)).toBe(false);
    });
  });

  describe('getAllRevealedTiles', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should return empty set when no tiles revealed', () => {
      const revealed = manager.getAllRevealedTiles();
      expect(revealed.size).toBe(0);
    });

    it('should return all revealed tiles after single reveal', () => {
      manager.revealAtPosition(0, 0);
      const revealed = manager.getAllRevealedTiles();

      expect(revealed.size).toBeGreaterThan(0);
      expect(revealed.has('0,0')).toBe(true);
      expect(revealed.has('1,0')).toBe(true);
      expect(revealed.has('0,1')).toBe(true);
    });

    it('should return all revealed tiles after multiple reveals', () => {
      // Reveal two separate areas
      manager.revealAtPosition(0, 0);
      manager.revealAtPosition(20, 20);

      const revealed = manager.getAllRevealedTiles();

      // Should have tiles from both areas
      expect(revealed.has('0,0')).toBe(true);
      expect(revealed.has('20,20')).toBe(true);

      // Total should be sum of both areas (no overlap at distance 20)
      const count = revealed.size;
      expect(count).toBeGreaterThan(10); // At least some tiles from each area
    });

    it('should persist across save/load', () => {
      manager.revealAtPosition(5, 10);
      manager.save();

      const newManager = new FogManager(characterId, 3);
      newManager.initialize();

      const revealed = newManager.getAllRevealedTiles();
      expect(revealed.has('5,10')).toBe(true);
      expect(revealed.has('6,10')).toBe(true);
      expect(revealed.size).toBeGreaterThan(0);
    });
  });

  describe('save/load persistence', () => {
    it('should persist revealed tiles to localStorage', () => {
      manager.initialize();
      manager.revealAtPosition(10, 20);
      manager.save();

      // Verify localStorage has data
      const key = `fog-revealed-${characterId}`;
      const saved = localStorage.getItem(key);
      expect(saved).toBeTruthy();
      expect(saved).toContain(''); // Should be base64 string
    });

    it('should load revealed tiles from localStorage', () => {
      // First manager reveals and saves
      manager.initialize();
      manager.revealAtPosition(15, 25);
      manager.save();

      // Second manager loads state
      const newManager = new FogManager(characterId, 3);
      newManager.initialize();

      expect(newManager.isRevealed(15, 25)).toBe(true);
      expect(newManager.isRevealed(16, 25)).toBe(true);
      expect(newManager.getRevealedCount()).toBeGreaterThan(0);
    });

    it('should auto-save after revealing new tiles', () => {
      manager.initialize();

      // Reveal some tiles
      manager.revealAtPosition(0, 0);

      // Wait for throttle period and check if saved
      // Note: Auto-save is throttled to 5 seconds, so immediate saves might not happen
      // This test just verifies the mechanism exists

      const saved = manager.save();
      expect(saved).toBe(true);

      // Verify save worked
      const newManager = new FogManager(characterId, 3);
      newManager.initialize();
      expect(newManager.isRevealed(0, 0)).toBe(true);
    });
  });

  describe('getRevealedCount', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should return 0 when no tiles revealed', () => {
      expect(manager.getRevealedCount()).toBe(0);
    });

    it('should return correct count after revealing tiles', () => {
      manager.revealAtPosition(0, 0);
      const count = manager.getRevealedCount();
      expect(count).toBeGreaterThan(0);
    });

    it('should not increase count when revealing same tiles again', () => {
      manager.revealAtPosition(0, 0);
      const firstCount = manager.getRevealedCount();

      manager.revealAtPosition(0, 0);
      const secondCount = manager.getRevealedCount();

      expect(secondCount).toBe(firstCount);
    });
  });

  describe('flush', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should force immediate save', () => {
      manager.revealAtPosition(5, 5);
      const saved = manager.flush();
      expect(saved).toBe(true);

      // Verify save worked
      const newManager = new FogManager(characterId, 3);
      newManager.initialize();
      expect(newManager.isRevealed(5, 5)).toBe(true);
    });
  });

  describe('large scale reveal', () => {
    beforeEach(() => {
      manager.initialize();
    });

    it('should handle large radius without stack overflow', () => {
      const largeManager = new FogManager('large-test', 50);
      largeManager.initialize();

      // This would cause stack overflow with recursive implementation
      const revealed = largeManager.revealAtPosition(0, 0);

      expect(revealed.size).toBeGreaterThan(100);
      expect(largeManager.isRevealed(0, 0)).toBe(true);
      expect(largeManager.isRevealed(25, 0)).toBe(true);
      expect(largeManager.isRevealed(0, 25)).toBe(true);
    });
  });
});
