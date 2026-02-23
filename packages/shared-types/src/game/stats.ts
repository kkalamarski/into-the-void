import { CharacterStats } from '../core/player';

/**
 * Payload for stats:update socket event.
 * Server computes and emits; client only renders.
 */
export interface CharStatsPayload {
  /** Character level used for base stat calculation */
  level: number;
  /** Total effective stats (base + equipment) */
  total: CharacterStats;
  /** Base stats without any equipment contribution */
  base: CharacterStats;
  /** Delta from equipment only (total - base) */
  equipment: CharacterStats;
}
