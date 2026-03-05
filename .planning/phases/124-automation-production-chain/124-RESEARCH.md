# Phase 124: Automation Production Chain - Research

**Researched:** 2026-03-05
**Domain:** Crafting system extension — new discipline + deployable recipes
**Confidence:** HIGH

## Summary

Phase 124 adds a 4th crafting discipline ("automation") with 4 recipes that produce the existing deployable structure items. The codebase already has the deployable items (`deployable_extractor`, `deployable_survey_beacon`, `deployable_planetary_extractor`, `deployable_refinery`) and the full crafting pipeline (CraftingService, proficiency tracking, quality rolls, XP decay). The work is primarily data authoring (recipe definitions) with small type/schema expansions to accommodate the new discipline.

The key integration points are: (1) `CraftingDiscipline` union type in shared-types must add `'automation'`, (2) `CraftingProficiencyJson` and `CraftingProficiencyData` must add the `automation` track, (3) `DEFAULT_CRAFTING_PROFICIENCY` must include the new discipline, (4) recipe definitions must use processed reagents from Phase 123 as ingredients, and (5) the existing `CraftingService` already auto-registers recipes from `ALL_RECIPES` — no gateway changes needed.

**Primary recommendation:** Extend the type system and proficiency schema first (wave 1), then author recipes and update item descriptions (wave 2). The CraftingService, quality system, and XP decay all work generically over the `CraftingDiscipline` type and require no code changes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Add **'automation' as a 4th crafting discipline** alongside equipment, consumables, and reagents
- Full proficiency track: independent XP, levels, and quality tier rolls — consistent with other disciplines
- **Same XP curve** as other disciplines: `level = floor(sqrt(xp / 100)) + 1`, capped at 50
- Quality tiers on deployables mean **better yield/efficiency**: Refined = +15% resource yield, Masterwork = +30% yield
- Timer range: **30-60s** — longer than equipment (15-30s) to reflect infrastructure investment
  - Extractor ~30s, Beacon ~40s, Planetary Extractor ~50s, Refinery ~60s
- Deployable recipes use **processed reagents** from Phase 123's crafting chains (thermal alloy, circuit matrix, etc.)
- Cost is **2-3x equipment recipe cost** in ingredient value — deployables are major investments
- **Rare/exotic reagents for top tiers**: planetary extractor needs quantum residue, refinery needs anomaly catalyst + nexus core fragment
- **No fuel in recipe** — recipe produces the empty deployable; player fuels separately after placing via automation panel
- Always produces **exactly 1 deployable** per craft — no bonus quantity from proficiency
- Unlock conditions **match existing item level requirements**: extractor=10, beacon=20, planetary=30, refinery=40
- **Character level + proficiency level** dual gate — requires both character level AND automation discipline proficiency
- **Level-only unlock type** — no POI or quest conditions for deployable recipes
- **Available to all factions** — no faction restrictions on deployable recipes; automation is universal infrastructure
- XP per craft **matches item tier**: Extractor (T2) = 25 XP, Beacon (T3) = 50 XP, Planetary Extractor (T4) = 50 XP, Refinery (T5) = 50 XP
- Update existing `deployable_` item descriptions to reflect they are now **craftable via the Automation discipline**

### Claude's Discretion
- Exact ingredient lists per recipe (anchored at 2-3x equipment cost, using processed reagents)
- Exact proficiency level requirement for each recipe's dual gate
- How to integrate the 'automation' discipline into `CraftingDiscipline` type and `CraftingProficiencyJson`
- Default proficiency data update for the new discipline

### Deferred Ideas (OUT OF SCOPE)
- Faction-specific deployable variants (e.g., Helix extractor with different stats) — could be a future specialization phase
- Bonus deployable production at high proficiency — decided against, but could revisit if economy needs it
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-03 | Automation structure recipes exist for deployable extractors, beacons, and refineries | All 4 deployable item IDs verified in codebase; recipe pattern established by Phase 123; processed reagents available as ingredients; CraftingService auto-registers from ALL_RECIPES |
</phase_requirements>

## Standard Stack

### Core (existing — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @into-the-void/shared-types | workspace | CraftingDiscipline, RecipeDefinition, CraftingProficiencyData types | Single source of truth for client/server contracts |
| @into-the-void/items | workspace | Recipe definitions, item definitions, ITEM_IDS/RECIPE_IDS constants | Static data package, auto-registered by CraftingService |
| @into-the-void/database | workspace | CraftingProficiencyJson, DEFAULT_CRAFTING_PROFICIENCY, schema | Database schema and defaults |
| @into-the-void/game-logic | workspace | rollQualityTier, calculateEffectiveXP, getQualityStatMultiplier | Quality and XP mechanics — works generically over disciplines |

### Alternatives Considered
None — this phase extends existing systems with no new library needs.

## Architecture Patterns

### Existing Pattern: Recipe Registration Pipeline
```
RecipeDefinition (shared-types)
  → recipes.ts / faction-recipes.ts (items package, static data)
  → ALL_RECIPES array (items/definitions/index.ts)
  → CraftingService.onModuleInit() auto-registers all recipes
```
New automation recipes follow identical pattern. No gateway changes required.

### Existing Pattern: Discipline Type Extension
```
CraftingDiscipline type (shared-types/game/crafting.ts)
  → CraftingProficiencyData interface (shared-types)
  → CraftingProficiencyJson interface (database/schema)
  → DEFAULT_CRAFTING_PROFICIENCY constant (database/schema)
```
All four must be updated in sync.

### Existing Pattern: Proficiency Level Indexing
```typescript
// CraftingService.startCraft() line 210:
const disciplineData = prof[recipe.discipline];
// This works generically — adding 'automation' to the type + JSON is sufficient
```

### Pattern: Dual Unlock Gate
The CONTEXT.md specifies character level + proficiency level dual gate. The existing `RecipeUnlockCondition` union only supports `level` (character level), `quest`, and `poi`. For the proficiency gate, options:
1. **Add a new union variant** `{ type: 'proficiency'; discipline: CraftingDiscipline; requiredLevel: number }` to `RecipeUnlockCondition` — cleanest, most extensible
2. **Check in CraftingService** without modifying the type — simpler but ad-hoc

**Recommendation:** Option 1 — add `proficiency` variant. This keeps unlock logic consistent with the discriminated union pattern and allows the client to show proficiency requirements in the recipe browser. The `checkUnlockCondition` method already switches on `condition.type`.

### Anti-Patterns to Avoid
- **Do not create separate automation-recipes.ts** — place recipes in a dedicated file but follow the same export pattern (export array, import into `recipes.ts` or create `automation-recipes.ts` that follows `faction-recipes.ts` pattern, either way merging into `ALL_RECIPES`)
- **Do not modify CraftingService core logic** — the service already handles any discipline generically via `prof[recipe.discipline]`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quality tier rolls | Custom probability system | Existing `rollQualityTier()` | Already handles level scaling and tier penalty |
| XP decay | Custom XP curves | Existing `calculateEffectiveXP()` | Already handles tier-vs-level decay |
| Recipe registration | Manual Map population | Existing `ALL_RECIPES` + `CraftingService.onModuleInit()` | Auto-registers everything in the array |
| Proficiency persistence | Custom DB queries | Existing `loadProficiency()` / `awardProficiencyXP()` | Handles cache + DB sync |

## Common Pitfalls

### Pitfall 1: CraftingProficiencyJson Shape Mismatch
**What goes wrong:** Adding `automation` to the TypeScript type but not to `DEFAULT_CRAFTING_PROFICIENCY` causes runtime errors for new characters.
**Why it happens:** The default is used when creating a new proficiency row.
**How to avoid:** Update `DEFAULT_CRAFTING_PROFICIENCY` in the same file as `CraftingProficiencyJson`.
**Warning signs:** `undefined` when accessing `prof['automation']` in CraftingService.

### Pitfall 2: Existing Characters Missing Automation Track
**What goes wrong:** Characters created before Phase 124 have proficiency JSON without `automation` key. `prof['automation']` returns `undefined`, crashes `calculateAdjustedDuration`.
**Why it happens:** JSONB was persisted before the schema changed.
**How to avoid:** Add a migration or backfill step. The simplest approach: update `loadProficiency()` to merge defaults for missing disciplines. This is a defensive pattern — if `prof.automation` is undefined, assign `{ xp: 0, level: 1 }`.
**Warning signs:** TypeError on `.level` of undefined in production.

### Pitfall 3: Timer Range Mismatch
**What goes wrong:** Recipe `craftTimeMs` outside the documented 5000-30000ms range for Phase 122's crafting system.
**Why it happens:** CONTEXT.md specifies 30-60s for automation recipes, which exceeds the original 30s max.
**How to avoid:** The `calculateAdjustedDuration` has a `Math.max(1000, ...)` floor but no ceiling check. The RecipeDefinition `craftTimeMs` doc says "5000-30000" but this is a comment, not a runtime constraint. Automation recipes at 30000-60000ms will work correctly.
**Warning signs:** None — this works, just document the expanded range.

### Pitfall 4: Deploy Effect Item ID Mismatch
**What goes wrong:** Crafted deployable has `outputItemId: 'deployable_extractor'` but automation panel expects a different ID.
**Why it happens:** Item IDs drift between systems.
**How to avoid:** The item IDs are already correct — `DEPLOYABLE_TYPE_TO_ITEM` in automation.service.ts maps `extractor` to `deployable_extractor`, which matches the item definition. Just verify `outputItemId` in each recipe matches the existing item ID exactly.
**Warning signs:** Deploy action fails with "item not found" after crafting.

### Pitfall 5: Quality on Deployables — Stat Multiplier Mismatch
**What goes wrong:** Quality tier gives stat% bonuses (via `getQualityStatMultiplier`) but CONTEXT.md says quality means yield/efficiency bonuses for deployables.
**Why it happens:** The generic quality system was designed for equipment stats, not automation yield.
**How to avoid:** The quality tier is stored as a property on the inventory slot (`qualityTier: 'refined'`). The automation service can read this property when deploying and apply yield bonuses. Currently `getQualityStatMultiplier` returns 1.15/1.30 — these same values can be used for yield. No changes to the quality system needed; the interpretation happens at deploy time in AutomationService. This phase only needs to store the quality tier correctly — yield application is out of scope (it's an AutomationService concern for when the structure is deployed, not a crafting concern).

## Code Examples

### Current CraftingDiscipline Type (must be extended)
```typescript
// packages/shared-types/src/game/crafting.ts line 6
export type CraftingDiscipline = 'equipment' | 'consumables' | 'reagents';
// → Change to:
export type CraftingDiscipline = 'equipment' | 'consumables' | 'reagents' | 'automation';
```

### Current Proficiency Data (must be extended)
```typescript
// packages/shared-types/src/game/crafting.ts lines 51-55
export interface CraftingProficiencyData {
  equipment: { xp: number; level: number };
  consumables: { xp: number; level: number };
  reagents: { xp: number; level: number };
}
// → Add: automation: { xp: number; level: number };
```

### Current DB Default (must be extended)
```typescript
// packages/database/src/schema/crafting-proficiency.ts lines 19-23
export const DEFAULT_CRAFTING_PROFICIENCY: CraftingProficiencyJson = {
  equipment: { xp: 0, level: 1 },
  consumables: { xp: 0, level: 1 },
  reagents: { xp: 0, level: 1 },
};
// → Add: automation: { xp: 0, level: 1 },
```

### Recipe Pattern (automation recipes follow this exactly)
```typescript
const RECIPE_DEPLOYABLE_EXTRACTOR: RecipeDefinition = {
  id: 'recipe_deployable_extractor',
  displayName: 'Fabricate Portable Extractor',
  description: '...',
  discipline: 'automation',
  ingredients: [
    { itemId: 'processed_thermal_alloy', quantity: 2 },
    { itemId: 'processed_circuit_matrix', quantity: 1 },
  ],
  outputItemId: 'deployable_extractor',
  craftTimeMs: 30000,
  unlockConditions: [
    { type: 'level', requiredLevel: 10 },
    // New: proficiency unlock
    { type: 'proficiency', discipline: 'automation', requiredLevel: 3 },
  ],
  proficiencyXP: 25,
  tier: 2,
};
```

### Defensive Proficiency Loading (handles pre-124 characters)
```typescript
async loadProficiency(characterId: string): Promise<CraftingProficiencyJson> {
  // ... existing logic ...
  // After loading from DB, merge defaults for any missing disciplines
  const merged = { ...DEFAULT_CRAFTING_PROFICIENCY, ...row.proficiency };
  this.proficiencyCache.set(characterId, merged);
  return merged;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual recipe registration | Auto-registration via `ALL_RECIPES` | Phase 123 | New recipes just need to be in the array |
| 3 disciplines (equipment, consumables, reagents) | 4 disciplines (+ automation) | Phase 124 (this phase) | Type expansion, proficiency schema update |
| Character-level-only unlock | Dual gate (character level + proficiency level) | Phase 124 (this phase) | New RecipeUnlockCondition variant |

## Open Questions

1. **Proficiency dual gate: new unlock type vs. CraftingService-specific check?**
   - Recommendation: New `proficiency` variant in `RecipeUnlockCondition` union for consistency
   - Impact: shared-types change, CraftingService `checkUnlockCondition` switch case, client recipe browser display
   - Risk: LOW — discriminated union is extensible by design

2. **Existing character backfill for automation proficiency track?**
   - Recommendation: Defensive merge in `loadProficiency()` rather than DB migration
   - Impact: No migration needed, handles any future discipline additions too
   - Risk: LOW — spreads defaults over missing keys

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `packages/shared-types/src/game/crafting.ts` — CraftingDiscipline, RecipeDefinition types
- Codebase inspection: `packages/database/src/schema/crafting-proficiency.ts` — CraftingProficiencyJson, DEFAULT
- Codebase inspection: `apps/game-server/src/game/crafting.service.ts` — recipe registration, proficiency logic
- Codebase inspection: `packages/items/src/definitions/deployable-items.ts` — 4 deployable item definitions
- Codebase inspection: `packages/items/src/definitions/recipes.ts` — Phase 123 recipe pattern
- Codebase inspection: `packages/items/src/definitions/processed-reagents.ts` — available processed reagents
- Codebase inspection: `packages/items/src/definitions/reagents.ts` — quantum_residue, anomaly_catalyst, nexus_core_fragment
- Codebase inspection: `apps/game-server/src/game/automation.service.ts` — DEPLOYABLE_TYPE_TO_ITEM mapping
- Codebase inspection: `packages/game-logic/src/crafting/quality.ts` — quality tier system

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing packages, no new dependencies
- Architecture: HIGH — extending established patterns with one new unlock type
- Pitfalls: HIGH — identified from direct codebase inspection
- Recipe design: MEDIUM — ingredient costs are Claude's discretion, anchored at 2-3x equipment

**Research date:** 2026-03-05
**Valid until:** Indefinite (internal codebase, no external dependencies)
