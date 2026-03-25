# Phase 159: Creature AI & Debug Overlay - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix coordinate/distance mismatch causing: wrong tile data in debug overlay, player sinking (wrong elevation lookup), creatures not reacting to player (distance calc wrong), abilities "out of range" when standing next to creature. These are likely all ONE root cause — the player's pixel position maps to wrong tile coordinates somewhere in the pipeline.

</domain>

<decisions>
## Implementation Decisions

### User context (critical)
- The debug overlay showing wrong tile type/elevation is NOT just a display bug — the player actually SINKS because the system thinks they're at elevation 0. The position-to-tile mapping is fundamentally broken.
- Creatures DO move (slowly), but don't react to the player. Distance calculations are wrong — "Out of range" error when standing right next to a creature.
- The ability "out of range" error confirms the distance issue affects combat, gathering, and NPC interaction too.
- ALL these symptoms point to the same root cause: the player's pixel position (px, py) doesn't correctly map to the tile grid after the collision elevation offset changes.

### Investigation priorities
1. **Check the elevation collision offset in hitsWall()** — we added `c.x + elev * 64, c.y + elev * 64` to collision coords. Does this offset "leak" into the player's stored px/py position? If resolvePixelCollision returns offset coordinates instead of real ones, ALL downstream systems would get wrong tile positions.
2. **Check pixelToTile / tileToPixelCenter** — are these utility functions still correct? Do they account for the elevation offset?
3. **Check distance calculations** — pixelDistanceTo() in game-logic compares player px/py to entity positions. If player px/py is offset but entity positions aren't, distances are wrong.
4. **Check creature AI distance** — aggro radius check in creature-ai uses pixelDistanceTo. Same issue.

### Claude's Discretion
Claude investigates the full coordinate pipeline from player movement → stored px/py → tile lookup → distance calc → debug overlay. Fix the root cause, don't patch symptoms.

</decisions>

<specifics>
## Specific Ideas

- The collision elevation offset (`+elev * 64` on both axes) was the last change before things broke. Start investigation there.
- Check if `resolvePixelCollision` returns the OFFSET coordinates instead of the original player coordinates.

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>

---

*Phase: 159-creature-ai-debug-overlay*
*Context gathered: 2026-03-25*
