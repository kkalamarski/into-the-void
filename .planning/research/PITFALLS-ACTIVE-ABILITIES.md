# Domain Pitfalls: Active Combat Abilities

**Domain:** Active ability system for 2D multiplayer sci-fi survival MMO
**Researched:** 2026-02-20

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Ability Spam Without Global Cooldown

**What goes wrong:** Players spam abilities as fast as network allows, overwhelming server with ability:use events.

**Why it happens:** No rate limiting on ability use. Cooldowns are per-ability, so players queue 8 different abilities instantly.

**Consequences:**
- Server processes 8 abilities in <100ms, event loop blocked
- Other players experience lag spikes
- Abilities fire out of intended sequence
- Energy depletes instantly, poor gameplay feel

**Prevention:**
- Implement Global Cooldown (GCD) of 1.5 seconds shared across all abilities
- Client enforces GCD locally (prevent spam before server)
- Server validates GCD on every ability:use event
- Certain abilities flagged as "off-GCD" (movement abilities, instant defensives)

**Detection:**
- Monitor ability:use event rate per player (should be <1/sec average)
- If >5 abilities/sec from single player: log warning, investigate

**Example Implementation:**
```typescript
// Server validation
if (this.isOnGlobalCooldown(playerId)) {
  return { success: false, error: 'Global cooldown active' };
}

// Start both ability and global cooldown
this.startCooldown(playerId, abilityId, 8000); // 8s ability CD
this.startCooldown(playerId, '__gcd__', 1500); // 1.5s GCD
```

---

### Pitfall 2: Client-Server Time Desync on Cooldowns

**What goes wrong:** Client thinks ability is off cooldown, uses it. Server disagrees, rejects. Player sees ability fire then gets error.

**Why it happens:** Client and server clocks drift. Client calculates `endsAt = Date.now() + cooldown`, but server's Date.now() is different.

**Consequences:**
- Abilities feel unresponsive (visual animation fires, then error)
- Players spam hotkeys because "it's not working"
- Poor combat feel, trust in UI broken

**Prevention:**
- Server sends cooldown as **duration**, not end timestamp
- Client calculates `endsAt = clientTime + duration`
- Add 100ms grace period: client shows cooldown for extra 100ms to account for latency
- Server validation uses server time only

**Detection:**
- Track rejected ability uses with reason "on cooldown"
- If >5% of ability uses rejected for cooldown: time desync issue

**Example Implementation:**
```typescript
// Server response
socket.emit('ability:result', {
  success: true,
  cooldownMs: 8000 // duration, not timestamp
});

// Client adds grace period
abilityStore.setState({
  cooldowns: new Map([
    [abilityId, {
      endsAt: Date.now() + cooldownMs + 100, // +100ms buffer
      duration: cooldownMs
    }]
  ])
});
```

---

### Pitfall 3: Memory Leak from Abandoned Cooldowns

**What goes wrong:** Player disconnects mid-cooldown. Cooldown entry remains in server Map forever. Multiply by thousands of players over days.

**Why it happens:** No cleanup on disconnect. In-memory Map grows unbounded.

**Consequences:**
- Server memory usage grows over time (memory leak)
- Eventually: out of memory, server crashes
- Restart required every few days

**Prevention:**
- Clean up player state on disconnect: remove from cooldowns Map, activeBuffs Map
- Implement periodic cleanup: remove cooldowns for players not connected
- Set expiry on cooldown entries: remove if `expiresAt < Date.now() - 60000` (older than 1 minute)

**Detection:**
- Monitor cooldowns Map size: `cooldowns.size` should correlate with connected players
- If Map size grows unbounded: memory leak

**Example Implementation:**
```typescript
// GameGateway.handleDisconnect()
handleDisconnect(client: Socket) {
  const player = this.playerService.getPlayerBySocket(client.id);
  if (player) {
    // Clean up ability state
    this.abilityService.cleanupPlayer(player.id);
  }
}

// AbilityService
cleanupPlayer(playerId: string) {
  this.cooldowns.delete(playerId);
  this.activeBuffs.delete(playerId);
}
```

---

### Pitfall 4: Buff Stacking Without Limits

**What goes wrong:** Player uses same buff ability 10 times. 10 instances of +50 toughness = +500 toughness. Player becomes invincible.

**Why it happens:** No stack limit on buffs. Each application adds another instance.

**Consequences:**
- Trivializes combat difficulty
- Players one-shot creatures or become unkillable
- Breaks progression curve

**Prevention:**
- Flag buffs as `stackable: false` or `maxStacks: 1`
- When applying buff: check if same buffId already active
- If non-stackable: refresh duration instead of adding second instance
- If stackable: enforce max stacks (e.g., `maxStacks: 3`)

**Detection:**
- Monitor player stats: if toughness >500 or power >500, investigate
- Track buff counts: if player has >10 active buffs, likely stacking exploit

**Example Implementation:**
```typescript
applyBuff(playerId: string, buff: Buff) {
  const existing = this.findBuff(playerId, buff.id);

  if (existing) {
    if (!buff.stackable) {
      // Refresh duration instead of stacking
      existing.expiresAt = Date.now() + buff.duration;
      return;
    }

    const stackCount = this.countBuffStacks(playerId, buff.id);
    if (stackCount >= (buff.maxStacks || 1)) {
      return; // max stacks reached
    }
  }

  // Add new buff instance
  this.activeBuffs.get(playerId).push(buff);
}
```

---

### Pitfall 5: Forgotten Buff Tick Loop

**What goes wrong:** Buffs applied but never expire. Duration timers don't count down. Buffs remain active forever.

**Why it happens:** Buff application implemented, but no interval to tick down durations and remove expired buffs.

**Consequences:**
- Buffs stack infinitely (never removed)
- Stat modifiers never revert
- Combat balance completely broken

**Prevention:**
- Implement buff tick interval in `AbilityService.onModuleInit()`
- Tick every 100ms: decrement durations, remove expired buffs
- Revert stat modifiers when buff removed
- Log when buffs expire (for debugging)

**Detection:**
- Check activeBuffs Map: if buffs with `expiresAt` in the past still present, tick loop not running
- Monitor buff count per player: should fluctuate, not only increase

**Example Implementation:**
```typescript
// AbilityService
onModuleInit() {
  // Start buff tick loop
  setInterval(() => {
    this.tickBuffs();
  }, 100); // every 100ms
}

private tickBuffs() {
  const now = Date.now();

  for (const [playerId, buffs] of this.activeBuffs.entries()) {
    const expired = buffs.filter(b => b.expiresAt <= now);

    for (const buff of expired) {
      this.removeBuff(playerId, buff.id);
    }
  }
}
```

---

## Moderate Pitfalls

### Pitfall 6: No Ability Range Indicator

**What goes wrong:** Player doesn't know if target is in range until ability fails.

**Why it happens:** Range validation only on server, no client-side preview.

**Consequences:**
- Frustrating trial-and-error gameplay
- Abilities fail silently, player doesn't understand why

**Prevention:**
- Client highlights target with color: green = in range, red = out of range
- Show range circle on hover (optional, advanced)
- Client validates range before emitting event (optimistic)

**Example Implementation:**
```typescript
// Client: highlight target based on range
function updateTargetHighlight(targetId: string, abilityRange: number) {
  const target = getEntity(targetId);
  const player = getPlayer();
  const distance = calculateDistance(player.position, target.position);

  if (distance <= abilityRange) {
    target.tint = 0x00ff00; // green = in range
  } else {
    target.tint = 0xff0000; // red = out of range
  }
}
```

---

### Pitfall 7: Ability Definitions Duplicated Across Items

**What goes wrong:** Same ability defined separately for 5 different items. Need to update cooldown? Change in 5 places.

**Why it happens:** Copy-pasting ability metadata instead of referencing shared definitions.

**Consequences:**
- Balance changes require changes in multiple files
- Inconsistencies creep in (one item has 8s cooldown, another has 10s)
- Hard to maintain

**Prevention:**
- Define abilities once in shared registry
- Items reference ability by ID
- Item metadata only overrides tier-specific values (damage scaling)

**Example Implementation:**
```typescript
// packages/shared-types/src/game/abilities.ts
export const ABILITY_REGISTRY = {
  plasma_burst: {
    id: 'plasma_burst',
    name: 'Plasma Burst',
    category: 'offensive',
    cooldown: 8000,
    energyCost: 40,
    range: 4,
    targetType: 'enemy',
    baseDamage: 100 // base damage, scaled by item tier
  }
};

// packages/items/src/definitions/tools.ts
{
  id: 'plasma_rifle_t2',
  ability: {
    abilityId: 'plasma_burst', // reference shared definition
    damageMultiplier: 1.5 // tier 2 = 150 damage
  }
}

// Server resolves full ability
function getAbilityDefinition(item: Item): AbilityDefinition {
  const base = ABILITY_REGISTRY[item.ability.abilityId];
  return {
    ...base,
    damage: base.baseDamage * (item.ability.damageMultiplier || 1)
  };
}
```

---

### Pitfall 8: No Visual Feedback for Buffs

**What goes wrong:** Player uses defensive ability. No visible buff icon. Player doesn't know if it worked or how long it lasts.

**Why it happens:** Buffs applied server-side, but no client UI for buff display.

**Consequences:**
- Players re-cast buffs because they can't tell if active
- Wastes energy, poor resource management
- Combat feels unresponsive

**Prevention:**
- Implement buff icon tray in HUD
- Show buff icons with duration timers
- Tooltip on hover shows buff details
- Visual indicator on character (glow, particle effect)

**Example Implementation:**
```tsx
// apps/web/src/ui/BuffTray.tsx
export function BuffTray() {
  const buffs = useAbilityStore(state => state.activeBuffs);

  return (
    <div className="buff-tray">
      {buffs.map(buff => (
        <BuffIcon
          key={buff.id}
          icon={buff.icon}
          duration={buff.duration}
          tooltip={buff.description}
        />
      ))}
    </div>
  );
}
```

---

## Minor Pitfalls

### Pitfall 9: Hardcoded Ability IDs in Code

**What goes wrong:** Code checks `if (abilityId === 'plasma_burst')` for special logic. Refactoring ability IDs breaks code.

**Why it happens:** String literals scattered throughout codebase.

**Consequences:**
- Brittle code, hard to refactor
- Typos cause silent failures

**Prevention:**
- Use constants for ability IDs
- Define in shared types package
- Import and reference, never hardcode strings

**Example Implementation:**
```typescript
// packages/shared-types/src/game/ability-ids.ts
export const ABILITY_IDS = {
  PLASMA_BURST: 'plasma_burst',
  SHIELD_BOOST: 'shield_boost',
  EMERGENCY_HEAL: 'emergency_heal'
} as const;

// Usage
import { ABILITY_IDS } from '@into-the-void/shared-types';

if (abilityId === ABILITY_IDS.PLASMA_BURST) {
  // special logic
}
```

---

### Pitfall 10: Ability Queueing Not Implemented

**What goes wrong:** Player presses ability during GCD. Input ignored. Feels unresponsive.

**Why it happens:** No input buffering system.

**Consequences:**
- Players mash keys to ensure ability fires
- Combat feels clunky compared to modern MMOs
- Lower perceived quality

**Prevention:**
- Implement input buffer: queue next ability during GCD
- When GCD ends: automatically fire queued ability
- Buffer window: 400ms before GCD ends

**Example Implementation:**
```typescript
// Client: ability queueing
let queuedAbility: string | null = null;

function useAbility(abilityId: string) {
  if (isOnGlobalCooldown()) {
    // Queue for when GCD ends
    queuedAbility = abilityId;
    return;
  }

  // Fire immediately
  socket.emit('ability:use', { abilityId });
}

// When GCD ends
function onGlobalCooldownEnd() {
  if (queuedAbility) {
    useAbility(queuedAbility);
    queuedAbility = null;
  }
}
```

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Ability metadata system** | Circular import: items import abilities, abilities import stats | Define abilities in separate package, import one-way |
| **Cooldown visualization** | CSS animation doesn't match server cooldown (drift) | Recalculate every frame based on `endsAt - Date.now()`, not CSS duration |
| **Buff system** | Stat modifiers not reverted on buff expiry | Track original stat values, revert explicitly |
| **Ability queuing** | Queue allows abilities without resources | Validate resources when queue fires, not when queued |
| **Item-granted abilities** | Unequipping item leaves ability usable | Remove abilities from action bar on unequip |
| **Target validation** | Target dies between ability cast and execution | Validate target still alive when ability executes |
| **Energy cost** | Energy deducted before validation fails | Deduct energy AFTER all validation passes |
| **Multi-tier abilities** | Damage scaling doesn't account for stat modifiers | Apply stat modifiers AFTER tier scaling |

---

## Anti-Pattern Warnings

### Don't: Poll for Cooldown Updates

```typescript
// BAD: polling every 100ms
setInterval(() => {
  const cooldowns = await fetchCooldownsFromServer();
  updateUI(cooldowns);
}, 100);

// GOOD: event-driven updates
socket.on('ability:result', ({ cooldownMs }) => {
  updateCooldown(abilityId, Date.now() + cooldownMs);
});
```

### Don't: Trust Client Damage Calculations

```typescript
// BAD: client calculates and sends damage
socket.emit('ability:use', {
  abilityId,
  targetId,
  damage: calculateDamage(myStats) // NEVER
});

// GOOD: client sends intent, server calculates
socket.emit('ability:use', { abilityId, targetId });
// Server calculates damage, broadcasts result
```

### Don't: Block Event Loop with Synchronous Buff Processing

```typescript
// BAD: process all buffs synchronously in ability handler
async useAbility(...) {
  // ... ability logic
  this.processAllBuffs(); // blocks event loop
}

// GOOD: separate async interval for buff processing
onModuleInit() {
  setInterval(() => this.processAllBuffs(), 100);
}
```

---

## Common Mistakes from Research

### Mistake 1: Animation Lock Too Long

**Research finding:** "Heavier weapons increasingly lock the player in place during portions of combat animation, creating a balance between player agency and weapon weightedness."

**For Into the Void:** Keep all ability animations <1 second. Allow movement canceling after 500ms. Never lock player for >1.5s.

### Mistake 2: Hidden Information

**Research finding:** "Tooltips should surface the most relevant information and make them look more exciting to properly communicate that these are powerful abilities."

**For Into the Void:** Show damage range, energy cost, cooldown, range in tooltip. Color-code effects (damage = red, healing = green, buff = blue).

### Mistake 3: Useless Skills

**Research finding:** "Many MMOs feature useless skills that are never used after being learned, with early skills being overwritten by later skills."

**For Into the Void:** Every ability should have a use case. Don't add abilities just to increase count. 8-12 meaningful abilities > 20 mediocre ones.

### Mistake 4: Replacing Player Abilities with Mini-Games

**Research finding:** "One anti-pattern involves tasks that replace everything about a character with a different set of rules... A better approach is to twist the rules without abandoning them."

**For Into the Void:** All abilities use same core system (energy cost, cooldown, target). Don't introduce special timing mini-games or separate mechanics per ability.

---

## Sources

- [Common anti-patterns in MMORPG design](https://www.gamedeveloper.com/design/common-anti-patterns-in-mmorpg-design)
- [8 factors that make or break MMO combat systems](https://biobreak.wordpress.com/2016/03/23/8-factors-that-make-or-break-mmo-combat-systems/)
- [Ability Queue System documentation](https://gascompanion.github.io/ability-queue-system/)
- [Input buffering (combat queueing) feels too unresponsive](https://forum.norestforthewicked.com/t/input-buffering-combat-queueing-feels-too-unresponsive-in-dynamic-situations/16313)
- [Combat Design, Mechanics and Systems](https://gamedesignskills.com/game-design/combat-design/)
- [Bad skill design, good skill design in MMORPG](https://forums.mmorpg.com/discussion/390993/bad-skill-design-good-skill-design-in-mmorpg)
- [ModiBuff: Buff/Debuff library](https://github.com/Chillu1/ModiBuff)
- [Cooldown Manipulation - TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/CooldownManipulation)
- Existing codebase: `apps/game-server/src/game/combat.service.ts` (memory management patterns, session cleanup)
