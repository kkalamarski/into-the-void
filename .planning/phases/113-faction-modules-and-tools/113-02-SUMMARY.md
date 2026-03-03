---
plan: 113-02
title: Faction Tool Definitions
status: complete
---

## What Was Built
Created `packages/items/src/definitions/faction-tools.ts` with 40 faction tool definitions across 4 factions (10 each: 2 lines x 5 rarities).

### Faction Breakdown
- **Verdant Dynamics:** bio (5) + research (5) -- vigor + perception
- **Helix Extraction:** mining (5) + demolition (5) -- perception + power
- **Nexus Frontiers:** research (5) + stealth (5) -- perception + perception/haste
- **Unaffiliated:** universal (5) + combat (5) -- scrapper identity, salvage tools

### Key Implementation Details
- All stats generated via `getToolStats()` -- zero hand-coded stat values
- All ilvl computed via `computeIlvl()` with correct tier/rarity mapping
- Every tool has `toolType`, `range`, and `grantedAbilities`
- Ability count escalates: 2 (common) -> 3 (rare) -> 4 (epic) -> 5 (exotic) -> 6 (legendary)
- Unaffiliated tools have scrapper identity (not generic or faction clones)
- Colors match FACTION-IDENTITY.md Section 4 color scaling table
- `ALL_FACTION_TOOLS` array exports all 40 definitions

## Self-Check: PASSED

## Commits
- `feat(113-02): add 40 faction tool definitions`

## Key Files
### key-files.created
- packages/items/src/definitions/faction-tools.ts
