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
- 🚧 **v1.21 UI Polish & Audio** - Phases 99-102 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.20 (Phases 1-98) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

### 🚧 v1.21 UI Polish & Audio (In Progress)

**Milestone Goal:** Add game menu, audio system, settings persistence, and fix entity rendering so players have polished controls and auditory feedback.

- [x] **Phase 99: Entity Rendering Fix** - Anchor entities at tile base to eliminate floating sprites on elevated terrain (2026-02-26)
- [ ] **Phase 100: Audio Foundation** - Wire up background music loop, level-up sound, and per-category volume via audioStore
- [ ] **Phase 101: Game Menu & Settings** - Game menu overlay with audio sliders, secondary bar toggle, and logout
- [ ] **Phase 102: ESC Centralization** - Single ESC handler closes modals LIFO then opens game menu when stack empty

## Phase Details

### Phase 99: Entity Rendering Fix
**Goal**: Entities render anchored at their tile ground plane, not elevated above it
**Depends on**: Nothing (isolated Phaser coordinate fix)
**Requirements**: REND-01, REND-02
**Success Criteria** (what must be TRUE):
  1. Entity sprites sit flush with the tile they occupy, with no floating gap above elevated tiles
  2. The selection ring indicator appears at the entity's base tile position, not at sprite visual height
  3. Entity shadows (if present) align with the tile base after the coordinate fix
**Plans**: 1 plan
- [x] 99-01-PLAN.md — Fix entity anchor math and verify rendering

### Phase 100: Audio Foundation
**Goal**: Background music plays on a continuous gapless loop and game events trigger sound effects, all volume-controlled per category
**Depends on**: Phase 99
**Requirements**: AUD-01, AUD-02, AUD-03, AUD-04
**Success Criteria** (what must be TRUE):
  1. Background music starts playing after the first user interaction and loops without an audible gap at the loop point
  2. Music does not start on page load before any user gesture (browser autoplay policy compliance)
  3. A level-up event plays the quest-complete sound effect audibly
  4. Music, effects, and ambient volume categories can be set independently and the change is heard immediately
**Plans**: TBD

### Phase 101: Game Menu & Settings
**Goal**: Player can open a game menu from within the game, adjust audio and interface settings, and log out cleanly
**Depends on**: Phase 100
**Requirements**: MENU-01, MENU-02, MENU-03, MENU-04, MENU-05
**Success Criteria** (what must be TRUE):
  1. Player can open and close the game menu overlay while in-game without disrupting gameplay
  2. Audio sliders in the settings panel update music, effects, and ambient volume in real time
  3. The secondary action bar can be toggled on/off from the interface settings panel
  4. Clicking Logout disconnects the WebSocket and navigates to the login screen
  5. Volume levels and secondary bar visibility survive a full browser refresh
**Plans**: TBD

### Phase 102: ESC Centralization
**Goal**: ESC key closes open modals one at a time in reverse-open order, and opens the game menu when no modals remain
**Depends on**: Phase 101
**Requirements**: ESC-01, ESC-02, ESC-03
**Success Criteria** (what must be TRUE):
  1. Pressing ESC with multiple modals open closes only the most recently opened modal, leaving others visible
  2. Pressing ESC repeatedly dismisses modals one by one until none remain
  3. Pressing ESC when no modals are open opens the game menu
  4. ESC does not simultaneously fire in-game Phaser actions (target deselect, pathfinding cancel) when closing a modal
**Plans**: TBD

## Progress

**Execution Order:** 99 → 100 → 101 → 102

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 99. Entity Rendering Fix | 0/1 | Planned | - |
| 100. Audio Foundation | 0/TBD | Not started | - |
| 101. Game Menu & Settings | 0/TBD | Not started | - |
| 102. ESC Centralization | 0/TBD | Not started | - |

---

*Last updated: 2026-02-26 - v1.21 roadmap created*
