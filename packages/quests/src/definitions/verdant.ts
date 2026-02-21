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
};

export const VERDANT_QUESTS: readonly QuestDefinition[] = [
  QUEST_VERDANT_BIODIVERSITY,
  QUEST_VERDANT_SPECIMEN,
];
