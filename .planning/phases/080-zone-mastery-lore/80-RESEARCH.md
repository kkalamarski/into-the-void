# Phase 80: Zone Mastery & Lore - Research

**Researched:** 2026-02-23
**Domain:** Zone progression tracking, lore collection system, achievement rewards
**Confidence:** HIGH

## Summary

Phase 80 implements zone mastery progression and lore fragment collection by extending existing event-driven tracking patterns from the quest system (Phase 65) and POI discovery system (Phase 77). The phase combines objective tracking (POI discoveries, resource gathering, creature kills) with collectible lore fragments to create a zone exploration meta-game with tiered rewards.

**Primary recommendation:** Use event-driven tracking with @nestjs/event-emitter (already in use), PostgreSQL JSONB for flexible objective storage (proven pattern from quest system), and follow the POI discovery service pattern for lore fragment collection. Store zone mastery objectives in JSONB similar to quest objectives, with composite primary keys preventing duplicate completions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/event-emitter | 3.0.1 | Event-driven tracking | Already used for quest objectives (Phase 65), proven pattern |
| PostgreSQL JSONB | - | Flexible objective storage | Proven with quest_progress table, supports dynamic objective structures |
| Drizzle ORM | current | Database schema/queries | Project standard, type-safe JSONB operations |
| Socket.IO | current | Real-time progress updates | Existing WebSocket infrastructure |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | current | Client state management | Quest/lore UI state (questStore pattern) |
| Phaser 3 | current | HUD overlay rendering | Zone mastery progress display in WorldScene |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB objectives | Separate tables per objective type | JSONB more flexible for dynamic objectives, matches quest pattern |
| Event-driven | Polling-based checks | Events reduce database load, already proven in Phase 65/77 |
| Composite PK | Separate completion tracking table | Composite PK simpler, prevents duplication like POI discovery |

**Installation:**
All dependencies already installed (event-emitter added in Phase 65, JSONB in database package).

## Architecture Patterns

### Recommended Project Structure
```
packages/database/src/schema/
├── zone-mastery.ts          # Zone mastery objectives and completion
├── lore-fragments.ts        # Collectible lore fragment tracking
└── character-rewards.ts     # Unlocked titles/cosmetics/bonuses

apps/game-server/src/game/
├── zone-mastery.service.ts  # Event listeners, objective tracking
├── lore.service.ts          # Lore fragment collection logic
└── game.gateway.ts          # WebSocket handlers (lore:collect, mastery:query)

apps/web/src/
├── store/
│   ├── zoneMasteryStore.ts  # Zone progress state
│   └── loreStore.ts         # Codex state (collected fragments)
├── components/
│   ├── LoreCodex.tsx        # Codex modal (L hotkey)
│   └── ZoneMasteryHUD.tsx   # HUD overlay for current zone
└── screens/WorldScene.ts    # Integrate HUD overlay
```

### Pattern 1: Event-Driven Objective Tracking
**What:** Listen to game events (poi.discovered, resource.gathered, entity.killed) and update zone mastery objectives in response
**When to use:** For all zone mastery objective types - follows proven quest tracking pattern

**Example:**
```typescript
// Source: apps/game-server/src/game/quest.service.ts (Phase 65)
@Injectable()
export class ZoneMasteryService {
  @OnEvent('poi.discovered')
  async handlePoiDiscovered(payload: { characterId: string; poiId: string; biome: string }): Promise<void> {
    const db = this.databaseService.getClient();
    const activeMastery = await getActiveZoneMastery(db, payload.characterId, payload.biome);

    for (const mastery of activeMastery) {
      let changed = false;
      const updatedObjectives = mastery.objectives.map((obj) => {
        if (obj.objectiveType === 'discover_pois' && !obj.complete) {
          const newCurrent = Math.min(obj.current + 1, obj.required);
          changed = newCurrent !== obj.current;
          return { ...obj, current: newCurrent, complete: newCurrent >= obj.required };
        }
        return obj;
      });

      if (changed) {
        await updateZoneMasteryObjectives(db, mastery.id, updatedObjectives);
        this.emitProgressUpdate(payload.characterId, mastery, updatedObjectives);
      }
    }
  }
}
```

### Pattern 2: JSONB Objective Storage with Composite PK
**What:** Store zone mastery objectives as JSONB array, use composite primary key (characterId, zoneId) to prevent duplicate tracking
**When to use:** For all zone-specific progression tracking

**Example:**
```typescript
// Source: packages/database/src/schema/quest-progress.ts (Phase 64)
export interface ZoneMasteryObjectiveJson {
  objectiveType: 'discover_pois' | 'gather_resources' | 'kill_creatures';
  description: string;
  current: number;
  required: number;
  targetId?: string; // Optional filter (e.g., specific creature type)
  complete: boolean;
}

export const zoneMastery = pgTable('zone_mastery', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  biome: varchar('biome', { length: 50 }).notNull(), // BiomeType
  tier: integer('tier').notNull(), // 1-3 (Bronze/Silver/Gold)
  objectives: jsonb('objectives').$type<ZoneMasteryObjectiveJson[]>().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  // Prevents duplicate mastery tracking per character per biome
  uniqueCharacterBiome: unique('unique_character_biome').on(
    table.characterId,
    table.biome
  ),
}));
```

### Pattern 3: Lore Fragment Collection (POI Discovery Pattern)
**What:** Lore fragments spawn in world as interactable objects, collection tracked with composite primary key like POI discovery
**When to use:** For all collectible lore entries

**Example:**
```typescript
// Source: packages/database/src/schema/discovered-pois.ts (Phase 77)
export const collectedLore = pgTable(
  'collected_lore',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    loreId: varchar('lore_id', { length: 100 }).notNull(), // Format: lore_${biome}_${index}
    biome: varchar('biome', { length: 50 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(), // 'world_history' | 'faction_lore' | 'ancient_tech'
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.loreId] }),
  })
);
```

### Pattern 4: Reward System (Title/Cosmetic/Bonus Unlocks)
**What:** Zone mastery completion unlocks rewards stored in character_rewards table, queried on login and displayed in UI
**When to use:** For permanent unlocks that persist across sessions

**Example:**
```typescript
export const characterRewards = pgTable('character_rewards', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  rewardType: varchar('reward_type', { length: 20 }).notNull(), // 'title' | 'cosmetic' | 'bonus'
  rewardId: varchar('reward_id', { length: 100 }).notNull(), // e.g., 'title_void_explorer'
  source: varchar('source', { length: 100 }).notNull(), // e.g., 'zone_mastery_void_plains'
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueCharacterReward: unique('unique_character_reward').on(
    table.characterId,
    table.rewardId
  ),
}));
```

### Anti-Patterns to Avoid
- **Polling for objective progress:** Use @OnEvent listeners instead - proven pattern from quest system, reduces database load
- **Separate tables per objective type:** Use JSONB for flexible objective structures - matches quest pattern, easier to extend
- **Client-side objective validation:** Server-authoritative tracking prevents exploits - follow POI discovery pattern
- **Hardcoded reward definitions:** Use registry pattern for rewards - matches ItemRegistry/EntityRegistry architecture

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event aggregation | Custom event batching system | @nestjs/event-emitter with in-memory caching | Already proven in quest tracking, handles async event processing |
| JSONB queries | Raw SQL for JSONB filtering | Drizzle ORM with $type<T>() | Type-safe, prevents SQL injection, project standard |
| Progress percentage calculation | Client-side math for HUD | Server-computed in query/service | Single source of truth, prevents desync |
| Reward eligibility checks | Multiple DB queries | Single query with joins | Performance optimization, atomic validation |

**Key insight:** Event-driven architecture with JSONB storage is the project's established pattern for progression tracking (Phases 65, 77, 78). Zone mastery extends this pattern rather than introducing new architecture.

## Common Pitfalls

### Pitfall 1: Event Duplication Across Systems
**What goes wrong:** Same event (e.g., poi.discovered) handled by both quest system AND zone mastery, leading to race conditions or double updates
**Why it happens:** Multiple services listening to same events without coordination
**How to avoid:** Use separate event names OR ensure event handlers are idempotent with proper locking/transactions
**Warning signs:** Intermittent objective progress bugs, database deadlocks, duplicate completion notifications

### Pitfall 2: Missing Event Emissions
**What goes wrong:** Gathering/killing events don't emit zone mastery updates because original implementation only tracked quests
**Why it happens:** Phase 77/78 events were designed for quests, not zone mastery
**How to avoid:** Verify all relevant game actions emit events that zone mastery can consume (poi.discovered already exists, resource.gathered from Phase 78, entity.killed from Phase 65)
**Warning signs:** Zone mastery objectives not updating despite player actions

### Pitfall 3: JSONB Objective Desync
**What goes wrong:** Client-side objective state differs from server JSONB due to optimistic updates or missed WebSocket events
**Why it happens:** Client applies optimistic update but server validation fails or event is lost
**How to avoid:** Always re-fetch zone mastery state on zone change, use server as source of truth, emit full objective array (not deltas)
**Warning signs:** HUD shows incorrect progress, objectives appear complete but server disagrees

### Pitfall 4: Lore Fragment Spawn Determinism
**What goes wrong:** Lore fragments spawn in different locations for different players, or don't respawn after collection
**Why it happens:** Non-deterministic world generation or missing persistence logic
**How to avoid:** Use deterministic lore spawn logic based on biome seed (like POI spawning), track collection per-character not per-world
**Warning signs:** Players report different lore locations, missing fragments, duplicate fragments

### Pitfall 5: Reward Unlock Race Conditions
**What goes wrong:** Zone mastery completes but reward not granted, or granted multiple times
**Why it happens:** Completion check and reward grant are not atomic, or completion event fires multiple times
**How to avoid:** Use database transaction for completion check + reward insert, unique constraint on character_rewards prevents duplicates
**Warning signs:** Missing rewards, duplicate reward notifications, database unique constraint violations in logs

### Pitfall 6: Codex UI Performance with Many Fragments
**What goes wrong:** Lore codex becomes slow to render with 50+ collected fragments
**Why it happens:** Rendering all fragments on every state update, no virtualization
**How to avoid:** Use read/unread filtering, category tabs to reduce visible fragments, memoize fragment rendering
**Warning signs:** Codex takes >500ms to open, UI freezes when toggling read/unread

## Code Examples

Verified patterns from existing codebase:

### Event-Driven Objective Tracking
```typescript
// Source: apps/game-server/src/game/quest.service.ts (Phase 65, lines 89-120)
@OnEvent('entity.killed')
async handleEntityKilled(payload: EntityKilledPayload): Promise<void> {
  try {
    const db = this.databaseService.getClient();
    const activeQuests = await getActiveQuests(db, payload.characterId);

    for (const questProgress of activeQuests) {
      const questDef = QuestRegistry.get(questProgress.questId);
      if (!questDef || questDef.id === 'unknown') continue;

      let changed = false;
      const updatedObjectives = questProgress.objectives.map((obj) => {
        if (obj.objectiveType === 'kill' && obj.targetId === payload.entityId && !obj.complete) {
          const newCurrent = Math.min(obj.current + 1, obj.required);
          changed = newCurrent !== obj.current;
          return { ...obj, current: newCurrent, complete: newCurrent >= obj.required };
        }
        return obj;
      });

      if (changed) {
        await updateQuestObjectives(db, questProgress.id, updatedObjectives);
        this.emitProgressUpdate(payload.characterId, questProgress, questDef, updatedObjectives);
      }
    }
  } catch (error) {
    this.logger.error(`Failed to handle entity killed: ${error}`);
  }
}
```

### Composite Primary Key for Discovery Tracking
```typescript
// Source: packages/database/src/schema/discovered-pois.ts (Phase 77, lines 8-22)
export const discoveredPois = pgTable(
  'discovered_pois',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    poiId: varchar('poi_id', { length: 100 }).notNull(),
    poiType: varchar('poi_type', { length: 20 }).notNull(),
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.poiId] }),
  })
);
```

### JSONB Proficiency Storage Pattern
```typescript
// Source: packages/database/src/schema/gathering-proficiency.ts (Phase 78, lines 8-36)
export interface ProficiencyJson {
  mining: { xp: number; level: number };
  herbalism: { xp: number; level: number };
  archaeology: { xp: number; level: number };
}

export const DEFAULT_PROFICIENCY: ProficiencyJson = {
  mining: { xp: 0, level: 1 },
  herbalism: { xp: 0, level: 1 },
  archaeology: { xp: 0, level: 1 },
};

export const gatheringProficiency = pgTable('gathering_proficiency', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' })
    .unique(),
  proficiency: jsonb('proficiency').$type<ProficiencyJson>().notNull().default(DEFAULT_PROFICIENCY),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### WebSocket Progress Emission
```typescript
// Source: apps/game-server/src/game/quest.service.ts (Phase 65, private method pattern)
private emitProgressUpdate(
  characterId: string,
  progress: QuestProgress,
  definition: QuestDefinition,
  objectives: ObjectiveProgressJson[]
): void {
  if (!this.server) return;

  const socketId = this.playerService.getSocketByPlayerId(characterId);
  if (!socketId) return;

  this.server.to(socketId).emit('quest:progress', {
    questId: progress.questId,
    displayName: definition.displayName,
    description: definition.description,
    state: progress.state,
    objectives: objectives,
    rewards: definition.rewards,
  });
}
```

### Zustand Store with WebSocket Listeners
```typescript
// Source: apps/web/src/store/questStore.ts (Phase 68, module-level pattern)
import { create } from 'zustand';
import { gameSocket } from '../network/socket';

interface ZoneMasteryStore {
  activeMastery: Map<string, ZoneMasteryProgress>; // biome -> progress
  currentZone: string | null;
  addMastery: (biome: string, progress: ZoneMasteryProgress) => void;
  updateProgress: (biome: string, progress: ZoneMasteryProgress) => void;
}

export const useZoneMasteryStore = create<ZoneMasteryStore>((set) => ({
  activeMastery: new Map(),
  currentZone: null,
  addMastery: (biome, progress) => set((state) => {
    const newMap = new Map(state.activeMastery);
    newMap.set(biome, progress);
    return { activeMastery: newMap };
  }),
  updateProgress: (biome, progress) => set((state) => {
    const newMap = new Map(state.activeMastery);
    newMap.set(biome, progress);
    return { activeMastery: newMap };
  }),
}));

// Module-level socket listener
gameSocket.on('zone:mastery:progress', (data: { biome: string; progress: ZoneMasteryProgress }) => {
  useZoneMasteryStore.getState().updateProgress(data.biome, data.progress);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual progress queries per action | Event-driven @OnEvent listeners | Phase 65 (Quest System) | Decoupled tracking, easier to add new systems |
| Separate tables per objective type | JSONB objective storage | Phase 64 (Quest Foundations) | Flexible schemas, dynamic objectives |
| Polling for achievement updates | WebSocket push on progress | Phase 68 (Quest UI) | Real-time feedback, reduced server load |
| Global achievement state | Per-zone mastery tracking | Phase 80 (this phase) | Granular progression, zone-specific rewards |

**Deprecated/outdated:**
- Polling-based objective checks: Replaced by event-driven architecture (Phase 65+)
- Rigid achievement schemas: JSONB allows dynamic objectives per zone/tier
- Client-authoritative progression: Server-side validation prevents exploits (Phase 77 pattern)

## Open Questions

1. **Lore fragment spawn density and placement**
   - What we know: World-gen uses deterministic noise functions (Phase 37), POIs spawn per-chunk with biome-based density
   - What's unclear: Optimal lore fragment spawn rate (too rare = frustration, too common = devalued), whether to tie to POI locations or scatter independently
   - Recommendation: Start with 1-3 fragments per biome type with tie to landmark POIs, adjust based on playtesting. Consider biome tier affecting lore rarity/quality.

2. **Zone mastery tier progression (Bronze/Silver/Gold)**
   - What we know: Biome tiers exist (I-IV per world-bible.md), reward multipliers already defined (BIOME_TIER_MULTIPLIERS)
   - What's unclear: Whether zone mastery tiers are sequential (Bronze -> Silver -> Gold) or parallel (different objective sets), reward scaling per tier
   - Recommendation: Sequential tiers with increasing objective requirements (Bronze: 10 POIs, Silver: 25 POIs + 50 resources, Gold: all + 100 kills). Reward quality scales with tier.

3. **Lore fragment content generation**
   - What we know: World-bible.md contains extensive faction/world lore, Ancients lore, biome descriptions
   - What's unclear: Who writes the 50-100+ lore fragment entries, formatting/length, localization requirements
   - Recommendation: Extract lore from world-bible.md into fragment-sized chunks (200-500 words), categorize by topic (world_history, faction_lore, ancient_tech, biome_ecology). Consider JSON lore registry pattern matching QuestRegistry.

4. **Reward balance and progression gates**
   - What we know: Titles/cosmetics are "glory rewards" (no stats), bonuses would provide gameplay advantages
   - What's unclear: Whether bonuses are acceptable (XP boost, gathering speed) vs pure cosmetics, whether titles display in-game (nameplate) or codex only
   - Recommendation: Start cosmetic-only (titles, nameplate colors, hub decorations) to avoid power creep. Titles display on character panel + optional nameplate toggle. Bonuses only if needed for progression gates (e.g., access to Tier IV zones requires Tier III mastery).

## Sources

### Primary (HIGH confidence)
- **Codebase Patterns:**
  - `apps/game-server/src/game/quest.service.ts` - @OnEvent tracking pattern (Phase 65)
  - `packages/database/src/schema/discovered-pois.ts` - Composite PK discovery pattern (Phase 77)
  - `packages/database/src/schema/quest-progress.ts` - JSONB objective storage (Phase 64)
  - `packages/database/src/schema/gathering-proficiency.ts` - JSONB proficiency tracking (Phase 78)
  - `apps/web/src/store/questStore.ts` - Zustand + WebSocket pattern (Phase 68)
  - `lore/world-bible.md` - Faction lore, Ancient history, biome descriptions

### Secondary (MEDIUM confidence)
- [NestJS Event-Driven Architecture](https://docs.nestjs.com/techniques/events) - Official @nestjs/event-emitter documentation
- [PostgreSQL JSONB for Game Data](https://plantbasedgames.io/blog/posts/01-mmorpg-data-storage-part-one/) - MMORPG data storage patterns, JSONB indexing
- [Game Achievement Design Framework](https://www.researchgate.net/publication/259841559_Framework_for_Designing_and_Evaluating_Game_Achievements) - Achievement types, reward systems, player motivation
- [Warframe Lore Fragments](https://warframe.fandom.com/wiki/Fragments) - Real-world example of codex + collectible lore system

### Tertiary (LOW confidence)
- [Game Progression System Taxonomy](https://www.intechopen.com/online-first/1221745) - Academic framework for progression types, needs verification against game design context
- [Typology of Rewards](https://www.gamedesignknowledge.com/blog-post/typology-of-rewards) - General reward categorization, lacks implementation specifics

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @nestjs/event-emitter, JSONB, Drizzle all proven in codebase (Phases 64-68, 77-78)
- Architecture: HIGH - Event-driven + JSONB patterns verified in 4+ prior phases, extensive codebase examples
- Pitfalls: MEDIUM-HIGH - Derived from quest/POI system implementation, some speculative (fragment spawn, codex perf)
- Lore content: MEDIUM - World-bible.md exists with extensive lore, fragment extraction strategy needs validation
- Reward balance: LOW-MEDIUM - Game design question, requires playtesting to validate

**Research date:** 2026-02-23
**Valid until:** ~30 days (stable architecture patterns, lore content may evolve, reward balance needs iteration)
