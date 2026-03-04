import type { EquipmentJson, InventoryItemJson } from '@into-the-void/database';
import { ItemRegistry } from '@into-the-void/items';
import { resolveEffectsForTrigger } from './effects';

/**
 * Computed effective stats derived from base stats + equipment.
 * Server calculates this; client-provided stat values are NEVER trusted.
 */
export interface ComputedStats {
  armor: number;
  speedMultiplier: number;
  hazardResistance: number;
  detectionRange: number;
  energyCapacity: number;
  rechargeRate: number;
  jumpHeight: number;
  /** Per-hazard-type protection percentages (chemical, thermal, physical, biological, anomalous) */
  hazardProtection: Record<string, number>;
  /** Extended stat buffs from modules/accessories */
  bonuses: Record<string, number>;
}

/**
 * Derive effective stats from equipment.
 * Resolves all 'on_equip' and 'passive' effects from equipped items.
 *
 * Pure function - no DB calls, no side effects.
 * Must be called with the server's authoritative equipment state.
 *
 * @param equipment - Equipment from InventoryService (server-authoritative)
 */
export function effectiveStats(equipment: EquipmentJson): ComputedStats {
  const stats: ComputedStats = {
    armor: 0,
    speedMultiplier: 1.0,
    hazardResistance: 0,
    detectionRange: 0,
    energyCapacity: 100, // base
    rechargeRate: 1.0,
    jumpHeight: 1.0,
    hazardProtection: {},
    bonuses: {},
  };

  // Collect all equipped items
  const equippedItems: InventoryItemJson[] = [
    equipment.exosuit,
    ...equipment.modules,
    equipment.tool,
    equipment.accessory1,
    equipment.accessory2,
  ].filter((item): item is InventoryItemJson => item !== undefined);

  for (const equippedItem of equippedItems) {
    const itemDef = ItemRegistry.get(equippedItem.itemId);
    if (!itemDef) continue; // Skip unknown items gracefully

    // Resolve on_equip effects
    const equipEffects = resolveEffectsForTrigger(itemDef.effects, 'on_equip');
    // Resolve passive effects
    const passiveEffects = resolveEffectsForTrigger(itemDef.effects, 'passive');
    const allEffects = [...equipEffects, ...passiveEffects];

    for (const effect of allEffects) {
      for (const [stat, value] of Object.entries(effect.applied)) {
        switch (stat) {
          case 'armor':
            stats.armor += value;
            break;
          case 'speedMultiplier':
            stats.speedMultiplier *= value; // Multiplicative
            break;
          case 'hazardResistance':
            stats.hazardResistance += value;
            break;
          case 'detectionRange':
            stats.detectionRange += value;
            break;
          case 'energyCapacity':
            stats.energyCapacity += value;
            break;
          case 'rechargeRate':
            stats.rechargeRate += value;
            break;
          case 'jumpHeight':
            stats.jumpHeight += value;
            break;
          default:
            // Per-type hazard protection (e.g., hazardProtection_chemical)
            if (stat.startsWith('hazardProtection_')) {
              const hazardType = stat.replace('hazardProtection_', '');
              stats.hazardProtection[hazardType] = (stats.hazardProtection[hazardType] ?? 0) + value;
            } else {
              // Stat buff or unknown - accumulate in bonuses
              stats.bonuses[stat] = (stats.bonuses[stat] ?? 0) + value;
            }
        }
      }
    }
  }

  return stats;
}
