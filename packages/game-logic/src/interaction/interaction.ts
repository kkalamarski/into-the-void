import {
  Entity,
  Player,
  Position,
  EntityType,
  Creature,
  Mineral,
  ItemEntity,
} from '@into-the-void/shared-types';
import { manhattanDistance } from '../movement/pathfinding';

/**
 * Interaction types
 */
export type InteractionType =
  | 'attack'
  | 'harvest'
  | 'pickup'
  | 'talk'
  | 'examine'
  | 'use';

/**
 * Interaction result
 */
export interface InteractionResult {
  success: boolean;
  type: InteractionType;
  message?: string;
  data?: unknown;
}

/**
 * Default interaction range (in tiles)
 */
export const DEFAULT_INTERACTION_RANGE = 1;

/**
 * Check if player can interact with an entity
 */
export function canInteract(
  player: Player,
  entity: Entity,
  range: number = DEFAULT_INTERACTION_RANGE
): { canInteract: boolean; reason?: string } {
  // Must be in same zone
  if (player.position.zoneId !== entity.position.zoneId) {
    return { canInteract: false, reason: 'Entity is in a different zone' };
  }

  // Check range
  const distance = manhattanDistance(
    player.position.x,
    player.position.y,
    entity.position.x,
    entity.position.y
  );

  // Add 1.0 buffer to account for diagonal movement where Manhattan distance = 2
  // but visual distance is ~1.41 tiles. This allows range 1 to hit diagonally adjacent.
  if (distance > range + 1.0) {
    return { canInteract: false, reason: 'Entity is too far away' };
  }

  // Check if entity is active
  if (!entity.active) {
    return { canInteract: false, reason: 'Entity is not active' };
  }

  return { canInteract: true };
}

/**
 * Get available interactions for an entity
 */
export function getAvailableInteractions(
  player: Player,
  entity: Entity
): InteractionType[] {
  const interactions: InteractionType[] = ['examine'];

  switch (entity.type) {
    case 'creature':
      interactions.push('attack');
      break;
    case 'mineral':
      interactions.push('harvest');
      break;
    case 'item':
      interactions.push('pickup');
      break;
    case 'npc':
      interactions.push('talk');
      break;
    case 'structure':
      interactions.push('use');
      break;
  }

  return interactions;
}

/**
 * Get default interaction for an entity type
 */
export function getDefaultInteraction(entityType: EntityType): InteractionType {
  switch (entityType) {
    case 'creature':
      return 'attack';
    case 'mineral':
      return 'harvest';
    case 'item':
      return 'pickup';
    case 'npc':
      return 'talk';
    case 'structure':
      return 'use';
    default:
      return 'examine';
  }
}

/**
 * Check if player can harvest a mineral
 */
export function canHarvest(
  player: Player,
  mineral: Mineral,
  toolTier: number
): { canHarvest: boolean; reason?: string } {
  if (mineral.yield <= 0) {
    return { canHarvest: false, reason: 'Resource is depleted' };
  }

  if (toolTier < mineral.requiredTier) {
    return {
      canHarvest: false,
      reason: `Requires tier ${mineral.requiredTier} tool`,
    };
  }

  return { canHarvest: true };
}

/**
 * Check if player can pickup an item
 */
export function canPickup(
  player: Player,
  item: ItemEntity,
  inventorySlots: number,
  usedSlots: number
): { canPickup: boolean; reason?: string } {
  if (usedSlots >= inventorySlots) {
    return { canPickup: false, reason: 'Inventory is full' };
  }

  // Check if item has despawned
  if (Date.now() > item.despawnAt) {
    return { canPickup: false, reason: 'Item has despawned' };
  }

  return { canPickup: true };
}

/**
 * INTR-07: Level gating check.
 * Returns false if entity level exceeds player level by more than 5.
 * Only applies to creatures (minerals, plants, artifacts have no level).
 */
export function canInteractLevel(playerLevel: number, entityLevel: number): boolean {
  return entityLevel <= playerLevel + 5;
}

/**
 * Check if player can attack a creature
 */
export function canAttack(
  player: Player,
  creature: Creature
): { canAttack: boolean; reason?: string } {
  if (creature.health <= 0) {
    return { canAttack: false, reason: 'Creature is already dead' };
  }

  // Players in combat can only attack combat participants
  if (player.inCombat) {
    // This would need combat state to validate
    return { canAttack: true };
  }

  return { canAttack: true };
}

/**
 * Get entities within interaction range
 */
export function getEntitiesInRange(
  position: Position,
  entities: Entity[],
  range: number = DEFAULT_INTERACTION_RANGE
): Entity[] {
  return entities.filter((entity) => {
    if (entity.position.zoneId !== position.zoneId) {
      return false;
    }

    const distance = manhattanDistance(
      position.x,
      position.y,
      entity.position.x,
      entity.position.y
    );

    // Add 1.0 buffer to account for diagonal movement
    return distance <= range + 1.0;
  });
}
