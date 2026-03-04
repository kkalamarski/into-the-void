# Phase 120: Biome Hazard System — Research

**Researched:** 2026-03-04
**Status:** Complete

## Phase Goal

Hazardous biomes drain HP and apply stat debuffs to players without the correct protective gear. Protection gear is available in faction trader inventories before any hazard tick is enabled. HUD shows active hazard type and protection level.

## Codebase Analysis

### Existing Hazard Infrastructure

1. **BiomeHazard interface** already exists in `packages/shared-types/src/game/biome.ts`:
   - `type: 'radiation' | 'toxic' | 'cold' | 'heat' | 'void_storm' | 'pressure'`
   - `damage: number` and `frequency: number`
   - The `Biome` interface has `hazards: BiomeHazard[]`

2. **BIOME_TIERS** already maps all 16 biomes to Tiers 1-4 in `packages/shared-types/src/game/biome.ts`

3. **ComputedStats** already has `hazardResistance: number` field (in both `packages/game-logic/src/inventory/stats.ts` and `packages/shared-types/src/game/inventory.ts`)

4. **`life_support` effect type** exists in `packages/items/src/types.ts` — `{ type: 'life_support'; hazardResistance: number }` — and is resolved in `packages/game-logic/src/inventory/effects.ts`

5. **`isHubZone()`** utility already exists in `packages/shared-types/src/core/zone.ts` — returns true for zone IDs starting with `hub_`

6. **Existing antitoxin consumables** in `packages/items/src/definitions/consumables.ts` already use `stat_buff` with `hazard_resistance` stat — but this is the old generic pattern; Phase 120 needs hazard-type-specific protection

### Tick Loop Architecture

The AI tick loop in `apps/game-server/src/game/ai.service.ts` runs per-zone:
- `activateZone(zoneId)` starts a self-rescheduling `setTimeout` at 1000ms intervals
- `runZoneTick(zoneId)` processes creatures, combat, and player regen
- `processPlayerRegeneration(zoneId)` runs at end of each tick — iterates players, skips combat/dead
- Player health mutations happen in `PlayerService` (in-memory `Map<string, ConnectedPlayer>`)
- Damage events emitted via `server.to(zoneId).emit('combat:damage', ...)`
- Health updates emitted via `server.to(socketId).emit('player:health', ...)`

**Key insight from STATE.md:** HazardService must use synchronous `Map<playerId, HazardState>` read in tick — async per-player lookups would blow the 200ms tick budget.

### Zone-Biome Mapping

- Zone IDs follow `zone_{x}_{y}` format for open-world zones
- `getBiome(worldSeed, x, y)` returns the BiomeType for a zone
- Hub zones use `hub_` prefix — already excluded from AI tick loop
- Zone biome is available in `ZoneState.biome` and sent to client in `zone:state` event

### Equipment & Items Architecture

- **ItemEffect discriminated union** in `packages/items/src/types.ts` — add new hazard protection effect type here
- **effectiveStats()** in `packages/game-logic/src/inventory/stats.ts` — accumulates equipment stats; currently sums `hazardResistance` as a single number
- **NPC Traders** defined in `packages/npcs/src/definitions/{verdant,helix,nexus,neutral}.ts` — each has `inventory: TradeItem[]`
- **TraderDefinition** has `specialization` field (general, weapons, armor, consumables, etc.)

### HUD Architecture

- `apps/web/src/ui/hud/HUD.tsx` — main HUD component
- Already displays biome indicator with color dot + name
- Already shows safe zone indicator for hub zones
- Already shows combat indicator during combat
- Uses `react-icons/gi` for icons (GiShield, GiPoisonGas, etc.)
- Existing `GiPoisonGas` icon used for hazard resistance stat display
- Zustand stores: `gameStore`, `inventoryStore`, `combatStore`, `shieldStore`
- BuffBar component exists for temporary buff display

### What Needs to Be Created vs Modified

**New files needed:**
1. `packages/game-logic/src/hazard/hazard.ts` — Pure hazard calculation functions (damage, debuff, protection)
2. `apps/game-server/src/game/hazard.service.ts` — HazardService with per-player state cache
3. `apps/web/src/ui/hud/HazardIndicator.tsx` — HUD hazard indicator component
4. `apps/web/src/store/hazardStore.ts` — Zustand store for hazard state
5. Hazard protection consumables (new consumable definitions)
6. Hazard protection gear items (new or modified suit/module definitions)

**Files to modify:**
1. `packages/shared-types/src/game/biome.ts` — Extend BiomeHazard with hazard groups, add hazard type constants
2. `packages/shared-types/src/network/events.ts` — Add hazard-related server events
3. `packages/items/src/types.ts` — Add `hazard_protection` effect type to ItemEffect union
4. `packages/game-logic/src/inventory/effects.ts` — Handle new hazard_protection effect
5. `packages/game-logic/src/inventory/stats.ts` — Extend ComputedStats for per-type hazard protection
6. `apps/game-server/src/game/ai.service.ts` — Call HazardService in tick loop
7. `apps/game-server/src/game/game.module.ts` — Register HazardService
8. `apps/web/src/ui/hud/HUD.tsx` — Add HazardIndicator component
9. NPC trader definitions — Add protection gear to inventories

## Hazard Type Groupings (from CONTEXT.md)

| Hazard Group | Biomes | Color | Tier |
|---|---|---|---|
| Chemical | Toxic Wastes, Miasma Marshes | Green (#88cc44) | II-III |
| Thermal | Volcanic Ridge, Frozen Expanse | Red (#ff4500) | III |
| Physical | Crystalline Wastes, Petrified Expanse | Blue (#4488ff) | II-III |
| Biological | Fungal Forest (starfall_crater/Fungal Depths) | Purple (#9370db) | III |
| Anomalous | Void Rift | Deep Purple (#4a0080) | IV |

## Tiered Severity Model

| Tier | Biomes | Effects |
|---|---|---|
| I | void_plains, fungal_forest, tidal_pools, ancient_ruins | No hazard effects |
| II | toxic_wastes, miasma_marshes, petrified_expanse, bioluminescent_depths, kelp_forests | Stat debuff only |
| III | volcanic_ridge, crystal_caves, crystalline_wastes, frozen_expanse, deep_trenches, starfall_crater | HP drain + stat debuff |
| IV | void_rift | Stacking escalation mechanic |

## Protection Model

Per CONTEXT.md decisions:
- Percentage-based: each gear piece provides % protection against specific hazard type
- Linear reduction: 50% protection = 50% less drain and debuff
- Additive stacking: gear + consumable (60% + 30% = 90%)
- 100% = full immunity
- Need `hazard_protection` effect on items with: `hazardType` and `protectionPercent`

## Tick Rate & Damage Formula

Success criteria: 8% base HP per tick, ~30-45 second survival at Tier III.

With 1-second AI tick interval:
- If damage applied every 2 ticks (2 seconds): 30s / 2s = 15 ticks, 100% / 15 = ~6.67% per damage tick
- If damage applied every 3 ticks (3 seconds): 30s / 3s = 10 ticks, 100% / 10 = 10% per damage tick → too fast
- **Best fit: 2-second hazard tick (every other AI tick), ~8% base HP per damage tick** → ~12 ticks to kill = 24 seconds at Tier III
- Adjusted: 6.5% per tick at 2.5-second interval → ~15 ticks to kill = ~37 seconds → good fit for 30-45s window

**Recommendation:** Use a 3-second hazard tick (every 3rd AI tick), 8% base HP per tick → 12.5 ticks to die = ~37.5 seconds. Clean numbers, meets success criteria.

## Grace Period Implementation

3-second grace period on biome entry. Track `enteredAt` timestamp per player per zone. Skip hazard processing until `Date.now() - enteredAt >= 3000`.

## Stat Debuff Design (Claude's Discretion)

Strategic debuffs per hazard group:
- **Chemical:** -20% perception (toxic fumes impair sensors)
- **Thermal:** -20% haste (extreme temp slows reaction time)
- **Physical:** -20% toughness (crystal shards bypass armor weak points)
- **Biological:** -20% recovery (spores suppress regeneration)
- **Anomalous:** -15% all stats (reality distortion affects everything), stacking -5% per 30s

## Dependencies

- Phase 117 (Damage Types) is complete — damage pipeline exists
- `DamageType` union and `calculateDamage()` are available
- Existing buff/debuff system via `Buff` interface can be extended for hazard debuffs
- No database schema changes needed — hazard state is ephemeral (in-memory only)

## Risk Assessment

1. **Tick budget:** HazardService MUST be synchronous read. Use `Map<playerId, HazardState>` updated on biome entry/gear change, read in tick loop.
2. **Existing hazardResistance:** Current `ComputedStats.hazardResistance` is a single generic number. Need to extend to per-type protection OR add separate `hazardProtection: Record<HazardType, number>`.
3. **Antitoxin consumables:** Existing antitoxins use generic `hazard_resistance` stat. Phase 120 should either repurpose them as Chemical-type-specific or create new hazard consumables and keep old ones as-is.
4. **Lore validation:** STATE.md flags: "Hazard protection gear for cold, heat, and pressure biomes needs lore validation against world-bible.md faction gear sections during planning." Verdant's Chloro-Filtration Suit is explicitly for toxic environments per CONTEXT.md.

---

## RESEARCH COMPLETE

*Phase: 120-biome-hazard-system*
*Researched: 2026-03-04*
