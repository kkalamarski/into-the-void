import type {
  TraderDefinition,
  GuardDefinition,
  FactionRepDefinition,
  AmbientDefinition,
  ServiceDefinition,
  NpcDefinition,
} from '../types';

// Neutral hub uses Meridian Station but has distinct NPCs for unaffiliated players
const NEUTRAL_TRADER: TraderDefinition = {
  id: 'npc_neutral_trader',
  displayName: 'Freelance Vendor',
  description: 'An independent merchant catering to unaffiliated operatives.',
  npcType: 'trader',
  faction: 'neutral',
  textureKey: 'npc_neutral_trader',
  color: 0x888888, // Gray
  dialogue: [
    { text: 'No faction, no problem. I sell to anyone with credits.', condition: 'greeting' },
    { text: 'Fair deals for free agents.', condition: 'trade' },
    { text: 'Watch your back out there.', condition: 'farewell' },
  ],
  inventory: [
    { itemId: 'medkit_basic', buyPrice: 60, sellPrice: 30, stock: 5 },
    { itemId: 'rations_standard', buyPrice: 25, sellPrice: 12, stock: 15 },
  ],
  specialization: 'general',
};

const NEUTRAL_GUARD: GuardDefinition = {
  id: 'npc_neutral_guard',
  displayName: 'Mercenary Guard',
  description: 'A hired guard maintaining security in the neutral zone.',
  npcType: 'guard',
  faction: 'neutral',
  textureKey: 'npc_neutral_guard',
  color: 0x666666, // Dark gray
  dialogue: [
    { text: 'This area is protected. For a price.', condition: 'greeting' },
    { text: 'Stay out of trouble.', condition: 'busy' },
  ],
};

const NEUTRAL_REP: FactionRepDefinition = {
  id: 'npc_neutral_rep',
  displayName: 'Independent Liaison',
  description: 'A contact who helps unaffiliated operatives navigate the system.',
  npcType: 'faction_rep',
  faction: 'neutral',
  textureKey: 'npc_neutral_rep',
  color: 0xaaaaaa, // Light gray
  dialogue: [
    { text: "Unaffiliated, huh? Smart choice. The corps only care about their own interests.", condition: 'greeting' },
    { text: 'Freedom has its costs. Make sure you can pay them.', condition: 'farewell' },
  ],
  title: 'Independent Contact',
};

const NEUTRAL_AMBIENT: AmbientDefinition = {
  id: 'npc_neutral_ambient',
  displayName: 'Drifter',
  description: 'A wanderer passing through the neutral zone.',
  npcType: 'ambient',
  faction: 'neutral',
  textureKey: 'npc_neutral_ambient',
  color: 0x999999, // Medium gray
  dialogue: [
    { text: 'Just passing through. Same as you, probably.', condition: 'greeting' },
    { text: '*nods silently*', condition: 'busy' },
  ],
  role: 'Drifter',
};

const NEUTRAL_SERVICE: ServiceDefinition = {
  id: 'npc_neutral_service',
  displayName: 'Field Medic',
  description: 'A former corporate medic now offering services independently.',
  npcType: 'service',
  faction: 'neutral',
  textureKey: 'npc_neutral_service',
  color: 0xbbbbbb, // Pale gray
  dialogue: [
    { text: 'I patch up anyone who can pay. No questions asked.', condition: 'greeting' },
    { text: 'Try not to die out there.', condition: 'farewell' },
  ],
  serviceType: 'medical',
};

export const NEUTRAL_NPCS: readonly NpcDefinition[] = [
  NEUTRAL_TRADER,
  NEUTRAL_GUARD,
  NEUTRAL_REP,
  NEUTRAL_AMBIENT,
  NEUTRAL_SERVICE,
];
