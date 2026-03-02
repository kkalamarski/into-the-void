# Phase 110: Biome Creature Population - Research

**Researched:** 2026-03-02
**Domain:** Entity content expansion — creature definitions, spawn configs, loot tables
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Creature Identity & Themes**
- Alienness scales with biome tier: Tier I creatures are recognizable (insect/animal-like), Tier IV are deeply alien. New creatures follow this escalation
- toxic_wastes ecosystem is chemical adaptation themed — creatures evolved around acid pools and toxic gases, corrosion-resistant shells, chemical sprayers, sludge dwellers. Industrial hazmat feel
- Naming convention: evocative names capturing creature identity freely — e.g., "Corrosion Maw", "Sludge Weaver", "Acid Bloom" — still [adjective]_[noun] format but adjective doesn't have to be the biome name
- Same-tier biomes may share 1 creature when it makes ecological sense (precedent: Void Horror in ancient_ruins and starfall_crater). Reduces total creature count needed
- Aquatic biomes keep ocean-themed naming — marine biology vocabulary (reef, current, tidal) with void twists. Not abstract void-themed
- void_rift's 2 new apex creatures should be corrupted variants of recognizable creatures from lower-tier biomes. Players recognize what they used to be — worldbuilding payoff

**Archetype Balance**
- Soft guideline for herbivore+omnivore+predator trio per biome — aim for it but allow exceptions where biome personality justifies it (e.g., void_rift may skip herbivores)
- Theme-driven balance: hostile biomes (toxic_wastes, void_rift) skew predator/maniac heavy. Neutral biomes (void_plains, tidal_pools) skew herbivore/omnivore. Archetype mix reflects zone danger
- Maniacs (suicidal aggression) added to each Tier III+ biome as mini-boss encounters — low spawn weight, significantly higher stats, notable loot. Encountering one should feel like an event
- Behavioral variety through flavor text and lore descriptions only — mechanically all creatures use the 4 base AI archetypes (herbivore/omnivore/predator/maniac). Behavioral depth is a future phase concern
- Clear difficulty gradient within each biome: obvious entry-level creature (low level, herbivore, easy) and apex creature (high level, predator/maniac, hard). Players learn the biome through escalating encounters
- Staggered level progression: new creatures fill gaps in level ranges so players encounter different enemies as they level up through a biome
- Every biome must reach at least 4 creatures — even biomes already at 3-4 get additions to meet the minimum

**Loot Philosophy**
- 1-2 new biome-specific materials per biome that only drop from new creatures. Gives players reason to hunt specific biomes
- Maniacs have guaranteed rare/epic drop unique to them — something players specifically hunt maniacs for. Clear reward for the mini-boss encounter
- Archetype-specific loot categories: herbivores drop organic/harvesting materials, predators drop combat components (claws, fangs, armor fragments), omnivores drop a mix
- void_rift apex creatures have the best drops in the entire game — legendary-tier materials that gate endgame crafting. Above current Dimensional Aberration drops

**Population & Spawning**
- Population targets varied by biome richness: rich/complex biomes (void_rift, deep_trenches, ancient_ruins) get 6 creatures, simpler biomes (void_plains, frozen_expanse) get 4
- Creature density rebalanced per biome alongside new creature additions — some zones may need fewer spawns now that each spawn is more varied
- Rarity pyramid for spawn weights: herbivores common (high weight), omnivores medium, predators uncommon, maniacs rare (low weight). Clear encounter hierarchy
- Full rebalance of existing creatures' spawn weights to fit the rarity pyramid — not just adding new creatures around existing weights

### Claude's Discretion
- Exact creature names and descriptions per biome (within evocative naming convention and tier-appropriate alienness)
- Specific stat values (baseHealth, baseXp, respawnSeconds) for each new creature
- Which lower-tier creatures to use as basis for void_rift corrupted variants
- Which creature to share across same-tier biomes and where sharing makes ecological sense
- Exact spawn weight numbers for the rarity pyramid
- New biome-specific material names and drop rates
- Density adjustments per biome

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

## Summary

This phase is pure content expansion with no new systems to build. The entire implementation pattern is already established across three prior phases (Phase 88 added starfall_crater/ancient_ruins creatures using identical four-file atomicity). Every new creature requires exactly four coordinated file edits: a definition in `packages/entities/src/definitions/`, an entry in `ENTITY_IDS` in `packages/entities/src/definitions/index.ts`, a spawn config entry in `packages/world-gen/src/generation/spawn.ts`, and a loot table entry in `packages/game-logic/src/loot/creature-loot.ts`. The test suite in `packages/entities/src/__tests__/` enforces this atomicity automatically — `nx run entities:test` catches any creature missing from any of the four locations.

The critical gap is toxic_wastes (1 creature → 5 needed) followed by crystal_caves, volcanic_ridge (both at 2, need 6), and several biomes at 2-3 that need 4-6. Across all 16 biomes, approximately 35-40 new creature definitions are required. Two new world items will likely need to be added to `packages/items/src/definitions/world-items.ts` for biome-specific loot that does not yet exist (primarily toxic_wastes themed materials, and void_rift legendary endgame materials beyond current Dimensional Aberration drops).

The four-file atomicity rule is the single most important pattern: never add a creature definition without simultaneously updating all four files. The test suite will fail if any file is incomplete, providing automated enforcement of this requirement.

**Primary recommendation:** Work biome-by-biome in a fixed order (toxic_wastes first as the most critical gap), adding all four files for each biome's creature batch before moving to the next biome. Within each biome, design the full creature roster (names, stats, behaviors), then implement all definitions together to avoid partial states.

## Standard Stack

### Core
| Library/File | Version | Purpose | Why Standard |
|---|---|---|---|
| `CreatureDefinition` (packages/entities/src/types.ts) | current | Typed creature schema | All creatures use this interface |
| `ENTITY_IDS` (packages/entities/src/definitions/index.ts) | current | ID constants registry | Required for all entity lookups |
| `BIOME_SPAWN_CONFIGS` (packages/world-gen/src/generation/spawn.ts) | current | Spawn weight config | Drives all runtime creature spawning |
| `CREATURE_LOOT_TABLES` (packages/game-logic/src/loot/creature-loot.ts) | current | Loot drop definitions | Runtime loot rolls on creature kill |
| Vitest | current | Test framework | `nx run entities:test` validates atomicity |

### Supporting
| File | Purpose | When to Use |
|---|---|---|
| `packages/items/src/definitions/world-items.ts` | Define new biome-specific drop items | When a new material is needed that doesn't exist yet |
| `packages/items/src/definitions/reagents.ts` | Define new biome-specific reagent drops | For rare/epic/exotic reagent drops from new creatures |
| `packages/items/src/definitions/index.ts` (ITEM_IDS) | Register new item ID constants | Required alongside any new item definition |
| `packages/items/src/definitions/index.ts` (ALL_ITEMS) | Export all items | New items must be added to ALL_ITEMS array |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| Adding creatures to existing definition files | Creating new file (e.g. `toxic-creatures.ts`) | New file requires updating `definitions/index.ts` imports and ALL_ENTITIES. Both patterns work; existing files are simpler for small additions. |

**Installation:** No new packages required. All work is content additions within existing packages.

## Architecture Patterns

### Four-File Atomicity Rule
**What:** Every new creature requires simultaneous updates to exactly four files. Partial completion causes test failures.
**When to use:** Always — no exceptions. This is the invariant the test suite enforces.

**File 1 — Creature Definition** (`packages/entities/src/definitions/creatures.ts` or `aquatic-creatures.ts` or `exotic-creatures.ts`):
```typescript
// Source: packages/entities/src/definitions/creatures.ts (Phase 88 pattern)
export const CREATURE_CORROSION_MAW: CreatureDefinition = {
  id: 'creature_corrosion_maw',
  displayName: 'Corrosion Maw',
  description: 'Chemical adaptation themed description. Tier II alienness — recognizable body plan warped by acid adaptation.',
  entityClass: 'creature',
  biomes: ['toxic_wastes'],
  textureKey: 'creature_corrosion_maw',
  color: 0x7dbb00,  // Toxic green-yellow fallback
  lootTableId: 'loot_creature_corrosion_maw',
  behavior: 'predator',
  baseHealth: 160,
  levelRange: [10, 22],
  baseXp: 52,
  respawnSeconds: 420,
};
```

**File 2 — ENTITY_IDS constant** (`packages/entities/src/definitions/index.ts`):
```typescript
// Add to ENTITY_IDS object (UPPER_SNAKE_CASE key, snake_case value)
CREATURE_CORROSION_MAW: 'creature_corrosion_maw',
```
Also add the constant export to ALL_CREATURES (or the appropriate `ALL_*` array) in the same file. The `definitions/index.ts` also re-exports the named constant from the definition file via `export * from './creatures'` — no change needed for that line, only the ENTITY_IDS entry and the ALL_* array.

**File 3 — Spawn Config** (`packages/world-gen/src/generation/spawn.ts`):
```typescript
// Add to BIOME_SPAWN_CONFIGS[biome].creatures array
{ id: ENTITY_IDS.CREATURE_CORROSION_MAW, weight: 5, minLevel: 10, maxLevel: 22 },
```
Weight follows rarity pyramid: herbivore ~8-12, omnivore ~5-8, predator ~3-6, maniac ~1-2.

**File 4 — Loot Table** (`packages/game-logic/src/loot/creature-loot.ts`):
```typescript
// Add to CREATURE_LOOT_TABLES Map
['loot_creature_corrosion_maw', [
  { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 0.70 },
  { itemId: 'world_corrosive_extract', minAmount: 1, maxAmount: 2, chance: 0.55 },  // new item
  { itemId: 'world_organic_material_epic', minAmount: 1, maxAmount: 1, chance: 0.08 },
]],
```

### New Item Definition Pattern (when needed)
When a loot table references a new item that doesn't exist in ItemRegistry, add it to `packages/items/src/definitions/world-items.ts` and register in `ITEM_IDS`:
```typescript
// Source: packages/items/src/definitions/world-items.ts (existing pattern)
export const WORLD_CORROSIVE_EXTRACT: ItemDefinition = {
  id: 'world_corrosive_extract',
  displayName: 'Corrosive Extract',
  description: 'Concentrated acid secretion from toxic_wastes creatures. Industrial solvent applications.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.4,
  baseValue: 380,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_world_corrosive_extract',
  color: 0x99cc00,
};
```
Must also be added to `ALL_WORLD_ITEMS` array and `ITEM_IDS` constants in `packages/items/src/definitions/index.ts`.

### Shared-Biome Creature Pattern
Existing precedent: `CREATURE_VOID_HORROR` has `biomes: ['ancient_ruins', 'starfall_crater']`. The definition lists both biomes; the BIOME_SPAWN_CONFIGS for each biome independently references the same creature ID. No special handling needed — the spawn test verifies both directions.

### Anti-Patterns to Avoid
- **Partial four-file updates:** Adding a creature definition without updating ENTITY_IDS, BIOME_SPAWN_CONFIGS, and CREATURE_LOOT_TABLES — tests fail immediately and the creature cannot spawn
- **Using hardcoded ID strings in spawn configs:** Always use `ENTITY_IDS.CREATURE_NAME` not `'creature_name'` — prevents typo bugs
- **Adding ENTITY_IDS without adding to ALL_CREATURES:** The id-constants.test validates every ENTITY_IDS constant maps to a registered entity AND every registered entity has a constant — both directions checked

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Stat scaling for new creatures | Custom formula | Follow existing tier patterns (see table below) | Tier consistency matters for game balance |
| New AI behavior types | Custom behavior | Use existing 4 archetypes (herbivore/omnivore/predator/maniac) | Behavior engine only handles these 4 |
| New loot item IDs | Inline strings | ITEM_IDS constants + ItemRegistry | Loot validation test checks all item IDs exist in ItemRegistry |

**Key insight:** The entire creature system is static data declarations. There is no code logic to implement — only data to add in the right shapes across four files.

## Common Pitfalls

### Pitfall 1: lootTableId mismatch
**What goes wrong:** Creature definition has `lootTableId: 'loot_creature_foo'` but CREATURE_LOOT_TABLES key is `'loot_creature_bar'`.
**Why it happens:** Typo in one of the two places.
**How to avoid:** Convention is always `'loot_' + creature.id`. Set `lootTableId` value in the definition as a string that follows this pattern exactly. The loot-tables.test enforces exact matching in both directions.
**Warning signs:** `nx run entities:test` fails with "creature X has no CREATURE_LOOT_TABLES entry".

### Pitfall 2: New item ID in loot table not registered
**What goes wrong:** CREATURE_LOOT_TABLES references `'world_corrosive_extract'` but that item was never added to `packages/items/src/definitions/world-items.ts` and registered.
**Why it happens:** Designing loot tables before creating the items they reference.
**How to avoid:** Add item definitions first, then reference them in loot tables. The loot-tables.test validates every item ID in every loot table exists in ItemRegistry.
**Warning signs:** `nx run entities:test` fails with "references item X which does not exist in ItemRegistry".

### Pitfall 3: ENTITY_IDS constant name/value mismatch
**What goes wrong:** `CREATURE_CORROSION_MAW: 'creature_corrosion_maw_v2'` — constant name lowercased must equal value.
**Why it happens:** Renaming one but not the other.
**How to avoid:** The id-constants.test checks `constName.toLowerCase() === entityId`. Keep them strictly matched.
**Warning signs:** `nx run entities:test` fails with "does not match its value".

### Pitfall 4: Creature in definition but missing from ALL_CREATURES export
**What goes wrong:** The `CreatureDefinition` constant is defined but not added to the `ALL_CREATURES` array at the bottom of the file.
**Why it happens:** Forgetting the array entry when defining the constant.
**How to avoid:** Always update the `ALL_CREATURES` (or `ALL_AQUATIC_CREATURES` / `ALL_EXOTIC_CREATURES`) array in the same commit as the constant definition.
**Warning signs:** `nx run entities:test` fails with "entity X is registered but has no matching ENTITY_IDS constant" — entity doesn't exist in registry because it was never added to ALL_ENTITIES.

### Pitfall 5: biomes field in definition doesn't match BIOME_SPAWN_CONFIGS entry
**What goes wrong:** Creature definition has `biomes: ['toxic_wastes']` but was added to BIOME_SPAWN_CONFIGS for `crystal_caves`.
**Why it happens:** Copy-paste error.
**How to avoid:** The spawn-configs.test checks both directions — entity declared biomes must have a spawn config entry, and spawn config entries must have registered entities.

### Pitfall 6: Tier-inconsistent stats
**What goes wrong:** A Tier II biome creature gets Tier IV stats (e.g. baseHealth: 400, levelRange [25-40]).
**Why it happens:** Using wrong tier reference when setting stats.
**How to avoid:** Follow established stat bands (see Code Examples section).

## Code Examples

### Established Tier Stat Bands

From reading all existing creatures across all files:

```
Tier I (1-6):   baseHealth 70-100,  levelRange [1-4, 1-6], baseXp 10-20, respawnSeconds 180-240
Tier II (7-20): baseHealth 100-160, levelRange [3-10, 8-20], baseXp 22-52, respawnSeconds 240-420
Tier III (21-35): baseHealth 160-220, levelRange [10-22, 14-28], baseXp 45-80, respawnSeconds 360-600
Tier III maniac: baseHealth 280-320, levelRange [20-32], baseXp 100-130, respawnSeconds 900
Tier IV (36+): baseHealth 240-320, levelRange [18-35], baseXp 85-150, respawnSeconds 540-900
Tier IV maniac: baseHealth 320+, levelRange [24-35], baseXp 150+, respawnSeconds 900
```

### Spawn Weight Rarity Pyramid (to implement per locked decision)

```
herbivore: weight 8-12  (most common encounters)
omnivore:  weight 5-8   (moderate frequency)
predator:  weight 3-6   (uncommon, threatening)
maniac:    weight 1-2   (rare event, mini-boss feel)
```

### Existing Toxic Wastes Item IDs (usable in new loot tables)

From `packages/game-logic/src/loot/creature-loot.ts` and existing items:
- `world_toxic_residue` — rare, Miasma Marshes / Toxic Wastes overlap item (already used in marsh_lurker and toxic_lurker tables)
- `world_organic_material_common` / `world_organic_material_rare` / `world_organic_material_epic` — tier-appropriate generic drops

New items likely needed for toxic_wastes biome-specific loot (does not currently exist):
- Something like `world_corrosive_carapace` or `world_acid_gland` (rare, predator drop) — unique to toxic_wastes hunters
- Something like `world_sludge_membrane` (common, herbivore drop) — unique to toxic_wastes grazers

New items likely needed for void_rift legendary endgame (per locked decision, apex creatures must gate endgame crafting above current Dimensional Aberration drops):
- New legendary-tier material(s) not currently in world-items.ts — `reagent_void_heart` exists but is already in the system; need something above it or a new legendary world item specific to void_rift apex creatures

### Complete Four-File Example (Phase 88 precedent — CREATURE_STARFALL_GRAZER)

**Definition** (packages/entities/src/definitions/creatures.ts):
```typescript
export const CREATURE_STARFALL_GRAZER: CreatureDefinition = {
  id: 'creature_starfall_grazer',
  displayName: 'Starfall Grazer',
  description: 'Alien herbivore feeding on anomaly-mutated vegetation. Docile but unpredictable due to void exposure.',
  entityClass: 'creature',
  biomes: ['starfall_crater'],
  textureKey: 'creature_starfall_grazer',
  color: 0x4a5568,
  lootTableId: 'loot_creature_starfall_grazer',
  behavior: 'herbivore',
  baseHealth: 130,
  levelRange: [12, 22],
  baseXp: 35,
  respawnSeconds: 300,
};
// + added to ALL_CREATURES array
```

**ENTITY_IDS** (packages/entities/src/definitions/index.ts):
```typescript
CREATURE_STARFALL_GRAZER: 'creature_starfall_grazer',
```

**Spawn Config** (packages/world-gen/src/generation/spawn.ts):
```typescript
starfall_crater: {
  creatures: [
    { id: ENTITY_IDS.CREATURE_VOID_HORROR, weight: 2, minLevel: 20, maxLevel: 35 },
    { id: ENTITY_IDS.CREATURE_STARFALL_GRAZER, weight: 6, minLevel: 12, maxLevel: 22 },
    { id: ENTITY_IDS.CREATURE_CRATER_STALKER, weight: 4, minLevel: 15, maxLevel: 25 },
  ],
  ...
}
```

**Loot Table** (packages/game-logic/src/loot/creature-loot.ts):
```typescript
['loot_creature_starfall_grazer', [
  { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 3, chance: 0.8 },
  { itemId: 'world_crater_dust', minAmount: 2, maxAmount: 4, chance: 0.6 },
  { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.15 },
  { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 1, chance: 0.1 },
]],
```

## Current Biome Creature Inventory (Gap Analysis)

Accurate as of Phase 109. Target counts from CONTEXT.md locked decisions.

| Biome | Tier | Current | Target | Gap | Missing Archetypes |
|---|---|---|---|---|---|
| void_plains | I | 2 | 4 | +2 | predator, maniac (no — T1 skip maniacs) |
| fungal_forest | I | 2 | 4 | +2 | predator |
| tidal_pools | I | 3 | 4 | +1 | predator |
| ancient_ruins | I | 4 | 6 | +2 | herbivore, maniac possible |
| toxic_wastes | II | 1 | 5 | +4 | herbivore, omnivore, predator (x2+), maniac (T2+ ok) |
| miasma_marshes | II | 2 | 4 | +2 | omnivore |
| petrified_expanse | II | 2 | 4 | +2 | herbivore, omnivore |
| kelp_forests | II | 3 | 4 | +1 | predator-weight or maniac option |
| bioluminescent_depths | II | 3 | 4 | +1 | predator |
| crystal_caves | III | 2 | 6 | +4 | omnivore, maniac |
| frozen_expanse | III | 2 | 4 | +2 | herbivore, omnivore |
| volcanic_ridge | III | 2 | 6 | +4 | herbivore, maniac |
| deep_trenches | III | 4 | 6 | +2 | — (all archetypes present) |
| starfall_crater | III | 3 | 6 | +3 | omnivore, maniac |
| crystalline_wastes | III | 3 | 6 | +3 | maniac |
| void_rift | IV | 4 | 6 | +2 | — (2 apex corrupted variants) |

**Total new creatures to create:** ~37 (varies depending on cross-biome sharing decisions)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Legacy EntityRegistry in shared-types (deprecated) | EntityRegistryImpl in @into-the-void/entities | Phase 33 | Use `@into-the-void/entities` registry, not the legacy one |
| Direct creature list in game-server | Static CREATURE_LOOT_TABLES Map | Phase 35 | All loot is in game-logic package |
| Manual spawn weights | BIOME_SPAWN_CONFIGS in world-gen | Phase 34+ | All spawn data centralized in spawn.ts |

**Deprecated/outdated:**
- `EntityRegistry` in `packages/shared-types/src/game/entity-registry.ts`: Marked `@deprecated`. Has no creatures added since Phase 33. Do not use for new creatures.

## Open Questions

1. **New item creation scope**
   - What we know: The loot philosophy requires 1-2 biome-specific materials per biome unique to new creatures
   - What's unclear: How many new world items and reagents will actually be needed, and whether new items need to go into world-items.ts or reagents.ts
   - Recommendation: Budget for ~4-6 new world-items (primarily toxic_wastes corrosion drops + void_rift legendary tier item), plan them before writing loot tables

2. **void_rift corrupted variants — which base creatures**
   - What we know: 2 new apex creatures are "corrupted variants of recognizable creatures from lower-tier biomes". This is Claude's Discretion.
   - What's unclear: Which specific lower-tier creatures make the most narrative sense as corrupted variants
   - Recommendation: Good candidates are `creature_magma_beast` (Tier III, already high-tier) and `creature_frost_stalker` (Tier III) — both are recognizable predators that players would have encountered before reaching void_rift

3. **Cross-biome sharing opportunities**
   - What we know: Same-tier biomes may share 1 creature when ecological sense dictates. Reduces total count.
   - What's unclear: Which biomes make ecological sense to share
   - Recommendation: crystal_caves and crystalline_wastes (same crystal theme, same tier), miasma_marshes and toxic_wastes (chemical/toxic theme) are obvious candidates. Sharing reduces 37 total by ~3-4 definitions.

## Validation Architecture

nyquist_validation is false in .planning/config.json — this section is skipped per instructions.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis — `packages/entities/src/definitions/creatures.ts`, `aquatic-creatures.ts`, `exotic-creatures.ts` — all 31 existing creature definitions read directly
- Direct codebase analysis — `packages/entities/src/definitions/index.ts` — ENTITY_IDS pattern and ALL_ENTITIES assembly
- Direct codebase analysis — `packages/world-gen/src/generation/spawn.ts` — BIOME_SPAWN_CONFIGS structure and all 16 biome configs
- Direct codebase analysis — `packages/game-logic/src/loot/creature-loot.ts` — CREATURE_LOOT_TABLES Map (all 31 tables)
- Direct codebase analysis — `packages/entities/src/__tests__/` — all 4 test files, understanding what tests enforce
- Direct codebase analysis — `packages/items/src/definitions/world-items.ts` and `reagents.ts` — existing item pool
- Direct codebase analysis — `packages/shared-types/src/game/biome.ts` — BIOME_TIERS confirming tier assignments
- Direct codebase analysis — `lore/world-bible.md` — biome lore for creature theme compatibility

### Secondary (MEDIUM confidence)
- .planning/phases/110-biome-creature-population/110-CONTEXT.md — locked decisions constraining implementation scope

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files read directly from codebase
- Architecture: HIGH — four-file atomicity pattern directly observed across 31 existing creatures and confirmed by test suite
- Pitfalls: HIGH — test files explicitly enumerate the exact failure modes, confirmed by reading them
- Gap analysis: HIGH — current creature counts verified by reading all three definition files

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (content data, not library APIs — stable until new creatures added)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CREA-01 | Tier I biomes (void_plains, fungal_forest, tidal_pools, ancient_ruins) each have 4-6 creatures with varied behavior types | Gap analysis: void_plains +2, fungal_forest +2, tidal_pools +1, ancient_ruins +2. All use four-file atomicity pattern. |
| CREA-02 | Tier II biomes (toxic_wastes, miasma_marshes, petrified_expanse, bioluminescent_depths, kelp_forests) each have 4-6 creatures with tier-appropriate stats | Gap analysis: toxic_wastes +4 (critical), miasma_marshes +2, petrified_expanse +2, bioluminescent_depths +1, kelp_forests +1. Tier II stat bands: baseHealth 100-160, levels 3-20. |
| CREA-03 | Tier III biomes (crystal_caves, volcanic_ridge, frozen_expanse, deep_trenches, starfall_crater, crystalline_wastes) each have 4-6 creatures with endgame-viable stats | Gap analysis: crystal_caves +4, volcanic_ridge +4, frozen_expanse +2, deep_trenches +2, starfall_crater +3, crystalline_wastes +3. Tier III stat bands: baseHealth 160-220, levels 10-28. Maniacs required per locked decisions. |
| CREA-04 | Tier IV void_rift has 6 creatures representing max-tier challenge | Gap: +2 needed. Both are corrupted variants of lower-tier creatures per locked decisions. Legendary loot required. |
| CREA-05 | Every new creature has a loot table entry in CREATURE_LOOT_TABLES | Enforced by `loot-tables.test.ts`. New biome-specific items needed in world-items.ts/reagents.ts first. |
| CREA-06 | Every new creature is registered in BIOME_SPAWN_CONFIGS with appropriate spawn weights | Enforced by `spawn-configs.test.ts`. Weight pyramid: herbivore 8-12, omnivore 5-8, predator 3-6, maniac 1-2. |
</phase_requirements>
