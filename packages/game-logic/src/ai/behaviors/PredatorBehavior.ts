import type { Creature, PlayerPublic } from '@into-the-void/shared-types';
import type { AiTickResult } from '../creature-ai-helpers';
import type { CreatureBehaviorStrategy } from './types';
import { creatureToPlayerDist, moveToward, tickWander } from '../creature-ai-helpers';
import {
  AGGRO_RADIUS_PX,
  LEASH_RADIUS_PX,
  MELEE_RANGE_PX,
  tileToPixelCenter,
  pixelDistanceTo,
} from '../../movement/pixel-distance';

/**
 * Predator behavior:
 * - If has combatTarget: chase or attack
 * - If no target: scan for nearby players to aggro
 * - If too far from spawn: return to spawn
 */
export class PredatorBehavior implements CreatureBehaviorStrategy {
  tick(creature: Creature, players: PlayerPublic[], collisionMap: boolean[][]): AiTickResult {
    // Check leash distance first
    if (creature.spawnPosition) {
      const { px: cpx, py: cpy } = tileToPixelCenter(creature.position.x, creature.position.y);
      const { px: spx, py: spy } = tileToPixelCenter(creature.spawnPosition.x, creature.spawnPosition.y);
      const distFromSpawn = pixelDistanceTo(cpx, cpy, spx, spy);

      // If at spawn and no target, just wander
      if (distFromSpawn <= MELEE_RANGE_PX && !creature.combatTarget) {
        return tickWander(creature, collisionMap);
      }

      // If has target, check leash
      if (creature.combatTarget && distFromSpawn >= LEASH_RADIUS_PX) {
        // Too far from spawn - return (combat will be stopped by AiService)
        return moveToward(creature, creature.spawnPosition, collisionMap, true);
      }

      // If no target but far from spawn (was returning), continue returning
      if (!creature.combatTarget && distFromSpawn > MELEE_RANGE_PX) {
        return moveToward(creature, creature.spawnPosition, collisionMap, true);
      }
    }

    // If has combat target, chase them
    if (creature.combatTarget) {
      const target = players.find(p => p.id === creature.combatTarget);
      if (target) {
        const distToTarget = creatureToPlayerDist(creature, target);

        // Adjacent = attack (within melee range)
        if (distToTarget <= MELEE_RANGE_PX) {
          return { newPosition: null, shouldAttack: true };
        }

        // Chase — move toward player's pixel position
        return moveToward(creature, target, collisionMap, false);
      } else {
        // Target left zone - signal to clear target and return
        return { newPosition: null, shouldReturn: true };
      }
    }

    // No target - scan for players to aggro (pixel distance detection)
    const nearbyPlayers = players
      .map((p) => ({ player: p, dist: creatureToPlayerDist(creature, p) }))
      .filter(({ dist }) => dist <= AGGRO_RADIUS_PX)
      .sort((a, b) => a.dist - b.dist);

    if (nearbyPlayers.length > 0) {
      // Aggro on closest player
      return { newPosition: null, aggroTarget: nearbyPlayers[0].player.id };
    }

    // No players nearby - wander
    return tickWander(creature, collisionMap);
  }
}
