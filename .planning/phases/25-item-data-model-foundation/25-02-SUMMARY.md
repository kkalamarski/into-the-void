---
phase: 25-item-data-model-foundation
plan: "02"
subsystem: items
tags: [items, definitions, registry, content, lore]
dependency_graph:
  requires: ["25-01"]
  provides: ["ALL_ITEMS (100)", "ITEM_IDS", "ItemRegistry populated"]
  affects: ["packages/items/src/definitions/", "packages/items/src/index.ts"]
tech_stack:
  added: []
  patterns: ["Static definition files with barrel export", "Auto-registration on module load"]
key_files:
  created:
    - packages/items/src/definitions/suits.ts
    - packages/items/src/definitions/modules.ts
    - packages/items/src/definitions/tools.ts
    - packages/items/src/definitions/consumables.ts
    - packages/items/src/definitions/world-items.ts
    - packages/items/src/definitions/reagents.ts
    - packages/items/src/definitions/index.ts
  modified:
    - packages/items/src/index.ts
decisions:
  - "World-items carry no effects array (optional field) — biome materials are plain data, not behavior-carrying items"
  - "Stim buff items use string stat names (scan_speed, endurance, combat_speed, all_performance) for forward compatibility with stat system"
  - "Rarity distribution for world-items deliberately uneven — reflects lore: anomaly zone drops are exotic, ancient fragments are legendary"
metrics:
  duration: "6m 31s"
  completed: "2026-02-17"
  tasks_completed: 3
  files_created: 7
  files_modified: 1
---

# Phase 25 Plan 02: Define 100 Item Definitions Summary

**One-liner:** 100 lore-accurate item definitions across 6 categories and 5 rarity tiers with auto-registration into ItemRegistry on module load — suits/modules/tools as equipment, consumables with scaling effects, world-items as biome drops, reagents as crafting materials.

## What Was Built

Six definition files totalling 100 items, plus a barrel index and updated entry point wiring auto-registration. All items use lore-appropriate names derived from the world-bible factions (Verdant Dynamics, Helix Extraction, Nexus Frontiers) and biomes (Anomaly Zones, Fungal Depths, Volcanic Reaches, Crystalline Wastes, Frozen Reaches, Miasma Marshes, Scarred Badlands, Petrified Expanse, Luminous Canopy).

### Item Counts (all verified against registry)

| Category | Count | Distribution |
|----------|-------|--------------|
| suit | 10 | 2 per rarity tier |
| module | 30 | 6 types x 5 rarities |
| tool | 15 | 3 specializations x 5 rarities |
| consumable | 20 | 4 types x 5 rarities |
| world-item | 15 | biome-themed, varies |
| reagent | 10 | 2 per rarity tier |
| **TOTAL** | **100** | |

### Rarity Distribution

| Rarity | Count |
|--------|-------|
| common | 23 |
| rare | 22 |
| epic | 19 |
| exotic | 18 |
| legendary | 18 |

Every rarity tier is represented.

### Key Components

**`packages/items/src/definitions/suits.ts`** — 10 exo-suits:
- Common: Basic Exo-Suit, Salvaged Exo-Suit (moduleSlots: 3)
- Rare: Reinforced Exo-Suit (Helix), Scout Exo-Suit (Nexus) (moduleSlots: 4)
- Epic: Tactical Exo-Suit, Environmental Exo-Suit (Verdant) (moduleSlots: 4)
- Exotic: Nexus Combat Frame, Helix Research Frame (moduleSlots: 5)
- Legendary: Void Walker Suit, Ancient Prototype Suit (moduleSlots: 6)

**`packages/items/src/definitions/modules.ts`** — 30 modules (6 types x 5 rarities):
- Armor: +10/22/45/81/176 armor value per tier
- Speed: 1.05/1.12/1.25/1.44/1.76x multiplier
- Life Support: 10/22/45/81/176 hazardResistance
- Sensor: 15/25/40/60/88 detectionRange
- Power Core: 100-1408 energyCapacity, 5-70 rechargeRate
- Mobility: 1.2/1.5/2.0/2.8/4.4 jumpHeight

**`packages/items/src/definitions/tools.ts`** — 15 tools (3 types x 5 rarities):
- Mining: Basic Drill → Excavator → Plasma Cutter → Void Harvester → Ancient Extractor
- Combat: Stun Rod → Pulse Pistol → Energy Blade → Nexus Targeting Rifle → Void Annihilator
- Research: Field Scanner → Compound Analyzer → Quantum Probe → Helix Gene Decoder → Ancient Interpreter

**`packages/items/src/definitions/consumables.ts`** — 20 consumables:
- Health Vials (5): 50/100/200/400/800 heal scaling
- Energy Cells (5): 50/100/200/400/800 energy_restore scaling
- Suit Repair Kits (5): 50/100/200/400/800 suit_repair scaling
- Buff Stims (5): focus, endurance, combat, adaptive, void-touched

**`packages/items/src/definitions/world-items.ts`** — 15 world items:
- Biome materials: Void Crystal, Fungal Spore Cluster, Mycelial Fiber, Toxic Residue, Frozen Shard, Volcanic Glass, Geothermal Compound, Crystal Fragment, Ancient Fragment, Crater Dust
- Organic Materials (3 rarity variants), Alien Flora (2 biome variants)
- All maxStack: 99

**`packages/items/src/definitions/reagents.ts`** — 10 reagents:
- Common (2): Crystalline Dust, Fungal Extract
- Rare (2): Thermal Compound, Ancient Circuitry
- Epic (2): Biogenic Catalyst, Quantum Residue
- Exotic (2): Nexus Core Fragment, Void Essence
- Legendary (2): Helix Gene Sample, Void Heart
- All maxStack: 999

**`packages/items/src/definitions/index.ts`** — Barrel index:
- `ALL_ITEMS` array with all 100 items
- `ITEM_IDS` const object with all 100 type-safe ID string constants

**`packages/items/src/index.ts`** — Updated:
- Removed placeholder comment
- Added `ItemRegistry.registerAll(ALL_ITEMS)` — executes on module load

## Verification Results

1. `nx run items:build` — **PASSED** (TypeScript compiles, all 7 definition files produce .d.ts outputs)
2. `ItemRegistry.size === 100` — **PASSED** (verified via compiled output)
3. Category distribution — **PASSED**: suits=10, modules=30, tools=15, consumables=20, world-items=15, reagents=10
4. Every rarity tier represented — **PASSED**: common=23, rare=22, epic=19, exotic=18, legendary=18
5. ALL_ITEMS.length === 100 — **PASSED**

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes on Lint

`nx run items:lint` produces the same "No ESLint configuration found" error as all other packages — pre-existing workspace-wide issue, not introduced by this plan. Build (TypeScript correctness) passes successfully.

### Notes on World-Item Biome Names

Plan specified "void plains" as a biome but lore uses "Anomaly Zones" — names adjusted to match lore exactly. No functional impact.

## Commits

| Hash | Message |
|------|---------|
| 831ce96 | feat(25-02): define 55 equipment items — 10 suits, 30 modules, 15 tools |
| e51ad37 | feat(25-02): define 45 non-equipment items — 20 consumables, 15 world-items, 10 reagents |
| c3997eb | feat(25-02): create definitions index and wire auto-registration |

## Self-Check

**Files:**
- [x] `packages/items/src/definitions/suits.ts` — exists (10 items + ALL_SUITS)
- [x] `packages/items/src/definitions/modules.ts` — exists (30 items + ALL_MODULES)
- [x] `packages/items/src/definitions/tools.ts` — exists (15 items + ALL_TOOLS)
- [x] `packages/items/src/definitions/consumables.ts` — exists (20 items + ALL_CONSUMABLES)
- [x] `packages/items/src/definitions/world-items.ts` — exists (15 items + ALL_WORLD_ITEMS)
- [x] `packages/items/src/definitions/reagents.ts` — exists (10 items + ALL_REAGENTS)
- [x] `packages/items/src/definitions/index.ts` — exists (ALL_ITEMS + ITEM_IDS + re-exports)
- [x] `packages/items/src/index.ts` — contains `ItemRegistry.registerAll(ALL_ITEMS)`

**Commits:**
- [x] 831ce96 — exists
- [x] e51ad37 — exists
- [x] c3997eb — exists

**Runtime verification:**
- [x] `ItemRegistry.size === 100` — PASSED
- [x] All 6 categories correct count — PASSED
- [x] All 5 rarities represented — PASSED

## Self-Check: PASSED
