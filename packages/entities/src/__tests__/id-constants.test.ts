// Side-effect import — trigger entity registration
import '../index';

import { describe, it, expect } from 'vitest';
import { ALL_ENTITIES, ENTITY_IDS } from '../definitions';
import { EntityRegistry } from '../registry';

const SNAKE_CASE_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

const entityIdEntries = Object.entries(ENTITY_IDS) as [string, string][];

describe('Entity ID Constant Validation', () => {
  describe('Every ENTITY_IDS constant maps to a registered entity', () => {
    it.each(entityIdEntries)(
      'ENTITY_IDS.%s → "%s" exists in EntityRegistry',
      (constName, entityId) => {
        expect(
          EntityRegistry.has(entityId),
          `ENTITY_IDS.${constName} maps to "${entityId}" but no entity with that ID exists in EntityRegistry. Either add the entity definition or remove the constant`
        ).toBe(true);
      }
    );
  });

  describe('Every registered entity has a matching ENTITY_IDS constant', () => {
    const allEntityIdValues = new Set<string>(Object.values(ENTITY_IDS));

    it.each(ALL_ENTITIES.map((e) => [e.id, e.displayName] as const))(
      'entity "%s" (%s) has a matching ENTITY_IDS constant',
      (id) => {
        expect(
          allEntityIdValues.has(id),
          `Entity "${id}" is registered but has no matching ENTITY_IDS constant. Add it to ENTITY_IDS in packages/entities/src/definitions/index.ts`
        ).toBe(true);
      }
    );
  });

  describe('All ENTITY_IDS values follow snake_case naming convention', () => {
    it.each(entityIdEntries)(
      'ENTITY_IDS.%s value "%s" is valid snake_case',
      (constName, entityId) => {
        expect(
          SNAKE_CASE_RE.test(entityId),
          `ENTITY_IDS.${constName} value "${entityId}" is not valid snake_case. Use format like "creature_void_crawler"`
        ).toBe(true);
      }
    );
  });

  describe('ENTITY_IDS constant names match entity ID values', () => {
    it.each(entityIdEntries)(
      'ENTITY_IDS.%s matches its value "%s"',
      (constName, entityId) => {
        expect(
          constName.toLowerCase(),
          `ENTITY_IDS.${constName} (lowered: "${constName.toLowerCase()}") does not match its value "${entityId}". The constant name should be the UPPER_CASE version of the entity ID`
        ).toBe(entityId);
      }
    );
  });

  describe('No duplicate entity IDs', () => {
    it('ALL_ENTITIES has no duplicate IDs', () => {
      const ids = ALL_ENTITIES.map((e) => e.id);
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(
        duplicates,
        `Duplicate entity IDs found: ${duplicates.join(', ')}. Each entity must have a unique ID`
      ).toEqual([]);
    });
  });
});
