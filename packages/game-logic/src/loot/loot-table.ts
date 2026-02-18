import type { HarvestYield } from '@into-the-void/entities';
import type { InventoryItemJson } from '@into-the-void/database';

/**
 * Roll a loot table from a set of HarvestYield entries.
 *
 * Each entry is evaluated independently — multiple items can drop in one roll.
 * Quantity is uniformly distributed between [minAmount, maxAmount].
 *
 * Pure function: no side effects, deterministic given a fixed Math.random seed.
 */
export function rollLootTable(entries: readonly HarvestYield[]): InventoryItemJson[] {
  const results: InventoryItemJson[] = [];
  for (const entry of entries) {
    if (Math.random() < entry.chance) {
      const qty =
        entry.minAmount +
        Math.floor(Math.random() * (entry.maxAmount - entry.minAmount + 1));
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
