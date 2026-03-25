import type { TimingChallenge, TimingResult, GatheringAccuracy, ResourceCategory } from '../game/proficiency';
import type { ZoneMasteryProgress, MasteryTier, MasteryReward } from '../game/zone-mastery';
import type { DamageType } from '../game/combat';
import type { AutomationPanelEntry, LootWindowData } from '../game/automation';
import type { CraftingDiscipline, QualityTier, RecipeDefinition } from '../game/crafting';

/**
 * Expedition destination with tier and lock status
 */
export interface ExpeditionDestination {
  biome: string;
  displayName: string;
  tier: number;
  requiredLevel: number;
  locked: boolean;
}

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
  | 'gathering:complete'
  | 'cast:cancel'
  | 'automation:deploy'
  | 'automation:interact'
  | 'automation:collect'
  | 'automation:refuel'
  | 'automation:dismantle'
  | 'automation:panel_request'
  | 'crafting:start'
  | 'crafting:collect'
  | 'crafting:recipes'
  | 'player:pixelMove';

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
  | 'gathering:result'
  | 'cast:start'
  | 'cast:interrupt'
  | 'shield:apply'
  | 'shield:absorb'
  | 'shield:expire'
  | 'creature:frenzy'
  | 'creature:stampede'
  | 'hazard:update'
  | 'hazard:damage'
  | 'hazard:clear'
  | 'liquid:update'
  | 'liquid:damage'
  | 'liquid:heal'
  | 'automation:deployed'
  | 'automation:loot_window'
  | 'automation:collected'
  | 'automation:refueled'
  | 'automation:dismantled'
  | 'automation:panel_state'
  | 'automation:status_update'
  | 'crafting:started'
  | 'crafting:completed'
  | 'crafting:error'
  | 'crafting:nearby'
  | 'crafting:recipe-list'
  | 'positionBatch'
  | 'positionCorrection';

/**
 * Socket.io event map for type safety
 */
export interface ClientEvents {
  'auth': import('./messages').AuthRequest;
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
  'cast:cancel': Record<string, never>;
  'lore:collect': { loreId: string; worldX: number; worldY: number };
  'mastery:query': { biome: string };
  'expedition:start': { tier: number };
  'automation:deploy': { deployableItemId: string; position: { x: number; y: number; zoneId: string } };
  'automation:interact': { entityId: string };
  'automation:collect': { deployableId: string };
  'automation:refuel': { deployableId: string; fuelInstanceId: string };
  'automation:dismantle': { deployableId: string };
  'automation:panel_request': Record<string, never>;
  'crafting:start': { recipeId: string };
  'crafting:collect': Record<string, never>;
  'crafting:recipes': Record<string, never>;
  'player:pixelMove': {
    keys: number;           // bitmask: W=1, A=2, S=4, D=8
    predictedPx: number;    // client-predicted X after applying input
    predictedPy: number;    // client-predicted Y after applying input
    sequence: number;       // monotonically increasing counter per client
  };
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
  'combat:start': import('../game/combat').CombatState;
  'combat:damage': {
    attackerId: string;
    defenderId: string;
    damage: number;
    defenderHealth: number;
    defenderMaxHealth: number;
    critical: boolean;
    killed: boolean;
    damageType?: DamageType;
    absorbed?: number;
    reducedBy?: number;
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
    serviceType?: 'repair' | 'storage' | 'transport' | 'medical' | 'expedition';
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
    expeditionDestinations?: ExpeditionDestination[];
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
  'shield:apply': {
    absorbAmount: number;
    durationMs: number;
    expiresAt: number;
  };
  'shield:absorb': {
    absorbed: number;
    remaining: number;
    maxAbsorb: number;
  };
  'shield:expire': {
    playerId: string;
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
  'cast:start': {
    abilityId: string;
    targetEntityId?: string;
    castTimeMs: number;
    castEndsAt: number;
  };
  'cast:interrupt': {
    abilityId: string;
    reason: 'moved' | 'damaged' | 'cancelled' | 'died';
  };
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
  'lore:collected': { loreId: string; title: string; category: string; xpReward: number };
  'lore:already_collected': { loreId: string };
  'mastery:progress': { biome: string; progress: ZoneMasteryProgress };
  'mastery:completed': { biome: string; tier: MasteryTier; rewards: MasteryReward[] };
  'expedition:complete': { biome: string; position: import('../core/position').Position };
  /** CRAI-04/06: Frenzy state change for maniac visual overlay */
  'creature:frenzy': {
    entityId: string;
    frenzied: boolean;
  };
  /** CRAI-01: Stampede event when 3+ herbivores flee simultaneously */
  'creature:stampede': {
    zoneId: string;
    creatureIds: string[];
    direction: { dx: number; dy: number };
    affectedPlayerIds: string[];
    damage: number;
  };
  /** HAZD-08: Hazard state update sent when entering/leaving hazard zones */
  'hazard:update': {
    active: boolean;
    hazardType?: string;
    displayName?: string;
    color?: string;
    protectionPercent: number;
    tier?: number;
    inGracePeriod?: boolean;
    stackCount?: number;
  };
  /** HAZD-02: Hazard damage tick notification */
  'hazard:damage': {
    playerId: string;
    damage: number;
    health: number;
    maxHealth: number;
    hazardType: string;
    protectionPercent: number;
  };
  /** HAZD-09: Hazard cleared (left zone, entered hub, or fully protected) */
  'hazard:clear': {
    playerId: string;
    reason: 'left_zone' | 'entered_hub' | 'fully_protected';
  };
  /** FX-01/02: Liquid effect state update (entering/leaving liquid) */
  'liquid:update': import('../game/liquid').LiquidUpdatePayload;
  /** FX-02: Liquid damage tick notification */
  'liquid:damage': import('../game/liquid').LiquidDamagePayload;
  /** FX-03: Liquid heal tick notification */
  'liquid:heal': import('../game/liquid').LiquidHealPayload;
  /** AUTO-08: Automation structure deployed */
  'automation:deployed': {
    deployableId: string;
    deployableType: string;
    position: { x: number; y: number; zoneId: string };
  };
  /** AUTO-09: Loot window data for interacting with deployed structure */
  'automation:loot_window': LootWindowData;
  /** AUTO-09: Resources collected from a deployable */
  'automation:collected': {
    deployableId: string;
    items: { itemId: string; quantity: number }[];
  };
  /** AUTO-09: Deployable refueled */
  'automation:refueled': {
    deployableId: string;
    fuelLevel: number;
    maxFuel: number;
  };
  /** AUTO-09: Deployable dismantled */
  'automation:dismantled': {
    deployableId: string;
    recoveredItems: { itemId: string; quantity: number }[];
  };
  /** AUTO-09: Panel state with all owned structures */
  'automation:panel_state': {
    structures: AutomationPanelEntry[];
  };
  /** AUTO-08: Status update for a specific deployable */
  'automation:status_update': {
    deployableId: string;
    status: string;
    fuelLevel: number;
    durabilityPercent: number;
    accumulatedCount: number;
  };
  /** CRFT-05: Craft timer started — client uses durationMs for local countdown */
  'crafting:started': {
    recipeId: string;
    durationMs: number;
    startedAt: number;
  };
  /** CRFT-03: Craft completed — output item + proficiency XP + updated proficiency */
  'crafting:completed': {
    recipeId: string;
    outputItemId: string;
    qualityTier: QualityTier;
    proficiencyXP: number;
    discipline: CraftingDiscipline;
    newProficiencyLevel: number;
    newProficiencyXP: number;
  };
  /** CRFT-03: Crafting error with machine-readable code */
  'crafting:error': {
    code: string;
    message: string;
  };
  /** Social broadcast: nearby players see crafting activity */
  'crafting:nearby': {
    playerId: string;
    recipeId: string;
  };
  /** Phase 123: Recipe list with per-character unlock status + proficiency */
  'crafting:recipe-list': {
    recipes: Array<{
      recipe: RecipeDefinition;
      unlocked: boolean;
      unlockReasons: string[];
    }>;
    proficiency: import('../game/crafting').CraftingProficiencyData;
  };
  /** Phase 132: Batch position update for all players in zone (server → client, 20 Hz) */
  'positionBatch': {
    updates: Array<{ playerId: string; px: number; py: number }>;
  };
  /** Phase 132: Server-authoritative position correction for reconciliation */
  'positionCorrection': {
    px: number;
    py: number;
    sequence: number;  // echoes the client's sequence for reconciliation
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
export type ChatChannel = 'local' | 'zone' | 'faction' | 'whisper' | 'global' | 'system';
