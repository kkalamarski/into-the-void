import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeCharStats, applyDiminishingReturns } from './char-stats';
import type { EquipmentJson, InventoryItemJson } from '@into-the-void/database';
import { ItemRegistry } from '@into-the-void/items';
import type { ItemDefinition } from '@into-the-void/items';
import type { CharacterStats, Buff } from '@into-the-void/shared-types';

const emptyEquipment: EquipmentJson = { modules: [] };

// Test helper: create mock module definition
function createMockModule(id: string, stat: keyof CharacterStats, amount: number): ItemDefinition {
  return {
    id,
    displayName: `Test ${stat} Module`,
    description: `Test module that boosts ${stat} by ${amount}`,
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
        effect: { type: 'stats', [stat]: amount } as any,
      },
    ],
  };
}

// Test helper: create mock suit definition
function createMockSuit(id: string, stat: keyof CharacterStats, amount: number): ItemDefinition {
  return {
    id,
    displayName: `Test ${stat} Suit`,
    description: `Test suit that boosts ${stat} by ${amount}`,
    category: 'suit',
    rarity: 'common',
    maxStack: 1,
    weight: 5,
    baseValue: 0,
    requiredLevel: 1,
    ilvl: 1,
    textureKey: 'item_unknown',
    color: 0xffffff,
    equipSlot: 'exosuit',
    moduleSlots: 3,
    effects: [
      {
        trigger: 'on_equip',
        effect: { type: 'stats', [stat]: amount } as any,
      },
    ],
  };
}

// Test helper: create mock item with multiple stats
function createMockItemWithMultiStats(
  id: string,
  category: 'suit' | 'tool' | 'module',
  stats: Partial<CharacterStats>
): ItemDefinition {
  return {
    id,
    displayName: `Test ${category}`,
    description: 'Test item with multiple stat bonuses',
    category,
    rarity: 'common',
    maxStack: 1,
    weight: category === 'suit' ? 5 : 1,
    baseValue: 0,
    requiredLevel: 1,
    ilvl: 1,
    textureKey: 'item_unknown',
    color: 0xffffff,
    equipSlot: category === 'suit' ? 'exosuit' : category === 'tool' ? 'tool' : 'module',
    moduleSlots: category === 'suit' ? 3 : undefined,
    effects: [
      {
        trigger: 'on_equip',
        effect: { type: 'stats', ...stats } as any,
      },
    ],
  };
}

// Test helper: create module inventory item
function createModuleItem(itemId: string, slot: number): InventoryItemJson {
  return {
    instanceId: `test-${itemId}-${slot}`,
    itemId,
    quantity: 1,
    slot,
    properties: {},
  };
}

// Test helper: create generic inventory item
function createInventoryItem(itemId: string): InventoryItemJson {
  return {
    instanceId: `test-${itemId}`,
    itemId,
    quantity: 1,
    slot: 0,
    properties: {},
  };
}

describe('applyDiminishingReturns', () => {
  it('below soft cap — no change (CAPS-01)', () => {
    expect(applyDiminishingReturns(0)).toBe(0);
    expect(applyDiminishingReturns(100)).toBe(100);
    expect(applyDiminishingReturns(200)).toBe(200);
  });

  it('above soft cap — 0.5x returns (CAPS-01)', () => {
    // 250 raw: 200 + (250-200)*0.5 = 200 + 25 = 225
    expect(applyDiminishingReturns(250)).toBe(225);
    // 300 raw: 200 + (300-200)*0.5 = 200 + 50 = 250
    expect(applyDiminishingReturns(300)).toBe(250);
    // 400 raw: 200 + (400-200)*0.5 = 200 + 100 = 300
    expect(applyDiminishingReturns(400)).toBe(300);
    // 500 raw: 200 + (500-200)*0.5 = 200 + 150 = 350
    expect(applyDiminishingReturns(500)).toBe(350);
  });

  it('hard cap at 400 effective (CAPS-02)', () => {
    // 600 raw: 200 + (600-200)*0.5 = 200 + 200 = 400 (exactly at hard cap)
    expect(applyDiminishingReturns(600)).toBe(400);
    // 800 raw: would be 500 but capped at 400
    expect(applyDiminishingReturns(800)).toBe(400);
    // 1000 raw: would be 600 but capped at 400
    expect(applyDiminishingReturns(1000)).toBe(400);
  });

  it('negative values pass through unchanged', () => {
    expect(applyDiminishingReturns(-10)).toBe(-10);
  });

  it('computeCharStats applies DR to high-stat characters (CAPS-03)', () => {
    const highPowerModuleId = 'test_high_power_module';
    const mockModule = createMockModule(highPowerModuleId, 'power', 200);

    vi.spyOn(ItemRegistry, 'get').mockReturnValue(mockModule);

    const equipment: EquipmentJson = {
      modules: [createModuleItem(highPowerModuleId, 0)],
    };

    // Level 1 base power = 50. With +200 module: raw = 250.
    // DR: 200 + (250-200)*0.5 = 225
    const stats = computeCharStats(1, equipment);
    expect(stats.power).toBe(225);

    vi.restoreAllMocks();
  });
});

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

  it('module array permutations produce same stats (AGGR-02)', () => {
    // Create 3 distinct modules with different stat bonuses
    const module1Id = 'test_module_durability';
    const module2Id = 'test_module_power';
    const module3Id = 'test_module_toughness';

    const modules: Record<string, ItemDefinition> = {
      [module1Id]: createMockModule(module1Id, 'durability', 15),
      [module2Id]: createMockModule(module2Id, 'power', 10),
      [module3Id]: createMockModule(module3Id, 'toughness', 8),
    };

    vi.spyOn(ItemRegistry, 'get').mockImplementation((id) => modules[id]);

    // Generate all 6 permutations of module order
    const moduleItems = [
      createModuleItem(module1Id, 0),
      createModuleItem(module2Id, 1),
      createModuleItem(module3Id, 2),
    ];

    const permutations = [
      [moduleItems[0], moduleItems[1], moduleItems[2]],
      [moduleItems[0], moduleItems[2], moduleItems[1]],
      [moduleItems[1], moduleItems[0], moduleItems[2]],
      [moduleItems[1], moduleItems[2], moduleItems[0]],
      [moduleItems[2], moduleItems[0], moduleItems[1]],
      [moduleItems[2], moduleItems[1], moduleItems[0]],
    ];

    const results = permutations.map((modules) =>
      computeCharStats(5, { modules })
    );

    // All permutations should produce identical stats
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
    }

    // Verify expected totals (base level 5 stats + bonuses)
    const baseStats = computeCharStats(5, { modules: [] });
    expect(results[0].durability).toBe(baseStats.durability + 15);
    expect(results[0].power).toBe(baseStats.power + 10);
    expect(results[0].toughness).toBe(baseStats.toughness + 8);
  });

  it('equipment and buff stats combine correctly in documented order (AGGR-01)', () => {
    const suitId = 'test_suit_durability';
    const suitDef = createMockSuit(suitId, 'durability', 25);

    vi.spyOn(ItemRegistry, 'get').mockReturnValue(suitDef);

    const equipment: EquipmentJson = {
      exosuit: {
        instanceId: 'suit-1',
        itemId: suitId,
        quantity: 1,
        slot: 0,
        properties: {},
      },
      modules: [],
    };

    const buff: Buff = {
      id: 'buff-1',
      abilityId: 'test_ability',
      stat: 'durability',
      amount: 10,
      expiresAt: Date.now() + 10000,
      displayName: 'Test Buff',
      iconColor: 0x00ff00,
    };

    const baseStats = computeCharStats(5, { modules: [] });
    const withEquipment = computeCharStats(5, equipment);
    const withBoth = computeCharStats(5, equipment, 'player', [buff]);

    // Verify aggregation: base -> equipment -> buffs
    expect(withEquipment.durability).toBe(baseStats.durability + 25);
    expect(withBoth.durability).toBe(baseStats.durability + 25 + 10);
  });

  it('known equipment combinations match expected totals (AGGR-03)', () => {
    const suitId = 'test_full_loadout_suit';
    const toolId = 'test_full_loadout_tool';
    const moduleId = 'test_full_loadout_module';

    // Suit: +30 durability, +15 toughness
    // Tool: +20 power
    // Module: +10 haste

    const items: Record<string, ItemDefinition> = {
      [suitId]: createMockItemWithMultiStats(suitId, 'suit', { durability: 30, toughness: 15 }),
      [toolId]: createMockItemWithMultiStats(toolId, 'tool', { power: 20 }),
      [moduleId]: createMockItemWithMultiStats(moduleId, 'module', { haste: 10 }),
    };

    vi.spyOn(ItemRegistry, 'get').mockImplementation((id) => items[id]);

    const equipment: EquipmentJson = {
      exosuit: createInventoryItem(suitId),
      tool: createInventoryItem(toolId),
      modules: [createModuleItem(moduleId, 0)],
    };

    const baseStats = computeCharStats(5, { modules: [] });
    const fullLoadout = computeCharStats(5, equipment);

    // Validate exact expected totals
    expect(fullLoadout.durability).toBe(baseStats.durability + 30);
    expect(fullLoadout.toughness).toBe(baseStats.toughness + 15);
    expect(fullLoadout.power).toBe(baseStats.power + 20);
    expect(fullLoadout.haste).toBe(baseStats.haste + 10);

    // Unchanged stats should match base
    expect(fullLoadout.vigor).toBe(baseStats.vigor);
    expect(fullLoadout.recovery).toBe(baseStats.recovery);
    expect(fullLoadout.perception).toBe(baseStats.perception);
    expect(fullLoadout.resilience).toBe(baseStats.resilience);
  });
});
