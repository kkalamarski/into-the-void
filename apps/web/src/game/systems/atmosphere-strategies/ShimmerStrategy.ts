import type { AtmosphereStrategy, BiomeAtmosphereConfig, CycleFactors, AtmosphereParams } from './types';

export class ShimmerStrategy implements AtmosphereStrategy {
  modulate(config: BiomeAtmosphereConfig, factors: CycleFactors): AtmosphereParams {
    return {
      rOffset: config.rOffset * (1 + factors.dawnDuskFactor * 0.3),
      gOffset: config.gOffset,
      bOffset: config.bOffset * (1 - factors.dawnDuskFactor * 0.2),
      brightnessBoost: config.brightnessBoost,
    };
  }
}
