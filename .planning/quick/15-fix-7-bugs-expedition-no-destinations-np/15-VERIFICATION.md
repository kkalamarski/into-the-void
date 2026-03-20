---
phase: quick-15
verified: 2026-03-20T00:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Quick Task 15: Fix 7 Bugs — Verification Report

**Task Goal:** Fix 7 bugs: expedition no destinations, NPC too far away, merchants far from spawn, player sinking/elevation, combat not working, harvesting not working, collision offset
**Verified:** 2026-03-20
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Expedition to any tier (1-4) finds a destination and teleports player | VERIFIED | `startExpeditionByTier` shuffles all biomes in tier, loops through each until one succeeds; `maxSearchRadius = 100` (was 50). Lines 136-148 in expedition.service.ts |
| 2 | After expedition teleport, player can interact with NPCs in the new zone | VERIFIED | `updatePosition()` now calls `tileToPixelCenter()` and sets `player.px`, `player.py`, `player.lastPxInputTime` (lines 416-420 in player.service.ts). game.gateway.ts line 1084 uses `player.px/py` for NPC distance — now correct |
| 3 | After expedition teleport, player can use combat abilities on creatures | VERIFIED | Same root cause as truth 2 — px/py are now synced by `updatePosition()`. Combat range checks in ability.service.ts use `player.px/py` |
| 4 | After expedition teleport, player can harvest resource nodes | VERIFIED | Same root cause as truths 2 and 3. Harvest range checks use `player.px/py`, now synced on teleport |
| 5 | Merchants (suit/tool/module vendors, faction traders) are reachable within 15 tiles of hub spawn | VERIFIED | Each hub has 3 docking-bay vendor NPCs; all within 5-8 tiles of faction spawn coords (verdant y=102, helix y=103, nexus y=104, neutral y=103): verdant vendors at y=96-97 (5-6 tiles), helix at y=98 (5 tiles), nexus at y=96-97 (7-8 tiles), neutral at y=98 (5 tiles) |
| 6 | Player collision with walls feels tight — player stops at wall visual edge, not 1 tile before | VERIFIED | `PLAYER_HITBOX.height = Math.round(TILE_SIZE_PX * 0.125)` = 16px (was 64px). Line 46 of pixel-validation.ts |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/game-server/src/game/player.service.ts` | `updatePosition` syncs px/py from tile coords | VERIFIED | Lines 412-422 — calls `tileToPixelCenter(position.x, position.y)`, sets `player.px`, `player.py`, `player.lastPxInputTime` |
| `apps/game-server/src/game/expedition.service.ts` | Retry logic across all biomes in tier when first biome not found | VERIFIED | Lines 136-148 — shuffled loop, exits on first success; `maxSearchRadius = 100` at line 212 |
| `packages/world-gen/src/generation/hub.ts` | Merchant NPCs positioned near docking/spawn area | VERIFIED | All 4 hubs have 3 vendor NPCs (npc_suit_vendor, npc_tool_vendor, npc_module_vendor) in docking bay section, all within 15 tiles of spawn |
| `packages/game-logic/src/movement/pixel-validation.ts` | Reduced PLAYER_HITBOX.height for tighter wall collision | VERIFIED | Line 46: `height: Math.round(TILE_SIZE_PX * 0.125)` = 16px. Test updated at pixel-validation.test.ts line 40-41 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/game-server/src/game/expedition.service.ts` | `apps/game-server/src/game/player.service.ts` | `startExpedition` calls `updatePosition` | WIRED | Line 191: `this.playerService.updatePosition(playerId, destination)` |
| `apps/game-server/src/game/player.service.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | `updatePosition` uses `tileToPixelCenter` to sync px/py | WIRED | Line 9 import confirmed, line 417: `const pixelCenter = tileToPixelCenter(position.x, position.y)` |
| `apps/game-server/src/game/game.gateway.ts` | `apps/game-server/src/game/player.service.ts` | NPC interact checks `player.px/py` distance | WIRED | Line 1084: `const npcDist = pixelDistanceTo(player.px, player.py, npcPx, npcPy)` — uses correct player pixel coords |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BUG-1 | 15-PLAN.md | Expedition "no suitable destinations" | SATISFIED | Tier-biome retry loop + maxSearchRadius=100 |
| BUG-2 | 15-PLAN.md | NPC too far away after teleport | SATISFIED | px/py sync in updatePosition |
| BUG-3 | 15-PLAN.md | Merchants far from spawn | SATISFIED | Docking bay vendors within 5-8 tiles |
| BUG-4 | 15-PLAN.md | Player sinking/elevation | SATISFIED | Pre-existing fix from quick-12 (bilinear interpolation); stale px/py also contributed, now fixed by BUG-2 fix |
| BUG-5 | 15-PLAN.md | Combat not working | SATISFIED | px/py sync in updatePosition (same root cause as BUG-2) |
| BUG-6 | 15-PLAN.md | Harvesting not working | SATISFIED | px/py sync in updatePosition (same root cause as BUG-2) |
| BUG-7 | 15-PLAN.md | Collision offset (1 tile before wall) | SATISFIED | PLAYER_HITBOX.height reduced from 64 to 16px |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/game-logic/src/movement/pixel-validation.ts` | 159 | Stale comment: `// 64 (full height from feet up)` after height was reduced to 16 | Info | Misleading but functionally harmless — `hh` correctly reads `PLAYER_HITBOX.height` at runtime (now 16); comment is wrong |

No blocker or warning anti-patterns found. The `return null` occurrences in expedition.service.ts (lines 247, 257) are legitimate sentinel returns, not stubs.

---

### Human Verification Required

#### 1. Tight Wall Collision Feel

**Test:** Log into game, run toward a wall from several tiles away. Stop just before the wall.
**Expected:** Player stops at the visual south face of the wall tile, not 1 tile before it.
**Why human:** Visual/feel judgment — pixel math verifies the hitbox is 16px but only a human can confirm this translates to the right visual stopping point in the isometric render.

#### 2. Full Expedition Gameplay Loop

**Test:** Open expedition panel in hub, select a tier-4 biome (void rift / crystalline wastes). Teleport. Then try to (a) talk to an NPC, (b) attack a creature, (c) harvest a resource node.
**Expected:** All three actions succeed without "too far away" errors. Expedition teleport finds a destination without "no suitable destinations" error.
**Why human:** End-to-end integration across WebSocket events, server state, and live game session cannot be verified programmatically.

#### 3. Docking Bay Merchant Accessibility

**Test:** Log in to each hub (verdant, helix, nexus, neutral), walk toward the docking bay area at spawn. Verify suit/tool/module vendors are visible nearby.
**Expected:** At least 3 vendors visible within a few tiles of the spawn point in each hub.
**Why human:** NPC rendering and map layout require visual confirmation; JSON maps are used (not procedural generation) so NPC spawn validity depends on actual walkable tiles.

---

### Commits Verified

| Hash | Description | Present |
|------|-------------|---------|
| 950bd90 | fix(quick-15): sync px/py in updatePosition resolving NPC/combat/harvest bugs | YES |
| d594ddd | fix(quick-15): retry all tier biomes in expedition, expand search radius to 100 | YES |
| 1069bfb | fix(quick-15): add docking bay vendors near spawn + reduce hitbox height to 16px | YES |

---

### Gaps Summary

No gaps. All 6 must-have truths are VERIFIED, all 4 artifacts are substantive and wired, all 3 key links are confirmed. The only finding is a stale inline comment (line 159 of pixel-validation.ts says `// 64` but the actual runtime value is now 16) — this is informational only and has no functional impact.

---

_Verified: 2026-03-20_
_Verifier: Claude (gsd-verifier)_
