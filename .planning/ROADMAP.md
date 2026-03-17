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
- 🚧 **v1.26 Visual Overhaul & Atmosphere** - Phases 126-130 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.25 (Phases 1-125) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

---

### 🚧 v1.26 Visual Overhaul & Atmosphere (In Progress)

**Milestone Goal:** Replace PNG tile sprites with procedural light-aware colored cubes, add biome weather particles, a day/night cycle, biome atmospheric effects, and clean up the rendering pipeline.

- [x] **Phase 126: Procedural Terrain Cubes** - Bake 3-shade isometric cubes to GPU textures; all biomes get distinct color palettes and accent details (completed 2026-03-17)
- [x] **Phase 127: Particle Weather System** - Viewport-fixed weather particles per biome with chunk-lifecycle cleanup (completed 2026-03-17)
- [x] **Phase 128: Day/Night Cycle** - Camera-level brightness and color-temperature shift using postFX ColorMatrix (completed 2026-03-17)
- [x] **Phase 129: Biome Atmospheric Effects** - Per-biome fog, glow, haze and murk via camera postFX coordinated with day/night (completed 2026-03-17)
- [ ] **Phase 130: Rendering Cleanup & Verification** - Disable PNG tile loading paths, remove dead code, verify FPS baseline

## Phase Details

### Phase 126: Procedural Terrain Cubes
**Goal**: All terrain tiles render as hardware-accelerated procedural cubes — baked once at scene init as GPU textures with per-biome color palettes, accent details, and preserved elevation tinting
**Depends on**: Nothing (first phase of milestone)
**Requirements**: TERR-01, TERR-02, TERR-03, TERR-04, TERR-05, TERR-06
**Success Criteria** (what must be TRUE):
  1. Every visible tile renders as a 3-shade isometric cube (top face, lit south side, shadow east side) with no flat-color fallback remaining
  2. Each biome is visually distinct — a player can identify the biome type by tile color alone without UI labels
  3. Same tile position always produces the same accent detail variant across sessions (deterministic per world coordinate)
  4. Elevation tinting is visible — high-elevation tiles appear brighter, shadowed tiles appear darker, independent of biome color
  5. Frame rate in a dense open biome is not measurably worse than v1.25 (cubes baked to GPU textures, not live Graphics draws)
**Plans**: 3 (126-01 ProceduralTileGenerator, 126-02 Wire into pipeline, 126-03 Build verification)

### Phase 127: Particle Weather System
**Goal**: Each biome has viewport-fixed weather particles (rain, snow, ash, spores, mist, or none) that transition smoothly on biome change and are fully cleaned up when chunks unload
**Depends on**: Phase 126
**Requirements**: WTHR-01, WTHR-02, WTHR-03, WTHR-04, WTHR-05
**Success Criteria** (what must be TRUE):
  1. Walking into a new biome causes the current weather to fade out and the new biome's weather to fade in over roughly 3 seconds
  2. Weather particles stay fixed to the screen viewport — they do not scroll or drift as the player moves through the world
  3. Weather particles render above all terrain and entities but below HUD elements
  4. Teleporting or using hub recall does not leave orphaned particle emitters — memory usage stays flat after repeated zone transitions
**Plans**: TBD

### Phase 128: Day/Night Cycle
**Goal**: The game world shifts gradually between day and night via camera-level brightness and color-temperature changes, visible in HUD, without interfering with elevation shading or the minimap
**Depends on**: Phase 126
**Requirements**: DNTC-01, DNTC-02, DNTC-03, DNTC-04, DNTC-05
**Success Criteria** (what must be TRUE):
  1. The world visibly transitions from bright (day) to dim (night) and back on a continuous cycle — no instant jumps
  2. Night has a cool blue color bias and dawn/dusk have a warm orange bias, observable without checking the HUD
  3. The minimap remains at consistent brightness regardless of the day/night state of the main camera
  4. Elevation shading on tiles is unaffected by the time-of-day change — higher tiles remain relatively brighter than lower tiles at all times
  5. A time-of-day indicator is visible in the HUD showing current cycle position
**Plans**: TBD

### Phase 129: Biome Atmospheric Effects
**Goal**: Each of the 16 biomes has a distinct atmospheric overlay (fog, glow, haze, or murk) that transitions smoothly between biomes, applies correctly after both walk-in and teleport transitions, and coordinates with the day/night ColorMatrix without stacking conflicts
**Depends on**: Phase 128
**Requirements**: ATMO-01, ATMO-02, ATMO-03, ATMO-04
**Success Criteria** (what must be TRUE):
  1. Each biome produces a noticeably different visual atmosphere — void_rift glows, volcanic hazes, abyssal trench darkens, ice fields apply cool tinting
  2. Moving between two biomes produces a gradual atmospheric cross-fade with no hard seam at the chunk boundary
  3. Using hub recall or a portal into a zone results in the correct atmosphere for that biome — no bleed-through from the previous location
  4. Day/night brightness and biome atmosphere are additive without conflict — brighter at noon means brighter atmosphere, not a doubled or cancelled effect
**Plans**: 2 (129-01 AtmosphereSystem + DayNightCycle integration, 129-02 WorldScene wiring)

### Phase 130: Rendering Cleanup & Verification
**Goal**: PNG tile sprite loading is removed from the runtime load path, dead code paths are deleted from TileRenderer, and the complete visual system passes a performance and correctness verification against the v1.25 baseline
**Depends on**: Phase 129
**Requirements**: CLNP-01, CLNP-02, CLNP-03, CLNP-04
**Success Criteria** (what must be TRUE):
  1. Game startup no longer loads any PNG tile assets — network tab shows zero tile PNG requests
  2. TileRenderer contains no dead code referencing the removed PNG sprite path
  3. FPS in a high-density tile zone is within 5% of the v1.25 baseline (procedural cubes impose no regression)
  4. All four new visual systems (terrain cubes, weather, day/night, atmosphere) function correctly in a full end-to-end session including zone transitions
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 126 → 127 → 128 → 129 → 130

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 126. Procedural Terrain Cubes | v1.26 | 3/3 | Complete | 2026-03-17 |
| 127. Particle Weather System | 3/3 | Complete    | 2026-03-17 | - |
| 128. Day/Night Cycle | v1.26 | Complete    | 2026-03-17 | - |
| 129. Biome Atmospheric Effects | 2/2 | Complete   | 2026-03-17 | - |
| 130. Rendering Cleanup & Verification | v1.26 | 0/TBD | Not started | - |

---
*Last updated: 2026-03-17 — Phase 126 complete*
