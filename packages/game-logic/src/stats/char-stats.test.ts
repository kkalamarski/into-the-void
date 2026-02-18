import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeCharStats } from './char-stats';
import type { EquipmentJson } from '@into-the-void/database';
import { ItemRegistry } from '@into-the-void/items';
import type { ItemDefinition } from '@into-the-void/items';

const emptyEquipment: EquipmentJson = { modules: [] };

describe('computeCharStats', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('level-10 player has higher base stats than level-1 player (STAT-03)', () => {
    const lv1 = computeCharStats(1, emptyEquipment);
    const lv10 = computeCharStats(10, emptyEquipment);

    expect(lv10.durability).toBeGreaterThan(lv1.durability);
    expect(lv10.power).toBeGreaterThan(lv1.power);
  });

  it('equipment bonuses are aggregated into final stats (STAT-02)', () => {
    const TEST_ITEM_ID = 'test_durability_module';

    const fakeItem: ItemDefinition = {
      id: TEST_ITEM_ID,
      displayName: 'Test Durability Module',
      description: 'A test module that boosts durability by 25',
      category: 'module',
      rarity: 'common',
      maxStack: 1,
      weight: 1,
      baseValue: 0,
      requiredLevel: 1,
      ilvl: 1,
      textureKey: 'item_unknown',
      color: 0xffffff,
      equipSlot: 'module',
      effects: [
        {
          trigger: 'on_equip',
          effect: {
            type: 'stat_buff',
            stat: 'durability',
            amount: 25,
            duration: 0,
          },
        },
      ],
    };

    vi.spyOn(ItemRegistry, 'get').mockReturnValue(fakeItem);

    const moduleEquipment: EquipmentJson = {
      modules: [
        {
          instanceId: 'test-instance-1',
          itemId: TEST_ITEM_ID,
          quantity: 1,
          slot: 0,
          properties: {},
        },
      ],
    };

    const base = computeCharStats(1, emptyEquipment);
    const boosted = computeCharStats(1, moduleEquipment);

    expect(boosted.durability).toBe(base.durability + 25);
  });

  it('creature target uses different scale constants (STAT-04)', () => {
    const player = computeCharStats(5, emptyEquipment, 'player');
    const creature = computeCharStats(5, emptyEquipment, 'creature');

    expect(creature.power).not.toBe(player.power);
  });

  it('returns all 8 stats as numbers with no undefined (STAT-01)', () => {
    const stats = computeCharStats(1, emptyEquipment);

    const statKeys: (keyof typeof stats)[] = [
      'durability',
      'toughness',
      'power',
      'haste',
      'vigor',
      'recovery',
      'perception',
      'resilience',
    ];

    for (const key of statKeys) {
      expect(typeof stats[key]).toBe('number');
      expect(stats[key]).toBeGreaterThan(0);
    }
  });
});
