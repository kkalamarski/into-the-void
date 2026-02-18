# Phase 30: Type Foundation & Pure Computation - Research

**Researched:** 2026-02-18
**Domain:** TypeScript type system, pure functions, Vitest unit testing, NX monorepo package wiring
**Confidence:** HIGH

## Summary

Phase 30 replaces the legacy 5-stat `PlayerStats` type (`strength`, `agility`, `endurance`, `intelligence`, `perception`) with a canonical 8-stat `CharacterStats` type (`Durability`, `Toughness`, `Power`, `Haste`, `Vigor`, `Recovery`, `Perception`, `Resilience`) and introduces a `computeCharStats()` pure function in `game-logic`. No server or UI code is touched in this phase — the deliverable is TypeScript that compiles and passes Vitest unit tests.

The stat names come directly from the v1.7 milestone definition in `.planning/ROADMAP.md`. The existing codebase has exactly three files that reference `PlayerStats`: `packages/game-logic/src/combat/damage.ts`, `packages/game-logic/src/combat/turn-order.ts`, and `packages/shared-types/src/core/player.ts`. All three must be updated. The `database` package has a parallel `StatsJson` interface in `packages/database/src/schema/characters.ts` that also needs updating — but the migration script (actually writing rows to the DB) is Phase 31's responsibility.

The existing `effectiveStats()` function in `packages/game-logic/src/inventory/stats.ts` already demonstrates the pure-function + equipment-aggregation pattern used in this codebase. `computeCharStats()` follows the same contract: pure function, no DB calls, no side effects, takes level + `EquipmentJson`, returns a typed result. The creature scaling requirement (STAT-04) is satisfied by adding an optional third parameter with a `ScaleTarget` type (`'player' | 'creature'`) that selects different per-stat base values and growth constants — not a separate function.

**Primary recommendation:** Add `CharacterStats` to `packages/shared-types/src/core/player.ts`, add `computeCharStats()` to `packages/game-logic/src/stats/char-stats.ts`, write Vitest unit tests co-located in `packages/game-logic/src/stats/char-stats.test.ts`, then update the three files that reference `PlayerStats`. The database schema interface update is part of this phase so TypeScript compilation does not break downstream, but the SQL migration script belongs to Phase 31.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript (project) | 5.x | Interface definitions, compile-time enforcement | Already in use everywhere |
| Vitest | (project) | Unit test runner for game-logic package | Already configured via `@nx/vite:test` in `packages/game-logic/project.json` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@into-the-void/items` | workspace | ItemRegistry + ItemDefinition (for resolving equipment effects) | game-logic already depends on this |
| `@into-the-void/database` | workspace | `EquipmentJson` type (equipment parameter type) | game-logic already imports it |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain interface for `CharacterStats` | Zod schema | Zod adds runtime validation but this layer is compile-time only; Zod belongs in server DTOs, not shared-types |
| Inline creature logic in new function | Separate `computeCreatureStats()` | The STAT-04 requirement explicitly says "same function, different scale factor" — separate function violates the spec |

**Installation:** No new packages needed. Everything is already in the monorepo.

## Architecture Patterns

### Recommended Project Structure

```
packages/shared-types/src/core/
├── player.ts              # Replace PlayerStats → CharacterStats (add StatScaleTarget)
└── ...

packages/game-logic/src/
├── stats/
│   ├── char-stats.ts      # computeCharStats() pure function + ScaleConstants
│   └── char-stats.test.ts # Vitest unit tests (4 test cases map to 4 success criteria)
├── combat/
│   ├── damage.ts          # Update PlayerStats → CharacterStats refs
│   └── turn-order.ts      # Update PlayerStats → CharacterStats refs
└── index.ts               # Export computeCharStats from stats/char-stats

packages/database/src/schema/
└── characters.ts          # Update StatsJson interface to 8-stat shape
```

### Pattern 1: CharacterStats Type in shared-types

**What:** A pure TypeScript interface with all 8 lore-mandated primary stats as numbers.
**When to use:** Everywhere a character's stats are referenced — combat, display, serialization.

```typescript
// packages/shared-types/src/core/player.ts

/**
 * The 8 primary character stats (v1.7).
 * Replaces the legacy PlayerStats (5-stat shape).
 *
 * Lore names are used verbatim — no abbreviation.
 * Source: .planning/ROADMAP.md v1.7 milestone definition.
 */
export interface CharacterStats {
  /** Durability — affects max health and suit hit points */
  durability: number;
  /** Toughness — affects damage reduction / armor equivalent */
  toughness: number;
  /** Power — affects damage output (replaces strength) */
  power: number;
  /** Haste — affects turn order / action speed (replaces agility for initiative) */
  haste: number;
  /** Vigor — affects energy pool and stamina */
  vigor: number;
  /** Recovery — affects regeneration rate */
  recovery: number;
  /** Perception — affects detection range and scan quality (retained from legacy) */
  perception: number;
  /** Resilience — affects status-effect resistance and anomaly protection */
  resilience: number;
}

/**
 * Scale target for computeCharStats().
 * Creatures use different base values and growth constants than players.
 */
export type StatScaleTarget = 'player' | 'creature';
```

### Pattern 2: computeCharStats() Pure Function

**What:** A pure function that derives `CharacterStats` from level + equipment, with an optional scale target.
**When to use:** Server-side after auth and after every equip change. Never called client-side.

```typescript
// packages/game-logic/src/stats/char-stats.ts
import type { CharacterStats, StatScaleTarget } from '@into-the-void/shared-types';
import type { EquipmentJson } from '@into-the-void/database';
import { ItemRegistry } from '@into-the-void/items';
import { resolveEffectsForTrigger } from '../inventory/effects';

/**
 * Per-stat base values at level 1 for each scale target.
 * Growth is linear: finalBase = base + (level - 1) * growth
 */
const SCALE_CONSTANTS: Record<StatScaleTarget, {
  base: CharacterStats;
  growth: CharacterStats;
}> = {
  player: {
    base: {
      durability: 100, toughness: 50, power: 50,
      haste: 50, vigor: 80, recovery: 30, perception: 40, resilience: 30,
    },
    growth: {
      durability: 10, toughness: 5, power: 5,
      haste: 3, vigor: 7, recovery: 3, perception: 3, resilience: 3,
    },
  },
  creature: {
    base: {
      durability: 80, toughness: 40, power: 60,
      haste: 40, vigor: 60, recovery: 20, perception: 50, resilience: 25,
    },
    growth: {
      durability: 8, toughness: 4, power: 7,
      haste: 4, vigor: 6, recovery: 2, perception: 4, resilience: 2,
    },
  },
};

/**
 * Compute final CharacterStats from level and equipment.
 *
 * Pure function — no DB calls, no side effects.
 * Equipment bonuses are additive on top of the linear base.
 *
 * @param level     Character level (1-based)
 * @param equipment EquipmentJson from the authoritative server state
 * @param target    Scale target — 'player' (default) or 'creature'
 */
export function computeCharStats(
  level: number,
  equipment: EquipmentJson,
  target: StatScaleTarget = 'player'
): CharacterStats {
  const { base, growth } = SCALE_CONSTANTS[target];

  // Linear base: base + (level - 1) * growth
  const stats: CharacterStats = {
    durability: base.durability + (level - 1) * growth.durability,
    toughness:  base.toughness  + (level - 1) * growth.toughness,
    power:      base.power      + (level - 1) * growth.power,
    haste:      base.haste      + (level - 1) * growth.haste,
    vigor:      base.vigor      + (level - 1) * growth.vigor,
    recovery:   base.recovery   + (level - 1) * growth.recovery,
    perception: base.perception + (level - 1) * growth.perception,
    resilience: base.resilience + (level - 1) * growth.resilience,
  };

  // Collect all equipped items
  const equippedItems = [
    equipment.exosuit,
    ...equipment.modules,
    equipment.tool,
    equipment.accessory1,
    equipment.accessory2,
  ].filter((item): item is NonNullable<typeof item> => item !== undefined);

  // Aggregate equipment bonuses via stat_buff effects
  for (const equippedItem of equippedItems) {
    const itemDef = ItemRegistry.get(equippedItem.itemId);
    if (!itemDef) continue;

    const effects = [
      ...resolveEffectsForTrigger(itemDef.effects, 'on_equip'),
      ...resolveEffectsForTrigger(itemDef.effects, 'passive'),
    ];

    for (const effect of effects) {
      for (const [stat, value] of Object.entries(effect.applied)) {
        if (stat in stats) {
          (stats as Record<string, number>)[stat] += value;
        }
      }
    }
  }

  return stats;
}
```

### Pattern 3: Vitest Unit Tests (matches 4 success criteria exactly)

**What:** Co-located test file in `packages/game-logic/src/stats/`.
**When to use:** `nx run game-logic:test` must pass before any downstream phase begins.

```typescript
// packages/game-logic/src/stats/char-stats.test.ts
import { describe, it, expect } from 'vitest';
import { computeCharStats } from './char-stats';
import type { EquipmentJson } from '@into-the-void/database';

const emptyEquipment: EquipmentJson = { modules: [] };

describe('computeCharStats', () => {
  it('level-10 player has higher base stats than level-1 player (STAT-03)', () => {
    const lv1 = computeCharStats(1, emptyEquipment);
    const lv10 = computeCharStats(10, emptyEquipment);
    expect(lv10.durability).toBeGreaterThan(lv1.durability);
    expect(lv10.power).toBeGreaterThan(lv1.power);
  });

  it('equipment with durability bonus raises final durability (STAT-02)', () => {
    const base = computeCharStats(1, emptyEquipment);
    const withModule: EquipmentJson = {
      modules: [{ instanceId: 'test', itemId: 'module_armor_common', quantity: 1, slot: 0, properties: {} }],
    };
    const boosted = computeCharStats(1, withModule);
    // module_armor_common adds armor=10 via 'on_equip'; armor maps to toughness bonus bucket
    // The test only needs final stat > base — exact mapping depends on item definition
    expect(boosted.toughness + Object.values(boosted).reduce((s, v) => s + v, 0))
      .toBeGreaterThanOrEqual(Object.values(base).reduce((s, v) => s + v, 0));
  });

  it('creature target uses different scale constants (STAT-04)', () => {
    const player = computeCharStats(5, emptyEquipment, 'player');
    const creature = computeCharStats(5, emptyEquipment, 'creature');
    // Power and toughness are deliberately different for creatures vs players
    expect(creature.power).not.toEqual(player.power);
  });

  it('returns all 8 stats as numbers with no undefined (STAT-01)', () => {
    const stats = computeCharStats(1, emptyEquipment);
    const STAT_KEYS = [
      'durability', 'toughness', 'power', 'haste',
      'vigor', 'recovery', 'perception', 'resilience'
    ] as const;
    for (const key of STAT_KEYS) {
      expect(typeof stats[key]).toBe('number');
      expect(stats[key]).toBeGreaterThan(0);
    }
  });
});
```

### Pattern 4: Updating combat files (stat name rename)

**What:** Replace `Partial<PlayerStats>` with `Partial<CharacterStats>` and rename field references.
**When to use:** After `CharacterStats` is exported from shared-types.

Old references to rename:

| File | Old field | New field |
|------|-----------|-----------|
| `combat/damage.ts` | `attackerStats.strength` | `attackerStats.power` |
| `combat/damage.ts` | `defenderStats.endurance` | `defenderStats.toughness` |
| `combat/damage.ts` | `attackerStats.agility` | `attackerStats.haste` |
| `combat/turn-order.ts` | `stats?.agility` | `stats?.haste` |

### Anti-Patterns to Avoid

- **Removing `PlayerStats` without a TypeScript compile check:** The type is re-exported from `shared-types/src/index.ts`. Deleting it but leaving the export in index.ts produces a silent broken build. Remove the export from index.ts in the same commit.
- **Using `Partial<CharacterStats>` in `computeCharStats` parameters:** The function signature takes `level` and `equipment` — not a partial stat struct. Partial is only appropriate in combat functions where a caller might not have all stats.
- **Putting `computeCharStats` in `shared-types`:** It depends on `@into-the-void/items` (ItemRegistry) which is not a shared-types dependency. The function lives in `game-logic`, matching `effectiveStats()` precedent.
- **Adding `stat_buff` effects to items with new stat names before this phase is complete:** Consumables in `items/src/definitions/consumables.ts` currently use `'endurance'`, `'scan_speed'` etc. for `stat_buff.stat`. These string values flow through `resolveEffect()` and land in `bonuses: Record<string, number>`. They do not break `computeCharStats` but will not map to the 8 stats unless item definitions are updated — that is Phase 31's concern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resolving equipment effects to stat deltas | Custom effect-resolution loop | Existing `resolveEffectsForTrigger()` from `game-logic/src/inventory/effects.ts` | Already handles `on_equip`, `passive`, and exhaustive `ItemEffect` union |
| Running unit tests | Custom test harness | `nx run game-logic:test` (Vitest, already configured) | `tsconfig.spec.json` + `@nx/vite:test` are already wired in `project.json` |
| Stat base-value tables | Constants scattered across functions | Single `SCALE_CONSTANTS` map keyed by `StatScaleTarget` | One place to tune values for Phase 31 combat milestone |

**Key insight:** The equipment aggregation pattern is already proven by `effectiveStats()` in `inventory/stats.ts`. Do not invent a different aggregation strategy — reuse `resolveEffectsForTrigger()` identically.

## Common Pitfalls

### Pitfall 1: Partial<> Silently Misses Renamed Stats

**What goes wrong:** `damage.ts` uses `attackerStats?.strength ?? 10`. After renaming `PlayerStats → CharacterStats`, TypeScript's `Partial<CharacterStats>` no longer has a `strength` field, so `attackerStats?.strength` evaluates to `undefined` at runtime — silently falling back to `10` instead of producing a compile error.

**Why it happens:** `Partial<T>` makes all fields optional; accessing a non-existent key on `Partial<T>` returns `undefined` instead of a type error in TypeScript's structural type system when the value is accessed via optional chaining (`?.`).

**How to avoid:** After updating the import to `CharacterStats`, explicitly search-and-replace `strength → power`, `endurance → toughness`, `agility → haste`. Run `pnpm tsc --noEmit` across the whole workspace to confirm zero type errors before committing.

**Warning signs:** `tsc --noEmit` passes but the old stat names still appear in damage.ts via `grep` — this means `Partial<>` masked the rename.

### Pitfall 2: StatsJson in Database Schema Not Updated

**What goes wrong:** `packages/database/src/schema/characters.ts` exports `StatsJson` with the old 5-stat shape. Any code that imports `StatsJson` and passes it to `computeCharStats` (in Phase 31) will fail at runtime because the shapes don't match.

**Why it happens:** `StatsJson` is a local interface in the database package, not re-exported through `shared-types`, so TypeScript doesn't create a cross-package compile error when it's stale.

**How to avoid:** Update `StatsJson` to the 8-stat shape in this phase as part of the type foundation work. The default in the Drizzle schema also needs updating (the `stats` column default currently is `{ strength: 10, agility: 10, ... }`).

**Warning signs:** `characters.ts` still has `strength` in the `StatsJson` interface after the phase is complete.

### Pitfall 3: Export Not Added to shared-types index.ts

**What goes wrong:** `CharacterStats` is defined in `player.ts` but not added to `packages/shared-types/src/index.ts` re-exports. Downstream packages (`game-logic`, future `apps/game-server`) cannot import it from `@into-the-void/shared-types`.

**Why it happens:** `index.ts` uses `export * from './core/player'` which would automatically include `CharacterStats` — BUT if `PlayerStats` is deleted from `player.ts` without removing it from any explicit named export elsewhere, there can be a stale export that hides the new type.

**How to avoid:** The existing `export * from './core/player'` line in `index.ts` already covers all exports from `player.ts`. Adding `CharacterStats` and `StatScaleTarget` to `player.ts` is sufficient — no manual index.ts change needed unless a named export is added elsewhere.

**Warning signs:** `import { CharacterStats } from '@into-the-void/shared-types'` produces "Module has no exported member 'CharacterStats'" in a downstream file.

### Pitfall 4: computeCharStats Has No Test for Equipment Effect Routing

**What goes wrong:** The `stat_buff` effect type has `stat: string` (freeform). A module that claims to add a `durability` bonus will call `resolveEffect()` which returns `applied: { durability: N }`. The `computeCharStats` aggregation loop then needs to check `if (stat in stats)` before adding — otherwise an unknown stat key gets silently discarded or produces a runtime property mutation on a typed object.

**Why it happens:** The existing `effectiveStats()` function handles this with a `switch` on known stat names, falling through to `bonuses: Record<string, number>` for unknowns. `computeCharStats` needs a similar boundary.

**How to avoid:** The aggregation loop should use `if (stat in stats)` as a guard, and optionally accumulate unknown bonuses in a separate `bonuses` field on the return type if Phase 31 needs it. For Phase 30, guard-and-skip is sufficient.

**Warning signs:** Unit test for equipment bonus passes but a `console.warn` appears for stat key mismatches during the test run.

### Pitfall 5: game-logic Tests Cannot Find @into-the-void/items in Vitest

**What goes wrong:** `nx run game-logic:test` fails with "Cannot find module '@into-the-void/items'" because Vitest's module resolver doesn't use the NX path alias in the same way as `tsc`.

**Why it happens:** `@nx/vite:test` executor uses Vite internally. Path aliases from `tsconfig.json` need to be reflected in a `vite.config.ts` (or handled by the NX executor automatically via `tsconfig` paths plugin).

**How to avoid:** Check whether `packages/game-logic` already has a `vite.config.ts`. If not, the `@nx/vite:test` executor typically reads `tsconfig.json` `paths` automatically for workspaces. Verify by running `nx run game-logic:test` after writing the first test. If it fails on module resolution, add a `vite.config.ts` with `@vitejs/plugin-basic-ssl` or the NX vite preset.

**Warning signs:** Test runner starts but immediately errors with "Cannot resolve workspace package" before any test runs.

## Code Examples

### How existing effectiveStats handles equipment aggregation

```typescript
// Source: packages/game-logic/src/inventory/stats.ts (existing, do not modify)
// computeCharStats uses the same resolveEffectsForTrigger pattern

import { resolveEffectsForTrigger } from './effects';

// Inside effectiveStats():
const equipEffects = resolveEffectsForTrigger(itemDef.effects, 'on_equip');
const passiveEffects = resolveEffectsForTrigger(itemDef.effects, 'passive');
const allEffects = [...equipEffects, ...passiveEffects];

for (const effect of allEffects) {
  for (const [stat, value] of Object.entries(effect.applied)) {
    switch (stat) {
      case 'armor':
        stats.armor += value;
        break;
      // ...
      default:
        stats.bonuses[stat] = (stats.bonuses[stat] ?? 0) + value;
    }
  }
}
```

### Updating combat/damage.ts after stat rename

```typescript
// Before (existing, must change):
damage += (attackerStats.strength ?? 10) * 0.5;
const actualCritChance = critChance + (attackerStats.agility ?? 10) * 0.005;
const effectiveArmor = armorReduction * (1 + (defenderStats.endurance ?? 10) * 0.02);

// After (new stat names from CharacterStats):
damage += (attackerStats.power ?? 10) * 0.5;
const actualCritChance = critChance + (attackerStats.haste ?? 10) * 0.005;
const effectiveArmor = armorReduction * (1 + (defenderStats.toughness ?? 10) * 0.02);
```

### Updating StatsJson in database schema

```typescript
// Before (packages/database/src/schema/characters.ts):
export interface StatsJson {
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
  perception: number;
}
// And the column default: { strength: 10, agility: 10, endurance: 10, intelligence: 10, perception: 10 }

// After:
export interface StatsJson {
  durability: number;
  toughness: number;
  power: number;
  haste: number;
  vigor: number;
  recovery: number;
  perception: number;
  resilience: number;
}
// New column default: { durability: 100, toughness: 50, power: 50, haste: 50, vigor: 80, recovery: 30, perception: 40, resilience: 30 }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `PlayerStats` with 5 fields | `CharacterStats` with 8 fields | Phase 30 (this phase) | All `PlayerStats` references break at compile time — intentional, signals all call sites |
| `StatsJson` with old 5-field default | `StatsJson` with new 8-field default | Phase 30 (this phase) | Drizzle schema default changes; existing DB rows still have old JSON until Phase 31 migration |
| `effectiveStats()` handles all stat computation | `computeCharStats()` handles primary stat computation; `effectiveStats()` may be retired or merged in Phase 31 | Phase 30 introduces, Phase 31 reconciles | Two separate stat functions temporarily co-exist — this is correct for the phase boundary |

**Deprecated/outdated:**
- `PlayerStats` (5 stats): Replaced by `CharacterStats` (8 stats) in this phase. The identifier `PlayerStats` must be fully removed from `packages/shared-types/src/core/player.ts` — do not keep it as an alias.
- Old `StatsJson` defaults in Drizzle schema: The TypeScript interface is updated in Phase 30; the SQL default value update happens as part of schema changes in this same phase, but existing DB rows are not back-filled until Phase 31.

## Open Questions

1. **Do item `stat_buff` effects need to reference the new stat names for `computeCharStats` to pick them up?**
   - What we know: `stat_buff` effects use freeform `stat: string` (e.g., `'endurance'`, `'scan_speed'`). `computeCharStats` will use `if (stat in stats)` guard — so `'endurance'` would not match `CharacterStats` and the bonus would be silently discarded.
   - What's unclear: Whether consumable buffs like `'endurance'` are intended to affect the new `toughness` stat or be completely ignored until a later phase.
   - Recommendation: For Phase 30, silently discard unrecognized stat names (they go through the `if (stat in stats)` guard and are skipped). Document this as an explicit decision. Phase 31 can map old buff names to new stat names when updating item definitions.

2. **Should `computeCharStats` return a `CharStatsPayload` (base + equipment breakdown) or just `CharacterStats`?**
   - What we know: Phase 32 success criteria require the HUD to show "115 (100 base + 15 from modules)". The breakdown is a Phase 31/32 concern per the milestone roadmap.
   - What's unclear: Whether Phase 30 needs to return the breakdown or whether it's added in Phase 31.
   - Recommendation: Phase 30 returns plain `CharacterStats`. Phase 31 introduces `CharStatsPayload` with `{ stats: CharacterStats, base: CharacterStats, bonuses: CharacterStats }` — the pure function signature can be extended without breaking tests.

3. **What are the canonical numeric tuning values for base stats and growth rates?**
   - What we know: The ROADMAP says "linear scaling is verifiable by unit test" and "level 10 > level 1" — it does not prescribe specific numbers.
   - What's unclear: Game-design approved values for base and growth rates per stat.
   - Recommendation: Use the values in the code example in this document as sensible defaults that satisfy the unit test criteria. Flag these values as tuning parameters that the game-design team should validate before Phase 31 wires them into combat.

## Sources

### Primary (HIGH confidence)

- Codebase — `packages/shared-types/src/core/player.ts` — current `PlayerStats` shape (5 stats confirmed)
- Codebase — `packages/game-logic/src/combat/damage.ts` — stat field names in use (`strength`, `agility`, `endurance`)
- Codebase — `packages/game-logic/src/combat/turn-order.ts` — stat field name in use (`agility`)
- Codebase — `packages/game-logic/src/inventory/stats.ts` — existing `effectiveStats()` pattern to replicate
- Codebase — `packages/game-logic/src/inventory/effects.ts` — `resolveEffectsForTrigger()` API to reuse
- Codebase — `packages/database/src/schema/characters.ts` — `StatsJson` with old 5-stat shape
- Codebase — `packages/game-logic/project.json` — confirms `@nx/vite:test` executor + `passWithNoTests: true`
- Codebase — `packages/game-logic/tsconfig.spec.json` — confirms test pattern `src/**/*.test.ts`
- `.planning/ROADMAP.md` v1.7 milestone — canonical 8 stat names: `Durability, Toughness, Power, Haste, Vigor, Recovery, Perception, Resilience`
- `.planning/codebase/TESTING.md` — Vitest patterns, co-location convention, `describe/it/expect` usage

### Secondary (MEDIUM confidence)

- `.planning/codebase/ARCHITECTURE.md` — package dependency graph (shared-types → game-logic direction confirmed)

### Tertiary (LOW confidence)

- None — all findings verified directly from codebase files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already in the monorepo, no new dependencies
- Architecture: HIGH — mirroring an existing proven pattern (`effectiveStats()`)
- Pitfalls: HIGH — Partial<> silent rename pitfall verified by reading actual damage.ts code; export pitfall verified by reading index.ts
- Test patterns: HIGH — `tsconfig.spec.json` and `project.json` confirmed; no existing test files to contradict

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable domain; TypeScript and Vitest APIs don't change rapidly)
