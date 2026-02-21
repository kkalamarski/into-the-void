# Phase 64: Quest Foundations - Research

**Researched:** 2026-02-22
**Domain:** Quest system architecture, TypeScript registry patterns, state machines, JSONB persistence
**Confidence:** HIGH

## Summary

Quest systems require four foundational components: typed quest definitions stored in code, a singleton registry for lookup, a state machine for lifecycle management, and database persistence with JSONB for flexible objective storage. The existing codebase already has proven patterns for all four areas through packages/npcs (registry pattern), packages/game-logic (pure validation functions), and packages/database (JSONB with typed interfaces).

The quest system mirrors the NPC system architecture: definitions as TypeScript objects in a dedicated package, singleton registry for lookups, discriminated unions for type safety, and server-authoritative validation in game-server with pure logic functions in packages/game-logic.

**Primary recommendation:** Follow packages/npcs pattern exactly - create packages/quests with QuestRegistry singleton, typed definitions with discriminated unions for objective types, pure validation in game-logic, and JSONB database storage with composite UNIQUE constraint to prevent reward duplication.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | current | JSONB quest progress persistence | Already used for all database operations, proven JSONB support |
| @nestjs/event-emitter | 3.0.1 | Decoupled objective tracking | Official NestJS events module, avoids tight coupling |
| TypeScript 5+ | current | Discriminated unions for quest types | Type-safe state machines and objective definitions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PostgreSQL JSONB | 14+ | Flexible objective storage | Quest objectives vary by type (kill vs gather vs explore) |
| eventemitter2 | bundled | Event emission foundation | Underlying lib for @nestjs/event-emitter |

**Installation:**
```bash
pnpm add @nestjs/event-emitter@3.0.1
```

## Architecture Patterns

### Recommended Project Structure
```
packages/quests/
├── src/
│   ├── types.ts              # QuestDefinition discriminated union
│   ├── registry.ts           # QuestRegistry singleton
│   ├── definitions/
│   │   ├── index.ts          # ALL_QUESTS export
│   │   ├── tutorial.ts       # Tutorial quest definitions
│   │   ├── verdant.ts        # Verdant faction quests
│   │   ├── helix.ts          # Helix faction quests
│   │   └── nexus.ts          # Nexus faction quests
│   └── index.ts              # Package exports + auto-register
└── package.json

packages/game-logic/src/quest/
├── validation.ts             # Pure quest state transition validation
└── progress.ts               # Pure objective progress calculation

packages/database/src/schema/
└── quest-progress.ts         # quest_progress table with JSONB

packages/shared-types/src/game/
└── quest.ts                  # Client/server quest contracts
```

### Pattern 1: Discriminated Union Quest Definitions
**What:** TypeScript discriminated union where `objectiveType` field narrows the type
**When to use:** Quest definitions with varying objective structures (kill/gather/explore)
**Example:**
```typescript
// Source: Existing patterns in packages/npcs/src/types.ts + TypeScript handbook
export type ObjectiveType = 'kill' | 'gather' | 'explore';

export interface BaseQuestObjective {
  readonly objectiveType: ObjectiveType;
  readonly description: string;
}

export interface KillObjective extends BaseQuestObjective {
  readonly objectiveType: 'kill';
  readonly targetEntityId: string;  // e.g., 'creature_void_crawler'
  readonly targetCount: number;
}

export interface GatherObjective extends BaseQuestObjective {
  readonly objectiveType: 'gather';
  readonly itemId: string;
  readonly quantity: number;
}

export interface ExploreObjective extends BaseQuestObjective {
  readonly objectiveType: 'explore';
  readonly biome: string;  // e.g., 'volcanic', 'crystal'
}

export type QuestObjective = KillObjective | GatherObjective | ExploreObjective;

export interface QuestDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly objectives: readonly QuestObjective[];
  readonly faction?: 'verdant' | 'helix' | 'nexus';  // undefined = available to all
  readonly prerequisiteQuestIds?: readonly string[];
  readonly rewards: {
    readonly credits?: number;
    readonly xp?: number;
    readonly items?: readonly { itemId: string; quantity: number }[];
  };
}
```

### Pattern 2: Singleton Registry with Typed Lookups
**What:** Class with Map storage, static instance, type-safe lookup methods
**When to use:** Server and client need to look up quest definitions by ID
**Example:**
```typescript
// Source: packages/npcs/src/registry.ts (proven pattern)
class QuestRegistryImpl {
  private readonly quests: Map<string, QuestDefinition> = new Map();

  register(quest: QuestDefinition): void {
    if (this.quests.has(quest.id)) {
      console.warn(`Quest ID "${quest.id}" already registered, overwriting`);
    }
    this.quests.set(quest.id, quest);
  }

  registerAll(quests: readonly QuestDefinition[]): void {
    for (const quest of quests) {
      this.register(quest);
    }
  }

  get(id: string): QuestDefinition | undefined {
    return this.quests.get(id);
  }

  has(id: string): boolean {
    return this.quests.has(id);
  }

  getByFaction(faction: string): QuestDefinition[] {
    return Array.from(this.quests.values()).filter(q =>
      !q.faction || q.faction === faction
    );
  }

  getAllIds(): string[] {
    return Array.from(this.quests.keys());
  }

  get size(): number {
    return this.quests.size;
  }
}

export const QuestRegistry = new QuestRegistryImpl();

// In index.ts - auto-register on module load (like packages/npcs)
import { QuestRegistry } from './registry';
import { ALL_QUESTS } from './definitions';
QuestRegistry.registerAll(ALL_QUESTS);
```

### Pattern 3: State Machine with Pure Validation
**What:** Explicit state enum + validation function that returns { valid, reason }
**When to use:** Quest lifecycle (available → active → completed/failed)
**Example:**
```typescript
// Source: packages/game-logic/src/movement/validation.ts pattern
export type QuestState = 'available' | 'active' | 'completed' | 'failed';

export interface QuestStateTransition {
  from: QuestState;
  to: QuestState;
}

export interface ValidateStateResult {
  valid: boolean;
  reason?: string;
}

// Pure validation - no DB calls, no side effects
export function validateQuestTransition(
  currentState: QuestState,
  newState: QuestState,
  allObjectivesComplete: boolean
): ValidateStateResult {
  // Available → Active (quest acceptance)
  if (currentState === 'available' && newState === 'active') {
    return { valid: true };
  }

  // Active → Completed (all objectives met)
  if (currentState === 'active' && newState === 'completed') {
    if (!allObjectivesComplete) {
      return { valid: false, reason: 'Not all objectives completed' };
    }
    return { valid: true };
  }

  // Active → Failed (abandonment or failure condition)
  if (currentState === 'active' && newState === 'failed') {
    return { valid: true };
  }

  // No other transitions allowed
  return {
    valid: false,
    reason: `Invalid transition from ${currentState} to ${newState}`
  };
}
```

### Pattern 4: JSONB Database Storage with Type Safety
**What:** JSONB column with TypeScript interface via .$type<>(), composite UNIQUE constraint
**When to use:** Quest progress needs flexible objective storage + duplicate prevention
**Example:**
```typescript
// Source: packages/database/src/schema/inventories.ts (proven JSONB pattern)
import { pgTable, uuid, varchar, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';
import { characters } from './characters';

export type QuestState = 'available' | 'active' | 'completed' | 'failed';

// Mirrors QuestObjective but with mutable progress
export interface ObjectiveProgress {
  objectiveType: 'kill' | 'gather' | 'explore';
  description: string;
  current: number;  // Current progress (kills, items gathered, etc.)
  required: number; // Target count
  targetId?: string; // Entity ID for kill, item ID for gather, biome for explore
  complete: boolean;
}

export const questProgress = pgTable('quest_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  questId: varchar('quest_id', { length: 100 }).notNull(),
  state: varchar('state', { length: 20 }).$type<QuestState>().notNull(),
  objectives: jsonb('objectives').$type<ObjectiveProgress[]>().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  // CRITICAL: Prevents duplicate completions and reward farming
  uniqueCompletion: unique('unique_quest_completion').on(
    table.characterId,
    table.questId
  ),
}));

export type QuestProgress = typeof questProgress.$inferSelect;
export type NewQuestProgress = typeof questProgress.$inferInsert;
```

### Pattern 5: Event-Driven Objective Tracking
**What:** Services emit domain events, QuestService listens and updates progress
**When to use:** Decouple quest logic from combat/inventory/movement systems
**Example:**
```typescript
// Source: NestJS event-emitter official docs + decoupling best practices

// In combat.service.ts - emit events without knowing about quests
this.eventEmitter.emit('entity.killed', {
  characterId: attacker.id,
  entityId: defender.id,
  entityType: defender.entityType,
});

// In quest.service.ts - listen for events and update quest progress
@Injectable()
export class QuestService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('DB_CLIENT') private readonly db: DbClient
  ) {}

  onModuleInit() {
    // Register event listeners
    this.eventEmitter.on('entity.killed', this.handleEntityKilled.bind(this));
    this.eventEmitter.on('item.collected', this.handleItemCollected.bind(this));
    this.eventEmitter.on('biome.entered', this.handleBiomeEntered.bind(this));
  }

  private async handleEntityKilled(event: {
    characterId: string;
    entityId: string;
    entityType: string;
  }) {
    // Get active quests with kill objectives
    const activeQuests = await this.getActiveQuestsForCharacter(event.characterId);

    for (const quest of activeQuests) {
      const updated = this.incrementKillObjective(
        quest.objectives,
        event.entityId
      );

      if (updated.changed) {
        await this.updateQuestProgress(
          quest.id,
          updated.objectives,
          this.checkAllComplete(updated.objectives)
        );

        // Emit quest:progress event to client
        this.emitProgressUpdate(event.characterId, quest.questId, updated.objectives);
      }
    }
  }
}
```

### Anti-Patterns to Avoid
- **Quest definitions in database:** Prevents version control, requires migrations for content changes
- **Client-authoritative quest state:** Allows reward farming, skipping objectives
- **Tight coupling to quest system:** Other services should not import QuestService - use events
- **Boolean flags for state:** Use explicit state enum ('active' not 'isActive && !isComplete')
- **Separate item/equipment updates:** Use atomic JSONB updates to prevent duplication
- **NULL in UNIQUE columns:** PostgreSQL treats NULL != NULL, allowing duplicate (characterId, NULL) rows

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State machine validation | Custom if/else trees checking state combinations | Pure validation function with explicit states | Edge cases (can failed quest be restarted?), hard to test |
| Event bus | Custom pubsub with Map of callbacks | @nestjs/event-emitter | Missing features (wildcards, async, error handling), reinventing wheel |
| Quest objective progress tracking | Manual counter increment in each service | Event-driven listeners with JSONB updates | Tight coupling, duplicated logic, hard to add new objective types |
| Duplicate completion prevention | Application-level "check then insert" | PostgreSQL UNIQUE constraint | Race conditions on concurrent completion, not atomic |
| JSONB querying | String concatenation for PostgreSQL operators | Drizzle with sql`` helper | SQL injection risk, type unsafety |

**Key insight:** Quest systems have deceptive complexity in state management (what transitions are valid?), concurrency (two kills at same time), and data integrity (prevent duplicate rewards). Use proven patterns (state machines, event emitters, DB constraints) rather than rolling custom solutions.

## Common Pitfalls

### Pitfall 1: Quest State Transition Bugs
**What goes wrong:** Invalid state transitions allowed (completed → active, failed → completed)
**Why it happens:** Using boolean flags instead of explicit state enum
**How to avoid:** Use discriminated union state type + pure validation function
**Warning signs:** Multiple boolean columns (isActive, isComplete, isFailed, isAbandoned)

### Pitfall 2: Reward Farming via Duplicate Completion
**What goes wrong:** Player completes quest multiple times, receives rewards each time
**Why it happens:** No database constraint preventing duplicate (characterId, questId, state='completed')
**How to avoid:** UNIQUE constraint on (characterId, questId) in quest_progress table
**Warning signs:** No UNIQUE constraint, application-level "check if exists" before insert

### Pitfall 3: Race Conditions on Concurrent Objective Updates
**What goes wrong:** Two kill events arrive simultaneously, only one increments counter
**Why it happens:** Read-modify-write pattern without transaction isolation
**How to avoid:** Use PostgreSQL JSONB atomic updates or row-level locking with FOR UPDATE
**Warning signs:** `const progress = await get(); progress.count++; await update(progress);`

### Pitfall 4: Tight Coupling Between Quest System and Game Logic
**What goes wrong:** Combat/inventory services directly call QuestService methods
**Why it happens:** Not using event-driven architecture
**How to avoid:** Services emit domain events, QuestService listens and reacts
**Warning signs:** `import { QuestService } from '../quest'` in combat.service.ts

### Pitfall 5: JSONB Schema Drift
**What goes wrong:** Client expects { current, required } but server sends { count, target }
**Why it happens:** No shared TypeScript interface for JSONB structure
**How to avoid:** Export ObjectiveProgress interface from shared-types, use .$type<>() in schema
**Warning signs:** JSON.parse/stringify with any type, no interface for JSONB column

### Pitfall 6: NULL in UNIQUE Constraint Columns
**What goes wrong:** Multiple rows with (characterId, questId=NULL) allowed despite UNIQUE constraint
**Why it happens:** PostgreSQL treats NULL != NULL, UNIQUE only prevents duplicate non-NULL values
**How to avoid:** Use NOT NULL on questId column, or add NULLS NOT DISTINCT to constraint
**Warning signs:** UNIQUE constraint allows duplicate rows with NULL values

### Pitfall 7: Objective Type Confusion
**What goes wrong:** Kill objective treated as gather objective, wrong progress incremented
**Why it happens:** Not using discriminated union objectiveType discriminator
**How to avoid:** Use TypeScript discriminated unions with objectiveType literal types
**Warning signs:** Type casting (objective as KillObjective), missing discriminator checks

## Code Examples

Verified patterns from codebase and official sources:

### Registry Pattern (from packages/npcs/src/registry.ts)
```typescript
class QuestRegistryImpl {
  private readonly quests: Map<string, QuestDefinition> = new Map();

  register(quest: QuestDefinition): void {
    if (this.quests.has(quest.id)) {
      console.warn(`Quest ID "${quest.id}" already registered, overwriting`);
    }
    this.quests.set(quest.id, quest);
  }

  get(id: string): QuestDefinition | undefined {
    return this.quests.get(id);
  }

  has(id: string): boolean {
    return this.quests.has(id);
  }
}

export const QuestRegistry = new QuestRegistryImpl();
```

### Pure Validation (from packages/game-logic/src/inventory/validation.ts)
```typescript
export interface ValidateQuestTransitionResult {
  valid: boolean;
  reason?: string;
}

export function validateQuestTransition(
  currentState: QuestState,
  newState: QuestState,
  allObjectivesComplete: boolean
): ValidateQuestTransitionResult {
  if (currentState === 'active' && newState === 'completed') {
    if (!allObjectivesComplete) {
      return { valid: false, reason: 'Not all objectives completed' };
    }
    return { valid: true };
  }
  // ... other transitions
  return { valid: false, reason: `Invalid transition: ${currentState} → ${newState}` };
}
```

### JSONB with Type Safety (from packages/database/src/schema/inventories.ts)
```typescript
export interface ObjectiveProgress {
  objectiveType: 'kill' | 'gather' | 'explore';
  current: number;
  required: number;
  complete: boolean;
}

export const questProgress = pgTable('quest_progress', {
  characterId: uuid('character_id').notNull(),
  questId: varchar('quest_id', { length: 100 }).notNull(),
  objectives: jsonb('objectives').$type<ObjectiveProgress[]>().notNull(),
}, (table) => ({
  uniqueCompletion: unique('unique_quest_completion').on(
    table.characterId,
    table.questId
  ),
}));
```

### Event-Driven Objective Tracking (from NestJS docs)
```typescript
// In combat.service.ts
this.eventEmitter.emit('entity.killed', {
  characterId: player.id,
  entityId: enemy.id,
  entityType: enemy.type,
});

// In quest.service.ts
@OnEvent('entity.killed')
async handleEntityKilled(payload: { characterId: string; entityId: string }) {
  const activeQuests = await this.getActiveKillQuests(payload.characterId);
  // Update quest progress for matching kill objectives
}
```

### Atomic JSONB Update (from packages/database/src/queries/inventory.ts pattern)
```typescript
// Update objectives in single atomic operation
export async function updateQuestObjectives(
  db: DbClient,
  questProgressId: string,
  objectives: ObjectiveProgress[]
): Promise<void> {
  await db
    .update(questProgress)
    .set({ objectives })
    .where(eq(questProgress.id, questProgressId));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Quest definitions in database | TypeScript definitions in code | Industry standard since ~2020 | Version control, type safety, easier testing |
| Boolean state flags (isActive, isComplete) | Discriminated union state enum | TypeScript 2.0+ (2016) | Impossible states unrepresentable, compile-time safety |
| Manual event handlers (Map<event, callback[]>) | @nestjs/event-emitter | NestJS 8.0 (2021) | Better error handling, wildcards, async support |
| JSON column type | JSONB column type | PostgreSQL 9.4 (2014) | Binary format, indexable, more operators |
| Serial columns for IDs | Identity columns | PostgreSQL 10 (2017), Drizzle best practice 2025 | SQL standard compliance, better replication |

**Deprecated/outdated:**
- **Quest definitions in database:** Modern quest systems store definitions in code for version control and type safety
- **Callback-based event emitters:** NestJS event-emitter provides type-safe, decorator-based approach
- **Check-then-insert for uniqueness:** Use database UNIQUE constraints for atomicity

## Open Questions

1. **Quest abandonment: Can abandoned quests be restarted?**
   - What we know: State machine needs 'available' → 'active' → 'failed' transition
   - What's unclear: Can 'failed' → 'available' transition be allowed for restarts?
   - Recommendation: Start with no restarts (simpler), add 'abandonedAt' timestamp field for future retry logic

2. **Concurrent objective updates: Row-level locking needed?**
   - What we know: JSONB updates are atomic at column level
   - What's unclear: If two kill events arrive simultaneously, does Drizzle handle correctly?
   - Recommendation: Test with concurrent events; add FOR UPDATE lock if race conditions occur

3. **Quest discovery events: Zone entry vs NPC interaction?**
   - What we know: QUEST-05 requires auto-discover on zone/biome entry
   - What's unclear: How to prevent spam (re-entering same zone repeatedly)
   - Recommendation: Phase 64 focuses on foundations only; discovery is Phase 67

4. **Objective completion notification: Immediate or batch?**
   - What we know: Client needs quest:progress events for UI updates
   - What's unclear: Emit on every increment or batch updates per tick?
   - Recommendation: Emit immediately (simpler), optimize later if performance issue

## Sources

### Primary (HIGH confidence)
- Codebase patterns: packages/npcs/src/registry.ts (singleton registry)
- Codebase patterns: packages/game-logic/src/inventory/validation.ts (pure validation)
- Codebase patterns: packages/database/src/schema/inventories.ts (JSONB with .$type<>())
- Codebase patterns: packages/shared-types/src/network/events.ts (WebSocket event contracts)
- v1.15 Requirements: .planning/milestones/v1.15/REQUIREMENTS.md

### Secondary (MEDIUM confidence)
- [NestJS Event Emitter Official Docs](https://docs.nestjs.com/techniques/events) - Event-driven architecture
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) - JSONB type definition
- [PostgreSQL UNIQUE Constraint Docs](https://www.postgresql.org/docs/current/ddl-constraints.html) - Duplicate prevention
- [TypeScript Discriminated Unions Handbook](https://basarat.gitbook.io/typescript/type-system/discriminated-unions) - State machine types
- [How to Build Type-Safe State Machines in TypeScript](https://oneuptime.com/blog/post/2026-01-30-typescript-type-safe-state-machines/view) - State machine patterns (2026)
- [Drizzle ORM PostgreSQL Best Practices Guide (2025)](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - JSONB and identity columns
- [NestJS Event-Driven Scaling Without Kafka Worship](https://medium.com/@ThinkingLoop/nestjs-event-driven-scaling-without-kafka-worship-a6ce25078562) - Event emitter architecture (2026)

### Tertiary (LOW confidence)
- [Quest System Design Patterns](https://www.gamedev.net/tutorials/game-design/game-design-and-theory/the-quest-for-the-custom-quest-system-r4728/) - Kill/gather/explore objective types
- [TypeScript Singleton Registry Pattern](https://www.codefixeshub.com/typescript/typing-singleton-pattern-implementations-in-typesc) - Registry implementation guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use or explicitly required by v1.15 REQUIREMENTS.md
- Architecture: HIGH - Exact patterns already proven in packages/npcs and packages/database
- Pitfalls: HIGH - Directly derived from existing codebase patterns and PostgreSQL docs
- Quest objective types: MEDIUM - Game design patterns from external sources, not codebase-specific

**Research date:** 2026-02-22
**Valid until:** 2026-03-24 (30 days - stable domain with established patterns)
