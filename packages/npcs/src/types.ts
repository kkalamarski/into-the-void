/**
 * NPC definition types for the packages/npcs registry.
 *
 * NPC Types (from lore):
 * - Trader: Buy/sell items, have inventory and price lists
 * - Guard: Faction security, no special interactions
 * - Faction Rep: Faction liaison, dialogue-focused
 * - Ambient: Background NPCs for atmosphere (dock workers, scientists)
 * - Service: Utility services (repair, storage, etc.)
 */

/** NPC type discriminator - the 5 NPC types from requirements */
export type NpcType = 'trader' | 'guard' | 'faction_rep' | 'ambient' | 'service';

/** Faction affiliation for NPCs */
export type NpcFaction = 'verdant' | 'helix' | 'nexus' | 'neutral';

/** Dialogue line for NPC conversations */
export interface DialogueLine {
  readonly text: string;
  readonly condition?: 'greeting' | 'farewell' | 'busy' | 'trade';
}

/** Trade inventory item for Trader NPCs */
export interface TradeItem {
  readonly itemId: string;
  readonly buyPrice: number;   // Price player pays to buy
  readonly sellPrice: number;  // Price player receives when selling
  readonly stock: number;      // -1 for unlimited
}

/** Base fields shared by all NPC definitions */
export interface BaseNpcDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly npcType: NpcType;
  readonly faction: NpcFaction;
  readonly textureKey: string;
  readonly color: number;  // Hex fallback color until sprite exists
  readonly dialogue: readonly DialogueLine[];
}

/** Trader NPC - can buy/sell items */
export interface TraderDefinition extends BaseNpcDefinition {
  readonly npcType: 'trader';
  readonly inventory: readonly TradeItem[];
  readonly specialization?: 'general' | 'weapons' | 'armor' | 'consumables' | 'materials';
}

/** Guard NPC - faction security, no special interactions */
export interface GuardDefinition extends BaseNpcDefinition {
  readonly npcType: 'guard';
}

/** Faction Representative NPC - faction liaison */
export interface FactionRepDefinition extends BaseNpcDefinition {
  readonly npcType: 'faction_rep';
  readonly title: string;  // e.g., "Verdant Liaison", "Helix Coordinator"
}

/** Ambient NPC - background characters for atmosphere */
export interface AmbientDefinition extends BaseNpcDefinition {
  readonly npcType: 'ambient';
  readonly role: string;  // e.g., "Dock Worker", "Scientist", "Technician"
}

/** Service NPC - utility services */
export interface ServiceDefinition extends BaseNpcDefinition {
  readonly npcType: 'service';
  readonly serviceType: 'repair' | 'storage' | 'transport' | 'medical';
}

/** Discriminated union of all NPC definitions */
export type NpcDefinition =
  | TraderDefinition
  | GuardDefinition
  | FactionRepDefinition
  | AmbientDefinition
  | ServiceDefinition;
