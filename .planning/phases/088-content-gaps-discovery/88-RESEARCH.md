# Phase 88: Content Gaps & Discovery - Research

**Researched:** 2026-02-24
**Domain:** Entity definition system, discovery systems integration, content completeness audit
**Confidence:** HIGH

## Summary

Phase 88 fills remaining content gaps in existing biomes (fungal_forest, miasma_marshes, toxic_wastes, volcanic_reaches, glacial_expanse, starfall_crater, ancient_ruins) and integrates all new content with discovery systems (zone mastery, lore fragments, POI types). This is a **completion phase** — no new systems, only content population and integration with existing Phase 76-80 discovery infrastructure.

The codebase already has well-established patterns for entity definitions (packages/entities), lore fragments (packages/lore), zone mastery objectives (apps/game-server/src/game/zone-mastery.service.ts), and POI generation (packages/world-gen/src/generation/pois.ts). Phase 88 follows these patterns to achieve complete biome coverage.

**Primary recommendation:** Define missing entities following Phase 83/85/86 patterns (rare/epic resource variants, artifacts, creatures), create lore fragments following packages/lore/src/fragments pattern, and register POI weights in BIOME_POI_WEIGHTS. All systems already exist — this is pure content authoring.

## Standard Stack

### Core Systems (Already Implemented)

| System | Location | Purpose | Pattern Established By |
|--------|----------|---------|------------------------|
| Entity Registry | `packages/entities/src/definitions/` | Define minerals, plants, artifacts, creatures | Phase 78-79, 83, 85-86 |
| Lore Registry | `packages/lore/src/fragments/` | Define collectible lore fragments | Phase 80 |
| Zone Mastery | `apps/game-server/src/game/zone-mastery.service.ts` | Track biome-specific objectives | Phase 80 |
| POI Generation | `packages/world-gen/src/generation/pois.ts` | Procedurally place POIs in chunks | Phase 77 |
| Creature Loot | `packages/game-logic/src/loot/creature-loot.ts` | Define creature drop tables | Phase 78-79, 87 |

### Entity Definition Pattern

All entity definitions follow this TypeScript pattern:

```typescript
// packages/entities/src/definitions/plants.ts (example)
export const PLANT_RARE_FUNGI: PlantDefinition = {
  id: 'plant_rare_fungi',
  displayName: 'Rare Fungi',
  description: 'Luminescent mushroom cluster with exceptional bioactive compounds.',
  entityClass: 'plant',
  biomes: ['fungal_forest'],
  textureKey: 'plant_rare_fungi',
  color: 0xff44ff,
  lootTableId: 'loot_plant_rare_fungi',
  harvestYield: [
    { itemId: 'world_alien_flora_rare', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 2, chance: 0.4 },
  ],
  respawnSeconds: 600,
};
```

**Key fields:**
- `id`: Unique identifier (snake_case, prefixed with entity class)
- `biomes`: Array of BiomeType strings where entity spawns
- `lootTableId`: Reference to loot table definition
- `harvestYield`/`miningYield`: Item drops with quantities and chances
- `respawnSeconds`: Respawn timing (-1 for artifacts/one-time items)
- `rarity`: For artifacts ('rare', 'epic', 'legendary', 'exotic')

### Lore Fragment Pattern

```typescript
// packages/lore/src/fragments/biome-ecology.ts (new file needed)
export const BIOME_ECOLOGY_FRAGMENTS: readonly LoreFragment[] = [
  {
    id: 'lore_biome_fungal_forest_01',
    title: 'The Living Canopy',
    category: 'biome_ecology',
    content: `Multi-paragraph lore text (200-500 words) describing the biome's ecology, atmosphere, and mysteries...`,
    biome: 'fungal_forest',
    xpReward: 75,
  },
];
```

**Lore categories (from shared-types):**
- `world_history` - Colonial history, humanity's past
- `faction_lore` - Corporate factions and their agendas
- `ancient_tech` - Prior Inhabitants and their ruins
- `biome_ecology` - Biome-specific ecological and environmental lore

## Architecture Patterns

### Entity Registration Flow

```
packages/entities/src/definitions/
├── minerals.ts           # Existing minerals (void_crystal, prismatic_crystal, etc.)
├── plants.ts             # Existing plants (luminous_vine, void_fern, etc.)
├── artifacts.ts          # Existing artifacts (ancient_data_core, etc.)
├── creatures.ts          # Existing creatures (void_crawler, etc.)
├── aquatic-minerals.ts   # Phase 83 aquatic minerals
├── aquatic-plants.ts     # Phase 83 aquatic plants
├── aquatic-artifacts.ts  # Phase 83 aquatic artifacts
├── exotic-minerals.ts    # Phase 85 exotic minerals
├── exotic-plants.ts      # Phase 85 exotic plants
├── exotic-artifacts.ts   # Phase 85 exotic artifacts
└── index.ts              # EntityRegistry consolidates ALL_MINERALS, ALL_PLANTS, etc.
```

**Pattern for Phase 88:**
1. Add new entities to existing files (minerals.ts, plants.ts, artifacts.ts, creatures.ts)
2. Export in entity-specific ALL_* arrays
3. Import and spread in index.ts ALL_ENTITIES array
4. No new files needed — augment existing biome definitions

### Lore Integration Flow

```
packages/lore/src/
├── fragments/
│   ├── world-history.ts      # Existing (3 fragments)
│   ├── faction-lore.ts       # Existing (3 fragments)
│   ├── ancient-tech.ts       # Existing (3 fragments)
│   ├── biome-ecology.ts      # NEW — Phase 88 biome lore (6-10 fragments)
│   └── index.ts              # Export all fragment arrays
└── registry.ts               # LoreRegistry.getAll() consolidates
```

**Pattern for Phase 88:**
1. Create `biome-ecology.ts` with 6-10 fragments
2. Focus on aquatic (tidal_pools, kelp_forests, deep_trenches) and exotic (void_rift, crystalline_wastes, bioluminescent_depths) biomes
3. Export in fragments/index.ts
4. Import in registry.ts ALL_FRAGMENTS array

### POI Type Registration

POI types already defined in shared-types/src/game/poi.ts:

```typescript
export const POI_TYPES = ['anomaly', 'cache', 'landmark'] as const;
export type PoiType = typeof POI_TYPES[number];
```

**Biome-specific POI weights (packages/world-gen/src/generation/pois.ts):**

```typescript
const BIOME_POI_WEIGHTS: Record<BiomeType, Record<PoiType, number>> = {
  ancient_ruins: { anomaly: 10, cache: 5, landmark: 8 },
  crystal_caves: { anomaly: 8, cache: 3, landmark: 6 },
  // ... all biomes must have weights defined
};
```

**Current status:**
- All 16 biomes already have POI weights (verified in pois.ts lines 12-29)
- New biomes added in Phase 82-84 already configured
- No changes needed for Phase 88 — POI infrastructure complete

### Zone Mastery Objective Configuration

Zone mastery objectives are **auto-generated** by ZoneMasteryService based on MASTERY_TIER_REQUIREMENTS:

```typescript
// packages/shared-types/src/game/zone-mastery.ts
export const MASTERY_TIER_REQUIREMENTS: Record<MasteryTier, {
  pois: number;
  resources: number;
  kills: number;
}> = {
  bronze: { pois: 3, resources: 10, kills: 5 },
  silver: { pois: 7, resources: 30, kills: 15 },
  gold: { pois: 15, resources: 75, kills: 40 },
};
```

**How it works:**
1. Player enters new biome → ZoneMasteryService.updateObjective() called
2. If no active mastery exists for biome, service calls initializeZoneMastery()
3. Service creates objectives: discover_pois, gather_resources, kill_creatures
4. Objectives progress via event listeners (poi.discovered, resource.gathered, entity.killed)

**Pattern for Phase 88:**
- No configuration needed — objectives auto-initialize for all biomes
- Verify biome has entities (minerals, plants, creatures) for gather/kill objectives
- Verify biome has POI weights for discover objective

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Artifact rarity tiers | Custom rarity system | Existing rarity enum ('rare', 'epic', 'legendary', 'exotic') | Already integrated with color coding, loot systems, and discovery XP multipliers |
| Respawn timing | Custom timing logic | Existing respawnSeconds field with established patterns | 5-10 minutes for plants/minerals (300-600s), 3-7 minutes for creatures (180-420s), -1 for artifacts |
| Loot table IDs | Manual loot table creation | Convention: `loot_{entity_id}` | Loot tables created separately in packages/game-logic/src/loot/ |
| Biome assignment | Multi-biome spawn logic | biomes array field | Entities can spawn in multiple biomes, world-gen handles distribution |
| POI placement | Custom spawning algorithm | Existing generatePOIs() with noise-based density | Procedural placement ensures sparse, meaningful discoveries |
| Lore fragment discovery | Custom trigger system | Biome association via `biome` field | POIs with lore type auto-trigger fragment discovery |

**Key insight:** Phase 88 is pure content authoring — all systems exist. The risk is inventing new patterns when existing ones work. Follow the established conventions exactly.

## Common Pitfalls

### Pitfall 1: Inconsistent Entity Naming

**What goes wrong:** Entity IDs don't match file naming conventions or use inconsistent prefixes
**Why it happens:** Copy-paste errors or not reviewing existing entity IDs
**How to avoid:**
- Always prefix with entity class: `mineral_`, `plant_`, `artifact_`, `creature_`
- Use snake_case for all IDs
- Check existing definitions for naming patterns (e.g., `artifact_ancient_data_core`, not `artifact_AncientDataCore`)

**Warning signs:**
- TypeScript errors about duplicate IDs
- Entity not appearing in EntityRegistry.getAll()
- grep for ID returns unexpected results

### Pitfall 2: Missing Loot Table Integration

**What goes wrong:** Entity defined but lootTableId points to non-existent loot table
**Why it happens:** Entity definition created before loot table, or copy-paste with wrong ID
**How to avoid:**
- Use convention: `loot_{entity_id}` (e.g., `loot_plant_rare_fungi`)
- Create placeholder loot tables in packages/game-logic/src/loot/
- Test with grep: `grep -r "loot_plant_rare_fungi" packages/game-logic/src/loot/`

**Warning signs:**
- Game server logs show loot table lookup failures
- Entities drop nothing when harvested/killed
- Integration tests fail on loot resolution

### Pitfall 3: Biome-Lore Mismatch

**What goes wrong:** Lore fragment assigned to wrong biome or biome name misspelled
**Why it happens:** BiomeType is string union, no compile-time checking for lore fragment biome field
**How to avoid:**
- Copy biome names from packages/shared-types/src/game/biome.ts BiomeType union
- Verify with grep: `grep "fungal_forest" packages/shared-types/src/game/biome.ts`
- Use existing lore fragments as templates (packages/lore/src/fragments/)

**Warning signs:**
- Lore fragment never discovered in-game
- LoreRegistry.getBiomeFragments(biome) returns empty array
- Fragment shows in LoreRegistry.getAll() but not in biome-specific queries

### Pitfall 4: Rarity Creep

**What goes wrong:** Too many 'exotic' or 'legendary' entities, breaking progression balance
**Why it happens:** Wanting new content to feel "special" without considering ecosystem balance
**How to avoid:**
- Review existing rarity distribution: most entities are common/rare, few are epic/legendary
- Exotic rarity reserved for Phase 85 content (void_rift, crystalline_wastes, bioluminescent_depths)
- Rare/epic sufficient for filling fungal_forest and miasma_marshes gaps

**Rarity budget guidance:**
- Rare: 60-70% of special entities
- Epic: 25-35% of special entities
- Legendary: 5-10% of special entities
- Exotic: Only for void_rift and crystalline_wastes content

### Pitfall 5: Creature Count Imbalance

**What goes wrong:** Biome has 1 creature while others have 4-6, creating ecosystem imbalance
**Why it happens:** Not auditing existing creature distribution before adding new ones
**How to avoid:**
- Audit current state with: `grep -h "biomes:" packages/entities/src/definitions/*creatures.ts | sort | uniq -c`
- Target: 3-4 creatures per biome minimum (1 herbivore, 1 omnivore, 1-2 predators)
- Priority: ancient_ruins (1 creature), starfall_crater (2 creatures shared) need +2 each

**Current gaps (from codebase audit):**
- ancient_ruins: 1 creature (needs +2: guardian constructs, relic beasts)
- starfall_crater: 2 creatures shared with ancient_ruins (needs +2: alien fauna)
- Other biomes: adequately populated (2-4 creatures each)

### Pitfall 6: XP Reward Inflation

**What goes wrong:** New lore fragments grant excessive XP, breaking progression curve
**Why it happens:** Not reviewing existing fragment XP values
**How to avoid:**
- Standard rewards: 50 XP (faction lore, world history), 75 XP (biome lore), 100 XP (ancient tech)
- Higher rewards for deeper/more dangerous biomes (Tier III-IV)
- Never exceed 150 XP for single fragment

**Existing fragment XP baseline:**
- world_history: 50-75 XP
- faction_lore: 50 XP (biome-specific)
- ancient_tech: 100 XP (ruins/anomaly focus)
- biome_ecology (new): 75-100 XP recommended

## Code Examples

Verified patterns from codebase:

### Rare/Epic Resource Variant (Fungal Forest)

```typescript
// packages/entities/src/definitions/plants.ts
export const PLANT_RARE_FUNGI: PlantDefinition = {
  id: 'plant_rare_fungi',
  displayName: 'Rare Bioluminescent Fungi',
  description: 'Exceptionally bright fungal cluster with concentrated biogenic compounds. Highly sought by Verdant researchers.',
  entityClass: 'plant',
  biomes: ['fungal_forest'],
  textureKey: 'plant_rare_fungi',
  color: 0xff44ff,
  lootTableId: 'loot_plant_rare_fungi',
  harvestYield: [
    { itemId: 'world_alien_flora_rare', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 2, chance: 0.4 },
  ],
  respawnSeconds: 600, // 10 minutes (rare resource)
};

export const PLANT_EPIC_SPORES: PlantDefinition = {
  id: 'plant_epic_spores',
  displayName: 'Ancient Spore Cluster',
  description: 'Primordial fungal formation predating colonial settlement. Spores contain unknown genetic material.',
  entityClass: 'plant',
  biomes: ['fungal_forest'],
  textureKey: 'plant_epic_spores',
  color: 0xff00ff,
  lootTableId: 'loot_plant_epic_spores',
  harvestYield: [
    { itemId: 'world_alien_flora_epic', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 2, maxAmount: 3, chance: 0.6 },
    { itemId: 'world_ancient_fragment', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  respawnSeconds: 600,
};

// Add to ALL_PLANTS array
export const ALL_PLANTS: readonly PlantDefinition[] = [
  PLANT_LUMINOUS_VINE,
  PLANT_VOID_FERN,
  // ... existing plants
  PLANT_RARE_FUNGI, // NEW
  PLANT_EPIC_SPORES, // NEW
];
```

### Toxic Crystal (Miasma Marshes)

```typescript
// packages/entities/src/definitions/minerals.ts
export const MINERAL_TOXIC_CRYSTAL: MineralDefinition = {
  id: 'mineral_toxic_crystal',
  displayName: 'Toxic Crystal Formation',
  description: 'Crystallized marsh toxins with unusual chemical properties. Handle with extreme caution.',
  entityClass: 'mineral',
  biomes: ['miasma_marshes'],
  textureKey: 'mineral_toxic_crystal',
  color: 0x9acd32,
  lootTableId: 'loot_mineral_toxic_crystal',
  miningYield: [
    { itemId: 'world_toxic_residue', minAmount: 3, maxAmount: 5, chance: 1.0 },
    { itemId: 'reagent_thermal_compound', minAmount: 1, maxAmount: 2, chance: 0.3 },
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  requiredTier: 2, // Tier II tool required
  respawnSeconds: 480, // 8 minutes
};

export const MINERAL_MARSH_GAS_NODE: MineralDefinition = {
  id: 'mineral_marsh_gas_node',
  displayName: 'Concentrated Gas Vent',
  description: 'Pressurized pocket of marsh gases. Rich in volatile compounds.',
  entityClass: 'mineral',
  biomes: ['miasma_marshes'],
  textureKey: 'mineral_marsh_gas_node',
  color: 0x556b2f,
  lootTableId: 'loot_mineral_marsh_gas_node',
  miningYield: [
    { itemId: 'world_toxic_residue', minAmount: 4, maxAmount: 7, chance: 1.0 },
    { itemId: 'reagent_volatile_extract', minAmount: 1, maxAmount: 2, chance: 0.5 },
  ],
  requiredTier: 2,
  respawnSeconds: 420, // 7 minutes
};
```

### Artifact Definitions (Toxic Wastes, Volcanic Reaches, Glacial Expanse)

```typescript
// packages/entities/src/definitions/artifacts.ts
export const ARTIFACT_CONTAMINATED_RELIC: ArtifactDefinition = {
  id: 'artifact_contaminated_relic',
  displayName: 'Contaminated Ancient Relic',
  description: 'Prior Inhabitant technology saturated with toxic compounds. Purpose unknown, value high despite hazardous handling requirements.',
  entityClass: 'artifact',
  biomes: ['toxic_wastes'],
  textureKey: 'artifact_contaminated_relic',
  color: 0x9acd32,
  lootTableId: 'loot_artifact_contaminated_relic',
  respawns: false, // One-time discovery
  rarity: 'rare',
};

export const ARTIFACT_GEOTHERMAL_CORE: ArtifactDefinition = {
  id: 'artifact_geothermal_core',
  displayName: 'Ancient Geothermal Core',
  description: 'Self-sustaining thermal generator of unknown origin. Still producing heat after millennia.',
  entityClass: 'artifact',
  biomes: ['volcanic_ridge'], // Note: 'volcanic_reaches' -> 'volcanic_ridge' (BiomeType)
  textureKey: 'artifact_geothermal_core',
  color: 0xff4500,
  lootTableId: 'loot_artifact_geothermal_core',
  respawns: false,
  rarity: 'epic',
};

export const ARTIFACT_GLACIAL_ARCHIVE: ArtifactDefinition = {
  id: 'artifact_glacial_archive',
  displayName: 'Frozen Data Archive',
  description: 'Perfectly preserved information storage device. Ice-locked for countless years.',
  entityClass: 'artifact',
  biomes: ['frozen_expanse'], // Note: 'glacial_expanse' -> 'frozen_expanse' (BiomeType)
  textureKey: 'artifact_glacial_archive',
  color: 0xb0e0e6,
  lootTableId: 'loot_artifact_glacial_archive',
  respawns: false,
  rarity: 'epic',
};

// Add to ALL_ARTIFACTS array
export const ALL_ARTIFACTS: readonly ArtifactDefinition[] = [
  ARTIFACT_ANCIENT_DATA_CORE,
  ARTIFACT_VOID_TOUCHED_RELIC,
  // ... existing artifacts
  ARTIFACT_CONTAMINATED_RELIC, // NEW
  ARTIFACT_GEOTHERMAL_CORE, // NEW
  ARTIFACT_GLACIAL_ARCHIVE, // NEW
];
```

### Creatures (Starfall Crater, Ancient Ruins)

```typescript
// packages/entities/src/definitions/creatures.ts
export const CREATURE_STARFALL_GRAZER: CreatureDefinition = {
  id: 'creature_starfall_grazer',
  displayName: 'Starfall Grazer',
  description: 'Alien herbivore feeding on anomaly-mutated vegetation. Docile but unpredictable due to void exposure.',
  entityClass: 'creature',
  biomes: ['starfall_crater'],
  textureKey: 'creature_starfall_grazer',
  color: 0x191970,
  lootTableId: 'loot_creature_starfall_grazer',
  behavior: 'herbivore',
  baseHealth: 120,
  levelRange: [12, 22],
  baseXp: 50,
  respawnSeconds: 360,
};

export const CREATURE_VOID_STALKER: CreatureDefinition = {
  id: 'creature_void_stalker',
  displayName: 'Void Stalker',
  description: 'Apex predator adapted to anomaly zones. Uses dimensional instability to ambush prey.',
  entityClass: 'creature',
  biomes: ['starfall_crater'],
  textureKey: 'creature_void_stalker',
  color: 0x4a0080,
  lootTableId: 'loot_creature_void_stalker',
  behavior: 'predator',
  baseHealth: 200,
  levelRange: [15, 25],
  baseXp: 80,
  respawnSeconds: 480,
};

export const CREATURE_GUARDIAN_CONSTRUCT: CreatureDefinition = {
  id: 'creature_guardian_construct',
  displayName: 'Guardian Construct',
  description: 'Ancient automaton still following defense protocols. Attacks trespassers in ruin zones.',
  entityClass: 'creature',
  biomes: ['ancient_ruins'],
  textureKey: 'creature_guardian_construct',
  color: 0x8b7355,
  lootTableId: 'loot_creature_guardian_construct',
  behavior: 'predator', // Aggressive behavior
  baseHealth: 180,
  levelRange: [12, 20],
  baseXp: 70,
  respawnSeconds: 420,
};

export const CREATURE_RELIC_BEAST: CreatureDefinition = {
  id: 'creature_relic_beast',
  displayName: 'Relic Beast',
  description: 'Mutated creature warped by prolonged ruin exposure. Territorial and highly aggressive.',
  entityClass: 'creature',
  biomes: ['ancient_ruins'],
  textureKey: 'creature_relic_beast',
  color: 0xa0522d,
  lootTableId: 'loot_creature_relic_beast',
  behavior: 'predator',
  baseHealth: 160,
  levelRange: [10, 18],
  baseXp: 60,
  respawnSeconds: 360,
};

// Add to ALL_CREATURES array
export const ALL_CREATURES: readonly CreatureDefinition[] = [
  CREATURE_VOID_CRAWLER,
  CREATURE_CANOPY_GRAZER,
  // ... existing creatures
  CREATURE_STARFALL_GRAZER, // NEW
  CREATURE_VOID_STALKER, // NEW
  CREATURE_GUARDIAN_CONSTRUCT, // NEW
  CREATURE_RELIC_BEAST, // NEW
];
```

### Biome Ecology Lore Fragments

```typescript
// packages/lore/src/fragments/biome-ecology.ts (NEW FILE)
import type { LoreFragment } from '@into-the-void/shared-types';

export const BIOME_ECOLOGY_FRAGMENTS: readonly LoreFragment[] = [
  {
    id: 'lore_biome_tidal_pools_01',
    title: 'The Shallows',
    category: 'biome_ecology',
    content: `The Tidal Pools are Terminus's only coastline — a narrow band where land meets vast subsurface oceans. Early surveyors expected beaches. What they found was stranger.

The tides here don't follow orbital mechanics. Water levels rise and fall on 37-hour cycles unrelated to moon positions. Some xenogeologists theorize the oceans are artificially regulated, possibly by Ancient infrastructure buried beneath the seabed.

The pools teem with life — filter feeders, bioluminescent jellyfish, armored crustaceans that could crush plasteel. But colonists report the water feels wrong. Too warm in places. Too cold in others. And sometimes, at low tide, geometric patterns appear on the exposed seabed. Patterns that weren't there the previous cycle.

Verdant Dynamics maintains three research stations along the Pools, studying the alien marine ecosystem. Helix Extraction ignores the biology and focuses on mineral-rich tidal flats. Both factions agree on one thing: the deeper ocean remains unexplored. Submersibles sent beyond the shallows don't return.`,
    biome: 'tidal_pools',
    xpReward: 75,
  },
  {
    id: 'lore_biome_kelp_forests_01',
    title: 'Forests of the Deep',
    category: 'biome_ecology',
    content: `Beneath the Tidal Pools lie the Kelp Forests — vast underwater thickets of plant-like organisms growing to heights of fifty meters. But Terminus kelp isn't Earth kelp. It's something older.

The kelp moves when there's no current. It glows in patterns colonists swear are deliberate. Analysis shows cellular structures unlike any known photosynthetic life — these organisms process energy through mechanisms that shouldn't be biologically possible.

Divers report the forests are louder than expected. Clicks. Hums. Vibrations that feel like communication. Marine biologists dismiss this as whale-song equivalents from the massive grazers that drift through the canopy. But the divers insist: the kelp itself is making the sounds.

Nexus Frontiers operates harvesting rigs in the densest groves. Workers complain of equipment failures, navigation glitches, and "lost time" — entering the forest at dawn, emerging at dusk with no memory of the intervening hours. Nexus blames nitrogen narcosis. The workers aren't convinced.`,
    biome: 'kelp_forests',
    xpReward: 75,
  },
  {
    id: 'lore_biome_deep_trenches_01',
    title: 'The Abyss Speaks',
    category: 'biome_ecology',
    content: `The Deep Trenches plunge kilometers into Terminus's crust — darkness absolute, pressure lethal, and life abundant. Probes sent to the deepest points detect thermal vents, mineral formations worth trillions in extracted value, and ruins.

Ancient structures line the trench walls. Not settlements — infrastructure. Conduits. Power grids. Pressure chambers designed for beings that lived at crushing depths. The ruins descend beyond current probe range. No one knows how deep they go.

The trench ecosystem is bizarre even by Terminus standards. Apex predators the size of colony shuttles. Chemosynthetic organisms that form living carpets across vent fields. And the shells — fossilized remains of creatures larger than anything that should be biologically viable.

Helix Extraction maintains deep-sea mining platforms at the trench edges. Every platform loses a crew member annually to "structural failures," "equipment malfunctions," or "psychological breaks." Helix calls it acceptable attrition. The families call it murder. But the compensation payments keep coming, and new workers keep volunteering.

At maximum documented depth, a probe recorded sounds that matched no known animal, machine, or geological process. Just before signal loss, it transmitted eleven seconds of audio. Analysts who listened to the recording refused to discuss its contents. The data was classified.`,
    biome: 'deep_trenches',
    xpReward: 100,
  },
  {
    id: 'lore_biome_void_rift_01',
    title: 'Where Reality Fails',
    category: 'biome_ecology',
    content: `The Void Rift isn't a place. It's a wound.

Spatial geometry breaks down in the Rift. Distances change. Straight paths curve. Time stutters — colonists experience minutes while hours pass outside, or vice versa. Some expeditions return before they left. Others never return at all.

The Rift's boundaries shift. Survey maps become obsolete within days. Landmarks move. Terrain reconfigures. The only constant is the wrongness — a pervasive sensation that reality here is thin, fragile, and failing.

Life in the Rift is distorted. Creatures with impossible anatomies. Plants that shift between states of matter. Minerals that exhibit quantum properties at macroscopic scales. Everything here is touched by the anomaly — warped, mutated, wrong.

The ICC forbids unauthorized Rift expeditions. The corporations agree this time. Nexus Frontiers — whose motto is "Fortune Favors the Fearless" — still restricts Rift access to their most experienced specialists. Even they return changed. Quieter. Haunted.

But the artifacts the Rift yields are worth the risk. Technology beyond current understanding. Materials that shouldn't exist. And deep in the Rift's heart, at the point where distortion is absolute, sensors detect something moving. Something vast. Something that predates the Ancients.

The corporations pretend they don't know what it is. They're lying.`,
    biome: 'void_rift',
    xpReward: 100,
  },
  {
    id: 'lore_biome_crystalline_wastes_01',
    title: 'The Singing Fields',
    category: 'biome_ecology',
    content: `The Crystalline Wastes span thousands of square kilometers — an alien landscape of silicon spires, prismatic plateaus, and valleys filled with geometric formations that catch light and scatter it into impossible colors.

The crystals resonate. Wind passing through the formations creates tones — harmonics that shift with atmospheric pressure, temperature, and visitor proximity. Some colonists claim the crystals respond to thoughts. Scientific instruments detect nothing. The colonists hear it anyway.

The Wastes grow. Slowly, imperceptibly, but measurably. Crystal formations expand millimeters per year, following patterns that suggest intent. Xenogeologists debate: are the crystals alive? Or are they something the concepts of "alive" and "dead" don't adequately describe?

Helix Extraction operates harvesting facilities on the Wastes' perimeter. The work is lucrative and lethal. Crystal edges can cut through modern materials like tissue. Workers wear reinforced suits and still suffer lacerations. Worse are the psychological effects — the sensation of being watched, whispers in empty chambers, dreams of geometries that hurt to perceive.

Some workers stay too long. They sit among the crystals and listen. Eventually they stop responding to calls. Eventually they become part of the landscape — perfectly still, eyes reflecting rainbow light, expressions serene. Helix leaves them there. Retrieval attempts fail. The crystals protect what they claim.`,
    biome: 'crystalline_wastes',
    xpReward: 100,
  },
  {
    id: 'lore_biome_bioluminescent_depths_01',
    title: 'The Living Dark',
    category: 'biome_ecology',
    content: `Deep beneath Terminus's surface lie caverns where darkness should reign but doesn't. The Bioluminescent Depths glow — not with artificial light, but with living radiance from flora that paints the walls in blues, greens, and purples.

Every surface is alive. Moss that pulses in rhythm with unseen currents. Fungal networks that transmit light signals across cave systems. Trees — if the massive bioluminescent structures can be called trees — that tower sixty meters tall in chambers carved from stone.

The ecology here operates independently of surface biomes. No sunlight reaches these depths, yet photosynthetic life thrives. Energy comes from geothermal vents and mineral-rich groundwater, but the biomass supported by these sources far exceeds theoretical limits. Something else is feeding the ecosystem. Xenobiologists don't know what.

Verdant Dynamics maintains research stations in the shallowest Depths. They harvest bioluminescent compounds for medical applications, study symbiotic relationships that shouldn't exist, and map networks of tunnels that extend far beyond current exploration range. Some tunnels lead to Ancient ruins. Others lead deeper.

Workers report sounds in the dark — not cave echoes, but rhythmic pulses like breathing. Massive movements felt through stone. Vibrations that suggest something enormous moving through deeper chambers. Verdant attributes this to seismic activity. Their scientists don't believe the official explanation. Neither do the workers who've heard the breathing approach, then stop, then retreat.

Whatever lives in the deepest Depths, it's aware of the colonists. And it's watching.`,
    biome: 'bioluminescent_depths',
    xpReward: 100,
  },
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual POI placement | Procedural noise-based POI generation | Phase 77 (v1.17) | POIs now sparse, meaningful, and deterministic per world seed |
| Static mastery objectives | Event-driven auto-initialization | Phase 80 (v1.17) | Objectives auto-create when player enters new biome, no manual config |
| Separate loot files per entity | Consolidated creature-loot.ts | Phase 78-79 (v1.17) | All creature drops in single file, easier to audit drop rates |
| Lore fragments in database | Lore registry with category indexing | Phase 80 (v1.17) | LoreRegistry.getBiomeFragments() enables discovery by location |

**Deprecated/outdated:**
- Manual biome-to-POI mapping: Now handled by BIOME_POI_WEIGHTS in world-gen
- Hard-coded mastery objectives: Now dynamically created from MASTERY_TIER_REQUIREMENTS

## Open Questions

1. **Biome Name Discrepancy**
   - What we know: Requirements mention "volcanic_reaches" and "glacial_expanse"
   - What's unclear: BiomeType union defines "volcanic_ridge" and "frozen_expanse"
   - Recommendation: Use canonical BiomeType names from shared-types/src/game/biome.ts (volcanic_ridge, frozen_expanse)

2. **Lore Fragment Distribution**
   - What we know: PROG-05 requires 6-10 lore fragments for aquatic and exotic zones
   - What's unclear: Should fragments be evenly distributed (1-2 per biome) or concentrated (3-4 in key biomes)?
   - Recommendation: 1 fragment per new biome (6 total: tidal_pools, kelp_forests, deep_trenches, void_rift, crystalline_wastes, bioluminescent_depths) for baseline coverage

3. **Artifact Spawn Rate**
   - What we know: Phase 83-03 set artifact spawn rate to 5% per attempt with no respawn
   - What's unclear: Should new artifacts maintain same rarity or be more/less common?
   - Recommendation: Maintain 5% spawn rate for consistency (existing pattern from artifacts.ts)

4. **POI Type Variety**
   - What we know: PROG-06 requires "underwater ruins, anomaly nexuses" POI types
   - What's unclear: Are these new POI types or existing types (anomaly, cache, landmark) with biome-specific flavoring?
   - Recommendation: Use existing POI types with biome-specific descriptions (no new types needed — POI_TYPES already supports anomaly/cache/landmark)

## Sources

### Primary (HIGH confidence)

- Codebase files examined:
  - `packages/entities/src/definitions/*.ts` - Entity definition patterns
  - `packages/lore/src/fragments/*.ts` - Lore fragment structure
  - `packages/shared-types/src/game/poi.ts` - POI type definitions
  - `packages/shared-types/src/game/zone-mastery.ts` - Mastery objective requirements
  - `packages/world-gen/src/generation/pois.ts` - POI generation with biome weights
  - `apps/game-server/src/game/zone-mastery.service.ts` - Event-driven objective tracking
  - `.planning/phases/087-item-integration-balance/87-VERIFICATION.md` - Prior phase completion status
  - `lore/world-bible.md` - Canonical lore source
  - `.planning/REQUIREMENTS.md` - Phase 88 requirements (ENT-07 through PROG-06)

### Secondary (MEDIUM confidence)

- Phase 83-03 decision: Plant respawn timing 5-10 minutes matches mineral pattern
- Phase 83-03 decision: Artifact spawn rate 5% per attempt, respawnTime -1 for no respawn
- Phase 86-02 decision: Biome density patterns (flora-focused, mineral-focused, danger-focused)

## Metadata

**Confidence breakdown:**
- Entity definition patterns: HIGH - Verified by reading 12 definition files, established patterns clear
- Lore fragment structure: HIGH - Verified by reading existing fragments, LoreRegistry implementation
- Discovery systems integration: HIGH - Verified POI generation, zone mastery event listeners, lore indexing
- Content gap identification: HIGH - Verified via grep analysis (0 rare fungi, 0 toxic crystals, 1 ancient_ruins creature)

**Research date:** 2026-02-24
**Valid until:** 2026-03-26 (30 days - stable content authoring patterns)
