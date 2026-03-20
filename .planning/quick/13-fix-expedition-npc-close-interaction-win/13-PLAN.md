---
phase: quick-13
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared-types/src/network/events.ts
  - apps/game-server/src/game/expedition.service.ts
  - apps/game-server/src/game/game.gateway.ts
  - apps/web/src/store/npcStore.ts
  - apps/web/src/ui/panels/NpcInteractionModal.tsx
autonomous: true
requirements: [QUICK-13]

must_haves:
  truths:
    - "NPC interaction modal closes immediately when user starts an expedition"
    - "User selects a difficulty tier (I-IV) instead of a specific biome"
    - "Server randomly selects a biome from the chosen tier"
    - "Locked tiers (level too low) are shown but disabled"
  artifacts:
    - path: "packages/shared-types/src/network/events.ts"
      provides: "Updated expedition:start event payload to use tier instead of biome"
      contains: "expedition:start.*tier"
    - path: "apps/game-server/src/game/expedition.service.ts"
      provides: "startExpeditionByTier method that randomly picks a biome from the tier"
      exports: ["startExpeditionByTier"]
    - path: "apps/web/src/ui/panels/NpcInteractionModal.tsx"
      provides: "Tier-based expedition UI with 4 tier buttons"
      contains: "tier"
  key_links:
    - from: "apps/web/src/ui/panels/NpcInteractionModal.tsx"
      to: "apps/web/src/store/npcStore.ts"
      via: "startExpedition(tier) call"
      pattern: "startExpedition.*tier"
    - from: "apps/web/src/store/npcStore.ts"
      to: "apps/game-server/src/game/game.gateway.ts"
      via: "expedition:start socket event with tier"
      pattern: "expedition:start.*tier"
    - from: "apps/game-server/src/game/game.gateway.ts"
      to: "apps/game-server/src/game/expedition.service.ts"
      via: "startExpeditionByTier call"
      pattern: "startExpeditionByTier"
---

<objective>
Fix expedition NPC interaction: (1) close the NPC interaction modal immediately when the user starts an expedition (not waiting for server response), and (2) change the expedition UI from showing all individual biomes to showing 4 difficulty tiers (I-IV) where the server randomly picks a biome from the selected tier.

Purpose: The modal currently stays open after teleport causing UI confusion. The biome list is overwhelming -- players should pick a difficulty tier and get a random biome for exploration variety.
Output: Updated expedition flow across client and server.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<interfaces>
<!-- Key types and contracts the executor needs -->

From packages/shared-types/src/network/events.ts:
```typescript
export interface ExpeditionDestination {
  biome: string;
  displayName: string;
  tier: number;
  requiredLevel: number;
  locked: boolean;
}

// ClientEvents
'expedition:start': { biome: string };

// ServerEvents
'expedition:complete': { biome: string; position: Position };
```

From packages/shared-types/src/game/biome.ts:
```typescript
export type BiomeTier = 1 | 2 | 3 | 4;
export const BIOME_TIERS: Record<BiomeType, BiomeTier> = { ... };
export const TIER_LEVEL_REQUIREMENTS: Record<BiomeTier, number> = { 1: 1, 2: 10, 3: 25, 4: 40 };
export const BIOME_DISPLAY_NAMES: Record<BiomeType, string> = { ... };
```

From apps/web/src/store/npcStore.ts:
```typescript
startExpedition: (biome: string) => void;  // emits 'expedition:start'
// listener: gameSocket.on('expedition:complete', () => { closeInteraction() })
```

From apps/game-server/src/game/expedition.service.ts:
```typescript
getDestinations(playerLevel: number): ExpeditionDestination[];
startExpedition(playerId: string, targetBiome: BiomeType): Promise<{success, error?, position?, oldZoneId?, newZoneId?}>;
```

From apps/game-server/src/game/game.gateway.ts:
```typescript
@SubscribeMessage('expedition:start')
handleExpeditionStart(client, data: { biome: string }): Promise<void>;
// Calls expeditionService.startExpedition(player.id, data.biome as BiomeType)
// Emits expedition:complete on success
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update shared types and server - tier-based expedition</name>
  <files>
    packages/shared-types/src/network/events.ts
    apps/game-server/src/game/expedition.service.ts
    apps/game-server/src/game/game.gateway.ts
  </files>
  <action>
1. In `packages/shared-types/src/network/events.ts`:
   - Change `ClientEvents['expedition:start']` payload from `{ biome: string }` to `{ tier: number }`.
   - Keep `ExpeditionDestination` interface as-is (still sent with NPC interaction data so client can show tier info/lock status).
   - Keep `expedition:complete` as-is (server tells client which biome was randomly selected).

2. In `apps/game-server/src/game/expedition.service.ts`:
   - Add a new method `startExpeditionByTier(playerId: string, tier: BiomeTier)` that:
     a. Validates player level meets `TIER_LEVEL_REQUIREMENTS[tier]`
     b. Filters `worldBiomes` array to only biomes matching that tier (using `BIOME_TIERS`)
     c. Picks a random biome from the filtered list
     d. Calls the existing `startExpedition(playerId, randomBiome)` internally
   - Keep the existing `startExpedition` method unchanged (used internally).
   - Keep `getDestinations` method unchanged (still used for NPC interaction response to show tier info).

3. In `apps/game-server/src/game/game.gateway.ts`:
   - Update `handleExpeditionStart` to read `data.tier` instead of `data.biome`.
   - Validate `data.tier` is a valid BiomeTier (1-4).
   - Call `this.expeditionService.startExpeditionByTier(player.id, data.tier as BiomeTier)` instead of `startExpedition(player.id, data.biome as BiomeType)`.
   - Keep the rest of the handler unchanged (zone transitions, room updates, etc.).
   - The `client.emit('expedition:complete', ...)` already sends the biome from result, keep it.
  </action>
  <verify>
    Run `npx nx run shared-types:build && npx nx run game-server:build` -- both must compile without errors.
  </verify>
  <done>
    Server accepts tier-based expedition requests, randomly selects a biome from that tier, validates level requirements per tier, and teleports the player.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update client - close modal immediately + tier-based UI</name>
  <files>
    apps/web/src/store/npcStore.ts
    apps/web/src/ui/panels/NpcInteractionModal.tsx
  </files>
  <action>
1. In `apps/web/src/store/npcStore.ts`:
   - Change `startExpedition` action signature from `(biome: string)` to `(tier: number)`.
   - In the `startExpedition` implementation:
     a. Set `expeditionPending: true`
     b. Call `closeInteraction()` immediately (closes the NPC modal right away, before server responds) -- but do this AFTER emitting the event so state is captured. Actually: emit `expedition:start` with `{ tier }` first, then close immediately. The close sets `interactingNpc: null` so the modal disappears. The server handles the teleport asynchronously.
     c. Emit `gameSocket.emit('expedition:start', { tier })`.
   - Simplify the `expedition:complete` listener: only reset `expeditionPending: false` (the modal is already closed). Keep `closeInteraction()` as a safety fallback -- it's idempotent (sets null again, no harm).
   - Also update the `NpcState` interface: `startExpedition: (tier: number) => void`.
   - Add a listener for the generic `error` event to reset `expeditionPending` when code is `EXPEDITION_FAILED` or `NOT_IN_HUB`. Add after the `expedition:complete` listener:
     ```typescript
     gameSocket.on('error', (data: { code: string; message: string }) => {
       if (data.code === 'EXPEDITION_FAILED' || data.code === 'NOT_IN_HUB') {
         useNpcStore.getState().setExpeditionPending(false);
       }
     });
     ```

2. In `apps/web/src/ui/panels/NpcInteractionModal.tsx`:
   - Replace the `renderExpeditionTab` function to show 4 tier buttons instead of individual biome buttons.
   - Group expedition destinations by tier from `interactingNpc.expeditionDestinations` (the server still sends the full list for level-lock info).
   - For each tier (I, II, III, IV), create a button showing:
     - Tier name: "Tier I - Frontier", "Tier II - Hazardous", "Tier III - Hostile", "Tier IV - Extreme"
     - Level requirement (from any destination in that tier, or hardcoded from TIER_LEVEL_REQUIREMENTS)
     - Biome count available in that tier (e.g., "4 biomes")
     - Locked/available status based on player level
   - On click of a tier button, call `startExpedition(tier)` with the tier number.
   - Remove the old per-biome button mapping.
   - Update the expedition info text from "Select a biome to explore" to "Select a difficulty tier. You will be sent to a random biome of that difficulty."
   - Use CSS classes: `npc-expedition-destination` (reuse existing), `tier-{N}` (reuse existing).
   - Tier descriptions for flavor:
     - Tier I: "Frontier zones - standard exploration"
     - Tier II: "Hazardous zones - specialized equipment recommended"
     - Tier III: "Hostile zones - advanced gear required"
     - Tier IV: "Extreme zones - elite equipment essential"
  </action>
  <verify>
    Run `npx nx run web:build` -- must compile without errors.
  </verify>
  <done>
    NPC interaction modal closes immediately when user clicks an expedition tier. UI shows 4 tier buttons instead of 16 individual biomes. Locked tiers are visually disabled with level requirement shown.
  </done>
</task>

</tasks>

<verification>
1. `npx nx run shared-types:build` compiles cleanly
2. `npx nx run game-server:build` compiles cleanly
3. `npx nx run web:build` compiles cleanly
4. Grep confirms: `expedition:start.*tier` in events.ts (not biome)
5. Grep confirms: `startExpeditionByTier` in expedition.service.ts
6. Grep confirms: `closeInteraction` called in startExpedition action in npcStore.ts
7. Grep confirms: `Tier I\|Tier II\|Tier III\|Tier IV` in NpcInteractionModal.tsx
</verification>

<success_criteria>
- Expedition NPC modal closes immediately when user selects a tier (no waiting for server)
- UI shows 4 tier buttons with descriptions and level requirements
- Server randomly selects a biome from the chosen tier
- Locked tiers (level too low) are disabled in the UI
- All three apps build cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/13-fix-expedition-npc-close-interaction-win/13-SUMMARY.md`
</output>
