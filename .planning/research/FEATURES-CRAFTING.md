# Feature Research — Crafting System

**Domain:** Manual crafting system for sci-fi survival MMO (v1.25 milestone)
**Researched:** 2026-03-05
**Confidence:** HIGH (core UI/UX patterns), MEDIUM (quality tier mechanics), HIGH (codebase integration points)

---

## Context: What Already Exists

Before defining features, the existing inventory of relevant systems matters. These are constraints, not starting points:

- **Item system:** 100+ items, 6 categories (`suit`, `module`, `tool`, `consumable`, `world-item`, `reagent`), 5 rarities. Strategy pattern. `ItemRegistry` with `ItemDefinition` schema.
- **Reagents:** 17 reagent definitions across all 5 rarity tiers — from `reagent_crystalline_dust` (common) to `reagent_void_heart` (legendary). These are the raw material pool.
- **Deployable items:** 4 items (`deployable_extractor`, `deployable_survey_beacon`, `deployable_planetary_extractor`, `deployable_refinery`) already defined as consumable items with `deploy` effect type.
- **Gathering proficiency:** Per-category skill system (`mining`, `herbalism`, `archaeology`) stored as JSONB. Level → XP curve, yield bonus calculation, already implemented.
- **Faction system:** 4 factions (`verdant`, `helix`, `nexus`, `neutral`). `FactionBonuses` type already has a `craftingModifier` field — anticipating this milestone.
- **Quests:** Full quest definition system including `prerequisiteQuestIds`, `faction` restriction, `rewards.items`. Quest-unlock recipes can integrate directly.
- **Inventory:** `INSUFFICIENT_RESOURCES` error code already defined. Full inventory manipulation infrastructure in place.
- **UI patterns:** `useDraggablePanel`, glassmorphism CSS, modal stack, Zustand stores with socket event side-effects. Automation panel (tab-based, panel data from server) is the closest reference pattern.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features players assume exist in any crafting system. Missing these makes the system feel broken or placeholder.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Recipe browser panel | All crafting games have a browse-and-select interface | MEDIUM | Accessible from HUD anywhere (per milestone spec). Tabbed by category matches existing UI patterns. |
| Ingredient requirement display | Players need to know what items to gather before crafting | LOW | Show required items with counts. Green = have enough, red = missing. |
| Craftable/uncraftable visual distinction | Greyed-out or locked recipes when requirements unmet prevents confusion | LOW | Standard game UX: dim uncraftable recipes, highlight craftable ones. |
| Craft button with confirmation | Single interaction to start a craft | LOW | Button disabled when requirements not met. No accidental crafting. |
| Crafting progress bar with timer | Even short timers need feedback so players know something is happening | LOW | Per milestone spec: short crafting timer + progress bar. 2-5s is appropriate. |
| Inventory integration | Crafting consumes items from inventory, delivers result to inventory | MEDIUM | Depends on existing inventory system. `INSUFFICIENT_RESOURCES` error code already exists. |
| Recipe output preview | Players need to see what they'll receive before crafting | LOW | Show item icon, name, rarity, quantity. |
| Category filtering | 100+ items across 6 categories means unfiltered lists are unusable | LOW | Filter by equipment/consumables/deployables/reagents. |

### Differentiators (Competitive Advantage)

Features that make this crafting system distinctive within the game's identity.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-category crafting proficiency | Mirrors gathering proficiency pattern. Specialization feels meaningful. | MEDIUM | 4-6 disciplines matching item categories. Level gates quality tier, not recipe access. Reuse `gatheringProficiency` JSONB schema pattern. |
| Quality tiers influenced by proficiency | Same recipe produces Common/Rare/Epic quality based on skill level | MEDIUM | 3 quality tiers per craft: Standard (all levels), Refined (mid-level), Masterwork (high level). Affects stat bonuses, not entirely different items. |
| Progression-unlocked recipes | Level-gated, quest-reward, exploration-discovered, faction-standing recipes | HIGH | Multiple unlock vectors avoids single progression bottleneck. Exploration unlocks align with existing zone mastery system. |
| Faction-specific specialty recipes | Verdant, Helix, Nexus each have unique high-tier recipes unavailable to others | MEDIUM | Faction gear lines already exist. Faction crafting specialties extend faction identity into production. Unaffiliated get universal recipes only. |
| Full production chain scope | Covers all output categories: equipment, consumables, deployable structures, reagents | HIGH | Deployable items already defined as item types — crafting them is the natural acquisition path. Reagent refining creates a secondary processing loop. |
| Short crafting timer (not instant) | Timer creates moment of commitment, progress bar gives feedback | LOW | 2-10 seconds depending on item tier. Not a waiting-room system. Mirrors gathering timing mini-game rhythm. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem useful but introduce design debt or harm the game loop.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Crafting queue (batch crafting) | Players want to walk away and get multiple items | Turns crafting into idle waiting, eliminates decision engagement. Creates inflation pressure — too easy to stockpile. | Single craft at a time. Short timers mean low friction. Batch crafting is a late-milestone feature if needed. |
| Crafting failure chance | Feels "realistic" and adds tension | At low probabilities, it's pure frustration tax. At high probabilities, it destroys material economy (players stop crafting risky items). Research shows this is the most-hated mechanic in crafting MMOs. | Quality tiers achieve uncertainty-of-outcome without destroying materials. |
| Unlimited recipe visibility | "Just show everything unlockable eventually" | Recipe list becomes a spoiler list. Reduces discovery satisfaction. | Show locked recipes as silhouettes with hint text ("Requires: Verdant rank 3" or "Crafted from: Aquatic biome resources"). |
| Workstation requirement (must be at crafting bench) | Adds spatial gameplay, separates hub from field | For a game with hub travel costing cooldowns, locking crafting to a location is friction without reward. The game is exploration-first. | Crafting panel accessible anywhere per milestone spec. The cost is ingredient acquisition, not travel. |
| Crafting skill XP from junk recipes | "Grind basics to unlock better stuff" | Creates tedious recipe spam loop (MMO crafting's #1 cited problem). Players craft 500 health vials to unlock armor. | XP from crafting the item's tier. Higher-tier crafts give more XP. No junk-crafting express lane. |
| Recipe RNG discovery (random unlock on craft) | Surprise feels fun | Creates anxiety and FOMO. Players feel forced to craft things they don't want. Unpredictable progression gates. | Explicit unlock conditions: level, quest, biome visit, faction standing. Players know exactly what to pursue. |
| Item degradation from crafted items | Adds economic realism | Adds maintenance burden players find tedious. Automation system already has maintenance costs — doubling down is overload. | Durability-like behavior already scoped for automation structures only. Don't extend to crafted gear. |

---

## Feature Dependencies

```
[Crafting Panel UI]
    └──requires──> [Recipe Definition System] (new package: packages/recipes)
                       └──requires──> [Item Registry] (existing: packages/items)
                       └──requires──> [Inventory System] (existing)

[Recipe Unlock System]
    └──requires──> [Recipe Definitions]
    └──requires──> [Quest System] (existing: packages/quests) — for quest-unlocked recipes
    └──requires──> [Character Level] (existing: packages/database/characters) — for level-gated recipes
    └──requires──> [Zone Mastery / POI Discovery] (existing) — for exploration-unlocked recipes
    └──requires──> [Faction Identity] (existing: shared-types/faction) — for faction-gated recipes

[Quality Tier System]
    └──requires──> [Crafting Proficiency] (new, mirrors gatheringProficiency JSONB schema)
    └──requires──> [Recipe Definitions]
    └──enhances──> [Item output quality] (modifies stat values, not item IDs)

[Crafting Proficiency]
    └──requires──> [Crafting Actions] (needs something to gain XP from)
    └──mirrors──> [Gathering Proficiency] (existing: packages/game-logic/gathering/proficiency.ts)

[Faction Specialty Recipes]
    └──requires──> [Recipe Unlock System]
    └──requires──> [Faction Identity on Character] (existing)
    └──conflicts──> [Universal Recipe Pool] (faction recipes must NOT appear in universal list)

[Crafting Timer + Progress Bar]
    └──requires──> [Server-side craft validation] (new WebSocket event)
    └──requires──> [Inventory consumption on craft start or craft complete] (design decision: consume on start)
```

### Dependency Notes

- **Recipe Unlock requires Quest System:** Quest rewards currently support `items[]` — adding `recipeIds[]` to `QuestRewards` is a small extension. The quest system itself does not change.
- **Quality Tier enhances Item output:** Quality tiers should NOT produce new item IDs (avoids item registry explosion). Instead, a crafted item carries a `quality` field that modifies displayed stats. The `ItemDefinition` schema is read-only; quality is a runtime attribute of the inventory slot.
- **Crafting Proficiency mirrors Gathering Proficiency:** The `gatheringProficiency` table stores JSONB per character. A parallel `craftingProficiency` table with the same pattern is the implementation path. The `calculateLevelFromXP` and `calculateXPReward` functions in `packages/game-logic/src/gathering/proficiency.ts` are reusable.
- **Faction Specialty conflicts with Universal Pool:** Faction recipes must be filtered out of the browse view for characters of the wrong faction. A `requiredFaction?: FactionId` field on `RecipeDefinition` handles this cleanly.

---

## MVP Definition

### Launch With (v1.25 core)

The crafting system is complete when these features ship together. They form one coherent loop.

- [ ] **Recipe Definition System** — static definitions in `packages/recipes`, analogous to `packages/quests` and `packages/items`. Each recipe has: `id`, `outputItemId`, `outputQuantity`, `ingredients[]`, `requiredLevel`, `requiredFaction?`, `craftingDiscipline`, `craftingTimeMs`.
- [ ] **Recipe Unlock Storage** — DB table tracking which recipes a character has unlocked. Default set unlocked at character creation (basic recipes).
- [ ] **Crafting Panel UI** — React component, draggable (uses `useDraggablePanel`), accessible from HUD anywhere. Tabbed by discipline. Recipe list with craftable/locked visual states. Ingredient checklist. Output preview. Craft button.
- [ ] **Crafting timer + progress bar** — Client-side countdown, server validates on completion. Short timers (2-10s by tier).
- [ ] **Inventory integration** — Ingredients consumed on craft start. Output delivered on craft complete. `INSUFFICIENT_RESOURCES` error if missing items. `INVENTORY_FULL` error if no space.
- [ ] **Crafting Proficiency** — New `craftingProficiency` table (JSONB, mirrors `gatheringProficiency`). 4-5 disciplines. XP awarded on craft completion. Level gates quality tier outcome.
- [ ] **Quality tiers** — 3 tiers: Standard (level 1-4), Refined (level 5-9), Masterwork (level 10+). Quality is a runtime attribute on inventory slot, not a new item ID. Stat modifier: Standard +0%, Refined +15%, Masterwork +30%.
- [ ] **Progression-unlocked recipes** — Level-gated recipes visible but locked until level met. Quest-reward recipes unlocked on quest completion (extend `QuestRewards` with `recipeIds?`). Exploration-unlocked recipes triggered by POI discovery or zone mastery.
- [ ] **Faction specialty recipes** — Higher-tier recipes for faction-specific items (Verdant biotech, Helix heavy armor, Nexus tech modules) gated by `requiredFaction`. Unaffiliated characters see only universal recipes.

### Add After Validation (v1.25.x)

These extend the system once core is stable.

- [ ] **Recipe search/text filter** — Useful when recipe count grows beyond ~30. Not needed at launch.
- [ ] **Crafting proficiency display** — Show discipline levels and XP progress in crafting panel. Useful quality-of-life once players are engaged with the system.
- [ ] **Recipe hint for locked exploration recipes** — Show silhouette with "Requires: visit [biome]" hint text. Drives exploration motivation.

### Future Consideration (v2+)

- [ ] **Batch crafting** — Craft N of the same item. Defer until economy data shows demand. Risk: inflation.
- [ ] **Crafting orders / commission system** — Players craft for other players. Requires player-to-player economy infrastructure not yet scoped.
- [ ] **Recipe research / invention** — Spend materials to discover new recipes randomly. High complexity, uncertain payoff. Not needed while recipe count is manageable.
- [ ] **Crafting station specialization** — Specific structures unlock specific recipe tiers. Would require adding deployable crafting stations. Conflicts with hub-accessible design.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Recipe browser panel UI | HIGH | MEDIUM | P1 |
| Ingredient display (craftable/uncraftable) | HIGH | LOW | P1 |
| Craft button + timer + progress bar | HIGH | LOW | P1 |
| Inventory consumption and output delivery | HIGH | MEDIUM | P1 |
| Recipe definition system (packages/recipes) | HIGH | MEDIUM | P1 |
| Basic recipe unlock set (level-gated) | HIGH | MEDIUM | P1 |
| Crafting proficiency (per-discipline XP) | MEDIUM | MEDIUM | P1 |
| Quality tiers (3-tier stat modifier) | MEDIUM | MEDIUM | P2 |
| Faction specialty recipes | MEDIUM | LOW | P2 |
| Quest-reward recipe unlocks | MEDIUM | LOW | P2 |
| Exploration-triggered recipe unlocks | MEDIUM | MEDIUM | P2 |
| Recipe search/text filter | LOW | LOW | P3 |
| Proficiency level display in panel | LOW | LOW | P3 |
| Locked recipe silhouette hints | MEDIUM | LOW | P3 |

---

## Competitor Reference Analysis

Reference games analyzed for pattern validation:

| Feature | FFXIV (Disciples of the Hand) | RuneScape | Valheim | Our Approach |
|---------|-------------------------------|-----------|---------|--------------|
| Crafting disciplines | 8 separate jobs, fully independent skill trees | Single crafting level, multiple tables | Single crafting skill | 4-5 disciplines tied to output category (not jobs). Simpler than FFXIV. |
| Recipe unlock | All recipes available once job level met | Recipes always visible, level gates success | Recipes auto-unlock by materials in inventory | Explicit unlock via level, quest, exploration, faction. No automatic discovery. |
| Quality tiers | Full mini-game (progress/quality bar, skill actions) | No quality system | No quality tiers | 3-tier proficiency outcome. Simpler than FFXIV but adds meaningful variation. |
| Faction recipes | No direct equivalent | No direct equivalent | No factions | Faction-gated specialty recipes reinforce faction identity already established. |
| Crafting timer | Instant per action in mini-game | Progress bars per skill level | Near-instant at workbench | Short timer (2-10s). Not a waiting room. Acknowledges action. |
| Failure chance | No failure (quality reduction instead) | Low-level fail chance (below required level) | No failure | No failure. Quality tiers handle outcome variation without frustration. |

---

## Integration Points with Existing Systems

These are the specific touch points in the codebase where crafting connects to existing features:

| Existing System | Integration | Notes |
|-----------------|-------------|-------|
| `packages/items` — `ItemRegistry` | Recipes reference item IDs for ingredients and outputs | Read-only. No changes to item definitions required. |
| `packages/database/schema/inventories.ts` | Crafting consumes and adds inventory rows | Reuse existing inventory mutation queries. |
| `packages/database/schema/characters.ts` | Character level gates recipe unlock | Read `level` field. No new queries needed. |
| `packages/quests` — `QuestRewards` | Add `recipeIds?: string[]` field | Small extension. Backwards compatible (optional field). |
| `packages/game-logic/gathering/proficiency.ts` | `calculateLevelFromXP`, `calculateXPReward` | Reuse directly for crafting proficiency math. |
| `packages/database/schema/gathering-proficiency.ts` | Template for `crafting_proficiency` table | Parallel JSONB table, same shape. |
| `packages/shared-types/game/faction.ts` | `FactionId` type for `requiredFaction` on recipes | No changes needed. |
| `apps/web/src/store/automationStore.ts` | Pattern reference for panel Zustand store | New `craftingStore.ts` follows same socket-event side-effect pattern. |
| `apps/web/src/hooks/useDraggablePanel.ts` | Crafting panel is draggable | No changes needed. |
| `packages/shared-types/network/messages.ts` | New WebSocket events: `crafting:start`, `crafting:complete`, `crafting:cancel` | Add to `ClientEvents` and `ServerEvents`. |

---

## Sources

- [Designing an MMORPG: Crafting Systems — MMOGames.com](https://www.mmogames.com/gamearticles/designing-an-mmorpg-crafting-systems/)
- [Most MMO Crafting Systems Suck. How to Make a Good One — Pantheon Forums](https://seforums.pantheonmmo.com/content/forums/topic/8218/most-mmo-crafting-systems-suck-how-to-make-a-good-one)
- [Crafting Systems for MMORPG (blueprints/recipes/formulae) — GameDev.net](https://www.gamedev.net/forums/topic/220475-crafting-system-for-a-mmorpg-blueprintsrecipesformulae/)
- [FFXIV Crafting — Final Fantasy XIV Online Wiki](https://ffxiv.consolegameswiki.com/wiki/Crafting)
- [Quality System — RimWorld Wiki](https://rimworldwiki.com/wiki/Quality) (quality tier proficiency reference)
- [Survival Game Design Principles — GameDesignSkills](https://gamedesignskills.com/game-design/survival/)
- [Useful Crafting in MMORPGs, a Dead Art? — MMORPG.com Forums](https://forums.mmorpg.com/discussion/500176/useful-crafting-in-mmorpgs-a-dead-art)
- Codebase analysis: `packages/items/src/types.ts`, `packages/game-logic/src/gathering/proficiency.ts`, `packages/shared-types/src/game/proficiency.ts`, `packages/shared-types/src/game/faction.ts`, `packages/quests/src/types.ts`, `packages/database/src/schema/gathering-proficiency.ts`

---

*Feature research for: v1.25 Manual Crafting System — Into the Void*
*Researched: 2026-03-05*
