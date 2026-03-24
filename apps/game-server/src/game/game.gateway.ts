import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { InventoryService } from './inventory.service';
import { AiService } from './ai.service';
import { CombatService } from './combat.service';
import { AbilityService } from './ability.service';
import { GatheringService } from './gathering.service';
import { DiscoveryService } from './discovery.service';
import { CraftingService } from './crafting.service';
import { HazardService } from './hazard.service';
import { AutomationService } from './automation.service';
import { MovementService } from './movement.service';
import {
  ZoneHandler,
  InventoryHandler,
  CombatHandler,
  SocialHandler,
  AutomationHandler,
} from './handlers';
import {
  ClientEvents,
  AuthRequest,
  getErrorInfo,
} from '@into-the-void/shared-types';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
    private readonly aiService: AiService,
    private readonly combatService: CombatService,
    private readonly abilityService: AbilityService,
    private readonly gatheringService: GatheringService,
    private readonly discoveryService: DiscoveryService,
    private readonly craftingService: CraftingService,
    private readonly hazardService: HazardService,
    private readonly automationService: AutomationService,
    private readonly movementService: MovementService,
    // Domain handlers
    private readonly zoneHandler: ZoneHandler,
    private readonly inventoryHandler: InventoryHandler,
    private readonly combatHandler: CombatHandler,
    private readonly socialHandler: SocialHandler,
    private readonly automationHandler: AutomationHandler,
  ) {}

  // ─── LIFECYCLE ─────────────────────────────────────────────────

  afterInit(server: Server) {
    // Propagate server to domain handlers (handlers propagate to their owned services)
    this.zoneHandler.setServer(server);
    this.inventoryHandler.setServer(server);
    this.combatHandler.setServer(server);
    this.socialHandler.setServer(server);
    this.automationHandler.setServer(server);

    // Services still used directly in gateway lifecycle
    this.combatService.setServer(server);
    this.playerService.setServer(server);
    this.hazardService.setServer(server);
    this.movementService.setServer(server);

    this.playerService.setZoneStateProvider((zoneId) => this.gameService.getZoneState(zoneId));
    console.log('[GameGateway] WebSocket server initialized');
  }

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Set 5 second auth timeout
    const authTimeout = setTimeout(() => {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) {
        console.log(`Auth timeout for client ${client.id}`);
        const errorInfo = getErrorInfo('AUTH_TIMEOUT');
        client.emit('auth:error', errorInfo);
        client.disconnect();
      }
    }, 5000);

    // Store timeout reference for cleanup
    client.data.authTimeout = authTimeout;
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Get player's zone BEFORE disconnect removes them from the service
    const player = this.playerService.getPlayerBySocket(client.id);
    const zoneId = player?.position.zoneId;

    // Clean up combat state before removing player
    if (player) {
      this.combatService.handleDisconnect(player.id);
      this.abilityService.handleDisconnect(player.id);
      this.gatheringService.unloadProficiency(player.id);
      this.craftingService.unloadPlayer(player.id);
      this.hazardService.onPlayerDisconnect(player.id);
      this.automationService.onPlayerDisconnect(player.id);
    }

    await this.playerService.handleDisconnect(client.id);

    // Deactivate zone if no players remain
    if (zoneId && this.playerService.getPlayersInZone(zoneId).length === 0) {
      this.aiService.deactivateZone(zoneId);
    }
  }

  // ─── AUTH ──────────────────────────────────────────────────────

  @SubscribeMessage('auth')
  async handleAuth(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AuthRequest
  ) {
    // Clear auth timeout immediately
    if (client.data.authTimeout) {
      clearTimeout(client.data.authTimeout);
      delete client.data.authTimeout;
    }

    try {
      const result = await this.playerService.authenticate(
        client.id,
        data.token,
        data.characterId
      );

      if (result.success && result.player) {
        // Join player to 3x3 grid of zone rooms (current + 8 adjacent)
        this.zoneHandler.updatePlayerRooms(client, result.player.position.zoneId);

        // Join faction room for faction chat (CHAN-03)
        if (result.player.faction !== 'neutral') {
          client.join(`faction:${result.player.faction}`);
        }

        const playerZoneId = result.player.position.zoneId;
        const zoneAlreadyActive = this.aiService.isZoneActive(playerZoneId);

        // Activate AI tick loop for the zone the player just joined
        this.aiService.activateZone(playerZoneId);

        // If zone was already active (other players present), trigger immediate aggro
        if (zoneAlreadyActive) {
          this.aiService.checkImmediateAggroForPlayer(playerZoneId, result.player.id);
        }

        // Send initial zone state
        const zoneState = await this.gameService.getZoneState(result.player.position.zoneId);

        // Load inventory for this session
        const inventory = await this.inventoryService.loadForPlayer(result.player.id);

        // Load gathering proficiency for this session
        await this.gatheringService.loadProficiency(result.player.id);

        // Load crafting proficiency for this session (PROF-05)
        await this.craftingService.loadProficiency(result.player.id);

        // Send discovered rare nodes on join
        const discoveredResources = await this.discoveryService.getDiscoveredResources(result.player.id);
        client.emit('rare-nodes:discovered', { discoveries: discoveredResources });

        client.emit('auth:success', { player: result.player, serverTime: Date.now() });
        client.emit('zone:state', { ...zoneState, serverTime: Date.now() });
        // Send NPC quest markers (! and ? above NPCs)
        this.zoneHandler.emitNpcQuestMarkers(
          client,
          result.player.id,
          result.player.faction,
          zoneState.entities as Array<{ type: string; npcId?: string }>
        );
        // Send initial inventory state (PRIVATE - only to this client)
        client.emit('inventory:update', inventory);
        // Send initial stats (PRIVATE - only to this client)
        this.inventoryHandler.emitStats(client, result.player.id);

        // Restore persistent cooldowns (PRIVATE - only to this client)
        await this.abilityService.restoreCooldowns(result.player.id, client.id);

        // Emit zone entry event for quest tracking on login
        const biome = this.zoneHandler.resolveZoneBiome(playerZoneId);
        this.eventEmitter.emit('zone.entered', {
          characterId: result.player.id,
          zoneId: playerZoneId,
          biome,
        });

        // Notify other players
        client.to(result.player.position.zoneId).emit('player:joined', {
          id: result.player.id,
          name: result.player.name,
          faction: result.player.faction,
          position: result.player.position,
          level: result.player.level,
          inCombat: result.player.inCombat,
        });
      } else {
        // Auth failed - send error info and disconnect
        console.error('Auth failed:', result.error);
        const errorCode = result.error?.includes('Character not found')
          ? 'INVALID_CHARACTER'
          : result.error?.includes('Invalid token') || result.error?.includes('expired')
          ? 'AUTH_EXPIRED'
          : 'AUTH_FAILED';
        const errorInfo = getErrorInfo(errorCode, result.error);
        client.emit('auth:error', errorInfo);
        client.disconnect();
      }
    } catch (error) {
      // Exception during auth - send error and disconnect
      console.error('Auth exception:', error);
      const errorInfo = getErrorInfo('AUTH_FAILED', 'Authentication failed');
      client.emit('auth:error', errorInfo);
      client.disconnect();
    }
  }

  // ─── MOVEMENT ──────────────────────────────────────────────────

  @SubscribeMessage('player:pixelMove')
  handlePixelMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { keys: number; predictedPx: number; predictedPy: number; sequence: number }
  ) {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    // Interrupt cast on movement
    if (this.abilityService.isPlayerCasting(player.id)) {
      this.abilityService.interruptCast(player.id, 'moved');
    }

    this.movementService.queueInput(player.id, data);
    this.gatheringService.cancelIfOutOfRange(player.id, data.predictedPx, data.predictedPy);
  }

  @SubscribeMessage('player:interact')
  handleInteract(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['player:interact']
  ) {
    return this.inventoryHandler.handleInteract(client, data);
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() timestamp: number): number {
    return timestamp;
  }

  // ─── ZONE EVENTS ──────────────────────────────────────────────

  @SubscribeMessage('zone:request')
  handleZoneRequest(@ConnectedSocket() client: Socket, @MessageBody() data: { zoneId: string }) {
    return this.zoneHandler.handleZoneRequest(client, data);
  }

  @SubscribeMessage('portal:use')
  handlePortalUse(@ConnectedSocket() client: Socket) {
    return this.zoneHandler.handlePortalUse(client);
  }

  @SubscribeMessage('hub:recall')
  handleHubRecall(@ConnectedSocket() client: Socket) {
    return this.zoneHandler.handleHubRecall(client);
  }

  @SubscribeMessage('hub:leave')
  handleHubLeave(@ConnectedSocket() client: Socket) {
    return this.zoneHandler.handleHubLeave(client);
  }

  @SubscribeMessage('expedition:start')
  handleExpeditionStart(@ConnectedSocket() client: Socket, @MessageBody() data: { tier: number }) {
    return this.zoneHandler.handleExpeditionStart(client, data);
  }

  // ─── INVENTORY EVENTS ─────────────────────────────────────────

  @SubscribeMessage('inventory:pickup')
  handleInventoryPickup(@ConnectedSocket() client: Socket, @MessageBody() data: ClientEvents['inventory:pickup']) {
    return this.inventoryHandler.handleInventoryPickup(client, data);
  }

  @SubscribeMessage('inventory:drop')
  handleInventoryDrop(@ConnectedSocket() client: Socket, @MessageBody() data: ClientEvents['inventory:drop']) {
    return this.inventoryHandler.handleInventoryDrop(client, data);
  }

  @SubscribeMessage('inventory:use')
  handleInventoryUse(@ConnectedSocket() client: Socket, @MessageBody() data: ClientEvents['inventory:use']) {
    return this.inventoryHandler.handleInventoryUse(client, data);
  }

  @SubscribeMessage('equipment:change')
  handleEquipmentChange(@ConnectedSocket() client: Socket, @MessageBody() data: { instanceId: string }) {
    return this.inventoryHandler.handleEquipmentChange(client, data);
  }

  @SubscribeMessage('inventory:unequip')
  handleInventoryUnequip(@ConnectedSocket() client: Socket, @MessageBody() data: { instanceId: string }) {
    return this.inventoryHandler.handleInventoryUnequip(client, data);
  }

  @SubscribeMessage('equipment:tool_swap')
  handleToolSwap(@ConnectedSocket() client: Socket) {
    return this.inventoryHandler.handleToolSwap(client);
  }

  @SubscribeMessage('inventory:reorder')
  handleInventoryReorder(@ConnectedSocket() client: Socket, @MessageBody() data: ClientEvents['inventory:reorder']) {
    return this.inventoryHandler.handleInventoryReorder(client, data);
  }

  @SubscribeMessage('storage:open')
  handleStorageOpen(@ConnectedSocket() client: Socket) {
    return this.inventoryHandler.handleStorageOpen(client);
  }

  @SubscribeMessage('entity:tool_use')
  handleToolUse(@ConnectedSocket() client: Socket, @MessageBody() payload: { targetEntityId: string }) {
    return this.inventoryHandler.handleToolUse(client, payload);
  }

  // ─── COMBAT EVENTS ────────────────────────────────────────────

  @SubscribeMessage('ability:use')
  handleAbilityUse(@ConnectedSocket() client: Socket, @MessageBody() data: { abilityId: string; targetEntityId?: string }) {
    return this.combatHandler.handleAbilityUse(client, data);
  }

  @SubscribeMessage('cast:cancel')
  handleCastCancel(@ConnectedSocket() client: Socket) {
    return this.combatHandler.handleCastCancel(client);
  }

  @SubscribeMessage('respawn:sos')
  handleRespawnSOS(@ConnectedSocket() client: Socket) {
    return this.combatHandler.handleRespawnSOS(client);
  }

  @SubscribeMessage('respawn:reboot')
  handleRespawnReboot(@ConnectedSocket() client: Socket, @MessageBody() payload: { itemInstanceId: string }) {
    return this.combatHandler.handleRespawnReboot(client, payload);
  }

  // ─── SOCIAL EVENTS ────────────────────────────────────────────

  @SubscribeMessage('chat:send')
  handleChat(@ConnectedSocket() client: Socket, @MessageBody() data: ClientEvents['chat:send']) {
    return this.socialHandler.handleChat(client, data);
  }

  @SubscribeMessage('npc:interact')
  handleNpcInteract(@ConnectedSocket() client: Socket, @MessageBody() data: { entityId: string }) {
    return this.socialHandler.handleNpcInteract(client, data);
  }

  @SubscribeMessage('trade:buy')
  handleTradeBuy(@ConnectedSocket() client: Socket, @MessageBody() data: { npcId: string; itemId: string; quantity: number }) {
    return this.socialHandler.handleTradeBuy(client, data);
  }

  @SubscribeMessage('trade:sell')
  handleTradeSell(@ConnectedSocket() client: Socket, @MessageBody() data: { npcId: string; itemInstanceId: string; quantity: number }) {
    return this.socialHandler.handleTradeSell(client, data);
  }

  @SubscribeMessage('quest:complete')
  handleQuestComplete(@ConnectedSocket() client: Socket, @MessageBody() data: { questId: string }) {
    return this.socialHandler.handleQuestComplete(client, data);
  }

  @SubscribeMessage('quest:abandon')
  handleQuestAbandon(@ConnectedSocket() client: Socket, @MessageBody() data: { questId: string }) {
    return this.socialHandler.handleQuestAbandon(client, data);
  }

  @SubscribeMessage('quest:accept')
  handleQuestAccept(@ConnectedSocket() client: Socket, @MessageBody() data: { questId: string }) {
    return this.socialHandler.handleQuestAccept(client, data);
  }

  @SubscribeMessage('poi:discover')
  handlePoiDiscover(@ConnectedSocket() client: Socket, @MessageBody() data: { poiId: string; worldX: number; worldY: number }) {
    return this.socialHandler.handlePoiDiscover(client, data);
  }

  @SubscribeMessage('gathering:start')
  handleGatheringStart(@ConnectedSocket() client: Socket, @MessageBody() data: { targetEntityId: string }) {
    return this.socialHandler.handleGatheringStart(client, data);
  }

  @SubscribeMessage('gathering:complete')
  handleGatheringComplete(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: import('@into-the-void/shared-types').TimingResult
  ) {
    return this.socialHandler.handleGatheringComplete(client, data);
  }

  @SubscribeMessage('lore:collect')
  handleLoreCollect(@ConnectedSocket() client: Socket, @MessageBody() data: { loreId: string; worldX: number; worldY: number }) {
    return this.socialHandler.handleLoreCollect(client, data);
  }

  @SubscribeMessage('mastery:query')
  handleMasteryQuery(@ConnectedSocket() client: Socket, @MessageBody() data: { biome: string }) {
    return this.socialHandler.handleMasteryQuery(client, data);
  }

  // ─── AUTOMATION EVENTS ────────────────────────────────────────

  @SubscribeMessage('automation:deploy')
  handleAutomationDeploy(@ConnectedSocket() client: Socket, @MessageBody() data: ClientEvents['automation:deploy']) {
    return this.automationHandler.handleAutomationDeploy(client, data);
  }

  @SubscribeMessage('automation:interact')
  handleAutomationInteract(@ConnectedSocket() client: Socket, @MessageBody() data: ClientEvents['automation:interact']) {
    return this.automationHandler.handleAutomationInteract(client, data);
  }

  @SubscribeMessage('automation:collect')
  handleAutomationCollect(@ConnectedSocket() client: Socket, @MessageBody() data: ClientEvents['automation:collect']) {
    return this.automationHandler.handleAutomationCollect(client, data);
  }

  @SubscribeMessage('automation:refuel')
  handleAutomationRefuel(@ConnectedSocket() client: Socket, @MessageBody() data: ClientEvents['automation:refuel']) {
    return this.automationHandler.handleAutomationRefuel(client, data);
  }

  @SubscribeMessage('automation:dismantle')
  handleAutomationDismantle(@ConnectedSocket() client: Socket, @MessageBody() data: ClientEvents['automation:dismantle']) {
    return this.automationHandler.handleAutomationDismantle(client, data);
  }

  @SubscribeMessage('automation:panel_request')
  handleAutomationPanelRequest(@ConnectedSocket() client: Socket) {
    return this.automationHandler.handleAutomationPanelRequest(client);
  }

  // ─── CRAFTING EVENTS ──────────────────────────────────────────

  @SubscribeMessage('crafting:start')
  handleCraftingStart(@ConnectedSocket() client: Socket, @MessageBody() data: ClientEvents['crafting:start']) {
    return this.automationHandler.handleCraftingStart(client, data);
  }

  @SubscribeMessage('crafting:collect')
  handleCraftingCollect(@ConnectedSocket() client: Socket) {
    return this.automationHandler.handleCraftingCollect(client);
  }

  @SubscribeMessage('crafting:recipes')
  handleCraftingRecipes(@ConnectedSocket() client: Socket) {
    return this.automationHandler.handleCraftingRecipes(client);
  }
}
