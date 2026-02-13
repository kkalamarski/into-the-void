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
