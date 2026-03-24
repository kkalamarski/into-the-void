import type { AtmosphereStrategy, BiomeAtmosphereConfig, CycleFactors, AtmosphereParams } from './types';

export class ClearStrategy implements AtmosphereStrategy {
  modulate(config: BiomeAtmosphereConfig, _factors: CycleFactors): AtmosphereParams {
    return {
      rOffset: config.rOffset,
      gOffset: config.gOffset,
      bOffset: config.bOffset,
      brightnessBoost: config.brightnessBoost,
    };
  }
}
