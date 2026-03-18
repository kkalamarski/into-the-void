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
    { itemId: 'health_vial_common', buyPrice: 55, sellPrice: 28, stock: 10 },
    { itemId: 'energy_cell_common', buyPrice: 55, sellPrice: 28, stock: 10 },
    { itemId: 'tool_research_common', buyPrice: 350, sellPrice: 175, stock: 3 },
    { itemId: 'antitoxin_common', buyPrice: 75, sellPrice: 38, stock: 12 },
    { itemId: 'world_coastal_shell', buyPrice: 70, sellPrice: 35, stock: 20 },
    { itemId: 'world_spore_sack', buyPrice: 500, sellPrice: 250, stock: 4 },
    { itemId: 'reagent_bioluminescent_compound', buyPrice: 50, sellPrice: 25, stock: 20 },
    { itemId: 'pressure_pill_common', buyPrice: 90, sellPrice: 45, stock: 12 },
    { itemId: 'kelp_salve_common', buyPrice: 70, sellPrice: 35, stock: 12 },
    { itemId: 'stability_tonic_epic', buyPrice: 2000, sellPrice: 1000, stock: 4 },
    // Phase 120: Hazard protection (Nexus specializes in Anomalous + Chemical)
    { itemId: 'module_anomaly_ward_rare', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    { itemId: 'module_chem_filter_rare', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    { itemId: 'module_anomaly_ward_epic', buyPrice: 12000, sellPrice: 6000, stock: 1 },
    { itemId: 'module_chem_filter_epic', buyPrice: 12000, sellPrice: 6000, stock: 1 },
    { itemId: 'consumable_anomaly_anchor', buyPrice: 500, sellPrice: 250, stock: 10 },
    { itemId: 'consumable_chem_neutralizer', buyPrice: 500, sellPrice: 250, stock: 10 },
    { itemId: 'consumable_thermal_coolant', buyPrice: 600, sellPrice: 300, stock: 5 },
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

// Ambient NPCs — add life to the hub (Phase 142)
const NEXUS_ANALYST: AmbientDefinition = {
  id: 'npc_nexus_analyst',
  displayName: 'Market Analyst',
  description: 'A Nexus analyst monitoring real-time trade flows on the exchange floor.',
  npcType: 'ambient',
  faction: 'nexus',
  textureKey: 'npc_nexus_ambient',
  color: 0x5599bb,
  dialogue: [
    { text: 'Commodity indices are shifting. Someone is making a play.', condition: 'greeting' },
    { text: 'Can\'t talk. Market close in twenty minutes.', condition: 'busy' },
  ],
  role: 'Market Analyst',
};

const NEXUS_ARCHIVIST: AmbientDefinition = {
  id: 'npc_nexus_archivist',
  displayName: 'Data Archivist',
  description: 'A Nexus records keeper cataloguing data in the archive.',
  npcType: 'ambient',
  faction: 'nexus',
  textureKey: 'npc_nexus_ambient',
  color: 0x7799aa,
  dialogue: [
    { text: 'Every transaction recorded. Every communication logged. Knowledge is power.', condition: 'greeting' },
  ],
  role: 'Data Archivist',
};

const NEXUS_PATROL: GuardDefinition = {
  id: 'npc_nexus_patrol',
  displayName: 'Meridian Security',
  description: 'A plainclothes Nexus security agent patrolling the commons.',
  npcType: 'guard',
  faction: 'nexus',
  textureKey: 'npc_nexus_guard',
  color: 0x336688,
  dialogue: [
    { text: 'Everything is under control. As always.', condition: 'greeting' },
    { text: 'Just observing.', condition: 'busy' },
  ],
};

const NEXUS_CLERK: AmbientDefinition = {
  id: 'npc_nexus_clerk',
  displayName: 'Port Clerk',
  description: 'A Nexus administrative clerk processing transit documents.',
  npcType: 'ambient',
  faction: 'nexus',
  textureKey: 'npc_nexus_ambient',
  color: 0x99bbcc,
  dialogue: [
    { text: 'Departure manifest, arrival forms, customs declarations... it never ends.', condition: 'greeting' },
  ],
  role: 'Port Clerk',
};

export const NEXUS_NPCS: readonly NpcDefinition[] = [
  NEXUS_TRADER,
  NEXUS_GUARD,
  NEXUS_REP,
  NEXUS_AMBIENT,
  NEXUS_SERVICE,
  NEXUS_ANALYST,
  NEXUS_ARCHIVIST,
  NEXUS_PATROL,
  NEXUS_CLERK,
];
