import type { Creature, PlayerPublic } from '@into-the-void/shared-types';
import type { AiTickResult } from '../creature-ai-helpers';

/**
 * Strategy interface for creature behavior.
 * One implementation per behavior archetype (herbivore, omnivore, predator, maniac).
 */
export interface CreatureBehaviorStrategy {
  /** Compute the creature's AI tick result — pure data, no side effects. */
  tick(creature: Creature, players: PlayerPublic[], collisionMap: boolean[][]): AiTickResult;
}
