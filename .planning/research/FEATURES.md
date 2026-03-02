# Feature Research

**Domain:** Sci-fi survival MMO — Content Expansion & Faction Gear (v1.23)
**Researched:** 2026-03-02
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
| crystal_caves | III | 2 (Crystal Hunter, Crystal Crawler) | Need 2-4 more |
| toxic_wastes | II | 1 (Toxic Lurker) | Need 3-5 more — CRITICAL |
| volcanic_ridge | III | 2 (Magma Beast, Ash Skimmer) | Need 2-4 more |
| frozen_expanse | III | 2 (Frost Stalker, Ice Burrower) | Need 2-4 more |
| crystalline_wastes | III | 3 (Null Feeder, Dimensional Hunter, Rift Hunter) | Need 1-3 more |
| deep_trenches | III | 4 (Pressure Feeder, Trench Hunter, Abyssal Scavenger, Abyssal Leviathan) | At target |
| ancient_ruins | III/IV | 4 (Void Horror, Ruin Seeker, Guardian Construct, Relic Beast) | At target |
| starfall_crater | III/IV | 3 (Starfall Grazer, Crater Stalker + Void Horror shared) | Need 1-3 more |
| void_rift | IV | 4 (Void Grazer, Anomaly Scavenger, Void Stalker, Dimensional Aberration) | At target |

**Biome artifact inventory (artifacts are the most underserved category):**

| Biome | Current Artifacts | Target |
|-------|------------------|--------|
| void_plains | 0 | 1-2 |
| fungal_forest | 0 | 1-2 |
| tidal_pools | 0 | 1-2 |
| miasma_marshes | 0 | 1-2 |
| toxic_wastes | 1 (Contaminated Relic) | 1-2 |
| petrified_expanse | 1 (Preserved Specimen) | 1-2 |
| kelp_forests | 1 (Sunken Tech) | 1-2 |
| bioluminescent_depths | 0 | 1-2 |
| crystal_caves | 1 (Crystalline Resonator) | 1-2 |
| volcanic_ridge | 1 (Thermal Core) | 1-2 |
| frozen_expanse | 2 (Preserved Specimen, Frozen Archive) | At target |
| ancient_ruins | 2 (Ancient Data Core, Void-Touched Relic) | At target |
| starfall_crater | 1 (Void-Touched Relic shared) | 1-2 |
| crystalline_wastes | 0 (despite world-bible calling it an artifact hotspot) | 2 — CRITICAL |
| deep_trenches | 1 (Drowned Relic, Sunken Tech) | At target |
| void_rift | 4 (Anomaly Core, Dimensional Fragment, Echo Record, Void Relic) | At target |

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

## How Similar Games Handle Massive Content Expansion

Synthesized from codebase analysis and industry patterns. Confidence level given per finding.

### Content Density Conventions (HIGH confidence from codebase analysis)

The existing biome spawn configuration (`/packages/world-gen/src/generation/spawn.ts`) shows the project's established density convention:

- **Creature density target:** 4-6 per biome is the design document goal (REQUIREMENTS.md)
- **Why 4-6:** Fewer than 4 creates single-session exhaustion of biome variety; more than 6 creates implementation burden without player-perceptible difference in biome richness
- **Plant density target:** 3-4 per biome; plants are highest-density spawns (plantDensity 3-12 per chunk); variety matters because gathering players encounter them most
- **Mineral density target:** 2-3 per biome; minerals are point-of-interest gameplay, not ambient — fewer unique types is acceptable because spawn density compensates
- **Artifact target:** 1-2 per biome; artifacts are rare single-interaction events (respawns: false for most); they anchor lore discovery, not resource loops

**Industry comparison (MEDIUM confidence — observed pattern, not official documentation):**
Minecraft's biome design uses 3-6 unique mobs per biome with clear behavioral roles (passive/neutral/hostile). Valheim's biome design uses 4-8 creatures with difficulty scaling. ARK uses 8-15 but most are variants of the same base creatures. The 4-6 target for Into the Void is conservative and achievable while feeling populated.

### How Faction Gear Expansions Work in Similar Games (MEDIUM confidence)

**EVE Online (faction-specific ships):** Each NPC faction has a ship line with a consistent mechanical identity — Caldari ships use missiles and shield tanking across all sizes from frigate to dreadnought. Players know what they're getting before equipping. The faction identity is mechanical, not cosmetic.

**Path of Exile (league-specific item lines):** Content expansions introduce themed item families where the new items follow a clear mechanical theme for the expansion's faction/concept. Items in the same family escalate in power while maintaining the theme.

**Warframe (faction weapons):** Grineer faction weapons have high damage but slow fire rate; Corpus weapons have fast fire rate but lower damage; Infested weapons have unique status effects. The faction identity is the mechanical identity.

**The takeaway for Into the Void (HIGH confidence — derived from first principles):** The test for a faction gear line is: "Can a player feel the faction identity from the stats alone, without reading the description?" If the answer is no, the gear is cosmetic. Verdant gear should feel like sustained endurance. Helix gear should feel like raw power. Nexus gear should feel like information advantage.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Every biome has 4-6 creatures | Thin biomes feel empty within minutes of exploration; 1-2 creature biomes feel like placeholders | LOW | Pattern established — TypeScript creature definitions follow exact same shape as existing; just more of them |
| Behavior variety per biome (herbivore + predator minimum) | Players expect ecosystems, not monster rooms; docile creatures + threats = world feels alive | LOW | Design constraint: ensure each biome has at least one non-predator alongside predators |
| Tier-appropriate creature stats | Players expect harder biomes to require better gear; flat stats across tiers breaks progression feel | LOW | levelRange, baseHealth, baseXp scaling — the formula exists; apply it consistently |
| Every biome has 3-4 plants with rarity variants | Gathering variety drives session length; rare/epic node variants established in v1.17 | LOW | Entity definitions same pattern as creatures; epic/rare variants are stat multipliers on common |
| Every biome has 2-3 minerals with rarity variants | Mineral variety necessary for crafting material diversity across tiers | LOW | Same as plants — definitional work only |
| Every biome has 1-2 artifacts | Artifacts drive exploration and world-building; biomes with zero artifacts feel like they skipped the "world history" layer | LOW | Crystalline Wastes has zero artifacts despite world-bible calling it "Ancient artifact hotspot" — most urgent artifact gap |
| Faction-branded equipment exists | 4 named factions with zero exclusive gear is conspicuous; players ask "where's my faction stuff?" in any MMO with a faction system | MEDIUM | First faction gear expansion; establishes the pattern for all future faction content |
| Faction gear is mechanically distinct (not just renamed generics) | Purely cosmetic faction gear is the most-cited failure of faction systems; Destiny 2's original faction rally is the cautionary tale — identical stats, different colors, players saw through it immediately | MEDIUM | Each faction must have a stat archetype identity — not "Verdant-colored tank suit" but "Verdant gear heals you, Helix gear absorbs damage, Nexus gear lets you see more" |
| Faction gear identifiable by name and color | Players need to read "Verdant Canopy Frame" and know what they're getting without reading the tooltip | MEDIUM | Naming convention + color scheme per faction, derived from lore |
| Endgame (Tier III-IV) faction equipment exists | Endgame-focused players need faction identity in their progression tier; faction gear that tops out at Tier II sends "faction doesn't matter at endgame" | MEDIUM | Exotic and legendary faction suits; endgame is the explicit milestone priority per PROJECT.md |
| New entities are lore-compatible | world-bible.md is non-negotiable (CLAUDE.md mandates this); new creatures must fit Terminus as described | LOW | Check every new entity against world-bible.md before finalizing; Terminus biome descriptions are detailed enough to derive creature identities directly |
| Loot tables for every new creature | Without a lootTableId the entity system breaks; code-level requirement, not a design choice | LOW | Every creature definition requires a corresponding loot table entry; enforced by pattern |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but add value beyond user expectations.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Faction gear reflects faction philosophy mechanically | Verdant gear that heals you (sustained survival) vs Helix gear that absorbs damage (brute endurance) vs Nexus gear that lets you see more and move faster (information advantage) — the lore is the mechanical design document | MEDIUM | EVE Online's faction ships are the gold standard: Caldari=missiles+shields, Gallente=drones+armor, Minmatar=speed+versatility, Amarr=lasers+armor; the faction identity IS the build identity |
| Apex predator per tier-appropriate biome | One creature per biome that is distinctly harder than peers creates milestone moments ("I finally killed the [name]"); makes biomes memorable instead of interchangeable | LOW | Design decision only: name one predator per biome as the hardest; use maniac behavior for the most dangerous examples |
| Ecological food chain logic in creature descriptions | Herbivore description says it feeds on Biome X's flora; predator description explains it hunts the herbivore; makes the world feel like a real ecosystem rather than a monster list | LOW | Flavor text in description fields; zero implementation cost, high world-building value |
| Creature lore fragments as endgame loot | Rare drop from apex predators unlocks a lore entry; extends world-building without new systems | LOW | Lore fragment system already exists from v1.17; new fragment definitions pointing to new lore text |
| Verdant biotech tools with high perception | Verdant's identity as ecological researchers expressed through tools that detect/analyze specimens rather than just extract them | LOW | Perception stat already exists; Verdant tools have higher perception than equivalent-tier generic tools |
| Biome artifact tier-appropriate mystery scale | Tier I artifacts: weathered, unclear purpose; Tier IV artifacts: functional, clearly alien, unsettling — the mystery escalates with danger | LOW | Narrative design in description text; zero implementation cost |
| Faction gear enables full-faction builds | Player who wears a Verdant suit, Verdant modules, and Verdant tools gets a coherent playstyle — high sustained survival — rather than random stat mix | MEDIUM | Requires all three gear categories (suits, modules, tools) to use consistent stat priorities per faction |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Faction gear locked exclusively to faction members | "My faction should have unique stuff no one else can use" | Kills player economy and build experimentation; requires reputation system (explicitly out of scope per PROJECT.md); faction-locked gear without a proper rep system is just arbitrary restriction | Give faction gear strong mechanical identity and naming; allow purchase from faction traders at standard prices; reputation gating deferred to future milestone |
| Faction reputation system (earn faction trust to unlock gear) | Logical next step after faction gear exists | Massive scope — entire new progression loop, UI, database schema, server events; PROJECT.md explicitly marks it out of scope for this milestone | Defer; faction gear in this milestone is sold by faction traders and drops from faction-associated zones; reputation gates faction gear in a future milestone |
| Status effects on new creatures (poison from marsh creatures, freeze from frozen expanse) | Thematic and expected; "marsh creature should poison you" | Status effect system doesn't exist; PROJECT.md explicitly marks it out of scope; implementing status effects as part of a content milestone adds a system milestone's worth of work | Express creature environmental identity through stat choices (high baseHealth for tanky creatures, high XP for dangerous ones), loot (toxic compounds as drops from marsh creatures), and description text |
| Mini-boss encounters with special mechanics | Exciting; "each biome should have a boss" | Requires new AI behaviors (patrol patterns, phase transitions, enrage); none of these exist in the current creature AI | Use maniac behavior for the hardest creature in each biome; maniacs are already the "apex threat" behavior in the system |
| Unique crafting recipes from new creature drops | "Kill the void stalker, craft void armor" | Crafting system doesn't exist; would require a new system milestone | New creature drops enter the existing loot economy as materials and consumables; faction gear crafting is a future system |
| Faction-specific abilities granted by faction gear | "My Verdant suit should grow plants" | Technically implementable but faction-unique abilities (not reusing existing 21) require new ability definitions plus balance testing, which is out of scope | Faction gear grants the existing ability set with faction-appropriate selection (Verdant gear: regeneration_protocol + energy_barrier; Helix gear: fortify_systems + power_surge; Nexus gear: overclock + resource_scan) |
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
| Toxic wastes creature expansion (1 to 4-5) | HIGH | LOW | P1 — most urgent single gap |
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
| Crystalline Wastes artifacts (artifact hotspot with zero artifacts) | HIGH | LOW | P1 |
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
- Medical excellence: Bio-organic systems; the corporation that heals efficiently

**Mechanical translation:** Gear that favors sustained operation over burst capacity. High resilience and recovery. Suits that keep you alive through prolonged encounters rather than ending encounters quickly. The ecosystem sustains itself — Verdant gear does too.

**Primary stats (in priority order):** resilience → recovery → vigor → durability

**Stat archetype mapping to existing archetypes:**
- Tier I (Common): `hazmat` — environmental protection emphasis (resilience/recovery/durability)
- Tier II (Rare): `hazmat` — same identity, scaling up
- Tier III (Epic): `balanced` with recovery bias — broader capability as the suit matures
- Tier IV-V (Exotic/Legendary): custom weighting: resilience 30, recovery 25, vigor 25, durability 20 — peak biotech resilience

**Ability grants:** `regeneration_protocol`, `energy_barrier`, `nano_repair` — healing and protection over aggression.

**Color palette (lore-anchored):** Greens (0x2a5a2a range), earth browns (0x4a3a1a range), organic bioluminescent accents.

**Naming convention:** Biological/botanical terms — Canopy Frame, Symbiosis Suit, Mycelial Weave, Verdant Field Unit, Biolayer Suit, Verdant Operative Suit.

**Tool character:** Environmental scanners, botanical extractors, bio-specimen collectors. Higher perception stat than equivalent-tier generic tools. Verdant tools detect and study things; tool type `bio` and `research`.

**Module character:** Life-support arrays, biosupport modules (resilience/recovery). Named as organic systems, not industrial hardware. Module type `life_support`.

---

### Helix Extraction — "Industrial Brutalism / Power & Endurance"

**Lore basis (world-bible.md):**
- "Exposed metal, warning stripes, machinery that prioritizes function over form"
- Strip-mining, aggressive chemical processing, weaponized Ancient tech research
- Aesthetic: Industrial brutalism; "their facilities look exactly like what they are"
- "Excellent hazard pay and terrible survival odds"

**Mechanical translation:** Maximum power output and toughness. Suits built for hostile extraction environments — they take punishment so the worker can keep extracting. High power and toughness. The philosophy that every obstacle is something to hit harder.

**Primary stats (in priority order):** toughness → power → durability → haste

**Stat archetype mapping to existing archetypes:**
- Tier I (Common): `tank` — raw toughness/durability focus (the suit that just absorbs)
- Tier II (Rare): `tank` — same, scaling
- Tier III (Epic): `combat` — power becomes more relevant at this tier; Helix pushes into offensive endgame
- Tier IV-V (Exotic/Legendary): `assault` — the glass-cannon variant of Helix at endgame; maximum power output, still good toughness

**Ability grants:** `fortify_systems`, `power_surge`, `magnetic_field` — endurance and damage amplification over healing.

**Color palette (lore-anchored):** Industrial gray (0x4a4a4a), warning orange/red (0xcc4400), dark metal (0x333333), exposed steel tones.

**Naming convention:** Industrial/operational designations — Extraction Frame, Ironclad Suit, Helix Mk.X, Hardsite Suit, Excavation Unit, Helix Operative Suit.

**Tool character:** Heavy excavation tools, industrial cutters, drilling equipment. Higher power stat than equivalent-tier generics. Helix tools do more damage; tool type `mining` and `demolition`.

**Module character:** Heavy plating, industrial power cells. Named as industrial components (Composite Plating Module, Helix Power Core); module type `armor` and `power_core`.

---

### Nexus Frontiers — "Surveillance / Intelligence / Adaptability"

**Lore basis (world-bible.md):**
- "Everyone is watching. Every transaction is logged. Every relationship is mapped."
- "Information is currency — and Nexus holds all accounts"
- Intelligence gathering disguised as neutral commerce
- Aesthetic: "Clean, professional, adaptable. Lots of glass, neutral colors, corporate-friendly design"
- Competitive meritocracy built on information asymmetry

**Mechanical translation:** Perception and haste. Suits that let you see more, move faster, and adapt. The information advantage expressed as mechanical advantage. You know where the enemy is before they know you're there.

**Primary stats (in priority order):** perception → haste → vigor → recovery

**Stat archetype mapping to existing archetypes:**
- Tier I (Common): `scout` — haste/perception/vigor; mobile and aware
- Tier II (Rare): `scout` — same identity, scaling
- Tier III (Epic): `recon` — perception becomes dominant; surveillance identity sharpens at higher tiers
- Tier IV-V (Exotic/Legendary): `recon` at peak — 35 perception, 30 haste, 25 vigor, 10 recovery; the apex information warrior

**Ability grants:** `overclock`, `resource_scan`, `analyze_specimen` — awareness and information extraction.

**Color palette (lore-anchored):** Clean neutrals (0x2a2a3a), cool blue-grays (0x3a4a5a), glass-chrome accents. Professional and forgettable by design.

**Naming convention:** Operational/intelligence terminology — Meridian Operative Suit, Nexus Field Unit, Surveillance Frame, Intelligence Weave, Adaptive Shell, Nexus Operative Suit.

**Tool character:** Sensors, data recorders, environmental scanners. Highest perception of any faction's tools. Nexus tools find everything; tool type `research` and `stealth`.

**Module character:** Sensor arrays, speed augmentors. Named as systems components (Nexus Sensor Array, Adaptive Speed Module); module type `sensor` and `speed`.

---

### Unaffiliated — "Scavenged / Jury-rigged / Versatile"

**Lore basis (world-bible.md):**
- Contract-breakers; "free, but without faction protection"
- Traders running goods between faction territories; mercenaries; hermits
- No corporate backing; take what they can get

**Mechanical translation:** Balanced stats — no specialization because you take what you find. Slightly lower peak stats than faction gear of same rarity, compensated by wider stat spread. The independence comes at a mechanical cost: not optimized for anything.

**Stat archetype:** `balanced` exclusively. Slightly lower than faction exotic/legendary of same ilvl. Narrative flavor of assembled-from-parts.

**Ability grants:** Mixed — whatever was available (reflects scavenged origin).

**Color palette:** Worn, mixed, inconsistent. Salvaged aesthetic — nothing quite matches.

**Naming convention:** Pragmatic/salvage terminology — Salvaged Operative Suit, Freelancer's Kit, Void Wanderer Suit, Scavenger Frame, Contract Suit.

**Note:** Unaffiliated gear is a P3 item for this milestone. The faction gear gap (Verdant/Helix/Nexus) is more urgent.

---

## Tier Progression Curves

The existing `generateSuitStats()` utility defines the progression math. This section maps faction identities to that math.

### Stat Budget Per Tier/Rarity (from utils.ts)

```
Total budget = baseBudget(77) × rarityMultiplier × tierMultiplier

Rarity multipliers: common=1.0, rare=1.4, epic=2.0, exotic=2.8, legendary=4.0
Tier multipliers:   1=1.0,     2=2.0,    3=3.5,    4=5.5,      5=8.0

Example total budgets (rounded):
  Tier 1 Common:    77   (faction Tier I entry point)
  Tier 2 Rare:     216   (faction Tier I advanced)
  Tier 3 Epic:     540   (faction Tier II)
  Tier 4 Exotic: 1,186   (faction Tier III)
  Tier 4 Legendary: 1,694 (faction Tier III apex)
```

### Faction Stat Distribution at Tier IV Exotic (primary design milestone target)

For a 1,186 total budget, faction distribution:

| Stat | Verdant (hazmat-modified) | Helix (assault) | Nexus (recon) |
|------|--------------------------|-----------------|----------------|
| resilience | 30% = 356 | 0% = 0 | 0% = 0 |
| recovery | 25% = 297 | 0% = 0 | 10% = 119 |
| vigor | 25% = 297 | 0% = 0 | 25% = 297 |
| durability | 20% = 237 | 25% = 297 | 0% = 0 |
| toughness | 0% = 0 | 30% = 356 | 0% = 0 |
| power | 0% = 0 | 30% = 356 | 0% = 0 |
| haste | 0% = 0 | 15% = 178 | 30% = 356 |
| perception | 0% = 0 | 0% = 0 | 35% = 415 |

**Verdant at Tier IV Exotic:** Resilience 356, Recovery 297, Vigor 297, Durability 237 — a suit that barely takes damage from environmental hazards and heals rapidly; total dominance in sustained survival.

**Helix at Tier IV Exotic (assault):** Power 356, Toughness 297, Durability 356, Haste 178 — a glass hammer; hits hard, takes hits, moves fast enough to close distance.

**Nexus at Tier IV Exotic (recon):** Perception 415, Haste 356, Vigor 297, Recovery 119 — sees everything, moves faster than anything, builds synergy with resource_scan and overclock abilities.

### Feeling Distinct at Each Tier

At Tier I (common/rare): The stat budgets are small (77-216 total). Faction difference is about 20-40 stat points per priority stat. The difference feels modest but signals the faction identity.

At Tier III (epic): Budget is 540. Faction difference reaches 100-200 stat points in priority stats. Faction identity becomes mechanically meaningful — a Helix epic vs. a Verdant epic produce noticeably different survival patterns.

At Tier IV (exotic/legendary): Budget is 1,186-1,694. Faction difference is 300-400 stat points in priority stats. At endgame, faction identity is dramatic. A Verdant legendary has ~593 in resilience+recovery alone; that's extreme environmental resistance. A Nexus legendary has ~580 in perception — enabling entity detection at maximum possible range.

---

## Biome Creature Ecosystem Design Principles

Derived from lore analysis and how effective biome-based creature placement works. The gold standard (The Witcher 3): Drowners near rivers, Sirens at sea, Grave Hags near burial grounds — environment explains creature presence. Applied to Terminus's alien ecology.

### Food Chain Structure (per biome)

Every biome should have:
- **1-2 herbivores** (behavior: `herbivore`) — feed on biome's flora; docile unless threatened
- **1-2 omnivores** (behavior: `omnivore`) — opportunistic; adds dynamic unpredictability
- **1-2 predators** (behavior: `predator`) — creates danger, drives combat encounters
- **0-1 maniacs** (behavior: `maniac`) — rare apex threat; makes biome memorable

This structure isn't rigid — deep_trenches already has 4 creatures that work — but deviation should have lore justification (crystalline_wastes has sparse fauna per world-bible.md: "sparse but highly specialized").

### Ecological Identity Guidelines

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

### Toxic Wastes — Critical Priority (1 creature → 4-5 needed)

toxic_wastes has only one creature (CREATURE_TOXIC_LURKER) against a biome that the world-bible describes as rich with chemically-adapted fauna. This is the most severe gap. Per world-bible.md:

> "Toxin-resistant specialists. Herbivores have developed immunity to specific plant poisons and feed exclusively on those species. Omnivores are scavengers consuming already-dead matter. Predators use the toxic environment as a weapon — chasing prey until chemical exposure weakens them. Maniacs may be common, but it's hard to distinguish chemically-altered behavior from baseline aggression."

This is a complete food chain in the lore: herbivore (immune to plant toxins), omnivore (scavenger), predator (chemical weapon user), and potentially a maniac. 3-4 new creatures are clearly defined by lore already.

### Crystalline Wastes — Artifact Priority (0 artifacts despite being a hotspot)

Per world-bible.md: "Ancient ruins often found partially absorbed by crystal growth. Ancient artifact hotspot." This biome is explicitly described as the second-most-concentrated artifact zone after Anomaly Zones — it has zero artifacts. 2 new artifacts are both lore-required and a significant world-building gap.

### Artifact Tier Escalation (Lore-Anchored)

Per world-bible.md: "Ancient ruins appear in all biomes but concentrate in Anomaly Zones and Crystalline Wastes." Artifacts are Prior Inhabitant technology. Their state of preservation and function should escalate with biome tier:

- **Tier I artifacts:** Weathered fragments, unclear purpose, curiosity items. Safe to interact with. Lore: earliest contact with PI technology.
- **Tier II artifacts:** Partially intact, some components active, potentially reactive. Suggests ongoing processes.
- **Tier III artifacts:** More intact, clearly technological, unexpectedly functional. Interaction has consequences.
- **Tier IV artifacts:** Operational. Clearly alien. Actively disturbing. The kind that makes teams not come back.

---

## Implementation Notes

### Existing Infrastructure (All Available — No New Systems Required)

- `CreatureDefinition` type in `packages/entities/src/types.ts`
- `generateSuitStats(archetype, rarity, tier)` in `packages/items/src/utils.ts` — available archetypes: tank, scout, combat, balanced, hazmat, assault, recon
- `computeIlvl(tier, rarity)` — ilvl computation for items
- Loot table system — `lootTableId` reference per creature; corresponding loot table entries in loot table registry
- Rarity variant system for plants/minerals — implemented in v1.17
- NPC trader inventory — faction gear can be added to faction hub trader inventories directly
- BIOME_SPAWN_CONFIGS in `packages/world-gen/src/generation/spawn.ts` — add new entities here to wire them to world generation

### Phase Ordering Recommendation

1. **Faction identity pillars** — design document; zero code but gates everything faction-related
2. **Biome creature population** — high impact, low complexity; parallel with faction gear design
3. **Biome plant/mineral/artifact population** — follows same pattern as creatures; artifacts highest priority for lore completeness
4. **Faction suits: Tier I-II ladder** (common through rare) — establishes naming/stat patterns
5. **Faction suits: Tier III-IV** (epic through legendary) — builds on Tier I-II patterns; endgame is the milestone headline
6. **Faction modules and tools** — complete the gear sets
7. **NPC trader inventory updates** — wire faction gear to faction hub traders

### Content Volume Estimate

New entities needed to reach targets:
- Creatures: ~30-35 new definitions (across all biomes; toxic_wastes alone needs 4-5)
- Plants: ~20-25 new definitions (common + rare variants per biome gap)
- Minerals: ~15-20 new definitions (common + rare variants)
- Artifacts: ~12-15 new definitions (targeting the 9+ biomes with zero artifacts)

New items needed:
- Faction suits: 3 factions × 4-5 tiers × 1 design per tier = ~15 new suit definitions
- Faction modules: 3 factions × 2-3 rarities = ~9 new module definitions
- Faction tools: 3 factions × 1-2 types = ~6-9 new tool definitions

---

## Sources

- `/lore/world-bible.md` — HIGH confidence (primary authority for all lore decisions; CLAUDE.md mandates compatibility)
- `/packages/entities/src/definitions/*.ts` — HIGH confidence (authoritative current creature inventory)
- `/packages/items/src/definitions/suits.ts` — HIGH confidence (authoritative suit state; faction flavor analysis)
- `/packages/items/src/utils.ts` — HIGH confidence (stat budget math; generateSuitStats implementation)
- `/packages/world-gen/src/generation/spawn.ts` — HIGH confidence (biome spawn configs; current entity-per-biome count)
- `.planning/REQUIREMENTS.md` — HIGH confidence (milestone targets: 4-6 creatures per biome, 3-4 plants, 2-3 minerals, 1-2 artifacts)
- EVE Online faction ship design — MEDIUM confidence (community wiki documentation): Four factions have distinct weapon type + tank type combinations; mechanical identity creates meaningful build decisions; cited as the gold standard for faction gear differentiation
- Destiny 2 original faction rally gear — MEDIUM confidence (community sources): Purely visual faction differentiation; identical stats; cited as the cautionary tale for cosmetic-only faction gear
- The Witcher 3 creature placement philosophy — MEDIUM confidence (widely documented in game design literature): Environment explains creature presence; biomes without ecologically coherent creatures feel like random monster spawns

---

*Feature research for: Into the Void v1.23 Content Expansion & Faction Gear*
*Researched: 2026-03-02*
