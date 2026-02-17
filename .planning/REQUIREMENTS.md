# Requirements: Into the Void

**Defined:** 2026-02-17
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.5 Requirements

Requirements for Movement Overhaul milestone. Each maps to roadmap phases.

### Input

- [ ] **INPUT-01**: Player can move in all 8 directions using WASD with dual-key detection (W=N, S=S, A=W, D=E, W+A=NW, W+D=NE, S+A=SW, S+D=SE)

### Movement

- [ ] **MOVE-01**: Player movement speed is unified at 150ms delay for both keyboard and click-to-move
- [ ] **MOVE-02**: Server rate limit reduced from 140ms to 125ms to support faster client movement
- [ ] **MOVE-03**: Player movement speed is modified by tile `movementSpeed` property (slow tiles = higher delay, fast tiles = lower delay)

### Pathfinding

- [ ] **PATH-01**: Click-to-move pathfinding uses 8-directional A* (diagonal neighbors) for straight isometric paths

### Camera & Visual

- [ ] **CAM-01**: Camera follows player with smooth lerp interpolation instead of instant snap
- [ ] **CAM-02**: Player sprite slides between tiles with tween animation instead of teleporting
- [ ] **CAM-03**: Tile hover highlight is removed (broken with elevation, not needed)

## Future Requirements

Deferred to future releases. Not in current roadmap.

### Visual Polish

- **VIS-01**: Click-to-move path shows step dots at each waypoint, not just destination diamond

### Advanced Movement

- **ADV-01**: Player can face a direction without moving (Ctrl+WASD)
- **ADV-02**: Player can toggle run/walk speed modes

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Free-movement (non-grid) WASD | Breaks client-side prediction model; grid is load-bearing |
| Camera rotation | Sprites drawn for fixed angle; would require 4x art variants |
| Cross-zone pathfinding | Requires multi-zone graph; complexity vs value tradeoff |
| Scroll zoom | Breaks viewport culling; fixed 1.5x zoom is correct |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INPUT-01 | Phase 22 | Pending |
| MOVE-01 | Phase 21 | Pending |
| MOVE-02 | Phase 21 | Pending |
| MOVE-03 | Phase 23 | Pending |
| PATH-01 | Phase 22 | Pending |
| CAM-01 | Phase 23 | Pending |
| CAM-02 | Phase 23 | Pending |
| CAM-03 | Phase 23 | Pending |

**Coverage:**
- v1.5 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-17 after roadmap creation (all 8 requirements mapped)*
