/**
 * Lore fragment categories
 */
export const LORE_CATEGORIES = ['world_history', 'faction_lore', 'ancient_tech', 'biome_ecology'] as const;
export type LoreCategory = typeof LORE_CATEGORIES[number];

/**
 * Lore fragment definition - a collectible data log entry
 */
export interface LoreFragment {
  /** Unique lore ID (e.g., 'lore_world_collapse_01') */
  id: string;
  /** Display title in codex */
  title: string;
  /** Full lore text content (200-500 words) */
  content: string;
  /** Category for codex organization */
  category: LoreCategory;
  /** Optional biome association (where fragment spawns) */
  biome?: string;
  /** Discovery XP reward */
  xpReward: number;
}

/**
 * Collected lore state for client
 */
export interface CollectedLoreEntry {
  loreId: string;
  collectedAt: number;
  isRead: boolean;
}
