import type { InventoryItem } from './inventory';

/**
 * Personal storage state for a character.
 * Backed by the player_storage DB table, separate from inventory.
 */
export interface PersonalStorage {
  characterId: string;
  items: InventoryItem[];
  maxSlots: number;
}
