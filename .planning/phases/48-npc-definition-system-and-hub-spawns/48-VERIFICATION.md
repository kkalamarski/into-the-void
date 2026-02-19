---
phase: 48-npc-definition-system-and-hub-spawns
verified: 2026-02-19T23:42:40Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 48: NPC Definition System and Hub Spawns — Verification Report

**Phase Goal:** The NPC definition registry exists with all 5 NPC types, NPCs have a visual representation in the hub, are fixed at designated spawn positions, and are non-hostile.
**Verified:** 2026-02-19T23:42:40Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NpcRegistry.get(npcId) returns a typed NpcDefinition with type, name, dialogue lines, and inventory for all defined NPCs without error | VERIFIED | `packages/npcs/src/registry.ts` — `get()` returns typed NpcDefinition with UNKNOWN_NPC fallback; `packages/npcs/src/index.ts` calls `NpcRegistry.registerAll(ALL_NPCS)` on module load; all 20 definitions have dialogue and inventory where applicable |
| 2 | Each hub contains at least one NPC of each of the 5 types (Trader, Guard, Faction Rep, Ambient, Service) at fixed tile positions | VERIFIED | `packages/world-gen/src/generation/hub.ts` — all 4 hub configs (hub_verdant, hub_helix, hub_nexus, hub_neutral) each have exactly 5 `npcSpawns` entries covering all 5 types at fixed positions (20,20), (32,15), (44,20), (20,44), (44,44) |
| 3 | NPCs have visible representation in the Phaser canvas with a nameplate | VERIFIED | `apps/web/src/game/rendering/EntityRenderer.ts` — `isNpc()` type guard, `createNpcNameplate()` method with colored borders per type (gold=trader, steel=guard, blue=faction_rep, gray=ambient, green=service); NPC scale 2.2, fallback texture 'player'; wired in `createEntityContainer` |
| 4 | Clicking an NPC does not initiate combat; server rejects combat:start targeting an NPC | VERIFIED | Client: `WorldScene.ts` line 352 — early `return` on `entityType === 'npc'` prevents any `handleEntityClick()` call or `combat:start` emission. Server: `CombatService.startCombat()` line 118-119 — explicit `entity.type === 'npc'` check returns `{ success: false, error: 'Cannot attack NPCs' }` before creature check |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `packages/npcs/src/types.ts` | NpcDefinition discriminated union, NpcType | VERIFIED | All 5 types: TraderDefinition, GuardDefinition, FactionRepDefinition, AmbientDefinition, ServiceDefinition; BaseNpcDefinition with dialogue field; TradeItem/inventory present |
| `packages/npcs/src/registry.ts` | NpcRegistry singleton with get/has/getByType/getByFaction | VERIFIED | NpcRegistryImpl class with all required methods; UNKNOWN_NPC fallback prevents crashes; exported as singleton `NpcRegistry` |
| `packages/npcs/src/index.ts` | Barrel exports + auto-registration | VERIFIED | Exports all types; imports NpcRegistry and ALL_NPCS; calls `NpcRegistry.registerAll(ALL_NPCS)` at module load |
| `packages/npcs/src/definitions/verdant.ts` | 5 Verdant NPC definitions | VERIFIED | VERDANT_NPCS array: trader, guard, faction_rep, ambient, service — all 5 npcType values present |
| `packages/npcs/src/definitions/helix.ts` | 5 Helix NPC definitions | VERIFIED | HELIX_NPCS array: trader, guard, faction_rep, ambient, service — all 5 npcType values present |
| `packages/npcs/src/definitions/nexus.ts` | 5 Nexus NPC definitions | VERIFIED | NEXUS_NPCS array: trader, guard, faction_rep, ambient, service — all 5 npcType values present |
| `packages/npcs/src/definitions/neutral.ts` | 5 Neutral NPC definitions | VERIFIED | NEUTRAL_NPCS array: trader, guard, faction_rep, ambient, service — all 5 npcType values present |
| `packages/npcs/src/definitions/index.ts` | ALL_NPCS barrel combining 20 definitions | VERIFIED | Combines VERDANT_NPCS + HELIX_NPCS + NEXUS_NPCS + NEUTRAL_NPCS = 20 total |
| `packages/world-gen/src/generation/hub.ts` | NpcSpawn interface + npcSpawns on HubConfig | VERIFIED | NpcSpawn { npcId, x, y }; HubConfig.npcSpawns: readonly NpcSpawn[]; all 4 hub configs have 5 spawns each at walkable positions (8-55), avoiding portal (32,32) |
| `packages/shared-types/src/core/entity.ts` | Npc interface extending Entity | VERIFIED | Npc interface with type: 'npc', npcId, npcType, faction; 'npc' added to EntityType union; re-exported via `export * from './core/entity'` in shared-types index |
| `apps/game-server/src/zones/zones.service.ts` | spawnHubNpcs method | VERIFIED | Private `spawnHubNpcs()` method iterates `hubConfig.npcSpawns`, calls `NpcRegistry.get()`, constructs Npc entities; called in `loadHubZone()`; entities added to zone entity map |
| `apps/game-server/src/game/combat.service.ts` | NPC targeting rejection | VERIFIED | Lines 117-120: `if (entity.type === 'npc') return { success: false, error: 'Cannot attack NPCs' }` — placed before creature check for explicit error message |
| `apps/web/src/game/rendering/EntityRenderer.ts` | NPC rendering with nameplate | VERIFIED | `isNpc()` type guard; `createNpcNameplate()` method with 300x50 rounded panel, colored border per npcType; npc scale 2.2 in ENTITY_SCALE; 'player' fallback texture; full wiring in `createEntityContainer` |
| `apps/web/src/game/scenes/WorldScene.ts` | NPC click suppression | VERIFIED | Lines 350-356: explicit `if (entityType === 'npc')` early return before `handleEntityClick()` is ever called; `lastClickedEntity` set to suppress pathfinding |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/npcs/src/registry.ts` | `packages/npcs/src/types.ts` | `import type { NpcDefinition, NpcType } from './types'` | WIRED | Line 1 of registry.ts |
| `tsconfig.base.json` | `@into-the-void/npcs` | path alias | WIRED | Line 32: `"@into-the-void/npcs": ["packages/npcs/src/index.ts"]` |
| `packages/npcs/src/index.ts` | ALL_NPCS registration | `NpcRegistry.registerAll(ALL_NPCS)` on module load | WIRED | Lines 23-25 of index.ts; import + call present |
| `packages/world-gen/src/generation/hub.ts` | HubConfig.npcSpawns | NpcSpawn entries in all 4 hub configs | WIRED | All 4 configs have 5 spawn entries; exported via `export type { NpcSpawn }` in world-gen index |
| `apps/game-server/src/zones/zones.service.ts` | `@into-the-void/npcs` | `import { NpcRegistry } from '@into-the-void/npcs'` | WIRED | Line 16 of zones.service.ts |
| `apps/game-server/src/game/combat.service.ts` | entity.type !== 'npc' guard | `if (entity.type === 'npc') return error` | WIRED | Lines 117-120; checked before creature type check |
| `apps/web/src/game/rendering/EntityRenderer.ts` | entity.type === 'npc' | `isNpc()` guard + `createNpcNameplate()` call | WIRED | Lines 415-417 (isNpc guard), 422-457 (createNpcNameplate), 152-157 (wired in createEntityContainer) |
| `apps/game-server/src/game/game.service.ts` | zone entities including NPCs | `this.zonesService.getZoneEntities(zoneId)` | WIRED | Hub zone path explicitly calls getZoneEntities which reads entity map including spawned NPCs; result included in zone:state |

---

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| NpcRegistry.get(npcId) returns typed NpcDefinition for all 5 types | SATISFIED | Registry confirmed; all 20 definitions registered; get() returns typed NpcDefinition |
| Each hub has at least 1 NPC of each of the 5 types at fixed positions | SATISFIED | 4 hubs x 5 NPC types x fixed positions confirmed in hub.ts |
| NPCs visible in Phaser canvas with nameplate | SATISFIED | EntityRenderer creates NPC containers with createNpcNameplate(); 'player' sprite fallback; nameplate color-coded by type |
| Clicking NPC does not initiate combat; server rejects NPC combat:start | SATISFIED | Client: early return in WorldScene. Server: explicit 'Cannot attack NPCs' rejection in CombatService |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/src/game/scenes/WorldScene.ts` | 354 | `console.log('NPC clicked:', entityId)` | Info | Placeholder for Phase 49 NPC interaction; intentional; non-blocking |

No blocker or warning anti-patterns found. The single console.log is an intentional placeholder documented in the plan for Phase 49 (NPC interaction window).

---

### Human Verification Required

#### 1. NPC Visual Appearance in Hub

**Test:** Connect to the game, enter any hub zone (e.g., hub_verdant via faction selection or portal).
**Expected:** See 5 colored Phaser sprites (reusing 'player' sprite) with rounded nameplate panels above each. Nameplates should have colored borders: gold (Trader at NW), steel-gray (Guard at N), blue (Faction Rep at NE), gray (Ambient at SW), green (Service at SE).
**Why human:** Phaser rendering cannot be verified without running the client.

#### 2. NPC Non-Combat Behavior (Client Click)

**Test:** Click on an NPC entity in the hub canvas.
**Expected:** Nothing happens visually (no target highlight, no combat initiation). Developer console shows "NPC clicked: [id]" log.
**Why human:** WebSocket interaction and Phaser click handlers require a running session to verify.

---

## Gaps Summary

No gaps found. All 4 observable truths are verified, all 14 required artifacts exist and are substantive and wired, all 8 key links are confirmed active. The phase goal is achieved.

---

_Verified: 2026-02-19T23:42:40Z_
_Verifier: Claude (gsd-verifier)_
