import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  BiomeType,
  BIOME_TIERS,
  TIER_LEVEL_REQUIREMENTS,
  BiomeTier,
  BIOME_DISPLAY_NAMES,
  Position,
} from '@into-the-void/shared-types';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import { createZoneId } from '@into-the-void/game-logic';

export interface ExpeditionDestination {
  biome: BiomeType;
  displayName: string;
  tier: BiomeTier;
  requiredLevel: number;
  locked: boolean;
}

@Injectable()
export class ExpeditionService {
  private server: Server | null = null;

  constructor(
    private readonly playerService: PlayerService,
    private readonly zonesService: ZonesService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Get all expedition destinations with lock status for player's level.
   */
  getDestinations(playerLevel: number): ExpeditionDestination[] {
    // Group biomes by type, exclude hub-only biomes
    const worldBiomes: BiomeType[] = [
      'void_plains',
      'crystal_caves',
      'toxic_wastes',
      'ancient_ruins',
      'frozen_expanse',
      'volcanic_ridge',
      'fungal_forest',
      'starfall_crater',
      'miasma_marshes',
      'petrified_expanse',
      'tidal_pools',
      'kelp_forests',
      'deep_trenches',
      'void_rift',
      'crystalline_wastes',
      'bioluminescent_depths',
    ];

    return worldBiomes.map((biome) => {
      const tier = BIOME_TIERS[biome];
      const requiredLevel = TIER_LEVEL_REQUIREMENTS[tier];
      return {
        biome,
        displayName: BIOME_DISPLAY_NAMES[biome],
        tier,
        requiredLevel,
        locked: playerLevel < requiredLevel,
      };
    }).sort((a, b) => {
      // Sort by tier, then alphabetically
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.displayName.localeCompare(b.displayName);
    });
  }

  /**
   * Start an expedition by selecting a random biome from the given tier.
   * Validates player level meets tier requirement then delegates to startExpedition.
   */
  async startExpeditionByTier(
    playerId: string,
    tier: BiomeTier,
  ): Promise<{
    success: boolean;
    error?: string;
    position?: Position;
    oldZoneId?: string;
    newZoneId?: string;
  }> {
    const player = this.playerService.getPlayerById(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Validate tier range
    if (tier < 1 || tier > 4) {
      return { success: false, error: 'Invalid tier' };
    }

    // Validate player level meets tier requirement
    const requiredLevel = TIER_LEVEL_REQUIREMENTS[tier];
    if (player.level < requiredLevel) {
      return {
        success: false,
        error: `Level ${requiredLevel} required for Tier ${tier} expeditions`,
      };
    }

    // Filter world biomes to those matching the requested tier
    const worldBiomes: BiomeType[] = [
      'void_plains',
      'crystal_caves',
      'toxic_wastes',
      'ancient_ruins',
      'frozen_expanse',
      'volcanic_ridge',
      'fungal_forest',
      'starfall_crater',
      'miasma_marshes',
      'petrified_expanse',
      'tidal_pools',
      'kelp_forests',
      'deep_trenches',
      'void_rift',
      'crystalline_wastes',
      'bioluminescent_depths',
    ];

    const tierBiomes = worldBiomes.filter((biome) => BIOME_TIERS[biome] === tier);

    if (tierBiomes.length === 0) {
      return { success: false, error: 'No biomes available for this tier' };
    }

    // Pick a random biome from the filtered list
    const randomBiome = tierBiomes[Math.floor(Math.random() * tierBiomes.length)];

    return this.startExpedition(playerId, randomBiome);
  }

  /**
   * Start an expedition to a specific biome.
   * Returns the new position or error.
   */
  async startExpedition(
    playerId: string,
    targetBiome: BiomeType,
  ): Promise<{
    success: boolean;
    error?: string;
    position?: Position;
    oldZoneId?: string;
    newZoneId?: string;
  }> {
    const player = this.playerService.getPlayerById(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Verify player level meets tier requirement
    const tier = BIOME_TIERS[targetBiome];
    const requiredLevel = TIER_LEVEL_REQUIREMENTS[tier];
    if (player.level < requiredLevel) {
      return {
        success: false,
        error: `Level ${requiredLevel} required for ${BIOME_DISPLAY_NAMES[targetBiome]}`,
      };
    }

    // Generate a random zone with the target biome
    const destination = await this.findZoneWithBiome(targetBiome);
    if (!destination) {
      return { success: false, error: 'Could not find suitable destination' };
    }

    const oldZoneId = player.position.zoneId;

    // Clear lastWorldPosition - expedition is choosing new exploration
    // (not saving current position like hub:recall does)

    // Update player position
    this.playerService.updatePosition(playerId, destination);

    return {
      success: true,
      position: destination,
      oldZoneId,
      newZoneId: destination.zoneId,
    };
  }

  /**
   * Find a random zone that has the target biome.
   * Searches in expanding rings from origin until biome found.
   */
  private async findZoneWithBiome(targetBiome: BiomeType): Promise<Position | null> {
    const worldSeed = this.zonesService.getWorldSeed();
    const { BiomeGenerator } = await import('@into-the-void/world-gen');
    const biomeGen = new BiomeGenerator(worldSeed);

    // Search in expanding rings from origin
    // Each zone is 64x64 tiles, check center points
    const maxSearchRadius = 50; // Up to 50 zones away
    const candidates: Array<{ zoneX: number; zoneY: number }> = [];

    for (let radius = 1; radius <= maxSearchRadius; radius++) {
      // Check zones at this radius
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check the perimeter of the ring
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

          const worldX = dx * 64 + 32; // Center of zone
          const worldY = dy * 64 + 32;
          const biome = biomeGen.getBiome(worldX, worldY);

          if (biome === targetBiome) {
            candidates.push({ zoneX: dx, zoneY: dy });
          }
        }
      }

      // If we found candidates at this radius, pick one randomly
      if (candidates.length > 0) {
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        const zoneId = createZoneId(selected.zoneX, selected.zoneY);

        // Find a walkable position in the zone
        const spawnPos = await this.findWalkablePosition(zoneId);
        if (spawnPos) {
          return spawnPos;
        }
        // If no walkable position (shouldn't happen), try another candidate
        candidates.splice(candidates.indexOf(selected), 1);
      }
    }

    return null;
  }

  /**
   * Find a walkable spawn position in a zone.
   * Tries center first, then spirals outward.
   */
  private async findWalkablePosition(zoneId: string): Promise<Position | null> {
    // Get zone chunk data
    const chunk = await this.zonesService.getChunk(zoneId);
    if (!chunk) return null;

    // Start from center (32, 32) and spiral outward
    const centerX = 32;
    const centerY = 32;
    const maxRadius = 30;

    for (let radius = 0; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

          const x = centerX + dx;
          const y = centerY + dy;

          // Check bounds
          if (x < 0 || x >= 64 || y < 0 || y >= 64) continue;

          // Check if walkable (no collision)
          if (!chunk.collisions[y]?.[x]) {
            return { x, y, zoneId };
          }
        }
      }
    }

    // Fallback to center even if blocked (shouldn't happen in practice)
    return { x: centerX, y: centerY, zoneId };
  }
}
