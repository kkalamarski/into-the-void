export type { EffectStrategy, EffectContext, EffectResult, EffectServices, PlayerRef } from './types';
export { AbstractEffectStrategy } from './AbstractEffectStrategy';

// Strategy class re-exports (for testing and direct access)
export { DamageEffectStrategy } from './DamageEffectStrategy';
export { HealEffectStrategy } from './HealEffectStrategy';
export { BuffEffectStrategy } from './BuffEffectStrategy';
export { ShieldEffectStrategy } from './ShieldEffectStrategy';
export { StunEffectStrategy } from './StunEffectStrategy';
export { ReflectEffectStrategy } from './ReflectEffectStrategy';
export { DotEffectStrategy } from './DotEffectStrategy';
export { GatherEffectStrategy } from './GatherEffectStrategy';
export { RevealEffectStrategy } from './RevealEffectStrategy';
export { HazardImmunityEffectStrategy } from './HazardImmunityEffectStrategy';
export { DamageReductionEffectStrategy } from './DamageReductionEffectStrategy';

import type { EffectStrategy } from './types';
import { DamageEffectStrategy } from './DamageEffectStrategy';
import { HealEffectStrategy } from './HealEffectStrategy';
import { BuffEffectStrategy } from './BuffEffectStrategy';
import { ShieldEffectStrategy } from './ShieldEffectStrategy';
import { StunEffectStrategy } from './StunEffectStrategy';
import { ReflectEffectStrategy } from './ReflectEffectStrategy';
import { DotEffectStrategy } from './DotEffectStrategy';
import { GatherEffectStrategy } from './GatherEffectStrategy';
import { RevealEffectStrategy } from './RevealEffectStrategy';
import { HazardImmunityEffectStrategy } from './HazardImmunityEffectStrategy';
import { DamageReductionEffectStrategy } from './DamageReductionEffectStrategy';

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
  registerEffectStrategy('damage', new DamageEffectStrategy());
  registerEffectStrategy('heal', new HealEffectStrategy());
  registerEffectStrategy('buff', new BuffEffectStrategy());
  registerEffectStrategy('shield', new ShieldEffectStrategy());
  registerEffectStrategy('stun', new StunEffectStrategy());
  registerEffectStrategy('reflect', new ReflectEffectStrategy());
  registerEffectStrategy('dot', new DotEffectStrategy());
  registerEffectStrategy('gather', new GatherEffectStrategy());
  registerEffectStrategy('reveal', new RevealEffectStrategy());
  registerEffectStrategy('hazard_immunity', new HazardImmunityEffectStrategy());
  registerEffectStrategy('damage_reduction', new DamageReductionEffectStrategy());
}
