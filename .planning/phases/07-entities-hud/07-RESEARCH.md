# Phase 7: Entities & HUD - Research

**Researched:** 2026-02-15
**Domain:** Phaser 3 entity rendering, health bar overlays, HUD implementation with React
**Confidence:** MEDIUM-HIGH

## Summary

Phase 7 implements entity rendering (other players, creatures, items, plants) and a comprehensive HUD (health, energy, zone info, minimap). The phase builds on existing Phaser 3 + React architecture established in Phases 4-6.

Key technical challenges: (1) rendering multiple entity sprites with health bars and behavior icons efficiently, (2) managing entity lifecycle (spawn/despawn/update) through WebSocket events, (3) implementing React-based HUD overlays that communicate with Phaser game state, and (4) creating a minimap that shows player position and biome colors.

The codebase already has foundations: PreloadScene generates placeholder textures for creatures/minerals/items, WorldScene has entity sprite maps and methods (spawnEntity, despawnEntity, updateEntity), and shared-types defines Entity interfaces with behavior types. The HUD component exists but needs energy bar and minimap additions.

**Primary recommendation:** Use Phaser Container objects for entities with health bars/icons as children, React components for HUD (health/energy bars already exist), and Phaser's multi-camera system for minimap rendering. Leverage existing ZoneHUD pattern (Phaser text fixed to camera) for zone display, keeping it consistent with current architecture.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.x (current in project) | Game rendering engine | Already integrated, handles sprites, containers, cameras |
| React | 18.x | HUD UI layer | Already used for HUD.tsx, GameUI.tsx - proven pattern |
| Zustand | 4.x | Game state management | Already integrated in gameStore.ts for player/entity state |
| Socket.IO | 4.x (client) | Entity event streaming | Already handling zone:state, player:moved events |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @into-the-void/shared-types | monorepo | Entity/event type contracts | All entity rendering - ensures client/server agreement |
| Phaser.GameObjects.Graphics | built-in | Health bar rendering | When drawing dynamic bars above sprites |
| Phaser.GameObjects.Container | built-in | Group sprites with overlays | When entity needs sprite + health bar + icon |
| Phaser.Cameras.Scene2D.Camera | built-in | Minimap implementation | Render world at smaller scale in HUD corner |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React HUD overlays | Phaser UI scene | Phaser UI harder to style, React already proven in project |
| Phaser multi-camera minimap | Canvas 2D rendering | Custom canvas adds complexity, camera reuses world rendering |
| Container for entities | Individual GameObject management | Containers simplify parent-child transforms but add one layer |

**Installation:**
```bash
# All dependencies already installed in project
# No new packages required for Phase 7
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── game/
│   ├── scenes/
│   │   └── WorldScene.ts          # Entity sprite management (already has maps)
│   ├── rendering/
│   │   ├── EntityRenderer.ts      # NEW: Health bars, behavior icons
│   │   └── MinimapCamera.ts       # NEW: Minimap rendering logic
│   └── ui/
│       └── ZoneHUD.ts             # Existing: Zone name + tier display
├── ui/hud/
│   ├── HUD.tsx                    # EXTEND: Add energy bar, minimap component
│   ├── HealthBar.tsx              # Existing component (reuse pattern)
│   └── Minimap.tsx                # NEW: React wrapper for Phaser minimap
├── store/
│   └── gameStore.ts               # EXTEND: Add energy state
└── components/
    └── GameContainer.tsx          # EXTEND: Wire entity spawn/despawn events
```

### Pattern 1: Entity Container Composition
**What:** Each entity is a Phaser Container with sprite + health bar + behavior icon as children
**When to use:** For creatures and damaged entities that need overlays
**Example:**
```typescript
// EntityRenderer pattern (based on existing WorldScene sprite management)
class EntityRenderer {
  createEntityContainer(entity: Entity): Phaser.GameObjects.Container {
    const container = this.scene.add.container(
      entity.position.x * TILE_SIZE + TILE_SIZE / 2,
      entity.position.y * TILE_SIZE + TILE_SIZE / 2
    );

    // Main sprite (already have textures: 'creature', 'mineral', 'item')
    const sprite = this.scene.add.sprite(0, 0, this.getEntityTexture(entity.type));
    container.add(sprite);

    // Health bar (if damageable and damaged)
    if (this.isDamageable(entity) && entity.health < entity.maxHealth) {
      const healthBar = this.createHealthBar(entity.health, entity.maxHealth);
      healthBar.y = -20; // Above sprite
      container.add(healthBar);
    }

    // Behavior icon (if creature)
    if (entity.type === 'creature') {
      const icon = this.createBehaviorIcon(entity.behavior);
      icon.y = -30; // Above health bar
      container.add(icon);
    }

    return container;
  }
}
```

### Pattern 2: React-Phaser HUD Communication
**What:** React components read Zustand state, Phaser updates state via store
**When to use:** For all HUD elements (health, energy, minimap overlay)
**Example:**
```typescript
// Existing pattern from HUD.tsx - extend for energy
export const HUD: React.FC = () => {
  const { player } = useGameStore();

  const healthPercent = (player.health / player.maxHealth) * 100;
  const energyPercent = (player.energy / player.maxEnergy) * 100;

  return (
    <div className="hud">
      <div className="hud-top-left">
        <HealthBar percent={healthPercent} current={player.health} max={player.maxHealth} />
        <EnergyBar percent={energyPercent} current={player.energy} max={player.maxEnergy} />
      </div>
      <Minimap />
    </div>
  );
};
```

### Pattern 3: Minimap Multi-Camera
**What:** Use Phaser's Camera system to render world at small scale into fixed viewport
**When to use:** For minimap showing player position and biome colors
**Example:**
```typescript
// Based on Phaser official minimap-camera example
class MinimapCamera {
  private minimapCam: Phaser.Cameras.Scene2D.Camera;

  create(scene: Phaser.Scene) {
    // Create second camera for minimap (bottom-right corner)
    this.minimapCam = scene.cameras.add(
      scene.cameras.main.width - 210,  // x
      scene.cameras.main.height - 210, // y
      200,  // width
      200   // height
    );

    // Set zoom to show larger area
    this.minimapCam.setZoom(0.2);
    this.minimapCam.setBackgroundColor(0x000000);
    this.minimapCam.setBounds(0, 0, ZONE_SIZE * TILE_SIZE, ZONE_SIZE * TILE_SIZE);

    // Follow player (same target as main camera)
    this.minimapCam.startFollow(scene.localPlayer);
  }
}
```

### Pattern 4: Entity Lifecycle via Socket Events
**What:** Listen to entity:spawn, entity:despawn, entity:update events and sync to WorldScene
**When to use:** All entity management
**Example:**
```typescript
// In GameContainer.tsx or gameStore.ts (following existing player:moved pattern)
gameSocket.on('entity:spawn', (entity: Entity) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    worldScene.spawnEntity(entity); // Method already exists
  }
});

gameSocket.on('entity:despawn', ({ entityId }: { entityId: string }) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    worldScene.despawnEntity(entityId); // Method already exists
  }
});

gameSocket.on('entity:update', ({ entityId, changes }: { entityId: string; changes: Partial<Entity> }) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    worldScene.updateEntity(entityId, changes); // Method already exists
  }
});
```

### Anti-Patterns to Avoid
- **Creating new sprites per update:** Reuse existing sprite objects, only update positions/textures. WorldScene already has entitySprites Map for this.
- **DOM-heavy minimap:** Don't render minimap tiles as DOM elements - use Phaser camera or canvas for performance.
- **Polling game state:** Use Zustand subscriptions (useGameStore hooks) instead of polling intervals.
- **Deep Container nesting:** Keep entity containers shallow (sprite + 1-2 overlays max) to avoid transform overhead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Health bar rendering | Custom canvas drawing logic per frame | Phaser.GameObjects.Graphics with Container | Graphics handles clipping, transforms, and batching automatically |
| Minimap rendering | Custom tile-by-tile rendering | Phaser multi-camera system | Camera reuses existing world rendering, handles zoom/bounds automatically |
| HUD state management | Custom event emitters between Phaser/React | Zustand store (already integrated) | Project already uses Zustand for player state - consistent pattern |
| Entity position interpolation | Manual tween calculations | Phaser.Tweens (already used in WorldScene) | WorldScene.movePlayer already uses tweens successfully |
| Behavior icon textures | Loading PNG files | Phaser.GameObjects.Text or Graphics shapes | Text can display "H/O/P/M" letters, Graphics can draw simple shapes - no assets needed |

**Key insight:** The project already has most infrastructure (sprite maps, containers, tweens, state management). Phase 7 extends existing patterns rather than introducing new ones.

## Common Pitfalls

### Pitfall 1: Container Transform Confusion
**What goes wrong:** Health bars positioned incorrectly because Container children use local coordinates, not world coordinates.
**Why it happens:** Adding a sprite to a Container changes its coordinate system - child positions are relative to container origin.
**How to avoid:** Always set child elements (health bars, icons) using relative offsets (e.g., y = -20 for "above sprite"), not world positions.
**Warning signs:** Health bars appear at wrong positions when entity moves, or snap to incorrect locations.

### Pitfall 2: Minimap Camera Viewport Issues
**What goes wrong:** Minimap doesn't resize properly when window resizes, or overlaps with other HUD elements.
**Why it happens:** Camera viewport coordinates are set once in create() but window can resize.
**How to avoid:** Listen to Phaser's 'resize' event and update minimap camera viewport position/size. Use setScrollFactor(0) for HUD elements to prevent them from scrolling with minimap camera.
**Warning signs:** Minimap position wrong after window resize, HUD elements scroll inside minimap.

### Pitfall 3: Entity State Desyncs
**What goes wrong:** Entity health bar shows wrong percentage because client state doesn't match server entity:update events.
**Why it happens:** Optimistic client updates conflict with server authority, or update events arrive out of order.
**How to avoid:** Treat server as source of truth - only update entity health from entity:update events, not client predictions. Use sequence numbers if implementing client-side combat.
**Warning signs:** Health bars show wrong values briefly then snap, or entities appear damaged when they shouldn't be.

### Pitfall 4: Performance with Many Entities
**What goes wrong:** Rendering 50+ entities with health bars causes FPS drops.
**Why it happens:** Creating Graphics objects per entity per frame is expensive. Redrawing health bars every frame even when unchanged.
**How to avoid:** Use viewport culling (already exists for tiles - extend to entities), only update health bars when health changes (not every frame), consider object pooling for frequently spawning/despawning entities.
**Warning signs:** FPS drops in crowded zones, profiler shows Graphics operations dominating frame time.

### Pitfall 5: React-Phaser State Sync Loops
**What goes wrong:** Infinite update loops where Phaser updates store, store triggers React re-render, React updates Phaser, repeat.
**Why it happens:** Bi-directional data flow without guards for "already synced" checks.
**How to avoid:** Follow existing patterns - Phaser only writes to store, React only reads from store (one-way flow). Server events are the only update source for game state.
**Warning signs:** High CPU usage even when idle, React DevTools shows constant re-renders, store updates thousands of times per second.

### Pitfall 6: Behavior Icon Mapping Errors
**What goes wrong:** Creature shows wrong behavior icon (e.g., Herbivore displays as Predator).
**Why it happens:** Entity interface uses CreatureBehavior type ('passive', 'neutral', 'aggressive', 'defensive') but requirements expect display labels ('Herbivore', 'Omnivore', 'Predator', 'Maniac').
**How to avoid:** Create explicit mapping between CreatureBehavior types and display categories based on lore. Refer to world-bible.md creature classifications for authoritative mapping.
**Warning signs:** Icons don't match lore descriptions, behavior categories inconsistent across entities.

## Code Examples

Verified patterns from official sources and existing codebase:

### Health Bar Above Sprite
```typescript
// Based on Phaser official health-bars-demo example
// Source: https://phaser.io/examples/v3.85.0/game-objects/graphics/view/health-bars-demo
createHealthBar(currentHealth: number, maxHealth: number): Phaser.GameObjects.Graphics {
  const bar = this.scene.add.graphics();

  const barWidth = 30;
  const barHeight = 4;
  const healthPercent = currentHealth / maxHealth;

  // Background (gray)
  bar.fillStyle(0x333333);
  bar.fillRect(-barWidth / 2, 0, barWidth, barHeight);

  // Health (green to red based on percentage)
  const healthColor = healthPercent > 0.5 ? 0x44cc44 : healthPercent > 0.25 ? 0xffcc00 : 0xff4444;
  bar.fillStyle(healthColor);
  bar.fillRect(-barWidth / 2, 0, barWidth * healthPercent, barHeight);

  return bar;
}
```

### Entity Container Management
```typescript
// Following existing WorldScene.spawnEntity pattern (line 316-326)
spawnEntity(entity: Entity): void {
  if (this.entitySprites.has(entity.id)) return;

  const container = this.add.container(
    entity.position.x * TILE_SIZE + TILE_SIZE / 2,
    entity.position.y * TILE_SIZE + TILE_SIZE / 2
  );

  // Add sprite
  const texture = this.getEntityTexture(entity.type);
  const sprite = this.add.sprite(0, 0, texture);
  container.add(sprite);

  // Add health bar if entity is damageable and damaged
  if ('health' in entity && entity.health < entity.maxHealth) {
    const healthBar = this.createHealthBar(entity.health, entity.maxHealth);
    healthBar.y = -20;
    container.add(healthBar);
  }

  this.entitySprites.set(entity.id, container);
}
```

### Minimap Camera Setup
```typescript
// Based on Phaser minimap-camera example
// Source: https://phaser.io/examples/v3/view/camera/minimap-camera
createMinimap(): void {
  const mapSize = 200;
  const mapPadding = 10;

  this.minimapCam = this.cameras.add(
    this.cameras.main.width - mapSize - mapPadding,
    this.cameras.main.height - mapSize - mapPadding,
    mapSize,
    mapSize
  );

  // Zoom out to show larger area (4x zoom out = 0.25)
  this.minimapCam.setZoom(0.25);

  // Dark background
  this.minimapCam.setBackgroundColor(0x002244);

  // Set bounds to zone size
  this.minimapCam.setBounds(0, 0, ZONE_SIZE * TILE_SIZE, ZONE_SIZE * TILE_SIZE);

  // Follow player (same as main camera)
  if (this.localPlayer) {
    this.minimapCam.startFollow(this.localPlayer, true);
  }

  // Minimap border (using Graphics)
  const border = this.add.graphics();
  border.lineStyle(2, 0xffffff, 1);
  border.strokeRect(
    this.cameras.main.width - mapSize - mapPadding,
    this.cameras.main.height - mapSize - mapPadding,
    mapSize,
    mapSize
  );
  border.setScrollFactor(0);
  border.setDepth(1000);
}
```

### React Energy Bar Component
```typescript
// Following existing HUD.tsx health bar pattern (lines 20-28)
interface EnergyBarProps {
  current: number;
  max: number;
  percent: number;
}

export const EnergyBar: React.FC<EnergyBarProps> = ({ current, max, percent }) => {
  return (
    <div className="energy-bar">
      <div
        className="energy-bar-fill"
        style={{ width: `${percent}%` }}
      />
      <span className="energy-text">
        {current} / {max}
      </span>
    </div>
  );
};
```

### Behavior Icon Display
```typescript
// Simple text-based icons (no assets needed)
createBehaviorIcon(behavior: CreatureBehavior): Phaser.GameObjects.Text {
  // Map behavior types to display categories per lore
  const iconMap: Record<CreatureBehavior, string> = {
    'passive': 'H',    // Herbivore
    'neutral': 'O',    // Omnivore
    'aggressive': 'P', // Predator
    'defensive': 'M',  // Maniac
  };

  const colorMap: Record<CreatureBehavior, number> = {
    'passive': 0x44cc44,  // Green
    'neutral': 0xffcc00,  // Yellow
    'aggressive': 0xff6b35, // Orange
    'defensive': 0xff4444,  // Red
  };

  const icon = this.scene.add.text(0, -30, iconMap[behavior], {
    fontSize: '12px',
    color: `#${colorMap[behavior].toString(16)}`,
    backgroundColor: '#000000',
    padding: { x: 4, y: 2 },
  });
  icon.setOrigin(0.5, 0.5);

  return icon;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DOM-based minimap | Phaser multi-camera system | Phaser 3.0+ | Better performance, renders world directly, automatic zoom/pan |
| Individual sprite management | Container-based entity composition | Phaser 3.0+ | Easier parent-child transforms, cleaner lifecycle management |
| Polling Phaser state from React | Zustand store with one-way flow | Modern React patterns | Prevents sync loops, clearer data flow, already proven in project |
| Custom health bar plugins | Native Graphics + Container | Phaser 3.50+ | No dependencies, better control, integrates with Containers |

**Deprecated/outdated:**
- **Phaser 2 health bar plugins:** Phaser 3 has different architecture - use Graphics instead
- **Separate HUD scene approach:** Project uses React for UI, Phaser for game world only
- **Canvas 2D minimap rendering:** Multi-camera approach reuses world rendering more efficiently

## Open Questions

1. **Behavior Icon Mapping**
   - What we know: Entity interface uses CreatureBehavior ('passive', 'neutral', 'aggressive', 'defensive'), lore defines display categories (Herbivore, Omnivore, Predator, Maniac)
   - What's unclear: Exact mapping between behavior types and display labels
   - Recommendation: Create explicit mapping in EntityRenderer - 'passive'→Herbivore, 'neutral'→Omnivore, 'aggressive'→Predator, 'defensive'→Maniac. Validate against lore/world-bible.md.

2. **Energy System Implementation**
   - What we know: HUD-02 requires energy bar display
   - What's unclear: Whether Player interface includes energy/maxEnergy fields yet, or if this needs adding
   - Recommendation: Check Player interface in shared-types, add energy fields if missing. Follow same pattern as health (current/max values).

3. **Entity Registry Scope**
   - What we know: ENT-05 requires "static entity registry defines all tile types, creatures, items with configs"
   - What's unclear: What "configs" means - just rendering (texture, color) or also behavior parameters (damage, health, loot tables)?
   - Recommendation: Phase 7 focuses on rendering - registry should define: entityId, displayName, textureKey, baseHealth, behavior type. Defer combat/loot configs to later phases.

4. **Minimap Biome Color Rendering**
   - What we know: HUD-04 requires "minimap shows biome colors"
   - What's unclear: Whether to tint tiles based on biome in minimap camera view, or use simplified color blocks
   - Recommendation: Phaser camera automatically renders existing tile textures at small scale - biome colors already visible via tile colors. No additional work needed unless want simplified overlay.

5. **Player Energy Bar**
   - What we know: Requirements specify energy bar (HUD-02)
   - What's unclear: Energy is not yet defined in Player interface (only health exists)
   - Recommendation: Add energy/maxEnergy fields to Player interface in shared-types, update database schema if needed. May require coordination with Phase 8 (combat/abilities) for energy consumption mechanics.

## Sources

### Primary (HIGH confidence)
- Phaser 3 Official Examples: health-bars-demo - https://phaser.io/examples/v3.85.0/game-objects/graphics/view/health-bars-demo
- Phaser 3 Official Examples: minimap-camera - https://phaser.io/examples/v3/view/camera/minimap-camera
- Phaser 3 Official React Template - https://github.com/phaserjs/template-react
- Project codebase: WorldScene.ts (entity sprite management patterns)
- Project codebase: HUD.tsx (React HUD pattern)
- Project codebase: gameStore.ts (Zustand state management pattern)
- Project lore: world-bible.md (creature behavior definitions)

### Secondary (MEDIUM confidence)
- Phaser Discourse: HUD scene patterns - https://phaser.discourse.group/t/hud-scene-multiple-scenes/6348
- Phaser Discourse: Minimap following player - https://phaser.discourse.group/t/minimap-following-player/2944
- Ourcade: Animated health bar tutorial - https://blog.ourcade.co/posts/2020/animated-health-bar-phaser-3/
- Rex's Phaser 3 Notes: Container documentation - https://rexrainbow.github.io/phaser3-rex-notes/docs/site/container/

### Tertiary (LOW confidence)
- Community plugins for health bars - flagged as potentially outdated for Phaser 3, prefer native Graphics approach

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already integrated and proven in Phases 4-6
- Architecture: MEDIUM-HIGH - Patterns exist in codebase, extending proven approaches
- Pitfalls: MEDIUM - Based on documented Phaser issues and project patterns, some phase-specific unknowns

**Research date:** 2026-02-15
**Valid until:** ~30 days (Phaser 3 stable, React patterns stable, project architecture established)

**Notes:**
- No CONTEXT.md exists - full research discretion
- Phase builds heavily on existing Phase 5-6 infrastructure (WorldScene, HUD, gameStore)
- Most complexity is extending existing patterns, not creating new ones
- Entity registry (ENT-05) may need design discussion for "configs" scope
- Energy system may require backend changes if Player schema missing energy fields
