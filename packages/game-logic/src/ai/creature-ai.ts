import { Creature, PlayerPublic } from '@into-the-void/shared-types';
import { getBehaviorStrategy } from './behaviors/index';

// Re-export helpers and types so existing consumers (tests, ai.service) don't break
export {
  AiTickResult,
  WANDER_CHANCE,
  creatureToPlayerDist,
  moveToward,
  flee,
  tickWander,
} from './creature-ai-helpers';

/**
 * Pure FSM function: compute creature movement decision for one tick.
 * No mutations, no I/O — callers apply the result.
 * Dispatches to behavior-specific strategy classes via the behavior registry.
 */
export function tickCreatureAI(
  creature: Creature,
  players: PlayerPublic[],
  collisionMap: boolean[][],
): import('./creature-ai-helpers').AiTickResult {
  if (!creature.active || creature.health <= 0) {
    return { newPosition: null };
  }

  const strategy = getBehaviorStrategy(creature.behavior);
  if (!strategy) {
    console.warn(`[CREATURE-AI] No behavior strategy registered for: ${creature.behavior}`);
    return { newPosition: null };
  }
  return strategy.tick(creature, players, collisionMap);
}
