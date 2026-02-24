import type { CreatureDefinition } from '../types';

// Tier II - Bioluminescent Depths (3 creatures)

export const CREATURE_ECHO_DRIFTER: CreatureDefinition = {
  id: 'creature_echo_drifter',
  displayName: 'Echo Drifter',
  description: 'Herbivore that feeds on bioluminescent fungi. Movements create faint afterimages.',
  entityClass: 'creature',
  biomes: ['bioluminescent_depths'],
  textureKey: 'creature_echo_drifter',
  color: 0x00cc66,
  lootTableId: 'loot_creature_echo_drifter',
  behavior: 'herbivore',
  baseHealth: 125,
  levelRange: [6, 14],
  baseXp: 28,
  respawnSeconds: 280,
};

export const CREATURE_PHASE_GRAZER: CreatureDefinition = {
  id: 'creature_phase_grazer',
  displayName: 'Phase Grazer',
  description: 'Large herbivore partially out of sync with normal time. Docile but disorienting to observe.',
  entityClass: 'creature',
  biomes: ['bioluminescent_depths'],
  textureKey: 'creature_phase_grazer',
  color: 0x00ff88,
  lootTableId: 'loot_creature_phase_grazer',
  behavior: 'herbivore',
  baseHealth: 130,
  levelRange: [7, 15],
  baseXp: 30,
  respawnSeconds: 300,
};

export const CREATURE_REALITY_SCAVENGER: CreatureDefinition = {
  id: 'creature_reality_scavenger',
  displayName: 'Reality Scavenger',
  description: 'Opportunistic omnivore that feeds on dimensional residue. Aggressive when cornered.',
  entityClass: 'creature',
  biomes: ['bioluminescent_depths'],
  textureKey: 'creature_reality_scavenger',
  color: 0x4488ff,
  lootTableId: 'loot_creature_reality_scavenger',
  behavior: 'omnivore',
  baseHealth: 135,
  levelRange: [8, 16],
  baseXp: 32,
  respawnSeconds: 320,
};

// Tier III - Crystalline Wastes (3 creatures)

export const CREATURE_NULL_FEEDER: CreatureDefinition = {
  id: 'creature_null_feeder',
  displayName: 'Null Feeder',
  description: 'Crystalline herbivore that grazes on mineral formations. Its body refracts light into prismatic patterns.',
  entityClass: 'creature',
  biomes: ['crystalline_wastes'],
  textureKey: 'creature_null_feeder',
  color: 0xadd8e6,
  lootTableId: 'loot_creature_null_feeder',
  behavior: 'herbivore',
  baseHealth: 180,
  levelRange: [12, 20],
  baseXp: 50,
  respawnSeconds: 400,
};

export const CREATURE_DIMENSIONAL_HUNTER: CreatureDefinition = {
  id: 'creature_dimensional_hunter',
  displayName: 'Dimensional Hunter',
  description: 'Omnivore that exists slightly offset from normal space. Hunts by phasing through crystal barriers.',
  entityClass: 'creature',
  biomes: ['crystalline_wastes'],
  textureKey: 'creature_dimensional_hunter',
  color: 0x87ceeb,
  lootTableId: 'loot_creature_dimensional_hunter',
  behavior: 'omnivore',
  baseHealth: 190,
  levelRange: [13, 22],
  baseXp: 55,
  respawnSeconds: 420,
};

export const CREATURE_RIFT_HUNTER: CreatureDefinition = {
  id: 'creature_rift_hunter',
  displayName: 'Rift Hunter',
  description: 'Predator that stalks crystalline corridors. Uses reflections to confuse and ambush prey.',
  entityClass: 'creature',
  biomes: ['crystalline_wastes'],
  textureKey: 'creature_rift_hunter',
  color: 0x6495ed,
  lootTableId: 'loot_creature_rift_hunter',
  behavior: 'predator',
  baseHealth: 210,
  levelRange: [14, 24],
  baseXp: 65,
  respawnSeconds: 460,
};

// Tier IV - Void Rift (3 creatures)

export const CREATURE_VOID_GRAZER: CreatureDefinition = {
  id: 'creature_void_grazer',
  displayName: 'Void Grazer',
  description: 'Predator that hunts through void-warped space. Its movements seem to skip frames as it phases between locations.',
  entityClass: 'creature',
  biomes: ['void_rift'],
  textureKey: 'creature_void_grazer',
  color: 0x4a0080,
  lootTableId: 'loot_creature_void_grazer',
  behavior: 'predator',
  baseHealth: 240,
  levelRange: [18, 28],
  baseXp: 85,
  respawnSeconds: 540,
};

export const CREATURE_ANOMALY_SCAVENGER: CreatureDefinition = {
  id: 'creature_anomaly_scavenger',
  displayName: 'Anomaly Scavenger',
  description: 'Omnivore that feeds on dimensional tears and void residue. Erratic, unpredictable movement.',
  entityClass: 'creature',
  biomes: ['void_rift'],
  textureKey: 'creature_anomaly_scavenger',
  color: 0x6a00a0,
  lootTableId: 'loot_creature_anomaly_scavenger',
  behavior: 'omnivore',
  baseHealth: 260,
  levelRange: [20, 30],
  baseXp: 95,
  respawnSeconds: 600,
};

export const CREATURE_VOID_STALKER: CreatureDefinition = {
  id: 'creature_void_stalker',
  displayName: 'Void Stalker',
  description: 'Apex predator of the Void Rift. Partially phased out of reality, visible only as distortions.',
  entityClass: 'creature',
  biomes: ['void_rift'],
  textureKey: 'creature_void_stalker',
  color: 0x2a0050,
  lootTableId: 'loot_creature_void_stalker',
  behavior: 'predator',
  baseHealth: 280,
  levelRange: [22, 32],
  baseXp: 110,
  respawnSeconds: 660,
};

// Tier IV - Maniac (1 creature)

export const CREATURE_DIMENSIONAL_ABERRATION: CreatureDefinition = {
  id: 'creature_dimensional_aberration',
  displayName: 'Dimensional Aberration',
  description: 'Massive entity driven mad by prolonged exposure to dimensional instability. Attacks anything it perceives through its fractured awareness.',
  entityClass: 'creature',
  biomes: ['void_rift'],
  textureKey: 'creature_dimensional_aberration',
  color: 0x8800ff,
  lootTableId: 'loot_creature_dimensional_aberration',
  behavior: 'maniac',
  baseHealth: 320,
  levelRange: [24, 35],
  baseXp: 150,
  respawnSeconds: 900,
};

export const ALL_EXOTIC_CREATURES: readonly CreatureDefinition[] = [
  CREATURE_ECHO_DRIFTER,
  CREATURE_PHASE_GRAZER,
  CREATURE_REALITY_SCAVENGER,
  CREATURE_NULL_FEEDER,
  CREATURE_DIMENSIONAL_HUNTER,
  CREATURE_RIFT_HUNTER,
  CREATURE_VOID_GRAZER,
  CREATURE_ANOMALY_SCAVENGER,
  CREATURE_VOID_STALKER,
  CREATURE_DIMENSIONAL_ABERRATION,
];
