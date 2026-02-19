import { Position } from './position';
import { FactionId } from '../game/faction';

/**
 * Player character
 */
export interface Player {
  /** Unique player/character ID */
  id: string;
  /** Account ID this character belongs to */
  accountId: string;
  /** Character name */
  name: string;
  /** Player's faction */
  faction: FactionId;
  /** Current position */
  position: Position;
  /** Current health */
  health: number;
  /** Maximum health */
  maxHealth: number;
  /** Current energy */
  energy: number;
  /** Maximum energy */
  maxEnergy: number;
  /** Character level */
  level: number;
  /** Current experience points */
  xp: number;
  /** XP needed for next level */
  xpToNextLevel: number;
  /** Whether player is in combat */
  inCombat: boolean;
  /** Whether player is online */
  online: boolean;
  /** Whether player is currently dead (awaiting respawn) */
  isDead?: boolean;
  /** Current credits balance */
  credits: number;
}

/**
 * Minimal player data sent to other clients
 */
export interface PlayerPublic {
  id: string;
  name: string;
  faction: FactionId;
  position: Position;
  level: number;
  inCombat: boolean;
  credits: number;
}

/**
 * Canonical 8-stat character stats used by players and creatures.
 * Replaces the legacy 5-stat PlayerStats type.
 */
export interface CharacterStats {
  /** Durability - affects max health and suit HP */
  durability: number;
  /** Toughness - affects damage reduction / armor */
  toughness: number;
  /** Power - affects damage output (replaces legacy strength) */
  power: number;
  /** Haste - affects turn order / action speed (replaces legacy agility) */
  haste: number;
  /** Vigor - affects energy pool and stamina */
  vigor: number;
  /** Recovery - affects regeneration rate */
  recovery: number;
  /** Perception - affects detection range */
  perception: number;
  /** Resilience - affects status-effect resistance */
  resilience: number;
}

/**
 * Determines whether stat scaling targets a player or a creature.
 * Used by computeCharStats() in game-logic.
 */
export type StatScaleTarget = 'player' | 'creature';

/**
 * Player account (can have multiple characters)
 */
export interface Account {
  id: string;
  email: string;
  createdAt: Date;
  lastLoginAt: Date;
}
