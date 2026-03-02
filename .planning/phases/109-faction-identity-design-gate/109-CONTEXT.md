# Phase 109: Faction Identity Design Gate - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

A committed design artifact documenting per-faction stat archetypes, ability assignment matrices, naming conventions, color palette anchors, and module/tool character descriptions — locked before any faction item definition is authored. This is a design/documentation phase, not a code implementation phase (though the artifact lives in the codebase).

</domain>

<decisions>
## Implementation Decisions

### Stat Archetype Mapping
- **Verdant Dynamics:** Primary = hazmat (resilience/recovery/durability), Secondary = balanced (scientific versatility)
- **Helix Extraction:** Primary = tank (durability/toughness), Secondary = assault (power/durability/haste)
- **Nexus Frontiers:** Primary = recon (perception/haste/vigor), Secondary = scout (haste/perception/vigor)
- **Unaffiliated:** New **scavenger** archetype — vigor (30%), recovery (25%), perception (25%), with remaining spread across durability/resilience. Represents survival instincts from scrounging, no combat specialization
- Shared stats between factions are acceptable — what matters is different emphasis (e.g., both Helix and Verdant may have durability, but Helix uses it for tanking while Verdant uses it for hazard resistance)
- Each faction gets **1 lore-justified off-archetype** suit variant (e.g., Verdant security division using combat archetype). The off-archetype must have a narrative reason within faction lore

### Ability Assignment Matrix
- **Fully shared access model** — all factions can eventually access all abilities, but faction-aligned abilities unlock at lower tiers/earlier in progression
- **Stat-driven grouping** determines which abilities are "in-faction": abilities that buff or leverage the faction's primary stats are considered faction-aligned (e.g., resilience/recovery buffs are Verdant-aligned, durability/power buffs are Helix-aligned, perception/haste buffs are Nexus-aligned)
- **Scaling ability count per rarity:** Common = 1 ability, Rare = 2, Epic = 3, Exotic = 4, Legendary = 5
- **Unaffiliated** pulls 1-2 abilities from each faction's pool — jack-of-all-trades combinations that no single faction offers

### Naming & Color Conventions
- **Item ID pattern:** `{type}_{faction}_{name}_{rarity}` — e.g., `suit_verdant_bioweave_rare`, `module_helix_slag_core_epic`. Matches existing convention (suit_nexus_combat_frame_exotic)
- **Display names:** Faction-themed vocabulary, NOT faction name prefix. Each faction has its own naming language (Verdant = bio/organic, Helix = industrial/forge, Nexus = tech/data, Unaffiliated = scrap/salvage)
- **Faction word banks** (10-15 words each) must be documented in the design artifact for consistent naming across Phases 112-114
- **Color palette anchors (earth tones, grounded):**
  - Verdant: greens (#2a7a3a range)
  - Helix: reds/oranges (#8a2a1a range)
  - Nexus: blues/teals (#1a4a7a range)
  - Unaffiliated: grays/yellows (#7a7a5a range)

### Tier Progression Identity
- **Gradual archetype shift:** Common-tier suits start more balanced/generic, higher tiers specialize deeper into the faction's core archetype. Progression = specialization
- **7 suits per faction:** 5 main ladder (Common → Rare → Epic → Exotic → Legendary) + 2 off-archetype variants at Epic and Legendary
  - Off-archetype uses the SAME archetype at both tiers (consistent sub-identity)
  - 28 total faction suits across all four factions
- **Modules and tools follow the same full Common-through-Legendary rarity ladder** as suits (same tier structure)

### Claude's Discretion
- Exact stat weight percentages for the scavenger archetype (within the vigor/recovery/perception direction)
- Specific ability-to-faction mappings (using the stat-driven grouping rule)
- Which off-archetype each faction uses (must be lore-justified)
- Specific faction word bank contents (within the thematic direction: bio/organic, industrial/forge, tech/data, scrap/salvage)
- Exact hex color values within the specified ranges

</decisions>

<specifics>
## Specific Ideas

- Unaffiliated should feel like "jury-rigged" gear — a scavenger who cobbles together bits from every faction. Their ability mix (pulling from all pools) reinforces this
- Off-archetype suits should each have a lore story: Verdant security forces, Helix scouts, Nexus enforcers, etc.
- The scavenger archetype for Unaffiliated is NEW — it needs to be added to ARCHETYPE_PROFILES in utils.ts
- Color palette should be earth-tone and grounded, not vibrant arcade sci-fi

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 109-faction-identity-design-gate*
*Context gathered: 2026-03-02*
