# Phase 114: Integration and Lore Verification - Research

**Researched:** 2026-03-03
**Domain:** Registry integration verification, lore consistency auditing, TypeScript test execution
**Confidence:** HIGH

## Summary

Phase 114 is a verification and documentation phase, not a content-creation phase. The goal is to confirm that all content added in Phases 110-113 (creatures, plants, minerals, artifacts, faction suits, faction modules, faction tools) is fully wired into the registries, has matching ID constants, and is lore-compatible. The codebase already has robust validation infrastructure: four test files under `packages/entities/src/__tests__/` and one under `packages/items/src/__tests__/`, all running via `nx run entities:test` and `nx run items:test`. If those tests pass with zero failures, INTG-01 and INTG-02 are essentially satisfied mechanically.

The unique work in this phase is INTG-03: the manual lore review. Per the user decisions in CONTEXT.md, the dual source of truth is `lore/world-bible.md` AND `packages/items/FACTION-IDENTITY.md` (the Phase 109 design gate document). Ecological biome sense matters more than strict faction theming, and apparent conflicts must be flagged for user review rather than auto-fixed. Any entity or item that lacks world-bible coverage also needs a new entry added directly to `lore/world-bible.md` with full-detail format.

The lore expansion scope is asymmetric: all entities (creatures, plants, minerals, artifacts) need full detail entries in the world bible; faction suits need full manufacturer/origin flavor text; faction modules and tools need only faction association tags in the world bible.

**Primary recommendation:** Run tests first to surface any registry orphans or ID mismatches, fix those, then conduct the lore review and expand world-bible.md systematically by biome for entities and by faction for items.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full ecological audit: names, descriptions, abilities, AND biome placement
- Dual source of truth: `lore/world-bible.md` AND Phase 109 faction identity design gate documents (`packages/items/FACTION-IDENTITY.md`)
- Biome placement and ecological sense matter more than strict faction theming — overlap between factions is acceptable where biome logic supports it
- When a lore conflict is found, flag it and ask the user — do NOT auto-fix, as some apparent conflicts may be intentional cross-faction design
- Add new world-bible entries directly into `lore/world-bible.md` for all entities/items that lack coverage
- Full detail entries for entities: name, description, habitat, behavior, faction relationship — matching the depth of existing world-bible entries
- For faction items: suits get full manufacturer/origin flavor text tied to their faction; modules and tools get faction association tags only (no detailed manufacturing lore)

### Claude's Discretion
- Registry verification approach (test-based vs script-based)
- Order of verification steps
- How to structure the lore review report
- Handling of edge cases in biome-creature placement logic

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTG-01 | All new entities have ENTITY_IDS constants and are exported from definition indexes | Existing test `id-constants.test.ts` checks bidirectional coverage: every ENTITY_IDS constant maps to a registered entity AND every registered entity has a matching ENTITY_IDS constant. Running `nx run entities:test` surfaces any orphans. |
| INTG-02 | All new items have ITEM_IDS constants and are exported from definition indexes | The items package has `item-validation.test.ts` with explicit count checks (40 faction modules, 40 faction tools). A dedicated `id-constants` test for items does not currently exist — this is a gap that must be filled in Wave 0 for complete INTG-02 coverage. |
| INTG-03 | All new entity and item definitions are lore-compatible per /lore directory | Requires manual audit against `lore/world-bible.md` and `packages/items/FACTION-IDENTITY.md`. New world-bible entries must be authored for content added in Phases 110-113 that lacks coverage. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | Existing (project-wide) | Test runner for registry validation | Already configured for both entities and items packages |
| nx run-many | Existing | Execute tests across packages | Established pattern in this repo |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript (tsc --noEmit) | Existing | Compile-time orphan detection | Catches import errors and missing exports before runtime |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Running tests via nx | Writing a standalone audit script | Tests are already wired to CI and provide cleaner error messages; scripts would duplicate test logic |

## Architecture Patterns

### How the Registry System Works

Both registries use the same pattern: a singleton class (`EntityRegistryImpl` / `ItemRegistryImpl`) populated on module load via a side-effect import in the package's `index.ts`. The flow is:

```
packages/entities/src/index.ts
  → imports ALL_ENTITIES from ./definitions/index.ts
  → definitions/index.ts assembles ALL_ENTITIES from 12 definition files
  → definitions/index.ts exports ENTITY_IDS constant object
  → EntityRegistry.registerAll(ALL_ENTITIES) fires on import
```

For INTG-01 and INTG-02 to pass, every entity/item must be:
1. Defined in its appropriate definition file (e.g., `creatures.ts`, `faction-modules.ts`)
2. Included in its definition array (e.g., `ALL_CREATURES`, `ALL_FACTION_MODULES`)
3. Included in the aggregator array (`ALL_ENTITIES` / `ALL_ITEMS`) in `definitions/index.ts`
4. Have a matching string constant in `ENTITY_IDS` / `ITEM_IDS` in `definitions/index.ts`
5. Re-exported via `export * from './definition-file'` at the bottom of `definitions/index.ts`

All five conditions must hold simultaneously. The existing test infrastructure verifies conditions 3 and 4 bidirectionally.

### Existing Test Coverage Map

| Test File | What It Verifies | Package |
|-----------|-----------------|---------|
| `entities/src/__tests__/id-constants.test.ts` | Every ENTITY_IDS value exists in EntityRegistry; every registered entity has an ENTITY_IDS constant; no duplicates; snake_case naming | entities |
| `entities/src/__tests__/spawn-configs.test.ts` | Every spawnable entity is in BIOME_SPAWN_CONFIGS; every spawn config reference exists in EntityRegistry; rarity system minerals covered | entities |
| `entities/src/__tests__/loot-tables.test.ts` | Every creature has a CREATURE_LOOT_TABLES entry; loot items exist in ItemRegistry; no orphaned loot tables | entities |
| `entities/src/__tests__/harvest-yields.test.ts` | Every plant/mineral harvestYield itemId exists in ItemRegistry | entities |
| `items/src/__tests__/item-validation.test.ts` | Suite differentiation; stat scaling; faction module/tool counts (40 each); grantedAbilities rules | items |

### Critical Gap: No Item ITEM_IDS Bidirectional Test

The `entities` package has `id-constants.test.ts` that verifies every ENTITY_IDS constant has a matching entity AND every entity has a matching ENTITY_IDS constant. The `items` package has NO equivalent test for ITEM_IDS. The `item-validation.test.ts` validates item *content* (stats, abilities) but does NOT verify that every ITEM_IDS constant maps to a registered item or that every item in `ALL_ITEMS` has a matching ITEM_IDS constant.

**Wave 0 action required:** Add `packages/items/src/__tests__/id-constants.test.ts` mirroring the entity pattern before implementation begins. Without this, a dead ITEM_IDS reference or an item missing from ITEM_IDS would pass all existing tests silently.

### Lore Structure

`lore/world-bible.md` currently covers:
- 10 biomes (in world-bible terms, not all 16 game biomes are present by their exact names — the world-bible uses lore names like "Luminous Canopy" while the code uses `fungal_forest`)
- Biome name mapping (lore → code): Luminous Canopy = fungal_forest, Coastal Shallows = tidal_pools, Volcanic Reaches = volcanic_ridge, Crystalline Wastes = crystalline_wastes, Fungal Depths = crystal_caves (Note: confirm mapping), Miasma Marshes = miasma_marshes, Petrified Expanse = petrified_expanse, Frozen Reaches = frozen_expanse, Scarred Badlands = void_plains/ancient_ruins (Note: confirm), Anomaly Zones = void_rift + crystalline_wastes/starfall_crater
- Faction lore for all three megacorporations (Verdant, Helix, Nexus) — deeply detailed
- Creature behavioral classification system (herbivore, omnivore, predator, maniac)
- World-building context (The Ancients, Anomalies, Terminus geology)

**Important:** The world-bible does NOT currently have individual creature/plant/mineral/artifact entries at the level of detail used by `lore/overview.md`. New entries must match the existing depth and voice of the world-bible.

### Pattern: World-Bible Entry Format

Existing world-bible entries for biomes follow a consistent format. For individual creatures/plants/minerals/artifacts being added, the locked decision specifies: "name, description, habitat, behavior, faction relationship — matching the depth of existing world-bible entries." Looking at the biome descriptions, this means:
- A terse lore name and quote/tagline
- 2-4 sentences on appearance/behavior
- Habitat (biome name(s))
- Threat level or resource tier context
- Faction relationship (which faction harvests/encounters this entity, if any)

### Re-export Pattern (definitions/index.ts)

At the bottom of `packages/entities/src/definitions/index.ts`, every definition file is re-exported:
```typescript
export * from './creatures';
export * from './exotic-creatures';
// etc.
```

Same pattern in `packages/items/src/definitions/index.ts`:
```typescript
export * from './faction-suits';
export * from './faction-modules';
export * from './faction-tools';
```

All Phase 112 and 113 files are already present in these re-exports (confirmed by reading current `index.ts` files). The verification task is to confirm the run produces zero test failures.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checking every ENTITY_IDS maps to entity | Custom audit script | `nx run entities:test` (id-constants.test.ts) | Already built; bidirectional check |
| Checking every item exists in ItemRegistry | Custom audit script | New id-constants.test.ts (Wave 0) mirroring entity pattern | Reuse proven pattern |
| Detecting duplicate IDs | Manual grep | Test suite duplicate check in id-constants.test.ts | Already validated |
| Verifying spawn config completeness | Manual review | `nx run entities:test` (spawn-configs.test.ts) | Already built |
| Verifying loot table completeness | Manual review | `nx run entities:test` (loot-tables.test.ts) | Already built |

## Common Pitfalls

### Pitfall 1: Missing ITEM_IDS Test for Items
**What goes wrong:** A faction module or tool defined in `ALL_FACTION_MODULES`/`ALL_FACTION_TOOLS` could lack an entry in ITEM_IDS, or an ITEM_IDS entry could reference a non-existent item. The current item test suite would not catch this.
**Why it happens:** The item validation test focuses on content quality (stats, abilities), not ID registry completeness.
**How to avoid:** Create `packages/items/src/__tests__/id-constants.test.ts` in Wave 0 before running verification.
**Warning signs:** INTG-02 would be reported as passing (25 item tests pass) but there might be dead ITEM_IDS references or items without constants.

### Pitfall 2: Lore Name vs Code ID Mismatch During Review
**What goes wrong:** Conducting lore review by cross-referencing lore creature names against code entity IDs becomes confusing because `displayName` in code may differ from lore entry names.
**Why it happens:** The code uses technical IDs (`creature_void_crawler`) while lore uses prose names ("Void Crawler"). If the lore entry names a creature differently than its `displayName`, it's hard to detect.
**How to avoid:** Build the review by reading each definition file's `displayName` field and searching the world-bible by that name — not by entity ID.
**Warning signs:** A lore entry that sounds similar but uses different vocabulary than the code `displayName`.

### Pitfall 3: Biome Name Mapping Confusion
**What goes wrong:** The world-bible uses lore names for biomes (e.g., "Luminous Canopy"), while the code uses type IDs (e.g., `fungal_forest`). During lore review, the reviewer may check the wrong biome section.
**Why it happens:** There is no explicit mapping table in either the world-bible or the codebase.
**How to avoid:** Establish the mapping early in the lore review step. Current known mappings from world-bible text and code:
- `fungal_forest` → "Luminous Canopy" (world-bible §1) — confirmed by "Giant fungal trees, luminous vines" descriptions
- `tidal_pools` → "Coastal Shallows" (world-bible §5)
- `volcanic_ridge` → "Volcanic Reaches" (world-bible §2)
- `crystalline_wastes` → "Crystalline Wastes" (world-bible §3)
- `miasma_marshes` → "Miasma Marshes" (world-bible §6)
- `petrified_expanse` → "Petrified Expanse" (world-bible §7)
- `frozen_expanse` → "Frozen Reaches" (world-bible §8)
- `void_plains` / `ancient_ruins` → "Scarred Badlands" (world-bible §9) — needs confirmation; `ancient_ruins` may map separately
- `void_rift` / `starfall_crater` → "Anomaly Zones" (world-bible §10) — needs confirmation for starfall_crater specifically
- `crystal_caves` → "Fungal Depths" (world-bible §4) — needs confirmation
- `bioluminescent_depths`, `kelp_forests`, `deep_trenches` → aquatic biomes not explicitly covered by world-bible names above

**Warning signs:** Entities assigned to biomes that contradict world-bible biome ecology descriptions.

### Pitfall 4: Auto-Fixing Apparent Lore Conflicts
**What goes wrong:** A creature description mentions "acid resistance" but is placed in the `frozen_expanse`. This looks wrong but could be intentional (e.g., a Phase 110 decision with narrative justification).
**Why it happens:** The CONTEXT.md explicitly says to NOT auto-fix conflicts — flag and ask.
**How to avoid:** Keep a conflict log as a section in the lore review output. Present it for user decision before making any changes.
**Warning signs:** Any temptation to "obviously fix" a lore inconsistency without user confirmation.

### Pitfall 5: World-Bible Entry Depth Inconsistency
**What goes wrong:** New world-bible entries for creatures added in Phases 110-113 are written in a rushed style that doesn't match the existing world-bible voice (terse, atmospheric, cynical corporate-speak mixed with survivor's observations).
**Why it happens:** The world-bible has a distinctive prose style. Copy-pasting item description text verbatim would produce out-of-voice entries.
**How to avoid:** Read 2-3 existing biome sections of the world-bible to internalize the voice before writing new entries. The world-bible uses evocative short sentences, corporate euphemisms, and survival-focused language.
**Warning signs:** New entries that sound like item tooltip text rather than lore documents.

## Code Examples

### Running Tests

```bash
# Run entities validation tests
nx run entities:test

# Run items validation tests
nx run items:test

# Run both
nx run-many -t test --projects=entities,items
```

### What a Clean entities:test Run Looks Like
Based on Phase 112/113 verification reports, a clean run shows:
```
Test Files  N passed (N)
Tests       N passed (N)
Duration    ~177ms
```

### Item ID Constants Test Pattern (Wave 0 File to Create)

Mirror the exact pattern from `packages/entities/src/__tests__/id-constants.test.ts`:

```typescript
// packages/items/src/__tests__/id-constants.test.ts
import { describe, it, expect } from 'vitest';
import { ALL_ITEMS, ITEM_IDS } from '../definitions';
import { ItemRegistry } from '../registry';

// Side-effect import — trigger item registration
import '../index';

const SNAKE_CASE_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const itemIdEntries = Object.entries(ITEM_IDS) as [string, string][];

describe('Item ID Constant Validation', () => {
  describe('Every ITEM_IDS constant maps to a registered item', () => {
    it.each(itemIdEntries)(
      'ITEM_IDS.%s → "%s" exists in ItemRegistry',
      (constName, itemId) => {
        expect(
          ItemRegistry.has(itemId),
          `ITEM_IDS.${constName} maps to "${itemId}" but no item with that ID exists in ItemRegistry.`
        ).toBe(true);
      }
    );
  });

  describe('Every registered item has a matching ITEM_IDS constant', () => {
    const allItemIdValues = new Set<string>(Object.values(ITEM_IDS));

    it.each(ALL_ITEMS.map((i) => [i.id, i.displayName] as const))(
      'item "%s" (%s) has a matching ITEM_IDS constant',
      (id) => {
        expect(
          allItemIdValues.has(id),
          `Item "${id}" is registered but has no matching ITEM_IDS constant.`
        ).toBe(true);
      }
    );
  });

  describe('No duplicate item IDs', () => {
    it('ALL_ITEMS has no duplicate IDs', () => {
      const ids = ALL_ITEMS.map((i) => i.id);
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(duplicates).toEqual([]);
    });
  });
});
```

### World-Bible Entry Format Example

The world-bible uses this voice (from Crystalline Wastes section):
> **Survival Tier: III (Hostile)** — Requires reinforced protective gear...
> **Flora:** Minimal. What exists is silicon-based...
> **Fauna:** Sparse but highly specialized. Creatures here have crystalline integuments...

For individual creature entries, follow the lore document's creature behavioral classification voice:
> *"[Evocative tagline]"*
>
> **[Creature Name]** — [Biome] — [Behavioral class]
>
> [2-3 sentences on appearance and behavior in lore voice]. [Faction relationship if applicable.]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual grep for orphan IDs | Automated test suite (id-constants.test.ts) | Phase 108 | Tests catch regressions automatically |
| Hand-coded stats | generateSuitStats() / getModuleStats() | Phase 112/113 | Stats are now formula-derived, reducing lore conflicts from stat outliers |

## Open Questions

1. **Biome mapping for `ancient_ruins`, `void_plains`, `crystal_caves`, `bioluminescent_depths`, `kelp_forests`, `deep_trenches`, `starfall_crater`**
   - What we know: World-bible has 10 named biome sections but code has 16 BiomeType values
   - What's unclear: Which lore biome names correspond to `ancient_ruins`, `bioluminescent_depths`, `kelp_forests`, `deep_trenches`, `starfall_crater`, `crystal_caves`
   - Recommendation: The lore review step should begin by building a full mapping table. The overview.md file (`lore/overview.md`) may provide additional context. For aquatic biomes, the world-bible's Coastal Shallows section covers tidal/coastal types but deep aquatic biomes (kelp_forests, deep_trenches, bioluminescent_depths) likely need new world-bible sections.

2. **Scope of world-bible expansion for ~70+ new entities**
   - What we know: Phases 110-113 added ~36 creatures, ~35+ plants/minerals/artifacts, and 80 faction items
   - What's unclear: Whether every individual entity needs its own world-bible entry or whether biome-level coverage with representative examples is sufficient
   - Recommendation: Per CONTEXT.md, new entries are required for "all entities/items that lack coverage." Write individual entries for notable species (maniacs, apex predators, Tier IV creatures) and group common variants under their base type (e.g., `plant_acid_bloom_rare` is covered by the acid_bloom entry).

3. **Modules and tools: faction association tags format**
   - What we know: Modules/tools get "faction association tags only (no detailed manufacturing lore)"
   - What's unclear: Exactly what format these tags take in world-bible.md — a subsection? Inline mentions within faction descriptions?
   - Recommendation: Add a gear appendix section to each faction's world-bible entry listing their signature equipment with one-sentence descriptions. This is lightweight and consistent with the CONTEXT.md decision.

## Validation Architecture

> nyquist_validation is false in .planning/config.json — skipping detailed validation section per instructions.

**Test commands for this phase:**
- `nx run entities:test` — runs 4 test files covering entity registry, spawn configs, loot tables, harvest yields
- `nx run items:test` — runs 1 test file covering item content validation (and Wave 0 id-constants test once created)
- Both commands are fast (< 30 seconds each based on Phase 113 verification: 177ms)

## Sources

### Primary (HIGH confidence)
- Direct file inspection of `packages/entities/src/definitions/index.ts` — confirmed 160+ ENTITY_IDS constants with Phase 110/111 additions
- Direct file inspection of `packages/items/src/definitions/index.ts` — confirmed 230+ ITEM_IDS constants including all Phase 112/113 faction items
- Direct file inspection of `packages/entities/src/__tests__/id-constants.test.ts` — confirmed bidirectional test exists for entities
- Direct file inspection of `packages/items/src/__tests__/item-validation.test.ts` — confirmed NO bidirectional ITEM_IDS test exists (gap identified)
- `lore/world-bible.md` — 10 biome sections confirmed, faction lore confirmed, individual creature/item entries absent
- `.planning/phases/112-faction-suits/112-VERIFICATION.md` — 17/17 tests passed, 28 suits registered
- `.planning/phases/113-faction-modules-and-tools/113-VERIFICATION.md` — 25/25 tests passed, 40 modules + 40 tools registered
- `packages/items/FACTION-IDENTITY.md` — Phase 109 design gate document confirmed as supplementary lore authority

### Secondary (MEDIUM confidence)
- `lore/overview.md` not read (file confirmed to exist but not inspected) — may contain additional biome mapping information

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — test infrastructure fully read, commands confirmed
- Architecture: HIGH — registry pattern fully understood from source, all index files read
- Pitfalls: HIGH — derived from direct code inspection and CONTEXT.md decisions
- Lore coverage gap: HIGH — world-bible confirmed to lack individual entity entries; biome mapping needs some confirmation

**Research date:** 2026-03-03
**Valid until:** 2026-04-02 (stable domain — no external dependencies)
