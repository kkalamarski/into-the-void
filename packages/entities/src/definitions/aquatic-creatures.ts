import type { CreatureDefinition } from '../types';

export const CREATURE_TIDE_CRAB: CreatureDefinition = {
  id: 'creature_tide_crab',
  displayName: 'Tide Crab',
  description: 'Small crustacean that scuttles along tidal flats. Docile unless cornered.',
  entityClass: 'creature',
  biomes: ['tidal_pools'],
  textureKey: 'creature_tide_crab',
  color: 0x8b7355,
  lootTableId: 'loot_creature_tide_crab',
  behavior: 'herbivore',
  baseHealth: 75,
  levelRange: [1, 6],
  baseXp: 12,
  respawnSeconds: 180,
};

export const CREATURE_COASTAL_URCHIN: CreatureDefinition = {
  id: 'creature_coastal_urchin',
  displayName: 'Coastal Urchin',
  description: 'Spiny filter feeder anchored to rocks. Harvests detritus from water.',
  entityClass: 'creature',
  biomes: ['tidal_pools'],
  textureKey: 'creature_coastal_urchin',
  color: 0x556b2f,
  lootTableId: 'loot_creature_coastal_urchin',
  behavior: 'herbivore',
  baseHealth: 70,
  levelRange: [1, 5],
  baseXp: 10,
  respawnSeconds: 180,
};

export const CREATURE_REEF_SCAVENGER: CreatureDefinition = {
  id: 'creature_reef_scavenger',
  displayName: 'Reef Scavenger',
  description: 'Opportunistic omnivore that picks through tidal debris. Will attack if hungry.',
  entityClass: 'creature',
  biomes: ['tidal_pools'],
  textureKey: 'creature_reef_scavenger',
  color: 0x4682b4,
  lootTableId: 'loot_creature_reef_scavenger',
  behavior: 'omnivore',
  baseHealth: 85,
  levelRange: [2, 7],
  baseXp: 15,
  respawnSeconds: 240,
};

export const CREATURE_KELP_GRAZER: CreatureDefinition = {
  id: 'creature_kelp_grazer',
  displayName: 'Kelp Grazer',
  description: 'Large herbivore that feeds on kelp fronds. Peaceful but territorial near feeding grounds.',
  entityClass: 'creature',
  biomes: ['kelp_forests'],
  textureKey: 'creature_kelp_grazer',
  color: 0x2e8b57,
  lootTableId: 'loot_creature_kelp_grazer',
  behavior: 'herbivore',
  baseHealth: 125,
  levelRange: [6, 14],
  baseXp: 28,
  respawnSeconds: 280,
};

export const CREATURE_TANGLE_STALKER: CreatureDefinition = {
  id: 'creature_tangle_stalker',
  displayName: 'Tangle Stalker',
  description: 'Predator that uses kelp forests for ambush cover. Patient hunter.',
  entityClass: 'creature',
  biomes: ['kelp_forests'],
  textureKey: 'creature_tangle_stalker',
  color: 0x20b2aa,
  lootTableId: 'loot_creature_tangle_stalker',
  behavior: 'predator',
  baseHealth: 155,
  levelRange: [8, 16],
  baseXp: 40,
  respawnSeconds: 360,
};

export const CREATURE_CURRENT_RIDER: CreatureDefinition = {
  id: 'creature_current_rider',
  displayName: 'Current Rider',
  description: 'Fast-moving omnivore that darts through kelp corridors. Hunts in bursts.',
  entityClass: 'creature',
  biomes: ['kelp_forests'],
  textureKey: 'creature_current_rider',
  color: 0x5f9ea0,
  lootTableId: 'loot_creature_current_rider',
  behavior: 'omnivore',
  baseHealth: 135,
  levelRange: [7, 15],
  baseXp: 32,
  respawnSeconds: 300,
};

export const CREATURE_PRESSURE_FEEDER: CreatureDefinition = {
  id: 'creature_pressure_feeder',
  displayName: 'Pressure Feeder',
  description: 'Deep-dwelling filter organism adapted to crushing depths. Slow-moving but durable.',
  entityClass: 'creature',
  biomes: ['deep_trenches'],
  textureKey: 'creature_pressure_feeder',
  color: 0x483d8b,
  lootTableId: 'loot_creature_pressure_feeder',
  behavior: 'herbivore',
  baseHealth: 180,
  levelRange: [12, 20],
  baseXp: 50,
  respawnSeconds: 400,
};

export const CREATURE_TRENCH_HUNTER: CreatureDefinition = {
  id: 'creature_trench_hunter',
  displayName: 'Trench Hunter',
  description: 'Apex predator of the deep trenches. Uses bioluminescent lures to disorient prey.',
  entityClass: 'creature',
  biomes: ['deep_trenches'],
  textureKey: 'creature_trench_hunter',
  color: 0x191970,
  lootTableId: 'loot_creature_trench_hunter',
  behavior: 'predator',
  baseHealth: 210,
  levelRange: [14, 24],
  baseXp: 65,
  respawnSeconds: 480,
};

export const CREATURE_ABYSSAL_SCAVENGER: CreatureDefinition = {
  id: 'creature_abyssal_scavenger',
  displayName: 'Abyssal Scavenger',
  description: 'Opportunistic omnivore that feeds on detritus falling from upper waters. Aggressive when approached.',
  entityClass: 'creature',
  biomes: ['deep_trenches'],
  textureKey: 'creature_abyssal_scavenger',
  color: 0x2f4f4f,
  lootTableId: 'loot_creature_abyssal_scavenger',
  behavior: 'omnivore',
  baseHealth: 190,
  levelRange: [13, 22],
  baseXp: 55,
  respawnSeconds: 420,
};

export const CREATURE_ABYSSAL_LEVIATHAN: CreatureDefinition = {
  id: 'creature_abyssal_leviathan',
  displayName: 'Abyssal Leviathan',
  description: 'Massive deep-sea predator driven to constant aggression by pressure-induced madness. Attacks anything it senses.',
  entityClass: 'creature',
  biomes: ['deep_trenches'],
  textureKey: 'creature_abyssal_leviathan',
  color: 0x0a0a0a,
  lootTableId: 'loot_creature_abyssal_leviathan',
  behavior: 'maniac',
  baseHealth: 300,
  levelRange: [20, 32],
  baseXp: 125,
  respawnSeconds: 900,
};

// ===== PHASE 110 — Tier I Tidal Pools Addition =====

export const CREATURE_TIDAL_SNAPPER: CreatureDefinition = {
  id: 'creature_tidal_snapper',
  displayName: 'Tidal Snapper',
  description: 'Aggressive crustacean lurking in deeper tidal pools. Lightning-fast strike from concealed position.',
  entityClass: 'creature',
  biomes: ['tidal_pools'],
  textureKey: 'creature_tidal_snapper',
  color: 0x446688,
  lootTableId: 'loot_creature_tidal_snapper',
  behavior: 'predator',
  baseHealth: 95,
  levelRange: [3, 6],
  baseXp: 17,
  respawnSeconds: 240,
};

export const ALL_AQUATIC_CREATURES: readonly CreatureDefinition[] = [
  CREATURE_TIDE_CRAB,
  CREATURE_COASTAL_URCHIN,
  CREATURE_REEF_SCAVENGER,
  CREATURE_KELP_GRAZER,
  CREATURE_TANGLE_STALKER,
  CREATURE_CURRENT_RIDER,
  CREATURE_PRESSURE_FEEDER,
  CREATURE_TRENCH_HUNTER,
  CREATURE_ABYSSAL_SCAVENGER,
  CREATURE_ABYSSAL_LEVIATHAN,
  // Phase 110 Tier I tidal_pools addition
  CREATURE_TIDAL_SNAPPER,
];
