# Architecture Research: Content Expansion & Faction Gear (v1.23)

**Domain:** MMO content scaling — entity definitions, item definitions, biome spawn integration
**Researched:** 2026-03-02
**Confidence:** HIGH — derived from direct codebase inspection, all patterns verified in source

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     DEFINITION LAYER (static data)               │
├─────────────────────┬──────────────────┬─────────────────────────┤
│  packages/entities  │  packages/items  │  packages/world-gen     │
│  ┌───────────────┐  │  ┌────────────┐  │  ┌─────────────────┐    │
│  │ definitions/  │  │  │definitions/│  │  │ generation/     │    │
│  │  creatures.ts │  │  │  suits.ts  │  │  │  spawn.ts       │    │
│  │  plants.ts    │  │  │  modules.ts│  │  │  (BIOME_SPAWN_  │    │
│  │  minerals.ts  │  │  │  tools.ts  │  │  │   CONFIGS)      │    │
│  │  artifacts.ts │  │  │  ...       │  │  └─────────────────┘    │
│  │  index.ts     │  │  │  index.ts  │  │  ┌─────────────────┐    │
│  └───────────────┘  │  └────────────┘  │  │ generation/     │    │
│  ┌───────────────┐  │  ┌────────────┐  │  │  rarity.ts      │    │
│  │ registry.ts   │  │  │ registry.ts│  │  │  (rare/epic     │    │
│  │ (singleton)   │  │  │ (singleton)│  │  │   mineral maps) │    │
│  └───────────────┘  │  └────────────┘  │  └─────────────────┘    │
├─────────────────────┴──────────────────┴─────────────────────────┤
│                     RUNTIME LAYER                                 │
│  packages/game-logic/src/loot/creature-loot.ts                   │
│  (CREATURE_LOOT_TABLES — keyed by 'loot_<entity_id>' convention) │
├──────────────────────────────────────────────────────────────────┤
│                     SERVER CONSUMERS                              │
│  apps/game-server — ZonesService, CombatService, EntityService   │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|---------------|----------|
| `EntityDefinition` | Discriminated union (CreatureDefinition, PlantDefinition, MineralDefinition, ArtifactDefinition) with all static properties | `packages/entities/src/types.ts` |
| `EntityRegistry` | Singleton Map-backed registry. `get(id)` returns fallback not null. `getByBiome()`, `getByClass()` queries | `packages/entities/src/registry.ts` |
| `EntityRegistry.registerAll()` | Called at module load via `packages/entities/src/index.ts` side effect | auto-registers on import |
| `ENTITY_IDS` | `as const` string constants object — prevents typos across all consumers | `packages/entities/src/definitions/index.ts` |
| `ALL_ENTITIES` | Flat array assembled from all definition sub-arrays, fed to registry | `packages/entities/src/definitions/index.ts` |
| `ItemDefinition` | Single interface with optional fields for specialization (`equipSlot`, `moduleSlots`, `toolType`, `grantedAbilities`, etc.) | `packages/items/src/types.ts` |
| `ItemRegistry` | Identical singleton pattern to EntityRegistry | `packages/items/src/registry.ts` |
| `generateSuitStats()` | Archetype-based stat generator using `ARCHETYPE_PROFILES` + rarity/tier multipliers. Required for all new suits. | `packages/items/src/utils.ts` |
| `computeIlvl()` | Deterministic ilvl from tier (1-5) and rarity. Required for all new items. | `packages/items/src/utils.ts` |
| `BIOME_SPAWN_CONFIGS` | `Record<BiomeType, BiomeSpawnConfig>` — weighted spawn lists + density per biome | `packages/world-gen/src/generation/spawn.ts` |
| `CREATURE_LOOT_TABLES` | `Map<string, HarvestYield[]>` — loot rolls keyed by `loot_<entity_id>` | `packages/game-logic/src/loot/creature-loot.ts` |
| `getRareBiomeMinerals()` / `getEpicBiomeMinerals()` | Maps biome -> rare/epic mineral IDs for proximity-based spawning | `packages/world-gen/src/generation/rarity.ts` |

---

## Current File Organization (as-built pattern)

The codebase uses **biome-group splitting** for entity definitions. Each file covers one biome group (or the base terrestrial set):

```
packages/entities/src/definitions/
├── index.ts                  # ALL_ENTITIES assembly + ENTITY_IDS constants
├── creatures.ts              # Terrestrial biomes (void_plains, fungal_forest, etc.)
├── plants.ts                 # Terrestrial plants
├── minerals.ts               # Terrestrial minerals
├── artifacts.ts              # Terrestrial artifacts
├── aquatic-creatures.ts      # tidal_pools, kelp_forests, deep_trenches
├── aquatic-plants.ts
├── aquatic-minerals.ts
├── aquatic-artifacts.ts
├── exotic-creatures.ts       # crystalline_wastes, bioluminescent_depths, void_rift
├── exotic-plants.ts
├── exotic-minerals.ts
└── exotic-artifacts.ts

packages/items/src/definitions/
├── index.ts                  # ALL_ITEMS assembly + ITEM_IDS constants
├── suits.ts                  # General suits (generic, faction-agnostic)
├── modules.ts                # General modules (armor, speed, life-support, sensor, etc.)
├── tools.ts                  # General tools (mining, combat, research)
├── consumables.ts            # Health, energy, repair, stims, antitoxins
├── world-items.ts            # Loot drops (organic material, crystals, etc.)
├── reagents.ts               # Crafting materials
├── aquatic-suits.ts          # Phase 87: aquatic biome suits
├── aquatic-tools.ts          # Phase 87: aquatic tools
├── aquatic-consumables.ts    # Phase 87: aquatic consumables
├── exotic-suits.ts           # Phase 87: exotic/void biome suits
├── exotic-tools.ts           # Phase 87: exotic tools
└── exotic-consumables.ts     # Phase 87: exotic consumables
```

---

## Recommended Organization for v1.23 Content

### Entity Definitions: Extend Existing Files

New entities for this milestone fill gaps in **already-existing biomes** (not new biome groups). Do not create new entity definition files. Add definitions to the correct existing file:

| New entities | Target file |
|---|---|
| Tier I-III terrestrial creatures (void_plains, fungal_forest, toxic_wastes, ancient_ruins, etc.) | `packages/entities/src/definitions/creatures.ts` |
| Tier I-III terrestrial plants | `packages/entities/src/definitions/plants.ts` |
| Tier I-III terrestrial minerals + rare/epic variants | `packages/entities/src/definitions/minerals.ts` |
| Tier I-III terrestrial artifacts | `packages/entities/src/definitions/artifacts.ts` |
| Aquatic biome gap-fills (tidal_pools, kelp_forests, deep_trenches) | Respective `aquatic-*.ts` files |
| Exotic biome gap-fills (crystalline_wastes, bioluminescent_depths, void_rift) | Respective `exotic-*.ts` files |

Rationale: The biome-group split already works. Adding to existing files keeps related entities co-located and avoids over-fragmenting. A file with 20-30 definitions is fine — these are pure data, no logic.

### Item Definitions: New Files by Faction

Faction gear is a new category that crosses all item types (suits + modules + tools per faction). The existing pattern splits by **item type**. Faction gear should split by **faction** instead, because:

1. Each faction line is authored together (identity coherence — Verdant biotech applies to suits, modules, and tools simultaneously)
2. Faction-specific naming conventions and lore descriptions are easier to maintain in one file
3. The precedent exists in `packages/npcs/src/definitions/verdant.ts`, `helix.ts`, `nexus.ts`

Recommended new files:

```
packages/items/src/definitions/
├── faction-verdant.ts        # Verdant Dynamics suits + modules + tools across all tiers
├── faction-helix.ts          # Helix Extraction suits + modules + tools across all tiers
└── faction-nexus.ts          # Nexus Frontiers suits + modules + tools across all tiers
```

Each file exports three named arrays:

```typescript
// faction-verdant.ts
export const ALL_VERDANT_SUITS: ItemDefinition[] = [...];
export const ALL_VERDANT_MODULES: ItemDefinition[] = [...];
export const ALL_VERDANT_TOOLS: ItemDefinition[] = [...];
```

Integration in `packages/items/src/definitions/index.ts`:

```typescript
import { ALL_VERDANT_SUITS, ALL_VERDANT_MODULES, ALL_VERDANT_TOOLS } from './faction-verdant';
import { ALL_HELIX_SUITS, ALL_HELIX_MODULES, ALL_HELIX_TOOLS } from './faction-helix';
import { ALL_NEXUS_SUITS, ALL_NEXUS_MODULES, ALL_NEXUS_TOOLS } from './faction-nexus';

export const ALL_ITEMS: readonly ItemDefinition[] = [
  // existing arrays...
  ...ALL_VERDANT_SUITS,
  ...ALL_VERDANT_MODULES,
  ...ALL_VERDANT_TOOLS,
  ...ALL_HELIX_SUITS,
  ...ALL_HELIX_MODULES,
  ...ALL_HELIX_TOOLS,
  ...ALL_NEXUS_SUITS,
  ...ALL_NEXUS_MODULES,
  ...ALL_NEXUS_TOOLS,
];
```

---

## Architectural Patterns

### Pattern 1: Definition + Registry + Side-Effect Registration

**What:** All domain objects (entities, items, NPCs, quests, tiles) follow an identical three-part pattern: (1) plain object definitions in files, (2) a singleton registry with `get()`, `has()`, `registerAll()`, (3) `index.ts` calls `registerAll()` as a module load side effect.

**When to use:** Always. This is the established contract. Every new entity and item must flow through this pattern.

**How it works for new content:**

```typescript
// 1. Define in appropriate definition file
export const CREATURE_TOXIC_STALKER: CreatureDefinition = {
  id: 'creature_toxic_stalker',
  entityClass: 'creature',
  biomes: ['toxic_wastes'],
  // ...
};

// 2. Export from definition array in same file
export const ALL_CREATURES = [
  // existing...
  CREATURE_TOXIC_STALKER,
];

// 3. Add ID constant to ENTITY_IDS in index.ts
export const ENTITY_IDS = {
  // existing...
  CREATURE_TOXIC_STALKER: 'creature_toxic_stalker',
} as const;

// 4. Registry registration happens automatically via index.ts side effect:
// EntityRegistry.registerAll(ALL_ENTITIES) — already in packages/entities/src/index.ts
```

**Trade-offs:** No runtime cost. All definitions loaded at startup. No lazy loading for content data — this is correct for a game server that needs instant entity lookups. The fallback (`UNKNOWN_ENTITY` / `UNKNOWN_ITEM`) prevents crashes on missing IDs.

### Pattern 2: Biome Spawn Config — Three Integration Points Per Creature

Every new creature requires updates in **four separate files**. This is not optional, and omitting any one causes silent gameplay failures:

```
New creature 'creature_toxic_stalker':
  1. Definition in packages/entities/src/definitions/creatures.ts
  2. ENTITY_IDS constant in packages/entities/src/definitions/index.ts
  3. Entry in BIOME_SPAWN_CONFIGS['toxic_wastes'] in packages/world-gen/src/generation/spawn.ts
  4. Loot table entry in packages/game-logic/src/loot/creature-loot.ts
     (key: 'loot_creature_toxic_stalker')

New plant 'plant_toxic_bloom':
  1. Definition in packages/entities/src/definitions/plants.ts
  2. ENTITY_IDS constant
  3. Entry in BIOME_SPAWN_CONFIGS['toxic_wastes'].plants
  (no loot table needed — plants use harvestYield field on the definition itself)

New rare/epic mineral variant:
  1. Definition in minerals.ts with rarity field set
  2. ENTITY_IDS constant
  3. Do NOT add to BIOME_SPAWN_CONFIGS minerals — rare spawn system is separate
  4. Add to getRareBiomeMinerals() or getEpicBiomeMinerals() in rarity.ts instead

New artifact:
  1. Definition in artifacts.ts
  2. ENTITY_IDS constant
  3. Entry in BIOME_SPAWN_CONFIGS[biome].artifacts[]
  (no loot table needed — artifacts are discoveries, not kills)
```

**Trade-offs:** The multi-file requirement is a known coordination cost. For 100+ new entities, organize work by entity class (all creatures first, then plants, etc.) to reduce context-switching across files.

### Pattern 3: generateSuitStats() — All Faction Suits Must Use This

**What:** `generateSuitStats(archetype, rarity, tier)` produces stat distributions from `ARCHETYPE_PROFILES`. This ensures mathematical consistency across all suits. No faction suit should have hand-coded stat values.

**Faction archetype mapping (from REQUIREMENTS.md SUIT-01):**
- Verdant Dynamics: `hazmat` (primary) / `scout` (secondary) — resilience, recovery, vigor focus
- Helix Extraction: `tank` (primary) / `assault` (secondary) — durability, toughness, power focus
- Nexus Frontiers: `recon` (primary) / `balanced` (secondary) — perception, haste, balanced focus

**Example for a Tier IV Exotic Verdant suit:**

```typescript
export const SUIT_VERDANT_APEX_EXOTIC: ItemDefinition = {
  id: 'suit_verdant_apex_exotic',
  displayName: 'Verdant Apex Bioweave',
  category: 'suit',
  rarity: 'exotic',
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'exotic'),
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'exotic', 4) } },
  ],
  grantedAbilities: ['nano_repair', 'bio_pulse'],
  // ...
};
```

**Tier to level range mapping:**

| Tier | Level Range | Expected rarity at this tier |
|------|-------------|------------------------------|
| 1 | 1-10 | common, rare |
| 2 | 11-20 | rare, epic |
| 3 | 21-30 | epic |
| 4 | 31-40 | exotic |
| 5 | 41-50 | legendary |

### Pattern 4: Loot Table ID Convention

**What:** Entity `lootTableId` field always uses format `loot_<entity_id>`. `CREATURE_LOOT_TABLES` in `creature-loot.ts` keys on this string. The loot table must exist for every creature — missing entries cause silent drop failures (no crash, just no loot).

**Plants and minerals:** Do NOT use `CREATURE_LOOT_TABLES`. They use the `harvestYield` field directly on the definition object. Only creatures need separate loot table entries.

**Artifacts:** `lootTableId` field is present (shared by `BaseEntityDefinition`) but artifacts are discovered, not killed. Set `lootTableId: 'loot_empty'` for artifacts.

---

## Data Flow

### New Entity Flowing Through the System

```
Author adds CreatureDefinition to creatures.ts
        |
        v
ALL_CREATURES array includes it
        |
        v
ALL_ENTITIES includes it (via definitions/index.ts)
        |
        v
EntityRegistry.registerAll() on module load (via entities/src/index.ts)
        |
        v
Author adds ENTITY_IDS constant in definitions/index.ts
        |
        v
Author adds entry to BIOME_SPAWN_CONFIGS[biome] in world-gen/spawn.ts
        |
        v
World gen picks up entity during chunk spawn generation
        |
        v
Author adds loot table entry in game-logic/creature-loot.ts
        |
        v
CombatService uses loot entry on creature kill
```

### New Faction Item Flowing Through the System

```
Author adds ItemDefinition to faction-verdant.ts
        |
        v
ALL_VERDANT_SUITS (or modules/tools) array includes it
        |
        v
ALL_ITEMS includes it via definitions/index.ts
        |
        v
ItemRegistry.registerAll() on module load (via items/src/index.ts)
        |
        v
Author adds ITEM_IDS constant in definitions/index.ts
        |
        v
Item becomes available for:
  - Trader inventory (packages/npcs/src/definitions/verdant.ts)
  - Loot table references (creature-loot.ts)
  - Quest rewards (packages/quests/src/definitions/)
  - Starter kit (if applicable)
```

---

## Integration Points

### New vs Modified Files

| File | Action | What changes |
|------|--------|-------------|
| `packages/entities/src/definitions/creatures.ts` | MODIFY | Add ~60 new `CreatureDefinition` objects |
| `packages/entities/src/definitions/plants.ts` | MODIFY | Add ~30 new `PlantDefinition` objects |
| `packages/entities/src/definitions/minerals.ts` | MODIFY | Add ~20 new `MineralDefinition` objects including rare/epic variants |
| `packages/entities/src/definitions/artifacts.ts` | MODIFY | Add ~15 new `ArtifactDefinition` objects |
| `packages/entities/src/definitions/aquatic-*.ts` (4 files) | MODIFY | Fill per-biome gaps in existing files |
| `packages/entities/src/definitions/exotic-*.ts` (4 files) | MODIFY | Fill per-biome gaps in existing files |
| `packages/entities/src/definitions/index.ts` | MODIFY | Add ENTITY_IDS constants + include new arrays in ALL_ENTITIES |
| `packages/items/src/definitions/faction-verdant.ts` | CREATE | All Verdant suits, modules, tools |
| `packages/items/src/definitions/faction-helix.ts` | CREATE | All Helix suits, modules, tools |
| `packages/items/src/definitions/faction-nexus.ts` | CREATE | All Nexus suits, modules, tools |
| `packages/items/src/definitions/index.ts` | MODIFY | Import faction files, add to ALL_ITEMS, add ITEM_IDS constants |
| `packages/world-gen/src/generation/spawn.ts` | MODIFY | Add new entities to BIOME_SPAWN_CONFIGS per biome |
| `packages/world-gen/src/generation/rarity.ts` | MODIFY | Add new rare/epic mineral IDs to biome maps |
| `packages/game-logic/src/loot/creature-loot.ts` | MODIFY | Add loot table entry for every new creature |
| `packages/npcs/src/definitions/verdant.ts` | MODIFY | Add Verdant faction gear to trader inventory |
| `packages/npcs/src/definitions/helix.ts` | MODIFY | Add Helix faction gear to trader inventory |
| `packages/npcs/src/definitions/nexus.ts` | MODIFY | Add Nexus faction gear to trader inventory |

**No new packages, no new registries, no schema changes.** All new content fits the existing static definition pattern.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `packages/entities` -> `packages/world-gen` | `ENTITY_IDS` string constants | world-gen imports from entities; entity defs have no world-gen dependency |
| `packages/items` -> anywhere | `ITEM_IDS` string constants | Items referenced by string ID everywhere (loot tables, trader inventory, quest rewards) |
| `packages/game-logic/loot` -> `packages/entities` | Imports `HarvestYield` type | Loot tables share the HarvestYield interface with entity harvest yields |
| `packages/items/utils` -> definition files | `generateSuitStats()` and `computeIlvl()` imported per file | All suit definition files must import these two utilities |

---

## Recommended Build Order

Given dependency graph and review surface area:

**Phase 1 — Entity content (creatures, plants, minerals, artifacts)**

Order within phase:
1. Terrestrial creature gap-fills — modify `creatures.ts`, add `ENTITY_IDS`, update `BIOME_SPAWN_CONFIGS`, add loot tables (highest complexity: four-file pattern)
2. Aquatic creature gap-fills (same four-file pattern)
3. Exotic creature gap-fills (same)
4. All biome plants — Tier I first, then Tier II-IV (two-file pattern: definition + spawn config)
5. All biome minerals + rare/epic variants (two-file pattern: definition + rarity.ts)
6. All biome artifacts (two-file pattern: definition + spawn config)

Rationale: Creatures have the highest per-entity coordination cost (four integration points). Completing all creatures before moving to plants keeps BIOME_SPAWN_CONFIGS changes batched by purpose.

**Phase 2 — Faction item content (suits, modules, tools)**

Order within phase:
1. Create `faction-verdant.ts` — full Verdant line (Common through Legendary suits, modules, tools)
2. Create `faction-helix.ts` — full Helix line
3. Create `faction-nexus.ts` — full Nexus line
4. Update `definitions/index.ts` — wire all three into ALL_ITEMS and ITEM_IDS

Rationale: Faction files are independent of each other and can be authored separately. The `definitions/index.ts` update is the final integration step after all three files are complete.

**Phase 3 — Trader inventory updates**

- Add faction gear to NPC trader inventories in `packages/npcs/src/definitions/verdant.ts`, `helix.ts`, `nexus.ts`
- Faction gear should only be sold by the matching faction's traders
- Endgame gear (Exotic, Legendary) priced significantly higher than Tier I equivalents

---

## Anti-Patterns

### Anti-Pattern 1: Hardcoded Stats in Faction Suit Definitions

**What people do:** Write `durability: 450, toughness: 380` directly in the ItemDefinition.

**Why it's wrong:** Breaks mathematical consistency with all other suits. If stat budgets are rebalanced, hand-coded values require manual updates across every definition. `generateSuitStats()` exists precisely to avoid this — and REQUIREMENTS.md SUIT-05 explicitly requires it.

**Do this instead:** Always call `generateSuitStats(archetype, rarity, tier)` and spread the result into the stats effect.

### Anti-Pattern 2: Creating New Entity Type Files by Individual Biome

**What people do:** Create `toxic-wastes-creatures.ts`, `frozen-expanse-creatures.ts` for each biome's new additions.

**Why it's wrong:** The existing split is by biome **group** (terrestrial/aquatic/exotic), not individual biome. Splitting by biome would create 17+ tiny files for content that belongs together. The current files are designed to hold 30-50+ definitions.

**Do this instead:** Add new definitions directly into the matching existing file (`creatures.ts` for all terrestrial, `aquatic-creatures.ts` for all aquatic). Use section comments within the file to group by biome — this pattern already exists in the codebase.

### Anti-Pattern 3: Missing ENTITY_IDS Constant

**What people do:** Hardcode entity ID strings directly in `BIOME_SPAWN_CONFIGS` or loot table keys.

**Why it's wrong:** The entire codebase uses `ENTITY_IDS.CREATURE_X` everywhere. Hardcoded strings bypass searchability and are invisible to TypeScript when renaming.

**Do this instead:** Always add the `ENTITY_IDS.NEW_NAME: 'new_id'` constant to the index.ts first, then reference it everywhere. It's a two-line addition per entity.

### Anti-Pattern 4: Faction Item IDs Without Faction Prefix

**What people do:** Name a faction suit `'suit_bioweave_epic'` without faction context in the ID.

**Why it's wrong:** When 30+ faction items exist across three factions, non-prefixed IDs become ambiguous in logs, loot table entries, and trader inventory references.

**Do this instead:** Use the established NPC naming convention: `suit_verdant_<name>_<rarity>`, `module_helix_<name>_<rarity>`, `tool_nexus_<name>_<rarity>`. Example: `suit_verdant_bioweave_exotic`.

### Anti-Pattern 5: Adding Rare/Epic Minerals to the Normal BIOME_SPAWN_CONFIGS Mineral List

**What people do:** Add a rare mineral variant to `BIOME_SPAWN_CONFIGS[biome].minerals` with a low weight value to make it spawn rarely.

**Why it's wrong:** The proximity-based rare spawn system in `rarity.ts` operates as a completely separate pass from normal mineral spawning. Rare minerals placed in the normal list don't benefit from proximity-to-danger bonuses, don't respect the per-chunk caps (`rareMinerals: 3`, `epicMinerals: 1`), and have confusing spawn semantics.

**Do this instead:** Add rare mineral IDs to `getRareBiomeMinerals()` and epic mineral IDs to `getEpicBiomeMinerals()` in `packages/world-gen/src/generation/rarity.ts`. Leave them out of the normal `BIOME_SPAWN_CONFIGS` mineral list entirely.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| ~92 entities (current v1.22) | Current static Map approach is optimal |
| ~200 entities (this milestone) | No architecture change needed. Maps handle thousands with no measurable overhead. File size is the only concern — biome-group splitting manages it. |
| ~500+ entities (future) | Consider code-generation tooling for definition boilerplate. The pattern stays the same. |

**First bottleneck:** Not the registry (in-memory Map, O(1) lookups). The bottleneck will be `BIOME_SPAWN_CONFIGS` in `spawn.ts` — a single large Record that must be touched for every new entity. It will reach ~600+ lines by end of this milestone. Still manageable but worth monitoring. If it grows beyond 800 lines in a future milestone, consider splitting by biome group into separate files.

**Second bottleneck:** `CREATURE_LOOT_TABLES` in `creature-loot.ts` is a single Map in a single file. Adding 60 new creatures will make it approximately 500+ lines. This is still manageable, but future milestones should consider splitting by tier (tier1-loot.ts, tier2-loot.ts, etc.).

---

## Sources

- Direct inspection of `packages/entities/src/` — types.ts, registry.ts, definitions/index.ts, definitions/creatures.ts — HIGH confidence
- Direct inspection of `packages/items/src/` — types.ts, registry.ts, utils.ts, definitions/index.ts, definitions/suits.ts, aquatic-suits.ts — HIGH confidence
- Direct inspection of `packages/world-gen/src/generation/spawn.ts` and `rarity.ts` — HIGH confidence
- Direct inspection of `packages/game-logic/src/loot/creature-loot.ts` — HIGH confidence
- Direct inspection of `packages/npcs/src/definitions/` for faction split precedent — HIGH confidence
- `.planning/REQUIREMENTS.md` v1.23 section for scope and archetype mappings — authoritative
- `lore/world-bible.md` for faction identity and biome tier classification — HIGH confidence

---

*Architecture research for: v1.23 Content Expansion & Faction Gear*
*Researched: 2026-03-02*
