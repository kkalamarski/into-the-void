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
- ✅ **v1.32 Debug View & Visual Polish** - Phases 154-155 (shipped 2026-03-24)
- ✅ **v1.33 Biome Liquids** - Phases 156-158 (shipped 2026-03-25)
- 🚧 **v1.34 Gameplay Fixes** - Phases 159-160 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.33 (Phases 1-158) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

---

### 🚧 v1.34 Gameplay Fixes (In Progress)

**Milestone Goal:** Fix three critical gameplay regressions — debug overlay shows wrong tile data, creatures don't move, and abilities (attack/gather) don't fire.

- [x] **Phase 159: Creature AI & Debug Overlay** - Fix creature movement so creatures visibly wander/chase on screen and correct the debug overlay tile type/elevation lookup (completed 2026-03-25)
- [ ] **Phase 160: Ability Execution** - Fix ability firing so attack and gather abilities work on selected targets, with visible error feedback on failure

## Phase Details

### Phase 159: Creature AI & Debug Overlay
**Goal**: Creatures are alive and moving on screen, and the debug overlay reports the tile type and elevation the player is actually standing on
**Depends on**: Phase 158
**Requirements**: AI-01, AI-02, DBG-01
**Success Criteria** (what must be TRUE):
  1. Within a few seconds of zone load, creatures visibly change position on screen — wandering, fleeing, or chasing according to their behavior type
  2. Creature position updates are received by the client and creatures animate to new positions in real time
  3. The debug overlay tile type field matches the rendered tile color at the player's feet (e.g. shows "void_rift" not "grassland" when standing in a void_rift biome)
  4. The debug overlay elevation field matches the visible stack height of the tile the player occupies
**Plans**: 2/2 complete

### Phase 160: Ability Execution
**Goal**: Players can attack creatures and gather from resource nodes using hotkey abilities, and see a clear error message when an ability cannot fire
**Depends on**: Phase 159
**Requirements**: ABIL-01, ABIL-02, ABIL-03
**Success Criteria** (what must be TRUE):
  1. Selecting a creature and pressing an attack ability hotkey deals damage — floating numbers appear above the creature and the combat log records the hit
  2. Selecting a resource node and pressing the gather hotkey starts the gathering mini-game (progress bar appears)
  3. Pressing an ability hotkey with no valid target or missing precondition shows a visible error message in the HUD — not a silent no-op
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 159. Creature AI & Debug Overlay | 2/2 | Complete | 2026-03-25 |
| 160. Ability Execution | 0/TBD | Not started | - |

---
*Last updated: 2026-03-25 — v1.34 roadmap created*
