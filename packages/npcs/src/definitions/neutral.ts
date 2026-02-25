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
    { itemId: 'health_vial_common', buyPrice: 60, sellPrice: 30, stock: 10 },
    { itemId: 'energy_cell_common', buyPrice: 60, sellPrice: 30, stock: 10 },
    { itemId: 'suit_repair_kit_common', buyPrice: 90, sellPrice: 45, stock: 5 },
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

// ============================================================
// SPECIALIZED VENDORS — equipment specialists
// ============================================================

const SUIT_VENDOR: TraderDefinition = {
  id: 'npc_suit_vendor',
  displayName: 'Exo-Suit Specialist',
  description: 'A former corporate engineer who now sells and maintains exo-suits independently.',
  npcType: 'trader',
  faction: 'neutral',
  textureKey: 'npc_neutral_trader',
  color: 0x6688aa, // Blue-gray
  dialogue: [
    { text: 'Looking for protection? I have suits for every situation and budget.', condition: 'greeting' },
    { text: 'Quality suits keep you alive. Cheap suits keep undertakers employed.', condition: 'trade' },
    { text: 'Stay protected out there.', condition: 'farewell' },
  ],
  inventory: [
    // Level 1 common
    { itemId: 'suit_basic_common', buyPrice: 600, sellPrice: 300, stock: 5 },
    { itemId: 'suit_salvaged_common', buyPrice: 500, sellPrice: 250, stock: 5 },
    // Level 5 rare
    { itemId: 'suit_reinforced_rare', buyPrice: 2400, sellPrice: 1200, stock: 3 },
    { itemId: 'suit_scout_rare', buyPrice: 2600, sellPrice: 1300, stock: 3 },
    { itemId: 'suit_diving_rare', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    // Level 8 rare
    { itemId: 'suit_hazmat_rare', buyPrice: 3600, sellPrice: 1800, stock: 3 },
    // Level 10 common
    { itemId: 'suit_worker_common', buyPrice: 1400, sellPrice: 700, stock: 4 },
    // Level 15 rare
    { itemId: 'suit_field_operative_rare', buyPrice: 5400, sellPrice: 2700, stock: 3 },
    { itemId: 'suit_pressure_epic', buyPrice: 8400, sellPrice: 4200, stock: 2 },
    // Level 20 common
    { itemId: 'suit_industrial_common', buyPrice: 4200, sellPrice: 2100, stock: 4 },
    // Level 25 rare
    { itemId: 'suit_expedition_rare', buyPrice: 14400, sellPrice: 7200, stock: 2 },
    // Level 30 common
    { itemId: 'suit_veteran_common', buyPrice: 9600, sellPrice: 4800, stock: 3 },
    // Level 35 rare
    { itemId: 'suit_elite_field_rare', buyPrice: 30000, sellPrice: 15000, stock: 2 },
    // Level 40 common
    { itemId: 'suit_hardened_common', buyPrice: 21600, sellPrice: 10800, stock: 2 },
    // Level 45 rare
    { itemId: 'suit_master_rare', buyPrice: 54000, sellPrice: 27000, stock: 1 },
  ],
  specialization: 'suits',
};

const TOOL_VENDOR: TraderDefinition = {
  id: 'npc_tool_vendor',
  displayName: 'Tool Merchant',
  description: 'A weapons and equipment dealer with connections to all three corporations.',
  npcType: 'trader',
  faction: 'neutral',
  textureKey: 'npc_neutral_trader',
  color: 0xaa8866, // Bronze
  dialogue: [
    { text: 'Mining, combat, research — I have the tools you need.', condition: 'greeting' },
    { text: 'The right tool makes all the difference. The wrong one gets you killed.', condition: 'trade' },
    { text: 'Good hunting.', condition: 'farewell' },
  ],
  inventory: [
    // Level 1 common
    { itemId: 'tool_universal_common', buyPrice: 240, sellPrice: 120, stock: 5 },
    { itemId: 'tool_mining_common', buyPrice: 360, sellPrice: 180, stock: 5 },
    { itemId: 'tool_combat_common', buyPrice: 360, sellPrice: 180, stock: 5 },
    { itemId: 'tool_research_common', buyPrice: 360, sellPrice: 180, stock: 5 },
    // Level 5 rare
    { itemId: 'tool_mining_rare', buyPrice: 1440, sellPrice: 720, stock: 3 },
    { itemId: 'tool_combat_rare', buyPrice: 1440, sellPrice: 720, stock: 3 },
    { itemId: 'tool_research_rare', buyPrice: 1440, sellPrice: 720, stock: 3 },
    { itemId: 'tool_harpoon_rare', buyPrice: 2200, sellPrice: 1100, stock: 3 },
    { itemId: 'tool_net_rare', buyPrice: 2000, sellPrice: 1000, stock: 3 },
    // Level 10 common
    { itemId: 'tool_mining_common_mk2', buyPrice: 960, sellPrice: 480, stock: 4 },
    { itemId: 'tool_combat_common_mk2', buyPrice: 960, sellPrice: 480, stock: 4 },
    { itemId: 'tool_research_common_mk2', buyPrice: 960, sellPrice: 480, stock: 4 },
    // Level 15 rare
    { itemId: 'tool_mining_rare_mk2', buyPrice: 4200, sellPrice: 2100, stock: 3 },
    { itemId: 'tool_combat_rare_mk2', buyPrice: 4200, sellPrice: 2100, stock: 3 },
    { itemId: 'tool_research_rare_mk2', buyPrice: 4200, sellPrice: 2100, stock: 3 },
    { itemId: 'tool_diving_pick_epic', buyPrice: 6000, sellPrice: 3000, stock: 2 },
    // Level 20 common
    { itemId: 'tool_mining_common_mk3', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    { itemId: 'tool_combat_common_mk3', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    { itemId: 'tool_research_common_mk3', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    // Level 25 rare
    { itemId: 'tool_mining_rare_mk3', buyPrice: 12000, sellPrice: 6000, stock: 2 },
    { itemId: 'tool_combat_rare_mk3', buyPrice: 12000, sellPrice: 6000, stock: 2 },
    { itemId: 'tool_research_rare_mk3', buyPrice: 12000, sellPrice: 6000, stock: 2 },
    // Level 30 common
    { itemId: 'tool_mining_common_mk4', buyPrice: 7200, sellPrice: 3600, stock: 3 },
    { itemId: 'tool_combat_common_mk4', buyPrice: 7200, sellPrice: 3600, stock: 3 },
    { itemId: 'tool_research_common_mk4', buyPrice: 7200, sellPrice: 3600, stock: 3 },
    // Level 35 rare
    { itemId: 'tool_mining_rare_mk4', buyPrice: 26400, sellPrice: 13200, stock: 2 },
    { itemId: 'tool_combat_rare_mk4', buyPrice: 26400, sellPrice: 13200, stock: 2 },
    { itemId: 'tool_research_rare_mk4', buyPrice: 26400, sellPrice: 13200, stock: 2 },
    // Level 40 common
    { itemId: 'tool_mining_common_mk5', buyPrice: 18000, sellPrice: 9000, stock: 2 },
    { itemId: 'tool_combat_common_mk5', buyPrice: 18000, sellPrice: 9000, stock: 2 },
    { itemId: 'tool_research_common_mk5', buyPrice: 18000, sellPrice: 9000, stock: 2 },
    // Level 45 rare
    { itemId: 'tool_mining_rare_mk5', buyPrice: 48000, sellPrice: 24000, stock: 1 },
    { itemId: 'tool_combat_rare_mk5', buyPrice: 48000, sellPrice: 24000, stock: 1 },
    { itemId: 'tool_research_rare_mk5', buyPrice: 48000, sellPrice: 24000, stock: 1 },
  ],
  specialization: 'tools',
};

const EXPEDITION_MASTER: ServiceDefinition = {
  id: 'npc_expedition_master',
  displayName: 'Expedition Coordinator',
  description: 'A grizzled veteran who organizes expeditions to remote locations across Terminus.',
  npcType: 'service',
  faction: 'neutral',
  textureKey: 'npc_expedition_master',
  color: 0xd4a574, // Tan/explorer color
  dialogue: [
    { text: 'Looking for adventure? I can drop you anywhere on this rock.', condition: 'greeting' },
    { text: 'Pick your poison. Some zones are friendlier than others.', condition: 'busy' },
    { text: 'Watch yourself out there. Terminus doesn\'t forgive mistakes.', condition: 'farewell' },
  ],
  serviceType: 'expedition',
};

const MODULE_VENDOR: TraderDefinition = {
  id: 'npc_module_vendor',
  displayName: 'Module Technician',
  description: 'A systems specialist who deals in suit upgrade modules.',
  npcType: 'trader',
  faction: 'neutral',
  textureKey: 'npc_neutral_trader',
  color: 0x88aa88, // Green-gray
  dialogue: [
    { text: 'Modules make the suit. I have everything you need to optimize your loadout.', condition: 'greeting' },
    { text: 'Armor, power, speed — what does your build need?', condition: 'trade' },
    { text: 'Come back when you need upgrades.', condition: 'farewell' },
  ],
  inventory: [
    // Level 1 common
    { itemId: 'module_armor_common', buyPrice: 240, sellPrice: 120, stock: 5 },
    { itemId: 'module_power_core_common', buyPrice: 240, sellPrice: 120, stock: 5 },
    { itemId: 'module_speed_common', buyPrice: 240, sellPrice: 120, stock: 5 },
    { itemId: 'module_life_support_common', buyPrice: 240, sellPrice: 120, stock: 5 },
    { itemId: 'module_sensor_common', buyPrice: 240, sellPrice: 120, stock: 5 },
    { itemId: 'module_mobility_common', buyPrice: 240, sellPrice: 120, stock: 5 },
    // Level 5 rare
    { itemId: 'module_armor_rare', buyPrice: 960, sellPrice: 480, stock: 3 },
    { itemId: 'module_power_core_rare', buyPrice: 960, sellPrice: 480, stock: 3 },
    { itemId: 'module_speed_rare', buyPrice: 960, sellPrice: 480, stock: 3 },
    { itemId: 'module_life_support_rare', buyPrice: 960, sellPrice: 480, stock: 3 },
    { itemId: 'module_sensor_rare', buyPrice: 960, sellPrice: 480, stock: 3 },
    { itemId: 'module_mobility_rare', buyPrice: 960, sellPrice: 480, stock: 3 },
    // Level 10 common
    { itemId: 'module_armor_common_mk2', buyPrice: 600, sellPrice: 300, stock: 4 },
    { itemId: 'module_power_core_common_mk2', buyPrice: 600, sellPrice: 300, stock: 4 },
    // Level 15 rare
    { itemId: 'module_armor_rare_mk2', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    { itemId: 'module_power_core_rare_mk2', buyPrice: 3000, sellPrice: 1500, stock: 3 },
    // Level 20 common
    { itemId: 'module_armor_common_mk3', buyPrice: 1800, sellPrice: 900, stock: 4 },
    { itemId: 'module_power_core_common_mk3', buyPrice: 1800, sellPrice: 900, stock: 4 },
    // Level 25 rare
    { itemId: 'module_armor_rare_mk3', buyPrice: 8400, sellPrice: 4200, stock: 2 },
    { itemId: 'module_power_core_rare_mk3', buyPrice: 8400, sellPrice: 4200, stock: 2 },
    // Level 30 common
    { itemId: 'module_armor_common_mk4', buyPrice: 4800, sellPrice: 2400, stock: 3 },
    { itemId: 'module_power_core_common_mk4', buyPrice: 4800, sellPrice: 2400, stock: 3 },
    // Level 35 rare
    { itemId: 'module_armor_rare_mk4', buyPrice: 18000, sellPrice: 9000, stock: 2 },
    { itemId: 'module_power_core_rare_mk4', buyPrice: 18000, sellPrice: 9000, stock: 2 },
    // Level 40 common
    { itemId: 'module_armor_common_mk5', buyPrice: 12000, sellPrice: 6000, stock: 2 },
    { itemId: 'module_power_core_common_mk5', buyPrice: 12000, sellPrice: 6000, stock: 2 },
    // Level 45 rare
    { itemId: 'module_armor_rare_mk5', buyPrice: 36000, sellPrice: 18000, stock: 1 },
    { itemId: 'module_power_core_rare_mk5', buyPrice: 36000, sellPrice: 18000, stock: 1 },
  ],
  specialization: 'modules',
};

export const NEUTRAL_NPCS: readonly NpcDefinition[] = [
  NEUTRAL_TRADER,
  NEUTRAL_GUARD,
  NEUTRAL_REP,
  NEUTRAL_AMBIENT,
  NEUTRAL_SERVICE,
  SUIT_VENDOR,
  TOOL_VENDOR,
  MODULE_VENDOR,
  EXPEDITION_MASTER,
];
