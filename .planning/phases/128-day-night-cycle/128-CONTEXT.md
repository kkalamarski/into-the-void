# Phase 128: Day/Night Cycle - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Camera-level brightness and color-temperature shifts on a continuous 20-minute cycle with four distinct phases (dawn, day, dusk, night). Includes a HUD time indicator. Must not affect minimap brightness or elevation shading. Biome-specific atmospheric effects are Phase 129.

</domain>

<decisions>
## Implementation Decisions

### Cycle timing & pacing
- Full cycle: 20 minutes real time, hardcoded constant
- Four distinct named phases: Dawn, Day, Dusk, Night
- Distribution: Day ~8min, Night ~8min, Dawn ~2min, Dusk ~2min
- Transitions between phases are smooth (eased blending), but each phase has a stable look in its middle
- Duration is a hardcoded constant — no server config needed

### Visual intensity range
- Day: Neutral — no tint, full brightness. Biome colors show unmodified
- Dawn/Dusk: Subtle warm tint — gentle warmth, noticeable but not overpowering. Naturalistic, not cinematic
- Night: ~40-50% brightness with desaturated blue tint — muted, almost grey-blue. Dark and cold, not stylized
- Elevation shading must remain unaffected — higher tiles stay relatively brighter than lower tiles at all times

### HUD time indicator
- Simple text label: "Dawn", "Day", "Dusk", "Night"
- Static HUD text color — no color-coding per phase
- Positioned near the minimap (below or beside it)
- No icons, no progress arcs — just the phase name

### Cycle synchronization
- Global server clock — one universal time for the entire game world
- Server sends current cycle position on WebSocket connect; client runs locally from there
- No periodic sync broadcasts — accept slight drift over long sessions
- Cycle keeps running in hubs/safe zones — time passes everywhere equally
- On login, player sees current global time (could be night)

### Claude's Discretion
- Exact easing curve for phase transitions
- ColorMatrix coefficient values (tune to match the described brightness/tint targets)
- How to derive cycle position from server epoch (modular arithmetic approach)
- Exact pixel placement of the time label relative to minimap

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 128-day-night-cycle*
*Context gathered: 2026-03-17*
