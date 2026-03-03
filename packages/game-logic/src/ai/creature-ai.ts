import { Creature, PlayerPublic, Position, ZONE_SIZE } from '@into-the-void/shared-types';
import { DIRECTION_VECTORS } from '../movement/validation';
import { chebyshevDistance } from '../movement/pathfinding';

const FLEE_RADIUS = 5;
const WANDER_CHANCE = 0.25;
const AGGRO_RADIUS = 5;     // Tiles within which predator/maniac aggro
const LEASH_DISTANCE = 10;  // Max tiles from spawn before returning

/**
 * Result of a creature AI tick — pure data, no side effects
 */
export interface AiTickResult {
  /** null means the creature did not move this tick */
  newPosition: Position | null;
  /** For predator/maniac: playerId to initiate combat with (aggro triggered) */
  aggroTarget?: string;
  /** For combat: whether to attack current target */
  shouldAttack?: boolean;
  /** For leash: whether creature should return to spawn */
  shouldReturn?: boolean;
  /** Stampede signal — herbivore group flight path deals kinetic damage (Phase 119 CRAI-01) */
  stampede?: boolean;
  /** Pack Call signal — omnivore calls nearby allies when provoked (Phase 119 CRAI-02) */
  packCall?: boolean;
  /** Ambush signal — predator first-strike from stealth (Phase 119 CRAI-03) */
  ambush?: boolean;
  /** Frenzied signal — maniac below 30% HP, attack speed 2x, defense halved (Phase 119 CRAI-04) */
  frenzied?: boolean;
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
      return tickOmnivore(creature, players, collisionMap);
    case 'predator':
    case 'maniac':
      return tickPredator(creature, players, collisionMap);
  }
}

/**
 * Herbivore behavior: flee from attackers or nearby players, otherwise wander
 */
function tickHerbivore(
  creature: Creature,
  players: PlayerPublic[],
  collisionMap: boolean[][],
): AiTickResult {
  // If being attacked (has combatTarget set by server), prioritize fleeing from attacker
  if (creature.combatTarget) {
    const attacker = players.find(p => p.id === creature.combatTarget);
    if (attacker) {
      return flee(creature, attacker, collisionMap);
    }
  }

  // Otherwise flee from any nearby players
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
 * Omnivore behavior:
 * - If provoked (player attacked it): behave like predator
 * - If not provoked: just wander
 */
function tickOmnivore(
  creature: Creature,
  players: PlayerPublic[],
  collisionMap: boolean[][],
): AiTickResult {
  // If provoked, behave like predator
  if (creature.provoked) {
    return tickPredator(creature, players, collisionMap);
  }

  // Not provoked - just wander
  return tickWander(creature, collisionMap);
}

/**
 * Predator/maniac behavior:
 * - If has combatTarget: chase or attack
 * - If no target: scan for nearby players to aggro
 * - If too far from spawn: return to spawn
 */
function tickPredator(
  creature: Creature,
  players: PlayerPublic[],
  collisionMap: boolean[][],
): AiTickResult {
  // Check leash distance first
  if (creature.spawnPosition) {
    const distFromSpawn = chebyshevDistance(
      creature.position.x,
      creature.position.y,
      creature.spawnPosition.x,
      creature.spawnPosition.y,
    );

    // If at spawn and no target, just wander
    if (distFromSpawn <= 1 && !creature.combatTarget) {
      return tickWander(creature, collisionMap);
    }

    // If has target, check leash
    if (creature.combatTarget && distFromSpawn >= LEASH_DISTANCE) {
      // Too far from spawn - return (combat will be stopped by AiService)
      return moveToward(creature, creature.spawnPosition, collisionMap, true);
    }

    // If no target but far from spawn (was returning), continue returning
    if (!creature.combatTarget && distFromSpawn > 1) {
      return moveToward(creature, creature.spawnPosition, collisionMap, true);
    }
  }

  // If has combat target, chase them
  if (creature.combatTarget) {
    const target = players.find(p => p.id === creature.combatTarget);
    if (target) {
      const distToTarget = chebyshevDistance(
        creature.position.x,
        creature.position.y,
        target.position.x,
        target.position.y,
      );

      // Adjacent = attack
      if (distToTarget <= 1) {
        return { newPosition: null, shouldAttack: true };
      }

      // Chase
      return moveToward(creature, target.position, collisionMap, false);
    } else {
      // Target left zone - signal to clear target and return
      return { newPosition: null, shouldReturn: true };
    }
  }

  // No target - scan for players to aggro
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
    .filter(({ dist }) => dist <= AGGRO_RADIUS)
    .sort((a, b) => a.dist - b.dist);

  if (nearbyPlayers.length > 0) {
    // Aggro on closest player
    return { newPosition: null, aggroTarget: nearbyPlayers[0].player.id };
  }

  // No players nearby - wander
  return tickWander(creature, collisionMap);
}

/**
 * Move one step toward a target position.
 * Returns shouldReturn: true if this is a return-to-spawn movement.
 */
function moveToward(
  creature: Creature,
  target: { x: number; y: number },
  collisionMap: boolean[][],
  isReturning: boolean,
): AiTickResult {
  const rawDx = target.x - creature.position.x;
  const rawDy = target.y - creature.position.y;
  const dx = rawDx === 0 ? 0 : rawDx > 0 ? 1 : -1;
  const dy = rawDy === 0 ? 0 : rawDy > 0 ? 1 : -1;

  // Try direct move first, then axis-aligned fallbacks
  const attempts = [
    { dx, dy },
    { dx, dy: 0 },
    { dx: 0, dy },
  ];

  for (const { dx: mdx, dy: mdy } of attempts) {
    if (mdx === 0 && mdy === 0) continue;
    const nx = creature.position.x + mdx;
    const ny = creature.position.y + mdy;
    if (nx >= 0 && nx < ZONE_SIZE && ny >= 0 && ny < ZONE_SIZE && !collisionMap[ny]?.[nx]) {
      return {
        newPosition: { ...creature.position, x: nx, y: ny },
        shouldReturn: isReturning,
      };
    }
  }

  return { newPosition: null, shouldReturn: isReturning };
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
