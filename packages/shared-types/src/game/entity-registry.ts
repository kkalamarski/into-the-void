import { CreatureBehavior } from '../core/entity';

/**
 * Creature configuration
 */
export interface CreatureConfig {
  /** Unique species identifier */
  id: string;
  /** Display name */
  name: string;
  /** Base health */
  baseHealth: number;
  /** Combat level range [min, max] */
  levelRange: [number, number];
  /** Behavior type */
  behavior: CreatureBehavior;
  /** Texture key for rendering */
  textureKey: string;
  /** Biomes this creature spawns in */
  biomes: string[];
}

/**
 * Mineral/resource configuration
 */
export interface MineralConfig {
  /** Unique resource identifier */
  id: string;
  /** Display name */
  name: string;
  /** Base yield amount */
  baseYield: number;
  /** Required tool tier to harvest (1-4) */
  requiredTier: number;
  /** Texture key for rendering */
  textureKey: string;
  /** Biomes this mineral spawns in */
  biomes: string[];
}

/**
 * Item configuration
 */
export interface ItemConfig {
  /** Unique item identifier */
  id: string;
  /** Display name */
  name: string;
  /** Maximum stack size */
  maxStack: number;
  /** Item rarity tier (1-4) */
  rarity: number;
  /** Texture key for rendering */
  textureKey: string;
}

/**
 * Entity registry - static game data
 */
export const EntityRegistry = {
  creatures: {
    'void_crawler': {
      id: 'void_crawler',
      name: 'Void Crawler',
      baseHealth: 50,
      levelRange: [1, 5] as [number, number],
      behavior: 'passive' as CreatureBehavior,
      textureKey: 'creature',
      biomes: ['void_plains'],
    },
    'crystal_hound': {
      id: 'crystal_hound',
      name: 'Crystal Hound',
      baseHealth: 80,
      levelRange: [3, 8] as [number, number],
      behavior: 'neutral' as CreatureBehavior,
      textureKey: 'creature',
      biomes: ['crystal_caves'],
    },
    'acid_stalker': {
      id: 'acid_stalker',
      name: 'Acid Stalker',
      baseHealth: 120,
      levelRange: [5, 12] as [number, number],
      behavior: 'aggressive' as CreatureBehavior,
      textureKey: 'creature',
      biomes: ['toxic_wastes'],
    },
    'ancient_guardian': {
      id: 'ancient_guardian',
      name: 'Ancient Guardian',
      baseHealth: 200,
      levelRange: [10, 20] as [number, number],
      behavior: 'defensive' as CreatureBehavior,
      textureKey: 'creature',
      biomes: ['ancient_ruins'],
    },
  } as Record<string, CreatureConfig>,

  minerals: {
    'void_stone': {
      id: 'void_stone',
      name: 'Void Stone',
      baseYield: 5,
      requiredTier: 1,
      textureKey: 'mineral',
      biomes: ['void_plains'],
    },
    'crystal_shard': {
      id: 'crystal_shard',
      name: 'Crystal Shard',
      baseYield: 3,
      requiredTier: 2,
      textureKey: 'mineral',
      biomes: ['crystal_caves'],
    },
    'volcanic_ore': {
      id: 'volcanic_ore',
      name: 'Volcanic Ore',
      baseYield: 4,
      requiredTier: 3,
      textureKey: 'mineral',
      biomes: ['volcanic_ridge'],
    },
    'ancient_fragment': {
      id: 'ancient_fragment',
      name: 'Ancient Fragment',
      baseYield: 2,
      requiredTier: 4,
      textureKey: 'mineral',
      biomes: ['ancient_ruins'],
    },
  } as Record<string, MineralConfig>,

  items: {
    'health_vial': {
      id: 'health_vial',
      name: 'Health Vial',
      maxStack: 20,
      rarity: 1,
      textureKey: 'item',
    },
    'energy_cell': {
      id: 'energy_cell',
      name: 'Energy Cell',
      maxStack: 20,
      rarity: 1,
      textureKey: 'item',
    },
    'void_essence': {
      id: 'void_essence',
      name: 'Void Essence',
      maxStack: 10,
      rarity: 2,
      textureKey: 'item',
    },
    'ancient_key': {
      id: 'ancient_key',
      name: 'Ancient Key',
      maxStack: 1,
      rarity: 4,
      textureKey: 'item',
    },
  } as Record<string, ItemConfig>,

  /**
   * Get creature config by species ID
   */
  getCreature(speciesId: string): CreatureConfig | undefined {
    return this.creatures[speciesId];
  },

  /**
   * Get mineral config by resource ID
   */
  getMineral(resourceId: string): MineralConfig | undefined {
    return this.minerals[resourceId];
  },

  /**
   * Get item config by item ID
   */
  getItem(itemId: string): ItemConfig | undefined {
    return this.items[itemId];
  },
};
