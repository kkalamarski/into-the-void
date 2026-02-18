# Architecture Research — Character Stats System

**Domain:** Character stat system integration in existing multiplayer 2D sci-fi survival MMO
**Researched:** 2026-02-18
**Confidence:** HIGH (entire codebase read directly; no external sources needed)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENT (apps/web)                                               │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐  │
│  │  statsStore.ts       │   │  StatsPanel.tsx (HUD component)  │  │
│  │  (Zustand + immer)   │   │  shows base / level / equip      │  │
│  │  stats: CharStats    │   │  breakdown per stat              │  │
│  │  setStats(payload)   │   └──────────────────────────────────┘  │
│  └──────────┬───────────┘                                         │
│             │ subscribes                                           │
│  ┌──────────▼─────────────────────────────────────────────────┐   │
│  │  gameSocket  <--  'stats:update'  (server push)            │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              Socket.IO
┌──────────────────────────────────────────────────────────────────┐
│  GAME SERVER (apps/game-server)                                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  StatsService (NEW)                                           │  │
│  │  — computeAndEmit(playerId, character, inventory): void       │  │
│  │  — delegates pure math to game-logic                          │  │
│  │  — called on auth + after any equip/unequip event             │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
│                   │ calls                                           │
│  ┌────────────────▼─────────────────────────────────────────────┐  │
│  │  GameGateway (MODIFIED)                                        │  │
│  │  — injects StatsService                                        │  │
│  │  — calls computeAndEmit after handleAuth + equip events        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                           Shared packages
┌──────────────────────────────────────────────────────────────────┐
│  packages/game-logic/src/stats/   (NEW MODULE)                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  definitions.ts  — STAT_DEFINITIONS: StatDefinition[]        │  │
│  │  computation.ts  — computeCharStats(): pure function          │  │
│  │  index.ts        — re-exports                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  packages/shared-types/src/core/stats.ts  (NEW)                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  PrimaryStatId, BaseStats, StatBreakdown, CharStatsPayload    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  packages/database/src/schema/characters.ts  (MODIFIED)           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  StatsJson -> BaseStats: 8 fields with new names (jsonb)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `packages/shared-types/src/core/stats.ts` | Canonical type definitions: `PrimaryStatId`, `BaseStats`, `StatBreakdown`, `CharStatsPayload` | NEW |
| `packages/game-logic/src/stats/definitions.ts` | `STAT_DEFINITIONS` array — base values and perLevelBonus for all 8 stats | NEW |
| `packages/game-logic/src/stats/computation.ts` | Pure `computeCharStats()` function; no DB, no side effects | NEW |
| `packages/database/src/schema/characters.ts` | Replace `StatsJson` type with 8 new stat fields | MODIFIED |
| `apps/game-server/src/game/stats.service.ts` | Loads character + equipment, calls `computeCharStats`, emits `stats:update` | NEW |
| `apps/game-server/src/game/game.gateway.ts` | Injects `StatsService`; calls `computeAndEmit` after auth + equip events | MODIFIED |
| `apps/game-server/src/game/player.service.ts` | Passes character `baseStats` into `Player` object on authenticate | MODIFIED |
| `apps/web/src/store/statsStore.ts` | Zustand store holding `CharStatsPayload`; wired to `stats:update` socket event | NEW |
| `packages/shared-types/src/network/events.ts` | Add `'stats:update': CharStatsPayload` to `ServerEvents` | MODIFIED |

---

## Existing Architecture — Ground Truth

Before integration recommendations, this is what the codebase contains today regarding stats.

### Current Stat Shape (Must Be Replaced)

There are two conflicting stat shapes that need to converge:

| Location | Current Shape | Current Stat Names |
|----------|-------------|-------------------|
| `packages/database/src/schema/characters.ts` `StatsJson` | jsonb column on `characters` table | `strength`, `agility`, `endurance`, `intelligence`, `perception` |
| `packages/shared-types/src/core/player.ts` `PlayerStats` | TypeScript interface | `strength`, `agility`, `endurance`, `intelligence`, `perception` |
| `packages/game-logic/src/inventory/stats.ts` `ComputedStats` | Equipment-derived overlay (separate concern, unchanged) | `armor`, `speedMultiplier`, `hazardResistance`, etc. |

The milestone requires replacing `StatsJson` and `PlayerStats` with 8 named primary stats: `Durability`, `Toughness`, `Power`, `Haste`, `Vigor`, `Recovery`, `Perception`, `Resilience`.

`Perception` is the only name shared between old and new. All others need migration.

### What Exists That the Stats System Can Leverage

| Asset | File | Relevance |
|-------|------|-----------|
| `effectiveStats(equipment)` | `game-logic/src/inventory/stats.ts` | Already routes unknown `stat_buff` effects to `ComputedStats.bonuses` — the equipment bonus path for primary stats flows through here without code changes |
| `stat_buff` ItemEffect | `packages/items/src/types.ts` | Already has `{ type: 'stat_buff', stat: string, amount: number }`. Equipment granting primary stat bonuses just sets `stat` to the `PrimaryStatId` string |
| `DamageParams.attackerStats` | `game-logic/src/combat/damage.ts` | Uses `Partial<PlayerStats>` — must be updated to `Partial<BaseStats>` |
| In-memory player Map | `game-server/src/game/player.service.ts` | `ConnectedPlayer` can hold `baseStats` — same as it already holds `health`, `level`, `xp` |
| `InventoryService` loaded on auth | `game-server/src/game/inventory.service.ts` | Equipment is already available at auth time — `StatsService` can immediately compute stats on first connect |

---

## Recommended Project Structure

### New Files

```
packages/
  shared-types/src/core/
    stats.ts                       # PrimaryStatId, BaseStats, CharStatsPayload

  game-logic/src/stats/
    definitions.ts                 # STAT_DEFINITIONS constant
    computation.ts                 # computeCharStats() pure function
    index.ts                       # re-exports

apps/
  game-server/src/game/
    stats.service.ts               # orchestrator NestJS service

  web/src/store/
    statsStore.ts                  # Zustand store for CharStatsPayload

  web/src/components/
    StatsPanel.tsx                 # HUD panel displaying stat breakdown
```

### Modified Files

```
packages/
  shared-types/src/core/player.ts           # Remove PlayerStats; import from stats.ts
  shared-types/src/network/events.ts        # Add 'stats:update' to ServerEvents
  database/src/schema/characters.ts         # Replace StatsJson type + default values
  game-logic/src/combat/damage.ts           # DamageParams uses Partial<BaseStats>
  game-logic/src/index.ts                   # Export stats/ module

apps/
  game-server/src/game/game.gateway.ts      # Inject StatsService; emit after auth + equip
  game-server/src/game/game.module.ts       # Register StatsService as provider
  game-server/src/game/player.service.ts    # Add baseStats field to ConnectedPlayer
```

---

## Architectural Patterns

### Pattern 1: Stats as a Separate Zustand Store

**What:** `statsStore.ts` is a dedicated Zustand store with immer middleware. It does not live in `gameStore`.

**When to use:** Any time the stats panel or other HUD components need access to computed stat values.

**Trade-offs:** One more store file, but isolation is worth it. The existing `inventoryStore.ts` demonstrates this split is intentional — adding stats to `gameStore` would cause Phaser to re-render on every stat change because `gameStore` is subscribed to by the Phaser game instance.

**Example:**
```typescript
// apps/web/src/store/statsStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CharStatsPayload } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

interface StatsState {
  stats: CharStatsPayload | null;
  setStats: (payload: CharStatsPayload) => void;
}

export const useStatsStore = create<StatsState>()(
  immer((set) => ({
    stats: null,
    setStats: (payload) => set((s) => { s.stats = payload; }),
  }))
);

// Wire socket event — identical pattern to inventoryStore.ts
gameSocket.on('stats:update', (payload: CharStatsPayload) => {
  useStatsStore.getState().setStats(payload);
});
```

### Pattern 2: Pure Computation in game-logic, Orchestration in game-server

**What:** `computeCharStats()` lives in `packages/game-logic` (pure function, zero dependency on NestJS or DB). `StatsService` in game-server orchestrates: fetches character from PlayerService, gets equipment from InventoryService, calls the pure function, emits the result over the socket.

**When to use:** Stat computation is needed. Always go through this path.

**Trade-offs:** One more indirection, but the pure function is trivially testable and the same function serves both players and creatures in the combat phase.

**Example:**
```typescript
// packages/game-logic/src/stats/computation.ts
export function computeCharStats(
  baseStats: BaseStats,
  level: number,
  equipment: EquipmentJson
): CharStatsPayload {
  const computed = effectiveStats(equipment); // existing function, unchanged

  const breakdown = {} as Record<PrimaryStatId, StatBreakdown>;
  for (const def of STAT_DEFINITIONS) {
    const base = baseStats[def.id] ?? def.baseValue;
    const levelBonus = level * def.perLevelBonus;
    const equipmentBonus = computed.bonuses[def.id] ?? 0; // flows through existing bonuses map
    breakdown[def.id] = {
      base,
      levelBonus,
      equipmentBonus,
      total: base + levelBonus + equipmentBonus,
    };
  }
  return { breakdown, characterLevel: level };
}
```

### Pattern 3: Equipment Bonuses Flow Through Existing bonuses Map

**What:** The existing `effectiveStats()` function already routes any stat with an unknown key into `ComputedStats.bonuses[stat]`. An item module with a `stat_buff` effect where `stat: 'power'` already lands in `computed.bonuses['power']` without any code change. `computeCharStats()` reads from this map.

**When to use:** Any equipment item granting a bonus to a primary stat. No new switch-case branches needed in `effectiveStats()`.

**Trade-offs:** The stat IDs used in item definitions must exactly match the `PrimaryStatId` union values (lowercase: `'power'`, not `'Power'`). This is a convention the team must follow when writing item definitions.

---

## Data Flow

### Request Flow — Auth (Stats Initialization)

```
Client connects -> sends 'auth' with JWT + characterId
    |
GameGateway.handleAuth()
    |
PlayerService.authenticate() -> loads character from DB (includes BaseStats)
    |
InventoryService.loadForPlayer() -> loads equipment (already called at auth)
    |
StatsService.computeAndEmit(playerId, character, inventory)
    | calls computeCharStats() from game-logic (pure, <1ms)
    |
client.emit('stats:update', CharStatsPayload)
    |
statsStore.setStats(payload) in React
    |
StatsPanel renders breakdown table
```

### Request Flow — Equip/Unequip (Stats Recalculation)

```
Client sends 'equipment:change' or 'inventory:unequip'
    |
GameGateway.handleEquipmentChange() or handleInventoryUnequip()
    |
InventoryService.equipItem() or unequipItem() -> persists to DB, emits inventory:update
    |
StatsService.computeAndEmit(playerId) -- reads from PlayerService + InventoryService in-memory
    |
client.emit('stats:update', CharStatsPayload)
    |
statsStore.setStats(payload) -> StatsPanel re-renders
```

### State Management

```
server emits 'stats:update'
    |
statsStore.setStats()
    |
useStatsStore() hook in StatsPanel (subscribes)
    |
StatsPanel renders: for each stat, shows base / levelBonus / equipmentBonus / total
```

### Key Data Flows

1. **Stats read by combat:** `StatsService.computeCharStats(character, equipment)` called inline in game-server combat handler. The client's `statsStore` is display-only and never read by the server.

2. **Creatures in combat phase:** Creatures carry their own `BaseStats` and level. The same `computeCharStats()` pure function applies. No new abstraction or duplicate code needed.

---

## Integration Points

### New vs. Modified — Complete Inventory

| File | Status | Change |
|------|--------|--------|
| `packages/shared-types/src/core/stats.ts` | NEW | `PrimaryStatId`, `BaseStats`, `StatBreakdown`, `CharStatsPayload` |
| `packages/shared-types/src/network/events.ts` | MODIFIED | Add `'stats:update': CharStatsPayload` to `ServerEvents` |
| `packages/shared-types/src/core/player.ts` | MODIFIED | Remove `PlayerStats`; replace with import from `stats.ts` |
| `packages/database/src/schema/characters.ts` | MODIFIED | Replace `StatsJson` with `BaseStats` (8 new field names + new defaults) |
| `packages/game-logic/src/stats/definitions.ts` | NEW | `STAT_DEFINITIONS` constant (base values + perLevelBonus per stat) |
| `packages/game-logic/src/stats/computation.ts` | NEW | `computeCharStats()` pure function |
| `packages/game-logic/src/stats/index.ts` | NEW | Re-exports |
| `packages/game-logic/src/index.ts` | MODIFIED | Add `export * from './stats'` |
| `packages/game-logic/src/combat/damage.ts` | MODIFIED | `DamageParams.attackerStats` / `defenderStats` -> `Partial<BaseStats>` |
| `packages/game-logic/src/inventory/stats.ts` | NOT MODIFIED | `effectiveStats()` works unchanged; bonuses map already accepts any string key |
| `apps/game-server/src/game/stats.service.ts` | NEW | Orchestrates computation + socket emission |
| `apps/game-server/src/game/game.gateway.ts` | MODIFIED | Inject `StatsService`; call `computeAndEmit` after auth and equip/unequip |
| `apps/game-server/src/game/game.module.ts` | MODIFIED | Register `StatsService` as provider |
| `apps/game-server/src/game/player.service.ts` | MODIFIED | Add `baseStats: BaseStats` to `ConnectedPlayer`; populate on authenticate |
| `apps/web/src/store/statsStore.ts` | NEW | Zustand + immer store; wired to `stats:update` socket event |
| `apps/web/src/components/StatsPanel.tsx` | NEW | HUD component rendering stat breakdown table |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `GameGateway` <-> `StatsService` | Direct method call (NestJS injection) | `StatsService` injected into `GameGateway` via `GameModule` |
| `StatsService` <-> `PlayerService` | `playerService.getPlayerById(playerId)` | Reads `baseStats` and `level` from in-memory player |
| `StatsService` <-> `InventoryService` | `inventoryService.getInventory(playerId)` | Reads `equipment` from in-memory inventory |
| `StatsService` <-> `game-logic/stats` | Import and call `computeCharStats()` | Pure function, synchronous, no async |
| `statsStore` <-> `gameSocket` | `gameSocket.on('stats:update', ...)` | Same pattern as `inventoryStore.ts` |
| `StatsPanel` <-> `statsStore` | `useStatsStore()` hook | Standard Zustand subscribe |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k players | `computeCharStats()` is pure, synchronous, <1ms. Emit on every equip event. No concern. |
| 1k-10k players | If equip event frequency spikes, debounce `stats:update` emissions by 50ms per player. |
| 10k+ players | Cache `CharStatsPayload` in-memory per player in `StatsService`; invalidate on equip event. Avoids recomputing if multiple reads happen before next equip. |

---

## Anti-Patterns

### Anti-Pattern 1: Computing Stats on the Client

**What people do:** Client derives stat totals from level + equipment locally. Skips `stats:update` event.

**Why it's wrong:** Server is authoritative. Client-computed stats can be exploited. Combat calculations on the server must use server-computed values. Client is display-only.

**Do this instead:** Client receives `CharStatsPayload` from server via `stats:update`. It renders what it receives. The `statsStore` holds server truth, not a local derivation.

### Anti-Pattern 2: Adding Stats to gameStore

**What people do:** Attach `CharStatsPayload` to the main `gameStore` for convenience.

**Why it's wrong:** `gameStore` is subscribed to by the Phaser game instance. Stat updates on every equip event trigger unnecessary Phaser render cycles. The `inventoryStore` separation exists precisely to prevent this — apply the same lesson.

**Do this instead:** Create `statsStore.ts` as a dedicated Zustand store with immer, identical in structure to `inventoryStore.ts`.

### Anti-Pattern 3: Storing Computed Stats in the Database

**What people do:** Persist total stat values to the `characters` table after each equip change.

**Why it's wrong:** Computed stats are derived data. Storing derived data creates a synchronization problem: the cached totals in DB may not match the current equipment state. Any equipment change requires updating both the equipment and the stat cache atomically.

**Do this instead:** DB stores only `BaseStats` (the raw inputs). Computed totals are derived fresh on demand by `computeCharStats()`. This is fast enough to not require caching.

### Anti-Pattern 4: Separate Stat Definitions for Players and Creatures

**What people do:** Create a separate `CreatureStats` type or duplicate `STAT_DEFINITIONS` for the creature system in the combat phase.

**Why it's wrong:** The milestone explicitly states stats will be reused for creatures. A parallel definition means two lists to maintain in sync, and two code paths for the same calculation.

**Do this instead:** `BaseStats` and `computeCharStats()` are generic. Creature definitions provide their own numeric values for the same 8 stat IDs. Same pure function, different inputs.

---

## Suggested Build Order (Within Milestone)

Dependencies flow upward: shared-types must exist before game-logic can import types, which must exist before game-server can import functions, which must exist before web can wire events.

1. **`packages/shared-types/src/core/stats.ts`** — Defines all types. Nothing else can compile without this. Also add `'stats:update'` to `ServerEvents` here.

2. **`packages/database/src/schema/characters.ts`** — Replace `StatsJson` with new 8-field type. Run `pnpm db:push` (dev) to apply schema change. Existing character rows will have old field names in JSON — provide a one-time migration script to rename keys.

3. **`packages/shared-types/src/core/player.ts`** — Remove `PlayerStats`; add `baseStats: BaseStats` field to `Player` interface.

4. **`packages/game-logic/src/stats/`** — `definitions.ts` + `computation.ts` + `index.ts`. Update `game-logic/src/index.ts` to export the new module.

5. **`packages/game-logic/src/combat/damage.ts`** — Update `DamageParams` type (rename stats fields to new names).

6. **`apps/game-server/src/game/stats.service.ts`** — Depends on game-logic computation + PlayerService + InventoryService.

7. **`apps/game-server/src/game/game.module.ts`** + **`game.gateway.ts`** — Register and inject StatsService; add `computeAndEmit` calls after auth and all equip/unequip events.

8. **`apps/web/src/store/statsStore.ts`** — Depends on shared-types `CharStatsPayload` and gameSocket.

9. **`apps/web/src/components/StatsPanel.tsx`** — Depends only on `statsStore`. HUD component built last.

---

## Sources

- Codebase (direct read, 2026-02-18): `packages/database/src/schema/characters.ts` — `StatsJson` shape
- Codebase (direct read, 2026-02-18): `packages/shared-types/src/core/player.ts` — `PlayerStats` shape
- Codebase (direct read, 2026-02-18): `packages/game-logic/src/inventory/stats.ts` — `effectiveStats()` and `ComputedStats`
- Codebase (direct read, 2026-02-18): `packages/game-logic/src/inventory/effects.ts` — `stat_buff` routing via `bonuses`
- Codebase (direct read, 2026-02-18): `packages/game-logic/src/combat/damage.ts` — `DamageParams` using `PlayerStats`
- Codebase (direct read, 2026-02-18): `packages/items/src/types.ts` — `stat_buff` ItemEffect interface
- Codebase (direct read, 2026-02-18): `apps/game-server/src/game/player.service.ts` — ConnectedPlayer shape + in-memory map pattern
- Codebase (direct read, 2026-02-18): `apps/game-server/src/game/inventory.service.ts` — InventoryService in-memory pattern
- Codebase (direct read, 2026-02-18): `apps/game-server/src/game/game.gateway.ts` — event handler injection pattern
- Codebase (direct read, 2026-02-18): `apps/web/src/store/inventoryStore.ts` — separate Zustand store pattern (rationale for statsStore)
- Codebase (direct read, 2026-02-18): `apps/web/src/store/gameStore.ts` — Phaser Game instance in store (reason NOT to add stats here)
- Confidence: HIGH — all claims verified against actual source files

---

*Architecture research for: Character stats system — Into the Void MMO*
*Researched: 2026-02-18*
