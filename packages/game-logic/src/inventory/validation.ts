import type { ItemDefinition } from '@into-the-void/items';

/**
 * Result of validation operations
 */
export interface ValidateEquipResult {
  valid: boolean;
  reason?: string;
}

/**
 * Pure validation - can this player equip this item?
 *
 * Checks:
 * 1. Player level meets item requiredLevel
 * 2. For modules: suit has available slots
 *
 * No DB calls. No side effects. Mirrors validateMovement pattern.
 *
 * @param item - Item definition to equip
 * @param playerLevel - Current character level
 * @param currentModuleCount - Number of modules currently equipped
 * @param suitModuleSlots - Number of module slots on equipped suit (0 if no suit)
 */
export function validateEquip(
  item: ItemDefinition,
  playerLevel: number,
  currentModuleCount: number,
  suitModuleSlots: number
): ValidateEquipResult {
  // Check level requirement
  if (playerLevel < item.requiredLevel) {
    return {
      valid: false,
      reason: `Requires level ${item.requiredLevel}`,
    };
  }

  // Check module slot availability
  if (item.category === 'module') {
    if (suitModuleSlots === 0) {
      return {
        valid: false,
        reason: 'No suit equipped to hold modules',
      };
    }
    if (currentModuleCount >= suitModuleSlots) {
      return {
        valid: false,
        reason: 'All module slots are occupied',
      };
    }
  }

  // Check equippable category
  const equippableCategories = ['suit', 'module', 'tool'];
  if (!equippableCategories.includes(item.category)) {
    return {
      valid: false,
      reason: `${item.category} items cannot be equipped`,
    };
  }

  return { valid: true };
}

/**
 * Pure validation - can this player use this item from inventory?
 *
 * Checks:
 * 1. Item is consumable category
 * 2. Player level meets item requiredLevel
 *
 * No DB calls. No side effects.
 *
 * @param item - Item definition to use
 * @param playerLevel - Current character level
 */
export function validateItemUse(
  item: ItemDefinition,
  playerLevel: number
): ValidateEquipResult {
  // Only consumables can be "used"
  if (item.category !== 'consumable') {
    return {
      valid: false,
      reason: 'Item is not consumable',
    };
  }

  // Check level requirement
  if (playerLevel < item.requiredLevel) {
    return {
      valid: false,
      reason: `Requires level ${item.requiredLevel}`,
    };
  }

  // Check item has on_use effect
  const hasUseEffect = item.effects?.some(e => e.trigger === 'on_use');
  if (!hasUseEffect) {
    return {
      valid: false,
      reason: 'Item has no use effect',
    };
  }

  return { valid: true };
}

/**
 * Validate unequip operation
 *
 * Checks:
 * 1. Inventory has space for unequipped item
 *
 * @param inventoryCount - Current number of items in inventory
 * @param maxSlots - Maximum inventory slots
 */
export function validateUnequip(
  inventoryCount: number,
  maxSlots: number
): ValidateEquipResult {
  if (inventoryCount >= maxSlots) {
    return {
      valid: false,
      reason: 'Inventory is full',
    };
  }

  return { valid: true };
}
