# Requirements: Into the Void

**Defined:** 2026-03-17
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.27 Requirements

Requirements for pixel movement rewrite. Each maps to roadmap phases.

### Movement Core

- [ ] **MOVE-01**: Player moves freely at sub-tile pixel positions using WASD keys (not locked to tile grid)
- [x] **MOVE-02**: Player velocity is normalized on diagonal input (no 41% speed boost)
- [ ] **MOVE-03**: Player collides with solid tiles via pixel hitbox (AABB against tile rectangles)
- [ ] **MOVE-04**: Camera follows player pixel position smoothly each frame
- [ ] **MOVE-05**: Walking animation plays while moving, idle when stopped, with 8-directional facing

### Multiplayer Sync

- [x] **SYNC-01**: Server validates player position at tick rate (speed-cap + collision check, rejects teleportation)
- [x] **SYNC-02**: Server broadcasts player positions at ~20Hz to nearby players
- [ ] **SYNC-03**: Client predicts local movement and reconciles with server corrections
- [ ] **SYNC-04**: Remote players interpolate smoothly between received positions (no snapping)

### Distance Systems

- [x] **DIST-01**: Combat range checks use pixel Euclidean distance instead of tile distance
- [x] **DIST-02**: Gathering interaction range uses pixel distance
- [x] **DIST-03**: NPC interaction range uses pixel distance
- [x] **DIST-04**: Creature AI aggro and leash ranges use pixel distance
- [ ] **DIST-05**: Fog of war reveal radius uses pixel distance
- [ ] **DIST-06**: Zone boundary detection works at pixel granularity

### Cleanup

- [ ] **CLEAN-01**: Click-to-move and A* pathfinding code removed entirely
- [ ] **CLEAN-02**: Flat blocking tiles audited — either made visually elevated or made walkable
- [ ] **CLEAN-03**: Old tile-to-tile movement code removed (MovementController, tween system)

## Future Requirements

### Tile Variety (v1.28)

- **TVAR-01**: 3-4 new floor tile variants per biome (visual variety)
- **TVAR-02**: 1-2 gameplay-distinct tiles per biome (speed modifiers, visual hooks)
- **TVAR-03**: Tile speed modifiers applied as continuous velocity multipliers

### Movement Polish (v1.28+)

- **MPOL-01**: Collision sliding (wall slide instead of dead stop on shallow angles)
- **MPOL-02**: Inertia/momentum feel (brief deceleration on key release)
- **MPOL-03**: Smooth zone boundary crossing at pixel granularity (no stutter at chunk seams)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Click-to-move / pathfinding | Explicitly removed — WASD only. Pathfinding in pixel space requires navmesh. |
| Server-side physics simulation | Running Phaser physics in NestJS is impractical. Server validates positions, not simulates. |
| Per-pixel collision map | 24K×24K pixel grid per zone is impractical. Per-tile solid flag with AABB hitbox is sufficient. |
| Matter.js physics | Overkill for top-down with no jumping. Arcade Physics AABB is sufficient and lightweight. |
| Creature pixel movement | Creatures stay tile-snapped on server. Only player gets pixel movement in v1.27. |
| New abilities or combat changes | Movement rewrite only — combat mechanics unchanged except range units. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MOVE-01 | Phase 134 | Pending |
| MOVE-02 | Phase 131 | Complete |
| MOVE-03 | Phase 134 | Pending |
| MOVE-04 | Phase 134 | Pending |
| MOVE-05 | Phase 134 | Pending |
| SYNC-01 | Phase 132 | Complete |
| SYNC-02 | Phase 132 | Complete |
| SYNC-03 | Phase 134 | Pending |
| SYNC-04 | Phase 134 | Pending |
| DIST-01 | Phase 133 | Complete |
| DIST-02 | Phase 133 | Complete |
| DIST-03 | Phase 133 | Complete |
| DIST-04 | Phase 133 | Complete |
| DIST-05 | Phase 133 | Pending |
| DIST-06 | Phase 133 | Pending |
| CLEAN-01 | Phase 135 | Pending |
| CLEAN-02 | Phase 135 | Pending |
| CLEAN-03 | Phase 135 | Pending |

**Coverage:**
- v1.27 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 — traceability updated after roadmap creation*
