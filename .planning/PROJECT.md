# Into the Void

## What This Is

A multiplayer 2D sci-fi survival MMO with procedural world generation. Players join factions, explore zones with biome-specific hazards, interact with entities, and engage in combat. The game features real-time multiplayer sync, client-side prediction, and a complete auth-to-gameplay flow.

## Current State (v1.1 shipped)

**Shipped features:**
- Authentication: Register, login, JWT tokens
- Character management: Select, create characters with faction selection
- WebSocket game connection with auth handshake
- World rendering with 16 biome tile types and viewport culling
- Movement: WASD keyboard + click-to-move A* pathfinding
- Client-side prediction with server reconciliation
- Entity rendering with health bars and behavior icons
- HUD: Health, energy, XP bars + zone name + minimap

**Tech stack:**
- Frontend: React 18, Phaser 3, Zustand, React Router v7
- Backend: NestJS (API + WebSocket game server)
- Database: PostgreSQL with Drizzle ORM
- Monorepo: NX with 3 apps + 4 shared packages

**Codebase:** ~9,120 LOC TypeScript

## Current Milestone: v1.3 Elevation & Structures

**Goal:** Add vertical dimension to the world with terrain elevation, structure walls, and a scalable tile definition system.

**Target features:**
- Tile definition system (TileDefinition interface, TileRegistry, hooks)
- Terrain elevation (0-5 levels, side-face rendering)
- Movement rules (1-level diff walkable, 2+ blocks)
- Structure walls (variable height by type, always blocking)
- Full occlusion depth sorting with height
- World-gen elevation noise and structure placement
- Pathfinding with elevation awareness
- Minimap structure markers

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

### Active

- [ ] Tile definition system with properties and hooks
- [ ] Terrain elevation (0-5 levels) with side-face rendering
- [ ] Structure walls with variable height
- [ ] Elevation-aware movement and pathfinding
- [ ] Depth sorting with height occlusion
- [ ] World-gen elevation and structure placement

### Out of Scope

- OAuth/social login — email/password sufficient
- Sprite-based rendering — color tiles only until art pipeline ready
- Combat system — separate milestone
- Inventory UI — separate milestone
- Chat system — separate milestone
- Sound/music — polish phase
- Mobile controls — web-first

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
*Last updated: 2026-02-16 after v1.3 milestone start*
