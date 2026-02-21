// Types
export type {
  ObjectiveType,
  BaseQuestObjective,
  KillObjective,
  GatherObjective,
  ExploreObjective,
  QuestObjective,
  QuestFaction,
  QuestRewards,
  QuestDefinition,
} from './types';

// Registry
export { QuestRegistry } from './registry';

// Definitions
export { ALL_QUESTS, TUTORIAL_QUESTS, VERDANT_QUESTS, HELIX_QUESTS, NEXUS_QUESTS } from './definitions';

// Register all quests on module load
import { QuestRegistry } from './registry';
import { ALL_QUESTS } from './definitions';
QuestRegistry.registerAll(ALL_QUESTS);
