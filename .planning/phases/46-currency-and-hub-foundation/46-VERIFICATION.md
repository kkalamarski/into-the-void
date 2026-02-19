---
phase: 46-currency-and-hub-foundation
verified: 2026-02-19T21:03:18Z
status: passed
score: 4/4 must-haves verified
re_verification: false
human_verification:
  - test: "Log in with a new character and confirm HUD shows '1,000 cr' with a gold coin icon"
    expected: "Gold GiTwoCoins icon and '1,000 cr' text visible in top-left HUD panel"
    why_human: "Visual appearance and locale formatting cannot be confirmed without rendering"
  - test: "Log out and log back in as the same character; check HUD credits value is unchanged"
    expected: "Credits value matches the value shown before logout"
    why_human: "Session persistence requires a live DB read round-trip that cannot be confirmed statically"
  - test: "Trigger player death and SOS respawn; confirm player arrives inside a hub zone and Safe Zone indicator appears in HUD"
    expected: "Player position is within hub zone bounds, green shield badge visible in top-right HUD"
    why_human: "Respawn flow, zone loading, and UI rendering require a running game session"
---

# Phase 46: Currency and Hub Foundation Verification Report

**Phase Goal:** The credits currency type exists in the database and HUD, and the four faction orbital hubs exist as discrete, safe, instanced zones that players can walk around using the existing movement system
**Verified:** 2026-02-19T21:03:18Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Player HUD shows a credits balance ("1,000 cr") that is non-zero for a new character seeded with starting credits | VERIFIED | `HUD.tsx` line 131-134: `<div className="credits-display"><GiTwoCoins .../><span>{(player.credits ?? 0).toLocaleString()} cr</span></div>`; `characters.ts` line 45: `credits: integer('credits').notNull().default(1000)` |
| 2 | Credits persist after logging out and back in | VERIFIED | `characters.ts` stores credits in PostgreSQL with `DEFAULT 1000`; `findCharacterById` uses wildcard `db.select()` returning all columns; `PlayerService.authenticate` sets `credits: character.credits` on the in-memory player |
| 3 | Four faction hub zones exist as instanced areas separate from open-world coordinates | VERIFIED | `zone.ts`: `HUB_ZONE_IDS = ['hub_verdant', 'hub_helix', 'hub_nexus', 'hub_neutral']`; `zones.service.ts` `loadZone` early-returns to `loadHubZone` when `isHubZone(zoneId)` — procedural world-gen path is entirely skipped; `game.service.ts` `getZoneState` early-returns for hub zones before any `z_X_Y` coordinate parsing |
| 4 | Hub zones return no combat events and no hostile creature spawns — combat initiation is rejected | VERIFIED | `combat.service.ts` line 89-91: `if (isHubZone(player.position.zoneId)) return { success: false, error: 'Combat is not allowed in hub zones' }`; `combat.service.ts` line 358-360: `if (isHubZone(zoneId)) return false`; `ai.service.ts` lines 51-53, 80-82, 145-147, 186-188: `isHubZone` early-return in `activateZone`, `checkImmediateAggro`, `checkImmediateAggroForPlayer`, `checkCreatureAggro`; hub chunks have `spawnPoints: []` |
| 5 | Player can move freely inside a hub using WASD and click-to-move | VERIFIED | `game.service.ts` `movePlayer` calls `zonesService.getChunk(zoneId)` (hub chunk has correct 64x64 collision map); `validateMovement` checks `collisionMap[to.y]?.[to.x]` — hub perimeter (8 tiles) is `true` (blocked), interior 48x48 is `false` (walkable); for interior moves, `zoneOffsetX === 0 && zoneOffsetY === 0` so no zone-ID coordinate parsing occurs |

**Score:** 5/5 truths verified (4/4 phase plan must-have groups)

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `packages/database/src/schema/characters.ts` | credits column definition | VERIFIED | Line 45: `credits: integer('credits').notNull().default(1000)` — substantive, wired through `findCharacterById` wildcard select |
| `packages/shared-types/src/core/player.ts` | Player type with credits field | VERIFIED | Line 39: `credits: number;` on `Player`; line 52: `credits: number;` on `PlayerPublic` |
| `apps/web/src/ui/hud/HUD.tsx` | Credits display in HUD | VERIFIED | Lines 131-134: `credits-display` div with `GiTwoCoins` icon and `toLocaleString() cr` |
| `packages/shared-types/src/core/zone.ts` | ZoneType discriminator for hub vs open-world | VERIFIED | Lines 14-26: `ZoneType`, `HUB_ZONE_IDS`, `HubZoneId`, `isHubZone()` helper exported |
| `packages/world-gen/src/generation/hub.ts` | Hub layout generator and config | VERIFIED | Full implementation: `generateHubChunk()` produces 64x64 with 48x48 walkable center, `getHubConfig()`, `isKnownHub()`, four faction configs with valid `BiomeType` values |
| `packages/game-logic/src/combat/respawn.ts` | Hub zone IDs for each faction | VERIFIED | Lines 4-9: `FACTION_RESPAWN_COORDS` maps all four `FactionId` values to `hub_*` zoneIds at x:32, y:32 |
| `apps/game-server/src/game/game.service.ts` | Hub zone handling in getZoneState | VERIFIED | Lines 87-106: early return for `isHubZone(zoneId)` before any coordinate parsing; returns valid `ZoneState` with `zoneType: 'hub'` |
| `apps/game-server/src/game/combat.service.ts` | Hub zone combat rejection | VERIFIED | Lines 88-91 (`startCombat`), lines 357-360 (`startCreatureCombat`): both have `isHubZone` early-returns |
| `apps/game-server/src/game/ai.service.ts` | Hub zone AI skip | VERIFIED | Lines 51-53, 80-82, 145-147, 186-188: `isHubZone` guards in all four AI entry points |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/game-server/src/game/player.service.ts` | `packages/database/src/queries/characters.ts` | getCharacterById returns credits | WIRED | `findCharacterById` uses `db.select()` (wildcard); `PlayerService.authenticate` reads `character.credits` and assigns to player object |
| `apps/web/src/ui/hud/HUD.tsx` | `player.credits` | reads from gameStore player | WIRED | `player.credits` accessed in JSX; player populated via `auth:success` → `setPlayer(player)` in `GameScreen.tsx` which calls `gameSocket.authenticate()` returning full `Player` including credits |
| `apps/game-server/src/zones/zones.service.ts` | `packages/world-gen/src/generation/hub.ts` | generateHubChunk for hub_ prefixed zones | WIRED | Line 13: `import { generateChunk, generateHubChunk, isKnownHub }` from world-gen; line 101-103: `if (isHubZone(zoneId)) return this.loadHubZone(zoneId)`; `loadHubZone` calls `generateHubChunk(zoneId)` |
| `packages/game-logic/src/combat/respawn.ts` | FACTION_RESPAWN_COORDS | hub zone IDs | WIRED | All four faction entries use `hub_*` zoneIds; imported and called by `PlayerService.respawnWithSOS` |
| `apps/game-server/src/game/game.service.ts` | isHubZone | early return before getZoneState coordinate parsing | WIRED | Line 28: `import { isHubZone }` from shared-types; line 90: `if (isHubZone(zoneId))` before `zoneId.split('_')` |
| `apps/game-server/src/game/game.service.ts` | `packages/world-gen/src/generation/hub.ts` | getHubConfig for hub biome/fertility | WIRED | Line 27: `import { getBiome, BiomeGenerator, getHubConfig }` from world-gen; line 91: `const hubConfig = getHubConfig(zoneId)` |
| `apps/game-server/src/game/combat.service.ts` | isHubZone | import from shared-types | WIRED | Line 7: `import { Creature, ItemEntity, isHubZone } from '@into-the-void/shared-types'` |
| `apps/game-server/src/game/ai.service.ts` | isHubZone | import from shared-types | WIRED | Line 2: `import { Creature, PlayerPublic, isHubZone } from '@into-the-void/shared-types'` |

---

### Requirements Coverage

| Requirement | Description | Status | Supporting Truth |
|-------------|-------------|--------|-----------------|
| CURR-01 | Player has credits balance visible in HUD | SATISFIED | Truth 1 — `HUD.tsx` `credits-display` div reads `player.credits` from gameStore |
| CURR-02 | Credits persist across sessions (stored in database) | SATISFIED | Truth 2 — `characters` table has `credits` column with `DEFAULT 1000`; `findCharacterById` uses wildcard select; `PlayerService.authenticate` wires DB value into session |
| HUB-01 | Four faction orbital station hubs exist | SATISFIED | Truth 3 — `HUB_ZONE_IDS` constant; `hub.ts` has four `HUB_CONFIGS` entries; `ZonesService.loadHubZone` generates them on demand |
| HUB-02 | Hubs are instanced areas separate from the open world | SATISFIED | Truth 3 — `isHubZone` routing in `ZonesService.loadZone` prevents procedural `generateChunk` path; `GameService.getZoneState` early-returns before coordinate parsing |
| HUB-03 | Hubs are safe zones (no combat, no hostile creatures) | SATISFIED | Truth 4 — combat rejected at `CombatService.startCombat` and `startCreatureCombat`; AI tick loop skipped in `AiService.activateZone`; aggro checks short-circuit in three methods; hub `ChunkData.spawnPoints` is empty |
| HUB-05 | Player can walk around hub using existing movement system | SATISFIED | Truth 5 — `movePlayer` uses hub chunk collision map; hub perimeter (8 tiles thick) is collision-blocked; interior 48x48 is walkable; no modifications to movement system needed |

---

### Anti-Patterns Found

No blocker anti-patterns found.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/game-server/src/game/game.gateway.ts` | 156-163 | `player:joined` emission to zone peers missing `credits` field | Warning | Other players in zone see newly-joined player without credits value in their `PlayerPublic` — does not affect own-player HUD or any current gameplay; economy features not yet implemented |

---

### Human Verification Required

#### 1. HUD Credits Display Visual Confirmation

**Test:** Log in with a freshly created character and examine the top-left HUD panel
**Expected:** Gold coin icon (`GiTwoCoins`) followed by "1,000 cr" text is visible below the stats section
**Why human:** Visual rendering and number locale formatting require a running browser session

#### 2. Credits Persistence After Logout

**Test:** Note the credits value on login, log out, log back in with the same character
**Expected:** Credits value is identical after the login cycle (1,000 cr for new characters)
**Why human:** Verifying a DB round-trip requires a running PostgreSQL instance and game session

#### 3. SOS Respawn Into Hub Zone

**Test:** Die in the open world, select S.O.S. extraction on the death screen; observe the zone the character lands in and the HUD
**Expected:** Character appears inside a hub zone (position zoneId starts with `hub_`), green "Safe Zone" badge visible in top-right HUD, and no combat is possible
**Why human:** Requires a running game session with a character that can be killed; visual indicator must be confirmed in the browser

---

### Notable Observations

**Movement in hubs is safe by design, not by code modification.** The hub perimeter (8 tiles thick, collision=true) prevents the player from ever reaching the zone boundary tiles, so the `calculateNewPosition` zone-transition code path (which would produce `z_NaN_NaN` for hub zoneIds) is never triggered under normal gameplay. This is a valid approach but worth noting as a latent fragility if the perimeter were ever removed.

**Hub zone persistence gap (minor):** Hub zones are not persisted to the database — they are regenerated from `generateHubChunk()` on each zone load. This is correct behaviour (safe, static areas), but items dropped in a hub (if that were ever allowed) would vanish on zone eviction. The current implementation correctly has empty `spawnPoints: []`.

---

## Gaps Summary

None. All phase truths verified.

---

_Verified: 2026-02-19T21:03:18Z_
_Verifier: Claude (gsd-verifier)_
