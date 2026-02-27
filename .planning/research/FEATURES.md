# Feature Research

**Domain:** Sci-fi survival MMO — Content Expansion & Faction Gear (v1.23)
**Researched:** 2026-02-27
**Confidence:** HIGH (lore and codebase are authoritative primary sources; external references MEDIUM)

---

## Context: What Already Exists

This is a content expansion milestone, not a system milestone. The implementation infrastructure is already built. Research focuses on what content to create and how to design it coherently.

**Biome creature inventory (current state across 16 biomes):**

| Biome | Tier | Current Creatures | Gap to Target (4-6) |
|-------|------|-------------------|----------------------|
| void_plains | I | 2 (Void Crawler, Coastal Scuttler) | Need 2-4 more |
| fungal_forest | I | 2 (Canopy Grazer, Spore Carrier) | Need 2-4 more |
| tidal_pools | I | 3 (Tide Crab, Coastal Urchin, Reef Scavenger) | Need 1-3 more |
| miasma_marshes | II | 2 (Marsh Lurker, Miasma Drifter) | Need 2-4 more |
| petrified_expanse | II | 2 (Dart Runner, Petrified Lurker) | Need 2-4 more |
| bioluminescent_depths | II | 3 (Echo Drifter, Phase Grazer, Reality Scavenger) | Need 1-3 more |
| kelp_forests | II | 3 (Kelp Grazer, Tangle Stalker, Current Rider) | Need 1-3 more |
| crystal_caves | II | 2 (Crystal Hunter, Crystal Crawler) | Need 2-4 more |
| toxic_wastes | II/III | 1 (Toxic Lurker) | Need 3-5 more — CRITICAL |
| volcanic_ridge | III | 2 (Magma Beast, Ash Skimmer) | Need 2-4 more |
| frozen_expanse | III | 2 (Frost Stalker, Ice Burrower) | Need 2-4 more |
| crystalline_wastes | III | 3 (Null Feeder, Dimensional Hunter, Rift Hunter) | Need 1-3 more |
| deep_trenches | III | 4 (Pressure Feeder, Trench Hunter, Abyssal Scavenger, Abyssal Leviathan) | At target |
| ancient_ruins | III/IV | 4 (Void Horror, Ruin Seeker, Guardian Construct, Relic Beast) | At target |
| starfall_crater | III/IV | 3 (Starfall Grazer, Crater Stalker + Void Horror shared) | Need 1-3 more |
| void_rift | IV | 4 (Void Grazer, Anomaly Scavenger, Void Stalker, Dimensional Aberration) | At target |

**Faction gear — current state:**
- Zero gear is locked or designated as faction-exclusive
- Faction flavor exists only in item descriptions (not mechanical differentiation)
- Verdant: Environmental Epic (hazmat archetype, req 15) — one suit with flavor mention
- Helix: Reinforced Rare (req 5, tank), Helix Research Frame Exotic (req 25, recon) — two suits
- Nexus: Scout Rare (req 5, scout), Assault Frame Epic (req 18, assault), Nexus Combat Frame Exotic (req 25, combat) — three suits
- No faction-specific modules at any rarity/tier
- No faction-specific tools
- No Unaffiliated-identity gear

**Equipment rarity distribution (22 suits total):**
- Common (6): Generic, no faction identity
- Rare (7): 2 have faction flavor only in description
- Epic (4): 1 Verdant flavor, 1 Nexus flavor
- Exotic (3): 1 Nexus, 1 Helix, 1 neutral Ancient
- Legendary (2): Zero faction identity

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Every biome has 4-6 creatures | Thin biomes feel empty within minutes of exploration; single-creature biomes feel like placeholders | LOW | Pattern established — TypeScript creature definitions follow exact same shape as existing; just more of them |
| Behavior variety per biome (herbivore + predator minimum) | Players expect ecosystems, not monster rooms; docile creatures + threats = world feels alive | LOW | Design constraint — ensure each biome has at least one non-predator alongside predators |
| Tier-appropriate creature stats | Players expect harder biomes to require better gear; flat stats across tiers breaks progression feel | LOW | levelRange, baseHealth, baseXp scaling — the formula exists; apply it consistently |
| Every biome has 3-4 plants with rarity variants | Gathering variety drives session length; rare/epic node variants already established in v1.17 | LOW | Entity definitions same pattern as creatures; epic/rare variants are just stat multipliers on common |
| Every biome has 2-3 minerals with rarity variants | Mineral variety necessary for crafting material diversity across tiers | LOW | Same as plants — definitional work only |
| Every biome has 1-2 artifacts | Artifacts drive exploration and world-building; biomes with zero artifacts feel like they skipped the "world history" layer | LOW | Artifacts are the most underserved category — many biomes have none; adding 1-2 is minimal work for significant feel improvement |
| Faction-branded equipment exists | 4 named factions with zero exclusive gear is conspicuous; players ask "where's my faction stuff?" in any MMO with a faction system | MEDIUM | First faction gear expansion; establishes the pattern for all future faction content |
| Faction gear is mechanically distinct (not just renamed generics) | Purely cosmetic faction gear is the most-cited failure of faction systems (Destiny 2's original faction rally is the cautionary tale) | MEDIUM | Each faction must have a stat archetype identity — different from "Verdant-colored tank suit" |
| Faction gear identifiable by name and color | Players need to read "Verdant Canopy Frame" and know what they're getting without reading the tooltip | MEDIUM | Naming convention + color scheme per faction, derived from lore |
| Endgame (Tier III-IV) faction equipment exists | Endgame-focused players need faction identity in their progression tier; faction gear that tops out at Tier II sends a "faction doesn't matter at endgame" message | MEDIUM | Exotic and legendary faction suits; endgame is the explicit milestone priority |
| New entities are lore-compatible | World-bible.md is non-negotiable (CLAUDE.md mandates this); new creatures must fit Terminus as described | LOW | Check every new entity against world-bible.md before finalizing; the Terminus biome descriptions are detailed enough to derive creature identities |
| Loot tables for every new creature | Without a lootTableId the entity system breaks; this is a code-level requirement, not a design choice | LOW | Every creature definition requires a corresponding loot table entry; this is already enforced by pattern |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but add value beyond user expectations.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Faction gear reflects faction philosophy mechanically | Verdant gear that heals you (sustained survival) vs Helix gear that absorbs damage (brute endurance) vs Nexus gear that lets you see more and move faster (information advantage) — the lore is the mechanical design document | MEDIUM | EVE Online's faction ships are the gold standard: Caldari=missiles+shields, Gallente=drones+armor, Minmatar=speed+versatility, Amarr=lasers+armor; the faction identity *is* the build identity |
| Apex predator per tier-appropriate biome | One creature per biome that is distinctly harder than peers creates milestone moments ("I finally killed the [name]"); makes biomes memorable instead of interchangeable | LOW | Design decision only — name one predator per biome as the hardest; use maniac behavior for the most dangerous examples |
| Ecological food chain logic (biome creatures reference each other's existence) | Herbivore description says it feeds on Biome X's flora; predator description explains it hunts the herbivore; makes the world feel like a real ecosystem rather than a monster list | LOW | Flavor text in description fields; zero implementation cost, high world-building value |
| Creature lore fragments as endgame loot | Rare drop from apex predators unlocks a lore entry describing the creature's relationship to Terminus's history; extends world-building without new systems | LOW | Lore fragment system already exists from v1.17; just new fragment definitions pointing to new lore text |
| Verdant biotech tools with high perception | Verdant's identity as ecological researchers expressed through tools that detect/analyze specimens rather than just extract them | LOW | Perception stat already exists; give Verdant tools higher perception values, name them as environmental scanners |
| Biome artifact tier-appropriate mystery scale | Tier I artifacts: weathered, unclear purpose; Tier IV artifacts: functional, clearly alien, unsettling — the mystery escalates with danger | LOW | Narrative design in description text; zero implementation cost |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Faction gear locked exclusively to faction members | "My faction should have unique stuff no one else can use" | Kills player economy and build experimentation; requires reputation system (explicitly out of scope per PROJECT.md); faction-locked gear without a proper rep system is just arbitrary restriction | Give faction gear strong mechanical identity and naming; allow purchase from faction traders at standard prices; reputation gating deferred to future milestone |
| Faction reputation system (earn faction trust to unlock gear) | Logical next step after faction gear exists | Massive scope — entire new progression loop, UI, database schema, server events; PROJECT.md explicitly marks it out of scope for this milestone | Defer; faction gear in this milestone is sold by faction traders and drops from faction-associated zones; reputation gates faction gear in a future milestone |
| Status effects on new creatures (poison from marsh creatures, freeze from frozen expanse) | Thematic and expected; "marsh creature should poison you" | Status effect system doesn't exist; PROJECT.md explicitly marks it out of scope; implementing status effects as part of a content milestone adds a system milestone's worth of work | Express creature environmental identity through stat choices (high baseHealth for tanky creatures, high XP for dangerous ones), loot (toxic compounds as drops from marsh creatures), and description text |
| Mini-boss encounters with special mechanics | Exciting; "each biome should have a boss" | Requires new AI behaviors (patrol patterns, phase transitions, enrage); none of these exist in the current creature AI | Use maniac behavior for the hardest creature in each biome; maniacs are already the "apex threat" behavior in the system |
| Unique crafting recipes from new creature drops | "Kill the void stalker, craft void armor" | Crafting system doesn't exist; would require a new system milestone | New creature drops enter the existing loot economy as materials and consumables; faction gear crafting is a future system |
| Faction-specific abilities granted by faction gear | "My Verdant suit should grow plants" | Ability system grants abilities by item definition; this technically works but faction-unique abilities (not reusing existing 21) require new ability definitions plus balance testing | Faction gear grants the existing ability set with faction-appropriate selection (Verdant gear: regeneration_protocol + energy_barrier; Helix gear: fortify_systems + power_surge; Nexus gear: overclock + resource_scan) |
| Procedurally generated faction gear | "The world is procedural so gear should vary too" | Item system is definition-based for balance reasons; procedural stats break the careful tier/rarity math in generateSuitStats | Fixed definitions with the existing rarity/tier system; procedural feel comes from finding different tiers of the same faction line |
| Surface faction headquarters with faction-exclusive gear vendors | Players want faction presence in the world, not just orbital | Explicitly out of scope per PROJECT.md: "Surface faction HQs (Canopy, Ironhold, Meridian) — orbital first, surface later" | Faction gear sold by faction NPCs in orbital hubs (already built); surface HQs in a future milestone |

---

## Feature Dependencies

```
[Faction Identity Pillars (design decision)]
    ──enables──> [Faction-specific suits]
    ──enables──> [Faction-specific modules]
    ──enables──> [Faction-specific tools]

[Faction-specific suits]
    └──requires──> [Existing suit infrastructure] (computeIlvl, generateSuitStats — already built)
    └──requires──> [Faction identity pillars established]
    └──enhances──> [NPC trader inventory] (faction suits sold by faction traders in orbital hubs)

[Faction-specific modules]
    └──requires──> [Existing module stat system] (getModuleStats — already built)
    └──requires──> [Faction identity pillars]

[Faction-specific tools]
    └──requires──> [Existing tool stat system] (already built)
    └──requires──> [Faction identity pillars]

[Biome creature population]
    └──requires──> [Loot table per creature] (mandatory — entity system requires lootTableId)
    └──requires──> [Lore compatibility check] (CLAUDE.md: world-bible.md is non-negotiable)
    └──enhances──> [Zone mastery objectives] (more creatures = richer mastery completion)
    └──enhances──> [Creature lore fragments] (apex predators as rare-drop lore sources)

[Biome plant/mineral/artifact population]
    └──requires──> [Same lore compatibility check]
    └──independent of──> [Creature population] (can be written in parallel)

[Endgame Tier III-IV faction gear]
    └──requires──> [Faction identity pillars]
    └──requires──> [Faction-specific suits (lower tiers first for ladder coherence)]
    └──addresses──> [Thin endgame content gap]
```

### Dependency Notes

- **Faction identity pillars must be the first design decision:** Before writing a single item definition, the stat archetype per faction must be agreed upon. This is a pure design decision (see Faction Identity section below). All faction gear flows from it.
- **Biome creature population is fully independent:** Entity definitions don't depend on item definitions. Creature, plant, mineral, and artifact population work can be written concurrently with faction gear.
- **Loot tables must accompany every new creature:** The pattern is mandatory — every CreatureDefinition requires a lootTableId; the loot table entry must exist. Missing loot tables crash entity spawning.
- **Faction gear ladder coherence:** Write Tier I-II faction suits before Tier III-IV to establish the naming and stat progression pattern for each faction. Endgame exotic/legendary suits should feel like the evolution of the common/rare suits.
- **Faction gear sold from existing trader infrastructure:** NPC trader system already handles buying/selling items; faction suits just need to be added to faction trader inventories in hub definitions.

---

## MVP Definition for This Milestone (v1.23)

### Launch With

- [ ] Every biome reaches 4-6 creatures — critical: biomes with 1-2 creatures fail the "populated world" test; toxic_wastes with 1 creature is the most urgent gap
- [ ] Every biome has 2-3 plants with common/rare/epic variants — gathering variety, session length
- [ ] Every biome has 2-3 minerals with variants — crafting material ecosystem
- [ ] Every biome has 1-2 artifacts — artifacts are the most underserved category; lore-critical for world-building
- [ ] Faction identity pillars established and documented (stat archetype + color + naming convention per faction) — design gate for all gear
- [ ] Verdant faction suits: Tier I-IV ladder (at least common + epic + exotic tiers) — Verdant is the most underrepresented faction in gear
- [ ] Helix faction suits: Tier I-IV ladder (at least common + epic + exotic tiers) — fills the power-fantasy gap
- [ ] Nexus faction suits: Tier I-IV ladder — fills out the existing Exotic entry at lower tiers
- [ ] Faction modules: 1-2 per faction spanning rarities — modules complete the gear set
- [ ] Faction tools: 1-2 per faction — tools anchor the faction identity in active play
- [ ] Tier III-IV endgame faction emphasis — exotic/legendary faction suits are the milestone's headline
- [ ] All new entities lore-compatible — CLAUDE.md requirement; non-negotiable

### Add After Validation (v1.x)

- [ ] Unaffiliated gear line — trigger: player feedback that Unaffiliated operatives feel identity-less
- [ ] Faction gear as quest rewards — trigger: quest system milestone that adds faction-reputation quests
- [ ] Faction reputation locking of gear — trigger: faction reputation system milestone

### Future Consideration (v2+)

- [ ] Creature ability system (unique attacks per creature type) — major combat AI extension
- [ ] Biome ecosystem AI (prey fleeing visible predators) — AI behavior overhaul scope
- [ ] Crafting with creature materials — new system
- [ ] Status effects (poison, freeze, burn) — explicitly out of scope per PROJECT.md
- [ ] Surface faction headquarters — explicitly out of scope per PROJECT.md

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Biome creature population (4-6 per biome) | HIGH | LOW | P1 |
| Toxic wastes creature expansion (1 → 4-5) | HIGH | LOW | P1 — most urgent single gap |
| Biome plant population (2-3 per biome) | HIGH | LOW | P1 |
| Biome mineral population (2-3 per biome) | MEDIUM | LOW | P1 |
| Biome artifact population (1-2 per biome) | HIGH | LOW | P1 |
| Faction identity pillar definitions | HIGH | LOW (design only) | P1 |
| Verdant faction suits (all tiers) | HIGH | LOW | P1 |
| Helix faction suits (all tiers) | HIGH | LOW | P1 |
| Nexus faction suits (all tiers) | HIGH | LOW | P1 |
| Faction modules | MEDIUM | LOW | P2 |
| Faction tools | MEDIUM | LOW | P2 |
| Endgame faction gear (exotic/legendary) | HIGH | MEDIUM | P1 |
| Apex predator per biome (design decision) | MEDIUM | LOW | P2 |
| Ecological lore in creature descriptions | MEDIUM | LOW | P2 |
| Unaffiliated gear line | LOW | LOW | P3 |
| Creature lore fragments as rare drops | MEDIUM | LOW | P3 |

**Priority key:**
- P1: Core scope of this milestone; must ship
- P2: Should ship in this milestone if capacity allows
- P3: Nice to have, future milestone

---

## Faction Gear Identity Pillars

Derived exclusively from world-bible.md (lore is the authority). Each faction's real philosophy maps directly to a stat archetype.

### Verdant Dynamics — "Biotech / Organic Resilience"

**Lore basis (world-bible.md):**
- Public: "Harmony with the ecosystem, long-term thinking, responsible stewardship"
- Reality: Bioengineering native species; sustainable = things that keep working over time
- Aesthetic: "Organic curves, living architecture, green and brown color schemes. Their facilities look like they grew rather than were built."
- Medical excellence: Bio-organic retrieval drones; stabilizing gel

**Mechanical translation:** Gear that favors sustained operation over burst capacity. High resilience and recovery. Suits that keep you alive through prolonged encounters rather than ending encounters quickly. The ecosystem sustains itself — Verdant gear does too.

**Stat archetype:** `hazmat` (resilience/recovery) for environmental protection focus; `balanced` for mid-tier generalist; recovery-emphasizing stats at exotic/legendary.

**Ability grants:** `regeneration_protocol`, `energy_barrier`, `nano_repair` — healing and protection over aggression.

**Color palette (lore-anchored):** Greens (0x2a5a2a range), earth browns (0x4a3a1a range), organic bioluminescent accents.

**Naming convention:** Biological/botanical terms — Canopy Frame, Symbiosis Suit, Mycelial Weave, Verdant Field Unit, Biolayer Suit, Verdant Operative Suit.

**Tool character:** Environmental scanners, botanical extractors, bio-specimen collectors. Higher perception stat than equivalent tier generic tools. Verdant tools find and study things.

**Module character:** Life-support arrays, biosupport modules (resilience/recovery). Named as organic systems, not industrial hardware.

### Helix Extraction — "Industrial Brutalism / Power & Endurance"

**Lore basis (world-bible.md):**
- "Exposed metal, warning stripes, machinery that prioritizes function over form"
- Strip-mining, aggressive chemical processing, weaponized Ancient tech research
- "Productivity optimization" — workers pushed to dangerous limits
- Aesthetic: Industrial brutalism; "their facilities look exactly like what they are"
- "Excellent hazard pay and terrible survival odds"

**Mechanical translation:** Maximum power output and toughness. Suits built for hostile extraction environments — they take punishment so the worker can keep extracting. High power and toughness. The philosophy that every obstacle is something to hit harder.

**Stat archetype:** `tank` (toughness/durability) at protective tiers; `assault` (power/durability/haste) at offensive endgame tiers; `combat` for mid-range.

**Ability grants:** `fortify_systems`, `power_surge`, `magnetic_field` — endurance and damage amplification over healing.

**Color palette (lore-anchored):** Industrial gray (0x4a4a4a), warning orange (0xcc4400), dark metal (0x333333), exposed steel tones.

**Naming convention:** Industrial/operational designations — Extraction Frame, Ironclad Suit, Helix Mk.X, Hardsite Suit, Excavation Unit, Helix Operative Suit.

**Tool character:** Heavy excavation tools, industrial cutters, drilling equipment. Higher power stat than equivalent tier generics. Helix tools do more damage.

**Module character:** Heavy plating, industrial power cells. Named as industrial components (Composite Plating Module, Helix Power Core) not scientific instruments.

### Nexus Frontiers — "Surveillance / Intelligence / Adaptability"

**Lore basis (world-bible.md):**
- "Everyone is watching. Every transaction is logged. Every relationship is mapped."
- "Information is currency — and Nexus holds all accounts"
- Intelligence gathering disguised as neutral commerce
- Aesthetic: "Clean, professional, adaptable. Lots of glass, neutral colors, corporate-friendly design"
- Competitive meritocracy built on information asymmetry

**Mechanical translation:** Perception and haste. Suits that let you see more, move faster, and adapt. The information advantage expressed as mechanical advantage. You know where the enemy is before they know you're there.

**Stat archetype:** `scout` (haste/perception/vigor) for mobility tiers; `recon` (perception-focused) for surveillance-identity tiers. Endgame: `combat` with perception secondary.

**Ability grants:** `overclock`, `resource_scan`, `analyze_specimen` — awareness and information extraction.

**Color palette (lore-anchored):** Clean neutrals (0x2a2a3a), cool blue-grays (0x3a4a5a), glass-chrome accents. Professional and forgettable by design.

**Naming convention:** Operational/intelligence terminology — Meridian Operative Suit, Nexus Field Unit, Surveillance Frame, Intelligence Weave, Adaptive Shell, Nexus Operative Suit.

**Tool character:** Sensors, data recorders, environmental scanners. Highest perception of any faction's tools. Nexus tools find everything.

**Module character:** Sensor arrays, speed augmentors. Named as systems components (Nexus Sensor Array, Adaptive Speed Module) with a corporate polish to the naming.

### Unaffiliated — "Scavenged / Jury-rigged / Versatile"

**Lore basis (world-bible.md):**
- Contract-breakers; "free, but without faction protection"
- Traders running goods between faction territories; mercenaries; hermits
- No corporate backing; take what they can get

**Mechanical translation:** Balanced stats — no specialization because you take what you find. Slightly lower peak stats than faction gear of same rarity, compensated by wider stat spread. The independence comes at a mechanical cost: you're not optimized for anything.

**Stat archetype:** `balanced` exclusively. Slightly lower than faction exotic/legendary of same ilvl. Narrative flavor of assembled-from-parts.

**Ability grants:** Mixed — whatever was available (reflects scavenged origin).

**Color palette:** Worn, mixed, inconsistent. Salvaged aesthetic — nothing quite matches.

**Naming convention:** Pragmatic/salvage terminology — Salvaged Operative Suit, Freelancer's Kit, Void Wanderer Suit, Scavenger Frame, Contract Suit.

---

## Biome Creature Ecosystem Design Principles

Derived from analysis of how effective biome-based creature placement works (The Witcher 3 is the design gold standard: Drowners near rivers, Sirens at sea, Grave Hags near burial grounds — environment explains creature presence), applied to Terminus's alien ecology.

### Food Chain Structure (per biome)

Every biome should have:
- **1-2 herbivores** (behavior: `herbivore`) — feed on biome's flora; docile unless threatened
- **1-2 omnivores** (behavior: `omnivore`) — opportunistic; adds dynamic unpredictability
- **1-2 predators** (behavior: `predator`) — creates danger, drives combat encounters
- **0-1 maniacs** (behavior: `maniac`) — rare apex threat; makes biome memorable

This structure isn't rigid — deep_trenches already has 4 creatures that work — but deviation should have lore justification (crystalline_wastes has sparse fauna per world-bible.md: "sparse but highly specialized").

### Ecological Identity Guidelines (name + description + color must signal biome)

| Biome | Identity Signals | Color Range | Creature Traits |
|-------|-----------------|-------------|-----------------|
| void_plains | Scarred, barren, adapted to bare terrain | Gray-browns 0x4a4a5a | Scuttling, opportunistic, low-level |
| fungal_forest | Fungal integration, bioluminescent, spore-adapted | Purples, greens 0x44cc88 | Canopy-dwelling, spore-using, light-producing |
| tidal_pools | Marine, tidal-adapted, shell-armored | Ocean blues, sandy browns | Filter-feeding, crustacean-adjacent, tidal aware |
| miasma_marshes | Toxin-resistant, chemical-adapted | Sickly greens, yellows 0x6b8e23 | Floating, chemical immunity, gas-cloud feeding |
| petrified_expanse | Calcification-resistant, stone-adapted, mobile to avoid petrification | Stone grays, earth browns | Fast-moving (must keep moving), ambush specialists |
| crystal_caves | Crystalline integuments, light-refracting, echo-location | Ice purples, crystal blues | Silicon-bodied, light-based camouflage |
| volcanic_ridge | Heat-resistant, silicon-armored, thermal-adapted | Reds, oranges, obsidian black | Slow but devastating, heat-fed metabolisms |
| frozen_expanse | Cold-adapted, insulated, permafrost-burrowing | Ice blues, whites 0xb0e0e6 | Endurance hunters, ambush from below ice |
| toxic_wastes | Corrosion-resistant, acid-adapted, chemical environment exploiters | Toxic greens, yellows 0x9acd32 | Use environment as weapon, highly territorial |
| ancient_ruins | Warped by Ancient technology, territorial around structures | Stone brown, gold-green | Mechanical hybrids, intelligent behavior, artifact-seekers |
| starfall_crater | Anomaly-mutated, unstable physiology, void-touched | Dark purples, void blacks | Dimensional instability expressed as erratic behavior |
| void_rift | Partially phased from reality, dimensional hunters | Deep purples, near-black | Phase-shifting expressed as lore; stats reflect apex danger |

### Toxic Wastes — Critical Priority

toxic_wastes has only one creature (CREATURE_TOXIC_LURKER) against a biome that the world-bible describes as rich with chemically-adapted fauna. This is the most severe gap. Per world-bible.md:

> "Toxin-resistant specialists. Herbivores have developed immunity to specific plant poisons and feed exclusively on those species. Omnivores are scavengers consuming already-dead matter. Predators use the toxic environment as a weapon — chasing prey until chemical exposure weakens them."

This is a complete ecosystem in the lore. 4-5 new creatures are clearly defined by the lore already.

### Artifact Tier Escalation (Lore-Anchored)

Per world-bible.md: "Ancient ruins appear in all biomes but concentrate in Anomaly Zones and Crystalline Wastes." Artifacts are Prior Inhabitant technology. Their state of preservation and function should escalate with biome tier:

- **Tier I artifacts:** Weathered fragments, unclear purpose, curiosity items. Safe to interact with. Lore: earliest contact with PI technology.
- **Tier II artifacts:** Partially intact, some components active, potentially reactive. Suggests ongoing processes.
- **Tier III artifacts:** More intact, clearly technological, unexpectedly functional. Interaction has consequences.
- **Tier IV artifacts:** Operational. Clearly alien. Actively disturbing. The kind that makes teams not come back.

---

## Implementation Notes

### Existing Infrastructure (All Available)

All content addition follows established patterns. No new systems required:

- `CreatureDefinition` type in `packages/entities/src/types.ts` — all fields documented
- `generateSuitStats(archetype, rarity, tier)` in `packages/items/src/utils.ts` — available archetypes: tank, scout, combat, balanced, hazmat, assault, recon
- `computeIlvl(tier, rarity)` — ilvl computation for items
- Loot table system — `lootTableId` reference per creature; corresponding loot table entries in loot table registry
- Rarity variant system for plants/minerals — already implemented in v1.17 gatherable expansions
- NPC trader inventory — faction gear can be added to faction hub trader inventories directly

### Phase Ordering Recommendation

1. **Faction identity pillars** — design document; zero code but gates everything faction-related
2. **Biome creature population** — high impact, low complexity; parallel with faction gear design
3. **Biome plant/mineral/artifact population** — follows same pattern as creatures
4. **Faction suits: Tier I-II ladder** (common through rare) — establishes naming/stat patterns
5. **Faction suits: Tier III-IV** (epic through legendary) — builds on Tier I-II patterns
6. **Faction modules and tools** — complete the gear sets
7. **NPC trader inventory updates** — wire faction gear to faction hub traders

---

## Sources

- `/lore/world-bible.md` — HIGH confidence (primary authority for all lore decisions; CLAUDE.md mandates compatibility)
- `/packages/entities/src/definitions/*.ts` — HIGH confidence (authoritative current creature inventory)
- `/packages/items/src/definitions/suits.ts` — HIGH confidence (authoritative suit state; faction flavor analysis)
- `/packages/world-gen/src/generation/biome.ts` — HIGH confidence (biome tier assignments and danger levels)
- EVE Online faction ship design analysis via EVE University Wiki — MEDIUM confidence (verified documentation): Four factions have distinct weapon type + tank type combinations; mechanical identity creates meaningful build decisions; cited as the gold standard for faction gear differentiation
- Destiny 2 original faction rally gear analysis — MEDIUM confidence (community sources): Purely visual faction differentiation; identical stats; cited as the cautionary tale for cosmetic-only faction gear
- Nerdlab Games faction design principles — MEDIUM confidence: "Flavor dictates function — thematic identity should constrain mechanical capabilities logically"
- The Witcher 3 creature placement philosophy — MEDIUM confidence (widely documented in game design literature): Environment explains creature presence; biomes without ecologically coherent creatures feel like random monster spawns

---

*Feature research for: Into the Void v1.23 Content Expansion & Faction Gear*
*Researched: 2026-02-27*
