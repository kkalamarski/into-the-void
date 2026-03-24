# Phase 154: Debug Overlay & Feature Rendering Fix - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Add an F3-toggled debug HUD overlay showing player position, world state, performance metrics, and collision boundaries. Also fix white outline artifact on feature entities (plants, minerals, artifacts). No new gameplay features.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User deferred all implementation decisions to Claude. Minecraft's F3 debug screen is the reference. Claude has full discretion on:

- Overlay layout: left-aligned text column (Minecraft-style), semi-transparent dark background, monospace font
- Info grouping: position/tile block, performance block, game state block — stacked vertically
- Collision visualization colors: different colors per collision source type (e.g., red for blocking tiles, blue for feature entities, yellow for walls) so they're distinguishable
- Collision rendering: wireframe outlines on the isometric tile grid, drawn on a dedicated debug graphics layer
- F3 key binding integration with existing InputController (Phase 152)
- White outline fix: investigate and remove the source of the artifact on feature entity sprites
- Performance: debug graphics layer only created/updated when F3 is active, destroyed when toggled off

</decisions>

<specifics>
## Specific Ideas

- Reference: Minecraft F3 debug screen — left-aligned text overlay with semi-transparent background
- Collision visualization should be in-world (drawn on the game canvas at tile/entity positions), not a separate minimap overlay
- The overlay should be developer-facing — it's okay if it looks utilitarian, not polished

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 154-debug-overlay-feature-rendering-fix*
*Context gathered: 2026-03-24*
