import type { BiomeType, DamageResistances } from '@into-the-void/shared-types';

/**
 * Biome resistance profiles for creature definitions.
 *
 * Values are percentage points:
 *   60  = 60% damage reduction (0.4x multiplier)
 *  -40  = 40% vulnerability (1.4x multiplier)
 *
 * Clamped to [0.3x, 1.5x] by applyResistanceMultiplier() in game-logic.
 * All creatures in a biome use their biome's profile — no per-creature overrides.
 */
export const BIOME_RESISTANCE_PROFILES: Record<BiomeType, DamageResistances> = {
  // Tier I - Frontier biomes
  void_plains: { thermal: 0, cryo: 0, bio: 0, kinetic: 0 },           // neutral
  fungal_forest: { thermal: 0, cryo: 0, bio: 40, kinetic: 0 },         // bio-adapted
  ancient_ruins: { thermal: 0, cryo: 0, bio: 0, kinetic: 20 },         // hardened shell
  tidal_pools: { thermal: 0, cryo: 30, bio: 0, kinetic: 0 },           // cold-water adapted

  // Tier II - Hazardous
  toxic_wastes: { thermal: 0, cryo: 0, bio: 60, kinetic: 0 },
  miasma_marshes: { thermal: 0, cryo: 0, bio: 50, kinetic: 0 },
  petrified_expanse: { thermal: 0, cryo: 0, bio: 0, kinetic: 40 },
  bioluminescent_depths: { thermal: 10, cryo: 10, bio: 30, kinetic: 0 },
  kelp_forests: { thermal: 0, cryo: 20, bio: 20, kinetic: 0 },

  // Tier III - Hostile
  frozen_expanse: { thermal: -40, cryo: 60, bio: 0, kinetic: 10 },     // Thermal vuln, Cryo resist
  volcanic_ridge: { thermal: 60, cryo: -40, bio: 0, kinetic: 10 },     // Thermal resist, Cryo vuln
  crystal_caves: { thermal: 0, cryo: 20, bio: 0, kinetic: 50 },
  crystalline_wastes: { thermal: 0, cryo: 30, bio: 0, kinetic: 50 },
  starfall_crater: { thermal: 20, cryo: 0, bio: -20, kinetic: 20 },    // Bio vulnerability
  deep_trenches: { thermal: 20, cryo: 40, bio: 30, kinetic: -20 },     // Kinetic vulnerability

  // Tier IV - Extreme
  void_rift: { thermal: 0, cryo: 0, bio: 0, kinetic: -30 },            // Reality-distorted

  // Hub Station Biomes (safe zones — no creatures spawn, neutral resistances)
  canopy_station: { thermal: 0, cryo: 0, bio: 0, kinetic: 0 },
  ironhold_station: { thermal: 0, cryo: 0, bio: 0, kinetic: 0 },
  meridian_station: { thermal: 0, cryo: 0, bio: 0, kinetic: 0 },
  salvage_station: { thermal: 0, cryo: 0, bio: 0, kinetic: 0 },
};
