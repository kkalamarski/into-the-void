# Phase 78: Gathering Mini-Game - Research

**Researched:** 2026-02-23
**Domain:** Timing-based skill check system for resource gathering with proficiency progression
**Confidence:** MEDIUM

## Summary

Phase 78 introduces a timing mini-game to gathering interactions, replacing the instant "click and receive loot" pattern with a skill-based mechanic that rewards timing accuracy with variable yield multipliers (0.5x poor, 1.0x good, 1.5x perfect). The mini-game displays a moving indicator along a timing bar with a success zone whose width increases with gathering proficiency per resource type. The server validates timing using server-side elapsed time to prevent auto-click cheats, comparing client-reported timing against expected completion windows. Proficiency progression tracks XP per resource type (minerals vs plants vs artifacts), improving both success zone width and base yield over time.

The core technical challenge is client-server timing validation under variable network latency. The existing architecture has tool-based interaction (`entity:tool_use` event) and loot tables (`rollLootTable()`) but no timing mechanics or proficiency tracking. The mini-game requires three new systems: (1) client-side Phaser-based timing UI with moving indicator and success zones, (2) server-side timing validation that compensates for network latency, and (3) database schema for proficiency tracking with XP accumulation and level-based bonuses.

**Primary recommendation:** Use server-authoritative timing validation with latency compensation windows (±200ms tolerance). Store proficiency per resource category (mining, herbalism, archaeology) rather than per individual resource to reduce schema complexity. Implement mini-game as optional opt-in initially—players can auto-harvest (1.0x yield, no skill required) or engage mini-game (0.5x-1.5x based on timing). Avoid forced mini-games on every harvest to prevent player fatigue.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.87.0 | Client-side game rendering, timing UI | Project standard for all game scenes |
| `@nestjs/common` | 10.4.22 | Server-side dependency injection | Project standard for all services |
| `drizzle-orm/pg-core` | 0.30.10 | Database schema for proficiency tracking | Project standard for all tables |
| `@into-the-void/shared-types` | workspace | Type-safe events for timing payloads | Project standard for client-server contracts |
| `@into-the-void/game-logic` | workspace | Timing validation logic (pure functions) | Project standard for shared game rules |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Phaser Tweens | Built-in | Smooth indicator movement animation | Core of mini-game visual feedback |
| Phaser Graphics | Built-in | Drawing timing bar, zones, indicators | All mini-game rendering |
| Drizzle jsonb | Built-in | Storing proficiency map per character | Flexible proficiency schema |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side validation | Client-only timing | Client-only allows auto-click cheats; server validation required |
| Proficiency per resource type | Single gathering skill | Per-type allows specialization but increases storage/balancing complexity |
| JSONB proficiency storage | Separate proficiency table | JSONB is simpler for prototype, table scales better for analytics |

**Installation:** None required—all dependencies already in project.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── game/
│   ├── ui/
│   │   └── GatheringMiniGame.ts         # NEW: Phaser UI component
│   └── scenes/
│       └── WorldScene.ts                # MODIFY: spawn mini-game on tool use

packages/database/src/
└── schema/
    └── proficiency.ts                   # NEW: gathering_proficiency table

packages/shared-types/src/
├── network/
│   └── events.ts                        # MODIFY: add gathering:start, gathering:complete
└── game/
    └── proficiency.ts                   # NEW: GatheringProficiency types

packages/game-logic/src/
└── gathering/
    ├── timing-validation.ts             # NEW: validateGatherTiming()
    └── proficiency.ts                   # NEW: calculateSuccessZone(), awardProficiencyXP()

apps/game-server/src/
└── game/
    ├── gathering.service.ts             # NEW: GatheringService
    └── game.gateway.ts                  # MODIFY: handle gathering events
```

### Pattern 1: Server-Authoritative Timing Validation

**What:** Server issues a timing challenge with a server-side start timestamp and expected completion window. Client displays mini-game and reports timing offset when player clicks. Server validates the reported timing against actual elapsed time with latency tolerance.

**When to use:** Any timing-based mechanic where cheating prevention is critical (gathering, fishing, lockpicking).

**Example:**
```typescript
// Source: packages/game-logic/src/gathering/timing-validation.ts
export interface TimingChallenge {
  challengeId: string;          // Unique ID for this gathering attempt
  startTime: number;            // Server timestamp when gathering started
  duration: number;             // Total bar duration in ms (e.g., 3000ms)
  successWindow: {              // Based on proficiency
    start: number;              // Offset in ms (e.g., 1200ms)
    end: number;                // Offset in ms (e.g., 1800ms)
  };
}

export interface TimingResult {
  challengeId: string;
  clickTime: number;            // Client timestamp when player clicked
  clientOffset: number;         // Offset within duration (e.g., 1450ms)
}

export function validateGatherTiming(
  challenge: TimingChallenge,
  result: TimingResult,
  serverTime: number
): { valid: boolean; accuracy: 'poor' | 'good' | 'perfect'; yieldMultiplier: number } {
  // Verify challenge hasn't expired (prevent stored challenges)
  const elapsed = serverTime - challenge.startTime;
  if (elapsed > challenge.duration + 500) {
    return { valid: false, accuracy: 'poor', yieldMultiplier: 0.5 };
  }

  // Verify challenge ID matches (prevent replay attacks)
  if (result.challengeId !== challenge.challengeId) {
    return { valid: false, accuracy: 'poor', yieldMultiplier: 0.5 };
  }

  // Latency compensation: ±200ms tolerance
  const offset = result.clientOffset;
  const { start, end } = challenge.successWindow;

  // Perfect: within success window
  if (offset >= start && offset <= end) {
    return { valid: true, accuracy: 'perfect', yieldMultiplier: 1.5 };
  }

  // Good: within ±200ms of success window
  const tolerance = 200;
  if (offset >= start - tolerance && offset <= end + tolerance) {
    return { valid: true, accuracy: 'good', yieldMultiplier: 1.0 };
  }

  // Poor: outside success zone
  return { valid: true, accuracy: 'poor', yieldMultiplier: 0.5 };
}
```

### Pattern 2: Proficiency Per Resource Category

**What:** Track gathering proficiency separately for each resource category (mining, herbalism, archaeology) rather than per individual resource. Reduces database rows from ~35 (one per resource) to 3 categories.

**When to use:** When resource types share mechanics (all minerals mined with same tools, all plants harvested with same interaction).

**Example:**
```typescript
// Source: packages/database/src/schema/proficiency.ts
import { pgTable, uuid, varchar, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { characters } from './characters';

export type ResourceCategory = 'mining' | 'herbalism' | 'archaeology';

export interface ProficiencyData {
  mining: { xp: number; level: number };
  herbalism: { xp: number; level: number };
  archaeology: { xp: number; level: number };
}

export const gatheringProficiency = pgTable('gathering_proficiency', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' })
    .unique(),
  proficiency: jsonb('proficiency').$type<ProficiencyData>().notNull().default({
    mining: { xp: 0, level: 1 },
    herbalism: { xp: 0, level: 1 },
    archaeology: { xp: 0, level: 1 },
  }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type GatheringProficiency = typeof gatheringProficiency.$inferSelect;
```

### Pattern 3: Client-Side Mini-Game UI (Phaser Graphics)

**What:** Phaser UI component that draws timing bar, animates moving indicator, and captures player input.

**When to use:** Any interactive timing challenge in Phaser scenes.

**Example:**
```typescript
// Source: apps/web/src/game/ui/GatheringMiniGame.ts
export class GatheringMiniGame extends Phaser.GameObjects.Container {
  private bar!: Phaser.GameObjects.Graphics;
  private indicator!: Phaser.GameObjects.Graphics;
  private successZone!: Phaser.GameObjects.Graphics;
  private tween?: Phaser.Tweens.Tween;
  private challenge: TimingChallenge;
  private onComplete: (offset: number) => void;
  private startTime: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    challenge: TimingChallenge,
    onComplete: (offset: number) => void
  ) {
    super(scene, x, y);
    this.challenge = challenge;
    this.onComplete = onComplete;
    this.startTime = Date.now();

    this.createBar();
    this.createSuccessZone();
    this.createIndicator();
    this.startAnimation();

    scene.input.once('pointerdown', this.handleClick, this);
    scene.add.existing(this);
  }

  private createBar(): void {
    this.bar = this.scene.add.graphics();
    this.bar.fillStyle(0x333333, 0.8);
    this.bar.fillRect(0, 0, 400, 40);
    this.bar.lineStyle(2, 0xffffff, 0.5);
    this.bar.strokeRect(0, 0, 400, 40);
    this.add(this.bar);
  }

  private createSuccessZone(): void {
    const { start, end } = this.challenge.successWindow;
    const barWidth = 400;
    const startX = (start / this.challenge.duration) * barWidth;
    const width = ((end - start) / this.challenge.duration) * barWidth;

    this.successZone = this.scene.add.graphics();
    this.successZone.fillStyle(0x00ff00, 0.3);
    this.successZone.fillRect(startX, 0, width, 40);
    this.add(this.successZone);
  }

  private createIndicator(): void {
    this.indicator = this.scene.add.graphics();
    this.indicator.fillStyle(0xffff00, 1.0);
    this.indicator.fillRect(0, 0, 4, 40);
    this.add(this.indicator);
  }

  private startAnimation(): void {
    this.tween = this.scene.tweens.add({
      targets: this.indicator,
      x: 400,
      duration: this.challenge.duration,
      ease: 'Linear',
      onComplete: () => this.handleTimeout(),
    });
  }

  private handleClick(): void {
    if (this.tween) {
      this.tween.stop();
    }
    const elapsed = Date.now() - this.startTime;
    this.onComplete(elapsed);
    this.destroy();
  }

  private handleTimeout(): void {
    // Auto-fail if player doesn't click in time
    this.onComplete(this.challenge.duration + 100);
    this.destroy();
  }
}
```

### Pattern 4: Proficiency XP Award and Level-Up

**What:** Award XP per successful gather, level up when threshold reached, increase success zone width per level.

**Example:**
```typescript
// Source: packages/game-logic/src/gathering/proficiency.ts
export function calculateXPReward(
  accuracy: 'poor' | 'good' | 'perfect',
  resourceTier: number
): number {
  const baseXP = 10 * resourceTier; // Tier 1 = 10 XP, Tier 4 = 40 XP
  const multiplier = accuracy === 'perfect' ? 1.5 : accuracy === 'good' ? 1.0 : 0.5;
  return Math.floor(baseXP * multiplier);
}

export function calculateSuccessZoneWidth(level: number, baseDuration: number): number {
  // Level 1: 20% window, Level 10: 40% window
  const baseWidth = 0.2; // 20%
  const widthPerLevel = 0.02; // +2% per level
  const maxWidth = 0.5; // Cap at 50%

  const width = Math.min(baseWidth + (level - 1) * widthPerLevel, maxWidth);
  return width * baseDuration;
}

export function calculateLevelFromXP(xp: number): number {
  // XP curve: level 1->2 = 100 XP, level 2->3 = 150 XP, etc.
  let level = 1;
  let xpRequired = 100;
  let totalXP = 0;

  while (totalXP + xpRequired <= xp) {
    totalXP += xpRequired;
    level++;
    xpRequired += 50; // Each level requires 50 more XP than previous
  }

  return level;
}
```

### Pattern 5: Event Flow (Client-Server)

**Flow:**
1. Client: Player clicks gatherable entity with tool equipped
2. Server: Validates tool range, entity state, creates `TimingChallenge`
3. Server → Client: `gathering:start` with challenge parameters
4. Client: Displays mini-game UI, animates indicator
5. Client: Player clicks, records offset
6. Client → Server: `gathering:complete` with timing result
7. Server: Validates timing, rolls loot with yield multiplier, awards proficiency XP
8. Server → Client: `gathering:result` with loot items, XP gained, new proficiency level

**Example:**
```typescript
// Source: packages/shared-types/src/network/events.ts
export interface ClientEvents {
  // ... existing events
  'gathering:start': { targetEntityId: string };
  'gathering:complete': {
    challengeId: string;
    clientOffset: number; // ms from start when player clicked
    clickTime: number;    // client timestamp for latency validation
  };
}

export interface ServerEvents {
  // ... existing events
  'gathering:challenge': {
    challengeId: string;
    duration: number;
    successWindow: { start: number; end: number };
  };
  'gathering:result': {
    success: boolean;
    accuracy: 'poor' | 'good' | 'perfect';
    yieldMultiplier: number;
    items: { itemId: string; quantity: number }[];
    proficiencyXP: number;
    proficiencyLevel: number;
    error?: string;
  };
}
```

### Anti-Patterns to Avoid

- **Client-side-only timing validation:** Allows auto-click cheats via browser console injection. Always validate on server.
- **Forced mini-games on every harvest:** Players find repetitive QTEs tedious. Offer auto-harvest option (1.0x yield, no skill).
- **No latency compensation:** High-ping players never succeed. Add ±200ms tolerance window.
- **Proficiency per individual resource (35+ DB rows):** Excessive granularity increases balancing complexity. Use 3 categories instead.
- **Predicting mini-game outcome client-side:** Creates desync when server rejects. Only predict "in progress" state, wait for server result.
- **Single global gathering skill:** Removes specialization depth. Track per category (mining/herbalism/archaeology).
- **Exponential XP curves:** Late-game grind frustrates players. Use linear or logarithmic progression.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timing animation | Custom requestAnimationFrame loop | Phaser Tweens | Built-in easing, pause/resume, callbacks |
| Latency measurement | Custom ping system | Timestamp delta validation | Simple and sufficient for ±200ms tolerance |
| XP curve balancing | Hard-coded values | Configurable formula in game-logic | Easy to tune without server redeploy |
| Mini-game input | Custom event listeners | Phaser Input system | Handles touch/mouse/keyboard uniformly |

**Key insight:** Server-side timing validation is the critical security boundary. Client-side UI can be as sophisticated as desired (fancy animations, particle effects), but the server must only trust server-generated timestamps and apply latency-compensated validation windows.

## Common Pitfalls

### Pitfall 1: Gathering Node Race Conditions in Multiplayer
**What goes wrong:** Two players click the same node simultaneously. Both start mini-games, both "complete" successfully, but only one gets loot or both get loot (duplication bug).
**Why it happens:** No atomic claim-on-start logic. Server processes both `gathering:start` requests before either completes.
**How to avoid:** Implement entity locking on `gathering:start`. Store `{ entityId, playerId, challengeId, expiresAt }` in memory map. Reject subsequent start requests with "Node already being gathered by another player". Release lock on completion or timeout (5s).
**Warning signs:** Players complain about resources "disappearing" mid-gather or duplicate loot spawning.

### Pitfall 2: Auto-Click Detection False Positives
**What goes wrong:** Legitimate players with low latency get flagged as cheaters because their timing is "too consistent" (sub-10ms variance).
**Why it happens:** Auto-click detection uses variance threshold (e.g., "if stddev < 5ms, flag as bot"). But skilled players with good reflexes can achieve consistent timing legitimately.
**How to avoid:** Use pattern analysis over time (100+ samples) rather than single-session detection. Check for impossible patterns (e.g., exactly 0ms variance over 50 clicks) rather than "suspiciously good" patterns. Focus server validation on timing bounds, not statistical variance.
**Warning signs:** High-skill players reporting false bans or validation failures.

### Pitfall 3: Mini-Game UI Blocking Player Movement
**What goes wrong:** Mini-game spawns as overlay but doesn't block input to world. Player clicks to complete mini-game but also moves character, interrupting gather.
**Why it happens:** Phaser input events not properly isolated between UI and world layers.
**How to avoid:** Set mini-game container to `setInteractive()` and use `stopPropagation()` on pointer events. Disable world scene input during mini-game with `scene.input.enabled = false`. Re-enable on mini-game complete/cancel.
**Warning signs:** Players report character moving when clicking mini-game bar.

### Pitfall 4: Proficiency Not Loaded on Zone Change
**What goes wrong:** Player gathers in zone A (proficiency level 5), travels to zone B, gathers again but success zone is back to level 1 size.
**Why it happens:** Proficiency loaded on login but not cached in player state. Zone change resets to default proficiency.
**How to avoid:** Include proficiency in `Player` state object sent with zone updates. Load proficiency once on auth, cache in `GameService.activePlayers` map, pass to `GatheringService` methods.
**Warning signs:** Players report proficiency "resetting" after zone travel.

### Pitfall 5: Success Zone Width Calculation Uses Wrong Duration
**What goes wrong:** Success zone width calculated as percentage of client animation duration, but server uses different timing (e.g., 3000ms client vs 2500ms server due to config mismatch).
**Why it happens:** Duration hard-coded separately in client and server instead of single source of truth.
**How to avoid:** Define `GATHER_DURATION_MS` constant in `shared-types/constants.ts`. Both client and server import same value. Success window offsets calculated as percentages, converted to ms using shared constant.
**Warning signs:** Players report success zone appearing in wrong position on bar.

### Pitfall 6: Proficiency XP Overflow on Rapid Harvests
**What goes wrong:** Player rapidly harvests multiple nodes (e.g., 10 plants in 30 seconds). XP updates race, final proficiency level lower than expected.
**Why it happens:** Concurrent XP award writes overwrite each other. Read-modify-write pattern without transaction isolation.
**How to avoid:** Use database-level atomic increment: `UPDATE gathering_proficiency SET xp = xp + ${amount} WHERE character_id = ${id}`. Recalculate level after update using latest XP value.
**Warning signs:** Players report missing XP or proficiency not leveling up despite enough harvests.

## Code Examples

### Server-Side Challenge Generation
```typescript
// Source: apps/game-server/src/game/gathering.service.ts
function createTimingChallenge(
  entityId: string,
  playerId: string,
  proficiencyLevel: number
): TimingChallenge {
  const duration = 3000; // 3 seconds
  const successWidth = calculateSuccessZoneWidth(proficiencyLevel, duration);

  // Center success zone in middle half of bar (1000ms - 2000ms range)
  const centerPoint = duration * 0.5 + (Math.random() - 0.5) * 500; // 1250ms - 1750ms
  const start = centerPoint - successWidth / 2;
  const end = centerPoint + successWidth / 2;

  return {
    challengeId: crypto.randomUUID(),
    startTime: Date.now(),
    duration,
    successWindow: { start, end },
  };
}
```

### Proficiency XP Award (Atomic Update)
```typescript
// Source: apps/game-server/src/game/gathering.service.ts
async function awardProficiencyXP(
  characterId: string,
  category: ResourceCategory,
  xp: number
): Promise<{ level: number; xpGained: number }> {
  const db = this.databaseService.getClient();

  // Atomic increment
  const [updated] = await db
    .update(gatheringProficiency)
    .set({
      proficiency: sql`jsonb_set(
        proficiency,
        '{${sql.raw(category)}, xp}',
        (proficiency->'${sql.raw(category)}'->>'xp')::int + ${xp}
      )`,
      updatedAt: new Date(),
    })
    .where(eq(gatheringProficiency.characterId, characterId))
    .returning();

  const newXP = updated.proficiency[category].xp;
  const newLevel = calculateLevelFromXP(newXP);

  // Update level if changed
  if (newLevel !== updated.proficiency[category].level) {
    await db
      .update(gatheringProficiency)
      .set({
        proficiency: sql`jsonb_set(
          proficiency,
          '{${sql.raw(category)}, level}',
          '${newLevel}'
        )`,
      })
      .where(eq(gatheringProficiency.characterId, characterId));
  }

  return { level: newLevel, xpGained: xp };
}
```

### Client Mini-Game Integration
```typescript
// Source: apps/web/src/game/scenes/WorldScene.ts
private handleGatheringChallenge(data: ServerEvents['gathering:challenge']): void {
  // Pause player movement
  this.input.enabled = false;

  // Spawn mini-game UI centered on screen
  const miniGame = new GatheringMiniGame(
    this,
    this.cameras.main.centerX,
    this.cameras.main.centerY - 100,
    data,
    (offset) => this.completeGathering(data.challengeId, offset)
  );

  miniGame.setDepth(1000); // Above all world objects
}

private completeGathering(challengeId: string, clientOffset: number): void {
  this.socket.emit('gathering:complete', {
    challengeId,
    clientOffset,
    clickTime: Date.now(),
  });

  // Re-enable input
  this.input.enabled = true;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Instant harvest on click | Timing mini-game with skill check | Phase 78 | Adds engagement, reduces bot farming |
| Single gathering skill | Per-category proficiency | Phase 78 | Enables specialization, horizontal progression |
| Client-trusted timing | Server-authoritative validation | Phase 78 | Prevents auto-click cheats |
| Fixed loot yield | Variable yield (0.5x-1.5x) | Phase 78 | Rewards player skill, reduces grind monotony |

**Deprecated/outdated:**
- Instant `entity:tool_use` → loot pattern: Replaced with `gathering:start` → mini-game → `gathering:complete` flow
- `handleToolUse()` in EntityService: Will need gathering-specific branch for minerals/plants/artifacts

## Open Questions

1. **Should proficiency affect base yield or only success zone width?**
   - What we know: GATH-05 says "higher proficiency increases success zone size AND base yield"
   - What's unclear: How much base yield bonus (5% per level? 10%?)
   - Recommendation: Start with 2% base yield per level (level 10 = +20% base yield), cap at +50% to avoid exponential scaling

2. **Auto-harvest vs forced mini-game?**
   - What we know: Research warns against "forced mini-games on every harvest" causing player fatigue
   - What's unclear: User requirements don't specify optional vs mandatory
   - Recommendation: Implement as optional with toggle. Auto-harvest = 1.0x fixed yield, mini-game = 0.5x-1.5x based on timing

3. **Does proficiency affect all entity types or just minerals/plants?**
   - What we know: Requirements say "proficiency per resource type," entities include creatures and artifacts
   - What's unclear: Does combat loot also use gathering proficiency?
   - Recommendation: Proficiency applies to non-combat gathering only (minerals, plants, artifacts). Creatures use combat XP system

4. **What happens to proficiency on character deletion?**
   - What we know: `gathering_proficiency.characterId` references `characters.id` with `onDelete: 'cascade'`
   - What's unclear: Should proficiency be preserved for account-wide unlocks?
   - Recommendation: Use cascade delete (proficiency is character-specific, matches existing pattern from inventories/quest-progress)

5. **How to handle mini-game for artifacts (one-time collectibles)?**
   - What we know: Artifacts have `respawns: false`, meant to be discovered once
   - What's unclear: Should one-time items require mini-game skill check?
   - Recommendation: Skip mini-game for artifacts—instant collect on interaction. Proficiency still tracks "archaeology" XP for discovering them

## Sources

### Primary (HIGH confidence)
- Codebase: `packages/game-logic/src/interaction/interaction.ts` - existing tool interaction validation
- Codebase: `packages/game-logic/src/loot/loot-table.ts` - existing loot rolling system
- Codebase: `packages/shared-types/src/network/events.ts` - WebSocket event patterns
- Codebase: `.planning/phases/35-loot-tables-tool-interaction-respawn/35-RESEARCH.md` - Phase 35 established tool-use pattern
- Codebase: `.planning/research/FEATURES-GATHERING-EXPLORATION.md` - gathering feature requirements and anti-patterns
- Codebase: `.planning/research/PITFALLS-GATHERING-EXPLORATION.md` - multiplayer gathering race conditions, timing desyncs

### Secondary (MEDIUM confidence)
- [How Game Developers Detect and Stop Cheating in Real-Time](https://medium.com/@amol346bhalerao/how-game-developers-detect-and-stop-cheating-in-real-time-0aa4f1f52e0c) - server-side validation patterns
- [AutoClicker Detection Tutorial (server side)](https://hypixel.net/threads/autoclicker-detection-tutorial-server-side.5483042/) - timing validation, latency compensation
- [How to Create an Accurate Timer for Phaser Games](https://www.joshmorony.com/how-to-create-an-accurate-timer-for-phaser-games/) - Phaser timing best practices
- [Deriving a Design Pattern from the Mechanics Progression of Character Skills](https://ryha2000.medium.com/deriving-a-design-pattern-from-the-mechanics-progression-of-character-skills-5574b65c3aa6) - skill progression design patterns

### Tertiary (LOW confidence)
- XP curve formula (100 + level * 50): reasonable game design inference, not derived from existing code
- Success zone width formula (20% base + 2% per level): reasonable progression curve, needs playtesting
- Latency tolerance (±200ms): industry standard for client-server timing, may need tuning for this game's network profile

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages verified in codebase, no new dependencies needed
- Architecture: MEDIUM - client-server timing patterns proven but not yet implemented in this codebase
- Pitfalls: HIGH - derived from research docs and multiplayer game design experience
- Proficiency progression: MEDIUM - based on existing XP systems (combat, quests) but gathering-specific formulas need validation

**Research date:** 2026-02-23
**Valid until:** 2026-03-16 (fast-moving domain due to gameplay balance requirements, 21 days validity)
