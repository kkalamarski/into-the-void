import type { ArtifactDefinition } from '../types';

export const ARTIFACT_SUNKEN_TECH: ArtifactDefinition = {
  id: 'artifact_sunken_tech',
  displayName: 'Sunken Tech',
  description: 'Water-damaged technology from the Prior Inhabitants. Still partially functional.',
  entityClass: 'artifact',
  biomes: ['kelp_forests', 'deep_trenches'],
  textureKey: 'artifact_sunken_tech',
  color: 0x708090,
  lootTableId: 'loot_artifact_sunken_tech',
  respawns: false,
  rarity: 'epic',
};

export const ARTIFACT_ANCIENT_SHELL: ArtifactDefinition = {
  id: 'artifact_ancient_shell',
  displayName: 'Ancient Shell',
  description: 'Fossilized shell of enormous size. Predates all known Terminus fauna.',
  entityClass: 'artifact',
  biomes: ['deep_trenches'],
  textureKey: 'artifact_ancient_shell',
  color: 0xf5deb3,
  lootTableId: 'loot_artifact_ancient_shell',
  respawns: false,
  rarity: 'rare',
};

export const ARTIFACT_DROWNED_RELIC: ArtifactDefinition = {
  id: 'artifact_drowned_relic',
  displayName: 'Drowned Relic',
  description: 'Prior Inhabitant artifact recovered from flooded ruins. Purpose unknown.',
  entityClass: 'artifact',
  biomes: ['deep_trenches'],
  textureKey: 'artifact_drowned_relic',
  color: 0x4682b4,
  lootTableId: 'loot_artifact_drowned_relic',
  respawns: false,
  rarity: 'legendary',
};

export const ALL_AQUATIC_ARTIFACTS: readonly ArtifactDefinition[] = [
  ARTIFACT_SUNKEN_TECH,
  ARTIFACT_ANCIENT_SHELL,
  ARTIFACT_DROWNED_RELIC,
];
