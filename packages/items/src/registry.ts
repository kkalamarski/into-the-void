import type { ItemDefinition, ItemCategory, ItemRarity } from './types';

/**
 * Fallback item for unknown IDs - prevents crashes
 */
const UNKNOWN_ITEM: ItemDefinition = {
  id: 'unknown',
  displayName: 'Unknown Item',
  description: 'Unknown item. This should not appear in normal gameplay.',
  category: 'reagent',
  rarity: 'common',
  maxStack: 1,
  weight: 0,
  baseValue: 0,
  requiredLevel: 1,
  ilvl: 0,
  textureKey: 'item_unknown',
  color: 0xff00ff, // Magenta - obvious error color
};

/**
 * Item registry - singleton for item lookups
 */
class ItemRegistryImpl {
  private readonly items: Map<string, ItemDefinition> = new Map();

  /**
   * Register an item definition
   * @internal Used during static initialization
   */
  register(item: ItemDefinition): void {
    if (this.items.has(item.id)) {
      console.warn(`Item ID "${item.id}" already registered, overwriting`);
    }
    this.items.set(item.id, item);
  }

  /**
   * Register multiple item definitions
   * @internal Used during static initialization
   */
  registerAll(items: readonly ItemDefinition[]): void {
    for (const item of items) {
      this.register(item);
    }
  }

  /**
   * Get item definition by ID
   * Returns fallback 'unknown' item with console warning if not found
   */
  get(id: string): ItemDefinition {
    const item = this.items.get(id);
    if (!item) {
      console.warn(`Unknown item ID: "${id}", using fallback`);
      return UNKNOWN_ITEM;
    }
    return item;
  }

  /**
   * Check if item ID exists without triggering fallback
   */
  has(id: string): boolean {
    return this.items.has(id);
  }

  /**
   * Get all registered item IDs
   */
  getAllIds(): string[] {
    return Array.from(this.items.keys());
  }

  /**
   * Get all items in a specific category
   */
  getByCategory(category: ItemCategory): ItemDefinition[] {
    return Array.from(this.items.values()).filter(i => i.category === category);
  }

  /**
   * Get all items of a specific rarity
   */
  getByRarity(rarity: ItemRarity): ItemDefinition[] {
    return Array.from(this.items.values()).filter(i => i.rarity === rarity);
  }

  /**
   * Get count of registered items
   */
  get size(): number {
    return this.items.size;
  }
}

/** Singleton registry instance */
export const ItemRegistry = new ItemRegistryImpl();
