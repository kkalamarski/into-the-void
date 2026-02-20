# Architecture Patterns: Active Combat Abilities System

**Domain:** 2D multiplayer sci-fi survival MMO
**Researched:** 2026-02-20

## Current State Summary

Into the Void has established architecture patterns that the ability system must integrate with:

### Backend (NestJS + Socket.IO)
- **Service-based architecture**: `combat.service.ts`, `inventory.service.ts`, `player.service.ts`
- **Event-driven communication**: `ClientEvents` and `ServerEvents` interfaces in `shared-types`
- **Session management**: In-memory maps (e.g., `CombatService.sessions`)
- **Tick-based processing**: `AiService` drives zone ticks which call `CombatService.processCombatTick()`
- **Validation pattern**: Server validates all actions, broadcasts results

### Frontend (React + Phaser 3)
- **Dual rendering**: React for UI panels, Phaser for game canvas
- **State management**: Zustand stores (`gameStore`, `combatStore`, `statsStore`, `inventoryStore`)
- **Socket listeners**: Stores register socket event handlers at module level
- **Action bar**: Existing 8-slot hotbar with localStorage persistence (`actionBarStore`)
- **Item effects**: Strategy pattern in `packages/items` with `ItemEffectDef` definitions

### Item System
- **Definition-driven**: `ItemDefinition` in `packages/items` with readonly properties
- **Effect system**: `effects: ItemEffectDef[]` with trigger types (`on_use`, `on_equip`, `passive`)
- **Repository pattern**: `ItemRegistry.get(itemId)` for centralized access
- **Current effect types**: `heal`, `energy_restore`, `stat_buff`, `suit_repair`, etc.

### Combat System
- **Auto-attack loop**: Timer-based damage ticks in `CombatService.attackTick()`
- **Interval calculation**: `calculateAttackInterval(haste)` from game-logic
- **Damage events**: `combat:damage` socket event broadcasts to zone
- **Session tracking**: `Map<playerId, CombatSession>` with `lastAttackAt` timestamps

## Recommended Architecture

### Component Boundaries

| Component | Responsibility | Location | New/Modified |
|-----------|---------------|----------|--------------|
| **AbilityService** | Validate ability use, track cooldowns, apply effects | `apps/game-server/src/game/` | NEW |
| **AbilityDefinitions** | Define abilities with costs, cooldowns, effects | `packages/abilities/src/definitions/` | NEW |
| **AbilityRegistry** | Singleton registry for ability lookups | `packages/abilities/src/registry.ts` | NEW |
| **ItemDefinition.grantedAbilities** | Link items to abilities they grant | `packages/items/src/types.ts` | MODIFIED |
| **useAbilityStore** | Client-side cooldown UI state | `apps/web/src/store/abilityStore.ts` | NEW |
| **AbilityBar** | Visual cooldown display UI | `apps/web/src/ui/hud/AbilityBar.tsx` | NEW |
| **PlayerService.energy** | Track energy resource for costs | `apps/game-server/src/game/player.service.ts` | MODIFIED |
| **ClientEvents/ServerEvents** | Add ability-related events | `packages/shared-types/src/network/events.ts` | MODIFIED |

### Data Flow: Ability Use

```
1. Client (React)
   → User presses ability keybind (Q/E/R/F)
   → useAbilityStore checks local cooldown (optimistic UI)
   → gameSocket.emit('ability:use', { abilityId, targetId? })

2. Server (NestJS)
   → GameGateway.handleAbilityUse() receives event
   → AbilityService.useAbility(playerId, abilityId, targetId?)

3. Validation (AbilityService)
   → Check ability granted by equipped item
   → Check energy cost (PlayerService.getEnergy())
   → Check cooldown (Map<playerId, Map<abilityId, endTime>>)
   → Check range/conditions (similar to combat.service.ts:85-130)
   → Return { success: boolean, error?: string }

4. Effect Application
   → AbilityService.applyEffects(abilityDef.effects, context)
   → Effects reuse ItemEffect types from existing system
   → Damage: call CombatService.applyDamage()
   → Buffs: tracked in new BuffService (time-limited stat modifiers)
   → Healing: PlayerService.updateHealth()

5. Broadcast Results
   → server.to(zoneId).emit('ability:cast', { casterId, abilityId, targetId })
   → server.to(playerId).emit('ability:cooldown', { abilityId, cooldownMs })
   → If damage: emit 'combat:damage' (existing event)
   → If buff: emit 'buff:applied', { targetId, buffId, duration }

6. Client Update
   → useAbilityStore.setCooldown(abilityId, cooldownMs)
   → AbilityBar renders cooldown progress (Phaser TimerEvent)
   → WorldScene shows visual effects at target position
```

### Integration Points

#### 1. Item System Integration
**Location:** `packages/items/src/types.ts`

Add to `ItemDefinition`:
```typescript
/** Abilities granted when this item is equipped (tools/modules) */
readonly grantedAbilities?: readonly string[]; // Array of ability IDs
```

**Rationale:** Items grant abilities, not all abilities available at all times. Combat tool grants combat abilities, research tool grants research abilities.

#### 2. Energy System Integration
**Location:** `apps/game-server/src/game/player.service.ts`

Add methods:
```typescript
getEnergy(playerId: string): number;
consumeEnergy(playerId: string, amount: number): boolean;
// Energy regeneration already handled by existing regen tick
```

**Rationale:** Energy already exists in player state (`player:regen` event line 535 in gameStore.ts). Abilities consume energy, preventing spam.

#### 3. Cooldown Tracking
**Location:** `apps/game-server/src/game/ability.service.ts`

```typescript
private cooldowns: Map<string, Map<string, number>> = new Map();
// playerId -> abilityId -> endTimestamp

isOnCooldown(playerId: string, abilityId: string): boolean;
startCooldown(playerId: string, abilityId: string, durationMs: number): void;
```

**Rationale:** Similar to `CombatService.sessions` pattern. In-memory tracking, cleared on disconnect.

#### 4. Buff System (New Component)
**Location:** `apps/game-server/src/game/buff.service.ts`

```typescript
interface ActiveBuff {
  buffId: string;
  targetId: string;
  stat: string;
  amount: number;
  endsAt: number;
}

private activeBuffs: Map<string, ActiveBuff[]> = new Map(); // playerId -> buffs
applyBuff(targetId, buffDef): void;
removeExpiredBuffs(): void; // Called by tick loop
getActiveBuffs(playerId): ActiveBuff[];
```

**Rationale:** Timed stat modifiers from abilities. Integrates with existing `computeCharStats()` in game-logic.

#### 5. Socket Event Extensions
**Location:** `packages/shared-types/src/network/events.ts`

Add to `ClientEvents`:
```typescript
'ability:use': { abilityId: string; targetId?: string };
```

Add to `ServerEvents`:
```typescript
'ability:cast': { casterId: string; abilityId: string; targetId?: string; timestamp: number };
'ability:cooldown': { abilityId: string; cooldownMs: number; endsAt: number };
'ability:granted': { abilityIds: string[] }; // When equipment changes
'buff:applied': { targetId: string; buffId: string; stat: string; amount: number; duration: number };
'buff:expired': { targetId: string; buffId: string };
```

**Rationale:** Follows existing event pattern (see `combat:start`, `combat:damage`).

#### 6. Client Cooldown UI
**Location:** `apps/web/src/store/abilityStore.ts`

```typescript
interface AbilityState {
  grantedAbilities: string[]; // From equipped items
  cooldowns: Map<string, number>; // abilityId -> endsAt timestamp
  setCooldown: (abilityId: string, cooldownMs: number) => void;
  tickCooldowns: () => void; // Called by Phaser update loop
}
```

**Location:** `apps/web/src/ui/hud/AbilityBar.tsx`

React component rendering 4 ability slots (Q/E/R/F) with:
- Ability icon from definition
- Cooldown overlay (radial or linear)
- Energy cost indicator
- Keybind label

**Rationale:** Mirrors ActionBar.tsx pattern (line 54-93). Uses Phaser TimerEvent for smooth cooldown animations.

### New Components Required

#### 1. `packages/abilities/` (New Package)

**Structure:**
```
packages/abilities/
├── src/
│   ├── types.ts              // AbilityDefinition interface
│   ├── registry.ts           // AbilityRegistry singleton
│   ├── definitions/
│   │   ├── combat.ts         // Combat tool abilities
│   │   ├── mining.ts         // Mining tool abilities
│   │   ├── research.ts       // Research tool abilities
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

**AbilityDefinition interface:**
```typescript
export interface AbilityDefinition {
  readonly id: string;                    // e.g., 'plasma_burst'
  readonly displayName: string;           // 'Plasma Burst'
  readonly description: string;
  readonly icon: string;                  // Texture key
  readonly energyCost: number;            // Energy consumed on use
  readonly cooldownMs: number;            // Cooldown duration
  readonly castTime?: number;             // Cast time (0 = instant)
  readonly range?: number;                // Max range in tiles (null = self)
  readonly targetType: 'self' | 'enemy' | 'ground' | 'ally';
  readonly effects: readonly AbilityEffect[];
}

export type AbilityEffect =
  | { type: 'damage'; amount: number; damageType: 'physical' | 'energy' }
  | { type: 'heal'; amount: number }
  | { type: 'buff'; stat: string; amount: number; duration: number }
  | { type: 'debuff'; stat: string; amount: number; duration: number }
  | { type: 'energy_restore'; amount: number };
```

**Rationale:** Mirrors `packages/items` structure. Strategy pattern for maintainability.

#### 2. `apps/game-server/src/game/ability.service.ts` (New Service)

**Responsibilities:**
- Validate ability use (grants, energy, cooldown, range)
- Start cooldowns
- Apply ability effects (delegates to existing services)
- Broadcast ability events

**Integration:**
```typescript
@Injectable()
export class AbilityService {
  constructor(
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
    private readonly combatService: CombatService,
    private readonly buffService: BuffService,
  ) {}

  async useAbility(
    playerId: string,
    abilityId: string,
    targetId?: string
  ): Promise<{ success: boolean; error?: string }>;
}
```

**Rationale:** Follows existing service pattern (CombatService, InventoryService).

#### 3. `apps/game-server/src/game/buff.service.ts` (New Service)

**Responsibilities:**
- Track active buffs per player
- Apply buffs (stat modifiers)
- Remove expired buffs (tick-based)
- Integrate with `computeCharStats()` for stat calculation

**Tick Integration:**
```typescript
// In AiService.tickZone() after combat tick:
await this.buffService.processBuffTick(zoneId);
```

**Rationale:** Time-limited stat modifiers are core to ability effects.

#### 4. `apps/web/src/store/abilityStore.ts` (New Store)

**Responsibilities:**
- Track granted abilities from equipment
- Track cooldown states for UI
- Listen to `ability:granted`, `ability:cooldown` socket events

**Socket listener setup:**
```typescript
gameSocket.on('ability:granted', (data: { abilityIds: string[] }) => {
  useAbilityStore.getState().setGrantedAbilities(data.abilityIds);
});

gameSocket.on('ability:cooldown', (data: { abilityId: string; cooldownMs: number }) => {
  useAbilityStore.getState().setCooldown(data.abilityId, cooldownMs);
});
```

**Rationale:** Mirrors combatStore.ts pattern (line 11-14).

#### 5. `apps/web/src/ui/hud/AbilityBar.tsx` (New Component)

**Responsibilities:**
- Render 4 ability slots (Q/E/R/F keybinds)
- Show cooldown progress (circular or radial)
- Display energy cost and keybind
- Handle keyboard input for ability activation

**Visual Design:**
```
[Q]  [E]  [R]  [F]
 ↓    ↓    ↓    ↓
[🔥] [⛏️] [🔬] [⚡]
 45   0   120   30  ← Energy cost
 2.5s      READY    ← Cooldown state
```

**Rationale:** Positioned next to ActionBar in HUD.tsx. Uses Phaser.Time.TimerEvent for smooth cooldown rendering.

#### 6. `apps/web/src/game/rendering/AbilityEffectRenderer.ts` (New Renderer)

**Responsibilities:**
- Render visual effects for ability casts
- Particle effects at target location
- Beam/projectile animations
- Integrate with EntityRenderer for positioning

**Example:**
```typescript
export class AbilityEffectRenderer {
  showCastEffect(abilityId: string, casterPos: Position, targetPos?: Position): void;
  // Creates particles, sprites, tweens based on ability type
}
```

**Rationale:** Visual feedback for ability usage. Similar to damage number rendering in WorldScene.

### Modified Components

#### 1. `packages/items/src/types.ts`
**Change:** Add `grantedAbilities?: readonly string[]` to `ItemDefinition`

**Impact:** Tools and modules can grant abilities when equipped.

#### 2. `packages/items/src/definitions/tools.ts`
**Change:** Add `grantedAbilities` arrays to tool definitions

**Example:**
```typescript
export const TOOL_COMBAT_COMMON: ItemDefinition = {
  // ... existing properties
  grantedAbilities: ['basic_strike', 'energy_shield'],
};
```

**Impact:** Links items to abilities they provide.

#### 3. `apps/game-server/src/game/game.gateway.ts`
**Change:** Add `@SubscribeMessage('ability:use')` handler

**Location:** After existing handlers (~line 400)

**Impact:** Routes ability use requests to AbilityService.

#### 4. `apps/game-server/src/game/player.service.ts`
**Change:** Add energy management methods

**New methods:**
```typescript
getEnergy(playerId: string): number;
consumeEnergy(playerId: string, amount: number): boolean;
```

**Impact:** Enables energy cost validation for abilities.

#### 5. `packages/shared-types/src/network/events.ts`
**Change:** Add ability events to ClientEvents and ServerEvents interfaces

**Impact:** Type-safe socket communication for abilities.

#### 6. `apps/web/src/ui/GameUI.tsx`
**Change:** Import and render `<AbilityBar />` in HUD

**Location:** After ActionBar in HUD component (~line 99)

**Impact:** Ability UI visible in game.

#### 7. `packages/game-logic/src/stats/char-stats.ts`
**Change:** Integrate buff modifiers into `computeCharStats()`

**New parameter:**
```typescript
export function computeCharStats(
  level: number,
  equipment: EquipmentJson,
  entityType: 'player' | 'creature',
  activeBuffs?: Array<{ stat: string; amount: number }> // NEW
): CharacterStats;
```

**Impact:** Buffs modify effective stats for combat calculations.

## Build Order (Considering Dependencies)

### Phase 1: Foundation (No UI)
**Dependencies:** None - establishes data structures

1. Create `packages/abilities/` package
   - Define `AbilityDefinition` interface
   - Implement `AbilityRegistry` singleton
   - Create 3-5 example abilities (one per tool type)

2. Extend `ItemDefinition` with `grantedAbilities`
   - Modify `packages/items/src/types.ts`
   - Update 3 tool definitions with ability grants

3. Add ability events to `shared-types`
   - Extend `ClientEvents` and `ServerEvents`

**Validation:** Abilities can be imported, registry lookups work

### Phase 2: Server Infrastructure
**Dependencies:** Phase 1 complete

4. Implement `BuffService`
   - Track active buffs
   - Expire buffs on tick
   - Integrate with `computeCharStats()`

5. Implement `AbilityService`
   - Validation logic (grants, energy, cooldown, range)
   - Cooldown tracking (in-memory map)
   - Effect application (delegates to existing services)

6. Extend `PlayerService` with energy methods
   - `getEnergy()`, `consumeEnergy()`

7. Add `ability:use` handler to `GameGateway`
   - Wire to `AbilityService.useAbility()`

8. Wire buff tick into `AiService.tickZone()`

**Validation:** Server logs ability use, applies effects, starts cooldowns

### Phase 3: Client State
**Dependencies:** Phase 2 complete (server emits events)

9. Implement `useAbilityStore`
   - Track granted abilities
   - Track cooldowns
   - Socket event listeners

10. Wire `ability:granted` emission on equipment change
    - Modify inventory service to emit when tool equipped

**Validation:** Client state updates when abilities granted/used

### Phase 4: UI and Input
**Dependencies:** Phase 3 complete (state available)

11. Implement `AbilityBar` component
    - Render 4 slots with cooldown overlays
    - Keyboard input (Q/E/R/F)
    - Energy cost display

12. Add `AbilityBar` to `GameUI.tsx`

13. Implement `AbilityEffectRenderer`
    - Visual effects for ability casts
    - Integrate with `WorldScene`

**Validation:** Full ability flow works end-to-end with UI feedback

### Phase 5: Content and Polish
**Dependencies:** Phase 4 complete (system functional)

14. Create 20+ ability definitions across tool types
    - 5 combat abilities (damage, stuns)
    - 5 mining abilities (AoE mining, ore detection)
    - 5 research abilities (scanning, analysis boosts)
    - 5 utility abilities (speed boosts, shields)

15. Balance energy costs and cooldowns

16. Polish visual effects

**Validation:** Full ability catalog playable

## Architecture Patterns to Follow

### 1. Strategy Pattern (Existing)
**Where:** `packages/abilities/src/definitions/`

**How:** Each ability is a data object, effects processed by switch statement

**Example from items:**
```typescript
// packages/game-logic/src/inventory/effects.ts:24-108
export function resolveEffect(effect: ItemEffect): EffectResult {
  switch (effect.type) {
    case 'heal': return { type: 'heal', applied: { health: effect.amount } };
    // ... other cases
  }
}
```

**Apply to abilities:** Reuse `ItemEffect` types for ability effects.

### 2. Repository Pattern (Existing)
**Where:** `packages/abilities/src/registry.ts`

**How:** Singleton registry with `get(abilityId)` method

**Example from items:**
```typescript
// packages/items/src/registry.ts
export class ItemRegistry {
  private static items = new Map<string, ItemDefinition>();
  static get(itemId: string): ItemDefinition | undefined;
}
```

**Apply to abilities:** `AbilityRegistry.get(abilityId)` for lookups.

### 3. Service Delegation (Existing)
**Where:** `AbilityService.applyEffects()`

**How:** Ability service delegates to existing services rather than duplicating logic

**Example from combat:**
```typescript
// CombatService.attackTick() delegates to:
const damageResult = calculateDamage(...); // game-logic
this.playerService.grantXp(player.id, xpReward); // player service
```

**Apply to abilities:** Damage effects call `CombatService`, heals call `PlayerService`.

### 4. Event Broadcasting (Existing)
**Where:** All ability results

**How:** Emit to zone room for visual feedback, emit to player for state updates

**Example from combat:**
```typescript
// combat.service.ts:408-413
this.server.to(playerSocket).emit('combat:start', {
  attackerId: creatureId,
  defenderId: targetPlayerId,
  timestamp: session.startedAt,
});
```

**Apply to abilities:** `ability:cast` to zone, `ability:cooldown` to caster.

### 5. Zustand Store + Socket Wiring (Existing)
**Where:** `useAbilityStore`

**How:** Store registers socket listeners at module level, components subscribe to state

**Example from combat:**
```typescript
// combatStore.ts:17-46
gameSocket.on('combat:start', (data) => {
  if (defenderId === currentPlayer.id) {
    useCombatStore.getState().setInCombat(true, attackerId);
  }
});
```

**Apply to abilities:** `gameSocket.on('ability:cooldown')` updates store.

### 6. Optimistic UI (Recommended)
**Where:** Client ability activation

**How:** Show cooldown immediately on client, revert if server rejects

**Why:** Responsive UI for fast-paced combat

**Implementation:**
```typescript
// Client-side
const useAbility = (abilityId: string) => {
  // Start optimistic cooldown
  const cooldownMs = AbilityRegistry.get(abilityId)?.cooldownMs;
  if (cooldownMs) {
    useAbilityStore.getState().setCooldown(abilityId, cooldownMs);
  }

  // Emit to server
  gameSocket.emit('ability:use', { abilityId });

  // Server will emit 'ability:cooldown' to confirm or 'error' to revert
};
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Ability Logic
**What goes wrong:** Client calculates damage, applies effects locally

**Why bad:** Cheating, desync issues, duplicate logic

**Prevention:** Server is source of truth. Client only renders results.

### Anti-Pattern 2: Polling for Cooldown State
**What goes wrong:** Client repeatedly checks `Date.now()` against cooldown end time

**Why bad:** Performance overhead, imprecise timing, battery drain

**Prevention:** Use Phaser TimerEvent for cooldown updates

### Anti-Pattern 3: Global Ability Registry Mutation
**What goes wrong:** Modifying ability definitions at runtime (e.g., storing cooldown state in definition)

**Why bad:** Shared state corruption, race conditions, breaks readonly contract

**Prevention:** Definitions are immutable. State lives in service/store.

### Anti-Pattern 4: Synchronous Ability Resolution
**What goes wrong:** Blocking the event loop waiting for ability effects to complete

**Why bad:** Server lag, timeouts, poor UX

**Prevention:** Async/await for all service calls, effects applied asynchronously

### Anti-Pattern 5: Tightly Coupled UI
**What goes wrong:** AbilityBar directly calls AbilityService methods

**Why bad:** Violates separation of concerns, hard to test, breaks on service changes

**Prevention:** UI talks to store, store talks to socket, socket talks to service

## Scalability Considerations

| Concern | At 10 abilities | At 50 abilities | At 200+ abilities |
|---------|----------------|-----------------|-------------------|
| **Registry Lookup** | Map O(1) fine | Map O(1) fine | Map O(1) fine |
| **Cooldown Tracking** | In-memory map per player | In-memory map per player | Consider Redis for persistence |
| **Buff Calculation** | Array iteration acceptable | Array iteration acceptable | Index buffs by stat for O(1) lookup |
| **Event Broadcasting** | Zone broadcast fine | Zone broadcast fine | Consider interest management (only nearby players) |
| **Client Memory** | All definitions loaded | All definitions loaded | Lazy load ability assets |

**Recommendation for 20+ abilities:** Current architecture scales fine. Use in-memory maps, zone-based broadcasting.

**Future optimization (100+ abilities):**
- Redis for cooldown/buff persistence (survives server restart)
- Interest management for broadcasts (only players in render distance)
- Asset lazy loading on client (only load icons when ability granted)

## Rate Limiting Integration

NestJS has a throttler module for rate limiting WebSocket events. For abilities, integrate server-side rate limiting to prevent spam.

**Implementation:**
```typescript
// ability.service.ts
private lastAbilityUse: Map<string, number> = new Map(); // playerId -> timestamp

async useAbility(playerId: string, abilityId: string): Promise<Result> {
  const now = Date.now();
  const lastUse = this.lastAbilityUse.get(playerId) ?? 0;
  const MIN_INTERVAL = 100; // 100ms global cooldown

  if (now - lastUse < MIN_INTERVAL) {
    return { success: false, error: 'Ability on global cooldown' };
  }

  this.lastAbilityUse.set(playerId, now);
  // ... rest of validation
}
```

**Rationale:** Prevents client from spamming ability requests before server cooldown applied. Global cooldown (100ms) is standard in MMOs.

## References

**Architecture Patterns:**
- [Generic Combat System (GCS)](https://www.aeblender.com/2026/01/ue-5-6-generic-combat-system-advanced-gas-v1-4-crack-download/) - Component-based combat architecture decoupled through interfaces
- [Multiplayer Action Combat System](https://www.fab.com/listings/345ecdbc-c543-4f7d-93e2-110f8a877460) - Handles combos, cooldowns, stuns, crowd control

**Cooldown Systems:**
- [Roblox Client-Server Cooldown](https://devforum.roblox.com/t/how-can-i-make-a-robust-client-server-cooldown-system/544500) - Debounces on client with server validation
- [GitHub keep-cooldown](https://github.com/swkeep/keep-cooldown) - Server-side cooldown resource

**Phaser Timer Implementation:**
- [Phaser 3 Time API](https://docs.phaser.io/phaser/concepts/time) - Timer events for delayed function calls
- [Phaser Timer Notes](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/timer/) - Timer patterns and best practices

**NestJS Rate Limiting:**
- [NestJS Throttler](https://github.com/nestjs/throttler) - Rate limiting for WebSockets
- [NestJS WebSocket Rate Limiting](https://www.delightfulengineering.com/blog/nest-websockets/rate-limiting-acknowledgements) - Implementation patterns

**Combat Design:**
- [Combat Design Mechanics](https://gamedesignskills.com/game-design/combat-design/) - Active elements (abilities, attacks) and resource management

## Summary

Active combat abilities integrate cleanly with Into the Void's existing architecture by:

1. **Leveraging existing patterns**: Item effects, socket events, service delegation, Zustand stores
2. **Minimal modification**: Only 7 existing files need changes, rest are new components
3. **Clear dependencies**: Phase-based build order prevents integration issues
4. **Server authority**: Client UI only, server validates and broadcasts results
5. **Scalability**: In-memory maps and zone broadcasts scale to 50+ abilities without architectural changes

**Key architectural decision:** Abilities are granted by items (tools/modules), not inherent to player. This maintains item-driven progression and reuses equipment change events.

**Critical path:** BuffService integration with `computeCharStats()` is most complex new component, requiring careful testing to ensure stat calculations remain accurate.
