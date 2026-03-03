# Architecture Research: Balance & Automation (v1.24)

**Domain:** MMO combat depth, environmental hazard systems, creature AI upgrades, automation progression
**Researched:** 2026-03-03
**Confidence:** HIGH — derived from direct codebase inspection of all referenced source files

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     SHARED TYPES (packages/shared-types)                  │
│  DamageType enum  |  BiomeHazardDef  |  ResistanceMap  |  AutoDeployable │
├──────────────────┬──────────────────┬───────────────────┬────────────────┤
│  GAME-LOGIC      │  ENTITIES        │  ITEMS            │  WORLD-GEN     │
│  combat/         │  definitions/    │  definitions/     │  spawn/        │
│  damage.ts ←mod  │  creatures.ts ←mod│  suits.ts ←mod  │  biome-gen.ts  │
│  stat-caps.ts NEW│  (add resistance)│  (hazmat archetype│  (hazard zone  │
│  biome-hazard.ts │                  │   already exists) │   integration) │
│  NEW             │                  │                   │                │
│  ai/             │                  │                   │                │
│  creature-ai.ts  │                  │                   │                │
│  ←mod (4 new     │                  │                   │                │
│   behaviors)     │                  │                   │                │
├──────────────────┴──────────────────┴───────────────────┴────────────────┤
│                     GAME SERVER (apps/game-server)                        │
│  game/                                                                    │
│  combat.service.ts ←mod   ai.service.ts ←mod                             │
│  ability.service.ts ←mod  hazard.service.ts NEW                          │
│  automation.service.ts NEW                                                │
│  game.gateway.ts ←mod (new socket events)                                │
│  game.module.ts ←mod (register new services)                             │
├──────────────────────────────────────────────────────────────────────────┤
│                     DATABASE (packages/database)                          │
│  schema/                                                                  │
│  deployables.ts NEW   automation-jobs.ts NEW                             │
│  queries/                                                                 │
│  deployables.ts NEW   automation-jobs.ts NEW                             │
├──────────────────────────────────────────────────────────────────────────┤
│                     WEB CLIENT (apps/web)                                 │
│  game/rendering/ — HazardOverlay.ts NEW                                  │
│  screens/HUD — DamageTypeIndicator, HazardWarning, AutomationPanel       │
│  store/gameStore.ts ←mod (hazard state, deployable state)                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current State |
|-----------|----------------|---------------|
| `packages/game-logic/src/combat/damage.ts` | Core damage calculation pipeline | Existing — calculateDamage(), no type-awareness |
| `packages/game-logic/src/combat/stat-caps.ts` | Diminishing returns above 200 | NEW file needed |
| `packages/game-logic/src/combat/biome-hazard.ts` | Pure hazard tick math, gear counter resolution | NEW file needed |
| `packages/game-logic/src/ai/creature-ai.ts` | Pure FSM: tickCreatureAI() | Existing — 4 behaviors need new mechanics |
| `packages/entities/src/definitions/creatures.ts` | Creature static data | Existing — add `resistances` field to CreatureDefinition |
| `packages/shared-types/src/game/combat.ts` | CombatResult, EffectType | Existing — add DamageType union |
| `packages/shared-types/src/game/biome.ts` | BiomeHazard interface | Existing — extend with gear counter metadata |
| `packages/shared-types/src/game/ability.ts` | AbilityDefinition, AbilityEffect | Existing — add shield effect type |
| `apps/game-server/src/game/combat.service.ts` | Combat loop, damage emission | Existing — add damage type propagation |
| `apps/game-server/src/game/ai.service.ts` | Zone tick loop, creature FSM driver | Existing — add stampede/pack-call coordination |
| `apps/game-server/src/game/hazard.service.ts` | Biome hazard tick per player in zone | NEW service |
| `apps/game-server/src/game/ability.service.ts` | Ability execution, buffs | Existing — add shield pool tracking |
| `apps/game-server/src/game/automation.service.ts` | Deployable lifecycle, processing queues | NEW service |
| `packages/database/src/schema/deployables.ts` | Deployable structures DB schema | NEW schema |
| `packages/database/src/schema/automation-jobs.ts` | Processing queue DB schema | NEW schema |

---

## Recommended Project Structure

```
packages/game-logic/src/
├── combat/
│   ├── damage.ts              # MODIFY: add DamageType param, resistance lookup
│   ├── damage.test.ts         # MODIFY: add resistance test cases
│   ├── stat-caps.ts           # NEW: applyDiminishingReturns(stat, rawValue)
│   ├── stat-caps.test.ts      # NEW: verify DR curve above 200
│   ├── biome-hazard.ts        # NEW: computeHazardDrain(), resolveGearCounter()
│   └── biome-hazard.test.ts   # NEW
├── ai/
│   └── creature-ai.ts         # MODIFY: add stampede, pack-call, ambush, frenzy
└── index.ts                   # MODIFY: export new symbols

packages/shared-types/src/
├── game/
│   ├── combat.ts              # MODIFY: add DamageType, DamageResistances
│   ├── biome.ts               # MODIFY: extend BiomeHazard with gearCounterStat
│   └── ability.ts             # MODIFY: add shield AbilityEffect type
└── core/
    └── entity.ts              # MODIFY: add DeployableEntity interface

packages/entities/src/
└── types.ts                   # MODIFY: add resistances to CreatureDefinition

packages/database/src/
└── schema/
    ├── deployables.ts         # NEW: structure_type, owner, position, state, config
    └── automation-jobs.ts     # NEW: job queue for processing ticks

apps/game-server/src/game/
├── combat.service.ts          # MODIFY: pass DamageType through calculateDamage call
├── ai.service.ts              # MODIFY: add pack coordination state
├── ability.service.ts         # MODIFY: add shield pool, DR-aware buff application
├── hazard.service.ts          # NEW: tick-based biome hazard processor
├── automation.service.ts      # NEW: deployable lifecycle + processing queue
└── game.module.ts             # MODIFY: register HazardService, AutomationService

apps/web/src/game/
└── rendering/
    └── HazardOverlay.ts       # NEW: visual hazard indicator on HUD
```

### Structure Rationale

- `packages/game-logic/src/combat/stat-caps.ts`: Placed beside damage.ts because it modifies the stat values that feed into calculateDamage. Pure function — no service dependencies.
- `packages/game-logic/src/combat/biome-hazard.ts`: Pure tick math belongs in game-logic, not in the server service. Server calls the pure function per tick per player.
- `packages/database/src/schema/deployables.ts`: Automation deployables require persistence (survive server restarts). The existing `structures` schema exists but lacks automation-specific fields (fuelLevel, processingQueue, maintenanceDue). New schema extends the pattern cleanly rather than retrofitting the generic structures table.

---

## Architectural Patterns

### Pattern 1: DamageType as Multiplicative Layer on Existing Pipeline

**What:** Slot a resistance lookup between the existing `calculateDamage()` result and final damage application. The pipeline becomes: base calculation → damage type resistance multiplier → final.

**When to use:** Avoids rewriting `calculateDamage()`. The type is passed in as a parameter; if absent, multiplier is 1.0 (backward compatible).

**How it integrates:**

```typescript
// packages/game-logic/src/combat/damage.ts — MODIFIED DamageParams
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
  damageType?: DamageType;               // NEW optional field
  defenderResistances?: DamageResistances; // NEW optional field
}

// packages/shared-types/src/game/combat.ts — NEW additions
export type DamageType = 'thermal' | 'cryo' | 'bio' | 'kinetic';

export interface DamageResistances {
  thermal: number;   // multiplier: 0.5 = 50% resist, 1.5 = 50% vulnerable
  cryo: number;
  bio: number;
  kinetic: number;
}

// In calculateDamage() — after crit, before armor:
if (params.damageType && params.defenderResistances) {
  damage *= params.defenderResistances[params.damageType];
}
```

**Creature definitions — MODIFIED CreatureDefinition in packages/entities/src/types.ts:**

```typescript
export interface CreatureDefinition extends BaseEntityDefinition {
  readonly entityClass: 'creature';
  readonly behavior: CreatureBehavior;
  readonly baseHealth: number;
  readonly levelRange: readonly [number, number];
  readonly baseXp: number;
  readonly respawnSeconds: number;
  readonly resistances?: Partial<DamageResistances>; // NEW optional
}
```

**CombatService propagation — apps/game-server/src/game/combat.service.ts:**

The `creatureAttackTick()` method passes empty resistances when calling `calculateDamage`. For player attacks in `ability.service.ts`, the creature's definition is fetched from EntityRegistry and its resistances are resolved:

```typescript
const def = EntityRegistry.get(creature.speciesId) as CreatureDefinition | undefined;
const resistances: DamageResistances = {
  thermal: def?.resistances?.thermal ?? 1.0,
  cryo:    def?.resistances?.cryo    ?? 1.0,
  bio:     def?.resistances?.bio     ?? 1.0,
  kinetic: def?.resistances?.kinetic ?? 1.0,
};
const damageResult = calculateDamage({ ..., damageType: 'thermal', defenderResistances: resistances });
```

**Ability definitions — add damageType to offensive AbilityEffects:**

```typescript
// packages/shared-types/src/game/ability.ts
export type AbilityEffect =
  | { readonly type: 'damage'; readonly baseDamage: number; readonly scaling: number; readonly damageType?: DamageType }
  // ... rest unchanged
```

Thermal Lance → `damageType: 'thermal'`. Cryo Blast → `damageType: 'cryo'`. Basic Strike/Concussive → `damageType: 'kinetic'`. Void Drain/Electrocute → `damageType: 'bio'`.

---

### Pattern 2: Biome Hazard as a New Server-Side Tick Service

**What:** A new `HazardService` injectable runs alongside `AiService`. On every zone tick (1s), it checks each player's current biome tile, looks up active hazards, resolves gear counters, and applies stat drains via PlayerService.

**When to use:** Hazard logic is independent of combat and AI — it deserves its own service rather than being crammed into AiService.

**Architecture:**

```
AiService.runZoneTick()
  ├── tickCreatureAI loop (existing)
  ├── processCreatureCombatTick (existing)
  ├── processPlayerRegeneration (existing)
  └── hazardService.processZoneHazards(zoneId)  ← NEW call
```

HazardService is injected into AiService (or called from game.gateway on zone tick event). The pure math lives in `packages/game-logic/src/combat/biome-hazard.ts`:

```typescript
// packages/game-logic/src/combat/biome-hazard.ts — NEW
export interface HazardDefinition {
  type: 'radiation' | 'toxic' | 'cold' | 'heat' | 'void_storm' | 'pressure';
  damagePerTick: number;
  statDrain?: { stat: keyof CharacterStats; amount: number }; // energy/health drain
  gearCounterStat: keyof CharacterStats; // e.g. 'resilience' for toxic, 'toughness' for cold
  gearCounterThreshold: number; // stat value that fully negates the hazard
}

export function computeHazardDrain(
  hazard: HazardDefinition,
  playerStats: CharacterStats,
): number {
  // Linear mitigation: 0 drain at threshold, full drain at 0 stat
  const counterStat = playerStats[hazard.gearCounterStat] ?? 0;
  const mitigationRatio = Math.min(1, counterStat / hazard.gearCounterThreshold);
  return Math.round(hazard.damagePerTick * (1 - mitigationRatio));
}
```

**Gear Counter Mapping (gear counter stat → hazard):**

| Biome | Hazard Type | Gear Counter Stat | Threshold |
|-------|-------------|-------------------|-----------|
| toxic_wastes, miasma_marshes | toxic | resilience | 150 |
| frozen_expanse, crystalline_wastes | cold | toughness | 120 |
| volcanic_ridge | heat | durability | 130 |
| void_rift | void_storm | resilience | 200 |
| deep_trenches | pressure | durability | 180 |
| starfall_crater | radiation | resilience | 160 |

The `hazmat` archetype suit already exists in `packages/items/src/utils.ts` with `ARCHETYPE_PROFILES.hazmat = { resilience: 30, recovery: 25, durability: 25, vigor: 20 }`. Hazmat suits therefore counter toxic/void/radiation hazards without new archetype invention.

**BiomeHazard type extension in shared-types/src/game/biome.ts:**

```typescript
export interface BiomeHazard {
  type: 'radiation' | 'toxic' | 'cold' | 'heat' | 'void_storm' | 'pressure';
  damage: number;
  frequency: number;
  gearCounterStat: keyof CharacterStats; // NEW
  gearCounterThreshold: number;          // NEW
}
```

---

### Pattern 3: Creature AI Behaviors as New FSM Branches

**What:** The existing `tickCreatureAI()` pure FSM in `creature-ai.ts` switches on `creature.behavior`. New behaviors are implemented as new switch case handlers. The function signature does NOT change — callers in `ai.service.ts` already call `tickCreatureAI(creature, players, collisions)`.

**New AiTickResult fields needed:**

```typescript
export interface AiTickResult {
  newPosition: Position | null;
  aggroTarget?: string;
  shouldAttack?: boolean;
  shouldReturn?: boolean;
  stampede?: boolean;        // NEW: trigger all nearby same-species creatures to charge
  packCall?: string[];       // NEW: array of creature IDs to notify to join combat
  ambushReveal?: boolean;    // NEW: creature becomes visible/active from stealth
  frenzied?: boolean;        // NEW: double attack speed flag for this tick
}
```

**Behavior implementations:**

- **Stampede**: When a predator creature drops below 30% health with a combatTarget, it signals AiService to trigger all same-species creatures within 6 tiles to also aggro the same player. Implemented as: if `health < maxHealth * 0.3` and `!creature.stampedeFired`, return `stampede: true`.
- **Pack Call**: When a predator first aggroes (aggroTarget returned), also scan for same-species creatures within 8 tiles and return their IDs in `packCall`. AiService then calls `startCreatureCombat` on each.
- **Ambush**: New behavior type `'ambush'`. Creature sits stationary (wander disabled) until player enters 2-tile radius, then aggroes with a +50% damage bonus for first hit. Server marks creature with `ambushReady: boolean` flag.
- **Frenzy**: When any creature drops below 20% health, apply `frenzied: true` to result. AiService interprets this as halving the attack interval for one tick.

**AiService coordination for Stampede/Pack Call:**

AiService maintains a `creatureGroups: Map<string, string[]>` (speciesId → all creatureIds in zone). When stampede/packCall signals arrive, AiService fans out `startCreatureCombat` calls. This state is per-zone-tick, not persisted.

**New creature behavior requires:**
- `CreatureBehavior` type in `packages/shared-types/src/core/entity.ts` extended: add `'ambush'` as a valid behavior string.
- `Creature` interface extended: add `stampedeFired?: boolean` and `ambushReady?: boolean` flags.
- `CreatureDefinition.behavior` already uses `CreatureBehavior` type — no further change needed for creature definitions beyond assigning behavior to specific creatures.

---

### Pattern 4: Ability Rebalance — Shield Pool as New Effect Type

**What:** Defensive abilities currently only provide toughness stat buffs. The rebalance gives them concrete damage absorption (shield pool) and flat damage reduction (DR). A new `AbilityEffect` discriminant is needed.

**New effect types:**

```typescript
// packages/shared-types/src/game/ability.ts
export type AbilityEffect =
  | { readonly type: 'damage'; ... }
  | { readonly type: 'heal'; ... }
  | { readonly type: 'buff'; ... }
  | { readonly type: 'debuff'; ... }
  | { readonly type: 'dot'; ... }
  | { readonly type: 'hot'; ... }
  | { readonly type: 'gather'; ... }
  | { readonly type: 'shield'; readonly shieldAmount: number; readonly duration: number }  // NEW
  | { readonly type: 'damage_reduction'; readonly drPercent: number; readonly duration: number }; // NEW
```

**AbilityService tracking — apps/game-server/src/game/ability.service.ts:**

```typescript
// New in-memory state:
private shieldPools: Map<string, { remaining: number; expiresAt: number }> = new Map();
private damageReductions: Map<string, { drPercent: number; expiresAt: number }> = new Map();
```

When `combat.service.ts` applies damage to a player, it checks `abilityService.consumeShield(playerId, damage)` first, then applies DR, then applies remaining damage. This requires a method addition to AbilityService and a call in `creatureAttackTick()`.

**Rebalance changes to definitions (in ability/definitions.ts):**

- `ABILITY_EMERGENCY_SHIELD`: Change from `buff toughness +12` to `shield 200 HP for 8s`. Gives concrete value.
- `ABILITY_MAGNETIC_FIELD`: Change from `buff toughness +8` to `damage_reduction 20% for 12s`.
- `ABILITY_FORTIFY_SYSTEMS`: Change from `buff durability +10` to `shield 120 HP for 15s`.
- `ABILITY_PLASMA_BURST`: Nerf baseDamage from 35 to 25, add `damageType: 'thermal'`. Retains identity but loses raw dominance.
- `ABILITY_ENERGY_BARRIER`: Retain resilience buff but double amount (14 for 12s), giving it meaningful status resistance.
- `ABILITY_THERMAL_LANCE`: Keep, add `damageType: 'thermal'`, reduce cooldown from 7000ms to 5000ms — gives it a niche role.
- `ABILITY_CRYO_BLAST`: Add `damageType: 'cryo'`, add slow-like debuff effect (perception -10 for 4s — impedes creature scanning).

---

### Pattern 5: Stat Caps with Diminishing Returns

**What:** A new pure function `applyDiminishingReturns(rawValue: number, capAt: number = 200): number` is added to `packages/game-logic/src/combat/stat-caps.ts`. It is called inside `computeCharStats()` as a final post-processing step.

**Formula:**

```typescript
// packages/game-logic/src/combat/stat-caps.ts — NEW
export const STAT_CAP = 200;
export const DR_EXPONENT = 0.6; // soft cap curve

export function applyDiminishingReturns(rawValue: number): number {
  if (rawValue <= STAT_CAP) return rawValue;
  const excess = rawValue - STAT_CAP;
  // Compressed excess: excess^0.6, meaning each extra point above 200 adds less
  const compressed = Math.pow(excess, DR_EXPONENT);
  return Math.round(STAT_CAP + compressed);
}
```

**Integration point — packages/game-logic/src/stats/char-stats.ts:**

`computeCharStats()` is called at the end. After all stat aggregation (base + equipment + buffs), apply `applyDiminishingReturns` to each stat key before returning. This is the single modification point — one loop addition to the end of the function:

```typescript
// After buff application, before return:
for (const key of Object.keys(stats) as (keyof CharacterStats)[]) {
  stats[key] = applyDiminishingReturns(stats[key]);
}
return stats;
```

This automatically affects all callers: `CombatService`, `AbilityService`, `AiService` regen — no individual callers need changes.

---

### Pattern 6: Automation Deployables — Database-Backed Persistent Structures

**What:** Automation deployables (extractors, beacons, planetary extractors, refineries) are player-owned structures that persist in the database, accumulate resources over time, and require periodic maintenance. They are a new vertical feature with their own service, DB schema, and event loop.

**Database schema — packages/database/src/schema/deployables.ts (NEW):**

```typescript
export const deployables = pgTable('deployables', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  deployableType: varchar('deployable_type', { length: 50 }).notNull(),
  // 'extractor' | 'survey_beacon' | 'planetary_extractor' | 'refinery'
  position: jsonb('position').$type<PositionJson>().notNull(),
  zoneId: varchar('zone_id', { length: 100 }).notNull(),
  targetResourceId: varchar('target_resource_id', { length: 100 }), // what it gathers
  fuelRemaining: integer('fuel_remaining').notNull().default(100),   // 0 = offline
  maintenanceDue: timestamp('maintenance_due', { withTimezone: true }),
  accumulatedItems: jsonb('accumulated_items').$type<AccumulatedItemJson[]>().notNull().default([]),
  processingQueueId: uuid('processing_queue_id'),
  config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastTickAt: timestamp('last_tick_at', { withTimezone: true }),
});
```

**AutomationService — apps/game-server/src/game/automation.service.ts (NEW):**

Runs a global tick (60s interval) independent of zone AI ticks. For each active deployable:
1. Check `fuelRemaining > 0` and `maintenanceDue` not overdue.
2. Roll resource yield based on `targetResourceId` and deployable tier.
3. Append to `accumulatedItems` JSON column.
4. Decrement `fuelRemaining` by 1.
5. If `fuelRemaining === 0`, emit `deployable:offline` to owner socket.

Processing queues (refinery input → output) run on the same 60s tick, converting raw `accumulatedItems` into refined items.

**Survey Beacon (passive caching):**

Survey beacons scan their zone for active resource nodes and cache spawn coordinates + rarity into the `config` JSON column. The AiService zone tick can optionally emit this cached data to the beacon owner on zone join — avoids active scanning.

**Deployable entity in game world — SharedTypes:**

```typescript
// packages/shared-types/src/core/entity.ts — ADD
export interface DeployableEntity extends Entity {
  type: 'deployable';
  deployableType: string;
  ownerId: string;
  fuelRemaining: number;
  online: boolean;
}
```

Rendered client-side using fallback color tiles (no sprite yet, consistent with existing pattern).

---

## Data Flow

### Damage Type Flow (Player Ability → Creature)

```
Player uses ability (ability:use socket event)
    ↓
AbilityService.handleAbilityUse()
    ↓ fetch ability definition from AbilityRegistry
    ↓ extract damageType from AbilityEffect (e.g. 'thermal')
    ↓ fetch creature from ZonesService
    ↓ fetch creature definition from EntityRegistry → resistances
    ↓
calculateDamage({ ..., damageType, defenderResistances })
    ↓ resistance multiplier applied inside calculateDamage
    ↓
ZonesService.updateEntity() — decrement creature health
    ↓
combat:damage socket event → client floating number
```

### Biome Hazard Flow (Server Tick → Player)

```
AiService.runZoneTick() every 1000ms
    ↓
HazardService.processZoneHazards(zoneId)
    ↓ get players in zone from PlayerService
    ↓ for each player:
        ↓ get current tile biome from ZonesService
        ↓ lookup BiomeHazard definition for biome
        ↓ get player stats from computeCharStats()
        ↓ computeHazardDrain(hazard, playerStats) → drain amount
        ↓ if drain > 0: PlayerService.updateHealth(playerId, newHealth)
        ↓ emit 'player:hazard' socket event to player
```

### Automation Processing Flow (60s Global Tick)

```
AutomationService.globalTick() every 60000ms
    ↓ query all deployables with fuelRemaining > 0
    ↓ for each deployable:
        ↓ compute resource yield (type, tier, elapsed time)
        ↓ db.update deployable.accumulatedItems, fuelRemaining, lastTickAt
        ↓ if refinery: convert queue inputs → outputs
        ↓ if offline: notify owner socket
    ↓
Player manually collects via 'deployable:collect' socket event
    ↓
AutomationService.collectDeployable(playerId, deployableId)
    ↓ validate ownership + proximity
    ↓ transfer accumulatedItems → player inventory via InventoryService
    ↓ emit 'inventory:update' to player
```

### Shield Absorption Flow (Creature Attack → Player with Shield)

```
CombatService.creatureAttackTick()
    ↓ calculateDamage() → raw damage
    ↓ AbilityService.consumeShield(playerId, rawDamage) → { absorbed, remaining }
    ↓ AbilityService.getDamageReduction(playerId) → drPercent
    ↓ finalDamage = (rawDamage - absorbed) * (1 - drPercent)
    ↓ PlayerService.updateHealth(playerId, newHealth)
    ↓ emit 'combat:damage' with shieldAbsorbed field
```

---

## Component Boundaries and Integration Points

### New vs Modified Files

| File | Action | Reason |
|------|--------|--------|
| `packages/shared-types/src/game/combat.ts` | MODIFY | Add `DamageType`, `DamageResistances` |
| `packages/shared-types/src/game/biome.ts` | MODIFY | Add `gearCounterStat`, `gearCounterThreshold` to `BiomeHazard` |
| `packages/shared-types/src/game/ability.ts` | MODIFY | Add `shield` and `damage_reduction` effect types; add `damageType` to damage effect |
| `packages/shared-types/src/core/entity.ts` | MODIFY | Add `ambushReady`, `stampedeFired` to `Creature`; add `DeployableEntity` |
| `packages/entities/src/types.ts` | MODIFY | Add optional `resistances` to `CreatureDefinition`; add `'ambush'` to `CreatureBehavior` |
| `packages/game-logic/src/combat/damage.ts` | MODIFY | Accept `damageType` + `defenderResistances` in `DamageParams`; apply multiplier |
| `packages/game-logic/src/combat/stat-caps.ts` | NEW | `applyDiminishingReturns()` pure function |
| `packages/game-logic/src/combat/biome-hazard.ts` | NEW | `computeHazardDrain()`, `HazardDefinition`, biome-to-hazard mapping |
| `packages/game-logic/src/ai/creature-ai.ts` | MODIFY | Add stampede/pack-call/ambush/frenzy to FSM; new `AiTickResult` fields |
| `packages/game-logic/src/stats/char-stats.ts` | MODIFY | Apply `applyDiminishingReturns` to each stat after aggregation |
| `packages/game-logic/src/index.ts` | MODIFY | Export new symbols from stat-caps and biome-hazard |
| `packages/game-logic/src/ability/definitions.ts` | MODIFY | Rebalance 6 ability definitions, add damageType to offensives |
| `packages/database/src/schema/deployables.ts` | NEW | Deployable structures table |
| `packages/database/src/schema/automation-jobs.ts` | NEW | Processing queue table |
| `packages/database/src/queries/deployables.ts` | NEW | CRUD queries for deployables |
| `packages/database/src/schema/index.ts` | MODIFY | Export new schemas |
| `apps/game-server/src/game/combat.service.ts` | MODIFY | Call `consumeShield`/`getDamageReduction` before health update; pass damageType |
| `apps/game-server/src/game/ability.service.ts` | MODIFY | Add `shieldPools`, `damageReductions` maps; execute shield/DR effects |
| `apps/game-server/src/game/ai.service.ts` | MODIFY | Inject HazardService; call processZoneHazards per tick; handle stampede/packCall |
| `apps/game-server/src/game/hazard.service.ts` | NEW | Biome hazard processor (injectable) |
| `apps/game-server/src/game/automation.service.ts` | NEW | Deployable lifecycle + processing queues |
| `apps/game-server/src/game/game.module.ts` | MODIFY | Register HazardService, AutomationService |
| `apps/game-server/src/game/game.gateway.ts` | MODIFY | Handle `deployable:place`, `deployable:collect`, `deployable:refuel` events |
| `apps/web/src/store/gameStore.ts` | MODIFY | Add hazard state, deployable collection state |

### Internal Boundaries — What Must NOT Cross

| Boundary | Rule |
|----------|------|
| `game-logic` ↔ server services | game-logic functions must remain pure — no NestJS imports, no DB calls |
| `AiService` ↔ `HazardService` | AiService calls HazardService but HazardService must not call AiService (circular) |
| `AutomationService` ↔ combat | AutomationService has no dependency on CombatService — automation is resource/crafting only |
| Creature AI FSM ↔ per-zone coordination | `tickCreatureAI()` is pure and single-creature; AiService handles multi-creature coordination (stampede fan-out) |

---

## Suggested Build Order (Dependency-Aware)

### Tier 1: Foundation (no inter-feature deps — build first)

1. **Shared types additions** — `DamageType`, `DamageResistances`, shield effect types, `DeployableEntity`. Required by every subsequent step.
2. **Stat caps** — `stat-caps.ts` pure function + integration into `char-stats.ts`. Affects all combat math. Must be stable before resistance/hazard tuning.
3. **Entity type extension** — add `resistances` to `CreatureDefinition`, add `ambushReady`/`stampedeFired` to `Creature`. Required by damage types and AI upgrades.

### Tier 2: Core Combat Mechanics (depend on Tier 1)

4. **Damage type pipeline** — modify `calculateDamage()` to consume `damageType` + `defenderResistances`. Pure logic change, testable in isolation.
5. **Ability rebalance** — update 6 ability definitions, add `shield` and `damage_reduction` effect types to `ability.ts`, implement handling in `AbilityService`. Add `damageType` to offensive ability effects.
6. **Combat service wiring** — propagate damage type from ability through `CombatService.creatureAttackTick()`; add shield consumption before health update.

### Tier 3: AI and Environmental Systems (depend on Tier 1 + 2)

7. **Creature AI upgrades** — extend `tickCreatureAI()` FSM with stampede/pack-call/ambush/frenzy. Extend `AiService` with coordination state (creatureGroups map, stampede fan-out).
8. **Biome hazard system** — `biome-hazard.ts` pure logic, `HazardService`, extend `BiomeHazard` interface, wire into `AiService.runZoneTick()`, add `player:hazard` socket event. Update `biome.ts` with gear counter fields.

### Tier 4: Automation (independent vertical — can be built in parallel with Tier 3)

9. **Database schema** — `deployables.ts` + `automation-jobs.ts` schemas, run migration.
10. **AutomationService** — deployable placement, collection, fuel, maintenance, processing queue tick.
11. **Gateway events** — `deployable:place`, `deployable:collect`, `deployable:refuel` in `game.gateway.ts`.
12. **Client automation UI** — deployable panel, status display, collection trigger.

### Tier 5: Client Polish (depend on Tiers 2-4)

13. **Damage type combat log** — show type label in floating numbers and combat log panel.
14. **Hazard HUD indicator** — `HazardOverlay.ts` renders active hazard warning with counter stat progress bar.
15. **Shield visual feedback** — distinct color for shield-absorbed damage numbers.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users (current) | All in-memory state (shields, cooldowns, AI sessions) is fine; automation 60s global tick is cheap |
| 1k-10k users | Automation global tick becomes costly at many deployables — shard by zone; consider Redis for deployable state |
| 10k+ users | HazardService per-player tick in zone becomes expensive — batch compute, emit delta only |

---

## Anti-Patterns

### Anti-Pattern 1: Putting Resistance Logic in AbilityService

**What people do:** Fetch creature resistances inside AbilityService where abilities execute, apply the multiplier there, and return modified damage to `calculateDamage`.

**Why it's wrong:** Splits the single-responsibility of damage calculation across two files. Auto-attacks from `CombatService.creatureAttackTick()` would bypass the resistance logic entirely since they don't go through AbilityService.

**Do this instead:** Add `damageType` and `defenderResistances` as optional parameters to `DamageParams` in `calculateDamage()`. Both ability-triggered attacks (AbilityService) and auto-attacks (CombatService) resolve resistances the same way by passing the creature's resistance map.

### Anti-Pattern 2: AiService Directly Mutating Creature State for New Behaviors

**What people do:** Add stampede/frenzy logic as mutations inside `AiService.runZoneTick()` directly on creature objects, bypassing `ZonesService.updateEntity()`.

**Why it's wrong:** Breaks the existing pattern where all entity state changes go through `ZonesService.updateEntity()` for consistency and persistence. In-memory mutation means creature state diverges from DB on server restart.

**Do this instead:** Return new fields from `tickCreatureAI()` via `AiTickResult`, let AiService call `zonesService.updateEntity()` with the new flags (`stampedeFired: true`, `ambushReady: false`), same as existing `combatTarget` handling.

### Anti-Pattern 3: Applying Diminishing Returns in Individual Stat Callers

**What people do:** Call `applyDiminishingReturns()` at each call site — in CombatService, in AbilityService, in AiService — wherever a stat value is consumed.

**Why it's wrong:** Every new caller has to remember to apply DR. Stats that flow through without this check (e.g., the haste-to-attack-interval formula) would compute incorrectly.

**Do this instead:** Apply DR once, at the end of `computeCharStats()`, before returning. All consumers get already-capped stats. The pure function becomes the authoritative source of truth.

### Anti-Pattern 4: Hazard Logic Inline in AiService.runZoneTick()

**What people do:** Put biome hazard computation inside the existing `runZoneTick()` method body in AiService, co-located with creature AI tick.

**Why it's wrong:** AiService is already the God Service of the zone tick. Adding hazard logic makes it harder to test, extends the warning-threshold tick duration (currently >200ms triggers a warning), and violates the single-responsibility principle.

**Do this instead:** Inject `HazardService` into `AiService` and call `this.hazardService.processZoneHazards(zoneId)` as a single line in `runZoneTick()`. HazardService owns all hazard state and logic independently.

---

## Sources

- Direct codebase inspection of all referenced files (HIGH confidence)
- `packages/game-logic/src/combat/damage.ts` — existing DamageParams interface
- `packages/game-logic/src/ai/creature-ai.ts` — existing FSM pattern, AiTickResult
- `packages/game-logic/src/stats/char-stats.ts` — existing computeCharStats() aggregation
- `apps/game-server/src/game/ai.service.ts` — existing zone tick loop, 1000ms interval
- `apps/game-server/src/game/combat.service.ts` — existing creatureAttackTick(), session model
- `apps/game-server/src/game/ability.service.ts` — existing shield/buff tracking patterns
- `packages/shared-types/src/game/ability.ts` — existing AbilityEffect discriminated union
- `packages/shared-types/src/game/biome.ts` — existing BiomeHazard interface
- `packages/entities/src/types.ts` — existing CreatureDefinition interface
- `packages/items/src/utils.ts` — existing ARCHETYPE_PROFILES including 'hazmat'
- `packages/database/src/schema/structures.ts` — existing structure schema pattern for deployables
- `.planning/PROJECT.md` — v1.24 feature scope and constraints

---

*Architecture research for: v1.24 Balance & Automation — damage types, biome hazards, AI upgrades, ability rebalance, stat caps, automation tech tree*
*Researched: 2026-03-03*
