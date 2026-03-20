---
phase: quick-13
verified: 2026-03-20T00:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Quick Task 13: Fix Expedition NPC Close Interaction — Verification Report

**Task Goal:** Fix expedition NPC: close interaction window after teleport + make biome selection random (user selects difficulty tier only)
**Verified:** 2026-03-20
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NPC interaction modal closes immediately when user starts an expedition | VERIFIED | `npcStore.ts` line 107: `useNpcStore.getState().closeInteraction()` called synchronously after `emit`, before any server response |
| 2 | User selects a difficulty tier (I-IV) instead of a specific biome | VERIFIED | `NpcInteractionModal.tsx` lines 374-379: four tier buttons rendered; tier numerals I/II/III/IV with Frontier/Hazardous/Hostile/Extreme names |
| 3 | Server randomly selects a biome from the chosen tier | VERIFIED | `expedition.service.ts` line 130-137: filters `worldBiomes` to `tierBiomes` by `BIOME_TIERS[biome] === tier`, picks via `Math.floor(Math.random() * tierBiomes.length)` |
| 4 | Locked tiers (level too low) are shown but disabled | VERIFIED | `NpcInteractionModal.tsx` lines 392, 399-400: `isLocked = tierDests.every(d => d.locked)`, button has `disabled={isLocked}` and shows "Requires Level N" |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared-types/src/network/events.ts` | Updated `expedition:start` payload to use `tier` instead of `biome` | VERIFIED | Line 181: `'expedition:start': { tier: number }` — tier-based, no biome |
| `apps/game-server/src/game/expedition.service.ts` | `startExpeditionByTier` method that randomly picks a biome from the tier | VERIFIED | Lines 81-140: full implementation with level validation, tier filtering, random selection, delegates to `startExpedition` |
| `apps/web/src/ui/panels/NpcInteractionModal.tsx` | Tier-based expedition UI with 4 tier buttons | VERIFIED | Lines 374-413: `tierConfig` array with 4 tiers, each rendered as a button calling `startExpedition(tier)` |

All artifacts: exist, are substantive (no stubs), and are wired.

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `NpcInteractionModal.tsx` | `npcStore.ts` | `startExpedition(tier)` call | VERIFIED | Line 401: `onClick={() => startExpedition(tier)}` — numeric tier passed directly |
| `npcStore.ts` | `game.gateway.ts` | `expedition:start` socket event with tier | VERIFIED | Line 105: `gameSocket.emit('expedition:start', { tier })` — emitted before `closeInteraction` |
| `game.gateway.ts` | `expedition.service.ts` | `startExpeditionByTier` call | VERIFIED | Line 1531: `this.expeditionService.startExpeditionByTier(player.id, tier as BiomeTier)` |

All key links confirmed wired end-to-end.

---

### Additional Wiring Verified

- **Immediate modal close:** `npcStore.ts` line 107 calls `closeInteraction()` synchronously after the socket emit (line 105), without waiting for server. This is the core fix for the "modal stays open" bug.
- **Error recovery:** Lines 149-153 in `npcStore.ts` listen for `error` events with codes `EXPEDITION_FAILED` or `NOT_IN_HUB` and reset `expeditionPending`.
- **`expedition:complete` safety fallback:** Line 145 in `npcStore.ts` also calls `closeInteraction()` on completion (idempotent, no harm since modal is already closed).
- **Gateway validation:** `game.gateway.ts` lines 1522-1529 validate `tier` is 1-4 integer before calling service.
- **`expedition:complete` biome resolved from zone:** Gateway uses `resolveZoneBiome(result.newZoneId)` (line 1573) for the emitted biome field, matching the actual randomly-selected zone biome.

---

### Requirements Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| QUICK-13 | Fix expedition NPC: close modal immediately on selection + tier-based random biome selection | SATISFIED |

---

### Anti-Patterns Found

None detected in the five modified files. No TODOs, stubs, empty handlers, or placeholder returns in the expedition flow.

---

### Human Verification Required

#### 1. Visual tier button appearance

**Test:** Open the game, find an expedition NPC, open the expedition tab.
**Expected:** Four tier buttons visible: "Tier I - Frontier", "Tier II - Hazardous", "Tier III - Hostile", "Tier IV - Extreme". Each shows biome count and either a locked message or a flavor description. Low-level character should see Tier II+ as disabled/greyed.
**Why human:** CSS visual rendering and disabled state appearance cannot be verified programmatically.

#### 2. Modal closes immediately on tier select

**Test:** Click any unlocked tier button.
**Expected:** The NPC modal disappears instantly (no loading delay). The player then teleports to a random biome in that tier. Modal does not reappear.
**Why human:** Timing/UX behavior of optimistic close requires runtime observation.

---

### Gaps Summary

No gaps. All four observable truths are fully implemented and wired. The task goal is achieved.

---

_Verified: 2026-03-20_
_Verifier: Claude (gsd-verifier)_
