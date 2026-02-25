import type { AbilityDefinition } from '@into-the-void/shared-types';

/**
 * Basic melee attack - granted by combat tools
 */
export const ABILITY_BASIC_STRIKE: AbilityDefinition = {
  id: 'basic_strike',
  displayName: 'Strike',
  description: 'A basic melee attack. Deals physical damage to the target.',
  category: 'offensive',
  energyCost: 10,
  cooldownMs: 1500,
  range: 1,
  requiresTarget: true,
  effects: [{ type: 'damage', baseDamage: 15, scaling: 1.0 }],
  iconKey: 'ability_strike',
  iconColor: 0xcc4444,
};

/**
 * Shield bash - defensive ability that also deals damage
 */
export const ABILITY_SHIELD_BASH: AbilityDefinition = {
  id: 'shield_bash',
  displayName: 'Shield Bash',
  description: 'Slam your shield into the target, dealing damage and briefly stunning.',
  category: 'defensive',
  energyCost: 20,
  cooldownMs: 8000,
  range: 1,
  requiresTarget: true,
  effects: [{ type: 'damage', baseDamage: 10, scaling: 0.5 }],
  iconKey: 'ability_shield_bash',
  iconColor: 0x4488cc,
};

/**
 * Energy Pulse - ranged utility from research tools
 */
export const ABILITY_ENERGY_PULSE: AbilityDefinition = {
  id: 'energy_pulse',
  displayName: 'Energy Pulse',
  description: 'Fire a pulse of energy at the target, dealing moderate damage at range.',
  category: 'offensive',
  energyCost: 15,
  cooldownMs: 2000,
  range: 3,
  requiresTarget: true,
  effects: [{ type: 'damage', baseDamage: 12, scaling: 0.8 }],
  iconKey: 'ability_pulse',
  iconColor: 0x44cccc,
};

// ============================================================
// OFFENSIVE ABILITIES
// ============================================================

/**
 * Electrocute - High-voltage discharge with shock DoT
 */
export const ABILITY_ELECTROCUTE: AbilityDefinition = {
  id: 'electrocute',
  displayName: 'Electrocute',
  description: 'Discharge high-voltage energy into the target, dealing shock damage over time.',
  category: 'offensive',
  energyCost: 20,
  cooldownMs: 6000,
  range: 2,
  requiresTarget: true,
  effects: [
    { type: 'damage', baseDamage: 15, scaling: 0.7 },
    { type: 'dot', damagePerTick: 5, tickInterval: 1000, duration: 4000 },
  ],
  iconKey: 'ability_electrocute',
  iconColor: 0xffee44,
};

/**
 * Plasma Burst - Heavy damage projectile
 */
export const ABILITY_PLASMA_BURST: AbilityDefinition = {
  id: 'plasma_burst',
  displayName: 'Plasma Burst',
  description: 'Launch a superheated plasma projectile that deals heavy damage.',
  category: 'offensive',
  energyCost: 25,
  cooldownMs: 8000,
  range: 3,
  requiresTarget: true,
  effects: [{ type: 'damage', baseDamage: 35, scaling: 1.2 }],
  iconKey: 'ability_plasma_burst',
  iconColor: 0xff4400,
};

/**
 * Concussive Strike - Close melee with knockback effect
 */
export const ABILITY_CONCUSSIVE_STRIKE: AbilityDefinition = {
  id: 'concussive_strike',
  displayName: 'Concussive Strike',
  description: 'Deliver a powerful strike that deals damage and disrupts the target.',
  category: 'offensive',
  energyCost: 18,
  cooldownMs: 5000,
  range: 1,
  requiresTarget: true,
  effects: [{ type: 'damage', baseDamage: 20, scaling: 1.0 }],
  iconKey: 'ability_concussive_strike',
  iconColor: 0xdd8844,
};

/**
 * Thermal Lance - Focused heat beam
 */
export const ABILITY_THERMAL_LANCE: AbilityDefinition = {
  id: 'thermal_lance',
  displayName: 'Thermal Lance',
  description: 'Project a focused beam of intense heat that pierces through armor.',
  category: 'offensive',
  energyCost: 22,
  cooldownMs: 7000,
  range: 2,
  requiresTarget: true,
  effects: [{ type: 'damage', baseDamage: 28, scaling: 1.0 }],
  iconKey: 'ability_thermal_lance',
  iconColor: 0xff6600,
};

/**
 * Void Drain - Life drain ability
 */
export const ABILITY_VOID_DRAIN: AbilityDefinition = {
  id: 'void_drain',
  displayName: 'Void Drain',
  description: 'Siphon life force from the target, dealing damage and restoring your health.',
  category: 'offensive',
  energyCost: 24,
  cooldownMs: 10000,
  range: 2,
  requiresTarget: true,
  effects: [
    { type: 'damage', baseDamage: 18, scaling: 0.8 },
    { type: 'heal', baseHeal: 15, scaling: 0.6 },
  ],
  iconKey: 'ability_void_drain',
  iconColor: 0x8800ff,
};

/**
 * Cryo Blast - Cold damage burst
 */
export const ABILITY_CRYO_BLAST: AbilityDefinition = {
  id: 'cryo_blast',
  displayName: 'Cryo Blast',
  description: 'Unleash a burst of cryogenic energy, freezing and damaging the target.',
  category: 'offensive',
  energyCost: 20,
  cooldownMs: 6000,
  range: 2,
  requiresTarget: true,
  effects: [{ type: 'damage', baseDamage: 22, scaling: 0.9 }],
  iconKey: 'ability_cryo_blast',
  iconColor: 0x44ddff,
};

/**
 * Overload Pulse - AoE energy burst
 */
export const ABILITY_OVERLOAD_PULSE: AbilityDefinition = {
  id: 'overload_pulse',
  displayName: 'Overload Pulse',
  description: 'Release an overwhelming energy surge that damages nearby targets.',
  category: 'offensive',
  energyCost: 30,
  cooldownMs: 12000,
  range: 1,
  requiresTarget: true,
  effects: [{ type: 'damage', baseDamage: 25, scaling: 1.1 }],
  iconKey: 'ability_overload_pulse',
  iconColor: 0xff00ff,
};

/**
 * Precision Shot - Long-range accurate damage
 */
export const ABILITY_PRECISION_SHOT: AbilityDefinition = {
  id: 'precision_shot',
  displayName: 'Precision Shot',
  description: 'Fire a precisely targeted shot at extreme range.',
  category: 'offensive',
  energyCost: 18,
  cooldownMs: 5000,
  range: 4,
  requiresTarget: true,
  effects: [{ type: 'damage', baseDamage: 24, scaling: 1.0 }],
  iconKey: 'ability_precision_shot',
  iconColor: 0xff8800,
};

// ============================================================
// DEFENSIVE ABILITIES
// ============================================================

/**
 * Nano Repair - Self-heal ability
 */
export const ABILITY_NANO_REPAIR: AbilityDefinition = {
  id: 'nano_repair',
  displayName: 'Nano Repair',
  description: 'Deploy nano-swarm to repair exo-suit damage and restore health.',
  category: 'defensive',
  energyCost: 25,
  cooldownMs: 10000,
  range: 0,
  requiresTarget: false,
  effects: [{ type: 'heal', baseHeal: 40, scaling: 0.7 }],
  iconKey: 'ability_nano_repair',
  iconColor: 0x00ff88,
};

/**
 * Magnetic Field - Toughness buff
 */
export const ABILITY_MAGNETIC_FIELD: AbilityDefinition = {
  id: 'magnetic_field',
  displayName: 'Magnetic Field',
  description: 'Generate a protective magnetic field that increases damage resistance.',
  category: 'defensive',
  energyCost: 20,
  cooldownMs: 15000,
  range: 0,
  requiresTarget: false,
  effects: [{ type: 'buff', stat: 'toughness', amount: 8, duration: 12000 }],
  iconKey: 'ability_magnetic_field',
  iconColor: 0x4488ff,
};

/**
 * Emergency Shield - Large toughness buff, short duration
 */
export const ABILITY_EMERGENCY_SHIELD: AbilityDefinition = {
  id: 'emergency_shield',
  displayName: 'Emergency Shield',
  description: 'Activate emergency shielding for a massive but brief defensive boost.',
  category: 'defensive',
  energyCost: 30,
  cooldownMs: 20000,
  range: 0,
  requiresTarget: false,
  effects: [{ type: 'buff', stat: 'toughness', amount: 12, duration: 8000 }],
  iconKey: 'ability_emergency_shield',
  iconColor: 0x00aaff,
};

/**
 * Regeneration Protocol - Heal-over-time
 */
export const ABILITY_REGENERATION_PROTOCOL: AbilityDefinition = {
  id: 'regeneration_protocol',
  displayName: 'Regeneration Protocol',
  description: 'Initialize cellular regeneration protocols for gradual healing.',
  category: 'defensive',
  energyCost: 22,
  cooldownMs: 18000,
  range: 0,
  requiresTarget: false,
  effects: [{ type: 'hot', healPerTick: 8, tickInterval: 2000, duration: 10000 }],
  iconKey: 'ability_regeneration_protocol',
  iconColor: 0x44ff88,
};

/**
 * Fortify Systems - Durability buff
 */
export const ABILITY_FORTIFY_SYSTEMS: AbilityDefinition = {
  id: 'fortify_systems',
  displayName: 'Fortify Systems',
  description: 'Reinforce exo-suit structural integrity for enhanced durability.',
  category: 'defensive',
  energyCost: 18,
  cooldownMs: 12000,
  range: 0,
  requiresTarget: false,
  effects: [{ type: 'buff', stat: 'durability', amount: 10, duration: 15000 }],
  iconKey: 'ability_fortify_systems',
  iconColor: 0x888844,
};

/**
 * Energy Barrier - Resilience buff
 */
export const ABILITY_ENERGY_BARRIER: AbilityDefinition = {
  id: 'energy_barrier',
  displayName: 'Energy Barrier',
  description: 'Project an energy barrier that increases resistance to status effects.',
  category: 'defensive',
  energyCost: 20,
  cooldownMs: 14000,
  range: 0,
  requiresTarget: false,
  effects: [{ type: 'buff', stat: 'resilience', amount: 7, duration: 12000 }],
  iconKey: 'ability_energy_barrier',
  iconColor: 0xffaa00,
};

// ============================================================
// UTILITY ABILITIES
// ============================================================

/**
 * Resource Scan - Perception buff for resource detection
 */
export const ABILITY_RESOURCE_SCAN: AbilityDefinition = {
  id: 'resource_scan',
  displayName: 'Resource Scan',
  description: 'Activate scanner protocols to enhance resource detection capabilities.',
  category: 'utility',
  energyCost: 15,
  cooldownMs: 20000,
  range: 0,
  requiresTarget: false,
  effects: [{ type: 'buff', stat: 'perception', amount: 6, duration: 15000 }],
  iconKey: 'ability_resource_scan',
  iconColor: 0x00ffff,
};

/**
 * Overclock - Haste buff for faster actions
 */
export const ABILITY_OVERCLOCK: AbilityDefinition = {
  id: 'overclock',
  displayName: 'Overclock',
  description: 'Overclock your exo-suit systems for increased action speed.',
  category: 'utility',
  energyCost: 25,
  cooldownMs: 25000,
  range: 0,
  requiresTarget: false,
  effects: [{ type: 'buff', stat: 'haste', amount: 8, duration: 10000 }],
  iconKey: 'ability_overclock',
  iconColor: 0xff00ff,
};

/**
 * Power Surge - Power buff for stronger attacks
 */
export const ABILITY_POWER_SURGE: AbilityDefinition = {
  id: 'power_surge',
  displayName: 'Power Surge',
  description: 'Channel energy to temporarily boost offensive power.',
  category: 'utility',
  energyCost: 20,
  cooldownMs: 18000,
  range: 0,
  requiresTarget: false,
  effects: [{ type: 'buff', stat: 'power', amount: 9, duration: 12000 }],
  iconKey: 'ability_power_surge',
  iconColor: 0xff4444,
};

/**
 * Analyze Specimen - Research utility
 */
export const ABILITY_ANALYZE_SPECIMEN: AbilityDefinition = {
  id: 'analyze_specimen',
  displayName: 'Analyze Specimen',
  description: 'Engage analysis protocols to study targets and enhance tactical awareness.',
  category: 'utility',
  energyCost: 18,
  cooldownMs: 22000,
  range: 0,
  requiresTarget: false,
  effects: [
    { type: 'buff', stat: 'perception', amount: 5, duration: 15000 },
    { type: 'buff', stat: 'power', amount: 5, duration: 15000 },
  ],
  iconKey: 'ability_analyze_specimen',
  iconColor: 0x88ff88,
};

// ============================================================
// GATHERING ABILITIES
// ============================================================

/**
 * Harvest - Gather from plants (granted by botany tools)
 */
export const ABILITY_HARVEST: AbilityDefinition = {
  id: 'harvest',
  displayName: 'Harvest',
  description: 'Carefully harvest resources from plants and flora.',
  category: 'utility',
  energyCost: 5,
  cooldownMs: 3000,
  range: 1,
  requiresTarget: true,
  effects: [{ type: 'gather', gatherType: 'harvest', baseYield: 1 }],
  iconKey: 'ability_harvest',
  iconColor: 0x44ff44, // Green
};

/**
 * Mine - Extract from minerals (granted by extraction tools)
 */
export const ABILITY_MINE: AbilityDefinition = {
  id: 'mine',
  displayName: 'Mine',
  description: 'Extract valuable resources from mineral deposits.',
  category: 'utility',
  energyCost: 8,
  cooldownMs: 4000,
  range: 1,
  requiresTarget: true,
  effects: [{ type: 'gather', gatherType: 'mine', baseYield: 1 }],
  iconKey: 'ability_mine',
  iconColor: 0x888888, // Gray
};

/**
 * Basic Harvest - Inefficient gathering from plants (granted by universal tools)
 */
export const ABILITY_BASIC_HARVEST: AbilityDefinition = {
  id: 'basic_harvest',
  displayName: 'Basic Harvest',
  description: 'Crudely gather resources from plants. Less efficient than specialized tools.',
  category: 'utility',
  energyCost: 8,
  cooldownMs: 5000,
  range: 1,
  requiresTarget: true,
  effects: [{ type: 'gather', gatherType: 'harvest', baseYield: 1 }],
  iconKey: 'ability_basic_harvest',
  iconColor: 0x44ff44, // Green
};

/**
 * Basic Mine - Inefficient extraction from minerals (granted by universal tools)
 */
export const ABILITY_BASIC_MINE: AbilityDefinition = {
  id: 'basic_mine',
  displayName: 'Basic Mine',
  description: 'Extract resources from mineral deposits. Less efficient than specialized tools.',
  category: 'utility',
  energyCost: 12,
  cooldownMs: 6000,
  range: 1,
  requiresTarget: true,
  effects: [{ type: 'gather', gatherType: 'mine', baseYield: 1 }],
  iconKey: 'ability_basic_mine',
  iconColor: 0x888888, // Gray
};

/**
 * All abilities - complete registry
 */
export const ALL_ABILITIES: readonly AbilityDefinition[] = [
  // Original 3 abilities
  ABILITY_BASIC_STRIKE,
  ABILITY_SHIELD_BASH,
  ABILITY_ENERGY_PULSE,
  // Offensive abilities (8)
  ABILITY_ELECTROCUTE,
  ABILITY_PLASMA_BURST,
  ABILITY_CONCUSSIVE_STRIKE,
  ABILITY_THERMAL_LANCE,
  ABILITY_VOID_DRAIN,
  ABILITY_CRYO_BLAST,
  ABILITY_OVERLOAD_PULSE,
  ABILITY_PRECISION_SHOT,
  // Defensive abilities (6)
  ABILITY_NANO_REPAIR,
  ABILITY_MAGNETIC_FIELD,
  ABILITY_EMERGENCY_SHIELD,
  ABILITY_REGENERATION_PROTOCOL,
  ABILITY_FORTIFY_SYSTEMS,
  ABILITY_ENERGY_BARRIER,
  // Utility abilities (4)
  ABILITY_RESOURCE_SCAN,
  ABILITY_OVERCLOCK,
  ABILITY_POWER_SURGE,
  ABILITY_ANALYZE_SPECIMEN,
  // Gathering abilities (4)
  ABILITY_HARVEST,
  ABILITY_MINE,
  ABILITY_BASIC_HARVEST,
  ABILITY_BASIC_MINE,
];
