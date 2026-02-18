import type { CreatureDefinition } from '../types';

export const CREATURE_VOID_CRAWLER: CreatureDefinition = {
  id: 'creature_void_crawler',
  displayName: 'Void Crawler',
  description: 'Small, skittering omnivore of the scarred plains. Will attack when hungry and target appears smaller.',
  entityClass: 'creature',
  biomes: ['void_plains'],
  textureKey: 'creature_void_crawler',
  color: 0x4a4a5a,
  lootTableId: 'loot_creature_void_crawler',
  behavior: 'omnivore',
  baseHealth: 50,
  levelRange: [1, 5],
  baseXp: 15,
};

export const CREATURE_CANOPY_GRAZER: CreatureDefinition = {
  id: 'creature_canopy_grazer',
  displayName: 'Canopy Grazer',
  description: 'Large herbivore feeding on fungal-tree canopy. Docile unless cornered.',
  entityClass: 'creature',
  biomes: ['fungal_forest'],
  textureKey: 'creature_canopy_grazer',
  color: 0x44cc88,
  lootTableId: 'loot_creature_canopy_grazer',
  behavior: 'herbivore',
  baseHealth: 80,
  levelRange: [1, 6],
  baseXp: 20,
};

export const CREATURE_SPORE_CARRIER: CreatureDefinition = {
  id: 'creature_spore_carrier',
  displayName: 'Spore Carrier',
  description: 'Fungal creature that spreads spores when disturbed. Opportunistic feeder.',
  entityClass: 'creature',
  biomes: ['fungal_forest'],
  textureKey: 'creature_spore_carrier',
  color: 0x9370db,
  lootTableId: 'loot_creature_spore_carrier',
  behavior: 'omnivore',
  baseHealth: 60,
  levelRange: [4, 12],
  baseXp: 25,
};

export const CREATURE_CRYSTAL_HUNTER: CreatureDefinition = {
  id: 'creature_crystal_hunter',
  displayName: 'Crystal Hunter',
  description: 'Predator with crystalline integument. Uses light refraction to disorient prey.',
  entityClass: 'creature',
  biomes: ['crystal_caves'],
  textureKey: 'creature_crystal_hunter',
  color: 0x7b68ee,
  lootTableId: 'loot_creature_crystal_hunter',
  behavior: 'predator',
  baseHealth: 120,
  levelRange: [8, 18],
  baseXp: 45,
};

export const CREATURE_MARSH_LURKER: CreatureDefinition = {
  id: 'creature_marsh_lurker',
  displayName: 'Marsh Lurker',
  description: 'Toxin-resistant predator of the miasma marshes. Uses chemical environment as weapon.',
  entityClass: 'creature',
  biomes: ['miasma_marshes'],
  textureKey: 'creature_marsh_lurker',
  color: 0x6b8e23,
  lootTableId: 'loot_creature_marsh_lurker',
  behavior: 'predator',
  baseHealth: 100,
  levelRange: [5, 15],
  baseXp: 40,
};

export const CREATURE_DART_RUNNER: CreatureDefinition = {
  id: 'creature_dart_runner',
  displayName: 'Dart Runner',
  description: 'Swift predator of the petrified expanse. Must keep moving to avoid calcification.',
  entityClass: 'creature',
  biomes: ['petrified_expanse'],
  textureKey: 'creature_dart_runner',
  color: 0xa9a9a9,
  lootTableId: 'loot_creature_dart_runner',
  behavior: 'predator',
  baseHealth: 90,
  levelRange: [6, 16],
  baseXp: 38,
};

export const CREATURE_FROST_STALKER: CreatureDefinition = {
  id: 'creature_frost_stalker',
  displayName: 'Frost Stalker',
  description: 'Marathon hunter of the frozen reaches. Outlasts prey through superior cold adaptation.',
  entityClass: 'creature',
  biomes: ['frozen_expanse'],
  textureKey: 'creature_frost_stalker',
  color: 0xb0e0e6,
  lootTableId: 'loot_creature_frost_stalker',
  behavior: 'predator',
  baseHealth: 140,
  levelRange: [10, 22],
  baseXp: 55,
};

export const CREATURE_MAGMA_BEAST: CreatureDefinition = {
  id: 'creature_magma_beast',
  displayName: 'Magma Beast',
  description: 'Armored silicon predator thriving in extreme heat. Slow but devastating.',
  entityClass: 'creature',
  biomes: ['volcanic_ridge'],
  textureKey: 'creature_magma_beast',
  color: 0xff4500,
  lootTableId: 'loot_creature_magma_beast',
  behavior: 'predator',
  baseHealth: 180,
  levelRange: [12, 28],
  baseXp: 70,
};

export const CREATURE_TOXIC_LURKER: CreatureDefinition = {
  id: 'creature_toxic_lurker',
  displayName: 'Toxic Lurker',
  description: 'Camouflaged predator of toxic wastes. Secretes corrosive compounds.',
  entityClass: 'creature',
  biomes: ['toxic_wastes'],
  textureKey: 'creature_toxic_lurker',
  color: 0x9acd32,
  lootTableId: 'loot_creature_toxic_lurker',
  behavior: 'predator',
  baseHealth: 130,
  levelRange: [8, 20],
  baseXp: 50,
};

export const CREATURE_VOID_HORROR: CreatureDefinition = {
  id: 'creature_void_horror',
  displayName: 'Void Horror',
  description: 'Anomaly-corrupted abomination. Attacks anything it perceives without regard for self-preservation.',
  entityClass: 'creature',
  biomes: ['ancient_ruins', 'starfall_crater'],
  textureKey: 'creature_void_horror',
  color: 0x191970,
  lootTableId: 'loot_creature_void_horror',
  behavior: 'maniac',
  baseHealth: 250,
  levelRange: [20, 35],
  baseXp: 120,
};

export const ALL_CREATURES: readonly CreatureDefinition[] = [
  CREATURE_VOID_CRAWLER,
  CREATURE_CANOPY_GRAZER,
  CREATURE_SPORE_CARRIER,
  CREATURE_CRYSTAL_HUNTER,
  CREATURE_MARSH_LURKER,
  CREATURE_DART_RUNNER,
  CREATURE_FROST_STALKER,
  CREATURE_MAGMA_BEAST,
  CREATURE_TOXIC_LURKER,
  CREATURE_VOID_HORROR,
];
