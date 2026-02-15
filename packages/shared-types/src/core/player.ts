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
}

/**
 * Player stats
 */
export interface PlayerStats {
  /** Strength - affects melee damage */
  strength: number;
  /** Agility - affects dodge chance and movement */
  agility: number;
  /** Endurance - affects max health and stamina */
  endurance: number;
  /** Intelligence - affects ability power */
  intelligence: number;
  /** Perception - affects detection range */
  perception: number;
}

/**
 * Player account (can have multiple characters)
 */
export interface Account {
  id: string;
  email: string;
  createdAt: Date;
  lastLoginAt: Date;
}
