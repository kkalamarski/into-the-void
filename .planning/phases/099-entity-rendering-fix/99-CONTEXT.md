# Phase 99: Entity Rendering Fix - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix entity sprite positioning so entities render anchored at their tile's ground plane instead of floating above it. Fix selection indicator and health bar alignment to match. Affects all entity types (creatures, plants, minerals, artifacts) across all elevation levels.

</domain>

<decisions>
## Implementation Decisions

### Anchor position
- Entities float above tiles at ALL elevations (flat and elevated), not just hills
- The float is more visible on tall entities (trees) and elevated terrain, but exists everywhere
- All entities must sit flush with the tile top surface — no visible gap between sprite base and tile

### Selection indicator
- Selection ring appears at entity feet/base, like a shadow circle on the ground
- Ring must follow the entity as it moves (creatures wandering, fleeing)
- Ring stays at ground level of the tile the entity occupies

### Health bars
- Health bars are also misaligned — fix their position as part of this phase
- Health bars should be consistently positioned above the entity sprite after the anchor fix

### Entity type handling
- Same anchor formula for ALL entity types — no special cases for tall vs short
- Consistency across creatures, plants, minerals, and artifacts

### Movement transitions
- When creatures move between tiles with different elevations, smooth height transition (tween up/down)
- No snapping to new elevation — gradual visual change as entity crosses tile boundaries

### Claude's Discretion
- Exact anchor offset math and coordinate calculations
- Whether to fix via container position, sprite offset, or both
- Shadow positioning details
- Depth sorting adjustments if needed after repositioning

</decisions>

<specifics>
## Specific Ideas

- "Entities should be rendered at a base, not elevated" — the current elevation offset is applying incorrectly
- Trees are the most obvious case — the select indicator ends up way below the actual tree sprite
- The fix should make entities look like they're standing ON the tile, not hovering above it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 99-entity-rendering-fix*
*Context gathered: 2026-02-26*
