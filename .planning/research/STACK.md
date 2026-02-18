# Stack Research: Character Stats System

**Domain:** Multiplayer 2D sci-fi survival MMO — character stat system with 8 primary stats, level scaling, equipment bonuses
**Researched:** 2026-02-18
**Confidence:** HIGH

## Executive Summary

The character stats system requires **zero new packages**. Every capability needed — type definitions, pure computation, JSONB persistence, WebSocket delivery, Zustand display, combat integration — is already present in the installed stack.

The work is entirely type evolution and code addition within existing patterns. The existing `PlayerStats` interface (5 stats: strength, agility, endurance, intelligence, perception) and its companion `StatsJson` database type must be replaced with the new 8-stat model (Durability, Toughness, Power, Haste, Vigor, Recovery, Perception, Resilience). This is a JSONB shape migration — the `characters.stats` column changes from one flat object shape to another. No schema columns are added or removed; only the typed content of the JSONB column changes.

The existing `ComputedStats` interface and `effectiveStats()` function in `game-logic` already implement the pattern for deriving stats from equipment. The 8 new stats replace the current ad-hoc fields (armor, speedMultiplier, hazardResistance, etc.) with a structured, lore-aligned model that also applies cleanly to creature species. The `ItemEffect` discriminated union in `packages/items` gains new effect types for each new stat. The `calculateDamage()` and `calculateHitChance()` combat functions gain new stat references (Power for damage, Haste for speed, Toughness for armor, Perception for detection, Resilience for resistance).

The species schema (`SpeciesStatsJson`) needs parallel extension to accommodate the same 8-stat model for creatures, which the combat milestone requires. Building the shared `CharacterStats` type now means creatures can reuse it without schema rework later.

---

## Recommended Stack

### Core Technologies (All Present — NO NEW PACKAGES)

| Technology | Version | Purpose | Why Sufficient |
|------------|---------|---------|----------------|
| TypeScript | ^5.4.0 (installed) | Stat type definitions, pure computation | The 8 new stats are TypeScript interfaces and pure functions. No runtime library needed for math this simple. The existing discriminated union pattern for `ItemEffect` handles new stat effect types without external libs. |
| `@into-the-void/shared-types` | workspace | `CharacterStats` interface, `ComputedStats` extension | `PlayerStats` (5 stats) is already in `packages/shared-types/src/core/player.ts`. Replace with `CharacterStats` (8 stats). Both `shared-types` and all apps already import from this package — the rename propagates cleanly. |
| `@into-the-void/game-logic` | workspace | `computeStats()` pure function for level scaling + equipment bonuses | `effectiveStats(equipment)` in `packages/game-logic/src/inventory/stats.ts` is the validated pattern. A new `computeStats(level, equipment)` pure function adds level-scaling on top. Same pure function, no side effects, no new dependencies. |
| `@into-the-void/database` | workspace | `StatsJson` JSONB shape in `characters` table | `characters.stats` JSONB already stores `StatsJson`. Update the interface from 5 old fields to 8 new fields. Drizzle infers types from the updated `.$type<StatsJson>()` call. No migration SQL needed — PostgreSQL JSONB is schema-less; the application code sets the new shape on write. |
| `@into-the-void/items` | workspace | `ItemEffect` new stat effect types | `ItemEffect` is a discriminated union in `packages/items/src/types.ts`. Add new variant types: `{ type: 'durability'; value: number }`, `{ type: 'toughness'; value: number }`, etc. The `resolveEffect()` switch in `game-logic` gains matching cases. Exhaustive switch means TypeScript will error if a new type is added without a handler. |
| Drizzle ORM | 0.30.10 (installed) | JSONB `$type<>()` typing for stat fields | `.$type<StatsJson>()` on the `stats` column provides TypeScript safety for the JSONB content. No SQL migration needed for a JSONB shape change — only the TypeScript interface updates. Existing Drizzle query helpers (`getCharacter`, `updateCharacter`) require no changes beyond the type update. |
| Zustand | 4.5.7 (installed) | `player.stats` display in React HUD | `useGameStore().player` already carries the `Player` type (which includes `PlayerStats`). After renaming to `CharacterStats`, the HUD reads stats from the same `player` object. No new store slice needed — stats are player attributes, not a separate domain. |
| Socket.IO | ^4.7.0 (installed) | Stat delivery to client on auth and level-up | The `AuthResponse` already sends the full `Player` object on auth. `Player.stats` carries the base stats. The `inventory:update` event carries `ComputedStats` (equipment bonuses). No new events needed — the existing delivery channels cover stat display. |
| Immer | ^11.1.4 (installed) | Already used in `inventoryStore.ts` — no change | Stat mutations happen server-side. The client receives authoritative state via socket events and stores it directly. No nested stat mutation patterns emerge that require Immer in a new stats store. |
| React 18 | ^18.2.0 (installed) | Stat display in HUD component | `HUD.tsx` already reads `inventory?.stats` for equipment bonuses (armor, speedMultiplier, hazardResistance). Adding the 8 new character stats means adding 8 new display rows in the existing `stats-section` div. No new component libraries needed. |

### Supporting Libraries (No New Packages)

| Library | Version | Purpose | Why Already Sufficient |
|---------|---------|---------|------------------------|
| `react-icons` | ^5.5.0 (installed) | Stat icons in HUD | Already used for GiShield, GiLightningFrequency, GiPoisonGas in `HUD.tsx`. The `gi` (Game Icons) set has specific icons for each of the 8 new stats. No icon library addition needed. |
| `@floating-ui/react` | ^0.27.18 (installed) | Stat tooltip on HUD hover | Already installed for item tooltips (v1.6 milestone). The same `useFloating` + `flip` + `shift` pattern can provide breakdowns of base stat + equipment bonus when a player hovers a stat row. No new package needed — extend the existing tooltip pattern. |

### Development Tools (No New Additions)

The existing NX + TypeScript + ESLint + Prettier + SWC toolchain handles everything. No new dev tooling needed.

---

## Architecture Decisions

### CharacterStats: Unified Type for Players and Creatures

Define a single `CharacterStats` interface in `shared-types` used for both player characters and creature species. This is the decision that makes the combat milestone work without a rewrite:

```typescript
// packages/shared-types/src/core/player.ts (replace PlayerStats with CharacterStats)

/**
 * Character stats — 8 primary stats, shared by players and creatures.
 * Base values are set by level scaling formula.
 * Effective values = base + equipment bonuses (computed server-side only).
 *
 * Stat definitions (lore-aligned):
 * - Durability: Maximum health pool
 * - Toughness: Physical damage reduction (armor equivalent)
 * - Power: Damage output multiplier
 * - Haste: Action speed / move speed
 * - Vigor: Energy/stamina pool
 * - Recovery: Regeneration rate (health + energy)
 * - Perception: Detection range + critical hit chance
 * - Resilience: Environmental hazard resistance + status effect reduction
 */
export interface CharacterStats {
  durability: number;
  toughness: number;
  power: number;
  haste: number;
  vigor: number;
  recovery: number;
  perception: number;
  resilience: number;
}
```

Replace the existing `PlayerStats` type alias everywhere. Update `Player` interface and `CombatParticipant` to use `CharacterStats`. Update `SpeciesStatsJson` in `database/src/schema/species.ts` to store the same shape (replacing `{ baseHealth, baseDamage, armor, speed }`).

### Level Scaling Formula: Pure Function in game-logic

Base stat values scale with level. The formula lives in a new pure function `baseStatsForLevel(level: number): CharacterStats` in `packages/game-logic/src/stats/`:

```typescript
// packages/game-logic/src/stats/base-stats.ts

const BASE_STATS_LEVEL_1: CharacterStats = {
  durability: 100,   // max health
  toughness: 10,     // damage reduction
  power: 10,         // damage output
  haste: 10,         // action speed
  vigor: 100,        // energy pool
  recovery: 5,       // regen rate
  perception: 10,    // detection range / crit
  resilience: 10,    // hazard resistance
};

const STAT_PER_LEVEL: CharacterStats = {
  durability: 10,    // +10 max health per level
  toughness: 1,
  power: 1,
  haste: 0.5,
  vigor: 5,          // +5 energy per level
  recovery: 0.2,
  perception: 0.5,
  resilience: 0.5,
};

export function baseStatsForLevel(level: number): CharacterStats {
  return {
    durability: BASE_STATS_LEVEL_1.durability + STAT_PER_LEVEL.durability * (level - 1),
    toughness: BASE_STATS_LEVEL_1.toughness + STAT_PER_LEVEL.toughness * (level - 1),
    power: BASE_STATS_LEVEL_1.power + STAT_PER_LEVEL.power * (level - 1),
    haste: BASE_STATS_LEVEL_1.haste + STAT_PER_LEVEL.haste * (level - 1),
    vigor: BASE_STATS_LEVEL_1.vigor + STAT_PER_LEVEL.vigor * (level - 1),
    recovery: BASE_STATS_LEVEL_1.recovery + STAT_PER_LEVEL.recovery * (level - 1),
    perception: BASE_STATS_LEVEL_1.perception + STAT_PER_LEVEL.perception * (level - 1),
    resilience: BASE_STATS_LEVEL_1.resilience + STAT_PER_LEVEL.resilience * (level - 1),
  };
}
```

Pure function. No DB calls. No side effects. Called by the server when computing effective stats, by combat functions, and by character creation. Mirrors the pattern of `validateMovement` — pure, testable, importable by both server and client.

### ComputedStats: Replace Ad-hoc Fields with 8-Stat Model

The current `ComputedStats` interface has ad-hoc fields (`armor`, `speedMultiplier`, `hazardResistance`, `detectionRange`, `energyCapacity`, `rechargeRate`, `jumpHeight`, `bonuses: Record<string, number>`). Replace with a structured model aligned to the 8 new stats:

```typescript
// packages/shared-types/src/game/inventory.ts (update ComputedStats)

/**
 * Effective stats: base stats (from level) + equipment bonuses.
 * Server computes this. Client uses for display only.
 * Never trust client-provided ComputedStats values.
 */
export interface ComputedStats {
  /** Base stat values derived from character level */
  base: CharacterStats;
  /** Equipment bonus deltas — additive on top of base */
  equipment: Partial<CharacterStats>;
  /** Final effective values = base + equipment */
  effective: CharacterStats;
  /**
   * Extended bonuses from modules/accessories that don't map to
   * primary stats (e.g., 'miningYield', 'craftingSpeed').
   * Preserved for tool specialization milestone.
   */
  bonuses: Record<string, number>;
}
```

The `effectiveStats()` function in `game-logic/src/inventory/stats.ts` evolves into `computeStats(level, equipment)` that returns this structured `ComputedStats`.

### ItemEffect: New Stat Effect Types

Add new `ItemEffect` variants in `packages/items/src/types.ts` for the 8 new stats:

```typescript
export type ItemEffect =
  // ... existing effects preserved ...
  | { readonly type: 'heal'; readonly amount: number }
  | { readonly type: 'energy_restore'; readonly amount: number }
  | { readonly type: 'suit_repair'; readonly amount: number }
  | { readonly type: 'stat_buff'; readonly stat: string; readonly amount: number; readonly duration: number }
  // New stat equipment effects:
  | { readonly type: 'durability_bonus'; readonly value: number }
  | { readonly type: 'toughness_bonus'; readonly value: number }
  | { readonly type: 'power_bonus'; readonly value: number }
  | { readonly type: 'haste_bonus'; readonly value: number }
  | { readonly type: 'vigor_bonus'; readonly value: number }
  | { readonly type: 'recovery_bonus'; readonly value: number }
  | { readonly type: 'perception_bonus'; readonly value: number }
  | { readonly type: 'resilience_bonus'; readonly value: number };
```

The existing ad-hoc effects (`armor`, `speed`, `life_support`, `sensor`, `power_core`, `mobility`) map to the new stats:
- `armor` → `toughness_bonus`
- `speed` → `haste_bonus`
- `life_support` → `resilience_bonus`
- `sensor` → `perception_bonus`
- `power_core` (energyCapacity + rechargeRate) → `vigor_bonus` + `recovery_bonus`
- `mobility` (jumpHeight) → `haste_bonus` (movement capability)

The exhaustive `switch` in `resolveEffect()` ensures TypeScript compile error if any new effect type is added without a handler.

### Combat Functions: Update to 8-Stat Model

`calculateDamage()` and `calculateHitChance()` in `game-logic/src/combat/damage.ts` currently reference `strength`, `agility`, `endurance` from the old `PlayerStats`. Update to reference the new `CharacterStats`:

```typescript
// calculateDamage:
// OLD: damage += (attackerStats.strength ?? 10) * 0.5;
// NEW: damage += (attackerStats.power ?? 10) * 0.5;

// OLD: effectiveArmor = armorReduction * (1 + (defenderStats.endurance ?? 10) * 0.02);
// NEW: effectiveArmor = armorReduction * (1 + (defenderStats.toughness ?? 10) * 0.02);

// calculateHitChance:
// OLD: attackerAgility, defenderAgility
// NEW: attackerStats.perception, defenderStats.haste (perception vs dodge)
```

### Database: JSONB Shape Change Only

The `characters.stats` column already stores JSONB typed as `StatsJson`. Update the interface from the 5-field old shape to the 8-field new shape. No SQL migration needed because PostgreSQL JSONB is schema-less — the old shape rows continue to work until the application writes the new shape on character save.

Existing rows with old shape keys (`strength`, `agility`, `endurance`, `intelligence`, `perception`) are safe to leave in place; they will be overwritten on the next character save with the new shape. A one-time Drizzle migration script (following the pattern of `migrate-equipment-schema.ts`) should transform existing rows on deployment for consistency:

```typescript
// Mapping from old stats to new stats (migration script only)
// OLD strength → NEW power
// OLD agility  → NEW haste
// OLD endurance → NEW durability (and toughness)
// OLD intelligence → NEW recovery (and vigor)
// OLD perception → NEW perception (same name, keep value)
```

### StatsJson in characters table:

```typescript
// packages/database/src/schema/characters.ts

export interface StatsJson {
  durability: number;
  toughness: number;
  power: number;
  haste: number;
  vigor: number;
  recovery: number;
  perception: number;
  resilience: number;
}

// Default values in the Drizzle table definition:
stats: jsonb('stats').$type<StatsJson>().notNull().default({
  durability: 100,
  toughness: 10,
  power: 10,
  haste: 10,
  vigor: 100,
  recovery: 5,
  perception: 10,
  resilience: 10,
}),
```

### HUD Display: Add Stat Panel

`HUD.tsx` currently displays 3 stats (armor, speed, hazard resistance) using `react-icons/gi`. Extend the stats section to display all 8 new stats with appropriate icons from the already-installed `react-icons` gi set:

```typescript
// Stat → react-icons/gi mapping (all icons already in the installed gi set)
// Durability   → GiHeart (max health indicator)
// Toughness    → GiShield (replacing current GiShield/armor display)
// Power        → GiSwordBrandish (damage output)
// Haste        → GiLightningFrequency (replacing current speed display)
// Vigor        → GiBatteries (energy pool)
// Recovery     → GiRecycle (regeneration)
// Perception   → GiRadarSweep (detection range)
// Resilience   → GiPoisonGas (replacing current hazard resistance display)
```

The stats-section div already exists in HUD.tsx. The player stat values come from `player.stats` (base CharacterStats). The equipment bonus values come from `inventory?.stats?.equipment` (ComputedStats.equipment). Display format: `base + equipment_bonus = effective` or just the effective value for simplicity.

---

## Integration Points

### Files That Change (No New Files Needed in Most Cases)

| File | Change Type | What Changes |
|------|-------------|--------------|
| `packages/shared-types/src/core/player.ts` | Modify | `PlayerStats` → `CharacterStats` with 8 new fields; `Player` interface updated |
| `packages/database/src/schema/characters.ts` | Modify | `StatsJson` interface 5→8 fields; default values updated |
| `packages/database/src/schema/species.ts` | Modify | `SpeciesStatsJson` aligned to `CharacterStats` (creatures need the same 8 stats) |
| `packages/game-logic/src/inventory/stats.ts` | Modify | `ComputedStats` type updated; `effectiveStats()` → `computeStats(level, equipment)` |
| `packages/game-logic/src/combat/damage.ts` | Modify | Stat references: `strength → power`, `agility → haste/perception`, `endurance → toughness/durability` |
| `packages/game-logic/src/combat/turn-order.ts` | Modify | `agility → haste` for initiative calculation |
| `packages/items/src/types.ts` | Modify | 8 new `ItemEffect` variant types added; old ad-hoc effects deprecated/mapped |
| `packages/game-logic/src/inventory/effects.ts` | Modify | `resolveEffect()` switch: new cases for 8 stat bonus effect types |
| `apps/web/src/ui/hud/HUD.tsx` | Modify | Stats section updated to display 8 new stats from `player.stats` + equipment bonuses |
| `apps/game-server/src/*` | Modify | Any code referencing `PlayerStats` old fields updated to `CharacterStats` new fields |
| `packages/game-logic/src/stats/base-stats.ts` | **NEW** | `baseStatsForLevel(level)` pure function |
| `packages/game-logic/src/stats/compute.ts` | **NEW** | `computeStats(level, equipment): ComputedStats` pure function |
| `packages/database/src/migrations/migrate-stats-schema.ts` | **NEW** | One-time migration script to remap old stat names to new names |

### New Zustand Store: Not Needed

Character stats are player attributes carried in the existing `Player` object in `gameStore.player`. Equipment-derived bonuses are in `inventoryStore.inventory.stats` (ComputedStats). No new Zustand store is required. Stat display in the HUD reads from the stores that already exist.

### New Socket Events: Not Needed

The existing `auth` response delivers the full `Player` object (including `CharacterStats`). The `inventory:update` event delivers `Inventory` (which includes `ComputedStats`). A `stats:update` event would only be needed if stats can change outside of auth or inventory operations — which they cannot in this milestone (stats only change via level-up, which triggers a character save and can be delivered inline with the XP update). No new socket events needed.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Separate `statsStore.ts` Zustand slice | Stats are player attributes, not a separate domain. Creating a third store (`gameStore` + `inventoryStore` + `statsStore`) for what is ultimately a few numbers on `player.stats` adds subscription complexity with no benefit. | Read stats from `useGameStore().player.stats` (base) and `useInventoryStore().inventory?.stats?.effective` (computed) |
| `mathjs` or similar math library for stat formulas | Stat computation is 8 additions and 8 multiplications. A 400KB math library for `base + bonus` is extreme over-engineering. | Plain TypeScript arithmetic in pure functions |
| PostgreSQL computed columns or generated columns for stat aggregation | Stat computation must run in `game-logic` (shared package) so both server and client can use the same formula. Moving stat aggregation to PostgreSQL isolates it on the server, prevents client-side preview (stat tooltip before equip), and adds a SQL dependency to a pure math operation. | `computeStats(level, equipment)` pure function in `packages/game-logic` |
| Redux for stat state | Already have Zustand. Same argument as in the inventory STACK.md — two state management systems for a single session-scoped domain. | Existing Zustand stores |
| Stat allocation system (spend points on stats) | The 8 stats are derived from level and equipment — they are NOT player-allocated. Allocatable stats would require a different architecture (allocation events, point pools, respec costs). The lore does not specify an allocation system; stats are a function of what you wear and your level. | Level scaling formula + equipment bonuses as the two inputs |
| Caching computed stats in the database | `computeStats(level, equipment)` is deterministic and fast (< 1ms). Caching in a `computed_stats` column creates a cache invalidation problem: any equipment change requires a cache update. If the cache and the formula drift (bug), the stored value is wrong. | Recompute on demand from authoritative inputs (level + equipment) |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| 8 flat stats on `CharacterStats` | Nested stat categories (e.g., `{ offense: { power, haste }, defense: { toughness, durability }, ... }`) | Only if the UI has category-grouped tabs. Current HUD is a flat stat list. Nesting adds complexity with no display benefit at this scope. |
| `computeStats()` as a new pure function in `game-logic/src/stats/` | Extending the existing `effectiveStats()` function in-place | The function signature changes from `(equipment) → ComputedStats` to `(level, equipment) → ComputedStats`. Renaming communicates the expanded scope clearly. The old name can be kept as a re-export alias if other callers depend on it. |
| Single `CharacterStats` type shared by players and creatures | Separate `PlayerStats` and `CreatureStats` types | Only if creatures need completely different stat fields than players. Since creatures fight players using the same combat formulas, they need the same 8 stats to produce correct `calculateDamage()` results. One type is simpler and correct. |
| Inline stat display in existing HUD stats section | New `CharacterStatsPanel.tsx` React component | A dedicated panel component makes sense if stats have interactive tooltips (hover for breakdown), tabs (base vs effective), or per-stat help text. At minimum viable display (8 rows of icon + number), extending the existing stats section in `HUD.tsx` is sufficient. Extract to a component when the display grows beyond 20 lines. |

---

## Version Compatibility

| Package | Installed Version | Compatibility Notes |
|---------|-------------------|---------------------|
| TypeScript | ^5.4.0 | Discriminated unions, const enums, template literal types all work for the stat system. No version-related issues. |
| Drizzle ORM | 0.30.10 | `.$type<StatsJson>()` on `jsonb()` is the correct API for typed JSONB. Compatible with the `StatsJson` shape change — no Drizzle version change needed. |
| `@into-the-void/items` | workspace | The new `ItemEffect` union variants are additive. Existing exhaustive switch in `resolveEffect()` will emit TypeScript compile errors for new unhandled cases — this is the correct behavior to force handler completeness. |

---

## Sources

### HIGH Confidence (Verified in Codebase)

- `packages/shared-types/src/core/player.ts` — `PlayerStats` (5 stats: strength, agility, endurance, intelligence, perception) confirmed. `Player` interface confirmed with `health`, `maxHealth`, `energy`, `maxEnergy`, `level`, `xp` fields.
- `packages/database/src/schema/characters.ts` — `StatsJson` (5 stats matching `PlayerStats`) confirmed. Default values confirmed at 10 each. `characters.stats` JSONB column confirmed.
- `packages/database/src/schema/species.ts` — `SpeciesStatsJson { baseHealth, baseDamage, armor, speed }` confirmed. This is the creature stat model that needs alignment to `CharacterStats`.
- `packages/game-logic/src/inventory/stats.ts` — `ComputedStats` interface and `effectiveStats(equipment)` pure function confirmed. Current `ComputedStats` fields: armor, speedMultiplier, hazardResistance, detectionRange, energyCapacity, rechargeRate, jumpHeight, bonuses. This is the direct replacement target.
- `packages/game-logic/src/combat/damage.ts` — References to `attackerStats.strength`, `attackerStats.agility`, `defenderStats.endurance` confirmed. These are the old stat references that need updating to new 8-stat model.
- `packages/game-logic/src/combat/turn-order.ts` — `stats?.agility` reference confirmed for initiative. Update to `stats?.haste`.
- `packages/items/src/types.ts` — `ItemEffect` discriminated union confirmed with 10 existing effect types. Pattern is proven for adding new stat-aligned variants.
- `packages/game-logic/src/inventory/effects.ts` — `resolveEffect()` exhaustive switch confirmed. New cases can be added without breaking existing cases.
- `apps/web/src/ui/hud/HUD.tsx` — `stats.armor`, `stats.speedMultiplier`, `stats.hazardResistance` display confirmed. `react-icons/gi` already imported for stat icons.
- `apps/web/src/store/gameStore.ts` — `player: Player | null` confirmed. Stats accessible via `player.stats`. No new store slice needed.
- `package.json` — `react-icons ^5.5.0`, `@floating-ui/react ^0.27.18`, `immer ^11.1.4`, `zustand ^4.5.0` all confirmed installed. No new packages needed.

### MEDIUM Confidence (Pattern Reference)

- `packages/game-logic/src/movement/validation.ts` — `validateMovement()` pure function pattern is the reference for `baseStatsForLevel()` and `computeStats()`. Same constraints: no DB calls, no socket calls, returns typed result, importable by both server and client.
- `packages/database/src/migrations/migrate-equipment-schema.ts` — One-time migration script pattern for JSONB shape transformation. The stat migration script follows this exact pattern to remap old 5-stat keys to new 8-stat keys.
- `lore/world-bible.md` — Survival tier system (Tier I-IV biomes) confirms that `resilience` (hazard resistance) and `perception` (detection) are lore-aligned stat concepts. The biome descriptions reference "equipment requirements" and "specialized equipment" — confirming the stat-equipment linkage.

---

## Installation

No new packages needed.

```bash
# Nothing to install
# All capability is in the existing installed stack
```

---

*Stack research for: Character Stats System — Into the Void*
*Researched: 2026-02-18*
*Confidence: HIGH — All existing packages verified by direct file audit. All integration points verified in source files at specific line locations. Zero new package dependencies identified.*
