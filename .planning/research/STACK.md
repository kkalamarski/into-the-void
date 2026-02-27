# Stack Research

**Domain:** Content expansion and faction gear — 100+ new entity/item definitions, faction-specific equipment
**Researched:** 2026-02-27
**Confidence:** HIGH (codebase directly inspected, installed versions verified)

---

## Context: What the Codebase Already Has

This is a subsequent-milestone research for v1.23. The stack is almost entirely settled. Direct inspection of the installed packages and source files confirms:

- **TypeScript 5.9.3** — all definition files are pure TS object literals
- **Vitest 4.0.18** — used in `packages/items/src/__tests__/item-validation.test.ts` (5 test suites, CONT-01 through CONT-05)
- **NX 20.8.4** — monorepo orchestrator with cached `test` and `lint` targets
- **ESLint 8.57.0 + `@typescript-eslint/utils` 8.56.0** — custom AST rule `eslint-rules/no-legacy-stat-buff.ts` already enforces correct `stats` effect type
- **`computeIlvl()` + `generateSuitStats()`** — stat math utilities in `packages/items/src/utils.ts`; faction suits must use these
- **Flat registry pattern** — `EntityRegistryImpl` (entities) and `ItemRegistryImpl` (items) both use singleton `Map<string, Definition>` with `registerAll()`

**The question for v1.23 is not "what new tools?". It is: where are the gaps in the existing tooling when adding 60-70 new definitions?**

Gaps found:
1. `packages/entities` has **zero tests** — no `vitest.config.ts`, no `__tests__/` directory
2. No coverage assertion that all 16 biomes meet minimum entity counts
3. No ESLint guard on faction item naming conventions
4. No assertion that `ENTITY_IDS` constants and `ALL_ENTITIES` array stay in sync

---

## Recommended Stack

### Core Technologies

All already installed. No new runtime dependencies.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | 5.9.3 (installed) | All definition files | Pure TS object literals — compile-time type checking catches shape errors before runtime; no JSON/YAML overhead |
| Vitest | 4.0.18 (installed) | Content validation tests | Already proven in `packages/items`; needs parallel setup in `packages/entities` which has zero tests today |
| ESLint + custom rules | 8.57.0 (installed) | Structural enforcement at write-time | Inline VS Code feedback; the `eslint-rules/` infrastructure is already built and proven |
| NX | 20.8.4 (installed) | Monorepo orchestration, test caching | `test` target caches by input hash — entity tests run only when definition files change |

### Supporting Libraries

No new installs. All are already in `devDependencies`.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@typescript-eslint/utils` | 8.56.0 (installed) | Write additional custom ESLint AST rules | Extend `eslint-rules/` for faction ID naming convention enforcement if needed |
| `packages/items/src/utils.ts` | (internal) | `computeIlvl()` and `generateSuitStats()` for faction suits | Use for all new suit definitions — required, not optional |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| NX target caching | Skip re-running entity tests when source unchanged | Automatically active once `packages/entities/vitest.config.ts` is added |
| `ENTITY_IDS` / `ITEM_IDS` const objects | Type-safe cross-references prevent typo bugs in `lootTableId` and `grantedAbilities` | Extend in index files for every new definition |
| `generateSuitStats(archetype, rarity, tier)` | Automatic tier/rarity stat math — prevents Phase 59-style rewrites | Already exists; faction suits must call this, not hand-code numbers |

---

## Installation

No new packages required. All work is new files within the existing monorepo structure.

```bash
# Zero new npm installs.

# Add entity test infrastructure (copy from packages/items pattern):
# 1. Create packages/entities/vitest.config.ts
# 2. Create packages/entities/src/__tests__/entity-validation.test.ts
# 3. Add "test" script to packages/entities/package.json

# Optional: if faction naming rule is desired, compile it:
# cd eslint-rules && pnpm build
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Pure TypeScript object literals | JSON files for definitions | Only if non-developer content editors need to write definitions without TypeScript (not applicable here — all content is lore-verified by developers) |
| Pure TypeScript object literals | Zod runtime validation | Only if definitions came from untrusted sources (they don't — TypeScript compile-time types catch shape errors; Vitest catches semantic errors) |
| Vitest balance tests | Manual balance spreadsheet | If the team were non-technical. The existing `item-validation.test.ts` proves programmatic validation is the project's established approach |
| File-per-faction pattern (e.g., `faction-verdant.ts`) | Single `faction-items.ts` | Either works. Per-faction files follow the established per-biome-group pattern (`aquatic-suits.ts`, `exotic-suits.ts`) and keep files at manageable size |
| Custom ESLint rules in `eslint-rules/` | CI shell scripts for naming checks | ESLint gives inline VS Code feedback; the `eslint-rules/` infrastructure already exists; shell scripts only catch at CI push |
| `generateSuitStats()` utility | Hand-coded stat numbers | Hand-coded stats caused the Phase 59 `stat_buff` → `stats` migration. Never acceptable — use the utility |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Hand-coded stat numbers in faction suit definitions | Caused Phase 59/60 migration; CLAUDE.md has rollback procedure for it; `no-legacy-stat-buff` ESLint rule rejects the old pattern | `generateSuitStats(archetype, rarity, tier)` from `packages/items/src/utils.ts` |
| `stat_buff` with `duration: 0` | The custom ESLint rule `no-legacy-stat-buff` will reject it at lint time with an error | `{ type: 'stats', power: N }` — the established post-Phase-59 pattern |
| Adding `faction` as a field on `ItemDefinition` or `EntityDefinition` | Would require a database migration and schema change; faction is a content-organization concern, not a runtime property | Encode faction identity in the `id` string (`suit_verdant_...`, `suit_helix_...`) and filename; the flat registry handles lookup |
| A separate content management system or DB-backed definitions | 122+ items already run as TypeScript constants with zero runtime overhead and full compile-time safety; migrating to a CMS is weeks of work not warranted by scale | Continue TypeScript constants + registry pattern |
| Build-time code generators (Plop, Hygen) | Definitions are intentionally verbose and lore-verified — templating produces boilerplate that still needs per-definition lore content, names, colors, and balance tuning | Write definitions manually; `generateSuitStats()` removes the only repetitive math burden |
| `@into-the-void/faction` as a new package | There is no runtime logic to isolate; faction items are just `ItemDefinition` objects in the items package | Add faction definition files directly to `packages/items/src/definitions/` |

---

## Stack Patterns by Variant

**Adding faction-specific suits (Verdant biotech, Helix industrial, Nexus surveillance):**
- Create `packages/items/src/definitions/faction-verdant.ts`, `faction-helix.ts`, `faction-nexus.ts`
- Call `generateSuitStats(archetype, rarity, tier)` — archetype per faction identity:
  - Verdant Dynamics: `hazmat` (environmental survival) and `scout` (perception/haste)
  - Helix Extraction: `tank` (durability/toughness) and `assault` (power/offense)
  - Nexus Frontiers: `recon` (perception focus) and `balanced`
- Add `grantedAbilities: ['ability_id']` using existing ability IDs — no new ability types needed
- Spread into `ALL_ITEMS` in `packages/items/src/definitions/index.ts`
- Add IDs to `ITEM_IDS` constant

**Adding biome entity gaps (4-6 creatures, 3-4 plants, 2-3 minerals, 1-2 artifacts per biome):**
- Most sparse biomes by inspection: `toxic_wastes` (~4 total), `petrified_expanse` (~4 total), `starfall_crater` (~5 total)
- Add to existing files or create new biome files following the `aquatic-creatures.ts`/`exotic-creatures.ts` pattern
- Extend `ENTITY_IDS` in `packages/entities/src/definitions/index.ts` for every new ID

**Adding entity coverage validation (currently missing):**
- Add `packages/entities/vitest.config.ts` (copy from `packages/items/vitest.config.ts`)
- Add `packages/entities/src/__tests__/entity-validation.test.ts` with assertions:
  - All 16 biomes have >= 4 creatures, >= 2 plants, >= 1 artifact
  - All entity IDs in `ENTITY_IDS` are registered in `ALL_ENTITIES`
  - No duplicate IDs in `ALL_ENTITIES`
  - All `lootTableId` values follow `'loot_' + entity.id` convention

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| vitest@4.0.18 | typescript@5.9.3 | Already working in `packages/items`; identical config applies to `packages/entities` |
| @typescript-eslint/utils@8.56.0 | eslint@8.57.0 | Already used in `eslint-rules/`; confirmed working |
| nx@20.8.4 | vitest@4.0.18 | NX `test` target auto-detects `vitest.config.ts`; caching active immediately |

---

## Key Integration Facts for Roadmap Authors

1. **Definition file size is manageable.** The largest definition files are `tools.ts` (1,179 lines) and `modules.ts` (1,037 lines). Adding 60-70 new definitions at ~20 lines each adds ~1,200-1,400 lines across split files — split per biome-group or per faction keeps individual files under 200 lines.

2. **The registry is flat and order-independent.** `registerAll()` iterates an array. Adding new definition arrays to `index.ts` spreads is zero-friction.

3. **There are zero entity tests today.** The `packages/entities` package has no `vitest.config.ts` and no `__tests__/` directory. This is the single largest tooling gap. 60-70 new entities without validation coverage is a regression risk.

4. **The ESLint rule infrastructure is ready to extend.** `eslint-rules/` compiles independently; `eslint.config.mjs` loads it. A second rule (e.g., enforcing `id` must include faction prefix for faction items) requires one new file in `eslint-rules/src/` and a `pnpm build`.

5. **`generateSuitStats()` already covers all tiers and rarities.** Tier 3 exotic = `generateSuitStats('assault', 'exotic', 3)` produces ~(77 * 2.8 * 3.5) = ~755 total stats. Tier 4 legendary = ~(77 * 4.0 * 5.5) = ~1,694 total stats. The math scales correctly with no modification.

6. **ID string is the only cross-package contract.** `lootTableId: 'loot_creature_x'` links entities to loot tables. `grantedAbilities: ['ability_id']` links items to abilities. These are untyped strings. A Vitest coverage test that asserts `ENTITY_IDS` keys match `ALL_ENTITIES` entries is the primary regression guard.

---

## Sources

- Codebase direct inspection: `packages/items/src/types.ts`, `packages/items/src/utils.ts`, `packages/items/src/__tests__/item-validation.test.ts`, `packages/entities/src/types.ts`, `packages/entities/src/registry.ts`, `packages/entities/src/definitions/index.ts`, `packages/items/src/definitions/index.ts`, `eslint-rules/no-legacy-stat-buff.ts`, `eslint.config.mjs` — HIGH confidence
- Installed version verification: `node -e "require('vitest/package.json').version"` → 4.0.18; `require('typescript/package.json').version` → 5.9.3; `require('nx/package.json').version` → 20.8.4 — HIGH confidence
- `lore/world-bible.md` — faction aesthetic and identity profiles (Verdant=biotech/sustainable, Helix=industrial/aggressive, Nexus=surveillance/adaptable) — HIGH confidence (authoritative, non-negotiable per CLAUDE.md)
- `.planning/PROJECT.md` — v1.23 milestone goals, confirmed 16 biomes, confirmed existing 122 items + 92 entities — HIGH confidence

---

*Stack research for: content expansion and faction gear (v1.23)*
*Researched: 2026-02-27*
