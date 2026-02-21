import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeCharStats } from './char-stats';
import { extractItemStats, computeEquipmentDelta } from './stat-helpers';
import { ItemRegistry } from '@into-the-void/items';
import type { ItemDefinition } from '@into-the-void/items';
import type { EquipmentJson, InventoryItemJson } from '@into-the-void/database';
import type { CharacterStats } from '@into-the-void/shared-types';

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

// Test helper: create inventory item
function createInventoryItem(itemId: string): InventoryItemJson {
  return {
    instanceId: `test-${itemId}`,
    itemId,
    quantity: 1,
    slot: 0,
    properties: {},
  };
}

describe('Client/Server Stat Parity (PARI-03)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extractItemStats matches computeCharStats delta for single item', () => {
    // Create a mock module with durability: 20, power: 10
    const moduleId = 'test_parity_module_1';
    const mockModule = createMockModule(moduleId, 'durability', 20);
    // Add another stat to the same item to test multi-stat aggregation
    mockModule.effects.push({
      trigger: 'passive',
      effect: { type: 'stats', power: 10 } as any,
    });

    vi.spyOn(ItemRegistry, 'get').mockReturnValue(mockModule);

    // CLIENT: Extract stats using tooltip function
    const clientStats = extractItemStats(mockModule);

    // SERVER: Compute stats with and without the module
    const baseStats = computeCharStats(5, emptyEquipment);
    const equippedStats = computeCharStats(5, {
      modules: [createInventoryItem(moduleId)],
    });

    // Calculate server delta
    const serverDelta: Partial<CharacterStats> = {};
    for (const key of Object.keys(clientStats) as Array<keyof CharacterStats>) {
      serverDelta[key] = equippedStats[key] - baseStats[key];
    }

    // Assert client and server deltas match
    expect(clientStats.durability).toBe(20);
    expect(clientStats.power).toBe(10);
    expect(serverDelta.durability).toBe(20);
    expect(serverDelta.power).toBe(10);
    expect(clientStats).toEqual(serverDelta);
  });

  it('computeEquipmentDelta matches server calculation for item swap', () => {
    // Create two mock items with different stat bonuses
    const item1Id = 'test_item_swap_1';
    const item2Id = 'test_item_swap_2';

    const item1: ItemDefinition = {
      id: item1Id,
      displayName: 'Test Item 1',
      description: 'Item with +20 durability',
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
          effect: { type: 'stats', durability: 20 } as any,
        },
      ],
    };

    const item2: ItemDefinition = {
      id: item2Id,
      displayName: 'Test Item 2',
      description: 'Item with +30 durability, +5 toughness',
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
          effect: { type: 'stats', durability: 30, toughness: 5 } as any,
        },
      ],
    };

    vi.spyOn(ItemRegistry, 'get').mockImplementation((id) => {
      if (id === item1Id) return item1;
      if (id === item2Id) return item2;
      return undefined;
    });

    // CLIENT: Compute delta for swapping item1 -> item2 using tooltip function
    const clientDeltas = computeEquipmentDelta(item2, item1);

    // SERVER: Compute stats with item1 equipped
    const withItem1 = computeCharStats(5, {
      modules: [createInventoryItem(item1Id)],
    });

    // SERVER: Compute stats with item2 equipped
    const withItem2 = computeCharStats(5, {
      modules: [createInventoryItem(item2Id)],
    });

    // Calculate server delta
    const serverDelta = {
      durability: withItem2.durability - withItem1.durability,
      toughness: withItem2.toughness - withItem1.toughness,
    };

    // Convert client deltas array to object for comparison
    const clientDeltaObj: Record<string, number> = {};
    for (const { stat, delta } of clientDeltas) {
      clientDeltaObj[stat] = delta;
    }

    // Assert client and server deltas match
    expect(clientDeltaObj.durability).toBe(10); // 30 - 20
    expect(clientDeltaObj.toughness).toBe(5); // 5 - 0
    expect(serverDelta.durability).toBe(10);
    expect(serverDelta.toughness).toBe(5);
    expect(clientDeltaObj.durability).toBe(serverDelta.durability);
    expect(clientDeltaObj.toughness).toBe(serverDelta.toughness);
  });

  it('extractItemStats returns empty object for item with no stat effects', () => {
    const itemId = 'test_no_effects';
    const noEffectsItem: ItemDefinition = {
      id: itemId,
      displayName: 'Item with No Stats',
      description: 'This item has no stat bonuses',
      category: 'consumable',
      rarity: 'common',
      maxStack: 10,
      weight: 1,
      baseValue: 10,
      requiredLevel: 1,
      ilvl: 1,
      textureKey: 'item_unknown',
      color: 0xffffff,
      effects: [], // No effects
    };

    const result = extractItemStats(noEffectsItem);

    expect(result).toEqual({});
    expect(Object.keys(result).length).toBe(0);
  });

  it('extractItemStats filters out non-stat effects', () => {
    const itemId = 'test_mixed_effects';
    const mixedEffectsItem: ItemDefinition = {
      id: itemId,
      displayName: 'Item with Mixed Effects',
      description: 'Item with stat and non-stat effects',
      category: 'consumable',
      rarity: 'common',
      maxStack: 1,
      weight: 1,
      baseValue: 50,
      requiredLevel: 1,
      ilvl: 1,
      textureKey: 'item_unknown',
      color: 0xffffff,
      effects: [
        {
          trigger: 'on_use',
          effect: { type: 'heal', amount: 50 } as any, // Non-stat effect (health)
        },
        {
          trigger: 'on_equip',
          effect: { type: 'stats', power: 15 } as any, // Stat effect
        },
        {
          trigger: 'passive',
          effect: { type: 'emergency_reboot', healPercent: 0.5 } as any, // Non-stat effect
        },
      ],
    };

    const result = extractItemStats(mixedEffectsItem);

    // Should only include CharacterStats keys, not healthPercent or other non-stat values
    expect(result).toEqual({ power: 15 });
    expect(Object.keys(result).length).toBe(1);
    expect(result.power).toBe(15);
    expect('health' in result).toBe(false);
    expect('healthPercent' in result).toBe(false);
  });

  it('computeEquipmentDelta handles unequipping (comparing to undefined)', () => {
    const itemId = 'test_item_unequip';
    const item: ItemDefinition = {
      id: itemId,
      displayName: 'Item to Unequip',
      description: 'Testing unequip scenario',
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
          effect: { type: 'stats', vigor: 25 } as any,
        },
      ],
    };

    // Hovering item when no item is equipped (comparing to undefined)
    const deltas = computeEquipmentDelta(item, undefined);

    expect(deltas.length).toBe(1);
    expect(deltas[0].stat).toBe('vigor');
    expect(deltas[0].delta).toBe(25); // All positive since comparing to nothing
  });
});
