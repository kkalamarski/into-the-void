/**
 * Faction identifiers
 */
export type FactionId =
  | 'verdant'
  | 'helix'
  | 'nexus'
  | 'neutral';

/**
 * Faction type classification
 */
export type FactionType = 'corporate' | 'rebel' | 'ai' | 'independent';

/**
 * Faction data
 */
export interface Faction {
  /** Faction identifier */
  id: FactionId;
  /** Display name */
  name: string;
  /** Faction type */
  type: FactionType;
  /** Description */
  description: string;
  /** Starting bonuses */
  bonuses: FactionBonuses;
}

/**
 * Faction-specific bonuses
 */
export interface FactionBonuses {
  /** Combat damage modifier (1.0 = 100%) */
  combatModifier: number;
  /** Resource gathering modifier */
  gatheringModifier: number;
  /** Crafting speed modifier */
  craftingModifier: number;
  /** Special ability */
  specialAbility: string;
}

/**
 * Faction relationship status
 */
export type FactionRelation = 'allied' | 'friendly' | 'neutral' | 'hostile' | 'war';

/**
 * Faction standings between factions
 */
export interface FactionStandings {
  factionA: FactionId;
  factionB: FactionId;
  relation: FactionRelation;
  /** Numeric standing (-100 to 100) */
  standing: number;
}
