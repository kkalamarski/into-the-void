import type { AtmosphereStrategy, BiomeAtmosphereConfig, CycleFactors, AtmosphereParams } from './types';

export class HazeStrategy implements AtmosphereStrategy {
  modulate(config: BiomeAtmosphereConfig, factors: CycleFactors): AtmosphereParams {
    return {
      rOffset: config.rOffset * (1 + factors.dayFactor * 0.4),
      gOffset: config.gOffset * (1 + factors.dayFactor * 0.2),
      bOffset: config.bOffset,
      brightnessBoost: config.brightnessBoost + factors.dayFactor * 0.05,
    };
  }
}
