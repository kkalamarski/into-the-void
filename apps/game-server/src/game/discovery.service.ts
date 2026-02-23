import { Injectable, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { discoveredPois, discoveredResources, characters } from '@into-the-void/database';
import {
  DiscoveryReward,
  PoiType,
  POI_BASE_REWARDS,
  BIOME_TIER_MULTIPLIERS,
} from '@into-the-void/shared-types';

export interface DiscoveryResult {
  success: boolean;
  alreadyDiscovered?: boolean;
  reward?: DiscoveryReward;
  error?: string;
}

export interface ResourceDiscoveryData {
  entityId: string;
  rarity: 'rare' | 'epic';
  resourceType: 'mineral' | 'plant';
  zoneId: string;
  worldX: number;
  worldY: number;
  resourceId: string;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Attempt to discover a POI. Returns reward if successful.
   * Records discovery BEFORE granting reward to prevent rollback exploits.
   */
  async attemptDiscovery(
    characterId: string,
    poiId: string,
    poiType: PoiType,
    biome: string
  ): Promise<DiscoveryResult> {
    try {
      const db = this.databaseService.getClient();

      // 1. Check if already discovered
      const existing = await db
        .select()
        .from(discoveredPois)
        .where(
          and(
            eq(discoveredPois.characterId, characterId),
            eq(discoveredPois.poiId, poiId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return { success: false, alreadyDiscovered: true };
      }

      // 2. Record discovery FIRST (anti-exploit: if reward fails, discovery still recorded)
      await db.insert(discoveredPois).values({
        characterId,
        poiId,
        poiType,
      });

      // 3. Calculate reward with biome tier multiplier
      const reward = this.calculateReward(poiType, biome);

      // 4. Grant reward (XP and credits)
      await this.grantReward(characterId, reward);

      this.logger.log(
        `Character ${characterId} discovered ${poiType} POI ${poiId} in ${biome}, reward: ${reward.xp}xp, ${reward.credits}cr`
      );

      return { success: true, reward };
    } catch (error) {
      this.logger.error(`Discovery failed for ${poiId}: ${error}`);
      return { success: false, error: 'Discovery failed' };
    }
  }

  /**
   * Calculate discovery reward based on POI type and biome tier
   */
  private calculateReward(poiType: PoiType, biome: string): DiscoveryReward {
    const base = POI_BASE_REWARDS[poiType];
    const multiplier = BIOME_TIER_MULTIPLIERS[biome] ?? 1.0;

    const reward: DiscoveryReward = {
      xp: Math.floor(base.xp * multiplier),
      credits: Math.floor(base.credits * multiplier),
    };

    // Cache POIs can grant items (future: add loot table roll)
    if (base.hasItemRoll) {
      // TODO: Phase 80 will add loot table integration
      // For now, caches just give extra credits
      reward.credits += Math.floor(50 * multiplier);
    }

    return reward;
  }

  /**
   * Grant XP and credits to character
   */
  private async grantReward(characterId: string, reward: DiscoveryReward): Promise<void> {
    const db = this.databaseService.getClient();

    // Update character XP and credits
    const [character] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId))
      .limit(1);

    if (!character) return;

    await db
      .update(characters)
      .set({
        xp: character.xp + reward.xp,
        credits: character.credits + reward.credits,
      })
      .where(eq(characters.id, characterId));
  }

  /**
   * Get all discovered POI IDs for a character
   */
  async getDiscoveredPoiIds(characterId: string): Promise<string[]> {
    const db = this.databaseService.getClient();

    const discoveries = await db
      .select({ poiId: discoveredPois.poiId })
      .from(discoveredPois)
      .where(eq(discoveredPois.characterId, characterId));

    return discoveries.map((d) => d.poiId);
  }

  /**
   * Check if a specific POI has been discovered
   */
  async isPoiDiscovered(characterId: string, poiId: string): Promise<boolean> {
    const db = this.databaseService.getClient();

    const existing = await db
      .select()
      .from(discoveredPois)
      .where(
        and(
          eq(discoveredPois.characterId, characterId),
          eq(discoveredPois.poiId, poiId)
        )
      )
      .limit(1);

    return existing.length > 0;
  }

  /**
   * Attempt to discover a rare resource node.
   * Records discovery if not already known.
   * Returns true if new discovery, false if already discovered.
   */
  async discoverResource(
    characterId: string,
    data: ResourceDiscoveryData
  ): Promise<boolean> {
    try {
      const db = this.databaseService.getClient();

      // Check if already discovered
      const existing = await db
        .select()
        .from(discoveredResources)
        .where(
          and(
            eq(discoveredResources.characterId, characterId),
            eq(discoveredResources.entityId, data.entityId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return false; // Already discovered
      }

      // Record new discovery
      await db.insert(discoveredResources).values({
        characterId,
        entityId: data.entityId,
        rarity: data.rarity,
        resourceType: data.resourceType,
        zoneId: data.zoneId,
        worldX: data.worldX,
        worldY: data.worldY,
        resourceId: data.resourceId,
      });

      this.logger.log(
        `Character ${characterId} discovered ${data.rarity} ${data.resourceType} ${data.entityId}`
      );

      return true;
    } catch (error) {
      // Unique constraint violation = already discovered (race condition)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        return false;
      }
      this.logger.error(`Resource discovery failed: ${error}`);
      return false;
    }
  }

  /**
   * Get all discovered rare resources for a character.
   * Called on character join to populate client map markers.
   */
  async getDiscoveredResources(characterId: string): Promise<ResourceDiscoveryData[]> {
    const db = this.databaseService.getClient();

    const discoveries = await db
      .select({
        entityId: discoveredResources.entityId,
        rarity: discoveredResources.rarity,
        resourceType: discoveredResources.resourceType,
        zoneId: discoveredResources.zoneId,
        worldX: discoveredResources.worldX,
        worldY: discoveredResources.worldY,
        resourceId: discoveredResources.resourceId,
      })
      .from(discoveredResources)
      .where(eq(discoveredResources.characterId, characterId));

    return discoveries as ResourceDiscoveryData[];
  }

  /**
   * Remove discovery when resource is harvested (optional - for cleanup).
   * Call this when a rare node is fully depleted.
   */
  async removeResourceDiscovery(
    characterId: string,
    entityId: string
  ): Promise<void> {
    const db = this.databaseService.getClient();

    await db
      .delete(discoveredResources)
      .where(
        and(
          eq(discoveredResources.characterId, characterId),
          eq(discoveredResources.entityId, entityId)
        )
      );
  }
}
