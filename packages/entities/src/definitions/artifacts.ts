import type { ArtifactDefinition } from '../types';

export const ARTIFACT_ANCIENT_DATA_CORE: ArtifactDefinition = {
  id: 'artifact_ancient_data_core',
  displayName: 'Ancient Data Core',
  description: 'Intact storage device from the Prior Inhabitants. Contains encrypted data.',
  entityClass: 'artifact',
  biomes: ['ancient_ruins'],
  textureKey: 'artifact_ancient_data_core',
  color: 0x9400d3,
  lootTableId: 'loot_artifact_ancient_data_core',
  respawns: false,
  rarity: 'exotic',
};

export const ARTIFACT_VOID_TOUCHED_RELIC: ArtifactDefinition = {
  id: 'artifact_void_touched_relic',
  displayName: 'Void-Touched Relic',
  description: 'Object warped by anomaly exposure. Radiates unsettling energy.',
  entityClass: 'artifact',
  biomes: ['starfall_crater', 'ancient_ruins'],
  textureKey: 'artifact_void_touched_relic',
  color: 0x191970,
  lootTableId: 'loot_artifact_void_touched_relic',
  respawns: false,
  rarity: 'legendary',
};

export const ARTIFACT_CRYSTALLINE_RESONATOR: ArtifactDefinition = {
  id: 'artifact_crystalline_resonator',
  displayName: 'Crystalline Resonator',
  description: 'Ancient technology fused with crystal growth. Still functional.',
  entityClass: 'artifact',
  biomes: ['crystal_caves'],
  textureKey: 'artifact_crystalline_resonator',
  color: 0x7b68ee,
  lootTableId: 'loot_artifact_crystalline_resonator',
  respawns: false,
  rarity: 'epic',
};

export const ARTIFACT_PRESERVED_SPECIMEN: ArtifactDefinition = {
  id: 'artifact_preserved_specimen',
  displayName: 'Preserved Specimen',
  description: 'Perfectly petrified ancient creature. Scientific value incalculable.',
  entityClass: 'artifact',
  biomes: ['petrified_expanse', 'frozen_expanse'],
  textureKey: 'artifact_preserved_specimen',
  color: 0xa9a9a9,
  lootTableId: 'loot_artifact_preserved_specimen',
  respawns: false,
  rarity: 'rare',
};

export const ARTIFACT_THERMAL_CORE: ArtifactDefinition = {
  id: 'artifact_thermal_core',
  displayName: 'Thermal Core',
  description: 'Ancient geothermal power source. Still generating heat after millennia.',
  entityClass: 'artifact',
  biomes: ['volcanic_ridge'],
  textureKey: 'artifact_thermal_core',
  color: 0xff4500,
  lootTableId: 'loot_artifact_thermal_core',
  respawns: false,
  rarity: 'epic',
};

// ===== PHASE 88 ADDITIONS =====

export const ARTIFACT_CONTAMINATED_RELIC: ArtifactDefinition = {
  id: 'artifact_contaminated_relic',
  displayName: 'Contaminated Ancient Relic',
  description: 'Prior Inhabitant technology saturated with toxic compounds. Purpose unknown, value high despite hazardous handling requirements.',
  entityClass: 'artifact',
  biomes: ['toxic_wastes'],
  textureKey: 'artifact_void_touched_relic',
  color: 0x9acd32,
  lootTableId: 'loot_artifact_contaminated_relic',
  respawns: false,
  rarity: 'rare',
};

export const ARTIFACT_FROZEN_ARCHIVE: ArtifactDefinition = {
  id: 'artifact_frozen_archive',
  displayName: 'Frozen Data Archive',
  description: 'Perfectly preserved information storage device. Ice-locked for countless years, data integrity unknown.',
  entityClass: 'artifact',
  biomes: ['frozen_expanse'],
  textureKey: 'artifact_ancient_data_core',
  color: 0xb0e0e6,
  lootTableId: 'loot_artifact_frozen_archive',
  respawns: false,
  rarity: 'epic',
};

export const ALL_ARTIFACTS: readonly ArtifactDefinition[] = [
  ARTIFACT_ANCIENT_DATA_CORE,
  ARTIFACT_VOID_TOUCHED_RELIC,
  ARTIFACT_CRYSTALLINE_RESONATOR,
  ARTIFACT_PRESERVED_SPECIMEN,
  ARTIFACT_THERMAL_CORE,
  // Phase 88 biome gap artifacts
  ARTIFACT_CONTAMINATED_RELIC,
  ARTIFACT_FROZEN_ARCHIVE,
];
