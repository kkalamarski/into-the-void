// Side-effect imports — must come first to populate registries
import '@into-the-void/items';
// Trigger entity registration via local index (can't self-import workspace package)
import '../index';

import { describe, it, expect } from 'vitest';
import { ALL_ENTITIES } from '../definitions';
import { ItemRegistry } from '@into-the-void/items';
import type { PlantDefinition, MineralDefinition } from '../types';

const EQUIPMENT_CATEGORIES = new Set(['suit', 'tool', 'module']);

const allPlants = ALL_ENTITIES.filter(
  (e): e is PlantDefinition => e.entityClass === 'plant'
);
const allMinerals = ALL_ENTITIES.filter(
  (e): e is MineralDefinition => e.entityClass === 'mineral'
);

describe('Harvest Yield Validation', () => {
  describe('Every plant harvestYield itemId exists in ItemRegistry', () => {
    it.each(allPlants.map((p) => [p.id, p] as const))(
      'plant "%s" harvestYield items all exist in ItemRegistry',
      (id, plant) => {
        for (const entry of plant.harvestYield) {
          expect(
            ItemRegistry.has(entry.itemId),
            `Plant "${id}" harvestYield references item "${entry.itemId}" which does not exist in ItemRegistry. Add it in packages/items/src/definitions/ or fix the reference`
          ).toBe(true);
        }
      }
    );
  });

  describe('Every mineral miningYield itemId exists in ItemRegistry', () => {
    it.each(allMinerals.map((m) => [m.id, m] as const))(
      'mineral "%s" miningYield items all exist in ItemRegistry',
      (id, mineral) => {
        for (const entry of mineral.miningYield) {
          expect(
            ItemRegistry.has(entry.itemId),
            `Mineral "${id}" miningYield references item "${entry.itemId}" which does not exist in ItemRegistry. Add it in packages/items/src/definitions/ or fix the reference`
          ).toBe(true);
        }
      }
    );
  });

  describe('Plant harvest yields do not reference equipment items', () => {
    it.each(allPlants.map((p) => [p.id, p] as const))(
      'plant "%s" does not drop equipment (suits, tools, modules)',
      (id, plant) => {
        for (const entry of plant.harvestYield) {
          if (ItemRegistry.has(entry.itemId)) {
            const item = ItemRegistry.get(entry.itemId);
            expect(
              EQUIPMENT_CATEGORIES.has(item.category),
              `Plant "${id}" harvestYield references "${entry.itemId}" which is a ${item.category} — plants should not drop equipment. Use 'world-item' or 'reagent' category items`
            ).toBe(false);
          }
        }
      }
    );
  });

  describe('Mineral mining yields do not reference equipment items', () => {
    it.each(allMinerals.map((m) => [m.id, m] as const))(
      'mineral "%s" does not drop equipment (suits, tools, modules)',
      (id, mineral) => {
        for (const entry of mineral.miningYield) {
          if (ItemRegistry.has(entry.itemId)) {
            const item = ItemRegistry.get(entry.itemId);
            expect(
              EQUIPMENT_CATEGORIES.has(item.category),
              `Mineral "${id}" miningYield references "${entry.itemId}" which is a ${item.category} — minerals should not drop equipment. Use 'world-item' or 'reagent' category items`
            ).toBe(false);
          }
        }
      }
    );
  });

  describe('Plant harvest yield value ranges are valid', () => {
    it.each(allPlants.map((p) => [p.id, p] as const))(
      'plant "%s" has valid yield values',
      (id, plant) => {
        for (const entry of plant.harvestYield) {
          expect(
            entry.chance,
            `Plant "${id}" harvestYield item "${entry.itemId}" has chance ${entry.chance} — must be > 0`
          ).toBeGreaterThan(0);
          expect(
            entry.chance,
            `Plant "${id}" harvestYield item "${entry.itemId}" has chance ${entry.chance} — must be <= 1.0`
          ).toBeLessThanOrEqual(1.0);
          expect(
            entry.minAmount,
            `Plant "${id}" harvestYield item "${entry.itemId}" has minAmount ${entry.minAmount} — must be >= 1`
          ).toBeGreaterThanOrEqual(1);
          expect(
            entry.maxAmount,
            `Plant "${id}" harvestYield item "${entry.itemId}" has maxAmount ${entry.maxAmount} < minAmount ${entry.minAmount}`
          ).toBeGreaterThanOrEqual(entry.minAmount);
        }
      }
    );
  });

  describe('Mineral mining yield value ranges are valid', () => {
    it.each(allMinerals.map((m) => [m.id, m] as const))(
      'mineral "%s" has valid yield values',
      (id, mineral) => {
        for (const entry of mineral.miningYield) {
          expect(
            entry.chance,
            `Mineral "${id}" miningYield item "${entry.itemId}" has chance ${entry.chance} — must be > 0`
          ).toBeGreaterThan(0);
          expect(
            entry.chance,
            `Mineral "${id}" miningYield item "${entry.itemId}" has chance ${entry.chance} — must be <= 1.0`
          ).toBeLessThanOrEqual(1.0);
          expect(
            entry.minAmount,
            `Mineral "${id}" miningYield item "${entry.itemId}" has minAmount ${entry.minAmount} — must be >= 1`
          ).toBeGreaterThanOrEqual(1);
          expect(
            entry.maxAmount,
            `Mineral "${id}" miningYield item "${entry.itemId}" has maxAmount ${entry.maxAmount} < minAmount ${entry.minAmount}`
          ).toBeGreaterThanOrEqual(entry.minAmount);
        }
      }
    );
  });

  describe('Every plant has at least one harvest yield entry', () => {
    it.each(allPlants.map((p) => [p.id, p] as const))(
      'plant "%s" has at least one harvestYield entry',
      (id, plant) => {
        expect(
          plant.harvestYield.length,
          `Plant "${id}" has no harvestYield entries — harvesting it would produce nothing`
        ).toBeGreaterThan(0);
      }
    );
  });

  describe('Every mineral has at least one mining yield entry', () => {
    it.each(allMinerals.map((m) => [m.id, m] as const))(
      'mineral "%s" has at least one miningYield entry',
      (id, mineral) => {
        expect(
          mineral.miningYield.length,
          `Mineral "${id}" has no miningYield entries — mining it would produce nothing`
        ).toBeGreaterThan(0);
      }
    );
  });
});
