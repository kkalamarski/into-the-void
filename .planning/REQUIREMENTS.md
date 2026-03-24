# Requirements: Into the Void

**Defined:** 2026-03-24
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.32 Requirements

Requirements for debug tooling and visual polish milestone. Each maps to roadmap phases.

### Debug View

- [ ] **DEBUG-01**: F3 toggles semi-transparent HUD overlay showing: player position (px, py), zone ID, tile coordinates, player elevation, current tile elevation & type, biome name
- [ ] **DEBUG-02**: Debug overlay shows performance & network info: FPS, entity count in zone, server ping/latency, loaded/pending/failed chunk counts
- [ ] **DEBUG-03**: Debug overlay shows game state: day/night cycle phase & time, combat state & target ID
- [ ] **DEBUG-04**: When debug view is active, all collision boundaries are visualized — blocking tile outlines, feature entity collision boxes, wall collision areas
- [ ] **DEBUG-05**: F3 overlay has no performance impact when hidden — collision visualization only renders when toggled on

### Feature Rendering

- [ ] **RENDER-01**: Feature entities (plants, minerals, artifacts) render without white outline/border artifacts

### Elevation & Height

- [ ] **ELEV-01**: Elevation step height is 64px (half current 128px) — terrain tiles render as slabs, not cubes
- [ ] **ELEV-02**: Wall tiles render at 4x elevation height, visibly towering over ground-level tiles
- [ ] **ELEV-03**: All elevation-dependent systems (collision, depth sorting, entity placement, camera) work correctly with the new 64px step

## Out of Scope

| Feature | Reason |
|---------|--------|
| New debug commands or console | F3 overlay only — no interactive debug console |
| Tile/entity inspector (click to inspect) | Future milestone — this is read-only overlay |
| New terrain features or biome changes | Visual adjustments only to existing terrain |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEBUG-01 | Phase 154 | Pending |
| DEBUG-02 | Phase 154 | Pending |
| DEBUG-03 | Phase 154 | Pending |
| DEBUG-04 | Phase 154 | Pending |
| DEBUG-05 | Phase 154 | Pending |
| RENDER-01 | Phase 154 | Pending |
| ELEV-01 | Phase 155 | Complete |
| ELEV-02 | Phase 155 | Complete |
| ELEV-03 | Phase 155 | Complete |

**Coverage:**
- v1.32 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 — traceability updated after roadmap creation*
