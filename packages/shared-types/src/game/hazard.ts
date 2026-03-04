import type { BiomeType, BiomeTier } from './biome';
import type { CharacterStats } from '../core/player';

/**
 * Hazard type classification — 5 environmental hazard groups
 * covering all Tier II-IV biomes on Terminus.
 */
export type HazardType = 'chemical' | 'thermal' | 'physical' | 'biological' | 'anomalous';

/**
 * Configuration for a hazard group — shared properties across
 * all biomes of the same hazard type.
 */
export interface HazardGroup {
  readonly type: HazardType;
  readonly displayName: string;
  /** Hex color for HUD indicator */
  readonly color: string;
  /** Which CharacterStat is debuffed (or 'all' for anomalous) */
  readonly debuffStat: keyof CharacterStats | 'all';
  /** Base debuff percentage (e.g., 0.20 = 20% reduction) */
  readonly debuffPercent: number;
}

/**
 * Per-biome hazard configuration — defines severity and tick behavior.
 */
export interface HazardConfig {
  readonly hazardType: HazardType;
  readonly tier: BiomeTier;
  /** HP drain per tick as fraction of max HP (0 for Tier II = debuff only) */
  readonly hpDrainPercent: number;
  /** Milliseconds between hazard damage ticks */
  readonly tickIntervalMs: number;
  /** Milliseconds of grace period on first entering a hazard zone */
  readonly gracePeriodMs: number;
  /** Whether hazard effects escalate the longer a player stays (Tier IV only) */
  readonly stacksOverTime: boolean;
  /** Milliseconds between stack increases (Tier IV only) */
  readonly stackIntervalMs?: number;
  /** Additional debuff % per stack (Tier IV only) */
  readonly stackDebuffIncrease?: number;
}

/**
 * Per-player runtime hazard state — maintained in-memory by HazardService.
 * Updated on biome entry and equipment change.
 */
export interface HazardState {
  readonly playerId: string;
  readonly hazardType: HazardType;
  readonly config: HazardConfig;
  /** Timestamp when player entered the hazard zone */
  readonly enteredAt: number;
  /** Timestamp of last damage tick applied */
  readonly lastTickAt: number;
  /** Total protection percentage from gear + consumables (0-100) */
  readonly protectionPercent: number;
  /** Current stack count for Tier IV escalation */
  readonly stackCount: number;
  /** Timestamp of last stack increase */
  readonly lastStackAt: number;
}

/**
 * Hazard group definitions — strategic stat debuffs per group.
 *
 * Design rationale (from CONTEXT.md):
 * - Chemical: perception (toxic fumes impair sensors)
 * - Thermal: haste (extreme temperature slows reaction time)
 * - Physical: toughness (crystal/stone shards bypass armor weak points)
 * - Biological: recovery (spores suppress regeneration)
 * - Anomalous: all stats (reality distortion affects everything)
 */
export const HAZARD_GROUPS: Record<HazardType, HazardGroup> = {
  chemical: {
    type: 'chemical',
    displayName: 'Chemical Hazard',
    color: '#88cc44',
    debuffStat: 'perception',
    debuffPercent: 0.20,
  },
  thermal: {
    type: 'thermal',
    displayName: 'Thermal Hazard',
    color: '#ff4500',
    debuffStat: 'haste',
    debuffPercent: 0.20,
  },
  physical: {
    type: 'physical',
    displayName: 'Physical Hazard',
    color: '#4488ff',
    debuffStat: 'toughness',
    debuffPercent: 0.20,
  },
  biological: {
    type: 'biological',
    displayName: 'Biological Hazard',
    color: '#9370db',
    debuffStat: 'recovery',
    debuffPercent: 0.20,
  },
  anomalous: {
    type: 'anomalous',
    displayName: 'Anomalous Hazard',
    color: '#4a0080',
    debuffStat: 'all',
    debuffPercent: 0.15,
  },
};

/** Quick color lookup by hazard type */
export const HAZARD_GROUP_COLORS: Record<HazardType, string> = {
  chemical: '#88cc44',
  thermal: '#ff4500',
  physical: '#4488ff',
  biological: '#9370db',
  anomalous: '#4a0080',
};

/** Quick debuff stat lookup by hazard type */
export const HAZARD_DEBUFF_STATS: Record<HazardType, keyof CharacterStats | 'all'> = {
  chemical: 'perception',
  thermal: 'haste',
  physical: 'toughness',
  biological: 'recovery',
  anomalous: 'all',
};

/**
 * Biome-to-hazard mapping — only Tier II-IV biomes are present.
 * Tier I biomes (void_plains, fungal_forest, tidal_pools, ancient_ruins)
 * are intentionally absent — they have no hazard effects.
 */
export const BIOME_HAZARD_MAP: Partial<Record<BiomeType, HazardConfig>> = {
  // ── Tier II: Stat debuff only (no HP drain) ──────────────────────
  toxic_wastes: {
    hazardType: 'chemical',
    tier: 2,
    hpDrainPercent: 0,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
  },
  miasma_marshes: {
    hazardType: 'chemical',
    tier: 2,
    hpDrainPercent: 0,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
  },
  petrified_expanse: {
    hazardType: 'physical',
    tier: 2,
    hpDrainPercent: 0,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
  },
  bioluminescent_depths: {
    hazardType: 'biological',
    tier: 2,
    hpDrainPercent: 0,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
  },
  kelp_forests: {
    hazardType: 'physical',
    tier: 2,
    hpDrainPercent: 0,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
  },

  // ── Tier III: HP drain + stat debuff ─────────────────────────────
  volcanic_ridge: {
    hazardType: 'thermal',
    tier: 3,
    hpDrainPercent: 0.08,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
  },
  crystal_caves: {
    hazardType: 'physical',
    tier: 3,
    hpDrainPercent: 0.08,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
  },
  crystalline_wastes: {
    hazardType: 'physical',
    tier: 3,
    hpDrainPercent: 0.08,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
  },
  frozen_expanse: {
    hazardType: 'thermal',
    tier: 3,
    hpDrainPercent: 0.08,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
  },
  deep_trenches: {
    hazardType: 'physical',
    tier: 3,
    hpDrainPercent: 0.08,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
  },
  starfall_crater: {
    hazardType: 'biological',
    tier: 3,
    hpDrainPercent: 0.08,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
  },

  // ── Tier IV: Stacking escalation ─────────────────────────────────
  void_rift: {
    hazardType: 'anomalous',
    tier: 4,
    hpDrainPercent: 0.08,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: true,
    stackIntervalMs: 30000,
    stackDebuffIncrease: 0.05,
  },
};
