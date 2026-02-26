# Phase 96: Home Recall Ability - Research

**Researched:** 2026-02-26
**Domain:** Universal Abilities, Cooldown Persistence, Teleportation
**Confidence:** HIGH

## Summary

Phase 96 implements a universal "Home Recall" ability that allows all players to teleport to their faction hub with a 5-minute cooldown. This is the first equipment-independent ability in the game - every player has it automatically, regardless of their gear.

The codebase already has comprehensive infrastructure for abilities:
1. **Ability System** (`packages/game-logic/src/ability/`) - Complete registry, definition types, and effect handling
2. **Cooldown Management** (`apps/game-server/src/game/ability.service.ts`) - In-memory cooldown tracking with timestamp-based expiration
3. **Hub Teleportation** (`apps/game-server/src/game/player.service.ts`) - Existing `teleportToHub()` method with position saving
4. **WebSocket Events** (packages/shared-types/src/network/events.ts) - `ability:use` client event and `ability:cooldown` server event

The key challenge is persistence - cooldowns currently exist only in-memory and are lost on disconnect. The 5-minute cooldown requirement demands database persistence.

**Primary recommendation:** Create non-equipment-granted ability by adding `universalAbilities` field to player state, extend AbilityService to check cooldowns against database, add `ability_cooldowns` schema table for persistence.

## Standard Stack

### Core (Already Exists)
| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| Ability Definitions | `packages/game-logic/src/ability/definitions.ts` | `AbilityDefinition` objects in registry | Single source of truth for abilities |
| Ability Registry | `packages/game-logic/src/ability/ability-registry.ts` | Singleton registry pattern | Mirrors ItemRegistry/EntityRegistry |
| Ability Service | `apps/game-server/src/game/ability.service.ts` | Server-side ability logic | Cooldown tracking, effect application |
| Ability Store (Client) | `apps/web/src/store/abilityStore.ts` | Client-side cooldown state | Zustand store for UI reactivity |
| Player Service | `apps/game-server/src/game/player.service.ts` | `teleportToHub()` method | Existing hub teleportation |
| Drizzle ORM | `packages/database/src/schema/` | PostgreSQL schema definitions | Established DB pattern |

### New Components Required
| Component | Location | Purpose |
|-----------|----------|---------|
| Home Recall Definition | `packages/game-logic/src/ability/definitions.ts` | New utility ability with 300000ms cooldown |
| Ability Cooldowns Schema | `packages/database/src/schema/ability-cooldowns.ts` | Persisted cooldowns table |
| Cooldown Persistence Queries | `packages/database/src/queries/ability-cooldowns.ts` | CRUD for cooldowns |
| Universal Ability Provider | `apps/game-server/src/game/ability.service.ts` | Method to inject universal abilities |

## Architecture Patterns

### Recommended Project Structure

No new packages - extend existing patterns:

```
packages/game-logic/src/ability/definitions.ts           # Add ABILITY_HOME_RECALL
packages/database/src/schema/ability-cooldowns.ts        # New schema
packages/database/src/queries/ability-cooldowns.ts       # New queries
apps/game-server/src/game/ability.service.ts             # Add DB cooldown checks
apps/game-server/src/game/player.service.ts              # No changes (reuse teleportToHub)
apps/web/src/ui/hud/ActionBar.tsx                        # Already handles abilities from getEquippedAbilities
```

### Pattern 1: Equipment-Granted Abilities

**What:** Current pattern where abilities come from equipped items.

**Existing implementation from `ability.service.ts`:**
```typescript
getPlayerAbilities(playerId: string): AbilityDefinition[] {
  const inventory = this.inventoryService.getInventory(playerId);
  if (!inventory) return [];

  const abilityIds = new Set<string>();

  // Check equipped tool
  if (inventory.equipment.tool) {
    const toolDef = ItemRegistry.get(inventory.equipment.tool.itemId);
    if (toolDef?.grantedAbilities) {
      toolDef.grantedAbilities.forEach(id => abilityIds.add(id));
    }
  }

  // ... same for exosuit and modules

  // Resolve ability definitions
  const abilities: AbilityDefinition[] = [];
  for (const id of abilityIds) {
    const ability = AbilityRegistry.get(id);
    if (ability) abilities.push(ability);
  }

  return abilities;
}
```

**Extension for universal abilities:**
```typescript
getPlayerAbilities(playerId: string): AbilityDefinition[] {
  const inventory = this.inventoryService.getInventory(playerId);
  const abilityIds = new Set<string>();

  // ALWAYS add universal abilities (equipment-independent)
  abilityIds.add('home_recall');

  // Then add equipment-granted abilities
  if (inventory) {
    // ... existing tool/suit/module logic
  }

  // Resolve and return
  const abilities: AbilityDefinition[] = [];
  for (const id of abilityIds) {
    const ability = AbilityRegistry.get(id);
    if (ability) abilities.push(ability);
  }

  return abilities;
}
```

### Pattern 2: In-Memory Cooldown Tracking

**What:** Current cooldown system uses Map<string, number> with expiration timestamps.

**When to use:** Short-duration cooldowns (< 1 minute) where session loss is acceptable.

**Existing implementation from `ability.service.ts`:**
```typescript
private cooldowns: Map<string, number> = new Map(); // key: `${playerId}:${abilityId}`

isOnCooldown(playerId: string, abilityId: string): boolean {
  const key = `${playerId}:${abilityId}`;
  const endsAt = this.cooldowns.get(key);
  if (!endsAt) return false;
  return Date.now() < endsAt;
}

setCooldown(playerId: string, abilityId: string, cooldownMs: number): number {
  const key = `${playerId}:${abilityId}`;
  const endsAt = Date.now() + cooldownMs;
  this.cooldowns.set(key, endsAt);
  return endsAt;
}
```

**Problem:** Cooldowns lost on server restart or player disconnect.

### Pattern 3: Persistent Cooldown Tracking (New)

**What:** Database-backed cooldowns that survive disconnects and restarts.

**When to use:** Long-duration cooldowns (> 1 minute) where persistence matters.

**Proposed schema:**
```typescript
// packages/database/src/schema/ability-cooldowns.ts
export const abilityCooldowns = pgTable('ability_cooldowns', {
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  abilityId: varchar('ability_id', { length: 50 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.characterId, table.abilityId] }),
  expirationIdx: index('cooldown_expiration_idx').on(table.expiresAt),
}));
```

**Hybrid approach:**
```typescript
// Check database first for persistent abilities, then in-memory
async isOnCooldown(playerId: string, abilityId: string): Promise<boolean> {
  // For home_recall, check database
  if (abilityId === 'home_recall') {
    const dbCooldown = await getAbilityCooldown(this.db, playerId, abilityId);
    if (dbCooldown && dbCooldown.expiresAt.getTime() > Date.now()) {
      return true;
    }
    return false;
  }

  // For other abilities, use in-memory
  const key = `${playerId}:${abilityId}`;
  const endsAt = this.cooldowns.get(key);
  if (!endsAt) return false;
  return Date.now() < endsAt;
}
```

### Pattern 4: Hub Teleportation

**What:** Existing `PlayerService.teleportToHub()` method handles position saving and zone transitions.

**When to use:** Any feature that moves player to faction hub.

**Existing implementation:**
```typescript
async teleportToHub(playerId: string): Promise<{
  success: boolean;
  error?: string;
  oldZoneId?: string;
  newZoneId?: string;
}> {
  const player = this.players.get(playerId);
  if (!player) return { success: false, error: 'Player not found' };

  // Already in a hub — reject
  if (isHubZone(player.position.zoneId)) {
    return { success: false, error: 'Already in hub' };
  }

  // Get faction hub position
  const hubPosition = getFactionRespawnPosition(player.faction);
  const oldZoneId = player.position.zoneId;

  // Save current open-world position
  player.lastWorldPosition = { ...player.position };
  await saveLastWorldPosition(db, playerId, player.position);

  // Teleport to hub
  player.position = hubPosition;

  return {
    success: true,
    oldZoneId,
    newZoneId: hubPosition.zoneId,
  };
}
```

**Usage from ability:** Call `teleportToHub()` directly from ability effect handler.

### Anti-Patterns to Avoid

- **Creating new teleport logic:** Use existing `teleportToHub()` - don't duplicate zone transition code
- **Storing cooldowns in character table:** Use separate cooldowns table for normalization
- **Client-side cooldown enforcement:** Server is authoritative, client UI only reflects server state
- **Hardcoding cooldown duration:** Use ability definition's `cooldownMs` field

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hub teleportation | New teleport method | `PlayerService.teleportToHub()` | Zone transitions, room management, position saving |
| Cooldown UI | Custom cooldown display | `ActionBar` existing ability rendering | Already shows cooldowns, energy costs |
| Ability registration | Separate universal ability system | Extend `getPlayerAbilities()` | Unified ability pipeline |
| Timestamp math | Manual date arithmetic | `Date.now()` comparison | Standard pattern used throughout |

## Common Pitfalls

### Pitfall 1: Cooldown Not Persisted on Disconnect
**What goes wrong:** Player uses home recall, disconnects before cooldown expires, reconnects and can use it again immediately
**Why it happens:** Cooldown only stored in-memory Map
**How to avoid:** Write cooldown to database immediately after ability use, read from database on reconnect
**Warning signs:** Players reporting "cooldown reset after disconnect"

### Pitfall 2: Forgotten Zone State Emission
**What goes wrong:** Player uses home recall, arrives at hub but sees empty world
**Why it happens:** `teleportToHub()` returns success but caller must emit zone:state
**How to avoid:** Follow `hub:recall` handler pattern - call `updatePlayerRooms()` and emit `zone:state`
**Warning signs:** Black screen after home recall, no entities visible

### Pitfall 3: Using Home Recall While In Hub
**What goes wrong:** Player in hub uses home recall, wastes cooldown, stays in same location
**Why it happens:** Missing validation before calling `teleportToHub()`
**How to avoid:** `teleportToHub()` already returns `{ success: false, error: 'Already in hub' }` - check this
**Warning signs:** Cooldown consumed but player doesn't move

### Pitfall 4: Missing Ability in Action Bar
**What goes wrong:** Player doesn't see home recall ability in UI
**Why it happens:** `getEquippedAbilities()` only checks equipment, not universal abilities
**How to avoid:** Client-side `getEquippedAbilities()` must mirror server-side `getPlayerAbilities()` logic
**Warning signs:** Ability works via console commands but not UI

### Pitfall 5: Cooldown Not Sent on Login
**What goes wrong:** Player logs in with home recall on cooldown but UI shows it as available
**Why it happens:** Server doesn't send initial cooldown state on auth
**How to avoid:** After successful auth, query all active cooldowns and emit `ability:cooldown` for each
**Warning signs:** UI shows ability as ready when it's actually on cooldown

### Pitfall 6: Stale Cooldowns in Database
**What goes wrong:** Database accumulates expired cooldown rows forever
**Why it happens:** No cleanup process for expired cooldowns
**How to avoid:** Add index on `expires_at`, run periodic cleanup job or clean on query
**Warning signs:** Slow cooldown queries, growing database size

## Code Examples

### Home Recall Ability Definition

```typescript
// packages/game-logic/src/ability/definitions.ts

/**
 * Home Recall - Universal teleport to faction hub
 * Available to all players regardless of equipment
 */
export const ABILITY_HOME_RECALL: AbilityDefinition = {
  id: 'home_recall',
  displayName: 'Home Recall',
  description: 'Teleport to your faction hub. 5 minute cooldown.',
  category: 'utility',
  energyCost: 0, // Free to use (no energy cost)
  cooldownMs: 300000, // 5 minutes = 300,000 milliseconds
  range: 0, // Self-cast
  requiresTarget: false,
  effects: [
    // Special effect type: 'teleport' to faction hub
    // Note: This doesn't exist yet - custom handling in ability.service.ts
  ],
  iconKey: 'ability_home_recall',
  iconColor: 0x44aaff, // Blue
};

// Add to ALL_ABILITIES array
export const ALL_ABILITIES: readonly AbilityDefinition[] = [
  // ... existing abilities
  ABILITY_HOME_RECALL,
];
```

### Database Schema for Cooldowns

```typescript
// packages/database/src/schema/ability-cooldowns.ts
import { pgTable, uuid, varchar, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Persistent ability cooldowns that survive disconnects and restarts.
 * Rows automatically deleted when expired or when character is deleted (cascade).
 */
export const abilityCooldowns = pgTable('ability_cooldowns', {
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  abilityId: varchar('ability_id', { length: 50 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.characterId, table.abilityId] }),
  // Index for efficient cleanup queries
  expirationIdx: index('cooldown_expiration_idx').on(table.expiresAt),
}));

export type AbilityCooldown = typeof abilityCooldowns.$inferSelect;
export type NewAbilityCooldown = typeof abilityCooldowns.$inferInsert;
```

### Cooldown Persistence Queries

```typescript
// packages/database/src/queries/ability-cooldowns.ts
import { eq, and, gt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { abilityCooldowns } from '../schema/ability-cooldowns';

/**
 * Get active cooldown for a specific ability
 */
export async function getAbilityCooldown(
  db: NodePgDatabase,
  characterId: string,
  abilityId: string
): Promise<{ expiresAt: Date } | null> {
  const result = await db
    .select({ expiresAt: abilityCooldowns.expiresAt })
    .from(abilityCooldowns)
    .where(
      and(
        eq(abilityCooldowns.characterId, characterId),
        eq(abilityCooldowns.abilityId, abilityId),
        gt(abilityCooldowns.expiresAt, new Date()) // Only return if not expired
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Set or update cooldown for an ability
 */
export async function setAbilityCooldown(
  db: NodePgDatabase,
  characterId: string,
  abilityId: string,
  expiresAt: Date
): Promise<void> {
  await db
    .insert(abilityCooldowns)
    .values({ characterId, abilityId, expiresAt })
    .onConflictDoUpdate({
      target: [abilityCooldowns.characterId, abilityCooldowns.abilityId],
      set: { expiresAt },
    });
}

/**
 * Get all active cooldowns for a character
 */
export async function getCharacterCooldowns(
  db: NodePgDatabase,
  characterId: string
): Promise<Array<{ abilityId: string; expiresAt: Date }>> {
  return await db
    .select({
      abilityId: abilityCooldowns.abilityId,
      expiresAt: abilityCooldowns.expiresAt,
    })
    .from(abilityCooldowns)
    .where(
      and(
        eq(abilityCooldowns.characterId, characterId),
        gt(abilityCooldowns.expiresAt, new Date())
      )
    );
}

/**
 * Delete expired cooldowns (cleanup job)
 */
export async function cleanupExpiredCooldowns(
  db: NodePgDatabase
): Promise<number> {
  const result = await db
    .delete(abilityCooldowns)
    .where(gt(new Date(), abilityCooldowns.expiresAt));

  return result.rowCount || 0;
}
```

### Extended Ability Service (Hybrid Cooldown Checking)

```typescript
// apps/game-server/src/game/ability.service.ts

// Add to imports
import { getAbilityCooldown, setAbilityCooldown, getCharacterCooldowns } from '@into-the-void/database';

// Persistent abilities that use database cooldowns
const PERSISTENT_ABILITIES = new Set(['home_recall']);

/**
 * Get all abilities available to a player.
 * Now includes universal abilities like home_recall.
 */
getPlayerAbilities(playerId: string): AbilityDefinition[] {
  const abilityIds = new Set<string>();

  // Universal abilities (always available)
  abilityIds.add('home_recall');

  // Equipment-granted abilities
  const inventory = this.inventoryService.getInventory(playerId);
  if (inventory) {
    // ... existing equipment logic
  }

  // Resolve definitions
  const abilities: AbilityDefinition[] = [];
  for (const id of abilityIds) {
    const ability = AbilityRegistry.get(id);
    if (ability) abilities.push(ability);
  }

  return abilities;
}

/**
 * Check if ability is on cooldown (hybrid: DB for persistent, memory for others)
 */
async isOnCooldown(playerId: string, abilityId: string): Promise<boolean> {
  // Persistent abilities check database
  if (PERSISTENT_ABILITIES.has(abilityId)) {
    const db = this.databaseService.getClient();
    const cooldown = await getAbilityCooldown(db, playerId, abilityId);
    return cooldown !== null; // Cooldown exists = still active
  }

  // Other abilities check in-memory
  const key = `${playerId}:${abilityId}`;
  const endsAt = this.cooldowns.get(key);
  if (!endsAt) return false;
  return Date.now() < endsAt;
}

/**
 * Set ability cooldown (hybrid: DB for persistent, memory for others)
 */
async setCooldown(playerId: string, abilityId: string, cooldownMs: number): Promise<number> {
  const endsAt = Date.now() + cooldownMs;

  // Persistent abilities write to database
  if (PERSISTENT_ABILITIES.has(abilityId)) {
    const db = this.databaseService.getClient();
    await setAbilityCooldown(db, playerId, abilityId, new Date(endsAt));
  } else {
    // Other abilities use in-memory
    const key = `${playerId}:${abilityId}`;
    this.cooldowns.set(key, endsAt);
  }

  return endsAt;
}

/**
 * Handle home_recall ability effect (special case)
 */
async useAbility(
  socketId: string,
  abilityId: string,
  targetEntityId?: string
): Promise<UseAbilityResult> {
  // ... existing validation

  // Special handling for home_recall
  if (abilityId === 'home_recall') {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Teleport to hub
    const result = await this.playerService.teleportToHub(player.id);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Set cooldown
    const cooldownEndsAt = await this.setCooldown(player.id, abilityId, ability.cooldownMs);

    // Update client rooms and emit zone state
    // (Caller in game.gateway.ts must handle this - matches hub:recall pattern)

    return {
      success: true,
      cooldownEndsAt,
    };
  }

  // ... existing ability handling for other types
}
```

### Client-Side Universal Ability Injection

```typescript
// apps/web/src/store/abilityStore.ts

/**
 * Derive equipped abilities from current equipment.
 * Now includes universal abilities.
 */
export function getEquippedAbilities(): AbilityDefinition[] {
  const abilityIds = new Set<string>();

  // Universal abilities (always present)
  abilityIds.add('home_recall');

  // Equipment-granted abilities
  const inventory = useInventoryStore.getState().inventory;
  if (inventory) {
    // ... existing tool/suit/module logic
  }

  // Resolve ability definitions
  const abilities: AbilityDefinition[] = [];
  for (const id of abilityIds) {
    const ability = AbilityRegistry.get(id);
    if (ability) abilities.push(ability);
  }

  return abilities;
}
```

### Initial Cooldown State on Auth

```typescript
// apps/game-server/src/game/game.gateway.ts

async handleAuth(client: Socket, data: AuthRequest): Promise<void> {
  // ... existing auth logic

  if (authResult.success && authResult.player) {
    // ... existing zone state emission

    // Send initial cooldown state for persistent abilities
    const db = this.databaseService.getClient();
    const cooldowns = await getCharacterCooldowns(db, authResult.player.id);
    for (const cooldown of cooldowns) {
      client.emit('ability:cooldown', {
        abilityId: cooldown.abilityId,
        cooldownEndsAt: cooldown.expiresAt.getTime(),
      });
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Equipment-only abilities | Universal + equipment abilities | Phase 96 (this phase) | First non-gear ability |
| In-memory cooldowns | Hybrid (DB for persistent, memory for short) | Phase 96 | Cooldowns survive restarts |
| Manual teleport logic | `PlayerService.teleportToHub()` | Phase 47 | Reusable hub travel |

**Current patterns:**
- Abilities defined in `packages/game-logic/src/ability/definitions.ts`
- Cooldowns managed in `AbilityService` with Map<string, number>
- Client UI derives abilities from `getEquippedAbilities()`
- WebSocket events `ability:use` (client) and `ability:cooldown` (server)

**Deprecated patterns:**
- None - this is a new capability

## Open Questions

1. **Should home recall work from inside hubs?**
   - What we know: `teleportToHub()` returns error if already in hub
   - What's unclear: Should we allow it anyway (no-op) or reject?
   - Recommendation: Reject with error - matches existing behavior, prevents cooldown waste

2. **Energy cost for home recall?**
   - What we know: Requirements say "universal ability" (suggests free)
   - What's unclear: Should there be an energy cost as balancing?
   - Recommendation: Zero energy cost - it's utility, not combat. Cooldown is the limiter.

3. **Show cooldown timer in UI when ability not usable?**
   - What we know: ActionBar.tsx already shows cooldowns for equipped abilities
   - What's unclear: Does it handle long cooldowns (5 min) well?
   - Recommendation: Test with existing UI, format as MM:SS for minutes

4. **Cleanup strategy for expired cooldowns?**
   - What we know: Cooldowns table will accumulate expired rows
   - What's unclear: Cleanup job vs. clean-on-query vs. let database grow?
   - Recommendation: Clean on query (filter `gt(expiresAt, now())` automatically excludes expired). Add periodic cleanup job for housekeeping.

## Sources

### Primary (HIGH confidence)
- `apps/game-server/src/game/ability.service.ts` - Cooldown tracking (lines 18-144)
- `packages/game-logic/src/ability/definitions.ts` - Ability definitions (lines 1-487)
- `packages/shared-types/src/game/ability.ts` - Ability type definitions (lines 1-44)
- `apps/game-server/src/game/player.service.ts` - `teleportToHub()` method (lines 252-292)
- `packages/shared-types/src/network/events.ts` - WebSocket event types (lines 50-60, 94)
- `apps/web/src/store/abilityStore.ts` - Client cooldown management (lines 1-114)
- `packages/database/src/schema/characters.ts` - Database schema pattern (lines 1-67)

### Secondary (MEDIUM confidence)
- `.planning/phases/095-expedition-travel/95-RESEARCH.md` - Similar teleportation feature research
- `.planning/phases/56-core-ability-system/` - Original ability system implementation
- `lore/world-bible.md` - Emergency Rescue Protocol context (lines 943-962)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components exist, patterns established
- Architecture: HIGH - Straightforward extension of existing ability system
- Pitfalls: HIGH - Based on similar features (abilities, hub travel, database persistence)

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable patterns, unlikely to change)
