# Stack Research: Equipment Stat Aggregation Patterns

**Domain:** RPG Equipment Stat System (TypeScript/Game Development)
**Researched:** 2026-02-21
**Confidence:** HIGH

## Executive Summary

Into the Void already has the foundation for clean equipment stat bonuses: discriminated union effects, pure resolver functions, and server-authoritative computation. The missing piece is extending the existing `{ type: 'stats', ... }` effect pattern to aggregate CharacterStats bonuses from multiple equipment pieces.

**Recommended approach:** Extend existing effect system with additive aggregation using `Array.reduce()` pattern and TypeScript `Partial<CharacterStats>` type for optional stat bonuses.

## Recommended Pattern

### Core Approach: Pure Aggregation Function

**Technology:** TypeScript discriminated unions + Array.reduce()
**Purpose:** Aggregate CharacterStats from multiple equipment effects
**Why:** Already proven in codebase (see `effectiveStats()` in `packages/game-logic/src/inventory/stats.ts`)

```typescript
/**
 * Aggregate CharacterStats bonuses from all equipped items.
 * Pure function - no side effects, server-authoritative.
 */
export function aggregateCharacterStats(equipment: EquipmentJson): CharacterStats {
  const baseStats: CharacterStats = {
    durability: 0,
    toughness: 0,
    power: 0,
    haste: 0,
    vigor: 0,
    recovery: 0,
    perception: 0,
    resilience: 0,
  };

  // Collect all equipped items
  const equippedItems: InventoryItemJson[] = [
    equipment.exosuit,
    ...equipment.modules,
    equipment.tool,
    equipment.accessory1,
    equipment.accessory2,
  ].filter((item): item is InventoryItemJson => item !== undefined);

  // Aggregate stats from on_equip and passive effects
  for (const equippedItem of equippedItems) {
    const itemDef = ItemRegistry.get(equippedItem.itemId);
    if (!itemDef) continue;

    const equipEffects = resolveEffectsForTrigger(itemDef.effects, 'on_equip');
    const passiveEffects = resolveEffectsForTrigger(itemDef.effects, 'passive');
    const allEffects = [...equipEffects, ...passiveEffects];

    for (const effect of allEffects) {
      for (const [stat, value] of Object.entries(effect.applied)) {
        if (stat in baseStats) {
          baseStats[stat as keyof CharacterStats] += value;
        }
      }
    }
  }

  return baseStats;
}
```

### Effect Definition Pattern

**Current pattern (working, needs extension):**
```typescript
// Already exists in types.ts line 46
| { readonly type: 'stats'; readonly durability?: number; readonly toughness?: number; readonly power?: number; readonly haste?: number; readonly vigor?: number; readonly recovery?: number; readonly perception?: number; readonly resilience?: number };
```

**Why this pattern:**
- Uses `Partial<CharacterStats>` semantics (all optional properties)
- Type-safe with exhaustive checking
- Integrates cleanly with existing `resolveEffect()` function
- Already deployed in production code

### Resolver Extension

**Extend `resolveEffect()` in `packages/game-logic/src/inventory/effects.ts`:**

```typescript
case 'stats':
  return {
    type: 'stats',
    applied: {
      ...(effect.durability !== undefined && { durability: effect.durability }),
      ...(effect.toughness !== undefined && { toughness: effect.toughness }),
      ...(effect.power !== undefined && { power: effect.power }),
      ...(effect.haste !== undefined && { haste: effect.haste }),
      ...(effect.vigor !== undefined && { vigor: effect.vigor }),
      ...(effect.recovery !== undefined && { recovery: effect.recovery }),
      ...(effect.perception !== undefined && { perception: effect.perception }),
      ...(effect.resilience !== undefined && { resilience: effect.resilience }),
    },
  };
```

## Implementation Architecture

### Data Flow

```
Equipment Items (DB)
  → ItemRegistry.get() → ItemDefinition[]
  → resolveEffectsForTrigger() → EffectResult[]
  → aggregateCharacterStats() → CharacterStats
  → CharStatsPayload { base, equipment, total }
  → Socket.IO 'stats:update' → Client
```

### Type Safety Pattern

**Use TypeScript utility types for clean definitions:**

```typescript
// Option 1: Existing inline pattern (already in codebase)
type StatsEffect = {
  readonly type: 'stats';
  readonly [K in keyof CharacterStats]?: number;
};

// Option 2: Explicit Partial (more readable)
type StatsEffect = {
  readonly type: 'stats';
} & Partial<Record<keyof CharacterStats, number>>;
```

**Recommendation:** Keep inline pattern (already deployed). It's explicit, type-safe, and autocomplete-friendly.

## Aggregation Mechanics

### Additive vs Multiplicative

**Pattern used in RPG development:**
1. **Additive bonuses** (equipment stats): Sum all values
2. **Multiplicative modifiers** (buffs/debuffs): Apply after addition

**Why separate:**
- Equipment = permanent, additive bonuses
- Buffs/debuffs = temporary, multiplicative effects
- Prevents order-dependency issues when stacking effects

**Current codebase implementation:**
```typescript
// Additive (equipment stats)
stats.armor += value;

// Multiplicative (speed effects)
stats.speedMultiplier *= value;
```

**Recommendation:** Keep this pattern. CharacterStats should be purely additive from equipment.

### Application Order

**Industry standard pattern:**
```
FinalValue = (BaseValue + AdditiveBonus) × (1 + MultiplicativeBonus)
```

**Example:**
- Base durability: 10
- Equipment bonuses: +20 (suit) + +5 (module) = +25
- Buff: +50% durability
- Final: (10 + 25) × 1.5 = 52.5

**Current implementation:** Equipment aggregation happens in `effectiveStats()`, buffs would be separate system (not yet implemented).

## Dictionary vs Individual Properties

### Pattern Comparison

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Dictionary** (`Record<string, number>`) | Easy to add new stats, loop-friendly | Loses type safety, typos at runtime | Use for dynamic/temporary bonuses |
| **Individual Properties** (`CharacterStats` interface) | Type-safe, autocomplete, compile-time checks | Verbose effect definitions | **Use for equipment stats** |

**Codebase uses both:**
- `CharacterStats` interface (line 61-78 in player.ts) — base/equipment stats
- `bonuses: Record<string, number>` (line 18 in stats.ts) — catch-all for unknown stats

**Why this works:**
- Known stats (CharacterStats) are type-safe
- Unknown stats fall into `bonuses` dictionary
- Best of both worlds

## Integration with Existing Systems

### Current Effect System (Working)

**Already implemented (no changes needed):**
```typescript
// Effect definition in items
effects: [
  { trigger: 'on_equip', effect: { type: 'armor', value: 50 } },
  { trigger: 'on_equip', effect: { type: 'speed', multiplier: 1.1 } },
]

// Resolution in game-logic
resolveEffectsForTrigger(itemDef.effects, 'on_equip')
  → [{ type: 'armor', applied: { armor: 50 } }, ...]
```

### Proposed Extension (Minimal Changes)

**Add stats effect handling:**
```typescript
// 1. Add case to resolveEffect() switch (effects.ts)
case 'stats':
  return {
    type: 'stats',
    applied: { /* spread CharacterStats properties */ },
  };

// 2. Add aggregation function (new file: character-stats.ts)
export function aggregateCharacterStats(equipment: EquipmentJson): CharacterStats;

// 3. Call from InventoryService when equipment changes
const equipmentStats = aggregateCharacterStats(equipment);
```

## Performance Considerations

### Aggregation Cost

**Operation:** O(items × effects × stats)
- Items: ~5 (suit + 4 modules + tool + 2 accessories)
- Effects per item: ~1-3
- Stats: 8 (CharacterStats)
- **Total:** ~120 operations per equip/unequip

**Optimization patterns:**
1. **Lazy computation** — only compute when equipment changes
2. **Memoization** — cache result until equipment mutates
3. **Incremental updates** — track diffs instead of full recompute

**Recommendation for Into the Void:** Lazy computation is sufficient. Equip operations are infrequent (not every frame). Current `effectiveStats()` pattern already uses this.

### Caching Strategy

```typescript
// In InventoryService (server)
private statsCache: Map<string, CharacterStats> = new Map();

private recomputeStats(characterId: string, equipment: EquipmentJson): CharacterStats {
  const stats = aggregateCharacterStats(equipment);
  this.statsCache.set(characterId, stats);
  return stats;
}

// Invalidate on equip/unequip
async equipItem(...) {
  // ... equip logic
  const stats = this.recomputeStats(characterId, equipment);
  this.server.emit('stats:update', { base, equipment: stats, total });
}
```

**When to use:** If profiling shows stat computation is hot path (unlikely).

## Migration from stat_buff Effects

### Current Pattern (Temporary)

**Existing equipment uses `stat_buff` with duration: 0:**
```typescript
// From suits.ts line 25-26
{ trigger: 'on_equip', effect: { type: 'stat_buff', stat: 'toughness', amount: 5, duration: 0 } },
{ trigger: 'on_equip', effect: { type: 'stat_buff', stat: 'durability', amount: 20, duration: 0 } },
```

### Proposed Pattern (Clean)

**Replace with dedicated `stats` effect:**
```typescript
// New pattern
{ trigger: 'on_equip', effect: { type: 'stats', toughness: 5, durability: 20 } },
```

**Benefits:**
- Fewer effect objects (1 vs 2)
- Clearer intent (permanent stats, not temporary buff)
- Easier to read/maintain

**Migration strategy:**
1. Implement `stats` effect handler in `resolveEffect()`
2. Update item definitions to use new pattern
3. Keep `stat_buff` for temporary buffs (potions, abilities)
4. Remove `stat_buff` with `duration: 0` pattern (deprecated)

## TypeScript Patterns

### Partial Type for Stat Bonuses

**Pattern:** `Partial<CharacterStats>` allows optional properties

```typescript
// Instead of requiring all 8 stats:
type BadStatsEffect = {
  type: 'stats';
  durability: number;
  toughness: number;
  // ... must specify all 8!
};

// Use Partial pattern (all optional):
type GoodStatsEffect = {
  type: 'stats';
} & Partial<CharacterStats>;
```

**Why:** Equipment rarely affects all 8 stats. Suits might give durability + toughness, tools might give power + perception.

**TypeScript utility:** `Partial<T>` constructs type with all properties of T set to optional.

### Type Guard for Stats Effect

```typescript
function isStatsEffect(effect: ItemEffect): effect is StatsEffect {
  return effect.type === 'stats';
}

// Usage
const statsEffects = allEffects.filter(isStatsEffect);
// TypeScript now knows these are StatsEffect, not generic ItemEffect
```

**When to use:** If you need to separate stats effects from other effect types before aggregation.

### Exhaustive Switch Checking

**Already in codebase (effects.ts line 98-106):**
```typescript
default: {
  const _exhaustive: never = effect;
  console.warn('Unknown effect type:', _exhaustive);
  return { type: 'unknown', applied: {} };
}
```

**Why this matters:** TypeScript will error if a new effect type is added to the union but not handled in the switch. Prevents silent bugs.

## Alternatives Considered

### Alternative 1: Decorator Pattern

**Pattern:** Chain decorators wrapping base character stats

```typescript
let stats = new BaseCharacterStats();
stats = new EquipmentDecorator(stats, suitItem);
stats = new EquipmentDecorator(stats, moduleItem);
// etc.
```

**Pros:**
- Object-oriented, familiar to C#/Java developers
- Each decorator encapsulates one item's bonuses

**Cons:**
- More boilerplate than functional approach
- Doesn't match existing codebase style (functional/pure)
- Harder to serialize for network transmission

**When to use:** Large OOP-heavy codebases, C# game engines (Unity).

**Recommendation for Into the Void:** Don't use. Existing codebase uses functional patterns.

### Alternative 2: Separate Stats Service

**Pattern:** Dedicated service managing all stat computations

```typescript
@Injectable()
export class StatsService {
  computeEffectiveStats(characterId: string): CharacterStats { ... }
  applyEquipmentBonus(item: ItemDef): void { ... }
  removeEquipmentBonus(item: ItemDef): void { ... }
}
```

**Pros:**
- Centralized stat logic
- Easy to add stat-related features (buffs, debuffs, scaling)

**Cons:**
- Adds another service dependency
- Stats computation is pure function, doesn't need stateful service

**When to use:** Complex stat systems with buffs, debuffs, scaling, conditions.

**Recommendation for Into the Void:** Not yet. Current pure function approach is simpler. Refactor to service if buff/debuff system is added.

### Alternative 3: Reactive Stats (RxJS)

**Pattern:** Observable stream of stat changes

```typescript
const characterStats$ = combineLatest([
  equipment$,
  buffs$,
  level$
]).pipe(
  map(([equipment, buffs, level]) => computeStats(equipment, buffs, level))
);
```

**Pros:**
- Automatically recomputes when any dependency changes
- Composable streams

**Cons:**
- Adds RxJS dependency
- Overkill for infrequent equip operations
- Server doesn't need reactivity (client might)

**When to use:** Client-side UI that needs real-time stat updates, complex dependency chains.

**Recommendation for Into the Void:** Not needed. Equip operations are explicit, not reactive.

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `eval()` for stat calculations | Security risk, no type safety | Pure functions with switch statements |
| Global mutable stat objects | Race conditions in multiplayer | Pure functions returning new objects |
| Client-provided stat values | Cheating vulnerability | Server-authoritative computation |
| Mixed additive/multiplicative in same pass | Order-dependency bugs | Separate passes: additive first, then multiplicative |
| String-based stat lookups without constants | Typos cause runtime errors | TypeScript interfaces with compile-time checks |

## Sources

### High Confidence (Official Docs & Technical Articles)

- [TypeScript Handbook: Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) — Partial<T> pattern
- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — Discriminated unions
- [How to Deal with Modifiable Stats in RPGs](https://refreshertowelgames.wordpress.com/2024/02/17/how-to-comfortably-deal-with-modifiable-stats/) — Additive/multiplicative patterns
- [RPG Programming Pitfalls: Stat System](https://randompotion.com/2023/08/14/rpg-programming-pitfalls-1-stat-system/) — Dictionary vs individual properties
- [How to Make an RPG: Stats](https://howtomakeanrpg.com/r/a/how-to-make-an-rpg-stats.html) — Modifier aggregation patterns

### Medium Confidence (Community Resources)

- [Decorator Pattern for Game Stats](https://pavcreations.com/decorator-design-pattern-for-dynamic-game-stats/) — OOP alternative pattern
- [8 Examples of Using Reduce in TypeScript](https://kennethlange.com/reduce-in-typescript-examples/) — Array aggregation patterns
- [Data Aggregation Techniques in TypeScript](https://codesignal.com/learn/courses/projection-filtering-and-aggregation-of-data-streams-in-ts/lessons/data-aggregation-techniques-in-typescript) — Reduce-based aggregation

### Codebase Evidence (High Confidence)

- `packages/game-logic/src/inventory/stats.ts` — Existing `effectiveStats()` aggregation pattern
- `packages/game-logic/src/inventory/effects.ts` — Pure resolver functions with discriminated unions
- `packages/items/src/types.ts` — Effect type definitions (line 46 has `stats` effect)
- `packages/items/src/definitions/suits.ts` — Current `stat_buff` pattern to be replaced

---
*Stack research for: Equipment Stat Aggregation in TypeScript RPG*
*Researched: 2026-02-21*
*Confidence: HIGH (existing codebase patterns + industry best practices)*
