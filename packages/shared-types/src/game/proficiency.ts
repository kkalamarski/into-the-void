/**
 * Resource gathering categories
 */
export type ResourceCategory = 'mining' | 'herbalism' | 'archaeology';

/**
 * Timing challenge - server-generated challenge for gathering mini-game
 */
export interface TimingChallenge {
  challengeId: string;
  duration: number; // Total bar duration in ms (3000)
  successWindow: {
    start: number; // Offset in ms where success zone starts
    end: number; // Offset in ms where success zone ends
  };
}

/**
 * Timing result - client response to timing challenge
 */
export interface TimingResult {
  challengeId: string;
  clientOffset: number; // When player clicked (ms from start)
  clickTime: number; // Client timestamp for latency validation
}

/**
 * Gathering accuracy rating based on timing precision
 */
export type GatheringAccuracy = 'poor' | 'good' | 'perfect';

/**
 * Proficiency data - per-character proficiency state
 */
export interface ProficiencyData {
  mining: { xp: number; level: number };
  herbalism: { xp: number; level: number };
  archaeology: { xp: number; level: number };
}

/**
 * Gather duration constant - single source of truth
 */
export const GATHER_DURATION_MS = 3000;
