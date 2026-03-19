# Requirements: Into the Void

**Defined:** 2026-03-19
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.30 Requirements

Requirements for bug-fix milestone. Each maps to roadmap phases.

### Entity Rendering

- [x] **RENDER-01**: Entity sprites sit on tile ground surfaces with no visible gap or sinking — player character and all entity types (creatures, plants, minerals, NPCs) visually rest on the tile they occupy
- [x] **RENDER-02**: Local player depth sorting uses consistent height-based boost matching other entities, preventing incorrect Z-order near tall sprites

### Chunk Loading

- [x] **CHUNK-01**: Adjacent chunks load seamlessly when the player approaches zone boundaries — no black void areas, world appears infinite
- [x] **CHUNK-02**: Zone:chunk event listener persists across component remounts (HMR, reconnection) — listener cleanup passes handler reference

### Ability Targeting

- [ ] **TARGET-01**: Clicking an entity then using an ability from the action bar fires the ability at the selected target — ActionBar reads selectedTarget, not auto-attack targetEntityId
- [ ] **TARGET-02**: Gathering works when clicking a resource node — mini-game starts, range check uses correct pixel coordinates

### Secondary Fixes

- [ ] **MISC-01**: Portal debounce key includes zoneId to prevent re-triggering across zone boundaries
- [ ] **MISC-02**: NPC proximity check uses consistent pixel positioning (not tile-center approximation)
- [ ] **MISC-03**: Debug console.log statements removed from entity click handlers in WorldScene
- [ ] **MISC-04**: PROJECT.md known-issues corrected — zone:request IS implemented, actual issue is listener cleanup

## v1.29 Requirements (Shipped)

<details>
<summary>All 21 requirements completed — click to expand</summary>

### Hub Biomes

- [x] **BIOME-01**: Canopy Station has a unique `canopy_station` biome type with bioluminescent green/blue palette
- [x] **BIOME-02**: Ironhold Station has a unique `ironhold_station` biome type with industrial gray/rust/orange palette
- [x] **BIOME-03**: Meridian Station has a unique `meridian_station` biome type with corporate silver/white/blue palette
- [x] **BIOME-04**: Salvage Station has a unique `salvage_station` biome type with patchwork/mixed palette
- [x] **BIOME-05**: Each hub biome has subtle indoor ambient particles (spores, steam, holo-dust, smoke wisps)

### Hub Tiles

- [x] **TILE-01**: Each hub has a main floor tile with faction-themed colors and accent details
- [x] **TILE-02**: Each hub has a solid wall tile (blocking, elevated) matching faction architecture
- [x] **TILE-03**: Each hub has a door/doorway tile (traversable transition between rooms)
- [x] **TILE-04**: Each hub has a corridor floor tile visually distinct from the main room floor
- [x] **TILE-05**: Each hub has a decoration feature tile (consoles/machinery/vegetation/cargo)
- [x] **TILE-06**: Each hub has an accent floor tile (grating/moss/glass panel/patched metal)
- [x] **TILE-07**: Each hub has a window/viewport wall tile (semi-transparent, non-blocking or blocking)
- [x] **TILE-08**: Each hub has a hazard/special tile (steam vent/growth pod/data stream/exposed wiring)

### Hub Maps

- [x] **MAP-01**: Canopy Station has a 128x128 hand-designed map
- [x] **MAP-02**: Ironhold Station has a 128x128 hand-designed map
- [x] **MAP-03**: Meridian Station has a 128x128 hand-designed map
- [x] **MAP-04**: Salvage Station has a 128x128 hand-designed map
- [x] **MAP-05**: Each hub map has NPCs placed in lore-appropriate rooms
- [x] **MAP-06**: Each hub map has a portal tile in the docking bay / entry area

### Hub System

- [x] **SYS-01**: Hub zone system supports 128x128 tile maps
- [x] **SYS-02**: Hub biome types registered in biome system with correct tile mappings
- [x] **SYS-03**: Procedural tile generator renders all new hub tiles

</details>

## v1.28 Requirements (Shipped)

<details>
<summary>All 10 requirements completed — click to expand</summary>

### Combat & Gathering

- [x] **INTERACT-01**: Player can attack a creature within melee/ranged range and deal damage
- [x] **INTERACT-02**: Player can gather from resource nodes within gather range
- [x] **INTERACT-03**: Distance checks use correct pixel coordinates

### Entity Rendering

- [x] **RENDER-01**: Player character and creatures visually grounded on tile surface
- [x] **RENDER-02**: Plants and minerals anchored at ground contact point
- [x] **RENDER-03**: Entity sprites trimmed to fit actual art
- [x] **RENDER-04**: Entity collision/selection hitbox aligns with visible sprite

### Collision

- [x] **COLLIDE-01**: No invisible collision walls at chunk boundaries
- [x] **COLLIDE-02**: No invisible collision walls at zone boundaries

### Visual

- [x] **VISUAL-01**: Day/night brightness correct (dusk/dawn brighter than night)

</details>

## v1.27 Requirements (Shipped)

<details>
<summary>All 18 requirements completed — click to expand</summary>

- [x] **MOVE-01**: Free sub-tile pixel WASD movement
- [x] **MOVE-02**: Diagonal velocity normalization
- [x] **MOVE-03**: Pixel hitbox collision
- [x] **MOVE-04**: Smooth camera follow
- [x] **MOVE-05**: Walking animation with 8-directional facing
- [x] **SYNC-01**: Server position validation at tick rate
- [x] **SYNC-02**: Server 20Hz position broadcast
- [x] **SYNC-03**: Client prediction with server reconciliation
- [x] **SYNC-04**: Remote player interpolation
- [x] **DIST-01**: Combat pixel distance
- [x] **DIST-02**: Gathering pixel distance
- [x] **DIST-03**: NPC pixel distance
- [x] **DIST-04**: Creature AI pixel distance
- [x] **DIST-05**: Fog of war pixel distance
- [x] **DIST-06**: Zone boundary pixel granularity
- [x] **CLEAN-01**: Click-to-move removed
- [x] **CLEAN-02**: Flat blocking tiles audited
- [x] **CLEAN-03**: Legacy movement code removed

</details>

## Future Requirements

### Tile Variety (v1.31+)

- **TVAR-01**: 3-4 new floor tile variants per biome
- **TVAR-02**: 1-2 gameplay-distinct tiles per biome
- **TVAR-03**: Tile speed modifiers as continuous velocity multipliers

## Out of Scope

| Feature | Reason |
|---------|--------|
| Collision system redesign | 1.5x extension from quick-8 is sufficient; full rework deferred |
| Entity pixel position storage | Entities use tile coords server-side; conversion at interaction time is acceptable |
| Unified target state refactor | Fix the immediate bug (wrong field); full combatStore redesign is future work |
| Pixel creature movement | Deferred; creatures stay tile-snapped |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RENDER-01 | Phase 143 | Complete |
| RENDER-02 | Phase 143 | Complete |
| CHUNK-01 | Phase 144 | Complete |
| CHUNK-02 | Phase 144 | Complete |
| TARGET-01 | Phase 145 | Pending |
| TARGET-02 | Phase 145 | Pending |
| MISC-01 | Phase 146 | Pending |
| MISC-02 | Phase 146 | Pending |
| MISC-03 | Phase 146 | Pending |
| MISC-04 | Phase 146 | Pending |

**Coverage:**
- v1.30 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after v1.30 roadmap creation*
