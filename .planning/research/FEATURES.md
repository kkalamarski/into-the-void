# Feature Research

**Domain:** Post-login 2D multiplayer game experience (HUD, world rendering, movement, entity display)
**Researched:** 2026-02-14
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Player health/energy display | Core survival mechanic feedback | LOW | Simple numeric display, updates on server events. Standard HUD element. |
| Current zone/biome indicator | Spatial awareness in procedural world | LOW | Text display updated on zone transitions. Critical for survival tier awareness. |
| Player position on world | Basic navigation | MEDIUM | Minimap or coordinate display. MMORPG standard (right side, top placement per genre conventions). |
| WASD/arrow key movement | PC game standard | MEDIUM | Requires client-side prediction + server reconciliation to avoid input lag. Phaser input handling standard. |
| Click-to-move fallback | Accessibility + genre expectation (isometric games) | MEDIUM | A* pathfinding required. Computational cost depends on grid complexity. |
| Visual feedback for movement input | Player expects immediate response | LOW | Client-side prediction shows movement before server confirmation. Prevents "laggy" feel. |
| Other player entities visible | Multiplayer awareness | MEDIUM | Entity interpolation between server updates for smooth movement. Requires viewport culling for performance. |
| Entity health indicators | Combat feedback | LOW | Visual bars above entities. Standard MMO pattern. Color-coded (green=ally, red=enemy, yellow=neutral). |
| Tile-based world rendering | Visual representation of zones | MEDIUM | Phaser TilemapLayer with dynamic tinting for color-coded biomes. No sprite requirement = simple geometry rendering. |
| Viewport culling (render only visible) | Performance requirement | MEDIUM | Essential for MMO scale. Only render tiles/entities within camera bounds. Standard Phaser frustum culling. |
| Network state synchronization | Multiplayer core | HIGH | Socket.IO event listeners for player positions, entity spawns/despawns, health updates. Requires interpolation for smooth remote player movement. |
| Disconnect/reconnect handling | Network reliability | MEDIUM | Graceful degradation when connection lost. Queue actions, sync on reconnect. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dual movement system (keyboard + click simultaneous) | Tactical flexibility—move while targeting different location | MEDIUM | Rare in MMOs. Keyboard sets continuous direction, click overrides temporarily. Requires state machine for movement modes. |
| Faction-specific HUD theming | Immersion in corporate identity | LOW | CSS variables + Phaser UI tinting. Verdant=green/organic, Helix=industrial/orange, Nexus=neutral/blue. |
| Biome tier visual indicators | Risk awareness at a glance | LOW | Color-coded zone name (Tier I=green, II=yellow, III=orange, IV=red). Prevents accidental high-tier zone entry. |
| Client-side prediction with visible rollback | Network transparency | HIGH | Show predicted position, smooth correction on server authority. Builds trust vs "teleporting" corrections. Industry best practice from QuakeWorld, now standard in competitive games. |
| Entity behavioral classification icons | Survival information density | MEDIUM | Herbivore/Omnivore/Predator/Maniac icons above creatures. Per lore: critical for survival decisions. High user value for knowledge workers. |
| Procedural chunk streaming | Seamless large-world exploration | HIGH | Load world chunks as player approaches, unload distant chunks. Prevents memory bloat. Common in voxel games, less in 2D—competitive advantage for scale. |
| Static entity registry (no database queries) | Performance + lore consistency | LOW | Entity configs in code (not DB). Fits "species catalog" lore. Fast lookups, no server lag for spawns. |
| Minimap with biome color-coding | Strategic planning | MEDIUM | Orthogonal view showing biome patches. MMORPG placement standard: right side, top corner. Helps route planning for resource gathering. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time interpolation for all entities | "Smooth movement for everyone" | Massive client CPU cost at MMO scale (hundreds of entities). Memory overhead for buffering snapshots. | Viewport-based culling + interpolation only for entities within render distance (24-128 blocks pattern from Minecraft). Despawn distant entities client-side. |
| Minimap with full entity tracking | "See all players/creatures" | Information overload. Performance cost. Removes exploration risk (ruins survival tension). | Show only: self, party members, points of interest. Creatures appear only if detected (proximity-based). Maintains lore's "dangerous frontier" theme. |
| Pixel-perfect pathfinding | "Shortest path always" | A* becomes expensive on large maps. Overkill for tile-based movement where "good enough" paths work. | Grid-based A* with tile resolution (not sub-tile). Acceptable for isometric/tile games. Cache common paths. |
| Animated sprite fallbacks | "Looks better than colored tiles" | Scope creep. Asset production pipeline. Conflicts with stated "no sprites, color tiles" requirement. | Embrace the aesthetic. Use color + shape variation. Crystalline Wastes = sharp triangles, Fungal Depths = organic blobs. Gameplay > visuals. |
| Global entity registry shared across clients | "Everyone sees everything" | Network bandwidth explosion. State synchronization nightmare. Irrelevant entities (why sync creatures 5km away?). | Zone-based entity interest management. Server sends only entities in player's current zone + adjacent zones. Standard MMO architecture. |
| Client-side combat resolution | "Instant feedback" | Cheating vulnerability. Authority must stay server-side for multiplayer integrity. | Client predicts visual effects only. Server resolves damage, sends authoritative results. Client reconciles if mismatch. |

## Feature Dependencies

```
Tile-based World Rendering
    └──requires──> Viewport Culling
                       └──requires──> Camera Setup

Click-to-Move
    └──requires──> Pathfinding (A*)
    └──requires──> Tile-based World (grid for pathing)

Dual Movement System
    └──requires──> WASD Movement
    └──requires──> Click-to-Move
    └──requires──> Movement State Machine

Network State Sync
    └──requires──> Socket.IO Connection (existing)
    └──requires──> Client-Side Prediction
    └──requires──> Entity Interpolation

Other Player Entities
    └──requires──> Network State Sync
    └──requires──> Viewport Culling
    └──enhances──> Entity Health Indicators

Minimap
    └──requires──> Tile-based World Rendering
    └──requires──> Biome Data Access
    └──enhances──> Zone Indicator

Procedural Chunk Streaming
    └──requires──> Viewport Culling
    └──requires──> Tile-based World Rendering
    ├──enhances──> Performance (memory management)
    └──conflicts──> Full World Preload (architectural incompatibility)

Entity Behavioral Icons
    └──requires──> Static Entity Registry
    └──requires──> Other Player Entities (entities visible)
```

### Dependency Notes

- **Tile-based World Rendering requires Viewport Culling:** Without culling, rendering performance degrades quickly. Procedural worlds can be massive (Minecraft patterns show 128-block render distances are manageable, full world is not).
- **Click-to-Move requires Pathfinding:** Cannot implement click-to-move without route calculation. A* is industry standard for grid-based 2D games.
- **Dual Movement requires both input systems:** Keyboard sets base direction, click sets target. State machine resolves priority (click overrides keyboard until destination reached).
- **Network State Sync requires Client-Side Prediction:** Without prediction, input lag makes movement feel sluggish (>100ms delay noticeable). QuakeWorld (1996) established this pattern, now industry standard.
- **Procedural Chunk Streaming conflicts with Full World Preload:** Architectural decision. Chunk streaming = scalable but complex. Full preload = simple but memory-limited. Lore suggests large procedural world → streaming recommended.

## MVP Definition

### Launch With (v1) — This Milestone

Minimum viable post-login experience — what's needed to validate core gameplay loop.

- [x] **Player Health/Energy Display** — Core survival feedback. Without this, players don't know if they're dying.
- [x] **Current Zone/Biome Indicator** — Spatial awareness. Critical per lore: entering wrong tier = death.
- [x] **WASD/Arrow Key Movement** — PC game baseline. Players expect keyboard control.
- [x] **Tile-based World Rendering (color-coded)** — Visual world representation. Stated requirement: no sprites, color tiles.
- [x] **Viewport Culling** — Performance. Required for any world larger than single screen.
- [x] **Network State Sync (basic)** — Multiplayer core. Position updates, health sync.
- [x] **Other Player Entities (basic)** — Multiplayer awareness. See other players moving.
- [x] **Click-to-Move** — Genre expectation (isometric/top-down). Accessibility.
- [x] **Static Entity Registry** — Entity configs in code. Fast spawns, lore consistency.

### Add After Validation (v1.x)

Features to add once core movement + world rendering working.

- [ ] **Dual Movement System** — Tactical enhancement. Add after single-mode movement stable.
- [ ] **Entity Health Indicators** — Combat feedback. Add when combat encounters implemented (later milestone).
- [ ] **Client-Side Prediction (refined)** — Network feel. Basic sync first, optimize after bottlenecks identified.
- [ ] **Entity Behavioral Icons** — Survival info. Add when creature variety increases (later milestone: more than 2-3 creature types).
- [ ] **Minimap** — Strategic planning. Useful after world size justifies it (multiple zones explorable).
- [ ] **Faction-Specific HUD Theming** — Polish. Add when HUD stable and not changing frequently.

### Future Consideration (v2+)

Features to defer until product-market fit established.

- [ ] **Procedural Chunk Streaming** — Defer until world size demonstrates need. Premature optimization if zones fit in memory.
- [ ] **Advanced Interpolation (all entities)** — Defer until performance profiling shows it's affordable. Start with simple position updates.
- [ ] **Biome Tier Visual Indicators** — Defer until tier system fully implemented (multiple tiers accessible).
- [ ] **Disconnect/Reconnect Queue** — Defer until network stability issues identified in production.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| WASD Movement | HIGH | MEDIUM | P1 |
| Tile-based World Rendering | HIGH | MEDIUM | P1 |
| Viewport Culling | HIGH (performance) | MEDIUM | P1 |
| Network State Sync | HIGH | HIGH | P1 |
| Health/Energy Display | HIGH | LOW | P1 |
| Zone Indicator | HIGH (survival) | LOW | P1 |
| Other Player Entities | HIGH (multiplayer) | MEDIUM | P1 |
| Click-to-Move | MEDIUM | MEDIUM | P1 |
| Static Entity Registry | MEDIUM | LOW | P1 |
| Client-Side Prediction | MEDIUM (feel) | HIGH | P2 |
| Dual Movement System | MEDIUM (tactical) | MEDIUM | P2 |
| Entity Health Indicators | MEDIUM | LOW | P2 |
| Minimap | MEDIUM | MEDIUM | P2 |
| Entity Behavioral Icons | MEDIUM | MEDIUM | P2 |
| Faction HUD Theming | LOW (polish) | LOW | P2 |
| Biome Tier Indicators | LOW | LOW | P2 |
| Procedural Chunk Streaming | HIGH (scale) | HIGH | P3 |
| Advanced Interpolation | LOW (optimization) | MEDIUM | P3 |
| Disconnect Queue | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for this milestone (post-login MVP)
- P2: Should have, add in subsequent milestones
- P3: Nice to have, future consideration once core stable

## Competitor Feature Analysis

| Feature | Tibia (tile MMO) | Minecraft Dungeons (isometric) | Our Approach |
|---------|------------------|-------------------------------|--------------|
| Movement Input | Click-to-move only | WASD + gamepad | Dual system: WASD + click (both work, click overrides) |
| World Rendering | Sprite-based tiles | 3D isometric sprites | Color-coded geometric tiles (no sprites, stated requirement) |
| HUD Layout | Minimal (chat + stats) | Action bar + health overlay | Faction-themed HUD with survival stats (health, energy, zone tier) |
| Minimap | Top-right, simple | Bottom-right, rotates with player | Top-right (MMORPG standard), orthogonal (no rotation = simpler, matches tile rendering) |
| Entity Display | Sprites + nameplates | 3D models + health bars | Color tiles + behavioral icons (Herbivore/Predator/etc per lore) |
| Network Model | Server authority, high latency tolerance | Local co-op (low latency) | Server authority + client-side prediction (Socket.IO, <100ms tolerance) |
| Zone Transitions | Instant (loading screen) | Seamless chunks | Seamless with chunk streaming (future) or instant per zone (MVP) |
| Viewport | Fixed tile count (11x11 common) | Dynamic 3D frustum | Dynamic tile frustum based on screen size + zoom level |

**Key Takeaways:**
- **Tibia's click-only movement** works but feels dated. WASD expected by modern PC gamers.
- **Minecraft Dungeons' WASD** feels good but lacks precision. Click-to-move adds tactical positioning.
- **Our dual system** combines best of both: keyboard for continuous exploration, click for precise combat positioning.
- **Color-coded tiles vs sprites** is a constraint (no sprites) turned advantage (faster rendering, clear biome differentiation).
- **Client-side prediction** is mandatory for Socket.IO. Tibia's high-latency model (2000s tech) no longer acceptable. Modern players expect <100ms input response per industry standards (QuakeWorld legacy, now universal in multiplayer).

## Technical Implementation Notes

### Phaser 3 Patterns (from research)

**HUD as Separate Scene:**
- Multiple scenes running simultaneously (GameScene + HUDScene)
- HUD scene has `setScrollFactor(0)` to prevent camera movement affecting it
- Event emitters for GameScene → HUDScene communication (health updates, zone changes)
- Common issue: HUD scene with black background blocking GameScene. Solution: transparent background, careful camera viewport setup.

**Tilemap Rendering:**
- Use `DynamicTilemapLayer` (or unified `TilemapLayer` in Phaser 3.50+) for color-coding
- Per-tile tinting via `tile.tint` property (0xRRGGBB)
- Color codes from lore: Luminous Canopy = green/blue tints, Volcanic Reaches = red/orange, Crystalline Wastes = cyan/white, etc.
- Viewport culling automatic in Phaser's tilemap rendering (only visible tiles rendered)

**Socket.IO + Phaser State Management:**
- Client-server architecture: client displays, handles input, sends to server; server broadcasts to all clients
- Socket listeners: `socket.on('newPlayer', ...)`, `socket.on('playerMoved', ...)`, `socket.on('playerDisconnected', ...)`
- Phaser Groups for entity management: `this.otherPlayers = this.add.group()` to manage all remote players as one unit
- Interpolation: buffer last 2 server updates, interpolate between them based on time delta (standard pattern from Gabriel Gambetta's Fast-Paced Multiplayer series)

**Click-to-Move Pathfinding:**
- A* algorithm on tile grid (not sub-tile precision)
- Detect click: `Input.on('pointerdown', ...)`, convert to world coordinates, convert to tile coordinates
- Calculate path, store waypoints, move player tile-by-tile along path
- Stop on collision or new input (keyboard overrides pathfinding)

**Client-Side Prediction:**
- Player inputs movement → immediately update local position
- Send input to server
- Server calculates authoritative position → sends back
- Client compares predicted vs authoritative, applies smooth correction if mismatch
- Critical for <100ms input feel with Socket.IO latency (typically 50-150ms)

### Performance Considerations

**Viewport Culling Ranges (from Minecraft research):**
- Spawn entities: 24-128 block range from player (Minecraft pattern)
- Despawn entities: >128 blocks (instant) or >32 blocks with timer (probabilistic)
- Adapt for 2D: use tile distance instead of 3D spherical distance
- Recommended for MMO: render entities within viewport + 1 screen buffer, despawn beyond 2 screens

**Chunk Streaming (future):**
- Load chunks as player approaches (trigger: within 2 chunks of unloaded chunk)
- Unload chunks as player leaves (trigger: >5 chunks away)
- Lag spike issue: generate chunks off main thread or pre-generate and cache
- 2D voxel/tile games struggle with on-the-fly generation → cache common chunk types (per biome templates)

**Entity Interpolation Cost:**
- Linear interpolation: cheap (2 vector lerps per entity per frame)
- Becomes expensive at scale: 100 entities = fine, 1000 entities = noticeable CPU cost
- Mitigation: interpolate only entities within viewport (culling applies to interpolation too)
- Buffer size: 2 snapshots sufficient (current + previous). More snapshots = smoother but higher memory + lag.

## Sources

### Phaser 3 HUD & Scene Management
- [Phaser - Game HUD Plugin Tutorial](https://phaser.io/news/2016/04/game-hud-plugin-tutorial)
- [How To Create A Game HUD Plugin In Phaser - GameDev Academy](https://gamedevacademy.org/how-to-create-a-game-hud-plugin-in-phaser/)
- [HUD scene - Multiple Scenes - Phaser 3 - Phaser](https://phaser.discourse.group/t/hud-scene-multiple-scenes/6348)
- [BaseScene, HUD and Event Emitter file structure in Phaser 3.60 – Tickle Monster](https://www.ticklemonster.com.au/2023/07/18/basescene-hud-and-event-emitter-file-structure-in-phaser-3-60/)

### Tile-Based Rendering & Performance
- [Tiles and tilemaps overview - Game development | MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps)
- [mastering tilemap types: A Guide to Game World Foundations](https://www.game-developers.org/mastering-tilemap-types-game-dev-2026)
- [Optimize performance of 2D games with Unity Tilemap](https://unity.com/how-to/optimize-performance-2d-games-unity-tilemap)
- [Deprecated: Phaser 3 API Documentation - Class: DynamicTilemapLayer](https://photonstorm.github.io/phaser3-docs/Phaser.Tilemaps.DynamicTilemapLayer.html)
- [Modular Game Worlds in Phaser 3 (Tilemaps #1) — Static Maps | by Michael Hadley | Medium](https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6)

### Movement Systems & Pathfinding
- [Desktop mouse and keyboard controls - Game development | MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Desktop_with_mouse_and_keyboard)
- [Implementing a Pathfinding Algorithm in a 2D Game | by Modern Code | Medium](https://medium.com/@moderncode/implementing-a-pathfinding-algorithm-in-a-2d-game-7847d26d557)
- [A* Pathfinding in 2D Games: The Basics for a simple Top-down Scenario](https://shendriks.dev/posts/2024-07-13-a-star-pathfinding-in-2d-games-the-basics-for-top-down-scenarios/)

### Multiplayer Networking Patterns
- [Phaser - Clients Synchronization Tutorial](https://phaser.io/news/2017/04/clients-synchronization-tutorial)
- [Building Multiplayer Games Using Phaser 3 and Socket.IO: A Helpful Guide](https://blog.yudiz.com/how-to-build-multiplayer-games-using-phaser3-and-socket-io/)
- [Client-Side Prediction and Server Reconciliation - Gabriel Gambetta](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)
- [Fast-Paced Multiplayer (Part III): Entity Interpolation](https://www.gabrielgambetta.com/entity-interpolation.html)
- [Create A Basic Multiplayer Game In Phaser 3 With Socket.io - Part 2 - GameDev Academy](https://gamedevacademy.org/create-a-basic-multiplayer-game-in-phaser-3-with-socket-io-part-2/)

### Viewport Culling & Entity Management
- [What is Culling in Game Design? | Pingle Studio](https://pinglestudio.com/knowledge-base/for-beginners/what-is-culling-in-game-design)
- [Optimizing 3D performance — Godot Engine (stable) documentation in English](https://docs.godotengine.org/en/stable/tutorials/optimization/optimizing_3d_performance.html)
- [Minecraft Mob Spawning Radius Explained (2026 Update)](https://flavor365.com/minecraft-mob-spawning-radius-explained-2026-update/)
- [Simulation distance – Minecraft Wiki](https://minecraft.fandom.com/wiki/Simulation_distance)

### HUD & UI Design Patterns
- [UX and UI in game design: exploring HUD, inventory, and menus | by Bruna Delfino | Medium](https://medium.com/@brdelfino.work/ux-and-ui-in-game-design-exploring-hud-inventory-and-menus-5d8c189deb65)
- [Minimaps Research | Minimaps_Personal_Research](https://alejandro61299.github.io/Minimaps_Personal_Research/)
- [About our approach to HUD design | News | Caliber is a team-based online game](https://playcaliber.com/en/news/638/about-our-approach-to-hud-design/)

### Procedural World Generation & Chunk Loading
- [Optimizing Game Performance: Techniques for Procedural Content Generation Customization - Wayline](https://www.wayline.io/blog/optimizing-game-performance-procedural-content-customization)
- [Implementing 2D World Chunking and World Positions - For Beginners - GameDev.net](https://www.gamedev.net/forums/topic/704136-implementing-2d-world-chunking-and-world-positions/)

### Competitor Analysis
- [Tile-Based MMOs](https://tilemmos.neocities.org/)
- [2D Tile Based MMO - Game Design and Theory - GameDev.net](https://www.gamedev.net/forums/topic/604960-2d-tile-based-mmo/4827904/)
- [Every Upcoming MMORPG 2026 - The Tank Club](https://thetankclub.com/mmorpg-2026/)

---
*Feature research for: Post-login 2D multiplayer game experience*
*Researched: 2026-02-14*
*Confidence: MEDIUM-HIGH (Phaser patterns HIGH, multiplayer networking MEDIUM due to Socket.IO-specific implementation variations)*
