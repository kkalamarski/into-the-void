# Phase 129: Biome Atmospheric Effects - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Per-biome atmospheric overlays (fog, glow, haze, murk, shimmer, clear) applied via camera postFX, coordinated with the existing day/night ColorMatrix from Phase 128. Covers all 16 biomes. Smooth cross-fade on biome transitions (walk and teleport). No new weather particles (Phase 127), no new lighting systems, no gameplay-affecting visibility reduction.

</domain>

<decisions>
## Implementation Decisions

### Biome-to-atmosphere mapping
- 6 shared effect types, each biome assigned one with unique color/intensity:
  - **FOG**: frozen_expanse, deep_trenches, tidal_pools
  - **GLOW**: fungal_forest, bioluminescent_depths, kelp_forests
  - **HAZE**: volcanic_ridge, miasma_marshes, toxic_wastes
  - **MURK**: crystal_caves, petrified_expanse, ancient_ruins
  - **SHIMMER**: void_rift, starfall_crater, crystalline_wastes
  - **CLEAR**: void_plains
- Atmosphere color derived from existing `BIOME_COLORS` hex values in `shared-types/src/game/biome.ts` — keeps visual consistency across systems

### Effect intensity & visibility
- Subtle mood layer — noticeable when crossing biomes but not dominating the view
- Intensity scales with biome tier: Tier I lightest, Tier IV most dramatic
- Purely cosmetic — no gameplay impact on visibility of terrain or entities
- void_plains (CLEAR) gets a very faint neutral grey-blue wash — just enough that transitioning FROM another biome creates a visible "clearing" moment

### Day/night interaction
- Atmospheres are modulated by the day/night cycle, not constant
- Per-effect-type modulation direction (lore-driven):
  - FOG: thicker at night/dawn
  - GLOW: brighter at night (partially counters night dimming — relatively brighter than non-glow biomes but still visibly darker than daytime)
  - HAZE: strongest at day/noon
  - MURK: darker at night
  - SHIMMER: shifts hue at dusk/dawn
  - CLEAR: unchanged
- Glow biomes at night are relatively brighter than non-glow biomes (bioluminescence partially compensates) but still visibly darker than day

### Transition behavior
- Walk transitions: ~3 second cross-fade (matches Phase 127 weather particle transition duration)
- Teleport transitions: brief ~0.5-1s fade from old atmosphere to new (no bleed-through)
- Atmosphere snaps to player's current biome tile — no blend zone at boundaries
- Rapid biome crossings: always cancel in-progress transition and start new one to current biome (no queuing)

### Claude's Discretion
- Technical approach for coordinating atmosphere and day/night ColorMatrix (shared instance vs. separate postFX stages)
- Exact intensity values per biome tier
- Easing curves for cross-fade transitions
- How to detect current biome from player position for atmosphere changes

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 129-biome-atmospheric-effects*
*Context gathered: 2026-03-17*
