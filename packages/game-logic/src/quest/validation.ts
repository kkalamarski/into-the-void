import type { QuestState } from '@into-the-void/shared-types';

export interface ValidateQuestTransitionResult {
  valid: boolean;
  reason?: string;
}

/**
 * Pure validation - can this quest transition from currentState to newState?
 *
 * Valid transitions:
 * - available -> active (quest acceptance)
 * - active -> completed (all objectives met)
 * - active -> failed (abandonment)
 *
 * Invalid:
 * - completed -> anything (terminal state)
 * - failed -> anything (terminal state)
 * - available -> completed (must activate first)
 */
export function validateQuestTransition(
  currentState: QuestState,
  newState: QuestState,
  allObjectivesComplete: boolean
): ValidateQuestTransitionResult {
  // Terminal states cannot transition
  if (currentState === 'completed' || currentState === 'failed') {
    return { valid: false, reason: `Quest already ${currentState}` };
  }

  // Available -> Active (acceptance)
  if (currentState === 'available' && newState === 'active') {
    return { valid: true };
  }

  // Active -> Completed (all objectives done)
  if (currentState === 'active' && newState === 'completed') {
    if (!allObjectivesComplete) {
      return { valid: false, reason: 'Not all objectives completed' };
    }
    return { valid: true };
  }

  // Active -> Failed (abandonment)
  if (currentState === 'active' && newState === 'failed') {
    return { valid: true };
  }

  return { valid: false, reason: `Invalid transition: ${currentState} -> ${newState}` };
}

/**
 * Check if all objectives are complete
 */
export function areAllObjectivesComplete(
  objectives: Array<{ current: number; required: number }>
): boolean {
  return objectives.every(obj => obj.current >= obj.required);
}
