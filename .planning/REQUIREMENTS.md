# Requirements: Into the Void v1.2

**Defined:** 2026-02-16
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.2 Requirements

Requirements for isometric view transformation. Each maps to roadmap phases.

### Core Transformation

- [ ] **CORE-01**: Game renders tiles as isometric diamonds using 2:1 aspect ratio (96x48)
- [ ] **CORE-02**: Coordinate transform utility converts grid coordinates to screen positions
- [ ] **CORE-03**: Coordinate transform utility converts screen positions to grid coordinates
- [ ] **CORE-04**: Entities sort by depth correctly (closer to camera renders on top)
- [ ] **CORE-05**: Depth sorting uses Phaser Layer API with throttled updates
- [ ] **CORE-06**: Player sprite positioned correctly on isometric tile center

### Movement & Controls

- [ ] **MOVE-01**: WASD controls use screen-relative mapping (W=NW, S=SE, A=SW, D=NE)
- [ ] **MOVE-02**: Click-to-move works with isometric tile detection
- [ ] **MOVE-03**: Pathfinding visual path displays correctly on isometric grid
- [ ] **MOVE-04**: Movement tweens animate smoothly along isometric paths

### Rendering

- [ ] **REND-01**: Tiles render in correct back-to-front order (no z-fighting)
- [ ] **REND-02**: Viewport culling uses diamond-shaped bounds for efficiency
- [ ] **REND-03**: Camera follows player with correct isometric offset
- [ ] **REND-04**: Adjacent chunk tiles align seamlessly at chunk boundaries

### Multiplayer

- [ ] **MULT-01**: Remote players render at correct isometric positions
- [ ] **MULT-02**: Remote player movement tweens use grid coordinates
- [ ] **MULT-03**: Position sync maintains accuracy with 100ms+ latency
- [ ] **MULT-04**: Entity positions match between all connected clients

### UI Integration

- [ ] **UI-01**: Minimap remains orthogonal (top-down view)
- [ ] **UI-02**: Minimap player indicator shows correct relative position
- [ ] **UI-03**: Health bars position above entities at correct Y-offset
- [ ] **UI-04**: Behavior icons (H/O/P/M) position correctly above health bars
- [ ] **UI-05**: Zone HUD displays correctly (unchanged from v1.1)

### Polish

- [ ] **PLSH-01**: Tiles highlight on mouse hover
- [ ] **PLSH-02**: Click target shows visual feedback before pathfinding starts
- [ ] **PLSH-03**: Entity highlight on mouse hover for selection feedback

## Future Requirements

Deferred to future milestones. Not in current roadmap.

### Advanced Rendering

- **ADVR-01**: Zoom levels (2-3 discrete levels for tactical overview)
- **ADVR-02**: Dynamic shadows under entities
- **ADVR-03**: Elevation/height variation for terrain depth

### Art Pipeline

- **ART-01**: Isometric sprite assets replace colored diamonds
- **ART-02**: 8-direction entity sprites for movement animation
- **ART-03**: Biome-specific isometric tile textures

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Camera rotation | Massively increases asset requirements, causes player disorientation |
| Free-form movement | Isometric works best with grid-snapped movement |
| 3D lighting/shaders | Complexity without proportional visual benefit for 2D |
| Pixel-perfect isometric ratio | 2:1 ratio sufficient, stricter ratios limit tile dimensions |
| Separate tilemap system | Native Phaser approach simpler than plugin alternatives |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 8 | Pending |
| CORE-02 | Phase 8 | Pending |
| CORE-03 | Phase 8 | Pending |
| CORE-04 | Phase 8 | Pending |
| CORE-05 | Phase 8 | Pending |
| CORE-06 | Phase 8 | Pending |
| MOVE-01 | Phase 9 | Pending |
| MOVE-02 | Phase 9 | Pending |
| MOVE-03 | Phase 9 | Pending |
| MOVE-04 | Phase 9 | Pending |
| REND-01 | Phase 8 | Pending |
| REND-02 | Phase 9 | Pending |
| REND-03 | Phase 9 | Pending |
| REND-04 | Phase 8 | Pending |
| MULT-01 | Phase 10 | Pending |
| MULT-02 | Phase 10 | Pending |
| MULT-03 | Phase 10 | Pending |
| MULT-04 | Phase 10 | Pending |
| UI-01 | Phase 11 | Pending |
| UI-02 | Phase 11 | Pending |
| UI-03 | Phase 11 | Pending |
| UI-04 | Phase 11 | Pending |
| UI-05 | Phase 11 | Pending |
| PLSH-01 | Phase 12 | Pending |
| PLSH-02 | Phase 12 | Pending |
| PLSH-03 | Phase 12 | Pending |

**Coverage:**
- v1.2 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after initial definition*
