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
- 🚧 **v1.25 Crafting** - Phases 122-125 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.24 (Phases 1-121) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

---

### 🚧 v1.25 Crafting (In Progress)

**Milestone Goal:** Add a manual crafting system with recipe progression, per-category skill proficiency, faction specialties, and quality tiers — accessible from the HUD anywhere.

- [ ] **Phase 122: Crafting Foundation** - Shared types, DB schema, RecipeRegistry package, CraftingService with all server-side validation guards
- [ ] **Phase 123: Recipe Content and Quality System** - Recipe definitions for all disciplines, proficiency XP, quality tier calculation, faction specialty recipes
- [ ] **Phase 124: Automation Production Chain** - Deployable structure recipes validated against AutomationService item mappings
- [ ] **Phase 125: Crafting Panel UI** - Client store, HUD panel with tabs, ingredient availability display, progress bar, proficiency display

## Phase Details

### Phase 122: Crafting Foundation
**Goal**: The crafting service exists on the server with all correctness guarantees — atomic ingredient consumption, server-side timer enforcement, faction gating, one-active-craft enforcement, and recipe unlock persistence
**Depends on**: Phase 121 (v1.24 complete)
**Requirements**: RCPE-07, CRFT-03, CRFT-04, CRFT-05, CRFT-06, CRFT-07, PROF-05
**Success Criteria** (what must be TRUE):
  1. `crafting:start` with valid ingredients marks them consumed and starts a server-managed timer; sending `crafting:complete` immediately after is rejected until the timer elapses
  2. Attempting to start a craft with insufficient ingredients, an unowned recipe, or wrong-faction specialty returns a descriptive error event with no inventory mutation
  3. Starting a second craft while one is already active is rejected by the server
  4. Disconnecting mid-craft cancels the active craft with no orphaned timer or inventory corruption
  5. Player reconnects after server restart with recipe unlocks intact (persisted in DB, not in-memory only)
**Plans**: TBD

### Phase 123: Recipe Content and Quality System
**Goal**: Players can browse a full set of economically-balanced recipes across all disciplines, earn proficiency XP per discipline, and receive higher quality output as proficiency grows
**Depends on**: Phase 122
**Requirements**: RCPE-01, RCPE-02, RCPE-03, RCPE-04, RCPE-05, RCPE-06, PROF-01, PROF-02, PROF-03, PROF-04, CONT-01, CONT-02, CONT-04, CONT-05
**Success Criteria** (what must be TRUE):
  1. Recipes exist across Equipment, Consumables, and Reagents disciplines with ingredient costs within 80-120% of the cheapest equivalent acquisition path (trader price or loot time)
  2. Completing a craft awards proficiency XP in the relevant discipline; each discipline tracks XP independently
  3. A low-proficiency crafter always produces Standard quality output; a high-proficiency crafter can produce Refined or Masterwork output based on per-recipe thresholds
  4. Recipes locked by level, quest completion, or POI discovery are not available until the unlock condition is met
  5. Faction specialty recipes are only craftable by members of the corresponding faction
**Plans**: TBD

### Phase 124: Automation Production Chain
**Goal**: Players can craft deployable automation structures that deploy correctly via the automation panel — no item ID mismatches between the crafting and automation systems
**Depends on**: Phase 123
**Requirements**: CONT-03
**Success Criteria** (what must be TRUE):
  1. Deployable structure recipes (extractors, beacons, refineries) exist and produce items whose IDs resolve correctly in the automation panel's deploy action
  2. Crafting a deployable item and then placing it via the automation panel succeeds without errors
**Plans**: TBD

### Phase 125: Crafting Panel UI
**Goal**: Players can open a crafting panel from the HUD at any location, browse recipes by discipline, see ingredient availability, trigger crafts, and watch a progress bar count down to completion
**Depends on**: Phase 122
**Requirements**: CRFT-01, CRFT-02, CRUI-01, CRUI-02, CRUI-03, CRUI-04, CRUI-05, CRUI-06, CRUI-07
**Success Criteria** (what must be TRUE):
  1. Pressing C (or clicking the HUD shortcut) opens the crafting panel from any location without interrupting movement or combat
  2. The panel shows discipline tabs; switching tabs filters the recipe list to that category
  3. Each recipe displays name, output item, all required ingredients with current inventory counts highlighted green (have) or red (missing), and the quality range achievable at current proficiency
  4. The Craft button is only enabled when the player has all ingredients and the recipe is unlocked; disabled state shows the blocking reason on hover
  5. An active craft shows a progress bar counting down in real time; the panel reflects the crafted item and XP gain on completion
  6. Locked recipes appear in the list greyed out with a tooltip stating the unlock condition
**Plans**: TBD

## Progress

**Execution Order:** 122 → 123 → 124 → 125

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 122. Crafting Foundation | 0/TBD | Not started | - |
| 123. Recipe Content and Quality System | 0/TBD | Not started | - |
| 124. Automation Production Chain | 0/TBD | Not started | - |
| 125. Crafting Panel UI | 0/TBD | Not started | - |

---

*Last updated: 2026-03-05 — v1.25 Crafting roadmap created*
