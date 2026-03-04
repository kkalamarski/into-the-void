import type {
  TraderDefinition,
  GuardDefinition,
  FactionRepDefinition,
  AmbientDefinition,
  ServiceDefinition,
  NpcDefinition,
} from '../types';

const HELIX_TRADER: TraderDefinition = {
  id: 'npc_helix_trader',
  displayName: 'Forge Master Kron',
  description: 'A Helix supply master dealing in industrial equipment and raw materials.',
  npcType: 'trader',
  faction: 'helix',
  textureKey: 'npc_helix_trader',
  color: 0xcc4444, // Red
  dialogue: [
    { text: 'Ironhold has the best extraction gear in the sector. What do you need?', condition: 'greeting' },
    { text: 'Quality tools for quality work.', condition: 'trade' },
    { text: 'Get back to work.', condition: 'farewell' },
  ],
  inventory: [
    { itemId: 'tool_mining_common', buyPrice: 350, sellPrice: 175, stock: 5 },
    { itemId: 'tool_mining_rare', buyPrice: 1400, sellPrice: 700, stock: 3 },
    { itemId: 'suit_repair_kit_common', buyPrice: 90, sellPrice: 45, stock: 10 },
    { itemId: 'world_volcanic_glass', buyPrice: 120, sellPrice: 60, stock: 15 },
    { itemId: 'reagent_thermal_compound', buyPrice: 180, sellPrice: 90, stock: 10 },
    { itemId: 'reagent_frost_essence', buyPrice: 220, sellPrice: 110, stock: 8 },
    { itemId: 'suit_diving_rare', buyPrice: 3200, sellPrice: 1600, stock: 2 },
    { itemId: 'tool_harpoon_rare', buyPrice: 2400, sellPrice: 1200, stock: 3 },
    { itemId: 'tool_net_rare', buyPrice: 2200, sellPrice: 1100, stock: 3 },
    // Phase 120: Hazard protection (Helix specializes in Thermal + Physical)
    { itemId: 'module_thermal_reg_rare', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    { itemId: 'module_impact_shield_rare', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    { itemId: 'module_thermal_reg_epic', buyPrice: 12000, sellPrice: 6000, stock: 1 },
    { itemId: 'module_impact_shield_epic', buyPrice: 12000, sellPrice: 6000, stock: 1 },
    { itemId: 'consumable_thermal_coolant', buyPrice: 500, sellPrice: 250, stock: 10 },
    { itemId: 'consumable_impact_gel', buyPrice: 500, sellPrice: 250, stock: 10 },
    { itemId: 'consumable_chem_neutralizer', buyPrice: 600, sellPrice: 300, stock: 5 },
  ],
  specialization: 'materials',
};

const HELIX_GUARD: GuardDefinition = {
  id: 'npc_helix_guard',
  displayName: 'Ironhold Enforcer',
  description: 'A heavily armored Helix security officer.',
  npcType: 'guard',
  faction: 'helix',
  textureKey: 'npc_helix_guard',
  color: 0x882222, // Dark red
  dialogue: [
    { text: 'No slacking. This is a working station.', condition: 'greeting' },
    { text: 'Keep moving.', condition: 'busy' },
  ],
};

const HELIX_REP: FactionRepDefinition = {
  id: 'npc_helix_rep',
  displayName: 'Coordinator Thane',
  description: 'A Helix Extraction operations coordinator.',
  npcType: 'faction_rep',
  faction: 'helix',
  textureKey: 'npc_helix_rep',
  color: 0xdd6666, // Light red
  dialogue: [
    { text: "Operative. Helix expects results. Do not disappoint us.", condition: 'greeting' },
    { text: "Humanity's survival demands sacrifice. Remember that.", condition: 'farewell' },
  ],
  title: 'Helix Coordinator',
};

const HELIX_AMBIENT: AmbientDefinition = {
  id: 'npc_helix_ambient',
  displayName: 'Ore Processor',
  description: 'A Helix worker monitoring the refinement systems.',
  npcType: 'ambient',
  faction: 'helix',
  textureKey: 'npc_helix_ambient',
  color: 0xaa6666, // Dusty red
  dialogue: [
    { text: 'Another shift, another quota.', condition: 'greeting' },
    { text: "Can't talk. Production targets to meet.", condition: 'busy' },
  ],
  role: 'Ore Processor',
};

const HELIX_SERVICE: ServiceDefinition = {
  id: 'npc_helix_service',
  displayName: 'Gear Smith Volt',
  description: 'A Helix equipment specialist who repairs and maintains gear.',
  npcType: 'service',
  faction: 'helix',
  textureKey: 'npc_helix_service',
  color: 0xcc8888, // Pale red
  dialogue: [
    { text: 'Your equipment looks worn. I can fix that.', condition: 'greeting' },
    { text: 'Good gear keeps you alive.', condition: 'farewell' },
  ],
  serviceType: 'repair',
};

export const HELIX_NPCS: readonly NpcDefinition[] = [
  HELIX_TRADER,
  HELIX_GUARD,
  HELIX_REP,
  HELIX_AMBIENT,
  HELIX_SERVICE,
];
