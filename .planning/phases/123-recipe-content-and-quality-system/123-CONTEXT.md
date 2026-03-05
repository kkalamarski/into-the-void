# Phase 123: Recipe Content and Quality System - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Populate the recipe registry with balanced content across all three crafting disciplines (Equipment, Consumables, Reagents), implement proficiency-to-quality calculation with probability rolls, and define faction specialty recipes. This phase creates the data and quality logic — the UI for browsing/crafting is Phase 125.

</domain>

<decisions>
## Implementation Decisions

### Quality Tier Calculation
- **Probability roll** per craft based on proficiency level — not guaranteed thresholds
- Higher-tier recipes have **tighter quality odds** (harder to roll Masterwork on endgame gear)
- At max proficiency (level 50): ~35% Standard / ~50% Refined / ~15% Masterwork (on Tier 1 recipes; odds shift toward Standard on higher tiers)
- Quality stat bonuses are **percentage-based**: Standard = base stats, Refined = +15%, Masterwork = +30%
- Quality applies to **reagent processing too** — Refined reagents exist and affect downstream crafting

### Recipe Volume & Balance
- **8-12 recipes per discipline** (~30 total recipes)
- **Two-step recipe chains**: raw materials → processed reagents → final items
- Crafted items are **NOT sold by traders** — only obtainable through crafting, looting, or player trade
- Balance anchor: **ingredient trader sell value** — output item's value should be 80-120% of total ingredient sell price at traders
- **4-6 new processed reagent items** to serve as intermediates in chains

### Faction Specialty Design
- **Unique faction-only items** — each faction gets exclusive items that can't be obtained any other way
  - Verdant: bio-tech gear (fits lore of bioengineering)
  - Helix: extraction/heavy industrial gear (fits lore of raw exploitation)
  - Nexus: trade/sensor/network gear (fits lore of connectivity)
- **No Unaffiliated specialty recipes** — the trade-off for faction independence is no exclusive crafting; they rely on player trade
- Unlock requires **faction membership + proficiency level gate** (dual requirement)
- Faction items are **tradeable** — only faction members can CRAFT them, but anyone can USE/equip them; creates inter-faction trade economy
- Minimum 3 exclusive recipes per faction (per requirements)

### Unlock Condition Design
- **All recipes are gated** — even Tier 1 requires some unlock condition (no auto-unlocked recipes)
- Distribution: **mostly character level gates**, with quest and POI unlocks reserved for special/notable recipes
- Locked recipes are **visible in the recipe list** with unlock condition shown (greyed out with "Requires Level 10" or "Discover Obsidian Spire")
- POI unlock = **visited once** (entering the POI zone is sufficient, no interaction required)

### Recipe Chain Depth
- **Two-step max**: raw → processed → final
- **Cross-discipline chains**: Reagents discipline processes raw materials into intermediates that Equipment and Consumables disciplines consume
- Reagents discipline is the "supplier" — its processed outputs feed into other disciplines
- Quality tiers apply to processed reagents — using Refined reagents provides quality bonus on final craft

### Discipline Identity
- **Distinct crafting feel** per discipline:
  - Equipment: slow timer (15-30s), expensive ingredients, high-value output (suits, tools, modules)
  - Consumables: fast timer (3-8s), cheap ingredients, high-volume output (health items, buffs, hazard protection)
  - Reagents: medium timer (5-15s), processing raw materials into intermediates for other disciplines
- Clean category separation: each discipline produces its own item category
- **One craft at a time** across all disciplines (existing Phase 122 enforcement)

### Proficiency Progression
- XP **scaled by recipe tier**: higher-tier recipes give more XP (e.g., Tier 1 = 10 XP, Tier 2 = 25 XP, Tier 3 = 50 XP)
- **Keep current XP curve**: `level = floor(sqrt(xp / 100)) + 1`, capped at 50
- **XP decay on low-tier recipes**: if recipe tier is significantly below proficiency level, XP is reduced (e.g., 50% at -5 levels, 25% at -10)
- **Free to specialize** — no cross-discipline bonuses or penalties; players naturally specialize and trade

### Quality Presentation
- Name format: **suffix brackets** — "Iron Pickaxe [Refined]", "Void Suit [Masterwork]"; Standard items show no suffix
- **Text-only quality indicators** — no color coding for quality tiers (colors reserved for item rarity)
- Masterwork is a **prestige achievement**: local notification to crafter + nearby broadcast ("[Player] crafted a Masterwork [Item]!") — social but not server-wide

### Claude's Discretion
- Exact probability curves per tier (anchored at ~15% Masterwork at max level for Tier 1)
- Specific item definitions for faction specialty gear (aligned with faction lore themes)
- Which existing items become craftable vs remain loot-only
- XP decay formula specifics (anchored at 50% at -5 levels, 25% at -10)
- Processed reagent item definitions (4-6 new items)
- Exact ingredient quantities per recipe
- Timer values within the discipline ranges

</decisions>

<specifics>
## Specific Ideas

- Traders should NOT sell craftable output items — crafting, looting, or player trade are the only acquisition paths
- Reagents discipline should feel like a "supplier" role — its products are inputs for Equipment and Consumables
- Faction recipes should reflect lore identity: Verdant = bio-tech, Helix = heavy extraction, Nexus = trade/sensor
- Masterwork celebration should feel earned — nearby broadcast creates social moments without server-wide spam
- Quality on reagents creates a deeper supply chain: Refined reagents → better final items

</specifics>

<deferred>
## Deferred Ideas

- Batch crafting for reagents (process multiples at once) — would need crafting service changes, consider for future phase
- Cross-discipline XP bonuses — revisit if specialization feels too siloed
- Masterwork zone-wide announcements — could upgrade from nearby broadcast if local scope feels too small

</deferred>

---

*Phase: 123-recipe-content-and-quality-system*
*Context gathered: 2026-03-05*
