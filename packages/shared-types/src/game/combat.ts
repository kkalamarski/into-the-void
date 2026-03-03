/**
 * Combat action types
 */
export type CombatAction = 'attack' | 'defend' | 'skill' | 'item' | 'flee';

/**
 * Combat action request
 */
export interface CombatActionRequest {
  /** Action type */
  action: CombatAction;
  /** Target entity ID */
  targetId: string;
  /** Skill ID (if action is 'skill') */
  skillId?: string;
  /** Item ID (if action is 'item') */
  itemId?: string;
}

/**
 * Combat result
 */
export interface CombatResult {
  /** Whether attack hit */
  hit: boolean;
  /** Damage dealt */
  damage: number;
  /** Whether target was killed */
  killed: boolean;
  /** Critical hit */
  critical: boolean;
  /** Effects applied */
  effects: CombatEffect[];
  /** Attacker ID */
  attackerId: string;
  /** Defender ID */
  defenderId: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Combat effect (buff/debuff)
 */
export interface CombatEffect {
  /** Effect type */
  type: EffectType;
  /** Effect value/strength */
  value: number;
  /** Duration in turns */
  duration: number;
  /** Source of effect */
  source: string;
}

/**
 * Effect types
 */
export type EffectType =
  | 'damage_over_time'
  | 'heal_over_time'
  | 'stun'
  | 'slow'
  | 'damage_boost'
  | 'defense_boost'
  | 'poison'
  | 'burn'
  | 'freeze';

/**
 * Combat state for a player
 */
export interface CombatState {
  /** Whether in combat */
  active: boolean;
  /** Current turn */
  turn: number;
  /** Participants in combat */
  participants: CombatParticipant[];
  /** Current actor's ID (whose turn it is) */
  currentActorId: string;
  /** Combat start timestamp */
  startedAt: number;
}

/**
 * Combat participant
 */
export interface CombatParticipant {
  /** Entity ID */
  id: string;
  /** Entity type */
  type: 'player' | 'creature';
  /** Current health */
  health: number;
  /** Maximum health */
  maxHealth: number;
  /** Initiative value */
  initiative: number;
  /** Active effects */
  effects: CombatEffect[];
}

/**
 * Damage type categories for the v1.24 damage system.
 * - Thermal: heat-based damage (fire, plasma, volcanic)
 * - Cryo: cold-based damage (ice, freeze)
 * - Bio: biological/chemical damage (poison, spores, acid)
 * - Kinetic: physical/impact damage (melee, projectile, explosive)
 */
export type DamageType = 'Thermal' | 'Cryo' | 'Bio' | 'Kinetic';

/**
 * Damage resistance values per damage type.
 * Values represent percentage resistance (0 = neutral, 50 = 50% reduction, -20 = 20% vulnerable).
 * Range enforcement (0.3x floor, 1.5x ceiling) is applied by calculateDamage() in Phase 117.
 */
export interface DamageResistances {
  readonly thermal: number;
  readonly cryo: number;
  readonly bio: number;
  readonly kinetic: number;
}

/**
 * Neutral resistance profile — used as default for creatures not yet assigned biome resistances.
 * Phase 117 will replace these with biome-appropriate values per DMGT-02.
 */
export const NEUTRAL_RESISTANCES: DamageResistances = {
  thermal: 0,
  cryo: 0,
  bio: 0,
  kinetic: 0,
};
