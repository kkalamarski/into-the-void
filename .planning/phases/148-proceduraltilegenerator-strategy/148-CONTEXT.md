# Phase 148: ProceduralTileGenerator Strategy - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the two large switch blocks (30+ cases each for detail and shade rendering) in ProceduralTileGenerator.ts with behavioral-category tile strategies. Six categories: floor, wall, hazard, water, portal, decorative. Visual output must be identical before and after.

</domain>

<decisions>
## Implementation Decisions

### Category boundaries
- Six behavioral categories: FloorTileStrategy, WallTileStrategy, HazardTileStrategy, WaterTileStrategy, PortalTileStrategy, DecorativeTileStrategy
- Hub tiles use the same categories — hub floor tiles go in FloorTileStrategy, hub walls in WallTileStrategy, etc. No special-casing for hubs.
- Mixed-behavior tiles categorized by primary behavior — e.g., toxic_pool (damage + slow) is a HazardTile. One strategy per tile, no composition.

### Strategy granularity
- One strategy class per behavioral category (6 total), each handling all biome variants internally via biome-keyed lookup
- Per-tile accent/detail rendering is data-driven config (e.g., { type: 'pebbles', count: 5, color: palette.accent }) interpreted by a generic drawer within each strategy — less code, more declarative
- No sub-strategies per biome — keep it flat

### File & data organization
- Strategies live in: apps/web/src/game/rendering/tile-strategies/ (sibling to strategies/ from Phase 147)
- BIOME_PALETTES moved to separate data file: tile-palettes.ts alongside tile-strategies/
- One file per strategy class + types.ts for interface + index.ts for registry

### Pattern consistency with Phase 147
- Same patterns as entity strategies: Registry Map<TileCategory, TileRenderStrategy>, AbstractTileRenderStrategy base class with shared rendering, separate data files
- Consistent codebase conventions across both entity and tile strategy systems

</decisions>

<specifics>
## Specific Ideas

- Data-driven accent configs should be declarative enough that adding a new tile variant means adding a config entry, not writing drawing code
- The generic drawer within each strategy interprets config entries like 'pebbles', 'cracks', 'ripples', 'sparkles', 'lines' as reusable drawing primitives

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 148-proceduraltilegenerator-strategy*
*Context gathered: 2026-03-24*
