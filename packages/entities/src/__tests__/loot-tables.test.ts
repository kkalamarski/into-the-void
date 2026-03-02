// Side-effect imports — must come first to populate registries
import '@into-the-void/items';
// Trigger entity registration via local index (can't self-import workspace package)
import '../index';

import { describe, it, expect } from 'vitest';
import { ALL_ENTITIES } from '../definitions';
// Import directly from the loot module to avoid pulling in all game-logic transitive deps
import { CREATURE_LOOT_TABLES } from '@into-the-void/game-logic/src/loot/creature-loot';
import { ItemRegistry } from '@into-the-void/items';
import type { CreatureDefinition } from '../types';

const allCreatures = ALL_ENTITIES.filter(
  (e): e is CreatureDefinition => e.entityClass === 'creature'
);

describe('Creature Loot Table Validation', () => {
  describe('Every creature has a CREATURE_LOOT_TABLES entry', () => {
    it.each(allCreatures.map((c) => [c.id, c] as const))(
      'creature "%s" has a loot table entry',
      (id, creature) => {
        expect(
          CREATURE_LOOT_TABLES.has(creature.lootTableId),
          `Creature "${id}" has no CREATURE_LOOT_TABLES entry (expected key: "${creature.lootTableId}"). Add it in packages/game-logic/src/loot/creature-loot.ts`
        ).toBe(true);
      }
    );
  });

  describe('Every loot table has at least one item with positive drop chance', () => {
    const creaturesWithLoot = allCreatures.filter((c) =>
      CREATURE_LOOT_TABLES.has(c.lootTableId)
    );

    it.each(creaturesWithLoot.map((c) => [c.id, c] as const))(
      'creature "%s" loot table has positive-chance items',
      (id, creature) => {
        const entries = CREATURE_LOOT_TABLES.get(creature.lootTableId)!;
        const hasPositiveChance = entries.some((entry) => entry.chance > 0);
        expect(
          hasPositiveChance,
          `Loot table "${creature.lootTableId}" for creature "${id}" has no items with positive drop chance — creature would drop nothing`
        ).toBe(true);
      }
    );
  });

  describe('Every loot table item reference exists in ItemRegistry', () => {
    const creaturesWithLoot = allCreatures.filter((c) =>
      CREATURE_LOOT_TABLES.has(c.lootTableId)
    );

    it.each(creaturesWithLoot.map((c) => [c.id, c] as const))(
      'creature "%s" loot table items all exist in ItemRegistry',
      (id, creature) => {
        const entries = CREATURE_LOOT_TABLES.get(creature.lootTableId)!;
        for (const entry of entries) {
          expect(
            ItemRegistry.has(entry.itemId),
            `Loot table "${creature.lootTableId}" references item "${entry.itemId}" which does not exist in ItemRegistry. Check packages/items/src/definitions/ for valid item IDs`
          ).toBe(true);
        }
      }
    );
  });

  describe('No orphaned loot tables (reverse check)', () => {
    const creatureLootIds = new Set(allCreatures.map((c) => c.lootTableId));

    const lootTableKeys = Array.from(CREATURE_LOOT_TABLES.keys());

    it.each(lootTableKeys.map((k) => [k] as const))(
      'loot table "%s" is referenced by a creature',
      (key) => {
        expect(
          creatureLootIds.has(key),
          `CREATURE_LOOT_TABLES has entry "${key}" but no creature references it as its lootTableId. Remove it or add the creature definition`
        ).toBe(true);
      }
    );
  });
});
