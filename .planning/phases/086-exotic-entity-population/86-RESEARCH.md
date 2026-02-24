# Phase 86: Exotic Entity Population - Research

**Researched:** 2026-02-24
**Domain:** Entity definition and biome population for exotic zones
**Confidence:** HIGH

## Summary

Phase 86 populates the three exotic biomes (void_rift Tier IV, crystalline_wastes Tier III, bioluminescent_depths Tier II) created in Phase 84 with 14 distinct exotic entities following the proven patterns from Phase 83 (aquatic entities). The entity definition system is mature and battle-tested — this phase is pure content expansion using identical architectural patterns.

**Critical architectural insight:** Phase 83 already extended the spawn system to support plants and artifacts across ALL biomes. Phase 86 simply adds exotic entity definitions and configures spawn tables using the existing infrastructure. Zero system changes needed.

**Primary recommendation:** Follow Phase 83 implementation pattern exactly. Define entities in separate files per type (exotic-creatures.ts, exotic-plants.ts, exotic-minerals.ts, exotic-artifacts.ts), use Phase 81 tier health formulas for creatures, reference existing items for loot tables (exotic-specific items come in Phase 86 item pass), and configure spawn densities matching biome tiers.

**Key scoping constraint:** Phase 86 focuses ONLY on exotic entities (ENT-04, ENT-05, ENT-06, CREA-05-08). Phase 86 will also handle exotic ITEMS (ITEM-04 through ITEM-08) in a separate implementation. This research covers entities only.

## Standard Stack

### Core (Already in Place)
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| EntityRegistry | Current | Strategy pattern for entity definitions | Handles 58 entities (27 creatures + 19 plants + 15 minerals + 8 artifacts) across 13 biomes |
| ENTITY_IDS constant | Current | Type-safe entity ID constants | Prevents typo bugs, used in spawn configs |
| BIOME_SPAWN_CONFIGS | Current | Biome-to-entity spawn mapping | Proven in 13 biomes with plant/artifact support (Phase 83) |
| HarvestYield interface | Current | Loot table entry format | Consistent across all entity types |
| CreatureBehavior enum | Current | Four behaviors (herbivore, omnivore, predator, maniac) | Defines AI patterns |
| CREATURE_LOOT_TABLES | Current | Runtime loot lookup map | Avoids DB queries per interaction |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Rarity variants | Higher yield, longer respawn | Optional rare/epic mineral and plant variants |
| Level range tuning | Matches biome tier progression | Tier II: 4-18, Tier III: 10-28, Tier IV: 20-32 |
| Spawn density modifiers | Controls entity frequency | Exotic biomes have unique density profiles |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate exotic-*.ts files | Add to existing creatures.ts/plants.ts | Separate files clearer for Phase 86 content scope |
| New exotic-specific items | Reference existing items temporarily | Phase 86 items come later; use generic materials for now |
| Custom "dimensional" creature behaviors | Use existing herbivore/omnivore/predator/maniac | No new AI needed, theming via description text |

**Installation:**
No new dependencies. All implementation extends existing packages/entities patterns.

## Architecture Patterns

### Recommended Project Structure
```
packages/
├── entities/src/definitions/
│   ├── exotic-creatures.ts        # NEW: 9 exotic creatures (3 herbivore, 3 omnivore, 3 predator)
│   ├── exotic-plants.ts           # NEW: 5 exotic plants
│   ├── exotic-minerals.ts         # NEW: 5 exotic minerals
│   ├── exotic-artifacts.ts        # NEW: 4 exotic artifacts
│   └── index.ts                   # Update to export exotic entities
├── world-gen/src/generation/
│   └── spawn.ts                   # Update BIOME_SPAWN_CONFIGS for exotic biomes
└── game-logic/src/loot/
    └── creature-loot.ts           # Add exotic creature loot tables
```

### Pattern 1: Exotic Creature Definitions
**What:** Define 9 exotic creatures (3 herbivores, 3 omnivores, 3 predators) + 1 maniac across three biomes
**When to use:** Populating exotic biomes with balanced fauna
**Example:**
```typescript
// packages/entities/src/definitions/exotic-creatures.ts
import type { CreatureDefinition } from '../types';

// ===== TIER II: BIOLUMINESCENT DEPTHS (Hazardous biome) =====

export const CREATURE_ECHO_DRIFTER: CreatureDefinition = {
  id: 'creature_echo_drifter',
  displayName: 'Echo Drifter',
  description: 'Herbivore that feeds on bioluminescent fungi. Movements create faint afterimages.',
  entityClass: 'creature',
  biomes: ['bioluminescent_depths'],
  textureKey: 'creature_echo_drifter',
  color: 0x00cc66, // Green bioluminescent
  lootTableId: 'loot_creature_echo_drifter',
  behavior: 'herbivore',
  baseHealth: 125, // Tier II target: 4-5 hits
  levelRange: [6, 14],
  baseXp: 28,
  respawnSeconds: 300,
};

export const CREATURE_PHASE_GRAZER: CreatureDefinition = {
  id: 'creature_phase_grazer',
  displayName: 'Phase Grazer',
  description: 'Large herbivore partially out of sync with normal time. Docile but disorienting to observe.',
  entityClass: 'creature',
  biomes: ['bioluminescent_depths'],
  textureKey: 'creature_phase_grazer',
  color: 0x00ff88, // Cyan bioluminescent
  lootTableId: 'loot_creature_phase_grazer',
  behavior: 'herbivore',
  baseHealth: 130, // Tier II
  levelRange: [7, 15],
  baseXp: 30,
  respawnSeconds: 320,
};

export const CREATURE_REALITY_SCAVENGER: CreatureDefinition = {
  id: 'creature_reality_scavenger',
  displayName: 'Reality Scavenger',
  description: 'Opportunistic omnivore that feeds on dimensional residue. Aggressive when cornered.',
  entityClass: 'creature',
  biomes: ['bioluminescent_depths'],
  textureKey: 'creature_reality_scavenger',
  color: 0x4488ff, // Blue-purple
  lootTableId: 'loot_creature_reality_scavenger',
  behavior: 'omnivore',
  baseHealth: 135, // Tier II omnivore
  levelRange: [8, 16],
  baseXp: 32,
  respawnSeconds: 280,
};

// ===== TIER III: CRYSTALLINE WASTES (Hostile biome) =====

export const CREATURE_NULL_FEEDER: CreatureDefinition = {
  id: 'creature_null_feeder',
  displayName: 'Null Feeder',
  description: 'Crystalline herbivore that grazes on mineral formations. Its body refracts light into prismatic patterns.',
  entityClass: 'creature',
  biomes: ['crystalline_wastes'],
  textureKey: 'creature_null_feeder',
  color: 0xadd8e6, // Light blue crystal
  lootTableId: 'loot_creature_null_feeder',
  behavior: 'herbivore',
  baseHealth: 180, // Tier III: 5-6 hits
  levelRange: [12, 20],
  baseXp: 50,
  respawnSeconds: 420,
};

export const CREATURE_DIMENSIONAL_HUNTER: CreatureDefinition = {
  id: 'creature_dimensional_hunter',
  displayName: 'Dimensional Hunter',
  description: 'Omnivore that exists slightly offset from normal space. Hunts by phasing through crystal barriers.',
  entityClass: 'creature',
  biomes: ['crystalline_wastes'],
  textureKey: 'creature_dimensional_hunter',
  color: 0x87ceeb, // Sky blue
  lootTableId: 'loot_creature_dimensional_hunter',
  behavior: 'omnivore',
  baseHealth: 190, // Tier III omnivore
  levelRange: [13, 22],
  baseXp: 55,
  respawnSeconds: 400,
};

export const CREATURE_RIFT_HUNTER: CreatureDefinition = {
  id: 'creature_rift_hunter',
  displayName: 'Rift Hunter',
  description: 'Predator that stalks crystalline corridors. Uses reflections to confuse and ambush prey.',
  entityClass: 'creature',
  biomes: ['crystalline_wastes'],
  textureKey: 'creature_rift_hunter',
  color: 0x6495ed, // Cornflower blue
  lootTableId: 'loot_creature_rift_hunter',
  behavior: 'predator',
  baseHealth: 210, // Tier III predator
  levelRange: [14, 24],
  baseXp: 65,
  respawnSeconds: 480,
};

// ===== TIER IV: VOID RIFT (Extreme biome) =====

export const CREATURE_VOID_GRAZER: CreatureDefinition = {
  id: 'creature_void_grazer',
  displayName: 'Void Grazer',
  description: 'Herbivore adapted to feed on reality-warped vegetation. Its movements seem to skip frames.',
  entityClass: 'creature',
  biomes: ['void_rift'],
  textureKey: 'creature_void_grazer',
  color: 0x4a0080, // Deep purple void
  lootTableId: 'loot_creature_void_grazer',
  behavior: 'herbivore',
  baseHealth: 240, // Tier IV: 7-8 hits (below maniac)
  levelRange: [18, 28],
  baseXp: 85,
  respawnSeconds: 600,
};

export const CREATURE_ANOMALY_SCAVENGER: CreatureDefinition = {
  id: 'creature_anomaly_scavenger',
  displayName: 'Anomaly Scavenger',
  description: 'Omnivore that feeds on dimensional tears and void residue. Erratic, unpredictable movement.',
  entityClass: 'creature',
  biomes: ['void_rift'],
  textureKey: 'creature_anomaly_scavenger',
  color: 0x6a00a0, // Brighter purple
  lootTableId: 'loot_creature_anomaly_scavenger',
  behavior: 'omnivore',
  baseHealth: 260, // Tier IV omnivore
  levelRange: [20, 30],
  baseXp: 95,
  respawnSeconds: 540,
};

export const CREATURE_VOID_STALKER: CreatureDefinition = {
  id: 'creature_void_stalker',
  displayName: 'Void Stalker',
  description: 'Apex predator of the Void Rift. Partially phased out of reality, visible only as distortions.',
  entityClass: 'creature',
  biomes: ['void_rift'],
  textureKey: 'creature_void_stalker',
  color: 0x2a0050, // Very dark purple
  lootTableId: 'loot_creature_void_stalker',
  behavior: 'predator',
  baseHealth: 280, // Tier IV predator
  levelRange: [22, 32],
  baseXp: 110,
  respawnSeconds: 720,
};

// ===== TIER IV: MANIAC (Extreme threat) =====

export const CREATURE_DIMENSIONAL_ABERRATION: CreatureDefinition = {
  id: 'creature_dimensional_aberration',
  displayName: 'Dimensional Aberration',
  description: 'Massive entity driven mad by prolonged exposure to dimensional instability. Attacks anything it perceives through its fractured awareness.',
  entityClass: 'creature',
  biomes: ['void_rift'],
  textureKey: 'creature_dimensional_aberration',
  color: 0x8800ff, // Bright void purple
  lootTableId: 'loot_creature_dimensional_aberration',
  behavior: 'maniac',
  baseHealth: 320, // Tier IV maniac: 7-8 hits with Tier III gear
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
```

**Health values follow Phase 81 balance targets:**
- Tier II: 120-160 HP (4-5 hits)
- Tier III: 180-220 HP (5-6 hits)
- Tier IV: 240-280 HP (7-8 hits) for regular creatures
- Tier IV Maniac: 300-320 HP (7-8 hits with Tier III gear)

**Behavioral distribution:**
- Bioluminescent Depths (Tier II): 2 herbivores, 1 omnivore, 0 predators (safer)
- Crystalline Wastes (Tier III): 1 herbivore, 1 omnivore, 1 predator (balanced)
- Void Rift (Tier IV): 1 herbivore, 1 omnivore, 2 predators + 1 maniac (extreme danger)

**Source:** Phase 83 aquatic creature pattern (aquatic-creatures.ts), Phase 81 health balance formulas

### Pattern 2: Exotic Plant Definitions
**What:** Define 5 exotic plants with harvest yields appropriate to tier and theme
**When to use:** Providing gatherable resources in exotic biomes
**Example:**
```typescript
// packages/entities/src/definitions/exotic-plants.ts
import type { PlantDefinition } from '../types';

export const PLANT_REALITY_MOSS: PlantDefinition = {
  id: 'plant_reality_moss',
  displayName: 'Reality Moss',
  description: 'Bioluminescent moss with properties that defy conventional biology. Useful for exotic crafting.',
  entityClass: 'plant',
  biomes: ['bioluminescent_depths'],
  textureKey: 'plant_reality_moss',
  color: 0x00ff88, // Bright cyan-green
  lootTableId: 'loot_plant_reality_moss',
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.25 },
  ],
  respawnSeconds: 300,
};

export const PLANT_ECHO_BLOOM: PlantDefinition = {
  id: 'plant_echo_bloom',
  displayName: 'Echo Bloom',
  description: 'Flowering plant that exists in multiple temporal states simultaneously. Petals shimmer with afterimages.',
  entityClass: 'plant',
  biomes: ['bioluminescent_depths', 'void_rift'],
  textureKey: 'plant_echo_bloom',
  color: 0x4488ff, // Blue-purple
  lootTableId: 'loot_plant_echo_bloom',
  harvestYield: [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_temporal_compound', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 420,
};

export const PLANT_TEMPORAL_FUNGUS: PlantDefinition = {
  id: 'plant_temporal_fungus',
  displayName: 'Temporal Fungus',
  description: 'Fungal growth found in dimensionally unstable areas. Spores exhibit non-linear aging.',
  entityClass: 'plant',
  biomes: ['bioluminescent_depths'],
  textureKey: 'plant_temporal_fungus',
  color: 0x9966ff, // Purple
  lootTableId: 'loot_plant_temporal_fungus',
  harvestYield: [
    { itemId: 'world_fungal_spore_cluster', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_temporal_compound', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  respawnSeconds: 360,
};

export const PLANT_VOID_VINE: PlantDefinition = {
  id: 'plant_void_vine',
  displayName: 'Void Vine',
  description: 'Parasitic vine that feeds on dimensional tears. Partially phases through solid matter.',
  entityClass: 'plant',
  biomes: ['void_rift'],
  textureKey: 'plant_void_vine',
  color: 0x4a0080, // Deep purple
  lootTableId: 'loot_plant_void_vine',
  harvestYield: [
    { itemId: 'world_organic_material_rare', minAmount: 2, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.35 },
  ],
  respawnSeconds: 540,
};

export const PLANT_NULL_GRASS: PlantDefinition = {
  id: 'plant_null_grass',
  displayName: 'Null Grass',
  description: 'Crystalline pseudo-grass that grows in mineral-rich anomaly zones. Sharp but valuable.',
  entityClass: 'plant',
  biomes: ['crystalline_wastes', 'void_rift'],
  textureKey: 'plant_null_grass',
  color: 0xb0e0e6, // Pale cyan
  lootTableId: 'loot_plant_null_grass',
  harvestYield: [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 480,
};

export const ALL_EXOTIC_PLANTS: readonly PlantDefinition[] = [
  PLANT_REALITY_MOSS,
  PLANT_ECHO_BLOOM,
  PLANT_TEMPORAL_FUNGUS,
  PLANT_VOID_VINE,
  PLANT_NULL_GRASS,
];
```

**Item ID constraints:** All harvest yields reference EXISTING items from packages/items:
- world_organic_material_common (Tier I-II)
- world_organic_material_rare (Tier II-III)
- world_fungal_spore_cluster (existing Fungal Forest item)
- reagent_biogenic_catalyst (existing reagent)
- reagent_temporal_compound (existing reagent)
- reagent_void_essence (existing reagent)
- reagent_crystalline_dust (existing reagent)

**Note:** Exotic-specific items (like 'world_reality_moss_extract' or 'world_dimensional_spore') will be added in Phase 86 item implementation. For entity definitions, use generic materials.

**Source:** Phase 83 aquatic plant pattern (aquatic-plants.ts lines 1-347)

### Pattern 3: Exotic Mineral Definitions
**What:** Define 5 exotic minerals with mining yields and tier requirements
**When to use:** Providing minable resources in exotic biomes
**Example:**
```typescript
// packages/entities/src/definitions/exotic-minerals.ts
import type { MineralDefinition } from '../types';

export const MINERAL_VOID_CRYSTAL_NODE: MineralDefinition = {
  id: 'mineral_void_crystal_node',
  displayName: 'Void Crystal Node',
  description: 'Rare crystalline formation found only in Void Rifts. Internal structure defies normal physics.',
  entityClass: 'mineral',
  biomes: ['void_rift'],
  textureKey: 'mineral_void_crystal_node',
  color: 0x8800ff, // Bright void purple
  lootTableId: 'loot_mineral_void_crystal_node',
  miningYield: [
    { itemId: 'world_void_crystal', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  requiredTier: 4,
  respawnSeconds: 720,
  rarity: 'exotic',
};

export const MINERAL_ANOMALY_SHARD: MineralDefinition = {
  id: 'mineral_anomaly_shard',
  displayName: 'Anomaly Shard',
  description: 'Crystallized dimensional distortion. Valuable to researchers studying the Anomaly phenomenon.',
  entityClass: 'mineral',
  biomes: ['void_rift', 'bioluminescent_depths'],
  textureKey: 'mineral_anomaly_shard',
  color: 0x6a00a0, // Bright purple
  lootTableId: 'loot_mineral_anomaly_shard',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 1, chance: 0.25 },
  ],
  requiredTier: 3,
  respawnSeconds: 540,
  rarity: 'rare',
};

export const MINERAL_DIMENSIONAL_ORE: MineralDefinition = {
  id: 'mineral_dimensional_ore',
  displayName: 'Dimensional Ore',
  description: 'Metallic ore exposed by dimensional rifts. Contains trace amounts of exotic matter.',
  entityClass: 'mineral',
  biomes: ['void_rift'],
  textureKey: 'mineral_dimensional_ore',
  color: 0x4a0080, // Deep purple
  lootTableId: 'loot_mineral_dimensional_ore',
  miningYield: [
    { itemId: 'world_void_crystal', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  requiredTier: 4,
  respawnSeconds: 600,
};

export const MINERAL_NULL_STONE: MineralDefinition = {
  id: 'mineral_null_stone',
  displayName: 'Null Stone',
  description: 'Dense crystalline stone from Crystalline Wastes. Absorbs energy rather than conducting it.',
  entityClass: 'mineral',
  biomes: ['crystalline_wastes'],
  textureKey: 'mineral_null_stone',
  color: 0xb0e0e6, // Pale cyan
  lootTableId: 'loot_mineral_null_stone',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 2, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 2, chance: 0.4 },
  ],
  requiredTier: 3,
  respawnSeconds: 480,
};

export const MINERAL_PHASE_MINERAL: MineralDefinition = {
  id: 'mineral_phase_mineral',
  displayName: 'Phase Mineral',
  description: 'Mineral deposit that exists in multiple temporal states. Difficult to extract consistently.',
  entityClass: 'mineral',
  biomes: ['bioluminescent_depths', 'crystalline_wastes'],
  textureKey: 'mineral_phase_mineral',
  color: 0x4488ff, // Blue-purple
  lootTableId: 'loot_mineral_phase_mineral',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_temporal_compound', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  requiredTier: 2,
  respawnSeconds: 420,
};

export const ALL_EXOTIC_MINERALS: readonly MineralDefinition[] = [
  MINERAL_VOID_CRYSTAL_NODE,
  MINERAL_ANOMALY_SHARD,
  MINERAL_DIMENSIONAL_ORE,
  MINERAL_NULL_STONE,
  MINERAL_PHASE_MINERAL,
];
```

**Tier requirements:**
- Tier II (Bioluminescent Depths): requiredTier: 2
- Tier III (Crystalline Wastes): requiredTier: 3
- Tier IV (Void Rift): requiredTier: 4

**Item ID references (verified existing):**
- world_void_crystal (Anomaly Zone material, already exists)
- world_crystal_fragment (existing epic world item)
- reagent_void_essence (existing reagent)
- reagent_quantum_residue (existing Anomaly Zone reagent)
- reagent_crystalline_dust (existing reagent)
- reagent_temporal_compound (existing reagent)
- world_organic_material_rare (generic material)

**Source:** Phase 83 aquatic mineral pattern (aquatic-minerals.ts lines 357-451)

### Pattern 4: Exotic Artifact Definitions
**What:** Define 4 exotic artifacts as one-time discoveries
**When to use:** Providing rare discoverable content in exotic biomes
**Example:**
```typescript
// packages/entities/src/definitions/exotic-artifacts.ts
import type { ArtifactDefinition } from '../types';

export const ARTIFACT_ANOMALY_CORE: ArtifactDefinition = {
  id: 'artifact_anomaly_core',
  displayName: 'Anomaly Core',
  description: 'Stable anomaly formation crystallized into portable form. Pulses with dimensional energy.',
  entityClass: 'artifact',
  biomes: ['void_rift'],
  textureKey: 'artifact_anomaly_core',
  color: 0x8800ff, // Bright void purple
  lootTableId: 'loot_artifact_anomaly_core',
  respawns: false,
  rarity: 'legendary',
};

export const ARTIFACT_DIMENSIONAL_FRAGMENT: ArtifactDefinition = {
  id: 'artifact_dimensional_fragment',
  displayName: 'Dimensional Fragment',
  description: 'Piece of reality torn loose by dimensional instability. Purpose unknown, value immense.',
  entityClass: 'artifact',
  biomes: ['void_rift', 'crystalline_wastes'],
  textureKey: 'artifact_dimensional_fragment',
  color: 0x6a00a0, // Bright purple
  lootTableId: 'loot_artifact_dimensional_fragment',
  respawns: false,
  rarity: 'exotic',
};

export const ARTIFACT_ECHO_RECORD: ArtifactDefinition = {
  id: 'artifact_echo_record',
  displayName: 'Echo Record',
  description: 'Temporal recording preserved in crystalline matrix. Replays moments from the past on loop.',
  entityClass: 'artifact',
  biomes: ['bioluminescent_depths', 'crystalline_wastes'],
  textureKey: 'artifact_echo_record',
  color: 0x4488ff, // Blue-purple
  lootTableId: 'loot_artifact_echo_record',
  respawns: false,
  rarity: 'rare',
};

export const ARTIFACT_VOID_RELIC: ArtifactDefinition = {
  id: 'artifact_void_relic',
  displayName: 'Void Relic',
  description: 'Ancient artifact recovered from Void Rift. Predates colonial settlement, possibly predates the Ancients.',
  entityClass: 'artifact',
  biomes: ['void_rift'],
  textureKey: 'artifact_void_relic',
  color: 0x4a0080, // Deep purple
  lootTableId: 'loot_artifact_void_relic',
  respawns: false,
  rarity: 'legendary',
};

export const ALL_EXOTIC_ARTIFACTS: readonly ArtifactDefinition[] = [
  ARTIFACT_ANOMALY_CORE,
  ARTIFACT_DIMENSIONAL_FRAGMENT,
  ARTIFACT_ECHO_RECORD,
  ARTIFACT_VOID_RELIC,
];
```

**Rarity distribution:**
- legendary: 2 artifacts (Anomaly Core, Void Relic) — Tier IV content
- exotic: 1 artifact (Dimensional Fragment) — Tier III-IV crossover
- rare: 1 artifact (Echo Record) — Tier II-III crossover

**Source:** Phase 83 aquatic artifact pattern (aquatic-artifacts.ts lines 460-507)

### Pattern 5: Biome Spawn Configuration
**What:** Configure spawn tables for exotic biomes in BIOME_SPAWN_CONFIGS
**When to use:** Determining which entities spawn in which exotic biomes
**Example:**
```typescript
// packages/world-gen/src/generation/spawn.ts (extend existing config)

const BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig> = {
  // ... existing 13 biomes

  bioluminescent_depths: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_ECHO_DRIFTER, weight: 8, minLevel: 6, maxLevel: 14 },
      { id: ENTITY_IDS.CREATURE_PHASE_GRAZER, weight: 7, minLevel: 7, maxLevel: 15 },
      { id: ENTITY_IDS.CREATURE_REALITY_SCAVENGER, weight: 5, minLevel: 8, maxLevel: 16 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_ANOMALY_SHARD, weight: 6, rarity: 2 },
      { id: ENTITY_IDS.MINERAL_PHASE_MINERAL, weight: 8, rarity: 1 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_REALITY_MOSS, weight: 10 },
      { id: ENTITY_IDS.PLANT_ECHO_BLOOM, weight: 6 },
      { id: ENTITY_IDS.PLANT_TEMPORAL_FUNGUS, weight: 8 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_ECHO_RECORD, weight: 10, rarity: 'rare' },
    ],
    creatureDensity: 5,  // Tier II hazardous (similar to kelp_forests)
    mineralDensity: 4,
    plantDensity: 8,     // High plant density (bioluminescent flora theme)
    artifactDensity: 1,
  },

  crystalline_wastes: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_NULL_FEEDER, weight: 6, minLevel: 12, maxLevel: 20 },
      { id: ENTITY_IDS.CREATURE_DIMENSIONAL_HUNTER, weight: 5, minLevel: 13, maxLevel: 22 },
      { id: ENTITY_IDS.CREATURE_RIFT_HUNTER, weight: 4, minLevel: 14, maxLevel: 24 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_NULL_STONE, weight: 10, rarity: 1 },
      { id: ENTITY_IDS.MINERAL_PHASE_MINERAL, weight: 6, rarity: 2 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_NULL_GRASS, weight: 8 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_DIMENSIONAL_FRAGMENT, weight: 6, rarity: 'exotic' },
      { id: ENTITY_IDS.ARTIFACT_ECHO_RECORD, weight: 8, rarity: 'rare' },
    ],
    creatureDensity: 3,  // Tier III hostile (sparse but dangerous)
    mineralDensity: 10,  // VERY high mineral density (crystal theme)
    plantDensity: 1,     // Minimal plants (harsh crystalline environment)
    artifactDensity: 1,
  },

  void_rift: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_VOID_GRAZER, weight: 4, minLevel: 18, maxLevel: 28 },
      { id: ENTITY_IDS.CREATURE_ANOMALY_SCAVENGER, weight: 3, minLevel: 20, maxLevel: 30 },
      { id: ENTITY_IDS.CREATURE_VOID_STALKER, weight: 2, minLevel: 22, maxLevel: 32 },
      { id: ENTITY_IDS.CREATURE_DIMENSIONAL_ABERRATION, weight: 1, minLevel: 24, maxLevel: 35 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_VOID_CRYSTAL_NODE, weight: 6, rarity: 3 },
      { id: ENTITY_IDS.MINERAL_ANOMALY_SHARD, weight: 8, rarity: 2 },
      { id: ENTITY_IDS.MINERAL_DIMENSIONAL_ORE, weight: 10, rarity: 2 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_VOID_VINE, weight: 6 },
      { id: ENTITY_IDS.PLANT_ECHO_BLOOM, weight: 4 },
      { id: ENTITY_IDS.PLANT_NULL_GRASS, weight: 5 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_ANOMALY_CORE, weight: 1, rarity: 'legendary' },
      { id: ENTITY_IDS.ARTIFACT_DIMENSIONAL_FRAGMENT, weight: 3, rarity: 'exotic' },
      { id: ENTITY_IDS.ARTIFACT_VOID_RELIC, weight: 1, rarity: 'legendary' },
    ],
    creatureDensity: 2,  // Tier IV extreme (very sparse, very dangerous)
    mineralDensity: 8,   // High value resources (risk/reward)
    plantDensity: 2,     // Minimal plants (reality distortion harsh)
    artifactDensity: 1,
  },
};
```

**Density philosophy:**
- **Bioluminescent Depths (Tier II):** High plant density (8), moderate creatures (5), moderate minerals (4) — flora-focused biome
- **Crystalline Wastes (Tier III):** Very high mineral density (10), low plants (1), moderate creatures (3) — mineral-focused biome
- **Void Rift (Tier IV):** Balanced sparse (2/8/2 creatures/minerals/plants) — extreme danger zone with high-value rewards

**Source:** Phase 83 aquatic spawn configuration pattern (spawn.ts lines 517-563)

### Pattern 6: Creature Loot Tables
**What:** Define what exotic creatures drop when killed
**When to use:** Configuring loot rewards for exotic creatures
**Example:**
```typescript
// packages/game-logic/src/loot/creature-loot.ts (extend existing map)

export const CREATURE_LOOT_TABLES = new Map<string, readonly HarvestYield[]>([
  // ... existing loot tables

  // Tier II — Bioluminescent Depths (Herbivore, levels 6-14)
  ['loot_creature_echo_drifter', [
    { itemId: 'world_organic_material_common', minAmount: 2, maxAmount: 3, chance: 0.85 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 2, chance: 0.35 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ]],

  // Tier II — Bioluminescent Depths (Herbivore, levels 7-15)
  ['loot_creature_phase_grazer', [
    { itemId: 'world_organic_material_common', minAmount: 2, maxAmount: 3, chance: 0.85 },
    { itemId: 'reagent_temporal_compound', minAmount: 1, maxAmount: 1, chance: 0.25 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.12 },
  ]],

  // Tier II — Bioluminescent Depths (Omnivore, levels 8-16)
  ['loot_creature_reality_scavenger', [
    { itemId: 'world_organic_material_common', minAmount: 2, maxAmount: 3, chance: 0.8 },
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 1, chance: 0.15 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ]],

  // Tier III — Crystalline Wastes (Herbivore, levels 12-20)
  ['loot_creature_null_feeder', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.8 },
    { itemId: 'reagent_crystalline_dust', minAmount: 2, maxAmount: 3, chance: 0.4 },
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ]],

  // Tier III — Crystalline Wastes (Omnivore, levels 13-22)
  ['loot_creature_dimensional_hunter', [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.75 },
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 1, chance: 0.25 },
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.06 },
  ]],

  // Tier III — Crystalline Wastes (Predator, levels 14-24)
  ['loot_creature_rift_hunter', [
    { itemId: 'world_organic_material_rare', minAmount: 2, maxAmount: 3, chance: 0.85 },
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 2, chance: 0.35 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 2, chance: 0.3 },
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.08 },
  ]],

  // Tier IV — Void Rift (Herbivore, levels 18-28)
  ['loot_creature_void_grazer', [
    { itemId: 'world_organic_material_rare', minAmount: 2, maxAmount: 3, chance: 0.85 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 2, chance: 0.35 },
    { itemId: 'world_void_crystal', minAmount: 1, maxAmount: 1, chance: 0.12 },
  ]],

  // Tier IV — Void Rift (Omnivore, levels 20-30)
  ['loot_creature_anomaly_scavenger', [
    { itemId: 'world_organic_material_rare', minAmount: 2, maxAmount: 3, chance: 0.8 },
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 2, chance: 0.3 },
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ]],

  // Tier IV — Void Rift (Predator, levels 22-32)
  ['loot_creature_void_stalker', [
    { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 2, chance: 0.8 },
    { itemId: 'world_void_crystal', minAmount: 1, maxAmount: 2, chance: 0.4 },
    { itemId: 'reagent_void_essence', minAmount: 2, maxAmount: 3, chance: 0.35 },
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 2, chance: 0.25 },
  ]],

  // Tier IV — Void Rift (Maniac, levels 24-35)
  ['loot_creature_dimensional_aberration', [
    { itemId: 'world_organic_material_epic', minAmount: 3, maxAmount: 4, chance: 0.9 },
    { itemId: 'world_void_crystal', minAmount: 2, maxAmount: 3, chance: 0.5 },
    { itemId: 'reagent_void_essence', minAmount: 2, maxAmount: 4, chance: 0.5 },
    { itemId: 'reagent_quantum_residue', minAmount: 2, maxAmount: 3, chance: 0.4 },
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 2, chance: 0.3 },
  ]],
]);
```

**Loot tier conventions:**
- Tier II: Common 0.75-0.85, Rare 0.1-0.25, Epic 0.05-0.12
- Tier III: Rare 0.7-0.85, Epic 0.05-0.15
- Tier IV: Rare 0.8-0.85, Epic 0.1-0.2, Exotic 0.05-0.15
- Maniac (Tier IV): Epic 0.9, multiple high-value drops

**Source:** Phase 83 aquatic loot tables pattern (creature-loot.ts lines 578-647)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Entity ID collision checking | Manual string comparison | ENTITY_IDS constant with TypeScript const assertion | Compiler catches duplicate IDs |
| Loot table balancing | Arbitrary drop rates | Follow existing tier patterns (common: 0.7-0.85, rare: 0.1-0.25, epic: 0.05-0.12) | Consistency across 58+ entities |
| Creature health values | Trial-and-error HP | Phase 81 tier formulas (Tier II: 120-160, Tier III: 180-220, Tier IV: 240-320) | Ensures 4-8 hit TTK target |
| Spawn density tuning | Eyeball numbers | Biome theme-based densities (flora-focused: high plants, crystal-focused: high minerals) | Thematic consistency |
| Item ID references | Hardcoded strings | Verify item exists in packages/items before use | Prevents missing item errors |

**Key insight:** Phase 83 proved the entity system is fully mature. Adding 14 exotic entities is mechanical work following proven patterns. No architectural decisions needed.

## Common Pitfalls

### Pitfall 1: Using Non-Existent Items in Loot Tables
**What goes wrong:** Referencing exotic-specific items that don't exist yet (e.g., 'world_dimensional_shard' or 'reagent_anomaly_extract').
**Why it happens:** Assumption that Phase 86 items exist before entity definitions.
**How to avoid:** Phase 86 entity implementation comes BEFORE Phase 86 item implementation. Use only VERIFIED existing items:
- world_void_crystal (already exists)
- world_crystal_fragment (already exists)
- world_organic_material_common/rare/epic (already exists)
- reagent_void_essence (already exists)
- reagent_quantum_residue (already exists)
- reagent_crystalline_dust (already exists)
- reagent_temporal_compound (already exists)
- reagent_biogenic_catalyst (already exists)

**Verification step:**
```bash
# Before using any itemId, verify it exists:
grep "id: 'world_void_crystal'" packages/items/src/definitions/*.ts
# Should return: world-items.ts with WORLD_VOID_CRYSTAL definition
```

### Pitfall 2: Forgetting to Update Index Exports
**What goes wrong:** New exotic entity files created but not exported from packages/entities/src/definitions/index.ts. Entities defined but invisible.
**Why it happens:** File creation separate from export registration.
**How to avoid:** After creating exotic-creatures.ts, exotic-plants.ts, exotic-minerals.ts, exotic-artifacts.ts, IMMEDIATELY update index.ts:

```typescript
// packages/entities/src/definitions/index.ts
import { ALL_EXOTIC_CREATURES } from './exotic-creatures';
import { ALL_EXOTIC_PLANTS } from './exotic-plants';
import { ALL_EXOTIC_MINERALS } from './exotic-minerals';
import { ALL_EXOTIC_ARTIFACTS } from './exotic-artifacts';

export const ALL_ENTITIES: readonly EntityDefinition[] = [
  ...ALL_CREATURES,
  ...ALL_PLANTS,
  ...ALL_MINERALS,
  ...ALL_ARTIFACTS,
  ...ALL_AQUATIC_CREATURES,
  ...ALL_AQUATIC_PLANTS,
  ...ALL_AQUATIC_MINERALS,
  ...ALL_AQUATIC_ARTIFACTS,
  ...ALL_EXOTIC_CREATURES,  // NEW
  ...ALL_EXOTIC_PLANTS,     // NEW
  ...ALL_EXOTIC_MINERALS,   // NEW
  ...ALL_EXOTIC_ARTIFACTS,  // NEW
];

// Export exotic definitions
export * from './exotic-creatures';
export * from './exotic-plants';
export * from './exotic-minerals';
export * from './exotic-artifacts';
```

### Pitfall 3: Creature Health Not Following Phase 81 Formulas
**What goes wrong:** Exotic creatures too weak or too strong compared to tier expectations.
**Why it happens:** Not referencing Phase 81 rebalancing work.
**How to avoid:** Use exact tier targets:
- Tier II: 120-160 HP (4-5 hits)
- Tier III: 180-220 HP (5-6 hits)
- Tier IV: 240-280 HP (7-8 hits) for regular creatures
- Tier IV Maniac: 300-320 HP (7-8 hits with Tier III gear)

**Verification test:**
```typescript
// Add to entity tests
describe('Exotic Creature Health Balance', () => {
  it('Tier II exotic creatures have 120-160 HP', () => {
    expect(CREATURE_ECHO_DRIFTER.baseHealth).toBeGreaterThanOrEqual(120);
    expect(CREATURE_ECHO_DRIFTER.baseHealth).toBeLessThanOrEqual(160);
  });

  it('Tier III exotic creatures have 180-220 HP', () => {
    expect(CREATURE_NULL_FEEDER.baseHealth).toBeGreaterThanOrEqual(180);
    expect(CREATURE_NULL_FEEDER.baseHealth).toBeLessThanOrEqual(220);
  });

  it('Tier IV exotic creatures have 240-280 HP', () => {
    expect(CREATURE_VOID_STALKER.baseHealth).toBeGreaterThanOrEqual(240);
    expect(CREATURE_VOID_STALKER.baseHealth).toBeLessThanOrEqual(280);
  });

  it('Tier IV maniac has 300-320 HP', () => {
    expect(CREATURE_DIMENSIONAL_ABERRATION.baseHealth).toBeGreaterThanOrEqual(300);
    expect(CREATURE_DIMENSIONAL_ABERRATION.baseHealth).toBeLessThanOrEqual(320);
  });
});
```

### Pitfall 4: Spawn Density Not Matching Biome Theme
**What goes wrong:** Bioluminescent Depths feels empty despite being a "flora-focused" biome, or Crystalline Wastes lacks minerals.
**Why it happens:** Copy-paste spawn configs without adjustment.
**How to avoid:** Align density with biome themes:
- **Bioluminescent Depths:** plantDensity: 8 (high flora), creatureDensity: 5, mineralDensity: 4
- **Crystalline Wastes:** mineralDensity: 10 (very high crystals), plantDensity: 1 (sparse), creatureDensity: 3
- **Void Rift:** Balanced sparse (creatureDensity: 2, mineralDensity: 8, plantDensity: 2) — extreme danger, high rewards

### Pitfall 5: Confusing Exotic Biomes with Anomaly Zones (Lore)
**What goes wrong:** Treating exotic biomes as requiring physics-breaking mechanics or temporal loops.
**Why it happens:** Lore describes "Anomaly Zones" as Tier IV extreme content with physics changes. Exotic biomes REFERENCE anomaly themes but use standard gameplay.
**How to avoid:** Exotic biomes (void_rift, crystalline_wastes, bioluminescent_depths) are NORMAL biomes with:
- Standard tile blocking
- Standard creature AI (herbivore/omnivore/predator/maniac)
- Thematic descriptions (e.g., "phases through reality") as FLAVOR TEXT, not mechanics
- Anomaly Zones (future content) would require actual physics changes

**Clarification:**
```
Exotic Biomes (Phase 86):
- void_rift: Tier IV NORMAL biome with void theming
- crystalline_wastes: Tier III NORMAL biome with crystal theming
- bioluminescent_depths: Tier II NORMAL biome with bioluminescent theming
- Mechanics: standard tiles, standard AI, thematic visuals

Anomaly Zones (lore, future):
- Actual physics changes (time stutters, spatial tears)
- Future content (not Phase 86 scope)
```

## Code Examples

### Entity Registry Integration
```typescript
// packages/entities/src/definitions/index.ts
export const ALL_ENTITIES: readonly EntityDefinition[] = [
  ...ALL_CREATURES,
  ...ALL_PLANTS,
  ...ALL_MINERALS,
  ...ALL_ARTIFACTS,
  ...ALL_AQUATIC_CREATURES,
  ...ALL_AQUATIC_PLANTS,
  ...ALL_AQUATIC_MINERALS,
  ...ALL_AQUATIC_ARTIFACTS,
  // NEW: Exotic entities
  ...ALL_EXOTIC_CREATURES,
  ...ALL_EXOTIC_PLANTS,
  ...ALL_EXOTIC_MINERALS,
  ...ALL_EXOTIC_ARTIFACTS,
];

// ENTITY_IDS constant
export const ENTITY_IDS = {
  // ... existing IDs

  // Exotic creatures
  CREATURE_ECHO_DRIFTER: 'creature_echo_drifter',
  CREATURE_PHASE_GRAZER: 'creature_phase_grazer',
  CREATURE_REALITY_SCAVENGER: 'creature_reality_scavenger',
  CREATURE_NULL_FEEDER: 'creature_null_feeder',
  CREATURE_DIMENSIONAL_HUNTER: 'creature_dimensional_hunter',
  CREATURE_RIFT_HUNTER: 'creature_rift_hunter',
  CREATURE_VOID_GRAZER: 'creature_void_grazer',
  CREATURE_ANOMALY_SCAVENGER: 'creature_anomaly_scavenger',
  CREATURE_VOID_STALKER: 'creature_void_stalker',
  CREATURE_DIMENSIONAL_ABERRATION: 'creature_dimensional_aberration',

  // Exotic plants
  PLANT_REALITY_MOSS: 'plant_reality_moss',
  PLANT_ECHO_BLOOM: 'plant_echo_bloom',
  PLANT_TEMPORAL_FUNGUS: 'plant_temporal_fungus',
  PLANT_VOID_VINE: 'plant_void_vine',
  PLANT_NULL_GRASS: 'plant_null_grass',

  // Exotic minerals
  MINERAL_VOID_CRYSTAL_NODE: 'mineral_void_crystal_node',
  MINERAL_ANOMALY_SHARD: 'mineral_anomaly_shard',
  MINERAL_DIMENSIONAL_ORE: 'mineral_dimensional_ore',
  MINERAL_NULL_STONE: 'mineral_null_stone',
  MINERAL_PHASE_MINERAL: 'mineral_phase_mineral',

  // Exotic artifacts
  ARTIFACT_ANOMALY_CORE: 'artifact_anomaly_core',
  ARTIFACT_DIMENSIONAL_FRAGMENT: 'artifact_dimensional_fragment',
  ARTIFACT_ECHO_RECORD: 'artifact_echo_record',
  ARTIFACT_VOID_RELIC: 'artifact_void_relic',
} as const;
```

### Behavioral Distribution Across Tiers
```typescript
// Distribution follows balance and lore patterns:
// - Tier II (Bioluminescent Depths): 2 herbivores, 1 omnivore — safer exploration
// - Tier III (Crystalline Wastes): 1 herbivore, 1 omnivore, 1 predator — balanced danger
// - Tier IV (Void Rift): 1 herbivore, 1 omnivore, 2 predators + 1 maniac — extreme threat
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual entity registration | EntityRegistry auto-registers on module load | Phase 33 | New entities automatically available system-wide |
| Hardcoded entity IDs | ENTITY_IDS constant with type safety | Phase 33 | Compile-time validation prevents typo bugs |
| Single creatures.ts file | Separate files per content expansion | Phase 55, Phase 83 | Easier code review, clearer content scope |
| Arbitrary health values | Tier-based health formulas | Phase 81 | Consistent TTK (4-8 hits) across all creature tiers |
| Creatures and minerals only | Full support for plants and artifacts | Phase 83 | Complete entity type coverage |

**Deprecated/outdated:**
- None for Phase 86. All systems current and proven.

## Open Questions

1. **Should exotic plants have unique respawn timing compared to terrestrial/aquatic?**
   - What we know: Exotic biomes are higher tier (II-IV), implying harder-to-reach content.
   - What's unclear: Should respawn times be longer to reflect scarcity, or standard to match other biomes?
   - Recommendation: Use standard respawn timing (5-10 minutes like aquatic). Scarcity comes from biome rarity (Void Rift is rare in world generation), not respawn delay.

2. **Do artifacts need exotic-specific loot rewards?**
   - What we know: Artifacts are one-time discoveries. Existing artifacts give generic high-value items.
   - What's unclear: Should exotic artifacts drop exotic-themed items.
   - Recommendation: Use generic high-value items for Phase 86 entity definitions (world_ancient_fragment, reagent_void_essence). Phase 86 items can add exotic-specific artifact rewards when implemented.

3. **Should Dimensional Aberration (maniac) have special aggro behavior?**
   - What we know: Maniac behavior means "attacks anything perceived". Description mentions "fractured awareness."
   - What's unclear: Should it have wider aggro range or different detection?
   - Recommendation: Keep existing maniac behavior (standard aggro range, player-focused). "Fractured awareness" is lore flavor, not mechanical difference.

4. **Are plant/mineral textures required for Phase 86 completion?**
   - What we know: Entities use color fallbacks if textureKey missing. Phase 84 added exotic tiles with colors.
   - What's unclear: If completion requires actual sprite assets.
   - Recommendation: Use color fallbacks for Phase 86. Success criteria specify entities are "gatherable" and "discoverable" (functional), not "have sprites" (visual polish). Sprites can be added later without code changes.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis:
  - `/packages/entities/src/definitions/creatures.ts` — 17 existing terrestrial creatures
  - `/packages/entities/src/definitions/aquatic-creatures.ts` — 10 aquatic creatures (Phase 83)
  - `/packages/entities/src/definitions/plants.ts` — 15 existing plants
  - `/packages/entities/src/definitions/aquatic-plants.ts` — 5 aquatic plants (Phase 83)
  - `/packages/entities/src/definitions/minerals.ts` — 15 existing minerals
  - `/packages/entities/src/definitions/aquatic-minerals.ts` — 5 aquatic minerals (Phase 83)
  - `/packages/entities/src/definitions/artifacts.ts` — 5 existing terrestrial artifacts
  - `/packages/entities/src/definitions/aquatic-artifacts.ts` — 3 aquatic artifacts (Phase 83)
  - `/packages/entities/src/types.ts` — Entity definition interfaces
  - `/packages/world-gen/src/generation/spawn.ts` — BIOME_SPAWN_CONFIGS with plant/artifact support (Phase 83)
  - `/packages/game-logic/src/loot/creature-loot.ts` — Loot table conventions
  - `/packages/items/src/definitions/world-items.ts` — Existing item IDs for loot references
- `.planning/phases/083-aquatic-entity-population/83-RESEARCH.md` — Phase 83 research (identical pattern)
- `.planning/phases/084-exotic-biome-foundation/84-RESEARCH.md` — Phase 84 exotic biome context
- `.planning/phases/081-combat-balancing-quest-audit/81-03-PLAN.md` — Creature health balance targets
- `/lore/world-bible.md` — Anomaly Zones lore (distinguishing from exotic biomes), biome tier classifications

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — ENT-04, ENT-05, ENT-06, CREA-05-08 requirements
- Phase 55 content expansion patterns (rare creature variants)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Zero new dependencies, all systems proven in Phase 83 (aquatic entities)
- Architecture: HIGH — Direct reuse of Phase 83 patterns, 58 existing entities prove system maturity
- Pitfalls: HIGH — Phase 81 health targets documented, item ID verification clear, lore distinction clear

**Research date:** 2026-02-24
**Valid until:** ~90 days (entity system stable, content definition patterns unchanging)

**Key validation points:**
- Entity definitions follow CreatureDefinition/PlantDefinition/MineralDefinition/ArtifactDefinition interfaces (confirmed: types.ts lines 24-77)
- ENTITY_IDS uses const assertion for type safety (confirmed: definitions/index.ts line 33)
- Spawn system supports plants and artifacts (confirmed: Phase 83 implementation complete)
- Phase 81 health targets documented with test coverage (confirmed: 81-03-PLAN.md)
- Lore confirms exotic biomes are NORMAL biomes with void/crystal/bioluminescent theming (confirmed: world-bible.md lines 266-283 distinguish Anomaly Zones from standard biomes)
- Item IDs world_void_crystal, reagent_void_essence, reagent_quantum_residue verified to exist (confirmed: world-items.ts lines 8-22)
