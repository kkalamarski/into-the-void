# Architecture Integration Research

**Domain:** Gathering, Exploration, and Combat Balancing Systems
**Researched:** 2026-02-23
**Confidence:** HIGH

## Integration Overview

New features integrate into existing three-tier architecture (client, game-server, shared logic). Each system follows established patterns: Zustand stores for client state, NestJS services for server logic, Socket.IO events for communication, and shared-types for contracts.

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEB CLIENT (apps/web)                         │
├─────────────────────────────────────────────────────────────────┤
│  STORES (Zustand)                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │explorationSto│ │gatheringStore│ │combatStore   │             │
│  │re (NEW)      │ │(NEW)         │ │(MODIFY)      │             │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
│         │                │                │                      │
│  PHASER SCENES                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ WorldScene (MODIFY)                                       │   │
│  │  ├─ FogOfWarManager (NEW)                                │   │
│  │  ├─ GatheringMiniGameOverlay (NEW)                       │   │
│  │  └─ POIRenderer (NEW)                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                │                │                      │
├─────────┴────────────────┴────────────────┴──────────────────────┤
│                     WEBSOCKET (Socket.IO)                        │
├─────────────────────────────────────────────────────────────────┤
│                 GAME SERVER (apps/game-server)                   │
├─────────────────────────────────────────────────────────────────┤
│  SERVICES (NestJS)                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ExplorationSvc│ │GatheringSvc  │ │CombatService │             │
│  │(NEW)         │ │(NEW)         │ │(MODIFY)      │             │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
│         │                │                │                      │
├─────────┴────────────────┴────────────────┴──────────────────────┤
│               DATABASE (packages/database)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │exploration   │ │gathering_    │ │combat_       │             │
│  │(NEW)         │ │stats (NEW)   │ │balancing     │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Component Integration Map

### NEW Components

| Component | Location | Purpose | Integrates With |
|-----------|----------|---------|-----------------|
| **explorationStore** | `apps/web/src/store/` | Fog of war state, POI discovery, zone mastery | gameStore, localStorage |
| **gatheringStore** | `apps/web/src/store/` | Mini-game state, resource yields | inventoryStore, entityStore |
| **FogOfWarManager** | `apps/web/src/game/systems/` | Render fog overlay, persist revealed tiles | WorldScene, explorationStore |
| **GatheringMiniGameOverlay** | `apps/web/src/game/ui/` | Timing-based skill check UI | WorldScene, gatheringStore |
| **POIRenderer** | `apps/web/src/game/rendering/` | Render undiscovered POI icons | WorldScene, EntityRenderer |
| **ExplorationService** | `apps/game-server/src/game/` | Track POI discovery, zone mastery | ZonesService, QuestService |
| **GatheringService** | `apps/game-server/src/game/` | Validate mini-game, calculate yields | EntityService, InventoryService |

### MODIFIED Components

| Component | Location | Modifications | Reason |
|-----------|----------|---------------|--------|
| **CombatService** | `apps/game-server/src/game/` | Add difficulty scaling based on level gap | Combat balancing requirements |
| **EntityService** | `apps/game-server/src/game/` | Trigger mini-game flow for gathering | Gathering system integration |
| **gameStore** | `apps/web/src/store/` | Add mini-game UI toggle state | UI orchestration |
| **WorldScene** | `apps/web/src/game/scenes/` | Integrate FogOfWar, GatheringOverlay, POIRenderer | Rendering coordination |
| **shared-types** | `packages/shared-types/src/` | Add exploration, gathering, POI types | Type contracts |

## Data Flow Patterns

### Gathering Mini-Game Flow

```
Player clicks resource entity
    ↓
[WorldScene] → entity:interact → [EntityService]
    ↓                                   ↓
[detects gathering resource]    [checks tool + range]
    ↓                                   ↓
[shows mini-game overlay] ← gathering:start ← [GatheringService]
    ↓
[player completes timing] → gathering:complete → [GatheringService]
    ↓                                               ↓
[validates timing window]                   [rolls loot table]
    ↓                                               ↓
[awards bonus/penalty] ← gathering:result ← [updates inventory]
    ↓
[hides overlay, updates entityStore]
```

**Key Integration Points:**
1. **EntityService.handleToolUse()** - Insert mini-game check before loot roll
2. **GatheringService** - NEW service validates client timing, calculates yield multiplier
3. **gatheringStore** - Tracks mini-game state (active, startTime, difficulty)
4. **Socket Events:** `gathering:start`, `gathering:complete`, `gathering:result`

### Fog of War Flow

```
Player moves to new tile
    ↓
[MovementController] → player:moved → [PlayerService]
    ↓                                      ↓
[updates local position]           [broadcasts to zone]
    ↓
[FogOfWarManager.revealTile(x, y)]
    ↓
[updates explorationStore.revealedTiles]
    ↓
[persists to localStorage per characterId]
    ↓
[checks for POI discovery] → exploration:poi_discovered → [ExplorationService]
    ↓                                                           ↓
[adds to explorationStore.discoveredPOIs]              [awards lore entry]
```

**Key Integration Points:**
1. **MovementController** - Hook into position updates to call FogOfWarManager
2. **FogOfWarManager** - NEW system maintains revealed tile bitmap, renders overlay
3. **explorationStore** - Persists fog state per character using localStorage
4. **localStorage key:** `fog-of-war:${characterId}` (bitset array for efficiency)
5. **POI Discovery:** Check revealed tiles against zone's POI positions

### Zone Mastery Flow

```
Player discovers POI / kills creature / gathers resource
    ↓
[ExplorationService.incrementActivity(characterId, zoneId, activityType)]
    ↓
[updates exploration table: poi_count, kills, resources]
    ↓
[calculates mastery percentage]
    ↓
[if threshold reached] → exploration:mastery_tier → [client]
    ↓
[explorationStore.updateZoneMastery(zoneId, tier)]
    ↓
[shows tier-up notification in UI]
```

**Key Integration Points:**
1. **QuestService.handleEntityKilled** - Call ExplorationService.incrementActivity
2. **GatheringService** - Call ExplorationService.incrementActivity on gather
3. **ExplorationService** - NEW service tracks per-zone activity counters
4. **Database:** `exploration` table with characterId, zoneId, activity counts
5. **Socket Event:** `exploration:mastery_tier` with tier level (1-5)

### Combat Balancing Flow

```
Player attacks creature with level gap > 5
    ↓
[CombatService.handlePlayerAttack()]
    ↓
[calculates level gap = creature.level - player.level]
    ↓
[if gap > 5] → difficultyMultiplier = 1.0 + (gap * 0.15)
    ↓
[applies to creature damage: baseDamage * multiplier]
    ↓
[existing damage flow continues with scaled values]
```

**Key Integration Points:**
1. **CombatService.handlePlayerAttack()** - Add level-gap scaling before damage calculation
2. **calculateDamage()** in game-logic - Pass difficulty multiplier parameter
3. **No new stores/services** - Pure modification of existing combat logic
4. **Creature AI:** Add retreat behavior when health < 20% (AiService modification)

## Architectural Patterns

### Pattern 1: Client-Side Mini-Game with Server Validation

**What:** Client renders interactive timing challenge, server validates result independently.

**Why:** Low latency for responsive gameplay while preventing timing manipulation.

**Implementation:**
```typescript
// Client (gatheringStore)
startMiniGame(difficulty: number) {
  this.state = 'active';
  this.startTime = performance.now();
  this.targetWindow = [1000, 1500]; // ms range
}

submitTiming(clickTime: number) {
  const elapsed = clickTime - this.startTime;
  gameSocket.emit('gathering:complete', { elapsed });
}

// Server (GatheringService)
validateTiming(elapsed: number, difficulty: number): number {
  const [minMs, maxMs] = getTargetWindow(difficulty);
  if (elapsed >= minMs && elapsed <= maxMs) {
    const precision = 1 - Math.abs(elapsed - (minMs + maxMs) / 2) / (maxMs - minMs);
    return 1.0 + precision * 0.5; // 1.0x to 1.5x yield
  }
  return 0.5; // penalty for failure
}
```

**Trade-offs:**
- Pro: Responsive feedback, prevents cheating
- Con: Network latency affects difficulty calibration (mitigate: use server timestamp validation)

### Pattern 2: Persistent Client-Side Map with Server Authority

**What:** Client maintains fog of war state locally, server owns POI definitions and discovery validation.

**Why:** Reduces network traffic (no per-tile reveals), enables instant rendering, server validates discoveries.

**Implementation:**
```typescript
// Client (FogOfWarManager)
class FogOfWarManager {
  private revealedTiles: Set<string>; // "x,y" keys

  constructor(characterId: string) {
    this.revealedTiles = this.loadFromStorage(characterId);
  }

  revealTile(x: number, y: number, zoneId: string) {
    const key = `${zoneId}:${x},${y}`;
    if (!this.revealedTiles.has(key)) {
      this.revealedTiles.add(key);
      this.saveToStorage();
      this.checkPOIDiscovery(x, y, zoneId); // emit to server
    }
  }

  private loadFromStorage(characterId: string): Set<string> {
    const data = localStorage.getItem(`fog-of-war:${characterId}`);
    return data ? new Set(JSON.parse(data)) : new Set();
  }
}

// Server (ExplorationService)
async validatePOIDiscovery(characterId: string, x: number, y: number, zoneId: string) {
  const poi = await this.getPOIAtPosition(x, y, zoneId);
  if (poi && !await this.hasDiscovered(characterId, poi.id)) {
    await this.recordDiscovery(characterId, poi.id);
    return poi; // emit back to client with lore data
  }
  return null;
}
```

**Trade-offs:**
- Pro: Instant fog reveal, persists across sessions, low bandwidth
- Con: Client storage per character (~1MB for 100k revealed tiles), potential desync (mitigate: version flag in localStorage)

### Pattern 3: Event-Driven Zone Mastery Tracking

**What:** Domain events (entity.killed, item.collected, poi.discovered) trigger mastery updates via existing event system.

**Why:** Reuses QuestService event pattern, decouples mastery from individual actions.

**Implementation:**
```typescript
// Server (ExplorationService)
@OnEvent('entity.killed')
async handleEntityKilled(payload: EntityKilledPayload) {
  await this.incrementMasteryCounter(
    payload.characterId,
    payload.zoneId,
    'kills'
  );
  this.checkMasteryTier(payload.characterId, payload.zoneId);
}

@OnEvent('item.collected')
async handleItemCollected(payload: ItemCollectedPayload) {
  await this.incrementMasteryCounter(
    payload.characterId,
    payload.zoneId,
    'resources'
  );
  this.checkMasteryTier(payload.characterId, payload.zoneId);
}

private async checkMasteryTier(characterId: string, zoneId: string) {
  const progress = await this.getMasteryProgress(characterId, zoneId);
  const tier = this.calculateTier(progress); // 0-5 based on thresholds
  if (tier > progress.currentTier) {
    await this.updateTier(characterId, zoneId, tier);
    this.emitTierUp(characterId, zoneId, tier);
  }
}
```

**Trade-offs:**
- Pro: Consistent with existing QuestService pattern, easy to add new mastery triggers
- Con: Additional database writes per action (mitigate: batch updates with 5s debounce)

## Database Schema Extensions

### New Tables

```typescript
// packages/database/src/schema/exploration.ts
export const exploration = pgTable('exploration', {
  id: serial('id').primaryKey(),
  characterId: integer('character_id').notNull().references(() => characters.id),
  zoneId: varchar('zone_id', { length: 50 }).notNull(),
  revealedTiles: integer('revealed_tiles').default(0), // count for statistics
  discoveredPOIs: jsonb('discovered_pois').$type<string[]>().default([]),
  masteryTier: integer('mastery_tier').default(0), // 0-5
  kills: integer('kills').default(0),
  resourcesGathered: integer('resources_gathered').default(0),
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Composite index for efficient lookups
export const explorationIndex = uniqueIndex('exploration_character_zone_idx')
  .on(exploration.characterId, exploration.zoneId);
```

```typescript
// packages/database/src/schema/gathering-stats.ts
export const gatheringStats = pgTable('gathering_stats', {
  id: serial('id').primaryKey(),
  characterId: integer('character_id').notNull().references(() => characters.id),
  resourceType: varchar('resource_type', { length: 50 }).notNull(), // mineral/plant
  totalGathers: integer('total_gathers').default(0),
  perfectGathers: integer('perfect_gathers').default(0), // mini-game success
  averageYield: real('average_yield').default(1.0), // multiplier average
  lastGatherAt: timestamp('last_gather_at'),
});
```

### Modified Tables

```typescript
// packages/database/src/schema/characters.ts (ADD)
// Add to existing characters table
combatDifficultyPreference: varchar('combat_difficulty_preference', { length: 20 })
  .default('normal'); // 'easy', 'normal', 'hard'
```

## New Socket Events

### Client → Server

| Event | Payload | Purpose |
|-------|---------|---------|
| `gathering:complete` | `{ elapsed: number }` | Submit mini-game timing result |
| `exploration:reveal_tiles` | `{ tiles: Array<{x,y}> }` | Batch reveal multiple tiles (zone transition) |
| `exploration:poi_discovered` | `{ x: number, y: number, zoneId: string }` | Validate POI discovery |

### Server → Client

| Event | Payload | Purpose |
|-------|---------|---------|
| `gathering:start` | `{ difficulty: number, targetWindow: [number, number] }` | Initiate mini-game with parameters |
| `gathering:result` | `{ success: boolean, multiplier: number, items: ItemDrop[] }` | Award resources with yield multiplier |
| `exploration:poi_data` | `{ poi: POI, loreEntry: string }` | Send POI details and lore on discovery |
| `exploration:mastery_tier` | `{ zoneId: string, tier: number, rewards: Reward[] }` | Notify tier-up with rewards |
| `combat:difficulty_scaled` | `{ multiplier: number }` | Debug event showing applied difficulty |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current architecture sufficient. Fog of war in localStorage, mastery counters in PostgreSQL. |
| 1k-10k users | Add Redis cache for zone mastery counters (reduce DB writes). Batch fog reveals on zone transition. |
| 10k+ users | Consider separate exploration microservice, use Redis for real-time counters, PostgreSQL for persistence. |

### Bottleneck Analysis

1. **First bottleneck (5k users):** Fog of war localStorage size (100k tiles = 1MB per character)
   - **Mitigation:** Use bitset encoding (8 tiles per byte) → 12.5KB per character
   - **Implementation:** `FogOfWarManager` uses Uint8Array, bit manipulation for get/set

2. **Second bottleneck (10k users):** Zone mastery database writes (every kill/gather)
   - **Mitigation:** In-memory counter batching with 5-second flush interval
   - **Implementation:** `ExplorationService` maintains Map<characterId_zoneId, counters>, periodic batch update

## Build Order Recommendations

### Phase 1: Fog of War Foundation
**Why first:** Zero dependencies, enables other exploration features, pure client-side.

1. Create `explorationStore` with revealed tiles Set
2. Implement `FogOfWarManager` with localStorage persistence
3. Hook into `MovementController` position updates
4. Add fog overlay rendering to `WorldScene`

**Success Criteria:** Player sees fog, moves reveal tiles, fog persists across sessions.

### Phase 2: POI Discovery System
**Why second:** Depends on fog of war, enables lore collection.

1. Add `exploration` database table and schema
2. Implement `ExplorationService` with POI validation
3. Add POI definitions to `world-gen` package
4. Implement `POIRenderer` in WorldScene
5. Wire `exploration:poi_discovered` event flow

**Success Criteria:** Player reveals POI, receives lore entry, POI marked as discovered.

### Phase 3: Gathering Mini-Game
**Why third:** Independent system, can test without exploration features.

1. Create `gatheringStore` with mini-game state
2. Implement `GatheringMiniGameOverlay` UI component
3. Implement `GatheringService` with timing validation
4. Modify `EntityService.handleToolUse()` to trigger mini-game
5. Wire `gathering:start`, `gathering:complete`, `gathering:result` events

**Success Criteria:** Click resource → mini-game appears → correct timing → bonus loot.

### Phase 4: Zone Mastery Tracking
**Why fourth:** Depends on exploration events, requires POI system.

1. Add mastery counters to `exploration` table
2. Implement event handlers in `ExplorationService`
3. Add mastery tier calculation logic
4. Implement tier-up rewards in `InventoryService`
5. Wire `exploration:mastery_tier` event

**Success Criteria:** Activities increment counters, tier-up notification appears, rewards granted.

### Phase 5: Combat Balancing
**Why last:** Independent of other features, modifies critical system.

1. Add difficulty multiplier to `CombatService.handlePlayerAttack()`
2. Modify `calculateDamage()` in game-logic package
3. Add retreat behavior to `AiService` FSM
4. Add difficulty preference to character table
5. Test balancing with various level gaps

**Success Criteria:** High-level creatures deal scaled damage, low-health creatures retreat.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Server-Side Fog Tracking

**What people do:** Store revealed tiles in database, sync on every movement.

**Why it's wrong:** Generates massive database writes (every step), increases latency, doesn't scale.

**Do this instead:** Client localStorage with server-side POI discovery validation only. Server never sees per-tile reveals.

### Anti-Pattern 2: Synchronous Mini-Game Validation

**What people do:** Block server response waiting for player to complete mini-game.

**Why it's wrong:** Ties up server thread, vulnerable to timeout, breaks with packet loss.

**Do this instead:** Async flow: server sends `gathering:start`, client plays mini-game, client sends `gathering:complete`, server validates and responds. Each step is non-blocking.

### Anti-Pattern 3: Real-Time Mastery Counter Updates

**What people do:** Update database on every single kill/gather action.

**Why it's wrong:** Generates excessive database writes, causes contention on hot rows, expensive at scale.

**Do this instead:** In-memory counter accumulation with periodic (5s) batch flush. Only write to DB when tier changes or on disconnect.

### Anti-Pattern 4: Global Difficulty Setting

**What people do:** Apply same difficulty multiplier to all creatures in a zone.

**Why it's wrong:** Removes per-encounter challenge tuning, forces homogeneous content.

**Do this instead:** Calculate difficulty per creature based on player vs creature level gap. Allows zone diversity while maintaining accessibility.

## Integration Testing Strategy

### Test Order

1. **Fog of War (isolated):** Test localStorage persistence, tile reveal logic, rendering
2. **POI Discovery:** Test fog + POI integration, server validation, lore delivery
3. **Gathering Mini-Game:** Test timing validation, yield calculation, inventory updates
4. **Zone Mastery:** Test event aggregation, tier calculation, reward delivery
5. **Combat Balancing:** Test damage scaling, retreat behavior, difficulty preferences
6. **Full Integration:** Test all systems interacting (gather → mastery → tier-up reward)

### Critical Integration Points

| Integration | Test Scenario | Expected Behavior |
|-------------|---------------|-------------------|
| Fog + POI | Reveal tiles around POI | POI appears when center tile revealed |
| Mini-Game + Inventory | Perfect timing | 1.5x yield multiplier applied to loot |
| Mastery + Quests | Kill creature | Both quest progress AND mastery increment |
| Combat + AI | Attack high-level creature | Scaled damage, retreat at 20% health |
| Fog + Zone Transition | Move to new zone | Load fog for new zone from localStorage |

## Sources

Phaser 3 fog of war patterns:
- [Fog of War with Hexagons implementation advice](https://phaser.discourse.group/t/fog-of-war-with-hexagons-implementation-advice/4895)
- [Simple Fog of War Effect for a Phaser 3 Roguelike](https://blog.ourcade.co/posts/2020/phaser3-fog-of-war-field-of-view-roguelike/)
- [@pixelburp/phaser3-fog-of-war npm package](https://www.npmjs.com/package/@pixelburp/phaser3-fog-of-war)

Phaser 3 timing implementation:
- [How to Create an Accurate Timer for Phaser Games](https://www.joshmorony.com/how-to-create-an-accurate-timer-for-phaser-games/)

MMO gathering mechanics:
- [Mini games for gathering resources — MMORPG.com Forums](https://forums.mmorpg.com/discussion/229842/mini-games-for-gathering-resources)
- [Common anti-patterns in MMORPG design](https://www.gamedeveloper.com/design/common-anti-patterns-in-mmorpg-design)

Exploration systems:
- [Best MMOs for Exploration — MMOPulse](https://mmopulse.com/recommended/recommended-exploration)
- [Community Debate - POI Interest — Pantheon Forums](https://seforums.pantheonmmo.com/content/forums/topic/12992/community-debate-do-points-of-interest-poi-interest-you/view/post_id/251844)

Persistent map patterns:
- [BetterMap - Persistent Mapping & Waypoints](https://hytalemod.me/posts/bettermap-hytale)
- [GitHub - fog-of-war: Map Exploration Simulator](https://github.com/wblachut/fog-of-war)

---
*Architecture integration research for: Gathering, Exploration, and Combat Balancing*
*Researched: 2026-02-23*
