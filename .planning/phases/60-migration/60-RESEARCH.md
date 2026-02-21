# Phase 60: Migration - Research

**Researched:** 2026-02-21
**Domain:** TypeScript codebase migration and schema deprecation
**Confidence:** HIGH

## Summary

Phase 60 migrates 43+ item definitions from the legacy `stat_buff` with `duration: 0` pattern to the canonical `stats` effect type implemented in Phase 59. This is a pure code migration with no database state to migrate (item definitions are static TypeScript constants). The migration requires three complementary approaches: automated code transformation via codemod, compile-time validation to prevent regressions, and a tested rollback strategy.

The primary complexity is ensuring zero functional changes while transforming object structures across multiple definition files (suits.ts has 42 instances, tools.ts has 1). Since these are static definitions loaded at module initialization, the migration is deterministic and reversible via Git.

**Primary recommendation:** Use jscodeshift codemod for automated transformation, add TypeScript ESLint custom rule to prevent legacy pattern in new code, verify with comprehensive test suite comparing stats computation before/after migration.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jscodeshift | 0.15.x | AST transformation for automated refactoring | Industry standard for large-scale code migrations (used by React, Next.js, Expo) |
| @typescript-eslint/utils | 7.x | Custom ESLint rule creation with type-checking | Official TypeScript ESLint utility for compile-time validation |
| vitest | Latest | Test framework (already in use) | Already configured in project for packages/game-logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @typescript-eslint/parser | 7.x | Parse TypeScript for ESLint rules | Required dependency for custom ESLint rules |
| recast | 0.23.x | Format-preserving AST rewriting | Dependency of jscodeshift, maintains code formatting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jscodeshift | Manual find/replace | Codemod handles complex AST transformations safely, find/replace is error-prone with multi-line structures |
| Custom ESLint rule | TypeScript type guard at runtime | ESLint catches at build time, runtime checks add performance overhead |
| Vitest | Manual verification | Automated tests provide regression safety and repeatable validation |

**Installation:**
```bash
npm install --save-dev jscodeshift @types/jscodeshift @typescript-eslint/utils
```

## Architecture Patterns

### Recommended Migration Structure
```
.planning/phases/60-migration/
├── scripts/
│   ├── migrate-stat-buff-to-stats.ts    # jscodeshift transform
│   ├── verify-migration.test.ts         # Pre/post migration tests
│   └── rollback-migration.ts            # Git-based rollback script
└── eslint-rules/
    └── no-legacy-stat-buff.ts           # Custom ESLint rule
```

### Pattern 1: Codemod Transformation (jscodeshift)
**What:** Automated AST transformation that converts object properties
**When to use:** Migrating 40+ item definitions consistently
**Example:**
```typescript
// Transform structure (simplified)
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Find all objects with stat_buff pattern
  root.find(j.ObjectExpression)
    .filter(path => {
      const props = path.value.properties;
      return hasProperty(props, 'type', 'stat_buff') &&
             hasProperty(props, 'duration', 0);
    })
    .forEach(path => {
      // Extract stat name and amount
      const stat = getPropertyValue(path, 'stat');
      const amount = getPropertyValue(path, 'amount');

      // Replace with stats effect
      replaceWith(path, {
        type: 'stats',
        [stat]: amount
      });
    });

  return root.toSource();
}
```

### Pattern 2: ESLint Custom Rule (Compile-Time Prevention)
**What:** TypeScript-aware ESLint rule that fails build if legacy pattern detected
**When to use:** Preventing new code from using deprecated pattern
**Example:**
```typescript
// Source: https://typescript-eslint.io/developers/custom-rules/
import { ESLintUtils } from '@typescript-eslint/utils';

export default ESLintUtils.RuleCreator.withoutDocs({
  create(context) {
    return {
      ObjectExpression(node) {
        const props = node.properties;
        const hasType = props.some(p =>
          p.key.name === 'type' && p.value.value === 'stat_buff'
        );
        const hasDurationZero = props.some(p =>
          p.key.name === 'duration' && p.value.value === 0
        );

        if (hasType && hasDurationZero) {
          context.report({
            node,
            messageId: 'useLegacyStatBuff',
            message: 'Use stats effect type instead of stat_buff with duration: 0 (deprecated in Phase 59)',
          });
        }
      }
    };
  },
  meta: {
    type: 'problem',
    messages: {
      useLegacyStatBuff: 'Use stats effect type instead of stat_buff with duration: 0',
    },
    schema: [],
  },
  defaultOptions: [],
});
```

### Pattern 3: Pre/Post Migration Verification
**What:** Test suite that captures stats computation before migration, verifies identical results after
**When to use:** Ensuring zero functional changes during migration
**Example:**
```typescript
// Source: vitest pattern from packages/game-logic/src/inventory/effects.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { computeCharStats } from '@into-the-void/game-logic';
import { ItemRegistry } from '@into-the-void/items';

describe('Migration verification', () => {
  const testItems = [
    'suit_basic_common',
    'suit_reinforced_rare',
    'tool_combat_common',
  ];

  let preHashMap: Map<string, any>;

  beforeAll(() => {
    // Capture pre-migration stat computations
    preHashMap = new Map(
      testItems.map(id => [
        id,
        computeCharStats({ level: 10, equippedItems: [ItemRegistry.get(id)] })
      ])
    );
  });

  it('should produce identical stats after migration', () => {
    testItems.forEach(id => {
      const post = computeCharStats({
        level: 10,
        equippedItems: [ItemRegistry.get(id)]
      });
      expect(post).toEqual(preHashMap.get(id));
    });
  });
});
```

### Anti-Patterns to Avoid
- **Manual find/replace across files:** Error-prone with multi-line object definitions, misses edge cases
- **Runtime validation instead of compile-time:** Adds overhead, doesn't prevent bad code from being committed
- **Skipping rollback strategy:** Migration failures in production without tested rollback procedure

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AST parsing and transformation | Custom regex/string manipulation | jscodeshift | Handles formatting preservation, edge cases, nested structures safely |
| Compile-time validation | Runtime assertion checks | Custom ESLint rule | Fails at build time, zero runtime cost, IDE integration |
| Migration verification | Manual spot-checking | Automated test suite | Catches regressions in all 43 items, repeatable, documents expected behavior |
| Rollback mechanism | Manual code restoration | Git tag + tested rollback script | Atomic, auditable, tested in staging |

**Key insight:** Code migrations are deceptively complex. Manual approaches seem simple for 43 items but introduce human error, inconsistency, and regression risk. Industry-standard tools (jscodeshift, ESLint) handle edge cases that manual approaches miss (multi-line formatting, comments preservation, TypeScript types).

## Common Pitfalls

### Pitfall 1: Multi-Stat Equipment Requires Consolidation
**What goes wrong:** An item with multiple stat_buff effects (e.g., toughness + durability) must consolidate into a single stats effect, not multiple stats effects
**Why it happens:** One-to-one transformation (each stat_buff → one stats effect) creates invalid item definitions
**How to avoid:** Group all stat_buff with duration: 0 for same item, merge into single stats effect object
**Warning signs:** Item has `effects: [{ trigger: 'on_equip', effect: { type: 'stats', toughness: 5 }}, { trigger: 'on_equip', effect: { type: 'stats', durability: 20 }}]` instead of single merged effect

**Example:**
```typescript
// BEFORE (Legacy - two separate stat_buffs)
effects: [
  { trigger: 'on_equip', effect: { type: 'stat_buff', stat: 'toughness', amount: 5, duration: 0 } },
  { trigger: 'on_equip', effect: { type: 'stat_buff', stat: 'durability', amount: 20, duration: 0 } },
]

// AFTER (Canonical - single merged stats effect)
effects: [
  { trigger: 'on_equip', effect: { type: 'stats', toughness: 5, durability: 20 } },
]
```

### Pitfall 2: Preserving Consumable Buffs with Duration > 0
**What goes wrong:** Codemod transforms ALL stat_buff effects, including valid temporary consumable buffs (duration > 0)
**Why it happens:** Overly broad AST selector matches stat_buff regardless of duration value
**How to avoid:** Filter transformation to ONLY stat_buff with duration === 0, leave duration > 0 untouched
**Warning signs:** Consumable stims (packages/items/src/definitions/consumables.ts) lose duration property after migration

**Example:**
```typescript
// CORRECT - consumable buffs should NOT be migrated
// packages/items/src/definitions/consumables.ts line 379
effects: [
  { trigger: 'on_use', effect: { type: 'stat_buff', stat: 'scan_speed', amount: 20, duration: 60 } }
]
// ^^^ This MUST remain stat_buff because duration: 60 (temporary buff)
```

### Pitfall 3: ESLint Rule Triggers on Consumables (False Positive)
**What goes wrong:** Custom ESLint rule flags ALL stat_buff with duration: 0, but some edge cases may be intentional
**Why it happens:** Rule doesn't distinguish between on_equip (deprecated) and on_use (potentially valid)
**How to avoid:** Scope ESLint rule to only flag stat_buff with duration: 0 AND trigger: 'on_equip'
**Warning signs:** ESLint errors on consumable definitions or test fixtures

### Pitfall 4: Git History Loss Without Tagged Rollback Point
**What goes wrong:** Migration committed, issues discovered days later, rollback requires manual restoration
**Why it happens:** No Git tag created before migration commit
**How to avoid:** Always create pre-migration tag (e.g., `pre-phase-60-migration`), document in rollback script
**Warning signs:** Team discussion about "what were the values before migration?"

### Pitfall 5: Registry Singleton State During Tests
**What goes wrong:** ItemRegistry is a singleton loaded at module initialization, migration changes affect all tests simultaneously
**Why it happens:** Registry mutates global state, tests share same registry instance
**How to avoid:** Capture baseline stats BEFORE running migration, compare against same item IDs after
**Warning signs:** Pre-migration test suite captures wrong baseline if migration already run

## Code Examples

Verified patterns from research and official sources:

### Codemod: Transform stat_buff to stats
```typescript
// Source: https://www.dhiwise.com/post/the-ultimate-guide-to-using-jscodeshift-with-typescript
// Adapted for stat_buff migration
import type { API, FileInfo, Options } from 'jscodeshift';

export default function transformer(file: FileInfo, api: API, options: Options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Find all object expressions in effects arrays
  root.find(j.ObjectExpression)
    .filter(path => {
      const props = path.value.properties;
      if (!Array.isArray(props)) return false;

      // Check if this is a stat_buff effect with duration: 0
      const typeNode = props.find(p =>
        p.type === 'Property' &&
        p.key.type === 'Identifier' &&
        p.key.name === 'type' &&
        p.value.type === 'Literal' &&
        p.value.value === 'stat_buff'
      );

      const durationNode = props.find(p =>
        p.type === 'Property' &&
        p.key.type === 'Identifier' &&
        p.key.name === 'duration' &&
        p.value.type === 'Literal' &&
        p.value.value === 0
      );

      return typeNode && durationNode;
    })
    .forEach(path => {
      const props = path.value.properties;

      // Extract stat name and amount
      const statNode = props.find(p => p.key.name === 'stat');
      const amountNode = props.find(p => p.key.name === 'amount');

      if (!statNode || !amountNode) return;

      const statName = statNode.value.value;
      const statAmount = amountNode.value.value;

      // Create new stats effect object
      const newProps = [
        j.property('init', j.identifier('type'), j.literal('stats')),
        j.property('init', j.identifier(statName), j.literal(statAmount)),
      ];

      // Replace object properties
      path.value.properties = newProps;
    });

  return root.toSource({ quote: 'single' });
}
```

### ESLint Rule: Prevent Legacy Pattern
```typescript
// Source: https://typescript-eslint.io/developers/custom-rules/
import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

type MessageIds = 'noLegacyStatBuff';

export const noLegacyStatBuff = ESLintUtils.RuleCreator.withoutDocs<[], MessageIds>({
  create(context) {
    return {
      ObjectExpression(node: TSESTree.ObjectExpression) {
        const props = node.properties;

        // Check for type: 'stat_buff'
        const typeProperty = props.find(p =>
          p.type === 'Property' &&
          p.key.type === 'Identifier' &&
          p.key.name === 'type' &&
          p.value.type === 'Literal' &&
          p.value.value === 'stat_buff'
        );

        // Check for duration: 0
        const durationProperty = props.find(p =>
          p.type === 'Property' &&
          p.key.type === 'Identifier' &&
          p.key.name === 'duration' &&
          p.value.type === 'Literal' &&
          p.value.value === 0
        );

        if (typeProperty && durationProperty) {
          context.report({
            node,
            messageId: 'noLegacyStatBuff',
          });
        }
      },
    };
  },
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow stat_buff with duration: 0 (use stats effect instead)',
    },
    messages: {
      noLegacyStatBuff: 'Use stats effect type instead of stat_buff with duration: 0 (deprecated in Phase 59)',
    },
    schema: [],
  },
  defaultOptions: [],
});
```

### Rollback Script
```typescript
// Source: https://www.harness.io/harness-devops-academy/database-rollback-strategies-in-devops
// Adapted for Git-based code rollback
import { execSync } from 'child_process';

function rollbackMigration() {
  const TAG = 'pre-phase-60-migration';

  console.log(`Rolling back to ${TAG}...`);

  try {
    // Verify tag exists
    execSync(`git rev-parse ${TAG}`, { stdio: 'pipe' });

    // Reset item definition files to tagged state
    execSync(`git checkout ${TAG} -- packages/items/src/definitions/suits.ts`, { stdio: 'inherit' });
    execSync(`git checkout ${TAG} -- packages/items/src/definitions/tools.ts`, { stdio: 'inherit' });

    console.log('Rollback complete. Run tests to verify.');
    console.log('To commit rollback: git add packages/items/src/definitions/*.ts && git commit -m "rollback: revert Phase 60 migration"');
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
}

rollbackMigration();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual regex find/replace | AST-based codemods (jscodeshift) | 2020-2021 | Safer migrations, format preservation, handles edge cases |
| Runtime schema validation | Compile-time ESLint rules | 2023+ | Zero runtime cost, IDE feedback, build-time enforcement |
| Database rollback scripts | Git-based code rollback | N/A (code, not DB) | Instant rollback, no data loss risk, fully reversible |

**Deprecated/outdated:**
- **Manual find/replace for code migrations:** Replaced by codemods in modern codebases (React, Next.js provide official codemods)
- **TypeScript type guards at runtime for schema validation:** ESLint custom rules catch at compile time without runtime overhead
- **Untagged Git commits for major migrations:** Industry practice requires tagged rollback points for production safety

## Open Questions

1. **Should migration consolidate multi-stat effects immediately or preserve structure?**
   - What we know: Some items (e.g., SUIT_BASIC_COMMON) have 2+ stat_buff effects that should logically consolidate into one stats effect
   - What's unclear: Whether to consolidate in Phase 60 or defer to Phase 63 (content cleanup)
   - Recommendation: Consolidate immediately during codemod transformation. Simpler item definitions, fewer effects to process at runtime, clearer for Phase 63 content work. Test suite verifies no functional change.

2. **Should ESLint rule be warning or error?**
   - What we know: Error prevents build if legacy pattern detected, warning allows build but shows in CI
   - What's unclear: Whether to block builds or allow gradual cleanup
   - Recommendation: Error severity. Phase 60 migrates ALL existing items, so post-migration there should be zero instances. Error prevents accidental reintroduction.

3. **How to handle migration in active development branches?**
   - What we know: Other developers may have in-progress item definitions using legacy pattern
   - What's unclear: Coordination strategy to avoid merge conflicts
   - Recommendation: Create pre-migration tag, announce migration timing, merge all active PRs touching item definitions before running codemod. Alternative: run codemod per-branch if needed.

## Sources

### Primary (HIGH confidence)
- TypeScript ESLint Custom Rules Documentation: https://typescript-eslint.io/developers/custom-rules/
- jscodeshift Documentation: https://www.npmjs.com/package/jscodeshift
- Project codebase analysis: packages/items/src/definitions/*.ts (43 instances identified)
- Phase 59 Plan: .planning/phases/59-type-foundation/59-01-PLAN.md (stats effect implementation context)

### Secondary (MEDIUM confidence)
- [Data Migration Best Practices 2026](https://medium.com/@kanerika/data-migration-best-practices-your-ultimate-guide-for-2026-7cbd5594d92e) - Rollback strategy guidance
- [Database Rollback Strategies in DevOps](https://www.harness.io/harness-devops-academy/database-rollback-strategies-in-devops) - Rollback pattern examples
- [jscodeshift TypeScript Guide](https://www.dhiwise.com/post/the-ultimate-guide-to-using-jscodeshift-with-typescript) - Transform code examples
- [Codemods for Code Migration](https://medium.com/@vasanthancomrads/codemods-for-code-migration-a-beginners-guide-to-smarter-refactoring-be90d3c60e41) - Migration patterns

### Tertiary (LOW confidence)
- [Zod Schema Validation 2026](https://oneuptime.com/blog/post/2026-01-25-zod-validation-typescript/view) - Runtime validation alternative (not recommended for compile-time needs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - jscodeshift and ESLint are industry standards, vitest already in use
- Architecture: HIGH - Patterns verified from official docs, adapted to project structure
- Pitfalls: HIGH - Based on codebase analysis (43 instances, 42 in suits.ts), official ESLint/jscodeshift pitfall docs
- Rollback: HIGH - Git-based rollback is deterministic for code changes (no database state)

**Research date:** 2026-02-21
**Valid until:** 90 days (stable tooling - jscodeshift, ESLint patterns unlikely to change rapidly)

## Migration Scope Summary

**Files affected:**
- `packages/items/src/definitions/suits.ts` - 42 instances (primary migration target)
- `packages/items/src/definitions/tools.ts` - 1 instance
- Total: 43 stat_buff with duration: 0 to migrate

**Files unchanged:**
- `packages/items/src/definitions/consumables.ts` - 10 instances of stat_buff with duration > 0 (valid temporary buffs, DO NOT migrate)

**Verification approach:**
1. Run codemod on suits.ts and tools.ts
2. Run test suite comparing stats computation before/after
3. Add ESLint rule to packages/items/.eslintrc.json
4. Run lint to verify zero instances remain
5. Create rollback tag and test rollback procedure in staging
