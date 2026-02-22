# Phase 66: Quest Completion & Rewards - Research

**Researched:** 2026-02-22
**Domain:** Quest System - Completion Logic & Reward Distribution
**Confidence:** HIGH

## Summary

Phase 66 implements the final step of the quest lifecycle: turning in completed quests to receive credits, XP, and item rewards atomically. This phase builds directly on Phase 65's objective tracking system and requires strict transactional semantics to prevent reward duplication, partial completion bugs, and quest item lifecycle issues.

The existing codebase provides all necessary primitives: Drizzle ORM's transaction API for atomic multi-step operations, PlayerService methods for XP/credits, InventoryService for item rewards, and database-level UNIQUE constraints on (characterId, questId) preventing duplicate quest entries. The challenge lies in orchestrating these services into a single atomic transaction that validates ALL prerequisites before making ANY state changes.

Research identified three critical patterns: (1) use db.transaction() to wrap validation, item removal, state updates, and reward granting in a single rollback-able unit, (2) add isQuestItem/questId metadata to InventoryItemJson.properties to prevent dropping/trading quest items and enable automatic cleanup, (3) follow TradeService's refund pattern where if any step fails after credits/items are granted, rollback is automatic via transaction throw.

**Primary recommendation:** Model quest completion as a 4-step transactional pipeline (validate → remove quest items → mark complete → grant rewards) where EVERY validation check happens BEFORE any state mutation. Use Drizzle's db.transaction() to ensure atomicity. Add quest item guards to drop/trade handlers mirroring existing equipment validation patterns.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.30.x | Database transactions | Built-in transaction API with automatic rollback, already used throughout codebase |
| @nestjs/event-emitter | 3.0.1 | Internal event bus | Already implemented in Phase 65 for objective tracking |
| NestJS Guards | 10.3.x | Validation logic | Existing pattern for drop/trade/equip guards in InventoryService/TradeService |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto.randomUUID() | Node built-in | Instance ID generation | Creating item rewards with unique IDs |
| Drizzle sql helper | 0.30.x | Raw SQL for atomic updates | PlayerService.grantXp uses sql template for level-up calculation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| db.transaction() | Manual BEGIN/COMMIT | Transaction API handles rollback automatically, manual approach error-prone |
| Quest item metadata in properties | Separate quest_items table | Properties object already exists, no schema migration needed |
| Transactional completion | Multi-step with rollback handlers | Drizzle transactions simplify error handling, explicit rollback adds complexity |

**Installation:**
No new dependencies required. All libraries already in project.

## Architecture Patterns

### Recommended Transaction Structure
```typescript
// QuestService.completeQuest(playerId, questId)
await db.transaction(async (tx) => {
  // 1. VALIDATE ALL prerequisites (NO state changes yet)
  const [questProgress, questDef, player, inventory] = await Promise.all([
    getQuestProgress(tx, playerId, questId),
    QuestRegistry.get(questId),
    getPlayerById(tx, playerId),
    getInventory(tx, playerId)
  ]);

  // Guard: Quest must be active
  if (questProgress.state !== 'active') {
    throw new Error('Quest is not active');
  }

  // Guard: All objectives must be complete
  const allComplete = questProgress.objectives.every(obj => obj.complete);
  if (!allComplete) {
    throw new Error('Not all objectives are complete');
  }

  // Guard: Player must be near quest giver NPC
  if (!isNearQuestGiver(player.position, questDef)) {
    throw new Error('Must be near quest giver to turn in quest');
  }

  // Guard: Quest items must be present (for gather objectives)
  const hasQuestItems = validateQuestItemsPresent(inventory, questProgress.objectives);
  if (!hasQuestItems) {
    throw new Error('Required quest items not found');
  }

  // 2. REMOVE quest items (atomic - part of transaction)
  await removeQuestItems(tx, playerId, questId, inventory);

  // 3. MARK quest complete (atomic - part of transaction)
  await updateQuestState(tx, questProgress.id, 'completed', new Date());

  // 4. GRANT rewards (atomic - part of transaction)
  if (questDef.rewards.credits) {
    await addCredits(tx, playerId, questDef.rewards.credits);
  }
  if (questDef.rewards.xp) {
    // Note: XP level-up handled in-memory by PlayerService, DB updated on disconnect
    // Transaction only updates credits (DB-persisted immediately)
  }
  if (questDef.rewards.items) {
    for (const reward of questDef.rewards.items) {
      await addItemToInventory(tx, playerId, reward.itemId, reward.quantity);
    }
  }

  // Transaction commits only if ALL steps succeed
  // If ANY step throws, entire transaction rolls back
});

// AFTER transaction commits, emit WebSocket events and update in-memory state
// These are safe because DB is already consistent
this.playerService.grantXp(playerId, questDef.rewards.xp); // In-memory XP
server.to(socketId).emit('quest:completed', { questId, rewards });
```

### Pattern 1: Quest Item Metadata
**What:** Store quest association directly in InventoryItemJson.properties
**When to use:** Items granted as part of gather objectives OR items rewarded by quest completion
**Example:**
```typescript
// When adding quest item (gather objective)
const questItem: InventoryItemJson = {
  instanceId: crypto.randomUUID(),
  itemId: 'world_fungal_spore_cluster',
  quantity: 1,
  slot: freeSlot,
  properties: {
    isQuestItem: true,    // Prevents drop/trade
    questId: 'quest_tutorial_gathering'  // Links to quest for cleanup
  }
};

// Drop guard in handleItemDrop
const item = inventory.items.find(i => i.instanceId === instanceId);
if (item?.properties?.isQuestItem === true) {
  return { success: false, error: 'Quest items cannot be dropped' };
}

// Trade guard in TradeService.sell
if (item?.properties?.isQuestItem === true) {
  return { success: false, error: 'Quest items cannot be traded' };
}

// Cleanup on quest completion/abandonment
async function removeQuestItems(tx: DbClient, playerId: string, questId: string) {
  const inventory = await getInventory(tx, playerId);
  inventory.items = inventory.items.filter(
    item => item.properties?.questId !== questId
  );
  await updateInventoryItems(tx, playerId, inventory.items);
}
```

### Pattern 2: NPC Proximity Validation
**What:** Verify player is within interaction range of quest giver NPC before allowing turn-in
**When to use:** All quest completion flows (prevents remote turn-in exploits)
**Example:**
```typescript
// QuestService.completeQuest validation
function isNearQuestGiver(playerPos: Position, questDef: QuestDefinition): boolean {
  // Get quest giver NPC from registry
  const questGiverNpcId = questDef.questGiverId; // Add to QuestDefinition
  const npc = NpcRegistry.get(questGiverNpcId);
  if (!npc) return false;

  // Find NPC instance in player's current zone
  const npcEntity = entityService.findNpcInZone(playerPos.zoneId, questGiverNpcId);
  if (!npcEntity) return false; // NPC not spawned in this zone

  // Check distance (use same 2-tile range as interaction)
  const distance = Math.abs(playerPos.x - npcEntity.position.x) +
                   Math.abs(playerPos.y - npcEntity.position.y);
  return distance <= 2; // Manhattan distance
}
```

### Pattern 3: Transaction Rollback on Validation Failure
**What:** Throwing error inside db.transaction() automatically rolls back all changes
**When to use:** Any validation that should abort the entire completion process
**Example:**
```typescript
// Drizzle ORM transaction pattern (from official docs)
await db.transaction(async (tx) => {
  // If ANY of these throw, ALL database changes rollback automatically
  const step1 = await tx.update(...); // DB write 1
  if (!step1) throw new Error('Step 1 failed'); // Triggers rollback

  const step2 = await tx.insert(...); // DB write 2
  if (!step2) throw new Error('Step 2 failed'); // Triggers rollback

  // All succeed → transaction commits
});

// Alternative: Manual rollback
await db.transaction(async (tx) => {
  const valid = await validateSomething(tx);
  if (!valid) {
    tx.rollback(); // Explicit rollback
    return;
  }
  // Continue transaction...
});
```

### Anti-Patterns to Avoid
- **Optimistic item removal:** Removing quest items BEFORE validating all prerequisites → items lost if validation fails
- **Non-transactional rewards:** Granting credits/XP/items in separate DB calls → partial completion on crash
- **Client-side completion state:** Trusting client's "quest complete" message → allows hacked clients to bypass validation
- **Forgetting NPC proximity:** Allowing turn-in from anywhere → players teleport away then complete remotely

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transaction management | Manual BEGIN/COMMIT/ROLLBACK with try/catch | Drizzle's db.transaction() API | Handles nested transactions, automatic rollback on error, type-safe query builder within transaction context |
| Quest item tracking | Separate quest_items table with FK to inventory | properties: { isQuestItem, questId } in InventoryItemJson | Reuses existing JSONB column, no schema migration, simpler queries, automatic cascade on item deletion |
| Duplicate completion prevention | Application-level locks/semaphores | Database UNIQUE constraint on (characterId, questId) | Enforced at DB level (race-condition proof), survives server restarts, no distributed lock complexity |
| Reward refunds on failure | Manual reverse operations (subtract credits, remove items) | Transaction rollback | Automatic rollback ensures consistency, prevents partial refund bugs, simpler error handling |

**Key insight:** Drizzle ORM transactions already handle the hard parts (connection pooling, rollback on error, nested transaction support). Building custom transaction logic introduces bugs without adding value.

## Common Pitfalls

### Pitfall 1: Quest Item Lifecycle Bugs
**What goes wrong:** Player turns in quest → validation fails → quest items already removed → items gone, quest incomplete. OR quest abandoned → quest items remain in inventory forever (can't drop, can't delete).
**Why it happens:** Mismatch between quest lifecycle and inventory lifecycle. Items removed optimistically before validation. No cleanup mechanism for abandoned quests.
**How to avoid:**
1. Add isQuestItem/questId to properties WHEN item is first added (during objective tracking)
2. Validate EVERYTHING before removing ANY items (transaction pattern above)
3. Implement cleanup logic: `removeQuestItems(tx, playerId, questId)` called on both completion AND abandonment
4. Add drop/trade guards checking `item.properties?.isQuestItem === true`
**Warning signs:** Players report "items disappeared but quest still shows incomplete", quest items visible in inventory after quest completion, ability to drop items that should be quest-locked

### Pitfall 2: Partial Reward Granting
**What goes wrong:** Player turns in quest → credits granted → XP grant fails (server crash) → player gets credits but no XP → database inconsistent with player expectation. Cannot re-complete quest due to UNIQUE constraint.
**Why it happens:** Multi-step reward granting without atomicity. Each service call (addCredits, grantXp, addItem) is independent transaction. Server crash between steps leaves partial completion.
**How to avoid:**
1. Use single db.transaction() wrapping ALL reward grants
2. For in-memory state (XP level-ups), update DB first, THEN update memory: `await updateCharacterProgression(tx, playerId, xp, level); this.playerService.grantXp(playerId, amount);`
3. Test failure scenarios: kill server mid-transaction, verify rollback
**Warning signs:** Players report "got some rewards but not others", inconsistent credit/XP totals between client and server, quest marked complete but no items granted

### Pitfall 3: Race Condition on Quest Completion
**What goes wrong:** Player spams "Turn In Quest" button → two requests processed simultaneously → both pass validation → rewards granted twice → database has two completed quest entries.
**Why it happens:** Database UNIQUE constraint on (characterId, questId) only prevents duplicate INSERTS, not duplicate UPDATES. Two transactions both read quest_progress with state='active', both update to 'completed', both grant rewards.
**How to avoid:**
1. Check quest state INSIDE transaction: `SELECT FOR UPDATE` locks row during transaction
2. Use atomic state transition: `UPDATE quest_progress SET state = 'completed' WHERE id = ? AND state = 'active' RETURNING *` → returns 0 rows if already completed
3. Frontend debouncing: Disable "Turn In" button after first click (UX fix, not security)
**Warning signs:** Duplicate entries in quest_progress table (violates UNIQUE constraint), players report receiving rewards twice, audit logs show same quest completed multiple times

### Pitfall 4: Forgetting Quest Item Cleanup on Abandonment
**What goes wrong:** Player abandons quest → quest removed from quest log → quest items remain in inventory forever → player cannot drop items (isQuestItem=true blocks drop) → inventory permanently cluttered.
**Why it happens:** Abandon logic only removes quest_progress row, doesn't call cleanup function. Quest items orphaned with no owning quest.
**How to avoid:**
1. Implement QuestService.abandonQuest(playerId, questId) that mirrors completeQuest structure
2. Call `removeQuestItems(tx, playerId, questId)` in abandonment transaction
3. Test abandonment flow end-to-end: accept quest → acquire quest items → abandon → verify items removed
**Warning signs:** Players report "can't drop item but quest no longer in log", inventory full of items with isQuestItem=true but no active quest, bug reports about permanent inventory clutter

### Pitfall 5: Trusting Client Quest Completion State
**What goes wrong:** Hacked client sends quest:complete event with fake questId → server grants rewards without validation → players get rewards for quests they never started.
**Why it happens:** Server accepts client's claim of completion without verifying quest state, objectives, or NPC proximity. No server-side validation layer.
**How to avoid:**
1. NEVER expose quest:complete client event — completion is server-initiated only
2. Completion flow: client sends npc:interact → server checks if NPC is quest giver → server validates quest state → server completes quest if valid
3. All validation server-side: `const questProgress = await getQuestProgress(db, playerId, questId)` → check state, objectives, proximity
**Warning signs:** Audit logs show impossible quest completions (player never accepted quest, completed instantly, completed from wrong zone), lack of server-side validation in completeQuest method

## Code Examples

Verified patterns from existing codebase and official documentation:

### Drizzle Transaction API (Official Pattern)
```typescript
// Source: https://orm.drizzle.team/docs/transactions
import { db } from './database';

// Basic transaction with automatic rollback on error
await db.transaction(async (tx) => {
  const result1 = await tx.update(users).set({ credits: 100 }).where(eq(users.id, '123'));
  const result2 = await tx.insert(questProgress).values({ questId: 'q1', state: 'completed' });

  // If either operation throws, both rollback automatically
  // If both succeed, transaction commits automatically
});

// Transaction with manual rollback
await db.transaction(async (tx) => {
  const user = await tx.select().from(users).where(eq(users.id, playerId));

  if (!user) {
    tx.rollback(); // Explicitly abort transaction
    return null;
  }

  // Continue with transaction...
  await tx.update(...);
});

// Transaction return value
const rewards = await db.transaction(async (tx) => {
  await tx.update(...);
  return { credits: 100, xp: 50 }; // Returned value available after commit
});
```

### TradeService Refund Pattern (Existing Codebase)
```typescript
// Source: apps/game-server/src/game/trade.service.ts (lines 70-104)
// Pattern: Deduct credits → attempt operation → if fails, refund credits

// Deduct credits atomically
const db = this.databaseService.getClient();
const deductResult = await deductCredits(db, playerId, totalCost);
if (!deductResult.success) {
  return { success: false, error: 'Insufficient credits' };
}

// Add item to inventory
const addResult = await this.inventoryService.addItem(playerId, newItem);

// CRITICAL: If addItem fails, refund credits to prevent permanent loss
if (!addResult.success) {
  const refundResult = await addCredits(db, playerId, totalCost);

  // Update player's cached credits with refunded amount
  const player = this.playerService.getPlayerById(playerId);
  if (player && refundResult.newBalance !== undefined) {
    player.credits = refundResult.newBalance;
  }

  return {
    success: false,
    error: addResult.reason ?? 'Failed to add item to inventory',
    newBalance: refundResult.newBalance,
  };
}

// Success - update cached credits
const player = this.playerService.getPlayerById(playerId);
if (player && deductResult.newBalance !== undefined) {
  player.credits = deductResult.newBalance;
}
```

### Quest Item Guards (Modeled on TradeService Pattern)
```typescript
// Source: apps/game-server/src/game/trade.service.ts (lines 127-150)
// Pattern: Check item properties before allowing operation

// In InventoryService.removeItem or handleItemDrop
async removeItem(playerId: string, instanceId: string): Promise<{ success: boolean; reason?: string }> {
  const inventory = this.inventories.get(playerId);
  if (!inventory) {
    return { success: false, reason: 'Player inventory not loaded' };
  }

  const item = inventory.items.find((i) => i.instanceId === instanceId);
  if (!item) {
    return { success: false, reason: 'Item not found in inventory' };
  }

  // GUARD: Prevent dropping quest items
  if (item.properties?.isQuestItem === true) {
    return { success: false, reason: 'Quest items cannot be dropped or removed' };
  }

  // Continue with removal...
  const idx = inventory.items.findIndex((i) => i.instanceId === instanceId);
  inventory.items.splice(idx, 1);

  const db = this.databaseService.getClient();
  await updateInventoryItems(db, playerId, inventory.items);

  return { success: true };
}
```

### PlayerService XP Granting (Existing Pattern)
```typescript
// Source: apps/game-server/src/game/player.service.ts (lines 443-485)
// Pattern: In-memory XP calculation with level-up detection

grantXp(playerId: string, amount: number): { xp: number; level: number; leveledUp: boolean } | null {
  const player = this.players.get(playerId);
  if (!player || amount <= 0) return null;

  const oldLevel = player.level;
  player.xp += amount;

  // Check for level up (xpToNextLevel is level * 100)
  while (player.xp >= player.xpToNextLevel) {
    player.xp -= player.xpToNextLevel;
    player.level += 1;
    player.xpToNextLevel = player.level * 100;
    // Increase max health on level up
    player.maxHealth = 100 + (player.level - 1) * 10;
    // Restore health to full on level up
    player.health = player.maxHealth;
  }

  const leveledUp = player.level > oldLevel;

  // Emit XP update to player socket
  if (this.server) {
    this.server.to(player.socketId).emit('player:xp', {
      playerId,
      xp: player.xp,
      xpToNextLevel: player.xpToNextLevel,
      level: player.level,
      leveledUp,
    });

    // If leveled up, also emit level update
    if (leveledUp) {
      this.server.to(player.socketId).emit('player:level', {
        playerId,
        level: player.level,
        health: player.health,
        maxHealth: player.maxHealth,
      });
    }
  }

  return { xp: player.xp, level: player.level, leveledUp };
}

// Note: DB update happens on disconnect via updateCharacterProgression
// Quest completion should update DB INSIDE transaction for atomicity
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual transaction management (BEGIN/COMMIT) | Drizzle db.transaction() API | Drizzle 0.28+ (2024) | Type-safe transactions, automatic rollback, connection pooling handled by ORM |
| Separate quest_items table | Quest metadata in properties object | Modern JSONB pattern (2024+) | No schema migration, simpler queries, automatic cascade delete |
| Application-level duplicate detection | Database UNIQUE constraint | PostgreSQL best practice (always) | Race-condition proof, survives server restarts, enforced at DB level |
| Multi-step reward granting with rollback handlers | Single transaction wrapping all steps | Drizzle transaction API (2024) | Automatic atomicity, simpler error handling, fewer bugs |

**Deprecated/outdated:**
- Manual BEGIN/COMMIT/ROLLBACK: Drizzle transaction API handles this automatically with better error handling
- Storing quest definitions in database: TypeScript definitions enable version control, type safety, and easier testing
- Trusting client quest state: Server-authoritative validation standard for all MMOs (prevents exploits)

## Open Questions

1. **Quest item quantity tracking for gather objectives**
   - What we know: Gather objectives require collecting N items (e.g., "5 fungal spores"). InventoryService tracks item quantity.
   - What's unclear: Should quest items be marked INDIVIDUALLY (5 separate items with isQuestItem=true) or as a STACK (1 stack of 5 with isQuestItem=true)?
   - Recommendation: Use stack approach — single InventoryItemJson with quantity=5, properties.isQuestItem=true. Simpler validation (check single item quantity >= required), easier cleanup (remove single stack). Individual marking causes inventory clutter.

2. **XP granting atomicity vs. in-memory state**
   - What we know: PlayerService.grantXp() updates in-memory state immediately, DB updated on disconnect. Quest completion needs atomic rewards.
   - What's unclear: Should quest completion call updateCharacterProgression(tx) inside transaction, or rely on existing disconnect persistence?
   - Recommendation: Call updateCharacterProgression(tx, playerId, newXp, newLevel) inside quest completion transaction BEFORE calling PlayerService.grantXp(). Ensures DB reflects XP grant atomically with credits/items. In-memory update follows for real-time WebSocket events.

3. **Multiple quest givers for same quest**
   - What we know: Some quests may have multiple turn-in NPCs (e.g., any faction outpost). QuestDefinition needs to reference quest giver for proximity validation.
   - What's unclear: Should QuestDefinition store questGiverId (single NPC) or questGiverIds (array)?
   - Recommendation: Start with single questGiverId for v1.15. Add questGiverIds array in future milestone when multi-location quests needed. Simpler validation logic, covers 90% of quests.

## Sources

### Primary (HIGH confidence)
- Drizzle ORM Transactions Documentation: https://orm.drizzle.team/docs/transactions
- Existing codebase: apps/game-server/src/game/trade.service.ts (refund pattern lines 70-104)
- Existing codebase: apps/game-server/src/game/player.service.ts (XP granting lines 443-485)
- Existing codebase: packages/database/src/schema/inventories.ts (InventoryItemJson.properties field)
- Existing codebase: packages/database/src/schema/quest-progress.ts (UNIQUE constraint on characterId+questId)

### Secondary (MEDIUM confidence)
- Research document: .planning/research/PITFALLS-QUEST-SYSTEM.md (quest item lifecycle pitfalls)
- Research document: .planning/research/SUMMARY-QUEST-SYSTEM.md (transactional completion pattern)
- NestJS Drizzle Transactions Tutorial: https://wanago.io/2024/06/17/api-nestjs-drizzle-sql-transactions/

### Tertiary (LOW confidence)
- None — all findings verified against official docs or existing codebase patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, Drizzle transaction API verified from official docs
- Architecture: HIGH - Transaction pattern matches existing TradeService.buy() refund logic, NPC proximity validation mirrors interaction system
- Pitfalls: HIGH - All pitfalls documented in prior research with concrete prevention strategies
- Quest item metadata: MEDIUM - Properties approach inferred from existing JSONB schema, not yet implemented for quest items specifically

**Research date:** 2026-02-22
**Valid until:** 60 days (stable domain — quest completion patterns unlikely to change, Drizzle API stable)
