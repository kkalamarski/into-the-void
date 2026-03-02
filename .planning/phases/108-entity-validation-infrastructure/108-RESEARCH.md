# Phase 108: Entity Validation Infrastructure - Research

**Researched:** 2026-03-02
**Domain:** Vitest test suite for cross-package entity content validation
**Confidence:** HIGH

## Summary

Phase 108 builds a Vitest test suite in `packages/entities` that validates four categories of silent content failure: orphaned loot tables, spawn config desync, ID constant drift, and invalid harvest yield item references. The existing codebase already has a model for this — `packages/items/src/__tests__/item-validation.test.ts` — which validates equippable item stats. The entity validation suite follows the same Vitest + Nx pattern.

The key architectural insight is that `BIOME_SPAWN_CONFIGS` in `packages/world-gen/src/generation/spawn.ts` is currently NOT exported, only helper functions (`getBiomeCreatures`, `getBiomeMinerals`, `getBiomePlants`, `getBiomeArtifacts`) are. The tests should either export the config or use the existing helper functions. Similarly, `CREATURE_LOOT_TABLES` in `packages/game-logic/src/loot/creature-loot.ts` IS exported and directly accessible.

**Primary recommendation:** Create four separate test files per CONTEXT.md decisions, each using `describe/it` blocks with `test.each` for entity iteration, producing specific error messages naming the offending entity. Export `BIOME_SPAWN_CONFIGS` from world-gen to enable direct spawn config validation. Add a `vitest.config.ts` to `packages/entities` (it has none).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Fix all existing violations as part of this phase — the baseline starts clean, no allowlists
- Test suite runs in CI gating PRs that touch entity/item definitions — broken content never reaches main
- Error messages are detailed with fix hints (e.g., 'Creature "sand_stalker" has no CREATURE_LOOT_TABLES entry. Add it in packages/entities/src/loot-tables.ts')
- Separate test files per validation category: loot-tables.test.ts, spawn-configs.test.ts, id-constants.test.ts, harvest-yields.test.ts
- Hard fail only — no soft warnings or informational output. The suite gates content, it doesn't lint it
- Harvest yield validation checks both existence in ItemRegistry AND item type correctness (a plant shouldn't drop a weapon)
- Spawn config validation checks both existence AND value ranges (spawnChance 0-1, maxCount > 0)
- ID constant validation is bidirectional (constant → entity, entity → constant) AND enforces snake_case naming convention
- Tests import directly from other packages (@into-the-void/world-gen, @into-the-void/items, etc.) — no abstraction layer
- Loot table item references validated against ItemRegistry (every itemId in CREATURE_LOOT_TABLES must exist as a registered item)
- Loot tables must have at least one item with a positive drop rate (catches zero-rate tables that would make creatures drop nothing)
- Every biome in the biome registry must have at least one spawn config entry (no empty/lifeless biomes)

### Claude's Discretion
- Test helper utilities and shared assertion patterns
- Exact error message formatting and grouping
- Whether to use test.each or individual test cases per entity
- CI configuration specifics (which file paths trigger the test run)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CINF-01 | Entity validation test suite matching item-validation.test.ts pattern | All four validation categories researched with exact file locations, data structures, and cross-package import paths identified |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 3.x+ | Test runner | Already used project-wide via @nx/vite:test executor |
| @nx/vite | 20.x | Nx executor for vitest | All package `test` targets use this executor |

### Supporting
No additional libraries needed. All validation is pure data structure traversal using existing package exports.

### Alternatives Considered
None — Vitest is the established test runner. No alternative libraries are relevant.

**Installation:**
No new installations needed. Vitest is already a project dependency.

## Architecture Patterns

### Recommended Project Structure
```
packages/entities/
├── src/
│   ├── __tests__/
│   │   ├── loot-tables.test.ts          # Creature loot table validation
│   │   ├── spawn-configs.test.ts        # Biome spawn config validation
│   │   ├── id-constants.test.ts         # ENTITY_IDS bidirectional validation
│   │   └── harvest-yields.test.ts       # Plant/mineral harvest yield item validation
│   ├── definitions/
│   ├── registry.ts
│   ├── types.ts
│   └── index.ts
├── vitest.config.ts                     # NEW — mirrors packages/items/vitest.config.ts
└── package.json
```

### Pattern 1: Registry-Based Validation (from item-validation.test.ts)
**What:** Import all entity/item definitions, iterate with test.each, assert cross-references
**When to use:** Every test file
**Example:**
```typescript
// Source: packages/items/src/__tests__/item-validation.test.ts (existing pattern)
import { ALL_CREATURES } from '../definitions';
import { CREATURE_LOOT_TABLES } from '@into-the-void/game-logic';

describe('Creature loot table validation', () => {
  const creatures = ALL_CREATURES.map(c => [c.id, c] as const);

  it.each(creatures)('creature "%s" has a CREATURE_LOOT_TABLES entry', (id, creature) => {
    const lootKey = creature.lootTableId;
    expect(
      CREATURE_LOOT_TABLES.has(lootKey),
      `Creature "${id}" has no CREATURE_LOOT_TABLES entry (expected key: "${lootKey}"). Add it in packages/game-logic/src/loot/creature-loot.ts`
    ).toBe(true);
  });
});
```

### Pattern 2: Bidirectional ID Validation
**What:** Check both directions — every constant maps to a registered entity AND every registered entity has a constant
**When to use:** id-constants.test.ts
**Example:**
```typescript
import { ENTITY_IDS, ALL_ENTITIES } from '../definitions';
import { EntityRegistry } from '../registry';

// Constant → Entity
for (const [constName, entityId] of Object.entries(ENTITY_IDS)) {
  it(`ENTITY_IDS.${constName} ("${entityId}") maps to a registered entity`, () => {
    expect(EntityRegistry.has(entityId)).toBe(true);
  });
}

// Entity → Constant
for (const entity of ALL_ENTITIES) {
  it(`entity "${entity.id}" has a matching ENTITY_IDS constant`, () => {
    const matchingConst = Object.entries(ENTITY_IDS).find(([, v]) => v === entity.id);
    expect(matchingConst).toBeDefined();
  });
}
```

### Pattern 3: Cross-Package Item Reference Validation
**What:** Validate harvest yield itemIds exist in ItemRegistry
**When to use:** harvest-yields.test.ts
**Example:**
```typescript
import '@into-the-void/items'; // Side-effect: registers all items
import { ItemRegistry } from '@into-the-void/items';

// For each plant/mineral, validate every harvestYield/miningYield itemId
```

### Anti-Patterns to Avoid
- **Snapshot testing for entity counts:** Brittle — breaks every time a new entity is added. Use structural validation instead.
- **Allowlists for known failures:** CONTEXT.md explicitly says "no allowlists" — fix violations, don't skip them.
- **Testing via runtime spawn simulation:** Too slow and complex. Validate data structures directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-package imports | Custom module resolution | Standard workspace imports (`@into-the-void/game-logic`) | Nx handles resolution |
| Test runner config | Custom vitest setup | Copy `packages/items/vitest.config.ts` pattern | Proven working pattern |

**Key insight:** This phase is pure data validation — no mocking, no services, no runtime. Just import definitions and assert structural invariants.

## Common Pitfalls

### Pitfall 1: Side-Effect Registration Not Triggered
**What goes wrong:** Tests import individual definitions but ItemRegistry/EntityRegistry is empty because `index.ts` side-effect registration hasn't run.
**Why it happens:** Importing `ALL_CREATURES` from `../definitions` doesn't trigger the `index.ts` that calls `EntityRegistry.registerAll()`.
**How to avoid:** Import the package root (`import '@into-the-void/items'` or `import '@into-the-void/entities'`) BEFORE using the registry.
**Warning signs:** `EntityRegistry.has(id)` returns false for entities that clearly exist.

### Pitfall 2: BIOME_SPAWN_CONFIGS Not Exported
**What goes wrong:** Tests can't directly validate spawn config entries because the config object is module-private in spawn.ts.
**Why it happens:** `const BIOME_SPAWN_CONFIGS` is not exported, only helper functions are.
**How to avoid:** Export `BIOME_SPAWN_CONFIGS` from `packages/world-gen/src/generation/spawn.ts`, or use the existing exported helper functions (`getBiomeCreatures()`, `getBiomeMinerals()`, etc.).
**Warning signs:** Import error or undefined when trying to access BIOME_SPAWN_CONFIGS.

### Pitfall 3: Vitest Config Missing for Entities Package
**What goes wrong:** `nx run entities:test` finds no tests or uses wrong config.
**Why it happens:** `packages/entities` has no `vitest.config.ts`. The `project.json` test target uses `@nx/vite:test` with `passWithNoTests: true`.
**How to avoid:** Create `packages/entities/vitest.config.ts` mirroring `packages/items/vitest.config.ts`.
**Warning signs:** `passWithNoTests: true` means test target succeeds even with zero tests.

### Pitfall 4: Loot Table Key Convention Mismatch
**What goes wrong:** Tests assume loot table key is `loot_<creature_id>` but some creature might use a different format.
**Why it happens:** The convention is documented but not enforced at the type level.
**How to avoid:** Use `creature.lootTableId` field directly (it already contains the full key like `'loot_creature_void_crawler'`), don't reconstruct the key.
**Warning signs:** Test fails with "no loot table entry" when the entry actually exists under a different key.

## Code Examples

### Vitest Config (for packages/entities)
```typescript
// Source: packages/items/vitest.config.ts (existing pattern)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

### Exporting BIOME_SPAWN_CONFIGS
```typescript
// packages/world-gen/src/generation/spawn.ts — change line 41
// FROM:
const BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig> = {
// TO:
export const BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig> = {
```

Also export the BiomeSpawnConfig interface:
```typescript
export interface BiomeSpawnConfig {
  creatures: Array<{ id: string; weight: number; minLevel: number; maxLevel: number }>;
  minerals: Array<{ id: string; weight: number; rarity: number }>;
  plants: Array<{ id: string; weight: number; rarity?: NodeRarity }>;
  artifacts: Array<{ id: string; weight: number; rarity: 'rare' | 'epic' | 'exotic' | 'legendary' }>;
  creatureDensity: number;
  mineralDensity: number;
  plantDensity: number;
  artifactDensity: number;
}
```

### Key Data Structures for Tests

**CREATURE_LOOT_TABLES** (packages/game-logic/src/loot/creature-loot.ts):
- `Map<string, readonly HarvestYield[]>` — key is `loot_<creature_id>`, value is array of `{ itemId, minAmount, maxAmount, chance }`
- Exported as named export

**BIOME_SPAWN_CONFIGS** (packages/world-gen/src/generation/spawn.ts):
- `Record<BiomeType, BiomeSpawnConfig>` — keyed by biome name
- Currently NOT exported — needs `export` keyword added
- Alternative: Use exported `getBiomeCreatures(biome)`, `getBiomeMinerals(biome)`, `getBiomePlants(biome)`, `getBiomeArtifacts(biome)`

**ENTITY_IDS** (packages/entities/src/definitions/index.ts):
- `const` object with UPPER_SNAKE keys mapping to snake_case entity IDs
- Example: `CREATURE_VOID_CRAWLER: 'creature_void_crawler'`

**ALL_ENTITIES** (packages/entities/src/definitions/index.ts):
- `readonly EntityDefinition[]` — flat array of all entity definitions
- Composed from `ALL_CREATURES`, `ALL_PLANTS`, `ALL_MINERALS`, `ALL_ARTIFACTS`, plus aquatic and exotic variants

**Entity type discrimination:**
- `entity.entityClass` is `'creature' | 'plant' | 'mineral' | 'artifact'`
- CreatureDefinition has `lootTableId`, `behavior`, `baseHealth`, `levelRange`, `baseXp`
- PlantDefinition has `harvestYield: readonly HarvestYield[]`
- MineralDefinition has `miningYield: readonly HarvestYield[]`
- ArtifactDefinition has `respawns: false`

### snake_case Validation for ID Constants
```typescript
const SNAKE_CASE_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

it.each(Object.entries(ENTITY_IDS))('ENTITY_IDS.%s value "%s" is snake_case', (constName, entityId) => {
  expect(entityId).toMatch(SNAKE_CASE_RE);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No entity validation | item-validation.test.ts pattern (Phase 59-63) | v1.14 | Established validation pattern for registry-based content |

**Deprecated/outdated:** N/A — this is a new capability.

## Open Questions

1. **Should existing violations be fixed in the same plan or a separate plan?**
   - What we know: CONTEXT.md says "fix all existing violations as part of this phase — the baseline starts clean"
   - What's unclear: Whether any existing violations exist (current data may already be consistent)
   - Recommendation: Test first, fix if any failures found, same plan

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `packages/items/vitest.config.ts`, `packages/items/src/__tests__/item-validation.test.ts` — existing validation pattern
- Codebase inspection: `packages/entities/project.json` — test target uses `@nx/vite:test` with `passWithNoTests: true`
- Codebase inspection: `packages/game-logic/src/loot/creature-loot.ts` — CREATURE_LOOT_TABLES structure
- Codebase inspection: `packages/world-gen/src/generation/spawn.ts` — BIOME_SPAWN_CONFIGS structure (not exported)
- Codebase inspection: `packages/entities/src/definitions/index.ts` — ENTITY_IDS and ALL_ENTITIES
- Codebase inspection: `packages/entities/src/types.ts` — EntityDefinition types with harvestYield/miningYield

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Vitest already used in project, pattern proven in items package
- Architecture: HIGH — All data structures inspected, import paths confirmed
- Pitfalls: HIGH — Identified from actual codebase inspection (missing export, missing config)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable — pure data validation, no external dependencies)
