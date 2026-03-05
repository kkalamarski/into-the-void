# Architecture Research

**Domain:** Crafting system integration for existing sci-fi survival MMO (v1.25)
**Researched:** 2026-03-05
**Confidence:** HIGH — derived entirely from direct codebase inspection

---

## Context

This document answers: **how does a crafting system integrate with the existing v1.24 architecture?** Every pattern, boundary, and build-order decision is grounded in what the codebase actually does — not generic crafting theory. The closest analogues are the gathering system (proficiency pattern), automation service (timer pattern), and quest system (event-driven cross-service pattern).

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + Zustand)                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────────┐   │
│  │  CraftingPanel  │  │  craftingStore   │  │  gameStore             │   │
│  │  (panels/)      │  │  (Zustand)       │  │  showCrafting toggle   │   │
│  └────────┬────────┘  └────────┬─────────┘  └────────────────────────┘   │
│           │                    │ socket.on()                              │
│           │ socket.emit()      │ crafting:started / crafting:result       │
├───────────┼────────────────────┼─────────────────────────────────────────┤
│           │          WebSocket (Socket.IO)                                │
├───────────┼────────────────────┼─────────────────────────────────────────┤
│           ↓                    ↑                                          │
│                   GAME SERVER (NestJS)                                    │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │  GameGateway (modified)                                          │     │
│  │  @SubscribeMessage('crafting:start')                             │     │
│  │  @SubscribeMessage('crafting:cancel')                            │     │
│  │  @SubscribeMessage('crafting:panel_request')                     │     │
│  └───────────────────────────┬──────────────────────────────────────┘     │
│                              │ injects                                    │
│  ┌───────────────────────────▼──────────────────────────────────────┐     │
│  │  CraftingService (new)                                           │     │
│  │  - validateRecipe()                                              │     │
│  │  - consumeIngredients() via InventoryService                     │     │
│  │  - activeCrafts: Map<playerId, ActiveCraft>                      │     │
│  │  - setTimeout() for craft completion (gathering pattern)         │     │
│  │  - awardProficiencyXP() (mirrors GatheringService exactly)       │     │
│  │  - rollQualityTier() (influenced by proficiency level)           │     │
│  │  - eventEmitter.emit('item.crafted') for quest tracking          │     │
│  └──────┬────────────────────┬─────────────────────────────────────┘     │
│         │ uses               │ emits                                     │
│  ┌──────▼──────┐  ┌──────────▼──────────────┐  ┌────────────────────┐   │
│  │InventoryService│ │ EventEmitter2           │  │ QuestService       │   │
│  │ (existing)  │  │                         │  │ @OnEvent('item.    │   │
│  └─────────────┘  └─────────────────────────┘  │  crafted') (new)   │   │
│                                                 └────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────┤
│                     SHARED PACKAGES                                        │
│  ┌─────────────────────┐  ┌────────────────────┐  ┌───────────────────┐  │
│  │  packages/recipes   │  │  shared-types/game  │  │  packages/database│  │
│  │  RecipeDefinition   │  │  crafting.ts (new)  │  │  schema/crafting- │  │
│  │  RecipeRegistry     │  │  CraftingCategory   │  │  proficiency.ts   │  │
│  │  (mirrors items/)   │  │  CraftResult        │  │  recipe-unlocks   │  │
│  └─────────────────────┘  └────────────────────┘  └───────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Package / Path |
|-----------|---------------|----------------|
| `RecipeDefinition` + `RecipeRegistry` | Static recipe data, faction restrictions, unlock conditions, craft time | `packages/recipes/` (new package) |
| `CraftingService` | Timer management, ingredient validation, proficiency tracking, quality roll | `apps/game-server/src/game/crafting.service.ts` (new) |
| `GameGateway` (modified) | Route `crafting:*` socket events, inject `CraftingService` | `apps/game-server/src/game/game.gateway.ts` |
| `GameModule` (modified) | Register `CraftingService` as provider | `apps/game-server/src/game/game.module.ts` |
| `crafting.ts` in shared-types | `CraftingCategory`, `CraftResult`, `RecipeSummary`, `CraftingProficiency` types | `packages/shared-types/src/game/crafting.ts` (new) |
| `events.ts` in shared-types (modified) | Add crafting events to `ClientEvents` / `ServerEvents` interfaces | `packages/shared-types/src/network/events.ts` |
| Drizzle schema — `crafting_proficiency` | Per-character JSONB proficiency (matches `gathering_proficiency` exactly) | `packages/database/src/schema/crafting-proficiency.ts` (new) |
| Drizzle schema — `recipe_unlocks` | Per-character unlocked recipe IDs | `packages/database/src/schema/recipe-unlocks.ts` (new) |
| DB queries — `crafting.ts` | Helper functions: get/upsert proficiency, get unlocks, award XP | `packages/database/src/queries/crafting.ts` (new) |
| `craftingStore` (Zustand) | Client-side recipe list, active craft timer state, proficiency display | `apps/web/src/store/craftingStore.ts` (new) |
| `CraftingPanel` (React) | HUD panel: recipe list by category, progress bar, result notification | `apps/web/src/ui/panels/CraftingPanel.tsx` (new) |
| `gameStore` (modified) | Add `showCrafting: boolean` + `toggleCrafting()` | `apps/web/src/store/gameStore.ts` |
| `GameShortcuts` (modified) | Add crafting shortcut button (key `C`) | `apps/web/src/ui/hud/GameShortcuts.tsx` |
| `HUD` (modified) | Handle `C` key to toggle crafting panel | `apps/web/src/ui/hud/HUD.tsx` |
| `GameUI` (modified) | Import `craftingStore` as side effect, conditionally render `CraftingPanel` | `apps/web/src/ui/GameUI.tsx` |
| `QuestService` (modified) | Add `@OnEvent('item.crafted')` handler for `craft` quest objective type | `apps/game-server/src/game/quest.service.ts` |

---

## Recommended Project Structure

New files only. Modified files are noted in the component table above.

```
packages/
├── recipes/                        # New package — mirrors packages/quests pattern exactly
│   ├── src/
│   │   ├── types.ts                # RecipeDefinition, CraftingCategory, UnlockCondition
│   │   ├── registry.ts             # RecipeRegistry singleton (mirrors QuestRegistry)
│   │   ├── definitions/
│   │   │   ├── index.ts            # Barrel re-export
│   │   │   ├── equipment.ts        # Suit, tool, module recipes
│   │   │   ├── consumables.ts      # Stim, medkit, hazard consumable recipes
│   │   │   ├── automation.ts       # Deployable structure recipes
│   │   │   └── reagents.ts         # Intermediate crafting material recipes
│   │   └── index.ts                # Public exports
│   ├── package.json
│   └── tsconfig.json

packages/shared-types/src/game/
└── crafting.ts                     # New — CraftingCategory, CraftResult, RecipeSummary

packages/shared-types/src/network/
└── events.ts                       # Modified — add crafting client/server event types

packages/database/src/schema/
├── crafting-proficiency.ts         # New — JSONB per character (gathering pattern)
└── recipe-unlocks.ts               # New — per-character unlocked recipe IDs

packages/database/src/queries/
└── crafting.ts                     # New — DB query helpers

apps/game-server/src/game/
└── crafting.service.ts             # New — CraftingService implementation

apps/web/src/store/
└── craftingStore.ts                # New — client state + side-effect socket handlers

apps/web/src/ui/panels/
├── CraftingPanel.tsx               # New — HUD panel (draggable, glassmorphism)
└── CraftingPanel.css               # New — panel styles
```

### Structure Rationale

- **`packages/recipes/`** is a new package because recipe definitions are static data needed by the server (for validation) and potentially by the client (for display) without DB round-trips. Items, quests, entities, and NPCs all follow this same package isolation pattern. A new package avoids circular imports between server and shared-types.
- **JSONB for proficiency** matches `gathering_proficiency` exactly: one row per character, all categories in one column. No per-category migrations as the skill tree grows.
- **JSONB or join table for recipe unlocks** — use a join table (`recipe_unlocks`) rather than JSONB because unlock sets can grow to hundreds of entries per character and queries like "which recipes is this character allowed to see?" are set-membership queries that join tables handle more efficiently.
- **`crafting.ts` in shared-types/game/** follows the existing convention: each game domain gets its own types file (`automation.ts`, `proficiency.ts`, `quest.ts`).

---

## Architectural Patterns

### Pattern 1: Service + setTimeout Timer (Gathering Analogue)

The crafting timer mirrors how `GatheringService` manages the timing mini-game lifecycle. Gathering uses `setTimeout` to auto-expire challenges (with a 1-second grace buffer). Crafting uses the same technique for the "craft in progress" state.

**What:** `CraftingService` holds an in-memory `Map<playerId, ActiveCraft>`. When a craft starts, a `setTimeout` is set for the recipe's duration. On fire, the service consumes ingredients, rolls quality, grants proficiency XP, adds the output to inventory, and emits `crafting:result` to the player.

**When to use:** Timers under ~2 minutes where in-memory state is safe. Unlike automation (60s DB-backed ticks), crafting timers are short enough that losing one on server restart is acceptable.

**Trade-offs:** Simple, no tick loop needed. Server restart loses in-progress crafts silently. Acceptable for 5–60s crafting timers.

**Example:**
```typescript
// apps/game-server/src/game/crafting.service.ts
interface ActiveCraft {
  recipeId: string;
  startedAt: number;
  endsAt: number;
  ingredientsConsumed: boolean; // ingredients removed immediately on start
}

private activeCrafts: Map<string, ActiveCraft> = new Map();
private craftingProficiencyCache: Map<string, CraftingProficiencyJson> = new Map();

async startCraft(socketId: string, recipeId: string): Promise<CraftStartResult> {
  const player = this.playerService.getPlayerBySocket(socketId);
  if (!player) return { error: 'Player not found' };
  if (this.activeCrafts.has(player.id)) return { error: 'Already crafting' };

  const recipe = RecipeRegistry.get(recipeId);
  // Validate: level, faction, unlock state, ingredient availability, output slot space
  // Consume ingredients from inventory (fail-fast before timer starts)
  await this.inventoryService.removeItems(player.id, recipe.ingredients);

  const endsAt = Date.now() + recipe.craftTimeMs;
  this.activeCrafts.set(player.id, { recipeId, startedAt: Date.now(), endsAt, ingredientsConsumed: true });

  setTimeout(() => this.completeCraft(player.id), recipe.craftTimeMs);

  return { success: true, endsAt, recipeId };
}

private async completeCraft(playerId: string): Promise<void> {
  const active = this.activeCrafts.get(playerId);
  if (!active) return; // Cancelled or player disconnected
  this.activeCrafts.delete(playerId);

  const quality = this.rollQualityTier(playerId, recipe.category);
  await this.inventoryService.addItem(playerId, recipe.outputItemId, recipe.outputQuantity, { quality });
  await this.awardProficiencyXP(playerId, recipe.category, xp);
  this.eventEmitter.emit('item.crafted', { characterId: playerId, itemId: recipe.outputItemId, quantity: recipe.outputQuantity, recipeId: active.recipeId });
  this.server.to(socketId).emit('crafting:result', { success: true, itemId: recipe.outputItemId, quality });
}
```

### Pattern 2: Definition Registry (Items / Quests Analogue)

Recipes follow the identical pattern used by `ItemRegistry` (packages/items) and `QuestRegistry` (packages/quests): a class with a private `Map<string, RecipeDefinition>`, a fallback for unknown IDs, and a singleton export.

**What:** `RecipeRegistry` is a singleton that holds all recipe definitions in memory. Server imports it to validate craft requests. Both server and client can read recipe data without DB round-trips.

**When to use:** Any static definition data that needs fast ID lookup. This is the project's universal pattern for game content.

**Example:**
```typescript
// packages/recipes/src/types.ts
export type CraftingCategory = 'equipment' | 'consumable' | 'automation' | 'reagent';

export interface RecipeIngredient {
  readonly itemId: string;
  readonly quantity: number;
}

export type UnlockCondition =
  | { readonly type: 'default' }                              // Available at required level
  | { readonly type: 'quest'; readonly questId: string }      // Requires quest completion
  | { readonly type: 'discovery'; readonly poiId: string };   // Requires POI discovery

export interface RecipeDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly outputItemId: string;
  readonly outputQuantity: number;
  readonly ingredients: readonly RecipeIngredient[];
  readonly category: CraftingCategory;
  readonly craftTimeMs: number;
  readonly requiredLevel: number;
  readonly requiredCraftingLevel?: number;  // Per-category proficiency gate
  readonly faction?: 'verdant' | 'helix' | 'nexus';  // undefined = all factions
  readonly unlockCondition?: UnlockCondition;  // undefined = 'default'
}

// packages/recipes/src/registry.ts — mirrors QuestRegistry exactly
class RecipeRegistryImpl {
  private readonly recipes: Map<string, RecipeDefinition> = new Map();
  register(recipe: RecipeDefinition): void { ... }
  registerAll(recipes: readonly RecipeDefinition[]): void { ... }
  get(id: string): RecipeDefinition { ... } // returns UNKNOWN_RECIPE fallback
  has(id: string): boolean { ... }
  getAllIds(): string[] { ... }
  getByCategory(category: CraftingCategory): RecipeDefinition[] { ... }
  getByFaction(faction: string): RecipeDefinition[] { ... }
}
export const RecipeRegistry = new RecipeRegistryImpl();
```

### Pattern 3: EventEmitter2 for Cross-Service Communication (Quest Tracking)

The `QuestService` already listens to `item.collected` and `entity.killed` via `@OnEvent` decorators. Crafting adds `item.crafted` — a new event that `CraftingService` emits on completion, and `QuestService` handles.

**What:** `CraftingService` calls `this.eventEmitter.emit('item.crafted', payload)` on completion. `QuestService` gains `@OnEvent('item.crafted')` that processes craft objectives identically to gather objectives.

**When to use:** Any time a domain event needs to trigger effects in a different service without direct coupling. This is the project's canonical cross-service pattern.

**Example:**
```typescript
// In CraftingService — emit on completion
this.eventEmitter.emit('item.crafted', {
  characterId: player.id,
  itemId: recipe.outputItemId,
  quantity: actualQuantity,
  category: recipe.category,
  recipeId: recipe.id,
} satisfies ItemCraftedPayload);

// In QuestService — new handler
export interface ItemCraftedPayload {
  characterId: string;
  itemId: string;
  quantity: number;
  category: CraftingCategory;
  recipeId: string;
}

@OnEvent('item.crafted')
async handleItemCrafted(payload: ItemCraftedPayload): Promise<void> {
  // Find active quests with 'craft' objectives targeting this itemId or recipeId
  // Increment objective counters, check completion — same logic as handleItemCollected
}
```

### Pattern 4: Zustand Store with Side-Effect Socket Handlers (Automation Analogue)

`craftingStore` registers socket event handlers as module-level side effects, exactly like `automationStore`, `questStore`, and `chatStore`. `GameUI.tsx` imports it to activate the handlers.

**What:** `craftingStore.ts` exports a Zustand store. At module level (outside `create()`), it calls `gameSocket.on('crafting:result', ...)` etc. This is the "side-effect import" pattern the project uses for all feature stores.

**Example:**
```typescript
// apps/web/src/store/craftingStore.ts
import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import type { RecipeSummary, CraftingProficiency } from '@into-the-void/shared-types';

interface CraftingState {
  recipes: RecipeSummary[];
  activeCraft: { recipeId: string; endsAt: number } | null;
  proficiency: CraftingProficiency;
  setRecipes: (r: RecipeSummary[]) => void;
  setActiveCraft: (c: CraftingState['activeCraft']) => void;
  setProficiency: (p: CraftingProficiency) => void;
}

export const useCraftingStore = create<CraftingState>((set) => ({ ... }));

// Side-effect handlers — registered when GameUI imports this module
gameSocket.on('crafting:started', (data) => {
  useCraftingStore.getState().setActiveCraft({ recipeId: data.recipeId, endsAt: data.endsAt });
});
gameSocket.on('crafting:result', () => {
  useCraftingStore.getState().setActiveCraft(null);
});
gameSocket.on('crafting:panel_state', (data) => {
  useCraftingStore.getState().setRecipes(data.recipes);
});
gameSocket.on('crafting:proficiency', (data) => {
  useCraftingStore.getState().setProficiency(data.proficiency);
});
```

---

## Data Flow

### Craft Request Flow (Success Path)

```
[Player clicks "Craft" in CraftingPanel]
        ↓
socket.emit('crafting:start', { recipeId })
        ↓
[GameGateway.handleCraftStart()]
        ↓
[CraftingService.startCraft(socketId, recipeId)]
  ├── PlayerService.getPlayerBySocket()           — identity
  ├── check activeCrafts.has(player.id)           — no concurrent crafts
  ├── RecipeRegistry.get(recipeId)                — static definition
  ├── validate: level >= recipe.requiredLevel     — gate
  ├── validate: faction matches recipe.faction    — gate
  ├── validate: recipe is unlocked for character  — DB: recipe_unlocks
  ├── validate: all ingredients present           — read inventory
  ├── validate: output slot available             — read inventory
  ├── InventoryService.removeItems()              — consume ingredients
  ├── activeCrafts.set(player.id, { ... })        — track state
  └── setTimeout(completeCraft, recipe.craftTimeMs)
        ↓
client.emit('crafting:started', { recipeId, endsAt })
        ↓ (timer fires at endsAt)
[CraftingService.completeCraft(playerId)]
  ├── rollQualityTier(proficiencyLevel)           — standard/enhanced/superior
  ├── InventoryService.addItem(output, quality)   — deliver to inventory
  ├── awardProficiencyXP(category, xp)            — DB update
  ├── eventEmitter.emit('item.crafted', ...)      — quest tracking
  └── server.to(socketId).emit('crafting:result', { success: true, ... })
        ↓
craftingStore.setActiveCraft(null) — clears progress bar
```

### Panel Recipe List Flow

```
[Player opens CraftingPanel (key C)]
        ↓
gameStore.toggleCrafting() → showCrafting: true
        ↓
CraftingPanel.useEffect → socket.emit('crafting:panel_request')
        ↓
[CraftingService.buildRecipeList(characterId)]
  ├── RecipeRegistry.getAllIds()                  — all recipes
  ├── filter: recipe.requiredLevel <= player.level
  ├── filter: recipe.faction matches or is undefined
  ├── DB: recipe_unlocks for characterId         — filter locked recipes
  └── return RecipeSummary[] with unlock status
        ↓
client.emit('crafting:panel_state', { recipes })
        ↓
craftingStore.setRecipes() → CraftingPanel re-renders
```

### Proficiency Unlock Flow

```
[Craft completes successfully]
        ↓
[awardProficiencyXP(playerId, category, xp)]
  ├── read craftingProficiencyCache.get(playerId)
  ├── increment category.xp
  ├── recalculate category.level = calculateLevelFromXP(xp) ← reuses game-logic fn
  ├── DB: UPDATE crafting_proficiency SET proficiency = ... WHERE character_id = ?
  └── craftingProficiencyCache.set(playerId, updated)
        ↓
client.emit('crafting:proficiency', { proficiency })
        ↓
craftingStore.setProficiency() → CraftingPanel shows new level
```

---

## New vs Modified Components

### New (create from scratch)

| Component | Type | Reason |
|-----------|------|--------|
| `packages/recipes/` | Package | Static recipe definitions need their own package (items/quests/entities precedent) |
| `packages/shared-types/src/game/crafting.ts` | Types | Domain types for crafting — `CraftingCategory`, `CraftResult`, `RecipeSummary`, `CraftingProficiency` |
| `packages/database/src/schema/crafting-proficiency.ts` | DB Schema | Per-character JSONB proficiency (gathering_proficiency pattern) |
| `packages/database/src/schema/recipe-unlocks.ts` | DB Schema | Join table: which recipes each character has unlocked |
| `packages/database/src/queries/crafting.ts` | DB Queries | `getCraftingProficiency`, `upsertCraftingProficiency`, `getUnlockedRecipes`, `unlockRecipe` |
| `apps/game-server/src/game/crafting.service.ts` | NestJS Service | Core crafting: timer, validation, proficiency, quality roll |
| `apps/web/src/store/craftingStore.ts` | Zustand Store | Client crafting state + side-effect socket handlers |
| `apps/web/src/ui/panels/CraftingPanel.tsx` | React Component | HUD panel: recipe browser, progress bar, proficiency display |
| `apps/web/src/ui/panels/CraftingPanel.css` | CSS | Glassmorphism panel styles (matches other panels) |

### Modified (extend existing)

| Component | Change | Why |
|-----------|--------|-----|
| `packages/shared-types/src/network/events.ts` | Add `'crafting:start'`, `'crafting:cancel'` to `ClientEventType` + `ClientEvents`; add `'crafting:started'`, `'crafting:result'`, `'crafting:panel_state'`, `'crafting:proficiency'` to `ServerEventType` + `ServerEvents` | Type-safe socket events — always updated first |
| `packages/database/src/schema/index.ts` | Export `craftingProficiency`, `recipeUnlocks` tables | Barrel export |
| `packages/database/src/queries/index.ts` | Export crafting query helpers | Barrel export |
| `apps/game-server/src/game/game.gateway.ts` | Inject `CraftingService`; add `@SubscribeMessage('crafting:start')`, `@SubscribeMessage('crafting:cancel')`, `@SubscribeMessage('crafting:panel_request')`; add `craftingService.cancelActiveCraft(player.id)` in `handleDisconnect()` | Route new events, cleanup on disconnect |
| `apps/game-server/src/game/game.module.ts` | Add `CraftingService` to `providers` and `exports` | NestJS DI registration |
| `apps/game-server/src/game/quest.service.ts` | Add `ItemCraftedPayload` interface; add `@OnEvent('item.crafted')` handler; support `'craft'` as a new `ObjectiveType` | Quest tracking for crafting objectives |
| `packages/quests/src/types.ts` | Add `CraftObjective` with `objectiveType: 'craft'` and `itemId`/`recipeId` | Quest definition extension |
| `packages/database/src/schema/quest-progress.ts` | Add `'craft'` to the `ObjectiveProgressJson.objectiveType` union | DB type consistency |
| `apps/web/src/store/gameStore.ts` | Add `showCrafting: boolean`, `toggleCrafting: () => void` | UI toggle state, follows existing pattern |
| `apps/web/src/ui/hud/GameShortcuts.tsx` | Add `C` shortcut button for crafting panel | HUD entry point |
| `apps/web/src/ui/hud/HUD.tsx` | Handle `C` keydown to call `toggleCrafting` | Keyboard access |
| `apps/web/src/ui/GameUI.tsx` | Import `craftingStore` (side-effect activation), import and conditionally render `<CraftingPanel />` | Panel rendering wiring |

---

## Suggested Build Order

Dependencies flow: shared types → packages/recipes → DB schema → server service → quest integration → client. Each phase is independently testable.

### Phase 1: Shared Foundation

**Deliver:** `packages/shared-types/src/game/crafting.ts`, shared-types `events.ts` modifications, `packages/recipes/` (types + registry), `packages/database/src/schema/crafting-proficiency.ts`, `packages/database/src/schema/recipe-unlocks.ts`, `packages/database/src/queries/crafting.ts`

**Why first:** Everything else imports from here. Type definitions must exist before services or stores are written. DB schema migration must run before service code calls the tables.

**Test gate:** TypeScript compiles cleanly. `RecipeRegistry.get()` returns the fallback for unknown IDs. DB migration runs without error.

### Phase 2: Server CraftingService + Gateway Wiring

**Deliver:** `crafting.service.ts`, modifications to `game.gateway.ts` and `game.module.ts`

**Why second:** Depends on Phase 1 types and DB helpers. Can be integration-tested via WebSocket (wscat / Postman) without any UI.

**Test gate:** `crafting:start` event with valid recipe → `crafting:started` returned → timer fires → `crafting:result` received. Ingredients removed from inventory. Proficiency XP written to DB. Cancel mid-craft returns correct error.

### Phase 3: Quest Integration

**Deliver:** Modify `quest.service.ts` (new handler), modify `packages/quests/src/types.ts` (CraftObjective), modify `quest-progress.ts` schema

**Why third:** Isolated server change. Builds on Phase 2's `item.crafted` event. No client changes needed.

**Test gate:** Accept a test quest with `craft` objective. Complete a craft. Verify `quest:progress` event emitted with incremented counter.

### Phase 4: Recipe Content

**Deliver:** Definition files in `packages/recipes/src/definitions/` (equipment, consumables, automation, reagents)

**Why fourth (alongside Phases 2-3):** Recipe content is decoupled from mechanics. Authoring can proceed in parallel once types are defined. No mechanical changes needed.

**Test gate:** All recipe `outputItemId` values resolve in `ItemRegistry`. All ingredient `itemId` values resolve. Faction-restricted recipes filter correctly by faction. No recipe uses a non-existent item ID.

### Phase 5: Client Store + CraftingPanel

**Deliver:** `craftingStore.ts`, `CraftingPanel.tsx`, `CraftingPanel.css`, modifications to `gameStore.ts`, `GameShortcuts.tsx`, `HUD.tsx`, `GameUI.tsx`

**Why fifth:** Server events are stable and working (Phase 2). Panel wires against a live server.

**Test gate:** Open CraftingPanel with `C` key. Panel requests and renders recipe list. Select a recipe. Trigger craft. Progress bar counts down. Result notification appears. Proficiency level updates.

---

## Integration Points — Existing Systems

### Inventory System

`InventoryService` is the single source of truth for player items. `CraftingService` must use it exclusively — never write the inventory DB table directly.

| Integration | Direction | Required Method |
|-------------|-----------|-----------------|
| Check ingredient availability | CraftingService reads | `getInventory(playerId)` — scan items |
| Consume ingredients | CraftingService → InventoryService | `removeItems(playerId, [{itemId, quantity}])` — bulk atomic removal |
| Deliver output | CraftingService → InventoryService | `addItem(playerId, itemId, quantity, { quality })` |

**Gap:** If `InventoryService` lacks a `removeItems` bulk atomic method, one must be added. The current `inventory:drop` flow removes one item at a time and is not atomic for multi-ingredient removal. Partial consumption on error must be prevented.

### Quest System

Extend the existing `QuestService` event-driven pattern:

| Change | Location | Detail |
|--------|----------|--------|
| New event type `'item.crafted'` | `CraftingService` emits | With `ItemCraftedPayload` (characterId, itemId, quantity, recipeId) |
| New `@OnEvent('item.crafted')` | `QuestService` receives | Increments objectives of type `'craft'` |
| New `ObjectiveType: 'craft'` | `packages/quests/src/types.ts` | `CraftObjective` with `itemId` and optional `recipeId` |
| DB schema | `quest-progress.ts` `ObjectiveProgressJson` | Add `'craft'` to `objectiveType` union |

### Gathering Proficiency System

Crafting proficiency is a deliberate parallel to gathering proficiency. Reuse identically:

| Element | Gathering | Crafting (new) |
|---------|-----------|----------------|
| DB schema | `gathering_proficiency` table | `crafting_proficiency` table (same structure) |
| JSONB shape | `{ mining, herbalism, archaeology }` | `{ equipment, consumable, automation, reagent }` |
| Service cache | `proficiencyCache: Map<characterId, ProficiencyJson>` | `craftingProficiencyCache: Map<characterId, CraftingProficiencyJson>` |
| On player join | `gatheringService.loadProficiency(characterId)` | `craftingService.loadProficiency(characterId)` |
| On disconnect | `gatheringService.unloadProficiency(characterId)` | `craftingService.unloadProficiency(characterId)` |
| XP calculation | `calculateLevelFromXP(xp)` from game-logic | Same function — reuse directly |

The `game-logic` package's `calculateLevelFromXP` must remain generic (not gather-specific). If it currently references `ResourceCategory`, extract a shared version.

### Disconnect Lifecycle

`GameGateway.handleDisconnect()` already calls cleanup for gathering and automation. Crafting must be added:

```typescript
// In handleDisconnect (game.gateway.ts) — add alongside existing cleanup:
if (player) {
  this.combatService.handleDisconnect(player.id);
  this.abilityService.handleDisconnect(player.id);
  this.gatheringService.unloadProficiency(player.id);
  this.hazardService.onPlayerDisconnect(player.id);
  this.automationService.onPlayerDisconnect(player.id);
  this.craftingService.cancelActiveCraft(player.id);  // NEW — clean timer + return items
}
```

`cancelActiveCraft` must: clear the `setTimeout`, remove from `activeCrafts`, return consumed ingredients to inventory, and unload the proficiency cache entry.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side-Only Recipe Validation

**What people do:** Validate ingredient availability and recipe unlock status in the React component and only emit the socket event if checks pass.

**Why it's wrong:** The client is untrusted. Any player can emit `crafting:start` with arbitrary data. Server must always validate level, faction, unlock state, ingredient presence, and output slot availability independently.

**Do this instead:** Client does optimistic UX validation (disable "Craft" button if ingredients are missing in the local inventory view). Server re-validates everything before consuming anything.

### Anti-Pattern 2: Consuming Ingredients After Timer Fires

**What people do:** Hold ingredients in inventory during the craft timer and only consume them on completion.

**Why it's wrong:** The player could sell or use ingredients during the craft window, creating a duplication exploit. Active craft + available ingredients = double-use.

**Do this instead:** Consume ingredients immediately when the craft starts (before `setTimeout`). If validation fails, reject before consuming. On cancel or disconnect, return the consumed ingredients.

### Anti-Pattern 3: Storing Recipe Definitions in the Database

**What people do:** Put recipe data (ingredients, output, craft time) in a DB table to allow live changes without deploys.

**Why it's wrong:** This project uses compile-time definition packages — items, quests, entities, NPCs all live in `packages/`. A DB recipe table creates a second source of truth, breaks the `RecipeRegistry` pattern, and requires migration on every recipe change.

**Do this instead:** Recipe mechanics go in `packages/recipes/src/definitions/`. Unlock state (which character has unlocked which recipe) goes in the DB. These are different concerns.

### Anti-Pattern 4: Skipping Disconnect Cleanup

**What people do:** Leave `activeCrafts` entries alive when a player disconnects.

**Why it's wrong:** The `setTimeout` fires after the player is gone. `completeCraft` tries to add items to a disconnected player's inventory and emit a socket event to a dead socket. In `GatheringService`, `unloadProficiency()` explicitly cleans up active challenges on disconnect. Crafting must do the same.

**Do this instead:** `craftingService.cancelActiveCraft(player.id)` in `GameGateway.handleDisconnect()`. Cancel must return ingredients to inventory (or forfeit them as designed — choose one, document it).

### Anti-Pattern 5: Adding Crafting Events Outside the Typed Event Maps

**What people do:** Add new socket event string literals in handler code without updating `ClientEvents`/`ServerEvents` in shared-types.

**Why it's wrong:** Breaks TypeScript type safety across the entire stack — `gameSocket.emit()` and `gameSocket.on()` calls become untyped.

**Do this instead:** Update `ClientEventType`, `ServerEventType`, `ClientEvents`, and `ServerEvents` in `packages/shared-types/src/network/events.ts` first (Phase 1), then write the handlers. This is how every other feature in this project works.

### Anti-Pattern 6: Per-Request DB Unlock Queries Without Caching

**What people do:** Query `recipe_unlocks` on every `crafting:start` call.

**Why it's wrong:** Under any load, repeated DB queries for what is essentially session-stable data (unlock state doesn't change mid-session) create unnecessary latency.

**Do this instead:** Cache unlock IDs in memory per session (like proficiency cache). Load on player join, invalidate on recipe unlock grant, unload on disconnect.

---

## Scaling Considerations

| Concern | At MVP scale | If scale grows |
|---------|-------------|----------------|
| In-memory `activeCrafts` Map | Fine — 1 entry per active crafter, ~1KB each | Still fine at 10K players |
| DB proficiency writes on craft complete | One write per completion — acceptable | Add flush batching (5-min intervals, automation pattern) |
| Recipe unlock cache | One Map per session — negligible memory | Still fine |
| `crafting:panel_request` DB query | One query per panel open — acceptable | Cache unlock list in-memory per session (prevents per-open DB call) |

Crafting does not need a tick loop. `setTimeout`-based completion is simpler and sufficient.

---

## Sources

All findings from direct codebase inspection (HIGH confidence):

- `apps/game-server/src/game/gathering.service.ts` — proficiency XP, cache pattern, setTimeout for challenges
- `apps/game-server/src/game/automation.service.ts` — in-memory Map with timer state, DB flush pattern
- `apps/game-server/src/game/quest.service.ts` — `@OnEvent` cross-service pattern, `ItemCollectedPayload`
- `apps/game-server/src/game/game.gateway.ts` — service injection pattern, disconnect cleanup sequence
- `apps/game-server/src/game/game.module.ts` — provider/export registration pattern
- `packages/items/src/registry.ts` — singleton registry with fallback pattern
- `packages/quests/src/registry.ts` + `packages/quests/src/types.ts` — new package template
- `packages/shared-types/src/network/events.ts` — typed `ClientEvents`/`ServerEvents` interfaces
- `packages/database/src/schema/gathering-proficiency.ts` — JSONB proficiency schema pattern
- `packages/database/src/schema/quest-progress.ts` — quest state + objective JSONB schema
- `packages/database/src/schema/deployables.ts` — deployable state persistence pattern
- `apps/web/src/store/automationStore.ts` — side-effect socket handler registration pattern
- `apps/web/src/ui/panels/AutomationPanel.tsx` — draggable panel structure
- `apps/web/src/ui/GameUI.tsx` — side-effect import pattern, conditional panel rendering
- `apps/web/src/store/gameStore.ts` — UI toggle state pattern (`showAutomation`, `toggleAutomation`)
- `apps/web/src/ui/hud/GameShortcuts.tsx` — shortcut button structure

---

*Architecture research for: v1.25 Crafting system integration*
*Researched: 2026-03-05*
