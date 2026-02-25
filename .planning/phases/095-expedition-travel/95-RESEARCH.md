# Phase 95: Expedition Travel - Research

**Researched:** 2026-02-26
**Domain:** NPC Systems, Teleportation, Biome Tier Gating
**Confidence:** HIGH

## Summary

Phase 95 implements an Expedition NPC in each faction hub that allows players to teleport to random world locations. The system gates high-tier destinations behind level requirements, providing progression incentive while keeping Tier I-II zones accessible to new players.

The codebase already has all necessary infrastructure:
1. **NPC Definition System** (`packages/npcs/`) - Complete type system with 5 NPC types including `service` type
2. **Hub Spawning** (`packages/world-gen/src/generation/hub.ts`) - NPC spawn positions defined per hub
3. **Zone Teleportation** (`apps/game-server/src/game/player.service.ts`) - `teleportToHub()` and `teleportFromHub()` patterns
4. **Biome Tiers** (lore/world-bible.md) - Clear tier definitions: I (Frontier), II (Hazardous), III (Hostile), IV (Extreme)

**Primary recommendation:** Add new `ServiceDefinition` with `serviceType: 'expedition'`, extend `handleNpcInteract` to emit expedition destinations, add new `expedition:start` WebSocket event following `hub:recall`/`hub:leave` teleportation patterns.

## Standard Stack

### Core (Already Exists)
| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| NPC Types | `packages/npcs/src/types.ts` | `ServiceDefinition` with `serviceType` field | Existing pattern for service NPCs |
| NPC Registry | `packages/npcs/src/registry.ts` | Singleton for definition lookups | Mirrors EntityRegistry pattern |
| Hub Config | `packages/world-gen/src/generation/hub.ts` | `npcSpawns` array per hub | Existing spawn mechanism |
| Player Service | `apps/game-server/src/game/player.service.ts` | Teleportation methods | `teleportToHub()`/`teleportFromHub()` patterns |
| Game Gateway | `apps/game-server/src/game/game.gateway.ts` | WebSocket event handlers | `@SubscribeMessage` pattern |
| Biome Generator | `packages/world-gen/src/generation/biome.ts` | Biome determination from coords | `getBiome()` method |

### New Components Required
| Component | Location | Purpose |
|-----------|----------|---------|
| Expedition NPC Definition | `packages/npcs/src/definitions/neutral.ts` | New service NPC with `serviceType: 'expedition'` |
| Biome Tier Mapping | `packages/shared-types/src/game/biome.ts` | `BIOME_TIERS` constant mapping biome to tier (I-IV) |
| Tier Level Requirements | `packages/shared-types/src/game/biome.ts` | `TIER_LEVEL_REQUIREMENTS` constant |
| Expedition Service | `apps/game-server/src/game/expedition.service.ts` | Destination selection + validation logic |

## Architecture Patterns

### Recommended Project Structure

No new packages needed - extend existing patterns:

```
packages/npcs/src/definitions/neutral.ts     # Add EXPEDITION_NPC definition
packages/shared-types/src/game/biome.ts      # Add BIOME_TIERS, TIER_LEVEL_REQUIREMENTS
apps/game-server/src/game/expedition.service.ts  # New service
apps/game-server/src/game/game.gateway.ts    # Add expedition:destinations, expedition:start handlers
apps/web/src/store/npcStore.ts               # Add expedition state
apps/web/src/ui/panels/NpcInteractionModal.tsx  # Add Expedition tab
```

### Pattern 1: Service NPC Type

**What:** NPCs with `npcType: 'service'` have a `serviceType` discriminator for different services.

**When to use:** When adding new hub services (repair, storage, transport, medical, expedition).

**Existing example from `packages/npcs/src/types.ts`:**
```typescript
/** Service NPC - utility services */
export interface ServiceDefinition extends BaseNpcDefinition {
  readonly npcType: 'service';
  readonly serviceType: 'repair' | 'storage' | 'transport' | 'medical';
}
```

**Extension for expedition:**
```typescript
export interface ServiceDefinition extends BaseNpcDefinition {
  readonly npcType: 'service';
  readonly serviceType: 'repair' | 'storage' | 'transport' | 'medical' | 'expedition';
}
```

### Pattern 2: WebSocket Event Handler

**What:** Socket.IO event handlers using NestJS decorators.

**When to use:** Any client-server RPC.

**Example from `game.gateway.ts`:**
```typescript
@SubscribeMessage('hub:recall')
async handleHubRecall(@ConnectedSocket() client: Socket): Promise<void> {
  const player = this.playerService.getPlayerBySocket(client.id);
  if (!player) return;

  // Validation
  if (isHubZone(player.position.zoneId)) {
    client.emit('error', { code: 'ALREADY_IN_HUB', message: '...' });
    return;
  }

  // Teleport
  const result = await this.playerService.teleportToHub(player.id);

  // Handle result
  if (result.success) {
    this.updatePlayerRooms(client, result.newZoneId);
    // ... zone state, notifications
  }
}
```

### Pattern 3: NPC Interaction Response

**What:** Server sends NPC-specific data when player interacts.

**When to use:** When NPC has service-specific UI needs.

**Example from `game.gateway.ts` - trader inventory:**
```typescript
if (npcDef.npcType === 'trader' && 'inventory' in npcDef) {
  response.inventory = [...npcDef.inventory];
}
```

**Extension for expedition:**
```typescript
if (npcDef.npcType === 'service' && 'serviceType' in npcDef && npcDef.serviceType === 'expedition') {
  response.expeditionDestinations = this.expeditionService.getAvailableDestinations(player.level);
}
```

### Anti-Patterns to Avoid

- **Hardcoding biome-tier in multiple places:** Use a single source of truth (`BIOME_TIERS` constant)
- **Level check only on server:** Show locked destinations in UI with level requirement for clarity
- **Random zone every teleport:** Generate deterministic seed from biome to get consistent "expedition locations"

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Biome from coordinates | Custom calculation | `BiomeGenerator.getBiome(x, y)` | Already deterministic from world seed |
| Random zone selection | `Math.random()` | Seeded noise from `SimplexNoise` | Reproducibility for debugging |
| Teleportation logic | New teleport method | Extend `PlayerService` pattern | Room management, zone state emission already handled |
| NPC spawning | Manual coordinate insertion | `HubConfig.npcSpawns` array | Existing hub generation picks these up |

## Common Pitfalls

### Pitfall 1: Spawning Inside Walls
**What goes wrong:** Random destination spawns player in collision tile
**Why it happens:** Random zone coordinate doesn't account for collision map
**How to avoid:** After selecting zone, find walkable spawn point using collision map
**Warning signs:** Player stuck after teleport, can't move

### Pitfall 2: No Zone State on Teleport
**What goes wrong:** Player teleports but sees empty world
**Why it happens:** Missing `zone:state` emission after position change
**How to avoid:** Follow `handleHubLeave` pattern exactly - emit zone:state after updating rooms
**Warning signs:** Black screen, no entities visible after expedition

### Pitfall 3: AI Not Activated in Destination
**What goes wrong:** Creatures don't attack or move after player arrives
**Why it happens:** Missing `aiService.activateZone()` call
**How to avoid:** Follow `handleHubLeave` pattern - activate AI and check immediate aggro
**Warning signs:** Static creatures, no combat triggers

### Pitfall 4: Tier Requirements Not Communicated
**What goes wrong:** Player clicks expedition to Tier III zone, gets error
**Why it happens:** UI shows all destinations without level requirements
**How to avoid:** Send `{ biome, tier, requiredLevel, locked: boolean }` in destinations list
**Warning signs:** Frustrated players, support tickets

### Pitfall 5: lastWorldPosition Overwritten
**What goes wrong:** Player recalls to hub, uses expedition, can't return to original location
**Why it happens:** Expedition overwrites `lastWorldPosition`
**How to avoid:** Expedition from hub should NOT modify `lastWorldPosition` - player can use hub:leave to return to where they recalled from, or expedition stays as new position
**Design decision needed:** Does expedition clear lastWorldPosition or preserve it?

## Code Examples

### Biome Tier Mapping (to add to `packages/shared-types/src/game/biome.ts`)

```typescript
/**
 * Biome survival tier classification from lore/world-bible.md
 * I = Frontier (starter), II = Hazardous, III = Hostile, IV = Extreme
 */
export const BIOME_TIERS: Record<BiomeType, 1 | 2 | 3 | 4> = {
  // Tier I - Frontier
  void_plains: 1,
  fungal_forest: 1,  // "Luminous Canopy" in lore
  tidal_pools: 1,    // "Coastal Shallows" in lore

  // Tier II - Hazardous
  crystal_caves: 2,
  miasma_marshes: 2,
  petrified_expanse: 2,
  kelp_forests: 2,
  bioluminescent_depths: 2,

  // Tier III - Hostile
  toxic_wastes: 3,
  volcanic_ridge: 3,
  frozen_expanse: 3,
  ancient_ruins: 3,
  deep_trenches: 3,
  crystalline_wastes: 3,
  starfall_crater: 3,

  // Tier IV - Extreme
  void_rift: 4,
};

/**
 * Minimum player level required to access each tier via expedition
 */
export const TIER_LEVEL_REQUIREMENTS: Record<1 | 2 | 3 | 4, number> = {
  1: 1,   // No restriction
  2: 10,  // Level 10+
  3: 20,  // Level 20+
  4: 35,  // Level 35+
};
```

### Expedition NPC Definition (to add to `packages/npcs/src/definitions/neutral.ts`)

```typescript
const EXPEDITION_COORDINATOR: ServiceDefinition = {
  id: 'npc_expedition',
  displayName: 'Expedition Coordinator',
  description: 'A former surveyor who now coordinates expeditions to uncharted territories.',
  npcType: 'service',
  faction: 'neutral',
  textureKey: 'npc_expedition',
  color: 0x4488cc, // Blue
  dialogue: [
    { text: 'Looking to explore? I can drop you anywhere on Terminus — for a price.', condition: 'greeting' },
    { text: 'Higher-tier zones are restricted until you have the experience to survive.', condition: 'busy' },
    { text: 'Safe travels. Or as safe as Terminus gets.', condition: 'farewell' },
  ],
  serviceType: 'expedition',
};
```

### Expedition Destination Selection Pattern

```typescript
interface ExpeditionDestination {
  biome: BiomeType;
  tier: 1 | 2 | 3 | 4;
  displayName: string;
  requiredLevel: number;
  locked: boolean;
}

function getAvailableDestinations(playerLevel: number): ExpeditionDestination[] {
  const destinations: ExpeditionDestination[] = [];

  for (const biome of Object.keys(BIOME_TIERS) as BiomeType[]) {
    const tier = BIOME_TIERS[biome];
    const requiredLevel = TIER_LEVEL_REQUIREMENTS[tier];

    destinations.push({
      biome,
      tier,
      displayName: BIOME_DISPLAY_NAMES[biome],
      requiredLevel,
      locked: playerLevel < requiredLevel,
    });
  }

  return destinations;
}
```

### Random Zone Selection for Biome

```typescript
/**
 * Get a random zone coordinate within a specific biome.
 * Uses seeded iteration to find matching zones.
 */
function getRandomZoneForBiome(
  biome: BiomeType,
  worldSeed: string,
  excludeZoneId?: string
): { x: number; y: number; zoneId: string } {
  const biomeGenerator = new BiomeGenerator(worldSeed);
  const searchRadius = 100; // Search within 100 zones of origin

  // Collect candidate zones
  const candidates: Array<{ x: number; y: number }> = [];

  for (let zx = -searchRadius; zx <= searchRadius; zx++) {
    for (let zy = -searchRadius; zy <= searchRadius; zy++) {
      const centerX = zx * 64 + 32;
      const centerY = zy * 64 + 32;
      const zoneBiome = biomeGenerator.getBiome(centerX, centerY);

      if (zoneBiome === biome) {
        const zoneId = `z_${zx}_${zy}`;
        if (zoneId !== excludeZoneId) {
          candidates.push({ x: zx, y: zy });
        }
      }
    }
  }

  if (candidates.length === 0) {
    throw new Error(`No zones found for biome: ${biome}`);
  }

  // Use deterministic random selection
  const noise = new SimplexNoise(`${worldSeed}_expedition`);
  const index = Math.abs(Math.floor(noise.noise2d(Date.now() / 1000, 0) * candidates.length)) % candidates.length;
  const selected = candidates[index];

  return {
    x: selected.x,
    y: selected.y,
    zoneId: `z_${selected.x}_${selected.y}`,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual NPC coordinates | `HubConfig.npcSpawns` array | Phase 48 | Centralized hub NPC management |
| Per-NPC interaction handlers | Single `npc:interact` + type dispatch | Phase 49 | Unified interaction flow |
| Direct teleport methods | `teleportToHub`/`teleportFromHub` pair | Phase 47 | Save/restore world position |

**Current patterns:**
- NPC definitions in `packages/npcs/src/definitions/` by faction
- Service NPCs use `serviceType` discriminator
- Hub travel uses save/restore position pattern
- Biome tiers documented in lore but not yet coded

## Open Questions

1. **Should expedition clear lastWorldPosition?**
   - What we know: `teleportToHub` saves position, `teleportFromHub` restores it
   - What's unclear: If player uses expedition from hub, do they lose their saved return point?
   - Recommendation: Clear it - expedition is choosing a new "home base" location. Use case: player recalls to hub, does trading, then expeditions to a new zone. They likely want to explore that zone, not return to their old position.

2. **Expedition destination: random biome zone or specific expedition outpost?**
   - What we know: Requirements say "random world location appropriate for their level"
   - What's unclear: Should there be special expedition landing zones or any zone in the biome?
   - Recommendation: Any random zone in the biome, spawn at walkable tile. Outposts are explicitly out of scope per REQUIREMENTS.md.

3. **How many destinations to show?**
   - What we know: 16 biome types total
   - What's unclear: Show all biomes or one per tier?
   - Recommendation: Show all biomes grouped by tier. Locked tiers grayed out with level requirement. Player picks specific biome for exploration goals.

## Sources

### Primary (HIGH confidence)
- `packages/npcs/src/types.ts` - NPC type definitions (lines 1-81)
- `packages/npcs/src/definitions/neutral.ts` - Service NPC examples (lines 76-89)
- `packages/world-gen/src/generation/hub.ts` - Hub configuration with NPC spawns
- `apps/game-server/src/game/player.service.ts` - Teleportation patterns (lines 252-343)
- `apps/game-server/src/game/game.gateway.ts` - NPC interaction handler (lines 1059-1142)
- `packages/shared-types/src/game/biome.ts` - Biome type definitions
- `lore/world-bible.md` - Biome tier classifications (lines 71-84)

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` - TRAV-01 through TRAV-03 requirements

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components exist and patterns are established
- Architecture: HIGH - Following exact existing patterns for NPC services and teleportation
- Pitfalls: HIGH - Based on similar teleportation features (hub travel, respawn)

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable patterns, unlikely to change)
