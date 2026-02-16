# Phase 13: Tile Definition Architecture - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish scalable tile system with elevation metadata. Create TileDefinition interface, migrate existing 16 tile types to registry, extend ChunkData schema with heights[][] and structures[], and implement tile hooks system for future extensibility.

</domain>

<decisions>
## Implementation Decisions

### Tile Definition Schema
- Elevation range: 0-5 levels (simple integer heights)
- Include texture hint field (textureKey) — renderer decides final visuals, can fall back to procedural colors
- Single definition per tile type — visual variants handled by renderer using position-seeded selection (hash(x,y) % variants.length for consistency)

### Registry Pattern
- String IDs for tile identification ('grass', 'metal_floor') — readable and extensible
- New dedicated tiles package (@into-the-void/tiles) — separate from shared-types and game-logic
- Static registration only — all tiles defined at build time
- Unknown tile IDs return fallback 'unknown' tile with warning (not throw)

### Height Data Format
- heights[][] structure: Claude's discretion based on existing ChunkData patterns
- Whole tile height only — each tile has one height level (no corner heights or smooth slopes)
- Height data transmitted inline with ChunkData on chunk load
- Raw heights only — pathfinding calculates walkability on demand (no pre-computed flags)

### Hook System Design
- Phase 13 implements interface + onStep hook working (triggers when player steps on tile)
- Minimal context: hook receives player entity and tile position only
- Sync only — hooks must return immediately, no async/await
- Return effects pattern — hooks return what should happen, caller applies changes

### Claude's Discretion
- Exact TileDefinition interface field names
- Whether heights use flat array or 2D array (choose based on existing patterns)
- Internal registry data structure (Map, object, etc.)
- Hook effect type design

</decisions>

<specifics>
## Specific Ideas

- Position-seeded variant selection means same tile always looks same without extra storage
- Fallback tile approach allows graceful degradation when tile definitions change between versions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-tile-definition-architecture*
*Context gathered: 2026-02-16*
