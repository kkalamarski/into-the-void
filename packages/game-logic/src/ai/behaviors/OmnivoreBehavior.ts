import type { Creature, PlayerPublic } from '@into-the-void/shared-types';
import type { AiTickResult } from '../creature-ai-helpers';
import type { CreatureBehaviorStrategy } from './types';
import { tickWander } from '../creature-ai-helpers';
import { PredatorBehavior } from './PredatorBehavior';

const predatorBehavior = new PredatorBehavior();

/**
 * Omnivore behavior:
 * - If provoked (player attacked it): behave like predator
 * - If not provoked: just wander
 */
export class OmnivoreBehavior implements CreatureBehaviorStrategy {
  tick(creature: Creature, players: PlayerPublic[], collisionMap: boolean[][]): AiTickResult {
    // If provoked, behave like predator
    if (creature.provoked) {
      return predatorBehavior.tick(creature, players, collisionMap);
    }

    // Not provoked - just wander
    return tickWander(creature, collisionMap);
  }
}
