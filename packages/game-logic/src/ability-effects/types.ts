import type { AbilityDefinition, AbilityEffect, Buff, ItemEntity } from '@into-the-void/shared-types';

/**
 * Services facade — ability.service passes these so strategies can interact
 * with game state without being @Injectable() NestJS services themselves.
 */
export interface EffectServices {
  /** Get player by socket ID */
  getPlayerBySocket(socketId: string): PlayerRef | undefined;
  /** Get player by player ID */
  getPlayerById(playerId: string): PlayerRef | undefined;
  /** Update player health */
  updateHealth(playerId: string, health: number): void;
  /** Update player energy */
  updateEnergy(playerId: string, energy: number): void;
  /** Grant XP to player */
  grantXp(playerId: string, xp: number): void;
  /** Get socket ID for a player */
  getSocketByPlayerId(playerId: string): string | undefined;

  /** Get entity from zone */
  getEntity(zoneId: string, entityId: string): Promise<any | undefined>;
  /** Get all entities in zone */
  getZoneEntities(zoneId: string): Promise<any[]>;
  /** Update entity in zone */
  updateEntity(zoneId: string, entityId: string, changes: Record<string, any>): Promise<void>;
  /** Record entity kill for respawn scheduling */
  recordEntityKill(entityId: string, zoneId: string, respawnSeconds: number): Promise<void>;

  /** Get player inventory */
  getInventory(playerId: string): any | undefined;

  /** Handle tool use for gathering */
  handleToolUse(socketId: string, targetEntityId: string, finalYield: number): Promise<{ success: boolean; error?: string; entityChanges?: Record<string, any>; groundItems?: any[] }>;
  /** Spawn ground items from combat loot */
  spawnGroundItemsForCombat(loot: any[], x: number, y: number, zoneId: string): Promise<ItemEntity[]>;

  /** Provoke creature (omnivore aggro) */
  provokeCreature(zoneId: string, creatureId: string): Promise<void>;
  /** Start creature combat AI against player */
  startCreatureCombat(creatureId: string, playerId: string, zoneId: string): Promise<void>;
  /** Stop creature combat AI */
  stopCreatureCombat(creatureId: string): void;

  /** Emit domain event */
  emitEvent(event: string, payload: Record<string, any>): void;

  /** Broadcast Socket.IO event to zone */
  emitToZone(zoneId: string, event: string, payload: Record<string, any>): void;
  /** Emit Socket.IO event to specific socket */
  emitToSocket(socketId: string, event: string, payload: Record<string, any>): void;

  /** Get active buffs for player */
  getActiveBuffs(playerId: string): Buff[];
  /** Apply buff to player */
  applyBuff(playerId: string, buff: Buff): void;

  /** Shield state access */
  setShield(playerId: string, shield: { absorbRemaining: number; maxAbsorb: number; expiresAt: number }): void;
  /** Damage reduction state access */
  setDamageReduction(playerId: string, dr: { reductionPercent: number; expiresAt: number }): void;
  /** Stun state access */
  setStunnedCreature(creatureId: string, expiresAt: number): void;
  deleteStunnedCreature(creatureId: string): void;
  /** Hazard immunity state access */
  setHazardImmunity(playerId: string, expiresAt: number): void;
  /** Reflect state access */
  setReflect(playerId: string, reflect: { reflectPercent: number; expiresAt: number }): void;
}

/**
 * Minimal player reference — just the fields effect strategies need.
 */
export interface PlayerRef {
  id: string;
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  energy: number;
  position: { x: number; y: number; zoneId: string };
  px: number;
  py: number;
}

/**
 * Context passed to every effect strategy's apply() method.
 */
export interface EffectContext {
  /** The specific effect being applied */
  effect: AbilityEffect;
  /** The full ability definition */
  ability: AbilityDefinition;
  /** Socket ID of the caster */
  socketId: string;
  /** Caster player reference */
  player: PlayerRef;
  /** Target entity ID (if ability requires target) */
  targetEntityId?: string;
  /** Tool stats from equipped item (for gather effects) */
  toolStats: { yieldBonus: number; gatherSpeed: number };
  /** Services facade for game state interaction */
  services: EffectServices;
}

/**
 * Result returned by each effect strategy's apply() method.
 * ability.service aggregates results from all effects in an ability.
 */
export interface EffectResult {
  /** Whether the effect applied successfully */
  success: boolean;
  /** Error message if unsuccessful */
  error?: string;
  /** Damage dealt (for damage effects) */
  damage?: number;
  /** Target's remaining health after effect */
  targetHealth?: number;
  /** Target's max health (for UI) */
  targetMaxHealth?: number;
  /** If true, abort remaining effects and return this result immediately (e.g., gather failure) */
  earlyReturn?: boolean;
}

/**
 * Strategy interface — one implementation per effect type.
 * Plain TypeScript class, NOT an @Injectable() NestJS service.
 */
export interface EffectStrategy {
  /** Apply this effect. Called once per effect entry in an ability's effects array. */
  apply(context: EffectContext): Promise<EffectResult>;
}
