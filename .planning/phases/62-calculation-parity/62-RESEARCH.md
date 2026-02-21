# Phase 62: Calculation Parity - Research

**Researched:** 2026-02-21
**Domain:** Client-server stat calculation synchronization
**Confidence:** HIGH

## Summary

Phase 62 ensures client tooltips show accurate stat deltas by using shared calculation code from the `@into-the-void/game-logic` package. Currently, the client reimplements stat extraction in `ItemTooltip.tsx` (`extractStatBonuses()`, `computeStatDeltas()`), while the server uses the canonical `computeCharStats()` function. This duplication creates drift risk where tooltips can show incorrect predictions about equipment changes.

The solution is straightforward: the `computeCharStats()` function in `game-logic` is already pure and isomorphic (works in both Node.js and browser). We need to (1) export helper functions from `game-logic` that the client can use, (2) refactor `ItemTooltip.tsx` to use shared code instead of local reimplementation, and (3) add integration tests that verify server and client produce identical results for the same inputs.

**Primary recommendation:** Extract stat extraction logic into shared `game-logic` functions, use them in both client tooltip and server calculation, verify parity with cross-environment integration tests.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 3.2.4 | Testing framework | Already used across monorepo for unit tests |
| @into-the-void/game-logic | workspace:* | Shared stat calculations | Pure functions, already server-side canonical |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Existing dependencies sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shared pure functions | Duplicate client logic | Shared code eliminates drift but requires isomorphic functions (already the case) |
| Integration tests | Manual verification | Tests prevent regression; manual checks don't scale |

**Installation:**
```bash
# No new dependencies required - all packages already in workspace
```

## Architecture Patterns

### Recommended Project Structure
```
packages/game-logic/src/stats/
├── char-stats.ts           # computeCharStats() - canonical calculation
├── char-stats.test.ts      # Unit tests for stat computation
├── stat-helpers.ts         # NEW: extractItemStats(), computeEquipmentDelta()
└── stat-helpers.test.ts    # NEW: Integration tests (client/server parity)

apps/web/src/components/
├── ItemTooltip.tsx         # REFACTOR: Use shared stat-helpers
└── ItemTooltip.css

apps/game-server/src/game/
├── game.gateway.ts         # Uses computeCharStats() for stats:update event
└── ...
```

### Pattern 1: Shared Stat Extraction Function
**What:** Extract stat bonuses from a single item definition (pure function, works client + server)
**When to use:** Whenever you need to know what stats an item provides
**Example:**
```typescript
// packages/game-logic/src/stats/stat-helpers.ts

import { ItemRegistry } from '@into-the-void/items';
import { resolveEffectsForTrigger } from '../inventory/effects';
import type { CharacterStats } from '@into-the-void/shared-types';
import type { ItemDefinition } from '@into-the-void/items';

/**
 * Extract stat bonuses from a single item definition.
 *
 * Resolves on_equip and passive effects that provide stats.
 * Returns a partial CharacterStats object with only the stats this item affects.
 *
 * Pure function - can run on client or server.
 */
export function extractItemStats(itemDef: ItemDefinition): Partial<CharacterStats> {
  const equipEffects = resolveEffectsForTrigger(itemDef.effects, 'on_equip');
  const passiveEffects = resolveEffectsForTrigger(itemDef.effects, 'passive');

  const stats: Partial<CharacterStats> = {};

  for (const result of [...equipEffects, ...passiveEffects]) {
    for (const [key, value] of Object.entries(result.applied)) {
      if (typeof value === 'number') {
        stats[key as keyof CharacterStats] = (stats[key as keyof CharacterStats] ?? 0) + value;
      }
    }
  }

  return stats;
}
```

### Pattern 2: Equipment Delta Calculation
**What:** Compare two items' stat contributions to compute tooltip delta
**When to use:** Tooltips showing "vs Equipped" comparisons
**Example:**
```typescript
// packages/game-logic/src/stats/stat-helpers.ts

/**
 * Compute stat deltas between hovering an item and currently equipped item.
 *
 * Returns array of { stat, delta } where delta = hovered - equipped.
 * Positive delta = upgrade, negative = downgrade.
 */
export function computeEquipmentDelta(
  hoveredItem: ItemDefinition,
  equippedItem: ItemDefinition | undefined
): Array<{ stat: keyof CharacterStats; delta: number }> {
  const hoveredStats = extractItemStats(hoveredItem);
  const equippedStats = equippedItem ? extractItemStats(equippedItem) : {};

  const allStats = new Set([
    ...Object.keys(hoveredStats),
    ...Object.keys(equippedStats),
  ]) as Set<keyof CharacterStats>;

  const deltas: Array<{ stat: keyof CharacterStats; delta: number }> = [];

  for (const stat of allStats) {
    const hoveredVal = hoveredStats[stat] ?? 0;
    const equippedVal = equippedStats[stat] ?? 0;
    const delta = hoveredVal - equippedVal;
    if (delta !== 0) {
      deltas.push({ stat, delta });
    }
  }

  return deltas;
}
```

### Pattern 3: Client Tooltip Using Shared Logic
**What:** Refactor `ItemTooltip.tsx` to import shared functions instead of local reimplementation
**When to use:** Phase 62 refactoring
**Example:**
```typescript
// apps/web/src/components/ItemTooltip.tsx

import { extractItemStats, computeEquipmentDelta } from '@into-the-void/game-logic';

// BEFORE (local reimplementation):
// function extractStatBonuses(item: ItemDefinition): Record<string, number> { ... }
// function computeStatDeltas(hoveredItem, equippedItem) { ... }

// AFTER (use shared logic):
export const ItemTooltip: React.FC<ItemTooltipProps> = ({
  children,
  item,
  disabled = false,
  equippedItem,
}) => {
  // ... floating-ui setup ...

  const itemStatBonuses = extractItemStats(item);  // From game-logic
  const statDeltas = item.equipSlot && equippedItem
    ? computeEquipmentDelta(item, equippedItem)    // From game-logic
    : [];

  // ... render tooltip ...
};
```

### Pattern 4: Integration Test for Client/Server Parity
**What:** Test that verifies server `computeCharStats()` and client helper functions produce identical results
**When to use:** Required for PARI-03 compliance
**Example:**
```typescript
// packages/game-logic/src/stats/stat-helpers.test.ts

import { describe, it, expect, vi } from 'vitest';
import { computeCharStats } from './char-stats';
import { extractItemStats, computeEquipmentDelta } from './stat-helpers';
import { ItemRegistry } from '@into-the-void/items';
import type { EquipmentJson, InventoryItemJson } from '@into-the-void/database';

describe('Client/Server Stat Parity (PARI-03)', () => {
  it('extractItemStats matches computeCharStats for single item', () => {
    const testItemId = 'test_parity_module';
    const mockItem = {
      id: testItemId,
      displayName: 'Test Module',
      description: 'Test',
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
          effect: { type: 'stats', durability: 20, power: 10 },
        },
      ],
    };

    vi.spyOn(ItemRegistry, 'get').mockReturnValue(mockItem);

    // Client extraction
    const clientStats = extractItemStats(mockItem);

    // Server computation (with and without item)
    const baseStats = computeCharStats(5, { modules: [] });
    const withItemStats = computeCharStats(5, {
      modules: [{
        instanceId: 'test-1',
        itemId: testItemId,
        quantity: 1,
        slot: 0,
        properties: {},
      }],
    });

    // Server delta (total - base)
    const serverDelta = {
      durability: withItemStats.durability - baseStats.durability,
      power: withItemStats.power - baseStats.power,
    };

    // PARI-03: Client extraction must match server delta
    expect(clientStats.durability).toBe(serverDelta.durability);
    expect(clientStats.power).toBe(serverDelta.power);
  });

  it('computeEquipmentDelta matches server calculation for item swap', () => {
    const item1Id = 'test_item_1';
    const item2Id = 'test_item_2';

    const item1 = createMockItem(item1Id, { durability: 20 });
    const item2 = createMockItem(item2Id, { durability: 30, toughness: 5 });

    vi.spyOn(ItemRegistry, 'get').mockImplementation((id) =>
      id === item1Id ? item1 : item2
    );

    // Client delta calculation
    const clientDelta = computeEquipmentDelta(item2, item1);

    // Server calculation (item1 equipped, then item2)
    const withItem1 = computeCharStats(5, {
      exosuit: createInventoryItem(item1Id),
      modules: [],
    });
    const withItem2 = computeCharStats(5, {
      exosuit: createInventoryItem(item2Id),
      modules: [],
    });

    // Server delta
    const serverDelta = {
      durability: withItem2.durability - withItem1.durability,
      toughness: withItem2.toughness - withItem1.toughness,
    };

    // PARI-03: Client delta must match server
    const clientDurabilityDelta = clientDelta.find(d => d.stat === 'durability');
    const clientToughnessDelta = clientDelta.find(d => d.stat === 'toughness');

    expect(clientDurabilityDelta?.delta).toBe(serverDelta.durability);
    expect(clientToughnessDelta?.delta).toBe(serverDelta.toughness);
  });
});
```

### Anti-Patterns to Avoid
- **Duplicating stat logic between client and server:** Always use shared `game-logic` functions
- **Testing only one environment:** Integration tests must verify client AND server produce same results
- **Hardcoded expected values:** Derive expected values from server computation, don't guess
- **Ignoring buff integration:** Client tooltips don't show buffs, but tests should verify server includes them correctly

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stat extraction from items | Local `extractStatBonuses()` in tooltip | Shared `extractItemStats()` from game-logic | Single source of truth prevents drift |
| Delta calculation | Local `computeStatDeltas()` | Shared `computeEquipmentDelta()` | Same calculation logic server uses for stats:update |
| Integration testing across environments | Manual verification | Vitest tests with mocked ItemRegistry | Automated regression prevention |

**Key insight:** The `game-logic` package is already isomorphic (pure functions, no Node.js-specific APIs). We're not adding new runtime dependencies—just using existing shared code on the client.

## Common Pitfalls

### Pitfall 1: Client Tooltip Logic Diverging from Server Authority
**What goes wrong:** Tooltip shows "+15 Power" but server actually applies "+12 Power" because calculation logic differs.
**Why it happens:** Maintaining two implementations (client `extractStatBonuses()`, server `computeCharStats()`) creates drift. No automated verification catches divergence.
**How to avoid:**
- Move stat extraction to shared `game-logic` package
- Client and server import from same source
- Integration test asserts equality (PARI-03)
**Warning signs:**
- Players report "tooltip lies"
- Stat changes don't match predictions
- Grep shows duplicate calculation logic

**Source:** `.planning/research/PITFALLS-EQUIPMENT-STATS.md` Pitfall 4

### Pitfall 2: Testing Only Client or Only Server
**What goes wrong:** Tests pass but client/server still diverge because tests don't verify parity.
**Why it happens:** Unit tests focus on "does this function work?" not "do these two functions produce same result?"
**How to avoid:** PARI-03 requires integration test that compares client extraction vs. server computation for identical inputs.
**Warning signs:**
- All tests pass but bug reports mention incorrect tooltips
- Tests don't include both `extractItemStats()` AND `computeCharStats()` in same assertion

### Pitfall 3: Forgetting ItemRegistry Mock in Tests
**What goes wrong:** Test creates fake item with fake `itemId`, but `ItemRegistry.get(itemId)` returns undefined, so stats aren't extracted.
**Why it happens:** Existing tests (see `char-stats.test.ts` line 156) use `vi.spyOn(ItemRegistry, 'get')` to mock, but new tests might forget.
**How to avoid:** Always mock `ItemRegistry.get()` in any test involving item definitions.
**Warning signs:** Test expects stat bonus but gets 0; `ItemRegistry.get()` returning undefined.

**Source:** `.planning/phases/61-aggregation-rules/61-RESEARCH.md` Pitfall 4

### Pitfall 4: Client Tooltip Showing Buffs When It Shouldn't
**What goes wrong:** Client tries to show active buffs in tooltip but doesn't have access to current buff state.
**Why it happens:** Buffs are server-authoritative (expire server-side). Client would need to duplicate buff expiration logic.
**How to avoid:**
- Tooltips show ONLY equipment bonuses (no buffs)
- Server sends total stats via `stats:update` event (includes buffs)
- Client displays server-authoritative totals, not computed locally
**Warning signs:** Tooltip tries to access `useAbilityStore()` or `activeBuffs` state

### Pitfall 5: Not Exporting Helpers from game-logic Package Index
**What goes wrong:** Helper functions exist in `stat-helpers.ts` but aren't exported from `packages/game-logic/src/index.ts`, so client can't import them.
**Why it happens:** Forget to add exports to package barrel file.
**How to avoid:** Update `game-logic/src/index.ts` to export `extractItemStats` and `computeEquipmentDelta`.
**Warning signs:** TypeScript error: "Module '@into-the-void/game-logic' has no exported member 'extractItemStats'"

## Code Examples

Verified patterns from codebase analysis:

### Current Client Tooltip Implementation (to be refactored)
```typescript
// Source: apps/web/src/components/ItemTooltip.tsx (lines 33-68)
// Verified: 2026-02-21

// CURRENT PATTERN (local reimplementation):
function extractStatBonuses(item: ItemDefinition): Record<string, number> {
  const equipEffects = resolveEffectsForTrigger(item.effects, 'on_equip');
  const passiveEffects = resolveEffectsForTrigger(item.effects, 'passive');
  const bonuses: Record<string, number> = {};

  for (const result of [...equipEffects, ...passiveEffects]) {
    for (const [key, value] of Object.entries(result.applied)) {
      if (typeof value === 'number') {
        bonuses[key] = (bonuses[key] ?? 0) + value;
      }
    }
  }
  return bonuses;
}

function computeStatDeltas(
  hoveredItem: ItemDefinition,
  equippedItem: ItemDefinition | undefined
): Array<{ stat: string; delta: number }> {
  const hoveredBonuses = extractStatBonuses(hoveredItem);
  const equippedBonuses = equippedItem ? extractStatBonuses(equippedItem) : {};

  const allStats = new Set([...Object.keys(hoveredBonuses), ...Object.keys(equippedBonuses)]);
  const deltas: Array<{ stat: string; delta: number }> = [];

  for (const stat of allStats) {
    const hoveredVal = hoveredBonuses[stat] ?? 0;
    const equippedVal = equippedBonuses[stat] ?? 0;
    const delta = hoveredVal - equippedVal;
    if (delta !== 0) {
      deltas.push({ stat, delta });
    }
  }

  return deltas;
}
```

### Server Stats Update Event (uses canonical computeCharStats)
```typescript
// Source: apps/game-server/src/game/game.gateway.ts (lines 1119-1127)
// Verified: 2026-02-21

// Server computes stats authoritatively:
const emptyEquipment: EquipmentJson = { modules: [] };
const base = computeCharStats(player.level, emptyEquipment, 'player');

// Total stats: level-scaled + equipment bonuses
const total = computeCharStats(player.level, inventory.equipment as EquipmentJson, 'player');

// Equipment contribution: delta between total and base
const equipment: CharacterStats = {
  durability: total.durability - base.durability,
  toughness: total.toughness - base.toughness,
  // ... all 8 stats
};

// Emit to client
client.emit('stats:update', { total, base, equipment });
```

### Existing Test Pattern for Pure Functions
```typescript
// Source: packages/game-logic/src/inventory/effects.test.ts (lines 6-17)
// Verified: 2026-02-21

describe('resolveEffect', () => {
  describe('stats effect', () => {
    it('should resolve single stat effect', () => {
      const effect: ItemEffect = {
        type: 'stats',
        toughness: 10,
      };

      const result = resolveEffect(effect);

      expect(result.type).toBe('stats');
      expect(result.applied).toEqual({ toughness: 10 });
      expect(result.duration).toBeUndefined();
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-only tooltip calculation | Shared game-logic functions (Phase 62) | Phase 62 | Eliminates client/server drift |
| Manual tooltip verification | Automated parity integration tests | Phase 62 | Prevents regression |
| Separate `extractStatBonuses()` client function | Shared `extractItemStats()` from game-logic | Phase 62 | Single source of truth |
| No cross-environment testing | Integration tests verify parity (PARI-03) | Phase 62 | Guarantees tooltip accuracy |

**Deprecated/outdated:**
- Client-side `extractStatBonuses()` function: Replaced by shared `extractItemStats()` (Phase 62)
- Client-side `computeStatDeltas()` function: Replaced by shared `computeEquipmentDelta()` (Phase 62)

## Open Questions

1. **Should tooltips show buff contributions?**
   - What we know: Buffs are server-authoritative with expiration times; client doesn't track buff expiration
   - What's unclear: Whether tooltips should attempt to show "current total stats including buffs" or just equipment bonuses
   - Recommendation: Tooltips show ONLY equipment deltas (no buffs). Server sends total stats via `stats:update` event for character sheet display.

2. **Do we need client-side buff state for tooltips?**
   - What we know: Server emits `buff:applied` and `buff:expired` events; client could track active buffs
   - What's unclear: Whether the UX value of showing buffs in tooltips justifies duplicating buff expiration logic client-side
   - Recommendation: Defer to Phase 63+ if needed; Phase 62 focuses on equipment parity only.

3. **Should we create a separate `ItemTooltip.test.tsx` file?**
   - What we know: No React component tests exist yet; `.planning/codebase/TESTING.md` documents patterns but notes "no tests currently exist"
   - What's unclear: Whether PARI-03 requires testing the React component itself or just the calculation parity
   - Recommendation: PARI-03 satisfied by integration test in `stat-helpers.test.ts`; React component testing deferred (no @testing-library/react in dependencies)

## Sources

### Primary (HIGH confidence)
- Codebase analysis:
  - `apps/web/src/components/ItemTooltip.tsx` (lines 33-68) — Current client tooltip implementation
  - `apps/game-server/src/game/game.gateway.ts` (lines 1119-1127) — Server stats computation
  - `packages/game-logic/src/stats/char-stats.ts` — Canonical `computeCharStats()` function
  - `packages/game-logic/src/inventory/effects.ts` — Effect resolution (already isomorphic)
  - `.planning/research/PITFALLS-EQUIPMENT-STATS.md` (Pitfall 4) — Client/server divergence warning
  - `.planning/REQUIREMENTS.md` (lines 30-32) — PARI-01/02/03 requirements
  - `.planning/ROADMAP.md` (lines 352-361) — Phase 62 success criteria

### Secondary (MEDIUM confidence)
- `.planning/phases/61-aggregation-rules/61-RESEARCH.md` — Prior phase context on stat aggregation
- `.planning/codebase/TESTING.md` — Testing patterns and infrastructure (but notes no React tests exist yet)
- `packages/game-logic/vitest.config.ts` — Test configuration (Node environment, globals enabled)

### Tertiary (LOW confidence)
- None required for this phase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new dependencies, uses existing Vitest + game-logic package
- Architecture: HIGH — Pure functions already exist, just need extraction and shared use
- Pitfalls: HIGH — Codebase analysis shows actual client/server implementation, research doc warns of drift

**Research date:** 2026-02-21
**Valid until:** ~45 days (stat system stable; pure function extraction low risk of change)
