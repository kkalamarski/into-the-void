# Phase 126: Procedural Terrain Cubes - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace PNG tile sprites with procedural 3-shade isometric cubes baked to GPU textures. Each biome gets a distinct color palette with accent details. Elevation tinting is preserved. Weather, day/night, atmosphere, and rendering cleanup are separate phases (127-130).

</domain>

<decisions>
## Implementation Decisions

### Biome Color Palettes
- Stylized middle-ground tone — recognizable natural tones pushed slightly surreal (Hyper Light Drifter reference)
- Exotic biomes (void_rift, crystalline_fields, bioluminescent_depths, etc.) break the rule and go full alien/neon/glow
- Each biome uses a base hue for the cube faces + a contrasting accent hue for detail elements
- Use lore (/lore directory) as starting point for color direction, but diverge if visual distinctness requires it — note divergences for lore review

### Accent Details
- Details should be noticeable and readable at normal zoom — not just subtle texture noise
- All three cube faces get details: top shows surface features, sides show cross-section/depth continuation
- Mix of recognizable shapes and abstract procedural depending on biome — natural biomes get identifiable shapes (grass blades, rock cracks, sand ripples), exotic biomes get abstract patterns (noise, energy veins)
- Variant count per biome is at Claude's discretion based on biome complexity and performance budget

### Cube Shading Style
- Medium contrast between the three faces — noticeable face separation without being harsh
- Flat shading per face — each face is one solid color (plus accent details on top), no internal gradients
- Top-left light direction (classic isometric) — south face is lit, east face is in shadow
- Edge outlines/borders at Claude's discretion

### Elevation Tinting
- Strong dramatic gradient — low areas noticeably dark, peaks clearly bright; elevation is a major visual feature
- Low areas: darker only, no color shift (dimmer version of biome color)
- High areas: brighter only, no warm shift (lighter version of biome color)
- Tinting applied after accent details — elevation affects everything uniformly, including accents

### Claude's Discretion
- Exact variant count per biome tile type (performance-aware)
- Whether cube edges get outline lines or not
- Specific accent detail shapes per biome (within the recognizable/abstract guideline)
- How to handle biomes where lore doesn't suggest clear colors

</decisions>

<specifics>
## Specific Ideas

- Hyper Light Drifter as overall tone reference — vibrant but not neon, stylized but grounded
- Exotic biomes should feel genuinely alien and break from the naturalistic palette (void_rift glowing, crystalline fields shimmering)
- Accent details should serve as biome identification — a player should be able to tell biome type by detail shape even without color

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 126-procedural-terrain-cubes*
*Context gathered: 2026-03-17*
