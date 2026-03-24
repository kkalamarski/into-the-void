import type { CreatureBehaviorStrategy } from './types';
import { HerbivoreBehavior } from './HerbivoreBehavior';
import { OmnivoreBehavior } from './OmnivoreBehavior';
import { PredatorBehavior } from './PredatorBehavior';
import { ManiacBehavior } from './ManiacBehavior';

export type { CreatureBehaviorStrategy } from './types';
export { HerbivoreBehavior } from './HerbivoreBehavior';
export { OmnivoreBehavior } from './OmnivoreBehavior';
export { PredatorBehavior } from './PredatorBehavior';
export { ManiacBehavior } from './ManiacBehavior';

const behaviorRegistry = new Map<string, CreatureBehaviorStrategy>();

/** Register a behavior strategy for a creature behavior type. */
export function registerBehaviorStrategy(behavior: string, strategy: CreatureBehaviorStrategy): void {
  behaviorRegistry.set(behavior, strategy);
}

/** Get the strategy for a creature behavior type. Returns undefined if not registered. */
export function getBehaviorStrategy(behavior: string): CreatureBehaviorStrategy | undefined {
  return behaviorRegistry.get(behavior);
}

/** Initialize all creature behavior strategies. Call once at startup. */
export function initBehaviorStrategies(): void {
  registerBehaviorStrategy('herbivore', new HerbivoreBehavior());
  registerBehaviorStrategy('omnivore', new OmnivoreBehavior());
  registerBehaviorStrategy('predator', new PredatorBehavior());
  registerBehaviorStrategy('maniac', new ManiacBehavior());
}

// Auto-initialize on module load so tickCreatureAI works immediately
initBehaviorStrategies();
