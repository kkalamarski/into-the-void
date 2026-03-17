# Requirements: Into the Void

**Defined:** 2026-03-17
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.26 Requirements

Requirements for milestone v1.26 Visual Overhaul & Atmosphere. Each maps to roadmap phases.

### Terrain Rendering

- [ ] **TERR-01**: All terrain tiles render as procedural 3-shade isometric cubes (top, lit side, shadow side)
- [ ] **TERR-02**: Each biome tile type has a distinct color palette defining its 3 shades
- [ ] **TERR-03**: Tile cubes include biome-specific procedural accent details (grass tufts, sand grains, ice cracks, etc.)
- [ ] **TERR-04**: Tile variant randomization produces visual variety at same tile type (deterministic per position)
- [ ] **TERR-05**: Elevation tinting is preserved (higher = brighter, shadows from adjacent higher tiles)
- [ ] **TERR-06**: Procedural cubes are baked to GPU textures via generateTexture(), not rendered as live Graphics

### Weather System

- [ ] **WTHR-01**: Weather particles render viewport-relative (fixed to screen, not world)
- [ ] **WTHR-02**: Each biome has appropriate weather type (rain, snow, ash, spores, mist, or none)
- [ ] **WTHR-03**: Weather transitions smoothly when player moves between biomes
- [ ] **WTHR-04**: Weather particles respect depth budget (above terrain, below UI)
- [ ] **WTHR-05**: Particle emitters are cleaned up on chunk unload (no memory leaks)

### Day/Night Cycle

- [ ] **DNTC-01**: Gradual brightness change over time simulating day/night progression
- [ ] **DNTC-02**: Color temperature shifts (warm during day, cool at night)
- [ ] **DNTC-03**: Day/night uses camera postFX ColorMatrix (not per-tile setTint)
- [ ] **DNTC-04**: Time-of-day indicator visible in HUD
- [ ] **DNTC-05**: Day/night cycle does not affect minimap camera

### Biome Atmosphere

- [ ] **ATMO-01**: Each biome has a distinct atmospheric visual effect (fog, glow, haze, murk, etc.)
- [ ] **ATMO-02**: Atmosphere transitions smoothly between biomes (no hard seams)
- [ ] **ATMO-03**: Atmosphere effects apply to both zone-walk and teleport transitions
- [ ] **ATMO-04**: Atmosphere uses camera postFX shared with day/night (coordinated, not conflicting)

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
| TERR-01 | — | Pending |
| TERR-02 | — | Pending |
| TERR-03 | — | Pending |
| TERR-04 | — | Pending |
| TERR-05 | — | Pending |
| TERR-06 | — | Pending |
| WTHR-01 | — | Pending |
| WTHR-02 | — | Pending |
| WTHR-03 | — | Pending |
| WTHR-04 | — | Pending |
| WTHR-05 | — | Pending |
| DNTC-01 | — | Pending |
| DNTC-02 | — | Pending |
| DNTC-03 | — | Pending |
| DNTC-04 | — | Pending |
| DNTC-05 | — | Pending |
| ATMO-01 | — | Pending |
| ATMO-02 | — | Pending |
| ATMO-03 | — | Pending |
| ATMO-04 | — | Pending |
| CLNP-01 | — | Pending |
| CLNP-02 | — | Pending |
| CLNP-03 | — | Pending |
| CLNP-04 | — | Pending |

**Coverage:**
- v1.26 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20 ⚠️

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after initial definition*
