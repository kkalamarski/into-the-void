# Phase 5: Phaser Integration & World Rendering - Research

**Researched:** 2026-02-14
**Domain:** Phaser 3 game rendering, React integration, procedural world visualization
**Confidence:** HIGH

## Summary

This phase integrates Phaser 3.90 with React to render the procedurally generated game world using color-coded tiles. The codebase already has foundational Phaser structure (Game.ts, WorldScene.ts, placeholder rendering) and a complete world-gen package with biome generation, terrain, and chunk systems. The primary challenges are: (1) React-Phaser lifecycle management to prevent memory leaks, (2) viewport culling for performant tile rendering, (3) chunk loading/unloading as players move between zones, and (4) smooth camera following with proper lerp values.

**Current state:** Phaser 3.90 installed, basic WorldScene with placeholder tile generation exists, PreloadScene generates colored textures procedurally. The world-gen package provides BiomeGenerator and WorldGenerator with 8 distinct biomes (void_plains, crystal_caves, toxic_wastes, ancient_ruins, frozen_expanse, volcanic_ridge, fungal_forest, starfall_crater) and survival tier system (I-IV).

**Primary recommendation:** Use Phaser's Container for tile layers with manual viewport culling (not Tilemap API, since tiles are procedurally colored and don't use external tilesets). Generate colored tile textures once at startup using Graphics.generateTexture() and reuse them across all tiles. Implement chunk loading/unloading based on player's zone position. Properly destroy Phaser game instance in React useEffect cleanup with careful async handling. Use camera.startFollow() with lerp values of 0.1-0.15 for smooth tracking without jarring. Display zone name and tier using Phaser.GameObjects.Text overlaid on game scene.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| phaser | ^3.90.0 | 2D game engine for HTML5 | Industry standard for browser-based 2D games, excellent performance, mature API, active community (already installed) |
| React | ^18.2.0 | UI framework | Already used for screens, provides component lifecycle for Phaser mounting/unmounting |
| zustand | ^4.5.0 | Client state management | Already in use, stores game state that React and Phaser both need to access |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @into-the-void/world-gen | (workspace) | Procedural generation | Already implemented, provides BiomeGenerator, WorldGenerator, chunk generation |
| @into-the-void/shared-types | (workspace) | Type definitions | ChunkData, BiomeType, ZoneState, Position types |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Phaser Container for tiles | Phaser Tilemap API | Tilemap requires external tileset files, doesn't support per-tile procedural coloring — Container gives full control over individual tile sprites |
| Graphics.generateTexture() | Canvas API or Image sprites | generateTexture() is Phaser's optimized path for runtime texture creation — Canvas would require manual WebGL upload |
| Manual culling | Phaser Tilemap layer culling | Tilemap culling is automatic but locked to tileset-based rendering — manual culling trades setup complexity for rendering flexibility |
| Container depth sorting | Layer object | Layer cannot be positioned/scaled/rotated, only for post-processing effects — Container is appropriate for positioned tile grid |

**Installation:**
All dependencies already installed. No additional packages required.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── game/
│   ├── Game.ts                    # Phaser game wrapper (EXISTING)
│   ├── scenes/
│   │   ├── BootScene.ts           # Initial setup (EXISTING)
│   │   ├── PreloadScene.ts        # Asset loading, texture generation (EXISTING)
│   │   └── WorldScene.ts          # Main game world (EXISTING - ENHANCE)
│   ├── rendering/
│   │   ├── TileRenderer.ts        # Tile rendering logic (NEW)
│   │   ├── ChunkManager.ts        # Chunk loading/unloading (NEW)
│   │   └── ViewportCuller.ts      # Manual viewport culling (NEW)
│   └── ui/
│       └── ZoneHUD.ts             # Zone name/tier display (NEW)
├── components/
│   └── GameContainer.tsx          # React wrapper for Phaser (EXISTING - ENHANCE)
```

### Pattern 1: React-Phaser Lifecycle with Proper Cleanup

**What:** Mount Phaser game instance in React useEffect, destroy properly in cleanup function to prevent memory leaks.

**When to use:** Always when integrating Phaser with React — improper cleanup causes memory leaks, duplicate game instances, and rendering artifacts.

**Why critical for this phase:** STATE.md explicitly flags "Phaser memory leaks on React unmount" as a blocker. game.destroy() is asynchronous, making cleanup tricky.

**Example:**
```typescript
// Source: Existing apps/web/src/components/GameContainer.tsx pattern (to enhance)
// Based on: https://phaser.discourse.group/t/how-to-manage-phaser-game-instance-in-react/12467

import { useEffect, useRef } from 'react';
import { Game } from '../game/Game';

export function GameContainer() {
  const gameRef = useRef<Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create game instance
    const game = new Game(containerRef.current);
    gameRef.current = game;

    // Cleanup function - critical for preventing memory leaks
    return () => {
      if (gameRef.current) {
        // game.destroy() is asynchronous - it waits for current frame to complete
        // Listen for DESTROY event to know when cleanup is truly done
        const gameInstance = gameRef.current;

        gameInstance.destroy(true); // removeCanvas = true
        gameRef.current = null;
      }
    };
  }, []); // Empty deps - only mount/unmount once

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
```

**Critical details:**
- `game.destroy(true)` removes canvas from DOM
- Destroy is asynchronous — waits for current frame to complete before calling internal runDestroy
- Setting `gameRef.current = null` prevents double-cleanup on strict mode
- Empty dependency array ensures game only mounts once per component lifecycle

### Pattern 2: Procedural Colored Tile Textures (Generate Once, Reuse)

**What:** Use Graphics.generateTexture() to create colored tile textures at startup, then reuse these textures for all tile sprites.

**When to use:** When tiles are simple colored rectangles/shapes with borders — generating textures for every tile would cause memory issues.

**How it works:**
1. PreloadScene generates one texture per tile type (floor, wall, water, acid, lava, etc.)
2. Each texture stored in Phaser texture manager with unique key
3. WorldScene creates sprites referencing these pre-generated textures
4. Biome-specific coloring uses tint on sprites, not new textures

**Example:**
```typescript
// Source: Existing apps/web/src/game/scenes/PreloadScene.ts (already implements this pattern)
// Enhancement: Add biome-specific tile types

private generateTileTextures(): void {
  const graphics = this.make.graphics({ x: 0, y: 0 });
  const TILE_SIZE = 32;

  // Base terrain types
  const tileTypes = [
    { key: 'tile_floor', color: 0x3a3a4a, border: 0x2a2a3a },
    { key: 'tile_wall', color: 0x1a1a2a, border: 0x0a0a1a },
    { key: 'tile_water', color: 0x2a4a7a, border: 0x1a3a6a },
    { key: 'tile_acid', color: 0x9acd32, border: 0x7aad12 },
    { key: 'tile_lava', color: 0xff4500, border: 0xdf2500 },
    { key: 'tile_ice', color: 0xb0e0e6, border: 0x90c0c6 },
    { key: 'tile_crystal', color: 0x7b68ee, border: 0x5b48ce },
    { key: 'tile_toxic', color: 0x556b2f, border: 0x354b0f },
  ];

  tileTypes.forEach(({ key, color, border }) => {
    graphics.clear();
    graphics.fillStyle(color);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.lineStyle(1, border);
    graphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.generateTexture(key, TILE_SIZE, TILE_SIZE);
  });

  graphics.destroy();
}
```

**Why not generateTexture() per tile:** If Graphics object updates frequently, avoid generateTexture() as it constantly generates new textures and consumes memory. Generate once at startup, reuse for all tiles.

### Pattern 3: Manual Viewport Culling for Tile Rendering

**What:** Only render tiles visible within camera viewport plus padding, manually calculate culling rectangle each frame.

**When to use:** When rendering large procedural worlds where most tiles are offscreen — critical for performance at 64x64 zone size.

**Why manual vs Tilemap culling:** Phaser's Tilemap layer has automatic culling via `cullTiles()`, but requires tileset-based rendering. Manual culling for Container-based tiles requires custom implementation but gives full control.

**Example:**
```typescript
// Source: Pattern adapted from Tilemap culling (https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer)
// New file: apps/web/src/game/rendering/ViewportCuller.ts

export class ViewportCuller {
  private tileSize: number;
  private cullPaddingX: number = 2; // Extra tiles to render beyond viewport
  private cullPaddingY: number = 2;

  constructor(tileSize: number) {
    this.tileSize = tileSize;
  }

  /**
   * Calculate which tiles are visible in camera viewport
   */
  getCullBounds(camera: Phaser.Cameras.Scene2D.Camera): {
    minTileX: number;
    maxTileX: number;
    minTileY: number;
    maxTileY: number;
  } {
    // Get camera world view (where camera is looking)
    const camLeft = camera.worldView.x;
    const camRight = camLeft + camera.worldView.width;
    const camTop = camera.worldView.y;
    const camBottom = camTop + camera.worldView.height;

    // Convert world coordinates to tile coordinates with padding
    const minTileX = Math.max(0, Math.floor(camLeft / this.tileSize) - this.cullPaddingX);
    const maxTileX = Math.ceil(camRight / this.tileSize) + this.cullPaddingX;
    const minTileY = Math.max(0, Math.floor(camTop / this.tileSize) - this.cullPaddingY);
    const maxTileY = Math.ceil(camBottom / this.tileSize) + this.cullPaddingY;

    return { minTileX, maxTileX, minTileY, maxTileY };
  }

  /**
   * Set culling padding (useful for camera rotation/zoom)
   */
  setCullPadding(x: number, y: number): void {
    this.cullPaddingX = x;
    this.cullPaddingY = y;
  }
}

// Usage in WorldScene.ts:
private renderVisibleTiles(): void {
  const bounds = this.culler.getCullBounds(this.cameras.main);

  // Show/hide tiles based on visibility
  for (let y = 0; y < ZONE_SIZE; y++) {
    for (let x = 0; x < ZONE_SIZE; x++) {
      const tile = this.tiles[y][x];
      const isVisible = (
        x >= bounds.minTileX && x <= bounds.maxTileX &&
        y >= bounds.minTileY && y <= bounds.maxTileY
      );
      tile.setVisible(isVisible);
    }
  }
}
```

**Performance impact:** For 64x64 zone (4096 tiles), viewport at zoom 1.0 shows ~40x30 tiles (1200 visible). Culling reduces render calls by 70%. On larger maps (1024x1024), culling prevents framerate drops from render overhead.

**Padding recommendation:** Use 2-4 tile padding. Higher padding for camera rotation (prevents clipping at edges), lower for static camera. Zero padding causes visible tile pop-in.

### Pattern 4: Chunk Loading and Unloading Based on Player Position

**What:** Load adjacent chunks when player approaches zone boundaries, unload distant chunks to free memory.

**When to use:** For infinite/large procedural worlds where loading all chunks upfront is not feasible.

**How it works:**
1. Track player's current zone (zoneId)
2. Load current zone + 8 adjacent zones (3x3 grid around player)
3. When player moves to new zone, load new adjacent zones, unload zones > 1 zone away
4. Use ChunkData from world-gen package, server sends via zone:state event

**Example:**
```typescript
// New file: apps/web/src/game/rendering/ChunkManager.ts
// Pattern based on: https://www.dynetisgames.com/2018/02/24/manage-big-maps-phaser-3/

import { ChunkData } from '@into-the-void/shared-types';
import { parseZoneId } from '@into-the-void/game-logic';

export class ChunkManager {
  private loadedChunks: Map<string, ChunkData> = new Map();
  private scene: Phaser.Scene;
  private onChunkNeeded: (zoneId: string) => void;

  constructor(scene: Phaser.Scene, onChunkNeeded: (zoneId: string) => void) {
    this.scene = scene;
    this.onChunkNeeded = onChunkNeeded;
  }

  /**
   * Update loaded chunks based on player zone position
   */
  updateChunks(playerZoneId: string): void {
    const { x: playerX, y: playerY } = parseZoneId(playerZoneId);

    // Determine which chunks should be loaded (3x3 grid around player)
    const requiredChunks = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const zoneId = `z_${playerX + dx}_${playerY + dy}`;
        requiredChunks.add(zoneId);
      }
    }

    // Load new chunks
    requiredChunks.forEach(zoneId => {
      if (!this.loadedChunks.has(zoneId)) {
        this.onChunkNeeded(zoneId); // Request chunk from server
      }
    });

    // Unload distant chunks
    this.loadedChunks.forEach((chunk, zoneId) => {
      if (!requiredChunks.has(zoneId)) {
        this.unloadChunk(zoneId);
      }
    });
  }

  /**
   * Add chunk data (called when server sends chunk)
   */
  loadChunk(chunkData: ChunkData): void {
    this.loadedChunks.set(chunkData.zoneId, chunkData);
    // Render tiles for this chunk would happen here
  }

  /**
   * Remove chunk from memory
   */
  private unloadChunk(zoneId: string): void {
    // Destroy all tile sprites for this chunk
    // Remove from loadedChunks map
    this.loadedChunks.delete(zoneId);
  }

  /**
   * Get chunk data if loaded
   */
  getChunk(zoneId: string): ChunkData | undefined {
    return this.loadedChunks.get(zoneId);
  }
}
```

**Memory consideration:** Each chunk (64x64 tiles) = ~4096 sprites. With 9 loaded chunks = ~36k sprites. Viewport culling ensures only ~1200 render per frame. Unloading prevents memory growth as player explores.

### Pattern 5: Smooth Camera Following with Lerp

**What:** Use camera.startFollow() with low lerp values (0.1-0.15) for smooth camera tracking without jarring jumps.

**When to use:** Always for player-following cameras in top-down games — instant snap (lerp = 1) feels robotic, smooth follow feels natural.

**Example:**
```typescript
// Source: Existing apps/web/src/game/scenes/WorldScene.ts (already has basic follow)
// Enhancement: Proper lerp values and roundPixels
// Based on: https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Cameras.Scene2D.Camera-setLerp

create(): void {
  // ... create local player sprite ...

  if (this.localPlayer) {
    // Smooth camera follow with lerp
    this.cameras.main.startFollow(
      this.localPlayer,
      true,        // roundPixels - prevents sub-pixel jitter
      0.1,         // lerpX - horizontal smoothing (lower = smoother)
      0.1          // lerpY - vertical smoothing
    );

    // Set zoom (must be integer for roundPixels to work properly)
    this.cameras.main.setZoom(1);

    // Optional: Set deadzone for less camera movement on small player shifts
    // this.cameras.main.setDeadzone(50, 50);
  }
}
```

**Lerp value selection:**
- `1.0` = instant snap (no smoothing, feels jarring)
- `0.1` = smooth follow (recommended for top-down exploration)
- `0.05` = very smooth (can feel floaty for fast movement)
- `0.15-0.2` = responsive but still smooth (good for action games)

**roundPixels critical:** Set to `true` to prevent sub-pixel rendering artifacts (tile edges appear blurry/jittery). Only works correctly when camera zoom is integer (1, 2, 3, not 1.5).

**Deadzone option:** Prevents camera from moving on tiny player shifts. Creates "safe zone" in center where player can move without camera following. Good for reducing camera motion sickness.

### Pattern 6: Zone Name and Tier Display with Phaser Text

**What:** Display zone name, biome name, and tier indicator using Phaser.GameObjects.Text overlaid on game scene.

**When to use:** For HUD elements that need to scroll with world (tier display should stay fixed on screen, not move with camera).

**Example:**
```typescript
// New file: apps/web/src/game/ui/ZoneHUD.ts
// Pattern based on: https://phaser.discourse.group/t/hud-scene-multiple-scenes/6348

export class ZoneHUD {
  private scene: Phaser.Scene;
  private zoneNameText: Phaser.GameObjects.Text;
  private tierText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Zone name (top-left corner)
    this.zoneNameText = scene.add.text(16, 16, '', {
      fontSize: '20px',
      color: '#e0e0e0',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.zoneNameText.setScrollFactor(0); // Fixed to camera (doesn't scroll with world)
    this.zoneNameText.setDepth(1000); // Above all game objects

    // Tier indicator (next to zone name)
    this.tierText = scene.add.text(16, 44, '', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.tierText.setScrollFactor(0);
    this.tierText.setDepth(1000);
  }

  /**
   * Update zone display
   */
  updateZone(zoneName: string, biome: string, tier: number): void {
    this.zoneNameText.setText(`Zone: ${zoneName} (${biome})`);

    const tierColor = this.getTierColor(tier);
    const tierLabel = this.getTierLabel(tier);

    this.tierText.setText(`Tier ${tier}: ${tierLabel}`);
    this.tierText.setColor(tierColor);
  }

  private getTierColor(tier: number): string {
    // Based on lore: Tier I=green, IV=red
    switch (tier) {
      case 1: return '#44cc44'; // Green (Frontier)
      case 2: return '#ffcc00'; // Yellow (Hazardous)
      case 3: return '#ff6b35'; // Orange (Hostile)
      case 4: return '#ff4444'; // Red (Extreme)
      default: return '#ffffff';
    }
  }

  private getTierLabel(tier: number): string {
    switch (tier) {
      case 1: return 'Frontier';
      case 2: return 'Hazardous';
      case 3: return 'Hostile';
      case 4: return 'Extreme';
      default: return 'Unknown';
    }
  }

  destroy(): void {
    this.zoneNameText.destroy();
    this.tierText.destroy();
  }
}
```

**setScrollFactor(0) critical:** Without this, text scrolls with camera and appears to move with world. Value of 0 fixes it to camera viewport (HUD behavior).

**Alternative approach:** Use separate HUD Scene running in parallel with WorldScene. Pros: cleaner separation, easier UI management. Cons: more complexity for simple text display. For this phase, single-scene approach is simpler.

### Anti-Patterns to Avoid

- **Creating Tilemap layers for procedural colored tiles:** Tilemap API requires external tileset images, doesn't support per-tile runtime coloring — use Container with sprites
- **Generating textures on every tile color change:** Causes memory leaks, use tint on sprites instead of new textures
- **No viewport culling:** Rendering 4096+ tiles every frame tanks performance, always implement culling
- **Destroying Phaser game synchronously in React cleanup:** game.destroy() is async, component unmount happens before cleanup completes — causes errors
- **Using lerp = 1 for camera follow:** Results in jarring instant snap, feels robotic — use 0.1-0.15 for smooth follow
- **Loading all chunks upfront:** Memory grows unbounded as world expands, implement load/unload based on proximity
- **Nested Containers for tiles:** Deep Container nesting escalates cost, especially for input events — use flat Container structure

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tile culling algorithm | Custom visibility checking | Phaser camera.worldView with manual bounds calculation | Camera already provides world bounds, just convert to tile coordinates |
| Texture generation from colors | Canvas API or manual WebGL | Graphics.generateTexture() | Phaser's optimized path for runtime textures, handles WebGL upload automatically |
| Camera smoothing | Manual lerp in update loop | camera.startFollow() with lerp parameter | Built-in, handles edge cases (zoom changes, bounds), properly time-independent |
| Procedural biome generation | Custom noise implementation | @into-the-void/world-gen BiomeGenerator | Already implemented with SimplexNoise, tested, deterministic with seeds |
| Zone coordinate parsing | String manipulation | @into-the-void/game-logic parseZoneId, createZoneId | Existing utilities, validated format, used across codebase |
| Tile depth sorting | Manual z-index tracking | Phaser setDepth() on sprites | Automatic depth sorting by display list, handles thousands of objects efficiently |

**Key insight:** Phaser provides most rendering primitives needed (sprites, containers, cameras, culling math). The complexity in this phase is in managing React lifecycle, implementing chunk streaming logic, and connecting server ChunkData to visual rendering — not in low-level rendering algorithms.

## Common Pitfalls

### Pitfall 1: Memory Leak from Improper Phaser Cleanup in React

**What goes wrong:** Component unmounts, Phaser game still runs in background consuming CPU/memory. On remount, duplicate game instance created. Browser slows down, eventually crashes.

**Why it happens:** game.destroy() is asynchronous (waits for current frame to complete). React's useEffect cleanup runs immediately. If destroy() doesn't complete before component unmounts, references remain.

**How to avoid:**
- Always call `game.destroy(true)` in useEffect cleanup (true = remove canvas)
- Set game reference to null after destroy to prevent double-cleanup
- Use empty dependency array `[]` so effect only runs once per component mount/unmount
- Don't create new Phaser game on prop changes — single game instance per component lifecycle

**Warning signs:** Browser DevTools shows increasing memory usage after navigating away from game. Multiple canvas elements in DOM. Console errors about "Cannot read property of null" in Phaser internals.

**Example fix:** See Pattern 1 (React-Phaser Lifecycle).

### Pitfall 2: Viewport Culling Doesn't Update on Camera Movement

**What goes wrong:** Camera pans/zooms, culling bounds don't recalculate, tiles pop in/out at wrong times or don't render at edges.

**Why it happens:** Culling calculation runs once in create(), not in update(). Camera worldView changes every frame when following player.

**How to avoid:**
- Recalculate cull bounds every frame in update() or preRender()
- Cache previous bounds, only update tile visibility when bounds change (optimization)
- Increase cull padding when camera zooms out (more tiles visible) or rotates (corners need padding)

**Warning signs:** Black areas at screen edges when camera moves. Tiles suddenly appear/disappear while panning.

**Example fix:**
```typescript
update(): void {
  // Recalculate which tiles are visible
  this.updateVisibleTiles();
}

private updateVisibleTiles(): void {
  const bounds = this.culler.getCullBounds(this.cameras.main);

  for (let y = 0; y < ZONE_SIZE; y++) {
    for (let x = 0; x < ZONE_SIZE; x++) {
      const tile = this.tiles[y][x];
      const isVisible = (
        x >= bounds.minTileX && x <= bounds.maxTileX &&
        y >= bounds.minTileY && y <= bounds.maxTileY
      );

      // Only update if visibility changed (optimization)
      if (tile.visible !== isVisible) {
        tile.setVisible(isVisible);
      }
    }
  }
}
```

### Pitfall 3: Sub-Pixel Rendering Causes Tile Jitter

**What goes wrong:** Tiles appear to jitter/shake when camera follows player. Tile borders look blurry or antialiased.

**Why it happens:** Camera position updates to non-integer pixel values (e.g., x=100.5), causing sub-pixel rendering. Browser antialiases fractional pixel positions.

**How to avoid:**
- Set `roundPixels: true` in camera.startFollow()
- Use `pixelArt: true` in Phaser game config (already set in Game.ts)
- Ensure camera zoom is integer (1, 2, 3, not 1.5) — roundPixels doesn't work correctly with non-integer zoom
- Tile positions should be multiples of tile size (32, 64, 96, not 33.5)

**Warning signs:** Tiles appear to vibrate slightly when player moves. Tile edges look fuzzy. Sprites positioned at fractional coordinates.

**Example config (already in Game.ts):**
```typescript
const config: Phaser.Types.Core.GameConfig = {
  pixelArt: true,  // Prevents texture smoothing, forces crisp rendering
  // ...
};
```

### Pitfall 4: Generating Textures Every Frame for Tile Color Changes

**What goes wrong:** Memory usage grows rapidly, garbage collection pauses cause frame drops, browser tab eventually crashes.

**Why it happens:** Calling graphics.generateTexture() on every update creates new texture in WebGL memory. Old textures not freed until GC runs.

**How to avoid:**
- Generate textures once in PreloadScene, store in texture manager
- Use sprite.setTint() to change colors dynamically — tinting is a shader operation, no new texture
- For complex color changes, create all color variants upfront (e.g., damaged/healthy versions)
- If absolutely must generate runtime, cache textures by key and reuse

**Warning signs:** Memory profiler shows TextureManager size growing. Frame rate drops over time. Console warnings about texture memory.

**Example avoidance:**
```typescript
// DON'T DO THIS:
update(): void {
  const graphics = this.make.graphics();
  graphics.fillStyle(this.currentColor);
  graphics.fillRect(0, 0, 32, 32);
  graphics.generateTexture('tile', 32, 32); // NEW TEXTURE EVERY FRAME!
  graphics.destroy();
}

// DO THIS INSTEAD:
create(): void {
  // Generate once
  this.generateTileTextures();
}

update(): void {
  // Change color with tint (no new texture)
  this.tile.setTint(this.currentColor);
}
```

### Pitfall 5: Chunk Loading Doesn't Wait for Server Response

**What goes wrong:** Player moves to new zone, tiles don't render. Console shows errors about missing ChunkData.

**Why it happens:** ChunkManager requests chunk from server (async), immediately tries to render before data arrives.

**How to avoid:**
- Track chunk loading state (requested, loading, loaded)
- Show loading indicator for chunks that are requested but not yet received
- Don't mark chunk as available until ChunkData received from server
- Handle case where server never responds (timeout, retry, fallback to placeholder)

**Warning signs:** Black areas where chunks should be. Console errors "Cannot read property 'tiles' of undefined". Player can walk into unloaded chunks.

**Example state tracking:**
```typescript
private chunkState: Map<string, 'loading' | 'loaded'> = new Map();

requestChunk(zoneId: string): void {
  if (this.chunkState.has(zoneId)) return; // Already loading/loaded

  this.chunkState.set(zoneId, 'loading');
  this.onChunkNeeded(zoneId); // Request from server

  // Optional: Timeout fallback
  setTimeout(() => {
    if (this.chunkState.get(zoneId) === 'loading') {
      console.warn(`Chunk ${zoneId} load timeout`);
      this.chunkState.delete(zoneId); // Allow retry
    }
  }, 5000);
}

onChunkReceived(chunkData: ChunkData): void {
  this.chunkState.set(chunkData.zoneId, 'loaded');
  this.loadedChunks.set(chunkData.zoneId, chunkData);
  this.renderChunk(chunkData);
}
```

### Pitfall 6: Zone Name Display Scrolls with World Instead of Fixed to Camera

**What goes wrong:** Zone name text moves when camera pans, player loses sight of it, feels like broken UI.

**Why it happens:** Text object added to scene without setScrollFactor(0), so it scrolls with world like tiles.

**How to avoid:**
- Always set `text.setScrollFactor(0)` for HUD elements
- Set high depth (e.g., 1000) to ensure HUD renders above world objects
- Position using camera.width/height for responsive layout

**Warning signs:** Text moves when player moves. Text disappears off-screen. Text appears behind tiles.

**Example fix:**
```typescript
const zoneText = this.add.text(16, 16, 'Zone Name', { fontSize: '20px' });
zoneText.setScrollFactor(0); // Fix to camera
zoneText.setDepth(1000);     // Above world
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Biome Color Mapping

```typescript
// Source: packages/world-gen/src/generation/biome.ts (EXISTING)
// Use these colors for tile tinting based on biome

export function getBiomeColor(biome: BiomeType): number {
  const colors: Record<BiomeType, number> = {
    void_plains: 0x4a4a5a,      // Gray-purple
    crystal_caves: 0x7b68ee,    // Purple
    toxic_wastes: 0x9acd32,     // Yellow-green
    ancient_ruins: 0x8b7355,    // Brown
    frozen_expanse: 0xb0e0e6,   // Light blue
    volcanic_ridge: 0xff4500,   // Orange-red
    fungal_forest: 0x9370db,    // Medium purple
    starfall_crater: 0x191970,  // Midnight blue
  };
  return colors[biome];
}

// Usage: Apply as tint to tile sprites
const biomeColor = getBiomeColor(chunk.biome);
tileSprite.setTint(biomeColor);
```

### Tier Color System from Lore

```typescript
// Source: lore/world-bible.md (Tier I=green, IV=red)
// Tier colors for zone name display

function getTierColor(tier: number): string {
  switch (tier) {
    case 1: return '#44cc44'; // Green - Frontier
    case 2: return '#ffcc00'; // Yellow - Hazardous
    case 3: return '#ff6b35'; // Orange - Hostile
    case 4: return '#ff4444'; // Red - Extreme
    default: return '#ffffff';
  }
}

// Tier is determined by biome danger level
import { getBiomeDangerLevel } from '@into-the-void/world-gen';

const dangerLevel = getBiomeDangerLevel(biome); // Returns 1-10
const tier = Math.ceil(dangerLevel / 2.5); // Map 1-10 to 1-4
```

### Rendering ChunkData from Server

```typescript
// Source: Integrating existing ChunkData structure with WorldScene
// Enhancement for apps/web/src/game/scenes/WorldScene.ts

import { ChunkData, ZONE_SIZE } from '@into-the-void/shared-types';
import { getBiomeColor } from '@into-the-void/world-gen';

loadChunk(chunkData: ChunkData): void {
  const { tiles, collisions, zoneId } = chunkData;
  const TILE_SIZE = 32;

  // Determine biome for this chunk (from server or derive from zoneId)
  const biome = this.getBiomeFromZoneId(zoneId);
  const biomeColor = getBiomeColor(biome);

  // Create tile container for this chunk
  const chunkContainer = this.add.container(0, 0);

  for (let y = 0; y < ZONE_SIZE; y++) {
    for (let x = 0; x < ZONE_SIZE; x++) {
      const tileId = tiles[y][x];
      const isBlocking = collisions[y][x];

      // Select texture based on tile type
      const texture = isBlocking ? 'tile_wall' : 'tile_floor';

      // Create sprite
      const tile = this.add.sprite(x * TILE_SIZE, y * TILE_SIZE, texture);
      tile.setOrigin(0, 0);

      // Apply biome color tint
      tile.setTint(biomeColor);

      // Add to container
      chunkContainer.add(tile);
    }
  }

  // Store container for later cleanup
  this.chunkContainers.set(zoneId, chunkContainer);
}
```

### Complete WorldScene Enhancement Outline

```typescript
// apps/web/src/game/scenes/WorldScene.ts
// Outline of enhancements needed for Phase 5

export class WorldScene extends Phaser.Scene {
  private chunkManager: ChunkManager;
  private viewportCuller: ViewportCuller;
  private zoneHUD: ZoneHUD;
  private chunkContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private currentZoneId: string = '';

  create(): void {
    // Initialize managers
    this.chunkManager = new ChunkManager(this, (zoneId) => {
      // Request chunk from server via socket
      this.requestChunkFromServer(zoneId);
    });

    this.viewportCuller = new ViewportCuller(32); // TILE_SIZE = 32
    this.zoneHUD = new ZoneHUD(this);

    // Setup camera follow (will be called when player spawns)
    // Handled by GameScreen after receiving zone:state event
  }

  update(): void {
    // Update visible tiles based on camera position
    this.updateVisibleTiles();
  }

  /**
   * Called from GameScreen when zone:state event received
   */
  onZoneStateReceived(zoneState: ZoneState, chunkData: ChunkData): void {
    // Load chunk
    this.loadChunk(chunkData);

    // Update HUD
    const biome = this.getBiomeFromZoneId(zoneState.zoneId);
    const tier = this.getTierFromBiome(biome);
    this.zoneHUD.updateZone(zoneState.zoneId, biome, tier);

    // Update chunk manager
    this.currentZoneId = zoneState.zoneId;
    this.chunkManager.updateChunks(zoneState.zoneId);
  }

  /**
   * Called when player moves to new zone
   */
  onPlayerZoneChanged(newZoneId: string): void {
    this.currentZoneId = newZoneId;
    this.chunkManager.updateChunks(newZoneId);

    // Update HUD for new zone
    const biome = this.getBiomeFromZoneId(newZoneId);
    const tier = this.getTierFromBiome(biome);
    this.zoneHUD.updateZone(newZoneId, biome, tier);
  }

  private requestChunkFromServer(zoneId: string): void {
    // Emit socket event to request chunk
    // Server responds with chunk data
  }

  shutdown(): void {
    // Cleanup
    this.zoneHUD.destroy();
    this.chunkContainers.forEach(container => container.destroy(true));
    this.chunkContainers.clear();
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phaser 2 Tilemap with CSV | Phaser 3 Tilemap with JSON | Phaser 3.0 (2018) | Better tooling integration, more flexible layer types |
| Manual sprite batching | Phaser 3 automatic batching | Phaser 3.50 (2020) | Transparent WebGL batching, no manual optimization needed |
| Static + Dynamic Tilemap layers | Unified TilemapLayer | Phaser 3.50 (2021) | Single API for both static and dynamic tiles, simpler |
| Container for simple grouping | Layer for post-processing | Phaser 3.50 (2020) | Layer enables post-FX on groups, Container for positioning |
| Manual lerp in update loop | Built-in camera lerp | Phaser 3.0 (2018) | Time-independent smoothing, handles edge cases automatically |
| Canvas renderer default | WebGL renderer default | Phaser 3.0 (2018) | Massive performance gain, automatic fallback to Canvas |

**Deprecated/outdated:**
- **Phaser 2 Tilemap CSV format:** Use JSON from Tiled or procedural generation, CSV lacks layer metadata
- **StaticTilemapLayer and DynamicTilemapLayer classes:** Deprecated in Phaser 3.50+, use unified TilemapLayer
- **Manual texture atlas generation:** Use TexturePacker or Phaser's built-in multi-atlas loader
- **Creating separate Scene for simple HUD:** Overhead for basic text display, use scrollFactor=0 on game scene objects

## Open Questions

1. **Should chunk loading be optimistic (load before player reaches boundary) or lazy (load when boundary crossed)?**
   - What we know: ChunkManager loads 3x3 grid (current + 8 adjacent), players move at ~2 tiles/sec
   - What's unclear: Network latency for chunk requests, server chunk generation time
   - Recommendation: Optimistic loading when player within 5 tiles of boundary. Prevents visible loading if latency <500ms. Add loading indicator for slow chunks.

2. **How much cull padding for camera rotation/zoom?**
   - What we know: Camera zoom is 0.5-2x (from existing WorldScene), no rotation currently
   - What's unclear: Will camera rotation be added in future phases?
   - Recommendation: Start with 2 tile padding (sufficient for zoom changes). Increase to 4-6 if rotation added. Profile to find minimum padding that prevents pop-in.

3. **Should tile sprites use texture keys or texture references?**
   - What we know: Texture keys (strings) are flexible, texture references (objects) are slightly faster
   - What's unclear: Performance difference at 36k sprites (9 chunks)
   - Recommendation: Use texture keys for simplicity. Profile if performance issues arise. Phaser's texture cache is well-optimized for key lookups.

4. **How to handle chunk requests that never return (server error, network drop)?**
   - What we know: ChunkManager requests chunks via socket, awaits response
   - What's unclear: Failure modes — timeout duration, retry strategy, fallback
   - Recommendation: 5-second timeout, mark chunk as "failed", show error indicator in that chunk area, retry on player re-approach. Don't block other chunks.

5. **Should zone name display show coordinates (z_1_2) or friendly name?**
   - What we know: Lore uses biome names (Luminous Canopy, etc.), coordinates are technical
   - What's unclear: Player preference — coordinates for navigation or biome names for immersion?
   - Recommendation: Show both: "Luminous Canopy (z_1_2)" gives navigation + immersion. Let players toggle in settings (future).

6. **How to handle multi-zone rendering when player is at zone boundary?**
   - What we know: ChunkManager loads adjacent chunks, but WorldScene currently renders one zone at a time
   - What's unclear: Should tiles from multiple zones render simultaneously (seamless world) or show zone boundaries?
   - Recommendation: Seamless rendering — render all loaded chunks as single continuous world. No visible boundaries. Aligns with "chunk loading as player approaches" requirement.

## Sources

### Primary (HIGH confidence)
- Phaser 3.90.0 installed in package.json, version confirmed in node_modules
- Existing codebase: apps/web/src/game/Game.ts, apps/web/src/game/scenes/WorldScene.ts, apps/web/src/game/scenes/PreloadScene.ts
- @into-the-void/world-gen package: BiomeGenerator, WorldGenerator, chunk.ts, biome.ts
- @into-the-void/shared-types: ChunkData, BiomeType, Zone, ZoneState interfaces
- lore/world-bible.md: Survival Tiers table, tier color specification (Tier I=green, IV=red)
- [Phaser 3 API - TilemapLayer Culling](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer) — Viewport culling behavior and methods
- [Phaser 3 API - Camera.startFollow](https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Cameras.Scene2D.Camera-startFollow) — Lerp parameters and roundPixels

### Secondary (MEDIUM confidence)
- [Phaser 3 Tilemap Performance Discussion](https://phaser.discourse.group/t/tilemap-performance/10190) — Community discussion on culling at scale
- [Managing Big Maps in Phaser 3](https://www.dynetisgames.com/2018/02/24/manage-big-maps-phaser-3/) — Chunk-based world implementation
- [Phaser Game with React UI](https://3ee.com/blog/phaser-game-react-ui/) — React-Phaser integration patterns
- [How to Manage Phaser.Game Instance in React](https://phaser.discourse.group/t/how-to-manage-phaser-game-instance-in-react/12467) — useEffect cleanup best practices
- [Game.destroy() in React Issue](https://github.com/phaserjs/phaser/issues/4305) — Async destroy behavior with React unmount
- [Group vs Layer vs Container Discussion](https://phaser.discourse.group/t/group-vs-layer-vs-container/11036) — When to use each game object type
- [Phaser 3 Camera Lerp Documentation](https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Cameras.Scene2D.Camera-lerp) — Smooth follow implementation

### Tertiary (LOW confidence — general patterns, verify before applying)
- [Graphics.generateTexture Memory Warning](https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Graphics.html) — Warning about frequent texture generation (Phaser 3 docs, version unclear)
- [HUD Scene Pattern Discussion](https://phaser.discourse.group/t/hud-scene-multiple-scenes/6348) — Multiple scene approach for UI

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Versions confirmed in package.json, Phaser 3.90 installed, existing codebase verified
- Architecture patterns: HIGH — React-Phaser lifecycle based on official Phaser GitHub issue, culling math from Phaser API docs, existing WorldScene structure analyzed
- Chunk loading: MEDIUM — Pattern based on third-party tutorial and existing ChunkData structure, not officially documented by Phaser
- Pitfalls: MEDIUM-HIGH — Memory leak from game.destroy() documented in Phaser GitHub issues, viewport culling pitfalls common in community discussions, tier coloring from lore source of truth
- Biome rendering: HIGH — Biome colors and tier system from existing world-gen package and lore/world-bible.md, not hypothetical

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days — Phaser 3.x is stable with infrequent breaking changes, React 18 stable, world-gen package internal)
