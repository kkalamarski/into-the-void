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
  | 'chat:send'
  | 'inventory:use'
  | 'inventory:drop'
  | 'inventory:pickup'
  | 'inventory:reorder'
  | 'zone:request'
  | 'equipment:change'
  | 'inventory:unequip'
  | 'equipment:tool_swap'
  | 'storage:open';

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
  | 'player:joined'
  | 'player:left'
  | 'player:moved'
  | 'combat:start'
  | 'combat:result'
  | 'combat:end'
  | 'chat:message'
  | 'inventory:update'
  | 'storage:update'
  | 'stats:update'
  | 'error';

/**
 * Socket.io event map for type safety
 */
export interface ClientEvents {
  'auth': import('./messages').AuthRequest;
  'player:move': { direction: import('../core/position').Direction; sequence?: number };
  'player:interact': { targetId: string };
  'player:action': { action: string; data?: unknown };
  'combat:action': import('../game/combat').CombatActionRequest;
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
  'player:joined': import('../core/player').PlayerPublic;
  'player:left': { playerId: string };
  'player:moved': { playerId: string; position: import('../core/position').Position; lastProcessedInput?: number };
  'combat:start': import('../game/combat').CombatState;
  'combat:result': import('../game/combat').CombatResult;
  'combat:end': { combatId: string; winner: string };
  'chat:message': ChatMessage;
  'inventory:update': import('../game/inventory').Inventory;
  'storage:update': import('../game/storage').PersonalStorage;
  'stats:update': import('../game/stats').CharStatsPayload;
  'error': { code: string; message: string };
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
