---
phase: 26-server-inventoryservice-websocket-handlers
verified: 2026-02-17T22:00:00Z
status: gaps_found
score: 8/9 must-haves verified
gaps:
  - truth: "Server uses effectiveStats for combat damage reduction calculation"
    status: failed
    reason: "effectiveStats is defined and exported in @into-the-void/game-logic but is not called anywhere in apps/. Combat handling in game.service.ts is a stub that only sets player.inCombat = true (case 'creature'). No damage reduction calculation exists that uses ComputedStats."
    artifacts:
      - path: "packages/game-logic/src/inventory/stats.ts"
        issue: "Function exists and is correct but is orphaned — no consumer in apps/"
      - path: "apps/game-server/src/game/game.service.ts"
        issue: "case 'creature' in handleInteraction only sets inCombat flag — no combat damage calculation that would use effectiveStats"
    missing:
      - "effectiveStats called in combat damage calculation path in game.service.ts or equivalent combat service"
      - "Either a combat handler that invokes effectiveStats(player.equipment).armor for damage reduction, OR scope acknowledgment that this truth is deferred to a combat phase"
---

# Phase 26: Server InventoryService & WebSocket Handlers Verification Report

**Phase Goal:** The server is the authoritative source for inventory state — pickup, drop, use, and equip operations are validated, persisted atomically, and emitted only to the owning player
**Verified:** 2026-02-17T22:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | InventoryService loads inventory from DB on player auth and stores in memory | VERIFIED | `handleAuth` in game.gateway.ts:92 calls `this.inventoryService.loadForPlayer(result.player.id)` before emitting `auth:success` |
| 2 | InventoryService flushes inventory to DB on player disconnect | VERIFIED | `PlayerService.handleDisconnect` at player.service.ts:88 calls `await this.inventoryService.flushAndUnload(playerId)` |
| 3 | shared-types Inventory type uses exo-suit equipment model matching database schema | VERIFIED | `InventoryEquipment` in shared-types/src/game/inventory.ts:71 matches `EquipmentJson` in database schema — exosuit/modules/tool/accessory1/accessory2 |
| 4 | Two players simultaneously interact with same world item — exactly one receives it | VERIFIED | `claimEntity` in zones.service.ts:99 is synchronous, called before first `await` in `handleItemPickup` at game.service.ts:218 — TOCTOU gap eliminated |
| 5 | Player uses consumable via inventory:use — effect applied server-side, item removed | VERIFIED | `handleItemUse` at game.service.ts:299 calls `validateItemUse`, `resolveEffectsForTrigger('on_use')`, applies health/energy effects to player object, then calls `inventoryService.removeItem` |
| 6 | Player drops item via inventory:drop — ground item entity spawns at player position with 5-minute despawnAt | VERIFIED | `handleItemDrop` at game.service.ts:261 creates `ItemEntity` with `despawnAt: Date.now() + 5 * 60 * 1000` and calls `zonesService.spawnEntity` |
| 7 | Player receives inventory:update event immediately after successful auth | VERIFIED | game.gateway.ts:97 emits `client.emit('inventory:update', inventory)` after `auth:success` and `zone:state` |
| 8 | Inventory is persisted to DB when player disconnects | VERIFIED | Confirmed same as truth #2 — `flushAndUnload` calls `updateInventoryFull` at inventory.service.ts:57 |
| 9 | Server uses effectiveStats for combat damage reduction calculation | FAILED | `effectiveStats` is defined in packages/game-logic/src/inventory/stats.ts and exported, but no application code calls it — combat in game.service.ts case 'creature' only sets `inCombat = true` with no damage calculation |

**Score:** 8/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/game-server/src/game/inventory.service.ts` | In-memory cache with load/flush/mutate methods | VERIFIED | 277 lines. Has `Map<string, Inventory>`, `loadForPlayer`, `flushAndUnload`, `addItem`, `removeItem`, `equipItem`, `equipModule`, `unequipItem`, `unequipModule` |
| `packages/shared-types/src/game/inventory.ts` | Updated Inventory interface with InventoryEquipment type | VERIFIED | Contains `InventoryEquipment` interface; `ItemRarity` 5 tiers; `ItemCategory` 6 types; `Inventory` with `equipment: InventoryEquipment` |
| `apps/game-server/src/game/game.module.ts` | InventoryService registered as provider and export | VERIFIED | Line 22: `providers: [GameGateway, GameService, PlayerService, InventoryService]`; Line 23: `exports: [GameService, PlayerService, InventoryService]` |
| `apps/game-server/src/game/game.gateway.ts` | 5 @SubscribeMessage handlers for inventory events | VERIFIED | 11 total `@SubscribeMessage` handlers (6 pre-existing + 5 new: inventory:pickup, inventory:drop, inventory:use, equipment:change, inventory:unequip) |
| `apps/game-server/src/zones/zones.service.ts` | Claim map for atomic pickup prevention | VERIFIED | `claimedEntities: Map<string, string>` at line 17; `claimEntity`/`releaseClaim` methods at lines 99-112; `despawnAt` filtering in `getZoneEntities` at lines 121-124 |
| `apps/game-server/src/game/game.service.ts` | Handler methods for pickup/drop/use/equip/unequip | VERIFIED | `handleItemPickup`, `handleItemDrop`, `handleItemUse`, `handleEquip`, `handleUnequip` — all implemented with real logic, no stubs |
| `packages/game-logic/src/inventory/stats.ts` | effectiveStats pure function and ComputedStats interface | VERIFIED (ORPHANED) | Function exists, is correct, accumulates armor/speedMultiplier/hazardResistance/etc., but no consumer in apps/ |
| `packages/game-logic/src/index.ts` | Public export of stats module | VERIFIED | Line 23: `export * from './inventory/stats'` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `game.gateway.ts` | `inventory.service.ts` | `loadForPlayer` call in `handleAuth` | WIRED | game.gateway.ts:92 `await this.inventoryService.loadForPlayer(result.player.id)` |
| `player.service.ts` | `inventory.service.ts` | `flushAndUnload` call in `handleDisconnect` | WIRED | player.service.ts:88 `await this.inventoryService.flushAndUnload(playerId)` |
| `game.gateway.ts` | `game.service.ts` | handler calls to gameService methods | WIRED | game.gateway.ts:316 `this.gameService.handleItemPickup(client.id, data.entityId)` etc. |
| `game.service.ts` | `inventory.service.ts` | inventory mutations in all handlers | WIRED | `this.inventoryService.addItem`, `removeItem`, `equipItem`, `equipModule`, `unequipItem`, `unequipModule` all present |
| `game.service.ts` | `zones.service.ts` | `claimEntity` for atomic pickup | WIRED | game.service.ts:218 `this.zonesService.claimEntity(entityId, player.id)` before first `await` |
| `inventory.service.ts` | `@into-the-void/database` | imports getInventory/createInventory/updateInventoryFull | WIRED | inventory.service.ts:2-10 imports confirmed |
| `game.module.ts` | `inventory.service.ts` | provider registration | WIRED | game.module.ts:22-23 confirmed |
| `stats.ts` | `@into-the-void/items` | `ItemRegistry.get()` | WIRED | stats.ts:52 `ItemRegistry.get(equippedItem.itemId)` |
| `stats.ts` | `effects.ts` | `resolveEffectsForTrigger` | WIRED | stats.ts:56 `resolveEffectsForTrigger(itemDef.effects, 'on_equip')` |
| `apps/` (any) | `stats.ts` | `effectiveStats()` for combat damage | NOT WIRED | No application code calls effectiveStats — orphaned |

### Requirements Coverage

No requirements.md rows mapped to this phase were checked — REQUIREMENTS.md scoping not verified.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/game-server/src/game/game.service.ts` | 330 | `// Note: stat_buff with duration tracked separately (future work)` | Info | Known acknowledged gap — timed stat buffs not implemented; not a blocker for phase goal |
| `apps/game-server/src/game/game.service.ts` | 201-202 | `// Initiate combat (simplified)` — only sets `inCombat = true` | Warning | Combat is a stub; effectiveStats cannot be exercised via combat path |
| `packages/game-logic/src/inventory/stats.ts` | 30 | `effectiveStats` exported but never called from apps/ | Warning | Orphaned function — plan 04 truth #3 ("Server uses effectiveStats for combat damage reduction") is not satisfied |

### Human Verification Required

#### 1. Simultaneous Pickup Race Condition

**Test:** Connect two WebSocket clients authenticated as different players in the same zone. Send `inventory:pickup` with the same `entityId` from both clients at the same millisecond.
**Expected:** Exactly one client receives `inventory:update` with the item added; the other receives an `error` event with code `INVALID_TARGET` and message `'Item already being picked up'`. The item is despawned once, not twice.
**Why human:** Race condition correctness requires a live server and concurrent network traffic — cannot verify from static code that the synchronous claim executes before the first async operation under load.

#### 2. Inventory Persistence on Disconnect

**Test:** Pick up items and equip an exo-suit on a connected player, then disconnect the WebSocket without calling any explicit flush. Reconnect with the same character and verify inventory state matches.
**Expected:** All picked-up items and equipment state appear on reconnect, confirming `flushAndUnload` persisted to DB before the player was evicted from memory.
**Why human:** Requires a live database and connection lifecycle; cannot verify DB write actually committed from code analysis alone.

#### 3. Private Inventory Emission

**Test:** Two players in the same zone. Player A picks up an item. Observe Player B's received events.
**Expected:** Player B receives `entity:despawn` for the item. Player B does NOT receive `inventory:update`. Only Player A receives `inventory:update`.
**Why human:** Requires live multiplayer session to verify emit scoping (client.emit vs server.to) behaves correctly at runtime.

### Gaps Summary

One gap blocks full goal achievement:

**Truth 9 — effectiveStats not wired to combat:** Plan 04's third observable truth states "Server uses effectiveStats for combat damage reduction calculation." The `effectiveStats` function was implemented correctly as a pure function and exported, but no combat damage calculation exists in the server that calls it. The `case 'creature'` in `handleInteraction` is a noted stub that only sets `player.inCombat = true`. The function is orphaned.

This gap does not block the core phase goal ("pickup, drop, use, and equip operations are validated, persisted atomically, and emitted only to the owning player") — that goal is fully achieved. The gap is specific to plan 04's third truth about combat integration, which may belong to a future combat phase rather than this inventory phase.

The phase goal itself (server-authoritative inventory state for pickup/drop/use/equip) is ACHIEVED. The single gap is in a supplementary plan (04) whose combat integration truth was over-scoped for this phase given that no combat system exists yet.

---

_Verified: 2026-02-17T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
