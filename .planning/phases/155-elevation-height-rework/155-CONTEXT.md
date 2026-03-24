# Phase 155: Elevation & Height Rework - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Change ELEVATION_HEIGHT_STEP from 128px to 64px so terrain tiles render as slabs instead of cubes. Set wall tiles to render at 4x height (256px) to tower over ground. Validate all elevation-dependent systems continue working: collision, depth sorting, entity placement, camera positioning, isometric coordinate conversion.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User deferred all implementation decisions to Claude. The core changes are constant value updates with cascading system validation. Claude has full discretion on:

- Whether ALL wall tiles get 4x height or only specific tile types (likely all tiles with isBlocking=true and defaultElevation >= 2)
- Whether hub station walls also get 4x treatment (they should — same wall behavior)
- Whether ENTITY_GROUND_OFFSET needs adjustment for the new 64px step
- How depth sorting calculations adapt (elevationOffset = elevation * 64 instead of * 128)
- Whether the ProceduralTileGenerator's side-face rendering needs height adjustment for the slab proportions
- Camera offset adjustments for the new terrain height profile
- Any collision system adjustments needed for the halved step

Key constants to change:
- ELEVATION_HEIGHT_STEP: 128 → 64
- Wall rendering height: needs to be 4x the step (256px)
- All downstream references to these values

</decisions>

<specifics>
## Specific Ideas

- The F3 debug overlay from Phase 154 will be invaluable for validating elevation values during this change
- The collision visualization will help verify wall collision boundaries are correct at new heights

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 155-elevation-height-rework*
*Context gathered: 2026-03-24*
