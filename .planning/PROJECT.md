# Into the Void

## What This Is

A multiplayer 2D sci-fi survival MMO with procedural world generation. Players join factions, explore zones with biome-specific hazards, interact with entities, and engage in combat. The game features real-time multiplayer sync, client-side prediction, expedition travel, and a dual action bar system for ability management.

## Current State (v1.30 shipped)

**Shipped features:**
- Authentication: Register, login, JWT tokens, character management
- World: Procedural biomes (reduced scale for walkable exploration), elevation, structures, seamless chunk streaming
- Movement: 8-directional WASD, click-to-move pathfinding, client prediction
- Inventory: 100+ items, exo-suit equipment, module slots, action bar, storage
- Stats: 8 primary stats with equipment bonuses, level scaling, soft cap at 200 with diminishing returns, hard cap at 400
- Entities: 83+ creature definitions, fertility-based spawning, creature AI with Stampede/Pack Call/Ambush/Frenzy behaviors, tool interaction, loot, respawn
- Combat: 4 damage types (Thermal/Cryo/Bio/Kinetic) with creature resistance multipliers, ability-based system with energy costs and cooldowns, creature aggro AI, player death/respawn, balanced TTK
- Abilities: 21 abilities across offensive/defensive/utility, rebalanced with real shield absorb, damage reduction, stun, reflect, AoE spread, hazard immunity
- NPCs: Definition system, 5 types (Trader/Guard/Rep/Ambient/Service/Expedition), interaction modal, dialogue
- Trading: Buy/sell with credits, trader inventory, credit balance in HUD
- Hubs: 4 orbital faction stations, portal travel, home recall ability (5 min cooldown)
- Travel: Expedition NPC teleport to random world locations with tier-locked destinations
- Persistence: Player position saves across sessions, starter kit for new players
- Quests: Definition system, NPC quest offering, quest log UI, objective tracking, chains, bounties
- UI Polish: Unified NPC modal, quest tracker HUD, glassmorphism, quest markers, completion feedback
- Gathering: Timing mini-game, proficiency progression, rare/epic node variants, risk/reward placement
- Exploration: Fog of war, POI discovery, lore fragments, zone mastery system
- Content: 16 biomes (including aquatic + exotic), 83+ creatures, full plant/mineral/artifact coverage, faction gear lines
- Action Bar: Dual bars (16 slots), click-to-trigger, shift+drag relocation, panel-to-bar drag, drop-outside-to-remove
- HUD: Compact shortcuts, CSS Grid layout, hazard indicator, shield bar, automation panel
- Chat: 5-channel system (local/zone/faction/global/whisper), moderation (mute/block), persistence
- Biome Hazards: HP drain, stat debuffs, tiered severity, protection gear counters, grace period, HUD indicator
- Automation: T2-T5 deployable structures (extractors, beacons, planetary extractors, refineries), AutomationService with tick loop, maintenance costs, automation panel HUD
- Crafting: 39 recipes across 4 disciplines (Equipment/Consumables/Reagents/Automation), quality tiers (Standard/Refined/Masterwork), per-discipline proficiency with XP decay, faction specialty recipes, crafting panel UI with C keybind, mini HUD indicator
- Visual: Procedural 3-shade isometric terrain cubes (30 biome palettes, GPU-baked textures), viewport-fixed weather particles per biome, day/night cycle with camera postFX ColorMatrix, 16-biome atmospheric overlays (fog/glow/haze/murk/shimmer), HUD time indicator

**Tech stack:**
- Frontend: React 18, Phaser 3, Zustand, React Router v7
- Backend: NestJS (API + WebSocket game server)
- Database: PostgreSQL with Drizzle ORM
- Monorepo: NX with 3 apps + 5 shared packages
- Deployment: Docker Swarm, Traefik reverse proxy, GitHub Actions CI/CD

- Hub Interiors: 4 faction-themed 128x128 station maps with rooms, corridors, ambient particles
- Pixel Movement: Free sub-tile WASD, 20Hz server validation, pixel Euclidean distance everywhere
- Rendering: Entities grounded on tiles, seamless chunk loading, correct depth sorting
- Targeting: Abilities fire at selectedTarget, gathering works on resource click

**Codebase:** ~78,349 LOC TypeScript/CSS

## Core Value

Real-time multiplayer gameplay with responsive movement and visual feedback.

## Requirements

### Validated

- ✓ REST API with JWT authentication — existing
- ✓ Character CRUD API endpoints — existing
- ✓ Registration, login, character selection screens — v1.0
- ✓ Character creation with faction selection — v1.0
- ✓ WebSocket connection with auth handshake — v1.1
- ✓ World rendering with color-coded tiles — v1.1
- ✓ Viewport culling for performance — v1.1
- ✓ Zone HUD with tier indicator — v1.1
- ✓ WASD/arrow key movement — v1.1
- ✓ Click-to-move pathfinding — v1.1
- ✓ Client-side prediction with server reconciliation — v1.1
- ✓ Other players visible and moving — v1.1
- ✓ Entity rendering with health bars — v1.1
- ✓ Creature behavior icons (H/O/P/M) — v1.1
- ✓ HUD with health, energy, zone name — v1.1
- ✓ Minimap with player position — v1.1
- ✓ Tile definition system with properties and hooks — v1.3
- ✓ Terrain elevation (0-5 levels) with side-face rendering — v1.3
- ✓ Structure walls with variable height — v1.3
- ✓ Elevation-aware movement and pathfinding — v1.3
- ✓ Depth sorting with height occlusion — v1.3
- ✓ World-gen elevation and structure placement — v1.3
- ✓ Biome noise layer independent of chunk boundaries — v1.4
- ✓ Mixed-scale biome distribution (macro + micro) — v1.4
- ✓ Continuous elevation with biome-based rules — v1.4
- ✓ Viewport-based chunk streaming with pre-loading — v1.4
- ✓ Server chunk generation and caching — v1.4
- ✓ Seamless cross-chunk rendering — v1.4
- ✓ Entity visibility consistency across chunks — v1.4
- ✓ 8-directional WASD movement with chord detection — v1.5
- ✓ Diagonal A* pathfinding with corner-cutting prevention — v1.5
- ✓ Smooth camera following with lerp interpolation — v1.5
- ✓ Tile-to-tile tween animation — v1.5
- ✓ Tile movement speed modifiers — v1.5
- ✓ Zone boundary hysteresis — v1.5
- ✓ Unified movement timing (500ms base, 2 tiles/sec) — v1.5
- ✓ Item definition system with strategy pattern and repository — v1.6
- ✓ 100 items across 6 categories (suits, modules, tools, consumables, world items, reagents) — v1.6
- ✓ 5 rarity tiers (Common, Rare, Epic, Exotic, Legendary) — v1.6
- ✓ Exo-suit equipment with module slots scaling by rarity — v1.6
- ✓ Main/secondary tool slots with hotkey switching — v1.6
- ✓ Character equipment panel UI — v1.6
- ✓ Action bar with hotkeys — v1.6
- ✓ Personal storage UI — v1.6
- ✓ 8 primary stats with per-stat tuning and level scaling — v1.7
- ✓ Equipment stat bonuses aggregated from equipped items — v1.7
- ✓ Stats UI with breakdown display — v1.7
- ✓ Level-up notification with stat deltas — v1.7
- ✓ Entity definition system with strategy pattern and repository — v1.8
- ✓ 4 entity types with type hierarchy (Creatures, Plants, Minerals, Artifacts) — v1.8
- ✓ Fertility noise layer (Barren/Normal/Lush spawn density) — v1.8
- ✓ Biome-specific entity spawning with density caps — v1.8
- ✓ Entity stats and health bars — v1.8
- ✓ Weighted random loot drop tables — v1.8
- ✓ Tool interaction with range stat — v1.8
- ✓ Perception/level gating for entities — v1.8
- ✓ Creature idle wander and flee behaviors — v1.8
- ✓ Entity respawn system with DB persistence — v1.8
- ✓ Zone HUD fertility display — v1.8
- ✓ Auto-attack combat loop with Power/Toughness/Haste — v1.9
- ✓ Creature aggro AI (predator/maniac auto-attack, omnivore retaliation) — v1.9
- ✓ Player death and respawn at faction hub — v1.9
- ✓ Floating damage numbers above entities — v1.9
- ✓ "In Combat" HUD indicator — v1.9
- ✓ Click-to-attack: player clicks creature with combat tool equipped to start auto-attack — v1.10
- ✓ Per-tool attack ranges: melee tools 1 tile, ranged tools 3-5 tiles — v1.10
- ✓ Target selection UI: visual highlight/indicator on targeted entity — v1.10
- ✓ Combat log panel: scrollable text log of damage events with timestamps — v1.10
- ✓ Currency system with credits — v1.11
- ✓ Orbital faction hubs (4 instanced stations) — v1.11
- ✓ Hub travel via portals + recall ability — v1.11
- ✓ NPC definition system with types and spawns — v1.11
- ✓ NPC interaction window with portrait and dialogue — v1.11
- ✓ Trading system with buy/sell interface — v1.11
- ✓ Player location persistence across sessions — v1.12
- ✓ NPC spawning observability in hubs — v1.12
- ✓ Rendering depth sorting fix (entity layer separation) — v1.12
- ✓ Elevation visibility improvements (edge highlights, shadows) — v1.12
- ✓ New player starter kit (basic suit + tool) — v1.12
- ✓ Content expansion: 7 new creatures, 15 new items — v1.12
- ✓ Ability definition system with energy cost, cooldown, effects — v1.13
- ✓ Item-ability associations (suits, tools, modules grant abilities) — v1.13
- ✓ Click-to-select targeting decoupled from auto-attack — v1.13
- ✓ Action bar ability management with drag-to-rearrange — v1.13
- ✓ Ability execution with energy drain and cooldown — v1.13
- ✓ Cooldown UI with radial sweep overlay — v1.13
- ✓ Buff system with instant and duration-based effects — v1.13
- ✓ 21 abilities across Offensive, Defensive, Utility categories — v1.13
- ✓ 20 tools and 14 suits with ability grants — v1.13
- ✓ Quest definition system with types, objectives, and rewards — v1.15
- ✓ NPC quest offering via dialogue system — v1.15
- ✓ Quest markers (! for available, ? for turn-in) — v1.15
- ✓ Quest log UI with Active/Completed tabs — v1.15
- ✓ Objective tracking with counters and progress — v1.15
- ✓ Multi-step quest chains — v1.15
- ✓ Quest rewards (credits, XP, items) — v1.15
- ✓ Story quests (one-time) and bounty quests (daily repeatable) — v1.15
- ✓ Auto-discover quests on area entry — v1.15
- ✓ Quest state persistence in database — v1.15
- ✓ Unified NPC modal with tab navigation (Dialogue/Quests/Trade) — v1.16
- ✓ Quest objective tracker HUD with collapse/expand — v1.16
- ✓ GPU-accelerated visual polish with glassmorphism effects — v1.16
- ✓ Real-time quest markers on NPCs (! for available, ? for turn-in) — v1.16
- ✓ Quest completion banners with audio feedback — v1.16
- ✓ Loading spinners and error handling for async operations — v1.16
- ✓ Gathering system with timing mini-game and skill expression — v1.17
- ✓ Resource node risk/reward (better nodes in dangerous areas) — v1.17
- ✓ Gathering progression (proficiency improves with use) — v1.17
- ✓ Fog of war map reveal (persistent per-character) — v1.17
- ✓ Points of interest discovery (anomalies, caches, landmarks) — v1.17
- ✓ Lore fragments (data logs revealing world history) — v1.17
- ✓ Zone mastery system (completion objectives per zone) — v1.17
- ✓ Combat balancing (gradual fights, no one-shots) — v1.17
- ✓ Quest item audit (ensure all items obtainable) — v1.17
- ✓ New aquatic biomes (coral_reef, kelp_forest, abyssal_trench) — v1.18
- ✓ New exotic biomes (crystalline_wastes, bioluminescent_depths, void_rift) — v1.18
- ✓ 30+ new gatherable entities with rare/epic variants — v1.18
- ✓ 20+ new creatures across all biomes — v1.18
- ✓ 40+ new items (materials, consumables, equipment) — v1.18
- ✓ All biome resource gaps filled — v1.18
- ✓ Tier progression balanced (starter → endgame) — v1.18
- ✓ Reduced biome scale for walkable exploration — v1.20
- ✓ Expedition NPC with tier-locked destinations — v1.20
- ✓ Universal home recall ability (5 min cooldown) — v1.20
- ✓ Action bar click-to-trigger behavior — v1.20
- ✓ Action bar drag-and-drop management — v1.20
- ✓ Second action bar with Shift+1-8 keybindings — v1.20
- ✓ HUD shortcuts reorganization — v1.20
- ✓ ESC closes open modals one by one; opens game menu when none open — v1.21
- ✓ Game menu with settings panel and logout button — v1.21
- ✓ Background music playing on loop from existing tracks — v1.21
- ✓ Level-up sound effect triggers on level gain — v1.21
- ✓ Audio settings with separate ambient/music/effects volume — v1.21
- ✓ Interface settings to toggle second action bar visibility — v1.21
- ✓ Entity rendering anchored at base tile, selection indicator aligned — v1.21
- ✓ Chat panel UI with tabbed channel navigation — v1.22
- ✓ Local chat (proximity-based, nearby players) — v1.22
- ✓ Zone-wide chat channel — v1.22
- ✓ Faction chat channel (faction members only) — v1.22
- ✓ Global chat channel (server-wide) — v1.22
- ✓ Whisper system (private 1-on-1 messages) — v1.22
- ✓ Player mute (hide messages from specific players) — v1.22
- ✓ Player block (prevent whispers from specific players) — v1.22
- ✓ Mute/block lists persist across sessions — v1.22
- ✓ Entity validation infrastructure with 4-category test suite — v1.23
- ✓ Faction identity design artifact (stat archetypes, ability matrices, naming) — v1.23
- ✓ All 16 biomes with 4-6 creatures, behavioral variety — v1.23
- ✓ All biomes with 3-4 plants, 2-3 minerals, 1-2 artifacts — v1.23
- ✓ Faction suit lines (Verdant/Helix/Nexus/Unaffiliated) Common through Legendary — v1.23
- ✓ Faction modules and tools completing gear identity — v1.23
- ✓ DamageType union and DamageResistances on all creatures — v1.24
- ✓ Shield/damage_reduction AbilityEffect variants — v1.24
- ✓ DeployableEntity interface and AiTickResult behavior signals — v1.24
- ✓ Stat soft cap at 200 with diminishing returns, hard cap at 400 — v1.24
- ✓ 4 damage types threaded through calculateDamage() with resistance multipliers — v1.24
- ✓ Creature resistances matching biome lore (70% cap, 0.3x floor) — v1.24
- ✓ Color-coded floating damage numbers per type — v1.24
- ✓ All 13 abilities rebalanced with situational niches — v1.24
- ✓ Emergency Shield as absorb pool, Fortify as flat DR, Magnetic Field as reflect — v1.24
- ✓ Energy Barrier biome hazard immunity — v1.24
- ✓ Creature AI: Stampede, Pack Call, Ambush, Frenzy behaviors — v1.24
- ✓ Zone-level pre-processing for group AI behaviors — v1.24
- ✓ HazardService with per-player state, HP drain, stat debuffs, gear counters — v1.24
- ✓ Hazard protection gear and consumables in trader inventories — v1.24
- ✓ Hazard HUD indicator with protection bar — v1.24
- ✓ Automation tech tree: T2 extractors through T5 refineries — v1.24
- ✓ AutomationService with 60s tick, maintenance costs, DB persistence — v1.24
- ✓ Automation panel HUD for deploy/collect/refuel — v1.24
- ✓ Recipe definitions as static data in shared package — v1.25
- ✓ Recipe browsing organized by crafting discipline — v1.25
- ✓ Ingredient requirements with have/need counts — v1.25
- ✓ Locked recipe display with unlock conditions — v1.25
- ✓ Progressive recipe unlocks via level, quests, POI discovery — v1.25
- ✓ Faction-specific specialty recipes — v1.25
- ✓ Craft execution with ingredient consumption and progress timer — v1.25
- ✓ Server-side crafting validation (ingredients, unlocks, faction) — v1.25
- ✓ Atomic ingredient consumption (all-or-nothing) — v1.25
- ✓ Server-managed crafting timer (prevents client exploits) — v1.25
- ✓ One active craft at a time enforcement — v1.25
- ✓ Disconnect cancels active craft — v1.25
- ✓ Per-discipline crafting proficiency with XP — v1.25
- ✓ Quality tiers (Standard/Refined/Masterwork) influenced by proficiency — v1.25
- ✓ Proficiency persistence in database — v1.25
- ✓ Crafting panel accessible from HUD at any location (C keybind) — v1.25
- ✓ Discipline tabs for recipe categories — v1.25
- ✓ Craft button enabled only when ingredients available and recipe unlocked — v1.25
- ✓ Active craft progress bar with remaining time — v1.25
- ✓ Proficiency level and XP display per discipline — v1.25
- ✓ Equipment, consumable, reagent, and automation recipes — v1.25
- ✓ 9 faction-exclusive specialty recipes (3 per faction) — v1.25
- ✓ Procedural light-aware terrain cubes with 3-shade biome colors and accent details — v1.26
- ✓ Biome-specific particle weather (rain, snow, ash, spores, mist, void energy) — v1.26
- ✓ Day/night cycle with camera postFX ColorMatrix and HUD time indicator — v1.26
- ✓ Biome atmospheric effects (fog, glow, haze, murk, shimmer) coordinated with day/night — v1.26
- ✓ Rendering code cleanup (PNG tiles archived, dead code removed, dev-mode guard added) — v1.26
- ✓ Free sub-tile WASD pixel movement (not tile-locked) — v1.27
- ✓ 20Hz server position validation and broadcast — v1.27
- ✓ Pixel hitbox collision replacing tile-based collision map — v1.27
- ✓ Click-to-move and pathfinding removed (WASD only) — v1.27
- ✓ Distance-based systems converted to pixel Euclidean distance — v1.27
- ✓ Client-side prediction with server reconciliation (pixel) — v1.27
- ✓ Remote player interpolation — v1.27
- ✓ Legacy tile-step movement code removed — v1.27
- ✓ Combat and gathering restored with pixel distance checks — v1.28
- ✓ Entity sprites grounded on tile surfaces with correct hitboxes — v1.28, refined v1.30
- ✓ Chunk/zone boundary invisible collision walls removed — v1.28
- ✓ Day/night brightness curve corrected (dawn/dusk brighter than night) — v1.28
- ✓ 4 hub biome types with 32 faction-themed procedural tiles — v1.29
- ✓ 4 hand-designed 128x128 hub station maps with NPC placements — v1.29
- ✓ Indoor ambient particles per hub biome — v1.29
- ✓ Entity Y-positioning and unified depth sorting — v1.30
- ✓ Seamless chunk loading with failed chunk retry logic — v1.30
- ✓ Ability targeting reads selectedTarget instead of targetEntityId — v1.30
- ✓ Portal debounce includes zoneId for cross-zone correctness — v1.30
- ✓ NPC proximity uses pixel coordinates from movement system — v1.30

### Active

## Current Milestone: v1.31 Strategy Pattern Refactor & Code Decomposition

**Goal:** Break apart the largest classes in the codebase using Strategy Pattern for type-branching logic and component extraction for god objects, improving maintainability and extensibility.

**Target refactors:**
- EntityRenderer.ts (1509 LOC) → Strategy per entity type (creature, plant, mineral, NPC, artifact)
- ProceduralTileGenerator.ts (1842 LOC) → Strategy per tile type/biome group
- ability.service.ts (1420 LOC) → Strategy per ability effect type
- creature-ai.ts (304 LOC) → Formalize existing behavior functions into Strategy
- AtmosphereSystem.ts (477 LOC) → Strategy per atmosphere effect
- WeatherSystem.ts (540 LOC) → Strategy per particle type
- WorldScene.ts (2926 LOC) → Component decomposition (input, camera, entity lifecycle, rendering)
- game.gateway.ts (2092 LOC) → Command/Handler pattern for event dispatch

### Out of Scope

- OAuth/social login — email/password sufficient
- Sprite-based rendering — procedural cubes approach working well, sprites when art pipeline ready
- PvP combat — PvE first, PvP in future milestone
- Chat speech bubbles above characters — panel-only for now
- Mobile controls — web-first
- Surface faction HQs (Canopy, Ironhold, Meridian) — orbital first, surface later
- Shared city at 0,0 — designed in future milestone
- Faction reputation system — future milestone
- Branching dialogue — simple linear sufficient for now
- Third action bar — two bars sufficient, reassess if needed
- Crafting mini-game — quality influenced by proficiency, not dexterity
- Bulk crafting / queue — single craft at a time sufficient for now
- New abilities — rebalance existing 21, don't add new ones yet

## Constraints

- **Tech stack**: React for UI, Phaser for game canvas — established pattern
- **Styling**: Plain CSS with CSS variables — no framework
- **Sprites**: 96x96 pixel size — from CLAUDE.md
- **Factions**: Verdant Dynamics, Helix Extraction, Nexus Frontiers, Unaffiliated — from lore
- **Tile size**: 96px for all tiles and sprites

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React screens (not Phaser menus) | Auth forms are standard web UI | ✓ Good |
| React Router v7 action pattern | Modern form handling | ✓ Good |
| Lore-correct factions | Match world-bible.md | ✓ Good |
| 5-second auth timeout | Prevents stuck connections | ✓ Good |
| E-XXXX error codes | User-facing errors with action hints | ✓ Good |
| Client-side prediction | Responsive movement feel | ✓ Good |
| 140ms server rate limit | Prevents movement spam | ✓ Good |
| Phaser multi-camera minimap | Reuses tile rendering | ✓ Good |
| 96px TILE_SIZE | Matches sprite specification | ✓ Good |
| pauseOnBlur enabled | Prevents memory leaks on tab switch | ✓ Good |
| Biome scale 256 tiles | 2-3 min walk encourages exploration | ✓ Good |
| Expedition NPC (free, no cooldown) | Tier-lock sufficient gating | ✓ Good |
| Home recall as universal ability | Available without equipment dependency | ✓ Good |
| Dual action bars with bar-prefixed DnD | Prevents slot ID collisions | ✓ Good |
| CSS Grid HUD layout | Clean separation of bars and shortcuts | ✓ Good |
| Resistance cap at 70% (0.3x floor) | No creature immunity, prevents hard lock-out | ✓ Good |
| Resistance after armor reduction | Independent armor and resistance layers | ✓ Good |
| BIOME_RESISTANCE_PROFILES lookup | All 77 creatures use biome-based profiles, no per-creature overrides | ✓ Good |
| Fuel items use 'reagent' category | Prevents accidental consumption via inventory:use | ✓ Good |
| AutomationService sync processTick() | No async calls for tick-budget safety | ✓ Good |
| PvP deployable looting (no owner check) | Any player can collect from any deployable | ⚠️ Revisit |
| Maintenance cost >= 60% of output | Prevents runaway credit inflation from automation | ✓ Good |
| Quality as runtime modifier, not separate items | Prevents item registry bloat; Standard/Refined/Masterwork on same item ID | ✓ Good |
| No crafting failure/material loss | Quality tiers provide variation without punishment; most-hated mechanic avoided | ✓ Good |
| XP decay for proficiency | Prevents grinding low-tier recipes for infinite XP; encourages tier progression | ✓ Good |
| Crafting anywhere (no stations) | Player requested anywhere-access; stations add complexity without value | ✓ Good |
| Procedural cubes over PNG sprites | GPU-baked textures via generateTexture(); consistent art without asset pipeline | ✓ Good |
| Camera postFX ColorMatrix for day/night | Full-screen effect without per-tile tint; minimap unaffected | ✓ Good |
| Cooperative ColorMatrix sharing | Atmosphere additively writes to DayNightCycle's matrix; no stacking | ✓ Good |
| Clean break from PNG tiles | No fallback/debug flag; forward-only to procedural rendering | ✓ Good |
| ENTITY_GROUND_OFFSET then depth offset | Phase 143 used +64px, quick-10 refined to depth-based offset; visual goal met | ✓ Good |
| selectedTarget over targetEntityId | Persists across combat state changes; abilities always have target available | ✓ Good |
| Portal debounce key includes zoneId | Prevents false-positive suppression when entering new zone at same tile coords | ✓ Good |
| Socket.off passes handler reference | Prevents cleanup from removing ALL listeners for an event type | ✓ Good |

## Known Issues

- WebSocket auth without handshake validation (guards on all handlers)

---
*Last updated: 2026-03-24 after v1.31 milestone started*
