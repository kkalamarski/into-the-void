import type { AtmosphereStrategy, BiomeAtmosphereConfig, CycleFactors, AtmosphereParams } from './types';

export class MurkStrategy implements AtmosphereStrategy {
  modulate(config: BiomeAtmosphereConfig, factors: CycleFactors): AtmosphereParams {
    return {
      rOffset: config.rOffset,
      gOffset: config.gOffset,
      bOffset: config.bOffset,
      brightnessBoost: config.brightnessBoost - factors.nightFactor * 0.08,
    };
  }
}
