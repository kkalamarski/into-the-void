import type { AtmosphereEffectType, AtmosphereStrategy } from './types';
import { FogStrategy } from './FogStrategy';
import { GlowStrategy } from './GlowStrategy';
import { HazeStrategy } from './HazeStrategy';
import { MurkStrategy } from './MurkStrategy';
import { ShimmerStrategy } from './ShimmerStrategy';
import { ClearStrategy } from './ClearStrategy';

export type { AtmosphereStrategy, AtmosphereParams, BiomeAtmosphereConfig, AtmosphereEffectType, CycleFactors } from './types';

const registry = new Map<AtmosphereEffectType, AtmosphereStrategy>();
let initialized = false;

/** Get the atmosphere modulation strategy for an effect type. */
export function getAtmosphereStrategy(effectType: AtmosphereEffectType): AtmosphereStrategy {
  const strategy = registry.get(effectType);
  if (!strategy) {
    return registry.get('clear')!; // fallback to clear for unknown types
  }
  return strategy;
}

/** Register an atmosphere strategy for an effect type. */
export function registerAtmosphereStrategy(effectType: AtmosphereEffectType, strategy: AtmosphereStrategy): void {
  registry.set(effectType, strategy);
}

/** Initialize all atmosphere strategies. Call once at system startup. Idempotent. */
export function initAtmosphereStrategies(): void {
  if (initialized) return;
  registerAtmosphereStrategy('fog', new FogStrategy());
  registerAtmosphereStrategy('glow', new GlowStrategy());
  registerAtmosphereStrategy('haze', new HazeStrategy());
  registerAtmosphereStrategy('murk', new MurkStrategy());
  registerAtmosphereStrategy('shimmer', new ShimmerStrategy());
  registerAtmosphereStrategy('clear', new ClearStrategy());
  initialized = true;
}
