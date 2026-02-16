# Phase 8: Core Isometric Transformation - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the game from top-down to isometric diamond view with proper depth sorting. The server/logic remains unchanged — this is purely a client-side rendering transformation. Movement controls and click-to-move are handled in Phase 9.

</domain>

<decisions>
## Implementation Decisions

### Visual style
- 2:1 isometric ratio (classic diamond projection)
- Tile size: 128x64 pixels (upgrade from 96x48)
- Shadows only for depth cues, no tile borders
- Shadow direction: Southeast (light from NW)
- Soft blending at biome/tile transitions

### Entity placement
- Sprites anchor at tile center (classic positioning)
- Slight Y-offset for entities to appear elevated above tile surface
- Multiple entities on same tile stack vertically (visible stack)
- Blob shadow beneath each entity (circular/oval, not directional)

### Depth sorting
- Y-position based sorting (lower on screen = in front)
- X-position as tiebreaker when Y is identical (rightmost in front)
- Local player has priority at same depth — always visible
- Claude's Discretion: Whether depth updates per-frame or per-tile-change

### Camera behavior
- Direct center: player always at exact screen center
- Fixed zoom level (no player zoom control)
- Seamless scroll across zone/chunk boundaries
- Instant camera tracking (locked to player, no lerp)

### Claude's Discretion
- Depth sorting update frequency (continuous vs on-tile-change)
- Exact elevation offset amount for entity Y-offset
- Loading skeleton for chunk transitions
- Performance optimization approach for depth sorting with many entities

</decisions>

<specifics>
## Specific Ideas

- Tile size upgraded to 128x64 for more visual detail
- Keep existing sprite assets compatible where possible
- Shadows should feel subtle, not heavy

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-core-isometric-transformation*
*Context gathered: 2026-02-16*
