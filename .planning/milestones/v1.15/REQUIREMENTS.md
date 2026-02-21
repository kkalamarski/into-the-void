# v1.15 Quest System — Requirements

**Milestone:** v1.15 Quest System
**Created:** 2026-02-21
**Status:** Roadmap Complete

## Overview

NPCs give quests with objectives, tracking, and rewards — creating purpose-driven gameplay. Players can accept quests from NPCs, track progress in real-time, and receive credits, XP, and item rewards upon completion.

## Requirements

### Quest Core (QUEST-01 to QUEST-06)

- [ ] **QUEST-01**: Quest definition system with QuestRegistry singleton and typed definitions
- [ ] **QUEST-02**: Quest state machine (available → active → completed/failed) with server-authoritative validation
- [ ] **QUEST-03**: Quest progress persistence in database with JSONB objectives storage
- [ ] **QUEST-04**: Real-time objective tracking with quest:progress WebSocket events
- [ ] **QUEST-05**: Auto-discover quests triggered by zone/biome entry
- [ ] **QUEST-06**: Faction-specific quest filtering based on character faction

### Quest Types (QUEST-10 to QUEST-13)

- [ ] **QUEST-10**: Kill quests — defeat X creatures of type Y
- [ ] **QUEST-11**: Gather quests — collect X items of type Y
- [ ] **QUEST-12**: Explore quests — discover location Z or enter biome W
- [ ] **QUEST-13**: Multi-step quest chains with prerequisite system

### Quest Givers (QUEST-20 to QUEST-24)

- [ ] **QUEST-20**: NPC questGiver field with questIds array
- [ ] **QUEST-21**: Conditional dialogue based on player quest state
- [ ] **QUEST-22**: Quest acceptance flow through NPC interaction modal
- [ ] **QUEST-23**: Quest turn-in with server-side validation (proximity, objectives, items)
- [ ] **QUEST-24**: Visual quest markers (! for available, ? for ready to turn in)

### Quest Rewards (QUEST-30 to QUEST-33)

- [ ] **QUEST-30**: Credit rewards using existing PlayerService.addCredits()
- [ ] **QUEST-31**: XP rewards using existing PlayerService.awardXp()
- [ ] **QUEST-32**: Item rewards using existing InventoryService.addItem()
- [ ] **QUEST-33**: Transactional reward distribution (atomic: validate → remove items → mark complete → grant rewards)

### Quest UI (QUEST-40 to QUEST-45)

- [ ] **QUEST-40**: Quest log panel with Active/Available/Completed tabs
- [ ] **QUEST-41**: Quest tracker HUD showing active quest objectives
- [ ] **QUEST-42**: Real-time UI updates on quest:progress events
- [ ] **QUEST-43**: Quest acceptance/completion modals with reward preview
- [ ] **QUEST-44**: NPC quest marker sprites (! and ? indicators)
- [ ] **QUEST-45**: QuestStore (Zustand) with activeQuests, completedQuests slices

### Bounty System (QUEST-50 to QUEST-52)

- [ ] **QUEST-50**: Story quests (one-time, non-repeatable)
- [ ] **QUEST-51**: Bounty quests (daily repeatable with time-based reset)
- [ ] **QUEST-52**: Daily reset tracking per character

### Quest Items (QUEST-60 to QUEST-62)

- [ ] **QUEST-60**: Quest item metadata (isQuestItem, questId fields)
- [ ] **QUEST-61**: Drop/trade guards for quest items
- [ ] **QUEST-62**: Quest item cleanup on quest abandonment

## Out of Scope

- Party/shared quests (requires party system — not yet built)
- Quest branching choices (complexity vs. value)
- Quest waypoint markers on map (conflicts with exploration gameplay)
- Randomized bounty objectives (requires quest generation system)
- PvP interference quests (griefing potential)

## Technical Constraints

- Server-authoritative quest validation (never trust client state)
- Database UNIQUE constraint on quest completion (prevents reward duplication)
- @nestjs/event-emitter for decoupled objective tracking
- packages/quests follows existing packages/npcs registry pattern
- Quest definitions in TypeScript (not database) for version control

## Dependencies

- Existing: InventoryService, PlayerService, CombatService, NPC system
- New: @nestjs/event-emitter v3.0.1

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| QUEST-01 | Phase 64 | Pending |
| QUEST-02 | Phase 64 | Pending |
| QUEST-03 | Phase 64 | Pending |
| QUEST-04 | Phase 65 | Pending |
| QUEST-05 | Phase 67 | Pending |
| QUEST-06 | Phase 67 | Pending |
| QUEST-10 | Phase 65 | Pending |
| QUEST-11 | Phase 65 | Pending |
| QUEST-12 | Phase 65 | Pending |
| QUEST-13 | Phase 69 | Pending |
| QUEST-20 | Phase 67 | Pending |
| QUEST-21 | Phase 67 | Pending |
| QUEST-22 | Phase 67 | Pending |
| QUEST-23 | Phase 67 | Pending |
| QUEST-24 | Phase 67 | Pending |
| QUEST-30 | Phase 66 | Pending |
| QUEST-31 | Phase 66 | Pending |
| QUEST-32 | Phase 66 | Pending |
| QUEST-33 | Phase 66 | Pending |
| QUEST-40 | Phase 68 | Pending |
| QUEST-41 | Phase 68 | Pending |
| QUEST-42 | Phase 68 | Pending |
| QUEST-43 | Phase 68 | Pending |
| QUEST-44 | Phase 68 | Pending |
| QUEST-45 | Phase 68 | Pending |
| QUEST-50 | Phase 69 | Pending |
| QUEST-51 | Phase 69 | Pending |
| QUEST-52 | Phase 69 | Pending |
| QUEST-60 | Phase 66 | Pending |
| QUEST-61 | Phase 66 | Pending |
| QUEST-62 | Phase 66 | Pending |

**Coverage:** 31/31 requirements mapped (100%)

---
*Requirements defined: 2026-02-21*
*Roadmap created: 2026-02-22*
