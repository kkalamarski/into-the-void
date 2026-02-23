import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { DatabaseService } from '../database/database.service';
import { PlayerService } from './player.service';
import {
  getActiveZoneMastery,
  getAllZoneMastery,
  createZoneMastery,
  updateMasteryObjectives,
  completeMastery,
  grantCharacterReward,
  type MasteryObjectiveJson,
} from '@into-the-void/database';
import {
  MASTERY_TIER_REQUIREMENTS,
  MASTERY_TIERS,
  type MasteryTier,
  type ZoneMasteryProgress,
  type MasteryReward,
} from '@into-the-void/shared-types';

interface PoiDiscoveredPayload {
  characterId: string;
  poiId: string;
  biome: string;
}

interface ResourceGatheredPayload {
  characterId: string;
  category: 'mining' | 'herbalism' | 'archaeology';
  biome: string;
  entityType: string;
}

interface EntityKilledPayload {
  characterId: string;
  entityId: string;
  entityType: string;
  creatureLevel: number;
  zoneId: string;
}

@Injectable()
export class ZoneMasteryService {
  private server: Server | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly playerService: PlayerService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Handle POI discovery - update discover_pois objective
   */
  @OnEvent('poi.discovered')
  async handlePoiDiscovered(payload: PoiDiscoveredPayload): Promise<void> {
    try {
      await this.updateObjective(payload.characterId, payload.biome, 'discover_pois', 1);
    } catch (error) {
      console.error('[ZoneMasteryService] Error handling poi.discovered:', error);
    }
  }

  /**
   * Handle resource gathering - update gather_resources objective
   */
  @OnEvent('resource.gathered')
  async handleResourceGathered(payload: ResourceGatheredPayload): Promise<void> {
    try {
      await this.updateObjective(payload.characterId, payload.biome, 'gather_resources', 1);
    } catch (error) {
      console.error('[ZoneMasteryService] Error handling resource.gathered:', error);
    }
  }

  /**
   * Handle creature kill - update kill_creatures objective
   * Note: Uses zoneId as biome proxy (extract biome from zone service if needed)
   */
  @OnEvent('entity.killed')
  async handleEntityKilled(payload: EntityKilledPayload): Promise<void> {
    try {
      // Only track creature kills (not minerals/plants)
      if (!payload.entityType.startsWith('creature_')) return;

      // zoneId may be biome or need resolution - for now use directly
      const biome = payload.zoneId;
      await this.updateObjective(payload.characterId, biome, 'kill_creatures', 1);
    } catch (error) {
      console.error('[ZoneMasteryService] Error handling entity.killed:', error);
    }
  }

  /**
   * Update a mastery objective, auto-initializing if needed
   */
  private async updateObjective(
    characterId: string,
    biome: string,
    objectiveType: 'discover_pois' | 'gather_resources' | 'kill_creatures',
    increment: number
  ): Promise<void> {
    const db = this.databaseService.getClient();

    // Get or create active mastery for this biome
    const mastery = await getActiveZoneMastery(db, characterId, biome);

    let masteryId: string;
    let masteryTier: string;
    let currentObjectives: MasteryObjectiveJson[];

    if (!mastery) {
      // Auto-initialize Bronze tier
      const initialized = await this.initializeMastery(characterId, biome, 'bronze');
      masteryId = initialized.id;
      masteryTier = initialized.tier;
      currentObjectives = initialized.objectives;
    } else {
      masteryId = mastery.id;
      masteryTier = mastery.tier;
      currentObjectives = mastery.objectives;
    }

    // Update the relevant objective
    let changed = false;
    const updatedObjectives = currentObjectives.map((obj) => {
      if (obj.objectiveType === objectiveType && !obj.complete) {
        const newCurrent = Math.min(obj.current + increment, obj.required);
        if (newCurrent !== obj.current) {
          changed = true;
          return { ...obj, current: newCurrent, complete: newCurrent >= obj.required };
        }
      }
      return obj;
    });

    if (!changed) return;

    // Persist update
    await updateMasteryObjectives(db, masteryId, updatedObjectives);

    // Emit progress update
    this.emitProgress(characterId, biome, masteryTier as MasteryTier, updatedObjectives);

    // Check for tier completion
    const allComplete = updatedObjectives.every(obj => obj.complete);
    if (allComplete) {
      await this.completeTier(characterId, biome, masteryId, masteryTier as MasteryTier);
    }
  }

  /**
   * Initialize mastery for a biome at specified tier
   */
  private async initializeMastery(
    characterId: string,
    biome: string,
    tier: MasteryTier
  ): Promise<{ id: string; objectives: MasteryObjectiveJson[]; tier: string }> {
    const db = this.databaseService.getClient();
    const requirements = MASTERY_TIER_REQUIREMENTS[tier];

    const objectives: MasteryObjectiveJson[] = [
      {
        objectiveType: 'discover_pois',
        description: `Discover ${requirements.pois} points of interest`,
        current: 0,
        required: requirements.pois,
        complete: false,
      },
      {
        objectiveType: 'gather_resources',
        description: `Gather ${requirements.resources} resources`,
        current: 0,
        required: requirements.resources,
        complete: false,
      },
      {
        objectiveType: 'kill_creatures',
        description: `Defeat ${requirements.kills} creatures`,
        current: 0,
        required: requirements.kills,
        complete: false,
      },
    ];

    const created = await createZoneMastery(db, {
      characterId,
      biome,
      tier,
      objectives,
    });

    return { id: created.id, objectives, tier };
  }

  /**
   * Complete a mastery tier and potentially start next tier
   */
  private async completeTier(
    characterId: string,
    biome: string,
    masteryId: string,
    tier: MasteryTier
  ): Promise<void> {
    const db = this.databaseService.getClient();

    // Mark current tier as complete
    await completeMastery(db, masteryId);

    // Grant rewards
    const rewards = await this.grantTierRewards(characterId, biome, tier);

    // Emit completion event
    this.emitCompleted(characterId, biome, tier, rewards);

    // Start next tier if not gold
    const tierIndex = MASTERY_TIERS.indexOf(tier);
    if (tierIndex < MASTERY_TIERS.length - 1) {
      const nextTier = MASTERY_TIERS[tierIndex + 1];
      await this.initializeMastery(characterId, biome, nextTier);
    }
  }

  /**
   * Grant rewards for completing a mastery tier
   */
  private async grantTierRewards(
    characterId: string,
    biome: string,
    tier: MasteryTier
  ): Promise<MasteryReward[]> {
    const db = this.databaseService.getClient();
    const rewards: MasteryReward[] = [];

    // Title reward for each tier
    const titleId = `title_${biome}_${tier}`;
    const titleName = this.getTitleName(biome, tier);

    const granted = await grantCharacterReward(db, {
      characterId,
      rewardType: 'title',
      rewardId: titleId,
      source: `zone_mastery_${biome}_${tier}`,
    });

    if (granted) {
      rewards.push({
        rewardType: 'title',
        rewardId: titleId,
        displayName: titleName,
      });
    }

    return rewards;
  }

  /**
   * Generate display name for mastery title
   */
  private getTitleName(biome: string, tier: MasteryTier): string {
    const biomeNames: Record<string, string> = {
      void_plains: 'Void',
      crystal_caves: 'Crystal',
      toxic_wastes: 'Wasteland',
      ancient_ruins: 'Ancient',
      frozen_expanse: 'Frost',
      volcanic_ridge: 'Volcanic',
      fungal_forest: 'Fungal',
      starfall_crater: 'Starfall',
      miasma_marshes: 'Miasma',
      petrified_expanse: 'Petrified',
    };

    const tierTitles: Record<MasteryTier, string> = {
      bronze: 'Explorer',
      silver: 'Pioneer',
      gold: 'Master',
    };

    const biomeName = biomeNames[biome] || biome;
    return `${biomeName} ${tierTitles[tier]}`;
  }

  /**
   * Get current mastery progress for a character
   */
  async getMasteryForCharacter(characterId: string): Promise<Map<string, ZoneMasteryProgress>> {
    const db = this.databaseService.getClient();
    const allMastery = await getAllZoneMastery(db, characterId);

    const progressMap = new Map<string, ZoneMasteryProgress>();
    for (const m of allMastery) {
      // Only include active (incomplete) or most recently completed per biome
      const existing = progressMap.get(m.biome);
      if (!existing || !m.completedAt) {
        progressMap.set(m.biome, {
          biome: m.biome,
          tier: m.tier as MasteryTier,
          objectives: m.objectives,
          completedAt: m.completedAt?.getTime(),
        });
      }
    }

    return progressMap;
  }

  private emitProgress(
    characterId: string,
    biome: string,
    tier: MasteryTier,
    objectives: MasteryObjectiveJson[]
  ): void {
    if (!this.server) return;
    const socketId = this.playerService.getSocketByPlayerId(characterId);
    if (!socketId) return;

    this.server.to(socketId).emit('mastery:progress', {
      biome,
      progress: {
        biome,
        tier,
        objectives: objectives.map(o => ({
          objectiveType: o.objectiveType,
          description: o.description,
          current: o.current,
          required: o.required,
          complete: o.complete,
        })),
      },
    });
  }

  private emitCompleted(
    characterId: string,
    biome: string,
    tier: MasteryTier,
    rewards: MasteryReward[]
  ): void {
    if (!this.server) return;
    const socketId = this.playerService.getSocketByPlayerId(characterId);
    if (!socketId) return;

    this.server.to(socketId).emit('mastery:completed', {
      biome,
      tier,
      rewards,
    });
  }
}
