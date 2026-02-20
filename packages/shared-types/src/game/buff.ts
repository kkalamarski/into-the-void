/**
 * Temporary buff applied to a player by an ability.
 * Buffs modify CharacterStats for a duration and expire automatically.
 */
export interface Buff {
  /** Unique instance ID for this buff */
  id: string;
  /** Source ability that applied this buff */
  abilityId: string;
  /** CharacterStats key to modify (e.g., 'toughness', 'power') */
  stat: string;
  /** Amount to add to the stat (positive for buff, negative for debuff) */
  amount: number;
  /** Timestamp when this buff expires (Date.now() + duration) */
  expiresAt: number;
  /** Display name for UI (typically ability name) */
  displayName: string;
  /** Hex color for buff icon background (e.g., 0x00ff00 for green) */
  iconColor: number;
}
