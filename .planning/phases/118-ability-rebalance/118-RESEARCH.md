# Phase 118: Ability Rebalance - Research

**Researched:** 2026-03-04
**Domain:** Game combat mechanics — ability definitions, effect execution pipeline, shield absorb, damage reduction, damage type specialization, and biome hazard immunity
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ABIL-01 | Plasma Burst base damage reduced from 35 to 28 with bonus +50% to targets above 80% HP (opener niche) | `definitions.ts` holds ABILITY_PLASMA_BURST with `baseDamage: 35`; need conditional bonus in `executeAbilityEffects` reading target.health vs target.maxHealth |
| ABIL-02 | Thermal Lance assigned Thermal damage type with bonus vs frozen biome creatures | `definitions.ts` ABILITY_THERMAL_LANCE has no `damageType`; add `damageType: 'Thermal'` to its damage effect; BIOME_RESISTANCE_PROFILES['frozen_expanse'] has `thermal: -40` vulnerability (1.4x multiplier) — already wired from Phase 117 |
| ABIL-03 | Cryo Blast assigned Cryo damage type with bonus vs volcanic biome creatures | Same pattern as ABIL-02; add `damageType: 'Cryo'`; volcanic_ridge has `cryo: -40` vulnerability |
| ABIL-04 | Electrocute DoT spreads to creatures within 2 tiles (chain lightning, anti-pack niche) | No AoE spread logic exists in ability.service.ts; need new spread handler: find creatures within 2 tiles of primary target, apply `dot` effect to each |
| ABIL-05 | Overload Pulse range increased to 2, hits all creatures in range (AOE clear niche) | Currently `requiresTarget: true, range: 1`; change to `requiresTarget: false` (self-centered AoE) or keep target but hit all in range; need AoE damage execution in service |
| ABIL-06 | Precision Shot reveals stealthed predators in 6-tile cone for 5s (anti-ambush niche) | No stealth/revealed state on Creature entity; predator ambush is a Phase 119 feature — for Phase 118, Precision Shot needs a `reveal` effect type (new) that marks creatures in cone as visible; may be a server-side state with no visible effect until Phase 119 connects stealth |
| ABIL-07 | Void Drain heal increased from 15 to 25 (anti-maniac sustain niche) | Simple numeric change in ABILITY_VOID_DRAIN `heal` effect `baseHeal: 15` → `baseHeal: 25` |
| ABIL-08 | Concussive Strike stuns target for 1s, 3s against maniacs in Frenzy (CC niche) | No stun/CC system exists; need `stun` effect type (new) in AbilityEffect union + server-side stun state in AbilityService (or CombatService) to block creature attacks during stun; Frenzy is a Phase 119 concept — for Phase 118, implement 1s stun universally; extend to 3s vs maniacs (behavior check already available on Creature entity) |
| ABIL-09 | Emergency Shield changed to absorb pool (80 damage within 8s) instead of toughness buff | `shield` AbilityEffect type ALREADY EXISTS in shared-types/game/ability.ts (`{ type: 'shield'; absorbAmount: number; durationMs: number }`); no handler in executeAbilityEffects yet; need to implement shield state in AbilityService and intercept incoming damage in CombatService |
| ABIL-10 | Regeneration Protocol buffed to 80 HP over 10s + removes 1 biome hazard debuff | HoT currently `healPerTick: 8, duration: 10000` = 8×5 ticks = 40 HP; change to `healPerTick: 16` or reduce `tickInterval` to hit 80 HP target; hazard debuff removal is Phase 120 feature — for Phase 118, just update HoT values; add `{ type: 'cleanse', count: 1 }` effect as a no-op stub if needed |
| ABIL-11 | Magnetic Field changed to reflect 30% of ranged damage for 8s | Current: `{ type: 'buff', stat: 'toughness', amount: 8, duration: 12000 }`; need new `reflect` effect type (or reuse `damage_reduction` with a new `reflect` field); reflect is complex — requires intercepting creature damage and dealing back 30%; must track which creature attacked from range |
| ABIL-12 | Fortify Systems changed to flat 15% damage reduction for 10s | `damage_reduction` AbilityEffect type ALREADY EXISTS in shared-types/game/ability.ts (`{ type: 'damage_reduction'; reductionPercent: number; durationMs: number }`); no handler exists in executeAbilityEffects; needs server-side active damage_reduction state and CombatService intercept |
| ABIL-13 | Energy Barrier changed to immunity to biome hazard effects for 20s | Current: `{ type: 'buff', stat: 'resilience', amount: 7, duration: 12000 }`; Phase 120 (Biome Hazard) defines the hazard system; for Phase 118, implement a `hazard_immunity` effect type and store the player's immunity state in AbilityService; Phase 120 HazardService checks this state before applying drain/debuffs |
</phase_requirements>

---

## Summary

Phase 118 rebalances the existing 13 combat abilities by touching three distinct layers of the stack: (1) **ability definitions** in `packages/game-logic/src/ability/definitions.ts`, (2) **effect execution** in `apps/game-server/src/game/ability.service.ts`, and (3) **combat intercept** in `apps/game-server/src/game/combat.service.ts`. The phase depends on Phase 117's damage type pipeline, which is now fully wired: Thermal/Cryo types on abilities automatically interact with creature resistances.

The two most important architectural discoveries are: (a) `shield` and `damage_reduction` effect types **already exist** in the `AbilityEffect` discriminated union (`packages/shared-types/src/game/ability.ts` lines 19-20) but have no execution handlers in `ability.service.ts` or `combat.service.ts` — implementing them is the core mechanical work; and (b) several requirements touch systems that are explicitly Phase 119/120 concerns (Frenzy stun extension, stealth reveal, hazard immunity enforcement). These should be implemented as stubs or server-side state that Phase 119/120 will connect — the flag must exist before downstream phases can act on it.

The requirements divide into four effort tiers: **trivial numeric changes** (ABIL-01 stat, ABIL-02, ABIL-03, ABIL-07), **new server state** (ABIL-09 shield pool, ABIL-12 damage reduction, ABIL-13 hazard immunity), **new combat mechanics** (ABIL-04 DoT spread, ABIL-05 AoE damage, ABIL-08 stun), and **complex cross-system mechanics** (ABIL-06 cone reveal, ABIL-11 damage reflect). ABIL-06 and ABIL-11 are the highest-risk tasks because they require new entity state (stealth flag) and bidirectional damage events (reflect) that have no existing infrastructure.

**Primary recommendation:** Implement the phase in three waves — Wave 1: definitions and trivial changes (ABIL-01/02/03/07); Wave 2: new server state mechanics (ABIL-09/12/13); Wave 3: new combat mechanics (ABIL-04/05/08) with ABIL-06/11 treated as explicit scope decisions (see Open Questions).

---

## Standard Stack

### Core
| Library/Module | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| `@into-the-void/shared-types` | workspace | AbilityEffect union, Creature, DamageType | Already contains `shield` and `damage_reduction` effect type stubs (Phase 115 FNDN-03) |
| `@into-the-void/game-logic` | workspace | Ability definitions (ALL_ABILITIES), damage calculation | Single source of truth for ability data |
| `apps/game-server/src/game/ability.service.ts` | — | Effect execution loop (`executeAbilityEffects`) | All ability side-effects processed here; buffs, heals, damage all handled |
| `apps/game-server/src/game/combat.service.ts` | — | Creature auto-attack path, damage interception | Shield and damage_reduction must intercept here; stun must block `creatureAttackTick` |

### Supporting
| Library/Module | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| `crypto.randomUUID()` | Node built-in | Generate shield/stun state IDs | Same pattern as buff IDs in AbilityService |
| `@into-the-void/entities` | workspace | EntityRegistry, CreatureDefinition.behavior | Behavior check for ABIL-08 maniac stun extension |

### No New Dependencies Required
This phase adds no external npm packages. All patterns extend the existing monorepo toolchain.

---

## Architecture Patterns

### Recommended Project Structure Changes
```
packages/
├── shared-types/src/game/
│   └── ability.ts           # Add new effect types: 'stun', 'hazard_immunity', possibly 'reveal'
├── game-logic/src/ability/
│   └── definitions.ts       # Update 13 ability definitions (numeric, damageType, effect changes)
apps/
└── game-server/src/game/
    ├── ability.service.ts   # Add handlers for 'shield', 'damage_reduction', 'stun', 'hazard_immunity'
    │                        # Add new server state maps: activeShields, activeDamageReductions, stuns, hazardImmunities
    └── combat.service.ts    # Add shield intercept in creatureAttackTick + updateHealth path
                             # Add stun check to block creature attacks
apps/web/src/
    ├── ui/hud/HUD.tsx        # Add shield bar below health bar (ABIL-09 observable shield depleting)
    ├── store/buffStore.ts    # Extend to handle shield/damage_reduction display (optional: separate shieldStore)
    └── network/socket.ts    # Wire new server events: 'shield:apply', 'shield:absorb', 'shield:expire'
```

### Pattern 1: Shield Absorb Pool (ABIL-09)
**What:** When Emergency Shield activates, server tracks `{ absorbRemaining, expiresAt }` per player. Incoming damage from creature auto-attacks is intercepted before being applied to player HP. Absorbed damage decrements the pool. When pool hits 0 or timer expires, shield disappears.
**When to use:** Any `shield` effect type in `executeAbilityEffects`.

```typescript
// apps/game-server/src/game/ability.service.ts

interface ActiveShield {
  playerId: string;
  absorbRemaining: number;
  expiresAt: number;
}

// New map in AbilityService:
private activeShields: Map<string, ActiveShield> = new Map();

// In executeAbilityEffects, after checking effect.type === 'shield':
if (effect.type === 'shield') {
  const shield: ActiveShield = {
    playerId: player.id,
    absorbRemaining: effect.absorbAmount,  // 80
    expiresAt: Date.now() + effect.durationMs,  // 8000ms
  };
  this.activeShields.set(player.id, shield);

  // Emit shield:apply to client for HUD bar
  this.server?.to(socketId).emit('shield:apply', {
    absorbAmount: effect.absorbAmount,
    durationMs: effect.durationMs,
    expiresAt: shield.expiresAt,
  });
}

// New public method called by CombatService before applying damage:
interceptShield(playerId: string, incomingDamage: number): { absorbed: number; passthrough: number } {
  const shield = this.activeShields.get(playerId);
  if (!shield || Date.now() >= shield.expiresAt) {
    this.activeShields.delete(playerId);
    return { absorbed: 0, passthrough: incomingDamage };
  }
  const absorbed = Math.min(shield.absorbRemaining, incomingDamage);
  shield.absorbRemaining -= absorbed;
  if (shield.absorbRemaining <= 0) {
    this.activeShields.delete(playerId);
    // Emit shield:expire
    this.server?.to(/* player socket */).emit('shield:expire', { playerId });
  } else {
    // Emit shield:absorb so client updates the bar
    this.server?.to(/* player socket */).emit('shield:absorb', {
      playerId,
      absorbed,
      remaining: shield.absorbRemaining,
    });
  }
  return { absorbed, passthrough: incomingDamage - absorbed };
}
```

**In `combat.service.ts` `creatureAttackTick`:**
```typescript
// After calculating damageResult, BEFORE applying to player health:
const { absorbed, passthrough } = this.abilityService.interceptShield(
  session.targetPlayerId,
  damageResult.damage
);
const actualDamage = passthrough;
const newHealth = Math.max(0, player.health - actualDamage);
```

### Pattern 2: Flat Damage Reduction (ABIL-12)
**What:** Fortify Systems applies a `damage_reduction` effect. Server stores `{ reductionPercent, expiresAt }` per player. The reduction is applied in `creatureAttackTick` AFTER shield intercept. Also applies when ability hits player (none currently, but the hook must be general).
**When to use:** Any `damage_reduction` effect type.

```typescript
interface ActiveDamageReduction {
  playerId: string;
  reductionPercent: number;  // 0.15 = 15% flat reduction
  expiresAt: number;
}

private activeDamageReductions: Map<string, ActiveDamageReduction> = new Map();

applyDamageReduction(playerId: string, damage: number): number {
  const dr = this.activeDamageReductions.get(playerId);
  if (!dr || Date.now() >= dr.expiresAt) {
    this.activeDamageReductions.delete(playerId);
    return damage;
  }
  return Math.round(damage * (1 - dr.reductionPercent));
}
```

**Key:** Apply damage_reduction AFTER shield absorption so each layer is independently verifiable in the combat log.

### Pattern 3: Stun State (ABIL-08)
**What:** Concussive Strike emits a stun that blocks the creature's next attack cycle. AbilityService maintains `stunnedCreatures: Map<creatureId, stunExpiresAt>`. CombatService checks `isStunned(creatureId)` before executing each attack tick.

```typescript
// apps/game-server/src/game/ability.service.ts
private stunnedCreatures: Map<string, number> = new Map(); // creatureId -> expiresAt

stunCreature(creatureId: string, durationMs: number): void {
  this.stunnedCreatures.set(creatureId, Date.now() + durationMs);
}

isCreatureStunned(creatureId: string): boolean {
  const expiresAt = this.stunnedCreatures.get(creatureId);
  if (!expiresAt) return false;
  if (Date.now() >= expiresAt) {
    this.stunnedCreatures.delete(creatureId);
    return false;
  }
  return true;
}
```

**In executeAbilityEffects, handling new `stun` effect type:**
```typescript
if (effect.type === 'stun' && targetEntityId) {
  const target = await this.zonesService.getEntity(player.position.zoneId, targetEntityId) as Creature | undefined;
  if (target?.type === 'creature') {
    let stunMs = effect.durationMs; // 1000ms base
    // ABIL-08: 3s vs maniacs
    if (target.behavior === 'maniac') {
      stunMs = effect.maniacDurationMs ?? stunMs * 3;
    }
    this.stunCreature(targetEntityId, stunMs);
  }
}
```

**In combat.service.ts `creatureAttackTick`:**
```typescript
// Check stun before attacking
if (this.abilityService.isCreatureStunned(creature.id)) {
  return null; // Creature can't attack while stunned
}
```

### Pattern 4: Hazard Immunity Flag (ABIL-13)
**What:** Energy Barrier sets a timed immunity flag per player. Phase 120 HazardService reads this flag before applying drain/debuffs. For Phase 118, it's a server-side state the service emits to client and stores — Phase 120 will consume it.

```typescript
// apps/game-server/src/game/ability.service.ts
private hazardImmunities: Map<string, number> = new Map(); // playerId -> expiresAt

isHazardImmune(playerId: string): boolean {
  const expiresAt = this.hazardImmunities.get(playerId);
  if (!expiresAt) return false;
  if (Date.now() >= expiresAt) {
    this.hazardImmunities.delete(playerId);
    return false;
  }
  return true;
}
```

The `hazard_immunity` or similar effect type needs adding to the `AbilityEffect` union. Alternatively, repurpose the existing `buff` effect with a special stat key `'hazard_immunity'` that Phase 120 reads from active buffs. This avoids a new union variant but is less type-safe.

**Recommendation:** Add `{ type: 'hazard_immunity'; durationMs: number }` to the AbilityEffect union for clarity. Phase 120 calls `abilityService.isHazardImmune(playerId)` before every hazard tick.

### Pattern 5: AoE Damage — Electrocute DoT Spread (ABIL-04) and Overload Pulse (ABIL-05)
**What:** After hitting the primary target with Electrocute, iterate all creatures in the same zone within 2 tiles of the primary target and apply the `dot` effect. Overload Pulse changes from single-target to all-creatures-in-range.

```typescript
// Finding nearby creatures in ability.service.ts (helper):
private async getNearbyCreatures(
  zoneId: string,
  centerX: number,
  centerY: number,
  radius: number,
  excludeId?: string
): Promise<Creature[]> {
  const zone = await this.zonesService.getZone(zoneId);
  return (zone?.entities ?? []).filter(e =>
    e.type === 'creature' &&
    e.active &&
    e.id !== excludeId &&
    Math.max(Math.abs(e.position.x - centerX), Math.abs(e.position.y - centerY)) <= radius
  ) as Creature[];
}
```

For ABIL-05 (Overload Pulse), change in definitions.ts:
```typescript
// From:
range: 1, requiresTarget: true
// To:
range: 2, requiresTarget: false  // Player-centered AoE; server finds all creatures in range
```

### Pattern 6: Conditional Damage Bonus on HP Threshold (ABIL-01)
**What:** Plasma Burst deals +50% only if target HP > 80% of max. Check in the damage effect handler, not in definitions.ts.

```typescript
// In ability.service.ts executeAbilityEffects, INSIDE 'damage' effect handler:
let bonusMultiplier = 1.0;
if (ability.id === 'plasma_burst') {
  const hpPercent = target.health / target.maxHealth;
  if (hpPercent > 0.80) {
    bonusMultiplier = 1.5; // +50%
  }
}
// Apply bonusMultiplier to baseDamage or as a pre-calculateDamage multiplier
const adjustedBaseDamage = effect.baseDamage * bonusMultiplier;
```

**Alternative:** Add `conditionBonus?: { hpThresholdAbove: number; bonusMultiplier: number }` to the damage effect type in shared-types. This keeps the definition data-driven rather than ability-id-specific hardcodes. Recommended for clean architecture.

### Pattern 7: HoT Buff with Increased Output (ABIL-10)
Regeneration Protocol: change from 8 HP/2s (40 total) to 16 HP/2s over 10s (80 total):
```typescript
// definitions.ts change:
effects: [{ type: 'hot', healPerTick: 16, tickInterval: 2000, duration: 10000 }]
// Result: 5 ticks × 16 = 80 HP total
```
The hazard debuff removal (ABIL-10 "removes 1 biome hazard debuff") is a Phase 120 concern. For Phase 118, just update the HoT values. If a `cleanse` effect stub is needed for Phase 120 reference, it can be added as a comment.

### Client-Side Changes Required

#### Shield Bar in HUD
The success criterion for ABIL-09 states a player must "observe the shield bar depleting rather than their HP dropping." This requires HUD changes:

```tsx
// apps/web/src/ui/hud/HUD.tsx — add shield bar between health and energy bars
{shieldRemaining > 0 && (
  <div className="shield-bar">
    <div className="shield-bar-fill" style={{ width: `${(shieldRemaining / shieldMax) * 100}%` }} />
    <span className="shield-text">{shieldRemaining} shield</span>
  </div>
)}
```

A new `shieldStore.ts` (or extend `buffStore.ts`) must handle `shield:apply`, `shield:absorb`, and `shield:expire` socket events.

#### New Socket Events Required
The following new server-to-client events need adding to `ServerEvents` in `packages/shared-types/src/network/events.ts`:

| Event | Payload | Purpose |
|-------|---------|---------|
| `shield:apply` | `{ absorbAmount, durationMs, expiresAt }` | Client renders shield bar |
| `shield:absorb` | `{ playerId, absorbed, remaining }` | Client depletes shield bar on each hit |
| `shield:expire` | `{ playerId }` | Client removes shield bar |
| `ability:stun` | `{ targetEntityId, durationMs }` | Client visual (optional stun animation) |
| `hazard:immunity` | `{ playerId, durationMs, expiresAt }` | Client HUD indicator for hazard immunity |

#### Combat Log for Damage Reduction
When Fortify Systems is active and an incoming hit is reduced, the combat log should reflect the mitigation. The `combat:damage` payload already carries `damage` (the final number). Adding `reducedBy?: number` to the payload allows the log to show "took 18 [reduced from 21]." This is optional for Phase 118 but required for "the math is verifiable in the combat log" success criterion.

### Anti-Patterns to Avoid

- **Implementing shield in buff system:** The `Buff` interface has `stat: string; amount: number` — it's designed for additive stat buffs, not absorb pools. Do NOT store shield state as a buff. Use a dedicated `activeShields` map in AbilityService.
- **Handling shield in executeAbilityEffects only:** The shield absorb must intercept the creature's incoming damage path, which lives in `combat.service.ts`. If you only apply shield in ability.service.ts without wiring the intercept in combat.service.ts, the shield will never absorb anything.
- **Changing `requiresTarget` without updating validation:** If Overload Pulse becomes `requiresTarget: false`, the hub zone validation that checks for `isUtilityAbility` also needs updating, since it's currently an offensive ability — verify the hub zone blocking logic still applies correctly.
- **Using ability ID checks instead of effect type checks:** Avoid `if (ability.id === 'concussive_strike') { ... stun }`. Instead, add a `stun` effect type to the discriminated union so the handler is generic.
- **Not cleaning up stun/shield state on disconnect/death:** `handleDisconnect` already clears buffs and cooldowns. The new state maps (`activeShields`, `activeDamageReductions`, `stunnedCreatures`, `hazardImmunities`) must all be cleared in `handleDisconnect` for the affected player.
- **Implementing Frenzy stun extension before Phase 119:** The 3s stun duration vs. maniacs in Frenzy (ABIL-08) requires knowing if a creature is in the Frenzy state, which doesn't exist yet. For Phase 118, implement 3s universally against maniacs (behavior check available via `target.behavior === 'maniac'`). The Frenzy-specific extension is a Phase 119 concern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Damage type specialization (ABIL-02/03) | Per-ability damage lookup | Phase 117's `damageType` field on `AbilityEffect.damage` + existing `applyResistanceMultiplier()` | Already fully wired; just add `damageType: 'Thermal'` / `damageType: 'Cryo'` to definitions |
| Shield duration enforcement | Manual expiry in every tick | `expiresAt` timestamp check on read (lazy expiry) | Same pattern as buff expiry; no need for a separate shield tick |
| Nearby creature lookup for AoE | Custom spatial indexing | Direct zone entity array filter with Chebyshev distance | Zone entity arrays are small; no performance concern at current game scale |
| Player stat buff from existing abilities | Remove and reimplement | Keep `buff` effect type for ABIL-10 HoT — only change numeric values | HoT is already implemented via `hot` effect type; changing numbers is the whole task |

---

## Common Pitfalls

### Pitfall 1: Shield Not Intercepting Auto-Attacks
**What goes wrong:** AbilityService stores the shield pool, but `combat.service.ts::creatureAttackTick` applies damage directly to player HP via `playerService.updateHealth()` without consulting AbilityService.
**Why it happens:** The shield absorb hook doesn't exist yet in `creatureAttackTick` — easy to forget to add the intercept call.
**How to avoid:** In `creatureAttackTick`, after calling `calculateDamage()`, add: `const { passthrough } = this.abilityService.interceptShield(session.targetPlayerId, damageResult.damage)` before calling `playerService.updateHealth()`.
**Warning signs:** Shield activates (buff bar shows), but HP still drops at full rate during combat.

### Pitfall 2: Damage Reduction Not Reflected in Combat Log
**What goes wrong:** Flat 15% damage reduction is applied server-side but `combat:damage` emits the post-reduction number without flagging it. Players can't verify "the math" as the success criterion requires.
**Why it happens:** The combat log entry shows `damage: 17` but the player doesn't know it was reduced from `20`.
**How to avoid:** Add `reducedBy?: number` and/or `absorbed?: number` to the `combat:damage` payload in `ServerEvents`. The log renders "You took 17 [15% DR]" when Fortify is active.

### Pitfall 3: AoE Electrocute DoT Spread Hits Dead Creatures
**What goes wrong:** The nearby creature list includes creatures that died during the primary hit or are already dead from earlier combat.
**Why it happens:** Zone entity cache may be stale during the same tick.
**How to avoid:** Filter `e.active && e.health > 0` when building the spread target list.

### Pitfall 4: Plasma Burst HP Threshold Condition Using Stale Health
**What goes wrong:** Target health was read before applying the primary damage calculation. If the threshold check uses pre-hit health, a target at 82% HP and taking the first hit may incorrectly receive the opener bonus on subsequent casts too.
**Why it happens:** The check should use health BEFORE the current hit (opener context = target hasn't been hit yet in this engagement), not health AFTER.
**How to avoid:** Read `target.health / target.maxHealth` BEFORE applying damage in the same call. This is the opener bonus: the target starts the fight near full HP.

### Pitfall 5: Emergency Shield Effect Definition Still Uses `buff` Type
**What goes wrong:** ABILITY_EMERGENCY_SHIELD currently has `effects: [{ type: 'buff', stat: 'toughness', amount: 12, duration: 8000 }]`. Phase 118 must change this to `{ type: 'shield', absorbAmount: 80, durationMs: 8000 }`. If the definition isn't updated, the handler never fires.
**Why it happens:** The `shield` effect type is in shared-types but the definition still uses `buff`.
**How to avoid:** Update the definition in `definitions.ts` and verify the effect type change propagates correctly.

### Pitfall 6: Energy Barrier and Fortify Systems Still Use Stat Buffs
**What goes wrong:** Same as Pitfall 5 — ABILITY_ENERGY_BARRIER and ABILITY_FORTIFY_SYSTEMS must have their `buff` effects replaced with `hazard_immunity`/`damage_reduction` effects respectively. Forgetting to update definitions means the new handlers never fire.
**How to avoid:** Update both definitions atomically with their handler implementations.

### Pitfall 7: New Server State Maps Not Cleaned on Player Disconnect
**What goes wrong:** Player disconnects mid-combat with shield active. On reconnect, shield state is orphaned in memory. Over time, stale entries accumulate.
**Why it happens:** `handleDisconnect()` in AbilityService clears `cooldowns`, `globalCooldowns`, `activeBuffs`, and `activeCasts` — but new maps won't be auto-cleared.
**How to avoid:** In `handleDisconnect()`, explicitly call `this.activeShields.delete(playerId)`, `this.activeDamageReductions.delete(playerId)`, `this.hazardImmunities.delete(playerId)`. For `stunnedCreatures` (keyed by creatureId, not playerId): when a creature dies, its stun is already irrelevant — no special cleanup needed.

### Pitfall 8: Overload Pulse Hits Player in AoE Zone (No Friendly Fire Logic Needed)
**What goes wrong:** Overload Pulse is a player-centered AoE. The zone entity loop includes the player entity. Don't accidentally include non-creature entities or the player themselves in the AoE targets.
**How to avoid:** Filter strictly on `e.type === 'creature' && e.active`.

---

## Code Examples

### Ability Definition Changes Summary (definitions.ts)

```typescript
// ABIL-01: Plasma Burst
effects: [{ type: 'damage', baseDamage: 28, scaling: 1.2 }]
// NOTE: the +50% bonus logic is in ability.service.ts, not in the definition
// OR add conditionBonus field to damage effect type for data-driven approach:
effects: [{ type: 'damage', baseDamage: 28, scaling: 1.2, conditionBonus: { hpThresholdAbove: 0.80, multiplier: 1.5 } }]

// ABIL-02: Thermal Lance — just add damageType
effects: [{ type: 'damage', baseDamage: 28, scaling: 1.0, damageType: 'Thermal' }]

// ABIL-03: Cryo Blast — just add damageType
effects: [{ type: 'damage', baseDamage: 22, scaling: 0.9, damageType: 'Cryo' }]

// ABIL-07: Void Drain — increase heal
effects: [
  { type: 'damage', baseDamage: 18, scaling: 0.8 },
  { type: 'heal', baseHeal: 25, scaling: 0.6 },  // was 15
]

// ABIL-09: Emergency Shield — replace buff with shield
effects: [{ type: 'shield', absorbAmount: 80, durationMs: 8000 }]  // was buff toughness

// ABIL-10: Regeneration Protocol — double HoT output
effects: [{ type: 'hot', healPerTick: 16, tickInterval: 2000, duration: 10000 }]  // 80 HP total

// ABIL-11: Magnetic Field — change to reflect (new effect type needed)
effects: [{ type: 'reflect', reflectPercent: 0.30, durationMs: 8000 }]

// ABIL-12: Fortify Systems — replace buff with damage_reduction
effects: [{ type: 'damage_reduction', reductionPercent: 0.15, durationMs: 10000 }]

// ABIL-13: Energy Barrier — replace buff with hazard_immunity
effects: [{ type: 'hazard_immunity', durationMs: 20000 }]

// ABIL-05: Overload Pulse — range and target changes in definition
range: 2, requiresTarget: false,  // was range: 1, requiresTarget: true
// AoE execution handles finding all creatures in range

// ABIL-08: Concussive Strike — add stun effect
effects: [
  { type: 'damage', baseDamage: 20, scaling: 1.0 },
  { type: 'stun', durationMs: 1000, maniacDurationMs: 3000 },  // new stun effect
]
```

### New AbilityEffect Union Variants Required in shared-types/game/ability.ts

```typescript
// Current:
| { readonly type: 'shield'; readonly absorbAmount: number; readonly durationMs: number }
| { readonly type: 'damage_reduction'; readonly reductionPercent: number; readonly durationMs: number }

// Add for Phase 118:
| { readonly type: 'stun'; readonly durationMs: number; readonly maniacDurationMs?: number }
| { readonly type: 'hazard_immunity'; readonly durationMs: number }
| { readonly type: 'reflect'; readonly reflectPercent: number; readonly durationMs: number }
| { readonly type: 'dot_spread'; readonly radius: number }  // if Electrocute uses dedicated type vs inline logic
```

The `conditionBonus` for Plasma Burst can be added to the `damage` variant or handled inline in ability.service.ts. The former is cleaner.

### Tooltip Description Updates (definitions.ts)
All changed abilities need updated `description` strings to reflect their new behavior for the tooltip verification in success criteria:

```typescript
// ABIL-01: Plasma Burst
description: 'Launch a superheated plasma projectile. Deals 28 base damage, +50% bonus against targets above 80% HP.'

// ABIL-09: Emergency Shield
description: 'Activate emergency shielding that absorbs up to 80 incoming damage within 8 seconds.'

// ABIL-12: Fortify Systems
description: 'Reinforce exo-suit structural integrity, reducing all incoming damage by 15% for 10 seconds.'

// ABIL-13: Energy Barrier
description: 'Project an energy barrier granting immunity to all biome hazard effects for 20 seconds.'
```

---

## State of the Art

| Old State | Phase 118 State | Change |
|-----------|-----------------|--------|
| Plasma Burst: 35 base damage, no niche | Plasma Burst: 28 base damage, +50% opener bonus | Numeric + conditional logic |
| Thermal Lance: no damage type | Thermal Lance: Thermal type (1.4x vs Frozen Expanse via existing resistances) | Add damageType field to definition |
| Cryo Blast: no damage type | Cryo Blast: Cryo type (1.4x vs Volcanic Ridge) | Add damageType field to definition |
| Electrocute: single-target DoT | Electrocute: primary hit + DoT spread to creatures within 2 tiles | New AoE spread handler in ability.service.ts |
| Overload Pulse: single-target, range 1 | Overload Pulse: player-centered AoE, range 2 | requiresTarget change + AoE handler |
| Precision Shot: single-target damage | Precision Shot: damage + 6-tile cone reveal for predators | New reveal effect; new server state |
| Void Drain: 15 HP heal | Void Drain: 25 HP heal | Numeric change |
| Concussive Strike: damage only | Concussive Strike: damage + 1s stun (3s vs maniacs) | New stun state + CombatService intercept |
| Emergency Shield: toughness buff 12 for 8s | Emergency Shield: absorb pool 80 HP for 8s | Replace buff with shield effect; new intercept path |
| Regeneration Protocol: 40 HP over 10s | Regeneration Protocol: 80 HP over 10s + (Phase 120 cleanse stub) | Double healPerTick |
| Magnetic Field: toughness buff 8 for 12s | Magnetic Field: reflect 30% ranged damage for 8s | New reflect effect type; complex intercept |
| Fortify Systems: durability buff 10 for 15s | Fortify Systems: 15% flat damage reduction for 10s | Replace buff with damage_reduction; new intercept path |
| Energy Barrier: resilience buff 7 for 12s | Energy Barrier: hazard immunity for 20s | Replace buff with hazard_immunity flag |
| `shield` and `damage_reduction` in AbilityEffect union | Handlers implemented in ability.service.ts and combat.service.ts | Phase 115 added the types; Phase 118 executes them |
| No HUD shield bar | Shield bar below health bar, depleting in real-time | New client component |

---

## Open Questions

1. **ABIL-06: Precision Shot "reveal stealthed predators" — stealth doesn't exist yet**
   - What we know: Phase 119 introduces Ambush behavior for predators (first attack from stealth deals 2x). For stealth to be revealed, the predator must first have a `stealthed: boolean` flag on the Creature entity.
   - What's unclear: Should Phase 118 add the stealth flag to the Creature entity and implement the reveal cone logic, even though Phase 119 is responsible for setting the flag? Or should ABIL-06 be a stub that emits a `precision:reveal` event but has no effect until Phase 119 populates stealth?
   - Recommendation: Add `stealthed?: boolean` to the `Creature` entity interface in Phase 118 (so Precision Shot can un-set it), but the server-side cone reveal only works meaningfully when Phase 119 sets creatures to stealthed. For Phase 118, implement the cone scan and flag-clearing logic — it will work immediately when Phase 119 starts setting the flag. The success criterion ("reveals stealthed predators in 6-tile cone for 5s") can only be fully tested once Phase 119 ships.

2. **ABIL-11: Magnetic Field damage reflect — what counts as "ranged"?**
   - What we know: The requirement says reflect 30% of "ranged damage." Creature auto-attacks currently all go through `creatureAttackTick` regardless of range (any creature adjacent to player attacks). There's no distinction between melee and ranged damage sources.
   - What's unclear: Does "ranged" mean any creature damage, or only from creatures beyond tile-adjacent range? There are no creature projectile systems.
   - Recommendation: For Phase 118, treat all creature auto-attacks as eligible for reflect (ignoring melee/ranged distinction). Emit a `combat:damage` event back to the attacker (creature) with `damage: reflected` when reflect triggers. This is still complex (damage flowing back to a creature). Alternatively, treat reflect as a secondary hit the player deals to the creature immediately — simpler to implement as an additional `zonesService.updateEntity` health change on the attacker.

3. **Does `dot_spread` for Electrocute need a new effect type or inline logic?**
   - What we know: Electrocute has `effects: [damage, dot]`. The spread should apply the `dot` to nearby creatures, not to the primary target twice.
   - Recommendation: Implement as inline logic in ability.service.ts triggered when a `dot` effect is processed for Electrocute specifically, OR add a `{ type: 'dot', ..., spreadRadius: 2 }` optional field to the dot effect. The inline approach is simpler for Phase 118.

4. **ABIL-10 — Should the "removes 1 biome hazard debuff" requirement be stubbed or deferred?**
   - What we know: Phase 120 defines hazard debuffs. They don't exist in Phase 118.
   - Recommendation: Implement just the HoT buff change (ABIL-10) and add a comment stub. The cleanse mechanic is Phase 120 territory; trying to implement it now creates circular dependencies.

---

## Validation Architecture

> `workflow.nyquist_validation` is `false` in `.planning/config.json` — this section is skipped.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `packages/game-logic/src/ability/definitions.ts` — all 24 ability definitions with current values (Plasma Burst baseDamage: 35, Emergency Shield as buff, Fortify as buff, Energy Barrier as buff, etc.)
- Direct code inspection: `packages/shared-types/src/game/ability.ts` — AbilityEffect union confirms `shield` and `damage_reduction` types already exist (lines 19-20); new `stun`/`hazard_immunity`/`reflect` needed
- Direct code inspection: `apps/game-server/src/game/ability.service.ts` — `executeAbilityEffects` method (lines 472-729) handles only `damage`, `heal`, `buff`, `gather` effect types; `shield`, `damage_reduction`, `dot`, `hot` have no handlers
- Direct code inspection: `apps/game-server/src/game/combat.service.ts` — `creatureAttackTick` applies damage directly via `playerService.updateHealth()` without shield/DR intercept hooks
- Direct code inspection: `packages/shared-types/src/core/entity.ts` — `Creature` interface confirms `behavior: CreatureBehavior` field available for maniac check; no `stealthed` field
- Direct code inspection: `packages/shared-types/src/game/buff.ts` — `Buff` interface is stat-based; not suitable for shield pool state
- Direct code inspection: `apps/web/src/ui/hud/HUD.tsx` — health/energy/xp bars rendered inline; no shield bar present; BuffBar component handles buff display
- Direct code inspection: `apps/web/src/store/buffStore.ts` — ClientBuff has `stat/amount`; not suitable for shield pool state; separate shieldStore needed
- Direct code inspection: `packages/shared-types/src/network/events.ts` — `ServerEvents` interface; no shield/stun/hazard_immunity events defined yet
- Direct code inspection: `packages/game-logic/src/ai/creature-ai.ts` — AiTickResult includes `ambush`/`frenzied` stubs (for Phase 119), confirming stun is Phase 118 work
- `.planning/REQUIREMENTS.md` — ABIL-01 through ABIL-13 full text
- `.planning/ROADMAP.md` — Phase 118 success criteria and dependencies
- Phase 117 verification report — confirms damage type pipeline is fully wired; `damageType` on AbilityEffect.damage works end-to-end

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Phase 117 decisions: `basic_strike` assigned Kinetic; BIOME_RESISTANCE_PROFILES confirmed frozen_expanse { thermal: -40 } and volcanic_ridge { cryo: -40 } — validates ABIL-02/03 bonus will be observable via existing resistance system

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all patterns extend existing code
- Architecture for `shield` and `damage_reduction`: HIGH — types exist in shared-types; execution pattern is clear from existing buff handler code
- Architecture for `stun` and AoE: MEDIUM — no prior stun/AoE in codebase; patterns are standard game dev but need careful CombatService integration
- Architecture for `reflect` (ABIL-11): LOW — reflect is bidirectional damage; no precedent in this codebase; may require significant CombatService changes or be simplified
- Client HUD shield bar: HIGH — pattern is identical to existing health/energy bars; straightforward React + Zustand

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable domain — ability system patterns won't change without a major refactor)
