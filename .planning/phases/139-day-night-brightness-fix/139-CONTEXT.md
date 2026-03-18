# Phase 139: Day/Night Brightness Fix - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the day/night ColorMatrix brightness curve so night is the darkest period and dusk/dawn are noticeably brighter than night. Keep existing cycle timing and phase boundaries. This is a visual correction, not a feature addition.

</domain>

<decisions>
## Implementation Decisions

### Brightness levels
- Night (midnight): ~40-50% brightness — moderately dim, all terrain/entities remain visible without light sources
- Dusk/Dawn (06:00/18:00): ~70-75% brightness — clearly brighter than night, clearly dimmer than day
- Day (noon): 100% brightness — no filter, sprites display as designed
- Subtle vignette effect at night — screen edges slightly darker than center, creating a soft spotlight feel around the player

### Transition feel
- Smooth ease-in-out curve between phases — transitions start slow, accelerate, then slow again
- Transitions take ~30 seconds real-time
- Dawn and dusk transitions are symmetric — same duration and curve shape
- No visual cue or notification when a transition starts — the gradual change is the cue itself

### Color temperature
- Night: cool blue tint alongside the dimming — classic moonlight feel
- Dusk/Dawn: subtle warm amber/golden tint — adds atmosphere without overpowering sprite colors
- Day: no tint at all — full original sprite colors
- Slight desaturation at night — colors become muted, mimicking how vision loses color in low light
- Uniform tinting across all biomes — no per-zone color variation

### Cycle timing
- Keep existing cycle duration — do not change how long a full day/night cycle takes
- Keep existing phase boundaries (when dawn/day/dusk/night start) — only fix the brightness curve within the current timing structure
- Server-wide clock — all players experience the same time of day
- Existing HUD time indicator stays as-is

### Claude's Discretion
- Exact blue tint RGB values for night
- Exact amber tint values for dusk/dawn
- Vignette radius and falloff curve
- Precise desaturation amount at night
- Easing function specifics (cubic, sine, etc.)

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches. The key requirement is that the brightness curve must be visually correct: night darkest, dusk/dawn noticeably brighter, day full brightness, with smooth eased transitions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 139-day-night-brightness-fix*
*Context gathered: 2026-03-18*
