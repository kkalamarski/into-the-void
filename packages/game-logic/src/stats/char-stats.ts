import type { CharacterStats, StatScaleTarget } from '@into-the-void/shared-types';
import type { EquipmentJson, InventoryItemJson } from '@into-the-void/database';
import { ItemRegistry } from '@into-the-void/items';
import { resolveEffectsForTrigger } from '../inventory/effects';

/**
 * Scale constants for each StatScaleTarget.
 * Defines base stats at level 1 and growth per additional level.
 */
const SCALE_CONSTANTS: Record<
  StatScaleTarget,
  { base: CharacterStats; growth: CharacterStats }
> = {
  player: {
    base: {
      durability: 100,
      toughness: 50,
      power: 50,
      haste: 50,
      vigor: 80,
      recovery: 30,
      perception: 40,
      resilience: 30,
    },
    growth: {
      durability: 10,
      toughness: 5,
      power: 5,
      haste: 3,
      vigor: 7,
      recovery: 3,
      perception: 3,
      resilience: 3,
    },
  },
  creature: {
    base: {
      durability: 80,
      toughness: 40,
      power: 60,
      haste: 40,
      vigor: 60,
      recovery: 20,
      perception: 50,
      resilience: 25,
    },
    growth: {
      durability: 8,
      toughness: 4,
      power: 7,
      haste: 4,
      vigor: 6,
      recovery: 2,
      perception: 4,
      resilience: 2,
    },
  },
};

/**
 * Compute character stats from level and equipped items.
 *
 * Pure function — no DB calls, no side effects.
 * Linear scaling: stat = base + (level - 1) * growth
 * Equipment bonuses are aggregated on top of the scaled base.
 *
 * @param level - Character level (1-based)
 * @param equipment - Equipment JSON from DB (server-authoritative)
 * @param target - Whether to use player or creature scaling constants
 * @returns Complete 8-stat CharacterStats object
 */
export function computeCharStats(
  level: number,
  equipment: EquipmentJson,
  target: StatScaleTarget = 'player'
): CharacterStats {
  const { base, growth } = SCALE_CONSTANTS[target];

  // Linear base stats: base + (level - 1) * growth
  const stats: CharacterStats = {
    durability: base.durability + (level - 1) * growth.durability,
    toughness: base.toughness + (level - 1) * growth.toughness,
    power: base.power + (level - 1) * growth.power,
    haste: base.haste + (level - 1) * growth.haste,
    vigor: base.vigor + (level - 1) * growth.vigor,
    recovery: base.recovery + (level - 1) * growth.recovery,
    perception: base.perception + (level - 1) * growth.perception,
    resilience: base.resilience + (level - 1) * growth.resilience,
  };

  // Collect all equipped items
  const equippedItems: InventoryItemJson[] = [
    equipment.exosuit,
    ...equipment.modules,
    equipment.tool,
    equipment.accessory1,
    equipment.accessory2,
  ].filter((item): item is InventoryItemJson => item !== undefined);

  // Aggregate equipment bonuses
  for (const equippedItem of equippedItems) {
    const itemDef = ItemRegistry.get(equippedItem.itemId);
    if (!itemDef) continue;

    const equipEffects = resolveEffectsForTrigger(itemDef.effects, 'on_equip');
    const passiveEffects = resolveEffectsForTrigger(itemDef.effects, 'passive');
    const allEffects = [...equipEffects, ...passiveEffects];

    for (const effect of allEffects) {
      for (const [stat, value] of Object.entries(effect.applied)) {
        // Only apply if stat exists in CharacterStats — silently skip unknown names
        // (Phase 31 will map old buff names to new stats)
        if (stat in stats) {
          (stats as unknown as Record<string, number>)[stat] += value;
        }
      }
    }
  }

  return stats;
}
