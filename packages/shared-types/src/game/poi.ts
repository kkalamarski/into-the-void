/**
 * POI (Point of Interest) types and reward definitions
 */

/**
 * POI type constants
 */
export const POI_TYPES = ['anomaly', 'cache', 'landmark'] as const;
export type PoiType = typeof POI_TYPES[number];

/**
 * POI spawn location within a zone
 */
export interface PoiSpawn {
  /** Local zone X coordinate */
  x: number;
  /** Local zone Y coordinate */
  y: number;
  /** POI type */
  type: PoiType;
  /** Deterministic POI identifier */
  poiId: string;
  /** Biome this POI spawned in - use string to avoid circular import */
  biome: string;
}

/**
 * Discovery reward structure
 */
export interface DiscoveryReward {
  /** Experience points awarded */
  xp: number;
  /** Credits awarded */
  credits: number;
  /** Optional item rewards */
  items?: Array<{ itemId: string; quantity: number }>;
}

/**
 * Base reward configuration per POI type
 */
export const POI_BASE_REWARDS: Record<PoiType, { xp: number; credits: number; hasItemRoll: boolean }> = {
  anomaly: { xp: 100, credits: 50, hasItemRoll: false },
  cache: { xp: 50, credits: 100, hasItemRoll: true },
  landmark: { xp: 150, credits: 25, hasItemRoll: false },
};

/**
 * Biome tier multipliers for POI rewards
 * Higher-tier biomes provide more valuable discoveries
 */
export const BIOME_TIER_MULTIPLIERS: Record<string, number> = {
  void_plains: 1.0,
  fungal_forest: 1.0,
  miasma_marshes: 1.5,
  petrified_expanse: 1.5,
  volcanic_ridge: 2.5,
  crystal_caves: 2.5,
  frozen_expanse: 2.5,
  ancient_ruins: 3.5,
  toxic_wastes: 3.0,
  starfall_crater: 4.0,
};
