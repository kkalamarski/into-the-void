import type { CharacterStats } from '@into-the-void/shared-types';
import type { ItemDefinition } from '@into-the-void/items';
import { resolveEffectsForTrigger } from '../inventory/effects';

/**
 * Extract stat bonuses from an item definition.
 *
 * This is a pure function used by both client (tooltip predictions) and server
 * (actual stat computation) to ensure calculation parity. By using the same
 * function, client tooltips will always show accurate "what-if" deltas that
 * match server-applied changes.
 *
 * Resolves both `on_equip` and `passive` effects and aggregates all numeric
 * stat bonuses into a Partial<CharacterStats> object.
 *
 * NOTE: This function returns ONLY equipment stat bonuses. It does NOT include
 * active buffs from abilities (those are applied separately by computeCharStats).
 *
 * @param itemDef - The item definition to extract stats from
 * @returns Partial<CharacterStats> with only non-zero stat bonuses
 */
export function extractItemStats(itemDef: ItemDefinition): Partial<CharacterStats> {
  const equipEffects = resolveEffectsForTrigger(itemDef.effects, 'on_equip');
  const passiveEffects = resolveEffectsForTrigger(itemDef.effects, 'passive');
  const allEffects = [...equipEffects, ...passiveEffects];

  const stats: Partial<CharacterStats> = {};

  for (const effect of allEffects) {
    for (const [key, value] of Object.entries(effect.applied)) {
      if (typeof value === 'number') {
        // Only include CharacterStats keys (filter out non-stat effects like healthPercent)
        if (isCharacterStatKey(key)) {
          stats[key] = (stats[key] ?? 0) + value;
        }
      }
    }
  }

  // Remove zero values for cleaner output
  const result: Partial<CharacterStats> = {};
  for (const [key, value] of Object.entries(stats)) {
    if (value !== 0) {
      result[key as keyof CharacterStats] = value;
    }
  }

  return result;
}

/**
 * Compute the delta between hovering a new item and the currently equipped item.
 *
 * Used for tooltip "vs Equipped" comparisons. Calculates the net stat change
 * that would occur if the user swapped from equippedItem to hoveredItem.
 *
 * Returns an array of { stat, delta } for all stats that would change, where:
 * - Positive delta = hoveredItem has more of this stat (upgrade)
 * - Negative delta = hoveredItem has less of this stat (downgrade)
 *
 * @param hoveredItem - The item being previewed
 * @param equippedItem - The item currently equipped in the same slot (undefined if slot is empty)
 * @returns Array of stat deltas for non-zero changes
 */
export function computeEquipmentDelta(
  hoveredItem: ItemDefinition,
  equippedItem: ItemDefinition | undefined
): Array<{ stat: keyof CharacterStats; delta: number }> {
  const hoveredStats = extractItemStats(hoveredItem);
  const equippedStats = equippedItem ? extractItemStats(equippedItem) : {};

  const allStatKeys = new Set<keyof CharacterStats>([
    ...Object.keys(hoveredStats),
    ...Object.keys(equippedStats),
  ] as Array<keyof CharacterStats>);

  const deltas: Array<{ stat: keyof CharacterStats; delta: number }> = [];

  for (const stat of allStatKeys) {
    const hoveredValue = hoveredStats[stat] ?? 0;
    const equippedValue = equippedStats[stat] ?? 0;
    const delta = hoveredValue - equippedValue;

    if (delta !== 0) {
      deltas.push({ stat, delta });
    }
  }

  return deltas;
}

/**
 * Type guard to check if a string is a valid CharacterStats key.
 * Prevents non-stat effects (like healthPercent from emergency_reboot) from
 * being included in stat calculations.
 */
function isCharacterStatKey(key: string): key is keyof CharacterStats {
  return [
    'durability',
    'toughness',
    'power',
    'haste',
    'vigor',
    'recovery',
    'perception',
    'resilience',
  ].includes(key);
}
