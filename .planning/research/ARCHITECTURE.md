# Architecture Research: Content Expansion & Faction Gear (v1.23)

**Domain:** Entity and item definition integration for scale content expansion in a 2D sci-fi survival MMO
**Researched:** 2026-02-27
**Confidence:** HIGH — based on direct analysis of all relevant packages, registries, definition files, spawn systems, and loot tables in the live codebase

---

## System Overview

The content system is a **layered definition pipeline** that flows from static data files into runtime registries, then into the world generator, then into live game-server services. Adding 100+ new definitions means extending every layer, but the architecture already has all the extension points needed — nothing new needs to be invented.

```
┌──────────────────────────────────────────────────────────────────┐
│                     DEFINITION LAYER (packages/)                  │
│                                                                    │
│  packages/entities/src/definitions/         (EntityDefinition)    │
│  ├── creatures.ts, aquatic-creatures.ts, exotic-creatures.ts      │
│  ├── plants.ts, aquatic-plants.ts, exotic-plants.ts               │
│  ├── minerals.ts, aquatic-minerals.ts, exotic-minerals.ts         │
│  └── artifacts.ts, aquatic-artifacts.ts, exotic-artifacts.ts      │
│                                                                    │
│  packages/items/src/definitions/            (ItemDefinition)      │
│  ├── suits.ts, aquatic-suits.ts, exotic-suits.ts                  │
│  ├── tools.ts, aquatic-tools.ts, exotic-tools.ts                  │
│  ├── modules.ts                                                    │
│  ├── consumables.ts, aquatic-consumables.ts, exotic-consumables   │
│  ├── world-items.ts, reagents.ts                                  │
│  └── index.ts  (ALL_ITEMS array + ITEM_IDS constant object)       │
│                                                                    │
│  packages/game-logic/src/loot/creature-loot.ts (CREATURE_LOOT_TABLES Map)│
└──────────────────────────────────────────────────────────────────┘
                         │ auto-registered on import
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                     REGISTRY LAYER (singletons)                   │
│                                                                    │
│  EntityRegistry  — Map<string, EntityDefinition>                  │
│  ItemRegistry    — Map<string, ItemDefinition>                    │
│  NpcRegistry     — Map<string, NpcDefinition>                     │
│  AbilityRegistry — Map<string, AbilityDefinition>                 │
│                                                                    │
│  Each: .get(id) returns fallback (magenta) on unknown ID          │
│  Each: .registerAll() called at module init via index.ts          │
└──────────────────────────────────────────────────────────────────┘
                         │
          ┌──────────────┼───────────────┐
          ▼              ▼               ▼
┌──────────────┐ ┌───────────────┐ ┌──────────────────────────────┐
│  world-gen   │ │  game-server  │ │  NPC trader inventories       │
│  spawn.ts    │ │  entity.svc   │ │  packages/npcs/definitions/   │
│              │ │  zones.svc    │ │  verdant.ts, helix.ts         │
│  BIOME_SPAWN │ │  inventory    │ │  nexus.ts, neutral.ts         │
│  _CONFIGS    │ │  combat       │ │                               │
└──────────────┘ └───────────────┘ └──────────────────────────────┘
```

---

## Integration Points: Exact Files and Their Roles

### 1. Entity Definitions — `packages/entities/src/definitions/`

**What it is:** Static `const` objects implementing `CreatureDefinition`, `PlantDefinition`, `MineralDefinition`, or `ArtifactDefinition`.

**Convention:** One file per biome group (e.g., `creatures.ts` for terrestrial, `aquatic-creatures.ts` for aquatic, `exotic-creatures.ts` for exotic biomes). New faction-biome creature groups (e.g., `verdant-creatures.ts`) should follow this pattern.

**Fields that matter for new content:**
- `biomes: BiomeType[]` — must match a value in `shared-types/game/biome.ts`. Adding a new biome requires updating the `BiomeType` union there first.
- `lootTableId: string` — convention is `'loot_' + entity.id`. Must have a matching entry in `CREATURE_LOOT_TABLES` in `game-logic/src/loot/creature-loot.ts`.
- `levelRange: [number, number]` — drives tier-appropriate challenge. Tier I: 1–10, Tier II: 5–20, Tier III: 15–35, Tier IV: 25–50.
- `respawnSeconds` — per-creature field with 25% runtime variance applied by `EntityService`.
- For minerals: `requiredTier: 1 | 2 | 3 | 4` — gates which tools can mine it.
- For artifacts: `respawns: false` is enforced at the type level (ArtifactDefinition). No respawn logic needed.

**After adding definitions:** Update the barrel arrays in `definitions/index.ts` (`ALL_ENTITIES`) and add the ID constants to `ENTITY_IDS`.

### 2. Item Definitions — `packages/items/src/definitions/`

**What it is:** Static `const` objects implementing `ItemDefinition`.

**Faction gear pattern:** Two exotic faction suits already exist (`suit_nexus_combat_frame_exotic`, `suit_helix_research_frame_exotic`). New faction gear follows the same pattern. A Verdant suit is the missing piece at exotic tier. Tier I–III faction gear needs new files per faction.

**Naming convention (existing pattern):**
- Suits: `suit_<faction>_<archetype>_<rarity>` (e.g., `suit_verdant_biotech_rare`)
- Tools: `tool_<faction>_<type>_<rarity>` (e.g., `tool_helix_drill_epic`)
- Modules: `module_<type>_<rarity>` (generic — modules aren't faction-gated currently)

**Stat generation:** Use `generateSuitStats(archetype, rarity, tier)` from `packages/items/src/utils.ts`. Do not hardcode stats. The archetype map:
- Verdant (biotech) → `'scout'` or `'hazmat'` archetypes (perception, resilience, recovery)
- Helix (industrial) → `'tank'` or `'assault'` archetypes (durability, toughness, power)
- Nexus (surveillance) → `'recon'` or `'combat'` archetypes (perception, haste, power)

**After adding definitions:** Update `ALL_ITEMS` and `ITEM_IDS` in `definitions/index.ts`.

### 3. Loot Tables — `packages/game-logic/src/loot/creature-loot.ts`

**What it is:** A `Map<string, readonly HarvestYield[]>` keyed by `lootTableId` (format: `'loot_' + entityId`).

**Every new creature requires a matching loot table entry.** Plants and minerals use `harvestYield` and `miningYield` directly on the `EntityDefinition` — they do NOT need entries in this file. Artifacts also do not — they use `handleCollect()` which adds the artifact item directly.

**Item IDs in loot tables** must exist in `ItemRegistry` before the server starts. If a loot drop references an item that doesn't exist, `ItemRegistry.get()` returns the unknown-item fallback (magenta) with a console warning but no crash.

**Loot table design rule (from existing pattern):**
- Common creatures: 1–2 low-value items (organic material, area-specific world-item)
- Tier II predators: 2–4 items, 10–20% rare drop, area reagent
- Tier III–IV bosses: 5–9 items including faction consumables and exotic reagents

### 4. Biome Spawn Config — `packages/world-gen/src/generation/spawn.ts`

**What it is:** `BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig>` — a plain object with one entry per biome. Each entry lists creature, mineral, plant, and artifact arrays with spawn weights, plus density values.

**This is where new entities become visible in the world.** An entity definition that isn't listed in `BIOME_SPAWN_CONFIGS` will never spawn, regardless of what its `biomes` field says. The `biomes` field on `EntityDefinition` is used for `EntityRegistry.getByBiome()` queries (e.g., future filtering tools) but the spawn system uses `BIOME_SPAWN_CONFIGS` as its exclusive source of truth.

**Gap filling rule:** To bring a biome to 4–6 creatures, add entries to the `creatures` array for that biome in `BIOME_SPAWN_CONFIGS`. The weight controls relative frequency; new entries don't need to sum to any total.

**Rare/epic mineral spawn system** (`rarity.ts`): `getRareBiomeMinerals()` and `getEpicBiomeMinerals()` are separate functions that return hardcoded arrays per biome. New rare/epic mineral variants require updating these functions as well — they are NOT auto-populated from `BIOME_SPAWN_CONFIGS`.

### 5. Rare Mineral Registry — `packages/world-gen/src/generation/rarity.ts`

**What it is:** Two functions (`getRareBiomeMinerals`, `getEpicBiomeMinerals`) returning `string[]` per biome. Currently only 5 biomes have rare variants; most biomes return `[]`.

**Must be updated** when adding rare/epic mineral variants for under-represented biomes (miasma_marshes, frozen_expanse, kelp_forests, etc.).

### 6. NPC Trader Inventories — `packages/npcs/src/definitions/`

**What it is:** Static `TraderDefinition` objects with an `inventory` array of `{ itemId, buyPrice, sellPrice, stock }`.

**Faction gear must be purchasable from faction traders.** The pattern is: Verdant trader sells Verdant gear, Helix trader sells Helix gear, Nexus trader sells Nexus gear. New faction item IDs need to be added to the corresponding trader's `inventory` array.

**Price formula (from existing prices):**
- Common: baseValue / 2 (sell), baseValue (buy)
- Rare: approximately baseValue * 0.45 (sell), baseValue (buy)
- Epic: similar ratio — see existing modules as reference
- Legendary: not sold by traders (player-acquired only, consistent with existing pattern)

### 7. ENTITY_IDS and ITEM_IDS Constants — both `definitions/index.ts` files

**What they are:** `as const` objects with string constants for every registered ID. Used throughout the codebase (especially `spawn.ts`) to avoid magic strings.

**Must be updated** for every new entity and item. This is the friction point at scale — the constants file grows alongside the definitions. No tooling gap here — it's manual but straightforward.

---

## Data Flow: New Entity from Definition to World

```
Author writes EntityDefinition in creatures.ts
    ↓
Added to ALL_ENTITIES array in definitions/index.ts
    ↓
ID added to ENTITY_IDS constant
    ↓
packages/entities/src/index.ts: EntityRegistry.registerAll(ALL_ENTITIES)
    (called at module import time — no explicit registration step)
    ↓
packages/world-gen/spawn.ts: BIOME_SPAWN_CONFIGS entry references ENTITY_IDS.NEW_CREATURE
    (this is where it enters the world generation pipeline)
    ↓
generateSpawnPoints() → weightedPick() → SpawnPoint[] emitted for chunk
    ↓
ZonesService.createEntityFromSpawn() → Entity object stored in zone state
    ↓
EntityRegistry.get(creature.speciesId) → CreatureDefinition retrieved on kill
    ↓
CREATURE_LOOT_TABLES.get(def.lootTableId) → HarvestYield[] for loot roll
    ↓
rollLootTable() → ItemRegistry.get(itemId) → items dropped to ground
```

## Data Flow: New Faction Item to Player Equipment

```
Author writes ItemDefinition in suits.ts (or faction-suits.ts)
    ↓
Added to ALL_ITEMS array in definitions/index.ts
    ↓
ID added to ITEM_IDS constant
    ↓
packages/items/src/index.ts: ItemRegistry.registerAll(ALL_ITEMS)
    ↓
NPC TraderDefinition in npcs/definitions/[faction].ts: itemId added to inventory[]
    ↓
TradeService uses ItemRegistry.get(itemId) to resolve display name, price etc.
    ↓
Player equips item → InventoryService stores itemId
    ↓
effectiveStats(equipment) → ItemRegistry.get(itemId) → resolveEffectsForTrigger()
    → ComputedStats (server-authoritative, never from client)
    ↓
If grantedAbilities present → AbilityRegistry.get(abilityId) on action bar load
```

---

## Recommended Project Structure for New Faction Gear

The existing convention groups definitions by biome/theme. For faction gear, create separate files per faction:

```
packages/items/src/definitions/
├── suits.ts                    # EXISTING — generic suits by rarity
├── aquatic-suits.ts            # EXISTING — aquatic biome suits
├── exotic-suits.ts             # EXISTING — exotic biome suits
├── faction-suits-verdant.ts    # NEW — Verdant biotech suits, Tier I-IV
├── faction-suits-helix.ts      # NEW — Helix industrial suits, Tier I-IV
├── faction-suits-nexus.ts      # NEW — Nexus surveillance suits, Tier I-IV
├── tools.ts                    # EXISTING
├── faction-tools-verdant.ts    # NEW — Verdant bio-tools
├── faction-tools-helix.ts      # NEW — Helix mining/combat tools
├── faction-tools-nexus.ts      # NEW — Nexus stealth/recon tools
└── faction-modules.ts          # NEW — faction-branded modules (optional)

packages/entities/src/definitions/
├── creatures.ts                # EXISTING — terrestrial standard
├── [biome]-creatures.ts        # NEW per biome needing gap-fill
│   (e.g., toxic-wastes-creatures.ts, frozen-creatures.ts)
└── [biome]-plants.ts           # NEW per biome with plant gaps
```

**Rationale:** One file per faction per item type keeps files at manageable size (~200–400 lines). The alternative — expanding `suits.ts` further — would push it past 800+ lines and make diff review painful.

For entities, group by biome theme where content is dense, but keep existing file names for existing biomes (add to `creatures.ts` for terrestrial additions, keep aquatic/exotic separate).

---

## Architectural Patterns

### Pattern 1: Flat Definition + Registry Singleton

**What:** Each content type has an `interface` (in `types.ts`), an array of static objects (in `definitions/`), and a singleton registry class (`registry.ts`). Registration happens at module load via `index.ts`.

**When to use:** Every new entity or item type.

**Trade-offs:** Simple, fast, zero DB overhead for lookups. The downside — no hot-reload, no admin UI to add content without deploy. Acceptable for this project phase.

**Example (existing pattern to follow for faction suits):**
```typescript
// packages/items/src/definitions/faction-suits-verdant.ts

import type { ItemDefinition } from '../types';
import { computeIlvl, generateSuitStats } from '../utils';

export const SUIT_VERDANT_BIOVEIL_RARE: ItemDefinition = {
  id: 'suit_verdant_bioveil_rare',
  displayName: 'Verdant Bioveil Suit',
  description: 'A Verdant Dynamics field suit woven from cultivated bio-fiber. Excellent toxin resistance — Verdant\'s researchers learned from their own marshland experiments.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 7.5,
  baseValue: 3500,
  requiredLevel: 8,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_suit_verdant_bioveil',
  color: 0x2d6a2d,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'rare', 1) } },
  ],
  grantedAbilities: ['nano_repair', 'regeneration_protocol'],
};

export const ALL_VERDANT_SUITS: readonly ItemDefinition[] = [
  SUIT_VERDANT_BIOVEIL_RARE,
  // ... additional verdant suits
];
```

### Pattern 2: Biome Spawn Config as Single Source for World Presence

**What:** `BIOME_SPAWN_CONFIGS` in `spawn.ts` is the authoritative list of what spawns where. The `biomes` field on `EntityDefinition` is informational only for registry queries.

**When to use:** Every new entity that should appear in the world.

**Trade-offs:** Centralizes spawn data, makes it easy to audit per-biome content. The cost is that the file grows with content. At 16 biomes × 4 entity types, the file will be large — but it's already large and well-structured.

**Example (adding creatures to a gap biome):**
```typescript
// In spawn.ts BIOME_SPAWN_CONFIGS, toxic_wastes entry:
toxic_wastes: {
  creatures: [
    { id: ENTITY_IDS.CREATURE_TOXIC_LURKER, weight: 7, minLevel: 8, maxLevel: 20 },
    // Add these for gap-fill:
    { id: ENTITY_IDS.CREATURE_ACID_STALKER, weight: 5, minLevel: 5, maxLevel: 15 },      // NEW
    { id: ENTITY_IDS.CREATURE_MIASMA_CRAWLER, weight: 4, minLevel: 3, maxLevel: 10 },   // NEW
    { id: ENTITY_IDS.CREATURE_CORROSIVE_BRUTE, weight: 3, minLevel: 12, maxLevel: 25 }, // NEW
    { id: ENTITY_IDS.CREATURE_SPORE_HORROR, weight: 2, minLevel: 15, maxLevel: 30 },    // NEW
  ],
  // ...
}
```

### Pattern 3: Loot Table as Map Entry (creatures only)

**What:** `CREATURE_LOOT_TABLES` in `creature-loot.ts` is a `Map` with entries keyed by `'loot_' + entityId`. One entry per creature definition, no entry needed for plants/minerals/artifacts.

**When to use:** Every new creature.

**Trade-offs:** Collocating loot data in one file makes tier comparisons easy. The file is already ~400 lines and will grow. Consider splitting by tier or biome group if it exceeds 800 lines.

**Example:**
```typescript
// In creature-loot.ts CREATURE_LOOT_TABLES:
['loot_creature_acid_stalker', [
  { itemId: 'world_toxic_residue', minAmount: 1, maxAmount: 3, chance: 0.75 },
  { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 0.7 },
  { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.20 },
  { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.10 },
]],
```

---

## Integration Point Summary: New vs Modified

| Component | Status | Action for v1.23 |
|-----------|--------|------------------|
| `packages/entities/src/definitions/*.ts` | EXISTING — extend | Add new `*Definition` consts; create new files for heavy additions |
| `packages/entities/src/definitions/index.ts` | EXISTING — extend | Add to `ALL_ENTITIES` array; add IDs to `ENTITY_IDS` |
| `packages/items/src/definitions/faction-suits-*.ts` | NEW FILES | Create per-faction suit files |
| `packages/items/src/definitions/faction-tools-*.ts` | NEW FILES | Create per-faction tool files |
| `packages/items/src/definitions/index.ts` | EXISTING — extend | Add to `ALL_ITEMS`; add IDs to `ITEM_IDS` |
| `packages/game-logic/src/loot/creature-loot.ts` | EXISTING — extend | Add one entry per new creature |
| `packages/world-gen/src/generation/spawn.ts` | EXISTING — extend | Update `BIOME_SPAWN_CONFIGS` per biome |
| `packages/world-gen/src/generation/rarity.ts` | EXISTING — extend | Update `getRareBiomeMinerals` / `getEpicBiomeMinerals` for new rare variants |
| `packages/npcs/src/definitions/[faction].ts` | EXISTING — extend | Add faction gear to trader inventories |
| `packages/shared-types/src/game/faction.ts` | EXISTING — NO CHANGE | `FactionId` type already has all three factions |
| `packages/shared-types/src/game/biome.ts` | EXISTING — NO CHANGE | All 16 biomes already defined |
| `packages/items/src/types.ts` | EXISTING — may extend | Add `'faction'` optional field if faction-locking items is desired |

---

## Build Order: Dependency-Safe Sequence

The dependency graph flows downward: `shared-types` → `entities/items` → `game-logic` → `world-gen` → `game-server`. Content additions must respect this.

**Recommended order for each biome fill cycle:**

1. **Entity definitions** (`packages/entities/src/definitions/`)
   - Write creature/plant/mineral/artifact const objects
   - Add to `ALL_ENTITIES` and `ENTITY_IDS`
   - Dependencies: `shared-types` (BiomeType) — already stable

2. **Item definitions for loot targets** (`packages/items/src/definitions/`)
   - Write any new world-items or reagents that creatures should drop
   - Add to `ALL_ITEMS` and `ITEM_IDS`
   - Do this BEFORE step 3 (loot tables reference these IDs)

3. **Creature loot tables** (`packages/game-logic/src/loot/creature-loot.ts`)
   - Add one entry per new creature
   - References item IDs from step 2 — must be done after

4. **Spawn config** (`packages/world-gen/src/generation/spawn.ts`)
   - Add new entities to `BIOME_SPAWN_CONFIGS`
   - References entity IDs from step 1 — must be done after

5. **Rare mineral registry** (`packages/world-gen/src/generation/rarity.ts`)
   - Add new rare/epic mineral variant IDs to the biome map functions
   - Only needed if step 1 introduced rare/epic mineral variants

**For faction gear specifically:**

6. **Faction item definitions** (new files in `packages/items/src/definitions/`)
   - Write faction-specific suits, tools, modules per tier
   - May introduce new ability grants (check `AbilityRegistry` has them)

7. **NPC trader inventories** (`packages/npcs/src/definitions/[faction].ts`)
   - Add faction gear to the corresponding trader's `inventory[]`
   - References item IDs from step 6 — must be done after

8. **`definitions/index.ts` update for items** (after steps 6–7)
   - Import new faction definition arrays into `ALL_ITEMS`
   - Add new IDs to `ITEM_IDS`

---

## Anti-Patterns

### Anti-Pattern 1: Adding entity to biome field but not BIOME_SPAWN_CONFIGS

**What people do:** Write a `CreatureDefinition` with `biomes: ['toxic_wastes']` and assume it spawns there.

**Why it's wrong:** The `biomes` field on `EntityDefinition` is used by `EntityRegistry.getByBiome()` for query purposes only. The actual spawn system reads exclusively from `BIOME_SPAWN_CONFIGS` in `spawn.ts`. The entity will never appear in the world.

**Do this instead:** Always add an entry to `BIOME_SPAWN_CONFIGS` for every entity that should spawn.

### Anti-Pattern 2: Hardcoding stats in ItemDefinition instead of using generateSuitStats

**What people do:** Write numeric values directly: `durability: 420, toughness: 360, ...`

**Why it's wrong:** Breaks the archetype/tier/rarity budget system. Stats become inconsistent with existing items at the same tier. `item-validation.test.ts` validates that tank suits out-defense scout suits — hardcoded values can violate this.

**Do this instead:** Always use `generateSuitStats(archetype, rarity, tier)`. For faction gear with specialized identities, pick the archetype that best matches lore (Verdant = hazmat/scout, Helix = tank/assault, Nexus = recon/combat).

### Anti-Pattern 3: Missing loot table entry for a new creature

**What people do:** Add creature to entity definitions but forget the loot table.

**Why it's wrong:** `getCreatureLoot(def.lootTableId)` returns `[]` for unknown IDs. The creature drops nothing on death. No crash, no warning — just silent empty loot. Difficult to notice without explicit testing.

**Do this instead:** Add the loot table entry in `creature-loot.ts` in the same commit as the creature definition. Use the `ENTITY_IDS.NEW_CREATURE` constant for the entity ID but a string literal for the loot table key (by convention, `'loot_' + entityId`).

### Anti-Pattern 4: Faction gear without faction trader inventory update

**What people do:** Add `suit_verdant_bioveil_rare` to item definitions but don't add it to Verdant trader inventory.

**Why it's wrong:** Items become unobtainable through normal play. They can only enter the game through loot drops from creatures — if any creature drops them — or not at all.

**Do this instead:** For every faction item, add a corresponding entry to the faction's `TraderDefinition.inventory[]` in `packages/npcs/src/definitions/[faction].ts` with appropriate stock and pricing.

### Anti-Pattern 5: ID collisions from copy-paste

**What people do:** Copy an existing entity definition and forget to change the `id` field.

**Why it's wrong:** `EntityRegistry.register()` logs a warning and overwrites the first definition. The duplicate silently replaces the original. The original entity's behavior disappears.

**Do this instead:** Run `grep -r "your_new_id"` across definitions before finalizing. The `ENTITY_IDS` and `ITEM_IDS` constants provide compile-time conflict detection — if a constant with the same name already exists, TypeScript will error on the duplicate key.

---

## Scaling Considerations

At 100+ new definitions, the key concern is file size and review ergonomics, not runtime performance. The registries are `Map<string, T>` — lookup is O(1) regardless of size.

| Scale | Concern | Mitigation |
|-------|---------|------------|
| 92 entities (current) | None | Existing structure handles this |
| 180 entities (target) | `spawn.ts` grows large | Already well-structured per biome; no action needed |
| 300+ entities | `creature-loot.ts` may become unwieldy | Split by tier: `creature-loot-tier1.ts`, etc. |
| 500+ items | `definitions/index.ts` ITEM_IDS becomes verbose | Still manageable; optional: split by category |

The architecture is designed for incremental file additions with minimal surface area per change. Each new biome fill cycle touches: 1 entities definition file + 1 creature-loot section + 1 spawn config biome entry. This is the intended pattern.

---

## Sources

- Direct codebase analysis (2026-02-27):
  - `packages/entities/src/registry.ts` — EntityRegistryImpl pattern
  - `packages/items/src/registry.ts` — ItemRegistryImpl pattern
  - `packages/items/src/utils.ts` — generateSuitStats, ARCHETYPE_PROFILES
  - `packages/items/src/definitions/suits.ts` — existing faction suit precedents (Nexus, Helix exotic)
  - `packages/world-gen/src/generation/spawn.ts` — BIOME_SPAWN_CONFIGS complete listing
  - `packages/world-gen/src/generation/rarity.ts` — rare/epic mineral biome functions
  - `packages/game-logic/src/loot/creature-loot.ts` — full CREATURE_LOOT_TABLES map
  - `packages/npcs/src/definitions/verdant.ts` — trader inventory pattern
  - `lore/world-bible.md` — faction aesthetic/archetype canon (Verdant=biotech/green, Helix=industrial/brutalist, Nexus=neutral/adaptive)
- Confidence: HIGH — all findings from direct source examination, no inference from training data

---

*Architecture research for: v1.23 Content Expansion & Faction Gear*
*Researched: 2026-02-27*
