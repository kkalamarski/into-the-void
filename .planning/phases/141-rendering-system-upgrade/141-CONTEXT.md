# Phase 141: Rendering & System Upgrade - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement procedural tile rendering for all 32 new hub tiles (8 per faction hub), upgrade hub zones to support 128x128 maps, and add indoor ambient particle effects per hub biome. Does not include map design (Phase 142) or new tile types beyond what Phase 140 defined.

</domain>

<decisions>
## Implementation Decisions

### Tile visual identity
- Tiles within the same hub differentiated by BOTH pattern and color shifts — corridor has grating lines, main floor is smooth, decoration has texture details, etc.
- Wall tiles should feel tall/imposing — darker top face, pronounced side faces, clear visual barrier
- Hazard/special tiles (TILE-08) use static warning patterns (caution stripes, glowing edges) — no animation
- Door/doorway tiles render as open passages — floor-level tile with a slight frame outline, no physical door object

### Ambient particle style
- Very subtle density — barely noticeable, atmospheric haze. Visible if you look but doesn't compete with gameplay
- Constant indoors — no interaction with day/night cycle or weather system. Hubs are controlled environments
- Particles appear immediately when hub loads (teleport entry) — no fade-in
- Each hub has unique movement patterns per particle type: spores float lazily, steam rises in bursts, holo-dust drifts linearly, smoke wisps curl

### Rendering approach
- Clean with accents — mostly flat-colored faces with small accent details (rivets, cracks, glowing lines). Clean pixel art aesthetic
- Faction identity is color-driven — tile structures/shapes are similar across factions, color palettes make them distinct
- Window/viewport wall tiles render with a semi-transparent panel area on the wall face with subtle glow/color tint — suggests glass without showing through
- Decoration tiles (consoles, machinery, vegetation, cargo) are slightly elevated above the floor plane — small visual element rising above, more 3D feel

### Map size transition
- Hub-only change — only hub zones support 128x128. World zones stay at 64x64. Minimal blast radius
- Load entire 128x128 map at once on zone entry — no streaming/chunking
- Brief loading screen/overlay during zone transition to mask any load stutter
- Viewport culling for performance — only render tiles visible in current camera view

### Claude's Discretion
- Exact accent detail placement and patterns per tile type
- Loading screen visual design
- Viewport culling buffer size (how many tiles outside viewport to pre-render)
- Particle spawn rate and exact opacity values within "very subtle" guideline

</decisions>

<specifics>
## Specific Ideas

- Hub entry is via teleport only (not walking in), so cross-fade with weather is a scene transition, not a gradual blend
- Decorations should have slight elevation to create 3D depth on the isometric grid
- Window panels should suggest transparency via glow/tint, not actual see-through rendering

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 141-rendering-system-upgrade*
*Context gathered: 2026-03-18*
