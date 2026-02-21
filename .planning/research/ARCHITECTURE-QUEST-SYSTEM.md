# Architecture Research: Quest System Integration

**Domain:** Quest system for multiplayer 2D sci-fi MMO
**Researched:** 2026-02-21
**Confidence:** HIGH

## Current Architecture Context

Into the Void uses a three-tier architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (apps/web)                         │
│  React + Phaser + Zustand                                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │GameStore│  │NPCStore │  │InvStore │  │StatsStore│        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│       └────────────┴────────────┴────────────┘              │
│                    │ Socket.IO                               │
├────────────────────┼────────────────────────────────────────┤
│           GAME SERVER (apps/game-server)                     │
│           NestJS + Socket.IO                                 │
├────────────────────┼────────────────────────────────────────┤
│  ┌─────────────────▼──────────────────────────────────────┐ │
│  │         GameGateway (@SubscribeMessage)                │ │
│  │  - player:move, combat:start, inventory:use, etc.      │ │
│  └───┬──────────┬──────────┬──────────┬──────────┬────────┘ │
│      │          │          │          │          │          │
│  ┌───▼──┐  ┌───▼──┐  ┌───▼──┐  ┌───▼──┐  ┌───▼──┐        │
│  │Player│  │Combat│  │Invent│  │Trade │  │Abilit│        │
│  │Svc   │  │Svc   │  │orySvc│  │Svc   │  │ySvc  │        │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘        │
│      │          │          │          │          │          │
├──────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│           SHARED PACKAGES                                    │
├──────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│  ┌───▼───────────────────────────────────────────────────┐  │
│  │  packages/database (Drizzle ORM + PostgreSQL)         │  │
│  │  - Schema: characters, inventories, storage, etc.     │  │
│  │  - Queries: Pure functions for DB operations          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  packages/game-logic (Pure validation/computation)    │  │
│  │  - movement, combat, interaction, stats, etc.         │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  packages/items (ItemRegistry + definitions)          │  │
│  │  - ItemDefinition, effects, registry pattern          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  packages/npcs (NpcRegistry + definitions)            │  │
│  │  - NpcDefinition, dialogue, trade inventory           │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  packages/entities (EntityRegistry + definitions)     │  │
│  │  - Creatures, minerals, spawning logic                │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  packages/shared-types (Client/Server contracts)      │  │
│  │  - ClientEvents, ServerEvents, Entity types           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns Already in Use

1. **Registry Pattern**: ItemRegistry, NpcRegistry, EntityRegistry (singleton pattern with fallback for unknown IDs)
2. **Strategy Pattern**: Entity definitions with different behaviors per type
3. **Pure Functions**: game-logic package contains zero state, only validation/computation
4. **Service Layer**: NestJS services encapsulate business logic, injected into Gateway
5. **Database Queries**: Pure functions in packages/database/src/queries/*.ts
6. **WebSocket Events**: Strongly-typed ClientEvents/ServerEvents interfaces
7. **JSON Storage**: Characters store position/stats as JSONB, inventories store items/equipment as JSONB

## Quest System Integration Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (apps/web)                         │
├─────────────────────────────────────────────────────────────┤
│  NEW COMPONENTS:                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ QuestStore  │  │ QuestPanel  │  │ QuestTracker│          │
│  │ (Zustand)   │  │  (React)    │  │   (HUD)     │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                          │                                   │
│  EVENTS: quest:accept, quest:abandon, quest:complete        │
│                          │                                   │
├──────────────────────────┼───────────────────────────────────┤
│           GAME SERVER (apps/game-server)                     │
├──────────────────────────┼───────────────────────────────────┤
│  ┌─────────────────────▼──────────────────────────────────┐ │
│  │  GameGateway MODIFIED                                   │ │
│  │  + @SubscribeMessage('quest:accept')                    │ │
│  │  + @SubscribeMessage('quest:abandon')                   │ │
│  │  + @SubscribeMessage('quest:complete')                  │ │
│  │  + @SubscribeMessage('npc:interact') → check quests     │ │
│  │  + Listen to existing events (combat:damage,            │ │
│  │    entity:tool_use, etc.) to update quest objectives    │ │
│  └────────────────┬────────────────────────────────────────┘ │
│                   │                                          │
│  NEW SERVICE:     │                                          │
│  ┌────────────────▼────────────────────────────────────────┐ │
│  │           QuestService                                  │ │
│  │  - acceptQuest(playerId, questId)                       │ │
│  │  - abandonQuest(playerId, questId)                      │ │
│  │  - completeQuest(playerId, questId)                     │ │
│  │  - updateObjectiveProgress(playerId, event)             │ │
│  │  - checkQuestCompletion(playerId, questId)              │ │
│  │  - getAvailableQuests(playerId, npcId?)                 │ │
│  │  - grantQuestRewards(playerId, questId)                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                   │                                          │
│  MODIFIED:        │                                          │
│  ┌────────────────▼────────────────────────────────────────┐ │
│  │  PlayerService MODIFIED                                 │ │
│  │  + awardXp() → trigger quest objective check            │ │
│  │  + addCredits() → trigger quest objective check         │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  InventoryService MODIFIED                              │ │
│  │  + addItem() → trigger quest objective check            │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  CombatService MODIFIED                                 │ │
│  │  + handleCreatureDeath() → trigger quest objective      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│           SHARED PACKAGES                                    │
├──────────────────────────────────────────────────────────────┤
│  NEW PACKAGE:                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  packages/quests                                        │ │
│  │  ├── src/                                                │ │
│  │  │   ├── types.ts         # QuestDefinition interfaces  │ │
│  │  │   ├── registry.ts      # QuestRegistry (singleton)   │ │
│  │  │   ├── definitions/     # Quest definitions           │ │
│  │  │   │   ├── index.ts                                   │ │
│  │  │   │   ├── verdant.ts   # Verdant faction quests      │ │
│  │  │   │   ├── helix.ts     # Helix faction quests        │ │
│  │  │   │   ├── nexus.ts     # Nexus faction quests        │ │
│  │  │   │   └── neutral.ts   # Neutral/tutorial quests     │ │
│  │  │   └── index.ts                                       │ │
│  │  └── package.json                                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  packages/database MODIFIED                             │ │
│  │  + src/schema/quests.ts   # Quest progress table        │ │
│  │  + src/queries/quests.ts  # Quest DB operations         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  packages/game-logic NEW MODULE                         │ │
│  │  + src/quests/validation.ts  # Quest requirement checks │ │
│  │  + src/quests/progress.ts    # Objective progress calc  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  packages/shared-types MODIFIED                         │ │
│  │  + src/game/quest.ts      # Quest state types           │ │
│  │  + src/network/events.ts  # Quest event types           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### New Components

| Component | Responsibility | Location |
|-----------|----------------|----------|
| **QuestDefinition** | Source of truth for quest metadata (objectives, rewards, requirements) | packages/quests/src/definitions/*.ts |
| **QuestRegistry** | Singleton registry for quest lookups (mirrors ItemRegistry pattern) | packages/quests/src/registry.ts |
| **QuestService** | Server-side quest state management, progress tracking, rewards | apps/game-server/src/game/quest.service.ts |
| **QuestStore** | Client-side quest state (active quests, progress, completion) | apps/web/src/store/questStore.ts |
| **QuestPanel** | UI for browsing/accepting/tracking quests | apps/web/src/ui/panels/QuestPanel.tsx |
| **QuestTracker** | HUD element showing active quest objectives | apps/web/src/ui/hud/QuestTracker.tsx |
| **quests table** | PostgreSQL table storing per-character quest progress | packages/database/src/schema/quests.ts |
| **quest queries** | Pure DB query functions for quest operations | packages/database/src/queries/quests.ts |
| **quest validation** | Pure functions for requirement checking | packages/game-logic/src/quests/validation.ts |
| **quest progress** | Pure functions for objective completion calculation | packages/game-logic/src/quests/progress.ts |

### Modified Components

| Component | Modification | Reason |
|-----------|-------------|--------|
| **GameGateway** | Add quest event handlers, inject QuestService | Route quest events to service layer |
| **PlayerService** | Call QuestService on XP/credits changes | Trigger quest objective checks |
| **InventoryService** | Call QuestService on item additions | Track "collect X items" objectives |
| **CombatService** | Call QuestService on creature kills | Track "kill X creatures" objectives |
| **EntityService** | Call QuestService on harvesting | Track "harvest X resources" objectives |
| **NpcRegistry** | NPCs get optional questIds array | Link quests to quest givers |
| **ClientEvents** | Add quest:accept, quest:abandon, quest:complete | Type-safe quest events |
| **ServerEvents** | Add quest:update, quest:available, quest:completed | Server quest broadcasts |

## Data Flow

### Quest Acceptance Flow

```
[Player clicks "Accept Quest" in NPC dialogue]
    ↓
[QuestPanel emits 'quest:accept' with questId, npcId]
    ↓ Socket.IO
[GameGateway.handleQuestAccept()]
    ↓
[QuestService.acceptQuest(playerId, questId)]
    ├─→ [QuestRegistry.get(questId)] → validate quest exists
    ├─→ [validateQuestRequirements(player, quest)] → check level, faction, prerequisites
    ├─→ [createQuestProgress(db, characterId, questId)] → insert DB row
    └─→ [emit 'quest:update' to client]
    ↓
[QuestStore.setActiveQuests()] ← receives quest state
    ↓
[QuestTracker updates UI]
```

### Objective Progress Flow

```
[Player kills creature]
    ↓
[CombatService.handleCreatureDeath()]
    ├─→ [Award XP/loot as usual]
    └─→ [QuestService.updateObjectiveProgress(playerId, {
          type: 'kill',
          targetId: 'creature_void_stalker',
          amount: 1
        })]
        ↓
        ├─→ [getActiveQuests(db, characterId)]
        ├─→ For each active quest:
        │   └─→ [checkObjectiveMatch(quest, event)]
        │       └─→ If matched: increment progress in DB
        ├─→ [checkQuestCompletion(quest, progress)]
        └─→ If all objectives complete:
            └─→ [emit 'quest:completed' event]
                ↓
                [Client shows "Quest Complete" notification]
```

### Quest Completion Flow

```
[Player returns to quest giver NPC]
    ↓
[Player clicks "Complete Quest"]
    ↓
[GameGateway.handleQuestComplete()]
    ↓
[QuestService.completeQuest(playerId, questId)]
    ├─→ [Verify all objectives completed]
    ├─→ [grantQuestRewards(playerId, quest.rewards)]
    │   ├─→ InventoryService.addItem() for item rewards
    │   ├─→ PlayerService.awardXp() for XP rewards
    │   └─→ PlayerService.addCredits() for credit rewards
    ├─→ [updateQuestProgress(db, characterId, questId, 'completed')]
    └─→ [emit 'quest:update' with completed state]
        ↓
        [QuestStore removes from active, adds to completed]
        [QuestTracker updates]
```

## Database Schema

### New Table: quests

```typescript
// packages/database/src/schema/quests.ts
import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { characters } from './characters';

export type QuestState = 'active' | 'completed' | 'failed' | 'abandoned';

export interface QuestObjectiveProgress {
  objectiveId: string;
  current: number;
  required: number;
  completed: boolean;
}

export interface QuestProgressJson {
  questId: string;
  state: QuestState;
  objectives: QuestObjectiveProgress[];
  acceptedAt: number;
  completedAt?: number;
}

export const quests = pgTable('quests', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  questId: varchar('quest_id', { length: 100 }).notNull(),
  state: varchar('state', { length: 20 }).$type<QuestState>().notNull().default('active'),
  progress: jsonb('progress').$type<QuestProgressJson>().notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  characterIdx: index('quests_character_idx').on(table.characterId),
  characterQuestIdx: index('quests_character_quest_idx').on(table.characterId, table.questId),
}));
```

**Rationale:**
- Follows existing pattern (JSONB for complex state, like inventories/equipment)
- One row per character per quest (allows quest replayability in future)
- Index on characterId for fast "get all active quests" queries
- Composite index on (characterId, questId) for fast single-quest lookups
- State field for quick filtering without parsing JSON

### Database Queries

```typescript
// packages/database/src/queries/quests.ts

export async function getActiveQuests(
  db: DbClient,
  characterId: string
): Promise<Quest[]> {
  return db
    .select()
    .from(quests)
    .where(and(
      eq(quests.characterId, characterId),
      eq(quests.state, 'active')
    ));
}

export async function createQuestProgress(
  db: DbClient,
  characterId: string,
  questId: string,
  initialProgress: QuestProgressJson
): Promise<Quest> {
  const [quest] = await db
    .insert(quests)
    .values({
      characterId,
      questId,
      state: 'active',
      progress: initialProgress,
    })
    .returning();
  return quest;
}

export async function updateQuestProgress(
  db: DbClient,
  characterId: string,
  questId: string,
  progress: QuestProgressJson
): Promise<void> {
  await db
    .update(quests)
    .set({ progress })
    .where(and(
      eq(quests.characterId, characterId),
      eq(quests.questId, questId)
    ));
}

export async function completeQuest(
  db: DbClient,
  characterId: string,
  questId: string
): Promise<void> {
  await db
    .update(quests)
    .set({
      state: 'completed',
      completedAt: new Date(),
    })
    .where(and(
      eq(quests.characterId, characterId),
      eq(quests.questId, questId)
    ));
}
```

## Integration Points

### NPC Integration

**Approach:** Extend NpcDefinition with optional quest associations

```typescript
// packages/npcs/src/types.ts MODIFIED
export interface BaseNpcDefinition {
  // ... existing fields ...
  readonly questGiver?: {
    readonly questIds: readonly string[];  // Quests this NPC offers
    readonly completionQuestIds?: readonly string[];  // Quests turned in here
  };
}
```

**Flow:**
1. Player interacts with NPC (`npc:interact` event)
2. GameGateway checks NpcRegistry for NPC definition
3. If NPC has `questGiver`, query available quests for player
4. Include available quests in `npc:interact:response` event
5. Client displays quest options in NPC dialogue window

### Interaction System Integration

**Hook into existing interaction handlers:**

```typescript
// apps/game-server/src/game/game.gateway.ts MODIFIED

@SubscribeMessage('entity:tool_use')
async handleToolUse(@ConnectedSocket() client: Socket, @MessageBody() data: { targetEntityId: string }) {
  // ... existing harvesting logic ...

  if (result.success) {
    // NEW: Check quest objectives
    await this.questService.updateObjectiveProgress(player.id, {
      type: 'harvest',
      targetId: entity.definitionId,
      amount: 1,
    });
  }
}
```

**Modified Services:**
- **CombatService**: On creature death → call QuestService
- **InventoryService**: On item pickup → call QuestService
- **PlayerService**: On level up → call QuestService (for "reach level X" quests)

### Event-Driven Progress Updates

**Pattern:** Services emit internal events, QuestService listens

**Alternative (simpler):** Direct service calls from existing services

**Recommendation:** Direct calls for MVP, event system for future scalability

```typescript
// Direct call pattern (RECOMMENDED FOR MVP)
// apps/game-server/src/game/combat.service.ts
async handleCreatureDeath(creature: Creature, killer: Player) {
  // ... existing logic ...

  // Notify quest system
  await this.questService.updateObjectiveProgress(killer.id, {
    type: 'kill',
    targetId: creature.definitionId,
    amount: 1,
  });
}
```

## Architectural Patterns

### Pattern 1: Registry Pattern for Quest Definitions

**What:** Singleton QuestRegistry mirrors ItemRegistry/NpcRegistry/EntityRegistry pattern

**When to use:** Quest definitions are static, loaded at server startup

**Trade-offs:**
- ✅ Consistent with existing codebase
- ✅ Type-safe lookups with fallback
- ✅ Central source of truth
- ❌ No dynamic quest generation (out of scope for MVP)

**Example:**
```typescript
// packages/quests/src/registry.ts
class QuestRegistryImpl {
  private readonly quests: Map<string, QuestDefinition> = new Map();

  register(quest: QuestDefinition): void {
    this.quests.set(quest.id, quest);
  }

  get(id: string): QuestDefinition {
    const quest = this.quests.get(id);
    if (!quest) {
      console.warn(`Unknown quest ID: "${id}"`);
      return UNKNOWN_QUEST;
    }
    return quest;
  }
}

export const QuestRegistry = new QuestRegistryImpl();
```

### Pattern 2: Objective Progress as Pure Function

**What:** Quest objective checking is a pure function in packages/game-logic

**When to use:** Objective progress calculation should be testable, reusable

**Trade-offs:**
- ✅ Testable without database
- ✅ Reusable between client/server
- ✅ No side effects
- ❌ Slightly more verbose

**Example:**
```typescript
// packages/game-logic/src/quests/progress.ts
export function updateObjectiveProgress(
  objective: QuestObjective,
  currentProgress: number,
  event: ObjectiveEvent
): number {
  if (objective.type !== event.type) return currentProgress;
  if (objective.targetId && objective.targetId !== event.targetId) return currentProgress;

  return Math.min(currentProgress + event.amount, objective.required);
}

export function isObjectiveComplete(
  objective: QuestObjective,
  progress: number
): boolean {
  return progress >= objective.required;
}
```

### Pattern 3: Service Layer for Quest State

**What:** QuestService owns quest state mutations, coordinates with other services

**When to use:** Quest completion requires multi-service coordination (inventory, XP, credits)

**Trade-offs:**
- ✅ Encapsulates quest business logic
- ✅ Transactional reward granting
- ✅ Dependency injection for testing
- ❌ Adds another service (complexity)

**Example:**
```typescript
// apps/game-server/src/game/quest.service.ts
@Injectable()
export class QuestService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly inventoryService: InventoryService,
    private readonly playerService: PlayerService,
  ) {}

  async completeQuest(playerId: string, questId: string): Promise<void> {
    const db = this.databaseService.getClient();
    const quest = QuestRegistry.get(questId);

    // Grant all rewards atomically
    for (const reward of quest.rewards) {
      if (reward.type === 'item') {
        await this.inventoryService.addItem(playerId, reward.itemId, reward.quantity);
      } else if (reward.type === 'xp') {
        await this.playerService.awardXp(playerId, reward.amount);
      } else if (reward.type === 'credits') {
        await this.playerService.addCredits(playerId, reward.amount);
      }
    }

    await completeQuest(db, playerId, questId);
  }
}
```

## Build Order and Dependencies

### Phase 1: Foundation (No external dependencies)
**Goal:** Quest data structures and definitions

1. Create `packages/quests` package
2. Define QuestDefinition types in `packages/quests/src/types.ts`
3. Implement QuestRegistry in `packages/quests/src/registry.ts`
4. Add quest types to `packages/shared-types/src/game/quest.ts`
5. Create a few sample quest definitions in `packages/quests/src/definitions/`

**No blockers** — can start immediately

### Phase 2: Database Schema (Depends on Phase 1 types)
**Goal:** Persistent quest progress storage

1. Create `packages/database/src/schema/quests.ts`
2. Create `packages/database/src/queries/quests.ts`
3. Generate and run migration: `pnpm db:generate && pnpm db:migrate`

**Blocker:** Needs QuestDefinition types from Phase 1

### Phase 3: Game Logic (Depends on Phase 1 types)
**Goal:** Pure quest validation and progress functions

1. Create `packages/game-logic/src/quests/validation.ts`
2. Create `packages/game-logic/src/quests/progress.ts`
3. Write unit tests for validation/progress functions

**Blocker:** Needs QuestDefinition types from Phase 1

### Phase 4: Server Service Layer (Depends on Phases 1-3)
**Goal:** Quest state management on server

1. Create `apps/game-server/src/game/quest.service.ts`
2. Add quest event handlers to `GameGateway`
3. Modify `PlayerService`, `InventoryService`, `CombatService` to call QuestService
4. Modify NPC interaction handler to include available quests

**Blockers:**
- Needs quest definitions (Phase 1)
- Needs database queries (Phase 2)
- Needs validation/progress functions (Phase 3)

### Phase 5: Client State and UI (Depends on Phase 1, can parallel with Phase 4)
**Goal:** Quest display and tracking on client

1. Add quest events to `packages/shared-types/src/network/events.ts`
2. Create `apps/web/src/store/questStore.ts`
3. Create `apps/web/src/ui/panels/QuestPanel.tsx`
4. Create `apps/web/src/ui/hud/QuestTracker.tsx`
5. Integrate quest UI into NPC interaction window

**Blocker:** Needs QuestDefinition types (Phase 1), quest events (can define early)

### Phase 6: Integration and Testing (Depends on Phases 4-5)
**Goal:** End-to-end quest flow working

1. Test quest acceptance flow
2. Test objective progress updates
3. Test quest completion and rewards
4. Test edge cases (abandoning, failing, prerequisites)

**Blockers:** All previous phases complete

## Scaling Considerations

| Scale | Considerations |
|-------|---------------|
| **0-1k users** | In-memory quest state cached in PlayerService, DB only for persistence. Current architecture sufficient. |
| **1k-10k users** | Add Redis for quest state caching. Index `quests` table on `state` for fast active quest queries. |
| **10k+ users** | Consider quest event queue (e.g., Bull/BullMQ) to decouple objective checking from main game loop. Batch DB updates. |

### Scaling Priorities

1. **First bottleneck:** Quest objective checking on every combat/harvest event
   - **Solution:** Debounce objective checks per player (max once per second)
   - **Alternative:** Only check objectives when quest tracker is visible (client-driven)

2. **Second bottleneck:** Database writes for quest progress updates
   - **Solution:** Batch progress updates, write every N objectives or every M seconds
   - **Alternative:** Store progress in Redis, flush to PostgreSQL periodically

## Anti-Patterns

### Anti-Pattern 1: Quest Definitions in Database

**What people do:** Store quest objectives, rewards, text in database tables

**Why it's wrong:** Quest content is static, not dynamic. Database becomes source of truth, harder to version control and review. Migrations required for quest changes.

**Do this instead:** Quest definitions in TypeScript files (packages/quests/src/definitions/). Quest *progress* in database. Mirrors item system (ItemRegistry vs. inventory table).

### Anti-Pattern 2: Client-Side Quest Validation

**What people do:** Let client determine when objectives are complete, tell server "quest done"

**Why it's wrong:** Trivial to cheat. Client can claim completion without meeting requirements.

**Do this instead:** Server is authoritative. Client displays state, server validates all progress. QuestService checks completion criteria before granting rewards.

### Anti-Pattern 3: Tight Coupling Between Quests and NPCs

**What people do:** Hardcode quest IDs into NPC dialogue logic

**Why it's wrong:** Can't reuse quests, can't have quests from multiple sources (items, world events, etc.)

**Do this instead:** NPCs reference quest IDs (loose coupling). Quests are independent entities. Future: quests can be triggered by items, zone discoveries, achievements, etc.

### Anti-Pattern 4: Monolithic Quest Objectives

**What people do:** Single "progress" number for entire quest

**Why it's wrong:** Can't track multi-step quests ("kill 5 X AND collect 3 Y"). Can't show per-objective progress.

**Do this instead:** Quest has array of objectives, each with own progress counter. Server tracks all objectives independently. Mirrors WoW/FFXIV model.

## Summary

### New Components Needed

**Packages:**
- `packages/quests` (new) — Quest definitions and registry
- `packages/game-logic/src/quests` (new module) — Validation and progress functions

**Database:**
- `quests` table (new) — Quest progress per character
- Query functions in `packages/database/src/queries/quests.ts` (new)

**Server:**
- `QuestService` (new) — Quest state management
- GameGateway modifications — Quest event handlers
- Service modifications — Call QuestService on relevant events

**Client:**
- `QuestStore` (new) — Zustand store for quest state
- `QuestPanel` (new) — UI for viewing/accepting quests
- `QuestTracker` (new) — HUD element for active quest tracking

### Modified Components

| Component | Modification Scope |
|-----------|-------------------|
| **GameGateway** | Add 3-4 quest event handlers, inject QuestService |
| **PlayerService** | Add QuestService calls in awardXp(), addCredits() |
| **InventoryService** | Add QuestService call in addItem() |
| **CombatService** | Add QuestService call in handleCreatureDeath() |
| **EntityService** | Add QuestService call in harvest logic |
| **NpcDefinition** | Add optional questGiver field |
| **ClientEvents/ServerEvents** | Add quest event types |

### Critical Integration Points

1. **NPC Interaction**: Quest offerings displayed in NPC dialogue
2. **Objective Tracking**: Existing game events trigger quest progress
3. **Reward System**: Quest completion uses existing inventory/XP/credits systems
4. **Database**: Quest progress stored alongside character data

### Build Order Summary

1. Quest definitions and types (no dependencies)
2. Database schema and queries (depends on types)
3. Game logic validation (depends on types)
4. Server service layer (depends on 1-3)
5. Client UI (depends on types, parallel with server)
6. Integration testing (depends on all)

## Sources

**MMO Database Architecture:**
- [MMORPG Data Storage (Plant Based Games)](https://plantbasedgames.io/blog/posts/01-mmorpg-data-storage-part-one/)
- [MMO Architecture: Source of truth, Dataflows](https://prdeving.wordpress.com/2023/09/29/mmo-architecture-source-of-truth-dataflows-i-o-bottlenecks-and-how-to-solve-them/)
- [Database Structure for MMOs (GameDev.net)](https://www.gamedev.net/forums/topic/690002-database-structure-for-mmos/)

**Quest System Patterns:**
- [The Quest for the Custom Quest System (GameDev.net)](https://www.gamedev.net/tutorials/game-design/game-design-and-theory/the-quest-for-the-custom-quest-system-r4728/)
- [Implementing a Scalable Quest System (Better Programming)](https://betterprogramming.pub/implementing-a-scalable-quest-system-7f36ea4cfe22)
- [State Machines: The Key to Cleaner GameDev Code](https://howtomakeanrpg.com/r/a/state-machines.html)

**NestJS Architecture:**
- [What Is NestJS? A Practical 2026 Guide](https://thelinuxcode.com/what-is-nestjs-a-practical-2026-guide-to-building-scalable-nodejs-backends/)
- [Step up your game, start using Nest! (Medium)](https://kevinkreuzer.medium.com/step-up-your-game-start-using-nest-36674f732565)

**Drizzle ORM:**
- [Drizzle ORM - PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg)
- [Working with Drizzle ORM and PostgreSQL](https://refine.dev/blog/drizzle-react/)

---
*Architecture research for: Quest System Integration*
*Researched: 2026-02-21*
