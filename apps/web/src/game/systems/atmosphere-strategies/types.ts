export type AtmosphereEffectType = 'fog' | 'glow' | 'haze' | 'murk' | 'shimmer' | 'clear';

export interface BiomeAtmosphereConfig {
  effectType: AtmosphereEffectType;
  rOffset: number;    // Red channel additive offset (getData scale: 0.0-1.0)
  gOffset: number;    // Green channel additive offset
  bOffset: number;    // Blue channel additive offset
  brightnessBoost: number; // Additive diagonal modifier (positive=lighter, negative=darker)
}

export interface AtmosphereParams {
  rOffset: number;
  gOffset: number;
  bOffset: number;
  brightnessBoost: number;
}

/**
 * Modulation factors derived from day/night cycle progress.
 * Computed once by AtmosphereSystem and passed to strategy.
 */
export interface CycleFactors {
  nightFactor: number;
  dayFactor: number;
  dawnDuskFactor: number;
  cycleProgress: number;
}

/**
 * Strategy interface for atmosphere day/night modulation.
 * Each effect type implements this to define how its color offsets
 * respond to the day/night cycle.
 */
export interface AtmosphereStrategy {
  modulate(config: BiomeAtmosphereConfig, factors: CycleFactors): AtmosphereParams;
}
