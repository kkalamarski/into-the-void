# Requirements: Into the Void

**Defined:** 2026-03-18
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.29 Requirements

Requirements for hub station interiors. Each maps to roadmap phases.

### Hub Biomes

- [ ] **BIOME-01**: Canopy Station has a unique `canopy_station` biome type with bioluminescent green/blue palette
- [ ] **BIOME-02**: Ironhold Station has a unique `ironhold_station` biome type with industrial gray/rust/orange palette
- [ ] **BIOME-03**: Meridian Station has a unique `meridian_station` biome type with corporate silver/white/blue palette
- [ ] **BIOME-04**: Salvage Station has a unique `salvage_station` biome type with patchwork/mixed palette
- [ ] **BIOME-05**: Each hub biome has subtle indoor ambient particles (spores, steam, holo-dust, smoke wisps)

### Hub Tiles

- [ ] **TILE-01**: Each hub has a main floor tile with faction-themed colors and accent details
- [ ] **TILE-02**: Each hub has a solid wall tile (blocking, elevated) matching faction architecture
- [ ] **TILE-03**: Each hub has a door/doorway tile (traversable transition between rooms)
- [ ] **TILE-04**: Each hub has a corridor floor tile visually distinct from the main room floor
- [ ] **TILE-05**: Each hub has a decoration feature tile (consoles/machinery/vegetation/cargo)
- [ ] **TILE-06**: Each hub has an accent floor tile (grating/moss/glass panel/patched metal)
- [ ] **TILE-07**: Each hub has a window/viewport wall tile (semi-transparent, non-blocking or blocking)
- [ ] **TILE-08**: Each hub has a hazard/special tile (steam vent/growth pod/data stream/exposed wiring)

### Hub Maps

- [x] **MAP-01**: Canopy Station has a 128x128 hand-designed map with organic rooms, vine corridors, and atrium
- [x] **MAP-02**: Ironhold Station has a 128x128 hand-designed map with forge halls, metal corridors, and warrens
- [x] **MAP-03**: Meridian Station has a 128x128 hand-designed map with trading floor, glass corridors, and archive
- [x] **MAP-04**: Salvage Station has a 128x128 hand-designed map with cargo bay, patched corridors, and market
- [x] **MAP-05**: Each hub map has NPCs placed in lore-appropriate rooms (traders in trading area, guards at entrance, etc.)
- [x] **MAP-06**: Each hub map has a portal tile in the docking bay / entry area

### Hub System

- [ ] **SYS-01**: Hub zone system supports 128x128 tile maps (up from 64x64)
- [ ] **SYS-02**: Hub biome types are registered in the biome system with correct tile mappings
- [ ] **SYS-03**: Procedural tile generator renders all new hub tiles with faction palettes and accents
- [x] **SYS-04**: Unaffiliated players spawn at Salvage Station instead of Meridian
- [x] **SYS-05**: Hub spawn positions updated for new 128x128 layouts (portal location, NPC positions)

## v1.28 Requirements (Shipped)

<details>
<summary>All 10 requirements completed — click to expand</summary>

### Combat & Gathering

- [x] **INTERACT-01**: Player can attack a creature within melee/ranged range and deal damage
- [x] **INTERACT-02**: Player can gather from resource nodes (plants, minerals, artifacts) within gather range
- [x] **INTERACT-03**: Distance checks for combat and gathering use correct pixel coordinates for both player and entity positions

### Entity Rendering

- [x] **RENDER-01**: Player character and creatures are visually grounded on the tile surface (no floating)
- [x] **RENDER-02**: Plants and minerals have their anchor point at their ground contact point, not sprite center
- [x] **RENDER-03**: Entity sprites have minimal excess transparent space — trimmed to fit actual art
- [x] **RENDER-04**: Entity collision/selection hitbox aligns with the visible sprite's ground position

### Collision

- [x] **COLLIDE-01**: No invisible collision walls exist at chunk boundaries — player moves freely across chunks
- [x] **COLLIDE-02**: No invisible collision walls exist at zone boundaries — player transitions smoothly between zones

### Visual

- [x] **VISUAL-01**: Day/night cycle brightness is correct — dusk and dawn are brighter than night, not darker

</details>

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

### Tile Variety (v1.30+)

- **TVAR-01**: 3-4 new floor tile variants per biome (visual variety)
- **TVAR-02**: 1-2 gameplay-distinct tiles per biome (speed modifiers, visual hooks)
- **TVAR-03**: Tile speed modifiers applied as continuous velocity multipliers

## Out of Scope

| Feature | Reason |
|---------|--------|
| Pixel creature movement | Deferred to v1.30+; creatures stay tile-snapped |
| New abilities or combat mechanics | Fix existing, don't add new |
| Hub procedural generation | Hand-designed maps only for v1.29 |
| Hub NPC dialogue changes | Existing dialogue system sufficient |
| Hub music/SFX | Audio is separate milestone concern |
| Exterior station views | Interior-only for v1.29 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BIOME-01 | Phase 140 | Pending |
| BIOME-02 | Phase 140 | Pending |
| BIOME-03 | Phase 140 | Pending |
| BIOME-04 | Phase 140 | Pending |
| TILE-01 | Phase 140 | Pending |
| TILE-02 | Phase 140 | Pending |
| TILE-03 | Phase 140 | Pending |
| TILE-04 | Phase 140 | Pending |
| TILE-05 | Phase 140 | Pending |
| TILE-06 | Phase 140 | Pending |
| TILE-07 | Phase 140 | Pending |
| TILE-08 | Phase 140 | Pending |
| SYS-02 | Phase 140 | Pending |
| SYS-01 | Phase 141 | Pending |
| SYS-03 | Phase 141 | Pending |
| BIOME-05 | Phase 141 | Pending |
| MAP-01 | Phase 142 | Complete |
| MAP-02 | Phase 142 | Complete |
| MAP-03 | Phase 142 | Complete |
| MAP-04 | Phase 142 | Complete |
| MAP-05 | Phase 142 | Complete |
| MAP-06 | Phase 142 | Complete |
| SYS-04 | Phase 142 | Complete |
| SYS-05 | Phase 142 | Complete |

**Coverage:**
- v1.29 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after roadmap creation*
