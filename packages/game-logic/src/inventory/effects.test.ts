import { resolveEffect } from './effects';
import type { ItemEffect } from '@into-the-void/items';

describe('resolveEffect', () => {
  describe('stats effect', () => {
    it('should resolve single stat effect', () => {
      const effect: ItemEffect = {
        type: 'stats',
        toughness: 10,
      };

      const result = resolveEffect(effect);

      expect(result.type).toBe('stats');
      expect(result.applied).toEqual({ toughness: 10 });
      expect(result.duration).toBeUndefined();
    });

    it('should resolve multi-stat effect', () => {
      const effect: ItemEffect = {
        type: 'stats',
        toughness: 15,
        durability: 20,
        power: 8,
      };

      const result = resolveEffect(effect);

      expect(result.type).toBe('stats');
      expect(result.applied).toEqual({
        toughness: 15,
        durability: 20,
        power: 8,
      });
    });

    it('should omit undefined stats from applied object', () => {
      const effect: ItemEffect = {
        type: 'stats',
        power: 12,
        // All other stats undefined
      };

      const result = resolveEffect(effect);

      expect(result.applied).toEqual({ power: 12 });
      expect(Object.keys(result.applied)).toHaveLength(1);
    });

    it('should handle all 8 stats defined', () => {
      const effect: ItemEffect = {
        type: 'stats',
        durability: 5,
        toughness: 5,
        power: 5,
        haste: 5,
        vigor: 5,
        recovery: 5,
        perception: 5,
        resilience: 5,
      };

      const result = resolveEffect(effect);

      expect(Object.keys(result.applied)).toHaveLength(8);
      expect(result.applied.durability).toBe(5);
      expect(result.applied.resilience).toBe(5);
    });
  });
});
