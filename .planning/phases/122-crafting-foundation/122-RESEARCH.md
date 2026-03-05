# Phase 122: Crafting Foundation - Research

**Researched:** 2026-03-05
**Domain:** Server-side crafting service, recipe types, DB schema, WebSocket events
**Confidence:** HIGH

## Summary

Phase 122 establishes the crafting service on the game server with all correctness guarantees. The codebase already has strong patterns from GatheringService (timer-based mini-game, proficiency persistence, entity locks, active challenge tracking) and InventoryService (item manipulation, atomic DB writes) that directly inform the CraftingService design.

The key deliverables are: (1) a `@into-the-void/shared-types` extension with crafting types, (2) DB schema additions for recipe unlocks and crafting proficiency, (3) a new CraftingService in the game-server, and (4) recipe type definitions in a shared location. No new npm packages are needed — the entire implementation uses existing NestJS, Drizzle, and Socket.IO infrastructure.

**Primary recommendation:** Mirror GatheringService patterns (in-memory active state Map, proficiency cache, timer with setTimeout, cleanup on disconnect) while adding the unique crafting constraints (atomic bulk ingredient consumption, one-active-craft enforcement, faction gating).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Fire-and-forget: once a craft starts, the player cannot manually cancel it
- Disconnect = immediate cancel, no reconnect grace period
- Crafting continues in background during combat — no pause, no lockout
- Base timer range: 5-30 seconds (basic items ~5s, advanced ~30s)
- Timer duration is fixed per recipe (each recipe defines its own craft time)
- Proficiency reduces craft time AND improves quality (dual reward)
- Max proficiency speed bonus: up to 50% faster (a 10s craft becomes ~5s at max prof)
- Three crafting disciplines: Equipment, Consumables, Reagents
- Recipes always produce exactly one output item (no variable quantities)
- Unlock conditions support three types: character level, quest completion, POI discovery
- Recipes defined as TypeScript objects (typed constants, compile-time validation)
- Start + complete events only — no periodic progress ticks from server
- Client runs its own timer for display based on duration received at craft start
- Craft completion event includes: crafted item, quality tier, and proficiency XP gained
- Crafting activity is broadcast to nearby players (social/immersive indicator)
- Error events include machine-readable error code + human-readable message

### Claude's Discretion
- Ingredient fate on disconnect cancel (refund vs consumed — balance fairness and exploit risk)
- Exact proficiency speed curve (linear vs diminishing returns within the 50% cap)
- Nearby broadcast radius and event shape
- DB schema design for proficiency tracking

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RCPE-07 | Recipe definitions exist as static data in a shared package usable by server and client | Recipe types defined in shared-types; RecipeDefinition interface with discipline, ingredients, output, craftTime, unlockConditions, faction fields. Place recipe type definitions in shared-types for now; actual recipe content comes in Phase 123 |
| CRFT-03 | Server validates crafting requests (ingredient ownership, recipe unlock, faction eligibility) | CraftingService.startCraft() validates: (1) recipe exists in registry, (2) player has all ingredients in inventory, (3) recipe unlock conditions met, (4) faction check for specialty recipes, (5) no active craft in progress |
| CRFT-04 | Ingredient consumption is atomic (all-or-nothing, no partial consumption on failure) | New InventoryService.consumeItems() method — validates all ingredients exist with sufficient quantities BEFORE any mutation, then removes all in a single inventory update |
| CRFT-05 | Server tracks crafting timer independently (prevents client-side timer skip exploits) | ActiveCraft Map tracks start time + duration; crafting:complete handler rejects if Date.now() < startTime + adjustedDuration |
| CRFT-06 | Player can only have one active craft at a time | ActiveCraft Map keyed by playerId — startCraft rejects if entry exists |
| CRFT-07 | Active craft is cancelled on disconnect (no orphaned timers) | handleDisconnect clears ActiveCraft entry and cancels setTimeout; mirrors GatheringService.unloadProficiency pattern |
| PROF-05 | Proficiency data persists in the database across sessions | New `crafting_proficiency` table (or extend existing proficiency schema) with JSONB per-discipline XP/level, loaded on connect, persisted on update |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | existing | Service/module/gateway DI framework | Already used by all game-server services |
| Drizzle ORM | existing | Database queries, schema, migrations | Already used for all DB operations |
| Socket.IO | existing | WebSocket events (crafting:start, crafting:complete, etc.) | Already used for all client-server events |
| @nestjs/event-emitter | existing | Internal event bus (crafting events for quest tracking) | Already used by GatheringService, InventoryService |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto (Node.js built-in) | - | UUID generation for craft session IDs | Already used by GatheringService for challengeId |
| class-validator | existing | DTO validation for incoming WebSocket payloads | Already used by API controllers; optional for gateway |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| setTimeout for craft timer | node-cron / Bull queue | Overkill for short 5-30s timers; setTimeout matches GatheringService pattern |
| JSONB for proficiency | Separate columns per discipline | JSONB matches existing gathering_proficiency pattern, easier to extend |
| In-memory active craft state | Redis | Unnecessary — single server, short timers, state lost on disconnect anyway |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
packages/shared-types/src/game/
├── crafting.ts              # CraftingDiscipline, RecipeDefinition, CraftingProficiencyData, unlock types

packages/database/src/schema/
├── crafting-proficiency.ts  # crafting_proficiency table (mirrors gathering-proficiency.ts)
├── recipe-unlocks.ts        # recipe_unlocks join table (characterId + recipeId)

apps/game-server/src/game/
├── crafting.service.ts      # CraftingService — all business logic
```

### Pattern 1: Service with In-Memory Active State (from GatheringService)
**What:** Track active operations in a Map<string, ActiveState>, validate on start/complete, cleanup on disconnect.
**When to use:** Any timed server-side operation that must survive client manipulation.
**Example:**
```typescript
// From gathering.service.ts — same pattern for crafting
private activeCrafts: Map<string, ActiveCraft> = new Map();

// On disconnect, clean up
cleanupPlayer(characterId: string): void {
  const active = this.activeCrafts.get(characterId);
  if (active) {
    clearTimeout(active.timerId);
    this.activeCrafts.delete(characterId);
  }
}
```

### Pattern 2: Proficiency Cache + DB Persistence (from GatheringService)
**What:** Load proficiency from DB on player join, cache in Map, update DB on XP gain, evict on disconnect.
**When to use:** Per-player persistent state that needs fast reads during gameplay.
**Example:**
```typescript
// From gathering.service.ts lines 76-98
async loadProficiency(characterId: string): Promise<ProficiencyJson> {
  const cached = this.proficiencyCache.get(characterId);
  if (cached) return cached;
  // ... DB load, create if missing, cache
}
```

### Pattern 3: Atomic Inventory Operations
**What:** Validate all preconditions before mutating inventory, then persist in a single DB write.
**When to use:** Any operation that adds or removes multiple items.
**Example:**
```typescript
// New method needed on InventoryService
async consumeItems(
  playerId: string,
  ingredients: { itemId: string; quantity: number }[]
): Promise<{ success: boolean; reason?: string }> {
  // 1. Validate ALL ingredients present with sufficient quantity
  // 2. Only then mutate and persist in one updateInventoryItems call
}
```

### Pattern 4: WebSocket Event Registration (from game.gateway.ts)
**What:** Add @SubscribeMessage handlers in GameGateway, delegate to service methods.
**When to use:** Every new client-to-server action.
**Example:**
```typescript
@SubscribeMessage('crafting:start')
async handleCraftingStart(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { recipeId: string }
) {
  const result = await this.craftingService.startCraft(client.id, data.recipeId);
  if ('error' in result) {
    client.emit('error', { code: result.code, message: result.error });
  } else {
    client.emit('crafting:started', result);
    // Broadcast to nearby players
  }
}
```

### Anti-Patterns to Avoid
- **Don't trust client timers:** Client sends crafting:complete but server must verify elapsed time >= adjusted duration
- **Don't consume ingredients one-by-one:** Must validate all first, then remove atomically to avoid partial consumption
- **Don't store active crafts in DB:** They're ephemeral (5-30s), in-memory Map is correct; DB adds latency and complexity
- **Don't use setInterval for progress ticks:** Context says "start + complete events only"

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timer management | Custom timer loop | setTimeout + ActiveCraft Map | GatheringService already proves this works; 5-30s timers don't need cron/queue infrastructure |
| UUID generation | Custom ID scheme | crypto.randomUUID() | Already used throughout codebase |
| Event typing | Untyped socket events | ClientEvents/ServerEvents interfaces | Already established pattern in shared-types/network/events.ts |
| Proficiency XP curves | Custom formulas from scratch | Mirror calculateLevelFromXP from game-logic | Gathering already has the level-from-XP pattern |

**Key insight:** This phase is mostly service plumbing following established patterns. The novel parts are: bulk ingredient validation, recipe type design, and the unlock persistence table.

## Common Pitfalls

### Pitfall 1: Ingredient Duplication Exploit
**What goes wrong:** Player starts craft, ingredients consumed, then disconnects before timer completes. If ingredients are refunded, player can spam start/disconnect to duplicate items.
**Why it happens:** Naive "refund on cancel" implementation.
**How to avoid:** Decision on ingredient fate on disconnect must weigh exploit risk. Recommendation: **consume on start, no refund on disconnect**. This aligns with the STATE.md decision: "Ingredients consumed on craft start (not completion)".
**Warning signs:** Any code path that restores inventory items after craft start.

### Pitfall 2: Race Condition in Inventory Consumption
**What goes wrong:** Two near-simultaneous requests consume the same ingredients because validation and mutation aren't atomic.
**Why it happens:** Check-then-act pattern without locking.
**How to avoid:** The one-active-craft-per-player enforcement (CRFT-06) already prevents this for crafting. But the consumeItems method should still validate + mutate in a single operation on the cached inventory Map (single-threaded Node.js ensures atomicity for sync operations on the Map).
**Warning signs:** Await between validation and mutation on the same inventory.

### Pitfall 3: Orphaned setTimeout on Server Restart
**What goes wrong:** Server restarts while crafts are active; setTimeout callbacks are lost.
**Why it happens:** In-memory state is ephemeral.
**How to avoid:** This is acceptable by design — disconnect cancels crafts. Server restart is effectively a disconnect for all players. No persistence of active craft state needed.
**Warning signs:** Attempting to persist active craft state to DB (over-engineering).

### Pitfall 4: Schema Migration Breaking Existing Data
**What goes wrong:** Adding new tables or columns fails because migration isn't run, or conflicts with existing data.
**Why it happens:** Drizzle schema changes require db:generate + db:migrate.
**How to avoid:** New tables (crafting_proficiency, recipe_unlocks) are additive — no existing table modifications needed. Just need to run `pnpm db:generate && pnpm db:migrate` after schema changes.
**Warning signs:** Modifying existing schema tables unnecessarily.

## Code Examples

### CraftingProficiency Schema (mirrors gathering-proficiency.ts)
```typescript
// packages/database/src/schema/crafting-proficiency.ts
import { pgTable, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { characters } from './characters';

export interface CraftingProficiencyJson {
  equipment: { xp: number; level: number };
  consumables: { xp: number; level: number };
  reagents: { xp: number; level: number };
}

export const DEFAULT_CRAFTING_PROFICIENCY: CraftingProficiencyJson = {
  equipment: { xp: 0, level: 1 },
  consumables: { xp: 0, level: 1 },
  reagents: { xp: 0, level: 1 },
};

export const craftingProficiency = pgTable('crafting_proficiency', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' })
    .unique(),
  proficiency: jsonb('proficiency').$type<CraftingProficiencyJson>().notNull().default(DEFAULT_CRAFTING_PROFICIENCY),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### RecipeUnlocks Schema
```typescript
// packages/database/src/schema/recipe-unlocks.ts
import { pgTable, uuid, timestamp, varchar } from 'drizzle-orm/pg-core';
import { characters } from './characters';

export const recipeUnlocks = pgTable('recipe_unlocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  recipeId: varchar('recipe_id', { length: 100 }).notNull(),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
});
// Add unique constraint on (characterId, recipeId) to prevent duplicates
```

### RecipeDefinition Type (shared-types)
```typescript
// packages/shared-types/src/game/crafting.ts
export type CraftingDiscipline = 'equipment' | 'consumables' | 'reagents';

export interface RecipeIngredient {
  itemId: string;
  quantity: number;
}

export type RecipeUnlockCondition =
  | { type: 'level'; requiredLevel: number }
  | { type: 'quest'; questId: string }
  | { type: 'poi'; poiId: string };

export interface RecipeDefinition {
  id: string;
  displayName: string;
  description: string;
  discipline: CraftingDiscipline;
  ingredients: RecipeIngredient[];
  outputItemId: string;
  craftTimeMs: number; // 5000-30000
  unlockConditions: RecipeUnlockCondition[];
  factionRestriction?: FactionId; // undefined = any faction
  proficiencyXP: number;
  tier: number; // 1-5, affects quality thresholds in Phase 123
}
```

### WebSocket Event Types
```typescript
// Add to ClientEvents:
'crafting:start': { recipeId: string };
'crafting:collect': Record<string, never>; // collect completed craft

// Add to ServerEvents:
'crafting:started': {
  recipeId: string;
  durationMs: number; // adjusted for proficiency
  startedAt: number;  // server timestamp
};
'crafting:completed': {
  recipeId: string;
  outputItemId: string;
  qualityTier: string; // 'standard' | 'refined' | 'masterwork' (defined in Phase 123)
  proficiencyXP: number;
  discipline: CraftingDiscipline;
};
'crafting:error': {
  code: string; // e.g., 'MISSING_INGREDIENTS', 'RECIPE_LOCKED', 'CRAFT_ACTIVE', 'WRONG_FACTION'
  message: string;
};
'crafting:nearby': { // broadcast to nearby players
  playerId: string;
  recipeId: string;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate proficiency tables per system | JSONB proficiency per domain (gathering/crafting) | Already in use | Consistent pattern, easy to query |
| Redis for short timers | In-memory Map + setTimeout | Already in use for gathering | Simpler, no external dependency for short-lived state |

**Deprecated/outdated:**
- None relevant — all patterns in use are current.

## Open Questions

1. **Proficiency Speed Curve Shape**
   - What we know: Max 50% reduction at max proficiency
   - What's unclear: Linear vs diminishing returns
   - Recommendation: Use diminishing returns (`speedMultiplier = 1 - 0.5 * (level / maxLevel)^0.7`) — feels more RPG-like, prevents low levels from feeling like they scale too fast

2. **Nearby Broadcast Radius**
   - What we know: Crafting activity should be visible to nearby players
   - What's unclear: "Nearby" definition
   - Recommendation: Use same visibility radius as chat:local (existing pattern) — approximately same zone chunk

3. **Ingredient Fate on Disconnect**
   - What we know: STATE.md says "consumed on craft start", CONTEXT.md gives Claude discretion
   - Recommendation: **Consumed, no refund.** Aligns with STATE.md decision, prevents exploit, and matches the "fire-and-forget" design. Player accepts the cost when clicking Craft.

## Sources

### Primary (HIGH confidence)
- Codebase: `apps/game-server/src/game/gathering.service.ts` — timer pattern, proficiency cache, disconnect cleanup
- Codebase: `apps/game-server/src/game/inventory.service.ts` — item add/remove/reduce patterns
- Codebase: `packages/database/src/schema/gathering-proficiency.ts` — JSONB proficiency schema pattern
- Codebase: `packages/shared-types/src/network/events.ts` — ClientEvents/ServerEvents interfaces
- Codebase: `packages/shared-types/src/game/faction.ts` — FactionId type, craftingModifier in FactionBonuses
- Codebase: `packages/items/src/types.ts` — ItemDefinition, ItemCategory
- Codebase: `packages/database/src/schema/characters.ts` — character factionId for faction gating
- Codebase: `apps/game-server/src/game/game.module.ts` — NestJS module provider registration
- Codebase: `apps/game-server/src/game/game.gateway.ts` — WebSocket handler patterns

### Secondary (MEDIUM confidence)
- STATE.md: "Ingredients consumed on craft start (not completion)" — design decision
- STATE.md: "Use recipe_unlocks join table (not JSONB) for unlock persistence"

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses only existing project dependencies
- Architecture: HIGH - Directly mirrors proven GatheringService patterns
- Pitfalls: HIGH - Based on actual codebase patterns and known exploit vectors

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable — internal codebase, no external dependency changes)
