# Phase 134: Client Movement Rewrite - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace tile-step movement with continuous pixel-based WASD movement. Includes client-side prediction, server reconciliation, smooth camera, 8-directional walk/idle animations, and remote player interpolation. Sprint, camera effects, and zoom controls are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Movement feel
- Instant velocity on key press — no acceleration or deceleration curve
- Instant stop on key release — no wind-down
- Wall sliding on collision — diagonal into a wall slides along it, no dead stops
- Single movement speed — no sprint mechanic (speed differences come from equipment/buffs in future phases)
- Movement speed tuned during implementation — start with existing `PLAYER_SPEED_PX` constant, adjust by feel

### Camera following
- Center-locked — player always at exact center of screen
- No dead zone, no smooth follow lerp, no look-ahead
- No edge clamping — zones are procedurally generated with no hard boundaries
- Fixed zoom level — no player-controlled zoom in/out
- No camera shake or screen effects — pure static center-lock

### Animation transitions
- 8-directional sprite set — separate sprites for N, NE, E, SE, S, SW, W, NW
- Instant snap to idle on key release — no deceleration frames, matches instant velocity feel
- Fixed animation rate — walk cycle speed does not scale with movement speed
- Remote players show walk animation when their interpolated position is changing (not idle slide)

### Network correction UX
- Smooth snap-back for server corrections — lerp to corrected position over 2-3 frames
- Threshold-based reconciliation — ignore corrections under ~2-3px to prevent micro-jitter
- Buffered interpolation for remote players — hold ~2 server ticks of positions, interpolate smoothly between them
- Subtle connection quality icon — small icon in corner (green/yellow/red) for degraded connection state

### Claude's Discretion
- Exact correction lerp duration and easing
- Interpolation buffer size tuning
- Connection quality thresholds for icon states
- Walking animation frame count and timing
- Hitbox dimensions relative to sprite

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches. The overall feel should be snappy and responsive (arcade-style, like Enter the Gungeon or Vampire Survivors rather than weighty/realistic).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 134-client-movement-rewrite*
*Context gathered: 2026-03-18*
