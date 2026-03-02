---
phase: 108-entity-validation-infrastructure
plan: 01
status: complete
started: 2026-03-02
completed: 2026-03-02
---

## Summary

Established Vitest infrastructure for `packages/entities` and implemented two validation test suites: loot table validation and spawn config validation.

## Tasks Completed

### Task 1: Create vitest.config.ts and export BIOME_SPAWN_CONFIGS
- Created `packages/entities/vitest.config.ts` matching the items package pattern
- Created `packages/entities/tsconfig.json` and `tsconfig.spec.json` (required for vitest TypeScript resolution)
- Exported `BiomeSpawnConfig` interface and `BIOME_SPAWN_CONFIGS` constant from `packages/world-gen/src/generation/spawn.ts`
- Added devDependencies to `packages/entities/package.json` for cross-package test imports

### Task 2: Create loot-tables.test.ts
- 164 tests across 4 validation groups, all passing
- Validates: creature-to-loot linkage, positive drop rates, item reference validity, no orphaned loot tables
- Key workaround: uses `import '../index'` instead of `@into-the-void/entities` (can't self-import)
- Key workaround: imports directly from `@into-the-void/game-logic/src/loot/creature-loot` to avoid transitive dependency on `@into-the-void/tiles`

### Task 3: Create spawn-configs.test.ts
- 385 tests across 5 validation groups, all passing
- Validates: entity-to-biome linkage, reverse entity reference checks, non-empty biomes, rarity mineral references, value range validation
- Key workaround: inlines `RARITY_SYSTEM_MINERALS` mapping to avoid circular dependency (rarity.ts imports from @into-the-void/entities)
- Added 5th test group to validate the inlined rarity mineral IDs exist in EntityRegistry

## Issues Encountered

1. **Missing tsconfig.json**: entities package had tsconfig.lib.json but vitest needed tsconfig.json + tsconfig.spec.json
2. **Self-import failure**: `@into-the-void/entities` can't be imported from within the entities package; used `../index` instead
3. **Transitive dependency chain**: `@into-the-void/game-logic` full index imports `@into-the-void/tiles`; solved with direct source module import
4. **Circular dependency**: `rarity.ts` (world-gen) imports `EntityRegistry` from entities; importing rarity.ts from entities test causes deadlock. Solved by inlining the rare/epic mineral mapping
5. **Stale nx daemon**: Multiple stuck nx processes caused test runs to hang; resolved with `npx nx reset` and direct `npx vitest run`

## Artifacts

| File | Status |
|------|--------|
| `packages/entities/vitest.config.ts` | Created |
| `packages/entities/tsconfig.json` | Created |
| `packages/entities/tsconfig.spec.json` | Created |
| `packages/entities/package.json` | Modified (devDependencies) |
| `packages/world-gen/src/generation/spawn.ts` | Modified (exports) |
| `packages/entities/src/__tests__/loot-tables.test.ts` | Created |
| `packages/entities/src/__tests__/spawn-configs.test.ts` | Created |

## Test Results

```
✓ src/__tests__/loot-tables.test.ts (164 tests) 5ms
✓ src/__tests__/spawn-configs.test.ts (385 tests) 8ms

 Test Files  2 passed (2)
      Tests  549 passed (549)
```
