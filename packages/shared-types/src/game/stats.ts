import { CharacterStats } from '../core/player';

/**
 * Payload for stats:update socket event.
 * Server computes and emits; client only renders.
 */
export interface CharStatsPayload {
  /** Character level used for base stat calculation */
  level: number;
  /** Total effective stats after diminishing returns (base + equipment + buffs, DR-capped) */
  total: CharacterStats;
  /** Base stats without any equipment contribution */
  base: CharacterStats;
  /** Delta from equipment only (raw, uncapped — for breakdown display) */
  equipment: CharacterStats;
  /** Raw total stats before diminishing returns (base + equipment + buffs, uncapped) */
  raw: CharacterStats;
}
