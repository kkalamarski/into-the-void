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
- 🚧 **v1.33 Biome Liquids** - Phases 156-158 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.32 (Phases 1-155) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

---

### 🚧 v1.33 Biome Liquids (In Progress)

**Milestone Goal:** Add per-biome liquid bodies that fill terrain at elevation <= 0, rendered as half-height translucent/opaque blocks. Players and creatures walk through liquids and receive lore-appropriate effects (slow, damage, healing, debuffs).

- [ ] **Phase 156: Liquid Tile Definitions** - Define liquid tile types per biome with lore-appropriate color, opacity, and rendering properties
- [ ] **Phase 157: Liquid Generation & Rendering** - Fill elevation <= 0 tiles with liquid in world-gen; render as half-height blocks at sea level on the client
- [ ] **Phase 158: Liquid Effects** - Apply movement slow, periodic damage, healing, and debuff effects to players and creatures walking through liquid

## Phase Details

### Phase 156: Liquid Tile Definitions
**Goal**: Every biome has a liquid tile type with correct lore color and opacity registered in the tile system
**Depends on**: Phase 155
**Requirements**: LIQ-01, LIQ-02, LIQ-03
**Success Criteria** (what must be TRUE):
  1. Each of the 16 biomes has a named liquid tile type (e.g. `void_ether`, `magma`, `toxic_sludge`) with a lore-correct color defined in the tile definitions
  2. Each liquid tile definition carries an opacity flag — translucent liquids are flagged differently from opaque ones
  3. The tile definition includes a half-height rendering property (32px slab height at ELEVATION_HEIGHT_STEP/2) distinguishing liquids from normal terrain tiles
**Plans**: 1 plan
Plans:
- [ ] 156-01-PLAN.md — Define liquid tile types, extend TileDefinition with liquid fields, register all 16 biome liquids

### Phase 157: Liquid Generation & Rendering
**Goal**: Tiles at elevation <= 0 are filled with the biome's liquid in world-gen and the client renders them as half-height blocks at fixed sea level
**Depends on**: Phase 156
**Requirements**: GEN-01, GEN-02, GEN-03
**Success Criteria** (what must be TRUE):
  1. Walking to any low-lying area (elevation <= 0) shows the biome's liquid tile visually filling that terrain
  2. Liquid tiles render as half-height isometric slabs sitting at elevation 0, regardless of how deep the terrain dips below
  3. Translucent liquids show the terrain tile beneath them; opaque liquids fully cover the tile below
  4. Players and creatures can walk through liquid tiles without being blocked — liquid tiles have no collision
**Plans**: TBD

### Phase 158: Liquid Effects
**Goal**: Walking through liquid applies movement slow, periodic damage or healing, and debuffs to both players and creatures based on liquid type
**Depends on**: Phase 157
**Requirements**: FX-01, FX-02, FX-03, FX-04, FX-05
**Success Criteria** (what must be TRUE):
  1. A player walking into any liquid tile visibly moves slower — their movement speed is reduced for as long as they remain in the liquid
  2. A player standing in a damaging liquid (magma, toxic sludge, rift plasma, impact brine) loses HP on a regular tick interval with damage numbers appearing above them
  3. A player standing in luminous nectar liquid gains HP on a regular tick interval with healing numbers appearing above them
  4. Creatures standing in liquid receive the same movement slow and damage/heal effects that players receive in the same liquid type
  5. Liquid effects start immediately on entering liquid and stop within one tick of leaving — no lingering damage outside liquid areas
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 156. Liquid Tile Definitions | 0/1 | Planned | - |
| 157. Liquid Generation & Rendering | 0/TBD | Not started | - |
| 158. Liquid Effects | 0/TBD | Not started | - |

---
*Last updated: 2026-03-25 — v1.33 roadmap created*
