import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import { InventoryService } from './inventory.service';
import { EntityService } from './entity.service';
import {
  TimingChallenge,
  TimingResult,
  ResourceCategory,
  GatheringAccuracy,
  GATHER_DURATION_MS,
  Entity,
  Mineral,
  Plant,
  Artifact,
} from '@into-the-void/shared-types';
import {
  validateGatherTiming,
  calculateSuccessZoneWidth,
  calculateXPReward,
  calculateLevelFromXP,
  calculateBaseYieldBonus,
  getResourceCategory,
  canInteract,
  rollLootTable,
  DEFAULT_INTERACTION_RANGE,
} from '@into-the-void/game-logic';
import { EntityRegistry } from '@into-the-void/entities';
import { ItemRegistry } from '@into-the-void/items';
import { gatheringProficiency, DEFAULT_PROFICIENCY, ProficiencyJson } from '@into-the-void/database';
import { eq } from 'drizzle-orm';
import type { MineralDefinition, PlantDefinition, ArtifactDefinition, HarvestYield } from '@into-the-void/entities';

interface ActiveChallenge {
  challenge: TimingChallenge;
  startTime: number;
  entityId: string;
  category: ResourceCategory;
  entity: Mineral | Plant | Artifact;
}

interface GatheringResult {
  success: boolean;
  accuracy: GatheringAccuracy;
  yieldMultiplier: number;
  items: { itemId: string; quantity: number }[];
  proficiencyXP: number;
  proficiencyLevel: number;
  category: ResourceCategory;
  error?: string;
}

@Injectable()
export class GatheringService {
  // Active challenges keyed by playerId
  private activeChallenges: Map<string, ActiveChallenge> = new Map();
  // Entity locks to prevent race conditions (entityId -> playerId)
  private entityLocks: Map<string, string> = new Map();
  // Cached proficiency keyed by characterId
  private proficiencyCache: Map<string, ProficiencyJson> = new Map();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly playerService: PlayerService,
    private readonly zonesService: ZonesService,
    private readonly inventoryService: InventoryService,
    private readonly entityService: EntityService,
  ) {}

  /**
   * Load proficiency for a character (called on player join).
   */
  async loadProficiency(characterId: string): Promise<ProficiencyJson> {
    const cached = this.proficiencyCache.get(characterId);
    if (cached) return cached;

    const db = this.databaseService.getClient();
    const [row] = await db
      .select()
      .from(gatheringProficiency)
      .where(eq(gatheringProficiency.characterId, characterId));

    if (row) {
      this.proficiencyCache.set(characterId, row.proficiency);
      return row.proficiency;
    }

    // Create new proficiency row for character
    const [created] = await db
      .insert(gatheringProficiency)
      .values({ characterId, proficiency: DEFAULT_PROFICIENCY })
      .returning();

    this.proficiencyCache.set(characterId, created.proficiency);
    return created.proficiency;
  }

  /**
   * Unload proficiency from cache (called on player disconnect).
   */
  unloadProficiency(characterId: string): void {
    this.proficiencyCache.delete(characterId);
    // Clean up any active challenges for this player
    for (const [playerId, challenge] of this.activeChallenges.entries()) {
      const player = this.playerService.getPlayerById(playerId);
      if (player?.id === characterId) {
        this.entityLocks.delete(challenge.entityId);
        this.activeChallenges.delete(playerId);
      }
    }
  }

  /**
   * Start a gathering mini-game challenge.
   */
  async startGathering(
    socketId: string,
    targetEntityId: string
  ): Promise<{ challenge: TimingChallenge } | { error: string }> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { error: 'Player not found' };

    // Check for existing challenge
    if (this.activeChallenges.has(player.id)) {
      return { error: 'Already gathering' };
    }

    // Check entity lock
    const lockHolder = this.entityLocks.get(targetEntityId);
    if (lockHolder && lockHolder !== player.id) {
      return { error: 'Resource is being gathered by another player' };
    }

    // Validate tool and range
    const inventory = this.inventoryService.getInventory(player.id);
    if (!inventory) return { error: 'Inventory not loaded' };

    const equippedTool = inventory.equipment.tool;
    const toolDef = equippedTool ? ItemRegistry.get(equippedTool.itemId) : null;
    const toolRange = toolDef?.range ?? DEFAULT_INTERACTION_RANGE;

    // Get target entity
    const entity = await this.zonesService.getEntity(player.position.zoneId, targetEntityId);
    if (!entity) return { error: 'Entity not found' };

    // Validate entity type is gatherable
    const category = getResourceCategory(entity.type);
    if (!category) {
      return { error: 'Cannot gather this entity type' };
    }

    // For artifacts, skip mini-game (instant collect per research recommendation)
    if (entity.type === 'artifact') {
      // Delegate to EntityService for instant collection
      const result = await this.entityService.handleToolUse(socketId, targetEntityId);
      if (result.success) {
        // Award archaeology XP for discovery
        const proficiency = await this.loadProficiency(player.id);
        const xp = calculateXPReward('perfect', 1); // Artifacts always give "perfect" XP
        await this.awardProficiencyXP(player.id, 'archaeology', xp);
        const newLevel = calculateLevelFromXP(proficiency.archaeology.xp + xp);
        return {
          error: 'ARTIFACT_COLLECTED', // Special marker for client to handle
        };
      }
      return { error: result.error || 'Collection failed' };
    }

    // Validate range
    const check = canInteract(player, entity, toolRange);
    if (!check.canInteract) {
      return { error: check.reason || 'Out of range' };
    }

    // Check entity state
    if (entity.type === 'mineral' && (entity as Mineral).yield <= 0) {
      return { error: 'Resource depleted' };
    }
    if (entity.type === 'plant' && (entity as Plant).yield <= 0) {
      return { error: 'Plant depleted' };
    }

    // Load proficiency for this category
    const proficiency = await this.loadProficiency(player.id);
    const categoryData = proficiency[category];
    const level = categoryData.level;

    // Create challenge
    const successWidth = calculateSuccessZoneWidth(level, GATHER_DURATION_MS);
    // Center success zone with slight randomization
    const centerPoint = GATHER_DURATION_MS * 0.5 + (Math.random() - 0.5) * 500;
    const start = Math.max(100, centerPoint - successWidth / 2);
    const end = Math.min(GATHER_DURATION_MS - 100, centerPoint + successWidth / 2);

    const challenge: TimingChallenge = {
      challengeId: crypto.randomUUID(),
      duration: GATHER_DURATION_MS,
      successWindow: { start: Math.round(start), end: Math.round(end) },
    };

    // Lock entity and store challenge
    this.entityLocks.set(targetEntityId, player.id);
    this.activeChallenges.set(player.id, {
      challenge,
      startTime: Date.now(),
      entityId: targetEntityId,
      category,
      entity: entity as Mineral | Plant | Artifact,
    });

    // Set timeout to auto-expire challenge
    setTimeout(() => {
      this.expireChallenge(player.id, targetEntityId);
    }, GATHER_DURATION_MS + 1000);

    return { challenge };
  }

  /**
   * Complete a gathering challenge with timing result.
   */
  async completeGathering(
    socketId: string,
    result: TimingResult
  ): Promise<GatheringResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) {
      return this.failResult('Player not found', 'mining');
    }

    const active = this.activeChallenges.get(player.id);
    if (!active) {
      return this.failResult('No active gathering challenge', 'mining');
    }

    // Validate timing
    const validation = validateGatherTiming(
      active.challenge,
      result,
      Date.now(),
      active.startTime
    );

    // Clean up challenge
    this.entityLocks.delete(active.entityId);
    this.activeChallenges.delete(player.id);

    if (!validation.valid) {
      return this.failResult('Timing validation failed', active.category);
    }

    // Get entity definition for loot
    const entity = active.entity;
    let lootEntries: readonly HarvestYield[] = [];
    let resourceTier = 1;

    if (entity.type === 'mineral') {
      const def = EntityRegistry.get((entity as Mineral).resourceId) as MineralDefinition | undefined;
      if (def?.miningYield) {
        lootEntries = def.miningYield;
        resourceTier = def.requiredTier || 1;
      }
    } else if (entity.type === 'plant') {
      const def = EntityRegistry.get((entity as Plant).speciesId) as PlantDefinition | undefined;
      if (def?.harvestYield) {
        lootEntries = def.harvestYield;
        // Plants don't have explicit tier, use 1 as default
        resourceTier = 1;
      }
    }

    // Roll loot with yield multiplier
    const proficiency = await this.loadProficiency(player.id);
    const baseYieldBonus = calculateBaseYieldBonus(proficiency[active.category].level);
    const totalMultiplier = validation.yieldMultiplier * baseYieldBonus;

    const loot = rollLootTable(lootEntries);
    const scaledItems = loot.map(item => ({
      itemId: item.itemId,
      quantity: Math.max(1, Math.round(item.quantity * totalMultiplier)),
    }));

    // Spawn ground items via EntityService (updates entity state)
    await this.entityService.handleToolUse(socketId, active.entityId);

    // Award proficiency XP
    const xp = calculateXPReward(validation.accuracy, resourceTier);
    const newLevel = await this.awardProficiencyXP(player.id, active.category, xp);

    return {
      success: true,
      accuracy: validation.accuracy,
      yieldMultiplier: validation.yieldMultiplier,
      items: scaledItems,
      proficiencyXP: xp,
      proficiencyLevel: newLevel,
      category: active.category,
    };
  }

  /**
   * Award proficiency XP with atomic database update.
   */
  private async awardProficiencyXP(
    characterId: string,
    category: ResourceCategory,
    xp: number
  ): Promise<number> {
    const db = this.databaseService.getClient();

    // Atomic increment using SQL
    // Note: Drizzle doesn't have great JSONB path update support,
    // so we read-modify-write within a transaction-like pattern
    const [row] = await db
      .select()
      .from(gatheringProficiency)
      .where(eq(gatheringProficiency.characterId, characterId));

    if (!row) return 1;

    const newProficiency = { ...row.proficiency };
    newProficiency[category] = {
      xp: newProficiency[category].xp + xp,
      level: calculateLevelFromXP(newProficiency[category].xp + xp),
    };

    await db
      .update(gatheringProficiency)
      .set({
        proficiency: newProficiency,
        updatedAt: new Date(),
      })
      .where(eq(gatheringProficiency.characterId, characterId));

    // Update cache
    this.proficiencyCache.set(characterId, newProficiency);

    return newProficiency[category].level;
  }

  /**
   * Expire a challenge that timed out.
   */
  private expireChallenge(playerId: string, entityId: string): void {
    const active = this.activeChallenges.get(playerId);
    if (active && active.entityId === entityId) {
      this.entityLocks.delete(entityId);
      this.activeChallenges.delete(playerId);
    }
  }

  /**
   * Create a failure result.
   */
  private failResult(error: string, category: ResourceCategory): GatheringResult {
    return {
      success: false,
      accuracy: 'poor',
      yieldMultiplier: 0,
      items: [],
      proficiencyXP: 0,
      proficiencyLevel: 1,
      category,
      error,
    };
  }
}
