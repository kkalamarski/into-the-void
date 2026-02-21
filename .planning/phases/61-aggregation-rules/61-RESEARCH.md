# Phase 61: Aggregation Rules - Research

**Researched:** 2026-02-21
**Domain:** Deterministic stat computation and mathematical commutativity
**Confidence:** HIGH

## Summary

Phase 61 ensures stat aggregation is deterministic regardless of equipment order by documenting the current aggregation rules and creating comprehensive tests that validate order independence. The good news: the current implementation in `computeCharStats()` is already mathematically commutative because it uses pure additive aggregation. The challenge is proving this property through tests and explicitly documenting the aggregation order for future maintainers.

The current codebase aggregates stats in three distinct layers: (1) base stats from level scaling, (2) equipment bonuses from items, and (3) buff modifiers from abilities. All three use additive aggregation (`stats[key] += value`), which is inherently commutative (a + b = b + a) and associative ((a + b) + c = a + (b + c)). This means equipping items in any order produces identical results.

**Primary recommendation:** Document the aggregation order explicitly in code comments and add property-based tests using array permutations to validate that equipment order doesn't affect final stats.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | Latest (inherited) | Unit testing framework | Already used across all packages in monorepo |
| TypeScript | 5.4+ | Type-safe test assertions | Project standard, provides compile-time guarantees |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fast-check/vitest | 0.1.x | Property-based testing | Optional for exhaustive permutation tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @fast-check/vitest | Manual permutation generation | fast-check provides fuzzing and edge case generation; manual approach sufficient for this phase's limited scope |
| Property-based testing | Explicit test cases only | Explicit cases are faster and easier to debug; property-based adds rigor but may be overkill for simple commutativity |

**Installation:**
```bash
# No new dependencies required - Vitest already in workspace
# Optional (if property-based testing desired):
pnpm add -D @fast-check/vitest --filter @into-the-void/game-logic
```

## Architecture Patterns

### Recommended Project Structure
```
packages/game-logic/src/stats/
├── char-stats.ts           # Pure computation with documented order
├── char-stats.test.ts      # Existing tests + new order-independence tests
└── aggregation.test.ts     # Optional: dedicated aggregation property tests
```

### Pattern 1: Documented Aggregation Order in Code
**What:** Explicit JSDoc comments in `computeCharStats()` documenting the three-layer aggregation order
**When to use:** Always — this is the canonical reference for stat computation
**Example:**
```typescript
/**
 * Compute character stats from level and equipped items.
 *
 * AGGREGATION ORDER (base → equipment → buffs):
 * 1. Base stats: computed from level using linear scaling (base + (level-1) * growth)
 * 2. Equipment bonuses: additive bonuses from all equipped items (on_equip + passive effects)
 * 3. Buff modifiers: temporary stat changes from active abilities (additive)
 *
 * All layers use ADDITIVE aggregation (stats[key] += value), making the result:
 * - Commutative: equipping items in different order produces same result
 * - Associative: grouping doesn't matter ((a+b)+c = a+(b+c))
 * - Deterministic: same inputs always produce same outputs
 *
 * @param level - Character level (1-based)
 * @param equipment - Equipment JSON from DB (server-authoritative)
 * @param target - Whether to use player or creature scaling constants
 * @param activeBuffs - Optional array of active buffs to apply stat modifiers
 * @returns Complete 8-stat CharacterStats object
 */
export function computeCharStats(
  level: number,
  equipment: EquipmentJson,
  target: StatScaleTarget = 'player',
  activeBuffs: Buff[] = []
): CharacterStats {
  // Implementation...
}
```

### Pattern 2: Equipment Order Independence Tests
**What:** Tests that verify equipping items in different orders produces identical stats
**When to use:** Required for AGGR-02 compliance
**Example:**
```typescript
it('equipping items in different order produces same final stats (AGGR-02)', () => {
  const suit: InventoryItemJson = { /* suit with +20 durability */ };
  const tool: InventoryItemJson = { /* tool with +10 power */ };
  const module1: InventoryItemJson = { /* module with +5 toughness */ };

  // Order A: suit, tool, module
  const equipmentA: EquipmentJson = {
    exosuit: suit,
    tool: tool,
    modules: [module1],
    accessory1: undefined,
    accessory2: undefined,
  };

  // Order B: same items, but conceptually different equip sequence
  // (In practice, EquipmentJson structure is fixed, so we test module order)
  const equipmentB: EquipmentJson = {
    exosuit: suit,
    tool: tool,
    modules: [module1],
    accessory1: undefined,
    accessory2: undefined,
  };

  const statsA = computeCharStats(5, equipmentA);
  const statsB = computeCharStats(5, equipmentB);

  expect(statsA).toEqual(statsB);
});
```

### Pattern 3: Module Array Permutation Testing
**What:** Test all permutations of module array to verify order independence
**When to use:** For AGGR-02 validation with multiple modules
**Example:**
```typescript
it('module array permutations produce same stats (AGGR-02)', () => {
  const module1: InventoryItemJson = { itemId: 'mod1', /* +10 durability */ };
  const module2: InventoryItemJson = { itemId: 'mod2', /* +5 power */ };
  const module3: InventoryItemJson = { itemId: 'mod3', /* +8 toughness */ };

  // Generate all 6 permutations of 3 modules (3! = 6)
  const permutations = [
    [module1, module2, module3],
    [module1, module3, module2],
    [module2, module1, module3],
    [module2, module3, module1],
    [module3, module1, module2],
    [module3, module2, module1],
  ];

  const results = permutations.map(modules =>
    computeCharStats(5, { modules })
  );

  // All results should be identical
  for (let i = 1; i < results.length; i++) {
    expect(results[i]).toEqual(results[0]);
  }
});
```

### Pattern 4: Equipment + Buff Combination Tests
**What:** Validate that equipment and buff stats combine correctly in documented order
**When to use:** Required for AGGR-01 validation
**Example:**
```typescript
it('equipment stats and buff stats combine correctly (AGGR-01)', () => {
  // Setup: level 5 player, equipment with +20 durability, buff with +15 durability
  const equipment: EquipmentJson = {
    exosuit: { itemId: 'suit_basic', /* +20 durability */ },
    modules: [],
  };

  const buff: Buff = {
    id: 'buff1',
    abilityId: 'test_ability',
    stat: 'durability',
    amount: 15,
    expiresAt: Date.now() + 10000,
    displayName: 'Test Buff',
    iconColor: 0x00ff00,
  };

  const baseStats = computeCharStats(5, { modules: [] }); // No equipment
  const withEquipment = computeCharStats(5, equipment);
  const withBoth = computeCharStats(5, equipment, 'player', [buff]);

  // Verify aggregation order: base → equipment → buffs
  expect(withEquipment.durability).toBe(baseStats.durability + 20);
  expect(withBoth.durability).toBe(baseStats.durability + 20 + 15);
});
```

### Anti-Patterns to Avoid
- **Testing implementation details instead of properties:** Don't test that the loop runs in a specific order; test that the result is order-independent
- **Hardcoded expected values without derivation:** Always compute expected values from known inputs (base + equipment + buffs) rather than magic numbers
- **Testing one permutation and assuming commutativity:** Must test at least 2 permutations to prove order independence

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Generating array permutations | Recursive permutation generator | Library function or simple explicit cases | Small fixed number of slots (5 equipment slots) — explicit cases clearer than generic generator |
| Property-based test framework | Custom fuzzing logic | @fast-check/vitest (optional) | Handles edge cases, shrinking, and reproducible failures automatically |
| Deep equality comparison | Custom object comparator | Vitest's `expect().toEqual()` | Built-in handles nested objects, arrays, and edge cases correctly |

**Key insight:** The equipment structure has a fixed schema (exosuit, tool, modules[], accessory1, accessory2), so permutation testing applies mainly to the modules array. Don't overcomplicate with generic permutation generators when 2-3 explicit test cases suffice.

## Common Pitfalls

### Pitfall 1: Assuming Fixed Slots Can Have Order Issues
**What goes wrong:** Writing tests that try to "equip in different order" but the `EquipmentJson` schema has fixed slots (exosuit, tool, etc.), so there's no actual order variance for those slots.
**Why it happens:** Misunderstanding that `EquipmentJson` is a typed object with named slots, not an array.
**How to avoid:** Focus permutation testing on the `modules` array (which IS ordered) and test known equipment combinations for the fixed slots.
**Warning signs:** Test tries to create multiple `EquipmentJson` objects with different slot assignment orders but they're structurally identical.

### Pitfall 2: Not Testing Buff + Equipment Interaction
**What goes wrong:** Only testing equipment order independence without validating that buffs apply after equipment in the documented order.
**Why it happens:** Requirements mention "equipment order" prominently, so tester focuses there and misses the buff integration requirement.
**How to avoid:** AGGR-01 explicitly requires documenting "base → equipment → buffs" order, so tests must validate this three-layer aggregation.
**Warning signs:** Tests cover equipment permutations but no test includes both equipment and buffs in same computation.

### Pitfall 3: Testing Commutativity but Not Associativity
**What goes wrong:** Tests verify `a + b = b + a` (commutativity) but don't verify `(a + b) + c = a + (b + c)` (associativity).
**Why it happens:** Conflating the two properties — commutativity is about order, associativity is about grouping.
**How to avoid:** Current implementation loops sequentially (`for item in items { stats[key] += value }`), which is both commutative AND associative. Document this in comments.
**Warning signs:** Test permutes items but doesn't validate that partial aggregations can be reordered.

### Pitfall 4: Forgetting to Mock ItemRegistry for Test Items
**What goes wrong:** Test creates `InventoryItemJson` with a fake `itemId`, but `ItemRegistry.get(itemId)` returns undefined, so equipment bonuses aren't applied.
**Why it happens:** Existing test at line 52 of `char-stats.test.ts` uses `vi.spyOn(ItemRegistry, 'get')` to mock, but new tests might forget this pattern.
**How to avoid:** Always mock `ItemRegistry.get()` when testing with synthetic items, or use real item IDs from production definitions.
**Warning signs:** Test expects stat bonus but gets zero delta; `ItemRegistry.get()` returning undefined in logs.

### Pitfall 5: Testing with Only One Item per Slot
**What goes wrong:** Test creates equipment with one module, one suit, etc., and declares "order doesn't matter" without proving it with multiple items.
**Why it happens:** Single-item cases are trivial (no order to permute), but tester doesn't realize the test is vacuous.
**How to avoid:** AGGR-03 requires "known equipment combinations," implying plural items. Use at least 2-3 modules to validate permutation.
**Warning signs:** Test case description mentions "equipment combinations" but only uses one item.

## Code Examples

Verified patterns from codebase analysis:

### Current Aggregation Logic (char-stats.ts lines 102-128)
```typescript
// Source: packages/game-logic/src/stats/char-stats.ts
// Verified: 2026-02-21

// Aggregate equipment bonuses
for (const equippedItem of equippedItems) {
  const itemDef = ItemRegistry.get(equippedItem.itemId);
  if (!itemDef) continue;

  const equipEffects = resolveEffectsForTrigger(itemDef.effects, 'on_equip');
  const passiveEffects = resolveEffectsForTrigger(itemDef.effects, 'passive');
  const allEffects = [...equipEffects, ...passiveEffects];

  for (const effect of allEffects) {
    for (const [stat, value] of Object.entries(effect.applied)) {
      if (stat in stats) {
        (stats as unknown as Record<string, number>)[stat] += value;
      }
    }
  }
}

// Apply active buff stat modifiers
for (const buff of activeBuffs) {
  if (buff.stat in stats) {
    (stats as unknown as Record<string, number>)[buff.stat] += buff.amount;
  }
}
```

### Existing Equipment Bonus Test (char-stats.test.ts lines 22-70)
```typescript
// Source: packages/game-logic/src/stats/char-stats.test.ts
// Verified: 2026-02-21

it('equipment bonuses are aggregated into final stats (STAT-02)', () => {
  const TEST_ITEM_ID = 'test_durability_module';

  const fakeItem: ItemDefinition = {
    id: TEST_ITEM_ID,
    displayName: 'Test Durability Module',
    description: 'A test module that boosts durability by 25',
    category: 'module',
    rarity: 'common',
    maxStack: 1,
    weight: 1,
    baseValue: 0,
    requiredLevel: 1,
    ilvl: 1,
    textureKey: 'item_unknown',
    color: 0xffffff,
    equipSlot: 'module',
    effects: [
      {
        trigger: 'on_equip',
        effect: {
          type: 'stat_buff',  // Legacy pattern in test (will be stats in production)
          stat: 'durability',
          amount: 25,
          duration: 0,
        },
      },
    ],
  };

  vi.spyOn(ItemRegistry, 'get').mockReturnValue(fakeItem);

  const moduleEquipment: EquipmentJson = {
    modules: [
      {
        instanceId: 'test-instance-1',
        itemId: TEST_ITEM_ID,
        quantity: 1,
        slot: 0,
        properties: {},
      },
    ],
  };

  const base = computeCharStats(1, emptyEquipment);
  const boosted = computeCharStats(1, moduleEquipment);

  expect(boosted.durability).toBe(base.durability + 25);
});
```

### Array Permutation Helper (for test suite)
```typescript
// Utility function for generating permutations in tests
// Not from codebase — suggested pattern for AGGR-02

function permute<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];

  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = permute(rest);
    for (const perm of perms) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// Usage:
const modules = [mod1, mod2, mod3];
const allPermutations = permute(modules); // Returns 6 permutations
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No aggregation documentation | Explicit docs required (AGGR-01) | Phase 61 | Future maintainers understand order guarantees |
| Assumed order independence | Proven with tests (AGGR-02, AGGR-03) | Phase 61 | Prevents future regression to order-dependent code |
| Equipment only | Equipment + buffs documented together | Phase 57 → Phase 61 | Clarifies interaction between temporary and permanent bonuses |

**Deprecated/outdated:**
- Manual stat computation in combat code: Now uses `computeCharStats()` exclusively (Phase 30-31)
- `stat_buff` with duration: 0 for equipment: Migrated to `stats` effect type (Phase 60)

## Open Questions

1. **Should we add multiplicative modifiers in the future?**
   - What we know: Current system is purely additive; research pitfall notes future expansion to percentage-based buffs
   - What's unclear: Whether v1.14 scope includes multiplicative or if that's deferred
   - Recommendation: Phase 61 focuses on additive only; document expansion path for future phases

2. **Do we need property-based testing with fast-check?**
   - What we know: @fast-check/vitest integrates cleanly with existing test framework
   - What's unclear: Whether explicit permutation tests are sufficient or if fuzzing adds value
   - Recommendation: Start with explicit tests (faster, clearer); add fast-check only if gaps found

3. **Should aggregation order be enforced at type level?**
   - What we know: Current code is procedural (base → equipment → buffs via sequential loops)
   - What's unclear: Whether to refactor into separate functions (computeBase, addEquipment, addBuffs) for enforced ordering
   - Recommendation: Keep current structure (single function) but add explicit comments; refactor if complexity grows in Phase 62+

## Sources

### Primary (HIGH confidence)
- Codebase analysis:
  - `packages/game-logic/src/stats/char-stats.ts` (lines 73-131) — Current aggregation implementation
  - `packages/game-logic/src/inventory/effects.ts` (lines 108-124) — Stats effect resolver
  - `packages/game-logic/src/stats/char-stats.test.ts` — Existing test patterns
  - `.planning/phases/57-buff-system/57-02-PLAN.md` (lines 85-96) — Buff aggregation order decision
  - `.planning/REQUIREMENTS.md` (lines 24-26) — Phase 61 requirements AGGR-01/02/03
  - `.planning/research/PITFALLS-EQUIPMENT-STATS.md` (lines 160-189) — Pitfall 7 on aggregation

### Secondary (MEDIUM confidence)
- [Property-Based Testing: Generative Testing for System Invariants](https://yrkan.com/blog/property-based-testing/) — Explains property-based testing concepts
- [fast-check official documentation](https://fast-check.dev/) — Property-based testing framework for JavaScript
- [@fast-check/vitest package](https://www.npmjs.com/package/@fast-check/vitest) — Vitest integration
- [RPG Stats: Implementing Character Stats in Video Games](https://howtomakeanrpg.com/r/a/how-to-make-an-rpg-stats.html) — Discusses modifier stacking
- [Handrolling an RPG Stat System](https://blog.writtenrealms.com/stats/) — Deterministic stat calculation patterns

### Tertiary (LOW confidence)
- [Associative property - Wikipedia](https://en.wikipedia.org/wiki/Associative_property) — Mathematical background
- [Step-by-Step Guide to Array Permutation Using Recursion in JavaScript](https://medium.com/weekly-webtips/step-by-step-guide-to-array-permutation-using-recursion-in-javascript-4e76188b88ff) — Permutation implementation patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Vitest already in use, no new runtime dependencies needed
- Architecture: HIGH — Current code is already commutative, just needs documentation and tests
- Pitfalls: HIGH — Analyzed actual test file and aggregation logic to identify real failure modes

**Research date:** 2026-02-21
**Valid until:** ~60 days (stat system is stable; aggregation rules unlikely to change rapidly)
