# Requirements: Into the Void

**Defined:** 2026-03-25
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.33 Requirements

Requirements for biome liquid system. Each maps to roadmap phases.

### Liquid Tiles

- [ ] **LIQ-01**: Each biome has a unique liquid tile type with lore-appropriate color and opacity (translucent or opaque per lore)
- [ ] **LIQ-02**: Liquid tiles render as half-height blocks (32px slab at ELEVATION_HEIGHT_STEP/2)
- [ ] **LIQ-03**: Translucent liquids show terrain below them; opaque liquids fully cover terrain

### Liquid Generation

- [ ] **GEN-01**: Terrain generation fills all tiles at elevation <= 0 with the biome's liquid tile
- [ ] **GEN-02**: Liquid tiles are NOT blocking — player and creatures can walk through them
- [ ] **GEN-03**: Liquid renders at fixed "sea level" (elevation 0) regardless of how deep the terrain goes

### Liquid Effects

- [ ] **FX-01**: Walking through any liquid applies movement slow (configurable per liquid type)
- [ ] **FX-02**: Some liquids deal periodic damage (magma, toxic sludge, rift plasma, impact brine)
- [ ] **FX-03**: Some liquids provide periodic healing (luminous nectar)
- [ ] **FX-04**: Creatures in liquid also receive movement slow and damage/heal effects
- [ ] **FX-05**: Liquid effects use the existing HazardService or a similar per-player tick system

## Out of Scope

| Feature | Reason |
|---------|--------|
| Liquid physics (flow, spreading) | Liquids are static tiles, not fluid simulation |
| Swimming animation | Player walks through liquid, no swim state |
| Underwater breathing/oxygen | Not needed — liquids are shallow (half-height) |
| Liquid crafting recipes | Future milestone |
| Boat/vehicle for liquid traversal | Future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LIQ-01 | Phase 156 | Pending |
| LIQ-02 | Phase 156 | Pending |
| LIQ-03 | Phase 156 | Pending |
| GEN-01 | Phase 157 | Pending |
| GEN-02 | Phase 157 | Pending |
| GEN-03 | Phase 157 | Pending |
| FX-01 | Phase 158 | Pending |
| FX-02 | Phase 158 | Pending |
| FX-03 | Phase 158 | Pending |
| FX-04 | Phase 158 | Pending |
| FX-05 | Phase 158 | Pending |

**Coverage:**
- v1.33 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 — traceability mapped after roadmap creation*
