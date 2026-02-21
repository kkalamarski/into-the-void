# Pitfalls Research

**Domain:** Adding Quest System to Multiplayer 2D Sci-Fi MMO
**Researched:** 2026-02-21
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Quest Reward Duplication via Race Conditions

**What goes wrong:**
Players exploit timing windows between quest completion check and reward distribution to claim rewards multiple times. In multiplayer environments, rapid-fire completion requests or party coordination can trigger reward duplication when the server doesn't atomically verify quest state.

**Why it happens:**
Quest completion logic splits verification ("is quest complete?") from reward distribution ("give rewards") into separate operations. Between these operations, another request can slip through before database state updates. This is especially common when:
- Quest completion uses read-then-write pattern instead of atomic updates
- Reward distribution happens before database commit
- Multiple party members trigger the same quest completion simultaneously

**How to avoid:**
Use database transactions with row-level locking or optimistic concurrency control:
```typescript
// BAD: Read-then-write (race condition window)
const quest = await getQuestProgress(playerId, questId);
if (quest.isComplete) {
  await giveRewards(playerId, rewards);
  await markQuestComplete(playerId, questId);
}

// GOOD: Atomic update with constraint
await db.transaction(async (tx) => {
  const result = await tx.update(questProgress)
    .set({ completed: true, completedAt: now() })
    .where(and(
      eq(questProgress.characterId, playerId),
      eq(questProgress.questId, questId),
      eq(questProgress.completed, false) // Only if not already complete
    ))
    .returning();

  if (result.length === 0) {
    throw new Error('Quest already completed or not found');
  }

  await giveRewards(tx, playerId, rewards);
});
```

**Warning signs:**
- Players receive duplicate reward items in inventory
- Credits increase by more than expected reward amount
- Database logs show multiple completion timestamps for same quest
- Integration tests without concurrent completion scenarios

**Phase to address:**
Phase 1 (Quest Definition & Database Schema) - Design quest_progress table with UNIQUE constraint on (character_id, quest_id, completed=true) to prevent duplicates at database level.

---

### Pitfall 2: Quest State Desync Between Client and Server

**What goes wrong:**
Client-side quest UI shows outdated progress (e.g., "Kill 3/5 creatures") while server has already registered 4/5. Player completes objectives that appear incomplete on their screen, or continues killing creatures past the required count. Leads to frustration ("I killed 10 but it only counted 3!") and exploits (client-side objective manipulation).

**Why it happens:**
Quest objective updates trigger multiple WebSocket events (entity:despawn, combat:result, inventory:update) but no dedicated quest:progress event. Client must infer quest progress from indirect signals:
- Entity despawn doesn't guarantee it counted toward quest (could be another player's kill, wrong creature type, player not in quest radius)
- Inventory pickup doesn't indicate if item satisfied quest objective
- No authoritative "quest state changed" broadcast

This is compounded by:
- Network latency between action and confirmation
- Event ordering issues (despawn arrives before kill credit)
- Partial party credit logic not communicated to client

**How to avoid:**
Implement dedicated quest:progress event emitted by server after every objective update:
```typescript
// Server-side after objective validation
this.server.to(player.socketId).emit('quest:progress', {
  questId: 'quest_mining_101',
  objectives: [
    { id: 'collect_iron', current: 5, required: 10, complete: false },
    { id: 'return_to_npc', current: 0, required: 1, complete: false }
  ],
  overallProgress: 0.5, // 50% complete
  canTurnIn: false
});
```

For party quests, broadcast to all party members. For zone-wide events, emit to all players in zone. Use sequence numbers to detect out-of-order events.

**Warning signs:**
- Players report "quest didn't count my kill"
- Client quest log shows different progress than /debug quest command
- Quest completion triggers before UI shows 100% progress
- No quest-specific events in client event handlers

**Phase to address:**
Phase 2 (Quest Tracking & Objective System) - Implement quest:progress event pattern when building objective tracking logic. Include in WebSocket event contract (shared-types).

---

### Pitfall 3: Quest Item Removal Timing Bugs

**What goes wrong:**
Quest items removed from inventory before quest actually completes, causing:
- Player turns in quest → items removed → server rejects completion (missing prerequisite) → items gone, quest incomplete
- Quest abandoned → quest items remain in inventory forever (can't be dropped, can't be deleted)
- Quest completes → item despawns as ground entity → player re-picks up → quest item duplicated

**Why it happens:**
Mismatch between quest lifecycle and inventory/entity lifecycle:
- Inventory.removeItem() called optimistically before quest validation
- Quest items not marked with special flags (isQuestItem, questId) in InventoryItemJson
- Entity despawn events processed independently of quest completion
- No rollback mechanism when quest completion fails mid-transaction

Example failure scenario:
```typescript
// Player has [Iron Ore x10], quest requires 5
await inventoryService.removeItem(playerId, 'iron_ore', 5); // Removed!
const canComplete = await questService.validateCompletion(playerId, questId);
if (!canComplete) {
  // Quest validation failed (e.g., not at NPC location)
  // Iron ore is GONE, quest still incomplete
  return { success: false, error: 'Must be near quest giver' };
}
```

**How to avoid:**
1. Add quest-specific metadata to InventoryItemJson:
```typescript
interface InventoryItemJson {
  instanceId: string;
  itemId: string;
  quantity: number;
  slot: number;
  properties: Record<string, unknown>;
  questId?: string; // Links item to quest
  isQuestItem?: boolean; // Prevents manual drop/deletion
}
```

2. Use database transactions for quest completion:
```typescript
await db.transaction(async (tx) => {
  // 1. Validate ALL prerequisites (location, items, objectives)
  const valid = await validateQuestCompletion(tx, playerId, questId);
  if (!valid) throw new Error('Validation failed');

  // 2. Remove quest items
  await removeQuestItems(tx, playerId, questId);

  // 3. Mark quest complete
  await completeQuest(tx, playerId, questId);

  // 4. Grant rewards
  await grantRewards(tx, playerId, questId);
  // Transaction commits only if all steps succeed
});
```

3. Prevent dropping quest items:
```typescript
// In handleItemDrop
const item = inventory.items.find(i => i.instanceId === instanceId);
if (item?.isQuestItem) {
  return { success: false, error: 'Quest items cannot be dropped' };
}
```

**Warning signs:**
- Player inventory missing items but quest shows incomplete
- Quest items appear in inventory after quest completion
- Quest can be turned in without required items
- No rollback tests for failed quest completion

**Phase to address:**
Phase 3 (Quest Rewards & Completion) - Add isQuestItem/questId metadata to item schema. Implement transactional completion logic. Add drop/delete guards.

---

### Pitfall 4: NPC Dialogue State Pollution from Quest System

**What goes wrong:**
Quest acceptance/completion mutates NPC dialogue state, causing:
- Player A accepts quest → NPC dialogue changes for all players (breaks immersion for Player B who hasn't reached that quest)
- NPC spawns with "quest complete" dialogue for players who haven't completed quest
- Dialogue options show "Turn in quest" when player hasn't started quest
- Multiple quests from same NPC create dialogue option explosion (20+ options)

**Why it happens:**
Quest system tightly couples to NPC dialogue definitions instead of using player-specific state filtering:
- NPC definition stores global dialogue array instead of conditional dialogue
- Server emits same npc:interact:response to all players
- Client doesn't filter dialogue options based on player quest state
- No dialogue condition evaluation ("show this line if quest active")

Current architecture sends NPC definition directly from registry:
```typescript
// apps/game-server/src/game/game.gateway.ts
const npcDef = NpcRegistry.get(entity.npcId);
client.emit('npc:interact:response', {
  displayName: npcDef.displayName,
  dialogue: [...npcDef.dialogue], // STATIC, same for all players
});
```

**How to avoid:**
1. Add conditional dialogue system to NPC definitions:
```typescript
interface DialogueLine {
  text: string;
  condition?: {
    type: 'quest_state' | 'quest_objective' | 'faction' | 'level';
    questId?: string;
    state?: 'not_started' | 'active' | 'ready' | 'complete';
    objectiveId?: string;
    faction?: FactionId;
    minLevel?: number;
  };
}
```

2. Filter dialogue server-side based on player state:
```typescript
async handleNpcInteract(client: Socket, data: { entityId: string }) {
  const player = this.playerService.getPlayerBySocket(client.id);
  const npcDef = NpcRegistry.get(entity.npcId);

  // Get player's quest states for this NPC's quests
  const questStates = await this.questService.getQuestStates(player.id, npcDef.questIds);

  // Filter dialogue based on conditions
  const availableDialogue = npcDef.dialogue.filter(line =>
    this.evaluateDialogueCondition(line.condition, player, questStates)
  );

  client.emit('npc:interact:response', {
    displayName: npcDef.displayName,
    dialogue: availableDialogue, // Player-specific
    availableQuests: questStates.filter(q => q.state === 'not_started'),
    activeQuests: questStates.filter(q => q.state === 'active'),
    readyQuests: questStates.filter(q => q.state === 'ready')
  });
}
```

3. Separate quest UI from dialogue UI (don't mix 20 quest options with NPC chat).

**Warning signs:**
- All players see same dialogue regardless of quest progress
- NPC dialogue includes hardcoded quest text instead of conditionals
- npc:interact:response doesn't include player quest states
- No dialogue condition evaluation logic in codebase

**Phase to address:**
Phase 4 (NPC Integration & Quest Givers) - Design conditional dialogue system. Implement server-side filtering. Update NPC interaction flow to include quest states.

---

### Pitfall 5: Party Quest Progress Sharing Inconsistencies

**What goes wrong:**
Party members experience inconsistent quest progress:
- Player A kills creature → only A gets credit, B standing next to them gets nothing
- Player B picks up quest item → entire party gets credit (duplication)
- Objective completion shows different progress for each party member
- Party disbands mid-quest → progress lost or stuck

**Why it happens:**
Quest objectives implemented without party-awareness:
- Combat system doesn't broadcast kill credit to party members in range
- Item pickup only updates picking player's quest state
- No "party" concept in current architecture (no party table, no party service)
- Zone-wide events credit everyone instead of just party

Current architecture has no party system (no references in shared-types, game.gateway, or database schema).

**How to avoid:**
1. Design party system first (prerequisite for shared quest progress):
```typescript
// packages/database/src/schema/parties.ts
export const parties = pgTable('parties', {
  id: uuid('id').primaryKey().defaultRandom(),
  leaderId: uuid('leader_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const partyMembers = pgTable('party_members', {
  partyId: uuid('party_id').references(() => parties.id),
  characterId: uuid('character_id').references(() => characters.id),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.partyId, table.characterId] })
}));
```

2. Implement party credit radius for objectives:
```typescript
// When player completes objective (kill, pickup, etc.)
const party = await this.partyService.getParty(playerId);
if (party) {
  // Get party members in same zone within radius
  const nearbyMembers = party.members.filter(m =>
    m.position.zoneId === player.position.zoneId &&
    manhattanDistance(m.position, player.position) <= PARTY_CREDIT_RADIUS
  );

  // Update quest progress for all nearby party members
  for (const member of nearbyMembers) {
    await this.questService.updateObjective(member.id, questId, objectiveId, +1);
  }
}
```

3. Define quest sharing modes in quest definitions:
```typescript
interface QuestDefinition {
  id: string;
  sharingMode: 'individual' | 'party_nearby' | 'party_anywhere';
  objectiveShareRadius?: number; // For 'party_nearby' mode
}
```

4. Handle party disband edge cases:
- Progress remains on individual characters (doesn't reset)
- Shared objectives convert to individual tracking
- Completion still possible solo after disband

**Warning signs:**
- No party service or party tables in codebase
- Quest progress updates don't check party membership
- Objective credit always individual or always shared (no radius)
- No tests for party disband during quest

**Phase to address:**
Phase 5 (Party Quest System) - Build party infrastructure first. Implement party-aware objective tracking. Define sharing modes per quest type.

---

### Pitfall 6: Quest Completion Validation Bypasses

**What goes wrong:**
Players complete quests without meeting requirements:
- Quest turned in remotely (not standing near NPC)
- Objectives marked complete client-side, server accepts without validation
- Required items not actually removed from inventory
- Prerequisite quests not checked on completion

**Why it happens:**
Trust client-reported quest state instead of server-authoritative validation:
```typescript
// BAD: Trusting client completion claim
@SubscribeMessage('quest:complete')
async handleQuestComplete(client: Socket, data: { questId: string }) {
  // No validation - just trust the client!
  await this.questService.completeQuest(playerId, data.questId);
  await this.grantRewards(playerId, data.questId);
}
```

Existing architecture shows server-authoritative patterns for inventory/combat but no quest validation yet:
- Inventory operations validate server-side (game.gateway.ts lines 391-456)
- Combat validates range, health, in-combat state (combat.service.ts)
- Movement validates zone boundaries (game.service.ts)

**How to avoid:**
Implement comprehensive server-side validation for all quest operations:

```typescript
@SubscribeMessage('quest:turnin')
async handleQuestTurnIn(client: Socket, data: { questId: string, npcEntityId: string }) {
  const player = this.playerService.getPlayerBySocket(client.id);

  // 1. Validate quest exists and is active
  const questState = await this.questService.getQuestState(player.id, data.questId);
  if (questState.state !== 'ready') {
    return { success: false, error: 'Quest not ready for turn-in' };
  }

  // 2. Validate player near quest turn-in NPC
  const npc = await this.entityService.getEntity(player.position.zoneId, data.npcEntityId);
  if (!npc || npc.type !== 'npc') {
    return { success: false, error: 'Invalid NPC' };
  }

  const distance = manhattanDistance(player.position, npc.position);
  if (distance > DEFAULT_INTERACTION_RANGE + 1.0) {
    return { success: false, error: 'Too far from quest giver' };
  }

  // 3. Validate ALL objectives complete server-side
  const allComplete = await this.questService.validateAllObjectives(player.id, data.questId);
  if (!allComplete) {
    return { success: false, error: 'Quest objectives not complete' };
  }

  // 4. Validate required items in inventory
  const hasItems = await this.questService.validateQuestItems(player.id, data.questId);
  if (!hasItems) {
    return { success: false, error: 'Missing required items' };
  }

  // 5. Validate prerequisites complete
  const prereqsComplete = await this.questService.validatePrerequisites(player.id, data.questId);
  if (!prereqsComplete) {
    return { success: false, error: 'Prerequisite quests not complete' };
  }

  // All validations passed - proceed with completion
  await this.questService.completeQuest(player.id, data.questId);
}
```

Never trust client for:
- Quest state (active, complete, ready)
- Objective progress counts
- Item possession for quest requirements
- NPC proximity for turn-in
- Prerequisite quest completion

**Warning signs:**
- Quest completion handlers lack validation steps
- Client events include objective counts instead of just actions
- No distance checks for NPC turn-in
- Quest completion logic doesn't verify prerequisite chains

**Phase to address:**
Phase 3 (Quest Rewards & Completion) - Implement validation checklist for turn-in. Never accept client-reported completion state. Validate server-side before distributing rewards.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store quest progress in memory only (no DB persistence) | Faster development, simpler code | Players lose progress on disconnect/crash; no cross-session quests | Never - players expect persistence |
| Use polling instead of event-driven objective updates | Simpler implementation (setInterval check) | Wasted server cycles; delayed UI updates; higher database load | Never - violates existing WebSocket event architecture |
| Single-player quest logic without party support | Avoid building party system | Cannot add multiplayer quests later without full rewrite | Only if roadmap guarantees no party quests (unlikely for MMO) |
| Client-side objective tracking with server sync on completion | Responsive UI, less network traffic | Client-server desync; cheating opportunities; trust issues | Never in server-authoritative architecture |
| Quest definitions in database instead of code | Non-developers can edit quests | Version control loss; harder testing; migration complexity | Only for user-generated content systems (not core quests) |
| Global quest progress (shared across all characters) | Faster queries (no character join) | Violates character isolation; alt character experience ruined | Never - character-specific progress is expected |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| NPC Registry → Quest System | Hardcode quest IDs in NPC dialogue, tightly couple dialogue to quest state | NPC definitions reference questIds array; dialogue conditions evaluate player quest state server-side |
| Inventory Service → Quest Items | Treat quest items like regular items (can drop, trade, sell) | Add `isQuestItem` flag; block drop/trade operations; auto-remove on quest complete/abandon |
| Combat System → Kill Objectives | Only track kills for attacking player | Broadcast kill credit to party members within radius; check quest objective subscriptions |
| Entity Service → Interaction Quests | Process interactions without quest context | Check if interaction satisfies quest objective; emit quest:progress on objective update |
| WebSocket Events → Quest Progress | Infer progress from indirect signals (entity despawn, combat result) | Dedicated quest:progress event with full objective state; emit after server validation |
| Database → Quest Progress Table | Store progress as single "completed" boolean | Granular objective tracking with current/required counts; support partial progress |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 query per objective check | Database query for each killed creature to check if it counts for quest | Batch objective checks; cache active quest requirements in memory | 10+ simultaneous players completing objectives |
| Full quest progress reload on every update | Database round-trip for each objective increment | Update in-memory state; batch DB writes every 30s or on milestone | 50+ concurrent quest actions/second |
| Broadcasting quest:progress to all zone players | Network spam for irrelevant quest updates | Emit quest:progress only to player (and party members) | 100+ players in same zone |
| Real-time dialogue condition evaluation for all NPCs | CPU spike when player enters zone with 20 NPCs | Evaluate dialogue conditions only on npc:interact, not on spawn/render | Zones with 50+ NPCs |
| Storing full quest definition in quest_progress table | Database bloat, slow queries on quest progress | Store only questId reference; join quest definitions from registry/separate table | 1000+ quests in game |
| Individual database write per objective update | Lock contention, slow quest progress | Buffer objective updates, write in transactions every 5-10 seconds | 200+ objectives updated/minute |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Client sends objective completion count | Player claims "killed 999 creatures" to complete quest instantly | Server increments objective count; client only sends action (killed creature X) |
| Quest rewards calculated client-side | Client modifies reward values to grant 1M credits instead of 100 | Server calculates rewards from quest definition; client receives results |
| No validation on quest turn-in location | Player completes quest remotely via packet manipulation | Validate player within interaction range of quest NPC before accepting turn-in |
| Quest IDs exposed as sequential integers | Attacker enumerates all quests, completes in bulk via API | Use UUIDs for quest instance IDs; validate quest accessibility (level, prerequisites) |
| Shared quest progress in party without authentication | Attacker joins party to leech quest completion rewards | Validate party membership server-side; credit only members who contributed |
| Quest state modification via inventory item properties | Player edits item JSON to include questId, bypasses item requirements | Validate quest items against quest definition; ignore client-provided questId |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Quest log shows all available quests for zone | Overwhelming list of 50+ quests; paralysis | Show 3-5 suggested quests based on level/faction; rest in "Available" tab |
| No visual indication which NPC has player's active quest | Players forget who gave them quest; wander aimlessly | Minimap icon for quest giver; highlight NPC if quest ready to turn in |
| Quest objectives don't show progress in real-time | Player kills 10 creatures, sees progress update at 5 | Emit quest:progress after every objective increment; immediate UI feedback |
| Abandoned quests disappear forever | Player accidentally abandons main story quest; can't recover | Allow re-accepting previously abandoned quests (unless intentionally hidden) |
| Party quest progress invisible to other members | Player B doesn't know Player A just completed objective | Show party members' quest progress in shared UI; emit party:quest:progress |
| Quest item clogging inventory with no way to remove | Player stuck with quest item from abandoned quest | Auto-remove quest items on abandon; or mark as deletable after abandon |
| No indication of quest difficulty/level | Low-level player accepts impossible quest, gets frustrated | Show recommended level range; gray out quests above player level + 5 |
| Multiple quests from same NPC flood dialogue UI | 15 quest options in single dialogue window | Group quests by category; multi-step dialogue flow (main > category > quest) |

## "Looks Done But Isn't" Checklist

- [ ] **Quest Completion:** Often missing prerequisite validation — verify server checks faction, level, prior quest completion before allowing acceptance
- [ ] **Objective Tracking:** Often missing partial progress persistence — verify database saves current count (not just complete/incomplete boolean)
- [ ] **Party Quests:** Often missing party disband handling — verify quest progress preserved for individuals after party dissolves
- [ ] **Quest Items:** Often missing drop/trade prevention — verify isQuestItem flag blocks inventory operations until quest complete/abandon
- [ ] **NPC Integration:** Often missing player-specific dialogue filtering — verify npc:interact:response includes player's quest states, not global NPC definition
- [ ] **Reward Distribution:** Often missing atomic completion transaction — verify rewards granted only if completion validation passes (no partial reward on error)
- [ ] **Cross-Zone Objectives:** Often missing zone transition tracking — verify objective progress saved when player changes zones mid-quest
- [ ] **Concurrent Completion:** Often missing race condition prevention — verify duplicate reward protection via database constraints or optimistic locking
- [ ] **Quest Abandonment:** Often missing cleanup logic — verify quest items removed, objectives reset, party members notified on abandon
- [ ] **WebSocket Reconnection:** Often missing quest state resync — verify client receives full quest progress on reconnect (not just zone state)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Reward Duplication Exploit | MEDIUM | 1. Add UNIQUE constraint to quest_progress table. 2. Audit database for duplicate completions (compare reward logs). 3. Manual correction of exploited accounts. 4. Patch atomic completion logic. |
| Quest State Desync | LOW | 1. Add quest:sync event to force client refresh. 2. Emit full quest state on reconnect. 3. Client compares server timestamp to local cache. |
| Quest Items Not Removed | MEDIUM | 1. Database migration to add questId/isQuestItem to inventory items. 2. Manual cleanup script to remove orphaned quest items. 3. Retroactive quest item flagging. |
| NPC Dialogue Pollution | HIGH | 1. Refactor NPC definitions to support conditional dialogue. 2. Migrate existing dialogue to conditional format. 3. Update all NPC interaction handlers to filter server-side. 4. Regression test all NPC interactions. |
| Party Progress Inconsistency | HIGH | 1. Build party service and database schema (foundational). 2. Refactor objective tracking to be party-aware. 3. Database migration to associate quest progress with party context. 4. Extensive testing of party scenarios. |
| Validation Bypass Exploit | HIGH | 1. Emergency patch to add turn-in validation. 2. Audit quest completions for suspicious patterns (completed without prerequisites). 3. Database rollback for exploited accounts. 4. Add server-side validation to all quest endpoints. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Quest Reward Duplication | Phase 1 (Database Schema) | UNIQUE constraint on quest_progress(character_id, quest_id) where completed=true; concurrent completion integration test |
| Quest State Desync | Phase 2 (Objective Tracking) | quest:progress event emitted in all objective handlers; client integration test verifies real-time updates |
| Quest Item Removal Timing | Phase 3 (Completion Logic) | isQuestItem flag implemented; transactional completion logic; rollback test on validation failure |
| NPC Dialogue Pollution | Phase 4 (NPC Integration) | Conditional dialogue system implemented; npc:interact:response includes player quest states; per-player dialogue filtering |
| Party Quest Inconsistency | Phase 5 (Party System) | Party service and tables exist; objective tracking checks party membership; radius-based credit working |
| Validation Bypass | Phase 3 (Completion Logic) | All turn-in validations present (NPC proximity, objectives, items, prerequisites); exploit attempt test fails |
| Performance: N+1 Objective Queries | Phase 2 (Objective Tracking) | Active quest cache in memory; batch objective validation; performance test with 50 concurrent objective updates |
| Performance: Zone Broadcast Spam | Phase 2 (Objective Tracking) | quest:progress emits only to player/party, not zone; network bandwidth test with 100 zone players |
| Security: Client Objective Claims | Phase 2 (Objective Tracking) | Server increments counts; client sends actions only; packet manipulation test rejected by server |
| Security: Remote Quest Turn-in | Phase 3 (Completion Logic) | NPC proximity validation required; distance check test passes |
| UX: Quest Progress Invisible | Phase 2 (Objective Tracking) | Real-time quest:progress events; UI updates immediately on objective increment |
| UX: Quest Item Inventory Clog | Phase 3 (Completion Logic) | Quest items auto-removed on abandon/complete; manual delete after abandon allowed |

## Sources

- [GDC: Learning From World of Warcraft's Quest Design Mistakes](https://www.gamedeveloper.com/game-platforms/gdc-learning-from-i-world-of-warcraft-i-s-quest-design-mistakes)
- [Implementing a Scalable Quest System](https://betterprogramming.pub/implementing-a-scalable-quest-system-7f36ea4cfe22)
- [MMO Architecture: Source of truth, Dataflows, I/O bottlenecks](https://news.ycombinator.com/item?id=37702632)
- [FTBQuests Multiplayer Reward Exploit](https://github.com/FTBTeam/FTB-Mods-Issues/issues/1089)
- [Tree of Savior Infinite Quest Rewards Exploit](https://forum.treeofsavior.com/t/exploit-infinite-quest-rewards-and-unrestricted-class-switching/123654)
- [Diablo IV Party Quest Progress Discussion](https://us.forums.blizzard.com/en/d4/t/do-parties-share-quest-progress/21102)
- [Enshrouded Shared Progression Issues](https://www.zleague.gg/theportal/enshrouded-the-shared-quest-progression-dilemma-explored/)
- [WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices)
- [Real-Time Web Apps in 2025: WebSockets, Server-Sent Events](https://www.debutinfotech.com/blog/real-time-web-apps)
- [Database Design: Using Composite Keys](https://www.endpointdev.com/blog/2021/05/database-design-using-composite-keys/)
- [Dialogue System for Unity: Quest Management](https://www.pixelcrushers.com/dialogue_system/manual/html/how_to_manage_quests.html)
- [Quest Item Deletion on Abandon Bug (WoW)](https://us.forums.blizzard.com/en/wow/t/abandoning-quests-deletes-quest-items/288893)

---
*Pitfalls research for: Quest System Integration*
*Researched: 2026-02-21*
