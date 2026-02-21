/**
 * Quest definition types for the packages/quests registry.
 *
 * Quest Objective Types:
 * - Kill: Kill a specific number of entities
 * - Gather: Collect a specific quantity of items
 * - Explore: Visit a specific biome
 */

/** Quest objective type discriminator */
export type ObjectiveType = 'kill' | 'gather' | 'explore';

/** Base fields shared by all quest objectives */
export interface BaseQuestObjective {
  readonly objectiveType: ObjectiveType;
  readonly description: string;
}

/** Kill objective - kill a specific number of entities */
export interface KillObjective extends BaseQuestObjective {
  readonly objectiveType: 'kill';
  readonly targetEntityId: string;  // Entity ID from packages/entities
  readonly targetCount: number;
}

/** Gather objective - collect a specific quantity of items */
export interface GatherObjective extends BaseQuestObjective {
  readonly objectiveType: 'gather';
  readonly itemId: string;  // Item ID from packages/items
  readonly quantity: number;
}

/** Explore objective - visit a specific biome */
export interface ExploreObjective extends BaseQuestObjective {
  readonly objectiveType: 'explore';
  readonly biome: string;  // Biome identifier
}

/** Discriminated union of all quest objectives */
export type QuestObjective =
  | KillObjective
  | GatherObjective
  | ExploreObjective;

/** Faction type for quest restrictions */
export type QuestFaction = 'verdant' | 'helix' | 'nexus';

/** Quest rewards */
export interface QuestRewards {
  readonly credits?: number;
  readonly xp?: number;
  readonly items?: readonly { readonly itemId: string; readonly quantity: number }[];
}

/** Quest definition - the static data for a quest */
export interface QuestDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly objectives: readonly QuestObjective[];
  readonly faction?: QuestFaction;  // undefined = all factions can accept
  readonly prerequisiteQuestIds?: readonly string[];
  readonly rewards: QuestRewards;
  readonly minLevel?: number;  // default 1
  readonly isRepeatable?: boolean;  // default false for story quests
}
