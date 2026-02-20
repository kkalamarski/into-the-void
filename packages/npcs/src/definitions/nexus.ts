import type {
  TraderDefinition,
  GuardDefinition,
  FactionRepDefinition,
  AmbientDefinition,
  ServiceDefinition,
  NpcDefinition,
} from '../types';

const NEXUS_TRADER: TraderDefinition = {
  id: 'npc_nexus_trader',
  displayName: 'Merchant Kira',
  description: 'A Nexus merchant dealing in goods from all factions.',
  npcType: 'trader',
  faction: 'nexus',
  textureKey: 'npc_nexus_trader',
  color: 0x4488cc, // Blue
  dialogue: [
    { text: "Welcome to Meridian's Exchange. Best prices in the sector.", condition: 'greeting' },
    { text: 'I deal with everyone. No questions asked.', condition: 'trade' },
    { text: 'Pleasure doing business.', condition: 'farewell' },
  ],
  inventory: [
    { itemId: 'medkit_basic', buyPrice: 55, sellPrice: 28, stock: 8 },
    { itemId: 'stim_energy', buyPrice: 80, sellPrice: 40, stock: 6 },
    { itemId: 'pickaxe_iron', buyPrice: 160, sellPrice: 80, stock: 3 },
    { itemId: 'rations_standard', buyPrice: 22, sellPrice: 11, stock: 25 },
    { itemId: 'antitoxin_common', buyPrice: 75, sellPrice: 38, stock: 12 },
    { itemId: 'world_coastal_shell', buyPrice: 70, sellPrice: 35, stock: 20 },
    { itemId: 'world_spore_sack', buyPrice: 500, sellPrice: 250, stock: 4 },
    { itemId: 'reagent_bioluminescent_compound', buyPrice: 50, sellPrice: 25, stock: 20 },
  ],
  specialization: 'general',
};

const NEXUS_GUARD: GuardDefinition = {
  id: 'npc_nexus_guard',
  displayName: 'Station Security',
  description: 'A neutral Nexus security officer maintaining peace in the trading hub.',
  npcType: 'guard',
  faction: 'nexus',
  textureKey: 'npc_nexus_guard',
  color: 0x225588, // Dark blue
  dialogue: [
    { text: 'Meridian is neutral ground. Keep it civil.', condition: 'greeting' },
    { text: 'Nothing to see here.', condition: 'busy' },
  ],
};

const NEXUS_REP: FactionRepDefinition = {
  id: 'npc_nexus_rep',
  displayName: 'Broker Chen',
  description: 'A Nexus Frontiers information broker and liaison.',
  npcType: 'faction_rep',
  faction: 'nexus',
  textureKey: 'npc_nexus_rep',
  color: 0x66aadd, // Light blue
  dialogue: [
    { text: 'Information is currency. How can Nexus assist you today?', condition: 'greeting' },
    { text: 'Connecting worlds, creating opportunities.', condition: 'farewell' },
  ],
  title: 'Nexus Broker',
};

const NEXUS_AMBIENT: AmbientDefinition = {
  id: 'npc_nexus_ambient',
  displayName: 'Data Analyst',
  description: 'A Nexus employee monitoring trade flows and market data.',
  npcType: 'ambient',
  faction: 'nexus',
  textureKey: 'npc_nexus_ambient',
  color: 0x88aabb, // Pale blue
  dialogue: [
    { text: 'Markets are fluctuating today. Interesting patterns.', condition: 'greeting' },
    { text: 'Processing trade data...', condition: 'busy' },
  ],
  role: 'Data Analyst',
};

const NEXUS_SERVICE: ServiceDefinition = {
  id: 'npc_nexus_service',
  displayName: 'Storage Manager',
  description: 'A Nexus storage facility operator offering secure item storage.',
  npcType: 'service',
  faction: 'nexus',
  textureKey: 'npc_nexus_service',
  color: 0xaaccdd, // Very light blue
  dialogue: [
    { text: 'Need secure storage? Nexus vaults are the safest in the sector.', condition: 'greeting' },
    { text: 'Your items are safe with us.', condition: 'farewell' },
  ],
  serviceType: 'storage',
};

export const NEXUS_NPCS: readonly NpcDefinition[] = [
  NEXUS_TRADER,
  NEXUS_GUARD,
  NEXUS_REP,
  NEXUS_AMBIENT,
  NEXUS_SERVICE,
];
