# Phase 157: Liquid Generation & Rendering - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

World-gen places liquid tiles at elevation <= 0. Client renders liquid as half-height isometric slabs at fixed sea level (elevation 0). Translucent liquids show terrain below, opaque ones cover it. Liquid tiles are not blocking.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User deferred all decisions. Standard procedural rendering approach, simple half-height colored slabs.

Key constraints:
- Terrain generation: after generating terrain tiles and heights, any tile at elevation <= 0 gets a liquid overlay tile placed at elevation 0 (sea level)
- Liquid is a SECOND tile on top of the terrain — terrain tile stays, liquid renders above it
- Liquid renders as half-height slab (using renderHeightMultiplier from tile definition)
- Translucent liquids: terrain tile visible beneath (liquid has alpha < 1.0)
- Opaque liquids: terrain not visible (liquid fully covers)
- Liquid tile data sent from server to client as part of chunk data (new field or overlay array)
- Collision map unchanged — liquids are NOT blocking (isBlocking: false)
- The BIOME_LIQUID_MAP from Phase 156 maps biome → liquid tile ID for generation

Rendering approach:
- ProceduralTileGenerator generates liquid cube textures (half-height) with biome-appropriate colors
- TileRenderer renders liquid tiles as a separate layer on top of terrain at elevation 0
- Alpha/opacity from tile definition controls transparency

</decisions>

<specifics>
## Specific Ideas

No specific requirements — standard approach. The liquid slab should look like a thin colored block sitting at sea level, filling valleys and depressions.

</specifics>

<deferred>
## Deferred Ideas

- Animated liquid surface (ripples, waves) — future polish
- Liquid particles (bubbles, steam from magma) — future polish

</deferred>

---

*Phase: 157-liquid-generation-rendering*
*Context gathered: 2026-03-25*
