import type { AtmosphereStrategy, BiomeAtmosphereConfig, CycleFactors, AtmosphereParams } from './types';

export class FogStrategy implements AtmosphereStrategy {
  modulate(config: BiomeAtmosphereConfig, factors: CycleFactors): AtmosphereParams {
    return {
      rOffset: config.rOffset * (1 + factors.nightFactor * 0.3),
      gOffset: config.gOffset * (1 + factors.nightFactor * 0.3),
      bOffset: config.bOffset * (1 + factors.nightFactor * 0.5),
      brightnessBoost: config.brightnessBoost - factors.nightFactor * 0.05,
    };
  }
}
