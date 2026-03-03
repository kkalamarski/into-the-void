# Stack Research

**Domain:** Combat depth, biome hazards, creature AI upgrades, ability rebalance, automation tech tree (v1.24)
**Researched:** 2026-03-03
**Confidence:** HIGH (codebase directly inspected, installed versions verified from lockfile)

---

## Context: What the Codebase Already Has

This is subsequent-milestone research for v1.24. The monorepo stack is settled — no framework changes. Direct inspection of source files, `package.json`, and `pnpm-lock.yaml` confirms:

- **Phaser 3.90.0** (locked) — game client; `this.time.addEvent()` and `this.tweens.add()` already used for floating damage numbers, no new plugins needed
- **NestJS 10.3.x** — `EventEmitter2 3.0.1` (pinned) already wires cross-service events; `setInterval` + `setTimeout` pattern already powers AI ticks, buff ticks, respawn ticks
- **Drizzle ORM 0.30.10** — `structures` table already has a `properties: jsonb` catch-all column for arbitrary config; `entity_lifecycle` table handles respawn state
- **TypeScript 5.4+** — discriminated unions and `satisfies` already used across all packages
- **`game-logic` package** — pure functions: `calculateDamage()`, `tickCreatureAI()`, `computeCharStats()` — the right place for all new pure math
- **`shared-types` package** — `CombatResult`, `BiomeHazard`, `CreatureBehavior`, `AbilityEffect` types already exist and extend cleanly
- **`items` package** — `ItemDefinition` has `effects?: readonly ItemEffectDef[]`; `life_support` and `armor` effect types already exist

**The question for v1.24 is not what framework to pick. It is: which existing extension points accept the new features, and do any gaps require a new helper or schema column?**

Gaps found:
1. `DamageParams` in `game-logic/combat/damage.ts` has no `damageType` field — needs extending
2. `CreatureDefinition` in `packages/entities` has no `resistances` field — needs extending
3. `BiomeHazard` in `shared-types/game/biome.ts` has `damage` and `frequency` but no `statDrain` or `counterItemEffect` field — needs extending
4. `AiTickResult` in `game-logic/ai/creature-ai.ts` returns only `newPosition | aggroTarget | shouldAttack | shouldReturn` — Stampede/PackCall/Ambush/Frenzy results need new fields
5. `structures` table `properties` jsonb column is already the right persistence slot for extractor state — no new table needed until v1.25+
6. No `HazardService` exists yet — biome-position-based tick loop needs a new NestJS service

---

## Recommended Stack

### Core Technologies

All already installed. Zero new runtime dependencies.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | 5.4+ (installed, 5.9.3 at runtime) | All new type extensions | Discriminated unions make `DamageType` and `AbilityEffect` changes type-safe across packages; compile errors surface at definition site |
| NestJS | 10.3.x (installed) | `HazardService` and `AutomationService` as new injectable services | Pattern is proven — 19 services in `apps/game-server/src/game/`; new services slot in via `game.module.ts` |
| Drizzle ORM | 0.30.10 (installed) | `structures` table `properties` jsonb for extractor/beacon state | Already designed for this — `properties: jsonb` is a catch-all; use `sql` template for partial updates |
| Phaser 3 | 3.90.0 (locked) | HUD hazard indicator + damage type color coding in floating numbers | `this.add.text()`, `this.tweens.add()`, `this.time.addEvent()` already used in `EntityRenderer.ts`; no new scene needed |
| Vitest | 4.0.18 (installed) | Unit tests for new pure functions in `game-logic` | `calculateDamage.test.ts` already exists; extend it for resistance math and diminishing-returns stat cap |

### Supporting Libraries

No new installs. All are already in the monorepo.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/event-emitter` | 3.0.1 (installed) | Broadcast hazard damage events and automation tick results to connected players | Already wires `CombatService` → `PlayerService` → Socket.IO; use the same `EventEmitter2.emit()` pattern for `hazard.damage` and `automation.yield` events |
| `lru-cache` | 11.2.6 (installed) | Zone-scoped in-memory cache for active hazard state per player | `ZonesService` already uses it for chunk LRU; `HazardService` can maintain a `Map<playerId, HazardState>` in memory (no LRU needed at this scale) |
| `heap-js` | 2.7.1 (installed) | Priority queue — already used in pathfinding; available if automation processing queue needs ordering | Use only if resource processing queue needs priority ordering (probably not needed for v1.24 queue-as-array approach) |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `satisfies CreatureDefinition` | Validate resistance shape at definition-author time | Add to every new creature entry with resistances; already established pattern in items |
| `game-logic` unit tests (`vitest`) | Validate resistance multiplier math and stat cap curves | Extend existing `damage.test.ts`; add `diminishing-returns.test.ts` for the stat cap above 200 |
| NX `affected` targeting | Run only changed-package tests | `nx affected --target=test` confirms no regressions in `game-logic` after `DamageParams` extension |

---

## Integration Points: Where Each Feature Plugs In

### Damage Types (Thermal / Cryo / Bio / Kinetic)

**Package:** `packages/game-logic` + `packages/shared-types` + `packages/entities`

The existing `calculateDamage(params: DamageParams)` function is the single change point. Add `damageType: DamageType` to `DamageParams` and apply the creature resistance multiplier before the final damage value:

```typescript
// packages/shared-types/src/game/combat.ts — extend existing type
export type DamageType = 'thermal' | 'cryo' | 'bio' | 'kinetic';

// packages/entities/src/types.ts — extend CreatureDefinition
export interface CreatureResistances {
  thermal: number;   // 0.5 = 50% less damage; 1.5 = 50% more damage
  cryo: number;
  bio: number;
  kinetic: number;
}

// packages/game-logic/src/combat/damage.ts — extend DamageParams
export interface DamageParams {
  // ... existing fields
  damageType?: DamageType;          // NEW — defaults to 'kinetic' if absent
  targetResistances?: CreatureResistances; // NEW — from EntityRegistry lookup
}
```

Resistance multiplier applies as a single multiplicative step after armor reduction: `damage *= targetResistances[damageType]`. No other combat code changes — `CombatService` passes the creature's resistance from `EntityRegistry.get(creature.speciesId).resistances`.

**Ability damage types:** `AbilityEffect` in `shared-types/game/ability.ts` needs `damageType?: DamageType` on the `damage` variant. This tells `AbilityService` what multiplier to apply when an ability hits.

**Item effect for resistances:** Suits can grant resistance via the existing `life_support` effect type or a new `resistance` effect variant in `packages/items/src/types.ts`. The `life_support` effect already has `hazardResistance: number` but it's a single scalar. A new `resistance` effect type with per-element values is cleaner:

```typescript
// packages/items/src/types.ts — add to ItemEffect union
| { readonly type: 'resistance'; readonly thermal?: number; readonly cryo?: number; readonly bio?: number; readonly kinetic?: number }
```

### Biome Hazard Tick System

**Package:** `apps/game-server/src/game/` (new `HazardService`)

The existing `setInterval(() => this.processRespawnTick(), 10_000)` in `ZonesService` is the reference pattern. `HazardService` follows the same self-rescheduling `setTimeout` approach already used in `AiService` (to prevent event loop stalls).

`BiomeHazard` in `shared-types/game/biome.ts` already has `type`, `damage`, and `frequency`. Extend it:

```typescript
export interface BiomeHazard {
  type: 'radiation' | 'toxic' | 'cold' | 'heat' | 'void_storm' | 'pressure';
  damage: number;
  frequency: number;
  damageType: DamageType;          // NEW — maps to damage type system
  statDrain?: { stat: keyof CharacterStats; amount: number }; // NEW — e.g., Vigor drain in cold
  counterEffect?: string;          // NEW — item effect type that negates this hazard (e.g., 'life_support')
}
```

`HazardService.tickHazards()` runs every 5 seconds, iterates all connected players, checks their current biome tile's hazard list, applies damage/stat drain if the player lacks the counter gear, and broadcasts via `server.to(socketId).emit('hazard:damage', { ... })`.

**No new Socket.IO events beyond the existing pattern** — `hazard:damage` follows the same shape as `combat:attacked`.

### Creature AI Upgrades (Stampede / Pack Call / Ambush / Frenzy)

**Package:** `packages/game-logic/src/ai/creature-ai.ts` + `apps/game-server/src/game/ai.service.ts`

`AiTickResult` in `creature-ai.ts` already has `aggroTarget`, `shouldAttack`, `shouldReturn`. Extend it:

```typescript
export interface AiTickResult {
  newPosition: Position | null;
  aggroTarget?: string;
  shouldAttack?: boolean;
  shouldReturn?: boolean;
  // NEW fields:
  stampede?: boolean;              // herbivore: all herd members flee together
  packCallRadius?: number;         // predator: aggro all nearby same-species within radius
  ambushStrike?: boolean;          // predator: bonus damage multiplier on first hit
  frenzyActivated?: boolean;       // maniac: speed/damage boost when health < 30%
}
```

All new behaviors are **pure functions** returning new `AiTickResult` variants. `AiService` handles the side effects (broadcasting to all zone clients, applying frenzy multiplier to combat sessions).

`CreatureDefinition` in `packages/entities/src/types.ts` gets optional behavior upgrade flags:

```typescript
export interface CreatureDefinition extends BaseEntityDefinition {
  // ... existing fields
  behaviorUpgrade?: 'stampede' | 'pack_call' | 'ambush' | 'frenzy'; // NEW
  packCallRadius?: number;          // tiles — only for pack_call creatures
}
```

### Ability Rebalance

**Package:** `packages/game-logic/src/ability/` + `packages/shared-types/src/game/ability.ts`

This is pure data/logic change — no new stack required. Defensive ability overhaul (shields, real damage reduction) uses the existing `buff` and `debuff` effect types in `AbilityEffect`. A shield absorb mechanic adds a new effect variant:

```typescript
// packages/shared-types/src/game/ability.ts — add to AbilityEffect union
| { readonly type: 'shield'; readonly absorb: number; readonly duration: number }
```

`AbilityService` checks for active shields before applying damage in `applyAbilityDamage()`. No new NestJS service — this slots into the existing ability resolution loop.

Stat cap with diminishing returns above 200 belongs in `packages/game-logic/src/stats/stat-helpers.ts` as a new `capStat(value: number): number` pure function. The cap formula is implementation detail — the integration point is calling it inside `computeCharStats()` after all additive stacking.

### Automation Tech Tree (Extractors → Beacons → Planetary Extractors → Resource Processing)

**Package:** `apps/game-server/src/game/` (new `AutomationService`) + `packages/database/src/schema/structures.ts` (minor extension)

The `structures` DB table already has `structureType`, `ownerId`, `position`, `durability`, and `properties: jsonb`. This is exactly right for deployed automation items. No schema migration needed for v1.24:

- `structureType`: `'extractor' | 'survey_beacon' | 'planetary_extractor' | 'refinery'`
- `properties`: stores extractor config (`{ targetResourceId, tier, lastHarvestAt, maintenanceDue, fuelRemaining }`)

`AutomationService` manages deployed structures:

- On deploy: insert into `structures` table, register in-memory in a `Map<structureId, AutomationState>`
- Tick loop (60s interval via `setInterval`): iterate all active structures, calculate yield since last harvest, add resources to owner's storage, update `lastHarvestAt` in DB
- Maintenance loop (separate 5min interval): decrement fuel/maintenance counters, deactivate if zero
- Credit sink: deploy cost deducted at placement via existing `PlayerService.deductCredits()`

The processing queue (T5 refinery) is a simple in-memory array per structure: `processingQueue: ProcessingJob[]` stored in `properties` jsonb. No BullMQ or external queue needed at this scale — the 60s automation tick drains the queue.

**No Redis queues, no BullMQ** — the existing `setInterval` pattern with in-memory state + DB persistence is sufficient. The project already rejected Redis-backed queues (ioredis is installed but used only for session management, not queuing).

---

## Installation

No new packages required. All work is new files and extensions within the existing monorepo structure.

```bash
# Zero new npm installs.

# New files to create:
# apps/game-server/src/game/hazard.service.ts        (biome hazard tick loop)
# apps/game-server/src/game/automation.service.ts    (extractor/beacon/refinery management)
# packages/game-logic/src/stats/diminishing-returns.ts  (stat cap pure function)
# packages/game-logic/src/combat/resistance.ts       (resistance multiplier pure function)

# New test files:
# packages/game-logic/src/combat/damage-types.test.ts
# packages/game-logic/src/stats/stat-cap.test.ts

# Register new services in:
# apps/game-server/src/game/game.module.ts  (add HazardService, AutomationService to providers)
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Extend `DamageParams` with `damageType?: DamageType` | Separate `calculateElementalDamage()` function | Only if elemental and kinetic damage had completely different formula shapes — they don't; it's a single multiplier |
| In-memory `Map<playerId, HazardState>` in `HazardService` | Redis-backed hazard state | Only if multiple game-server instances need to share state — this is single-instance; in-memory is simpler, faster, and already the project pattern |
| `setInterval` in `AutomationService` | `@nestjs/schedule` `@Interval()` decorator | `@nestjs/schedule` is not installed; `setInterval` is the codebase's established pattern (AI ticks, buff ticks, respawn ticks); adding a dependency for syntactic sugar is not warranted |
| `structures` table `properties` jsonb | New `automation_structures` table | New table is premature; `structures.properties` is already a catch-all jsonb designed for this; create a dedicated table only if query patterns outgrow jsonb |
| `AbilityEffect` shield variant | Separate `ShieldState` tracked outside abilities | Shield is a buff with absorb semantics — it fits the existing buff/duration model; separate state would require new DB schema |
| BullMQ for resource processing queue | In-memory `processingQueue` in `properties` | BullMQ requires Redis queues and adds operational complexity; at v1.24 scale (dozens of refineries per player), an array in jsonb is sufficient; escalate to BullMQ only if processing jobs need persistence across server restarts |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@nestjs/schedule` | Not installed; `setInterval` is the proven project pattern for all tick loops (AI, buffs, respawns, entity lifecycle); adding a dependency for decorator syntax is over-engineering | `setInterval` / `setTimeout` self-rescheduling pattern, already in `AiService` and `ZonesService` |
| BullMQ / `@nestjs/bull` | Not installed; introduces Redis queue dependency for a processing queue that an in-memory array handles fine at current scale | `processingQueue: ProcessingJob[]` in `structures.properties` jsonb, drained on each 60s automation tick |
| New `automation` PostgreSQL tables (v1.24) | Premature schema growth; `structures` table `properties` jsonb already handles extractor config and processing queues; a dedicated table only pays off with complex query patterns | `structures` table with `structureType` discriminator and `properties` jsonb |
| Phaser particle system for hazard effects | The project is color-tiles-only (no sprite art pipeline yet); particle emitters add visual complexity without art assets | `this.add.text()` floating text with damage type color coding, same as existing floating damage numbers |
| Separate `DamageTypeService` on the backend | Damage type resolution is pure math (a lookup + multiply); a service is overkill; pure functions belong in `game-logic` | `applyResistance(damage, type, resistances)` pure function in `packages/game-logic/src/combat/resistance.ts` |
| Modifying `CombatResult` shape | `CombatResult` is a shared-types contract used by both game-server and web client; adding `damageType` to it is correct, but changing `damage` to a per-type breakdown would break all existing consumers | Add `damageType?: DamageType` as optional field; the single `damage` number remains the applied post-resistance value |

---

## Stack Patterns by Variant

**If adding a new damage type beyond the 4 (Thermal/Cryo/Bio/Kinetic):**
- Add to the `DamageType` union in `shared-types/game/combat.ts`
- Add optional field to `CreatureResistances` interface (defaults to `1.0` if absent)
- Add to `BiomeHazard.damageType` union
- No service changes — the lookup is a runtime property

**If automation structures need cross-zone ownership queries:**
- Add a DB index on `structures.ownerId` — Drizzle's `index()` call on the table definition
- Query with `db.select().from(structures).where(eq(structures.ownerId, characterId))`
- No ORM upgrade needed; this is a standard Drizzle pattern at 0.30.x

**If biome hazard ticks need per-tile granularity (not biome-wide):**
- Store `hazards` in tile definitions (`packages/tiles`) rather than biome definitions (`shared-types/game/biome.ts`)
- `HazardService` reads the tile at the player's current position rather than the zone's biome type
- The `tiles` package already has tile definition infrastructure; this is an extension, not a rewrite

**If resource processing queue needs persistence across server restarts:**
- Move `processingQueue` from jsonb to a new `processing_jobs` table
- Use Drizzle `pgTable` with `characterId`, `structureId`, `inputItemId`, `outputItemId`, `completesAt`, `status` columns
- This is a v1.25+ concern — not needed for v1.24

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| phaser@3.90.0 (locked) | All existing rendering code | The `this.time.addEvent()` API is stable since 3.60; hazard HUD uses only established APIs |
| drizzle-orm@0.30.10 | jsonb partial updates via `sql` template | The `||` merge operator approach works at 0.30.x; no upgrade needed |
| @nestjs/event-emitter@3.0.1 | NestJS 10.3.x | Already installed and working; `HazardService` emits `hazard:damage` using the same pattern as `CombatService` |
| TypeScript 5.4+ | Discriminated union extensions | `satisfies` operator and const union narrowing both available; no TS upgrade needed |

---

## Key Integration Facts for Roadmap Authors

1. **Damage types require 3 coordinated changes** across 3 packages: (a) `DamageType` union in `shared-types`, (b) `resistances` field in `CreatureDefinition` in `entities`, (c) `DamageParams` extension in `game-logic/combat/damage.ts`. All three must land before `CombatService` can pass resistance data.

2. **`HazardService` is a new service with no circular dependencies.** It reads player position from `PlayerService`, reads biome data from `ZonesService`, applies damage via direct calculation (no `CombatService`), and emits Socket.IO events directly. Register it in `game.module.ts`.

3. **`AutomationService` writes to the `structures` table.** The existing `DatabaseService` in `apps/game-server/src/database/` provides the Drizzle client. `AutomationService` calls `db.insert(structures)`, `db.update(structures)`, and `db.select().from(structures)` — no new DB infrastructure.

4. **AI upgrade flags are additive to existing behavior tree.** `tickCreatureAI()` is a switch on `creature.behavior`. Stampede adds a check inside `tickHerbivore()`. Pack Call adds a check inside `tickPredator()`. Ambush and Frenzy add optional modifiers before returning `AiTickResult`. The FSM shape does not change.

5. **Ability rebalance is pure data + one new effect type.** No new services, no new DB tables, no new Socket.IO events. Change ability definitions in `packages/game-logic/src/ability/` and add shield absorb logic to `AbilityService.handleAbilityEffect()`. The 21-ability limit is enforced by scope (see PROJECT.md).

6. **The stat cap function belongs in `game-logic/src/stats/stat-helpers.ts`**, which already has `applyLevelGapMultiplier()` and is imported by `computeCharStats()`. Adding `capStat()` here follows the existing single-responsibility pattern for stat math.

7. **Socket.IO event additions are minimal.** Hazard system needs `hazard:damage` event. Automation system needs `automation:yield` and `automation:status` events. Both follow the existing pattern: server emits to individual `socketId`, client Zustand store handles the update.

---

## Sources

- Codebase direct inspection: `packages/game-logic/src/combat/damage.ts`, `packages/game-logic/src/ai/creature-ai.ts`, `packages/game-logic/src/stats/char-stats.ts`, `packages/shared-types/src/game/combat.ts`, `packages/shared-types/src/game/biome.ts`, `packages/shared-types/src/game/ability.ts`, `packages/items/src/types.ts`, `packages/entities/src/types.ts`, `packages/database/src/schema/structures.ts`, `apps/game-server/src/game/combat.service.ts`, `apps/game-server/src/game/ai.service.ts`, `apps/game-server/src/game/ability.service.ts`, `apps/game-server/src/zones/zones.service.ts` — HIGH confidence
- Installed version verification from `pnpm-lock.yaml`: phaser@3.90.0, drizzle-orm@0.30.10, @nestjs/event-emitter@3.0.1 — HIGH confidence
- `package.json` root: NestJS 10.3.x, TypeScript ^5.4.0 — HIGH confidence
- WebSearch verification: Phaser current stable is 3.90.0 "Tsugumi" (May 2025); drizzle-orm latest is 0.45.1 (project pinned at 0.30.10, upgrade not warranted); @nestjs/schedule alternative evaluated and rejected (not installed, setInterval is established pattern) — MEDIUM confidence (single search source per item)
- `.planning/PROJECT.md` — v1.24 milestone scope and out-of-scope items — HIGH confidence
- `lore/world-bible.md` — biome hazard types and faction identity — HIGH confidence (authoritative per CLAUDE.md)

---

*Stack research for: damage types, biome hazards, creature AI upgrades, ability rebalance, automation tech tree (v1.24)*
*Researched: 2026-03-03*
