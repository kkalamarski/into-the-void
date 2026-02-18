# Phase 31: Server Wiring & Socket Delivery - Research

**Researched:** 2026-02-18
**Domain:** NestJS WebSocket gateway, Drizzle ORM JSONB migration, Zustand store wiring, Socket.IO event delivery
**Confidence:** HIGH

## Summary

Phase 31 is a server-side wiring phase that takes the `computeCharStats()` pure function built in Phase 30 and integrates it into the live request path. Three integration points need to be wired: (1) after `auth` handshake completes, (2) after `equipment:change` / `inventory:unequip` / `equipment:tool_swap` mutations, and (3) via a new `stats:update` Socket.IO event that the client receives and stores in a dedicated Zustand store.

The codebase already has all the building blocks: `computeCharStats()` in `game-logic`, the 8-stat `CharacterStats` interface in `shared-types`, the `InventoryService` with equipment state in memory, and `PlayerService.authenticate()` that resolves character level from the database. The missing pieces are: a `CharStatsPayload` interface in `shared-types`, `stats:update` wired into `ServerEvents`, the emit calls in `GameGateway`, and a `statsStore.ts` in the web client.

A one-time JSONB migration script must also be created to update existing `characters.stats` rows from the old 5-stat shape (`strength`, `agility`, `endurance`, `intelligence`, `perception`) to the new 8-stat shape. The `StatsJson` interface in `packages/database/src/schema/characters.ts` already reflects the 8-stat shape, but the actual DB rows were written under the old default. The existing `migrate-equipment-schema.ts` is a template for the new migration script. Crucially, this migration writes to the `characters.stats` JSONB column, not the `inventories` table, so it targets a different schema row.

**Primary recommendation:** Wire `computeCharStats()` into the auth flow and every equip mutation handler in `GameGateway`, add `CharStatsPayload` + `stats:update` to `shared-types`, create `statsStore.ts` as a Zustand store on the client, and add a migration script for the old DB stat rows.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS (project) | Already in use | WebSocket gateway, DI container | All server code is NestJS |
| Socket.IO (project) | Already in use | Real-time event delivery to client | All existing events use Socket.IO |
| Zustand (project) | Already in use | Client state store | Inventory and game stores already use Zustand |
| Drizzle ORM (project) | Already in use | Database queries and schema | All DB access uses Drizzle |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| immer middleware (project) | Already in use | Mutable draft state in Zustand | inventoryStore.ts uses it; statsStore should match |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `stats:update` event | Attach stats to `auth:success` payload | Separate event keeps the auth payload stable and the pattern consistent with `inventory:update`; prior decision mandates this |
| Zustand statsStore | Add stats to gameStore | Prior decision: separate store prevents Phaser re-renders; inventoryStore pattern is the established precedent |

**Installation:** No new packages. All dependencies are already in the monorepo.

## Architecture Patterns

### Recommended Project Structure

Changes are spread across 4 packages:

```
packages/shared-types/src/
├── network/events.ts          # Add 'stats:update' to ServerEventType and ServerEvents
└── game/
    └── stats.ts (NEW)         # CharStatsPayload interface

packages/database/src/
└── migrations/
    └── migrate-stats-schema.ts (NEW)   # One-time JSONB migration for characters.stats

apps/game-server/src/game/
└── game.gateway.ts            # Emit stats:update after auth and after every equip mutation

apps/web/src/store/
└── statsStore.ts (NEW)        # Zustand store: CharStatsPayload | null + socket wiring
```

### Pattern 1: CharStatsPayload Interface

**What:** A network-level type wrapping `CharacterStats` with a breakdown of base vs equipment contribution. The server computes and serialises this; the client only renders it.
**When to use:** Always when emitting `stats:update` — never inlined.

```typescript
// packages/shared-types/src/game/stats.ts (NEW FILE)
import { CharacterStats } from '../core/player';

export interface CharStatsPayload {
  /** Total effective stats (base + equipment) */
  total: CharacterStats;
  /** Base stats without any equipment contribution */
  base: CharacterStats;
  /** Delta from equipment only */
  equipment: CharacterStats;
}
```

The breakdown (base + delta) is required by success criterion 1: "containing all 8 computed stats including the breakdown of base vs equipment contribution." `computeCharStats()` only returns the total; the breakdown requires calling it twice (once with empty equipment for base, once with real equipment for total).

### Pattern 2: Stats Emit in GameGateway

**What:** After auth and after each equip mutation, compute stats and emit `stats:update` to the requesting socket.
**When to use:** Exactly two call sites — `handleAuth` and `handleEquipmentChange` / `handleInventoryUnequip` / `handleToolSwap`.

```typescript
// In GameGateway — private helper method
private async emitStats(client: Socket, playerId: string): Promise<void> {
  const inventory = this.inventoryService.getInventory(playerId);
  const player = this.playerService.getPlayerById(playerId);
  if (!inventory || !player) return;

  const emptyEquipment: EquipmentJson = { modules: [] };
  const base = computeCharStats(player.level, emptyEquipment, 'player');
  const total = computeCharStats(player.level, inventory.equipment as EquipmentJson, 'player');

  // Delta: equipment contribution
  const equipment: CharacterStats = {
    durability: total.durability - base.durability,
    toughness: total.toughness - base.toughness,
    power: total.power - base.power,
    haste: total.haste - base.haste,
    vigor: total.vigor - base.vigor,
    recovery: total.recovery - base.recovery,
    perception: total.perception - base.perception,
    resilience: total.resilience - base.resilience,
  };

  const payload: CharStatsPayload = { total, base, equipment };
  client.emit('stats:update', payload);
}
```

**Call sites:**
- In `handleAuth`, after `client.emit('inventory:update', inventory)` → add `await this.emitStats(client, result.player.id)`
- In `handleEquipmentChange`, after `client.emit('inventory:update', result.inventory)` → add `await this.emitStats(client, player.id)`
- In `handleInventoryUnequip`, after `client.emit('inventory:update', result.inventory)` → add same
- In `handleToolSwap`, after `client.emit('inventory:update', result.inventory)` → add same

### Pattern 3: Zustand statsStore

**What:** Separate Zustand store for `CharStatsPayload`, following `inventoryStore.ts` exactly.
**When to use:** Any client component that needs to render character stats.

```typescript
// apps/web/src/store/statsStore.ts (NEW)
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CharStatsPayload } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

interface StatsState {
  stats: CharStatsPayload | null;
  setStats: (payload: CharStatsPayload) => void;
  clearStats: () => void;
}

export const useStatsStore = create<StatsState>()(
  immer((set) => ({
    stats: null,

    setStats: (payload) =>
      set((state) => {
        state.stats = payload;
      }),

    clearStats: () =>
      set((state) => {
        state.stats = null;
      }),
  }))
);

// Wire socket event
gameSocket.on('stats:update', (payload: CharStatsPayload) => {
  useStatsStore.getState().setStats(payload);
});
```

Note: `gameSocket.on` uses the `ServerEvents` map. Adding `'stats:update': CharStatsPayload` to `ServerEvents` is required for TypeScript to accept this call.

### Pattern 4: JSONB Migration Script for characters.stats

**What:** Idempotent script that updates `characters.stats` rows from old 5-stat shape to 8-stat defaults.
**Model:** Follow `migrate-equipment-schema.ts` exactly.

```typescript
// packages/database/src/migrations/migrate-stats-schema.ts (NEW)
// Usage: npx ts-node packages/database/src/migrations/migrate-stats-schema.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { characters } from '../schema/characters';

// 8-stat level-1 defaults from SCALE_CONSTANTS.player.base in game-logic
const NEW_STATS_DEFAULT = {
  durability: 100,
  toughness: 50,
  power: 50,
  haste: 50,
  vigor: 80,
  recovery: 30,
  perception: 40,
  resilience: 30,
};

function hasOldShape(stats: unknown): boolean {
  if (!stats || typeof stats !== 'object') return false;
  const obj = stats as Record<string, unknown>;
  return 'strength' in obj || 'agility' in obj || 'endurance' in obj || 'intelligence' in obj;
}

async function migrateStatsSchema(): Promise<void> {
  const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }));
  const rows = await db.select().from(characters);
  let migrated = 0;

  for (const row of rows) {
    if (hasOldShape(row.stats)) {
      await db
        .update(characters)
        .set({ stats: NEW_STATS_DEFAULT })
        .where(eq(characters.id, row.id));
      migrated++;
    }
  }

  console.log(`Migration complete. Migrated: ${migrated}`);
}

migrateStatsSchema().catch(console.error);
```

**Key detail:** The `characters.stats` column does not have a Drizzle migration file dependency — it is a JSONB column with a default value that was set at table creation (`0000_wakeful_steel_serpent.sql`). This script updates in-place at the application layer, not at the SQL migration layer. No new Drizzle migration is needed for this change.

### Anti-Patterns to Avoid

- **Attaching stats to `auth:success` payload:** The success payload shape is `{ player: Player }`. Changing it breaks the existing `socket.authenticate()` promise resolution. Emit `stats:update` as a separate event after auth.
- **Computing stats on the client:** The `computeCharStats()` function exists in `game-logic`, a server-side package. Client must only consume the `CharStatsPayload` emitted by the server; never import `computeCharStats` in `apps/web`.
- **Forgetting `emitStats` in `handleToolSwap`:** Tool swap changes which item is equipped in the tool slot, which changes equipment bonuses. All four equip-mutation handlers must emit stats.
- **Using `effectiveStats()` instead of `computeCharStats()`:** The old `effectiveStats()` in `inventory/stats.ts` computes `ComputedStats` (armor, speedMultiplier, etc.) — a different shape. `computeCharStats()` computes `CharacterStats` (8 named stats). These are different functions for different purposes. Phase 31 uses `computeCharStats()`.
- **Emitting stats to all zone players:** `stats:update` is a private event — only the requesting player should receive it. Always use `client.emit`, never `this.server.to(zoneId).emit`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Equipment bonus aggregation | Custom for-loop over items | `computeCharStats()` from game-logic | Already written, tested, handles edge cases |
| JSONB shape detection | Custom `Object.keys()` check | `'strength' in obj` pattern from migrate-equipment-schema.ts | Already proven idempotent pattern |
| Zustand store with immer | Plain useState / useReducer | Zustand + immer (same as inventoryStore) | Prevents Phaser re-renders, consistent with codebase |

**Key insight:** The entire computation stack already exists — the only work in Phase 31 is wiring calls and plumbing types.

## Common Pitfalls

### Pitfall 1: Missing Stats Emit After Tool Swap
**What goes wrong:** `handleToolSwap` changes which tool is active but `stats:update` is not emitted, causing stale stats on the client.
**Why it happens:** Tool swap is easy to overlook because it does not involve equipping a new item category — just swapping which tool slot is active.
**How to avoid:** Add `emitStats` call in all four handlers: `handleEquipmentChange`, `handleInventoryUnequip`, `handleToolSwap`, and `handleAuth`.
**Warning signs:** Client stats do not update after pressing the tool-swap hotkey.

### Pitfall 2: `stats:update` Missing from `ServerEvents` TypeScript Map
**What goes wrong:** `gameSocket.on('stats:update', ...)` in `statsStore.ts` causes a TypeScript error because the key does not exist in `ServerEvents`. The `socket.ts` server event loop also misses the event because it iterates over `serverEvents: (keyof ServerEvents)[]`.
**Why it happens:** TypeScript enforces the `ServerEvents` map. Both the `on()` type and the loop array must be updated.
**How to avoid:** Add `'stats:update': CharStatsPayload` to `ServerEvents` interface AND add `'stats:update'` to the `serverEvents` array in `socket.ts`.
**Warning signs:** TypeScript compilation error in `statsStore.ts` or `socket.ts`.

### Pitfall 3: Empty Equipment Object Shape
**What goes wrong:** `computeCharStats(level, emptyEquipment)` crashes if `emptyEquipment` does not include the `modules: []` array, because `char-stats.ts` spreads `equipment.modules`.
**Why it happens:** `EquipmentJson.modules` is a required `InventoryItemJson[]` (not optional). An object `{}` does not satisfy the type.
**How to avoid:** Always use `const emptyEquipment: EquipmentJson = { modules: [] }` for base stat computation.
**Warning signs:** Runtime error "Cannot read properties of undefined (reading 'length')" or TypeScript error at the call site.

### Pitfall 4: Migration Script Targets Wrong Table
**What goes wrong:** Migration script updates `inventories.equipment` (already done by `migrate-equipment-schema.ts`) instead of `characters.stats`.
**Why it happens:** Two separate migration scripts needed; easy to confuse the target tables.
**How to avoid:** New migration imports `characters` from `../schema/characters`, not `inventories`. Verify with `db.select().from(characters)`.
**Warning signs:** Script reports 0 rows migrated; characters still return old stat shape.

### Pitfall 5: `effectiveStats()` vs `computeCharStats()` Confusion
**What goes wrong:** `game.service.ts` already calls `effectiveStats()` in the equip/unequip handlers and attaches the result to `inventory.stats`. If Phase 31 replaces these calls with `computeCharStats()`, the old `stats` field on the inventory payload will disappear, potentially breaking client code that reads `inventory.stats`.
**Why it happens:** `game.service.ts` has `EquipResult.inventory?: Inventory & { stats?: ComputedStats }` — an inline extension of the inventory type.
**How to avoid:** Keep the existing `effectiveStats()` calls in `game.service.ts` as-is (they serve `ComputedStats` which the UI may already depend on). Add `computeCharStats()` calls only in `GameGateway` via the new private `emitStats()` helper. Both coexist without conflict.
**Warning signs:** Existing inventory UI loses stat display after Phase 31.

### Pitfall 6: StatsJson DB Default Doesn't Match Migration Target
**What goes wrong:** After running the migration script, newly created characters use the Drizzle schema default (correct 8-stat shape), but the migration logic only detects OLD shape by presence of `strength` key. If a character row was created with the new schema default already applied (e.g., created after Phase 30 schema change), the migration correctly skips it.
**Why it happens:** The schema default in `characters.ts` was updated in Phase 30. Characters created before Phase 30 have old shape; characters created after have new shape.
**How to avoid:** The `hasOldShape()` check on `'strength' in obj` is correct — new-shape rows will not have this key and will be skipped. This is already idempotent.
**Warning signs:** None; this is correct behavior.

## Code Examples

Verified patterns from the codebase:

### Calling computeCharStats with empty equipment for base stats

```typescript
// Source: packages/game-logic/src/stats/char-stats.ts (Phase 30 output)
import { computeCharStats } from '@into-the-void/game-logic';
import type { EquipmentJson } from '@into-the-void/database';

// Empty equipment — produces pure level-scaled base stats
const emptyEquipment: EquipmentJson = { modules: [] };
const base = computeCharStats(player.level, emptyEquipment, 'player');

// Real equipment — produces total stats (base + bonuses)
const total = computeCharStats(player.level, inventory.equipment as EquipmentJson, 'player');
```

### Adding a new server event to ServerEvents (shared-types)

```typescript
// Source: packages/shared-types/src/network/events.ts (current)

// Step 1: Add to ServerEventType union
export type ServerEventType =
  | 'zone:state'
  | /* ... existing ... */
  | 'stats:update';   // ADD THIS

// Step 2: Add to ServerEvents interface
export interface ServerEvents {
  // ... existing entries ...
  'stats:update': import('../game/stats').CharStatsPayload;  // ADD THIS
}
```

### Adding stats:update to socket.ts event loop

```typescript
// Source: apps/web/src/network/socket.ts (current)
const serverEvents: (keyof ServerEvents)[] = [
  'zone:state',
  // ... existing entries ...
  'stats:update',  // ADD THIS — must match the ServerEvents key exactly
];
```

### Adding new export to shared-types index

```typescript
// Source: packages/shared-types/src/index.ts (current pattern)
// Game types
export * from './game/faction';
export * from './game/biome';
export * from './game/combat';
export * from './game/inventory';
export * from './game/storage';
export * from './game/entity-registry';
export * from './game/stats';   // ADD THIS (new file)
```

### Drizzle: select + update pattern (from existing migration script)

```typescript
// Source: packages/database/src/migrations/migrate-equipment-schema.ts
const rows = await db.select().from(characters);
for (const row of rows) {
  if (hasOldShape(row.stats)) {
    await db
      .update(characters)
      .set({ stats: NEW_STATS_DEFAULT })
      .where(eq(characters.id, row.id));
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `effectiveStats()` returns `ComputedStats` (derived, non-linear) | `computeCharStats()` returns `CharacterStats` (8-stat, linear+equipment) | Phase 30 | Two separate functions now serve different purposes; both coexist |
| `inventory & { stats?: ComputedStats }` inline extension | `CharStatsPayload` as dedicated network type | Phase 31 | Stats have a proper contract and are delivered via their own socket event |
| No client stats store | `statsStore.ts` separate Zustand store | Phase 31 | Follows `inventoryStore` precedent; prevents Phaser re-renders |
| `characters.stats` DB column has old 5-stat default | 8-stat shape via migration script | Phase 31 | All existing rows become well-formed after migration |

**Current `game.service.ts` has residual `effectiveStats()` calls that produce `ComputedStats`:**
- These are intentional — `ComputedStats` (armor, speed, etc.) is a different computed shape from `CharacterStats` (8 named stats).
- Phase 31 adds `CharStatsPayload` delivery without removing `ComputedStats` delivery.
- Future cleanup (removing `ComputedStats` or merging the two) is out of scope.

## Open Questions

1. **Should `CharStatsPayload` be exported from `shared-types/src/game/stats.ts` (new file) or added to `player.ts`?**
   - What we know: `CharacterStats` lives in `player.ts`; network payload types live in `network/events.ts` or game-specific files.
   - What's unclear: No precedent for a network payload type in a game-domain file.
   - Recommendation: Create `packages/shared-types/src/game/stats.ts` as a new file (consistent with `game/inventory.ts`, `game/combat.ts` pattern). Export from `shared-types/src/index.ts`.

2. **Does `updateCharacterStats()` DB query need to be added to `database/queries/characters.ts`?**
   - What we know: Phase 31 does not save computed stats back to the DB — it computes them on-demand from level + equipment. The migration script writes to the `stats` column, but only to repair old rows.
   - What's unclear: Whether any future phase (e.g., leveling up) needs to persist base stats to DB.
   - Recommendation: Do NOT add `updateCharacterStats()` in Phase 31. Computed stats are derived on demand. If persistence is needed, it belongs to a future level-up phase.

3. **Does `stim_endurance_rare` item (uses old stat name `endurance`) need to be updated?**
   - What we know: `packages/items/src/definitions/consumables.ts` has an item that applies `stat_buff` to `endurance`. In `computeCharStats()`, unknown stat names are silently skipped.
   - What's unclear: Whether this item should map `endurance` → `toughness` or just be left as a no-op buff.
   - Recommendation: Out of scope for Phase 31 (STAT requirements don't cover item renaming). Note in code comment. A future item cleanup pass will handle this.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all modified/created files
- `packages/game-logic/src/stats/char-stats.ts` — Phase 30 output, `computeCharStats()` signature
- `packages/shared-types/src/core/player.ts` — `CharacterStats`, `StatScaleTarget` types
- `packages/shared-types/src/network/events.ts` — `ServerEvents` interface pattern
- `apps/game-server/src/game/game.gateway.ts` — all equip mutation handlers, emit patterns
- `apps/game-server/src/game/game.service.ts` — `effectiveStats()` usage, `EquipResult` shape
- `apps/game-server/src/game/player.service.ts` — `authenticate()` flow, player level access
- `apps/game-server/src/game/inventory.service.ts` — `loadForPlayer()` pattern, memory cache
- `apps/web/src/store/inventoryStore.ts` — Zustand + immer + socket wiring pattern to replicate
- `apps/web/src/network/socket.ts` — `serverEvents` array pattern, `on()` typing
- `packages/database/src/schema/characters.ts` — `StatsJson` interface, current 8-stat default
- `packages/database/src/migrations/migrate-equipment-schema.ts` — migration script template

### Secondary (MEDIUM confidence)
- Phase 30 RESEARCH.md — architectural decisions confirmed as implemented

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — patterns derived directly from existing code (inventoryStore, migrate-equipment-schema)
- Pitfalls: HIGH — identified from reading actual call sites and type definitions

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable codebase, no external dependencies changing)
