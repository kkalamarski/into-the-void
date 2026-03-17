# Phase 127: Particle Weather System - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Each biome has viewport-fixed weather particles (rain, snow, ash, spores, mist, or none) that transition smoothly on biome change and are fully cleaned up when chunks unload. Weather is purely cosmetic — no gameplay impact. Intensity varies over time with server-synced cycles.

</domain>

<decisions>
## Implementation Decisions

### Biome-weather mapping
- Every biome gets at least some particle effect — no biome is weather-free
- Weather type matches biome theme (e.g., fungal_forest → spores, frozen_expanse → snow, volcanic_ridge → ash)
- Tier I biomes get gentle thematic weather
- Tier II-III biomes get progressively more intense base weather
- Void Rift (Tier IV) gets unique otherworldly particles — void shards, reality distortion, energy crackle — not standard weather types
- Claude maps specific weather types to each of the 16 biomes based on lore and theme

### Particle visual style
- Pixel-style particles (2-4px square/rectangular) — consistent with the game's pixel-art aesthetic
- Particles are biome-tinted — colors drawn from biome palette (greenish rain in fungal areas, orange ash near volcanic, etc.)
- 3 intensity tiers: light, moderate, heavy — each tier increases particle count/density
- Weather is purely cosmetic — no visibility reduction, no combat effects, no gameplay mechanics

### Transition behavior
- Crossfade blend on biome change: old weather fades out while new weather fades in simultaneously (~3 second duration)
- Rapid biome crossing: cancel current transition immediately, start new transition to latest biome — always responsive to actual player position
- Teleport (hub recall, etc.): instant swap to destination weather, no fade — teleport already has its own visual effect

### Weather variation
- Semi-random intensity cycles, each lasting 2-5 minutes per period
- Gradual ramp between intensity tiers — particle count smoothly increases/decreases, no visible jumps
- Weather intensity synced per zone across all players — shared experience via server-driven cycle
- Higher tier biomes are more volatile — shift intensity more often and hit heavy tier more frequently

### Claude's Discretion
- Exact weather type assignment per biome (within thematic match constraint)
- Particle count numbers per intensity tier
- Void Rift particle design specifics
- Server sync mechanism for weather intensity cycles
- Particle spawn patterns and movement behavior per weather type

</decisions>

<specifics>
## Specific Ideas

- 3-tier intensity system (light/moderate/heavy) that shifts semi-randomly over time
- Higher tier biomes feel more hostile through weather volatility, not just density
- Void Rift weather should feel alien/otherworldly — reality distortion, void energy, not natural precipitation

</specifics>

<deferred>
## Deferred Ideas

- Weather gameplay effects (visibility reduction, combat modifiers) — future phase
- Phase 126 tile shape fix: tiles rendering as flat tiles instead of full isometric cubes — bug fix needed

</deferred>

---

*Phase: 127-particle-weather-system*
*Context gathered: 2026-03-17*
