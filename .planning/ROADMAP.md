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
- ✅ **v1.31 Strategy Pattern Refactor & Code Decomposition** - Phases 147-153 (shipped 2026-03-24)
- 🚧 **v1.32 Debug View & Visual Polish** - Phases 154-155 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.31 (Phases 1-153) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

---

### 🚧 v1.32 Debug View & Visual Polish (In Progress)

**Milestone Goal:** Add an F3 debug overlay for collision visualization and position diagnostics, fix white outline artifacts on feature entities, and adjust elevation/wall heights for better visual proportions.

- [ ] **Phase 154: Debug Overlay & Feature Rendering Fix** - F3 HUD overlay with position/state/collision visualization, and remove white outline from feature entities
- [ ] **Phase 155: Elevation & Height Rework** - Halve elevation step height and multiply wall height; validate all dependent systems

## Phase Details

### Phase 154: Debug Overlay & Feature Rendering Fix
**Goal**: Developer can toggle a debug overlay showing full world state, and feature entities render cleanly without outline artifacts
**Depends on**: Phase 153
**Requirements**: DEBUG-01, DEBUG-02, DEBUG-03, DEBUG-04, DEBUG-05, RENDER-01
**Success Criteria** (what must be TRUE):
  1. Pressing F3 toggles a semi-transparent overlay showing player pixel position, zone ID, tile coordinates, elevation, tile type, and biome name
  2. The overlay additionally shows FPS, entity count, server ping, and chunk load counts while the game runs
  3. The overlay shows current day/night phase, time value, combat state, and active target ID
  4. With the overlay active, blocking tile boundaries, feature entity collision boxes, and wall collision areas are all drawn in-world
  5. With F3 off, no overlay rendering executes and frame rate is unaffected; plants, minerals, and artifacts render without white outline borders
**Plans**: TBD

### Phase 155: Elevation & Height Rework
**Goal**: Terrain tiles render as low slabs at 64px elevation step, wall tiles visibly tower at 4x that height, and all systems that depend on elevation values continue working correctly
**Depends on**: Phase 154
**Requirements**: ELEV-01, ELEV-02, ELEV-03
**Success Criteria** (what must be TRUE):
  1. Elevation step is 64px — stacked terrain tiles appear as thin slabs rather than cubes
  2. Wall tiles render at 256px height (4x the 64px step) and visibly stand above ground-level tiles
  3. Player movement and collision work correctly at all elevation levels with the new step value
  4. Depth sorting and entity placement remain visually correct at all elevation levels after the change
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 154. Debug Overlay & Feature Rendering Fix | 0/TBD | Not started | - |
| 155. Elevation & Height Rework | 0/TBD | Not started | - |

---
*Last updated: 2026-03-24 — v1.32 roadmap created*
