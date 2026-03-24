import type { Creature, PlayerPublic } from '@into-the-void/shared-types';
import type { AiTickResult } from '../creature-ai-helpers';
import type { CreatureBehaviorStrategy } from './types';
import { PredatorBehavior } from './PredatorBehavior';

const predatorBehavior = new PredatorBehavior();

/**
 * Maniac behavior: same as predator, but with frenzy detection (CRAI-04).
 * Below 30% HP, maniac enters frenzied state (attack speed 2x, defense halved).
 */
export class ManiacBehavior implements CreatureBehaviorStrategy {
  tick(creature: Creature, players: PlayerPublic[], collisionMap: boolean[][]): AiTickResult {
    const result = predatorBehavior.tick(creature, players, collisionMap);

    // CRAI-04: Frenzy detection for maniacs below 30% HP
    const frenzied = creature.health > 0
      && creature.health < creature.maxHealth * 0.3;

    return {
      ...result,
      frenzied: frenzied || undefined,
    };
  }
}
