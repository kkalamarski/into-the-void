import type { ItemEffect, ItemEffectDef } from '@into-the-void/items';

/**
 * Result of resolving an item effect
 */
export interface EffectResult {
  /** Effect type identifier */
  type: string;
  /** Stats/values to apply - key is stat name, value is delta */
  applied: Record<string, number>;
  /** Duration in ms (for timed effects) */
  duration?: number;
}

/**
 * Resolve an ItemEffect to concrete stat changes.
 *
 * This is a pure function - it returns what SHOULD change, the caller
 * is responsible for actually applying those changes to game state.
 *
 * @param effect - The item effect to resolve
 * @returns EffectResult with stats to apply
 */
export function resolveEffect(effect: ItemEffect): EffectResult {
  switch (effect.type) {
    case 'heal':
      return {
        type: 'heal',
        applied: { health: effect.amount },
      };

    case 'energy_restore':
      return {
        type: 'energy_restore',
        applied: { energy: effect.amount },
      };

    case 'suit_repair':
      return {
        type: 'suit_repair',
        applied: { suitDurability: effect.amount },
      };

    case 'stat_buff':
      return {
        type: 'stat_buff',
        applied: { [effect.stat]: effect.amount },
        duration: effect.duration,
      };

    case 'armor':
      return {
        type: 'armor',
        applied: { armor: effect.value },
      };

    case 'speed':
      return {
        type: 'speed',
        applied: { speedMultiplier: effect.multiplier },
      };

    case 'life_support':
      return {
        type: 'life_support',
        applied: { hazardResistance: effect.hazardResistance },
      };

    case 'sensor':
      return {
        type: 'sensor',
        applied: { detectionRange: effect.detectionRange },
      };

    case 'power_core':
      return {
        type: 'power_core',
        applied: {
          energyCapacity: effect.energyCapacity,
          rechargeRate: effect.rechargeRate,
        },
      };

    case 'mobility':
      return {
        type: 'mobility',
        applied: { jumpHeight: effect.jumpHeight },
      };

    default: {
      // Exhaustive check - TypeScript will error if a case is missed
      const _exhaustive: never = effect;
      console.warn('Unknown effect type:', _exhaustive);
      return {
        type: 'unknown',
        applied: {},
      };
    }
  }
}

/**
 * Resolve all effects from an item's effect definitions
 *
 * @param effects - Array of ItemEffectDef from item definition
 * @param trigger - Which trigger to resolve ('on_use', 'on_equip', or 'passive')
 * @returns Array of EffectResults for matching trigger
 */
export function resolveEffectsForTrigger(
  effects: readonly ItemEffectDef[] | undefined,
  trigger: 'on_use' | 'on_equip' | 'passive'
): EffectResult[] {
  if (!effects) return [];

  return effects
    .filter(e => e.trigger === trigger)
    .map(e => resolveEffect(e.effect));
}
