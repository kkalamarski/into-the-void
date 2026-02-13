import { Entity, Position, PlayerPublic } from '@into-the-void/shared-types';

/**
 * Default visibility range (in tiles)
 */
export const DEFAULT_VISIBILITY_RANGE = 15;

/**
 * Maximum entities to send per player (performance limit)
 */
export const MAX_VISIBLE_ENTITIES = 20;

/**
 * Calculate squared distance (faster than sqrt for comparisons)
 */
function squaredDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

/**
 * Check if a position is visible from another position (same zone)
 */
export function isPositionVisible(
  from: Position,
  to: Position,
  range: number = DEFAULT_VISIBILITY_RANGE
): boolean {
  if (from.zoneId !== to.zoneId) {
    return false;
  }

  const distSquared = squaredDistance(from.x, from.y, to.x, to.y);
  return distSquared <= range * range;
}

/**
 * Get visible entities for a player
 * Filters entities by range and returns up to MAX_VISIBLE_ENTITIES
 */
export function getVisibleEntities(
  player: { position: Position },
  allEntities: Entity[],
  range: number = DEFAULT_VISIBILITY_RANGE
): Entity[] {
  const rangeSquared = range * range;

  // Filter entities in same zone and within range
  const visibleEntities = allEntities.filter((entity) => {
    if (!entity.active) return false;
    if (entity.position.zoneId !== player.position.zoneId) return false;

    const distSquared = squaredDistance(
      player.position.x,
      player.position.y,
      entity.position.x,
      entity.position.y
    );

    return distSquared <= rangeSquared;
  });

  // Sort by distance and take closest MAX_VISIBLE_ENTITIES
  if (visibleEntities.length > MAX_VISIBLE_ENTITIES) {
    visibleEntities.sort((a, b) => {
      const distA = squaredDistance(
        player.position.x,
        player.position.y,
        a.position.x,
        a.position.y
      );
      const distB = squaredDistance(
        player.position.x,
        player.position.y,
        b.position.x,
        b.position.y
      );
      return distA - distB;
    });

    return visibleEntities.slice(0, MAX_VISIBLE_ENTITIES);
  }

  return visibleEntities;
}

/**
 * Get visible players for a player
 */
export function getVisiblePlayers(
  player: { id: string; position: Position },
  allPlayers: PlayerPublic[],
  range: number = DEFAULT_VISIBILITY_RANGE
): PlayerPublic[] {
  const rangeSquared = range * range;

  return allPlayers.filter((other) => {
    // Don't include self
    if (other.id === player.id) return false;
    if (other.position.zoneId !== player.position.zoneId) return false;

    const distSquared = squaredDistance(
      player.position.x,
      player.position.y,
      other.position.x,
      other.position.y
    );

    return distSquared <= rangeSquared;
  });
}

/**
 * Get zones that should be subscribed to (3x3 around player's zone)
 */
export function getSubscribedZones(zoneId: string): string[] {
  const [, x, y] = zoneId.split('_').map(Number);
  const zones: string[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      zones.push(`z_${x + dx}_${y + dy}`);
    }
  }

  return zones;
}

/**
 * Check if player should receive updates for a zone
 */
export function shouldReceiveZoneUpdates(
  playerZoneId: string,
  updateZoneId: string
): boolean {
  const subscribedZones = getSubscribedZones(playerZoneId);
  return subscribedZones.includes(updateZoneId);
}

/**
 * Calculate perception range based on stats
 */
export function calculatePerceptionRange(
  baseRange: number,
  perceptionStat: number
): number {
  // Each point of perception adds 0.5 tiles of range
  const bonus = (perceptionStat - 10) * 0.5;
  return Math.max(5, baseRange + bonus);
}

/**
 * Get entities that entered or left visibility
 */
export function getVisibilityChanges(
  previousVisible: Set<string>,
  currentVisible: Entity[]
): { entered: Entity[]; left: string[] } {
  const currentIds = new Set(currentVisible.map((e) => e.id));

  const entered = currentVisible.filter((e) => !previousVisible.has(e.id));
  const left = Array.from(previousVisible).filter((id) => !currentIds.has(id));

  return { entered, left };
}
