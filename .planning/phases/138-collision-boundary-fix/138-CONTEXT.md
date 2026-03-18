# Phase 138: Collision Boundary Fix - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix invisible collision walls at chunk and zone boundaries so players move freely in any direction without stutter, walls, or position corrections. Zone transitions should trigger smoothly without the player being stopped by an invisible barrier. This phase fixes bugs only — no new movement mechanics or zone systems.

</domain>

<decisions>
## Implementation Decisions

### Zone transition experience
- Movement is seamless — no pause, fade, or loading screen when crossing a zone boundary
- A centered cinematic text notification appears (Dark Souls style) showing zone name + danger level (e.g., "Crimson Wastes [Hostile]")
- Text fades in at center-top of screen, holds for 2-3 seconds, then fades out
- Notification has a ~30-second cooldown per zone — if player re-enters the same zone within 30s, suppress the popup
- Zone name cinematic also shows on first spawn into the game (session start)

### Chunk boundary behavior
- Chunk boundaries are completely invisible to the player — no visual seams, no feedback, no indication
- Chunks are a purely technical detail that should never surface in gameplay

### Zone boundary awareness
- Terrain gradually blends/transitions near zone edges — mix of both biomes signals an upcoming zone change
- Minimap updates in real-time as player approaches zone edges — adjacent zone terrain visible before crossing

### Edge case behavior
- Diagonal crossings across 4-chunk corners must be as seamless as cardinal direction crossings — no special casing
- When a zone boundary coincides with a chunk boundary, both transitions happen simultaneously — no prioritization
- Movement is never blocked for loading — if zone data hasn't arrived yet (network lag), player keeps moving
- Unloaded terrain shows as dark fog/void that clears when data arrives — fits the sci-fi unexplored region aesthetic

### Claude's Discretion
- Technical approach to collision boundary stitching
- Exact fade timing and easing for cinematic text
- Terrain blend algorithm at zone edges
- How to handle minimap rendering of adjacent zones
- Dark fog visual implementation details

</decisions>

<specifics>
## Specific Ideas

- Zone name notification styled like Dark Souls area discovery text — large, centered, cinematic
- Dark fog for unloaded zones feels like "unexplored region" — thematic with sci-fi setting
- Movement is sacred — never interrupt player movement for technical reasons (loading, transitions)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 138-collision-boundary-fix*
*Context gathered: 2026-03-18*
