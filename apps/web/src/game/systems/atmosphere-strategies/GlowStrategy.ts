import type { AtmosphereStrategy, BiomeAtmosphereConfig, CycleFactors, AtmosphereParams } from './types';

export class GlowStrategy implements AtmosphereStrategy {
  modulate(config: BiomeAtmosphereConfig, factors: CycleFactors): AtmosphereParams {
    let { rOffset, gOffset, bOffset, brightnessBoost } = config;
    // Brighter at night — bioluminescence partially counters night dimming
    // Only add boost during night half; preserve config value during day
    if (factors.cycleProgress >= 0.5) {
      gOffset *= (1 + factors.nightFactor * 0.4);
      bOffset *= (1 + factors.nightFactor * 0.4);
      brightnessBoost += factors.nightFactor * 0.1;
    }
    // During day half (cycleProgress < 0.5): return config values unchanged
    return { rOffset, gOffset, bOffset, brightnessBoost };
  }
}
