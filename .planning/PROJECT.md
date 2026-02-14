# Into the Void — Auth & Character Screens

## What This Is

A multiplayer 2D game with procedural world generation, real-time player interaction, and faction-based gameplay. Players explore zones, interact with entities, and engage in combat. **v1.0** added the pre-game experience: registration, login, character selection, and character creation screens.

## Current Milestone: v1.1 Post-Login Game Experience

**Goal:** After selecting a character, the player appears in the game world and can play.

**Target features:**
- WebSocket connection wired to authenticated character
- World rendering with color-coded tiles
- HUD with health, energy, zone name
- Movement (keyboard + click-to-move)
- Entity registry for game configs

## Core Value

Players can create an account, log in, and select/create characters before entering the game world.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ REST API with JWT authentication — existing
- ✓ Character CRUD API endpoints — existing
- ✓ WebSocket game server with token auth — existing
- ✓ React/Phaser web client — existing
- ✓ Procedural world generation — existing
- ✓ Player movement and zone transitions — existing
- ✓ Entity interactions (minerals, items, creatures) — existing
- ✓ Real-time multiplayer sync — existing
- ✓ Landing page with Login/Register options — v1.0
- ✓ Registration screen (email, password, confirm password) — v1.0
- ✓ Login screen (email, password) — v1.0
- ✓ Character selection screen with visual cards — v1.0
- ✓ Character creation screen (name, faction selection) — v1.0
- ✓ Auth flow integration (token storage, protected routes) — v1.0

### Active

<!-- Current scope. Building toward these. -->

- [ ] WebSocket connection wired to auth flow (token + characterId)
- [ ] Player spawns at correct position (spawn point or last known)
- [ ] World renders with color-coded tiles (no sprites yet)
- [ ] HUD displays health, energy, zone name
- [ ] Movement works (WASD/arrows + click-to-move)
- [ ] Entity registry in code (tiles, creatures, items configs)

### Out of Scope

- OAuth/social login — email/password sufficient for v1
- Password strength meter — basic validation only
- Avatar uploads — characters don't have visual customization yet
- Character deletion from UI — can be added later
- "Remember me" / persistent sessions — tokens expire normally
- Email verification flow — registration works immediately
- Stat allocation during character creation — deferred to v2

## Context

**Current state (v1.0 shipped):**
- ~1,479 LOC TypeScript/React added
- Tech stack: React Router v7, Zustand with persist middleware, vanilla CSS
- Auth flow: Login/Register → Character Select → Create Character → Game
- Factions updated to lore-correct: Verdant Dynamics, Helix Extraction, Nexus Frontiers, Unaffiliated

**Architecture:**
- NX monorepo with 3 apps (api, game-server, web) and 4 packages
- Backend handles: `/auth/register`, `/auth/login`, `/auth/me`, `/characters` CRUD
- WebSocket auth via `authenticate(token, characterId)` method
- CSS variables system with dark theme (--color-bg-*, --color-accent)

## Constraints

- **Tech stack**: React for screens (not Phaser UI) — matches existing patterns
- **Styling**: Plain CSS with existing variable system — no new CSS framework
- **Backend**: Use existing API endpoints — no backend changes needed
- **Factions**: 4 options (verdant, helix, nexus, neutral) — from world-bible.md lore

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React screens (not Phaser menus) | Auth forms are standard web UI, React handles this better | ✓ Good |
| Visual character cards | Shows more info at a glance, feels more polished | ✓ Good |
| React Router v7 action pattern | Modern form handling, automatic revalidation | ✓ Good |
| Lore-correct factions | Verdant/Helix/Nexus match world-bible.md | ✓ Good |
| Stat allocation deferred to v2 | Keep MVP simple, focus on core auth flow | — Pending |

---
*Last updated: 2026-02-14 after v1.0 milestone*
