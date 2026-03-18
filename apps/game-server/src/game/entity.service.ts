import { Injectable } from '@nestjs/common';
import { ZonesService } from '../zones/zones.service';
import { InventoryService } from './inventory.service';
import { PlayerService } from './player.service';
import { DatabaseService } from '../database/database.service';
import {
  Entity,
  ItemEntity,
  Mineral,
  Plant,
  Artifact,
  Creature,
} from '@into-the-void/shared-types';
import {
  canInteractPixel,
  canInteractLevel,
  rollLootTable,
  getCreatureLoot,
  DEFAULT_INTERACTION_RANGE,
  GATHER_RANGE_PX,
} from '@into-the-void/game-logic';
import { EntityRegistry } from '@into-the-void/entities';
import type { MineralDefinition, PlantDefinition, CreatureDefinition } from '@into-the-void/entities';
import { ItemRegistry } from '@into-the-void/items';
import { groundItems } from '@into-the-void/database';
import { eq } from 'drizzle-orm';

interface ToolUseResult {
  success: boolean;
  error?: string;
  zoneId?: string;
  // Use Record<string, unknown> to allow subtype fields (health, yield, etc.)
  // that are not present on the base Entity interface
  entityChanges?: Record<string, unknown>;
  groundItems?: ItemEntity[];
}

/**
 * Apply +/-25% random variance to respawn time.
 * RESP-02: Randomized delay prevents predictable farming patterns.
 */
function applyRespawnVariance(baseSeconds: number): number {
  const variance = baseSeconds * 0.25;
  const offset = (Math.random() * 2 - 1) * variance; // -25% to +25%
  return Math.round(baseSeconds + offset);
}

@Injectable()
export class EntityService {
  constructor(
    private readonly zonesService: ZonesService,
    private readonly inventoryService: InventoryService,
    private readonly playerService: PlayerService,
    private readonly databaseService: DatabaseService,
  ) {}

  async handleToolUse(
    socketId: string,
    targetEntityId: string,
    yieldMultiplier?: number,
  ): Promise<ToolUseResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    // Get equipped tool and its range
    const inventory = this.inventoryService.getInventory(player.id);
    if (!inventory) return { success: false, error: 'Inventory not loaded' };

    const equippedTool = inventory.equipment.tool;
    const toolDef = equippedTool ? ItemRegistry.get(equippedTool.itemId) : null;
    const toolRange = toolDef?.range ?? DEFAULT_INTERACTION_RANGE;

    // Get target entity
    const entity = await this.zonesService.getEntity(player.position.zoneId, targetEntityId);
    if (!entity) return { success: false, error: 'Entity not found' };

    // Validate range (pixel distance, DIST-02)
    const check = canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX);
    if (!check.canInteract) {
      return { success: false, error: check.reason };
    }

    // INTR-07: Level gating — player cannot interact with creatures more than 5 levels higher
    if (entity.type === 'creature') {
      const creature = entity as Creature;
      if (!canInteractLevel(player.level, creature.level)) {
        return {
          success: false,
          error: `Cannot interact — creature level ${creature.level} exceeds your level by more than 5`,
        };
      }
    }

    // Default to 1.0 for backward compatibility
    const multiplier = yieldMultiplier ?? 1.0;

    // Route by entity type
    switch (entity.type) {
      case 'mineral':
        return this.handleMine(player, entity as Mineral, multiplier);
      case 'plant':
        return this.handleHarvest(player, entity as Plant, multiplier);
      case 'creature':
        return this.handleAttack(player, entity as Creature);
      case 'artifact':
        return this.handleCollect(player, entity as Artifact);
      default:
        return { success: false, error: 'Cannot use tool on this entity' };
    }
  }

  private async handleMine(
    player: { id: string; position: { x: number; y: number; zoneId: string } },
    mineral: Mineral,
    yieldMultiplier: number = 1.0,
  ): Promise<ToolUseResult> {
    if (mineral.yield <= 0) {
      return { success: false, error: 'Resource depleted' };
    }

    // Decrement yield (minimum 1 to ensure progress)
    const yieldAmount = Math.max(1, Math.floor(yieldMultiplier));
    mineral.yield -= yieldAmount;
    const depleted = mineral.yield <= 0;

    if (depleted) {
      mineral.active = false;
      // Get mineral definition for loot
      const def = EntityRegistry.get(mineral.resourceId) as MineralDefinition | undefined;
      if (def?.miningYield) {
        const loot = rollLootTable(def.miningYield, yieldMultiplier);
        const groundItemEntities = await this.spawnGroundItems(
          loot,
          mineral.position.x,
          mineral.position.y,
          mineral.position.zoneId,
        );
        // Record entity kill for respawn with +/-25% variance
        const respawnSeconds = applyRespawnVariance(def.respawnSeconds);
        await this.zonesService.recordEntityKill(mineral.id, mineral.position.zoneId, respawnSeconds);
        return {
          success: true,
          zoneId: mineral.position.zoneId,
          entityChanges: { yield: 0, active: false },
          groundItems: groundItemEntities,
        };
      }
    }

    return {
      success: true,
      zoneId: mineral.position.zoneId,
      entityChanges: { yield: mineral.yield },
    };
  }

  private async handleHarvest(
    player: { id: string; position: { x: number; y: number; zoneId: string } },
    plant: Plant,
    yieldMultiplier: number = 1.0,
  ): Promise<ToolUseResult> {
    if (plant.yield <= 0) {
      return { success: false, error: 'Plant depleted' };
    }

    // Decrement yield (minimum 1 to ensure progress)
    const yieldAmount = Math.max(1, Math.floor(yieldMultiplier));
    plant.yield -= yieldAmount;
    const depleted = plant.yield <= 0;

    if (depleted) {
      plant.active = false;
      const def = EntityRegistry.get(plant.speciesId) as PlantDefinition | undefined;
      if (def?.harvestYield) {
        const loot = rollLootTable(def.harvestYield, yieldMultiplier);
        const groundItemEntities = await this.spawnGroundItems(
          loot,
          plant.position.x,
          plant.position.y,
          plant.position.zoneId,
        );
        // Record entity kill for respawn with +/-25% variance
        const respawnSeconds = applyRespawnVariance(def.respawnSeconds);
        await this.zonesService.recordEntityKill(plant.id, plant.position.zoneId, respawnSeconds);
        return {
          success: true,
          zoneId: plant.position.zoneId,
          entityChanges: { yield: 0, active: false },
          groundItems: groundItemEntities,
        };
      }
    }

    return {
      success: true,
      zoneId: plant.position.zoneId,
      entityChanges: { yield: plant.yield },
    };
  }

  private async handleAttack(
    player: { id: string; position: { x: number; y: number; zoneId: string } },
    creature: Creature,
  ): Promise<ToolUseResult> {
    if (creature.health <= 0) {
      return { success: false, error: 'Creature already dead' };
    }

    // Simple damage model: 10 damage per tool use (combat system expansion is future work)
    const damage = 10;
    creature.health = Math.max(0, creature.health - damage);
    const dead = creature.health <= 0;

    if (dead) {
      creature.active = false;
      // Get creature definition for loot resolution chain:
      // creature.speciesId -> EntityRegistry.get() -> def.lootTableId -> getCreatureLoot() -> rollLootTable()
      const def = EntityRegistry.get(creature.speciesId) as CreatureDefinition | undefined;
      if (def) {
        const lootEntries = getCreatureLoot(def.lootTableId);
        const loot = rollLootTable(lootEntries);
        const groundItemEntities = await this.spawnGroundItems(
          loot,
          creature.position.x,
          creature.position.y,
          creature.position.zoneId,
        );
        // Use per-creature respawnSeconds with +/-25% variance (RESP-02)
        const respawnSeconds = applyRespawnVariance(def.respawnSeconds);
        await this.zonesService.recordEntityKill(creature.id, creature.position.zoneId, respawnSeconds);
        return {
          success: true,
          zoneId: creature.position.zoneId,
          entityChanges: { health: 0, active: false },
          groundItems: groundItemEntities,
        };
      }
    }

    return {
      success: true,
      zoneId: creature.position.zoneId,
      entityChanges: { health: creature.health },
    };
  }

  private async handleCollect(
    player: { id: string; position: { x: number; y: number; zoneId: string } },
    artifact: Artifact,
  ): Promise<ToolUseResult> {
    if (!artifact.active) {
      return { success: false, error: 'Artifact already collected' };
    }

    artifact.active = false;

    // Artifact spawns itself as a ground item (the artifact IS the loot)
    const def = EntityRegistry.get(artifact.artifactId);
    // Use lootTableId to find corresponding item, or fall back to artifact ID pattern
    const itemId = def?.lootTableId?.replace('loot_', '') || artifact.artifactId;
    const groundItem: ItemEntity = {
      id: `item_${crypto.randomUUID()}`,
      type: 'item',
      name: artifact.name,
      position: { ...artifact.position },
      active: true,
      itemId,
      quantity: 1,
      despawnAt: Date.now() + 5 * 60 * 1000,
    };

    await this.zonesService.spawnEntity(artifact.position.zoneId, groundItem);
    await this.persistGroundItem(groundItem);

    // Record as FAR_FUTURE (permanent removal)
    await this.zonesService.recordEntityKill(artifact.id, artifact.position.zoneId, 0, true);

    return {
      success: true,
      zoneId: artifact.position.zoneId,
      entityChanges: { active: false },
      groundItems: [groundItem],
    };
  }

  /**
   * Public wrapper for spawning ground items from combat kills.
   * Called by CombatService when a creature dies via auto-attack.
   */
  async spawnGroundItemsForCombat(
    loot: { instanceId: string; itemId: string; quantity: number }[],
    x: number,
    y: number,
    zoneId: string,
  ): Promise<ItemEntity[]> {
    return this.spawnGroundItems(loot, x, y, zoneId);
  }

  private async spawnGroundItems(
    loot: { instanceId: string; itemId: string; quantity: number }[],
    x: number,
    y: number,
    zoneId: string,
  ): Promise<ItemEntity[]> {
    const result: ItemEntity[] = [];
    for (const item of loot) {
      const itemDef = ItemRegistry.get(item.itemId);
      const groundItem: ItemEntity = {
        id: `item_${crypto.randomUUID()}`,
        type: 'item',
        name: itemDef?.displayName || item.itemId,
        position: { x, y, zoneId },
        active: true,
        itemId: item.itemId,
        quantity: item.quantity,
        despawnAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      };
      await this.zonesService.spawnEntity(zoneId, groundItem);
      await this.persistGroundItem(groundItem);
      result.push(groundItem);
    }
    return result;
  }

  /**
   * Persist a ground item to DB for zone eviction/server restart survival.
   */
  async persistGroundItem(item: ItemEntity): Promise<void> {
    const db = this.databaseService.getClient();
    await db.insert(groundItems).values({
      id: item.id,
      zoneId: item.position.zoneId,
      itemId: item.itemId,
      quantity: item.quantity,
      x: item.position.x,
      y: item.position.y,
      despawnAt: new Date(item.despawnAt),
    });
  }

  /**
   * Delete a ground item from DB (called on pickup).
   */
  async removeGroundItem(entityId: string): Promise<void> {
    const db = this.databaseService.getClient();
    await db.delete(groundItems).where(eq(groundItems.id, entityId));
  }
}
