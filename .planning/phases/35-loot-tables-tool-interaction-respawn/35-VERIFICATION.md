---
phase: 35-loot-tables-tool-interaction-respawn
verified: 2026-02-18T16:43:06Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 35: Loot Tables, Tool Interaction, and Respawn Verification Report

**Phase Goal:** Players can use tools on entities in range to harvest resources and trigger loot drops that persist on the ground; a respawn tick loop reactivates depleted entities at their original spawn points after a randomized delay
**Verified:** 2026-02-18T16:43:06Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Player equips a tool and sends `entity:tool_use` — server validates range via `canInteract()` before processing; interaction beyond tool range is silently rejected | VERIFIED | `EntityService.handleToolUse()` reads `toolDef?.range ?? DEFAULT_INTERACTION_RANGE`, calls `canInteract(player, entity, toolRange)`, returns `{ success: false }` on failure; `@SubscribeMessage('entity:tool_use')` handler in `GameGateway` wired to `entityService.handleToolUse()` |
| 2 | Creature death or mineral/plant depletion spawns ground items matching the entity's weighted loot table — items visible to all players in the zone | VERIFIED | `handleMine()`, `handleHarvest()`, `handleAttack()` call `rollLootTable()` on depletion/death, then `spawnGroundItems()` which calls `zonesService.spawnEntity()` and broadcasts via `entity:spawn` to zone room |
| 3 | Ground items persist across zone evictions and server restarts — a player who returns finds loot still on the ground | VERIFIED | `persistGroundItem()` inserts to `ground_items` DB table on every drop; `loadZone()` queries `groundItems` WHERE `zoneId = ? AND despawnAt > now` and restores all non-expired items into zone entity map |
| 4 | Depleted minerals and plants reappear at their original spawn point after a randomized delay — respawn tick loop fires correctly even after server restart | VERIFIED | `processRespawnTick()` runs every 10 seconds via `setInterval` in `onModuleInit()`; queries `entity_lifecycle WHERE respawnAt <= now`; re-materializes via `findSpawnPointFromEntityId()` + `createEntityFromSpawn()`; loads zone on LRU miss before processing; all `recordEntityKill()` calls use `applyRespawnVariance(baseSeconds)` for +/-25% jitter |
| 5 | Artifacts do not respawn after being collected — their spawn point is permanently marked and never re-materializes | VERIFIED | `handleCollect()` calls `recordEntityKill(artifact.id, zoneId, 0, true)` (isArtifact=true); `recordEntityKill` stores `FAR_FUTURE` (2100-01-01) as `respawnAt`; `processRespawnTick()` skips records with `respawnAt.getFullYear() >= 2099` |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `packages/database/src/schema/ground-items.ts` | ground_items Drizzle table | VERIFIED | 23 lines; pgTable `ground_items` with id, zoneId, itemId, quantity, x, y, despawnAt, createdAt; GroundItem/NewGroundItem types exported |
| `packages/database/src/schema/loot-tables.ts` | loot_tables and loot_table_entries Drizzle tables | VERIFIED | 38 lines; two pgTable definitions; composite PK on (tableId, itemId); all four types exported |
| `packages/game-logic/src/loot/loot-table.ts` | rollLootTable pure function | VERIFIED | 30 lines; implements weighted random via per-entry chance rolls; returns InventoryItemJson[] |
| `packages/game-logic/src/loot/creature-loot.ts` | CREATURE_LOOT_TABLES map and getCreatureLoot helper | VERIFIED | 115 lines; all 10 creatures (Tier I-IV) with biome-appropriate drops; getCreatureLoot returns empty array on miss |
| `packages/items/src/types.ts` | ItemDefinition with range property | VERIFIED | `readonly range?: number` added with JSDoc (line 88) |
| `packages/items/src/definitions/tools.ts` | All 15 tools with range values | VERIFIED | grep confirms exactly 15 occurrences of `range:` in file |
| `apps/game-server/src/game/entity.service.ts` | EntityService with all tool use handlers | VERIFIED | 311 lines; handleToolUse, handleMine, handleHarvest, handleAttack, handleCollect, spawnGroundItems, persistGroundItem, removeGroundItem all implemented; applyRespawnVariance applied at every recordEntityKill call |
| `packages/shared-types/src/network/events.ts` | entity:tool_use client event | VERIFIED | `'entity:tool_use'` in ClientEventType union (line 33); `ClientEvents['entity:tool_use']: { targetEntityId: string }` (line 76) |
| `packages/entities/src/types.ts` | CreatureDefinition with respawnSeconds | VERIFIED | `readonly respawnSeconds: number` present on CreatureDefinition, MineralDefinition, and PlantDefinition (lines 31, 46, 54) |
| `packages/entities/src/definitions/creatures.ts` | All 10 creatures with respawnSeconds values | VERIFIED | 10 occurrences confirmed; values 180-900 matching tier rationale |
| `apps/game-server/src/zones/zones.service.ts` | processRespawnTick(), loadGroundItems(), setServer() | VERIFIED | 479 lines; setServer() on line 76; processRespawnTick() from line 416 with error wrapping; loadZone() restores ground items from line 114 |
| `packages/database/src/seed/seed-loot-tables.ts` | Parameterized seed function | VERIFIED | 62 lines; accepts Map parameter to avoid circular dependency; uses onConflictDoNothing for idempotency |
| `packages/database/drizzle/0002_fair_viper.sql` | ground_items migration | VERIFIED | File exists; CREATE TABLE ground_items with all required columns |
| `packages/database/drizzle/0003_cuddly_phantom_reporter.sql` | loot_tables migration | VERIFIED | File exists |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/game-logic/src/index.ts` | `loot/loot-table.ts` + `loot/creature-loot.ts` | re-export | WIRED | Lines 29-30: `export * from './loot/loot-table'` and `export * from './loot/creature-loot'` |
| `packages/database/src/schema/index.ts` | `ground-items.ts` + `loot-tables.ts` | re-export | WIRED | Lines 25-28: exports both modules |
| `apps/game-server/src/game/entity.service.ts` | `rollLootTable` | import | WIRED | Line 17: `import { canInteract, rollLootTable, getCreatureLoot, DEFAULT_INTERACTION_RANGE } from '@into-the-void/game-logic'` |
| `apps/game-server/src/game/entity.service.ts` | `getCreatureLoot` | import | WIRED | Same import as above; called in `handleAttack()` via `getCreatureLoot(def.lootTableId)` |
| `apps/game-server/src/game/entity.service.ts` | `groundItems` DB table | Drizzle insert | WIRED | Line 23: `import { groundItems } from '@into-the-void/database'`; used in `persistGroundItem()` via `db.insert(groundItems).values(...)` |
| `apps/game-server/src/game/game.gateway.ts` | `entity.service.ts` | DI + @SubscribeMessage | WIRED | Line 16: imports EntityService; line 49: constructor injection; lines 549-584: `@SubscribeMessage('entity:tool_use')` handler calls `entityService.handleToolUse()` |
| `apps/game-server/src/game/game.service.ts` | `entity.service.ts` | persistGroundItem + removeGroundItem | WIRED | Line 310: `await this.entityService.persistGroundItem(groundItem)` in handleItemDrop; line 264: `await this.entityService.removeGroundItem(entityId)` in handleItemPickup |
| `apps/game-server/src/game/game.gateway.ts` | `zones.service.ts` | setServer() in afterInit | WIRED | Lines 52-55: `afterInit(server: Server) { this.zonesService.setServer(server); }` |
| `apps/game-server/src/zones/zones.service.ts` | `entity_lifecycle` + `groundItems` DB | Drizzle select/delete | WIRED | Line 23: `import { entityLifecycle, groundItems } from '@into-the-void/database'`; both used in processRespawnTick() |

---

### Requirements Coverage

Requirements mapped to this phase: LOOT-01, LOOT-02, LOOT-03, LOOT-04, LOOT-05, INTR-01, INTR-02, INTR-03, INTR-04, INTR-05, RESP-01, RESP-02, RESP-03, RESP-04, PERS-03, PERS-04

| Requirement Group | Status | Notes |
|-------------------|--------|-------|
| LOOT-01 (loot tables in DB) | SATISFIED | `loot_tables` and `loot_table_entries` tables created with migration |
| LOOT-02 (weighted random drops) | SATISFIED | `rollLootTable()` evaluates each HarvestYield entry independently with chance |
| LOOT-03/04/05 (creature/mineral/plant drops) | SATISFIED | `CREATURE_LOOT_TABLES` covers all 10 creatures; mineral uses `miningYield`, plant uses `harvestYield` |
| INTR-01/02 (tool use event + range validation) | SATISFIED | `entity:tool_use` event defined; `canInteract()` validates range before processing |
| INTR-03/04/05 (entity type routing) | SATISFIED | `handleToolUse()` routes by `entity.type` to mine/harvest/attack/collect |
| RESP-01 (respawn tick) | SATISFIED | `processRespawnTick()` runs every 10 seconds |
| RESP-02 (randomized delay) | SATISFIED | `applyRespawnVariance(baseSeconds)` applies +/-25% jitter at every kill recording |
| RESP-03 (per-species respawn time) | SATISFIED | All 10 CreatureDefinitions have `respawnSeconds` values (180-900s) |
| RESP-04 (artifact no-respawn) | SATISFIED | FAR_FUTURE sentinel (year 2100) stored; tick skips year >= 2099 records |
| PERS-03/04 (ground item persistence) | SATISFIED | `persistGroundItem()` on every spawn; `removeGroundItem()` on pickup; `loadZone()` restores from DB |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `entity.service.ts` | 184-186 | `// Simple damage model: 10 damage per tool use (combat system expansion is future work)` | Info | Hardcoded 10-damage model for creature combat — documented as intentional placeholder for Phase 36 combat system. Does not block phase goal. |

No blocker or warning anti-patterns found. The fixed-damage model is explicitly scoped to this phase and acknowledged in SUMMARY as a known simplification.

---

### Notable Implementation Details

**Artifact sentinel approach:** The phase goal description mentions `respawnTime: -1` as the artifact sentinel. The implementation uses a FAR_FUTURE date (2100-01-01) stored in the `entity_lifecycle.respawnAt` column instead. The tick loop skips records where `respawnAt.getFullYear() >= 2099`. This achieves the same functional outcome (artifacts never respawn) while being compatible with the timestamp column type. Not a gap — a valid implementation choice.

**respawnSeconds on all entity types:** `respawnSeconds` was added to `CreatureDefinition`, `MineralDefinition`, and `PlantDefinition` (all three required it for the variance calculation in `handleMine`, `handleHarvest`, `handleAttack`). Mineral and plant definitions also carry this property, though only creature values were specified in the plan — implementations use the definition's `respawnSeconds` field for variance calculation.

**LRU zone loading:** When `processRespawnTick()` finds a zone has been evicted from the LRU cache, it calls `loadZone(record.zoneId)` before processing — ensuring entities respawn in inactive zones rather than being silently skipped.

**Error containment:** `processRespawnTick()` wraps its entire body in try/catch, logging errors but never crashing the tick loop — a resilience pattern that prevents a single bad DB record from halting all future respawns.

---

### Human Verification Required

The following aspects cannot be verified programmatically and require runtime observation:

#### 1. Loot Drop Visibility
**Test:** Log in with a character, equip a mining tool, send `entity:tool_use` targeting a mineral entity, deplete it fully.
**Expected:** Ground item entities appear in the zone for all connected clients; `entity:spawn` events visible in browser devtools network tab.
**Why human:** Requires live server, live DB, and a connected WebSocket session.

#### 2. Persistence Across Restart
**Test:** Drop an item via `inventory:drop`, restart the game-server process, reconnect and load the zone.
**Expected:** The dropped item appears on the ground at the same position — loaded from `ground_items` DB on zone load.
**Why human:** Requires live server lifecycle management.

#### 3. Respawn Timer Fires
**Test:** Kill a mineral entity (deplete it), wait the respawn duration (180-900s depending on species, with +/-25% jitter), observe the zone.
**Expected:** An `entity:spawn` event fires in the zone room when the timer elapses.
**Why human:** Requires waiting the timer duration and observing live WebSocket events.

#### 4. Artifact Permanent Removal
**Test:** Collect an artifact, restart server, reconnect.
**Expected:** The artifact does not reappear in the zone.
**Why human:** Requires live server restart and zone reload observation.

---

## Gaps Summary

None. All 5 observable truths are verified. All required artifacts exist and are substantive (not stubs). All key links are wired end-to-end. The phase goal is achieved.

---

_Verified: 2026-02-18T16:43:06Z_
_Verifier: Claude (gsd-verifier)_
