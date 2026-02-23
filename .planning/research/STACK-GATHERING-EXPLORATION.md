# Stack Research

**Domain:** Gathering mini-games, fog of war, POI discovery, lore collection, and zone mastery tracking
**Researched:** 2026-02-23
**Confidence:** HIGH

## Executive Summary

The existing stack (Phaser 3.90, NestJS, PostgreSQL, Drizzle ORM, Redis, Zustand) already provides all core technologies needed for the new features. **No new frameworks or major libraries are required.** The primary additions are:

1. **Built-in Phaser capabilities** for mini-games and fog of war (tweens, timelines, render textures, masks)
2. **Database schema extensions** using existing Drizzle ORM patterns (JSONB for POI/lore data, tracking tables)
3. **Redis Sorted Sets** (already available via ioredis) for zone mastery leaderboards
4. **Event emitter patterns** (already via @nestjs/event-emitter) for real-time mini-game coordination

This is primarily a **feature implementation project using existing tools**, not a technology addition project.

## Recommended Stack

### Core Technologies (Already Installed - NO CHANGES)

| Technology | Current Version | Purpose | Why It's Sufficient |
|------------|-----------------|---------|---------------------|
| Phaser | 3.90 | Game engine with built-in tweens, timelines, render textures | Includes all primitive rendering capabilities for fog of war (masks, blend modes) and mini-games (timeline sequencing, tween chaining) without plugins |
| PostgreSQL | ^8.11.0 (driver) | Relational database with JSONB support | Native JSONB arrays handle POI/lore collection data; bit arrays or boolean arrays for tile visibility tracking; excellent spatial query performance |
| Drizzle ORM | ^0.30.0 | Type-safe ORM with PostgreSQL JSONB support | \`jsonb().$type<Type[]>()\` pattern provides type-safe array storage for discovered POIs, lore entries, and zone exploration state |
| Redis (ioredis) | ^5.4.0 | In-memory cache with sorted sets | Sorted Sets (ZADD, ZINCRBY, ZREVRANGE) provide O(log N) leaderboard operations for zone mastery tracking across millions of players |
| NestJS Event Emitter | 3.0.1 | Built-in event bus for decoupled communication | Already installed; handles real-time mini-game state coordination between game server and clients via WebSocket events |
| Zustand | ^4.5.0 | React state management | Sufficient for client-side fog of war state, mini-game UI state, and codex UI state without additional libraries |

### Supporting Patterns (Use Existing APIs - NO NEW PACKAGES)

| Pattern | Implementation | Purpose | When to Use |
|---------|----------------|---------|-------------|
| Phaser Tween Timeline | \`this.tweens.timeline([...])\` | Sequence mini-game animations with precise timing | All gathering mini-games (timing bars, accuracy zones, feedback animations) |
| Phaser RenderTexture + Mask | \`scene.add.renderTexture()\` + \`setMask()\` | Reveal fog of war as player explores | Client-side fog rendering, synced with server-side exploration tracking |
| PostgreSQL JSONB Arrays | \`jsonb('data').$type<string[]>()\` | Store discovered POI IDs, lore entry IDs per character | POI discovery tracking, lore codex collection, zone completion checklist |
| Redis Sorted Sets | \`ZADD zone:mastery:zoneId score characterId\` | Track zone mastery scores with automatic ranking | Zone mastery leaderboards, mastery tier progression (Bronze/Silver/Gold) |
| NestJS @OnEvent() | \`@OnEvent('gathering.complete')\` | Handle mini-game results asynchronously | Award loot, update mastery score, unlock POI lore after successful gathering |

## Installation

**NO NEW INSTALLATIONS REQUIRED.** All capabilities exist in current dependencies.

However, if you need type definitions for advanced Phaser usage:

```bash
# Already installed in devDependencies
# @types/node (covers most Phaser types via TS lib detection)

# If you later want Phaser rex-plugins for advanced UI (NOT REQUIRED FOR MILESTONE):
# pnpm add phaser3-rex-plugins@latest
```

## Alternatives Considered

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| Phaser Built-in RenderTexture + Mask | \`@pixelburp/phaser3-fog-of-war\` npm package | Package is 5+ years old (last updated ~2020), zero recent activity, implements same primitives available in Phaser 3.90. Custom implementation gives full control over reveal patterns. |
| PostgreSQL JSONB Arrays | PostGIS spatial extensions for tile tracking | Overkill for simple tile discovery tracking. JSONB arrays are sufficient for POI IDs and perform well with GIN indexes. PostGIS is for complex spatial queries (nearest neighbor, polygon intersection) not needed here. |
| Phaser Built-in Tweens/Timeline | GSAP (GreenSock Animation Platform) | GSAP is powerful but adds 50kb+ bundle size. Phaser's tween system handles mini-game timing requirements (ease functions, delays, callbacks, looping) natively. |
| Redis Sorted Sets | PostgreSQL leaderboard tables with indexes | Redis Sorted Sets provide O(log N) operations vs PostgreSQL's O(N log N) for ranking queries. Redis is already in stack for session caching, so no new infrastructure. For zone mastery with frequent updates, Redis is the standard. |
| NestJS Event Emitter | RxJS Observables directly | Event Emitter provides cleaner separation between services and better typing with @OnEvent decorators. RxJS is available if complex stream processing is needed later, but event emitter is sufficient for mini-game result coordination. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Custom physics libraries (Matter.js, Planck.js) | Mini-games are timing/accuracy based, not physics simulations. Adding physics engine increases bundle size unnecessarily. | Phaser tweens with easing functions for smooth animations, manual collision detection if needed |
| External form validation libraries (Yup, Zod) for mini-game state | Validation happens server-side via existing class-validator in NestJS. Client mini-game state is ephemeral. | TypeScript types + class-validator DTOs on server, Zustand type inference on client |
| GraphQL subscriptions for real-time mini-game updates | WebSocket events via Socket.IO already handle real-time game state. GraphQL adds complexity without benefit for this use case. | Existing Socket.IO events (ClientEvents/ServerEvents interfaces) |
| MongoDB/NoSQL for POI/lore tracking | Relational data (character → discovered POIs) fits PostgreSQL better. JSONB provides flexible schema for lore content without migrating databases. | PostgreSQL JSONB columns with Drizzle ORM type inference |
| Phaser Plugins (rex-plugins UI, BBCode Text) | Milestone doesn't require complex UI components. DOM-based React UI (already in stack) handles menus/codex. Phaser canvas is for game world rendering only. | React components for HUD/codex, Phaser.GameObjects.Text for in-game labels |

## Stack Patterns by Feature

### Gathering Mini-Games

**Pattern:** Phaser Tween Timeline + NestJS Event Validation

\`\`\`typescript
// CLIENT (Phaser Scene)
const timeline = this.tweens.timeline({
  tweens: [
    { targets: indicator, x: 200, duration: 1000, ease: 'Linear' },
    { targets: indicator, alpha: 0, duration: 200, ease: 'Power2' }
  ],
  onComplete: () => this.socket.emit('gathering:attempt', { accuracy: this.calculateAccuracy() })
});

// SERVER (NestJS Gateway)
@SubscribeMessage('gathering:attempt')
async handleGatheringAttempt(@MessageBody() data: GatheringAttemptDto) {
  const result = this.gatheringService.validateAttempt(data);
  this.eventEmitter.emit('gathering.complete', { characterId, result });
  return result;
}
\`\`\`

**Why:** Client handles smooth animations/input, server validates and awards loot. Event emitter decouples loot generation from WebSocket handler.

### Fog of War

**Pattern:** Phaser RenderTexture (client) + PostgreSQL JSONB Array (server)

\`\`\`typescript
// CLIENT (Phaser Scene)
fogTexture = this.add.renderTexture(0, 0, mapWidth, mapHeight).fill(0x000000, 0.8);
this.revealFog(playerX, playerY, revealRadius);

// SERVER (Drizzle Schema)
export const characterExploration = pgTable('character_exploration', {
  characterId: uuid('character_id').notNull(),
  zoneId: varchar('zone_id', { length: 50 }).notNull(),
  exploredTiles: jsonb('explored_tiles').$type<{ x: number; y: number }[]>().notNull().default([]),
});
\`\`\`

**Why:** RenderTexture with mask provides smooth visual reveal on client. JSONB array stores sparse tile data efficiently (only explored tiles, not full grid).

### POI Discovery & Lore Collection

**Pattern:** PostgreSQL JSONB + Drizzle Type Inference + React Codex UI

\`\`\`typescript
// SERVER (Drizzle Schema)
export const characterLore = pgTable('character_lore', {
  characterId: uuid('character_id').notNull(),
  discoveredLore: jsonb('discovered_lore').$type<string[]>().notNull().default([]),
  discoveredPOIs: jsonb('discovered_pois').$type<string[]>().notNull().default([]),
});

// CLIENT (React Component)
const codex = useGameStore((state) => state.codex);
<CodexUI entries={codex.loreEntries.filter(e => e.discovered)} />
\`\`\`

**Why:** JSONB arrays with type inference provide flexible storage for IDs. React component handles UI, Zustand manages state, no Phaser UI plugins needed.

### Zone Mastery Tracking

**Pattern:** Redis Sorted Sets + PostgreSQL Audit Trail

\`\`\`typescript
// SERVER (Zone Mastery Service)
async updateMastery(characterId: string, zoneId: string, points: number) {
  const key = \`zone:mastery:\${zoneId}\`;
  await this.redis.zincrby(key, points, characterId);
  const rank = await this.redis.zrevrank(key, characterId);
  return { rank: rank + 1, score: await this.redis.zscore(key, characterId) };
}

// Leaderboard query (top 100)
const top100 = await this.redis.zrevrange('zone:mastery:verdant-expanse', 0, 99, 'WITHSCORES');
\`\`\`

**Why:** Redis Sorted Sets provide O(log N) rank updates and O(log N + K) range queries. Store audit trail in PostgreSQL for historical analysis, but real-time leaderboard from Redis.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Phaser 3.90.0 | React 18.2.0 | No conflicts. Phaser renders to canvas, React manages DOM UI layer. |
| Drizzle ORM 0.30.0 | PostgreSQL 14+ | JSONB \`.$type<>()\` requires Drizzle 0.28.0+. Current version 0.30.0 fully supports typed JSONB. |
| ioredis 5.4.0 | Redis 6.0+ | Sorted Sets available since Redis 1.2, but use Redis 6+ for ACL and performance improvements. |
| @nestjs/event-emitter 3.0.1 | NestJS 10.3.0 | Matches major version. No known compatibility issues. |
| Socket.IO 4.7.0 | Socket.IO Client 4.7.0 | Already aligned. Mini-game events use existing ClientEvents/ServerEvents interfaces. |

## Performance Considerations

### Fog of War Rendering

**Concern:** Rendering fog mask every frame can impact FPS on large maps.

**Mitigation:**
- Use Phaser's \`RenderTexture.draw()\` only when exploration state changes, not every frame
- Implement tile-based reveal (64x64 chunks) instead of per-pixel masks
- Cache revealed areas in texture, only update dirty regions
- For 100x100 tile map, expect <5ms update time on modern hardware

**Benchmark:** Phaser 3.60+ optimized RenderTexture performance—multiple bitmap masks now use shared framebuffer, dramatically reducing memory.

### PostgreSQL JSONB Array Queries

**Concern:** Querying JSONB arrays for "contains POI ID" may be slow without indexes.

**Mitigation:**
\`\`\`sql
-- Create GIN index on JSONB column for containment queries
CREATE INDEX idx_character_lore_pois ON character_lore USING GIN (discovered_pois);

-- Query pattern (Drizzle)
const characters = await db.select().from(characterLore)
  .where(sql\`\${characterLore.discoveredPOIs} @> '["ancient-terminal-01"]'\`);
\`\`\`

**Benchmark:** GIN indexes provide O(log N) lookups for JSONB containment. Expect <10ms for queries across 1M+ character records.

### Redis Sorted Set Scale

**Concern:** Zone mastery leaderboards with millions of players.

**Mitigation:**
- Use separate sorted set per zone (avoid single global leaderboard)
- Implement rank caching: only recalculate rank on mastery point changes, cache for 5 minutes
- For top 100 queries: O(log N + 100) is constant time regardless of player count

**Benchmark:** Redis sorted sets handle 10M+ members efficiently. ZINCRBY operations: <1ms, ZREVRANGE (top 100): <2ms.

## Integration Points with Existing Stack

### Phaser ↔ React

**Fog of War:** Phaser renders fog mask on canvas. React HUD shows exploration percentage from Zustand store (synced via WebSocket).

**Mini-Games:** Phaser scene handles mini-game rendering/input. On completion, emit Socket.IO event. React HUD displays results (loot rewards, mastery gain).

**Codex UI:** Entirely React-based modal. Phaser triggers \`openCodex()\` action in Zustand when player interacts with lore object.

### NestJS ↔ PostgreSQL

**Discovery Tracking:** When character enters POI radius (validated in game-logic), game-server queries Drizzle to check if POI already discovered. If new, append to JSONB array + emit \`poi.discovered\` event.

**Lore Unlocks:** Quest completion or entity interaction triggers lore unlock. Event handler updates \`character_lore.discovered_lore\` JSONB array.

### Redis ↔ PostgreSQL

**Zone Mastery:** Real-time scores in Redis Sorted Sets. Hourly cron job syncs Redis scores to PostgreSQL \`zone_mastery_history\` table for analytics/auditing.

**Leaderboard Persistence:** On server restart, reload top 1000 per zone from PostgreSQL into Redis. Redis is cache, PostgreSQL is source of truth.

## Development Workflow

### Adding New Mini-Game Type

1. Define mini-game config in \`@into-the-void/game-logic\` (timing windows, difficulty curves)
2. Implement Phaser scene in \`apps/web/src/game/scenes/minigames/[type]Scene.ts\`
3. Add DTO validation in \`apps/game-server/src/gathering/dto/[type]-attempt.dto.ts\`
4. Handle event in \`apps/game-server/src/gathering/gathering.service.ts\`
5. Update \`ClientEvents\`/\`ServerEvents\` in \`@into-the-void/shared-types\`

### Adding New Lore Entry

1. Add lore content to \`lore/\` directory (per CLAUDE.md, lore is source of truth)
2. Define lore entry in \`@into-the-void/game-logic/src/lore/definitions/[category].ts\`
3. Add discovery trigger (quest completion, POI interaction, entity scan)
4. UI automatically shows new entry in React codex when \`discoveredLore\` array updated

## Sources

**HIGH Confidence (Official Docs & Recent Articles):**
- [Phaser 3.90 Release Notes](https://phaser.io/news/2025/05/phaser-v390-released) — Confirmed features and performance improvements
- [PostgreSQL 17 Performance Upgrades 2026](https://medium.com/@DevBoostLab/postgresql-17-performance-upgrade-2026-f4222e71f577) — Incremental VACUUM, bitmap tracking improvements
- [Redis Sorted Sets for Leaderboards 2026](https://oneuptime.com/blog/post/2026-01-27-gaming-leaderboards-redis-sorted-sets/view) — Modern implementation patterns
- [Drizzle ORM PostgreSQL Types](https://orm.drizzle.team/docs/column-types/pg) — Type-safe JSONB column patterns
- [NestJS Event Emitter Official Docs](https://docs.nestjs.com/techniques/events) — @OnEvent decorator usage
- [Event Sourcing with NestJS January 2026](https://medium.com/@vloban/event-sourcing-with-node-js-nestjs-part-2-1fbef625933d) — Modern event patterns

**MEDIUM Confidence (Community Resources & Tutorials):**
- [Phaser 3 Fog of War Tutorial (Ourcade 2020)](https://blog.ourcade.co/posts/2020/phaser3-fog-of-war-field-of-view-roguelike/) — RenderTexture + Mask technique
- [Phaser 3 RenderTexture Mask Performance](https://github.com/phaserjs/phaser/discussions/6392) — v3.60 bitmap mask optimizations
- [Drizzle ORM JSONB Query Patterns](https://wanago.io/2024/07/15/api-nestjs-json-drizzle-postgresql/) — NestJS integration examples
- [Gathering Mini-Game Feedback (2025)](https://forum.norestforthewicked.com/t/feedback-about-resource-gathering-minigame/21609) — Player UX patterns
- [Active Time Lore System Design (2026)](https://www.iabdi.com/designblog/2026/2/9/the-x-ray-of-gaming-final-fantasy-xvis-active-time-lore-atl) — Contextual lore presentation patterns

**LOW Confidence (WebSearch Only - Flagged for Validation):**
- Combat balancing simulation tools (Machinations.io, Ludible) — Not directly applicable to this milestone, mentioned for future phase research
- @pixelburp/phaser3-fog-of-war package — Outdated, not recommended

---
*Stack research for: Into the Void Milestone - Gathering, Exploration, Combat Balancing*
*Researched: 2026-02-23*
