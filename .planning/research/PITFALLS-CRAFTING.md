# Pitfalls Research

**Domain:** MMO crafting system — adding manual crafting to an existing sci-fi survival MMO with established item/inventory system (v1.25)
**Researched:** 2026-03-05
**Confidence:** HIGH (direct codebase analysis of InventoryService, GatheringService, AutomationService, ItemRegistry, and database schema; supplemented by MMO crafting design research and game economy literature)

---

## Critical Pitfalls

### Pitfall 1: Ingredient Consumption Not Atomic — Crafting Can Consume Inputs Without Producing Output

**What goes wrong:**
The crafting service reads the player's inventory, validates all ingredients are present, removes the ingredients, then adds the output item. If the `addItem()` call fails (inventory full, server restart between steps, exception in item registration), the ingredients are already gone but the output was never created. The player loses materials permanently with no output. The inverse is equally dangerous: if an exception is thrown after the output is created but before ingredients are removed, the player receives the crafted item for free.

**Why it happens:**
The current `InventoryService.addItem()` and inventory mutation pattern in `apps/game-server/src/game/inventory.service.ts` operates on a mutable in-memory `Map<string, Inventory>`. Mutations happen synchronously on the in-memory object, then are flushed to the database asynchronously. There is no transaction wrapping the ingredient-removal + output-addition sequence. A crafting implementation that naively calls `removeIngredients()` then `addItem()` without wrapping both in an atomic unit will have partial-failure exposure on every craft.

**How to avoid:**
Implement crafting as a single atomic mutation function: `craftItem(playerId, recipeId)` that performs all inventory reads and writes as one in-memory operation on the cached `Inventory` object, then writes the final state to the database in a single `updateInventoryFull()` call. Never split ingredient removal and output addition across two database operations. The in-memory pattern already exists — use it: read inventory, validate ingredients, compute final state (ingredients removed, output added), write the computed state in one pass. If any step fails before the write, the in-memory state is unchanged and nothing was persisted.

**Warning signs:**
- Crafting implementation calls `removeItem()` followed by a separate `addItem()` with no rollback logic between them
- `CraftingService` makes two or more separate database writes per craft operation
- No test exists that simulates an exception thrown after ingredient removal and verifies inventory is not in a half-consumed state
- Players report "lost mats" with no crafted item in inventory

**Phase to address:**
Phase 1 (CraftingService foundation) — implement the atomic single-write pattern before adding any recipe definitions.

---

### Pitfall 2: Crafting Timer Tracked Client-Side — Timer Skip Exploit and Server Desync

**What goes wrong:**
The crafting timer (short crafting progress bar) is displayed on the client. The client sends a `crafting:complete` event when the timer expires locally. The server receives this event and awards the output item. A modified client sends `crafting:complete` immediately after `crafting:start` with no wait, bypassing the timer entirely. Even without malicious intent, network jitter causes the client to report completion at slightly different times — the server has no independent reference for when the craft started, so it cannot validate the reported completion time.

**Why it happens:**
The gathering system in `apps/game-server/src/game/gathering.service.ts` solves this correctly: `startGathering()` stores `startTime: Date.now()` in server memory (`activeChallenges` Map), and `completeGathering()` validates timing via `validateGatherTiming()` in `game-logic`. The gathering pattern is the exact template for crafting timers — but if the crafting timer implementation looks at the gathering system and only copies the client-side progress bar without copying the server-side start time recording and validation, the exploit is created.

**How to avoid:**
Mirror the `GatheringService` pattern exactly. On `crafting:start`, record `{ recipeId, characterId, startedAt: Date.now() }` in a server-side `activeCrafts: Map<string, ActiveCraft>`. On `crafting:complete`, validate that `Date.now() - startedAt >= recipeDuration - LATENCY_TOLERANCE_MS` (e.g., tolerance of 500ms). Reject early completions. Also validate the player did not disconnect and reconnect between start and complete (the `activeCrafts` Map is in-memory; reconnect clears it). A reconnecting player must restart the craft.

**Warning signs:**
- `crafting:complete` handler awards items without checking when crafting was started
- No `activeCrafts` Map or equivalent in-memory session tracking on the server
- Crafting start time is taken from client payload rather than `Date.now()` on the server
- Speed testers report crafting 10 items in the time normally required for 1

**Phase to address:**
Phase 1 (CraftingService foundation) — establish server-side session tracking before implementing any recipe timers.

---

### Pitfall 3: Crafting Proficiency Shares the JSONB Pattern Without Separate Table — Schema Collision With Gathering Proficiency

**What goes wrong:**
The `gathering_proficiency` table stores all three gathering categories (`mining`, `herbalism`, `archaeology`) in a single JSONB column keyed by `characterId`. The crafting system needs per-category crafting proficiency (e.g., `equipment`, `consumables`, `automation`, `reagents`). The temptation is to add crafting categories directly to the existing `ProficiencyJson` interface in `packages/database/src/schema/gathering-proficiency.ts`. This creates three problems: (1) gathering proficiency and crafting proficiency are conceptually separate systems but share a row — schema changes to one require migrating both; (2) the `DEFAULT_PROFICIENCY` constant grows across two feature domains without clear ownership; (3) shared-types `ProficiencyData` becomes a mix of gathering and crafting fields with no type-safe distinction.

**Why it happens:**
The gathering proficiency schema is a convenient, proven template. It is tempting to extend it rather than create a new table. Drizzle JSONB columns accept arbitrary shapes, so adding crafting keys to the existing JSONB silently works at runtime — TypeScript only catches it if the interface is updated. The JSONB-keyed pattern requires no migration for new columns (just update the interface), making this path appear frictionless.

**How to avoid:**
Create a separate `crafting_proficiency` table following the same structure as `gathering_proficiency` but with a distinct interface. Use `CraftingProficiencyJson` with crafting-specific categories. This mirrors the separation between `gatheringProficiency` and `deployables` in the schema — each system owns its own table. The `CraftingService` loads and caches from `crafting_proficiency`; the `GatheringService` continues to load from `gathering_proficiency`. No mixing. Run a DB migration (`pnpm db:generate && pnpm db:migrate`) to create the new table, with `createCraftingProficiency()` row auto-created on first craft just as gathering does on first gather.

**Warning signs:**
- `ProficiencyJson` in `gathering-proficiency.ts` gains keys like `equipment`, `consumables`, or `assembly`
- `DEFAULT_PROFICIENCY` constant includes crafting categories alongside mining/herbalism/archaeology
- `shared-types/proficiency.ts` `ProficiencyData` interface conflates gathering and crafting skills
- A migration alters the `gathering_proficiency` JSONB default to add crafting fields

**Phase to address:**
Phase 1 (Schema design) — create `crafting_proficiency` as a separate table before writing any proficiency logic.

---

### Pitfall 4: Recipe Unlock State Not Persisted — Player Loses All Unlocked Recipes on Reconnect

**What goes wrong:**
Recipe unlock events fire correctly: a quest completion triggers `recipe.unlocked` event, `CraftingService` updates its in-memory `Map<characterId, Set<recipeId>>`. The crafting panel shows the newly unlocked recipes. Player logs out. On reconnect, `CraftingService.loadForPlayer()` does not load recipe unlock state from the database (because no table exists for it). The player's crafting panel shows only default recipes. Support tickets flood in: "I lost my faction recipes after maintenance."

**Why it happens:**
In-memory Maps are the correct performance pattern for active sessions (gathering locks, automation state, combat sessions all use them). But these Maps are session state — they evaporate on disconnect or server restart. The `GatheringService` avoids this by only storing transient challenge state in memory (challenges expire in seconds) while persisting durable state (proficiency XP/level) to the database. Recipe unlocks are durable state — a recipe unlocked via a one-time quest completion must survive server restarts. Building the unlock system in-memory first ("we'll add persistence later") consistently results in persistence never being added.

**How to avoid:**
Design the recipe unlock table from the start. A simple schema: `crafting_unlocks` table with `(character_id, recipe_id, unlocked_at, unlock_source)` where `unlock_source` is `'default' | 'quest' | 'level' | 'exploration' | 'faction'`. On player load, query all rows for `character_id`. On unlock, insert a row. The table is append-only — never delete rows (a player cannot "lose" an unlock). The in-memory Set is a cache of the database rows, not the source of truth.

**Warning signs:**
- Recipe unlock state is stored only in an in-memory Map with no corresponding database write
- No migration adds a `crafting_unlocks` or equivalent table before the feature ships
- `CraftingService.loadForPlayer()` does not query any database table for recipe unlock history
- Unlocks granted by quest completion disappear after server restart in testing

**Phase to address:**
Phase 1 (Schema design) — `crafting_unlocks` table is required before any unlock logic is implemented.

---

### Pitfall 5: Crafted Items Immediately Invalidate Loot and Trader Economy

**What goes wrong:**
Crafted rare suits (e.g., `verdant_suit_rare`) require 20 materials that take ~30 minutes to gather. The exact same item drops from enemies at roughly 1-per-2-hours and costs 800 credits from traders. The crafted version becomes optimal at ~30 minutes of effort for players with level 10 crafting proficiency. Players stop buying from traders and stop finding drops meaningful. The value of two existing economic systems (trading and loot) collapses. Helix and Nexus faction-specific items — which were differentiated by faction access — become accessible to all factions if cross-faction recipes exist.

**Why it happens:**
The crafting cost is balanced against the effort to gather materials in isolation. The balancer does not model the full opportunity cost: gathering 20 materials takes 30 min, but so does killing enemies (which also drops the item and credits). When crafting is faster than the expected loot drop time AND cheaper than the trader price, it strictly dominates both other acquisition paths. The existing `BALANCE-SHEET.md` principle (automation maintenance >= 60% of output value) needs a crafting equivalent: crafted item cost (in gathering time or credits) must be comparable to the alternative acquisition cost, not strictly faster.

**How to avoid:**
Define each craftable item's acquisition cost in three dimensions before writing any recipe: (1) trader buy price, (2) expected time to get via loot, (3) expected crafting time including material gathering. The crafting cost should sit in the range of 80-120% of the cheapest alternative. Crafting's advantage is customization and reliability (you choose what you make), not raw efficiency. For faction-specific items: crafting grants the same item but does NOT bypass faction ownership. Verdant suit recipes are only available to Verdant faction characters. Cross-faction crafting of faction-specific items is explicitly blocked at recipe validation on the server.

**Warning signs:**
- Recipe material costs are set without a reference to existing trader buy price for the same item
- No balance spreadsheet compares crafting time vs. expected loot acquisition time per item tier
- Faction-gated items can be crafted by characters of the wrong faction (server does not validate `player.factionId` against `recipe.requiredFaction`)
- After first patch with crafting, trader NPC purchase counts drop significantly in telemetry

**Phase to address:**
Phase 2 (Recipe definitions) — run balance comparison for every craftable item before the recipe file is written; Phase 1 (Server validation) — faction check on craft initiation.

---

### Pitfall 6: Quality Tier Formula Applied Globally — Beginners Craft Junk, Experts Craft Items That Break Loot Progression

**What goes wrong:**
Quality tier is determined by `craftingProficiency[category].level`. At level 1, all crafts produce Common quality regardless of recipe tier. At level 20+, all crafts produce Legendary quality. A level 20 crafter can produce Legendary suits after only 20 hours of crafting. These Legendary items are equivalent to drop-only Legendaries that currently require 40+ hours of world content. Crafting shortcuts the entire gear progression arc. Alternatively: quality is set too strict — players spend 10+ hours crafting Common items before they can produce Rare quality. "Why craft when loot is better?" becomes the community verdict and crafting is abandoned.

**Why it happens:**
Quality tiers and proficiency levels are designed independently. The proficiency level curve (using the existing `calculateLevelFromXP()` pattern from gathering: level 2 = 100 XP, each subsequent +50 XP more) is copied directly from gathering. But gathering proficiency affects yield quantity (2% per level), which has a gentle economic effect. Crafting quality directly produces items of a higher rarity tier — a qualitatively different power jump. The same XP curve applied to a different effect magnitude creates a system that is either too fast or too slow to progress.

**How to avoid:**
Decouple quality unlock from raw proficiency level. Define a `quality_threshold` per recipe: a recipe for a Rare suit requires proficiency level 8 to produce Rare quality output (not Legendary quality — that requires a separate Legendary recipe or a higher proficiency threshold). The player at level 6 who crafts a "Rare suit recipe" produces a Common suit. This preserves recipe access while gating output quality. Define thresholds in the recipe definition: `{ outputRarity: 'rare', minProficiencyLevel: 8 }`. The progression curve for proficiency can mirror gathering (identical XP math) — but the output quality gates must be tuned separately from the proficiency curve.

**Warning signs:**
- Quality tier is a direct function of proficiency level with no recipe-specific thresholds
- At proficiency level 20, every recipe in a category produces Legendary quality
- Quality tier 5 (Legendary) can be reached by a level-10 character within a few hours of crafting
- No balance pass compares proficiency-unlocked quality tiers against the expected character level at which those tiers should become available through loot

**Phase to address:**
Phase 2 (Recipe definitions and quality system) — define quality thresholds per recipe before any proficiency XP tuning.

---

### Pitfall 7: Full Production Chain Recipes Reference Item IDs That Do Not Exist Yet — Crafting Validation Fails Silently

**What goes wrong:**
The crafting system needs recipes covering all item categories: equipment, consumables, automation structures, reagents. Recipe definitions reference output item IDs and ingredient item IDs. If a recipe is written before its output item is registered in `ItemRegistry`, the recipe validation silently falls back to the `UNKNOWN_ITEM` sentinel (existing `ItemRegistry.get()` pattern returns the unknown fallback with a console warning). The recipe appears valid but produces an "Unknown Item" on successful craft. Worse: recipes referencing ingredient IDs that do not exist will validate incorrectly — the server checks `ItemRegistry.has(ingredientId)` to confirm the recipe is craftable, but if that check is missing, players can "craft" items using ingredients that have no definition.

**Why it happens:**
The `ItemRegistry` singleton in `packages/items/src/registry.ts` has a lenient `get()` method: it returns `UNKNOWN_ITEM` with a console warning rather than throwing. This safety net is appropriate for runtime item lookups (loot drops, inventory rendering) but masks authoring errors in recipe definitions. A recipe file written in advance of item definitions — which is likely given the breadth of the production chain — will silently succeed in validation even with broken IDs.

**How to avoid:**
Add a `validateRecipeDefinitions()` startup check in `CraftingService.onModuleInit()` that iterates all registered recipes and calls `ItemRegistry.has()` on every ingredient and output ID. Log `ERROR` and throw if any ID is unknown. This is the same pattern as entity validation (`entity-validation.test.ts` already validates entity definitions against item IDs for loot tables). A crafting recipe validation test (`crafting-recipe-validation.test.ts`) that calls `validateRecipeDefinitions()` will fail the build if any recipe references an unregistered item, catching authoring mistakes before they reach the server.

**Warning signs:**
- No startup validation of recipe ingredient and output IDs against `ItemRegistry`
- Crafting a recipe produces "Unknown Item" (magenta fallback color `0xff00ff`) in inventory
- Console shows `Unknown item ID: "..."` warnings at server startup
- `ItemRegistry.get()` is called in recipe validation without a preceding `ItemRegistry.has()` guard

**Phase to address:**
Phase 2 (Recipe definitions) — write the validation test before writing recipe definitions; it will fail immediately on any typo and catch problems before runtime.

---

### Pitfall 8: Faction Recipe Access Checked Client-Side Only — Players of Wrong Faction Can Craft Faction Items

**What goes wrong:**
The crafting panel filters recipes by `recipe.requiredFaction === player.factionId` before displaying them. A Helix player cannot see Verdant-specific recipes. However, if the server's `CraftingService.craftItem()` handler does not also validate faction membership, a client that bypasses the UI (or a modified client) can send `crafting:start { recipeId: 'verdant_legendary_suit_recipe' }` as a Helix character. The server processes the craft and awards the Verdant Legendary suit. Faction identity — one of the four core differentiators of the game — is undermined.

**Why it happens:**
The UI correctly filters the panel, which makes the restriction feel implemented. The server-side handler is written to "check the obvious things" (materials present, proficiency level, crafting timer) but skips faction validation because "the UI already prevents it." This mirrors the pattern noted in `.planning/PROJECT.md` key decisions: "guards on all [WebSocket] handlers." The faction check is a guard, not a UI filter.

**How to avoid:**
In `CraftingService.craftItem()`, validate faction as the first check before any inventory read: `if (recipe.requiredFaction && recipe.requiredFaction !== player.factionId) return { error: 'Faction requirement not met' }`. The player object in `PlayerService` already carries `factionId` (loaded from the `characters` table). The `FactionId` type in `shared-types/faction.ts` is available. This is a 3-line guard that must be present in every crafting handler. The client-side filter is UX; the server-side check is security.

**Warning signs:**
- `CraftingService.craftItem()` does not read `player.factionId` or compare it to `recipe.requiredFaction`
- A recipe definition has `requiredFaction: 'verdant'` but no server handler validates this field
- The crafting panel's recipe filter is the only place faction is enforced in the crafting system
- Faction-exclusive items are accessible via direct socket message injection in testing

**Phase to address:**
Phase 1 (CraftingService foundation) — faction guard is a server-side validation requirement, not a UI feature.

---

### Pitfall 9: Crafting Proficiency XP Uses Read-Modify-Write Without Conflict Resolution — Lost XP Under Concurrent Crafts

**What goes wrong:**
The `awardProficiencyXP()` pattern in `GatheringService` (lines 316-350 in `gathering.service.ts`) uses a read-modify-write pattern: SELECT the current row, compute new XP, UPDATE the row. If two crafting operations for the same character complete simultaneously (possible if the player rapidly queues items), both operations read the same starting XP value, compute independent totals, and write back. The second write overwrites the first. Net result: the player crafts two items worth 20 XP each and ends up with +20 XP instead of +40 XP. This is the classic read-modify-write race condition on JSONB columns.

**Why it happens:**
The `GatheringService.awardProficiencyXP()` comment at line 322 acknowledges: "Note: Drizzle doesn't have great JSONB path update support, so we read-modify-write within a transaction-like pattern." This is safe for gathering because a player can only have one active gathering challenge at a time (entity lock enforces it). Crafting, if it allows multiple simultaneous crafts or rapid sequential crafts, does not have the same natural serialization. The same code pattern copied from gathering is unsafe without the one-active-challenge enforcement.

**How to avoid:**
Two options — choose one:
1. Enforce one-active-craft-per-category using the same lock pattern as gathering: `activeCrafts: Map<characterId, ActiveCraft>` allows at most one active craft per character (or per proficiency category). Complete the craft before starting the next. This is the simplest mitigation and matches the existing gathering pattern.
2. Use a PostgreSQL advisory lock or a JSONB atomic increment with `jsonb_set` for the specific category key. Drizzle's raw SQL escape hatch supports this but adds complexity.

Option 1 is recommended for consistency with the existing codebase pattern. Document the constraint: "Only one active craft per character at a time — queue is client-side only."

**Warning signs:**
- A character can have multiple active crafts simultaneously (no `activeCrafts` Map enforcing one-at-a-time)
- `awardCraftingXP()` does not lock or serialize against concurrent calls for the same character
- Stress testing shows XP totals below expected values when a player rapidly completes several crafts
- `awardCraftingXP()` is called from multiple concurrent async code paths without serialization

**Phase to address:**
Phase 1 (CraftingService foundation) — enforce one-active-craft before proficiency awarding is implemented.

---

### Pitfall 10: Automation Structure Crafting Bypasses Item Category Validation — Deployable Items Crafted Without `deploy` Effect

**What goes wrong:**
The existing automation items (`deployable_extractor`, `deployable_survey_beacon`, `deployable_planetary_extractor`, `deployable_refinery`) work because they have `{ type: 'deploy', deployableType: 'extractor' }` in their `effects` array (item type in `packages/items/src/types.ts`). The crafting system produces output items by item ID. If a crafting recipe outputs `deployable_extractor` and the player already has a depleted extractor they'd like to replace, the crafted item is added to inventory normally. However, if the production chain produces a NEW type of deployable — a "crafted extractor mark II" with a new `itemId` — and that item definition lacks the `deploy` effect, deploying it via the `AutomationService` will fail silently or throw because `ItemRegistry.get(item.itemId)?.effects` won't contain a `deploy` effect. `DEPLOYABLE_TYPE_TO_ITEM` in `automation.service.ts` maps type names to item IDs — a new crafted deployable not in this map cannot be deployed.

**Why it happens:**
Crafting output validation focuses on whether the output item ID exists in the registry, not whether the output item has the required effects to function as intended. The `AutomationService` uses a static `DEPLOYABLE_TYPE_TO_ITEM` mapping. Adding crafted automation items without updating this mapping creates items that craft but cannot be deployed.

**How to avoid:**
If crafting produces automation structures, the output item IDs must be the same IDs already mapped in `DEPLOYABLE_TYPE_TO_ITEM` (e.g., crafting produces `deployable_extractor`, not a new `crafted_extractor` ID). Crafting is an acquisition path for existing deployable items, not a way to create new item types. If new craftable deployable tiers are needed (Tier 6, for example), add the item definition AND update `DEPLOYABLE_TYPE_TO_ITEM` in the same changeset, with a validation test confirming every deployable item ID in the registry is present in `DEPLOYABLE_TYPE_TO_ITEM`.

**Warning signs:**
- Crafting recipes output item IDs that start with `deployable_` but are not in `DEPLOYABLE_TYPE_TO_ITEM`
- Crafted automation items have no `deploy` effect in their `ItemDefinition.effects` array
- Deploying a crafted automation structure returns a generic error or does nothing
- `DEPLOYABLE_TYPE_TO_ITEM` is not updated when new craftable automation items are added

**Phase to address:**
Phase 3 (Production chain — automation tier) — validate `DEPLOYABLE_TYPE_TO_ITEM` completeness before any automation crafting recipes are defined.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Extending `ProficiencyJson` with crafting categories | No new table needed, reuses existing schema | Gathering and crafting systems share a schema row they shouldn't own together; migrations to either domain require careful coordination | **Never** — separate concerns into separate tables |
| Storing recipe unlocks in-memory only | Fast to implement, no migration needed | Unlocks disappear on server restart; one-time quest unlocks are permanently lost; impossible to audit unlock history | **Never for durable unlocks** — transient state (active craft sessions) is fine in-memory |
| Client-side ingredient validation only | Simpler server handler; faster UI feedback | Crafting exploits via direct socket injection; players can craft without materials | **Never** — server must validate all ingredient requirements |
| All recipes unlocked at system launch (no progression) | Easier to test; players immediately see full crafting potential | Recipe overwhelm (Crashlands post-mortem); players optimize to highest tier immediately, skipping mid-game | **Never in production** — use staged unlock but can do in test mode |
| Single quality tier per recipe (no proficiency threshold) | Simpler recipe definitions | High-level crafters produce Legendary items trivially; gear progression obsoleted | **Never** — quality threshold per recipe is required for balance |
| Non-atomic ingredient removal (two DB writes: remove then add) | Slightly simpler code than single-pass mutation | Item loss or duplication on partial failures; hard to test rollback paths | **Never** — atomic single-write pattern exists in codebase, use it |
| Faction recipe validation in UI only | Faction restrictions visible and functional for honest players | Modified clients bypass UI; faction-exclusive items accessible to all factions | **Never** — server guards are not optional |

---

## Integration Gotchas

Common mistakes when crafting integrates with existing systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| CraftingService + InventoryService | Calling `removeItem()` and `addItem()` as two separate operations | Compute final inventory state in memory, call `updateInventoryFull()` once |
| CraftingService + QuestService | Quest completion fires `recipe.unlocked` event but CraftingService listener does not persist to DB | Insert `crafting_unlocks` row immediately in the event listener; in-memory Set is a cache, not source of truth |
| CraftingService + ItemRegistry | Recipe definitions written before item definitions; `ItemRegistry.has()` returns `false` at startup | Add startup validation test; recipe authoring only proceeds after item IDs are registered |
| CraftingService + AutomationService | Crafting outputs a new deployable item ID not in `DEPLOYABLE_TYPE_TO_ITEM` | Crafting must output existing deployable item IDs; update `DEPLOYABLE_TYPE_TO_ITEM` in same changeset as any new deployable item |
| CraftingProficiency + GatheringProficiency | Sharing the `gathering_proficiency` table or `ProficiencyJson` type | Separate table `crafting_proficiency`; separate interface `CraftingProficiencyJson`; separate service method `loadCraftingProficiency()` |
| Crafting + FactionBonuses | `FactionBonuses.craftingModifier` exists in `faction.ts` but is never applied | Apply `craftingModifier` to either crafting timer duration or proficiency XP gain; document which; test that a Verdant character (who may have a bonus) gains XP faster |
| Crafting unlock + QuestReward | Quest reward grants items but no mechanism to grant recipe unlocks | Add `recipeUnlocks?: string[]` to quest reward type; handle in `QuestService.grantRewards()` via `crafting.recipe_unlocked` event |
| Active crafting timer + player disconnect | Player disconnects mid-craft; on reconnect, `activeCrafts` Map is empty | Reconnect does not auto-complete the craft; player must restart; server must NOT complete a craft for a disconnected player |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all recipe definitions into per-request memory | Slow crafting panel open; server CPU spikes when many players open crafting | Load recipes into a singleton `RecipeRegistry` at startup, just like `ItemRegistry` | Breaks at >100 concurrent crafting panel opens if recipes are reloaded per-request |
| Querying `crafting_unlocks` on every recipe availability check | Crafting panel slow to open; DB connection pool under pressure | Cache unlocked recipe IDs in `CraftingService` in-memory Map; invalidate on new unlock events | Breaks at >50 concurrent players opening crafting panels if each queries DB |
| Recalculating proficiency level from XP on every craft (loop over XP thresholds) | Crafting feels laggy at high proficiency levels (level 15+) | Store computed level in `crafting_proficiency` table alongside XP; update on XP change (same pattern as `gathering_proficiency`) | Not a problem until level 15+ (~hundreds of crafts); preventable from the start |
| Broadcasting crafting events to entire zone | Unnecessary network traffic; other players' crafting activity is irrelevant to zone neighbors | Send crafting events only to the crafting player's socket; zone broadcast is only needed for visually observable events (none in crafting) | Breaks at >20 concurrent crafters in same zone |
| Validating all 100+ items' recipe ingredient availability on panel open | Panel open takes 200ms+ | Validate on `crafting:start`, not on panel open; panel shows all known recipes, greyed out if materials insufficient (check client-side for display only) | Breaks at >50 items in recipe list if full inventory validation runs on open |

---

## Security Mistakes

Domain-specific security issues with the crafting system.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-reported craft completion time | Players skip crafting timers entirely; mass-produce items in seconds | Server records `startedAt` on `crafting:start`; validates elapsed time on `crafting:complete` |
| No faction check on server craft handler | Wrong-faction characters craft faction-exclusive items; faction identity is undermined | `if (recipe.requiredFaction && recipe.requiredFaction !== player.factionId) reject` as first server-side check |
| No ingredient validation on server | Players craft without materials; item duplication via crafting | Server reads from `InventoryService.getInventory()` (server-side cache), never trusts client-reported inventory state |
| Crafting during combat allows safe item production | Players produce healing consumables mid-fight (exploit) | Check `CombatService.isInCombat(playerId)` before allowing `crafting:start`; return error if in combat |
| No rate limiting on `crafting:start` events | Event spam can pre-empt other game logic or exhaust server resources | Rate-limit: max 1 craft start per recipe timer duration per player; reject duplicate starts for same character |
| Recipe unlock source not validated | Client sends `crafting:unlock { recipeId }` directly; server adds any recipe without source validation | Recipe unlocks must be triggered by server-internal events only (quest completion, level up, zone discovery); no client-side unlock request event |

---

## UX Pitfalls

Common user experience mistakes in the crafting domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing all possible recipes immediately on first open (no unlock progression) | Overwhelming; players see dozens of greyed-out recipes they cannot make for hours | Show only unlocked recipes; provide "how to unlock this" tooltip on locked recipes visible in a separate "Discoverable" tab |
| Quality tier shown as number only (Quality: 3 of 5) | Players don't connect quality number to rarity tier | Map quality to rarity language: "Quality: Rare" instead of "Quality: 3"; use existing rarity color system (`--color-rarity-rare`) |
| No feedback when ingredients are consumed but output not yet received (during timer) | Players spam-click during timer, worry about item loss | Show "Crafting in progress — materials reserved" state with ingredients visually dimmed or marked as reserved |
| Crafting timer cancellation destroys materials | Players accidentally cancel mid-craft and lose materials | Make cancellation refund materials during timer; only consume on successful completion (refund = craft didn't execute) |
| Crafting panel accessible everywhere but opening it in combat | Crafting during combat is blocked server-side but player can still open empty panel | Show "Cannot craft while in combat" overlay on panel open; do not silently show empty panel |
| No proficiency XP feedback on craft completion | Players don't know crafting is leveling a skill | Show "+12 XP — Assembly proficiency (Level 4)" in craft completion toast, same pattern as gathering proficiency feedback |
| Recipe search with hundreds of recipes, no category filter | Players scroll through all categories to find one recipe | Category tabs matching item categories (Equipment / Consumables / Automation / Reagents) shown by default; search is secondary |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Crafting panel shows recipes:** Often missing server-side faction guard — verify: Helix character sending `crafting:start` for a Verdant recipe via direct socket call is rejected with `Faction requirement not met`
- [ ] **Crafting timer shows progress bar:** Often missing server-side start time recording — verify: sending `crafting:complete` immediately after `crafting:start` is rejected as "Too early"
- [ ] **Ingredients consumed on craft:** Often missing atomicity — verify: exception thrown after ingredient removal but before output addition leaves inventory unchanged (not in a half-consumed state)
- [ ] **Recipe unlocks from quest completion:** Often missing database persistence — verify: unlocking a recipe, restarting the server, and logging back in still shows the recipe as unlocked
- [ ] **Crafting proficiency levels up:** Often missing separate table — verify: `crafting_proficiency` table exists in DB with no overlap with `gathering_proficiency` columns
- [ ] **Quality tiers based on proficiency:** Often missing per-recipe thresholds — verify: a level 1 crafter attempting a Legendary recipe produces Common quality, not Legendary quality
- [ ] **Automation structures craftable:** Often missing `DEPLOYABLE_TYPE_TO_ITEM` update — verify: crafted deployable item can be deployed via automation panel without errors
- [ ] **Faction recipes visible only to correct faction:** Often missing server validation (UI-only filter) — verify: recipe not shown AND server rejects direct craft attempt from wrong faction
- [ ] **Recipe definitions valid:** Often missing startup validation — verify: `RecipeRegistry` startup check throws if any ingredient/output item ID is not in `ItemRegistry`
- [ ] **Crafting combat gate:** Often missing in-combat check — verify: attempting `crafting:start` while in combat returns error; `isInCombat()` check exists in `CraftingService`

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Non-atomic craft loses player ingredients | HIGH | 1. Audit DB for characters whose inventory shows missing materials without corresponding crafted item 2. Add compensation credits or items 3. Refactor `craftItem()` to single-write pattern 4. Add integration test for partial-failure scenario |
| Recipe unlocks not persisted (all lost on restart) | HIGH | 1. Create `crafting_unlocks` table 2. Re-grant unlocks via script: for each character, replay quest completion history to re-derive unlocks 3. One-time unlock grant for all characters who completed relevant quests |
| Faction bypass via socket injection | MEDIUM | 1. Add faction guard to `craftItem()` — one-line fix 2. Audit DB for faction-exclusive items held by wrong-faction characters 3. Decide whether to remove, convert, or grandfather existing items |
| Timer skip exploit discovered | MEDIUM | 1. Add server-side `activeCrafts` Map with `startedAt` tracking 2. Validate elapsed time on completion 3. No DB migration needed 4. Deployed characters with pre-built stock require no rollback (they already have the items) |
| Crafting invalidates trader economy | HIGH | 1. Audit recipe material costs vs trader prices 2. Increase material requirements for underpriced recipes 3. Communicate as "recipe balancing pass" 4. Consider adding unique crafting-only enchantments to maintain crafting's value proposition without competing on raw stats |
| Quality tiers allow Legendary crafting too easily | MEDIUM | 1. Add proficiency-level thresholds per recipe 2. Items already crafted at incorrect quality remain as-is (grandfather) 3. Announce "crafting mastery system" added as a feature, not a nerf |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Non-atomic ingredient consumption | Phase 1 — CraftingService foundation | Test: exception after ingredient removal → inventory unchanged |
| Crafting timer skip exploit | Phase 1 — CraftingService foundation | Test: `crafting:complete` sent immediately after `crafting:start` → rejected with "Too early" |
| Crafting proficiency schema collision with gathering | Phase 1 — DB schema | Check: `crafting_proficiency` table exists separate from `gathering_proficiency`; no shared interface |
| Recipe unlock not persisted | Phase 1 — DB schema | Test: unlock recipe, restart server, reload player → recipe still unlocked |
| Crafted items invalidate economy | Phase 2 — Recipe definitions | Design doc: material cost spreadsheet comparing crafting time vs trader price vs loot drop rate for each recipe |
| Quality tier progression too fast or too slow | Phase 2 — Quality system | Test: level 1 crafter + epic recipe → Common output; level 15 crafter + epic recipe → Epic output |
| Recipe definitions reference unknown item IDs | Phase 2 — Recipe definitions | Test: `RecipeRegistry` startup validation test fails build if any item ID unknown |
| Faction recipe bypass via socket injection | Phase 1 — Server validation | Test: wrong-faction character crafts faction recipe via direct socket → rejected |
| Crafting XP lost under concurrent crafts | Phase 1 — CraftingService foundation | Test: two concurrent crafts complete for same character → both XP awards recorded |
| Automation deployable item ID mismatch | Phase 3 — Production chain (automation tier) | Test: crafted deployable item can be deployed; `DEPLOYABLE_TYPE_TO_ITEM` covers all craftable deployable IDs |

---

## Sources

- Direct codebase analysis:
  - `apps/game-server/src/game/gathering.service.ts` — server-side start time recording, read-modify-write XP pattern, entity lock pattern (lines 56-378)
  - `apps/game-server/src/game/inventory.service.ts` — `addItem()` mutation pattern, `updateInventoryFull()` single-write pattern (lines 1-100)
  - `apps/game-server/src/game/automation.service.ts` — `DEPLOYABLE_TYPE_TO_ITEM` mapping, active session state pattern
  - `packages/database/src/schema/gathering-proficiency.ts` — JSONB proficiency schema pattern to mirror for crafting
  - `packages/database/src/schema/inventories.ts` — `InventoryItemJson`, `EquipmentJson` type contracts
  - `packages/items/src/registry.ts` — `UNKNOWN_ITEM` fallback behavior, `has()` vs `get()` distinction
  - `packages/items/src/types.ts` — `ItemEffect` discriminated union, `deploy` effect type
  - `packages/shared-types/src/game/faction.ts` — `FactionBonuses.craftingModifier` field already defined
  - `packages/shared-types/src/game/automation.ts` — `DEPLOYABLE_TYPE_TO_ITEM` equivalent mapping
  - `.planning/PROJECT.md` — current milestone scope, economy balance principle "maintenance >= 60% of output value"
- Crashlands crafting system redesign post-mortem: [How we unbroke our crafting system — Game Developer](https://www.gamedeveloper.com/design/how-we-unbroke-our-crafting-system)
- Crafting design pitfalls: [Avoiding Pitfalls in Your Crafting System — DeepFriedGamer](https://deepfriedgamer.com/blog/avoiding-pitfalls-in-your-crafting-system)
- Crafted vs. looted economy balance: [Why aren't crafted items better? — MMORPG.com Forums](https://forums.mmorpg.com/discussion/398885/why-arent-crafted-items-better), [Virtual Economic Theory: How MMOs Really Work — Game Developer](https://www.gamedeveloper.com/business/virtual-economic-theory-how-mmos-really-work)
- Crafting quality and progression system design: [Crafting. Quality Rating and its usefulness — Ashes of Creation Forums](https://forums.ashesofcreation.com/discussion/65342/crafting-quality-rating-and-its-usefulness)
- Server-side validation principles for game exploits: [MMO Architecture: Source of truth, Dataflows — PRDeving](https://prdeving.wordpress.com/2023/09/29/mmo-architecture-source-of-truth-dataflows-i-o-bottlenecks-and-how-to-solve-them/)
- Data-driven crafting system design: [Designing a data driven crafting system using tags — GameDev.net](https://www.gamedev.net/forums/topic/715034-designing-a-data-driven-crafting-system-using-tags/)

---
*Pitfalls research for: v1.25 Crafting milestone (manual crafting, recipe progression, faction specialties, quality tiers, per-category proficiency)*
*Researched: 2026-03-05*
