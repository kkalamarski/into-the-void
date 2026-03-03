// Side-effect import — trigger item registration
import '../index';

import { describe, it, expect } from 'vitest';
import { ALL_ITEMS, ITEM_IDS } from '../definitions';
import { ItemRegistry } from '../registry';

const SNAKE_CASE_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

const itemIdEntries = Object.entries(ITEM_IDS) as [string, string][];

describe('Item ID Constant Validation', () => {
  describe('Every ITEM_IDS constant maps to a registered item', () => {
    it.each(itemIdEntries)(
      'ITEM_IDS.%s → "%s" exists in ItemRegistry',
      (constName, itemId) => {
        expect(
          ItemRegistry.has(itemId),
          `ITEM_IDS.${constName} maps to "${itemId}" but no item with that ID exists in ItemRegistry. Either add the item definition or remove the constant`
        ).toBe(true);
      }
    );
  });

  describe('Every registered item has a matching ITEM_IDS constant', () => {
    const allItemIdValues = new Set<string>(Object.values(ITEM_IDS));

    it.each(ALL_ITEMS.map((i) => [i.id, i.displayName] as const))(
      'item "%s" (%s) has a matching ITEM_IDS constant',
      (id) => {
        expect(
          allItemIdValues.has(id),
          `Item "${id}" is registered but has no matching ITEM_IDS constant. Add it to ITEM_IDS in packages/items/src/definitions/index.ts`
        ).toBe(true);
      }
    );
  });

  describe('All ITEM_IDS values follow snake_case naming convention', () => {
    it.each(itemIdEntries)(
      'ITEM_IDS.%s value "%s" is valid snake_case',
      (constName, itemId) => {
        expect(
          SNAKE_CASE_RE.test(itemId),
          `ITEM_IDS.${constName} value "${itemId}" is not valid snake_case. Use format like "suit_basic_common"`
        ).toBe(true);
      }
    );
  });

  describe('ITEM_IDS constant names match item ID values', () => {
    it.each(itemIdEntries)(
      'ITEM_IDS.%s matches its value "%s"',
      (constName, itemId) => {
        expect(
          constName.toLowerCase(),
          `ITEM_IDS.${constName} (lowered: "${constName.toLowerCase()}") does not match its value "${itemId}". The constant name should be the UPPER_CASE version of the item ID`
        ).toBe(itemId);
      }
    );
  });

  describe('No duplicate item IDs', () => {
    it('ALL_ITEMS has no duplicate IDs', () => {
      const ids = ALL_ITEMS.map((i) => i.id);
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(
        duplicates,
        `Duplicate item IDs found: ${duplicates.join(', ')}. Each item must have a unique ID`
      ).toEqual([]);
    });
  });
});
