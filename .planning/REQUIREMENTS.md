# Requirements: Into the Void

**Defined:** 2026-03-18
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.28 Requirements

Requirements for post-movement polish. Each maps to roadmap phases.

### Combat & Gathering

- [ ] **INTERACT-01**: Player can attack a creature within melee/ranged range and deal damage
- [ ] **INTERACT-02**: Player can gather from resource nodes (plants, minerals, artifacts) within gather range
- [ ] **INTERACT-03**: Distance checks for combat and gathering use correct pixel coordinates for both player and entity positions

### Entity Rendering

- [ ] **RENDER-01**: Player character and creatures are visually grounded on the tile surface (no floating)
- [ ] **RENDER-02**: Plants and minerals have their anchor point at their ground contact point, not sprite center
- [ ] **RENDER-03**: Entity sprites have minimal excess transparent space — trimmed to fit actual art
- [ ] **RENDER-04**: Entity collision/selection hitbox aligns with the visible sprite's ground position

### Collision

- [x] **COLLIDE-01**: No invisible collision walls exist at chunk boundaries — player moves freely across chunks
- [x] **COLLIDE-02**: No invisible collision walls exist at zone boundaries — player transitions smoothly between zones

### Visual

- [ ] **VISUAL-01**: Day/night cycle brightness is correct — dusk and dawn are brighter than night, not darker

## v1.27 Requirements (Shipped)

<details>
<summary>All 18 requirements completed — click to expand</summary>

### Movement Core

- [x] **MOVE-01**: Player moves freely at sub-tile pixel positions using WASD keys (not locked to tile grid)
- [x] **MOVE-02**: Player velocity is normalized on diagonal input (no 41% speed boost)
- [x] **MOVE-03**: Player collides with solid tiles via pixel hitbox (AABB against tile rectangles)
- [x] **MOVE-04**: Camera follows player pixel position smoothly each frame
- [x] **MOVE-05**: Walking animation plays while moving, idle when stopped, with 8-directional facing

### Multiplayer Sync

- [x] **SYNC-01**: Server validates player position at tick rate (speed-cap + collision check, rejects teleportation)
- [x] **SYNC-02**: Server broadcasts player positions at ~20Hz to nearby players
- [x] **SYNC-03**: Client predicts local movement and reconciles with server corrections
- [x] **SYNC-04**: Remote players interpolate smoothly between received positions (no snapping)

### Distance Systems

- [x] **DIST-01**: Combat range checks use pixel Euclidean distance instead of tile distance
- [x] **DIST-02**: Gathering interaction range uses pixel distance
- [x] **DIST-03**: NPC interaction range uses pixel distance
- [x] **DIST-04**: Creature AI aggro and leash ranges use pixel distance
- [x] **DIST-05**: Fog of war reveal radius uses pixel distance
- [x] **DIST-06**: Zone boundary detection works at pixel granularity

### Cleanup

- [x] **CLEAN-01**: Click-to-move and A* pathfinding code removed entirely
- [x] **CLEAN-02**: Flat blocking tiles audited — either made visually elevated or made walkable
- [x] **CLEAN-03**: Old tile-to-tile movement code removed (MovementController, tween system)

</details>

## Future Requirements

### Tile Variety (v1.29+)

- **TVAR-01**: 3-4 new floor tile variants per biome (visual variety)
- **TVAR-02**: 1-2 gameplay-distinct tiles per biome (speed modifiers, visual hooks)
- **TVAR-03**: Tile speed modifiers applied as continuous velocity multipliers

## Out of Scope

| Feature | Reason |
|---------|--------|
| Pixel creature movement | Deferred to v1.29+; creatures stay tile-snapped |
| New abilities or combat mechanics | Fix existing, don't add new |
| New entity sprites/art | Fix anchoring of existing sprites |
| Click-to-move restoration | Removed intentionally in v1.27 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INTERACT-01 | Phase 136 | Pending |
| INTERACT-02 | Phase 136 | Pending |
| INTERACT-03 | Phase 136 | Pending |
| RENDER-01 | Phase 137 | Pending |
| RENDER-02 | Phase 137 | Pending |
| RENDER-03 | Phase 137 | Pending |
| RENDER-04 | Phase 137 | Pending |
| COLLIDE-01 | Phase 138 | Complete |
| COLLIDE-02 | Phase 138 | Complete |
| VISUAL-01 | Phase 139 | Pending |

**Coverage:**
- v1.28 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 — traceability populated after roadmap creation*
