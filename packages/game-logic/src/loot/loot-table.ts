import type { HarvestYield } from '@into-the-void/shared-types';
import type { InventoryItemJson } from '@into-the-void/database';

/**
 * Roll a loot table from a set of HarvestYield entries.
 *
 * Each entry is evaluated independently — multiple items can drop in one roll.
 * Quantity is uniformly distributed between [minAmount, maxAmount].
 *
 * @param multiplier - Optional yield multiplier affecting both drop chance and quantity
 * Pure function: no side effects, deterministic given a fixed Math.random seed.
 */
export function rollLootTable(
  entries: readonly HarvestYield[],
  multiplier: number = 1.0,
): InventoryItemJson[] {
  const results: InventoryItemJson[] = [];
  for (const entry of entries) {
    // Apply multiplier to drop chance (capped at 1.0)
    const adjustedChance = Math.min(1.0, entry.chance * multiplier);
    if (Math.random() < adjustedChance) {
      // Apply multiplier to quantity (minimum 1)
      const baseQty =
        entry.minAmount +
        Math.floor(Math.random() * (entry.maxAmount - entry.minAmount + 1));
      const qty = Math.max(1, Math.floor(baseQty * multiplier));
      results.push({
        instanceId: crypto.randomUUID(),
        itemId: entry.itemId,
        quantity: qty,
        slot: -1,
        properties: {},
      });
    }
  }
  return results;
}
