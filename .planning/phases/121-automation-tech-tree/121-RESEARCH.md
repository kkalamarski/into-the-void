# Phase 121: Automation Tech Tree - Research

**Researched:** 2026-03-05
**Domain:** Automation structures, passive resource gathering, economy balancing, HUD panels
**Confidence:** HIGH

## Summary

Phase 121 adds deployable automation structures (T2 extractors through T5 refineries) that passively gather and transmute resources. The existing codebase provides strong foundations: `DeployableEntity` type already exists in shared-types (Phase 115), the `structures` DB schema provides a pattern for persistence, `HazardService` demonstrates the tick-based processing pattern, and the HUD/panel system is well-established with Zustand stores and draggable panels.

The key challenge is designing the `AutomationService` with a 60-second global tick that accumulates resources in-memory and flushes to DB every 5 minutes. This service must be completely independent of the per-zone AI tick loop (which runs at 1s intervals) since automation structures operate regardless of whether players are in the same zone. A mandatory balance sheet artifact (AUTO-06) must be completed before any automation code.

**Primary recommendation:** Start with the balance sheet design artifact and fuel item definitions (wave 1), then build the database schema and AutomationService (wave 2), then client events and loot window (wave 3), and finally the automation panel HUD (wave 4).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Deployment initiated from the automation panel HUD — click "Deploy new structure" button
- Panel triggers a placement mode: valid resource nodes highlight in the world, player clicks one to place
- ESC cancels placement mode (RTS-style building placement)
- Confirmation dialog before finalizing — shows structure name, maintenance cost, expected yield
- Deployed structures appear as visible sprite entities on the resource node tile
- Clicking a deployed structure in the world opens a Minecraft-furnace-style loot window
- Loot window shows: accumulated resources (take them), fuel slots (deposit fuel), structure status
- World-click is the only way to collect — the automation panel is view-only
- Manual refuel via loot window — player visits the structure and deposits crafted fuel consumables in-person
- Player must physically travel to their structures to collect and maintain them
- Tab per tier in automation panel: Extractors, Beacons, Planetary Extractors, Refineries
- Panel is view-only for resources — no remote collect or refuel buttons
- Panel is the deployment origin — "Deploy" button lives here and triggers placement mode
- When fuel runs out, structure stops silently — no notification, sprite changes to inactive/depleted state
- Expired/degraded structures remain as husks — can be repaired and refueled in-place, or dismantled for partial materials
- Structures are NOT destroyed on expiry — they persist until manually removed or attacked
- Deployed structures are visible to all players as world entities
- Other players can loot accumulated resources from your structures (steal output)
- Other players can attack and destroy your structures (full PvP automation conflict)
- Structures show owner name when inspected
- Maintenance cost is crafted consumable items (fuel cells, power cores, etc.) — NOT credits
- Fuel crafting loop: gather resources -> craft fuel items -> deposit in structures -> receive different resources
- Maintenance cost >= 60% of hourly output value per tier
- Balance sheet artifact required before any automation code is written
- T5 Refinery: 10 common -> 1 rare (30 min), 5 rare -> 1 epic (2 hr), cross-biome transmutation (10:1, 1 hr)

### Claude's Discretion
- Cross-biome transmutation cost ratios (must maintain >= 60% maintenance rule)
- Specific fuel item definitions and crafting recipes per tier
- Exact placement mode visual indicators (highlighting, ghost preview, etc.)
- Loot window layout and interaction details
- Structure health points and PvP damage calculations
- Husk repair costs and material recovery rates on dismantle

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTO-01 | Deployable extractor items (T2, L10-20), 1 resource/60s for 5 min, limit 2/player | DeployableEntity type exists; new `deployables` DB table; AutomationService tick at 60s |
| AUTO-02 | Survey beacon items (T3, L20-30), marks zone for passive cache, 1 limit, 24hr degradation | Same DeployableEntity pattern; degradation tracked via `expiresAt` + `durability` |
| AUTO-03 | Planetary extractor (T4, L30-40), 3-5 resources/hr passive, 3/player, 10%/day degradation | Permanent deployable; degradation processed in AutomationService tick |
| AUTO-04 | Resource refinery (T5, L40+), transmutation recipes (10 common -> 1 rare, etc.) | Refinery as special deployable type; recipe registry; time-based processing |
| AUTO-05 | Recurring maintenance costs >= 60% of hourly output value | Fuel consumable items consumed per tick; balance sheet enforces ratio |
| AUTO-06 | Income/sink balance sheet documented as design artifact before code | First deliverable — must be completed and committed before Plan 02+ |
| AUTO-07 | Deployable persistence in database (new deployables table) | New Drizzle schema `deployables` table; pattern from `structures` schema |
| AUTO-08 | AutomationService with 60s global tick, in-memory accumulation, 5-min DB flush | HazardService pattern for Map-based state; separate setInterval for 60s tick |
| AUTO-09 | Automation panel in client HUD for deploying, collecting, and refueling | New AutomationPanel component; new automationStore; socket events |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | existing | AutomationService, gateway events | Already used for all game services |
| Drizzle ORM | existing | deployables table schema + queries | Already used for all DB schemas |
| Socket.IO | existing | automation events (deploy, collect, refuel) | Already used for all client-server communication |
| React + Zustand | existing | AutomationPanel + automationStore | Already used for all HUD panels |
| @into-the-void/shared-types | existing | DeployableEntity, automation event types | Type contracts already established |
| @into-the-void/items | existing | Fuel item definitions, deployable item definitions | Item registry pattern established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-icons/gi | existing | Automation panel icons | Panel UI icons (same as HUD) |
| @dnd-kit | existing | Drag fuel items to fuel slot | Already used in inventory panel |

## Architecture Patterns

### Recommended File Structure
```
packages/database/src/schema/deployables.ts    # New Drizzle schema
packages/database/src/queries/deployables.ts    # CRUD queries
packages/shared-types/src/game/automation.ts    # Automation types/events
packages/items/src/definitions/fuel-items.ts    # Fuel consumable definitions
packages/items/src/definitions/deployable-items.ts # Deployable structure items
packages/game-logic/src/automation/            # Balance validation, recipe registry
apps/game-server/src/game/automation.service.ts # AutomationService (60s tick)
apps/web/src/ui/panels/AutomationPanel.tsx     # HUD panel
apps/web/src/ui/panels/AutomationPanel.css     # Panel styles
apps/web/src/ui/panels/LootWindow.tsx          # Minecraft-furnace loot window
apps/web/src/ui/panels/LootWindow.css          # Loot window styles
apps/web/src/store/automationStore.ts          # Zustand store
```

### Pattern 1: AutomationService Tick (follows HazardService pattern)
**What:** A 60-second global tick processes all deployed structures in-memory, accumulating resources and consuming fuel. DB flush every 5 minutes.
**When to use:** For the core automation loop.
**Example:**
```typescript
@Injectable()
export class AutomationService implements OnModuleInit {
  // In-memory state for all active deployables
  private deployables: Map<string, DeployableState> = new Map();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  onModuleInit() {
    // Load all active deployables from DB on startup
    this.loadActiveDeployables();
    // Start 60s tick
    this.tickInterval = setInterval(() => this.processTick(), 60_000);
    // Start 5-min DB flush
    this.flushInterval = setInterval(() => this.flushToDB(), 5 * 60_000);
  }

  private processTick(): void {
    const now = Date.now();
    for (const [id, state] of this.deployables) {
      if (state.fuelRemaining <= 0) continue; // Depleted
      if (state.durability <= 0) continue; // Destroyed

      // Consume fuel
      state.fuelRemaining -= state.fuelConsumptionPerTick;

      // Accumulate resources
      state.accumulatedResources.push(...state.outputPerTick);

      // Apply degradation
      if (state.degradationRate > 0) {
        state.durability -= state.degradationRate;
      }
    }
  }
}
```

### Pattern 2: Deployable as World Entity (follows Structure entity pattern)
**What:** Deployed automation structures appear as `DeployableEntity` in the zone entity list, visible to all players.
**When to use:** When a player deploys a structure.
**Example:**
```typescript
// Deploy creates both a DB record and a zone entity
const deployable: DeployableEntity = {
  id: `deployable_${crypto.randomUUID()}`,
  type: 'deployable',
  name: definition.displayName,
  position: targetPosition,
  active: true,
  deployableType: definition.deployableType,
  ownerId: playerId,
  durability: definition.maxDurability,
  maxDurability: definition.maxDurability,
  deployedAt: Date.now(),
  expiresAt: definition.expiresAfterMs ? Date.now() + definition.expiresAfterMs : null,
};

// Spawn in zone for visibility
await this.zonesService.spawnEntity(zoneId, deployable);
// Persist to deployables table
await this.persistDeployable(deployable);
```

### Pattern 3: Loot Window (new interaction pattern)
**What:** Clicking a deployable entity opens a furnace-style loot window showing accumulated output, fuel slots, and structure status.
**When to use:** Player interacts with a deployed structure.
**Example:**
```typescript
// Client event
'automation:interact': { entityId: string }

// Server response
'automation:loot_window': {
  deployableId: string;
  deployableType: string;
  ownerName: string;
  isOwner: boolean;
  status: 'active' | 'depleted' | 'husk';
  fuelLevel: number;
  maxFuel: number;
  accumulatedResources: { itemId: string; quantity: number }[];
  // Refinery-specific
  activeRecipe?: { inputItemId: string; outputItemId: string; progressPercent: number };
}
```

### Anti-Patterns to Avoid
- **Async calls in tick loop:** The 60s automation tick MUST stay synchronous for in-memory state. DB flushes happen on a separate interval.
- **Per-zone automation processing:** Automation is global, not per-zone. Don't hook into AiService's runZoneTick.
- **Remote collection:** Users locked the decision that collection requires physical travel. No remote collect buttons in the panel.
- **Credit-based maintenance:** Users locked maintenance as crafted fuel items, NOT credits.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Item definitions | Custom item format | ItemDefinition from @into-the-void/items | Registry pattern with validation, textures, effects already established |
| DB schema | Raw SQL | Drizzle ORM pgTable | Matches all existing schemas (structures.ts pattern) |
| Entity spawning | Custom spawn logic | ZonesService.spawnEntity() | Entity lifecycle already managed (spawn/despawn/update) |
| Socket events | Custom WebSocket | Socket.IO via GameGateway @SubscribeMessage | All events go through typed ClientEvents/ServerEvents |
| Inventory operations | Direct DB writes | InventoryService.addItem/removeItem | Handles stacking, slot management, DB persistence |

## Common Pitfalls

### Pitfall 1: Tick Budget Overflow
**What goes wrong:** AutomationService tick processes too many deployables and blocks the event loop.
**Why it happens:** Iterating thousands of deployables with complex calculations in a single tick.
**How to avoid:** Keep tick processing O(n) with simple arithmetic. No async calls in tick body. Profile with 1000+ deployables.
**Warning signs:** Event loop lag, socket timeouts, AI tick warnings.

### Pitfall 2: State Desync Between Memory and DB
**What goes wrong:** Server crashes between ticks, losing accumulated resources that haven't been flushed.
**Why it happens:** 5-minute DB flush interval means up to 5 minutes of data loss on crash.
**How to avoid:** Accept this as a design tradeoff (stated in AUTO-08). Log last flush timestamp. On restart, re-process from last flush time.
**Warning signs:** Players reporting missing resources after server restart.

### Pitfall 3: Race Conditions on Loot Collection
**What goes wrong:** Two players simultaneously collect from same deployable, both getting full resources.
**Why it happens:** No locking mechanism on the accumulated resources.
**How to avoid:** Use atomic claim pattern (same as GatheringService entity locks). First player claims, collects, releases.
**Warning signs:** Duplicated items in economy.

### Pitfall 4: Fuel Item Category Confusion
**What goes wrong:** Fuel items treated as regular consumables and consumed via inventory:use.
**Why it happens:** Fuel items use `consumable` category but shouldn't be directly usable.
**How to avoid:** Add a `fuelFor` property or use `reagent` category. Add validation in handleItemUse to reject fuel items.
**Warning signs:** Players consuming fuel items for effects instead of depositing in structures.

### Pitfall 5: Balance Sheet Bypassed
**What goes wrong:** Automation code written before balance sheet, leading to economy-breaking rates.
**Why it happens:** Developers skip the design artifact step (AUTO-06 success criteria #5).
**How to avoid:** Balance sheet MUST be the first plan deliverable, committed to git, referenced by all subsequent plans.
**Warning signs:** No .planning/phases/121-*/BALANCE-SHEET.md committed before Plan 02.

## Code Examples

### Deployables DB Schema (follows structures.ts pattern)
```typescript
import { pgTable, uuid, varchar, integer, timestamp, jsonb, real } from 'drizzle-orm/pg-core';
import { characters } from './characters';

interface PositionJson {
  x: number; y: number; zoneId: string;
}

interface AccumulatedResource {
  itemId: string; quantity: number;
}

export const deployables = pgTable('deployables', {
  id: uuid('id').primaryKey().defaultRandom(),
  deployableType: varchar('deployable_type', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  position: jsonb('position').$type<PositionJson>().notNull(),
  ownerId: uuid('owner_id').references(() => characters.id, { onDelete: 'cascade' }).notNull(),
  durability: integer('durability').notNull().default(100),
  maxDurability: integer('max_durability').notNull().default(100),
  fuelRemaining: integer('fuel_remaining').notNull().default(0),
  maxFuel: integer('max_fuel').notNull().default(100),
  accumulatedResources: jsonb('accumulated_resources').$type<AccumulatedResource[]>().notNull().default([]),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  deployedAt: timestamp('deployed_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastTickAt: timestamp('last_tick_at', { withTimezone: true }).notNull().defaultNow(),
  properties: jsonb('properties').$type<Record<string, unknown>>().notNull().default({}),
});
```

### Automation Socket Events (follows existing event patterns)
```typescript
// Add to ClientEvents
'automation:deploy': { deployableItemId: string; position: { x: number; y: number; zoneId: string } };
'automation:interact': { entityId: string };
'automation:collect': { deployableId: string };
'automation:refuel': { deployableId: string; fuelInstanceId: string };
'automation:dismantle': { deployableId: string };
'automation:panel_request': Record<string, never>;

// Add to ServerEvents
'automation:deployed': { deployable: DeployableEntity; inventory: Inventory };
'automation:loot_window': { /* loot window data */ };
'automation:collected': { deployableId: string; items: { itemId: string; quantity: number }[]; inventory: Inventory };
'automation:refueled': { deployableId: string; fuelLevel: number; maxFuel: number; inventory: Inventory };
'automation:dismantled': { deployableId: string; recoveredItems: { itemId: string; quantity: number }[]; inventory: Inventory };
'automation:panel_state': { structures: AutomationPanelEntry[] };
'automation:status_update': { deployableId: string; status: string; fuelLevel: number };
```

### Fuel Item Definition (follows consumable pattern)
```typescript
export const FUEL_CELL_BASIC: ItemDefinition = {
  id: 'fuel_cell_basic',
  displayName: 'Basic Fuel Cell',
  description: 'A simple energy cell crafted from crystalline dust and fungal extract. Powers T2 extractors for 5 minutes.',
  category: 'reagent', // NOT consumable — prevents direct use
  rarity: 'common',
  maxStack: 50,
  weight: 0.5,
  baseValue: 100,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'common'),
  textureKey: 'item_fuel_cell_basic',
  color: 0x44aacc,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-zone tick processing | Global service tick (HazardService pattern) | Phase 120 | Automation MUST use global tick, not per-zone |
| Direct DB writes per action | In-memory + periodic flush | Established pattern | Matches AUTO-08 requirement |
| Credits for maintenance | Crafted fuel items | User decision (CONTEXT.md) | Fuel items create gather->craft->deploy loop |

## Open Questions

1. **Fuel item crafting recipes**
   - What we know: Fuel items are crafted consumables (reagent category), require gathering resources to craft
   - What's unclear: No crafting system exists yet (out of scope per REQUIREMENTS.md). How do players "craft" fuel items?
   - Recommendation: Use NPC trader purchase as a proxy — players sell gathered resources and buy fuel items from automation-specific traders. This avoids building a crafting system while maintaining the economic loop. Alternatively, define "crafting" as a simple recipe conversion (input items -> output fuel) handled server-side without a full crafting UI.

2. **Structure attack/destroy mechanics**
   - What we know: PvP interaction allows attacking and destroying structures
   - What's unclear: Combat targeting for structures (auto-attack? ability targeting?), structure HP values, damage calculations
   - Recommendation: Reuse existing combat damage pipeline — structures have HP (durability), take damage from player attacks. Simple: if player clicks attack on structure entity, apply weapon damage to durability. Can be a minimal implementation for Phase 121.

3. **Survey beacon "passive resource cache" mechanic**
   - What we know: AUTO-02 says beacons "mark zone for passive resource cache"
   - What's unclear: What exactly is a "resource cache"? Does it spawn loot on the ground? Does it add to a collection pool?
   - Recommendation: Treat beacon as a special extractor that works zone-wide (not node-specific). Accumulates a small amount of the zone's dominant resource type. Collected via loot window like other deployables.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `packages/shared-types/src/core/entity.ts` — DeployableEntity already defined
- Codebase analysis: `packages/database/src/schema/structures.ts` — Schema pattern for deployables table
- Codebase analysis: `apps/game-server/src/game/hazard.service.ts` — Tick-based service pattern
- Codebase analysis: `apps/game-server/src/game/game.module.ts` — Service registration pattern
- Codebase analysis: `apps/web/src/ui/GameUI.tsx` — Panel integration pattern
- Codebase analysis: `packages/items/src/types.ts` — ItemDefinition structure for fuel items

### Secondary (MEDIUM confidence)
- AUTO-01 through AUTO-09 requirements from REQUIREMENTS.md
- CONTEXT.md user decisions (locked)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries are already in use in the codebase
- Architecture: HIGH - patterns directly follow existing HazardService, InventoryService, and HUD panel patterns
- Pitfalls: HIGH - identified from existing codebase patterns and known game economy design challenges

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable — internal codebase patterns)
