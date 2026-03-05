# Phase 115: Shared Type Foundation - Research

**Researched:** 2026-03-03
**Domain:** TypeScript type system — discriminated unions, interface extension, shared-types and entities package structure
**Confidence:** HIGH

---

## Summary

Phase 115 is a pure TypeScript type-authoring phase with no behavioral changes. All five requirements (FNDN-01 through FNDN-05) are additive — they add new types, extend existing interfaces, and expand a discriminated union. No runtime logic changes are needed; the success criterion is "TypeScript compile passes with all new fields present and required."

The codebase has two packages relevant to this work: `packages/shared-types` (contract layer used by both server and client) and `packages/entities` (creature/plant/mineral definitions that import from shared-types). The `packages/game-logic` package imports from shared-types and is where `AiTickResult` and `calculateDamage()` live. All five additions land in shared-types except the `resistances` field on `CreatureDefinition`, which lives in `packages/entities/src/types.ts`.

The most consequential decision is making `resistances` a **required** field on `CreatureDefinition` (FNDN-02). Because there are ~57 creature definitions across six files, every existing definition will become a TypeScript compile error until all are patched to include a neutral-resistance object. The planner should account for this as a bulk-update task across all creature definition files.

**Primary recommendation:** Author all five type additions in one wave (DamageType union → DamageResistances interface → AbilityEffect variants → DeployableEntity → AiTickResult fields), then fix all ~57 creature definitions in bulk. This avoids multiple rounds of compile errors.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FNDN-01 | DamageType union (Thermal/Cryo/Bio/Kinetic) exported from shared-types and consumed by game-logic damage pipeline | Add `DamageType` union to `packages/shared-types/src/game/combat.ts`; re-export from `index.ts`; confirm `packages/game-logic/src/combat/damage.ts` imports it without errors |
| FNDN-02 | DamageResistances interface on CreatureDefinition as required field with neutral defaults | Add `DamageResistances` interface to shared-types; add `resistances: DamageResistances` as required field on `CreatureDefinition` in `packages/entities/src/types.ts`; patch all ~57 creature definition objects with neutral `{ thermal: 0, cryo: 0, bio: 0, kinetic: 0 }` |
| FNDN-03 | Shield and damage_reduction variants added to AbilityEffect discriminated union | Extend `AbilityEffect` union in `packages/shared-types/src/game/ability.ts` with two new variants |
| FNDN-04 | DeployableEntity interface exported from shared-types for automation structures | New interface in shared-types (likely `packages/shared-types/src/core/entity.ts` or a new `game/deployable.ts`); re-exported from `index.ts` |
| FNDN-05 | AiTickResult extended with stampede, packCall, ambush, frenzied signal fields | Extend `AiTickResult` interface in `packages/game-logic/src/ai/creature-ai.ts` with four optional boolean fields |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | (project tsconfig) | Type system enforcement | All packages use strict TypeScript; no new dependencies needed |
| Vitest | (project config) | Test runner for `packages/game-logic` | Already in use; `nx run game-logic:test` runs existing tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @into-the-void/shared-types | workspace | Contract layer imported by entities and game-logic | For DamageType, DamageResistances, AbilityEffect extensions, DeployableEntity |
| @into-the-void/entities | workspace | CreatureDefinition lives here, imports from shared-types | For adding resistances required field |

**Installation:** No new packages needed. All work is type authoring only.

---

## Architecture Patterns

### Recommended Project Structure

Changes spread across:
```
packages/shared-types/src/game/
├── combat.ts          # ADD: DamageType union, DamageResistances interface
└── ability.ts         # EXTEND: AbilityEffect discriminated union (shield, damage_reduction)

packages/shared-types/src/core/
└── entity.ts          # ADD: DeployableEntity interface (or new game/deployable.ts)

packages/shared-types/src/
└── index.ts           # RE-EXPORT: any new files added

packages/entities/src/
├── types.ts           # EXTEND: CreatureDefinition with required resistances field
└── definitions/
    ├── creatures.ts           # PATCH: add resistances to all definitions
    ├── aquatic-creatures.ts   # PATCH: add resistances to all definitions
    └── exotic-creatures.ts    # PATCH: add resistances to all definitions

packages/game-logic/src/ai/
└── creature-ai.ts     # EXTEND: AiTickResult with stampede/packCall/ambush/frenzied
```

### Pattern 1: DamageType Union (FNDN-01)

**What:** A string-literal union type representing the four damage categories from lore.

**When to use:** This is the canonical type that all downstream damage systems (Phase 117) will accept. Phase 115 introduces the union; Phase 117 wires it into calculateDamage().

**Example:**
```typescript
// packages/shared-types/src/game/combat.ts

/**
 * Damage type categories for the v1.24 damage system.
 * - Thermal: heat-based damage (fire, plasma, volcanic)
 * - Cryo: cold-based damage (ice, freeze)
 * - Bio: biological/chemical damage (poison, spores, acid)
 * - Kinetic: physical/impact damage (melee, projectile, explosive)
 */
export type DamageType = 'Thermal' | 'Cryo' | 'Bio' | 'Kinetic';
```

### Pattern 2: DamageResistances Interface + Required Field (FNDN-02)

**What:** A typed object covering all four DamageType keys, each as a signed number (negative = vulnerable, positive = resistant, 0 = neutral).

**Critical:** The `resistances` field must be **required** (no `?`), not optional. This is stated as a success criterion. The planner must ensure all ~57 creature objects are patched — TypeScript will flag each as a compile error until fixed.

**Neutral defaults pattern for definitions:**
```typescript
// packages/shared-types/src/game/combat.ts (or a separate resistances.ts)

/**
 * Damage resistance values per damage type.
 * Values represent percentage resistance (0 = neutral, 50 = 50% reduction, -20 = 20% vulnerable).
 * Range enforcement (0.3x floor, 1.5x ceiling) is applied by calculateDamage() in Phase 117.
 */
export interface DamageResistances {
  readonly thermal: number;
  readonly cryo: number;
  readonly bio: number;
  readonly kinetic: number;
}

/**
 * Neutral resistance profile — used as default for creatures not yet assigned biome resistances.
 * Phase 117 will replace these with biome-appropriate values per DMGT-02.
 */
export const NEUTRAL_RESISTANCES: DamageResistances = {
  thermal: 0,
  cryo: 0,
  bio: 0,
  kinetic: 0,
};
```

```typescript
// packages/entities/src/types.ts — extend CreatureDefinition

export interface CreatureDefinition extends BaseEntityDefinition {
  readonly entityClass: 'creature';
  readonly behavior: CreatureBehavior;
  readonly baseHealth: number;
  readonly levelRange: readonly [number, number];
  readonly baseXp: number;
  readonly respawnSeconds: number;
  /** Damage resistances per type. Required; use NEUTRAL_RESISTANCES for unlabeled creatures. */
  readonly resistances: DamageResistances;  // NOT optional
}
```

### Pattern 3: AbilityEffect Discriminated Union Extension (FNDN-03)

**What:** Two new variants added to the existing `AbilityEffect` union in `packages/shared-types/src/game/ability.ts`.

The existing union uses `{ readonly type: 'X'; ... }` discriminated pattern. The two new variants must follow the exact same pattern.

- `shield`: absorbs damage up to a pool amount within a time window (for ABIL-09 Emergency Shield rebalance)
- `damage_reduction`: flat percentage reduction for a duration (for ABIL-12 Fortify Systems rebalance)

**Example:**
```typescript
// packages/shared-types/src/game/ability.ts — extend AbilityEffect

export type AbilityEffect =
  | { readonly type: 'damage'; readonly baseDamage: number; readonly scaling: number }
  | { readonly type: 'heal'; readonly baseHeal: number; readonly scaling: number }
  | { readonly type: 'buff'; readonly stat: string; readonly amount: number; readonly duration: number }
  | { readonly type: 'debuff'; readonly stat: string; readonly amount: number; readonly duration: number }
  | { readonly type: 'dot'; readonly damagePerTick: number; readonly tickInterval: number; readonly duration: number }
  | { readonly type: 'hot'; readonly healPerTick: number; readonly tickInterval: number; readonly duration: number }
  | { readonly type: 'gather'; readonly gatherType: 'harvest' | 'mine' | 'universal'; readonly baseYield: number }
  | { readonly type: 'shield'; readonly absorbAmount: number; readonly durationMs: number }
  | { readonly type: 'damage_reduction'; readonly reductionPercent: number; readonly durationMs: number };
```

### Pattern 4: DeployableEntity Interface (FNDN-04)

**What:** A new interface representing an automation deployable (extractor, beacon, refinery) placed in the world. It extends `Entity` (since `EntityType` already has `'structure'` which is close) or is a standalone interface.

Looking at the entity hierarchy: the existing `Structure` entity has `ownerId`, `durability`, `maxDurability`. A `DeployableEntity` is more specialized — it needs an owner, a deployable type, and lifecycle fields like degradation.

The new `EntityType` should include `'deployable'` OR `DeployableEntity` can extend `Entity` with `type: 'structure'` reuse. Given AUTO-07 requires a `deployables` database table, the cleanest approach is a new `type: 'deployable'` discriminant.

**Example:**
```typescript
// packages/shared-types/src/core/entity.ts

// Add 'deployable' to EntityType union:
export type EntityType =
  | 'player'
  | 'creature'
  | 'mineral'
  | 'plant'
  | 'artifact'
  | 'structure'
  | 'item'
  | 'npc'
  | 'deployable';  // NEW

/**
 * Deployable automation structure placed by a player in the world.
 * Used by Phase 121 AutomationService for extractor/beacon/refinery logic.
 */
export interface DeployableEntity extends Entity {
  type: 'deployable';
  /** Which deployable type (e.g., 'extractor', 'survey_beacon', 'planetary_extractor', 'refinery') */
  deployableType: string;
  /** Owner character ID */
  ownerId: string;
  /** Current durability (0 = destroyed) */
  durability: number;
  /** Maximum durability */
  maxDurability: number;
  /** Unix timestamp when deployed */
  deployedAt: number;
  /** Unix timestamp when deployable expires (null = no expiry for permanent types) */
  expiresAt: number | null;
}
```

### Pattern 5: AiTickResult Signal Fields (FNDN-05)

**What:** Extend the existing `AiTickResult` interface in `packages/game-logic/src/ai/creature-ai.ts` with four optional boolean signal fields for group behaviors defined in Phase 119.

These are signals — not state. The boolean signals indicate "this tick should trigger group behavior X." They are optional because existing FSM paths don't emit them; Phase 119 will fill them in.

**Example:**
```typescript
// packages/game-logic/src/ai/creature-ai.ts — extend AiTickResult

export interface AiTickResult {
  /** null means the creature did not move this tick */
  newPosition: Position | null;
  /** For predator/maniac: playerId to initiate combat with (aggro triggered) */
  aggroTarget?: string;
  /** For combat: whether to attack current target */
  shouldAttack?: boolean;
  /** For leash: whether creature should return to spawn */
  shouldReturn?: boolean;
  /** FNDN-05: Stampede signal — herbivore group flight path deals kinetic damage (Phase 119) */
  stampede?: boolean;
  /** FNDN-05: Pack Call signal — omnivore calls nearby allies when provoked (Phase 119) */
  packCall?: boolean;
  /** FNDN-05: Ambush signal — predator first-strike from stealth (Phase 119) */
  ambush?: boolean;
  /** FNDN-05: Frenzied signal — maniac below 30% HP, attack speed 2x, defense halved (Phase 119) */
  frenzied?: boolean;
}
```

### Anti-Patterns to Avoid

- **Making `resistances` optional with `?`:** The success criterion explicitly requires a required field that causes a TypeScript compile error when absent. Do not use `resistances?: DamageResistances`.
- **Putting DamageResistances in entities package instead of shared-types:** game-logic (calculateDamage) and the server (damage pipeline) need it. It belongs in shared-types.
- **Using `string` for DamageType instead of a union:** Phase 117 needs exhaustive switch statements on damage type; a string union enables this. A plain string loses that safety.
- **Forgetting to re-export from shared-types index.ts:** Any new file in shared-types must be added to `packages/shared-types/src/index.ts`. The current index does not auto-wildcard new files.
- **Forgetting to import DamageResistances in entities/src/types.ts:** The entities package imports from `@into-the-void/shared-types`. The import list at line 7 of types.ts currently is `import type { BiomeType, CreatureBehavior, NodeRarity } from '@into-the-void/shared-types';` — this must be extended.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Neutral resistance constant | A per-creature function | `NEUTRAL_RESISTANCES` exported const from shared-types | 57 creature definitions need the same object; a const avoids duplication and is importable |
| Export wiring | Manual tracking | TypeScript compile check is the verification | tsc will fail at any consumer if exports are missing; no need for a separate tracking system |

**Key insight:** This phase is pure type plumbing — TypeScript's compile step IS the test suite. There are no unit tests to write for Phase 115 (nyquist_validation is off and behavior is unchanged).

---

## Common Pitfalls

### Pitfall 1: Creature Definition Bulk-Update Scope
**What goes wrong:** Developer adds `resistances` as required to `CreatureDefinition`, fixes `creatures.ts`, but misses `aquatic-creatures.ts` and `exotic-creatures.ts`. Build passes in isolation but fails at package level.

**Why it happens:** Creatures are spread across three files. ENTITY_IDS in definitions/index.ts shows: ~43 land creatures (creatures.ts), ~14 aquatic creatures (aquatic-creatures.ts), ~15 exotic creatures (exotic-creatures.ts) = approximately 57 total creature definitions across three files.

**How to avoid:** After adding the required field, run `nx run entities:typecheck` (or `tsc --noEmit`) from the entities package to see all compile errors at once. Fix all three files before committing.

**Warning signs:** If only `creatures.ts` is patched and compile reports no errors, the build system may not be checking all definition files — verify with full `pnpm build` or `nx run entities:typecheck`.

### Pitfall 2: DamageResistances Import Chain
**What goes wrong:** `DamageResistances` is added to shared-types but not re-exported from `packages/shared-types/src/index.ts`. The entities package then fails to import it via `@into-the-void/shared-types`.

**Why it happens:** shared-types/src/index.ts explicitly lists every export file. New types added to `combat.ts` are picked up automatically (since `export * from './game/combat'` is already there). But if a new file like `game/deployable.ts` is created, it MUST be added to index.ts.

**How to avoid:** Check whether the new types go into existing files (DamageType/DamageResistances into combat.ts = already exported; AbilityEffect into ability.ts = already exported) vs new files (DeployableEntity may be new file = needs index.ts entry).

**Recommendation:** Place `DeployableEntity` in the existing `packages/shared-types/src/core/entity.ts` to avoid the index.ts gap risk. The `EntityType` union already lives there and needs `'deployable'` added.

### Pitfall 3: AbilityEffect Variant Naming Consistency
**What goes wrong:** New variant uses `duration` (ms vs seconds ambiguity) while existing `dot` and `hot` variants use `tickInterval` + `duration`. Phase 118 code that pattern-matches the union may use wrong field names.

**Why it happens:** The existing union has mixed naming conventions. `buff` uses `duration: number`. `dot` uses `tickInterval: number; duration: number`. New variants need to follow the same milliseconds convention used by existing variants.

**How to avoid:** Use `durationMs` for the new `shield` and `damage_reduction` variants to be explicit about units, since the value semantics differ from the `buff` variants which don't have "Ms" suffix.

---

## Code Examples

### Verified: Existing AbilityEffect discriminated union (for extension reference)
```typescript
// Source: packages/shared-types/src/game/ability.ts (current)
export type AbilityEffect =
  | { readonly type: 'damage'; readonly baseDamage: number; readonly scaling: number }
  | { readonly type: 'heal'; readonly baseHeal: number; readonly scaling: number }
  | { readonly type: 'buff'; readonly stat: string; readonly amount: number; readonly duration: number }
  | { readonly type: 'debuff'; readonly stat: string; readonly amount: number; readonly duration: number }
  | { readonly type: 'dot'; readonly damagePerTick: number; readonly tickInterval: number; readonly duration: number }
  | { readonly type: 'hot'; readonly healPerTick: number; readonly tickInterval: number; readonly duration: number }
  | { readonly type: 'gather'; readonly gatherType: 'harvest' | 'mine' | 'universal'; readonly baseYield: number };
```

### Verified: Existing AiTickResult (for extension reference)
```typescript
// Source: packages/game-logic/src/ai/creature-ai.ts (current)
export interface AiTickResult {
  newPosition: Position | null;
  aggroTarget?: string;
  shouldAttack?: boolean;
  shouldReturn?: boolean;
}
```

### Verified: Existing CreatureDefinition (for required field addition)
```typescript
// Source: packages/entities/src/types.ts (current)
export interface CreatureDefinition extends BaseEntityDefinition {
  readonly entityClass: 'creature';
  readonly behavior: CreatureBehavior;
  readonly baseHealth: number;
  readonly levelRange: readonly [number, number];
  readonly baseXp: number;
  readonly respawnSeconds: number;
  // MISSING: resistances (must be added as required in this phase)
}
```

### Verified: Existing entity.ts imports section (for DamageResistances re-export pattern)
```typescript
// Source: packages/entities/src/types.ts line 7
import type { BiomeType, CreatureBehavior, NodeRarity } from '@into-the-void/shared-types';
// Must become:
import type { BiomeType, CreatureBehavior, NodeRarity, DamageResistances } from '@into-the-void/shared-types';
```

### Verified: Sample creature definition (bulk-update target pattern)
```typescript
// Source: packages/entities/src/definitions/creatures.ts (current — no resistances field)
export const CREATURE_VOID_CRAWLER: CreatureDefinition = {
  id: 'creature_void_crawler',
  // ... existing fields
  behavior: 'omnivore',
  baseHealth: 80,
  levelRange: [1, 5],
  baseXp: 15,
  respawnSeconds: 180,
  // WILL BE ADDED by this phase:
  resistances: NEUTRAL_RESISTANCES,
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Optional resistances (`?`) | Required field with neutral defaults | Phase 115 | Forces compile error on missing definitions — Phase 117 cannot silently use wrong defaults |
| No damage types | `DamageType` union with 4 members | Phase 115 | Phase 117 can do exhaustive matching on damage types |
| Toughness buff for shields | `shield` absorb variant in AbilityEffect | Phase 115 | Phase 118 Emergency Shield rebalance has proper type support |

---

## Open Questions

1. **Where exactly does DeployableEntity live?**
   - What we know: `entity.ts` already has `EntityType` union and all entity interfaces. Adding to it keeps the file self-contained.
   - What's unclear: `entity.ts` could grow large. A separate `game/deployable.ts` is cleaner but risks the index.ts export gap.
   - Recommendation: Place `DeployableEntity` in `entity.ts` alongside other entity interfaces, and add `'deployable'` to `EntityType`. Avoids the export gap risk entirely.

2. **DamageResistances: combat.ts or new file?**
   - What we know: `combat.ts` already exports `CombatResult`, `CombatEffect`, `EffectType`, etc. Adding `DamageType` and `DamageResistances` there is consistent with the "combat types" grouping.
   - What's unclear: No blockers found. `combat.ts` is the right home.
   - Recommendation: Add both `DamageType` and `DamageResistances` to `combat.ts`. No new file needed.

3. **NEUTRAL_RESISTANCES constant: where to export it?**
   - What we know: All 57 creature definitions need it as the initial value. It could live in shared-types (combat.ts) or entities package.
   - Recommendation: Export from `packages/shared-types/src/game/combat.ts` alongside `DamageResistances`. The entities package already imports from shared-types.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `packages/shared-types/src/game/ability.ts` (AbilityEffect union, verified current)
- Direct codebase inspection — `packages/game-logic/src/ai/creature-ai.ts` (AiTickResult interface, verified current)
- Direct codebase inspection — `packages/entities/src/types.ts` (CreatureDefinition interface, verified current)
- Direct codebase inspection — `packages/shared-types/src/index.ts` (export list, verified)
- Direct codebase inspection — `packages/entities/src/definitions/index.ts` (ENTITY_IDS, ~57 creatures confirmed)
- Direct codebase inspection — `packages/shared-types/src/game/combat.ts` (CombatResult, EffectType, verified)

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — FNDN-01 through FNDN-05 requirements text
- `.planning/STATE.md` — v1.24 decisions and context

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure TypeScript, no new dependencies, all tooling verified in codebase
- Architecture: HIGH — all target files read and verified; exact current state known
- Pitfalls: HIGH — identified from direct inspection of the codebase (creature file count, import chain, naming conventions)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable TypeScript codebase; valid for 30 days)
