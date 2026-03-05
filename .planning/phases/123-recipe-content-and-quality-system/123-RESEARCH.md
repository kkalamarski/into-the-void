# Phase 123: Recipe Content and Quality System - Research

**Researched:** 2026-03-05
**Domain:** Crafting recipe content, quality tier calculation, proficiency XP system
**Confidence:** HIGH

## Summary

Phase 123 builds on the crafting foundation laid in Phase 122 — CraftingService, recipe registry, proficiency persistence, and unlock condition checking already exist. This phase focuses on three workstreams: (1) populating the recipe registry with ~30 economically-balanced recipes across Equipment, Consumables, and Reagents disciplines, (2) implementing quality tier probability rolls tied to proficiency level, and (3) defining faction specialty recipes for Verdant, Helix, and Nexus.

The existing codebase provides solid scaffolding: `RecipeDefinition` type is fully defined, `registerRecipe()` populates a module-level Map, `CraftingService.collectCraft()` has a hardcoded `'standard'` quality tier ready to be replaced with a calculation, and `awardProficiencyXP()` already persists XP with the `level = floor(sqrt(xp / 100)) + 1` curve capped at 50. The primary work is content authoring, quality roll logic, XP decay, and a new `recipes.ts` definition file that registers all recipes.

**Primary recommendation:** Create a `packages/game-logic/src/crafting/` module for quality calculation and XP decay pure functions, a `packages/items/src/definitions/recipes.ts` for recipe definitions, and 4-6 new processed reagent ItemDefinitions to serve as crafting chain intermediates.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Probability roll** per craft based on proficiency level — not guaranteed thresholds
- Higher-tier recipes have **tighter quality odds** (harder to roll Masterwork on endgame gear)
- At max proficiency (level 50): ~35% Standard / ~50% Refined / ~15% Masterwork (on Tier 1 recipes; odds shift toward Standard on higher tiers)
- Quality stat bonuses are **percentage-based**: Standard = base stats, Refined = +15%, Masterwork = +30%
- Quality applies to **reagent processing too** — Refined reagents exist and affect downstream crafting
- **8-12 recipes per discipline** (~30 total recipes)
- **Two-step recipe chains**: raw materials → processed reagents → final items
- Crafted items are **NOT sold by traders** — only obtainable through crafting, looting, or player trade
- Balance anchor: **ingredient trader sell value** — output item's value should be 80-120% of total ingredient sell price at traders
- **4-6 new processed reagent items** to serve as intermediates in chains
- **Unique faction-only items** — each faction gets exclusive items that can't be obtained any other way
  - Verdant: bio-tech gear (fits lore of bioengineering)
  - Helix: extraction/heavy industrial gear (fits lore of raw exploitation)
  - Nexus: trade/sensor/network gear (fits lore of connectivity)
- **No Unaffiliated specialty recipes** — the trade-off for faction independence is no exclusive crafting
- Unlock requires **faction membership + proficiency level gate** (dual requirement)
- Faction items are **tradeable** — only faction members can CRAFT them, but anyone can USE/equip them
- Minimum 3 exclusive recipes per faction (per requirements)
- **All recipes are gated** — even Tier 1 requires some unlock condition (no auto-unlocked recipes)
- Distribution: **mostly character level gates**, with quest and POI unlocks reserved for special/notable recipes
- Locked recipes are **visible in the recipe list** with unlock condition shown
- POI unlock = **visited once** (entering the POI zone is sufficient)
- **Two-step max**: raw → processed → final
- **Cross-discipline chains**: Reagents discipline processes raw materials into intermediates
- Equipment: slow timer (15-30s), expensive ingredients, high-value output
- Consumables: fast timer (3-8s), cheap ingredients, high-volume output
- Reagents: medium timer (5-15s), processing raw materials into intermediates
- **One craft at a time** across all disciplines (existing Phase 122 enforcement)
- XP **scaled by recipe tier**: Tier 1 = 10 XP, Tier 2 = 25 XP, Tier 3 = 50 XP
- **Keep current XP curve**: `level = floor(sqrt(xp / 100)) + 1`, capped at 50
- **XP decay on low-tier recipes**: if recipe tier is significantly below proficiency level, XP is reduced (50% at -5 levels, 25% at -10)
- Name format: **suffix brackets** — "Iron Pickaxe [Refined]", "Void Suit [Masterwork]"; Standard items show no suffix
- **Text-only quality indicators** — no color coding for quality tiers
- Masterwork is a **prestige achievement**: local notification to crafter + nearby broadcast

### Claude's Discretion
- Exact probability curves per tier (anchored at ~15% Masterwork at max level for Tier 1)
- Specific item definitions for faction specialty gear (aligned with faction lore themes)
- Which existing items become craftable vs remain loot-only
- XP decay formula specifics (anchored at 50% at -5 levels, 25% at -10)
- Processed reagent item definitions (4-6 new items)
- Exact ingredient quantities per recipe
- Timer values within the discipline ranges

### Deferred Ideas (OUT OF SCOPE)
- Batch crafting for reagents (process multiples at once)
- Cross-discipline XP bonuses
- Masterwork zone-wide announcements
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RCPE-01 | Player can browse recipes organized by crafting discipline | Recipe definitions with `discipline` field; `getAllRecipes()` already exists |
| RCPE-02 | Player can see ingredient requirements with have/need counts | Recipe `ingredients` array with `itemId`/`quantity`; client needs inventory cross-reference |
| RCPE-03 | Player can see locked recipes and unlock conditions | `unlockConditions` field on `RecipeDefinition`; `checkUnlockCondition` in CraftingService |
| RCPE-04 | Player can filter by craftable-now | Client-side: compare `ingredients` vs inventory counts + unlock status |
| RCPE-05 | Recipes unlock via level, quest, or POI | `RecipeUnlockCondition` discriminated union already defined; `recipe_unlocks` DB table exists |
| RCPE-06 | Faction specialty recipes only for faction members | `factionRestriction` field on `RecipeDefinition`; faction check in `startCraft()` |
| PROF-01 | XP awarded per craft in relevant discipline | `awardProficiencyXP()` exists; needs XP decay logic |
| PROF-02 | Each discipline has independent proficiency level | `CraftingProficiencyJson` already stores per-discipline {xp, level} |
| PROF-03 | Higher proficiency = higher quality chance | Quality roll function needs implementation (currently hardcoded 'standard') |
| PROF-04 | Quality tiers provide stat bonuses | Quality modifier on `properties` of crafted item; stat calculation to apply +15%/+30% |
| CONT-01 | Equipment recipes for suits, tools, modules | New recipe definitions targeting existing equipment items |
| CONT-02 | Consumable recipes for health, buffs, hazard protection | New recipe definitions targeting existing consumable items |
| CONT-04 | Reagent processing recipes for intermediate materials | New processed reagent items + recipes to create them |
| CONT-05 | Each faction has 3+ exclusive specialty recipes | Faction-restricted recipes with dual unlock (faction + proficiency) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @into-the-void/shared-types | local | RecipeDefinition, QualityTier, CraftingDiscipline types | Already defined, single source of truth |
| @into-the-void/items | local | ItemDefinition registry, item ID constants | Existing pattern for all item definitions |
| @into-the-void/game-logic | local | Pure functions for quality calculation, XP decay | Follows gathering proficiency pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm | existing | Database operations for crafting_proficiency | Already used by CraftingService |
| @nestjs/event-emitter | existing | EventEmitter2 for craft.completed events | Already wired in CraftingService |

## Architecture Patterns

### Recommended Project Structure
```
packages/game-logic/src/crafting/
├── quality.ts           # Quality roll calculation (pure function)
├── xp-decay.ts          # XP decay calculation (pure function)
├── quality.test.ts      # Unit tests for quality
└── xp-decay.test.ts     # Unit tests for XP decay

packages/items/src/definitions/
├── processed-reagents.ts  # 4-6 new processed reagent items
└── recipes.ts             # All ~30 recipe definitions + registration

apps/game-server/src/game/
└── crafting.service.ts    # Updated: quality roll on collect, XP decay on award
```

### Pattern 1: Pure Function Quality Calculator
**What:** Quality tier probability calculation as a pure function in game-logic
**When to use:** Called from CraftingService.collectCraft() to replace hardcoded 'standard'
**Example:**
```typescript
// packages/game-logic/src/crafting/quality.ts
export interface QualityRollResult {
  tier: 'standard' | 'refined' | 'masterwork';
  roll: number; // 0-1 for debugging/logging
}

export function rollQualityTier(
  proficiencyLevel: number,
  recipeTier: number,
  rng?: () => number // injectable RNG for testing
): QualityRollResult {
  const random = (rng ?? Math.random)();
  const { masterworkChance, refinedChance } = getQualityThresholds(proficiencyLevel, recipeTier);

  if (random < masterworkChance) return { tier: 'masterwork', roll: random };
  if (random < masterworkChance + refinedChance) return { tier: 'refined', roll: random };
  return { tier: 'standard', roll: random };
}
```

### Pattern 2: Recipe Definition Registration
**What:** Static recipe definitions auto-registered on module import
**When to use:** Following the same pattern as ItemDefinition registration in items package
**Example:**
```typescript
// packages/items/src/definitions/recipes.ts
import { RecipeDefinition } from '@into-the-void/shared-types';

export const RECIPE_HEALTH_VIAL: RecipeDefinition = {
  id: 'recipe_health_vial',
  displayName: 'Health Vial',
  description: 'Synthesize a basic health restoration vial.',
  discipline: 'consumables',
  ingredients: [
    { itemId: 'reagent_fungal_extract', quantity: 2 },
    { itemId: 'world_fungal_spore_cluster', quantity: 1 },
  ],
  outputItemId: 'health_vial_common',
  craftTimeMs: 5000,
  unlockConditions: [{ type: 'level', requiredLevel: 3 }],
  proficiencyXP: 10,
  tier: 1,
};

export const ALL_RECIPES: readonly RecipeDefinition[] = [ /* ... */ ];
```

### Pattern 3: Quality Modifier in Item Properties
**What:** Store quality tier in InventoryItem.properties for stat calculation
**When to use:** On CraftingService.collectCraft() after quality roll
**Example:**
```typescript
// In CraftingService.collectCraft():
const qualityResult = rollQualityTier(disciplineData.level, recipe.tier);
const addResult = await this.inventoryService.addItem(characterId, {
  instanceId: crypto.randomUUID(),
  itemId: recipe.outputItemId,
  quantity: 1,
  slot: -1,
  properties: {
    qualityTier: qualityResult.tier,
    // Display name suffix handled by client
  },
});
```

### Anti-Patterns to Avoid
- **Separate item IDs per quality tier:** Quality is a runtime modifier on inventory slots, not separate items. This prevents registry bloat.
- **Quality as color coding:** Colors reserved for item rarity. Quality uses text-only bracket suffix "[Refined]", "[Masterwork]".
- **Auto-unlocked recipes:** All recipes must have at least one unlock condition, even Tier 1.
- **Hardcoding quality stat multipliers in item definitions:** Quality multiplier (1.0/1.15/1.30) is applied at stat computation time, not baked into item data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recipe registration | Custom loader/parser | Module-level Map + registerRecipe() | Already built in Phase 122 |
| Proficiency persistence | New DB schema | Existing crafting_proficiency JSONB | Already handles per-discipline XP/level |
| Unlock condition checking | New validation logic | CraftingService.checkUnlockCondition() | Already handles level/quest/POI |
| Inventory item addition | New inventory method | InventoryService.addItem() with properties | Properties bag supports quality metadata |
| Event broadcasting | Custom pub/sub | EventEmitter2 (NestJS) | Already wired for craft.started/completed |

## Common Pitfalls

### Pitfall 1: Economy Balance Drift
**What goes wrong:** Recipe ingredient costs don't match the 80-120% balance anchor, making crafting either pointless (cheaper to buy) or exploitable (infinite profit loop).
**Why it happens:** Individual recipes are balanced in isolation without cross-referencing trader sell values.
**How to avoid:** For each recipe, sum ingredient `baseValue` fields and verify output item's `baseValue` falls within 80-120% of that sum. Document the calculation per recipe.
**Warning signs:** Any recipe where output baseValue < 0.8 * sumIngredientBaseValue or > 1.2 * sumIngredientBaseValue.

### Pitfall 2: Quality Roll at Low Proficiency
**What goes wrong:** Level 1 players occasionally roll Masterwork, breaking economy and progression feel.
**Why it happens:** Probability function doesn't fully zero out Masterwork at low levels.
**How to avoid:** At proficiency levels below a threshold (e.g., level 10), Masterwork chance should be exactly 0%. Refined chance should also be 0% at level 1, scaling in gradually.
**Warning signs:** Any non-standard quality from a level-1 crafter in tests.

### Pitfall 3: Circular Recipe Chains
**What goes wrong:** Processed reagent A requires processed reagent B which requires A.
**Why it happens:** Cross-discipline chains create complex dependency graphs.
**How to avoid:** Two-step max chain depth (raw → processed → final). Processed reagents use only raw world-items/reagents as inputs, never other processed items.
**Warning signs:** Any recipe whose ingredients include another recipe's output that itself requires the first recipe's output.

### Pitfall 4: Missing Faction Lore Alignment
**What goes wrong:** Faction specialty items don't reflect faction identity (Verdant making heavy industrial gear, Helix making bio-tech).
**Why it happens:** Rushing content without cross-referencing lore.
**How to avoid:** Verdant = bio-tech, Helix = heavy extraction/industrial, Nexus = trade/sensor/network. Check lore/world-bible.md.
**Warning signs:** Faction item descriptions that could belong to any faction.

### Pitfall 5: XP Decay Breaks Progression
**What goes wrong:** XP decay is too aggressive, making lower-tier recipes completely useless for any XP.
**Why it happens:** Linear decay formula that reaches 0% too quickly.
**How to avoid:** Use a clamped formula: `decayFactor = max(0.1, 1 - 0.1 * max(0, levelDiff - 2))`. This means: no decay within 2 levels, then 10% per level difference, floor at 10% (never zero XP).
**Warning signs:** Any recipe awarding 0 XP to any proficiency level.

## Code Examples

### Quality Probability Thresholds
```typescript
/**
 * Calculate quality tier probabilities based on proficiency level and recipe tier.
 * Anchored at: max level (50), Tier 1 → 35% Standard, 50% Refined, 15% Masterwork
 * Higher recipe tiers shift odds toward Standard.
 */
export function getQualityThresholds(
  proficiencyLevel: number,
  recipeTier: number
): { masterworkChance: number; refinedChance: number; standardChance: number } {
  const MAX_LEVEL = 50;
  const clampedLevel = Math.min(Math.max(proficiencyLevel, 1), MAX_LEVEL);

  // Tier penalty: each tier above 1 reduces quality chances
  // Tier 1: full odds, Tier 2: 70% of odds, Tier 3: 45% of odds
  const tierPenalty = Math.pow(0.7, recipeTier - 1);

  // Level scaling: quality chances scale from 0 at level 1 to full at level 50
  // Use a curve that starts slow and accelerates
  const levelFactor = Math.pow((clampedLevel - 1) / (MAX_LEVEL - 1), 1.3);

  // Base max-level Tier 1 chances (from user constraint)
  const baseMasterwork = 0.15;
  const baseRefined = 0.50;

  const masterworkChance = baseMasterwork * levelFactor * tierPenalty;
  const refinedChance = baseRefined * levelFactor * tierPenalty;
  const standardChance = 1 - masterworkChance - refinedChance;

  return { masterworkChance, refinedChance, standardChance };
}
```

### XP Decay Calculation
```typescript
/**
 * Calculate XP decay factor when crafting recipes below proficiency level.
 * No decay within 2 levels of recipe tier-equivalent level.
 * 50% at -5 levels difference, 25% at -10 levels.
 * Minimum 10% (never zero XP).
 */
export function calculateXPDecay(
  proficiencyLevel: number,
  recipeTier: number
): number {
  // Map recipe tier to approximate level equivalent
  // Tier 1 = level 1, Tier 2 = level 10, Tier 3 = level 20
  const tierToLevel: Record<number, number> = { 1: 1, 2: 10, 3: 20, 4: 30, 5: 40 };
  const recipeLevel = tierToLevel[recipeTier] ?? recipeTier * 10;

  const levelDiff = proficiencyLevel - recipeLevel;
  if (levelDiff <= 2) return 1.0; // No decay within 2 levels

  // Exponential decay: 50% at diff=5, 25% at diff=10
  // decay = 2^(-(diff-2)/3)
  const decay = Math.pow(2, -(levelDiff - 2) / 3);
  return Math.max(0.1, decay); // Floor at 10%
}
```

### Recipe Registration Bootstrap
```typescript
// packages/items/src/definitions/recipes.ts
import { registerRecipe, getAllRecipes } from '../../../../apps/game-server/src/game/crafting.service';

// NOTE: recipes.ts should export ALL_RECIPES array.
// Registration happens in game-server module initialization, NOT at import time.
// This avoids circular dependencies between packages.

// In game-server module init:
import { ALL_RECIPES } from '@into-the-void/items';
for (const recipe of ALL_RECIPES) {
  registerRecipe(recipe);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded 'standard' quality | Probability roll based on proficiency | Phase 123 | Core gameplay mechanic |
| No recipe content | ~30 balanced recipes across 3 disciplines | Phase 123 | Crafting system becomes functional |
| Flat XP per craft | Tier-scaled XP with decay | Phase 123 | Prevents low-tier grinding exploit |

## Open Questions

1. **Recipe definition storage location**
   - What we know: `registerRecipe()` lives in `crafting.service.ts` (game-server). Recipe definitions should be in a shared package per RCPE-07.
   - What's unclear: Whether to put recipe definitions in `packages/items/` (alongside item definitions) or create a new `packages/recipes/` package.
   - Recommendation: Put in `packages/items/src/definitions/recipes.ts` — recipes reference item IDs and follow the same pattern. Export `ALL_RECIPES` alongside `ALL_ITEMS`. Move `registerRecipe/getRecipe/getAllRecipes` to a shared location (game-logic or items package) so both client and server can use them.

2. **Quality modifier application to stats**
   - What we know: Quality applies percentage bonuses (Standard=base, Refined=+15%, Masterwork=+30%). Stats are computed from equipment via `ComputedStats`.
   - What's unclear: Where exactly in the stat computation pipeline the quality multiplier is applied.
   - Recommendation: Store `qualityTier` in `InventoryItem.properties`. The stat computation service reads quality and applies the multiplier to base effects. This is a read-time calculation, not stored stat values.

3. **Masterwork nearby broadcast mechanism**
   - What we know: `crafting:nearby` event already exists in ServerEvents. Masterwork should trigger a broadcast to nearby players.
   - What's unclear: Whether this needs a new event type or uses the existing `crafting:nearby`.
   - Recommendation: Reuse `crafting:nearby` with a `qualityTier: 'masterwork'` field. Client renders special notification when quality is masterwork.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `apps/game-server/src/game/crafting.service.ts` — Phase 122 foundation
- Codebase analysis: `packages/shared-types/src/game/crafting.ts` — type definitions
- Codebase analysis: `packages/items/src/definitions/` — all item definitions and registry pattern
- Codebase analysis: `packages/database/src/schema/crafting-proficiency.ts` — persistence schema
- Codebase analysis: `packages/database/src/schema/recipe-unlocks.ts` — unlock persistence
- Codebase analysis: `packages/game-logic/src/gathering/proficiency.ts` — proficiency pattern reference

### Secondary (MEDIUM confidence)
- `lore/world-bible.md` — faction identity (Verdant=bio-tech, Helix=extraction, Nexus=trade/sensor)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries and patterns already exist in codebase
- Architecture: HIGH - Following established patterns (items package, game-logic pure functions)
- Pitfalls: HIGH - Economy balance and quality roll edge cases identified from codebase review
- Content design: MEDIUM - Recipe balance requires careful baseValue cross-referencing

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable — internal project patterns)
