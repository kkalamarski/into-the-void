/**
 * Quest-related types for client/server communication
 */

/**
 * Quest state enum - discriminated by value
 */
export type QuestState = 'available' | 'active' | 'completed' | 'failed';

/**
 * Objective progress for a single objective
 */
export interface ObjectiveProgress {
  objectiveType: 'kill' | 'gather' | 'explore';
  description: string;
  current: number;
  required: number;
  targetId?: string; // entityId, itemId, or biome
  complete: boolean;
}

/**
 * Quest progress payload sent to client
 */
export interface QuestProgressPayload {
  questId: string;
  displayName: string;
  description: string;
  state: QuestState;
  objectives: ObjectiveProgress[];
  rewards: {
    credits?: number;
    xp?: number;
    items?: { itemId: string; quantity: number }[];
  };
}

/**
 * Quest state update event payload
 */
export interface QuestStateUpdate {
  questId: string;
  state: QuestState;
  objectives?: ObjectiveProgress[];
  completedAt?: number;
}
