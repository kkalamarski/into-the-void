import type { QuestDefinition } from '../types';

/**
 * Tutorial quests - available to all factions
 * These quests introduce basic game mechanics
 */

export const QUEST_TUTORIAL_FIRST_STEPS: QuestDefinition = {
  id: 'quest_tutorial_first_steps',
  displayName: 'First Steps',
  description: 'Get acquainted with the basics of survival. Kill a few weak creatures to test your combat abilities.',
  objectives: [
    {
      objectiveType: 'kill',
      description: 'Kill 3 void crawlers',
      targetEntityId: 'creature_void_crawler',
      targetCount: 3,
    },
  ],
  rewards: { credits: 100, xp: 50 },
  minLevel: 1,
};

export const QUEST_TUTORIAL_GATHERING: QuestDefinition = {
  id: 'quest_tutorial_gathering',
  displayName: 'Resource Gathering',
  description: 'Learn to gather resources from the environment. Collect fungal samples from the fungal forest.',
  objectives: [
    {
      objectiveType: 'gather',
      description: 'Collect 5 fungal spore clusters',
      itemId: 'world_fungal_spore_cluster',
      quantity: 5,
    },
  ],
  rewards: { credits: 75, xp: 40 },
  minLevel: 1,
};

export const TUTORIAL_QUESTS: readonly QuestDefinition[] = [
  QUEST_TUTORIAL_FIRST_STEPS,
  QUEST_TUTORIAL_GATHERING,
];
