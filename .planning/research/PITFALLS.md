# Pitfalls Research

**Domain:** MMO content expansion — adding 100+ entity/item definitions and faction equipment to an existing sci-fi survival game
**Researched:** 2026-03-02
**Confidence:** HIGH (based on direct codebase analysis, prior expansion history in Phases 87/88, and domain patterns from MMO industry)

---

## Critical Pitfalls

### Pitfall 1: BIOME_SPAWN_CONFIGS and ENTITY_IDS Desync

**What goes wrong:**
A new entity is added to a definitions file (e.g. `exotic-creatures.ts`) and registered in `ALL_ENTITIES`, but its ID constant is missing from `ENTITY_IDS` in `definitions/index.ts`, OR it is in `ENTITY_IDS` but not wired into `BIOME_SPAWN_CONFIGS` in `packages/world-gen/src/generation/spawn.ts`. The entity exists in the registry but never spawns in the world. Players may receive loot table references to it from other mechanics, but the world never generates it. This is a silent failure — no error is thrown.

**Why it happens:**
The content pipeline has three separate locations that must be updated atomically: (1) the definition file, (2) the `ENTITY_IDS` constants map in `definitions/index.ts`, and (3) the `BIOME_SPAWN_CONFIGS` object in `spawn.ts`. The definition and `ENTITY_IDS` are co-located in the same package (`packages/entities`), but `spawn.ts` is in `packages/world-gen` — a separate package across a package boundary. When adding 20-40 entities in one phase, the world-gen step is consistently missed because there is no compile-time enforcement. Phase 88 added 4 creatures but wiring them to `BIOME_SPAWN_CONFIGS` required a separate step, visible in the phase history comment `// Phase 88 starfall_crater and ancient_ruins creatures` in `definitions/index.ts`.

**How to avoid:**
Write the definition, the `ENTITY_IDS` entry, and the `BIOME_SPAWN_CONFIGS` entry as one atomic unit per entity. Add a CI validation test that asserts every entity ID registered in `EntityRegistry` that is spawnable (not an artifact with `respawns: false`) appears as a spawn entry in at least one biome's creatures, minerals, or plants array in `BIOME_SPAWN_CONFIGS`. Fail the build if any registered spawnable entity is absent.

**Warning signs:**
- Entity count in `EntityRegistry` grows but observed active world entity counts stay flat
- Console warnings `Unknown entity ID: "creature_xxx", using fallback` appear after fresh chunk generation
- `ENTITY_IDS` constant count and total `BIOME_SPAWN_CONFIGS` entries are mismatched when counted manually
- `getByBiome(biome)` returns fewer entity types than the biome's intended roster

**Phase to address:**
First entity definition phase. Establish the validation check before writing any new definitions.

---

### Pitfall 2: Loot Table Orphaning — Creature Exists but Drops Nothing

**What goes wrong:**
A creature is defined and spawns correctly. When it is killed, `getCreatureLoot(lootTableId)` returns an empty array because the `lootTableId` (convention: `loot_<entity_id>`) is not registered in `CREATURE_LOOT_TABLES` in `packages/game-logic/src/loot/creature-loot.ts`. The creature drops nothing. No error is thrown anywhere in the call chain. Players experience kills with zero drops — the reward loop breaks silently.

**Why it happens:**
The `lootTableId` field on `CreatureDefinition` is a forward reference by convention — the entity definition sets `lootTableId: 'loot_creature_xxx'` and trusts that a matching key exists in `CREATURE_LOOT_TABLES`. There is no compile-time validation that this key exists. The entity registry has no knowledge of the loot system. When adding 40+ creatures across multiple definition files, loot entries are commonly skipped during the definition batch and added "later" — which does not happen under delivery pressure. The `CREATURE_LOOT_TABLES` file is in a completely separate package (`game-logic`) from the entity definitions (`entities`), reinforcing the forgetting pattern.

**How to avoid:**
Add an `entity-loot-validation.test.ts` test alongside the existing `packages/items/src/__tests__/item-validation.test.ts`. Import `ALL_ENTITIES`, filter to creatures only, and assert that every creature's `lootTableId` has an entry in `CREATURE_LOOT_TABLES`. This pattern already exists for item stats — extend it to loot coverage. Write the `CREATURE_LOOT_TABLES` entry in `creature-loot.ts` atomically with the creature definition (same PR/commit), not as a deferred batch.

**Warning signs:**
- No items drop from any new creatures after expansion
- `getCreatureLoot('loot_creature_new_xxx')` returns `[]` when tested in isolation
- Combat log shows kills but player inventory never changes
- Existing creatures (defined before v1.23) still drop normally; only new entities are affected

**Phase to address:**
First entity definition phase. Write the validation test before or alongside the first creature batch to prevent regression as more creatures are added.

---

### Pitfall 3: Faction Gear Identity Collapse — All Factions Receive Identical Ability Sets

**What goes wrong:**
Faction-specific suits (Verdant Dynamics biotech, Helix Extraction industrial, Nexus Frontiers surveillance) are distinguished by lore flavor text and color values alone. The `grantedAbilities` array is copy-pasted from the nearest rarity-equivalent generic suit. Players equipping the Verdant Biotech Suit and the Nexus Combat Frame discover they grant identical ability pools. Faction choice feels cosmetic rather than mechanically meaningful. This directly contradicts the lore requirement that factions have distinct identities — per `CLAUDE.md`, lore is non-negotiable and is the source of truth.

**Why it happens:**
The `generateSuitStats()` utility handles stat distribution by archetype, making stat differentiation easy. But `grantedAbilities` is manually specified per item — there is no enforcement mechanism. The 21 existing abilities (`nano_repair`, `emergency_shield`, `magnetic_field`, etc.) were designed for generic suits and are not faction-exclusive. Under time pressure, authors copy the nearest rarity-equivalent suit's abilities rather than designing faction-specific pools. The lore specifies faction identity thematically but the code does not enforce it mechanically:
- Verdant Dynamics: bioengineering, ecological harmony, sustainable harvesting — should translate to regeneration, scan, and bio-utility abilities
- Helix Extraction: industrial extraction, heavy machinery, aggressive chemistry — should translate to fortify, repair, and mining-efficiency abilities
- Nexus Frontiers: surveillance, trade networks, risk-taking at the edge — should translate to stealth, overclock, and combat-first abilities

**How to avoid:**
Before writing a single faction item definition, define the faction ability assignment matrix as a planning artifact. Each faction suit tier should unlock at least one ability not present on the equivalent non-faction suit at that tier. Review all faction item `grantedAbilities` arrays against the matrix before any definition is written. If the required distinctive ability does not exist yet among the 21 existing abilities, flag that as a prerequisite — the faction identity requires the ability to exist first.

**Warning signs:**
- Faction suit definitions share identical `grantedAbilities` arrays with each other or with non-faction suits
- No new ability IDs are created during the faction gear phase — only reshuffling of the existing 21
- Lore team notes that suit descriptions mention faction-specific technology ("bio-responsive membranes," "extraction frame reinforcement") but mechanics don't reflect the distinction
- Players on the subreddit cannot answer "what's the mechanical difference between Verdant and Nexus suits"

**Phase to address:**
Faction gear planning phase — resolve the ability assignment matrix before writing any item definitions.

---

### Pitfall 4: Stat Budget Inflation Breaks Combat Balance at Exotic/Legendary Tier

**What goes wrong:**
New faction exotic/legendary suits are added at Tier III-IV using `generateSuitStats()` with the correct archetype and rarity. At Tier IV Legendary the formula yields approximately 1,694 total stats from the suit alone (`77 * 4.0 * 5.5`). Combined with 6 module slots on legendary suits — each potentially adding hundreds more stats from `generateSuitStats()` equivalent module budgets — the total stat envelope at endgame far exceeds what combat TTK was designed for. Elite-geared players one-shot Tier III content and become unkillable against all existing enemies. Balance requires either a full gear rebalance or emergency nerfs that invalidate player investment.

**Why it happens:**
The `generateSuitStats()` function uses a fixed formula with no safety ceiling relative to combat constants. The combat system's TTK was balanced against items that existed at calibration time. Adding more exotic/legendary items at the high end of the power curve does not break the formula's internal consistency — the math is correct by its own rules — but it breaks the external invariant that endgame items do not trivialize Tier III content. The `STAT_RARITY_MULTIPLIERS` and `TIER_MULTIPLIERS` in `utils.ts` compound multiplicatively, so items at the intersection of high rarity and high tier are disproportionately powerful. This is a documented, recurring pattern in MMO expansions: the WoW power creep cycle where each expansion's welfare gear obsoletes prior expansion's best-in-slot, and the ESO powercreep cycle where champion points compound with set bonuses until combat is trivialized.

**How to avoid:**
Before writing exotic/legendary item definitions, document the current best-in-slot endgame stat total using items that exist today. Define a target TTK range for Tier IV content — e.g. "a fully exotic-geared player requires 3-5 combat exchanges to kill a Tier IV predator and can survive approximately 4-6 hits before dying." Run the stat math for planned items and verify the combined suit + module budget stays within that window. Consider reducing the `baseBudget` parameter (currently 77) for faction exotic/legendary suits below the generic item equivalent — faction flavor justifies this as "purpose-built" vs. "generalist" design, and it provides a design lever to differentiate faction gear without breaking the overall power curve.

**Warning signs:**
- Test character with new best-in-slot gear one-shots creatures that should require multiple exchanges
- Healing from `regeneration_protocol` at endgame stat levels exceeds incoming damage from Tier IV creatures
- Player feedback that new Tier III zones feel "trivial" immediately after the expansion
- Power (stat) value of a new legendary suit, when added to a full legendary module loadout, exceeds the power value of the highest-health Tier IV enemy

**Phase to address:**
Before writing exotic/legendary item definitions. A stat budget audit against existing combat constants must precede the definition work.

---

### Pitfall 5: Biome Identity Dilution — Behavior-Identical Creatures Fill the Quota

**What goes wrong:**
To reach the "4-6 creatures per biome" target, multiple creatures with the same behavior profile are added to the same biome to fill the number. Void Plains ends up with 3 herbivores that behave identically — idle wander, never attack. Crystal Caves receives 2 additional predators indistinguishable from the existing Crystal Hunter. Players experience the biome as monotonous — more creatures are present but all interactions feel identical. The content expansion registers as padding rather than new gameplay.

**Why it happens:**
The `CreatureDefinition.behavior` field is a 4-value enum (`herbivore / omnivore / predator / maniac`). All AI behavior at the game-server level is determined entirely by this field. Adding creatures with the same behavior in the same biome produces mechanically identical encounters — differentiation exists only in stats (level range, baseHealth) and loot tables, which players don't notice during combat. When designing 40+ creatures under time pressure, filling biome creature slots by behavior-matching is the path of least resistance because it requires no AI differentiation work. The existing code shows the correct pattern (each biome in `creatures.ts` has a varied behavior spread) but does not enforce it.

**How to avoid:**
For each biome reaching its creature target, define a behavioral matrix before writing definitions — no two creatures in the same biome should share the same `behavior` value unless they occupy clearly separated level ranges (e.g., two predators with level ranges [1-8] and [20-30] occupy different niches). Document the matrix as a planning artifact:
- biome → creature 1: herbivore, levels 1-5, drops common materials
- biome → creature 2: predator, levels 5-12, drops biome reagent
- biome → creature 3: omnivore, levels 8-15, drops consumables
- biome → creature 4: predator (apex), levels 18-28, high HP, rare loot

**Warning signs:**
- A biome's creature list has 3+ entries with the same `behavior` value without separated level ranges
- New creatures in a biome share the same `baseXp` tier bracket as existing creatures of the same behavior
- Loot tables across a biome's new creatures reference the same item pool with no unique drops per creature type

**Phase to address:**
Entity definition planning phase — create the per-biome behavioral matrix before writing any definitions.

---

### Pitfall 6: ITEM_IDS Constants Stale After Faction Gear Addition

**What goes wrong:**
Faction items are defined in new files (e.g. `faction-suits.ts`) and added to `ALL_ITEMS`, but the corresponding string constants are not added to `ITEM_IDS` in `packages/items/src/definitions/index.ts`. Code that references items by constant — loot tables, NPC trader inventories, quest rewards — cannot use the new items safely. Developers use hardcoded string literals instead of constants, introducing typo-prone coupling. A future rename of an item ID breaks all hardcoded references silently at runtime rather than at compile time.

**Why it happens:**
`ITEM_IDS` is manually maintained and was extended in Phase 87 for aquatic/exotic items. The pattern requires intentional effort per batch. When adding 30+ items across 3 factions and multiple tier files, the `ITEM_IDS` update is deferred to last, or omitted. The items function correctly via `ItemRegistry.get()` — they just cannot be referenced by compile-time safe constants, making them second-class citizens in the codebase. The `ENTITY_IDS` constants object has the same pattern and is equally susceptible.

**How to avoid:**
Add a CI test that asserts every item ID in `ALL_ITEMS` has a corresponding entry in `ITEM_IDS`. The test is O(n) and trivial — import both, compare the key sets, assert no item ID is absent from `ITEM_IDS`. Run this test alongside the existing `item-validation.test.ts` in the items package test suite. Apply the same pattern for `ENTITY_IDS` vs. `ALL_ENTITIES`.

**Warning signs:**
- New item definitions exist in the registry but `ITEM_IDS.FACTION_SUIT_VERDANT_XXX` does not autocomplete in the IDE
- Loot tables for new faction creatures reference faction items with raw string literals rather than `ITEM_IDS` constants
- Searching for a new item ID finds the definition file and string literals, but no constant reference
- `ITEM_IDS` key count is significantly lower than `ALL_ITEMS.length`

**Phase to address:**
Faction item definition phase. Add the validation test before writing any faction item definitions.

---

### Pitfall 7: Harvest Yield References Non-Existent Item IDs

**What goes wrong:**
New plant and mineral definitions include `harvestYield` and `miningYield` arrays with `itemId` fields referencing items that have not been created yet, or where the ID string has a typo. `rollLootTable()` executes without error — it creates inventory entries with the given `itemId`, but `ItemRegistry.get(itemId)` returns the magenta fallback item with `id: 'unknown'`. Players receive "Unknown Item" drops from gathering. Since `rollLootTable()` has no validation and the registry returns gracefully, no runtime error surfaces.

**Why it happens:**
Plant and mineral `harvestYield` entries are written alongside the entity definition, often before the yielded item definition exists. When adding 30+ gatherables in one batch, item definitions for their yields (new world-items and reagents) are written in parallel or afterward. IDs are typed from memory, introducing typos. The existing world-item and reagent IDs from the 122-item catalog are long strings (`world_organic_material_common`, `reagent_crystalline_dust`) that are easy to mistype. The `rollLootTable()` function in `game-logic/src/loot/loot-table.ts` has no validation — it creates inventory items with whatever string is passed.

**How to avoid:**
Add a validation test that imports `ALL_ENTITIES`, filters to plants and minerals, then for each `harvestYield` or `miningYield` entry asserts `ItemRegistry.has(entry.itemId) === true`. Run this test in CI. Additionally, use `ITEM_IDS` constants in yield definitions rather than string literals where the item already exists — this provides immediate IDE validation via TypeScript. If the desired item does not yet exist, create the item definition first, then reference it in the entity's yield array.

**Warning signs:**
- Gathered items show as "Unknown Item" with a magenta color in inventory
- `ItemRegistry.get('world_new_mineral_drop')` returns `UNKNOWN_ITEM` with a console warning
- Items obtained from gathering do not match what the entity's description implies it should drop
- `console.warn` frequency increases after a content patch

**Phase to address:**
Plant and mineral definition phases. The test catches typos and missing item definitions immediately and prevents silent data corruption in player inventories.

---

### Pitfall 8: Lore Incompatibility — Entities or Items Contradict the World Bible

**What goes wrong:**
New entity names, descriptions, or behaviors are written without cross-referencing `lore/world-bible.md` or the faction lore fragments. A creature in Void Plains is given behavior `herbivore` and a peaceful description — but the World Bible states Void Plains is a Tier I zone where "everything here is trying to kill you." A Verdant Dynamics suit description references "heavy extraction plating" — a Helix Extraction trademark. A Nexus Frontiers tool is described as "sustainable harvesting" — a Verdant brand phrase. Lore incompatibility is discovered during final review, requiring mass edits to descriptions across many files.

**Why it happens:**
Content creation at scale means individual entity descriptions are written in isolation, each author working from memory of faction identity rather than the authoritative source. The World Bible is 78KB of dense lore — it is not re-read for every entity. The CLAUDE.md instruction "Always check if the implemented feature is compatible with /lore directory. The information there is non-negotiable" is not enforced by any automated check. The faction lore fragments in `packages/lore/src/fragments/faction-lore.ts` establish identity but are not surfaced during content authoring.

**How to avoid:**
Before writing any entity or item descriptions, create a one-page "content authoring guide" summarizing per-faction language registers and per-biome atmosphere notes extracted from the World Bible:
- Verdant: "ecological," "bioengineered," "sustainable," "symbiotic" — never "industrial," "extracted," "processed"
- Helix: "industrial," "efficient," "high-yield," "durable" — never "organic," "balanced," "natural"
- Nexus: "tactical," "adaptive," "edge-tested," "opportunistic" — never "sustainable," "green," "precision-engineered"
- Biome tone must match World Bible survival tier — Tier I entities can be docile; Tier IV entities are never peaceful

For every new entity: verify behavior matches the World Bible's biome fauna description, verify names use naming conventions consistent with existing entities in that biome.

**Warning signs:**
- A faction suit description contains language associated with a different faction's brand
- A creature's behavior is `herbivore` in a Tier IV biome (Anomaly Zones explicitly classify herbivores as rare per World Bible)
- Entity display names use Earth-native animal names (`wolf`, `spider`, `bear`) rather than Terminus-appropriate alien taxonomy
- Biome atmosphere in description contradicts the World Bible's established tone for that zone

**Phase to address:**
Before any content authoring. Create the condensed content guide first.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copying `grantedAbilities` from nearest rarity-equivalent generic suit | Fast faction item authoring | Faction gear feels identical; undermines faction choice at the most visible mechanical layer | Never for faction-specific items |
| Using `world_organic_material_common` as the only creature drop | Simple loot table authoring | Creature kills become economically undifferentiated; no reason to target specific biomes | Only for Tier I background creatures if biome-exclusive items exist on other creatures in the same biome |
| Hardcoding item ID strings in `harvestYield` instead of using `ITEM_IDS` constants | Faster to type when constant does not exist yet | Silent breakage on ID rename; no IDE navigation; typos undetected until runtime | Never in production code — if the item is not defined yet, create the item first |
| Using the same `textureKey` for different faction suits | No new sprite work required | All faction suits look identical until art pipeline; faction visual identity is invisible to players | Acceptable for v1.23 if a distinct naming convention is maintained (`item_suit_verdant_bio_xxx` vs `item_suit_helix_ind_xxx`) that allows art swaps without editing definitions |
| Adding all new entities for a biome-group into one large file | Fewer files to create | Files exceeding ~400 lines become unwieldy for code review; the existing `creatures.ts` is already 364 lines | Split by biome group — the existing pattern (`aquatic-creatures.ts`, `exotic-creatures.ts`) is the correct model; create `faction-suits.ts` not a monolithic additions file |
| Omitting artifact definitions until all creatures/plants/minerals are done | Faster creature-first delivery | Artifacts are the primary exploration discovery reward; biomes feel incomplete without them; deferred artifacts require second edits to biome spawn configs | Never — artifacts should be defined and wired in the same pass as their biome's other entities |
| Using identical `requiredLevel` values for all items in a faction tier line | Simplifies the tier map | Players have no reason to replace within-faction items; the tier line collapses to a single upgrade point | Acceptable only if intentional and documented — stagger by 2-3 levels within a tier for a proper upgrade path |

---

## Integration Gotchas

Common mistakes when connecting to the existing systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `BIOME_SPAWN_CONFIGS` (world-gen package) | Adding entity to definitions without updating the spawn config — entity exists in registry but never generates in the world | For every new spawnable entity, add it to the corresponding biome's config in `spawn.ts` in the same commit as the definition |
| `CREATURE_LOOT_TABLES` (game-logic package) | Creature's `lootTableId` has no matching key in the Map — `getCreatureLoot()` silently returns `[]` | Write the `CREATURE_LOOT_TABLES` entry in `creature-loot.ts` as part of each creature definition, not as a deferred batch |
| `EntityRegistry.registerAll()` | New definition file exports `ALL_XXX` array but is not spread into `ALL_ENTITIES` in `definitions/index.ts` | Always update `ALL_ENTITIES` when adding a new definitions file — the Phase 87 aquatic additions demonstrate the correct pattern |
| `ItemRegistry.registerAll()` | New item file exports `ALL_XXX` array but is not spread into `ALL_ITEMS` in `definitions/index.ts` | Always update `ALL_ITEMS` when adding a new item definitions file |
| Faction suit `grantedAbilities` | Referencing an ability ID that does not exist in the abilities registry — equipping the suit silently ignores the unknown ability | Cross-reference all `grantedAbilities` values against the 21 existing ability IDs before writing any item definitions |
| `generateSuitStats()` tier parameter | Passing `tier: 3` for a `requiredLevel: 35` item (which maps to Tier IV) — the function does not validate tier against required level | Use the level-to-tier mapping consistently: L1-10=T1, L11-20=T2, L21-30=T3, L31-40=T4, L41-50=T5 |
| Rarity types | `ItemRarity` in `packages/items` excludes `uncommon` but `NodeRarity` in shared-types includes it; mixing the types causes TypeScript errors | Use `ItemRarity` for all item definitions; use `NodeRarity` only for entity `rarity` fields on plants/minerals |
| `ArtifactDefinition` respawns field | Setting `respawns: true` on an artifact — the type definition enforces `readonly respawns: false` but authors may overlook this constraint | Always set `respawns: false` on all artifact definitions; this is enforced by `ZonesService.createEntityFromSpawn()` |
| Lore compatibility | Writing faction item descriptions without checking `lore/world-bible.md` — descriptions use wrong faction language | Read faction identity sections of World Bible before writing any faction item descriptions |

---

## Performance Traps

Patterns that work at small scale but fail as content grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Linear scan in `EntityRegistry.getByBiome()` | Spawn generation latency increases linearly with entity count | Current implementation is a linear filter over all registered entities — acceptable at 92 entities but degrades at scale | Likely around 250-300 registered entities if called every chunk load; monitor chunk generation time after expansion |
| `BIOME_SPAWN_CONFIGS` `weightedPick()` called per-spawn with large creature arrays | Weighted pick is O(n) per call | Acceptable for expected scale; cache total weights per biome if chunk gen time exceeds 50ms | Not a practical concern at planned scale (16 biomes × 6 creatures = 96 pick candidates maximum) |
| `CREATURE_LOOT_TABLES` Map growing to 150+ keys | None — Map lookup is O(1) | Not a trap at content-expansion scale | Never a runtime performance concern |
| TypeScript compilation with 200+ entries in `ITEM_IDS` and `ENTITY_IDS` | Compile time increases slightly (~1s per 100 additional entries) | Split constants into domain-specific files if total exceeds 400 | Build time only, not runtime; acceptable trade-off for compile-time type safety |
| Loot table entries with very high `chance` values (>0.8) for multiple items simultaneously | Inventory fills rapidly; players always have maximum stacks of common materials; material value deflates | Keep at most one item at >0.7 chance per loot table; the existing entries in `creature-loot.ts` demonstrate the correct pattern | Content design issue that manifests as economy devaluation, not a code performance issue |

---

## UX Pitfalls

Common user experience mistakes in content expansion.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Faction suits have no visual distinction (same `textureKey` pointing to same sprite) | Players cannot identify faction gear in world or in other players' equipment panels | Use distinct `textureKey` values per faction even if pointing to the same placeholder color tile — enables art pipeline swap without definition edits |
| Endgame exotic/legendary items are exclusively gated behind Tier IV zones | Players who cannot survive Tier IV never access endgame content; a hard progression wall exists | Provide at least one exotic item obtainable via a high-difficulty Tier III mechanism (epic artifact, rare creature) — the hardest path should not be the only endgame path |
| Every new biome creature drops the same generic materials (`world_organic_material_common`) | Players feel no motivation to target specific biomes or creature types | Each biome should have at least one creature with a biome-exclusive reagent or material drop — drives targeted play and economic differentiation |
| Artifact count per biome is exactly 1 and `respawns: false` — discovered once and gone | Artifacts feel like a one-time novelty; biome loses a discovery hook permanently | Maintain `respawns: false` correctly but ensure at least 2 distinct artifact types per biome — finding the second is still a meaningful event |
| Faction gear sold at hub traders requires faction reputation (a future feature out of v1.23 scope) | Players see faction gear in trader UI but cannot purchase it — the expansion's primary feature is inaccessible | For v1.23, sell faction gear via existing trader system with level gates only; reputation gating is explicitly listed as out of scope in `PROJECT.md` |
| New Tier I-II creatures in existing biomes are harder than the biome's current occupants | New players arriving in familiar biomes encounter unexpected difficulty; Tier I ceases to be a safe starting experience | When adding creatures to biomes that already have Tier I-II content, verify the `levelRange` and `baseHealth` of new additions do not exceed the existing bracket's ceiling |
| All 30 new items share identical `baseValue` per rarity tier | Economy provides no signal about which items are more useful or sought-after | Scale `baseValue` within a rarity tier based on drop rate rarity — items from rare creatures or hard biomes should have meaningfully higher base values |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **New creature definition:** Entity defined and in `ALL_ENTITIES` — verify: ID in `ENTITY_IDS`, entry in `BIOME_SPAWN_CONFIGS`, entry in `CREATURE_LOOT_TABLES`, lore-compatible behavior and description
- [ ] **New plant definition:** Entity defined and in `ALL_ENTITIES` — verify: ID in `ENTITY_IDS`, entry in biome `plants` array in `BIOME_SPAWN_CONFIGS`, all `harvestYield[].itemId` values resolve in `ItemRegistry`
- [ ] **New mineral definition:** Entity defined and in `ALL_ENTITIES` — verify: ID in `ENTITY_IDS`, entry in biome `minerals` array in `BIOME_SPAWN_CONFIGS`, `requiredTier` matches the biome's tier, all `miningYield[].itemId` values resolve in `ItemRegistry`
- [ ] **New artifact definition:** Entity defined with `respawns: false` — verify: entry in biome `artifacts` array in `BIOME_SPAWN_CONFIGS`, `lootTableId` has an entry in `CREATURE_LOOT_TABLES`, rarity is `rare`, `epic`, `exotic`, or `legendary` per the type constraint
- [ ] **New faction suit:** Item defined and in `ALL_ITEMS` — verify: distinct `textureKey` per faction, all `grantedAbilities` reference existing ability IDs, entry in `ITEM_IDS` constants, `generateSuitStats()` uses correct `tier` for the item's `requiredLevel`, description uses faction-appropriate language from World Bible
- [ ] **New faction tool:** Item defined — verify: `toolType` matches faction identity (Helix=mining/demolition, Verdant=bio/research, Nexus=combat/stealth), entry in `ITEM_IDS` constants, stat profile distinguishes it from generic tools at the same tier
- [ ] **New faction module:** Item defined — verify: stat focus reflects faction's role (Helix=durability/recovery, Verdant=resilience/perception, Nexus=haste/power), entry in `ITEM_IDS` constants
- [ ] **Loot completeness:** After adding all creatures — verify: loot validation test passes, zero creatures return empty loot from `getCreatureLoot()`
- [ ] **ENTITY_IDS / ITEM_IDS sync:** After adding all definitions — verify: CI test confirms every new entity and item ID appears in its corresponding constants map
- [ ] **Harvest yield validity:** After adding all plants and minerals — verify: validation test confirms all `harvestYield` and `miningYield` item IDs resolve in `ItemRegistry`
- [ ] **Biome behavior matrix:** After adding all creatures — verify: no biome has 3+ creatures sharing the same `behavior` value unless they occupy clearly separated level ranges
- [ ] **Stat budget audit:** Before releasing exotic/legendary faction items — verify: combined suit + max module stat envelope for each faction stays within the TTK window documented before the expansion

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| BIOME_SPAWN_CONFIGS desync (entities don't spawn) | LOW | Add missing entries to `spawn.ts`; no DB migration needed; effect visible on next chunk generation |
| Loot table orphaning (creatures drop nothing) | LOW | Add missing entries to `creature-loot.ts`; takes effect immediately on next kill |
| Faction gear identity collapse (all factions mechanically identical) | HIGH | Requires new ability design, definition updates across all faction items, and communication to existing players about ability grant changes; cannot be done silently mid-session |
| Stat budget inflation causing combat imbalance | MEDIUM | Reduce `baseBudget` parameter in `generateSuitStats()` calls for affected items; if stats are cached in the DB for equipped characters, a re-equip notification is needed |
| Stale `ITEM_IDS` (hardcoded strings in loot tables) | MEDIUM | Grep for string literals of new item IDs, replace with constants; refactor is mechanical but touches multiple files including `creature-loot.ts` and NPC trader definitions |
| Biome identity dilution (boring creature roster) | MEDIUM | Remove redundant creature entries from `BIOME_SPAWN_CONFIGS`; may need to remove definition from `ALL_ENTITIES` if the slot is reused for a more distinct design; requires replacing "filler" with actually distinctive content |
| Harvest yield typos (players receive Unknown Items) | LOW | Fix the typo in `harvestYield` or `miningYield`; effect is immediate; no migration needed unless corrupted items are already in player inventories (requires DB cleanup if so) |
| Lore incompatibility in descriptions | LOW | Update description strings in definition files; no mechanical impact, no DB migration |
| Artifact `respawns` set incorrectly | MEDIUM | Fix the definition; if artifacts already spawned in the world with wrong respawn behavior, requires targeted entity cleanup in the DB |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| BIOME_SPAWN_CONFIGS / ENTITY_IDS desync | First entity definition phase | CI validation script asserts every registered spawnable entity appears in at least one biome's spawn config |
| Loot table orphaning | First entity definition phase | `entity-loot-validation.test.ts` runs in CI; all creatures have non-empty loot table entries |
| Faction gear identity collapse | Faction gear planning phase (before any definitions) | Per-faction ability matrix document created; no two factions share the exact same `grantedAbilities` array on equivalent-tier items |
| Stat budget inflation | Before exotic/legendary item definitions | TTK audit: document current best-in-slot stat envelope; new items verified within the defined TTK window |
| Biome identity dilution | Entity definition planning phase | Per-biome behavioral matrix lists unique behavior roles; no duplicate behaviors in same biome unless separated by level range |
| ITEM_IDS constants stale | Faction item definition phase | CI test: every item in `ALL_ITEMS` has a constant in `ITEM_IDS`; every entity in `ALL_ENTITIES` has a constant in `ENTITY_IDS` |
| Harvest yield references invalid IDs | Plant and mineral definition phase | Validation test: all `harvestYield` and `miningYield` item IDs resolve via `ItemRegistry.has()` |
| Lore incompatibility | Before any content authoring | Condensed content authoring guide created from World Bible; reviewed by content authors before first entity is written |

---

## Sources

- Direct codebase analysis: `packages/entities/src/definitions/` (all 12 files), `packages/items/src/definitions/` (all 12 files), `packages/game-logic/src/loot/creature-loot.ts`, `packages/entities/src/registry.ts`, `packages/items/src/registry.ts`, `packages/items/src/utils.ts`
- Existing validation patterns: `packages/items/src/__tests__/item-validation.test.ts` (CONT-01 through CONT-05)
- Phase history comments in `packages/entities/src/definitions/creatures.ts` and `definitions/index.ts` — `// Phase 88 starfall_crater and ancient_ruins creatures` shows the three-location update was already a source of friction
- ESLint rule in `eslint-rules/no-legacy-stat-buff.ts` (referenced in `CLAUDE.md`) — confirms stat schema evolution is a real historical pitfall that required automated tooling to enforce
- Lore constraints in `CLAUDE.md` — "Always check if the implemented feature is compatible with /lore directory. The information there is non-negotiable, and are the source of truth"
- `lore/world-bible.md` — faction identity sections (Part III), biome descriptions with explicit fauna and atmosphere for each of the 16 biomes, behavioral classification system
- Phase 87/88 expansion in `packages/entities/src/definitions/index.ts` — comment `// Total: ~92 entities` and file structure shows the biome-grouped file convention established as working prior art
- `packages/shared-types/src/game/biome.ts` — confirms 16 biome types are defined; BIOME_TIERS maps all 16; only some have sufficient entity coverage
- MMO power creep industry patterns: [Massively Overpowered — Talking about power creep in MMOs](https://massivelyop.com/2025/02/28/vague-patch-notes-talking-about-power-creep-in-mmos/), [MMORPG.com — How Does Power Creep Affect MMO Games?](https://www.mmorpg.com/editorials/how-does-power-creep-affect-mmo-games-2000130636)
- Homogenization design failure pattern: [MMO-Champion — "Homogenization is the bane of game design"](https://www.mmo-champion.com/threads/1840388-quot-Homogenization-is-the-bane-of-game-design-quot-Discussion)

---
*Pitfalls research for: content expansion & faction gear (v1.23 milestone)*
*Researched: 2026-03-02*
