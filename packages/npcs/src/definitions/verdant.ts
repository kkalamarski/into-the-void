import type {
  TraderDefinition,
  GuardDefinition,
  FactionRepDefinition,
  AmbientDefinition,
  ServiceDefinition,
  NpcDefinition,
} from '../types';

const VERDANT_TRADER: TraderDefinition = {
  id: 'npc_verdant_trader',
  displayName: 'Sylva Greenleaf',
  description: 'A Verdant supply coordinator who trades bioengineered goods and survival equipment.',
  npcType: 'trader',
  faction: 'verdant',
  textureKey: 'npc_verdant_trader',
  color: 0x44aa44, // Green
  dialogue: [
    { text: 'Welcome to Canopy Station. Looking to trade? I have supplies for your expeditions.', condition: 'greeting' },
    { text: 'Our bioengineered products are the finest in the sector.', condition: 'trade' },
    { text: 'Safe travels through the forest.', condition: 'farewell' },
  ],
  inventory: [
    { itemId: 'health_vial_common', buyPrice: 50, sellPrice: 25, stock: 10 },
    { itemId: 'health_vial_rare', buyPrice: 220, sellPrice: 110, stock: 5 },
    { itemId: 'energy_cell_common', buyPrice: 55, sellPrice: 28, stock: 10 },
    { itemId: 'antitoxin_common', buyPrice: 80, sellPrice: 40, stock: 10 },
    { itemId: 'antitoxin_rare', buyPrice: 300, sellPrice: 150, stock: 5 },
    { itemId: 'world_luminous_extract', buyPrice: 350, sellPrice: 175, stock: 6 },
    { itemId: 'reagent_bioluminescent_compound', buyPrice: 55, sellPrice: 28, stock: 15 },
    { itemId: 'kelp_salve_common', buyPrice: 80, sellPrice: 40, stock: 15 },
    { itemId: 'pressure_pill_common', buyPrice: 100, sellPrice: 50, stock: 15 },
    { itemId: 'gill_extract_rare', buyPrice: 400, sellPrice: 200, stock: 8 },
    { itemId: 'brine_capacitor_rare', buyPrice: 330, sellPrice: 165, stock: 10 },
    // Phase 120: Hazard protection (Verdant specializes in Chemical + Biological)
    { itemId: 'module_chem_filter_rare', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    { itemId: 'module_bio_seal_rare', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    { itemId: 'module_chem_filter_epic', buyPrice: 12000, sellPrice: 6000, stock: 1 },
    { itemId: 'module_bio_seal_epic', buyPrice: 12000, sellPrice: 6000, stock: 1 },
    { itemId: 'consumable_chem_neutralizer', buyPrice: 500, sellPrice: 250, stock: 10 },
    { itemId: 'consumable_bio_inoculant', buyPrice: 500, sellPrice: 250, stock: 10 },
    { itemId: 'consumable_anomaly_anchor', buyPrice: 600, sellPrice: 300, stock: 5 },
  ],
  specialization: 'consumables',
};

const VERDANT_GUARD: GuardDefinition = {
  id: 'npc_verdant_guard',
  displayName: 'Canopy Sentinel',
  description: 'A Verdant security officer maintaining order in the station.',
  npcType: 'guard',
  faction: 'verdant',
  textureKey: 'npc_verdant_guard',
  color: 0x228822, // Dark green
  dialogue: [
    { text: 'Canopy Station is a safe zone. No weapons discharge permitted.', condition: 'greeting' },
    { text: 'Move along, citizen.', condition: 'busy' },
  ],
};

const VERDANT_REP: FactionRepDefinition = {
  id: 'npc_verdant_rep',
  displayName: 'Liaison Moss',
  description: 'A Verdant Dynamics representative who handles faction affairs.',
  npcType: 'faction_rep',
  faction: 'verdant',
  textureKey: 'npc_verdant_rep',
  color: 0x66cc66, // Light green
  dialogue: [
    { text: 'Greetings, operative. Verdant Dynamics appreciates your sustainable approach to resource gathering.', condition: 'greeting' },
    { text: 'Remember: sustainability is profitability.', condition: 'farewell' },
  ],
  title: 'Verdant Liaison',
};

const VERDANT_AMBIENT: AmbientDefinition = {
  id: 'npc_verdant_ambient',
  displayName: 'Bio-Technician',
  description: 'A Verdant technician tending to the living architecture.',
  npcType: 'ambient',
  faction: 'verdant',
  textureKey: 'npc_verdant_ambient',
  color: 0x88bb88, // Pale green
  dialogue: [
    { text: 'The fungal networks are responding well today.', condition: 'greeting' },
    { text: 'Busy calibrating the bioluminescent arrays...', condition: 'busy' },
  ],
  role: 'Bio-Technician',
};

const VERDANT_SERVICE: ServiceDefinition = {
  id: 'npc_verdant_service',
  displayName: 'Dr. Fernwood',
  description: 'A Verdant medical specialist offering treatment services.',
  npcType: 'service',
  faction: 'verdant',
  textureKey: 'npc_verdant_service',
  color: 0xaaddaa, // Very light green
  dialogue: [
    { text: 'Welcome to the medical bay. I can treat your injuries if needed.', condition: 'greeting' },
    { text: 'Stay healthy out there.', condition: 'farewell' },
  ],
  serviceType: 'medical',
};

// Ambient NPCs — add life to the hub (Phase 142)
const VERDANT_BOTANIST: AmbientDefinition = {
  id: 'npc_verdant_botanist',
  displayName: 'Canopy Botanist',
  description: 'A Verdant researcher cataloguing the station\'s living architecture.',
  npcType: 'ambient',
  faction: 'verdant',
  textureKey: 'npc_verdant_ambient',
  color: 0x55aa55,
  dialogue: [
    { text: 'The atrium specimens are thriving today.', condition: 'greeting' },
    { text: 'Fascinating symbiotic patterns...', condition: 'busy' },
  ],
  role: 'Botanist',
};

const VERDANT_GARDENER: AmbientDefinition = {
  id: 'npc_verdant_gardener',
  displayName: 'Growth Tender',
  description: 'A worker who maintains the nursery\'s bio-engineered specimens.',
  npcType: 'ambient',
  faction: 'verdant',
  textureKey: 'npc_verdant_ambient',
  color: 0x66bb66,
  dialogue: [
    { text: 'These seedlings need constant attention. Verdant demands perfection.', condition: 'greeting' },
  ],
  role: 'Growth Tender',
};

const VERDANT_PATROL: GuardDefinition = {
  id: 'npc_verdant_patrol',
  displayName: 'Canopy Warden',
  description: 'A Verdant security officer patrolling the inner corridors.',
  npcType: 'guard',
  faction: 'verdant',
  textureKey: 'npc_verdant_guard',
  color: 0x338833,
  dialogue: [
    { text: 'All clear in this sector.', condition: 'greeting' },
    { text: 'On patrol. Move along.', condition: 'busy' },
  ],
};

const VERDANT_WORKER: AmbientDefinition = {
  id: 'npc_verdant_worker',
  displayName: 'Root Worker',
  description: 'A maintenance worker tending to the station\'s organic infrastructure.',
  npcType: 'ambient',
  faction: 'verdant',
  textureKey: 'npc_verdant_ambient',
  color: 0x77aa77,
  dialogue: [
    { text: 'The root networks need recalibrating. Always something to fix.', condition: 'greeting' },
  ],
  role: 'Root Worker',
};

export const VERDANT_NPCS: readonly NpcDefinition[] = [
  VERDANT_TRADER,
  VERDANT_GUARD,
  VERDANT_REP,
  VERDANT_AMBIENT,
  VERDANT_SERVICE,
  VERDANT_BOTANIST,
  VERDANT_GARDENER,
  VERDANT_PATROL,
  VERDANT_WORKER,
];
