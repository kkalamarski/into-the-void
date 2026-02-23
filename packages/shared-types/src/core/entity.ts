import { Position } from './position';

/**
 * Rarity tier for resource nodes (minerals and plants).
 * Affects spawn rates and yield multipliers.
 * - common: standard resources (default if undefined)
 * - rare: higher yield, slower respawn, often found in dangerous areas
 * - epic: exceptional yield, very slow respawn, high-tier zones only
 */
export type NodeRarity = 'common' | 'rare' | 'epic';

/**
 * Types of entities in the game world
 */
export type EntityType =
  | 'player'
  | 'creature'
  | 'mineral'
  | 'plant'      // NEW - harvestable flora
  | 'artifact'   // NEW - one-time discoverable
  | 'structure'
  | 'item'
  | 'npc';

/**
 * Base entity interface
 */
export interface Entity {
  /** Unique entity identifier */
  id: string;
  /** Type of entity */
  type: EntityType;
  /** Current position */
  position: Position;
  /** Entity name/label */
  name: string;
  /** Whether the entity is currently active */
  active: boolean;
}

/**
 * Creature entity (hostile or passive mobs)
 */
export interface Creature extends Entity {
  type: 'creature';
  /** Species identifier */
  speciesId: string;
  /** Current health */
  health: number;
  /** Maximum health */
  maxHealth: number;
  /** Combat level */
  level: number;
  /** Behavior type */
  behavior: CreatureBehavior;
  /** Original spawn coordinates for leash calculation */
  spawnPosition?: { x: number; y: number };
  /** The playerId this creature is currently targeting in combat */
  combatTarget?: string;
  /** For omnivores: set to true when a player attacks them, triggering retaliation */
  provoked?: boolean;
}

/**
 * Creature behavior patterns (lore-correct classifications)
 */
export type CreatureBehavior = 'herbivore' | 'omnivore' | 'predator' | 'maniac';

/**
 * Mineral/resource node entity
 */
export interface Mineral extends Entity {
  type: 'mineral';
  /** Resource type identifier */
  resourceId: string;
  /** Remaining yield */
  yield: number;
  /** Maximum yield */
  maxYield: number;
  /** Required tool tier to harvest */
  requiredTier: number;
  /** Rarity tier (defaults to 'common' if undefined) */
  rarity?: NodeRarity;
}

/**
 * Plant entity (harvestable flora)
 */
export interface Plant extends Entity {
  type: 'plant';
  /** Plant species identifier */
  speciesId: string;
  /** Current yield remaining */
  yield: number;
  /** Maximum yield */
  maxYield: number;
  /** Rarity tier (defaults to 'common' if undefined) */
  rarity?: NodeRarity;
}

/**
 * Artifact entity (one-time discoverable)
 */
export interface Artifact extends Entity {
  type: 'artifact';
  /** Artifact identifier */
  artifactId: string;
  /** Rarity tier */
  rarity: 'rare' | 'epic' | 'exotic' | 'legendary';
}

/**
 * Structure entity (player-built or world structures)
 */
export interface Structure extends Entity {
  type: 'structure';
  /** Structure type identifier */
  structureId: string;
  /** Owner character ID (null for world structures) */
  ownerId: string | null;
  /** Structure health/durability */
  durability: number;
  /** Maximum durability */
  maxDurability: number;
}

/**
 * Ground item entity
 */
export interface ItemEntity extends Entity {
  type: 'item';
  /** Item type identifier */
  itemId: string;
  /** Stack quantity */
  quantity: number;
  /** Time when item will despawn */
  despawnAt: number;
}

/**
 * NPC entity (non-player characters in hubs)
 */
export interface Npc extends Entity {
  type: 'npc';
  /** NPC definition ID from NpcRegistry */
  npcId: string;
  /** NPC type from definition */
  npcType: 'trader' | 'guard' | 'faction_rep' | 'ambient' | 'service';
  /** Faction affiliation */
  faction: 'verdant' | 'helix' | 'nexus' | 'neutral';
}
