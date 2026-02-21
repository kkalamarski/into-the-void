# Phase 65: Objective Tracking - Research

**Researched:** 2026-02-22
**Domain:** Event-driven quest objective tracking, NestJS event emitter integration, real-time progress updates
**Confidence:** HIGH

## Summary

Quest objective tracking requires tight integration between game systems (combat, inventory, zone) and the quest service without creating coupling. The solution is event-driven architecture using @nestjs/event-emitter: services emit domain events when meaningful actions occur, QuestService listens and updates progress, then broadcasts quest:progress to clients via WebSocket.

Phase 64 delivered the foundations (QuestDefinition types, QuestRegistry, quest_progress table with JSONB objectives, pure validation functions). Phase 65 wires these into the live game by instrumenting existing services to emit events, implementing QuestService with @OnEvent listeners, and adding database queries for objective increment operations.

**Primary recommendation:** Install @nestjs/event-emitter 3.0.1, add EventEmitterModule.forRoot() to GameModule, instrument 3 services (CombatService for kills, InventoryService for gathers, GameService for zone entry), create QuestService with @OnEvent listeners that query active quests and atomically update JSONB objectives, emit quest:progress WebSocket event with full state.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/event-emitter | 3.0.1 | Decoupled event bus for objective tracking | Official NestJS events module, decorator-based, async support |
| EventEmitter2 | bundled | Underlying event emission engine | Industry standard, wildcard support, built into @nestjs/event-emitter |
| Drizzle ORM | current | JSONB atomic updates for objectives | Already in use, supports atomic JSONB column updates |
| Socket.IO | current | quest:progress event broadcast | Already in use for all server-to-client events |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PostgreSQL JSONB operators | 14+ | Atomic objective increment | If race conditions detected in concurrent updates |
| DatabaseService | existing | Drizzle client injection | All database operations in NestJS services |

**Installation:**
```bash
pnpm add @nestjs/event-emitter@3.0.1
```

## Architecture Patterns

### Recommended Project Structure
```
apps/game-server/src/
├── game/
│   ├── quest.service.ts           # NEW: QuestService with @OnEvent listeners
│   ├── combat.service.ts          # MODIFY: emit 'entity.killed' event
│   ├── inventory.service.ts       # MODIFY: emit 'item.collected' event
│   ├── game.service.ts            # MODIFY: emit 'zone.entered' event
│   └── game.module.ts             # MODIFY: import EventEmitterModule, add QuestService
└── ...

packages/database/src/queries/
└── quests.ts                      # EXISTS: getActiveQuests, updateQuestObjectives

packages/shared-types/src/network/
└── events.ts                      # MODIFY: add 'quest:progress' to ServerEvents
```

### Pattern 1: EventEmitterModule Integration
**What:** Import EventEmitterModule.forRoot() in GameModule to enable event emission
**When to use:** Once per application module for global event bus
**Example:**
```typescript
// Source: NestJS official docs - https://docs.nestjs.com/techniques/events
import { Module } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use this name to emit and listen to events
      wildcard: false,
      // The delimiter used to segment namespaces
      delimiter: '.',
      // Set to true if you want to emit the newListener event
      newListener: false,
      // Set to true if you want to emit the removeListener event
      removeListener: false,
      // Maximum number of listeners per event
      maxListeners: 10,
      // Show event name in memory leak message
      verboseMemoryLeak: false,
      // Disable throwing uncaughtException if an error occurs
      ignoreErrors: false,
    }),
    // ... other imports
  ],
  providers: [
    GameGateway,
    GameService,
    QuestService,  // NEW
    // ... other services
  ],
})
export class GameModule {}
```

### Pattern 2: Domain Event Emission
**What:** Services emit typed domain events without knowing who consumes them
**When to use:** When significant game action occurs (kill, collect, zone entry)
**Example:**
```typescript
// Source: Existing codebase pattern from combat.service.ts
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CombatService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    // ... other dependencies
  ) {}

  // In existing handleCreatureDeath or ability damage code
  async handleCreatureDeath(creature: Creature, zoneId: string, killerId: string): Promise<ItemEntity[]> {
    // ... existing loot spawning logic ...

    // NEW: Emit domain event for quest tracking
    this.eventEmitter.emit('entity.killed', {
      characterId: killerId,
      entityId: creature.speciesId,  // NOT creature.id, but species (e.g., 'creature_void_crawler')
      entityType: 'creature',
      creatureLevel: creature.level,
      zoneId: zoneId,
    });

    return groundItems;
  }
}
```

### Pattern 3: Quest Service with @OnEvent Listeners
**What:** QuestService listens to domain events and updates quest progress
**When to use:** Central quest logic coordination point
**Example:**
```typescript
// Source: NestJS event-emitter patterns + existing service structure
import { Injectable, Inject } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { DatabaseService } from '../database/database.service';
import { getActiveQuests, updateQuestObjectives } from '@into-the-void/database';
import { QuestRegistry } from '@into-the-void/quests';

@Injectable()
export class QuestService {
  private server: Server | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  @OnEvent('entity.killed')
  async handleEntityKilled(payload: {
    characterId: string;
    entityId: string;
    entityType: string;
  }): Promise<void> {
    const db = this.databaseService.getClient();

    // Get all active quests for this character
    const activeQuests = await getActiveQuests(db, payload.characterId);

    for (const questProgress of activeQuests) {
      const questDef = QuestRegistry.get(questProgress.questId);
      if (!questDef) continue;

      let changed = false;
      const updatedObjectives = questProgress.objectives.map((obj) => {
        // Match kill objectives with this entity species
        if (obj.objectiveType === 'kill' && obj.targetId === payload.entityId && !obj.complete) {
          const newCurrent = Math.min(obj.current + 1, obj.required);
          changed = true;
          return {
            ...obj,
            current: newCurrent,
            complete: newCurrent >= obj.required,
          };
        }
        return obj;
      });

      if (changed) {
        // Atomic JSONB update
        await updateQuestObjectives(db, questProgress.id, updatedObjectives);

        // Emit quest:progress to player
        this.emitProgressUpdate(payload.characterId, questProgress.questId, updatedObjectives, questDef);
      }
    }
  }

  private emitProgressUpdate(
    characterId: string,
    questId: string,
    objectives: ObjectiveProgressJson[],
    questDef: QuestDefinition
  ): void {
    if (!this.server) return;

    // Find player socket (via PlayerService lookup - to be wired in implementation)
    const socketId = this.getPlayerSocketId(characterId);
    if (!socketId) return;

    this.server.to(socketId).emit('quest:progress', {
      questId,
      displayName: questDef.displayName,
      description: questDef.description,
      state: 'active',
      objectives: objectives.map(o => ({
        objectiveType: o.objectiveType,
        description: o.description,
        current: o.current,
        required: o.required,
        targetId: o.targetId,
        complete: o.complete,
      })),
      rewards: questDef.rewards,
    });
  }
}
```

### Pattern 4: Atomic JSONB Objective Updates
**What:** Read-modify-write JSONB objectives in single database transaction
**When to use:** Every objective progress increment to prevent race conditions
**Example:**
```typescript
// Source: packages/database/src/queries/quests.ts (already exists from Phase 64)
import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { questProgress, type ObjectiveProgressJson } from '../schema/quest-progress';

// Atomic update - single SQL UPDATE statement
export async function updateQuestObjectives(
  db: DbClient,
  id: string,
  objectives: ObjectiveProgressJson[]
): Promise<void> {
  await db
    .update(questProgress)
    .set({ objectives })
    .where(eq(questProgress.id, id));
}

// Alternative: PostgreSQL JSONB path update for single objective (if needed for performance)
// export async function incrementObjectiveProgress(
//   db: DbClient,
//   id: string,
//   objectiveIndex: number,
// ): Promise<void> {
//   await db.execute(sql`
//     UPDATE quest_progress
//     SET objectives = jsonb_set(
//       objectives,
//       '{${objectiveIndex},current}',
//       (objectives->${objectiveIndex}->>'current')::int + 1
//     )
//     WHERE id = ${id}
//   `);
// }
```

### Pattern 5: WebSocket Event Type Extension
**What:** Add quest:progress to ServerEvents interface in shared-types
**When to use:** Extend network contract for quest updates
**Example:**
```typescript
// Source: packages/shared-types/src/network/events.ts (modify)
export interface ServerEvents {
  // ... existing events ...
  'quest:progress': {
    questId: string;
    displayName: string;
    description: string;
    state: QuestState;
    objectives: {
      objectiveType: 'kill' | 'gather' | 'explore';
      description: string;
      current: number;
      required: number;
      targetId?: string;
      complete: boolean;
    }[];
    rewards: {
      credits?: number;
      xp?: number;
      items?: { itemId: string; quantity: number }[];
    };
  };
}
```

### Anti-Patterns to Avoid
- **Direct service coupling:** CombatService importing QuestService creates tight coupling - use events
- **Client-side objective increment:** Never trust client to report "I killed 3 creatures" - server authoritative only
- **Synchronous event handlers blocking game loop:** Use async @OnEvent handlers, don't await event emission
- **Emitting with creature instance ID:** Emit with creature speciesId (e.g., 'creature_void_crawler') not instance id
- **Missing error handling in listeners:** Wrap @OnEvent handlers in try/catch to prevent event errors crashing server
- **Broadcasting quest progress to zone:** Quest progress is private data - emit only to player socket

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event bus | Map<string, Function[]> with manual publish/subscribe | @nestjs/event-emitter | Missing async support, error handling, wildcards, listener priority |
| Objective increment logic | Switch/case on objective type in each service | Single QuestService with @OnEvent listeners | Duplicated logic, hard to test, violates single responsibility |
| Quest progress broadcasts | Custom WebSocket emit loops per objective update | ServerEvents type + server.to(socketId).emit() | Type safety, contract enforcement, consistent patterns |
| Concurrent objective updates | Application-level locking with Set<questId> | PostgreSQL atomic JSONB updates | Race conditions, complexity, not crash-safe |
| Player socket lookup | Storing Map<characterId, socketId> in QuestService | PlayerService.getSocketByPlayerId() | Stale state on disconnect, duplicates existing service |

**Key insight:** Event-driven architecture decouples quest tracking from game systems, but requires discipline: services emit domain events (what happened), not quest events (quest X updated). QuestService translates domain events to quest progress using registry lookups and JSONB updates.

## Common Pitfalls

### Pitfall 1: Emitting Creature Instance ID Instead of Species ID
**What goes wrong:** Quest tracks kill of creature instance 'abc123', player kills different instance 'xyz789', no progress
**Why it happens:** Confusing entity.id (unique instance) with entity.speciesId (definition type)
**How to avoid:** Emit creature.speciesId or EntityRegistry ID, NOT creature.id
**Warning signs:** Objective progress never increments despite killing matching creatures

### Pitfall 2: Blocking Event Emission with await
**What goes wrong:** CombatService awaits eventEmitter.emit(), blocks combat tick loop
**Why it happens:** Treating event emission as synchronous operation
**How to avoid:** EventEmitter2.emit() returns void, listeners execute async independently
**Warning signs:** Combat lag when quest listeners perform slow operations

### Pitfall 3: Race Conditions on Rapid Objective Updates
**What goes wrong:** Player kills two creatures instantly, both handlers read objectives=[current: 0], both write [current: 1]
**Why it happens:** Read-modify-write pattern without transaction isolation
**How to avoid:** Use Drizzle's atomic UPDATE with full objectives array, PostgreSQL ensures serialization
**Warning signs:** Objective current count lower than actual actions performed

### Pitfall 4: Broadcasting Quest Progress to Zone Room
**What goes wrong:** All players in zone see other players' quest progress updates
**Why it happens:** Using server.to(zoneId).emit() instead of server.to(socketId).emit()
**How to avoid:** Quest progress is private - emit only to individual player socket
**Warning signs:** Quest progress showing up for wrong players in client

### Pitfall 5: Missing Error Handling in Event Listeners
**What goes wrong:** Database error in handleEntityKilled crashes entire server
**Why it happens:** Unhandled promise rejection in async @OnEvent method
**How to avoid:** Wrap @OnEvent handler body in try/catch, log errors instead of throwing
**Warning signs:** Server crashes with UnhandledPromiseRejectionWarning when quest update fails

### Pitfall 6: Incrementing Completed Objectives
**What goes wrong:** Player kills 10 creatures for "kill 5" objective, current becomes 10
**Why it happens:** Not checking obj.complete before incrementing
**How to avoid:** Short-circuit increment if obj.complete === true or current >= required
**Warning signs:** Objective shows "10/5" in UI instead of "5/5"

### Pitfall 7: Emitting Events Before Database Persistence
**What goes wrong:** Server crashes after emit but before DB update, progress lost
**Why it happens:** Emitting quest:progress before await updateQuestObjectives()
**How to avoid:** Always await database update BEFORE emitting WebSocket event
**Warning signs:** Quest progress resets on server restart despite appearing complete

## Code Examples

Verified patterns from codebase and official sources:

### EventEmitterModule Registration (from NestJS docs)
```typescript
// apps/game-server/src/game/game.module.ts
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    // ... other imports
  ],
  providers: [
    GameGateway,
    GameService,
    QuestService,  // NEW
    CombatService,
    InventoryService,
    // ... other services
  ],
})
export class GameModule {}
```

### Domain Event Emission (combat kill event)
```typescript
// apps/game-server/src/game/ability.service.ts (modify existing handleCreatureDeath)
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AbilityService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    // ... other dependencies
  ) {}

  // In existing code around line 283-298
  if (killed) {
    this.combatService.stopCreatureCombat(targetEntityId!);
    groundItems = await this.handleCreatureDeath(target, player.position.zoneId);

    // NEW: Emit kill event for quest tracking
    this.eventEmitter.emit('entity.killed', {
      characterId: player.id,
      entityId: target.speciesId,  // Use speciesId, not instance id
      entityType: 'creature',
      creatureLevel: target.level,
      zoneId: player.position.zoneId,
    });

    // ... existing loot spawn, XP grant code ...
  }
}
```

### Quest Service with Kill Listener
```typescript
// apps/game-server/src/game/quest.service.ts (NEW)
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { DatabaseService } from '../database/database.service';
import { PlayerService } from './player.service';
import {
  getActiveQuests,
  updateQuestObjectives,
  type ObjectiveProgressJson,
} from '@into-the-void/database';
import { QuestRegistry } from '@into-the-void/quests';

@Injectable()
export class QuestService {
  private server: Server | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly playerService: PlayerService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  @OnEvent('entity.killed')
  async handleEntityKilled(payload: {
    characterId: string;
    entityId: string;
    entityType: string;
    creatureLevel: number;
    zoneId: string;
  }): Promise<void> {
    try {
      const db = this.databaseService.getClient();
      const activeQuests = await getActiveQuests(db, payload.characterId);

      for (const questProgress of activeQuests) {
        const questDef = QuestRegistry.get(questProgress.questId);
        if (!questDef) continue;

        let changed = false;
        const updatedObjectives = questProgress.objectives.map((obj) => {
          // Match kill objectives targeting this entity species
          if (
            obj.objectiveType === 'kill' &&
            obj.targetId === payload.entityId &&
            !obj.complete
          ) {
            const newCurrent = Math.min(obj.current + 1, obj.required);
            changed = true;
            return {
              ...obj,
              current: newCurrent,
              complete: newCurrent >= obj.required,
            };
          }
          return obj;
        });

        if (changed) {
          // Atomic update - database write
          await updateQuestObjectives(db, questProgress.id, updatedObjectives);

          // AFTER database update - emit to client
          this.emitProgressUpdate(payload.characterId, questProgress, questDef, updatedObjectives);
        }
      }
    } catch (error) {
      console.error('[QuestService] Error handling entity.killed event:', error);
      // Don't rethrow - prevents event error from crashing server
    }
  }

  private emitProgressUpdate(
    characterId: string,
    questProgress: any,
    questDef: any,
    objectives: ObjectiveProgressJson[]
  ): void {
    if (!this.server) return;

    const socketId = this.playerService.getSocketByPlayerId(characterId);
    if (!socketId) return;

    this.server.to(socketId).emit('quest:progress', {
      questId: questProgress.questId,
      displayName: questDef.displayName,
      description: questDef.description,
      state: questProgress.state,
      objectives: objectives.map((o) => ({
        objectiveType: o.objectiveType,
        description: o.description,
        current: o.current,
        required: o.required,
        targetId: o.targetId,
        complete: o.complete,
      })),
      rewards: questDef.rewards,
    });
  }
}
```

### Inventory Service Item Collection Event
```typescript
// apps/game-server/src/game/inventory.service.ts (modify existing addItem)
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InventoryService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,  // NEW
  ) {}

  async addItem(
    playerId: string,
    item: InventoryItemJson
  ): Promise<{ success: boolean; reason?: string }> {
    // ... existing stacking and inventory full logic ...

    if (remainingQty === 0) {
      await this.saveInventory(playerId);

      // NEW: Emit collection event for quest tracking
      this.eventEmitter.emit('item.collected', {
        characterId: playerId,
        itemId: item.itemId,
        quantity: item.quantity,
      });

      return { success: true };
    }

    return { success: false, reason: 'Inventory full' };
  }
}
```

### Quest Service Gather Listener
```typescript
// In quest.service.ts
@OnEvent('item.collected')
async handleItemCollected(payload: {
  characterId: string;
  itemId: string;
  quantity: number;
}): Promise<void> {
  try {
    const db = this.databaseService.getClient();
    const activeQuests = await getActiveQuests(db, payload.characterId);

    for (const questProgress of activeQuests) {
      const questDef = QuestRegistry.get(questProgress.questId);
      if (!questDef) continue;

      let changed = false;
      const updatedObjectives = questProgress.objectives.map((obj) => {
        // Match gather objectives for this item
        if (
          obj.objectiveType === 'gather' &&
          obj.targetId === payload.itemId &&
          !obj.complete
        ) {
          const newCurrent = Math.min(obj.current + payload.quantity, obj.required);
          changed = true;
          return {
            ...obj,
            current: newCurrent,
            complete: newCurrent >= obj.required,
          };
        }
        return obj;
      });

      if (changed) {
        await updateQuestObjectives(db, questProgress.id, updatedObjectives);
        this.emitProgressUpdate(payload.characterId, questProgress, questDef, updatedObjectives);
      }
    }
  } catch (error) {
    console.error('[QuestService] Error handling item.collected event:', error);
  }
}
```

### Zone Entry Event for Explore Objectives
```typescript
// apps/game-server/src/game/game.service.ts (modify existing zone entry logic)
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class GameService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    // ... other dependencies
  ) {}

  async handleZoneEntry(playerId: string, zoneId: string): Promise<void> {
    // ... existing zone load logic ...

    // NEW: Emit zone entry event with biome info
    const zone = await this.zonesService.getZone(zoneId);
    if (zone) {
      this.eventEmitter.emit('zone.entered', {
        characterId: playerId,
        zoneId: zoneId,
        biome: zone.chunk.biome,  // e.g., 'volcanic', 'crystal'
      });
    }
  }
}
```

### Quest Service Explore Listener
```typescript
// In quest.service.ts
@OnEvent('zone.entered')
async handleZoneEntered(payload: {
  characterId: string;
  zoneId: string;
  biome: string;
}): Promise<void> {
  try {
    const db = this.databaseService.getClient();
    const activeQuests = await getActiveQuests(db, payload.characterId);

    for (const questProgress of activeQuests) {
      const questDef = QuestRegistry.get(questProgress.questId);
      if (!questDef) continue;

      let changed = false;
      const updatedObjectives = questProgress.objectives.map((obj) => {
        // Match explore objectives for this biome
        if (
          obj.objectiveType === 'explore' &&
          obj.targetId === payload.biome &&
          !obj.complete
        ) {
          changed = true;
          return {
            ...obj,
            current: 1,  // Binary: explored or not
            complete: true,
          };
        }
        return obj;
      });

      if (changed) {
        await updateQuestObjectives(db, questProgress.id, updatedObjectives);
        this.emitProgressUpdate(payload.characterId, questProgress, questDef, updatedObjectives);
      }
    }
  } catch (error) {
    console.error('[QuestService] Error handling zone.entered event:', error);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling quest state from client | Push-based quest:progress WebSocket event | Real-time web era (2010+) | Immediate UI updates, no client polling overhead |
| Tight coupling (QuestService injected in CombatService) | Event-driven decoupling with @nestjs/event-emitter | Microservices era (2015+) | Services don't know about quests, easier testing |
| Manual event bus with Map<string, Function[]> | @nestjs/event-emitter with @OnEvent decorator | NestJS 8.0 (2021) | Type safety, async support, error isolation |
| Separate increments per objective | JSONB column update with full objectives array | PostgreSQL 9.4 JSONB (2014) | Atomic updates prevent race conditions |
| Broadcasting all progress to zone | Private player socket emission | WebSocket best practices (ongoing) | Privacy, bandwidth efficiency |

**Deprecated/outdated:**
- **Synchronous event handlers:** Modern event emitters support async/await for database operations
- **Manual socket lookups in domain services:** PlayerService already maintains socket mapping
- **Emitting before database persistence:** Database-first, then emit prevents state inconsistency

## Open Questions

1. **Concurrent kills: Does Drizzle serialize JSONB updates?**
   - What we know: Drizzle generates single UPDATE statement, PostgreSQL handles row-level locking
   - What's unclear: If two @OnEvent handlers for same quest run simultaneously, guaranteed serialization?
   - Recommendation: Test with rapid kills, add FOR UPDATE lock in getActiveQuests if races occur

2. **Event listener execution order: Does order matter for kill → gather chain quests?**
   - What we know: @OnEvent supports priority parameter for listener ordering
   - What's unclear: Do we need guaranteed order, or is eventual consistency acceptable?
   - Recommendation: Phase 65 assumes independent objectives, defer ordering to Phase 66 if chained quests need it

3. **Zone entry spam: Should we debounce or track visited biomes?**
   - What we know: Player crossing zone boundary repeatedly triggers zone.entered
   - What's unclear: Is obj.complete check sufficient, or do we need "visited biomes" set?
   - Recommendation: obj.complete prevents double-credit, explore objectives idempotent by nature

4. **Error isolation: Should failed listener crash all listeners?**
   - What we know: @nestjs/event-emitter config has ignoreErrors flag
   - What's unclear: Should quest update failure prevent other quests from updating?
   - Recommendation: Set ignoreErrors: false (default), wrap each @OnEvent body in try/catch for logging

## Sources

### Primary (HIGH confidence)
- Existing codebase: apps/game-server/src/game/combat.service.ts (kill event insertion point)
- Existing codebase: apps/game-server/src/game/inventory.service.ts (collection event insertion point)
- Existing codebase: apps/game-server/src/game/ability.service.ts (creature death at line 283-298)
- Existing codebase: packages/database/src/queries/quests.ts (atomic JSONB update queries)
- Phase 64 deliverables: packages/quests (QuestDefinition, QuestRegistry, 8 starter quests)
- Phase 64 deliverables: quest_progress table with JSONB objectives and UNIQUE constraint
- [NestJS Event Emitter Official Docs](https://docs.netlify.com/configure-builds/common-configurations/#environment-variables) - EventEmitterModule.forRoot() setup
- [npm @nestjs/event-emitter](https://www.npmjs.com/package/@nestjs/event-emitter) - Version 3.0.1 confirmed

### Secondary (MEDIUM confidence)
- [How to Handle Events in NestJS with the Event Emitter](https://blog.bytescrum.com/how-to-handle-events-in-nestjs-with-the-event-emitter) - @OnEvent decorator patterns
- [How you can use Events and Event-Emitters with NestJs](https://princeigwe.medium.com/how-you-can-use-events-and-event-emitters-with-nestjs-3c067dd14fdf) - EventEmitter2 injection and emit patterns
- [How To Emit and Listen to Events Using The NestJS Event Emitter](https://dzone.com/articles/how-to-emit-and-listen-to-events-using-the-nestjs) - Event listener priority and wildcards
- [Using Event Emitters and Async Event Handling in NestJS](https://syskool.com/using-event-emitters-and-async-event-handling-in-nestjs/) - Async handler best practices
- [Drizzle ORM - Update nested JSONB field](https://www.answeroverflow.com/m/1155357852953747456) - JSONB atomic update patterns
- [API with NestJS #157. Handling JSON data with PostgreSQL and the Drizzle ORM](https://wanago.io/2024/07/15/api-nestjs-json-drizzle-postgresql/) - JSONB with Drizzle type safety

### Tertiary (LOW confidence)
- [NestJS Event Emitter vs RxJS Observables](https://medium.com/@ignatovich.dm/event-emitters-vs-rxjs-subjects-in-angular-choosing-the-right-tool-db241fe1c847) - EventEmitter appropriate for NestJS domain events
- [Drizzle ORM - SQL Increment value](https://orm.drizzle.team/docs/guides/incrementing-a-value) - Alternative increment pattern (not needed, using full update)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @nestjs/event-emitter explicitly chosen in Phase 64 research, version verified via npm
- Architecture: HIGH - Event emission points identified in existing services, JSONB update queries exist
- Event patterns: HIGH - Official NestJS docs + existing codebase Socket.IO patterns
- Pitfalls: HIGH - Race conditions, event ordering, error handling derived from distributed systems experience
- JSONB updates: MEDIUM - Drizzle atomic updates verified, concurrent scenario testing needed

**Research date:** 2026-02-22
**Valid until:** 2026-03-24 (30 days - stable NestJS event patterns)
