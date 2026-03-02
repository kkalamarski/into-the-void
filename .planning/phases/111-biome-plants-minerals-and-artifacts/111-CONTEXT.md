# Phase 111: Biome Plants, Minerals, and Artifacts - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fill resource gaps across all 16 biomes so every biome has 3-4 plants, 2-3 minerals with rarity variants, and 1-2 artifacts. Resolve the crystalline_wastes artifact hotspot (documented in lore as an artifact-rich zone, currently has zero artifacts). Extend rarity.ts to cover all biomes with rare/epic mineral mappings.

</domain>

<decisions>
## Implementation Decisions

### Resource Naming & Theming
- Biome-flavored naming: each resource name reflects its home biome ('Acid Bloom' in toxic_wastes, 'Frost Lichen' in frozen_expanse)
- Familiar-with-a-twist tone: names players can picture but with sci-fi modifier ('Void Fern', 'Thermal Vent Moss'), not abstract alien names
- Every resource gets a 1-2 sentence lore blurb tying it to the biome's ecology (for future tooltip display)
- Every resource definition includes visual identity hints: color palette, glow, shape notes to guide future sprite generation

### Cross-Biome Uniqueness
- Mostly unique: each biome gets signature resources, but thematically related biomes of the same tier may share 1 common resource
- Sharing rule: same tier + similar ecology only (e.g., toxic_wastes and miasma_marshes can share a chemical-themed plant, but no cross-tier sharing of signature resources)
- Shared resources have biome-tuned spawn rates: common in home biome, rarer in secondary biomes
- Higher-tier biomes include some lower-tier common resources alongside their signature ones (feels more natural, gives safe gathering options in dangerous zones)

### Rarity Distribution
- All tiers get rare mineral variants, including Tier I — gives new players occasional excitement in starter zones
- Flat spawn rates everywhere: 5% rare, 1% epic (existing rates preserved). Higher tiers feel rewarding because base resources are more valuable, not because rates are higher
- Artifacts stay as unique one-offs — no rarity tiers. Each artifact is a distinct discovery
- Rare/epic mineral nodes are visually distinct (different color/glow) so players can spot them in the world

### Crystalline Wastes Spotlight
- Generally resource-rich: higher density across all resource types, not just artifacts. Makes it a destination biome for gatherers willing to brave Tier III
- Eerie flavor text on all resources from this biome, hinting at crystal awareness ('The formation seemed to shift as you approached')

### Atmospheric Resource Descriptions
- All Tier III+ biomes get atmospheric/unsettling resource descriptions, each with biome-specific flavor:
  - crystalline_wastes: crystal consciousness, psychological unease
  - void_rift: reality-warping, spatial distortion
  - bioluminescent_depths: deep-ocean dread, living darkness
  - Other Tier III biomes: appropriate thematic atmosphere

### Claude's Discretion
- Crystalline Wastes artifact design: Claude designs the 2 artifacts to fit the "Singing Fields" lore (resonating crystals, intentional growth patterns, psychological effects)
- Exact resource stats (yield, gather time, tier requirements)
- Which specific lower-tier resources appear in higher-tier biomes
- Spawn density tuning per biome
- Exact visual description details per resource

</decisions>

<specifics>
## Specific Ideas

- Resource names should feel like the existing codebase: 'Void Crystal', 'Phase Bloom', 'Thermal Core' — biome-flavored but not overly verbose
- Crystalline Wastes is the standout biome of this phase — it should feel special and eerie, a place players talk about
- Rare mineral nodes should create "is that a blue one?!" moments — visually distinct enough to spot from gameplay distance
- Higher-tier biomes having some lower-tier resources makes the world feel alive (ecosystems don't stop at tier boundaries)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 111-biome-plants-minerals-and-artifacts*
*Context gathered: 2026-03-02*
