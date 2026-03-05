# Project Research Summary

**Project:** Into the Void — v1.25 Manual Crafting System
**Domain:** MMO crafting system integration (recipe definitions, proficiency, quality tiers, unlock progression, faction gating)
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

The v1.25 crafting system is a well-scoped addition to an existing, stable game architecture. All framework and tooling decisions are fixed — the stack is TypeScript, NestJS, Drizzle ORM, Zustand, and React 18, all already installed and in use. No new runtime dependencies are required. The implementation path is to mirror three established codebase patterns: the gathering system (per-category proficiency JSONB, server-side timer with `setTimeout`), the quest system (definition registry package, cross-service EventEmitter2 events, unlock storage), and the automation system (Zustand store with side-effect socket handlers, draggable React panel). The primary structural deliverable is a new `packages/recipes` NX package following the `packages/quests` pattern exactly.

The recommended approach is a five-phase build: shared foundation first (types, schema, `RecipeRegistry`), then the server `CraftingService`, then quest integration, then recipe content authoring, and finally the client panel. This order is dictated by dependencies — the server service cannot compile without types, the client store cannot wire without server events, and recipe definitions cannot be authored without both the registry and `ItemRegistry` existing. Quality tiers and faction gating are straightforward given the existing `FactionBonuses.craftingModifier` field already seeded in the database and the `calculateLevelFromXP()` function already in `packages/game-logic`.

The key risks are not technical complexity but implementation discipline: ingredient consumption must be atomic (single in-memory write, not two sequential DB writes), server-side validation must mirror every client-side guard, recipe unlocks must be persisted from day one, and crafted item economy balance must be checked against existing trader prices and loot drop rates before recipe definitions are written. All ten identified pitfalls have clear prevention patterns drawn directly from existing codebase precedents. None requires novel architecture.

## Key Findings

### Recommended Stack

Zero new dependencies are needed. The crafting system slots into the existing stack by creating new files and one new `packages/recipes` package. The two new Drizzle tables (`crafting_proficiency` and `recipe_unlocks`) require a single migration run via `pnpm db:generate && pnpm db:migrate`. The `CraftingService` registers as a standard NestJS injectable in `game.module.ts`, alongside the 20 existing services.

**See:** `.planning/research/STACK.md`

**Core technologies:**
- `packages/recipes` (new NX lib): Static `RecipeDefinition` objects, `RecipeRegistry` singleton — mirrors `packages/quests` exactly; prerequisite for all other crafting code
- `NestJS CraftingService`: Timer management, ingredient validation, proficiency XP, quality roll — slots into `game.module.ts` alongside existing services
- `Drizzle ORM` (two new tables): `crafting_proficiency` (JSONB per character, mirrors `gathering_proficiency`) and `recipe_unlocks` (join table, append-only, source of truth for unlock persistence)
- `Zustand + immer` (`craftingStore.ts`): Client recipe list, active craft timer, proficiency state — mirrors `automationStore.ts` side-effect socket pattern
- `React 18` (`CraftingPanel.tsx`): Draggable HUD panel with category tabs, ingredient checklist, progress bar — mirrors `AutomationPanel.tsx` and `QuestLogPanel.tsx`

### Expected Features

**See:** `.planning/research/FEATURES-CRAFTING.md`

**Must have (table stakes):**
- Recipe browser panel accessible from HUD anywhere — players expect this in any crafting game
- Ingredient requirement display with craftable/uncraftable visual distinction (green/red per availability)
- Craft button with crafting timer and progress bar — short timers (2-10s), not instant, not a waiting-room system
- Inventory integration — ingredients consumed on craft start, output delivered on completion, `INSUFFICIENT_RESOURCES` error if missing
- Recipe output preview — item icon, name, rarity, quantity shown before committing
- Category filtering — tabs for Equipment / Consumables / Reagents / Structures

**Should have (competitive differentiators):**
- Per-category crafting proficiency — 4 disciplines mirroring gathering proficiency, level gates quality tier outcome
- Quality tiers (Standard / Refined / Masterwork) — outcome influenced by proficiency level, per-recipe thresholds, stat modifier not separate item IDs
- Progression-unlocked recipes — level-gated, quest-reward, exploration-discovered, faction-gated vectors; multiple unlock paths prevent single bottleneck
- Faction specialty recipes — Verdant biotech, Helix heavy armor, Nexus tech modules; `requiredFaction` on `RecipeDefinition`
- Full production chain scope — equipment, consumables, deployable structures, reagents all craftable

**Defer (v2+):**
- Batch crafting (inflation risk; design space needs economy data first)
- Crafting orders / commission system (requires player-to-player economy infrastructure)
- Recipe research / random invention (high complexity, uncertain payoff)
- Crafting station spatial requirements (conflicts with hub-accessible design in v1.25)
- Recipe search/text filter (needed only when recipe count exceeds ~30; add post-validation)

**Anti-features to never implement:**
- Crafting failure chance — use quality tiers for outcome variation instead
- Unlimited recipe visibility from the start — show locked recipes as silhouettes with hint text
- Crafting skill XP from junk recipes — award XP proportional to item tier, not volume

### Architecture Approach

The crafting system integrates entirely through established extension points. `GameGateway` gains three new `@SubscribeMessage` handlers. `CraftingService` injects `InventoryService`, `PlayerService`, and `EventEmitter2`. `QuestService` gains an `@OnEvent('item.crafted')` handler. The client pattern is identical to automation: `craftingStore.ts` registers socket event handlers as module-level side effects, `GameUI.tsx` imports the store to activate them, and `CraftingPanel` is rendered conditionally behind `gameStore.showCrafting`. Keyboard shortcut `C` toggles the panel via `GameShortcuts.tsx` and `HUD.tsx`.

**See:** `.planning/research/ARCHITECTURE.md`

**Major components:**
1. `packages/recipes/` — `RecipeDefinition`, `RecipeRegistry`, definition files; new NX package; prerequisite for all other crafting components
2. `packages/shared-types/src/game/crafting.ts` — `CraftingCategory`, `CraftResult`, `RecipeSummary`, `CraftingProficiency` types; must exist before server or client code compiles
3. `packages/database/src/schema/crafting-proficiency.ts` + `recipe-unlocks.ts` — DB schema; must be migrated before `CraftingService` runs
4. `apps/game-server/src/game/crafting.service.ts` — timer via `setTimeout`, ingredient validation, proficiency cache, quality roll, `item.crafted` event emission
5. `apps/web/src/store/craftingStore.ts` + `apps/web/src/ui/panels/CraftingPanel.tsx` — client state and HUD panel

**Key patterns:**
- `setTimeout` per craft (not `setInterval`) — same as gathering challenge expiry; individual completion times (5-30s) make per-craft timers correct
- Ingredients consumed on craft start (not on completion) — prevents duplication exploit where player uses ingredients during timer window
- Server-side `activeCrafts: Map<string, ActiveCraft>` — mirrors `activeChallenges` in `GatheringService`; enforces one craft per character; source of truth for timer validation
- EventEmitter2 cross-service event — `CraftingService` emits `item.crafted`; `QuestService` subscribes via `@OnEvent`; no direct coupling

### Critical Pitfalls

**See:** `.planning/research/PITFALLS-CRAFTING.md`

1. **Non-atomic ingredient consumption** — Calling `removeItems()` then `addItem()` as two separate operations creates partial-failure exposure (player loses materials with no output, or receives output for free). Prevention: implement crafting as a single in-memory mutation — read inventory, validate ingredients, compute final state (ingredients removed, output added), write in one `updateInventoryFull()` call. Address in Phase 1 before any recipe definitions exist.

2. **Crafting timer tracked client-side only** — Client sends `crafting:complete` event; server awards output without validating when crafting started; modified clients skip timers. Prevention: server records `startedAt: Date.now()` in `activeCrafts` Map on `crafting:start`; validates `elapsed >= craftTimeMs - LATENCY_TOLERANCE` on completion. Mirror `GatheringService` exactly. Address in Phase 1.

3. **Recipe unlocks not persisted** — In-memory `Map<characterId, Set<recipeId>>` evaporates on server restart; players lose one-time quest-unlocked recipes permanently. Prevention: `recipe_unlocks` table (append-only, never delete rows) is the source of truth; in-memory Set is a cache loaded on player join. Must exist before any unlock logic is written. Address in Phase 1 schema.

4. **Faction recipe bypass via socket injection** — UI filter hides faction recipes from wrong-faction players, but server handler does not validate `player.factionId` against `recipe.requiredFaction`; modified clients craft faction-exclusive items. Prevention: `if (recipe.requiredFaction && recipe.requiredFaction !== player.factionId) reject` as first check in `craftItem()`. 3-line guard. Address in Phase 1.

5. **Crafted items invalidate trader/loot economy** — Recipe material costs set without reference to existing trader prices or loot drop rates; crafting becomes strictly dominant over buying or looting. Prevention: for every craftable item, compare (crafting material effort) vs (trader buy price) vs (expected loot time) before writing the recipe definition. Crafting cost should land at 80-120% of cheapest alternative. Address in Phase 2 with a balance comparison before recipe files are written.

6. **Quality tier progression too fast or too slow** — Copying gathering XP curve applies a gentle yield-quantity effect to quality tier unlocks — a qualitatively different power jump that either shortcuts gear progression or makes crafting feel pointless. Prevention: define `qualityThresholds` per recipe (which proficiency level enables Refined/Masterwork output for that specific recipe). Address in Phase 2.

7. **Recipe definitions reference unknown item IDs** — `ItemRegistry.get()` returns `UNKNOWN_ITEM` silently; typos in ingredient/output IDs produce "Unknown Item" crafted items. Prevention: add `validateRecipeDefinitions()` startup check in `CraftingService.onModuleInit()` that calls `ItemRegistry.has()` on every ingredient and output ID; throw on unknown IDs. Write as a test that fails the build. Address in Phase 2.

## Implications for Roadmap

Based on the research dependency graph and pitfall-to-phase mapping, a five-phase structure is recommended.

### Phase 1: Shared Foundation and CraftingService Core

**Rationale:** Everything else in the system imports from this phase. TypeScript types must exist before services compile. DB schema must be migrated before services query tables. Server-side validation guards (atomic inventory, timer tracking, faction check, unlock persistence) must be built into the service foundation before recipe content is authored — retrofitting these into an already-running service is error-prone.

**Delivers:**
- `packages/shared-types/src/game/crafting.ts` — `CraftingCategory`, `CraftResult`, `RecipeSummary`, `CraftingProficiency`
- `packages/shared-types/src/network/events.ts` — all `crafting:*` `ClientEvents` and `ServerEvents` additions
- `packages/recipes/` — `RecipeDefinition` type, `RecipeRegistry` singleton, empty definition barrel (definitions added in Phase 2-3)
- `packages/database/src/schema/crafting-proficiency.ts` — JSONB proficiency table
- `packages/database/src/schema/recipe-unlocks.ts` — unlock persistence join table (append-only)
- `packages/database/src/queries/crafting.ts` — DB helper functions
- DB migration (single file for both new tables)
- `apps/game-server/src/game/crafting.service.ts` — full service with: atomic inventory mutation, server-side `activeCrafts` Map with timing validation, faction guard, proficiency load/cache/unload lifecycle, quality roll with injected random, `item.crafted` event emission
- `game.gateway.ts` modifications — three new `@SubscribeMessage` handlers, `cancelActiveCraft` in `handleDisconnect`
- `game.module.ts` modification — `CraftingService` registered as provider

**Avoids:** Non-atomic consumption, timer skip exploit, recipe unlocks not persisted, faction bypass, XP race condition (one-active-craft enforcement), proficiency schema collision with gathering

**Test gate:** TypeScript compiles. DB migration runs. `crafting:start` with valid ingredients returns `crafting:started`. Timer fires and returns `crafting:result`. Faction guard rejects wrong-faction attempt. `crafting:complete` sent immediately after `crafting:start` is rejected. Server restart + player reconnect restores recipe unlocks from DB.

### Phase 2: Recipe Content and Quality System

**Rationale:** Service mechanics from Phase 1 are stable. Recipe definitions and the quality threshold system are authored together because quality thresholds are per-recipe fields — they cannot be balanced in isolation from the recipe definitions themselves. Economy balance comparison happens here, before recipe files are committed.

**Delivers:**
- Economy balance review for each craftable item (material cost vs. trader price vs. loot drop rate) — must complete before recipe files are written
- Per-recipe `qualityThresholds` field authored into every `RecipeDefinition`
- Definition files: `equipment.ts`, `consumables.ts`, `reagents.ts`, faction-specific definitions in `faction/`
- Startup validation test (`crafting-recipe-validation.test.ts`) — fails build if any ingredient/output item ID not in `ItemRegistry`
- `packages/game-logic/src/crafting/quality.ts` — `calculateQualityTier()` with injected random, `qualityToOutputMultiplier()`
- `packages/game-logic/src/crafting/proficiency.ts` — reuses `calculateLevelFromXP()` from gathering, no duplication
- `packages/game-logic/src/crafting/validation.ts` — `validateRecipeIngredients()`, `canCraft()` pure functions
- Unit tests for quality calculation and proficiency XP curve

**Avoids:** Economy invalidation, quality tier progression miscalibration, unknown item ID references

**Test gate:** Recipe validation test passes with zero unknown item IDs. Level 1 crafter with an epic recipe produces Standard quality output. Level 15 crafter produces quality tier as per recipe threshold. All craftable items sit within 80-120% of cheapest alternative acquisition path.

### Phase 3: Automation Production Chain

**Rationale:** Separated from Phase 2 because automation crafting requires cross-system validation against `DEPLOYABLE_TYPE_TO_ITEM` in `AutomationService`. Recipe outputs must be the same item IDs already in the deployable mapping — not new item IDs. This validation is specific enough to warrant its own phase with its own test gate.

**Delivers:**
- `packages/recipes/src/definitions/automation.ts` — deployable structure recipes
- Validation that all deployable recipe output IDs are present in `DEPLOYABLE_TYPE_TO_ITEM`
- Integration test confirming a crafted deployable item can be deployed via automation panel without errors
- Any new deployable item definitions in `packages/items` (if new tiers needed), paired with `DEPLOYABLE_TYPE_TO_ITEM` update in the same changeset

**Avoids:** Automation deployable item ID mismatch (crafted deployable outputs an item ID not in the automation mapping)

**Test gate:** All deployable recipe output IDs resolve in `DEPLOYABLE_TYPE_TO_ITEM`. Crafted `deployable_extractor` can be placed via `AutomationService` without error.

### Phase 4: Quest Integration

**Rationale:** An isolated server-side change that builds on the `item.crafted` event from Phase 1. No client changes needed. Separated because it touches the quest system — a stable system that should not be modified speculatively while earlier crafting phases are still in flux.

**Delivers:**
- `packages/quests/src/types.ts` — `CraftObjective` with `objectiveType: 'craft'` and `itemId`/`recipeId` fields
- `packages/database/src/schema/quest-progress.ts` — add `'craft'` to `ObjectiveProgressJson.objectiveType` union
- `apps/game-server/src/game/quest.service.ts` — `@OnEvent('item.crafted')` handler, `ItemCraftedPayload` interface
- Quest reward extension: `QuestRewards.recipeIds?: string[]` — enables quest-reward recipe unlocks
- `QuestService.grantRewards()` modification — calls `craftingService.unlockRecipe()` for reward recipe IDs

**Test gate:** Accept a test quest with `craft` objective. Complete a craft. Verify `quest:progress` event emitted with incremented counter. Complete a quest with `recipeIds` reward. Verify recipe appears unlocked after server restart.

### Phase 5: Client Store and CraftingPanel

**Rationale:** Server events are stable and fully typed (Phase 1). The client panel wires against a live server. All socket event names and payload shapes are already in `shared-types/events.ts` — no guessing or mock-typing required.

**Delivers:**
- `apps/web/src/store/craftingStore.ts` — Zustand store with immer middleware, socket event side-effects for all `crafting:*` server events
- `apps/web/src/ui/panels/CraftingPanel.tsx` — draggable panel, category tabs (Equipment / Consumables / Reagents / Structures), recipe list with craftable/locked states, ingredient checklist (green/red per inventory), quality range display at current proficiency, craft button, progress bar (client-side countdown from `completesAt` timestamp)
- `apps/web/src/ui/panels/CraftingPanel.css` — glassmorphism styles matching existing panels
- `apps/web/src/store/gameStore.ts` — add `showCrafting: boolean`, `toggleCrafting()`
- `apps/web/src/ui/hud/GameShortcuts.tsx` — crafting shortcut button (key `C`)
- `apps/web/src/ui/hud/HUD.tsx` — `C` keydown handler
- `apps/web/src/ui/GameUI.tsx` — import `craftingStore` (side-effect activation), conditional `<CraftingPanel />`
- Keyboard disable pattern on panel mount (same as `QuestLogPanel.tsx`)

**Test gate:** `C` key opens panel. Panel requests and renders recipe list on open. Selecting a recipe shows ingredients with availability indicators. Triggering a craft shows progress bar counting down. Craft result shows proficiency XP feedback toast. Panel closes cleanly and re-enables Phaser keyboard.

### Phase Ordering Rationale

- Phase 1 is mandatory first: `RecipeRegistry`, shared types, and DB schema are compile-time and runtime prerequisites for every downstream component. Skipping or deferring any part of Phase 1 causes cascading compilation failures.
- Automation crafting (Phase 3) is separated from main recipe content (Phase 2) because it requires cross-system validation against `AutomationService` that is independent of the rest of the recipe balancing work.
- Quest integration (Phase 4) is server-only and touches a stable system. Keeping it isolated after Phase 3 means the quest system modification is a clean, focused changeset that can be reviewed and reverted independently.
- The client panel (Phase 5) is last because it should wire against a working server, not a stubbed one. The panel UX (loading states, error overlays, combat gate messaging) requires knowing exactly what events the server sends — which is only certain once Phase 1 is complete.
- Recipe content authoring (Phases 2-3) can begin as soon as Phase 1 type definitions exist. Definition files are pure TypeScript data objects; they do not require a running server. Content authoring can proceed in parallel with late Phase 1 server work if capacity allows.

### Research Flags

Phases with standard patterns (skip research-phase — well-documented within codebase):
- **Phase 1:** Fully documented by analogues in `GatheringService`, `QuestRegistry`, `gathering-proficiency` schema, `automationStore`. No external research needed.
- **Phase 4:** Quest system extension is a straightforward `@OnEvent` addition. Pattern is already used for `item.collected` and `entity.killed`.
- **Phase 5:** Client panel follows `AutomationPanel.tsx` and `QuestLogPanel.tsx` templates exactly.

Phases that benefit from a design pass before execution (not external research, but internal design decisions):
- **Phase 2 (economy balance):** Recipe material costs require a structured comparison against existing trader prices and loot drop rates before recipe definitions are written. Deliverable: a balance spreadsheet or inline comments in recipe files documenting the acquisition-cost comparison for each item.
- **Phase 2 (quality thresholds):** The per-recipe quality threshold values (which proficiency level enables Refined/Masterwork output for each recipe category) require calibration decisions grounded in expected character progression. Recommend establishing tier tables before authoring recipe definitions.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions confirmed from installed `package.json` and `pnpm-lock.yaml`; all patterns verified by direct codebase inspection of 3 analogous systems |
| Features | HIGH (core UI/UX), MEDIUM (quality tier calibration numbers) | Table stakes features grounded in established MMO conventions; quality tier threshold values are design decisions, not research findings |
| Architecture | HIGH | Derived entirely from direct codebase inspection; every component has a named analogue in the existing codebase; no speculative patterns |
| Pitfalls | HIGH | 10 of 10 pitfalls grounded in direct codebase analysis of specific files and line numbers; secondary sources from MMO crafting post-mortems align with codebase observations |

**Overall confidence:** HIGH

### Gaps to Address

- **Recipe unlock storage pattern inconsistency:** STACK.md recommends JSONB `unlockedRecipeIds` on `crafting_proficiency`; ARCHITECTURE.md and PITFALLS.md recommend a separate `recipe_unlocks` join table. These are mutually exclusive schema decisions. The join table is the stronger choice (append-only audit trail, server-restart durability, accurate source of truth). Resolve explicitly at the start of Phase 1 before writing any schema files. Recommendation: use the join table.

- **Quality tier model inconsistency:** FEATURES.md specifies Standard +0% / Refined +15% / Masterwork +30% as stat modifiers. STACK.md specifies quantity multipliers (1.0 / 1.1 / 1.25 / 1.5) with four named tiers. These differ in both tier count and modifier type. Resolve during Phase 2 design pass — choose one model and apply consistently across all recipe definitions and game-logic functions.

- **`InventoryService.removeItems()` bulk atomic method:** ARCHITECTURE.md flags that `InventoryService` may lack a bulk atomic removal method; the current `inventory:drop` flow removes one item at a time and is not atomic for multi-ingredient removal. If this method does not exist, it must be added before `CraftingService.startCraft()` can be implemented safely. Verify at the start of Phase 1; add as the first task if missing.

- **Combat gate behavior on panel open:** PITFALLS.md recommends showing "Cannot craft while in combat" overlay on panel open. This requires `CombatService.isInCombat()` to be accessible from `CraftingService`. Confirm the check exists and add to Phase 1 `CraftingService` validation sequence.

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `apps/game-server/src/game/gathering.service.ts`, `automation.service.ts`, `quest.service.ts`, `game.gateway.ts`, `game.module.ts`, `inventory.service.ts` — timer, proficiency, event, and inventory patterns
- Direct codebase inspection — `packages/items/src/registry.ts`, `packages/quests/src/registry.ts`, `packages/quests/src/types.ts` — registry and definition package patterns
- Direct codebase inspection — `packages/database/src/schema/gathering-proficiency.ts`, `quest-progress.ts`, `deployables.ts` — DB schema patterns
- Direct codebase inspection — `packages/shared-types/src/network/events.ts`, `shared-types/game/faction.ts` — typed event maps, faction bonus fields
- Direct codebase inspection — `apps/web/src/store/automationStore.ts`, `inventoryStore.ts`, `gameStore.ts` — Zustand store patterns
- Direct codebase inspection — `apps/web/src/ui/panels/AutomationPanel.tsx`, `QuestLogPanel.tsx`, `GameUI.tsx` — panel rendering patterns
- `.planning/PROJECT.md` — v1.25 milestone scope definition
- `lore/world-bible.md` — faction identities, crafting modifier design intent (authoritative per CLAUDE.md)

### Secondary (MEDIUM confidence)

- [Designing an MMORPG: Crafting Systems — MMOGames.com](https://www.mmogames.com/gamearticles/designing-an-mmorpg-crafting-systems/) — table stakes features validation
- [FFXIV Crafting — Final Fantasy XIV Online Wiki](https://ffxiv.consolegameswiki.com/wiki/Crafting) — quality tier patterns
- [Quality System — RimWorld Wiki](https://rimworldwiki.com/wiki/Quality) — quality tier proficiency reference
- [How we unbroke our crafting system — Game Developer (Crashlands post-mortem)](https://www.gamedeveloper.com/design/how-we-unbroke-our-crafting-system) — recipe overwhelm and unlock progression anti-patterns
- [Virtual Economic Theory: How MMOs Really Work — Game Developer](https://www.gamedeveloper.com/business/virtual-economic-theory-how-mmos-really-work) — crafted vs looted economy balance
- [MMO Architecture: Source of truth, Dataflows — PRDeving](https://prdeving.wordpress.com/2023/09/29/mmo-architecture-source-of-truth-dataflows-i-o-bottlenecks-and-how-to-solve-them/) — server-side validation principles

### Tertiary (LOW confidence)

- Various MMO crafting design forum threads (GameDev.net, MMORPG.com, Pantheon Forums, Ashes of Creation Forums) — community consensus on anti-features (failure chance, batch crafting, junk-recipe XP grinding)
- [Crafting quality and progression — Ashes of Creation Forums](https://forums.ashesofcreation.com/discussion/65342/crafting-quality-rating-and-its-usefulness) — quality tier proficiency design discussion

---
*Research completed: 2026-03-05*
*Ready for roadmap: yes*
