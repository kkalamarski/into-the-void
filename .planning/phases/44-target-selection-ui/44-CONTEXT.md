# Phase 44: Target Selection UI - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Visual feedback showing which entity the player is currently targeting during combat. Includes a highlight on the creature sprite and a target frame in the HUD displaying creature info.

</domain>

<decisions>
## Implementation Decisions

### Highlight style
- Highlight type: Claude's discretion (glow, outline, or ring)
- Color: Match the target creature's rarity tier color
- Intensity: Claude's discretion
- Animation: Slow pulse animation to keep attention on target

### Target switching
- Instant switch when clicking a new creature — highlight moves immediately, auto-attack retargets
- Can target creatures outside combat range — highlight shows but combat won't start until in range
- Clicking ground (empty tile) clears the current target
- Target persists if player moves out of combat range — combat resumes if player returns to range

### Clear behavior
- On target death: Highlight fades out over ~0.5s as creature despawns
- On player death: Target cleared immediately
- On leash: Target cleared when creature returns to spawn (combat end)
- Auto-target: First creature to aggro/attack the player becomes the target automatically

### Target frame (HUD)
- Position: Top-center of screen (classic MMO position)
- Content: Creature name, health bar with numbers (e.g., "145 / 200"), level badge
- Perception gating: Same rules apply — show "???" if creature level exceeds perception threshold
- Interaction: Display only, no click behavior
- Feedback: Health bar/frame flashes red briefly when target takes damage
- Styling: Frame/name colored by creature rarity tier

### Claude's Discretion
- Exact highlight visual (glow vs outline vs ring)
- Highlight intensity/prominence
- Frame visual design details (exact dimensions, fonts, spacing)
- Fade timing for death animation

</decisions>

<specifics>
## Specific Ideas

- Target frame in top-center follows classic MMO convention — clear and familiar
- Rarity colors should be consistent with existing item rarity system
- Health numbers provide precision, bar provides at-a-glance status
- Flash on damage keeps attention on combat feedback

</specifics>

<deferred>
## Deferred Ideas

- Critical hit damage numbers (bigger, longer display) — future phase (requires critical hit system)

</deferred>

---

*Phase: 44-target-selection-ui*
*Context gathered: 2026-02-19*
