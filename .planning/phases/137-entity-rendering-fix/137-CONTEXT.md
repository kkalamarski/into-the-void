# Phase 137: Entity Rendering Fix - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix entity sprite positioning so all sprites are visually grounded on tile surfaces, with clickable hitboxes matching what players see. No new rendering features — fix existing bugs with floating sprites, misaligned hitboxes, and transparent padding.

</domain>

<decisions>
## Implementation Decisions

### Sprite anchoring
- Fix BOTH code anchors AND sprite assets: trim transparent padding from PNGs (one-time manual cleanup) and adjust anchor points in code
- Anchor offsets configured per entity type (player, creature, plant, mineral) — not per individual sprite
- Anchor point at bottom-center of visible art — sprite "stands" on the tile center
- Sprite trimming is a one-time manual cleanup, not an automated build step. Document the convention for future art

### Hitbox sizing
- Hitboxes tight to visible art — clicking empty space around a sprite won't select it
- All entity types use rectangular hitboxes (axis-aligned)
- Click priority: creatures first, then resources. In combat situations, reliably targeting enemies takes precedence
- Hover indicator: outline glow around the entity when cursor is over a clickable entity

### Ground contact feel
- Elliptical drop shadow beneath each entity's feet to visually ground sprites on tile surfaces
- Shadow size scales with the entity — larger entities get larger shadows
- Depth sorting by foot position — tall sprites naturally overlap tiles/entities behind them (standard isometric depth sorting)
- Shadows rendered dynamically as Phaser graphics ellipses at runtime (semi-transparent black, no extra sprite assets)

### Claude's Discretion
- Exact shadow opacity and ellipse proportions
- How to handle edge cases (entities on tile boundaries)
- Specific trim amounts per sprite asset
- Depth sort tie-breaking rules

</decisions>

<specifics>
## Specific Ideas

- Shadows should be subtle — enough to ground the sprite but not visually heavy
- The hover outline glow should be consistent with any existing selection highlighting in the game

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 137-entity-rendering-fix*
*Context gathered: 2026-03-18*
