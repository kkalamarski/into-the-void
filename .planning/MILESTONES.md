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

