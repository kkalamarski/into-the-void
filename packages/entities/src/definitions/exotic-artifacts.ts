import type { ArtifactDefinition } from '../types';

export const ARTIFACT_ANOMALY_CORE: ArtifactDefinition = {
  id: 'artifact_anomaly_core',
  displayName: 'Anomaly Core',
  description: 'Stable anomaly formation crystallized into portable form. Pulses with dimensional energy.',
  entityClass: 'artifact',
  biomes: ['void_rift'],
  textureKey: 'artifact_anomaly_core',
  color: 0x8800ff,
  lootTableId: 'loot_artifact_anomaly_core',
  respawns: false,
  rarity: 'legendary',
};

export const ARTIFACT_DIMENSIONAL_FRAGMENT: ArtifactDefinition = {
  id: 'artifact_dimensional_fragment',
  displayName: 'Dimensional Fragment',
  description: 'Piece of reality torn loose by dimensional instability. Purpose unknown, value immense.',
  entityClass: 'artifact',
  biomes: ['void_rift', 'crystalline_wastes'],
  textureKey: 'artifact_dimensional_fragment',
  color: 0x6a00a0,
  lootTableId: 'loot_artifact_dimensional_fragment',
  respawns: false,
  rarity: 'exotic',
};

export const ARTIFACT_ECHO_RECORD: ArtifactDefinition = {
  id: 'artifact_echo_record',
  displayName: 'Echo Record',
  description: 'Temporal recording preserved in crystalline matrix. Replays moments from the past on loop.',
  entityClass: 'artifact',
  biomes: ['bioluminescent_depths', 'crystalline_wastes'],
  textureKey: 'artifact_echo_record',
  color: 0x4488ff,
  lootTableId: 'loot_artifact_echo_record',
  respawns: false,
  rarity: 'rare',
};

export const ARTIFACT_VOID_RELIC: ArtifactDefinition = {
  id: 'artifact_void_relic',
  displayName: 'Void Relic',
  description: 'Ancient artifact recovered from Void Rift. Predates colonial settlement, possibly predates the Ancients.',
  entityClass: 'artifact',
  biomes: ['void_rift'],
  textureKey: 'artifact_void_relic',
  color: 0x4a0080,
  lootTableId: 'loot_artifact_void_relic',
  respawns: false,
  rarity: 'legendary',
};

// ===== PHASE 111 CRYSTALLINE_WASTES SINGING FIELDS ARTIFACTS =====

export const ARTIFACT_SINGING_SPIRE: ArtifactDefinition = {
  id: 'artifact_singing_spire',
  displayName: 'Singing Spire',
  description:
    'A slender crystal tower, three meters tall, humming with a complex chord that shifts when sentient beings approach. The crystalline growth pattern incorporates Ancient-era structural principles — this was not formed naturally, but grown with intent. Prolonged listening induces vivid memories of places you have never visited.',
  entityClass: 'artifact',
  biomes: ['crystalline_wastes'],
  textureKey: 'artifact_singing_spire',
  color: 0xddbbff,
  lootTableId: 'loot_artifact_singing_spire',
  respawns: false,
  rarity: 'epic',
};

export const ARTIFACT_CRYSTAL_MEMORY_LATTICE: ArtifactDefinition = {
  id: 'artifact_crystal_memory_lattice',
  displayName: 'Crystal Memory Lattice',
  description:
    'A flat crystalline formation etched with microscopic patterns that encode information in a format predating all known languages. When pressed against bare skin, subjects experience brief flashes of alien sensation — heat, pressure, chemical taste — as though inhabiting a body designed for a different ecology. The crystal\'s growth rings suggest it has been recording continuously for over ten thousand years.',
  entityClass: 'artifact',
  biomes: ['crystalline_wastes'],
  textureKey: 'artifact_crystal_memory_lattice',
  color: 0xccaaee,
  lootTableId: 'loot_artifact_crystal_memory_lattice',
  respawns: false,
  rarity: 'epic',
};

export const ALL_EXOTIC_ARTIFACTS: readonly ArtifactDefinition[] = [
  ARTIFACT_ANOMALY_CORE,
  ARTIFACT_DIMENSIONAL_FRAGMENT,
  ARTIFACT_ECHO_RECORD,
  ARTIFACT_VOID_RELIC,
  // Phase 111 crystalline_wastes Singing Fields artifacts
  ARTIFACT_SINGING_SPIRE,
  ARTIFACT_CRYSTAL_MEMORY_LATTICE,
];
