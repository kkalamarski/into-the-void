export type { EffectStrategy, EffectContext, EffectResult, EffectServices, PlayerRef } from './types';
export { AbstractEffectStrategy } from './AbstractEffectStrategy';

import type { EffectStrategy } from './types';

const registry = new Map<string, EffectStrategy>();

/** Register an effect strategy for an effect type. */
export function registerEffectStrategy(effectType: string, strategy: EffectStrategy): void {
  registry.set(effectType, strategy);
}

/** Get the strategy for an effect type. Returns undefined if not registered. */
export function getEffectStrategy(effectType: string): EffectStrategy | undefined {
  return registry.get(effectType);
}

/** Initialize all effect strategies. Call once at server startup. */
export function initEffectStrategies(): void {
  // Will be populated in Plan 02 when all 11 strategy classes are created
}
