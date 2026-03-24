# Milestones

## v1.0 Auth & Character Screens (Shipped: 2026-02-14)

**Phases completed:** 3 phases, 7 plans

**Delivered:** Pre-game authentication and character management screens for multiplayer 2D game. Players can register, log in, view/select characters, and create new characters with faction selection.

**Key accomplishments:**
- Authentication infrastructure with Zustand + localStorage persistence
- Login & Registration screens with HTML5 validation
- Protected routing with React Router v7 loader pattern
- Character selection UI with visual faction-colored cards
- Character creation with lore-correct factions (Verdant, Helix, Nexus, Unaffiliated)
- Full auth flow integration with existing game

**Stats:**
- Timeline: 2 days (2026-02-13 → 2026-02-14)
- Files modified: 40
- Lines of code: ~1,479 TypeScript/React
- Git range: feat(01-01) → feat(03)

**Archives:**
- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`

---


## v1.2 Isometric View (Shipped: 2026-02-16)

**Phases completed:** 5 phases (8-12), 8 plans

**Delivered:** Isometric view transformation for the game. Top-down view converted to classic 2:1 isometric with proper depth sorting, screen-relative controls, and full multiplayer sync.

**Key accomplishments:**
- Isometric coordinate transformation (128x64 tiles, 2:1 ratio)
- Depth sorting with elevation support (entity offset 12px, throttle 100ms)
- Screen-relative WASD controls (W=NW, S=SE, A=SW, D=NE)
- Diamond-shaped viewport culling for performance
- Click-to-move with isometric coordinate conversion
- Minimap orthogonal view with CSS border overlay
- Hover and click feedback (tile hover, click markers, entity nameplates)

**Stats:**
- Timeline: 1 day (2026-02-16)
- Plans: 8 total (3+2+1+1+1 per phase)
- Git range: feat(08-01) → docs(phase-12)

**Archives:**
- `.planning/milestones/v1.2-ROADMAP.md`
- `.planning/milestones/v1.2-REQUIREMENTS.md`

---


## v1.1 Post-Login Game Experience (Shipped: 2026-02-16)

**Phases completed:** 4 phases (4-7), 20 plans

**Delivered:** Post-login game experience for multiplayer 2D game. Players connect via WebSocket, spawn in world with color-coded biome tiles, move with WASD/click-to-move, see other players and entities, and interact with a full HUD.

**Key accomplishments:**
- WebSocket connection with JWT auth and 5-second timeout, ping/pong latency tracking
- World rendering with 16 biome tile types and viewport culling for performance
- Movement system with client-side prediction and server reconciliation
- Click-to-move A* pathfinding with 150ms step delay
- Entity rendering with health bars and lore-accurate behavior icons (H/O/P/M)
- HUD with health, energy, XP bars and zone name with tier indicator
- Minimap using Phaser multi-camera system at 0.15x zoom
- Memory leak fixes: pauseOnBlur, tween cleanup, physics disabled

**Stats:**
- Timeline: 3 days (2026-02-14 → 2026-02-16)
- Lines of code: ~9,120 TypeScript total
- Git range: feat(04-01) → docs(07)

**Archives:**
- `.planning/milestones/v1.1-ROADMAP.md`
- `.planning/milestones/v1.1-REQUIREMENTS.md`

---


## v1.20 World Scale & Action Bar (Shipped: 2026-02-26)

**Phases completed:** 98 phases, 260 plans, 120 tasks

**Key accomplishments:**
- (none recorded)

---


## v1.24 Balance & Automation (Shipped: 2026-03-05)

**Phases completed:** 7 phases (115-121), 20 plans

**Delivered:** Situational combat depth with 4 damage types and creature resistances, biome environmental hazards, creature AI upgrades (Stampede/Pack Call/Ambush/Frenzy), full ability rebalance giving defensive skills real value, stat caps with diminishing returns, and automation tech tree from manual extractors to resource refineries.

**Key accomplishments:**
- Shared type foundation: DamageType union, DamageResistances, shield/DR AbilityEffect variants, DeployableEntity interface
- Stat caps: soft cap at 200 with diminishing returns, hard cap at 400, stats panel indicator
- 4 damage types (Thermal/Cryo/Bio/Kinetic) threaded through calculateDamage() with biome-themed creature resistances on all 83+ creatures and color-coded floating numbers
- Full ability rebalance: Plasma Burst nerfed, 13 abilities with new effect types (stun, shield absorb, DR, reflect, hazard immunity, AoE spread)
- Creature AI upgrades: Stampede (herbivores), Pack Call (omnivores), Ambush (predators), Frenzy (maniacs) with zone-level pre-processing and client visual rendering
- Biome hazard system: 5 hazard groups, 3 severity tiers, HP drain, stat debuffs, 10 protection modules, 5 consumables, HUD indicator
- Automation tech tree: T2 extractors through T5 refineries, AutomationService with 60s tick loop, deployables DB table, automation panel HUD

**Stats:**
- Timeline: 3 days (2026-03-03 → 2026-03-05)
- Commits: 75
- Files modified: 542
- Lines of code: ~69,131 TypeScript/CSS total
- Git range: docs(115) → docs(121)

**Archives:**
- `.planning/milestones/v1.24-ROADMAP.md`
- `.planning/milestones/v1.24-REQUIREMENTS.md`

---


## v1.25 Crafting (Shipped: 2026-03-06)

**Phases completed:** 4 phases (122-125), 11 plans

**Delivered:** Manual crafting system with recipe progression, per-category skill proficiency, faction specialties, quality tiers, and automation structure crafting — accessible from the HUD anywhere via a three-column panel.

**Key accomplishments:**
- Crafting Foundation: Server-side CraftingService with atomic ingredient consumption, timer enforcement, faction gating, one-active-craft limit, and disconnect cleanup
- Recipe Content: 39 recipes across 4 disciplines (Equipment, Consumables, Reagents, Automation) with 5 processed reagent intermediates
- Quality System: Proficiency-based quality rolls (Standard/Refined/Masterwork) with XP decay for diminishing returns
- Faction Specialties: 9 faction-exclusive recipes (3 per faction) for higher-tier gear
- Automation Integration: 4 deployable structure recipes bridging crafting and automation systems
- Crafting Panel UI: Three-column HUD panel with discipline tabs, ingredient availability display, progress bar, C keybind, and mini HUD indicator

**Stats:**
- Timeline: 1 day (2026-03-05)
- Files modified: 74
- Lines added: ~10,783
- Total codebase: ~72,709 LOC TypeScript/CSS
- Git range: feat(122-01) → fix(125)

**Archives:**
- `.planning/milestones/v1.25-ROADMAP.md`
- `.planning/milestones/v1.25-REQUIREMENTS.md`

---


## v1.26 Visual Overhaul & Atmosphere (Shipped: 2026-03-17)

**Phases completed:** 5 phases (126-130), 13 plans

**Delivered:** Replaced PNG tile sprites with procedural light-aware colored cubes, added biome weather particles, a day/night cycle with HUD indicator, per-biome atmospheric effects coordinated with day/night, and cleaned up the rendering pipeline.

**Key accomplishments:**
- ProceduralTileGenerator: 30 biome tile types as 3-shade isometric cubes with accent details, baked to GPU textures via generateTexture()
- WeatherSystem: viewport-fixed biome weather particles (rain, snow, ash, spores, mist, void energy) with 3-second cross-fade transitions
- DayNightCycle: camera postFX ColorMatrix with brightness/color-temperature shifts (cool nights, warm dusk/dawn) and HUD time indicator
- AtmosphereSystem: 16-biome atmospheric overlays (fog, glow, haze, murk, shimmer) with cooperative ColorMatrix sharing — no postFX stacking
- PNG rendering cleanup: all dead tile loading code removed, 12 tile PNGs archived, dev-mode runtime guard for regression detection

**Stats:**
- Timeline: 1 day (2026-03-17)
- Commits: 16 feat commits
- Files modified: 65
- Lines: +7,545 / -312
- Git range: feat(126-01) → feat(130-02)

**Archives:**
- `.planning/milestones/v1.26-ROADMAP.md`
- `.planning/milestones/v1.26-REQUIREMENTS.md`
- `.planning/milestones/v1.26-MILESTONE-AUDIT.md`

---


## v1.27 Pixel Movement Rewrite (Shipped: 2026-03-18)

**Phases completed:** 5 phases (131-135), 15 plans

**Delivered:** Replaced tile-to-tile movement with free sub-tile pixel movement. Players move continuously via WASD with pixel collision, server validates positions at 20Hz, all game systems use pixel Euclidean distance, and all legacy tile-step code removed.

**Key accomplishments:**
- PixelPosition coordinate contract and pixel-validation module with TDD
- Server 20Hz movement tick with velocity/speed validation replacing 140ms rate limiter
- All 6 distance-based systems migrated from tile integers to pixel Euclidean
- Client velocity-based WASD movement with pixel hitbox collision
- Client-side prediction with server reconciliation and remote player interpolation
- Complete removal of MovementController, PathfindingController, and A* pathfinding

**Stats:**
- Timeline: 2 days (2026-03-17 → 2026-03-18)
- Git range: feat(131-01) → docs(135)

---


## v1.28 Post-Movement Polish (Shipped: 2026-03-18)

**Phases completed:** 4 phases (136-139), 7 plans

**Delivered:** Fixed regressions from v1.27 pixel movement rewrite across four independent areas: combat/gathering distance checks, entity rendering anchor points, chunk/zone boundary collisions, and day/night brightness curve.

**Key accomplishments:**
- Combat and gathering restored with pixel Euclidean distance checks
- Entity sprites grounded on tile surfaces with correct hitboxes
- Invisible collision walls at chunk/zone boundaries removed
- Day/night ColorMatrix brightness curve corrected (dawn/dusk brighter than night)

**Stats:**
- Timeline: 1 day (2026-03-18)
- Git range: docs(136) → docs(139)

---


## v1.29 Hub Station Interiors (Shipped: 2026-03-19)

**Phases completed:** 3 phases (140-142), 9 plans

**Delivered:** Replaced plain square hubs with immersive faction-themed space station interiors. Each faction got a custom biome type, 6-8 purpose-built tiles, and a 128x128 hand-designed map with rooms, corridors, and NPC placements.

**Key accomplishments:**
- 4 new hub biome types (canopy_station, ironhold_station, meridian_station, salvage_station)
- 32 hub tile types with procedural isometric cube rendering and faction palettes
- 4 hand-designed 128x128 JSON station maps with rooms, corridors, NPC placements
- Hub system upgraded to 128x128, dedicated Salvage Station for Unaffiliated
- Indoor ambient particles per hub (spores, steam, holo-dust, smoke wisps)
- Quick fixes: corridors, tile colors, depth sorting, collisions, NPC interaction, weather effects, Sentry

**Stats:**
- Timeline: 2 days (2026-03-18 → 2026-03-19)
- Git range: docs(140) → docs(142)

---


## v1.30 World Rendering & Interaction Fix (Shipped: 2026-03-24)

**Phases completed:** 4 phases (143-146), 5 plans, ~12 tasks

**Delivered:** Fixed three critical regressions that broke normal gameplay after the pixel movement rewrite and hub interior updates — entity sprites sinking below ground, adjacent chunks leaving black void gaps, and abilities not firing on selected targets. Secondary fixes addressed portal debounce, NPC proximity, debug log cleanup, and stale docs.

**Key accomplishments:**
- Entity rendering fix: +64px ground offset (later refined via depth offset mechanism) so sprites sit on tile surfaces
- Chunk loading fix: zone:chunk listener cleanup passes handler reference, failed chunks retry automatically
- Ability targeting fix: ActionBar reads selectedTarget (persists across combat state) instead of cleared targetEntityId
- Portal debounce: key includes zoneId to prevent cross-zone re-triggering
- NPC proximity: uses pixel coordinates from movement system with defensive fallback

**Stats:**
- Timeline: 1 day (2026-03-19), completed with quick fixes through 2026-03-20
- Commits: 18 phase commits + 12 quick-fix commits
- Codebase: ~78,349 LOC TypeScript/CSS
- Git range: feat(143-01) → docs(146-02)

**Tech debt accepted:**
- Phase 143 VERIFICATION.md stale (ENTITY_GROUND_OFFSET mechanism changed by quick-10)
- Server ability debug logs reintroduced post-phase (outside MISC-03 scope)
- GameContainer.tsx has 5 debug console.log calls

**Archives:**
- `.planning/milestones/v1.30-ROADMAP.md`
- `.planning/milestones/v1.30-REQUIREMENTS.md`
- `.planning/milestones/v1.30-MILESTONE-AUDIT.md`

---


## v1.31 Strategy Pattern Refactor & Code Decomposition (Shipped: 2026-03-24)

**Phases completed:** 7 phases (147-153), 13 plans

**Delivered:** Broke apart the 8 largest classes using Strategy Pattern for type-branching logic and component decomposition for god objects. Zero behavioral changes — pure structural refactoring for maintainability and extensibility.

**Key accomplishments:**
- EntityRenderer (1509→896 LOC): 6 entity type strategies with registry dispatch
- ProceduralTileGenerator (1842→156 LOC): 6 behavioral-category tile strategies with data-driven accent configs
- ability.service (1420→910 LOC): 11 effect type strategies in packages/game-logic/
- creature-ai (304 LOC): 4 behavior strategies formalized from existing functions
- AtmosphereSystem + WeatherSystem: 12 strategies replacing type-switch logic
- WorldScene (2926→782 LOC): 4 controllers extracted (Camera, Input, Entity, Interaction) with Phaser event communication
- game.gateway (2092→489 LOC): 5 domain handlers (Zone, Inventory, Combat, Social, Automation) as NestJS injectables

**Stats:**
- Timeline: 1 day (2026-03-24)
- Commits: ~33
- Codebase: ~79,890 LOC TypeScript/CSS
- Total LOC reduction in refactored files: ~5,500 lines moved to focused strategy/controller classes

**Archives:**
- `.planning/milestones/v1.31-ROADMAP.md`
- `.planning/milestones/v1.31-REQUIREMENTS.md`
- `.planning/milestones/v1.31-MILESTONE-AUDIT.md`

---

