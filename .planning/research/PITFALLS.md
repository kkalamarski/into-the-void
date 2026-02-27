# Pitfalls Research

**Domain:** MMO content expansion — adding 100+ entity/item definitions and faction equipment to an existing sci-fi survival game
**Researched:** 2026-02-27
**Confidence:** HIGH (based on direct codebase analysis and prior expansion history in Phases 87/88)

---

## Critical Pitfalls

### Pitfall 1: BIOME_SPAWN_CONFIGS and ENTITY_IDS Desync

**What goes wrong:**
A new entity is added to a definitions file (e.g. `exotic-creatures.ts`) and registered in `ALL_ENTITIES`, but its ID constant is missing from `ENTITY_IDS` in `definitions/index.ts`, OR it's in `ENTITY_IDS` but not wired into `BIOME_SPAWN_CONFIGS` in `packages/world-gen/src/generation/spawn.ts`. The entity exists in the registry but never spawns in the world. Players can receive loot table references to it from other mechanics, but the world never generates it. This is a silent failure — no error is thrown.

**Why it happens:**
The content pipeline has three separate locations that must be updated atomically: (1) the definition file, (2) the `ENTITY_IDS` constants map in `definitions/index.ts`, and (3) the `BIOME_SPAWN_CONFIGS` object in `spawn.ts`. The definition and `ENTITY_IDS` are co-located in the same package (`packages/entities`), but `spawn.ts` is in `packages/world-gen` — a separate package across a package boundary. When adding 20-40 entities in one phase, the world-gen step is consistently missed because there is no compile-time enforcement. Phase 88 added 4 creatures but wiring them to `BIOME_SPAWN_CONFIGS` required a separate step visible in the phase history comment `// Phase 88 starfall_crater and ancient_ruins creatures`.

**How to avoid:**
Write the definition, the `ENTITY_IDS` entry, and the `BIOME_SPAWN_CONFIGS` entry as one atomic unit. Add a CI validation script (or test) that asserts: every entity ID registered in `EntityRegistry` that is spawnable (not an artifact with `respawns: false` set) appears as a spawn entry in at least one biome's `creatures`, `minerals`, or `plants` array in `BIOME_SPAWN_CONFIGS`. Fail the build if any registered spawnable entity is absent.

**Warning signs:**
- Entity count in `EntityRegistry` grows but observed active world entity counts stay flat
- Console warnings `Unknown entity ID: "creature_xxx", using fallback` appear after fresh chunk generation
- `ENTITY_IDS` constant count and total `BIOME_SPAWN_CONFIGS` creature/plant/mineral entries are mismatched when counted
- `getBiomeCreatures(biome)` returns fewer IDs than expected for a biome

**Phase to address:**
First entity definition phase. Establish the validation check before writing any new definitions.

---

### Pitfall 2: Loot Table Orphaning — Creature Exists but Drops Nothing

**What goes wrong:**
A creature is defined and spawns correctly. When it is killed, `getCreatureLoot(lootTableId)` returns an empty array because the `lootTableId` (convention: `loot_<entity_id>`) is not registered in `CREATURE_LOOT_TABLES` in `packages/game-logic/src/loot/creature-loot.ts`. The creature drops nothing. No error is thrown anywhere in the call chain. Players experience kills with zero drops — the reward loop breaks silently.

**Why it happens:**
The `lootTableId` field on `CreatureDefinition` is a forward reference by convention — the entity definition sets `lootTableId: 'loot_creature_xxx'` and trusts that a matching key exists in `CREATURE_LOOT_TABLES`. There is no compile-time validation that this key exists. The entity registry has no knowledge of the loot system. When adding 40+ creatures across multiple definition files, loot entries are commonly skipped in the rush to finish the entity batch and added "later" — which doesn't happen.

**How to avoid:**
Add an `entity-loot-validation.test.ts` test alongside the existing `packages/items/src/__tests__/item-validation.test.ts`. Import `ALL_ENTITIES`, filter to creatures only, and assert that every creature's `lootTableId` has an entry in `CREATURE_LOOT_TABLES`. This pattern already exists for item stats — extend it to loot coverage. The test fails at build time before any player encounters missing drops.

**Warning signs:**
- No items drop from any new creatures after expansion
- `getCreatureLoot('loot_creature_new_xxx')` returns `[]` when tested in isolation
- Combat log shows kills but inventory never gains items
- Existing creatures still drop normally; only new entities are affected

**Phase to address:**
First entity definition phase. Write the validation test before or alongside the first creature batch to prevent regression as more creatures are added.

---

### Pitfall 3: Faction Gear Identity Collapse — All Factions Receive Identical Ability Sets

**What goes wrong:**
Faction-specific suits (Verdant Dynamics biotech, Helix Extraction industrial, Nexus Frontiers surveillance) are distinguished by lore flavor text and color values alone. The `grantedAbilities` array is copy-pasted from the nearest rarity-equivalent generic suit. Players equipping the Verdant Biotech Suit and the Nexus Combat Frame discover they grant identical ability pools. Faction choice feels cosmetic rather than mechanically meaningful. This directly contradicts the lore requirement that factions have distinct identities (from `CLAUDE.md`: "lore is non-negotiable, source of truth").

**Why it happens:**
The `generateSuitStats()` utility handles stat distribution by archetype, making stat differentiation easy. But `grantedAbilities` is manually specified per item — there is no enforcement mechanism. The 21 existing abilities (`nano_repair`, `emergency_shield`, `magnetic_field`, etc.) were designed for generic suits and are not faction-exclusive. Under time pressure, authors copy the nearest rarity-equivalent suit's abilities rather than designing faction-specific pools. The lore specifies faction identity thematically but the code doesn't enforce it mechanically.

**How to avoid:**
Before writing a single faction item definition, define the faction ability assignment matrix:
- **Verdant Dynamics** (biotech/ecology): `regeneration_protocol`, `analyze_specimen`, `resource_scan` as staples; biotech suits should not grant `magnetic_field` or `fortify_systems`
- **Helix Extraction** (industrial/mining): `nano_repair`, `fortify_systems`, gathering-bonus abilities; extraction focus means survival-over-offense
- **Nexus Frontiers** (surveillance/combat): `overclock`, `magnetic_field`, offensive abilities; tactical-first playstyle

Each faction suit tier should unlock at least one ability not present on the equivalent non-faction suit at that tier. Review all faction item `grantedAbilities` against the matrix before any definition is written.

**Warning signs:**
- Faction suit definitions share identical `grantedAbilities` arrays with each other or with non-faction suits
- No new ability IDs are created during the faction gear phase — only reshuffling of existing 21
- Lore team notes that suit descriptions mention faction-specific technology but mechanics don't reflect the distinction

**Phase to address:**
Faction gear planning phase — resolve the ability assignment matrix before writing any item definitions.

---

### Pitfall 4: Stat Budget Inflation Breaks Combat Balance at Exotic/Legendary Tier

**What goes wrong:**
New faction exotic/legendary suits are added at Tier III-IV using `generateSuitStats()` with the correct archetype and rarity. At Tier IV Legendary the formula yields approximately 1694 total stats from the suit alone (`77 * 4.0 * 5.5`). Combined with 6 module slots on legendary suits, each potentially adding hundreds more stats, the total stat budget at endgame exceeds what the combat system's TTK was designed for. Elite-geared players one-shot Tier III content and become unkillable against all existing enemies. Balance requires either a full gear rebalance or emergency nerfs that invalidate player investment.

**Why it happens:**
The `generateSuitStats()` function uses a fixed formula with no safety ceiling relative to combat constants. The combat system's TTK was balanced against items that existed at the time of calibration. Adding more exotic/legendary items at the high end of the power curve does not break the formula's internal consistency — the math is correct — but it breaks the external invariant that endgame items don't trivialize Tier III content. The `STAT_RARITY_MULTIPLIERS` and `TIER_MULTIPLIERS` in `utils.ts` compound multiplicatively, so new items at the intersection of high rarity and high tier are disproportionately powerful.

**How to avoid:**
Before writing exotic/legendary item definitions, document the current best-in-slot endgame stat total using existing items. Define a target TTK range for Tier IV content (e.g. "a fully exotic-geared player should require 3-5 combat exchanges to kill a Tier IV predator"). Run the stat math for planned items and verify the combined suit + module budget stays within that window. Consider a `baseBudget` cap for faction exotic/legendary suits below the generic item equivalent — faction flavor justifies this as "purpose-built" versus "generalist" design.

**Warning signs:**
- Test character with new best-in-slot gear one-shots enemies that should require multiple exchanges
- Healing from `regeneration_protocol` at endgame levels exceeds incoming damage from Tier IV creatures
- Player feedback that new Tier III zones feel "trivial" immediately after the expansion

**Phase to address:**
Before writing exotic/legendary item definitions. A stat budget audit against existing combat constants must precede the definition work.

---

### Pitfall 5: Biome Identity Dilution — Behavior-Identical Creatures Added to Same Biome

**What goes wrong:**
To reach the "4-6 creatures per biome" target, multiple creatures with the same behavior profile are added to the same biome to fill the quota. Void Plains ends up with 3 herbivores that behave identically (idle wander, never attack). Crystal Caves receives 2 additional predators indistinguishable from the existing Crystal Hunter. Players experience the biome as monotonous — more creatures are present but all interactions feel the same. The content expansion registers as padding rather than new gameplay.

**Why it happens:**
The `CreatureDefinition.behavior` field is a 4-value enum (`herbivore / omnivore / predator / maniac`). All AI behavior at the game-server level is determined entirely by this field. Adding creatures with the same behavior in the same biome produces mechanically identical encounters. Differentiation comes only from stats (level range, baseHealth) and loot tables — which players don't notice until they examine their inventory. When designing 40+ creatures under time pressure, filling biome creature slots by behavior-matching is the path of least resistance.

**How to avoid:**
For each biome reaching its creature target, define a behavioral matrix before writing definitions:
- `biome → creature 1: herbivore, levels 1-5, drops common materials`
- `biome → creature 2: predator, levels 5-12, drops biome reagent`
- `biome → creature 3: omnivore, levels 8-15, drops consumables`
- `biome → creature 4: predator (apex), levels 15-25, high HP, rare loot`

No two creatures in the same biome should share the same `behavior` field unless they occupy clearly separated level ranges. Verify the matrix as a planning artifact before any definitions are written.

**Warning signs:**
- A biome's creature list has 3+ entries with the same `behavior` value
- New creatures in a biome share the same `baseXp` tier bracket
- Loot tables across a biome's new creatures reference the same item pool with no unique drops

**Phase to address:**
Entity definition planning phase — create the per-biome behavioral matrix before writing any definitions.

---

### Pitfall 6: ITEM_IDS Constants Stale After Faction Gear Addition

**What goes wrong:**
Faction items are defined in new files (e.g. `faction-suits.ts`) and added to `ALL_ITEMS`, but the corresponding string constants are not added to `ITEM_IDS` in `packages/items/src/definitions/index.ts`. Code that references items by constant — loot tables, NPC trader inventories, quest rewards — cannot use the new items safely. Developers use hardcoded string literals instead of constants, introducing typo-prone coupling. A future rename of an item ID breaks all hardcoded references silently at runtime rather than at compile time.

**Why it happens:**
`ITEM_IDS` is manually maintained and was extended in Phase 87 for aquatic/exotic items. The pattern requires intentional effort per batch. When adding 30+ items across 3 factions and multiple tier files, the `ITEM_IDS` update is deferred to last (or omitted). The items function correctly via `ItemRegistry.get()` — they just cannot be referenced by compile-time safe constants, making them second-class citizens in the codebase.

**How to avoid:**
Add a CI test that asserts every item ID in `ALL_ITEMS` has a corresponding entry in `ITEM_IDS`. The test is O(n) and trivial — import both, compare the key sets, assert no item ID is absent from `ITEM_IDS`. Run this test alongside the existing `item-validation.test.ts` in the items package test suite.

**Warning signs:**
- New item definitions exist in the registry but `ITEM_IDS.FACTION_SUIT_VERDANT_XXX` does not autocomplete in the IDE
- Loot tables for new faction creatures reference faction items with raw string literals
- Searching for a new item ID finds the definition file and string literals, but no constant reference
- `ENTITY_IDS` constant count exceeds `ITEM_IDS` constant count by more than the ratio of prior phases

**Phase to address:**
Faction item definition phase. Add the validation test before writing any faction item definitions.

---

### Pitfall 7: Harvest Yield References Non-Existent Item IDs

**What goes wrong:**
New plant and mineral definitions include `harvestYield` and `miningYield` arrays with `itemId` fields referencing items that haven't been created yet, or where the ID string has a typo. `rollLootTable()` executes without error — it creates inventory entries with the given `itemId`, but `ItemRegistry.get(itemId)` returns the magenta fallback item with `id: 'unknown'`. Players receive "Unknown Item" drops from gathering. Since `rollLootTable()` has no validation and the registry returns gracefully, no runtime error surfaces.

**Why it happens:**
Plant/mineral `harvestYield` entries are written alongside the entity definition, often before the yielded item definition exists. When adding 30+ gatherables in one batch, the item definitions for their yields (new world-items and reagents) are written in parallel or afterward. IDs are typed from memory, introducing typos. The `world-item` and `reagent` IDs from the existing 122-item catalog are long strings (`world_organic_material_common`, `reagent_crystalline_dust`) that are easy to mistype.

**How to avoid:**
Add a validation test that: imports `ALL_ENTITIES`, filters to plants and minerals, then for each `harvestYield` or `miningYield` entry asserts `ItemRegistry.has(entry.itemId) === true`. Run this test in CI. Additionally, use `ITEM_IDS` constants in yield definitions rather than string literals where the item already exists, for immediate IDE validation.

**Warning signs:**
- Gathered items show as "Unknown Item" with a magenta color in inventory
- `ItemRegistry.get('world_new_mineral_drop')` returns `UNKNOWN_ITEM` with console warning
- Items obtained from gathering don't match the entity's `harvestYield` description

**Phase to address:**
Plant and mineral definition phases. The test catches typos and missing item definitions immediately.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copying `grantedAbilities` from nearest rarity-equivalent generic suit | Fast faction item authoring | Faction gear feels identical; undermines faction choice at the most visible layer | Never for faction-specific items |
| Using `world_organic_material_common` as the only creature drop | Simple loot table authoring | Creature kills become economically undifferentiated; no reason to target specific biomes | Only for Tier I background creatures if biome-exclusive items exist on other biome creatures |
| Hardcoding item ID strings in `harvestYield` instead of using `ITEM_IDS` constants | Faster to type when constant doesn't exist yet | Silent breakage on ID rename; no IDE navigation; typos undetected | Never in production code — if the item isn't defined yet, create the item first |
| Using the same `textureKey` for different faction suits | No new sprite work required | All faction suits look identical until art pipeline; faction visual identity is invisible to players | Acceptable for v1.23 if a naming convention is maintained that allows future swaps without definition edits |
| Adding all new entities for a biome-group into one large file | Fewer files to create | Files exceeding ~400 lines become unwieldy for review; the existing `creatures.ts` is already 364 lines | Split by biome group (terrestrial / aquatic / exotic / faction) — existing pattern is the correct one |
| Omitting artifact definitions until all creatures/plants/minerals are done | Faster creature-first delivery | Artifacts are the primary exploration discovery reward; biomes feel incomplete without them; catching up later means biome spawn configs need multiple edits | Never — artifacts should be added in the same pass as their biome's other entities |

---

## Integration Gotchas

Common mistakes when connecting to the existing systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `BIOME_SPAWN_CONFIGS` (world-gen package) | Adding entity to definitions without updating the spawn config — entity exists in registry but never generates in the world | For every new spawnable entity, add it to the corresponding biome's config in `spawn.ts` in the same commit as the definition |
| `CREATURE_LOOT_TABLES` (game-logic package) | Creature's `lootTableId` has no matching key in the Map — `getCreatureLoot()` silently returns `[]` | Write the `CREATURE_LOOT_TABLES` entry in `creature-loot.ts` as part of each creature definition, not as a separate batch afterward |
| `EntityRegistry.registerAll()` (entities/definitions/index.ts) | New definition file exports `ALL_XXX` array but is not spread into `ALL_ENTITIES` | Always update `ALL_ENTITIES` in `definitions/index.ts` when adding a new definitions file |
| `ItemRegistry.registerAll()` (items/definitions/index.ts) | New item file exports `ALL_XXX` array but is not spread into `ALL_ITEMS` | Always update `ALL_ITEMS` in `definitions/index.ts` when adding a new item definitions file |
| Faction suit `grantedAbilities` | Referencing an ability ID that doesn't exist in the abilities registry — equipping the suit silently ignores the unknown ability | Cross-reference all `grantedAbilities` values against the 21 existing ability IDs before writing item definitions |
| `generateSuitStats()` tier parameter | Passing `tier: 3` for a `requiredLevel: 35` item (which is Tier IV) — the function does not validate tier against required level | Use the level-to-tier mapping: L1-10=T1, L11-20=T2, L21-30=T3, L31-40=T4, L41-50=T5 |
| Rarity system (items vs. entities) | `ItemRarity` in `packages/items` excludes `uncommon` but `NodeRarity` in shared-types may include it; mixing the types causes TypeScript errors | Use `ItemRarity` for all item definitions; use `NodeRarity` only for entity `rarity` fields on plants/minerals |

---

## Performance Traps

Patterns that work at small scale but fail as content grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Linear scan in `EntityRegistry.getByBiome()` | Spawn generation latency increases linearly with entity count | Current implementation is a linear filter over all registered entities — acceptable at 92 entities but degrades at scale | Likely around 250-300 registered entities if called every chunk load; monitor chunk gen time |
| `BIOME_SPAWN_CONFIGS` `weightedPick()` called per-spawn with large creature arrays | Weighted pick is O(n) per call — marginal at 6 entries per biome | Acceptable for expected scale; cache total weights per biome if chunk gen time exceeds 50ms | Not a practical concern at planned scale (15 biomes × 6 creatures = 90 pick candidates maximum) |
| `CREATURE_LOOT_TABLES` Map growing to 100+ keys | None — Map lookup is O(1) | Not a trap at content-expansion scale | Never a runtime performance concern |
| TypeScript compilation with 200+ entries in `ITEM_IDS` | Compile time increases slightly (~1s per 100 additional entries) | Split constants into domain-specific files if total exceeds 400 | Build time, not runtime; acceptable trade-off for type safety |
| Loot table entries with very high `chance` values (>0.8) for multiple items | Inventory fills rapidly; players always have maximum stack of common materials; value deflates | Keep at most one item at >0.7 chance per loot table; the pattern in `creature-loot.ts` demonstrates this correctly | Content design issue, not a code performance issue |

---

## UX Pitfalls

Common user experience mistakes in content expansion.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Faction suits have no visual distinction (same `textureKey` pointing to same sprite) | Players cannot identify faction gear in the world or other players' equipment panels | Use distinct `textureKey` values per faction (even pointing to the same placeholder) — enables art pipeline swap without definition edits |
| Endgame exotic/legendary items are exclusively gated behind Tier IV zones | Players who cannot survive Tier IV never access endgame content; a progression wall exists | Provide at least one exotic item obtainable via a high-difficulty Tier III mechanism (epic artifact, rare creature) — the hardest path should not be the only endgame path |
| Every new biome creature drops the same generic materials (`world_organic_material_common`) | Players feel no motivation to target specific biomes or creature types | Each biome should have at least one creature with a biome-exclusive reagent or material drop — drives targeted play |
| Artifact count per biome is 1 and `respawns: false` — discovered once and gone | Artifacts feel like a one-time novelty; biome loses a discovery hook permanently | Maintain `respawns: false` correctly but ensure at least 2 distinct artifact types per biome — finding the second is still a meaningful event |
| Faction gear sold at hub traders requires faction reputation (a future feature out of v1.23 scope) | Players see faction gear in trader UI but cannot purchase it — breaks the expansion's promise | For v1.23, sell faction gear via existing trader system with level gates only; reputation gating is explicitly listed as out of scope in `PROJECT.md` |
| New Tier I-II creatures in existing biomes are harder than current Tier I-II creatures | New players arriving in familiar biomes encounter unexpected difficulty | When adding creatures to biomes that already have Tier I-II content, verify the `levelRange` and `baseHealth` of new additions don't exceed the existing bracket's ceiling |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **New creature definition:** Entity defined and in `ALL_ENTITIES` — verify: ID in `ENTITY_IDS`, entry in `BIOME_SPAWN_CONFIGS`, entry in `CREATURE_LOOT_TABLES`
- [ ] **New plant definition:** Entity defined and in `ALL_ENTITIES` — verify: ID in `ENTITY_IDS`, entry in biome `plants` array in `BIOME_SPAWN_CONFIGS`, all `harvestYield[].itemId` values resolve in `ItemRegistry`
- [ ] **New mineral definition:** Entity defined and in `ALL_ENTITIES` — verify: ID in `ENTITY_IDS`, entry in biome `minerals` array in `BIOME_SPAWN_CONFIGS`, all `miningYield[].itemId` values resolve in `ItemRegistry`
- [ ] **New artifact definition:** Entity defined with `respawns: false` — verify: entry in biome `artifacts` array in `BIOME_SPAWN_CONFIGS`, `lootTableId` has an entry in `CREATURE_LOOT_TABLES` (artifacts use the same loot mechanism on discovery)
- [ ] **New faction suit:** Item defined and in `ALL_ITEMS` — verify: distinct `textureKey` per faction, all `grantedAbilities` reference existing ability IDs, entry in `ITEM_IDS` constants, `generateSuitStats()` uses correct `tier` for the item's `requiredLevel`
- [ ] **New faction tool:** Item defined — verify: `toolType` matches faction identity (Helix=mining/demolition, Verdant=bio/research, Nexus=combat/stealth), entry in `ITEM_IDS` constants
- [ ] **Loot completeness:** After adding all creatures — verify: run loot validation test, zero creatures return empty loot from `getCreatureLoot()`
- [ ] **ENTITY_IDS / ITEM_IDS sync:** After adding all definitions — verify: CI test confirms every new entity and item ID appears in its corresponding constants map
- [ ] **Harvest yield validity:** After adding all plants and minerals — verify: validation test confirms all `harvestYield` and `miningYield` item IDs resolve in `ItemRegistry`
- [ ] **Biome behavior matrix:** After adding all creatures — verify: no biome has 3+ creatures sharing the same `behavior` value unless they occupy separated level ranges

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| BIOME_SPAWN_CONFIGS desync (entities don't spawn) | LOW | Add missing entries to `spawn.ts`; no DB migration needed; effect visible on next chunk generation |
| Loot table orphaning (creatures drop nothing) | LOW | Add missing entries to `creature-loot.ts`; takes effect immediately on next kill |
| Faction gear identity collapse (all factions mechanically same) | HIGH | Requires new ability design + definition updates across all faction items + communication to existing players about ability grant changes; cannot be done silently |
| Stat budget inflation causing combat imbalance | MEDIUM | Reduce `baseBudget` parameter in `generateSuitStats()` calls for affected items; may require re-equip notification to affected players if stats are cached in DB |
| Stale `ITEM_IDS` (hardcoded strings in loot tables) | MEDIUM | Grep for string literals of new item IDs, replace with constants; refactor is mechanical but touches multiple files including `creature-loot.ts` and potentially NPC definitions |
| Biome identity dilution (boring creature roster) | MEDIUM | Remove redundant creature entries from `BIOME_SPAWN_CONFIGS`; may need to remove definition from `ALL_ENTITIES` if the slot is being reused for a more distinct design |
| Harvest yield typos (players receive Unknown Items) | LOW | Fix the typo in `harvestYield` or `miningYield`; effect is immediate; no migration needed unless items are already in player inventories |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| BIOME_SPAWN_CONFIGS / ENTITY_IDS desync | First entity definition phase | CI validation script asserts every registered spawnable entity appears in at least one biome's spawn config |
| Loot table orphaning | First entity definition phase | `entity-loot-validation.test.ts` runs in CI; all creatures have non-empty loot table entries |
| Faction gear identity collapse | Faction gear planning phase (before definitions) | Per-faction ability matrix document approved; no two factions share the exact same `grantedAbilities` array |
| Stat budget inflation | Before exotic/legendary item definitions | TTK audit: document current best-in-slot stat envelope; new items verified to stay within the defined TTK window |
| Biome identity dilution | Entity definition planning phase | Per-biome behavioral matrix lists unique behavior roles; no duplicate behaviors in same biome unless separated by level range |
| ITEM_IDS constants stale | Faction item definition phase | CI test: every item in `ALL_ITEMS` has a constant in `ITEM_IDS` |
| Harvest yield references invalid IDs | Plant and mineral definition phase | Validation test: all `harvestYield` and `miningYield` item IDs resolve in `ItemRegistry.has()` |

---

## Sources

- Direct codebase analysis: `packages/entities/src/definitions/` (all files), `packages/items/src/definitions/` (all files), `packages/game-logic/src/loot/creature-loot.ts`, `packages/world-gen/src/generation/spawn.ts`, `packages/entities/src/registry.ts`, `packages/items/src/registry.ts`, `packages/items/src/utils.ts`
- Existing validation patterns: `packages/items/src/__tests__/item-validation.test.ts` (CONT-01 through CONT-05)
- Phase history in `packages/entities/src/definitions/creatures.ts` — comment `// ===== PHASE 88 ADDITIONS =====` shows the three-location update requirement was already a source of friction
- ESLint rule in `eslint-rules/no-legacy-stat-buff.ts` — confirms stat schema evolution is a real historical pitfall that required tooling to enforce
- Lore constraints in `CLAUDE.md` — faction identity is non-negotiable; lore is the source of truth
- Phase 87/88 expansion in `packages/entities/src/definitions/index.ts` — comment `// Total: ~92 entities` and file structure shows the biome-grouped file convention established as prior art

---
*Pitfalls research for: content expansion & faction gear (v1.23 milestone)*
*Researched: 2026-02-27*
