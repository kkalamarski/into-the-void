# Stack Research

**Domain:** Manual crafting system — recipe definitions, per-category proficiency, quality tiers, crafting timers, recipe unlock progression, faction-gating (v1.25)
**Researched:** 2026-03-05
**Confidence:** HIGH (codebase directly inspected; all versions confirmed from installed package.json and pnpm-lock.yaml; patterns matched against 3 existing analogous systems: gathering, automation, quests)

---

## Context: What the Codebase Already Has

This is subsequent-milestone research for v1.25. No framework decisions to make — the stack is settled. The question is: which existing extension points accept the crafting features, and where are the gaps requiring new files or schema?

**Installed versions confirmed from `package.json` and lockfile:**
- TypeScript: ^5.4.0 (5.9.3 at runtime)
- Drizzle ORM: ^0.30.0 (0.30.10 locked)
- NestJS: ^10.3.0
- Zustand: ^4.5.0 with `immer` middleware (^11.1.4)
- Vitest: ^4.0.18
- React: ^18.2.0
- `@dnd-kit/core`: ^6.3.1 (already installed — used for action bar drag-and-drop)

**Three directly analogous systems to model from:**

| System | Recipe Model | Proficiency | Timer | Progression Gate | DB Pattern |
|--------|-------------|------------|-------|-----------------|------------|
| Gathering | N/A | JSONB column per character, 3-category `{xp, level}` map | `setTimeout` expiry on server | Tool level gates node access | `gathering_proficiency` table |
| Automation | Config objects in `shared-types` | N/A | `setInterval` 60s tick | `requiredLevel` field on config | `deployables` table with `properties: jsonb` |
| Quests | `QuestDefinition` in `packages/quests` | N/A | N/A | `faction?`, `prerequisiteQuestIds?`, `minLevel?` | `quest_progress` table, UNIQUE (characterId, questId) |

Crafting combines patterns from all three: quest-style definition objects, gathering-style per-category proficiency JSONB, automation-style server-side timer, and quest-style unlock gating.

**Gaps found (no new framework, only new files and one new table):**

1. No `packages/recipes` package exists yet — needed for `RecipeDefinition` objects, `RecipeRegistry`, and definitions (parallel to `packages/quests` and `packages/items`)
2. No `crafting_proficiency` DB table — needed for per-character, per-category crafting skill (parallel to `gathering_proficiency`)
3. No `crafting_progress` DB table — needed to persist in-progress crafts across server restarts (same concern that caused the `quest_progress` UNIQUE constraint pattern)
4. `ClientEvents` in `shared-types/network/events.ts` needs new `crafting:*` event types
5. `ServerEvents` in `shared-types/network/events.ts` needs new `crafting:*` response event types
6. `apps/game-server/src/game/` needs a new `crafting.service.ts` — registered in `game.module.ts`
7. `apps/web/src/store/` needs `craftingStore.ts` (parallel to `automationStore.ts`, `questStore.ts`)
8. `apps/web/src/ui/panels/` needs `CraftingPanel.tsx` + `CraftingPanel.css`
9. `apps/web/src/ui/hud/` needs a crafting shortcut button in `GameShortcuts.tsx`
10. `gameStore.ts` needs `craftingPanelOpen: boolean` and `toggleCrafting` (parallel to `questLogOpen`, `automationPanelOpen`)

---

## Recommended Stack

### Core Technologies

All already installed. Zero new runtime dependencies required for the crafting system.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | 5.4+ | `RecipeDefinition`, `CraftingProficiency`, `QualityTier` types; discriminated unions for recipe categories | Discriminated unions already used across all packages; `satisfies RecipeDefinition` pattern at definition-author time catches errors before runtime |
| NestJS | 10.3.x | `CraftingService` injectable — handles recipe validation, timer, proficiency XP award, quality roll | 20 services already in `apps/game-server/src/game/`; `CraftingService` slots in identically; registers in `game.module.ts` |
| Drizzle ORM | 0.30.10 | Two new tables: `crafting_proficiency` (JSONB, mirrors `gathering_proficiency`) and `crafting_progress` (timer persistence) | JSONB pattern for proficiency is already proven at this scale; `crafting_progress` follows `quest_progress` pattern with UNIQUE constraint |
| Zustand + immer | 4.5.0 + 11.1.4 | `craftingStore.ts` — recipe list, active craft progress, proficiency data | `immer` middleware already used in `inventoryStore.ts`; use it for mutable-style updates to active craft state |
| React 18 | 18.2.0 | `CraftingPanel.tsx` — recipe browser, ingredient list, quality display, progress bar | All existing panels are React with plain CSS; no exceptions; consistent with HUD architecture |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@dnd-kit/core` + `@dnd-kit/sortable` | 6.3.1 + 10.0.0 | Drag ingredients from inventory into recipe slots (if recipe requires manual slot assignment) | Already installed for action bar; use only if the crafting UI needs drag-from-inventory-to-recipe-slot interaction; if recipes auto-consume from inventory, skip DnD entirely |
| `@floating-ui/react` | 0.27.18 | Recipe ingredient tooltips (show where to obtain missing ingredients) | Already installed; used for tooltips elsewhere; use `useFloating` for ingredient hover-tooltips in the recipe browser |
| `@nestjs/event-emitter` | 3.0.1 | Broadcast `crafting.completed` event for quest objective tracking (gather/craft objectives) | Already wires `resource.gathered` from `GatheringService` to `QuestService`; use same `EventEmitter2.emit()` pattern for `item.crafted` event |
| Vitest | 4.0.18 | Unit tests for quality calculation formula, proficiency XP curve, recipe validation | `packages/game-logic` test suite already exists; add `crafting/quality.test.ts` and `crafting/proficiency.test.ts` |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `satisfies RecipeDefinition` | Validate recipe shape at definition-author time in `packages/recipes/src/definitions/` | Same pattern as item definitions in `packages/items`; compile errors surface when a definition is malformed |
| `nx affected --target=test` | Run only tests for changed packages | After touching `packages/recipes` or `packages/game-logic`, run `nx affected` to confirm no regressions in dependent packages |
| `pnpm db:generate` + `pnpm db:migrate` | Generate and run Drizzle migrations for the two new tables | Pattern already established; new tables follow `pgTable()` + `$inferSelect` convention |

---

## New Package: `packages/recipes`

Create this package following the exact `packages/quests` structure:

```
packages/recipes/
  package.json          # name: @into-the-void/recipes
  src/
    index.ts            # re-exports types, registry, definitions
    types.ts            # RecipeDefinition, RecipeCategory, QualityTier, RecipeIngredient
    registry.ts         # RecipeRegistry singleton (mirrors ItemRegistry / QuestRegistry)
    definitions/
      equipment.ts      # Suits, tools, modules
      consumables.ts    # Healing vials, boosters
      reagents.ts       # Refined materials, fuel cells
      structures.ts     # Deployable automation items
      faction/
        verdant.ts      # Verdant-specific higher-tier recipes
        helix.ts        # Helix-specific higher-tier recipes
        nexus.ts        # Nexus-specific higher-tier recipes
```

**`RecipeDefinition` type (goes in `packages/recipes/src/types.ts`):**

```typescript
export type RecipeCategory =
  | 'equipment'    // suits, tools, modules
  | 'consumable'   // healing vials, boosters
  | 'reagent'      // refined materials, fuel cells
  | 'structure';   // deployable automation items

export type QualityTier = 'standard' | 'refined' | 'superior' | 'masterwork';

export interface RecipeIngredient {
  readonly itemId: string;
  readonly quantity: number;
}

export interface RecipeDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly category: RecipeCategory;
  /** Output item ID from packages/items */
  readonly outputItemId: string;
  readonly outputQuantity: number;
  readonly ingredients: readonly RecipeIngredient[];
  /** Crafting duration in milliseconds (5_000 – 30_000 range) */
  readonly craftTimeMs: number;
  /** Minimum crafting proficiency level in this category to attempt */
  readonly requiredProficiencyLevel: number;
  /** Minimum character level to unlock */
  readonly requiredLevel?: number;
  /** If set, only this faction's players can craft this recipe */
  readonly factionGate?: FactionId;
  /** Quest ID that must be completed to unlock this recipe */
  readonly questUnlock?: string;
  /** If set, recipe is found by exploring this biome (discovery unlock) */
  readonly explorationUnlock?: string;
  /** Base quality ranges per tier: proficiency thresholds that unlock higher tiers */
  readonly qualityThresholds?: {
    refined: number;    // proficiency level for 'refined' to become possible
    superior: number;   // proficiency level for 'superior' to become possible
    masterwork: number; // proficiency level for 'masterwork' to become possible
  };
}
```

**`RecipeRegistry` (mirrors `ItemRegistry` in `packages/items/src/registry.ts`):**

```typescript
class RecipeRegistryImpl {
  private readonly recipes: Map<string, RecipeDefinition> = new Map();
  register(recipe: RecipeDefinition): void { ... }
  registerAll(recipes: readonly RecipeDefinition[]): void { ... }
  get(id: string): RecipeDefinition | undefined { ... }
  getByCategory(category: RecipeCategory): RecipeDefinition[] { ... }
  getForFaction(factionId: FactionId | 'neutral'): RecipeDefinition[] { ... } // returns universal + faction-specific
}
export const RecipeRegistry = new RecipeRegistryImpl();
```

---

## New DB Tables

### `crafting_proficiency` Table

Mirrors `gathering_proficiency` exactly. One row per character, JSONB for all categories.

```typescript
// packages/database/src/schema/crafting-proficiency.ts

export interface CraftingProficiencyJson {
  equipment:  { xp: number; level: number };
  consumable: { xp: number; level: number };
  reagent:    { xp: number; level: number };
  structure:  { xp: number; level: number };
}

export const DEFAULT_CRAFTING_PROFICIENCY: CraftingProficiencyJson = {
  equipment:  { xp: 0, level: 1 },
  consumable: { xp: 0, level: 1 },
  reagent:    { xp: 0, level: 1 },
  structure:  { xp: 0, level: 1 },
};

export const craftingProficiency = pgTable('crafting_proficiency', {
  id:           uuid('id').primaryKey().defaultRandom(),
  characterId:  uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }).unique(),
  proficiency:  jsonb('proficiency').$type<CraftingProficiencyJson>().notNull().default(DEFAULT_CRAFTING_PROFICIENCY),
  unlockedRecipeIds: jsonb('unlocked_recipe_ids').$type<string[]>().notNull().default([]),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Why `unlockedRecipeIds` on this table rather than a separate table:** Recipe unlocks are character-scoped data queried together with proficiency on every craft attempt. Storing as JSONB on the same row avoids a JOIN on the hot path. At the scale of hundreds of unlocked recipes per character, a JSONB array query is fast. If query complexity grows (filtering by category, sorting by unlock order), migrate to a dedicated `recipe_unlocks` table — that is a v1.26+ concern.

### `crafting_progress` Table

Persists in-progress crafts across server restarts. Follows `quest_progress` pattern.

```typescript
// packages/database/src/schema/crafting-progress.ts

export const craftingProgress = pgTable('crafting_progress', {
  id:            uuid('id').primaryKey().defaultRandom(),
  characterId:   uuid('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  recipeId:      varchar('recipe_id', { length: 100 }).notNull(),
  startedAt:     timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completesAt:   timestamp('completes_at', { withTimezone: true }).notNull(),
  ingredientsConsumed: boolean('ingredients_consumed').notNull().default(false),
  status:        varchar('status', { length: 20 }).notNull().default('in_progress'), // 'in_progress' | 'completed' | 'cancelled'
}, (table) => ({
  // A character can only have one craft in progress at a time
  uniqueCharacterCraft: unique('unique_character_craft').on(table.characterId),
}));
```

**Why a dedicated `crafting_progress` table rather than `properties: jsonb` on characters:** Active craft state has a well-defined row lifecycle (insert on start, delete on complete/cancel), a timestamp that needs querying on server restart, and a UNIQUE constraint. These needs fit a proper table better than a side-car JSONB blob.

---

## New Game Logic: `packages/game-logic/src/crafting/`

All crafting math lives here as pure functions. No NestJS dependencies, fully unit-testable.

```
packages/game-logic/src/crafting/
  quality.ts       # calculateQualityTier(), qualityToOutputMultiplier()
  proficiency.ts   # calculateCraftingLevelFromXP() — reuse gathering XP curve
  validation.ts    # validateRecipeIngredients(), canCraft()
```

**Quality calculation (in `packages/game-logic/src/crafting/quality.ts`):**

```typescript
/**
 * Calculate output quality tier based on proficiency level and dice roll.
 *
 * Roll mechanic: proficiency level sets the probability of higher tiers.
 * At level 1: 100% standard.
 * At threshold level for 'refined': 50% standard, 50% refined.
 * Each 5 levels above threshold adds ~10% chance of the higher tier.
 *
 * This is pure math — no RNG dependency needed in callee; caller passes a [0,1) random.
 */
export function calculateQualityTier(
  proficiencyLevel: number,
  thresholds: { refined: number; superior: number; masterwork: number },
  random: number // [0, 1) — caller provides for testability
): QualityTier {
  // Implementation: compare random against tier probability brackets
  // ...
}

/**
 * Output quantity multiplier per quality tier.
 * Standard: 1.0, Refined: 1.1, Superior: 1.25, Masterwork: 1.5
 */
export function qualityToOutputMultiplier(tier: QualityTier): number {
  const multipliers: Record<QualityTier, number> = {
    standard:   1.0,
    refined:    1.1,
    superior:   1.25,
    masterwork: 1.5,
  };
  return multipliers[tier];
}
```

**Why pure random injection:** `CraftingService` calls `calculateQualityTier(level, thresholds, Math.random())`. Tests call `calculateQualityTier(level, thresholds, 0.0)` or `(level, thresholds, 0.99)` to assert boundary behavior deterministically. This is the standard approach for testable randomness — no mocking library needed.

**XP curve:** Reuse `calculateLevelFromXP()` from `packages/game-logic/src/gathering/proficiency.ts` directly. The crafting level formula is identical (level 1→2 = 100 XP, each subsequent level +50 more). Do NOT duplicate the function — import it. If crafting needs a different curve later, add a `craftingLevelFromXP()` variant then.

---

## `CraftingService` (Server)

New file: `apps/game-server/src/game/crafting.service.ts`

**Responsibilities:**
1. Load crafting proficiency on player join (from DB, then cache in `Map<characterId, CraftingProficiencyJson>`)
2. Handle `crafting:start` event — validate ingredients, validate unlock, consume ingredients, insert `crafting_progress` row, start `setTimeout`
3. Handle `crafting:cancel` event — restore ingredients if `ingredientsConsumed = true`, delete `crafting_progress` row
4. On `setTimeout` fire — roll quality tier, award output items, award proficiency XP, delete `crafting_progress` row, emit `crafting:completed` to client
5. On server restart — query `crafting_progress` table for any in-progress crafts, reschedule `setTimeout` for remaining `completesAt - Date.now()` ms

**Timer pattern — use `setTimeout`, not `setInterval`:**

```typescript
// Same pattern as gathering.service.ts challenge timeout
private startCraftTimer(characterId: string, recipeId: string, remainingMs: number): void {
  const timer = setTimeout(async () => {
    await this.completeCraft(characterId, recipeId);
  }, remainingMs);
  this.activeTimers.set(characterId, timer);
}
```

One active craft per character at a time (enforced by UNIQUE constraint on `crafting_progress.characterId`). The `activeTimers: Map<string, ReturnType<typeof setTimeout>>` in-memory map mirrors the `activeChallenges` pattern in `GatheringService`.

**Faction crafting modifier:** `factions` table already has `bonuses.craftingModifier` (e.g., Nexus: 1.2x). Apply it as a multiplier to `craftTimeMs`:

```typescript
const adjustedTime = Math.round(recipe.craftTimeMs / player.faction.bonuses.craftingModifier);
```

Nexus players craft 20% faster than base. Verdant 10% faster. Helix at base speed. The data is already seeded.

**Quest integration:** After `completeCraft()` succeeds, emit `EventEmitter2.emit('item.crafted', { characterId, itemId, quantity })`. `QuestService` already subscribes to `resource.gathered` events — add a listener for `item.crafted` to support "craft X items" quest objectives (future-proofing even if v1.25 doesn't add such quests).

---

## `craftingStore.ts` (Client)

New file: `apps/web/src/store/craftingStore.ts`

Pattern: mirrors `automationStore.ts` (socket event wiring) and `inventoryStore.ts` (immer middleware for nested state updates).

```typescript
interface CraftingState {
  // Static data (loaded once on login from server)
  availableRecipes: RecipeDefinition[];
  proficiency: CraftingProficiencyJson | null;
  unlockedRecipeIds: string[];

  // Active craft progress (updated via socket events)
  activeCraft: {
    recipeId: string;
    startedAt: number;
    completesAt: number;
  } | null;

  // UI state
  selectedCategory: RecipeCategory;
  selectedRecipeId: string | null;
  panelOpen: boolean;

  // Actions
  setRecipes: (recipes: RecipeDefinition[], proficiency: CraftingProficiencyJson, unlockedIds: string[]) => void;
  setActiveCraft: (craft: CraftingState['activeCraft']) => void;
  clearActiveCraft: () => void;
  setSelectedCategory: (cat: RecipeCategory) => void;
  setSelectedRecipe: (id: string | null) => void;
}
```

Socket event wiring at module bottom (same side-effect import pattern as `automationStore.ts`):

```typescript
gameSocket.on('crafting:state', (data) => {
  useCraftingStore.getState().setRecipes(data.recipes, data.proficiency, data.unlockedRecipeIds);
});
gameSocket.on('crafting:started', (data) => {
  useCraftingStore.getState().setActiveCraft(data);
});
gameSocket.on('crafting:completed', () => {
  useCraftingStore.getState().clearActiveCraft();
  // inventory:update arrives separately via existing channel
});
gameSocket.on('crafting:cancelled', () => {
  useCraftingStore.getState().clearActiveCraft();
});
```

---

## `CraftingPanel.tsx` (Client UI)

New file: `apps/web/src/ui/panels/CraftingPanel.tsx`

**Structure:** Mirrors `QuestLogPanel.tsx` (tabbed by category) and `AutomationPanel.tsx` (draggable, `useDraggablePanel` hook).

Layout (plain CSS Grid):
- Left column: category tabs (Equipment / Consumables / Reagents / Structures)
- Center column: recipe list with search/filter, ingredient preview
- Right column: selected recipe detail — ingredient checklist (green/red per availability), quality range at current proficiency, craft button, active progress bar

**Progress bar:** Client-side countdown. On `crafting:started` event, `completesAt` timestamp arrives. The panel renders `(completesAt - Date.now()) / totalCraftTime` as a CSS width percentage, updating via `requestAnimationFrame` or a `useInterval` hook. No server polling — the server manages truth, the client just counts down.

**No new drag-and-drop:** Recipes auto-consume ingredients from inventory on `crafting:start`. The existing `@dnd-kit` is available but not needed unless a future feature requires manual slot-filling. Auto-consume is simpler and matches the gathering model.

**Keyboard disable pattern:** Same as `QuestLogPanel.tsx` — disable Phaser keyboard on mount, re-enable on unmount.

---

## Socket Events to Add

Add to `ClientEventType` and `ServerEventType` unions in `packages/shared-types/src/network/events.ts`:

```typescript
// ClientEventType additions
| 'crafting:start'      // { recipeId: string }
| 'crafting:cancel'     // {}
| 'crafting:request_state'  // {} — fetch current state on panel open

// ServerEventType additions
| 'crafting:state'      // full state on login and panel request
| 'crafting:started'    // { recipeId, startedAt, completesAt }
| 'crafting:completed'  // { recipeId, outputItemId, quantity, qualityTier, proficiencyXP, proficiencyLevel }
| 'crafting:cancelled'  // { recipeId }
| 'crafting:error'      // { code: string; message: string }
| 'crafting:recipe_unlocked'  // { recipeId } — sent when a quest/exploration unlock fires
```

Add to `ClientEvents` and `ServerEvents` interface maps with typed payloads.

---

## Installation

No new npm packages. All work is new files within the existing monorepo.

```bash
# Zero new npm installs.

# New files to create:
# packages/recipes/                          (new NX lib package)
# packages/game-logic/src/crafting/          (pure function modules)
# packages/database/src/schema/crafting-proficiency.ts
# packages/database/src/schema/crafting-progress.ts
# apps/game-server/src/game/crafting.service.ts
# apps/web/src/store/craftingStore.ts
# apps/web/src/ui/panels/CraftingPanel.tsx
# apps/web/src/ui/panels/CraftingPanel.css

# Migrations:
pnpm db:generate   # generates migration for crafting_proficiency + crafting_progress tables
pnpm db:migrate    # runs migration against local PostgreSQL

# Registrations:
# apps/game-server/src/game/game.module.ts   (add CraftingService to providers)
# packages/database/src/schema/index.ts      (export new schema tables)
# apps/web/src/ui/hud/GameShortcuts.tsx      (add crafting shortcut button)
# apps/web/src/store/gameStore.ts            (add craftingPanelOpen + toggleCrafting)
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `packages/recipes` as new NX lib | Inline recipe definitions in `packages/items` | Items are for item definitions, not production rules; mixing them creates a circular dependency risk when game-logic imports both; separate package is the established pattern (quests, entities, npcs all separate) |
| JSONB `unlockedRecipeIds` on `crafting_proficiency` row | Separate `recipe_unlocks` join table | Use the join table when you need SQL queries like "all characters who unlocked recipe X" (for analytics or server-side events); at v1.25 scope, per-character unlock reads are the only use case — JSONB array suffices |
| Single in-progress craft per character | Queue of up to N concurrent crafts | Queue is significantly more complex (ordered processing, separate cancel semantics per slot); the gathering system similarly allows only one active challenge; start with one and expand in a later milestone if demand justifies it |
| `setTimeout` per craft with DB persistence | `setInterval` batch processor | `setInterval` batch is appropriate when many items complete on roughly the same schedule (automation's 60s tick); crafts have individual completion times ranging 5–30s; per-craft `setTimeout` with DB-backed resume is correct and matches the gathering challenge pattern |
| Pure function quality roll with injected `Math.random()` | `crypto.randomUUID()` or server-side RNG module | The quality roll is not a security-sensitive random (it's a gameplay UX value); testable pure function with injected random is simpler and fully covered by deterministic unit tests without mocking |
| Client-side countdown from `completesAt` timestamp | Server polling for progress | Polling wastes bandwidth and adds server load; `completesAt` is a stable timestamp; client counts down locally; server is the authority on actual completion (fires the result event) |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@nestjs/schedule` `@Interval()` / `@Cron()` decorators | Not installed; `setTimeout`/`setInterval` is the established project pattern for all tick-based work (AI, buffs, hazards, automation); adding a dependency for decorator syntax is not warranted | `setTimeout` in `CraftingService`, same pattern as `GatheringService` challenge expiry |
| BullMQ or Redis queues for crafting jobs | Not needed at this scale; crafting is per-character (one active job), not a shared distributed queue; ioredis is installed only for session management | `setTimeout` per craft with DB-backed resume on server restart |
| Separate `recipe_unlocks` table at v1.25 | Premature normalization; JSONB array on `crafting_proficiency` is readable and fast for per-character reads | `unlockedRecipeIds: jsonb` on `crafting_proficiency` row |
| Storing recipe definitions in PostgreSQL | Recipe data is static code, not dynamic player data; DB storage adds schema complexity and requires a migration for every new recipe; 100+ recipes load fine from code registry at startup | `RecipeRegistry` singleton in `packages/recipes`, mirroring `ItemRegistry` and `QuestRegistry` |
| Phaser scene for crafting UI | All HUD panels are React + CSS; mixing Phaser and React for UI is an established anti-pattern in this codebase (CLAUDE.md: "The UI is divided in two parts — game canvas and HUD"); React panels already handle all non-game-canvas interactions | React `CraftingPanel.tsx` registered in `GameUI.tsx`, same as all other panels |
| `Math.random()` called inside the quality pure function | Makes the function non-deterministic and therefore untestable without mocking | Pass `random: number` parameter — caller provides `Math.random()` in production, `0.0` or `0.99` in tests |

---

## Stack Patterns by Variant

**If a recipe requires a crafting station (future milestone scope):**
- Add `requiredStationId?: string` to `RecipeDefinition`
- `CraftingService.validateRecipe()` checks player proximity to the station entity
- Station entities are `DeployableEntity` instances — already in the entity system
- Do NOT add this for v1.25; all recipes are craftable anywhere per PROJECT.md scope

**If crafting proficiency needs separate XP curves per category:**
- Add a `category` parameter to the level calculation function
- Keep gathering and crafting on the same curve by default (levels feel comparable across skills)
- Only diverge curves if playtesting shows one category progresses trivially fast

**If recipe unlocks need to fire on quest completion (cross-system integration):**
- Add an `onQuestCompleted(questId: string, characterId: string)` method to `CraftingService`
- `QuestService` calls it after awarding quest rewards
- `CraftingService` checks all recipes with `questUnlock === questId`, adds to `unlockedRecipeIds`, emits `crafting:recipe_unlocked` event to client

**If faction-gated recipes need a grace period (player changed faction — hypothetical):**
- Faction-gated recipes are checked at craft-start, not at unlock time
- A player who changes faction loses access to faction recipes immediately
- Faction switching is out of scope per PROJECT.md; no defensive coding needed

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| drizzle-orm@0.30.10 | JSONB array columns (`$type<string[]>`) | JSONB array pattern already used in `deployables.accumulatedResources`; no upgrade needed |
| drizzle-orm@0.30.10 | `unique()` constraint helper in table definition | Already used in `quest_progress` table for UNIQUE (characterId, questId); identical pattern for UNIQUE(characterId) on `crafting_progress` |
| @nestjs/event-emitter@3.0.1 | NestJS 10.3.x | Already installed and working; `CraftingService` uses `eventEmitter.emit('item.crafted', ...)` same as `GatheringService` uses `resource.gathered` |
| zustand@4.5.0 + immer@11.1.4 | React 18.2.0 | Already working in `inventoryStore.ts`; `craftingStore.ts` uses same immer middleware pattern |

---

## Key Integration Facts for Roadmap Authors

1. **`packages/recipes` is a prerequisite for everything.** `CraftingService`, `CraftingPanel`, and `craftingStore` all import from it. Create the package and register it in the NX workspace before writing service or UI code.

2. **Two DB migrations land in a single phase.** `crafting_proficiency` and `crafting_progress` are always needed together (service loads proficiency on join, progress on restart). Create both tables in one migration file.

3. **Proficiency load pattern is identical to gathering.** `CraftingService.loadProficiency(characterId)` queries `crafting_proficiency`, caches in `Map<characterId, CraftingProficiencyJson>`, unloads on disconnect. Copy `GatheringService.loadProficiency()` as the template — the read-modify-write XP update pattern is already proven.

4. **Faction bonus is already in the DB.** `factions.bonuses.craftingModifier` is seeded: Nexus=1.2, Verdant=1.1, Helix=1.0, neutral=1.0. `CraftingService` reads it from `PlayerService.getPlayerById(characterId).faction` — no new DB query needed.

5. **Quality tier output is a multiplier on item quantity, not a separate item ID.** The output item stays the same ID; quantity scales by `qualityToOutputMultiplier(tier)`. This avoids needing separate "refined sword" vs "standard sword" item IDs and the associated inventory complexity.

6. **`crafting:state` event on panel open mirrors `automation:panel_request`.** Client emits `crafting:request_state`, server responds with `crafting:state` containing available recipes, current proficiency, unlocked IDs, and any active in-progress craft. This lazy-load approach avoids sending crafting data to clients who never open the panel.

7. **Crafting panel is a draggable React panel, not a Phaser scene.** Register it in `GameUI.tsx` behind `gameStore.craftingPanelOpen`, add a shortcut button in `GameShortcuts.tsx`. Follow the identical mount/unmount keyboard-disable pattern from `QuestLogPanel.tsx`.

---

## Sources

- Codebase direct inspection: `packages/database/src/schema/gathering-proficiency.ts`, `packages/database/src/schema/quest-progress.ts`, `packages/database/src/schema/deployables.ts`, `packages/database/src/schema/factions.ts`, `packages/database/src/schema/characters.ts`, `packages/game-logic/src/gathering/proficiency.ts`, `apps/game-server/src/game/gathering.service.ts`, `apps/game-server/src/game/automation.service.ts`, `packages/items/src/types.ts`, `packages/items/src/registry.ts`, `packages/quests/src/types.ts`, `packages/quests/src/registry.ts`, `packages/shared-types/src/network/events.ts`, `packages/shared-types/src/game/faction.ts`, `packages/shared-types/src/core/player.ts`, `apps/web/src/store/automationStore.ts`, `apps/web/src/store/inventoryStore.ts`, `apps/web/src/ui/panels/AutomationPanel.tsx`, `apps/web/src/ui/panels/QuestLogPanel.tsx` — HIGH confidence
- Installed version verification: `package.json` root + pnpm-lock.yaml: drizzle-orm@0.30.10, zustand@4.5.0, immer@11.1.4, @dnd-kit/core@6.3.1, @nestjs/event-emitter@3.0.1 — HIGH confidence
- `.planning/PROJECT.md` — v1.25 milestone scope (crafting panel, proficiency, quality tiers, faction gating, recipe unlock progression) — HIGH confidence
- `.planning/research/STACK.md` (v1.24) — confirms automation pattern (setInterval, in-memory + DB persistence, no BullMQ, no @nestjs/schedule) — HIGH confidence
- `lore/world-bible.md` — faction identities and crafting modifier design intent; confirms factions: verdant/helix/nexus/neutral — HIGH confidence (authoritative per CLAUDE.md)

---

*Stack research for: crafting system — recipe definitions, per-category proficiency, quality tier calculation, crafting timer/progress, recipe unlock progression, faction-specific recipe gating (v1.25)*
*Researched: 2026-03-05*
