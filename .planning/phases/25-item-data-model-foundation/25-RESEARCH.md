# Phase 25: Item Data Model & Foundation - Research

**Researched:** 2026-02-17
**Domain:** TypeScript item registry pattern, Drizzle ORM JSONB migration, pure validation functions, NX workspace package creation
**Confidence:** HIGH

---

## Summary

Phase 25 is a pure foundation phase — no UI, no server handlers, no client state. It exists to establish the shared data layer that every subsequent phase (26-29) depends on. The deliverables are: a new `packages/items` workspace package with an `ItemRegistry` singleton and 100 lore-accurate `ItemDefinition` entries, a migrated `inventories.equipment` JSONB column reshaped from the old `head/chest/legs/feet` generic slots to the lore-mandated `{ exosuit, modules[], tool, accessory1, accessory2 }` model, a single atomic `updateInventoryFull` DB query that writes both `items` and `equipment` in one `UPDATE` call, and pure validation functions (`validateItemUse`, `validateEquip`, `resolveEffect`) added to `packages/game-logic`.

The codebase already has a nearly perfect template for the registry and package patterns: `packages/tiles` with `TileRegistry`, `TileDefinition`, and per-biome definition files. The items package mirrors this structure exactly. The database schema (`inventories` table with JSONB columns) already exists with working CRUD — the only changes are: (1) update the `EquipmentJson` interface type on the `equipment` JSONB column, and (2) replace `updateInventoryItems` + `updateEquipment` two-call pattern with a single `updateInventoryFull` function. Drizzle ORM `^0.30.0` supports transactions via `db.transaction(async (tx) => { ... })`.

The highest-risk items in this phase are: (a) the JSONB column shape change — existing `equipment` JSONB data in PostgreSQL that has `head`/`chest`/`legs`/`feet` keys will need a data migration or the existing columns will silently mismatch the new TypeScript types; (b) correctly defining the 100 items in a lore-consistent way that satisfies the 6 category / 5 rarity distribution requirements.

**Primary recommendation:** Create `packages/items` first (following the `packages/tiles` blueprint), then write the 100 item definitions, then migrate the DB schema and add `updateInventoryFull`, then add pure validation functions. Each step is independently verifiable via unit tests.

---

## Standard Stack

### Core (All Already Installed — No New Packages for This Phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.4.0 | Static types for ItemDefinition, ItemRegistry | Project-wide; strict mode enabled |
| Drizzle ORM | ^0.30.0 | JSONB column type, atomic `db.transaction()` | Already used for `inventories` table |
| `@nx/js` + esbuild | ^20.0.0 | Build new `packages/items` workspace package | Same executor as `packages/tiles` |
| Vitest (via `@nx/vite`) | already configured | Unit tests for registry lookups and validation functions | `game-logic` project.json already has `test` target |

### No New Packages Required for Phase 25

Phase 25 is purely server/shared — no UI, no drag-drop, no tooltip positioning. The frontend libraries (`@dnd-kit/*`, `@floating-ui/react`, `immer`) are deferred to Phase 27.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static `packages/items` package | PostgreSQL `item_definitions` table | DB table adds read latency on every item lookup; static definitions are authored game content that never varies per-player; `TileRegistry` pattern already validated for this use case |
| JSONB for equipment column | Separate `equipment` rows table | Separate rows allow indexed queries per slot but add join complexity; equipment read is always full-row (all slots needed together); JSONB is already in place and correct at current scale |
| In-process `ItemRegistry` Map | `lru-cache` for item definitions | `lru-cache` (already installed) adds TTL and size-bounded eviction — unnecessary for static data that never changes at runtime; plain `Map` is simpler and faster |

---

## Architecture Patterns

### Recommended Project Structure

```
packages/items/
├── src/
│   ├── types.ts              # ItemDefinition, ItemEffect, EquipmentSlotDef interfaces
│   ├── registry.ts           # ItemRegistry singleton (mirrors TileRegistry exactly)
│   ├── index.ts              # Public exports + auto-registration on module load
│   └── definitions/
│       ├── suits.ts          # 10 exo-suit variants (2 per rarity tier)
│       ├── modules.ts        # 30 suit modules (5 module types x 6 rarity variants)
│       ├── tools.ts          # 15 tools (3 specializations x 5 rarity variants)
│       ├── consumables.ts    # 20 consumables (health vials, energy cells, buffs)
│       ├── world-items.ts    # 15 world/ground items (minerals, organic, ancient)
│       ├── reagents.ts       # 10 crafting reagents (materials, compounds)
│       └── index.ts          # ALL_ITEMS array + ITEM_IDS constants
```

Total: 100 items distributed across 6 categories and 5 rarity tiers.

```
packages/game-logic/src/
├── inventory/                # NEW subdirectory
│   ├── validation.ts         # validateItemUse, validateEquip
│   └── effects.ts            # resolveEffect (discriminated union handler)
├── index.ts                  # MODIFY: export new inventory module
```

```
packages/database/src/
├── schema/
│   └── inventories.ts        # MODIFY: update EquipmentJson interface
├── queries/
│   └── inventory.ts          # MODIFY: add updateInventoryFull, keep existing fns
```

### Pattern 1: ItemRegistry Singleton (mirrors TileRegistry)

**What:** A single instance of a class wrapping a `Map<string, ItemDefinition>`, exported as a module-level constant. Definitions self-register on module import.

**When to use:** Static game data that is read-only at runtime, needed by both client (UI rendering) and server (validation), never varies per-player.

**Example:**
```typescript
// Source: packages/tiles/src/registry.ts (direct audit — mirrors this exactly)

const UNKNOWN_ITEM: ItemDefinition = {
  id: 'unknown',
  displayName: 'Unknown Item',
  description: 'Unknown item. This should not appear in normal gameplay.',
  category: 'misc',
  rarity: 'common',
  maxStack: 1,
  weight: 0,
  baseValue: 0,
  requiredLevel: 1,
  ilvl: 0,
  textureKey: 'item_unknown',
  color: 0xff00ff, // Magenta — obvious error color
};

class ItemRegistryImpl {
  private readonly items: Map<string, ItemDefinition> = new Map();

  register(item: ItemDefinition): void {
    if (this.items.has(item.id)) {
      console.warn(`Item ID "${item.id}" already registered, overwriting`);
    }
    this.items.set(item.id, item);
  }

  registerAll(items: readonly ItemDefinition[]): void {
    for (const item of items) {
      this.register(item);
    }
  }

  get(id: string): ItemDefinition {
    const item = this.items.get(id);
    if (!item) {
      console.warn(`Unknown item ID: "${id}", using fallback`);
      return UNKNOWN_ITEM;
    }
    return item;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  getAllIds(): string[] {
    return Array.from(this.items.keys());
  }

  getByCategory(category: ItemCategory): ItemDefinition[] {
    return Array.from(this.items.values()).filter(i => i.category === category);
  }

  getByRarity(rarity: ItemRarity): ItemDefinition[] {
    return Array.from(this.items.values()).filter(i => i.rarity === rarity);
  }

  get size(): number {
    return this.items.size;
  }
}

export const ItemRegistry = new ItemRegistryImpl();
```

### Pattern 2: Auto-Registration on Module Import

**What:** The `index.ts` registers all items at module load time, so any consumer just `import '@into-the-void/items'` and the registry is populated.

**When to use:** Always — matches the `packages/tiles` pattern exactly.

**Example:**
```typescript
// Source: packages/tiles/src/index.ts (direct audit — mirrors this pattern)

// index.ts
export type { ItemDefinition, ItemEffect, ItemEffectDef } from './types';
export { ItemRegistry } from './registry';
export { ALL_ITEMS, ITEM_IDS } from './definitions';
export * from './definitions';

// Register all items on module load
import { ItemRegistry } from './registry';
import { ALL_ITEMS } from './definitions';
ItemRegistry.registerAll(ALL_ITEMS);
```

### Pattern 3: ItemDefinition Interface (extends existing ItemDef)

**What:** A richer interface than the existing `ItemDef` in `shared-types/inventory.ts`, adding `ilvl`, `color` (fallback hex), and `effects`.

**Example:**
```typescript
// packages/items/src/types.ts

export type ItemCategory = 'suit' | 'module' | 'tool' | 'consumable' | 'world-item' | 'reagent';

export type ItemRarity = 'common' | 'rare' | 'epic' | 'exotic' | 'legendary';

// NOTE: The existing shared-types ItemRarity includes 'uncommon'. The lore specifies
// 5 tiers: Common, Rare, Epic, Exotic, Legendary. 'uncommon' is absent. The ItemRegistry
// uses the lore-correct 5-tier version. The existing shared-types type needs updating.

export type EquipSlot = 'exosuit' | 'module' | 'tool' | 'accessory1' | 'accessory2';

export interface ItemEffectDef {
  trigger: 'on_use' | 'on_equip' | 'passive';
  effect: ItemEffect;
}

export type ItemEffect =
  | { type: 'heal'; amount: number }
  | { type: 'energy_restore'; amount: number }
  | { type: 'stat_buff'; stat: string; amount: number; duration: number }
  | { type: 'suit_repair'; amount: number }
  | { type: 'armor'; value: number }
  | { type: 'speed'; multiplier: number }
  | { type: 'life_support'; hazardResistance: number }
  | { type: 'sensor'; detectionRange: number }
  | { type: 'power_core'; energyCapacity: number; rechargeRate: number }
  | { type: 'mobility'; jumpHeight: number };

export interface ItemDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly category: ItemCategory;
  readonly rarity: ItemRarity;
  readonly maxStack: number;
  readonly weight: number;
  readonly baseValue: number;
  readonly requiredLevel: number;
  readonly ilvl: number;                  // item power level — required by ITEM-04
  readonly textureKey: string;            // sprite key; 'item_unknown' as fallback
  readonly color: number;                 // fallback hex until sprite exists (e.g., 0x4a90d9)
  readonly equipSlot?: EquipSlot;         // present if equippable
  readonly moduleSlots?: number;          // suits only: how many modules it accepts
  readonly toolType?: 'mining' | 'combat' | 'research';
  readonly effects?: ItemEffectDef[];
}
```

### Pattern 4: Atomic DB Write with Single UPDATE

**What:** `updateInventoryFull` writes both `items` and `equipment` JSONB columns in one SQL `UPDATE` statement, eliminating the race window between two sequential awaits.

**When to use:** Whenever both inventory items and equipment change together (equip, unequip, pickup-and-equip).

**Example:**
```typescript
// packages/database/src/queries/inventory.ts

/**
 * Atomically update both items and equipment in a single DB write.
 * Use this for ALL operations that modify both columns — never call
 * updateInventoryItems + updateEquipment as separate awaited operations.
 *
 * Source: Drizzle ORM docs — db.update() with multiple .set() fields
 * is a single SQL UPDATE statement (verified: drizzle-orm ^0.30.0).
 */
export async function updateInventoryFull(
  db: DbClient,
  characterId: string,
  data: { items: InventoryItemJson[]; equipment: EquipmentJson }
): Promise<void> {
  await db
    .update(inventories)
    .set({ items: data.items, equipment: data.equipment })
    .where(eq(inventories.characterId, characterId));
}
```

**Why a single `.set({ items, equipment })` is atomic:** Drizzle generates one SQL `UPDATE inventories SET items = $1, equipment = $2 WHERE character_id = $3`. PostgreSQL executes this as a single statement — partial updates are impossible. No explicit `db.transaction()` needed for this specific case (though transactions are still required for operations that span multiple tables or require read-then-write consistency).

### Pattern 5: Pure Validation Functions in game-logic

**What:** Functions that take values, return pass/fail with reason, have no side effects, no DB calls, no network calls. Same pattern as `validateMovement`.

**Example:**
```typescript
// packages/game-logic/src/inventory/validation.ts

import type { ItemDefinition } from '@into-the-void/items';

export interface ValidateEquipResult {
  valid: boolean;
  reason?: string;
}

/**
 * Pure validation — can this player equip this item?
 * No DB calls. No side effects. Mirrors validateMovement pattern.
 */
export function validateEquip(
  item: ItemDefinition,
  playerLevel: number,
  currentModuleCount: number,
  suitModuleSlots: number
): ValidateEquipResult {
  if (playerLevel < item.requiredLevel) {
    return { valid: false, reason: `Requires level ${item.requiredLevel}` };
  }
  if (item.category === 'module' && currentModuleCount >= suitModuleSlots) {
    return { valid: false, reason: 'All module slots occupied' };
  }
  return { valid: true };
}

/**
 * Pure validation — can this player use this item from inventory?
 */
export function validateItemUse(
  item: ItemDefinition,
  playerLevel: number
): ValidateEquipResult {
  if (item.category !== 'consumable') {
    return { valid: false, reason: 'Item is not consumable' };
  }
  if (playerLevel < item.requiredLevel) {
    return { valid: false, reason: `Requires level ${item.requiredLevel}` };
  }
  return { valid: true };
}
```

```typescript
// packages/game-logic/src/inventory/effects.ts

import type { ItemEffect } from '@into-the-void/items';

export interface EffectResult {
  type: string;
  applied: Record<string, number>;
}

/**
 * Resolve an ItemEffect to concrete stat changes.
 * Returns what changed — caller applies the changes.
 * No side effects.
 */
export function resolveEffect(effect: ItemEffect): EffectResult {
  switch (effect.type) {
    case 'heal':
      return { type: 'heal', applied: { health: effect.amount } };
    case 'energy_restore':
      return { type: 'energy_restore', applied: { energy: effect.amount } };
    case 'suit_repair':
      return { type: 'suit_repair', applied: { suitDurability: effect.amount } };
    case 'stat_buff':
      return { type: 'stat_buff', applied: { [effect.stat]: effect.amount } };
    default:
      return { type: 'unknown', applied: {} };
  }
}
```

### Pattern 6: New NX Workspace Package Creation

**What:** Creating `packages/items` requires a `package.json`, `project.json` (NX config), and `tsconfig.lib.json`. These must follow the exact structure of `packages/tiles`.

**Example (package.json for packages/items):**
```json
{
  "name": "@into-the-void/items",
  "version": "0.0.1",
  "type": "commonjs",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@into-the-void/shared-types": "workspace:*"
  }
}
```

**Example (project.json for packages/items):**
```json
{
  "name": "items",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/items/src",
  "projectType": "library",
  "tags": ["scope:shared"],
  "targets": {
    "build": {
      "executor": "@nx/esbuild:esbuild",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/packages/items",
        "main": "packages/items/src/index.ts",
        "tsConfig": "packages/items/tsconfig.lib.json",
        "assets": [],
        "generatePackageJson": true,
        "format": ["cjs", "esm"]
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "options": {
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["packages/items/**/*.ts"]
      }
    }
  }
}
```

The `tsconfig.base.json` path aliases must also be updated to include:
```json
"@into-the-void/items": ["packages/items/src/index.ts"]
```

### Anti-Patterns to Avoid

- **Defining items in `shared-types/entity-registry.ts`:** `EntityRegistry.items` already has 4 stub entries (`health_vial`, `energy_cell`, `void_essence`, `ancient_key`). These must be MIGRATED to `ItemRegistry` and removed from `EntityRegistry`. Leaving them in both places creates divergence. `EntityRegistry` continues to own `creatures` and `minerals`.

- **Using `updateInventoryItems` + `updateEquipment` as separate awaits:** The existing two-function pattern is a duplication exploit vector. All code calling both must be replaced by `updateInventoryFull`. The two individual functions can remain for the rare case where only one column changes (e.g., moving items within inventory without equipment change), but equip/unequip MUST use the atomic version.

- **Setting `ItemRarity = 'uncommon'`:** The existing `shared-types/inventory.ts` has `'uncommon'` in the rarity union. The lore specifies 5 tiers: Common, Rare, Epic, Exotic, Legendary. There is no `uncommon`. The `ItemDefinition` in `packages/items` uses the 5-tier lore model. `shared-types/inventory.ts` should be updated to match, or `ItemRarity` should be imported from `@into-the-void/items` rather than `shared-types`.

- **Storing item definitions in PostgreSQL:** Item definitions are authored static content, not player-generated data. A PostgreSQL table adds read latency, requires migrations on every balance change, and gains nothing. Static package is correct.

- **Making `ItemDefinition` require an `ilvl` integer literal for every item:** Use a computed helper `computeIlvl(tier: 1 | 2 | 3 | 4, rarity: ItemRarity): number` that applies the rarity multiplier (1.0/1.2/1.5/1.8/2.2), so definition authors write `ilvl: computeIlvl(2, 'rare')` not a raw number. This ensures ilvl is always consistent.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic DB update of two JSONB columns | Two sequential `await db.update(...)` calls | Single `db.update().set({ items, equipment })` | PostgreSQL `UPDATE` with multiple columns is inherently atomic; two awaits have a crash window between them |
| Package tsconfig, project.json, package.json boilerplate | Hand-write new files | Copy from `packages/tiles` and rename | All config is identical; only names change |
| Item ID constants | Hardcode string literals everywhere | `ITEM_IDS` constant object exported from `packages/items` | Same pattern as `TILE_IDS` in `packages/tiles`; prevents typos |
| ilvl calculation per item | Manual number per definition | `computeIlvl(tier, rarity)` helper | Ensures consistent math; tier 3 Exotic is always `3 * 1.8 = 5.4` |

**Key insight:** This phase is infrastructure — the work is typing and organizing 100 definitions, not solving algorithmic problems. Every custom solution is a liability. Mirror `packages/tiles` exactly.

---

## Common Pitfalls

### Pitfall 1: Non-Atomic Equipment Update Enables Item Duplication

**What goes wrong:** Two sequential DB writes for equip operations (`updateInventoryItems` then `updateEquipment`) have a crash window between them. If the server dies after write 1 but before write 2, the item exists in both `items` and `equipment` simultaneously. On reconnect, the player has the item twice.

**Why it happens:** Node.js `await` yields between writes. The event loop does not protect against this. This is documented as the exact exploit that shipped in Arc Raiders (February 2026).

**How to avoid:** `updateInventoryFull` is the ONLY function called when both columns change. Never call `updateInventoryItems` + `updateEquipment` sequentially for equip operations.

**Warning signs:** After a server restart, a character has the same item in both `inventory.items` and `inventory.equipment`. SQL check: `SELECT character_id, items, equipment FROM inventories WHERE character_id = $1` — item should appear in exactly one column.

### Pitfall 2: JSONB Shape Change Silently Mismatches Existing Data

**What goes wrong:** TypeScript types change (`EquipmentJson` interface), but PostgreSQL JSONB columns contain old-shape data (`{ "head": {...}, "chest": {...} }`). TypeScript compilation passes — JSONB is opaque to the compiler. At runtime, `inventory.equipment.exosuit` is `undefined` even though the DB row exists.

**Why it happens:** Drizzle's `.$type<T>()` is a TypeScript type assertion, not a runtime validator. Existing JSONB data is not automatically transformed when you update the TypeScript interface.

**How to avoid:** Write a one-time data migration script that reads all rows with `equipment` having `head`/`chest`/`legs`/`feet` keys and rewrites them to `{ exosuit: null, modules: [], tool: null, accessory1: null, accessory2: null }`. Run via `pnpm db:migrate` or as a Drizzle migration SQL file. Verify by querying a sample character row after migration.

**Warning signs:** `inventory.equipment.exosuit === undefined` in server-side logs when `getInventory` is called after the TypeScript change.

### Pitfall 3: Missing `@into-the-void/items` Path Alias Breaks Imports

**What goes wrong:** `game-logic` imports from `@into-the-void/items` but `tsconfig.base.json` has no path alias for it. TypeScript compilation fails with `Cannot find module '@into-the-void/items'`.

**Why it happens:** New workspace packages require manual path alias addition to `tsconfig.base.json`. NX does not add this automatically when you create a package manually.

**How to avoid:** After creating `packages/items/`, immediately add `"@into-the-void/items": ["packages/items/src/index.ts"]` to `tsconfig.base.json` paths. Verify: `nx run game-logic:build` succeeds.

**Warning signs:** TypeScript errors about missing module in any package that imports `@into-the-void/items`.

### Pitfall 4: 100 Items Without 6-Category / 5-Rarity Distribution Test

**What goes wrong:** Item definitions are written but the distribution is skewed — 60 consumables and 5 suits. Unit tests don't verify distribution. Phase 26+ code assumes a certain number of suits and modules exist for equipment operations.

**Why it happens:** Easy to write many similar items in one category. Distribution requires deliberate planning.

**How to avoid:** The unit test for Phase 25 success criterion 2 must explicitly assert: `suits: count >= 5`, `modules: count >= 6` (one per module type), `tools: count >= 3`, `consumables: count >= 10`, `world-items: count >= 5`, `reagents: count >= 5`. Also assert each rarity tier has at least 1 item. Write these tests FIRST, then write definitions to satisfy them.

### Pitfall 5: Lore Rarity Mismatch

**What goes wrong:** Items defined with `rarity: 'uncommon'` (from existing `shared-types` type) instead of the lore-correct 5 tiers. The REQUIREMENTS specify: Common, Rare, Epic, Exotic, Legendary. There is no `Uncommon` tier.

**Why it happens:** The existing `ItemRarity` type in `shared-types/inventory.ts` includes `'uncommon'`. If `ItemDefinition` reuses that type, developers reach for `'uncommon'` as a natural mid-tier.

**How to avoid:** `ItemDefinition.rarity` uses a locally-defined `ItemRarity` type in `packages/items/src/types.ts` that excludes `'uncommon'`. The 5 valid values are: `'common' | 'rare' | 'epic' | 'exotic' | 'legendary'`. Update `shared-types/inventory.ts` to match or simply shadow the type.

---

## Code Examples

### Item Definition (Suit)

```typescript
// packages/items/src/definitions/suits.ts
import { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

export const BASIC_EXOSUIT: ItemDefinition = {
  id: 'suit_basic_common',
  displayName: 'Basic Exo-Suit',
  description: 'Standard-issue survival suit. Provides minimal environmental protection and 3 module slots.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 8.0,
  baseValue: 500,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'), // => 10
  textureKey: 'item_suit_basic',
  color: 0x666666, // Gray — common rarity color
  equipSlot: 'exosuit',
  moduleSlots: 3, // Common suits: 3 module slots
  effects: [],
};
```

### Item Definition (Module)

```typescript
// packages/items/src/definitions/modules.ts
export const ARMOR_MODULE_COMMON: ItemDefinition = {
  id: 'module_armor_common',
  displayName: 'Armor Module Mk.I',
  description: 'Basic armor plating that increases suit durability.',
  category: 'module',
  rarity: 'common',
  maxStack: 1,
  weight: 1.2,
  baseValue: 200,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_module_armor',
  color: 0x888888,
  equipSlot: 'module',
  effects: [{
    trigger: 'on_equip',
    effect: { type: 'armor', value: 10 },
  }],
};
```

### Item Definition (Consumable)

```typescript
// packages/items/src/definitions/consumables.ts
export const HEALTH_VIAL_COMMON: ItemDefinition = {
  id: 'health_vial_common',
  displayName: 'Health Vial',
  description: 'Injects a rapid-acting biofix compound. Restores 50 health.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 20,
  weight: 0.2,
  baseValue: 50,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_health_vial',
  color: 0x44cc44,
  effects: [{
    trigger: 'on_use',
    effect: { type: 'heal', amount: 50 },
  }],
};
```

### Updated EquipmentJson Schema (Database)

```typescript
// packages/database/src/schema/inventories.ts — AFTER migration

interface EquipmentJson {
  exosuit?: InventoryItemJson;
  modules: InventoryItemJson[];    // max count = suit.moduleSlots
  tool?: InventoryItemJson;
  accessory1?: InventoryItemJson;
  accessory2?: InventoryItemJson;
}

// Default value changes from {} to:
const DEFAULT_EQUIPMENT: EquipmentJson = {
  modules: [],
};

export const inventories = pgTable('inventories', {
  characterId: uuid('character_id')
    .primaryKey()
    .references(() => characters.id, { onDelete: 'cascade' }),
  items: jsonb('items').$type<InventoryItemJson[]>().notNull().default([]),
  maxSlots: integer('max_slots').notNull().default(20),
  equipment: jsonb('equipment')
    .$type<EquipmentJson>()
    .notNull()
    .default({ modules: [] }),  // Updated default
});
```

### Atomic DB Write

```typescript
// packages/database/src/queries/inventory.ts — NEW function

export async function updateInventoryFull(
  db: DbClient,
  characterId: string,
  data: { items: Inventory['items']; equipment: Inventory['equipment'] }
): Promise<void> {
  await db
    .update(inventories)
    .set({ items: data.items, equipment: data.equipment })
    .where(eq(inventories.characterId, characterId));
}
```

### JSONB Migration Script

```typescript
// One-time migration: rewrite old equipment shape to new shape
// Run before any server code uses the new EquipmentJson shape.

const rows = await db.select().from(inventories);
for (const row of rows) {
  const oldEquipment = row.equipment as Record<string, unknown>;
  // If this row has the old shape (has 'head', 'chest', etc.)
  if ('head' in oldEquipment || 'chest' in oldEquipment) {
    await db
      .update(inventories)
      .set({ equipment: { modules: [] } }) // Reset to new default
      .where(eq(inventories.characterId, row.characterId));
  }
}
```

### ILvl Computation Helper

```typescript
// packages/items/src/utils.ts

const RARITY_MULTIPLIERS: Record<string, number> = {
  common:    1.0,
  rare:      1.2,
  epic:      1.5,
  exotic:    1.8,
  legendary: 2.2,
};

const BASE_ILVL_PER_TIER = 10;

/**
 * Compute item level from tier (1-4) and rarity.
 * Tier 1 Common = 10, Tier 1 Legendary = 22, Tier 4 Legendary = 88.
 */
export function computeIlvl(tier: 1 | 2 | 3 | 4, rarity: string): number {
  const base = tier * BASE_ILVL_PER_TIER;
  const multiplier = RARITY_MULTIPLIERS[rarity] ?? 1.0;
  return Math.round(base * multiplier);
}
```

---

## Item Distribution Plan (100 Items)

This distribution satisfies the 6-category, 5-rarity requirements with lore accuracy:

| Category | Count | Breakdown |
|----------|-------|-----------|
| Suits (`suit`) | 10 | 2 per rarity (Common, Rare, Epic, Exotic, Legendary) |
| Modules (`module`) | 30 | 6 module types × 5 rarity tiers |
| Tools (`tool`) | 15 | 3 specializations × 5 rarity tiers |
| Consumables (`consumable`) | 20 | Health vials, energy cells, buffs, suit repair kits — 4-5 variants each |
| World Items (`world-item`) | 15 | Minerals from biomes, alien flora fragments, ancient fragments |
| Reagents (`reagent`) | 10 | Crafting components: void essence, crystalline dust, fungal extract, etc. |

**Total: 100**

Module types (6): Armor, Speed, Life Support, Sensor Array, Power Core, Mobility (sourced from EQUIP-03 through EQUIP-08).

Tool specializations (3): Mining, Combat, Research.

Exo-suit module slots by rarity: Common=3, Rare=4, Epic=4, Exotic=5, Legendary=6 (requirement states Common=3, Legendary=6; interpolation for middle tiers).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `head/chest/legs/feet` generic armor slots | `exosuit/modules[]/tool/accessory1/accessory2` | Phase 25 migration | Enables lore-accurate exo-suit model; modules array replaces N fixed slots |
| `updateInventoryItems` + `updateEquipment` two calls | `updateInventoryFull` single call | Phase 25 | Eliminates duplication exploit window |
| `EntityRegistry.items` (4 stubs in shared-types) | `ItemRegistry` in `packages/items` (100 definitions) | Phase 25 | Single authoritative source; server and client import same definitions |
| `ItemRarity` includes `'uncommon'` | `ItemRarity` is `common/rare/epic/exotic/legendary` (5 tiers) | Phase 25 | Matches lore exactly |
| `ItemCategory` = `weapon/armor/tool/consumable/material/quest/misc` | `suit/module/tool/consumable/world-item/reagent` | Phase 25 | Matches lore-mandated 6 categories |

**Deprecated/outdated:**
- `EquipmentSlot` type with `head/chest/legs/feet/hands/mainHand/offHand` — these slots don't map to the exo-suit equipment model. The type in `shared-types/inventory.ts` must be updated to `exosuit | module | tool | accessory1 | accessory2`.
- `EntityRegistry.items` in `shared-types/game/entity-registry.ts` — 4 stub entries (`health_vial`, `energy_cell`, `void_essence`, `ancient_key`) must migrate to `ItemRegistry`. After migration, `EntityRegistry.items` should be removed or left as an empty deprecated object.

---

## Open Questions

1. **Should `packages/items` depend on `@into-the-void/shared-types` or define all its own types?**
   - What we know: `packages/tiles` depends on `@into-the-void/shared-types` for the `Entity` type in hooks. `shared-types` has a conflicting `ItemRarity` and `ItemCategory` that won't match the lore model.
   - What's unclear: Whether to update `shared-types` to match items or let `packages/items` define its own canonical types.
   - Recommendation: Define `ItemCategory`, `ItemRarity`, `ItemDefinition`, and `ItemEffect` entirely in `packages/items`. Update `shared-types/inventory.ts` to import from `@into-the-void/items` rather than duplicate. This keeps `shared-types` as network contract types only, which is its stated purpose.

2. **Does the JSONB schema change require a Drizzle migration file or can it be a raw SQL update?**
   - What we know: Drizzle's `db:push` is for dev-only direct schema push; `db:migrate` runs migration files from `drizzle-kit generate`. JSONB column shape changes are NOT reflected in Drizzle migration files (JSONB is opaque to Drizzle's schema differ). Only the TypeScript `.$type<T>()` annotation changes.
   - What's unclear: Whether any existing dev data has the old `head/chest/legs/feet` shape in the `equipment` column.
   - Recommendation: Write a TypeScript migration script (run once) that reads all rows and rewrites `equipment` to new default shape. This is safe to run idempotently. Include as a Drizzle migration's accompanying data-migration step.

3. **Exact module slot counts for middle rarity tiers?**
   - What we know: Requirements state Common=3, Legendary=6. The lore mentions "module slot count scales with suit rarity."
   - What's unclear: Rare=? Epic=? Exotic=?
   - Recommendation: Use Common=3, Rare=4, Epic=4, Exotic=5, Legendary=6. This creates distinct progression between Common→Rare (critical early upgrade) and Exotic→Legendary (late-game pinnacle), with Epic at parity with Rare to create a "same slot count but better stats" progression step.

---

## Sources

### Primary (HIGH confidence — direct codebase audit)

- `packages/tiles/src/registry.ts` — TileRegistry singleton pattern; `ItemRegistry` mirrors this exactly
- `packages/tiles/src/types.ts` — TileDefinition interface; `ItemDefinition` extends this pattern
- `packages/tiles/src/index.ts` — auto-registration pattern; `packages/items/src/index.ts` uses same
- `packages/tiles/project.json` — NX project config; `packages/items/project.json` copies this
- `packages/tiles/package.json` — workspace package config; `packages/items/package.json` copies this
- `packages/database/src/schema/inventories.ts` — current `EquipmentJson` with `head/chest/legs/feet` shape; migration target identified
- `packages/database/src/queries/inventory.ts` — existing `updateInventoryItems` + `updateEquipment` two-call pattern; `updateInventoryFull` replaces this
- `packages/database/src/client.ts` — `DbClient` type; used by new query function
- `packages/shared-types/src/game/inventory.ts` — existing `ItemDef`, `EquipmentSlot`, `ItemRarity`, `ItemCategory`; conflicts with lore model documented
- `packages/shared-types/src/game/entity-registry.ts` — 4 stub items (`health_vial`, `energy_cell`, `void_essence`, `ancient_key`); migration source
- `packages/game-logic/src/movement/validation.ts` — `validateMovement` function pattern; `validateEquip` and `validateItemUse` mirror this pattern
- `packages/game-logic/src/index.ts` — current exports; new inventory module export added here
- `tsconfig.base.json` — current path aliases; `@into-the-void/items` must be added
- `lore/world-bible.md` — biome names, faction identities, resource types; used to name items accurately
- `.planning/REQUIREMENTS.md` — ITEM-01 through ITEM-06, DB-01 through DB-04; all verified against codebase
- `.planning/research/ARCHITECTURE.md` — v1.6 inventory architecture research (2026-02-17); high confidence
- `.planning/research/STACK.md` — v1.6 stack research (2026-02-17); confirmed no new packages for Phase 25
- `.planning/research/PITFALLS.md` — Part 3: Inventory pitfalls; non-atomic write and JSONB mismatch pitfalls documented

### Secondary (MEDIUM confidence)

- Drizzle ORM `^0.30.0` docs — single `.set({ col1, col2 })` generates one SQL `UPDATE` with multiple SET columns; verified via Drizzle behavior known from training (LOW→MEDIUM because version 0.30 is within training window)
- NX 20 workspace library creation — `project.json` structure with `@nx/esbuild:esbuild` executor is verified against existing `packages/tiles/project.json` in the codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in installed `package.json`; no new packages needed for this phase
- Architecture: HIGH — direct codebase audit; `packages/tiles` blueprint verified in full; DB schema verified in full
- Item distribution (100 items): HIGH for structure, MEDIUM for exact item names — structure derives from requirements; names derive from lore bible (verified); exact 100-item list requires creative authoring not pure research
- Pitfalls: HIGH — atomic write pitfall sourced from prior research + Arc Raiders Feb 2026 reference; JSONB mismatch pitfall derives from Drizzle behavior (MEDIUM)

**Research date:** 2026-02-17
**Valid until:** 2026-03-19 (30 days — stable domain; Drizzle ORM and NX versions are locked in package.json)
