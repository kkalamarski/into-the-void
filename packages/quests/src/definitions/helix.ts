import type { QuestDefinition } from '../types';

/**
 * Helix Extraction faction quests
 * Focus on resource extraction and clearing dangerous creatures
 */

export const QUEST_HELIX_EXCAVATION: QuestDefinition = {
  id: 'quest_helix_excavation',
  displayName: 'Excavation Site Clearance',
  description: 'Helix Extraction needs the void plains cleared of hostile creatures before they can establish a new mining operation. Eliminate void crawlers in the area.',
  objectives: [
    {
      objectiveType: 'kill',
      description: 'Kill 4 void crawlers',
      targetEntityId: 'creature_void_crawler',
      targetCount: 4,
    },
  ],
  faction: 'helix',
  rewards: { credits: 250, xp: 125 },
  minLevel: 1,
};

export const QUEST_HELIX_ORE_RUN: QuestDefinition = {
  id: 'quest_helix_ore_run',
  displayName: 'Crater Dust Collection',
  description: 'Helix needs bulk quantities of crater dust from the scarred badlands. Simple collection work with good pay.',
  objectives: [
    {
      objectiveType: 'gather',
      description: 'Collect 5 crater dust samples',
      itemId: 'world_crater_dust',
      quantity: 5,
    },
  ],
  faction: 'helix',
  rewards: { credits: 175, xp: 85 },
  minLevel: 1,
};

export const HELIX_QUESTS: readonly QuestDefinition[] = [
  QUEST_HELIX_EXCAVATION,
  QUEST_HELIX_ORE_RUN,
];
