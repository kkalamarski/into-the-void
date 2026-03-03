import type { CreatureDefinition } from '../types';
import { BIOME_RESISTANCE_PROFILES } from '../biome-resistance-profiles';

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
  resistances: BIOME_RESISTANCE_PROFILES['bioluminescent_depths'],
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
  resistances: BIOME_RESISTANCE_PROFILES['bioluminescent_depths'],
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
  resistances: BIOME_RESISTANCE_PROFILES['bioluminescent_depths'],
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
  resistances: BIOME_RESISTANCE_PROFILES['crystalline_wastes'],
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
  resistances: BIOME_RESISTANCE_PROFILES['crystalline_wastes'],
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
  resistances: BIOME_RESISTANCE_PROFILES['crystalline_wastes'],
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
  resistances: BIOME_RESISTANCE_PROFILES['void_rift'],
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
  resistances: BIOME_RESISTANCE_PROFILES['void_rift'],
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
  resistances: BIOME_RESISTANCE_PROFILES['void_rift'],
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
  resistances: BIOME_RESISTANCE_PROFILES['void_rift'],
};

// ===== PHASE 110 — Tier II Bioluminescent Depths Addition =====

export const CREATURE_ABYSSAL_ANGLER: CreatureDefinition = {
  id: 'creature_abyssal_angler',
  displayName: 'Abyssal Angler',
  description: 'Deep-dwelling predator that uses bioluminescent lures. Draws prey close with hypnotic light patterns before striking.',
  entityClass: 'creature',
  biomes: ['bioluminescent_depths'],
  textureKey: 'creature_abyssal_angler',
  color: 0x2244aa,
  lootTableId: 'loot_creature_abyssal_angler',
  behavior: 'predator',
  baseHealth: 155,
  levelRange: [10, 20],
  baseXp: 48,
  respawnSeconds: 400,
  resistances: BIOME_RESISTANCE_PROFILES['bioluminescent_depths'],
};

// ===== PHASE 110 — Tier III Crystalline Wastes Additions =====

export const CREATURE_WASTE_DRIFTER: CreatureDefinition = {
  id: 'creature_waste_drifter',
  displayName: 'Waste Drifter',
  description: 'Semi-corporeal entity that phases between crystal formations, feeding on energy residue left by dimensional phenomena.',
  entityClass: 'creature',
  biomes: ['crystalline_wastes'],
  textureKey: 'creature_waste_drifter',
  color: 0xbbaacc,
  lootTableId: 'loot_creature_waste_drifter',
  behavior: 'omnivore',
  baseHealth: 180,
  levelRange: [16, 26],
  baseXp: 60,
  respawnSeconds: 450,
  resistances: BIOME_RESISTANCE_PROFILES['crystalline_wastes'],
};

export const CREATURE_CRYSTALLINE_MANIAC: CreatureDefinition = {
  id: 'creature_crystalline_maniac',
  displayName: 'Crystalline Maniac',
  description: 'Crystal-warped entity in perpetual dimensional flux. Attacks from shifting spatial positions, its crystalline body refracting reality around it.',
  entityClass: 'creature',
  biomes: ['crystalline_wastes'],
  textureKey: 'creature_crystalline_maniac',
  color: 0xdd88ff,
  lootTableId: 'loot_creature_crystalline_maniac',
  behavior: 'maniac',
  baseHealth: 310,
  levelRange: [24, 32],
  baseXp: 125,
  respawnSeconds: 900,
  resistances: BIOME_RESISTANCE_PROFILES['crystalline_wastes'],
};

// ===== PHASE 110 — Tier IV Void Rift Corrupted Apex Creatures =====

export const CREATURE_CORRUPTED_MAGMA_TITAN: CreatureDefinition = {
  id: 'creature_corrupted_magma_titan',
  displayName: 'Corrupted Magma Titan',
  description: 'What was once a Magma Beast from the volcanic ridges, now consumed by void corruption. Molten rock has been replaced by liquid void energy that flickers between physical states. Veteran explorers recognize the silhouette — and run. The most dangerous predator on Terminus.',
  entityClass: 'creature',
  biomes: ['void_rift'],
  textureKey: 'creature_corrupted_magma_titan',
  color: 0xcc00ff,
  lootTableId: 'loot_creature_corrupted_magma_titan',
  behavior: 'predator',
  baseHealth: 350,
  levelRange: [28, 35],
  baseXp: 160,
  respawnSeconds: 900,
  resistances: BIOME_RESISTANCE_PROFILES['void_rift'],
};

export const CREATURE_CORRUPTED_FROST_WRAITH: CreatureDefinition = {
  id: 'creature_corrupted_frost_wraith',
  displayName: 'Corrupted Frost Wraith',
  description: 'The frozen precision of a Frost Stalker twisted into mindless dimensional rage. Ice crystals have fused with void energy, creating a being that exists partially outside normal spacetime. It attacks relentlessly, phasing through solid matter. The single most lethal creature ever documented on Terminus.',
  entityClass: 'creature',
  biomes: ['void_rift'],
  textureKey: 'creature_corrupted_frost_wraith',
  color: 0x8800ee,
  lootTableId: 'loot_creature_corrupted_frost_wraith',
  behavior: 'maniac',
  baseHealth: 380,
  levelRange: [30, 35],
  baseXp: 180,
  respawnSeconds: 900,
  resistances: BIOME_RESISTANCE_PROFILES['void_rift'],
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
  // Phase 110 Tier II bioluminescent_depths addition
  CREATURE_ABYSSAL_ANGLER,
  // Phase 110 Tier III crystalline_wastes additions
  CREATURE_WASTE_DRIFTER,
  CREATURE_CRYSTALLINE_MANIAC,
  // Phase 110 Tier IV void_rift corrupted apex creatures
  CREATURE_CORRUPTED_MAGMA_TITAN,
  CREATURE_CORRUPTED_FROST_WRAITH,
];
