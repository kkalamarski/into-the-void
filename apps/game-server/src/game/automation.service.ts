import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  AUTOMATION_CONFIGS,
  REFINERY_RECIPES,
  type AutomationStructureType,
  type AutomationPanelEntry,
  type LootWindowData,
  type DeployableEntity,
} from '@into-the-void/shared-types';
import {
  createDeployable,
  getAllActiveDeployables,
  updateDeployableAccumulated,
  updateDeployable,
  deleteDeployable,
} from '@into-the-void/database';
import { ItemRegistry } from '@into-the-void/items';
import { DatabaseService } from '../database/database.service';
import { PlayerService } from './player.service';
import { InventoryService } from './inventory.service';
import { ZonesService } from '../zones/zones.service';

/**
 * In-memory state for a deployed automation structure.
 */
interface DeployableState {
  id: string;
  deployableType: AutomationStructureType;
  name: string;
  ownerId: string;
  position: { x: number; y: number; zoneId: string };
  durability: number;
  maxDurability: number;
  fuelRemaining: number;
  maxFuel: number;
  accumulatedResources: { itemId: string; quantity: number }[];
  status: 'active' | 'depleted' | 'husk';
  deployedAt: number;
  expiresAt: number | null;
  lastTickAt: number;
  // Refinery-specific
  activeRecipe?: { recipeId: string; startedAt: number; inputConsumed: boolean };
  // Resource node info (for extractors)
  resourceItemId?: string;
  dirty: boolean;
}

/**
 * Maps deployable type names to item IDs for the deployable items.
 */
const DEPLOYABLE_TYPE_TO_ITEM: Record<AutomationStructureType, string> = {
  extractor: 'deployable_extractor',
  survey_beacon: 'deployable_survey_beacon',
  planetary_extractor: 'deployable_planetary_extractor',
  refinery: 'deployable_refinery',
};

/**
 * AutomationService — manages deployed automation structures with 60s tick loop.
 *
 * CRITICAL: processTick() is synchronous. All data from in-memory Map.
 * DB writes happen asynchronously in 5-minute flush cycles.
 *
 * Requirements covered:
 * - AUTO-01: T2 Extractors deploy on resource nodes, harvest passively
 * - AUTO-02: T3 Survey Beacons scan zones with 24hr expiry
 * - AUTO-03: T4 Planetary Extractors with degradation
 * - AUTO-04: T5 Refineries with transmutation recipes
 * - AUTO-05: Maintenance cost >= 60% (enforced via AUTOMATION_CONFIGS)
 * - AUTO-08: Server-side tick processing, socket event handlers
 */
@Injectable()
export class AutomationService implements OnModuleInit, OnModuleDestroy {
  private deployables: Map<string, DeployableState> = new Map();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private server: Server | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
    private readonly zonesService: ZonesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadActiveDeployables();

    // Start 60-second tick interval
    this.tickInterval = setInterval(() => {
      this.processTick();
    }, 60_000);

    // Start 5-minute DB flush interval
    this.flushInterval = setInterval(() => {
      this.flushToDB().catch(err => {
        console.error('[AutomationService] Flush error:', err);
      });
    }, 300_000);

    console.log(`[AutomationService] Initialized with ${this.deployables.size} active deployables`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    // Final flush
    await this.flushToDB();
    console.log('[AutomationService] Shutdown complete, final flush done');
  }

  /**
   * Set the Socket.IO server reference.
   * Called from GameGateway.afterInit().
   */
  setServer(server: Server): void {
    this.server = server;
  }

  // ─── STARTUP ────────────────────────────────────────────────────

  private async loadActiveDeployables(): Promise<void> {
    try {
      const db = this.databaseService.getClient();
      const rows = await getAllActiveDeployables(db);

      for (const row of rows) {
        const config = AUTOMATION_CONFIGS[row.deployableType as AutomationStructureType];
        if (!config) {
          console.warn(`[AutomationService] Unknown deployable type: ${row.deployableType}, skipping`);
          continue;
        }

        const state: DeployableState = {
          id: row.id,
          deployableType: row.deployableType as AutomationStructureType,
          name: row.name,
          ownerId: row.ownerId,
          position: row.position as { x: number; y: number; zoneId: string },
          durability: row.durability,
          maxDurability: row.maxDurability,
          fuelRemaining: row.fuelRemaining,
          maxFuel: row.maxFuel,
          accumulatedResources: (row.accumulatedResources || []) as { itemId: string; quantity: number }[],
          status: row.status as 'active' | 'depleted' | 'husk',
          deployedAt: row.deployedAt.getTime(),
          expiresAt: row.expiresAt ? row.expiresAt.getTime() : null,
          lastTickAt: row.lastTickAt.getTime(),
          resourceItemId: (row.properties as Record<string, unknown>)?.resourceItemId as string | undefined,
          activeRecipe: (row.properties as Record<string, unknown>)?.activeRecipe as DeployableState['activeRecipe'],
          dirty: false,
        };

        this.deployables.set(state.id, state);
      }
    } catch (error) {
      console.error('[AutomationService] Failed to load deployables:', error);
    }
  }

  // ─── TICK PROCESSING ────────────────────────────────────────────

  /**
   * Process tick for all deployables.
   * CRITICAL: Must be synchronous. No async calls. All data from in-memory Map.
   */
  private processTick(): void {
    const now = Date.now();

    for (const [_id, state] of this.deployables) {
      // Skip non-active
      if (state.status !== 'active') continue;

      const config = AUTOMATION_CONFIGS[state.deployableType];
      if (!config) continue;

      // Check expiry
      if (state.expiresAt && now > state.expiresAt) {
        state.status = 'husk';
        state.dirty = true;
        this.emitStatusUpdate(state);
        continue;
      }

      // Apply degradation
      if (config.degradationPerDay > 0) {
        const perTickDegradation = config.degradationPerDay / (24 * 60); // per-minute tick
        state.durability -= state.maxDurability * perTickDegradation;
        if (state.durability <= 0) {
          state.durability = 0;
          state.status = 'husk';
          state.dirty = true;
          this.emitStatusUpdate(state);
          continue;
        }
      }

      // Check fuel
      if (state.fuelRemaining <= 0) {
        state.status = 'depleted';
        state.dirty = true;
        this.emitStatusUpdate(state);
        continue;
      }

      // Consume fuel
      state.fuelRemaining = Math.max(0, state.fuelRemaining - config.fuelPerTick);

      // Process based on type
      if (state.deployableType === 'refinery') {
        this.processRefineryTick(state, now);
      } else {
        // Accumulate resources
        if (state.resourceItemId && config.outputPerTick > 0) {
          this.addAccumulatedResource(state, state.resourceItemId, config.outputPerTick);
        }
      }

      state.lastTickAt = now;
      state.dirty = true;
    }
  }

  /**
   * Process a refinery tick — advance active recipe or start a new one.
   */
  private processRefineryTick(state: DeployableState, now: number): void {
    if (state.activeRecipe) {
      const recipe = REFINERY_RECIPES.find(r => r.id === state.activeRecipe!.recipeId);
      if (recipe && now - state.activeRecipe.startedAt >= recipe.durationMs) {
        // Recipe complete — add output
        this.addAccumulatedResource(state, recipe.outputItemId, recipe.outputQuantity);
        state.activeRecipe = undefined;
      }
    }
    // If no active recipe, attempt to start one will be handled via explicit player action in future
    // For now, refinery only processes active recipes set during deploy or manual start
  }

  /**
   * Add resources to a deployable's accumulated pile, merging with existing.
   */
  private addAccumulatedResource(state: DeployableState, itemId: string, quantity: number): void {
    const existing = state.accumulatedResources.find(r => r.itemId === itemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      state.accumulatedResources.push({ itemId, quantity });
    }
  }

  // ─── DB FLUSH ───────────────────────────────────────────────────

  private async flushToDB(): Promise<void> {
    const db = this.databaseService.getClient();
    let flushCount = 0;

    for (const [_id, state] of this.deployables) {
      if (!state.dirty) continue;

      try {
        // Update main fields
        await updateDeployable(db, state.id, {
          status: state.status,
          durability: Math.round(state.durability),
          fuelRemaining: state.fuelRemaining,
          accumulatedResources: state.accumulatedResources,
          lastTickAt: new Date(state.lastTickAt),
          properties: {
            resourceItemId: state.resourceItemId,
            activeRecipe: state.activeRecipe,
          },
        });

        state.dirty = false;
        flushCount++;
      } catch (error) {
        console.error(`[AutomationService] Flush failed for ${state.id}:`, error);
      }
    }

    if (flushCount > 0) {
      console.log(`[AutomationService] Flushed ${flushCount} deployable(s) to DB`);
    }
  }

  // ─── DEPLOY ─────────────────────────────────────────────────────

  async handleDeploy(
    playerId: string,
    deployableItemId: string,
    position: { x: number; y: number; zoneId: string },
  ): Promise<{ success: boolean; error?: string; deployable?: DeployableEntity }> {
    // Determine structure type from item ID
    const structureType = Object.entries(DEPLOYABLE_TYPE_TO_ITEM)
      .find(([_type, itemId]) => itemId === deployableItemId)?.[0] as AutomationStructureType | undefined;

    if (!structureType) {
      return { success: false, error: 'Invalid deployable item' };
    }

    const config = AUTOMATION_CONFIGS[structureType];
    const player = this.playerService.getPlayerById(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Validate player level
    if ((player as { level?: number }).level && (player as { level?: number }).level! < config.requiredLevel) {
      return { success: false, error: `Requires level ${config.requiredLevel}` };
    }

    // Check player limit
    const ownedOfType = Array.from(this.deployables.values())
      .filter(d => d.ownerId === playerId && d.deployableType === structureType && d.status !== 'husk');
    if (ownedOfType.length >= config.maxPerPlayer) {
      return { success: false, error: `Maximum ${config.maxPerPlayer} ${config.displayName}(s) allowed` };
    }

    // Resolve resource item ID for node-required structures
    let resourceItemId: string | undefined;
    if (config.nodeRequired) {
      // For now, use a placeholder resource. In full implementation, this would check
      // for resource nodes at the position and extract their resource ID.
      resourceItemId = 'resource_common';
    }

    // Find and consume the deployable item from inventory
    const inventory = this.inventoryService.getInventory(playerId);
    if (!inventory) {
      return { success: false, error: 'Inventory not loaded' };
    }

    const deployItem = inventory.items.find(i => i.itemId === deployableItemId);
    if (!deployItem) {
      return { success: false, error: 'Deployable item not in inventory' };
    }

    // Remove one unit (or entire stack if quantity is 1)
    if (deployItem.quantity > 1) {
      const reduceResult = await this.inventoryService.reduceItemQuantity(playerId, deployItem.instanceId, 1);
      if (!reduceResult.success) {
        return { success: false, error: reduceResult.reason || 'Failed to consume item' };
      }
    } else {
      const removeResult = await this.inventoryService.removeItem(playerId, deployItem.instanceId);
      if (!removeResult.success) {
        return { success: false, error: removeResult.reason || 'Failed to consume item' };
      }
    }

    // Create DB record
    const db = this.databaseService.getClient();
    const deployableId = uuidv4();
    const itemDef = ItemRegistry.get(deployableItemId);
    const now = new Date();

    try {
      await createDeployable(db, {
        id: deployableId,
        deployableType: structureType,
        name: itemDef?.displayName || config.displayName,
        position,
        ownerId: playerId,
        durability: config.maxDurability,
        maxDurability: config.maxDurability,
        fuelRemaining: 0, // Starts empty — player must refuel
        maxFuel: config.maxFuel,
        accumulatedResources: [],
        status: 'depleted', // No fuel yet
        deployedAt: now,
        expiresAt: config.expiresAfterMs ? new Date(now.getTime() + config.expiresAfterMs) : null,
        lastTickAt: now,
        properties: { resourceItemId },
      });
    } catch (error) {
      console.error('[AutomationService] Failed to create deployable:', error);
      return { success: false, error: 'Database error' };
    }

    // Create in-memory state
    const state: DeployableState = {
      id: deployableId,
      deployableType: structureType,
      name: itemDef?.displayName || config.displayName,
      ownerId: playerId,
      position,
      durability: config.maxDurability,
      maxDurability: config.maxDurability,
      fuelRemaining: 0,
      maxFuel: config.maxFuel,
      accumulatedResources: [],
      status: 'depleted',
      deployedAt: now.getTime(),
      expiresAt: config.expiresAfterMs ? now.getTime() + config.expiresAfterMs : null,
      lastTickAt: now.getTime(),
      resourceItemId,
      dirty: false,
    };
    this.deployables.set(deployableId, state);

    // Spawn entity in zone
    const entity: DeployableEntity = {
      id: `deployable_${deployableId}`,
      type: 'deployable',
      deployableType: structureType,
      ownerId: playerId,
      x: position.x,
      y: position.y,
      name: itemDef?.displayName || config.displayName,
      active: true,
      durability: config.maxDurability,
      maxDurability: config.maxDurability,
      deployedAt: now.getTime(),
      expiresAt: config.expiresAfterMs ? now.getTime() + config.expiresAfterMs : null,
    };
    await this.zonesService.spawnEntity(position.zoneId, entity);

    return { success: true, deployable: entity };
  }

  // ─── COLLECT ────────────────────────────────────────────────────

  async handleCollect(
    playerId: string,
    deployableId: string,
  ): Promise<{ success: boolean; error?: string; items?: { itemId: string; quantity: number }[] }> {
    const state = this.deployables.get(deployableId);
    if (!state) {
      return { success: false, error: 'Deployable not found' };
    }

    // NOTE: ANY player can collect (PvP looting per CONTEXT.md). No owner check.
    if (state.accumulatedResources.length === 0) {
      return { success: false, error: 'No resources to collect' };
    }

    // Clone accumulated resources and clear
    const collected = [...state.accumulatedResources];
    state.accumulatedResources = [];
    state.dirty = true;

    // Add each collected item to player inventory
    for (const resource of collected) {
      await this.inventoryService.addItem(playerId, {
        instanceId: uuidv4(),
        itemId: resource.itemId,
        quantity: resource.quantity,
        slot: -1,
        properties: {},
      });
    }

    return { success: true, items: collected };
  }

  // ─── REFUEL ─────────────────────────────────────────────────────

  async handleRefuel(
    playerId: string,
    deployableId: string,
    fuelInstanceId: string,
  ): Promise<{ success: boolean; error?: string; fuelLevel?: number; maxFuel?: number }> {
    const state = this.deployables.get(deployableId);
    if (!state) {
      return { success: false, error: 'Deployable not found' };
    }

    // Only OWNER can refuel
    if (state.ownerId !== playerId) {
      return { success: false, error: 'Only the owner can refuel' };
    }

    const config = AUTOMATION_CONFIGS[state.deployableType];

    // Check if already at max fuel
    if (state.fuelRemaining >= state.maxFuel) {
      return { success: false, error: 'Fuel tank is full' };
    }

    // Get fuel item from player inventory
    const inventory = this.inventoryService.getInventory(playerId);
    if (!inventory) {
      return { success: false, error: 'Inventory not loaded' };
    }

    const fuelItem = inventory.items.find(i => i.instanceId === fuelInstanceId);
    if (!fuelItem) {
      return { success: false, error: 'Fuel item not found in inventory' };
    }

    // Verify it matches the required fuel type
    if (fuelItem.itemId !== config.fuelItemId) {
      return { success: false, error: `Requires ${config.fuelItemId} fuel` };
    }

    // Remove one fuel item
    if (fuelItem.quantity > 1) {
      const reduceResult = await this.inventoryService.reduceItemQuantity(playerId, fuelInstanceId, 1);
      if (!reduceResult.success) {
        return { success: false, error: reduceResult.reason || 'Failed to consume fuel' };
      }
    } else {
      const removeResult = await this.inventoryService.removeItem(playerId, fuelInstanceId);
      if (!removeResult.success) {
        return { success: false, error: removeResult.reason || 'Failed to consume fuel' };
      }
    }

    // Add fuel
    state.fuelRemaining = Math.min(state.maxFuel, state.fuelRemaining + config.fuelPerItem);

    // Reactivate if depleted
    if (state.status === 'depleted') {
      state.status = 'active';
    }

    state.dirty = true;

    return {
      success: true,
      fuelLevel: state.fuelRemaining,
      maxFuel: state.maxFuel,
    };
  }

  // ─── DISMANTLE ──────────────────────────────────────────────────

  async handleDismantle(
    playerId: string,
    deployableId: string,
  ): Promise<{ success: boolean; error?: string; recoveredItems?: { itemId: string; quantity: number }[] }> {
    const state = this.deployables.get(deployableId);
    if (!state) {
      return { success: false, error: 'Deployable not found' };
    }

    // Only OWNER can dismantle
    if (state.ownerId !== playerId) {
      return { success: false, error: 'Only the owner can dismantle' };
    }

    // Calculate recovered materials (50% of base value as common reagents)
    const deployableItemId = DEPLOYABLE_TYPE_TO_ITEM[state.deployableType];
    const itemDef = ItemRegistry.get(deployableItemId);
    const recoveryValue = Math.floor((itemDef?.baseValue ?? 100) * 0.5);
    const recoveredItems: { itemId: string; quantity: number }[] = [];

    // Give crystalline dust as recovery material (30cr each)
    const dustQuantity = Math.max(1, Math.floor(recoveryValue / 30));
    recoveredItems.push({ itemId: 'reagent_crystalline_dust', quantity: dustQuantity });

    // Add recovered items to inventory
    for (const item of recoveredItems) {
      await this.inventoryService.addItem(playerId, {
        instanceId: uuidv4(),
        itemId: item.itemId,
        quantity: item.quantity,
        slot: -1,
        properties: {},
      });
    }

    // Also collect any remaining accumulated resources
    if (state.accumulatedResources.length > 0) {
      for (const resource of state.accumulatedResources) {
        await this.inventoryService.addItem(playerId, {
          instanceId: uuidv4(),
          itemId: resource.itemId,
          quantity: resource.quantity,
          slot: -1,
          properties: {},
        });
      }
    }

    // Remove from Map
    this.deployables.delete(deployableId);

    // Delete from DB
    try {
      const db = this.databaseService.getClient();
      await deleteDeployable(db, deployableId);
    } catch (error) {
      console.error('[AutomationService] Failed to delete deployable from DB:', error);
    }

    // Despawn zone entity
    await this.zonesService.despawnEntity(state.position.zoneId, `deployable_${deployableId}`);

    return { success: true, recoveredItems };
  }

  // ─── INTERACT (LOOT WINDOW) ─────────────────────────────────────

  handleInteract(
    playerId: string,
    entityId: string,
  ): LootWindowData | null {
    // Entity IDs for deployables are prefixed with 'deployable_'
    const deployableId = entityId.replace(/^deployable_/, '');
    const state = this.deployables.get(deployableId);
    if (!state) return null;

    const player = this.playerService.getPlayerById(playerId);
    const ownerPlayer = this.playerService.getPlayerById(state.ownerId);

    const lootData: LootWindowData = {
      deployableId: state.id,
      deployableType: state.deployableType,
      ownerName: ownerPlayer?.name || 'Unknown',
      ownerId: state.ownerId,
      isOwner: state.ownerId === playerId,
      status: state.status,
      fuelLevel: state.fuelRemaining,
      maxFuel: state.maxFuel,
      accumulatedResources: [...state.accumulatedResources],
      durability: Math.round(state.durability),
      maxDurability: state.maxDurability,
      activeRecipe: state.activeRecipe
        ? (() => {
            const recipe = REFINERY_RECIPES.find(r => r.id === state.activeRecipe!.recipeId);
            if (!recipe) return undefined;
            const elapsed = Date.now() - state.activeRecipe!.startedAt;
            return {
              recipeId: state.activeRecipe!.recipeId,
              progressPercent: Math.min(100, Math.round((elapsed / recipe.durationMs) * 100)),
              outputItemId: recipe.outputItemId,
            };
          })()
        : undefined,
    };

    return lootData;
  }

  // ─── PANEL REQUEST ──────────────────────────────────────────────

  handlePanelRequest(playerId: string): AutomationPanelEntry[] {
    const entries: AutomationPanelEntry[] = [];

    for (const [_id, state] of this.deployables) {
      if (state.ownerId !== playerId) continue;

      entries.push({
        deployableId: state.id,
        deployableType: state.deployableType,
        name: state.name,
        status: state.status,
        fuelLevel: state.fuelRemaining,
        maxFuel: state.maxFuel,
        position: state.position,
        accumulatedCount: state.accumulatedResources.reduce((sum, r) => sum + r.quantity, 0),
        durabilityPercent: state.maxDurability > 0
          ? Math.round((state.durability / state.maxDurability) * 100)
          : 100,
      });
    }

    return entries;
  }

  // ─── CLEANUP ────────────────────────────────────────────────────

  /**
   * Called when a player disconnects.
   * No cleanup needed — deployables persist independently.
   */
  onPlayerDisconnect(_playerId: string): void {
    // No-op: deployables persist independently of player connection
  }

  // ─── HELPERS ────────────────────────────────────────────────────

  /**
   * Emit status_update event for a deployable to its owner.
   */
  private emitStatusUpdate(state: DeployableState): void {
    if (!this.server) return;

    const player = this.playerService.getPlayerById(state.ownerId);
    if (!player) return;

    const socketId = (player as { socketId?: string }).socketId;
    if (socketId) {
      this.server.to(socketId).emit('automation:status_update', {
        deployableId: state.id,
        status: state.status,
        fuelLevel: state.fuelRemaining,
        durabilityPercent: state.maxDurability > 0
          ? Math.round((state.durability / state.maxDurability) * 100)
          : 100,
        accumulatedCount: state.accumulatedResources.reduce((sum, r) => sum + r.quantity, 0),
      });
    }
  }

  /**
   * Emit an event to a specific player's socket.
   */
  private emitToPlayer(playerId: string, event: string, data: unknown): void {
    if (!this.server) return;

    const player = this.playerService.getPlayerById(playerId);
    if (!player) return;

    const socketId = (player as { socketId?: string }).socketId;
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
