# Into the Void

## What This Is

A multiplayer 2D sci-fi survival MMO with procedural world generation. Players join factions, explore zones with biome-specific hazards, interact with entities, and engage in combat. The game features real-time multiplayer sync, client-side prediction, and a complete auth-to-gameplay flow.

## Current State (v1.9 shipped)

**Shipped features:**
- Authentication: Register, login, JWT tokens, character management
- World: Procedural biomes, elevation, structures, seamless chunk streaming
- Movement: 8-directional WASD, click-to-move pathfinding, client prediction
- Inventory: 100 items, exo-suit equipment, module slots, action bar, storage
- Stats: 8 primary stats with equipment bonuses, level scaling
- Entities: 35 definitions, fertility-based spawning, creature AI, tool interaction, loot, respawn
- Combat: Auto-attack loop, creature aggro AI, player death/respawn, damage numbers, combat indicator

**Tech stack:**
- Frontend: React 18, Phaser 3, Zustand, React Router v7
- Backend: NestJS (API + WebSocket game server)
- Database: PostgreSQL with Drizzle ORM
- Monorepo: NX with 3 apps + 5 shared packages

**Codebase:** ~15,000+ LOC TypeScript

## Current Milestone: v1.11 NPCs & Trading

**Goal:** Implement NPC system with faction orbital hubs, interaction window, simple dialogue, and trading for buy/sell commerce.

**Target features:**
- Currency system (credits)
- Orbital faction hubs (4 instanced stations: Verdant, Helix, Nexus, Unaffiliated)
- Hub travel via portal structures + recall ability
- NPC definition system with types and fixed spawns
- Core NPC types: Trader, Guard, Faction Rep, Ambient, Service
- Interaction window (click NPC → modal with portrait, dialogue, actions)
- Simple linear dialogue
- Trading system (buy/sell with credit prices)

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

### Active

- [ ] Currency system with credits
- [ ] Orbital faction hubs (4 instanced stations)
- [ ] Hub travel via portals + recall ability
- [ ] NPC definition system with types and spawns
- [ ] NPC interaction window with portrait and dialogue
- [ ] Trading system with buy/sell interface

### Out of Scope

- OAuth/social login — email/password sufficient
- Sprite-based rendering — color tiles only until art pipeline ready
- PvP combat — PvE first, PvP in future milestone
- Active combat abilities — auto-attack only, abilities in v2.0
- Status effects / debuffs — future expansion
- Chat system — separate milestone
- Sound/music — polish phase
- Mobile controls — web-first
- Surface faction HQs (Canopy, Ironhold, Meridian) — orbital first, surface later
- Shared city at 0,0 — designed in future milestone
- Quest/mission system — v1.12+ (NPC framework first)
- Branching dialogue — simple linear for v1.11

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

## Known Issues

- Adjacent chunk loading times out (server zone:request not implemented)
- WebSocket auth without handshake validation (guards on all handlers)

---
*Last updated: 2026-02-19 after v1.11 milestone start*
