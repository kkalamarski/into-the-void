import type { TimingChallenge, TimingResult, GatheringAccuracy } from '@into-the-void/shared-types';

export interface TimingValidationResult {
  valid: boolean;
  accuracy: GatheringAccuracy;
  yieldMultiplier: number;
}

/**
 * Validate player timing against server-generated challenge.
 * Uses +-200ms latency tolerance outside success window.
 *
 * @param challenge - Server-generated challenge with success window
 * @param result - Client-reported timing
 * @param serverTime - Current server timestamp for expiry check
 * @param challengeStartTime - When challenge was created (server timestamp)
 */
export function validateGatherTiming(
  challenge: TimingChallenge,
  result: TimingResult,
  serverTime: number,
  challengeStartTime: number
): TimingValidationResult {
  // Verify challenge hasn't expired (max duration + 500ms grace period)
  const elapsed = serverTime - challengeStartTime;
  if (elapsed > challenge.duration + 500) {
    return { valid: false, accuracy: 'poor', yieldMultiplier: 0.5 };
  }

  // Verify challenge ID matches (prevent replay attacks)
  if (result.challengeId !== challenge.challengeId) {
    return { valid: false, accuracy: 'poor', yieldMultiplier: 0.5 };
  }

  const offset = result.clientOffset;
  const { start, end } = challenge.successWindow;

  // Perfect: within success window
  if (offset >= start && offset <= end) {
    return { valid: true, accuracy: 'perfect', yieldMultiplier: 1.5 };
  }

  // Good: within +-200ms of success window (latency compensation)
  const tolerance = 200;
  if (offset >= start - tolerance && offset <= end + tolerance) {
    return { valid: true, accuracy: 'good', yieldMultiplier: 1.0 };
  }

  // Poor: outside success zone (still valid, just low yield)
  return { valid: true, accuracy: 'poor', yieldMultiplier: 0.5 };
}
