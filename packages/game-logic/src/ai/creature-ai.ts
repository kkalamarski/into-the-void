import { Creature, PlayerPublic, Position, ZONE_SIZE } from '@into-the-void/shared-types';
import { DIRECTION_VECTORS } from '../movement/validation';
import { chebyshevDistance } from '../movement/pathfinding';

const FLEE_RADIUS = 5;
const WANDER_CHANCE = 0.25;

/**
 * Result of a creature AI tick — pure data, no side effects
 */
export interface AiTickResult {
  /** null means the creature did not move this tick */
  newPosition: Position | null;
}

/**
 * Pure FSM function: compute creature movement decision for one tick.
 * No mutations, no I/O — callers apply the result.
 */
export function tickCreatureAI(
  creature: Creature,
  players: PlayerPublic[],
  collisionMap: boolean[][],
): AiTickResult {
  if (!creature.active || creature.health <= 0) {
    return { newPosition: null };
  }

  switch (creature.behavior) {
    case 'herbivore':
      return tickHerbivore(creature, players, collisionMap);
    case 'omnivore':
    case 'predator':
    case 'maniac':
      return tickWander(creature, collisionMap);
  }
}

/**
 * Herbivore behavior: flee from nearby players, otherwise wander
 */
function tickHerbivore(
  creature: Creature,
  players: PlayerPublic[],
  collisionMap: boolean[][],
): AiTickResult {
  const nearbyPlayers = players
    .map((p) => ({
      player: p,
      dist: chebyshevDistance(
        creature.position.x,
        creature.position.y,
        p.position.x,
        p.position.y,
      ),
    }))
    .filter(({ dist }) => dist <= FLEE_RADIUS)
    .sort((a, b) => a.dist - b.dist);

  if (nearbyPlayers.length > 0) {
    return flee(creature, nearbyPlayers[0].player, collisionMap);
  }

  return tickWander(creature, collisionMap);
}

/**
 * Flee directly away from a player, trying fallback directions if blocked
 */
function flee(
  creature: Creature,
  player: PlayerPublic,
  collisionMap: boolean[][],
): AiTickResult {
  const rawDx = creature.position.x - player.position.x;
  const rawDy = creature.position.y - player.position.y;
  const dx = rawDx === 0 ? 0 : rawDx > 0 ? 1 : -1;
  const dy = rawDy === 0 ? 0 : rawDy > 0 ? 1 : -1;

  const attempts = [
    { dx, dy },
    { dx, dy: 0 },
    { dx: 0, dy },
    { dx: -dx, dy: 0 }, // last-resort: partial backtrack
    { dx: 0, dy: -dy },
  ];

  for (const { dx: fdx, dy: fdy } of attempts) {
    if (fdx === 0 && fdy === 0) {
      continue;
    }
    const nx = creature.position.x + fdx;
    const ny = creature.position.y + fdy;
    if (nx >= 0 && nx < ZONE_SIZE && ny >= 0 && ny < ZONE_SIZE && !collisionMap[ny]?.[nx]) {
      return { newPosition: { ...creature.position, x: nx, y: ny } };
    }
  }

  return { newPosition: null }; // cornered
}

/**
 * Random idle wander: 25% chance to move in a random passable direction
 */
function tickWander(creature: Creature, collisionMap: boolean[][]): AiTickResult {
  if (Math.random() > WANDER_CHANCE) {
    return { newPosition: null };
  }

  const dirs = Object.values(DIRECTION_VECTORS);
  const shuffled = [...dirs].sort(() => Math.random() - 0.5);

  for (const { dx, dy } of shuffled) {
    const nx = creature.position.x + dx;
    const ny = creature.position.y + dy;
    if (nx >= 0 && nx < ZONE_SIZE && ny >= 0 && ny < ZONE_SIZE && !collisionMap[ny]?.[nx]) {
      return { newPosition: { ...creature.position, x: nx, y: ny } };
    }
  }

  return { newPosition: null };
}
