# Phase 33: Foundation Types and Entity Definitions - Research

**Researched:** 2026-02-18
**Domain:** TypeScript type system, NX workspace packages, entity data modeling
**Confidence:** HIGH — all findings derived from direct codebase inspection

---

## Summary

Phase 33 is a pure TypeScript contract phase: no server logic, no client rendering — only type definitions and static data registries that downstream phases (34–38) build against. The work splits into three distinct layers:

**Layer 1 — Type corrections in `shared-types`:** Two breaking changes are required before any entity definitions are written. `CreatureBehavior` must change from `'passive' | 'neutral' | 'aggressive' | 'defensive'` to `'herbivore' | 'omnivore' | 'predator' | 'maniac'` (lore mandate). `BiomeType` must gain two missing entries: `'miasma_marshes'` and `'petrified_expanse'`. `EntityType` must gain `'plant'` and `'artifact'`. These changes will cause immediate TypeScript compilation errors in every consuming file — those errors are the success signal that callers have been updated.

**Layer 2 — `packages/entities` workspace package:** Mirror the `packages/items` pattern precisely. Create `types.ts` (interfaces for `EntityDefinition` and its subtypes), `registry.ts` (singleton `EntityRegistryImpl` with `get(id)`, `has(id)`, `getAllIds()`, `getByBiome()`, `getByType()`), `definitions/` directory (one file per entity class: `creatures.ts`, `plants.ts`, `minerals.ts`, `artifacts.ts`), and `index.ts` that registers all definitions on module load. The package depends on `@into-the-void/shared-types`.

**Layer 3 — Downstream fixups:** After the type corrections, three files outside `shared-types` and `packages/entities` will have TypeScript errors: `EntityRenderer.ts` (switch on old behavior values), `world-gen/biome.ts` (`Record<BiomeType, ...>` missing 2 entries), and `world-gen/spawn.ts` (`BIOME_SPAWN_CONFIGS` missing 2 biome keys). Fix all three as part of this phase so that `pnpm build` passes cleanly before Phase 34 begins.

**Primary recommendation:** Fix types in `shared-types` first, let TypeScript surface every broken callsite, fix each, then create `packages/entities` with all ~35 definitions. Compile-clean exit is the acceptance gate.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript (strict) | ~5.x (existing) | Type contracts | `noImplicitAny`, `strictNullChecks` already enabled in tsconfig.base.json |
| NX esbuild executor | existing | Package build | Already used by `items`, `tiles` — copy project.json verbatim |
| pnpm workspaces | existing | Package resolution | `pnpm-workspace.yaml` already includes `packages/*` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@into-the-void/shared-types` | workspace:* | Base types (`BiomeType`, `EntityType`) | Dependency of `packages/entities` — same as `items` |

### No New Dependencies
Phase 33 installs nothing new. All tooling (`typescript`, `nx`, `@nx/esbuild`) is already workspace-level. The `packages/entities` package declares only `@into-the-void/shared-types` as a dependency.

**Workspace registration (three files to touch):**

```bash
# 1. Create packages/entities/ directory
# 2. Add tsconfig.base.json path alias
# 3. pnpm install (no new deps — just workspace link resolution)
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/entities/
├── package.json             # name: @into-the-void/entities
├── project.json             # NX targets — copy from packages/items/project.json
├── tsconfig.lib.json        # extends ../../tsconfig.base.json — copy from items
└── src/
    ├── index.ts             # barrel: exports types + registry + all definitions; registers on load
    ├── types.ts             # EntityDefinition discriminated union + subtypes
    ├── registry.ts          # EntityRegistryImpl singleton
    └── definitions/
        ├── index.ts         # ALL_ENTITIES array + ENTITY_IDS const object
        ├── creatures.ts     # ~10 creature definitions
        ├── plants.ts        # ~10 plant definitions
        ├── minerals.ts      # ~10 mineral definitions
        └── artifacts.ts     # ~5 artifact definitions
```

### Pattern 1: Discriminated Union EntityDefinition

The `EntityDefinition` type must be a discriminated union (same pattern as `ItemEffect` in `packages/items/src/types.ts`) so callers can narrow to the specific subtype.

```typescript
// packages/entities/src/types.ts
// Source: codebase pattern from packages/items/src/types.ts

import type { BiomeType, CreatureBehavior } from '@into-the-void/shared-types';

export type EntityClass = 'creature' | 'plant' | 'mineral' | 'artifact';

export interface BaseEntityDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly entityClass: EntityClass;
  readonly biomes: readonly BiomeType[];
  readonly textureKey: string;
  readonly color: number;             // hex fallback until sprite exists
  readonly lootTableId: string;       // ENTD-10: required on all entities
}

export interface CreatureDefinition extends BaseEntityDefinition {
  readonly entityClass: 'creature';
  readonly behavior: CreatureBehavior; // 'herbivore' | 'omnivore' | 'predator' | 'maniac'
  readonly baseHealth: number;
  readonly levelRange: readonly [number, number];
  readonly baseXp: number;
}

export interface PlantDefinition extends BaseEntityDefinition {
  readonly entityClass: 'plant';
  readonly harvestYield: readonly HarvestYield[];
  readonly respawnSeconds: number;
}

export interface MineralDefinition extends BaseEntityDefinition {
  readonly entityClass: 'mineral';
  readonly miningYield: readonly HarvestYield[];
  readonly requiredTier: 1 | 2 | 3 | 4;
  readonly respawnSeconds: number;
}

export interface ArtifactDefinition extends BaseEntityDefinition {
  readonly entityClass: 'artifact';
  readonly respawns: false;  // artifacts never respawn — one-time discovery (ENTD-09)
  readonly rarity: 'rare' | 'epic' | 'exotic' | 'legendary';
}

export interface HarvestYield {
  readonly itemId: string;
  readonly minAmount: number;
  readonly maxAmount: number;
  readonly chance: number; // 0.0 to 1.0
}

// Discriminated union — the EntityDefinition consumed by EntityRegistry.get()
export type EntityDefinition =
  | CreatureDefinition
  | PlantDefinition
  | MineralDefinition
  | ArtifactDefinition;
```

### Pattern 2: Singleton Registry (mirror of ItemRegistryImpl)

```typescript
// packages/entities/src/registry.ts
// Source: codebase pattern from packages/items/src/registry.ts

import type { EntityDefinition, EntityClass } from './types';
import type { BiomeType } from '@into-the-void/shared-types';

const UNKNOWN_ENTITY: EntityDefinition = {
  id: 'unknown',
  displayName: 'Unknown Entity',
  description: 'Unknown entity. Should not appear in normal gameplay.',
  entityClass: 'creature',
  biomes: [],
  textureKey: 'entity_unknown',
  color: 0xff00ff,
  lootTableId: 'loot_empty',
  behavior: 'herbivore',
  baseHealth: 1,
  levelRange: [1, 1],
  baseXp: 0,
};

class EntityRegistryImpl {
  private readonly entities: Map<string, EntityDefinition> = new Map();

  register(entity: EntityDefinition): void {
    if (this.entities.has(entity.id)) {
      console.warn(`Entity ID "${entity.id}" already registered, overwriting`);
    }
    this.entities.set(entity.id, entity);
  }

  registerAll(entities: readonly EntityDefinition[]): void {
    for (const entity of entities) {
      this.register(entity);
    }
  }

  get(id: string): EntityDefinition {
    const entity = this.entities.get(id);
    if (!entity) {
      console.warn(`Unknown entity ID: "${id}", using fallback`);
      return UNKNOWN_ENTITY;
    }
    return entity;
  }

  has(id: string): boolean {
    return this.entities.has(id);
  }

  getAllIds(): string[] {
    return Array.from(this.entities.keys());
  }

  getByBiome(biome: BiomeType): EntityDefinition[] {
    return Array.from(this.entities.values()).filter(e =>
      e.biomes.includes(biome)
    );
  }

  getByClass(entityClass: EntityClass): EntityDefinition[] {
    return Array.from(this.entities.values()).filter(e =>
      e.entityClass === entityClass
    );
  }

  get size(): number {
    return this.entities.size;
  }
}

export const EntityRegistry = new EntityRegistryImpl();
```

### Pattern 3: Auto-Registration on Module Load

```typescript
// packages/entities/src/index.ts
// Source: codebase pattern from packages/items/src/index.ts

export type { EntityDefinition, CreatureDefinition, PlantDefinition,
  MineralDefinition, ArtifactDefinition, EntityClass, HarvestYield } from './types';
export { EntityRegistry } from './registry';
export { ALL_ENTITIES, ENTITY_IDS } from './definitions';
export * from './definitions';

// Register all entities on module load
import { EntityRegistry } from './registry';
import { ALL_ENTITIES } from './definitions';
EntityRegistry.registerAll(ALL_ENTITIES);
```

### Pattern 4: BiomeType Expansion (breaking change)

The `BiomeType` union lives in `packages/shared-types/src/game/biome.ts`. Two new entries must be added. After adding them, TypeScript `Record<BiomeType, ...>` exhaustiveness checks will surface all callsites needing update:

```typescript
// packages/shared-types/src/game/biome.ts — UPDATED
export type BiomeType =
  | 'void_plains'         // maps to: Scarred Badlands (lore Tier I)
  | 'crystal_caves'       // maps to: Crystalline Wastes (lore Tier III)
  | 'toxic_wastes'        // maps to: Volcanic Reaches / general toxic (lore Tier III)
  | 'ancient_ruins'       // maps to: Anomaly Zones (lore Tier IV)
  | 'frozen_expanse'      // maps to: Frozen Reaches (lore Tier III)
  | 'volcanic_ridge'      // maps to: Volcanic Reaches (lore Tier III)
  | 'fungal_forest'       // maps to: Luminous Canopy / Fungal Depths (lore Tier I/III)
  | 'starfall_crater'     // maps to: Scarred Badlands variant
  | 'miasma_marshes'      // NEW: Miasma Marshes (lore Tier II) — ENTD-01
  | 'petrified_expanse';  // NEW: Petrified Expanse (lore Tier II) — ENTD-01
```

**BIOME_DISPLAY_NAMES and BIOME_COLORS** in `biome.ts` are `Record<BiomeType, ...>` — both must get entries for the two new keys or TypeScript will error.

### Pattern 5: CreatureBehavior Rename (breaking change)

```typescript
// packages/shared-types/src/core/entity.ts — UPDATED
export type CreatureBehavior = 'herbivore' | 'omnivore' | 'predator' | 'maniac';
```

**Files that consume `CreatureBehavior` and need updating:**

| File | What to change |
|------|---------------|
| `packages/shared-types/src/core/entity.ts` | Type definition itself |
| `packages/shared-types/src/game/entity-registry.ts` | 4 behavior string literals + entire old EntityRegistry object (deprecated by packages/entities) |
| `packages/database/src/schema/species.ts` | Comment on `behaviorType` column; seed data strings |
| `apps/web/src/game/rendering/EntityRenderer.ts` | `createBehaviorIcon()` switch cases |

### Pattern 6: EntityType Expansion

```typescript
// packages/shared-types/src/core/entity.ts — UPDATED
export type EntityType =
  | 'player'
  | 'creature'
  | 'mineral'
  | 'plant'      // NEW — ENTD-03
  | 'artifact'   // NEW — ENTD-03
  | 'structure'
  | 'item'
  | 'npc';
```

`getAvailableInteractions()` in `game-logic/src/interaction/interaction.ts` uses a switch on `EntityType` — the switch will need cases for `'plant'` and `'artifact'` (or a default handler). The existing `default` on line 87 already covers it with `'examine'` so no crash, but explicit cases are cleaner.

### Anti-Patterns to Avoid

- **Don't leave old EntityRegistry in shared-types as authoritative:** After Phase 33, `packages/entities` is the source of truth. The `EntityRegistry` object in `shared-types/game/entity-registry.ts` should be deprecated (comment it, keep types for now so Phase 34 can migrate callers incrementally).
- **Don't use `string` for behavior in entity definitions:** The type must be `CreatureBehavior` not `string` — TypeScript will catch invalid values at definition time.
- **Don't reference item IDs that don't exist in ItemRegistry:** `lootTableId` is a reference, not a foreign key enforced at runtime. Phase 33 defines the string IDs; Phase 35 creates actual loot table data. Use string IDs that match the Phase 35 naming convention (`loot_<entity_id>`).
- **Don't use `biomes: string[]`:** Use `biomes: readonly BiomeType[]` — TypeScript will catch invalid biome references at definition time.
- **Don't add plant/artifact Entity interfaces to shared-types without also adding cases to getDefaultInteraction():** Incomplete switch is a silent bug.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Package build configuration | Custom webpack/tsc script | NX esbuild executor (copy `project.json` from `packages/items`) | Already configured, handles CJS+ESM output |
| Workspace path resolution | Manual TS path config | Add entry to `tsconfig.base.json` paths (proven pattern for `@into-the-void/items`, `@into-the-void/tiles`) | Two-line change, instant resolution |
| Singleton enforcement | Module-level `let` variable | Class instance exported as `const` (proven in `ItemRegistryImpl`) | Pattern already established; import side-effects register on load |
| Biome exhaustiveness validation | Runtime validation code | TypeScript `Record<BiomeType, ...>` — compiler enforces all cases | Already the pattern in `biome.ts`, `spawn.ts`, `biome.ts` |

**Key insight:** This phase is 100% static data modeling. No runtime validation libraries, no schema validators — TypeScript strict mode is the validation layer.

---

## Common Pitfalls

### Pitfall 1: Adding BiomeType Without Updating All Record Objects
**What goes wrong:** TypeScript errors in `world-gen/biome.ts` (`dangerLevels`, `colors`), `world-gen/spawn.ts` (`BIOME_SPAWN_CONFIGS`), and `shared-types/game/biome.ts` (`BIOME_DISPLAY_NAMES`, `BIOME_COLORS`) the moment you add the two new biome keys.
**Why it happens:** All five of these objects are typed as `Record<BiomeType, ...>` which requires exhaustive keys.
**How to avoid:** Add the two biomes to `BiomeType` first, then immediately fix all five `Record<>` objects in the same commit. The build will not pass until all five are updated.
**Warning signs:** TypeScript error "Property 'miasma_marshes' is missing in type" appearing in multiple files.

### Pitfall 2: CreatureBehavior Switch Fall-Through in EntityRenderer
**What goes wrong:** `EntityRenderer.createBehaviorIcon()` has `switch (behavior)` with `case 'passive': case 'neutral': case 'aggressive': case 'defensive':`. After renaming, TypeScript will report unreachable code or missing cases (depending on TS version), and at runtime the switch will fall through with `letter` and `color` undefined, causing a silent rendering glitch.
**Why it happens:** TypeScript exhaustiveness of switches on string unions depends on `noImplicitReturns` and `strictNullChecks` — both are on in this project.
**How to avoid:** Update switch cases immediately after renaming `CreatureBehavior`. New mapping: `'herbivore'` → `H`/green, `'omnivore'` → `O`/yellow, `'predator'` → `P`/orange, `'maniac'` → `M`/red. The existing letter choices and colors are already correct (they were already using lore classifications).
**Warning signs:** TypeScript error "Case clause is unreachable" or "Variable 'letter' may be undefined before assignment".

### Pitfall 3: Circular Dependency Between packages/entities and packages/shared-types
**What goes wrong:** If `packages/entities` imports from `packages/shared-types` AND `packages/shared-types/game/entity-registry.ts` imports from `packages/entities`, the module graph becomes circular and NX build fails.
**Why it happens:** The old `EntityRegistry` in `shared-types` is being replaced, but if it's not cleaned up properly it can create a circular import.
**How to avoid:** `packages/entities` imports FROM `shared-types` only. The old `EntityRegistry` object in `shared-types/game/entity-registry.ts` should remain as deprecated-but-not-removed stub (or import re-export from `packages/entities`) — never have `shared-types` import from `packages/entities`.
**Warning signs:** NX build error "Circular dependency detected between packages/shared-types and packages/entities".

### Pitfall 4: BIOME_SPAWN_CONFIGS ID Mismatch with EntityRegistry
**What goes wrong:** `world-gen/spawn.ts` references creature IDs like `'void_crawler'`, `'crystal_sentinel'` etc. If the new entity definitions in `packages/entities` use different IDs, the spawn system silently produces entities with IDs that `EntityRegistry.get()` cannot resolve (falling back to the `UNKNOWN_ENTITY` placeholder).
**Why it happens:** `BIOME_SPAWN_CONFIGS` uses string literals, not typed ENTITY_IDS constants — no compiler check.
**How to avoid:** ENTD-11 explicitly requires BIOME_SPAWN_CONFIGS to reference only IDs present in the registry. Define `ENTITY_IDS` constants in `packages/entities/src/definitions/index.ts` (same pattern as `ITEM_IDS` in items package). Update `BIOME_SPAWN_CONFIGS` to use these constants. Add a startup assertion in `world-gen/spawn.ts` if needed.
**Warning signs:** `EntityRegistry.get()` console warnings about "Unknown entity ID" during development.

### Pitfall 5: tsconfig.base.json Path Missing
**What goes wrong:** After creating `packages/entities`, code that imports `@into-the-void/entities` gets "Cannot find module" errors.
**Why it happens:** Every workspace package needs a path alias in `tsconfig.base.json`. The `pnpm-workspace.yaml` handles npm resolution at runtime but TypeScript resolution uses the `paths` config.
**How to avoid:** Add `"@into-the-void/entities": ["packages/entities/src/index.ts"]` to `tsconfig.base.json` paths. This is the same two-line change made for `items` and `tiles`.
**Warning signs:** "Cannot find module '@into-the-void/entities'" TypeScript error immediately after creating the package.

### Pitfall 6: Artifact respawns=false Not Enforced by Lifecycle System
**What goes wrong:** Phase 33 defines `ArtifactDefinition` with `respawns: false`. But Phase 34 builds the entity lifecycle DB. If the lifecycle table doesn't check this field, artifacts will respawn like other entities.
**Why it happens:** The type contract is honored in Phase 33 data but the enforcement happens in Phase 34 code. The Phase 33 task is only to set the correct type — not to implement the enforcement.
**How to avoid:** Document the `respawns: false` field in a JSDoc comment as "enforced by ZonesService createEntityFromSpawn — must check before scheduling respawn". Phase 34 planner will see this in the type definition.
**Warning signs:** None in Phase 33 (it's a future-phase concern). Flag it in the type comment.

---

## Code Examples

### Example: Complete Creature Definition File Structure

```typescript
// packages/entities/src/definitions/creatures.ts
// Source: codebase pattern from packages/items/src/definitions/suits.ts

import type { CreatureDefinition } from '../types';

export const CREATURE_CANOPY_GRAZER: CreatureDefinition = {
  id: 'creature_canopy_grazer',
  displayName: 'Canopy Grazer',
  description:
    'A large herbivore that feeds on fungal-tree canopy. Docile unless cornered. Bioluminescent markings pulse when alarmed.',
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

export const CREATURE_VOID_CRAWLER: CreatureDefinition = {
  id: 'creature_void_crawler',
  displayName: 'Void Crawler',
  description:
    'Small, skittering omnivore of the scarred plains. Will attack when hungry and target appears smaller.',
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

// ... remaining creatures

export const ALL_CREATURES: readonly CreatureDefinition[] = [
  CREATURE_CANOPY_GRAZER,
  CREATURE_VOID_CRAWLER,
  // ... all ~10 creatures
];
```

### Example: Biome Coverage Matrix for Entity Definitions

Each of the 10 biomes must have at least one creature, one plant, and one mineral in BIOME_SPAWN_CONFIGS per ENTD-11. Use this matrix as the authoring checklist:

| Biome | Lore Name | Tier | Creature | Plant | Mineral |
|-------|-----------|------|----------|-------|---------|
| `luminous_canopy` | Luminous Canopy | I | canopy_grazer (herbivore) | luminous_vine | biocompound_cluster |
| `fungal_forest` | Fungal Depths | III | spore_carrier (omnivore) | giant_mushroom | mycelial_fiber_node |
| `coastal_shallows` | Coastal Shallows | I | tidal_scavenger (omnivore) | kelp_bed | shell_deposit |
| `void_plains` | Scarred Badlands | I | void_crawler (omnivore) | drought_cactus | exposed_ore |
| `miasma_marshes` | Miasma Marshes | II | marsh_lurker (predator) | gas_pod | chemical_sump |
| `petrified_expanse` | Petrified Expanse | II | dart_runner (predator) | mobile_vine | mineralized_log |
| `volcanic_ridge` | Volcanic Reaches | III | magma_beast (predator) | thermal_vent_moss | volcanic_ore |
| `crystal_caves` | Crystalline Wastes | III | crystal_hunter (predator) | lattice_moss | prismatic_crystal |
| `frozen_expanse` | Frozen Reaches | III | frost_stalker (predator) | ice_algae | permafrost_shard |
| `ancient_ruins` | Anomaly Zones | IV | void_horror (maniac) | phase_bloom | anomaly_crystal |

*Note: The current codebase uses `starfall_crater` as a biome key but the lore has no "Starfall Crater" biome. This appears to be an existing mapping approximation for Scarred Badlands. Treat it as `void_plains` variant — add it as-is to spawn configs for the two new biomes, using the existing 8 biomes for lore biomes 1-8 and mapping `miasma_marshes`/`petrified_expanse` to the 9th and 10th.*

### Example: BIOME_SPAWN_CONFIGS Extension Pattern

```typescript
// packages/world-gen/src/generation/spawn.ts — two new entries
const BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig> = {
  // ... existing 8 entries unchanged ...
  miasma_marshes: {
    creatures: [
      { id: 'creature_marsh_lurker', weight: 7, minLevel: 5, maxLevel: 15 },
      { id: 'creature_chemical_grazer', weight: 5, minLevel: 4, maxLevel: 10 },
    ],
    minerals: [
      { id: 'mineral_chemical_sump', weight: 8, rarity: 2 },
      { id: 'mineral_biogas_vent', weight: 4, rarity: 3 },
    ],
    creatureDensity: 5,
    mineralDensity: 4,
  },
  petrified_expanse: {
    creatures: [
      { id: 'creature_dart_runner', weight: 8, minLevel: 6, maxLevel: 16 },
      { id: 'creature_shard_ambusher', weight: 4, minLevel: 8, maxLevel: 18 },
    ],
    minerals: [
      { id: 'mineral_mineralized_log', weight: 6, rarity: 2 },
      { id: 'mineral_crystallized_compound', weight: 3, rarity: 4 },
    ],
    creatureDensity: 3,
    mineralDensity: 6,
  },
};
```

### Example: NX Package Configuration

```json
// packages/entities/project.json — identical structure to packages/items/project.json
{
  "name": "entities",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/entities/src",
  "projectType": "library",
  "tags": ["scope:shared"],
  "targets": {
    "build": {
      "executor": "@nx/esbuild:esbuild",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/packages/entities",
        "main": "packages/entities/src/index.ts",
        "tsConfig": "packages/entities/tsconfig.lib.json",
        "assets": [],
        "generatePackageJson": true,
        "format": ["cjs", "esm"]
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["packages/entities/**/*.ts"]
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "options": {
        "passWithNoTests": true
      }
    }
  }
}
```

```json
// packages/entities/package.json
{
  "name": "@into-the-void/entities",
  "version": "0.0.1",
  "type": "commonjs",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@into-the-void/shared-types": "workspace:*"
  }
}
```

```json
// tsconfig.base.json paths — add one entry
{
  "paths": {
    "@into-the-void/entities": ["packages/entities/src/index.ts"]
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact on Phase 33 |
|--------------|------------------|--------------|---------------------|
| Plain `EntityRegistry` object in `shared-types` | `EntityRegistryImpl` singleton in `packages/entities` | Phase 33 introduces this | Old registry becomes deprecated; new one is authoritative |
| `CreatureBehavior = 'passive' \| 'neutral' \| 'aggressive' \| 'defensive'` | `CreatureBehavior = 'herbivore' \| 'omnivore' \| 'predator' \| 'maniac'` | Phase 33 breaking change | All 4 callsites must be updated |
| 8-biome `BiomeType` | 10-biome `BiomeType` (adds `miasma_marshes`, `petrified_expanse`) | Phase 33 breaking change | 5 `Record<BiomeType, ...>` objects need new entries |
| Creatures and minerals only | Creatures + plants + minerals + artifacts | Phase 33 | `EntityType` gains `'plant'` and `'artifact'` |

**Deprecated/outdated:**
- `packages/shared-types/src/game/entity-registry.ts` — the `EntityRegistry` plain object and `CreatureConfig`, `MineralConfig`, `ItemConfig` interfaces are superseded by `packages/entities`. Do not delete the file in Phase 33 (it may be used by game-server code not yet migrated). Add `@deprecated` JSDoc comments to the exported members.

---

## Open Questions

1. **Lore biome mapping — `starfall_crater` and `coastal_shallows`**
   - What we know: The lore defines 10 biomes by name. The current codebase has 8 `BiomeType` values that do not all match lore names 1:1 (e.g., `void_plains` maps to Scarred Badlands, `toxic_wastes` conflates Volcanic/Toxic, `starfall_crater` has no lore equivalent, `coastal_shallows` is absent from `BiomeType`).
   - What's unclear: The phase requirements say "BiomeType enum includes all 10 lore biomes including `miasma_marshes` and `petrified_expanse`" — but ENTD-01 doesn't say to rename the existing 8 entries. Adding only the 2 missing ones satisfies ENTD-01 literally. A full rename would be a larger breaking change.
   - Recommendation: Add only `miasma_marshes` and `petrified_expanse` as required by ENTD-01. Do not rename existing 8 values. This minimizes breakage scope and still satisfies the success criteria.

2. **Loot table IDs — forward reference to Phase 35**
   - What we know: ENTD-10 requires each entity definition to carry a `lootTableId`. Phase 35 builds the actual loot system.
   - What's unclear: Should loot table IDs follow a convention that Phase 35 will honor, or are they free-form strings?
   - Recommendation: Use convention `loot_<entity_id>` (e.g., entity `creature_void_crawler` → `lootTableId: 'loot_creature_void_crawler'`). Document this convention at the top of `packages/entities/src/definitions/index.ts` so Phase 35 research picks it up.

3. **`packages/world-gen` dependency on `packages/entities`**
   - What we know: `BIOME_SPAWN_CONFIGS` in `world-gen/spawn.ts` currently uses hardcoded string IDs. After Phase 33, these should match the IDs in `EntityRegistry`.
   - What's unclear: Should `world-gen` import from `packages/entities` to use `ENTITY_IDS` constants, or continue with string literals?
   - Recommendation: Import `ENTITY_IDS` from `packages/entities` in `world-gen/spawn.ts`. This creates a dependency from `world-gen` → `entities` → `shared-types`, which is acyclic. Add `@into-the-void/entities: workspace:*` to world-gen's package.json dependencies.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of `packages/shared-types/src/core/entity.ts` — current `CreatureBehavior` and `EntityType`
- Direct codebase inspection of `packages/shared-types/src/game/biome.ts` — current 8 `BiomeType` values
- Direct codebase inspection of `packages/items/src/` — complete pattern for new `packages/entities`
- Direct codebase inspection of `packages/tiles/src/` — secondary pattern confirmation
- Direct codebase inspection of `lore/world-bible.md` — 10 biomes, creature behavioral classifications
- Direct codebase inspection of `packages/world-gen/src/generation/spawn.ts` — `BIOME_SPAWN_CONFIGS` current state
- Direct codebase inspection of `packages/world-gen/src/generation/biome.ts` — `getBiomeDangerLevel()`, `getBiomeColor()` — both `Record<BiomeType, ...>`
- Direct codebase inspection of `apps/web/src/game/rendering/EntityRenderer.ts` — `createBehaviorIcon()` switch cases
- Direct codebase inspection of `packages/database/src/schema/species.ts` — old behavior values in seed data
- Direct codebase inspection of `tsconfig.base.json` — path alias registration pattern
- Direct codebase inspection of `packages/items/project.json` and `packages/tiles/project.json` — NX build configuration

### Secondary (MEDIUM confidence)
- NX esbuild executor capabilities inferred from existing project.json configurations — consistent across `items` and `tiles` packages

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing packages define the exact tooling; no new dependencies
- Architecture: HIGH — `packages/items` is the direct mirror pattern; verified by reading every file
- Breaking change scope: HIGH — identified all 9 files that will error after type changes
- Pitfalls: HIGH — all pitfalls derived from actual code patterns found in codebase
- Entity content (lore correctness): HIGH — derived from direct lore/world-bible.md reading

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (stable — no external libraries; only internal codebase dependencies)
