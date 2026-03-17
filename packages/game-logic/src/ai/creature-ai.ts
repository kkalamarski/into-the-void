import { Creature, PlayerPublic, Position, ZONE_SIZE } from '@into-the-void/shared-types';
import { DIRECTION_VECTORS } from '../movement/validation';
import {
  pixelDistanceTo,
  tileToPixelCenter,
  AGGRO_RADIUS_PX,
  LEASH_RADIUS_PX,
  FLEE_RADIUS_PX,
  MELEE_RANGE_PX,
} from '../movement/pixel-distance';

const WANDER_CHANCE = 0.25;

/** Compute pixel distance from a creature's tile position to a player's pixel position. */
function creatureToPlayerDist(creature: Creature, player: PlayerPublic): number {
  const { px: cpx, py: cpy } = tileToPixelCenter(creature.position.x, creature.position.y);
  return pixelDistanceTo(cpx, cpy, player.px, player.py);
}

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

  // Otherwise flee from any nearby players (pixel distance detection)
  const nearbyPlayers = players
    .map((p) => ({ player: p, dist: creatureToPlayerDist(creature, p) }))
    .filter(({ dist }) => dist <= FLEE_RADIUS_PX)
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
  // CRAI-04: Frenzy detection for maniacs below 30% HP
  const frenzied = creature.behavior === 'maniac'
    && creature.health > 0
    && creature.health < creature.maxHealth * 0.3;

  /**
   * Helper to attach frenzy signal to any result from this function.
   * Uses `|| undefined` to keep AiTickResult sparse for non-maniac creatures.
   */
  const withFrenzy = (result: AiTickResult): AiTickResult => ({
    ...result,
    frenzied: frenzied || undefined,
  });

  // Check leash distance first
  if (creature.spawnPosition) {
    const { px: cpx, py: cpy } = tileToPixelCenter(creature.position.x, creature.position.y);
    const { px: spx, py: spy } = tileToPixelCenter(creature.spawnPosition.x, creature.spawnPosition.y);
    const distFromSpawn = pixelDistanceTo(cpx, cpy, spx, spy);

    // If at spawn and no target, just wander
    if (distFromSpawn <= MELEE_RANGE_PX && !creature.combatTarget) {
      return withFrenzy(tickWander(creature, collisionMap));
    }

    // If has target, check leash
    if (creature.combatTarget && distFromSpawn >= LEASH_RADIUS_PX) {
      // Too far from spawn - return (combat will be stopped by AiService)
      return withFrenzy(moveToward(creature, creature.spawnPosition, collisionMap, true));
    }

    // If no target but far from spawn (was returning), continue returning
    if (!creature.combatTarget && distFromSpawn > MELEE_RANGE_PX) {
      return withFrenzy(moveToward(creature, creature.spawnPosition, collisionMap, true));
    }
  }

  // If has combat target, chase them
  if (creature.combatTarget) {
    const target = players.find(p => p.id === creature.combatTarget);
    if (target) {
      const distToTarget = creatureToPlayerDist(creature, target);

      // Adjacent = attack (within melee range)
      if (distToTarget <= MELEE_RANGE_PX) {
        return withFrenzy({ newPosition: null, shouldAttack: true });
      }

      // Chase — move toward player's pixel position
      return withFrenzy(moveToward(creature, target, collisionMap, false));
    } else {
      // Target left zone - signal to clear target and return
      return withFrenzy({ newPosition: null, shouldReturn: true });
    }
  }

  // No target - scan for players to aggro (pixel distance detection)
  const nearbyPlayers = players
    .map((p) => ({ player: p, dist: creatureToPlayerDist(creature, p) }))
    .filter(({ dist }) => dist <= AGGRO_RADIUS_PX)
    .sort((a, b) => a.dist - b.dist);

  if (nearbyPlayers.length > 0) {
    // Aggro on closest player
    return withFrenzy({ newPosition: null, aggroTarget: nearbyPlayers[0].player.id });
  }

  // No players nearby - wander
  return withFrenzy(tickWander(creature, collisionMap));
}

/**
 * Move one step toward a target position.
 * Accepts either a tile-based Position object or a PlayerPublic (with px/py pixel coords).
 * Uses pixel coordinates for direction calculation so movement is accurate when player
 * is between tiles, but still moves one tile step per tick (creatures stay tile-snapped).
 * Returns shouldReturn: true if this is a return-to-spawn movement.
 */
function moveToward(
  creature: Creature,
  target: { x: number; y: number } | PlayerPublic,
  collisionMap: boolean[][],
  isReturning: boolean,
): AiTickResult {
  const { px: cpx, py: cpy } = tileToPixelCenter(creature.position.x, creature.position.y);
  let targetPx: number, targetPy: number;
  if ('px' in target && 'py' in target) {
    targetPx = (target as PlayerPublic).px;
    targetPy = (target as PlayerPublic).py;
  } else {
    const tc = tileToPixelCenter((target as { x: number; y: number }).x, (target as { x: number; y: number }).y);
    targetPx = tc.px;
    targetPy = tc.py;
  }
  const rawDx = targetPx - cpx;
  const rawDy = targetPy - cpy;
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
 * Flee directly away from a player, trying fallback directions if blocked.
 * Uses pixel coordinates for direction calculation for sub-tile accuracy.
 * Creature still moves one tile step per tick (tile-snapped movement).
 */
function flee(
  creature: Creature,
  player: PlayerPublic,
  collisionMap: boolean[][],
): AiTickResult {
  const { px: cpx, py: cpy } = tileToPixelCenter(creature.position.x, creature.position.y);
  const rawDx = cpx - player.px;
  const rawDy = cpy - player.py;
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
