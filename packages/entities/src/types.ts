/**
 * Entity definition types for the packages/entities registry.
 *
 * Convention: lootTableId uses format 'loot_<entity_id>' for Phase 35 compatibility.
 */

import type { BiomeType, CreatureBehavior } from '@into-the-void/shared-types';

/** Entity class discriminator */
export type EntityClass = 'creature' | 'plant' | 'mineral' | 'artifact';

/** Base fields shared by all entity definitions */
export interface BaseEntityDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly entityClass: EntityClass;
  readonly biomes: readonly BiomeType[];
  readonly textureKey: string;
  readonly color: number; // Hex fallback color until sprite exists
  readonly lootTableId: string; // Forward reference to Phase 35 loot tables
}

/** Creature entity definition */
export interface CreatureDefinition extends BaseEntityDefinition {
  readonly entityClass: 'creature';
  readonly behavior: CreatureBehavior;
  readonly baseHealth: number;
  readonly levelRange: readonly [number, number];
  readonly baseXp: number;
  readonly respawnSeconds: number;
}

/** Harvest yield entry for plants and minerals */
export interface HarvestYield {
  readonly itemId: string;
  readonly minAmount: number;
  readonly maxAmount: number;
  readonly chance: number; // 0.0 to 1.0
}

/** Plant entity definition */
export interface PlantDefinition extends BaseEntityDefinition {
  readonly entityClass: 'plant';
  readonly harvestYield: readonly HarvestYield[];
  readonly respawnSeconds: number;
}

/** Mineral entity definition */
export interface MineralDefinition extends BaseEntityDefinition {
  readonly entityClass: 'mineral';
  readonly miningYield: readonly HarvestYield[];
  readonly requiredTier: 1 | 2 | 3 | 4;
  readonly respawnSeconds: number;
}

/**
 * Artifact entity definition.
 * Note: respawns is always false - artifacts are one-time discoveries.
 * This is enforced by ZonesService.createEntityFromSpawn() in Phase 34.
 */
export interface ArtifactDefinition extends BaseEntityDefinition {
  readonly entityClass: 'artifact';
  readonly respawns: false;
  readonly rarity: 'rare' | 'epic' | 'exotic' | 'legendary';
}

/** Discriminated union of all entity definitions */
export type EntityDefinition =
  | CreatureDefinition
  | PlantDefinition
  | MineralDefinition
  | ArtifactDefinition;
