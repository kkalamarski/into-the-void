---
plan: 113-01
title: Faction Module Definitions
status: complete
---

## What Was Built
Created `packages/items/src/definitions/faction-modules.ts` with 40 faction module definitions across 4 factions (10 each: 2 lines x 5 rarities).

### Faction Breakdown
- **Verdant Dynamics:** life_support (5) + sensor (5) -- resilience/recovery + perception
- **Helix Extraction:** armor (5) + power_core (5) -- toughness + vigor/recovery
- **Nexus Frontiers:** sensor (5) + speed (5) -- perception + haste
- **Unaffiliated:** power_core (5) + life_support (5) -- salvaged Helix/Verdant patterns

### Key Implementation Details
- All stats generated via `getModuleStats()` -- zero hand-coded stat values
- All ilvl computed via `computeIlvl()` with correct tier/rarity mapping
- No `grantedAbilities` on any module (abilities are the suit's domain)
- Colors match FACTION-IDENTITY.md Section 4 color scaling table
- Naming uses faction word banks from FACTION-IDENTITY.md Section 3
- Description voice follows faction identity patterns (scientific/industrial/sleek/practical)
- `ALL_FACTION_MODULES` array exports all 40 definitions

## Self-Check: PASSED

## Commits
- `feat(113-01): add 40 faction module definitions`

## Key Files
### key-files.created
- packages/items/src/definitions/faction-modules.ts
