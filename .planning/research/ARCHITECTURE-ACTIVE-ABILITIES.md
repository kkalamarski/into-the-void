# Architecture Patterns: Active Combat Abilities

**Domain:** Active ability system for 2D multiplayer sci-fi survival MMO
**Researched:** 2026-02-20

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Phaser + React)               │
├─────────────────────────────────────────────────────────────┤
│  Action Bar UI          Ability Tooltip        Buff Icons    │
│  (hotkeys 1-8)          (on hover)            (status tray)  │
│       │                      │                     │         │
│       └──────────────────────┼─────────────────────┘         │
│                              │                               │
│                    abilityStore (Zustand)                    │
│                    ┌─────────────────────┐                   │
│                    │ cooldowns: Map      │                   │
│                    │ activeBuffs: Buff[] │                   │
│                    │ useAbility()        │                   │
│                    └─────────────────────┘                   │
│                              │                               │
│                   Socket.IO Client (emit)                    │
└──────────────────────────────┼──────────────────────────────┘
                               │
                    'ability:use' event
                    { abilityId, targetId? }
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    SERVER (NestJS)                           │
├─────────────────────────────────────────────────────────────┤
│                      GameGateway                             │
│              (Socket.IO event handlers)                      │
│                           │                                  │
│                           ▼                                  │
│                   AbilityService                             │
│         ┌──────────────────────────────────┐                │
│         │  validateAbilityUse()            │                │
│         │  executeAbility()                │                │
│         │  startCooldown()                 │                │
│         │  applyBuff()                     │                │
│         │  tickBuffs() (100ms interval)    │                │
│         └──────────────────────────────────┘                │
│              │             │            │                    │
│              ▼             ▼            ▼                    │
│    ┌──────────────┐ ┌───────────┐ ┌────────────┐           │
│    │ PlayerService│ │InventoryS.│ │ CombatServ.│           │
│    │ (energy dec.)│ │ (equipped)│ │ (damage)   │           │
│    └──────────────┘ └───────────┘ └────────────┘           │
│                                                              │
│              In-Memory State (per player)                   │
│         ┌────────────────────────────────┐                  │
│         │ cooldowns: Map<playerId, Map>  │                  │
│         │ activeBuffs: Map<playerId, []> │                  │
│         └────────────────────────────────┘                  │
│                           │                                  │
│                Socket.IO Server (broadcast)                  │
└───────────────────────────┼─────────────────────────────────┘
                            │
          ┌─────────────────┴──────────────────┐
          │                                    │
    'ability:result'                   'buff:applied'
    { success, cooldown,               { buffId, duration,
      damage?, buffId? }                 stat, value }
          │                                    │
          ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│  Update abilityStore → render cooldown sweep → show buff    │
└─────────────────────────────────────────────────────────────┘
```

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Action Bar UI** (client) | Render ability icons, handle hotkey presses, show cooldown sweeps | abilityStore, Phaser input system |
| **abilityStore** (client) | Track cooldowns (endsAt timestamps), active buffs, emit ability:use events | Socket.IO client, Action Bar UI, Buff Icons UI |
| **GameGateway** (server) | Receive ability:use events, delegate to AbilityService, broadcast results | Socket.IO server, AbilityService |
| **AbilityService** (server) | Validate ability use (range, cost, cooldown), execute ability logic, manage in-memory cooldowns/buffs | PlayerService, InventoryService, CombatService, EntityService |
| **Cooldown Manager** (server) | In-memory Map of active cooldowns per player, cleanup on disconnect | AbilityService |
| **Buff Manager** (server) | In-memory Map of active buffs per player, tick buffs every 100ms, expire/remove | AbilityService, PlayerService (stat mods) |
| **Ability Definitions** (shared) | JSON metadata in item definitions, ability effects, costs, cooldowns | ItemRegistry, AbilityService, client tooltips |

## Data Flow

### Ability Use Flow

```
1. Player presses hotkey (e.g., "1")
   └─> Action Bar UI reads slotIndex from actionBarStore
   └─> Finds instanceId assigned to that slot
   └─> Gets item from inventoryStore
   └─> Extracts abilityId from item metadata

2. Client validates locally (quick feedback)
   └─> Check: ability on cooldown? (abilityStore.cooldowns)
   └─> Check: player has enough energy? (statsStore.energy)
   └─> Check: valid target selected? (combatStore.targetId)
   └─> If any fail: show error message, abort

3. Client emits Socket.IO event
   emit('ability:use', { abilityId, targetId?, sequence })

4. Server receives event (GameGateway)
   └─> Lookup player by socketId
   └─> Call AbilityService.useAbility()

5. AbilityService validates (authoritative)
   └─> Check cooldown (in-memory cooldowns Map)
   └─> Check energy (PlayerService.getPlayer())
   └─> Check range (existing canInteract logic)
   └─> Check target exists (ZonesService.getEntity())
   └─> If any fail: emit error event, abort

6. AbilityService executes ability
   └─> Apply damage (CombatService.applyDamage())
   └─> OR apply buff (AbilityService.applyBuff())
   └─> Deduct energy (PlayerService.updateEnergy())
   └─> Start cooldown (cooldowns.set(playerId, abilityId, Date.now() + cooldown))

7. Server broadcasts result
   └─> emit to player: 'ability:result' { success, damage?, buffId?, cooldown }
   └─> emit to zone: 'ability:effect' { playerId, targetId, visualEffect }

8. Client receives ability:result
   └─> abilityStore updates cooldown (endsAt = Date.now() + cooldown)
   └─> If buff: add to activeBuffs array
   └─> Trigger visual effect (Phaser particle emitter)
   └─> Update energy bar (statsStore)

9. Client renders feedback
   └─> Action bar shows cooldown sweep animation (CSS or canvas)
   └─> Damage number floats at target position (Phaser text)
   └─> Buff icon appears in status tray with duration timer
```

### Buff Tick Flow

```
Server (every 100ms):
1. AbilityService.tickBuffs() iterates activeBuffs Map
2. For each player with buffs:
   └─> Decrement remaining duration
   └─> If duration <= 0: remove buff, emit 'buff:removed'
   └─> If buff modifies stats: update PlayerService stats
3. Emit 'buff:tick' to clients with updated durations

Client receives 'buff:tick':
1. Update buff duration timers in UI
2. If buff expired: remove icon from tray
```

## Patterns to Follow

### Pattern 1: Item-Granted Abilities

**What:** Abilities are not standalone entities. They are metadata on items. Equipping an item grants its ability.

**When:** Player equips item with `ability` field in metadata.

**Example:**
```typescript
// packages/items/src/definitions/tools.ts
{
  id: 'plasma_rifle_t2',
  name: 'Plasma Rifle Mk II',
  itemType: 'tool',
  toolType: 'combat',
  // ... other item fields
  ability: {
    id: 'plasma_burst',
    name: 'Plasma Burst',
    description: 'Fire a burst of plasma dealing 150 damage',
    category: 'offensive',
    energyCost: 40,
    cooldown: 8000, // 8 seconds
    range: 4,
    targetType: 'enemy',
    effects: [
      { type: 'damage', value: 150 }
    ]
  }
}
```

**Server extraction:**
```typescript
// AbilityService.getPlayerAbilities(playerId)
const inventory = inventoryService.getInventory(playerId);
const abilities: AbilityDefinition[] = [];

// Extract from equipped items
for (const slot of ['suit', 'tool', 'module1', 'module2']) {
  const item = inventory.equipment[slot];
  if (item?.ability) {
    abilities.push(item.ability);
  }
}
return abilities;
```

### Pattern 2: Authoritative Server Validation

**What:** Client shows optimistic UI, but server makes final decision.

**When:** All ability use requests.

**Example:**
```typescript
// Client: Optimistic feedback
async function useAbility(slotIndex: number) {
  // Local checks for instant feedback
  if (isOnCooldown(abilityId)) {
    showError('Ability on cooldown');
    return;
  }

  // Optimistic: show animation immediately
  playAbilityAnimation(abilityId);

  // Server: authoritative validation
  socket.emit('ability:use', { abilityId, targetId });

  // Wait for server response
  // If server rejects: rollback animation, show error
}

// Server: Final decision
async useAbility(playerId, abilityId, targetId) {
  // Re-validate everything server-side
  if (!this.validateCooldown(playerId, abilityId)) {
    return { success: false, error: 'On cooldown' };
  }

  // Execute only if validation passes
  const result = this.executeAbility(...);
  return result;
}
```

### Pattern 3: Cooldown as Client-Side Timestamp

**What:** Server tells client "this ability is on cooldown for 8000ms". Client calculates endsAt = Date.now() + 8000 and renders countdown.

**When:** All cooldown tracking.

**Example:**
```typescript
// Server sends cooldown duration
socket.emit('ability:result', {
  success: true,
  abilityId: 'plasma_burst',
  cooldownMs: 8000 // duration, not end time
});

// Client stores end timestamp
abilityStore.setState({
  cooldowns: new Map([
    ['plasma_burst', {
      endsAt: Date.now() + 8000,
      duration: 8000
    }]
  ])
});

// Client UI calculates remaining
function getCooldownPercent(abilityId) {
  const cd = cooldowns.get(abilityId);
  if (!cd) return 0;

  const remaining = cd.endsAt - Date.now();
  if (remaining <= 0) return 0;

  return (cd.duration - remaining) / cd.duration; // 0-1
}
```

### Pattern 4: Buff as Temporary Stat Modifier

**What:** Buffs modify character stats temporarily. When buff applied, add stat bonus. When expired, remove it.

**When:** Defensive/utility abilities that boost stats.

**Example:**
```typescript
// Buff definition
{
  id: 'shield_boost',
  name: 'Energy Shield',
  duration: 15000, // 15 seconds
  effects: [
    { type: 'stat_mod', stat: 'toughness', value: 50 }
  ]
}

// Server applies buff
applyBuff(playerId: string, buff: Buff) {
  // Store in activeBuffs
  this.activeBuffs.get(playerId).push({
    ...buff,
    appliedAt: Date.now(),
    expiresAt: Date.now() + buff.duration
  });

  // Update player stats
  playerService.modifyStats(playerId, {
    toughness: +50
  });
}

// Server removes buff (on expiry)
removeBuff(playerId: string, buffId: string) {
  const buff = this.findBuff(playerId, buffId);

  // Revert stat changes
  playerService.modifyStats(playerId, {
    toughness: -50
  });

  // Remove from activeBuffs
  this.activeBuffs.get(playerId).filter(b => b.id !== buffId);
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Database Queries on Every Ability Use

**What goes wrong:** Querying database for player stats, inventory, cooldowns on every ability use.

**Why bad:** 10 ability uses/second × 100 players = 1000 DB queries/second. Database becomes bottleneck.

**Instead:**
- Keep player state in memory (PlayerService already does this)
- Keep cooldowns in memory (in-memory Map)
- Only query database on login and periodic saves

```typescript
// BAD
async useAbility(playerId, abilityId) {
  const player = await db.query('SELECT * FROM characters WHERE id = ?', playerId);
  const cooldowns = await db.query('SELECT * FROM cooldowns WHERE player_id = ?', playerId);
  // ... slow
}

// GOOD
async useAbility(playerId, abilityId) {
  const player = this.playerService.getPlayerById(playerId); // in-memory
  const cooldown = this.cooldowns.get(playerId)?.get(abilityId); // in-memory Map
  // ... fast
}
```

### Anti-Pattern 2: Client-Side Damage Calculation

**What goes wrong:** Client calculates damage and updates health locally.

**Why bad:** Client can be manipulated (cheating). Multiplayer games must trust server only.

**Instead:**
```typescript
// BAD (client)
function useAbility(targetId) {
  const damage = calculateDamage(myStats, targetStats); // client calculates
  applyDamage(targetId, damage); // client applies
}

// GOOD (client)
function useAbility(targetId) {
  socket.emit('ability:use', { abilityId, targetId }); // server decides
}

// Server
async executeAbility(playerId, abilityId, targetId) {
  const damage = this.calculateDamage(...); // server calculates
  this.combatService.applyDamage(targetId, damage); // server applies
  socket.emit('ability:result', { damage }); // inform client
}
```

### Anti-Pattern 3: Synchronous Buff Ticking

**What goes wrong:** Iterate all buffs in request handler, blocking other requests.

**Why bad:** Buff ticking should be asynchronous. Blocking event loop on ability use creates lag spikes.

**Instead:**
```typescript
// BAD
async useAbility(...) {
  // ... execute ability

  // Synchronously tick all buffs
  this.tickAllBuffs(); // BLOCKS event loop
}

// GOOD
// Separate interval for buff ticking
onModuleInit() {
  setInterval(() => {
    this.tickAllBuffs(); // runs independently
  }, 100); // every 100ms
}

async useAbility(...) {
  // ... execute ability
  // Buff ticking happens in background interval
}
```

### Anti-Pattern 4: Global Cooldown as Separate Timer

**What goes wrong:** Track GCD separately from ability cooldowns, adding complexity.

**Why bad:** Two timing systems to maintain. GCD can be modeled as a special ability cooldown.

**Instead:**
```typescript
// BAD
class AbilityService {
  private cooldowns: Map<string, Map<string, number>>;
  private globalCooldowns: Map<string, number>; // separate system

  async useAbility(...) {
    if (this.globalCooldowns.get(playerId) > Date.now()) return; // check GCD
    if (this.cooldowns.get(playerId)?.get(abilityId) > Date.now()) return; // check ability CD
    // ... two systems
  }
}

// GOOD
class AbilityService {
  private cooldowns: Map<string, Map<string, number>>; // one system

  async useAbility(...) {
    // GCD is just another cooldown entry
    if (this.cooldowns.get(playerId)?.get('__gcd__') > Date.now()) return;
    if (this.cooldowns.get(playerId)?.get(abilityId) > Date.now()) return;

    // Start both cooldowns
    this.startCooldown(playerId, abilityId, abilityCooldown);
    this.startCooldown(playerId, '__gcd__', 1500); // 1.5s GCD
  }
}
```

## Scalability Considerations

| Concern | At 100 users | At 1K users | At 10K users |
|---------|--------------|--------------|-------------|
| **In-memory cooldowns** | 100 players × 8 abilities = 800 entries (~50KB) | 8000 entries (~500KB) | 80000 entries (~5MB) | Acceptable in RAM |
| **In-memory buffs** | 100 players × avg 3 buffs = 300 entries (~30KB) | 3000 entries (~300KB) | 30000 entries (~3MB) | Acceptable in RAM |
| **Buff tick interval** | Process 300 buffs every 100ms | Process 3000 buffs every 100ms (~0.3ms each) | Process 30000 buffs every 100ms (~0.003ms each) | Needs optimization at 10K+ |
| **Ability use events** | ~10 abilities/sec (0.1ms each) | ~100 abilities/sec (1ms total) | ~1000 abilities/sec (10ms total) | Event loop can handle |
| **Socket.IO broadcasts** | Broadcast to ~10 zones, 10 players each | Broadcast to ~50 zones, 20 players each | Broadcast to ~200 zones, 50 players each | Need zone-based rooms (already implemented) |

**Optimization at 10K+ users:**
- Batch buff ticks: process buffs in chunks, spread over multiple ticks
- Lazy cleanup: remove expired cooldowns on next access, not immediately
- Zone-based buff ticking: only tick buffs for active zones (players present)

## Sources

- Existing codebase: `apps/game-server/src/game/combat.service.ts`, `apps/game-server/src/game/player.service.ts`, `apps/web/src/store/actionBarStore.ts`
- NestJS Gateway architecture: https://docs.nestjs.com/websockets/gateways
- Socket.IO rooms for zone broadcasting: https://socket.io/docs/v4/rooms/
- In-memory state management patterns: https://www.gamedeveloper.com/design/in-memory-game-state-management-for-multiplayer-games
- Authoritative server pattern: https://www.gabrielgambetta.com/client-server-game-architecture.html
- Buff system architecture: https://github.com/Chillu1/ModiBuff (reference implementation)
- Cooldown tracking best practices: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/server-side-pagination.html
