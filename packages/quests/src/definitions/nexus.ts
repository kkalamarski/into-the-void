import type { QuestDefinition } from '../types';

/**
 * Nexus Frontiers faction quests
 * Focus on exploration and salvage of advanced materials
 */

export const QUEST_NEXUS_RECON: QuestDefinition = {
  id: 'quest_nexus_recon',
  displayName: 'Volcanic Reconnaissance',
  description: 'Nexus Frontiers requires reconnaissance data from the volcanic reaches. Explore the biome and document the terrain.',
  objectives: [
    {
      objectiveType: 'explore',
      description: 'Explore the volcanic reaches',
      biome: 'volcanic_reaches',
    },
  ],
  faction: 'nexus',
  rewards: { credits: 300, xp: 150 },
  minLevel: 8,
};

export const QUEST_NEXUS_SALVAGE: QuestDefinition = {
  id: 'quest_nexus_salvage',
  displayName: 'Crystal Salvage Operation',
  description: 'Nexus needs high-purity crystal fragments for their sensor array development. Salvage from the crystalline wastes.',
  objectives: [
    {
      objectiveType: 'gather',
      description: 'Collect 4 crystal fragments',
      itemId: 'world_crystal_fragment',
      quantity: 4,
    },
  ],
  faction: 'nexus',
  rewards: { credits: 200, xp: 100 },
  minLevel: 10,
};

export const NEXUS_QUESTS: readonly QuestDefinition[] = [
  QUEST_NEXUS_RECON,
  QUEST_NEXUS_SALVAGE,
];
