import type { Creature, PlayerPublic } from '@into-the-void/shared-types';
import type { AiTickResult } from '../creature-ai-helpers';
import type { CreatureBehaviorStrategy } from './types';
import { creatureToPlayerDist, flee, tickWander } from '../creature-ai-helpers';
import { FLEE_RADIUS_PX } from '../../movement/pixel-distance';

/**
 * Herbivore behavior: flee from attackers or nearby players, otherwise wander.
 */
export class HerbivoreBehavior implements CreatureBehaviorStrategy {
  tick(creature: Creature, players: PlayerPublic[], collisionMap: boolean[][]): AiTickResult {
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
}
