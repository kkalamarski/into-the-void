import type { CharacterStats, StatScaleTarget, Buff } from '@into-the-void/shared-types';
import type { EquipmentJson, InventoryItemJson } from '@into-the-void/database';
import { ItemRegistry } from '@into-the-void/items';
import { resolveEffectsForTrigger } from '../inventory/effects';

/** Soft cap threshold — full value below this */
const SOFT_CAP = 200;

/** Diminishing returns multiplier above soft cap */
const DR_MULTIPLIER = 0.5;

/** Hard cap — maximum effective stat value */
const HARD_CAP = 400;

/**
 * Apply diminishing returns to a single raw stat value.
 * - Below 200: full value (1:1)
 * - Above 200: half value (0.5:1)
 * - Hard capped at 400 effective
 *
 * Pure function. No side effects.
 *
 * @param raw - Raw stat value (base + equipment + buffs)
 * @returns Effective stat value after diminishing returns
 */
export function applyDiminishingReturns(raw: number): number {
  if (raw <= SOFT_CAP) return raw;
  const effective = SOFT_CAP + (raw - SOFT_CAP) * DR_MULTIPLIER;
  return Math.min(HARD_CAP, effective);
}

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
 * AGGREGATION ORDER (base -> equipment -> buffs -> DR):
 * 1. Base stats: computed from level using linear scaling (base + (level-1) * growth)
 * 2. Equipment bonuses: additive bonuses from all equipped items (on_equip + passive effects)
 * 3. Buff modifiers: temporary stat changes from active abilities (additive)
 * 4. Diminishing returns: soft cap at 200 (0.5x above), hard cap at 400 effective
 *
 * All layers use ADDITIVE aggregation (stats[key] += value), making the result:
 * - Commutative: equipping items in different order produces same result
 * - Associative: grouping doesn't matter ((a+b)+c = a+(b+c))
 * - Deterministic: same inputs always produce same outputs
 *
 * Pure function - no DB calls, no side effects.
 *
 * @param level - Character level (1-based)
 * @param equipment - Equipment JSON from DB (server-authoritative)
 * @param target - Whether to use player or creature scaling constants
 * @param activeBuffs - Optional array of active buffs to apply stat modifiers
 * @param options - Optional: { skipDR: true } to get raw uncapped values
 * @returns Complete 8-stat CharacterStats object (DR-capped unless skipDR)
 */
export function computeCharStats(
  level: number,
  equipment: EquipmentJson,
  target: StatScaleTarget = 'player',
  activeBuffs: Buff[] = [],
  options: { skipDR?: boolean } = {}
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

  // Collect all equipped items (defensive: modules may be undefined in legacy DB rows)
  const equippedItems: InventoryItemJson[] = [
    equipment.exosuit,
    ...(equipment.modules ?? []),
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

  // Apply active buff stat modifiers
  for (const buff of activeBuffs) {
    // Only apply if buff.stat is a valid CharacterStats key
    if (buff.stat in stats) {
      (stats as unknown as Record<string, number>)[buff.stat] += buff.amount;
    }
  }

  // Apply diminishing returns: soft cap at 200 (0.5x above), hard cap at 400 effective
  if (!options.skipDR) {
    for (const key of Object.keys(stats) as Array<keyof CharacterStats>) {
      stats[key] = applyDiminishingReturns(stats[key]);
    }
  }

  return stats;
}
