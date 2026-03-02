# Faction Identity Design Document

> Single source of truth for faction gear identity. Referenced by all item definition files.
> Created: Phase 109 | Must be consulted before authoring any faction item.

---

## 1. Faction Stat Archetypes

### Verdant Dynamics

- **Primary archetype:** hazmat (resilience 30%, recovery 25%, durability 25%, vigor 20%)
- **Secondary archetype:** balanced (spread across all 8 stats)
- **Off-archetype:** combat (Verdant Security Division -- Verdant maintains an armed security force to protect research installations and valuable biological specimens from Helix raids and hostile wildlife. Their security teams operate in contested zones where diplomacy is irrelevant and the fauna is silicon-armored. These units use combat gear because the alternative is losing irreplaceable specimens.)
- **Identity:** Environmental resilience and scientific versatility. Verdant suits keep you alive in hostile biomes; their defensive abilities let you outlast anything. Sustainability as a survival strategy, not sentiment.

### Helix Extraction

- **Primary archetype:** tank (durability 35%, toughness 30%, resilience 15%, recovery 10%, vigor 10%)
- **Secondary archetype:** assault (power 35%, durability 25%, haste 25%, toughness 15%)
- **Off-archetype:** recon (Helix Deep Survey Teams -- Helix deploys small recon teams into unexplored cavern systems and Ancient ruins to survey mineral deposits before committing heavy extraction equipment. These scouts need perception and speed over armor because they operate alone in unmapped territory where being seen first means not being seen at all.)
- **Identity:** Raw toughness and industrial power. Helix suits absorb punishment and hit hard. Built for the frontline of extraction operations where "restraint" is a word used by people who haven't met a Volcanic Reaches apex predator.

### Nexus Frontiers

- **Primary archetype:** recon (perception 35%, haste 30%, vigor 25%, recovery 10%)
- **Secondary archetype:** scout (haste 30%, perception 25%, vigor 25%, recovery 10%, durability 10%)
- **Off-archetype:** assault (Nexus Enforcement Division -- Nexus intelligence operations sometimes require force. When diplomacy, espionage, and economic pressure all fail, their enforcement teams are equipped for rapid, decisive strikes. They call it "kinetic negotiation.")
- **Identity:** Awareness and speed. Nexus suits see everything, react fastest, and are always one step ahead. Information advantage over brute force. If Nexus needs to fight, something has already gone wrong.

### Unaffiliated

- **Primary archetype:** scavenger (vigor 30%, recovery 25%, perception 25%, durability 12%, resilience 8%) -- added to ARCHETYPE_PROFILES in utils.ts
- **Secondary archetype:** balanced (even spread across all stats)
- **Off-archetype:** hazmat (Wasteland Reclamation Crews -- unaffiliated scavengers who specialize in recovering materials from toxic zones and contaminated ruins that the corporations have abandoned as unprofitable. They need environmental protection above all else because the best salvage is in the worst places.)
- **Identity:** Jury-rigged survival. Unaffiliated gear cobbles together bits from every faction. Jack-of-all-trades combinations that no single faction offers. Every piece of equipment has a story and visible field repairs.

### Tier Progression Table

Archetype used per suit rarity. Common starts balanced/generic for all factions, then specializes deeper at higher tiers.

| Faction | Common (T1) | Rare (T2) | Epic (T3) | Exotic (T4) | Legendary (T5) | Epic Off | Legendary Off |
|---------|-------------|-----------|-----------|-------------|-----------------|----------|---------------|
| Verdant | balanced | hazmat | hazmat | hazmat | hazmat | combat | combat |
| Helix | balanced | tank | tank | assault | assault | recon | recon |
| Nexus | balanced | recon | recon | recon | recon | assault | assault |
| Unaffiliated | balanced | scavenger | scavenger | scavenger | scavenger | hazmat | hazmat |

**Off-archetype rule:** Each faction uses the SAME off-archetype at both Epic and Legendary tiers (consistent sub-identity).

---

## 2. Ability Assignment Matrix

### Stat-Driven Grouping Rule

Abilities that buff or leverage a faction's primary stats are considered "in-faction." All factions can eventually access all abilities, but faction-aligned abilities unlock at lower tiers/earlier in progression.

### Faction-Aligned Abilities

**Verdant-aligned** (resilience/recovery/durability focus):
- `energy_barrier` -- resilience buff
- `regeneration_protocol` -- heal-over-time / recovery
- `nano_repair` -- self-heal
- `fortify_systems` -- durability buff
- `analyze_specimen` -- perception+power buff (dual-purpose research utility, Verdant's scientific identity)

**Helix-aligned** (durability/toughness/power focus):
- `magnetic_field` -- toughness buff
- `emergency_shield` -- toughness buff
- `fortify_systems` -- durability buff (shared with Verdant)
- `power_surge` -- power buff
- `concussive_strike` -- melee power (granted by tools)

**Nexus-aligned** (perception/haste/vigor focus):
- `resource_scan` -- perception buff
- `overclock` -- haste buff
- `analyze_specimen` -- perception+power buff (shared with Verdant)
- `precision_shot` -- long-range accuracy (granted by tools)
- `electrocute` -- shock DoT, tech-themed (granted by tools)

**Cross-faction shared** (appear on generic/starter items for all factions):
- `basic_strike`, `shield_bash`, `energy_pulse`, `nano_repair`

### Suit Ability Progression (Main Ladder)

| Tier | Verdant Main | Helix Main | Nexus Main | Unaffiliated |
|------|-------------|------------|------------|--------------|
| Common (1 ability) | nano_repair | nano_repair | nano_repair | nano_repair |
| Rare (2 abilities) | energy_barrier, regeneration_protocol | magnetic_field, fortify_systems | overclock, resource_scan | nano_repair, emergency_shield |
| Epic (3 abilities) | energy_barrier, regeneration_protocol, nano_repair | magnetic_field, fortify_systems, power_surge | overclock, resource_scan, analyze_specimen | emergency_shield, overclock, energy_barrier |
| Exotic (4 abilities) | energy_barrier, regeneration_protocol, nano_repair, analyze_specimen | magnetic_field, fortify_systems, power_surge, emergency_shield | overclock, resource_scan, analyze_specimen, precision_shot | emergency_shield, overclock, energy_barrier, resource_scan |
| Legendary (5 abilities) | energy_barrier, regeneration_protocol, nano_repair, analyze_specimen, fortify_systems | magnetic_field, fortify_systems, power_surge, emergency_shield, concussive_strike | overclock, resource_scan, analyze_specimen, precision_shot, electrocute | emergency_shield, overclock, energy_barrier, resource_scan, power_surge |

**Unaffiliated design principle:** Pulls 1-2 abilities from each faction's pool -- jack-of-all-trades combinations:
- `emergency_shield` (Helix-aligned)
- `overclock` (Nexus-aligned)
- `energy_barrier` (Verdant-aligned)
- `resource_scan` (Nexus-aligned)
- `power_surge` (Helix-aligned)

### Ability Coverage Validation

**Suit-granted abilities** (defensive/utility -- granted by suits):
- `nano_repair` -- All factions (Common+)
- `energy_barrier` -- Verdant (Rare+), Unaffiliated (Epic+)
- `regeneration_protocol` -- Verdant (Rare+)
- `magnetic_field` -- Helix (Rare+)
- `fortify_systems` -- Helix (Rare+), Verdant (Legendary)
- `emergency_shield` -- Helix (Exotic+), Unaffiliated (Rare+)
- `power_surge` -- Helix (Epic+), Unaffiliated (Legendary)
- `overclock` -- Nexus (Rare+), Unaffiliated (Epic+)
- `resource_scan` -- Nexus (Rare+), Unaffiliated (Exotic+)
- `analyze_specimen` -- Nexus (Epic+), Verdant (Exotic+)
- `precision_shot` -- Nexus (Exotic+)
- `electrocute` -- Nexus (Legendary)
- `concussive_strike` -- Helix (Legendary)

**Tool-granted abilities** (offensive -- granted by tools, NOT suits):
- `basic_strike`, `shield_bash`, `energy_pulse` -- cross-faction via tools
- `thermal_lance`, `plasma_burst`, `overload_pulse` -- mining/demolition tools
- `void_drain`, `cryo_blast` -- exotic+ combat/anomaly tools
- `precision_shot`, `electrocute` -- combat tools (also on Nexus suits at high tiers)
- `concussive_strike` -- combat/demolition tools (also on Helix suits at Legendary)

No orphaned abilities. All 21 grantable abilities appear on at least one faction's gear path.

---

## 3. Naming Conventions

### Item ID Pattern

`{type}_{faction}_{name}_{rarity}`

- **Types:** suit, module, tool
- **Factions:** verdant, helix, nexus, unaffiliated
- **Name:** 1-2 words from the faction word bank, snake_case
- **Rarity:** common, rare, epic, exotic, legendary

**Examples:**
- `suit_verdant_bioweave_common`
- `suit_verdant_symbiont_epic`
- `module_helix_slag_core_epic`
- `tool_nexus_signal_probe_rare`
- `suit_unaffiliated_patchwork_common`
- `tool_unaffiliated_cobbled_scanner_rare`

### Display Name Format

Faction-themed vocabulary, NOT faction name prefix.

| Faction | Do | Don't |
|---------|-----|-------|
| Verdant | "Bioweave Exo-Suit" | "Verdant Basic Suit" |
| Helix | "Ironclad Frame" | "Helix Tank Suit" |
| Nexus | "Spectre Recon Suit" | "Nexus Scout Suit" |
| Unaffiliated | "Patchwork Exo-Suit" | "Unaffiliated Basic Suit" |

### Faction Word Banks

**Verdant Dynamics** (bio/organic theme):
bioweave, symbiont, mycelial, chloro, spore, canopy, rootbound, verdure, phyto, cultivar, tendril, bloom, enzyme, synthesis, sap

**Helix Extraction** (industrial/forge theme):
ironclad, slag, foundry, bore, crucible, tempered, anvil, smelt, ingot, furnace, bulwark, rivet, compression, alloy, quarry

**Nexus Frontiers** (tech/data theme):
spectre, cipher, signal, lattice, vector, meridian, proxy, beacon, relay, node, echo, pulse, grid, phantom, trace

**Unaffiliated** (scrap/salvage theme):
patchwork, cobbled, scrap, salvage, makeshift, jury-rig, reclaimed, drifter, scrounger, mongrel, wasteland, improvised, threadbare, rusted, tinkered

---

## 4. Color Palette Anchors

Earth-tone, grounded palette. NOT vibrant arcade sci-fi.

| Faction | Primary Hex | Secondary Hex | Accent Hex | Description |
|---------|-------------|---------------|------------|-------------|
| Verdant | #2a7a3a | #1a5a2a | #3a9a4a | Deep forest greens, mossy undertones |
| Helix | #8a2a1a | #6a1a0a | #aa3a2a | Rust reds, forge oranges, dried blood |
| Nexus | #1a4a7a | #0a3a6a | #2a5a8a | Deep ocean blues, steel teals |
| Unaffiliated | #7a7a5a | #5a5a3a | #9a9a6a | Weathered grays, desert yellows, dust |

### TypeScript Hex Values (0x format)

- **Verdant:** 0x2a7a3a (primary), scale darker for common, brighter for legendary
- **Helix:** 0x8a2a1a (primary), scale darker for common, brighter for legendary
- **Nexus:** 0x1a4a7a (primary), scale darker for common, brighter for legendary
- **Unaffiliated:** 0x7a7a5a (primary), scale darker for common, brighter for legendary

### Color Scaling by Rarity

| Rarity | Lightness Shift | Saturation |
|--------|----------------|------------|
| Common | Base - 15% | Muted |
| Rare | Base | Standard |
| Epic | Base + 10% | Slightly vivid |
| Exotic | Base + 20% | More vivid |
| Legendary | Base + 30% | Most vivid |

---

## 5. Module and Tool Character Descriptions

### Modules per Faction

| Faction | Primary Module Type | Secondary Module Type | Aesthetic |
|---------|--------------------|-----------------------|-----------|
| Verdant | life_support | sensor (ecological monitoring) | Bio-organic, living components, symbiotic systems |
| Helix | armor | power_core (geothermal energy) | Industrial, heavy plating, utilitarian |
| Nexus | sensor | speed (rapid deployment) | Sleek tech, data overlays, precision engineering |
| Unaffiliated | varied (power_core from salvaged Helix) | varied (life_support from salvaged Verdant) | Scavenged, visible repairs, mixed origins |

### Tools per Faction

| Faction | Primary Tool Type | Secondary Tool Type | Description |
|---------|------------------|---------------------|-------------|
| Verdant | bio | research | Living instruments that interface with Terminus ecology |
| Helix | mining | demolition | Heavy industrial extraction equipment |
| Nexus | research | stealth | Precision instruments for intelligence gathering |
| Unaffiliated | universal | combat | Multi-purpose improvised tools that do a bit of everything |

### Tool Ability Grants by Faction

Tools follow the same faction-aligned pattern as suits:

- **Verdant bio tools:** harvest, analyze_specimen, energy_pulse, nano_repair
- **Helix mining tools:** mine, basic_strike, thermal_lance, plasma_burst, overload_pulse
- **Nexus research tools:** energy_pulse, resource_scan, analyze_specimen, overclock, precision_shot
- **Unaffiliated universal tools:** basic_strike, mine, harvest, energy_pulse (jack-of-all-trades)

---

## 6. Suit Count and Structure

### Per Faction: 7 Suits Total

- **5 main ladder:** Common, Rare, Epic, Exotic, Legendary (using primary/secondary archetype progression from the Tier Progression Table)
- **2 off-archetype:** Epic, Legendary (using the SAME off-archetype at both tiers)

**28 total faction suits** across all four factions.

### Ability Count Per Rarity

| Rarity | Ability Count |
|--------|--------------|
| Common | 1 |
| Rare | 2 |
| Epic | 3 |
| Exotic | 4 |
| Legendary | 5 |

### Module Slots Per Rarity

| Rarity | Module Slots |
|--------|-------------|
| Common | 3 |
| Rare | 4 |
| Epic | 4 |
| Exotic | 5 |
| Legendary | 6 |

---

*Document: Faction Identity Design*
*Phase: 109-faction-identity-design-gate*
*Status: Locked -- consult before authoring any faction item*
*Created: 2026-03-02*
