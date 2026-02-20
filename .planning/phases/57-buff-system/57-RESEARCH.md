# Phase 57 Research: Buff System

**Phase**: 57 - Buff System
**Researcher**: Phase Research Agent
**Date**: 2026-02-20
**Status**: Ready for Planning

## Executive Summary

Phase 57 implements a temporary buff/debuff system that allows abilities to apply timed stat modifications to players and creatures. This builds on Phase 56's ability framework by adding duration-based effects that modify CharacterStats and display visual feedback. The system requires server-side buff tracking, stat recomputation with active buffs, client-side buff UI near health bar, and socket events for buff state synchronization.

**Key Decision**: Buffs are in-memory only (no database persistence) as they are transient combat state that expires on logout/death. This matches the architecture's session-only approach to temporary effects.

## Requirements Analysis

### BUFF-01: Instant Effects
Abilities can apply immediate effects (heal, damage, stat change) without duration.

**Already Implemented in Phase 56:**
- `ability.service.ts` handles damage effects in `useAbility()` (line 208-249)
- Damage calculation uses `calculateDamage()` from game-logic
- `AbilityEffect` discriminated union includes 'damage' and 'heal' types

**Gap for BUFF-01:**
- Heal effect execution not implemented (only damage works)
- Instant stat changes (e.g., instant +50 Power) need implementation
- No visual feedback for instant heals/buffs

**Implementation Needs:**
- Add heal effect handling in `ability.service.ts` (modify player.health)
- Add instant stat change effect (no duration, immediate one-time boost)
- Emit `player:health` event for heals
- Client-side heal number animation (green floating text)

### BUFF-02: Duration Buffs
Abilities can apply temporary stat modifications with timers (e.g., +20 Power for 10 seconds).

**Current State:**
- `AbilityEffect` type includes 'buff' variant: `{ type: 'buff'; stat: string; amount: number; duration: number }`
- No server-side buff tracking exists
- No buff expiration mechanism exists

**Gap for BUFF-02:**
- Server needs in-memory buff storage per player/creature
- Buff tick system to check expiration times
- Buff application modifies effective stats
- Buff removal recomputes stats without the buff

**Implementation Needs:**
- `BuffService` or extend `AbilityService` with buff tracking
- In-memory Map: `playerId -> Buff[]` where `Buff = { id, stat, amount, expiresAt }`
- Tick loop (100-500ms) to check for expired buffs
- Integrate buffs into `computeCharStats()` or add separate `applyActiveBuffs()` step
- Socket events: `buff:apply`, `buff:expire` to sync client

### BUFF-03: Buff Icons UI
Active buffs display as icons near health bar with remaining duration.

**Current State:**
- HUD.tsx renders health/energy bars (lines 93-116)
- No buff icon container exists
- Client has no buff state tracking

**Gap for BUFF-03:**
- Client-side buff store (Zustand) tracking active buffs
- Buff icon component with tooltip (name, stat, amount, remaining time)
- Visual layout near health bar (row of icons below health/energy)
- Duration timer animation (countdown text or radial progress)

**Implementation Needs:**
- `buffStore.ts` with `{ buffs: Buff[]; addBuff(); removeBuff(); }`
- Socket listener for `buff:apply` and `buff:expire` to update store
- `BuffBar.tsx` component rendering buff icons
- CSS for buff icon layout (flex row, max 10 visible, scroll if more)
- Tooltip on hover showing buff details

### BUFF-04: Buff Stat Modifiers in Combat
Buff stat changes affect damage calculations and survivability.

**Current State:**
- `computeCharStats()` computes base + equipment stats (char-stats.ts)
- Combat damage uses `playerStats` and `creatureStats` from `computeCharStats()`
- No integration point for temporary buffs

**Gap for BUFF-04:**
- Stats computation must include active buffs
- Server must pass active buffs to damage calculation

**Implementation Needs:**
- Extend `computeCharStats()` signature to accept optional `activeBuffs: Buff[]`
- OR create wrapper `computeEffectiveStats(level, equipment, buffs)` that adds buff deltas
- Update `ability.service.ts` damage calculation to include active buffs in stats
- Update `combat.service.ts` to include buffs in auto-attack damage

### BUFF-05: Buff Expiration
Buffs expire after duration and remove stat modifications automatically.

**Current State:**
- No expiration mechanism exists
- No cleanup on buff end

**Gap for BUFF-05:**
- Tick loop to detect expired buffs
- Remove expired buffs from storage
- Broadcast `buff:expire` event to clients
- Recompute stats on expiration

**Implementation Needs:**
- Tick system in `BuffService` or `AbilityService` (every 100-500ms)
- Filter out buffs where `Date.now() >= expiresAt`
- Emit `buff:expire` event with buffId
- Client removes buff icon from UI

### BUFF-06: Server Buff State & Events
Server tracks buff state and broadcasts apply/expire to clients.

**Current State:**
- Socket events defined in `events.ts` (no buff events exist yet)
- No server-side buff state tracking

**Gap for BUFF-06:**
- Define `buff:apply` and `buff:expire` in `ServerEventType`
- Server emits events on buff add/remove
- Client listens and updates UI

**Implementation Needs:**
- Add to `ServerEventType`: `'buff:apply' | 'buff:expire'`
- Add to `ServerEvents` interface:
  - `'buff:apply': { buffId: string; stat: string; amount: number; expiresAt: number; iconColor: number; displayName: string }`
  - `'buff:expire': { buffId: string }`
- Server emits `buff:apply` when ability applies buff
- Server emits `buff:expire` when buff times out

## Architecture Deep Dive

### Server-Side Buff Management

**Buff Data Structure:**
```typescript
interface Buff {
  id: string;              // unique buff instance ID (UUID)
  abilityId: string;       // source ability for display/logic
  stat: keyof CharacterStats; // which stat to modify
  amount: number;          // delta (+20 for buff, -10 for debuff)
  expiresAt: number;       // timestamp when buff expires
  displayName: string;     // e.g., "Toughen"
  iconColor: number;       // hex color for icon (fallback)
}
```

**Storage Pattern:**
```typescript
// In AbilityService or new BuffService
private activeBuffs: Map<string, Buff[]> = new Map(); // playerId -> buffs

applyBuff(playerId: string, buff: Buff): void {
  const buffs = this.activeBuffs.get(playerId) ?? [];
  buffs.push(buff);
  this.activeBuffs.set(playerId, buffs);

  // Emit to client
  const player = this.playerService.getPlayerBySocket(socketId);
  this.server?.to(player.position.zoneId).emit('buff:apply', {
    buffId: buff.id,
    stat: buff.stat,
    amount: buff.amount,
    expiresAt: buff.expiresAt,
    iconColor: buff.iconColor,
    displayName: buff.displayName,
  });
}
```

**Expiration Tick:**
```typescript
// Self-rescheduling tick pattern (like AI tick)
private tickBuffExpiration(): void {
  const now = Date.now();

  for (const [playerId, buffs] of this.activeBuffs.entries()) {
    const expired: string[] = [];

    for (const buff of buffs) {
      if (now >= buff.expiresAt) {
        expired.push(buff.id);
        // Emit expire event
        this.server?.emit('buff:expire', { buffId: buff.id });
      }
    }

    // Remove expired buffs
    if (expired.length > 0) {
      const remaining = buffs.filter(b => !expired.includes(b.id));
      if (remaining.length === 0) {
        this.activeBuffs.delete(playerId);
      } else {
        this.activeBuffs.set(playerId, remaining);
      }
    }
  }

  // Reschedule
  setTimeout(() => this.tickBuffExpiration(), 500);
}
```

**Stat Integration:**
```typescript
// Option 1: Extend computeCharStats in game-logic
export function computeCharStats(
  level: number,
  equipment: EquipmentJson,
  target: StatScaleTarget = 'player',
  activeBuffs: Buff[] = [] // NEW PARAMETER
): CharacterStats {
  // Existing base + equipment logic...

  // Apply active buffs
  for (const buff of activeBuffs) {
    if (buff.stat in stats) {
      (stats as any)[buff.stat] += buff.amount;
    }
  }

  return stats;
}

// Option 2: Wrapper function (less invasive)
export function computeEffectiveStats(
  level: number,
  equipment: EquipmentJson,
  target: StatScaleTarget,
  activeBuffs: Buff[]
): CharacterStats {
  const baseStats = computeCharStats(level, equipment, target);

  for (const buff of activeBuffs) {
    if (buff.stat in baseStats) {
      (baseStats as any)[buff.stat] += buff.amount;
    }
  }

  return baseStats;
}
```

**Recommendation**: Use Option 1 (extend `computeCharStats`) to keep stat calculation centralized and avoid duplicating logic.

### Client-Side Buff UI

**Buff Store:**
```typescript
// apps/web/src/store/buffStore.ts
interface BuffState {
  buffs: Map<string, ClientBuff>; // buffId -> buff
  addBuff: (buff: ClientBuff) => void;
  removeBuff: (buffId: string) => void;
  getBuffs: () => ClientBuff[];
}

interface ClientBuff {
  id: string;
  displayName: string;
  stat: string;
  amount: number;
  expiresAt: number;
  iconColor: number;
}

// Wire socket events
gameSocket.on('buff:apply', (data) => {
  useBuffStore.getState().addBuff({
    id: data.buffId,
    displayName: data.displayName,
    stat: data.stat,
    amount: data.amount,
    expiresAt: data.expiresAt,
    iconColor: data.iconColor,
  });
});

gameSocket.on('buff:expire', (data) => {
  useBuffStore.getState().removeBuff(data.buffId);
});
```

**Buff Bar Component:**
```tsx
// apps/web/src/ui/hud/BuffBar.tsx
export const BuffBar: React.FC = () => {
  const buffs = useBuffStore((state) => Array.from(state.buffs.values()));

  return (
    <div className="buff-bar">
      {buffs.map(buff => (
        <BuffIcon key={buff.id} buff={buff} />
      ))}
    </div>
  );
};

function BuffIcon({ buff }: { buff: ClientBuff }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const ms = Math.max(0, buff.expiresAt - Date.now());
      setRemaining(ms);
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [buff.expiresAt]);

  const seconds = Math.ceil(remaining / 1000);

  return (
    <div
      className="buff-icon"
      style={{ backgroundColor: `#${buff.iconColor.toString(16).padStart(6, '0')}` }}
      title={`${buff.displayName}\n${buff.stat} ${buff.amount > 0 ? '+' : ''}${buff.amount}`}
    >
      <span className="buff-duration">{seconds}s</span>
    </div>
  );
}
```

**Layout in HUD:**
- Insert BuffBar below energy bar in HUD.tsx
- Horizontal row of icons (max 10 visible, scrollable)
- Each icon 32x32px with duration text overlay
- Tooltip shows full buff details

### Socket Events

**New Events to Add:**

```typescript
// packages/shared-types/src/network/events.ts

// Add to ServerEventType:
| 'buff:apply'
| 'buff:expire'

// Add to ServerEvents:
'buff:apply': {
  buffId: string;
  displayName: string;
  stat: string;
  amount: number;
  expiresAt: number;
  iconColor: number;
};
'buff:expire': {
  buffId: string;
};
```

### Ability Effect Execution

**Extend AbilityService.useAbility():**

```typescript
// After existing damage effect handling (line 208-249)

for (const effect of ability.effects) {
  if (effect.type === 'damage' && target) {
    // Existing damage logic...
  }

  // NEW: Heal effect
  if (effect.type === 'heal') {
    const healAmount = effect.baseHeal + (effect.scaling * playerStats.power);
    const newHealth = Math.min(player.maxHealth, player.health + healAmount);
    this.playerService.updateHealth(player.id, newHealth);

    // Emit heal event for client animation
    client.emit('combat:heal', {
      targetId: player.id,
      amount: healAmount,
    });
  }

  // NEW: Buff effect
  if (effect.type === 'buff') {
    const buff: Buff = {
      id: uuidv4(),
      abilityId: ability.id,
      stat: effect.stat as keyof CharacterStats,
      amount: effect.amount,
      expiresAt: Date.now() + effect.duration,
      displayName: ability.displayName,
      iconColor: ability.iconColor,
    };

    this.applyBuff(player.id, buff);
  }

  // NEW: Debuff effect (same as buff but on target)
  if (effect.type === 'debuff' && target) {
    const debuff: Buff = {
      id: uuidv4(),
      abilityId: ability.id,
      stat: effect.stat as keyof CharacterStats,
      amount: -effect.amount, // Negative for debuff
      expiresAt: Date.now() + effect.duration,
      displayName: ability.displayName,
      iconColor: ability.iconColor,
    };

    this.applyBuffToCreature(player.position.zoneId, targetEntityId!, debuff);
  }
}
```

## Prior Work Analysis

### Phase 56 Foundations

**What Works:**
- AbilityEffect discriminated union includes buff/debuff types (ability.ts line 12-13)
- AbilityService validates and executes abilities with damage
- Cooldown tracking works (in-memory Map per player)
- Socket events sync client state (ability:result, ability:cooldown)
- Client abilityStore tracks cooldowns and updates UI

**What to Reuse:**
- In-memory Map pattern for buff tracking (same as cooldowns)
- Socket event pattern for buff:apply/expire (same as ability:cooldown)
- Tick loop pattern from AI service for buff expiration
- Zustand store pattern for client buff state

### Existing Stat System

**CharacterStats (8 stats):**
- Defined in `shared-types/src/core/player.ts` lines 61-78
- Used by `computeCharStats()` in game-logic
- Already integrated into combat damage calculation

**Stat Computation Flow:**
1. `computeCharStats(level, equipment, target)` → base + equipment stats
2. Used in `ability.service.ts` line 213, 216 for damage calculation
3. Used in `combat.service.ts` for auto-attack damage

**Integration Point:**
- Add `activeBuffs` parameter to `computeCharStats()`
- Pass player/creature buffs when computing stats for combat
- Stats with buffs applied automatically affect damage/defense

### Item Effects vs Ability Buffs

**Item Effects (packages/items/src/types.ts line 34-45):**
- `stat_buff` effect already exists for consumables
- Trigger: `on_use` (one-time)
- No duration tracking (instant apply)

**Ability Buffs (NEW):**
- Trigger: ability use
- Duration: timed (5-30 seconds typical)
- Tracked per player/creature
- Expire automatically

**Distinction**: Item buffs are instant stat boosts (consumables), ability buffs are duration-based combat buffs. Both modify CharacterStats but via different systems.

## Technical Challenges

### Challenge 1: Buff Stacking Rules

**Problem**: What happens if same buff applied twice? Do they stack, refresh, or replace?

**Options:**
1. **Stack**: Multiple instances add together (+20 Power twice = +40 total)
2. **Refresh**: Reset duration but keep same amount
3. **Replace**: New buff overwrites old one
4. **No overlap**: Prevent applying if already active

**Recommendation**: Use **Refresh** strategy for same abilityId + stat combo. This prevents abuse (spam-casting for stacks) while allowing buff uptime management.

**Implementation:**
```typescript
applyBuff(playerId: string, newBuff: Buff): void {
  const buffs = this.activeBuffs.get(playerId) ?? [];

  // Check for existing buff with same abilityId + stat
  const existingIndex = buffs.findIndex(b =>
    b.abilityId === newBuff.abilityId && b.stat === newBuff.stat
  );

  if (existingIndex >= 0) {
    // Refresh duration
    buffs[existingIndex].expiresAt = newBuff.expiresAt;
  } else {
    // Add new buff
    buffs.push(newBuff);
  }

  this.activeBuffs.set(playerId, buffs);
}
```

### Challenge 2: Buff Persistence

**Problem**: Should buffs persist across disconnect/death?

**Decision**: NO. Buffs are transient combat state.

**Rationale:**
- Combat buffs are short-lived (5-30 seconds)
- Logging out mid-buff is edge case (combat lockout prevents logout)
- Death should clear all buffs (fresh start on respawn)
- No database writes = better performance

**Implementation:**
- On disconnect: `this.activeBuffs.delete(playerId)` (cleanup)
- On death: Clear buffs before respawn
- No DB persistence needed

### Challenge 3: Buff Icon Visual Feedback

**Problem**: How to show buff duration countdown clearly?

**Options:**
1. Text overlay showing remaining seconds
2. Radial progress circle (like cooldown sweep)
3. Bar fill showing time remaining
4. Pulsing glow when about to expire

**Recommendation**: Combine **text overlay (seconds)** + **fade-out animation when < 3s remaining**. Simple, clear, and matches ability cooldown pattern.

**CSS:**
```css
.buff-icon {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 2px solid var(--color-border);
  transition: opacity 0.3s;
}

.buff-icon.expiring {
  animation: buff-pulse 1s infinite;
}

@keyframes buff-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.buff-duration {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 10px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px black;
}
```

### Challenge 4: Stat Recomputation Performance

**Problem**: Recomputing stats on every buff apply/expire could be expensive if done frequently.

**Analysis:**
- `computeCharStats()` is pure function (no DB calls)
- Current usage: called on equipment change (infrequent)
- Buff apply/expire: could be frequent (multiple buffs per player in combat)

**Concern**: If 100 players have 5 buffs each, tick loop checks 500 buffs every 500ms. Each expiration triggers stat recompute.

**Mitigation:**
1. Lazy recomputation: Only recompute when stats are needed (damage calc, not on every tick)
2. Cache stats until next buff change (invalidate cache on apply/expire)
3. Batch expiration: Process all expirations in tick, then recompute once

**Recommendation**: **Lazy recomputation**. Don't recompute on buff apply/expire. Instead, pass `activeBuffs` to `computeCharStats()` at the moment of damage calculation. This keeps stat computation on the critical path (combat) and avoids unnecessary work.

### Challenge 5: Buff on Creatures vs Players

**Problem**: Do creatures (NPCs) receive buffs from abilities?

**Requirements Check:**
- BUFF-04 says "buffed stats affect combat" (implies player buffs)
- No mention of creature buffs

**Recommendation**: Implement buffs for **players only** in Phase 57. Creature buffs can be added in Phase 58 if needed for defensive abilities (e.g., boss shields). This simplifies initial implementation.

**Simplification:**
- `activeBuffs: Map<string, Buff[]>` only stores player buffs
- Debuffs on creatures stored separately: `creatureDebuffs: Map<zoneId, Map<entityId, Buff[]>>`
- OR defer creature debuffs to Phase 58

## Success Criteria Validation

**From ROADMAP.md:**

1. **Defensive abilities apply duration buffs with stat increases**
   - Requires: Buff effect execution in AbilityService
   - Requires: Buff storage and expiration
   - Requires: Stat integration (computeCharStats with buffs)

2. **Active buffs display as icons with remaining duration timers**
   - Requires: buffStore on client
   - Requires: BuffBar component in HUD
   - Requires: Socket events (buff:apply, buff:expire)

3. **Buffed stats affect combat damage and survivability**
   - Requires: Pass activeBuffs to computeCharStats
   - Requires: Use buffed stats in damage calculations

4. **Buffs automatically expire and remove stat modifications**
   - Requires: Tick loop for expiration
   - Requires: Emit buff:expire event
   - Requires: Client removes buff icon on expire

**All criteria are achievable with proposed architecture.**

## Open Questions for Planning

1. **Buff Stacking**: Confirm refresh strategy (same abilityId+stat refreshes duration, different buffs stack)?
2. **Max Buffs**: Should there be a limit (e.g., max 10 active buffs per player)? Or unlimited?
3. **Buff Visuals**: Do we need ability-specific icons, or is colored square + text sufficient for MVP?
4. **Debuffs on Creatures**: Include in Phase 57 or defer to Phase 58?
5. **Buff Tooltips**: Show on HUD buff icons or only in combat log?
6. **Stat Caps**: Should buffed stats have caps (e.g., max 200% Power)? Or allow unlimited stacking?

**Recommendations:**
1. Refresh strategy (prevents abuse)
2. Max 15 buffs (performance safety)
3. Colored squares for MVP (icons in Phase 58)
4. Defer creature debuffs to Phase 58
5. Tooltips on hover (standard pattern)
6. No caps for Phase 57 (can add in balance pass)

## Implementation Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Buff tick loop performance at scale | Medium | Low | Self-rescheduling pattern (proven in AI service), sparse iteration (only active players) |
| Stat recomputation bottleneck | Medium | Medium | Lazy recomputation (only on damage calc), not on every tick |
| Buff stacking exploits (spam-casting) | High | Medium | Refresh strategy prevents stacking same buff |
| UI clutter with many buffs | Low | Medium | Max 10 visible icons, scroll for more |
| Socket event spam (many buffs) | Low | Low | Buffs are infrequent (abilities have cooldowns) |
| Buff state desync (client/server) | Medium | Low | Server is source of truth, client subscribes to events |

## Phase Dependencies

**Phase 56 (Complete) Provides:**
- AbilityDefinition with buff effect types
- AbilityService with ability execution
- Socket events for ability use/result
- Client abilityStore and ActionBar UI

**Phase 57 Requires from Phase 56:**
- Ability execution flow (useAbility method)
- AbilityEffect discriminated union
- Socket infrastructure

**Phase 57 Blocks:**
- Phase 58 (Ability Content & Polish) - needs buff system to define defensive abilities

## Planning Recommendations

### Suggested Work Breakdown

**Plan 57-01: Server Buff State & Events (Foundation)**
- Add buff:apply, buff:expire to ServerEvents
- Create Buff interface in shared-types
- Add activeBuffs Map to AbilityService (or new BuffService)
- Implement applyBuff() and removeBuff() methods
- Add tick loop for buff expiration
- Emit socket events on apply/expire
- Handle buff cleanup on disconnect

**Plan 57-02: Buff Effect Execution & Stat Integration**
- Extend computeCharStats() to accept activeBuffs parameter
- Add heal effect execution in AbilityService
- Add buff effect execution (apply buff on ability use)
- Update damage calculation to use buffed stats
- Add instant stat change effect (BUFF-01)
- Test: defensive ability applies buff and increases toughness in combat

**Plan 57-03: Client Buff UI & Visual Feedback**
- Create buffStore.ts with Zustand
- Wire socket listeners for buff:apply and buff:expire
- Create BuffBar.tsx component
- Create BuffIcon component with duration countdown
- Add BuffBar to HUD below energy bar
- Add CSS for buff icon layout and animations
- Test: buff icons appear/disappear with correct timers

**Verification:**
- Defensive ability grants +20 Toughness for 10s
- Buff icon appears in HUD with countdown
- Combat damage reduced while buff active
- Buff expires after 10s and icon disappears
- Multiple buffs display correctly (up to 10)

## Resources & References

**Existing Codebase:**
- Phase 56 plans: `.planning/phases/56-core-ability-system/56-01-PLAN.md`
- AbilityService: `apps/game-server/src/game/ability.service.ts`
- AbilityEffect types: `packages/shared-types/src/game/ability.ts`
- CharacterStats: `packages/shared-types/src/core/player.ts`
- computeCharStats: `packages/game-logic/src/stats/char-stats.ts`
- HUD component: `apps/web/src/ui/hud/HUD.tsx`
- Socket events: `packages/shared-types/src/network/events.ts`

**Architecture Patterns:**
- In-memory Map for transient state (cooldowns, buffs)
- Tick loop pattern (AI service, respawn service)
- Socket event sync (ability:cooldown, combat:damage)
- Zustand store pattern (abilityStore, combatStore)

**External References:**
- GCD and cooldown design: STACK-ACTIVE-ABILITIES.md
- Buff system patterns: World of Warcraft, Guild Wars 2 (duration buffs, icon display)

## Conclusion

Phase 57 is well-defined with clear requirements and a proven architectural foundation from Phase 56. The buff system extends existing patterns (in-memory state, socket events, Zustand stores) without requiring new external dependencies. The main complexity is stat integration, which can be solved by extending `computeCharStats()` to accept optional buff parameters.

**Ready for Planning**: All technical challenges identified with solutions. Recommend 3-plan breakdown for parallel execution.
