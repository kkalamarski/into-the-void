# Phase 133: Distance System Migration - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate all game systems that perform range checks from tile-integer distance to pixel Euclidean distance using `pixelDistanceTo()`. Covers combat, gathering, NPC interaction, creature AI, and zone boundaries. Fog of war (DIST-05) is explicitly skipped — the system is being deleted.

</domain>

<decisions>
## Implementation Decisions

### Gather cancellation
- Immediate cancel the moment pixel distance exceeds GATHER_RANGE_PX — no grace buffer
- Full progress reset on cancel — must start over if player returns to range
- Progress bar simply disappears on cancel — no "Too far away" message or toast
- Range check at gather completion vs start: Claude's discretion on whether to add a small leniency buffer

### Range feedback
- Combat targets get a highlight/outline change when within MELEE_RANGE_PX (attackable indicator)
- Gather nodes get a similar highlight/outline when within GATHER_RANGE_PX — consistent system across interactables
- Failed attack due to range shows "Out of range" floating combat text
- NPC interaction prompt appears/disappears instantly at range boundary — no fade transition

### Fog of war
- DIST-05 is skipped entirely — fog of war system is being deleted, no migration needed

### Creature aggro
- ~0.5 second detection delay when player enters AGGRO_RADIUS_PX — creature "notices" before pursuing
- Immediate leash when player exceeds LEASH_RADIUS_PX — no gradual disengage
- "!" exclamation mark icon above creature when it first aggros (classic detection cue)
- Full HP heal when creature leashes and returns to spawn — prevents kiting exploits

### Claude's Discretion
- Exact gather completion range leniency (same vs slightly larger than start range)
- Zone boundary transition implementation details (DIST-06)
- Visual styling of range highlights (color, outline thickness, animation)
- Duration and animation of the "!" aggro indicator

</decisions>

<specifics>
## Specific Ideas

- Range highlight system should be consistent across combat targets and gather nodes — same visual language
- Aggro detection delay gives players a moment to back away, adding tactical depth
- Full leash heal is an anti-exploit measure — prevents kiting creatures to death

</specifics>

<deferred>
## Deferred Ideas

- Fog of war deletion — handle in a cleanup/removal phase, not here
- Ranged weapon distance checks — not in scope until ranged combat exists

</deferred>

---

*Phase: 133-distance-system-migration*
*Context gathered: 2026-03-17*
