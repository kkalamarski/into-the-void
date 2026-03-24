import type { WeatherType, WeatherParticleStrategy } from './types';
import { RainStrategy } from './RainStrategy';
import { SnowStrategy } from './SnowStrategy';
import { AshStrategy } from './AshStrategy';
import { SporesStrategy } from './SporesStrategy';
import { MistStrategy } from './MistStrategy';
import { VoidEnergyStrategy } from './VoidEnergyStrategy';

export type { WeatherParticleStrategy, WeatherType, WeatherConfig } from './types';

const registry = new Map<WeatherType, WeatherParticleStrategy>();
let initialized = false;

/** Get the weather particle strategy for a weather type. */
export function getWeatherStrategy(weatherType: WeatherType): WeatherParticleStrategy | undefined {
  return registry.get(weatherType);
}

/** Register a weather particle strategy for a weather type. */
export function registerWeatherStrategy(weatherType: WeatherType, strategy: WeatherParticleStrategy): void {
  registry.set(weatherType, strategy);
}

/** Initialize all weather strategies. Call once at system startup. Idempotent. */
export function initWeatherStrategies(): void {
  if (initialized) return;
  registerWeatherStrategy('rain', new RainStrategy());
  registerWeatherStrategy('snow', new SnowStrategy());
  registerWeatherStrategy('ash', new AshStrategy());
  registerWeatherStrategy('spores', new SporesStrategy());
  registerWeatherStrategy('mist', new MistStrategy());
  registerWeatherStrategy('void_energy', new VoidEnergyStrategy());
  initialized = true;
}
