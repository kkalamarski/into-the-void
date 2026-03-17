# Phase 131: Shared Foundation - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the coordinate contract (`PixelPosition` interface), pixel math modules (`pixel-validation.ts`, `pixel-distance.ts`), and shared constants that every downstream phase (132-135) depends on. No gameplay changes — only shared infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Pixel scale
- Claude's discretion on the exact TILE_SIZE_PX value — pick based on existing camera zoom, sprite rendering, and cleanest math
- Tile sprites are 256x256 isometric cubes; logical tile size may differ from sprite size
- Coordinates are world-space absolute (px/py are absolute positions in the zone, not chunk-relative)
- `tileToPixelCenter` returns the center of the tile (not top-left corner)
- `PixelPosition` is minimal: `{ px: number, py: number, zoneId: string }` — no timestamp field

### Player speed & feel
- Moderate / deliberate pace — player crosses a tile in roughly 1-1.2 seconds (exploration/survival feel, not action-oriented)
- `velocityFromKeys(keys, dt, speedMultiplier?)` — delta-time based (frame-independent), with optional speed multiplier parameter (defaults to 1.0) for future equipment/debuff modifiers
- No sprint constant in this phase — base speed only

### Player hitbox
- Square AABB hitbox
- Claude's discretion on hitbox size relative to tile — pick what feels right for the game's tile layouts
- Hitbox anchored at player's feet (bottom-center of sprite) — collision happens at ground level in isometric view
- `resolvePixelCollision` implements wall sliding (player slides along walls on diagonal input, not dead-stop)

### Range constants
- Claude's discretion on adjusting the roadmap's pre-specified values (melee=144, gather=192, aggro=480, leash=960) based on chosen tile scale — values should make gameplay sense relative to TILE_SIZE_PX
- Define range constants as multiples of TILE_SIZE_PX (e.g., `MELEE_RANGE_PX = 0.5 * TILE_SIZE_PX`) so they auto-scale if tile size changes
- NPC_INTERACT_RANGE_PX = same as GATHER_RANGE_PX (consistent "close enough" interaction distance)
- No fog of war reveal radius constant — user wants to remove fog of war (see Deferred Ideas)

### Claude's Discretion
- Exact TILE_SIZE_PX value (match to existing codebase conventions)
- Player hitbox size as fraction of tile
- Final range constant values (as tile-fraction multiples that approximate the roadmap numbers)
- Module placement within the package structure
- Any additional utility functions needed for the math modules

</decisions>

<specifics>
## Specific Ideas

- Movement should feel grounded and deliberate — this is a survival MMO, not a twitch action game
- Wall sliding on diagonal collision is important for smooth navigation in tight spaces
- Range constants as tile multiples is preferred for self-documenting code ("melee = half a tile")

</specifics>

<deferred>
## Deferred Ideas

- **Remove fog of war system** — User wants to remove fog of war entirely. This affects Phase 133 (DIST-05 success criteria: "Fog of war tiles reveal in a circular radius"). Needs a decision before Phase 133 planning — either remove DIST-05 or convert it to a different visibility mechanic.

</deferred>

---

*Phase: 131-shared-foundation*
*Context gathered: 2026-03-17*
