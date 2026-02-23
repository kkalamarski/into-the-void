# Requirements: Into the Void

**Defined:** 2026-02-23
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.17 Requirements

Requirements for Core Gameplay Loop milestone. Each maps to roadmap phases.

### Gathering

- [ ] **GATH-01**: Player can gather resources from entities using equipped tool
- [ ] **GATH-02**: Gathering displays timing mini-game with success zone
- [ ] **GATH-03**: Mini-game timing accuracy affects yield (0.5x poor, 1.0x good, 1.5x perfect)
- [ ] **GATH-04**: Player has gathering proficiency per resource type that improves with use
- [ ] **GATH-05**: Higher proficiency increases success zone size and base yield
- [ ] **GATH-06**: Better resource nodes spawn in dangerous areas (near aggressive creatures)
- [ ] **GATH-07**: Rare nodes spawn with visual distinction and higher tier resources
- [ ] **GATH-08**: Player can track discovered rare node locations

### Exploration

- [x] **EXPL-01**: World displays fog of war hiding unexplored tiles
- [x] **EXPL-02**: Fog reveals in radius around player as they move
- [x] **EXPL-03**: Explored tiles persist per character across sessions
- [ ] **EXPL-04**: POIs (anomalies, caches, landmarks) exist in world
- [ ] **EXPL-05**: Player discovers POI when entering its tile with fog revealed
- [ ] **EXPL-06**: POI discovery grants rewards (XP, items, credits)
- [ ] **EXPL-07**: Lore fragments exist as collectible data logs
- [ ] **EXPL-08**: Lore fragments reveal world/faction history when collected
- [ ] **EXPL-09**: Lore collection tracked in codex UI
- [ ] **EXPL-10**: Zones have mastery objectives (discover POIs, gather resources, defeat creatures)
- [ ] **EXPL-11**: Zone mastery progress displays in HUD
- [ ] **EXPL-12**: Zone mastery completion unlocks zone-specific rewards

### Combat Balancing

- [ ] **COMB-01**: Combat follows gradual fight pattern (4-8 hits to kill typical creature)
- [ ] **COMB-02**: Damage scales predictably based on level gap
- [ ] **COMB-03**: Level-gap multiplier prevents one-shots except extreme differences (10+ levels)
- [ ] **COMB-04**: Creature stats rebalanced to match new damage formula
- [ ] **COMB-05**: Abilities remain impactful (not just auto-attack spam)

### Quest Items

- [ ] **QUEST-07**: All quest-required items have obtainable source in world
- [ ] **QUEST-08**: Missing item sources added via new entity drops or POI rewards

## v1.16 Requirements (Complete)

All requirements shipped 2026-02-23.

### NPC Interaction

- [x] **NPC-01**: Fix double-modal bug where two windows appear for same NPC
- [x] **NPC-02**: Single unified NPC window with tab navigation (Dialogue/Trade/Quests)
- [x] **NPC-03**: ESC key properly closes unified window without cascade bugs
- [x] **NPC-04**: Tab state defaults intelligently (quests tab if NPC has ready quests)

### Quest UI

- [x] **QUEST-01**: Quest objective tracker HUD widget showing active quest progress
- [x] **QUEST-02**: Quest tracker positioned near minimap with collapsible objectives
- [x] **QUEST-03**: Quest markers (yellow !) displayed above NPCs with available quests
- [x] **QUEST-04**: Quest markers (yellow ?) displayed above NPCs with turn-in ready quests
- [x] **QUEST-05**: "Quest Complete" banner with visual feedback on completion
- [x] **QUEST-06**: Quest completion audio cue

### Visual Polish

- [x] **VIS-01**: Design token expansion (animation timing, shadows, glassmorphism)
- [x] **VIS-02**: GPU-accelerated hover states on all buttons and tabs
- [x] **VIS-03**: Smooth transitions on modal open/close (150ms fade)
- [x] **VIS-04**: Glassmorphism effect on NPC modal (backdrop-filter blur)
- [x] **VIS-05**: Consistent spacing and typography across all panels
- [x] **VIS-06**: Active/focus states on interactive elements
- [x] **VIS-07**: Micro-interactions on button press (scale feedback)

### Error Handling

- [x] **ERR-01**: Loading spinner on async action buttons during pending state
- [x] **ERR-02**: Toast notifications for trade/quest errors outside modal
- [x] **ERR-03**: Prevent modal close while async operation pending

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Gathering Expansion

- **GATH-09**: Crafting system using gathered resources
- **GATH-10**: Gathering tool quality affects success rate

### Exploration Expansion

- **EXPL-13**: Achievement system for exploration milestones
- **EXPL-14**: Shared world map with party members

### Advanced Quest Features

- **QUEST-10**: Quest reward selection UI (choose between multiple rewards)
- **QUEST-11**: Quest chain visualization ("Part 3 of 5")
- **QUEST-12**: Smart quest tracker sorting by proximity

### Trading Enhancements

- **TRADE-01**: Vendor buyback tab (last 12 sold items)
- **TRADE-02**: Stock visualization for limited items

### UI Theming

- **THEME-01**: Faction-specific UI theming (colors based on player faction)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time mini-game PvP | Complexity, focus on PvE gathering first |
| Full crafting system | Defer to v1.18, needs separate design |
| Procedural quest generation | Current hand-crafted quests sufficient |
| Dynamic weather affecting gathering | Polish feature, not core |
| Auto-accept/auto-complete quests | Removes player agency, breaks immersion |
| Quest mini-map markers with GPS | Removes exploration, use zone hints instead |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GATH-01 | Phase 78 | Pending |
| GATH-02 | Phase 78 | Pending |
| GATH-03 | Phase 78 | Pending |
| GATH-04 | Phase 78 | Pending |
| GATH-05 | Phase 78 | Pending |
| GATH-06 | Phase 79 | Pending |
| GATH-07 | Phase 79 | Pending |
| GATH-08 | Phase 79 | Pending |
| EXPL-01 | Phase 76 | Complete |
| EXPL-02 | Phase 76 | Complete |
| EXPL-03 | Phase 76 | Complete |
| EXPL-04 | Phase 77 | Pending |
| EXPL-05 | Phase 77 | Pending |
| EXPL-06 | Phase 77 | Pending |
| EXPL-07 | Phase 80 | Pending |
| EXPL-08 | Phase 80 | Pending |
| EXPL-09 | Phase 80 | Pending |
| EXPL-10 | Phase 80 | Pending |
| EXPL-11 | Phase 80 | Pending |
| EXPL-12 | Phase 80 | Pending |
| COMB-01 | Phase 81 | Pending |
| COMB-02 | Phase 81 | Pending |
| COMB-03 | Phase 81 | Pending |
| COMB-04 | Phase 81 | Pending |
| COMB-05 | Phase 81 | Pending |
| QUEST-07 | Phase 81 | Pending |
| QUEST-08 | Phase 81 | Pending |

**Coverage:**
- v1.17 requirements: 27 total
- Mapped to phases: 27 (100% coverage)
- Unmapped: 0

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 after v1.17 roadmap creation*
