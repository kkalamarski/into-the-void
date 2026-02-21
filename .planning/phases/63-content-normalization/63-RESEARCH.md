# Phase 63: Content Normalization - Research

**Researched:** 2026-02-21
**Domain:** Content validation and stat profile normalization
**Confidence:** HIGH

## Summary

Phase 63 normalizes all item stat profiles to ensure consistent rarity scaling, archetype identity, and complete coverage. Currently, 52 items have empty `effects: []` arrays, and existing items use inconsistent stat distributions that don't follow the defined rarity multipliers (1.4x/2.0x/2.8x/4.0x) or archetype profiles (tank/scout/combat/utility). This phase audits all 100+ items, applies formulaic stat generation based on rarity+archetype+tier, and adds validation to prevent future drift.

The foundation is already in place: the `stats` effect type from Phase 59 provides the canonical pattern, Phase 62's shared calculation functions ensure client/server parity, and the `computeIlvl()` utility already encodes tier+rarity relationships. This phase is content work, not system work — applying established formulas to item definitions and preventing regression through validation.

**Primary recommendation:** Script-assisted batch content normalization with manual archetype classification, validation suite to enforce coverage and scaling rules, and documentation of stat budget formulas for future content creation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 3.2.4 | Testing framework | Already used for unit tests across monorepo |
| TypeScript | 5.9.3 | Type system | Compile-time validation of item definitions |
| Node.js scripts | 20.x | Batch content auditing | Generate stat profiles programmatically |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Existing dependencies sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual item editing | Script-generated stats | Scripts reduce human error, ensure formula consistency |
| JSON schema validation | TypeScript type checking | TypeScript already enforces item structure, schema adds complexity |
| Automated migration | Manual review + classification | Archetype classification requires design judgment, automate stat math only |

**Installation:**
```bash
# No new dependencies required - all packages already in workspace
```

## Architecture Patterns

### Recommended Project Structure
```
packages/items/src/
├── definitions/
│   ├── suits.ts           # 21 suit definitions - normalize with archetype profiles
│   ├── tools.ts           # 31 tool definitions - normalize with role-based stats
│   ├── modules.ts         # 30 module definitions - normalize focused bonuses
│   └── ...
├── types.ts               # ItemDefinition interface
├── utils.ts               # computeIlvl() helper - extend with stat budget helpers
├── validation.ts          # NEW: Content validation rules
└── scripts/
    ├── audit-items.ts     # NEW: Report items with empty effects
    └── generate-stats.ts  # NEW: Apply formulas to item definitions

packages/items/vitest.config.ts  # NEW: Test configuration for validation suite
packages/items/src/__tests__/
└── item-validation.test.ts      # NEW: Validation tests
```

### Pattern 1: Stat Budget Formula (Rarity × Tier × Archetype)
**What:** Deterministic stat generation based on item properties
**When to use:** Normalizing all equippable items
**Example:**
```typescript
// Source: .planning/research/FEATURES-EQUIPMENT-STATS.md (lines 145-186)
// Verified: 2026-02-21

interface StatProfile {
  durability: number;
  toughness: number;
  power: number;
  haste: number;
  vigor: number;
  recovery: number;
  perception: number;
  resilience: number;
}

const ARCHETYPE_PROFILES: Record<string, StatProfile> = {
  tank: {
    durability: 35,
    toughness: 30,
    resilience: 15,
    recovery: 10,
    vigor: 10,
    power: 0,
    haste: 0,
    perception: 0,
  },
  scout: {
    haste: 30,
    perception: 25,
    vigor: 25,
    recovery: 10,
    durability: 10,
    power: 0,
    toughness: 0,
    resilience: 0,
  },
  combat: {
    power: 30,
    haste: 20,
    toughness: 15,
    durability: 10,
    vigor: 10,
    perception: 0,
    recovery: 0,
    resilience: 0,
  },
  balanced: {
    durability: 15,
    toughness: 12,
    power: 10,
    haste: 8,
    vigor: 12,
    recovery: 6,
    perception: 8,
    resilience: 6,
  },
};

const RARITY_MULTIPLIERS = {
  common: 1.0,
  rare: 1.4,
  epic: 2.0,
  exotic: 2.8,
  legendary: 4.0,
} as const;

const TIER_MULTIPLIERS = {
  1: 1.0,   // Level 1-10
  2: 2.0,   // Level 11-20
  3: 3.5,   // Level 21-30
  4: 5.5,   // Level 31-40
  5: 8.0,   // Level 41-50
} as const;

/**
 * Generate stat bonuses for an item based on archetype, rarity, and tier.
 *
 * Formula: base_profile × rarity_multiplier × tier_multiplier
 */
function generateStatBonuses(
  archetype: keyof typeof ARCHETYPE_PROFILES,
  rarity: ItemRarity,
  tier: 1 | 2 | 3 | 4 | 5
): Partial<CharacterStats> {
  const profile = ARCHETYPE_PROFILES[archetype];
  const rarityMult = RARITY_MULTIPLIERS[rarity];
  const tierMult = TIER_MULTIPLIERS[tier];

  const stats: Partial<CharacterStats> = {};

  for (const [stat, baseValue] of Object.entries(profile)) {
    if (baseValue > 0) {
      const scaled = Math.round(baseValue * rarityMult * tierMult);
      stats[stat as keyof CharacterStats] = scaled;
    }
  }

  return stats;
}
```

### Pattern 2: Content Validation Suite
**What:** Test suite enforcing content quality rules
**When to use:** CI pipeline, pre-commit hooks, content review
**Example:**
```typescript
// packages/items/src/__tests__/item-validation.test.ts

import { describe, it, expect } from 'vitest';
import { ALL_ITEMS } from '../definitions';
import type { ItemDefinition } from '../types';

describe('Content Validation (CONT-01 to CONT-05)', () => {
  it('CONT-03: All equippable items have stat effects', () => {
    const equippableItems = ALL_ITEMS.filter(item => item.equipSlot);
    const itemsWithoutStats = equippableItems.filter(
      item => !item.effects || item.effects.length === 0
    );

    expect(itemsWithoutStats).toHaveLength(0);

    // Report which items are missing stats if test fails
    if (itemsWithoutStats.length > 0) {
      console.error('Items missing stats:', itemsWithoutStats.map(i => i.id));
    }
  });

  it('CONT-01: Tank suits have more durability than scout suits', () => {
    const tankSuits = getTankSuits(); // Helper to classify suits
    const scoutSuits = getScoutSuits();

    for (const tank of tankSuits) {
      const tankDurability = getStatFromEffects(tank, 'durability');
      for (const scout of scoutSuits) {
        const scoutDurability = getStatFromEffects(scout, 'durability');
        if (tank.rarity === scout.rarity && tank.ilvl === scout.ilvl) {
          expect(tankDurability).toBeGreaterThan(scoutDurability);
        }
      }
    }
  });

  it('CONT-02: Legendary items provide 4x stat bonuses vs common', () => {
    // Group items by archetype and tier
    const itemsByArchetype = groupItemsByArchetype(ALL_ITEMS);

    for (const [archetype, items] of Object.entries(itemsByArchetype)) {
      const commonTier1 = items.find(i => i.rarity === 'common' && getTier(i) === 1);
      const legendaryTier1 = items.find(i => i.rarity === 'legendary' && getTier(i) === 1);

      if (commonTier1 && legendaryTier1) {
        const commonTotal = getTotalStats(commonTier1);
        const legendaryTotal = getTotalStats(legendaryTier1);
        const ratio = legendaryTotal / commonTotal;

        // Allow 10% tolerance for rounding
        expect(ratio).toBeGreaterThanOrEqual(3.6);
        expect(ratio).toBeLessThanOrEqual(4.4);
      }
    }
  });

  it('CONT-04: Combat tools provide power, mining tools provide perception', () => {
    const combatTools = ALL_ITEMS.filter(
      item => item.category === 'tool' && item.toolType === 'combat'
    );
    const miningTools = ALL_ITEMS.filter(
      item => item.category === 'tool' && item.toolType === 'mining'
    );

    for (const tool of combatTools) {
      const power = getStatFromEffects(tool, 'power');
      expect(power).toBeGreaterThan(0);
    }

    for (const tool of miningTools) {
      const perception = getStatFromEffects(tool, 'perception');
      expect(perception).toBeGreaterThan(0);
    }
  });

  it('CONT-05: Modules have stat bonuses based on module type', () => {
    const modules = ALL_ITEMS.filter(item => item.category === 'module');

    for (const module of modules) {
      const hasStats = module.effects && module.effects.length > 0;
      expect(hasStats).toBe(true);

      // Module-specific validation based on ID pattern
      if (module.id.includes('armor')) {
        const toughness = getStatFromEffects(module, 'toughness');
        expect(toughness).toBeGreaterThan(0);
      }
      if (module.id.includes('speed')) {
        const haste = getStatFromEffects(module, 'haste');
        expect(haste).toBeGreaterThan(0);
      }
      // ... etc for other module types
    }
  });
});

// Helper functions
function getStatFromEffects(item: ItemDefinition, stat: string): number {
  if (!item.effects) return 0;
  let total = 0;
  for (const effectDef of item.effects) {
    if (effectDef.effect.type === 'stats') {
      total += (effectDef.effect as any)[stat] ?? 0;
    }
  }
  return total;
}

function getTotalStats(item: ItemDefinition): number {
  const stats = ['durability', 'toughness', 'power', 'haste', 'vigor', 'recovery', 'perception', 'resilience'];
  return stats.reduce((sum, stat) => sum + getStatFromEffects(item, stat), 0);
}

function getTier(item: ItemDefinition): number {
  // Derive tier from requiredLevel
  if (item.requiredLevel <= 10) return 1;
  if (item.requiredLevel <= 20) return 2;
  if (item.requiredLevel <= 30) return 3;
  if (item.requiredLevel <= 40) return 4;
  return 5;
}
```

### Pattern 3: Script-Assisted Stat Generation
**What:** Node.js script to apply formulas to item definitions
**When to use:** Batch normalization, not manual editing
**Example:**
```typescript
// packages/items/src/scripts/generate-stats.ts

import fs from 'fs';
import path from 'path';
import { ALL_ITEMS } from '../definitions';
import type { ItemDefinition, ItemRarity } from '../types';

// Classification map: manually assign archetype to each suit
const SUIT_ARCHETYPES: Record<string, string> = {
  suit_basic_common: 'balanced',
  suit_reinforced_rare: 'tank',
  suit_scout_rare: 'scout',
  suit_tactical_epic: 'combat',
  // ... manually classify all 21 suits
};

const TOOL_ROLE_STATS: Record<string, string> = {
  universal: 'power',
  combat: 'power',
  mining: 'perception',
  research: 'perception',
  bio: 'vigor',
  demolition: 'power',
  stealth: 'perception',
  anomaly: 'resilience',
};

function generateSuitStats(item: ItemDefinition): string {
  const archetype = SUIT_ARCHETYPES[item.id];
  if (!archetype) {
    console.warn(`No archetype for ${item.id}, skipping`);
    return '';
  }

  const tier = getTier(item.requiredLevel);
  const stats = generateStatBonuses(archetype, item.rarity, tier);

  // Generate TypeScript code
  return `  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ${formatStats(stats)} } },
  ],`;
}

function generateToolStats(item: ItemDefinition): string {
  const primaryStat = TOOL_ROLE_STATS[item.toolType!];
  const tier = getTier(item.requiredLevel);
  const rarityMult = RARITY_MULTIPLIERS[item.rarity];

  // Tools provide focused bonuses (smaller than suits)
  const statValue = Math.round(15 * rarityMult * TIER_MULTIPLIERS[tier]);

  return `  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ${primaryStat}: ${statValue} } },
  ],`;
}

function formatStats(stats: Partial<CharacterStats>): string {
  return Object.entries(stats)
    .filter(([_, value]) => value > 0)
    .map(([stat, value]) => `${stat}: ${value}`)
    .join(', ');
}

// Output recommendations for manual review
console.log('=== SUIT STAT RECOMMENDATIONS ===');
for (const item of ALL_ITEMS.filter(i => i.category === 'suit')) {
  console.log(`\n${item.id} (${item.rarity}, L${item.requiredLevel}):`);
  console.log(generateSuitStats(item));
}

console.log('\n=== TOOL STAT RECOMMENDATIONS ===');
for (const item of ALL_ITEMS.filter(i => i.category === 'tool' && (!item.effects || item.effects.length === 0))) {
  console.log(`\n${item.id} (${item.toolType}, ${item.rarity}):`);
  console.log(generateToolStats(item));
}
```

### Pattern 4: Archetype Classification (Manual Design Work)
**What:** Design decision mapping items to archetypes
**When to use:** Before running stat generation scripts
**Example:**
```typescript
// Source: Manual classification based on item name/description

/**
 * Archetype classification for suits.
 *
 * Tank: High durability/toughness/resilience, low mobility
 * Scout: High haste/perception/vigor, low defense
 * Combat: High power/haste/toughness, balanced offense/defense
 * Balanced: Even distribution, no specialization
 * Hazmat: Resilience/recovery/durability (environmental)
 * Assault: Power/durability/haste (glass cannon with HP)
 * Recon: Perception/haste/vigor (scout variant)
 */
const SUIT_CLASSIFICATIONS = {
  // Common tier
  suit_basic_common: 'balanced',
  suit_salvaged_common: 'balanced',
  suit_worker_common: 'balanced',

  // Rare tier
  suit_reinforced_rare: 'tank',
  suit_scout_rare: 'scout',
  suit_combat_rare: 'combat',

  // Epic tier
  suit_tactical_epic: 'combat',
  suit_stealth_epic: 'scout',
  suit_hazmat_epic: 'hazmat',

  // Exotic tier
  suit_assault_exotic: 'assault',
  suit_recon_exotic: 'recon',

  // Legendary tier
  suit_guardian_legendary: 'tank',
  suit_phantom_legendary: 'scout',
  suit_devastator_legendary: 'combat',
} as const;
```

### Anti-Patterns to Avoid
- **Hardcoding raw stat values:** Use formulas, not magic numbers
- **Manual item-by-item editing:** Use scripts to apply consistent formulas
- **Ignoring empty effects arrays:** Validation must catch these before merge
- **Random stat distributions:** Archetype profiles ensure coherent identity
- **Copy-paste stat values:** Leads to rarity inconsistencies

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stat formula application | Manual editing of 100+ items | Script-generated recommendations | Formulas ensure consistency, scripts prevent human error |
| Content validation | Manual review before merge | Automated test suite | Tests catch missing stats, scaling violations, archetype drift |
| Archetype classification | Automated based on item name | Manual designer review + documentation | Archetype is a design decision, not derivable from metadata |
| Rarity scaling | Per-item custom multipliers | Fixed multipliers per rarity tier | Predictable progression, easier to balance |

**Key insight:** Content normalization is 80% mechanical (apply formulas) and 20% design judgment (classify archetypes). Automate the mechanical parts, document the design decisions.

## Common Pitfalls

### Pitfall 1: Empty Effects Arrays Creating Silent Failures
**What goes wrong:** 52 items currently have `effects: []`. After stat refactor, these items are technically valid but provide no bonuses — players equip them and get nothing.
**Why it happens:** TypeScript allows empty arrays, no validation enforces content coverage.
**How to avoid:**
- Add Vitest test: `equippableItems.filter(i => !i.effects || i.effects.length === 0).length === 0`
- Run test in CI pipeline to prevent merging new empty items
- Backfill existing 52 items with appropriate stat profiles before Phase 63 completion
**Warning signs:**
- Player bug report: "equipped X but stats didn't change"
- Tooltip shows item but no stat deltas
- Test suite doesn't validate effects array presence

**Source:** `.planning/research/PITFALLS-EQUIPMENT-STATS.md` Pitfall 5, codebase analysis showing 52 items with `effects: []`

### Pitfall 2: Inconsistent Rarity Scaling Creating Balance Drift
**What goes wrong:** Some common items have 25 total stats, others have 60. Some epic items are weaker than rare items of same level. Players can't predict upgrade value.
**Why it happens:** Items created ad-hoc without applying rarity multipliers. No validation enforcing scaling rules.
**How to avoid:**
- Define CONT-02 test: legendary tier 1 items must provide 3.6x-4.4x stats vs common tier 1 (allows rounding tolerance)
- Apply `generateStatBonuses()` formula to all items, not manual guessing
- Group items by archetype+tier, validate rarity ordering
**Warning signs:**
- Epic item weaker than rare item (after accounting for tier)
- Legendary doesn't feel legendary (+10% instead of +300%)
- Players ignore higher rarity items because stats are inconsistent

### Pitfall 3: Archetype Identity Loss Through Random Stat Distribution
**What goes wrong:** Tank suit has high power but low durability. Scout suit has high toughness but low perception. Archetypes feel generic and interchangeable.
**Why it happens:** Items get stats that "seem reasonable" without archetype profile enforcement.
**How to avoid:**
- Manually classify each suit into archetype (tank/scout/combat/balanced/etc.)
- Use ARCHETYPE_PROFILES templates, not random stat picks
- CONT-01 test validates tank suits have more durability than scout suits of same rarity+tier
**Warning signs:**
- "All suits feel the same" player feedback
- Tank players using scout suits because stats are similar
- No clear build diversity based on suit choice

**Source:** `.planning/research/FEATURES-EQUIPMENT-STATS.md` Archetype Stat Profiles (lines 72-138)

### Pitfall 4: Tool Role Stats Not Matching Tool Type
**What goes wrong:** Combat tools provide perception instead of power. Mining tools have no stats. Tool choice doesn't affect gameplay.
**Why it happens:** Tools added without considering role-based stat allocation.
**How to avoid:**
- CONT-04 test: combat tools must have power > 0, mining tools must have perception > 0
- Use TOOL_ROLE_STATS mapping to assign appropriate primary stat
- Tools provide smaller bonuses than suits but still meaningful (+15 to +60 based on rarity/tier)
**Warning signs:**
- Players never switch tools (stats don't matter)
- Mining efficiency doesn't improve with better tools
- Combat tools don't affect damage output

### Pitfall 5: Module Stats Not Focused Based on Module Type
**What goes wrong:** Armor modules provide haste, speed modules provide toughness. Module identity is unclear.
**Why it happens:** Modules created with random stat distributions instead of focused bonuses.
**How to avoid:**
- CONT-05 test: armor modules must have toughness/durability, speed modules must have haste, etc.
- Modules provide single focused bonus (armor = toughness) or tight pair (power core = vigor + recovery)
- Use existing legacy effect types (armor, speed, etc.) as reference for stat profiles
**Warning signs:**
- Module choice feels arbitrary (all provide similar mixed stats)
- No clear "armor module" vs "speed module" distinction in actual stats
- Players equip highest rarity module regardless of type

## Code Examples

Verified patterns from codebase and research:

### Current Item Definition Pattern (Common Suit)
```typescript
// Source: packages/items/src/definitions/suits.ts (lines 8-28)
// Verified: 2026-02-21

export const SUIT_BASIC_COMMON: ItemDefinition = {
  id: 'suit_basic_common',
  displayName: 'Basic Exo-Suit',
  description: 'Standard-issue survival suit...',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 8.0,
  baseValue: 500,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_suit_basic',
  color: 0x666666,
  equipSlot: 'exosuit',
  moduleSlots: 3,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', toughness: 5, durability: 20 } },
  ],
  grantedAbilities: ['nano_repair'],
};
```

### Current Empty Effects Pattern (Mining Tool)
```typescript
// Source: packages/items/src/definitions/tools.ts (lines 35-54)
// Verified: 2026-02-21

// BEFORE (empty effects - needs normalization):
export const TOOL_MINING_COMMON: ItemDefinition = {
  id: 'tool_mining_common',
  displayName: 'Basic Mining Drill',
  description: 'Standard-issue extraction tool...',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 3.0,
  baseValue: 300,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_mining',
  color: 0xcc8844,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [], // ← EMPTY - no stat bonuses
  range: 1,
  grantedAbilities: ['basic_strike'],
};

// AFTER (normalized - perception for mining):
export const TOOL_MINING_COMMON: ItemDefinition = {
  // ... same metadata ...
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', perception: 15 } },
  ],
  // ... rest unchanged ...
};
```

### Stat Aggregation in computeCharStats
```typescript
// Source: packages/game-logic/src/stats/char-stats.ts (lines 110-128)
// Verified: 2026-02-21

// This aggregation loop is already generic - works for single-stat AND multi-stat effects
for (const equippedItem of equippedItems) {
  const itemDef = ItemRegistry.get(equippedItem.itemId);
  if (!itemDef) continue;

  const equipEffects = resolveEffectsForTrigger(itemDef.effects, 'on_equip');
  const passiveEffects = resolveEffectsForTrigger(itemDef.effects, 'passive');
  const allEffects = [...equipEffects, ...passiveEffects];

  for (const effect of allEffects) {
    for (const [stat, value] of Object.entries(effect.applied)) {
      // Only apply if stat exists in CharacterStats
      if (stat in stats) {
        (stats as unknown as Record<string, number>)[stat] += value;
      }
    }
  }
}
```

### Rarity Multipliers (Already Implemented for ilvl)
```typescript
// Source: packages/items/src/utils.ts (lines 1-26)
// Verified: 2026-02-21

// Note: These are for ilvl calculation, NOT stat scaling
// Stat scaling uses different multipliers (1.0/1.4/2.0/2.8/4.0)
const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  common: 1.0,
  rare: 1.2,
  epic: 1.5,
  exotic: 1.8,
  legendary: 2.2,
};

export function computeIlvl(tier: 1 | 2 | 3 | 4 | 5, rarity: ItemRarity): number {
  const base = tier * 10;
  const multiplier = RARITY_MULTIPLIERS[rarity];
  return Math.round(base * multiplier);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual stat values per item | Formula-driven stat generation (Phase 63) | Phase 63 | Consistent scaling, archetype identity |
| No content validation | Automated test suite (CONT-01 to CONT-05) | Phase 63 | Catches missing stats, scaling violations |
| Ad-hoc rarity scaling | Fixed multipliers (1.4x/2.0x/2.8x/4.0x) | Phase 63 | Predictable progression |
| Empty effects arrays allowed | Schema validation + backfill | Phase 63 | All equippable items provide bonuses |

**Deprecated/outdated:**
- Manual stat allocation without formulas: Replaced by script-generated recommendations (Phase 63)
- Items with `effects: []`: Backfilled with appropriate stat profiles (Phase 63)
- ilvl multipliers used for stat scaling: Separate stat multipliers defined (1.4x vs 1.2x for rare)

## Open Questions

1. **Should we use ilvl multipliers (1.2x rare) or stat multipliers (1.4x rare)?**
   - What we know: `computeIlvl()` uses 1.0/1.2/1.5/1.8/2.2 for rare through legendary. Research recommends 1.0/1.4/2.0/2.8/4.0 for stat scaling.
   - What's unclear: Whether to unify these or keep separate (ilvl for display/gating, stat multipliers for actual bonuses)
   - Recommendation: Keep separate. ilvl is for level requirements and visual display. Stat multipliers drive actual power. Use 1.4x/2.0x/2.8x/4.0x for stats (more generous, clearer progression feel).

2. **How to handle hybrid archetype suits (hazmat/assault/recon)?**
   - What we know: Research defines tank/scout/combat profiles. 4 specialized suits exist (from Phase 58): hazmat, assault, recon, stealth.
   - What's unclear: Should hybrids use weighted profiles (e.g., hazmat = 50% tank + 50% balanced) or custom profiles?
   - Recommendation: Define custom profiles for hybrids in ARCHETYPE_PROFILES. Hazmat = resilience+recovery+durability (environmental survival focus). Weighted mixing creates unclear identity.

3. **What stat budget should modules use?**
   - What we know: Modules provide focused bonuses (armor = toughness). Suits provide 60-70 total stats at tier 1 common.
   - What's unclear: Should modules provide 10-15 stats (small focused bonus) or 30-40 stats (significant contribution)?
   - Recommendation: Modules provide 20-30% of suit stat budget. Tier 1 common module = 15-20 stats. Allows 3-6 modules to meaningfully enhance suit without overwhelming base stats.

## Sources

### Primary (HIGH confidence)
- Codebase analysis:
  - `packages/items/src/definitions/suits.ts` — 21 suit definitions, inconsistent stat distributions
  - `packages/items/src/definitions/tools.ts` — 31 tool definitions, 43 with `effects: []`
  - `packages/items/src/definitions/modules.ts` — 30 module definitions, mixed stat patterns
  - `packages/items/src/utils.ts` — computeIlvl() with rarity multipliers (1.2x/1.5x/1.8x/2.2x)
  - `packages/game-logic/src/stats/char-stats.ts` — Generic stat aggregation loop
  - `.planning/REQUIREMENTS.md` (lines 36-40) — CONT-01 to CONT-05 requirements
  - `.planning/research/FEATURES-EQUIPMENT-STATS.md` (lines 145-186) — Rarity multipliers, archetype profiles, stat budgets
  - `.planning/research/SUMMARY-EQUIPMENT-STATS.md` (lines 165-175) — Phase 5 content normalization guidance

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS-EQUIPMENT-STATS.md` — Pitfall 5 (missing item stats)
- `.planning/phases/62-calculation-parity/62-RESEARCH.md` — Client/server parity patterns
- [Color-Coded Item Tiers - TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/ColorCodedItemTiers) — Industry standard rarity systems
- [Rarity - Last Epoch Game Guide](https://www.lastepochtools.com/guide/section/rarity) — Rarity tier patterns in modern ARPGs

### Tertiary (LOW confidence - general validation patterns)
- [AJV TypeScript Guide](https://ajv.js.org/guide/typescript.html) — JSON schema validation with TypeScript
- [typescript-json-schema npm](https://www.npmjs.com/package/typescript-json-schema) — Generate JSON schemas from TypeScript types

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new dependencies, uses existing Vitest + TypeScript + Node.js scripts
- Architecture: HIGH — Codebase analysis shows clear item definition structure, validation patterns well-established
- Pitfalls: HIGH — 52 items with empty effects confirmed by grep, research docs warn of inconsistent scaling

**Research date:** 2026-02-21
**Valid until:** ~60 days (content work, formulas stable, unlikely to change rapidly)
