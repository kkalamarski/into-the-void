# Quest System Research Summary

**Project:** Into the Void Quest System
**Domain:** Multiplayer 2D Sci-Fi Survival MMO
**Researched:** 2026-02-21
**Confidence:** HIGH

## Executive Summary

The quest system milestone requires minimal new dependencies and integrates cleanly with Into the Void's existing architecture. The codebase already provides all core capabilities for quest implementation: TypeScript discriminated unions for type-safe state management, Drizzle ORM with JSONB for flexible persistence, NestJS service layer for business logic, Socket.IO for real-time updates, and existing reward systems (XP, credits, inventory). The only recommended addition is `@nestjs/event-emitter` (v3.0.1) for decoupled objective tracking via internal event bus.

The recommended approach follows established MMO patterns: server-authoritative quest state management, event-driven objective tracking, and transactional reward distribution. Quest definitions live in a new `@into-the-void/quests` package mirroring the existing NPC/item registry patterns. A new `quest_progress` database table with JSONB storage tracks per-character quest state. The QuestService coordinates with existing services (CombatService, InventoryService, PlayerService) through event emissions, avoiding tight coupling while enabling features like "kill X creatures" and "collect Y items" objectives.

Critical risks include reward duplication via race conditions, client-server state desync, and quest item lifecycle bugs. These are mitigated through database-level UNIQUE constraints on quest completion, dedicated quest:progress WebSocket events for real-time synchronization, and transactional completion logic that validates all prerequisites before granting rewards. Following the existing server-authoritative patterns (similar to inventory/combat validation) prevents client-side exploits.

## Key Findings

### Recommended Stack

The existing stack already provides everything needed. TypeScript 5.4's discriminated unions handle quest state machines (available → active → completed|failed) with exhaustive checking. Drizzle ORM 0.30's JSONB with `.$type<T>()` enables type-safe storage of quest objectives as arrays. NestJS 10.3's service layer pattern mirrors existing InventoryService/PlayerService architecture. Socket.IO 4.7 broadcasts quest updates following the same pattern as inventory:update events. Zustand 4.5 extends the existing gameStore with a quests slice for client state.

**Core technologies:**
- **TypeScript discriminated unions**: Quest state machine with compile-time exhaustiveness checking
- **Drizzle ORM JSONB**: Type-safe quest objective progress arrays with partial indexes for 100x+ query speedup
- **NestJS service layer**: QuestService coordinates validation, progress tracking, reward distribution
- **@nestjs/event-emitter** (NEW): Decouples objective tracking via internal events (entity.killed, item.collected)
- **Socket.IO events**: quest:started, quest:progress, quest:completed broadcasts mirror existing patterns

**Key insight from STACK.md**: No state machine library needed (XState overkill for 4 states), no message queue needed (in-process events sufficient for single-server), no separate database needed (quest data is relational with characters/items).

### Expected Features

Research identifies a clear distinction between table stakes (expected by all MMO players) and differentiators (leverage Into the Void's unique 4-faction, 10-biome world).

**Must have (table stakes):**
- Quest log UI panel with active quests, objectives, progress, rewards
- Quest acceptance/completion flow through NPC interaction
- Three quest types: kill X creatures, collect Y items, discover Z location
- Real-time objective tracking ("5/10 kills") with immediate UI updates
- Quest rewards: XP, credits, items (all systems already exist)
- Quest state persistence across sessions (database storage)
- Visual quest giver indicators (icon above NPCs)
- Quest level requirements to gate progression
- Story quests (one-time narrative) and bounty quests (daily repeatable)

**Should have (competitive):**
- Faction-specific quest lines (leverage existing 4 factions: Verdant, Helix, Nexus, Unaffiliated)
- Biome-integrated quests (use 10 unique biomes: Anomaly Zones, Volcanic Reaches, Crystalline Wastes)
- Auto-discovery quests triggered by exploration (entering biome, finding location)
- Quest chains with sequential unlocking (prerequisite system)
- Ancient Ruins investigation quests (fits world lore/mystery theme)

**Defer (v2+):**
- Shared/party quests (requires party system — not yet built)
- Quest branching choices (complex state management, high implementation cost)
- Quest waypoint markers on map (may conflict with exploration gameplay)
- Randomized bounty objectives (requires quest generation system)

**Anti-features to avoid**: Unlimited quest log (overwhelming), breadcrumb GPS trails (removes exploration), auto-completion without turn-in (kills immersion), PvP interference quests (griefing), timed story quests (punishes exploration playstyle), infinite repeatable story quests (devalues narrative).

### Architecture Approach

Quest system integrates through a new QuestService that coordinates with existing services via event-driven architecture. CombatService emits entity.killed events, InventoryService emits item.collected events, and QuestService listens to update objective progress. This decouples quest logic from core systems — adding new objective types doesn't require modifying existing services.

**Major components:**
1. **packages/quests** (NEW) — Quest definitions, types, registry (mirrors packages/npcs pattern with readonly definitions)
2. **quest_progress table** (NEW) — JSONB storage for per-character quest state with partial indexes on status = 'active'
3. **QuestService** (NEW) — Server-side quest state management, validation, progress tracking, transactional reward distribution
4. **QuestStore** (NEW) — Client-side Zustand store for active quests, quest tracker UI subscriptions
5. **Modified services** — PlayerService, InventoryService, CombatService emit events for objective tracking
6. **NPC integration** — NPCs gain optional questGiver field referencing quest IDs, dialogue conditions filter by player quest state

**Data flow**: Player clicks "Accept Quest" → GameGateway validates prerequisites → QuestService creates quest_progress row → emit quest:started → client updates QuestStore → player kills creature → CombatService emits entity.killed → QuestService updates objectives → emit quest:progress → client updates tracker → all objectives complete → player returns to NPC → GameGateway validates turn-in (location, objectives, items) → QuestService.completeQuest() runs transaction (mark complete, remove quest items, grant rewards) → emit quest:completed.

**Build order**: Phase 1 (quest definitions/types, no dependencies) → Phase 2 (database schema) → Phase 3 (game-logic validation functions) → Phase 4 (server QuestService) → Phase 5 (client UI, parallel with Phase 4) → Phase 6 (integration testing).

### Critical Pitfalls

Research identified 6 critical pitfalls with concrete prevention strategies mapped to implementation phases:

1. **Quest Reward Duplication via Race Conditions** — Players claim rewards multiple times through timing exploits. Prevention: Database UNIQUE constraint on (character_id, quest_id, completed=true), transactional completion with atomic update checking completion state before granting rewards. Address in Phase 1 (database schema).

2. **Quest State Desync Between Client and Server** — Client shows "Kill 3/5" while server has 4/5, caused by inferring progress from indirect signals. Prevention: Dedicated quest:progress WebSocket event emitted after every objective update with full state (questId, objectives array with current/required counts). Address in Phase 2 (objective tracking).

3. **Quest Item Removal Timing Bugs** — Items removed before validation completes, leaving quest incomplete but items gone. Prevention: Add isQuestItem/questId metadata to inventory items, use transactions for completion (validate all → remove items → mark complete → grant rewards as atomic operation), block drop/trade of quest items. Address in Phase 3 (completion logic).

4. **NPC Dialogue State Pollution** — All players see same dialogue regardless of quest progress. Prevention: Conditional dialogue system with server-side filtering based on player quest state, separate quest UI from NPC chat to avoid option explosion. Address in Phase 4 (NPC integration).

5. **Party Quest Progress Inconsistencies** — Party members get different credit for same actions. Prevention: Build party system first (prerequisite), implement party-aware objective tracking with radius-based credit, define quest sharing modes (individual/party_nearby/party_anywhere). Address in Phase 5 (party system).

6. **Quest Completion Validation Bypasses** — Players complete quests remotely or without meeting requirements. Prevention: Server-authoritative validation at turn-in (quest state, NPC proximity, all objectives complete, required items present, prerequisites complete), never trust client-reported completion state. Address in Phase 3 (completion logic).

**Additional critical pattern**: Never store quest definitions in database (use TypeScript files for version control), never trust client quest state (server validates everything), never skip transactions for reward distribution (atomicity prevents partial completion bugs).

## Implications for Roadmap

Based on research, suggested 6-phase structure aligned with dependencies and risk mitigation:

### Phase 1: Quest Foundations & Schema
**Rationale:** Quest data structures have zero dependencies and unlock all subsequent work. Database schema must include constraints preventing reward duplication (Pitfall 1) from day one — retrofitting is expensive.

**Delivers:**
- packages/quests package with QuestDefinition types, QuestRegistry singleton
- quest_progress table with JSONB for objectives, UNIQUE constraint on completion
- 5-10 starter quest definitions (tutorial, faction intro)
- Quest types in shared-types for client/server contracts

**Addresses:** Table stakes feature (quest definitions exist), prevents Pitfall 1 (reward duplication) through schema constraints.

**Build order:** Create packages/quests → define types/interfaces → implement QuestRegistry → create sample quest definitions → define quest_progress schema → generate Drizzle migration.

### Phase 2: Objective Tracking & Progress
**Rationale:** Quest objectives are the core mechanic — players need real-time "5/10 kills" feedback. Event-driven architecture prevents tight coupling (CombatService doesn't import QuestService). Must implement quest:progress events to avoid state desync (Pitfall 2).

**Delivers:**
- QuestService with objective tracking logic
- @nestjs/event-emitter integration for entity.killed, item.collected events
- Modified CombatService/InventoryService to emit events
- quest:progress WebSocket event with full objective state
- Database queries for quest CRUD operations
- Pure validation functions in game-logic package

**Addresses:** Table stakes features (objective tracking, progress display), prevents Pitfall 2 (state desync) through dedicated events, prevents Pitfall 7 (performance — N+1 queries) through batched checks.

**Avoids:** Polling for objective updates (anti-pattern), client-side objective tracking (security risk), tight service coupling (architectural smell).

**Uses:** @nestjs/event-emitter for decoupled events, Drizzle JSONB queries with GIN indexes, TypeScript pure functions for objective matching.

### Phase 3: Quest Completion & Rewards
**Rationale:** Reward distribution is security-critical and must be transactional. Validation bypass exploits (Pitfall 6) caught here prevent economy damage. Quest item lifecycle (Pitfall 3) requires careful transaction ordering.

**Delivers:**
- QuestService.completeQuest() with full validation checklist
- Transactional completion logic (validate → remove items → mark complete → grant rewards)
- isQuestItem/questId metadata in inventory schema
- Drop/trade guards for quest items
- Server-authoritative turn-in validation (NPC proximity, objectives, items, prerequisites)
- Integration with existing InventoryService.addItem(), PlayerService.awardXp(), PlayerService.addCredits()

**Addresses:** Table stakes features (quest completion, reward distribution), prevents Pitfall 3 (item timing bugs), prevents Pitfall 6 (validation bypasses), prevents security exploits (client manipulation).

**Avoids:** Client-reported completion (never trust), non-transactional rewards (partial failure risk), item removal before validation (rollback nightmare).

**Implements:** Server-authoritative validation pattern (same as inventory/combat), transactional reward distribution, quest item special handling.

### Phase 4: NPC Integration & Quest Givers
**Rationale:** Quests need discoverable entry points. NPC dialogue system already exists, extend with conditional dialogue to avoid state pollution (Pitfall 4). Quest acceptance UI shares modal with existing NPC interaction.

**Delivers:**
- NPC questGiver field with questIds array
- Conditional dialogue system (show dialogue line if quest_state = 'active')
- Server-side dialogue filtering based on player quest states
- Extended npc:interact:response with available/active/ready quests
- Quest acceptance flow through NPC modal
- Visual quest giver indicators (icon above NPC sprites)

**Addresses:** Table stakes features (quest acceptance UI, quest giver indicators), prevents Pitfall 4 (dialogue pollution), differentiator features (faction-specific quest lines via NPC filtering).

**Avoids:** Global NPC dialogue state (per-player filtering required), hardcoded quest IDs in dialogue (loose coupling via questIds reference), mixing 20 quest options with dialogue (separate UI sections).

**Implements:** Conditional dialogue architecture (same pattern as NPC trade conditions), player-specific dialogue filtering (mirrors existing faction checks).

### Phase 5: Client UI & Quest Log
**Rationale:** Can develop in parallel with Phase 4 since it only depends on Phase 1 types and shared-types events. UI must support real-time updates (subscribe to quest:progress events from Phase 2).

**Delivers:**
- QuestStore (Zustand) with activeQuests, completedQuests, questHistory
- QuestLogPanel component (tabs: Active, Available, Completed)
- QuestTracker HUD component showing active quest objectives
- Quest acceptance/completion modals
- Real-time UI updates on quest:progress events
- Integration with existing HUD.tsx and GameUI.tsx

**Addresses:** Table stakes features (quest log UI, quest tracker HUD), UX improvements (real-time progress, visual feedback), player behavior patterns (5-10 active quests manageable, quest log access every 10-15 minutes).

**Avoids:** Unlimited quest log (overwhelming), quest list without filtering (cognitive overload), polling for progress updates (use event subscriptions).

**Uses:** Zustand nested state updates (immer for objectives array manipulation), React components in existing UI architecture, CSS following existing variable system (--color-accent).

### Phase 6: Advanced Quest Features
**Rationale:** Builds on stable foundation from Phases 1-5. Adds differentiators (faction quests, biome quests, quest chains) that leverage Into the Void's unique world. Party quests require party system (not yet built) so defer or build party system first.

**Delivers:**
- Quest chains with prerequisite system
- Faction-specific quest lines (Verdant eco-missions, Helix extraction contracts, Nexus trade routes)
- Biome-integrated quests (Anomaly Zone investigations, Volcanic Reaches survival)
- Auto-discovery quests triggered by zone entry
- Quest abandonment (with quest item cleanup)
- Daily bounty quest rotation with time-based reset

**Addresses:** Differentiator features (faction identity, biome utilization, narrative depth), enhancement features (quest chains, auto-discovery, bounties).

**Avoids:** Party quests until party system built (dependency), quest branching choices (complexity vs. value), infinite repeatable story quests (narrative devaluation).

**Implements:** Quest prerequisite validation (extends completion checks), faction filtering (uses existing character.faction), biome triggers (event on zone entry from existing zone system).

### Phase Ordering Rationale

**Why this order:**
- Phase 1 has zero dependencies and enables all other work
- Phase 2-3 build server functionality (independent of UI work)
- Phase 4 integrates with existing NPC system (depends on Phase 3 completion logic)
- Phase 5 can parallel Phase 4 (only needs Phase 1 types)
- Phase 6 deferred until foundation stable (iterative features on solid base)

**Why this grouping:**
- Foundation (1) → Core Mechanics (2-3) → Integration Points (4-5) → Enhancements (6)
- Risky elements (transactions, validation, events) tackled early when iteration cost is low
- UI work parallelized to accelerate delivery
- Each phase delivers testable, demoable functionality (no "70% done but nothing works" trap)

**How this avoids pitfalls:**
- Database constraints (Phase 1) prevent reward duplication before any rewards distributed
- Event architecture (Phase 2) prevents state desync before players see quest progress
- Transactional completion (Phase 3) prevents item/reward bugs before rewards valuable
- Conditional dialogue (Phase 4) prevents pollution before content scaled up
- Party-awareness (Phase 6) deferred until party system exists (avoid architectural mismatch)

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (Party Quests)**: Requires party system research if included — party architecture, shared progress tracking, cross-server party state if scaling past single server.

Phases with standard patterns (skip research-phase):
- **Phase 1**: TypeScript package creation follows packages/npcs exactly, Drizzle schema follows existing inventories/characters patterns
- **Phase 2**: @nestjs/event-emitter official docs sufficient, event pattern same as existing Socket.IO events
- **Phase 3**: Transaction pattern documented in Drizzle best practices, validation mirrors existing InventoryService checks
- **Phase 4**: Conditional dialogue extends existing NPC interaction (game.gateway.ts lines 477-506), no new patterns
- **Phase 5**: React/Zustand patterns well-documented in existing codebase (GameUI.tsx, InventoryPanel.tsx provide templates)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies already in use except @nestjs/event-emitter. Event emitter confirmed at v3.0.1 (npm), NestJS official docs cover usage, pattern matches existing architecture. TypeScript discriminated unions, Drizzle JSONB, NestJS services all verified in codebase. |
| Features | MEDIUM | Table stakes features verified via multiple MMO UI databases and GDC talks. Faction/biome integration inferred from lore but not validated with target users. Quest variety (kill/collect/explore) standard but usage frequency estimates based on general MMO patterns not Into the Void specifics. |
| Architecture | HIGH | Registry pattern matches existing packages/npcs, packages/items exactly. Service layer follows existing InventoryService, PlayerService. Event-driven pattern confirmed in NestJS docs and multiple MMO architecture sources. Database schema follows inventories.items JSONB pattern. Integration points traced through actual codebase files. |
| Pitfalls | HIGH | 6 critical pitfalls sourced from postmortems (WoW GDC talk, Tree of Savior exploit reports, FTBQuests bug tracker) and architectural best practices (WebSocket state management, transaction safety). Prevention strategies mapped to Drizzle/NestJS/PostgreSQL official docs. Race condition, state desync, validation bypass patterns confirmed via security research. |

**Overall confidence:** HIGH

Research covers established patterns (MMO quest systems 20+ years old), technologies with mature documentation (NestJS 10.3, Drizzle 0.30, TypeScript 5.4), and architecture verified in existing codebase. Feature prioritization is informed estimate (MEDIUM) requiring user validation, but technical implementation approach is solid.

### Gaps to Address

**Feature validation gaps:**
- Quest types priority (kill vs. collect vs. explore) — inferred from general MMO data, not Into the Void player research. Validate through analytics after launch: which quest types completed most/least, abandonment rates per type.
- Daily bounty reset timing — research suggests daily reset, but optimal reset hour unknown (midnight server time? player's local midnight?). Validate through A/B testing or survey.
- Quest log capacity — research suggests 10-15 active quests comfortable, but no Into the Void-specific cognitive load testing. Monitor support tickets about quest log management.

**Technical gaps:**
- Party system architecture — research assumes party system similar to standard MMO patterns (party leader, member roster, proximity checks) but Into the Void party system not yet designed. Phase 6 blocked until party architecture defined.
- Zone transition handling during quest objectives — research assumes player quest state persists across zone changes, but zone loading/unloading logic not audited. Validate during Phase 2 that quest:progress events emit correctly when player changes zones mid-combat.
- Quest UI performance with 50+ total quests — research suggests database indexes sufficient, but no stress testing. Monitor query performance in production, add Redis caching if quest log queries exceed 100ms at scale.

**Mitigation strategies:**
- Feature gaps: Launch with kill/collect/explore, iterate based on analytics. Start with midnight UTC reset for dailies, adjust if feedback negative.
- Party gaps: Phase 6 conditional on party system completion. If party system delayed, launch without shared quests (no blocking dependency).
- Performance gaps: Monitor in staging with synthetic 1000-user load test. Add caching layer if needed (Drizzle → Redis pattern already used in existing codebase per architecture review).

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- @nestjs/event-emitter v3.0.1 (npm package page, official NestJS docs) — Event-driven architecture confirmation
- Drizzle ORM PostgreSQL Best Practices Guide (2025 gist) — JSONB patterns, partial indexes, timestamp handling
- TypeScript Handbook (official docs) — Discriminated unions, exhaustive checking
- Into the Void codebase (packages/npcs, packages/items, apps/game-server) — Registry pattern, service layer, Socket.IO events verified directly

**Architecture Research:**
- MMO Architecture: Source of truth, Dataflows (Plant Based Games blog) — Data persistence patterns
- Implementing a Scalable Quest System (Better Programming, 2022) — Quest state machines, objective tracking
- NestJS official docs — Service layer, lifecycle hooks, dependency injection

**Pitfalls Research:**
- GDC: Learning From World of Warcraft's Quest Design Mistakes (GDC vault) — Reward duplication, state management
- Tree of Savior Infinite Quest Rewards Exploit (forum postmortem) — Race condition details
- FTBQuests Multiplayer Reward Exploit (GitHub issue #1089) — Concurrent completion bugs
- WebSocket Architecture Best Practices (Ably topic guide) — State synchronization patterns

### Secondary (MEDIUM confidence)

**Feature Research:**
- 7 MMO Quest Types and How to Use Them (GameDeveloper.com) — Quest variety patterns
- Game UI Database - Missions and Quests (gameuidatabase.com) — Quest log UX patterns
- Repeatable Quest - TV Tropes — Daily quest design patterns
- Massively Overthinking: Reconsidering the MMORPG daily quest (MassivelyOP) — Player behavior with dailies

**UX Patterns:**
- Enhancing Quest Discovery - Zenless Zone Zero UX Case Study (Medium) — Quest acceptance UI
- The history of the Quest Compass & its dreadful convenience (GameDeveloper.com) — Waypoint guidance anti-patterns

### Tertiary (LOW confidence, needs validation)

- Quest completion behavior estimates (check quest log 3-5 times/session, 5-10 active quests comfortable) — Inferred from general MMO patterns, no Into the Void specific data
- Faction-specific quest differentiation value — Assumes faction identity important based on lore, not validated with players
- Biome quest engagement — Assumes 10 biomes drive exploration motivation, not tested

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
