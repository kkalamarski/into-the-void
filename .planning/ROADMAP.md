# Roadmap: Into the Void

## Milestones

- ✅ **v1.0 Auth & Character Screens** - Phases 1-3 (shipped 2026-02-14)
- ✅ **v1.1 Post-Login Game Experience** - Phases 4-7 (shipped 2026-02-16)
- ✅ **v1.2 Isometric View** - Phases 8-12 (shipped 2026-02-16)
- ✅ **v1.3 Elevation & Structures** - Phases 13-16 (shipped 2026-02-16)
- ✅ **v1.4 Infinite World & Seamless Chunks** - Phases 17-20 (shipped 2026-02-17)
- ✅ **v1.5 Movement Overhaul** - Phases 21-24 (shipped 2026-02-17)
- ✅ **v1.6 Inventory & Items** - Phases 25-29 (shipped 2026-02-18)
- ✅ **v1.7 Character Stats** - Phases 30-32 (shipped 2026-02-18)
- ✅ **v1.8 Entity System** - Phases 33-38 (shipped 2026-02-19)
- ✅ **v1.9 Combat System** - Phases 39-42 (shipped 2026-02-19)
- ✅ **v1.10 Combat UX** - Phases 43-45 (shipped 2026-02-19)
- ✅ **v1.11 NPCs & Trading** - Phases 46-50 (shipped 2026-02-20)
- ✅ **v1.12 Bug Fixes & Content Polish** - Phases 51-55 (shipped 2026-02-20)
- ✅ **v1.13 Active Combat Abilities** - Phases 56-58 (shipped 2026-02-21)
- ✅ **v1.14 Equipment Stats Overhaul** - Phases 59-63 (shipped 2026-02-21)
- ✅ **v1.15 Quest System** - Phases 64-69 (shipped 2026-02-22)
- ✅ **v1.16 UI Polish** - Phases 70-75 (shipped 2026-02-23)
- ✅ **v1.17 Core Gameplay Loop** - Phases 76-81 (shipped 2026-02-23)
- ✅ **v1.18 Content Expansion** - Phases 82-88 (shipped 2026-02-24)
- ✅ **v1.19 Deployment & CI/CD** - Phases 89-93 (shipped 2026-02-24)
- ✅ **v1.20 World Scale & Action Bar** - Phases 94-98 (shipped 2026-02-26)
- ✅ **v1.21 UI Polish & Audio** - Phases 99-102 (shipped 2026-02-26)
- ✅ **v1.22 In-Game Chat** - Phases 103-107 (shipped 2026-02-26)
- ✅ **v1.23 Content Expansion & Faction Gear** - Phases 108-114 (shipped 2026-03-03)
- ✅ **v1.24 Balance & Automation** - Phases 115-121 (shipped 2026-03-05)
- ✅ **v1.25 Crafting** - Phases 122-125 (shipped 2026-03-06)
- ✅ **v1.26 Visual Overhaul & Atmosphere** - Phases 126-130 (shipped 2026-03-17)
- ✅ **v1.27 Pixel Movement Rewrite** - Phases 131-135 (shipped 2026-03-18)
- ✅ **v1.28 Post-Movement Polish** - Phases 136-139 (shipped 2026-03-18)
- ✅ **v1.29 Hub Station Interiors** - Phases 140-142 (shipped 2026-03-19)
- ✅ **v1.30 World Rendering & Interaction Fix** - Phases 143-146 (shipped 2026-03-24)
- 🚧 **v1.31 Strategy Pattern Refactor & Code Decomposition** - Phases 147-153 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.30 (Phases 1-146) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

---

### 🚧 v1.31 Strategy Pattern Refactor & Code Decomposition (In Progress)

**Milestone Goal:** Break apart the largest classes using Strategy Pattern for type-branching logic and component extraction for god objects. Behavior must be identical before and after every phase. No new features.

- [x] **Phase 147: EntityRenderer Strategy** - Replace per-type switch logic in EntityRenderer with dedicated strategy classes per entity type (completed 2026-03-24)
- [x] **Phase 148: ProceduralTileGenerator Strategy** - Replace switch blocks with behavioral-category tile strategies (floor, wall, hazard, water, portal, decorative) (completed 2026-03-24)
- [x] **Phase 149: Ability Effect Strategy** - Replace ability effect dispatch in ability.service with per-effect-type strategy classes (completed 2026-03-24)
- [ ] **Phase 150: Creature AI Strategy** - Formalize existing creature behavior functions in creature-ai.ts into named strategy classes
- [ ] **Phase 151: Atmosphere & Weather Strategy** - Replace per-type branching in AtmosphereSystem and WeatherSystem with effect/particle strategies
- [ ] **Phase 152: WorldScene Decomposition** - Extract input, camera, and entity lifecycle subsystems from WorldScene into dedicated controller classes
- [ ] **Phase 153: Gateway Decomposition** - Extract domain event handlers from game.gateway into handler classes; gateway becomes pure router

## Phase Details

### Phase 147: EntityRenderer Strategy
**Goal**: EntityRenderer delegates all per-type rendering logic to type-specific strategy classes, eliminating switch/if-chains on entity type
**Depends on**: Nothing (self-contained frontend class)
**Requirements**: ERENDER-01, ERENDER-02
**Success Criteria** (what must be TRUE):
  1. Creatures, plants, minerals, NPCs, and artifacts render visually identically to before the refactor
  2. EntityRenderer contains no switch or if-chains branching on entity type for scale, shadow, hit area, or cursor logic
  3. Each entity type has its own strategy class (CreatureRenderer, PlantRenderer, MineralRenderer, NpcRenderer, ArtifactRenderer) with a shared interface
  4. A new entity type can be added by creating one strategy class with no changes to EntityRenderer
**Plans**: TBD

### Phase 148: ProceduralTileGenerator Strategy
**Goal**: ProceduralTileGenerator delegates detail and shade rendering to behavioral-category strategy classes (FloorTileRenderer, WallTileRenderer, HazardTileRenderer, WaterTileRenderer, PortalTileRenderer, DecorativeTileRenderer), eliminating the two large switch blocks
**Depends on**: Phase 147 (same rendering pipeline — EntityRenderer done first keeps context clean)
**Requirements**: TILE-01, TILE-02, TILE-03
**Success Criteria** (what must be TRUE):
  1. All 30+ biome tile types render visually identically to before the refactor
  2. The detail-rendering switch (30+ cases) is replaced by behavioral-category strategy dispatch — each strategy handles rendering for its tile category (floor, wall, hazard, water, portal, decorative)
  3. The shade-rendering switch is replaced by matching behavioral-category strategy dispatch
  4. A new tile type can be added by registering it with the appropriate behavioral strategy class — no changes to ProceduralTileGenerator core
**Plans**: 2 plans
  - [ ] 148-01-PLAN.md — Define TileRenderStrategy interface, extract palettes, create base class + registry
  - [ ] 148-02-PLAN.md — Implement 6 strategy classes + refactor ProceduralTileGenerator

### Phase 149: Ability Effect Strategy (DONE)
**Goal**: ability.service delegates effect application to per-type strategy classes, eliminating the large effect-type dispatch block
**Depends on**: Nothing (backend service, independent of frontend phases)
**Requirements**: EFFECT-01, EFFECT-02
**Success Criteria** (what must be TRUE):
  1. All 11 ability effect types (damage, heal, buff, shield, stun, reflect, dot, gather, reveal, hazard_immunity, damage_reduction) behave identically in gameplay
  2. ability.service contains no switch or if-chains dispatching on effect type — each effect type has its own strategy class
  3. A new ability effect type can be added by creating one strategy class with no changes to ability.service core
**Plans**:
  - [x] 149-01-PLAN.md — EffectStrategy interface, AbstractEffectStrategy base class, registry skeleton
  - [x] 149-02-PLAN.md — 11 strategy classes + refactor ability.service.ts

### Phase 150: Creature AI Strategy
**Goal**: creature-ai.ts behavior tick delegates to formal named strategy classes for each behavior archetype
**Depends on**: Nothing (game-logic package, independent)
**Requirements**: AI-01, AI-02
**Success Criteria** (what must be TRUE):
  1. All four creature behaviors (Herbivore, Omnivore, Predator, Maniac) produce identical in-game results — AI patterns, aggro, group behaviors unchanged
  2. creature-ai.ts dispatches via strategy interface; HerbivoreBehavior, OmnivoreBehavior, PredatorBehavior, ManiacBehavior are distinct named classes
  3. A new creature behavior can be added by creating one strategy class with no changes to the creature-ai tick loop
**Plans**: TBD

### Phase 151: Atmosphere & Weather Strategy
**Goal**: AtmosphereSystem and WeatherSystem delegate per-effect and per-particle logic to strategy classes, eliminating per-type branching in both systems
**Depends on**: Phase 148 (same visual pipeline — tile rendering done first keeps rendering context stable)
**Requirements**: ATMO-01, WEATHER-01
**Success Criteria** (what must be TRUE):
  1. All 5 atmosphere effects (fog, glow, haze, murk, shimmer) render identically to before the refactor
  2. All 6 weather particle types (rain, snow, ash, spores, mist, void_energy) behave identically to before the refactor
  3. AtmosphereSystem has no per-effect branching — each effect is a strategy; WeatherSystem has no per-particle branching — each type is a strategy
**Plans**: TBD

### Phase 152: WorldScene Decomposition
**Goal**: WorldScene is decomposed into subsystem controllers for input, camera, and entity lifecycle — WorldScene becomes an orchestrator under 800 lines
**Depends on**: Phase 147 (EntityRenderer strategy makes entity lifecycle extraction cleaner)
**Requirements**: SCENE-01, SCENE-02, SCENE-03, SCENE-04
**Success Criteria** (what must be TRUE):
  1. Input handling (WASD, mouse clicks, keyboard shortcuts) works identically — all existing keybindings functional
  2. Camera behavior (following, zoom, minimap) works identically
  3. Entity create/update/destroy lifecycle works identically — entities appear, move, and despawn as before
  4. WorldScene.ts is under 800 lines and contains no inline input, camera, or entity lifecycle logic — all delegated to InputController, CameraController, EntityManager
**Plans**: TBD

### Phase 153: Gateway Decomposition
**Goal**: game.gateway event handlers are extracted to domain-specific handler classes — gateway becomes a router under 500 lines
**Depends on**: Nothing (backend, independent of all frontend phases)
**Requirements**: GW-01, GW-02
**Success Criteria** (what must be TRUE):
  1. All WebSocket events (combat, movement, inventory, social, zone) are handled identically — no behavioral changes visible to any client
  2. game.gateway contains no inline business logic — all event handling delegated to domain handlers (CombatHandler, MovementHandler, InventoryHandler, SocialHandler, ZoneHandler)
  3. game.gateway.ts is under 500 lines and acts as a pure event router
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 147. EntityRenderer Strategy | 2/2 | Complete    | 2026-03-24 |
| 148. ProceduralTileGenerator Strategy | 2/2 | Complete    | 2026-03-24 |
| 149. Ability Effect Strategy | 0/TBD | Not started | - |
| 150. Creature AI Strategy | 0/TBD | Not started | - |
| 151. Atmosphere & Weather Strategy | 0/TBD | Not started | - |
| 152. WorldScene Decomposition | 0/TBD | Not started | - |
| 153. Gateway Decomposition | 0/TBD | Not started | - |

---
*Last updated: 2026-03-24 — v1.31 roadmap created*
