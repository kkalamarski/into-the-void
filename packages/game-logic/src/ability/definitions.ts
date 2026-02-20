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

/**
 * All starter abilities
 */
export const ALL_ABILITIES: readonly AbilityDefinition[] = [
  ABILITY_BASIC_STRIKE,
  ABILITY_SHIELD_BASH,
  ABILITY_ENERGY_PULSE,
];
