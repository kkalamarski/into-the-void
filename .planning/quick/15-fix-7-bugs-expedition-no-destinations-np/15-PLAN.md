---
phase: quick-15
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/game-server/src/game/player.service.ts
  - apps/game-server/src/game/expedition.service.ts
  - packages/world-gen/src/generation/hub.ts
  - packages/game-logic/src/movement/pixel-validation.ts
autonomous: true
requirements: [BUG-1, BUG-2, BUG-3, BUG-4, BUG-5, BUG-6, BUG-7]

must_haves:
  truths:
    - "Expedition to any tier (1-4) finds a destination and teleports player"
    - "After expedition teleport, player can interact with NPCs in the new zone"
    - "After expedition teleport, player can use combat abilities on creatures"
    - "After expedition teleport, player can harvest resource nodes"
    - "Merchants (suit/tool/module vendors, faction traders) are reachable within 15 tiles of hub spawn"
    - "Player collision with walls feels tight — player stops at wall visual edge, not 1 tile before"
  artifacts:
    - path: "apps/game-server/src/game/player.service.ts"
      provides: "updatePosition syncs px/py from tile coords"
      contains: "tileToPixelCenter"
    - path: "apps/game-server/src/game/expedition.service.ts"
      provides: "Retry logic across all biomes in tier when first biome not found"
      contains: "shuffle"
    - path: "packages/world-gen/src/generation/hub.ts"
      provides: "Merchant NPCs positioned near docking/spawn area"
    - path: "packages/game-logic/src/movement/pixel-validation.ts"
      provides: "Reduced PLAYER_HITBOX.height for tighter wall collision"
  key_links:
    - from: "apps/game-server/src/game/expedition.service.ts"
      to: "apps/game-server/src/game/player.service.ts"
      via: "startExpedition calls updatePosition"
      pattern: "this\\.playerService\\.updatePosition"
    - from: "apps/game-server/src/game/player.service.ts"
      to: "packages/game-logic/src/movement/pixel-distance.ts"
      via: "updatePosition uses tileToPixelCenter to sync px/py"
      pattern: "tileToPixelCenter"
    - from: "apps/game-server/src/game/game.gateway.ts"
      to: "apps/game-server/src/game/player.service.ts"
      via: "NPC interact checks player.px/py distance"
      pattern: "player\\.px.*player\\.py"
---

<objective>
Fix 7 gameplay bugs grouped by 3 root causes: (1) expedition px/py desync after teleport causing NPC/combat/harvest failures, (2) expedition "no suitable destinations" for rare biomes, (3) merchants too far from spawn + collision hitbox too large.

Purpose: After this fix, players can complete the full gameplay loop — teleport via expedition, interact with NPCs and merchants, fight creatures, and harvest resources — without "too far away" or "no destinations" errors.
Output: 4 modified source files fixing all 7 reported bugs.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/game-server/src/game/player.service.ts
@apps/game-server/src/game/expedition.service.ts
@packages/world-gen/src/generation/hub.ts
@packages/game-logic/src/movement/pixel-validation.ts
@packages/game-logic/src/movement/pixel-distance.ts

<interfaces>
<!-- Key functions and patterns the executor needs -->

From packages/game-logic/src/movement/pixel-distance.ts:
```typescript
export function tileToPixelCenter(tileX: number, tileY: number): { px: number; py: number } {
  return {
    px: (tileX + 0.5) * TILE_SIZE_PX,
    py: (tileY + 0.5) * TILE_SIZE_PX,
  };
}
```

From packages/game-logic/src/movement/pixel-validation.ts:
```typescript
export const TILE_SIZE_PX = 128;
export const PLAYER_HITBOX = {
  width: Math.round(TILE_SIZE_PX * 0.5),  // 64 px
  height: Math.round(TILE_SIZE_PX * 0.5), // 64 px — THIS IS THE BUG (too tall)
} as const;
```

From packages/game-logic/src/combat/respawn.ts:
```typescript
export const FACTION_RESPAWN_COORDS: Record<FactionId, Position> = {
  verdant: { x: 64, y: 102, zoneId: 'hub_verdant' },
  helix: { x: 64, y: 103, zoneId: 'hub_helix' },
  nexus: { x: 64, y: 104, zoneId: 'hub_nexus' },
  neutral: { x: 56, y: 103, zoneId: 'hub_neutral' },
};
```

From apps/game-server/src/game/player.service.ts (existing pattern for teleportToHub):
```typescript
player.position = hubPosition;
const hubPixelCenter = tileToPixelCenter(hubPosition.x, hubPosition.y);
player.px = hubPixelCenter.px;
player.py = hubPixelCenter.py;
player.lastPxInputTime = Date.now();
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix px/py desync in updatePosition — resolves Bugs 2, 5, 6 (NPC too far, combat, harvesting)</name>
  <files>apps/game-server/src/game/player.service.ts</files>
  <action>
In `apps/game-server/src/game/player.service.ts`, modify the `updatePosition` method (line ~410) to also sync `player.px` and `player.py` from the new tile position.

Current code (BROKEN):
```typescript
updatePosition(playerId: string, position: Position): void {
  const player = this.players.get(playerId);
  if (player) {
    player.position = position;
  }
}
```

Replace with:
```typescript
updatePosition(playerId: string, position: Position): void {
  const player = this.players.get(playerId);
  if (player) {
    player.position = position;
    // Sync pixel coords so distance checks (NPC interact, combat, harvest) use correct position
    const pixelCenter = tileToPixelCenter(position.x, position.y);
    player.px = pixelCenter.px;
    player.py = pixelCenter.py;
    player.lastPxInputTime = Date.now();
  }
}
```

`tileToPixelCenter` is already imported at line 9. This follows the exact same pattern used in `teleportToHub()` (line 300-304) and `teleportFromHub()` (line 356-359).

WHY this is the root cause: After expedition teleport, `startExpedition()` calls `updatePosition()` which only set `player.position` (tile coords). All pixel-distance checks (NPC interaction at game.gateway.ts:1084, combat range at ability.service.ts:347, harvest range at ability.service.ts:330) use `player.px/py` which remained at the OLD zone's coordinates, causing every interaction to fail with "too far away".
  </action>
  <verify>
Build game-server: `cd /Users/krzysztof.kalamarski/Projects/into-the-void && npx nx run game-server:build`
Grep to confirm px/py sync in updatePosition: `grep -A5 "updatePosition" apps/game-server/src/game/player.service.ts | grep "tileToPixelCenter"`
  </verify>
  <done>
`updatePosition()` syncs `player.px`, `player.py`, and `player.lastPxInputTime` from tile position, matching the teleportToHub/teleportFromHub pattern. After expedition teleport, all pixel-distance checks (NPC, combat, harvest) use correct coordinates.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix expedition "no suitable destinations" — resolves Bug 1</name>
  <files>apps/game-server/src/game/expedition.service.ts</files>
  <action>
In `apps/game-server/src/game/expedition.service.ts`, modify `startExpeditionByTier()` (line ~81) to try ALL biomes in the tier before giving up, not just one random biome.

Current code (BROKEN — picks ONE random biome, gives up if that specific biome not found):
```typescript
const randomBiome = tierBiomes[Math.floor(Math.random() * tierBiomes.length)];
return this.startExpedition(playerId, randomBiome);
```

Replace the single-biome attempt with a shuffled loop that tries all biomes in the tier:

```typescript
// Shuffle tier biomes to randomize which biome we try first
const shuffled = [...tierBiomes].sort(() => Math.random() - 0.5);

for (const biome of shuffled) {
  const result = await this.startExpedition(playerId, biome);
  if (result.success) {
    return result;
  }
  // This biome wasn't found in search radius, try next one in tier
}

return { success: false, error: 'Could not find suitable destination for this tier' };
```

Also increase `maxSearchRadius` in `findZoneWithBiome()` (line ~204) from 50 to 100 to cover more territory for rare biomes like void_rift (tier 4):

```typescript
const maxSearchRadius = 100; // Up to 100 zones away (was 50)
```

WHY: Tier 4 has biomes like void_rift and crystalline_wastes which are rare in the noise function. With only 50 zones searched and only 1 biome attempted, the expedition frequently fails. By trying all biomes in the tier AND expanding search radius, at least one destination will be found.
  </action>
  <verify>
Build game-server: `cd /Users/krzysztof.kalamarski/Projects/into-the-void && npx nx run game-server:build`
Grep to confirm retry loop: `grep -A3 "shuffled" apps/game-server/src/game/expedition.service.ts`
Grep to confirm expanded radius: `grep "maxSearchRadius" apps/game-server/src/game/expedition.service.ts`
  </verify>
  <done>
`startExpeditionByTier()` tries all biomes in the requested tier (shuffled for randomness) before returning failure. `findZoneWithBiome()` searches up to 100 zones (was 50). Tier 4 rare biomes reliably found.
  </done>
</task>

<task type="auto">
  <name>Task 3: Move merchants near spawn + reduce collision hitbox — resolves Bugs 3, 7 (and safeguard for Bug 4)</name>
  <files>
    packages/world-gen/src/generation/hub.ts
    packages/game-logic/src/movement/pixel-validation.ts
  </files>
  <action>
**Part A — Move merchants closer to spawn (Bug 3):**

In `packages/world-gen/src/generation/hub.ts`, add a SECOND set of merchant NPCs near each hub's docking/spawn area. Players spawn at y=102-104, so place additional vendors at y=90-96 (within 10-15 tiles of spawn, in the docking bay rooms).

Keep the existing NW merchants (they serve players who explore the hub), but ADD duplicate vendor entries near the docking bay for each hub:

For `hub_verdant` (docking at 44,95 40x22), add after the existing npcSpawns array entries:
```typescript
// Docking Bay vendors (near spawn for quick access)
{ npcId: 'npc_suit_vendor', x: 50, y: 96 },
{ npcId: 'npc_tool_vendor', x: 58, y: 96 },
{ npcId: 'npc_module_vendor', x: 54, y: 92 },
```

For `hub_helix` (processing bay at 44,96 40x22), add:
```typescript
// Processing Bay vendors (near spawn for quick access)
{ npcId: 'npc_suit_vendor', x: 50, y: 98 },
{ npcId: 'npc_tool_vendor', x: 58, y: 98 },
{ npcId: 'npc_module_vendor', x: 54, y: 94 },
```

For `hub_nexus` (welcome center at 40,94 48x24), add:
```typescript
// Welcome Center vendors (near spawn for quick access)
{ npcId: 'npc_suit_vendor', x: 50, y: 96 },
{ npcId: 'npc_tool_vendor', x: 58, y: 96 },
{ npcId: 'npc_module_vendor', x: 54, y: 92 },
```

For `hub_neutral` (the docks at 38,96 36x22), add:
```typescript
// Dock vendors (near spawn for quick access)
{ npcId: 'npc_suit_vendor', x: 44, y: 98 },
{ npcId: 'npc_tool_vendor', x: 52, y: 98 },
{ npcId: 'npc_module_vendor', x: 48, y: 94 },
```

Place them BEFORE the expedition_master entries in each hub's npcSpawns array (inside the docking bay comment block).

**Part B — Reduce collision hitbox height (Bug 7):**

In `packages/game-logic/src/movement/pixel-validation.ts`, line 46, reduce `PLAYER_HITBOX.height` from `TILE_SIZE_PX * 0.5` (64px) to `TILE_SIZE_PX * 0.125` (16px):

```typescript
export const PLAYER_HITBOX = {
  width: Math.round(TILE_SIZE_PX * 0.5),    // 64 px (unchanged)
  height: Math.round(TILE_SIZE_PX * 0.125), // 16 px (was 64 — too tall caused stop 1 tile before walls)
} as const;
```

WHY height=16: The hitbox is anchored at feet (bottom-center). With height=64, the top corners extended 0.5 tiles above feet, and combined with the isometric south-neighbor collision extension (another 0.5 tiles), the player stopped ~1 full tile before the wall's visual south face. Reducing to 16px means collision is based almost entirely on foot position, so the player can walk right up to the wall's visual edge. Depth sorting (entityOffset=65 from quick-10) handles visual occlusion correctly.

**Part C — Elevation safeguard (Bug 4):**

Bug 4 (player sinking) was already fixed in quick-12 with bilinear elevation interpolation. No additional code changes needed. The remaining sinking reports were caused by Bug 2 (stale px/py after teleport), which Task 1 fixes. After Task 1, the player renders at the correct position with correct elevation data.
  </action>
  <verify>
Build game-logic: `cd /Users/krzysztof.kalamarski/Projects/into-the-void && npx nx run game-logic:build`
Run pixel-validation tests: `cd /Users/krzysztof.kalamarski/Projects/into-the-void && npx nx run game-logic:test -- --testPathPattern=pixel-validation`
Grep to confirm hitbox reduction: `grep "height:" packages/game-logic/src/movement/pixel-validation.ts`
Grep to confirm vendor near spawn: `grep -A1 "near spawn" packages/world-gen/src/generation/hub.ts`
  </verify>
  <done>
Each hub has 3 additional merchants (suit/tool/module vendors) within 10-15 tiles of spawn in the docking bay area. PLAYER_HITBOX.height reduced from 64 to 16, making wall collision feel tight at the visual wall edge instead of stopping 1 tile before.
  </done>
</task>

</tasks>

<verification>
1. Build all affected packages without errors:
   - `npx nx run game-server:build`
   - `npx nx run game-logic:build`
2. Run existing tests:
   - `npx nx run game-logic:test`
3. Code verification:
   - `updatePosition` in player.service.ts calls `tileToPixelCenter` and sets `player.px/py`
   - `startExpeditionByTier` loops through all shuffled biomes in tier
   - `findZoneWithBiome` uses `maxSearchRadius = 100`
   - Each hub has vendor NPCs with y-coord within 15 of spawn y-coord (102-104)
   - `PLAYER_HITBOX.height` is 16, not 64
</verification>

<success_criteria>
- All 7 bugs resolved by 3 root cause fixes
- `npx nx run game-server:build` passes
- `npx nx run game-logic:build` passes
- `npx nx run game-logic:test` passes
- No new TypeScript errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/15-fix-7-bugs-expedition-no-destinations-np/15-SUMMARY.md`
</output>
