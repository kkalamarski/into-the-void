# Into the Void — Auth & Character Screens

## What This Is

A multiplayer 2D game with procedural world generation, real-time player interaction, and faction-based gameplay. Players explore zones, interact with entities, and engage in combat. This milestone adds the pre-game experience: registration, login, and character management screens.

## Core Value

Players can create an account, log in, and select/create characters before entering the game world.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- [x] REST API with JWT authentication — existing
- [x] Character CRUD API endpoints — existing
- [x] WebSocket game server with token auth — existing
- [x] React/Phaser web client — existing
- [x] Procedural world generation — existing
- [x] Player movement and zone transitions — existing
- [x] Entity interactions (minerals, items, creatures) — existing
- [x] Real-time multiplayer sync — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Landing page with Login/Register options
- [ ] Registration screen (email, password, confirm password)
- [ ] Login screen (email, password)
- [ ] Character selection screen with visual cards
- [ ] Character creation screen (name, faction, stat allocation)
- [ ] Auth flow integration (token storage, game server handoff)

### Out of Scope

- OAuth/social login — email/password sufficient for v1
- Password strength meter — basic validation only
- Avatar uploads — characters don't have visual customization yet
- Character deletion from UI — can be added later
- "Remember me" / persistent sessions — tokens expire normally
- Email verification flow — registration works immediately

## Context

**Existing architecture:**
- NX monorepo with 3 apps (api, game-server, web) and 4 packages
- Backend already handles: `/auth/register`, `/auth/login`, `/auth/me`, `/characters` CRUD
- WebSocket auth via `authenticate(token, characterId)` method
- CSS variables system with dark theme (--color-bg-*, --color-accent)

**Current state:**
- Game boots directly into Phaser world scene
- No pre-game screens exist
- Auth tokens and character selection are not integrated in UI

**What needs to change:**
- Add React screens before Phaser game loads
- Store JWT in browser (localStorage or state)
- Fetch characters after login, present selection UI
- Pass selected characterId to WebSocket auth
- Only load game scene after successful auth

## Constraints

- **Tech stack**: React for screens (not Phaser UI) — matches existing patterns
- **Styling**: Plain CSS with existing variable system — no new CSS framework
- **Backend**: Use existing API endpoints — no backend changes needed
- **Factions**: 4 options (dominion, frontier, collective, neutral) — from existing schema

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React screens (not Phaser menus) | Auth forms are standard web UI, React handles this better | — Pending |
| Visual character cards | Shows more info at a glance, feels more polished | — Pending |
| Stat allocation on creation | Gives players agency, uses existing stats schema | — Pending |
| Clean modern style | User preference, works with existing dark theme | — Pending |

---
*Last updated: 2026-02-13 after initialization*
