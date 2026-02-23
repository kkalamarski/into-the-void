import type { TimingChallenge, TimingResult, GatheringAccuracy, ResourceCategory } from '../game/proficiency';

/**
 * Game event base interface
 */
export interface GameEvent<T = unknown> {
  /** Event type identifier */
  type: string;
  /** Event payload */
  payload: T;
  /** Event timestamp */
  timestamp: number;
  /** Event sequence number */
  sequence?: number;
}

/**
 * Client-to-server event types
 */
export type ClientEventType =
  | 'player:move'
  | 'player:interact'
  | 'player:action'
  | 'combat:action'
  | 'combat:start'
  | 'chat:send'
  | 'inventory:use'
  | 'inventory:drop'
  | 'inventory:pickup'
  | 'inventory:reorder'
  | 'zone:request'
  | 'equipment:change'
  | 'inventory:unequip'
  | 'equipment:tool_swap'
  | 'storage:open'
  | 'entity:tool_use'
  | 'portal:use'
  | 'hub:recall'
  | 'hub:leave'
  | 'trade:buy'
  | 'trade:sell'
  | 'ability:use'
  | 'quest:complete'
  | 'quest:abandon'
  | 'quest:accept'
  | 'poi:discover'
  | 'gathering:start'
  | 'gathering:complete';

/**
 * Server-to-client event types
 */
export type ServerEventType =
  | 'zone:state'
  | 'zone:update'
  | 'zone:chunk'
  | 'entity:spawn'
  | 'entity:despawn'
  | 'entity:update'
  | 'entity:batch'
  | 'player:joined'
  | 'player:left'
  | 'player:moved'
  | 'player:xp'
  | 'player:level'
  | 'player:health'
  | 'player:regen'
  | 'combat:start'
  | 'combat:damage'
  | 'combat:result'
  | 'combat:end'
  | 'chat:message'
  | 'inventory:update'
  | 'storage:update'
  | 'stats:update'
  | 'player:death'
  | 'player:respawn'
  | 'error'
  | 'trade:result'
  | 'credits:update'
  | 'ability:result'
  | 'ability:cooldown'
  | 'buff:apply'
  | 'buff:expire'
  | 'quest:progress'
  | 'quest:completed'
  | 'quest:abandoned'
  | 'quest:accepted'
  | 'quest:error'
  | 'poi:discovered'
  | 'poi:already_discovered'
  | 'gathering:challenge'
  | 'gathering:result';

/**
 * Socket.io event map for type safety
 */
export interface ClientEvents {
  'auth': import('./messages').AuthRequest;
  'player:move': { direction: import('../core/position').Direction; sequence?: number };
  'player:interact': { targetId: string };
  'player:action': { action: string; data?: unknown };
  'combat:action': import('../game/combat').CombatActionRequest;
  'combat:start': { targetEntityId: string };
  'chat:send': ChatMessageRequest;
  'inventory:use': { instanceId: string };
  'inventory:drop': { instanceId: string; quantity: number };
  'inventory:pickup': { entityId: string };
  'inventory:reorder': { fromSlot: number; toSlot: number };
  'zone:request': { zoneId: string };
  'equipment:change': { instanceId: string };
  'inventory:unequip': { instanceId: string };
  'equipment:tool_swap': Record<string, never>;
  'storage:open': Record<string, never>;
  'entity:tool_use': { targetEntityId: string };
  'portal:use': Record<string, never>;
  'hub:recall': Record<string, never>;
  'hub:leave': Record<string, never>;
  'respawn:sos': Record<string, never>;
  'respawn:reboot': { itemInstanceId: string };
  'npc:interact': { entityId: string };
  'trade:buy': { npcId: string; itemId: string; quantity: number };
  'trade:sell': { npcId: string; itemInstanceId: string; quantity: number };
  'ability:use': { abilityId: string; targetEntityId?: string };
  'quest:complete': { questId: string };
  'quest:abandon': { questId: string };
  'quest:accept': { questId: string };
  'poi:discover': { poiId: string; worldX: number; worldY: number };
  'gathering:start': { targetEntityId: string };
  'gathering:complete': TimingResult;
}

/**
 * Server events map
 */
export interface ServerEvents {
  'zone:state': import('../core/zone').ZoneState;
  'zone:update': Partial<import('../core/zone').ZoneState>;
  'zone:chunk': { zoneId: string; chunk: import('../core/zone').ChunkData; biome: import('../game/biome').BiomeType; entities?: import('../core/entity').Entity[] };
  'entity:spawn': import('../core/entity').Entity;
  'entity:despawn': { entityId: string };
  'entity:update': { entityId: string; changes: Partial<import('../core/entity').Entity> };
  'entity:batch': { updates: Array<{ entityId: string; changes: Partial<import('../core/entity').Entity> }> };
  'player:joined': import('../core/player').PlayerPublic;
  'player:left': { playerId: string };
  'player:moved': { playerId: string; position: import('../core/position').Position; lastProcessedInput?: number };
  'combat:start': import('../game/combat').CombatState;
  'combat:damage': {
    attackerId: string;
    defenderId: string;
    damage: number;
    defenderHealth: number;
    defenderMaxHealth: number;
    critical: boolean;
    killed: boolean;
  };
  'combat:result': import('../game/combat').CombatResult;
  'combat:end': { combatId: string; winner: string };
  'chat:message': ChatMessage;
  'inventory:update': import('../game/inventory').Inventory;
  'storage:update': import('../game/storage').PersonalStorage;
  'stats:update': import('../game/stats').CharStatsPayload;
  'player:death': {
    playerId: string;
    killerId: string;  // Entity that killed the player
    position: import('../core/position').Position; // Where player died
  };
  'player:respawn': {
    playerId: string;
    position: import('../core/position').Position; // Where player respawned
    health: number; // Restored health amount
    maxHealth: number; // Max health for reference
  };
  'error': { code: string; message: string };
  'trade:result': {
    success: boolean;
    action: 'buy' | 'sell';
    itemId?: string;
    quantity?: number;
    totalPrice?: number;
    newBalance?: number;
    error?: string;
  };
  'credits:update': { credits: number };
  'player:xp': {
    playerId: string;
    xp: number;
    xpToNextLevel: number;
    level: number;
    leveledUp: boolean;
  };
  'player:level': {
    playerId: string;
    level: number;
    health: number;
    maxHealth: number;
  };
  'player:health': {
    playerId: string;
    health: number;
    maxHealth: number;
  };
  'player:regen': {
    playerId: string;
    health: number;
    maxHealth: number;
    energy: number;
    maxEnergy: number;
  };
  'npc:interact:response': {
    npcId: string;
    displayName: string;
    npcType: 'trader' | 'guard' | 'faction_rep' | 'ambient' | 'service';
    faction: 'verdant' | 'helix' | 'nexus' | 'neutral';
    description: string;
    dialogue: Array<{ text: string; condition?: string }>;
    color: number;
    inventory?: Array<{ itemId: string; buyPrice: number; sellPrice: number; stock: number }>;
    serviceType?: 'repair' | 'storage' | 'transport' | 'medical';
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
  };
  'ability:result': {
    success: boolean;
    abilityId: string;
    error?: string;
    damage?: number;
    targetHealth?: number;
    targetMaxHealth?: number;
    energyRemaining?: number;
    cooldownEndsAt?: number; // timestamp when cooldown expires
  };
  'ability:cooldown': {
    abilityId: string;
    cooldownEndsAt: number;
  };
  'buff:apply': {
    buffId: string;
    displayName: string;
    stat: string;
    amount: number;
    expiresAt: number;
    iconColor: number;
  };
  'buff:expire': {
    buffId: string;
  };
  'quest:progress': {
    questId: string;
    displayName: string;
    description: string;
    state: import('../game/quest').QuestState;
    objectives: import('../game/quest').ObjectiveProgress[];
    rewards: {
      credits?: number;
      xp?: number;
      items?: { itemId: string; quantity: number }[];
    };
  };
  'quest:completed': {
    questId: string;
    displayName: string;
    rewards: {
      credits?: number;
      xp?: number;
      items?: { itemId: string; quantity: number }[];
    };
  };
  'quest:abandoned': {
    questId: string;
  };
  'quest:accepted': {
    questId: string;
  };
  'quest:error': {
    message: string;
  };
  'npc:quest-markers': {
    markers: Array<{
      npcId: string;
      markerType: 'available' | 'ready' | 'none';
    }>;
  };
  'poi:discovered': { poiId: string; poiType: string; reward: import('../game/poi').DiscoveryReward };
  'poi:already_discovered': { poiId: string };
  'poi:discovered_ids': { poiIds: string[] };
  /** Sent on character join with list of discovered rare nodes */
  'rare-nodes:discovered': (data: {
    discoveries: Array<{
      entityId: string;
      rarity: 'rare' | 'epic';
      resourceType: 'mineral' | 'plant';
      zoneId: string;
      worldX: number;
      worldY: number;
      resourceId: string;
    }>;
  }) => void;
  /** Sent when player discovers a new rare node */
  'rare-node:new-discovery': (data: {
    entityId: string;
    rarity: 'rare' | 'epic';
    resourceType: 'mineral' | 'plant';
    zoneId: string;
    worldX: number;
    worldY: number;
    resourceId: string;
  }) => void;
  'gathering:challenge': TimingChallenge;
  'gathering:result': {
    success: boolean;
    accuracy: GatheringAccuracy;
    yieldMultiplier: number;
    items: { itemId: string; quantity: number }[];
    proficiencyXP: number;
    proficiencyLevel: number;
    category: ResourceCategory;
    error?: string;
  };
}

/**
 * Chat message request
 */
export interface ChatMessageRequest {
  message: string;
  channel: ChatChannel;
  targetId?: string; // For whispers
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  channel: ChatChannel;
  timestamp: number;
}

/**
 * Chat channels
 */
export type ChatChannel = 'zone' | 'faction' | 'whisper' | 'global' | 'system';
