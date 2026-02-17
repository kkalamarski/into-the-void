# Phase 26: Server InventoryService & WebSocket Handlers - Research

**Researched:** 2026-02-17
**Domain:** NestJS service architecture, Socket.IO WebSocket handler patterns, atomic in-memory claim maps, server-authoritative stat calculation
**Confidence:** HIGH

---

## Summary

Phase 26 is the first fully server-side inventory phase. Phase 25 delivered all the foundations this phase depends on: the `@into-the-void/items` registry with 100 item definitions, the `InventoryItemJson`/`EquipmentJson` database schema with the exo-suit model, the `updateInventoryFull` atomic DB write, and pure validation functions (`validateEquip`, `validateItemUse`, `validateUnequip`, `resolveEffect`) in `@into-the-void/game-logic`. Phase 26 wires those foundations into NestJS service infrastructure and Socket.IO gateway handlers.

The phase has four plans: (26-01) `InventoryService` NestJS service with in-memory `Map<playerId, Inventory>`, DB load on auth, flush on mutation, flush on disconnect; (26-02) five `@SubscribeMessage` handlers in `GameGateway` (`inventory:pickup`, `inventory:drop`, `inventory:use`, `equipment:change`, `inventory:unequip`) with an in-memory claim map in `ZonesService` for atomic simultaneous pickup prevention; (26-03) wiring `handleInteraction` in `game.service.ts` to write to inventory before broadcasting `entity:despawn`, and emitting `inventory:update` on auth success; (26-04) `effectiveStats(player, equipment): ComputedStats` pure function in `game-logic`, called from combat and interaction validations.

The key architectural constraint confirmed by codebase audit: `DatabaseService` is `@Global()` so `InventoryService` can inject it directly without module re-export wiring. `GameModule` already imports `ZonesModule`. `PlayerService` is the model to follow for in-memory session state with DB-backed auth load. The `shared-types` `Inventory` type (used in `ServerEvents['inventory:update']`) still uses the old `head/chest/legs/feet` equipment model — this must be updated to match the Phase-25-migrated `EquipmentJson` shape before any handler emits `inventory:update`.

The single highest-risk item is the simultaneous pickup race condition (two players, one item). The solution is an in-memory `claimedEntities: Map<entityId, playerId>` in `ZonesService` that acts as a compare-and-swap gate. This is the right approach because the entity state is already in-memory in `ZonesService`; adding a claim side-car to that same service keeps the atomicity guarantee within a single synchronous JavaScript operation (no await between check and claim).

**Primary recommendation:** Follow the `PlayerService` pattern exactly for `InventoryService` — in-memory `Map`, load from DB on auth, flush on every mutation, flush on disconnect. Add the claim map to `ZonesService` as a co-located `Map<entityId, playerId>`. Wire `GameGateway` handlers using `client.emit()` exclusively for `inventory:update`; never `server.to(zoneId).emit()`.

---

## Standard Stack

### Core (All Already Installed — No New Packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/websockets` | `^10.3.0` | `@SubscribeMessage`, `@ConnectedSocket`, `@MessageBody`, `@WebSocketServer` | Already used in `GameGateway`; all handler patterns established |
| `@nestjs/common` | `^10.3.0` | `@Injectable`, `@Global` | NestJS service pattern; `DatabaseService` already `@Global()` |
| `socket.io` | `^4.7.0` | `Server`, `Socket` | Already used; `client.emit()` vs `server.to().emit()` distinction critical |
| `drizzle-orm` | `^0.30.0` | `updateInventoryFull`, `getInventory`, `createInventory` | Phase 25 delivered these DB query functions |
| `@into-the-void/game-logic` | workspace | `validateEquip`, `validateItemUse`, `validateUnequip`, `resolveEffect`, `resolveEffectsForTrigger` | Phase 25 delivered all validation functions |
| `@into-the-void/items` | workspace | `ItemRegistry.get(itemId)` | Phase 25 delivered singleton registry with 100 items |
| `@into-the-void/database` | workspace | `getInventory`, `createInventory`, `updateInventoryFull`, `updateInventoryItems` | Phase 25 delivered all DB functions |

### No New Packages Required for Phase 26

Phase 26 is purely server-side NestJS service wiring. No new npm packages are needed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory `Map<playerId, Inventory>` cache in `InventoryService` | DB read on every inventory operation | DB read adds 5-20ms latency to every inventory handler; in-memory matches `PlayerService` pattern already proven correct in the codebase |
| In-memory claim map in `ZonesService` | DB row-level locking via `SELECT FOR UPDATE` | Row locking requires PostgreSQL transaction wrapping every pickup; in-memory claim map is synchronous (no `await` between check and claim), simpler, and sufficient for single-server deployment |
| `effectiveStats` called on demand per action | Cached effective stats on `ConnectedPlayer` | Cached stats create stale-state exploit surface (server forgets to invalidate after equip); on-demand calculation is the secure default |

**Installation:** No new packages. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/game-server/src/
├── game/
│   ├── game.gateway.ts     # MODIFY: add 5 @SubscribeMessage handlers; wire auth to emit inventory:update
│   ├── game.module.ts      # MODIFY: add InventoryService to providers and exports
│   ├── game.service.ts     # MODIFY: wire handleInteraction for item pickup (inventory write + entity:despawn)
│   ├── game.service.ts     # MODIFY: add handleDrop, handleItemUse, handleEquip, handleUnequip methods
│   ├── player.service.ts   # MODIFY: handleDisconnect calls inventoryService.flush(playerId)
│   ├── player.service.ts   # MODIFY: authenticate calls inventoryService.loadForPlayer(playerId)
│   ├── player.service.ts   # (no structural change — just method calls to InventoryService)
│   └── inventory.service.ts  # NEW: in-memory inventory map, load/flush/mutate methods
│   └── inventory.service.ts  # Mirrors PlayerService structure exactly
├── zones/
│   └── zones.service.ts    # MODIFY: add claimedEntities Map + claimEntity/releaseClaim methods
└── (no new modules — InventoryService lives in GameModule)

packages/game-logic/src/
└── inventory/
    └── stats.ts            # NEW: effectiveStats(player, equipment): ComputedStats pure function
    └── (validation.ts already exists from Phase 25)
    └── (effects.ts already exists from Phase 25)

packages/shared-types/src/
└── game/
    └── inventory.ts        # MODIFY: update Inventory.equipment from old EquipmentSlot model
                            # to match EquipmentJson: { exosuit?, modules[], tool?, accessory1?, accessory2? }
```

### Pattern 1: InventoryService as In-Memory Cache (mirrors PlayerService)

**What:** NestJS injectable service holding a `Map<playerId, Inventory>`. Loads from DB on player auth, flushes to DB on every mutation, removes from map on disconnect.

**When to use:** Any access to player inventory state on the game-server.

**Example:**
```typescript
// Source: Direct codebase audit of player.service.ts (same pattern)
// apps/game-server/src/game/inventory.service.ts

import { Injectable } from '@nestjs/common';
import {
  getInventory,
  createInventory,
  updateInventoryFull,
  updateInventoryItems,
} from '@into-the-void/database';
import type { Inventory, InventoryItemJson, EquipmentJson } from '@into-the-void/database';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InventoryService {
  // In-memory cache: playerId (characterId) -> Inventory
  private inventories: Map<string, Inventory> = new Map();

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Load inventory from DB for a player who just authenticated.
   * Creates a new inventory row if none exists.
   * Called by PlayerService.authenticate() after character is resolved.
   */
  async loadForPlayer(playerId: string): Promise<Inventory> {
    const db = this.databaseService.getClient();
    let inventory = await getInventory(db, playerId);

    if (!inventory) {
      // New character — create inventory row with defaults
      inventory = await createInventory(db, { characterId: playerId });
    }

    this.inventories.set(playerId, inventory);
    return inventory;
  }

  /**
   * Get in-memory inventory for a player.
   * Returns undefined if player is not authenticated (no loaded inventory).
   */
  getInventory(playerId: string): Inventory | undefined {
    return this.inventories.get(playerId);
  }

  /**
   * Remove from in-memory cache and flush final state to DB on disconnect.
   * Called by PlayerService.handleDisconnect().
   */
  async flushAndUnload(playerId: string): Promise<void> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) return;

    // Final flush on disconnect
    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });

    this.inventories.delete(playerId);
  }

  /**
   * Add an item to player inventory (in-memory + DB flush).
   * Returns false if inventory is full.
   */
  async addItem(
    playerId: string,
    item: InventoryItemJson
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) return { success: false, reason: 'Inventory not loaded' };

    if (inventory.items.length >= inventory.maxSlots) {
      return { success: false, reason: 'Inventory is full' };
    }

    // Mutate in-memory
    inventory.items = [...inventory.items, item];

    // Flush to DB
    const db = this.databaseService.getClient();
    await updateInventoryItems(db, playerId, inventory.items);

    return { success: true };
  }

  /**
   * Remove an item by instanceId (in-memory + DB flush).
   */
  async removeItem(
    playerId: string,
    instanceId: string
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) return { success: false, reason: 'Inventory not loaded' };

    const itemIndex = inventory.items.findIndex(i => i.instanceId === instanceId);
    if (itemIndex === -1) return { success: false, reason: 'Item not found in inventory' };

    inventory.items = inventory.items.filter(i => i.instanceId !== instanceId);

    const db = this.databaseService.getClient();
    await updateInventoryItems(db, playerId, inventory.items);

    return { success: true };
  }

  /**
   * Atomically equip an item: remove from items array, set in equipment slot.
   * Uses updateInventoryFull to prevent two-write race (duplication exploit).
   */
  async equipItem(
    playerId: string,
    instanceId: string,
    slot: keyof Omit<EquipmentJson, 'modules'>
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) return { success: false, reason: 'Inventory not loaded' };

    const item = inventory.items.find(i => i.instanceId === instanceId);
    if (!item) return { success: false, reason: 'Item not found in inventory' };

    // Remove from items array
    const newItems = inventory.items.filter(i => i.instanceId !== instanceId);

    // Set in equipment (returns previously equipped item if slot occupied)
    const previouslyEquipped = inventory.equipment[slot];
    const newEquipment: EquipmentJson = {
      ...inventory.equipment,
      [slot]: item,
    };

    // If there was a previously equipped item, return it to inventory
    const finalItems = previouslyEquipped
      ? [...newItems, previouslyEquipped]
      : newItems;

    // CRITICAL: Single atomic write for both columns
    inventory.items = finalItems;
    inventory.equipment = newEquipment;

    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });

    return { success: true };
  }

  /**
   * Equip a module (into the modules array).
   * Uses updateInventoryFull atomically.
   */
  async equipModule(
    playerId: string,
    instanceId: string,
    maxModuleSlots: number
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) return { success: false, reason: 'Inventory not loaded' };

    if (inventory.equipment.modules.length >= maxModuleSlots) {
      return { success: false, reason: 'All module slots are occupied' };
    }

    const item = inventory.items.find(i => i.instanceId === instanceId);
    if (!item) return { success: false, reason: 'Item not found in inventory' };

    const newItems = inventory.items.filter(i => i.instanceId !== instanceId);
    const newEquipment: EquipmentJson = {
      ...inventory.equipment,
      modules: [...inventory.equipment.modules, item],
    };

    inventory.items = newItems;
    inventory.equipment = newEquipment;

    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });

    return { success: true };
  }
}
```

### Pattern 2: In-Memory Claim Map for Simultaneous Pickup Prevention

**What:** `claimedEntities: Map<entityId, playerId>` in `ZonesService` as a synchronous (non-async) gate. The check-and-set happens in a single synchronous block — no `await` between them — making it safe in Node.js's single-threaded event loop.

**When to use:** Any item pickup operation in `GameService.handleInteraction` for `entity.type === 'item'`.

**Critical insight:** Node.js is single-threaded. Two handlers cannot run simultaneously. However, two `inventory:pickup` messages arriving in the same event loop tick will be processed sequentially. The claim map check must happen BEFORE any `await` in the pickup handler — once you hit an `await`, another handler can run and check the same claim. Because `ZonesService.claimEntity` is synchronous (no await), the check-and-set completes atomically from Node.js's perspective.

**Example:**
```typescript
// Source: Direct codebase audit of zones.service.ts (adding to existing service)
// apps/game-server/src/zones/zones.service.ts

// In the ZonesService class, add these fields and methods:

// Claim map: entityId -> playerId who claimed it (in-memory only)
private claimedEntities: Map<string, string> = new Map();

/**
 * Attempt to claim an entity for pickup.
 * Returns true if claim was successful (entity was unclaimed).
 * Returns false if entity is already claimed by another player.
 *
 * SYNCHRONOUS — no await — must be called before any async operation
 * in the pickup handler to prevent race conditions.
 */
claimEntity(entityId: string, playerId: string): boolean {
  if (this.claimedEntities.has(entityId)) {
    return false; // Already claimed by another player
  }
  this.claimedEntities.set(entityId, playerId);
  return true;
}

/**
 * Release a claim (called after pickup completes or fails).
 * If pickup succeeded, the entity is also set inactive, so the claim
 * is redundant but should still be released for memory hygiene.
 */
releaseClaim(entityId: string): void {
  this.claimedEntities.delete(entityId);
}
```

**Usage in pickup handler (game.service.ts):**
```typescript
// CORRECT: claim before any await
const claimed = this.zonesService.claimEntity(entityId, player.id);
if (!claimed) {
  return { success: false, error: 'Item already being picked up' };
}

try {
  // Now safely do async operations — entity is claimed
  const result = await this.inventoryService.addItem(player.id, newItem);
  if (!result.success) {
    this.zonesService.releaseClaim(entityId);
    return { success: false, error: result.reason };
  }

  // Mark entity inactive AFTER inventory write succeeds
  await this.zonesService.despawnEntity(player.position.zoneId, entityId);

  // Do NOT releaseClaim for successful pickup — entity is now inactive,
  // any subsequent check will fail on entity.active === false
  // (releaseClaim for successful pickup is optional for memory cleanup)
  this.zonesService.releaseClaim(entityId);

  return { success: true, zoneId: player.position.zoneId };
} catch (error) {
  this.zonesService.releaseClaim(entityId);
  throw error;
}
```

### Pattern 3: WebSocket Handlers — Private vs Zone-Wide Emit

**What:** Inventory events use `client.emit()` exclusively. Entity events use `this.server.to(zoneId).emit()`. These are always separate calls.

**When to use:** Every inventory handler.

**Example:**
```typescript
// Source: Direct codebase audit of game.gateway.ts (extending existing pattern)
// apps/game-server/src/game/game.gateway.ts

@SubscribeMessage('inventory:pickup')
async handleInventoryPickup(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: ClientEvents['inventory:pickup']
) {
  try {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    const result = await this.gameService.handleItemPickup(
      client.id,
      data.entityId
    );

    if (result.success) {
      // Zone-wide: entity is gone for everyone
      if (result.zoneId) {
        this.server.to(result.zoneId).emit('entity:despawn', {
          entityId: data.entityId,
        });
      }

      // PRIVATE: only the picking-up player receives the inventory update
      if (result.inventory) {
        client.emit('inventory:update', result.inventory);
      }
    } else {
      client.emit('error', {
        code: 'INVALID_TARGET',
        message: result.error || 'Cannot pick up item',
      });
    }
  } catch (error) {
    client.emit('error', {
      code: 'SERVER_ERROR',
      message: 'Failed to process pickup',
    });
  }
}

@SubscribeMessage('inventory:drop')
async handleInventoryDrop(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: ClientEvents['inventory:drop']
) {
  try {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    const result = await this.gameService.handleItemDrop(
      client.id,
      data.instanceId,
      data.quantity
    );

    if (result.success) {
      // Zone-wide: new ground item spawned
      if (result.zoneId && result.groundItem) {
        this.server.to(result.zoneId).emit('entity:spawn', result.groundItem);
      }

      // PRIVATE: updated inventory (item removed)
      if (result.inventory) {
        client.emit('inventory:update', result.inventory);
      }
    } else {
      client.emit('error', {
        code: 'INVALID_ACTION',
        message: result.error || 'Cannot drop item',
      });
    }
  } catch (error) {
    client.emit('error', {
      code: 'SERVER_ERROR',
      message: 'Failed to process drop',
    });
  }
}

@SubscribeMessage('inventory:use')
async handleInventoryUse(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: ClientEvents['inventory:use']
) {
  try {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    const result = await this.gameService.handleItemUse(
      client.id,
      data.instanceId
    );

    if (result.success) {
      // PRIVATE: updated inventory (item consumed) and applied effects
      if (result.inventory) {
        client.emit('inventory:update', result.inventory);
      }
    } else {
      client.emit('error', {
        code: 'INVALID_ACTION',
        message: result.error || 'Cannot use item',
      });
    }
  } catch (error) {
    client.emit('error', {
      code: 'SERVER_ERROR',
      message: 'Failed to use item',
    });
  }
}

@SubscribeMessage('equipment:change')
async handleEquipmentChange(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { instanceId: string; slot?: string }
) {
  try {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    const result = await this.gameService.handleEquip(
      client.id,
      data.instanceId
    );

    if (result.success) {
      if (result.inventory) {
        client.emit('inventory:update', result.inventory);
      }
    } else {
      client.emit('error', {
        code: 'INVALID_ACTION',
        message: result.error || 'Cannot equip item',
      });
    }
  } catch (error) {
    client.emit('error', {
      code: 'SERVER_ERROR',
      message: 'Failed to equip item',
    });
  }
}

@SubscribeMessage('inventory:unequip')
async handleInventoryUnequip(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { instanceId: string }
) {
  try {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    const result = await this.gameService.handleUnequip(
      client.id,
      data.instanceId
    );

    if (result.success) {
      if (result.inventory) {
        client.emit('inventory:update', result.inventory);
      }
    } else {
      client.emit('error', {
        code: 'INVALID_ACTION',
        message: result.error || 'Cannot unequip item',
      });
    }
  } catch (error) {
    client.emit('error', {
      code: 'SERVER_ERROR',
      message: 'Failed to unequip item',
    });
  }
}
```

### Pattern 4: Auth-Time Inventory Load + inventory:update Emit

**What:** After successful auth, `PlayerService.authenticate()` calls `InventoryService.loadForPlayer()`, then `GameGateway` emits `inventory:update` with the loaded inventory alongside `auth:success`.

**When to use:** The `handleAuth` method in `GameGateway`.

**Example:**
```typescript
// In GameGateway.handleAuth, after `result.success && result.player`:

// Load inventory for authenticated player
const inventory = await this.inventoryService.loadForPlayer(result.player.id);

client.emit('auth:success', { player: result.player });
client.emit('zone:state', zoneState);
client.emit('inventory:update', inventory); // Send initial inventory state

// Notify other players (unchanged)
client.to(result.player.position.zoneId).emit('player:joined', { ... });
```

### Pattern 5: effectiveStats Pure Function in game-logic

**What:** A pure function that takes a player's base stats and equipment, returns combined effective stats. No DB calls, no side effects. Called by combat and interaction validators before trusting any stat value.

**When to use:** Any server-side code that needs to use stat values in combat or interaction validation.

**Example:**
```typescript
// NEW: packages/game-logic/src/inventory/stats.ts

import type { EquipmentJson, InventoryItemJson } from '@into-the-void/database';
import { ItemRegistry } from '@into-the-void/items';
import { resolveEffectsForTrigger } from './effects';

/**
 * Computed effective stats derived from base stats + equipment.
 * Server calculates this; client-provided stat values are NEVER trusted.
 */
export interface ComputedStats {
  armor: number;
  speedMultiplier: number;
  hazardResistance: number;
  detectionRange: number;
  energyCapacity: number;
  rechargeRate: number;
  jumpHeight: number;
  // Extended with stat_buff effects when active
  bonuses: Record<string, number>;
}

/**
 * Derive effective stats from equipment.
 * Resolves all 'on_equip' and 'passive' effects from equipped items.
 *
 * Pure function — no DB calls, no side effects.
 * Must be called with the server's authoritative equipment state.
 *
 * @param equipment - Equipment from InventoryService (server-authoritative)
 */
export function effectiveStats(equipment: EquipmentJson): ComputedStats {
  const stats: ComputedStats = {
    armor: 0,
    speedMultiplier: 1.0,
    hazardResistance: 0,
    detectionRange: 0,
    energyCapacity: 100, // base
    rechargeRate: 1.0,
    jumpHeight: 1.0,
    bonuses: {},
  };

  // Collect all equipped items (exosuit, all modules, tool, accessories)
  const equippedItems: InventoryItemJson[] = [
    equipment.exosuit,
    ...equipment.modules,
    equipment.tool,
    equipment.accessory1,
    equipment.accessory2,
  ].filter((item): item is InventoryItemJson => item !== undefined);

  for (const equippedItem of equippedItems) {
    const itemDef = ItemRegistry.get(equippedItem.itemId);
    const effects = resolveEffectsForTrigger(itemDef.effects, 'on_equip');
    effects.push(...resolveEffectsForTrigger(itemDef.effects, 'passive'));

    for (const effect of effects) {
      for (const [stat, value] of Object.entries(effect.applied)) {
        switch (stat) {
          case 'armor':
            stats.armor += value;
            break;
          case 'speedMultiplier':
            stats.speedMultiplier *= value; // Multiplicative
            break;
          case 'hazardResistance':
            stats.hazardResistance += value;
            break;
          case 'detectionRange':
            stats.detectionRange += value;
            break;
          case 'energyCapacity':
            stats.energyCapacity += value;
            break;
          case 'rechargeRate':
            stats.rechargeRate += value;
            break;
          case 'jumpHeight':
            stats.jumpHeight += value;
            break;
          default:
            // Stat buff or unknown — accumulate in bonuses
            stats.bonuses[stat] = (stats.bonuses[stat] ?? 0) + value;
        }
      }
    }
  }

  return stats;
}
```

### Pattern 6: Drop Creates Ground Item Entity with Despawn Timer

**What:** When a player drops an item, a new `ItemEntity` is spawned in the player's zone at the player's position with `despawnAt = Date.now() + 5 * 60 * 1000` (5 minutes). The entity is broadcast zone-wide via `entity:spawn`. The entity is removed from the drop-er's inventory before spawning.

**Example:**
```typescript
// In GameService.handleItemDrop (new method)

async handleItemDrop(
  socketId: string,
  instanceId: string,
  quantity: number
): Promise<DropResult> {
  const player = this.playerService.getPlayerBySocket(socketId);
  if (!player) return { success: false, error: 'Player not found' };

  // Validate quantity > 0
  if (quantity <= 0) {
    return { success: false, error: 'Invalid quantity' };
  }

  // Remove from inventory
  const removeResult = await this.inventoryService.removeItem(player.id, instanceId);
  if (!removeResult.success) {
    return { success: false, error: removeResult.reason };
  }

  const inventory = this.inventoryService.getInventory(player.id)!;

  // Spawn ground item entity (ItemEntity type)
  const groundItem: ItemEntity = {
    id: `item_${crypto.randomUUID()}`,
    type: 'item',
    name: 'Ground Item', // Caller can override from ItemRegistry
    position: player.position,
    active: true,
    itemId: /* from item that was removed */ instanceId, // NOTE: store itemId on removed item first
    quantity,
    despawnAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  };

  await this.zonesService.spawnEntity(player.position.zoneId, groundItem);

  return {
    success: true,
    zoneId: player.position.zoneId,
    groundItem,
    inventory,
  };
}
```

### Pattern 7: Disconnect Flush in PlayerService.handleDisconnect

**What:** `PlayerService.handleDisconnect` must call `inventoryService.flushAndUnload(playerId)` before removing the player from the in-memory map.

**Example:**
```typescript
// Modification to PlayerService.handleDisconnect (apps/game-server/src/game/player.service.ts)

async handleDisconnect(socketId: string): Promise<void> {
  const playerId = this.socketToPlayer.get(socketId);
  if (playerId) {
    // Flush inventory before removing player
    await this.inventoryService.flushAndUnload(playerId);

    const player = this.players.get(playerId);
    if (player) {
      player.online = false;
    }
    this.players.delete(playerId);
    this.socketToPlayer.delete(socketId);
    this.lastMoveTimes.delete(playerId);
  }
}
```

**Injection change to PlayerService constructor:**
```typescript
constructor(
  private readonly jwtService: JwtService,
  private readonly databaseService: DatabaseService,
  private readonly inventoryService: InventoryService, // NEW
) {}
```

### Pattern 8: GameModule Update

**What:** `InventoryService` must be added to `GameModule` providers and exports.

**Example:**
```typescript
// apps/game-server/src/game/game.module.ts (modified)

import { InventoryService } from './inventory.service'; // NEW

@Module({
  imports: [ConfigModule, JwtModule.registerAsync({ ... }), ZonesModule],
  providers: [GameGateway, GameService, PlayerService, InventoryService], // ADD InventoryService
  exports: [GameService, PlayerService, InventoryService],                 // ADD InventoryService
})
export class GameModule {}
```

**Note:** `DatabaseService` is `@Global()` — `InventoryService` can inject it without any module import change.

### Pattern 9: shared-types Inventory Type Update

**What:** `shared-types/src/game/inventory.ts` defines the `Inventory` interface with `equipment: Partial<Record<EquipmentSlot, InventoryItem>>` (old model with `head/chest/legs/feet`). The `ServerEvents['inventory:update']` event sends this type to the client. This must be updated to match the Phase-25-migrated `EquipmentJson` shape.

**The gap:** `InventoryService` holds `Inventory` from the database schema (which uses `EquipmentJson`), but `ServerEvents['inventory:update']` expects `shared-types.Inventory` (which uses the old `EquipmentSlot` model). Emitting the wrong type will either fail TypeScript compilation or send the wrong shape to the client.

**Resolution:** Update `shared-types/src/game/inventory.ts` to:
1. Remove the old `EquipmentSlot` type (`head/chest/legs/feet/hands/mainHand/offHand/accessory1/accessory2`)
2. Define `Inventory.equipment` as `{ exosuit?: InventoryItem; modules: InventoryItem[]; tool?: InventoryItem; accessory1?: InventoryItem; accessory2?: InventoryItem }`
3. Keep `InventoryItem` interface unchanged (matches `InventoryItemJson`)

This is a breaking change in `shared-types` that affects the client-side type definitions. Phase 27 (client inventory UI) will consume the corrected type. Verify: `nx run game-logic:build` and `nx run web:build` pass after the type update.

### Anti-Patterns to Avoid

- **Calling `updateInventoryItems` + `updateEquipment` separately for equip operations:** Always use `updateInventoryFull`. The two-call pattern is a documented duplication exploit vector.

- **Emitting `inventory:update` via `server.to(zoneId).emit()`:** All inventory events are private. Use `client.emit('inventory:update', inventory)` exclusively. Never zone-broadcast inventory state.

- **Checking claim AFTER an await:** The claim map check must happen synchronously before any `await` in the pickup handler. Once you hit `await`, another handler could run and check the same entity.

- **Calculating effective stats on the client and trusting the result server-side:** The server must derive `effectiveStats()` from its own `InventoryService` state for every combat and interaction validation.

- **Spawning the ground item entity before writing to inventory:** Write inventory first, spawn entity only after DB confirms. If you spawn first and the inventory write fails, the item is lost — the ground item exists but nothing removed it from inventory (creating a duplicate).

- **Broadcasting `entity:despawn` before inventory write succeeds:** Entity despawn is irreversible for this session (entity becomes inactive). If the inventory write then fails, the item is destroyed. Always: inventory write → entity despawn → emit both events.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Simultaneous pickup prevention | Custom transaction/locking system | `ZonesService.claimEntity(entityId, playerId)` synchronous Map | Node.js event loop guarantees synchronous code runs atomically; simple Map is sufficient |
| Atomic equip/unequip DB write | Two separate `await db.update()` calls | `updateInventoryFull` (Phase 25 delivered) | Single SQL UPDATE with two columns is inherently atomic; two awaits have a crash window |
| Item definition lookup at runtime | Custom caching layer | `ItemRegistry.get(itemId)` (Phase 25 delivered) | O(1) Map lookup, singleton registered at module load |
| Effect resolution for item use | Custom switch/case per handler | `resolveEffectsForTrigger(effects, 'on_use')` (Phase 25 delivered) | Handles all 10 ItemEffect types exhaustively with console.warn fallback |
| Equipment validation | Custom level/slot checks per handler | `validateEquip(item, level, moduleCount, suitSlots)` (Phase 25 delivered) | Already covers level requirement + module slot availability + category restriction |
| Inventory full check | Custom count comparison per handler | `validateUnequip(inventoryCount, maxSlots)` (Phase 25 delivered) | Consistent check, covers edge cases |
| Ground item UUID | Custom ID generation | `crypto.randomUUID()` (built-in Node.js 18+) | Already used in `GameGateway.handleChat`; no dependency needed |
| 5-minute despawn timer persistence | Custom timer queue with persistence | `despawnAt: Date.now() + 5 * 60 * 1000` stored on `ItemEntity.despawnAt` | `ItemEntity` already has `despawnAt: number` field; simple timestamp comparison on read |

**Key insight:** Phase 25 deliberately built all the pure functions this phase needs. Phase 26's job is wiring, not building new algorithms. Every custom solution is a mistake.

---

## Common Pitfalls

### Pitfall 1: Race Condition on Simultaneous Item Pickup

**What goes wrong:** Two clients send `inventory:pickup { entityId: 'X' }` within the same event loop tick. Node.js processes them sequentially. Handler 1 checks `entity.active` (true), starts async DB write. Handler 2 checks `entity.active` (also still true — handler 1 hasn't set it to false yet, it awaited). Both handlers complete. Both players receive the item.

**Why it happens:** The check (`entity.active`) and the set (`entity.active = false`) are separated by an `await` in handler 1. This allows handler 2 to read the pre-write state.

**How to avoid:** Add `ZonesService.claimEntity(entityId, playerId)` — a synchronous Map operation that runs BEFORE any `await` in the pickup handler. If claim fails, return error immediately. Release claim on failure; release (or don't — entity is inactive) on success.

**Warning signs:** Two players report having the same item after simultaneous pickup. Item count exceeds expected total. Server logs show two successful `inventory:pickup` operations for the same `entityId`.

### Pitfall 2: Broadcasting inventory:update to Zone Instead of Client

**What goes wrong:** Developer copies the existing zone broadcast pattern (`this.server.to(zoneId).emit(...)`) for the `inventory:update` emit. Every player in the zone receives every other player's inventory state.

**Why it happens:** The existing gateway has 3 patterns of `this.server.to(result.zoneId).emit(...)` (zone-wide) and only 1 pattern of `client.emit(...)` (private). Copy-paste error is likely.

**How to avoid:** All inventory state events MUST use `client.emit('inventory:update', inventory)`. This rule applies to all 5 new handlers and the auth-time inventory send.

**Warning signs:** Client B's inventory panel populates when client A picks up an item. Network inspector on client B shows `inventory:update` events triggered by client A's actions.

### Pitfall 3: Spawning Entity Before Inventory Write

**What goes wrong:** `handleDrop` spawns the ground item entity first (zone-wide `entity:spawn` broadcast), then calls `inventoryService.removeItem()`. The inventory write fails (DB down, etc.). The ground item is now visible to everyone, and the item is still in the player's inventory — a duplication.

**Why it happens:** `entity:spawn` feels like it should come first (it's the cause, inventory is the effect). But from a data integrity standpoint, the inventory write is the authoritative source.

**How to avoid:** Always order: (1) inventory write, (2) entity state change, (3) emit events. If step 1 fails, abort. If step 2 fails after step 1 succeeds, this is an inconsistency to log and handle (item removed from inventory but no ground item created — prefer this over duplication).

**Warning signs:** Item appears as ground entity but is also still in the player's inventory after a server error during drop.

### Pitfall 4: InventoryService Not Injected Into PlayerService (Circular Dependency)

**What goes wrong:** `PlayerService` needs to call `InventoryService.loadForPlayer()` during `authenticate()` and `InventoryService.flushAndUnload()` during `handleDisconnect()`. If `InventoryService` also injects `PlayerService`, there is a circular dependency. NestJS will fail to construct the module with "circular dependency detected."

**Why it happens:** It's tempting to have `InventoryService` call `PlayerService.getPlayerById()` to validate that the player exists before loading inventory.

**How to avoid:** `InventoryService` must NOT inject `PlayerService`. `InventoryService` receives `playerId` (characterId) as a parameter — it trusts the caller has already validated the player exists. The dependency is one-directional: `PlayerService` → `InventoryService` (and `GameService` → `InventoryService`).

**Warning signs:** NestJS startup error mentioning "circular dependency" involving `InventoryService` and `PlayerService`.

### Pitfall 5: effectiveStats Not Called Before Combat Resolution

**What goes wrong:** Combat damage calculation in `calculateCombat()` takes `attackerStats` as a parameter. If the caller passes stats from the `player` object (base stats) without adding equipment bonuses, equipped armor provides no protection. The first equipped module is silently ineffective.

**Why it happens:** The existing `calculateDamage` signature accepts optional `attackerStats?: Partial<PlayerStats>`. The path of least resistance is passing `player.stats` directly, which doesn't include equipment bonuses.

**How to avoid:** Before any combat resolution, call `const computed = effectiveStats(inventory.equipment)` and merge the computed values into the stat parameters. The `game-logic` `calculateDamage` function's `armorReduction` parameter should receive `computed.armor`.

**Warning signs:** Players report receiving full damage when wearing armor. Equipment screen shows item stats but combat doesn't change. Test: equip an armor module, take damage, verify damage is reduced by the module's armor value.

### Pitfall 6: shared-types Inventory Type Not Updated Before Implementation

**What goes wrong:** `ServerEvents['inventory:update']` is typed as `import('../game/inventory').Inventory`. The `Inventory` interface in `shared-types/game/inventory.ts` still has `equipment: Partial<Record<EquipmentSlot, InventoryItem>>` (old model). `InventoryService` holds `Inventory` from the database schema (new `EquipmentJson` model). TypeScript will either: (a) fail to compile when emitting the database `Inventory` type as a `ServerEvents['inventory:update']` payload, or (b) silently pass because both have an `equipment` field, but the client receives the wrong shape.

**Why it happens:** The database schema and shared-types have separate `Inventory`-like types. Phase 25 updated the DB schema but not `shared-types/game/inventory.ts`.

**How to avoid:** Update `shared-types/src/game/inventory.ts` in plan 26-01 or 26-02 before adding inventory handler code. Verify `nx run web:build` still passes after the type update.

**Warning signs:** TypeScript compiler error when `client.emit('inventory:update', inventory)` is called with a database `Inventory` object. Or: client receives `inventory:update` where `equipment.exosuit` is undefined even though it should be set (old equipment format was sent).

### Pitfall 7: Instance ID Not Preserved Through Pickup Flow

**What goes wrong:** When a player picks up a ground `ItemEntity`, the server must convert the `ItemEntity` into an `InventoryItemJson` with a stable `instanceId`. If `instanceId` is re-generated on pickup (instead of being carried from the entity), action bar references that were set before a drop-and-pickup cycle break — the same item gets a new `instanceId` on pickup, invalidating any hotkey assignments.

**Why it happens:** `ItemEntity` has an `id` (entity ID) and an `itemId` (definition ID) but no `instanceId` field for the inventory-level instance. Developers may generate a new UUID when adding to inventory.

**How to avoid:** When a player drops an item (creating a ground entity), embed the `instanceId` from the `InventoryItemJson` into the `ItemEntity`'s `name` field or add a custom field. On pickup, read the `instanceId` from the entity to create the `InventoryItemJson`. This preserves the instance through a drop-pickup cycle. Alternatively: always generate a new `instanceId` on pickup and document that hotkey references auto-invalidate on `inventory:update` (which is the design from prior decisions — action bar uses instance-ID references that auto-invalidate on every `inventory:update`).

**Per prior decisions:** Action bar hotbar assignments use `instanceId` references and auto-invalidate on every `inventory:update`. This means generating a new `instanceId` on pickup is acceptable — the action bar simply loses the binding after a drop-and-pickup cycle. Document this behavior explicitly.

---

## Code Examples

### InventoryService — Full Structure

```typescript
// Source: Pattern derived from PlayerService (direct codebase audit)
// apps/game-server/src/game/inventory.service.ts

import { Injectable } from '@nestjs/common';
import {
  getInventory,
  createInventory,
  updateInventoryFull,
  updateInventoryItems,
} from '@into-the-void/database';
import type { Inventory, InventoryItemJson, EquipmentJson } from '@into-the-void/database';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InventoryService {
  private inventories: Map<string, Inventory> = new Map();

  constructor(private readonly databaseService: DatabaseService) {}

  async loadForPlayer(playerId: string): Promise<Inventory> {
    const db = this.databaseService.getClient();
    let inventory = await getInventory(db, playerId);
    if (!inventory) {
      inventory = await createInventory(db, { characterId: playerId });
    }
    this.inventories.set(playerId, inventory);
    return inventory;
  }

  getInventory(playerId: string): Inventory | undefined {
    return this.inventories.get(playerId);
  }

  async flushAndUnload(playerId: string): Promise<void> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) return;
    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });
    this.inventories.delete(playerId);
  }

  // addItem, removeItem, equipItem, equipModule, unequipItem methods
  // (see Pattern 1 for full implementations)
}
```

### GameModule — Updated Providers

```typescript
// Source: Direct codebase audit of game.module.ts
// apps/game-server/src/game/game.module.ts (modified)

@Module({
  imports: [ConfigModule, JwtModule.registerAsync({ ... }), ZonesModule],
  providers: [GameGateway, GameService, PlayerService, InventoryService],
  exports: [GameService, PlayerService, InventoryService],
})
export class GameModule {}
```

### Claim Map in ZonesService

```typescript
// Source: Direct codebase audit of zones.service.ts (adding synchronous methods)
// Claim map must be synchronous — no async operations between check and set

private claimedEntities: Map<string, string> = new Map();

claimEntity(entityId: string, playerId: string): boolean {
  if (this.claimedEntities.has(entityId)) return false;
  this.claimedEntities.set(entityId, playerId);
  return true;
}

releaseClaim(entityId: string): void {
  this.claimedEntities.delete(entityId);
}
```

### Auth-Time Inventory Emit

```typescript
// Source: Direct codebase audit of game.gateway.ts handleAuth method
// Modification: emit inventory:update after auth:success

if (result.success && result.player) {
  this.updatePlayerRooms(client, result.player.position.zoneId);
  const zoneState = await this.gameService.getZoneState(result.player.position.zoneId);

  // Load inventory for this session
  const inventory = await this.inventoryService.loadForPlayer(result.player.id);

  client.emit('auth:success', { player: result.player });
  client.emit('zone:state', zoneState);
  client.emit('inventory:update', inventory); // Initial inventory state

  client.to(result.player.position.zoneId).emit('player:joined', { ... });
}
```

### shared-types Inventory Type Update

```typescript
// Source: packages/shared-types/src/game/inventory.ts — MODIFY

// REMOVE:
// export type EquipmentSlot = 'head' | 'chest' | 'legs' | 'feet' | 'hands' | 'mainHand' | 'offHand' | 'accessory1' | 'accessory2';

// ADD (matching EquipmentJson from database schema):
export interface InventoryEquipment {
  exosuit?: InventoryItem;
  modules: InventoryItem[];
  tool?: InventoryItem;
  accessory1?: InventoryItem;
  accessory2?: InventoryItem;
}

// UPDATE Inventory interface:
export interface Inventory {
  characterId: string;
  items: InventoryItem[];
  maxSlots: number;
  equipment: InventoryEquipment; // CHANGED from Partial<Record<EquipmentSlot, InventoryItem>>
}
```

---

## Type Mapping: Database vs shared-types

Phase 26 straddles two inventory type systems that need alignment:

| Field | Database (`@into-the-void/database`) | shared-types (`@into-the-void/shared-types`) | Action |
|-------|--------------------------------------|---------------------------------------------|--------|
| `items` | `InventoryItemJson[]` | `InventoryItem[]` | Same shape — `InventoryItem` and `InventoryItemJson` are structurally identical |
| `equipment` | `EquipmentJson { exosuit?, modules[], tool?, accessory1?, accessory2? }` | `Partial<Record<EquipmentSlot, InventoryItem>>` (old) | **MUST UPDATE** shared-types to match |
| `maxSlots` | `number` | `number` | Same |
| `characterId` | `string` | `string` | Same |

The `InventoryItemJson` (database) and `InventoryItem` (shared-types) are structurally identical:
- `instanceId: string`
- `itemId: string`
- `quantity: number`
- `slot: number`
- `properties: Record<string, unknown>`

So `InventoryService` can return the database `Inventory` type directly to `client.emit('inventory:update', ...)` once `shared-types` is updated to use the new equipment model.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `handleInteraction` for item type: sets `entity.active = false`, no inventory write | Wire to `InventoryService.addItem()` before despawn | Phase 26 | Items no longer lost on pickup |
| `inventory:pickup`, `inventory:drop`, `inventory:use` defined in `ClientEvents` but not implemented | 5 `@SubscribeMessage` handlers in `GameGateway` | Phase 26 | Server accepts and processes all 5 inventory events |
| `PlayerService.handleDisconnect` comment: "In a real implementation, save player state" | Calls `inventoryService.flushAndUnload(playerId)` | Phase 26 | Inventory persists across sessions |
| Stats from `player` object passed to combat (no equipment bonuses) | `effectiveStats(equipment)` called before combat resolution | Phase 26 | Equipment stat bonuses applied server-side |
| `shared-types Inventory.equipment` uses old `head/chest/legs/feet` model | Updated to `{ exosuit?, modules[], tool?, accessory1?, accessory2? }` | Phase 26 (prerequisite to plan 26-02) | Type-safe `inventory:update` event payload |

**Deprecated/outdated after Phase 26:**
- `handleInteraction` stub for `entity.type === 'item'` (returns success + `entityChanges: { active: false }` with no inventory write) — replaced by `handleItemPickup` with actual inventory write
- Comment "In a real implementation, save player state to database" in `PlayerService.handleDisconnect` — replaced by actual `flushAndUnload` call

---

## Open Questions

1. **Should `InventoryService` be injected into `GameGateway` directly or accessed only through `GameService`?**
   - What we know: `PlayerService` is injected into `GameGateway` directly (for `getPlayerBySocket`). `GameService` is also injected into `GameGateway` directly.
   - What's unclear: Whether `GameGateway` should call `inventoryService.loadForPlayer()` directly in `handleAuth`, or delegate to `playerService.authenticate()` which then calls `inventoryService`.
   - Recommendation: Keep inventory loading in `GameGateway.handleAuth` for clarity — `GameGateway` is already the coordinator for auth. Pass inventory to `client.emit` directly. This matches the existing pattern where `GameGateway.handleAuth` calls `playerService.authenticate()` then directly does `client.emit('auth:success', ...)` and `client.emit('zone:state', ...)`.

2. **Should the despawn timer for dropped items use `setTimeout` on the server?**
   - What we know: `ItemEntity` has `despawnAt: number` timestamp. `ZonesService.getZoneEntities` already filters by `entity.active`. The current `ZonesService` uses LRU cache with 5-minute TTL — zones can be evicted from memory.
   - What's unclear: Whether dropped items need active server-side cleanup (setTimeout to set `entity.active = false`) or whether checking `despawnAt` at read time is sufficient.
   - Recommendation: Filter `despawnAt` at read time in `ZonesService.getZoneEntities` — add `&& Date.now() < (e.despawnAt ?? Infinity)` to the active filter. This avoids timer management entirely. Items that the client sees disappear on next zone refresh. Add a TODO to Phase 28+ for proper cleanup on zone eviction.

3. **What happens to dropped items when a zone is evicted from the LRU cache?**
   - What we know: `ZonesService` uses `LRUCache` with 500-zone cap and 5-minute TTL. Zone eviction calls `loadZone()` which regenerates chunk from world gen seed — world items are NOT persisted to DB.
   - What's unclear: Whether dropped items should survive zone eviction (require DB persistence) or be ephemeral (lost when zone unloads).
   - Recommendation: For Phase 26, make dropped items ephemeral (in-memory only). They exist for the 5-minute despawn timer window; if the zone evicts before that, items are lost. This matches the "5-minute despawn timer" requirement. Phase 28+ can add DB persistence for world items if needed. Document this limitation in the PLAN.md.

4. **Does `effectiveStats` need to handle active `stat_buff` effects from consumable use?**
   - What we know: `stat_buff` effects have a `duration` field (timed buffs). `resolveEffect` returns `duration` in the result. The player object in `PlayerService` has no field for tracking active timed buffs.
   - What's unclear: Whether Phase 26 should implement the timed buff tracking infrastructure or document it as out of scope.
   - Recommendation: For Phase 26, `effectiveStats` derives stats from equipment only (`on_equip` + `passive` effects). Active timed buffs from consumables are noted as future work. The `resolveEffect` for `stat_buff` returns `{ type: 'stat_buff', applied: { [stat]: amount }, duration }` — the server applies the delta to the player in memory but does not implement timer cleanup in Phase 26. This is a documented limitation, not a bug.

---

## Sources

### Primary (HIGH confidence — direct codebase audit)

- `apps/game-server/src/game/game.gateway.ts` — Existing `@SubscribeMessage` patterns, `client.emit` vs `server.to().emit` patterns, auth handler structure
- `apps/game-server/src/game/game.service.ts` — `handleInteraction` stub showing what must be replaced, `InteractionResult` interface
- `apps/game-server/src/game/player.service.ts` — In-memory Map pattern, `authenticate()` structure, `handleDisconnect()` structure — `InventoryService` mirrors this exactly
- `apps/game-server/src/game/game.module.ts` — Module providers/exports — add `InventoryService`
- `apps/game-server/src/zones/zones.service.ts` — `ZoneState` with in-memory `Map<string, Entity>` — claim map added as side-car
- `apps/game-server/src/database/database.service.ts` — `@Global()` confirmed, `getClient()` method
- `apps/game-server/src/database/database.module.ts` — `@Global()` module — no import needed in `GameModule`
- `packages/database/src/queries/inventory.ts` — `getInventory`, `createInventory`, `updateInventoryFull`, `updateInventoryItems`, `updateEquipment` (Phase 25 delivered)
- `packages/database/src/schema/inventories.ts` — `InventoryItemJson`, `EquipmentJson`, `Inventory`, `NewInventory` types
- `packages/game-logic/src/inventory/validation.ts` — `validateEquip`, `validateItemUse`, `validateUnequip` (Phase 25 delivered)
- `packages/game-logic/src/inventory/effects.ts` — `resolveEffect`, `resolveEffectsForTrigger` (Phase 25 delivered)
- `packages/game-logic/src/index.ts` — Exports inventory module
- `packages/items/src/registry.ts` — `ItemRegistry.get(itemId)` singleton
- `packages/items/src/index.ts` — Auto-registration on module import
- `packages/shared-types/src/network/events.ts` — `ClientEvents` (5 inventory events defined), `ServerEvents['inventory:update']` (needs type update)
- `packages/shared-types/src/game/inventory.ts` — Old `Inventory` type with `head/chest/legs/feet` equipment model — MUST update
- `packages/shared-types/src/core/entity.ts` — `ItemEntity` interface with `despawnAt: number` field
- `.planning/research/PITFALLS.md` (Part 3: Inventory pitfalls) — Simultaneous pickup, inventory broadcast leak, atomic write, stat calculation exploit surface — all verified
- `.planning/phases/25-item-data-model-foundation/25-RESEARCH.md` — Phase 25 research; all prior decisions
- `.planning/phases/25-item-data-model-foundation/25-04-SUMMARY.md` — Phase 25 completion confirmation

### Secondary (MEDIUM confidence)

- NestJS WebSocket documentation patterns — `@SubscribeMessage`, `@ConnectedSocket`, `@MessageBody` decorators confirmed against installed `@nestjs/websockets ^10.3.0`; patterns already in use in `game.gateway.ts`
- NestJS DI circular dependency behavior — `@Global()` module injection; one-directional dependency requirement confirmed against NestJS 10 module resolution behavior (training data, consistent with codebase pattern)

### Tertiary (LOW confidence)

- Drizzle ORM `createInventory` behavior on first login — `createInventory` returning the new row is assumed based on `db.insert().values().returning()` pattern in `inventory.ts`; verified by reading the query function directly (HIGH confidence for this specific claim)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all dependencies confirmed installed and used
- Architecture patterns: HIGH — all patterns derived from direct codebase audit of existing services; `InventoryService` mirrors `PlayerService` structure exactly
- Claim map for pickup: HIGH — synchronous Map approach confirmed correct for Node.js single-threaded event loop; prior research documented this pattern
- Type alignment (shared-types vs database): HIGH — discrepancy confirmed by reading both `shared-types/game/inventory.ts` and `database/schema/inventories.ts`
- effectiveStats pure function: HIGH — pattern derived from Phase 25 `resolveEffectsForTrigger` which already exists; function structure is straightforward composition
- Open questions: MEDIUM — despawn/zone-eviction interaction and timed buff tracking are genuinely unclear design decisions, not research failures

**Research date:** 2026-02-17
**Valid until:** 2026-03-19 (30 days — all dependencies are version-locked in package.json; NestJS 10.3, Socket.IO 4.7, Drizzle 0.30 are stable)
