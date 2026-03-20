---
phase: quick-13
plan: "01"
subsystem: expedition-ui
tags: [expedition, npc, modal, ui, server, socket]
dependency_graph:
  requires: []
  provides: [tier-based-expedition-flow]
  affects: [npc-interaction-modal, expedition-service, game-gateway, npc-store]
tech_stack:
  added: []
  patterns: [immediate-optimistic-close, tier-based-random-selection]
key_files:
  created: []
  modified:
    - packages/shared-types/src/network/events.ts
    - apps/game-server/src/game/expedition.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/web/src/store/npcStore.ts
    - apps/web/src/ui/panels/NpcInteractionModal.tsx
decisions:
  - "Emit expedition:start socket event before calling closeInteraction() so state is captured before reset"
  - "biome for expedition:complete resolved from resolveZoneBiome(newZoneId) instead of data.biome (which no longer exists)"
  - "Tier locked if ALL destinations in that tier are locked (not just any)"
metrics:
  duration: 12min
  completed: "2026-03-20"
  tasks: 2
  files: 5
---

# Quick Task 13: Fix Expedition NPC Close Interaction

**One-liner:** Tier-based expedition UI where server randomly picks a biome from chosen tier and modal closes immediately on selection.

## What Was Done

### Task 1: Update shared types and server - tier-based expedition (commit: 500dd9c)

Changed `ClientEvents['expedition:start']` from `{ biome: string }` to `{ tier: number }` in shared-types.

Added `startExpeditionByTier(playerId, tier)` method to `ExpeditionService` that:
- Validates tier range (1-4)
- Validates player level meets `TIER_LEVEL_REQUIREMENTS[tier]`
- Filters worldBiomes array to only biomes matching that tier via `BIOME_TIERS`
- Picks a random biome from filtered list
- Delegates to existing `startExpedition(playerId, randomBiome)`

Updated `handleExpeditionStart` in `game.gateway.ts` to:
- Accept `{ tier: number }` instead of `{ biome: string }`
- Validate tier is 1-4 integer
- Call `startExpeditionByTier` instead of `startExpedition`
- Use `resolveZoneBiome(result.newZoneId)` (already computed as `biome` variable) for `expedition:complete` emit

### Task 2: Update client - close modal immediately + tier-based UI (commit: 12c250d)

Changed `startExpedition(biome: string)` to `startExpedition(tier: number)` in `npcStore.ts`:
- Emits `expedition:start` with `{ tier }`
- Calls `closeInteraction()` immediately after emit (modal closes without waiting for server)
- Updated `NpcState` interface signature

Added error event listener in npcStore to reset `expeditionPending` when `EXPEDITION_FAILED` or `NOT_IN_HUB` errors arrive.

Replaced per-biome button list in `NpcInteractionModal.tsx` with 4 tier buttons:
- Tier I - Frontier / Tier II - Hazardous / Tier III - Hostile / Tier IV - Extreme
- Each shows biome count available in that tier
- Locked tiers show required level; unlocked show flavor description
- On click calls `startExpedition(tier)` with numeric tier

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. `expedition:complete` biome field: Used the `biome` variable already computed by `resolveZoneBiome(result.newZoneId)` a few lines above in the same block rather than a duplicate call or returning biome from the result object. This is the actual selected biome.

2. Tier lock logic: A tier is considered locked if ALL destinations in that tier are locked (player below required level). This matches the server-side validation in `startExpeditionByTier`.

3. Order of operations in `startExpedition`: `set({ expeditionPending: true })` → `emit` → `closeInteraction()`. The `closeInteraction` resets `expeditionPending` to false, which is acceptable since the modal is closed and there's no UI to show the pending state.

## Self-Check

### Files created/modified:
- `packages/shared-types/src/network/events.ts` — expedition:start uses tier
- `apps/game-server/src/game/expedition.service.ts` — startExpeditionByTier method added
- `apps/game-server/src/game/game.gateway.ts` — handler updated
- `apps/web/src/store/npcStore.ts` — startExpedition(tier), closeInteraction immediate, error listener
- `apps/web/src/ui/panels/NpcInteractionModal.tsx` — 4 tier buttons

### Commits verified:
- 500dd9c: feat(quick-13): tier-based expedition on server side
- 12c250d: feat(quick-13): close modal immediately and show tier-based expedition UI

### Builds verified:
- shared-types:build — PASSED
- game-server:build — PASSED
- web:build — PASSED

## Self-Check: PASSED
