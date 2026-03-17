# Requirements: Into the Void

**Defined:** 2026-03-17
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.26 Requirements

Requirements for milestone v1.26 Visual Overhaul & Atmosphere. Each maps to roadmap phases.

### Terrain Rendering

- [x] **TERR-01**: All terrain tiles render as procedural 3-shade isometric cubes (top, lit side, shadow side)
- [x] **TERR-02**: Each biome tile type has a distinct color palette defining its 3 shades
- [x] **TERR-03**: Tile cubes include biome-specific procedural accent details (grass tufts, sand grains, ice cracks, etc.)
- [x] **TERR-04**: Tile variant randomization produces visual variety at same tile type (deterministic per position)
- [x] **TERR-05**: Elevation tinting is preserved (higher = brighter, shadows from adjacent higher tiles)
- [x] **TERR-06**: Procedural cubes are baked to GPU textures via generateTexture(), not rendered as live Graphics

### Weather System

- [x] **WTHR-01**: Weather particles render viewport-relative (fixed to screen, not world)
- [x] **WTHR-02**: Each biome has appropriate weather type (rain, snow, ash, spores, mist, or none)
- [x] **WTHR-03**: Weather transitions smoothly when player moves between biomes
- [x] **WTHR-04**: Weather particles respect depth budget (above terrain, below UI)
- [x] **WTHR-05**: Particle emitters are cleaned up on chunk unload (no memory leaks)

### Day/Night Cycle

- [ ] **DNTC-01**: Gradual brightness change over time simulating day/night progression
- [ ] **DNTC-02**: Color temperature shifts (warm during day, cool at night)
- [ ] **DNTC-03**: Day/night uses camera postFX ColorMatrix (not per-tile setTint)
- [ ] **DNTC-04**: Time-of-day indicator visible in HUD
- [ ] **DNTC-05**: Day/night cycle does not affect minimap camera

### Biome Atmosphere

- [x] **ATMO-01**: Each biome has a distinct atmospheric visual effect (fog, glow, haze, murk, etc.)
- [x] **ATMO-02**: Atmosphere transitions smoothly between biomes (no hard seams)
- [x] **ATMO-03**: Atmosphere effects apply to both zone-walk and teleport transitions
- [x] **ATMO-04**: Atmosphere uses camera postFX shared with day/night (coordinated, not conflicting)

### Rendering Cleanup

- [ ] **CLNP-01**: PNG tile sprite loading is disabled (procedural cubes are primary)
- [ ] **CLNP-02**: Dead tile sprite code paths are removed from TileRenderer
- [ ] **CLNP-03**: PreloadScene no longer loads tile PNG assets (reduced load time)
- [ ] **CLNP-04**: Old tile PNG files kept in repo but not loaded at runtime

## Future Requirements

### Sprite Coverage
- **SPRT-01**: All 83+ creatures have unique sprite assets (not shared/reused)
- **SPRT-02**: All biome features (plants, minerals, artifacts) have sprites
- **SPRT-03**: Creature animation states (idle, walk, attack, death)

### Advanced Visual
- **ADVS-01**: Dynamic lighting/shadows
- **ADVS-02**: Particle effects for combat (hit sparks, ability VFX)
- **ADVS-03**: Particle effects for gathering interactions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom WebGL shaders | Phaser built-in postFX sufficient for all effects |
| Fog of war re-enable | Known camera tracking bug; separate milestone |
| Entity sprite generation | Deferred to future milestone; coverage gaps not blocking |
| Weather gameplay effects | Visual only this milestone; weather affecting stats/combat is future |
| Animated weather (lightning, storms) | Basic particle weather first; complex weather later |
| Server-side time sync | Client-side day/night sufficient for single-server deployment |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TERR-01 | Phase 126 | Complete |
| TERR-02 | Phase 126 | Complete |
| TERR-03 | Phase 126 | Complete |
| TERR-04 | Phase 126 | Complete |
| TERR-05 | Phase 126 | Complete |
| TERR-06 | Phase 126 | Complete |
| WTHR-01 | Phase 127 | Complete |
| WTHR-02 | Phase 127 | Complete |
| WTHR-03 | Phase 127 | Complete |
| WTHR-04 | Phase 127 | Complete |
| WTHR-05 | Phase 127 | Complete |
| DNTC-01 | Phase 128 | Pending |
| DNTC-02 | Phase 128 | Pending |
| DNTC-03 | Phase 128 | Pending |
| DNTC-04 | Phase 128 | Pending |
| DNTC-05 | Phase 128 | Pending |
| ATMO-01 | Phase 129 | Complete |
| ATMO-02 | Phase 129 | Complete |
| ATMO-03 | Phase 129 | Complete |
| ATMO-04 | Phase 129 | Complete |
| CLNP-01 | Phase 130 | Pending |
| CLNP-02 | Phase 130 | Pending |
| CLNP-03 | Phase 130 | Pending |
| CLNP-04 | Phase 130 | Pending |

**Coverage:**
- v1.26 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 — traceability filled after roadmap creation*
