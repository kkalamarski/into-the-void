---
phase: 33-foundation-types-and-entity-definitions
verified: 2026-02-18T13:45:00Z
status: passed
score: 9/9 must-haves verified
re_verification: null
gaps: []
human_verification: []
---

# Phase 33: Foundation Types and Entity Definitions — Verification Report

**Phase Goal:** Lore-correct entity types and the `packages/entities` registry exist as the single source of truth — all downstream phases build against these definitions; no server or client logic is written until the type contract is locked and compiles cleanly
**Verified:** 2026-02-18T13:45:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `CreatureBehavior` is `herbivore \| omnivore \| predator \| maniac` throughout codebase | VERIFIED | `packages/shared-types/src/core/entity.ts:52` defines the type; no old values (`passive`, `neutral`, `aggressive`, `defensive`) remain as creature behavior values in any `.ts` file |
| 2 | `BiomeType` includes all 10 biomes including `miasma_marshes` and `petrified_expanse` | VERIFIED | `packages/shared-types/src/game/biome.ts:4-14` lists all 10 biome entries; `BIOME_DISPLAY_NAMES` and `BIOME_COLORS` both have 10 keys |
| 3 | `EntityType` includes `plant` and `artifact` | VERIFIED | `packages/shared-types/src/core/entity.ts:6-14` includes both; `Plant` and `Artifact` interfaces defined at lines 72-91 |
| 4 | All `Record<BiomeType, ...>` objects compile without missing key errors | VERIFIED | `pnpm exec tsc --noEmit -p packages/entities/tsconfig.lib.json` passes; `pnpm exec nx run entities:build` succeeds; 12 Record objects across biome.ts, spawn.ts, terrain.ts, structures.ts all have 10 keys |
| 5 | `EntityRegistry.get(entityId)` returns a fully typed `EntityDefinition` for all ~35 entities | VERIFIED | 35 definitions registered: 10 creatures, 10 plants, 10 minerals, 5 artifacts — confirmed by `export const` count per definitions file; auto-registration in `packages/entities/src/index.ts:22` |
| 6 | Every entity definition carries a `lootTableId` reference | VERIFIED | `lootTableId` field appears 35 times across definitions files (10+10+10+5), matching entity count exactly; follows `loot_<entity_id>` convention |
| 7 | `BIOME_SPAWN_CONFIGS` references only entity IDs present in the registry | VERIFIED | All 21 `ENTITY_IDS.*` references in `spawn.ts` correspond to entries in `ENTITY_IDS` const object in `definitions/index.ts`; no hardcoded strings remain |
| 8 | Each of the 10 biomes has at least one creature and mineral in spawn configs | VERIFIED | `packages/world-gen/src/generation/spawn.ts` — all 10 biomes have creature and mineral entries using `ENTITY_IDS` constants |
| 9 | Each of the 10 biomes has at least one plant definition in EntityRegistry | VERIFIED | `packages/entities/src/definitions/plants.ts` — 10 plants with exactly one plant per biome (each of the 10 biomes covered) |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared-types/src/core/entity.ts` | Updated `CreatureBehavior`, `EntityType`, `Plant`, `Artifact` interfaces | VERIFIED | Contains `herbivore \| omnivore \| predator \| maniac`; `Plant` at line 72; `Artifact` at line 85 |
| `packages/shared-types/src/game/biome.ts` | 10-biome `BiomeType` union | VERIFIED | 10 biomes including `miasma_marshes` and `petrified_expanse`; `BIOME_DISPLAY_NAMES` and `BIOME_COLORS` complete |
| `packages/shared-types/src/game/entity-registry.ts` | `@deprecated` annotation, updated behavior values | VERIFIED | `@deprecated` at line 59; all 4 behavior values use new taxonomy (`herbivore`, `omnivore`, `predator`, `maniac`) |
| `packages/world-gen/src/generation/biome.ts` | `getBiomeDangerLevel`, `getBiomeColor` with 10 biomes; `BiomeGenerator.getBiome()` returning new types | VERIFIED | Both Records have 10 keys; `getBiome()` contains `miasma_marshes` (line 146) and `petrified_expanse` (line 151) return paths |
| `packages/world-gen/src/generation/spawn.ts` | `BIOME_SPAWN_CONFIGS` with all 10 biome keys; `ENTITY_IDS` import | VERIFIED | `import { ENTITY_IDS } from '@into-the-void/entities'` at line 2; `Record<BiomeType, BiomeSpawnConfig>` with all 10 keys |
| `packages/world-gen/src/generation/terrain.ts` | `BIOME_TILES`, `BIOME_TILE_IDS`, `BIOME_ELEVATION_RANGES`, `getWallThreshold`, `isFeatureBlocking` with 10 keys | VERIFIED | All 5 Records have `miasma_marshes` and `petrified_expanse` entries |
| `packages/world-gen/src/generation/structures.ts` | `BIOME_FEATURE_TILE_IDS`, `getFeatureTileIdForBiome` with 10 keys | VERIFIED | Both Records have all 10 biome keys including `miasma_marshes` and `petrified_expanse` |
| `packages/database/src/schema/species.ts` | Updated column comment; seed data uses new behavior strings | VERIFIED | Column comment `// herbivore, omnivore, predator, maniac`; seed data uses `omnivore`, `predator`, `maniac` |
| `apps/web/src/game/rendering/EntityRenderer.ts` | `createBehaviorIcon()` switch with lore-correct cases | VERIFIED | Switch at line 154 has `case 'herbivore':`, `case 'omnivore':`, `case 'predator':`, `case 'maniac':` |
| `packages/entities/package.json` | Package manifest with `@into-the-void/entities` | VERIFIED | Name is `@into-the-void/entities`; `@into-the-void/shared-types: workspace:*` dependency present |
| `packages/entities/project.json` | NX build configuration with `esbuild` | VERIFIED | Contains `@nx/esbuild:esbuild` executor; build, lint, test targets defined |
| `packages/entities/src/types.ts` | `EntityDefinition` discriminated union; `CreatureDefinition`, `PlantDefinition`, `MineralDefinition`, `ArtifactDefinition` | VERIFIED | All 4 subtypes exported; `ArtifactDefinition.respawns: false` (literal type); `BaseEntityDefinition` with `lootTableId` field |
| `packages/entities/src/registry.ts` | `EntityRegistry` singleton with `get`, `has`, `getByBiome`, `getByClass` methods | VERIFIED | All 5 methods present plus `registerAll`, `size` getter; fallback `UNKNOWN_ENTITY` prevents crashes |
| `packages/entities/src/index.ts` | Barrel exports; auto-registration on import | VERIFIED | `EntityRegistry.registerAll(ALL_ENTITIES)` at line 22; all types and `ENTITY_IDS` exported |
| `packages/entities/src/definitions/creatures.ts` | ~10 creature definitions exported as `ALL_CREATURES` | VERIFIED | 10 creature definitions; `ALL_CREATURES` array exported |
| `packages/entities/src/definitions/plants.ts` | ~10 plant definitions exported as `ALL_PLANTS` | VERIFIED | 10 plant definitions; `ALL_PLANTS` array exported |
| `packages/entities/src/definitions/minerals.ts` | ~10 mineral definitions exported as `ALL_MINERALS` | VERIFIED | 10 mineral definitions; `ALL_MINERALS` array exported |
| `packages/entities/src/definitions/artifacts.ts` | ~5 artifact definitions exported as `ALL_ARTIFACTS` | VERIFIED | 5 artifact definitions; `ALL_ARTIFACTS` array exported |
| `packages/entities/src/definitions/index.ts` | `ALL_ENTITIES` array and `ENTITY_IDS` const | VERIFIED | Both exported; `ENTITY_IDS` has all 35 keys as `const`; re-exports individual arrays |
| `tsconfig.base.json` | Path alias `@into-the-void/entities` | VERIFIED | `"@into-the-void/entities": ["packages/entities/src/index.ts"]` present at line 31 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/shared-types/src/core/entity.ts` | `apps/web/src/game/rendering/EntityRenderer.ts` | `CreatureBehavior` import | WIRED | `import { Entity, Creature, CreatureBehavior, ... } from '@into-the-void/shared-types'` at line 2 of EntityRenderer |
| `packages/shared-types/src/game/biome.ts` | `packages/world-gen/src/generation/spawn.ts` | `BiomeType` import; `Record<BiomeType` | WIRED | `import { BiomeType, ... } from '@into-the-void/shared-types'` at line 1; `Record<BiomeType, BiomeSpawnConfig>` at line 15 |
| `packages/shared-types/src/game/biome.ts` | `packages/world-gen/src/generation/terrain.ts` | `BiomeType` import; `Record<BiomeType` | WIRED | `import { BiomeType, ... } from '@into-the-void/shared-types'` at line 1; multiple `Record<BiomeType, ...>` objects |
| `packages/entities/src/types.ts` | `@into-the-void/shared-types` | `BiomeType` and `CreatureBehavior` imports | WIRED | `import type { BiomeType, CreatureBehavior } from '@into-the-void/shared-types'` at line 7 |
| `packages/entities/src/index.ts` | `packages/entities/src/registry.ts` | auto-registration | WIRED | `import { EntityRegistry } from './registry'; ... EntityRegistry.registerAll(ALL_ENTITIES)` at lines 20-22 |
| `packages/world-gen/src/generation/spawn.ts` | `@into-the-void/entities` | `ENTITY_IDS` import | WIRED | `import { ENTITY_IDS } from '@into-the-void/entities'` at line 2; all 21 spawn config entries use `ENTITY_IDS.*` |

### Requirements Coverage

Phase 33 success criteria from ROADMAP.md:

| Success Criterion | Status | Details |
|-------------------|--------|---------|
| `EntityRegistry.get(entityId)` returns fully typed `EntityDefinition` for all ~35 entities | SATISFIED | 35 definitions registered via auto-registration; `get()` returns fallback-protected typed result |
| `CreatureBehavior` is `herbivore \| omnivore \| predator \| maniac` — old shape no longer compiles | SATISFIED | `CreatureBehavior` at `shared-types/core/entity.ts:52`; zero old values in creature-behavior context; TypeScript enforces via strict mode |
| `BiomeType` includes all 10 lore biomes including `miasma_marshes` and `petrified_expanse` | SATISFIED | Both confirmed in biome.ts:4-14 |
| Every entity definition carries `lootTableId` reference; `BIOME_SPAWN_CONFIGS` references only IDs in registry | SATISFIED | 35 lootTableId fields verified; BIOME_SPAWN_CONFIGS uses only `ENTITY_IDS` constants which match definitions |

### Anti-Patterns Found

No blockers or stubs detected.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

**Anti-pattern check results:**
- No `TODO/FIXME/PLACEHOLDER` in definition files
- No `return null` or `return {}` stub implementations
- All switch cases in `createBehaviorIcon()` are substantive (letter + color assignment)
- `EntityRegistry.get()` returns real data, not a static placeholder
- The commented-out code in the original `index.ts` was properly uncommented — auto-registration is active
- `'passive'` and `'neutral'` appear in the codebase only in unrelated contexts (faction relations, item effect triggers, code comments) — not as `CreatureBehavior` values

### Human Verification Required

None — all success criteria are verifiable programmatically. The type contract is a compile-time guarantee; no visual or real-time behavior is introduced in Phase 33.

### Gaps Summary

No gaps found. All 9 observable truths pass verification at all three levels (exists, substantive, wired). The TypeScript compiler enforces exhaustiveness on all `Record<BiomeType, ...>` objects, ensuring the 10-biome contract is mechanically guaranteed. Downstream phases (34-38) have a complete, compile-verified type foundation.

---

_Verified: 2026-02-18T13:45:00Z_
_Verifier: Claude (gsd-verifier)_
