# Architecture Research

**Domain:** Multiplayer isometric MMO — inventory & items system integration (v1.6)
**Researched:** 2026-02-17
**Confidence:** HIGH (direct codebase audit; all integration points verified against source files)

---

## Standard Architecture

### System Overview (Current + Inventory Overlay)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (React + Phaser)                     │
├─────────────────────────────────────────────────────────────────────┤
│  REACT HUD LAYER (apps/web/src/ui/)                                  │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐    │
│  │  HUD.tsx     │  │ InventoryPanel  │  │  EquipmentPanel      │    │
│  │  (existing)  │  │  [NEW]          │  │  [NEW]               │    │
│  └──────┬───────┘  └───────┬─────────┘  └──────────┬───────────┘    │
│         │                  │ showInventory           │               │
│  ┌──────▼──────────────────▼─────────────────────────▼───────────┐  │
│  │                     gameStore (Zustand)                         │  │
│  │  existing: player, zoneState, connectionState                   │  │
│  │  NEW:      inventory, equipment, hotbar                         │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                             │                                       │
│  PHASER LAYER (apps/web/src/game/)                                  │
│  ┌──────────────────────────▼──────────────────────────────────┐  │
│  │  ZoneHUD.ts  [MODIFY: add hotbar slots]                      │  │
│  │  WorldScene.ts  [MODIFY: item pickup keypress, use hotbar]   │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                           Socket.IO (WebSocket)                      │
│         inventory:use / inventory:drop / inventory:pickup            │
│         inventory:equip / inventory:unequip (NEW events)            │
│         <-- inventory:update (server -> client)                      │
├─────────────────────────────────────────────────────────────────────┤
│                         SERVER (NestJS game-server)                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  GameGateway  [MODIFY: add inventory event handlers]         │  │
│  │  handleInventoryUse() / handleInventoryDrop()                │  │
│  │  handleInventoryPickup() / handleEquip() / handleUnequip()   │  │
│  └──────────────────┬───────────────────────────────────────────┘  │
│                     │                                               │
│  ┌──────────────────▼───────────────────────────────────────────┐  │
│  │  InventoryService  [NEW]                                      │  │
│  │  useItem() / dropItem() / pickupItem()                        │  │
│  │  equipItem() / unequipItem()                                  │  │
│  │  getInventory() (loads from DB on auth)                       │  │
│  └──────────────────┬───────────────────────────────────────────┘  │
│                     │                                               │
│  ┌──────────────────▼───────────────────────────────────────────┐  │
│  │  @into-the-void/game-logic  [MODIFY: add inventory module]   │  │
│  │  validateItemUse() / validateEquip() / resolveItemEffect()   │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                     SHARED PACKAGES                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  @into-the-void/items  [NEW PACKAGE — mirrors tiles package] │  │
│  │  ItemRegistry (singleton, strategy pattern)                   │  │
│  │  ItemDefinition (interface)                                   │  │
│  │  ItemEffect (discriminated union)                             │  │
│  │  definitions/suits, tools, consumables, materials...          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  @into-the-void/shared-types  [MODIFY: extend existing]      │  │
│  │  inventory.ts — ItemDef already exists, extend it            │  │
│  │  events.ts   — add equipment:change ClientEvent               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  @into-the-void/database  [MODIFY: inventories schema exists]│  │
│  │  schema/inventories.ts — already has items + equipment JSONB │  │
│  │  queries/inventory.ts  — CRUD already exists                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location | Status |
|-----------|----------------|----------|--------|
| `ItemRegistry` | Singleton map of `itemId -> ItemDefinition`; strategy pattern identical to `TileRegistry` | `packages/items/src/registry.ts` | NEW |
| `ItemDefinition` | Static item properties: id, category, rarity, slots, effects, weight, stackSize | `packages/items/src/types.ts` | NEW |
| `ItemEffect` | Discriminated union: heal/buff/equip/spawn-entity — returned by item use handler | `packages/items/src/types.ts` | NEW |
| `InventoryService` | Server-side inventory state per connected player; validates operations; persists to DB | `apps/game-server/src/inventory/inventory.service.ts` | NEW |
| `GameGateway` | Routes inventory WebSocket events to `InventoryService`; broadcasts `inventory:update` | `apps/game-server/src/game/game.gateway.ts` | MODIFY |
| `gameStore` | Client Zustand state: `inventory`, `equipment`, `hotbar`; receives `inventory:update` | `apps/web/src/store/gameStore.ts` | MODIFY |
| `InventoryPanel` | React modal: grid of `InventoryItem` slots; drag-to-equip, right-click-use | `apps/web/src/ui/panels/InventoryPanel.tsx` | NEW |
| `EquipmentPanel` | React panel: exo-suit silhouette with slot targets; shows equipped items | `apps/web/src/ui/panels/EquipmentPanel.tsx` | NEW |
| `ActionBar` | Phaser HUD (or React overlay): 8 hotbar slots with keypress binding (1-8) | `apps/web/src/ui/hud/ActionBar.tsx` | NEW |
| `ZoneHUD` | Existing Phaser HUD; modified to delegate hotbar rendering to `ActionBar` | `apps/web/src/game/ui/ZoneHUD.ts` | MODIFY |
| `game-logic inventory` | Pure functions: `validateItemUse`, `canEquip`, `resolveEffect` — no side effects | `packages/game-logic/src/inventory/` | NEW |
| `inventories schema` | PostgreSQL table: `character_id PK`, `items JSONB[]`, `equipment JSONB`, `maxSlots INT` | `packages/database/src/schema/inventories.ts` | EXISTS (extend) |
| `EntityRegistry.items` | Existing static item catalog in shared-types — MIGRATE to `ItemRegistry` | `packages/shared-types/src/game/entity-registry.ts` | REFACTOR |

---

## New Package: `@into-the-void/items`

The tile system (`packages/tiles`) established the project's canonical pattern for static game-data registries. The items package mirrors this pattern exactly.

### Why a separate package (not extending shared-types)

`shared-types` holds network contracts — lightweight types shared between client and server. An items package holds game logic (effect calculation, rarity multipliers, slot compatibility) that is **used by clients at runtime for UI rendering** and **by game-server for validation**. This dual use justifies its own package, same as `tiles`.

```
packages/items/
├── src/
│   ├── types.ts              # ItemDefinition, ItemEffect, EquipmentSlotDef
│   ├── registry.ts           # ItemRegistry singleton (mirrors TileRegistry)
│   ├── index.ts              # public exports
│   └── definitions/
│       ├── suits.ts          # Exo-suit base + variants
│       ├── modules.ts        # Suit module slots (rarity-gated)
│       ├── tools.ts          # Main/secondary tool slots
│       ├── consumables.ts    # Health vials, energy cells, etc.
│       ├── materials.ts      # Crafting reagents, world resources
│       ├── misc.ts           # Quest items, keys, unique drops
│       └── index.ts          # registerAll() — bootstraps registry
```

### ItemDefinition interface (mirrors TileDefinition)

```typescript
export interface ItemDefinition {
  readonly id: string;               // 'health_vial_common'
  readonly displayName: string;      // 'Health Vial'
  readonly description: string;
  readonly category: ItemCategory;   // 'consumable' | 'suit' | 'module' | 'tool' | 'material' | 'misc'
  readonly rarity: ItemRarity;       // 'common' | 'rare' | 'epic' | 'exotic' | 'legendary'
  readonly maxStack: number;
  readonly weight: number;
  readonly baseValue: number;
  readonly requiredLevel: number;
  readonly textureKey: string;       // sprite key for icon rendering
  readonly color: number;            // fallback hex color (no sprite)
  readonly equipSlot?: EquipmentSlot; // present if equippable
  readonly moduleSlots?: number;     // for suits: how many modules it accepts
  readonly effects?: ItemEffectDef[];
}

export interface ItemEffectDef {
  trigger: 'on_use' | 'on_equip' | 'passive';
  effect: ItemEffect;
}

export type ItemEffect =
  | { type: 'heal'; amount: number }
  | { type: 'restore_energy'; amount: number }
  | { type: 'buff_stat'; stat: string; amount: number; duration: number }
  | { type: 'spawn_entity'; entityType: string }
  | { type: 'unlock_slot'; slot: EquipmentSlot };
```

---

## Existing Architecture: What Already Exists

A significant portion of the inventory system is already scaffolded. This is critical for build ordering — don't rewrite what exists.

### Already Present (Verified by Codebase Audit)

| Asset | Location | State |
|-------|----------|-------|
| `Inventory` type | `shared-types/src/game/inventory.ts` | Complete: `InventoryItem`, `EquipmentSlot`, `Inventory`, `InventoryResult` |
| `ClientEventType` `inventory:use/drop/pickup` | `shared-types/src/network/events.ts` | Declared in type union |
| `ServerEventType` `inventory:update` | `shared-types/src/network/events.ts` | Declared in type union |
| `ClientEvents['inventory:use']` | `shared-types/src/network/events.ts` | `{ instanceId: string }` |
| `ClientEvents['inventory:drop']` | `shared-types/src/network/events.ts` | `{ instanceId: string; quantity: number }` |
| `ClientEvents['inventory:pickup']` | `shared-types/src/network/events.ts` | `{ entityId: string }` |
| `ServerEvents['inventory:update']` | `shared-types/src/network/events.ts` | Returns `Inventory` type |
| `gameSocket` registration | `apps/web/src/network/socket.ts:82` | `inventory:update` listed in `serverEvents` array — socket listens, no handler connected |
| `showInventory` / `toggleInventory` | `apps/web/src/store/gameStore.ts:39,41` | UI flag exists, `InventoryPanel` not rendered anywhere yet |
| `inventories` DB table | `packages/database/src/schema/inventories.ts` | Complete: `characterId PK`, `items JSONB`, `equipment JSONB`, `maxSlots INT` |
| `createInventory / getInventory / updateInventory` | `packages/database/src/queries/inventory.ts` | All CRUD functions implemented |
| `ItemConfig` / `EntityRegistry.items` | `shared-types/src/game/entity-registry.ts:44,135` | 4 items registered (health_vial, energy_cell, void_essence, ancient_key) |
| `ErrorCode: INVENTORY_FULL` | `shared-types/src/network/messages.ts` | Error code defined |

### Missing (Gaps to Fill)

| Missing | What to Build |
|---------|--------------|
| `equipment:change` client event | Add to `ClientEvents` and `ClientEventType` in `events.ts` |
| `InventoryService` (game-server) | NestJS service; in-memory per-player inventory; DB persistence |
| `inventory:*` handlers in `GameGateway` | `@SubscribeMessage` handlers for use/drop/pickup/equip/unequip |
| `packages/items` package | New NX package; ItemRegistry, definitions |
| `InventoryPanel` React component | Grid UI; uses `gameStore.inventory` |
| `EquipmentPanel` React component | Slot UI; uses `gameStore.equipment` |
| `ActionBar` HUD component | Hotbar 1-8; keybindings; uses `gameStore.hotbar` |
| `gameStore` inventory state | `inventory: Inventory | null`, `equipment`, `hotbar` slices |
| `gameStore` `inventory:update` handler | Wire socket event to store update |
| `game-logic/inventory/` module | Pure validation functions |

---

## Recommended Project Structure

```
packages/items/                              [NEW PACKAGE]
├── package.json
├── tsconfig.json
├── src/
│   ├── types.ts
│   ├── registry.ts
│   ├── index.ts
│   └── definitions/
│       ├── index.ts                         # registerAll() call
│       ├── suits.ts
│       ├── modules.ts
│       ├── tools.ts
│       ├── consumables.ts
│       ├── materials.ts
│       └── misc.ts

packages/game-logic/src/
├── inventory/                               [NEW MODULE]
│   ├── validation.ts                        # validateItemUse, canEquip, hasSlot
│   ├── effects.ts                           # resolveEffect(item, player) -> ItemEffect
│   └── index.ts
└── index.ts                                 [MODIFY: export inventory/*]

packages/shared-types/src/
├── game/
│   └── inventory.ts                         [MODIFY: extend ItemDef, add hotbar type]
└── network/
    └── events.ts                            [MODIFY: add equipment:change ClientEvent]

packages/database/src/
└── schema/
    └── inventories.ts                       [EXISTS — no schema changes needed]

apps/game-server/src/
├── game/
│   ├── game.gateway.ts                      [MODIFY: add @SubscribeMessage handlers]
│   ├── game.module.ts                       [MODIFY: import InventoryModule]
│   └── game.service.ts                      [MODIFY: pickup adds to inventory]
└── inventory/                               [NEW MODULE]
    ├── inventory.module.ts
    └── inventory.service.ts

apps/web/src/
├── store/
│   └── gameStore.ts                         [MODIFY: inventory/equipment/hotbar state]
├── ui/
│   ├── GameUI.tsx                           [MODIFY: render InventoryPanel + EquipmentPanel]
│   ├── hud/
│   │   ├── HUD.tsx                          [MODIFY: render ActionBar]
│   │   └── ActionBar.tsx                    [NEW]
│   └── panels/
│       ├── ChatPanel.tsx                    [EXISTS — reference for panel pattern]
│       ├── InventoryPanel.tsx               [NEW]
│       └── EquipmentPanel.tsx               [NEW]
└── game/
    └── ui/
        └── ZoneHUD.ts                       [MODIFY: remove hotbar if moved to React]
```

---

## Architectural Patterns

### Pattern 1: ItemRegistry — Singleton Strategy (mirrors TileRegistry)

**What:** A singleton Map from `itemId -> ItemDefinition`. All item definitions are registered at static init time via `registerAll()`. Consumers call `ItemRegistry.get(id)` to access definitions. Unknown IDs return a fallback UNKNOWN_ITEM (magenta icon, obvious error indicator).

**When to use:** Any time code needs to look up static item properties by string ID. Both client (for rendering item icons in UI) and server (for validating item use) import from `@into-the-void/items`.

**Trade-offs:** Singleton is not injectable — fine for static data that never changes at runtime. Same trade-off accepted for TileRegistry.

```typescript
// packages/items/src/registry.ts
const UNKNOWN_ITEM: ItemDefinition = {
  id: 'unknown',
  displayName: 'Unknown Item',
  description: 'This item type is not registered.',
  category: 'misc',
  rarity: 'common',
  maxStack: 1,
  weight: 0,
  baseValue: 0,
  requiredLevel: 0,
  textureKey: 'item_unknown',
  color: 0xff00ff,  // magenta — mirrors TileRegistry fallback convention
};

class ItemRegistryImpl {
  private readonly items: Map<string, ItemDefinition> = new Map();

  register(item: ItemDefinition): void { ... }
  registerAll(items: readonly ItemDefinition[]): void { ... }
  get(id: string): ItemDefinition { ... } // returns UNKNOWN_ITEM on miss
  has(id: string): boolean { ... }
  getAllByCategory(category: ItemCategory): ItemDefinition[] { ... }
  getAllByRarity(rarity: ItemRarity): ItemDefinition[] { ... }
}

export const ItemRegistry = new ItemRegistryImpl();
```

### Pattern 2: Server-Side In-Memory Inventory with DB Persistence

**What:** `InventoryService` maintains an in-memory `Map<playerId, Inventory>` for fast access during gameplay, mirroring how `PlayerService` maintains connected players. On player auth, inventory is loaded from DB. On each mutation (use/drop/equip), state is updated in-memory immediately and flushed to DB asynchronously. On disconnect, final state is saved.

**When to use:** This is the established server pattern. `PlayerService` uses the same in-memory + DB-on-auth approach. Apply it consistently.

**Trade-offs:** Memory grows with connected players. At scale, a cache layer (Redis) replaces the in-memory Map. For current scale (small playerbase), in-memory is correct.

```typescript
// apps/game-server/src/inventory/inventory.service.ts
@Injectable()
export class InventoryService {
  private inventories: Map<string, Inventory> = new Map(); // playerId -> Inventory

  async loadForPlayer(playerId: string, db: DbClient): Promise<void> {
    const dbInventory = await getInventory(db, playerId);
    if (dbInventory) {
      this.inventories.set(playerId, mapDbToInventory(dbInventory));
    } else {
      const fresh = createDefaultInventory(playerId);
      this.inventories.set(playerId, fresh);
      await createInventory(db, mapInventoryToDb(fresh));
    }
  }

  async unloadForPlayer(playerId: string, db: DbClient): Promise<void> {
    const inventory = this.inventories.get(playerId);
    if (inventory) {
      await updateInventory(db, playerId, mapInventoryToDb(inventory));
      this.inventories.delete(playerId);
    }
  }

  useItem(playerId: string, instanceId: string): InventoryResult { ... }
  dropItem(playerId: string, instanceId: string, quantity: number): InventoryResult { ... }
  pickupItem(playerId: string, item: InventoryItem): InventoryResult { ... }
  equipItem(playerId: string, instanceId: string, slot: EquipmentSlot): InventoryResult { ... }
  unequipItem(playerId: string, slot: EquipmentSlot): InventoryResult { ... }
}
```

### Pattern 3: Inventory State in Zustand — Separate Slice

**What:** Add inventory state to `gameStore` as a distinct slice alongside player, entities, and UI toggles. The `inventory:update` socket event replaces the entire `Inventory` object in store on each mutation. Clients do not maintain partial/optimistic inventory state — the server is authoritative.

**When to use:** The existing pattern for `zone:state` (replaces entire ZoneState object) applies here. Inventory mutations are infrequent relative to movement, so full-replacement is fine.

**Trade-offs:** Full replacement means no partial updates — intentional for correctness. The server is the only source of truth for inventory contents.

```typescript
// Additions to gameStore.ts
interface GameState {
  // ... existing fields ...

  // Inventory
  inventory: Inventory | null;
  setInventory: (inventory: Inventory) => void;

  // Hotbar (client-only — which slots are assigned to 1-8 keys)
  hotbar: (string | null)[];  // 8-element array of instanceIds or null
  setHotbarSlot: (slot: number, instanceId: string | null) => void;
}

// In the store body:
inventory: null,
setInventory: (inventory) => set({ inventory }),
hotbar: Array(8).fill(null),
setHotbarSlot: (slot, instanceId) => set((state) => {
  const hotbar = [...state.hotbar];
  hotbar[slot] = instanceId;
  return { hotbar };
}),

// Socket listener (add alongside existing zone:state listener):
gameSocket.on('inventory:update', (inventory: Inventory) => {
  useGameStore.getState().setInventory(inventory);
});
```

### Pattern 4: Pure Validation in game-logic (No Side Effects)

**What:** All inventory validation logic lives in `packages/game-logic/src/inventory/`. Functions are pure: they take current state (player, inventory, item definition) and return a typed result (success + effect, or failure + reason). No DB calls, no socket calls — just pure logic.

**When to use:** Mirrors existing `validateMovement()`, `canInteract()`, `canHarvest()`, `canPickup()` pattern in `game-logic`. The server calls these before executing mutations.

```typescript
// packages/game-logic/src/inventory/validation.ts
export function validateItemUse(
  player: Player,
  inventory: Inventory,
  instanceId: string,
  itemDef: ItemDefinition
): { valid: boolean; reason?: string; effect?: ItemEffect } {
  const item = inventory.items.find(i => i.instanceId === instanceId);
  if (!item) return { valid: false, reason: 'Item not in inventory' };
  if (player.level < itemDef.requiredLevel) {
    return { valid: false, reason: `Requires level ${itemDef.requiredLevel}` };
  }
  const effect = resolveEffect(itemDef, 'on_use');
  return { valid: true, effect };
}

export function validateEquip(
  player: Player,
  inventory: Inventory,
  instanceId: string,
  slot: EquipmentSlot,
  itemDef: ItemDefinition
): { valid: boolean; reason?: string } { ... }
```

---

## Data Flow

### Item Use Flow (client initiates, server authoritative)

```
Player presses hotbar key (1-8)
    |
ActionBar.tsx (React) reads hotbar[key] -> instanceId
    |
gameSocket.emit('inventory:use', { instanceId })
    |
GameGateway.handleInventoryUse(client, { instanceId })
    |
    +-- playerService.getPlayerBySocket(client.id) -> player
    +-- inventoryService.useItem(player.id, instanceId)
    |       +-- validateItemUse(player, inventory, instanceId, itemDef)
    |       |       validation via game-logic (pure)
    |       +-- if valid: apply effect to player (heal, buff, etc.)
    |       |   remove/decrement item from inventory
    |       |   flush to DB (async, non-blocking)
    |       +-- return { success, inventory, effect }
    |
    +-- client.emit('inventory:update', updatedInventory)
    +-- (if effect has world impact) server.to(zoneId).emit(...)
    |
gameStore.ts on('inventory:update')
    |
setInventory(updatedInventory)
    |
InventoryPanel re-renders / ActionBar re-renders
```

### Item Pickup Flow (from world entity)

```
Player clicks entity (type: 'item') or walks adjacent
    |
gameSocket.emit('inventory:pickup', { entityId })
    |
GameGateway.handleInventoryPickup(client, { entityId })
    |
    +-- zonesService.getEntity(zoneId, entityId) -> ItemEntity
    +-- inventoryService.pickupItem(player.id, itemFromEntity)
    |       canPickup() check via game-logic
    |       +-- usedSlots < inventory.maxSlots?
    |       +-- item not despawned?
    |       +-- stack merge if same itemId already in inventory
    |
    +-- zonesService.removeEntity(entityId)  // despawn from world
    +-- client.emit('inventory:update', updatedInventory)
    +-- server.to(zoneId).emit('entity:despawn', { entityId })
```

### Equipment Change Flow

```
Player drags item to equipment slot in EquipmentPanel
    |
EquipmentPanel.tsx -> gameSocket.emit('equipment:change', { instanceId, slot })
    |
GameGateway.handleEquip(client, { instanceId, slot })
    |
    +-- inventoryService.equipItem(player.id, instanceId, slot)
    |       validateEquip() from game-logic
    |       swap: inventory.equipment[slot] -> back to bag, item -> slot
    |
    +-- client.emit('inventory:update', updatedInventory)
    // equipment is part of Inventory type, same event covers both
```

### Auth Flow (Inventory Load)

```
PlayerService.authenticate() succeeds
    |
InventoryService.loadForPlayer(player.id, db)  // called from GameGateway.handleAuth
    |
    +-- getInventory(db, characterId) -> DbRow
    +-- inventories.set(player.id, mapDbToInventory(row))
    |
client.emit('auth:success', { player })
client.emit('inventory:update', loadedInventory)  // [NEW: send inventory on login]
```

---

## New vs. Modified: Complete Inventory

| File | Status | Change Description |
|------|--------|--------------------|
| `packages/items/` | NEW PACKAGE | ItemRegistry, ItemDefinition, all 100 item definitions |
| `packages/shared-types/src/game/inventory.ts` | MODIFY | Add `HotbarSlot` type; extend `ItemDef` to match `ItemDefinition` |
| `packages/shared-types/src/network/events.ts` | MODIFY | Add `equipment:change` to `ClientEvents` and `ClientEventType` |
| `packages/game-logic/src/inventory/` | NEW MODULE | Pure validation: `validateItemUse`, `validateEquip`, `resolveEffect` |
| `packages/game-logic/src/index.ts` | MODIFY | Export new inventory module |
| `packages/database/src/schema/inventories.ts` | NO CHANGE | Schema already complete |
| `packages/database/src/queries/inventory.ts` | NO CHANGE | CRUD already implemented |
| `apps/game-server/src/inventory/inventory.service.ts` | NEW | In-memory inventory per player; DB persistence |
| `apps/game-server/src/inventory/inventory.module.ts` | NEW | NestJS module wrapping InventoryService |
| `apps/game-server/src/game/game.gateway.ts` | MODIFY | Add 5 new `@SubscribeMessage` handlers |
| `apps/game-server/src/game/game.module.ts` | MODIFY | Import InventoryModule |
| `apps/game-server/src/game/player.service.ts` | MODIFY | Call `inventoryService.loadForPlayer` in `authenticate()` |
| `apps/game-server/src/game/game.service.ts` | MODIFY | `handleInteraction` item pickup triggers `inventoryService.pickupItem` |
| `apps/web/src/store/gameStore.ts` | MODIFY | Add inventory/hotbar state; wire `inventory:update` socket event |
| `apps/web/src/ui/GameUI.tsx` | MODIFY | Render `InventoryPanel` and `EquipmentPanel` conditionally |
| `apps/web/src/ui/hud/HUD.tsx` | MODIFY | Render `ActionBar` component |
| `apps/web/src/ui/hud/ActionBar.tsx` | NEW | 8-slot hotbar; key 1-8 bindings; emits `inventory:use` |
| `apps/web/src/ui/panels/InventoryPanel.tsx` | NEW | Grid inventory; item slots; context menu for use/drop/equip |
| `apps/web/src/ui/panels/EquipmentPanel.tsx` | NEW | Equipment slots; exo-suit silhouette; drag-from-inventory |
| `apps/web/src/game/ui/ZoneHUD.ts` | MODIFY or NO CHANGE | Only if hotbar is kept in Phaser layer (recommend React instead) |

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `GameGateway` <-> `InventoryService` | Direct method call (NestJS injection) | `InventoryService` injected into `GameGateway` via `GameModule` importing `InventoryModule` |
| `InventoryService` <-> `game-logic/inventory` | Import and call pure functions | No async; validation is sync. Server imports `@into-the-void/game-logic`. |
| `InventoryService` <-> `database` | `DatabaseService.getClient()` (existing pattern) | Same pattern as `PlayerService.authenticate()` — inject `DatabaseService` |
| `InventoryService` <-> `PlayerService` | `PlayerService.getPlayerById()` for player state | `InventoryService` reads player level/stats from `PlayerService` for validation |
| `gameStore` <-> `socket` | `gameSocket.on('inventory:update', ...)` | Mirrors existing `zone:state` listener pattern in `gameStore.ts` |
| `ActionBar` (React) <-> `gameSocket` | `gameSocket.emit('inventory:use', ...)` direct call | Same as how `HUD.tsx` calls `toggleInventory()` on `gameStore` |
| `InventoryPanel` <-> `gameStore` | `useGameStore()` hook for `inventory` state | Same pattern as `ChatPanel.tsx` uses `useGameStore()` for `chatMessages` |
| `ItemRegistry` <-> `InventoryPanel` | `ItemRegistry.get(item.itemId)` for display data | Client imports `@into-the-void/items` for icon color/name display |
| `ItemRegistry` <-> `InventoryService` | `ItemRegistry.get(item.itemId)` for validation | Server imports `@into-the-void/items`; same singleton, same data |
| `EntityRegistry.items` <-> `ItemRegistry` | MIGRATION — existing 4 items move from entity-registry to items package | `EntityRegistry.items` in `shared-types` becomes a thin wrapper or is deleted |

### HUD Architecture Decision: React vs. Phaser for ActionBar

The existing HUD is split:
- `ZoneHUD.ts` (Phaser): zone name, tier, location text — Phaser Text objects rendered in the game scene
- `HUD.tsx` (React): health/energy/XP bars, inventory toggle button, chat button — React overlay

**Recommendation: ActionBar as React component in `HUD.tsx`, not Phaser.**

Rationale: The existing Inventory toggle button is already in `HUD.tsx` as a React button. ActionBar is UI, not game-world content. Keyboard binding (1-8 keys) is easier to handle in React with `useEffect`/`keydown` listeners without interfering with Phaser's input system. Phaser's input system is focused on movement keys — adding hotbar keys there creates coupling.

Risk to watch: Phaser captures keyboard focus. Ensure the React `keydown` listener is on `document` (not a div) and check `document.activeElement` to avoid firing hotbar actions while typing in chat.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (small playerbase) | In-memory `Map<playerId, Inventory>` in `InventoryService` is fine |
| ~500 concurrent players | Async DB flush queue (debounce saves by 2-5 seconds); still in-memory |
| ~5000 concurrent players | Redis as inventory cache instead of in-memory Map; game-server can scale horizontally |
| Crafting/trading (future) | Item transfer needs transactions; JSONB approach limits atomic multi-player operations — migrate to separate `inventory_items` rows at this point |

### Database Schema Note

Current schema stores all inventory items as a single JSONB array in one row per character. This is correct for the current milestone. The limitations:

- Can't query "who has item X" efficiently (no indexed item search)
- Concurrent writes to same player's inventory need application-level locking
- Fine for single game-server instance (inventory mutations are serialized through `InventoryService`)

Do not change the schema now. The application-level locking via in-memory `InventoryService` handles concurrency correctly for a single server instance.

---

## Anti-Patterns

### Anti-Pattern 1: Putting Inventory Logic in GameGateway

**What people do:** Add item use validation, effect resolution, and DB writes directly inside the `@SubscribeMessage('inventory:use')` handler in `GameGateway`.

**Why it's wrong:** `GameGateway` already does too much (auth, movement, interaction, chat). Inventory logic grows large. Testing becomes impossible. Mirrors exactly the mistake avoided in the movement system by using `GameService` + `PlayerService`.

**Do this instead:** `GameGateway` handlers are thin: authenticate the socket, delegate to `InventoryService`, emit the result. All logic lives in `InventoryService` and `game-logic/inventory`.

### Anti-Pattern 2: Optimistic Inventory Updates on Client

**What people do:** Update `gameStore.inventory` immediately on button press, then confirm when server responds.

**Why it's wrong:** Inventory has item IDs, quantities, and slot positions that the server may modify differently (stack merging, overflow handling). An optimistic state that differs from server state on rollback causes visual glitches (items briefly disappear/reappear). The cost of optimistic inventory updates does not match the benefit — inventory actions are not latency-sensitive.

**Do this instead:** Show a brief "processing" state on the item slot if needed. Wait for `inventory:update` from server. This is the same round-trip as movement — acceptable for non-movement UI.

### Anti-Pattern 3: Duplicating ItemDefinition Between EntityRegistry and ItemRegistry

**What people do:** Keep `EntityRegistry.items` in `shared-types` and also create `ItemRegistry` in the new `items` package. Items get defined in two places and diverge.

**Why it's wrong:** `EntityRegistry.items` (`ItemConfig`) already has 4 items. If `ItemRegistry` defines those same items differently, any code importing from `entity-registry` gets a different definition than code importing from `items`.

**Do this instead:** Migrate the 4 existing `EntityRegistry.items` entries to `ItemRegistry` as the canonical source. Delete or deprecate `EntityRegistry.items`. `EntityRegistry` continues to manage creatures and minerals — only items move.

### Anti-Pattern 4: HUD ActionBar in Phaser Instead of React

**What people do:** Add hotbar slot rendering to `ZoneHUD.ts` as Phaser Text/Image objects, add key capture to `WorldScene.handleInput()`.

**Why it's wrong:** Phaser input handling is designed for continuous per-frame polling (movement). Hotbar key presses are discrete events. Mixing them in `WorldScene` creates coupling between movement timing (150ms rate limit) and hotbar use (no rate limit). Phaser Text/Image objects for UI are harder to style than React+CSS.

**Do this instead:** `ActionBar.tsx` is a React component. It registers a `keydown` listener on `document` with explicit guard against chat/input focus states. Styles with CSS variables matching existing `--color-accent` scheme.

### Anti-Pattern 5: Loading Inventory in PlayerService Instead of InventoryService

**What people do:** Add `getInventory(db, characterId)` call inside `PlayerService.authenticate()` and store it on the `ConnectedPlayer` object.

**Why it's wrong:** Inventory data is separate concern from player presence/authentication. Bloating `ConnectedPlayer` with inventory breaks the single-responsibility of `PlayerService`. Inventory will grow in complexity (slots, equipment, hotbar); this should stay in its own service.

**Do this instead:** `PlayerService.authenticate()` calls `await inventoryService.loadForPlayer(player.id, db)` after creating the player. `InventoryService` handles its own loading logic independently.

---

## Suggested Build Order

Dependencies flow upward: shared-types and packages must exist before game-server and web can import them. Within each layer, pure/foundational components precede complex ones.

### Phase 1: Foundation (packages)
1. Create `packages/items` package with `ItemRegistry`, `ItemDefinition` types, and registration bootstrap
2. Define 100 items across 6 categories in `definitions/` — no logic, just data
3. Migrate `EntityRegistry.items` (4 existing items) into the new registry, delete from entity-registry
4. Extend `shared-types/game/inventory.ts` with `HotbarSlot` type
5. Add `equipment:change` to `shared-types/network/events.ts`
6. Add `packages/game-logic/src/inventory/` with pure validation functions

**Verification gate:** All existing tests pass. `ItemRegistry.get('health_vial')` returns correct definition.

### Phase 2: Server-side InventoryService
7. Create `apps/game-server/src/inventory/inventory.service.ts`
8. Create `apps/game-server/src/inventory/inventory.module.ts`
9. Modify `GameModule` to import `InventoryModule`
10. Modify `PlayerService.authenticate()` to trigger `inventoryService.loadForPlayer()`
11. Add `inventory:use`, `inventory:drop`, `inventory:pickup`, `equipment:change` handlers to `GameGateway`
12. Emit `inventory:update` after each successful mutation
13. Emit initial `inventory:update` after successful auth

**Verification gate:** Test via WebSocket client — auth, then inventory:use for a consumable, expect inventory:update back with decremented quantity.

### Phase 3: Client state
14. Add `inventory`, `hotbar` state slices to `gameStore.ts`
15. Wire `gameSocket.on('inventory:update', ...)` handler in `gameStore.ts`
16. Wire `gameSocket.on('auth:success', ...)` to also set initial inventory from auth payload

**Verification gate:** After login, `useGameStore.getState().inventory` is populated. Confirm in browser devtools.

### Phase 4: React UI components
17. Build `InventoryPanel.tsx` — grid of 20 slots, item icon + quantity, right-click context menu (use/drop/equip)
18. Build `EquipmentPanel.tsx` — equipment slot targets, shows equipped item icons
19. Build `ActionBar.tsx` — 8 slots, key 1-8 bindings, shows assigned hotbar items
20. Modify `GameUI.tsx` to render `InventoryPanel` and `EquipmentPanel` based on `showInventory`
21. Modify `HUD.tsx` to render `ActionBar`

**Verification gate:** Open inventory in game, items visible, use a consumable via context menu, see inventory:update reflected.

### Phase 5: Polish + game.service.ts integration
22. Modify `game.service.ts` `handleInteraction` — pickup case now calls `inventoryService.pickupItem()` and emits both `inventory:update` and `entity:despawn`
23. Handle `game.service.ts` `handleInteraction` — mineral harvest yields a material item into inventory
24. Handle disconnect: `inventoryService.unloadForPlayer()` called in `PlayerService.handleDisconnect()`

---

## Sources

- Codebase: `packages/tiles/src/registry.ts` — TileRegistry singleton pattern (direct audit)
- Codebase: `packages/tiles/src/types.ts` — TileDefinition interface (direct audit)
- Codebase: `packages/shared-types/src/game/inventory.ts` — existing Inventory types (direct audit)
- Codebase: `packages/shared-types/src/network/events.ts` — existing socket events (direct audit)
- Codebase: `packages/database/src/schema/inventories.ts` — JSONB schema (direct audit)
- Codebase: `packages/database/src/queries/inventory.ts` — existing CRUD (direct audit)
- Codebase: `apps/game-server/src/game/player.service.ts` — in-memory Map pattern (direct audit)
- Codebase: `apps/game-server/src/game/game.gateway.ts` — event handler pattern (direct audit)
- Codebase: `apps/web/src/store/gameStore.ts` — Zustand state shape + socket listener pattern (direct audit)
- Codebase: `apps/web/src/ui/GameUI.tsx` — panel rendering pattern (direct audit)
- Codebase: `apps/web/src/network/socket.ts` — `inventory:update` already listed in serverEvents (direct audit)

---
*Architecture research for: Into the Void — inventory & items system (v1.6)*
*Researched: 2026-02-17*
