# Phase 117: Damage Types and Creature Resistances - Research

**Researched:** 2026-03-03
**Domain:** Game combat mechanics — damage type pipeline, creature resistance data, floating UI
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DMGT-01 | calculateDamage() accepts damageType and defenderResistances, applies resistance multiplier (0.5x–1.5x) | Existing function signature in `packages/game-logic/src/combat/damage.ts` — DamageParams interface needs two new fields; multiplier clamped to [0.3, 1.5] per DMGT-03 |
| DMGT-02 | All 83+ creatures have explicit resistance values populated per biome theme | 77 creature IDs confirmed in ENTITY_IDS; creatures.ts (48 defs), aquatic-creatures.ts (14), exotic-creatures.ts (15) — all currently use NEUTRAL_RESISTANCES placeholder |
| DMGT-03 | Resistance capped at 70% reduction maximum (0.3x floor) — no creature immunity | Enforce via Math.max(0.3, Math.min(1.5, multiplier)) in calculateDamage() |
| DMGT-04 | Damage type label shown in combat log entries | CombatLogEntry interface in combatLogStore.ts needs optional damageType field; combat:damage socket payload needs damageType; display as "[Thermal] 34" |
| DMGT-05 | Color-coded floating damage numbers per type (Thermal=orange, Cryo=cyan, Bio=green, Kinetic=white) | EntityRenderer.createFloatingDamage() currently takes isPlayerDamage bool for color; needs damageType param; WorldScene.showDamageNumber() needs to forward it |
| DMGT-06 | Gear items that boost specific damage type output (damage_type_bonus effect on items) | ItemEffect discriminated union in packages/items/src/types.ts needs new variant; calculateDamage() needs to read it from attackerStats or separate bonus param |
| DMGT-07 | Creature resistance distribution matches biome lore (Frozen Expanse creatures resist Cryo, vulnerable to Thermal) | World Bible and biome.ts confirm biome themes — mapping table documented in Architecture Patterns below |
</phase_requirements>

---

## Summary

Phase 117 wires up the resistance data structures that Phase 115 added to shared-types into the actual damage pipeline. The `DamageType` union, `DamageResistances` interface, and `NEUTRAL_RESISTANCES` constant already exist in `packages/shared-types/src/game/combat.ts`. The `CreatureDefinition.resistances` field already exists in `packages/entities/src/types.ts` and every creature definition already carries the field (set to `NEUTRAL_RESISTANCES`). The phase's work is: (1) make `calculateDamage()` consume those resistances, (2) assign biome-appropriate values to all 83 creature definitions, (3) surface the type in combat log and floating numbers, and (4) add `damage_type_bonus` as a new `ItemEffect` variant.

The codebase is cleanly layered — game-logic → entities → game-server → web client — with no cross-cutting shortcuts. All changes follow an inside-out path: shared-types types first (already done), game-logic calculation second, entity definitions third, server event payloads fourth, client rendering last.

The biggest single task by line count is populating biome resistances for all 83+ creatures across three definition files. The logic is straightforward per creature (assign values based on biome), but requires touching every creature constant and the automated test that validates resistance presence.

**Primary recommendation:** Extend `DamageParams` with optional `damageType` and `defenderResistances` fields so the function degrades gracefully (Kinetic/neutral when absent). Then populate all creature resistances using a single `BIOME_RESISTANCE_PROFILES` lookup table to avoid repetition. Finally update the `combat:damage` socket payload to carry `damageType` so client-side rendering has the data it needs.

---

## Standard Stack

### Core
| Library/Module | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| `@into-the-void/shared-types` | workspace | DamageType, DamageResistances types | Already contains the types from Phase 115 (FNDN-01, FNDN-02) |
| `@into-the-void/game-logic` | workspace | calculateDamage() — pure function | Server-authoritative calculation; no UI concerns |
| `@into-the-void/entities` | workspace | CreatureDefinition.resistances | Single source of truth for creature data |
| `@into-the-void/items` | workspace | ItemEffect union — damage_type_bonus | Canonical item effect pattern |
| Phaser 3 | existing | Floating damage text tweens | EntityRenderer.createFloatingDamage() already uses it |
| Zustand | existing | combatLogStore state | Pattern already used across all game stores |

### No New Dependencies Required
This phase adds no external libraries. All patterns use the existing monorepo toolchain.

---

## Architecture Patterns

### Recommended Project Structure Changes
```
packages/
├── shared-types/src/game/
│   └── combat.ts           # DamageType + DamageResistances already here (FNDN-01/02)
├── game-logic/src/combat/
│   ├── damage.ts           # Extend DamageParams, update calculateDamage()
│   └── damage.test.ts      # New resistance tests
├── entities/src/
│   ├── definitions/creatures.ts        # Populate resistances
│   ├── definitions/aquatic-creatures.ts
│   ├── definitions/exotic-creatures.ts
│   └── biome-resistance-profiles.ts   # NEW: BIOME_RESISTANCE_PROFILES lookup
├── items/src/
│   └── types.ts            # Add damage_type_bonus to ItemEffect union
apps/
├── game-server/src/game/
│   ├── ability.service.ts  # Pass damageType in combat:damage emit
│   └── combat.service.ts   # Pass damageType in combat:damage emit
└── web/src/
    ├── store/combatLogStore.ts          # Add damageType to CombatLogEntry
    └── game/rendering/EntityRenderer.ts # Color per type in createFloatingDamage()
    └── game/scenes/WorldScene.ts        # Forward damageType to EntityRenderer
```

### Pattern 1: Extending DamageParams (backward-compatible)
**What:** Add optional `damageType` and `defenderResistances` to DamageParams. When absent, no resistance multiplier applied (preserves existing auto-attack code paths that don't yet supply the type).
**When to use:** Whenever a damage call knows the type (ability hits, creature attacks that have a natural type).

```typescript
// packages/game-logic/src/combat/damage.ts
export interface DamageParams {
  baseDamage: number;
  attackerLevel: number;
  defenderLevel: number;
  attackerStats?: Partial<CharacterStats>;
  defenderStats?: Partial<CharacterStats>;
  weaponDamage?: number;
  armorReduction?: number;
  critChance?: number;
  critMultiplier?: number;
  // Phase 117 additions:
  damageType?: DamageType;
  defenderResistances?: DamageResistances;
  damageBonusMultiplier?: number;  // For damage_type_bonus gear effect
}

export const RESISTANCE_FLOOR = 0.3;  // 70% max reduction (DMGT-03)
export const RESISTANCE_CEILING = 1.5; // 50% max vulnerability

export function applyResistanceMultiplier(
  damage: number,
  damageType: DamageType,
  resistances: DamageResistances
): number {
  // resistances values are percentage points: 50 = 50% resistance, -20 = 20% vulnerability
  const resistValue = resistances[damageType.toLowerCase() as keyof DamageResistances];
  const multiplier = 1 - (resistValue / 100);
  const clamped = Math.max(RESISTANCE_FLOOR, Math.min(RESISTANCE_CEILING, multiplier));
  return damage * clamped;
}
```

### Pattern 2: BIOME_RESISTANCE_PROFILES lookup table
**What:** A single exported lookup in `packages/entities/src/biome-resistance-profiles.ts` mapping `BiomeType` to a `DamageResistances` profile. Individual creature definitions reference it rather than embedding magic numbers.
**When to use:** Populating all 83 creature resistance fields.

```typescript
// packages/entities/src/biome-resistance-profiles.ts
import type { DamageResistances } from '@into-the-void/shared-types';
import type { BiomeType } from '@into-the-void/shared-types';

export const BIOME_RESISTANCE_PROFILES: Record<BiomeType, DamageResistances> = {
  // Tier I — Frontier biomes
  void_plains:    { thermal: 0,   cryo: 0,   bio: 0,   kinetic: 0 },  // neutral
  fungal_forest:  { thermal: 0,   cryo: 0,   bio: 40,  kinetic: 0 },  // bio-adapted
  ancient_ruins:  { thermal: 0,   cryo: 0,   bio: 0,   kinetic: 20 }, // hardened shell
  tidal_pools:    { thermal: 0,   cryo: 30,  bio: 0,   kinetic: 0 },  // cold-water adapted

  // Tier II — Hazardous
  toxic_wastes:   { thermal: 0,   cryo: 0,   bio: 60,  kinetic: 0 },
  miasma_marshes: { thermal: 0,   cryo: 0,   bio: 50,  kinetic: 0 },
  petrified_expanse: { thermal: 0, cryo: 0,  bio: 0,   kinetic: 40 },
  bioluminescent_depths: { thermal: 10, cryo: 10, bio: 30, kinetic: 0 },
  kelp_forests:   { thermal: 0,   cryo: 20,  bio: 20,  kinetic: 0 },

  // Tier III — Hostile
  frozen_expanse: { thermal: -40, cryo: 60,  bio: 0,   kinetic: 10 }, // Thermal vuln, Cryo immune-ish
  volcanic_ridge: { thermal: 60,  cryo: -40, bio: 0,   kinetic: 10 }, // Thermal immune-ish, Cryo vuln
  crystal_caves:  { thermal: 0,   cryo: 20,  bio: 0,   kinetic: 50 }, // Crystalline shell
  crystalline_wastes: { thermal: 0, cryo: 30, bio: 0,  kinetic: 50 },
  starfall_crater: { thermal: 20, cryo: 0,   bio: -20, kinetic: 20 }, // Void-corrupted
  deep_trenches:  { thermal: 20,  cryo: 40,  bio: 30,  kinetic: -20 }, // Pressure-adapted

  // Tier IV — Extreme
  void_rift:      { thermal: 0,   cryo: 0,   bio: 0,   kinetic: -30 }, // Reality-distorted
};
```

**Note:** These values drive DMGT-07. They enforce the lore requirement that Frozen Expanse creatures resist Cryo and are vulnerable to Thermal, and Volcanic Ridge creatures are the inverse. All values stay within [-40, 60] range, which after clamping produces multipliers of [0.4x, 1.4x] — within the 0.3x floor/1.5x ceiling constraint.

### Pattern 3: damage_type_bonus in ItemEffect
**What:** New discriminated union variant in `packages/items/src/types.ts`. Server reads it in `computeCharStats()` or directly in `executeAbilityEffects()` to apply an additive multiplier.
**When to use:** Items that specialize in a damage type (DMGT-06 — at least one per type).

```typescript
// packages/items/src/types.ts — add to ItemEffect union:
| { readonly type: 'damage_type_bonus'; readonly damageType: DamageType; readonly bonusPercent: number }
```

The server reads this in `ability.service.ts` when building the damage call:

```typescript
// apps/game-server/src/game/ability.service.ts
// Inside executeAbilityEffects, after building playerStats:
const inv = this.inventoryService.getInventory(player.id);
const equippedItems = [
  inv?.equipment.exosuit,
  inv?.equipment.tool,
  ...inv?.equipment.modules ?? [],
].filter(Boolean);

let damageBonusMultiplier = 1.0;
for (const equipped of equippedItems) {
  const def = ItemRegistry.get(equipped!.itemId);
  for (const effectDef of def?.effects ?? []) {
    if (effectDef.effect.type === 'damage_type_bonus' &&
        effectDef.effect.damageType === damageType) {
      damageBonusMultiplier += effectDef.effect.bonusPercent / 100;
    }
  }
}
```

### Pattern 4: Combat log with damage type label
**What:** `CombatLogEntry` gains optional `damageType?: DamageType`. The combat:damage socket payload includes `damageType`. The log display formats it as `[Thermal] 34`.

```typescript
// apps/web/src/store/combatLogStore.ts
export interface CombatLogEntry {
  id: string;
  timestamp: number;
  type: 'dealt' | 'received';
  damage: number;
  targetName: string;
  critical: boolean;
  killed: boolean;
  damageType?: DamageType;  // Phase 117 addition
}
```

The combat log component (whereever it renders) adds `damageType` prefix:
```typescript
const label = entry.damageType ? `[${entry.damageType}] ` : '';
// renders: "[Thermal] 34" or just "34" for legacy entries without type
```

### Pattern 5: Color-coded floating damage numbers
**What:** `EntityRenderer.createFloatingDamage()` currently takes `isPlayerDamage: boolean` and sets color yellow/red. Phase 117 adds an optional `damageType` param that overrides color for outgoing damage.

```typescript
// apps/web/src/game/rendering/EntityRenderer.ts
const DAMAGE_TYPE_COLORS: Record<DamageType, string> = {
  Thermal: '#ff8800',  // orange
  Cryo:    '#00ccff',  // cyan
  Bio:     '#44ff44',  // green
  Kinetic: '#ffffff',  // white
};

static createFloatingDamage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  damage: number,
  isPlayerDamage: boolean,
  damageType?: DamageType  // Phase 117 addition — optional for backward compat
): void {
  let color: string;
  if (isPlayerDamage) {
    color = '#ff4444'; // Player took damage — red (unchanged)
  } else if (damageType) {
    color = DAMAGE_TYPE_COLORS[damageType];
  } else {
    color = '#ffff00'; // Legacy fallback — yellow
  }
  // rest of existing implementation unchanged
}
```

### Anti-Patterns to Avoid

- **Modifying `basic_strike` default type on auto-attack:** The creature auto-attack path in `combat.service.ts` does not yet pass `damageType`. Do NOT silently assign Kinetic to creature auto-attacks unless there is a creature `defaultDamageType` field added to `CreatureDefinition`. Auto-attacks should use neutral (no resistance multiplier) for now, or alternatively assign Kinetic as the universal default. See Open Questions.
- **Per-creature resistance overrides:** Don't deviate from the BIOME_RESISTANCE_PROFILES lookup per individual creature. Exceptions breed inconsistency. Creatures can override if lore demands (e.g., Marsh Lurker has extra bio resistance vs. biome default), but this should be the exception, not the rule.
- **Putting resistance logic in the server service instead of game-logic:** Resistance calculation belongs in `calculateDamage()` in game-logic, not inline in `ability.service.ts`. The function must remain testable without NestJS.
- **Making `DamageType` required in DamageParams immediately:** The auto-attack path in `combat.service.ts` calls `calculateDamage()` without a type. Making the param required forces a large simultaneous refactor. Keep it optional with neutral fallback.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Biome → resistance mapping | Per-creature hardcoded objects | `BIOME_RESISTANCE_PROFILES` lookup keyed by `BiomeType` | 16 biome types × 4 stats = reusable; prevents divergence |
| Damage type label colors | Inline color strings per call site | `DAMAGE_TYPE_COLORS` constant map in EntityRenderer | Single source allows future tuning; referenced in both floating numbers and any future UI |
| Resistance clamping | Repeated Math.max/min at each call site | `applyResistanceMultiplier()` pure function in game-logic | Testable; 70% cap enforced in exactly one place |

**Key insight:** The resistance system is simple multiplication — don't over-engineer. The clamping rule is the only complex constraint, and it belongs in a single exported pure function.

---

## Common Pitfalls

### Pitfall 1: combat:damage payload missing damageType, breaking client coloring
**What goes wrong:** Server emits `combat:damage` without `damageType`. Client combatLogStore and gameStore both listen for this event. If the field is absent, the combat log shows no type label and floating numbers default to yellow — satisfying neither DMGT-04 nor DMGT-05.
**Why it happens:** Two separate emit sites exist: `ability.service.ts` line ~639 and `combat.service.ts` line ~272. Easy to update one and forget the other.
**How to avoid:** Add `damageType?: DamageType` to the `combat:damage` payload type in `ServerEvents` interface (`packages/shared-types/src/network/events.ts`). TypeScript will then emit a warning if either service emits without the field.
**Warning signs:** Type label renders for ability hits but not creature auto-attacks (or vice versa).

### Pitfall 2: Resistance values in creature defs use raw percentages incorrectly
**What goes wrong:** Developer assigns `{ thermal: 0.6 }` thinking it's a multiplier, when the system expects percentage points (60 = 60%). The resistance math then computes `1 - (0.6/100) = 0.994` — nearly neutral — instead of `1 - 0.6 = 0.4`.
**Why it happens:** The `DamageResistances` comment in shared-types says "Values represent percentage resistance (0 = neutral, 50 = 50% reduction)" but this is easy to miss.
**How to avoid:** Unit-test `applyResistanceMultiplier()` with Frozen Expanse values explicitly. The test must assert that `{ cryo: 60 }` yields a multiplier of `0.4`, not `0.994`.
**Warning signs:** Resistance feels like it does nothing in gameplay — all damage numbers look similar regardless of type.

### Pitfall 3: combatLogStore socket handler missing damageType forward
**What goes wrong:** `combatLogStore.ts` wires `gameSocket.on('combat:damage', ...)` and constructs `CombatLogEntry` from the payload. If `damageType` is not explicitly destructured and forwarded, the entry silently omits it even when the server sends it.
**Why it happens:** The handler destructures specific fields. New fields on the server payload are ignored unless explicitly added.
**How to avoid:** Destructure `damageType` from the event payload in combatLogStore socket handler.

### Pitfall 4: Four-file atomicity for creatures with new resistances
**What goes wrong:** The project has a documented rule ("four-file atomicity rule for creatures: definition + ENTITY_IDS + BIOME_SPAWN_CONFIGS + CREATURE_LOOT_TABLES"). However, resistance changes only touch the definition files — ENTITY_IDS, spawn configs, and loot tables do not need modification. The rule doesn't apply here.
**Why it happens:** Developer sees the atomicity rule in STATE.md and over-applies it.
**How to avoid:** Resistance population only touches `creatures.ts`, `aquatic-creatures.ts`, and `exotic-creatures.ts` definition files. No other files in the four-file rule need editing for this phase.

### Pitfall 5: WorldScene.showDamageNumber doesn't forward damageType to EntityRenderer
**What goes wrong:** `gameStore.ts` calls `worldScene.showDamageNumber(...)` with damage data from the socket. If `damageType` is not passed through, the EntityRenderer receives `undefined` and falls back to yellow for all creature damage.
**Why it happens:** `showDamageNumber` is a public API on `WorldScene`. It must be updated to accept and forward `damageType`.
**How to avoid:** Update `showDamageNumber` signature: `showDamageNumber(defenderId, damage, isLocalPlayer, fallbackPosition?, damageType?)`. Then update gameStore.ts to extract and pass `data.damageType`.

---

## Code Examples

### Resistance multiplier calculation (pure function)
```typescript
// packages/game-logic/src/combat/damage.ts
import type { DamageType, DamageResistances } from '@into-the-void/shared-types';

export const RESISTANCE_FLOOR = 0.3;    // 70% max reduction — DMGT-03
export const RESISTANCE_CEILING = 1.5;  // 50% max vulnerability — per Out-of-Scope table

/**
 * Apply damage type resistance to a damage value.
 * Resistance values are percentage points: 60 = 60% reduction (multiplier 0.4).
 * Negative values = vulnerability: -40 = 40% more damage taken (multiplier 1.4).
 * Clamped: [RESISTANCE_FLOOR, RESISTANCE_CEILING] = [0.3x, 1.5x].
 */
export function applyResistanceMultiplier(
  damage: number,
  damageType: DamageType,
  resistances: DamageResistances
): number {
  const key = damageType.toLowerCase() as keyof DamageResistances;
  const resistPercent = resistances[key]; // e.g., 60 for 60% resist
  const raw = 1 - resistPercent / 100;   // e.g., 1 - 0.6 = 0.4
  const clamped = Math.max(RESISTANCE_FLOOR, Math.min(RESISTANCE_CEILING, raw));
  return damage * clamped;
}
```

### calculateDamage() integration point
```typescript
// packages/game-logic/src/combat/damage.ts — inside calculateDamage(), after crit calc
// Apply damage type resistance multiplier if present
if (params.damageType && params.defenderResistances) {
  damage = applyResistanceMultiplier(damage, params.damageType, params.defenderResistances);
}

// Apply gear damage_type_bonus multiplier
if (params.damageBonusMultiplier && params.damageBonusMultiplier > 1.0) {
  damage *= params.damageBonusMultiplier;
}
```

### Creature ability.service.ts damage call with type
```typescript
// apps/game-server/src/game/ability.service.ts
// In executeAbilityEffects, when handling 'damage' effect:
const abilityDamageType: DamageType | undefined = (effect as { damageType?: DamageType }).damageType;
const def = EntityRegistry.get(target.speciesId) as CreatureDefinition | undefined;
const defenderResistances = def?.resistances;

const damageResult = calculateDamage({
  baseDamage: effect.baseDamage,
  attackerLevel: player.level,
  defenderLevel: target.level,
  attackerStats: playerStats,
  defenderStats: creatureStats,
  weaponDamage: effect.baseDamage * effect.scaling,
  armorReduction: creatureStats.toughness * 0.1,
  damageType: abilityDamageType,
  defenderResistances,
  damageBonusMultiplier,
});

// Include damageType in the broadcast
this.server?.to(player.position.zoneId).emit('combat:damage', {
  attackerId: player.id,
  // ... existing fields ...
  damageType: abilityDamageType,
});
```

### Sample creature definition with biome resistance
```typescript
// packages/entities/src/definitions/creatures.ts
import { BIOME_RESISTANCE_PROFILES } from '../biome-resistance-profiles';

export const CREATURE_FROST_STALKER: CreatureDefinition = {
  id: 'creature_frost_stalker',
  // ... existing fields ...
  resistances: BIOME_RESISTANCE_PROFILES['frozen_expanse'],
  // Result: { thermal: -40, cryo: 60, bio: 0, kinetic: 10 }
};
```

### AbilityDefinition — adding damageType to damage effect
The `AbilityEffect` discriminated union currently has `{ type: 'damage', baseDamage, scaling }`. Phase 118 (Ability Rebalance) will assign types to specific abilities. For Phase 117, the `damage` effect variant needs the field added as optional so Phase 118 can populate it:

```typescript
// packages/shared-types/src/game/ability.ts
| { readonly type: 'damage'; readonly baseDamage: number; readonly scaling: number; readonly damageType?: DamageType }
```

---

## Biome → Damage Type Resistance Map (DMGT-07)

This table is the design specification for the BIOME_RESISTANCE_PROFILES constant. Values are percentage points; 60 = 60% damage reduction (multiplier 0.4x); -40 = 40% vulnerability (multiplier 1.4x).

| Biome | Thermal | Cryo | Bio | Kinetic | Rationale |
|-------|---------|------|-----|---------|-----------|
| void_plains | 0 | 0 | 0 | 0 | Neutral frontier — no adaptations |
| fungal_forest | 0 | 0 | 40 | 0 | Spore-adapted biology |
| ancient_ruins | 0 | 0 | 0 | 20 | Hardened exoskeleton |
| tidal_pools | 0 | 30 | 0 | 0 | Cold-water adapted |
| toxic_wastes | 0 | 0 | 60 | 0 | Toxin-saturated bodies |
| miasma_marshes | 0 | 0 | 50 | 0 | Chemical environment adaptation |
| petrified_expanse | 0 | 0 | 0 | 40 | Stone-like exoskeleton |
| bioluminescent_depths | 10 | 10 | 30 | 0 | Mixed bio-chemical adaptation |
| kelp_forests | 0 | 20 | 20 | 0 | Cold water + bio coating |
| **frozen_expanse** | **-40** | **60** | **0** | **10** | **Cold-adapted; Thermal vulnerable** |
| **volcanic_ridge** | **60** | **-40** | **0** | **10** | **Heat-adapted; Cryo vulnerable** |
| crystal_caves | 0 | 20 | 0 | 50 | Silicon-crystal shell |
| crystalline_wastes | 0 | 30 | 0 | 50 | Advanced crystal shell |
| starfall_crater | 20 | 0 | -20 | 20 | Void-corrupted; bio vulnerability |
| deep_trenches | 20 | 40 | 30 | -20 | Pressure-adapted; kinetic vulnerability |
| void_rift | 0 | 0 | 0 | -30 | Reality-distorted; kinetic vulnerability |

**Note on the highlighted rows:** The success criterion in Phase 117 specifically calls out Frozen Expanse (Thermal vs. Cryo contrast). The -40/+60 pairing creates the 1.4x → 0.4x spread = 3.5x damage difference between types. This is observable and satisfying without being game-breaking (floor is 0.3x if resistance were higher).

---

## State of the Art

| Old State | Phase 117 State | Change |
|-----------|-----------------|--------|
| All creatures use NEUTRAL_RESISTANCES | Each creature has biome-thematic resistances | Populating pre-existing field |
| calculateDamage ignores damage type | calculateDamage applies resistance multiplier | Additive param — backward compat |
| combat:damage payload has no type info | combat:damage includes damageType | Payload extension |
| Floating numbers: yellow (dealt) / red (received) | Per-type colors: orange/cyan/green/white (dealt), red (received) | createFloatingDamage signature change |
| CombatLogEntry has no type field | CombatLogEntry has optional damageType | Additive field |
| No damage_type_bonus gear | At least 4 items with damage_type_bonus | New ItemEffect variant |

**Not changing in this phase:**
- Creature auto-attack `DamageType` assignment (combat.service.ts) — auto-attacks remain neutral unless explicitly typed via `CreatureDefinition.defaultDamageType` (which does not exist yet). The server calls `calculateDamage()` without `damageType` for creature auto-attacks, which degrades gracefully.
- Ability-level damage type assignments (Phase 118 does this for Thermal Lance, Cryo Blast, etc.)
- Player resistance stats (explicitly Out of Scope per REQUIREMENTS.md)

---

## Open Questions

1. **Should creature auto-attacks have a `DamageType`?**
   - What we know: `combat.service.ts` calls `calculateDamage()` for creature auto-attacks without a damage type. Floating numbers from creature attacks will show yellow (no type), and combat log entries will have no type label.
   - What's unclear: Should all creature auto-attacks default to Kinetic? Or should creatures have a `defaultDamageType` field on `CreatureDefinition`?
   - Recommendation: Default creature auto-attacks to `Kinetic` in `combat.service.ts` (pass `damageType: 'Kinetic', defenderResistances: undefined` for player — players don't have resistances per REQUIREMENTS.md Out-of-Scope). This means Kinetic floating numbers appear for creature attacks. Player takes Kinetic-colored damage. If this is undesirable, add `defaultDamageType` to `CreatureDefinition` — but that adds another data field to all 83 creature defs. Recommend simpler: always Kinetic for auto-attacks, and colored floating numbers only matter when the player is dealing damage, not receiving it.

2. **Where does `damage_type_bonus` gear get slotted?**
   - What we know: The requirement says "at least one gear item per damage type" (4 items minimum). No existing item has this effect.
   - What's unclear: Which item categories (suit/module/tool) and rarities should carry it? High-rarity modules are the most natural home (specialized combat augments).
   - Recommendation: Create 4 new module items (rare or epic rarity), one per type, at level 15–20 range. Name pattern: `module_thermal_amp_rare`, `module_cryo_amp_rare`, `module_bio_amp_rare`, `module_kinetic_amp_rare`. Each grants +20% bonus to that damage type. Sell through faction traders (Helix/Nexus for combat types). Do not gate behind Phase 118 abilities — they work with basic_strike too.

3. **What is the `DamageType` for `basic_strike`?**
   - What we know: `basic_strike` is the universal auto-attack ability in `AbilityRegistry`. It has `baseDamage: 15, scaling: 0`.
   - What's unclear: Should basic_strike be Kinetic or have no type?
   - Recommendation: Add `damageType: 'Kinetic'` to basic_strike's damage effect. This allows floating number coloring on player-initiated basic attacks (white for Kinetic) and ensures resistance applies when a player basic-strikes a biome creature. This is a natural choice — melee/projectile hits are kinetic by definition.

---

## Validation Architecture

> `workflow.nyquist_validation` is `false` in `.planning/config.json` — this section is skipped.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `packages/game-logic/src/combat/damage.ts` — current DamageParams interface and calculateDamage() function
- Direct code inspection: `packages/shared-types/src/game/combat.ts` — DamageType, DamageResistances, NEUTRAL_RESISTANCES (Phase 115 deliverables confirmed present)
- Direct code inspection: `packages/entities/src/types.ts` — CreatureDefinition.resistances field confirmed
- Direct code inspection: `packages/entities/src/definitions/creatures.ts`, `aquatic-creatures.ts`, `exotic-creatures.ts` — 77 creature entries all using NEUTRAL_RESISTANCES
- Direct code inspection: `apps/web/src/store/combatLogStore.ts` — CombatLogEntry interface and socket handler
- Direct code inspection: `apps/web/src/game/rendering/EntityRenderer.ts` — createFloatingDamage() current implementation
- Direct code inspection: `apps/web/src/game/scenes/WorldScene.ts` — showDamageNumber() method
- Direct code inspection: `apps/game-server/src/game/combat.service.ts` — creature attack tick, combat:damage emit
- Direct code inspection: `apps/game-server/src/game/ability.service.ts` — executeAbilityEffects, combat:damage emit
- Direct code inspection: `packages/items/src/types.ts` — ItemEffect discriminated union
- Direct code inspection: `packages/shared-types/src/network/events.ts` — combat:damage ServerEvents shape
- `.planning/REQUIREMENTS.md` — DMGT-01 through DMGT-07 full text, Out-of-Scope table
- `lore/world-bible.md` — biome descriptions and survival tier context
- `packages/shared-types/src/game/biome.ts` — BiomeType union and BIOME_TIERS

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — four-file atomicity rule for creatures (confirmed still in force)
- `packages/entities/src/definitions/index.ts` — total creature count via ENTITY_IDS (77 CREATURE_ entries)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all patterns are extensions of existing code
- Architecture: HIGH — data flow is clear; all touch points identified with exact file/line context
- Biome resistance values: MEDIUM — lore-driven design decisions, not externally verifiable; the exact numbers are a design judgment call within the stated constraints
- Pitfalls: HIGH — identified by direct code inspection of all affected call sites

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable domain — game-logic patterns won't change without a major refactor)
