import type { QuestDefinition } from '../types';

/**
 * Verdant Dynamics faction quests
 * Focus on biodiversity research and biological resource collection
 */

export const QUEST_VERDANT_BIODIVERSITY: QuestDefinition = {
  id: 'quest_verdant_biodiversity',
  displayName: 'Biodiversity Survey',
  description: 'Verdant Dynamics requires specimens from the crystal caves for their ongoing biodiversity research. Eliminate crystal hunters and explore the biome.',
  objectives: [
    {
      objectiveType: 'kill',
      description: 'Kill 5 crystal hunters',
      targetEntityId: 'creature_crystal_hunter',
      targetCount: 5,
    },
    {
      objectiveType: 'explore',
      description: 'Explore the crystal caves biome',
      biome: 'crystal_caves',
    },
  ],
  faction: 'verdant',
  rewards: { credits: 200, xp: 100 },
  minLevel: 5,
  questGiverId: 'npc_verdant_rep',
};

export const QUEST_VERDANT_SPECIMEN: QuestDefinition = {
  id: 'quest_verdant_specimen',
  displayName: 'Luminous Specimen Collection',
  description: 'Verdant bioengineering requires luminous extracts for their living architecture projects. Harvest from the canopy flora.',
  objectives: [
    {
      objectiveType: 'gather',
      description: 'Collect 3 luminous extracts',
      itemId: 'world_luminous_extract',
      quantity: 3,
    },
  ],
  faction: 'verdant',
  rewards: { credits: 150, xp: 75 },
  minLevel: 3,
  questGiverId: 'npc_verdant_rep',
};

export const BOUNTY_VERDANT_FUNGAL_HARVEST: QuestDefinition = {
  id: 'bounty_verdant_fungal_harvest',
  displayName: 'Daily Fungal Harvest',
  description: 'Collect fungal spore clusters for the Verdant research team. Repeats daily at UTC reset.',
  objectives: [
    {
      objectiveType: 'gather',
      description: 'Collect 10 fungal spore clusters',
      itemId: 'world_fungal_spore_cluster',
      quantity: 10,
    },
  ],
  rewards: { credits: 200, xp: 100 },
  faction: 'verdant',
  isRepeatable: true,  // Bounty - repeatable daily
  questGiverId: 'npc_verdant_rep',
};

export const QUEST_VERDANT_CHAIN_PART_1: QuestDefinition = {
  id: 'quest_verdant_chain_part_1',
  displayName: 'Verdant Initiative: First Contact',
  description: 'Establish initial contact with the Verdant Dynamics research outpost in the fungal forests.',
  objectives: [
    {
      objectiveType: 'explore',
      description: 'Reach the Verdant outpost in the fungal forest',
      biome: 'fungal_forest',
    },
  ],
  rewards: { credits: 100, xp: 50 },
  faction: 'verdant',
  questGiverId: 'npc_verdant_rep',
};

export const QUEST_VERDANT_CHAIN_PART_2: QuestDefinition = {
  id: 'quest_verdant_chain_part_2',
  displayName: 'Verdant Initiative: Specimen Collection',
  description: 'Continue research collaboration by gathering biological samples.',
  objectives: [
    {
      objectiveType: 'gather',
      description: 'Collect 5 void flora samples',
      itemId: 'world_void_flora_sample',
      quantity: 5,
    },
  ],
  rewards: { credits: 250, xp: 150 },
  faction: 'verdant',
  prerequisiteQuestIds: ['quest_verdant_chain_part_1'],  // CHAIN: requires part 1
  questGiverId: 'npc_verdant_rep',
};

export const VERDANT_QUESTS: readonly QuestDefinition[] = [
  QUEST_VERDANT_BIODIVERSITY,
  QUEST_VERDANT_SPECIMEN,
  BOUNTY_VERDANT_FUNGAL_HARVEST,
  QUEST_VERDANT_CHAIN_PART_1,
  QUEST_VERDANT_CHAIN_PART_2,
];
