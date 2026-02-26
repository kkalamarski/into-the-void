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

