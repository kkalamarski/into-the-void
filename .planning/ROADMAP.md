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
- 🚧 **v1.20 World Scale & Action Bar** - Phases 94-98 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.19 (Phases 1-93) - SHIPPED</summary>

[Previous milestone phases collapsed for brevity - see milestone archives in .planning/milestones/]

</details>

---

## Milestone v1.20: World Scale & Action Bar

**Goal:** Make the world more explorable with smaller biomes, add expedition travel, and improve action bar UX.

### Phase 94: World Scale Tuning

**Goal**: Biomes are small enough to encourage exploration with natural-feeling transitions

**Depends on**: Nothing (tuning existing world-gen)

**Requirements**: WORLD-01, WORLD-02

**Success Criteria** (what must be TRUE):
  1. Player can walk from one biome center to another in 2-3 minutes
  2. Biome transitions remain gradual with no jarring edges or 1-tile artifacts
  3. Multiple biomes are visible from any high-elevation vantage point
  4. World gen maintains consistent fertility and entity spawning across new scale

**Plans**: 2 plans in 1 wave

Plans:
- [x] 94-01-PLAN.md — Biome noise scale reduction and transition smoothing
- [x] 94-02-PLAN.md — World gen validation and edge case testing

---

### Phase 95: Expedition Travel

**Goal**: Players can teleport to random world locations via expedition NPC in hubs

**Depends on**: Nothing (independent travel feature)

**Requirements**: TRAV-01, TRAV-02, TRAV-03

**Success Criteria** (what must be TRUE):
  1. Expedition NPC exists in each faction hub with interaction dialogue
  2. Player can trigger expedition to random world location appropriate for their level
  3. High-tier destinations (Tier III-IV zones) are locked until player reaches required level
  4. Player receives clear feedback about destination tier and level requirements
  5. Expedition successfully teleports player to new location with proper zone transition

**Plans**: 2 plans in 2 waves

Plans:
- [x] 95-01-PLAN.md — Expedition NPC definition and hub spawning
- [x] 95-02-PLAN.md — Expedition logic with tier-locked destinations

---

### Phase 96: Home Recall Ability

**Goal**: All players have universal ability to return to their faction hub

**Depends on**: Nothing (independent travel feature)

**Requirements**: TRAV-04, TRAV-05

**Success Criteria** (what must be TRUE):
  1. Home recall ability appears in every player's abilities list regardless of equipment
  2. Player can trigger home recall from abilities panel or action bar
  3. Home recall teleports player to their faction hub
  4. Home recall has 5 minute cooldown visible in UI
  5. Cooldown persists across sessions and zone changes

**Plans**: 1 plan in 1 wave

Plans:
- [x] 96-01-PLAN.md — Universal home recall ability with 5 min cooldown

---

### Phase 97: Action Bar UX Enhancement

**Goal**: Action bar supports intuitive drag-and-drop management with click-to-trigger

**Depends on**: Nothing (UI enhancement)

**Requirements**: ABAR-01, ABAR-02, ABAR-03, ABAR-04

**Success Criteria** (what must be TRUE):
  1. Clicking ability icon in action bar triggers the ability
  2. SHIFT + drag allows moving ability to different slot within action bar
  3. Player can drag abilities from abilities panel directly into action bar slots
  4. Dropping ability outside action bar removes it from bar
  5. Drag interactions provide visual feedback (ghost icons, drop zones)

**Plans**: 2 plans in 2 waves

Plans:
- [x] 97-01-PLAN.md — Click-to-trigger and shift+drag relocation
- [x] 97-02-PLAN.md — Drag from panel and remove by drop-outside

---

### Phase 98: Second Action Bar

**Goal**: Second action bar provides 8 additional ability slots with Shift+number keybindings

**Depends on**: Phase 97 (uses enhanced action bar UX patterns)

**Requirements**: ABAR-05, ABAR-06, HUD-01, HUD-02, HUD-03

**Success Criteria** (what must be TRUE):
  1. Second action bar with 8 slots appears in HUD below/beside first action bar
  2. Second bar supports Shift+1-8 keybindings for ability triggering
  3. Second bar supports all drag-and-drop patterns from Phase 97
  4. Game shortcuts are smaller and repositioned to bottom-right near minimap
  5. HUD layout accommodates both action bars without overlapping or crowding

**Plans**: 2 plans in 2 waves

Plans:
- [x] 98-01-PLAN.md — Second action bar component with Shift+1-8 bindings
- [x] 98-02-PLAN.md — HUD reorganization (shortcuts to bottom-right)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 94 → 95 → 96 → 97 → 98

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Authentication & Navigation | v1.0 | 3/3 | Complete | 2026-02-13 |
| 2. Character Selection | v1.0 | 2/2 | Complete | 2026-02-14 |
| 3. Character Creation | v1.0 | 2/2 | Complete | 2026-02-14 |
| 4. WebSocket Connection | v1.1 | 5/5 | Complete | 2026-02-14 |
| 5. World Rendering | v1.1 | 5/5 | Complete | 2026-02-14 |
| 6. Movement System | v1.1 | 5/5 | Complete | 2026-02-15 |
| 7. Entities & HUD | v1.1 | 5/5 | Complete | 2026-02-16 |
| 8. Core Isometric Transformation | v1.2 | 3/3 | Complete | 2026-02-16 |
| 9. Rendering Optimization & Interaction | v1.2 | 2/2 | Complete | 2026-02-16 |
| 10. Multiplayer Integration | v1.2 | 1/1 | Complete | 2026-02-16 |
| 11. UI Integration | v1.2 | 1/1 | Complete | 2026-02-16 |
| 12. Polish | v1.2 | 1/1 | Complete | 2026-02-16 |
| 13. Tile Definition Architecture | v1.3 | 3/3 | Complete | 2026-02-16 |
| 14. Elevation System Core | v1.3 | 2/2 | Complete | 2026-02-16 |
| 15. Elevation Rendering | v1.3 | 2/2 | Complete | 2026-02-16 |
| 16. Structure Walls & Pathfinding | v1.3 | 5/5 | Complete | 2026-02-16 |
| 17. World Coordinate Foundation | v1.4 | 2/2 | Complete | 2026-02-16 |
| 18. Multi-Chunk Streaming | v1.4 | 5/5 | Complete | 2026-02-16 |
| 19. Biome Integration | v1.4 | 2/2 | Complete | 2026-02-17 |
| 20. Testing & Polish | v1.4 | 2/2 | Complete | 2026-02-17 |
| 21. Server Rate Limit & Speed Unification | v1.5 | 2/2 | Complete | 2026-02-17 |
| 22. 8-Directional Input & Pathfinding | v1.5 | 2/2 | Complete | 2026-02-17 |
| 23. Movement Animation & Camera Polish | v1.5 | 4/4 | Complete | 2026-02-17 |
| 24. Zone Boundary Hysteresis | v1.5 | 1/1 | Complete | 2026-02-17 |
| 25. Item Data Model & Foundation | v1.6 | 4/4 | Complete | 2026-02-17 |
| 26. Server InventoryService & WebSocket Handlers | v1.6 | 4/4 | Complete | 2026-02-17 |
| 27. Client State & Inventory Panel UI | v1.6 | 3/3 | Complete | 2026-02-17 |
| 28. Equipment System | v1.6 | 3/3 | Complete | 2026-02-18 |
| 29. Action Bar & Personal Storage | v1.6 | 2/2 | Complete | 2026-02-18 |
| 30. Type Foundation & Pure Computation | v1.7 | 2/2 | Complete | 2026-02-18 |
| 31. Server Wiring & Socket Delivery | v1.7 | 3/3 | Complete | 2026-02-18 |
| 32. Client Display | v1.7 | 3/3 | Complete | 2026-02-18 |
| 33. Foundation Types and Entity Definitions | v1.8 | 3/3 | Complete | 2026-02-18 |
| 34. Entity Lifecycle Persistence and Enriched Spawning | v1.8 | 4/4 | Complete | 2026-02-18 |
| 35. Loot Tables, Tool Interaction, and Respawn | v1.8 | 4/4 | Complete | 2026-02-18 |
| 36. Creature AI Wander and Behavior Tick | v1.8 | 4/4 | Complete | 2026-02-18 |
| 37. Fertility Noise and Biome Spawn Quality | v1.8 | 3/3 | Complete | 2026-02-18 |
| 38. Perception Gating and Client Polish | v1.8 | 4/4 | Complete | 2026-02-19 |
| 39. Combat Core and Damage Calculation | v1.9 | 4/4 | Complete | 2026-02-19 |
| 40. Creature Combat AI and Aggro | v1.9 | 3/3 | Complete | 2026-02-19 |
| 41. Player Death and Respawn | v1.9 | 3/3 | Complete | 2026-02-19 |
| 42. Combat Feedback and HUD | v1.9 | 2/2 | Complete | 2026-02-19 |
| 43. Click-to-Attack and Bug Fix | v1.10 | 2/2 | Complete | 2026-02-19 |
| 44. Target Selection UI | v1.10 | 2/2 | Complete | 2026-02-19 |
| 45. Combat Log | v1.10 | 1/1 | Complete | 2026-02-19 |
| 46. Currency and Hub Foundation | v1.11 | 3/3 | Complete | 2026-02-19 |
| 47. Hub Travel | v1.11 | 5/5 | Complete | 2026-02-20 |
| 48. NPC Definition System and Hub Spawns | v1.11 | 3/3 | Complete | 2026-02-20 |
| 49. NPC Interaction Window | v1.11 | 3/3 | Complete | 2026-02-20 |
| 50. Trading System | v1.11 | 4/4 | Complete | 2026-02-20 |
| 51. Player Position Persistence | v1.12 | 1/1 | Complete | 2026-02-20 |
| 52. Hub NPC Spawning Fix | v1.12 | 1/1 | Complete | 2026-02-20 |
| 53. Rendering & Depth Fixes | v1.12 | 2/2 | Complete | 2026-02-20 |
| 54. New Player Starter Kit | v1.12 | 1/1 | Complete | 2026-02-20 |
| 55. Content Expansion | v1.12 | 3/3 | Complete | 2026-02-20 |
| 56. Core Ability System | v1.13 | 3/3 | Complete | 2026-02-20 |
| 57. Buff System | v1.13 | 3/3 | Complete | 2026-02-20 |
| 58. Ability Content & Polish | v1.13 | 3/3 | Complete | 2026-02-21 |
| 59. Type Foundation | v1.14 | 1/1 | Complete | 2026-02-21 |
| 60. Migration | v1.14 | 2/2 | Complete | 2026-02-21 |
| 61. Aggregation Rules | v1.14 | 1/1 | Complete | 2026-02-21 |
| 62. Calculation Parity | v1.14 | 1/1 | Complete | 2026-02-21 |
| 63. Content Normalization | v1.14 | 3/3 | Complete | 2026-02-21 |
| 64. Quest Foundations | v1.15 | 2/2 | Complete | 2026-02-22 |
| 65. Objective Tracking | v1.15 | 2/2 | Complete | 2026-02-22 |
| 66. Quest Completion & Rewards | v1.15 | 3/3 | Complete | 2026-02-22 |
| 67. NPC Quest Givers | v1.15 | 3/3 | Complete | 2026-02-22 |
| 68. Quest UI | v1.15 | 4/4 | Complete | 2026-02-22 |
| 69. Quest Chains & Bounties | v1.15 | 2/2 | Complete | 2026-02-22 |
| 70. Modal Unification | v1.16 | 2/2 | Complete | 2026-02-23 |
| 71. Quest Objective Tracker HUD | v1.16 | 1/1 | Complete | 2026-02-23 |
| 72. Visual Polish | v1.16 | 3/3 | Complete | 2026-02-23 |
| 73. Quest Markers in World | v1.16 | 1/1 | Complete | 2026-02-23 |
| 74. Quest Completion Feedback | v1.16 | 2/2 | Complete | 2026-02-23 |
| 75. Error Handling | v1.16 | 2/2 | Complete | 2026-02-23 |
| 76. Fog of War Foundation | v1.17 | 2/2 | Complete | 2026-02-23 |
| 77. POI Discovery System | v1.17 | 4/4 | Complete | 2026-02-23 |
| 78. Gathering Mini-Game | v1.17 | 4/4 | Complete | 2026-02-23 |
| 79. Resource Risk/Reward | v1.17 | 4/4 | Complete | 2026-02-23 |
| 80. Zone Mastery & Lore | v1.17 | 5/5 | Complete | 2026-02-23 |
| 81. Combat Balancing & Quest Audit | v1.17 | 3/3 | Complete | 2026-02-23 |
| 82. Aquatic Biome Foundation | v1.18 | 3/3 | Complete | 2026-02-23 |
| 83. Aquatic Entity Population | v1.18 | 3/3 | Complete | 2026-02-23 |
| 84. Exotic Biome Foundation | v1.18 | 2/2 | Complete | 2026-02-24 |
| 85. Gathering as Ability System | v1.18 | 4/4 | Complete | 2026-02-24 |
| 86. Exotic Entity Population | v1.18 | 2/2 | Complete | 2026-02-24 |
| 87. Item Integration & Balance | v1.18 | 4/4 | Complete | 2026-02-24 |
| 88. Content Gaps & Discovery | v1.18 | 3/3 | Complete | 2026-02-24 |
| 89. Docker Images | v1.19 | 3/3 | Complete | 2026-02-24 |
| 90. Swarm Stack | v1.19 | 1/1 | Complete | 2026-02-24 |
| 91. Traefik & SSL | v1.19 | 1/1 | Complete | 2026-02-24 |
| 92. CI/CD Pipeline | v1.19 | 2/2 | Complete | 2026-02-24 |
| 93. Documentation | v1.19 | 1/1 | Complete | 2026-02-24 |
| 94. World Scale Tuning | v1.20 | 2/2 | Complete | 2026-02-26 |
| 95. Expedition Travel | v1.20 | 2/2 | Complete | 2026-02-26 |
| 96. Home Recall Ability | v1.20 | 1/1 | Complete | 2026-02-26 |
| 97. Action Bar UX Enhancement | v1.20 | 2/2 | Complete | 2026-02-26 |
| 98. Second Action Bar | v1.20 | 1/2 | In Progress | 98-01-SUMMARY.md |

**Total:** 98 phases (97 complete, 1 pending)

---
*Last updated: 2026-02-26 - Phase 97 complete*
