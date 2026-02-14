# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Into the Void is a multiplayer 2D sci-fi survival MMO with procedural world generation. Players join one of four factions (Verdant Dynamics, Helix Extraction, Nexus Frontiers, or Unaffiliated) and explore zones, interact with entities, and engage in combat.

## Commands

```bash
# Development (runs all three servers concurrently)
pnpm dev

# Individual servers
pnpm dev:api          # REST API on port 3000
pnpm dev:game-server  # WebSocket game server on port 3001
pnpm dev:web          # Vite dev server on port 5173

# Build and test
pnpm build            # Build all apps
pnpm test             # Run all tests
pnpm lint             # Lint all apps

# Database (requires PostgreSQL running)
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema directly (dev only)
nx run database:studio  # Open Drizzle Studio

# Run single project targets
nx run <project>:<target>  # e.g., nx run api:serve, nx run web:build
```

## Architecture

**Three applications:**
- `apps/api` - NestJS REST API for auth and character management (JWT-based)
- `apps/game-server` - NestJS WebSocket server for real-time gameplay (Socket.IO)
- `apps/web` - React + Phaser game client with Zustand state management

**Four shared packages:**
- `@into-the-void/shared-types` - TypeScript types for client/server contracts
- `@into-the-void/database` - Drizzle ORM schemas and queries (PostgreSQL)
- `@into-the-void/game-logic` - Movement validation, combat, visibility rules
- `@into-the-void/world-gen` - Procedural zone generation (noise, biomes, spawns)

**Data flow:** Web client → Socket.IO → game-server (validates via game-logic) → database. Auth tokens obtained from REST API, validated by game-server on WebSocket connect.

## Key Patterns

**NestJS (backend):**
- Services: `[name].service.ts`, Controllers: `[name].controller.ts`
- DTOs with class-validator decorators for input validation
- Guards for auth (`JwtAuthGuard`), exceptions for errors (`ConflictException`, `ForbiddenException`)

**React (frontend):**
- Screens in `apps/web/src/screens/`, components in `apps/web/src/components/`
- Zustand store at `apps/web/src/store/gameStore.ts`
- React Router v7 with action pattern for forms
- Plain CSS with CSS variables (`--color-bg-*`, `--color-accent`)

**WebSocket events:**
- Client events: `ClientEvents` interface in shared-types
- Server events: `ServerEvents` interface in shared-types
- Auth handshake: client sends `auth` with JWT + characterId

## Infrastructure

Start local services before development:
```bash
docker compose up -d  # PostgreSQL on 5432, Redis on 6379
cp .env.example .env  # Configure environment
```

## Path Aliases

Use these for imports across packages:
- `@into-the-void/shared-types`
- `@into-the-void/game-logic`
- `@into-the-void/database`
- `@into-the-void/world-gen`

## IMPORTANT
* Always check if the implemented feature is compatible with /lore directory. The information there is non-negotiable, and are the source of truth.

* Whenever it makes sense, use strategy pattern, to easily add variant implementation 

* If any change to lore is needed (expanding, adding more details or changing something) ask. Always ask about lore changes.

* The UI is divided in two parts - game canvas and HUD. This is a top-down (angled) 2D game based on sprites. If there is no sprite, add a fallback color tile.

* if docker is not available, use podman

* do not start dev servers, unless you want to see the output or test it. If you start one, kill it after you used it

* sprite size is 96x96
