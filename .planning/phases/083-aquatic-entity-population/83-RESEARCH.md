# Phase 83: Aquatic Entity Population - Research

**Researched:** 2026-02-23
**Domain:** Entity definition and biome population for aquatic zones
**Confidence:** HIGH

## Summary

Phase 83 populates the three aquatic biomes (tidal_pools, kelp_forests, deep_trenches) created in Phase 82 with 13 distinct aquatic entities following established registry patterns. The existing entity definition system is mature and proven across 42 entities in 10 biomes — this phase simply extends with aquatic-themed content following identical patterns.

**Critical architectural insight:** Entity definitions are declarative data, not complex logic. The hard work (spawn generation, loot tables, creature AI, interaction handling) was done in Phases 33-38. This phase is content expansion, not system building.

**Primary recommendation:** Define entities in separate files per type (aquatic-creatures.ts, aquatic-plants.ts, aquatic-minerals.ts, aquatic-artifacts.ts) following existing naming conventions. Use lore constraints from world-bible.md "Coastal Shallows" section. Balance creature health using Phase 81 tier formulas (Tier I: 70-100 HP, Tier II: 120-160 HP, Tier III: 180-220 HP). Reference aquatic-themed items from packages/items for loot tables.

## Standard Stack

### Core (Already in Place)
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| EntityRegistry | Current | Strategy pattern for entity definitions | Handles 42 entities across 10 biomes, proven extensibility |
| ENTITY_IDS constant | Current | Type-safe string constants for entity references | Prevents typo bugs, used in spawn configs and interactions |
| BIOME_SPAWN_CONFIGS | Current | Biome-to-entity spawn mapping | Simple lookup table pattern proven in 10 biomes |
| HarvestYield interface | Current | Loot table entry format | Consistent across creatures, plants, minerals |
| CreatureBehavior enum | Current | Four behavior types (herbivore, omnivore, predator, maniac) | Defines AI and aggro patterns |
| CREATURE_LOOT_TABLES | Current | Runtime loot lookup map | Avoids DB queries per interaction, proven in Phase 35 |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Rarity variants | Higher yield, longer respawn | Optional rare/epic versions of minerals and plants |
| Level range tuning | Matches biome tier progression | Tier I: 1-8, Tier II: 4-18, Tier III: 10-28 |
| Spawn density modifiers | Controls entity frequency | Aquatic biomes should be 1.5x terrestrial density (ocean life is denser) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate aquatic-*.ts files | Add to existing creatures.ts/plants.ts | Separate files easier to review, clearer content additions |
| Generic "aquatic" items in loot | New aquatic-specific items | Phase 86 will add aquatic items; for now reference existing organic materials |
| Copy-paste existing entities | Create genuinely distinct aquatic entities | Aquatic content must feel unique, not reskinned land creatures |

**Installation:**
No new dependencies. All implementation extends existing packages/entities patterns.

## Architecture Patterns

### Recommended Project Structure
```
packages/
├── entities/src/definitions/
│   ├── aquatic-creatures.ts        # NEW: 10 aquatic creatures
│   ├── aquatic-plants.ts           # NEW: 5 aquatic plants
│   ├── aquatic-minerals.ts         # NEW: 5 aquatic minerals
│   ├── aquatic-artifacts.ts        # NEW: 3 aquatic artifacts
│   └── index.ts                    # Update to export aquatic entities
├── world-gen/src/generation/
│   └── spawn.ts                    # Update BIOME_SPAWN_CONFIGS for aquatic biomes
└── game-logic/src/loot/
    └── creature-loot.ts            # Add aquatic creature loot tables
```

### Pattern 1: Aquatic Creature Definitions
**What:** Define 10 aquatic creatures (3 herbivores, 3 omnivores, 3 predators, 1 maniac) across three biomes
**When to use:** Populating aquatic biomes with balanced fauna
**Example:**
```typescript
// packages/entities/src/definitions/aquatic-creatures.ts
import type { CreatureDefinition } from '../types';

// ===== TIER I: TIDAL POOLS (Frontier biome) =====

export const CREATURE_TIDE_CRAB: CreatureDefinition = {
  id: 'creature_tide_crab',
  displayName: 'Tide Crab',
  description: 'Small crustacean that scuttles along tidal flats. Docile unless cornered.',
  entityClass: 'creature',
  biomes: ['tidal_pools'],
  textureKey: 'creature_tide_crab',
  color: 0x8b7355, // Sandy brown
  lootTableId: 'loot_creature_tide_crab',
  behavior: 'herbivore',
  baseHealth: 75, // Tier I target: 2-3 hits for new players
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
  color: 0x556b2f, // Dark olive green
  lootTableId: 'loot_creature_coastal_urchin',
  behavior: 'herbivore',
  baseHealth: 70, // Low HP, stationary target
  levelRange: [1, 5],
  baseXp: 10,
  respawnSeconds: 240,
};

export const CREATURE_REEF_SCAVENGER: CreatureDefinition = {
  id: 'creature_reef_scavenger',
  displayName: 'Reef Scavenger',
  description: 'Opportunistic omnivore that picks through tidal debris. Will attack if hungry.',
  entityClass: 'creature',
  biomes: ['tidal_pools'],
  textureKey: 'creature_reef_scavenger',
  color: 0x4682b4, // Steel blue
  lootTableId: 'loot_creature_reef_scavenger',
  behavior: 'omnivore',
  baseHealth: 85, // Slightly tougher than herbivores
  levelRange: [2, 7],
  baseXp: 15,
  respawnSeconds: 200,
};

// ===== TIER II: KELP FORESTS (Hazardous biome) =====

export const CREATURE_KELP_GRAZER: CreatureDefinition = {
  id: 'creature_kelp_grazer',
  displayName: 'Kelp Grazer',
  description: 'Large herbivore that feeds on kelp fronds. Peaceful but territorial near feeding grounds.',
  entityClass: 'creature',
  biomes: ['kelp_forests'],
  textureKey: 'creature_kelp_grazer',
  color: 0x2e8b57, // Sea green
  lootTableId: 'loot_creature_kelp_grazer',
  behavior: 'herbivore',
  baseHealth: 125, // Tier II: 4-5 hits
  levelRange: [6, 14],
  baseXp: 28,
  respawnSeconds: 300,
};

export const CREATURE_TANGLE_STALKER: CreatureDefinition = {
  id: 'creature_tangle_stalker',
  displayName: 'Tangle Stalker',
  description: 'Predator that uses kelp forests for ambush cover. Patient hunter.',
  entityClass: 'creature',
  biomes: ['kelp_forests'],
  textureKey: 'creature_tangle_stalker',
  color: 0x20b2aa, // Light sea green
  lootTableId: 'loot_creature_tangle_stalker',
  behavior: 'predator',
  baseHealth: 155, // Tier II predator
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
  color: 0x5f9ea0, // Cadet blue
  lootTableId: 'loot_creature_current_rider',
  behavior: 'omnivore',
  baseHealth: 135, // Tier II omnivore
  levelRange: [7, 15],
  baseXp: 32,
  respawnSeconds: 280,
};

// ===== TIER III: DEEP TRENCHES (Hostile biome) =====

export const CREATURE_PRESSURE_FEEDER: CreatureDefinition = {
  id: 'creature_pressure_feeder',
  displayName: 'Pressure Feeder',
  description: 'Deep-dwelling filter organism adapted to crushing depths. Slow-moving but durable.',
  entityClass: 'creature',
  biomes: ['deep_trenches'],
  textureKey: 'creature_pressure_feeder',
  color: 0x483d8b, // Dark slate blue
  lootTableId: 'loot_creature_pressure_feeder',
  behavior: 'herbivore',
  baseHealth: 180, // Tier III: 5-6 hits
  levelRange: [12, 20],
  baseXp: 50,
  respawnSeconds: 420,
};

export const CREATURE_TRENCH_HUNTER: CreatureDefinition = {
  id: 'creature_trench_hunter',
  displayName: 'Trench Hunter',
  description: 'Apex predator of the deep trenches. Uses bioluminescent lures to disorient prey.',
  entityClass: 'creature',
  biomes: ['deep_trenches'],
  textureKey: 'creature_trench_hunter',
  color: 0x191970, // Midnight blue
  lootTableId: 'loot_creature_trench_hunter',
  behavior: 'predator',
  baseHealth: 210, // Tier III predator
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
  color: 0x2f4f4f, // Dark slate gray
  lootTableId: 'loot_creature_abyssal_scavenger',
  behavior: 'omnivore',
  baseHealth: 190, // Tier III omnivore
  levelRange: [13, 22],
  baseXp: 55,
  respawnSeconds: 400,
};

// ===== TIER IV: MANIAC (Extreme threat) =====

export const CREATURE_ABYSSAL_LEVIATHAN: CreatureDefinition = {
  id: 'creature_abyssal_leviathan',
  displayName: 'Abyssal Leviathan',
  description: 'Massive deep-sea predator driven to constant aggression by pressure-induced madness. Attacks anything it senses.',
  entityClass: 'creature',
  biomes: ['deep_trenches'],
  textureKey: 'creature_abyssal_leviathan',
  color: 0x0a0a0a, // Near-black
  lootTableId: 'loot_creature_abyssal_leviathan',
  behavior: 'maniac',
  baseHealth: 300, // Tier IV maniac: 7-8 hits
  levelRange: [20, 32],
  baseXp: 125,
  respawnSeconds: 900,
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
];
```

**Source:** Existing creature definitions pattern (creatures.ts lines 1-293), Phase 81 health balance formulas, lore constraints from world-bible.md lines 165-183 (Coastal Shallows biome description)

### Pattern 2: Aquatic Plant Definitions
**What:** Define 5 aquatic plants with harvest yields appropriate to tier
**When to use:** Providing gatherable resources in aquatic biomes
**Example:**
```typescript
// packages/entities/src/definitions/aquatic-plants.ts
import type { PlantDefinition } from '../types';

export const PLANT_TIDAL_KELP: PlantDefinition = {
  id: 'plant_tidal_kelp',
  displayName: 'Tidal Kelp',
  description: 'Common kelp that grows in shallow waters. Useful for basic crafting.',
  entityClass: 'plant',
  biomes: ['tidal_pools'],
  textureKey: 'plant_tidal_kelp',
  color: 0x556b2f, // Dark olive green
  lootTableId: 'loot_plant_tidal_kelp',
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_kelp_extract', minAmount: 1, maxAmount: 1, chance: 0.25 },
  ],
  respawnSeconds: 240,
};

export const PLANT_BIOLUMINESCENT_ALGAE: PlantDefinition = {
  id: 'plant_bioluminescent_algae',
  displayName: 'Bioluminescent Algae',
  description: 'Glowing algae colony clinging to rocks. Harvested for light-emitting compounds.',
  entityClass: 'plant',
  biomes: ['tidal_pools', 'kelp_forests'],
  textureKey: 'plant_bioluminescent_algae',
  color: 0x00ffff, // Cyan
  lootTableId: 'loot_plant_bioluminescent_algae',
  harvestYield: [
    { itemId: 'world_bioluminescent_sample', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_light_catalyst', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 300,
};

export const PLANT_PRESSURE_FERN: PlantDefinition = {
  id: 'plant_pressure_fern',
  displayName: 'Pressure Fern',
  description: 'Deep-water plant adapted to extreme pressure. Fronds contain stress-resistant compounds.',
  entityClass: 'plant',
  biomes: ['kelp_forests', 'deep_trenches'],
  textureKey: 'plant_pressure_fern',
  color: 0x2e8b57, // Sea green
  lootTableId: 'loot_plant_pressure_fern',
  harvestYield: [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_pressure_compound', minAmount: 1, maxAmount: 1, chance: 0.35 },
  ],
  respawnSeconds: 360,
};

export const PLANT_VOID_KELP: PlantDefinition = {
  id: 'plant_void_kelp',
  displayName: 'Void Kelp',
  description: 'Rare deep-sea kelp variant with dark, almost black fronds. Found only in the deepest trenches.',
  entityClass: 'plant',
  biomes: ['deep_trenches'],
  textureKey: 'plant_void_kelp',
  color: 0x191970, // Midnight blue
  lootTableId: 'loot_plant_void_kelp',
  harvestYield: [
    { itemId: 'world_organic_material_rare', minAmount: 2, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_abyssal_extract', minAmount: 1, maxAmount: 1, chance: 0.4 },
  ],
  respawnSeconds: 480,
};

export const PLANT_THERMAL_VENT_BACTERIA: PlantDefinition = {
  id: 'plant_thermal_vent_bacteria',
  displayName: 'Thermal Vent Bacteria',
  description: 'Extremophile bacterial colony clustering around deep-sea thermal vents.',
  entityClass: 'plant',
  biomes: ['deep_trenches'],
  textureKey: 'plant_thermal_vent_bacteria',
  color: 0xff4500, // Orange-red
  lootTableId: 'loot_plant_thermal_vent_bacteria',
  harvestYield: [
    { itemId: 'world_thermal_sample', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_thermal_compound', minAmount: 1, maxAmount: 1, chance: 0.25 },
  ],
  respawnSeconds: 420,
};

export const ALL_AQUATIC_PLANTS: readonly PlantDefinition[] = [
  PLANT_TIDAL_KELP,
  PLANT_BIOLUMINESCENT_ALGAE,
  PLANT_PRESSURE_FERN,
  PLANT_VOID_KELP,
  PLANT_THERMAL_VENT_BACTERIA,
];
```

**Source:** Existing plant definition pattern (plants.ts lines 1-245), harvest yield conventions

### Pattern 3: Aquatic Mineral Definitions
**What:** Define 5 aquatic minerals with mining yields and tier requirements
**When to use:** Providing minable resources in aquatic biomes
**Example:**
```typescript
// packages/entities/src/definitions/aquatic-minerals.ts
import type { MineralDefinition } from '../types';

export const MINERAL_CORAL_DEPOSIT: MineralDefinition = {
  id: 'mineral_coral_deposit',
  displayName: 'Coral Deposit',
  description: 'Calcium carbonate structure built by tiny organisms. Useful construction material.',
  entityClass: 'mineral',
  biomes: ['tidal_pools'],
  textureKey: 'mineral_coral_deposit',
  color: 0xff7f50, // Coral
  lootTableId: 'loot_mineral_coral_deposit',
  miningYield: [
    { itemId: 'world_coral_fragment', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  requiredTier: 1,
  respawnSeconds: 300,
};

export const MINERAL_SEA_CRYSTAL: MineralDefinition = {
  id: 'mineral_sea_crystal',
  displayName: 'Sea Crystal',
  description: 'Translucent crystalline formation grown in tidal caves. Refracts light beautifully.',
  entityClass: 'mineral',
  biomes: ['tidal_pools', 'kelp_forests'],
  textureKey: 'mineral_sea_crystal',
  color: 0x00ced1, // Dark turquoise
  lootTableId: 'loot_mineral_sea_crystal',
  miningYield: [
    { itemId: 'world_sea_crystal', minAmount: 1, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  requiredTier: 1,
  respawnSeconds: 360,
};

export const MINERAL_ABYSSAL_ORE: MineralDefinition = {
  id: 'mineral_abyssal_ore',
  displayName: 'Abyssal Ore',
  description: 'Dense metallic ore exposed on trench walls. Forged under extreme pressure.',
  entityClass: 'mineral',
  biomes: ['deep_trenches'],
  textureKey: 'mineral_abyssal_ore',
  color: 0x2f4f4f, // Dark slate gray
  lootTableId: 'loot_mineral_abyssal_ore',
  miningYield: [
    { itemId: 'world_abyssal_ore', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  requiredTier: 3,
  respawnSeconds: 540,
};

export const MINERAL_TIDAL_STONE: MineralDefinition = {
  id: 'mineral_tidal_stone',
  displayName: 'Tidal Stone',
  description: 'Smooth stone polished by constant wave action. Contains trace minerals.',
  entityClass: 'mineral',
  biomes: ['tidal_pools'],
  textureKey: 'mineral_tidal_stone',
  color: 0x708090, // Slate gray
  lootTableId: 'loot_mineral_tidal_stone',
  miningYield: [
    { itemId: 'world_tidal_stone', minAmount: 2, maxAmount: 3, chance: 1.0 },
  ],
  requiredTier: 1,
  respawnSeconds: 240,
};

export const MINERAL_PEARL_NODE: MineralDefinition = {
  id: 'mineral_pearl_node',
  displayName: 'Pearl Node',
  description: 'Rare concentration of pearl-producing mollusks. Highly valuable.',
  entityClass: 'mineral',
  biomes: ['kelp_forests'],
  textureKey: 'mineral_pearl_node',
  color: 0xf0e68c, // Khaki (pearl-like)
  lootTableId: 'loot_mineral_pearl_node',
  miningYield: [
    { itemId: 'world_pearl', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.4 },
  ],
  requiredTier: 2,
  respawnSeconds: 600,
};

export const ALL_AQUATIC_MINERALS: readonly MineralDefinition[] = [
  MINERAL_CORAL_DEPOSIT,
  MINERAL_SEA_CRYSTAL,
  MINERAL_ABYSSAL_ORE,
  MINERAL_TIDAL_STONE,
  MINERAL_PEARL_NODE,
];
```

**Source:** Existing mineral definition pattern (minerals.ts lines 1-287), tier requirements convention

### Pattern 4: Aquatic Artifact Definitions
**What:** Define 3 aquatic artifacts as one-time discoveries
**When to use:** Providing rare discoverable content in aquatic biomes
**Example:**
```typescript
// packages/entities/src/definitions/aquatic-artifacts.ts
import type { ArtifactDefinition } from '../types';

export const ARTIFACT_SUNKEN_TECH: ArtifactDefinition = {
  id: 'artifact_sunken_tech',
  displayName: 'Sunken Tech Module',
  description: 'Water-damaged technology from the Prior Inhabitants. Still partially functional.',
  entityClass: 'artifact',
  biomes: ['kelp_forests', 'deep_trenches'],
  textureKey: 'artifact_sunken_tech',
  color: 0x708090, // Slate gray
  lootTableId: 'loot_artifact_sunken_tech',
  respawns: false,
  rarity: 'epic',
};

export const ARTIFACT_ANCIENT_SHELL: ArtifactDefinition = {
  id: 'artifact_ancient_shell',
  displayName: 'Ancient Shell',
  description: 'Fossilized shell of enormous size. Predates all known Terminus fauna.',
  entityClass: 'artifact',
  biomes: ['deep_trenches'],
  textureKey: 'artifact_ancient_shell',
  color: 0xf5deb3, // Wheat
  lootTableId: 'loot_artifact_ancient_shell',
  respawns: false,
  rarity: 'rare',
};

export const ARTIFACT_DROWNED_RELIC: ArtifactDefinition = {
  id: 'artifact_drowned_relic',
  displayName: 'Drowned Relic',
  description: 'Prior Inhabitant artifact recovered from flooded ruins. Purpose unknown.',
  entityClass: 'artifact',
  biomes: ['deep_trenches'],
  textureKey: 'artifact_drowned_relic',
  color: 0x4682b4, // Steel blue
  lootTableId: 'loot_artifact_drowned_relic',
  respawns: false,
  rarity: 'legendary',
};

export const ALL_AQUATIC_ARTIFACTS: readonly ArtifactDefinition[] = [
  ARTIFACT_SUNKEN_TECH,
  ARTIFACT_ANCIENT_SHELL,
  ARTIFACT_DROWNED_RELIC,
];
```

**Source:** Existing artifact definition pattern (artifacts.ts lines 1-74)

### Pattern 5: Biome Spawn Configuration
**What:** Map aquatic entities to biomes via BIOME_SPAWN_CONFIGS
**When to use:** Determining which entities spawn in which biomes
**Example:**
```typescript
// packages/world-gen/src/generation/spawn.ts (extend existing config)

const BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig> = {
  // ... existing configs

  tidal_pools: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_TIDE_CRAB, weight: 10, minLevel: 1, maxLevel: 6 },
      { id: ENTITY_IDS.CREATURE_COASTAL_URCHIN, weight: 8, minLevel: 1, maxLevel: 5 },
      { id: ENTITY_IDS.CREATURE_REEF_SCAVENGER, weight: 6, minLevel: 2, maxLevel: 7 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_CORAL_DEPOSIT, weight: 10, rarity: 1 },
      { id: ENTITY_IDS.MINERAL_SEA_CRYSTAL, weight: 8, rarity: 1 },
      { id: ENTITY_IDS.MINERAL_TIDAL_STONE, weight: 12, rarity: 1 },
    ],
    creatureDensity: 5,  // 50% higher than terrestrial Tier I (void_plains: 3)
    mineralDensity: 4,   // More abundant than terrestrial
  },

  kelp_forests: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_KELP_GRAZER, weight: 8, minLevel: 6, maxLevel: 14 },
      { id: ENTITY_IDS.CREATURE_TANGLE_STALKER, weight: 5, minLevel: 8, maxLevel: 16 },
      { id: ENTITY_IDS.CREATURE_CURRENT_RIDER, weight: 7, minLevel: 7, maxLevel: 15 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_SEA_CRYSTAL, weight: 8, rarity: 1 },
      { id: ENTITY_IDS.MINERAL_PEARL_NODE, weight: 4, rarity: 2 },
    ],
    creatureDensity: 6,  // Dense kelp = more creatures
    mineralDensity: 3,
  },

  deep_trenches: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_PRESSURE_FEEDER, weight: 6, minLevel: 12, maxLevel: 20 },
      { id: ENTITY_IDS.CREATURE_TRENCH_HUNTER, weight: 4, minLevel: 14, maxLevel: 24 },
      { id: ENTITY_IDS.CREATURE_ABYSSAL_SCAVENGER, weight: 5, minLevel: 13, maxLevel: 22 },
      { id: ENTITY_IDS.CREATURE_ABYSSAL_LEVIATHAN, weight: 1, minLevel: 20, maxLevel: 32 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_ABYSSAL_ORE, weight: 8, rarity: 2 },
    ],
    creatureDensity: 4,  // Sparse but dangerous
    mineralDensity: 5,   // Rich deep minerals
  },
};
```

**Source:** Existing BIOME_SPAWN_CONFIGS pattern (spawn.ts lines 37-176), Phase 82 research guidance on aquatic density

### Pattern 6: Creature Loot Tables
**What:** Define what creatures drop when killed
**When to use:** Configuring loot rewards for aquatic creatures
**Example:**
```typescript
// packages/game-logic/src/loot/creature-loot.ts (extend existing map)

export const CREATURE_LOOT_TABLES = new Map<string, readonly HarvestYield[]>([
  // ... existing loot tables

  // Tier I — Tidal Pools (Herbivore, levels 1-6)
  ['loot_creature_tide_crab', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.8 },
    { itemId: 'world_coral_fragment', minAmount: 1, maxAmount: 2, chance: 0.4 },
  ]],

  // Tier I — Tidal Pools (Herbivore, levels 1-5)
  ['loot_creature_coastal_urchin', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'world_sea_crystal', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ]],

  // Tier I — Tidal Pools (Omnivore, levels 2-7)
  ['loot_creature_reef_scavenger', [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 3, chance: 0.85 },
    { itemId: 'world_tidal_stone', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ]],

  // Tier II — Kelp Forests (Herbivore, levels 6-14)
  ['loot_creature_kelp_grazer', [
    { itemId: 'world_organic_material_common', minAmount: 2, maxAmount: 3, chance: 0.85 },
    { itemId: 'reagent_kelp_extract', minAmount: 1, maxAmount: 2, chance: 0.35 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ]],

  // Tier II — Kelp Forests (Predator, levels 8-16)
  ['loot_creature_tangle_stalker', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'world_sea_crystal', minAmount: 1, maxAmount: 2, chance: 0.4 },
    { itemId: 'reagent_kelp_extract', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ]],

  // Tier II — Kelp Forests (Omnivore, levels 7-15)
  ['loot_creature_current_rider', [
    { itemId: 'world_organic_material_common', minAmount: 2, maxAmount: 3, chance: 0.8 },
    { itemId: 'world_pearl', minAmount: 1, maxAmount: 1, chance: 0.08 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.12 },
  ]],

  // Tier III — Deep Trenches (Herbivore, levels 12-20)
  ['loot_creature_pressure_feeder', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.8 },
    { itemId: 'reagent_pressure_compound', minAmount: 1, maxAmount: 1, chance: 0.3 },
    { itemId: 'world_abyssal_ore', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ]],

  // Tier III — Deep Trenches (Predator, levels 14-24)
  ['loot_creature_trench_hunter', [
    { itemId: 'world_organic_material_rare', minAmount: 2, maxAmount: 3, chance: 0.85 },
    { itemId: 'world_abyssal_ore', minAmount: 1, maxAmount: 2, chance: 0.4 },
    { itemId: 'reagent_abyssal_extract', minAmount: 1, maxAmount: 1, chance: 0.25 },
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.08 },
  ]],

  // Tier III — Deep Trenches (Omnivore, levels 13-22)
  ['loot_creature_abyssal_scavenger', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'world_thermal_sample', minAmount: 1, maxAmount: 1, chance: 0.3 },
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.06 },
  ]],

  // Tier IV — Deep Trenches (Maniac, levels 20-32)
  ['loot_creature_abyssal_leviathan', [
    { itemId: 'world_organic_material_epic', minAmount: 2, maxAmount: 3, chance: 0.9 },
    { itemId: 'world_abyssal_ore', minAmount: 2, maxAmount: 4, chance: 0.5 },
    { itemId: 'reagent_abyssal_extract', minAmount: 2, maxAmount: 3, chance: 0.4 },
    { itemId: 'world_pearl', minAmount: 1, maxAmount: 2, chance: 0.2 },
    { itemId: 'reagent_pressure_compound', minAmount: 1, maxAmount: 2, chance: 0.3 },
  ]],
]);
```

**Source:** Existing creature loot tables pattern (creature-loot.ts lines 31-162), loot tier conventions

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Entity ID collision checking | Manual string comparison across files | ENTITY_IDS constant with TypeScript const assertion | Compiler catches duplicate IDs, prevents runtime bugs |
| Loot table balancing | Eyeball drop rates | Follow existing tier patterns (common: 0.7-0.85, rare: 0.1-0.25, epic: 0.05-0.12) | Consistency across 42 existing entities ensures balanced economy |
| Creature health values | Arbitrary HP assignments | Phase 81 tier formulas (Tier I: 70-100, Tier II: 120-160, Tier III: 180-220, Tier IV: 260-320) | Ensures 4-8 hit TTK target is met |
| Spawn density tuning | Trial and error in-game | Aquatic = 1.5x terrestrial baseline (lore: ocean life is denser) | Research-backed values from Phase 82 |
| Item ID references | Hardcoded strings | Use existing item registry IDs from packages/items | Prevents missing item errors, validates at compile time |

**Key insight:** Entity definitions are data configuration, not complex logic. Follow existing patterns exactly. The system was designed for content expansion — adding 13 new entities is mechanical work, not architectural work.

## Common Pitfalls

### Pitfall 1: Inventing New Entity Patterns
**What goes wrong:** Adding custom fields to entity definitions not present in existing entities (e.g., `swimSpeed`, `waterBreathing`).
**Why it happens:** Aquatic content feels like it needs special mechanics.
**How to avoid:** Use only fields defined in entity type interfaces (CreatureDefinition, PlantDefinition, etc.). If aquatic creatures need different behavior, it's handled by biome-specific movement speed modifiers (already done in Phase 82), not entity fields.
**Warning signs:**
- TypeScript compilation errors for unknown properties
- Entity registry validation failures
- Custom properties silently ignored by existing systems

### Pitfall 2: Forgetting to Update Index Exports
**What goes wrong:** New aquatic entity files created but not exported from packages/entities/src/definitions/index.ts. Entities defined but invisible to spawn system.
**Why it happens:** File creation is separate from export registration.
**How to avoid:** After creating aquatic-creatures.ts, aquatic-plants.ts, etc., immediately update index.ts to export and add to ALL_ENTITIES array.
**Warning signs:**
- Entities don't spawn in game
- ENTITY_IDS constants show "unused" in IDE
- EntityRegistry.get() returns null for new entity IDs

**Fix checklist:**
```typescript
// packages/entities/src/definitions/index.ts
import { ALL_AQUATIC_CREATURES } from './aquatic-creatures';
import { ALL_AQUATIC_PLANTS } from './aquatic-plants';
import { ALL_AQUATIC_MINERALS } from './aquatic-minerals';
import { ALL_AQUATIC_ARTIFACTS } from './aquatic-artifacts';

export const ALL_ENTITIES: readonly EntityDefinition[] = [
  ...ALL_CREATURES,
  ...ALL_PLANTS,
  ...ALL_MINERALS,
  ...ALL_ARTIFACTS,
  ...ALL_AQUATIC_CREATURES,  // NEW
  ...ALL_AQUATIC_PLANTS,     // NEW
  ...ALL_AQUATIC_MINERALS,   // NEW
  ...ALL_AQUATIC_ARTIFACTS,  // NEW
];

// Export aquatic definitions
export * from './aquatic-creatures';
export * from './aquatic-plants';
export * from './aquatic-minerals';
export * from './aquatic-artifacts';
```

### Pitfall 3: Loot Tables Reference Non-Existent Items
**What goes wrong:** Creature loot tables reference item IDs that don't exist yet (e.g., 'world_kelp_extract' when only 'reagent_kelp_extract' exists).
**Why it happens:** Assumption that aquatic-specific items exist. Phase 86 will add them, but Phase 83 happens first.
**How to avoid:** Reference only existing items from packages/items. Use generic materials (world_organic_material_common/rare/epic) and existing reagents. Aquatic-specific items come in Phase 86.
**Warning signs:**
- Loot rolls return null/undefined
- Players report "no loot" when killing aquatic creatures
- ItemRegistry.get() logs warnings for missing items

**Safe item references (verified to exist):**
- world_organic_material_common
- world_organic_material_rare
- world_organic_material_epic
- reagent_crystalline_dust (generic reagent)
- reagent_thermal_compound (generic reagent)
- world_frozen_shard (if using cold-water variants)

### Pitfall 4: Creature Health Not Following Phase 81 Formulas
**What goes wrong:** Aquatic creature health values assigned arbitrarily, resulting in too-fast or too-slow kills.
**Why it happens:** Not reading Phase 81 rebalancing work before assigning health.
**How to avoid:** Use exact tier targets from Phase 81-03:
- Tier I: 70-100 HP (2-3 hits for new players)
- Tier II: 120-160 HP (4-5 hits)
- Tier III: 180-220 HP (5-6 hits)
- Tier IV: 260-320 HP (7-8 hits)
**Warning signs:**
- Playtest feedback: "creatures die too fast" or "combat takes forever"
- TTK tests fail balance verification
- Creature difficulty doesn't match biome tier

**Verification test (add after implementation):**
```typescript
// Verify aquatic creatures follow Phase 81 health targets
describe('Aquatic Creature Health Balance', () => {
  it('Tier I aquatic creatures have 70-100 HP', () => {
    expect(CREATURE_TIDE_CRAB.baseHealth).toBeGreaterThanOrEqual(70);
    expect(CREATURE_TIDE_CRAB.baseHealth).toBeLessThanOrEqual(100);
  });

  it('Tier II aquatic creatures have 120-160 HP', () => {
    expect(CREATURE_KELP_GRAZER.baseHealth).toBeGreaterThanOrEqual(120);
    expect(CREATURE_KELP_GRAZER.baseHealth).toBeLessThanOrEqual(160);
  });

  it('Tier III aquatic creatures have 180-220 HP', () => {
    expect(CREATURE_TRENCH_HUNTER.baseHealth).toBeGreaterThanOrEqual(180);
    expect(CREATURE_TRENCH_HUNTER.baseHealth).toBeLessThanOrEqual(220);
  });

  it('Tier IV maniac has 260-320 HP', () => {
    expect(CREATURE_ABYSSAL_LEVIATHAN.baseHealth).toBeGreaterThanOrEqual(260);
    expect(CREATURE_ABYSSAL_LEVIATHAN.baseHealth).toBeLessThanOrEqual(320);
  });
});
```

### Pitfall 5: Spawn Density Matching Terrestrial Biomes
**What goes wrong:** Aquatic biomes feel empty because spawn density copied directly from terrestrial biomes (e.g., creatureDensity: 3).
**Why it happens:** Copy-paste from existing configs without adjustment.
**How to avoid:** Aquatic biomes should be 1.5x terrestrial baseline (Phase 82 research: "ocean life is denser"). Tidal pools should have creatureDensity: 5 (vs void_plains: 3).
**Warning signs:**
- Playtest feedback: "aquatic zones feel dead"
- Long gaps between creature encounters
- Fewer interactions per minute than same-tier terrestrial biomes

**Recommended density values:**
```typescript
// Terrestrial baseline (for comparison)
void_plains: { creatureDensity: 3, mineralDensity: 2 }

// Aquatic (1.5x multiplier)
tidal_pools: { creatureDensity: 5, mineralDensity: 4 }
kelp_forests: { creatureDensity: 6, mineralDensity: 3 }
deep_trenches: { creatureDensity: 4, mineralDensity: 5 }
```

## Code Examples

Verified patterns from existing codebase:

### Entity Registry Integration
```typescript
// packages/entities/src/definitions/index.ts
export const ALL_ENTITIES: readonly EntityDefinition[] = [
  ...ALL_CREATURES,
  ...ALL_PLANTS,
  ...ALL_MINERALS,
  ...ALL_ARTIFACTS,
  // NEW: Aquatic entities
  ...ALL_AQUATIC_CREATURES,
  ...ALL_AQUATIC_PLANTS,
  ...ALL_AQUATIC_MINERALS,
  ...ALL_AQUATIC_ARTIFACTS,
];

// ENTITY_IDS constant
export const ENTITY_IDS = {
  // ... existing IDs

  // Aquatic creatures
  CREATURE_TIDE_CRAB: 'creature_tide_crab',
  CREATURE_COASTAL_URCHIN: 'creature_coastal_urchin',
  CREATURE_REEF_SCAVENGER: 'creature_reef_scavenger',
  CREATURE_KELP_GRAZER: 'creature_kelp_grazer',
  CREATURE_TANGLE_STALKER: 'creature_tangle_stalker',
  CREATURE_CURRENT_RIDER: 'creature_current_rider',
  CREATURE_PRESSURE_FEEDER: 'creature_pressure_feeder',
  CREATURE_TRENCH_HUNTER: 'creature_trench_hunter',
  CREATURE_ABYSSAL_SCAVENGER: 'creature_abyssal_scavenger',
  CREATURE_ABYSSAL_LEVIATHAN: 'creature_abyssal_leviathan',

  // Aquatic plants
  PLANT_TIDAL_KELP: 'plant_tidal_kelp',
  PLANT_BIOLUMINESCENT_ALGAE: 'plant_bioluminescent_algae',
  PLANT_PRESSURE_FERN: 'plant_pressure_fern',
  PLANT_VOID_KELP: 'plant_void_kelp',
  PLANT_THERMAL_VENT_BACTERIA: 'plant_thermal_vent_bacteria',

  // Aquatic minerals
  MINERAL_CORAL_DEPOSIT: 'mineral_coral_deposit',
  MINERAL_SEA_CRYSTAL: 'mineral_sea_crystal',
  MINERAL_ABYSSAL_ORE: 'mineral_abyssal_ore',
  MINERAL_TIDAL_STONE: 'mineral_tidal_stone',
  MINERAL_PEARL_NODE: 'mineral_pearl_node',

  // Aquatic artifacts
  ARTIFACT_SUNKEN_TECH: 'artifact_sunken_tech',
  ARTIFACT_ANCIENT_SHELL: 'artifact_ancient_shell',
  ARTIFACT_DROWNED_RELIC: 'artifact_drowned_relic',
} as const;
```

### Behavioral Distribution Across Tiers
```typescript
// Distribution follows lore and balance patterns:
// - Tier I (starter): More herbivores, fewer predators
// - Tier II (mid-game): Balanced mix
// - Tier III (late-game): More predators, dangerous
// - Tier IV (endgame): Maniac only

// Tidal Pools (Tier I): 2 herbivores, 1 omnivore, 0 predators
// Kelp Forests (Tier II): 1 herbivore, 1 omnivore, 1 predator
// Deep Trenches (Tier III): 1 herbivore, 1 omnivore, 1 predator, 1 maniac (Tier IV)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual entity registration | EntityRegistry auto-registers on module load | Phase 33 | New entities automatically available system-wide |
| Hardcoded entity IDs in strings | ENTITY_IDS constant with type safety | Phase 33 | Compile-time validation prevents typo bugs |
| Single creatures.ts file | Separate files per content type | Phase 55 | Easier code review and content organization |
| Arbitrary health values | Tier-based health formulas | Phase 81 | Consistent TTK (4-8 hits) across all creature tiers |

**Deprecated/outdated:**
- No deprecated patterns in entity system (stable since Phase 38)

## Open Questions

1. **Should aquatic creatures use distinct AI movement patterns (swimming vs walking)?**
   - What we know: Creature AI uses wander behavior (Phase 36). Movement is tile-based, not animation-based.
   - What's unclear: If aquatic creatures need custom wander logic (e.g., avoiding land tiles).
   - Recommendation: Use existing wander behavior unchanged. Phase 82 movement restrictions (shallow_water/deep_water tiles) already prevent creatures from leaving water biomes. No custom AI needed.

2. **Do artifact loot tables need aquatic-specific rewards?**
   - What we know: Artifacts are rare one-time discoveries. Existing artifacts give generic high-value items (world_ancient_fragment, reagent_void_essence).
   - What's unclear: If aquatic artifacts should drop aquatic-themed items.
   - Recommendation: Use generic high-value items for Phase 83. Phase 86 can add aquatic-specific artifact rewards when aquatic items exist.

3. **Should Abyssal Leviathan (maniac) be aggressive towards other creatures?**
   - What we know: Maniac behavior means "attacks anything perceived" (lore). Current AI attacks players only.
   - What's unclear: If maniacs should attack other creatures (creating ecosystem chaos).
   - Recommendation: Keep existing maniac behavior (player-focused). Creature-vs-creature combat is out of scope for Phase 83.

4. **Are plant/mineral textures required for Phase 83 completion?**
   - What we know: Entities use color fallbacks if textureKey missing. Phase 82 added aquatic tiles with colors.
   - What's unclear: If completion requires actual sprite assets.
   - Recommendation: Use color fallbacks for Phase 83. Success criteria specify entities are "gatherable" (functional), not "have sprites" (visual polish). Sprites can be added later without code changes.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis:
  - `/packages/entities/src/definitions/creatures.ts` — 17 existing creatures across 10 biomes
  - `/packages/entities/src/definitions/plants.ts` — 14 existing plants with rare variants
  - `/packages/entities/src/definitions/minerals.ts` — 14 existing minerals with rare/epic variants
  - `/packages/entities/src/definitions/artifacts.ts` — 5 existing artifacts
  - `/packages/entities/src/types.ts` — Entity definition interfaces
  - `/packages/world-gen/src/generation/spawn.ts` — BIOME_SPAWN_CONFIGS pattern
  - `/packages/game-logic/src/loot/creature-loot.ts` — Loot table conventions
- `.planning/phases/082-aquatic-biome-foundation/82-RESEARCH.md` — Aquatic biome context
- `.planning/phases/081-combat-balancing-quest-audit/81-03-PLAN.md` — Creature health balance targets
- `lore/world-bible.md` lines 165-183 — Coastal Shallows biome lore (Tier I, tidal patterns, marine life)

### Secondary (MEDIUM confidence)
- Phase 55 content expansion patterns (added rare creature variants)
- Phase 37 spawn density research (fertility multipliers, biome-specific density)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Entity system unchanged since Phase 38, zero new dependencies, 42 existing entities prove patterns
- Architecture: HIGH — Direct inspection of 4 definition files shows exact patterns to follow, no ambiguity
- Pitfalls: HIGH — Phase 81 health targets are documented with test verification, lore constraints are explicit

**Research date:** 2026-02-23
**Valid until:** ~90 days (entity system is stable, content definitions don't change patterns)

**Key validation points:**
- Entity definitions follow CreatureDefinition/PlantDefinition/MineralDefinition/ArtifactDefinition interfaces (confirmed: types.ts lines 24-77)
- ENTITY_IDS uses const assertion for type safety (confirmed: definitions/index.ts line 86)
- Loot tables use HarvestYield[] format (confirmed: creature-loot.ts line 31)
- Phase 81 health targets documented with test coverage (confirmed: 81-03-PLAN.md lines 60-104)
- Lore confirms Coastal Shallows as Tier I, tidal patterns, marine life abundance (confirmed: world-bible.md lines 165-183)
