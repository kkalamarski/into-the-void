import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from '../game.service';
import { PlayerService } from '../player.service';
import { InventoryService } from '../inventory.service';
import { ZonesService } from '../../zones/zones.service';
import { TradeService } from '../trade.service';
import { QuestService } from '../quest.service';
import { DiscoveryService } from '../discovery.service';
import { GatheringService } from '../gathering.service';
import { LoreService } from '../lore.service';
import { ZoneMasteryService } from '../zone-mastery.service';
import { ExpeditionService } from '../expedition.service';
import { ChatService } from '../chat.service';
import { AbilityService } from '../ability.service';
import {
  ClientEvents,
  Npc,
  Mineral,
  Plant,
  PoiType,
} from '@into-the-void/shared-types';
import { pixelDistanceTo, tileToPixelCenter, NPC_INTERACT_RANGE_PX } from '@into-the-void/game-logic';
import { NpcRegistry } from '@into-the-void/npcs';
import { createZoneId } from '@into-the-void/game-logic';
import { CombatHandler } from './CombatHandler';

@Injectable()
export class SocialHandler {
  private server!: Server;

  private readonly chatBurstWindow: Map<string, number[]> = new Map();
  private readonly CHAT_BURST_LIMIT = 5;
  private readonly CHAT_BURST_WINDOW_MS = 5000;

  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
    private readonly zonesService: ZonesService,
    private readonly tradeService: TradeService,
    private readonly questService: QuestService,
    private readonly discoveryService: DiscoveryService,
    private readonly gatheringService: GatheringService,
    private readonly loreService: LoreService,
    private readonly zoneMasteryService: ZoneMasteryService,
    private readonly expeditionService: ExpeditionService,
    private readonly chatService: ChatService,
    private readonly abilityService: AbilityService,
    @Inject(forwardRef(() => CombatHandler))
    private readonly combatHandler: CombatHandler,
  ) {}

  setServer(server: Server): void {
    this.server = server;
    // Propagate to services owned by this handler
    this.loreService.setServer(server);
    this.zoneMasteryService.setServer(server);
    this.chatService.setServer(server);
  }

  private canSendChat(playerId: string): boolean {
    const now = Date.now();
    const recent = (this.chatBurstWindow.get(playerId) || [])
      .filter(t => now - t < this.CHAT_BURST_WINDOW_MS);
    if (recent.length >= this.CHAT_BURST_LIMIT) return false;
    recent.push(now);
    this.chatBurstWindow.set(playerId, recent);
    return true;
  }

  async handleChat(
    client: Socket,
    data: ClientEvents['chat:send'],
  ): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    // Validate message content (INFRA-04)
    const trimmed = data.message?.trim() ?? '';
    if (trimmed.length === 0) return; // silently discard empty/whitespace
    if (trimmed.length > 280) {
      client.emit('error', { code: 'INVALID_ACTION', message: 'Message too long (max 280 characters).' });
      return;
    }

    // Rate limit check (INFRA-03)
    if (!this.canSendChat(player.id)) return; // silently drop burst excess

    // Delegate to ChatService for channel routing (CHAN-01 through CHAN-05)
    await this.chatService.handleMessage(
      client,
      player.id,
      player.name,
      data.channel,
      trimmed,
      data.targetId,
    );
  }

  async handleNpcInteract(
    client: Socket,
    data: { entityId: string },
  ): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    // Find entity in zone to get npcId
    const entity = await this.zonesService.getEntity(player.position.zoneId, data.entityId);
    if (!entity || entity.type !== 'npc') return;

    // Phase 133: NPC interaction range check (DIST-03)
    const { px: npcPx, py: npcPy } = tileToPixelCenter(entity.position.x, entity.position.y);
    const npcDist = pixelDistanceTo(player.px, player.py, npcPx, npcPy);
    if (npcDist > NPC_INTERACT_RANGE_PX) {
      client.emit('error', { code: 'OUT_OF_RANGE', message: 'Too far away' });
      return;
    }

    // Get NPC definition from registry
    const npcDef = NpcRegistry.get((entity as Npc).npcId);

    // Build response payload from definition
    const response: {
      npcId: string;
      displayName: string;
      npcType: string;
      faction: string;
      description: string;
      dialogue: Array<{ text: string; condition?: string }>;
      color: number;
      inventory?: Array<{ itemId: string; buyPrice: number; sellPrice: number; stock: number }>;
      serviceType?: string;
      title?: string;
      role?: string;
      availableQuests?: Array<{
        questId: string;
        displayName: string;
        description: string;
        objectives: Array<{ description: string; required: number }>;
        rewards: { credits?: number; xp?: number; items?: Array<{ itemId: string; quantity: number }> };
        minLevel?: number;
      }>;
      activeQuests?: Array<{
        questId: string;
        displayName: string;
        description: string;
        objectives: Array<{ description: string; current: number; required: number; complete: boolean }>;
      }>;
      readyQuests?: Array<{
        questId: string;
        displayName: string;
      }>;
    } = {
      npcId: npcDef.id,
      displayName: npcDef.displayName,
      npcType: npcDef.npcType,
      faction: npcDef.faction,
      description: npcDef.description,
      dialogue: [...npcDef.dialogue],
      color: npcDef.color,
    };

    // Add type-specific fields
    if (npcDef.npcType === 'trader' && 'inventory' in npcDef) {
      response.inventory = [...npcDef.inventory];
    }
    if (npcDef.npcType === 'service' && 'serviceType' in npcDef) {
      response.serviceType = npcDef.serviceType;
    }
    if (npcDef.npcType === 'faction_rep' && 'title' in npcDef) {
      response.title = npcDef.title;
    }
    if (npcDef.npcType === 'ambient' && 'role' in npcDef) {
      response.role = npcDef.role;
    }

    // Add quest data for this NPC
    const questData = await this.questService.getQuestsForNpc(player.id, npcDef.id, player.faction);
    if (questData.available.length > 0) {
      response.availableQuests = questData.available;
    }
    if (questData.active.length > 0) {
      response.activeQuests = questData.active;
    }
    if (questData.ready.length > 0) {
      response.readyQuests = questData.ready;
    }

    // Add expedition destinations for expedition service NPCs
    if (npcDef.npcType === 'service' && 'serviceType' in npcDef && npcDef.serviceType === 'expedition') {
      const destinations = this.expeditionService.getDestinations(player.level);
      (response as { expeditionDestinations?: typeof destinations }).expeditionDestinations = destinations;
    }

    client.emit('npc:interact:response', response);
  }

  async handleTradeBuy(
    client: Socket,
    data: { npcId: string; itemId: string; quantity: number },
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.tradeService.buy(
        player.id,
        data.npcId,
        data.itemId,
        data.quantity,
      );

      if (result.success) {
        // Send updated inventory
        const inventory = this.inventoryService.getInventory(player.id);
        if (inventory) {
          client.emit('inventory:update', inventory);
        }
        // Send updated credits
        if (result.newBalance !== undefined) {
          client.emit('credits:update', { credits: result.newBalance });
        }
        // Send trade result
        client.emit('trade:result', {
          success: true,
          action: 'buy',
          itemId: data.itemId,
          quantity: data.quantity,
          newBalance: result.newBalance,
        });
      } else {
        client.emit('trade:result', {
          success: false,
          action: 'buy',
          error: result.error,
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'TRADE_ERROR',
        message: 'Failed to process purchase',
      });
    }
  }

  async handleTradeSell(
    client: Socket,
    data: { npcId: string; itemInstanceId: string; quantity: number },
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.tradeService.sell(
        player.id,
        data.npcId,
        data.itemInstanceId,
        data.quantity,
      );

      if (result.success) {
        // Send updated inventory
        const inventory = this.inventoryService.getInventory(player.id);
        if (inventory) {
          client.emit('inventory:update', inventory);
        }
        // Send updated credits
        if (result.newBalance !== undefined) {
          client.emit('credits:update', { credits: result.newBalance });
        }
        // Send trade result
        client.emit('trade:result', {
          success: true,
          action: 'sell',
          newBalance: result.newBalance,
        });
      } else {
        client.emit('trade:result', {
          success: false,
          action: 'sell',
          error: result.error,
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'TRADE_ERROR',
        message: 'Failed to process sale',
      });
    }
  }

  async handleQuestComplete(
    client: Socket,
    data: { questId: string },
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.questService.completeQuest(player.id, data.questId);

      if (result.success) {
        // Send updated inventory (quest items were removed)
        const inventory = this.inventoryService.getInventory(player.id);
        if (inventory) {
          client.emit('inventory:update', inventory);
        }
        // Send updated credits
        if (result.rewards?.credits) {
          client.emit('credits:update', { credits: player.credits });
        }
        // Note: quest:completed event is emitted by QuestService.completeQuest
      } else {
        client.emit('error', {
          code: 'QUEST_COMPLETE_FAILED',
          message: result.error || 'Failed to complete quest',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process quest completion',
      });
    }
  }

  async handleQuestAbandon(
    client: Socket,
    data: { questId: string },
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.questService.abandonQuest(player.id, data.questId);

      if (!result.success) {
        client.emit('error', {
          code: 'QUEST_ABANDON_FAILED',
          message: result.error || 'Failed to abandon quest',
        });
      }
      // Note: quest:abandoned and inventory:update events are emitted by QuestService.abandonQuest
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process quest abandonment',
      });
    }
  }

  async handleQuestAccept(
    client: Socket,
    data: { questId: string },
  ): Promise<void> {
    console.log('[quest:accept] Received:', { socketId: client.id, questId: data?.questId });

    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) {
      console.log('[quest:accept] No player found for socket');
      return;
    }

    console.log('[quest:accept] Player:', { id: player.id, faction: player.faction });
    const result = await this.questService.acceptQuest(player.id, data.questId);
    console.log('[quest:accept] Result:', result);

    if (result.success) {
      client.emit('quest:accepted', { questId: data.questId });
    } else {
      client.emit('error', {
        code: 'QUEST_ACCEPT_FAILED',
        message: result.error || 'Failed to accept quest',
      });
    }
  }

  async handlePoiDiscover(
    client: Socket,
    data: { poiId: string; worldX: number; worldY: number },
  ): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    // Parse POI info from deterministic ID format: poi_${chunkX}_${chunkY}_${index}
    const [, chunkXStr, chunkYStr] = data.poiId.split('_');
    const chunkX = parseInt(chunkXStr, 10);
    const chunkY = parseInt(chunkYStr, 10);

    // Get chunk to validate POI exists and get type/biome
    const zoneId = createZoneId(chunkX, chunkY);
    const zoneState = await this.gameService.getZoneState(zoneId);

    if (!zoneState?.chunk?.pois) {
      console.warn(`No POIs in zone ${zoneId} for discovery attempt`);
      return;
    }

    const poi = zoneState.chunk.pois.find((p) => p.poiId === data.poiId);
    if (!poi) {
      console.warn(`POI ${data.poiId} not found in zone ${zoneId}`);
      return;
    }

    // Attempt discovery
    const result = await this.discoveryService.attemptDiscovery(
      player.id,
      data.poiId,
      poi.type as PoiType,
      poi.biome
    );

    if (result.alreadyDiscovered) {
      client.emit('poi:already_discovered', { poiId: data.poiId });
      return;
    }

    if (result.success && result.reward) {
      // Emit discovery success with reward
      client.emit('poi:discovered', {
        poiId: data.poiId,
        poiType: poi.type,
        reward: result.reward,
      });

      // Also emit XP and credits updates
      client.emit('player:xp', {
        playerId: player.id,
        xp: player.xp + result.reward.xp,
        xpToNextLevel: 100, // TODO: Calculate properly based on level
        level: player.level,
        leveledUp: false,
      });
      client.emit('credits:update', {
        credits: player.credits + result.reward.credits,
      });
    }
  }

  async handleGatheringStart(
    client: Socket,
    data: { targetEntityId: string },
  ): Promise<void> {
    // Redirect to ability system
    // Determine ability based on entity type
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) {
      client.emit('error', { code: 'GATHERING_ERROR', message: 'Player not found' });
      return;
    }

    const entity = await this.zonesService.getEntity(player.position.zoneId, data.targetEntityId);
    if (!entity) {
      client.emit('error', { code: 'GATHERING_ERROR', message: 'Target not found' });
      return;
    }

    // Find the appropriate gathering ability from player's equipped abilities
    const abilities = this.abilityService.getPlayerAbilities(player.id);
    let abilityId: string | undefined;

    if (entity.type === 'plant') {
      // Prefer specialized 'harvest' over 'basic_harvest', fall back to universal 'gather'
      abilityId = abilities.find(a => a.id === 'harvest')?.id
        ?? abilities.find(a => a.id === 'basic_harvest')?.id
        ?? abilities.find(a => a.id === 'gather')?.id;
    } else if (entity.type === 'mineral') {
      // Prefer specialized 'mine' over 'basic_mine', fall back to universal 'gather'
      abilityId = abilities.find(a => a.id === 'mine')?.id
        ?? abilities.find(a => a.id === 'basic_mine')?.id
        ?? abilities.find(a => a.id === 'gather')?.id;
    } else if (entity.type === 'artifact') {
      abilityId = abilities.find(a => a.id === 'gather')?.id;
    }

    if (!abilityId) {
      client.emit('error', { code: 'GATHERING_ERROR', message: 'No gathering ability available' });
      return;
    }

    // Delegate to ability:use via CombatHandler
    await this.combatHandler.handleAbilityUse(client, {
      abilityId,
      targetEntityId: data.targetEntityId
    });
  }

  async handleGatheringComplete(
    client: Socket,
    data: import('@into-the-void/shared-types').TimingResult,
  ): Promise<void> {
    // Keep for backwards compatibility but gathering now auto-completes
    const result = await this.gatheringService.completeGathering(client.id, data);
    client.emit('gathering:result', result);
  }

  async handleLoreCollect(
    client: Socket,
    data: { loreId: string; worldX: number; worldY: number },
  ): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    await this.loreService.attemptCollect(player.id, data.loreId, client.id);
  }

  async handleMasteryQuery(
    client: Socket,
    data: { biome: string },
  ): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    const masteryMap = await this.zoneMasteryService.getMasteryForCharacter(player.id);
    const progress = masteryMap.get(data.biome);

    if (progress) {
      client.emit('mastery:progress', { biome: data.biome, progress });
    }
  }

  /**
   * Check for rare node discoveries when player moves.
   * Called from movement handler after position update.
   */
  async checkRareNodeDiscovery(
    characterId: string,
    playerX: number,
    playerY: number,
    zoneId: string,
    socket: Socket,
  ): Promise<void> {
    const RARE_DISCOVERY_RANGE = 3; // Tiles - player must be within 3 tiles to discover

    const entities = await this.zonesService.getZoneEntities(zoneId);

    for (const entity of entities) {
      // Only check minerals and plants
      if (entity.type !== 'mineral' && entity.type !== 'plant') continue;

      // Check if entity has rarity (rare or epic)
      const rarity = (entity as Mineral | Plant).rarity;
      if (!rarity || rarity === 'common') continue;

      // Calculate distance
      const distance = Math.hypot(
        playerX - entity.position.x,
        playerY - entity.position.y
      );

      if (distance <= RARE_DISCOVERY_RANGE) {
        // Attempt discovery
        const resourceId = entity.type === 'mineral'
          ? (entity as Mineral).resourceId
          : (entity as Plant).speciesId;

        const discoveryData = {
          entityId: entity.id,
          rarity: rarity as 'rare' | 'epic',
          resourceType: entity.type as 'mineral' | 'plant',
          zoneId,
          worldX: entity.position.x, // These are already world coords
          worldY: entity.position.y,
          resourceId,
        };

        const isNew = await this.discoveryService.discoverResource(
          characterId,
          discoveryData
        );

        if (isNew) {
          // Emit new discovery event to player
          socket.emit('rare-node:new-discovery', discoveryData);
        }
      }
    }
  }
}
