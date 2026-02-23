# Phase 79: Resource Risk/Reward - Research

**Researched:** 2026-02-23
**Domain:** Procedural spawn systems, visual effects, discovery tracking
**Confidence:** HIGH

## Summary

Phase 79 implements risk/reward mechanics for gathering by spawning rare, high-tier resource nodes near aggressive creatures and providing visual distinction for rare nodes. Players can track discovered rare nodes via map markers.

The codebase already has strong foundations: procedural spawn system (spawn.ts), biome-based spawn configurations, entity lifecycle management, discovery tracking (DiscoveryService), and visual effects capabilities (Phaser 3 PostFX/particles). This phase extends existing spawn generation to introduce rarity tiers and proximity-based spawn rules, adds visual effects to EntityRenderer, and extends discovery tracking to resource nodes.

**Primary recommendation:** Use proximity-based spawn modifier during chunk generation to increase rare node spawn weight near predator/maniac creatures. Add rarity field to Mineral/Plant entities, render rare nodes with Phaser 3 PostFX glow + particle emitters, persist rare node discoveries to database with discoveredResources table mirroring discoveredPois pattern.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.85.0+ | Visual effects (PostFX glow, particles) | Already used for game rendering; PostFX pipeline introduced in v3.60 |
| Drizzle ORM | Current | Discovery persistence (discoveredResources table) | Existing pattern in discoveredPois, gathering_proficiency |
| SimplexNoise | Current | Rarity distribution noise | Already used in BiomeGenerator for fertility/temperature |
| SeededRandom | Current | Deterministic rare node placement | Ensures consistent world generation across server restarts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| LRU Cache | Current | Rare node discovery cache | Reduce DB queries for active players (pattern from ZonesService) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostFX glow | Custom shader | PostFX is built-in, easier to maintain, good performance |
| Particle emitter | Sprite animation | Particles more flexible for shimmer/sparkle effects |
| Database table | In-memory only | Persistence required for map marker feature across sessions |

**Installation:**
No new dependencies required - all capabilities exist in current stack.

## Architecture Patterns

### Recommended Project Structure
```
packages/world-gen/src/generation/
├── spawn.ts                  # Extend with rare node spawn logic
├── rarity.ts                 # NEW: Rarity calculation & proximity rules

packages/entities/src/
├── types.ts                  # Add rarity field to MineralDefinition/PlantDefinition
├── definitions/minerals.ts   # Add rarity tiers to existing definitions
├── definitions/plants.ts     # Add rarity tiers to existing definitions

apps/game-server/src/
├── game/discovery.service.ts # Extend to support resource discovery
├── zones/zones.service.ts    # Enrich entities with rarity during spawn

apps/web/src/game/
├── rendering/EntityRenderer.ts  # Add visual effects for rare nodes
├── effects/RareNodeFX.ts       # NEW: Glow + particle configuration

packages/database/src/schema/
├── discovered-resources.ts   # NEW: Track rare node discoveries
```

### Pattern 1: Proximity-Based Spawn Weight Modifier
**What:** During chunk generation, query spawned creatures in same chunk, increase rare node spawn weight for nodes within proximity of predator/maniac creatures.
**When to use:** In generateSpawnPoints after creature spawns are placed.
**Example:**
```typescript
// Source: Procedural generation research + existing spawn.ts pattern
// In spawn.ts after creature spawn generation:

interface RareSpawnConfig {
  baseMineralRarity: number;  // 0.05 = 5% base rare spawn chance
  proximityRange: number;     // tiles from creature
  proximityMultiplier: number; // 3.0 = 3x rare spawn chance near danger
}

function calculateRarityWeight(
  position: { x: number; y: number },
  creatures: SpawnPoint[],
  config: RareSpawnConfig
): number {
  let weight = config.baseMineralRarity;

  for (const creature of creatures) {
    const distance = Math.hypot(
      position.x - creature.x,
      position.y - creature.y
    );

    // Get creature definition to check behavior
    const def = EntityRegistry.get(creature.spawnId) as CreatureDefinition;
    const isDangerous = def.behavior === 'predator' || def.behavior === 'maniac';

    if (isDangerous && distance <= config.proximityRange) {
      // Linear falloff: full multiplier at zero distance, 1x at max range
      const falloff = 1 - (distance / config.proximityRange);
      weight *= 1 + (config.proximityMultiplier - 1) * falloff;
    }
  }

  return Math.min(weight, 1.0); // Cap at 100%
}
```

### Pattern 2: Phaser 3 PostFX Glow for Rare Nodes
**What:** Apply glow effect to rare node sprites using Phaser's built-in PostFX pipeline.
**When to use:** In EntityRenderer when creating entity containers for rare minerals/plants.
**Example:**
```typescript
// Source: Phaser 3 PostFX documentation (docs.phaser.io)
// In EntityRenderer.createEntityContainer:

if (entity.type === 'mineral' || entity.type === 'plant') {
  const rarity = (entity as Mineral | Plant).rarity;

  if (rarity === 'rare') {
    // Gold glow for rare nodes
    sprite.postFX.addGlow(0xffd700, 4, 0, false, 0.1, 10);

    // Subtle particle shimmer
    const emitter = this.scene.add.particles(0, -this.elevationOffset, 'particle', {
      speed: { min: 10, max: 20 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 1000,
      frequency: 200,
      blendMode: Phaser.BlendModes.ADD,
      tint: 0xffd700,
    });
    container.add(emitter);
  } else if (rarity === 'epic') {
    // Purple glow for epic nodes
    sprite.postFX.addGlow(0x9400d3, 6, 0, false, 0.15, 12);
  }
}
```

### Pattern 3: Discovery Tracking with Database Persistence
**What:** Track discovered rare nodes in database, load on character join for map marker display.
**When to use:** When player approaches rare node (proximity trigger), persist to discoveredResources table.
**Example:**
```typescript
// Source: Existing DiscoveryService pattern from Phase 77
// New table schema in discovered-resources.ts:

export const discoveredResources = pgTable('discovered_resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull(), // 'rare' | 'epic' | 'exotic'
  resourceType: varchar('resource_type', { length: 50 }).notNull(), // 'mineral' | 'plant'
  zoneId: varchar('zone_id', { length: 50 }).notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
});

// Unique constraint: one discovery per character per resource node
export const discoveredResourcesUnique = pgUniqueIndex('discovered_resources_char_entity')
  .on(discoveredResources.characterId, discoveredResources.entityId);
```

### Anti-Patterns to Avoid
- **Global rarity noise layer:** Don't use world-space noise for rarity - makes rare nodes predictable and farmable. Use per-chunk seeded random with proximity modifiers.
- **Client-side rarity generation:** Rarity must be server-authoritative to prevent client manipulation of spawn locations.
- **Permanent markers on common nodes:** Only persist discoveries for rare+ nodes to avoid database bloat.
- **Visual effects on all nodes:** Apply glow/particles only to rare+ to maintain performance and visual clarity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spatial proximity queries | Manual distance checks in nested loops | Spatial partitioning or chunk-local queries | Existing spawn system is chunk-scoped; creatures and minerals spawn in same chunk, so simple array iteration is O(n*m) but n and m are small (~15 creatures, ~10 minerals per chunk). Spatial partitioning adds complexity without benefit at this scale. |
| Glow/shimmer effects | Custom WebGL shaders | Phaser 3 PostFX + particle emitters | PostFX pipeline is built-in, hardware-accelerated, and well-tested. Custom shaders require GLSL knowledge and cross-platform testing. |
| Discovery deduplication | Application-level checks | Database unique constraints | Unique index on (characterId, entityId) prevents race conditions and ensures data integrity at DB level. |
| Rarity tier configuration | Hardcoded values | Biome-based config table | Follow existing BIOME_SPAWN_CONFIGS pattern - different biomes have different rare node distributions. |

**Key insight:** Procedural generation at chunk scale (64x64 tiles) means brute-force proximity checks are acceptable. Optimize only if profiling shows issues.

## Common Pitfalls

### Pitfall 1: Rare Node Spawn Flooding
**What goes wrong:** Without spawn caps, high danger areas spawn 100% rare nodes, breaking risk/reward balance.
**Why it happens:** Proximity multiplier applied to every mineral spawn compounds exponentially in dense creature areas.
**How to avoid:**
- Cap rare node count per chunk (e.g., max 3 rare, 1 epic per chunk regardless of danger).
- Use rarity budget: chunk has X rarity points, rare costs 3, epic costs 10, exotic costs 30.
**Warning signs:** Players reporting rare nodes are "everywhere" in high-tier biomes.

### Pitfall 2: Rarity Persistence Sync Issues
**What goes wrong:** Client shows rare node, player approaches, server says "already discovered" due to stale cache.
**Why it happens:** Discovery cache not invalidated when player discovers node in different session.
**How to avoid:**
- Load discoveries on character join, cache for session duration.
- Broadcast discovery events to all clients in zone so markers appear immediately.
- Use optimistic UI: show "discovered" state immediately on client, rollback if server rejects.
**Warning signs:** Players reporting "ghost markers" or markers not appearing until relog.

### Pitfall 3: Visual Effect Performance Degradation
**What goes wrong:** 50+ rare nodes in viewport with glow + particles drops FPS to 15.
**Why it happens:** PostFX is per-object, particle emitters run every frame.
**How to avoid:**
- Limit particle emitters to nearby rare nodes (distance culling).
- Use static glow tint instead of PostFX for nodes beyond medium range.
- Disable effects entirely for nodes outside viewport (handled by ViewportCuller).
**Warning signs:** FPS drops when panning camera across rare-node-dense areas.

### Pitfall 4: Deterministic Spawn Breaks with Proximity Rules
**What goes wrong:** Same world seed generates different rare nodes on different server instances.
**Why it happens:** Proximity calculation order varies if creatures spawn in different order.
**How to avoid:**
- Sort creature spawns by (x, y) before applying proximity modifiers.
- Use creature spawn position (not runtime position) for proximity checks.
- Seed rare node RNG with chunk coords + creature spawn positions hash.
**Warning signs:** Player-reported map markers don't align with actual rare node locations after server restart.

### Pitfall 5: Rare Node Discovery Spam
**What goes wrong:** Discovery trigger fires repeatedly as player moves near rare node.
**Why it happens:** Proximity check runs every frame without cooldown.
**How to avoid:**
- Server-side: Check if already discovered before processing.
- Client-side: Track discovery attempts in-flight, don't send duplicate requests.
- Use unique constraint on DB to reject duplicates atomically.
**Warning signs:** Database error logs showing unique constraint violations, or players receiving multiple discovery rewards for same node.

## Code Examples

Verified patterns from existing codebase and research:

### Extending MineralDefinition with Rarity
```typescript
// Source: packages/entities/src/types.ts (existing pattern)
export interface MineralDefinition extends BaseEntityDefinition {
  readonly entityClass: 'mineral';
  readonly miningYield: readonly HarvestYield[];
  readonly requiredTier: 1 | 2 | 3 | 4;
  readonly respawnSeconds: number;
  readonly rarity?: 'common' | 'rare' | 'epic' | 'exotic'; // NEW - default 'common'
}

// In definitions/minerals.ts - add rare variant:
export const MINERAL_VOID_CRYSTAL_RARE: MineralDefinition = {
  id: 'mineral_void_crystal_rare',
  displayName: 'Pristine Void Crystal',
  description: 'Exceptionally pure void crystal formation. Rarely found near apex predators.',
  entityClass: 'mineral',
  biomes: ['void_plains'],
  textureKey: 'mineral_void_crystal', // Same texture, visual distinction via FX
  color: 0x6a6a8a, // Slightly different fallback for rare
  lootTableId: 'loot_mineral_void_crystal_rare',
  miningYield: [
    { itemId: 'world_void_crystal', minAmount: 3, maxAmount: 6, chance: 1.0 }, // 2x yield
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.4 }, // Bonus drop
  ],
  requiredTier: 2, // Higher tier requirement
  respawnSeconds: 600, // Longer respawn
  rarity: 'rare',
};
```

### Rare Node Spawn Integration in generateSpawnPoints
```typescript
// Source: packages/world-gen/src/generation/spawn.ts (extended)
// After existing mineral spawn generation:

// Separate rare node spawns (lower count, proximity-dependent)
const RARE_SPAWN_CONFIG = {
  baseMineralRarity: 0.05,
  proximityRange: 10, // tiles
  proximityMultiplier: 3.0,
};

const rareNodeBudget = 3; // Max rare nodes per chunk
let rareNodesSpawned = 0;

for (let attempt = 0; attempt < 20 && rareNodesSpawned < rareNodeBudget; attempt++) {
  const position = findValidSpawnPosition(random, collisionMap);
  if (!position) continue;

  const rarityWeight = calculateRarityWeight(
    position,
    spawnPoints.filter(sp => sp.entityType === 'creature'),
    RARE_SPAWN_CONFIG
  );

  if (random.next() < rarityWeight) {
    const worldX = chunkX * ZONE_SIZE + position.x;
    const worldY = chunkY * ZONE_SIZE + position.y;
    const tileBiome = biomeGenerator.getBiome(worldX, worldY);

    // Get rare mineral variant for this biome
    const rareMinerals = getRareBiomeMinerals(tileBiome);
    const mineral = weightedPick(random, rareMinerals);

    if (mineral) {
      spawnPoints.push({
        x: position.x,
        y: position.y,
        entityType: 'mineral',
        spawnId: mineral.id,
        respawnTime: 300 + random.nextInt(0, 300),
      });
      rareNodesSpawned++;
    }
  }
}
```

### Client-Side Rare Node Marker Display
```typescript
// Source: Existing PoiRenderer pattern from Phase 77
// In WorldScene, after POI renderer initialization:

private rareNodeMarkers: Map<string, Phaser.GameObjects.Container> = new Map();
private discoveredRareNodes: Set<string> = new Set();

// Load discovered rare nodes on character join:
gameSocket.on('rare-nodes:discovered', (data: { entityIds: string[] }) => {
  this.discoveredRareNodes = new Set(data.entityIds);
  this.refreshRareNodeMarkers();
});

// When entity is rendered, check if it's a discovered rare node:
private renderRareNodeMarker(entity: Mineral | Plant): void {
  if (!this.discoveredRareNodes.has(entity.id)) return;
  if (!entity.rarity || entity.rarity === 'common') return;

  const worldPos = this.positionToWorldCoords(entity.position);
  const screenPos = this.isoTransform.gridToScreen(worldPos.x, worldPos.y);

  const marker = this.add.container(screenPos.x, screenPos.y - 300);

  // Icon based on rarity
  const icon = this.add.image(0, 0, entity.rarity === 'rare' ? 'icon_rare' : 'icon_epic');
  icon.setScale(0.5);
  marker.add(icon);

  // Depth: above fog, below HUD (3000)
  marker.setDepth(2500);
  this.rareNodeMarkers.set(entity.id, marker);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Uniform resource distribution | Danger-based rarity distribution | Phase 79 (2026) | Encourages risk-taking, creates high-value gathering routes |
| No visual distinction for quality | Glow + particles for rare nodes | Phaser 3.60+ (2022) | Players can identify valuable nodes at a glance |
| Static spawn tables | Proximity-modified spawn weights | Modern procedural generation | Dynamic risk/reward emerges from creature/resource proximity |
| Manual shader coding | PostFX pipeline | Phaser 3.60+ (2022) | Easier visual effects implementation, better performance |

**Deprecated/outdated:**
- Manual WebGL shader management: Use PostFX pipeline instead (built-in, optimized).
- Client-side spawn generation: Security risk, always server-authoritative.
- Global state for discoveries: Use per-character database records for persistence.

## Open Questions

1. **Rarity Tier Distribution**
   - What we know: Biomes have tier classifications (I-IV), higher tiers should have better rewards.
   - What's unclear: Should rare node spawn chance be biome-tier dependent, or purely proximity-based?
   - Recommendation: Hybrid approach - base rare chance scales with biome tier (1% Tier I, 5% Tier IV), then proximity multiplier applies. Ensures high-tier biomes feel rewarding even in safe areas.

2. **Map Marker Persistence Scope**
   - What we know: Players want to track rare node locations across sessions.
   - What's unclear: Should markers persist after node is depleted? Should they expire after X days of inactivity?
   - Recommendation: Persist until node is harvested, then remove marker. Prevents outdated markers from cluttering map. Add "recently harvested" indicator that fades after respawn timer.

3. **Visual Effect Scalability**
   - What we know: Phaser PostFX is per-object, particles are per-frame updates.
   - What's unclear: Maximum rare nodes in viewport before performance degrades?
   - Recommendation: Load test with 50+ rare nodes. If FPS drops below 30, implement distance-based effect LOD: full effects <20 tiles, tint-only 20-40 tiles, no effects >40 tiles.

## Sources

### Primary (HIGH confidence)
- Codebase: packages/world-gen/src/generation/spawn.ts - Existing spawn generation patterns
- Codebase: packages/entities/src/types.ts - Entity definition structure
- Codebase: apps/game-server/src/game/discovery.service.ts - Discovery tracking pattern
- Codebase: apps/web/src/game/rendering/EntityRenderer.ts - Visual rendering patterns
- [Phaser 3 PostFX Documentation](https://docs.phaser.io/phaser/concepts/fx) - FX pipeline capabilities
- [Phaser 3 Glow FX](https://docs.phaser.io/api-documentation/class/renderer-webgl-pipelines-fx-glowfxpipeline) - Glow effect parameters

### Secondary (MEDIUM confidence)
- [State of Decay 2 Procedural Generation](https://www.gamedeveloper.com/design/procedurally-generating-enemies-places-and-loot-in-i-state-of-decay-2-i-) - Risk/reward spawn density patterns
- [Phaser 3 Particle Emitters](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/particles/) - Particle system configuration
- [Spatial Query Systems](https://www.gamedeveloper.com/programming/creating-a-spatial-query-system) - Proximity detection patterns
- [Game UI Database - Waypoints](https://www.gameuidatabase.com/index.php?scrn=163) - Map marker UI patterns

### Tertiary (LOW confidence)
- [Unreal PCG Density Systems](https://dev.epicgames.com/documentation/en-us/unreal-engine/procedural-content-generation-overview) - Density-based spawning concepts (different engine, but concepts applicable)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All required capabilities exist in current codebase (Phaser PostFX, Drizzle, procedural generation)
- Architecture: HIGH - Strong existing patterns for discovery tracking, spawn generation, and visual effects
- Pitfalls: MEDIUM - Spawn flooding and performance issues are predictable, but exact thresholds need testing

**Research date:** 2026-02-23
**Valid until:** 60 days (stable domain - procedural generation and visual effects patterns unlikely to change rapidly)
