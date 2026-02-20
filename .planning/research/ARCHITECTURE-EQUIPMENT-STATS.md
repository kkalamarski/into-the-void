# Architecture Research: Equipment Stats Integration

**Domain:** Equipment stats system integration
**Researched:** 2026-02-21
**Confidence:** HIGH

## Current Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (apps/web)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   GameUI    │  │ EquipPanel  │  │   StatsUI   │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                          │                                   │
│                    [Socket.IO]                               │
│                          │                                   │
├──────────────────────────┼───────────────────────────────────┤
│                    GAME SERVER                               │
├──────────────────────────┼───────────────────────────────────┤
│  ┌──────────────────────▼────────────────────────────────┐   │
│  │           GameGateway (WebSocket handlers)            │   │
│  │  - equipment:change → handleEquipmentChange()         │   │
│  │  - inventory:unequip → handleInventoryUnequip()       │   │
│  │  - Emits stats:update via emitStats()                 │   │
│  └──────────┬────────────────────────────┬────────────────┘   │
│             │                            │                    │
│  ┌──────────▼──────────┐      ┌──────────▼──────────┐        │
│  │  InventoryService   │      │   PlayerService     │        │
│  │  - equipItem()      │      │  - updateMaxHealth()│        │
│  │  - unequipItem()    │      │  - getPlayerById()  │        │
│  │  - getInventory()   │      └─────────────────────┘        │
│  └─────────────────────┘                                     │
│             │                                                 │
├─────────────┼─────────────────────────────────────────────────┤
│     SHARED PACKAGES                                          │
├─────────────┼─────────────────────────────────────────────────┤
│  ┌──────────▼──────────────────────────────────────────────┐ │
│  │         packages/game-logic/src/stats/               │ │
│  │  ┌────────────────────────────────────────────────┐    │ │
│  │  │    computeCharStats(level, equipment, target)  │    │ │
│  │  │    - Gets base stats from SCALE_CONSTANTS       │    │ │
│  │  │    - Iterates equipped items (suit, modules,    │    │ │
│  │  │      tool, accessories)                          │    │ │
│  │  │    - Calls resolveEffectsForTrigger()           │    │ │
│  │  │      for 'on_equip' and 'passive'               │    │ │
│  │  │    - Aggregates effect.applied values           │    │ │
│  │  │    - Returns CharacterStats                      │    │ │
│  │  └────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
│             │                                                 │
│  ┌──────────▼──────────────────────────────────────────────┐ │
│  │    packages/game-logic/src/inventory/effects.ts       │ │
│  │  ┌────────────────────────────────────────────────┐    │ │
│  │  │  resolveEffect(effect: ItemEffect)              │    │ │
│  │  │  - Switch on effect.type                        │    │ │
│  │  │  - Returns { type, applied, duration? }         │    │ │
│  │  │                                                  │    │ │
│  │  │  resolveEffectsForTrigger(effects, trigger)     │    │ │
│  │  │  - Filters by trigger ('on_equip'/'passive')    │    │ │
│  │  │  - Maps to resolveEffect()                      │    │ │
│  │  └────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
│             │                                                 │
│  ┌──────────▼──────────────────────────────────────────────┐ │
│  │         packages/items/src/types.ts                   │ │
│  │  ┌────────────────────────────────────────────────┐    │ │
│  │  │  type ItemEffect = (discriminated union)        │    │ │
│  │  │    | { type: 'heal', amount: number }           │    │ │
│  │  │    | { type: 'stat_buff', stat, amount, dur }   │    │ │
│  │  │    | { type: 'armor', value: number }           │    │ │
│  │  │    | { type: 'stats', durability?, power?, ... }│    │ │
│  │  │    ...                                           │    │ │
│  │  │                                                  │    │ │
│  │  │  interface ItemEffectDef {                      │    │ │
│  │  │    trigger: 'on_use' | 'on_equip' | 'passive'   │    │ │
│  │  │    effect: ItemEffect                           │    │ │
│  │  │  }                                               │    │ │
│  │  └────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|----------------|----------|
| **ItemDefinition** | Source of truth for item properties including effects array | packages/items/src/definitions/*.ts |
| **ItemEffect (type)** | Discriminated union defining all possible effect types | packages/items/src/types.ts |
| **resolveEffect()** | Pure function: effect → { type, applied, duration } | packages/game-logic/src/inventory/effects.ts |
| **resolveEffectsForTrigger()** | Filters effects by trigger, maps to resolved results | packages/game-logic/src/inventory/effects.ts |
| **computeCharStats()** | Pure function: aggregates all equipment stats | packages/game-logic/src/stats/char-stats.ts |
| **GameGateway.emitStats()** | Computes stats on equip/unequip, emits to client | apps/game-server/src/game/game.gateway.ts |
| **InventoryService** | Manages equipment state mutations | apps/game-server/src/game/inventory.service.ts |

## Integration Architecture for Stats Effect

### The stats Effect Type

The `stats` effect type is **already defined** in the codebase:

```typescript
// packages/items/src/types.ts (line 46)
| {
    readonly type: 'stats';
    readonly durability?: number;
    readonly toughness?: number;
    readonly power?: number;
    readonly haste?: number;
    readonly vigor?: number;
    readonly recovery?: number;
    readonly perception?: number;
    readonly resilience?: number
  }
```

This is a **multi-stat effect** where any combination of the 8 stats can be present. It differs from existing effects:

- **stat_buff**: Single stat + duration (for temporary buffs)
- **armor/speed/sensor/etc**: Specialized single-purpose effects
- **stats**: Multiple permanent stats in one effect (no duration)

### Integration Points

#### 1. Effect Resolver (packages/game-logic/src/inventory/effects.ts)

**Current state:** Missing switch case for 'stats'

**Required change:**
```typescript
// Add to resolveEffect() switch statement (after line 97)
case 'stats':
  return {
    type: 'stats',
    applied: {
      ...(effect.durability !== undefined && { durability: effect.durability }),
      ...(effect.toughness !== undefined && { toughness: effect.toughness }),
      ...(effect.power !== undefined && { power: effect.power }),
      ...(effect.haste !== undefined && { haste: effect.haste }),
      ...(effect.vigor !== undefined && { vigor: effect.vigor }),
      ...(effect.recovery !== undefined && { recovery: effect.recovery }),
      ...(effect.perception !== undefined && { perception: effect.perception }),
      ...(effect.resilience !== undefined && { resilience: effect.resilience }),
    },
  };
```

**Why this pattern:**
- Only includes stats that are defined (not undefined)
- Returns same `EffectResult` shape as other effects
- `applied` is a Record<string, number> compatible with aggregation loop

#### 2. Stat Aggregator (packages/game-logic/src/stats/char-stats.ts)

**Current state:** Already handles stats effect correctly!

The aggregation loop (lines 111-119) is **generic**:

```typescript
for (const effect of allEffects) {
  for (const [stat, value] of Object.entries(effect.applied)) {
    // Only apply if stat exists in CharacterStats
    if (stat in stats) {
      (stats as unknown as Record<string, number>)[stat] += value;
    }
  }
}
```

**No changes needed** because:
- It iterates all keys in `effect.applied`
- Guards against unknown stat names (`if (stat in stats)`)
- Works for single-stat effects (armor, stat_buff) AND multi-stat effects (stats)

#### 3. Server-Side Stat Computation (apps/game-server/src/game/game.gateway.ts)

**Current state:** Fully implemented and server-authoritative

`emitStats()` (lines 1114-1157):
1. Gets inventory from `InventoryService` (server state)
2. Gets player from `PlayerService` (server state)
3. Computes base stats (empty equipment)
4. Computes total stats (actual equipment via `computeCharStats()`)
5. Computes equipment delta (total - base)
6. Emits `stats:update` with all three breakdowns
7. Updates `player.maxHealth` based on durability stat

**No changes needed** — already aggregates all equipment effects including stats type.

#### 4. Item Definitions (packages/items/src/definitions/*.ts)

**Current state:** Using legacy stat_buff effects

**Required change:** Replace legacy effects with stats effect:

```typescript
// OLD (stat_buff — single stat per effect):
effects: [
  { trigger: 'on_equip', effect: { type: 'stat_buff', stat: 'toughness', amount: 5, duration: 0 } },
  { trigger: 'on_equip', effect: { type: 'stat_buff', stat: 'durability', amount: 20, duration: 0 } },
]

// NEW (stats — multiple stats per effect):
effects: [
  { trigger: 'on_equip', effect: { type: 'stats', toughness: 5, durability: 20 } },
]
```

**Migration strategy:**
- New items: Use `stats` effect exclusively
- Existing items: Keep `stat_buff` with duration=0 for backwards compat OR bulk replace
- Both work because aggregation loop is generic

## Data Flow: Equipment Change → Stats Update

### Request Flow

```
[Player equips item]
    ↓
GameGateway.handleEquipmentChange()
    ↓
GameService.handleEquip(socketId, instanceId)
    ↓
InventoryService.equipItem(playerId, instanceId, slot)
    ├─ Validates item in inventory
    ├─ Swaps equipped/inventory state atomically
    ├─ Persists to DB (updateInventoryFull)
    └─ Returns { success: true, inventory }
    ↓
GameGateway.emitStats(client, playerId)  ← STAT COMPUTATION
    ├─ inventory = InventoryService.getInventory(playerId)
    ├─ player = PlayerService.getPlayerById(playerId)
    ├─ base = computeCharStats(level, EMPTY_EQUIPMENT, 'player')
    ├─ total = computeCharStats(level, inventory.equipment, 'player')
    │    ↓
    │    computeCharStats() iterates equipped items:
    │    ├─ For each item: ItemRegistry.get(itemId)
    │    ├─ resolveEffectsForTrigger(itemDef.effects, 'on_equip')
    │    ├─ resolveEffectsForTrigger(itemDef.effects, 'passive')
    │    │    ↓
    │    │    For each effect:
    │    │    └─ resolveEffect(effect) → { type, applied }
    │    │
    │    └─ Aggregates all effect.applied into stats object
    │
    ├─ equipment = total - base
    └─ Emits 'stats:update' → { total, base, equipment }
    ↓
PlayerService.updateMaxHealth(playerId, total.durability)
    ↓
Client receives stats:update event
    ↓
Client UI updates stat display
```

### Server-Authoritative Guarantees

**Why stats computation is server-authoritative:**

1. **Item definitions** are in shared package (ItemRegistry) — client can't modify
2. **Inventory state** lives in InventoryService in-memory cache — client sends actions, server validates
3. **Stat computation** happens in GameGateway.emitStats() — client never computes, only receives
4. **Database persistence** ensures inventory mutations are atomic (updateInventoryFull)
5. **Client receives result** via `stats:update` event — no client-side computation

**Client cannot:**
- Modify ItemDefinition effects
- Forge inventory state (server loads from DB, caches in memory)
- Compute stats locally (no computeCharStats import on client)
- Spoof equipment bonuses (server emits after DB write + recompute)

## Recommended Implementation Order

### Phase 1: Add Stats Effect Resolver (5 minutes)

**File:** `packages/game-logic/src/inventory/effects.ts`

**Change:** Add switch case for `stats` effect type (see Integration Point #1)

**Why first:** Unblocks item definitions from using new effect type

**Test:** Add unit test for `resolveEffect({ type: 'stats', toughness: 10, power: 5 })`

### Phase 2: Update Item Definitions (15 minutes)

**Files:** `packages/items/src/definitions/*.ts`

**Change:** Replace legacy stat_buff effects with stats effects:
- Suits: Multi-stat bonuses (durability + toughness + resilience)
- Modules: Specialized stat bonuses (armor module → toughness, speed module → haste)
- Tools: Tool-specific stat bonuses (power for combat, perception for research)

**Why second:** Validates that resolver works with real items

**Test:** Manual equip/unequip in-game, check stats panel updates

### Phase 3: Add Tests for Stat Aggregation (10 minutes)

**File:** `packages/game-logic/src/stats/char-stats.test.ts`

**Change:** Add test cases:
- Single item with stats effect
- Multiple items with overlapping stats (durability from suit + module)
- Mix of stats effect and legacy stat_buff effect (backwards compat)

**Why third:** Ensures aggregation handles multi-stat effects correctly

### Phase 4: Clean Up Legacy stat_buff with duration=0 (Optional)

**Files:** `packages/items/src/definitions/*.ts`

**Change:** Bulk replace all `stat_buff` with `duration: 0` to use `stats` effect

**Why optional:** Both work, but stats effect is cleaner for permanent bonuses

**Coordination:** Can be done as cleanup after Phase 2 validates new pattern

## Architectural Patterns

### Pattern 1: Discriminated Union for Effects

**What:** ItemEffect is a TypeScript discriminated union with `type` field as discriminator

**When to use:** Any system with multiple effect types that need type-safe handling

**Trade-offs:**
- ✅ Exhaustive type checking (switch errors if case missed)
- ✅ Easy to add new effect types
- ✅ Self-documenting effect structure
- ⚠️ Requires switch statement in resolver
- ⚠️ Can't dynamically compose effects (must define all unions upfront)

**Example:**
```typescript
type ItemEffect =
  | { type: 'heal', amount: number }
  | { type: 'stats', durability?: number, toughness?: number }

function resolveEffect(effect: ItemEffect) {
  switch (effect.type) {
    case 'heal':
      return { applied: { health: effect.amount } }
    case 'stats':
      return { applied: {
        ...(effect.durability && { durability: effect.durability })
      }}
    default:
      const _exhaustive: never = effect; // TypeScript error if case missed
  }
}
```

### Pattern 2: Pure Aggregation with Generic Loop

**What:** Stat aggregation doesn't know about specific effect types — iterates generic Record<string, number>

**When to use:** When multiple sources contribute to the same stat pool (equipment, buffs, consumables)

**Trade-offs:**
- ✅ Adding new effect types doesn't require aggregator changes
- ✅ Works for single-stat AND multi-stat effects
- ✅ Robust to unknown stat names (guards with `if (stat in stats)`)
- ⚠️ Less explicit than dedicated handlers per effect type
- ⚠️ Relies on effect.applied being well-formed

**Example:**
```typescript
// Generic aggregation works for ANY effect type
const stats = { durability: 100, toughness: 50 }

// Effect 1: Single stat (armor effect)
const effect1 = { applied: { toughness: 10 } }

// Effect 2: Multi stat (stats effect)
const effect2 = { applied: { durability: 20, toughness: 5 } }

for (const effect of [effect1, effect2]) {
  for (const [stat, value] of Object.entries(effect.applied)) {
    if (stat in stats) {
      stats[stat] += value
    }
  }
}
// Result: { durability: 120, toughness: 65 }
```

### Pattern 3: Server-Authoritative Stat Computation

**What:** Stats are computed server-side and emitted to client, never computed client-side

**When to use:** Any game stat system where client can't be trusted (cheating prevention)

**Trade-offs:**
- ✅ Prevents client-side stat manipulation
- ✅ Server owns inventory state (DB + in-memory cache)
- ✅ Client UI is pure view layer (no stat logic)
- ⚠️ Network latency for stat updates (mitigated by optimistic UI)
- ⚠️ Requires server to track all stat sources (equipment, buffs, debuffs)

**Example:**
```typescript
// SERVER ONLY (GameGateway.emitStats)
private emitStats(client: Socket, playerId: string) {
  const inventory = this.inventoryService.getInventory(playerId) // Server state
  const player = this.playerService.getPlayerById(playerId)      // Server state

  const total = computeCharStats(player.level, inventory.equipment, 'player')

  client.emit('stats:update', { total }) // Client receives, never computes
}

// CLIENT (no stat computation, only rendering)
useEffect(() => {
  socket.on('stats:update', (payload) => {
    setStats(payload.total) // Trust server result
  })
}, [])
```

## Anti-Patterns

### Anti-Pattern 1: Client-Side Stat Computation

**What people do:** Import `computeCharStats` on client and compute locally for faster UI updates

**Why it's wrong:**
- Opens door to stat manipulation (modified client computes fake stats)
- Server and client can desync (client computes before server validates)
- Duplicates stat logic across client/server

**Do this instead:**
- Keep `computeCharStats` server-only
- Use optimistic UI updates (assume equip succeeds, revert on error)
- Emit stats:update immediately after equipment mutations

### Anti-Pattern 2: Effect Type Explosion

**What people do:** Create separate effect type for every stat (durability_buff, toughness_buff, power_buff, ...)

**Why it's wrong:**
- Forces items with multiple stats to use multiple effects
- Clutters ItemEffect union with redundant types
- Requires resolver to have 8+ similar switch cases

**Do this instead:**
- Use `stats` effect for all permanent stat bonuses
- Reserve specialized types for unique behaviors (armor has damage reduction logic, stats is just values)
- Keep ItemEffect union lean (10-15 types max)

### Anti-Pattern 3: Duration-Based Effects for Permanent Stats

**What people do:** Use `stat_buff` with `duration: 0` or `duration: Infinity` for equipment stats

**Why it's wrong:**
- Duration field is misleading (0 doesn't mean "no duration", it means "instant")
- Buffs imply temporary state (expected to have start time, expiry, cleanse logic)
- Mixes concerns (timed buffs vs permanent equipment bonuses)

**Do this instead:**
- Use `stats` effect for permanent equipment bonuses (no duration field)
- Use `stat_buff` with real duration for consumables/abilities
- Clear semantic distinction: stats = permanent, stat_buff = temporary

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **items ↔ game-logic** | ItemEffect type imported by resolveEffect() | Items package defines effect schema, game-logic resolves to EffectResult |
| **game-logic ↔ game-server** | computeCharStats() imported by GameGateway | Pure function call, no state mutation |
| **game-server ↔ client** | Socket.IO events (stats:update) | Server emits CharStatsPayload, client renders |
| **InventoryService ↔ Database** | updateInventoryFull() for atomic writes | Equipment mutations persisted before stat recompute |

### Data Ownership

| Data | Owner | Access Pattern |
|------|-------|----------------|
| **ItemDefinition** | ItemRegistry (shared package) | Read-only, loaded at startup |
| **Inventory state** | InventoryService (in-memory cache) | Write via service methods, read via getInventory() |
| **Player stats** | Computed on-demand in GameGateway | Not stored, derived from level + equipment |
| **Player maxHealth** | PlayerService (in-memory ConnectedPlayer) | Updated by GameGateway after stat computation |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k players | Current architecture is fine. In-memory inventory caching handles load. |
| 1k-10k players | Monitor stat computation frequency. If bottleneck, add stat change tracking (only recompute if equipment mutated). |
| 10k+ players | Consider stat snapshot caching in Redis (invalidate on equip/unequip). Move computeCharStats to worker service if gateway becomes CPU-bound. |

### Scaling Priorities

1. **First bottleneck:** DB writes on equipment change (every equip/unequip writes to DB)
   - Fix: Batch inventory writes (flush every 30s or on disconnect)
   - Impact: Reduces DB load 10-100x depending on equip frequency

2. **Second bottleneck:** Stat computation CPU cost (iterates all equipped items, resolves effects)
   - Fix: Cache computed stats in-memory, invalidate on equipment change
   - Impact: Stat reads become O(1) instead of O(equipped items × effects per item)

## Sources

- **Existing codebase analysis** (HIGH confidence)
  - packages/game-logic/src/inventory/effects.ts — Effect resolver implementation
  - packages/game-logic/src/stats/char-stats.ts — Stat aggregation logic
  - apps/game-server/src/game/game.gateway.ts — Server-authoritative stat emission
  - packages/items/src/types.ts — ItemEffect discriminated union (stats type already defined)
  - packages/items/src/definitions/suits.ts — Current stat_buff pattern

---
*Architecture research for: Equipment stats integration*
*Researched: 2026-02-21*
