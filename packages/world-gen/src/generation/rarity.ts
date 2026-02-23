import { SpawnPoint, CreatureBehavior } from '@into-the-void/shared-types';
import { EntityRegistry } from '@into-the-void/entities';
import type { CreatureDefinition } from '@into-the-void/entities';

/**
 * Configuration for rare node spawn probability
 */
export const RARE_SPAWN_CONFIG = {
  /** Base chance for rare node to spawn (5%) */
  baseRareChance: 0.05,
  /** Base chance for epic node to spawn (1%) */
  baseEpicChance: 0.01,
  /** Distance in tiles for proximity bonus */
  proximityRange: 10,
  /** Multiplier applied at zero distance from dangerous creature */
  proximityMultiplier: 3.0,
  /** Maximum rare nodes per chunk */
  maxRarePerChunk: 3,
  /** Maximum epic nodes per chunk */
  maxEpicPerChunk: 1,
} as const;

/**
 * Check if a creature behavior is dangerous (grants proximity bonus)
 */
function isDangerousBehavior(behavior: CreatureBehavior): boolean {
  return behavior === 'predator' || behavior === 'maniac';
}

/**
 * Calculate rarity spawn weight based on proximity to dangerous creatures.
 *
 * @param position - Position to check (local chunk coords)
 * @param creatureSpawns - Already-spawned creatures in chunk
 * @param tier - 'rare' or 'epic' to determine base chance
 * @returns Probability (0-1) that a rare/epic node should spawn here
 */
export function calculateRarityWeight(
  position: { x: number; y: number },
  creatureSpawns: SpawnPoint[],
  tier: 'rare' | 'epic' = 'rare'
): number {
  const baseChance = tier === 'epic'
    ? RARE_SPAWN_CONFIG.baseEpicChance
    : RARE_SPAWN_CONFIG.baseRareChance;

  let weight = baseChance;

  // Sort creature spawns by position for deterministic results
  const sortedCreatures = [...creatureSpawns]
    .filter(sp => sp.entityType === 'creature')
    .sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

  for (const creature of sortedCreatures) {
    // Get creature definition to check behavior
    const def = EntityRegistry.get(creature.spawnId);
    if (!def || def.entityClass !== 'creature') continue;

    const creatureDef = def as CreatureDefinition;
    if (!isDangerousBehavior(creatureDef.behavior)) continue;

    const distance = Math.hypot(
      position.x - creature.x,
      position.y - creature.y
    );

    if (distance <= RARE_SPAWN_CONFIG.proximityRange) {
      // Linear falloff: full multiplier at zero distance, 1x at max range
      const falloff = 1 - (distance / RARE_SPAWN_CONFIG.proximityRange);
      const bonus = (RARE_SPAWN_CONFIG.proximityMultiplier - 1) * falloff;
      weight *= (1 + bonus);
    }
  }

  // Cap at 50% to prevent guaranteed rare spawns
  return Math.min(weight, 0.5);
}

/**
 * Get rare mineral IDs for a biome
 */
export function getRareBiomeMinerals(biome: string): string[] {
  // Map biomes to their rare mineral variants
  const biomeRareMinerals: Record<string, string[]> = {
    void_plains: ['mineral_void_crystal_rare'],
    crystal_caves: ['mineral_prismatic_crystal_rare'],
    volcanic_ridge: ['mineral_volcanic_ore_rare'],
    starfall_crater: ['mineral_cosmic_fragment_rare'],
    ancient_ruins: ['mineral_anomaly_crystal_epic'],
    // Other biomes use base minerals (no rare variants yet)
  };

  return biomeRareMinerals[biome] ?? [];
}

/**
 * Get epic mineral IDs for a biome
 */
export function getEpicBiomeMinerals(biome: string): string[] {
  const biomeEpicMinerals: Record<string, string[]> = {
    ancient_ruins: ['mineral_anomaly_crystal_epic'],
    starfall_crater: ['mineral_cosmic_fragment_rare'], // Use rare as fallback for epic tier
  };

  return biomeEpicMinerals[biome] ?? [];
}
