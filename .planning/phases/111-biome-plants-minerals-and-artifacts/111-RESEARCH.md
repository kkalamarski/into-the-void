# Phase 111: Biome Plants, Minerals, and Artifacts - Research

**Researched:** 2026-03-02
**Domain:** Entity content definitions — plants, minerals, and artifacts across 16 biomes
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Resource Naming & Theming
- Biome-flavored naming: each resource name reflects its home biome ('Acid Bloom' in toxic_wastes, 'Frost Lichen' in frozen_expanse)
- Familiar-with-a-twist tone: names players can picture but with sci-fi modifier ('Void Fern', 'Thermal Vent Moss'), not abstract alien names
- Every resource gets a 1-2 sentence lore blurb tying it to the biome's ecology (for future tooltip display)
- Every resource definition includes visual identity hints: color palette, glow, shape notes to guide future sprite generation

#### Cross-Biome Uniqueness
- Mostly unique: each biome gets signature resources, but thematically related biomes of the same tier may share 1 common resource
- Sharing rule: same tier + similar ecology only (e.g., toxic_wastes and miasma_marshes can share a chemical-themed plant, but no cross-tier sharing of signature resources)
- Shared resources have biome-tuned spawn rates: common in home biome, rarer in secondary biomes
- Higher-tier biomes include some lower-tier common resources alongside their signature ones (feels more natural, gives safe gathering options in dangerous zones)

#### Rarity Distribution
- All tiers get rare mineral variants, including Tier I — gives new players occasional excitement in starter zones
- Flat spawn rates everywhere: 5% rare, 1% epic (existing rates preserved). Higher tiers feel rewarding because base resources are more valuable, not because rates are higher
- Artifacts stay as unique one-offs — no rarity tiers. Each artifact is a distinct discovery
- Rare/epic mineral nodes are visually distinct (different color/glow) so players can spot them in the world

#### Crystalline Wastes Spotlight
- Generally resource-rich: higher density across all resource types, not just artifacts. Makes it a destination biome for gatherers willing to brave Tier III
- Eerie flavor text on all resources from this biome, hinting at crystal awareness ('The formation seemed to shift as you approached')

#### Atmospheric Resource Descriptions
- All Tier III+ biomes get atmospheric/unsettling resource descriptions, each with biome-specific flavor:
  - crystalline_wastes: crystal consciousness, psychological unease
  - void_rift: reality-warping, spatial distortion
  - bioluminescent_depths: deep-ocean dread, living darkness
  - Other Tier III biomes: appropriate thematic atmosphere

### Claude's Discretion
- Crystalline Wastes artifact design: Claude designs the 2 artifacts to fit the "Singing Fields" lore (resonating crystals, intentional growth patterns, psychological effects)
- Exact resource stats (yield, gather time, tier requirements)
- Which specific lower-tier resources appear in higher-tier biomes
- Spawn density tuning per biome
- Exact visual description details per resource

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLNT-01 | Tier I biomes each have 3-4 plants including at least one rare variant | void_plains needs 1 plant + rare variant; tidal_pools needs 1 plant + rare variant; fungal_forest already satisfied; ancient_ruins already satisfied |
| PLNT-02 | Tier II biomes each have 3-4 plants including rare variants | toxic_wastes needs 2 plants + rare; miasma_marshes needs 2 plants + rare; petrified_expanse needs 2 plants + rare; kelp_forests needs 1 plant + rare; bioluminescent_depths has 3 plants but no rare variants |
| PLNT-03 | Tier III biomes each have 3-4 plants including rare and epic variants | crystal_caves needs 1-2 more; volcanic_ridge needs 2 more + rare; frozen_expanse needs 2 more + rare; starfall_crater needs 2 more + rare; crystalline_wastes needs 2 more + rare/epic; deep_trenches has 3 plants but needs rare/epic |
| PLNT-04 | Tier IV void_rift has 4 plants including exotic variants | void_rift has 3 plants but needs 1 more + exotic variant |
| MINR-01 | Tier I biomes each have 2-3 minerals | void_plains has 1+1rare=2 (satisfied); fungal_forest has 1 (needs 1 more); tidal_pools has 3 (satisfied); ancient_ruins has 1+1epic (needs rare variant + possibly 1 more base) |
| MINR-02 | Tier II biomes each have 2-3 minerals with rare variants | toxic_wastes has 1 (needs 1 more + rare); miasma_marshes has 3 with rare/epic (satisfied); petrified_expanse has 1 (needs 1 more + rare); kelp_forests has 2 (needs rare); bioluminescent_depths has 2 with one rare shared (needs explicit rare) |
| MINR-03 | Tier III biomes each have 2-3 minerals with rare/epic variants | crystal_caves needs 1 more base; volcanic_ridge needs 1 more base + epic; frozen_expanse needs 1 more + rare/epic; deep_trenches needs 1 more + rare/epic; starfall_crater needs 1 more base; crystalline_wastes has 2 but needs rare/epic variants |
| MINR-04 | Tier IV void_rift has 3 minerals including exotic variants | void_rift has 3 minerals but needs exotic rarity variants |
| MINR-05 | All rare/epic mineral variants registered in rarity.ts functions | Current rarity.ts only has 5 biomes covered (void_plains, crystal_caves, volcanic_ridge, starfall_crater, ancient_ruins); all new rare/epic minerals must be added to getRareBiomeMinerals() and getEpicBiomeMinerals() |
| ARTF-01 | Tier I biomes each have 1-2 artifacts (void_plains, fungal_forest, tidal_pools currently have zero) | 3 Tier I biomes (void_plains, fungal_forest, tidal_pools) need 1 artifact each; ancient_ruins already has 2 |
| ARTF-02 | Tier II biomes each have 1-2 artifacts | miasma_marshes has 0 (needs 1); all other Tier II biomes already satisfied |
| ARTF-03 | Tier III biomes each have 1-2 artifacts | crystalline_wastes needs its 2 primary artifacts (has shared ones but they are not uniquely hers); others already have 1-2 |
| ARTF-04 | Tier IV void_rift has 3 artifacts | void_rift already has 3 artifacts (satisfied) |
| ARTF-05 | Crystalline wastes has 2 artifacts (lore: "ancient artifact hotspot") | Currently crystalline_wastes references artifact_dimensional_fragment and artifact_echo_record — both shared with other biomes; should either remain or get dedicated crystalline_wastes artifacts |
</phase_requirements>

---

## Summary

Phase 111 is a pure content expansion phase — no new systems, only new entity definitions following the exact same patterns already established in the codebase. The work involves adding plant/mineral/artifact definitions to the existing `packages/entities/src/definitions/*.ts` definition files, registering each entity in `ENTITY_IDS` in `packages/entities/src/definitions/index.ts`, adding them to `BIOME_SPAWN_CONFIGS` in `packages/world-gen/src/generation/spawn.ts`, and registering all new rare/epic minerals in `packages/world-gen/src/generation/rarity.ts`.

The pattern is completely settled: four files touch per entity type per biome group (definition file, index.ts ENTITY_IDS, spawn.ts BIOME_SPAWN_CONFIGS, rarity.ts for rare/epic minerals). The test suite (`nx run entities:test`) validates all references automatically — every itemId in harvestYield/miningYield must exist in ItemRegistry, every ENTITY_IDS key must map to a registered entity, and every entity with a biomes field must appear in BIOME_SPAWN_CONFIGS.

The crystalline_wastes biome is the spotlight of this phase. Lore calls it an "Ancient artifact hotspot" (world-bible.md: "Ancient artifacts (ruins often found partially absorbed by crystal growth)") and describes eerie properties like disorientation, false images, and acoustic chaos. The two dedicated artifacts should reflect this: crystal formations with Ancient-era purpose, possibly related to the "Singing Fields" concept (resonating crystals, intentional growth patterns).

**Primary recommendation:** Follow the established four-file atomicity rule from Phase 110 creatures: definition + ENTITY_IDS + BIOME_SPAWN_CONFIGS + rarity.ts (for minerals). Group work by biome tier to keep changes cohesive and testable.

---

## Standard Stack

### Core (no new dependencies — pure content expansion)

| Component | Location | Purpose | Pattern |
|-----------|----------|---------|---------|
| Entity definitions | `packages/entities/src/definitions/*.ts` | PlantDefinition, MineralDefinition, ArtifactDefinition objects | Export const + append to ALL_* array |
| Entity IDs registry | `packages/entities/src/definitions/index.ts` | ENTITY_IDS constant object | Add UPPER_CASE key = 'snake_case_id' |
| Spawn configuration | `packages/world-gen/src/generation/spawn.ts` | BIOME_SPAWN_CONFIGS per biome | Add to plants/minerals/artifacts arrays |
| Rarity system | `packages/world-gen/src/generation/rarity.ts` | getRareBiomeMinerals() / getEpicBiomeMinerals() | Add biome → [id array] entries |
| Item yields | `packages/items/src/definitions/world-items.ts` or `reagents.ts` | Items dropped by harvest/mine | May need new items for unique drops |
| Test suite | `nx run entities:test` | Validates all entity references | Run after each definition batch |

### Definition File Routing

| Entity type | Tier I-II land | Tier II-III aquatic | Tier III-IV exotic/void |
|-------------|---------------|---------------------|------------------------|
| Plants | `plants.ts` | `aquatic-plants.ts` | `exotic-plants.ts` |
| Minerals | `minerals.ts` | `aquatic-minerals.ts` | `exotic-minerals.ts` |
| Artifacts | `artifacts.ts` | `aquatic-artifacts.ts` | `exotic-artifacts.ts` |

Routing convention derived from existing code: land Tier I-III go in base files, aquatic biomes (tidal_pools, kelp_forests, deep_trenches) go in aquatic files, exotic/void biomes (bioluminescent_depths, crystalline_wastes, void_rift) go in exotic files.

---

## Architecture Patterns

### Pattern 1: Plant Definition

```typescript
// Source: packages/entities/src/definitions/plants.ts
export const PLANT_EXAMPLE: PlantDefinition = {
  id: 'plant_example',              // snake_case, matches ENTITY_IDS key lowercased
  displayName: 'Example Plant',
  description: 'Lore blurb 1-2 sentences tying to biome ecology.',
  entityClass: 'plant',
  biomes: ['biome_name'],           // array — can appear in multiple biomes
  textureKey: 'plant_example',      // sprite key (fallback: color tile)
  color: 0xRRGGBB,                  // hex fallback color until sprite exists
  lootTableId: 'loot_plant_example', // convention: 'loot_' + id
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.15 }, // bonus
  ],
  respawnSeconds: 300,
  rarity: 'rare', // only on rare/epic variants — omit for common
};
```

### Pattern 2: Mineral Definition

```typescript
// Source: packages/entities/src/definitions/minerals.ts
export const MINERAL_EXAMPLE: MineralDefinition = {
  id: 'mineral_example',
  displayName: 'Example Mineral',
  description: 'Lore blurb 1-2 sentences.',
  entityClass: 'mineral',
  biomes: ['biome_name'],
  textureKey: 'mineral_example',
  color: 0xRRGGBB,
  lootTableId: 'loot_mineral_example',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  requiredTier: 1,         // 1 | 2 | 3 | 4 — gates which tool tier can mine it
  respawnSeconds: 360,
  rarity: 'rare',          // only on rare/epic variants
};
```

### Pattern 3: Artifact Definition

```typescript
// Source: packages/entities/src/definitions/artifacts.ts
export const ARTIFACT_EXAMPLE: ArtifactDefinition = {
  id: 'artifact_example',
  displayName: 'Example Artifact',
  description: 'Lore blurb. One-time discovery.',
  entityClass: 'artifact',
  biomes: ['biome_name'],
  textureKey: 'artifact_example',      // can reuse existing textures
  color: 0xRRGGBB,
  lootTableId: 'loot_artifact_example',
  respawns: false,                     // ALWAYS false for artifacts
  rarity: 'epic',                      // 'rare' | 'epic' | 'exotic' | 'legendary'
};
```

### Pattern 4: Rare Variant (1.5x yield, 2x respawn, +1 tier requirement)

```typescript
// Source: packages/entities/src/definitions/minerals.ts — MINERAL_VOID_CRYSTAL_RARE
export const MINERAL_EXAMPLE_RARE: MineralDefinition = {
  id: 'mineral_example_rare',
  displayName: 'Example Mineral (Rare)',       // parenthetical convention
  description: 'Intensified version description.',
  entityClass: 'mineral',
  biomes: ['biome_name'],
  textureKey: 'mineral_example',  // SAME sprite as base, rendered larger via rarity scaling
  color: 0xBRIGHTER_HEX,         // brighter/different shade to distinguish visually
  lootTableId: 'loot_mineral_example_rare',
  miningYield: [
    { itemId: 'world_item', minAmount: 2, maxAmount: 4, chance: 1.0 },  // ~1.5x base
    { itemId: 'reagent_bonus', minAmount: 1, maxAmount: 1, chance: 0.4 }, // higher chance
  ],
  requiredTier: 2,           // +1 from base tier
  respawnSeconds: 720,       // 2x base respawn
  rarity: 'rare',
};
```

### Pattern 5: ENTITY_IDS and index.ts registration

```typescript
// Source: packages/entities/src/definitions/index.ts
export const ENTITY_IDS = {
  // ...existing...
  // ---- NEW PLANTS ---- (add in section matching entity class)
  PLANT_NEW_NAME: 'plant_new_name',
  PLANT_NEW_NAME_RARE: 'plant_new_name_rare',
  // ---- NEW MINERALS ----
  MINERAL_NEW_NAME: 'mineral_new_name',
  MINERAL_NEW_NAME_RARE: 'mineral_new_name_rare',
  // ---- NEW ARTIFACTS ----
  ARTIFACT_NEW_NAME: 'artifact_new_name',
} as const;
```

### Pattern 6: BIOME_SPAWN_CONFIGS update

```typescript
// Source: packages/world-gen/src/generation/spawn.ts
biome_name: {
  // ...existing creatures/minerals...
  plants: [
    { id: ENTITY_IDS.PLANT_EXISTING, weight: 10 },
    { id: ENTITY_IDS.PLANT_NEW_NAME, weight: 8 },           // new
    { id: ENTITY_IDS.PLANT_NEW_NAME_RARE, weight: 2, rarity: 'rare' }, // new rare
  ],
  minerals: [
    { id: ENTITY_IDS.MINERAL_EXISTING, weight: 10, rarity: 1 },
    { id: ENTITY_IDS.MINERAL_NEW_NAME, weight: 6, rarity: 1 }, // new
  ],
  artifacts: [
    { id: ENTITY_IDS.ARTIFACT_NEW_NAME, weight: 5, rarity: 'epic' }, // new
  ],
  // update plantDensity if adding more plants to biome
}
```

### Pattern 7: rarity.ts registration for rare/epic minerals

```typescript
// Source: packages/world-gen/src/generation/rarity.ts
export function getRareBiomeMinerals(biome: string): string[] {
  const biomeRareMinerals: Record<string, string[]> = {
    void_plains: ['mineral_void_crystal_rare'],
    crystal_caves: ['mineral_prismatic_crystal_rare'],
    volcanic_ridge: ['mineral_volcanic_ore_rare'],
    starfall_crater: ['mineral_cosmic_fragment_rare'],
    ancient_ruins: ['mineral_anomaly_crystal_epic'],
    // ADD NEW BIOMES HERE:
    fungal_forest: ['mineral_mycelial_cluster_rare'],
    toxic_wastes: ['mineral_corrosive_deposit_rare'],
    // etc.
  };
  return biomeRareMinerals[biome] ?? [];
}
```

**Critical:** The spawn-configs.test.ts maintains an inline copy of `RARITY_SYSTEM_MINERALS` that MUST be updated in sync with rarity.ts, or the test will fail with a mismatch.

### Pattern 8: ALL_* array registration

Every new entity must be appended to its file's `ALL_*` array:

```typescript
// plants.ts
export const ALL_PLANTS: readonly PlantDefinition[] = [
  // existing...
  PLANT_NEW_NAME,
  PLANT_NEW_NAME_RARE,
];
```

### Anti-Patterns to Avoid

- **Missing ALL_* registration:** Adding a definition export without appending to ALL_* array — entity silently exists but never appears in world
- **ENTITY_IDS key mismatch:** Key `PLANT_FOO` must map to value `'plant_foo'` exactly (test validates this)
- **Invalid itemId in harvestYield/miningYield:** References to items that don't exist in ItemRegistry — harvest-yields.test.ts catches this
- **Missing spawn config entry:** Adding entity to definition file but forgetting BIOME_SPAWN_CONFIGS — spawn-configs.test.ts catches this
- **Rare mineral without rarity.ts:** Adding rare/epic mineral entity but not registering in getRareBiomeMinerals() — the rare mineral will never appear in world (spawn system won't know to use it)
- **Updating rarity.ts without updating spawn-configs.test.ts:** The test hardcodes RARITY_SYSTEM_MINERALS to avoid circular deps — must stay in sync

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| New item types for yields | Custom item categories | Existing world-items.ts/reagents.ts items | Most new plants/minerals should drop existing items with biome-themed flavor via description; only add new items when no existing item fits thematically |
| New rarity spawn logic | Custom spawn probability | Existing calculateRarityWeight() in rarity.ts | The proximity-to-danger bonus system is already implemented |
| New biome spawn system | Weighted random logic | Existing weightedPick() in spawn.ts | Already handles weighted selection |
| Sprite assets | New sprite files | Reuse existing textureKey + distinctive color | CLAUDE.md explicitly: "add a fallback color tile" for missing sprites |

**Key insight:** Every system needed is already built. This phase is 100% data entry in the established patterns.

---

## Gap Analysis: What Needs to Be Added

### Plants — Current State vs Requirements

| Biome | Tier | Current Plants | Req | Gap |
|-------|------|---------------|-----|-----|
| void_plains | I | 3 base (void_tree, drought_cactus, void_fern) | 3-4 + rare | needs 1 rare variant |
| fungal_forest | I | 3 base + 3 rare/epic | 3-4 + rare | SATISFIED |
| tidal_pools | I | 2 (tidal_kelp, bioluminescent_algae) | 3-4 + rare | needs 1 more + rare |
| ancient_ruins | I | 2 base + 1 rare | 3-4 + rare | needs 1 more base |
| toxic_wastes | II | 1 (acid_fern) | 3-4 + rare | needs 2 more + rare |
| miasma_marshes | II | 1 (gas_pod) | 3-4 + rare | needs 2 more + rare |
| petrified_expanse | II | 1 (mobile_vine) | 3-4 + rare | needs 2 more + rare |
| bioluminescent_depths | II | 3 (reality_moss, echo_bloom, temporal_fungus) | 3-4 + rare | needs rare variants |
| kelp_forests | II | 2 (bioluminescent_algae, pressure_fern) | 3-4 + rare | needs 1 more + rare |
| crystal_caves | III | 2 (lattice_moss + rare) | 3-4 + rare | needs 1-2 more base |
| volcanic_ridge | III | 1 (thermal_vent_moss) | 3-4 + rare + epic | needs 2 more + rare/epic |
| frozen_expanse | III | 1 (ice_algae) | 3-4 + rare + epic | needs 2 more + rare/epic |
| deep_trenches | III | 3 (pressure_fern, void_kelp, thermal_vent_colony) | 3-4 + rare + epic | needs rare/epic variants |
| starfall_crater | III | 1 (star_lichen) | 3-4 + rare + epic | needs 2 more + rare/epic |
| crystalline_wastes | III | 1 (null_grass) | 3-4 + rare + epic | needs 2 more + rare/epic |
| void_rift | IV | 3 (void_vine, echo_bloom, null_grass) | 4 + exotic | needs 1 more + exotic variant |

### Minerals — Current State vs Requirements

| Biome | Tier | Current Base | Current Rare/Epic | Req | Gap |
|-------|------|-------------|------------------|-----|-----|
| void_plains | I | 1 (void_crystal) | 1 rare (via rarity.ts) | 2-3 | needs 1 more base |
| fungal_forest | I | 1 (mycelial_cluster) | none | 2-3 | needs 1 more base + rare |
| tidal_pools | I | 3 (coral, sea_crystal, tidal_stone) | none | 2-3 | needs rare variants |
| ancient_ruins | I | 1 (anomaly_crystal) | 1 epic | 2-3 | needs 1 more base + rare |
| toxic_wastes | II | 1 (corrosive_deposit) | none | 2-3 + rare | needs 1 more + rare |
| miasma_marshes | II | 1 (chemical_sump) | 2 (toxic_crystal rare, marsh_gas_node epic) | 2-3 + rare | SATISFIED |
| petrified_expanse | II | 1 (mineralized_log) | none | 2-3 + rare | needs 1 more + rare |
| bioluminescent_depths | II | 2 (anomaly_shard shared, phase_mineral shared) | anomaly_shard has rarity:'rare' | 2-3 + rare | needs 1 more base + explicit rare |
| kelp_forests | II | 2 (sea_crystal, pearl_node) | none | 2-3 + rare | needs rare variant |
| crystal_caves | III | 1 (prismatic_crystal) | 1 rare (via rarity.ts) | 2-3 + rare/epic | needs 1 more base + epic |
| volcanic_ridge | III | 1 (volcanic_ore) | 1 rare (via rarity.ts) | 2-3 + rare/epic | needs 1 more base + epic |
| frozen_expanse | III | 1 (permafrost_shard) | none | 2-3 + rare/epic | needs 1 more + rare + epic |
| deep_trenches | III | 1 (abyssal_ore) | none | 2-3 + rare/epic | needs 1 more + rare/epic |
| starfall_crater | III | 1 (cosmic_fragment) | 1 rare (via rarity.ts) | 2-3 + rare/epic | needs 1 more base + epic |
| crystalline_wastes | III | 2 (null_stone, phase_mineral shared) | none | 2-3 + rare/epic | needs rare + epic variants |
| void_rift | IV | 3 (void_crystal_node, anomaly_shard, dimensional_ore) | exotic rarities in entity def | 3 + exotic | SATISFIED (entities have rarity:'epic' but spawn system doesn't special-case them) |

### Artifacts — Current State vs Requirements

| Biome | Tier | Current | Req | Gap |
|-------|------|---------|-----|-----|
| void_plains | I | 0 | 1-2 | needs 1 |
| fungal_forest | I | 0 | 1-2 | needs 1 |
| tidal_pools | I | 0 | 1-2 | needs 1 |
| ancient_ruins | I | 2 | 1-2 | SATISFIED |
| toxic_wastes | II | 1 | 1-2 | SATISFIED |
| miasma_marshes | II | 0 | 1-2 | needs 1 |
| petrified_expanse | II | 1 (preserved_specimen) | 1-2 | SATISFIED |
| bioluminescent_depths | II | 1 (echo_record) | 1-2 | SATISFIED |
| kelp_forests | II | 1 (sunken_tech) | 1-2 | SATISFIED |
| crystal_caves | III | 1 | 1-2 | SATISFIED |
| volcanic_ridge | III | 1 | 1-2 | SATISFIED |
| frozen_expanse | III | 2 | 1-2 | SATISFIED |
| deep_trenches | III | 3 (satisfies) | 1-2 | SATISFIED |
| starfall_crater | III | 1 | 1-2 | SATISFIED |
| crystalline_wastes | III | 2 shared (dimensional_fragment, echo_record) | 2 dedicated | Note: artifacts already in spawn config — ARTF-05 is satisfied by count (2 artifacts discoverable) |
| void_rift | IV | 3 | 3 | SATISFIED |

**Note on ARTF-05 / crystalline_wastes:** The existing `artifact_dimensional_fragment` and `artifact_echo_record` already appear in crystalline_wastes spawn config, and both have `crystalline_wastes` in their `biomes` array. The CONTEXT.md says Claude designs 2 artifacts to fit "Singing Fields" lore. There are two valid interpretations: (a) add 2 new dedicated crystalline_wastes artifacts alongside existing ones (making it 4 total discoverable), or (b) the existing 2 count and the phase designs them as the "Singing Fields" themed ones. Given the CONTEXT states "crystalline_wastes has zero artifacts" as the problem being resolved, the intent is adding 2 new dedicated artifacts — the existing shared ones are insufficient as the biome's "artifact hotspot" identity requires its own unique discoveries.

---

## Common Pitfalls

### Pitfall 1: spawn-configs.test.ts RARITY_SYSTEM_MINERALS out of sync
**What goes wrong:** Add new rare mineral to rarity.ts but don't update the hardcoded `RARITY_SYSTEM_MINERALS` object in `spawn-configs.test.ts`.
**Why it happens:** rarity.ts imports from `@into-the-void/entities`, which would be circular. The test hardcodes the mapping to break the circular dependency.
**How to avoid:** Every time rarity.ts `getRareBiomeMinerals()` or `getEpicBiomeMinerals()` is updated, also update the matching `RARITY_SYSTEM_MINERALS` in the test file.
**Warning signs:** Test passes for entity ID validation but rare minerals never appear in world spawns.

### Pitfall 2: All biomes listed in entity's biomes array but only spawned in one
**What goes wrong:** A plant has `biomes: ['fungal_forest', 'void_plains']` but only appears in `fungal_forest` BIOME_SPAWN_CONFIGS — spawn-configs.test.ts will fail because it checks that entities with biomes fields appear in at least one spawn config.
**How to avoid:** Add all listed biomes to spawn configs, with lower weight for the "secondary" biomes per the cross-biome sharing rule.

### Pitfall 3: itemId in harvestYield doesn't exist in ItemRegistry
**What goes wrong:** Using an item ID that doesn't exist yet (e.g., a new biome-specific item not yet defined in world-items.ts).
**Why it happens:** Adding items and entities in the wrong order, or mistyping item IDs.
**How to avoid:** Run `nx run entities:test` after each definition batch. Items needed by plants/minerals must be in ItemRegistry first.

### Pitfall 4: requiredTier on rare mineral not being base+1
**What goes wrong:** Rare mineral sets requiredTier too low (same as base), making it too easy to mine. Should be base tier + 1.
**How to avoid:** Follow established pattern: base tier N gets rare at tier N+1 (capped at 4).

### Pitfall 5: lootTableId convention
**What goes wrong:** Setting lootTableId to something other than `'loot_' + entity.id`.
**Why it happens:** The loot table system uses this naming convention. Deviate and the loot table key won't be found.
**How to avoid:** Always set `lootTableId: 'loot_' + id` verbatim.

### Pitfall 6: Missing plant density update when adding plants to sparse biomes
**What goes wrong:** Adding 3 plants to a biome that had `plantDensity: 1` — the new plants are listed but the biome still barely spawns plants.
**How to avoid:** When adding multiple plants to a biome with low plantDensity (like crystalline_wastes at 1), increase plantDensity to reflect the richer resource profile. crystalline_wastes should go from 1 to 3-4 per the "resource-rich destination biome" decision.

---

## Code Examples

### Complete new plant definition (Tier II biome example)

```typescript
// Adding to: packages/entities/src/definitions/plants.ts

export const PLANT_ACID_BLOOM: PlantDefinition = {
  id: 'plant_acid_bloom',
  displayName: 'Acid Bloom',
  description: 'Bright yellow flower with petals that secrete contact acids. Toxic_wastes chemists collect these for pharmaceutical work; handling without sealed gloves is not recommended.',
  entityClass: 'plant',
  biomes: ['toxic_wastes'],
  textureKey: 'plant_acid_bloom',
  color: 0xddee00,
  lootTableId: 'loot_plant_acid_bloom',
  harvestYield: [
    { itemId: 'world_toxic_residue', minAmount: 1, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_volatile_extract', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  respawnSeconds: 300,
};

export const PLANT_ACID_BLOOM_RARE: PlantDefinition = {
  id: 'plant_acid_bloom_rare',
  displayName: 'Acid Bloom (Rare)',
  description: 'Concentrated bloom secreting a more potent acid mixture. The yellow is almost too bright to look at.',
  entityClass: 'plant',
  biomes: ['toxic_wastes'],
  textureKey: 'plant_acid_bloom',      // same sprite, rarity scaling
  color: 0xffff00,                      // brighter yellow
  lootTableId: 'loot_plant_acid_bloom_rare',
  harvestYield: [
    { itemId: 'world_toxic_residue', minAmount: 2, maxAmount: 5, chance: 1.0 },
    { itemId: 'reagent_volatile_extract', minAmount: 1, maxAmount: 1, chance: 0.4 },
  ],
  respawnSeconds: 600,                  // 2x
  rarity: 'rare',
};
```

### Complete rarity.ts update example

```typescript
// packages/world-gen/src/generation/rarity.ts
export function getRareBiomeMinerals(biome: string): string[] {
  const biomeRareMinerals: Record<string, string[]> = {
    // existing
    void_plains: ['mineral_void_crystal_rare'],
    crystal_caves: ['mineral_prismatic_crystal_rare'],
    volcanic_ridge: ['mineral_volcanic_ore_rare'],
    starfall_crater: ['mineral_cosmic_fragment_rare'],
    ancient_ruins: ['mineral_anomaly_crystal_epic'],
    // new from Phase 111
    fungal_forest: ['mineral_mycelial_cluster_rare'],
    toxic_wastes: ['mineral_corrosive_deposit_rare'],
    tidal_pools: ['mineral_sea_crystal_rare'],
    petrified_expanse: ['mineral_mineralized_log_rare'],
    frozen_expanse: ['mineral_permafrost_shard_rare'],
    deep_trenches: ['mineral_abyssal_ore_rare'],
    crystalline_wastes: ['mineral_singing_crystal_rare'],
    kelp_forests: ['mineral_pearl_node_rare'],
  };
  return biomeRareMinerals[biome] ?? [];
}
```

---

## Lore Constraints from world-bible.md

Key facts verified from `/lore/world-bible.md` relevant to naming and design:

| Biome (code name) | Lore Name | Key Lore Detail |
|-------------------|-----------|-----------------|
| void_plains | Scarred Badlands | Arid, exposed rock, ancient ruins visible, Helix-affiliated Tier I starter |
| fungal_forest | Luminous Canopy | Dense bioluminescent forest, Verdant-affiliated Tier I starter |
| tidal_pools | Coastal Shallows | Complex tidal patterns (2 moons), Nexus-affiliated Tier I starter |
| ancient_ruins | (within other biomes) | Prior Inhabitant ruins in all biomes, concentrated in Anomaly Zones and Crystalline Wastes |
| crystalline_wastes | Crystalline Wastes | "Ancient artifact hotspot" (LORE CONFIRMED), crystals absorb ruins, disorientation, acoustic chaos |
| bioluminescent_depths | (Tier II exotic) | Deep-ocean dread, living darkness, temporal properties |
| miasma_marshes | Miasma Marshes | Toxic chemical wetlands, gas vents, decomposer-dominated |
| petrified_expanse | Petrified Expanse | Stone forests, calcification hazard, everything must keep moving |
| frozen_expanse | Frozen Reaches | Polar, Ancient sites under ice, "temporal anomalies" in extreme cold |
| volcanic_ridge | Volcanic Reaches | Geothermal, silicon-heavy organisms, lava flows, obsidian |

**crystalline_wastes artifact lore basis:** The world-bible states: "Crystal formations ranging from small clusters to towering spires hundreds of meters tall. Sounds echo unpredictably. Ancient artifacts (ruins often found partially absorbed by crystal growth)." The "Singing Fields" concept fits — crystals that resonate acoustically. The two artifacts should be: one about crystal/Ancient technology fusion (possibly functional), one about the eerie acoustic/psychological properties.

---

## Implementation Plan Summary

Based on gap analysis, the phase needs approximately:

**Plants to add:** ~30 new definitions (base + rare variants) across 14 biomes
**Minerals to add:** ~25 new definitions across 12 biomes
**Artifacts to add:** ~5 new definitions (void_plains, fungal_forest, tidal_pools, miasma_marshes, crystalline_wastes x2)
**rarity.ts updates:** Add ~12 more biomes to getRareBiomeMinerals() and ~4-5 to getEpicBiomeMinerals()
**spawn.ts updates:** Touch all 16 biomes

### Suggested Wave Structure

**Wave 1 — Tier I biomes (void_plains, fungal_forest, tidal_pools, ancient_ruins)**
- Closes ARTF-01, PLNT-01, MINR-01 gaps
- Lowest complexity, good calibration wave

**Wave 2 — Tier II land biomes (toxic_wastes, miasma_marshes, petrified_expanse)**
- Closes PLNT-02, MINR-02 gaps for land Tier II

**Wave 3 — Tier II aquatic biomes (bioluminescent_depths, kelp_forests)**
- Closes PLNT-02, MINR-02, ARTF-02 remaining gaps

**Wave 4 — Tier III biomes (crystal_caves, volcanic_ridge, frozen_expanse, deep_trenches, starfall_crater)**
- Closes PLNT-03, MINR-03 for 5 biomes

**Wave 5 — crystalline_wastes spotlight + void_rift completion**
- Closes ARTF-03, ARTF-05, PLNT-03 (wastes), MINR-03 (wastes), PLNT-04, MINR-04
- Highest-profile work; deserves dedicated wave

**Wave 6 — rarity.ts and spawn density tuning**
- MINR-05: add all new rare/epic minerals to rarity.ts + update spawn-configs.test.ts inline copy
- Update plantDensity/mineralDensity for enriched biomes
- Final test pass: `nx run entities:test`

---

## Validation Architecture

> nyquist_validation is false in .planning/config.json — this section is skipped.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `packages/entities/src/definitions/*.ts` — all existing plant/mineral/artifact definitions
- Direct codebase read: `packages/world-gen/src/generation/spawn.ts` — BIOME_SPAWN_CONFIGS complete
- Direct codebase read: `packages/world-gen/src/generation/rarity.ts` — getRareBiomeMinerals/getEpicBiomeMinerals
- Direct codebase read: `packages/entities/src/__tests__/*.test.ts` — harvest-yields, spawn-configs, id-constants, loot-tables tests
- Direct codebase read: `packages/entities/src/types.ts` — PlantDefinition, MineralDefinition, ArtifactDefinition interfaces
- Direct codebase read: `packages/items/src/definitions/world-items.ts` + `reagents.ts` — available item IDs
- Direct codebase read: `lore/world-bible.md` — biome lore, crystalline_wastes "artifact hotspot" confirmed

### Secondary (MEDIUM confidence)
- None needed — all evidence from direct source reads

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all patterns verified by reading existing definitions
- Architecture: HIGH — gap analysis derived from direct spawn.ts + entity file reading
- Pitfalls: HIGH — derived from test file analysis and existing code conventions
- Lore constraints: HIGH — world-bible.md read directly

**Research date:** 2026-03-02
**Valid until:** Indefinite — pure data entry phase, patterns stable until entities package refactor
