# Requirements: Into the Void

**Defined:** 2026-03-24
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.31 Requirements

Requirements for tech debt / refactoring milestone. Each maps to roadmap phases.

### Entity Rendering

- [ ] **ERENDER-01**: EntityRenderer delegates to type-specific strategies (CreatureRenderer, PlantRenderer, MineralRenderer, NpcRenderer, ArtifactRenderer) for scale, shadow, hit area, and cursor logic
- [ ] **ERENDER-02**: Adding a new entity type requires only creating a new strategy class — no modification to EntityRenderer core

### Tile Rendering

- [ ] **TILE-01**: ProceduralTileGenerator delegates detail rendering to per-biome/tile-group strategies — 30+ switch cases replaced
- [ ] **TILE-02**: ProceduralTileGenerator delegates shade rendering to matching strategies — second large switch eliminated
- [ ] **TILE-03**: Adding a new tile type requires only creating a new tile render strategy

### Ability Effects

- [x] **EFFECT-01**: ability.service delegates effect application to per-type strategies (damage, heal, buff, shield, stun, reflect, dot, gather, reveal, hazard_immunity, damage_reduction)
- [x] **EFFECT-02**: Adding a new ability effect type requires only creating a new strategy class

### Creature AI

- [ ] **AI-01**: creature-ai.ts behavior tick delegates to formal strategy classes (HerbivoreBehavior, OmnivoreBehavior, PredatorBehavior, ManiacBehavior)
- [ ] **AI-02**: Adding a new creature behavior requires only creating a new strategy class

### Atmosphere & Weather

- [ ] **ATMO-01**: AtmosphereSystem delegates day/night color modulation to per-effect strategies (fog, glow, haze, murk, shimmer)
- [ ] **WEATHER-01**: WeatherSystem delegates particle spawn/update to per-type strategies (rain, snow, ash, spores, mist, void_energy)

### WorldScene Decomposition

- [ ] **SCENE-01**: WorldScene input handling extracted to InputController subsystem
- [ ] **SCENE-02**: WorldScene camera management extracted to CameraController subsystem
- [ ] **SCENE-03**: WorldScene entity lifecycle (create/update/destroy) extracted to EntityManager subsystem
- [ ] **SCENE-04**: WorldScene stays under 800 lines as orchestrator delegating to subsystems

### Gateway Decomposition

- [ ] **GW-01**: game.gateway event handlers extracted to domain-specific handler classes (combat, movement, inventory, social, zone)
- [ ] **GW-02**: game.gateway stays under 500 lines as event router delegating to handlers

## Out of Scope

| Feature | Reason |
|---------|--------|
| New features or gameplay changes | Refactoring only — behavior must be identical before and after |
| Test coverage additions | Focus on structural refactoring, tests in future milestone |
| Database schema changes | No persistence changes needed for code reorganization |
| API contract changes | Client/server wire protocol unchanged |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ERENDER-01 | Phase 147 | Pending |
| ERENDER-02 | Phase 147 | Pending |
| TILE-01 | Phase 148 | Pending |
| TILE-02 | Phase 148 | Pending |
| TILE-03 | Phase 148 | Pending |
| EFFECT-01 | Phase 149 | Done |
| EFFECT-02 | Phase 149 | Done |
| AI-01 | Phase 150 | Pending |
| AI-02 | Phase 150 | Pending |
| ATMO-01 | Phase 151 | Pending |
| WEATHER-01 | Phase 151 | Pending |
| SCENE-01 | Phase 152 | Pending |
| SCENE-02 | Phase 152 | Pending |
| SCENE-03 | Phase 152 | Pending |
| SCENE-04 | Phase 152 | Pending |
| GW-01 | Phase 153 | Pending |
| GW-02 | Phase 153 | Pending |

**Coverage:**
- v1.31 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 — traceability updated after roadmap creation*
