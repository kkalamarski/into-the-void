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

export const BOUNTY_VOID_CRAWLER_HUNT: QuestDefinition = {
  id: 'bounty_void_crawler_hunt',
  displayName: 'Void Crawler Bounty',
  description: 'Cull the void crawler population in the outer zones. Repeats daily.',
  objectives: [
    {
      objectiveType: 'kill',
      description: 'Kill 10 void crawlers',
      targetEntityId: 'creature_void_crawler',
      targetCount: 10,
    },
  ],
  rewards: { credits: 150, xp: 75 },
  isRepeatable: true,  // Bounty - no faction restriction, available to all
};

export const TUTORIAL_QUESTS: readonly QuestDefinition[] = [
  QUEST_TUTORIAL_FIRST_STEPS,
  QUEST_TUTORIAL_GATHERING,
  BOUNTY_VOID_CRAWLER_HUNT,
];
