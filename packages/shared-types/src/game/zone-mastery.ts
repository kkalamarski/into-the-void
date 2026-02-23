import type { BiomeType } from './biome';

/**
 * Mastery tier progression (sequential: Bronze -> Silver -> Gold)
 */
export const MASTERY_TIERS = ['bronze', 'silver', 'gold'] as const;
export type MasteryTier = typeof MASTERY_TIERS[number];

/**
 * Zone mastery objective types
 */
export type MasteryObjectiveType = 'discover_pois' | 'gather_resources' | 'kill_creatures';

/**
 * Zone mastery objective progress
 */
export interface ZoneMasteryObjective {
  objectiveType: MasteryObjectiveType;
  description: string;
  current: number;
  required: number;
  complete: boolean;
}

/**
 * Zone mastery progress for a specific biome and tier
 */
export interface ZoneMasteryProgress {
  biome: BiomeType | string;
  tier: MasteryTier;
  objectives: ZoneMasteryObjective[];
  completedAt?: number;
}

/**
 * Mastery tier requirements per biome tier
 * Higher biome tiers have higher requirements
 */
export const MASTERY_TIER_REQUIREMENTS: Record<MasteryTier, {
  pois: number;
  resources: number;
  kills: number;
}> = {
  bronze: { pois: 3, resources: 10, kills: 5 },
  silver: { pois: 7, resources: 30, kills: 15 },
  gold: { pois: 15, resources: 75, kills: 40 },
};

/**
 * Mastery reward types
 */
export type MasteryRewardType = 'title' | 'cosmetic' | 'bonus';

/**
 * Mastery completion reward
 */
export interface MasteryReward {
  rewardType: MasteryRewardType;
  rewardId: string;
  displayName: string;
}
