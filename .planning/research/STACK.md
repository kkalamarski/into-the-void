# Stack Research: Quest System

**Domain:** Multiplayer 2D sci-fi survival MMO — Quest definitions, objective tracking, progression states, rewards
**Researched:** 2026-02-21
**Confidence:** HIGH

## Executive Summary

The quest system milestone requires **minimal new dependencies**. The existing stack — TypeScript 5.4 (discriminated unions), Drizzle ORM 0.30 (PostgreSQL schema), NestJS 10.3 (service layer), Zustand 4.5 (client state), Socket.IO 4.7 (real-time events) — already provides all core capabilities for quest definitions, objective tracking, state management, and reward distribution.

**What already exists:**
- **Item reward system** — `inventory.service.ts` with `addItem()`, `removeItem()`, credits tracked on `characters` table
- **NPC dialogue system** — `packages/npcs/src/types.ts` defines NPC dialogue with conditions
- **Discriminated union patterns** — `ItemEffect`, `NpcDefinition` use TypeScript discriminated unions for type-safe variants
- **JSONB storage patterns** — `inventories.items`, `characters.stats` store structured data with `.$type<T>()` type safety
- **Real-time event broadcasting** — Socket.IO emits state changes (`inventory:update`, `player:stats`)
- **Server-authoritative validation** — All player actions validated server-side before state changes

**What is genuinely new:**
1. **Quest definition registry** — New `@into-the-void/quests` package mirroring `@into-the-void/npcs` pattern
2. **Quest state tracking** — New `quest_progress` database table with JSONB for objective progress
3. **Quest state machine** — TypeScript discriminated union for quest states (available, active, completed, failed)
4. **Objective validation service** — New `QuestService` in game-server tracking objective progress via event listeners
5. **Quest UI components** — React components for quest log, tracker, and rewards display

**One optional dependency to consider:**
- `@nestjs/event-emitter` (v3.0.1) — Enables decoupled objective tracking via internal event bus. Server-side events like `entity:kill`, `item:collect`, `npc:interact` trigger quest objective checks without tight coupling. Alternative: Manual quest check calls in existing services (more coupled, less scalable).

**Recommendation:** Add `@nestjs/event-emitter`. It's the NestJS-native solution for event-driven quest objectives, minimal overhead (built on EventEmitter2), and follows the same architectural pattern as larger MMOs (WoW uses event-driven quest tracking). Zero breaking changes to existing code.

---

## Recommended Stack

### Core Technologies (Already Installed)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | ^5.4.0 | Quest definitions, state machine types, objective types | Discriminated unions for quest states (`{ status: 'active', objectives: [...] }` vs `{ status: 'completed', completedAt: number }`). Same pattern as existing `ItemEffect`, `NpcDefinition`. Exhaustive checking ensures all quest states handled. |
| Drizzle ORM | ^0.30.0 | Quest progress persistence, objective tracking schema | JSONB columns with `.$type<T>()` provide type-safe quest progress storage. Existing pattern: `inventories.items` stores array of `InventoryItemJson`. Quest objectives use same pattern: `quest_progress.objectives: ObjectiveProgress[]`. Partial indexes on `status` column provide 100x+ query speedup for active quests. |
| NestJS | ^10.3.0 | `QuestService` for validation, reward distribution, progress tracking | Service layer mirrors `InventoryService` pattern. Quest validation (prerequisite checks, objective completion) follows server-authoritative model. NestJS lifecycle hooks (`OnModuleInit`) register event listeners for objective tracking. |
| Zustand | ^4.5.0 | Client-side quest state (active quests, tracker UI) | Extend existing `gameStore` with `quests` slice. Quest tracker UI subscribes to `activeQuests` array. Zustand handles derived state efficiently (e.g., "next objective" computed from progress array). |
| Socket.IO | ^4.7.0 | Broadcast quest updates (`quest:started`, `quest:progress`, `quest:completed`) | New events follow existing pattern (`inventory:update`, `player:stats`). Client receives `quest:progress` with updated objective counts, updates tracker UI. No protocol changes. |
| `@into-the-void/items` | workspace | Quest reward item definitions | Quest rewards reference existing `ItemDefinition.id`. Reward distribution uses existing `InventoryService.addItem()`. Item definitions already include `baseValue` for credit rewards. |
| `@into-the-void/npcs` | workspace | Quest giver associations, dialogue integration | NPCs gain `questIds: string[]` field listing offered quests. Dialogue conditions extend with `quest_available`, `quest_completed`. Mirrors existing `condition: 'trade'` pattern. |
| `@into-the-void/game-logic` | workspace | Quest validation logic, reward calculation | Pure functions: `canAcceptQuest(player, quest)`, `calculateQuestRewards(quest, player)`. Follows existing `calculateDamage()`, `canEquipItem()` patterns. Testable, reusable across server/client. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/event-emitter` | ^3.0.1 | Internal event bus for quest objective tracking | **Recommended.** Decouples objective tracking from core services. `CombatService` emits `entity.killed` event → `QuestService` listener checks if kill counts for active quest. Alternative: Direct `questService.checkObjective()` calls in every service (more coupling). |
| `immer` | ^11.1.4 | Nested objective progress updates | Already used by `statsStore`. Use for quest progress: `state.objectives[i].progress.count++`. Avoids immutability boilerplate when updating objective arrays. |

### Development Tools (No Change)

| Tool | Purpose | Notes |
|------|---------|-------|
| NX | Monorepo task runner | New `@into-the-void/quests` package follows existing workspace structure. |
| Drizzle Kit | Schema migrations | `pnpm db:generate` creates migration for `quest_progress` table. |

---

## Installation

**One new package (recommended):**
```bash
pnpm add @nestjs/event-emitter@3.0.1
```

**Quest package creation:**
```bash
# Create new workspace package (manual — NX generator not configured)
mkdir -p packages/quests/src
# Mirror packages/npcs/package.json structure
```

**All other dependencies already installed.**

---

## Alternatives Considered

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| `@nestjs/event-emitter` for objective tracking | Direct `QuestService.checkObjective()` calls in services | Direct calls couple quest logic to every service that generates objectives (CombatService, InventoryService, InteractionService). Adding new objective type requires modifying multiple services. Event-driven pattern: emit `entity.killed`, let QuestService subscribe. Same pattern used by WoW, FFXIV, ESO quest systems. |
| TypeScript discriminated unions for quest state | State machine library (XState 5.28) | Quest states are simple: available → active → (completed \| failed). TypeScript discriminated unions provide type-safe transitions with zero runtime overhead. XState adds 55KB bundle for 4 states. Use XState when states are hierarchical (quest phases with sub-states) — not needed for MVP. |
| JSONB column for objective progress | Separate `quest_objectives` table (one row per objective) | Quest objectives are bounded (5-10 per quest), progress is ephemeral (cleared on completion), and queries always fetch full objective list ("show all objectives for quest X"). Separate table creates N+1 query problem. JSONB with GIN index provides fast queries on objective state. Same pattern as `inventories.items` (array of items in single JSONB column). |
| Drizzle ORM with PostgreSQL | Document database (MongoDB) for quest progress | Quests have relational dependencies: quest prerequisites (quest A requires quest B completed), quest chains (linear progression), shared objectives (faction reputation). PostgreSQL foreign keys enforce referential integrity. Drizzle JSONB provides flexibility for objective schema variance without schema-less pitfalls. |
| Quest definitions in TypeScript package | Quest definitions in database with CMS | Quest content is code-adjacent (NPCs reference quests, items reference quests). TypeScript definitions provide compile-time type safety (can't reference non-existent quest, can't misspell objective type). Database + CMS adds infrastructure (admin UI, migrations, seeding) for 20-50 quests. Use database when quest count exceeds 200+ and non-technical designers author quests. |
| Zustand `quests` slice in `gameStore` | Separate `useQuestStore` hook | Active quests affect UI beyond quest panel: HUD tracker, NPC markers (quest giver indicators), map icons (quest objectives). Centralizing in `gameStore` prevents prop drilling and subscription fragmentation. Separate store requires syncing quest state across multiple components. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Full state machine library (XState, Robot3) | Quest states are linear: available → active → (completed \| failed). TypeScript discriminated unions handle transitions with exhaustive checking (`switch (quest.status) { ... }`). State machine libs add complexity (actors, services, guards) for simple transitions. Use when quest chains have parallel branches or hierarchical states (not in MVP). | TypeScript discriminated union: `type QuestState = { status: 'available' } \| { status: 'active', objectives: [...] } \| { status: 'completed', completedAt: number }` |
| Message queue (RabbitMQ, Redis Pub/Sub) | Quest objective events are in-process (player kills entity → check quest, both in same server). `@nestjs/event-emitter` uses EventEmitter2 (in-memory, synchronous). External message queue adds latency (network hop), infrastructure (queue service), and complexity (message serialization). Use when quest progress persists across server instances (distributed quest tracking) — not needed for single-server architecture. | `@nestjs/event-emitter` with `EventEmitter2.emit()` for in-process events |
| GraphQL for quest queries | Quest data access is server-driven (client receives `quest:started` push, doesn't query). Client fetches quest log on UI open (single `getActiveQuests()` call). GraphQL over-fetching prevention is moot (always fetch full quest + objectives). REST endpoint simpler. Use GraphQL when client customizes quest fields (mobile vs. web different data needs) — not in this codebase. | REST endpoint: `GET /quests/active` returns full quest objects |
| Cron jobs for quest expiration | Quests don't expire on timer (no time-limited quests in requirements). If added later, use NestJS `@Interval()` for periodic checks (same pattern as `AiService` creature tick). Cron jobs (external scheduler) add deployment dependency. | NestJS `@Interval()` decorator for periodic tasks |
| Separate database for quest data | Quest progress references `characters.id`, rewards reference `items.id`, objectives reference `entities.id`. Multi-database introduces distributed transactions (two-phase commit), connection pooling complexity, and cross-database join workarounds. Use when quest data exceeds 100GB (not realistic for MMO quest data). | Same PostgreSQL database, new `quest_progress` table with foreign keys |
| Validation library (Zod, Yup) beyond existing class-validator | `class-validator` already validates DTOs (`AcceptQuestDto`). Quest validation is business logic ("player level >= quest.requiredLevel", "prerequisite quests completed"), not schema validation. Zod adds 50KB for compile-time checks TypeScript already provides. | TypeScript types + runtime checks in `QuestService.canAcceptQuest()` |
| ORM migration to Prisma/TypeORM | Drizzle ORM already handles JSONB with type safety (`.$type<ObjectiveProgress[]>()`). Migration introduces risk (data migration, query rewrites) for zero feature gain. Drizzle is lighter (8KB vs. Prisma 400KB) and faster (no Prisma Client generation step). | Continue using Drizzle ORM |

---

## Quest System Architecture

### Quest State Machine (TypeScript Discriminated Union)

```typescript
// packages/quests/src/types.ts
export type QuestState =
  | { readonly status: 'available' }
  | { readonly status: 'active'; readonly acceptedAt: number; readonly objectives: ObjectiveProgress[] }
  | { readonly status: 'completed'; readonly completedAt: number; readonly rewarded: boolean }
  | { readonly status: 'failed'; readonly failedAt: number; readonly reason: string };

// Type-safe state transitions with exhaustive checking
function transitionQuest(quest: QuestState, action: QuestAction): QuestState {
  switch (quest.status) {
    case 'available':
      if (action.type === 'accept') {
        return { status: 'active', acceptedAt: Date.now(), objectives: initObjectives(quest) };
      }
      return quest;
    case 'active':
      if (action.type === 'complete') {
        return { status: 'completed', completedAt: Date.now(), rewarded: false };
      }
      if (action.type === 'fail') {
        return { status: 'failed', failedAt: Date.now(), reason: action.reason };
      }
      return quest;
    case 'completed':
    case 'failed':
      return quest; // Terminal states
    default:
      const _exhaustiveCheck: never = quest; // Compiler error if state unhandled
      return _exhaustiveCheck;
  }
}
```

**Rationale:** Same pattern as `ItemEffect` discriminated union (lines 34-46 in `packages/items/src/types.ts`). TypeScript enforces all states handled. No runtime library needed.

### Quest Definition (TypeScript Registry)

```typescript
// packages/quests/src/definitions/starter-quests.ts
export interface QuestDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly questGiverId: string; // References NpcDefinition.id
  readonly objectives: readonly QuestObjective[];
  readonly prerequisites?: readonly string[]; // Quest IDs that must be completed first
  readonly requiredLevel: number;
  readonly rewards: QuestRewards;
  readonly category: 'main' | 'side' | 'faction' | 'daily';
}

export type QuestObjective =
  | { readonly type: 'kill'; readonly targetEntityId: string; readonly count: number }
  | { readonly type: 'collect'; readonly itemId: string; readonly count: number }
  | { readonly type: 'interact'; readonly npcId: string }
  | { readonly type: 'discover'; readonly zoneId: string };

export interface QuestRewards {
  readonly xp: number;
  readonly credits: number;
  readonly items?: readonly { itemId: string; quantity: number }[];
}

// Example quest
export const FIRST_STEPS: QuestDefinition = {
  id: 'quest_first_steps',
  displayName: 'First Steps on Terminus',
  description: 'Speak with your faction liaison to learn about survival on Terminus.',
  questGiverId: 'npc_arrival_officer',
  objectives: [
    { type: 'interact', npcId: 'npc_verdant_liaison' },
  ],
  requiredLevel: 1,
  rewards: { xp: 100, credits: 50 },
  category: 'main',
};
```

**Rationale:** Mirrors `NpcDefinition` structure (`packages/npcs/src/types.ts`). Quest objectives use discriminated union (same as `ItemEffect`). Static definitions provide compile-time type safety.

### Quest Progress Database Schema

```typescript
// packages/database/src/schema/quests.ts
import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { characters } from './characters';

export interface ObjectiveProgress {
  type: string; // 'kill', 'collect', 'interact', 'discover'
  currentCount: number;
  requiredCount: number;
  completed: boolean;
}

export const questProgress = pgTable('quest_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  questId: varchar('quest_id', { length: 100 }).notNull(), // References QuestDefinition.id
  status: varchar('status', { length: 20 }).notNull(), // 'active', 'completed', 'failed'
  objectives: jsonb('objectives').$type<ObjectiveProgress[]>().notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  rewarded: boolean('rewarded').notNull().default(false),
}, (table) => ({
  // Partial index on active quests (100x+ speedup per Drizzle best practices)
  activeQuestsIdx: index('quest_progress_active_idx').on(table.characterId, table.status).where(sql`status = 'active'`),
  // Index for quest completion queries
  questIdIdx: index('quest_progress_quest_id_idx').on(table.questId),
}));

export type QuestProgress = typeof questProgress.$inferSelect;
export type NewQuestProgress = typeof questProgress.$inferInsert;
```

**Rationale:** Follows `inventories` table pattern (JSONB for array data with `.$type<T>()`). Partial index on `status = 'active'` provides 100x+ query speedup for "get active quests" (confirmed in Drizzle PostgreSQL best practices). Timestamps with timezone match existing `characters.createdAt` pattern.

### Quest Objective Tracking (Event-Driven)

```typescript
// apps/game-server/src/game/quest.service.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QuestProgress, ObjectiveProgress } from '@into-the-void/database';

@Injectable()
export class QuestService {
  // Event listener for entity kills
  @OnEvent('entity.killed')
  async handleEntityKilled(event: { playerId: string; entityId: string }) {
    const activeQuests = await this.getActiveQuests(event.playerId);

    for (const quest of activeQuests) {
      const updated = this.updateKillObjectives(quest, event.entityId);
      if (updated) {
        await this.saveQuestProgress(quest);
        this.broadcastQuestProgress(event.playerId, quest);

        if (this.allObjectivesComplete(quest)) {
          await this.completeQuest(event.playerId, quest.questId);
        }
      }
    }
  }

  // Event listener for item collection
  @OnEvent('item.collected')
  async handleItemCollected(event: { playerId: string; itemId: string; quantity: number }) {
    // Similar pattern...
  }

  private updateKillObjectives(quest: QuestProgress, killedEntityId: string): boolean {
    let updated = false;
    for (const objective of quest.objectives) {
      if (objective.type === 'kill' && objective.targetEntityId === killedEntityId && !objective.completed) {
        objective.currentCount++;
        if (objective.currentCount >= objective.requiredCount) {
          objective.completed = true;
        }
        updated = true;
      }
    }
    return updated;
  }
}
```

**Emitting Events in Existing Services:**
```typescript
// apps/game-server/src/game/combat.service.ts (EXTEND)
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CombatService {
  constructor(private eventEmitter: EventEmitter2) {}

  async handleEntityDeath(killerId: string, victimId: string) {
    // Existing death logic...

    // NEW: Emit event for quest tracking
    this.eventEmitter.emit('entity.killed', {
      playerId: killerId,
      entityId: victimId,
    });
  }
}
```

**Rationale:** `@nestjs/event-emitter` decouples quest tracking from core services. `CombatService` doesn't know about quests, just emits `entity.killed`. `QuestService` subscribes to events. Same pattern as WoW Lua event system (`COMBAT_LOG_EVENT_UNFILTERED` → addon quest trackers). Adding new quest objective type doesn't modify existing services.

---

## Data Flow Architecture

```
┌─────────────────┐
│   NPC Dialog    │  Player accepts quest from NPC
└────────┬────────┘
         ↓
┌─────────────────┐
│ Socket.IO Client│  emit 'quest:accept' { questId }
└────────┬────────┘
         ↓
┌─────────────────┐
│   GameGateway   │  Validate: quest available, prerequisites met
└────────┬────────┘
         ↓
┌─────────────────┐
│  QuestService   │  Create quest_progress row (status: 'active')
└────────┬────────┘
         ↓
┌─────────────────┐
│ Socket.IO Server│  Broadcast 'quest:started' { quest }
└────────┬────────┘
         ↓
┌─────────────────┐
│  Quest Store    │  Add quest to activeQuests array
└─────────────────┘

[Player kills entity]

┌─────────────────┐
│ CombatService   │  Entity dies
└────────┬────────┘
         ↓
┌─────────────────┐
│ EventEmitter2   │  emit 'entity.killed' { playerId, entityId }
└────────┬────────┘
         ↓
┌─────────────────┐
│  QuestService   │  @OnEvent('entity.killed') → check kill objectives
└────────┬────────┘
         ↓
┌─────────────────┐
│   Database      │  Update quest_progress.objectives (currentCount++)
└────────┬────────┘
         ↓
┌─────────────────┐
│ Socket.IO Server│  Broadcast 'quest:progress' { questId, objectives }
└────────┬────────┘
         ↓
┌─────────────────┐
│  Quest Tracker  │  Update UI: "Kill Crawlers: 3/5"
└─────────────────┘

[All objectives complete]

┌─────────────────┐
│  QuestService   │  Mark quest completed, distribute rewards
└────────┬────────┘
         ↓
┌─────────────────┐
│InventoryService │  Add reward items, credits, XP
└────────┬────────┘
         ↓
┌─────────────────┐
│ Socket.IO Server│  Broadcast 'quest:completed' { quest, rewards }
└────────┬────────┘
         ↓
┌─────────────────┐
│ Quest Complete  │  Show reward UI, remove from active quests
│     Modal       │
└─────────────────┘
```

---

## Version Compatibility

All patterns use existing stable APIs:

| Package | Version | API Used | Stable Since | Notes |
|---------|---------|----------|--------------|-------|
| TypeScript | 5.4.0 | Discriminated unions | 2.0.0 (2016) | Quest state machine uses discriminated unions |
| Drizzle ORM | 0.30.0 | `.$type<T>()` for JSONB | 0.28.0 (2024) | Type-safe quest objective arrays |
| NestJS | 10.3.0 | Service layer, lifecycle hooks | 6.0.0 (2019) | `QuestService` follows existing patterns |
| `@nestjs/event-emitter` | 3.0.1 | `@OnEvent()` decorator | 1.0.0 (2020) | Event-driven objective tracking |
| Socket.IO | 4.7.0 | `server.to(room).emit()` | 2.0.0 (2016) | Quest update broadcasts |
| Zustand | 4.5.0 | Nested state updates | 4.0.0 (2022) | Quest store slice in `gameStore` |
| PostgreSQL | 14+ | JSONB, GIN indexes, partial indexes | 9.4+ (2014) | Quest progress storage |

**No version upgrades required. One new package: `@nestjs/event-emitter@3.0.1`.**

---

## Integration Points

### New Files

| File | Package/App | What It Adds |
|------|-------------|--------------|
| `src/types.ts` | `packages/quests` | Quest definition types, state machine types |
| `src/definitions/*.ts` | `packages/quests` | Static quest definitions (starter quests, faction quests) |
| `src/registry.ts` | `packages/quests` | Quest lookup by ID (mirrors `npc-registry.ts`) |
| `src/schema/quests.ts` | `packages/database` | `quest_progress` table schema |
| `src/queries/quests.ts` | `packages/database` | Quest CRUD operations |
| `src/game/quest.service.ts` | `apps/game-server` | Quest validation, progress tracking, reward distribution |
| `src/store/questStore.ts` | `apps/web` | Client-side quest state (active quests, completed quests) |
| `src/ui/panels/QuestLogPanel.tsx` | `apps/web` | Quest log UI (list of available/active/completed quests) |
| `src/ui/QuestTracker.tsx` | `apps/web` | HUD quest tracker (shows active quest objectives) |
| `src/ui/QuestRewardModal.tsx` | `apps/web` | Quest completion reward display |

### Modified Files

| File | Change |
|------|--------|
| `packages/npcs/src/types.ts` | Add `questIds?: string[]` to `BaseNpcDefinition` (quest givers) |
| `packages/database/src/schema/index.ts` | Export `quest_progress` schema |
| `apps/game-server/src/game/game.module.ts` | Register `QuestService`, import `EventEmitterModule` |
| `apps/game-server/src/game/combat.service.ts` | Emit `entity.killed` event after entity death |
| `apps/game-server/src/game/inventory.service.ts` | Emit `item.collected` event after item added |
| `apps/game-server/src/game/game.gateway.ts` | Add `quest:accept`, `quest:abandon`, `quest:complete` event handlers |
| `apps/web/src/store/gameStore.ts` | Add `quests` slice (or create separate `questStore`) |
| `apps/web/src/ui/GameUI.tsx` | Add `<QuestTracker />` to HUD, `<QuestLogPanel />` to panels |
| `packages/shared-types/src/network/events.ts` | Add quest-related events (`quest:started`, `quest:progress`, `quest:completed`, `quest:failed`) |

---

## Implementation Patterns

### 1. Quest Registry (Shared Package)

**Technology:** TypeScript module with static definitions

```typescript
// packages/quests/src/registry.ts
import { QuestDefinition } from './types';
import { FIRST_STEPS } from './definitions/starter-quests';
// ... import all quest definitions

const QUESTS = new Map<string, QuestDefinition>([
  [FIRST_STEPS.id, FIRST_STEPS],
  // ... register all quests
]);

export function getQuestById(id: string): QuestDefinition | undefined {
  return QUESTS.get(id);
}

export function getQuestsByCategory(category: QuestDefinition['category']): QuestDefinition[] {
  return Array.from(QUESTS.values()).filter(q => q.category === category);
}

export function getQuestsByGiver(npcId: string): QuestDefinition[] {
  return Array.from(QUESTS.values()).filter(q => q.questGiverId === npcId);
}
```

**Rationale:** Mirrors `packages/npcs/src/npc-registry.ts` pattern. Static registry provides compile-time type safety. Server and client both import same definitions (single source of truth).

### 2. Quest Acceptance Validation (Server)

**Technology:** NestJS service with business logic

```typescript
// apps/game-server/src/game/quest.service.ts
export class QuestService {
  async acceptQuest(characterId: string, questId: string): Promise<QuestProgress | null> {
    const quest = getQuestById(questId);
    if (!quest) return null;

    const character = await this.characterService.getCharacter(characterId);

    // Validate prerequisites
    if (!this.canAcceptQuest(character, quest)) {
      throw new ForbiddenException('Prerequisites not met');
    }

    // Check if already active
    const existing = await this.getActiveQuestProgress(characterId, questId);
    if (existing) {
      throw new ConflictException('Quest already active');
    }

    // Create quest progress
    const progress = await this.createQuestProgress(characterId, quest);

    return progress;
  }

  private canAcceptQuest(character: Character, quest: QuestDefinition): boolean {
    // Level check
    if (character.level < quest.requiredLevel) return false;

    // Prerequisite check
    if (quest.prerequisites) {
      for (const prereqId of quest.prerequisites) {
        const completed = await this.isQuestCompleted(character.id, prereqId);
        if (!completed) return false;
      }
    }

    return true;
  }
}
```

**Rationale:** Server-authoritative validation (same as `InventoryService.canEquipItem()`). All checks on server prevent client-side exploits.

### 3. Objective Progress Update (Event-Driven)

**Technology:** `@nestjs/event-emitter` with `@OnEvent()` decorators

```typescript
// apps/game-server/src/game/quest.service.ts
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class QuestService {
  @OnEvent('entity.killed')
  async onEntityKilled(event: { playerId: string; entityId: string }) {
    const quests = await this.getActiveQuests(event.playerId);

    for (const quest of quests) {
      const questDef = getQuestById(quest.questId);
      if (!questDef) continue;

      let updated = false;

      for (let i = 0; i < quest.objectives.length; i++) {
        const objective = quest.objectives[i];
        const objectiveDef = questDef.objectives[i];

        if (objectiveDef.type === 'kill' && objectiveDef.targetEntityId === event.entityId && !objective.completed) {
          objective.currentCount++;
          if (objective.currentCount >= objective.requiredCount) {
            objective.completed = true;
          }
          updated = true;
        }
      }

      if (updated) {
        await this.saveQuestProgress(quest);
        this.emitQuestProgress(event.playerId, quest);

        // Check if all objectives complete
        if (quest.objectives.every(obj => obj.completed)) {
          await this.markQuestReadyForCompletion(event.playerId, quest.questId);
        }
      }
    }
  }
}
```

**Event Emission in Combat Service:**
```typescript
// apps/game-server/src/game/combat.service.ts
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CombatService {
  constructor(private eventEmitter: EventEmitter2) {}

  async handleEntityDeath(killerId: string, entity: Entity) {
    // Existing death logic: remove from zone, broadcast entity:remove, etc.

    // Emit event for quest tracking (decoupled)
    this.eventEmitter.emit('entity.killed', {
      playerId: killerId,
      entityId: entity.entityId,
    });
  }
}
```

**Rationale:** Decouples quest logic from core services. `CombatService` doesn't import `QuestService`. Adding new objective type (`entity.interacted`, `zone.discovered`) doesn't modify existing services — just add new `@OnEvent()` handler in `QuestService`.

### 4. Reward Distribution (Server)

**Technology:** Existing `InventoryService`, `PlayerService`

```typescript
// apps/game-server/src/game/quest.service.ts
export class QuestService {
  async completeQuest(characterId: string, questId: string): Promise<void> {
    const quest = getQuestById(questId);
    if (!quest) return;

    const progress = await this.getQuestProgress(characterId, questId);
    if (progress.status !== 'active' || !this.allObjectivesComplete(progress)) {
      throw new BadRequestException('Quest not ready for completion');
    }

    // Distribute rewards
    await this.distributeRewards(characterId, quest.rewards);

    // Mark quest completed
    await this.markQuestCompleted(characterId, questId);

    // Broadcast completion
    this.emitQuestCompleted(characterId, quest);
  }

  private async distributeRewards(characterId: string, rewards: QuestRewards): Promise<void> {
    // XP reward
    if (rewards.xp > 0) {
      await this.playerService.addXp(characterId, rewards.xp);
    }

    // Credits reward
    if (rewards.credits > 0) {
      await this.playerService.addCredits(characterId, rewards.credits);
    }

    // Item rewards
    if (rewards.items) {
      for (const item of rewards.items) {
        await this.inventoryService.addItem(characterId, item.itemId, item.quantity);
      }
    }
  }
}
```

**Rationale:** Reuses existing services (`InventoryService.addItem()`, `PlayerService.addXp()`). Quest rewards follow item reward pattern (loot drops use same `addItem()` method).

---

## Sources

### Quest System Architecture (MEDIUM Confidence)
- [Implementing a Scalable Quest System](https://betterprogramming.pub/implementing-a-scalable-quest-system-7f36ea4cfe22) — Quest structs, objective tracking patterns
- [State Machines: The Key to Cleaner GameDev Code](https://howtomakeanrpg.com/r/a/state-machines.html) — Quest state machine patterns
- [Quest systems for database?](https://gamedev.net/forums/topic/637223-quest-systems-for-database/5021400/) — Database schema recommendations
- [State Pattern/FSM Quest-System](https://forum.unity.com/threads/state-pattern-fsm-quest-system.498911/) — Quest Manager architecture
- [How are quests implemented in MMO video games?](https://www.quora.com/How-are-quests-implemented-in-MMO-video-games) — MMO quest tracking patterns

### TypeScript State Management (HIGH Confidence)
- [How to Build Type-Safe State Machines in TypeScript](https://oneuptime.com/blog/post/2026-01-30-typescript-type-safe-state-machines/view) — Discriminated unions for state machines (2026)
- [TypeScript: Handbook - Unions and Intersection Types](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html) — Official TypeScript docs
- [State · Design Patterns Revisited · Game Programming Patterns](https://gameprogrammingpatterns.com/state.html) — State pattern best practices

### Drizzle ORM & PostgreSQL (HIGH Confidence)
- [Drizzle ORM PostgreSQL Best Practices Guide (2025)](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) — Partial indexes, JSONB patterns, timestamp handling
- [Drizzle ORM - Schema](https://orm.drizzle.team/docs/sql-schema-declaration) — Official schema docs
- [Best way to query jsonb field](https://www.answeroverflow.com/m/1188144616541802506) — JSONB query patterns

### NestJS Event Emitter (HIGH Confidence)
- [@nestjs/event-emitter - npm](https://www.npmjs.com/package/@nestjs/event-emitter) — Version 3.0.1 (latest)
- [Documentation | NestJS - Events](https://docs.nestjs.com/techniques/events) — Official NestJS event emitter docs
- [NestJS Event-Driven Scaling Without Kafka Worship](https://medium.com/@ThinkingLoop/nestjs-event-driven-scaling-without-kafka-worship-a6ce25078562) — In-process events pattern (2026)
- [How to Handle Events in NestJS with the Event Emitter](https://blog.bytescrum.com/how-to-handle-events-in-nestjs-with-the-event-emitter) — Event emitter tutorial

### XState (Background Research — Not Recommended for MVP)
- [xstate - npm](https://www.npmjs.com/package/xstate) — Version 5.28.0 (latest)
- [XState](https://stately.ai/docs/xstate) — Official docs
- [TypeScript](https://stately.ai/docs/typescript) — XState TypeScript integration

---

*Stack research for: Quest System — Into the Void*
*Researched: 2026-02-21*
*Confidence: HIGH — Quest patterns verified via game development forums, NestJS event emitter confirmed at v3.0.1, Drizzle JSONB patterns verified via official best practices guide, all integration points traced to existing codebase patterns.*
